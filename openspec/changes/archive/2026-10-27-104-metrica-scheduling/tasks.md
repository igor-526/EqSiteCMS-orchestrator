# Tasks — 104-metrica-scheduling

Ownership (A–F), DAG, test matrix, access matrix, Manual QA и PostgreSQL-параметры находятся в `design.md`; apply — только после явного approval. Каждый unit меняет только свои пути, сразу отмечает лишь выполненные ID и возвращает handoff по формату `AGENTS.md`; evidence — только в `.qa/104-metrica-scheduling/`. Source task и `docs/plans` read-only. Smoke — только через `.claude/skills/api-smoke-test` на реальных PostgreSQL и NATS. Профиль Quality Gate — **`QG-FULL`**.

`contextFiles` перечислены **по units**, а не общим списком на весь change. Пути вида `src/...`/`tests/...` — относительно `services/<сервис>/` соответствующего unit; `design.md#…`/`specs/…` — относительно change.

## Execution units

| Unit | Профиль | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| `YS-1` | Backend | C: `services/yandex-service/{src,tests,README.md}` | approval | `make -C services/yandex-service test`, `UT-YB-01`, `IT-YB-01` | `design.md#d8-yandex-service-список-привязок`, `specs/yandex-metrica-binding-list/spec.md`, `src/api/yandex_connections.py`, `src/core/services/yandex_metrica_counter_service.py`, `src/repositories/yandex_metrica_counter_repository.py`, `src/core/schemas/api/yandex_metrica_counters.py`, `tests/api/test_yandex_connections.py`, `tests/integration/test_counter_repository_postgres.py` |
| `MT-1` | Backend | A: ya-metrica migration/model/entity/repository/enqueue | approval | targeted `UT-MP-04`, `IT-MP-01` | `design.md#d7-исполнитель-ya-metrica-service`, `specs/metrica-parse-command-consumer/spec.md`, `src/models/metrica_parse.py`, `src/core/entities/metrica_parse.py`, `src/repositories/metrica_parse_run_repository.py`, `src/core/protocols/repositories/metrica_parse.py`, `src/core/services/parse_enqueue_service.py`, `src/migration/versions/20261026_0002_metrica_stats.py`, `tests/unit/test_migrations.py` |
| `MT-2` | Backend | A: ya-metrica payload/handler, удаление M2 | `MT-1` | targeted `UT-MP-01..03,08` | `design.md#d7-исполнитель-ya-metrica-service`, `design.md#d2-nats-топология`, `specs/metrica-parse-command-consumer/spec.md`, `specs/metrica-parse-trigger/spec.md`, `src/api/parse.py`, `src/core/schemas/api/parse.py`, `src/core/schemas/parse.py`, `src/main.py`, `src/core/services/parse_date_resolver.py`, `tests/api/test_parse_api.py`, `tests/unit/test_change_guards.py`; handoff MT-1 |
| `MT-3` | Backend | A: ya-metrica NATS client/consumer/lifespan/settings | `MT-2` | targeted `UT-MP-05..07,09` | `design.md#d2-nats-топология`, `design.md#d7-исполнитель-ya-metrica-service`, `specs/parse-job-messaging/spec.md`, `specs/metrica-parse-command-consumer/spec.md`, `agents/howto/nats-jetstream-protocols.md` (секции Consuming, Streams и Consumers), `src/settings.py`, `src/containers/application.py`, `src/containers/settings.py`, `src/main.py`, `src/utils/configure_sentry.py`, `pyproject.toml`; vk-service `src/clients/nats/**` как образец; handoff MT-2 |
| `MT-4` | Backend | A: ya-metrica AsyncAPI/README/.env.example/real-broker test | `MT-3` | `IT-NATS-M1` + `make -C services/ya-metrica-service test` | `design.md#d2-nats-топология`, `design.md#access-matrix`, `specs/parse-job-messaging/spec.md`, vk-service `docs/asyncapi.yaml` (образец), `README.md`, `.env.example`, `tests/integration/conftest.py`; handoffs MT-2/MT-3 |
| `SEO-1` | Backend | B: seo settings/NATS client/schema/publisher | approval | targeted `UT-PS-01,06..08` | `design.md#d2-nats-топология`, `design.md#d4-расписание-и-часовой-пояс`, `specs/parse-job-messaging/spec.md`, `specs/seo-parse-scheduling/spec.md`, `agents/howto/nats-jetstream-protocols.md` (Publishing, Streams и Consumers), `src/settings.py`, `src/utils/configure_sentry.py`, `pyproject.toml`, `tests/unit/test_settings.py`; notification-service `src/clients/nats/{client,lifecycle,publisher}.py` как образец |
| `SEO-2` | Backend | B: seo ledger (model/migration/entity/repository) | approval | targeted `IT-PS-01..02` | `design.md#d5-ledger-диспетчеризации-parse_dispatches-postgresql-seo-service`, `specs/seo-parse-scheduling/spec.md`, `src/models/blacklisted_hashes.py`, `src/models/__init__.py`, `src/migration/versions/20261023_0002_seo_queries_pages.py`, `src/repositories/abstract_repository.py`, `src/repositories/__init__.py`, `src/containers/repositories.py`, `tests/integration/conftest.py`, `tests/integration/test_migrations_postgres.py` |
| `SEO-3` | Backend | B: seo provider protocol/registry/yandex client/ya_metrica provider | `SEO-1`, `SEO-2` | targeted `UT-PS-03..05` | `design.md#d3-расширяемость-provider-registry`, `specs/seo-parse-scheduling/spec.md`, `specs/yandex-metrica-binding-list/spec.md`, `src/clients/ya_metrica.py`, `src/core/protocols/clients/ya_metrica.py`, `src/core/exceptions/base.py`, `src/containers/clients.py`, `src/settings.py`; handoffs SEO-1/SEO-2 |
| `SEO-4` | Backend | B: seo dispatch service/slot calc/timezone provider/DI | `SEO-3` | targeted `UT-PS-02,09,10` | `design.md#d4-расписание-и-часовой-пояс`, `design.md#d5-ledger-диспетчеризации-parse_dispatches-postgresql-seo-service`, `design.md#d6-ручной-запуск`, `specs/seo-parse-scheduling/spec.md`, `specs/seo-parse-trigger-api/spec.md`, `src/containers/services.py`, `src/core/services/metrics_period/__init__.py`; handoffs SEO-1..3 |
| `SEO-5` | Backend | B: seo API `parse-jobs`, lifespan NATS, 503 handler | `SEO-4` | `make -C services/seo-service test` (без infrastructure) | `design.md#d6-ручной-запуск`, `design.md#access-matrix`, `specs/seo-parse-trigger-api/spec.md`, `specs/seo-peer-http-contract/spec.md`, `src/main.py`, `src/api/{route,pages,__init__}.py`, `src/depends/tenant.py`, `src/core/exceptions/base.py`, `tests/api/{conftest,test_access}.py`; handoff SEO-4 |
| `SEO-6` | Backend | B: seo scheduler process | `SEO-4` | targeted `UT-PS-11` + `IT-NATS-S1` | `design.md#d1-оркестратор-seo-service-scheduler-отдельный-контейнер`, `design.md#d4-расписание-и-часовой-пояс`, `specs/seo-parse-scheduling/spec.md`, `src/utils/database.py`, `src/containers/application.py`, `Dockerfile`; handoffs SEO-1..4 |
| `SEO-7` | Backend | B + root: seo README/.env.example/AsyncAPI, compose, Makefile, SERVICES.md | `SEO-5`, `SEO-6`, `MT-4`, `YS-1` | `make asyncapi-validate-parse`, `docker compose config`, `make -C services/seo-service test` | `design.md#d10-инфраструктура-и-документация`, `design.md#access-matrix`, `specs/parse-job-messaging/spec.md`, `specs/seo-parse-scheduling/spec.md`, `.docker-compose/docker-compose.seo.yml`, `.docker-compose/docker-compose.ya_metrica.yml` (образец beat), `Makefile` (цели `asyncapi-validate*`), `SERVICES.md` (разд. 8–10), seo `README.md`, `.env.example`; handoffs SEO-5/SEO-6/MT-4/YS-1 |
| `BK-1` | Backend | D: backend SEO client/protocol/proxy/route/schemas/inventory | approval | `make -C services/backend test` | `design.md#d6-ручной-запуск`, `design.md#access-matrix`, `specs/seo-parse-trigger-api/spec.md`, `specs/seo-backend-proxy/spec.md`, `src/api/seo.py`, `src/core/services/seo_proxy.py`, `src/core/protocols/seo_service.py`, `src/clients/seo_service/{client,schemas}.py`, `maintain/route_inventory.py`, `docs/backend-route-inventory.md`, `tests/unit/api/{test_seo_proxy_api,test_seo_client_boundary,test_route_access_inventory}.py` |
| `FE-1a` | Frontend | E: types/api/scope/`ConfirmActionModal` props (FE-1.1/.2/.4/.6) | approval | targeted vitest `FT-PR-01/03` | `design.md#d9-frontend`, `design.md#test-matrix` (frontend), `specs/cms-seo-parse-refresh-ui/spec.md`, `src/api/seo.ts`, `src/api/seo.test.ts`, `src/types/api/seo.ts`, `src/features/seo/services/seoDataService.ts`, `src/features/seo/hooks/useSeoScopes.ts`, `src/features/seo/hooks/usePageNormalization.ts` (образец mutation hook), `src/features/seo/ui/ConfirmActionModal.tsx` |
| `FE-1b` | Frontend | E: shared client HTTP status (opt-in), service/hook, tests; FE-1.3/.5/.7/.8/.V | `FE-1a`; Router approval расширенного ownership | targeted vitest `FT-PR-01..04`, shared client regression + typecheck | FE-1 contextFiles; `src/api/client.ts`, `src/types/api/api.ts`, `src/api/client.test.ts`; handoff FE-1a |
| `FE-2` | Frontend | E: `SeoPage` кнопка/модалка/стили | `FE-1b` | targeted vitest `FT-PR-05..06` + `npm run typecheck` | `design.md#d9-frontend`, `design.md#manual-qa-steps-ui-тестирование`, `specs/cms-seo-parse-refresh-ui/spec.md`, `src/features/seo/ui/SeoPage.tsx`, `src/features/seo/ui/SeoPage.test.tsx`, `src/features/seo/ui/seoStyles.ts`, `src/features/seo/ui/ConfirmActionModal.tsx`; handoff FE-1 |
| `QG-ENV` | Quality Gate | F: readiness/evidence | все исполнители | readiness-группа | `design.md#postgresql-для-smoke-тестов`, `design.md#migration-plan`, `.docker-compose/docker-compose.seo.yml`, `.docker-compose/docker-compose.ya_metrica.yml`; handoffs исполнителей |
| `QG-BE` | Quality Gate | F: Python review/verification (seo, ya-metrica, yandex, backend) | `QG-ENV` | scoped format/lint/test 4 сервисов | `design.md#test-matrix` (backend), `design.md#deliverables-и-ownership`, delta specs backend-части; path-scoped diff и handoffs |
| `QG-FE-AUTO` | Quality Gate | F: CMS automated | `QG-ENV` | `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` | `design.md#test-matrix` (frontend), `specs/cms-seo-parse-refresh-ui/spec.md`, `agents/howto/browser-qa-protocol.md` (раздел AUTO); FE diff/handoffs |
| `QG-CONTRACTS` | Quality Gate | F: access matrix, AsyncAPI, real-broker | `QG-ENV` | `make asyncapi-validate-parse`, access matrix, `IT-NATS-S1`, `IT-NATS-M1` без skip | `design.md#access-matrix`, `design.md#d2-nats-топология`, `specs/parse-job-messaging/spec.md`, все delta specs; AsyncAPI seo/ya-metrica, settings обоих сервисов |
| `QG-LIVE` | Quality Gate | F: live API/NATS/ledger evidence | `QG-BE`, `QG-FE-AUTO`, `QG-CONTRACTS` | `SM-PS-01..09` | `design.md#test-matrix` (Live API), `design.md#postgresql-для-smoke-тестов`, `design.md#access-matrix`; ENV handoff и findings lanes |
| `QG-FE-MANUAL` | Quality Gate | F: browser evidence 1366×768 | `QG-BE`, `QG-FE-AUTO`, `QG-CONTRACTS` | `M-PR-01..16` (шаги 1–16 Manual QA) | `design.md#manual-qa-steps-ui-тестирование`, `specs/cms-seo-parse-refresh-ui/spec.md`, `agents/howto/browser-qa-protocol.md`, `.agents/skills/ui-qa`; ENV и FE-AUTO handoffs |
| `QG-SYNTH` | Quality Gate | F: `docs/reports/104-metrica-scheduling.md` | `QG-LIVE`, `QG-FE-MANUAL` | единый вердикт | `design.md#test-matrix`, `design.md#risks--trade-offs`, `tasks.md`; findings/handoffs lanes |

DAG и порядок волн — `design.md#dag`. Параллельны: `YS-1`, `MT-1`, `SEO-1`, `SEO-2`, `BK-1`, `FE-1` (разные сервисы/пути; внутри одного сервиса — последовательно).

## 1. YS-1 — список привязок счётчиков в yandex-service (профиль: Backend)

**Specs:** `yandex-metrica-binding-list`, `yandex-peer-http-contract` · **Пути:** `services/yandex-service/**` · **Зависит от:** approval

- [x] YS-1.1 Добавить в `YandexMetricaCounterRepositoryProtocol` и `YandexMetricaCounterRepository` методы `list_paginated(limit, offset)` (ORDER BY `equestrian_id`) и `count()`; проверить типы и отсутствие N+1.
- [x] YS-1.2 Добавить DTO `YandexMetricaBindingItemOutDto` (`equestrian_id`, `counter_id`) и `YandexMetricaBindingListOutDto` (`total`, `items`), экспортировать из `core/schemas/api`; проверить, что секретных полей нет.
- [x] YS-1.3 Добавить `YandexMetricaCounterService.list_bindings(limit, offset)`; проверить unit-вызовом с fake-репозиторием.
- [x] YS-1.4 Добавить `GET /metrica` в `api/yandex_connections.py` (`limit` 1..500 default 100, `offset` ≥0, `response_model`), убедиться, что `/metrica/{equestrian_id}` не затенён; проверить через openapi.
- [x] YS-1.5 Реализовать и прогнать `UT-YB-01` (anonymous = cookie/Bearer, границы пагинации → 400, ровно два поля, `total`) в `tests/api/test_yandex_connections.py`.
- [x] YS-1.6 Реализовать и прогнать `IT-YB-01` на реальной PostgreSQL (`TEST_DATABASE_URL`, сортировка, страницы 100/100/50, offset за пределами, `total`).
- [x] YS-1.7 Добавить строку Y10 и описание endpoint в README yandex-service (access matrix, причина исключения); сверить со `specs/yandex-metrica-binding-list`.
- [x] YS-1.V Прогнать `make -C services/yandex-service test`, `make lint`, отметить выполненные ID и вернуть handoff (точный JSON-контракт Y10).

## 2. MT-1 — `job_id` в запуске парсинга (профиль: Backend)

**Specs:** `metrica-parse-command-consumer` · **Пути:** `services/ya-metrica-service/**` (migration/model/entity/repository/enqueue) · **Зависит от:** approval

- [x] MT-1.1 Создать миграцию `20261028_0003_run_job_id.py` (nullable `job_id uuid`, уникальный индекс, `down_revision=20261026_0002`, обратимая); проверить `alembic upgrade/downgrade` в `tests/unit/test_migrations.py`.
- [x] MT-1.2 Добавить колонку `job_id` в `models/metrica_parse.py` и поле `ParseRun.job_id: UUID | None`; проверить совпадение модели и миграции.
- [x] MT-1.3 Расширить `ParseRunRepositoryProtocol`/`ParseRunRepository`: `create_run_with_tasks` отличает конфликт `job_id` от активного запуска, добавить `exists_job(job_id)`; проверить на PostgreSQL.
- [x] MT-1.4 Добавить доменное исключение дубликата `job_id` (`core/exceptions/parse.py`) и параметр `job_id` в `ParseEnqueueService.enqueue` (при дубликате — исключение без заданий и без dispatch; `job_id=None` — прежнее поведение).
- [x] MT-1.5 Реализовать и прогнать `UT-MP-04` в `tests/unit/test_parse_enqueue_service.py`.
- [x] MT-1.6 Реализовать и прогнать `IT-MP-01` (миграция на реальной PostgreSQL, `NULL` у старых run, конфликт `job_id`) в `tests/integration/test_tasks_repository_postgres.py`.
- [x] MT-1.V Прогнать targeted `UT-MP-04`, `IT-MP-01` и `tests/unit/test_migrations.py`, отметить ID и вернуть handoff (имя исключения дубликата, сигнатура `enqueue`).

## 3. MT-2 — payload, handler, удаление ручного endpoint (профиль: Backend)

**Specs:** `metrica-parse-command-consumer`, `metrica-parse-trigger` (REMOVED/MODIFIED), `yandex-peer-http-contract` · **Пути:** `services/ya-metrica-service/**` · **Зависит от:** `MT-1`

- [x] MT-2.1 Добавить модель `ParseCommand` (`core/schemas/messaging/parse_command.py`): `schema_version=1`, envelope по `design.md#d2-nats-топология`, `window` auto/explicit, `params` пустой для `ya_metrica`, `extra=forbid`, константа `NAMESPACE_PARSE_COMMANDS`; проверить `UT-MP-01`.
- [x] MT-2.2 Добавить `PermanentCommandError` и handler `clients/nats/handlers/parse_run.py` (`handle(payload, headers)`): валидация, сверка provider/subject, вызов `ParseEnqueueService.enqueue(job_id=…)`, преобразование `window` в даты.
- [x] MT-2.3 Реализовать карту исходов в handler: success/дубликат/`ParseAlreadyActiveError`/`MetricaBindingMissingError`/`ParseRangeError` → возврат (ack) с логом; битое → `PermanentCommandError` (term); `YandexIntegrationUnavailableError`/ошибки хранилища → проброс (nak); логи без секретов.
- [x] MT-2.4 Реализовать и прогнать `UT-MP-01`, `UT-MP-02` (схема, карта исходов, лог без секретов).
- [x] MT-2.5 Реализовать и прогнать `UT-MP-03` (команда `auto`: вчера→2 дня, нет статистики→2 года, пропуск дней, старше 2 лет) в `test_parse_date_resolver.py`/`test_parse_enqueue_service.py`; при необходимости — только тесты, логику резолвера не менять.
- [x] MT-2.6 Удалить `src/api/parse.py`, `core/schemas/api/parse.py`, `parse_router` из `main.py` и `tests/api/test_parse_api.py`; внутренние `core/schemas/parse.py` оставить; проверить, что M1/M3–M6/H1 не затронуты.
- [x] MT-2.7 Реализовать и прогнать `UT-MP-08` (`tests/api/test_parse_removed_api.py`: старый путь anonymous и с cookie/Bearer → `400`, маршрута нет в openapi) и обновить `tests/unit/test_change_guards.py`.
- [x] MT-2.V Прогнать targeted `UT-MP-01..03,08` и существующие API-тесты M1/M3–M6, отметить ID и вернуть handoff (сигнатура handler, `PermanentCommandError`).

## 4. MT-3 — NATS-клиент, consumer и lifespan в ya-metrica-service (профиль: Backend)

**Specs:** `parse-job-messaging`, `metrica-parse-command-consumer` · **Пути:** `services/ya-metrica-service/**` · **Зависит от:** `MT-2`

- [x] MT-3.1 Добавить `nats-py>=2.15.0` в `pyproject.toml` и обновить `uv.lock`; проверить `uv sync --locked`.
- [x] MT-3.2 Добавить `NatsSettings` в `settings.py` (`NATS_*`: servers с default `nats://eqsitecms-nats:4222`, stream, subject, durable, ack_wait, max_deliver, fetch batch/timeout, setup retries, error report) и провайдер в `containers/settings.py`; проверить `UT-MP-09`.
- [x] MT-3.3 Добавить `clients/nats/lifecycle.py` (`NatsConnectionErrorPolicy`) и `ignore_logger("nats.aio.client")` в `utils/configure_sentry.py`; проверить эскалацию один раз за инцидент.
- [x] MT-3.4 Добавить `clients/nats/client.py`: connect/close (drain терпит reconnect), `setup_streams()` — no-op, `setup_consumers()` — durable `ya-metrica-parse-run` с retry только на `NotFoundError`; проверить `UT-MP-06`.
- [x] MT-3.5 Добавить `clients/nats/consumers/parse_run.py` (pull, fetch timeout → continue, ack/`term` на `PermanentCommandError`/`nak` на прочие, cancel); проверить `UT-MP-05`.
- [x] MT-3.6 Подключить клиент, consumer и handler в `containers/**` (handler строит request-local граф через `create_parse_services(worker_session)`); проверить `tests/unit/test_containers.py`.
- [x] MT-3.7 Добавить в `lifespan` `main.py` фоновый supervisor: connect/setup/start с backoff при недоступном NATS, корректный stop; `/health` остаётся статическим; проверить `UT-MP-07`.
- [x] MT-3.V Прогнать targeted `UT-MP-05..07,09` и `tests/unit/test_containers.py`, отметить ID и вернуть handoff (имена settings, durable, команда запуска).

## 5. MT-4 — AsyncAPI, README, .env.example и real-broker gate ya-metrica-service (профиль: Backend)

**Specs:** `parse-job-messaging` · **Пути:** `services/ya-metrica-service/{docs,README.md,.env.example,tests/integration}` · **Зависит от:** `MT-3`

- [x] MT-4.1 Создать `docs/asyncapi.yaml` (consumer): channel `commands.parse.ya_metrica.run`, stream `PARSE_COMMANDS`, durable, ack, headers `Nats-Msg-Id`, payload envelope; сверить с `ParseCommand` и settings.
- [x] MT-4.2 Обновить `README.md`: секция «NATS JetStream» (таблица stream/subject/durable/роль), удалить M2 из таблицы peer-endpoints, добавить Описание карты исходов и согласование `YA_METRICA_UTC_OFFSET_HOURS` с `SEO_UTC_OFFSET_HOURS`.
- [x] MT-4.3 Добавить переменные `NATS_*` и комментарий о поясе в `.env.example` (реальный `.env` не править).
- [x] MT-4.4 Реализовать `IT-NATS-M1` в `tests/integration/test_nats_broker.py` (marker `infrastructure`, env `TEST_NATS_URL`, уникальные имена и cleanup, отсутствие брокера = fail): durable/filter, explicit ack, nak/redelivery, `max_deliver`, `term`.
- [x] MT-4.V Выполнить `IT-NATS-M1` на реальном NATS и один раз `make -C services/ya-metrica-service test` (+ `make lint`), отметить ID и вернуть handoff.

## 6. SEO-1 — настройки, NATS-клиент, envelope и publisher seo-service (профиль: Backend)

**Specs:** `parse-job-messaging`, `seo-parse-scheduling` · **Пути:** `services/seo-service/**` (settings, `clients/nats`, `core/schemas/messaging`) · **Зависит от:** approval

- [x] SEO-1.1 Добавить `nats-py>=2.15.0` в `pyproject.toml`, обновить `uv.lock`; проверить `uv sync --locked`.
- [x] SEO-1.2 Расширить `settings.py`: `NatsSettings` (`NATS_*`, stream `PARSE_COMMANDS`, subjects `commands.parse.>`, `NATS_PARSE_COMMANDS_MAX_AGE_SECONDS`) и `ParseSettings` (`PARSE_SCHEDULE_ENABLED/TIME`, `PARSE_SCHEDULER_TICK_SECONDS`, `PARSE_PROVIDERS_ENABLED`, `PARSE_TARGETS_PAGE_SIZE`, `PARSE_DISPATCH_MAX_ATTEMPTS`, `YANDEX_SERVICE_URL`, `YANDEX_SERVICE_TIMEOUT_SECONDS`) с валидацией; проверить `UT-PS-01`.
- [x] SEO-1.3 Добавить `clients/nats/lifecycle.py` (политика ошибок) и `ignore_logger("nats.aio.client")` в `utils/configure_sentry.py`.
- [x] SEO-1.4 Добавить `clients/nats/client.py`: connect/close, `setup_streams()` — программный `add_stream(PARSE_COMMANDS)` (FILE, LIMITS, `max_age`), `setup_consumers()` — no-op, `publish()`; проверить `UT-PS-08`.
- [x] SEO-1.5 Добавить `core/schemas/messaging/` (`ParseCommand`, `ParseWindow`, `NAMESPACE_PARSE_COMMANDS`, функции `schedule_job_id`/`msg_id`); проверить `UT-PS-06`.
- [x] SEO-1.6 Добавить `clients/nats/publisher.py` (`ParseCommandPublisher`: `Nats-Msg-Id`, проверка `PubAck.duplicate`, `ParseQueueUnavailableError` при сбое/таймауте, результат с признаком duplicate); проверить `UT-PS-07`.
- [x] SEO-1.7 Реализовать и прогнать `UT-PS-01`, `UT-PS-06` (настройки, envelope, детерминированные ID).
- [x] SEO-1.8 Реализовать и прогнать `UT-PS-07`, `UT-PS-08` (publisher, topology клиента).
- [x] SEO-1.V Прогнать targeted unit-тесты SEO-1 и `make lint` seo, отметить ID и вернуть handoff (имена settings, публичные классы publisher/client).

## 7. SEO-2 — ledger `parse_dispatches` (профиль: Backend)

**Specs:** `seo-parse-scheduling` · **Пути:** `services/seo-service/**` (models, migration, entity, repository) · **Зависит от:** approval

- [x] SEO-2.1 Добавить таблицу `models/parse_dispatches.py` по `design.md#d5-…` (partial unique index, CHECK на `schedule_date`), зарегистрировать в `models/__init__.py`.
- [x] SEO-2.2 Создать миграцию `20261028_0003_parse_dispatches.py` (`down_revision=20261023_0002`, обратимая); проверить `IT-PS-01`.
- [x] SEO-2.3 Добавить entity `core/entities/parse_dispatch.py` (статусы, `trigger`) и Protocol `ParseDispatchRepositoryProtocol` (`claim_schedule`, `mark_published`, `mark_failed`, `record_manual`).
- [x] SEO-2.4 Реализовать `repositories/parse_dispatch_repository.py`: захват `INSERT … ON CONFLICT DO UPDATE … WHERE` (failed с attempts < max либо просроченный pending), короткие транзакции; зарегистрировать в `repositories/__init__.py` и `containers/repositories.py`.
- [x] SEO-2.5 Реализовать и прогнать `IT-PS-01` (upgrade/downgrade на реальной PostgreSQL, индекс, CHECK) в `tests/integration/test_migrations_postgres.py`.
- [x] SEO-2.6 Реализовать и прогнать `IT-PS-02` (параллельный захват, reclaim failed/stale pending, manual не конфликтует) в `tests/integration/test_parse_dispatch_postgres.py`.
- [x] SEO-2.V Прогнать targeted PostgreSQL-тесты SEO-2 (`TEST_DATABASE_URL`) и `make lint`, отметить ID и вернуть handoff (методы репозитория, имена статусов).

## 8. SEO-3 — провайдеры парсинга и реестр (профиль: Backend)

**Specs:** `seo-parse-scheduling`, `yandex-metrica-binding-list` · **Пути:** `services/seo-service/**` (protocols, registry, providers, client) · **Зависит от:** `SEO-1`, `SEO-2`

- [x] SEO-3.1 Добавить `ParseProviderProtocol` и DTO цели (`core/protocols/parsing/provider.py`) по `design.md#d3-…`.
- [x] SEO-3.2 Добавить `ParseProviderRegistry` (`core/services/parsing/registry.py`: register/get/enabled, дубль кода, неизвестный/отключённый) и валидацию `PARSE_PROVIDERS_ENABLED` при сборке контейнера; проверить `UT-PS-03`.
- [x] SEO-3.3 Добавить исключения `ParseProviderUnknownError` (400), `ParseTargetMissingError` (400), `ParseTargetsUnavailableError` (502), `ParseQueueUnavailableError` (503) в `core/exceptions` с константными сообщениями.
- [x] SEO-3.4 Добавить `YandexServiceClientProtocol`, клиент `clients/yandex_service.py` (httpx, без credentials/cookie, `trust_env=False`, task-local log filter как в `ya_metrica.py`) и схемы ответа; проверить `UT-PS-05`.
- [x] SEO-3.5 Реализовать `providers/ya_metrica.py` (`list_targets` постранично, `is_target`, `build_params={}`); проверить `UT-PS-04`.
- [x] SEO-3.6 Зарегистрировать клиент и провайдера в `containers/clients.py`/DI реестра; проверить `tests/unit/test_containers.py`.
- [x] SEO-3.7 Реализовать и прогнать `UT-PS-03..05` (реестр, провайдер, клиент).
- [x] SEO-3.V Прогнать targeted unit-тесты SEO-3 и `make lint` seo, отметить ID и вернуть handoff (сигнатуры протокола, имена исключений).

## 9. SEO-4 — сервис диспетчеризации, слоты и часовой пояс (профиль: Backend)

**Specs:** `seo-parse-scheduling`, `seo-parse-trigger-api` · **Пути:** `services/seo-service/**` (`core/services/parsing`, `containers`) · **Зависит от:** `SEO-3`

- [x] SEO-4.1 Добавить `TimezoneProvider` (протокол) и `EnvTimezoneProvider` (из `SEO_UTC_OFFSET_HOURS`) и `SlotCalculator` (локальное время, due-слот, `schedule_date`, границы offset −12/+14); проверить `UT-PS-02`.
- [x] SEO-4.2 Добавить `ParseDispatchService.dispatch_manual(provider, equestrian_id)` по `design.md#d6-ручной-запуск` (исходы 400/502/503, запись ledger только после `PubAck`, результат `{job_id, provider, status}`).
- [x] SEO-4.3 Добавить `ParseDispatchService.dispatch_scheduled_slot(provider, local_date)`: постраничные цели → `claim → publish → mark`, пропуск при конфликте, `failed` и cap попыток, сбой списка целей не отмечает слот; общий для всех провайдеров.
- [x] SEO-4.4 Собрать граф в `containers/services.py` (publisher, repository, registry, slot calculator, timezone provider); проверить `tests/unit/test_containers.py`.
- [x] SEO-4.5 Реализовать и прогнать `UT-PS-02` (слоты/границы) и `UT-PS-09` (ручной запуск).
- [x] SEO-4.6 Реализовать и прогнать `UT-PS-10` (scheduled, конкурентный skip, retry, cap, фейковый провайдер `demo` без правок сервиса).
- [x] SEO-4.V Прогнать targeted unit-тесты SEO-4 и `make lint`, отметить ID и вернуть handoff (публичные методы сервиса, как запросить его из API и scheduler).

## 10. SEO-5 — HTTP API ручного запуска (профиль: Backend)

**Specs:** `seo-parse-trigger-api`, `seo-peer-http-contract` · **Пути:** `services/seo-service/**` (`api`, `main.py`, API-тесты) · **Зависит от:** `SEO-4`

- [x] SEO-5.1 Добавить схемы `core/schemas/api/parse_jobs.py` (`ParseJobInDto{provider}` с `extra=forbid` и маской кода, `ParseJobOutDto`) и экспорт.
- [x] SEO-5.2 Добавить `api/parse_jobs.py`: `POST ""` → `202`, `route_class=TenantTransactionalRoute` (selector до тела), конюшня только из `get_equestrian_id`; подключить `/parse-jobs` в `main.py` под `/api`.
- [x] SEO-5.3 Добавить в `lifespan` `main.py` подключение NATS клиента (connect + `setup_streams`) без блокировки старта при недоступном брокере (повторные попытки, `/health` не зависит), корректное закрытие; расширить `safe_keys` валидатора ключом `provider`.
- [x] SEO-5.4 Убедиться, что `app_error_handler` отдаёт `502/503` с константным `detail` для новых исключений; проверить без утечек.
- [x] SEO-5.5 Реализовать и прогнать `UT-PS-12` (`tests/api/test_parse_jobs_api.py`): `401` без selector до тела, `202` anonymous/с cookie, `400`-варианты, `502`, `503`, схема ответа.
- [x] SEO-5.6 Адаптировать `tests/api/test_access.py`/`conftest.py` под новый маршрут (`API_ROUTES`) и прогнать `UT-PS-13`.
- [x] SEO-5.V Прогнать `make -C services/seo-service test` (без infrastructure), отметить ID и вернуть handoff (точный контракт `POST /api/parse-jobs`).

## 11. SEO-6 — процесс scheduler (профиль: Backend)

**Specs:** `seo-parse-scheduling`, `parse-job-messaging` · **Пути:** `services/seo-service/src/scheduler/**`, тесты · **Зависит от:** `SEO-4`

- [x] SEO-6.1 Создать пакет `src/scheduler/` (entrypoint `python -m scheduler.main`, добавить `scheduler` в `known-first-party` ruff при необходимости): сборка контейнера, подключение NATS (retry с backoff, `setup_streams`), SIGTERM/SIGINT → graceful stop.
- [x] SEO-6.2 Реализовать `scheduler/runner.py`: tick каждые `PARSE_SCHEDULER_TICK_SECONDS`, `SlotCalculator` → `dispatch_scheduled_slot` по каждому активному провайдеру, in-memory отметка «проход завершён», изоляция ошибок провайдера/цели, `PARSE_SCHEDULE_ENABLED=false` → idle.
- [x] SEO-6.3 Обеспечить отдельную сессию БД на единицу работы (короткие транзакции) и закрытие `close_database()` при остановке.
- [x] SEO-6.4 Реализовать и прогнать `UT-PS-11` (fake clock/ledger/provider: до времени no-op, один прогон в сутки, рестарт без дублей, disabled, изоляция ошибок, cancel, NATS retry).
- [x] SEO-6.5 Реализовать `IT-NATS-S1` в `tests/integration/test_nats_broker.py` (marker `infrastructure`, `TEST_NATS_URL`, уникальные имена/cleanup, отсутствие брокера = fail): stream на пустом брокере, повторный `add_stream`, публикация, `duplicate=true`.
- [x] SEO-6.V Прогнать `UT-PS-11` и `IT-NATS-S1` на реальном NATS, `make lint`, отметить ID и вернуть handoff (команда запуска scheduler).

## 12. SEO-7 — AsyncAPI, README, compose, Makefile и SERVICES.md (профиль: Backend)

**Specs:** `parse-job-messaging`, `seo-parse-scheduling` · **Пути:** `services/seo-service/{README.md,.env.example,docs}`, `.docker-compose/docker-compose.seo.yml`, `Makefile` (цель `asyncapi-validate-parse`), `SERVICES.md` · **Зависит от:** `SEO-5`, `SEO-6`, `MT-4`, `YS-1`

- [x] SEO-7.1 Создать `services/seo-service/docs/asyncapi.yaml` (producer): channel `commands.parse.ya_metrica.run`, stream, headers, payload; сверить с `ParseCommand` и settings.
- [x] SEO-7.2 Обновить `README.md` seo: секция «NATS JetStream», `POST /api/parse-jobs` (access matrix), расписание/`.env`, scheduler, ledger, **«Как подключить нового провайдера парсинга»**, согласование поясов.
- [x] SEO-7.3 Добавить новые переменные (`NATS_*`, `PARSE_*`, `YANDEX_SERVICE_*`) в `.env.example` с комментариями (реальный `.env` не править).
- [x] SEO-7.4 Добавить сервис `seo-scheduler` в `.docker-compose/docker-compose.seo.yml` (тот же образ, `container_name`, без портов, `restart: always`, env из `.env`); проверить `docker compose -f … config`.
- [x] SEO-7.5 Добавить цель `asyncapi-validate-parse` в корневой `Makefile` (оба AsyncAPI), `.PHONY`; `asyncapi-validate` не менять; проверить `make asyncapi-validate-parse`.
- [x] SEO-7.6 Обновить `SERVICES.md` (разд. 8–10): убрать M2, описать цепочку seo → NATS → ya-metrica, новые env, `seo-scheduler`, `GET /api/connections/metrica`, `POST /api/parse-jobs`/`/api/seo/parse-jobs`; сверить с specs.
- [x] SEO-7.V Прогнать `make asyncapi-validate-parse`, `docker compose config` и один раз `make -C services/seo-service test` + `make lint`, отметить ID и вернуть handoff.

## 13. BK-1 — backend-прокси `POST /api/seo/parse-jobs` (профиль: Backend)

**Specs:** `seo-parse-trigger-api`, `seo-backend-proxy` · **Пути:** `services/backend/**` (SEO client/protocol/proxy/route/schemas/inventory/tests) · **Зависит от:** approval

- [x] BK-1.1 Добавить DTO `SeoParseJobInDto{provider}` (`extra=forbid`, маска `^[a-z][a-z0-9_]{1,31}$`) и `SeoParseJobOutDto` в `clients/seo_service/schemas.py`.
- [x] BK-1.2 Добавить метод `start_parse_job` в `SeoServiceClientProtocol` и `SeoServiceClient` (`POST /api/parse-jobs`, `expected_status=202`, только `X-Equestrian-Id`, `503` → `SeoQueueUnavailableError`, безопасный `400` как у остальных); проверить в client-boundary тесте (часть `UT-BK-04`).
- [x] BK-1.3 Добавить `SeoProxyService.start_parse_job(actor, data)` (конюшня из `actor.equestrian_id`).
- [x] BK-1.4 Добавить маршрут `POST /seo/parse-jobs` (`status_code=202`, `Actor` = `require_seo_admin`) и маппинг `SeoQueueUnavailableError` → `503`; проверить порядок зависимостей (`401` → `403` → body).
- [x] BK-1.5 Регенерировать/обновить route inventory (`maintain/route_inventory.py`, `docs/backend-route-inventory.md`) с новой строкой protected write ADMIN.
- [x] BK-1.6 Реализовать и прогнать `UT-BK-01..03` (access, tenant, валидация) в `tests/unit/api/test_seo_proxy_api.py`.
- [x] BK-1.7 Реализовать и прогнать `UT-BK-04..05` (маппинг ошибок, client boundary, inventory).
- [x] BK-1.V Прогнать `make -C services/backend test` и `make lint`, отметить ID и вернуть handoff (контракт ответа, имя ошибки очереди).

## 14. FE-1 — API, сервис, scope и hook обновления (профиль: Frontend)

Split согласован Router: `FE-1a` завершил FE-1.1/.2/.4/.6; `FE-1b` выполняет FE-1.3/.5/.7/.8/.V и минимальный opt-in HTTP-статус shared client с регрессиями. FE-2 зависит от завершения FE-1b.

**Specs:** `cms-seo-parse-refresh-ui` · **Пути:** `services/frontend/src/{api,types/api,features/seo}/**` · **Зависит от:** approval

- [x] FE-1.1 Добавить типы `SeoParseJobInDto/OutDto`, константу провайдера `ya_metrica` в `src/types/api/seo.ts`.
- [x] FE-1.2 Добавить `postSeoParseJob` в `src/api/seo.ts` (`POST /seo/parse-jobs`, JSON `{provider}`).
- [x] FE-1.3 Добавить `startSeoParseJob` в `seoDataService.ts` (через `safeSeoResult`, безопасные сообщения для 400/403/502/503/сети).
- [x] FE-1.4 Добавить `SEO_ACTIONS.START_PARSE` (ADMIN) в `useSeoScopes.ts` и реестр.
- [x] FE-1.5 Создать `hooks/useSeoParseRefresh.ts` (open/close/confirm, pending, sync-guard повторного submit, guard прав, ошибка в модалке, успех → `message.success`, без автоперечитывания таблицы).
- [x] FE-1.6 Добавить в `ConfirmActionModal` необязательные `okText`/`okDanger` (по умолчанию «Подтвердить»/danger); проверить существующие тесты отвязки.
- [x] FE-1.7 Реализовать и прогнать `FT-PR-01..03` (API-boundary MSW, сервис, scopes).
- [x] FE-1.8 Реализовать и прогнать `FT-PR-04` (hook: один POST при двойном confirm, без права нет вызова, ошибка остаётся, cancel в pending заблокирован, 401/403).
- [x] FE-1.V Прогнать targeted vitest для `src/api/seo.test.ts`, `src/features/seo/{services,hooks}` и `npm run typecheck`, отметить ID и вернуть handoff (экспорт hook, props модалки).

### FE-FIX-1 — QGFA-104-01: безопасный backend detail

- [x] FE-FIX-1.1 Сохранять только настоящий непустой строковый backend detail в opt-in shared client (включая auth retry), не менять legacy consumers; для невалидного detail/ответа возвращать безопасную ошибку SEO. Добавить regressions client → service по 400/403/502/503 и невалидным detail, прогнать targeted client/service/hook tests, typecheck и scoped lint.

## 15. FE-2 — кнопка «Обновить данные» и модалка в SeoPage (профиль: Frontend)

**Specs:** `cms-seo-parse-refresh-ui` · **Пути:** `services/frontend/src/features/seo/ui/**` · **Зависит от:** `FE-1b`

- [x] FE-2.1 Подключить один экземпляр `useSeoParseRefresh` в `SeoPage.tsx`; добавить кнопку «Обновить данные» (`SyncOutlined`, доступное имя) в блоки управления вкладок «Страницы» и «Запросы» рядом с «Сбросить»; на остальных вкладках кнопки нет.
- [x] FE-2.2 Отрисовать `ConfirmActionModal` (заголовок, пояснение про фоновую загрузку, `okText`, не-danger, ошибка внутри, фокус возвращается на кнопку); при необходимости добавить стили в `seoStyles.ts` без нарушения раскладки 1366×768.
- [x] FE-2.3 Реализовать и прогнать `FT-PR-05` в `SeoPage.test.tsx` (кнопка на двух вкладках и отсутствует на остальных, текст, Esc/«Отмена» без запроса, confirm → toast, таблица не перезапрошена, доступность).
- [x] FE-2.4 Прогнать `FT-PR-06` (регрессии: «Сбросить», пагинатор, «Нормализация», модалка отвязки, существующие тесты SEO) и поправить только затронутые тесты.
- [x] FE-2.V Прогнать targeted vitest `src/features/seo/ui`, `npm run lint`, `npm run typecheck`, отметить ID и вернуть handoff (селекторы кнопки/модалки для QG-FE-MANUAL).

## 16. QG-ENV — готовность окружения (профиль: Quality Gate)

**Пути:** `.qa/104-metrica-scheduling/env/**` · **Зависит от:** все исполнители

- [x] QG-ENV.1 Пересобрать/перезапустить seo (с `seo-migration`), ya-metrica (с `ya-metrica-migration`), yandex, backend, frontend, поднять `seo-scheduler`; `stackctl` seo/metrica не поддерживает — штатный `make`/Compose; зафиксировать `docker inspect` PostgreSQL/NATS из `design.md#postgresql-для-smoke-тестов`.
- [x] QG-ENV.V Проверить health всех сервисов, наличие stream `PARSE_COMMANDS` и durable `ya-metrica-parse-run`, подготовить `TEST_DATABASE_URL`/`TEST_NATS_URL`; вернуть handoff.

## 17. QG-BE — Python-сервисы (профиль: Quality Gate)

**Пути:** `.qa/104-metrica-scheduling/qg-be/**` · **Зависит от:** `QG-ENV`

- [x] QG-BE.1 Проверить Clean Architecture/ownership diff четырёх сервисов, отсутствие секретов в логах/сообщениях, удаление M2 и наличие строк access matrix в тестах.
- [x] QG-BE.2 Сверить покрытие test matrix `UT-*`/`IT-*` (backend часть) по `design.md#test-matrix`; отсутствующие оси — finding.
  - [x] QG-BE.SEO.1 (`QG-BE-review-SEO`, часть QG-BE.1) Проверить только SEO ownership/архитектуру/API/security/ledger/dispatch/scheduler; findings и evidence — `.qa/104-metrica-scheduling/QG-BE/seo-review.md`.
  - [x] QG-BE.SEO.2 (`QG-BE-review-SEO`, часть QG-BE.2) Сверить UT-PS-01..13, IT-PS-01..02 и границу IT-NATS-S1; зафиксировать пробелы и невыполненные destructive проверки, не повторять полные suite/lint.
  - [x] QG-BE.PEERS.1 (`QG-BE-review-peers`, остаток QG-BE.1) Проверить metrica/yandex/backend: архитектуру, access/tenant, удаление M2, idempotency/consumer и log safety; свести QG-BE.1 после обеих review-частей.
  - [x] QG-BE.PEERS.2 (`QG-BE-review-peers`, остаток QG-BE.2) Сверить UT-MP/IT-MP, UT-YB/IT-YB, UT-BK и границу IT-NATS-M1; свести QG-BE.2 после обеих review-частей.
- [x] QG-BE.V Выполнить scoped format/lint/test (`make test`, `make lint`) для seo, ya-metrica, yandex, backend; логи в `.qa/…/qg-be/`; вернуть findings.
- [x] QG-BE.RECHECK.1 Единственный повторный раунд BE-SEO-01 после SEO-FIX-1: исходный midnight probe с инъекцией slots, affected tests (87 passed), scoped ruff; BE-SEO-01 закрыт, minor BE-SEO-02/03 и BE-MP-01 не исправлены.
- [x] QG-BE.PG.1 После разрешения пользователя выполнить IT-PS-01, миграционную часть IT-MP-01 и schema roundtrip/delete-actions, IT-YB-01 только в новых уникальных схемах *_test; проверить имена/принадлежность до destructive SQL и cleanup (2/32/2 passed, 36 новых схем удалены, read-only audit 0 оставшихся). Evidence — `.qa/104-metrica-scheduling/QG-BE/handoff.md`.

## 18. QG-FE-AUTO — CMS автоматизированная проверка (профиль: Quality Gate)

**Пути:** `.qa/104-metrica-scheduling/qg-fe-auto/**` · **Зависит от:** `QG-ENV`

- [x] QG-FE-AUTO.1 Проверить FSD/ownership diff, отсутствие live-backend в unit/component тестах, наличие `FT-PR-01..06`, access/scope-сценариев.
- [x] QG-FE-AUTO.V Выполнить `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`; вернуть findings.

## 19. QG-CONTRACTS — access matrix, AsyncAPI, real-broker (профиль: Quality Gate)

**Пути:** `.qa/104-metrica-scheduling/qg-contracts/**` · **Зависит от:** `QG-ENV`

- [x] QG-CONTRACTS.1 Сверить access matrix `design.md#access-matrix` со specs и фактическими тестами anonymous/authenticated (backend, seo, yandex, metrica M2 rejection).
- [x] QG-CONTRACTS.2 Выполнить `make asyncapi-validate-parse`; сверить AsyncAPI seo/ya-metrica ↔ settings/модели (stream, subject, durable, headers, payload, `NAMESPACE_PARSE_COMMANDS`).
- [x] QG-CONTRACTS.V Выполнить `IT-NATS-S1`, `IT-NATS-M1` на реальном NATS без skip; проверить, что `asyncapi-validate` core не изменён; вернуть findings.

## 20. QG-LIVE — живые проверки (профиль: Quality Gate)

**Пути:** `.qa/104-metrica-scheduling/qg-live/**` · **Зависит от:** `QG-BE`, `QG-FE-AUTO`, `QG-CONTRACTS`

- [x] QG-LIVE.1 Выполнить `SM-PS-01..06` через `.claude/skills/api-smoke-test` на реальных PostgreSQL (seo, ya-metrica) и NATS: anonymous/без ADMIN/ADMIN, нет привязки, seo peer, удалённый M2.
- [x] QG-LIVE.2 Выполнить `SM-PS-07` (scheduler на ближайшее время, рестарт без дублей) и `SM-PS-08` (Y10).
- [x] QG-LIVE.V Выполнить `SM-PS-09` (остановка брокера, если допустимо на стенде; иначе зафиксировать причину и unit/IT evidence), вернуть findings.

### Split QG-LIVE-R1 — исправление собственного QA seed и завершение smoke

- [x] QG-LIVE-R1.1 Заполнить scope_description в изолированном QA seed; подтвердить backend ADMIN 202/400, anonymous/forbidden cases SM-PS-01..06 с timings, без повторения уже успешных consumer/PG integration/scheduler проверок; удалить только собственные временные ресурсы.

## 21. QG-FE-MANUAL — браузерная проверка 1366×768 (профиль: Quality Gate)

**Пути:** `.qa/104-metrica-scheduling/qg-fe-manual/**` · **Зависит от:** `QG-BE`, `QG-FE-AUTO`, `QG-CONTRACTS`

- [x] QG-FE-MANUAL.1 Выполнить шаги 1–16 из `design.md#manual-qa-steps-ui-тестирование` в viewport 1366×768 (scripted Playwright, `.agents/skills/ui-qa`), скриншоты и сетевые трассы в `.qa/…/qg-fe-manual/`.
- [x] QG-FE-MANUAL.V Вернуть findings и дописать раздел UI в отчёт по правилам `agents/quality_gate.md`.

## 22. QG-SYNTH — итоговый отчёт (профиль: Quality Gate)

**Пути:** `docs/reports/104-metrica-scheduling.md` · **Зависит от:** `QG-LIVE`, `QG-FE-MANUAL`

- [x] QG-SYNTH.1 Свести findings lanes, покрытие test matrix, access matrix и оставшиеся риски `R1..R9`.
- [x] QG-SYNTH.V Выставить единый вердикт и сохранить `docs/reports/104-metrica-scheduling.md`.

## Workflow follow-up

- После `QG-SYNTH = APPROVED` (или `APPROVED_WITH_WAIVER`): sync delta specs в main specs, повторная `openspec validate --strict`, archive change, финализация по `.agents/skills/task-finalize`.
- Production release блокируется прежним gate: подтверждённая изоляция credential-less peers и NATS от внешних caller'ов.

## SEO-FIX-1 — граница локальных суток (BE-SEO-01)

- [x] SEO-FIX-1.1 Не начинать claim/publish устаревшего слота при переходе локальной полуночи внутри batch/страниц и между провайдерами через инъецируемые clock/slots; сохранить PubAck, ledger, fencing и cache semantics. Проверить регрессии с ненулевым offset и targeted dispatch/slots/scheduler/containers + scoped lint.

## FE-FIX-2 — локальный контраст refresh confirm (QGFM-104-01)

- [x] FE-FIX-2.1 Обеспечить контраст >=4.5:1 для обычного/hover/focus состояния нового не-danger refresh confirm локальными стилями, сохранив defaults отвязки; добавить scoped regression, прогнать targeted SEO UI/modal tests, scoped lint/typecheck и передать точные цвета для повторного QG-FE-MANUAL на 1366×768. QGFM-104-02 и общая палитра вне scope.
