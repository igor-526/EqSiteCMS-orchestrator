import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, runManifest, subprocessJson, prerequisites } from '../qa/contracts/run.mjs';
import { validateManifest, validateResponse } from '../qa/contracts/schema.mjs';

const SENTINEL = 'WIRE_PRIVACY_SENTINEL_do_not_export';
import * as evidenceFs from 'node:fs';
import * as evidencePath from 'node:path';
import { fileURLToPath as evidenceFilePath } from 'node:url';

// QA_EVIDENCE_ROOT contract: validated lane root + exclusive per-suite child.
function suiteEvidence(defaultDir, suite, root) {
  const raw = process.env.QA_EVIDENCE_ROOT;
  if (raw === undefined) return evidencePath.resolve(defaultDir);
  const invalid = () => { throw new Error('Invalid or colliding QA_EVIDENCE_ROOT'); };
  if (!raw || raw.includes('\\') || raw.split('/').some(p => p === '.' || p === '..')) invalid();
  const base = evidencePath.join(root, '.qa/harden-agent-verification-pipeline');
  const target = evidencePath.resolve(root, raw);
  if (!target.startsWith(base + evidencePath.sep)) invalid();
  const parts = evidencePath.relative(root, target).split(evidencePath.sep);
  if (parts.some(p => !/^[a-zA-Z0-9_.-]+$/.test(p))) invalid();
  let current = root;
  for (const part of parts) {
    current = evidencePath.join(current, part);
    try { evidenceFs.mkdirSync(current); } catch (e) { if (e.code !== 'EEXIST') invalid(); }
    const st = evidenceFs.lstatSync(current);
    if (st.isSymbolicLink() || !st.isDirectory()) invalid();
  }
  const child = evidencePath.join(target, suite);
  try { evidenceFs.mkdirSync(child); } catch { invalid(); }
  return child;
}
// End QA_EVIDENCE_ROOT contract.
const EVIDENCE = suiteEvidence(path.join(ROOT, '.qa/harden-agent-verification-pipeline/WIRE-1/tests'), 'qa-contracts', evidenceFilePath(new URL('../../', import.meta.url)));
const observation = (accepted = true, nats = false) => ({ accepted, storageEffects: nats && accepted ? 1 : 0, disposition: nats ? (accepted ? 'ack' : 'term') : (accepted ? 'accepted' : 'rejected') });
function manifest(cases = ['valid'], nats = false) {
  return { schemaVersion: 1, mode: 'synthetic', adapterId: nats ? 'synthetic-nats' : 'synthetic-http', producer: { repo: '.', python: 'python3' }, consumer: { repo: '.', python: 'python3' }, timeoutMs: 2000, scenarios: cases.map(c => ({ id: c, case: c, expected: observation(!['date-timestamp', 'date-invalid', 'missing-header', 'wrong-header', 'identity-mismatch', 'timestamp-invalid', 'timestamp-naive'].includes(c), nats) })) };
}
const ids = m => m.scenarios.map(s => s.id);

for (const [name, mutate] of [
  ['shell', m => { m.command = `echo ${SENTINEL}`; }],
  ['adapter', m => { m.adapterId = SENTINEL; }],
  ['path traversal', m => { m.producer.repo = '../'; }],
  ['arbitrary interpreter', m => { m.consumer.python = '/bin/sh'; }],
  ['unknown field', m => { m.scenarios[0].payload = SENTINEL; }],
  ['empty scenarios', m => { m.scenarios = []; }],
  ['duplicate scenario', m => { m.scenarios.push(m.scenarios[0]); }],
  ['timeout budget', m => { m.timeoutMs = 120001; }],
  ['nonfinite', m => { m.maxBytes = NaN; }],
  ['mock acceptance', m => { m.mode = 'acceptance'; }],
]) test(`schema rejects ${name}`, () => {
  const m = manifest(); mutate(m);
  assert.throws(() => validateManifest(m, ['valid']));
});
for (const selection of [[], ['unknown'], ['valid', 'valid'], ['../bad']]) test(`selection rejects ${JSON.stringify(selection)}`, () => {
  assert.throws(() => validateManifest(manifest(), selection));
});

test('WIRE-01 synthetic HTTP serialize→parse patterns and isolated core modules', async () => {
  const m = manifest(['valid', 'date-timestamp', 'date-invalid', 'detail-null', 'detail-false', 'detail-zero', 'import-collision', 'privacy']);
  const r = await runManifest(m, ids(m));
  assert.equal(r.status, 'passed');
  assert.equal(r.evidenceClass, 'synthetic-harness-only');
  assert.equal(r.expected, 8); assert.equal(r.completed, 8);
  assert.ok(!JSON.stringify(r).includes(SENTINEL));
});
test('WIRE-02 bytes+headers→capture rejects invalid envelope before storage', async () => {
  const m = manifest(['valid', 'missing-header', 'wrong-header', 'identity-mismatch', 'timestamp-invalid', 'timestamp-naive'], true);
  const r = await runManifest(m, ids(m));
  assert.equal(r.status, 'passed'); assert.equal(r.passed, 6);
});
for (const [c, reason] of [
  ['timeout', 'subprocess-timeout'], ['oversize', 'output-too-large'], ['invalid-output', 'invalid-output'],
  ['crash', 'adapter-process-failed'], ['missing-dependency', 'adapter-process-failed'],
  ['skip', 'adapter-failed-or-skipped'], ['missing-scenario', 'adapter-failed-or-skipped'],
]) test(`fail closed and private: ${c}`, async () => {
  const m = manifest([c]);
  if (c === 'timeout') m.timeoutMs = 100;
  if (c === 'oversize') m.maxBytes = 2048;
  const r = await runManifest(m, ids(m));
  assert.equal(r.status, 'failed'); assert.equal(r.results[0].reason, reason);
  assert.ok(!JSON.stringify(r).includes(SENTINEL));
});
test('completeness retains each failed and passed expected scenario', async () => {
  const m = manifest(['valid', 'skip', 'crash']);
  const r = await runManifest(m, ids(m));
  assert.deepEqual(r.results.map(r => r.scenarioId), ids(m));
  assert.equal(r.completed, 3); assert.equal(r.failed, 2); assert.equal(r.passed, 1);
});
test('wrong consumer observation fails rather than asserting invocation success', async () => {
  const m = manifest(); m.scenarios[0].expected.accepted = false;
  assert.equal((await runManifest(m, ids(m))).results[0].reason, 'observation-mismatch');
});
test('suite budget reports failures, never silently omits expected IDs', async () => {
  const m = manifest(['timeout', 'valid']); m.suiteTimeoutMs = 30;
  const r = await runManifest(m, ids(m));
  assert.equal(r.status, 'failed'); assert.equal(r.completed, 2); assert.equal(r.failed, 2);
});
test('production registry reserves separate peer interpreter paths', () => {
  for (const [adapterId, producer] of [['yandex-seo-http', 'yandex-service'], ['metrica-seo-nats', 'ya-metrica-service']]) {
    const m = manifest(); Object.assign(m, { adapterId, mode: 'acceptance', producer: { repo: `services/${producer}`, python: `services/${producer}/.venv/bin/python` }, consumer: { repo: 'services/seo-service', python: 'services/seo-service/.venv/bin/python' } });
    assert.equal(validateManifest(m, ids(m)).kind, 'production');
    assert.notEqual(m.producer.python, m.consumer.python);
  }
});
test('response schema rejects malformed transport, skipped and unknown output', () => {
  const base = { schemaVersion: 1, scenarioId: 'valid', status: 'passed' };
  for (const wire of [{ protocol: 'http', body: 'invalid' }, { protocol: 'http', body: '{}', secret: SENTINEL }]) assert.throws(() => validateResponse({ ...base, wire }, 'producer', 'valid', 'http'));
  for (const wire of [{ protocol: 'nats', dataBase64: '**', headers: {} }, { protocol: 'nats', dataBase64: 'e30=', headers: { 'Nats-Msg-Id': 1 } }]) assert.throws(() => validateResponse({ ...base, wire }, 'producer', 'valid', 'nats'));
  assert.throws(() => validateResponse({ ...base, observed: { accepted: true, storageEffects: 0, disposition: SENTINEL } }, 'consumer', 'valid', 'http'));
});
test('bounded bridge handles absent executable and invalid stdout without raw diagnostics', async () => {
  await assert.rejects(subprocessJson({ python: '/no/such/interpreter', args: [], cwd: ROOT, input: {}, timeoutMs: 1000, maxBytes: 1000 }), /missing-interpreter/);
});

test('CLI lifecycle/exit/privacy and safe persisted summary', async () => {
  await mkdir(EVIDENCE, { recursive: true });
  async function run(name, m, selection) {
    const file = path.join(EVIDENCE, `${name}.json`);
    await writeFile(file, JSON.stringify(m));
    const output = path.join(EVIDENCE, name);
    const r = spawnSync(process.execPath, ['scripts/qa/contracts/run.mjs', '--manifest', file, '--scenario-ids', selection, '--output-dir', output], { cwd: ROOT, encoding: 'utf8', timeout: 10000 });
    assert.ok(!`${r.stdout}${r.stderr}`.includes(SENTINEL));
    assert.equal(r.stderr, '');
    return { ...r, output, summary: JSON.parse(r.stdout) };
  }
  const pass = await run('pass', manifest(['privacy']), 'privacy'); assert.equal(pass.status, 0);
  assert.equal(JSON.parse(await readFile(path.join(pass.output, 'summary.json'), 'utf8')).status, 'passed');
  const fail = await run('fail', manifest(['crash']), 'crash'); assert.equal(fail.status, 1);
  assert.ok(!(await readFile(path.join(fail.output, 'summary.json'), 'utf8')).includes(SENTINEL));
  const invalid = manifest(); invalid.command = SENTINEL;
  assert.equal((await run('schema', invalid, 'valid')).status, 2);
  assert.equal((await run('empty', manifest(), '')).status, 2);
  const cli = spawnSync(process.execPath, ['scripts/qa/contracts/run.mjs', '--shell', SENTINEL], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(cli.status, 2); assert.ok(!cli.stdout.includes(SENTINEL));
});

test('missing peer/venv/lockfile/adapter fail preflight without running service code', async () => {
  const m = manifest(); Object.assign(m, { adapterId: 'yandex-seo-http', mode: 'acceptance', producer: { repo: 'services/yandex-service', python: 'services/yandex-service/.venv/bin/python' }, consumer: { repo: 'services/seo-service', python: 'services/seo-service/.venv/bin/python' } });
  const adapter = validateManifest(m, ids(m));
  for (const missing of ['/src', '/uv.lock', '/.venv/bin/python', '/test_yandex_lifecycle_contract.py']) {
    const fs = { realpath: async p => p, stat: async p => {
      if (p.endsWith(missing)) throw new Error(SENTINEL);
      return { isDirectory: () => true, isFile: () => true };
    } };
    await assert.rejects(prerequisites(m, adapter, fs), err => err.code === 'missing-peer-or-dependency' && !err.message.includes(SENTINEL));
  }
});
test('rejected result cannot bless storage effects', () => {
  const m = manifest(); m.scenarios[0].expected = { accepted: false, storageEffects: 1, disposition: 'term' };
  assert.throws(() => validateManifest(m, ids(m)), /storage-before-validation/);
});
test('unknown synthetic case does not fall through to success', async () => {
  const m = manifest(['unimplemented']);
  assert.equal((await runManifest(m, ids(m))).status, 'failed');
});
