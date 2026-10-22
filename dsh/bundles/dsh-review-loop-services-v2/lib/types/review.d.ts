/**
 * Core review-loop logic, shared by the /review command and the webServer
 * HTTP routes. Pure functions over git + checkpoint store — no cordis
 * dependencies, so the same code powers the CLI command, the UI routes,
 * and the integration tests.
 */
import * as git from './git.js';
import type { ReviewCheckpoint } from './checkpoint.js';
export interface FileEntry {
    /** Path relative to the repo root. */
    readonly path: string;
    /** Porcelain status code (XY pair). */
    readonly status: string;
    /** True when this file is covered by the current checkpoint (hash unchanged). */
    readonly reviewed: boolean;
    /** True for untracked files (no diff vs HEAD possible). */
    readonly newFile: boolean;
    /** True when the file was deleted from the working tree. */
    readonly deleted: boolean;
    /** Unified diff vs HEAD (newFile: content preview). Empty for clean reviewed files. */
    readonly diff: string;
}
export interface ReviewState {
    /** Workspace the state describes. */
    readonly workspace: string;
    /** Current HEAD sha. */
    readonly head: string;
    /** The active checkpoint, when one exists for this workspace. */
    readonly checkpoint: ReviewCheckpoint | undefined;
    /** All working-tree changes (vs HEAD), each annotated with reviewed/diff. */
    readonly files: FileEntry[];
    /** Files in the incremental queue (not covered by the checkpoint). */
    readonly unreviewed: FileEntry[];
}
export interface StateOptions {
    /** Show the complete change set even when a checkpoint exists. */
    readonly all?: boolean;
}
/** Files that differ from HEAD right now, annotated against the checkpoint. */
export declare function collectState(cwd: string, store: {
    load(workspace: string): ReviewCheckpoint | undefined;
}, options?: StateOptions): ReviewState;
/** Build a checkpoint snapshot of the current working tree. */
export declare function snapshot(cwd: string, files: git.ChangedFile[]): Record<string, string>;
/** Record a review: checkpoint + optional comment text. */
export declare function approve(cwd: string, store: {
    save(workspace: string, c: ReviewCheckpoint): void;
}, comment: string): ReviewCheckpoint;
/** Render a ReviewState into human-readable markdown (the /review command reply). */
export declare function renderState(state: ReviewState, maxChars?: number): string;
