/**
 * Core review-loop logic, shared by the /review command and the webServer
 * HTTP routes. Pure functions over git + checkpoint store — no cordis
 * dependencies, so the same code powers the CLI command, the UI routes,
 * and the integration tests.
 */

import * as git from './git.js'
import type { ReviewCheckpoint } from './checkpoint.js'

export interface FileEntry {
  /** Path relative to the repo root. */
  readonly path: string
  /** Porcelain status code (XY pair). */
  readonly status: string
  /** True when this file is covered by the current checkpoint (hash unchanged). */
  readonly reviewed: boolean
  /** True for untracked files (no diff vs HEAD possible). */
  readonly newFile: boolean
  /** True when the file was deleted from the working tree. */
  readonly deleted: boolean
  /** Unified diff vs HEAD (newFile: content preview). Empty for clean reviewed files. */
  readonly diff: string
}

export interface ReviewState {
  /** Workspace the state describes. */
  readonly workspace: string
  /** Current HEAD sha. */
  readonly head: string
  /** The active checkpoint, when one exists for this workspace. */
  readonly checkpoint: ReviewCheckpoint | undefined
  /** All working-tree changes (vs HEAD), each annotated with reviewed/diff. */
  readonly files: FileEntry[]
  /** Files in the incremental queue (not covered by the checkpoint). */
  readonly unreviewed: FileEntry[]
}

export interface StateOptions {
  /** Show the complete change set even when a checkpoint exists. */
  readonly all?: boolean
}

/** Files that differ from HEAD right now, annotated against the checkpoint. */
export function collectState(cwd: string, store: { load(workspace: string): ReviewCheckpoint | undefined }, options: StateOptions = {}): ReviewState {
  const checkpoint = options.all ? undefined : store.load(cwd)
  const head = git.head(cwd)
  const changed = git.status(cwd)

  const reviewed = new Set<string>()
  if (checkpoint !== undefined && checkpoint.head === head) {
    for (const f of changed) {
      const seen = checkpoint.files[f.path]
      if (seen === undefined) continue
      if (seen === 'deleted') {
        if (git.isDeleted(f)) reviewed.add(f.path)
        continue
      }
      if (seen === git.fileHash(cwd, f.path)) reviewed.add(f.path)
    }
  }

  const files: FileEntry[] = changed.map((f) => {
    const isNew = git.isUntracked(f)
    const isDel = git.isDeleted(f)
    const diff = isNew ? git.untrackedPreview(cwd, f.path) : isDel || reviewed.has(f.path) ? '' : git.diffHead(cwd, f.path)
    return {
      path: f.path,
      status: f.status,
      reviewed: reviewed.has(f.path),
      newFile: isNew,
      deleted: isDel,
      diff,
    }
  })

  return {
    workspace: cwd,
    head,
    checkpoint,
    files,
    unreviewed: files.filter((f) => !f.reviewed),
  }
}

/** Build a checkpoint snapshot of the current working tree. */
export function snapshot(cwd: string, files: git.ChangedFile[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of files) {
    out[f.path] = git.isDeleted(f) ? 'deleted' : git.fileHash(cwd, f.path)
  }
  return out
}

/** Record a review: checkpoint + optional comment text. */
export function approve(cwd: string, store: { save(workspace: string, c: ReviewCheckpoint): void }, comment: string): ReviewCheckpoint {
  const files = git.status(cwd)
  const checkpoint: ReviewCheckpoint = {
    head: git.head(cwd),
    files: snapshot(cwd, files),
    reviewedAt: new Date().toISOString(),
  }
  store.save(cwd, checkpoint)
  return checkpoint
}

/** Render a ReviewState into human-readable markdown (the /review command reply). */
export function renderState(state: ReviewState, maxChars = 6000): string {
  const files = state.unreviewed
  if (files.length === 0) {
    const reviewed = state.checkpoint !== undefined && state.checkpoint.head === state.head
    return reviewed
      ? `[review-loop] ✅ no unreviewed changes since the last review checkpoint (${state.checkpoint?.reviewedAt}).\nRun \`/review all\` to see the full change set, or \`/review approve\` to refresh the checkpoint.`
      : '[review-loop] ✅ working tree is clean.\nNothing to review.'
  }
  const sections = files.map((f) => `### ${f.status.trim()} ${f.path}\n\n${f.diff}`)
  let body = sections.join('\n\n')
  if (body.length > maxChars) body = `${body.slice(0, maxChars)}\n… (truncated)`
  const head = state.checkpoint ? `checkpoint ${state.checkpoint.head.slice(0, 7)} (${state.checkpoint.reviewedAt})` : 'no checkpoint yet (full change set)'
  return [
    `[review-loop] ${files.length} unreviewed file(s) — ${head}`,
    '',
    body,
    '',
    'Run `/review approve [comment]` to mark these as reviewed (comment reaches the agent).',
  ].join('\n')
}
