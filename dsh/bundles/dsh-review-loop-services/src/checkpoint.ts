/**
 * Checkpoint persistence for dsh-review-loop.
 *
 * A checkpoint records "this is what the reviewer has seen": the HEAD sha at
 * review time plus a content hash per changed file. The next incremental
 * review compares the current working tree against it — unchanged files are
 * considered reviewed, changed or new files surface again.
 *
 * Stored under $DSH_HOME/review-loop/<sha1(workspace)>.json so checkpoints
 * never pollute the workspace's own git status.
 */

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

export interface ReviewCheckpoint {
  /** HEAD sha at review time. */
  readonly head: string
  /** path → content hash for every file that differed from HEAD. */
  readonly files: Record<string, string>
  /** ISO timestamp of the review. */
  readonly reviewedAt: string
}

export interface CheckpointStore {
  load(workspace: string): ReviewCheckpoint | undefined
  save(workspace: string, checkpoint: ReviewCheckpoint): void
}

/** Workspace identity for the checkpoint filename — stable across machines per absolute path. */
export function checkpointFile(dshHome: string, workspace: string): string {
  const key = createHash('sha1').update(workspace).digest('hex').slice(0, 16)
  return join(dshHome, 'review-loop', `${key}.json`)
}

export function checkpointDir(dshHome: string): string {
  return join(dshHome, 'review-loop')
}

/** Filesystem-backed store. Zero dependencies; atomic via tmp+rename. */
export function fileStore(dshHome: string): CheckpointStore {
  return {
    load(workspace) {
      const file = checkpointFile(dshHome, workspace)
      if (!existsSync(file)) return undefined
      try {
        return JSON.parse(readFileSync(file, 'utf8')) as ReviewCheckpoint
      } catch {
        return undefined
      }
    },
    save(workspace, checkpoint) {
      const file = checkpointFile(dshHome, workspace)
      const dir = dirname(file)
      mkdirSync(dir, { recursive: true })
      const tmp = `${file}.tmp`
      writeFileSync(tmp, JSON.stringify(checkpoint, null, 2))
      renameSync(tmp, file)
    },
  }
}
