// Quality Gate lanes workflow для EqSiteCMS OpenSpec changes (профиль QG-FULL)
// Выполняет применимые lanes по DAG, собирает handoff'ы, вычисляет вердикт
// и одним лёгким агентом пишет единый отчёт.

const {
  change,
  applicable_lanes = {},
  contextFiles = {},
  changedPaths = [],
  report_path,
  dryRun = false,
  only = null,
  schemas
} = args;

if (!change) throw new Error('args.change is required');
if (!report_path) throw new Error('args.report_path is required');
if (!schemas || !schemas.lane) throw new Error('args.schemas.lane is required');

// DAG QG-FULL (см. agents/quality_gate.md → «Правила lane-модели»)
const DAG = [
  ['QG-ENV'],
  ['QG-BE', 'QG-FE-AUTO', 'QG-CONTRACTS'],
  ['QG-LIVE', 'QG-FE-MANUAL'],
  ['QG-FORMAT']
];
// Только runtime-lanes зависят от успешного QG-ENV; остальные выполняются всегда,
// чтобы все findings собрать за один проход.
const RUNTIME_LANES = ['QG-LIVE', 'QG-FE-MANUAL'];

const applicableLanes = Object.keys(applicable_lanes).filter((l) => applicable_lanes[l] === true);
log(`Change: ${change}`);
log(`Applicable lanes: ${applicableLanes.join(', ')}`);
if (only) log(`Retry only: ${only.join(', ')}`);

const laneResults = {};

function createLanePrompt(laneId) {
  const context = contextFiles[laneId] || [];
  return `Ты — агент **Quality Gate** проекта EqSiteCMS, lane **${laneId}** (профиль QG-FULL). Не Router, не делегируй, не задавай вопросов пользователю. Общайся по-русски.

Порядок:
1. Прочитай ядро QG: \`agents/quality_gate.md\` строки между \`dsh-persona:begin\` и \`dsh-persona:end\`.
2. Найди секции своего lane: \`grep -n '^## ' agents/quality_gate.md\`, читай только их через read с offset/limit. Таблица «Классификация findings» обязательна.
3. Прочитай только contextFiles: ${context.length ? context.join(', ') : 'нет'}.
4. Пути change (path-scoped diff): ${changedPaths.length ? changedPaths.join(', ') : 'определи по handoff/tasks change'}.
5. Выполни проверки lane. Падения вне путей change → class \`pre-existing\`; дефекты окружения/инструментов → \`blocked-env\` (key_check=true, только если без этой проверки нельзя подтвердить change). Не чини инструменты, не создавай копии репозитория, не требуй чистый worktree.
6. Верни JSON строго по схеме handoff. Отдельный файл-отчёт не создавай.

Change ID: **${change}**`;
}

function dryRunResponse(laneId) {
  const fail = dryRun.fail && dryRun.fail.includes(laneId);
  return {
    lane: laneId,
    status: fail ? 'failed' : 'passed',
    findings: fail ? [{ class: 'blocking', owner_profile: 'Quality Gate', summary: `DRY RUN failure for ${laneId}` }] : [],
    commands: [{ cmd: 'dry-run', result: fail ? 'simulated failure' : 'simulated success' }],
    evidence: [],
    notes: `DRY RUN for ${laneId}`
  };
}

function envBlocked() {
  const env = laneResults['QG-ENV'];
  return env && (env.status === 'failed' || env.status === 'blocked-env');
}

for (let level = 0; level < DAG.length; level++) {
  const levelLanes = DAG[level];
  phase(`Level ${level + 1}: ${levelLanes.join(', ')}`);

  await parallel(levelLanes.map((laneId) => async () => {
    if (!applicableLanes.includes(laneId)) {
      laneResults[laneId] = { lane: laneId, status: 'not_applicable', findings: [], commands: [], evidence: [], notes: 'неприменимо' };
      return laneResults[laneId];
    }
    if (only && !only.includes(laneId)) return laneResults[laneId] || null;

    if (RUNTIME_LANES.includes(laneId) && envBlocked()) {
      laneResults[laneId] = {
        lane: laneId,
        status: 'blocked-env',
        findings: [{ class: 'blocked-env', key_check: true, owner_profile: 'Quality Gate', summary: `${laneId}: runtime недоступен (QG-ENV ${laneResults['QG-ENV'].status})` }],
        commands: [], evidence: [], notes: 'QG-ENV не подготовил runtime'
      };
      return laneResults[laneId];
    }

    if (dryRun) {
      laneResults[laneId] = dryRunResponse(laneId);
      return laneResults[laneId];
    }

    const result = await agent(createLanePrompt(laneId), { label: laneId, phase: `Level ${level + 1}: ${levelLanes.join(', ')}`, schema: schemas.lane });
    laneResults[laneId] = result || {
      lane: laneId,
      status: 'blocked-env',
      findings: [{ class: 'blocked-env', key_check: true, owner_profile: 'Quality Gate', summary: `${laneId}: агент вернул невалидный ответ` }],
      commands: [], evidence: [], notes: 'Agent execution failed'
    };
    log(`${laneId}: ${laneResults[laneId].status}`);
    return laneResults[laneId];
  }));
}

phase('QG-SYNTH: Synthesis');

const handoffs = Object.values(laneResults).filter(Boolean);
const findings = handoffs.flatMap((h) => (h.findings || []).map((f) => ({ lane: h.lane, ...f })));
const blocking = findings.filter((f) => f.class === 'blocking');
const keyBlocked = findings.filter((f) => f.class === 'blocked-env' && f.key_check === true);

let verdict = 'APPROVED';
if (blocking.length > 0) verdict = 'REWORK';
else if (keyBlocked.length > 0) verdict = 'BLOCKED';

log(`Verdict: ${verdict} (blocking ${blocking.length}, key blocked-env ${keyBlocked.length})`);

if (!dryRun) {
  await agent(`Ты — агент Quality Gate EqSiteCMS, шаг QG-SYNTH. Не делегируй, ничего не перепроверяй и не запускай команды проверки.
Запиши компактный отчёт (≤150 строк) в \`${report_path}\` по формату «Формат отчёта — lane QG-SYNTH» из \`agents/quality_gate.md\` (найди секцию через grep -n '^## ', читай только её).
Профиль: QG-FULL. Вердикт: ${verdict}. Change: ${change}.
Handoff'ы lanes (JSON):
${JSON.stringify(handoffs)}
Ответь одной строкой: путь к отчёту.`, { label: 'QG-SYNTH report', phase: 'QG-SYNTH: Synthesis' });
}

return {
  verdict,
  report_path,
  lanes: laneResults,
  blocking,
  pre_existing: findings.filter((f) => f.class === 'pre-existing'),
  blocked_env: findings.filter((f) => f.class === 'blocked-env'),
  summary: {
    applicable: applicableLanes.length,
    passed: handoffs.filter((h) => h.status === 'passed').length,
    failed: handoffs.filter((h) => h.status === 'failed').length,
    blocked_env: handoffs.filter((h) => h.status === 'blocked-env').length,
    not_applicable: handoffs.filter((h) => h.status === 'not_applicable').length
  }
};
