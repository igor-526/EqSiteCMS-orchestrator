/** Mocked rendered UI only: no live HTTP, agent injection, build, or repository approval.
 * Run from the workspace: node --test dsh/bundles/dsh-review-loop-services/src/client/review-panel.test.mjs
 * Uses existing read-only root TypeScript and frontend React/DOM/jsdom/test dependencies.
 * Transpilation is in-memory, not a substitute for the parent unit's full type/build gate.
 */
import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const requireFrontend = createRequire(new URL('../../../../../services/frontend/package.json', import.meta.url))
const requireRoot = createRequire(new URL('../../../../../package.json', import.meta.url))
const ts = requireRoot('typescript')
const { JSDOM } = requireFrontend('jsdom')
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://review.test/' })
for (const key of ['window', 'document', 'HTMLElement', 'Node', 'MutationObserver']) globalThis[key] = dom.window[key]
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const React = requireFrontend('react')
const { render, cleanup, screen, within, waitFor, act } = requireFrontend('@testing-library/react')
const userEvent = requireFrontend('@testing-library/user-event').default
const source = readFileSync(new URL('./review-panel.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exports = {}
new Function('require', 'exports', compiled)((name) => {
  assert.ok(['react', 'react/jsx-runtime'].includes(name), `Unexpected runtime dependency: ${name}`)
  return requireFrontend(name)
}, exports)
let dictionary
let registration
exports.apply({
  effect: (callback) => callback(),
  locale: { register: (_namespace, dictionaries) => { dictionary = dictionaries.en } },
  slots: { inject: (_slot, callback) => callback(), register: (options) => { registration = options } },
})
const t = (key) => dictionary[key]
const file = (diff) => ({ path: 'README.md', status: ' M', reviewed: false, newFile: false, deleted: false, diff })
const repository = (label, files = [], checkpoint = null) => ({
  id: `/workspace/${label}`, workspace: `/workspace/${label}`, label,
  state: { workspace: `/workspace/${label}`, head: `${label}abcdef`, checkpoint, files, unreviewed: files.filter((entry) => !entry.reviewed) },
})
const fixture = () => ({
  workspace: '/workspace', ok: false, diagnostics: [],
  repositories: [repository('root', [file('+root diff')], { head: 'root-old', reviewedAt: '2026-01-01T00:00:00Z' }), repository('service-a', [file('+service diff')]), repository('clean'), { id: '/workspace/broken', workspace: '/workspace/broken', label: 'broken', error: { code: 'READ_FAILED', message: 'Cannot read repository' } }],
  totals: { repositories: 4, failed: 1, files: 2, unreviewed: 2 },
})
const response = (body, ok = true, status = 200) => ({ ok, status, json: async () => structuredClone(body) })
let calls
let current
let postResult
let poll
let originalFetch
let originalSetInterval
let originalClearInterval
const mount = () => render(React.createElement(exports.ReviewPanel, { t, session: { sessionId: 'original session' } }))
const open = async (user) => { await user.click(await screen.findByRole('button', { name: 'Open review' })) }

describe('grouped inline review (mocked UI)', () => {
  beforeEach(() => {
    calls = []
    current = fixture()
    postResult = response({ workspace: '/workspace', ok: false, diagnostics: [], repositories: [{ id: '/workspace/root', label: 'root', workspace: '/workspace/root', checkpoint: { head: 'rootabc', reviewedAt: '2026-01-01T00:00:00Z' } }, { id: '/workspace/service-a', label: 'service-a', workspace: '/workspace/service-a', error: { code: 'CHECKPOINT_FAILED', message: 'Checkpoint write failed' } }] })
    originalFetch = globalThis.fetch
    originalSetInterval = globalThis.setInterval
    originalClearInterval = globalThis.clearInterval
    globalThis.setInterval = (callback, milliseconds, ...args) => {
      if (milliseconds !== 2000) return originalSetInterval(callback, milliseconds, ...args)
      poll = callback
      return 123
    }
    globalThis.clearInterval = (id) => { if (id !== 123) originalClearInterval(id) }
    globalThis.fetch = async (url, options) => { calls.push({ url, options }); return options?.method === 'POST' ? postResult : response(current) }
  })
  afterEach(() => { cleanup(); globalThis.fetch = originalFetch; globalThis.setInterval = originalSetInterval; globalThis.clearInterval = originalClearInterval })

  it('preserves the stock dock registration and renders totals, clean/error groups, paths and own checkpoints', async () => {
    assert.deepEqual(registration, { name: 'conversation.input.dock', id: 'review-loop', order: 10, locale: 'review-loop' })
    const user = userEvent.setup()
    mount()
    await screen.findByText('2 file(s) to review')
    screen.getByText('4 repositories')
    screen.getByText('1 repositories failed')
    await open(user)
    assert.equal(screen.getAllByRole('region').length, 4)
    screen.getByRole('heading', { name: 'root' })
    within(screen.getByRole('region', { name: 'root' })).getByText(/HEAD rootabc · checkpoint root-ol/)
    within(screen.getByRole('region', { name: 'service-a' })).getByText(/HEAD service · no checkpoint/)
    within(screen.getByRole('region', { name: 'clean' })).getByText('Working tree clean')
    within(screen.getByRole('region', { name: 'broken' })).getByRole('alert')
    screen.getByText('/workspace/service-a')
    screen.getByText('Approves the current filesystem state of all configured repositories; each saves its own checkpoint.')
    assert.equal(screen.queryByRole('dialog'), null)
    assert.equal(calls[0].url, '/plugins/dsh-review-loop/state?session=original%20session')
  })

  it('keeps duplicate relative paths independent across polls/reordering and collapse, with native keyboard focus', async () => {
    const user = userEvent.setup()
    mount()
    await open(user)
    const rootRow = within(screen.getByRole('region', { name: 'root' })).getByRole('button', { name: /README.md/ })
    const serviceRow = within(screen.getByRole('region', { name: 'service-a' })).getByRole('button', { name: /README.md/ })
    rootRow.focus()
    await user.keyboard('{Enter}')
    assert.equal(rootRow.getAttribute('aria-expanded'), 'true')
    assert.equal(serviceRow.getAttribute('aria-expanded'), 'false')
    assert.equal(document.getElementById(rootRow.getAttribute('aria-controls')).hidden, false)
    assert.notEqual(rootRow.getAttribute('aria-controls'), serviceRow.getAttribute('aria-controls'))
    current.repositories.reverse()
    await act(async () => { poll(); await Promise.resolve() })
    assert.equal(within(screen.getByRole('region', { name: 'root' })).getByRole('button', { name: /README.md/ }), rootRow)
    assert.equal(rootRow.getAttribute('aria-expanded'), 'true')
    await user.click(serviceRow)
    screen.getByText('+root diff')
    screen.getByText('+service diff')
    await user.click(screen.getByRole('button', { name: 'Collapse' }))
    await open(user)
    assert.equal(rootRow.getAttribute('aria-expanded'), 'true')
    rootRow.focus()
    await user.keyboard(' ')
    assert.equal(rootRow.getAttribute('aria-expanded'), 'false')
    assert.equal(document.activeElement, rootRow)
  })

  it('shows partial approval without all-approved claims, keeps failures/comment and refreshes original session', async () => {
    const user = userEvent.setup()
    mount()
    await open(user)
    const input = screen.getByRole('textbox')
    await user.type(input, 'Please retry later')
    await user.click(screen.getByRole('button', { name: 'Approve & checkpoint' }))
    await screen.findByText(/Partial approval: 1 repositories succeeded, 1 failed/)
    screen.getByText('service-a: Checkpoint write failed')
    assert.equal(screen.queryByText(/Approved & checkpointed/), null)
    assert.equal(input.value, 'Please retry later')
    within(screen.getByRole('region', { name: 'broken' })).getByRole('alert')
    await waitFor(() => assert.equal(calls.filter((call) => !call.options?.method).length, 2))
    const post = calls.find((call) => call.options?.method === 'POST')
    assert.equal(post.url, '/plugins/dsh-review-loop/approve?session=original%20session')
    assert.deepEqual(JSON.parse(post.options.body), { comment: 'Please retry later' })
  })

  it('separates checkpoint success from feedback failure and never retries POST automatically', async () => {
    postResult = response({ workspace: '/workspace', ok: true, diagnostics: [], repositories: [{ id: '/workspace/root', label: 'root', workspace: '/workspace/root', checkpoint: { head: 'rootabc', reviewedAt: '2026-01-01T00:00:00Z' } }], injectedAgents: [], feedbackErrors: [{ agentId: 'agent-1', message: 'Delivery unavailable' }] })
    const user = userEvent.setup()
    mount()
    await open(user)
    await user.type(screen.getByRole('textbox'), 'Feedback')
    await user.click(screen.getByRole('button', { name: 'Approve & checkpoint' }))
    await screen.findByText('Approved & checkpointed 1 repositories.')
    screen.getByText('Feedback delivery failed (checkpoints saved): Delivery unavailable')
    assert.equal(screen.getByRole('textbox').value, '')
    await act(async () => { poll(); await Promise.resolve() })
    assert.equal(calls.filter((call) => call.options?.method === 'POST').length, 1)
  })

  it('shows loading then initial request failure', async () => {
    let fail
    globalThis.fetch = () => new Promise((_resolve, reject) => { fail = reject })
    mount()
    screen.getByRole('status')
    screen.getByText('Loading review state…')
    await act(async () => { fail(new Error('offline')) })
    assert.equal(screen.getByRole('alert').textContent, 'Failed to load review state')
  })

  it('keeps the last good groups on polling failure and shows HTTP approval failure', async () => {
    const user = userEvent.setup()
    mount()
    await open(user)
    globalThis.fetch = async (_url, options) => options?.method === 'POST' ? response({ error: 'denied' }, false, 403) : response({}, false, 503)
    await act(async () => { poll(); await Promise.resolve() })
    screen.getByText('Failed to load review state')
    screen.getByRole('region', { name: 'root' })
    await user.click(screen.getByRole('button', { name: 'Approve & checkpoint' }))
    await screen.findByText('approve failed: 403')
  })

  it('allows inspecting an entirely clean workspace, disables approval, and escapes diff text', async () => {
    current = { workspace: '/workspace', repositories: [repository('clean')], diagnostics: [], totals: { repositories: 1, failed: 0, files: 0, unreviewed: 0 }, ok: true }
    const user = userEvent.setup()
    mount()
    await open(user)
    assert.equal(screen.getByRole('button', { name: 'Approve & checkpoint' }).disabled, true)
    current = fixture()
    current.repositories[0].state.files[0].diff = '+<img src=x onerror="alert(1)">'
    await act(async () => { poll(); await Promise.resolve() })
    await user.click(within(screen.getByRole('region', { name: 'root' })).getByRole('button', { name: /README.md/ }))
    screen.getByText('+<img src=x onerror="alert(1)">')
    assert.equal(document.querySelector('img'), null)
  })
})
