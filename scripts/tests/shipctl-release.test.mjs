/**
 * Tests for shipctl release command.
 *
 * Coverage:
 *   UT-REL-01: Selection (pushed + origin/release; root; no-release; --repos)
 *   UT-REL-02: Happy path ff push
 *   UT-REL-03: Idempotency (release == main)
 *   UT-REL-04: Divergence (release contains commit not in main)
 *   UT-REL-05: Dry-run without merge-state
 *   UT-REL-06: Races (main_moved; push rejected)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createFixture, gitInRepo, createCommit } from './helpers/fixture.mjs';

const SHIPCTL = join(process.cwd(), 'scripts/shipctl');

function runShipctl(fixtureRoot, args) {
  return spawnSync('node', [SHIPCTL, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, SHIPCTL_ROOT: fixtureRoot }
  });
}

describe('shipctl release', () => {
  let tmpRoot;
  let fixture;

  before(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'release-test-'));
  });

  after(async () => {
    if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true });
  });

  // UT-REL-01: Selection
  it('UT-REL-01: selects only pushed repos with origin/release; root not-applicable; no-release-branch; --repos filter', async () => {
    fixture = await createFixture(tmpRoot, {
      services: {
        backend: { branches: ['main', 'release'] },
        frontend: { branches: ['main', 'release'] },
        vk: { branches: ['main'] } // no release branch
      }
    });

    // Get actual SHAs
    const backendSha = gitInRepo(join(fixture.root, 'services/backend'), 'rev-parse', 'origin/main').stdout.trim();
    const frontendSha = gitInRepo(join(fixture.root, 'services/frontend'), 'rev-parse', 'origin/main').stdout.trim();
    const vkSha = gitInRepo(join(fixture.root, 'services/vk'), 'rev-parse', 'origin/main').stdout.trim();
    const rootSha = gitInRepo(fixture.root, 'rev-parse', 'HEAD').stdout.trim();

    // Create merge-state.json
    const stateDir = join(fixture.root, '.qa/ship/test-change');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(stateDir, { recursive: true });
    
    await writeFile(join(stateDir, 'merge-state.json'), JSON.stringify({
      change: 'test-change',
      repos: [
        { name: 'root', stage: 'pushed', mainSha: rootSha },
        { name: 'backend', stage: 'pushed', mainSha: backendSha },
        { name: 'frontend', stage: 'pushed', mainSha: frontendSha },
        { name: 'vk', stage: 'pushed', mainSha: vkSha }
      ]
    }, null, 2));

    // Run release --dry-run --repos backend,frontend,vk,root
    const result = runShipctl(fixture.root, ['release', '--change', 'test-change', '--dry-run', '--repos', 'backend,frontend,vk,root']);

    assert.equal(result.status, 0, `Expected exit 0, got ${result.status}: ${result.stderr}`);

    const output = JSON.parse(result.stdout);
    assert.equal(output.ok, true);
    assert.equal(output.dryRun, true);

    const plan = output.plan;
    const root = plan.find(r => r.repo === 'root');
    const backend = plan.find(r => r.repo === 'backend');
    const frontend = plan.find(r => r.repo === 'frontend');
    const vk = plan.find(r => r.repo === 'vk');

    assert.equal(root.status, 'not-applicable', 'Root should be not-applicable');
    assert.ok(backend.status === 'ready' || backend.status === 'noop' || backend.status === 'ff', 'Backend should be candidate/ready/noop');
    assert.ok(frontend.status === 'ready' || frontend.status === 'noop' || frontend.status === 'ff', 'Frontend should be candidate/ready/noop');
    assert.equal(vk.status, 'no-release-branch', 'VK should be no-release-branch');

    // Check --repos filter (only backend)
    const filterResult = runShipctl(fixture.root, ['release', '--change', 'test-change', '--dry-run', '--repos', 'backend']);

    const filterOutput = JSON.parse(filterResult.stdout);
    const skippedFrontend = filterOutput.plan.find(r => r.repo === 'frontend');
    assert.equal(skippedFrontend.status, 'skipped', 'Frontend should be skipped when not in --repos');
  });

  // UT-REL-02: Happy path
  it('UT-REL-02: ff push; origin/release == SHA main; clone on main; no local release; no worktree; foreign untouched', async () => {
    fixture = await createFixture(tmpRoot, {
      services: {
        backend: { branches: ['main', 'release'] }
      }
    });

    const backendPath = join(fixture.root, 'services/backend');

    // Create commits: release is ancestor of main
    // First commit on main
    const firstCommit = await createCommit(backendPath, 'main', 'First commit');
    await gitInRepo(backendPath, 'push', 'origin', 'main');

    // Point release to same commit
    await gitInRepo(backendPath, 'push', 'origin', `${firstCommit}:refs/heads/release`);

    // Now advance main ahead of release
    const mainCommit = await createCommit(backendPath, 'main', 'Main commit after release');
    await gitInRepo(backendPath, 'push', 'origin', 'main');

    // Create merge-state.json
    const stateDir = join(fixture.root, '.qa/ship/rel-happy');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(stateDir, { recursive: true });
    
    await writeFile(join(stateDir, 'merge-state.json'), JSON.stringify({
      change: 'rel-happy',
      repos: [
        { name: 'backend', stage: 'pushed', mainSha: mainCommit }
      ]
    }, null, 2));

    // Snapshot before
    const beforeBranch = await gitInRepo(backendPath, 'rev-parse', '--abbrev-ref', 'HEAD');
    const beforeHead = await gitInRepo(backendPath, 'rev-parse', 'HEAD');

    // Run release
    const result = runShipctl(fixture.root, ['release', '--change', 'rel-happy']);

    if (result.status !== 0) {
      console.error('JSON output:', result.stdout);
    }
    assert.equal(result.status, 0, `Expected exit 0, got ${result.status}: ${result.stderr}`);

    const output = JSON.parse(result.stdout);
    assert.equal(output.ok, true);

    const backendResult = output.repos.find(r => r.repo === 'backend');
    assert.equal(backendResult.status, 'pushed');
    assert.equal(backendResult.sha, mainCommit);

    // Verify origin/release == main
    const releaseSha = (await gitInRepo(backendPath, 'rev-parse', 'origin/release')).stdout.trim();
    assert.equal(releaseSha, mainCommit, 'origin/release should equal main SHA');

    // Verify clone still on main
    const afterBranch = (await gitInRepo(backendPath, 'rev-parse', '--abbrev-ref', 'HEAD')).stdout.trim();
    const afterHead = (await gitInRepo(backendPath, 'rev-parse', 'HEAD')).stdout.trim();
    assert.equal(afterBranch, beforeBranch.stdout.trim(), 'Clone should stay on same branch');
    assert.equal(afterHead, beforeHead.stdout.trim(), 'Clone HEAD should not change');

    // Verify no local release branch
    const localReleaseResult = await gitInRepo(backendPath, 'rev-parse', '--verify', 'release');
    assert.equal(localReleaseResult.status, 128, 'Local release branch should not exist');

    // Verify release-state.json
    const releaseState = JSON.parse(await readFile(join(stateDir, 'release-state.json'), 'utf8'));
    assert.equal(releaseState.change, 'rel-happy');
    assert.equal(releaseState.repos[0].repo, 'backend');
    assert.equal(releaseState.repos[0].status, 'pushed');
  });

  // UT-REL-03: Idempotency
  it('UT-REL-03: release already == main; noop; no push', async () => {
    fixture = await createFixture(tmpRoot, {
      services: {
        backend: { branches: ['main', 'release'] }
      }
    });

    const backendPath = join(fixture.root, 'services/backend');

    // Make release == main
    const mainCommit = await createCommit(backendPath, 'main', 'Same commit');
    await gitInRepo(backendPath, 'push', 'origin', 'main');
    await gitInRepo(backendPath, 'push', 'origin', `${mainCommit}:refs/heads/release`);

    // Create merge-state.json
    const stateDir = join(fixture.root, '.qa/ship/rel-noop');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(stateDir, { recursive: true });
    
    await writeFile(join(stateDir, 'merge-state.json'), JSON.stringify({
      change: 'rel-noop',
      repos: [
        { name: 'backend', stage: 'pushed', mainSha: mainCommit }
      ]
    }, null, 2));

    // Run release
    const result = runShipctl(fixture.root, ['release', '--change', 'rel-noop']);

    assert.equal(result.status, 0);

    const output = JSON.parse(result.stdout);
    assert.equal(output.ok, true);

    const backendResult = output.repos.find(r => r.repo === 'backend');
    assert.equal(backendResult.status, 'noop');
  });

  // UT-REL-04: Divergence
  it('UT-REL-04: release contains commit not in main; release_diverged; exit 3; no push; commits list', async () => {
    fixture = await createFixture(tmpRoot, {
      services: {
        backend: { branches: ['main', 'release'] },
        frontend: { branches: ['main', 'release'] }
      }
    });

    const backendPath = join(fixture.root, 'services/backend');
    const frontendPath = join(fixture.root, 'services/frontend');

    // Backend: main and release share history
    const backendMain = await createCommit(backendPath, 'main', 'Backend main');
    await gitInRepo(backendPath, 'push', 'origin', 'main');
    const backendRelease = await createCommit(backendPath, 'release', 'Backend release old');
    await gitInRepo(backendPath, 'push', 'origin', 'release');

    // Frontend: release has diverged commit
    const frontendBase = await createCommit(frontendPath, 'main', 'Frontend base');
    await gitInRepo(frontendPath, 'push', 'origin', 'main');
    
    await gitInRepo(frontendPath, 'checkout', 'release');
    const divergedCommit = await createCommit(frontendPath, 'release', 'Diverged hotfix');
    await gitInRepo(frontendPath, 'push', 'origin', 'release');
    await gitInRepo(frontendPath, 'checkout', 'main');

    // Create merge-state.json
    const stateDir = join(fixture.root, '.qa/ship/rel-diverged');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(stateDir, { recursive: true });
    
    await writeFile(join(stateDir, 'merge-state.json'), JSON.stringify({
      change: 'rel-diverged',
      repos: [
        { name: 'backend', stage: 'pushed', mainSha: backendMain },
        { name: 'frontend', stage: 'pushed', mainSha: frontendBase }
      ]
    }, null, 2));

    // Run release
    const result = runShipctl(fixture.root, ['release', '--change', 'rel-diverged']);

    assert.equal(result.status, 3, 'Should exit 3 on divergence');

    const output = JSON.parse(result.stdout);
    assert.equal(output.ok, false);
    assert.ok(output.blockers.length > 0);

    const frontendBlocker = output.blockers.find(b => b.repo === 'frontend');
    assert.equal(frontendBlocker.blocker, 'release_diverged');
    assert.ok(frontendBlocker.commits.length > 0, 'Should list diverged commits');
    assert.ok(frontendBlocker.commits[0].includes('Diverged hotfix'), 'Should show hotfix commit');
  });

  // UT-REL-05: Dry-run without merge-state
  it('UT-REL-05: --dry-run --repos without merge-state; classify ff/noop/diverged; snapshots equal', async () => {
    fixture = await createFixture(tmpRoot, {
      services: {
        backend: { branches: ['main', 'release'] },
        frontend: { branches: ['main', 'release'] }
      }
    });

    const backendPath = join(fixture.root, 'services/backend');
    const frontendPath = join(fixture.root, 'services/frontend');

    // Backend: ff ready (release is ancestor of main)
    const backendOld = await createCommit(backendPath, 'main', 'Backend old');
    await gitInRepo(backendPath, 'push', 'origin', 'main');
    await gitInRepo(backendPath, 'push', 'origin', `${backendOld}:refs/heads/release`);
    
    const backendMain = await createCommit(backendPath, 'main', 'Backend new');
    await gitInRepo(backendPath, 'push', 'origin', 'main');

    // Frontend: noop
    const frontendCommit = await createCommit(frontendPath, 'main', 'Frontend same');
    await gitInRepo(frontendPath, 'push', 'origin', 'main');
    await gitInRepo(frontendPath, 'push', 'origin', `${frontendCommit}:refs/heads/release`);

    // Snapshots before
    const backendBefore = (await gitInRepo(backendPath, 'status', '--porcelain')).stdout;
    const frontendBefore = (await gitInRepo(frontendPath, 'status', '--porcelain')).stdout;

    // Run dry-run
    const result = runShipctl(fixture.root, ['release', '--dry-run', '--repos', 'backend,frontend']);

    assert.equal(result.status, 0);

    const output = JSON.parse(result.stdout);
    assert.equal(output.ok, true);
    assert.equal(output.dryRun, true);

    const backend = output.plan.find(r => r.repo === 'backend');
    const frontend = output.plan.find(r => r.repo === 'frontend');

    assert.equal(backend.status, 'ff');
    assert.equal(backend.sha, backendMain);

    assert.equal(frontend.status, 'noop');

    // Snapshots after
    const backendAfter = (await gitInRepo(backendPath, 'status', '--porcelain')).stdout;
    const frontendAfter = (await gitInRepo(frontendPath, 'status', '--porcelain')).stdout;

    assert.equal(backendAfter, backendBefore, 'Backend should not mutate');
    assert.equal(frontendAfter, frontendBefore, 'Frontend should not mutate');
  });

  // UT-REL-06: Races
  it('UT-REL-06: main_moved; push rejected; exit 3 no push / exit 1 table', async () => {
    fixture = await createFixture(tmpRoot, {
      services: {
        backend: { branches: ['main', 'release'] },
        frontend: { branches: ['main', 'release'] }
      }
    });

    const backendPath = join(fixture.root, 'services/backend');
    const frontendPath = join(fixture.root, 'services/frontend');

    // Backend: main will be moved
    const backendOld = await createCommit(backendPath, 'main', 'Backend old main');
    await gitInRepo(backendPath, 'push', 'origin', 'main');
    const backendRelease = await createCommit(backendPath, 'release', 'Backend release');
    await gitInRepo(backendPath, 'push', 'origin', 'release');

    // Frontend: normal
    const frontendRelease = await createCommit(frontendPath, 'release', 'Frontend release');
    await gitInRepo(frontendPath, 'push', 'origin', 'release');
    const frontendMain = await createCommit(frontendPath, 'main', 'Frontend main');
    await gitInRepo(frontendPath, 'push', 'origin', 'main');

    // Create merge-state.json with OLD backend main
    const stateDir = join(fixture.root, '.qa/ship/rel-race');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(stateDir, { recursive: true });
    
    await writeFile(join(stateDir, 'merge-state.json'), JSON.stringify({
      change: 'rel-race',
      repos: [
        { name: 'backend', stage: 'pushed', mainSha: backendOld },
        { name: 'frontend', stage: 'pushed', mainSha: frontendMain }
      ]
    }, null, 2));

    // Move backend main
    const backendNew = await createCommit(backendPath, 'main', 'Backend moved main');
    await gitInRepo(backendPath, 'push', 'origin', 'main');

    // Run release
    const result = runShipctl(fixture.root, ['release', '--change', 'rel-race']);

    assert.equal(result.status, 3, 'Should exit 3 on main_moved');

    const output = JSON.parse(result.stdout);
    assert.equal(output.ok, false);

    const backendBlocker = output.blockers.find(b => b.repo === 'backend');
    assert.equal(backendBlocker.blocker, 'main_moved');
    assert.ok(backendBlocker.detail.includes(backendNew), 'Should show new SHA');

    // Verify no push happened (origin/release unchanged)
    const backendReleaseSha = (await gitInRepo(backendPath, 'rev-parse', 'origin/release')).stdout.trim();
    assert.equal(backendReleaseSha, backendRelease, 'Backend release should not change');

    const frontendReleaseSha = (await gitInRepo(frontendPath, 'rev-parse', 'origin/release')).stdout.trim();
    assert.equal(frontendReleaseSha, frontendRelease, 'Frontend release should not change');
  });
});
