import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerHooks } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

// Source uses production .js specifiers. Resolve only this fork's local TS
// source for Node 24's real built-in TS transformer (no dependency installs).
const sourceURL = new URL('../src/', import.meta.url).href
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(sourceURL) && specifier.startsWith('./') && specifier.endsWith('.js')) {
      return nextResolve(specifier.slice(0, -3) + '.ts', context)
    }
    return nextResolve(specifier, context)
  },
})
const { parseServicesManifest, discoverWorkspaces, collectWorkspaceState, approveWorkspace } = await import('../src/workspaces.ts')
const { fileStore, checkpointFile } = await import('../src/checkpoint.ts')

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' }, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}
function seed(cwd, ignore) {
  mkdirSync(cwd, { recursive: true })
  git(cwd, 'init', '-q')
  git(cwd, 'config', 'user.email', 'fixture@example.invalid')
  git(cwd, 'config', 'user.name', 'Review fixture')
  git(cwd, 'config', 'commit.gpgsign', 'false')
  writeFileSync(join(cwd, '.gitignore'), ignore)
  writeFileSync(join(cwd, 'tracked.txt'), 'base\n')
  git(cwd, 'add', '.')
  git(cwd, 'commit', '-qm', 'fixture baseline')
}

test('pure multi-repository discovery, ignores, HEAD deltas and isolated approvals', () => {
  const temp = realpathSync(mkdtempSync(join(tmpdir(), 'review-workspaces-')))
  const root = join(temp, 'root')
  const a = join(root, 'services', 'alpha')
  const b = join(root, 'services', 'beta')
  try {
    seed(root, '/services/\nlocals.env\n')
    seed(a, 'locals.env\n')
    seed(b, 'locals.env\n')
    const manifest = '# services\n\nalpha git@example.invalid:a\nbeta https://example.invalid/b # comment\n'
    writeFileSync(join(root, 'services.manifest'), manifest)
    git(root, 'add', 'services.manifest')
    git(root, 'commit', '-qm', 'manifest')
    for (const cwd of [root, a, b]) {
      writeFileSync(join(cwd, 'tracked.txt'), `modified ${cwd}\n`)
      writeFileSync(join(cwd, 'locals.env'), 'ignored fixture value\n')
    }
    writeFileSync(join(a, 'added.txt'), 'staged addition\n')
    git(a, 'add', 'added.txt')
    writeFileSync(join(b, 'new.txt'), 'untracked addition\n')
    const store = fileStore(join(temp, 'home'))
    const initial = collectWorkspaceState(root, store)
    assert.equal(initial.ok, true)
    assert.equal(initial.repositories.length, 3)
    assert.deepEqual(initial.totals, { repositories: 3, failed: 0, files: 5, unreviewed: 5 })
    for (const repo of initial.repositories) {
      assert.equal(repo.state.head, git(repo.workspace, 'rev-parse', 'HEAD'))
      assert(!repo.state.files.some((file) => file.path.includes('locals.env')))
      assert(repo.state.files.find((file) => file.path === 'tracked.txt').diff.includes('modified'))
    }
    assert(!initial.repositories[0].state.files.some((file) => file.path.startsWith('services/')))
    assert(initial.repositories[1].state.files.some((file) => file.path === 'added.txt' && file.status === 'A '))
    assert(initial.repositories[2].state.files.some((file) => file.path === 'new.txt' && file.newFile))

    // Nested input and symlink aliases resolve to canonical roots, never new keys.
    mkdirSync(join(root, 'nested'))
    symlinkSync(a, join(root, 'services', 'alias'), 'dir')
    symlinkSync(root, join(root, 'services', 'root-alias'), 'dir')
    writeFileSync(join(root, 'services.manifest'), manifest + 'alpha git:x\nalias git:x\nroot-alias git:x\n')
    assert.equal(discoverWorkspaces(join(root, 'nested')).repositories.length, 3)
    const approved = approveWorkspace(root, store)
    assert.equal(approved.ok, true)
    assert.equal(approved.repositories.length, 3)
    assert.equal(collectWorkspaceState(root, store).totals.unreviewed, 0)
    assert.equal(collectWorkspaceState(root, store, { all: true }).totals.unreviewed, 6)
    assert.equal(new Set([root, a, b].map((cwd) => checkpointFile(join(temp, 'home'), cwd))).size, 3)
    const rootCheckpoint = readFileSync(checkpointFile(join(temp, 'home'), root), 'utf8')
    const betaCheckpoint = readFileSync(checkpointFile(join(temp, 'home'), b), 'utf8')
    writeFileSync(join(a, 'tracked.txt'), 'alpha changed again\n')
    const incremental = collectWorkspaceState(root, store)
    assert.deepEqual(incremental.repositories.map((repo) => repo.state.unreviewed.length), [0, 1, 0])
    assert.equal(readFileSync(checkpointFile(join(temp, 'home'), root), 'utf8'), rootCheckpoint)
    assert.equal(readFileSync(checkpointFile(join(temp, 'home'), b), 'utf8'), betaCheckpoint)

    // Missing repo and an ordinary directory cannot fall back to the parent.
    mkdirSync(join(root, 'services', 'not-a-repo'))
    writeFileSync(join(root, 'services.manifest'), manifest + 'missing git:x\nnot-a-repo git:y\n')
    const incomplete = collectWorkspaceState(root, store)
    assert.equal(incomplete.ok, false)
    assert.equal(incomplete.totals.failed, 2)
    assert(incomplete.repositories.find((repo) => repo.label === 'not-a-repo').error.message.includes('independent Git root'))
    const partial = approveWorkspace(root, store)
    assert.equal(partial.ok, false)
    assert.equal(partial.repositories.filter((repo) => repo.checkpoint).length, 3)
    assert.equal(partial.repositories.filter((repo) => repo.error).length, 2)

    // Store failures are reported independently, without masking later successes.
    writeFileSync(join(root, 'services.manifest'), manifest)
    const saved = []
    const failure = approveWorkspace(root, { save(cwd, checkpoint) {
      if (cwd === a) throw new Error('fixture save failure')
      saved.push(cwd)
      store.save(cwd, checkpoint)
    } })
    assert.equal(failure.ok, false)
    assert.deepEqual(saved, [root, b])
    assert.equal(failure.repositories[1].error.code, 'approve')
    const badLoad = collectWorkspaceState(root, { load(cwd) {
      if (cwd === b) throw new Error('fixture load failure')
      return store.load(cwd)
    } })
    assert.equal(badLoad.ok, false)
    assert.equal(badLoad.repositories[2].error.code, 'collect')
    assert.equal(discoverWorkspaces(join(temp, 'absent')).repositories[0].error.code, 'repository')
    mkdirSync(join(temp, 'not-git'))
    assert.equal(discoverWorkspaces(join(temp, 'not-git')).repositories[0].error.code, 'repository')
    assert.deepEqual(parseServicesManifest(' # comment\r\n\nalpha git:x # trailing\r\n'), ['alpha'])
    assert.throws(() => parseServicesManifest('../escape git:x'), /row 1/)
    assert.throws(() => parseServicesManifest('alpha'), /row 1/)
    writeFileSync(join(root, 'services.manifest'), 'invalid-row')
    assert.equal(collectWorkspaceState(root, store).ok, false)
    assert.equal(approveWorkspace(root, store).diagnostics[0].code, 'manifest')
    // Normal Git workspaces with no manifest preserve single-repo behavior.
    assert.equal(discoverWorkspaces(a).repositories.length, 1)
  } finally {
    // Verify the exact resolved generated target before recursive deletion.
    const target = realpathSync(temp)
    assert.equal(target, temp)
    assert.equal(dirname(target), realpathSync(tmpdir()))
    assert(target.startsWith(join(realpathSync(tmpdir()), 'review-workspaces-')))
    rmSync(target, { recursive: true })
  }
})
