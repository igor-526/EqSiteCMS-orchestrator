/**
 * dsh-review-loop browser half: a review panel docked above the conversation
 * composer. Polls the host's JSON state route and renders the incremental
 * review queue — file list, colorized diffs, and an approve box that posts
 * the checkpoint (with optional feedback) back through the approve route.
 *
 * Collapsed: one status line. Expanded: full list. The /review command
 * remains available as the keyboard path.
 *
 * Visual language follows the DSH web client: --dsw-alias-* tokens, no
 * emoji, diff rows colored by meaning (added=success, removed=error) with
 * the sign preserved so color never carries meaning alone.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ReactNode } from 'react';
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Review panel copy. */
        'review-loop': ReviewLoopKey;
    }
}
declare const zh: {
    'status.reviewed': string;
    'status.pending': string;
    'status.clean': string;
    'action.expand': string;
    'action.collapse': string;
    'action.approve': string;
    'action.approving': string;
    'file.reviewed': string;
    'file.new': string;
    'file.deleted': string;
    'file.modified': string;
    'comment.placeholder': string;
    'checkpoint.at': string;
    'diff.show': string;
    'diff.hide': string;
    'error.load': string;
    'status.loading': string;
    'status.repositories': string;
    'status.failed': string;
    'status.diagnostics': string;
    'checkpoint.none': string;
    'diff.empty': string;
    'approval.partial': string;
    'approval.success': string;
    'approval.feedback': string;
    'approval.scope': string;
};
type ReviewLoopKey = keyof typeof zh;
/**
 * The review panel docked in the conversation input area.
 * @param props - the input-dock runtime share (session kit) + locale seat.
 */
export declare function ReviewPanel(props: PropsRuntime<'conversation.input.dock'> & PropsLocale<'review-loop'>): ReactNode;
/** Register the panel into the conversation input dock. */
export declare const inject: string[];
export declare function apply(ctx: Context): void;
export {};
