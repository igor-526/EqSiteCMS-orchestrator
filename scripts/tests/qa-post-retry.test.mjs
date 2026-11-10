// Run from repo root: node --test scripts/tests/qa-post-retry.test.mjs
// Existing production build + local synthetic routes only; no build/install/live API.
// RT-03 is a diagnostic outcome, never an unconditional product-fix PASS.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import net from 'node:net';
import path from 'node:path';
import { CMS_VIEWPORT, runSuite } from '../qa/browser/runner.mjs';
import { startFixtureServer } from '../qa/browser/fixtures/server.mjs';
import { loadPlaywright } from '../qa/browser/dependencies.mjs';
import { retryErrors, confirmation, history, exactConfirm, retryConfirm, errorMessage, installRetryRoutes, matcherDiagnostics, withRetryRunner, runnerRetryScenario } from '../qa/browser/fixtures/seo-post-retry.mjs';

const require = createRequire(new URL('../../services/frontend/package.json', import.meta.url));
const { chromium, expect } = require('playwright/test');
const out = path.resolve('.qa/restore-seo-qa-readiness/QA-RETRY-1');
const runId = `retry-${Date.now()}-${process.pid}`;
const runDir = path.join(out, runId);
const json = async (file, data) => writeFile(file, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const fingerprint = async files => {
  const hash = createHash('sha256');
  for (const file of files) hash.update(await readFile(file));
  return hash.digest('hex');
};

// Only the owned Next child is stopped. No Docker/process discovery/setup/cleanup.
async function startBuild() {
  await readFile('services/frontend/.next/BUILD_ID');
  const socket = net.createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: path.resolve('services/frontend'), stdio: 'ignore' });
  let exited = false;
  const stopped = new Promise(resolve => child.once('exit', () => { exited = true; resolve(); }));
  const close = async () => { if (!exited) { child.kill('SIGTERM'); await stopped; } };
  const until = Date.now() + 30000;
  try {
    while (Date.now() < until) {
      if (exited) throw new Error('synthetic_build_exited');
      try { if ((await fetch(origin + '/seo', { signal: AbortSignal.timeout(2000), redirect: 'error' })).ok) return { origin, close }; } catch {}
      await sleep(100);
    }
    throw new Error('synthetic_build_not_ready');
  } catch (error) { await close(); throw error; }
}

async function open(page) {
  await page.goto('/seo');
  await page.getByRole('button', { name: 'Задачи', exact: true }).click();
  await expect(history(page).locator('tr.ant-table-row')).toHaveCount(20);
  await history(page).getByRole('button', { name: 'Обновить данные', exact: true }).click();
}

// Exact assertion from supplemental.mjs:72, with its original default 5000ms.
async function exactAssertion(page) { await expect(exactConfirm(page)).toBeEnabled(); }

// Exact before proves loading-prefix naming, not a disabled product defect.
async function retryControl(page) {
  const control = retryConfirm(page);
  await expect(control).toHaveCount(1);
  await expect(control).not.toHaveClass(/ant-btn-loading/);
  await expect(control).toBeEnabled();
  return control;
}

const producerFiles = ['scripts/qa/browser/fixtures/seo-post-retry.mjs', 'scripts/tests/qa-post-retry.test.mjs', 'scripts/qa/browser/runner.mjs', 'scripts/qa/browser/dependencies.mjs'];

test('RT-01..03 finite synthetic POST retry', { timeout: 890000 }, async t => {
  await mkdir(runDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const codeFingerprint = await fingerprint(producerFiles);
  const provenance = {
    playwrightModule: 'services/frontend/node_modules/playwright/test',
    playwrightVersion: require('playwright/package.json').version,
    expectModule: path.relative(process.cwd(), require.resolve('playwright/test')),
    expectPackageVersion: require('playwright/package.json').version,
    antDesignVersion: require('antd/package.json').version,
    nodeVersion: process.version,
    lockFingerprint: await fingerprint(['services/frontend/package-lock.json']),
    sourceFingerprint: await fingerprint(['services/frontend/src/features/seo/ui/ConfirmActionModal.tsx', 'services/frontend/src/features/seo/ui/MetricaTasksModal.tsx', 'services/frontend/src/features/seo/hooks/useMetricaTasksDialog.ts']),
    runnerVersion: require('playwright/package.json').version,
    sameChromium: chromium === loadPlaywright().chromium,
    buildFingerprint: await fingerprint(['services/frontend/.next/BUILD_ID']),
    viewport: CMS_VIEWPORT,
    realAcceptance: false,
  };
  await json(path.join(runDir, 'provenance.json'), provenance);
  assert.equal(provenance.sameChromium, true);
  const outcomes = [];
  const previousRunId = process.env.QA_RETRY_PREVIOUS_RUN_ID ?? null;
  if (previousRunId !== null && !/^retry-\d+-\d+$/.test(previousRunId)) throw new Error('invalid_previous_run_id');
  let app, browser;
  const ledger = async () => json(path.join(runDir, 'ledger.json'), {
    runId, stage: 'unit', unit: 'QA-RETRY-1', scenarioId: ['RT-01', 'RT-02', 'RT-03'], evidenceOwner: 'Frontend',
    command: 'node --test scripts/tests/qa-post-retry.test.mjs', aliases: [], revision, codeFingerprint,
    environmentFingerprint: provenance, options: { caseBudgetMs: 120000, suiteBudgetMs: 890000, syntheticOnly: true },
    startedAt, finishedAt: new Date().toISOString(), status: outcomes.length === 9 && outcomes.every(o => o.status === 'passed') ? 'passed' : 'failed',
    evidencePath: path.relative(process.cwd(), runDir), reason: previousRunId ? 'bounded-harness-fix-after-exact-before' : null, previousRunId, outcomes,
  });
  try {
    app = await startBuild();
    browser = await chromium.launch({ headless: true });
    for (const error of retryErrors) await t.test(`RT-01 explicit retry ${error}`, { timeout: 120000 }, async () => {
      const context = await browser.newContext({ viewport: CMS_VIEWPORT, baseURL: app.origin });
      const fixture = await installRetryRoutes(context, app.origin, { error });
      const page = await context.newPage(); page.setDefaultTimeout(6000);
      const pageErrors = [];
      page.on('pageerror', () => pageErrors.push('page_error'));
      try {
        await open(page);
        await matcherDiagnostics(page); // mark initial node for remount diagnostics
        await exactConfirm(page).click();
        await expect(confirmation(page).getByRole('alert')).toContainText(errorMessage(error));
        const before = await matcherDiagnostics(page);
        let exactPassed = true;
        try { await exactAssertion(page); } catch { exactPassed = false; }
        const record = { findingId: 'MANUAL-TOOL-02', scenarioId: 'RT-03', revision, environmentFingerprint: provenance,
          input: { actor: 'synthetic-seo', postError: error, listTotal: 100, limit: 20, offset: 0 },
          keys: [], route: '/seo', domLocator: 'dialog(Обновить данные?)/button(name=Подтвердить,exact=true)',
          expected: { enabled: true }, actual: { exactPassed, ...before }, status: exactPassed ? 'unreproduced' : 'failed', timestamp: new Date().toISOString() };
        await json(path.join(runDir, `exact-before-${error}.json`), record);
        if (error === 503) await json(path.join(runDir, 'reproducer-before.json'), record);
        if (!exactPassed) {
          const settled = await matcherDiagnostics(page);
          assert.equal(settled.count, 0);
          assert.equal(settled.loadingPrefixCount, 1);
          assert.ok(settled.controls.some(c => c.confirmTextMatch && !c.nativeDisabled && c.ariaDisabled !== 'true' && !c.loading));
        }
        const control = await retryControl(page);
        const after = { ...record, matcher: 'role=button; name=/^(?:loading )?Подтвердить$/; strict cardinality=1', actual: { exactPassed, ...(await matcherDiagnostics(page)), semanticCount: await control.count(), semanticEnabled: await control.isEnabled() },
          status: exactPassed ? 'unreproduced' : 'passed', timestamp: new Date().toISOString(),
          reason: exactPassed ? 'Original contradiction not reproduced; closure blocked' : 'Anchored semantic matcher accounts for retained loading image; strict enabled assertion preserved' };
        await json(path.join(runDir, `exact-after-${error}.json`), after);
        if (error === 503) await json(path.join(runDir, 'reproducer-after.json'), after);
        const counterSnapshots = { beforeRetry: { posts: fixture.state.posts, reads: fixture.state.reads, queries: [...fixture.state.queries] } };
        await expect(confirmation(page)).not.toContainText('SYNTHETIC_PRIVATE');
        await expect(history(page)).toBeVisible();
        // Finite observation window, not a readiness sleep or timeout repair.
        await sleep(350);
        assert.equal(fixture.state.posts, 1); assert.equal(fixture.state.reads, 1);
        assert.deepEqual(fixture.state.queries, [{ limit: 20, offset: 0 }]);
        await control.click();
        await expect(confirmation(page)).toHaveCount(0);
        await expect(history(page).getByRole('alert')).toContainText('Задача появится после получения команды');
        await expect.poll(() => fixture.state.posts).toBe(2);
        // Existing onAccepted performs exactly one reloadFromStart. This is not
        // polling or optimistic completion; the fixture returns unchanged history.
        await expect.poll(() => fixture.state.reads).toBe(2);
        counterSnapshots.afterAccepted = { posts: fixture.state.posts, reads: fixture.state.reads, queries: [...fixture.state.queries] };
        await expect(history(page).locator('tr.ant-table-row')).toHaveCount(20);
        await sleep(350);
        assert.equal(fixture.state.reads, 2); assert.equal(fixture.state.posts, 2);
        await history(page).getByRole('button', { name: 'Обновить список', exact: true }).click();
        await expect.poll(() => fixture.state.reads).toBe(3);
        assert.deepEqual(fixture.state.queries, Array.from({ length: 3 }, () => ({ limit: 20, offset: 0 })));
        counterSnapshots.afterExplicitGet = { posts: fixture.state.posts, reads: fixture.state.reads, queries: [...fixture.state.queries] };
        // Remount a fresh confirmation, then target by role again, never handle.
        await history(page).getByRole('button', { name: 'Обновить данные', exact: true }).click();
        const afterRemount = await matcherDiagnostics(page);
        assert.ok(afterRemount.controls.some(c => c.confirmTextMatch && c.remounted));
        await exactAssertion(page);
        assert.equal(fixture.state.unknown, 0); assert.equal(fixture.state.invalidPayload, 0); assert.deepEqual(pageErrors, []);
        await json(path.join(runDir, `case-${error}.json`), { scenarioId: 'RT-01', error, status: 'passed', before, afterRemount, counterSnapshots, counters: fixture.state });
        outcomes.push({ scenarioId: 'RT-01', variant: error, status: 'passed' });
      } finally {
        await json(path.join(runDir, `requests-${error}.json`), fixture.state);
        fixture.release(); await context.close();
      }
    });
    await t.test('RT-02 401 is auth flow, not retry success', { timeout: 120000 }, async () => {
      const context = await browser.newContext({ viewport: CMS_VIEWPORT, baseURL: app.origin });
      const fixture = await installRetryRoutes(context, app.origin, { error: 401 });
      try {
        const page = await context.newPage(); page.setDefaultTimeout(6000); await open(page); await exactConfirm(page).click();
        await expect(page).toHaveURL(/\/login$/);
        await expect(confirmation(page)).toHaveCount(0);
        await sleep(350);
        assert.equal(fixture.state.posts, 1); assert.equal(fixture.state.reads, 1); assert.equal(fixture.state.refresh, 1); assert.equal(fixture.state.unknown, 0);
        await json(path.join(runDir, 'auth.json'), { status: 'passed', retry: 'not-applicable-auth-redirect', counters: fixture.state });
        outcomes.push({ scenarioId: 'RT-02', variant: '401', status: 'passed' });
      } finally { fixture.release(); await context.close(); }
    });
    await t.test('RT-02 pending native double submit and disabled negative', { timeout: 120000 }, async () => {
      const context = await browser.newContext({ viewport: CMS_VIEWPORT, baseURL: app.origin });
      const fixture = await installRetryRoutes(context, app.origin, { error: 503, pending: true });
      try {
        const page = await context.newPage(); page.setDefaultTimeout(6000); await open(page);
        const button = exactConfirm(page);
        await button.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
        await expect.poll(() => fixture.state.posts).toBe(1);
        // Exact-name may include loading icon; use only a proven semantic name.
        const pendingButton = confirmation(page).getByRole('button', { name: /Подтвердить/ });
        await expect(pendingButton).toBeDisabled();
        await assert.rejects(() => expect(pendingButton).toBeEnabled({ timeout: 250 }));
        await assert.rejects(() => expect(retryConfirm(page)).toBeEnabled({ timeout: 250 }));
        const pending = await matcherDiagnostics(page);
        await page.keyboard.press('Escape');
        await expect(confirmation(page)).toBeVisible(); await expect(history(page)).toBeVisible();
        await sleep(350); assert.equal(fixture.state.posts, 1); assert.equal(fixture.state.reads, 1);
        fixture.release();
        await expect(confirmation(page).getByRole('alert')).toContainText(errorMessage(503));
        await retryControl(page);
        assert.equal(fixture.state.unknown, 0);
        await json(path.join(runDir, 'pending.json'), { pending, counters: fixture.state, status: 'passed' });
        outcomes.push({ scenarioId: 'RT-02', variant: 'pending-double-submit', status: 'passed' });
      } finally { fixture.release(); await context.close(); }
    });
    await t.test('RT-03 true disabled and ambiguous exact names must reject', { timeout: 120000 }, async () => {
      const fixture = await startFixtureServer();
      const context = await browser.newContext({ viewport: CMS_VIEWPORT });
      try {
        const page = await context.newPage();
        await context.route('**/*', route => new URL(route.request().url()).origin === fixture.baseUrl ? route.continue() : route.abort());
        await page.goto(fixture.baseUrl);
        // Isolated negative controls only; never mutate the product DOM to fix it.
        await page.setContent('<div role="dialog" aria-label="Обновить данные?"><button disabled>Подтвердить</button></div>');
        await assert.rejects(() => expect(exactConfirm(page)).toBeEnabled({ timeout: 250 }));
        await assert.rejects(() => expect(retryConfirm(page)).toBeEnabled({ timeout: 250 }));
        await page.setContent('<div role="dialog" aria-label="Обновить данные?"><button>Подтвердить</button><button>Подтвердить</button></div>');
        assert.equal(await exactConfirm(page).count(), 2);
        await assert.rejects(() => expect(exactConfirm(page)).toBeEnabled({ timeout: 250 }));
        await assert.rejects(() => expect(retryConfirm(page)).toBeEnabled({ timeout: 250 }));
        outcomes.push({ scenarioId: 'RT-03', variant: 'negative-controls', status: 'passed' });
      } finally { await context.close(); await fixture.close(); }
    });
    await t.test('RT-03 targeted existing runner recheck', { timeout: 120000 }, async () => {
      const report = await withRetryRunner(app.origin, { error: 503 }, async fixtures => {
        const report = await runSuite(runnerRetryScenario(), { baseUrl: app.origin, outputDir: path.join(runDir, 'runner-recheck'), timeoutMs: 15000 });
        assert.equal(fixtures.length, 1); assert.equal(fixtures[0].state.unknown, 0);
        assert.equal(fixtures[0].state.posts, 2); assert.equal(fixtures[0].state.reads, 2);
        return report;
      });
      await json(path.join(runDir, 'runner-result.json'), report);
      assert.equal(report.results[0].steps.filter(s => s.status === 'passed').length, runnerRetryScenario().scenarios[0].steps.length);
      assert.equal(report.results[0].status, 'passed');
      assert.deepEqual(report.results[0].pageErrors, []);
      assert.deepEqual(report.results[0].requestFailures, []);
      // Axe is not used as a substitute for exact matcher evidence.
      outcomes.push({ scenarioId: 'RT-03', variant: 'runner-recheck', status: 'passed', runnerStatus: report.results[0].status });
    });
  } finally {
    await browser?.close(); await app?.close(); await ledger();
  }
});
