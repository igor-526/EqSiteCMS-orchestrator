/**
 * Unit tests for scripts/sync.sh (UT-SYNC-01..05)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import {
  createMonorepoFixture,
  cleanup,
  makeDirty
} from './helpers/fixture.mjs';

/**
 * Runs sync.sh in a fixture directory.
 * @param {Object} fixture
 * @param {string[]} args - Additional arguments
 * @returns {Object} { exitCode, stdout, stderr }
 */
function runSync(fixture, args = []) {
  const syncScript = path.join(process.cwd(), 'scripts/sync.sh');
  const result = spawnSync('bash', [syncScript, ...args], {
    cwd: fixture.root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, TERM: 'dumb' }
  });
  return {
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    combined: result.stdout + result.stderr
  };
}

/**
 * Runs make sync with SYNC_FLAGS in a fixture directory.
 * @param {Object} fixture
 * @param {string} syncFlags - Value for SYNC_FLAGS
 * @returns {Object} { exitCode, stdout, stderr }
 */
function runMakeSync(fixture, syncFlags = '') {
  const result = spawnSync('make', ['sync', `SYNC_FLAGS=${syncFlags}`], {
    cwd: fixture.root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, TERM: 'dumb' }
  });
  return {
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    combined: result.stdout + result.stderr
  };
}

test('UT-SYNC-01: without flags, pull failure does not stop others (legacy behavior)', async (t) => {
  const fixture = await createMonorepoFixture({ services: ['backend', 'frontend'] });
  
  try {
    // Create a commit in bare that would require merge (divergence)
    const tempClone = path.join(fixture.root, 'temp-backend');
    spawnSync('git', ['clone', fixture.services.backend.barePath, tempClone]);
    await fs.writeFile(path.join(tempClone, 'remote.txt'), 'remote commit');
    spawnSync('git', ['add', 'remote.txt'], { cwd: tempClone });
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: tempClone });
    spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tempClone });
    spawnSync('git', ['commit', '-m', 'Remote commit'], { cwd: tempClone });
    spawnSync('git', ['push'], { cwd: tempClone });
    await fs.rm(tempClone, { recursive: true, force: true });
    
    // Create local commit to cause divergence
    await fs.writeFile(path.join(fixture.services.backend.clonePath, 'local.txt'), 'local commit');
    spawnSync('git', ['add', 'local.txt'], { cwd: fixture.services.backend.clonePath });
    spawnSync('git', ['commit', '-m', 'Local commit'], { cwd: fixture.services.backend.clonePath });
    
    // Run sync without flags
    const result = runSync(fixture);
    
    // Legacy behavior: exit 0 even with error
    assert.equal(result.exitCode, 0, 'Exit code should be 0 in non-strict mode');
    assert.match(result.combined, /(Failed|conflict)/i, 'Error message should appear');
    
  } finally {
    await cleanup(fixture);
  }
});

test('UT-SYNC-02: --strict, one clone fails, others processed, exit 1', async (t) => {
  const fixture = await createMonorepoFixture({ services: ['backend', 'frontend', 'notification-service'] });
  const reportPath = path.join(fixture.root, 'sync-report.json');
  
  try {
    // Create divergence in backend
    const tempClone = path.join(fixture.root, 'temp-backend');
    spawnSync('git', ['clone', fixture.services.backend.barePath, tempClone]);
    await fs.writeFile(path.join(tempClone, 'remote.txt'), 'remote commit');
    spawnSync('git', ['add', 'remote.txt'], { cwd: tempClone });
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: tempClone });
    spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tempClone });
    spawnSync('git', ['commit', '-m', 'Remote commit'], { cwd: tempClone });
    spawnSync('git', ['push'], { cwd: tempClone });
    await fs.rm(tempClone, { recursive: true, force: true });
    
    // Create local commit
    await fs.writeFile(path.join(fixture.services.backend.clonePath, 'local.txt'), 'local commit');
    spawnSync('git', ['add', 'local.txt'], { cwd: fixture.services.backend.clonePath });
    spawnSync('git', ['commit', '-m', 'Local commit'], { cwd: fixture.services.backend.clonePath });
    
    // Run sync --strict --report
    const result = runSync(fixture, ['--strict', '--report', reportPath]);
    
    // Strict mode: exit 1 on any failure
    assert.equal(result.exitCode, 1, 'Exit code should be 1 in strict mode with failure');
    
    // Check report exists and has valid structure
    const reportContent = await fs.readFile(reportPath, 'utf8');
    const report = JSON.parse(reportContent);
    assert.ok(Array.isArray(report), 'Report should be JSON array');
    
    const backendEntry = report.find(e => e.name === 'backend');
    assert.equal(backendEntry.result, 'failed', 'Backend should have failed');
    assert.ok(backendEntry.error, 'Backend should have error message');
    
    // Other services should have been processed
    assert.ok(report.length >= 2, 'Other services should be processed');
    
  } finally {
    await cleanup(fixture);
  }
});

test('UT-SYNC-03: --strict with divergence does not create merge commit (--ff-only)', async (t) => {
  const fixture = await createMonorepoFixture({ services: ['backend'] });
  
  try {
    // Create a commit in bare
    const tempClone = path.join(fixture.root, 'temp-backend');
    spawnSync('git', ['clone', fixture.services.backend.barePath, tempClone]);
    await fs.writeFile(path.join(tempClone, 'remote.txt'), 'remote commit');
    spawnSync('git', ['add', 'remote.txt'], { cwd: tempClone });
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: tempClone });
    spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tempClone });
    spawnSync('git', ['commit', '-m', 'Remote commit'], { cwd: tempClone });
    spawnSync('git', ['push'], { cwd: tempClone });
    await fs.rm(tempClone, { recursive: true, force: true });
    
    // Create local commit
    await fs.writeFile(path.join(fixture.services.backend.clonePath, 'local.txt'), 'local commit');
    spawnSync('git', ['add', 'local.txt'], { cwd: fixture.services.backend.clonePath });
    spawnSync('git', ['commit', '-m', 'Local commit'], { cwd: fixture.services.backend.clonePath });
    
    // Capture state before
    const commitsBefore = spawnSync('git', ['rev-list', '--count', 'HEAD'], {
      cwd: fixture.services.backend.clonePath,
      encoding: 'utf8'
    }).stdout.trim();
    
    // Run sync --strict
    const result = runSync(fixture, ['--strict']);
    
    // Should fail because --ff-only prevents merge
    assert.equal(result.exitCode, 1, 'Exit code should be 1 (--ff-only prevents merge)');
    
    // Verify no merge commit was created
    const commitsAfter = spawnSync('git', ['rev-list', '--count', 'HEAD'], {
      cwd: fixture.services.backend.clonePath,
      encoding: 'utf8'
    }).stdout.trim();
    
    assert.equal(commitsBefore, commitsAfter, 'No merge commit should be created');
    
  } finally {
    await cleanup(fixture);
  }
});

test('UT-SYNC-04: --strict --include-root --report, root pulled first, JSON schema correct', async (t) => {
  const fixture = await createMonorepoFixture({ services: ['backend'] });
  const reportPath = path.join(fixture.root, 'sync-report.json');
  
  try {
    // Create a bare remote for root
    const rootBarePath = path.join(fixture.root, '..', `root-bare-${Date.now()}.git`);
    await fs.mkdir(path.dirname(rootBarePath), { recursive: true });
    spawnSync('git', ['init', '--bare', '--initial-branch=main', rootBarePath]);
    spawnSync('git', ['remote', 'add', 'origin', rootBarePath], { cwd: fixture.root });
    spawnSync('git', ['push', '-u', 'origin', 'main'], { cwd: fixture.root });
    
    // Make a commit in root bare
    const tempRoot = path.join(fixture.root, '..', `temp-root-${Date.now()}`);
    spawnSync('git', ['clone', rootBarePath, tempRoot]);
    const testFilePath = path.join(tempRoot, 'test.txt');
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, 'root change');
    spawnSync('git', ['add', 'test.txt'], { cwd: tempRoot });
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: tempRoot });
    spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tempRoot });
    spawnSync('git', ['commit', '-m', 'Root commit'], { cwd: tempRoot });
    spawnSync('git', ['push'], { cwd: tempRoot });
    await fs.rm(tempRoot, { recursive: true, force: true });
    
    // Run sync --strict --include-root --report
    const result = runSync(fixture, ['--strict', '--include-root', '--report', reportPath]);
    
    assert.equal(result.exitCode, 0, 'Exit code should be 0');
    
    // Check report
    const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
    assert.ok(Array.isArray(report), 'Report should be JSON array');
    
    // Root should be first
    assert.equal(report[0].name, 'root', 'Root should be first in report');
    assert.equal(report[0].result, 'updated', 'Root should be updated');
    assert.equal(report[0].branch, 'main', 'Root branch should be main');
    assert.equal(report[0].error, null, 'Root error should be null');
    
    // Validate JSON schema
    for (const entry of report) {
      assert.ok(entry.name, 'Entry should have name');
      assert.ok(entry.path, 'Entry should have path');
      assert.ok(entry.branch, 'Entry should have branch');
      assert.ok(['updated', 'fetched', 'cloned', 'failed'].includes(entry.result), 'Result should be valid');
      assert.ok(entry.error === null || typeof entry.error === 'string', 'Error should be null or string');
    }
    
    // Cleanup root bare
    await fs.rm(rootBarePath, { recursive: true, force: true });
    
  } finally {
    await cleanup(fixture);
  }
});

test('UT-SYNC-05: make sync SYNC_FLAGS=... passes flags to script', async (t) => {
  const fixture = await createMonorepoFixture({ services: ['backend'] });
  const reportPath = path.join(fixture.root, 'make-sync-report.json');
  
  try {
    // Copy Makefile to fixture
    const makefileSrc = path.join(process.cwd(), 'Makefile');
    const makefileDest = path.join(fixture.root, 'Makefile');
    await fs.copyFile(makefileSrc, makefileDest);
    
    // Copy sync.sh to fixture scripts directory
    const scriptsDir = path.join(fixture.root, 'scripts');
    await fs.mkdir(scriptsDir, { recursive: true });
    const syncSrc = path.join(process.cwd(), 'scripts/sync.sh');
    const syncDest = path.join(scriptsDir, 'sync.sh');
    await fs.copyFile(syncSrc, syncDest);
    
    // Run make sync with SYNC_FLAGS
    const result = runMakeSync(fixture, `--strict --report ${reportPath}`);
    
    // Should succeed
    assert.equal(result.exitCode, 0, `make sync should succeed. Output: ${result.combined}`);
    
    // Check that report was created (flags were passed)
    const reportExists = await fs.access(reportPath).then(() => true).catch(() => false);
    assert.ok(reportExists, 'Report file should exist (flags were passed)');
    
    const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
    assert.ok(Array.isArray(report), 'Report should be valid JSON array');
    
  } finally {
    await cleanup(fixture);
  }
});
