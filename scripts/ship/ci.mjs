/**
 * ci.mjs — CI monitoring via gh CLI for shipctl
 *
 * Queries GitHub Actions runs for commits pushed to release branch.
 * Without --wait, returns a single snapshot; with --wait, polls until
 * all runs finish or timeout is reached.
 *
 * Exit codes:
 *   0 — success (all runs completed successfully or snapshot taken)
 *   1 — operation stopped (CI failure, no run appeared, timeout)
 *   2 — environment unavailable (gh not installed or not authorized)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { writeStateFile } from './common.mjs';

function failure(error, extra = {}, code = 1) {
  return { code, payload: { ok: false, ...extra, error } };
}

function success(payload = {}) {
  return { code: 0, payload: { ok: true, ...payload } };
}

function parseArgs(args) {
  const parsed = {
    change: null,
    repo: null,
    sha: null,
    wait: false,
    timeout: 1800,
    appearTimeout: 180,
    interval: 20
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--change':
        parsed.change = args[++i];
        break;
      case '--repo':
        parsed.repo = args[++i];
        break;
      case '--sha':
        parsed.sha = args[++i];
        break;
      case '--wait':
        parsed.wait = true;
        break;
      case '--timeout':
        parsed.timeout = parseInt(args[++i], 10);
        break;
      case '--appear-timeout':
        parsed.appearTimeout = parseInt(args[++i], 10);
        break;
      case '--interval':
        parsed.interval = parseInt(args[++i], 10);
        break;
      default:
        return failure(`Unknown flag: ${arg}`, {}, 2);
    }
  }

  if (!parsed.change && !parsed.repo) {
    return failure('Either --change or --repo is required', {}, 2);
  }

  if (parsed.repo && !parsed.sha) {
    return failure('--repo requires --sha', {}, 2);
  }

  return { ok: true, parsed };
}

/**
 * Check if gh is available and authorized.
 */
function checkGh(ghBin) {
  const result = spawnSync(ghBin, ['auth', 'status'], { encoding: 'utf8' });
  if (result.error) {
    return failure(`gh not found: ${result.error.message}`, {}, 2);
  }
  if (result.status !== 0) {
    return failure('gh not authorized (run: gh auth login)', {}, 2);
  }
  return { ok: true };
}

/**
 * Query runs for a single repository.
 */
function queryRuns(ghBin, ownerRepo, sha, branch = 'release') {
  const result = spawnSync(
    ghBin,
    [
      'run', 'list',
      '--repo', ownerRepo,
      '--branch', branch,
      '--commit', sha,
      '--json', 'databaseId,status,conclusion,url,workflowName,event'
    ],
    { encoding: 'utf8' }
  );

  if (result.error || result.status !== 0) {
    return { ok: false, error: result.stderr || result.error?.message || 'gh run list failed' };
  }

  try {
    const runs = JSON.parse(result.stdout);
    return { ok: true, runs };
  } catch (err) {
    return { ok: false, error: `Failed to parse gh output: ${err.message}` };
  }
}

/**
 * Download failed logs for a run.
 */
function fetchFailedLog(ghBin, ownerRepo, runId, outputPath) {
  const result = spawnSync(
    ghBin,
    ['run', 'view', String(runId), '--repo', ownerRepo, '--log-failed'],
    { encoding: 'utf8' }
  );

  if (result.error || result.status !== 0) {
    return { ok: false, error: result.stderr || result.error?.message };
  }

  try {
    mkdirSync(join(outputPath, '..'), { recursive: true });
    writeFileSync(outputPath, result.stdout, 'utf8');
    // Extract last 60 lines for excerpt
    const lines = result.stdout.split('\n');
    const excerpt = lines.slice(-60).join('\n');
    return { ok: true, excerpt };
  } catch (err) {
    return { ok: false, error: `Failed to save log: ${err.message}` };
  }
}

/**
 * Determine overall status from runs.
 * Returns: success | failure | cancelled | pending | unknown
 */
function summarizeRuns(runs) {
  if (runs.length === 0) return 'no_run';

  const allCompleted = runs.every(r => r.status === 'completed');
  if (!allCompleted) return 'pending';

  const allSuccess = runs.every(r => r.conclusion === 'success');
  if (allSuccess) return 'success';

  const hasCancelled = runs.some(r => r.conclusion === 'cancelled');
  if (hasCancelled) return 'cancelled';

  return 'failure';
}

/**
 * Wait for runs to finish with timeout.
 */
async function waitForRuns(ghBin, ownerRepo, sha, appearTimeout, timeout, interval) {
  const startTime = Date.now();
  const appearDeadline = startTime + appearTimeout * 1000;
  const overallDeadline = startTime + timeout * 1000;

  while (true) {
    const now = Date.now();

    const queryResult = queryRuns(ghBin, ownerRepo, sha);
    if (!queryResult.ok) {
      return { ok: false, error: queryResult.error };
    }

    const runs = queryResult.runs;

    // Check if any runs appeared
    if (runs.length === 0) {
      if (now >= appearDeadline) {
        return { ok: true, status: 'no_run', runs: [] };
      }
    } else {
      // Runs exist, check if all completed
      const status = summarizeRuns(runs);
      if (status !== 'pending') {
        return { ok: true, status, runs };
      }
    }

    // Check overall timeout
    if (now >= overallDeadline) {
      return { ok: true, status: 'timed_out', runs };
    }

    // Sleep before next poll
    await new Promise(resolve => setTimeout(resolve, interval * 1000));
  }
}

/**
 * Process a single repository (read-only mode with --repo --sha).
 */
async function processReadOnly(ghBin, repo, sha, wait, timeouts, root) {
  const { appearTimeout, timeout, interval } = timeouts;

  if (wait) {
    const waitResult = await waitForRuns(ghBin, repo, sha, appearTimeout, timeout, interval);
    if (!waitResult.ok) {
      return failure(waitResult.error);
    }

    const { status, runs } = waitResult;
    const results = runs.map(r => ({
      workflow: r.workflowName,
      status: r.status,
      conclusion: r.conclusion,
      url: r.url
    }));

    return status === 'success'
      ? success({ status, runs: results })
      : failure(`CI ${status}`, { status, runs: results }, 1);
  } else {
    const queryResult = queryRuns(ghBin, repo, sha);
    if (!queryResult.ok) {
      return failure(queryResult.error, {}, 2);
    }

    const runs = queryResult.runs.map(r => ({
      workflow: r.workflowName,
      status: r.status,
      conclusion: r.conclusion,
      url: r.url
    }));

    const status = summarizeRuns(queryResult.runs);
    return success({ status, runs });
  }
}

/**
 * Process all repositories from release-state.json.
 */
async function processChange(ghBin, change, wait, timeouts, root) {
  const { appearTimeout, timeout, interval } = timeouts;
  const changeDir = join(root, '.qa/ship', change);
  const releaseStatePath = join(changeDir, 'release-state.json');

  let releaseState;
  try {
    const content = readFileSync(releaseStatePath, 'utf8');
    releaseState = JSON.parse(content);
  } catch (err) {
    return failure(`Cannot read release-state.json: ${err.message}`, {}, 2);
  }

  const repos = releaseState.repos || [];
  const eligible = repos.filter(r => r.status === 'pushed');

  if (eligible.length === 0) {
    return success({ message: 'No repositories to monitor', repos: [] });
  }

  const results = {};
  const ciLogDir = join(changeDir, 'ci');
  mkdirSync(ciLogDir, { recursive: true });

  if (wait) {
    // Wait for all repos in parallel with shared deadline
    const startTime = Date.now();
    const overallDeadline = startTime + timeout * 1000;

    const repoPromises = eligible.map(async repoEntry => {
      const { repo, ownerRepo, sha } = repoEntry;
      const remainingTime = Math.max(0, Math.floor((overallDeadline - Date.now()) / 1000));

      const waitResult = await waitForRuns(
        ghBin,
        ownerRepo,
        sha,
        appearTimeout,
        remainingTime,
        interval
      );

      if (!waitResult.ok) {
        results[repo] = { status: 'error', error: waitResult.error };
        return { repo, ok: false };
      }

      const { status, runs } = waitResult;
      const runEntries = runs.map(r => ({
        id: r.databaseId,
        workflow: r.workflowName,
        status: r.status,
        conclusion: r.conclusion,
        url: r.url
      }));

      // Fetch failed logs if needed
      for (const run of runs) {
        if (run.conclusion && run.conclusion !== 'success') {
          const logPath = join(ciLogDir, `${repo}-${run.databaseId}.log`);
          const logResult = fetchFailedLog(ghBin, ownerRepo, run.databaseId, logPath);
          if (logResult.ok) {
            const runEntry = runEntries.find(e => e.id === run.databaseId);
            if (runEntry) runEntry.excerpt = logResult.excerpt;
          }
        }
      }

      results[repo] = { status, runs: runEntries };
      return { repo, ok: status === 'success' };
    });

    const outcomes = await Promise.all(repoPromises);
    const allSuccess = outcomes.every(o => o.ok);

    // Write ci.json
    const ciJsonPath = join(changeDir, 'ci.json');
    await writeStateFile(ciJsonPath, { repos: results }, 'ci');

    if (allSuccess) {
      return success({ repos: results });
    } else {
      return failure('One or more CI runs failed', { repos: results }, 1);
    }
  } else {
    // Snapshot mode
    for (const repoEntry of eligible) {
      const { repo, ownerRepo, sha } = repoEntry;
      const queryResult = queryRuns(ghBin, ownerRepo, sha);

      if (!queryResult.ok) {
        results[repo] = { status: 'error', error: queryResult.error };
        continue;
      }

      const runs = queryResult.runs.map(r => ({
        id: r.databaseId,
        workflow: r.workflowName,
        status: r.status,
        conclusion: r.conclusion,
        url: r.url
      }));

      const status = summarizeRuns(queryResult.runs);
      results[repo] = { status, runs };
    }

    const ciJsonPath = join(changeDir, 'ci.json');
    await writeStateFile(ciJsonPath, { repos: results }, 'ci');

    return success({ repos: results });
  }
}

/**
 * Main entry point for CI command.
 */
export async function ci(args, context) {
  const { ROOT, GH_BIN } = context;

  const parseResult = parseArgs(args);
  if (!parseResult.ok) {
    return parseResult;
  }

  const { parsed } = parseResult;
  const { change, repo, sha, wait, timeout, appearTimeout, interval } = parsed;

  // Check gh availability
  const ghCheck = checkGh(GH_BIN);
  if (!ghCheck.ok) {
    return ghCheck;
  }

  const timeouts = { timeout, appearTimeout, interval };

  if (repo) {
    return await processReadOnly(GH_BIN, repo, sha, wait, timeouts, ROOT);
  } else {
    return await processChange(GH_BIN, change, wait, timeouts, ROOT);
  }
}
