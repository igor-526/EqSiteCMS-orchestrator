/**
 * Thin git helpers for dsh-review-loop. Pure spawnSync, no external deps.
 * All operations are read-only except `hashObject` (git hash-object is
 * content-addressed and writes nothing without `-w`).
 */
export interface ChangedFile {
    /** Path relative to the repo root, as reported by git. */
    readonly path: string;
    /** Porcelain status code (XY pair, e.g. ' M', '??'). */
    readonly status: string;
}
export declare class GitError extends Error {
    readonly args: readonly string[];
    readonly stderr: string;
    constructor(args: readonly string[], stderr: string);
}
/** Parse `git status --porcelain` into changed files (supports both v1 and v2 output shapes). */
export declare function status(cwd: string): ChangedFile[];
/** The current HEAD sha, or empty string in a repo without commits. */
export declare function head(cwd: string): string;
/** Untracked files are invisible to `git diff HEAD`; this lists them. */
export declare function isUntracked(f: ChangedFile): boolean;
/** Deleted files carry no content; diff shows the removal via `git diff HEAD`. */
export declare function isDeleted(f: ChangedFile): boolean;
/** Content hash of one path (tracked or untracked, no -w so nothing is written). */
export declare function fileHash(cwd: string, path: string): string;
/** Unified diff of one file against HEAD (covers staged + unstaged). */
export declare function diffHead(cwd: string, path: string, maxLines?: number): string;
/** Preview of an untracked file (git cannot diff it against HEAD). */
export declare function untrackedPreview(cwd: string, path: string, maxLines?: number): string;
