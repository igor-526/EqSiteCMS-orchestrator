import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// POL-01: documents only. No Docker, product dependencies, network or mutation.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const load = (path) => readFileSync(resolve(root, path), 'utf8');
const policyPath = 'agents/howto/verification-policy.md';
const policy = load(policyPath);
const consumers = ['AGENTS.md', 'agents/planner.md', 'agents/backend.md',
  'agents/frontend.md', 'agents/howto/context-economy-patterns.md'];
const matrixFields = ['riskId', 'scenarioId', 'unit', 'testPath/command',
  'evidenceOwner', 'prerequisites', 'isolation', 'permission', 'budget', 'stopCondition', 'status'];
const ledgerFields = ['runId', 'stage', 'unit', 'scenarioId', 'evidenceOwner', 'command',
  'aliases', 'revision', 'codeFingerprint', 'environmentFingerprint', 'options',
  'startedAt', 'finishedAt', 'status', 'evidencePath', 'reason', 'previousRunId'];

const stageChecks = {
  unit: /Targeted tests.*scoped non-mutating.*Полный suite\/build/,
  'final-service': /`make test`.*`make lint`.*`npm run build`.*aliases/,
  'owner-self-check': /FE scoped browser.*BE paired wire.*независимого QG/,
  fix: /Exact reproducer FAIL→PASS.*impacted regression.*Full suite без причины/,
  QG: /Независимое исполнение.*один full suite.*Дубликат соседней lane/,
  'docs-only': /Static policy\/links\/OpenSpec.*Product runtime suites\/build/,
};

function policyErrors(doc) {
  const errors = [];
  for (const stage of ['unit', 'final-service', 'owner-self-check', 'fix', 'QG', 'docs-only']) {
    const rows = doc.split('\n').filter((line) => line.startsWith(`| ${stage} |`));
    if (rows.length !== 1 || rows[0].split('|').length !== 5 || !stageChecks[stage].test(rows[0])) errors.push(`stage:${stage}`);
  }
  const rules = {
    aliases: /aliases запиши в ledger, но не создавай второй run/,
    formatter: /Один canonical formatter определяется Makefile\/конфигурацией/,
    whitespace: /Whitespace\/import ordering без смены смысла при зелёном canonical gate — minor, без отдельного fix\/recheck/,
    invalidation: /инвалидирует затронутые evidence по dependency\/blast radius, но не независимые сервисы/,
    closure: /tests, fixtures\/conftest, wiring\/DI, migration\/head fixtures, DTO snapshots, inventories\/generators/,
    permission: /Proposal\/apply approval НЕ разрешает destructive tests или setup\/teardown/,
    stop: /не более двух infrastructure repair attempts и одного targeted QG recheck/,
    unreproduced: /`unreproduced` observation и blocked closure/,
    paired: /Production producer→consumer в отдельных service lockfile env/,
    rollback: /новой независимой session после rollback/,
    before: /reproducer-before\.json/,
    after: /reproducer-after\.json/,
  };
  for (const [name, regex] of Object.entries(rules)) if (!regex.test(doc)) errors.push(name);
  const declaredFields = [...doc.matchAll(/`([^`]+)`/g)].flatMap((match) => match[1].split(/,\s*/));
  for (const field of new Set([...matrixFields, ...ledgerFields])) {
    if (!declaredFields.includes(field)) errors.push(`field:${field}`);
  }
  return errors;
}

// Synthetic document fixture (not a product reproducer or runtime evidence).
const fixture = [
  ...['unit', 'final-service', 'owner-self-check', 'fix', 'QG', 'docs-only']
    .map((stage) => policy.split('\n').find((line) => line.startsWith(`| ${stage} |`))),
  'aliases запиши в ledger, но не создавай второй run',
  'Один canonical formatter определяется Makefile/конфигурацией',
  'Whitespace/import ordering без смены смысла при зелёном canonical gate — minor, без отдельного fix/recheck',
  'Новый diff инвалидирует затронутые evidence по dependency/blast radius, но не независимые сервисы',
  'tests, fixtures/conftest, wiring/DI, migration/head fixtures, DTO snapshots, inventories/generators',
  'Proposal/apply approval НЕ разрешает destructive tests или setup/teardown',
  'не более двух infrastructure repair attempts и одного targeted QG recheck',
  '`unreproduced` observation и blocked closure',
  'Production producer→consumer в отдельных service lockfile env',
  'persisted failure в новой независимой session после rollback',
  'reproducer-before.json reproducer-after.json',
  ...[...matrixFields, ...ledgerFields].map((field) => `\`${field}\``),
].join('\n');

test('POL-01: actual policy and positive synthetic document satisfy contract', () => {
  assert.deepEqual(policyErrors(fixture), []);
  assert.deepEqual(policyErrors(policy), []);
});

for (const stage of ['unit', 'final-service', 'owner-self-check', 'fix', 'QG', 'docs-only']) {
  test(`POL-01 negative: missing/duplicate stage ${stage}`, () => {
    const row = fixture.split('\n').find((line) => line.startsWith(`| ${stage} |`));
    assert.ok(policyErrors(fixture.replace(row, '')).includes(`stage:${stage}`));
    assert.ok(policyErrors(`${fixture}\n${row}`).includes(`stage:${stage}`));
    const weakened = `| ${stage} | run whatever is convenient | no exclusions |`;
    assert.ok(policyErrors(fixture.replace(row, weakened)).includes(`stage:${stage}`));
  });
}

const mutations = [
  ['aliases', 'aliases запиши в ledger, но не создавай второй run', 'run all aliases again'],
  ['formatter', 'Один canonical formatter определяется Makefile/конфигурацией', 'Use both Black and Ruff'],
  ['whitespace', 'при зелёном canonical gate — minor, без отдельного fix/recheck', 'always create recheck'],
  ['invalidation', 'но не независимые сервисы', 'all services'],
  ['closure', 'wiring/DI, ', ''],
  ['permission', 'Proposal/apply approval НЕ разрешает', 'Proposal/apply approval разрешает'],
  ['stop', 'одного targeted QG recheck', 'unlimited rechecks'],
  ['unreproduced', '`unreproduced` observation и blocked closure', 'unreproduced means passed'],
  ['paired', 'Production producer→consumer', 'local matching mocks'],
  ['rollback', 'новой независимой session после rollback', 'mock state before rollback'],
  ['before', 'reproducer-before.json', ''],
  ['after', 'reproducer-after.json', ''],
];
for (const [rule, before, after] of mutations) {
  test(`POL-01 negative: reject weakened ${rule} contract`, () => {
    assert.ok(fixture.includes(before));
    assert.ok(policyErrors(fixture.replace(before, after)).includes(rule));
    assert.ok(policyErrors(policy.replace(before, after)).includes(rule));
  });
}
for (const field of new Set([...matrixFields, ...ledgerFields])) {
  test(`POL-01 negative: missing prerequisite/ledger field ${field}`, () => {
    assert.ok(policyErrors(fixture.split('\n').filter((line) => line !== `\`${field}\``).join('\n'))
      .includes(`field:${field}`));
  });
}

test('POL-01: consumers point to canonical policy, not copied stage tables', () => {
  for (const path of consumers) {
    const doc = load(path);
    assert.match(doc, /\]\([^)]*verification-policy\.md(?:#[^)]*)?\)/, path);
    assert.doesNotMatch(doc, /^\| final-service \|/m, path);
  }
});

const slug = (heading) => heading.toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu, '').replace(/ /g, '-');
function checkLinks(doc, path, policyOnly = false) {
  for (const match of doc.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1];
    if (/^(?:https?:|mailto:)/.test(href) || (policyOnly && !href.includes('verification-policy.md'))) continue;
    const [target, anchor] = href.split('#');
    const absolute = target ? resolve(root, dirname(path), target) : resolve(root, path);
    assert.ok(existsSync(absolute), `${path}: broken ${href}`);
    if (anchor) {
      const headings = [...readFileSync(absolute, 'utf8').matchAll(/^#{1,6} (.+)$/gm)].map((m) => slug(m[1]));
      assert.ok(headings.includes(anchor), `${path}: missing heading ${href}`);
    }
  }
}
test('POL-01: policy links and consumer heading references resolve', () => {
  checkLinks(policy, policyPath);
  for (const path of consumers) checkLinks(load(path), path, true);
  const backend = load('agents/backend.md');
  const referenced = [...backend.slice(backend.indexOf('\n## 0.'), backend.indexOf('\n## 1.'))
    .matchAll(/`(## Обязательные проверки[^`]+)`/g)];
  assert.equal(referenced.length, 1);
  assert.ok(backend.split('\n').includes(referenced[0][1]));
});

test('POL-01: scoped/final profile rules have no legacy unconditional command blocks', () => {
  const backend = load('agents/backend.md');
  const completion = backend.slice(backend.indexOf('\n## 13.'), backend.indexOf('\n## 14.'));
  assert.match(completion, /Промежуточный unit: targeted tests/);
  assert.match(completion, /Последний unit сервиса/);
  assert.doesNotMatch(completion, /```bash\nmake format\nmake test\nmake lint/);
  assert.match(completion, /persisted state в новой независимой session после rollback/);
  const frontend = load('agents/frontend.md');
  assert.doesNotMatch(frontend, /docs\/plans\/frontend_testing_mandatory/);
  assert.doesNotMatch(frontend, /```bash\n(?:cd services\/frontend\n)?npm test\nnpm run lint\nnpx tsc --noEmit\nnpm run build/);
  assert.match(frontend, /Chromium 1366×768/);
  assert.match(frontend, /Space → Escape/);
  assert.match(frontend, /Финальный unit CMS frontend:.*`make test`.*`make lint`.*`npm run build`/);
});

test('POL-01: planner prerequisites, ownership closure and budget stay explicit', () => {
  const planner = load('agents/planner.md');
  for (const field of matrixFields) assert.ok(planner.includes(field), field);
  for (const doc of [planner, load('AGENTS.md')]) {
    assert.match(doc, /Checkpoint units запрещены/);
    assert.match(doc, /inventories\/generators/);
    assert.match(doc, /не (?:счётчик|число) файлов/);
  }
  assert.match(planner, /dedicated `_test` DB\/роль, owned schema/);
  assert.match(planner, /QG-BE\/PG-01\.json/);
  assert.doesNotMatch(planner, /POSTGRES_PASSWORD|Config\.Env` из/);
});

test('POL-01: measurements distinguish bootstrap/cache/coverage, no universal price claim', () => {
  const doc = load('agents/howto/context-economy-patterns.md');
  assert.doesNotMatch(doc, /Каждый новый запуск агента стоит|поллинг.*~20%/);
  assert.match(doc, /input первого запроса/);
  assert.match(doc, /накопленный usage/);
  assert.match(doc, /cache — не квота/);
  assert.match(doc, /polling не доказан основной причиной/);
  assert.match(doc, /Read-once/);
  assert.match(doc, /Circuit Breaker/);
});

test('POL-01: documented static runner exists and matches this suite', () => {
  assert.match(policy, /node --test scripts\/tests\/pipeline-policy\.test\.mjs/);
  assert.ok(existsSync(resolve(root, 'scripts/tests/pipeline-policy.test.mjs')));
  const example = policy.match(/git diff --check -- (.+)/)[1].split(' ');
  for (const path of example) assert.ok(existsSync(resolve(root, path)), path);
});

// AG-01/09/10: shipping documentation only; unrelated POL-01 stays unchanged.
const shippingSkillPath = '.agents/skills/task-finalize/SKILL.md';
const shippingSkill = load(shippingSkillPath);
const readmeShipping = load('README.md').split('### Безопасная финализация через Make')[1].split('## Разработка')[0];
const workflowShipping = load('WORKFLOW.md').split('## Шаг 6. Финализация')[1].split('### Файлы OpenSpec')[0];
const servicesGit = load('SERVICES.md').split('## 🌿 Git-workflow')[1].split('\n---')[0];

test('SHIP-POL AG-01: exact Make inputs, escaping and defaults documented', () => {
  for (const doc of [readmeShipping, shippingSkill]) {
    for (const part of ['CHANGE=task-108 BRANCH=feature/seo-improve', 'MESSAGE="Улучшено SEO" PATHS_FILE=.qa/task-108/paths.txt',
      'ACTION=merge PLAN=.qa/ship/task-108/plan.json', "CONFIRM_PUSH='PLAN_TOKEN' RELEASE=1",
      'ACTION=release CHANGE=task-108 REPOS=backend,frontend', "CONFIRM_RELEASE='RELEASE_TOKEN'",
      'ACTION=plan', 'RELEASE=0', '-b', '-m', '--release', "MESSAGE='Цена $$5'", 'adapter_exit_code', '72']) assert.ok(doc.includes(part), part);
    assert.match(doc, /fake-root\/local-only/);
    assert.match(doc, /[Ww]hole-file/);
    assert.match(doc, /[Ff]oreign staged/);
    assert.match(doc, /[Ss]canner не заменяет review/);
  }
});

test('SHIP-POL AG-09/10: two token-bound gates, fallback and replan', () => {
  for (const doc of [readmeShipping, workflowShipping, shippingSkill, servicesGit]) {
    for (const text of ['PLAN_TOKEN', 'RELEASE_TOKEN', 'RELEASE=1', 'replan', 'текстовый вопрос', 'до ответа']) assert.ok(doc.includes(text), text);
    assert.match(doc, /feature и main будут отправлены в origin/);
    assert.match(doc, /(?:возможный deploy|CI\/CD)/);
  }
  assert.match(shippingSkill, /\*\*После archive Router предлагает точные BRANCH и MESSAGE\*\*/);
  assert.match(shippingSkill, /auto-yes запрещён/);
  assert.match(shippingSkill, /CONFIRM_RELEASE в merge игнорируется/);
  assert.match(shippingSkill, /новый preview\/token и согласие/);
  assert.match(shippingSkill, /QG\/approval change\/merge approval не разрешают deploy/);
});

test('SHIP-POL AG-09/10: main default, lock, durable state, explicit resume and CI preserved', () => {
  assert.match(servicesGit, /база — \*\*main\*\*, не dev/);
  assert.doesNotMatch(servicesGit, /dev — самая актуальная|от актуального `dev`|выполняет оператор/);
  for (const text of ['flock', 'global preflight', 'strict sync barrier', 'mergeState', 'resumeCommand',
    'phase2-complete', 'phase1', 'failed/untouched', 'run_in_background: true', 'job_output',
    '30 минут', '3 минуты', 'ci.json']) assert.ok(shippingSkill.toLowerCase().includes(text.toLowerCase()), text);
  assert.match(shippingSkill, /только явный `scripts\/shipctl merge --resume --change <c>`/);
  assert.match(shippingSkill, /generic checkout-main после конфликта запрещены/);
  assert.doesNotMatch(shippingSkill, /git switch|OPS-CHECKOUT-MAIN/);
  assert.match(workflowShipping, /Backend|Router/);
  assert.doesNotMatch(workflowShipping, /пока не реализован/);
});

test('SHIP-POL: new shipping links resolve without reading Router rules', () => {
  checkLinks(readmeShipping, 'README.md');
  checkLinks(workflowShipping, 'WORKFLOW.md');
  checkLinks(servicesGit, 'SERVICES.md');
  checkLinks(shippingSkill, shippingSkillPath);
});
