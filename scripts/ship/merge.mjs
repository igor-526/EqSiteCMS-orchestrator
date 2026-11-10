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

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Ajv from 'ajv';
import { digest, fileSafety, inventorySafety, parseManifest } from './plan.mjs';
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
    planToken: null,
    error: null,
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
    } else if (args[i] === '--plan-token') {
      const token = args[++i];
      if (opts.planToken !== null || !/^[a-f0-9]{64}$/.test(token || '')) opts.error = 'invalid_plan_token';
      opts.planToken = token;
    } else if (args[i].startsWith('--plan-token=')) {
      opts.error = 'invalid_plan_token';
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
  const repoPath = isRoot(repo.name) ? ROOT : join(ROOT, 'services', repo.name);
  
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
  const mergeFilesResult = await git(repoPath, 'diff', '--no-renames', '--name-only', '-z', 'HEAD^1', 'HEAD');
  const mergeFiles = mergeFilesResult.stdout.split('\0').filter(Boolean);
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
const isRoot = name => name === '.' || name === 'root';
const repoPathFor = (ROOT, name) => isRoot(name) ? ROOT : join(ROOT, 'services', name);
const checked = (cwd, ...args) => {
  const result = git(cwd, '--no-optional-locks', ...args);
  if (result.status !== 0) throw new Error('git_probe_failed');
  return result.stdout;
};

async function readPlan(planFile) {
  const plan = JSON.parse(await readFile(planFile, 'utf8'));
  const schema = JSON.parse(await readFile(new URL('./schemas/plan.json', import.meta.url), 'utf8'));
  if (!new Ajv({ strict: true }).validate(schema, plan)) throw new Error('plan_stale');
  const { PLAN_TOKEN, ...material } = plan;
  if (PLAN_TOKEN !== digest(material)) throw new Error('plan_stale');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(plan.change)) throw new Error('plan_stale');
  if (Object.hasOwn(plan.repos, '.') && Object.hasOwn(plan.repos, 'root')) throw new Error('plan_stale');
  if (plan.hasBlockers || plan.blockers.length || Object.values(plan.repos).some(r => r.blockers.length)) throw new Error('plan_stale');
  for (const data of Object.values(plan.repos)) {
    const { fingerprint, ...rest } = data;
    if (fingerprint !== digest({ ...rest, branchName: plan.branchName }) ||
        !data.statusHash || !data.indexHash ||
        (data.status === 'changed') !== (data.included.length > 0)) throw new Error('plan_stale');
  }
  plan.repos = Object.entries(plan.repos).map(([name, data]) => ({ ...data, name: isRoot(name) ? '.' : name }));
  plan.inventory = plan.inventory.map(r => ({ ...r, name: isRoot(r.name) ? '.' : r.name }));
  return plan;
}

/** Read-only, whole-inventory validation. The dispatcher holds the common flock. */
async function runPreflight(plan, ROOT) {
  const blockers = [];
  const stale = (repo, detail) => blockers.push({ repo, blocker: 'plan_stale', detail });
  let manifest;
  try {
    manifest = await parseManifest(ROOT);
    // A symlinked services parent is not an inventory boundary.
    const { lstat } = await import('node:fs/promises');
    if ((await lstat(join(ROOT, 'services')).catch(e => { if (e.code === 'ENOENT') return null; throw e; }))?.isSymbolicLink()) throw new Error('invalid_inventory');
  } catch { return [{ blocker: 'plan_stale', detail: 'inventory_invalid' }]; }
  const names = ['.', ...Object.keys(manifest)];
  if (digest([...plan.repos.map(r => r.name)].sort()) !== digest([...names].sort()) ||
      digest(plan.inventory.map(r => r.name).sort()) !== digest([...names].sort())) {
    return [{ blocker: 'plan_stale', detail: 'inventory_changed' }];
  }
  if (['main', 'release', 'dev'].includes(plan.branchName) || plan.branchName.startsWith('-') ||
      /[\x00-\x1f\x7f]/.test(plan.branchName) ||
      git(ROOT, 'check-ref-format', `refs/heads/${plan.branchName}`).status !== 0) {
    return [{ blocker: 'plan_stale', detail: 'invalid_branch' }];
  }
  for (const name of names) {
    const repo = plan.repos.find(r => r.name === name);
    const repoPath = repoPathFor(ROOT, name);
    try {
      const safety = await inventorySafety(repoPath, manifest[name]);
      for (const blocker of safety.blockers) blockers.push({ repo: name, blocker });
      if (safety.blockers.includes('missing_or_invalid_clone')) continue;
      if (repo.path !== repoPath) stale(name, 'repository_path_changed');
      for (const key of ['head', 'branch', 'origin', 'pushOrigins', 'remoteHeads']) {
        if (digest(repo[key]) !== digest(safety[key])) stale(name, `${key}_changed`);
      }
      if (plan.inventory.find(r => r.name === name).origin !== safety.origin) stale(name, 'inventory_origin_changed');
      const status = checked(repoPath, 'status', '--porcelain=v1', '-z', '--untracked-files=all');
      if (repo.statusHash !== digest(status)) stale(name, 'status_changed');
      if (repo.indexHash !== digest(checked(repoPath, 'ls-files', '--stage', '-z'))) stale(name, 'index_changed');
      for (const file of [...repo.included, ...repo.foreign]) {
        if (digest(await fileSafety(repoPath, file.path, file.status)) !== digest(file)) stale(name, 'file_changed');
      }
      const included = new Set(repo.included.map(f => f.path));
      const staged = checked(repoPath, 'diff', '--cached', '--no-renames', '--name-only', '-z').split('\0').filter(Boolean);
      if (staged.some(file => !included.has(file))) blockers.push({ repo: name, blocker: 'foreign_staged' });
      if (repo.status === 'changed' && (git(repoPath, 'show-ref', '--verify', '--quiet', `refs/heads/${plan.branchName}`).status === 0 ||
          Object.hasOwn(safety.remoteHeads, plan.branchName))) stale(name, 'branch_occupied');
      // Strict sync may update untouched clones: refuse overlaps with any dirty path.
      if (safety.head && safety.remoteHeads.main && safety.head !== safety.remoteHeads.main) {
        const upstream = checked(repoPath, 'diff', '--name-only', '-z', safety.head, safety.remoteHeads.main).split('\0').filter(Boolean);
        const dirty = [...repo.included, ...repo.foreign, ...repo.excluded].map(f => f.path);
        if (upstream.some(p => dirty.some(f => f === p || f.startsWith(p + '/') || p.startsWith(f + '/')))) blockers.push({ repo: name, blocker: 'unsafe_dirty_sync' });
      }
    } catch { stale(name, 'safety_probe_failed'); }
  }
  // The execution order remains manifest order, with root moved last by phase 1.
  plan.repos.sort((a, b) => names.indexOf(a.name) - names.indexOf(b.name));
  return blockers.length ? blockers : null;
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
    stdio: ['ignore', 2, 2]
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
    
    if (!failedRepos.length) throw new Error('Sync failed without a usable failure report');
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
async function executePhase2ForRepo(repo, plan, ROOT, dryRun = false, checkpoint = async () => {}) {
  const repoPath = isRoot(repo.name) ? ROOT : join(ROOT, 'services', repo.name);
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
        const conflictResult = await git(repoPath, 'diff', '--name-only', '-z', '--diff-filter=U');
        const conflictedFiles = conflictResult.stdout.split('\0').filter(Boolean);
        
        return { conflict: true, files: conflictedFiles };
      }
      
      return { failed: true, error: `Merge failed: ${mergeResult.stderr}` };
    }
  }

  if (!dryRun) await checkpoint();

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
async function executePhase1ForRepo(repo, plan, ROOT, dryRun = false, checkpoint = async () => {}) {
  const repoPath = isRoot(repo.name) ? ROOT : join(ROOT, 'services', repo.name);
  const steps = [];

  const branchName = plan.branchName;
  const commitMessage = plan.commitMessage.subject;
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
  // Already-staged deletions (including rename sources) no longer exist in
  // either the index or worktree. Their deletion is already staged; passing
  // such a path to git add would fail. Other paths are staged whole-file.
  const includedPaths = (repo.included || [])
    .filter(f => !(f.blobHash === null && f.indexHash === digest('')))
    .map(f => f.path);
  if (includedPaths.length > 0) {
    steps.push({ cmd: 'git', args: ['--literal-pathspecs', 'add', '-A', '--', ...includedPaths] });
    if (!dryRun) {
      const addResult = await git(repoPath, '--literal-pathspecs', 'add', '-A', '--', ...includedPaths);
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

  if (!dryRun) await checkpoint('committed');

  // Step 4: git switch main
  steps.push({ cmd: 'git', args: ['switch', 'main'] });
  if (!dryRun) {
    const switchMainResult = await git(repoPath, 'switch', 'main');
    if (switchMainResult.status !== 0) {
      throw new Error(`Failed to switch to main: ${switchMainResult.stderr}`);
    }
  }

  if (!dryRun) await checkpoint('switched');

  // Step 5: git push origin <branch>
  steps.push({ cmd: 'git', args: ['push', 'origin', branchName] });
  if (!dryRun) {
    const pushResult = await git(repoPath, 'push', 'origin', branchName);
    if (pushResult.status !== 0) {
      throw new Error(`push origin ${branchName} failed: ${pushResult.stderr}`);
    }
  }

  if (!dryRun) await checkpoint('branch-pushed');
  return steps;
}

async function checkpointRepo(ROOT, repo) {
  const cwd = repoPathFor(ROOT, repo.name);
  repo.checkpointHead = checked(cwd, 'rev-parse', 'HEAD').trim();
  repo.checkpointBranch = checked(cwd, 'branch', '--show-current').trim();
}

function stopped(mergeState, error, detail) {
  return { code: 1, payload: jsonOut(false, {
    error, detail, mergeState, stopped: true,
    resumeCommand: `shipctl merge --resume --change ${mergeState.change}`
  }) };
}

async function finishPhase2(ROOT, plan, state, statePath) {
  for (const repo of state.repos) {
    const cwd = repoPathFor(ROOT, repo.name);
    if (repo.stage === 'pushed') continue;
    state.phase = 'phase2-partial';
    try {
      if (repo.stage === 'merged') {
        const push = git(cwd, 'push', 'origin', 'main');
        if (push.status !== 0) throw new Error(`push origin main failed: ${push.stderr}`);
      } else {
        repo.preMergeMain = checked(cwd, 'rev-parse', 'main').trim();
        await writeStateFile(statePath, state, 'merge-state');
        const result = await executePhase2ForRepo(repo, plan, ROOT, false, async () => {
          repo.stage = 'merged';
          repo.mergedSha = checked(cwd, 'rev-parse', 'main').trim();
          await checkpointRepo(ROOT, repo);
          await writeStateFile(statePath, state, 'merge-state');
        });
        if (result.conflict) {
          repo.stage = 'conflict';
          repo.conflictFiles = result.files;
          await checkpointRepo(ROOT, repo);
          await writeStateFile(statePath, state, 'merge-state');
          const response = stopped(state, `Conflict in ${repo.name}`);
          response.payload.conflictFiles = result.files;
          return response;
        }
        if (result.error) {
          if (result.failed) {
            repo.lastSuccessfulStage = repo.stage;
            repo.stage = 'failed';
          }
          throw new Error(result.error);
        }
      }
      repo.stage = 'pushed';
      repo.pushedSha = checked(cwd, 'rev-parse', 'main').trim();
      delete repo.error;
      await checkpointRepo(ROOT, repo);
      await writeStateFile(statePath, state, 'merge-state');
    } catch (error) {
      repo.error = error.message;
      await checkpointRepo(ROOT, repo);
      await writeStateFile(statePath, state, 'merge-state');
      return stopped(state, `Phase 2 failed for ${repo.name}`, error.message);
    }
  }
  state.phase = 'phase2-complete';
  await writeStateFile(statePath, state, 'merge-state');
  return { code: 0, payload: jsonOut(true, {
    message: 'Phase 2 complete: all repositories merged and pushed to main', mergeState: state
  }) };
}

async function resumeMerge(ROOT, change, dryRun) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(change)) {
    return { code: 3, payload: jsonOut(false, { error: 'invalid_change' }) };
  }
  const statePath = join(ROOT, '.qa/ship', change, 'merge-state.json');
  let state, plan;
  try {
    plan = await readPlan(join(ROOT, '.qa/ship', change, 'plan.json'));
    state = JSON.parse(await readFile(statePath, 'utf8'));
    const schema = JSON.parse(await readFile(new URL('./schemas/merge-state.json', import.meta.url), 'utf8'));
    if (!new Ajv({ strict: true }).validate(schema, state)) throw new Error('invalid_state');
    if (state.version !== 2 || state.change !== change || plan.change !== change ||
        state.branchName !== plan.branchName || state.planToken !== plan.PLAN_TOKEN) throw new Error('state_mismatch');
    const names = state.repos.map(r => isRoot(r.name) ? '.' : r.name);
    const expected = plan.repos.filter(r => r.status === 'changed').map(r => r.name);
    if (new Set(names).size !== names.length || digest([...names].sort()) !== digest(expected.sort())) throw new Error('state_mismatch');
    state.repos.forEach((r, i) => { r.name = names[i]; });
  } catch {
    return { code: 3, payload: jsonOut(false, { error: 'plan_stale',
      blockers: [{ blocker: 'state_mismatch', detail: 'Replan required for legacy/incomplete plan; review existing partial state manually' }] }) };
  }
  const blockers = [];
  const block = (name, detail) => blockers.push({ repo: name, blocker: 'state_mismatch', detail });
  if (state.phase === 'phase2-complete' || state.phase === 'phase1' || state.repos.some(r =>
      !['merged', 'pushed', 'conflict', 'synced', 'branch-pushed'].includes(r.stage))) {
    block('.', 'No resumable phase-2 work; review failed phase-1 locally, never retry automatically');
  }
  try {
    const manifest = await parseManifest(ROOT);
    const { lstat } = await import('node:fs/promises');
    if ((await lstat(join(ROOT, 'services'))).isSymbolicLink()) throw new Error('invalid_inventory');
    const names = ['.', ...Object.keys(manifest)];
    if (digest([...names].sort()) !== digest(plan.repos.map(r => r.name).sort())) block('.', 'inventory_changed');
    for (const name of names) {
      const original = plan.repos.find(r => r.name === name);
      if (!original) { block(name, 'inventory_changed'); continue; }
      const cwd = repoPathFor(ROOT, name);
      const safety = await inventorySafety(cwd, manifest[name]);
      const repo = state.repos.find(r => r.name === name);
      if (safety.origin !== original.origin || digest(safety.pushOrigins) !== digest(original.pushOrigins)) block(name, 'origin_changed');
      // Local main may be ahead after a failed push; no other operation blocker
      // is waived. A pending conflict is inspected below without modifying it.
      const allowed = new Set();
      if (repo && safety.remoteHeads.main && git(cwd, 'merge-base', '--is-ancestor', safety.remoteHeads.main, safety.head).status === 0) allowed.add('main_ahead_or_diverged');
      if (repo?.stage === 'conflict' && git(cwd, 'rev-parse', '--verify', 'MERGE_HEAD').status === 0 &&
          safety.blockers.filter(b => b === 'operation_in_progress').length === 1) allowed.add('operation_in_progress');
      if (safety.blockers.some(b => !allowed.has(b))) block(name, 'unsafe_repository');
      if (!repo) {
        if (safety.head !== original.head || safety.branch !== 'main' ||
            digest(checked(cwd, 'status', '--porcelain=v1', '-z', '--untracked-files=all')) !== original.statusHash ||
            digest(checked(cwd, 'ls-files', '--stage', '-z')) !== original.indexHash) block(name, 'untouched_repository_changed');
        continue;
      }
      if (checked(cwd, 'branch', '--show-current').trim() !== 'main') block(name, 'branch_changed');
      if (checked(cwd, 'rev-parse', plan.branchName).trim() !== repo.featureSha || safety.remoteHeads[plan.branchName] !== repo.featureSha) block(name, 'feature_changed');
      if (repo.stage === 'conflict') {
        const result = await detectResumeState({ ...repo, included: original.included }, plan, ROOT);
        if (!result.valid) blockers.push({ repo: name, ...result });
        else {
          repo.stage = 'merged';
          repo.mergedSha = checked(cwd, 'rev-parse', 'HEAD').trim();
          await checkpointRepo(ROOT, repo);
        }
      } else if (safety.head !== repo.checkpointHead || safety.branch !== repo.checkpointBranch) block(name, 'head_or_branch_changed');
      const dirty = [...checked(cwd, 'diff', '--name-only', '-z', 'HEAD').split('\0'),
        ...checked(cwd, 'ls-files', '--others', '--exclude-standard', '-z').split('\0')].filter(Boolean);
      if (repo.stage !== 'conflict' && dirty.some(p => !original.foreign.some(f => f.path === p))) block(name, 'worktree_changed');
      if (repo.stage !== 'conflict' && checked(cwd, 'diff', '--cached', '--name-only', '-z')) block(name, 'index_changed');
      // Foreign worktree/index bytes must still match the approved plan.
      for (const file of original.foreign) {
        if (digest(await fileSafety(cwd, file.path, file.status)) !== digest(file)) block(name, 'foreign_changed');
      }
      if (repo.stage === 'pushed' && safety.remoteHeads.main !== repo.pushedSha) block(name, 'remote_main_changed');
      if (repo.stage !== 'pushed' && safety.remoteHeads.main !== repo.preMergeMain &&
          safety.remoteHeads.main !== repo.checkpointHead) block(name, 'remote_main_changed');
    }
  } catch { block('.', 'resume_probe_failed'); }
  if (blockers.length) return { code: 3, payload: jsonOut(false, { error: 'Resume validation failed', blockers }) };
  if (dryRun) return { code: 0, payload: jsonOut(true, { message: 'Resume validated (no mutations)', mergeState: state }) };
  await writeStateFile(statePath, state, 'merge-state');
  try {
    await executeSyncBarrier(ROOT, change, state.repos.map(r => r.name), false);
  } catch (error) {
    state.phase = 'sync-failed';
    await writeStateFile(statePath, state, 'merge-state');
    return stopped(state, 'Sync barrier failed', error.message);
  }
  return await finishPhase2(ROOT, plan, state, statePath);
}

/**
 * Main merge command handler.
 */
export async function merge(args, context) {
  const { ROOT } = context;

  try {
    const opts = parseMergeArgs(args);
    const { dryRun, planFile, planToken, resume, change } = opts;
    if (opts.error || (resume && planToken !== null)) {
      return { code: 3, payload: jsonOut(false, { error: opts.error || 'plan_token_not_allowed_with_resume' }) };
    }

    // Handle --resume
    if (resume) {
      if (!change) {
        return {
          code: 3,
          payload: jsonOut(false, { error: '--change <name> required with --resume' })
        };
      }

      return await resumeMerge(ROOT, change, dryRun);
    }

    // Normal flow (not resume)
    if (!planFile) {
      return {
        code: 3,
        payload: jsonOut(false, { error: '--plan <file> required' })
      };
    }

    let plan;
    try { plan = await readPlan(planFile); } catch {
      return { code: 3, payload: jsonOut(false, { error: 'plan_stale', blockers: [{ blocker: 'plan_stale', detail: 'Replan required: invalid or incomplete safety material' }] }) };
    }
    // The dispatcher holds the common flock here. Compare the caller's approval
    // with the very same validated in-memory plan that execution will consume;
    // a read-only replan can replace the path even while this lock is held.
    // Omission preserves the historical direct CLI (explicit operator action).
    if (planToken !== null && planToken !== plan.PLAN_TOKEN) {
      return { code: 3, payload: jsonOut(false, { error: 'plan_approval_mismatch' }) };
    }
    // Preflight the whole manifest inventory
    progress('Running preflight checks...');
    const blockers = await runPreflight(plan, ROOT);
    if (blockers) {
      return {
        code: 3,
        payload: jsonOut(false, { error: 'Preflight failed', blockers })
      };
    }

    // Preflight established current manifest order; root executes last.
    const changedRepos = plan.repos.filter(r => r.status === 'changed')
      .sort((a, b) => Number(isRoot(a.name)) - Number(isRoot(b.name)));

    if (changedRepos.length === 0) {
      return {
        code: 0,
        payload: jsonOut(true, { message: 'No changed repositories' })
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

    const statePath = join(stateDir, 'merge-state.json');
    // Persist the complete table before touching any clone. Later rows remain
    // untouched on phase-1 failure; no failed command is retried automatically.
    const mergeState = {
      version: 2, planToken: plan.PLAN_TOKEN,
      phase: 'phase1', change: plan.change, branchName: plan.branchName,
      repos: changedRepos.map(repo => ({
        name: repo.name, stage: 'untouched', head: repo.head,
        included: repo.included, foreign: repo.foreign,
        checkpointHead: repo.head, checkpointBranch: 'main'
      }))
    };
    await writeStateFile(statePath, mergeState, 'merge-state');
    for (const repoState of mergeState.repos) {
      const repo = changedRepos.find(r => r.name === repoState.name);
      const repoPath = repoPathFor(ROOT, repo.name);
      repoState.stage = 'planned';
      await writeStateFile(statePath, mergeState, 'merge-state');
      try {
        await executePhase1ForRepo(repo, plan, ROOT, false, async stage => {
          repoState.stage = stage;
          repoState.featureSha = checked(repoPath, 'rev-parse', plan.branchName).trim();
          await checkpointRepo(ROOT, repoState);
          await writeStateFile(statePath, mergeState, 'merge-state');
        });
      } catch (error) {
        repoState.lastSuccessfulStage = repoState.stage;
        repoState.stage = 'failed';
        repoState.error = error.message;
        await checkpointRepo(ROOT, repoState);
        await writeStateFile(statePath, mergeState, 'merge-state');
        return stopped(mergeState, `Phase 1 failed for ${repo.name}`, error.message);
      }
    }

    // Sync barrier
    progress('Phase 2: sync barrier...');
    const changedRepoNames = changedRepos.map(r => r.name);
    try {
      await executeSyncBarrier(ROOT, plan.change, changedRepoNames, false);
    } catch (error) {
      mergeState.phase = 'sync-failed';
      await writeStateFile(join(stateDir, 'merge-state.json'), mergeState, 'merge-state');
      return stopped(mergeState, 'Sync barrier failed', error.message);
    }

    for (const repoState of mergeState.repos) {
      repoState.stage = 'synced';
      await checkpointRepo(ROOT, repoState);
    }
    await writeStateFile(statePath, mergeState, 'merge-state');
    return await finishPhase2(ROOT, plan, mergeState, statePath);

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
