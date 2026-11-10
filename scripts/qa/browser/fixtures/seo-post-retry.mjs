// Finite synthetic producer for RT-01..03. No server/process/auth/credential setup.
// Usage: installRetryRoutes(context, loopbackOrigin, { error, pending }); release()
// unblocks the first POST. runnerRetryScenario() uses the existing runSuite API;
// withRetryRunner() adapts its context creation, restoring the capability in finally.
import { loadPlaywright } from '../dependencies.mjs';

export const retryErrors = Object.freeze([400, 403, 502, 503, 'network']);
export const confirmation = page => page.getByRole('dialog', { name: 'Обновить данные?', exact: true });
export const history = page => page.getByRole('dialog', { name: 'Задачи Яндекс.Метрики', exact: true });
export const exactConfirm = page => confirmation(page).getByRole('button', { name: 'Подтвердить', exact: true });
// RT-03 proved that the retained AntD loading image contributes the accessible
// name prefix even AFTER native disabled/class loading are false. Preserve role,
// full label anchoring and strict cardinality; never click a generic primary.
export const retryConfirm = page => confirmation(page).getByRole('button', { name: /^(?:loading )?Подтвердить$/ });
export const errorMessage = error => error === 400 ? 'Счётчик не привязан' : error === 403 ? 'Недостаточно прав' : 'Не удалось поставить задачу';

export async function installRetryRoutes(context, origin, { error = 503, pending = false } = {}) {
  const base = new URL(origin);
  if (base.hostname !== '127.0.0.1' || base.protocol !== 'http:' || base.origin !== origin || base.username || base.password) throw new Error('synthetic_origin_required');
  if (![...retryErrors, 401].includes(error)) throw new Error('invalid_retry_variant');
  const state = { posts: 0, reads: 0, refresh: 0, unknown: 0, invalidPayload: 0, queries: [], requests: [] };
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const key = url.pathname.replace(/^\/api/, '');
    const record = (status, code = 'fixture') => state.requests.push({ method, route: key, status, code });
    const apiPaths = ['/auth/me', '/auth/refresh', '/yandex/metrica/connection', '/seo/metrica/tasks', '/seo/parse-jobs'];
    // The existing build embeds localhost:8001/api. Known loopback API paths
    // are fulfilled IN BROWSER, never continued to that server. Every other
    // external request is denied, including vendor URLs with similar paths.
    const syntheticApi = apiPaths.includes(key) && ['127.0.0.1', 'localhost'].includes(url.hostname) && url.protocol === 'http:';
    if (url.origin !== origin && !syntheticApi) { state.unknown++; record(null, 'unknown_egress'); return route.abort('blockedbyclient'); }
    if (method === 'GET' && !url.pathname.startsWith('/api/') && !apiPaths.includes(key)) {
      // Only the Next document and its build assets may reach loopback.
      if (['/seo', '/login', '/favicon.ico'].includes(url.pathname) || url.pathname.startsWith('/_next/')) return route.continue();
      state.unknown++; record(null, 'unknown_document'); return route.abort('blockedbyclient');
    }
    let status = 200, body;
    if (key === '/auth/me' && method === 'GET') body = { id: '00000000-0000-4000-8000-000000000001', equestrian_id: '00000000-0000-4000-8000-000000000002', username: 'fixture-seo', first_name: 'Тест', last_name: 'SEO', scopes: [{ id: '00000000-0000-4000-8000-000000000003', scope_name: 'SEO' }] };
    else if (key === '/auth/refresh' && method === 'POST') { state.refresh++; status = 401; body = { detail: 'Synthetic refresh denied' }; }
    else if (key === '/yandex/metrica/connection' && method === 'GET') body = { counter: { id: 'connection-1', counter_id: '1234567890', yandex_account: { id: 'account-1', yandex_id: '123', yandex_login: 'fixture-layout', display_name: 'Тестовый аккаунт', email: 'fixture@example.invalid' } } };
    else if (key === '/seo/metrica/tasks' && method === 'GET') {
      state.reads++;
      const limit = Number(url.searchParams.get('limit')), offset = Number(url.searchParams.get('offset'));
      state.queries.push({ limit, offset });
      body = { items: Array.from({ length: limit }, (_, i) => ({ id: `task-${offset + i}`, type: i === 0 ? 'parsing' : i === 1 ? 'delete' : 'merge', status: i === 0 ? 'running' : i === 1 ? 'queued' : i % 3 === 0 ? 'failed' : i % 2 ? 'succeeded' : 'cancelled', is_active: i < 2, created_at: i < 2 ? '2026-01-01T03:04:00Z' : '2026-11-01T03:04:00Z' })), total: 100 };
    } else if (key === '/seo/parse-jobs' && method === 'POST') {
      state.posts++;
      if (request.postData() !== JSON.stringify({ provider: 'ya_metrica' })) { state.invalidPayload++; record(null, 'invalid_payload'); return route.abort('blockedbyclient'); }
      const first = state.posts === 1;
      if (pending && first) await barrier;
      if (first && error === 'network') { record('network', 'injected'); return route.abort('failed'); }
      status = first ? error : 202;
      body = status === 202 ? { provider: 'ya_metrica', status: 'queued' } : { detail: status === 400 ? 'Счётчик не привязан' : 'SYNTHETIC_PRIVATE_BODY_DO_NOT_DISPLAY' };
    } else { state.unknown++; record(null, 'unknown_api'); return route.abort('blockedbyclient'); }
    record(status, status >= 400 ? 'injected' : 'fixture');
    await route.fulfill({ status, json: body });
  });
  return { state, release };
}

// Safe booleans/counts only. Element identity stays inside the browser and is never
// an ElementHandle used for assertions or clicks; role locators always re-resolve.
export async function matcherDiagnostics(page) {
  const dialog = confirmation(page), locator = exactConfirm(page);
  const count = await locator.count();
  const controls = await dialog.locator('.ant-modal-footer button').evaluateAll(elements => elements.map(el => {
    const previous = window.__qaRetryNode;
    const confirm = (el.textContent ?? '').replace(/\s/g, '') === 'Подтвердить';
    if (confirm) window.__qaRetryNode = el;
    return { confirmTextMatch: confirm, nativeDisabled: el.disabled, ariaDisabled: el.getAttribute('aria-disabled'), loading: el.classList.contains('ant-btn-loading'), attached: el.isConnected, remounted: confirm && !!previous && previous !== el };
  }));
  const labelled = dialog.getByRole('button', { name: /Подтвердить/ });
  const loadingPrefixCount = await dialog.getByRole('button', { name: /^loading Подтвердить$/ }).count();
  const labelSubstringCount = await labelled.count();
  const loadingSuffixCount = await dialog.getByRole('button', { name: /^Подтвердить loading$/ }).count();
  return { count, accessibleNameMatch: count === 1, labelSubstringCount, loadingPrefixCount, loadingSuffixCount, visible: count === 1 && await locator.isVisible(), controls };
}

export function runnerRetryScenario(id = 'RT-03-runner', error = 503) {
  const d = 'role=dialog[name="Задачи Яндекс.Метрики"]';
  const c = 'role=dialog[name="Обновить данные?"]';
  return { schemaVersion: 2, scenarios: [{ id, riskId: 'R-MATCH', url: '/seo', prerequisites: ['synthetic routes only'], evidencePolicy: {}, expected: { no_console_errors: false, no_5xx_responses: false }, axeScope: { include: ['[role="dialog"]'] }, steps: [
    { action: 'wait', selector: 'role=button[name="Задачи"s]' },
    { action: 'click', selector: 'role=button[name="Задачи"s]' },
    { action: 'checkCount', selector: `${d} >> tr.ant-table-row`, count: 20 },
    { action: 'click', selector: `${d} >> role=button[name="Обновить данные"s]` },
    { action: 'wait', selector: `${c} >> role=button[name="Подтвердить"s]` },
    { action: 'click', selector: `${c} >> role=button[name="Подтвердить"s]` },
    { action: 'wait', selector: `${c} >> role=alert` },
    { action: 'checkText', selector: `${c} >> role=alert`, text: errorMessage(error) },
    { action: 'click', selector: `${c} >> role=button[name=/^(?:loading )?Подтвердить$/]` },
    { action: 'checkHidden', selector: c },
    { action: 'wait', selector: `${d} >> role=alert` },
    { action: 'checkText', selector: `${d} >> role=alert`, text: 'Задача появится после получения команды' },
  ] }] };
}

// The shared runner has no context hook. Same bounded adapter as its predecessor;
// not a second runtime/smoke runner, no live targets or arbitrary request allowlist.
export async function withRetryRunner(origin, config, work) {
  const chromium = loadPlaywright().chromium, original = chromium.launch;
  const fixtures = [];
  chromium.launch = async function (...args) {
    const browser = await original.apply(this, args), newContext = browser.newContext.bind(browser);
    browser.newContext = async (...options) => {
      const context = await newContext(...options);
      fixtures.push(await installRetryRoutes(context, origin, config));
      return context;
    };
    return browser;
  };
  try { return await work(fixtures); }
  finally { chromium.launch = original; for (const fixture of fixtures) fixture.release(); }
}
