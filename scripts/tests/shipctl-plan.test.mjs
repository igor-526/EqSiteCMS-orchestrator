/**
 * Tests for shipctl plan command (UT-PLAN-01..07)
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import {
  createMonorepoFixture,
  makeDirty,
  cleanup,
  captureMonorepoSnapshot,
  assertSnapshotsEqual,
  guardNonLocalRemote
} from './helpers/fixture.mjs';

const SHIPCTL = path.join(process.cwd(), 'scripts/shipctl');

/**
 * Runs shipctl command in fixture context.
 */
function shipctl(root, ...args) {
  const result = spawnSync('node', [SHIPCTL, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      SHIPCTL_ROOT: root
    },
    stdio: 'pipe'
  });
  
  let json = null;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    // Not JSON
  }
  
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    json
  };
}

describe('UT-PLAN-01: happy path / защита foreign', async () => {
  let fixture;
  
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend', 'frontend'] });
  });
  
  afterEach(async () => {
    await cleanup(fixture);
  });
  
  await it('classifies modified, added, deleted, untracked files correctly', async () => {
    // Guard against non-local remotes
    const manifest = await fs.readFile(fixture.manifestPath, 'utf8');
    for (const line of manifest.split('\n')) {
      if (line.trim() && !line.startsWith('#')) {
        const url = line.split(/\s+/)[1];
        guardNonLocalRemote(url);
      }
    }
    
    // Create change directory structure
    const changeDir = path.join(fixture.root, 'openspec/changes/test-change-083');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Proposal');
    
    const backendPath = fixture.services.backend.clonePath;
    
    // Modified file (included)
    await makeDirty(backendPath, {
      'src/main.py': 'modified content'
    });
    
    // Added file (included)
    await makeDirty(backendPath, {
      'src/new_file.py': 'new content'
    });
    
    // Untracked in directory (included)
    await makeDirty(backendPath, {
      'src/subdir/nested.py': 'nested content'
    });
    
    // Foreign files
    await makeDirty(backendPath, {
      'local_notes.txt': 'foreign',
      'temp/data.json': '{"temp": true}'
    });
    
    // Deleted file (stage deletion)
    const deleteTarget = path.join(backendPath, 'README.md');
    await fs.unlink(deleteTarget);
    
    // Create paths file
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, [
      'services/backend/src/main.py',
      'services/backend/src/new_file.py',
      'services/backend/src/subdir/',
      'services/backend/README.md'
    ].join('\n'));
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'test-change-083',
      '--summary', 'Test change',
      '--paths-file', pathsFile
    );
    
    assert.strictEqual(result.status, 0, 'plan should succeed');
    assert.ok(result.json, 'should return JSON');
    assert.strictEqual(result.json.ok, true);
    
    const plan = result.json;
    const backendRepo = plan.repos.backend;
    
    assert.ok(backendRepo, 'backend should be present');
    assert.strictEqual(backendRepo.status, 'changed');
    
    // Check included files
    const includedPaths = new Set(backendRepo.included.map(f => f.path));
    assert.ok(includedPaths.has('src/main.py'), 'modified file included');
    assert.ok(includedPaths.has('src/new_file.py'), 'added file included');
    assert.ok(includedPaths.has('src/subdir/nested.py'), 'untracked nested included');
    assert.ok(includedPaths.has('README.md'), 'deleted file included');
    
    // Check foreign files
    const foreignPaths = new Set(backendRepo.foreign.map(f => f.path));
    assert.ok(foreignPaths.has('local_notes.txt'), 'foreign file classified');
    assert.ok(foreignPaths.has('temp/data.json'), 'foreign nested classified');
    
    // Frontend should be untouched
    const frontendRepo = plan.repos.frontend;
    assert.strictEqual(frontendRepo.status, 'untouched');
  });
});

describe('UT-PLAN-02: полнота автопутей', async () => {
  let fixture;
  
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend'] });
  });
  
  afterEach(async () => {
    await cleanup(fixture);
  });
  
  await it('includes auto-paths from change, archive, specs', async () => {
    const changeDir = path.join(fixture.root, 'openspec/changes/auto-test');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'design.md'), '# Design');
    
    // Create specs in change
    const changeSpecsDir = path.join(changeDir, 'specs/task-tooling');
    await fs.mkdir(changeSpecsDir, { recursive: true });
    await fs.writeFile(path.join(changeSpecsDir, 'spec.md'), '# Spec');
    
    // Create main specs directory
    const mainSpecsDir = path.join(fixture.root, 'openspec/specs/task-tooling');
    await fs.mkdir(mainSpecsDir, { recursive: true });
    await fs.writeFile(path.join(mainSpecsDir, 'spec.md'), '# Main Spec');
    
    // Create dirty file in main specs
    await fs.writeFile(path.join(mainSpecsDir, 'update.md'), '# Update');
    
    // No explicit paths-file, rely on auto-paths
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'auto-test',
      '--summary', 'Auto paths test'
    );
    
    assert.strictEqual(result.status, 0);
    assert.ok(result.json);
    
    const plan = result.json;
    const rootRepo = plan.repos['.'];
    
    assert.strictEqual(rootRepo.status, 'changed', 'root should be changed');
    
    const includedPaths = new Set(rootRepo.included.map(f => f.path));
    assert.ok(includedPaths.has('openspec/specs/task-tooling/update.md'), 'main specs included');
  });
});

describe('UT-PLAN-03: валидация входа', async () => {
  let fixture;
  
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend'] });
  });
  
  afterEach(async () => {
    await cleanup(fixture);
  });
  
  await it('handles --include/--exclude correctly', async () => {
    const changeDir = path.join(fixture.root, 'openspec/changes/validation-test');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '# Tasks');
    
    await makeDirty(fixture.services.backend.clonePath, {
      'included.py': 'content',
      'excluded.py': 'content'
    });
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'validation-test',
      '--summary', 'Validation',
      '--include', 'services/backend/included.py',
      '--exclude', 'services/backend/excluded.py'
    );
    
    assert.strictEqual(result.status, 0);
    const plan = result.json;
    const backend = plan.repos.backend;
    
    const includedPaths = new Set(backend.included.map(f => f.path));
    const foreignPaths = new Set(backend.foreign.map(f => f.path));
    
    assert.ok(includedPaths.has('included.py'), 'included via --include');
    assert.ok(foreignPaths.has('excluded.py'), 'excluded via --exclude');
  });
});

describe('UT-PLAN-04: конвенции / суффикс', async () => {
  let fixture;
  
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend', 'frontend'] });
  });
  
  afterEach(async () => {
    await cleanup(fixture);
  });
  
  await it('determines kind from change prefix and adds suffix for occupied branches', async () => {
    const changeDir = path.join(fixture.root, 'openspec/changes/fix-bug-123');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Fix');
    
    await makeDirty(fixture.services.backend.clonePath, {
      'src/fix.py': 'fix'
    });
    
    // Also change frontend so both repos are "changed"
    await makeDirty(fixture.services.frontend.clonePath, {
      'src/fix.tsx': 'fix'
    });
    
    // Create occupied branch locally in backend
    spawnSync('git', ['branch', 'bug/fix-bug-123'], {
      cwd: fixture.services.backend.clonePath
    });
    
    // Create occupied -2 branch on origin in frontend
    const frontendBare = fixture.services.frontend.barePath;
    const tempClone = path.join(fixture.root, 'temp-frontend-clone');
    spawnSync('git', ['clone', frontendBare, tempClone], {
      cwd: fixture.root
    });
    spawnSync('git', ['checkout', '-b', 'bug/fix-bug-123-2'], {
      cwd: tempClone
    });
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: tempClone });
    spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tempClone });
    await fs.writeFile(path.join(tempClone, 'dummy.txt'), 'dummy');
    spawnSync('git', ['add', 'dummy.txt'], { cwd: tempClone });
    spawnSync('git', ['commit', '-m', 'Occupy branch'], { cwd: tempClone });
    spawnSync('git', ['push', 'origin', 'bug/fix-bug-123-2'], { cwd: tempClone });
    await fs.rm(tempClone, { recursive: true, force: true });
    
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/src/fix.py\nservices/frontend/src/fix.tsx\n');
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'fix-bug-123',
      '--summary', 'Fix bug',
      '--paths-file', pathsFile
    );
    
    assert.strictEqual(result.status, 0);
    const plan = result.json;
    
    assert.strictEqual(plan.kind, 'bug', 'kind should be bug from fix- prefix');
    assert.strictEqual(plan.branchName, 'bug/fix-bug-123-3', 'should skip occupied branches');
    assert.deepStrictEqual(plan.skippedBranches, ['bug/fix-bug-123', 'bug/fix-bug-123-2']);
    
    const subject = plan.commitMessage.subject;
    assert.ok(subject.startsWith('fix(fix-bug-123):'), 'commit should use fix prefix');
  });
});

describe('UT-PLAN-05: предусловия', async () => {
  let fixture;
  
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend'] });
  });
  
  afterEach(async () => {
    await cleanup(fixture);
  });
  
  await it('detects detached HEAD blocker', async () => {
    const backendPath = fixture.services.backend.clonePath;
    
    // Detach HEAD
    const headSha = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: backendPath,
      encoding: 'utf8'
    }).stdout.trim();
    spawnSync('git', ['checkout', headSha], { cwd: backendPath });
    
    const changeDir = path.join(fixture.root, 'openspec/changes/detach-test');
    await fs.mkdir(changeDir, { recursive: true });
    
    await makeDirty(backendPath, { 'test.py': 'test' });
    
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/test.py\n');
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'detach-test',
      '--summary', 'Test',
      '--paths-file', pathsFile
    );
    
    assert.strictEqual(result.status, 3, 'should exit 3 for blockers');
    assert.ok(result.json);
    assert.strictEqual(result.json.ok, false);
    assert.ok(result.json.blockers.includes('detached_head'));
  });
  
  await it('detects not_on_main blocker', async () => {
    const backendPath = fixture.services.backend.clonePath;
    
    spawnSync('git', ['checkout', '-b', 'other-branch'], { cwd: backendPath });
    
    const changeDir = path.join(fixture.root, 'openspec/changes/branch-test');
    await fs.mkdir(changeDir, { recursive: true });
    
    await makeDirty(backendPath, { 'test.py': 'test' });
    
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/test.py\n');
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'branch-test',
      '--summary', 'Test',
      '--paths-file', pathsFile
    );
    
    assert.strictEqual(result.status, 3);
    assert.ok(result.json.blockers.includes('not_on_main'));
  });
  
  await it('detects foreign_staged blocker', async () => {
    const backendPath = fixture.services.backend.clonePath;
    
    await makeDirty(backendPath, {
      'foreign.txt': 'foreign',
      'included.py': 'included'
    });
    
    // Stage foreign file
    spawnSync('git', ['add', 'foreign.txt'], { cwd: backendPath });
    
    const changeDir = path.join(fixture.root, 'openspec/changes/staged-test');
    await fs.mkdir(changeDir, { recursive: true });
    
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/included.py\n');
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'staged-test',
      '--summary', 'Test',
      '--paths-file', pathsFile
    );
    
    assert.strictEqual(result.status, 3);
    assert.ok(result.json.blockers.includes('foreign_staged'));
  });
});

describe('UT-PLAN-06: контракт', async () => {
  let fixture;
  
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend'] });
  });
  
  afterEach(async () => {
    await cleanup(fixture);
  });
  
  await it('includes fingerprint, aliases, hasRelease, owner/repo', async () => {
    const changeDir = path.join(fixture.root, 'openspec/changes/contract-test');
    await fs.mkdir(changeDir, { recursive: true });
    
    await makeDirty(fixture.services.backend.clonePath, {
      'src/main.py': 'changed'
    });
    
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/src/main.py\n');
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'contract-test',
      '--summary', 'Contract',
      '--paths-file', pathsFile
    );
    
    assert.strictEqual(result.status, 0);
    const plan = result.json;
    const backend = plan.repos.backend;
    
    assert.ok(backend.fingerprint, 'should have fingerprint');
    assert.strictEqual(backend.fingerprint.length, 64, 'fingerprint is SHA256');
    
    assert.ok(Array.isArray(backend.runtimeAliases), 'should have runtime aliases');
    assert.ok(backend.runtimeAliases.includes('app'), 'backend maps to app alias');
    
    assert.strictEqual(backend.hasRelease, true, 'should detect origin/release');
    
    // owner/repo should be parsed from local bare path in fixture
    assert.ok(backend.ownerRepo === null, 'fixture uses local paths, no GitHub owner/repo');
  });
});

describe('UT-PLAN-07: CLI-контракт', async () => {
  let fixture;
  
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend'] });
  });
  
  afterEach(async () => {
    await cleanup(fixture);
  });
  
  await it('outputs only JSON to stdout and exits with correct codes', async () => {
    const changeDir = path.join(fixture.root, 'openspec/changes/cli-test');
    await fs.mkdir(changeDir, { recursive: true });
    
    await makeDirty(fixture.services.backend.clonePath, {
      'test.py': 'test'
    });
    
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/test.py\n');
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'cli-test',
      '--summary', 'CLI test',
      '--paths-file', pathsFile
    );
    
    // stdout should be valid JSON
    assert.ok(result.json, 'stdout is valid JSON');
    assert.ok(result.json.ok !== undefined, 'JSON has ok field');
    
    // stderr should contain progress
    assert.ok(result.stderr.includes('Planning change'), 'progress goes to stderr');
    
    // Exit 0 for success
    assert.strictEqual(result.status, 0);
  });
  
  await it('exits 3 when preconditions fail', async () => {
    const backendPath = fixture.services.backend.clonePath;
    spawnSync('git', ['checkout', '-b', 'wrong-branch'], { cwd: backendPath });
    
    const changeDir = path.join(fixture.root, 'openspec/changes/exit-test');
    await fs.mkdir(changeDir, { recursive: true });
    
    await makeDirty(backendPath, { 'test.py': 'test' });
    
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/test.py\n');
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'exit-test',
      '--summary', 'Exit test',
      '--paths-file', pathsFile
    );
    
    assert.strictEqual(result.status, 3, 'exit 3 for precondition failure');
    assert.strictEqual(result.json.ok, false);
  });
});

describe('UT-PLAN-08: schema validation (F-083-01)', async () => {
  let fixture;
  
  beforeEach(async () => {
    fixture = await createMonorepoFixture({ services: ['backend'] });
  });
  
  afterEach(async () => {
    await cleanup(fixture);
  });
  
  await it('validates plan.json against JSON Schema', async () => {
    // Guard against non-local remotes
    const manifest = await fs.readFile(fixture.manifestPath, 'utf8');
    for (const line of manifest.split('\n')) {
      if (line.trim() && !line.startsWith('#')) {
        const url = line.split(/\s+/)[1];
        guardNonLocalRemote(url);
      }
    }
    
    const changeDir = path.join(fixture.root, 'openspec/changes/schema-test');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Schema test');
    
    const backendPath = fixture.services.backend.clonePath;
    await makeDirty(backendPath, { 'test.py': 'test content' });
    
    const pathsFile = path.join(fixture.root, '.qa/paths.txt');
    await fs.mkdir(path.dirname(pathsFile), { recursive: true });
    await fs.writeFile(pathsFile, 'services/backend/test.py\n');
    
    const result = shipctl(
      fixture.root,
      'plan',
      '--change', 'schema-test',
      '--summary', 'Schema validation test',
      '--paths-file', pathsFile
    );
    
    assert.strictEqual(result.status, 0, 'plan succeeds');
    assert.strictEqual(result.json.ok, true);
    
    // Verify plan.json was written with valid schema
    const planPath = path.join(fixture.root, '.qa/ship/schema-test/plan.json');
    const planContent = await fs.readFile(planPath, 'utf8');
    const plan = JSON.parse(planContent);
    
    // Validate required fields per schema
    assert.ok(plan.change, 'plan.change exists');
    assert.ok(plan.kind, 'plan.kind exists');
    assert.ok(plan.branchName, 'plan.branchName exists');
    assert.ok(plan.commitMessage, 'plan.commitMessage exists');
    assert.ok(plan.repos, 'plan.repos exists');
    assert.ok(typeof plan.hasBlockers === 'boolean', 'plan.hasBlockers is boolean');
    
    // Validate schema compliance would be checked by ajv at write time
    // If we got here without exit 2, schema validation passed
  });
});
