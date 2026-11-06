#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSuite } from './browser/runner.mjs';
import { CheckError, fail } from './browser/schema.mjs';

export function parseArgs(argv) {
  const allowed = new Set(['scenarios', 'auth', 'output-dir', 'base-url', 'backend-url', 'viewports', 'service', 'mode', 'scenario-ids', 'timeout-ms', 'max-scenarios']);
  const values = {};
  for (let i = 0; i < argv.length; i++) {
    const match = argv[i].match(/^--([a-z-]+)(?:=(.*))?$/);
    if (!match || !allowed.has(match[1]) || values[match[1]] !== undefined) fail('invalid_cli');
    const value = match[2] ?? argv[++i];
    if (!value || value.startsWith('--')) fail('invalid_cli');
    values[match[1]] = value;
  }
  return values;
}
export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const definition = JSON.parse(await readFile(args.scenarios ?? '.qa/scenarios.json', 'utf8'));
  const options = {
    outputDir: args['output-dir'] ?? '.qa/browser-run',
    baseUrl: args['base-url'], backendUrl: args['backend-url'], service: args.service,
    mode: args.mode ?? 'qg', scenarioIds: args['scenario-ids'],
    viewports: args.viewports?.split(','),
    timeoutMs: args['timeout-ms'] === undefined ? 120000 : Number(args['timeout-ms']),
    maxScenarios: args['max-scenarios'] === undefined ? 50 : Number(args['max-scenarios']),
  };
  // Parse auth only after validating scenario selection, and never export its path/content.
  const { selectScenarios } = await import('./browser/schema.mjs');
  selectScenarios(definition, options);
  if (args.auth) options.storageState = JSON.parse(await readFile(args.auth, 'utf8'));
  const report = await runSuite(definition, options);
  process.stdout.write(JSON.stringify({ ok: report.summary.failed === 0, report: 'report.json', summary: report.summary }) + '\n');
  return report.summary.failed ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    process.stdout.write(JSON.stringify({ ok: false, blocker: error instanceof CheckError ? error.code : 'runner_error' }) + '\n');
    process.exitCode = 1;
  });
}
