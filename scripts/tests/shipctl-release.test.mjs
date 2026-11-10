/** Release preview/gate regression: AG-09/10 and release side of AG-11/12. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createMonorepoFixture, cleanup, createCommit, gitInRepo,
  captureMonorepoSnapshot, guardNonLocalRemote } from './helpers/fixture.mjs';

for (const key of ['GIT_DIR', 'GIT_COMMON_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_CONFIG_PARAMETERS']) delete process.env[key];
Object.assign(process.env, { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_COUNT: '0', GIT_TERMINAL_PROMPT: '0' });
const BASE = join(process.cwd(), '.qa/add-safe-services-autogit/OPS-2c/fixtures');
const SHIPCTL = join(process.cwd(), 'scripts/shipctl');
const CHANGE = 'release-test';
const statePath = f => join(f.root, '.qa/ship', CHANGE, 'merge-state.json');
function run(f, ...args) {
  assert.ok(f.root.startsWith(BASE + '/'));
  for (const svc of Object.values(f.services)) {
    for (const flags of [[], ['--push']]) {
      const url = git(svc.clonePath, 'remote', 'get-url', ...flags, 'origin');
      guardNonLocalRemote(url);
      assert.ok(url.startsWith(f.baresRoot + '/'));
    }
  }
  const r = spawnSync('node', [SHIPCTL, 'release', ...args], {
    cwd: f.root, encoding: 'utf8', env: { ...process.env, SHIPCTL_ROOT: f.root }
  });
  return { code: r.status, payload: JSON.parse(r.stdout || '{}'), stderr: r.stderr };
}
function git(p, ...args) {
  if (args[0] === 'push') guardNonLocalRemote(git(p, 'remote', 'get-url', '--push', 'origin'));
  const r = gitInRepo(p, ...args);
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
async function fixture(services = ['backend', 'frontend']) {
  const f = await createMonorepoFixture({ services, withRootOrigin: true, fixtureBase: BASE });
  await mkdir(join(f.root, '.qa/ship', CHANGE), { recursive: true });
  f.state = { phase: 'phase2-complete', change: CHANGE, branchName: 'feature/release-test', repos: [] };
  for (const name of [...services, '.']) {
    const p = name === '.' ? f.root : f.services[name].clonePath;
    if (name !== '.') {
      await createCommit(p, 'main', 'Merged change', { 'selected.txt': name });
      git(p, 'push', 'origin', 'main');
    }
    f.state.repos.push({ name, stage: 'pushed', pushedSha: git(p, 'rev-parse', 'HEAD') });
  }
  await save(f);
  return f;
}
const save = f => writeFile(statePath(f), JSON.stringify(f.state));
const preview = (f, ...args) => run(f, '--change', CHANGE, '--dry-run', ...args);
async function snapshot(f) {
  const clones = await captureMonorepoSnapshot(f);
  const remotes = { root: git(join(f.baresRoot, 'root.git'), 'show-ref') };
  for (const [name, svc] of Object.entries(f.services)) remotes[name] = git(svc.barePath, 'show-ref');
  return { clones, remotes };
}

test('AG-09/10: deterministic read-only preview, no-token stop, root not-applicable', async () => {
  const f = await fixture();
  try {
    await writeFile(join(f.services.backend.clonePath, 'foreign.txt'), 'foreign');
    const before = await snapshot(f);
    const r = preview(f);
    assert.equal(r.code, 0, JSON.stringify(r));
    assert.match(r.payload.RELEASE_TOKEN, /^[a-f0-9]{64}$/);
    assert.equal(r.payload.plan.find(r => r.repo === '.').status, 'not-applicable');
    assert.equal(r.payload.plan.find(r => r.repo === 'backend').status, 'ff');
    assert.equal(preview(f).payload.RELEASE_TOKEN, r.payload.RELEASE_TOKEN);
    assert.deepEqual(await snapshot(f), before);
    const noToken = run(f, '--change', CHANGE);
    assert.equal(noToken.code, 0);
    assert.equal(noToken.payload.release_pending, true);
    assert.deepEqual(await snapshot(f), before);
  } finally { await cleanup(f); }
});

test('UT-REL-02/03: token permits ff without checkout; repeat is noop', async () => {
  const f = await fixture();
  try {
    const p = f.services.backend.clonePath;
    await writeFile(join(p, 'foreign.txt'), 'foreign');
    const before = (await snapshot(f)).clones;
    const r = run(f, '--change', CHANGE, '--release-token', preview(f).payload.RELEASE_TOKEN);
    assert.equal(r.code, 0, JSON.stringify(r));
    assert.equal(r.payload.repos.find(r => r.repo === 'backend').status, 'pushed');
    const after = (await snapshot(f)).clones;
    for (const name of Object.keys(before)) {
      const { refs: _old, ...oldTree } = before[name];
      const { refs: _new, ...newTree } = after[name];
      assert.deepEqual(newTree, oldTree);
    }
    assert.equal(git(f.services.backend.barePath, 'rev-parse', 'release'), f.state.repos[0].pushedSha);
    assert.notEqual(gitInRepo(p, 'show-ref', '--verify', 'refs/heads/release').status, 0);
    assert.equal(await readFile(join(p, 'foreign.txt'), 'utf8'), 'foreign');
    const next = preview(f);
    assert.equal(next.payload.plan.find(r => r.repo === 'backend').status, 'noop');
    const noopBefore = await snapshot(f);
    assert.equal(run(f, '--change', CHANGE, '--release-token', next.payload.RELEASE_TOKEN).code, 0);
    assert.deepEqual(await snapshot(f), noopBefore);
    const persisted = JSON.parse(await readFile(join(f.root, '.qa/ship', CHANGE, 'release-state.json'), 'utf8'));
    assert.equal(persisted.repos.find(r => r.repo === 'backend').status, 'noop');
  } finally { await cleanup(f); }
});

test('AG-10: wrong token, changed subset, state bytes, origin or release SHA cannot mutate', async () => {
  const f = await fixture();
  try {
    const token = preview(f).payload.RELEASE_TOKEN;
    assert.notEqual(preview(f, '--repos', 'backend').payload.RELEASE_TOKEN, token);
    for (const args of [ ['--release-token', 'bad'], ['--release-token', token, '--repos', 'backend'] ]) {
      const before = await snapshot(f);
      assert.equal(run(f, '--change', CHANGE, ...args).code, 3);
      assert.deepEqual(await snapshot(f), before);
    }
    f.state.branchName = 'feature/changed-state';
    await save(f);
    assert.notEqual(preview(f).payload.RELEASE_TOKEN, token);
    assert.equal(run(f, '--change', CHANGE, '--release-token', token).code, 3);
    const token2 = preview(f).payload.RELEASE_TOKEN;
    git(f.services.backend.barePath, 'update-ref', 'refs/heads/release', f.state.repos[0].pushedSha);
    let before = await snapshot(f);
    assert.notEqual(preview(f).payload.RELEASE_TOKEN, token2);
    assert.equal(run(f, '--change', CHANGE, '--release-token', token2).code, 3);
    assert.deepEqual(await snapshot(f), before);
    const token3 = preview(f).payload.RELEASE_TOKEN;
    const replacement = join(f.baresRoot, 'replacement.git');
    git(f.root, 'clone', '--bare', f.services.backend.barePath, replacement);
    git(f.services.backend.clonePath, 'remote', 'set-url', 'origin', replacement);
    before = await snapshot(f);
    assert.notEqual(preview(f).payload.RELEASE_TOKEN, token3);
    assert.equal(run(f, '--change', CHANGE, '--release-token', token3).code, 3);
    assert.deepEqual(await snapshot(f), before);
  } finally { await cleanup(f); }
});

test('UT-REL-01/05: subset/no-release/stateless preview; strict args', async () => {
  const f = await fixture();
  try {
    git(f.services.backend.barePath, 'update-ref', '-d', 'refs/heads/release');
    const r = preview(f, '--repos', 'backend,root');
    assert.equal(r.code, 0);
    assert.equal(r.payload.plan.find(r => r.repo === 'backend').status, 'no-release-branch');
    assert.equal(r.payload.plan.find(r => r.repo === 'frontend').status, 'skipped');
    const before = await snapshot(f);
    const stateless = run(f, '--dry-run', '--repos', 'backend,frontend,root');
    assert.equal(stateless.code, 0);
    assert.equal(stateless.payload.RELEASE_TOKEN, undefined);
    assert.deepEqual(await snapshot(f), before);
    assert.equal(preview(f, '--repos', '../outside').code, 3);
    assert.equal(preview(f, '--unknown').code, 3);
  } finally { await cleanup(f); }
});

test('AG-12: partial merge never gets token even for pushed subset', async () => {
  const f = await fixture();
  try {
    f.state.phase = 'phase2-partial';
    f.state.repos[1].stage = 'failed';
    await save(f);
    const before = await snapshot(f);
    const r = preview(f, '--repos', 'backend');
    assert.equal(r.code, 3);
    assert.equal(r.payload.RELEASE_TOKEN, undefined);
    assert.deepEqual(await snapshot(f), before);
  } finally { await cleanup(f); }
});

test('UT-REL-04/06: divergence, remote main movement and failed probes fail closed', async () => {
  const f = await fixture();
  try {
    const p = f.services.backend.clonePath;
    await createCommit(p, 'main', 'Remote advance', { 'later.txt': 'later' });
    git(p, 'push', 'origin', 'HEAD:refs/heads/release');
    let before = await snapshot(f);
    let r = preview(f);
    assert.equal(r.code, 3);
    assert.ok(r.payload.blockers.some(b => b.blocker === 'release_diverged'));
    assert.equal(r.payload.RELEASE_TOKEN, undefined);
    assert.deepEqual(await snapshot(f), before);
    git(p, 'push', 'origin', 'main');
    r = preview(f);
    assert.ok(r.payload.blockers.some(b => b.blocker === 'main_moved'));
    f.state.repos[0].pushedSha = git(p, 'rev-parse', 'HEAD');
    await save(f);
    git(p, 'remote', 'set-url', 'origin', join(f.baresRoot, 'missing.git'));
    before = await snapshot(f);
    r = preview(f);
    assert.equal(r.code, 3);
    assert.ok(r.payload.blockers.some(b => b.blocker === 'remote_probe_failed'));
    assert.deepEqual(await snapshot(f), before);
  } finally { await cleanup(f); }
});

test('AG-12: rejecting hook preserves durable pushed/failed/untouched table, no auto retry', async () => {
  const f = await fixture(['backend', 'frontend', 'worker']);
  try {
    const hook = join(f.services.frontend.barePath, 'hooks/pre-receive');
    await writeFile(hook, '#!/bin/sh\nexit 1\n');
    await chmod(hook, 0o755);
    const r = run(f, '--change', CHANGE, '--release-token', preview(f).payload.RELEASE_TOKEN);
    assert.equal(r.code, 1, JSON.stringify(r));
    assert.equal(r.payload.repos[0].status, 'pushed');
    assert.equal(r.payload.repos[1].status, 'push_failed');
    assert.equal(r.payload.repos[2].status, 'untouched');
    assert.notEqual(git(f.services.worker.barePath, 'rev-parse', 'release'), f.state.repos[2].pushedSha);
    const disk = JSON.parse(await readFile(join(f.root, '.qa/ship', CHANGE, 'release-state.json'), 'utf8'));
    assert.equal(disk.stopped, true);
    assert.deepEqual(disk.repos, r.payload.repos);
    assert.equal(git(f.services.backend.barePath, 'rev-parse', 'release'), f.state.repos[0].pushedSha);
    assert.notEqual(git(f.services.frontend.barePath, 'rev-parse', 'release'), f.state.repos[1].pushedSha);
    const before = await snapshot(f);
    assert.equal(run(f, '--change', CHANGE).payload.release_pending, true);
    assert.deepEqual(await snapshot(f), before);
  } finally { await cleanup(f); }
});

test('AG-11: normalize legacy root/mainSha; reject duplicate root and conflicting SHA', async () => {
  const f = await fixture();
  try {
    f.state.repos[2].name = 'root';
    for (const r of f.state.repos) { r.mainSha = r.pushedSha; delete r.pushedSha; }
    await save(f);
    assert.equal(preview(f).payload.plan.find(r => r.repo === '.').status, 'not-applicable');
    f.state.repos.push({ ...f.state.repos[2], name: '.' });
    await save(f);
    assert.equal(preview(f).code, 3);
    f.state.repos.pop();
    f.state.repos[0].pushedSha = '0'.repeat(40);
    await save(f);
    assert.equal(preview(f).code, 3);
  } finally { await cleanup(f); }
});

test('AG-09: token execution takes existing lock; preview remains read-only under lock', async () => {
  const f = await fixture();
  try {
    const token = preview(f).payload.RELEASE_TOKEN;
    const before = await snapshot(f);
    const locked = args => spawnSync('flock', ['-n', join(f.root, '.qa/ship/shipctl.lock'),
      'node', SHIPCTL, 'release', '--change', CHANGE, ...args], {
      encoding: 'utf8', env: { ...process.env, SHIPCTL_ROOT: f.root }
    });
    const attempt = locked(['--release-token', token]);
    assert.equal(attempt.status, 2, attempt.stdout + attempt.stderr);
    assert.match(JSON.parse(attempt.stdout).error, /Lock is held/);
    const readOnly = locked(['--dry-run']);
    assert.equal(readOnly.status, 0);
    assert.equal(JSON.parse(readOnly.stdout).RELEASE_TOKEN, token);
    assert.deepEqual(await snapshot(f), before);
  } finally { await cleanup(f); }
});
