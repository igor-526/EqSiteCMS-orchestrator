#!/usr/bin/env node

import { chromium } from 'playwright';
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
const role = arg('--role', 'admin');

const exists = async (file) => access(file, constants.R_OK).then(() => true).catch(() => false);
const emit = (payload, exitCode = 0) => {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
  process.exitCode = exitCode;
};
const log = (message) => process.stderr.write(`${message}\n`);

function normalizeCredentials(raw, selectedRole) {
  const roleData = raw.roles?.[selectedRole] ?? (selectedRole === 'superuser' ? raw.roles?.su : undefined);
  if (!roleData) return null;
  const username = roleData.username ?? roleData.login;
  if (!username || !roleData.password) return null;
  return {
    username,
    password: roleData.password,
    backendUrl: arg('--backend-url', raw.backend_url ?? raw.base_url ?? 'http://localhost:8001'),
    frontendUrl: arg('--frontend-url', raw.frontend_url ?? 'http://localhost:3001'),
    authEndpoint: raw.auth_endpoint ?? '/api/auth/login',
  };
}

async function loadCredentials() {
  const candidates = [
    path.join(PROJECT_ROOT, '.claude/skills/api-smoke-test/credentials.json'),
    path.join(PROJECT_ROOT, '.qa/credentials.json'),
  ];
  for (const candidate of candidates) {
    if (!(await exists(candidate))) continue;
    try {
      const raw = JSON.parse(await readFile(candidate, 'utf8'));
      const credentials = normalizeCredentials(raw, role);
      if (credentials) return { ...credentials, source: path.relative(PROJECT_ROOT, candidate) };
    } catch (error) {
      log(`Ignoring invalid credentials file ${path.relative(PROJECT_ROOT, candidate)}: ${error.message}`);
    }
  }
  return null;
}

async function testApiLogin(credentials) {
  const endpoint = new URL(credentials.authEndpoint, credentials.backendUrl).toString();
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username: credentials.username, password: credentials.password }),
    });
    return { reachable: true, ok: response.ok, status: response.status, endpoint };
  } catch (error) {
    return { reachable: false, ok: false, status: null, endpoint, error: error.message };
  }
}

async function loginViaUi(credentials, outputPath) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: credentials.frontendUrl });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  try {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const username = page.locator('#login_username, input[placeholder="Логин"]').first();
    const password = page.locator('#login_password, input[placeholder="Пароль"]').first();
    await username.fill(credentials.username);
    await password.fill(credentials.password);

    const authResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/auth/login') && response.request().method() === 'POST',
      { timeout: 15_000 },
    ).catch(() => null);
    await page.getByRole('button', { name: 'Войти' }).click();
    const authResponse = await authResponsePromise;
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15_000 }).catch(() => null);

    const postLoginUrl = page.url();
    if (new URL(postLoginUrl).pathname.endsWith('/login')) {
      const alert = await page.locator('[role="alert"]').allTextContents().catch(() => []);
      return {
        ok: false,
        blocker: 'ui_credentials_rejected',
        authStatus: authResponse?.status() ?? null,
        postLoginUrl,
        alert,
        consoleErrors,
      };
    }

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => null);
    const protectedUrl = page.url();
    if (new URL(protectedUrl).pathname.endsWith('/login')) {
      return {
        ok: false,
        blocker: 'storage_state_not_authenticated',
        authStatus: authResponse?.status() ?? null,
        postLoginUrl,
        protectedUrl,
        consoleErrors,
      };
    }

    await context.storageState({ path: outputPath });
    return {
      ok: true,
      authStatus: authResponse?.status() ?? null,
      postLoginUrl,
      protectedUrl,
      consoleErrors,
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  const credentials = await loadCredentials();
  if (!credentials) {
    emit({
      schemaVersion: 1,
      ok: false,
      role,
      startedAt,
      finishedAt: new Date().toISOString(),
      blocker: 'credentials_not_available',
      detail: 'No readable role credentials in .qa/credentials.json or .claude/skills/api-smoke-test/credentials.json',
    }, 1);
    return;
  }

  log(`Checking API login for role ${role} using ${credentials.source} (password redacted)`);
  const api = await testApiLogin(credentials);
  if (!api.ok) {
    emit({
      schemaVersion: 1,
      ok: false,
      role,
      startedAt,
      finishedAt: new Date().toISOString(),
      environment: { backendUrl: credentials.backendUrl, frontendUrl: credentials.frontendUrl },
      credentialSource: credentials.source,
      api: { reachable: api.reachable, status: api.status, endpoint: api.endpoint, error: api.error },
      blocker: api.reachable ? 'api_credentials_rejected' : 'backend_unreachable',
    }, 1);
    return;
  }

  const outputPath = path.join(PROJECT_ROOT, `.qa/auth-${role}.json`);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const ui = await loginViaUi(credentials, outputPath);
  if (!ui.ok) {
    emit({
      schemaVersion: 1,
      ok: false,
      role,
      startedAt,
      finishedAt: new Date().toISOString(),
      environment: { backendUrl: credentials.backendUrl, frontendUrl: credentials.frontendUrl },
      credentialSource: credentials.source,
      api: { reachable: api.reachable, status: api.status, endpoint: api.endpoint },
      ui,
      blocker: ui.blocker,
    }, 1);
    return;
  }

  emit({
    schemaVersion: 1,
    ok: true,
    role,
    startedAt,
    finishedAt: new Date().toISOString(),
    environment: { backendUrl: credentials.backendUrl, frontendUrl: credentials.frontendUrl },
    credentialSource: credentials.source,
    api: { reachable: true, status: api.status, endpoint: api.endpoint },
    ui,
    storageStatePath: path.relative(PROJECT_ROOT, outputPath),
  });
}

main().catch((error) => emit({
  schemaVersion: 1,
  ok: false,
  role,
  finishedAt: new Date().toISOString(),
  blocker: 'unexpected_error',
  detail: error.message,
}, 1));
