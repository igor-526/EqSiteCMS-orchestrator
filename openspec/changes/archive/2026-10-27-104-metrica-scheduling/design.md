# Design

Тикет: `docs/tasks/104_metrica_planning.md` · Дата: 2026-10-28 · Сервисы: `seo-service`, `ya-metrica-service`, `yandex-service`, `backend`, `frontend` (+ root: compose, Makefile, `SERVICES.md`). Мотивация и состав — `proposal.md`; требования — `specs/`.

## Context

Что есть сейчас (проверено по коду):

- **ya-metrica-service**: `POST /api/metrica/stats/parse` (`src/api/parse.py`) → `ParseEnqueueService.enqueue` (привязка у yandex-service → run + задания `pages`/`search_queries`, окна ≤5 дней, один активный запуск на конюшню, сигнал в Celery). Автоматический резолв дат уже реализован: `DateRangeResolver` берёт `max(stat_date)` по виду статистики → `date_from`, `date_to = сегодня` (по `YA_METRICA_UTC_OFFSET_HOURS`), при отсутствии статистики — 2 года назад. Celery beat запускает только `metrica.dispatch_ready`. NATS в сервисе нет.
- **seo-service**: FastAPI + PostgreSQL, все `/api/**` под tenant selector `X-Equestrian-Id` (Internal Trusted Network). NATS, scheduler и источника списка «конюшен со счётчиком» нет. `SEO_UTC_OFFSET_HOURS` (−12..14, default 3) уже задаёт «сегодня» для периодов метрик. Контейнеры `seo-service`, `seo-migration`.
- **yandex-service**: привязка живёт в `yandex_metrica_counters` (`equestrian_id` unique); API отдаёт только `GET /api/connections/metrica/{equestrian_id}` — **списка привязок нет**.
- **backend**: `/api/seo/**` — 10 ADMIN-only прокси-маршрутов (tenant из сессии, `SeoServiceClient`, route inventory в `docs/backend-route-inventory.md`). Есть NATS-клиент/publisher, но для SEO используется HTTP.
- **frontend**: `SeoPage` (вкладки «Яндекс.Метрика», «Яндекс.Вебмастер», «Страницы», «Запросы»), блок управления в `tabHeader` (пагинатор, «Сбросить», «Нормализация»), общий `ConfirmActionModal` (danger-кнопка), `SEO_ACTIONS`/`useSeoScopes` (ADMIN).
- **NATS**: `eqsitecms-nats` с JetStream (`--js`), howto `agents/howto/nats-jetstream-protocols.md`: stream создаёт сервис-владелец, consumer на чужом stream ретраит `NotFoundError`, `Nats-Msg-Id` уникален в пределах stream, `PubAck.duplicate` проверяется, AsyncAPI + README «NATS JetStream», real-broker acceptance. Прецедент consumer'а в сервисе без владения stream — `vk-service`; прецедент отдельного AsyncAPI-target вне core — `asyncapi-validate-vk`.

## Goals / Non-Goals

**Goals:**
- Единая точка управления парсингом — seo-service (расписание + ручной запуск), доставка только через NATS.
- Контракт job-команды, не привязанный к Метрике; подключение нового клиента парсинга = провайдер в seo + свой consumer.
- Идемпотентность и «один раз в сутки на конюшню/провайдера» при рестартах и нескольких процессах.
- Удаление ручного HTTP-входа из сервиса метрики.
- Кнопка обновления + подтверждение в CMS.

**Non-Goals:**
- Статус/прогресс запуска в UI и polling-endpoint (fire-and-forget; запуск виден по данным в таблицах).
- Явный диапазон дат в ручном запуске (контракт `window.explicit` предусмотрен, но API/UI не публикуют его).
- Часовой пояс на конюшню (остаётся один env-пояс; `TimezoneProvider` — точка расширения).
- Изменения ingestion, схемы статистики, Celery-очереди метрики, публичных `site-*`.
- Сервисная аутентификация peers/NATS и production isolation (прежний release gate).

## Decisions

### D1. Оркестратор — seo-service; scheduler — отдельный контейнер
Scheduler — отдельный процесс `seo-scheduler` (тот же образ seo-service, команда `python -m scheduler.main`), один экземпляр (`container_name`, по прецеденту `ya-metrica-celery-beat`). Не встраивается в API-процесс, чтобы reload/реплики API не дублировали расписание. Корректность при двух процессах всё равно обеспечивает ledger (D5). *Альтернативы:* APScheduler/Celery beat в seo (нужен Redis/Celery, которых в seo нет); фоновая задача в lifespan API (связывает расписание с жизненным циклом API, нужен leader election).

### D2. NATS-топология
| Параметр | Значение |
|---|---|
| Stream | `PARSE_COMMANDS` (владелец seo-service), subjects `commands.parse.>`, `FILE`, `LIMITS`, `max_age=7d` (`NATS_PARSE_COMMANDS_MAX_AGE_SECONDS`) |
| Subject провайдера | `commands.parse.<provider>.run` (для Метрики `commands.parse.ya_metrica.run`) |
| Durable Метрики | `ya-metrica-parse-run`, `filter_subject=commands.parse.ya_metrica.run`, `explicit`, `deliver=all`, `ack_wait=30s`, `max_deliver=5` |
| Header | `Nats-Msg-Id = uuid5(NAMESPACE_PARSE_COMMANDS, "<provider>:<job_id>")` |
| `job_id` (schedule) | `uuid5(NAMESPACE_PARSE_COMMANDS, "schedule:<provider>:<equestrian_id>:<локальная дата>")` |
| `job_id` (manual) | `uuid4()` |

`NAMESPACE_PARSE_COMMANDS = uuid5(NAMESPACE_DNS, "parse-commands.eqcms")` — константа в обоих сервисах, сверяется contract-тестом. Stream создаётся программно в `setup_streams()` клиента seo-service (API и scheduler вызывают одну и ту же функцию с одной `StreamConfig` — идемпотентно). Consumer-сторона (ya-metrica) не вызывает `add_stream`, регистрирует durable с bounded retry на `NotFoundError`. Настройки — `NatsSettings` (`NATS_*`) в каждом сервисе; код-default `NATS_SERVERS=nats://eqsitecms-nats:4222`.

Envelope (JSON, `extra=forbid`):

```json
{
  "schema_version": 1,
  "occurred_at": "2026-10-28T00:00:03Z",
  "job_id": "uuid",
  "provider": "ya_metrica",
  "equestrian_id": "uuid",
  "trigger": "schedule | manual",
  "window": {"mode": "auto"},
  "params": {}
}
```

`window` — `{"mode":"auto"}` или `{"mode":"explicit","date_from":"...","date_to":"..."}`; `params` — свободный объект, валидируемый потребителем. Секретов/ID аккаунтов Яндекса в команде нет. *Почему общий stream + wildcard, а не stream на провайдера:* новый провайдер не требует нового `add_stream` и изменения конфигурации владельца; изоляция — фильтром durable. *Почему одна команда на конюшню, а не «fan-out» внутри consumer:* seo знает расписание и цели, consumer остаётся простым исполнителем, ack/redelivery работают на единицу работы.

### D3. Расширяемость (provider registry)
В seo-service вводится протокол провайдера и реестр (Clean Architecture: протоколы в `core/protocols`, реализации в `providers/`, сборка в DI):

```text
ParseProviderProtocol:
  code: str                                   # "ya_metrica"
  subject: str                                # commands.parse.<code>.run
  list_targets(offset, limit) -> (items, total)   # equestrian_id, у которых есть интеграция
  is_target(equestrian_id) -> bool            # preflight ручного запуска
  build_params(trigger) -> dict               # provider-specific params
ParseProviderRegistry: register / get(code) / enabled()   # enabled — PARSE_PROVIDERS_ENABLED
```

`YaMetricaParseProvider` использует `YandexServiceClient` (httpx; `GET /api/connections/metrica`, `GET /api/connections/metrica/{id}`). Scheduler, `ParseDispatchService`, ledger, publisher и API не знают о Метрике. Как добавить клиента (фиксируется в README seo-service): (1) класс провайдера + регистрация в контейнере; (2) код в `PARSE_PROVIDERS_ENABLED`; (3) в сервисе-исполнителе — durable с `filter_subject=commands.parse.<code>.run` и handler; (4) канал в AsyncAPI. Тест `UT-PS-03/10` доказывает путь на фейковом провайдере `demo`.

### D4. Расписание и часовой пояс
- Время: `PARSE_SCHEDULE_TIME=HH:MM` (default `03:00`). Пояс: существующий `SEO_UTC_OFFSET_HOURS` — «пояс всех конюшен» (по условию задачи один на всех). Это тот же источник «сегодня», что у периодов метрик seo; отдельной переменной нет. Точка расширения под пояс на конюшню — протокол `TimezoneProvider.utc_offset_hours(equestrian_id)` с реализацией `EnvTimezoneProvider`.
- Tick каждые `PARSE_SCHEDULER_TICK_SECONDS` (30): `local_now = utc_now + offset`; слот локальной даты наступил при `local_now.time() >= PARSE_SCHEDULE_TIME`; закрепление за `schedule_date = local_now.date()`; догоняется до конца этих локальных суток. Проход по целям in-memory помечается завершённым для `(provider, date)` (после рестарта проход повторяется дёшево: ledger отсекает уже опубликованное).
- Цели постранично (`PARSE_TARGETS_PAGE_SIZE`, default 100) → для каждой `claim → publish → mark`.
- **Согласование поясов:** окно дат вычисляет ya-metrica по `YA_METRICA_UTC_OFFSET_HOURS`; значения seo и metrica должны совпадать (ручное согласование, уже принятое в проекте). Расхождение документируется в README; при `03:00` и разнице поясов ≤ 3 ч «сегодня» совпадает, при большей — окно может сместиться на сутки (риск R2).

### D5. Ledger диспетчеризации (`parse_dispatches`, PostgreSQL seo-service)
| Колонка | Тип |
|---|---|
| `id` | uuid PK (= `job_id`) |
| `provider` | varchar(32) |
| `equestrian_id` | uuid |
| `trigger` | varchar(16) (`schedule`/`manual`) |
| `schedule_date` | date NULL (NOT NULL при `trigger=schedule`, CHECK) |
| `status` | varchar(16) (`pending`/`published`/`failed`) |
| `attempts` | int |
| `last_error_code` | varchar(32) NULL |
| `created_at`, `updated_at`, `published_at` | timestamptz |

Уникальный частичный индекс `(provider, equestrian_id, schedule_date) WHERE trigger='schedule'`. Захват: `INSERT … ON CONFLICT DO UPDATE SET status='pending', attempts=attempts+1 WHERE status='failed' AND attempts < max OR (status='pending' AND updated_at < now() - lease) RETURNING id`; пустой результат — цель пропускается. Публикация после захвата; `mark_published/mark_failed` отдельными короткими транзакциями. Для `manual` запись создаётся **после** успешного `PubAck` (аудит), при сбое брокера записи нет, ответ `503`, повтор безопасен. Alembic-миграция `20261028_0003_parse_dispatches` (down_revision `20261023_0002`).

### D6. Ручной запуск
`POST /api/parse-jobs` (seo, роутер уже под `get_equestrian_id`) → `ParseDispatchService.dispatch_manual`: провайдер из реестра и включён (иначе `400`) → `is_target` (иначе `400`; сбой yandex-service → `502`) → публикация (сбой → `503`) → ledger → `202 {job_id, provider, status:"accepted"}`. Дедупликация активного запуска остаётся на стороне исполнителя (`ParseAlreadyActiveError` → ack, запуск пропущен; пользователь о пропуске не уведомляется, см. Non-Goals). Backend: `POST /api/seo/parse-jobs` (ADMIN-only, `require_seo_admin`), DTO `{provider}` с `extra=forbid` и маской кода; `SeoServiceClient._request` получает `expected_status=202` и обработку `503` → `SeoQueueUnavailableError` → HTTP `503`.

### D7. Исполнитель (ya-metrica-service)
- NATS-слой по образцу `vk-service`: `clients/nats/{client,lifecycle}.py` (без `add_stream`; `setup_consumers` с retry на `NotFoundError`, `BadRequestError` — сразу), `consumers/parse_run.py` (pull, fetch batch/timeout), `handlers/parse_run.py`.
- Запуск consumer'а — в `lifespan` FastAPI. Старт не блокируется брокером: фоновая задача с backoff подключает NATS, регистрирует durable и стартует consumer (улучшение относительно degraded-mode vk, чтобы команды расписания не терялись до рестарта); `GET /health` остаётся статическим.
- Handler: `ParseCommand.model_validate_json` → `ParseEnqueueService.enqueue(ParseEnqueueInDto(equestrian_id, даты из window), job_id=...)`. Карта исходов — `specs/metrica-parse-command-consumer`.
- `job_id`: миграция `20261028_0003_run_job_id` (nullable `job_id uuid` в `metrica_parse_runs`, уникальный индекс; `down_revision` = текущая head `20261026_0002`); `create_run_with_tasks` при конфликте `job_id` возвращает «уже существует» → handler подтверждает сообщение. Существующие запуски остаются с `NULL`.
- **Удаление M2:** `src/api/parse.py`, `ParseRunInDto/ParseRunOutDto` (`core/schemas/api/parse.py`), `parse_router` в `main.py`, `tests/api/test_parse_api.py`; `ParseEnqueueInDto/OutDto` (`core/schemas/parse.py`) остаются внутренними. `SAFE_DETAILS` в `main.py` для parse-ошибок остаётся (используется общими обработчиками) либо чистится без изменения поведения M1/M3–M6. Guard-тест: запрос на старый путь → `400` (R1), в `app.openapi()` маршрута нет.

### D8. yandex-service: список привязок
`GET /api/connections/metrica?limit&offset` → `{total, items:[{equestrian_id, counter_id}]}`; репозиторий `list_paginated` (ORDER BY `equestrian_id`), DTO без токенов/аккаунта. Маршрут не конфликтует с `/metrica/{equestrian_id}`. Peer остаётся credential-less (dev-допущение Q2, production gate прежний).

### D9. Frontend
- API-слой: `postSeoParseJob` в `src/api/seo.ts` (+ типы `SeoParseJobInDto/OutDto` в `src/types/api/seo.ts`), сервис `startSeoParseJob` в `seoDataService.ts` (через `safeSeoResult`), scope `SEO_ACTIONS.START_PARSE` (ADMIN), hook `useSeoParseRefresh` (open/confirm/cancel/pending/error, синхронный guard от повторного submit, guard прав).
- UI: единый экземпляр hook + модалки в `SeoPage`; кнопка «Обновить данные» (`SyncOutlined`) в блоке управления вкладок `pages` и `queries` (рядом с «Сбросить»), модалка на `ConfirmActionModal` с новыми **необязательными** свойствами `okText`/`okDanger` (по умолчанию как раньше — отвязка счётчика не меняется). Успех → `message.success("Обновление поставлено в очередь")`, таблица не перечитывается автоматически (данные появятся после парсинга).
- Только desktop 1366×768; mobile/tablet не реализуются.

### D10. Инфраструктура и документация
`.docker-compose/docker-compose.seo.yml`: сервис `seo-scheduler` (без портов, `restart: always`, env из `services/seo-service/.env`). `.env.example` seo/metrica — новые переменные. Корневой `Makefile`: `asyncapi-validate-parse` (оба файла). `SERVICES.md`: убрать M2, описать цепочку, новые env, контейнер, endpoint'ы. README seo/metrica/yandex/backend — секции «NATS JetStream» и новые маршруты. Реальные `.env` (gitignored) исполнители не правят: код-default'ы достаточны, оператор при желании добавляет переменные сам.

## Access matrix

Дефолт AGENTS.md: `GET` — Public Read, `POST/PATCH/DELETE` — Protected Write. Все endpoint'ы ниже — внутренние/админские данные, публичным `site-*` не нужны. Исключения и причины зафиксированы в specs.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| POST | backend `/api/seo/parse-jobs` | Protected Write | только ADMIN (SUPERUSER/DEVELOPER без ADMIN — нет) | `401` | `202` `{job_id, provider, status}`; без ADMIN `403` до downstream; невалидное тело/провайдер/нет интеграции `400`; seo/yandex недоступны или невалидный ответ `502`; очередь недоступна `503` |
| POST | seo `/api/parse-jobs` | Internal Trusted Network Write (исключение: приватный peer, роль проверяет backend; selector — non-secret hint) | доверенный внутренний caller (backend) | без/невалидный `X-Equestrian-Id` `401` до разбора тела; с selector без credentials `202`; тело/провайдер/нет интеграции `400`; yandex недоступен `502`; брокер недоступен `503` | то же; cookie/Authorization игнорируются |
| GET | yandex `/api/connections/metrica` | Private Peer Read exception (внутренний реестр привязок, не для `site-*`) | доверенный внутренний caller (seo scheduler) | `200 {total, items}`; невалидные `limit`/`offset` `400` | то же |
| POST | ya-metrica `/api/metrica/stats/parse` | **Удалён** (framework rejection R1) | никто | `400`, операция не вызвана | то же |
| — | NATS `commands.parse.ya_metrica.run` | Internal Trusted Network Write | seo-service → ya-metrica | валидная команда принимается брокером | то же |
| GET | seo/ya-metrica/yandex `/health` | Public Read (без изменений) | любой | `200` | то же |

Остальные endpoint'ы M1, M3–M6, Y1–Y9, существующие `/api/seo/**` не меняются.

## Deliverables и ownership

| Deliverable | Ownership paths | Профиль |
|---|---|---|
| A. ya-metrica | `services/ya-metrica-service/**` (кроме чужих) | Backend |
| B. seo-service + root infra/docs | `services/seo-service/**`, `.docker-compose/docker-compose.seo.yml`, `Makefile` (только цель `asyncapi-validate-parse`), `SERVICES.md` (только секции Метрики/SEO) | Backend |
| C. yandex-service | `services/yandex-service/**` | Backend |
| D. backend | `services/backend/**` (SEO-прокси, route inventory) | Backend |
| E. frontend | `services/frontend/src/{api,types/api,features/seo}/**` | Frontend |
| F. QG | `.qa/104-metrica-scheduling/**`, `docs/reports/104-metrica-scheduling.md` | Quality Gate |

`services/*` — игнорируемые вложенные репозитории: коммиты по сервисам выполняются по их правилам; `openspec/**` и root-файлы — root-репозиторий.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| `YS-1` | Backend | C | `services/yandex-service/{src,tests,README.md}` | approval | `make -C services/yandex-service test` + integration `IT-YB-01` |
| `MT-1` | Backend | A | `ya-metrica` migration `20261028_0003`, `models/metrica_parse.py`, `core/entities/metrica_parse.py`, run repository + protocol, `parse_enqueue_service.py`, tests | approval | targeted unit `UT-MP-04` + `IT-MP-01` |
| `MT-2` | Backend | A | `ya-metrica` `core/schemas/messaging/**` (payload), handler (`clients/nats/handlers/**`), удаление M2 (`api/parse.py`, `core/schemas/api/parse.py`, router в `main.py`, `tests/api/test_parse_api.py`), tests | `MT-1` | targeted unit `UT-MP-01..03,08` |
| `MT-3` | Backend | A | `ya-metrica` `settings.py`, `clients/nats/{client,lifecycle}.py`, `clients/nats/consumers/**`, `containers/**`, `main.py` lifespan, `utils/configure_sentry.py`, `pyproject`/`uv.lock`, tests | `MT-2` | targeted unit `UT-MP-05..07,09` |
| `MT-4` | Backend | A | `ya-metrica` `docs/asyncapi.yaml`, `README.md`, `.env.example`, `tests/integration/test_nats_broker.py` | `MT-3` | `IT-NATS-M1` на реальном NATS + `make -C services/ya-metrica-service test` |
| `SEO-1` | Backend | B | `seo` `settings.py`, `clients/nats/**`, `core/schemas/messaging/**`, `utils/configure_sentry.py`, `pyproject`/`uv.lock`, tests `UT-PS-01,06..08` | approval | targeted unit |
| `SEO-2` | Backend | B | `seo` ledger: `models/parse_dispatches.py`, migration `20261028_0003`, entity, repository + protocol, tests `IT-PS-01..02` | approval | targeted PostgreSQL tests |
| `SEO-3` | Backend | B | `seo` providers: protocol, registry, `clients/yandex_service.py`, `providers/ya_metrica.py`, exceptions, DI, tests `UT-PS-03..05` | `SEO-1`, `SEO-2` | targeted unit |
| `SEO-4` | Backend | B | `seo` `core/services/parsing/**` (dispatch service, slot calc, timezone provider), `containers/**` wiring, tests `UT-PS-02,09..10` | `SEO-3` | targeted unit |
| `SEO-5` | Backend | B | `seo` API `parse_jobs`, schemas, lifespan NATS wiring, 503 handler, `test_access` adaptation, tests `UT-PS-12..13` | `SEO-4` | `make -C services/seo-service test` |
| `SEO-6` | Backend | B | `seo` `scheduler/**`, runner loop, tests `UT-PS-11`, `IT-NATS-S1` | `SEO-4` | targeted unit + infra `IT-NATS-S1` |
| `SEO-7` | Backend | B | `seo` README/`.env.example`/`docs/asyncapi.yaml`, `docker-compose.seo.yml`, root `Makefile`, `SERVICES.md` | `SEO-5`, `SEO-6`, `MT-4`, `YS-1` | `make asyncapi-validate-parse`, `docker compose config` |
| `BK-1` | Backend | D | `services/backend` SEO client/protocol/proxy/route/schemas, route inventory, tests | approval | `make -C services/backend test` |
| `FE-1` | Frontend | E | `services/frontend` types, api, service, scope, hook, `ConfirmActionModal` props, tests | approval | targeted vitest |
| `FE-2` | Frontend | E | `services/frontend` `SeoPage` wiring, кнопка, модалка, стили, tests | `FE-1` | targeted vitest + `tsc` |
| `QG-ENV` | Quality Gate | F | — (readiness) | все исполнители | readiness-группа |
| `QG-BE` | Quality Gate | F | — | `QG-ENV` | scoped format/lint/test 5 сервисов |
| `QG-FE-AUTO` | Quality Gate | F | — | `QG-ENV` | `npm test/lint/typecheck/build` |
| `QG-CONTRACTS` | Quality Gate | F | — | `QG-ENV` | AsyncAPI, access matrix, real-broker `IT-NATS-*` |
| `QG-LIVE` | Quality Gate | F | — | `QG-BE`, `QG-FE-AUTO`, `QG-CONTRACTS` | `SM-PS-01..09` |
| `QG-FE-MANUAL` | Quality Gate | F | — | `QG-BE`, `QG-FE-AUTO`, `QG-CONTRACTS` | `M-PR-01..10` (1366×768) |
| `QG-SYNTH` | Quality Gate | F | `docs/reports/104-metrica-scheduling.md` | `QG-LIVE`, `QG-FE-MANUAL` | единый вердикт |

Контракт зафиксирован в specs, поэтому `BK-1`, `FE-1`, `YS-1`, `MT-*`, `SEO-1/2` независимы по коду и могут идти параллельно (разные сервисы/пути); внутри одного сервиса units выполняются последовательно в порядке зависимостей. `SEO-1` и `SEO-2` не пересекаются по файлам и допускают параллель; если Router предпочитает последовательность — `SEO-1` → `SEO-2`.

### DAG

```text
YS-1 ─────────────────────────────────────────────────────────────┐
MT-1 → MT-2 → MT-3 → MT-4 ────────────────────────────────────────┤
SEO-1 ─┬→ SEO-3 → SEO-4 ─┬→ SEO-5 ──────────────────────────────────┼→ SEO-7 ─┐
SEO-2 ─┘                 └→ SEO-6 ──────────────────────────────────┘         │
BK-1 ─────────────────────────────────────────────────────────────────────────┤
FE-1 → FE-2 ──────────────────────────────────────────────────────────────────┤
                                                                              ▼
 QG-ENV → (QG-BE ∥ QG-FE-AUTO ∥ QG-CONTRACTS) → (QG-LIVE ∥ QG-FE-MANUAL) → QG-SYNTH
```

Критический путь: `SEO-1 → SEO-3 → SEO-4 → SEO-6 → SEO-7`. Рекомендуемый порядок: волна 1 — `YS-1`, `MT-1`, `SEO-1`, `SEO-2`, `BK-1`, `FE-1`; волна 2 — `MT-2`, `SEO-3`, `FE-2`; волна 3 — `MT-3`, `SEO-4`; волна 4 — `MT-4`, `SEO-5`, `SEO-6`; волна 5 — `SEO-7`; затем QG.

### Рекомендуемый профиль Quality Gate

**`QG-FULL`** (миграции в seo и ya-metrica, NATS/AsyncAPI, >2 сервисов с кодом). Lanes: `QG-ENV` → (`QG-BE` ∥ `QG-FE-AUTO` ∥ `QG-CONTRACTS`) → (`QG-LIVE` ∥ `QG-FE-MANUAL`) → `QG-SYNTH`. `QG-FORMAT` входит в `QG-BE`/`QG-FE-AUTO`. `QG-CONTRACTS` дополнительно: `make asyncapi-validate-parse`, равенство AsyncAPI ↔ settings/модели, real-broker gate (`IT-NATS-S1`, `IT-NATS-M1` без skip). `QG-LIVE` требует рестарта seo (пересборка/`seo-migration`), ya-metrica (пересборка + миграция), yandex, backend, запуска `seo-scheduler`; `stackctl` seo/metrica не поддерживает — штатный `make`/Compose.

## Test matrix

Нумерация: `UT-PS` (seo), `IT-PS`/`IT-NATS-S` (seo integration/real broker), `UT-MP`/`IT-MP`/`IT-NATS-M` (metrica), `UT-YB`/`IT-YB` (yandex), `UT-BK` (backend), `SM-PS` (live). Трассировка: R-* = requirement в `specs/<cap>`, AM = строка access matrix.

### Backend

| ID | Уровень | Ось | Сценарий | Ожидание | Где / трассировка |
|---|---|---|---|---|---|
| `UT-PS-01` | unit | валидация | Settings (SEO-1): время `HH:MM`, default, невалидные `25:00`/`3:7`/пусто, неизвестный провайдер в `PARSE_PROVIDERS_ENABLED`, `PARSE_SCHEDULE_ENABLED` | значения/ошибка конфигурации | seo `tests/unit/test_settings.py` · `seo-parse-scheduling` R1 |
| `UT-PS-02` | unit | граничные | Слот: до/после времени, смена суток при offset −12/+14, `schedule_date` по локальной дате, догон в те же сутки | точная due-логика | seo `tests/unit/test_parse_slot.py` · R2 |
| `UT-PS-03` | unit | расширяемость | Реестр: register/get/enabled, дубль кода, неизвестный/отключённый → `400`-ошибка | поведение реестра | seo `tests/unit/test_parse_registry.py` · R7 |
| `UT-PS-04` | unit | внешние ошибки | `YaMetricaParseProvider`: пагинация целей, `is_target` true/false, yandex недоступен/невалидная схема → `ParseTargetsUnavailableError` | цели/ошибки | seo `tests/unit/test_ya_metrica_provider.py` · R3 |
| `UT-PS-05` | unit | контракт/безопасность | `YandexServiceClient`: без credentials и cookie, таймаут, не-2xx, лог без URL/тела | безопасные ошибки | seo `tests/clients/test_yandex_service_client.py` |
| `UT-PS-06` | unit | идемпотентность/контракт | Envelope: `extra=forbid`, `window` auto/explicit, `Nats-Msg-Id`/`job_id` детерминированы для schedule, различны для manual/разных провайдеров/конюшен | схемы и ID | seo `tests/unit/test_parse_command_schema.py` · `parse-job-messaging` R2–R4 |
| `UT-PS-07` | unit | внешние ошибки | Publisher: `PubAck.duplicate` → warning и признак; сбой публикации → `ParseQueueUnavailableError`; headers | поведение publisher | seo `tests/unit/test_parse_publisher.py` · R4 |
| `UT-PS-08` | unit | topology | Client `setup_streams`: `StreamConfig` (имя, `commands.parse.>`, FILE, LIMITS, max_age), повтор идемпотентен, consumers не регистрируются, `close()` терпит ошибку drain | программное создание stream | seo `tests/unit/test_nats_client.py` · R1 |
| `UT-PS-09` | unit | ручной запуск | `dispatch_manual`: unknown/disabled → 400, не target → 400, yandex down → 502, брокер down → 503 без записи ledger, успех → `job_id` и запись `published` | исходы | seo `tests/unit/test_parse_dispatch_manual.py` · `seo-parse-trigger-api` R1–R2 |
| `UT-PS-10` | unit | идемпотентность/ошибки | `dispatch_scheduled`: захват → публикация → mark; конфликт захвата → skip; сбой публикации → `failed` + повтор; cap попыток; сбой списка целей не отмечает слот; фейковый провайдер `demo` без правок кода | поведение слота | seo `tests/unit/test_parse_dispatch_scheduled.py` · `seo-parse-scheduling` R3–R4, R7 |
| `UT-PS-11` | unit | устойчивость | Runner с fake clock: tick до времени no-op; один прогон в сутки; рестарт после выполнения без дублей (fake ledger); disabled; ошибка одной цели/провайдера не останавливает остальные; graceful cancel; NATS down → retry | цикл scheduler | seo `tests/unit/test_scheduler_runner.py` · R8 |
| `UT-PS-12` | API | access | `POST /api/parse-jobs`: без selector/невалидный `401` до тела; selector без credentials `202`; cookie/Authorization игнорируются; `400` (extra/`equestrian_id` в теле/плохой код/unknown); `502`; `503`; схема ответа | матрица | seo `tests/api/test_parse_jobs_api.py` · AM seo |
| `UT-PS-13` | API | регрессия | `tests/api/test_access.py` (`API_ROUTES` из openapi) учитывает новый маршрут; остальные 12 операций не изменились | зелёный набор | seo `tests/api/test_access.py` |
| `IT-PS-01` | integration PG | миграции | `20261028_0003` upgrade/downgrade на реальной PostgreSQL, partial unique index, CHECK `schedule_date` | схема | seo `tests/integration/test_migrations_postgres.py` |
| `IT-PS-02` | integration PG | конкурентность | Репозиторий ledger: два параллельных захвата одного слота → один; reclaim `failed`/просроченного `pending`; manual не конфликтует со schedule | гарантии | seo `tests/integration/test_parse_dispatch_postgres.py` · `seo-parse-scheduling` R4 |
| `IT-NATS-S1` | integration broker | real broker | Реальный NATS (marker `infrastructure`, без skip): stream на пустом брокере, повторный `add_stream`, публикация, `duplicate=true` на повторный `Nats-Msg-Id` | topology/дедуп | seo `tests/integration/test_nats_broker.py` · `parse-job-messaging` R1,R4,R6 |
| `UT-MP-01` | unit | валидация | Payload: valid; не-JSON; неизвестный `schema_version`; provider ≠ subject; `extra`; плохой `window`; `params` не пуст | `term`/модель | ya-metrica `tests/unit/test_parse_command_schema.py` · `metrica-parse-command-consumer` R4 |
| `UT-MP-02` | unit | исходы | Handler: успех/дубликат `job_id`/активный запуск/нет привязки/диапазон → ack; yandex недоступен/DB → nak; битое → term; логи без секретов | карта исходов | ya-metrica `tests/unit/test_parse_command_handler.py` · R4,R6 |
| `UT-MP-03` | unit | окно дат | Команда `auto`: last=вчера → «вчера..сегодня» по обоим видам; нет статистики → 2 года (окна ≤5 дн); last=5 дней назад → без пробелов; last старше 2 лет | диапазоны | ya-metrica `tests/unit/test_parse_date_resolver.py` + `test_parse_enqueue_service.py` · `metrica-parse-trigger` R-Авто |
| `UT-MP-04` | unit | идемпотентность | `enqueue(job_id=…)`: повторный job_id → без заданий и без dispatch; `job_id=None` как раньше | поведение | ya-metrica `tests/unit/test_parse_enqueue_service.py` · R3 |
| `UT-MP-05` | unit | consumer | Pull-consumer: durable/filter/stream имена, ack/nak/term, fetch timeout → continue, cancel | поведение | ya-metrica `tests/unit/test_parse_consumer.py` · R1 |
| `UT-MP-06` | unit | topology | `setup_consumers`: retry только `NotFoundError` до max, `BadRequestError` сразу, нет `add_stream` | ретраи | ya-metrica `tests/unit/test_nats_client.py` · R1 |
| `UT-MP-07` | unit/API | устойчивость | Lifespan: NATS down → `/health` 200, фон-retry, shutdown не падает | старт | ya-metrica `tests/unit/test_lifespan_nats.py` · R5 |
| `UT-MP-08` | API | access/регрессия | `POST /api/metrica/stats/parse` anonymous и с cookie/Bearer → `400` (R1), маршрута нет в `openapi`; M1, M3–M6, H1 без изменений | AM metrica | ya-metrica `tests/api/test_parse_removed_api.py` + существующие API-тесты |
| `UT-MP-09` | unit | конфигурация | `NatsSettings`: defaults/env/валидация | значения | ya-metrica `tests/unit/test_settings.py` |
| `IT-MP-01` | integration PG | миграции | `job_id` nullable+unique; repo: конфликт `job_id` → «уже есть»; старые run с `NULL` | схема/репо | ya-metrica `tests/integration/test_tasks_repository_postgres.py`, `tests/unit/test_migrations.py` |
| `IT-NATS-M1` | integration broker | real broker | Реальный NATS: durable на stream seo (фикстура создаёт тот же `StreamConfig`), explicit ack, nak/redelivery, `max_deliver`, `term` без повтора | consumer-контракт | ya-metrica `tests/integration/test_nats_broker.py` · `parse-job-messaging` R6 |
| `UT-YB-01` | API | access/контракт | `GET /api/connections/metrica`: anonymous = с cookie; `limit/offset` границы → 400; элементы ровно `{equestrian_id, counter_id}`; `total` | AM yandex Y10 | yandex `tests/api/test_yandex_connections.py` · `yandex-metrica-binding-list` |
| `IT-YB-01` | integration PG | персистентность | `list_paginated`: сортировка, страницы 100/100/50, offset за пределами → пусто, `total` | реальная БД | yandex `tests/integration/test_counter_repository_postgres.py` |
| `UT-BK-01` | API | access | `POST /api/seo/parse-jobs`: anonymous `401`, SUPERUSER+DEVELOPER без ADMIN `403` до downstream, ADMIN `202` | AM backend | backend `tests/unit/api/test_seo_proxy_api.py` |
| `UT-BK-02` | API | tenant | Конюшня из сессии; `equestrian_id`/selector клиента не влияют; cookie не пересылаются | изоляция | то же |
| `UT-BK-03` | API | валидация | Тело: нет `provider`/плохая маска/extra → `400` до downstream | `400` | то же |
| `UT-BK-04` | API | ошибки | seo `400` → `400` (detail ≤300), `502` (недоступен/невалидный ответ), `503`→`503` | маппинг | то же + backend `tests/unit/api/test_seo_client_boundary.py` |
| `UT-BK-05` | unit | инвентарь | Route inventory содержит 11 `/api/seo/*`, `docs/backend-route-inventory.md` регенерирован | соответствие | backend `tests/unit/api/test_route_access_inventory.py` |

Приоритеты риска: идемпотентность и конкурентность (`UT-PS-10`, `IT-PS-02`, `UT-MP-04`, `IT-MP-01`), реальный брокер (`IT-NATS-*`), access (`UT-PS-12`, `UT-BK-01..03`, `UT-MP-08`, `UT-YB-01`). Ось «happy path» для каждого слоя покрыта сценариями выше без дублирующих однотипных тестов.

### Frontend

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| `src/api/seo.ts`, `types/api/seo.ts` | `postSeoParseJob` (`POST /seo/parse-jobs`, тело `{provider}`) | `FT-PR-01` API-boundary c MSW: 202, 400, 401 (штатный refresh), 403, 502, 503, сеть; успех не имитируется при ошибке | anonymous → 401; ADMIN → 202; без ADMIN → 403 | `npx vitest run src/api/seo.test.ts` |
| `seoDataService.ts` | `startSeoParseJob` через `safeSeoResult`, константа провайдера | `FT-PR-02` unit: маппинг ошибок, non-string `detail` → безопасное сообщение | scopes n/a | `npx vitest run src/features/seo/services` |
| `useSeoScopes.ts` | `SEO_ACTIONS.START_PARSE` → ADMIN | `FT-PR-03` unit: ADMIN да; SUPERUSER/DEVELOPER без ADMIN нет | scope present/missing | `npx vitest run src/features/seo/hooks/useSeoScopes.test.ts` |
| `useSeoParseRefresh.ts` | open/confirm/cancel, pending, sync-guard, права | `FT-PR-04` hook (MSW): один POST при двойном confirm; без права нет вызова; ошибка остаётся в модалке; cancel в pending заблокирован; 401/403 | present/missing; backend denial 401/403 | `npx vitest run src/features/seo/hooks/useSeoParseRefresh.test.ts` |
| `SeoPage`, `ConfirmActionModal` | кнопка «Обновить данные» на вкладках «Страницы»/«Запросы», модалка, не-danger OK, success-уведомление | `FT-PR-05` component: кнопка на двух вкладках и отсутствует на Метрика/Вебмастер; доступное имя; текст/кнопки; confirm → toast, таблица не перезапрошена; Esc/«Отмена» без запроса; фокус возвращается | ADMIN: есть; без ADMIN: страница 403, вызовов нет; anonymous: protected layout | `npx vitest run src/features/seo/ui` |
| регрессии | «Сбросить», пагинатор, «Нормализация», модалка отвязки (danger, «Подтвердить») | `FT-PR-06` существующие `SeoPage.test.tsx`, `MetricaConnectionCard.test.tsx` + проверка props по умолчанию | как прежде | `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` |

Правила: MSW/mocks для success, validation error, generic, `401`, `403`; запрещены live backend calls в unit/component/API-boundary тестах; `site-*` не импортируется; пагинация списков не меняется (кнопка не трогает `limit/offset`).

### Live API (QG-LIVE, `.claude/skills/api-smoke-test` на реальных PostgreSQL и NATS)

| ID | Сценарий | Ожидание | Трассировка |
|---|---|---|---|
| `SM-PS-01` | anonymous `POST /api/seo/parse-jobs` | `401` | AM backend |
| `SM-PS-02` | пользователь без ADMIN (SUPERUSER/DEVELOPER) | `403`, в stream ничего нового | AM backend |
| `SM-PS-03` | ADMIN, конюшня со счётчиком | `202`; запись в `parse_dispatches` (`manual`, `published`); сообщение в `PARSE_COMMANDS`; в metrica появился run с `job_id` и задания `pages`/`search_queries` (`date_mode=auto`) | R seo-parse-trigger-api, metrica consumer |
| `SM-PS-04` | ADMIN, конюшня без привязки | `400`, команды нет | R2 trigger |
| `SM-PS-05` | seo peer: без selector → `401`; с selector + cookie/Bearer → `202` одинаково | матрица | AM seo |
| `SM-PS-06` | `POST /api/metrica/stats/parse` anonymous и с cookie | `400`, маршрута нет в `/openapi.json`; M1/H1 как прежде | AM metrica |
| `SM-PS-07` | scheduler с `PARSE_SCHEDULE_TIME` = ближайшее время (+2 мин, local env override на время теста) | по одной команде на каждую привязанную конюшню; рестарт scheduler в те же сутки — дублей нет; ledger `schedule/published` | seo-parse-scheduling R2–R4 |
| `SM-PS-08` | yandex `GET /api/connections/metrica` anonymous и с cookie | `200`, идентичное тело `{total, items}` без секретов | AM yandex Y10 |
| `SM-PS-09` | брокер остановлен (если допустимо на dev-стенде; иначе — unit/IT evidence) | `POST /api/parse-jobs` → `503`, записи ledger нет; после старта брокера повтор → `202` | R2 trigger |

## PostgreSQL для smoke-тестов

Результат `docker ps` / `docker inspect` (2026-10-28): контейнеры PostgreSQL 16 в сети `eqsitecms_network`.

| Контейнер | `POSTGRES_USER` / `POSTGRES_DB` | Host-порт | Назначение |
|---|---|---|---|
| `eqsitecms-db-seo` | `eqsitecmsseo` / `eqsitecmsseo` | `5437` | ledger `parse_dispatches`, SEO-таблицы |
| `eqsitecms-db-ya-metrica` | `eqsitecmsyametrica` / `eqsitecmsyametrica` | `5439` | `metrica_parse_runs.job_id`, задания |
| `eqsitecms-db-yandex` | `eqsitecmsyandex` / `eqsitecmsyandex` | `5438` | `yandex_metrica_counters` |

Пароль в `docker inspect` не раскрывается (секрет): QG берёт его из `services/<сервис>/.env`, не копируя в отчёты. NATS: `eqsitecms-nats` (`4222`, `8222`, JetStream включён `--js`). Приложения: `eqsitecms-seo-service` (host `8005→8000`), `eqsitecms-ya-metrica-service`, `eqsitecms-yandex-service`, `eqsitecms-app` (backend). Параметры QG обязан перепроверить `docker inspect` в `QG-ENV`, а не хардкодить. Для PostgreSQL integration-тестов — `TEST_DATABASE_URL` (`postgresql+asyncpg`) выделенной тестовой БД, как в существующих `tests/integration/conftest.py`.

## Manual QA steps (UI тестирование)

Пользователь (или `QG-FE-MANUAL`, viewport **1366×768**) выполняет шаги в браузере на `http://localhost:3000` под ADMIN; стенд: backend, seo, ya-metrica, yandex, NATS подняты, у конюшни привязан счётчик.

1. Открыть «SEO» → вкладка «Яндекс.Метрика»: кнопки «Обновить данные» нет.
2. Вкладка «Яндекс.Вебмастер»: кнопки нет.
3. Вкладка «Страницы»: в блоке управления шапки (пагинатор, «Сбросить», «Нормализация») видна кнопка «Обновить данные»; элементы не перекрываются, горизонтального скролла шапки нет.
4. Вкладка «Запросы»: кнопка «Обновить данные» видна рядом с «Сбросить», раскладка без наложений.
5. Нажать «Обновить данные» на «Страницах» → открывается модалка: заголовок, пояснение (данные загружаются в фоне, таблица обновится позже), кнопки «Подтвердить» (не красная) и «Отмена».
6. Нажать «Отмена» → модалка закрылась, в Network нет `POST /api/seo/parse-jobs`, фокус вернулся на кнопку.
7. Повторить с клавиатуры: Tab до кнопки → Enter → Esc → модалка закрыта, запроса нет.
8. Открыть модалку, нажать «Подтвердить» → ровно один `POST /api/seo/parse-jobs` с телом `{"provider":"ya_metrica"}`; во время запроса кнопки заблокированы, закрыть модалку нельзя.
9. Ответ `202` → модалка закрыта, уведомление «Обновление поставлено в очередь»; таблица автоматически не перезапрашивалась (нет повторных `GET /api/seo/pages`).
10. Через ~минуту (или `docker logs eqsitecms-ya-metrica-service`) убедиться, что метрика приняла команду; после завершения парсинга ручное «Сбросить»/смена фильтра показывает свежие данные.
11. Быстрый двойной клик по «Подтвердить» → в Network один POST.
12. Повторить шаги 5–9 на вкладке «Запросы» → то же поведение.
13. Отвязать счётчик (вкладка «Яндекс.Метрика»), затем «Обновить данные» → «Подтвердить» → ответ `400`, модалка остаётся открытой с сообщением о непривязанном счётчике, «Подтвердить» снова активна.
14. Привязать счётчик обратно; остановить `eqsitecms-nats`, подтвердить обновление → `503`, модалка с сообщением «Не удалось поставить задачу, повторите позже», POST не повторяется автоматически; поднять NATS, нажать «Подтвердить» снова → успех.
15. Регрессия: модалка «Отвязать счётчик?» по-прежнему с красной кнопкой «Подтвердить»; «Нормализация», «Сбросить», пагинатор, фильтры метрик работают как прежде.
16. Пользователь без роли ADMIN (SUPERUSER/DEVELOPER) → раздел SEO показывает «Недостаточно прав», запросов `POST /api/seo/parse-jobs` нет.

## Risks / Trade-offs

- **R1. Потеря команды при недоступном consumer'е.** → JetStream хранит сообщения (`max_age=7d`), durable `deliver=all`; consumer стартует с фоновым retry; события не теряются, но могут обрабатываться с задержкой. Ручной запуск при недоступном брокере явно отвечает `503`.
- **R2. Расхождение поясов seo и metrica** (окно дат считает metrica). → Значения `SEO_UTC_OFFSET_HOURS` и `YA_METRICA_UTC_OFFSET_HOURS` согласуются вручную (как уже принято), предупреждение в README и `.env.example`; команда несёт `window=auto`, поэтому окно всегда определяется одним владельцем (metrica).
- **R3. Первый запуск для свежепривязанного счётчика** = полный 2-летний backfill (текущее поведение auto). → Нагрузка ограничена очередью (≤5-дневные окна, один аккаунт — один running); допустимость подтверждена пользователем (решение 6).
- **R4. Тихий пропуск ручного запуска при активном парсинге** (исполнитель отвечает ack). → Осознанный Non-Goal (нет статуса); пользователю виден «поставлено в очередь». При необходимости — отдельный change со статусом запуска.
- **R5. Два владельца `StreamConfig`** (API и scheduler seo). → Одна функция/конфиг, идемпотентный `add_stream`; тест `UT-PS-08`, `IT-NATS-S1`.
- **R6. Новая зависимость seo → yandex-service** (ранее только seo → metrica). → Короткий таймаут (`YANDEX_SERVICE_TIMEOUT_SECONDS=4`), безопасные ошибки, `502`; scheduler терпит сбой на следующий tick.
- **R7. Дедуп 120 с и рестарты scheduler.** → Дедуп `Nats-Msg-Id` — вторая линия защиты; основная — ledger с уникальным индексом.
- **R8. Корневой `asyncapi-validate` не расширяется.** → Новая цель `asyncapi-validate-parse` (прецедент VK); существующий сценарий spec «validates only backend, notification, email» не нарушается.
- **R9. Credential-less peers и NATS без auth** остаются dev-допущением; production isolation gate не снимается.

## Migration Plan

1. `SEO`: пересобрать образ, `seo-migration` (`20261028_0003`), поднять `seo-service` и новый `seo-scheduler`; stream `PARSE_COMMANDS` создаётся при старте.
2. `ya-metrica`: пересобрать образ, `ya-metrica-migration` (`job_id`), перезапустить `ya-metrica-service` (консьюмер регистрирует durable; при отсутствии stream — retry), worker/beat без изменений. M2 исчезает при раскатке.
3. `yandex-service`: пересобрать/перезапустить (новый GET).
4. `backend`, `frontend`: пересобрать.
5. Порядок деплоя не критичен благодаря retry (durable ждёт stream); scheduler при недоступном yandex-service просто повторяет.
6. Откат: остановить `seo-scheduler`; consumer metrica можно оставить (idle); миграции обратимы (`downgrade`); откат удаления M2 — возврат файлов из git сервиса.

## Принятые решения (подтверждено пользователем)

Открытых вопросов нет. Все значения по умолчанию подтверждены пользователем:

1. **Окно дат** — «вчера и сегодня»: `[последняя дата статистики; сегодня]` (существующий auto), то есть 2 дня при ежедневной работе. Фраза «сегодня и завтра» в задаче — опечатка. *Подтверждено пользователем.*
2. **Часовой пояс** — существующий `SEO_UTC_OFFSET_HOURS` (целое −12..14), новой переменной нет. *Подтверждено пользователем.*
3. **Время запуска** — `PARSE_SCHEDULE_TIME=03:00` по умолчанию. *Подтверждено пользователем.*
4. **Ручной запуск** — только `auto`, без выбора дат и без статуса выполнения в UI; при активном парсинге запуск тихо пропускается исполнителем. *Подтверждено пользователем.*
5. **Новый endpoint yandex-service** `GET /api/connections/metrica` — допустим (затрагивает вложенный репозиторий yandex-service). *Подтверждено пользователем.*
6. **Первая привязка** — полный backfill за 2 года, как сейчас (R3), без ограничений в этом change. *Подтверждено пользователем.*
