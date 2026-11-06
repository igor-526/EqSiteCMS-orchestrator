# Tasks — 106-107-metrica-cleanup-page-merge

Единственный изменяемый checklist; ownership deliverables Y/M/S/F/Q и DAG/Test matrix/Manual QA — в [design.md](design.md). Актуальные отметки сериализованы по handoff исполнителей и lanes; отметка аудита означает выполненную проверку, не общий PASS. Apply запрещён до отдельного approval, завершения текущей задачи и сверки финала 105. Строка unit — одна сессия; при выходе за бюджет вернуть partial/split. Выполнитель меняет только назначенный slice и отмечает только фактически выполненные tasks сразу после проверки; обновление своих checkbox — единственное общее исключение ownership tasks.md, updates сериализует Router.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths / slice | Зависит от | Verification |
|---|---|---|---|---|---|
| `Y-1a` | Backend | Y | services/yandex-service/src/{models,migration,repositories,core,containers,depends}/**; services/yandex-service/tests/**; services/yandex-service/README.md; storage: Y-1.1–Y-1.2 | approval/завершение текущей задачи/сверка 105 | `cd services/yandex-service && uv run pytest tests -k "lifecycle or cleanup or account or counter" -m "not infrastructure"` |
| `Y-1b` | Backend | Y | services/yandex-service/src/{models,migration,repositories,core,containers,depends}/**; services/yandex-service/tests/**; services/yandex-service/README.md; domain integration: Y-1.3–Y-1.7 | Y-1a | `cd services/yandex-service && uv run pytest tests -k "lifecycle or cleanup or account or counter" -m "not infrastructure"` |
| `Y-2a` | Backend | Y | private DTO/snapshot: Y-2.5 и peer часть Y-2.6; общий ownership Y-2 | Y-1b | targeted DTO/peer tests (выполнено) |
| `Y-2b1` | Backend | Y | foundation AsyncAPI/settings/producer Protocol/repository/relay: Y-2.1, части Y-2.2/3/6/7; выполнен | Y-2a | scoped producer/relay + transaction tests, scoped lint/typecheck (77 passed) |
| `Y-2b2` | Backend | Y | runtime NATS client/publisher/DI/lifespan: остаток Y-2.2/3, producer части Y-2.6/7; services/yandex-service/src/**, tests/**, README.md, .env.example, pyproject.toml, uv.lock; общий ownership Y-2 | Y-2b1 | scoped producer/runtime tests, lint/typecheck, lock/config consistency |
| `Y-2c` | Backend | Y | completed inbox/ledger-prefix: Y-2.4, остаток Y-2.6/7, Y-2.V; общий ownership Y-2 | Y-2b2 | `make -C services/yandex-service lint test test-infra` |
| `M-1a` | Backend | M | services/ya-metrica-service/src/{models,migration,core/entities,core/protocols,repositories}/**; services/ya-metrica-service/tests/**; services/ya-metrica-service/README.md; schema: M-1.1–2 (done) | approval/завершение текущей задачи/сверка 105 | `cd services/ya-metrica-service && uv run pytest tests -k "maintenance or gate or lease" -m "not infrastructure"` |
| `M-1b` | Backend | M | services/ya-metrica-service/src/{models,migration,core/entities,core/protocols,repositories}/**; services/ya-metrica-service/tests/**; services/ya-metrica-service/README.md; repositories: M-1.3–7 | M-1a | `cd services/ya-metrica-service && uv run pytest tests -k "maintenance or gate or lease" -m "not infrastructure"` |
| `M-2a` | Backend | M | admission/lifecycle: M-2.1/2 (done), общий ownership M-2 | M-1 | targeted admission/client/DI, M-2.V выполнен |
| `M-2b` | Backend | M | dispatcher/claim authoritative recheck, queued/retry cancellation: M-2.3/4 и часть M-2.7 (done); общий ownership M-2 | M-2a | targeted dispatcher/claim/cancellation + scoped Ruff/format/typecheck |
| `M-2c1` | Backend | M | deferred replay: M-2.6 (done); общий ownership M-2 | M-2b | targeted replay/admission; runtime выключен |
| `M-2c2a` | Backend | M | running drain и ingestion/reconcile write guards (done); часть M-2.5/7, общий ownership M-2 | M-2c1 | targeted guards/runner/ingestion; PG acceptance blocked |
| `M-2c2b` | Backend | M | retry/reap cancellation, expired/gen0 recovery, factory generation guard (код готов); M-2.7 done, M-2.5 PG acceptance blocked; общий ownership M-2 | M-2c2a | targeted retry/reap/factory/runner/ingestion + scoped checks; workers выключены |
| `M-3a` | Backend | M | bounded cleanup storage (код done, PG acceptance open); общий ownership M-3 | M-2 | targeted cleanup tests, scoped checks |
| `M-3b` | Backend | M | maintenance topology/contracts/lightweight consumers; M-3.1/2 и transport часть M-3.7; services/ya-metrica-service/src/**, tests/**, docs/asyncapi.yaml, README.md, .env.example | M-3a | targeted maintenance/NATS tests, AsyncAPI validation, scoped lint/typecheck |
| `M-3c1` | Backend | M | finalizer/result outbox/relay (done); M-3.5, общий ownership M-3 | M-3b | targeted result recovery tests |
| `M-3c2` | Backend | M | cleanup worker/drain/immediate supersession; M-3.4, worker часть M-3.7, общий ownership M-3 | M-3c1 | targeted worker/drain/preemption tests; PG acceptance отдельно |
| `M-3d` | Backend | M | queues/beat/replay/runtime; M-3.6 и остаток M-3.7, общий ownership M-3 | M-3c2 | scoped runtime/config tests; infra acceptance отдельно |
| `M-4` | Backend | M | services/ya-metrica-service/src/**; services/ya-metrica-service/tests/**; services/ya-metrica-service/README.md | M-3 | `make -C services/ya-metrica-service lint test test-infra` |
| `S-1` | Backend | S | services/seo-service/src/{models,migration,repositories,core/entities,core/protocols}/**; services/seo-service/tests/**; services/seo-service/README.md | approval/завершение текущей задачи/сверка 105 | `cd services/seo-service && uv run pytest tests -k "normaliz or merge or page" -m "not infrastructure"` |
| `S-2a` | Backend | S | request revision/snapshot/locks/canonical UUID: S-2.1/2/6 и request часть S-2.7 (done); общий ownership S-2 services/seo-service/src/{core/services,core/protocols,repositories,containers,depends}/**, tests/**, README.md | S-1 | targeted request/page regressions, scoped checks (выполнено) |
| `S-2b` | Backend | S | bounded scan/mappings/chunk/seal, sequential revision continuation: S-2.3/4/5 и scan часть S-2.7; тот же ownership S-2 | S-2a | `cd services/seo-service && uv run pytest tests -k "normaliz or merge or page" -m "not infrastructure"`; scoped checks и PG fixtures collection (НЕ acceptance) |
| `S-3a` | Backend | S | SEO transport/outbox relay (ownership S) | S-2b | scoped transport checks (done) |
| `S-3b` | Backend | S | services/seo-service/src/**; services/seo-service/tests/**; services/seo-service/README.md; свои tasks | S-3a | targeted result/barrier/finalization regressions, scoped lint/typecheck |
| `S-3c1` | Backend | S | TX/result adapters (done); прежний ownership S-3 | S-3b | scoped adapters/result regressions (185 passed); real infra OPEN |
| `S-3c2a` | Backend | S | bounded tenant dispatch + scan/delete TX composition (done, atomic slice S-3c2); прежний ownership S-3 | S-3c1 | targeted dispatch/storage/peer regressions, scoped static checks; PG fixtures collection НЕ acceptance |
| `S-3c2b` | Backend | S | принятый Router остаток S-3c2: process runner/application DI/startup retry/supervision/readiness, opt-in settings/compose/docs; прежний ownership S-3 | S-3c2a | `make -C services/seo-service lint test test-infra` (full suite один раз); real PG/NATS gates |
| `F-1` | Frontend | F | services/frontend/src/features/seo/{ui,hooks}/**; services/frontend/src/api/yandex.test.ts | approval/завершение текущей задачи/сверка 105 | `cd services/frontend && npm test -- src/features/seo src/api/yandex.test.ts && npm run lint && npm run typecheck` |
| `QG-ENV` | Quality Gate | Q | .qa/106-107-metrica-cleanup-page-merge/QG-ENV/** (evidence; продукт read-only) | Y-2, M-4, S-3, F-1 | `stackctl discovery/ready для поддерживаемых сервисов; штатный service Compose для остальных` |
| `QG-BE-Y` | Quality Gate | Q | .qa/106-107-metrica-cleanup-page-merge/QG-BE-Y/**; services/yandex-service/** (только scoped format после передачи Router, без feature fixes) | QG-ENV | `make -C services/yandex-service lint test test-infra; scoped format в lane по правилам QG` |
| `QG-BE-M` | Quality Gate | Q | .qa/106-107-metrica-cleanup-page-merge/QG-BE-M/**; services/ya-metrica-service/** (только scoped format после передачи Router, без feature fixes) | QG-ENV | `make -C services/ya-metrica-service lint test test-infra; scoped format в lane по правилам QG` |
| `QG-BE-S` | Quality Gate | Q | .qa/106-107-metrica-cleanup-page-merge/QG-BE-S/**; services/seo-service/** (только scoped format после передачи Router, без feature fixes) | QG-ENV | `make -C services/seo-service lint test test-infra; scoped format в lane по правилам QG` |
| `QG-FE-AUTO` | Quality Gate | Q | .qa/106-107-metrica-cleanup-page-merge/QG-FE-AUTO/**; services/frontend/** (только scoped format после передачи Router, без feature fixes) | QG-ENV | `cd services/frontend && npm test && npm run lint && npm run typecheck && npm run build` |
| `QG-CONTRACTS` | Quality Gate | Q | .qa/106-107-metrica-cleanup-page-merge/QG-CONTRACTS/** (evidence; продукт read-only) | QG-ENV | `существующая AsyncAPI validation по трём service файлам + IT-N-03 на реальном JetStream` |
| `QG-LIVE` | Quality Gate | Q | .qa/106-107-metrica-cleanup-page-merge/QG-LIVE/** (evidence; продукт read-only) | QG-BE-Y, QG-BE-M, QG-BE-S, QG-FE-AUTO, QG-CONTRACTS | `SM-D-01..02, SM-N-01..03 через API smoke skill; реальные PostgreSQL/NATS` |
| `QG-FE-MANUAL` | Quality Gate | Q | .qa/106-107-metrica-cleanup-page-merge/QG-FE-MANUAL/** (evidence; продукт read-only) | QG-BE-Y, QG-BE-M, QG-BE-S, QG-FE-AUTO, QG-CONTRACTS | `Manual QA шаги 1–8; scripted Playwright + screenshot/console/network/axe` |
| `QG-SYNTH` | Quality Gate | Q | docs/reports/106-107-metrica-cleanup-page-merge.md; .qa/106-107-metrica-cleanup-page-merge/QG-SYNTH/** | QG-LIVE, QG-FE-MANUAL | `единый отчёт и openspec status/validate --strict` |

### contextFiles по units

Контекст ниже — минимальный pack, а не чтение всех файлов сервиса. Номера разделов design соответствуют Decisions. Пути внутри текущего change относительные; сервисные пути — от корня монорепозитория. Если указанный новый файл ещё не создан, читать его контракт в design/specs, не искать чужую реализацию. После каждого unit следующий получает его handoff.

| Unit | contextFiles |
|---|---|
| `Y-1a`, `Y-1b` | design.md §1–2, §Migration Plan; specs/yandex-metrica-gateway/spec.md; specs/yandex-oauth-accounts/spec.md; services/yandex-service/src/models/yandex_metrica_counters.py; services/yandex-service/src/core/services/yandex_metrica_counter_service.py; services/yandex-service/src/core/services/yandex_accounts_service.py |
| `Y-2a`, `Y-2b1`, `Y-2b2`, `Y-2c` | design.md §2–3 и Test matrix; specs/metrica-maintenance-protocol/spec.md; specs/yandex-metrica-gateway/spec.md; services/yandex-service/src/api/yandex_connections.py; services/yandex-service/src/core/schemas/api/yandex_metrica_counters.py |
| `M-1a`, `M-1b` | design.md §1–4; specs/metrica-parse-queue/spec.md; specs/metrica-maintenance-protocol/spec.md; services/ya-metrica-service/src/models/metrica_parse.py; services/ya-metrica-service/src/models/metrica_stats.py; services/ya-metrica-service/src/repositories/metrica_parse_task_repository.py |
| `M-2a`, `M-2b`, `M-2c1`, `M-2c2a`, `M-2c2b` | design.md §1–2; specs/metrica-parse-queue/spec.md; specs/metrica-parse-command-consumer/spec.md; services/ya-metrica-service/src/core/services/parse_enqueue_service.py; services/ya-metrica-service/src/core/services/parse_task_runner.py; services/ya-metrica-service/src/core/services/stat_ingestion_service.py; services/ya-metrica-service/src/core/services/parse_dispatch_service.py |
| `M-3a`, `M-3c1`, `M-3c2`, `M-3d` | design.md §3–4; specs/metrica-maintenance-protocol/spec.md; services/ya-metrica-service/src/clients/nats/consumers/parse_run.py; services/ya-metrica-service/src/workers/celery_app.py; services/ya-metrica-service/src/repositories/metrica_stats_repository.py |
| `M-3b` | design.md §3–4 contract/consumer sections, UT-D-03, UT-N-02/04, IT-N-03 transport; specs/metrica-maintenance-protocol/spec.md; services/ya-metrica-service/src/clients/nats/{client,consumers/parse_run}.py; maintenance entities/Protocol/storage repository; settings и DI |
| `M-4` | design.md §3–5; specs/metrica-maintenance-protocol/spec.md; services/ya-metrica-service/src/core/services/stat_ingestion_service.py; services/ya-metrica-service/src/repositories/metrica_stats_repository.py |
| `S-1` | design.md §5/§Migration Plan; specs/seo-normalization/spec.md; specs/metrica-maintenance-protocol/spec.md; services/seo-service/src/models/pages.py; services/seo-service/src/repositories/page_repository.py; services/seo-service/src/migration/versions/ (только текущий head) |
| `S-2a`, `S-2b` | tasks.md checkpoint S-2a; design.md §5 и §3 chunk/seal, UT-N-01/02/04/05; specs/metrica-maintenance-protocol/spec.md только chunk contracts; specs/seo-normalization/spec.md; specs/seo-page-normalization-settings/spec.md; services/seo-service/src/core/services/page_service.py; services/seo-service/src/core/services/page_normalizer.py; services/seo-service/src/core/services/blacklisted_query_param_service.py; services/seo-service/src/core/services/blacklisted_hash_service.py; services/seo-service/src/models/pages.py |
| `S-3` | design.md §3/§5; specs/metrica-maintenance-protocol/spec.md; specs/seo-page-normalization-settings/spec.md; specs/seo-entity-resolution/spec.md; services/seo-service/src/clients/nats/client.py; services/seo-service/src/clients/nats/publisher.py; services/seo-service/src/scheduler/main.py |
| `F-1` | design.md §6 и Frontend/Manual QA; specs/cms-seo-yandex-ui/spec.md; services/frontend/src/features/seo/ui/ConfirmActionModal.tsx; services/frontend/src/features/seo/ui/MetricaConnectionCard.tsx; services/frontend/src/features/seo/ui/YandexAccountStep.tsx; services/frontend/src/features/seo/hooks/useMetricaConnection.ts; services/frontend/src/features/seo/hooks/useYandexAccounts.ts |
| `QG-ENV` | design.md Migration Plan и PostgreSQL для smoke-тестов; SERVICES.md только relevant sections; agents/howto/browser-qa-protocol.md (предусловия); service compose трёх Python-сервисов |
| `QG-BE-Y` | design.md Test matrix; tasks.md Y-2; services/yandex-service/docs/asyncapi.yaml; services/yandex-service/README.md; только изменённые файлы сервиса |
| `QG-BE-M` | design.md Test matrix; tasks.md M-4; services/ya-metrica-service/docs/asyncapi.yaml; services/ya-metrica-service/README.md; только изменённые файлы сервиса |
| `QG-BE-S` | design.md Test matrix; tasks.md S-3; services/seo-service/docs/asyncapi.yaml; services/seo-service/README.md; только изменённые файлы сервиса |
| `QG-FE-AUTO` | design.md Frontend и Manual QA; specs/cms-seo-yandex-ui/spec.md; tasks.md F-1; только изменённые frontend файлы |
| `QG-CONTRACTS` | design.md §3 и access matrix; specs/metrica-maintenance-protocol/spec.md; services/{yandex-service,ya-metrica-service,seo-service}/docs/asyncapi.yaml; agents/howto/nats-jetstream-protocols.md |
| `QG-LIVE` | design.md Test matrix/Access matrix/PostgreSQL; handoff QG-ENV и backend lanes; .agents/skills/api-smoke-test/SKILL.md (актуальная копия после 105) |
| `QG-FE-MANUAL` | design.md Manual QA steps; handoff QG-FE-AUTO; agents/howto/browser-qa-protocol.md; specs/cms-seo-yandex-ui/spec.md |
| `QG-SYNTH` | design.md Test matrix/Execution units; handoff всех QG lanes; tasks.md; .qa/106-107-metrica-cleanup-page-merge/<lane>/ evidence |

## 1. Y-1 — схема и атомарный lifecycle (профиль: Backend)

Router-approved split без изменения scope: **Y-1a** — storage (Y-1.1–Y-1.2, выполнен); **Y-1b** — domain integration (Y-1.3–Y-1.7), зависит от Y-1a. Y-1.V выполнен в Y-1a и повторяется scoped в Y-1b; реальный PostgreSQL остаётся отдельным инфраструктурным gate. Y-1b: targeted regression 201 passed; scoped ruff/format/flake8/mypy PASS. IT-D-01 fixtures добавлены, но реальный запуск BLOCKED: нет выделенной TEST_DATABASE_URL (10 setup errors, не PASS). Evidence: `.qa/106-107-metrica-cleanup-page-merge/Y-1b/`.

**Deliverable:** Y · **Specs:** yandex-metrica-gateway, yandex-oauth-accounts · **Пути:** services/yandex-service/src/{models,migration,repositories,core,containers,depends}/**; services/yandex-service/tests/**; services/yandex-service/README.md · **Зависит от:** approval/завершение текущей задачи/сверка 105

- [x] Y-1.1 Сверить итоговый 105 и Alembic head; при изменении matrix остановиться на пересмотре плана, зафиксировать совместимый context в handoff
- [x] Y-1.2 Добавить additive lifecycle/cleanup ledger/outbox/inbox и constraints; metadata/миграция согласованы, downgrade не удаляет активные операции без явной проверки
- [x] Y-1.3 Реализовать tenant-lock repositories и монотонные generation/seq; concurrent DELETE проверяется UT-D-04
- [x] Y-1.4 Встроить атомарный delete binding + cleanup intention, no-op повтор; проверка UT-D-01..02
- [x] Y-1.5 Встроить account delete со сбором FK-контекста и общей cleanup операцией; несвязанный account не чистит, проверка UT-D-01
- [x] Y-1.6 Сохранить watermark при rebind и задать Protocol/DI без SQL в API; проверка UT-D-04
- [x] Y-1.7 Добавить targeted unit/schema tests UT-D-01..02, UT-D-04 и PostgreSQL fixtures IT-D-01; обновить README модели/rollback, проверить отсутствие секретов
- [x] Y-1.V Выполнить `cd services/yandex-service && uv run pytest tests -k "lifecycle or cleanup or account or counter" -m "not infrastructure"`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit

## 2. Y-2 — транспорт очистки и peer DTO (профиль: Backend)

Router-approved split без изменения scope: **Y-2a** DTO (выполнен) → **Y-2b1** foundation (выполнен) → **Y-2b2** runtime integration → **Y-2c** completed inbox/ledger-prefix и финальные gates. Общий ownership Y сохранён.

Checkpoint Y-2a partial (circuit breaker): выполнен атомарный private DTO/snapshot slice Y-2.5; binding и lifecycle читаются одним SQL statement без GET-мутаций. Парные peer tests и PG snapshot fixture добавлены (часть Y-2.6, checkbox не закрыт). Targeted 106 passed; scoped ruff/format/flake8/mypy PASS. Полные gates запускались: lint/test блокированы `tests/api/test_transactions.py` (регрессия обязательного DI из Y-1b, исправляется в Y-2b; не передан lifecycle в AccountsService: mypy + 5 failed; остальные 730 passed, 2 xfailed), test-infra — 11 setup errors без выделенной TEST_DATABASE_URL, 8 skipped не считаются PASS. Evidence: `.qa/106-107-metrica-cleanup-page-merge/Y-2/`. Предложение Router: Y-2a DTO (этот slice) → Y-2b transport/AsyncAPI/settings/outbox relay → Y-2c completed inbox/prefix и финальные transport/PG gates. Общий ownership Y сохранён; Y-2.V не закрыт.

Checkpoint Y-2b **partial**: AsyncAPI обоих направлений валиден (`@asyncapi/cli@6.0.2`, 0 errors, 6 governance warnings); подготовлены NatsSettings и typed outbox claim/lease/fenced mark/retry + periodic relay через publisher Protocol. Runtime **НЕ включён**: отсутствует `nats-py`, а `services/yandex-service/{pyproject.toml,uv.lock}` вне назначенных edit paths. Предложение split: Y-2b → Y-2b1 (этот foundation) + Y-2b2 (NATS dependency/client lifecycle/owner setup/startup retry/PubAck adapter/DI activation); общий ownership Y, для Y-2b2 требуется явно добавить manifest paths. Y-2.2/3/6/7 не закрыты. Причинность transaction fixture доказана: обязательный lifecycle DI добавлен Y-1b; fixture минимально исправлена, это не pre-existing дефект. Targeted **77 passed**, включая все 17 transaction tests; scoped ruff/format/flake8/mypy PASS. Реальные PG/NATS и полные gates не запускались; consumer результата — только Y-2c. Evidence: `.qa/106-107-metrica-cleanup-page-merge/Y-2b/`.

Router принял split **Y-2b → Y-2b1 foundation (done) + Y-2b2 runtime integration** и расширил ownership Y-2 на `services/yandex-service/pyproject.toml` и `services/yandex-service/uv.lock` для утверждённой зависимости `nats-py` (не новый scope). Исторический blocker manifest из checkpoint Y-2b1 снят. Producer части Y-2.6/7 выполняются в Y-2b2; смешанные checkbox остаются открыты до Y-2c.

Checkpoint Y-2b2: runtime producer включён; `nats-py==2.16.0` в штатном uv lock, singleton client/publisher/repository и lifespan-scoped relay через `containers.container`. Owner создаёт/сверяет только YANDEX_LIFECYCLE; несовместимый config fail fast, connect/setup bounded retry, ongoing reconnect без cap; graceful cancel relay → drain/close NATS → dispose DB. Y-2.2/3 закрыты по реализации и UT-D-03; Y-2.6/7 остаются открыты для consumer/PG/full gates. Scoped **63 passed**, ruff/format/flake8/mypy PASS; `uv lock --check`, `uv pip check`, compose config `--no-interpolate --no-env-resolution --quiet` PASS (env не выводился). Real-broker producer gate **BLOCKED/FAIL**: 1 failed из-за отсутствия выделенного `TEST_NATS_URL`, не skip/PASS. Real-PG lease/concurrency gate остаётся открытым из Y-2b1 (нет выделенного TEST_DATABASE_URL); полный suite/test-infra — только Y-2c. Evidence: `.qa/106-107-metrica-cleanup-page-merge/Y-2b2/`. Consumer completed/inbox/ledger-prefix не реализован, остаётся Y-2c; topology/settings существующей матрицы HTTP не менялись.

**Deliverable:** Y · **Specs:** metrica-maintenance-protocol, yandex-metrica-gateway, yandex-oauth-accounts · **Пути:** services/yandex-service/src/**; services/yandex-service/docs/asyncapi.yaml; services/yandex-service/tests/**; services/yandex-service/README.md; services/yandex-service/.env.example; services/yandex-service/pyproject.toml; services/yandex-service/uv.lock; .docker-compose/docker-compose.yandex.yml · **Зависит от:** Y-1

Checkpoint Y-2c **partial (инфраструктурный gate blocked)**: completed durable включён в DI/lifespan, foreign stream только lookup (NotFound retry; incompatible/BadRequest fail fast), consumer ALL/explicit/30s/-1. Строгие envelope/header/UUIDv5 и UTC validation; ACK после commit inbox+ledger+непрерывный prefix; canonical typed payload SHA-256, duplicate идемпотентен, hash/tenant/operation/seq conflict TERM. DB/commit ошибка NAK 1..60s без cap, эскалация после 5; обработка до 25s; consumer stop/unsubscribe → relay stop → NATS drain/close → DB dispose. Y-2.4/6/7 закрыты по реализации и тестовым fixtures; Y-2.V открыт до успешного infrastructure gate. `make -C services/yandex-service lint test test-infra`: lint PASS; **808 passed, 2 xfailed**, 23 deselected; infra **2 failed, 13 errors, 8 skipped** из-за отсутствия выделенных TEST_NATS_URL/TEST_DATABASE_URL (не PASS). Scoped result/transport/peer/access/lifespan: **157 passed**; scoped ruff check/format PASS, service compose config без env и OpenSpec strict PASS. Реальные PG prefix/inbox rollback/races и real-broker consumer ACK/NAK/TERM/restart fixtures добавлены, но НЕ проверены на инфраструктуре. Evidence: `.qa/106-107-metrica-cleanup-page-merge/Y-2c/`. Остаток — предоставить выделенные test URLs и повторить Y-2.V; рабочая БД/volumes не использовались, M/S/F не затронуты.

- [x] Y-2.1 Описать producer cleanup и consumer result AsyncAPI; сверить envelope/stream/durable со спецификацией
- [x] Y-2.2 Добавить NATS settings/client lifecycle и owner stream setup; startup retry проверяется UT-D-03
- [x] Y-2.3 Реализовать outbox claim/publish/PubAck mark и периодический relay в сервисном процессе без новой Redis DB; рестарт доставляет pending, UT-D-03
- [x] Y-2.4 Обрабатывать cleanup completed через inbox и ledger-prefix seq; поздние/неизвестные результаты не снимают новый barrier, UT-D-04
- [x] Y-2.5 Расширить private GET binding DTO lifecycle-полями при counter=null; gateway DTO совместим и без секретов, UT-D-02/07
- [x] Y-2.6 Добавить парные peer access/response tests и инфраструктурные IT-D-01/transport tests; обеспечить fail при отсутствии обязательной инфраструктуры
- [x] Y-2.7 Документировать settings, streams, relay запуск и dev/production boundary в README/.env.example; сервисную compose менять только если нужен relay процесс; проверить service config без вывода env
- [x] Y-2.V Выполнить `make -C services/yandex-service lint test test-infra`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit

## 3. M-1 — схема арбитража и repositories (профиль: Backend)

**Deliverable:** M · **Specs:** metrica-parse-queue, metrica-maintenance-protocol · **Пути:** services/ya-metrica-service/src/{models,migration,core/entities,core/protocols,repositories}/**; services/ya-metrica-service/tests/**; services/ya-metrica-service/README.md · **Зависит от:** approval/завершение текущей задачи/сверка 105

- [x] M-1.1 Добавить tenant gate, maintenance operation/chunk, pending parse intent, inbox/outbox таблицы и готовые индексы; проверить metadata/Alembic consistency
- [x] M-1.2 Расширить parse статусы cancelled и generation/observed cleanup seq с совместимым backfill; старые tasks не теряют аудит
- [x] M-1.3 Реализовать короткие tenant/account locks с единым порядком; UT-D-06 проверяет отсутствие глобальной блокировки
- [x] M-1.4 Реализовать durable claims/leases/fencing и priority selector cleanup>merge>parse; UT-D-05..06
- [x] M-1.5 Реализовать idempotent chunk/inbox save, payload hash и operation state transitions; UT-N-04
- [x] M-1.6 Реализовать pending intent admission/dedup без преждевременной декомпозиции auto-окна; UT-D-04..06
- [x] M-1.7 Добавить unit/repository fixtures для IT-D-02/IT-N-02, описать состояния и миграционные ограничения README; targeted тесты проходят
- [x] M-1.V Выполнить `cd services/ya-metrica-service && uv run pytest tests -k "maintenance or gate or lease" -m "not infrastructure"`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit

### Checkpoint M-1b1 arbitration (done checkpoint, принятый split)

Принятый Router split: M-1 → M-1a schema (done) + M-1b repositories.
В этой сессии выполнен атомарный arbitration slice: M-1.3, часть M-1.4
(maintenance selector/claims/checkpoint CAS), часть M-1.7 (unit + real-PG fixtures,
README). M-1.4/5/6/7 остаются unchecked: полный repository/domain slice
превышает бюджет одного invocation; service/worker integration не бралась.

Принятый Router split: **M-1b → M-1b1 arbitration (этот checkpoint) + M-1b2
idempotent operation/chunk/inbox transitions и pending-intent admission/dedup**.
Ownership общий M-1, последовательное выполнение; M-1b2 зависит от M-1b1;
M-2 не начинать до сдачи M-1b2 и проверки interfaces. Остаток M-1.4 (включая
state transitions), M-1.5/6/7 и real-PG acceptance — M-1b2; интеграция parse
claim/ingestion/retry/reap остаётся M-2, outbox/worker transitions — M-3/M-4.

M-1b verification: targeted suite 48 passed, 2 skipped (не PG acceptance);
scoped Ruff/typecheck; PostgreSQL BLOCKED — нет TEST_DATABASE_URL (8 setup errors,
не skipped PASS). Evidence `.qa/106-107-metrica-cleanup-page-merge/M-1b/`.
M-1.V ранее отмечен M-1a; повтор команды M-1b не снимает PG blocker.

### Checkpoint M-1b2a (storage done; исторический handoff M-1b2 partial)

Выполнен M-1.5: `MaintenanceStorageProtocol/Repository`, неизменяемая operation
identity, inbox tenant/operation/hash dedup, chunks hash conflict, seal-before-parts,
collecting→waiting, fenced chunk checkpoint/finish, supersession с отзывом lease,
коррелированный finalized. Result outbox/effects вызывающий обязан коммитить
в той же транзакции (интеграция остаётся M-3/M-4). Схема не менялась.

M-1.4 проверен повторно: 22 unit arbitration tests проходят, плюс storage
CAS/finish/supersession guards. Не отмечен автоматически: реальная concurrency/
rollback acceptance BLOCKED без TEST_DATABASE_URL; admission interfaces ещё не готовы.
M-1.6 не реализован. M-1.7 выполнен частично: storage unit/repository PG fixtures
и README добавлены, но admission fixtures/проверки отсутствуют.

Circuit breaker: атомарный storage slice достиг бюджета unit. Принятый Router split:
**M-1b2 → M-1b2a operation/chunk/inbox transitions (этот checkpoint) +
M-1b2b pending intent admission/dedup + сверка M-1.4/7**. Ownership тот же M-1,
последовательно после этого handoff; M-2 не начинать до сдачи M-1b2b.
Admission должен сохранять authoritative observed seq и исходное auto-намерение,
не вычислять окно до снятия maintenance; учитывать active-run rejection и
атомарное превращение intent в run. Старый ParseRunRepository пока не изменён.

Verification M-1b2: targeted `pytest tests -k "maintenance or gate or lease"
-m "not infrastructure"` — **81 passed, 2 skipped**, не PG acceptance;
scoped Ruff/format/basedpyright PASS. Real-PG arbitration+storage — **BLOCKED:
14 setup errors**, нет TEST_DATABASE_URL; внешняя инфраструктура не менялась.
Evidence `.qa/106-107-metrica-cleanup-page-merge/M-1b2/`.


### Checkpoint M-1b2b (admission done; PG arbitration acceptance blocked)

Принятый split **M-1b2 → M-1b2a storage (done) + M-1b2b pending intent
admission/dedup + завершение scoped arbitration verification** отражён выше.
Ownership прежний M-1; service/client/worker integration и M-2 не выполнялись.

Выполнены M-1.6 и M-1.7: доменные BindingLifecycle/PendingParseIntent/IntentAdmission,
PendingParseIntentProtocol/Repository, immutable job/tenant/hash dedup, сохранение
исходного auto без дат, authoritative observation, local gate и active rejection,
transaction-local prepare + повторный guard в consume, атомарный run/tasks +
intent admitted CAS, bounded discovery/retry, terminal missing_binding и cancellation
только observed<cleanup_seq. README и unit/реальные PG fixtures добавлены.
ParseRunRepository использует общий arbitration базовый класс; legacy интерфейс
сохранён. Схема/head не менялись. M-1.7 checkbox означает готовность fixtures,
README и успешные targeted unit tests, НЕ real-PG acceptance.

M-1.4: implementation и targeted arbitration/lease/priority tests готовы; checkbox
**оставлен open** до реальной concurrency/rollback acceptance, как в предыдущем
checkpoint. TEST_DATABASE_URL отсутствует (проверено только наличие, значение не
читалось/не выводилось), поэтому повторный заведомо неуспешный infra прогон не делался.
Остаток — запустить maintenance arbitration/storage/intents PG fixtures на выделенной
*_test DB при предоставленном URL; IT-D-02/IT-N-02 batch/worker acceptance остаётся
M-2/M-3/M-4/QG. Дополнительного code split не требуется.

Verification: `pytest tests -k "maintenance or gate or lease" -m "not infrastructure"`
— **120 passed, 2 skipped**, не PG acceptance; дополнительный regression
`tests/unit/test_change_guards.py` — **22 passed**; scoped Ruff check/format-check и
basedpyright (source + новые тесты) PASS. Evidence:
`.qa/106-107-metrica-cleanup-page-merge/M-1b2b/`.

Контракт M-2: fetch lifecycle до короткой транзакции → enqueue_intent;
при deferred ACK только после commit. Recovery ready_intents(limit) → новый peer
snapshot вне lock → prepare_admission; только ready разрешает локальный расчёт
окна → consume_intent в той же транзакции → commit admitted. Lifecycle outage:
не подставлять нули, retry/nak либо сохранить имеющийся pending; terminal duplicate
не возрождает работу, admitted_run — tenant/hash-qualified lookup. Fresh task claim,
account running exclusivity, retry/reap/ingestion fencing остаются M-2.

## 4. M-2 — интеграция парсинга с барьером (профиль: Backend)

**Deliverable:** M · **Specs:** metrica-parse-queue, metrica-parse-command-consumer · **Пути:** services/ya-metrica-service/src/{core/services,clients,workers,repositories,containers,depends}/**; services/ya-metrica-service/tests/**; services/ya-metrica-service/README.md · **Зависит от:** M-1

- [x] M-2.1 Обновить yandex client DTO lifecycle/generation с контрактными mocks Y-2; при отсутствии корректного lifecycle fail closed, UT-D-04
- [x] M-2.2 Интегрировать parse enqueue с pending intent и observed seq; ACK maintenance wait не теряет job, UT-D-04/06
- [x] M-2.3 Интегрировать dispatcher и claim с повторной authoritative проверкой, generation и tenant gate; UT-D-05..06
- [x] M-2.4 Отменять queued старого поколения и retry, не новые post-delete intents; audit сохраняется, UT-D-05
- [x] M-2.5 Дать running текущей попытке дренироваться, fenced write/reconcile и lease-expired terminal отмена; UT-D-05, IT-D-02
- [x] M-2.6 После финализации обслуживания разворачивать deferred intent с актуальным binding и свежим auto-окном; UT-D-06
- [x] M-2.7 Добавить regression tests UT-D-04..06 и ingestion/reconcile mocks; описать drain/lease/retry семантику в README
- [x] M-2.V Выполнить `cd services/ya-metrica-service && uv run pytest tests -k "parse or gate or ingestion" -m "not infrastructure"`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit


### Checkpoint M-2a — admission slice (partial M-2)

Реализованы M-2.1/2: mandatory strict lifecycle DTO (включая counter=null),
peer snapshot до transaction, durable enqueue/prepare/consume с общим commit,
observed seq/generation в run/tasks. Минимально обновлён client schema
`src/core/schemas/clients/yandex_service.py`; interfaces entities/protocols и схема
БД не менялись. `ParseEnqueueService` принимает `intent_repository`, возвращает
`ParseEnqueueOutDto | None`: None означает committed wait/terminal admission.
Без job_id внутренний вызов получает UUID; legacy NULL в существующих runs неизменны.
Missing-binding intent коммитится перед прежним ACK outcome, commit failure — retry.

Verification: заданная M-2.V команда — 291 passed / 9 skipped; lifecycle client + DI
contracts — 49 passed. Scoped ruff/format/mypy/flake8 (8 файлов) PASS.
Общий diagnostic mypy: pre-existing 9 ошибок в migration
20261102_0004_maintenance_storage.py:310–312 и test_maintenance_intents.py:61–66;
чужие для slice пути не менялись. Skips PostgreSQL не acceptance; infra не запускалась.
Evidence: `.qa/106-107-metrica-cleanup-page-merge/M-2/`.

Circuit breaker: M-2 → M-2a (готово: admission) + M-2b (M-2.3/4: authoritative
recheck dispatcher/claim, tenant/account gate, queued/retry cancellation) + M-2c
(M-2.5/6/7: running drain, ingestion/reconcile fence, lease/gen0 recovery,
deferred-intent replay со свежим binding/auto и оставшиеся tests/README).
Ownership тот же Backend/services/ya-metrica-service, последовательно M-2a→b→c.
M-2.7 остаётся open: добавлены только admission UT-D-04/06, не drain/fencing tests.
До M-2b/c maintenance runtime не активировать: старые claim/write ещё не fenced.


### Checkpoint M-2b — dispatcher/claim и queued cancellation (done)

Принятый Router split M-2a → M-2b → M-2c внесён в execution table. M-2.3/4 выполнены;
M-2.7 остаётся unchecked до M-2c (нет ingestion/reconcile/drain tests).
Dispatcher и claim независимо получают peer lifecycle вне транзакции; атомарный
claim под tenant→account locks сверяет generation/observed seq/account/counter и gate.
Локальные generation/requested монотонны; completed остаётся ledger-owned.
Queued старого поколения/seq, включая future retry, становятся cancelled с сохранением
run/checkpoints/counters/attempts. Merge не отменяет queued. Новые post-delete intents
не затрагиваются; cancellation intents остаётся отдельным observed<cleanup_seq API.

Интерфейсы для M-2c: TaskRunner получает dispatch_service;
ParseDispatchService.claim_next_for_account(account_id, locked_by, lease_seconds);
TaskRepository.claim(account_id, equestrian_id, lifecycle, locked_by, lease_seconds),
list_dispatchable_accounts(equestrian_id, lifecycle), list_queued_tenants(account_id=None),
cancel_queued_before_cleanup(equestrian_id, cleanup_seq). Параметры после account_id
keyword-only. Все repository методы без commit; shared gate primitives вынесены в
MaintenanceGateRepository без изменения schema/entities. M-3 orchestration вызывает
queued/intent cancellation в той же cleanup transaction.

Verification M-2b: targeted unit/worker regressions **178 passed**, scoped Ruff check,
format-check и basedpyright (source + изменённые tests) PASS. PG fixtures адаптированы
к mandatory snapshot, добавлены authoritative delete/stale snapshot/merge tenant isolation;
**PG acceptance BLOCKED**, TEST_DATABASE_URL отсутствует, заведомо blocked прогон не повторён.
Evidence `.qa/106-107-metrica-cleanup-page-merge/M-2b/`.
Остаток M-2c: running drain, schedule_retry/reap terminal cancellation, lease/gen0 fencing,
ingestion/reconcile atomic guard и deferred replay. Maintenance runtime НЕ активирован.


### Checkpoint M-2c1 — deferred replay (partial M-2c)

Circuit breaker: назначенный M-2c охватывает два самостоятельных slice —
running write/recovery fencing и deferred admission/recovery; вместе с тестами
это больше бюджета одного invocation. Выполнен безопасный атомарный slice M-2.6.
Предложение Router: **M-2c → M-2c1 deferred replay (готово) + M-2c2 running drain,
ingestion/reconcile guards, retry/reap expired/gen0 recovery и M-2.7**.
Ownership прежний M-2; M-2c2 последовательно после этого handoff, до M-3.

`ParseEnqueueService.replay_intent(intent)` использует общий admission путь без
повторного enqueue, получает свежий peer snapshot вне transaction, сохраняет job_id,
prepare до расчёта свежего auto-окна, consume+commit атомарны. Terminal/admitted
не возрождаются; active run/maintenance остаются deferred; missing binding terminal.
`ParseIntentReplayService.replay_ready(limit=100)` — bounded discovery с отдельной
transaction до HTTP, per-intent recovery и delay 60 секунд для fairness. Peer/storage
ошибки не выводятся; discovery/defer failures распространяются. DI factory готова.
M-3 подключает periodic recovery/finalization hook, **runtime сейчас не активирован**.
Не менять repository schema/protocol для replay не потребовалось.

Verification: заданный M-2.V pytest — **322 passed, 10 skipped, 974 deselected**;
scoped Ruff check/format-check (5 файлов) PASS; basedpyright source+новые replay tests
PASS. Включение существующего test_parse_enqueue_service.py в typecheck выявляет
5 прежних SimpleNamespace mock/protocol findings; они не скрываются общим PASS.
Проверено только наличие TEST_DATABASE_URL: отсутствует, PG/IT-D-02 BLOCKED;
повторный заведомо blocked infra прогон не делался, skips не acceptance.
Evidence: `.qa/106-107-metrica-cleanup-page-merge/M-2c/`.
M-2.5/7 не отмечены: ingestion/reconcile/retry/reap остаются без новых guards.
**Gating/drain/fencing readiness для M-3 НЕ достигнута**; не включать workers.


### Checkpoint M-2c2 — атомарные running write/reconcile guards (partial)

Принятый Router split **M-2c → M-2c1 deferred replay (done) + M-2c2 running
fencing/recovery** отражён в таблице units/contextFiles. M-2c1 не переписывался.
После детализации M-2c2 содержит два самостоятельных архитектурных slice:
атомарная запись текущей попытки и authoritative retry/reap recovery. Выполнена
безопасная атомарная часть первого slice (~8 существенных действий с tests/docs).
Принятый Router circuit-breaker split **M-2c2 → M-2c2a write/reconcile guards (готово)
+ M-2c2b retry/reap cancellation и expired/gen0 recovery (следующий invocation)**.
Ownership прежний M-2; последовательная зависимость M-2c2a→M-2c2b, оба до M-3.

`ParseTaskRepositoryProtocol.assert_writable(task_id, locked_by)` минимально расширен.
Реализация открывает immutable tenant/account scope, берёт tenant→account locks,
затем task row lock с проверкой running/owner/unexpired DB-clock lease. Pending
cleanup/merge и ещё не доставленный watermark разрешают текущую running попытку;
executing/unknown/failed maintenance и уже completed cleanup более нового seq
запрещают запись. Никакого повышения generation=0 или снятия gate не происходит.
Ingestion вызывает guard перед upsert каждой страницы; runner перед reconcile.
`_owned_update` повторяет guard и expiry CAS: lease loss после stats эффекта
откатывает всю page/finalization transaction. HTTP/SEO resolve остаются вне locks.
StatsRepository менять не потребовалось: его effects по-прежнему без commit;
shared transaction/session обязательны, guard нельзя выносить в отдельный commit.

M-2.5 и M-2.7 **остаются unchecked**: нет terminal cancellation при retry/reap,
reaper ещё глобальный legacy-путь без authoritative snapshot/tenant→account locks,
expired/gen0 running blockers ещё не reconciled безопасным recovery. Следующий
slice должен отдельно обеспечить lifecycle до короткой recovery transaction,
fail-closed peer outage, bounded recovery discovery, отмену старой работы без
возрождения и тесты UT-D-04..06/PG prerequisites. Также проверить generation
в ParseJobFactory до получения credentials: текущая factory сверяет только
tenant/account/counter, и rebind с теми же identity не должен подменить старую привязку. Не считать новый write guard
достаточным для включения workers. **Readiness M-3 НЕ достигнута**, runtime не менялся.

Verification: `uv run pytest tests -k "parse or gate or ingestion or reconcile or reap"
-m "not infrastructure" -q` — **330 passed, 14 skipped, 986 deselected**.
Scoped Ruff/format-check (8 файлов) PASS; basedpyright source/new tests/runner tests
PASS. Diagnostic с legacy ingestion tests: **8 pre-existing findings**
SimpleNamespace/protocol, raw(None), optional parse_row.values; не выдаются за PASS.
Baseline HEAD ingestion tests повторно проверен из evidence: те же 8 findings.
Первый typecheck выявил и исправил max_attempts в новой PG fixture.
Добавлены `test_parse_write_gate_postgres.py`: обе stats-таблицы, pending drain,
expiry rollback page/reconcile, late worker rejection, tenant lock/isolation.
Это IT-D-02 fencing prerequisites, **не batch/recovery acceptance**.
TEST_DATABASE_URL отсутствует (проверено только наличие, без значения), поэтому
новые PG fixtures не запускались, заведомо blocked infra повторно не трогалась.
Targeted guards/arbitration suite — **124 passed**; PG collect-only — **16 collected**,
не выполнение. `git diff --check` и OpenSpec strict validation PASS.
Evidence `.qa/106-107-metrica-cleanup-page-merge/M-2c2/`. Новые checkbox не отмечены;
M-2.V остаётся ранее выполненным, полный suite отложен до M-4.


### Checkpoint M-2c2b — terminal cancellation/recovery (код готов; PG blocked)

Принятый Router split **M-2c2 → M-2c2a guards (done) + M-2c2b recovery**
отражён в execution/contextFiles таблицах. Реализован остаток M-2.5 и M-2.7:
retryable ошибки (включая exhausted attempt) решаются repository под fence;
старый generation/cleanup seq либо generation=0 → cancelled, обычная expired
попытка → queued/failed, pending merge не отменяет retry. Причины ошибки,
attempts/checkpoint/counters/audit сохранены. Живая running попытка продолжает
дренироваться; expired/NULL lease не позволяет late worker писать статистики.

Recovery interfaces: `list_recovery_tenants(limit=100)` — bounded expired/NULL
running discovery, максимум 1000 tenant; `ParseDispatchService.lifecycle_for_tenant`
— peer HTTP без transaction, None при peer outage/foreign binding;
`reap_expired_leases(equestrian_id=..., lifecycle=...)` — observation + повторная
expiry/status проверка + transition в одной transaction под tenant→account locks.
Dispatcher коммитит каждый tenant отдельно. Peer outage оставляет running до
следующего recovery, не создаёт retry. Compatibility reap() сохранён: bounded
local-gate recovery без authoritative HTTP; production dispatcher его не использует.
`schedule_retry(..., lifecycle=...)` получает свежий snapshot из runner до transaction;
lease-loss/unknown executing maintenance по-прежнему fail closed. Generation=0
не повышается: live legacy attempt может дренироваться, retry/expired terminal.
Factory до credentials проверяет positive/equal generation и completed cleanup seq;
rebind с прежними account/counter UUID не подменяет исходную привязку.

M-2.7 **отмечен**: regression/ingestion/reconcile mocks, retry/reap/factory tests,
README готовы. M-2.5 **остаётся open исключительно до real-PG acceptance**:
TEST_DATABASE_URL отсутствует (проверено только наличие, не значение), infra не
перезапускалась. Добавлены PG fixtures: cancellation vs ordinary/merge recovery,
watermark до NATS, generation/gen0, повтор reap, NULL legacy lease, live другой tenant,
late-worker fence, rollback observation+terminal transition; **не выполнялись**.
M-1.4 также остаётся open; IT-D-02 batch acceptance ещё относится к M-3.

Verification: targeted `pytest tests -k "parse or gate or ingestion or reconcile or reap"
-m "not infrastructure" -q` — **341 passed, 14 skipped, 998 deselected**;
skips не PG acceptance. Scoped Ruff check/format-check и basedpyright (10 изменённых
source/test файлов) PASS; PG collection — **28 collected**, не исполнение.
Evidence `.qa/106-107-metrica-cleanup-page-merge/M-2c2b/`.
**Code interfaces для реализации M-3 готовы; operational readiness не подтверждена**
до PG prerequisites M-1.4/M-2.5 и последующих M-3/M-4 checks. Workers/runtime не включены,
M-3 не выполнялся; полный suite по-прежнему отложен до M-4. Дополнительный code split
не нужен: остаток этого slice — предоставить dedicated test DB и выполнить fixtures.


## 5. M-3 — очистка батчами и надёжная доставка (профиль: Backend)

**Deliverable:** M · **Specs:** metrica-maintenance-protocol, metrica-parse-queue · **Пути:** services/ya-metrica-service/src/**; services/ya-metrica-service/tests/**; services/ya-metrica-service/docs/asyncapi.yaml; services/ya-metrica-service/README.md; services/ya-metrica-service/.env.example; .docker-compose/docker-compose.ya_metrica.yml · **Зависит от:** M-2

- [x] M-3.1 Добавить maintenance streams/durables и producer/consumer AsyncAPI mirror всех новых сообщений; сверить owner и Msg-Id
- [x] M-3.2 Реализовать lightweight consumers cleanup/merge/finalized с inbox, schema/hash validation и ack/nak/term; UT-D-03, UT-N-02/04
- [x] M-3.3 Реализовать bounded delete обеих stats-таблиц и cursor/checkpoint/lease transaction; UT-D-01/05, IT-D-02
- [x] M-3.4 Реализовать cleanup worker, дренирование running, приоритет и немедленную отмену merge между батчами; UT-N-06
- [x] M-3.5 Сохранять completed cleanup и result outbox атомарно, relay с PubAck/retry, без потери после restart; UT-D-03..04
- [x] M-3.6 Подключить cleanup/merge Celery queues и повторный dispatch в существующий beat; service compose workers слушают назначенные очереди, lost signal восстанавливается
- [x] M-3.7 Добавить targeted cleanup/consumer tests и real-PG fixtures IT-D-02; README/.env.example содержат knobs, readiness и recovery без secrets
  - [x] M-3.7-worker: targeted worker/drain/preemption unit tests, real-PG worker fixtures и README API/recovery (M-3c2); fixtures добавлены, PG acceptance НЕ выполнен.
  - [x] M-3.7-runtime: targeted queues/tasks/beat/supervision/replay tests, dispatch PG fixtures, README/.env knobs и recovery/readiness (M-3d); runtime OFF, PG/NATS acceptance НЕ выполнен.
- [x] M-3.V Выполнить `cd services/ya-metrica-service && uv run pytest tests -k "cleanup or maintenance or nats" -m "not infrastructure"`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit


### Checkpoint M-3a — bounded cleanup storage (partial M-3)

Circuit breaker: transport/admission + cleanup execution + result relay/runtime
содержат несколько архитектурных slices; в этом invocation выполнен только
независимый storage slice M-3.3 и относящаяся часть M-3.7. M-3.3 checkbox остаётся
**open до real-PG IT-D-02 acceptance**, M-3.7 — до полного cleanup/consumer coverage.
M-1.4/M-2.5 не закрыты и operational readiness не подтверждена.

Код: CleanupBatchRepository.delete_batch(lease,batch_size,lease_seconds) удаляет
первые оставшиеся tenant-qualified PK только одной stats-таблицы за transaction,
не более 1..10000 (default 1000). DELETE RETURNING агрегирован count(*) в SQL, нет
OFFSET/загрузки UUID. Checkpoint table pages→search_queries→exhausted и renew lease
атомарны с effect; guards до effect и CAS после него откатывают батч при stale/
expired lease или running parse. Empty/exhausted проверяет обе таблицы, но НЕ
завершает операцию/не продвигает completed seq. CleanupBatchService.run_batch
коммитит до возврата результата; DI factories ленивые, используют одну session.
Настройки CLEANUP_BATCH_SIZE=1000 и MAINTENANCE_LEASE_SECONDS=60 документированы.

Targeted unit/SQL/transaction/DI tests и новые real-PG fixtures
`tests/integration/test_cleanup_batch_postgres.py` добавлены. TEST_DATABASE_URL и
TEST_NATS_URL отсутствуют; заведомо blocked infrastructure не запускалась.
Verification: назначенная команда `uv run pytest tests -k "cleanup or maintenance or nats" -m "not infrastructure"`
→ **180 passed, 1 skipped** (legacy schema skip НЕ acceptance). Scoped ruff check/
format, flake8, mypy (9 files) → PASS; mypy strict и basedpyright новых service/
repository → PASS. PG fixture collection → **9 tests collected**, без выполнения
и без acceptance. `git -C services/ya-metrica-service diff --check` → PASS.
Evidence `.qa/106-107-metrica-cleanup-page-merge/M-3/`.

Предложенный последовательный split при прежнем Backend ownership:
- M-3a: этот storage slice; real-PG IT-D-02 acceptance ещё open.
- M-3b: M-3.1/2, maintenance topology/strict schemas/lightweight consumers с
  inbox/transaction admission и AsyncAPI mirror; без activation workers.
- M-3c: M-3.4/5, cleanup orchestration/drain + immediate merge supersession и
  atomic completed/result outbox + PubAck relay/restart tests.
- M-3d: M-3.6/остаток M-3.7, queues/beat/lost-signal/deferred replay/runtime wiring,
  реальные PG/NATS acceptance prerequisites и запрет activation до их подтверждения.
M-3c зависит от M-3a/M-3b; M-3d — от них всех; merge algorithm остаётся M-4.

Finalizer M-3c обязан в новой короткой transaction повторно проверить ownership и
пустоту обеих таблиц перед completed+outbox: результат прежнего run_batch не
достаточен. Transport, streams, workers, queues, beat и compose НЕ менялись.


### Checkpoint M-3b — maintenance transport/contracts/consumers (done)

Router-approved split отражён в execution/contextFiles: M-3a storage (код done,
PG acceptance open), M-3b transport (done), M-3c worker/supersession/outbox/relay,
M-3d queues/beat/replay/runtime. M-3.1/2 отмечены; смешанный M-3.7 остаётся open:
transport tests/readiness docs готовы, real-PG/cleanup/runtime acceptance нет.

Новых HTTP endpoints нет, peer auth/lifecycle guards не менялись. NATS dependency
уже есть (nats-py); manifests не требовали изменений. Explicit opt-in
`NatsJetstreamClient.setup_maintenance()` создаёт только owned
`METRICA_MAINTENANCE_RESULTS` (FILE/LIMITS/max_age=0/max_msgs=max_bytes=-1,
discard=new/duplicate_window=120), subjects `events.metrica.cleanup.completed`,
`events.metrica.pages.merge.completed`. Чужие YANDEX_LIFECYCLE/SEO_MAINTENANCE
не создаются; NotFound retry 10×2s linear, incompatible config fail fast.
Routes `(stream, subject, durable)`:
- YANDEX_LIFECYCLE / events.yandex.metrica.cleanup.requested / ya-metrica-cleanup-requested;
- SEO_MAINTENANCE / commands.seo.pages.merge / ya-metrica-pages-merge;
- SEO_MAINTENANCE / events.seo.pages.merge.finalized / ya-metrica-pages-merge-finalized.
Все pull/ALL/explicit/ack_wait=30/max_deliver=-1. Result durables остаются во
владении yandex/seo consumers. Старые parse topology/settings/outcomes сохранены.

`core/schemas/messaging/maintenance.py`: v1 strict UTC RFC3339, bigint/UUID,
cleanup requested/completed, merge mappings/seal/completed/finalized; body 256 KiB,
до 500 mappings. Identity helper `maintenance_message_id(subject, operation, suffix)`:
requested; part_index; seal; completed (cleanup); completed|superseded_by_delete
(merge result); finalized:<result_message_id>. Равны payload.message_id и header
Nats-Msg-Id. Все направления отражены в AsyncAPI, включая result correlations.
Producer сохраняет полный envelope один раз: новый timestamp с тем же ID — conflict.

`MaintenanceHandler` → `MaintenanceDeliveryService.receive(command, consumer=...)`
→ существующий MaintenanceStorageProtocol. Одна transaction через
save_operation/save_inbox/save_chunk/seal/finalize; repo сравнивает canonical hash.
Duplicate inbox не повторяет effect. Finalized не создаёт неизвестную operation.
Commit inbox+ledger до ACK, invalid schema/header/subject/hash/tenant correlation
→ TERM, storage/commit failure → NAK 1..60s, escalation после пятой delivery.
Transport не содержит SQL, stats work, peer HTTP или dispatch.

`create_maintenance_consumers(client, settings)` в application DI — lazy factory
трёх consumers с новой session/service graph на каждую delivery. **Не вызывается
lifespan**, `setup_maintenance()` тоже не подключён к обычному `setup()`.
M-3c должен использовать ledger + fences для worker/supersession/result outbox;
M-3d подключает supervision/start/stop всех consumers, recovery/replay и beat.
Runtime/workers не активированы. M-1.4/M-2.5/M-3.3 acceptance остаются open.

Verification evidence `.qa/106-107-metrica-cleanup-page-merge/M-3b/`:
- `uv run pytest tests -k "cleanup or maintenance or nats" -m "not infrastructure" -q -rs`:
  **235 passed, 1 skipped, 1205 deselected**; skip legacy schema PG из-за отсутствия
  TEST_DATABASE_URL, **не acceptance**; два pre-existing pytest collection warnings;
- parse consumer/schema/handler/containers/lifespan regression: **68 passed**;
- scoped Ruff check/format + mypy (11 files) PASS; basedpyright новых source/tests/DI
  (10 files, без settings) PASS. Отдельный basedpyright settings показывает четыре
  pre-existing `url possibly unbound` в неизменённом CelerySettings validator
  (тот же код есть в HEAD); scoped mypy settings PASS. Чужой validator не правился;
- существующий cached AsyncAPI CLI validate: **0 errors**, 11 governance warnings,
  1 latest-version info; OpenSpec strict validation и git diff --check PASS;
- TEST_DATABASE_URL и TEST_NATS_URL отсутствуют (проверено только наличие).
  Real-PG/IT-N-03 не запускались, заранее blocked infra повторно не трогалась.
Полный suite по-прежнему M-4. Никаких docs/reports или runtime операций.

### Checkpoint M-3c — finalizer/result outbox/relay (partial, дополнительный split)

Circuit breaker: cleanup claim/drain + admission-time immediate supersession +
finalizer/outbox/relay — несколько tightly-coupled архитектурных slices. Безопасно
завершён независимый finalizer/result-delivery slice; M-3.5 implementation + UT
отмечен. M-3.4 НЕ выполнен; M-3.7 остаётся open (worker/runtime/real infrastructure).
M-1.4/M-2.5/M-3.3 acceptance не менялась. Ни runtime, ни compose не активированы.

**Принятый Router split: M-3c → M-3c1 (этот slice, done) + M-3c2 (worker/supersession)**,
тот же Backend ownership services/ya-metrica-service/src/**, tests/**, README.md,
свои tasks. M-3c2 зависит от M-3c1; M-3d — от M-3c2. M-3c2 должен реализовать
короткие claim/drain transactions, bounded worker ticks, cleanup priority между
батчами и immediate superseded merge+result в transaction принятия cleanup/merge
(включая новый merge во время cleanup); существующие consumers пока только ledger.
Нельзя выдавать текущий код за MP-09/10 acceptance или запускать worker.

Интерфейсы для M-3c2/M-3d:
- `CleanupFinalizerService.finalize(lease) -> bool`: новая transaction, повторный
  assert_owned (priority/running/expiry/owner/revision), обе stats-empty checks,
  save_result + finish_work + contiguous completed seq в одном commit; False при
  непустых таблицах, stale lease raises/rollback. После terminal повторный finalize
  не нужен: durable outbox уже существует. CleanupBatchService.run_batch неизменён.
- `MaintenanceResultOutboxRepository.save_result(CleanupCompleted | MergeCompleted)`:
  caller-owned transaction, deterministic identity/immutable payload+hash check,
  tenant-qualified operation. Использовать в M-3c2 вместе с supersede и
  record_superseded_result; generic merge API подготовлен, сам supersession не сделан.
- `MaintenanceResultClaim(message_id,subject,payload,owner,revision,attempts)`;
  Protocol `claim_result(owner,lease_seconds)`/`mark_published(claim)`/
  `retry_result(claim)`. Один bounded SKIP LOCKED claim; expired reclaim повышает
  revision/attempts; fenced mark/retry. Все методы без внутренних commits.
- `MaintenanceResultRelay.relay_once(owner=UUID) -> bool`: commit claim → broker I/O
  без transaction → commit PubAck mark либо retry 1..60s без cap; True означает
  попытку, не гарантированную доставку. CancelledError/crash сохраняет durable claim
  до expiry; mark/commit failure пробрасывается. Duplicate warning, ≥5 ошибок error.
- `MaintenanceResultPublisher(client,settings).publish_result(claim) -> bool`
  реализует Protocol adapter, возвращает PubAck.duplicate; headers Nats-Msg-Id и
  payload неизменны, timeout 5s, проверка stream/seq. DI `cleanup_finalizer_service`
  и `maintenance_result_relay` ленивые, общая session; relay требует явного override
  `maintenance_result_publisher` dependency. Нет автоматического connect/setup/tick.

Состояния: cleanup deleting→completed только через fresh finalizer; pending outbox
не означает published; failed PubAck остаётся pending; published только после ack.
Merge state machine/admission и SEO finalized не менялись. Result subjects и
identity suffixes M-3b сохранены; AsyncAPI/settings менять не потребовалось.

Verification evidence `.qa/106-107-metrica-cleanup-page-merge/M-3c/`:
- `uv run pytest tests -k "cleanup or maintenance or nats" -m "not infrastructure" -q -rs`
  → **262 passed, 1 skipped, 1208 deselected**, два pre-existing collection warnings;
  legacy schema skip из-за TEST_DATABASE_URL — НЕ acceptance;
- scoped Ruff check/format, mypy (11 files), basedpyright (11 files) → PASS;
- новые real-PG finalizer/outbox fixtures → **3 collected**, не запускались;
- TEST_DATABASE_URL/TEST_NATS_URL отсутствуют (проверено без вывода значений),
  PG/NATS live acceptance blocked. Full suite остаётся M-4.

### Checkpoint M-3c2 — bounded worker/drain/immediate supersession (done)

Router принял split M-3c → M-3c1 (finalizer/result relay, done) + M-3c2
(worker/drain/preemption, done). Ownership общий M-3, следующие M-3d/M-4 не брались.
M-3.4 implementation/UT выполнен; отмечена только worker часть M-3.7,
родитель M-3.7 открыт для runtime/real-PG acceptance. M-1.4/M-2.5/M-3.3 открыты
без изменений: real-PG gates не заменены unit tests/collection.

Интерфейсы для M-3d:
- DI `cleanup_worker_service().tick(tenant: UUID, owner=UUID) -> str`: ровно один
  bounded stats batch; отдельные claim/drain commit → batch commit → fresh
  finalizer либо fenced yield commit. `waiting` = нет исполнимого head/дренируется
  running/live lease/seq gap/delayed/blocked; `progress` = нужен следующий tick;
  `completed` = атомарный finalizer succeeded; `lease_lost` = старый tick прекращён.
  Любые иные ошибки/cancellation пробрасываются: lease остаётся до expiry,
  committed checkpoint сохраняется. Новый claim повышает fencing revision;
  успешный yield освобождает lease и немедленно отзывает старый fence.
- `CleanupWorkerRepository.claim_cleanup` под tenant lock отменяет только старые
  queued/intents по observed seq, reaps expired running через существующий
  tenant→account reaper, live running не меняет (pending→draining). Только после
  фактического terminal drain обычный claim проверяет priority/prefix/live lease
  и даёт deleting. Не интерпретировать expired lease как завершённый drain.
- DI `maintenance_storage_repository` теперь `MaintenanceDeliveryRepository`:
  admission cleanup/merge атомарно с inbox сохраняет supersession + correlated
  immutable result outbox, включая ещё collecting merge/новый merge при cleanup.
  Только metadata, без stats/delete/move/dispatch в NATS. Supersede отзывает
  merge lease между транзакционными батчами. Уже awaiting_seo completed-work
  сохраняет original result; повтор/late parts/следующий cleanup не меняют
  исходную cleanup correlation. SEO всё ещё обязан ждать scan sealed +
  correlated cleanup completed; report сам по себе не разрешает удаление страниц.

M-3d: bounded discovery/dispatch и повторные tick по ledger, queues/beat,
consumer/result-relay supervision и deferred replay. `waiting` не означает
разрешение parse; не делать busy-loop. Ни runtime, ни compose, ни новые settings
не активированы; production/readiness gates остаются. Merge move/algorithm — M-4.
HTTP/access/tenant selector/peer-auth outcomes не менялись.

Evidence `.qa/106-107-metrica-cleanup-page-merge/M-3c2/`:
- `uv run pytest tests -k "cleanup or maintenance or parse_recovery_gate" -m
  "not infrastructure" -q -rs` → **252 passed, 1 skipped, 1243 deselected**;
  2 pre-existing collection warnings, legacy TEST_DATABASE_URL schema skip
  НЕ acceptance. Новый `test_cleanup_worker.py`: 19 worker/preemption/DI UT.
- Scoped Ruff check/format (8 files), mypy/basedpyright (6 production files)
  и service `git diff --check` → PASS.
- `test_cleanup_worker_postgres.py --collect-only -q` → **6 collected**, НЕ PASS:
  immediate report + stale merge fence, late parts/idempotency, admission rollback,
  running drain/expiry/restart, multi-batch обе таблицы/два seq/чужой tenant.
- TEST_DATABASE_URL и TEST_NATS_URL отсутствуют (проверено только наличие).
  Инфраструктура не запускалась/не исправлялась; PG/NATS acceptance blocked.
  Полный suite остаётся M-4.

### Checkpoint M-3d — dispatch/queues/beat/supervision/replay (done; runtime OFF)

M-3.6 implementation/targeted UT и оставшаяся runtime/documentation часть M-3.7
выполнены. M-3.7-runtime отмечен отдельно; родитель M-3.7 остаётся **open до
real-PG/transport acceptance**, как и M-3.3. M-1.4/M-2.5 не менялись. M-3 как
целое не принят по PG/NATS: code wiring завершён, operational readiness OPEN.
Предыдущие checkpoints описывают состояние на момент соответствующего unit.
M-4/merge algorithm НЕ выполнялся. Новых HTTP endpoints, auth/tenant изменений нет.

Интерфейсы для M-4:
- `metrica.cleanup_tick(tenant: str)` → queue `ya_metrica_cleanup`, fresh owner UUID,
  одна `cleanup_worker_service().tick(tenant, owner=...)`, не цикл всех батчей.
- `metrica.merge_tick(tenant: str)` → queue `ya_metrica_merge`; DI
  `ServicesContainer.merge_worker_service` по умолчанию None. Без реального handler
  возвращает `unavailable`, не делает claim/эффект/completed. M-4 задаёт реальную
  Factory с Protocol `tick(tenant: UUID, *, owner: UUID) -> str`, fenced/один батч.
  По наличию handler dispatch автоматически разрешает merge; заглушка не считается
  merge implementation. Override должен применяться ко всем fresh service graphs.
- `metrica.dispatch_maintenance()` и `metrica.replay_intents()` → `ya_metrica`;
  отдельные записи существующего beat, тот же PARSE_DISPATCH_INTERVAL_SECONDS.
  Dispatch: durable discovery, bounded MAINTENANCE_DISPATCH_LIMIT (100, 1..1000)
  на kind, expired/live lease и blocked/delayed/collecting prefix, cleanup выше
  merge. Под sorted tenant locks due next_attempt_at сдвигается к NOW (не в будущее)
  для честной ротации без starvation первого limit; не claim и не delivery mark.
  Commit до Redis, ошибка одного сигнала не останавливает остальных. Потеря/expiry
  восстанавливаются beat, stale сигнал повторно проверяется fenced worker.
  Replay вызывает готовый `replay_ready(limit=100)`; свежие binding/window сохраняются.
- `supervise_maintenance(client, consumers, relay)` в workers/maintenance_runtime.py:
  отдельное от parse connection, setup_maintenance → три consumers + result relay;
  FIRST_COMPLETED/ошибка перезапускают группу, retry 1..30s, BadRequest fail-stop.
  Partial startup/shutdown отменяет и дожидается children, stop всех consumers,
  close connection. Relay — fresh session и owner на один claim, interval 1s;
  DB failure перезапускает группу, publish failure использует durable retry.

MAINTENANCE_RUNTIME_ENABLED=false (default) не создаёт maintenance runtime в API и
делает maintenance Celery handlers no-op/disabled. Compose profiles metrica-runtime
(parse+cleanup workers и единственный beat), metrica-merge (только будущий merge)
явно opt-in; cleanup/merge commands дополнительно требуют runtime flag true.
Профиль не останавливает уже работающие старые контейнеры: перед будущим rollout
проверить/остановить старые ungated workers и не оставлять смешанные версии.
Никакие workers/контейнеры/миграции/streams этим unit не запускались и .env не менялся.
До реальных PG/NATS readiness checks runtime НЕ активировать; health/ping недостаточны.

Evidence `.qa/106-107-metrica-cleanup-page-merge/M-3d/`:
- Targeted workers + lifespan/containers + result relay/replay + cleanup
  worker/batch/arbitration/transport → **203 passed**, без infrastructure tests;
- scoped Ruff format/check, flake8, mypy (15 файлов) → PASS;
- service Compose `--profile metrica-runtime --profile metrica-merge config --quiet`
  → PASS, без вывода env; git diff --check → PASS;
- новые `test_maintenance_dispatch_postgres.py` fixtures: **3 collected**, НЕ
  исполнение/acceptance (lost signals/live-expired lease/blocked prefix/tenant fairness);
- TEST_DATABASE_URL и TEST_NATS_URL отсутствуют (проверено наличие, без значений).
  Заведомо blocked real-PG/NATS повторно не запускались; readiness остаётся OPEN.
  Полный suite сервиса остаётся M-4, root tooling/manifests/другие сервисы не менялись.

## 6. M-4 — батчевый merge и итоговая финализация (профиль: Backend)

**Deliverable:** M · **Specs:** metrica-maintenance-protocol · **Пути:** services/ya-metrica-service/src/**; services/ya-metrica-service/tests/**; services/ya-metrica-service/README.md · **Зависит от:** M-3

- [x] M-4.1 Выделить общую чистую семантику исходных метрик для ingestion/merge; UT-N-03 фиксирует users и generated ratios
- [x] M-4.2 Реализовать bounded transactional source→target move с unique date collision, source delete, checkpoint и parse_task_id=NULL; IT-N-02
- [x] M-4.2-storage: bounded fenced page move + chunk checkpoint, targeted UT и IT-N-02 fixtures (M-4a); real-PG acceptance НЕ выполнен, родитель M-4.2 остаётся open.
- [x] M-4.3 Реализовать merge worker по частям/seal без необработанного million mapping в памяти; UT-N-04
- [x] M-4.4 Реализовать completed/superseded result outbox, ждать correlated SEO finalized перед снятием parse gate; UT-N-04/06
- [x] M-4.5 Обработать delete preemption, late chunk, повтор результатов и lease recovery без двойных сумм; UT-N-04/06
- [x] M-4.6 Покрыть UT-N-02..04/06, IT-N-02 и регрессию свежего parse/reconcile; overflow даёт rollback/blocked
- [x] M-4.6-worker: targeted merge worker/barrier/recovery/overflow rollback→blocked и DI tests UT-N-02..04/06 (M-4b); real-PG/NATS и cross-flow fresh parse/reconcile acceptance остаются M-4c.
- [x] M-4.6-code: cross-flow unit/ingestion regressions и Alembic-head IT-N-02 fixtures добавлены (M-4c); только кодовая часть, реальный PG/NATS acceptance BLOCKED.
- [ ] M-4.7 Документировать merge/cancel/finalized recovery и выполнить полный suite сервиса один раз перед QG; failed infrastructure не считать skip=PASS
- [x] M-4.7-recovery: README recovery runbook и полные non-infrastructure lint/test завершены (M-4c); test-infra BLOCKED, родитель M-4.7 остаётся open.
- [ ] M-4.V Выполнить `make -C services/ya-metrica-service lint test test-infra`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit

### Принятый Router split M-4 → M-4a + M-4b + M-4c

Ownership общий: только ya-metrica src/tests/README и собственные checkbox/tasks.
Units последовательные, зависимости M-4a → M-4b → M-4c:
- M-4a (done): metrics + bounded transactional move, M-4.1/M-4.2-storage;
- M-4b (done): bounded worker/claim/drain/retry/overflow-block, result/finalized
  barrier, реальный lazy DI handler, targeted tests и README;
  M-4.3/4/5 + M-4.6-worker. Стек/runtime НЕ активируются;
- M-4c (OPEN): cross-flow regressions/fresh parse/reconcile, real-PG IT-N-02 и
  NATS acceptance, полный suite/gates сервиса один раз;
  M-4.2 acceptance, остаток M-4.6, M-4.7, M-4.V.

### Checkpoint M-4a — общие метрики и bounded merge storage (done; M-4 partial)

Circuit breaker: исходный M-4 объединяет aggregation/storage, worker lifecycle,
result/finalized integration и полный acceptance; это несколько архитектурных
slices и больше 8–12 существенных действий. Выполнен безопасный атомарный storage
slice, runtime/DI handler НЕ подключён, MAINTENANCE_RUNTIME_ENABLED остаётся false.
Отмечены M-4.1 и отдельный M-4.2-storage. M-4.2/3/4/5/6/7/V остаются OPEN;
PG fixture collection не считается исполнением IT-N-02.

Интерфейсы для следующего unit:
- `core/entities/metrica_metrics.py`: BASE_METRICS (пять исходных величин),
  MetricValues/add_metrics (чистое сложение без clamp), provider_metrics (прежнее
  provider rounding). Ingestion и обычный StatsRepository используют общий descriptor;
  users суммируется, derived ratios не подаются на запись.
- `MergeBatchRepository` наследует MaintenanceStorageRepository и реализует
  `MergeBatchProtocol.move_batch(lease, *, batch_size=явно, lease_seconds=явно)`.
  Нужна caller-owned короткая `session.begin()` и та же сессия для checkpoint.
  batch_size 1..1000; running merge lease, tenant fence до stats, одна часть <=500
  mappings, один source и <=batch_size дат за TX. Source FOR UPDATE, target additive
  ON CONFLICT по tenant/date/page (без same_task), parse_task_id=NULL, source DELETE,
  checkpoint_chunk + operation lease CAS в этой же TX. Queries не затрагиваются.
- Chunk checkpoint `{"mapping_index": N}`. Удалённые source даты — durable keyset
  (первый оставшийся source/date, без OFFSET). Полный батч требует следующего
  вызова, в том числе пустого для определения exhaustion; неполный продвигает N.
  Return `MergeBatch(part_index, mapping_index, moved_rows, part_completed)`;
  `None` — нет unfinished chunks, НЕ завершение операции/SEO/gate.
- Любой effect/checkpoint/expiry/overflow error требует rollback всего вызова.
  Failed-blocked для overflow и retry/lease recovery после rollback — будущий worker;
  storage сам не выпускает результат и не снимает barrier. DI placeholder оставлен
  None, merge dispatch по-прежнему OFF/unavailable без handler.

Verification/evidence `.qa/106-107-metrica-cleanup-page-merge/M-4/`:
- M-4a-tests.log: scoped merge + ingestion + parse-write-gate + storage + arbitration
  **123 passed**, без infrastructure.
- M-4a-static.log: scoped Ruff check/format, flake8, mypy (9 файлов) PASS.
- M-4a-pg-collection.log: **7 collected**, НЕ исполнение/PG acceptance: same-date
  collision двух sources + generated ratios, restart/retry, pre-commit/expiry
  rollback, stale owner, overflow rollback, fresh parse replace/reconcile, empty source.
- TEST_DATABASE_URL и TEST_NATS_URL отсутствуют (проверяется только наличие);
  blocked infrastructure не повторялась, runtime/стек не запускались.
  Полный suite сервиса не запускался, сохранён для последнего M-4 slice.

Предложение split (ownership тот же сервис, зависимости последовательные):
M-4 → M-4a (этот storage slice) + M-4b (worker claim/drain/yield/retry/overflow-block,
completed/finalized barrier, реальный handler в prepared wiring; M-4.3–5) + M-4c
(оставшиеся cross-flow regressions/real-PG IT-N-02/NATS acceptance, README recovery,
полный service lint/test/test-infra один раз; M-4.2 acceptance, M-4.6/7/V).
До реальных readiness gates handler можно собрать в коде, но runtime НЕ включать.
Новые HTTP endpoints/access outcomes/контракты не добавлялись.

### Checkpoint M-4b — worker/result/finalized barrier (done; acceptance M-4c OPEN)

Реализованы M-4.3/4/5 и M-4.6-worker. Parent M-4.2/6/7/V не закрыты:
unit verification не считается реальным PostgreSQL/NATS acceptance.

Интерфейсы/состояния для M-4c:
- `core/services/metrica_merge_service.py:MergeWorkerService.tick(tenant, *, owner)`
  — один claim TX, один move_batch TX (тот же session), свежий finalize/yield TX.
  Return: waiting/progress/awaiting_seo/lease_lost/retry/failed_blocked.
  Default batch=1000 (1..1000), lease DI MAINTENANCE_LEASE_SECONDS, max_attempts=5.
- `MergeWorkerRepository(MergeBatchRepository, MaintenanceResultOutboxRepository)`:
  claim_merge reaps expired parse под tenant/account locks и вызывает priority
  claim; queued merge-drain не отменяет. Cleanup/другие barriers не обходятся.
  finalize_merge считает completed chunks в SQL, rechecks ownership/seal/count,
  пишет completed result + awaiting_seo одной TX, НИКОГДА не открывает parse gate.
- Existing delivery/storage/relay обеспечивает immediate superseded outbox,
  late parts без execution, immutable first cleanup correlation, result PubAck retry,
  exact tenant/op/revision/result ID finalized. Уже awaiting_seo normal result
  остаётся исходным при новом delete. Superseded finalized требует seal+cleanup.
- SQLSTATE 22003 в move_batch → MergeOverflowError; после rollback свежая fenced
  TX ставит failed_blocked/error_code=merge_aggregate_overflow. Другие DBAPI ошибки
  → MergeStorageError: attempts++, 1..60s durable retry, после 5 ошибок blocked.
  Successful yield сбрасывает attempts. Неожиданные ошибки/cancellation пробрасываются;
  expiry/reclaim + source delete/checkpoint дают recovery без повторного сложения.
  Stale/preempted owner не может даже записать blocked. Недоступность самой БД
  оставляет lease-expiry recovery (диагностика не гарантирована без storage).
- DI merge_worker_service теперь lazy Factory реального handler, общий session;
  maintenance dispatch видит merge_available=True, prepared task уже вызывает tick.
  MAINTENANCE_RUNTIME_ENABLED остаётся false; никаких рабочих процессов не запускалось.
  README содержит recovery и различие handler-readiness / runtime acceptance.

Verification/evidence `.qa/106-107-metrica-cleanup-page-merge/M-4b/`:
- tests.log: targeted merge_worker/merge_batch/storage/cleanup_worker/arbitration/
  transport/result_relay/parse_recovery_gate/maintenance_runtime — **230 passed**,
  infrastructure не запускалась.
- static.log: Ruff check/format --check, flake8, mypy — PASS (9 файлов).
- openspec-validation.log: change validate --strict → PASS; root/service
  git diff --check → PASS.
- infrastructure-presence.log: TEST_DATABASE_URL/TEST_NATS_URL absent; проверено
  только наличие без значений. Заведомо blocked real-PG/NATS не повторялись,
  skip НЕ считается acceptance; полный suite остаётся M-4c.
- Первый scoped run: 194 passed/1 failed (новый DI test не подменил lazy celery_app,
  потребовался Redis пароль); исправлен test-only override, окружение не менялось.

M-4c: проверить реальным PG rollback/overflow→durable blocked, crash до/после commit,
expired/stale lease, несколько parts и date batches, cleanup preemption после batch,
коррелированный finalized/redelivery/late chunks, свежий parse/reconcile; реальные
NATS и полный lint/test/test-infra, не заменяя их unit mocks/fixture collection.
Новых HTTP/access outcomes нет; другие сервисы/root tooling/secrets не менялись.

### Checkpoint M-4c — cross-flow regressions/recovery/full suite (код done; infra BLOCKED)

Отмечены только M-4.6-code и M-4.7-recovery. Родители M-4.2/M-4.6/M-4.7/M-4.V
остаются OPEN: отсутствие выделенных TEST_DATABASE_URL и TEST_NATS_URL не является
acceptance. Runtime OFF; рабочий стек, БД и volumes не использовались.

Изменения:
- Unit SQL-контракты fresh parse: NULL aggregate заменяется, same-task page
  складывается; reconcile использует IS DISTINCT FROM в tenant/window. Ingestion
  regression: старые source URLs и canonical resolve дают один surviving UUID,
  свежие totals и один task ID на нескольких API pages.
- IT-N-02 fixtures расширены несколькими parts; новая cross-flow группа выполняется
  на Alembic head, не metadata.create_all: bounded worker → awaiting_seo → rejected
  unknown finalized → correlated finalized/redelivery → fresh task + reconcile с
  сохранением внеоконной даты/чужого tenant/query stats; overflow rollback → durable
  failed_blocked; cleanup после committed merge batch + repeated part → cleanup обеих
  таблиц → finalized. Это добавленные fixtures, НЕ исполненный PG acceptance.
- Собственные выявленные lint-дефекты change исправлены: method mock явно Any;
  migration loop str/Table variable переименована без изменения DDL; optional batch
  и result/mappings проверяются в fixtures. W503 конфликт flake8 с Ruff-форматированием
  существующих выражений этого change подавлен точечно `noqa: W503` без изменения
  short-circuit/SQL/auth semantics; конфиги/root tooling не менялись.
- README содержит порядок crash/lease, overflow/blocked, cancel/preemption,
  outbox/PubAck/finalized recovery и fresh parse/reconcile; ручного gate reset нет.

Verification/evidence `.qa/106-107-metrica-cleanup-page-merge/M-4c/`:
- `final-service-suite.log`: `make -C services/ya-metrica-service -k lint test`
  → PASS: mypy **204 files**, flake8 PASS; **1366 passed, 129 skipped,
  89 deselected, 2 warnings**. Skipped PostgreSQL tests НЕ acceptance.
- Начальный diagnostic full run (`full-suite.log`) дал 1362 passed и lint FAIL
  (9 mypy errors этого change); после исправления lint выявил W503, исправлены
  локально. Итоговый full run выше повторён только для подтверждения этих правок.
- `scoped-tests.log`: **104 passed** (до последующих механических lint corrections).
- `scoped-static-final.log`: Ruff check/format **14 files PASS**, scoped mypy
  `--check-untyped-defs` PASS (2 новых файла с импортируемыми fixtures).
- `pg-collection.log`: **10 collected** (7 storage + 3 новых cross-flow), НЕ execution.
- `infrastructure-presence.log`/`test-infra.log`: оба TEST_* URL ABSENT, test-infra
  **BLOCKED preflight**, заведомо падающий setup не запускался. Values не выводились.
- `openspec-validation.log`: strict PASS; root/service diff --check PASS.

Открытые infra IDs: **Y-2.V; M-1.4; M-2.5; M-3.3; M-3.7;
M-4.2; M-4.6; M-4.7; M-4.V**. Более ранние checkpoints остаются историческими.
Для PG acceptance обязательны execution новых migration-backed cross-flow fixtures,
существующих storage crash/restart/stale lease и остальных infrastructure tests;
реальные NATS delivery/restart остаются обязательны, unit mocks не заменяют их.
Новый кодовой split не нужен. Переход к независимому SEO storage S-1 возможен по
wire/ledger контрактам; это НЕ разрешение production/runtime и не закрытие infra gates.

## 7. S-1 — схема ревизий и storage merge (профиль: Backend)

**Deliverable:** S · **Specs:** seo-normalization, seo-page-normalization-settings, seo-entity-resolution, metrica-maintenance-protocol · **Пути:** services/seo-service/src/{models,migration,repositories,core/entities,core/protocols}/**; services/seo-service/tests/**; services/seo-service/README.md · **Зависит от:** approval/завершение текущей задачи/сверка 105

- [x] S-1.1 Добавить revision/snapshot/scan/mapping/UUID redirect/inbox/outbox schema, pages.scan_seq и индексы в одном storage slice; metadata и Alembic head согласованы
- [x] S-1.2 Добавить доменные storage entities/Protocol без инфраструктурных импортов; проверить contracts unit tests
- [x] S-1.3 Реализовать tenant-scoped repositories snapshots/scans, keyset cursor/high-water и single active revision; UT-N-01/05 fixtures
- [x] S-1.4 Реализовать mapping/redirect storage, уникальность source в ревизии, tenant-membership и cycle guard; UT-N-04/05 fixtures
- [x] S-1.5 Добавить inbox/outbox и checkpoint lease primitives, чтобы effect+checkpoint были одной транзакцией; UT-N-04 fixtures
- [x] S-1.6 Добавить storage/migration tests и реальные PG fixtures IT-N-01; README описывает additive schema и rollback без потери активных mappings
- [x] S-1.6-repositories: S-1b unit/repository tests, migration-backed PG fixtures keyset/revision/redirect/concurrency и README storage contracts; реальный PG acceptance НЕ выполнен, родитель S-1.6 остаётся open.
- [x] S-1b.V Targeted normalization/merge/page regression и scoped Ruff/flake8/mypy/basedpyright завершены; PG fixtures только collected, отсутствующие TEST_* URL не считаются acceptance.
- [x] S-1.6-delivery: S-1c inbox/outbox/lease/checkpoint unit tests и migration-backed PG atomicity/restart/concurrency fixtures добавлены; README tx/hash/lease/recovery contracts обновлены. Реальный PG acceptance НЕ выполнен; S-1.6 остаётся open.
- [x] S-1c.V Scoped normalization/merge/page regression и Ruff/format/flake8/mypy/basedpyright завершены; PG fixtures только collected, missing TEST_* URL не считаются acceptance.
- [x] S-1.V Выполнить `cd services/seo-service && uv run pytest tests -k "normaliz or merge or page" -m "not infrastructure"`, сохранить scoped evidence, отметить только фактические tasks и вернуть Router handoff по AGENTS.md; при превышении бюджета — partial/split

### Checkpoint S-1a — additive schema/domain (S-1 partial; circuit breaker)

Полный S-1 после чтения контекста превышает бюджет: schema/domain, tenant/keyset/
redirect repositories и delivery/lease atomic batches — самостоятельные slices.
Выполнена безопасная атомарная часть S-1.1/2, verification S-1.V относится только
к этому checkpoint. S-1.3–6 остаются OPEN; S-2 пока не запускать.
Принятый Router split: **S-1 → S-1a + S-1b + S-1c** (Backend, прежний ownership):
- S-1a: схема/доменные контракты, выполнено этим запуском;
- S-1b: S-1.3/4 — tenant lock, revision/snapshot/activation, keyset/high-water,
  mapping/redirect membership, source uniqueness и cycle/path-compression guards,
  targeted unit + PG fixtures; зависит от S-1a;
- S-1c: S-1.5 и остаток S-1.6 — inbox/outbox, lease fencing,
  effect+checkpoint atomic transaction, storage/migration regressions и реальный
  PG bounded/concurrency acceptance; зависит от S-1b.
S-1.6 разделён: repository unit/PG fixtures и README выполняет S-1b;
реальные PG acceptance и delivery/checkpoint fixtures остаются S-1c.
S-1c и S-2 этим запуском не начинаются.
Каждый следующий slice повторяет scoped verification; полный suite остаётся S-3.

Head SEO: `20261102_0004`, parent `20261028_0003`. Frozen migration не импортирует
runtime models. `pages.scan_seq` sequence/default backfills старые строки при
add-column; unique global index + `(equestrian_id, scan_seq)` keyset index.
Восемь новых таблиц `normalization_{tenants,revisions,snapshots,scans,mappings,
redirects,inbox,outbox}`. Partial unique active tenant исключает pending/finalized,
blocked удерживает барьер. Tenant-qualified revision FKs; UUID ledgers не имеют
FK к physical pages, чтобы переживать source deletion. Downgrade отказывается
удалять любую непустую normalization table, включая ранний inbox.

Interfaces для S-1b/S-2: `core/entities/normalization.py` (frozen dataclasses,
RevisionStatus, snapshot/revision/checkpoint/page/mapping/redirect/lease/message),
`core/protocols/repositories/normalization_repository.py` (caller-owned transaction;
lock/create/activate/get/keyset/redirect/claim/atomic-batch/inbox). Это контракты,
**repository реализации ещё нет**. Активация фиксирует high-water под tenant lock
после finalized предшественника; resolve обязан брать тот же lock **до** INSERT
и выделения sequence. Existing PageRepository/runtime не менялись.

Evidence `.qa/106-107-metrica-cleanup-page-merge/S-1/`:
- `uv run pytest tests -k "normaliz or merge or page" -m "not infrastructure"`:
  **275 passed, 1 skipped, 777 deselected**; skip existing PG model test — не acceptance;
- scoped Ruff check/format и basedpyright (9 source/test files): PASS, 0 errors;
- metadata/frozen DDL parity + offline upgrade/downgrade SQL и guard order: PASS;
- 4 PG schema/migration tests collected (2 новых), **НЕ исполнены / НЕ acceptance**;
  TEST_DATABASE_URL и TEST_NATS_URL отсутствуют (проверено только наличие).
Новый PG fixture проверяет old-page backfill, monotonic insert, single-active,
foreign-tenant revision FK, source uniqueness, checkpoint bounds и rollback guard.
IT-N-01 bounded/concurrent repository acceptance ещё не реализован и не закрыт.
README описывает maintenance window, runtime OFF и rollback без потери mappings.
Никаких DB/NATS/runtime/destructive операций или docs/reports.

### Checkpoint S-1b — revision/snapshot/keyset/mapping/redirect repositories

Принятый split S-1a → S-1b → S-1c сохранён. S-1.3/4 и кодовая repository-часть
S-1.6 выполнены; S-1.5 и родитель S-1.6 остаются OPEN. S-1c/S-2 не начинались,
runtime OFF, HTTP endpoints/access policy не менялись.

Изменения S-1b: `services/seo-service/src/repositories/normalization_repository.py`,
`src/core/protocols/repositories/normalization_repository.py`,
`tests/unit/test_normalization_repository.py`,
`tests/integration/test_normalization_repository_postgres.py`, `README.md` и этот
`tasks.md`. Модели/миграция S-1a не менялись; head прежний `20261102_0004`.

Контракты следующему исполнителю:
- `NormalizationRepository(session)`: `lock_tenant`, `create_revision`,
  `activate_next`, `get_revision`, `get_checkpoint`, `scan_pages`,
  `store_mappings`, `get_mappings`, `resolve_redirect`; без commit/rollback.
  Реализация пока **не полная** для общего Protocol: claim_scan,
  commit_scan_batch, accept_inbox реализует S-1c. Не создавать DI/runtime до S-2.
- Все mutation primitives берут tenant row lock; caller rule POST/resolve обязан
  брать этот lock ДО чтения правил/изменений/INSERT страницы/выделения sequence.
  Монотонная revision/snapshot/pending scan атомарны; duplicate operation — ошибка.
  Activation только oldest unfinished pending, blocked удерживает очередь;
  high-water tenant max(scan_seq) при активации (0 для empty), не при enqueue.
- Keyset pages `cursor < scan_seq <= high_water`; mappings `source_scan_seq >
  after_seq`; оба limit 1..500 без OFFSET. На exhausted scan caller доводит
  cursor до high-water, пропуски sequence не являются незавершённостью.
- `store_mappings(batch=...)`: максимум 500, live tenant membership для обоих
  endpoints, сверка actual source seq/high-water, source unique, exact retry
  no-op, конфликт отклоняется до эффектов. Только terminal canonical target:
  запрет target в source set batch либо redirect storage исключает chain/cycle.
  9 SQL максимум независимо от batch: lock(2), bounded reads(5), bulk insert(2),
  не более 1000 membership/alias UUID. Существующие цепи по UUID сжимаются отдельным
  resolve (64 hops bound, fail closed при cycle/foreign/dead terminal/overflow).
- S-1c сначала fences lease/checkpoint, затем вызывает store_mappings в общей
  caller transaction с outbox/checkpoint; сам primitive этого НЕ делает.
  После sealed mappings не принимаются. Awaiting_cleanup допускается до sealed;
  early supersession/cleanup result не разрешает SEO delete.

Evidence `.qa/106-107-metrica-cleanup-page-merge/S-1b/`:
- `targeted-tests.log`: `uv run pytest tests -k "normaliz or merge or page"
  -m "not infrastructure"` → **306 passed, 1 skipped, 783 deselected**;
  новые unit/repository tests: **31 passed**. Skip existing PG model test —
  НЕ acceptance; полный suite не запускался (остаётся S-3).
- `scoped-static.log`: Ruff check/format (4 files), flake8, mypy (4 files),
  basedpyright → PASS, 0 errors/warnings. Первичные mock/type/W503 замечания
  исправлены в новых файлах перед итоговым повтором.
- `pg-collection.log`: **6 migration-backed PG repository fixtures collected**,
  НЕ execution: >2 scan/mapping batches, tenant isolation, snapshot queue,
  high-water/late insert, source uniqueness/retry, cycle/path compression,
  deleted alias, rollback, concurrent resolve/activation и rule revisions.
- `infrastructure-presence.log`: TEST_DATABASE_URL и TEST_NATS_URL **ABSENT**,
  значения не выводились. Заведомо blocked infrastructure не повторялась;
  все реальные PG/NATS acceptance остаются OPEN для S-1c/S-3/QG.

### Checkpoint S-1c — delivery/lease/checkpoint storage (код завершён, PG acceptance BLOCKED)

Выполнены S-1.5, кодовый остаток S-1.6-delivery и S-1c.V. Родитель S-1.6
**OPEN**, так как TEST_DATABASE_URL отсутствует; TEST_NATS_URL также отсутствует
(проверены только наличие, без values). Инфраструктура/runtime не запускались,
blocked infra команды не повторялись. S-2 не начинался. Head/schema неизменны:
`20261102_0004` → parent `20261028_0003`, downgrade guard nonempty ledger сохранён.

Изменены `services/seo-service/src/repositories/normalization_repository.py`,
`src/core/entities/normalization.py`,
`src/core/protocols/repositories/normalization_repository.py`,
`tests/unit/test_normalization_delivery_repository.py`,
`tests/integration/test_normalization_delivery_postgres.py`, `README.md`, этот tasks.
Остальные S-1b файлы/модели/pages/migration/runtime не менялись.

Стабильные interfaces для S-2/S-3 (все keyword-only, AsyncSession caller-owned):
- Прежние revision/snapshot/keyset/membership/redirect contracts S-1b сохранены.
  Public Protocol полностью реализован `NormalizationRepository(session)`;
  нет DI/core services/scheduler wiring и новых HTTP endpoints.
- `claim_scan(equestrian_id, operation_id, now, duration) -> StorageLease | None`:
  tenant lock, executable scanning/awaiting_cleanup/deleting + high-water,
  новый token, until=now+duration, attempts+1 лишь при свободной/expired lease.
  Claim commit до network I/O. Это operation lease, не разрешение удаления.
- `commit_scan_batch(equestrian_id,operation_id,lease,expected,checkpoint,
  mappings,messages,now) -> None`: tenant lock → SAVEPOINT → scan row lock,
  token/until/attempts/full expected checkpoint CAS → store_mappings → outbox
  → checkpoint и release lease. Проверка expiry по now **и DB clock_timestamp()**
  до эффектов и перед final update; loss/identity conflict откатывает весь savepoint
  даже при пойманной caller ValueError. Outer commit/rollback всегда caller-owned;
  не иметь ORM pending changes перед begin_nested (его implicit flush).
  Следующий batch заново claim. Повтор старого token/checkpoint отклоняется,
  restart читает committed checkpoint, не повторяет пройденный диапазон.
- Максимум 500 mappings, sources `(expected.cursor,checkpoint.cursor]`, один part
  при непустом mapping batch, part_index=expected.next_part_index, next_part+1.
  Неизменный watermark/delete_cursor; unchanged pages двигают cursor без part.
  Seal требует cursor==high_water + terminal message(part_index=None), рекомендован
  отдельный пустой seal batch. Caller S-2 **в той же outer TX** обновляет revision
  status/part_count при seal; storage primitive их сам не меняет. S-3 реализует
  correlation и physical delete/finalized; claim deleting сам ничего не удаляет.
- `enqueue_outbox(message)`: known tenant operation, exact retry no-op;
  message_id/natural `(tenant,operation,kind,part_index-or-terminal)` конфликт
  ValueError без overwrite. `MaintenanceMessage` hash = SHA-256 canonical JSON
  (`sort_keys=True,separators=(",",":"),allow_nan=False`, default ensure_ascii=True),
  как peer metrica storage. Object/body ≤256 KiB. UUID-only schema, envelope IDs,
  revision/part_count correlation валидируют S-2/S-3 transport/domain, не storage.
- `claim_outbox(equestrian_id,now,duration,limit=100) -> Sequence[OutboxClaim]`:
  ready unpublished tenant rows, limit 1..500, SKIP LOCKED, token/attempts+1;
  OutboxClaim = frozen `(message: MaintenanceMessage, lease: StorageLease)`.
  Claim commit → publish вне TX → `finish_outbox(claim,now,published=True)` лишь
  после PubAck → commit. False = stale/expired CAS, повтор допустим. Для ошибки
  `published=False,retry_after=1..60s` сохраняет intent без cap, release lease.
- `accept_inbox(consumer,message) -> bool`: insert=True, exact identity/hash/content
  retry=False; global consumer/message collision с другим tenant/operation/hash
  даёт ValueError. Early unknown cleanup result допустим без FK, но НЕ разрешает
  SEO delete. False **не processed**: нужна correlation/replay после crash/early
  delivery. `mark_inbox_processed(consumer,message,now)` атомарен с effects caller
  TX, ACK только после commit. S-3 реализует поиск/корреляцию early результатов.
  Все dates timezone-aware, payload/driver details не логируются.

Verification/evidence `.qa/106-107-metrica-cleanup-page-merge/S-1c/`:
- `targeted-tests.log`: `uv run pytest tests -k "normaliz or merge or page"
  -m "not infrastructure"` → **340 passed, 1 skipped, 790 deselected**.
  Skip existing PG model test НЕ acceptance. Full suite остаётся S-3.
- `delivery-tests-final.log`: **34 passed**, UT-N-04 identity/hash/dedup,
  checkpoint/lease CAS, savepoint/final clock fence, outbox SKIP LOCKED/PubAck/retry.
- `scoped-static-final.log`: Ruff check/format 5 files, flake8, mypy,
  basedpyright **PASS**, 0 errors/warnings. `scoped-strict-types.log`:
  mypy --check-untyped-defs (те же 5 файлов с source package context) PASS.
  Первичные type/mock/format замечания исправлены только в своих файлах.
- `pg-collection.log`: **7 migration-backed PG fixtures collected**, НЕ execution:
  rollback/restart эффекта+redirect+outbox+checkpoint, >2 batch/seal, final lease
  loss savepoint rollback, stale/concurrent claim/reclaim/full checkpoint CAS,
  concurrent inbox duplicate/early result, lost PubAck + SKIP LOCKED/restart,
  conflict outbox после mappings откатывает все effects. PG execution обязателен
  в S-1.6/S-3/QG; mocks/collection не заменяют его. Старые 6 repository fixtures
  S-1b и schema/migration fixtures также требуют реальную БД.

Кодовый split не требуется: остаток — инфраструктурный PG acceptance S-1.6 и
дальнейшие S-2/S-3 runtime integrations по исходному плану, без снятия runtime OFF.
Mworker awaiting_seo до correlated finalized; early superseded_by_delete/cleanup
report НЕ разрешает SEO physical delete. Новых docs/reports/secret/env изменений нет.

## 8. S-2 — POST ревизии, canonical resolve и batch scan (профиль: Backend)

**Deliverable:** S · **Specs:** seo-normalization, seo-page-normalization-settings, seo-entity-resolution, metrica-maintenance-protocol · **Пути:** services/seo-service/src/{core/services,core/protocols,repositories,containers,depends}/**; services/seo-service/tests/**; services/seo-service/README.md · **Зависит от:** S-1

Router принял split **S-2 → S-2a request (done) + S-2b bounded scan/orchestration**.
S-2b берёт S-2.3/4/5 и scan tests/README часть S-2.7; transport/results/finalization
и полный suite остаются S-3. Реальный IT-N-01 acceptance без DB остаётся OPEN.

- [x] S-2.1 Сохранять POST правило+revision+snapshot+scan intention одной транзакцией для обоих списков; UT-N-01..02
- [x] S-2.2 Связать resolve/изменение правил/high-water одним коротким tenant lock, актуальными snapshot и canonical UUID; UT-N-05
- [x] S-2.3 Реализовать bounded keyset scan по scan_seq/high_water существующим PageNormalizer, canonical target find-or-create; UT-N-01/05
- [x] S-2.4 Пакетировать mappings по count/bytes и устойчивому cursor, публиковать намерение seal после scan; UT-N-04
- [x] S-2.5 Сериализовать следующие POST revision до финализации предыдущей, учитывать UUID aliases без вечного URL rewrite; UT-N-05
- [x] S-2.6 Сохранить POST/PATCH/DELETE DTO/status, PATCH/DELETE без merge/split и selector/role outcomes; UT-N-07, NS-03
- [x] S-2.7 Добавить domain tests UT-N-01..02/05/07, IT-N-01 и README о snapshot/необратимости; live transport оставить S-3
- [x] S-2.7-scan-code Targeted scan/domain/storage/DI tests UT-N-01/02/04/05, migration-backed PG fixtures и README завершены в S-2b; реальный IT-N-01 acceptance НЕ выполнен, parent S-2.7 остаётся OPEN.
- [x] S-2b.V Targeted normalization/merge/page regressions, scoped lint/format/typecheck и strict OpenSpec выполнены; PG fixtures только collected, не acceptance.
- [x] S-2.V Выполнить `cd services/seo-service && uv run pytest tests -k "normaliz or merge or page" -m "not infrastructure"`, сохранить scoped evidence, отметить только фактические tasks и вернуть Router handoff по AGENTS.md; при превышении бюджета — partial/split

### Checkpoint S-2a — request revision/snapshot/lock/canonical slice (S-2 partial)

Circuit breaker: исходный S-2 объединяет request/API coordination и отдельный
scan/outbox orchestration slice. Выполнена атомарная request-часть **S-2a**
(S-2.1, S-2.2, S-2.6); предлагается **S-2 → S-2a + S-2b**. S-2b зависит
от этого checkpoint, сохраняет Backend ownership S-2 и берёт S-2.3/4/5,
остаток S-2.7 (scan/parts/seal tests), собственную verification.
S-3 не начинался. Parent S-1.6 и все реальные PG/NATS gates остаются OPEN.

Изменены только:
- `services/seo-service/src/core/services/normalization_service.py` (новый);
- `services/seo-service/src/core/services/{page_service,blacklisted_query_param_service,blacklisted_hash_service}.py`;
- `services/seo-service/src/containers/{repositories,services}.py`;
- `services/seo-service/tests/unit/test_normalization_service.py` (новый);
- `services/seo-service/tests/integration/test_normalization_service_postgres.py` (новый);
- constructor adaptation: `services/seo-service/tests/unit/{test_page_service,test_blacklist_services}.py`,
  `services/seo-service/tests/api/{test_blacklist_api,test_resolve_api}.py`;
- `services/seo-service/README.md`, этот tasks.
Schema/domain/repository/Protocol и прежние незакоммиченные S-1 файлы не менялись.

Стабильные request interfaces для S-2b/S-3:
- `NormalizationService(normalization_repository, blacklisted_query_param_repository,
  blacklisted_hash_repository)` — обязательная keyword dependency
  `normalization_service=` для PageService/обоих blacklist services (нет silent
  fallback без locks/revisions). DI всех repositories использует один существующий
  ContextLocalResource session. `TenantTransactionalRoute` по-прежнему владеет
  begin/commit/rollback, commit до HTTP response. Services не коммитят.
- `lock(equestrian_id)` вызывается POST до duplicate lookup/insert, PATCH/DELETE
  до lookup/mutation, resolve до чтения правил и page insert/scan_seq allocation.
  Этот же `NormalizationRepository.lock_tenant` уже используется activate_next.
- `plan(equestrian_id)` после успешного rule insert читает оба текущих списка,
  сортирует snapshot и вызывает `create_revision` с новым operation UUID в той же
  request TX. Pending revision+snapshot+scan row — durable intention. POST не
  активирует revision, не фиксирует high-water и не делает NATS I/O.
- Resolve использует текущие mutable rules (не backfill snapshot), прежний
  PageNormalizer и обычный page repository resolve, затем
  `canonical_ids(equestrian_id, ids: dict[str, UUID])` следует tenant redirects
  по каждому уникальному UUID. URL labels не переписываются навсегда.
  PATCH/DELETE не планируют merge/split и не меняют снимок предыдущей revision.
- S-2b должен activate_next/scan/canonical target/claim/commit_scan_batch/chunk/seal
  связать самостоятельно; S-1b/c storage interfaces неизменны. Seal + revision
  status/part_count в одной outer TX, новые batches с новым claim. Следующую
  revision не активировать до finalized; early cleanup/superseded не разрешает
  SEO physical delete. Реальный worker/consumer/scheduler/runtime по-прежнему OFF.
- HTTP DTO/status, selector/tenant и foreign outcomes неизменны. Seo routes —
  прежние ITN exceptions; gateway строго SEO/no ADMIN override (105) не менялся.

Verification/evidence `.qa/106-107-metrica-cleanup-page-merge/S-2/`:
- `targeted-tests-final.log`: назначенная `uv run pytest tests -k
  "normaliz or merge or page" -m "not infrastructure"` → **353 passed,
  1 skipped, 794 deselected**. Existing model PG skip — НЕ acceptance.
- `request-tests-final.log`: request domain/API regression → **93 passed**;
  UT-N-01/02/05/07 request-side tests: snapshot обоих списков/lock ordering,
  invalid/duplicate/insert failure, canonical aliases/current rules,
  PATCH/DELETE без plan и DI same-session. Scan-specific cases остаются S-2b.
- `scoped-static-final.log`: Ruff check/format, flake8, mypy, basedpyright по
  12 изменённым Python файлам → **PASS**, 0 errors/warnings. Initial scoped
  formatting/fixture type issues исправлены в своих файлах.
- `pg-collection-final.log`: **4 PG fixtures collected, НЕ executed**:
  оба списка rollback/duplicate, POST после held resolve с watermark,
  resolve после held POST/foreign tenant, queued revision snapshot.
  `environment-presence.log`: TEST_DATABASE_URL/TEST_NATS_URL отсутствуют
  (только presence, без values). Blocked infra execution не повторялся.
  S-2.7 остаётся OPEN до scan tests и реального IT-N-01 acceptance.

Никаких stack launches, env/secrets изменений, destructive операций или
`docs/reports` не выполнялось. Full suite и transport остаются S-3.

### Checkpoint S-2b — bounded scan/mappings/chunk/seal (код done, runtime OFF)

Принятый Router split **S-2 → S-2a request (done) + S-2b scan (done)** отражён
в таблицах units/contextFiles. S-2.3/4/5 и кодовая scan часть S-2.7 выполнены.
Parent S-2.7 (реальный IT-N-01), S-1.6 и все PG/NATS gates остаются OPEN.
S-3 не брался; новых endpoints, schema/domain изменений и запуска runtime нет.

Изменены только:
- `services/seo-service/src/core/services/normalization_scan_service.py` (новый);
- `services/seo-service/src/core/protocols/repositories/normalization_repository.py`;
- `services/seo-service/src/repositories/normalization_repository.py`;
- `services/seo-service/src/containers/services.py`;
- `services/seo-service/tests/unit/test_normalization_scan_service.py` (новый);
- `services/seo-service/tests/unit/test_normalization_delivery_repository.py`;
- `services/seo-service/tests/integration/test_normalization_scan_postgres.py` (новый);
- `services/seo-service/README.md`, этот tasks. Чужие/S-1/S-2a изменения сохранены.

Стабильные interfaces для S-3:
- `NormalizationScanService(normalization_repository, page_repository,
  page_normalizer, *, batch_size=500, max_body_bytes=262144)`;
  DI `ServicesContainer.normalization_scan_service()` с одной caller session.
  `run_batch(*, equestrian_id:UUID, now:datetime,
  duration:timedelta=30s) -> tuple[UUID,ScanCheckpoint] | None`.
  Caller начинает TX, вызывает **один** batch, commit; при любой ошибке полный
  rollback (в том числе новых targets до storage savepoint). Следующий вызов —
  новая TX/claim. Никаких NATS/HTTP/ожиданий под tenant lock. None означает
  idle/leased/waiting, НЕ finalized и НЕ разрешение parse/следующей revision.
- Новый storage/Protocol `get_active_revision(*,equestrian_id) ->
  NormalizationRevision | None`: oldest unfinished, включая pending/blocked/
  awaiting_result/cleanup. Caller держит lock; pending активируется existing
  activate_next, scanning/unsealed awaiting_cleanup продолжаются по checkpoint.
  После sealed ждём S-3 finalization; только finalized допускает следующую
  revision с новым high-water. Snapshot неизменен, mutable rules не читаются.
- Scan `(cursor,high_water]` ≤500; existing PageNormalizer, ordinary path
  find-or-create + terminal UUID redirects. Cache paths/mappings только на batch.
  Unchanged/source==terminal target не дают mapping/part. Финальный короткий
  batch/sequence gaps двигают cursor до watermark; byte split не перескакивает
  первую не записанную source. Новые targets выше watermark не расширяют scan.
- Outbox `MaintenanceMessage(kind="mappings",part_index=n)` либо
  `kind="seal",part_index=None`. `payload_json` — **готовый полный wire body**
  v1, UTC occurred_at, normalization_revision; mappings UUID-only ≤500 и body
  ≤256 KiB, seal содержит durable part_count (включая 0). Subject
  `commands.seo.pages.merge`; message_id = uuid5(NAMESPACE_URL,
  `eqcms:maintenance:v1:<subject>:<operation_id>:<part_index-or-seal>`).
  SHA-256 canonical JSON как metrica storage. Relay публикует сохранённый
  payload/ID, НЕ пересоздаёт envelope/timestamp; Nats-Msg-Id=message_id.
  Existing claim_outbox/finish_outbox API неизменны: publish вне TX,
  mark published только после PubAck; loss/restart повторяют тот же body.
- **Уточнение S-1c seal contract:** `commit_scan_batch` теперь внутри того же
  savepoint и final DB-clock fence сохраняет revision.part_count и
  awaiting_result; при awaiting_cleanup сохраняет status/correlation.
  Дополнительный S-3 update seal status НЕ нужен. Mapping/redirect/outbox/
  cursor/seal/revision — атомарны; lease release и stale CAS прежние.
  После scan отдельный seal-only batch. Empty/no-op тоже seal(0) и ждёт
  correlated result, без shortcut finalized. Source физически не удаляются.
- Awaiting_cleanup продолжает SEO scan/aliases до seal. Early superseded или
  cleanup result не разрешает delete: S-3 ждёт одновременно seal и correlated
  cleanup.completed; затем source-only bounded delete, finalized+outbox.
  Mworker остаётся awaiting_seo до correlated finalized. Consumers/correlation/
  deletion/finalization/transport/scheduler и service full suite — S-3.

Verification/evidence `.qa/106-107-metrica-cleanup-page-merge/S-2b/`:
- `targeted-tests-final.log`: `uv run pytest tests -k "normaliz or merge or page"
  -m "not infrastructure"` → **381 passed, 1 skipped, 800 deselected**.
  Existing PG model skip НЕ acceptance; full suite не запускался.
- `scan-tests-final.log`: scan + delivery repository → **62 passed**;
  snapshot/query+hash, existing/new terminal target, shared target/500 bound,
  bytes split/restart cursor, no-op/empty seal(0), deterministic parts/seal IDs,
  queued/blocked/cleanup states, fenced failure propagation, DI same session,
  seal revision+checkpoint savepoint/final clock fence.
- `scoped-static-final.log`: Ruff check/format, flake8,
  mypy --check-untyped-defs, basedpyright по 7 Python файлам → **PASS**,
  0 errors/warnings. Первичные scoped formatting/type замечания исправлены.
- `pg-collection-final.log`: **6 migration-backed PG fixtures collected**, НЕ
  executed: >2 batches + watermark/aliases/foreign tenant; new target/restart/
  stale rollback; seal+revision+outbox rollback; queued revision activation;
  concurrent workers + independent tenant; durable lease/reclaim.
- `environment-presence.log`: TEST_DATABASE_URL/TEST_NATS_URL absent, только
  presence без values; blocked infra не повторялось. Реальный PostgreSQL/NATS
  acceptance обязателен позднее; mocks/collection/skips его не заменяют.
- `openspec-validate.log`: strict change validation PASS; `git diff --check`
  root/service PASS. Ни env/secrets, stack, volumes, ни docs/reports не тронуты.

## 9. S-3 — транспорт, отчёт и безопасное удаление страниц (профиль: Backend)

**Deliverable:** S · **Specs:** metrica-maintenance-protocol, seo-normalization, seo-page-normalization-settings, seo-entity-resolution · **Пути:** services/seo-service/src/**; services/seo-service/tests/**; services/seo-service/docs/asyncapi.yaml; services/seo-service/README.md; services/seo-service/.env.example; .docker-compose/docker-compose.seo.yml · **Зависит от:** S-2

- [x] S-3.1 Добавить owner SEO_MAINTENANCE, result durables и AsyncAPI publish/subscribe mirrors; точная сверка topology/payload
- [x] S-3.2 Подключить scan runner и outbox relay отдельным сервисным runtime без произвольного расширения parse scheduler; restart продолжает checkpoint
- [x] S-3.2-relay-code: отдельный bounded relay с caller transaction factory, saved-body publisher/DI; network вне TX, PubAck mark/retry/expiry/replay tests (S-3a). Runner/runtime ещё НЕ подключены.
- [x] S-3.2-adapter-code: concrete short session.begin transaction factory; strict subject/result adapter; durable bind consumer ACK после commit, TERM invalid correlation/schema, NAK temporary 1..60s; runtime/DI/startup/readiness не подключены (S-3c atomic slice).
- [x] FIX-S-01 Исправить S-BLOCK-01: обязательный Nats-Msg-Id равен envelope.message_id и subject/operation/status UUID5 до storage; TERM invalid identity, targeted paired regressions и scoped verification без изменения контракта.
- [x] S-3.2-dispatch-code: bounded UUID tenant keyset (unfinished revisions + due/unleased unpublished outbox), fair bounded tick, scan/delete contexts с независимыми fresh sessions, relay вне TX; application DI/process/readiness остаются OPEN (S-3c2a).
- [x] S-3.3 Реализовать inbox обработку completed/cleanup completed с проверкой operation/revision/tenant/полноты; UT-N-04
- [x] S-3.4 Реализовать superseded_by_delete ожидание двух условий scan sealed + cleanup completed; ранний отчёт не удаляет страницы, UT-N-06
- [x] S-3.5 Реализовать bounded delete source pages, сохранить UUID redirects, finalized outbox и переход к следующей ревизии; UT-N-04/05
- [x] S-3.6 Покрыть UT-N-04..07 и IT-N-01, парные anonymous/authenticated peer tests, response/schema и ошибки без secrets
- [x] S-3.6-result-code: UT-N-04/05/06/07 result/correlation/BOTH barriers/source-only fenced delete/finalized/restart unit tests, парные peer regressions и 6 migration-backed PG fixtures добавлены (S-3b); реальный IT-N-01/PG/NATS acceptance остаётся OPEN.
- [x] S-3.6-transport-code: scoped topology/publisher/relay/replay/schema tests и existing peer anonymous/authenticated regressions (S-3a); real PG/NATS/result/delete acceptance остаётся OPEN.
- [x] S-3.6-dispatch-code: 31 unit cases bounded dispatch/keyset/restart/rollback/cancellation и 2 migration-backed PG fixtures discovery/restart; targeted peer regressions PASS. Collection НЕ acceptance; real PG/NATS и parent S-3.6 OPEN (S-3c2a).
- [x] S-3.6-runtime-code: standalone DI/process, startup retry/fail-fast, two bound subscriptions readiness, worker restart/cancellation/stop, settings/probe tests (S-3c2b). Реальные PG/NATS acceptance и parent S-3.6 остаются OPEN.
- [x] S-3.7 Обновить README/.env.example и только seo service compose для runner при необходимости; полный suite сервиса перед общим QG
- [x] S-3.7-transport-docs: README/.env.example transport settings/recovery и runtime OFF boundary (S-3a); runner/readiness/compose/final suite остаются OPEN.
- [x] S-3.V Выполнить `make -C services/seo-service lint test test-infra`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit

- [x] S-3a.V Scoped transport/scan/storage/peer tests, Ruff/format/flake8/mypy/basedpyright и AsyncAPI validate/mirror завершены; full suite и infrastructure не запускались (S-3a).

- [x] S-3b.V Scoped result/normalization/peer regressions и Ruff/format/flake8/mypy/basedpyright/strict validation завершены; README обновлён, runtime OFF, real PG/NATS gates OPEN.
- [x] S-3c1.V Scoped adapter/transaction/result/scan/peer regressions (185 passed), scoped static checks, AsyncAPI/strict OpenSpec validation; README/checkpoint обновлены. S-3c partial; full suite и runtime readiness остаются S-3c2, real infra BLOCKED.
- [x] S-3c2a.V Scoped dispatcher/TX/restart regressions (557 passed), scoped static checks, AsyncAPI и текущий Compose config; README/checkpoint/split обновлены. Общий make lint: F401 models/__init__.py (внесён S-1a; исправлен S-3c2b), infra BLOCKED preflight, единственный full suite остаётся S-3c2b. Parent S-3.V НЕ закрыт.

- [x] S-3c2b.V Code verification: полный service lint/test, финальные scoped runtime/static/AsyncAPI/Compose/strict checks; test-infra BLOCKED preflight (нет обоих TEST_* URL), не acceptance. Parent S-3.V OPEN.

### Checkpoint FIX-S-01 — S-BLOCK-01 identity validation

Consumer передаёт headers в handler/decoder; до открытия transaction проверяются
обязательный Nats-Msg-Id, envelope.message_id и UUID5(NAMESPACE_URL,
`eqcms:maintenance:v1:<subject>:<operation_id>:<status>`). Проверены оба result
subjects и merge `superseded_by_delete`; invalid identity → TERM без storage/commit/ACK.
Контракт/AsyncAPI/HTTP/runtime не менялись; NAK temporary, ACK after commit и
publisher PubAck.duplicate=False semantics сохранены.
Дополнение C-01: occurred_at проверяется как RFC3339 STRING до coercion (общий
Envelope и CleanupCompleted); числовые timestamps, numeric strings и неверный
формат получают TERM до storage. Негативные тесты обоих subjects и merge statuses.

Targeted result/finalization/transport/runtime: **185 passed**; targeted реальный
PG под общим flock: **4 passed** (invalid identity/timestamp не создаёт inbox, valid/restart/conflict).
Исходный QG wire_probe: **6/6 TERM**, storage=ACK=NAK=0. Scoped Ruff check/format,
flake8, mypy и diff --check PASS. Evidence:
`.qa/106-107-metrica-cleanup-page-merge/FIX-S-01/`.
Полный suite остаётся повторному QG-BE-S; IT-N-03/CONTRACTS/LIVE не закрывались.

### Checkpoint S-3a — transport foundation (partial S-3, runtime OFF)

Circuit breaker: исходный S-3 содержит transport, result/storage/delete и runtime
с отдельными проверяемыми результатами; целиком не помещается в один slice.
Выполнен только **S-3a**. Принятый Router split: **S-3 → S-3a (готов) +
S-3b (result inbox/correlation, BOTH barriers, bounded delete/finalized) +
S-3c (transaction adapter/tenant dispatch/runner/DI/supervision/readiness,
PG/NATS fixtures, документация и единственный final full suite)**.
Ownership всех частей остаётся прежним S; S-3b зависит от S-3a, S-3c от S-3b.

Изменённые пути S-3a (другие S-1/S-2 файлы сохранены):
- `services/seo-service/src/clients/nats/{client,publisher}.py`;
- `services/seo-service/src/settings.py`, `src/containers/clients.py`;
- `services/seo-service/src/core/protocols/clients/maintenance.py` (новый);
- `services/seo-service/src/core/schemas/messaging/maintenance.py` (новый);
- `services/seo-service/src/core/services/normalization_outbox_relay.py` (новый);
- `services/seo-service/tests/unit/test_normalization_transport.py` (новый);
- `services/seo-service/docs/asyncapi.yaml`, `README.md`, `.env.example`;
- этот `tasks.md`. Новых dependencies, HTTP endpoints, compose изменений нет.

Стабильные contracts для следующих slices:
- `NatsJetstreamClient.setup_maintenance()` — **явный отдельный opt-in**, не
  вызывается существующими `setup`, API/lifespan/parse scheduler. Создаёт только
  SEO_MAINTENANCE с точными двумя subjects, FILE/LIMITS/max_age=0; регистрирует
  два SEO result durable на чужом METRICA_MAINTENANCE_RESULTS, pull/ALL/explicit,
  ack_wait=30/max_deliver=-1. Только NotFound retry 10×2s линейно; BadRequest
  fail-fast. Само создание durable НЕ означает готовность result consumer.
- `MaintenancePublisher(client=ParseCommandTransportProtocol).publish(*,
  message:MaintenanceMessage) -> bool` возвращает `PubAck.duplicate` (False —
  **успех новой доставки**, НЕ ошибка). Duplicate warning, exception — retry.
  Публикует точные сохранённые UTF-8 body/ID, не пересоздаёт envelope/occurred_at.
  Проверяет strict schema, UUID-only поля, canonical SHA-256, operation/tenant/ID,
  <=256 KiB, <=500 mappings, source!=target/unique source. `kind=mappings|seal`
  идёт в commands.seo.pages.merge; `kind=finalized` — в
  events.seo.pages.merge.finalized. Finalized body **без kind/part_index**, содержит
  normalization_revision/result_message_id; UUID5 suffix `finalized:<result_id>`.
  Scan saved messages/ID convention S-2b не менялись.
- DI `clients_container.maintenance_publisher()` — только factory, без startup.
- `NormalizationOutboxRelay(*,transaction,publisher,clock,batch_size=100,
  lease_duration=30s).run_batch(*,equestrian_id:UUID)->int` возвращает число
  успешно marked deliveries. `transaction: Callable[[],
  AbstractAsyncContextManager[NormalizationRepositoryProtocol]]` **обязан commit
  при normal exit/rollback при error**. Claim TX завершается до publish, finish
  выполняется в новой TX; нет DB lock/TX на сети. Существующие repository
  claim_outbox/finish_outbox не менялись. Failure retry экспоненциально 1..60s
  без cap, escalation после 5 attempts без payload/exception text. Cancellation/
  mark failure оставляет claim до expiry; повторяет прежние body/ID. Expired claim
  не публикуется, stale finish не считается delivery. Runtime adapter и tenant
  enumeration отсутствуют намеренно — это S-3c, не запускать relay из API.
- Result handlers/correlation/delete/finalized outbox/next revision ещё НЕ
  реализованы. Нельзя выдавать готовые durables или schemas за consumer. S-3b
  должен сохранить ранний cleanup result для последующей корреляции, проверять
  operation/revision/tenant/part_count, ждать BOTH scan sealed + matching cleanup
  completed при superseded; ранний report не разрешает delete. Source-only
  bounded deletion с сохранением UUID redirects; finalized+outbox атомарно,
  включая пустую revision. До finalized следующая revision не стартует.
- Runtime остаётся OFF до реальных PG/NATS gates. `scheduler/main.py` прочитан,
  не менялся; произвольного расширения parse scheduler нет. Readiness требует
  actual live subscriptions и supervised runner, не одного health/stream lookup.

Verification/evidence `.qa/106-107-metrica-cleanup-page-merge/S-3/`:
- `targeted-tests.log`: `uv run pytest tests/unit/test_normalization_transport.py
  tests/unit/test_nats_client.py tests/unit/test_normalization_scan_service.py
  tests/unit/test_normalization_delivery_repository.py tests/api/test_blacklist_api.py
  tests/api/test_resolve_api.py -q` → **143 passed**. Transport tests: 34 cases,
  replay/duplicate, strict invalid body/identity/hash/tenant/bytes, topology,
  startup retry/fail-fast, network вне TX, rollback/expiry/CAS/cancellation,
  unlimited bounded retry/safe logs и DI. Existing peer tests сохраняют matrix.
- `scoped-static.log`: Ruff check/format, flake8, mypy --check-untyped-defs,
  basedpyright по 8 Python файлам → **PASS**, 0 errors/warnings.
- `asyncapi-validation.log`: существующий cached AsyncAPI CLI validate →
  **0 errors**, 10 governance warnings + latest-version info (не gate failure).
- `asyncapi-mirror.log`: все 4 subject stream/owner/durable/filter/message и
  schemas совпадают с agreed metrica AsyncAPI, local refs resolve; PARSE
  contracts не изменены. Consumer operations документированы, не запущены.
- `environment-presence.log`: TEST_DATABASE_URL/TEST_NATS_URL **absent** (только
  presence). Blocked infrastructure execution не повторялось, collection/skip
  за acceptance не выдаются. Новых PG/NATS fixtures в транспортном slice нет.
- Full service suite **не запускался**: один раз в последнем S-3c. S-1.6/S-2.7,
  S-3.2/3/4/5/6/7/V и все реальные PG/NATS gates остаются OPEN.
Никаких stack запусков, env/secrets, volumes/destructive операций и docs/reports.

### Checkpoint S-3b — results/barriers/bounded finalization (done, runtime OFF)

Router split S-3a → S-3b → S-3c принят и отражён в execution units.
S-3.3/4/5 реализованы на domain/storage уровне, без NATS consumer runtime.
Parent S-3.6/7/V остаются OPEN: fixtures/collection НЕ real acceptance;
единственный полный suite, adapter/runner/DI/supervision — S-3c.

Изменённые пути S-3b (только этот slice; предыдущие изменения сохранены):
- `services/seo-service/src/core/schemas/messaging/maintenance.py`
- `services/seo-service/src/core/protocols/repositories/normalization_repository.py`
- `services/seo-service/src/repositories/normalization_repository.py`
- `services/seo-service/src/core/services/normalization_results.py` (новый pure helper)
- `services/seo-service/src/core/services/normalization_finalization_service.py` (новый)
- `services/seo-service/tests/unit/test_normalization_finalization_service.py` (новый)
- `services/seo-service/tests/integration/test_normalization_finalization_postgres.py` (новый)
- `services/seo-service/README.md`, этот `tasks.md`.

Контракты для S-3c (все параметры keyword-only, кроме constructor repository):
- `NormalizationFinalizationService(repository, batch_size=500)`:
  `accept_result(message:MaintenanceMessage, now:datetime)->bool` сохраняет inbox
  и operation state в caller TX; commit **до ACK**, rollback на любой ошибке.
  `True`=новая запись, `False`=точная redelivery, НЕ processed. ValueError —
  permanent safe schema/correlation/conflict (term без body/exception text);
  временные storage ошибки — rollback/nak. Нет физического delete в handler.
  Adapter выбирает `kind="merge_completed"` для merge completed subject и
  `kind="cleanup_completed"` для cleanup completed; payload_hash — SHA-256
  canonical JSON с sort_keys/separators/allow_nan=False, как transport S-3a.
  Strict DTO `MergeCompleted`/`CleanupCompleted` и `parse_result` проверяют
  envelope, UTC, version, bounds, identity/hash, запрет URLs/extra fields.
- `record_result(message,now)` storage атомарен в SAVEPOINT под tenant lock:
  merge только для известной non-pending/non-blocked revision с правильными
  operation/tenant/revision; sealed требует точный part_count. Unsealed report
  durable, но НЕ разрешение delete; полнота снова проверяется после seal.
  Exact duplicate не пропускает correlation; другой ID/hash для того же
  operation/consumer — conflict, без overwrite. Superseded ставит
  awaiting_cleanup+cleanup identity, не останавливая unsealed scan.
- `get_inbox_result(consumer,equestrian_id,operation_id)->MaintenanceMessage|None`:
  bounded LIMIT 2, конфликт >1; processed rows тоже читаются. Cleanup report
  может прийти до merge report, сохраняется без FK и помечается processed вместе
  с durable ledger; processed не уничтожает корреляцию. Merge processed только
  в финальной delete TX. Consumer constants — из `normalization_results.py`.
- `run_batch(equestrian_id,now,duration=30s)->tuple[UUID,ScanCheckpoint]|None`:
  одна caller TX и один delete batch; None=idle/waiting/leased, НЕ finalized.
  Старейшая unfinished revision в awaiting_result/awaiting_cleanup/deleting.
  BOTH scan sealed + matching cleanup tenant/operation/seq для superseded,
  при completed — sealed + exact revision/part_count. Проверки повторяются
  внутри storage, нельзя разрешать delete по одному раннему report.
- `claim_scan` теперь также допускает awaiting_result для финализации; scan
  service по-прежнему не сканирует этот статус. `commit_delete_batch` получает
  lease, expected checkpoint, result, finalized message, now, limit=1..500;
  повторно проверяет retained inbox/barriers, удаляет только tenant source UUID
  по durable mapping keyset, защищает targets индексированным redirects lookup.
  Redirects/mappings остаются. До эффекта token/until/attempts/checkpoint fence,
  после эффекта DB clock fence. Эффект/delete_cursor/lease release атомарны.
  После batch==limit остаётся deleting, следующий пустой batch завершает.
- Последний batch (включая empty revision) атомарно сохраняет finalized,
  processed merge marker и finalized outbox с конкретным result_message_id.
  UUID5 suffix `finalized:<result_id>`, готовый body без kind/part_index для
  saved-body publisher S-3a. Следующая revision не активируется внутри finalizer:
  existing scan runner вызывает activate_next в следующей TX после finalized,
  под tenant lock с новым high-water. Метрика ждёт доставки finalized.
- До SAVEPOINT не оставлять pending ORM changes; caller MUST rollback всю TX
  на error. Никакого network I/O под locks. Runtime не активирован, scheduler,
  containers/DI, transaction adapter и supervision не менялись. Новых endpoints,
  миграций, root tooling, env/secrets, compose и docs/reports в S-3b нет.

Verification/evidence `.qa/106-107-metrica-cleanup-page-merge/S-3b/`:
- `targeted-tests.log`: `.venv/bin/pytest` finalization/delivery/scan/service/
  repository/storage/transport/page_service/page_normalizer units + existing
  blacklist/resolve API peer regressions → **297 passed**, 0 skips.
  Новый finalization модуль отдельно → **53 passed** (включён в 297).
- `scoped-static.log`: Ruff check/format, flake8,
  `mypy --check-untyped-defs`, basedpyright по 7 Python файлам → **PASS**,
  0 errors/warnings. `git diff --check` root/service PASS.
- `pg-collection-not-acceptance.log`: 6 новых real-PG fixtures collected:
  >2 delete batches, restart/rollback, source-only/foreign tenant/UUID redirects,
  next revision, empty, cleanup/report order + BOTH barriers, final DB-clock
  expiry rolls back source effect/checkpoint/processed/finalized outbox.
  Collection **не acceptance**, fixtures не запускались без URL.
- `environment.log`: проверено только наличие TEST_DATABASE_URL/TEST_NATS_URL —
  оба отсутствуют; real PG/NATS повторно не запускались, gates **OPEN**.
- `openspec-validate.log`: strict validate PASS; полный suite не запускался.

Остаток S-3c: transaction adapter/tenant enumeration; result subject → saved
message adapter и actual durable handlers (commit/ACK, term/nak); supervised
scan/finalizer/relay runners, readiness/DI/docs/compose по необходимости;
единственный full suite и real PG/NATS gates при предоставленных URLs.
Не считать один созданный durable или mocks/collection готовым runtime.

### Checkpoint S-3c — atomic transport adapter slice (partial; runtime OFF)

Circuit breaker: остаток S-3c одновременно включает transport/TX adapters,
keyset tenant dispatch, runner/DI, startup retry/supervision/readiness, runtime
configuration/compose, restart tests и final full suite/real infrastructure gates.
Выполнен безопасный adapter slice (~5 существенных действий + README/checkpoint).
Предлагаемый Router split: **S-3c → S-3c1 (этот slice, done) + S-3c2
(tenant dispatch/runner/DI/supervision/readiness/final verification)**. Ownership
обоих — прежний S; S-3c2 зависит от S-3c1. Никакой runtime не активирован.
Parent S-3.2/6/7/V, S-1.6/S-2.7 и PG/NATS acceptance НЕ отмечены.

Файлы этого slice (без пересказа предыдущих изменений):
- services/seo-service/src/clients/nats/maintenance_results.py
- services/seo-service/src/repositories/normalization_transaction.py
- services/seo-service/tests/unit/test_maintenance_results.py
- services/seo-service/tests/unit/test_normalization_transaction.py
- services/seo-service/tests/integration/test_maintenance_result_handler_postgres.py
- services/seo-service/README.md; этот tasks.md.

Контракты следующему unit:
- `NormalizationTransaction(async_sessionmaker)` — callable async context manager,
  новый session + begin на вызов, repository Protocol; commit на exit, rollback
  при исключении/cancellation. Подходит handler/relay, не держать TX во время network.
- `MaintenanceResultHandler(transaction=..., clock=...)`:
  `handle(subject=...,payload=bytes)` сохраняет raw body/canonical hash через
  durable accept_result, завершает commit до возврата. Commit ValueError — temporary,
  ValueError внутри validation/domain — safe InvalidMaintenanceResult (permanent).
- `MaintenanceResultConsumer(client=...,settings=NatsSettings,handler=...,subject=...)`:
  `run()` bind существующего durable, fetch batch=1 timeout=1; await эту coroutine
  внутри supervisor. Fetch/ACK failure выходит наружу, cancellation unsubscribe,
  durable не удаляется. `process()` ACK после commit (duplicate тоже); TERM invalid
  subject/schema/correlation; temporary NAK 1..60s, escalation с 5, без payload/errors.
  Consumer не создаёт stream, не вызывает setup и не выполняет scan/delete.
- Subject constants MERGE_SUBJECT/CLEANUP_SUBJECT; durable names берутся из settings,
  inbox consumer constants неизменны. Нет HTTP/access-policy/topology/schema изменений.

Verification/evidence `.qa/106-107-metrica-cleanup-page-merge/S-3c/`:
- `targeted-tests.log`: adapters/TX/transport/finalization/scan + existing paired
  peer blacklist/resolve regressions → **185 passed**, 0 skips; новых unit tests 33.
- `scoped-static.log`: Ruff check/format, flake8, mypy --check-untyped-defs,
  basedpyright по пяти новым Python files → PASS, 0 errors/warnings; diff check PASS.
- `asyncapi-validate.log`: PASS, 0 errors, 10 existing warnings, 1 info;
  canonical contract не менялся этим slice.
- `pg-collection-not-acceptance.log`: 1 новый migration-backed PG handler fixture
  collected (commit/restart exact redelivery/hash conflict rollback), НЕ acceptance.
- `environment.log`: TEST_DATABASE_URL и TEST_NATS_URL ABSENT; test-infra не
  запускался по preflight, инфраструктура BLOCKED. Секреты/значения env не выводились.
- Единственный full service suite **не запускался**: остаётся последнему S-3c2,
  как и make lint/test/test-infra, compose config после wiring.
- `openspec-validate.log`: strict OpenSpec validation PASS.

Остаток перед завершением backend S и переходом к F-1/QG: tenant keyset enumeration
(unfinished revisions + pending outbox, bounded), runner с независимыми scan/delete TX
и relay network outside TX; DI/отдельный process, retry только transient startup,
supervision/readiness/graceful stop; settings/docs/compose opt-in OFF и tests;
final service suite один раз. Реальные IT-N-01/IT-N-03 и прежние S-1.6/S-2.7/S-3.6
PG/NATS gates остаются OPEN до предоставления выделенных URLs. Readiness runtime
пока **не реализован**, готовность consumer mocks не означает production readiness.

### Checkpoint S-3c2 — bounded dispatch/TX composition (partial, runtime OFF)

Router принял **S-3c → S-3c1 adapters (done) + S-3c2 runtime/full gates**;
таблица execution units отражает принятый split. При реализации S-3c2 сработал
circuit breaker: tenant discovery/dispatch/TX adapters и restart fixtures — уже
8 существенных действий (5 source + 3 test files), помимо README/checkpoint.
Добавление process DI/startup retry/supervision/readiness/config/compose и runtime
тестов превысило бы бюджет. Выполнена атомарная часть **S-3c2a**; Router принял
**S-3c2 → S-3c2a (готово) + S-3c2b (process/DI/supervision/readiness/config/full gates)**.
Ownership обоих прежний S, S-3c2b зависит от S-3c2a, без новых сервисов/root tooling.
Parent S-3.2/6/7/V и infra acceptance S-1.6/S-2.7 остаются OPEN.

Изменённые файлы этого slice:
- services/seo-service/src/core/protocols/normalization_runtime.py
- services/seo-service/src/core/protocols/repositories/normalization_repository.py
- services/seo-service/src/core/services/normalization_dispatcher.py
- services/seo-service/src/depends/normalization_runtime.py
- services/seo-service/src/repositories/normalization_repository.py
- services/seo-service/tests/unit/test_normalization_dispatcher.py
- services/seo-service/tests/unit/test_normalization_batch_transactions.py
- services/seo-service/tests/integration/test_normalization_dispatcher_postgres.py
- services/seo-service/README.md; этот tasks.md.

Контракты для S-3c2b:
- `list_work_tenants(now, after=None, limit=100)` keyword-only, UUID keyset, limit
  1..500, distinct unfinished revisions UNION due/unleased unpublished outbox;
  оба branch и итог bounded. Включает outbox уже finalized revisions. Это discovery,
  не claim/tenant auth; прежние tenant/fencing/barrier guards остаются в services.
- `NormalizationBatchTransactions(SessionFactory, normalizer=PageNormalizer(),
  scan_batch_size=500, delete_batch_size=500).scan()/finalization()` — async contexts
  с fresh session/begin. Scan page/storage repositories разделяют одну TX; между
  scan/delete/relay нет общей TX. Commit ошибки/cancellation выходят наружу.
- `NormalizationDispatcher(transaction=NormalizationTransaction(...),
  scan=batches.scan, finalization=batches.finalization, relay=existing_relay,
  tenant_page_size=100, clock=...)`; `tick()->int` посещает одну tenant page и по
  одному scan/delete/relay batch на tenant. Каждый scan/delete в отдельной TX,
  network relay после их закрытия. Short/empty page wraps, full page продолжает
  UUID cursor в следующем tick. Restart теряет только discovery cursor, не ledger.
- Discovery/commit failure propagates к будущему supervisor. Stage errors безопасно
  логируются без текста exception/payload, rollback изолирован; `tick()` возвращает
  их количество. Supervisor MUST учитывать ненулевой результат для health/backoff,
  не объявлять readiness на таком tick; cancellation не перехватывается. Не добавлять
  бесконечный busy-loop: между ticks требуется configurable delay/backoff.
- **В коде не активировано никакое wiring**: нет application DI registration,
  entrypoint, lifespan/parse-scheduler изменений, ENV/Compose auto-start. Runtime
  OFF, readiness отсутствует. До реальных infra gates рабочий стек не включать.

Verification/evidence `.qa/106-107-metrica-cleanup-page-merge/S-3c2/`:
- `targeted-tests.log`: `uv run pytest tests/unit tests/api -k 'normaliz or
  maintenance or blacklist or resolve' -m 'not infrastructure' -q` → **557 passed**,
  550 deselected; новых unit cases 31, skip нет. Это targeted, НЕ полный suite.
- `scoped-static.log`: Ruff check/format, flake8, mypy --check-untyped-defs и
  basedpyright для 8 Python files → PASS, 0 errors/warnings.
- `make-lint.log`: service-wide `make lint` → mypy PASS (191 files), flake8 FAIL:
  **pre-existing** `src/models/__init__.py:1:1 F401 models.normalization imported
  but unused`. Файл изменён S-1 до этого slice; не менялся и ошибка не скрывалась.
  Это не PASS полного lint; Router/владелец может отдельно назначить исправление.
- `pg-collection-not-acceptance.log`: 2 новых migration-backed PG fixtures
  collected; НЕ acceptance. SQL discovery due/expired/live lease/finalized outbox
  и restart scan/checkpoint/successor barrier ещё не исполнялись на реальной PG.
- `environment.log`: TEST_DATABASE_URL/TEST_NATS_URL ABSENT, `make test-infra`
  BLOCKED preflight, setup не запускался. Реальные IT-N-01/IT-N-03 остаются OPEN.
- Единственный полный `make test` НЕ запускался: сохраняется для последнего
  S-3c2b вместе с full gates после runtime wiring.
- `asyncapi-validate.log`: PASS, 0 errors, 10 existing warnings, 1 info.
- `compose-config.log`: `docker compose -f .docker-compose/docker-compose.seo.yml
  config --quiet` → PASS, без вывода env; runtime Compose ещё не добавлен.
- `openspec-validate.log`: strict OpenSpec PASS. Root/service diff --check PASS.

Остаток S-3c2b: application DI отдельного process, runner ticks + два durable
consumer/relay под наблюдением, transient startup retry с incompatible topology
fail-fast, graceful signal shutdown/cleanup, readiness fail-closed, opt-in OFF
ENV/settings/Compose wiring и runtime/restart tests; README knobs; full service
suite один раз. Real PG/NATS acceptance требует выделенных TEST_* URLs, не mocks.
Новые endpoints/access matrix изменения, F-1, рабочий runtime и внешнее окружение
не затрагивались. `docs/reports` не создавался.

### Checkpoint S-3c2b — standalone process/DI/supervision (код done; infra BLOCKED)

Router принял split **S-3c2 → S-3c2a dispatch (done) + S-3c2b process/full gates**;
таблица units обновлена. S-3.2/7 и code subtask S-3.6-runtime-code завершены.
Parent **S-3.6/S-3.V, S-1.6/S-2.7 и реальные IT-N-01/IT-N-03 OPEN**:
без TEST_DATABASE_URL/TEST_NATS_URL инфраструктурный preflight BLOCKED, setup не
запускался. Нет основания объявлять release/rollout acceptance.

Изменённые пути только этого unit:
- `services/seo-service/src/maintenance/{__init__,runtime,main,readiness}.py`;
- `services/seo-service/src/depends/normalization_runtime.py`;
- `services/seo-service/src/clients/nats/maintenance_results.py`;
- `services/seo-service/src/settings.py`, `src/models/__init__.py`;
- `services/seo-service/tests/unit/test_maintenance_runtime.py`;
- `services/seo-service/{README.md,.env.example}`;
- `.docker-compose/docker-compose.seo.yml`, этот `tasks.md`.

Контракты/решения:
- `build_runtime(settings=NormalizationSettings())` — process-local DI factory
  над существующими module containers, fresh SessionFactory TX, dispatcher,
  relay и двумя result consumers. Никакого API lifespan/parse scheduler запуска,
  shared request session, новых endpoint или изменений access policy.
- `python -m maintenance.main`: двойной opt-in (Compose profile seo-maintenance
  + SEO_NORMALIZATION_ENABLED=true); default OFF сохранён, рабочий runtime не
  запускался. Один fixed-name container, без портов/HTTP, bounded on-failure restart.
- Supervisor awaits все workers, на exit/fetch/discovery error отменяет siblings,
  закрывает subscriptions/NATS и пересоздаёт epoch с 1..60s backoff; с пятой ошибки
  безопасная escalation. BadRequest incompatible topology — fail-fast. Setup чужого
  stream использует существующий bounded NotFound retry, не создаёт чужой stream.
- Readiness — отдельная local file probe `python -m maintenance.readiness`, не
  `/health`: свежий heartbeat <5s, connected client, две фактически bound
  subscriptions, три живые задачи, успешный dispatcher tick. Batch failures,
  storage NAK, startup/disconnect/shutdown => fail-closed; update cadence 1s.
  SIGINT/SIGTERM cancels workers, closes NATS, disposes DB; fatal process output
  безопасный (без exception text/payload/traceback). Resume только из ledger.
- Размеры scan/delete/relay/tenant pages настраиваются 1..500, tick 0.1..60s.
  Dispatcher/scan/delete алгоритмы и peer/access matrix не переписывались.
- **Коррекция причинности F401:** baseline `git show HEAD:src/models/__init__.py`
  не содержит импорта normalization; diff подтверждает, что он внесён этим change
  в S-1a. Следовательно, «pre-existing» в S-3c2a корректно только относительно
  самого slice, но НЕ относительно change. Исправлено минимально: normalization
  добавлен в `__all__`, обязательный side-effect registration metadata сохранён.
  Evidence: `F401-causality.diff`; полный lint теперь PASS.

Verification/evidence `.qa/106-107-metrica-cleanup-page-merge/S-3c2b/`:
- `make -C services/seo-service lint` → PASS, mypy 196 files + flake8. Первый
  проход выявил W503 в новом runtime, исправлено без suppress; повтор lint PASS.
- Единственный полный `make -C services/seo-service test` → **1269 passed,
  4 skipped, 94 deselected**. Skips/infrastructure deselection НЕ acceptance.
  После него только локальные safety/logging fixes и дополнительные regression
  cases, проверенные targeted; повторный полный suite не запускался.
- `runtime-final-tests.log`: runtime/results/transport regressions — 87 passed.
- `runtime-regressions.log`: финальные runtime regressions — **28 passed**
  (включая 3 дополнительных safety/escalation cases после full suite); не infra acceptance.
- `scoped-static.log`: Ruff check/format, flake8, mypy --check-untyped-defs,
  basedpyright на 9 изменённых Python files → PASS, 0 errors/warnings.
- `environment.log`: оба TEST_* URL ABSENT, `make ... test-infra` BLOCKED preflight;
  не выполнялись заведомо падающие setup, skip/collection не выданы за PASS.
- AsyncAPI service validation, strict OpenSpec validation и opt-in Compose
  `config --quiet` → PASS без env output; AsyncAPI 0 errors, 10 warnings/1 info.
  Root/service diff --check PASS.

Кодовая S-часть готова к F-1 (HTTP contracts не изменялись). Остаток — реальные
migration-backed PG/restart/tenant isolation и JetStream end-to-end acceptance,
после выделения TEST_* URLs, в штатных QG-ENV/QG-BE-S/QG-CONTRACTS/QG-LIVE.
Не нужен ещё один code split; внешнее окружение не чинилось, volumes не трогались,
main specs/root tooling/другие сервисы/secrets и docs/reports не менялись.

## 10. F-1 — модалки последствий и пятисекундное подтверждение (профиль: Frontend)

**Deliverable:** F · **Specs:** cms-seo-yandex-ui · **Пути:** services/frontend/src/features/seo/{ui,hooks}/**; services/frontend/src/api/yandex.test.ts · **Зависит от:** approval/завершение текущей задачи/сверка 105

- [x] F-1.1 Расширить feature ConfirmActionModal списком последствий/восстановления без бизнес-текстов в shared UI; FE-01/05/08
- [x] F-1.2 Добавить resettable absolute deadline/countdown и handler guard, cleanup таймера, entity key; FE-01..04
- [x] F-1.3 Подключить текст удаления счётчика и фоновой очистки, без новых DTO/progress endpoint; FE-05..07
- [x] F-1.4 Подключить условный каскад удаления аккаунта, сохранить изоляцию иконки/выбора; FE-08..10
- [x] F-1.5 Проверять актуальный SEO и pending/double-submit в обеих мутациях; ранний Enter/role revoke не вызывает API, FE-03/10/12
- [x] F-1.6 Добавить fake-timer/component/API-boundary MSW tests FE-01..12, включая validation/generic/401/403 и success invalidation; live вызовы в unit запрещены
- [ ] F-1.7 Проверить desktop layout 1366×768, отсутствие consumer imports и paging regression; передать browser flow QG-FE-MANUAL без выдачи unit тестов за manual evidence
- [x] F-1.V Выполнить `cd services/frontend && npm test -- src/features/seo src/api/yandex.test.ts && npm run lint && npm run typecheck`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit


**Checkpoint F-1:** код и автоматизированные FE-01..12 готовы. Scoped suite —
759 passed; после финальной типовой правки теста и именования констант targeted
11 passed; ESLint — 0 errors (438 warnings), typecheck PASS. Evidence и browser
route/state/roles/scenarios: `.qa/106-107-metrica-cleanup-page-merge/F-1/`.
F-1.7 остаётся OPEN только по визуальной проверке desktop 1366×768: runtime/стек
по заданию не включались, jsdom не является layout/manual evidence. Проверки
consumer imports и paging regression выполнены. Предлагается подтвердить остаток
F-1.7 по запланированному QG-FE-MANUAL; полный suite/build — QG-FE-AUTO.

## 11. QG-ENV — окружение и migrations после освобождения стека (профиль: Quality Gate)

**Deliverable:** Q · **Specs:** все применимые · **Пути:** .qa/106-107-metrica-cleanup-page-merge/QG-ENV/** (evidence; продукт read-only) · **Зависит от:** Y-2, M-4, S-3, F-1

- [x] QG-ENV.1 Подтвердить prerequisite: текущая задача завершена, финальные 105 контракты сверены, approval получен; отсутствие подтверждения блокирует runtime
- [x] QG-ENV.2 Открыть stack-control skill и обнаружить service/compose support без исправления registry; спланировать targeted запуск
- [x] QG-ENV.3 Найти реальные DB контейнеры и безопасно получить docker inspect параметры без секретного env dump; передать QG-LIVE discovery
- [x] QG-ENV.4 Проверить migrations heads/additive backfill, queues/worker subscriptions и отсутствие старых ungated workers; зафиксировать выводы
- [x] QG-ENV.5 Проверить health и readiness producers/consumers, отдельные tenant fixtures и безопасные границы доступа; не считать health доказательством NATS readiness
- [x] QG-ENV.V Выполнить `stackctl discovery/ready для поддерживаемых сервисов; штатный service Compose для остальных`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit

## 12. QG-BE-Y — аудит и проверки services/yandex-service (профиль: Quality Gate)

**Deliverable:** Q · **Specs:** все backend capability своего сервиса · **Пути:** .qa/106-107-metrica-cleanup-page-merge/QG-BE-Y/**; services/yandex-service/** (только scoped format после передачи Router, без feature fixes) · **Зависит от:** QG-ENV

- [x] QG-BE-Y.1 Проверить Clean Architecture/Protocol/DI и только scoped diff сервиса; ownership не пересекается с другими аудитами
- [x] QG-BE-Y.2 Проверить migrations, constraints, backfill и rollback на реальной PostgreSQL; сохранить evidence без env/credentials
- [x] QG-BE-Y.3 Проверить concurrency/leases/atomicity и запрет resurrection по относящимся сценариям design; findings с точными anchors
- [x] QG-BE-Y.4 Выполнить UT-D-01..04/07, IT-D-01, полный suite и scoped lint/format сервиса; отсутствие инфраструктуры фиксировать как FAIL/blocked
- [x] QG-BE-Y.5 Проверить README/settings/HTTP error contract и отсутствие секретов; передать scoped findings Router без правки чужого кода
- [x] QG-BE-Y.V Выполнить `make -C services/yandex-service lint test test-infra; scoped format в lane по правилам QG`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit

## 13. QG-BE-M — аудит и проверки services/ya-metrica-service (профиль: Quality Gate)

**Deliverable:** Q · **Specs:** все backend capability своего сервиса · **Пути:** .qa/106-107-metrica-cleanup-page-merge/QG-BE-M/**; services/ya-metrica-service/** (только scoped format после передачи Router, без feature fixes) · **Зависит от:** QG-ENV

- [x] QG-BE-M.1 Проверить Clean Architecture/Protocol/DI и только scoped diff сервиса; ownership не пересекается с другими аудитами
- [x] QG-BE-M.2 Проверить migrations, constraints, backfill и rollback на реальной PostgreSQL; сохранить evidence без env/credentials
- [x] QG-BE-M.3 Проверить concurrency/leases/atomicity и запрет resurrection по относящимся сценариям design; findings с точными anchors
- [x] QG-BE-M.4 Выполнить UT-D-03..06, UT-N-02..04/06, IT-D-02, IT-N-02, полный suite и scoped lint/format сервиса; отсутствие инфраструктуры фиксировать как FAIL/blocked
- [x] QG-BE-M.5 Проверить README/settings/HTTP error contract и отсутствие секретов; передать scoped findings Router без правки чужого кода
- [x] QG-BE-M.V Выполнить `make -C services/ya-metrica-service lint test test-infra; scoped format в lane по правилам QG`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit

## 14. QG-BE-S — аудит и проверки services/seo-service (профиль: Quality Gate)

**Deliverable:** Q · **Specs:** все backend capability своего сервиса · **Пути:** .qa/106-107-metrica-cleanup-page-merge/QG-BE-S/**; services/seo-service/** (только scoped format после передачи Router, без feature fixes) · **Зависит от:** QG-ENV

- [x] QG-BE-S.1 Проверить Clean Architecture/Protocol/DI и только scoped diff сервиса; ownership не пересекается с другими аудитами
- [x] QG-BE-S.2 Проверить migrations, constraints, backfill и rollback на реальной PostgreSQL; сохранить evidence без env/credentials
- [x] QG-BE-S.3 Проверить concurrency/leases/atomicity и запрет resurrection по относящимся сценариям design; findings с точными anchors
- [x] QG-BE-S.4 Выполнить UT-N-01..02/04..07, IT-N-01, полный suite и scoped lint/format сервиса; отсутствие инфраструктуры фиксировать как FAIL/blocked
- [x] QG-BE-S.5 Проверить README/settings/HTTP error contract и отсутствие секретов; передать scoped findings Router без правки чужого кода
- [x] QG-BE-S.V Выполнить `make -C services/seo-service lint test test-infra; scoped format в lane по правилам QG`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit

## 15. QG-FE-AUTO — автоматизированный gate CMS (профиль: Quality Gate)

**Deliverable:** Q · **Specs:** cms-seo-yandex-ui · **Пути:** .qa/106-107-metrica-cleanup-page-merge/QG-FE-AUTO/**; services/frontend/** (только scoped format после передачи Router, без feature fixes) · **Зависит от:** QG-ENV

- [x] QG-FE-AUTO.1 Загрузить browser QA protocol; проверить FE-01..12 и fake timers deadline/Enter/entity reset
- [x] QG-FE-AUTO.2 Проверить mocks/MSW без live backend, permission revoked/401/403 и mutation guards; сохранить findings
- [x] QG-FE-AUTO.3 Проверить слой API/feature/UI и отсутствие site consumer mixing; scoped format/lint по правилам lane
- [x] QG-FE-AUTO.4 Выполнить полный npm test, typecheck и build; ошибки не скрывать локальным subset
- [x] QG-FE-AUTO.5 Передать QG-FE-MANUAL route/state/role context и список сценариев, не подменяя им визуальный отчёт
- [x] QG-FE-AUTO.V Выполнить `cd services/frontend && npm test && npm run lint && npm run typecheck && npm run build`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit

## 16. QG-CONTRACTS — AsyncAPI и real-broker acceptance (профиль: Quality Gate)

**Deliverable:** Q · **Specs:** metrica-maintenance-protocol и access deltas · **Пути:** .qa/106-107-metrica-cleanup-page-merge/QG-CONTRACTS/** (evidence; продукт read-only) · **Зависит от:** QG-ENV

- [x] QG-CONTRACTS.1 Сопоставить три AsyncAPI и runtime settings: owner, subjects, durable/filter, retention, ack/nak/term; topology не менять без approval
- [x] QG-CONTRACTS.2 Провалидировать каждый контракт существующим валидатором; не расширять root tooling при отсутствии удобной make цели
- [x] QG-CONTRACTS.3 Выполнить IT-N-03 на реальном брокере: invalid term, storage retry/redelivery, duplicated Msg-Id и повтор после broker window
- [x] QG-CONTRACTS.4 Проверить outbox/restart, порядок seal/parts и все result/finalized направления с bounded timeout и cleanup уникальных ресурсов
- [x] QG-CONTRACTS.5 Сверить HTTP access matrix/response DTO с финалом 105, нет токенов/PII в NATS; передать blocking discrepancies и evidence
- [x] QG-CONTRACTS.V Выполнить `существующая AsyncAPI validation по трём service файлам + IT-N-03 на реальном JetStream`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit

## 17. QG-LIVE — живой API и гонки обслуживания (профиль: Quality Gate)

**Deliverable:** Q · **Specs:** все backend capability · **Пути:** .qa/106-107-metrica-cleanup-page-merge/QG-LIVE/** (evidence; продукт read-only) · **Зависит от:** QG-BE-Y, QG-BE-M, QG-BE-S, QG-FE-AUTO, QG-CONTRACTS

- [x] QG-LIVE.1 Загрузить API smoke skill и проверить DB discovery из QG-ENV через безопасный docker inspect; реальные PostgreSQL обязательны
- [x] QG-LIVE.2 Подготовить изолированные tenant fixtures нескольких батчей без чтения/изменения чужих данных; evidence только в lane
- [ ] QG-LIVE.3 Выполнить SM-D-01..02, все anonymous/authenticated/foreign outcomes и commit/rollback persistence; timings/status/body без secrets
- [ ] QG-LIVE.4 Выполнить SM-N-01..03 с контролируемым running parse, задержанной delivery и cleanup/merge preemption; проверить суммы и порядок source delete
- [ ] QG-LIVE.5 Проверить fresh parse/reconcile после merge, cleanup fixtures и продемонстрировать отсутствие новых данных, удалённых поздней командой; failures документировать
- [ ] QG-LIVE.V Выполнить `SM-D-01..02, SM-N-01..03 через API smoke skill; реальные PostgreSQL/NATS`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit

## 18. QG-FE-MANUAL — scripted browser QA 1366×768 (профиль: Quality Gate)

**Deliverable:** Q · **Specs:** cms-seo-yandex-ui · **Пути:** .qa/106-107-metrica-cleanup-page-merge/QG-FE-MANUAL/** (evidence; продукт read-only) · **Зависит от:** QG-BE-Y, QG-BE-M, QG-BE-S, QG-FE-AUTO, QG-CONTRACTS

- [ ] QG-FE-MANUAL.1 Загрузить browser protocol и ui-qa/stack-control; подтвердить desktop viewport и controlled tenant/roles fixtures
- [ ] QG-FE-MANUAL.2 Выполнить Manual QA 1–3 scripted: auth states, последствия, countdown/Enter/отмена/повтор/pending
- [ ] QG-FE-MANUAL.3 Выполнить Manual QA 4–5: account icon, conditional cascade, backend errors, 401/403/404, paging и сохранение контекста
- [ ] QG-FE-MANUAL.4 Выполнить Manual QA 6–7: rebind/parse и нормализация истории; не пересекать destructive fixtures QG-LIVE
- [x] QG-FE-MANUAL.5 Выполнить шаг 8: визуальная инспекция и failed screenshots, console/network/axe, сохранить pass/fail evidence и короткий handoff
- [ ] QG-FE-MANUAL.V Выполнить `Manual QA шаги 1–8; scripted Playwright + screenshot/console/network/axe`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit

## 19. QG-SYNTH — общий вердикт и передача на финализацию (профиль: Quality Gate)

**Deliverable:** Q · **Specs:** все · **Пути:** docs/reports/106-107-metrica-cleanup-page-merge.md; .qa/106-107-metrica-cleanup-page-merge/QG-SYNTH/** · **Зависит от:** QG-LIVE, QG-FE-MANUAL

- [x] QG-SYNTH.1 Собрать scoped findings всех lanes и проверить coverage matrix, сохранение prerequisite и отсутствие пропущенных обязательных gate
- [ ] QG-SYNTH.2 Проверить устранение blockers владельцами и targeted повторную verification; незакрытое finding не отмечать выполненным
- [x] QG-SYNTH.3 Проверить связь evidence→scenario→task и что инфраструктура не отмечена PASS через skip; один общий вердикт
- [x] QG-SYNTH.4 Создать единственный итоговый docs/reports/106-107-metrica-cleanup-page-merge.md, не каталог и не промежуточные lane отчёты в docs
- [x] QG-SYNTH.5 Выполнить status/strict validation change, проверить фактически завершённые task IDs; передать Router approval/waiver и дальнейшие sync/archive gates без самостоятельного release
- [x] QG-SYNTH.V Выполнить `единый отчёт и openspec status/validate --strict`, сохранить scoped evidence, отметить только фактически выполненные IDs и вернуть Router финальный handoff по AGENTS.md; при blocker/перерасходе вернуть blocked/partial, не брать следующий unit

## Workflow follow-up

- После единого APPROVED (либо явно принятого waiver) Router устраняет оставшиеся findings в ownership-зонах с повторной targeted verification.
- По отдельным approval gates выполнить sync delta specs в main specs, повторную strict validation и archive; не делать эти действия на этапе PLAN-1 и не включать archive в отмечаемые implementation tasks.
- Затем штатная task-finalize процедура Router; merge/release/CI не являются полномочиями профильного исполнителя.


### FIX-Y-01 — canonical replay / PG outbox leases / README

Bounded fix findings QG-BE-Y; ownership только tests/integration/test_cleanup_nats_transport.py,
существующий tests/integration/test_metrica_lifecycle_postgres.py, README.md yandex-service и этот блок.
Продуктовый код, runtime, access policy и утверждённая identity не изменены.

- [x] FIX-Y-01.1 (Y-B01) Исправить canonical replay: прежний обязательный Nats-Msg-Id, явный выход за test-only duplicate_window, проверить новый PubAck.
- [x] FIX-Y-01.2 (Y-M01) Закрепить реальные PG concurrent claim, expired/current/stale fencing, reclaim с прежним envelope, due retry и terminal published; проверить relay mark после fake PubAck (обычного/duplicate) на реальной PG без DB lock при publish.
- [x] FIX-Y-01.3 (Y-M02, README-only) Удалить устаревшие утверждения о будущем completed consumer и IT-D-01.
- [x] FIX-Y-01.V Выполнить scoped ruff/format/flake8/mypy, targeted offline и real PG/NATS infra gate под общей flock; сохранить evidence.

Verification: scoped ruff/format/flake8 и MYPYPATH=src mypy двух изменённых файлов PASS;
offline outbox/completed **53 passed**; `make -C services/yandex-service test-infra`
под `.qa/106-107-metrica-cleanup-page-merge/infra-tests.lock`, с source закрытого
QG-ENV/yandex-test.env без вывода — **26 passed, 810 deselected**.
Evidence: `.qa/106-107-metrica-cleanup-page-merge/FIX-Y-01/verification.log`,
`test-infra-rerun.log`. Первый infra прогон 24 passed / 2 failed из-за сравнения
JSON datetime (Z / +00:00) в новом test harness; исправлено typed сравнением,
production дефекта не обнаружено. OpenSpec CLI недоступен (`openspec: command not found`),
контекст прочитан напрямую из назначенных файлов. Y-2.V и QG checkbox не изменены:
подтверждение общего gate остаётся за targeted recheck QG-BE-Y.

## FIX-M-01 — findings QG-BE-M (профиль: Backend)

- [x] FIX-M-01.1 (M01) Обновить frozen migration fixture/head/additive assertions и сохранить retained-ledger downgrade guard; проверить на выделенном PostgreSQL.
- [x] FIX-M-01.2 (M02) Использовать положительный lifecycle snapshot для обычных recovery/retry regressions, сохранив отдельные generation=0 cancellation проверки.
- [x] FIX-M-01.3 (M03) Сохранять cleanup attempts/error_code/backoff/failed_blocked в независимой fenced транзакции после rollback; проверить повторные ошибки batch/finalizer и stale/foreign lease.
- [x] FIX-M-01.4 (M04) Добавить постоянный concurrent PostgreSQL intent→run admission/replay тест с duplicate/cross-tenant/hash conflict.
- [x] FIX-M-01.V Выполнить targeted unit/real-PG regressions под общим flock и scoped format/lint/typecheck, сохранить evidence в FIX-M-01.

## FIX-C02 — fail-fast maintenance topology M/S (профиль: Backend)

Router-approved split: **FIX-C02a** — startup validation, новые topology suites и README
(tasks .1/.2/.3/.V); **FIX-C02b** — пять legacy topology mocks и объединённый regression
(task .R). Последовательные units одного startup slice, без расширения runtime scope.

- [x] FIX-C02.1 Проверять owner и все foreign maintenance streams через stream_info по canonical owner config; создавать только отсутствующий свой stream, никогда не исправлять existing config; SEO discard=new.
- [x] FIX-C02.2 Проверять existing durable до add_consumer, исключить silent update; MaintenanceTopologyError как BadRequestError для существующего fail-fast supervisor, сохранить bounded retry NotFound/transient network/503; legacy parse durable не менять.
- [x] FIX-C02.3 Добавить отдельные unit/integration test_maintenance_topology.py M/S: valid, TTL60, discard/storage/retention/limits/window, durable filter/ACK/wait/max-deliver; real isolated streams, cleanup под общим flock.
- [x] FIX-C02.V Scoped ruff/format/flake8 и basedpyright клиента, targeted новые unit и реальные broker topology тесты; transport README и evidence в `.qa/106-107-metrica-cleanup-page-merge/FIX-C02/`.
- [x] FIX-C02.R (FIX-C02b) По разрешению Router точечно адаптировать пять прежних topology mock tests в `tests/unit/test_maintenance_transport.py` (M) и `tests/unit/test_normalization_transport.py` (S): canonical SDK StreamInfo/ConsumerInfo, owner-only creation, startup lookup order, foreign bounded retry/fail-fast без обхода validation. Объединённые legacy transport + runtime + новые topology suites: M 149 passed, S 135 passed; real-broker topology повторно M/S по 26 passed. Scoped ruff/format/flake8/basedpyright изменённых тестов PASS; evidence `.qa/106-107-metrica-cleanup-page-merge/FIX-C02b/`.

FIX-C02a: M/S по 73 новых unit + 26 real-broker PASS. Real TTL60 fixture уменьшает
только своё duplicate_window до 60s (ограничение брокера dedup<=TTL); production остаётся 120s.
FIX-C02b закрывает прежний красный legacy regression gate (M 3/S 2 failures).
Real-broker повтор под общим flock, закрытые test.env без вывода; read-only cleanup check:
fixture_streams_remaining=[]; runtime/стек, рабочие данные и product client.py не менялись.
Общий QG и crossflow acceptance остаются за CONTRACTS-b, их checkbox не закрывались.
OpenSpec CLI недоступен (`openspec: command not found`); назначенный контекст прочитан напрямую.


## DEPLOY-CONFIG-1 — подготовка локальной runtime-конфигурации (профиль: Backend)

Router-approved bounded config-only unit; ownership: только allowlisted non-secret поля ignored `services/{yandex-service,ya-metrica-service,seo-service}/.env`, этот task-блок и `.qa/106-107-metrica-cleanup-page-merge/DEPLOY-CONFIG-1/`. Первый этап — без rollout, миграций, включения process flags или изменения tracked Compose/settings. Отложенная часть .5 после явного разрешения Router — только два maintenance-флага ON и config validation; без запуска контейнеров.

- [x] DEPLOY-CONFIG-1.1 Сверить QG-ENV, Migration Plan и settings; read-only Docker discovery подтвердить `eqsitecms_network`, broker DNS `eqsitecms-nats:4222` и формат NATS_SERVERS (comma-separated string → list).
- [x] DEPLOY-CONFIG-1.2 Подготовить `NATS_SERVERS=nats://eqsitecms-nats:4222` Y/M/S и container peer URLs; сохранить M `MAINTENANCE_RUNTIME_ENABLED=false`, S `SEO_NORMALIZATION_ENABLED=false`, остальные process/recovery knobs без изменений.
- [x] DEPLOY-CONFIG-1.3 Проверить in-memory побайтовую неизменность всех non-allowlisted полей/секретов и permissions; выполнить реальный Pydantic parsing Y/M/S и три service Compose `config --quiet` без env/secret dump.
- [x] DEPLOY-CONFIG-1.4 Записать точные project/file/service команды будущих migrations/recreate/enable и readiness/CONTRACTS prerequisites без выполнения; явно сохранить OFF и отсутствие runtime acceptance.
- [x] DEPLOY-CONFIG-1.5 Отложенная часть по повторному разрешению Router после CONTRACTS-b PASS, drain/backup/migrations/backfill: изменить только M `MAINTENANCE_RUNTIME_ENABLED=true` и S `SEO_NORMALIZATION_ENABLED=true`; проверить ON settings/Compose и Docker DNS, сохранить прочие байты/permissions. Контейнеры НЕ запускать/не пересоздавать; operational readiness остаётся за Router. Evidence: `activation-configuration.json`, `activation-prerequisites.json`, `validation-on.json` в своей QA-папке.
- [x] DEPLOY-CONFIG-1.V Сохранить redacted evidence и handoff в `.qa/106-107-metrica-cleanup-page-merge/DEPLOY-CONFIG-1/`; не закрывать QG-ENV.4/.5 и другие acceptance tasks.

Checkpoint: settings Y 4/M 3/S 4 класса и Compose config (включая opt-in profiles) PASS. Контейнеры не останавливались/не пересоздавались, рабочие данные и topology не менялись; новые env работающим процессам ещё не доставлены. OpenSpec CLI отсутствует; назначенный контекст прочитан напрямую, CLI/tooling не исправлялись. Runtime activation остаётся за Router после CONTRACTS-b acceptance, migrations/backfill, drain/fencing и readiness. Команды: `.qa/106-107-metrica-cleanup-page-merge/DEPLOY-CONFIG-1/handoff.md`.

Отложенный checkpoint DEPLOY-CONFIG-1.5: M/S flags ON, Y/M/S settings (4/3/4 класса), allowlisted Docker peer URLs/NATS и Compose config с profiles PASS; все остальные байты `.env` и permissions сохранены. Router сообщил heads Y `9e106a107001`, M/S `20261102_0004`, CONTRACTS-b PASS и завершённые backup/drain/backfill; этим unit DB повторно не проверялась. Только read-only Docker metadata и backup stat; запуск/пересоздание контейнеров не выполнялись. Текущее состояние и команды в handoff; `prepare.py` НЕ перезапускать.

## FIX-F-01 — scroll region и возврат фокуса (профиль: Frontend)

- [ ] FIX-F-01 Исправить MAN-A11Y-01/MAN-FOCUS-02: явная focusability/semantics scrollable content, устойчивый возврат к counter button/account icon при cancel/close с учётом entity/unmount; component regressions deadline/Tab/pending/restore, scoped lint/typecheck. Long-error layout не перепроектировать; validation arrays, shared theme/API client/backend и pre-existing refresh вне scope. Browser axe/layout/keyboard перепроверяет QG после rebuild Router.


Checkpoint FIX-F-01: именованный scroll-region с tabIndex=0, сохранены ширина/max-height/overflow и AntD focus trap; возврат фокуса consequence session при cancel/close, entity remount не завершает session, удалённые/disabled opener не фокусируются. Scoped component/deadline tests 84 passed; финальный accessibility regression 8 passed; scoped format, lint (0 errors) и typecheck PASS. Evidence/targeted QG recheck: `.qa/106-107-metrica-cleanup-page-merge/FIX-F-01/handoff.md`. Browser не запускался: MAN-A11Y-01/MAN-FOCUS-02 и F-1.7 ожидают recheck тем же QG после rebuild Router. Validation arrays/shared theme/API client/backend/pre-existing refresh не изменялись.

## FIX-F-02 — Escape вложенного account confirmation (профиль: Frontend)

- [ ] FIX-F-02 Воспроизвести nested Escape propagation и локально изолировать Escape account consequence modal от wizard: без pending закрывается только confirmation с возвратом focus, при pending оба диалога остаются; сохранить deadline/Tab/focusability, добавить component regressions и scoped lint/typecheck. Глобальная клавиатура, validation arrays/API client/theme/backend вне scope; rebuild и единственный browser recheck выполняют Router/QG.

## FIX-LIVE-01 — LIVE-C01: SEO private binding DTO (профиль: Backend)

- [x] FIX-LIVE-01.1 Явно принять обязательные lifecycle `binding_generation`, `cleanup_requested_seq`, `cleanup_completed_seq` как strict nonnegative int в SEO connected-counter DTO, включая counter=null; сохранить extra=forbid, identity check и authoritative admission в M.
- [x] FIX-LIVE-01.2 Добавить paired real producer serialization→consumer contract (present/null), invalid/missing lifecycle fail-closed и parse POST regression через настоящий Yandex client/provider/dispatch: 202 после publication при binding с pending cleanup, 400 missing, 502 malformed/foreign, 503 broker; credential-less/с Cookie-Bearer без изменения selector policy.
- [x] FIX-LIVE-01.V Targeted client/schema/provider/manual dispatch/API/access suites: 299 passed; scoped ruff check/format-check, flake8, mypy пяти файлов PASS. Evidence `.qa/106-107-metrica-cleanup-page-merge/FIX-LIVE-01/`. Runtime/данные/внешний OAuth не использовались; live recheck после rebuild выполняет QG-LIVE. OpenSpec CLI недоступен (`openspec: command not found`), checklist обновлён точечно вручную.


Checkpoint FIX-F-02: pending nested Escape воспроизведён component тестом до fix (оба диалога исчезают). Opt-in isolateEscape включён только для account confirmation: wrapper capture поглощает только Escape, без pending вызывает только child onCancel, при pending не вызывает cancel. Tab/focus trap, region/layout, focus-return hook, deadline и permissions не менялись. Scoped regressions 91 passed / 6 files; scoped format, lint (0 errors), typecheck PASS. Evidence/инструкция единственного browser recheck после rebuild Router: `.qa/106-107-metrica-cleanup-page-merge/FIX-F-02/handoff.md`. Стек/build/browser не запускались, F-1.7 не отмечен.


### Checkpoint QG-SYNTH — финальный синтез без новых прогонов

Вердикт REWORK: MAN-FOCUS-02 unresolved после FIX-F-02; waiver не предоставлен. FIX-F-01/FIX-F-02 вновь открыты как составные требования исправления: код и component verification выполнены, но account Escape acceptance не подтверждён. F-1.7 открыт. QG-FE-MANUAL.5 отмечен только как фиксация evidence, не успешный manual gate. QG-LIVE.3/.4/.5/.V и QG-FE-MANUAL.1–4/.V остаются открытыми из-за частичного обязательного покрытия. QG-SYNTH.2 открыт до устранения MAN-FOCUS-02. M-4.7/.V консервативно открыты: первоначальные full infrastructure FAIL устранены targeted, нового полного PASS после fixes не заявлено. Остальные поднятые M/S storage/domain acceptance опираются на реальные PG/компонентные проверки BE/CONTRACTS, не на неполный vendor LIVE. Итог: docs/reports/106-107-metrica-cleanup-page-merge.md; детализация отметок: .qa/106-107-metrica-cleanup-page-merge/QG-SYNTH/task-serialization.json. Sync/archive/release не разрешены.
