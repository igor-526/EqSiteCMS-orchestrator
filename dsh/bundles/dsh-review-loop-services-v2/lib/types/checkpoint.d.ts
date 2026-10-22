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
export interface ReviewCheckpoint {
    /** HEAD sha at review time. */
    readonly head: string;
    /** path → content hash for every file that differed from HEAD. */
    readonly files: Record<string, string>;
    /** ISO timestamp of the review. */
    readonly reviewedAt: string;
}
export interface CheckpointStore {
    load(workspace: string): ReviewCheckpoint | undefined;
    save(workspace: string, checkpoint: ReviewCheckpoint): void;
}
/** Workspace identity for the checkpoint filename — stable across machines per absolute path. */
export declare function checkpointFile(dshHome: string, workspace: string): string;
export declare function checkpointDir(dshHome: string): string;
/** Filesystem-backed store. Zero dependencies; atomic via tmp+rename. */
export declare function fileStore(dshHome: string): CheckpointStore;
