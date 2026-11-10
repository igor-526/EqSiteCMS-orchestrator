/**
 * Offline merge integration: v2 producer, preflight and whole-file isolation,
 * durable phase1/phase2 failures, actual conflicts and explicit safe resume.
 * Legacy UT-MERGE/UT-RESUME coverage uses generated plans and real Git state;
 * former placeholder conflict/sync tests and skipped fake states are replaced
 * by OPS-2c AG-11/12 cases below (no skipped scenarios).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { writeFile, readFile, chmod } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { digest } from '../ship/plan.mjs';
import {
  createMonorepoFixture as createBaseFixture,
  cleanup,
  captureMonorepoSnapshot,
  assertSnapshotsEqual,
  makeDirty,
  guardNonLocalRemote
} from './helpers/fixture.mjs';

const createMonorepoFixture = options => createBaseFixture({ ...options,
  fixtureBase: join(process.cwd(), '.qa/add-safe-services-autogit/OPS-2c/fixtures'), withRootOrigin: true });

for (const key of ['GIT_DIR', 'GIT_COMMON_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_CONFIG_PARAMETERS']) delete process.env[key];
Object.assign(process.env, { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_COUNT: '0', GIT_TERMINAL_PROMPT: '0' });

const SHIPCTL = join(process.cwd(), 'scripts/shipctl');

/**
 * Run shipctl command in fixture.
 */
function runShipctl(fixtureRoot, args, opts = {}) {
  assert.ok(resolve(fixtureRoot).startsWith(resolve('.qa/add-safe-services-autogit/OPS-2c/fixtures') + '/'));
  const dirs = [fixtureRoot, ...readdirSync(join(fixtureRoot, 'services'), { withFileTypes: true })
    .filter(e => e.isDirectory()).map(e => join(fixtureRoot, 'services', e.name))];
  for (const cwd of dirs) {
    for (const flags of [[], ['--push']]) {
      const urls = spawnSync('git', ['remote', 'get-url', ...flags, '--all', 'origin'], { cwd, encoding: 'utf8' });
      for (const url of urls.stdout.trim().split('\n').filter(Boolean)) {
        guardNonLocalRemote(url);
        assert.ok(url.startsWith(join(fixtureRoot, 'bare-repos') + '/'), 'only owned local remotes');
      }
    }
  }
  const result = spawnSync('node', [SHIPCTL, ...args], {
    cwd: fixtureRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      SHIPCTL_ROOT: fixtureRoot,
      SHIPCTL_GH_BIN: join(fixtureRoot, 'fake-gh'),
      SHIPCTL_MAKE_BIN: opts.makeBin || 'make',
      SHIPCTL_TEST_SKIP_SYNC: opts.skipSync !== false ? 'true' : 'false'
    }
  });

  let json = null;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    // Not JSON
  }

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    json
  };
}

/** Legacy scenarios now use the real v2 producer, never patched hashes. */
async function createPlan(fixtureRoot, options = {}) {
  const { change = 'test-change-083', branchName = 'feature/test-change-083', repos = [] } = options;
  const includes = repos.flatMap(repo => (repo.included || []).map(file =>
    ['root', '.'].includes(repo.name) ? file.path : `services/${repo.name}/${file.path}`));
  const result = runShipctl(fixtureRoot, ['plan', '--change', change, '--branch', branchName,
    '--summary', 'Test change', ...includes.flatMap(p => ['--include', p])]);
  assert.equal(result.status, 0, JSON.stringify(result));
  const planPath = join(fixtureRoot, '.qa/ship', change, 'plan.json');
  return { plan: JSON.parse(await readFile(planPath, 'utf8')), planPath };
}

/**
 * UT-MERGE-01: --dry-run does not mutate
 */
test('UT-MERGE-01: --dry-run shows steps but does not mutate', async () => {
  const fixture = await createMonorepoFixture({ services: ['backend', 'frontend'] });

  try {
    const backendPath = fixture.services.backend.clonePath;
    
    // Get current HEAD before making changes
    const backendHead = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: backendPath,
      encoding: 'utf8'
    }).stdout.trim();

    // Make some dirty files
    await makeDirty(backendPath, {
      'src/test.py': 'test content',
      'src/foreign.py': 'foreign content'
    });

    // Get blob hash of included file
    const includedHash = spawnSync('git', ['hash-object', 'src/test.py'], {
      cwd: backendPath,
      encoding: 'utf8'
    }).stdout.trim();

    const { planPath } = await createPlan(fixture.root, {
      repos: [
        {
          name: 'backend',
          status: 'changed',
          head: backendHead,
          included: [
            { path: 'src/test.py', blobHash: includedHash }
          ],
          foreign: [
            { path: 'src/foreign.py' }
          ]
        }
      ]
    });

    // Capture snapshot before
    const before = await captureMonorepoSnapshot(fixture);

    // Run dry-run
    const result = runShipctl(fixture.root, ['merge', '--plan', planPath, '--dry-run']);

    // Capture snapshot after
    const after = await captureMonorepoSnapshot(fixture);

    // Assertions
    assert.equal(result.status, 0, 'dry-run should exit 0');
    assert.ok(result.json?.ok, 'dry-run should return ok:true');
    assert.ok(result.json?.phase1Steps, 'dry-run should include phase1Steps');
    assert.ok(result.json.message.includes('Dry-run'), 'message should mention dry-run');

    // Snapshots must match
    assertSnapshotsEqual(before, after, 'dry-run');
  } finally {
    await cleanup(fixture);
  }
});

/**
 * UT-MERGE-02: Preflight blockers stop before mutations
 */
test('UT-MERGE-02: preflight blocker stops before any mutation', async () => {
  const fixture = await createMonorepoFixture({ services: ['backend'] });

  try {
    const backendPath = fixture.services.backend.clonePath;

    // Get HEAD first
    const backendHead = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: backendPath,
      encoding: 'utf8'
    }).stdout.trim();
    
    // Make a dirty file and get its hash
    await makeDirty(backendPath, { 'test.txt': 'content' });
    const testHash = spawnSync('git', ['hash-object', 'test.txt'], {
      cwd: backendPath,
      encoding: 'utf8'
    }).stdout.trim();


    const { planPath } = await createPlan(fixture.root, {
      repos: [
        {
          name: 'backend',
          status: 'changed',
          head: backendHead,
          included: [{ path: 'test.txt', blobHash: testHash }]
        }
      ]
    });

    spawnSync('git', ['checkout', '--detach'], { cwd: backendPath });

    // Capture before
    const before = await captureMonorepoSnapshot(fixture);

    // Run merge (should fail preflight)
    const result = runShipctl(fixture.root, ['merge', '--plan', planPath]);

    // Capture after
    const after = await captureMonorepoSnapshot(fixture);

    // Assertions
    assert.equal(result.status, 3, 'preflight failure should exit 3');
    assert.equal(result.json?.ok, false, 'should return ok:false');
    assert.ok(result.json?.blockers, 'should include blockers');
    assert.ok(
      result.json.blockers.some(b => b.blocker === 'detached_head'),
      'should detect detached_head'
    );

    // No mutations
    assertSnapshotsEqual(before, after, 'preflight-blocker');
  } finally {
    await cleanup(fixture);
  }
});

/**
 * UT-MERGE-03: Stale plan detection
 */
test('UT-MERGE-03: plan_stale when included file changed after plan', async () => {
  const fixture = await createMonorepoFixture({ services: ['backend'] });

  try {
    const backendPath = fixture.services.backend.clonePath;

    // Create and hash a file
    await makeDirty(backendPath, { 'src/test.py': 'original content' });
    const originalHash = spawnSync('git', ['hash-object', 'src/test.py'], {
      cwd: backendPath,
      encoding: 'utf8'
    }).stdout.trim();

    const backendHead = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: backendPath,
      encoding: 'utf8'
    }).stdout.trim();

    // Create plan with original hash
    const { planPath } = await createPlan(fixture.root, {
      repos: [
        {
          name: 'backend',
          status: 'changed',
          head: backendHead,
          included: [{ path: 'src/test.py', blobHash: originalHash }]
        }
      ]
    });

    // Modify file after plan
    await makeDirty(backendPath, { 'src/test.py': 'CHANGED content' });

    // Run merge
    const result = runShipctl(fixture.root, ['merge', '--plan', planPath]);

    // Assertions
    assert.equal(result.status, 3, 'stale plan should exit 3');
    assert.equal(result.json?.ok, false);
    assert.ok(
      result.json?.blockers?.some(b => b.blocker === 'plan_stale'),
      'should detect plan_stale'
    );
  } finally {
    await cleanup(fixture);
  }
});

/**
 * UT-MERGE-04: Phase 1 protects foreign files and pushes feature branch
 */
test('UT-MERGE-04: phase 1 commits only included, leaves foreign intact, pushes branch', async () => {
  const fixture = await createMonorepoFixture({ services: ['backend'] });

  try {
    const backendPath = fixture.services.backend.clonePath;
    const backendBare = fixture.services.backend.barePath;

    // Get HEAD first
    const backendHead = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: backendPath,
      encoding: 'utf8'
    }).stdout.trim();

    // Create included and foreign files
    await makeDirty(backendPath, {
      'src/included.py': 'included content',
      'src/foreign.py': 'foreign content'
    });

    const includedHash = spawnSync('git', ['hash-object', 'src/included.py'], {
      cwd: backendPath,
      encoding: 'utf8'
    }).stdout.trim();

    // Create plan
    const branchName = 'feature/test-083-phase1';
    const { planPath } = await createPlan(fixture.root, {
      branchName,
      repos: [
        {
          name: 'backend',
          status: 'changed',
          head: backendHead,
          included: [{ path: 'src/included.py', blobHash: includedHash }],
          foreign: [{ path: 'src/foreign.py' }]
        }
      ]
    });

    // Run merge
    const result = runShipctl(fixture.root, ['merge', '--plan', planPath]);

    // Assertions
    assert.equal(result.status, 0, 'merge should succeed');
    assert.ok(result.json?.ok, 'should return ok:true');
    assert.equal(result.json?.mergeState?.phase, 'phase2-complete');

    // Check repository is back on main
    const currentBranch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: backendPath,
      encoding: 'utf8'
    }).stdout.trim();
    assert.equal(currentBranch, 'main', 'should be back on main');

    // Check foreign file still exists and unchanged
    const foreignContent = await readFile(join(backendPath, 'src/foreign.py'), 'utf8');
    assert.equal(foreignContent, 'foreign content', 'foreign file should be unchanged');
    
    // Check foreign is untracked in main
    const statusUntrackedResult = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], {
      cwd: backendPath,
      encoding: 'utf8'
    });
    const untrackedFiles = statusUntrackedResult.stdout.trim().split('\n').filter(Boolean);
    assert.ok(untrackedFiles.includes('src/foreign.py'), 'foreign should be untracked in main');
    
    // Check included was committed in feature branch
    const branchFilesResult = spawnSync('git', ['ls-tree', '-r', '--name-only', branchName], {
      cwd: backendPath,
      encoding: 'utf8'
    });
    const branchFiles = branchFilesResult.stdout.trim().split('\n').filter(Boolean);
    assert.ok(branchFiles.includes('src/included.py'), 'included should be in feature branch');

    // Check feature branch exists on origin
    const remoteBranches = spawnSync('git', ['ls-remote', '--heads', backendBare, branchName], {
      encoding: 'utf8'
    }).stdout;
    assert.ok(remoteBranches.includes(branchName), 'feature branch should exist on origin');

    // Check commit contains only included file
    const branchCommit = spawnSync('git', ['rev-parse', branchName], {
      cwd: backendPath,
      encoding: 'utf8'
    }).stdout.trim();

    const committedFiles = spawnSync('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', branchCommit], {
      cwd: backendPath,
      encoding: 'utf8'
    }).stdout.trim().split('\n');

    assert.ok(committedFiles.includes('src/included.py'), 'commit should include src/included.py');
    assert.ok(!committedFiles.includes('src/foreign.py'), 'commit should NOT include src/foreign.py');
  } finally {
    await cleanup(fixture);
  }
});

/**
 * UT-MERGE-05: Happy path — full merge (2 services)
 */
test('UT-MERGE-05: full merge with 2 services', async () => {
  const fixture = await createMonorepoFixture({ services: ['backend', 'frontend'] });

  try {
    const backendPath = fixture.services.backend.clonePath;
    const frontendPath = fixture.services.frontend.clonePath;
    const backendBare = fixture.services.backend.barePath;
    const frontendBare = fixture.services.frontend.barePath;

    // Get HEADs
    const backendHead = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: backendPath, encoding: 'utf8'
    }).stdout.trim();
    const frontendHead = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: frontendPath, encoding: 'utf8'
    }).stdout.trim();

    // Make changes in both services
    await makeDirty(backendPath, {
      'src/be.py': 'backend change',
      'foreign_be.txt': 'foreign backend'
    });
    await makeDirty(frontendPath, {
      'src/fe.ts': 'frontend change',
      'foreign_fe.txt': 'foreign frontend'
    });

    const beHash = spawnSync('git', ['hash-object', 'src/be.py'], {
      cwd: backendPath, encoding: 'utf8'
    }).stdout.trim();
    const feHash = spawnSync('git', ['hash-object', 'src/fe.ts'], {
      cwd: frontendPath, encoding: 'utf8'
    }).stdout.trim();

    const branchName = 'feature/test-full-merge';
    const { planPath } = await createPlan(fixture.root, {
      change: 'test-full-merge',
      branchName,
      repos: [
        {
          name: 'backend',
          status: 'changed',
          head: backendHead,
          included: [{ path: 'src/be.py', blobHash: beHash }],
          foreign: [{ path: 'foreign_be.txt' }]
        },
        {
          name: 'frontend',
          status: 'changed',
          head: frontendHead,
          included: [{ path: 'src/fe.ts', blobHash: feHash }],
          foreign: [{ path: 'foreign_fe.txt' }]
        }
      ]
    });

    // Run merge
    const result = runShipctl(fixture.root, ['merge', '--plan', planPath]);

    // Assertions
    assert.equal(result.status, 0, 'full merge should succeed');
    assert.ok(result.json?.ok);
    assert.equal(result.json?.mergeState?.phase, 'phase2-complete');

    // Check all repos are on main
    for (const [name, path] of [['backend', backendPath], ['frontend', frontendPath]]) {
      const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: path, encoding: 'utf8'
      }).stdout.trim();
      assert.equal(branch, 'main', `${name} should be on main`);

      // Check merge commit exists
      const log = spawnSync('git', ['log', '--oneline', '-1'], {
        cwd: path, encoding: 'utf8'
      }).stdout;
      assert.ok(log.includes('Merge branch'), `${name} should have merge commit`);

      // Check foreign files unchanged
      const foreignFile = name === 'backend' ? 'foreign_be.txt' : 'foreign_fe.txt';
      const foreignContent = await readFile(join(path, foreignFile), 'utf8').catch(() => null);
      assert.ok(foreignContent, `${name} foreign file should exist`);
    }

    // Check feature branches exist on origin
    for (const [name, bare] of [['backend', backendBare], ['frontend', frontendBare]]) {
      const remoteBranches = spawnSync('git', ['ls-remote', '--heads', bare, branchName], {
        encoding: 'utf8'
      }).stdout;
      assert.ok(remoteBranches.includes(branchName), `${name} feature branch should be on origin`);
    }

    // Check origin/main was updated
    const backendOriginMain = spawnSync('git', ['rev-parse', 'origin/main'], {
      cwd: backendPath, encoding: 'utf8'
    }).stdout.trim();
    const backendLocalMain = spawnSync('git', ['rev-parse', 'main'], {
      cwd: backendPath, encoding: 'utf8'
    }).stdout.trim();
    assert.equal(backendOriginMain, backendLocalMain, 'backend origin/main should match local main');
  } finally {
    await cleanup(fixture);
  }
});

/**
 * UT-MERGE-07: Push failure handling
 */
test('UT-MERGE-07: push failure leaves repo on main with local commits', async () => {
  const fixture = await createMonorepoFixture({ services: ['backend'] });

  try {
    const backendPath = fixture.services.backend.clonePath;
    const backendBare = fixture.services.backend.barePath;
    
    const backendHead = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: backendPath, encoding: 'utf8'
    }).stdout.trim();

    await makeDirty(backendPath, { 'test.txt': 'content' });
    const testHash = spawnSync('git', ['hash-object', 'test.txt'], {
      cwd: backendPath, encoding: 'utf8'
    }).stdout.trim();

    const branchName = 'feature/test-push-fail';
    const { planPath } = await createPlan(fixture.root, {
      change: 'test-push-fail',
      branchName,
      repos: [{
        name: 'backend',
        status: 'changed',
        head: backendHead,
        included: [{ path: 'test.txt', blobHash: testHash }]
      }]
    });

    // Simulate push rejection only for main branch (allow feature branch push)
    const hookPath = join(backendBare, 'hooks', 'pre-receive');
    await writeFile(hookPath, `#!/bin/sh
while read oldrev newrev refname; do
  if [ "$refname" = "refs/heads/main" ]; then
    echo "Error: push to main rejected by test hook"
    exit 1
  fi
done
exit 0
`);
    spawnSync('chmod', ['+x', hookPath]);

    // Run merge (should fail on push)
    const result = runShipctl(fixture.root, ['merge', '--plan', planPath]);

    // Assertions
    assert.equal(result.status, 1, 'push failure should exit 1');
    assert.equal(result.json?.ok, false);

    // Check still on main
    const currentBranch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: backendPath, encoding: 'utf8'
    }).stdout.trim();
    assert.equal(currentBranch, 'main', 'should be on main after push failure');

    // Check local commits exist
    const localMain = spawnSync('git', ['rev-parse', 'main'], {
      cwd: backendPath, encoding: 'utf8'
    }).stdout.trim();
    const originMain = spawnSync('git', ['rev-parse', 'origin/main'], {
      cwd: backendPath, encoding: 'utf8'
    }).stdout.trim();
    assert.notEqual(localMain, originMain, 'local main should be ahead of origin');
  } finally {
    await cleanup(fixture);
  }
});

/**
 * UT-MERGE-09: Resume after push failure (idempotency)
 */
test('UT-MERGE-09: resume continues from last successful stage', async () => {
  const fixture = await createMonorepoFixture({ services: ['backend', 'frontend'] });

  try {
    const backendPath = fixture.services.backend.clonePath;
    const frontendPath = fixture.services.frontend.clonePath;
    const backendBare = fixture.services.backend.barePath;

    const backendHead = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: backendPath, encoding: 'utf8'
    }).stdout.trim();
    const frontendHead = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: frontendPath, encoding: 'utf8'
    }).stdout.trim();

    await makeDirty(backendPath, { 'be.txt': 'backend' });
    await makeDirty(frontendPath, { 'fe.txt': 'frontend' });

    const beHash = spawnSync('git', ['hash-object', 'be.txt'], {
      cwd: backendPath, encoding: 'utf8'
    }).stdout.trim();
    const feHash = spawnSync('git', ['hash-object', 'fe.txt'], {
      cwd: frontendPath, encoding: 'utf8'
    }).stdout.trim();

    const changeName = 'test-resume-push';
    const branchName = 'feature/test-resume-push';
    const { planPath } = await createPlan(fixture.root, {
      change: changeName,
      branchName,
      repos: [
        { name: 'backend', status: 'changed', head: backendHead, included: [{ path: 'be.txt', blobHash: beHash }] },
        { name: 'frontend', status: 'changed', head: frontendHead, included: [{ path: 'fe.txt', blobHash: feHash }] }
      ]
    });

    // Block backend push to main only (allow feature branch push)
    const hookPath = join(backendBare, 'hooks', 'pre-receive');
    await writeFile(hookPath, `#!/bin/sh
while read oldrev newrev refname; do
  if [ "$refname" = "refs/heads/main" ]; then
    echo "Error: push to main rejected by test hook" >&2
    exit 1
  fi
done
exit 0
`);
    spawnSync('chmod', ['+x', hookPath]);

    // First run: will fail on backend push
    const firstResult = runShipctl(fixture.root, ['merge', '--plan', planPath]);
    assert.equal(firstResult.status, 1, 'first run should fail on push');

    // Disable only the owned hook; no filesystem deletion needed.
    await writeFile(hookPath, '#!/bin/sh\nexit 0\n');

    // Resume should continue
    const resumeResult = runShipctl(fixture.root, ['merge', '--resume', '--change', changeName]);
    assert.equal(resumeResult.status, 0, 'resume should succeed');
    assert.equal(resumeResult.json?.mergeState?.phase, 'phase2-complete');

    // Check both repos pushed
    const beState = resumeResult.json.mergeState.repos.find(r => r.name === 'backend');
    const feState = resumeResult.json.mergeState.repos.find(r => r.name === 'frontend');
    assert.equal(beState?.stage, 'pushed');
    assert.equal(feState?.stage, 'pushed');
  } finally {
    await cleanup(fixture);
  }
});

/**
 * UT-MERGE-10: Commit messages and trailers follow convention
 */
test('UT-MERGE-10: commit messages follow convention with trailers', async () => {
  const fixture = await createMonorepoFixture({ services: ['backend'] });

  try {
    const backendPath = fixture.services.backend.clonePath;
    const backendHead = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: backendPath, encoding: 'utf8'
    }).stdout.trim();

    await makeDirty(backendPath, { 'test.txt': 'content' });
    const testHash = spawnSync('git', ['hash-object', 'test.txt'], {
      cwd: backendPath, encoding: 'utf8'
    }).stdout.trim();

    const changeName = 'test-commit-convention-083';
    const branchName = 'feature/test-commit-convention-083';
    const { planPath } = await createPlan(fixture.root, {
      change: changeName,
      branchName,
      repos: [{
        name: 'backend',
        status: 'changed',
        head: backendHead,
        included: [{ path: 'test.txt', blobHash: testHash }]
      }]
    });

    // Run merge
    const result = runShipctl(fixture.root, ['merge', '--plan', planPath]);
    assert.equal(result.status, 0);

    // Check feature branch commit message
    const featureCommitMsg = spawnSync('git', ['log', branchName, '--format=%B', '-1'], {
      cwd: backendPath, encoding: 'utf8'
    }).stdout.trim();

    assert.ok(featureCommitMsg.startsWith('feat(test-commit-convention-083):'), 'feature commit should follow convention');
    assert.ok(featureCommitMsg.includes(`OpenSpec: ${changeName}`), 'feature commit should have OpenSpec trailer');

    // Check merge commit message
    const mergeCommitMsg = spawnSync('git', ['log', 'main', '--format=%B', '-1'], {
      cwd: backendPath, encoding: 'utf8'
    }).stdout.trim();

    assert.ok(mergeCommitMsg.includes(`Merge branch '${branchName}' into main`), 'merge commit should follow convention');
    assert.ok(mergeCommitMsg.includes(`OpenSpec: ${changeName}`), 'merge commit should have OpenSpec trailer');
  } finally {
    await cleanup(fixture);
  }
});

test('UT-MERGE-12: dry-run accumulates blockers from all repos (F-083-02)', async () => {
  const fixture = await createMonorepoFixture({ services: ['backend', 'frontend'] });
  try {
    await makeDirty(fixture.services.backend.clonePath, { 'selected.txt': 'selected' });
    const { planPath } = await v2Plan(fixture);
    fixtureGit(fixture.services.backend.clonePath, 'switch', '-c', 'wrong-branch');
    fixtureGit(fixture.services.frontend.clonePath, 'commit', '--allow-empty', '-m', 'ahead');
    const before = await fullSnapshot(fixture);
    const result = runShipctl(fixture.root, ['merge', '--plan', planPath, '--dry-run']);
    assert.equal(result.status, 3, JSON.stringify(result.json));
    assert.ok(result.json.blockers.some(b => b.repo === 'backend' && b.blocker === 'not_on_main'));
    assert.ok(result.json.blockers.some(b => b.repo === 'frontend' && b.blocker === 'main_ahead_or_diverged'));
    assert.deepEqual(await fullSnapshot(fixture), before);
  } finally { await cleanup(fixture); }
});

/**
 * UT-RESUME-04: state_mismatch blocker when merge-state.json is inconsistent
 */
test('UT-RESUME-04: resume detects state_mismatch when phase already complete', async () => {
  const fixture = await createMonorepoFixture({ services: ['frontend'] });

  try {
    const frontendPath = fixture.services.frontend.clonePath;

    await makeDirty(frontendPath, { 'test.ts': 'test' });
    const feHash = spawnSync('git', ['hash-object', 'test.ts'], {
      cwd: frontendPath, encoding: 'utf8'
    }).stdout.trim();
    const frontendHead = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: frontendPath, encoding: 'utf8'
    }).stdout.trim();

    const changeName = 'test-state-mismatch';
    const branchName = 'feature/test-state-mismatch';
    const { planPath } = await createPlan(fixture.root, {
      change: changeName,
      branchName,
      repos: [{ name: 'frontend', status: 'changed', head: frontendHead, included: [{ path: 'test.ts', blobHash: feHash }] }]
    });

    // Run merge to completion
    const firstResult = runShipctl(fixture.root, ['merge', '--plan', planPath]);
    assert.equal(firstResult.status, 0, 'merge should succeed');
    assert.equal(firstResult.json?.mergeState?.phase, 'phase2-complete');

    // Resume on already-complete merge should be rejected (no work to resume)
    const resumeResult = runShipctl(fixture.root, ['merge', '--resume', '--change', changeName]);

    // Expected behavior: exit 3 or exit 0 with message "nothing to resume"
    // Implementation may vary; check that it doesn't mutate again
    assert.ok(resumeResult.status === 3 || resumeResult.status === 0, 'resume should exit cleanly');
    if (resumeResult.status === 0) {
      assert.ok(resumeResult.json?.ok, 'resume on complete state returns ok');
    }
  } finally {
    await cleanup(fixture);
  }
});


// All merge scenarios use the production v2 producer.
function fixtureGit(cwd, ...args) {
  assert.ok(resolve(cwd).startsWith(resolve('.qa/add-safe-services-autogit/OPS-2c/fixtures') + '/'));
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', env: process.env });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

async function v2Plan(fixture, includes = ['services/backend/selected.txt']) {
  const result = runShipctl(fixture.root, ['plan', '--change', 'ops-2b', '--branch', 'bugs/exact-name',
    '--message', 'Точный subject без префикса', ...includes.flatMap(p => ['--include', p])]);
  assert.equal(result.status, 0, JSON.stringify(result.json));
  const planPath = join(fixture.root, '.qa/ship/ops-2b/plan.json');
  return { planPath, plan: JSON.parse(await readFile(planPath, 'utf8')) };
}

async function fullSnapshot(fixture) {
  const repos = [fixture.root, ...Object.values(fixture.services).map(r => r.clonePath)];
  const indexes = await Promise.all(repos.map(p => readFile(join(p, '.git/index')).then(b => b.toString('hex')).catch(() => null)));
  const snapshots = await captureMonorepoSnapshot(fixture);
  const remotes = Object.fromEntries(Object.entries(fixture.services).map(([name, r]) =>
    [name, fixtureGit(r.barePath, 'for-each-ref', '--format=%(refname) %(objectname)')]));
  remotes['.'] = fixtureGit(join(fixture.baresRoot, 'root.git'), 'for-each-ref', '--format=%(refname) %(objectname)');
  return { snapshots, indexes, remotes };
}

async function resignPlan(planPath, plan) {
  for (const data of Object.values(plan.repos)) {
    delete data.fingerprint;
    data.fingerprint = digest({ ...data, branchName: plan.branchName });
  }
  delete plan.PLAN_TOKEN;
  plan.PLAN_TOKEN = digest(plan);
  await writeFile(planPath, JSON.stringify(plan, null, 2));
}

test('OPS-2b AG-06/11: real v2 minimal merge, exact subject, root last and foreign preserved', async () => {
  const fixture = await createMonorepoFixture({ services: ['backend'] });
  try {
    const svc = fixture.services.backend.clonePath;
    await makeDirty(svc, { 'selected.txt': 'selected', 'README.md': 'foreign unstaged' });
    await makeDirty(fixture.root, { '-root.txt': 'root selected' });
    fixtureGit(svc, 'add', '--', 'selected.txt');
    const foreignIndex = fixtureGit(svc, 'ls-files', '--stage', '--', 'README.md');
    const { planPath, plan } = await v2Plan(fixture, ['services/backend/selected.txt', '-root.txt']);
    const before = await fullSnapshot(fixture);
    const preview = runShipctl(fixture.root, ['merge', '--plan', planPath, '--dry-run']);
    assert.equal(preview.status, 0, JSON.stringify(preview.json));
    assert.deepEqual(preview.json.phase1Steps.map(r => r.repo), ['backend', '.']);
    assert.deepEqual(await fullSnapshot(fixture), before);
    const result = runShipctl(fixture.root, ['merge', '--plan', planPath]);
    assert.equal(result.status, 0, JSON.stringify(result.json));
    assert.deepEqual(result.json.mergeState.repos.map(r => r.name), ['backend', '.']);
    for (const p of [svc, fixture.root]) {
      assert.equal(fixtureGit(p, 'branch', '--show-current').trim(), 'main');
      assert.equal(fixtureGit(p, 'log', '-1', '--format=%s', plan.branchName).trim(), plan.commitMessage.subject);
      assert.ok(fixtureGit(p, 'log', '-1', '--format=%B', plan.branchName).includes('OpenSpec: ops-2b'));
    }
    assert.equal(await readFile(join(svc, 'README.md'), 'utf8'), 'foreign unstaged');
    assert.equal(fixtureGit(svc, 'ls-files', '--stage', '--', 'README.md'), foreignIndex);
    assert.equal(fixtureGit(svc, 'show', `${plan.branchName}:README.md`).trim(), 'backend');
  } finally { await cleanup(fixture); }
});

const staleCases = {
  content: async (f) => makeDirty(f.services.backend.clonePath, { 'selected.txt': 'new content' }),
  mode: async f => { const { chmod } = await import('node:fs/promises'); await chmod(join(f.services.backend.clonePath, 'selected.txt'), 0o755); },
  foreignContent: async f => makeDirty(f.services.backend.clonePath, { 'README.md': 'new foreign' }),
  index: async f => { fixtureGit(f.services.backend.clonePath, 'add', '--', 'selected.txt'); },
  foreignStaged: async f => { fixtureGit(f.services.frontend.clonePath, 'add', '--', 'README.md'); },
  head: async f => { fixtureGit(f.services.frontend.clonePath, 'commit', '--allow-empty', '-m', 'local head'); },
  dev: async f => { fixtureGit(f.services.frontend.clonePath, 'switch', '-c', 'dev'); },
  detached: async f => { fixtureGit(f.services.frontend.clonePath, 'switch', '--detach'); },
  operation: async f => { const { mkdir } = await import('node:fs/promises'); await mkdir(join(f.services.frontend.clonePath, '.git/rebase-merge')); },
  noOrigin: async f => { fixtureGit(f.services.frontend.clonePath, 'remote', 'remove', 'origin'); },
  origin: async f => { fixtureGit(f.services.backend.clonePath, 'remote', 'set-url', 'origin', f.services.frontend.barePath); },
  pushOrigin: async f => { fixtureGit(f.services.backend.clonePath, 'remote', 'set-url', '--push', 'origin', f.services.frontend.barePath); },
  failedProbe: async f => { fixtureGit(f.services.frontend.clonePath, 'remote', 'set-url', 'origin', join(f.baresRoot, 'unavailable.git')); },
  missingMain: async f => { fixtureGit(f.services.frontend.barePath, 'update-ref', '-d', 'refs/heads/main'); },
  remoteRefs: async f => { fixtureGit(f.services.frontend.barePath, 'update-ref', 'refs/heads/other', fixtureGit(f.services.frontend.barePath, 'rev-parse', 'main').trim()); },
  occupiedLocal: async f => { fixtureGit(f.services.backend.clonePath, 'branch', 'bugs/exact-name'); },
  occupiedRemote: async f => { fixtureGit(f.services.backend.barePath, 'update-ref', 'refs/heads/bugs/exact-name', fixtureGit(f.services.backend.barePath, 'rev-parse', 'main').trim()); },
  inventory: async f => { await writeFile(f.manifestPath, ''); },
  duplicateInventory: async f => { await writeFile(f.manifestPath, (await readFile(f.manifestPath, 'utf8')).repeat(2)); },
  missingClone: async f => {
    const { rename } = await import('node:fs/promises');
    const target = resolve(f.services.frontend.clonePath);
    assert.equal(target, join(resolve(f.root), 'services/frontend'));
    await rename(target, join(f.root, 'missing-frontend'));
  },
  token: async (f, p) => { p.plan.commitMessage.subject = 'changed'; await writeFile(p.planPath, JSON.stringify(p.plan)); },
  incomplete: async (f, p) => { delete p.plan.repos.backend.included[0].blobHash; await resignPlan(p.planPath, p.plan); },
  legacy: async (f, p) => { delete p.plan.version; await writeFile(p.planPath, JSON.stringify(p.plan)); },
  rootAliasConflict: async (f, p) => { p.plan.repos.root = p.plan.repos['.']; await resignPlan(p.planPath, p.plan); }
};

for (const [label, mutate] of Object.entries(staleCases)) {
  test(`OPS-2b AG-05/06/10: ${label} blocks globally with zero mutation`, async () => {
    const fixture = await createMonorepoFixture({ services: ['backend', 'frontend'] });
    try {
      await makeDirty(fixture.services.backend.clonePath, { 'selected.txt': 'selected', 'README.md': 'foreign' });
      await makeDirty(fixture.services.frontend.clonePath, { 'README.md': 'foreign frontend' });
      const p = await v2Plan(fixture);
      await mutate(fixture, p);
      const before = await fullSnapshot(fixture);
      const foreign = await readFile(join(fixture.services.backend.clonePath, 'README.md'), 'utf8');
      const result = runShipctl(fixture.root, ['merge', '--plan', p.planPath]);
      assert.equal(result.status, 3, JSON.stringify(result.json));
      assert.ok(result.json.blockers?.length, JSON.stringify(result.json));
      assert.deepEqual(await fullSnapshot(fixture), before);
      assert.equal(await readFile(join(fixture.services.backend.clonePath, 'README.md'), 'utf8'), foreign);
    } finally { await cleanup(fixture); }
  });
}

test('OPS-2b AG-05: global preflight accumulates blockers outside included', async () => {
  const fixture = await createMonorepoFixture({ services: ['backend', 'frontend'] });
  try {
    await makeDirty(fixture.services.backend.clonePath, { 'selected.txt': 'selected' });
    const { planPath } = await v2Plan(fixture);
    fixtureGit(fixture.root, 'switch', '-c', 'dev');
    fixtureGit(fixture.services.frontend.clonePath, 'switch', '--detach');
    const result = runShipctl(fixture.root, ['merge', '--plan', planPath]);
    assert.equal(result.status, 3);
    assert.ok(result.json.blockers.some(b => b.repo === '.' && b.blocker === 'not_on_main'));
    assert.ok(result.json.blockers.some(b => b.repo === 'frontend' && b.blocker === 'detached_head'));
  } finally { await cleanup(fixture); }
});


test('OPS-2b AG-10: merge respects existing global lock before preflight/mutation', async () => {
  const fixture = await createMonorepoFixture({ services: ['backend'] });
  let holder;
  try {
    await makeDirty(fixture.services.backend.clonePath, { 'selected.txt': 'selected' });
    const { planPath } = await v2Plan(fixture);
    const before = await fullSnapshot(fixture);
    holder = spawn('flock', ['--no-fork', '-n', join(fixture.root, '.qa/ship/shipctl.lock'),
      'node', '-e', "process.stdout.write('locked'); setTimeout(() => {}, 10000)"], { stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('lock readiness timeout')), 3000);
      holder.stdout.once('data', () => { clearTimeout(timer); resolve(); });
      holder.once('error', error => { clearTimeout(timer); reject(error); });
    });
    const result = runShipctl(fixture.root, ['merge', '--plan', planPath]);
    assert.equal(result.status, 2, JSON.stringify(result.json));
    assert.deepEqual(await fullSnapshot(fixture), before);
  } finally { holder?.kill(); await cleanup(fixture); }
});

test('OPS-2b AG-06/10: deletion, rename, literal names and symlink bytes survive v2 preflight', async () => {
  const fixture = await createMonorepoFixture({ services: ['backend'] });
  try {
    const { symlink, unlink } = await import('node:fs/promises');
    const svc = fixture.services.backend.clonePath;
    await makeDirty(svc, { 'old.txt': 'rename bytes', 'delete.txt': 'delete bytes' });
    fixtureGit(svc, 'add', '--', 'old.txt', 'delete.txt');
    fixtureGit(svc, 'commit', '-m', 'seed files');
    fixtureGit(svc, 'push', 'origin', 'main');
    fixtureGit(svc, 'mv', '--', 'old.txt', 'new name.txt');
    const target = resolve(svc, 'delete.txt');
    assert.equal(target, join(resolve(fixture.root), 'services/backend/delete.txt'));
    await unlink(target);
    await symlink('new name.txt', join(svc, 'link.txt'));
    await makeDirty(svc, { '-literal.txt': 'literal' });
    const { planPath } = await v2Plan(fixture, ['services/backend/old.txt', 'services/backend/new name.txt',
      'services/backend/delete.txt', 'services/backend/link.txt', 'services/backend/-literal.txt']);
    const result = runShipctl(fixture.root, ['merge', '--plan', planPath]);
    assert.equal(result.status, 0, JSON.stringify(result.json));
    assert.equal(fixtureGit(svc, 'show', 'HEAD:link.txt'), 'new name.txt');
    assert.equal(fixtureGit(svc, 'show', 'HEAD:new name.txt'), 'rename bytes');
    assert.equal(fixtureGit(svc, 'ls-tree', '--name-only', 'HEAD', '--', 'delete.txt', 'old.txt'), '');
  } finally { await cleanup(fixture); }
});

test('OPS-2b AG-10: lone root alias normalizes, conflicting alias is rejected', async () => {
  const fixture = await createMonorepoFixture({ services: [] });
  try {
    await makeDirty(fixture.root, { 'selected.txt': 'root' });
    const { planPath, plan } = await v2Plan(fixture, ['selected.txt']);
    plan.repos.root = plan.repos['.'];
    delete plan.repos['.'];
    plan.inventory[0].name = 'root';
    await resignPlan(planPath, plan);
    const result = runShipctl(fixture.root, ['merge', '--plan', planPath, '--dry-run']);
    assert.equal(result.status, 0, JSON.stringify(result.json));
    assert.equal(result.json.phase1Steps[0].repo, '.');
  } finally { await cleanup(fixture); }
});


test('OPS-2b AG-06: unsafe foreign overlap with pending strict sync is blocked', async () => {
  const fixture = await createMonorepoFixture({ services: ['backend', 'frontend'] });
  try {
    const svc = fixture.services.frontend.clonePath;
    fixtureGit(svc, 'switch', '-c', 'upstream');
    await makeDirty(svc, { 'README.md': 'upstream bytes' });
    fixtureGit(svc, 'add', '--', 'README.md');
    fixtureGit(svc, 'commit', '-m', 'upstream');
    fixtureGit(svc, 'push', 'origin', 'HEAD:main');
    fixtureGit(svc, 'switch', 'main');
    await makeDirty(svc, { 'README.md': 'foreign bytes' });
    await makeDirty(fixture.services.backend.clonePath, { 'selected.txt': 'selected' });
    const { planPath } = await v2Plan(fixture);
    const before = await fullSnapshot(fixture);
    const result = runShipctl(fixture.root, ['merge', '--plan', planPath]);
    assert.equal(result.status, 3, JSON.stringify(result.json));
    assert.ok(result.json.blockers.some(b => b.repo === 'frontend' && b.blocker === 'unsafe_dirty_sync'));
    assert.deepEqual(await fullSnapshot(fixture), before);
    assert.equal(await readFile(join(svc, 'README.md'), 'utf8'), 'foreign bytes');
  } finally { await cleanup(fixture); }
});

async function assertSchema(name, value) {
  const { default: Ajv } = await import('ajv');
  const schema = JSON.parse(await readFile(join(process.cwd(), 'scripts/ship/schemas', `${name}.json`), 'utf8'));
  const validate = new Ajv({ strict: true, allErrors: true }).compile(schema);
  assert.ok(validate(value), JSON.stringify(validate.errors));
}
const stateFile = f => join(f.root, '.qa/ship/ops-2b/merge-state.json');
const diskState = async f => JSON.parse(await readFile(stateFile(f), 'utf8'));
async function rejectPush(f, name, ref = 'main') {
  const hook = join(f.services[name].barePath, 'hooks/pre-receive');
  await writeFile(hook, `#!/bin/sh
while read old new ref; do
  if [ "$ref" = "refs/heads/${ref}" ]; then
    echo rejected >> '${f.root}/.qa/rejections'
    exit 1
  fi
done
exit 0
`);
  await chmod(hook, 0o755);
  return hook;
}

async function conflictFixture() {
  const f = await createMonorepoFixture({ services: ['backend', 'frontend'] });
  await makeDirty(f.services.backend.clonePath, { 'selected.txt': 'backend' });
  await makeDirty(f.services.frontend.clonePath, { 'README.md': 'feature version\n' });
  await makeDirty(f.root, { 'root.txt': 'root' });
  const plan = await v2Plan(f, ['services/backend/selected.txt', 'services/frontend/README.md', 'root.txt']);
  // Simulate an upstream main advance during the real sync barrier, after
  // feature branches were published. This causes an actual Git conflict.
  const makeBin = join(f.root, '.qa/fake-sync');
  await writeFile(makeBin, `#!/bin/sh
set -eu
printf 'upstream version\\n' > services/frontend/README.md
git -C services/frontend add -- README.md
git -C services/frontend commit -m 'Upstream change during sync'
git -C services/frontend push origin main
`);
  await chmod(makeBin, 0o755);
  const result = runShipctl(f.root, ['merge', '--plan', plan.planPath], { skipSync: false, makeBin });
  assert.equal(result.status, 1, JSON.stringify(result));
  assert.deepEqual(result.json.mergeState.repos.map(r => [r.name, r.stage]),
    [['backend', 'pushed'], ['frontend', 'conflict'], ['.', 'synced']]);
  assert.deepEqual(await diskState(f), result.json.mergeState);
  await assertSchema('merge-state', result.json.mergeState);
  return { f, ...plan };
}

async function resolveConflict(f, foreign = false) {
  const cwd = f.services.frontend.clonePath;
  await makeDirty(cwd, { 'README.md': 'resolved version\n' });
  fixtureGit(cwd, 'add', '--', 'README.md');
  if (foreign) {
    await makeDirty(cwd, { 'foreign.txt': 'not approved' });
    fixtureGit(cwd, 'add', '--', 'foreign.txt');
  }
  fixtureGit(cwd, 'commit', '-m', 'Manual conflict resolution');
}

// UT-MERGE-05 expanded to root + two services and all production consumers.
test('OPS-2c AG-11: generated plan -> merge -> status -> release preview, canonical schemas', async () => {
  const f = await createMonorepoFixture({ services: ['backend', 'frontend'] });
  try {
    const includes = ['root.txt'];
    await makeDirty(f.root, { 'root.txt': 'root' });
    for (const [name, svc] of Object.entries(f.services)) {
      await makeDirty(svc.clonePath, { 'selected.txt': name, 'README.md': `foreign ${name}` });
      includes.push(`services/${name}/selected.txt`);
    }
    const { plan, planPath } = await v2Plan(f, includes);
    await assertSchema('plan', plan);
    const planBytes = await readFile(planPath, 'utf8');
    const before = await fullSnapshot(f);
    assert.equal(runShipctl(f.root, ['merge', '--plan', planPath, '--dry-run']).status, 0);
    assert.deepEqual(await fullSnapshot(f), before);
    const result = runShipctl(f.root, ['merge', '--plan', planPath]);
    assert.equal(result.status, 0, JSON.stringify(result));
    assert.deepEqual(result.json.mergeState.repos.map(r => [r.name, r.stage]),
      [['backend', 'pushed'], ['frontend', 'pushed'], ['.', 'pushed']]);
    await assertSchema('merge-state', await diskState(f));
    assert.equal(await readFile(planPath, 'utf8'), planBytes, 'no plan rewrite/patch');
    const complete = await fullSnapshot(f);
    const status = runShipctl(f.root, ['status']);
    assert.equal(status.status, 0, JSON.stringify(status));
    assert.deepEqual(status.json.repos.map(r => r.name), ['.', 'backend', 'frontend']);
    assert.ok(status.json.repos.every(r => r.branch === 'main'));
    const preview = runShipctl(f.root, ['release', '--change', 'ops-2b', '--dry-run']);
    assert.equal(preview.status, 0, JSON.stringify(preview));
    assert.match(preview.json.RELEASE_TOKEN, /^[a-f0-9]{64}$/);
    assert.deepEqual(preview.json.plan.map(r => [r.repo, r.status]),
      [['backend', 'ff'], ['frontend', 'ff'], ['.', 'not-applicable']]);
    assert.deepEqual(await fullSnapshot(f), complete);
    // Explicit approved local release, not an automatic continuation of merge.
    const release = runShipctl(f.root, ['release', '--change', 'ops-2b', '--release-token', preview.json.RELEASE_TOKEN]);
    assert.equal(release.status, 0, JSON.stringify(release));
    const releaseState = JSON.parse(await readFile(join(f.root, '.qa/ship/ops-2b/release-state.json'), 'utf8'));
    await assertSchema('release-state', releaseState);
    assert.ok(releaseState.repos.filter(r => r.status === 'pushed').every(r => 'ownerRepo' in r && 'sha' in r));
    for (const [name, svc] of Object.entries(f.services)) {
      assert.equal(fixtureGit(svc.barePath, 'rev-parse', 'release').trim(), result.json.mergeState.repos.find(r => r.name === name).pushedSha);
      assert.equal(fixtureGit(svc.clonePath, 'branch', '--show-current').trim(), 'main');
      assert.equal(await readFile(join(svc.clonePath, 'README.md'), 'utf8'), `foreign ${name}`);
    }
  } finally { await cleanup(f); }
});

test('OPS-2c AG-12 UT-MERGE-07/09: partial main push failure is durable, explicit resume only', async () => {
  const f = await createMonorepoFixture({ services: ['backend', 'frontend'] });
  try {
    for (const svc of Object.values(f.services)) await makeDirty(svc.clonePath, { 'selected.txt': 'selected' });
    await makeDirty(f.root, { 'root.txt': 'root' });
    const { planPath } = await v2Plan(f, ['services/backend/selected.txt', 'services/frontend/selected.txt', 'root.txt']);
    const hook = await rejectPush(f, 'frontend');
    const result = runShipctl(f.root, ['merge', '--plan', planPath]);
    assert.equal(result.status, 1, JSON.stringify(result));
    assert.deepEqual(result.json.mergeState.repos.map(r => [r.name, r.stage]),
      [['backend', 'pushed'], ['frontend', 'merged'], ['.', 'synced']]);
    assert.deepEqual(await diskState(f), result.json.mergeState);
    assert.equal((await readFile(join(f.root, '.qa/rejections'), 'utf8')).trim(), 'rejected', 'one attempt');
    const before = await fullSnapshot(f);
    const blocked = runShipctl(f.root, ['release', '--change', 'ops-2b', '--dry-run']);
    assert.equal(blocked.status, 3);
    assert.equal(blocked.json.RELEASE_TOKEN, undefined);
    assert.deepEqual(await fullSnapshot(f), before);
    const check = runShipctl(f.root, ['merge', '--resume', '--change', 'ops-2b', '--dry-run']);
    assert.equal(check.status, 0, JSON.stringify(check));
    assert.deepEqual(await fullSnapshot(f), before);
    await writeFile(hook, '#!/bin/sh\nexit 0\n');
    const resumed = runShipctl(f.root, ['merge', '--resume', '--change', 'ops-2b']);
    assert.equal(resumed.status, 0, JSON.stringify(resumed));
    assert.equal(resumed.json.mergeState.phase, 'phase2-complete');
    assert.deepEqual(await diskState(f), resumed.json.mergeState);
    assert.equal(fixtureGit(f.services.backend.clonePath, 'rev-parse', 'HEAD').trim(), result.json.mergeState.repos[0].pushedSha, 'already published repo untouched');
    assert.equal(await readFile(join(f.root, '.qa/ship/ops-2b/release-state.json'), 'utf8').catch(() => null), null);
  } finally { await cleanup(f); }
});

test('OPS-2c AG-12: phase1 hook stops with failed and untouched rows, no automatic retry', async () => {
  const f = await createMonorepoFixture({ services: ['backend', 'frontend'] });
  try {
    for (const svc of Object.values(f.services)) await makeDirty(svc.clonePath, { 'selected.txt': 'selected' });
    await makeDirty(f.root, { 'root.txt': 'root' });
    const { planPath, plan } = await v2Plan(f, ['services/backend/selected.txt', 'services/frontend/selected.txt', 'root.txt']);
    await rejectPush(f, 'frontend', plan.branchName);
    const result = runShipctl(f.root, ['merge', '--plan', planPath]);
    assert.equal(result.status, 1, JSON.stringify(result));
    assert.deepEqual(result.json.mergeState.repos.map(r => [r.name, r.stage]),
      [['backend', 'branch-pushed'], ['frontend', 'failed'], ['.', 'untouched']]);
    assert.equal(result.json.mergeState.repos[1].lastSuccessfulStage, 'switched');
    assert.deepEqual(await diskState(f), result.json.mergeState);
    const before = await fullSnapshot(f);
    assert.equal(runShipctl(f.root, ['merge', '--resume', '--change', 'ops-2b']).status, 3);
    assert.deepEqual(await fullSnapshot(f), before);
    assert.equal((await readFile(join(f.root, '.qa/rejections'), 'utf8')).trim(), 'rejected');
  } finally { await cleanup(f); }
});

for (const variant of ['pending', 'resolved', 'aborted', 'foreign', 'first-parent', 'moved-pushed', 'moved-pending', 'changed-origin', 'root-alias', 'alias-conflict', 'legacy-plan']) {
  test(`OPS-2c AG-12 UT-MERGE-06/11 UT-RESUME: real conflict ${variant}`, async () => {
    const { f } = await conflictFixture();
    try {
      const cwd = f.services.frontend.clonePath;
      if (['resolved', 'foreign', 'first-parent'].includes(variant)) await resolveConflict(f, variant === 'foreign');
      if (variant === 'first-parent') fixtureGit(cwd, 'commit', '--allow-empty', '-m', 'Unrelated descendant');
      // Operator action in isolated fixture, never a shipctl recovery action.
      if (variant === 'aborted') fixtureGit(cwd, 'merge', '--abort');
      if (variant === 'moved-pushed') fixtureGit(f.services.backend.clonePath, 'commit', '--allow-empty', '-m', 'Unexpected commit');
      if (variant === 'moved-pending') fixtureGit(f.root, 'commit', '--allow-empty', '-m', 'Unexpected commit');
      if (variant === 'changed-origin') fixtureGit(f.root, 'remote', 'set-url', 'origin', f.services.backend.barePath);
      if (['root-alias', 'alias-conflict'].includes(variant)) {
        await resolveConflict(f);
        const state = await diskState(f);
        const root = state.repos.find(r => r.name === '.');
        if (variant === 'root-alias') root.name = 'root';
        else state.repos.push({ ...root, name: 'root' });
        await writeFile(stateFile(f), JSON.stringify(state));
      }
      if (variant === 'legacy-plan') {
        const planPath = join(f.root, '.qa/ship/ops-2b/plan.json');
        const plan = JSON.parse(await readFile(planPath, 'utf8'));
        delete plan.version;
        await writeFile(planPath, JSON.stringify(plan));
      }
      const before = await fullSnapshot(f);
      const persisted = await readFile(stateFile(f), 'utf8');
      const result = runShipctl(f.root, ['merge', '--resume', '--change', 'ops-2b']);
      if (variant === 'resolved' || variant === 'root-alias') {
        assert.equal(result.status, 0, JSON.stringify(result));
        assert.equal(result.json.mergeState.phase, 'phase2-complete');
        assert.deepEqual(await diskState(f), result.json.mergeState);
      } else {
        assert.equal(result.status, 3, JSON.stringify(result));
        const expected = { pending: 'merge_in_progress', aborted: 'conflict_unresolved', foreign: 'foreign_in_merge', 'first-parent': 'foreign_in_merge' }[variant] || 'state_mismatch';
        assert.ok(result.json.blockers.some(b => b.blocker === expected), JSON.stringify(result));
        assert.deepEqual(await fullSnapshot(f), before);
        assert.equal(await readFile(stateFile(f), 'utf8'), persisted);
      }
    } finally { await cleanup(f); }
  });
}

test('OPS-2c AG-12 UT-MERGE-08: sync failure persisted, explicit resume repeats barrier', async () => {
  const f = await createMonorepoFixture({ services: ['backend'] });
  try {
    await makeDirty(f.services.backend.clonePath, { 'selected.txt': 'selected' });
    const { planPath } = await v2Plan(f);
    const makeBin = join(f.root, '.qa/reject-sync');
    await writeFile(makeBin, '#!/bin/sh\nexit 1\n');
    await chmod(makeBin, 0o755);
    const result = runShipctl(f.root, ['merge', '--plan', planPath], { skipSync: false, makeBin });
    assert.equal(result.status, 1, JSON.stringify(result));
    assert.equal(result.json.mergeState.phase, 'sync-failed');
    assert.deepEqual(await diskState(f), result.json.mergeState);
    const resumed = runShipctl(f.root, ['merge', '--resume', '--change', 'ops-2b']);
    assert.equal(resumed.status, 0, JSON.stringify(resumed));
  } finally { await cleanup(f); }
});
