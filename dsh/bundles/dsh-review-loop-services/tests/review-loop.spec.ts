import { execSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it, afterAll } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import SessionStore, { Session, SessionId } from '@deepseek-ai/dsh-session'
import * as reviewLoop from '../src/index.js'

// Never write checkpoints to the running profile, even when DSH_HOME is set.
const fixtureRoot = realpathSync(tmpdir())
const checkpointPrefix = join(fixtureRoot, 'rl-checkpoints-')
const DSH_HOME = mkdtempSync(checkpointPrefix)

interface Harness {
  readonly ctx: Context
  readonly agent: Agent
  readonly session: Session
  readonly workspace: string
  readonly injected: string[]
}

function git(cwd: string, ...args: string[]): string {
  return execSync(`git ${args.map(a => `"${a}"`).join(' ')}`, { cwd, encoding: 'utf8' }).trim()
}

function stubAgent(ctx: Context, id: string, cwd: string, injected: string[]): { agent: Agent; session: Session } {
  const session = ctx.sessions.create(SessionId(id), { meta: { cwd } })
  // Command tests need a session-backed actor and a feedback capture, not a
  // turn driver. Inbox is now a public interface, not an SDK constructor.
  // Fail loudly if command behavior unexpectedly starts driving this test actor.
  const unsupported = (): never => { throw new Error('Review command fixture does not drive agents') }
  const agent: Agent = {
    id: session.id,
    options: {},
    session,
    get inbox() { return unsupported() },
    ctx: new Context(),
    status: 'idle',
    send: unsupported,
    followup: unsupported,
    steer: unsupported,
    inject: (msg) => { injected.push(msg.content.map(b => (b as { text?: string }).text ?? '').join('')) },
    cancel: unsupported,
    runMaintenance: unsupported,
    whenIdle() { return Promise.resolve() },
  }
  return { agent, session }
}

/** Fresh git repo + one committed file, per test. */
function freshWorkspace(): string {
  const ws = mkdtempSync(join(tmpdir(), 'rl-test-'))
  git(ws, 'init', '-q')
  git(ws, 'config', 'user.email', 'test@test.com')
  git(ws, 'config', 'user.name', 'test')
  writeFileSync(join(ws, 'app.ts'), 'const x = 1\n')
  git(ws, 'add', '-A')
  git(ws, 'commit', '-qm', 'init')
  return ws
}

async function harness(): Promise<Harness> {
  const workspace = freshWorkspace()
  const injected: string[] = []
  const ctx = new Context()
  await ctx.plugin(CommandRuntime)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(SessionStore)
  await ctx.plugin(reviewLoop, { dshHome: DSH_HOME })
  const { agent, session } = stubAgent(ctx, `review-loop-${Math.random()}`, workspace, injected)
  await ctx.agents.register(agent)
  return { ctx, agent, session, workspace, injected }
}

async function runReview(h: Harness, line = '/review'): Promise<{ kind: string; text?: string }> {
  const settled = await h.ctx.commands.execute(h.agent, line, [], new AbortController().signal)
  if (settled === undefined) throw new Error(`command not registered: ${line}`)
  return settled.result
}

afterAll(() => {
  // Remove only the exact private checkpoint home created by this fixture.
  if (dirname(DSH_HOME) !== fixtureRoot || !DSH_HOME.startsWith(checkpointPrefix)
    || realpathSync(DSH_HOME) !== DSH_HOME) throw new Error('Unsafe checkpoint fixture cleanup path')
  rmSync(DSH_HOME, { recursive: true, force: true })
})

describe('/review: incremental diff', () => {
  it('reports a changed file with its diff before any checkpoint', async () => {
    const h = await harness()
    writeFileSync(join(h.workspace, 'app.ts'), 'const x = 1\nconst y = 2\n')
    const result = await runReview(h)
    expect(result.kind).toBe('success')
    expect(result.text).toContain('app.ts')
    expect(result.text).toContain('+const y = 2')
  })

  it('shows untracked files', async () => {
    const h = await harness()
    writeFileSync(join(h.workspace, 'notes.md'), 'review me\n')
    const result = await runReview(h)
    expect(result.kind).toBe('success')
    expect(result.text).toContain('notes.md')
  })
})

describe('/review approve: checkpoint + feedback injection', () => {
  it('establishes a checkpoint and reports no unreviewed changes on the next /review', async () => {
    const h = await harness()
    writeFileSync(join(h.workspace, 'app.ts'), 'const x = 1\nconst y = 2\n')
    await runReview(h) // see it first

    const approve = await runReview(h, '/review approve')
    expect(approve.kind).toBe('success')
    expect(approve.text).toContain('checkpoint')

    const again = await runReview(h)
    expect(again.kind).toBe('success')
    expect(again.text).toContain('no unreviewed changes')
  })

  it('shows a file again after it changes post-checkpoint', async () => {
    const h = await harness()
    writeFileSync(join(h.workspace, 'app.ts'), 'const x = 1\nconst y = 2\n')
    await runReview(h, '/review approve')

    writeFileSync(join(h.workspace, 'app.ts'), 'const x = 1\nconst y = 3\n')
    const result = await runReview(h)
    expect(result.text).toContain('app.ts')
    expect(result.text).toContain('+const y = 3')
  })

  it('injects review feedback into the agent when the approve carries a comment', async () => {
    const h = await harness()
    writeFileSync(join(h.workspace, 'app.ts'), 'const x = 1\nconst y = 2\n')
    const approve = await runReview(h, '/review approve rename y to z')
    expect(approve.kind).toBe('success')
    expect(h.injected.length).toBe(1)
    expect(h.injected[0]).toContain('rename y to z')
  })
})

describe('/review all: full diff vs HEAD', () => {
  it('shows the complete working-tree change set even after a checkpoint', async () => {
    const h = await harness()
    writeFileSync(join(h.workspace, 'app.ts'), 'const x = 1\nconst y = 2\n')
    await runReview(h, '/review approve')
    const result = await runReview(h, '/review all')
    expect(result.kind).toBe('success')
    expect(result.text).toContain('app.ts')
  })
})

describe('checkpoint file layout', () => {
  it('stores one checkpoint json keyed by workspace', async () => {
    const h = await harness()
    writeFileSync(join(h.workspace, 'app.ts'), 'const x = 1\nconst y = 2\n')
    await runReview(h, '/review approve')
    const { checkpointFile } = await import('../src/checkpoint.js')
    const file = checkpointFile(DSH_HOME, h.workspace)
    expect(existsSync(file)).toBe(true)
    const data = JSON.parse(readFileSync(file, 'utf8')) as { head: string; files: Record<string, string> }
    expect(data.head).toMatch(/^[0-9a-f]{40}$/)
    expect(data.files['app.ts']).toBeTruthy()
  })
})
