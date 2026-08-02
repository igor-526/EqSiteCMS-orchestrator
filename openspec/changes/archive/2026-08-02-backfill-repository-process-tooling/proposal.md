## Why

Исторические задачи `001`, `005`, `008`, `021`, `022` и `023` сформировали агентный workflow, quality tooling, offline import и правила репозиторных артефактов, но их подтверждённые контракты ещё не представлены capability-oriented OpenSpec-спецификацией. Backfill нужен для evidence-based трассировки: реализованное поведение фиксируется нормативно, а неподтверждённые части остаются явными gaps.

## What Changes

- Добавляется capability `repository-process-tooling` для подтверждённых repository process и offline tooling контрактов.
- Фиксируются Router/profile-agent границы, обязательные проверки качества, CMS/consumer boundary, нумерация исторических артефактов и OpenSpec lifecycle только в объёме repository evidence.
- Подтверждённые артефакты legacy Joomla import описываются как offline pipeline без утверждения о применении к БД.
- Сохраняются gaps `G-005`, `G-021` и `G-023`; намерения task/legacy plan не считаются доказательством реализации.
- Runtime API, auth behavior, схема БД и сервисный код не изменяются; access matrix неприменима.

## Capabilities

### New Capabilities

- `repository-process-tooling`: Evidence-based контракт агентного workflow, quality tooling, offline import, нумерованных repository artifacts и OpenSpec lifecycle.

### Modified Capabilities

Отсутствуют.

## Impact

Change создаёт только документационные OpenSpec-артефакты в `openspec/changes/backfill-repository-process-tooling/`. Источниками evidence служат `agents/*.md`, `AGENTS.md`, `CLAUDE.md`, `openspec/config.yaml`, исторические reports и существующие offline import artifacts. `services/backend`, `services/frontend`, `services/site-ad`, runtime endpoints, auth и БД не затрагиваются.
