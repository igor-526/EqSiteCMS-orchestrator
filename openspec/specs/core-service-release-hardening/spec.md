# Purpose

Закрепить единый воспроизводимый release gate, production-конфигурацию и последовательное обновление policy для core-сервисов EqSiteCMS.

## Requirements

### Requirement: Python quality baseline
Backend SHALL проходить mypy для `src` и `tests`, Ruff lint, format-check, flake8 и pytest без исключения typed tests. Email-service и notification-service SHALL дополнительно проходить declared basedpyright; basedpyright MUST NOT удаляться вместо исправления ошибок.

#### Scenario: Core Python gate
- **WHEN** выполняется единый Quality Gate
- **THEN** backend имеет 0 mypy/Ruff/format errors, email/notification имеют 0 mypy/basedpyright/Ruff/format errors, а unit/integration suites зелёные

### Requirement: Safe production configuration
Production startup MUST fail fast при отсутствующих secrets/critical connection settings; `.env.example` MUST использовать очевидные placeholders. Gate SHALL выполнять secret scan и фиксировать rotation checklist без утверждения, что найденные audit defaults применялись production.

#### Scenario: Production secret отсутствует
- **WHEN** production mode запускается без обязательного JWT/DB/S3/Redis secret
- **THEN** service завершается validation error до обработки traffic

### Requirement: Sequential policy migration
`AGENTS.md`, `agents/planner.md`, `agents/backend.md`, `agents/quality_gate.md`, Celery howto и NATS howto SHALL обновляться одним documentation owner последовательно после утверждения runtime contracts и до общего Quality Gate.

#### Scenario: Agent получает email/access задачу
- **WHEN** Router/Planner/Backend/QG читает обновлённые policy
- **THEN** инструкции однозначно передают tenant selector, owner-only email, invalid `400`, private peer model, basedpyright, JetStream matrix и inspect-ping readiness

### Requirement: Единый Quality Gate и evidence
После всех bounded deliverables один Quality Gate SHALL проверить clean worktrees, specs/tasks, access inventory, unit/integration suites, non-mutating checks, no-cache images, controlled core runtime, live API SMOKE с endpoint timings, CMS e2e/manual QA, network boundary и logs. Finding MUST вернуть весь gate в REWORK до полного повторного прогона.

#### Scenario: Gate успешен
- **WHEN** каждая обязательная стадия имеет воспроизводимое PASS evidence
- **THEN** единый report получает APPROVED и Router может sync delta specs, повторить strict validation и archive
