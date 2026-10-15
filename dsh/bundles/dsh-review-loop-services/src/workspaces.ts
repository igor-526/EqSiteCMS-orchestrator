/** Multi-repository orchestration only: no Harness, HTTP, injection or Git writes.
 * Discovery reads only services.manifest and Git metadata. Collectors retain each
 * repository's own ignore rules, HEAD baseline and canonical checkpoint key.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { CheckpointStore, ReviewCheckpoint } from './checkpoint.js'
import { approve, collectState } from './review.js'
import type { ReviewState, StateOptions } from './review.js'

export interface Repository {
  /** Canonical absolute Git root, also used as the checkpoint key. */
  readonly id: string
  readonly label: string
  readonly workspace: string
}
export interface RepositoryError {
  readonly code: 'repository' | 'manifest' | 'collect' | 'approve'
  readonly message: string
}
export type DiscoveredRepository = Repository & { readonly error?: RepositoryError }
export interface WorkspaceDiscovery {
  readonly workspace: string
  readonly repositories: DiscoveredRepository[]
  /** Discovery failures not attributable to a repository (e.g. malformed manifest). */
  readonly diagnostics: RepositoryError[]
}
export type RepositoryState = Repository & (
  | { readonly state: ReviewState; readonly error?: never }
  | { readonly error: RepositoryError; readonly state?: never }
)
export interface WorkspaceState {
  readonly workspace: string
  readonly repositories: RepositoryState[]
  readonly diagnostics: RepositoryError[]
  readonly totals: { readonly repositories: number; readonly failed: number; readonly files: number; readonly unreviewed: number }
  /** False means the aggregate is incomplete; never report it as clean. */
  readonly ok: boolean
}
export type RepositoryApproval = Repository & (
  | { readonly checkpoint: ReviewCheckpoint; readonly error?: never }
  | { readonly error: RepositoryError; readonly checkpoint?: never }
)
export interface WorkspaceApproval {
  readonly workspace: string
  readonly repositories: RepositoryApproval[]
  readonly diagnostics: RepositoryError[]
  /** Per-repo persistence is not transactional; inspect successes on partial failure. */
  readonly ok: boolean
}

function failure(code: RepositoryError['code'], error: unknown): RepositoryError {
  return { code, message: error instanceof Error ? error.message : String(error) }
}

/** Exact format: <name> <git_repo_url>. URLs are never fetched or executed.
 * Blank lines, full-line comments and whitespace-delimited trailing comments
 * are accepted; service names cannot escape services/.
 */
export function parseServicesManifest(text: string): string[] {
  const names: string[] = []
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.replace(/\s+#.*$/, '').trim()
    if (!line || line.startsWith('#')) continue
    const fields = line.split(/\s+/)
    const name = fields[0]!
    if (fields.length !== 2 || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
      throw new Error(`Invalid services.manifest row ${index + 1}: expected <name> <git_repo_url>`)
    }
    names.push(name)
  }
  return names
}

/** Ordinary directories inside a parent Git repo MUST NOT silently become that repo. */
function canonicalGitRoot(path: string, requireExact: boolean): string {
  const canonical = realpathSync(path)
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: canonical, encoding: 'utf8', env: process.env,
  })
  if (result.error || result.status !== 0) {
    throw new Error(`Not a Git workspace: ${path}: ${result.error?.message ?? result.stderr.trim()}`)
  }
  const root = realpathSync(result.stdout.trim())
  if (requireExact && root !== canonical) throw new Error(`Expected an independent Git root at ${path}; found parent ${root}`)
  return root
}

/** Resolve the original session cwd to its Git root, then inspect only the
 * manifest's services/<name> paths. Missing manifest means a normal single repo.
 * Aliases (including symlinks) share one canonical repository/checkpoint.
 */
export function discoverWorkspaces(cwd: string): WorkspaceDiscovery {
  let workspace: string
  try {
    workspace = canonicalGitRoot(cwd, false)
  } catch (error) {
    const requested = resolve(cwd)
    return { workspace: requested, repositories: [{ id: requested, label: 'root', workspace: requested, error: failure('repository', error) }], diagnostics: [] }
  }
  const repositories: DiscoveredRepository[] = [{ id: workspace, label: 'root', workspace }]
  const diagnostics: RepositoryError[] = []
  let names: string[]
  try {
    names = parseServicesManifest(readFileSync(join(workspace, 'services.manifest'), 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') diagnostics.push(failure('manifest', error))
    return { workspace, repositories, diagnostics }
  }
  const seen = new Set([workspace])
  const attempted = new Set<string>()
  for (const name of names) {
    const requested = join(workspace, 'services', name)
    if (attempted.has(requested)) continue
    attempted.add(requested)
    try {
      const root = canonicalGitRoot(requested, true)
      if (seen.has(root)) continue
      seen.add(root)
      repositories.push({ id: root, label: name, workspace: root })
    } catch (error) {
      repositories.push({ id: requested, label: name, workspace: requested, error: failure('repository', error) })
    }
  }
  return { workspace, repositories, diagnostics }
}

export function collectWorkspaceState(cwd: string, store: Pick<CheckpointStore, 'load'>, options: StateOptions = {}): WorkspaceState {
  const discovery = discoverWorkspaces(cwd)
  const repositories: RepositoryState[] = discovery.repositories.map((repo) => {
    if (repo.error) return { ...repo, error: repo.error }
    try {
      return { ...repo, state: collectState(repo.workspace, store, options), error: undefined }
    } catch (error) {
      return { ...repo, error: failure('collect', error) }
    }
  })
  const totals = { repositories: repositories.length, failed: 0, files: 0, unreviewed: 0 }
  for (const repo of repositories) {
    if (repo.state) {
      totals.files += repo.state.files.length
      totals.unreviewed += repo.state.unreviewed.length
    } else totals.failed++
  }
  return { workspace: discovery.workspace, repositories, diagnostics: discovery.diagnostics, totals, ok: totals.failed === 0 && discovery.diagnostics.length === 0 }
}

/** Save independent checkpoints for ALL discovered repositories. Continues after
 * one failure, but ok=false prevents a false all-approved acknowledgement.
 * Feedback injection belongs to the integration layer, once per ORIGINAL actor.
 */
export function approveWorkspace(cwd: string, store: Pick<CheckpointStore, 'save'>): WorkspaceApproval {
  const discovery = discoverWorkspaces(cwd)
  const repositories: RepositoryApproval[] = discovery.repositories.map((repo) => {
    if (repo.error) return { ...repo, error: repo.error }
    try {
      return { ...repo, checkpoint: approve(repo.workspace, store, ''), error: undefined }
    } catch (error) {
      return { ...repo, error: failure('approve', error) }
    }
  })
  return { workspace: discovery.workspace, repositories, diagnostics: discovery.diagnostics, ok: discovery.diagnostics.length === 0 && repositories.every((repo) => !repo.error) }
}
