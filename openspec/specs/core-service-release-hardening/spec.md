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

### Requirement: Backend ingress поддерживает фотографии размером не менее 10 МБ
Backend Helm chart SHALL задавать `nginx.ingress.kubernetes.io/proxy-body-size` через явное values-поле с default `20m`, чтобы request с файлом 10 МБ и multipart overhead проходил ingress. Значение MUST быть overrideable без изменения template и MUST применяться только к backend ingress.

#### Scenario: Default chart render содержит лимит
- **WHEN** выполняется `helm template` backend chart с default values
- **THEN** ingress содержит annotation `nginx.ingress.kubernetes.io/proxy-body-size: "20m"`

#### Scenario: Значение можно переопределить
- **WHEN** chart рендерится с другим допустимым body-size value
- **THEN** annotation содержит override value без изменения остальных ingress routes/TLS

#### Scenario: Файл 10 МБ проходит ingress
- **WHEN** controlled runtime evidence отправляет валидный multipart request размером 10 МБ через backend ingress с annotation `20m`
- **THEN** nginx не возвращает `413`; production/deployed authentication и повторный production API test для acceptance не требуются

#### Scenario: Запрос сверх настроенного лимита ограничен ingress
- **WHEN** multipart request превышает настроенный body-size
- **THEN** ingress может вернуть `413`, не ослабляя лимиты других сервисов

#### Scenario: Production API исключён из acceptance
- **WHEN** Quality Gate оценивает ingress change
- **THEN** Helm lint/render и уже полученное controlled runtime ingress evidence являются достаточными, а deployed/production endpoint calls и production auth MUST NOT быть обязательными
