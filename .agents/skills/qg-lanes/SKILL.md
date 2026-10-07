---
name: qg-lanes
description: Quality Gate lanes orchestration через workflow для OpenSpec changes
whenToUse: Используй для запуска всех применимых Quality Gate lanes для OpenSpec change с автоматической оркестрацией DAG, параллельным выполнением и структурированным handoff
---

# Quality Gate Lanes Workflow

Этот skill оркеструет выполнение Quality Gate lanes для OpenSpec change через `workflow` инструмент с автоматическим управлением зависимостями (DAG), параллельным выполнением и структурированными handoff'ами.

## Применение

Используй этот skill когда:
- Нужно выполнить полную проверку Quality Gate для OpenSpec change
- Требуется запустить несколько lanes с учётом их зависимостей
- Необходимо собрать структурированные handoff'ы от всех lanes
- Нужен финальный вердикт QG-SYNTH (APPROVED/REWORK/BLOCKED)

## Протокол использования

### 1. Определение применимых lanes

Для каждого change определи применимые lanes на основе diff:
- **QG-ENV**: если есть изменения в Docker, docker-compose, Makefile, scripts/stackctl, .env.template
- **QG-BE**: если есть изменения в services/backend, services/*-service (Python код)
- **QG-FE-AUTO**: если есть изменения в services/frontend (TypeScript/Vue)
- **QG-FE-MANUAL**: если есть UI изменения, требующие визуальной проверки
- **QG-LIVE**: если есть изменения API эндпоинтов или runtime поведения
- **QG-CONTRACTS**: всегда применим (проверка соответствия specs/tasks)

Создай объект `applicable_lanes`:
```javascript
{
  "QG-ENV": false,
  "QG-BE": false,
  "QG-FE-AUTO": false,
  "QG-FE-MANUAL": false,
  "QG-LIVE": false,
  "QG-CONTRACTS": true  // всегда для финального review
}
```

### 2. Определение contextFiles для lanes

Для каждого применимого lane укажи, какие файлы нужно прочитать:
```javascript
{
  "QG-CONTRACTS": [
    "openspec/changes/<change>/proposal.md",
    "openspec/changes/<change>/design.md", 
    "openspec/changes/<change>/specs/*/spec.md",
    "openspec/changes/<change>/tasks.md",
    "handoffs всех execution units"
  ],
  "QG-BE": [
    "services/backend/.../измененные файлы",
    "openspec/changes/<change>/specs/*/spec.md"
  ]
  // и т.д.
}
```

### 3. Подготовка schemas

Прочитай `handoff.schema.json` и создай объект schemas:
```javascript
const handoffSchema = read('.agents/skills/qg-lanes/handoff.schema.json');
const schemas = {
  lane: JSON.parse(handoffSchema),
  synth: JSON.parse(handoffSchema)
};
```

### 4. Запуск workflow

Прочитай workflow скрипт и запусти его:

```javascript
const workflowScript = read('.agents/skills/qg-lanes/lanes.workflow.js');

const result = workflow({
  script: workflowScript,
  meta: {
    name: 'qg-lanes',
    description: 'Quality Gate lanes orchestration для OpenSpec change'
  },
  args: {
    change: '<change-id>',
    applicable_lanes: { /* объект из шага 1 */ },
    contextFiles: { /* объект из шага 2 */ },
    report_path: 'docs/reports/<change-id>-qg-review.md',
    schemas: schemas,
    dryRun: false
  }
});
```

### 5. Обработка результата

Результат workflow содержит:
- `verdict`: "APPROVED" | "REWORK" | "BLOCKED"
- `lanes`: объект с handoff'ами всех lanes
- `summary`: статистика выполнения

## Fallback на delegate_quality_gate

Если workflow недоступен или lane вернул null дважды, используй прямое делегирование.
