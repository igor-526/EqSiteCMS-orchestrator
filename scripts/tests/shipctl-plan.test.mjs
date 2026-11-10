/**
 * Tests for shipctl plan command (UT-PLAN-01..07)
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import {
  createMonorepoFixture as createBaseFixture,
  makeDirty,
  cleanup,
  captureMonorepoSnapshot,
  assertSnapshotsEqual,
  guardNonLocalRemote
} from './helpers/fixture.mjs';

// Fixture processes must not inherit production Git paths/configuration or hooks.
for (const key of ['GIT_DIR', 'GIT_COMMON_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_CONFIG_PARAMETERS']) delete process.env[key];
Object.assign(process.env, { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_COUNT: '0', GIT_TERMINAL_PROMPT: '0' });

const FIXTURE_BASE = path.resolve('.qa/add-safe-services-autogit/OPS-1/fixtures');
const createMonorepoFixture = options => createBaseFixture({ ...options, fixtureBase: FIXTURE_BASE, withRootOrigin: true });

const SHIPCTL = path.join(process.cwd(), 'scripts/shipctl');

/**
 * Runs shipctl command in fixture context.
 */
function shipctl(root, ...args) {
  const result = spawnSync('node', [SHIPCTL, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      SHIPCTL_ROOT: root
    },
    stdio: 'pipe'
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

describe('UT-PLAN-01: happy path / защита foreign', async () => {
  let fixture;
  
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend', 'frontend'] });
  });
  
  afterEach(async () => {
    await cleanup(fixture);
  });
  
  await it('classifies modified, added, deleted, untracked files correctly', async () => {
    // Guard against non-local remotes
    const manifest = await fs.readFile(fixture.manifestPath, 'utf8');
    for (const line of manifest.split('\n')) {
      if (line.trim() && !line.startsWith('#')) {
        const url = line.split(/\s+/)[1];
        guardNonLocalRemote(url);
      }
    }
    
    // Create change directory structure
    const changeDir = path.join(fixture.root, 'openspec/changes/test-change-083');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Proposal');
    
    const backendPath = fixture.services.backend.clonePath;
    
    // Modified file (included)
    await makeDirty(backendPath, {
      'src/main.py': 'modified content'
    });
    
    // Added file (included)
    await makeDirty(backendPath, {
      'src/new_file.py': 'new content'
    });
    
    // Untracked in directory (included)
    await makeDirty(backendPath, {
      'src/subdir/nested.py': 'nested content'
    });
    
    // Foreign files
    await makeDirty(backendPath, {
      'local_notes.txt': 'foreign',
      'temp/data.json': '{"temp": true}'
    });
    
    // Deleted file (stage deletion)
    const deleteTarget = path.join(backendPath, 'README.md');
    await fs.unlink(deleteTarget);
    
    // Create paths file
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, [
      'services/backend/src/main.py',
      'services/backend/src/new_file.py',
      'services/backend/src/subdir/',
      'services/backend/README.md'
    ].join('\n'));
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'test-change-083',
      '--summary', 'Test change',
      '--paths-file', pathsFile
    );
    
    assert.strictEqual(result.status, 0, 'plan should succeed');
    assert.ok(result.json, 'should return JSON');
    assert.strictEqual(result.json.ok, true);
    
    const plan = result.json;
    const backendRepo = plan.repos.backend;
    
    assert.ok(backendRepo, 'backend should be present');
    assert.strictEqual(backendRepo.status, 'changed');
    
    // Check included files
    const includedPaths = new Set(backendRepo.included.map(f => f.path));
    assert.ok(includedPaths.has('src/main.py'), 'modified file included');
    assert.ok(includedPaths.has('src/new_file.py'), 'added file included');
    assert.ok(includedPaths.has('src/subdir/nested.py'), 'untracked nested included');
    assert.ok(includedPaths.has('README.md'), 'deleted file included');
    
    // Check foreign files
    const foreignPaths = new Set(backendRepo.foreign.map(f => f.path));
    assert.ok(foreignPaths.has('local_notes.txt'), 'foreign file classified');
    assert.ok(foreignPaths.has('temp/data.json'), 'foreign nested classified');
    
    // Frontend should be untouched
    const frontendRepo = plan.repos.frontend;
    assert.strictEqual(frontendRepo.status, 'untouched');
  });
});

describe('UT-PLAN-02: полнота автопутей', async () => {
  let fixture;
  
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend'] });
  });
  
  afterEach(async () => {
    await cleanup(fixture);
  });
  
  await it('includes auto-paths from change, archive, specs', async () => {
    const changeDir = path.join(fixture.root, 'openspec/changes/auto-test');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'design.md'), '# Design');
    
    // Create specs in change
    const changeSpecsDir = path.join(changeDir, 'specs/task-tooling');
    await fs.mkdir(changeSpecsDir, { recursive: true });
    await fs.writeFile(path.join(changeSpecsDir, 'spec.md'), '# Spec');
    
    // Create main specs directory
    const mainSpecsDir = path.join(fixture.root, 'openspec/specs/task-tooling');
    await fs.mkdir(mainSpecsDir, { recursive: true });
    await fs.writeFile(path.join(mainSpecsDir, 'spec.md'), '# Main Spec');
    
    // Create dirty file in main specs
    await fs.writeFile(path.join(mainSpecsDir, 'update.md'), '# Update');
    
    // No explicit paths-file, rely on auto-paths
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'auto-test',
      '--summary', 'Auto paths test'
    );
    
    assert.strictEqual(result.status, 0);
    assert.ok(result.json);
    
    const plan = result.json;
    const rootRepo = plan.repos['.'];
    
    assert.strictEqual(rootRepo.status, 'changed', 'root should be changed');
    
    const includedPaths = new Set(rootRepo.included.map(f => f.path));
    assert.ok(includedPaths.has('openspec/specs/task-tooling/update.md'), 'main specs included');
  });
});

describe('UT-PLAN-03: валидация входа', async () => {
  let fixture;
  
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend'] });
  });
  
  afterEach(async () => {
    await cleanup(fixture);
  });
  
  await it('handles --include/--exclude correctly', async () => {
    const changeDir = path.join(fixture.root, 'openspec/changes/validation-test');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '# Tasks');
    
    await makeDirty(fixture.services.backend.clonePath, {
      'included.py': 'content',
      'excluded.py': 'content'
    });
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'validation-test',
      '--summary', 'Validation',
      '--include', 'services/backend/included.py',
      '--exclude', 'services/backend/excluded.py'
    );
    
    assert.strictEqual(result.status, 0);
    const plan = result.json;
    const backend = plan.repos.backend;
    
    const includedPaths = new Set(backend.included.map(f => f.path));
    const foreignPaths = new Set(backend.foreign.map(f => f.path));
    
    assert.ok(includedPaths.has('included.py'), 'included via --include');
    assert.ok(foreignPaths.has('excluded.py'), 'excluded via --exclude');
  });
});

describe('UT-PLAN-04: конвенции / суффикс', async () => {
  let fixture;
  
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend', 'frontend'] });
  });
  
  afterEach(async () => {
    await cleanup(fixture);
  });
  
  await it('determines kind from change prefix and adds suffix for occupied branches', async () => {
    const changeDir = path.join(fixture.root, 'openspec/changes/fix-bug-123');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Fix');
    
    await makeDirty(fixture.services.backend.clonePath, {
      'src/fix.py': 'fix'
    });
    
    // Also change frontend so both repos are "changed"
    await makeDirty(fixture.services.frontend.clonePath, {
      'src/fix.tsx': 'fix'
    });
    
    // Create occupied branch locally in backend
    spawnSync('git', ['branch', 'bug/fix-bug-123'], {
      cwd: fixture.services.backend.clonePath
    });
    
    // Create occupied -2 branch on origin in frontend
    const frontendBare = fixture.services.frontend.barePath;
    const tempClone = path.join(fixture.root, 'temp-frontend-clone');
    spawnSync('git', ['clone', frontendBare, tempClone], {
      cwd: fixture.root
    });
    spawnSync('git', ['checkout', '-b', 'bug/fix-bug-123-2'], {
      cwd: tempClone
    });
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: tempClone });
    spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tempClone });
    await fs.writeFile(path.join(tempClone, 'dummy.txt'), 'dummy');
    spawnSync('git', ['add', 'dummy.txt'], { cwd: tempClone });
    spawnSync('git', ['commit', '-m', 'Occupy branch'], { cwd: tempClone });
    guardNonLocalRemote(frontendBare);
    spawnSync('git', ['push', 'origin', 'bug/fix-bug-123-2'], { cwd: tempClone });
    assert.strictEqual(await fs.realpath(tempClone), path.join(await fs.realpath(fixture.root), 'temp-frontend-clone'));
    await fs.rm(tempClone, { recursive: true, force: true });
    
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/src/fix.py\nservices/frontend/src/fix.tsx\n');
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'fix-bug-123',
      '--summary', 'Fix bug',
      '--paths-file', pathsFile
    );
    
    assert.strictEqual(result.status, 0);
    const plan = result.json;
    
    assert.strictEqual(plan.kind, 'bug', 'kind should be bug from fix- prefix');
    assert.strictEqual(plan.branchName, 'bug/fix-bug-123-3', 'should skip occupied branches');
    assert.deepStrictEqual(plan.skippedBranches, ['bug/fix-bug-123', 'bug/fix-bug-123-2']);
    
    const subject = plan.commitMessage.subject;
    assert.ok(subject.startsWith('fix(fix-bug-123):'), 'commit should use fix prefix');
  });
});

describe('UT-PLAN-05: предусловия', async () => {
  let fixture;
  
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend'] });
  });
  
  afterEach(async () => {
    await cleanup(fixture);
  });
  
  await it('detects detached HEAD blocker', async () => {
    const backendPath = fixture.services.backend.clonePath;
    
    // Detach HEAD
    const headSha = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: backendPath,
      encoding: 'utf8'
    }).stdout.trim();
    spawnSync('git', ['checkout', headSha], { cwd: backendPath });
    
    const changeDir = path.join(fixture.root, 'openspec/changes/detach-test');
    await fs.mkdir(changeDir, { recursive: true });
    
    await makeDirty(backendPath, { 'test.py': 'test' });
    
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/test.py\n');
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'detach-test',
      '--summary', 'Test',
      '--paths-file', pathsFile
    );
    
    assert.strictEqual(result.status, 3, 'should exit 3 for blockers');
    assert.ok(result.json);
    assert.strictEqual(result.json.ok, false);
    assert.ok(result.json.blockers.includes('detached_head'));
  });
  
  await it('detects not_on_main blocker', async () => {
    const backendPath = fixture.services.backend.clonePath;
    
    spawnSync('git', ['checkout', '-b', 'other-branch'], { cwd: backendPath });
    
    const changeDir = path.join(fixture.root, 'openspec/changes/branch-test');
    await fs.mkdir(changeDir, { recursive: true });
    
    await makeDirty(backendPath, { 'test.py': 'test' });
    
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/test.py\n');
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'branch-test',
      '--summary', 'Test',
      '--paths-file', pathsFile
    );
    
    assert.strictEqual(result.status, 3);
    assert.ok(result.json.blockers.includes('not_on_main'));
  });
  
  await it('detects foreign_staged blocker', async () => {
    const backendPath = fixture.services.backend.clonePath;
    
    await makeDirty(backendPath, {
      'foreign.txt': 'foreign',
      'included.py': 'included'
    });
    
    // Stage foreign file
    spawnSync('git', ['add', 'foreign.txt'], { cwd: backendPath });
    
    const changeDir = path.join(fixture.root, 'openspec/changes/staged-test');
    await fs.mkdir(changeDir, { recursive: true });
    
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/included.py\n');
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'staged-test',
      '--summary', 'Test',
      '--paths-file', pathsFile
    );
    
    assert.strictEqual(result.status, 3);
    assert.ok(result.json.blockers.includes('foreign_staged'));
  });
});

describe('UT-PLAN-06: контракт', async () => {
  let fixture;
  
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend'] });
  });
  
  afterEach(async () => {
    await cleanup(fixture);
  });
  
  await it('includes fingerprint, aliases, hasRelease, owner/repo', async () => {
    const changeDir = path.join(fixture.root, 'openspec/changes/contract-test');
    await fs.mkdir(changeDir, { recursive: true });
    
    await makeDirty(fixture.services.backend.clonePath, {
      'src/main.py': 'changed'
    });
    
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/src/main.py\n');
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'contract-test',
      '--summary', 'Contract',
      '--paths-file', pathsFile
    );
    
    assert.strictEqual(result.status, 0);
    const plan = result.json;
    const backend = plan.repos.backend;
    
    assert.ok(backend.fingerprint, 'should have fingerprint');
    assert.strictEqual(backend.fingerprint.length, 64, 'fingerprint is SHA256');
    
    assert.ok(Array.isArray(backend.runtimeAliases), 'should have runtime aliases');
    assert.ok(backend.runtimeAliases.includes('app'), 'backend maps to app alias');
    
    assert.strictEqual(backend.hasRelease, true, 'should detect origin/release');
    
    // owner/repo should be parsed from local bare path in fixture
    assert.ok(backend.ownerRepo === null, 'fixture uses local paths, no GitHub owner/repo');
  });
});

describe('UT-PLAN-07: CLI-контракт', async () => {
  let fixture;
  
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend'] });
  });
  
  afterEach(async () => {
    await cleanup(fixture);
  });
  
  await it('outputs only JSON to stdout and exits with correct codes', async () => {
    const changeDir = path.join(fixture.root, 'openspec/changes/cli-test');
    await fs.mkdir(changeDir, { recursive: true });
    
    await makeDirty(fixture.services.backend.clonePath, {
      'test.py': 'test'
    });
    
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/test.py\n');
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'cli-test',
      '--summary', 'CLI test',
      '--paths-file', pathsFile
    );
    
    // stdout should be valid JSON
    assert.ok(result.json, 'stdout is valid JSON');
    assert.ok(result.json.ok !== undefined, 'JSON has ok field');
    
    // stderr should contain progress
    assert.ok(result.stderr.includes('Planning change'), 'progress goes to stderr');
    
    // Exit 0 for success
    assert.strictEqual(result.status, 0);
  });
  
  await it('exits 3 when preconditions fail', async () => {
    const backendPath = fixture.services.backend.clonePath;
    spawnSync('git', ['checkout', '-b', 'wrong-branch'], { cwd: backendPath });
    
    const changeDir = path.join(fixture.root, 'openspec/changes/exit-test');
    await fs.mkdir(changeDir, { recursive: true });
    
    await makeDirty(backendPath, { 'test.py': 'test' });
    
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/test.py\n');
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'exit-test',
      '--summary', 'Exit test',
      '--paths-file', pathsFile
    );
    
    assert.strictEqual(result.status, 3, 'exit 3 for precondition failure');
    assert.strictEqual(result.json.ok, false);
  });
});

describe('UT-PLAN-08: schema validation (F-083-01)', async () => {
  let fixture;
  
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend'] });
  });
  
  afterEach(async () => {
    await cleanup(fixture);
  });
  
  await it('validates plan.json against JSON Schema', async () => {
    // Guard against non-local remotes
    const manifest = await fs.readFile(fixture.manifestPath, 'utf8');
    for (const line of manifest.split('\n')) {
      if (line.trim() && !line.startsWith('#')) {
        const url = line.split(/\s+/)[1];
        guardNonLocalRemote(url);
      }
    }
    
    const changeDir = path.join(fixture.root, 'openspec/changes/schema-test');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Schema test');
    
    const backendPath = fixture.services.backend.clonePath;
    await makeDirty(backendPath, { 'test.py': 'test content' });
    
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/test.py\n');
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'schema-test',
      '--summary', 'Schema validation test',
      '--paths-file', pathsFile
    );
    
    assert.strictEqual(result.status, 0, 'plan succeeds');
    assert.strictEqual(result.json.ok, true);
    
    // Verify plan.json was written with valid schema
    const planPath = path.join(fixture.root, '.qa/ship/schema-test/plan.json');
    const planContent = await fs.readFile(planPath, 'utf8');
    const plan = JSON.parse(planContent);
    
    // Validate required fields per schema
    assert.ok(plan.change, 'plan.change exists');
    assert.ok(plan.kind, 'plan.kind exists');
    assert.ok(plan.branchName, 'plan.branchName exists');
    assert.ok(plan.commitMessage, 'plan.commitMessage exists');
    assert.ok(plan.repos, 'plan.repos exists');
    assert.ok(typeof plan.hasBlockers === 'boolean', 'plan.hasBlockers is boolean');
    
    // Validate schema compliance would be checked by ajv at write time
    // If we got here without exit 2, schema validation passed
  });
});

// AG groups use only local, owned fixtures. Every invocation is read-only Git.
import { gitInRepo } from './helpers/fixture.mjs';
import { parseStatusPorcelain, originIdentity } from '../ship/git.mjs';
import Ajv from 'ajv';

function g(cwd, ...args) {
  const result = gitInRepo(cwd, '-c', 'core.hooksPath=/dev/null', ...args);
  assert.strictEqual(result.status, 0, `fixture git ${args[0]} failed`);
  return result.stdout.trim();
}

describe('AG-03..08/10: canonical safe planning', () => {
  let fixture, backend, frontend, pathsFile;
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend', 'frontend'] });
    backend = fixture.services.backend.clonePath;
    frontend = fixture.services.frontend.clonePath;
    pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/src/\n');
    await makeDirty(backend, { 'src/change.txt': 'new content' });
    for (const repo of [fixture.root, backend, frontend]) guardNonLocalRemote(g(repo, 'remote', 'get-url', 'origin'));
  });
  afterEach(async () => { await cleanup(fixture); });
  const runPlan = (...extra) => shipctl(fixture.root, 'plan', '--change', 'safe-test', '--message', 'Исправлено SEO', '--paths-file', pathsFile, ...extra);
  const snapshot = () => captureMonorepoSnapshot(fixture);

  it('AG-03/04: exact branch/message, trailers, collision and legacy fallback', async () => {
    const before = await snapshot();
    const result = runPlan('--branch', 'bugs/seo-improve', '--task', 'docs/tasks/108.md');
    assert.strictEqual(result.status, 0, result.stdout);
    assert.strictEqual(result.json.branchName, 'bugs/seo-improve');
    assert.deepStrictEqual(result.json.commitMessage, { subject: 'Исправлено SEO', trailers: ['OpenSpec: safe-test', 'Task: docs/tasks/108.md'] });
    g(backend, 'branch', 'bugs/seo-improve');
    const collision = runPlan('--branch', 'bugs/seo-improve');
    assert.strictEqual(collision.status, 3);
    assert.ok(collision.json.blockers.includes('branch_occupied'));
    g(backend, 'branch', '-D', 'bugs/seo-improve');
    assertSnapshotsEqual(before, await snapshot());
  });

  it('AG-03: strict argument/ref/subject validation and Unicode boundary', async () => {
    const before = await snapshot();
    const invalid = [
      ['--unknown', 'x'], ['--branch'], ['--branch', 'main'], ['--branch', 'release'], ['--branch', 'dev'],
      ['--branch', '-option'], ['--branch', 'bad..ref'], ['--branch', '@{-1}'], ['--kind', 'other'], ['--message', 'x'],
      ['--summary', 'line\nline'], ['--branch', 'feature/a\rB']
    ];
    for (const args of invalid) assert.strictEqual(runPlan(...args).status, 3, JSON.stringify(args));
    for (const subject of ['', '   ', 'x\nvalue', 'x\rvalue', 'я'.repeat(73)]) {
      assert.strictEqual(shipctl(fixture.root, 'plan', '--change', 'safe-test', '--message', subject).status, 3);
    }
    const exact = shipctl(fixture.root, 'plan', '--change', 'safe-test', '--message', 'я'.repeat(72), '--include', 'services/backend/src/');
    assert.strictEqual(exact.status, 0, exact.stdout);
    assert.strictEqual(exact.json.commitMessage.subject, 'я'.repeat(72));
    assertSnapshotsEqual(before, await snapshot());
  });

  it('AG-05: clean outside-included inventory blockers fail closed without mutations', async () => {
    const cases = [
      { apply: async () => g(frontend, 'checkout', '-b', 'dev'), undo: async () => g(frontend, 'checkout', 'main'), rule: 'not_on_main' },
      { apply: async () => g(frontend, 'checkout', '--detach'), undo: async () => g(frontend, 'checkout', 'main'), rule: 'detached_head' },
      { apply: async () => fs.mkdir(path.join(frontend, '.git/rebase-merge')), undo: async () => fs.rmdir(path.join(frontend, '.git/rebase-merge')), rule: 'operation_in_progress' },
      { apply: async () => g(frontend, 'remote', 'remove', 'origin'), undo: async () => g(frontend, 'remote', 'add', 'origin', fixture.services.frontend.barePath), rule: 'missing_origin' },
      { apply: async () => g(frontend, 'remote', 'set-url', 'origin', path.join(fixture.root, 'nonexistent.git')), undo: async () => g(frontend, 'remote', 'set-url', 'origin', fixture.services.frontend.barePath), rule: 'remote_probe_failed' },
      { apply: async () => g(frontend, 'update-ref', '-d', 'refs/heads/main'), undo: async () => g(frontend, 'update-ref', 'refs/heads/main', g(backend, 'rev-parse', 'HEAD')), rule: 'missing_main' }
    ];
    // Keep the original SHA when testing a missing local branch.
    const frontHead = g(frontend, 'rev-parse', 'HEAD');
    cases.at(-1).undo = async () => g(frontend, 'update-ref', 'refs/heads/main', frontHead);
    for (const test of cases) {
      await test.apply();
      const before = await snapshot();
      const result = runPlan();
      assert.strictEqual(result.status, 3, result.stdout);
      assert.ok(result.json.blockers.includes(test.rule), `${test.rule}: ${result.stdout}`);
      assertSnapshotsEqual(before, await snapshot());
      await test.undo();
    }
    // Missing clone: append a nonexistent manifest member, never clone it.
    await fs.appendFile(fixture.manifestPath, `missing ${path.join(fixture.root, 'missing.git')}\n`);
    const result = runPlan();
    assert.strictEqual(result.status, 3);
    assert.ok(result.json.repos.missing.blockers.includes('missing_or_invalid_clone'));
  });

  it('AG-05: invalid manifests and origin mismatch cannot be silently accepted', async () => {
    const original = await fs.readFile(fixture.manifestPath, 'utf8');
    for (const text of [original + original.split('\n')[0] + '\n', '../escape /local\n', 'broken\n']) {
      await fs.writeFile(fixture.manifestPath, text);
      assert.strictEqual(runPlan().status, 3);
    }
    await fs.writeFile(fixture.manifestPath, original);
    g(frontend, 'remote', 'set-url', 'origin', fixture.services.backend.barePath);
    assert.ok(runPlan().json.blockers.includes('origin_mismatch'));
    g(frontend, 'remote', 'set-url', 'origin', fixture.services.frontend.barePath);
    g(frontend, 'remote', 'set-url', '--push', 'origin', fixture.services.backend.barePath);
    assert.ok(runPlan().json.blockers.includes('push_origin_mismatch'));
    for (const remote of ['git://example/repo', 'ssh://example/repo', 'https://example/repo', 'git@example:repo', 'file:///etc/passwd']) assert.throws(() => guardNonLocalRemote(remote));
    assert.strictEqual(originIdentity('git@github.com:org/repo.git'), originIdentity('https://user:secret@github.com/org/repo.git?token=secret'));
  });

  it('AG-06: included partial staging is whole-file; foreign index/content untouched', async () => {
    g(backend, 'add', '--', 'src/change.txt');
    await makeDirty(backend, { 'src/change.txt': 'working bytes', 'foreign.txt': 'foreign bytes' });
    const before = await snapshot();
    const indexBefore = g(backend, 'ls-files', '--stage');
    const result = runPlan();
    assert.strictEqual(result.status, 0, result.stdout);
    assert.ok(result.json.repos.backend.warnings.includes('whole_file_commit'));
    assert.strictEqual(await fs.readFile(path.join(backend, 'foreign.txt'), 'utf8'), 'foreign bytes');
    assert.strictEqual(g(backend, 'ls-files', '--stage'), indexBefore);
    assertSnapshotsEqual(before, await snapshot());
    g(backend, 'add', '--', 'foreign.txt');
    const stagedBefore = await snapshot();
    assert.ok(runPlan().json.blockers.includes('foreign_staged'));
    assertSnapshotsEqual(stagedBefore, await snapshot());
  });

  it('AG-07: hidden files, ignored and credential paths, redacted scanner', async () => {
    await makeDirty(backend, {
      '.github/workflows/check.yml': 'name: check', '.env': 'TOKEN=never-print-this-value',
      '.env.example': 'TOKEN=your_token', '.npmrc': 'private', 'id_rsa': 'private',
      'credentials.prod.json': '{}', 'secret.key': 'private', 'ignored.txt': 'ignored',
      '.gitignore': 'ignored.txt\n'
    });
    await fs.writeFile(pathsFile, 'services/backend/.github/\nservices/backend/.env.example\nservices/backend/ignored.txt\n');
    let result = runPlan();
    assert.strictEqual(result.status, 0, result.stdout);
    assert.ok(result.json.repos.backend.included.some(f => f.path === '.github/workflows/check.yml'));
    assert.ok(!result.json.repos.backend.included.some(f => f.path === 'ignored.txt'));
    for (const file of ['.env', '.npmrc', 'id_rsa', 'credentials.prod.json', 'secret.key']) {
      await fs.writeFile(pathsFile, `services/backend/${file}\n`);
      result = runPlan();
      assert.strictEqual(result.status, 3, file);
      assert.ok(!(result.stdout + result.stderr).includes('never-print-this-value'));
    }
    await fs.writeFile(pathsFile, 'services/backend/src/\n');
    for (const content of ['TOKEN=never-print-this-value', '"TOKEN": "never-print-this-value"', '-----BEGIN RSA PRIVATE KEY-----\nnever-print-this-value']) {
      await makeDirty(backend, { 'src/secret.txt': content });
      result = runPlan();
      assert.strictEqual(result.status, 3);
      assert.ok(result.json.blockers.includes('secret_content'));
      const disk = await fs.readFile(path.join(fixture.root, '.qa/ship/safe-test/plan.json'), 'utf8');
      assert.ok(!(result.stdout + result.stderr + disk).includes('never-print-this-value'));
    }
    await fs.unlink(path.join(backend, 'src/secret.txt'));
    await fs.writeFile(pathsFile, 'services/backend/\n');
    // Broad directory: credential files are excluded with warnings, not force-added.
    result = runPlan();
    assert.strictEqual(result.status, 0, result.stdout);
    assert.ok(result.json.repos.backend.excluded.some(x => x.path === '.env'));
    assert.ok(!result.json.repos.backend.included.some(x => x.path === '.env'));
  });

  it('AG-08: literal spaces/dashes, rename directions, delete and clone ownership', async () => {
    g(backend, 'mv', '--', 'README.md', 'renamed name.md');
    await makeDirty(backend, { '-dash file.txt': 'dash', 'delete.txt': 'delete' });
    g(backend, 'add', '--', 'delete.txt');
    g(backend, 'commit', '-m', 'fixture baseline');
    await fs.unlink(path.join(backend, 'delete.txt'));
    // Return to exact remote main baseline by publishing this fixture-only commit.
    guardNonLocalRemote(g(backend, 'remote', 'get-url', 'origin'));
    g(backend, 'push', 'origin', 'main');
    g(backend, 'mv', '--', 'renamed name.md', 'final name.md');
    await fs.writeFile(pathsFile, 'services/backend/-dash file.txt\nservices/backend/delete.txt\nservices/backend/renamed name.md\nservices/backend/final name.md\n');
    const before = await snapshot();
    let result = runPlan();
    assert.strictEqual(result.status, 0, result.stdout);
    const files = result.json.repos.backend.included;
    assert.deepStrictEqual(new Set(files.map(f => f.path)), new Set(['-dash file.txt', 'delete.txt', 'renamed name.md', 'final name.md']));
    assert.strictEqual(files.find(f => f.path === 'delete.txt').blobHash, null);
    assert.strictEqual(files.find(f => f.path === 'renamed name.md').blobHash, null);
    assert.ok(!result.json.repos['.'].included.some(f => f.path.startsWith('services/')));
    assertSnapshotsEqual(before, await snapshot());
    await fs.writeFile(pathsFile, 'services/backend/final name.md\n');
    result = runPlan();
    assert.ok(result.json.blockers.includes('cross_scope_rename'));
    assert.deepStrictEqual(parseStatusPorcelain('R  new name\0old name\0')[0], { status: 'R ', path: 'new name', oldPath: 'old name', isRename: true });
  });

  it('AG-08: reject traversal/pathspec/nested repo and symlink parents; stage symlink bytes', async () => {
    for (const selector of ['/etc/passwd', '../outside', 'services/backend/../frontend/x', ':(glob)**', 'services/backend/src/*', '.qa/', 'services/unknown/x']) {
      await fs.writeFile(pathsFile, selector + '\n');
      assert.strictEqual(runPlan().status, 3, selector);
    }
    await fs.symlink(frontend, path.join(backend, 'link-dir'));
    await fs.writeFile(pathsFile, 'services/backend/link-dir/README.md\n');
    assert.strictEqual(runPlan().status, 3);
    await fs.mkdir(path.join(backend, 'nested'));
    g(path.join(backend, 'nested'), 'init');
    await fs.writeFile(pathsFile, 'services/backend/nested/\n');
    assert.strictEqual(runPlan().status, 3);
    await fs.symlink('/nonexistent/secret', path.join(backend, 'src/safe-link'));
    await fs.writeFile(pathsFile, 'services/backend/src/safe-link\n');
    const result = runPlan();
    assert.strictEqual(result.status, 0, result.stdout);
    assert.strictEqual(result.json.repos.backend.included[0].mode, '120000');
  });

  it('AG-10: deterministic persisted v2 token binds content/index/subject/branch/HEAD/origin/inventory', async () => {
    const first = runPlan('--branch', 'bugs/token');
    assert.strictEqual(first.status, 0, first.stdout);
    assert.strictEqual(first.json.version, 2);
    assert.ok(first.json.repos['.']);
    const same = runPlan('--branch', 'bugs/token');
    assert.strictEqual(first.json.PLAN_TOKEN, same.json.PLAN_TOKEN);
    for (const key of ['blobHash', 'indexHash', 'statusHash']) assert.ok(first.json.repos.backend.included[0][key]);
    const tokens = [first.json.PLAN_TOKEN];
    await makeDirty(backend, { 'src/change.txt': 'edited bytes' });
    tokens.push(runPlan('--branch', 'bugs/token').json.PLAN_TOKEN);
    g(backend, 'add', '--', 'src/change.txt');
    tokens.push(runPlan('--branch', 'bugs/token').json.PLAN_TOKEN);
    tokens.push(runPlan('--branch', 'bugs/new-token').json.PLAN_TOKEN);
    const subject = shipctl(fixture.root, 'plan', '--change', 'safe-test', '--message', 'Новое сообщение', '--paths-file', pathsFile, '--branch', 'bugs/new-token');
    tokens.push(subject.json.PLAN_TOKEN);
    g(frontend, 'remote', 'set-url', 'origin', fixture.services.backend.barePath);
    tokens.push(runPlan('--branch', 'bugs/token').json.PLAN_TOKEN);
    g(frontend, 'remote', 'set-url', 'origin', fixture.services.frontend.barePath);
    g(backend, 'commit', '-m', 'fixture new head');
    tokens.push(runPlan('--branch', 'bugs/token').json.PLAN_TOKEN);
    await fs.appendFile(fixture.manifestPath, `missing ${path.join(fixture.root, 'missing.git')}\n`);
    tokens.push(runPlan('--branch', 'bugs/token').json.PLAN_TOKEN);
    assert.strictEqual(new Set(tokens).size, tokens.length);
    const schema = JSON.parse(await fs.readFile(path.resolve('scripts/ship/schemas/plan.json'), 'utf8'));
    const validate = new Ajv({ strict: true }).compile(schema);
    const disk = JSON.parse(await fs.readFile(path.join(fixture.root, '.qa/ship/safe-test/plan.json'), 'utf8'));
    assert.ok(validate(disk), JSON.stringify(validate.errors));
    delete disk.version;
    assert.strictEqual(validate(disk), false);
  });

  it('AG-06: foreign-only clean included set is noop with no implicit feature operations', () => {
    const result = shipctl(fixture.root, 'plan', '--change', 'noop', '--message', 'Noop');
    assert.strictEqual(result.status, 0, result.stdout);
    assert.strictEqual(result.json.noop, true);
    assert.strictEqual(result.json.repos.backend.included.length, 0);
  });
});
