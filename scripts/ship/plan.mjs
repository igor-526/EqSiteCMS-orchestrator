/** Read-only planning with literal selection and approval-bound safety material. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureStateDir, jsonOut, progress, writeStateFile } from './common.mjs';
import { git, parseStatusPorcelain, currentBranch, currentHead, refExists,
  lsRemoteHeads, getOriginUrl, parseRemoteUrl, originIdentity } from './git.mjs';

export const PLAN_VERSION = 2;
export const digest = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const exists = async p => { try { await fs.lstat(p); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };
const checked = (cwd, ...args) => {
  const r = git(cwd, ...args);
  if (r.status !== 0) throw new Error('git_probe_failed');
  return r.stdout;
};

function literalPath(value) {
  if (!value || /[\0\r\n*?\[\]\\]/.test(value) || path.isAbsolute(value) || value.split('/').some(x => x === '..' || x === '.' || x === '.git') || value.startsWith(':')) throw new Error('invalid_literal_path');
  return value;
}

export async function parseManifest(root) {
  const result = {};
  for (const line of (await fs.readFile(path.join(root, 'services.manifest'), 'utf8')).split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const fields = line.trim().split(/\s+/);
    const [name, url] = fields;
    if (fields.length !== 2 || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name) || Object.hasOwn(result, name)) throw new Error('invalid_manifest');
    result[name] = url;
  }
  return result;
}

async function readPathsFile(file) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(await fs.readFile(file));
  return text.split('\n').filter(x => x !== '').map(literalPath);
}

async function collectDeclaredPaths(options) {
  const { root, change, pathsFile, include, exclude, task } = options;
  const declared = new Set();
  
  // From --paths-file
  if (pathsFile) {
    const paths = await readPathsFile(pathsFile);
    for (const p of paths) {
      if (!exclude.has(p)) {
        declared.add(p);
      }
    }
  }
  
  // Auto-paths: change directories
  declared.add(`openspec/changes/${change}/`);
  
  // Check if change is archived
  const archiveDir = path.join(root, 'openspec/changes/archive');
  try {
    const archiveEntries = await fs.readdir(archiveDir);
    for (const entry of archiveEntries) {
      if (entry.endsWith(`-${change}`)) {
        declared.add(`openspec/changes/archive/${entry}/`);
      }
    }
  } catch {
    // Archive dir doesn't exist yet
  }
  
  // Auto-paths: specs from change
  try {
    const changeSpecsDir = path.join(root, `openspec/changes/${change}/specs`);
    const specEntries = await fs.readdir(changeSpecsDir);
    for (const capability of specEntries) {
      declared.add(`openspec/specs/${capability}/`);
    }
  } catch {
    // No specs dir
  }
  
  // --task file
  if (task) {
    declared.add(task);
  }
  
  // --include
  for (const p of include) {
    if (!exclude.has(p)) {
      declared.add(p);
    }
  }
  
  return declared;
}


function denied(file) {
  const base = path.posix.basename(file).toLowerCase();
  if (/^\.env(?:\.|$)/.test(base) && !['.env.example', '.env.sample', '.env.template'].includes(base)) return true;
  return /^(?:credentials(?:\..+)?\.json|id_rsa|id_ed25519|\.npmrc|\.netrc)$/.test(base) || /\.(?:key|p12|pfx)$/.test(base) || /(?:^|\/)dsh\/.*(?:auth|credential)/i.test(file);
}

async function checkBoundary(repoPath, file) {
  literalPath(file);
  const segments = file.split('/').filter(Boolean);
  let parent = repoPath;
  for (const part of segments.slice(0, -1)) {
    parent = path.join(parent, part);
    if (await exists(parent)) {
      if ((await fs.lstat(parent)).isSymbolicLink()) throw new Error('symlink_parent');
      if (await exists(path.join(parent, '.git'))) throw new Error('nested_repository');
    }
  }
  const final = path.join(repoPath, file);
  if (await exists(final) && (await fs.lstat(final)).isDirectory() && await exists(path.join(final, '.git'))) throw new Error('nested_repository');
}

async function selectors(root, manifest, declared, exclude) {
  const result = [];
  for (const raw of declared) {
    literalPath(raw);
    const parts = raw.replace(/\/$/, '').split('/');
    let repo = '.', file = raw;
    if (parts[0] === 'services') {
      if (!Object.hasOwn(manifest, parts[1])) throw new Error('unknown_repository_selector');
      repo = parts[1]; file = parts.slice(2).join('/') + (parts.length > 2 && raw.endsWith('/') ? '/' : '');
    }
    const repoPath = repo === '.' ? root : path.join(root, 'services', repo);
    if (file) await checkBoundary(repoPath, file);
    const stat = await fs.lstat(path.join(repoPath, file)).catch(e => { if (e.code === 'ENOENT') return null; throw e; });
    const directory = !file || raw.endsWith('/') || !!stat?.isDirectory();
    if (file === '.qa' || file.startsWith('.qa/')) throw new Error('excluded_qa');
    if (!directory && denied(file)) throw new Error('credential_path_denied');
    result.push({ repo, file: file.replace(/\/$/, ''), directory });
  }
  for (const p of exclude) literalPath(p);
  return result;
}

function selected(repo, file, declared, exclude) {
  const full = repo === '.' ? file : `services/${repo}/${file}`;
  if ([...exclude].some(x => full === x || full.startsWith(x.replace(/\/$/, '') + '/'))) return false;
  return declared.some(s => s.repo === repo && (file === s.file || (s.directory && (!s.file || file.startsWith(s.file + '/')))));
}

const placeholder = value => /^(?:|example.*|sample.*|placeholder.*|changeme|replace[_-]?me|your[_-].*|xxx+|\$\{.*\}|<.*>|none|null)$/i.test(value);
async function scanContent(repoPath, file) {
  const target = path.join(repoPath, file);
  if (!await exists(target) || (await fs.lstat(target)).isSymbolicLink()) return [];
  const content = await fs.readFile(target, 'utf8');
  const rules = [];
  if (/-----BEGIN (?:[A-Z0-9 ]* )?PRIVATE KEY-----/.test(content)) rules.push('private_key');
  const assignment = /\b(?:[A-Z0-9_]*TOKEN|[A-Z0-9_]*PASSWORD|SECRET_KEY|SERVICE_KEY)["']?\s*[:=]\s*["']?([^\s"'#,;]+)/gi;
  for (const match of content.matchAll(assignment)) if (!placeholder(match[1])) { rules.push('secret_assignment'); break; }
  return rules;
}

/** Whole working-tree bytes (symlink target bytes, never dereferenced), plus exact index. */
export async function fileSafety(repoPath, file, status) {
  await checkBoundary(repoPath, file);
  const target = path.join(repoPath, file);
  let blobHash = null, mode = null;
  if (await exists(target)) {
    const stat = await fs.lstat(target);
    if (!stat.isFile() && !stat.isSymbolicLink()) throw new Error('unsupported_file');
    const bytes = stat.isSymbolicLink() ? Buffer.from(await fs.readlink(target)) : await fs.readFile(target);
    // git's object algorithm is SHA-1 or SHA-256 according to repository format.
    const format = checked(repoPath, 'rev-parse', '--show-object-format').trim();
    blobHash = crypto.createHash(format).update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
    mode = stat.isSymbolicLink() ? '120000' : stat.mode & 0o111 ? '100755' : '100644';
  }
  const index = checked(repoPath, '--literal-pathspecs', 'ls-files', '--stage', '-z', '--', file);
  return { path: file, status, blobHash, mode, indexHash: digest(index), statusHash: digest(status) };
}

export async function inventorySafety(repoPath, expectedOrigin) {
  const blockers = [];
  if (await exists(repoPath) && (await fs.lstat(repoPath)).isSymbolicLink()) return { branch: null, head: null, origin: null, pushOrigins: [], remoteHeads: {}, blockers: ['missing_or_invalid_clone'] };
  const top = git(repoPath, 'rev-parse', '--show-toplevel');
  if (top.status !== 0 || await fs.realpath(repoPath).catch(() => null) !== await fs.realpath(top.stdout.trim()).catch(() => null)) {
    return { branch: null, head: null, origin: null, pushOrigins: [], remoteHeads: {}, blockers: ['missing_or_invalid_clone'] };
  }
  const branch = currentBranch(repoPath), head = currentHead(repoPath);
  if (!branch || branch === 'HEAD') blockers.push('detached_head');
  else if (branch !== 'main') blockers.push('not_on_main');
  for (const marker of ['MERGE_HEAD', 'rebase-merge', 'rebase-apply', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'sequencer', 'BISECT_LOG']) {
    const p = checked(repoPath, 'rev-parse', '--git-path', marker).trim();
    if (await exists(path.resolve(repoPath, p))) blockers.push('operation_in_progress');
  }
  const originUrl = getOriginUrl(repoPath);
  const origin = originUrl ? originIdentity(originUrl, repoPath) : null;
  let remoteHeads = {};
  let pushOrigins = [];
  if (!origin) blockers.push('missing_origin');
  else {
    pushOrigins = checked(repoPath, 'remote', 'get-url', '--push', '--all', 'origin').trim().split('\n').map(url => originIdentity(url, repoPath));
    if (pushOrigins.length !== 1 || pushOrigins[0] !== origin) blockers.push('push_origin_mismatch');
    if (expectedOrigin && origin !== originIdentity(expectedOrigin, repoPath)) blockers.push('origin_mismatch');
    try { remoteHeads = Object.fromEntries([...lsRemoteHeads(repoPath)].sort(([a], [b]) => a.localeCompare(b))); }
    catch { blockers.push('remote_probe_failed'); }
  }
  if (!remoteHeads.main) blockers.push('missing_remote_main');
  if (!refExists(repoPath, 'refs/heads/main')) blockers.push('missing_main');
  if (branch === 'main' && remoteHeads.main && head !== remoteHeads.main) {
    const ancestor = git(repoPath, 'merge-base', '--is-ancestor', head, remoteHeads.main);
    if (ancestor.status !== 0) blockers.push('main_ahead_or_diverged');
  }
  return { branch, head, origin, pushOrigins, remoteHeads, blockers };
}

function mapRuntimeAliases(repoName, includedPaths) {
  const mapping = {
    'backend': ['app'],
    'frontend': ['frontend'],
    'notification-service': ['notification-service'],
    'email-service': ['email-service', 'email-celery-worker'],
    'vk-service': ['vk-service', 'vk-celery-worker', 'vk-bot'],
    'site-ad': ['site-ad'],
    'site-ksk-inlove': ['site-ksk-inlove']
  };
  
  if (repoName !== '.') {
    return mapping[repoName] || [];
  }
  
  // Root: check for compose files
  const aliases = [];
  for (const p of includedPaths) {
    if (p.startsWith('.docker-compose/docker-compose.')) {
      const match = p.match(/docker-compose\.(.+)\.yml$/);
      if (match) {
        const profile = match[1];
        if (mapping[profile]) {
          aliases.push(...mapping[profile]);
        }
      }
    }
  }
  
  return [...new Set(aliases)];
}


function parseOptions(args, root) {
  const options = { root, change: null, summary: null, kind: null, branch: null, message: null, task: null, pathsFile: null, include: new Set(), exclude: new Set() };
  const names = { '--change': 'change', '--summary': 'summary', '--kind': 'kind', '--branch': 'branch', '--message': 'message', '--task': 'task', '--paths-file': 'pathsFile', '--include': 'include', '--exclude': 'exclude' };
  const seen = new Set();
  for (let i = 0; i < args.length; i += 2) {
    const key = names[args[i]], value = args[i + 1];
    if (!key || typeof value !== 'string' || !value.trim() || /[\0\r\n]/.test(value) || value.startsWith('--')) throw new Error('invalid_plan_argument');
    if (options[key] instanceof Set) options[key].add(literalPath(value));
    else { if (seen.has(key)) throw new Error('duplicate_plan_argument'); options[key] = value; seen.add(key); }
  }
  if (!options.change || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(options.change)) throw new Error('invalid_change');
  if (!options.message && !options.summary) throw new Error('--summary or --message is required');
  if (options.kind && !['feature', 'bug'].includes(options.kind)) throw new Error('invalid_kind');
  options.kind ||= /^(fix-|bug-)/.test(options.change) ? 'bug' : 'feature';
  options.subject = options.message ?? `${options.kind === 'bug' ? 'fix' : 'feat'}(${options.change}): ${options.summary}`;
  if ([...options.subject].length > 72) throw new Error('subject_exceeds_72_characters');
  const branch = options.branch ?? `${options.kind}/${options.change.replace(/^\d{4}-\d{2}-\d{2}-/, '')}`;
  if (['main', 'release', 'dev'].includes(branch) || branch.startsWith('-') || /[\x00-\x1f\x7f]/.test(branch) || git(root, 'check-ref-format', '--branch', branch).status !== 0 || git(root, 'check-ref-format', `refs/heads/${branch}`).status !== 0) throw new Error('invalid_branch');
  options.branchName = branch;
  if (options.task) literalPath(options.task);
  return options;
}

export async function plan(args, { ROOT }) {
  try {
    const options = parseOptions(args, ROOT);
    const manifest = await parseManifest(ROOT);
    if (await exists(path.join(ROOT, 'services')) && (await fs.lstat(path.join(ROOT, 'services'))).isSymbolicLink()) throw new Error('symlink_inventory_parent');
    const declared = await selectors(ROOT, manifest, await collectDeclaredPaths(options), options.exclude);
    progress(`Planning change: ${options.change}`);
    const inventory = [{ name: '.', path: ROOT }, ...Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)).map(([name, url]) => ({ name, url, path: path.join(ROOT, 'services', name) }))];
    const repos = {};
    for (const repo of inventory) {
      const safety = await inventorySafety(repo.path, repo.url);
      const data = { status: 'untouched', path: repo.path, ...safety, included: [], foreign: [], excluded: [], warnings: [], hasRelease: !!safety.remoteHeads.release, ownerRepo: safety.origin ? parseRemoteUrl('https://' + safety.origin) : null, runtimeAliases: [] };
      if (safety.origin?.startsWith('/')) data.ownerRepo = null;
      repos[repo.name] = data;
      if (safety.blockers.includes('missing_or_invalid_clone')) continue;
      const rawStatus = checked(repo.path, 'status', '--porcelain=v1', '-z', '--untracked-files=all');
      data.statusHash = digest(rawStatus);
      data.indexHash = digest(checked(repo.path, 'ls-files', '--stage', '-z'));
      for (const entry of parseStatusPorcelain(rawStatus)) {
        const names = entry.isRename ? [entry.path, entry.oldPath] : [entry.path];
        if (names.some(n => n === '.qa' || n.startsWith('.qa/')) || (repo.name === '.' && names.some(n => n.startsWith('services/')))) continue;
        const chosen = names.map(n => selected(repo.name, n, declared, options.exclude));
        if (entry.isRename && chosen[0] !== chosen[1]) data.blockers.push('cross_scope_rename');
        for (const [i, file] of names.entries()) {
          const status = i === 1 ? 'D ' : entry.status;
          try { await checkBoundary(repo.path, file); } catch (e) {
            if (chosen[i]) throw e;
            data.excluded.push({ path: file, rule: 'repository_boundary' });
            if (status[0] !== ' ' && status[0] !== '?') data.blockers.push('foreign_staged');
            continue;
          }
          const template = ['.env.example', '.env.sample', '.env.template'].includes(path.posix.basename(file).toLowerCase());
          const explicitlySelected = declared.some(s => s.repo === repo.name && !s.directory && s.file === file);
          if (chosen[i] && (denied(file) || (template && !explicitlySelected))) {
            data.excluded.push({ path: file, rule: 'credential_path' });
            data.warnings.push('credential_path_excluded');
            if (status[0] !== ' ' && status[0] !== '?') data.blockers.push('foreign_staged');
            continue;
          }
          const item = await fileSafety(repo.path, file, status);
          if (chosen[i]) {
            for (const rule of await scanContent(repo.path, file)) { data.blockers.push('secret_content'); data.excluded.push({ path: file, rule }); }
            data.included.push(item);
          } else {
            data.foreign.push(item);
            if (status[0] !== ' ' && status[0] !== '?') data.blockers.push('foreign_staged');
          }
        }
      }
      const includedPaths = new Set(data.included.map(f => f.path));
      const staged = checked(repo.path, 'diff', '--cached', '--no-renames', '--name-only', '-z').split('\0').filter(Boolean);
      if (staged.some(f => !includedPaths.has(f))) data.blockers.push('foreign_staged');
      data.included.sort((a, b) => a.path.localeCompare(b.path));
      data.foreign.sort((a, b) => a.path.localeCompare(b.path));
      if (data.included.length) { data.status = 'changed'; data.warnings.push('whole_file_commit'); }
      data.runtimeAliases = mapRuntimeAliases(repo.name, data.included.map(f => f.path));
    }
    const includedRepos = Object.values(repos).filter(r => r.included.length);
    let branchName = options.branchName;
    const skippedBranches = [];
    for (let i = 0; i < 100; i++) {
      const occupied = includedRepos.some(r => refExists(r.path, `refs/heads/${branchName}`) || Object.hasOwn(r.remoteHeads, branchName));
      if (!occupied) break;
      if (options.branch) { includedRepos.forEach(r => r.blockers.push('branch_occupied')); break; }
      skippedBranches.push(branchName);
      branchName = `${options.branchName}-${i + 2}`;
      if (i === 99) throw new Error('branch_names_exhausted');
    }
    for (const data of Object.values(repos)) {
      data.blockers = [...new Set(data.blockers)];
      data.fingerprint = digest({ ...data, branchName });
    }
    const blockers = Object.values(repos).flatMap(r => r.blockers);
    const result = { version: PLAN_VERSION, change: options.change, kind: options.kind, branchName, skippedBranches,
      commitMessage: { subject: options.subject, trailers: [`OpenSpec: ${options.change}`, ...(options.task ? [`Task: ${options.task}`] : [])] },
      inventory: inventory.map(r => ({ name: r.name, origin: repos[r.name].origin })),
      exclusions: [...options.exclude].sort(), repos, blockers, hasBlockers: blockers.length > 0,
      noop: includedRepos.length === 0 };
    result.PLAN_TOKEN = digest(result);
    const stateDir = await ensureStateDir(ROOT, options.change);
    await writeStateFile(path.join(stateDir, 'plan.json'), result, 'plan');
    return { code: result.hasBlockers ? 3 : 0, payload: jsonOut(!result.hasBlockers, result) };
  } catch (error) {
    // Never echo raw Git diagnostics, argument values, file contents or credentials.
    return { code: 3, payload: jsonOut(false, { error: error.message === 'remote_probe_failed' ? error.message : safeError(error) }) };
  }
}

function safeError(error) {
  return /^[a-z_]+$/.test(error.message) || error.message === '--summary or --message is required' ? error.message : 'plan_input_or_probe_failed';
}
