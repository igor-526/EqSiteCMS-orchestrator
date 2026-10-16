import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../stackctl'), 'utf8');
const SECRET = 'fixture-password-not-for-host-output';
const PEERS = ['yandex-service', 'ya-metrica-service'];
const DBS = ['db-yandex', 'db-ya-metrica'];
const NEW_ALIASES = ['ya-metrica-service', ...DBS];

// Only the fixture copy's hardcoded root changes. All Docker/flock calls are
// intercepted via an isolated PATH; no host env files or real daemon are used.
function fixture(t, overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'stackctl-test-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  mkdirSync(join(root, '.docker-compose'));
  writeFileSync(join(root, '.docker-compose/.env'), [
    'POSTGRES_USER=legacy-user', 'POSTGRES_NAME=legacy-db',
    'POSTGRES_NOTIFICATIONS_USER=notifications-user', 'POSTGRES_NOTIFICATIONS_NAME=notifications-db',
    'POSTGRES_EMAIL_USER=email-user', 'POSTGRES_EMAIL_NAME=email-db',
    'POSTGRES_VK_USER=vk-user', 'POSTGRES_VK_NAME=vk-db',
  ].join('\n'));
  const declaration = "const PROJECT_ROOT = '/home/igor/projects/eqSiteCMS';";
  assert.ok(source.includes(declaration));
  const script = join(root, 'stackctl.mjs');
  writeFileSync(script, source.replace(declaration, `const PROJECT_ROOT = ${JSON.stringify(root)};`));
  const configPath = join(root, 'config.json');
  const trace = join(root, 'trace.jsonl');
  const psqlTrace = join(root, 'psql.jsonl');
  const config = {
    runtime: { POSTGRES_USER: 'runtime-user', POSTGRES_DB: 'runtime-db', POSTGRES_PASSWORD: SECRET },
    ...overrides,
  };
  writeFileSync(configPath, JSON.stringify(config));
  const executable = (name, body) => {
    const implementation = join(bin, `${name}.cjs`);
    writeFileSync(implementation, body);
    // Explicit -- keeps Node from consuming Docker's --env-file flag.
    writeFileSync(join(bin, name), `#!/bin/sh\nexec '${process.execPath}' -- '${implementation}' "$@"\n`, { mode: 0o755 });
  };
  executable('docker', `
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2);
const cfg = JSON.parse(fs.readFileSync(process.env.FAKE_CONFIG, 'utf8'));
fs.appendFileSync(process.env.FAKE_TRACE, JSON.stringify({ tool: 'docker', args }) + '\\n');
if (args[0] === 'info') process.exit(cfg.daemonDown ? 1 : 0);
if (args[0] === 'inspect') {
  const container = args[1];
  if (cfg.missingContainers) process.exit(1);
  let project = container.includes('ya-metrica') ? 'eqsitecms-ya-metrica' : 'eqsitecms-yandex';
  if (container.includes('-db')) project = 'eqsitecms-infra';
  if (container === 'eqsitecms-app') project = 'eqsitecms-core';
  project = cfg.projects?.[container] ?? project;
  const port = container === 'eqsitecms-yandex-service' ? '8007' : '32768';
  console.log(JSON.stringify([{
    Id: cfg.invalidIdentity ? 'invalid' : 'a'.repeat(64),
    Name: cfg.wrongIdentity ? '/other-container' : '/' + container,
    Config: args.includes('--format') ? undefined : { Labels: { 'com.docker.compose.project': project }, Env: ['POSTGRES_PASSWORD=' + cfg.runtime.POSTGRES_PASSWORD] },
    State: { Status: 'running', Health: { Status: 'healthy' } },
    NetworkSettings: {
      Ports: { '8000/tcp': [{ HostIp: '0.0.0.0', HostPort: port }] },
      Networks: cfg.networks ?? { infra: { IPAddress: '172.20.0.7' } },
    },
  }]));
} else if (args[0] === 'compose') {
  if (cfg.failCompose && args.includes(cfg.failCompose)) process.exit(1);
} else if (args[0] === 'logs') {
  console.log('safe fixture log');
} else if (args[0] === 'exec') {
  if (args[2] === 'sh') {
    if (cfg.execFailure) {
      console.error('raw exec diagnostic: ' + cfg.runtime.POSTGRES_PASSWORD);
      process.exit(126);
    }
    // Model docker exec's container environment, not the host's environment.
    const child = spawnSync('/bin/sh', args.slice(3), {
      encoding: 'utf8', env: {
        PATH: process.env.PATH, ...cfg.runtime,
        FAKE_CONFIG: process.env.FAKE_CONFIG, FAKE_PSQL_TRACE: process.env.FAKE_PSQL_TRACE,
      },
    });
    process.stdout.write(child.stdout ?? '');
    process.stderr.write(child.stderr ?? '');
    process.exit(child.status ?? 1);
  }
  if (args[2] !== 'psql') process.exit(97);
  console.log('legacy query result');
} else if (args[0] === 'ps') {
  // Empty stack is sufficient for the bounded infra up fixture.
} else {
  console.error('Unexpected fake Docker operation');
  process.exit(98);
}
`);
  executable('flock', `
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2);
const cfg = JSON.parse(fs.readFileSync(process.env.FAKE_CONFIG, 'utf8'));
fs.appendFileSync(process.env.FAKE_TRACE, JSON.stringify({ tool: 'flock', args }) + '\\n');
if (cfg.lockBusy) process.exit(75);
if (JSON.stringify(args.slice(0, 4)) !== JSON.stringify(['-E', '75', '-n', '/tmp/stackctl.lock'])) process.exit(99);
const result = spawnSync(args[4], args.slice(5), { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
`);
  executable('od', `console.log(' abcdef0123456789');`);
  executable('timeout', `
const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2);
if (args[0] !== '8') process.exit(99);
const child = spawnSync(args[1], args.slice(2), { encoding: 'utf8', env: process.env, timeout: 8000 });
process.stdout.write(child.stdout ?? '');
process.stderr.write(child.stderr ?? '');
process.exit(child.status ?? 124);
`);
  executable('psql', `
const fs = require('node:fs');
const cfg = JSON.parse(fs.readFileSync(process.env.FAKE_CONFIG, 'utf8'));
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_PSQL_TRACE, JSON.stringify({
  args, passwordMatches: process.env.PGPASSWORD === cfg.runtime.POSTGRES_PASSWORD,
  bounded: process.env.PGCONNECT_TIMEOUT === '3' && process.env.PGOPTIONS === '-c statement_timeout=5000',
  stableLocale: process.env.LC_ALL === 'C',
}) + '\\n');
if (cfg.authFailure) {
  console.log(cfg.runtime.POSTGRES_PASSWORD);
  console.error('authentication failed: ' + cfg.runtime.POSTGRES_PASSWORD);
  process.exit(1);
}
if (cfg.secretOnSuccess) {
  console.log(cfg.runtime.POSTGRES_PASSWORD);
  process.exit(0);
}
const wrong = process.env.PGPASSWORD !== cfg.runtime.POSTGRES_PASSWORD;
if (wrong) {
  const mode = cfg.negative ?? 'auth';
  if (mode === 'trust') { console.log('1'); process.exit(0); }
  if (mode === 'auth') {
    console.error('psql: error: FATAL:  password authentication failed for user "runtime-user"');
    process.exit(2);
  }
  console.error('raw-' + mode + ': ' + cfg.runtime.POSTGRES_PASSWORD + ' / ' + process.env.PGPASSWORD);
  process.exit({ timeout: 124, connection: 2, exec: 127, sql: 1, signal: 137 }[mode] ?? 1);
}
if (cfg.positiveFailure) {
  console.error('raw-positive: ' + cfg.runtime.POSTGRES_PASSWORD);
  process.exit(cfg.positiveFailure === 'timeout' ? 124 : 2);
}
if (cfg.positiveResult !== undefined) { console.log(cfg.positiveResult); process.exit(0); }
if (cfg.secretOnSql && args.at(-1) !== 'SELECT 1') {
  console.log(cfg.secretOnSql === 'wrong' ? cfg.runtime.POSTGRES_PASSWORD + ':stackctl-invalid: abcdef0123456789' : cfg.runtime.POSTGRES_PASSWORD);
  process.exit(0);
}
console.log(args.at(-1) === 'SELECT 1' ? '1' : ' ?column?\\n----------\\n        1\\n(1 row)');
`);
  t.after(() => {
    // Verify the exact absolute deletion target is our own temporary fixture.
    const target = realpathSync(root);
    assert.equal(target, resolve(root));
    assert.equal(dirname(target), realpathSync(tmpdir()));
    assert.ok(target.startsWith(join(realpathSync(tmpdir()), 'stackctl-test-')));
    rmSync(target, { recursive: true });
  });
  const records = (path) => {
    try { return readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  };
  return {
    root,
    run(...args) {
      const result = spawnSync(process.execPath, [script, ...args], {
        encoding: 'utf8', timeout: 10_000,
        env: { PATH: bin, FAKE_CONFIG: configPath, FAKE_TRACE: trace, FAKE_PSQL_TRACE: psqlTrace },
      });
      assert.ifError(result.error);
      assert.equal(result.signal, null);
      const payload = JSON.parse(result.stdout); // stdout must be one JSON document
      assert.ok(!result.stdout.includes(SECRET), 'password leaked into JSON/stdout');
      assert.ok(!result.stderr.includes(SECRET), 'password leaked into stderr');
      assert.ok(!JSON.stringify(records(trace)).includes(SECRET), 'password leaked into host argv');
      return { ...result, payload };
    },
    calls: () => records(trace),
    sqlCalls: () => records(psqlTrace),
  };
}

function composeCalls(f) {
  return f.calls().filter((call) => call.tool === 'docker' && call.args[0] === 'compose').map((call) => call.args);
}

function assertTargeted(f, peers = PEERS, projects = {}) {
  const calls = composeCalls(f);
  assert.equal(calls.length, peers.length * 2);
  peers.forEach((peer, index) => {
    const profile = peer === 'yandex-service' ? 'yandex' : 'ya-metrica';
    const file = profile === 'yandex' ? 'yandex' : 'ya_metrica';
    for (const call of calls.slice(index * 2, index * 2 + 2)) {
      assert.equal(call[call.indexOf('-p') + 1], projects[peer] ?? `eqsitecms-${profile}`);
      assert.equal(call[call.indexOf('-f') + 1], join(f.root, `.docker-compose/docker-compose.${file}.yml`));
      assert.equal(call[call.indexOf('--env-file') + 1], join(f.root, `services/${peer}/.env`));
    }
    assert.deepEqual(calls[index * 2].slice(-2), ['build', peer]);
    assert.deepEqual(calls[index * 2 + 1].slice(-5), ['up', '-d', '--no-deps', '--force-recreate', peer]);
  });
  assert.ok(!calls.some((call) => call.includes('run') || call.some((arg) => arg.includes('migration'))));
}

test('UT-TOOL-01: ready targets only peers and reports current dynamic URLs', (t) => {
  const f = fixture(t);
  const result = f.run('ready', ...PEERS, '--no-migrate');
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(result.payload.ok, true);
  assert.deepEqual(result.payload.services.map((s) => [s.alias, s.rebuilt, s.health, s.urls]), [
    ['yandex-service', true, 'healthy', ['http://localhost:8007']],
    ['ya-metrica-service', true, 'healthy', ['http://localhost:32768']],
  ]);
  assertTargeted(f);
  assert.equal(f.calls().filter((c) => c.tool === 'flock').length, 1);
});

test('UT-TOOL-01: rebuild retains project label but selects files containing the peer', async (t) => {
  for (const peer of PEERS) {
    await t.test(peer, (t) => {
      // Known but incompatible project must not select core/be Compose files.
      const project = peer === 'yandex-service' ? 'eqsitecms-core' : 'custom-peer-project';
      const f = fixture(t, { projects: { [`eqsitecms-${peer}`]: project } });
      const result = f.run('rebuild', peer);
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
      assertTargeted(f, [peer], { [peer]: project });
    });
  }
});

test('UT-TOOL-01: missing peer uses fallback profile without automatic migrations', (t) => {
  const f = fixture(t, { missingContainers: true });
  const result = f.run('ready', ...PEERS, '--dry-run');
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(result.payload.plan.map((p) => [p.profile, p.migrate]), [['yandex', false], ['ya-metrica', false]]);
  assert.deepEqual(composeCalls(f), []);
});

test('UT-TOOL-02: dry-run bypasses busy flock without mutations', (t) => {
  const f = fixture(t, { lockBusy: true });
  const result = f.run('ready', ...PEERS, '--dry-run', '--no-migrate');
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(result.payload.plan, PEERS.map((alias, i) => ({
    alias, profile: i ? 'ya-metrica' : 'yandex', rebuild: true, migrate: false,
  })));
  assert.ok(f.calls().every((c) => c.tool === 'docker' && ['info', 'inspect'].includes(c.args[0])));
});

test('UT-TOOL-02: real mutations still require lock (exit 2)', async (t) => {
  for (const args of [['ready', ...PEERS, '--no-migrate'], ['rebuild', 'ya-metrica-service'], ['psql', DBS[0], '-c', 'SELECT 1']]) {
    await t.test(args.join(' '), (t) => {
      const f = fixture(t, { lockBusy: true });
      const result = f.run(...args);
      assert.equal(result.status, 2);
      assert.equal(result.payload.ok, false);
      assert.deepEqual(f.calls().map((c) => c.tool), ['flock']);
    });
  }
});

test('UT-TOOL-02: empty ready, YA alias and core app project remain compatible', (t) => {
  const f = fixture(t);
  assert.equal(f.run('ready').status, 0);
  assert.deepEqual(composeCalls(f), []);
  assert.equal(f.run('rebuild', 'yandex-service').status, 0);
  assertTargeted(f, ['yandex-service']);
  assert.equal(f.run('rebuild', 'app').status, 0);
  const appCalls = composeCalls(f).slice(-2);
  assert.ok(appCalls.every((c) => c[c.indexOf('-p') + 1] === 'eqsitecms-core'));
  assert.ok(appCalls.every((c) => c.at(-1) === 'backend'));
});

test('UT-TOOL-02: daemon and build failures preserve JSON exit codes', async (t) => {
  for (const [config, status] of [[{ daemonDown: true }, 2], [{ failCompose: 'build' }, 1], [{ failCompose: 'up' }, 1]]) {
    await t.test(JSON.stringify(config), (t) => {
      const f = fixture(t, config);
      const result = f.run('rebuild', 'ya-metrica-service');
      assert.equal(result.status, status);
      assert.equal(result.payload.ok, false);
    });
  }
});

test('UT-TOOL-03: doctor/logs address exactly the three new containers without lock', async (t) => {
  for (const alias of NEW_ALIASES) {
    await t.test(alias, (t) => {
      const f = fixture(t);
      const doctor = f.run('doctor', alias);
      assert.equal(doctor.status, 0);
      assert.equal(doctor.payload.diagnosis.container, `eqsitecms-${alias}`);
      assert.ok(!JSON.stringify(doctor.payload).includes('POSTGRES_PASSWORD'));
      const logs = f.run('logs', alias, '--since', '5m');
      assert.equal(logs.status, 0);
      assert.equal(logs.payload.since, '5m');
      assert.ok(f.calls().every((c) => c.tool === 'docker' && ['info', 'inspect', 'logs'].includes(c.args[0])));
      assert.ok(f.calls().filter((c) => c.args[0] !== 'info').every((c) => c.args.includes(`eqsitecms-${alias}`)));
    });
  }
});

test('UT-TOOL-03: unknown/container/prototype aliases cannot escape allowlist', async (t) => {
  for (const alias of ['outside-service', 'eqsitecms-ya-metrica-service', '__proto__', 'constructor']) {
    await t.test(alias, (t) => {
      const f = fixture(t);
      for (const cmd of ['doctor', 'logs', 'rebuild', 'ready']) {
        const result = f.run(cmd, alias);
        assert.equal(result.status, 1);
        assert.equal(result.payload.ok, false);
        assert.match(result.payload.error, /Unknown service/);
      }
      assert.ok(f.calls().filter((c) => c.tool === 'docker').every((c) => c.args[0] === 'info'));
    });
  }
});

test('UT-TOOL-04: both databases use runtime credentials, TCP and -w; SQL stays a positional argument', async (t) => {
  for (const alias of DBS) {
    await t.test(alias, (t) => {
      const f = fixture(t);
      const sql = 'SELECT 1; -- $POSTGRES_PASSWORD " $(not-a-command)';
      const result = f.run('psql', alias, '-c', sql);
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
      assert.match(result.payload.stdout, /1 row/);
      assert.equal(result.payload.stderr, '');
      const execs = f.calls().filter((c) => c.tool === 'docker' && c.args[0] === 'exec');
      assert.equal(execs.length, 1);
      assert.deepEqual(execs[0].args.slice(0, 4), ['exec', 'a'.repeat(64), 'sh', '-c']);
      assert.deepEqual(execs[0].args.slice(-3), ['stackctl-psql', sql, '172.20.0.7']);
      assert.ok(!execs[0].args[4].includes(sql));
      assert.deepEqual(f.sqlCalls(), ['SELECT 1', 'SELECT 1', sql].map((query, index) => ({
        args: ['-X', '-w', '-h', '172.20.0.7', '-p', '5432', '-U', 'runtime-user', '-d', 'runtime-db', '-At', '-c', query],
        passwordMatches: index !== 1, bounded: true, stableLocale: true,
      })));
    });
  }
});

test('UT-TOOL-04: all legacy DB aliases retain env-file/socket psql argv', (t) => {
  const f = fixture(t);
  for (const [alias, user, db] of [
    ['db', 'legacy-user', 'legacy-db'], ['db-notifications', 'notifications-user', 'notifications-db'],
    ['db-email', 'email-user', 'email-db'], ['db-vk', 'vk-user', 'vk-db'],
  ]) {
    assert.equal(f.run('psql', alias, '-c', 'SELECT 1').status, 0);
    const exec = f.calls().filter((c) => c.tool === 'docker' && c.args[0] === 'exec').at(-1);
    assert.deepEqual(exec.args, ['exec', `eqsitecms-${alias}`, 'psql', '-U', user, '-d', db, '-c', 'SELECT 1']);
  }
  assert.deepEqual(f.sqlCalls(), []);
});

test('UT-TOOL-05: missing/empty runtime credentials refuse before psql without secrets', async (t) => {
  for (const alias of DBS) {
    for (const key of ['POSTGRES_USER', 'POSTGRES_DB', 'POSTGRES_PASSWORD']) {
      for (const value of [undefined, '']) {
        await t.test(`${alias}/${key}/${value === '' ? 'empty' : 'missing'}`, (t) => {
          const f = fixture(t, { runtime: { POSTGRES_USER: 'user', POSTGRES_DB: 'db', POSTGRES_PASSWORD: SECRET, [key]: value } });
          const result = f.run('psql', alias, '-c', 'SELECT 1');
          assert.equal(result.status, 1);
          assert.equal(result.payload.ok, false);
          assert.deepEqual(f.sqlCalls(), []);
          assert.equal(f.calls().filter((c) => c.args[0] === 'exec').length, 1);
        });
      }
    }
  }
});

test('UT-TOOL-05: auth failure and credential-bearing success output are suppressed, never retried', async (t) => {
  for (const alias of DBS) {
    for (const mode of ['authFailure', 'secretOnSuccess']) {
      await t.test(`${alias}/${mode}`, (t) => {
        const f = fixture(t, { [mode]: true });
        const result = f.run('psql', alias, '-c', 'SELECT 1');
        assert.equal(result.status, 1);
        assert.equal(result.payload.ok, false);
        assert.equal(result.payload.stdout, undefined);
        assert.equal(result.payload.stderr, undefined);
        assert.equal(f.sqlCalls().length, 1);
        assert.equal(f.calls().filter((c) => c.args[0] === 'exec').length, 1);
      });
    }
  }
});

test('UT-TOOL-05: DB rebuild/ready (including mixed/dry requests) never mutate infra', async (t) => {
  for (const alias of DBS) {
    for (const args of [['rebuild', alias], ['ready', alias], ['ready', ...PEERS, alias], ['ready', alias, '--dry-run']]) {
      await t.test(args.join(' '), (t) => {
        const f = fixture(t);
        const result = f.run(...args);
        assert.equal(result.status, 1);
        assert.match(result.payload.error, /no build definition/);
        assert.deepEqual(composeCalls(f), []);
        assert.ok(f.calls().filter((c) => c.tool === 'docker').every((c) => c.args[0] === 'info'));
      });
    }
  }
});

test('UT-TOOL-05: unknown DB and missing SQL are safe failures', (t) => {
  const f = fixture(t);
  for (const args of [['psql', '__proto__', '-c', 'SELECT 1'], ['psql', 'db-unknown', '-c', 'SELECT 1'], ...DBS.map((db) => ['psql', db])]) {
    const result = f.run(...args);
    assert.equal(result.status, 1);
    assert.equal(result.payload.ok, false);
  }
  assert.ok(!f.calls().some((c) => c.args[0] === 'exec'));
});

function assertNoDatabaseMutation(f) {
  assert.ok(f.calls().every((call) => call.tool === 'flock'
    || (call.tool === 'docker' && ['info', 'inspect', 'exec'].includes(call.args[0]))));
  assert.ok(f.calls().filter((call) => call.args[0] === 'exec').every((call) => call.args[2] === 'sh'));
}

test('UT-TOOL-06: both aliases prove password auth on a single runtime IP; SELECT 1 reuses positive', async (t) => {
  for (const alias of DBS) {
    await t.test(alias, (t) => {
      const f = fixture(t);
      const result = f.run('psql', alias, '-c', 'SELECT 1');
      assert.equal(result.status, 0, result.stdout);
      assert.equal(result.payload.stdout, '1\n');
      assert.deepEqual(result.payload.target, { container: `eqsitecms-${alias}`, address: '172.20.0.7', port: 5432 });
      assert.deepEqual(result.payload.probes, { positive: 'passed', negative: 'password_auth_rejected' });
      const discovery = f.calls().find((call) => call.tool === 'docker' && call.args[0] === 'inspect');
      assert.equal(discovery.args[1], `eqsitecms-${alias}`);
      assert.equal(discovery.args[2], '--format');
      assert.ok(!discovery.args[3].includes('Env'), 'discovery must not retrieve credentials');
      const calls = f.sqlCalls();
      assert.equal(calls.length, 2);
      assert.deepEqual(calls.map((call) => call.passwordMatches), [true, false]);
      assert.deepEqual(calls[0].args, calls[1].args);
      assert.ok(calls.every((call) => call.bounded && call.stableLocale));
      assert.equal(calls[0].args[calls[0].args.indexOf('-h') + 1], '172.20.0.7');
      assert.equal(calls[0].args[calls[0].args.indexOf('-p') + 1], '5432');
      assertNoDatabaseMutation(f);
    });
  }
});

test('UT-TOOL-07: trust and indeterminate negative failures never execute user SQL', async (t) => {
  for (const alias of DBS) {
    for (const negative of ['trust', 'timeout', 'connection', 'exec', 'sql', 'signal']) {
      await t.test(`${alias}/${negative}`, (t) => {
        const f = fixture(t, { negative });
        const result = f.run('psql', alias, '-c', 'SELECT user_sql_must_not_run');
        assert.equal(result.status, 1);
        assert.equal(result.payload.ok, false);
        assert.deepEqual(result.payload.probes, { positive: 'passed', negative: negative === 'trust' ? 'accepted' : 'indeterminate' });
        assert.equal(result.payload.stdout, undefined);
        assert.equal(result.payload.stderr, undefined);
        assert.ok(!result.stdout.includes('raw-'));
        assert.deepEqual(f.sqlCalls().map((call) => call.args.at(-1)), ['SELECT 1', 'SELECT 1']);
        assertNoDatabaseMutation(f);
      });
    }
  }
});

test('UT-TOOL-08: missing, ambiguous, invalid and foreign targets fail closed before exec', async (t) => {
  const targets = [
    { missingContainers: true }, { networks: {} },
    { networks: { one: { IPAddress: '172.20.0.7' }, two: { IPAddress: '172.21.0.7' } } },
    { invalidIdentity: true }, { wrongIdentity: true },
    ...['127.0.0.1', '0.0.0.0', '169.254.1.2', '224.1.2.3', '999.1.2.3', '172.020.0.7', '::1', 'db-yandex', '172.20.0.7;echo unsafe']
      .map((IPAddress) => ({ networks: { infra: { IPAddress } } })),
  ];
  for (const alias of DBS) {
    for (const [index, config] of targets.entries()) {
      await t.test(`${alias}/target-${index}`, (t) => {
        const f = fixture(t, config);
        const result = f.run('psql', alias, '-c', 'SELECT user_sql_must_not_run');
        assert.equal(result.status, 1);
        assert.equal(result.payload.ok, false);
        assert.deepEqual(f.sqlCalls(), []);
        assert.ok(!f.calls().some((call) => call.args[0] === 'exec'));
        assertNoDatabaseMutation(f);
      });
    }
  }
});

test('UT-TOOL-08: positive/exec failures and secret SQL output are suppressed without fallback', async (t) => {
  for (const alias of DBS) {
    for (const config of [
      { positiveFailure: 'timeout' }, { positiveFailure: 'connection' }, { positiveResult: '0' },
      { execFailure: true }, { secretOnSql: 'current' }, { secretOnSql: 'wrong' },
    ]) {
      await t.test(`${alias}/${JSON.stringify(config)}`, (t) => {
        const f = fixture(t, config);
        const result = f.run('psql', alias, '-c', 'SELECT user_sql');
        assert.equal(result.status, 1);
        assert.equal(result.payload.ok, false);
        assert.equal(result.payload.stdout, undefined);
        assert.equal(result.payload.stderr, undefined);
        assert.ok(!result.stdout.includes('raw-'));
        const queries = f.sqlCalls().map((call) => call.args.at(-1));
        assert.deepEqual(queries, config.execFailure ? [] : config.secretOnSql ? ['SELECT 1', 'SELECT 1', 'SELECT user_sql'] : ['SELECT 1']);
        assertNoDatabaseMutation(f);
      });
    }
  }
});

test('UT-TOOL-01: infra profile up is bounded to the two registered databases', (t) => {
  const f = fixture(t);
  assert.equal(f.run('up', 'infra').status, 0);
  const calls = composeCalls(f);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(-5), ['up', '-d', '--no-deps', ...DBS]);
  assert.equal(calls[0][calls[0].indexOf('-p') + 1], 'eqsitecms-infra');
});
