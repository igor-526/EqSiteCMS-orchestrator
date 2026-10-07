// Quality Gate lanes workflow для EqSiteCMS OpenSpec changes
// Выполняет применимые lanes в порядке DAG, собирает handoff'ы и синтезирует финальный отчёт

const {
  change,
  applicable_lanes = {},
  contextFiles = {},
  report_path,
  dryRun = false,
  only = null,
  schemas
} = args;

if (!change) {
  throw new Error('args.change is required');
}

if (!schemas || !schemas.lane || !schemas.synth) {
  throw new Error('args.schemas must contain lane and synth schemas');
}

// Определение DAG уровней Quality Gate
const DAG = [
  // Level 1: независимые проверки инфраструктуры и кода
  ['QG-ENV', 'QG-BE', 'QG-FE-AUTO'],
  // Level 2: manual QA и live verification (зависят от Level 1)
  ['QG-FE-MANUAL', 'QG-LIVE'],
  // Level 3: контрактная проверка (зависит от всех предыдущих)
  ['QG-CONTRACTS'],
  // Level 4: финальный синтез (зависит от QG-CONTRACTS)
  ['QG-SYNTH']
];

// Фильтрация применимых lanes
const applicableLanes = Object.keys(applicable_lanes).filter(
  lane => applicable_lanes[lane] === true
);

log(`Change: ${change}`);
log(`Applicable lanes: ${applicableLanes.join(', ')}`);
if (only) {
  log(`Retry only: ${only.join(', ')}`);
}
if (dryRun) {
  log(`DRY RUN mode${dryRun.fail ? ` (simulating failures: ${dryRun.fail.join(', ')})` : ''}`);
}

// Хранилище результатов lanes
const laneResults = {};

// Создание prompt для lane
function createLanePrompt(laneId) {
  const context = contextFiles[laneId] || [];
  
  // Преамбула назначения роли
  const preamble = `Тебе назначена роль **Quality Gate** проекта EqSiteCMS, lane **${laneId}**.

**Определение роли** (из AGENTS.md):
- Если тебе назначена профильная роль — работай по \`agents/<role>.md\`.
- Твоя роль — Quality Gate, lane ${laneId}.

**Инструкция:**
1. Прочитай \`agents/quality_gate.md\` → секцию **${laneId}**.
2. Прочитай указанные \`contextFiles\`: ${context.length > 0 ? context.join(', ') : 'нет дополнительных файлов'}.
3. Выполни проверки lane ${laneId} согласно секции в \`agents/quality_gate.md\`.
4. **НЕ задавай вопросов пользователю.**
5. **НЕ делегируй задачи другим агентам.**
6. Верни результат **строго** в формате JSON согласно схеме handoff.

**Схема handoff:**
\`\`\`json
${JSON.stringify(schemas.lane, null, 2)}
\`\`\`

**Обязательные поля:**
- \`lane\`: "${laneId}"
- \`status\`: "passed" | "failed" | "blocked" | "not_applicable"
- \`findings\`: массив findings (если есть проблемы)
- \`commands\`: массив выполненных команд проверки
- \`evidence\`: массив путей к evidence файлам
- \`notes\`: дополнительные заметки

Change ID: **${change}**`;

  return preamble;
}

// Dry run заглушка
function createDryRunResponse(laneId) {
  const shouldFail = dryRun.fail && dryRun.fail.includes(laneId);
  
  return {
    lane: laneId,
    status: shouldFail ? 'failed' : 'passed',
    findings: shouldFail ? [{
      severity: 'critical',
      owner_profile: 'Quality Gate',
      summary: `DRY RUN simulated failure for ${laneId}`
    }] : [],
    commands: [{
      cmd: 'dry-run',
      result: shouldFail ? 'simulated failure' : 'simulated success'
    }],
    evidence: [],
    notes: `DRY RUN for ${laneId}`
  };
}

// Проверка зависимостей lane
function checkDependencies(laneId, level) {
  // Проверяем все предыдущие уровни
  for (let i = 0; i < level; i++) {
    for (const depLane of DAG[i]) {
      const result = laneResults[depLane];
      
      // Если lane не применим — пропускаем
      if (!applicableLanes.includes(depLane)) {
        continue;
      }
      
      // Если зависимость failed или blocked — блокируем текущий lane
      if (result && (result.status === 'failed' || result.status === 'blocked')) {
        return {
          blocked: true,
          reason: `Dependency ${depLane} ${result.status}`
        };
      }
    }
  }
  
  return { blocked: false };
}

// Выполнение lanes по уровням DAG
for (let level = 0; level < DAG.length; level++) {
  const levelLanes = DAG[level];
  phase(`Level ${level + 1}: ${levelLanes.join(', ')}`);
  
  const tasks = levelLanes.map(laneId => async () => {
    // Пропускаем неприменимые lanes
    if (!applicableLanes.includes(laneId)) {
      log(`${laneId}: not applicable, skipping`);
      laneResults[laneId] = {
        lane: laneId,
        status: 'not_applicable',
        findings: [],
        commands: [],
        evidence: [],
        notes: `Lane ${laneId} is not applicable for change ${change}`
      };
      return laneResults[laneId];
    }
    
    // Фильтр retry: выполняем только указанные lanes
    if (only && !only.includes(laneId)) {
      log(`${laneId}: skipping (not in retry list)`);
      return laneResults[laneId] || null;
    }
    
    // Проверка зависимостей
    const depCheck = checkDependencies(laneId, level);
    if (depCheck.blocked) {
      log(`${laneId}: blocked due to ${depCheck.reason}`);
      laneResults[laneId] = {
        lane: laneId,
        status: 'blocked',
        findings: [],
        commands: [],
        evidence: [],
        notes: `Blocked: ${depCheck.reason}`
      };
      return laneResults[laneId];
    }
    
    log(`${laneId}: executing...`);
    
    // Dry run mode
    if (dryRun) {
      const dryResult = createDryRunResponse(laneId);
      laneResults[laneId] = dryResult;
      log(`${laneId}: dry run completed (${dryResult.status})`);
      return dryResult;
    }
    
    // Реальное выполнение lane
    const prompt = createLanePrompt(laneId);
    const result = await agent(prompt, {
      label: laneId,
      schema: schemas.lane
    });
    
    if (!result) {
      log(`${laneId}: agent returned null (invalid response or error)`);
      laneResults[laneId] = {
        lane: laneId,
        status: 'failed',
        findings: [{
          severity: 'critical',
          owner_profile: 'Quality Gate',
          summary: `${laneId} agent returned invalid response or encountered an error`
        }],
        commands: [],
        evidence: [],
        notes: 'Agent execution failed'
      };
      return laneResults[laneId];
    }
    
    laneResults[laneId] = result;
    log(`${laneId}: completed with status ${result.status}`);
    return result;
  });
  
  // Выполняем lanes уровня параллельно
  await parallel(tasks);
}

// QG-SYNTH: синтез финального отчёта
phase('QG-SYNTH: Synthesis');

const allHandoffs = Object.values(laneResults).filter(Boolean);
const failedLanes = allHandoffs.filter(h => h.status === 'failed');
const blockedLanes = allHandoffs.filter(h => h.status === 'blocked');
const passedLanes = allHandoffs.filter(h => h.status === 'passed');

let verdict;
if (blockedLanes.length > 0) {
  verdict = 'BLOCKED';
} else if (failedLanes.length > 0) {
  verdict = 'REWORK';
} else if (passedLanes.length === applicableLanes.length) {
  verdict = 'APPROVED';
} else {
  verdict = 'BLOCKED'; // Некоторые lanes не выполнились
}

log(`Synthesis: ${passedLanes.length} passed, ${failedLanes.length} failed, ${blockedLanes.length} blocked`);
log(`Final verdict: ${verdict}`);

const synthResult = {
  lane: 'QG-SYNTH',
  status: verdict === 'APPROVED' ? 'passed' : 'failed',
  verdict,
  report_path,
  findings: allHandoffs.flatMap(h => h.findings || []),
  commands: [],
  evidence: allHandoffs.flatMap(h => h.evidence || []),
  notes: `Synthesized from ${allHandoffs.length} lane handoffs. Verdict: ${verdict}.`
};

laneResults['QG-SYNTH'] = synthResult;

// Возвращаем все handoff'ы для Router
return {
  verdict,
  report_path,
  lanes: laneResults,
  summary: {
    total: applicableLanes.length,
    passed: passedLanes.length,
    failed: failedLanes.length,
    blocked: blockedLanes.length,
    not_applicable: allHandoffs.filter(h => h.status === 'not_applicable').length
  }
};
