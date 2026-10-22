---
name: qg-lanes
description: Quality Gate lanes orchestration через workflow для OpenSpec changes профиля QG-FULL
whenToUse: Только для профиля QG-FULL (миграции, NATS/AsyncAPI, UI behavior diff или >2 сервисов с кодом). Для QG-DOCS и QG-LITE не используй — делегируй одного QG-агента через delegate_quality_gate
---

# Quality Gate Lanes Workflow (QG-FULL)

Skill запускает применимые lanes профиля `QG-FULL` через `workflow`: DAG, параллельные уровни, структурированные handoff'ы, вычисленный вердикт и один отчёт.

## Когда НЕ использовать

| Профиль | Как запускать |
|---|---|
| `QG-DOCS` | один `delegate_quality_gate` (фон, continuable) |
| `QG-LITE` | один `delegate_quality_gate` (фон, continuable), агент сам проходит lanes последовательно |
| `QG-FULL` | этот skill |

Профили и классификация findings — `agents/quality_gate.md`.

## Протокол

### 1. Применимые lanes

По path-scoped diff change:

- `QG-ENV` — есть runtime/API/UI diff;
- `QG-BE` — diff в Python-сервисах;
- `QG-FE-AUTO` — diff в `services/frontend` или `services/site-*`;
- `QG-FE-MANUAL` — UI/UX behavior diff;
- `QG-LIVE` — runtime API diff;
- `QG-CONTRACTS` — всегда;
- `QG-FORMAT` — есть diff в коде/Makefile/tooling (scoped: только затронутые сервисы).

### 2. contextFiles и changedPaths

Точечно по lane (секции `design.md`, конкретные `specs/<capability>/spec.md`, handoff'ы units). `changedPaths` — union «Изменённые файлы» из handoff'ов units. `proposal.md` целиком не передавай.

### 3. Запуск

```javascript
// прочитай .agents/skills/qg-lanes/lanes.workflow.js и handoff.schema.json
workflow({
  script: '<содержимое lanes.workflow.js>',
  meta: { name: 'qg-lanes', description: 'Quality Gate QG-FULL для <change>' },
  args: {
    change: '<change-id>',
    applicable_lanes: { 'QG-ENV': true, 'QG-BE': true, 'QG-CONTRACTS': true, 'QG-FORMAT': true /* ... */ },
    contextFiles: { /* lane → [пути/секции] */ },
    changedPaths: [ /* пути от корня */ ],
    report_path: 'docs/reports/<change-id>/synthesis.md',
    schemas: { lane: <handoff.schema.json> },
    dryRun: false
  }
});
```

Workflow — один tool call; Router ждёт его без поллинга.

### 4. Результат

- `verdict`: `APPROVED` | `REWORK` | `BLOCKED` (REWORK — есть `blocking`; BLOCKED — есть `blocked-env` с `key_check`);
- `blocking`, `pre_existing`, `blocked_env` — списки findings;
- отчёт записан в `report_path`.

`pre_existing` и неключевые `blocked_env` не мешают `APPROVED`; Router предлагает по ним задачи в `docs/tasks`. Waiver пользователя Router вносит в отчёт и меняет вердикт на `APPROVED_WITH_WAIVER`.

### 5. Повтор после fix

Workflow-агенты не continuable. После fix запусти workflow с `only: [<затронутые lanes>]` (не все lanes), либо, если затронут один lane, — один `delegate_quality_gate` на этот lane. Не более одного повторного раунда.

## Fallback

Если workflow недоступен или lane вернул невалидный ответ — один `delegate_quality_gate` на затронутые lanes.
