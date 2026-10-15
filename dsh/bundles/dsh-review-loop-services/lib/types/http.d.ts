/**
 * Web routes for the review-loop UI panel. The client bundle polls
 * `/plugins/dsh-review-loop/state` and posts approvals to
 * `/plugins/dsh-review-loop/approve` — the same core logic as the /review
 * command, exposed over plain JSON so the browser half needs no Typert RPC.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { type ContextFormed } from '@deepseek-ai/dsh-llm';
import type { CheckpointStore } from './checkpoint.js';
declare module '@deepseek-ai/dsh-llm' {
    interface MessageSourceMap {
        'review-loop-feedback': {
            readonly kind: 'review-loop-feedback';
        } & ContextFormed;
    }
}
export declare function reviewFeedback(comment: string): {
    content: {
        type: "text";
        text: string;
    }[];
    source: {
        kind: "review-loop-feedback";
        form: "notice";
        summary: string;
    };
} & Pick<import("@deepseek-ai/dsh-llm").UserMessage, "id" | "role">;
export declare const STATE_PATH = "/plugins/dsh-review-loop/state";
export declare const APPROVE_PATH = "/plugins/dsh-review-loop/approve";
/** Find live agents whose session workspace matches (approval injection targets). */
export declare function agentsForWorkspace(ctx: Context, workspace: string): Agent[];
export interface WebRoutesDeps {
    readonly store: CheckpointStore;
}
/**
 * Register the state/approve routes. Returns disposers; call inside
 * `ctx.effect` so they die with the plugin fiber. Uses the optional-access
 * path (`ctx.get`) so the plugin also loads without a webServer capability
 * (headless compositions, tests).
 */
export declare function registerWebRoutes(ctx: Context, deps: WebRoutesDeps): () => void;
