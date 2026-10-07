#!/usr/bin/env node

import AxeBuilder from '@axe-core/playwright';
import { chromium, devices } from 'playwright';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const resolveProjectPath = (value) => path.isAbsolute(value) ? value : path.resolve(PROJECT_ROOT, value);
const relativeEvidence = (value) => path.relative(PROJECT_ROOT, value).split(path.sep).join('/');
const exists = async (file) => access(file, constants.R_OK).then(() => true).catch(() => false);
const slug = (value) => String(value).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

const scenariosArg = arg('--scenarios', '.qa/scenarios.json');
const authArg = arg('--auth', null);
const outputArg = arg('--output-dir', `.qa/reports/${new Date().toISOString().replace(/[:.]/g, '-')}`);
const baseUrl = arg('--base-url', 'http://localhost:3001');
const backendUrl = arg('--backend-url', 'http://localhost:8001');
const viewportNames = arg('--viewports', 'desktop').split(',').map((item) => item.trim()).filter(Boolean);

const VIEWPORTS = {
  desktop: { label: 'desktop', descriptor: devices['Desktop Chrome'] },
  tablet: { label: 'tablet', descriptor: devices['iPad Pro 11'] },
  mobile: { label: 'mobile', descriptor: devices['Pixel 5'] },
};

function contextOptions(descriptor, storageState) {
  const { defaultBrowserType: _defaultBrowserType, ...deviceOptions } = descriptor;
  return { ...deviceOptions, baseURL: baseUrl, storageState: storageState || undefined };
}

async function loadJson(file, label) {
  if (!(await exists(file))) throw new Error(`${label} not found: ${relativeEvidence(file)}`);
  return JSON.parse(await readFile(file, 'utf8'));
}

function targetUrl(value) {
  return new URL(value || '/', baseUrl).toString();
}

async function runStep(page, step, screenshotDir, evidence) {
  const timeout = step.timeout ?? 7_500;
  switch (step.action) {
    case 'goto':
      await page.goto(targetUrl(step.url), { waitUntil: step.waitUntil ?? 'domcontentloaded', timeout });
      break;
    case 'click':
      await page.locator(step.selector).click({ timeout });
      break;
    case 'fill':
      await page.locator(step.selector).fill(String(step.value ?? ''), { timeout });
      break;
    case 'wait':
      await page.locator(step.selector).waitFor({ state: step.state ?? 'visible', timeout });
      break;
    case 'press':
      await page.locator(step.selector ?? 'body').press(step.key, { timeout });
      break;
    case 'checkVisible':
      await page.locator(step.selector).waitFor({ state: 'visible', timeout });
      break;
    case 'checkText': {
      const locator = page.locator(step.selector);
      await locator.waitFor({ state: 'visible', timeout });
      const actual = (await locator.textContent()) ?? '';
      if (!actual.includes(String(step.text))) {
        throw new Error(`checkText failed for ${step.selector}: expected substring ${JSON.stringify(step.text)}`);
      }
      break;
    }
    case 'screenshot': {
      const file = path.join(screenshotDir, `${slug(step.name || 'step')}.png`);
      await page.screenshot({ path: file, fullPage: step.fullPage ?? true });
      evidence.push(relativeEvidence(file));
      break;
    }
    default:
      throw new Error(`Unknown action: ${String(step.action)}`);
  }
}

async function runScenario(browser, scenario, viewport, storageState, outputRoot) {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const runDir = path.join(outputRoot, `${slug(scenario.id)}-${viewport.label}`);
  await mkdir(runDir, { recursive: true });
  const tracePath = path.join(runDir, 'trace.zip');
  const finalScreenshot = path.join(runDir, 'final.png');
  const errorScreenshot = path.join(runDir, 'error.png');

  const result = {
    scenarioId: scenario.id,
    scenarioName: scenario.name ?? scenario.id,
    viewport: viewport.label,
    startedAt,
    finishedAt: null,
    durationMs: null,
    status: 'passed',
    reasons: [],
    finalUrl: null,
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    http5xx: [],
    axeViolations: [],
    evidence: { screenshots: [], trace: relativeEvidence(tracePath) },
  };

  const context = await browser.newContext(contextOptions(viewport.descriptor, storageState));
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') result.consoleErrors.push({ text: message.text(), location: message.location() });
  });
  page.on('pageerror', (error) => result.pageErrors.push({ message: error.message }));
  page.on('requestfailed', (request) => result.requestFailures.push({
    url: request.url(), method: request.method(), error: request.failure()?.errorText ?? 'unknown',
  }));
  page.on('response', (response) => {
    if (response.status() >= 500) result.http5xx.push({ url: response.url(), status: response.status() });
  });

  let tracingStarted = false;
  try {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    tracingStarted = true;
    await page.goto(targetUrl(scenario.url), { waitUntil: 'domcontentloaded', timeout: scenario.timeout ?? 20_000 });
    for (const step of scenario.steps ?? []) await runStep(page, step, runDir, result.evidence.screenshots);

    const axe = await new AxeBuilder({ page }).analyze();
    result.axeViolations = axe.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.length,
    }));

    await page.screenshot({ path: finalScreenshot, fullPage: true });
    result.evidence.screenshots.push(relativeEvidence(finalScreenshot));
    result.finalUrl = page.url();

    const expectations = scenario.expectations ?? {};
    if ((expectations.no_console_errors ?? true) && result.consoleErrors.length) {
      result.reasons.push(`console_errors:${result.consoleErrors.length}`);
    }
    if (result.pageErrors.length) result.reasons.push(`page_errors:${result.pageErrors.length}`);
    if (result.requestFailures.length) result.reasons.push(`request_failures:${result.requestFailures.length}`);
    if ((expectations.no_5xx_responses ?? true) && result.http5xx.length) {
      result.reasons.push(`http_5xx:${result.http5xx.length}`);
    }
    const blockingAxe = result.axeViolations.filter((item) => ['critical', 'serious'].includes(item.impact));
    const maxBlocking = expectations.axe_violations_max ?? 0;
    if (blockingAxe.length > maxBlocking) result.reasons.push(`axe_critical_serious:${blockingAxe.length}`);
    if (result.reasons.length) result.status = 'failed';
  } catch (error) {
    result.status = 'failed';
    result.reasons.push(`step_error:${error.message}`);
    result.finalUrl = page.url() || null;
    try {
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      result.evidence.screenshots.push(relativeEvidence(errorScreenshot));
    } catch {
      result.reasons.push('error_screenshot_unavailable');
    }
  } finally {
    if (!result.evidence.screenshots.some((item) => item.endsWith('/final.png') || item.endsWith('/error.png'))) {
      try {
        await page.screenshot({ path: finalScreenshot, fullPage: true });
        result.evidence.screenshots.push(relativeEvidence(finalScreenshot));
      } catch {
        result.reasons.push('final_screenshot_unavailable');
      }
    }
    if (tracingStarted) {
      try { await context.tracing.stop({ path: tracePath }); }
      catch { result.reasons.push('trace_unavailable'); }
    }
    await context.close();
    const finished = Date.now();
    result.finishedAt = new Date(finished).toISOString();
    result.durationMs = finished - started;
  }
  return result;
}

async function main() {
  const started = Date.now();
  const scenariosPath = resolveProjectPath(scenariosArg);
  const outputRoot = resolveProjectPath(outputArg);
  const authPath = authArg ? resolveProjectPath(authArg) : null;
  const definition = await loadJson(scenariosPath, 'Scenarios file');
  if (!Array.isArray(definition.scenarios) || !definition.scenarios.length) throw new Error('Scenarios file has no scenarios');
  const storageState = authPath ? await loadJson(authPath, 'Auth state') : null;
  const selectedViewports = viewportNames.map((name) => {
    const viewport = VIEWPORTS[name];
    if (!viewport) throw new Error(`Unknown viewport ${name}; expected ${Object.keys(VIEWPORTS).join(',')}`);
    return viewport;
  });
  await mkdir(outputRoot, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const scenario of definition.scenarios) {
      if (!scenario.id) throw new Error('Every scenario requires id');
      for (const viewport of selectedViewports) {
        results.push(await runScenario(browser, scenario, viewport, storageState, outputRoot));
      }
    }
  } finally {
    await browser.close();
  }

  const finished = Date.now();
  const report = {
    schemaVersion: 1,
    name: definition.name ?? 'UI QA report',
    startedAt: new Date(started).toISOString(),
    finishedAt: new Date(finished).toISOString(),
    durationMs: finished - started,
    environment: { frontendUrl: baseUrl, backendUrl },
    inputs: {
      scenariosPath: relativeEvidence(scenariosPath),
      authStatePath: authPath ? relativeEvidence(authPath) : null,
      viewports: selectedViewports.map((item) => item.label),
    },
    summary: {
      total: results.length,
      passed: results.filter((item) => item.status === 'passed').length,
      failed: results.filter((item) => item.status === 'failed').length,
    },
    results,
  };
  const reportPath = path.join(outputRoot, 'report.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ok: report.summary.failed === 0, report: relativeEvidence(reportPath), summary: report.summary })}\n`);
  if (report.summary.failed) process.exitCode = 1;
}

main().catch((error) => {
  process.stdout.write(`${JSON.stringify({ ok: false, blocker: 'runner_error', detail: error.message })}\n`);
  process.exitCode = 1;
});
