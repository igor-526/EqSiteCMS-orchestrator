import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { selectScenarios, safeUrl, contrastUnsupported, CONTRAST_UNSUPPORTED_REASONS } from '../qa/browser/schema.mjs';
import { CMS_VIEWPORT, runSuite } from '../qa/browser/runner.mjs';
import { parseArgs } from '../qa/run-scenarios.mjs';
import { startFixtureServer } from '../qa/browser/fixtures/server.mjs';
import { definition, scenario, nested, keyboardSteps, goodScenarios, contrastCases, unsupportedCases, contrastScenario } from '../qa/browser/fixtures/scenarios.mjs';
import { loadPlaywright } from '../qa/browser/dependencies.mjs';
import { runStep, computedContrast } from '../qa/browser/assertions.mjs';

import * as evidenceFs from 'node:fs';
import * as evidencePath from 'node:path';
import { fileURLToPath as evidenceFilePath } from 'node:url';

// QA_EVIDENCE_ROOT contract: validated lane root + exclusive per-suite child.
function suiteEvidence(defaultDir, suite, root, raw = process.env.QA_EVIDENCE_ROOT ?? defaultDir) {
  const invalid = () => { throw new Error('Invalid or colliding QA_EVIDENCE_ROOT'); };
  if (!raw || evidencePath.isAbsolute(raw) || raw.includes('\\') || raw.split('/').some(p => p === '.' || p === '..')) invalid();
  const target = evidencePath.resolve(root, raw);
  const allowed = ['.qa/harden-agent-verification-pipeline', '.qa/restore-seo-qa-readiness/QA-BROWSER-1', '.qa/restore-seo-qa-readiness/QG'];
  if (!allowed.some(base => target === evidencePath.join(root, base) && base !== allowed[0] || target.startsWith(evidencePath.join(root, base) + evidencePath.sep))) invalid();
  const parts = evidencePath.relative(root, target).split(evidencePath.sep);
  if (parts.some(p => !/^[a-zA-Z0-9_.-]+$/.test(p))) invalid();
  let current = root;
  for (const part of parts) {
    current = evidencePath.join(current, part);
    try { evidenceFs.mkdirSync(current); } catch (e) { if (e.code !== 'EEXIST') invalid(); }
    const st = evidenceFs.lstatSync(current);
    if (st.isSymbolicLink() || !st.isDirectory()) invalid();
  }
  const child = evidencePath.join(target, suite);
  try { evidenceFs.mkdirSync(child); } catch { invalid(); }
  return child;
}
// End QA_EVIDENCE_ROOT contract.
const evidence = suiteEvidence('.qa/restore-seo-qa-readiness/QA-BROWSER-1', process.env.QA_EVIDENCE_ROOT ? 'qa-browser' : `qa-browser-${Date.now()}-${process.pid}`, evidenceFilePath(new URL('../../', import.meta.url)));
const sentinel = 'SYNTHETIC_SECRET_SENTINEL_8ac6';
const cli = (args, timeout = 30000) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', c => { stdout += c; }); child.stderr.on('data', c => { stderr += c; });
  const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('CLI timeout')); }, timeout);
  child.on('error', reject); child.on('close', code => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
});
const fingerprint = async () => {
  const files = ['schema.mjs', 'assertions.mjs', 'runner.mjs', 'dependencies.mjs', 'fixtures/surface.html', 'fixtures/server.mjs', 'fixtures/scenarios.mjs'];
  const hash = createHash('sha256');
  for (const f of files) hash.update(await readFile(new URL(`../qa/browser/${f}`, import.meta.url)));
  for (const f of ['scripts/qa/run-scenarios.mjs', 'scripts/qa-browser.mjs', 'scripts/tests/qa-browser.test.mjs']) hash.update(await readFile(f));
  return hash.digest('hex');
};

test('FIX-01 / BR-01..03 — synthetic Chromium helpers', { timeout: 840000 }, async t => {
  await mkdir(evidence, { recursive: true });
  const fixture = await startFixtureServer({ lifetimeMs: 840000 });
  const outcomes = [];
  const run = async (name, scenarios, extra = {}) => {
    const report = await runSuite(definition(scenarios), { baseUrl: fixture.baseUrl, outputDir: path.join(evidence, name), timeoutMs: 5000, fixtureOrigin: fixture.baseUrl, ...extra });
    return report;
  };
  try {
    await t.test('CT-01/02 evidence paths reject escape, symlink and overwrite; legacy compatible', async () => {
      const root = path.join(evidence, 'path-tests');
      await mkdir(root, { recursive: true });
      for (const raw of ['', '/tmp/escape', '../escape', '.qa/../escape', '.qa/restore-seo-qa-readiness/QG/./x', '.qa/restore-seo-qa-readiness/QGevil', '.qa/another-change/x', '.qa/restore-seo-qa-readiness/QA-RETRY-1', '.qa/harden-agent-verification-pipeline', '.qa/restore-seo-qa-readiness/QG/a\\b']) {
        assert.throws(() => suiteEvidence('unused', 'child', root, raw));
      }
      for (const raw of ['.qa/restore-seo-qa-readiness/QA-BROWSER-1', '.qa/restore-seo-qa-readiness/QG', '.qa/harden-agent-verification-pipeline/legacy']) {
        const child = suiteEvidence('unused', 'child', root, raw);
        evidenceFs.writeFileSync(path.join(child, 'unchanged'), 'owned');
        assert.throws(() => suiteEvidence('unused', 'child', root, raw));
        assert.equal(evidenceFs.readFileSync(path.join(child, 'unchanged'), 'utf8'), 'owned');
      }
      const lane = path.join(root, '.qa/restore-seo-qa-readiness/QG');
      evidenceFs.symlinkSync(path.join(root, '.qa/harden-agent-verification-pipeline'), path.join(lane, 'link'), 'dir');
      assert.throws(() => suiteEvidence('unused', 'child', root, '.qa/restore-seo-qa-readiness/QG/link'));
      evidenceFs.writeFileSync(path.join(lane, 'file'), 'not-directory');
      assert.throws(() => suiteEvidence('unused', 'child', root, '.qa/restore-seo-qa-readiness/QG/file'));
      assert.ok(!JSON.stringify(contrastUnsupported(sentinel)).includes(sentinel));
      assert.equal(contrastUnsupported(sentinel).unsupportedReason, undefined);
      assert.equal(new Set(CONTRAST_UNSUPPORTED_REASONS).size, 7);
    });
    await t.test('CT-01 analytical ratios and independent normal/hover/focus/error; CT-02 finite paint refusals', async () => {
      const positives = contrastCases.map(c => contrastScenario(c));
      const negatives = unsupportedCases.map(c => contrastScenario(c));
      // Put an unsupported state first: it must not prevent other scenario IDs executing.
      const report = await run('contrast-contract', [negatives[0], ...positives, ...negatives.slice(1),
        contrastScenario({ id: 'CT-01-identical', selector: '#ct-identical' }),
        contrastScenario({ id: 'CT-01-error-inapplicable', selector: '#ct-state', state: 'error' }),
        contrastScenario({ id: 'CT-01-size-inapplicable', selector: '#ct-small', kind: 'largeText', threshold: 3 }),
      ]);
      assert.equal(new Set(report.results.map(r => r.scenarioId)).size, positives.length + negatives.length + 3);
      for (const c of contrastCases) {
        const result = report.results.find(r => r.scenarioId === c.id);
        assert.equal(result.status, 'passed', JSON.stringify(result));
        const step = result.steps[0];
        assert.equal(step.state, c.state ?? 'normal');
        assert.ok(Math.abs(step.ratio - c.ratio) < .001, `${c.id}: ${step.ratio}`);
        assert.equal(step.threshold, c.threshold ?? 4.5);
      }
      for (const c of unsupportedCases) {
        const result = report.results.find(r => r.scenarioId === c.id);
        assert.equal(result.status, 'failed');
        assert.deepEqual(result.reasons, ['contrast_unsupported'], c.id);
        assert.equal(result.steps[0].unsupportedReason, c.reason, c.id);
        assert.equal(result.steps[0].state, 'normal');
        assert.ok(!('ratio' in result.steps[0]));
      }
      for (const [id, code] of [['CT-01-identical', 'contrast_below_threshold'], ['CT-01-error-inapplicable', 'contrast_state_or_size_mismatch'], ['CT-01-size-inapplicable', 'contrast_state_or_size_mismatch']]) {
        assert.deepEqual(report.results.find(r => r.scenarioId === id).reasons, [code]);
      }
      const browser = await loadPlaywright().chromium.launch();
      try {
        const context = await browser.newContext({ viewport: CMS_VIEWPORT });
        const page = await context.newPage();
        await context.route('**/*', route => new URL(route.request().url()).origin === fixture.baseUrl ? route.continue() : route.abort());
        await page.goto(fixture.baseUrl);
        const identical = await page.locator('#ct-identical').evaluate(computedContrast, { kind: 'text' });
        assert.equal(identical.ratio, 1);
        // Focus must clear hover and normal must clear focus on this same page.
        for (const state of ['hover', 'focus', 'normal']) {
          const c = contrastCases.find(c => c.state === state);
          const actual = await runStep(page, { action: 'checkContrast', ...c, threshold: 4.5 }, { baseUrl: fixture.baseUrl });
          assert.ok(Math.abs(actual.ratio - c.ratio) < .001);
        }
        await context.close();
      } finally { await browser.close(); }
      assert.ok(!JSON.stringify(report).includes(sentinel));
      outcomes.push({ id: 'CT-01', status: 'passed' }, { id: 'CT-02', status: 'passed' });
    });
    await t.test('BR-03 schema / selection / budgets fail closed before browser', () => {
      const valid = definition([scenario('valid', [{ action: 'checkVisible', selector: '#open' }])]);
      assert.equal(selectScenarios(valid, { mode: 'self-check', scenarioIds: 'valid' }).length, 1);
      for (const options of [{ mode: 'self-check' }, { scenarioIds: '' }, { scenarioIds: 'missing' }, { scenarioIds: 'valid,valid' }, { timeoutMs: NaN }, { timeoutMs: 120001 }, { maxScenarios: 0 }, { service: 'frontend', viewports: ['mobile'] }, { service: 'frontend', viewports: ['desktop', 'tablet'] }, { mode: 'fast' }]) {
        assert.throws(() => selectScenarios(valid, options));
      }
      for (const step of [{ action: 'unknown' }, { action: 'click' }, { action: 'checkCount', selector: 'x', count: -1 }, { action: 'checkGeometry', selector: 'x' }, { action: 'checkContrast', selector: 'x', threshold: NaN }, { action: 'checkContrast', selector: 'x', threshold: 3 }, { action: 'checkContrast', selector: 'x', kind: 'ui', threshold: 3 }]) {
        assert.throws(() => selectScenarios(definition([scenario('bad', [step])])));
      }
      const badExclude = structuredClone(valid); badExclude.scenarios[0].axeScope.exclude = [{ selector: 'x' }];
      assert.throws(() => selectScenarios(badExclude));
      assert.throws(() => selectScenarios({ scenarios: [] }));
      assert.throws(() => parseArgs(['--unknown', 'x']));
      assert.equal(safeUrl(`https://user:${sentinel}@example.test/path?secret=${sentinel}#${sentinel}`), 'https://example.test/path');
      assert.equal(selectScenarios(valid, { service: 'site-ad', viewports: ['tablet', 'mobile'] }).length, 1);
      assert.deepEqual(CMS_VIEWPORT, { width: 1366, height: 768 });
      outcomes.push({ id: 'BR-03-schema', status: 'passed' });
    });
    await t.test('BR-01 keyboard / sizing / lifecycle and BR-02 geometry / alpha / scoped axe', async () => {
      const report = await run('positive', goodScenarios);
      assert.deepEqual(report.results.map(r => [r.scenarioId, r.status, r.reasons]), goodScenarios.map(s => [s.id, 'passed', []]));
      assert.ok(report.results.every(r => r.evidence.trace && r.viewport === 'desktop'));
      assert.ok(report.results.find(r => r.scenarioId === 'contrast').steps.filter(s => s.ratio).every(s => s.ratio >= s.threshold));
      const alpha = report.results.find(r => r.scenarioId === 'contrast').steps.find(s => s.stepId === 'step-4');
      assert.ok(Math.abs(alpha.ratio - 12.6347) < .001);
      outcomes.push({ id: 'BR-01-positive', status: 'passed' }, { id: 'BR-02-positive', status: 'passed' });
    });
    await t.test('BR-01..02 deliberately bad variants do not pass', async () => {
      const bad = [
        nested('bad-nested', false, '/bad'), nested('bad-pending', true, '/bad-pending'),
        scenario('bad-sizing', [{ action: 'checkHidden', selector: '#sizing', timeout: 100 }], { url: '/sizing-bad' }),
        scenario('bad-count', [{ action: 'checkCount', selector: 'table', count: 1, timeout: 100 }]),
        scenario('bad-focus', [{ action: 'checkFocused', selector: '#open', timeout: 100 }]),
        scenario('bad-attribute', [{ action: 'checkAttribute', selector: '#table', name: 'data-offset', value: '0', timeout: 100 }]),
        scenario('bad-overflow', [{ action: 'checkGeometry', selector: '#toolbar', noOverflow: true }], { url: '/geometry-bad' }),
        scenario('bad-clipping', [{ action: 'checkGeometry', selector: '#clipText', unclipped: true }], { url: '/clipping-bad' }),
        scenario('bad-viewport', [{ action: 'checkGeometry', selector: '#scrolltarget', inViewport: true }]),
        scenario('bad-contrast', [{ action: 'checkContrast', selector: '#contrast', threshold: 4.5 }], { url: '/contrast-bad' }),
        scenario('image', [{ action: 'checkContrast', selector: '#contrast', threshold: 4.5 }], { url: '/image-bad' }),
        scenario('compositing', [{ action: 'checkContrast', selector: '#contrast', threshold: 4.5 }], { url: '/compositing-bad' }),
        scenario('hidden-geometry', [{ action: 'checkGeometry', selector: '#sizing', noOverflow: true }]),
        scenario('gradient', [{ action: 'checkContrast', selector: '#gradient', threshold: 4.5 }]),
        scenario('ambiguous', [{ action: 'click', selector: 'button' }]),
        scenario('public-missing', [{ action: 'click', selector: '#not-present' }]),
        scenario('axe-negative', [{ action: 'checkVisible', selector: '#open' }], { axeScope: { include: ['#surface'] } }),
      ];
      const report = await run('negative', bad);
      assert.deepEqual(report.results.map(r => r.status), bad.map(() => 'failed'));
      assert.ok(report.results.find(r => r.scenarioId === 'gradient').reasons.includes('contrast_unsupported'));
      assert.ok(report.results.find(r => r.scenarioId === 'ambiguous').reasons.includes('ambiguous_selector'));
      assert.ok(report.results.find(r => r.scenarioId === 'public-missing').reasons.includes('missing_selector'));
      assert.ok(report.results.find(r => r.scenarioId === 'axe-negative').reasons.includes('axe_critical_serious'));
      outcomes.push({ id: 'BR-01-negative', status: 'passed' }, { id: 'BR-02-negative', status: 'passed' });
    });
    await t.test('FIX-01 same Space→Escape reproducer before FAIL → after PASS, including pending state', async () => {
      const browser = await loadPlaywright().chromium.launch();
      try {
        for (const pending of [false, true]) {
          const caseId = pending ? 'pending' : 'nonpending';
          const records = [];
          const s = nested('exact-space-escape', pending, '/reproducer');
          const expected = { wizardOpen: true, confirmationOpen: pending, pending, focusTrigger: !pending, focusSave: pending };
          for (const phase of ['before', 'after']) {
            fixture.setVariant(phase === 'before' ? pending ? 'bad-pending' : 'bad' : pending ? 'pending' : 'good');
            const report = await run(`reproducer-${caseId}-${phase}`, [s]);
            assert.equal(report.results[0].status, phase === 'before' ? 'failed' : 'passed');
            const context = await browser.newContext({ viewport: CMS_VIEWPORT });
            const page = await context.newPage();
            await page.goto(`${fixture.baseUrl}/reproducer`);
            for (const step of keyboardSteps) await runStep(page, step, { baseUrl: fixture.baseUrl });
            const actual = await page.evaluate(() => ({ wizardOpen: document.querySelector('#wizard').open, confirmationOpen: document.querySelector('#confirm').open,
              pending: document.querySelector('#confirm').dataset.pending === 'true', focusTrigger: document.activeElement.id === 'confirmTrigger', focusSave: document.activeElement.id === 'save' }));
            await context.close();
            const record = { findingId: `FIX-01-${caseId}`, scenarioId: s.id, revision: `${await fingerprint()}:${phase}`, environmentFingerprint: 'synthetic-chromium-1366x768',
              input: { fixture: 'nested-dialog', pending }, keys: ['Tab', 'Enter', 'Tab', 'Shift+Tab', 'Space', 'Escape'], route: '/reproducer', domLocator: '#wizard > #confirm', expected, actual,
              status: report.results[0].status, timestamp: new Date().toISOString() };
            await writeFile(path.join(evidence, `reproducer-${caseId}-${phase}.json`), JSON.stringify(record, null, 2) + '\n');
            records.push(record);
          }
          assert.notDeepEqual(records[0].actual, expected); assert.deepEqual(records[1].actual, expected);
          for (const key of ['scenarioId', 'input', 'keys', 'route', 'domLocator', 'expected']) assert.deepEqual(records[0][key], records[1][key]);
        }
      } finally { await browser.close(); fixture.setVariant('good'); }
      outcomes.push({ id: 'FIX-01', status: 'passed' });
    });
    await t.test('BR-03 legacy actions / report consumers / live privacy / CLI CMS delegation', async () => {
      const legacy = { scenarios: [{ id: 'legacy', url: `/good?token=${sentinel}`, steps: [
        { action: 'goto', url: `/good?token=${sentinel}` }, { action: 'wait', selector: '#open' },
        { action: 'checkVisible', selector: '#open' }, { action: 'click', selector: '#open' },
        { action: 'press', selector: '#confirmTrigger', key: 'Escape' },
        { action: 'checkText', selector: 'h1', text: 'Browser helper' },
        { action: 'fill', selector: '#private', value: sentinel }, { action: 'screenshot' },
      ], axeScope: { include: ['#surface'], exclude: [{ selector: '#outside', reason: 'negative image fixture' }] } }] };
      // A dedicated loopback server injects synthetic private input/logs; NEVER enable fixture trace capability for it.
      const http = await import('node:http');
      const template = await readFile(new URL('../qa/browser/fixtures/surface.html', import.meta.url), 'utf8');
      const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(template.replace('__FIXTURE_VARIANT__', 'good').replace('</main>', `<label>Private<input id="private" value="${sentinel}"></label><script>console.error('${sentinel}');</script></main>`)); });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      const baseUrl = `http://127.0.0.1:${server.address().port}`;
      try {
        const report = await runSuite(legacy, { baseUrl, outputDir: path.join(evidence, 'privacy'), storageState: { cookies: [], origins: [] }, timeoutMs: 5000 });
        assert.equal(report.schemaVersion, 2); assert.equal(report.summary.total, 1); assert.equal(report.summary.failed, 1); // Console error, never raw text.
        assert.ok(report.results[0].steps.filter(s => s.status === 'passed').length >= 8);
        for (const key of ['scenarioId', 'status', 'reasons', 'consoleErrors', 'pageErrors', 'requestFailures', 'http5xx', 'axeViolations', 'evidence']) assert.ok(key in report.results[0]);
        assert.equal(report.results[0].evidence.trace, null); assert.deepEqual(report.results[0].evidence.screenshots, []);
        assert.equal(report.results[0].evidence.status, 'evidence-redacted');
        assert.ok(!JSON.stringify(report).includes(sentinel)); assert.ok(!JSON.stringify(report).includes('?token'));
        const safeScenario = scenario('safe-fragment', [{ action: 'screenshot' }], { evidencePolicy: { screenshot: { selector: '#private', mask: ['#private'] } }, expected: { no_console_errors: false } });
        const masked = await runSuite(definition([safeScenario]), { baseUrl, outputDir: path.join(evidence, 'masked'), timeoutMs: 5000 });
        assert.equal(masked.summary.failed, 0); assert.ok(masked.results[0].evidence.screenshots.length); assert.equal(masked.results[0].evidence.trace, null);
        const scenarioFile = path.join(evidence, 'cli-scenarios.json');
        await writeFile(scenarioFile, JSON.stringify(definition([scenario('cli', [{ action: 'checkVisible', selector: '#open' }], { url: '/good' })])));
        const common = [`--scenarios=${scenarioFile}`, `--output-dir=${evidence}/cli`, `--base-url=${fixture.baseUrl}`, '--mode=self-check', '--scenario-ids=cli', '--timeout-ms=5000'];
        const result = await cli(['scripts/qa-browser.mjs', '--service=frontend', ...common]);
        assert.equal(result.code, 0, result.stdout + result.stderr);
        assert.ok(!result.stdout.includes(sentinel)); assert.ok(!result.stderr.includes(sentinel));
        const delegated = JSON.parse(await readFile(path.join(evidence, 'cli/report.json'), 'utf8'));
        assert.deepEqual(delegated.inputs.viewports, ['desktop']); assert.equal(delegated.summary.passed, 1);
        const invalid = await cli(['scripts/qa/run-scenarios.mjs', ...common, '--viewports=tablet']);
        assert.equal(invalid.code, 1); assert.ok(invalid.stdout.includes('cms_desktop_only'));
        const legacyBranch = await readFile('scripts/qa-browser.mjs', 'utf8');
        for (const service of ['site-ad', 'site-ksk-inlove']) assert.ok(legacyBranch.includes(`'${service}':`));
        assert.equal((legacyBranch.match(/tablet: \{ width: 768, height: 1024 \}/g) ?? []).length, 2);
        assert.equal((legacyBranch.match(/mobile: \{ width: 375, height: 667 \}/g) ?? []).length, 2);
        const badAction = structuredClone(legacy); badAction.scenarios[0].steps.push({ action: sentinel });
        await writeFile(scenarioFile, JSON.stringify(badAction));
        const rejected = await cli(['scripts/qa/run-scenarios.mjs', `--scenarios=${scenarioFile}`]);
        assert.equal(rejected.code, 1); assert.ok(rejected.stdout.includes('unknown_action')); assert.ok(!rejected.stdout.includes(sentinel));
        // Evidence must not contain the private sentinel, including screenshots; no live zip exists at all.
        for (const name of ['privacy', 'masked']) {
          const walk = async dir => { for (const e of await readdir(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) await walk(p); else { assert.notEqual(e.name, 'trace.zip'); assert.ok(!(await readFile(p)).includes(Buffer.from(sentinel)), p); } } };
          await walk(path.join(evidence, name));
        }
      } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
      outcomes.push({ id: 'BR-03-privacy-compatibility', status: 'passed' });
    });
    await t.test('BR-02 error state / timeout enforcement', async () => {
      const http = await import('node:http');
      const html = await readFile(new URL('../qa/browser/fixtures/surface.html', import.meta.url), 'utf8');
      const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(html.replace('__FIXTURE_VARIANT__', 'good').replace('id="contrast"', 'id="contrast" aria-invalid="true"')); });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      try {
        const report = await runSuite(definition([scenario('error-state', [{ action: 'checkContrast', selector: '#contrast', state: 'error', threshold: 4.5 }])]), { baseUrl: `http://127.0.0.1:${server.address().port}`, outputDir: path.join(evidence, 'error-state'), timeoutMs: 5000 });
        assert.equal(report.summary.failed, 0);
      } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
      const report = await run('timeout', [scenario('bounded', [{ action: 'wait', selector: '#never' }])], { timeoutMs: 150, fixtureOrigin: undefined });
      assert.equal(report.summary.failed, 1); assert.ok(report.results[0].durationMs < 5000);
      outcomes.push({ id: 'BR-02-error-timeout', status: 'passed' });
    });
  } finally {
    await fixture.close();
    await writeFile(path.join(evidence, 'suite.json'), JSON.stringify({ schemaVersion: 1, scenarioIds: ['FIX-01', 'BR-01', 'BR-02', 'BR-03', 'CT-01', 'CT-02'], codeFingerprint: await fingerprint(), outcomes, status: outcomes.length === 10 ? 'passed' : 'failed' }, null, 2) + '\n');
  }
});
