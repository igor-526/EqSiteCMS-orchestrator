/**
 * Web routes for the review-loop UI panel. The client bundle polls
 * `/plugins/dsh-review-loop/state` and posts approvals to
 * `/plugins/dsh-review-loop/approve` — the same core logic as the /review
 * command, exposed over plain JSON so the browser half needs no Typert RPC.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
// Type-only: WebServer only appears in a cast; the runtime import must stay
// erased so the plugin loads in compositions without a webServer capability.
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import { boundContextSummary, createUserMessage, type ContextFormed } from '@deepseek-ai/dsh-llm'
import type { CheckpointStore } from './checkpoint.js'
import { collectWorkspaceState, approveWorkspace } from './workspaces.js'

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'review-loop-feedback': { readonly kind: 'review-loop-feedback' } & ContextFormed
  }
}

export function reviewFeedback(comment: string) {
  return createUserMessage({
    content: [{ type: 'text', text: `[review feedback] ${comment}` }],
    source: { kind: 'review-loop-feedback', form: 'notice', summary: boundContextSummary(`Review feedback: ${comment.replace(/[\r\n]+/g, ' ')}`) },
  })
}

export const STATE_PATH = '/plugins/dsh-review-loop/state'
export const APPROVE_PATH = '/plugins/dsh-review-loop/approve'

/** Resolve the workspace from ?workspace= or ?session= (via ctx.sessions). */
function workspaceOf(req: IncomingMessage, ctx: Context): string | undefined {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const ws = url.searchParams.get('workspace')
  if (ws) return ws // URLSearchParams already decoded the query value.
  const sessionId = url.searchParams.get('session')
  if (sessionId) {
    const sessions = ctx.get('sessions')
    return sessions?.get(sessionId as never)?.header.cwd
  }
  return undefined
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

/** Find live agents whose session workspace matches (approval injection targets). */
export function agentsForWorkspace(ctx: Context, workspace: string): Agent[] {
  const agents = ctx.get('agents')
  if (agents === undefined) return []
  return agents.list().filter((a) => a.session.header.cwd === workspace)
}

export interface WebRoutesDeps {
  readonly store: CheckpointStore
}

/**
 * Register the state/approve routes. Returns disposers; call inside
 * `ctx.effect` so they die with the plugin fiber. Uses the optional-access
 * path (`ctx.get`) so the plugin also loads without a webServer capability
 * (headless compositions, tests).
 */
export function registerWebRoutes(ctx: Context, deps: WebRoutesDeps): () => void {
  const webServer = ctx.get('webServer') as WebServer | undefined
  if (webServer === undefined) return () => {}
  const disposers: Array<() => void> = []

  disposers.push(webServer.register({
    kind: 'exact',
    path: STATE_PATH,
    handler: (req, res) => {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'GET required' })
      const workspace = workspaceOf(req, ctx)
      if (!workspace) return sendJson(res, 400, { error: 'workspace or session query parameter required' })
      try {
        sendJson(res, 200, collectWorkspaceState(workspace, deps.store))
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) })
      }
    },
  }))

  disposers.push(webServer.register({
    kind: 'exact',
    path: APPROVE_PATH,
    handler: async (req, res) => {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST required' })
      const workspace = workspaceOf(req, ctx)
      if (!workspace) return sendJson(res, 400, { error: 'workspace or session query parameter required' })
      let comment = ''
      try {
        const body = JSON.parse(await readBody(req)) as { comment?: unknown }
        comment = typeof body.comment === 'string' ? body.comment : ''
      } catch {
        // empty body → no comment
      }
      try {
        // Keep the request's ORIGINAL cwd, even when discovery canonicalizes it.
        const ownerWorkspace = workspace
        const approval = approveWorkspace(ownerWorkspace, deps.store)
        const injected: string[] = []
        const feedbackErrors: Array<{ agentId: string; message: string }> = []
        // Partial persistence must never imply that all repositories were approved.
        if (comment && approval.ok) {
          for (const agent of agentsForWorkspace(ctx, ownerWorkspace)) {
            try {
              agent.inject(reviewFeedback(comment))
              injected.push(agent.id)
            } catch (error) {
              feedbackErrors.push({ agentId: agent.id, message: error instanceof Error ? error.message : String(error) })
            }
          }
        }
        sendJson(res, 200, { ...approval, injectedAgents: injected, feedbackErrors })
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) })
      }
    },
  }))

  return () => {
    for (const dispose of disposers) dispose()
  }
}
