/**
 * shipctl status — shows current state of all repositories.
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { jsonOut, progress } from './common.mjs';
import { git, currentBranch, currentHead, remoteTrackingRefs } from './git.mjs';

/**
 * Parses services.manifest.
 * @param {string} root
 * @returns {Promise<Object>}
 */
async function parseManifest(root) {
  const manifestPath = path.join(root, 'services.manifest');
  const content = await fs.readFile(manifestPath, 'utf8');
  const manifest = {};
  
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [name, url] = trimmed.split(/\s+/);
    if (name && url) {
      manifest[name] = url;
    }
  }
  
  return manifest;
}

/**
 * Main status command.
 * @param {Array<string>} args
 * @param {Object} context
 * @returns {Promise<Object>}
 */
export async function status(args, context) {
  const { ROOT } = context;
  
  try {
    const manifest = await parseManifest(ROOT);
    const repos = [];
    
    // Root
    repos.push({ name: '.', path: ROOT });
    
    // Services
    for (const [name, url] of Object.entries(manifest)) {
      const clonePath = path.join(ROOT, 'services', name);
      repos.push({ name, path: clonePath, url });
    }
    
    const results = [];
    
    for (const repo of repos) {
      const { name, path: repoPath } = repo;
      
      const branch = currentBranch(repoPath);
      const head = currentHead(repoPath);
      const refs = remoteTrackingRefs(repoPath);
      
      // Count dirty files
      const statusResult = git(repoPath, 'status', '--porcelain=v1');
      const dirtyCount = statusResult.stdout.split('\n').filter(Boolean).length;
      
      // Check ahead/behind
      let ahead = 0;
      let behind = 0;
      
      if (branch && branch !== 'HEAD') {
        const originBranch = refs.get(`refs/remotes/origin/${branch}`);
        if (originBranch) {
          const aheadResult = git(repoPath, 'rev-list', '--count', `origin/${branch}..HEAD`);
          const behindResult = git(repoPath, 'rev-list', '--count', `HEAD..origin/${branch}`);
          
          if (aheadResult.status === 0) {
            ahead = parseInt(aheadResult.stdout.trim()) || 0;
          }
          if (behindResult.status === 0) {
            behind = parseInt(behindResult.stdout.trim()) || 0;
          }
        }
      }
      
      const hasRelease = refs.has('refs/remotes/origin/release');
      
      results.push({
        name,
        branch,
        head,
        dirty: dirtyCount,
        ahead,
        behind,
        hasRelease
      });
    }
    
    return {
      code: 0,
      payload: jsonOut(true, { repos: results })
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
