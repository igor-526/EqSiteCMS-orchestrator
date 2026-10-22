import type { CheckpointStore, ReviewCheckpoint } from './checkpoint.js';
import type { ReviewState, StateOptions } from './review.js';
export interface Repository {
    /** Canonical absolute Git root, also used as the checkpoint key. */
    readonly id: string;
    readonly label: string;
    readonly workspace: string;
}
export interface RepositoryError {
    readonly code: 'repository' | 'manifest' | 'collect' | 'approve';
    readonly message: string;
}
export type DiscoveredRepository = Repository & {
    readonly error?: RepositoryError;
};
export interface WorkspaceDiscovery {
    readonly workspace: string;
    readonly repositories: DiscoveredRepository[];
    /** Discovery failures not attributable to a repository (e.g. malformed manifest). */
    readonly diagnostics: RepositoryError[];
}
export type RepositoryState = Repository & ({
    readonly state: ReviewState;
    readonly error?: never;
} | {
    readonly error: RepositoryError;
    readonly state?: never;
});
export interface WorkspaceState {
    readonly workspace: string;
    readonly repositories: RepositoryState[];
    readonly diagnostics: RepositoryError[];
    readonly totals: {
        readonly repositories: number;
        readonly failed: number;
        readonly files: number;
        readonly unreviewed: number;
    };
    /** False means the aggregate is incomplete; never report it as clean. */
    readonly ok: boolean;
}
export type RepositoryApproval = Repository & ({
    readonly checkpoint: ReviewCheckpoint;
    readonly error?: never;
} | {
    readonly error: RepositoryError;
    readonly checkpoint?: never;
});
export interface WorkspaceApproval {
    readonly workspace: string;
    readonly repositories: RepositoryApproval[];
    readonly diagnostics: RepositoryError[];
    /** Per-repo persistence is not transactional; inspect successes on partial failure. */
    readonly ok: boolean;
}
/** Exact format: <name> <git_repo_url>. URLs are never fetched or executed.
 * Blank lines, full-line comments and whitespace-delimited trailing comments
 * are accepted; service names cannot escape services/.
 */
export declare function parseServicesManifest(text: string): string[];
/** Resolve the original session cwd to its Git root, then inspect only the
 * manifest's services/<name> paths. Missing manifest means a normal single repo.
 * Aliases (including symlinks) share one canonical repository/checkpoint.
 */
export declare function discoverWorkspaces(cwd: string): WorkspaceDiscovery;
export declare function collectWorkspaceState(cwd: string, store: Pick<CheckpointStore, 'load'>, options?: StateOptions): WorkspaceState;
/** Save independent checkpoints for ALL discovered repositories. Continues after
 * one failure, but ok=false prevents a false all-approved acknowledgement.
 * Feedback injection belongs to the integration layer, once per ORIGINAL actor.
 */
export declare function approveWorkspace(cwd: string, store: Pick<CheckpointStore, 'save'>): WorkspaceApproval;
