/**
 * dsh-review-loop — incremental diff reviewer for DeepSeek Harness.
 *
 * Commands:
 *   /review               show changes since the last review checkpoint
 *                         (or the full working-tree change set if none exists)
 *   /review all           show the complete change set vs HEAD
 *   /review approve [msg] record a checkpoint; optional feedback is injected
 *                         into the agent as a user message
 *
 * Web (when the webServer capability is present):
 *   GET  /plugins/dsh-review-loop/state?workspace=<abs path>
 *   POST /plugins/dsh-review-loop/approve?workspace=<abs path>  { "comment"?: string }
 */

import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import { fileStore, type CheckpointStore } from './checkpoint.js'
import { renderState } from './review.js'
import { collectWorkspaceState, approveWorkspace, type WorkspaceState } from './workspaces.js'
import { registerWebRoutes, agentsForWorkspace, reviewFeedback } from './http.js'

function bounded(text: string, maxChars: number): string {
  const limit = Math.max(0, Math.floor(maxChars))
  const suffix = '\n… (truncated)'
  return text.length <= limit ? text : limit < suffix.length ? text.slice(0, limit) : text.slice(0, limit - suffix.length) + suffix
}

function renderWorkspaceState(state: WorkspaceState, maxChars: number): string {
  const { repositories, failed, files, unreviewed } = state.totals
  const lines = [`[review-loop] ${repositories} repository(s), ${failed} failed, ${files} changed file(s), ${unreviewed} unreviewed file(s) — ${state.ok ? 'complete' : 'incomplete'}`]
  // Put failures before potentially large diffs so truncation cannot imply clean.
  for (const diagnostic of state.diagnostics) lines.push(`ERROR [${diagnostic.code}]: ${diagnostic.message}`)
  for (const repo of state.repositories) {
    if (repo.error) lines.push(`## ${repo.label} — ${repo.workspace}\nERROR [${repo.error.code}]: ${repo.error.message}`)
  }
  for (const repo of state.repositories) {
    if (repo.state) lines.push(`## ${repo.label} — ${repo.workspace}\n${renderState(repo.state, maxChars)}`)
  }
  return bounded(lines.join('\n\n'), maxChars)
}

export const name = 'dsh-review-loop'
export const inject = ['commands']

export interface Config {
  /** DSH home directory for checkpoint storage; defaults to $DSH_HOME. */
  dshHome?: string
  /** Maximum total characters in one /review reply. */
  maxOutputChars?: number
}

const MAX_OUTPUT = 6000

function resolveConfig(config: Config | undefined): { dshHome: string; maxOutputChars: number; store: CheckpointStore } {
  const dshHome = config?.dshHome ?? process.env.DSH_HOME ?? join(process.env.HOME ?? '/tmp', '.dsh')
  return { dshHome, maxOutputChars: config?.maxOutputChars ?? MAX_OUTPUT, store: fileStore(dshHome) }
}

function handleReview(invocation: CommandInvocation, ctx: Context, cfg: ReturnType<typeof resolveConfig>): CommandResult {
  const cwd = invocation.agent.session.header.cwd
  if (!cwd) {
    return { kind: 'error', text: '[review-loop] session has no cwd; open a workspace session first' }
  }

  const raw = invocation.rawInput.trim()
  if (raw === 'approve' || raw.startsWith('approve ')) {
    return handleApprove(invocation, ctx, cfg, raw === 'approve' ? '' : raw.slice('approve '.length))
  }

  const showAll = raw === 'all' || raw === '--all' || raw === 'full'
  const state = collectWorkspaceState(cwd, cfg.store, { all: showAll })
  return { kind: state.ok ? 'success' : 'error', text: renderWorkspaceState(state, cfg.maxOutputChars) }
}

function handleApprove(invocation: CommandInvocation, ctx: Context, cfg: ReturnType<typeof resolveConfig>, comment: string): CommandResult {
  const cwd = invocation.agent.session.header.cwd
  if (!cwd) return { kind: 'error', text: '[review-loop] session has no cwd' }

  const ownerWorkspace = cwd
  const approval = approveWorkspace(ownerWorkspace, cfg.store)
  const saved = approval.repositories.filter((repo) => repo.checkpoint).length
  const failed = approval.repositories.length - saved
  const lines = [`[review-loop] ${saved}/${approval.repositories.length} checkpoint(s) saved, ${failed} failed — ${approval.ok ? 'complete' : 'incomplete'}`]
  for (const diagnostic of approval.diagnostics) lines.push(`ERROR [${diagnostic.code}]: ${diagnostic.message}`)
  for (const repo of approval.repositories) {
    lines.push(`## ${repo.label} — ${repo.workspace}`)
    if (repo.checkpoint) lines.push(`checkpoint saved (${Object.keys(repo.checkpoint.files).length} file(s) reviewed at ${repo.checkpoint.head.slice(0, 7)})`)
    else lines.push(`ERROR [${repo.error.code}]: ${repo.error.message}`)
  }

  let feedbackFailed = false
  if (comment && approval.ok) {
    // Preserve the command's original actor, not discovered service actors.
    try {
      invocation.agent.inject(reviewFeedback(comment))
      lines.push(`Feedback injected into agent: "${comment}"`)
    } catch (error) {
      feedbackFailed = true
      lines.push(`Feedback injection failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else if (comment) {
    lines.push('Feedback not injected: approval incomplete; successful checkpoints were retained.')
  } else {
    lines.push('Run `/review approve <comment>` next time to also send review feedback to the agent.')
  }
  return { kind: approval.ok && !feedbackFailed ? 'success' : 'error', text: bounded(lines.join('\n'), cfg.maxOutputChars) }
}

export function apply(ctx: Context, config?: Config): void {
  const cfg = resolveConfig(config)

  ctx.commands.register({
    name: 'review',
    description: 'review the changes the agent made since the last review checkpoint',
    input: { hint: '[all | approve <comment>]' },
    handler: (invocation) => handleReview(invocation, ctx, cfg),
  })

  if (ctx.get('webServer') !== undefined) {
    ctx.effect(() => registerWebRoutes(ctx, { store: cfg.store }), 'dsh-review-loop: web routes')
  }

  ctx.logger.info('[review-loop] plugin loaded, /review registered')
}

// re-export for tests / external callers
export { agentsForWorkspace }
