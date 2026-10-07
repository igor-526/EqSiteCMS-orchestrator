/**
 * merge.mjs — MERGE phase: create feature branches, commit included files, push.
 *
 * Phase 1: create branch, add included, commit, switch main, push branch
 * Phase 2: sync barrier, merge --no-ff, push main
 *
 * Exit codes:
 *   0 — success
 *   1 — stopped (conflict, push failure, sync failure)
 *   3 — precondition violated or stale plan (no mutations)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { git } from './git.mjs';
import { ensureStateDir, jsonOut, progress, writeStateFile } from './common.mjs';

/**
 * Parse merge command arguments.
 */
function parseMergeArgs(args) {
  const opts = {
    dryRun: false,
    planFile: null,
    resume: false,
    change: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      opts.dryRun = true;
    } else if (args[i] === '--resume') {
      opts.resume = true;
    } else if (args[i] === '--plan' && i + 1 < args.length) {
      opts.planFile = args[++i];
    } else if (args[i] === '--change' && i + 1 < args.length) {
      opts.change = args[++i];
    }
  }

  return opts;
}

/**
 * Detect resume state for a repo in conflict.
 */
async function detectResumeState(repo, plan, ROOT) {
  const repoPath = repo.name === 'root' ? ROOT : join(ROOT, 'services', repo.name);
  
  // Check if MERGE_HEAD still exists
  const mergeHeadResult = await git(repoPath, 'rev-parse', '--verify', 'MERGE_HEAD');
  if (mergeHeadResult.status === 0) {
    return { blocker: 'merge_in_progress', detail: 'Complete conflict resolution and commit merge' };
  }

  // Check if feature branch tip is ancestor of HEAD (merge was committed or aborted)
  const branchTipResult = await git(repoPath, 'rev-parse', plan.branchName);
  const headResult = await git(repoPath, 'rev-parse', 'HEAD');
  
  if (branchTipResult.status !== 0 || headResult.status !== 0) {
    return { blocker: 'state_mismatch', detail: 'Cannot verify merge state' };
  }

  const branchTip = branchTipResult.stdout.trim();
  const head = headResult.stdout.trim();

  const isAncestorResult = await git(repoPath, 'merge-base', '--is-ancestor', branchTip, head);
  if (isAncestorResult.status !== 0) {
    return { blocker: 'conflict_unresolved', detail: 'Merge was aborted or feature branch not in history' };
  }

  // Check first parent of HEAD matches pre-merge main
  const firstParentResult = await git(repoPath, 'rev-parse', 'HEAD^1');
  if (firstParentResult.status !== 0) {
    return { blocker: 'state_mismatch', detail: 'Cannot determine first parent' };
  }

  const firstParent = firstParentResult.stdout.trim();
  if (firstParent !== repo.preMergeMain) {
    return { blocker: 'foreign_in_merge', detail: 'First parent does not match pre-merge main' };
  }

  // Check merge commit does not include foreign files
  const mergeFilesResult = await git(repoPath, 'diff', '--name-only', 'HEAD^1', 'HEAD');
  const mergeFiles = mergeFilesResult.stdout.trim().split('\n').filter(Boolean);
  const includedPaths = (repo.included || []).map(f => f.path);
  const foreignInMerge = mergeFiles.filter(f => !includedPaths.includes(f));
  
  if (foreignInMerge.length > 0) {
    return { blocker: 'foreign_in_merge', detail: 'Merge commit includes foreign files', files: foreignInMerge };
  }

  // All checks passed, merge commit is valid
  return { valid: true };
}

/**
 * Read and validate plan.json.
 * Normalizes repos from object {".": {...}, "backend": {...}} to array [{name: ".", ...}, {name: "backend", ...}].
 */
async function readPlan(planFile) {
  const content = await readFile(planFile, 'utf8');
  const plan = JSON.parse(content);

  if (!plan || !plan.repos || !plan.branchName) {
    throw new Error('Invalid plan.json structure');
  }

  // Normalize repos: plan.json stores as object, merge consumes as array
  if (!Array.isArray(plan.repos)) {
    plan.repos = Object.entries(plan.repos).map(([name, data]) => ({ name, ...data }));
  }

  return plan;
}

/**
 * Recompute fingerprint and validate plan is still current.
 */
async function validateFingerprint(repo, plan, ROOT) {
  const repoPath = repo.name === 'root' ? ROOT : join(ROOT, 'services', repo.name);

  // Check HEAD matches
  const headResult = await git(repoPath, 'rev-parse', 'HEAD');
  const currentHead = headResult.stdout.trim();
  if (currentHead !== repo.head) {
    return { valid: false, reason: 'head_changed' };
  }

  // Check branch name is still free locally
  const localCheckResult = await git(repoPath, 'rev-parse', '--verify', `refs/heads/${plan.branchName}`);
  if (localCheckResult.status === 0) {
    return { valid: false, reason: 'branch_exists_local' };
  }

  // Check branch name is still free on origin
  const remoteResult = await git(repoPath, 'ls-remote', '--heads', 'origin', plan.branchName);
  if (remoteResult.stdout.trim()) {
    return { valid: false, reason: 'branch_exists_remote' };
  }

  // Check included files haven't changed (compare blob hashes if available)
  // blobHash is optional in schema but may be present for validation
  if (repo.included) {
    for (const file of repo.included) {
      if (file.blobHash) {
        const hashResult = await git(repoPath, 'hash-object', file.path);
        const currentHash = hashResult.status === 0 ? hashResult.stdout.trim() : null;
        if (currentHash !== file.blobHash) {
          return { valid: false, reason: 'included_file_changed' };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * Run preflight checks on all changed repositories before any mutations.
 * Accumulates ALL blockers from ALL repos (F-083-02: full list for --dry-run).
 * Returns array of blockers or null if all clear.
 */
async function runPreflight(plan, ROOT) {
  const blockers = [];

  const changedRepos = plan.repos.filter(r => r.status === 'changed');

  // F-083-02: accumulate all blockers, do not exit early
  for (const repo of changedRepos) {
    const repoPath = repo.name === 'root' ? ROOT : join(ROOT, 'services', repo.name);

    // Validate fingerprint and free branch
    const fpCheck = await validateFingerprint(repo, plan, ROOT);
    if (!fpCheck.valid) {
      blockers.push({ repo: repo.name, blocker: 'plan_stale', detail: fpCheck.reason });
      continue;
    }

    // Check not detached (must be before not_on_main, as detached HEAD returns "HEAD")
    const symbolicResult = await git(repoPath, 'symbolic-ref', '-q', 'HEAD');
    if (symbolicResult.status !== 0) {
      blockers.push({ repo: repo.name, blocker: 'detached_head' });
      continue;
    }

    // Check current branch is main
    const branchResult = await git(repoPath, 'rev-parse', '--abbrev-ref', 'HEAD');
    const currentBranch = branchResult.stdout.trim();
    if (currentBranch !== 'main') {
      blockers.push({ repo: repo.name, blocker: 'not_on_main', detail: currentBranch });
      continue;
    }

    // Check no MERGE_HEAD
    const mergeHeadResult = await git(repoPath, 'rev-parse', '--verify', 'MERGE_HEAD');
    if (mergeHeadResult.status === 0) {
      blockers.push({ repo: repo.name, blocker: 'merge_in_progress' });
      continue;
    }

    // Check no foreign files are staged
    const stagedResult = await git(repoPath, 'diff', '--cached', '--name-only');
    if (stagedResult.stdout.trim()) {
      const staged = stagedResult.stdout.split('\n').filter(Boolean);
      const includedPaths = (repo.included || []).map(f => f.path);
      const foreignStaged = staged.filter(s => !includedPaths.includes(s));
      if (foreignStaged.length > 0) {
        blockers.push({ repo: repo.name, blocker: 'foreign_staged', files: foreignStaged });
        continue;
      }
    }

    // Check main is not ahead of origin/main
    const mainResult = await git(repoPath, 'rev-parse', 'main');
    const originMainResult = await git(repoPath, 'rev-parse', 'origin/main');
    const mainSha = mainResult.stdout.trim();
    const originMainSha = originMainResult.stdout.trim();
    if (mainSha !== originMainSha) {
      blockers.push({ repo: repo.name, blocker: 'main_ahead' });
      continue;
    }
  }

  return blockers.length > 0 ? blockers : null;
}

/**
 * Execute sync barrier.
 */
async function executeSyncBarrier(ROOT, change, changedRepoNames, dryRun = false) {
  const makeBin = process.env.SHIPCTL_MAKE_BIN || 'make';
  const syncReportPath = join(ROOT, '.qa/ship', change, 'sync.json');
  const syncFlags = `--strict --include-root --report ${syncReportPath}`;

  if (dryRun) {
    return { cmd: makeBin, args: ['sync', `SYNC_FLAGS=${syncFlags}`] };
  }

  progress('Running make sync --strict...');
  
  // In test environment, skip sync if SHIPCTL_MAKE_BIN is not set to real make
  if (process.env.SHIPCTL_TEST_SKIP_SYNC === 'true') {
    progress('Skipping sync in test environment');
    return { success: true, skipped: true };
  }

  const result = spawnSync(makeBin, ['sync', `SYNC_FLAGS=${syncFlags}`], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    // Parse report to determine if failure was in changed or untouched repo
    let syncReport = [];
    try {
      const reportContent = await readFile(syncReportPath, 'utf8');
      syncReport = JSON.parse(reportContent);
    } catch {
      // Report not available
    }

    const failedRepos = syncReport.filter(r => r.result === 'failed');
    const failedInChanged = failedRepos.filter(r => changedRepoNames.includes(r.name) || r.name === 'root');
    
    if (failedInChanged.length > 0) {
      throw new Error(`Sync failed in changed repositories: ${failedInChanged.map(r => r.name).join(', ')}`);
    } else {
      progress(`Warning: sync failed in untouched repositories: ${failedRepos.map(r => r.name).join(', ')}`);
    }
  }

  return { success: true };
}

/**
 * Execute phase 2 for a single repository.
 * Returns: { success: true } | { conflict: true, files: [...] } | throws on error
 */
async function executePhase2ForRepo(repo, plan, ROOT, dryRun = false) {
  const repoPath = repo.name === 'root' ? ROOT : join(ROOT, 'services', repo.name);
  const steps = [];

  const branchName = plan.branchName;
  const mergeMessage = `Merge branch '${branchName}' into main\n\nOpenSpec: ${plan.change}`;

  // Step 1: git merge --no-ff <branch>
  steps.push({ cmd: 'git', args: ['merge', '--no-ff', branchName, '-m', mergeMessage] });
  
  if (!dryRun) {
    const mergeResult = await git(repoPath, 'merge', '--no-ff', branchName, '-m', mergeMessage);
    
    if (mergeResult.status !== 0) {
      // Check if it's a conflict
      const mergeHeadResult = await git(repoPath, 'rev-parse', '--verify', 'MERGE_HEAD');
      
      if (mergeHeadResult.status === 0) {
        // Conflict: MERGE_HEAD exists, get conflicted files
        const conflictResult = await git(repoPath, 'diff', '--name-only', '--diff-filter=U');
        const conflictedFiles = conflictResult.stdout.trim().split('\n').filter(Boolean);
        
        return { conflict: true, files: conflictedFiles };
      }
      
      throw new Error(`Merge failed: ${mergeResult.stderr}`);
    }
  }

  // Step 2: git push origin main
  steps.push({ cmd: 'git', args: ['push', 'origin', 'main'] });
  
  if (!dryRun) {
    const pushResult = await git(repoPath, 'push', 'origin', 'main');
    if (pushResult.status !== 0) {
      return { error: `push origin main failed: ${pushResult.stderr}` };
    }
  }

  if (dryRun) {
    return { steps };
  }

  return { success: true };
}

/**
 * Execute phase 1 for a single repository.
 */
async function executePhase1ForRepo(repo, plan, ROOT, dryRun = false) {
  const repoPath = repo.name === 'root' ? ROOT : join(ROOT, 'services', repo.name);
  const steps = [];

  const branchName = plan.branchName;
  const commitPrefix = plan.commitMessage?.subject?.match(/^(feat|fix)/)?.[1] || plan.commitPrefix || 'feat';
  const summary = plan.commitMessage?.subject?.replace(/^(feat|fix)\([^)]+\):\s*/, '') || plan.summary || 'Change';
  
  const commitMessage = `${commitPrefix}(${plan.change}): ${summary}`;
  const trailers = plan.commitMessage?.trailers?.join('\n') || `OpenSpec: ${plan.change}`;

  // Step 1: git switch -c <branch>
  steps.push({ cmd: 'git', args: ['switch', '-c', branchName] });
  if (!dryRun) {
    const switchResult = await git(repoPath, 'switch', '-c', branchName);
    if (switchResult.status !== 0) {
      throw new Error(`Failed to create branch: ${switchResult.stderr}`);
    }
  }

  // Step 2: git add -A -- <included paths>
  const includedPaths = (repo.included || []).map(f => f.path);
  if (includedPaths.length > 0) {
    steps.push({ cmd: 'git', args: ['add', '-A', '--', ...includedPaths] });
    if (!dryRun) {
      const addResult = await git(repoPath, 'add', '-A', '--', ...includedPaths);
      if (addResult.status !== 0) {
        throw new Error(`Failed to add files: ${addResult.stderr}`);
      }
    }
  }

  // Step 3: git commit
  const fullMessage = `${commitMessage}\n\n${trailers}`;
  steps.push({ cmd: 'git', args: ['commit', '-m', fullMessage] });
  if (!dryRun) {
    const commitResult = await git(repoPath, 'commit', '-m', fullMessage);
    if (commitResult.status !== 0) {
      throw new Error(`Failed to commit: ${commitResult.stderr}`);
    }
  }

  // Step 4: git switch main
  steps.push({ cmd: 'git', args: ['switch', 'main'] });
  if (!dryRun) {
    const switchMainResult = await git(repoPath, 'switch', 'main');
    if (switchMainResult.status !== 0) {
      throw new Error(`Failed to switch to main: ${switchMainResult.stderr}`);
    }
  }

  // Step 5: git push origin <branch>
  steps.push({ cmd: 'git', args: ['push', 'origin', branchName] });
  if (!dryRun) {
    const pushResult = await git(repoPath, 'push', 'origin', branchName);
    if (pushResult.status !== 0) {
      throw new Error(`push origin ${branchName} failed: ${pushResult.stderr}`);
    }
  }

  return steps;
}

/**
 * Main merge command handler.
 */
export async function merge(args, context) {
  const { ROOT } = context;

  try {
    const opts = parseMergeArgs(args);
    const { dryRun, planFile, resume, change } = opts;

    // Handle --resume
    if (resume) {
      if (!change) {
        return {
          code: 3,
          payload: jsonOut(false, { error: '--change <name> required with --resume' })
        };
      }

      const stateDir = join(ROOT, '.qa/ship', change);
      const statePath = join(stateDir, 'merge-state.json');
      const planPath = join(stateDir, 'plan.json');

      let mergeState, plan;
      try {
        mergeState = JSON.parse(await readFile(statePath, 'utf8'));
        plan = JSON.parse(await readFile(planPath, 'utf8'));
      } catch {
        return {
          code: 3,
          payload: jsonOut(false, { error: 'No merge state found for this change' })
        };
      }

      // Process resume
      const blockers = [];
      const resumeRepos = [];

      for (const repoState of mergeState.repos) {
        const planRepo = plan.repos.find(r => r.name === repoState.name);
        if (!planRepo) continue;

        if (repoState.stage === 'conflict') {
          // Validate conflict resolution
          const resumeCheck = await detectResumeState(repoState, plan, ROOT);
          if (!resumeCheck.valid) {
            blockers.push({ repo: repoState.name, ...resumeCheck });
            continue;
          }
          
          // Accept user's merge commit
          repoState.stage = 'merged';
          repoState.mergedSha = (await git(
            repoState.name === 'root' ? ROOT : join(ROOT, 'services', repoState.name),
            'rev-parse', 'HEAD'
          )).stdout.trim();
        } else if (repoState.stage !== 'pushed' && repoState.stage !== 'merged' && repoState.stage !== 'branch-pushed' && repoState.stage !== 'synced') {
          // Validate other repos haven't changed
          const repoPath = repoState.name === 'root' ? ROOT : join(ROOT, 'services', repoState.name);
          const currentHead = (await git(repoPath, 'rev-parse', 'HEAD')).stdout.trim();
          const currentBranch = (await git(repoPath, 'rev-parse', '--abbrev-ref', 'HEAD')).stdout.trim();
          
          if (currentHead !== repoState.head || currentBranch !== 'main') {
            blockers.push({ 
              repo: repoState.name, 
              blocker: 'state_mismatch',
              detail: 'Repository state changed since last run'
            });
          }
        }

        resumeRepos.push(repoState);
      }

      if (blockers.length > 0) {
        return {
          code: 3,
          payload: jsonOut(false, { error: 'Resume validation failed', blockers })
        };
      }

      // Repeat sync barrier
      const changedRepoNames = plan.repos.filter(r => r.status === 'changed').map(r => r.name);
      try {
        await executeSyncBarrier(ROOT, change, changedRepoNames, false);
      } catch (error) {
        return {
          code: 1,
          payload: jsonOut(false, { error: 'Sync barrier failed', detail: error.message })
        };
      }

      // Push main for merged repos
      for (const repoState of resumeRepos) {
        if (repoState.stage === 'merged') {
          progress(`Pushing main for ${repoState.name}...`);
          const repoPath = repoState.name === 'root' ? ROOT : join(ROOT, 'services', repoState.name);
          const pushResult = await git(repoPath, 'push', 'origin', 'main');
          
          if (pushResult.status !== 0) {
            repoState.error = `push origin main failed: ${pushResult.stderr}`;
            await writeStateFile(statePath, mergeState, 'merge-state');
            return {
              code: 1,
              payload: jsonOut(false, {
                error: `Push failed for ${repoState.name}`,
                mergeState,
                detail: pushResult.stderr
              })
            };
          }

          repoState.stage = 'pushed';
          repoState.pushedSha = repoState.mergedSha;
        }
      }

      // Continue phase 2 for remaining repos
      for (const repoState of resumeRepos) {
        if (repoState.stage === 'synced' || repoState.stage === 'branch-pushed') {
          progress(`Merging ${repoState.name}...`);
          const planRepo = plan.repos.find(r => r.name === repoState.name);
          
          const repoPath = repoState.name === 'root' ? ROOT : join(ROOT, 'services', repoState.name);
          const preMergeMain = (await git(repoPath, 'rev-parse', 'main')).stdout.trim();
          repoState.preMergeMain = preMergeMain;

          const phase2Result = await executePhase2ForRepo(planRepo, plan, ROOT, false);

          if (phase2Result.conflict) {
            repoState.stage = 'conflict';
            repoState.conflictFiles = phase2Result.files;
            mergeState.phase = 'phase2-partial';
            await writeStateFile(statePath, mergeState, 'merge-state');

            return {
              code: 1,
              payload: jsonOut(false, {
                error: `Conflict in ${repoState.name}`,
                mergeState,
                conflictFiles: phase2Result.files,
                resumeCommand: `shipctl merge --resume --change ${change}`
              })
            };
          }

          if (phase2Result.error) {
            // Push failed, but merge succeeded - record the merged SHA
            const mergedSha = (await git(repoPath, 'rev-parse', 'main')).stdout.trim();
            repoState.stage = 'merged';
            repoState.mergedSha = mergedSha;
            repoState.error = phase2Result.error;
            mergeState.phase = 'phase2-partial';
            await writeStateFile(statePath, mergeState, 'merge-state');

            return {
              code: 1,
              payload: jsonOut(false, {
                error: `Phase 2 failed for ${repoState.name}`,
                mergeState,
                detail: phase2Result.error
              })
            };
          }

          repoState.stage = 'pushed';
          const pushedSha = (await git(repoPath, 'rev-parse', 'main')).stdout.trim();
          repoState.pushedSha = pushedSha;
        }
      }

      mergeState.phase = 'phase2-complete';
      await writeStateFile(statePath, mergeState, 'merge-state');

      return {
        code: 0,
        payload: jsonOut(true, {
          message: 'Resume completed: all repositories merged and pushed',
          mergeState
        })
      };
    }

    // Normal flow (not resume)
    if (!planFile) {
      return {
        code: 3,
        payload: jsonOut(false, { error: '--plan <file> required' })
      };
    }

    const plan = await readPlan(planFile);
    const changedRepos = plan.repos.filter(r => r.status === 'changed');

    if (changedRepos.length === 0) {
      return {
        code: 0,
        payload: jsonOut(true, { message: 'No changed repositories' })
      };
    }

    // Preflight all changed repos
    progress('Running preflight checks...');
    const blockers = await runPreflight(plan, ROOT);
    if (blockers) {
      return {
        code: 3,
        payload: jsonOut(false, { error: 'Preflight failed', blockers })
      };
    }

    if (dryRun) {
      progress('--dry-run: simulating operations...');
      const phase1Steps = [];
      const phase2Steps = [];

      // Phase 1 steps
      for (const repo of changedRepos) {
        const steps = await executePhase1ForRepo(repo, plan, ROOT, true);
        phase1Steps.push({ repo: repo.name, steps });
      }

      // Sync barrier
      const changedRepoNames = changedRepos.map(r => r.name);
      const syncStep = await executeSyncBarrier(ROOT, plan.change, changedRepoNames, true);

      // Phase 2 steps
      for (const repo of changedRepos) {
        const phase2Result = await executePhase2ForRepo(repo, plan, ROOT, true);
        phase2Steps.push({ repo: repo.name, steps: phase2Result.steps });
      }

      return {
        code: 0,
        payload: jsonOut(true, {
          message: 'Dry-run completed (no mutations)',
          phase1Steps,
          syncBarrier: syncStep,
          phase2Steps
        })
      };
    }

    // Execute phase 1 for all changed repos (services in manifest order, root last)
    const stateDir = await ensureStateDir(ROOT, plan.change);

    const mergeState = {
      phase: 'phase1',
      change: plan.change,
      branchName: plan.branchName,
      repos: []
    };

    // Sort: root last
    const orderedRepos = [...changedRepos].sort((a, b) => {
      if (a.name === 'root') return 1;
      if (b.name === 'root') return -1;
      return 0;
    });

    // Phase 1: create branches, commit, push
    for (const repo of orderedRepos) {
      progress(`Phase 1: ${repo.name}...`);

      const repoState = {
        name: repo.name,
        stage: 'planned',
        head: repo.head,
        included: repo.included,
        foreign: repo.foreign
      };

      try {
        await executePhase1ForRepo(repo, plan, ROOT, false);
        repoState.stage = 'branch-pushed';
        progress(`✓ ${repo.name}: feature branch pushed`);
      } catch (error) {
        repoState.error = error.message;
        repoState.stage = 'failed';
        mergeState.repos.push(repoState);

        await writeStateFile(join(stateDir, 'merge-state.json'), mergeState, 'merge-state');
        return {
          code: 1,
          payload: jsonOut(false, {
            error: `Phase 1 failed for ${repo.name}`,
            mergeState,
            detail: error.message
          })
        };
      }

      mergeState.repos.push(repoState);
    }

    // Sync barrier
    progress('Phase 2: sync barrier...');
    const changedRepoNames = changedRepos.map(r => r.name);
    try {
      await executeSyncBarrier(ROOT, plan.change, changedRepoNames, false);
    } catch (error) {
      mergeState.phase = 'sync-failed';
      await writeStateFile(join(stateDir, 'merge-state.json'), mergeState, 'merge-state');
      return {
        code: 1,
        payload: jsonOut(false, {
          error: 'Sync barrier failed',
          mergeState,
          detail: error.message
        })
      };
    }

    // Mark all as synced
    for (const repoState of mergeState.repos) {
      repoState.stage = 'synced';
    }

    // Phase 2: merge and push main
    for (const repoState of mergeState.repos) {
      progress(`Phase 2: merging ${repoState.name}...`);
      
      const planRepo = plan.repos.find(r => r.name === repoState.name);
      const repoPath = repoState.name === 'root' ? ROOT : join(ROOT, 'services', repoState.name);
      
      // Record pre-merge main SHA
      const preMergeMain = (await git(repoPath, 'rev-parse', 'main')).stdout.trim();
      repoState.preMergeMain = preMergeMain;

      const phase2Result = await executePhase2ForRepo(planRepo, plan, ROOT, false);

      if (phase2Result.conflict) {
        repoState.stage = 'conflict';
        repoState.conflictFiles = phase2Result.files;
        mergeState.phase = 'phase2-partial';
        await writeStateFile(join(stateDir, 'merge-state.json'), mergeState, 'merge-state');

        return {
          code: 1,
          payload: jsonOut(false, {
            error: `Conflict in ${repoState.name}`,
            mergeState,
            conflictFiles: phase2Result.files,
            resumeCommand: `shipctl merge --resume --change ${plan.change}`
          })
        };
      }

      if (phase2Result.error) {
        // Push failed, but merge succeeded - record the merged SHA
        const mergedSha = (await git(repoPath, 'rev-parse', 'main')).stdout.trim();
        repoState.stage = 'merged';
        repoState.mergedSha = mergedSha;
        repoState.error = phase2Result.error;
        mergeState.phase = 'phase2-partial';
        await writeStateFile(join(stateDir, 'merge-state.json'), mergeState, 'merge-state');

        return {
          code: 1,
          payload: jsonOut(false, {
            error: `Phase 2 failed for ${repoState.name}`,
            mergeState,
            detail: phase2Result.error
          })
        };
      }

      const pushedSha = (await git(repoPath, 'rev-parse', 'main')).stdout.trim();
      repoState.stage = 'pushed';
      repoState.pushedSha = pushedSha;
      
      progress(`✓ ${repoState.name}: merged and pushed`);
    }

    // All phase 2 complete
    mergeState.phase = 'phase2-complete';
    await writeStateFile(join(stateDir, 'merge-state.json'), mergeState, 'merge-state');

    return {
      code: 0,
      payload: jsonOut(true, {
        message: 'Phase 2 complete: all repositories merged and pushed to main',
        mergeState
      })
    };
  } catch (error) {
    return {
      code: 2,
      payload: jsonOut(false, {
        error: error.message,
        stack: error.stack
      })
    };
  }
}
