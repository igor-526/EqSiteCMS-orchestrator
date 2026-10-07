/**
 * shipctl-ci.test.mjs — Tests for CI monitoring command
 *
 * Coverage:
 * - UT-CI-01: happy path with --wait, all runs success
 * - UT-CI-02: one run failure, log-failed saved, no rerun/cancel
 * - UT-CI-03: run did not appear within appear-timeout
 * - UT-CI-04: timeout while run is in_progress
 * - UT-CI-05: gh not available or not authorized
 * - UT-CI-06: snapshot mode without --wait
 * - UT-CI-07: read-only mode with --repo --sha
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHIPCTL = join(__dirname, '..', 'shipctl');
const FAKE_GH = join(__dirname, 'helpers', 'fake-gh.mjs');

function setup(name, scenario) {
  const root = mkdtempSync(join(tmpdir(), `ci-${name}-`));
  const changeDir = join(root, '.qa/ship/test-change');
  const scenarioPath = join(root, 'scenario.json');
  const logPath = join(root, 'gh-log.jsonl');

  writeFileSync(scenarioPath, JSON.stringify(scenario), 'utf8');

  const env = {
    SHIPCTL_ROOT: root,
    SHIPCTL_GH_BIN: FAKE_GH,
    FAKE_GH_SCENARIO: scenarioPath,
    FAKE_GH_LOG: logPath
  };

  return { root, changeDir, scenarioPath, logPath, env, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function writeReleaseState(changeDir, repos) {
  mkdirSync(changeDir, { recursive: true });
  const releaseStatePath = join(changeDir, 'release-state.json');
  writeFileSync(releaseStatePath, JSON.stringify({ repos }), 'utf8');
}

function parseLog(logPath) {
  if (!existsSync(logPath)) return [];
  const content = readFileSync(logPath, 'utf8');
  return content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

test('UT-CI-01: happy path with --wait, all runs success', async () => {
  const scenario = {
    authStatus: 0,
    runs: {
      'owner/backend': {
        'abc123': {
          polls: [
            {
              runs: [
                {
                  databaseId: 101,
                  status: 'completed',
                  conclusion: 'success',
                  url: 'https://github.com/owner/backend/actions/runs/101',
                  workflowName: 'Check and Deploy',
                  event: 'push'
                }
              ],
              exit: 0
            }
          ]
        }
      },
      'owner/frontend': {
        'def456': {
          polls: [
            {
              runs: [
                {
                  databaseId: 102,
                  status: 'completed',
                  conclusion: 'success',
                  url: 'https://github.com/owner/frontend/actions/runs/102',
                  workflowName: 'Check and Deploy',
                  event: 'push'
                }
              ],
              exit: 0
            }
          ]
        }
      }
    }
  };

  const { root, changeDir, logPath, env, cleanup } = setup('happy', scenario);

  writeReleaseState(changeDir, [
    { repo: 'backend', ownerRepo: 'owner/backend', sha: 'abc123', status: 'pushed' },
    { repo: 'frontend', ownerRepo: 'owner/frontend', sha: 'def456', status: 'pushed' }
  ]);

  const result = spawnSync(
    SHIPCTL,
    ['ci', '--change', 'test-change', '--wait', '--timeout', '10', '--interval', '1'],
    { env, encoding: 'utf8' }
  );

  assert.equal(result.status, 0, `Expected exit 0, got ${result.status}\nstderr: ${result.stderr}`);

  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, true);
  assert.ok(output.repos.backend);
  assert.equal(output.repos.backend.status, 'success');
  assert.ok(output.repos.frontend);
  assert.equal(output.repos.frontend.status, 'success');

  // Verify ci.json was written
  const ciJson = JSON.parse(readFileSync(join(changeDir, 'ci.json'), 'utf8'));
  assert.ok(ciJson.repos.backend);
  assert.ok(ciJson.repos.frontend);

  // Verify no rerun/cancel commands
  const log = parseLog(logPath);
  const forbidden = log.filter(e => e.command === 'run' && (e.args.includes('rerun') || e.args.includes('cancel')));
  assert.equal(forbidden.length, 0, 'fake-gh received forbidden rerun/cancel commands');

  cleanup();
});

test('UT-CI-02: one run failure, log-failed saved, no rerun/cancel', async () => {
  const scenario = {
    authStatus: 0,
    runs: {
      'owner/backend': {
        'abc123': {
          polls: [
            {
              runs: [
                {
                  databaseId: 201,
                  status: 'completed',
                  conclusion: 'failure',
                  url: 'https://github.com/owner/backend/actions/runs/201',
                  workflowName: 'Check and Deploy',
                  event: 'push'
                }
              ],
              exit: 0
            }
          ],
          logs: {
            '201': 'ERROR: test suite failed\n\nStack trace:\n  at test.js:42\n'
          }
        }
      },
      'owner/frontend': {
        'def456': {
          polls: [
            {
              runs: [
                {
                  databaseId: 202,
                  status: 'completed',
                  conclusion: 'success',
                  url: 'https://github.com/owner/frontend/actions/runs/202',
                  workflowName: 'Check and Deploy',
                  event: 'push'
                }
              ],
              exit: 0
            }
          ]
        }
      }
    }
  };

  const { root, changeDir, logPath, env, cleanup } = setup('failure', scenario);

  writeReleaseState(changeDir, [
    { repo: 'backend', ownerRepo: 'owner/backend', sha: 'abc123', status: 'pushed' },
    { repo: 'frontend', ownerRepo: 'owner/frontend', sha: 'def456', status: 'pushed' }
  ]);

  const result = spawnSync(
    SHIPCTL,
    ['ci', '--change', 'test-change', '--wait', '--timeout', '10', '--interval', '1'],
    { env, encoding: 'utf8' }
  );

  assert.equal(result.status, 1, `Expected exit 1 for CI failure, got ${result.status}`);

  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, false);
  assert.equal(output.repos.backend.status, 'failure');
  assert.ok(output.repos.backend.runs[0].excerpt, 'Expected excerpt for failed run');

  // Verify log file was saved
  const logFile = join(changeDir, 'ci', 'backend-201.log');
  assert.ok(existsSync(logFile), 'Expected log file for failed run');
  const logContent = readFileSync(logFile, 'utf8');
  assert.ok(logContent.includes('ERROR: test suite failed'));

  // Verify no rerun/cancel
  const log = parseLog(logPath);
  const forbidden = log.filter(e => e.command === 'run' && (e.args.includes('rerun') || e.args.includes('cancel')));
  assert.equal(forbidden.length, 0);

  cleanup();
});

test('UT-CI-03: run did not appear within appear-timeout', async () => {
  const scenario = {
    authStatus: 0,
    runs: {
      'owner/backend': {
        'abc123': {
          polls: [
            { runs: [], exit: 0 },
            { runs: [], exit: 0 },
            { runs: [], exit: 0 }
          ]
        }
      }
    }
  };

  const { root, changeDir, env, cleanup } = setup('no-run', scenario);

  writeReleaseState(changeDir, [
    { repo: 'backend', ownerRepo: 'owner/backend', sha: 'abc123', status: 'pushed' }
  ]);

  const result = spawnSync(
    SHIPCTL,
    ['ci', '--change', 'test-change', '--wait', '--appear-timeout', '2', '--interval', '1'],
    { env, encoding: 'utf8' }
  );

  assert.equal(result.status, 1, 'Expected exit 1 for no_run');

  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, false);
  assert.equal(output.repos.backend.status, 'no_run');

  cleanup();
});

test('UT-CI-04: timeout while run is in_progress', async () => {
  const scenario = {
    authStatus: 0,
    runs: {
      'owner/backend': {
        'abc123': {
          polls: [
            {
              runs: [
                {
                  databaseId: 301,
                  status: 'in_progress',
                  conclusion: null,
                  url: 'https://github.com/owner/backend/actions/runs/301',
                  workflowName: 'Check and Deploy',
                  event: 'push'
                }
              ],
              exit: 0
            },
            {
              runs: [
                {
                  databaseId: 301,
                  status: 'in_progress',
                  conclusion: null,
                  url: 'https://github.com/owner/backend/actions/runs/301',
                  workflowName: 'Check and Deploy',
                  event: 'push'
                }
              ],
              exit: 0
            }
          ]
        }
      }
    }
  };

  const { root, changeDir, logPath, env, cleanup } = setup('timeout', scenario);

  writeReleaseState(changeDir, [
    { repo: 'backend', ownerRepo: 'owner/backend', sha: 'abc123', status: 'pushed' }
  ]);

  const result = spawnSync(
    SHIPCTL,
    ['ci', '--change', 'test-change', '--wait', '--timeout', '3', '--interval', '1'],
    { env, encoding: 'utf8' }
  );

  assert.equal(result.status, 1, 'Expected exit 1 for timeout');

  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, false);
  assert.equal(output.repos.backend.status, 'timed_out');

  // Verify run was not cancelled
  const log = parseLog(logPath);
  const cancelCalls = log.filter(e => e.args.includes('cancel'));
  assert.equal(cancelCalls.length, 0);

  cleanup();
});

test('UT-CI-05: gh not available or not authorized', async () => {
  const scenario = {
    authStatus: 1
  };

  const { root, changeDir, env, cleanup } = setup('no-auth', scenario);

  writeReleaseState(changeDir, [
    { repo: 'backend', ownerRepo: 'owner/backend', sha: 'abc123', status: 'pushed' }
  ]);

  const result = spawnSync(
    SHIPCTL,
    ['ci', '--change', 'test-change'],
    { env, encoding: 'utf8' }
  );

  assert.equal(result.status, 2, 'Expected exit 2 for auth failure');

  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, false);
  assert.ok(output.error.includes('not authorized'));

  cleanup();
});

test('UT-CI-06: snapshot mode without --wait', async () => {
  const scenario = {
    authStatus: 0,
    runs: {
      'owner/backend': {
        'abc123': {
          polls: [
            {
              runs: [
                {
                  databaseId: 401,
                  status: 'in_progress',
                  conclusion: null,
                  url: 'https://github.com/owner/backend/actions/runs/401',
                  workflowName: 'Check and Deploy',
                  event: 'push'
                }
              ],
              exit: 0
            }
          ]
        }
      }
    }
  };

  const { root, changeDir, env, cleanup } = setup('snapshot', scenario);

  writeReleaseState(changeDir, [
    { repo: 'backend', ownerRepo: 'owner/backend', sha: 'abc123', status: 'pushed' }
  ]);

  const result = spawnSync(
    SHIPCTL,
    ['ci', '--change', 'test-change'],
    { env, encoding: 'utf8' }
  );

  assert.equal(result.status, 0, 'Expected exit 0 for snapshot');

  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, true);
  assert.equal(output.repos.backend.status, 'pending');

  cleanup();
});

test('UT-CI-07: read-only mode with --repo --sha', async () => {
  const scenario = {
    authStatus: 0,
    runs: {
      'owner/backend': {
        'abc123': {
          polls: [
            {
              runs: [
                {
                  databaseId: 501,
                  status: 'completed',
                  conclusion: 'success',
                  url: 'https://github.com/owner/backend/actions/runs/501',
                  workflowName: 'Check and Deploy',
                  event: 'push'
                }
              ],
              exit: 0
            }
          ]
        }
      }
    }
  };

  const { root, env, cleanup } = setup('readonly', scenario);

  const result = spawnSync(
    SHIPCTL,
    ['ci', '--repo', 'owner/backend', '--sha', 'abc123'],
    { env, encoding: 'utf8' }
  );

  assert.equal(result.status, 0, 'Expected exit 0 for read-only success');

  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, true);
  assert.equal(output.status, 'success');
  assert.equal(output.runs.length, 1);
  assert.equal(output.runs[0].workflow, 'Check and Deploy');

  cleanup();
});
