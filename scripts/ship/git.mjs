/**
 * Git operations wrapper for shipctl.
 * Only permitted operations from D3 are exposed.
 */
import { run } from './common.mjs';

/**
 * Executes git in a repository.
 * @param {string} cwd
 * @param {string[]} args
 * @returns {Object} { status, stdout, stderr }
 */
export function git(cwd, ...args) {
  return run('git', args, { cwd });
}

/**
 * Parses git status --porcelain=v1 -z output.
 * @param {string} output
 * @returns {Array<Object>} Parsed status entries
 */
export function parseStatusPorcelain(output) {
  if (!output) return [];
  
  const entries = [];
  const parts = output.split('\0').filter(Boolean);
  
  let i = 0;
  while (i < parts.length) {
    const line = parts[i];
    if (line.length < 4) {
      i++;
      continue;
    }
    
    const xy = line.slice(0, 2);
    const pathPart = line.slice(3);
    
    // Handle renames (R -> path1\0path2)
    if (xy[0] === 'R' || xy[1] === 'R') {
      const oldPath = pathPart;
      const newPath = parts[i + 1] || '';
      entries.push({
        status: xy,
        path: newPath,
        oldPath,
        isRename: true
      });
      i += 2;
    } else {
      entries.push({
        status: xy,
        path: pathPart,
        isRename: false
      });
      i++;
    }
  }
  
  return entries;
}

/**
 * Gets remote tracking refs from git show-ref.
 * @param {string} cwd
 * @returns {Map<string, string>} Map of ref name to SHA
 */
export function remoteTrackingRefs(cwd) {
  const result = git(cwd, 'show-ref');
  const refs = new Map();
  
  if (result.status !== 0) return refs;
  
  for (const line of result.stdout.split('\n')) {
    if (!line.trim()) continue;
    const [sha, ref] = line.split(/\s+/);
    if (ref && ref.startsWith('refs/remotes/')) {
      refs.set(ref, sha);
    }
  }
  
  return refs;
}

/**
 * Gets current branch name.
 * @param {string} cwd
 * @returns {string|null}
 */
export function currentBranch(cwd) {
  const result = git(cwd, 'rev-parse', '--abbrev-ref', 'HEAD');
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

/**
 * Gets current HEAD SHA.
 * @param {string} cwd
 * @returns {string|null}
 */
export function currentHead(cwd) {
  const result = git(cwd, 'rev-parse', 'HEAD');
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

/**
 * Checks if a ref exists.
 * @param {string} cwd
 * @param {string} ref - e.g., 'refs/heads/main'
 * @returns {boolean}
 */
export function refExists(cwd, ref) {
  const result = git(cwd, 'rev-parse', '--verify', ref);
  return result.status === 0;
}

/**
 * Lists remote branches via ls-remote.
 * @param {string} cwd
 * @param {string} remote - e.g., 'origin'
 * @returns {Map<string, string>} Map of branch name to SHA
 */
export function lsRemoteHeads(cwd, remote = 'origin') {
  const result = git(cwd, 'ls-remote', '--heads', remote);
  const branches = new Map();
  
  if (result.status !== 0) return branches;
  
  for (const line of result.stdout.split('\n')) {
    if (!line.trim()) continue;
    const [sha, ref] = line.split(/\s+/);
    if (ref && ref.startsWith('refs/heads/')) {
      const branchName = ref.replace('refs/heads/', '');
      branches.set(branchName, sha);
    }
  }
  
  return branches;
}

/**
 * Parses owner/repo from git remote URL.
 * @param {string} url
 * @returns {Object|null} { owner, repo }
 */
export function parseRemoteUrl(url) {
  // SSH: git@github.com:owner/repo.git
  const sshMatch = url.match(/git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[2], repo: sshMatch[3].replace(/\.git$/, '') };
  }
  
  // HTTPS: https://github.com/owner/repo.git
  const httpsMatch = url.match(/https?:\/\/([^/]+)\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[2], repo: httpsMatch[3].replace(/\.git$/, '') };
  }
  
  return null;
}

/**
 * Gets origin URL.
 * @param {string} cwd
 * @returns {string|null}
 */
export function getOriginUrl(cwd) {
  const result = git(cwd, 'remote', 'get-url', 'origin');
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

/**
 * Collects changed repositories from handoff paths.
 * @param {string} root - Monorepo root
 * @param {Array<string>} paths - Paths from handoff (relative to root)
 * @param {Object} manifest - { name: clonePath }
 * @returns {Set<string>} Set of repository names
 */
export function collectChangedRepos(root, paths, manifest) {
  const changed = new Set();
  
  for (const p of paths) {
    if (p.startsWith('services/')) {
      const parts = p.split('/');
      const name = parts[1];
      if (manifest[name]) {
        changed.add(name);
      }
    } else {
      // Root repo
      changed.add('.');
    }
  }
  
  return changed;
}
