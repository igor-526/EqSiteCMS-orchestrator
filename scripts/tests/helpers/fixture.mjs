/**
 * Test fixture for shipctl and sync.sh testing.
 * Creates temporary bare repositories and clones to simulate monorepo structure.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execSync, spawnSync } from 'node:child_process';

/**
 * Creates a temporary directory for fixtures.
 * @returns {Promise<string>} Path to the temporary directory
 */
export async function createTempDir(prefix = 'fixture-') {
  const tempPath = path.join(tmpdir(), `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempPath, { recursive: true });
  return tempPath;
}

/**
 * Guards against non-local remote URLs.
 * Throws if URL is not a local file path.
 * @param {string} url
 */
export function guardNonLocalRemote(url) {
  if (url.match(/^(git@|https?:\/\/|ssh:\/\/)/)) {
    throw new Error(`Non-local remote URL detected: ${url}. Tests must use only local bare repositories.`);
  }
}

/**
 * Executes a git command in a directory.
 * @param {string} cwd
 * @param {string[]} args
 * @returns {string} stdout
 */
function git(cwd, ...args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed in ${cwd}: ${result.stderr}`);
  }
  return result.stdout.trim();
}

/**
 * Creates a bare repository with main and release branches.
 * @param {string} barePath
 * @param {string} branchContent - Content for initial commit (default: branch name)
 * @returns {Promise<void>}
 */
export async function createBareRepo(barePath, branchContent = null) {
  await fs.mkdir(barePath, { recursive: true });
  
  // Initialize bare repo
  git(barePath, 'init', '--bare', '--initial-branch=main');
  
  // Create a temporary working directory to make commits
  const tempWork = await createTempDir('bare-work-');
  try {
    git(tempWork, 'clone', barePath, 'work');
    const workDir = path.join(tempWork, 'work');
    
    // Configure user for commits
    git(workDir, 'config', 'user.name', 'Test User');
    git(workDir, 'config', 'user.email', 'test@example.com');
    
    // Create initial commit on main
    const mainContent = branchContent || 'main';
    await fs.writeFile(path.join(workDir, 'README.md'), mainContent);
    git(workDir, 'add', 'README.md');
    git(workDir, 'commit', '-m', 'Initial commit');
    git(workDir, 'push', 'origin', 'main');
    
    // Create release branch pointing to the same commit
    git(workDir, 'checkout', '-b', 'release');
    git(workDir, 'push', 'origin', 'release');
    git(workDir, 'checkout', 'main');
  } finally {
    await fs.rm(tempWork, { recursive: true, force: true });
  }
}

/**
 * Creates a monorepo fixture with root and service clones.
 * @param {Object} options
 * @param {string[]} options.services - Service names (e.g., ['backend', 'frontend'])
 * @param {boolean} options.withRelease - Whether services have release branches (default: true)
 * @returns {Promise<Object>} Fixture metadata
 */
export async function createMonorepoFixture(options = {}) {
  const { services = ['backend', 'frontend'], withRelease = true } = options;
  
  const fixtureRoot = await createTempDir('monorepo-');
  const baresRoot = path.join(fixtureRoot, 'bare-repos');
  await fs.mkdir(baresRoot, { recursive: true });
  
  const servicesDir = path.join(fixtureRoot, 'services');
  await fs.mkdir(servicesDir, { recursive: true });
  
  // Create manifest
  const manifestPath = path.join(fixtureRoot, 'services.manifest');
  const manifestLines = [];
  
  // Create bare repos and clones for each service
  const serviceData = {};
  for (const svc of services) {
    const barePath = path.join(baresRoot, `${svc}.git`);
    await createBareRepo(barePath, svc);
    
    const clonePath = path.join(servicesDir, svc);
    git(servicesDir, 'clone', barePath, svc);
    
    // Configure clone
    git(clonePath, 'config', 'user.name', 'Test User');
    git(clonePath, 'config', 'user.email', 'test@example.com');
    
    manifestLines.push(`${svc} ${barePath}`);
    serviceData[svc] = { barePath, clonePath };
  }
  
  await fs.writeFile(manifestPath, manifestLines.join('\n') + '\n');
  
  // Initialize root repo
  git(fixtureRoot, 'init', '--initial-branch=main');
  git(fixtureRoot, 'config', 'user.name', 'Test User');
  git(fixtureRoot, 'config', 'user.email', 'test@example.com');
  git(fixtureRoot, 'add', 'services.manifest');
  git(fixtureRoot, 'commit', '-m', 'Initial root commit');
  
  return {
    root: fixtureRoot,
    services: serviceData,
    manifestPath,
    baresRoot
  };
}

/**
 * Captures git status snapshot of a repository.
 * @param {string} repoPath
 * @returns {Promise<Object>} Snapshot
 */
export async function captureGitSnapshot(repoPath) {
  try {
    const status = git(repoPath, 'status', '--porcelain=v1');
    const refs = git(repoPath, 'for-each-ref', '--format=%(refname) %(objectname)');
    const head = git(repoPath, 'rev-parse', 'HEAD');
    const branch = git(repoPath, 'rev-parse', '--abbrev-ref', 'HEAD');
    
    return { status, refs, head, branch };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Captures snapshots of all repositories in a monorepo fixture.
 * @param {Object} fixture
 * @returns {Promise<Object>} Map of path to snapshot
 */
export async function captureMonorepoSnapshot(fixture) {
  const snapshots = {};
  
  snapshots.root = await captureGitSnapshot(fixture.root);
  
  for (const [name, data] of Object.entries(fixture.services)) {
    snapshots[name] = await captureGitSnapshot(data.clonePath);
  }
  
  return snapshots;
}

/**
 * Compares two snapshots and asserts they are equal.
 * @param {Object} before
 * @param {Object} after
 * @param {string} label
 */
export function assertSnapshotsEqual(before, after, label = 'snapshot') {
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(`${label}: snapshots differ\nBefore: ${JSON.stringify(before)}\nAfter: ${JSON.stringify(after)}`);
  }
}

/**
 * Creates dirty files in a repository.
 * @param {string} repoPath
 * @param {Object} files - Map of relative paths to content
 */
export async function makeDirty(repoPath, files) {
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(repoPath, relPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  }
}

/**
 * Cleans up a fixture directory.
 * @param {string|Object} fixtureOrPath
 */
export async function cleanup(fixtureOrPath) {
  const rootPath = typeof fixtureOrPath === 'string' ? fixtureOrPath : fixtureOrPath.root;
  try {
    await fs.rm(rootPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Wrapper for git commands in a repo that returns result object.
 * Non-throwing version that returns status/stdout/stderr.
 * @param {string} repoPath
 * @param {string[]} args
 * @returns {Object} { status, stdout, stderr }
 */
export function gitInRepo(repoPath, ...args) {
  const result = spawnSync('git', args, {
    cwd: repoPath,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

/**
 * Creates a commit on a branch and returns the SHA.
 * Uses throwing git() which already handles errors.
 * @param {string} repoPath
 * @param {string} branch - Branch name to commit on
 * @param {string} message - Commit message
 * @param {Object} files - Optional files to add { path: content }
 * @returns {Promise<string>} Commit SHA
 */
export async function createCommit(repoPath, branch, message, files = null) {
  // Checkout branch (git() throws on error)
  git(repoPath, 'checkout', branch);
  
  // Create or modify files if provided
  if (files) {
    await makeDirty(repoPath, files);
  } else {
    // Create a dummy file to commit
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(7);
    await makeDirty(repoPath, { [`commit-${timestamp}-${randomPart}.txt`]: message });
  }
  
  // Add and commit (git() throws on error)
  git(repoPath, 'add', '-A');
  git(repoPath, 'commit', '-m', message);
  
  // Get commit SHA
  const sha = git(repoPath, 'rev-parse', 'HEAD');
  
  return sha;
}

/**
 * Alternative fixture creator that accepts per-service branch lists.
 * @param {string} tmpRoot - Temp directory root
 * @param {Object} options - { services: { name: { branches: ['main', 'release'] } } }
 * @returns {Promise<Object>} Fixture
 */
export async function createFixture(tmpRoot, options = {}) {
  const { services = {} } = options;
  
  const fixtureRoot = await createTempDir('fixture-');
  const baresRoot = path.join(fixtureRoot, 'bare-repos');
  await fs.mkdir(baresRoot, { recursive: true });
  
  const servicesDir = path.join(fixtureRoot, 'services');
  await fs.mkdir(servicesDir, { recursive: true });
  
  const manifestLines = [];
  const serviceData = {};
  
  for (const [svcName, svcOpts] of Object.entries(services)) {
    const { branches = ['main'] } = svcOpts;
    
    const barePath = path.join(baresRoot, `${svcName}.git`);
    await fs.mkdir(barePath, { recursive: true });
    
    // Initialize bare repo
    git(barePath, 'init', '--bare', '--initial-branch=main');
    
    // Create temp work to setup branches
    const tempWork = await createTempDir('work-');
    try {
      git(tempWork, 'clone', barePath, 'work');
      const workDir = path.join(tempWork, 'work');
      
      git(workDir, 'config', 'user.name', 'Test User');
      git(workDir, 'config', 'user.email', 'test@example.com');
      
      // Initial commit on main
      await fs.writeFile(path.join(workDir, 'README.md'), svcName);
      git(workDir, 'add', 'README.md');
      git(workDir, 'commit', '-m', 'Initial commit');
      git(workDir, 'push', 'origin', 'main');
      
      // Create additional branches
      for (const br of branches) {
        if (br === 'main') continue;
        git(workDir, 'checkout', '-b', br);
        git(workDir, 'push', 'origin', br);
        git(workDir, 'checkout', 'main');
      }
    } finally {
      await fs.rm(tempWork, { recursive: true, force: true });
    }
    
    // Clone service
    const clonePath = path.join(servicesDir, svcName);
    git(servicesDir, 'clone', barePath, svcName);
    
    git(clonePath, 'config', 'user.name', 'Test User');
    git(clonePath, 'config', 'user.email', 'test@example.com');
    
    manifestLines.push(`${svcName} ${barePath}`);
    serviceData[svcName] = { barePath, clonePath };
  }
  
  await fs.writeFile(path.join(fixtureRoot, 'services.manifest'), manifestLines.join('\n') + '\n');
  
  // Initialize root
  git(fixtureRoot, 'init', '--initial-branch=main');
  git(fixtureRoot, 'config', 'user.name', 'Test User');
  git(fixtureRoot, 'config', 'user.email', 'test@example.com');
  git(fixtureRoot, 'add', 'services.manifest');
  git(fixtureRoot, 'commit', '-m', 'Initial root commit');
  
  // Create .qa/ship directory
  await fs.mkdir(path.join(fixtureRoot, '.qa/ship'), { recursive: true });
  
  return {
    root: fixtureRoot,
    services: serviceData,
    cleanup: () => cleanup(fixtureRoot)
  };
}

/**
 * Simulate merge-in-progress state by creating MERGE_HEAD.
 * @param {string} repoPath - Path to the git repository
 * @param {string} commitSha - SHA to write to MERGE_HEAD
 * @returns {Promise<void>}
 */
export async function createMergeInProgress(repoPath, commitSha) {
  const gitDir = path.join(repoPath, '.git');
  await fs.writeFile(path.join(gitDir, 'MERGE_HEAD'), commitSha + '\n');
  await fs.writeFile(path.join(gitDir, 'MERGE_MSG'), 'Merge branch \'feature\'\n');
}

/**
 * Create fake merge-state.json with conflict stage for testing resume.
 * @param {string} fixtureRoot - Path to fixture root
 * @param {Object} options
 * @param {string} options.changeName - Change name
 * @param {string} options.branchName - Feature branch name
 * @param {Array} options.repos - Repo states [{name, stage, head, preMergeMain}, ...]
 * @returns {Promise<string>} Path to merge-state.json
 */
export async function createFakeMergeState(fixtureRoot, options) {
  const { changeName, branchName, repos } = options;
  const stateDir = path.join(fixtureRoot, '.qa/ship', changeName);
  await fs.mkdir(stateDir, { recursive: true });
  
  const mergeState = {
    phase: 'phase2',
    change: changeName,
    branchName,
    repos
  };
  
  const statePath = path.join(stateDir, 'merge-state.json');
  await fs.writeFile(statePath, JSON.stringify(mergeState, null, 2));
  return statePath;
}
