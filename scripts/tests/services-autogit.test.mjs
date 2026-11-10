/** AG-01/02/09/10: exact Make -> Node -> shipctl inputs and offline gates. */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { digest } from '../ship/plan.mjs';
import { createTempDir, createMonorepoFixture, cleanup, makeDirty,
  captureMonorepoSnapshot, guardNonLocalRemote } from './helpers/fixture.mjs';

const ROOT = process.cwd();
const BASE = path.resolve('.qa/add-safe-services-autogit/OPS-3/fixtures');
const MAKEFILE = path.join(ROOT, 'Makefile');
for (const key of ['GIT_DIR', 'GIT_COMMON_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_CONFIG_PARAMETERS']) delete process.env[key];
Object.assign(process.env, { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_COUNT: '0', GIT_TERMINAL_PROMPT: '0' });

const complete = { ok: true, mergeState: { phase: 'phase2-complete', repos: [{ name: 'backend', stage: 'pushed' }] } };
async function setup() {
  const root = await createTempDir('adapter-', BASE);
  await fs.mkdir(path.join(root, 'scripts'));
  await fs.copyFile(path.join(ROOT, 'scripts/services-autogit'), path.join(root, 'scripts/services-autogit'));
  await fs.writeFile(path.join(root, 'scripts/shipctl'), `import fs from 'node:fs';
const args = process.argv.slice(2);
fs.appendFileSync(process.env.SPY_LOG, JSON.stringify(args) + '\\n');
const model = JSON.parse(process.env.SPY_RESULTS || '{}')[args[0]] || {code: 0, payload: {ok: true, args}};
process.stdout.write(JSON.stringify(model.payload));
process.exitCode = model.code;
`);
  const plan = { version: 2, change: 'task-108', branchName: 'bugs/literal', repos: {} };
  plan.PLAN_TOKEN = digest(plan);
  const planPath = path.join(root, 'plan with spaces.json');
  await fs.writeFile(planPath, JSON.stringify(plan));
  return { root, plan, planPath };
}
function run(fixture, inputs = {}, options = {}) {
  // A Make command-line variable uses $$ for literal $. No shell involved.
  const argv = ['--no-print-directory', '-f', MAKEFILE, 'services-autogit',
    ...Object.entries(inputs).map(([key, value]) => `${key}=${value.replaceAll('$', () => '$$')}`)];
  const env = { ...process.env, ACTION: '', CHANGE: '', BRANCH: '', MESSAGE: '', PATHS_FILE: '', PLAN: '',
    RELEASE: '', REPOS: '', CONFIRM_PUSH: '', CONFIRM_RELEASE: '',
    SPY_LOG: path.join(fixture.root, 'calls.jsonl'), SPY_RESULTS: JSON.stringify(options.results || {}),
    SHIPCTL_ROOT: fixture.root, SHIPCTL_TEST_SKIP_SYNC: 'true', ...options.env };
  const child = options.direct
    ? spawnSync(process.execPath, [path.join(fixture.root, 'scripts/services-autogit'), ...(options.args || [])], { cwd: fixture.root, env: { ...env, ...inputs }, encoding: 'utf8' })
    : spawnSync('make', argv, { cwd: fixture.root, env, encoding: 'utf8' });
  let json;
  try { json = JSON.parse(child.stdout); } catch { assert.fail(JSON.stringify(child)); }
  return { ...child, json };
}
async function calls(fixture) {
  try { return (await fs.readFile(path.join(fixture.root, 'calls.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
const valid = { CHANGE: 'task-108', BRANCH: 'feature/seo-improve', MESSAGE: 'Улучшено SEO', PATHS_FILE: '.qa/task-108/paths file.txt' };

describe('AG-01/02 — Make raw inputs и read-only default', () => {
  it('передаёт точные argv, включая quotes/dollar/Make/shell expressions без исполнения', async () => {
    const f = await setup();
    try {
      const messages = ['Улучшено SEO', `Кавычки "double" 'single'; $HOME & | >`,
        '$(shell touch PWNED)', '`touch PWNED` $(touch PWNED)', 'Цена $5 $$ точная', '$(MESSAGE) ${HOME} # end'];
      for (const MESSAGE of messages) {
        const result = run(f, { ...valid, MESSAGE });
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(result.json.args, ['plan', '--change', valid.CHANGE, '--branch', valid.BRANCH,
          '--message', MESSAGE, '--paths-file', valid.PATHS_FILE]);
      }
      assert.equal(await fs.stat(path.join(f.root, 'PWNED')).catch(() => null), null);
      assert.ok((await calls(f)).every(argv => argv[0] === 'plan'));
    } finally { await cleanup(f.root); }
  });
  it('сохраняет raw single-dollar Make expression и literal environment inputs', async () => {
    const f = await setup();
    try {
      const envResult = run(f, {}, { env: { ...valid, MESSAGE: '$(shell touch PWNED) $$ $HOME' } });
      assert.equal(envResult.json.args[6], '$(shell touch PWNED) $$ $HOME');
      // Even an unescaped Make function is captured with value, never evaluated.
      const result = spawnSync('make', ['--no-print-directory', '-f', MAKEFILE, 'services-autogit', ...Object.entries(valid).map(([k, v]) => `${k}=${v}`), 'MESSAGE=$(shell touch PWNED)'], {
        cwd: f.root, env: { ...process.env, SPY_LOG: path.join(f.root, 'calls.jsonl') }, encoding: 'utf8'
      });
      assert.equal(JSON.parse(result.stdout).args[6], '$(shell touch PWNED)');
      assert.equal(await fs.stat(path.join(f.root, 'PWNED')).catch(() => null), null);
    } finally { await cleanup(f.root); }
  });
  it('отклоняет invalid inputs до child tooling, direct exit 3 / Make exit 2', async () => {
    const f = await setup();
    try {
      const cases = [{ ACTION: 'deploy' }, { RELEASE: 'yes' }, { MESSAGE: 'line\nbreak' }, { BRANCH: 'bad\rref' },
        { MESSAGE: '😀'.repeat(73) }, ...['CHANGE', 'BRANCH', 'MESSAGE', 'PATHS_FILE'].map(key => ({ [key]: '  ' }))];
      for (const invalid of cases) {
        const result = run(f, { ...valid, ...invalid });
        assert.equal(result.status, 2, JSON.stringify(result));
        assert.equal(result.json.adapter_exit_code, 3);
      }
      const invalid = run(f, {}, { direct: true, args: ['--release'] });
      assert.equal(invalid.status, 3);
      assert.deepEqual(await calls(f), []);
    } finally { await cleanup(f.root); }
  });
  it('help содержит примеры, два gate и guidance; child не вызывается', async () => {
    const f = await setup();
    try {
      const result = run(f, {}, { direct: true, args: ['--help'] });
      assert.equal(result.status, 0);
      for (const text of ['-b/-m', '$$', 'PATHS_FILE', 'Whole-file', 'Foreign', 'секрет', 'CONFIRM_PUSH', 'CONFIRM_RELEASE', 'deploy', '--resume', 'phase1', 'REPOS', 'adapter_exit_code']) assert.ok(result.json.help.includes(text), text);
      assert.deepEqual(await calls(f), []);
    } finally { await cleanup(f.root); }
  });
});

describe('AG-09/10 — отдельные token-bound gates, fail-stop', () => {
  it('missing/yes/wrong/stale approval не запускает merge', async () => {
    const f = await setup();
    try {
      for (const CONFIRM_PUSH of ['', 'yes', 'f'.repeat(64)]) {
        assert.equal(run(f, { ACTION: 'merge', PLAN: f.planPath, CONFIRM_PUSH }).json.adapter_exit_code, 3);
      }
      await fs.writeFile(f.planPath, JSON.stringify({ ...f.plan, branchName: 'feature/changed' }));
      assert.equal(run(f, { ACTION: 'merge', PLAN: f.planPath, CONFIRM_PUSH: f.plan.PLAN_TOKEN }).json.error, 'plan_stale');
      assert.deepEqual(await calls(f), []);
    } finally { await cleanup(f.root); }
  });
  it('RELEASE=1 делает только merge + read-only release preview, игнорируя старое deploy approval', async () => {
    const f = await setup();
    try {
      const result = run(f, { ACTION: 'merge', PLAN: f.planPath, CONFIRM_PUSH: f.plan.PLAN_TOKEN, RELEASE: '1', REPOS: 'backend', CONFIRM_RELEASE: 'old-token' }, {
        results: { merge: { code: 0, payload: complete }, release: { code: 0, payload: { ok: true, RELEASE_TOKEN: 'new-preview' } } }
      });
      assert.equal(result.status, 0);
      assert.equal(result.json.release_pending, true);
      assert.equal(result.json.releasePreview.RELEASE_TOKEN, 'new-preview');
      assert.deepEqual(await calls(f), [['merge', '--plan', f.planPath, '--plan-token', f.plan.PLAN_TOKEN], ['release', '--change', f.plan.change, '--dry-run', '--repos', 'backend']]);
    } finally { await cleanup(f.root); }
  });
  it('default RELEASE=0 не делает preview; partial/failure не повторяет команды и не релизит', async () => {
    for (const model of [{ code: 0, payload: complete }, ...[1, 2, 3].map(code => ({ code, payload: { ok: false, mergeState: { phase: 'phase2', repos: [{ stage: 'failed' }] }, resumeCommand: 'manual' } })),
      { code: 0, payload: { ok: true, mergeState: { phase: 'phase2', repos: [{ stage: 'merged' }] } } }]) {
      const f = await setup();
      try {
        const result = run(f, { ACTION: 'merge', PLAN: f.planPath, CONFIRM_PUSH: f.plan.PLAN_TOKEN, RELEASE: model.payload === complete ? '0' : '1' }, { results: { merge: model } });
        assert.equal(result.json.adapter_exit_code, model.code);
        assert.equal(result.json.release_pending, undefined);
        assert.deepEqual(await calls(f), [['merge', '--plan', f.planPath, '--plan-token', f.plan.PLAN_TOKEN]]);
      } finally { await cleanup(f.root); }
    }
  });
  it('release без approval — dry-run; отдельный token/subset передаётся ядру без auto-yes', async () => {
    const f = await setup();
    try {
      assert.equal(run(f, { ACTION: 'release', CHANGE: 'task-108', REPOS: 'backend,frontend' }).status, 0);
      const result = run(f, { ACTION: 'release', CHANGE: 'task-108', REPOS: 'backend', CONFIRM_RELEASE: 'wrong' }, {
        results: { release: { code: 3, payload: { ok: false, error: 'release_plan_stale' } } }
      });
      assert.equal(result.json.error, 'release_plan_stale');
      assert.deepEqual(await calls(f), [['release', '--change', 'task-108', '--repos', 'backend,frontend', '--dry-run'],
        ['release', '--change', 'task-108', '--repos', 'backend', '--release-token', 'wrong']]);
    } finally { await cleanup(f.root); }
  });
});

describe('AG-01/02/09/10 — настоящий offline Make → shipctl', () => {
  it('invalid ref и default plan read-only; полный merge → preview → stale token → отдельный release', async () => {
    const f = await createMonorepoFixture({ services: ['backend'], withRootOrigin: true, fixtureBase: BASE });
    try {
      for (const cwd of [f.root, f.services.backend.clonePath]) {
        for (const flags of [[], ['--push']]) {
          const result = spawnSync('git', ['remote', 'get-url', ...flags, '--all', 'origin'], { cwd, encoding: 'utf8' });
          assert.equal(result.status, 0);
          for (const url of result.stdout.trim().split('\n')) { guardNonLocalRemote(url); assert.ok(url.startsWith(f.baresRoot + '/')); }
        }
      }
      await fs.mkdir(path.join(f.root, 'scripts'));
      await fs.copyFile(path.join(ROOT, 'scripts/services-autogit'), path.join(f.root, 'scripts/services-autogit'));
      await fs.symlink(path.join(ROOT, 'scripts/shipctl'), path.join(f.root, 'scripts/shipctl'));
      await makeDirty(f.services.backend.clonePath, { 'file with spaces.txt': 'safe content' });
      const pathsFile = path.join(f.root, '.qa/paths.txt');
      await fs.mkdir(path.dirname(pathsFile), { recursive: true });
      await fs.writeFile(pathsFile, 'services/backend/file with spaces.txt\n');
      const before = await captureMonorepoSnapshot(f);
      const inputs = { ...valid, PATHS_FILE: pathsFile, MESSAGE: `SEO '$5'`, BRANCH: 'bugs/seo-improve' };
      assert.equal(run(f, { ...inputs, BRANCH: 'main' }).json.adapter_exit_code, 3);
      const plan = run(f, inputs);
      assert.equal(plan.status, 0, JSON.stringify(plan));
      assert.equal(plan.json.commitMessage.subject, inputs.MESSAGE);
      assert.deepEqual(await captureMonorepoSnapshot(f), before);
      const PLAN = path.join(f.root, '.qa/ship/task-108/plan.json');
      assert.equal(run(f, { ACTION: 'merge', PLAN, CONFIRM_PUSH: 'yes' }).json.adapter_exit_code, 3);
      assert.deepEqual(await captureMonorepoSnapshot(f), before);
      const merged = run(f, { ACTION: 'merge', PLAN, CONFIRM_PUSH: plan.json.PLAN_TOKEN, RELEASE: '1' });
      assert.equal(merged.status, 0, JSON.stringify(merged));
      assert.equal(merged.json.release_pending, true);
      const preview = merged.json.releasePreview;
      assert.match(preview.RELEASE_TOKEN, /^[a-f0-9]{64}$/);
      const remote = () => spawnSync('git', ['ls-remote', f.services.backend.barePath, 'refs/heads/release'], { encoding: 'utf8' }).stdout;
      const releaseBefore = remote();
      const snapshots = await captureMonorepoSnapshot(f);
      const noToken = run(f, { ACTION: 'release', CHANGE: 'task-108' });
      assert.equal(noToken.json.RELEASE_TOKEN, preview.RELEASE_TOKEN);
      const wrong = run(f, { ACTION: 'release', CHANGE: 'task-108', CONFIRM_RELEASE: 'a'.repeat(64) });
      assert.equal(wrong.json.error, 'release_plan_stale');
      const subset = run(f, { ACTION: 'release', CHANGE: 'task-108', REPOS: 'backend', CONFIRM_RELEASE: preview.RELEASE_TOKEN });
      assert.equal(subset.json.error, 'release_plan_stale');
      assert.deepEqual(await captureMonorepoSnapshot(f), snapshots);
      assert.equal(remote(), releaseBefore);
      const released = run(f, { ACTION: 'release', CHANGE: 'task-108', CONFIRM_RELEASE: preview.RELEASE_TOKEN });
      assert.equal(released.status, 0, JSON.stringify(released));
      assert.notEqual(remote(), releaseBefore);
      assert.equal(spawnSync('git', ['branch', '--show-current'], { cwd: f.services.backend.clonePath, encoding: 'utf8' }).stdout.trim(), 'main');
    } finally { await cleanup(f); }
  });
});
