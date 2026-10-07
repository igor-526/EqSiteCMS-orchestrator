/**
 * release.mjs — RELEASE phase: fast-forward main → release without worktree.
 *
 * Only repos with stage 'pushed' in merge-state.json and existing origin/release.
 * Root is 'not-applicable', service without origin/release is 'no-release-branch'.
 *
 * Preflight all selected repos before any push:
 *   git fetch origin main release
 *   sha := origin/main; sha ≠ merge-state.mainSha → main_moved
 *   origin/release == sha                        → noop
 *   merge-base --is-ancestor origin/release sha  → ready for ff
 *   else                                         → release_diverged
 * Any blocker → exit 3, no pushes.
 *
 * Push per repo:
 *   git push origin <sha>:refs/heads/release  # no force
 *   Failure → stop exit 1
 *
 * Working clones stay on main, no local release branch, no worktree.
 *
 * Exit codes:
 *   0 — success
 *   1 — push failure
 *   3 — preflight blocker (no mutations)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { git, parseRemoteUrl, getOriginUrl } from './git.mjs';
import { ensureStateDir, jsonOut, progress, writeStateFile } from './common.mjs';

/**
 * Parse release command arguments.
 */
function parseReleaseArgs(args) {
  const opts = {
    dryRun: false,
    change: null,
    repos: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      opts.dryRun = true;
    } else if (args[i] === '--change' && i + 1 < args.length) {
      opts.change = args[++i];
    } else if (args[i] === '--repos' && i + 1 < args.length) {
      opts.repos = args[++i].split(',').map(r => r.trim()).filter(Boolean);
    }
  }

  return opts;
}

/**
 * Read merge-state.json.
 */
async function readMergeState(stateDir) {
  try {
    const data = await readFile(join(stateDir, 'merge-state.json'), 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

/**
 * Select repos for release: pushed + origin/release exists.
 */
function selectReposForRelease(mergeState, repoFilter, ROOT) {
  const selected = [];

  for (const repo of mergeState.repos || []) {
    // Root is not-applicable
    if (repo.name === 'root') {
      selected.push({ ...repo, releaseStatus: 'not-applicable', reason: 'Root repo is not releasable' });
      continue;
    }

    // Only pushed stage
    if (repo.stage !== 'pushed') {
      continue;
    }

    // Check user filter
    if (repoFilter && !repoFilter.includes(repo.name)) {
      selected.push({ ...repo, releaseStatus: 'skipped', reason: 'Excluded by --repos' });
      continue;
    }

    // Check if origin/release exists
    const repoPath = join(ROOT, 'services', repo.name);
    const fetchResult = git(repoPath, 'ls-remote', '--heads', 'origin', 'release');
    
    if (fetchResult.status !== 0 || !fetchResult.stdout.trim()) {
      selected.push({ ...repo, releaseStatus: 'no-release-branch', reason: 'origin/release does not exist' });
      continue;
    }

    selected.push({ ...repo, releaseStatus: 'candidate' });
  }

  return selected;
}

/**
 * Preflight check for all candidate repos.
 * Returns { ok: true } or { ok: false, blockers: [...] }
 */
async function preflightRelease(repos, ROOT) {
  const blockers = [];

  for (const repo of repos) {
    if (repo.releaseStatus !== 'candidate') continue;

    const repoPath = join(ROOT, 'services', repo.name);

    // Fetch origin main and release
    progress(`Preflight ${repo.name}: fetching origin/main and origin/release...`);
    const fetchResult = git(repoPath, 'fetch', 'origin', 'main', 'release');
    if (fetchResult.status !== 0) {
      blockers.push({
        repo: repo.name,
        blocker: 'fetch_failed',
        detail: fetchResult.stderr.trim()
      });
      continue;
    }

    // Get origin/main SHA
    const mainResult = git(repoPath, 'rev-parse', 'origin/main');
    if (mainResult.status !== 0) {
      blockers.push({
        repo: repo.name,
        blocker: 'main_missing',
        detail: 'Cannot resolve origin/main'
      });
      continue;
    }
    const mainSha = mainResult.stdout.trim();

    // Check main_moved
    if (mainSha !== repo.mainSha) {
      blockers.push({
        repo: repo.name,
        blocker: 'main_moved',
        detail: `origin/main is now ${mainSha}, expected ${repo.mainSha}`
      });
      continue;
    }

    // Get origin/release SHA
    const releaseResult = git(repoPath, 'rev-parse', 'origin/release');
    if (releaseResult.status !== 0) {
      blockers.push({
        repo: repo.name,
        blocker: 'release_missing',
        detail: 'Cannot resolve origin/release after fetch'
      });
      continue;
    }
    const releaseSha = releaseResult.stdout.trim();

    // Check noop
    if (releaseSha === mainSha) {
      repo.releaseStatus = 'noop';
      repo.reason = 'origin/release already equals origin/main';
      continue;
    }

    // Check fast-forward
    const isAncestorResult = git(repoPath, 'merge-base', '--is-ancestor', releaseSha, mainSha);
    if (isAncestorResult.status !== 0) {
      // Collect commits in release but not in main
      const divergedResult = git(repoPath, 'log', '--oneline', `${mainSha}..${releaseSha}`);
      const divergedCommits = divergedResult.stdout.trim().split('\n').filter(Boolean);

      blockers.push({
        repo: repo.name,
        blocker: 'release_diverged',
        detail: `origin/release contains commits not in main`,
        commits: divergedCommits
      });
      continue;
    }

    // Ready for ff
    repo.releaseStatus = 'ready';
    repo.mainSha = mainSha;
  }

  if (blockers.length > 0) {
    return { ok: false, blockers };
  }

  return { ok: true };
}

/**
 * Push release refs.
 */
async function pushRelease(repos, ROOT) {
  const results = [];

  for (const repo of repos) {
    if (repo.releaseStatus !== 'ready') {
      results.push({
        repo: repo.name,
        status: repo.releaseStatus,
        reason: repo.reason || null
      });
      continue;
    }

    const repoPath = join(ROOT, 'services', repo.name);
    const sha = repo.mainSha;

    progress(`Pushing ${repo.name}: ${sha} → origin/release...`);
    const pushResult = git(repoPath, 'push', 'origin', `${sha}:refs/heads/release`);

    if (pushResult.status !== 0) {
      // Stop on push failure
      results.push({
        repo: repo.name,
        status: 'push_failed',
        error: pushResult.stderr.trim()
      });

      return {
        ok: false,
        stopped: true,
        results
      };
    }

    // Get owner/repo from origin URL
    const originUrl = getOriginUrl(repoPath);
    const ownerRepo = parseRemoteUrl(originUrl);

    results.push({
      repo: repo.name,
      ownerRepo: ownerRepo ? `${ownerRepo.owner}/${ownerRepo.repo}` : null,
      sha,
      status: 'pushed'
    });
  }

  return { ok: true, results };
}

/**
 * Main release command.
 */
export async function release(args, context) {
  const { ROOT } = context;
  const opts = parseReleaseArgs(args);

  if (!opts.change && !opts.dryRun) {
    return { code: 3, payload: jsonOut(false, { error: '--change required (or --dry-run with --repos)' }) };
  }

  // Dry-run without merge-state
  if (opts.dryRun && !opts.change) {
    if (!opts.repos) {
      return { code: 3, payload: jsonOut(false, { error: '--dry-run without --change requires --repos' }) };
    }

    // Classify repos by current remote-tracking refs
    const plan = [];
    for (const repoName of opts.repos) {
      const repoPath = repoName === 'root' ? ROOT : join(ROOT, 'services', repoName);

      // Check if origin/release exists
      const fetchResult = git(repoPath, 'ls-remote', '--heads', 'origin', 'release');
      if (fetchResult.status !== 0 || !fetchResult.stdout.trim()) {
        plan.push({ repo: repoName, status: 'no-release-branch' });
        continue;
      }

      // Get origin/main and origin/release SHAs
      const mainResult = git(repoPath, 'rev-parse', 'origin/main');
      const releaseResult = git(repoPath, 'rev-parse', 'origin/release');

      if (mainResult.status !== 0 || releaseResult.status !== 0) {
        plan.push({ repo: repoName, status: 'cannot_resolve' });
        continue;
      }

      const mainSha = mainResult.stdout.trim();
      const releaseSha = releaseResult.stdout.trim();

      if (mainSha === releaseSha) {
        plan.push({ repo: repoName, status: 'noop' });
        continue;
      }

      const isAncestorResult = git(repoPath, 'merge-base', '--is-ancestor', releaseSha, mainSha);
      if (isAncestorResult.status === 0) {
        plan.push({ repo: repoName, status: 'ff', sha: mainSha });
      } else {
        const divergedResult = git(repoPath, 'log', '--oneline', `${mainSha}..${releaseSha}`);
        const divergedCommits = divergedResult.stdout.trim().split('\n').filter(Boolean);
        plan.push({ repo: repoName, status: 'diverged', commits: divergedCommits });
      }
    }

    return { code: 0, payload: jsonOut(true, { dryRun: true, plan }) };
  }

  // Real run or dry-run with merge-state
  const stateDir = await ensureStateDir(ROOT, opts.change);
  const mergeState = await readMergeState(stateDir);

  if (!mergeState) {
    return { code: 3, payload: jsonOut(false, { error: 'merge-state.json not found' }) };
  }

  // Select repos
  const repos = selectReposForRelease(mergeState, opts.repos, ROOT);

  // Preflight
  const preflightResult = await preflightRelease(repos, ROOT);
  if (!preflightResult.ok) {
    return { code: 3, payload: jsonOut(false, { blockers: preflightResult.blockers }) };
  }

  // Dry-run stops here
  if (opts.dryRun) {
    const plan = repos.map(r => ({
      repo: r.name,
      status: r.releaseStatus,
      sha: r.mainSha || null,
      reason: r.reason || null
    }));
    return { code: 0, payload: jsonOut(true, { dryRun: true, plan }) };
  }

  // Push
  const pushResult = await pushRelease(repos, ROOT);

  // Write release-state.json
  const releaseState = {
    change: opts.change,
    repos: pushResult.results
  };

  await writeStateFile(join(stateDir, 'release-state.json'), releaseState, 'release-state');

  if (!pushResult.ok) {
    return { code: 1, payload: jsonOut(false, { ...releaseState, stopped: true }) };
  }

  return { code: 0, payload: jsonOut(true, releaseState) };
}
