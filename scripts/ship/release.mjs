/** Release is a separate approval gate; preview never fetches or changes refs. */
import { readFile, lstat, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { git, lsRemoteHeads, getOriginUrl, originIdentity, parseRemoteUrl } from './git.mjs';
import { digest } from './plan.mjs';
import { jsonOut, writeStateFile } from './common.mjs';

const canonical = name => name === 'root' ? '.' : name;
const validName = name => typeof name === 'string' && (name === '.' || /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name));
const validSha = sha => typeof sha === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(sha);
function options(args) {
  const result = { dryRun: false, change: null, repos: null, token: null };
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (seen.has(flag)) throw new Error('duplicate_argument');
    seen.add(flag);
    if (flag === '--dry-run') { result.dryRun = true; continue; }
    const key = { '--change': 'change', '--repos': 'repos', '--release-token': 'token' }[flag];
    if (!key || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('invalid_argument');
    result[key] = args[++i];
  }
  if (result.change && !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(result.change)) throw new Error('invalid_change');
  if (result.repos !== null) {
    const names = result.repos.split(',').map(n => canonical(n.trim()));
    if (names.some(n => !validName(n))) throw new Error('invalid_repo');
    result.repos = [...new Set(names)].sort();
  }
  if (!result.change && (!result.dryRun || !result.repos || result.token)) throw new Error('change_required');
  return result;
}

async function readState(ROOT, change) {
  const raw = await readFile(join(ROOT, '.qa/ship', change, 'merge-state.json'), 'utf8');
  const state = JSON.parse(raw);
  if (state.change !== change || !Array.isArray(state.repos) || !state.repos.length) throw new Error('invalid_merge_state');
  const names = new Set();
  const repos = state.repos.map(r => {
    const name = canonical(r.name);
    if (!validName(name) || names.has(name)) throw new Error('ambiguous_repo_identity');
    names.add(name);
    if (r.pushedSha && r.mainSha && r.pushedSha !== r.mainSha) throw new Error('ambiguous_main_sha');
    return { ...r, name, mainSha: r.pushedSha || r.mainSha };
  });
  if (state.phase !== 'phase2-complete' || repos.some(r => r.stage !== 'pushed' || !validSha(r.mainSha))) throw new Error('merge_incomplete');
  return { hash: digest(raw), repos };
}

/** Resolve only declared services, never paths supplied by the caller/state. */
async function declaredRepos(ROOT) {
  const text = await readFile(join(ROOT, 'services.manifest'), 'utf8');
  const names = new Set(['.']);
  for (const line of text.split('\n')) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) continue;
    const [name, url, extra] = clean.split(/\s+/);
    if (!validName(name) || name === '.' || name === 'root' || !url || extra || names.has(name)) throw new Error('invalid_manifest');
    names.add(name);
  }
  return names;
}

async function preview(ROOT, opts) {
  const state = opts.change ? await readState(ROOT, opts.change) : null;
  const names = await declaredRepos(ROOT);
  const repos = state?.repos || opts.repos.map(name => ({ name }));
  for (const name of [...repos.map(r => r.name), ...(opts.repos || [])]) {
    if (!names.has(name) || (state && !repos.some(r => r.name === name))) throw new Error('unknown_repo');
  }
  const plan = [], blockers = [];
  for (const repo of repos) {
    const row = { repo: repo.name, status: 'skipped', sha: repo.mainSha || null };
    plan.push(row);
    if (repo.name === '.') { row.status = 'not-applicable'; continue; }
    if (opts.repos && !opts.repos.includes(repo.name)) continue;
    const repoPath = join(ROOT, 'services', repo.name);
    const block = blocker => { row.status = 'blocked'; blockers.push({ repo: repo.name, blocker }); };
    try {
      if ((await lstat(join(ROOT, 'services'))).isSymbolicLink() || (await lstat(repoPath)).isSymbolicLink()) throw new Error('invalid_clone');
      const top = git(repoPath, 'rev-parse', '--show-toplevel');
      if (top.status !== 0 || await realpath(top.stdout.trim()) !== await realpath(repoPath)) throw new Error('invalid_clone');
      const originUrl = getOriginUrl(repoPath);
      if (!originUrl) throw new Error('missing_origin');
      row.origin = originIdentity(originUrl, repoPath);
      const pushes = git(repoPath, 'remote', 'get-url', '--push', '--all', 'origin');
      if (pushes.status !== 0) throw new Error('remote_probe_failed');
      row.pushOrigins = pushes.stdout.trim().split('\n').map(url => originIdentity(url, repoPath));
      if (row.pushOrigins.length !== 1 || row.pushOrigins[0] !== row.origin) throw new Error('push_origin_mismatch');
      const heads = lsRemoteHeads(repoPath);
      row.remoteMain = heads.get('main') || null;
      row.remoteRelease = heads.get('release') || null;
      if (!row.remoteMain) throw new Error('main_missing');
      if (state && row.remoteMain !== repo.mainSha) throw new Error('main_moved');
      row.sha = row.remoteMain;
      if (!row.remoteRelease) { row.status = 'no-release-branch'; continue; }
      if (row.remoteRelease === row.sha) { row.status = 'noop'; continue; }
      const ancestor = git(repoPath, 'merge-base', '--is-ancestor', row.remoteRelease, row.sha);
      if (ancestor.status === 0) { row.status = 'ff'; continue; }
      // Unknown remote objects must never be fetched as a side effect of preview.
      if (ancestor.status !== 1) throw new Error('ancestry_unavailable');
      const commits = git(repoPath, 'log', '--format=%H', `${row.sha}..${row.remoteRelease}`);
      row.status = 'diverged';
      blockers.push({ repo: repo.name, blocker: 'release_diverged', commits: commits.stdout.trim().split('\n').filter(Boolean) });
    } catch (e) {
      const safe = ['invalid_clone', 'missing_origin', 'remote_probe_failed', 'push_origin_mismatch', 'main_missing', 'main_moved', 'ancestry_unavailable'];
      block(safe.includes(e.message) ? e.message : 'release_probe_failed');
    }
  }
  const material = { version: 1, change: opts.change, subset: opts.repos, mergeStateHash: state?.hash || null, plan };
  const result = { ...material, blockers };
  if (state && !blockers.length) result.RELEASE_TOKEN = digest(material);
  return result;
}

export async function release(args, { ROOT }) {
  let mutating = false;
  try {
    const opts = options(args);
    const current = await preview(ROOT, opts);
    if (current.blockers.length) return { code: 3, payload: jsonOut(false, current) };
    // A missing approval is always a safe preview/stop, not implicit permission.
    if (opts.dryRun || !opts.token) return { code: 0, payload: jsonOut(true, {
      ...current, dryRun: true, release_pending: !!opts.change
    }) };
    if (opts.token !== current.RELEASE_TOKEN) return { code: 3, payload: jsonOut(false, { error: 'release_plan_stale', ...current }) };

    const statePath = join(ROOT, '.qa/ship', opts.change, 'release-state.json');
    const state = { change: opts.change, repos: current.plan.map(r => ({
      repo: r.repo, status: r.status === 'ff' ? 'untouched' : r.status, sha: r.sha
    })) };
    // Publish the full table before pushing, then persist every success/failure.
    mutating = true;
    await writeStateFile(statePath, state, 'release-state');
    for (const row of current.plan) {
      if (row.status !== 'ff') continue;
      const result = state.repos.find(r => r.repo === row.repo);
      const repoPath = join(ROOT, 'services', row.repo);
      const push = git(repoPath, 'push', 'origin', `${row.sha}:refs/heads/release`);
      if (push.status !== 0) {
        result.status = 'push_failed';
        result.error = 'release_push_failed';
        state.stopped = true;
        await writeStateFile(statePath, state, 'release-state');
        return { code: 1, payload: jsonOut(false, state) };
      }
      result.status = 'pushed';
      const ownerRepo = row.origin.startsWith('/') ? null : parseRemoteUrl(`https://${row.origin}`);
      result.ownerRepo = ownerRepo ? `${ownerRepo.owner}/${ownerRepo.repo}` : null;
      await writeStateFile(statePath, state, 'release-state');
    }
    return { code: 0, payload: jsonOut(true, state) };
  } catch (e) {
    if (mutating) return { code: 1, payload: jsonOut(false, { error: 'release_state_or_execution_failed', stopped: true }) };
    const safe = ['duplicate_argument', 'invalid_argument', 'invalid_change', 'invalid_repo', 'change_required', 'invalid_merge_state',
      'ambiguous_repo_identity', 'ambiguous_main_sha', 'merge_incomplete', 'invalid_manifest', 'unknown_repo'];
    return { code: 3, payload: jsonOut(false, { error: safe.includes(e.message) ? e.message : 'release_input_or_probe_failed' }) };
  }
}
