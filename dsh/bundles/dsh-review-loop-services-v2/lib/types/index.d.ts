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
import type { Context } from '@deepseek-ai/cordis';
import { agentsForWorkspace } from './http.js';
export declare const name = "dsh-review-loop";
export declare const inject: string[];
export interface Config {
    /** DSH home directory for checkpoint storage; defaults to $DSH_HOME. */
    dshHome?: string;
    /** Maximum total characters in one /review reply. */
    maxOutputChars?: number;
}
export declare function apply(ctx: Context, config?: Config): void;
export { agentsForWorkspace };
