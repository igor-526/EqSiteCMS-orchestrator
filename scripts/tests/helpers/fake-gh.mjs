#!/usr/bin/env node

/**
 * fake-gh.mjs — Synthetic gh CLI for testing CI monitoring
 *
 * Reads scenario from a JSON file specified via FAKE_GH_SCENARIO env var,
 * and logs all invocations to FAKE_GH_LOG (both required).
 *
 * Scenario JSON structure:
 * {
 *   "authStatus": 0,  // exit code for "gh auth status"
 *   "runs": {
 *     "<owner/repo>": {
 *       "<sha>": {
 *         "polls": [
 *           { "runs": [...], "exit": 0 },
 *           ...
 *         ],
 *         "logs": {
 *           "<runId>": "log content..."
 *         }
 *       }
 *     }
 *   }
 * }
 *
 * For "run list", returns polls[callIndex] for that repo/sha.
 * For "run view --log-failed", returns logs[runId].
 *
 * All invocations are logged to FAKE_GH_LOG as JSON lines for verification.
 */

import { readFileSync, appendFileSync } from 'node:fs';

const SCENARIO_PATH = process.env.FAKE_GH_SCENARIO;
const LOG_PATH = process.env.FAKE_GH_LOG;

if (!SCENARIO_PATH || !LOG_PATH) {
  console.error('FAKE_GH_SCENARIO and FAKE_GH_LOG must be set');
  process.exit(2);
}

let scenario;
try {
  scenario = JSON.parse(readFileSync(SCENARIO_PATH, 'utf8'));
} catch (err) {
  console.error(`Cannot read scenario: ${err.message}`);
  process.exit(2);
}

// Track number of calls per repo/sha for poll sequences
const callCounts = {};

function logInvocation(cmd, args, exit) {
  const entry = {
    timestamp: new Date().toISOString(),
    command: cmd,
    args,
    exit
  };
  appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const cmd = args[0];
  const subcommand = args[1];

  if (cmd === 'auth' && subcommand === 'status') {
    return { type: 'auth' };
  }

  if (cmd === 'run' && subcommand === 'list') {
    let repo = null;
    let branch = null;
    let commit = null;

    for (let i = 2; i < args.length; i++) {
      if (args[i] === '--repo') repo = args[i + 1];
      if (args[i] === '--branch') branch = args[i + 1];
      if (args[i] === '--commit') commit = args[i + 1];
    }

    return { type: 'list', repo, branch, commit };
  }

  if (cmd === 'run' && subcommand === 'view') {
    let runId = null;
    let repo = null;
    let logFailed = false;

    for (let i = 2; i < args.length; i++) {
      if (args[i] === '--repo') repo = args[i + 1];
      if (args[i] === '--log-failed') logFailed = true;
      if (!args[i].startsWith('--') && !runId) runId = args[i];
    }

    return { type: 'view', runId, repo, logFailed };
  }

  return { type: 'unknown' };
}

function main() {
  const parsed = parseArgs(process.argv);

  if (parsed.type === 'auth') {
    const exit = scenario.authStatus ?? 0;
    logInvocation('auth', ['status'], exit);
    process.exit(exit);
  }

  if (parsed.type === 'list') {
    const { repo, commit } = parsed;
    const repoRuns = scenario.runs?.[repo]?.[commit];

    if (!repoRuns || !repoRuns.polls) {
      console.error(`No scenario for ${repo}@${commit}`);
      logInvocation('run', ['list', '--repo', repo, '--commit', commit], 1);
      process.exit(1);
    }

    const key = `${repo}:${commit}`;
    callCounts[key] = (callCounts[key] || 0) + 1;
    const pollIndex = callCounts[key] - 1;

    const poll = repoRuns.polls[pollIndex];
    if (!poll) {
      console.error(`No poll ${pollIndex} for ${repo}@${commit}`);
      logInvocation('run', ['list', '--repo', repo, '--commit', commit, '--poll', pollIndex], 1);
      process.exit(1);
    }

    console.log(JSON.stringify(poll.runs || []));
    logInvocation('run', ['list', '--repo', repo, '--commit', commit, '--poll', pollIndex], poll.exit ?? 0);
    process.exit(poll.exit ?? 0);
  }

  if (parsed.type === 'view') {
    const { runId, repo, logFailed } = parsed;

    if (!logFailed) {
      console.error('Only --log-failed is supported in fake-gh');
      logInvocation('run', ['view', runId], 1);
      process.exit(1);
    }

    // Find logs in any repo/sha that has this runId
    let logContent = null;
    for (const repoKey of Object.keys(scenario.runs || {})) {
      for (const shaKey of Object.keys(scenario.runs[repoKey] || {})) {
        const logs = scenario.runs[repoKey][shaKey].logs || {};
        if (logs[runId]) {
          logContent = logs[runId];
          break;
        }
      }
      if (logContent) break;
    }

    if (!logContent) {
      console.error(`No log for run ${runId}`);
      logInvocation('run', ['view', runId, '--log-failed'], 1);
      process.exit(1);
    }

    console.log(logContent);
    logInvocation('run', ['view', runId, '--log-failed'], 0);
    process.exit(0);
  }

  console.error(`Unknown invocation: ${JSON.stringify(process.argv.slice(2))}`);
  logInvocation('unknown', process.argv.slice(2), 2);
  process.exit(2);
}

main();
