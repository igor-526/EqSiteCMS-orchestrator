/** FIX-QG-01 / AG-09/10: bind caller approval to the plan consumed under flock. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createMonorepoFixture, cleanup, makeDirty, captureMonorepoSnapshot,
  guardNonLocalRemote } from './helpers/fixture.mjs';

const ROOT = process.cwd();
const BASE = path.resolve('.qa/add-safe-services-autogit/FIX-QG-01/fixtures');
const SHIPCTL = path.join(ROOT, 'scripts/shipctl');
const ADAPTER = path.join(ROOT, 'scripts/services-autogit');
for (const key of ['GIT_DIR', 'GIT_COMMON_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_CONFIG_PARAMETERS', 'SHIPCTL_LOCKED']) delete process.env[key];
Object.assign(process.env, { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_COUNT: '0', GIT_TERMINAL_PROMPT: '0' });

function run(f, args, env = {}, script = SHIPCTL) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: f.root, encoding: 'utf8', env: { ...process.env,
      SHIPCTL_ROOT: f.root, SHIPCTL_TEST_SKIP_SYNC: 'true', ...env }
  });
  return { code: r.status, json: JSON.parse(r.stdout || '{}'), stderr: r.stderr };
}
function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}
async function setup() {
  const f = await createMonorepoFixture({ services: ['backend'], withRootOrigin: true, fixtureBase: BASE });
  try {
    for (const cwd of [f.root, f.services.backend.clonePath]) {
      for (const flags of [[], ['--push']]) {
        for (const url of git(cwd, 'remote', 'get-url', ...flags, '--all', 'origin').trim().split('\n')) {
          guardNonLocalRemote(url);
          assert.ok(url.startsWith(f.baresRoot + '/'));
        }
      }
    }
    await makeDirty(f.services.backend.clonePath, { 'selected.txt': 'synthetic safe content' });
    const args = ['plan', '--change', 'approval-race', '--branch', 'feature/approval-race',
      '--include', 'services/backend/selected.txt'];
    const a = run(f, [...args, '--message', 'Approved subject A']);
    assert.equal(a.code, 0, JSON.stringify(a));
    const planPath = path.join(f.root, '.qa/ship/approval-race/plan.json');
    const bytesA = await fs.readFile(planPath);
    const b = run(f, [...args, '--message', 'UNAPPROVED subject B']);
    assert.equal(b.code, 0, JSON.stringify(b));
    assert.notEqual(a.json.PLAN_TOKEN, b.json.PLAN_TOKEN);
    const replacement = path.join(f.root, '.qa/replacement.json');
    await fs.copyFile(planPath, replacement);
    await fs.writeFile(planPath, bytesA);
    return Object.assign(f, { planPath, replacement, token: a.json.PLAN_TOKEN });
  } catch (error) { await cleanup(f); throw error; }
}
async function snapshot(f) {
  const clones = [f.root, f.services.backend.clonePath];
  return {
    clones: await captureMonorepoSnapshot(f),
    indexes: await Promise.all(clones.map(cwd => fs.readFile(path.join(cwd, '.git/index')).then(b => b.toString('hex')))),
    refs: [...clones, path.join(f.baresRoot, 'root.git'), f.services.backend.barePath]
      .map(cwd => git(cwd, 'for-each-ref', '--format=%(refname) %(objectname)')),
    selected: await fs.readFile(path.join(f.services.backend.clonePath, 'selected.txt'), 'utf8'),
    state: await fs.readFile(path.join(f.root, '.qa/ship/approval-race/merge-state.json'), 'utf8').catch(e => {
      if (e.code === 'ENOENT') return null;
      throw e;
    })
  };
}
async function swapAtLock(f) {
  const bin = path.join(f.root, '.qa/bin');
  await fs.mkdir(bin);
  // Another read-only planner may write between adapter validation and core read.
  // The actual production lock/reexec, validation, preflight and merge still run.
  await fs.writeFile(path.join(bin, 'flock'), `#!/usr/bin/env node
const fs = require('node:fs'), cp = require('node:child_process');
fs.copyFileSync(process.env.SWAP_SOURCE, process.env.SWAP_TARGET);
const r = cp.spawnSync('/usr/bin/flock', process.argv.slice(2), {stdio: 'inherit', env: process.env});
process.exit(r.status ?? 2);
`, { mode: 0o755 });
  return { PATH: bin + ':' + process.env.PATH, SWAP_SOURCE: f.replacement, SWAP_TARGET: f.planPath };
}

for (const caller of ['adapter', 'CLI']) {
  test(`FIX-QG-01 AG-09/10: ${caller} rejects A→B replacement at lock with zero mutations`, async () => {
    const f = await setup();
    try {
      const env = await swapAtLock(f);
      const before = await snapshot(f);
      const r = caller === 'adapter'
        ? run(f, [], { ...env, ACTION: 'merge', PLAN: f.planPath, CONFIRM_PUSH: f.token, RELEASE: '1', CONFIRM_RELEASE: 'old-token' }, ADAPTER)
        : run(f, ['merge', '--plan', f.planPath, '--plan-token', f.token], env);
      assert.equal(r.code, 3, JSON.stringify(r));
      assert.equal(r.json.error, 'plan_approval_mismatch');
      assert.equal(r.json.release_pending, undefined);
      assert.equal(r.json.releasePreview, undefined);
      assert.deepEqual(await snapshot(f), before);
      assert.equal(await fs.readFile(f.planPath, 'utf8'), await fs.readFile(f.replacement, 'utf8'));
    } finally { await cleanup(f); }
  });
}

test('FIX-QG-01 AG-09/10: CLI malformed/duplicate/mismatched tokens fail closed, including dry-run/resume', async () => {
  const f = await setup();
  try {
    const before = await snapshot(f);
    const cases = [
      ['--plan-token'], ['--plan-token', ''], ['--plan-token', 'yes'],
      ['--plan-token', 'f'.repeat(64)], ['--plan-token', f.token, '--plan-token', f.token],
      [`--plan-token=${f.token}`], ['--plan-token', f.token, '--resume', '--change', 'approval-race'],
      ['--plan-token', 'f'.repeat(64), '--dry-run']
    ];
    for (const args of cases) {
      const r = run(f, ['merge', '--plan', f.planPath, ...args]);
      assert.equal(r.code, 3, JSON.stringify({ args, r }));
      assert.match(r.json.error, /^(invalid_plan_token|plan_approval_mismatch|plan_token_not_allowed_with_resume)$/);
      assert.deepEqual(await snapshot(f), before);
    }
    // A matching approval does not bypass content preflight.
    await makeDirty(f.services.backend.clonePath, { 'selected.txt': 'changed after approval' });
    const stale = await snapshot(f);
    const r = run(f, ['merge', '--plan', f.planPath, '--plan-token', f.token]);
    assert.equal(r.code, 3, JSON.stringify(r));
    assert.ok(r.json.blockers.some(b => b.blocker === 'plan_stale'));
    assert.deepEqual(await snapshot(f), stale);
  } finally { await cleanup(f); }
});

test('FIX-QG-01 AG-09/11: approved CLI plan dry-run is read-only and merge executes exactly A, never release', async () => {
  const f = await setup();
  try {
    const args = ['merge', '--plan', f.planPath, '--plan-token', f.token];
    const before = await snapshot(f);
    const preview = run(f, [...args, '--dry-run']);
    assert.equal(preview.code, 0, JSON.stringify(preview));
    assert.deepEqual(await snapshot(f), before);
    const release = git(f.services.backend.barePath, 'rev-parse', 'release');
    const r = run(f, args);
    assert.equal(r.code, 0, JSON.stringify(r));
    assert.equal(r.json.mergeState.planToken, f.token);
    assert.equal(r.json.mergeState.phase, 'phase2-complete');
    assert.equal(git(f.services.backend.barePath, 'log', '-1', '--format=%s', 'feature/approval-race').trim(), 'Approved subject A');
    assert.equal(git(f.services.backend.barePath, 'rev-parse', 'release'), release);
  } finally { await cleanup(f); }
});
