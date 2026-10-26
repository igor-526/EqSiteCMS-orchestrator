# Tasks — metrica-stats-parsing

Deliverable A (`services/ya-metrica-service/**`, `.docker-compose/docker-compose.ya_metrica.yml`, `SERVICES.md` §8/9, `agents/redis-databases.yaml`, `agents/howto/celery-protocols.md`) выполняется units `MS-BE-1..7` одним Backend-профилем последовательно, deliverable B (`services/yandex-service/**`) — unit `YS-1` параллельно; test matrix, access matrix и DAG — в `design.md` (`## Test matrix`, `## Access matrix`, `## Execution units`).

`contextFiles` перечислены **по units**, а не общим списком на весь change. Пути A — относительно `services/ya-metrica-service/`, если не указано иное. Работа в сервисных репозиториях — только в feature-ветке `metrica-stats-parsing` от актуального `dev` (см. `SERVICES.md` → Git-workflow), без push.

**Данные для live verification (SMOKE):** конюшня `5f6496aa-4fe9-42da-a763-29f9bab22d73`, счётчик Метрики `105850153`, аккаунт Яндекса `799c85a2-1f16-4477-9ef5-cb44ee4b81b2` (login `Igor-526`); эталон probe — `.qa/metrica-stats-parsing/api_format_summary.md` и таблица сумм в `design.md` → `### Live`. Токены не выводить; evidence — только в `.qa/metrica-stats-parsing/`.

## Execution units

| Unit | Профиль | Ownership paths | Зависит от | Verification | contextFiles |
| --- | --- | --- | --- | --- | --- |
| `MS-BE-1` | Backend | `src/settings.py`, `.env.example`, `pyproject.toml`, `uv.lock`, `src/utils/basemodel.py`, `src/models/**`, `src/migration/versions/**`, `src/core/entities/**`, `tests/integration/conftest.py`, `tests/integration/test_schema_postgres.py`, `tests/unit/test_settings.py`, `tests/unit/test_migrations.py` | — | `IT-MS-01, IT-MS-07`, `UT-MS-15`, `make test` | `design.md` D1, D4, D9, D14, `## Test matrix` (F1), `specs/metrica-stats-storage/spec.md`, `specs/metrica-parse-queue/spec.md`, `services/yandex-service/tests/integration/conftest.py` и `services/yandex-service/src/utils/basemodel.py` (паттерны), `services/vk-service/src/settings.py` (`CelerySettings`) |
| `MS-BE-2` | Backend | `src/clients/**`, `src/core/protocols/clients/**`, `src/core/schemas/clients/**`, `src/core/exceptions/**`, `tests/clients/**` | `MS-BE-1` | `UT-MS-05, UT-MS-13`, `uv run pytest tests/clients` | `design.md` D6, D10, «Фактический формат Reporting API», `specs/metrica-stats-ingestion/spec.md`, `.qa/metrica-stats-parsing/api_format_summary.md`, `services/seo-service/README.md` (§Контракты), `specs/yandex-peer-http-contract/spec.md` |
| `MS-BE-3` | Backend | `src/repositories/**`, `src/core/protocols/repositories/**`, `tests/integration/test_stats_repository_postgres.py`, `tests/integration/test_tasks_repository_postgres.py` | `MS-BE-1` | `IT-MS-02..06, IT-MS-08..14` на реальной PostgreSQL | `design.md` D1, D2, D3, D4, D7 (claim), `## Test matrix` (F1), `specs/metrica-stats-storage/spec.md`, `specs/metrica-parse-queue/spec.md`, handoff `MS-BE-1` |
| `MS-BE-4` | Backend | `src/core/services/parse_date_resolver.py`, `src/core/services/parse_decomposer.py`, `src/core/services/parse_enqueue_service.py`, `src/core/protocols/parse_dispatcher.py`, `src/core/schemas/parse.py`, `src/core/exceptions/parse.py` (+ экспорт в `src/core/exceptions/__init__.py`), `tests/unit/test_parse_date_resolver.py`, `tests/unit/test_parse_decomposer.py`, `tests/unit/test_parse_enqueue_service.py` | `MS-BE-2`, `MS-BE-3` | `UT-MS-01..04` | `design.md` D4, D7 (постановка), D9, D11, `specs/metrica-parse-trigger/spec.md`, `specs/metrica-parse-queue/spec.md`, handoffs `MS-BE-2`, `MS-BE-3` |
| `MS-BE-5` | Backend | `src/core/services/parse_job_factory.py`, `src/core/services/stat_ingestion_service.py`, `src/core/services/parse_retry_policy.py`, `src/core/services/parse_task_runner.py`, `src/core/services/parse_dispatch_service.py`, `tests/unit/test_parse_job_factory.py`, `tests/unit/test_stat_ingestion_service.py`, `tests/unit/test_parse_retry_policy.py`, `tests/unit/test_parse_task_runner.py`, `tests/unit/test_parse_dispatch_service.py` | `MS-BE-4` | `UT-MS-06..12` | `design.md` D1, D2, D5, D6, D8, D11, `specs/metrica-stats-ingestion/spec.md`, `specs/metrica-stats-storage/spec.md`, `specs/metrica-parse-queue/spec.md`, handoff `MS-BE-4` |
| `MS-BE-6` | Backend | `src/workers/**`, `src/containers/**`, `src/utils/database.py`, `src/core/services/__init__.py`, `tests/workers/**`, `tests/unit/test_containers.py`, `tests/unit/test_database.py`, `.docker-compose/docker-compose.ya_metrica.yml` (корень), `agents/redis-databases.yaml` (корень), `agents/howto/celery-protocols.md` (корень) | `MS-BE-5` | `UT-MS-14, UT-MS-16`, targeted pytest, `make lint` | `design.md` D7, D11, D14, `specs/metrica-parse-queue/spec.md`, `agents/howto/celery-protocols.md`, `agents/backend.md` §15, `services/vk-service/src/workers/celery_app.py`, `.docker-compose/docker-compose.vk.yml` (vk-celery-worker), `services/email-service/src/workers/tasks/email.py` (asyncio.run), handoff `MS-BE-5` |
| `MS-BE-7` | Backend | `src/api/**`, `src/main.py`, `src/core/schemas/api/**`, `tests/api/**`, `README.md`, `SERVICES.md` §8/9 (корень) | `MS-BE-6` | `AT-MS-01..06`, `make test-cov` (100%, с `TEST_DATABASE_URL`), `make lint` | `design.md` D9, D12, `## Access matrix`, `specs/metrica-parse-trigger/spec.md`, `specs/yandex-peer-http-contract/spec.md`, handoff `MS-BE-6` |
| `YS-1` | Backend | `services/yandex-service/src/api/servicing.py`, `src/core/services/yandex_service_authorization_service.py`, `src/core/schemas/api/service_authorization.py`, `src/containers/services.py`, `tests/api/test_servicing.py`, `tests/unit/test_service_authorization.py`, `tests/unit/test_containers.py`, `tests/unit/test_schemas.py`, `README.md` | — | `UT-YS-01..04`, `make test`, `make lint` | `design.md` D13, `## Access matrix`, `specs/yandex-peer-http-contract/spec.md` |
| `SMOKE-1` | Backend | — (evidence `.qa/metrica-stats-parsing/smoke/`) | `MS-BE-7`, `YS-1` | `SM-MS-01..13` на живом стеке, реальной PostgreSQL и Redis | `design.md` `### Live`, `## PostgreSQL для smoke-тестов`, `## Access matrix`, `.qa/metrica-stats-parsing/api_format_summary.md`, `.agents/skills/stack-control`, `.claude/skills/api-smoke-test`, handoffs `MS-BE-7`, `YS-1` |
| `QG-ENV` | Quality Gate | `.qa/metrica-stats-parsing/qg-env/` | `SMOKE-1` | готовность стека, миграции, Celery worker ping, beat | `agents/quality_gate.md`, `design.md` `## PostgreSQL для smoke-тестов` |
| `QG-BE` | Quality Gate | `.qa/metrica-stats-parsing/qg-be/` | `QG-ENV` | scoped format/lint/test ya-metrica и yandex, coverage | `design.md` `## Test matrix`, все `specs/**` |
| `QG-CONTRACTS` | Quality Gate | `.qa/metrica-stats-parsing/qg-contracts/` | `QG-ENV` | access matrix M2/Y5/M1/H1, peer `200/204/400`, секреты, Celery-протокол | `design.md` `## Access matrix`, D7, `specs/yandex-peer-http-contract/spec.md`, `specs/metrica-parse-trigger/spec.md`, `specs/celery-redis-protocols` (main) |
| `QG-LIVE` | Quality Gate | `.qa/metrica-stats-parsing/qg-live/` | `QG-BE`, `QG-CONTRACTS` | независимый live-прогон ключевых `SM-MS-*` | `design.md` `### Live`, handoff `SMOKE-1` |
| `QG-SYNTH` | Quality Gate | `docs/reports/metrica-stats-parsing.md` | `QG-LIVE` | итоговый вердикт | handoffs lanes |

DAG — `design.md` → `### DAG`. `MS-BE-2` ∥ `MS-BE-3` допустимы параллельно; `YS-1` — параллельно с любым `MS-BE-*`.

## 1\. MS-BE-1 — настройки, схема БД, модели, миграция (профиль: Backend)

**Specs:** `metrica-stats-storage`, `metrica-parse-queue`, `metrica-parse-trigger` (смещение UTC) · **Пути:** см. таблицу · **Зависит от:** —

*   MS-BE-1.1 Добавить в `src/settings.py` настройки D14 (в т.ч. `YA_METRICA_UTC_OFFSET_HOURS` int −12..14, по умолчанию 3) и класс `CelerySettings` (`CELERY_APP_MAIN/BROKER/BACKEND`, Redis DB 5/6) с валидацией; обновить `.env.example` без секретов; добавить `celery[redis]` в `pyproject.toml`/`uv.lock`; проверить `UT-MS-15` в `tests/unit/test_settings.py`
*   MS-BE-1.2 Добавить в `src/utils/basemodel.py` хелперы `uuid_pk()` и `timestamp_columns()` по образцу yandex-service; проверить импортом в моделях
*   MS-BE-1.3 Создать модели `metrica_parse_runs` (с `clamped`) и `metrica_parse_tasks` (`src/models/metrica_parse.py`) с CHECK статуса/вида/окна ≤5 дней, `UNIQUE(run_id, sequence)`, частичным уникальным индексом running-аккаунта, claim- и active-индексами по D4
*   MS-BE-1.4 Создать модели `metrica_page_stats` и `metrica_search_query_stats` (`src/models/metrica_stats.py`) по D1: аддитивные колонки с CHECK (`bounces <= visits`), generated stored `bounce_rate`/`page_depth`/`avg_visit_duration_seconds` (`Computed`), уникальность `(equestrian_id, stat_date, <entity>_id)`, FK `parse_task_id` `ON DELETE SET NULL`; экспорт в `src/models/__init__.py`
*   MS-BE-1.5 Написать Alembic-ревизию `20261026_0002` (upgrade/downgrade) для 4 таблиц, generated-колонок и индексов; проверить `alembic upgrade head --sql` без ошибок
*   MS-BE-1.6 Добавить доменные сущности и enum'ы в `src/core/entities/` (`ParseRun`, `ParseTask`, `TaskStatus`, `ParseKind`, `ParseErrorCode` по D8, `StatRow` с аддитивными полями); проверить unit-импортом
*   MS-BE-1.7 Создать `tests/integration/conftest.py` (`TEST_DATABASE_URL`, случайная схема `test_metrica_<uuid>`, удаление в `finally`, skip без переменной) и создать отдельную БД `eqsitecmsyametrica_test` в `eqsitecms-db-ya-metrica` (параметры — `docker inspect`, пароль не выводить)
*   MS-BE-1.8 Реализовать и прогнать `IT-MS-01` и `IT-MS-07` (`tests/integration/test_schema_postgres.py`) на реальной PostgreSQL; обновить `tests/unit/test_migrations.py` под новую ревизию
*   MS-BE-1.V Прогнать `make test` и `TEST_DATABASE_URL=… uv run pytest tests/integration` из `services/ya-metrica-service`, логи в `.qa/metrica-stats-parsing/ms-be-1/`, отметить выполненные task IDs и вернуть handoff (имена таблиц/enum'ов, имя ревизии)

## 2\. MS-BE-2 — базовый API-клиент и клиенты Метрики/peers (профиль: Backend)

**Specs:** `metrica-stats-ingestion` · **Пути:** см. таблицу · **Зависит от:** `MS-BE-1`

*   MS-BE-2.1 Вынести `BaseApiClient` (`src/clients/base.py`: `base_url`, timeout, безопасная классификация timeout/transport/http/response, фабрика исключения) из `src/clients/yandex_metrica.py`; удалить untracked `src/clients/yandex_metrica_parser.py` (содержит живой токен — не копировать значение никуда)
*   MS-BE-2.2 Перевести `YandexMetricaClient` на наследование от `BaseApiClient` без изменения поведения `get_counters`; проверить регрессией `UT-MS-13` (`tests/clients/test_base_client.py`, существующий `tests/clients/test_yandex_metrica.py`)
*   MS-BE-2.3 Реализовать `YandexMetricaStatClient.get_stat_page` (`src/clients/yandex_metrica_stat.py`): params по спеке (ids, metrics, dimensions, date1/date2, limit, 1-based offset, `sort=ym:s:date,<dim>`, `accuracy=full`), OAuth header, timeout из настроек
*   MS-BE-2.4 Добавить валидатор оболочки ответа `stat/v1/data` и DTO страницы (`src/core/schemas/clients/yandex_metrica_stat.py`: `total_rows`, `sampled`, `total_rows_rounded`, сырые строки)
*   MS-BE-2.5 Добавить `PeerServiceException(service, status, category)` в `src/core/exceptions/` и `YandexServiceClient` (`get_metrica_binding` → Y7, `get_enc_access_token` → Y5 с полем `enc_access_token`) с DTO ответов
*   MS-BE-2.6 Реализовать `SeoServiceClient.resolve_pages/resolve_search_queries` (`X-Equestrian-Id`, body `{"items"}`, ответ `[{source, normalized, id}]`, ≤1000 элементов)
*   MS-BE-2.7 Обновить Protocol'ы клиентов в `src/core/protocols/clients/` (стат-клиент, yandex-service, seo-service)
*   MS-BE-2.8 Реализовать и прогнать `UT-MS-05` и клиентскую часть `UT-MS-09`/`UT-MS-11` (`tests/clients/test_yandex_metrica_stat.py`, `test_yandex_service.py`, `test_seo_service.py`) на mock-транспорте, без живых запросов
*   MS-BE-2.V Прогнать `uv run pytest tests/clients` и `make lint`, отметить выполненные task IDs и вернуть handoff (сигнатуры клиентов, категории исключений)

## 3\. MS-BE-3 — репозитории хранения и очереди (профиль: Backend)

**Specs:** `metrica-stats-storage`, `metrica-parse-queue` · **Пути:** см. таблицу · **Зависит от:** `MS-BE-1`

*   MS-BE-3.1 Реализовать `StatsRepository` для обоих видов (`src/repositories/metrica_stats_repository.py`): пакетный upsert аддитивных колонок (замена для другого задания, сумма для того же — D2) с `RETURNING (xmax = 0)` → счётчики inserted/updated
*   MS-BE-3.2 Добавить в `StatsRepository` сверку окна (D3, возвращает число удалённых) и `get_last_stat_date(equestrian_id)` по виду
*   MS-BE-3.3 Реализовать `ParseRunRepository.create_run_with_tasks` и `has_active_tasks` под `pg_advisory_xact_lock` по конюшне (D7)
*   MS-BE-3.4 Реализовать в `ParseTaskRepository` claim по аккаунту (SKIP LOCKED + NOT EXISTS running, `UniqueViolation` → «аккаунт занят»), `list_dispatchable_accounts`, продление lease и `save_checkpoint` (next\_offset + счётчики)
*   MS-BE-3.5 Реализовать в `ParseTaskRepository` `mark_succeeded`, `schedule_retry`, `mark_failed`, `reap_expired_leases`, `fail_queued_by_account`
*   MS-BE-3.6 Описать Protocol'ы репозиториев в `src/core/protocols/repositories/` и транзакционную границу (репозиторий работает в переданной сессии, commit — у вызывающего)
*   MS-BE-3.7 Реализовать и прогнать `IT-MS-02..06` (`tests/integration/test_stats_repository_postgres.py`) на реальной PostgreSQL, включая пример агрегации `/tours?utm` + `/tours` из спеки
*   MS-BE-3.8 Реализовать и прогнать `IT-MS-08..14` (`tests/integration/test_tasks_repository_postgres.py`), включая параллельные claim и постановку через два соединения
*   MS-BE-3.V Прогнать `TEST_DATABASE_URL=… uv run pytest tests/integration` и `make lint`, логи в `.qa/metrica-stats-parsing/ms-be-3/`, отметить выполненные task IDs и вернуть handoff (методы репозиториев, семантика транзакций)

## 4\. MS-BE-4 — резолв дат, декомпозиция, постановка (профиль: Backend)

**Specs:** `metrica-parse-trigger`, `metrica-parse-queue` · **Пути:** см. таблицу · **Зависит от:** `MS-BE-2`, `MS-BE-3`

*   MS-BE-4.1 Добавить доменные исключения постановки (`src/core/exceptions/parse.py`: пустой диапазон, нет привязки, интеграция Яндекс недоступна, активный запуск), DTO запуска/окон с `clamped` (`src/core/schemas/parse.py`) и `ParseDispatcherProtocol` (`src/core/protocols/parse_dispatcher.py`)
*   MS-BE-4.2 Реализовать `DateRangeResolver` (`parse_date_resolver.py`) по D9: «сегодня» по `YA_METRICA_UTC_OFFSET_HOURS`, обрезка явного диапазона до `[today − 2y; today]` с признаком `clamped`, `400` при пустом результате/одной дате, авто-режим раздельно по видам
*   MS-BE-4.3 Реализовать `TaskDecomposer` (`parse_decomposer.py`) по D4: окна ≤5 дней, чередование видов, `sequence`
*   MS-BE-4.4 Реализовать `ParseEnqueueService.enqueue` (`parse_enqueue_service.py`): Y7 до транзакции → транзакция (лок, активный запуск, даты, run+tasks с `counter_id`/`yandex_account_id`, `max_attempts`) → после commit `dispatcher.dispatch_account` (ошибка — warning, не отказ) → результат; лог постановки и обрезки
*   MS-BE-4.5 Реализовать и прогнать `UT-MS-01`, `UT-MS-02` (`tests/unit/test_parse_date_resolver.py`)
*   MS-BE-4.6 Реализовать и прогнать `UT-MS-03` (`tests/unit/test_parse_decomposer.py`) и `UT-MS-04` (`tests/unit/test_parse_enqueue_service.py`) с фейковыми клиентами/репозиториями/dispatcher
*   MS-BE-4.V Прогнать targeted `uv run pytest tests/unit/test_parse_*.py` и `make lint`, отметить выполненные task IDs и вернуть handoff (сигнатура `enqueue`, исключения, протокол dispatcher)

## 5\. MS-BE-5 — выполнение задания: креды, ELT-парсинг, ретраи, диспетчер (профиль: Backend)

**Specs:** `metrica-stats-ingestion`, `metrica-parse-queue`, `metrica-stats-storage` · **Пути:** см. таблицу · **Зависит от:** `MS-BE-4`

*   MS-BE-5.1 Реализовать `ParseJobFactory` (`parse_job_factory.py`): Y7-сверка привязки, Y5 ciphertext, расшифровка `EncryptionService` → `ParseJob` (токен только в памяти); ошибки → `binding_changed`/`credentials_unavailable`/`credentials_invalid`/`yandex_service_unavailable`
*   MS-BE-5.2 Реализовать разбор строк в `StatIngestionService` (`stat_ingestion_service.py`): оболочка, конвертация в аддитивные колонки (`bounces`, `visit_duration_seconds` округлением), пропуск null/пустых измерений, непригодных строк и дат вне окна, флаг сэмплирования
*   MS-BE-5.3 Реализовать резолв сущностей (D6): уникальные значения, пакеты ≤ `SEO_RESOLVE_BATCH_SIZE`, бисекция при 400, пропуски; суммирование строк с одним `(stat_date, uuid)` внутри страницы API (D2)
*   MS-BE-5.4 Реализовать цикл страниц D5: старт с `next_offset`, одна транзакция на страницу (upsert + checkpoint + lease), остановка по пустой странице/`total_rows`
*   MS-BE-5.5 Реализовать `RetryPolicy` (`parse_retry_policy.py`): маппинг исключений → `error_code` D8, retryable-признак, backoff с потолком
*   MS-BE-5.6 Реализовать `TaskRunner.run_next_for_account` (`parse_task_runner.py`): claim → job → ingest → succeeded+сверка / retry / failed + fail-fast по аккаунту → `RunOutcome(has_more)`; логи старт/финиш/ошибки без секретов; `ParseDispatchService.collect_ready_accounts` (reaper + аккаунты к запуску)
*   MS-BE-5.7 Реализовать и прогнать `UT-MS-06..09` (`tests/unit/test_stat_ingestion_service.py`) и `UT-MS-11` (`tests/unit/test_parse_job_factory.py`, включая расшифровку ciphertext формата yandex-service)
*   MS-BE-5.8 Реализовать и прогнать `UT-MS-10` и `UT-MS-12` (`tests/unit/test_parse_retry_policy.py`, `tests/unit/test_parse_task_runner.py`, `tests/unit/test_parse_dispatch_service.py`, caplog-маркеры токена/ciphertext/фразы)
*   MS-BE-5.V Прогнать targeted `uv run pytest tests/unit/test_parse_*.py tests/unit/test_stat_ingestion_service.py` и `make lint`, отметить выполненные task IDs и вернуть handoff (точки входа `TaskRunner`/`ParseDispatchService`, требования к фабрике сессий)

## 6\. MS-BE-6 — Celery: app, задачи, dispatcher, DI, compose (профиль: Backend)

**Specs:** `metrica-parse-queue` · **Пути:** см. таблицу · **Зависит от:** `MS-BE-5`

*   MS-BE-6.1 Создать `src/workers/celery_app.py` по `agents/howto/celery-protocols.md` и D7: очередь `ya_metrica` (default), JSON, `task_acks_late`, `task_reject_on_worker_lost`, prefetch 1, `task_ignore_result`, `visibility_timeout=3600`, beat schedule `metrica.dispatch_ready` каждые `PARSE_DISPATCH_INTERVAL_SECONDS`, autodiscovery `workers.tasks`
*   MS-BE-6.2 Добавить в `src/utils/database.py` фабрику engine/session для Celery-задач (`NullPool`, создание и `dispose` внутри одного `asyncio.run`); проверить `tests/unit/test_database.py`
*   MS-BE-6.3 Реализовать задачи `metrica.process_account` и `metrica.dispatch_ready` (`src/workers/tasks/metrica_parse.py`): `asyncio.run` сервисов, re-dispatch при `has_more`, тихий выход при занятом аккаунте, `autoretry_for` только для инфраструктурных ошибок (`max_retries=3`, `retry_backoff=True`), структурные логи
*   MS-BE-6.4 Реализовать `CeleryParseDispatcher` (`src/workers/dispatcher.py`) по `ParseDispatcherProtocol`
*   MS-BE-6.5 Зарегистрировать в `src/containers/**` клиенты (стат, yandex-service, seo-service), репозитории, сервисы D11, `celery_app` (`providers.Singleton`) и dispatcher; обновить `src/core/services/__init__.py`; проверить `tests/unit/test_containers.py`
*   MS-BE-6.6 Добавить в `.docker-compose/docker-compose.ya_metrica.yml` сервисы `ya-metrica-celery-worker` (`celery -A workers.celery_app worker -Q ya_metrica --concurrency=${WORKER_CONCURRENCY:-1} --hostname ya-metrica-worker@%h`, healthcheck адресным `inspect ping`, `stop_grace_period: 300s`) и `ya-metrica-celery-beat` (один экземпляр); проверить `docker compose -f … config --services` (без вывода env)
*   MS-BE-6.7 Добавить Redis DB 5/6 (`ya-metrica-service`) в `agents/redis-databases.yaml` и строку `ya-metrica-service | ya_metrica | metrica.process_account, metrica.dispatch_ready` в таблицу «Сервисы и их очереди» `agents/howto/celery-protocols.md`
*   MS-BE-6.8 Реализовать и прогнать `UT-MS-14` (`tests/workers/test_metrica_parse_tasks.py`) и `UT-MS-16` (`tests/workers/test_celery_app.py`, dispatcher, DI)
*   MS-BE-6.V Прогнать targeted `uv run pytest tests/workers tests/unit/test_containers.py tests/unit/test_database.py` и `make lint`, логи в `.qa/metrica-stats-parsing/ms-be-6/`, отметить выполненные task IDs и вернуть handoff (имена задач/очереди/compose-сервисов)

## 7\. MS-BE-7 — endpoint запуска, документация, финальная проверка сервиса (профиль: Backend)

**Specs:** `metrica-parse-trigger`, `yandex-peer-http-contract` · **Пути:** см. таблицу · **Зависит от:** `MS-BE-6`

*   MS-BE-7.1 Добавить DTO `ParseRunInDto` (`extra="forbid"`) и `ParseRunOutDto` (с `clamped`) в `src/core/schemas/api/` по D12, без секретных полей
*   MS-BE-7.2 Добавить route `POST /api/metrica/stats/parse` (`src/api/`), wiring в `src/main.py`, маппинг доменных исключений в `400` и 4 новых safe detail в `SAFE_DETAILS`
*   MS-BE-7.3 Реализовать и прогнать `AT-MS-01..06` (`tests/api/test_parse_api.py`, регрессия `test_counters_api.py`, `test_health.py`) anonymous и с Cookie/Bearer, включая обрезку диапазона
*   MS-BE-7.4 Обновить `README.md` ya-metrica: назначение, таблицы и правила агрегации (суммы аддитивных колонок, средние = `SUM/SUM`, неаддитивность `users`), endpoint и access matrix M1/M2/H1, Celery worker/beat и Redis DB 5/6, env (в т.ч. `YA_METRICA_UTC_OFFSET_HOURS`), IT с `TEST_DATABASE_URL`
*   MS-BE-7.5 Обновить секцию 8/9 `SERVICES.md` (endpoint M2, Celery worker/beat, зависимости от yandex-service/seo-service/Redis) и упоминание Redis DB в разделе инфраструктуры
*   MS-BE-7.V Прогнать `make lint` и `TEST_DATABASE_URL=… make test-cov` (coverage 100%) из `services/ya-metrica-service`, логи в `.qa/metrica-stats-parsing/ms-be-7/`, отметить выполненные task IDs и вернуть handoff

MS-BE-7 verification: `make format`/`make lint` — PASS; `TEST_DATABASE_URL=… make test-cov` — 656 passed, 100% строк/ветвей на отдельной `eqsitecmsyametrica_test` (случайные схемы, остаток 0). Evidence: `.qa/metrica-stats-parsing/ms-be-7/`. Для восстановления общего покрытия добавлены минимальные guard-регрессии в `services/ya-metrica-service/tests/unit/test_change_guards.py`; API-регрессия M1 обновлена под транспорт `clients.base` после MS-BE-2. Реализации вне ownership не менялись. Live smoke не запускался.

## 8\. YS-1 — Y5 возвращает зашифрованный токен (профиль: Backend)

**Specs:** `yandex-peer-http-contract` · **Пути:** см. таблицу (`services/yandex-service/**`) · **Зависит от:** —

*   YS-1.1 Изменить `YandexServiceAuthorizationService.get_token` на возврат сохранённого `enc_access_token` без расшифровки; удалить зависимость от `EncryptionService` и небезопасный лог `f"Error: {ex}"`; обновить провайдер в `src/containers/services.py`
*   YS-1.2 Заменить DTO `ServiceAuthorizationAccessTokenOutDto` на поле `enc_access_token` и обновить route/описание `src/api/servicing.py`
*   YS-1.3 Реализовать и прогнать `UT-YS-01`, `UT-YS-04` (`tests/unit/test_service_authorization.py`)
*   YS-1.4 Реализовать и прогнать `UT-YS-02`, `UT-YS-03` (`tests/api/test_servicing.py`): anonymous, с Cookie/Bearer, чужой tenant, malformed/absent; поле `access_token` отсутствует
*   YS-1.5 Обновить строку Y5 в access matrix/описании `README.md` yandex-service (ciphertext, потребитель ya-metrica)
*   YS-1.V Прогнать `make test` и `make lint` из `services/yandex-service`, логи в `.qa/metrica-stats-parsing/ys-1/`, отметить выполненные task IDs и вернуть handoff

## 9\. SMOKE-1 — live verification на реальном стеке (профиль: Backend)

**Specs:** все delta change · **Пути:** только `.qa/metrica-stats-parsing/smoke/` · **Зависит от:** `MS-BE-7`, `YS-1`

*   SMOKE-1.1 Discovery параметров PostgreSQL через `docker inspect eqsitecms-db-ya-metrica` / `eqsitecms-db-yandex` / `eqsitecms-db-seo` (без паролей); проверить `CELERY_APP_*`/`YA_METRICA_UTC_OFFSET_HOURS` в окружении и `services/ya-metrica-service/.env` (Redis DB 5/6). Redis/Celery credentials задаёт оператор исключительно в окружении/.env самого ya-metrica-service; runtime не читает `.docker-compose/.env` или `vk-service/.env`, не зависит от Router/оркестратора и не меняет пароль. Разрешённое пользователем одноразовое копирование `REDIS_PASSWORD` из `.docker-compose/.env` в `.env` самого сервиса уже выполнено Router; повторно копировать его не нужно. Если пароль отсутствует — зафиксировать блокер и требование оператору заполнить `.env`; `.env.example` содержит только placeholders. После настройки — пересборка/перезапуск yandex-service и ya-metrica через `make`/Compose (skill `stack-control`), `ya-metrica-migration` → head, запуск Celery worker и beat, адресный `celery inspect ping` — `SM-MS-01`
*   SMOKE-1.2 Выполнить `SM-MS-02` (Y5 anonymous и с Cookie/Bearer, проверка ciphertext булевым сравнением внутри контейнера)
*   SMOKE-1.3 Выполнить `SM-MS-03..06` на тестовой конюшне `5f6496aa-4fe9-42da-a763-29f9bab22d73` (счётчик `105850153`) за `2026-10-21..2026-10-25`: постановка, отказ активного запуска, сверка сумм аддитивных колонок с эталоном в реальной PostgreSQL, идемпотентный повтор
*   SMOKE-1.4 Выполнить `SM-MS-07..08`: автодиапазон и 20-дневный запуск с опросом БД на «не более одного running на аккаунт `799c85a2-1f16-4477-9ef5-cb44ee4b81b2`»
*   SMOKE-1.5 Выполнить `SM-MS-09..10` (негатив anonymous и с заголовками, обрезка диапазона `clamped=true`)
*   SMOKE-1.6 Выполнить `SM-MS-11..13` (секреты — только булевы результаты; изоляция и наличие UUID в seo-service; дублирующая доставка, рестарт worker, регрессия M1/H1)
*   SMOKE-1.V Сохранить таблицу результатов `SM-MS-01..13` и логи в `.qa/metrica-stats-parsing/smoke/`, отметить выполненные task IDs и вернуть handoff (несоответствия — с ID и шагом воспроизведения)

## 10\. QG — Quality Gate QG-FULL (профиль: Quality Gate)

**Specs:** все delta change · **Пути:** `docs/reports/metrica-stats-parsing.md`, `.qa/metrica-stats-parsing/<lane>/` · **Зависит от:** `SMOKE-1`

Lanes запускаются отдельными агентами по DAG `agents/quality_gate.md` (skill `qg-lanes`). `QG-FE-AUTO` и `QG-FE-MANUAL` — неприменимо: в change нет UI diff.

*   QG-ENV.1 Подтвердить готовность стека: yandex-service, ya-metrica-service, Celery worker (адресный ping) и beat, seo-service, Redis, их БД, alembic head ya-metrica; evidence в `.qa/metrica-stats-parsing/qg-env/`
*   QG-BE.1 Scoped format/lint/test `services/ya-metrica-service` (`make lint`, `make test-cov` с `TEST_DATABASE_URL`) и `services/yandex-service` (`make lint`, `make test`); сверить покрытие test matrix F1/F2/YS и Clean Architecture (сервисный слой резолвит креды, Celery-задачи и клиент получают готовый job)
*   QG-CONTRACTS.1 Сверить access matrix M2/Y5/M1/H1 anonymous и с Cookie/Bearer, локальный контракт `200/204/400`, отсутствие токена/ciphertext в ответах M2 и логах, соответствие Y5 ↔ клиент ya-metrica (`enc_access_token`), соответствие Celery-конфигурации `celery-redis-protocols` и `agents/redis-databases.yaml`
*   QG-LIVE.1 Независимо повторить ключевые `SM-MS-03`, `SM-MS-05`, `SM-MS-06`, `SM-MS-08`, `SM-MS-11`, `SM-MS-13` на живом стеке и сверить с handoff `SMOKE-1`
*   QG-SYNTH.1 Свести findings lanes в `docs/reports/metrica-stats-parsing.md` с вердиктом; findings направить владельцам units через Router, неприменимые lanes отметить одной строкой с причиной

## FIX-1 — Celery configuration follow-up (профиль: Backend)

*   FIX-1.1 Исправить QG-CONTRACTS C-01/C-02: `CelerySettings.populate_by_name=True`, `task_expires=3600`; регрессии canonical kwargs/aliases, валидации URL и TTL; targeted settings/workers pytest и `make lint` — PASS (52 passed), evidence `.qa/metrica-stats-parsing/fix-1/`.

## Workflow follow-up

*   После `QG-SYNTH = APPROVED`/`APPROVED_WITH_WAIVER` Router синхронизирует delta specs (`metrica-stats-storage`, `metrica-parse-queue`, `metrica-stats-ingestion`, `metrica-parse-trigger` — новые; `yandex-peer-http-contract` — изменённая), повторно выполняет `openspec status` и `openspec validate metrica-stats-parsing --type change --strict`, затем архивирует change.
*   Финализация (merge feature-веток `metrica-stats-parsing` в сервисных репозиториях) — по skill `task-finalize` и approval gates оператора; push агенты не делают.
*   Redis/Celery credentials берутся исключительно из окружения/.env самого `ya-metrica-service`; пароль Redis должен быть задан оператором в `services/ya-metrica-service/.env`. Чтение/копирование из `vk-service/.env` и зависимость от Router/оркестратора запрещены; отсутствие пароля — требование оператору, не повод генерировать или менять его. В tracked файлах (`.env.example`, README, specs) — только placeholders без секретов.

Разрешённая пользователем одноразовая подготовка (после PLAN-1): Router создал локальную `dev` от `main` и скопировал существующий `REDIS_PASSWORD` из `.docker-compose/.env` в `.env` ya-metrica-service без вывода значения. Это не runtime-зависимость: приложение читает только собственное окружение/.env, не `.docker-compose/.env` и не `.env` других сервисов. `CelerySettings` подставляет URL-encoded `REDIS_PASSWORD` из собственного `.env` в `CELERY_APP_BROKER/BACKEND` без встроенного пароля (DB 5/6). Новое копирование или смена пароля не требуется.