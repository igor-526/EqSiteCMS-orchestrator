import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerHooks } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { Readable } from 'node:stream'

const sourceURL = new URL('../src/', import.meta.url).href
registerHooks({ resolve(specifier, context, nextResolve) {
  if (context.parentURL?.startsWith(sourceURL) && specifier.startsWith('./') && specifier.endsWith('.js')) {
    return nextResolve(specifier.slice(0, -3) + '.ts', context)
  }
  return nextResolve(specifier, context)
} })
const { registerWebRoutes, STATE_PATH, APPROVE_PATH } = await import('../src/http.ts')
const reviewPlugin = await import('../src/index.ts')
const { apply } = reviewPlugin
const { Context } = await import('@deepseek-ai/cordis')
const { default: CommandRuntime } = await import('@deepseek-ai/dsh-commands')
const { default: SessionStore, SessionId } = await import('@deepseek-ai/dsh-session')
const { fileStore } = await import('../src/checkpoint.ts')

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' }, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}
function fixture(t) {
  const temp = realpathSync(mkdtempSync(join(tmpdir(), 'review-integration-')))
  t.after(() => {
    const target = realpathSync(temp)
    assert.equal(target, temp)
    assert.equal(dirname(target), realpathSync(tmpdir()))
    assert(target.startsWith(join(realpathSync(tmpdir()), 'review-integration-')))
    rmSync(target, { recursive: true })
  })
  const root = join(temp, 'root%literal')
  const alpha = join(root, 'services', 'alpha')
  const beta = join(root, 'services', 'beta')
  const nested = join(root, 'nested')
  for (const cwd of [root, alpha, beta]) {
    mkdirSync(cwd, { recursive: true })
    git(cwd, 'init', '-q')
    git(cwd, 'config', 'user.email', 'fixture@example.invalid')
    git(cwd, 'config', 'user.name', 'Review fixture')
    git(cwd, 'config', 'commit.gpgsign', 'false')
    writeFileSync(join(cwd, '.gitignore'), '/services/\n')
    writeFileSync(join(cwd, 'app.txt'), 'base\n')
    git(cwd, 'add', '.')
    git(cwd, 'commit', '-qm', 'baseline')
  }
  const manifest = 'alpha git:alpha\nbeta git:beta\n'
  writeFileSync(join(root, 'services.manifest'), manifest)
  git(root, 'add', 'services.manifest')
  git(root, 'commit', '-qm', 'manifest')
  mkdirSync(nested)
  const home = join(temp, 'home')
  const store = fileStore(home)
  const saves = []
  const observedStore = { load: cwd => store.load(cwd), save(cwd, checkpoint) { saves.push(cwd); store.save(cwd, checkpoint) } }
  const messages = new Map()
  const agents = [['root-1', root], ['root-2', root], ['nested', nested], ['alpha', alpha], ['beta', beta], ['other', temp]].map(([id, cwd]) => {
    messages.set(id, [])
    return { id, session: { header: { cwd } }, inject(message) { messages.get(id).push(message) } }
  })
  const routes = new Map()
  const sessions = new Map([['nested-session', { header: { cwd: nested } }]])
  const ctx = { get(name) {
    return { webServer: { register(route) { routes.set(route.path, route.handler); return () => routes.delete(route.path) } }, agents: { list: () => agents }, sessions }[name]
  } }
  const dispose = registerWebRoutes(ctx, { store: observedStore })
  async function request(path, { workspace = root, session, body = '', method = path === STATE_PATH ? 'GET' : 'POST', noQuery = false } = {}) {
    const query = noQuery ? '' : '?' + new URLSearchParams(session ? { session } : { workspace })
    const req = Readable.from(body ? [Buffer.from(body)] : [])
    req.url = path + query
    req.method = method
    let status, data
    await routes.get(path)(req, { writeHead(code) { status = code }, end(text) { data = JSON.parse(text) } })
    return { status, data }
  }
  function command(agent = agents[0], maxOutputChars = 20000) {
    let handler
    apply({ commands: { register(definition) { handler = definition.handler } }, inject() { /* Command-only unit fixture; real lifecycle is covered below. */ }, get: () => undefined, logger: { info() {} } }, { dshHome: home, maxOutputChars })
    return rawInput => handler({ agent, rawInput })
  }
  return { root, alpha, beta, nested, home, store, saves, messages, agents, routes, request, dispose, command, manifest }
}

// Public Cordis provider fixture: no SDK aliases, loader patches, or fake inject.
function mockWebServer() {
  const routes = new Map()
  const disposed = []
  let registered = 0
  return { routes, disposed, get registered() { return registered }, register(route) {
    const key = `${route.kind}:${route.path}`
    assert.equal(routes.has(key), false, `duplicate route: ${key}`)
    routes.set(key, route)
    registered++
    return () => { assert.equal(routes.delete(key), true); disposed.push(key) }
  } }
}
async function settle(ctx) {
  await Promise.all([...ctx.registry.values()].flatMap(runtime => [...runtime.fibers].map(fiber => fiber.await())))
}
async function lifecycleHarness(t, alreadyAvailable) {
  const f = fixture(t)
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  await ctx.plugin(CommandRuntime)
  await ctx.plugin(SessionStore)
  const actor = { ...f.agents[0], session: ctx.sessions.create(SessionId('review-lifecycle'), { meta: { cwd: f.root } }) }
  const server = mockWebServer()
  const provide = server => ctx.plugin(webCtx => { webCtx.provide('webServer', server) })
  let provider = alreadyAvailable ? await provide(server) : undefined
  const plugin = await ctx.plugin(reviewPlugin, { dshHome: f.home })
  await settle(ctx)
  const command = () => ctx.commands.execute(actor, '/review', [], new AbortController().signal)
  assert.equal((await command()).result.kind, 'success', 'headless /review stays registered')
  if (!alreadyAvailable) {
    assert.equal(ctx.get('webServer'), undefined)
    assert.equal(server.routes.size, 0)
    provider = await provide(server)
    await settle(ctx)
  }
  const paths = [`exact:${STATE_PATH}`, `exact:${APPROVE_PATH}`]
  const assertRoutes = target => assert.deepEqual([...target.routes.keys()], paths)
  assertRoutes(server)
  // Exercise the actual registered GET and POST handlers against private Git fixtures.
  const request = async (target, path, method) => {
    const req = Readable.from([])
    req.url = path + '?' + new URLSearchParams({ workspace: f.root })
    req.method = method
    let status, data
    await target.routes.get(`exact:${path}`).handler(req, {
      writeHead(code) { status = code }, end(text) { data = JSON.parse(text) },
    })
    assert.equal(status, 200)
    assert.equal(data.ok, true)
    assert.equal(data.repositories.length, 3)
  }
  await request(server, STATE_PATH, 'GET')
  await request(server, APPROVE_PATH, 'POST')
  await provider.dispose()
  await settle(ctx)
  assert.equal(server.routes.size, 0)
  assert.deepEqual(server.disposed, paths)
  assert.equal((await command()).result.kind, 'success', 'provider loss does not remove /review')
  // Reuse the same route table first: leaked registrations would throw here.
  provider = await provide(server)
  await settle(ctx)
  assertRoutes(server)
  assert.equal(server.registered, 4)
  await provider.dispose()
  const replacement = mockWebServer()
  provider = await provide(replacement)
  await settle(ctx)
  assert.equal(server.routes.size, 0)
  assertRoutes(replacement)
  await request(replacement, STATE_PATH, 'GET')
  await request(replacement, APPROVE_PATH, 'POST')
  await plugin.dispose()
  await settle(ctx)
  assert.equal(replacement.routes.size, 0)
  assert.deepEqual(replacement.disposed, paths, 'child routes die with parent plugin')
  assert.equal(await command(), undefined, 'parent disposal removes /review')
  await provider.dispose()
}
test('real Cordis apply: late webServer, loss, same-provider reprovide, replacement and headless commands', t => lifecycleHarness(t, false))
test('real Cordis apply: already available webServer and child-owned route cleanup', t => lifecycleHarness(t, true))

test('HTTP aggregates root + two services, one save per repo and one comment per original-cwd agent', async t => {
  const f = fixture(t)
  for (const cwd of [f.root, f.alpha, f.beta]) writeFileSync(join(cwd, 'app.txt'), 'changed\n')
  const initial = await f.request(STATE_PATH)
  assert.equal(initial.status, 200)
  assert.deepEqual(initial.data.repositories.map(r => r.label), ['root', 'alpha', 'beta'])
  assert.deepEqual(initial.data.totals, { repositories: 3, failed: 0, files: 3, unreviewed: 3 })
  assert.equal(initial.data.files, undefined)
  const approval = await f.request(APPROVE_PATH, { body: JSON.stringify({ comment: 'Please improve names' }) })
  assert.equal(approval.status, 200)
  assert.equal(approval.data.ok, true)
  assert.deepEqual(f.saves, [f.root, f.alpha, f.beta])
  assert.deepEqual(approval.data.injectedAgents, ['root-1', 'root-2'])
  assert.deepEqual(approval.data.feedbackErrors, [])
  for (const [id, messages] of f.messages) assert.equal(messages.length, id.startsWith('root-') ? 1 : 0)
  const feedback = f.messages.get('root-1')[0]
  assert.equal(feedback.source.kind, 'review-loop-feedback')
  assert.equal(feedback.source.form, 'notice')
  assert.equal(feedback.content[0].text, '[review feedback] Please improve names')
  assert.equal((await f.request(STATE_PATH)).data.totals.unreviewed, 0)
  f.dispose()
  assert.equal(f.routes.size, 0)
})

test('nested session retains original feedback owner; empty comment never injects', async t => {
  const f = fixture(t)
  const quiet = await f.request(APPROVE_PATH)
  assert.equal(quiet.data.ok, true)
  assert.deepEqual(quiet.data.injectedAgents, [])
  const result = await f.request(APPROVE_PATH, { session: 'nested-session', body: '{"comment":"nested feedback"}' })
  assert.equal(result.data.workspace, f.root)
  assert.deepEqual(result.data.injectedAgents, ['nested'])
  assert.equal(f.messages.get('root-1').length, 0)
  assert.equal(f.messages.get('alpha').length, 0)
})

test('partial state/approval retains success rows, errors, and suppresses comments', async t => {
  const f = fixture(t)
  writeFileSync(join(f.root, 'services.manifest'), f.manifest + 'missing git:missing\n')
  const state = (await f.request(STATE_PATH)).data
  assert.equal(state.ok, false)
  assert.equal(state.totals.failed, 1)
  assert.equal(state.repositories[3].error.code, 'repository')
  const approval = (await f.request(APPROVE_PATH, { body: '{"comment":"not all approved"}' })).data
  assert.equal(approval.ok, false)
  assert.equal(approval.repositories.filter(r => r.checkpoint).length, 3)
  assert.equal(approval.repositories.filter(r => r.error).length, 1)
  assert.deepEqual(f.saves, [f.root, f.alpha, f.beta])
  assert.deepEqual(approval.injectedAgents, [])
  for (const messages of f.messages.values()) assert.equal(messages.length, 0)
  const review = f.command()('')
  assert.equal(review.kind, 'error')
  assert.match(review.text, /4 repository\(s\), 1 failed/)
  assert.match(review.text, /## missing[\s\S]*ERROR \[repository\]/)
  const cmdApproval = f.command()('approve withheld')
  assert.equal(cmdApproval.kind, 'error')
  assert.match(cmdApproval.text, /3\/4 checkpoint\(s\) saved, 1 failed — incomplete/)
  assert.match(cmdApproval.text, /Feedback not injected/)
})

test('commands group repositories; all bypasses checkpoints, clean/empty and bounded outputs', t => {
  const f = fixture(t)
  const command = f.command()
  const clean = command('')
  assert.equal(clean.kind, 'success')
  assert.match(clean.text, /0 changed file\(s\), 0 unreviewed/)
  assert.equal((clean.text.match(/working tree is clean/g) ?? []).length, 3)
  for (const cwd of [f.root, f.alpha, f.beta]) writeFileSync(join(cwd, 'app.txt'), 'changed\n')
  assert.match(command('').text, /3 unreviewed file\(s\)/)
  const approval = command('approve command feedback')
  assert.equal(approval.kind, 'success')
  assert.match(approval.text, /3\/3 checkpoint\(s\) saved, 0 failed — complete/)
  assert.equal(f.messages.get('root-1').length, 1)
  assert.equal(f.messages.get('root-2').length, 0)
  assert.equal(f.messages.get('alpha').length, 0)
  assert.equal((command('').text.match(/no unreviewed changes/g) ?? []).length, 3)
  for (const all of ['all', '--all', 'full']) {
    const result = command(all)
    for (const label of ['root', 'alpha', 'beta']) assert(result.text.includes(`## ${label} —`))
    assert.match(result.text, /3 unreviewed file\(s\)/)
    assert.match(result.text, /\+changed/)
  }
  assert(f.command(f.agents[0], 100)('').text.length <= 100)
  assert.equal(command('approve').kind, 'success')
  assert.equal(f.messages.get('root-1').length, 1)
})

test('untracked directories enumerate real files, preserve ignores, and requeue changed/new content', async t => {
  const f = fixture(t)
  for (const cwd of [f.root, f.alpha, f.beta]) {
    writeFileSync(join(cwd, '.gitignore'), '/services/\n*.env\n')
    mkdirSync(join(cwd, 'newdir'))
    writeFileSync(join(cwd, 'newdir', 'added.txt'), 'initial new content\n')
    writeFileSync(join(cwd, 'newdir', 'ignored.env'), 'ignored fixture value\n')
  }
  const initial = (await f.request(STATE_PATH)).data
  for (const repo of initial.repositories) {
    const file = repo.state.files.find(file => file.path === 'newdir/added.txt')
    assert.equal(file.newFile, true)
    assert.match(file.diff, /initial new content/)
    assert(!repo.state.files.some(file => file.path.endsWith('/') || file.path.endsWith('.env')))
  }
  const approval = (await f.request(APPROVE_PATH)).data
  for (const repo of approval.repositories) assert.notEqual(repo.checkpoint.files['newdir/added.txt'], 'missing')
  assert.equal((await f.request(STATE_PATH)).data.totals.unreviewed, 0)
  writeFileSync(join(f.alpha, 'newdir', 'added.txt'), 'changed after checkpoint\n')
  writeFileSync(join(f.beta, 'newdir', 'second.txt'), 'new after checkpoint\n')
  const after = (await f.request(STATE_PATH)).data
  assert.deepEqual(after.repositories.map(repo => repo.state.unreviewed.map(file => file.path)), [[], ['newdir/added.txt'], ['newdir/second.txt']])
})

test('HTTP feedback failures preserve approval data; method and missing-context errors', async t => {
  const f = fixture(t)
  f.agents[0].inject = () => { throw new Error('fixture injection failure') }
  const result = await f.request(APPROVE_PATH, { body: '{"comment":"hello"}' })
  assert.equal(result.status, 200)
  assert.equal(result.data.ok, true)
  assert.equal(result.data.repositories.filter(r => r.checkpoint).length, 3)
  assert.deepEqual(result.data.injectedAgents, ['root-2'])
  assert.deepEqual(result.data.feedbackErrors, [{ agentId: 'root-1', message: 'fixture injection failure' }])
  const command = f.command()('approve hello')
  assert.equal(command.kind, 'error')
  assert.match(command.text, /3\/3 checkpoint\(s\) saved/)
  assert.match(command.text, /Feedback injection failed/)
  assert.equal((await f.request(APPROVE_PATH, { method: 'GET' })).status, 405)
  assert.equal((await f.request(STATE_PATH, { method: 'POST' })).status, 405)
  assert.equal((await f.request(STATE_PATH, { noQuery: true })).status, 400)
  assert.equal((await f.request(APPROVE_PATH, { session: 'unknown' })).status, 400)
})
