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

import { useEffect, useId, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { ReactNode } from 'react'
// Context merges: slots/locale reach this program through their public client entries.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
// SlotMap merge: conversation.input.dock is declared by ui-conversation's contract.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Review panel copy. */
    'review-loop': ReviewLoopKey
  }
}

const STATE_PATH = '/plugins/dsh-review-loop/state'
const APPROVE_PATH = '/plugins/dsh-review-loop/approve'
const POLL_MS = 2000

const NS = 'review-loop'
const zh = {
  'status.reviewed': '全部已审查',
  'status.pending': '{count} 个文件待审查',
  'status.clean': '工作区干净',
  'action.expand': '展开审查',
  'action.collapse': '收起',
  'action.approve': '批准并记录审查点',
  'action.approving': '提交中…',
  'file.reviewed': '已审查',
  'file.new': '新增',
  'file.deleted': '删除',
  'file.modified': '修改',
  'comment.placeholder': '审查意见（将发给 agent）…',
  'checkpoint.at': '审查点 {head} · {at}',
  'diff.show': '显示 diff',
  'diff.hide': '隐藏 diff',
  'error.load': '审查状态加载失败',
  'status.loading': '审查状态加载中…',
  'status.repositories': '{count} 个仓库',
  'status.failed': '{count} 个仓库失败',
  'status.diagnostics': '{count} 条诊断',
  'checkpoint.none': '无审查点',
  'diff.empty': '无 diff — 自审查点以来文件未变更',
  'approval.partial': '部分批准：{approved} 个仓库成功，{failed} 个仓库失败。失败的仓库未获批准。',
  'approval.success': '已批准并记录 {count} 个仓库的审查点。',
  'approval.feedback': '审查意见发送失败（审查点已保存）',
  'approval.scope': '批准所有已配置仓库的当前文件状态；每个仓库保存自己的审查点。',
} satisfies Record<string, string>
type ReviewLoopKey = keyof typeof zh
const en: Record<ReviewLoopKey, string> = {
  'status.reviewed': 'All reviewed',
  'status.pending': '{count} file(s) to review',
  'status.clean': 'Working tree clean',
  'action.expand': 'Open review',
  'action.collapse': 'Collapse',
  'action.approve': 'Approve & checkpoint',
  'action.approving': 'Submitting…',
  'file.reviewed': 'reviewed',
  'file.new': 'new',
  'file.deleted': 'deleted',
  'file.modified': 'modified',
  'comment.placeholder': 'Review feedback (sent to the agent)…',
  'checkpoint.at': 'checkpoint {head} · {at}',
  'diff.show': 'Show diff',
  'diff.hide': 'Hide diff',
  'error.load': 'Failed to load review state',
  'status.loading': 'Loading review state…',
  'status.repositories': '{count} repositories',
  'status.failed': '{count} repositories failed',
  'status.diagnostics': '{count} diagnostics',
  'checkpoint.none': 'no checkpoint',
  'diff.empty': 'no diff — file unchanged since checkpoint',
  'approval.partial': 'Partial approval: {approved} repositories succeeded, {failed} failed. Failed repositories were not approved.',
  'approval.success': 'Approved & checkpointed {count} repositories.',
  'approval.feedback': 'Feedback delivery failed (checkpoints saved)',
  'approval.scope': 'Approves the current filesystem state of all configured repositories; each saves its own checkpoint.',
}

interface WireFile {
  path: string
  status: string
  reviewed: boolean
  newFile: boolean
  deleted: boolean
  diff: string
}

interface WireState {
  workspace: string
  head: string
  checkpoint?: { head: string; reviewedAt: string } | null
  files: WireFile[]
  unreviewed: WireFile[]
}

type Repository = { id: string; label: string; workspace: string } & (
  { state: WireState; error?: never } | { error: { code: string; message: string }; state?: never }
)
interface WorkspaceState {
  workspace: string
  repositories: Repository[]
  diagnostics: unknown[]
  totals: { repositories: number; failed: number; files: number; unreviewed: number }
  ok: boolean
}
interface WorkspaceApproval {
  injectedAgents?: string[]
  feedbackErrors?: Array<{ agentId: string; message: string }>
  workspace: string
  repositories: Array<{ id: string; label: string; workspace: string; checkpoint?: WireState['checkpoint']; error?: { code: string; message: string } }>
  diagnostics: unknown[]
  ok: boolean
}

/** Poll only the original session; the Host resolves its owner workspace. */
function useReviewState(sessionId: string, refresh: number): { state?: WorkspaceState; failed: boolean } {
  const [frame, setFrame] = useState<{ sessionId: string; state?: WorkspaceState; failed: boolean }>()
  useEffect(() => {
    let alive = true
    let busy = false
    const poll = async (): Promise<void> => {
      if (busy) return
      busy = true
      try {
        const res = await fetch(`${STATE_PATH}?session=${encodeURIComponent(sessionId)}`, { headers: { accept: 'application/json' } })
        if (!res.ok) throw new Error(`state failed: ${res.status}`)
        const state = (await res.json()) as WorkspaceState
        if (alive) setFrame({ sessionId, state, failed: false })
      } catch {
        if (alive) setFrame((previous) => ({ sessionId, state: previous?.sessionId === sessionId ? previous.state : undefined, failed: true }))
      } finally {
        busy = false
      }
    }
    void poll()
    const timer = setInterval(() => { void poll() }, POLL_MS)
    return () => { alive = false; clearInterval(timer) }
  }, [sessionId, refresh])
  return frame?.sessionId === sessionId ? frame : { failed: false }
}

const buttonStyle = {
  padding: '4px 8px', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2)',
  background: 'var(--dsw-alias-markdown-code-block)', color: 'var(--dsw-alias-label-primary)',
  font: 'inherit', fontSize: 12, cursor: 'pointer',
} as const

/** One line of a unified diff, colored by role. The sign stays visible so color never carries meaning alone. */
function DiffLine({ line }: { line: string }): ReactNode {
  if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff --git') || line.startsWith('index ')) {
    return <div style={{ color: 'var(--dsw-alias-label-tertiary)' }}>{line}</div>
  }
  if (line.startsWith('@@')) {
    return <div style={{ color: 'var(--dsw-alias-label-secondary)' }}>{line}</div>
  }
  if (line.startsWith('+')) {
    return <div style={{ color: 'var(--dsw-alias-state-success-primary)' }}>{line}</div>
  }
  if (line.startsWith('-')) {
    return <div style={{ color: 'var(--dsw-alias-state-error-primary)' }}>{line}</div>
  }
  return <div style={{ color: 'var(--dsw-alias-label-primary)' }}>{line}</div>
}

/** A file's diff body: colorized unified-diff lines, never soft-wrapped. */
function DiffBody({ diff }: { diff: string }): ReactNode {
  const lines = diff.split('\n')
  return (
    <div style={{ padding: 8, background: 'var(--dsw-alias-markdown-code-block)', borderRadius: 6, overflowX: 'auto', font: 'var(--dsw-font-markdown-code-block)', fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre' }}>
      {lines.map((line, i) => <DiffLine key={i} line={line} />)}
    </div>
  )
}

/** One file row: status chip + toggleable colorized diff. */
function FileRow({ file, t }: { file: WireFile; t: (key: ReviewLoopKey, params?: Record<string, unknown>) => string }): ReactNode {
  const [open, setOpen] = useState(false)
  const diffId = useId()
  const chip = file.reviewed ? t('file.reviewed') : file.newFile ? t('file.new') : file.deleted ? t('file.deleted') : t('file.modified')
  const color = file.reviewed
    ? 'var(--dsw-alias-state-success-primary)'
    : 'var(--dsw-alias-state-warn-primary)'
  return (
    <div style={{ borderBottom: '1px solid var(--dsw-alias-border-l2)', padding: '4px 0' }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={diffId}
        onClick={() => setOpen((v) => !v)}
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textAlign: 'left', width: '100%', font: 'inherit', display: 'flex', gap: 8, alignItems: 'center' }}
      >
        <span style={{ color, fontSize: 11, whiteSpace: 'nowrap' }}>{chip}</span>
        <code style={{ flex: 1, font: 'var(--dsw-font-markdown-code-block)', fontSize: 12 }}>{file.path}</code>
        <span style={{ fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' }}>{open ? t('diff.hide') : t('diff.show')}</span>
      </button>
      <div id={diffId} hidden={!open}>
        {open && (file.diff ? <DiffBody diff={file.diff} /> : (
          <div style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' }}>{t('diff.empty')}</div>
        ))}
      </div>
    </div>
  )
}

/**
 * The review panel docked in the conversation input area.
 * @param props - the input-dock runtime share (session kit) + locale seat.
 */
export function ReviewPanel(
  props: PropsRuntime<'conversation.input.dock'> & PropsLocale<'review-loop'>,
): ReactNode {
  return <SessionReviewPanel key={props.session.sessionId} {...props} />
}

function SessionReviewPanel(props: PropsRuntime<'conversation.input.dock'> & PropsLocale<'review-loop'>): ReactNode {
  const { t, session } = props
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [approval, setApproval] = useState<WorkspaceApproval>()
  const [bump, setBump] = useState(0)
  const { state, failed } = useReviewState(session.sessionId, bump)
  const panelId = useId()

  if (state === undefined) return <div role={failed ? 'alert' : 'status'}>{t(failed ? 'error.load' : 'status.loading')}</div>
  const pending = state.totals.unreviewed

  const approve = async (): Promise<void> => {
    setSubmitting(true)
    setError('')
    setApproval(undefined)
    try {
      const res = await fetch(`${APPROVE_PATH}?session=${encodeURIComponent(session.sessionId)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ comment: comment.trim() }),
      })
      const result = (await res.json()) as WorkspaceApproval
      if (!Array.isArray(result.repositories)) throw new Error(`approve failed: ${res.status}`)
      if (!res.ok && result.ok) throw new Error(`approve failed: ${res.status}`)
      setApproval(result)
      if (result.ok) setComment('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBump((value) => value + 1)
      setSubmitting(false)
    }
  }

  const approvalFailures = approval?.repositories.filter((repository) => repository.error) ?? []
  const approvalCount = approval?.repositories.filter((repository) => !repository.error).length ?? 0
  const statusText = pending === 0 && state.totals.files === 0
    ? t('status.clean')
    : pending === 0
      ? t('status.reviewed')
      : t('status.pending').replace('{count}', String(pending))

  return (
    <div style={{ maxWidth: 'var(--dsh-composer-card-max-width, 780px)', margin: '0 auto', padding: '0 var(--dsh-composer-dock-inset, 8px)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: pending > 0 ? 'var(--dsw-alias-state-warn-primary)' : 'var(--dsw-alias-state-success-primary)',
          }}
        />
        <span style={{ color: 'var(--dsw-alias-label-primary)' }}>{statusText}</span>
        <span style={{ color: 'var(--dsw-alias-label-tertiary)', fontSize: 11 }}>
          {t('status.repositories').replace('{count}', String(state.totals.repositories))}
        </span>
        {state.totals.failed > 0 && <span role="status" style={{ color: 'var(--dsw-alias-state-error-primary)' }}>{t('status.failed').replace('{count}', String(state.totals.failed))}</span>}
        <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)} style={{ ...buttonStyle, marginLeft: 'auto' }}>
          {open ? t('action.collapse') : t('action.expand')}
        </button>
      </div>

      {failed && <div role="alert">{t('error.load')}</div>}
      <div id={panelId} hidden={!open} style={{ marginTop: 6, border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, padding: 8, maxHeight: '40vh', overflowY: 'auto' }}>
          {state.diagnostics.length > 0 && <div role="status">{t('status.diagnostics').replace('{count}', String(state.diagnostics.length))}</div>}
          {state.repositories.map((repository) => (
            <section key={repository.id} aria-label={repository.label} style={{ marginBottom: 8 }}>
              <h3 style={{ margin: '4px 0', fontSize: 13, color: 'var(--dsw-alias-label-primary)' }}>{repository.label}</h3>
              <div style={{ fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', overflowWrap: 'anywhere' }}>{repository.workspace}</div>
              {repository.error ? <div role="alert">{repository.error.code}: {repository.error.message}</div> : <>
                <div style={{ fontSize: 11, color: 'var(--dsw-alias-label-secondary)' }}>
                  HEAD {repository.state.head.slice(0, 7)} · {repository.state.checkpoint
                    ? t('checkpoint.at').replace('{head}', repository.state.checkpoint.head.slice(0, 7)).replace('{at}', new Date(repository.state.checkpoint.reviewedAt).toLocaleString())
                    : t('checkpoint.none')}
                </div>
                {repository.state.files.length === 0 && <div style={{ fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' }}>{t('status.clean')}</div>}
                {repository.state.files.map((file) => <FileRow key={JSON.stringify([repository.id, file.path])} file={file} t={t} />)}
              </>}
            </section>
          ))}
          <div style={{ fontSize: 11, color: 'var(--dsw-alias-label-secondary)' }}>{t('approval.scope')}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              aria-label={t('comment.placeholder')}
              placeholder={t('comment.placeholder')}
              disabled={submitting}
              style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', color: 'inherit', fontSize: 12 }}
            />
            <button type="button" style={buttonStyle} onClick={() => { void approve() }} disabled={submitting || pending === 0}>
              {submitting ? t('action.approving') : t('action.approve')}
            </button>
          </div>
          {approval && <div role="status" style={{ marginTop: 4, fontSize: 12 }}>
            {approval.ok
              ? t('approval.success').replace('{count}', String(approvalCount))
              : t('approval.partial').replace('{approved}', String(approvalCount)).replace('{failed}', String(approvalFailures.length))}
            {approvalFailures.map((repository) => <div key={repository.id}>{repository.label}: {repository.error?.message}</div>)}
          </div>}
          {approval?.feedbackErrors?.map((feedback) => <div role="alert" key={feedback.agentId}>{t('approval.feedback')}: {feedback.message}</div>)}
          {error !== '' && <div role="alert" style={{ fontSize: 11, color: 'var(--dsw-alias-state-error-primary)', marginTop: 4 }}>{error}</div>}
        </div>
    </div>
  )
}

/** Register the panel into the conversation input dock. */
export const inject = ['slots', 'locale']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'review-loop: dictionaries')
  ctx.slots.inject('conversation.input.dock', () =>
    ctx.slots.register({
      name: 'conversation.input.dock',
      id: 'review-loop',
      order: 10,
      locale: NS,
    }, ReviewPanel))
}
