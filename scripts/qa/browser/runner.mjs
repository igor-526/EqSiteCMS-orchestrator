import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadPlaywright, axePath } from './dependencies.mjs';
import { CheckError, fail, safeUrl, selectScenarios } from './schema.mjs';
import { runStep, unique } from './assertions.mjs';

export const CMS_VIEWPORT = Object.freeze({ width: 1366, height: 768 });
const viewportFor = (name, devices) => name === 'desktop' ? { viewport: CMS_VIEWPORT } : devices[name === 'tablet' ? 'iPad Pro 11' : 'Pixel 5'];

export async function runSuite(definition, options = {}) {
  const {
    baseUrl = 'http://localhost:3001', outputDir, storageState, mode = 'qg', service = 'frontend',
    viewports = ['desktop'], timeoutMs = 120000,
    // Internal capability supplied ONLY by the managed synthetic server caller.
    // No CLI switch or JSON field can turn on live traces.
    fixtureOrigin,
  } = options;
  const selected = selectScenarios(definition, options);
  if (!outputDir) fail('output_required');
  const base = new URL(baseUrl);
  if (!/^https?:$/.test(base.protocol) || base.username || base.password) fail('invalid_base_url');
  for (const s of selected) for (const route of [s.url, ...s.steps.filter(x => x.action === 'goto').map(x => x.url ?? '/')]) {
    const u = new URL(route, baseUrl);
    if (!/^https?:$/.test(u.protocol) || u.username || u.password) fail('invalid_target_url');
  }
  const synthetic = !storageState && fixtureOrigin === base.origin && base.hostname === '127.0.0.1';
  const { chromium, devices } = loadPlaywright();
  const axeSource = await readFile(axePath(), 'utf8');
  await mkdir(outputDir, { recursive: true });
  const started = Date.now();
  const browser = await chromium.launch({ headless: true, timeout: 30000 });
  const results = [];
  try {
    for (const scenario of selected) for (const viewport of viewports) {
      results.push(await runScenario(browser, scenario, viewport, { baseUrl, outputDir, storageState, synthetic, axeSource, devices, timeoutMs }));
    }
  } finally { await browser.close(); }
  const report = {
    schemaVersion: 2,
    name: 'UI QA report',
    startedAt: new Date(started).toISOString(), finishedAt: new Date().toISOString(), durationMs: Date.now() - started,
    environment: { frontendUrl: safeUrl(baseUrl), backendUrl: safeUrl(options.backendUrl), service },
    inputs: { scenariosPath: null, authStatePath: null, viewports, mode },
    summary: { total: results.length, passed: results.filter(r => r.status === 'passed').length, failed: results.filter(r => r.status === 'failed').length },
    results,
  };
  await writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

async function runScenario(browser, scenario, viewport, options) {
  const { baseUrl, outputDir, storageState, synthetic, axeSource, devices } = options;
  const started = Date.now();
  const budget = Math.min(scenario.timeout ?? options.timeoutMs, options.timeoutMs);
  const runDir = path.join(outputDir, `${scenario.id}-${viewport}`);
  await mkdir(runDir, { recursive: true });
  const descriptor = { ...viewportFor(viewport, devices) };
  delete descriptor.defaultBrowserType;
  const context = await browser.newContext({ ...descriptor, storageState, baseURL: baseUrl });
  const page = await context.newPage();
  page.setDefaultTimeout(Math.min(7500, budget));
  page.setDefaultNavigationTimeout(Math.min(20000, budget));
  const result = {
    scenarioId: scenario.id, scenarioName: scenario.id, riskId: scenario.riskId ?? null, viewport,
    startedAt: new Date(started).toISOString(), finishedAt: null, durationMs: null,
    status: 'passed', reasons: [], finalUrl: null, consoleErrors: [], pageErrors: [], requestFailures: [], http5xx: [], axeViolations: [],
    steps: [], evidence: { screenshots: [], trace: null, status: 'evidence-redacted' },
  };
  // Retain compatibility keys, never raw console/error/URL/header/payload strings.
  page.on('console', msg => { if (msg.type() === 'error') result.consoleErrors.push({ code: 'console_error' }); });
  page.on('pageerror', () => result.pageErrors.push({ code: 'page_error' }));
  page.on('requestfailed', () => result.requestFailures.push({ code: 'request_failed' }));
  page.on('response', response => { if (response.status() >= 500) result.http5xx.push({ status: response.status() }); });
  let tracing = false, timer, currentStep = null, shotNumber = 0;
  const screenshot = async () => {
    const policy = scenario.evidencePolicy?.screenshot;
    if (!synthetic && !policy) return;
    const loc = policy ? await unique(page, policy.selector) : page.locator('body');
    const masks = [];
    for (const selector of policy?.mask ?? []) masks.push(await unique(page, selector));
    const file = `${++shotNumber}.png`;
    // Only the explicitly reviewed fragment, with masks applied BEFORE encoding/writing.
    await loc.screenshot({ path: path.join(runDir, file), mask: masks, animations: 'disabled', timeout: Math.min(7500, budget) });
    result.evidence.screenshots.push(`${scenario.id}-${viewport}/${file}`);
    result.evidence.status = 'recorded';
  };
  const execute = async () => {
    if (synthetic) {
      await context.route('**/*', route => new URL(route.request().url()).origin === new URL(baseUrl).origin ? route.continue() : route.abort());
      await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
      tracing = true;
    }
    await page.goto(new URL(scenario.url, baseUrl).href, { waitUntil: 'domcontentloaded' });
    for (const [i, step] of scenario.steps.entries()) {
      currentStep = step.id ?? `step-${i + 1}`;
      const outcome = await runStep(page, step, { baseUrl, timeout: Math.min(7500, budget), screenshot });
      result.steps.push({ stepId: currentStep, action: step.action, status: 'passed', ...outcome });
    }
    currentStep = 'axe';
    const scope = scenario.axeScope ?? { include: ['body'] };
    for (const selector of scope.include) if (!(await page.locator(selector).count())) fail('axe_scope_missing');
    await page.addScriptTag({ content: axeSource });
    const axe = await page.evaluate(async scope => {
      const scan = await window.axe.run({ include: scope.include, exclude: (scope.exclude ?? []).map(e => e.selector) });
      return {
        tested: scan.passes.length + scan.violations.length + scan.incomplete.length,
        violations: scan.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
      };
    }, scope);
    if (!axe.tested) fail('axe_empty');
    result.axeViolations = axe.violations;
    if (axe.violations.some(v => ['critical', 'serious'].includes(v.impact))) result.reasons.push('axe_critical_serious');
    const expected = scenario.expected ?? scenario.expectations ?? {};
    if (result.consoleErrors.length && expected.no_console_errors !== false) result.reasons.push('console_errors');
    if (result.pageErrors.length) result.reasons.push('page_errors');
    if (result.requestFailures.length) result.reasons.push('request_failures');
    if (result.http5xx.length && expected.no_5xx_responses !== false) result.reasons.push('http_5xx');
    currentStep = 'evidence';
    await screenshot();
  };
  const work = execute();
  try {
    await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => reject(new CheckError('scenario_timeout')), budget); })]);
  } catch (error) {
    const code = error instanceof CheckError ? error.code : 'browser_operation_failed';
    result.reasons.push(code);
    result.steps.push({ stepId: currentStep, status: 'failed', code });
  } finally {
    clearTimeout(timer);
    result.finalUrl = safeUrl(page.url());
    if (tracing) {
      await context.tracing.stop({ path: path.join(runDir, 'trace.zip') }).then(() => {
        result.evidence.trace = `${scenario.id}-${viewport}/trace.zip`;
        result.evidence.status = 'recorded';
      }).catch(() => result.reasons.push('trace_unavailable'));
    }
    await context.close();
    await work.catch(() => {});
    if (result.reasons.length) result.status = 'failed';
    result.finishedAt = new Date().toISOString();
    result.durationMs = Date.now() - started;
  }
  return result;
}
