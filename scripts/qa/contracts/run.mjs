#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContractError, requireThat, validateManifest, validateResponse } from './schema.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const BRIDGE = path.join(ROOT, 'scripts/qa/contracts/bridge.py');
const MAX_MANIFEST = 131072;

export function subprocessJson({ python, args, cwd, input, timeoutMs, maxBytes }) {
  return new Promise((resolve, reject) => {
    const child = spawn(python, args, { cwd, shell: false, detached: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, EQCMS_MONOREPO: '1' } });
    let output = [], bytes = 0, done = false;
    const kill = () => { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already exited */ } };
    const finish = (err, result) => {
      if (done) return;
      done = true; clearTimeout(timer); kill();
      if (err) reject(new ContractError(err)); else resolve(result);
    };
    const timer = setTimeout(() => finish('subprocess-timeout'), timeoutMs);
    child.on('error', () => finish('missing-interpreter'));
    child.stdin.on('error', () => {});
    child.stderr.on('data', chunk => { bytes += chunk.length; if (bytes > maxBytes) finish('output-too-large'); });
    child.stdout.on('data', chunk => { bytes += chunk.length; if (bytes > maxBytes) finish('output-too-large'); else output.push(chunk); });
    child.on('close', code => {
      if (done) return;
      if (code !== 0) return finish('adapter-process-failed');
      try { finish(null, JSON.parse(Buffer.concat(output).toString('utf8'))); }
      catch { finish('invalid-output'); }
    });
    const encoded = JSON.stringify(input);
    if (Buffer.byteLength(encoded) > maxBytes) finish('input-too-large');
    else child.stdin.end(encoded);
  });
}

export async function prerequisites(m, adapter, fs = { realpath, stat }) {
  for (const phase of ['producer', 'consumer']) {
    const repo = path.join(ROOT, m[phase].repo);
    try {
      requireThat((await fs.realpath(repo)) === repo, 'invalid-repo');
      if (adapter.kind === 'production') {
        requireThat((await fs.stat(path.join(repo, 'src'))).isDirectory(), 'missing-peer');
        requireThat((await fs.stat(path.join(repo, 'uv.lock'))).isFile(), 'missing-lockfile');
        requireThat((await fs.stat(path.join(ROOT, m[phase].python))).isFile(), 'missing-interpreter');
      }
      requireThat((await fs.stat(path.join(ROOT, adapter.module))).isFile(), 'missing-adapter');
    } catch (e) { throw new ContractError(e instanceof ContractError ? e.code : 'missing-peer-or-dependency'); }
  }
}
export async function runManifest(m, selected) {
  const adapter = validateManifest(m, selected);
  const results = [];
  const deadline = Date.now() + (m.suiteTimeoutMs ?? 900000);
  let prerequisiteError;
  try { await prerequisites(m, adapter); } catch (e) { prerequisiteError = e.code; }
  for (const id of selected) {
    const scenario = m.scenarios.find(s => s.id === id);
    try {
      if (prerequisiteError) throw new ContractError(prerequisiteError);
      let wire;
      for (const phase of ['producer', 'consumer']) {
        requireThat(Date.now() < deadline, 'suite-timeout');
        const repo = path.join(ROOT, m[phase].repo);
        const response = await subprocessJson({
          python: adapter.kind === 'synthetic' ? 'python3' : path.join(ROOT, m[phase].python),
          args: ['-I', '-B', BRIDGE, path.join(ROOT, adapter.module), adapter.callable, repo, phase], cwd: repo,
          input: { schemaVersion: 1, phase, scenarioId: id, case: scenario.case, protocol: adapter.protocol, ...(phase === 'consumer' ? { wire } : {}) },
          timeoutMs: Math.min(m.timeoutMs ?? 15000, Math.max(1, deadline - Date.now())), maxBytes: m.maxBytes ?? 262144,
        });
        validateResponse(response, phase, id, adapter.protocol);
        if (phase === 'producer') wire = response.wire;
        else requireThat(Object.keys(scenario.expected).every(k => response.observed[k] === scenario.expected[k]), 'observation-mismatch');
      }
      results.push({ scenarioId: id, status: 'passed' });
    } catch (e) {
      results.push({ scenarioId: id, status: 'failed', reason: e instanceof ContractError ? e.code : 'runner-error' });
    }
  }
  const passed = results.filter(r => r.status === 'passed').length;
  return { schemaVersion: 1, status: passed === selected.length ? 'passed' : 'failed', evidenceClass: adapter.kind === 'production' ? 'production-paired-wire' : 'synthetic-harness-only', expected: selected.length, completed: results.length, passed, failed: results.length - passed, results };
}
export async function main(argv) {
  try {
    const options = {};
    for (let i = 0; i < argv.length; i += 2) {
      requireThat(['--manifest', '--scenario-ids', '--output-dir'].includes(argv[i]) && argv[i + 1] && !Object.hasOwn(options, argv[i]), 'invalid-cli');
      options[argv[i]] = argv[i + 1];
    }
    requireThat(Object.keys(options).length === 3, 'invalid-cli');
    const outputDir = path.resolve(options['--output-dir']);
    const qa = path.join(ROOT, '.qa');
    requireThat(outputDir.startsWith(qa + path.sep), 'invalid-output-dir');
    await mkdir(outputDir, { recursive: true });
    requireThat((await realpath(outputDir)).startsWith(qa + path.sep), 'invalid-output-dir');
    requireThat((await stat(options['--manifest'])).size <= MAX_MANIFEST, 'manifest-too-large');
    let manifest;
    try { manifest = JSON.parse(await readFile(options['--manifest'], 'utf8')); } catch { throw new ContractError('invalid-manifest'); }
    const summary = await runManifest(manifest, options['--scenario-ids'].split(','));
    await writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'w' });
    console.log(JSON.stringify(summary));
    return summary.status === 'passed' ? 0 : 1;
  } catch (e) {
    console.log(JSON.stringify({ schemaVersion: 1, status: 'failed', reason: e instanceof ContractError ? e.code : 'runner-error' }));
    return 2;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
