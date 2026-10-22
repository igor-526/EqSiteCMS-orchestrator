/**
 * Thin git helpers for dsh-review-loop. Pure spawnSync, no external deps.
 * All operations are read-only except `hashObject` (git hash-object is
 * content-addressed and writes nothing without `-w`).
 */

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

export interface ChangedFile {
  /** Path relative to the repo root, as reported by git. */
  readonly path: string
  /** Porcelain status code (XY pair, e.g. ' M', '??'). */
  readonly status: string
}

export class GitError extends Error {
  constructor(readonly args: readonly string[], readonly stderr: string) {
    super(`git ${args.join(' ')} failed: ${stderr.trim()}`)
  }
}

function run(cwd: string, ...args: string[]): string {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (r.status !== 0) {
    throw new GitError(args, r.stderr || '')
  }
  // Only strip trailing newlines — porcelain output keeps a leading space
  // in its status column, and trim() would destroy the alignment.
  return (r.stdout || '').replace(/\n+$/, '')
}

/** Parse `git status --porcelain` into changed files (supports both v1 and v2 output shapes). */
export function status(cwd: string): ChangedFile[] {
  const out = run(cwd, 'status', '--porcelain', '--untracked-files=all')
  if (!out) return []
  return out.split('\n').map((line) => ({
    status: line.slice(0, 2),
    path: line.slice(3).replace(/^"|"$/g, ''),
  }))
}

/** The current HEAD sha, or empty string in a repo without commits. */
export function head(cwd: string): string {
  try {
    return run(cwd, 'rev-parse', 'HEAD')
  } catch {
    return ''
  }
}

/** Untracked files are invisible to `git diff HEAD`; this lists them. */
export function isUntracked(f: ChangedFile): boolean {
  return f.status.includes('?')
}

/** Deleted files carry no content; diff shows the removal via `git diff HEAD`. */
export function isDeleted(f: ChangedFile): boolean {
  return f.status.startsWith('D') || f.status.endsWith('D')
}

/** Content hash of one path (tracked or untracked, no -w so nothing is written). */
export function fileHash(cwd: string, path: string): string {
  try {
    return run(cwd, 'hash-object', path)
  } catch {
    return 'missing'
  }
}

/** Unified diff of one file against HEAD (covers staged + unstaged). */
export function diffHead(cwd: string, path: string, maxLines = 300): string {
  const out = run(cwd, 'diff', 'HEAD', '--', path)
  if (!out) return ''
  const lines = out.split('\n')
  return lines.length > maxLines ? [...lines.slice(0, maxLines), `… (${lines.length - maxLines} more lines)`].join('\n') : out
}

/** Preview of an untracked file (git cannot diff it against HEAD). */
export function untrackedPreview(cwd: string, path: string, maxLines = 50): string {
  try {
    const content = readFileSync(joinPath(cwd, path), 'utf8')
    const lines = content.split('\n')
    const shown = lines.length > maxLines ? [...lines.slice(0, maxLines), `… (${lines.length - maxLines} more lines)`] : lines
    return `+++ ${path} (new file)\n${shown.join('\n')}`
  } catch {
    return `+++ ${path} (new file, unreadable)`
  }
}

/** Tiny path join without importing node:path at module scope. */
function joinPath(dir: string, path: string): string {
  return `${dir.replace(/\/+$/, '')}/${path}`
}
