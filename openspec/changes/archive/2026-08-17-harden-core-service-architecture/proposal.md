## Why

Аудит задачи 045 доказал, что основной backend допускает анонимные email-mutation, а заявленный release gate не воспроизводит типизацию, messaging/Celery delivery и полный межсервисный запуск. До релиза необходимо закрыть access/network boundary, устранить подтверждённые дефекты четырёх сервисов и закрепить единый non-mutating Quality Gate по утверждённым контрактам.

## What Changes

- **BREAKING** Защитить `POST /api/emails`, `PATCH /api/emails` и `DELETE /api/emails/{user_id}` как owner-only Protected Write без privileged override: anonymous `401`, foreign owner `403` до lookup/downstream, owner missing `404`, любой invalid/malformed request `400`.
- Сохранить `POST /api/emails/send-confirmation` и `PATCH /api/emails/confirm` публичными write-исключениями confirmation flow; обеспечить идемпотентный same-email create с `201`, тем же `EmailResponse` и сохранением `confirmed/approved`, а `409` — только для другого email.
- Сначала обеспечить private-network boundary email/notification HTTP API, затем удалить неутверждённую peer credential; service key оставить только для направления microservice → main backend `/api/service/...`.
- Зафиксировать `X-Equestrian-Service-Key` как несекретный обязательный tenant selector соответствующих Public Read GET; missing/invalid selector возвращает `401` и не является user authentication.
- Устранить backend mypy/Ruff/format defects и полный typed drift tests; исправить basedpyright email-service и notification-service, не удаляя basedpyright из gate.
- Добавить канонические AsyncAPI-контракты, contract tests и real JetStream acceptance для backend → notification → email без обязательного объединения клиентов или изменения topology.
- Исправить Redis/Celery orchestration и real integration evidence; readiness worker определяется только адресным `celery inspect ping` после healthy Redis, отдельно от queue/canary и integration tests.
- Сделать CMS frontend typecheck детерминированным, перевести ESLint `warn → error` через pilot и feature rollout, мигрировать затронутый код на `src/lib/apiStatus.ts`, декомпозировать подтверждённые hotspots по behavior.
- Создать полный non-mutating root gate, deterministic builds, controlled recreate, migrations/readiness/logs/rollback; синхронизировать `SERVICES.md`/README и безопасные config examples.
- Последовательно обновить `AGENTS.md`, Planner/Backend/Quality Gate policy и Celery/NATS howto под утверждённые endpoint, tenant-selector, private-network и readiness контракты.
- Consumer Frontend (`services/site-ad`, любые `services/site-*`) полностью исключён из реализации, specs, tasks и проверок этого change.

## Capabilities

### New Capabilities

- `core-service-release-hardening`: сквозной контракт исправления typing/lint/config/CMS defects, private service network и воспроизводимого глобального release gate только для утверждённого core scope.

### Modified Capabilities

- `api-access-governance`: расширить обязательную access matrix tenant selector, owner rule, foreign-resource и endpoint-specific validation status.
- `backend-access-platform`: изменить tenant-selector missing/invalid outcomes на `401` и закрепить полную route inventory matrix без изменения имени selector.
- `email-backend-proxy`: заменить credentialed anonymous proxy на owner-only boundary, публичные confirmation exceptions, точные `400/401/403/404/409/201` и idempotency semantics.
- `service-endpoint-auth`: закрепить private-network peer model без peer authentication и разрешить service key только microservice → main backend service endpoints.
- `nats-jetstream-protocols`: сделать AsyncAPI и real-broker delivery/idempotency/E2E matrix обязательным acceptance.
- `celery-redis-protocols`: определить Redis prerequisite, адресный inspect-ping readiness и отдельный blocking integration gate.
- `repository-process-tooling`: заменить неполные мутирующие root checks полным non-mutating core-scope release workflow.
- `cms-horse-ui-quality`: добавить deterministic typecheck, ESLint rollout и behavior-oriented hotspot decomposition для CMS без consumer scope.

## Impact

- Runtime/code/tests: `services/backend`, `services/email-service`, `services/notification-service`, `services/frontend`.
- Contracts/docs/config: `.docker-compose`, root `Makefile`, `SERVICES.md`, `README.md`, `AGENTS.md`, `agents/planner.md`, `agents/backend.md`, `agents/quality_gate.md`, Celery/NATS howto и AsyncAPI каждого messaging-сервиса.
- API: изменяется access/error/idempotency поведение пяти backend email proxy routes и tenant-selector statuses; полная matrix и anonymous/authenticated/foreign-owner tests обязательны.
- Messaging: topology/subjects/payload не меняются без отдельного spec expansion; добавляются канонические specs и evidence.
- БД: schema migration не планируется; реальные PostgreSQL/Redis/NATS/Celery используются в integration/SMOKE gate.
- Вне scope: любые изменения или проверки `services/site-ad` и `services/site-*`.
