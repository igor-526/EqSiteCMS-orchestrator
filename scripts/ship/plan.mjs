/**
 * shipctl plan — generates a plan for merging changes.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureStateDir, jsonOut, progress, writeStateFile } from './common.mjs';
import {
  git,
  parseStatusPorcelain,
  remoteTrackingRefs,
  currentBranch,
  currentHead,
  refExists,
  lsRemoteHeads,
  getOriginUrl,
  parseRemoteUrl
} from './git.mjs';

/**
 * Parses services.manifest.
 * @param {string} root
 * @returns {Promise<Object>} { name: url }
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
 * Reads handoff paths from a file.
 * @param {string} filePath
 * @returns {Promise<Array<string>>}
 */
async function readPathsFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content.split('\n').map(l => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Collects declared paths from various sources.
 * @param {Object} options
 * @returns {Promise<Set<string>>}
 */
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

/**
 * Classifies a file against declared paths.
 * @param {string} filePath - Relative to repo root
 * @param {string} repoPrefix - e.g., 'services/backend/'
 * @param {Set<string>} declared
 * @returns {string} 'included' | 'foreign'
 */
function classifyFile(filePath, repoPrefix, declared) {
  const fullPath = repoPrefix + filePath;
  
  for (const declaredPath of declared) {
    if (fullPath === declaredPath) return 'included';
    if (declaredPath.endsWith('/') && fullPath.startsWith(declaredPath)) {
      return 'included';
    }
  }
  
  return 'foreign';
}

/**
 * Checks repository preconditions.
 * @param {string} repoPath
 * @returns {Array<string>} Blockers
 */
function checkPreconditions(repoPath) {
  const blockers = [];
  
  const branch = currentBranch(repoPath);
  if (!branch || branch === 'HEAD') {
    blockers.push('detached_head');
    return blockers;
  }
  
  if (branch !== 'main') {
    blockers.push('not_on_main');
  }
  
  // Check for MERGE_HEAD (unfinished merge)
  const mergeHeadPath = path.join(repoPath, '.git/MERGE_HEAD');
  try {
    require('fs').accessSync(mergeHeadPath);
    blockers.push('merge_in_progress');
  } catch {
    // No merge in progress
  }
  
  // Check if main is ahead of origin/main
  const head = currentHead(repoPath);
  const refs = remoteTrackingRefs(repoPath);
  const originMain = refs.get('refs/remotes/origin/main');
  
  if (originMain && head !== originMain) {
    const result = git(repoPath, 'merge-base', '--is-ancestor', 'origin/main', 'HEAD');
    if (result.status !== 0) {
      // HEAD is not ahead of origin/main or diverged
      const revList = git(repoPath, 'rev-list', '--count', 'origin/main..HEAD');
      if (revList.status === 0 && parseInt(revList.stdout.trim()) > 0) {
        blockers.push('main_ahead');
      }
    }
  }
  
  return blockers;
}

/**
 * Checks for foreign staged files.
 * @param {string} repoPath
 * @param {Array<string>} includedPaths
 * @returns {boolean}
 */
function hasForeignStaged(repoPath, includedPaths) {
  const result = git(repoPath, 'diff', '--cached', '--name-only');
  if (result.status !== 0) return false;
  
  const staged = result.stdout.split('\n').filter(Boolean);
  const includedSet = new Set(includedPaths);
  
  for (const file of staged) {
    if (!includedSet.has(file)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Determines branch kind and base name.
 * @param {string} change
 * @param {string|null} kindFlag
 * @returns {Object} { kind, baseName }
 */
function determineBranchKind(change, kindFlag) {
  let kind = kindFlag;
  
  if (!kind) {
    if (change.startsWith('fix-') || change.startsWith('bug-')) {
      kind = 'bug';
    } else {
      kind = 'feature';
    }
  }
  
  // Remove archive date suffix if present
  const cleanChange = change.replace(/^(\d{4}-\d{2}-\d{2})-/, '');
  
  return {
    kind,
    baseName: `${kind}/${cleanChange}`
  };
}

/**
 * Finds available branch name with auto-suffix.
 * @param {string} baseName
 * @param {Array<Object>} repos - Array of { name, path }
 * @returns {Promise<Object>} { branch, skipped }
 */
async function findAvailableBranch(baseName, repos) {
  const skipped = [];
  
  // Try base name first, then -2, -3, etc.
  for (let i = 0; i <= 99; i++) {
    const candidate = i === 0 ? baseName : `${baseName}-${i + 1}`;
    let available = true;
    
    for (const repo of repos) {
      // Check local
      if (refExists(repo.path, `refs/heads/${candidate}`)) {
        available = false;
        break;
      }
      
      // Check origin
      const remoteBranches = lsRemoteHeads(repo.path);
      if (remoteBranches.has(candidate)) {
        available = false;
        break;
      }
    }
    
    if (available) {
      return { branch: candidate, skipped };
    }
    
    skipped.push(candidate);
  }
  
  throw new Error(`Could not find available branch name after ${baseName}-99`);
}

/**
 * Computes fingerprint for a repository.
 * @param {string} repoPath
 * @param {string} branchName
 * @param {Array<Object>} included - Array of { path, content }
 * @returns {Promise<string>}
 */
async function computeFingerprint(repoPath, branchName, included) {
  const head = currentHead(repoPath);
  const branch = currentBranch(repoPath);
  
  const parts = [
    head || '',
    branch || '',
    branchName
  ];
  
  const sorted = included.slice().sort((a, b) => a.path.localeCompare(b.path));
  for (const item of sorted) {
    parts.push(item.path);
    parts.push(item.status);
    parts.push(item.hash || '');
  }
  
  const data = parts.join('\0');
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Gets blob hash for a file.
 * @param {string} repoPath
 * @param {string} filePath
 * @returns {string}
 */
function getBlobHash(repoPath, filePath) {
  const result = git(repoPath, 'hash-object', filePath);
  if (result.status !== 0) return '';
  return result.stdout.trim();
}

/**
 * Maps runtime aliases.
 * @param {string} repoName
 * @param {Array<string>} includedPaths
 * @returns {Array<string>}
 */
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

/**
 * Generates commit message.
 * @param {string} kind
 * @param {string} change
 * @param {string} summary
 * @param {string|null} task
 * @returns {Object} { subject, trailers }
 */
function generateCommitMessage(kind, change, summary, task) {
  const prefix = kind === 'bug' ? 'fix' : 'feat';
  const subject = `${prefix}(${change}): ${summary}`;
  
  const trailers = [
    `OpenSpec: ${change}`
  ];
  
  if (task) {
    trailers.push(`Task: ${task}`);
  }
  
  return { subject, trailers };
}

/**
 * Main plan command.
 * @param {Array<string>} args
 * @param {Object} context
 * @returns {Object} { code, payload }
 */
export async function plan(args, context) {
  const { ROOT } = context;
  
  // Parse arguments
  const options = {
    root: ROOT,
    change: null,
    kind: null,
    summary: '',
    task: null,
    pathsFile: null,
    include: new Set(),
    exclude: new Set()
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--change':
        options.change = args[++i];
        break;
      case '--kind':
        options.kind = args[++i];
        break;
      case '--summary':
        options.summary = args[++i];
        break;
      case '--task':
        options.task = args[++i];
        break;
      case '--paths-file':
        options.pathsFile = args[++i];
        break;
      case '--include':
        options.include.add(args[++i]);
        break;
      case '--exclude':
        options.exclude.add(args[++i]);
        break;
    }
  }
  
  if (!options.change) {
    return {
      code: 3,
      payload: jsonOut(false, { error: '--change is required' })
    };
  }
  
  if (!options.summary) {
    return {
      code: 3,
      payload: jsonOut(false, { error: '--summary is required' })
    };
  }
  
  try {
    const manifest = await parseManifest(ROOT);
    const declared = await collectDeclaredPaths(options);
    
    progress(`Planning change: ${options.change}`);
    progress(`Declared paths: ${declared.size}`);
    
    const repos = [];
    const repoData = {};
    
    // Root repository
    const rootPath = ROOT;
    repos.push({ name: '.', path: rootPath });
    
    // Service repositories
    for (const [name, url] of Object.entries(manifest)) {
      const clonePath = path.join(ROOT, 'services', name);
      repos.push({ name, path: clonePath, url });
    }
    
    // Analyze each repository
    for (const repo of repos) {
      const { name, path: repoPath } = repo;
      const repoPrefix = name === '.' ? '' : `services/${name}/`;
      
      progress(`Analyzing ${name}...`);
      
      // Get git status
      const statusResult = git(repoPath, 'status', '--porcelain=v1', '-z', '--untracked-files=all');
      const entries = parseStatusPorcelain(statusResult.stdout);
      
      const included = [];
      const foreign = [];
      
      for (const entry of entries) {
        const classification = classifyFile(entry.path, repoPrefix, declared);
        
        const fileData = {
          path: entry.path,
          status: entry.status
        };
        
        if (classification === 'included') {
          // Get blob hash
          const fullPath = path.join(repoPath, entry.path);
          try {
            fileData.hash = getBlobHash(repoPath, entry.path);
          } catch {
            fileData.hash = '';
          }
          included.push(fileData);
        } else {
          foreign.push(fileData);
        }
        
        // Handle renames
        if (entry.isRename && entry.oldPath) {
          const oldClassification = classifyFile(entry.oldPath, repoPrefix, declared);
          if (oldClassification === 'included' && classification === 'foreign') {
            // Old path was included, add it
            included.push({
              path: entry.oldPath,
              status: 'D ',
              hash: ''
            });
          }
        }
      }
      
      if (included.length === 0) {
        repoData[name] = {
          status: 'untouched',
          branch: currentBranch(repoPath),
          head: currentHead(repoPath)
        };
        continue;
      }
      
      // Check preconditions
      const blockers = checkPreconditions(repoPath);
      
      // Check for foreign staged
      if (hasForeignStaged(repoPath, included.map(i => i.path))) {
        blockers.push('foreign_staged');
      }
      
      // Get origin info
      const originUrl = getOriginUrl(repoPath);
      const ownerRepo = originUrl ? parseRemoteUrl(originUrl) : null;
      
      // Check for origin/release
      const refs = remoteTrackingRefs(repoPath);
      const hasRelease = refs.has('refs/remotes/origin/release');
      
      repoData[name] = {
        status: 'changed',
        path: repoPath,
        branch: currentBranch(repoPath),
        head: currentHead(repoPath),
        included: included.map(i => ({ path: i.path, status: i.status })),
        foreign: foreign.map(f => ({ path: f.path, status: f.status })),
        blockers,
        hasRelease,
        ownerRepo,
        _includedWithHash: included
      };
    }
    
    // Find changed repos
    const changedRepos = Object.entries(repoData)
      .filter(([_, data]) => data.status === 'changed')
      .map(([name, data]) => ({ name, path: data.path }));
    
    if (changedRepos.length === 0) {
      return {
        code: 0,
        payload: jsonOut(true, {
          change: options.change,
          repos: repoData,
          message: 'No changed repositories'
        })
      };
    }
    
    // Determine branch name
    // Branch name must be free in ALL changed repos, checked against all their locals+origins
    const { kind, baseName } = determineBranchKind(options.change, options.kind);
    const { branch: branchName, skipped } = await findAvailableBranch(baseName, changedRepos);
    
    progress(`Branch: ${branchName}${skipped.length > 0 ? ` (skipped: ${skipped.join(', ')})` : ''}`);
    
    // Compute fingerprints and runtime aliases
    for (const [name, data] of Object.entries(repoData)) {
      if (data.status === 'changed') {
        const fp = await computeFingerprint(
          data.path,
          branchName,
          data._includedWithHash
        );
        
        data.fingerprint = fp;
        data.runtimeAliases = mapRuntimeAliases(name, data.included.map(i => i.path));
        delete data._includedWithHash;
      }
    }
    
    // Generate commit message
    const commitMsg = generateCommitMessage(kind, options.change, options.summary, options.task);
    
    // Check for blockers
    const allBlockers = Object.values(repoData)
      .filter(d => d.blockers && d.blockers.length > 0)
      .flatMap(d => d.blockers);
    
    const plan = {
      change: options.change,
      kind,
      branchName,
      skippedBranches: skipped,
      commitMessage: {
        subject: commitMsg.subject,
        trailers: commitMsg.trailers
      },
      repos: repoData,
      blockers: allBlockers,
      hasBlockers: allBlockers.length > 0
    };
    
    // Write plan.json
    const stateDir = await ensureStateDir(ROOT, options.change);
    const planPath = path.join(stateDir, 'plan.json');
    await writeStateFile(planPath, plan, 'plan');
    
    progress(`Plan written to ${planPath}`);
    
    const code = plan.hasBlockers ? 3 : 0;
    return {
      code,
      payload: jsonOut(!plan.hasBlockers, plan)
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
