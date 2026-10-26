# Design: metrica-stats-parsing

- **Тикет:** [`docs/tasks/101_metrica_client.md`](../../../docs/tasks/101_metrica_client.md)
- **Дата:** 2026-10-26 (ревизия 2 — по ответам пользователя)
- **Сервисы:** `services/ya-metrica-service` (основной объём), `services/yandex-service` (Y5), `services/seo-service` (только потребление существующих resolve, без изменений кода); инфраструктура — общий Redis (`eqsitecms-redis`) для Celery
- **Профиль Quality Gate:** `QG-FULL` (миграция БД + 2 сервиса с кодом + новые процессы Celery worker/beat)

## Context

Мотивация — в `proposal.md`. Текущее состояние, влияющее на решения:

- `ya-metrica-service`: FastAPI + SQLAlchemy Core + Alembic + dependency-injector; в БД только пустая миграция `20260710_0001`; `models/`, `repositories/` пусты; NATS, Celery и воркеров нет; `make test-cov` требует 100% coverage. Peer HTTP-контракт допускает только `200/204/400` (`yandex-peer-http-contract`).
- `src/clients/yandex_metrica.py` содержит безопасный `make_request`; untracked `src/clients/yandex_metrica_parser.py` — копия без обработки ошибок, с `print`/`pprint` и **захардкоженным живым OAuth-токеном** (совпадает с токеном аккаунта в БД yandex-service; значение не выводилось).
- `yandex-service`: Y5 `GET /api/servicing/access-token/{account_id}` расшифровывает и отдаёт plaintext; потребителей в репозитории нет. Y7 `GET /api/connections/metrica/{equestrian_id}` отдаёт `{"counter": {id, equestrian_id, counter_id, yandex_account: {id, ...}} | null}`. Для счётчиков yandex-service уже передаёт в ya-metrica ciphertext, а ya-metrica расшифровывает общим `ENCRYPTION_SERVICE_KEY` (Fernet от SHA-256 ключа).
- `seo-service`: `POST /api/pages/resolve` и `POST /api/search-queries/resolve` (header `X-Equestrian-Id`, body `{"items": [1..1000 строк]}`, ответ `{"items": [{source, normalized, id}]}` в порядке входа; одна невалидная строка → `400` на весь пакет). Нормализация страниц отбрасывает схему/хост и query-параметры из чёрного списка конюшни, поэтому разные `startURL` могут дать один UUID.
- Celery в проекте: `email-service` и `vk-service` (Redis broker/backend, протокол `agents/howto/celery-protocols.md`, capability `celery-redis-protocols`, `agents/backend.md` §15). Async-код в задачах вызывается через `asyncio.run(...)` (`services/email-service/src/workers/tasks/email.py`). Следующие свободные Redis DB — `5` и `6` (`agents/redis-databases.yaml`).

### Фактический формат Reporting API (live probe 2026-10-26)

Evidence: `.qa/metrica-stats-parsing/raw_probe.json` (токены вырезаны), сводка `.qa/metrica-stats-parsing/api_format_summary.md`. Счётчик `105850153`, окно `2026-10-21..2026-10-25`.

| Свойство | Наблюдение | Решение |
|---|---|---|
| Оболочка | `query, data, total_rows, total_rows_rounded, sampled, sample_share, sample_size, sample_space, data_lag, contains_sensitive_data, totals, min, max` | валидируем `data` (list) и `total_rows` (int); `sampled`/`total_rows_rounded` → флаг + warning |
| Строка | `{"dimensions": [{"name": "2026-10-23"}, {"name": "https://…/", "favicon": "…"}], "metrics": [30.0, 30.0, 59.0, 16.66666667, 1.96666667, 114.86666667]}` | metrics по порядку запроса |
| Типы | visits/users/pageviews — целые во float; bounceRate — % 0..100, 8 знаков; pageDepth, avgVisitDurationSeconds — float, 8 знаков | аддитивные `INTEGER/BIGINT` + вычисляемые `NUMERIC(…,8)` |
| Аддитивность | на всех 67 строках `bounceRate×visits/100` и `avgVisitDurationSeconds×visits` — целые (отклонение < 1e-7), `pageDepth×visits = pageviews` | храним `bounces` и `visit_duration_seconds` целыми, средние вычисляем |
| `lastSearchPhrase` | `{"name": null, "favicon": null, "url": null}` — 5 из 32 строк, 147 из 176 визитов | строки с `null`/пустым значением пропускаются |
| `offset` | 1-based; `offset=0` → 400 | checkpoint стартует с 1 |
| `limit` | max 100000; `100001` → 400 (code 4013) | лимит страницы по умолчанию 100000 |
| offset > total | 200, `data=[]`, `total_rows` сохраняется | условие остановки: пустая страница или `offset > total_rows` |
| sort | по умолчанию `-ym:s:visits` (нестабилен для пагинации) | явный `sort=ym:s:date,<dimension>` |
| `accuracy=full` | принимается; `sampled=false`, `sample_share=1.0` | всегда передаём |
| Диапазон 2 года | 400 `query_error: Query is too complicated` | подтверждает окна ≤5 дней |
| Будущие даты | 200, `total_rows=0` | обрезка на нашей стороне |
| Неверный токен | 403 `error_type=invalid_token` | `credentials_invalid`, без ретрая |
| Latency | 0.5–2.8 с | timeout 120 с |

## Goals / Non-Goals

**Goals:** хранение дневной статистики двух наборов с корректной агрегируемостью; ELT-парсинг с пагинацией и checkpoint; задания по 5 дней × вид с эксклюзивностью по аккаунту; исполнение через Celery; ретраи; endpoint запуска; Y5 → ciphertext; удаление чернового парсера с токеном.

**Non-Goals (подтверждено пользователем):** endpoint статусов заданий, NATS consumer/publisher и AsyncAPI (сервисный слой готов к вызову из consumer), ротация OAuth-токена. Также вне scope: API чтения/агрегации, кэширование, UI CMS, backend-прокси, ротация ключей шифрования, refresh OAuth-токена, разбиение окна при `Query is too complicated`, изменения seo-service, глобальная поддержка таймзон клиентов.

## Decisions

### D1. Схема хранения: аддитивные колонки + вычисляемые средние

```text
metrica_page_stats / metrica_search_query_stats
  id                          UUID PK
  equestrian_id               UUID NOT NULL
  stat_date                   DATE NOT NULL
  page_id | search_query_id   UUID NOT NULL                 -- UUID сущности seo-service, без FK
  visits, users, pageviews    INTEGER NOT NULL CHECK (>= 0)
  bounces                     INTEGER NOT NULL CHECK (>= 0 AND bounces <= visits)
  visit_duration_seconds      BIGINT  NOT NULL CHECK (>= 0)  -- суммарная длительность визитов
  bounce_rate                 NUMERIC(11,8) GENERATED ALWAYS AS
                                (CASE WHEN visits > 0 THEN ROUND(bounces * 100.0 / visits, 8) ELSE 0 END) STORED
  page_depth                  NUMERIC(14,8) GENERATED ALWAYS AS
                                (CASE WHEN visits > 0 THEN ROUND(pageviews::numeric / visits, 8) ELSE 0 END) STORED
  avg_visit_duration_seconds  NUMERIC(14,8) GENERATED ALWAYS AS
                                (CASE WHEN visits > 0 THEN ROUND(visit_duration_seconds::numeric / visits, 8) ELSE 0 END) STORED
  parse_task_id               UUID NULL FK metrica_parse_tasks ON DELETE SET NULL
  created_at, updated_at      TIMESTAMPTZ
  UNIQUE ux_<table>_eq_date_entity (equestrian_id, stat_date, <entity>_id)
```

- **Префикс `daily` убран** по решению пользователя; гранулярность «день» задаётся колонкой `stat_date` и уникальностью.
- **Почему аддитивные колонки, а не исходные средние.** Проценты и время — производные от сумм (`bounceRate = bounces/visits`, `pageDepth = pageviews/visits`, `avg = duration/visits`). Храня суммы, мы получаем корректное «среднее» как средневзвешенное по визитам при любой агрегации: слиянии коллизий нормализации, суммировании по дням, месяцам, диапазонам (`SUM(bounces)*100/SUM(visits)`). Слияние становится порядко-независимым сложением. Арифметическое среднее процентов искажало бы результат (99 визитов с 0% и 1 визит со 100% дают 1%, а не 50%). Probe подтвердил, что компоненты целые.
- **Почему generated-колонки:** дневные строки сортируются по `bounce_rate`/`page_depth`/`avg_visit_duration_seconds` напрямую и совпадают с ответом API; пересчёт гарантирует PostgreSQL. `users` неаддитивен между днями/сущностями — ограничение Метрики, фиксируется в README.
- **Почему не одна таблица с `kind` и не EAV:** разные сущности seo-service и независимые «последние даты»; типизированные колонки дают обычный `ORDER BY`.
- **Фильтр по конюшне:** `equestrian_id` в каждой строке; уникальный индекс с ведущими `(equestrian_id, stat_date)` обслуживает выборку конюшни за диапазон и `MAX(stat_date)` для автодат.
- **«Метрика» в уникальности** из запроса трактуется как SEO-сущность (страница/фраза): `(конюшня, дата, сущность)`.

### D2. Upsert: замена между заданиями, сумма внутри задания

Один `INSERT … ON CONFLICT (equestrian_id, stat_date, <entity>_id) DO UPDATE` на пакет строк страницы API:

```sql
visits   = CASE WHEN t.parse_task_id = EXCLUDED.parse_task_id
                THEN t.visits + EXCLUDED.visits ELSE EXCLUDED.visits END,
-- так же users, pageviews, bounces, visit_duration_seconds; generated-колонки пересчитываются сами
parse_task_id = EXCLUDED.parse_task_id, updated_at = now()
RETURNING (xmax = 0) AS inserted   -- счётчики inserted/updated для лога
```

- **Другое задание** (повторный парсинг дня) → замена значений.
- **То же задание** → сумма: это и есть агрегация строк API, которые seo-service нормализовал в один UUID (разные URL с отброшенными query-параметрами, регистр/пробелы фраз), если они пришли на разных страницах API.
- **Внутри пакета** такие строки предварительно суммируются в Python по ключу `(stat_date, uuid)` — PostgreSQL запрещает затрагивать одну строку дважды в одном `ON CONFLICT`.
- Повтор задания продолжает с `next_offset` (D5), строки предыдущих попыток имеют тот же `parse_task_id`, повторной записи той же страницы нет — двойного счёта нет.
- **Альтернативы:** «сумма при любом конфликте» ломает идемпотентность повторного парсинга; staging-таблица сырых строк требует хранить URL/фразы, что запрещено («SEO-сущности не храним»); хранение исходных средних требует взвешенных формул в каждом месте агрегации.

### D3. Сверка окна при успехе

В транзакции перевода задания в `succeeded`: `DELETE … WHERE equestrian_id=:e AND stat_date BETWEEN :from AND :to AND parse_task_id IS DISTINCT FROM :task`. Окно отражает последний полный срез (исчезнувшие после смены чёрных списков SEO сущности не остаются). При `failed` сверки нет. Пересекающиеся окна одной конюшни конкурентно не выполняются (D7 + один активный запуск на конюшню).

### D4. Задания и запуски

```text
metrica_parse_runs: id, equestrian_id, date_mode ('explicit'|'auto'), clamped BOOL, created_at
metrica_parse_tasks:
  id, run_id FK CASCADE, equestrian_id, counter_id VARCHAR(31), yandex_account_id UUID,
  kind ('pages'|'search_queries'), date_from, date_to  CHECK (date_from <= date_to AND date_to - date_from <= 4),
  sequence INT, UNIQUE (run_id, sequence),
  status ('queued'|'running'|'succeeded'|'failed') DEFAULT 'queued',
  attempts INT DEFAULT 0, max_attempts INT, next_attempt_at TIMESTAMPTZ DEFAULT now(),
  next_offset INT DEFAULT 1,                       -- ELT checkpoint
  locked_by VARCHAR(128), locked_until TIMESTAMPTZ, -- lease (locked_by = Celery hostname/task id)
  started_at, finished_at,
  pages_fetched, rows_fetched, rows_inserted, rows_updated, rows_skipped, rows_deleted INT DEFAULT 0,
  sampled BOOL DEFAULT false, error_code VARCHAR(64), error_status INT,
  created_at, updated_at
  UNIQUE INDEX ux_metrica_parse_tasks_running_account ON (yandex_account_id) WHERE status = 'running'
  INDEX ix_metrica_parse_tasks_claim ON (yandex_account_id, next_attempt_at, created_at, sequence) WHERE status = 'queued'
  INDEX ix_metrica_parse_tasks_active_eq ON (equestrian_id) WHERE status IN ('queued','running')
```

Токен в задании не хранится; `counter_id`/`yandex_account_id` фиксируются при постановке (нужны для эксклюзивности), а при выполнении сверяются с актуальной привязкой.

**Декомпозиция:** окна по 5 дней от `date_from` каждого вида, последнее 1..5 дней; порядок `sequence`: страницы окна 1, запросы окна 1, страницы окна 2, … (при разных автодиапазонах видов — чередование по индексу окна, оставшиеся окна более длинного вида — в конце).

### D5. ELT и checkpoint

Цикл задания: `offset = task.next_offset` → запрос страницы API → разбор строк → резолв сущностей в seo-service → суммирование коллизий в пакете → **одна транзакция**: upsert пакета + `next_offset += len(data)` + счётчики + продление lease → следующая страница. Остановка: пустая `data` или `offset > total_rows`. Затем транзакция `succeeded` + сверка (D3). Между страницами в памяти ничего не накапливается; размер страницы — настройка (по умолчанию 100000), resolve и upsert внутри страницы — пакетами (≤1000 для seo-service).

### D6. Резолв сущностей через seo-service

- Пропуск строк с `null`/пустым после trim измерением (без вызова SEO).
- Уникальные значения страницы API → пакеты ≤1000 → `POST /api/{pages|search-queries}/resolve` с `X-Equestrian-Id`; сопоставление по порядку ответа (контракт SEO сохраняет порядок).
- `400` на пакет → бисекция до одиночных значений, невалидные пропускаются (`rows_skipped`); глубина ≤ log2(1000)≈10 уровней.
- timeout/transport/5xx → `seo_unavailable` (ретрай); `401` или иной 4xx → `seo_rejected` (без ретрая).
- Побочный эффект: find-or-create страниц/фраз в seo-service — это и есть «специальный endpoint SEO»; отдельного endpoint'а в SEO не требуется.

### D7. Исполнение: Celery поверх очереди в PostgreSQL

**Рассмотренные варианты (по запросу пользователя рассмотреть Celery):**

| Вариант | Плюсы | Минусы | Итог |
|---|---|---|---|
| A. Свой asyncio-воркер, опрос очереди в PostgreSQL (ревизия 1) | минимум зависимостей, полный контроль | свой процесс-менеджмент, свой планировщик повторов, свой shutdown; не стандарт проекта | отклонён |
| B. «Чистый» Celery: одно Celery-сообщение на задание, ретраи `self.retry` | стандарт проекта | у Celery нет взаимоисключения по ключу (аккаунту): занятый аккаунт → busy-requeue, потеря порядка окон, статусы в broker, а не в БД; отложенные ретраи живут только в Redis | отклонён |
| **C. Гибрид: Celery — исполнитель и планировщик, PostgreSQL — источник истины** | стандарт проекта (worker/beat, `acks_late`, Sentry, масштабирование `--concurrency`/репликами); статусы, checkpoint и эксклюзивность по аккаунту гарантирует БД; дубли сообщений безвредны | две подсистемы (Redis + БД) | **выбран** |

**Устройство C:**

- Celery app `src/workers/celery_app.py` по `agents/howto/celery-protocols.md`: `CelerySettings` (`CELERY_APP_MAIN=ya-metrica-service`, broker Redis DB `5`, backend DB `6`), очередь `ya_metrica` (default), JSON, `task_acks_late=True`, `task_reject_on_worker_lost=True`, `worker_prefetch_multiplier=1`, `task_ignore_result=True`, `broker_transport_options.visibility_timeout=3600`, регистрация как `providers.Singleton` в DI.
- **Задача `metrica.process_account(yandex_account_id)`** (`src/workers/tasks/metrica_parse.py`): `asyncio.run(task_runner.run_next_for_account(account_id))` — claim следующего готового задания этого аккаунта, полное выполнение (D5), финализация. Если claim не удался (аккаунт занят / нет готовых) — тихий выход. Если у аккаунта остались готовые задания — `process_account.apply_async(args=[account_id])` (цепочка «одно Celery-сообщение = одно задание парсинга» держит сообщения короткими и порядок окон).
- **Задача `metrica.dispatch_ready`** (Celery beat, раз в `PARSE_DISPATCH_INTERVAL_SECONDS`=30): reaper истёкших lease + выборка `DISTINCT yandex_account_id` с готовыми `queued` и без `running` → `process_account` на каждый аккаунт. Подхватывает отложенные ретраи, потерянные сообщения и восстановление после падений.
- **Постановка** (`ParseEnqueueService`) после commit вызывает `ParseDispatcherProtocol.dispatch_account(account_id)`; ошибка broker'а логируется warning'ом и не ломает ответ — задания подхватит `dispatch_ready`.
- **Claim** (своя транзакция, по аккаунту): `UPDATE … SET status='running', locked_by, locked_until=now()+lease, started_at=COALESCE(started_at, now()) WHERE id = (SELECT t.id … WHERE yandex_account_id=:acc AND status='queued' AND next_attempt_at <= now() AND NOT EXISTS (running того же аккаунта) ORDER BY created_at, sequence FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`. Гонку двух сообщений одного аккаунта закрывает частичный уникальный индекс: проигравший получает `UniqueViolation` → rollback → тихий выход.
- **Ретраи:** доменные (D8) — в БД через `next_attempt_at` и `dispatch_ready`, чтобы статус был виден в таблице и эксклюзивность сохранялась при повторе. Celery `autoretry_for` (требование протокола) применяется только к инфраструктурным ошибкам до/вне выполнения задания (недоступность БД при claim/reaper: `OperationalError`, `ConnectionError`), `max_retries=3`, `retry_backoff=True`.
- **Async в Celery:** `asyncio.run` на каждый вызов задачи; asyncpg-engine создаётся внутри этого цикла с `NullPool` и закрывается в `finally` (глобальный engine API нельзя переиспользовать между event loop'ами).
- **Масштабирование:** `celery worker -Q ya_metrica --concurrency=${WORKER_CONCURRENCY:-1}`; больше слотов/реплик — параллельно разные аккаунты, один аккаунт — всегда последовательно (гарантия БД). Beat — строго один экземпляр.
- **Остановка/сбой:** SIGTERM → warm shutdown Celery дожидается текущего задания (`stop_grace_period: 300s` в compose); при SIGKILL сообщение переотправится по `acks_late`, но claim не пройдёт, пока reaper не вернёт задание по истёкшему lease (попытка с `lease_expired`), после чего продолжение с checkpoint.
- **Readiness:** адресный `celery inspect ping --destination ya-metrica-worker@<host>` в healthcheck (как vk-service).
- **Один активный запуск на конюшню:** транзакция постановки берёт `pg_advisory_xact_lock(hashtextextended('metrica-parse:' || equestrian_id, 0))`, проверяет `queued/running`, вычисляет автодаты и вставляет run+tasks.

### D8. Ретраи и категории ошибок

| error_code | Источник | Ретрай |
|---|---|---|
| `credentials_invalid` | Метрика 401/403, отказ расшифровки | нет + fail-fast всех `queued` того же аккаунта |
| `credentials_unavailable` | yandex-service 400 на Y5 (аккаунт удалён) | нет |
| `binding_changed` | Y7 `counter=null` или другой counter/account | нет |
| `yandex_service_unavailable` | timeout/transport/5xx yandex-service | да |
| `provider_query_error` | Метрика 400 (в т.ч. `Query is too complicated`) | нет |
| `provider_rate_limited` | Метрика 429 | да |
| `provider_unavailable` | Метрика 5xx/timeout/transport | да |
| `provider_response_invalid` | непригодная оболочка ответа | нет |
| `seo_unavailable` / `seo_rejected` | seo-service timeout/5xx / 401 и прочие 4xx | да / нет |
| `storage_error` | ошибка БД при записи страницы | да |
| `lease_expired` | reaper | да (через reaper) |
| `unexpected` | прочее | да |

Задержка: `TASK_RETRY_BASE_SECONDS × 4^(attempts−1)` с потолком 1800 с; по умолчанию `TASK_MAX_ATTEMPTS=3` (60 с, 240 с). В `error_code`/`error_status` и логах — только категория и HTTP-статус.

### D9. Резолв дат

- **«Сегодня»** = `(datetime.now(UTC) + timedelta(hours=YA_METRICA_UTC_OFFSET_HOURS)).date()`; целое `-12..14`, по умолчанию `3` (МСК). Глобальная поддержка таймзон клиентов — позже, отдельно.
- **Нижняя граница** — сегодня минус 2 календарных года (29.02 → 28.02); **верхняя** — сегодня.
- **Явный режим:** обе даты вместе (одна → `400`); диапазон обрезается: `from' = max(from, today − 2y)`, `to' = min(to, today)`; если `from' > to'` (в т.ч. исходно перевёрнутый или целиком вне границ) → `400 «Некорректный диапазон дат»`; иначе ставится обрезанный диапазон, `clamped=true`, warning-лог с исходными и итоговыми датами.
- **Авто:** по каждому виду `from = max(MAX(stat_date) конюшни, today − 2y)` включительно, либо `today − 2y` при отсутствии строк; `to = today`; `clamped=false`. Первый запуск: ~147 окон × 2 вида ≈ 294 задания, ≈ 2.5 с на запрос.

### D10. Клиенты

```text
clients/base.py                  BaseApiClient(base_url, timeout, exception_factory) — make_request c безопасной классификацией
clients/yandex_metrica.py        YandexMetricaClient(BaseApiClient)       — get_counters (без изменений поведения)
clients/yandex_metrica_stat.py   YandexMetricaStatClient(BaseApiClient)   — get_stat_page(...)
clients/yandex_service.py        YandexServiceClient(BaseApiClient)       — get_metrica_binding, get_enc_access_token
clients/seo_service.py           SeoServiceClient(BaseApiClient)          — resolve_pages, resolve_search_queries
```

Исключения: `YandexClientException(status, category)` для Метрики (существующее), `PeerServiceException(service, status, category)` для peers. Клиент статистики возвращает валидированный DTO страницы (`total_rows`, `sampled`, сырые dimensions/metrics) — разбор строк и пропуски — в сервисном слое.

### D11. Сервисный слой и Celery-задачи

```text
core/services/parse_date_resolver.py     DateRangeResolver (D9)
core/services/parse_decomposer.py        TaskDecomposer (D4)
core/services/parse_enqueue_service.py   ParseEnqueueService: Y7 → лок → даты → run+tasks → dispatcher
core/protocols/parse_dispatcher.py       ParseDispatcherProtocol.dispatch_account(account_id)
core/services/parse_job_factory.py       ParseJobFactory: Y7-сверка + Y5 + decrypt → ParseJob(counter_id, token, kind, окно, next_offset)
core/services/stat_ingestion_service.py  StatIngestionService: цикл D5 + D6 + D2 (конвертация в аддитивные колонки)
core/services/parse_retry_policy.py      RetryPolicy (D8)
core/services/parse_task_runner.py       TaskRunner.run_next_for_account → RunOutcome(has_more)
core/services/parse_dispatch_service.py  ParseDispatchService.collect_ready_accounts (reaper + аккаунты к запуску)
workers/celery_app.py                    Celery app (D7)
workers/dispatcher.py                    CeleryParseDispatcher(ParseDispatcherProtocol)
workers/tasks/metrica_parse.py           metrica.process_account, metrica.dispatch_ready
```

Celery-задачи и клиент Метрики получают готовый `ParseJob`; Celery-слой не содержит бизнес-логики. Будущий NATS consumer вызывает `ParseEnqueueService.enqueue(...)` — тот же use case, что и endpoint.

### D12. Endpoint `POST /api/metrica/stats/parse`

Body `ParseRunInDto {equestrian_id: UUID, date_from: date|None, date_to: date|None}`, `extra="forbid"`. Ответ `200 ParseRunOutDto {run_id, equestrian_id, date_mode, clamped, ranges: {pages: {date_from, date_to}, search_queries: {...}}, tasks: [{id, kind, date_from, date_to, sequence, status}]}`. Ошибки — `400` с безопасными `detail`, добавляемыми в `SAFE_DETAILS` `main.py`: «Некорректный диапазон дат», «Счётчик Яндекс.Метрики не привязан к конюшне», «Парсинг конюшни уже выполняется», «Не удалось получить данные интеграции Яндекс».

### D13. yandex-service Y5

`YandexServiceAuthorizationService.get_token` → возвращает `enc_access_token` аккаунта без расшифровки (зависимость от `EncryptionService` удаляется, небезопасный `logger.error(f"Error: {ex}")` убирается); DTO `ServiceAuthorizationAccessTokenOutDto {enc_access_token}` (имя поля согласовано пользователем). **BREAKING** только для peer-контракта; потребителей нет.

### D14. Настройки ya-metrica-service

`Settings`: `YANDEX_SERVICE_URL` (`http://eqsitecms-yandex-service:8000`), `SEO_SERVICE_URL` (`http://eqsitecms-seo-service:8000`), `YA_METRICA_UTC_OFFSET_HOURS` (3, int −12..14), `YA_METRICA_STAT_PAGE_LIMIT` (100000, 1..100000), `YA_METRICA_STAT_TIMEOUT_SECONDS` (120), `SEO_RESOLVE_BATCH_SIZE` (1000, 1..1000), `PARSE_DISPATCH_INTERVAL_SECONDS` (30), `TASK_MAX_ATTEMPTS` (3), `TASK_RETRY_BASE_SECONDS` (60), `TASK_LEASE_SECONDS` (600). `CelerySettings`: `CELERY_APP_MAIN` (`ya-metrica-service`), `CELERY_APP_BROKER` (`redis://eqsitecms-redis:6379/5`), `CELERY_APP_BACKEND` (`…/6`), `REDIS_PASSWORD` (обязательный локальный секрет при URL без пароля). При загрузке URL без credentials дополняются URL-encoded `REDIS_PASSWORD` из собственного окружения/.env; явно заданные credential-bearing URL также читаются только оттуда. Валидация: `redis`/`rediss`, host/port, строго DB 5/6, без query/fragment; положительные интервалы/число попыток, границы лимитов из таблицы. Compose: `WORKER_CONCURRENCY` (1) — аргумент `--concurrency`. Зависимость `celery[redis]`.

**Источник credentials:** Redis/Celery credentials берутся исключительно из окружения/.env самого `ya-metrica-service`; пароль Redis должен быть задан оператором в `services/ya-metrica-service/.env`. Продакшен не зависит от Router/оркестратора для выдачи credentials. Читать или копировать пароль из `vk-service/.env` запрещено. В `.env.example` — только placeholders без секретов, в коде — никаких встроенных паролей. Если локальный пароль отсутствует, исполнитель сообщает требование оператору заполнить `.env`, не генерирует и не меняет пароль произвольно.

## Access matrix

Нормативно — delta `specs/yandex-peer-http-contract/spec.md` (строки Y5, M2) и `specs/metrica-parse-trigger/spec.md`. «With auth» — тот же запрос с произвольными Cookie/Authorization: peers их не проверяют. Celery-задачи не являются HTTP endpoint'ами и в матрицу не входят.

| method | path | access class | roles | expected without auth | expected with auth | Тесты |
|---|---|---|---|---|---|---|
| POST | ya-metrica `/api/metrica/stats/parse` (M2, новый) | Private Peer Write exception (service-to-service) | доверенный внутренний сервис; роли CMS не проверяются | `200` запуск (в т.ч. с обрезкой); validation/пустой после обрезки диапазон/нет привязки/активный запуск/yandex-service недоступен → `400` | то же | `AT-MS-01..05`, `SM-MS-03..05`, `SM-MS-09` |
| GET | yandex `/api/servicing/access-token/{account_id}` (Y5, изменён) | Sensitive Private Peer Read exception (service-to-service) | доверенный внутренний сервис (ya-metrica) | `200 {"enc_access_token"}`; malformed/absent → `400` | то же | `UT-YS-01..04`, `SM-MS-02` |
| GET | ya-metrica `/api/metrica/counters` (M1, без изменений) | Sensitive Private Peer Read exception | доверенный caller | `200`/`400` | то же | `AT-MS-06` (регрессия) |
| GET | ya-metrica `/health` (H1, без изменений) | Public Read | любой | `200` | то же | `AT-MS-06` |

**Причины исключений.** M2: инициатор — внутренний сервис, не CMS-пользователь; у peers нет механизма сервисной аутентификации; dev-допущение Q2 и production gate из `yandex-peer-http-contract` сохраняются (production без подтверждённой сетевой изоляции блокируется). `equestrian_id` в body M2 — идентификатор ресурса, а не tenant selector, поэтому ошибки `400`, не `401` (локальный контракт `200/204/400`). Y5: остаётся чувствительным (ciphertext + общий ключ = токен), поэтому не Public Read; payload ослаблен до ciphertext. Owner/foreign: «чужой» ресурс для доверенного peer имеет тот же контракт (нет пользователей), CMS-ролей нет — существующая граница доверия.

## Execution units

Deliverables: **A** — `services/ya-metrica-service/**` + `.docker-compose/docker-compose.ya_metrica.yml` + `SERVICES.md` §8/9 + `agents/redis-databases.yaml` + `agents/howto/celery-protocols.md` (Backend); **B** — `services/yandex-service/**` (Backend); **C** — live verification (без ownership кода); **D** — Quality Gate. seo-service изменений не требует (D6), отдельного unit нет.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| `MS-BE-1` | Backend | A | `src/settings.py`, `.env.example`, `pyproject.toml`, `uv.lock`, `src/utils/basemodel.py`, `src/models/**`, `src/migration/versions/**`, `src/core/entities/**`, `tests/integration/conftest.py`, `tests/integration/test_schema_postgres.py`, `tests/unit/test_settings.py`, `tests/unit/test_migrations.py` | — | `IT-MS-01, IT-MS-07`, `UT-MS-15`, `make test` |
| `MS-BE-2` | Backend | A | `src/clients/**`, `src/core/protocols/clients/**`, `src/core/schemas/clients/**`, `src/core/exceptions/**`, `tests/clients/**` | `MS-BE-1` | `UT-MS-05, UT-MS-13`, `pytest tests/clients` |
| `MS-BE-3` | Backend | A | `src/repositories/**`, `src/core/protocols/repositories/**`, `tests/integration/test_*_repository_postgres.py` | `MS-BE-1` | `IT-MS-02..06, IT-MS-08..14` на реальной PostgreSQL |
| `MS-BE-4` | Backend | A | `src/core/services/parse_{date_resolver,decomposer,enqueue_service}.py`, `src/core/protocols/parse_dispatcher.py`, `src/core/schemas/parse.py`, `src/core/exceptions/parse.py`, `tests/unit/test_parse_{date_resolver,decomposer,enqueue_service}.py` | `MS-BE-2`, `MS-BE-3` | `UT-MS-01..04` |
| `MS-BE-5` | Backend | A | `src/core/services/{parse_job_factory,stat_ingestion_service,parse_retry_policy,parse_task_runner,parse_dispatch_service}.py`, `tests/unit/test_{parse_job_factory,stat_ingestion_service,parse_retry_policy,parse_task_runner,parse_dispatch_service}.py` | `MS-BE-4` | `UT-MS-06..12` |
| `MS-BE-6` | Backend | A | `src/workers/**`, `src/containers/**`, `src/utils/database.py`, `src/core/services/__init__.py`, `tests/workers/**`, `tests/unit/test_containers.py`, `tests/unit/test_database.py`, `.docker-compose/docker-compose.ya_metrica.yml`, `agents/redis-databases.yaml`, `agents/howto/celery-protocols.md` | `MS-BE-5` | `UT-MS-14, UT-MS-16`, targeted pytest, `make lint` |
| `MS-BE-7` | Backend | A | `src/api/**`, `src/main.py`, `src/core/schemas/api/**`, `tests/api/**`, `README.md`, `SERVICES.md` §8/9 | `MS-BE-6` | `AT-MS-01..06`, `make test-cov` (100%, с `TEST_DATABASE_URL`) + `make lint` |
| `YS-1` | Backend | B | `services/yandex-service/src/api/servicing.py`, `src/core/services/yandex_service_authorization_service.py`, `src/core/schemas/api/service_authorization.py`, `src/containers/services.py`, `tests/api/test_servicing.py`, `tests/unit/test_service_authorization.py`, `README.md` | — | `UT-YS-01..04`, `make test`, `make lint` |
| `SMOKE-1` | Backend | C | — (evidence в `.qa/metrica-stats-parsing/smoke/`) | `MS-BE-7`, `YS-1` | `SM-MS-01..13` на живом стеке, реальной PostgreSQL и Redis |
| `QG-ENV` → `QG-BE` ∥ `QG-CONTRACTS` → `QG-LIVE` → `QG-SYNTH` | Quality Gate | D | `docs/reports/metrica-stats-parsing.md`, `.qa/metrica-stats-parsing/<lane>/` | `SMOKE-1` | по `agents/quality_gate.md`; `QG-FE-AUTO`/`QG-FE-MANUAL` — неприменимо (нет UI) |

Пути deliverable A даны относительно `services/ya-metrica-service/`, кроме `.docker-compose/…`, `SERVICES.md` и `agents/…`.

### DAG

```text
MS-BE-1 ─┬→ MS-BE-2 ─┐
         └→ MS-BE-3 ─┴→ MS-BE-4 → MS-BE-5 → MS-BE-6 → MS-BE-7 ─┐
YS-1 ──────────────────────────────────────────────────────────┴→ SMOKE-1 → QG-ENV → (QG-BE ∥ QG-CONTRACTS) → QG-LIVE → QG-SYNTH
```

Параллельно: `YS-1` с любым `MS-BE-*`; `MS-BE-2` ∥ `MS-BE-3` (непересекающиеся пути, общий только `MS-BE-1`). Рекомендуемый порядок: `YS-1` и `MS-BE-1` → `MS-BE-2` ∥ `MS-BE-3` → `MS-BE-4` → `MS-BE-5` → `MS-BE-6` → `MS-BE-7` → `SMOKE-1` → QG.

## Test matrix

Реальная PostgreSQL для IT: `TEST_DATABASE_URL` (`postgresql+asyncpg`) на отдельную БД `eqsitecmsyametrica_test` в контейнере `eqsitecms-db-ya-metrica` (создаётся исполнителем, рабочую БД не трогать); каждый IT — случайная схема `test_metrica_<uuid>`, удаляется в `finally` (паттерн `services/yandex-service/tests/integration/conftest.py`). Без переменной IT пропускаются, поэтому verification units, владеющих IT, и `make test-cov` в `MS-BE-7` запускаются с заданной переменной. Celery-задачи в unit-тестах вызываются напрямую (`.run`/eager) с фейковыми сервисами; реальные Redis/worker/beat проверяются в `SMOKE-1`.

### Фича F1 — хранение и очередь (`IT-MS-*`, реальная PostgreSQL)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где проверяется | Трассировка |
|---|---|---|---|---|---|---|
| `IT-MS-01` | integration | миграции | upgrade → downgrade → upgrade `head` | 4 таблицы, generated-колонки, unique/partial unique/check/индексы на месте; downgrade чистый | `tests/integration/test_schema_postgres.py` | storage: таблицы, производные колонки, без текста сущности |
| `IT-MS-02` | integration | happy path / контракт | upsert пакета новых строк | строки вставлены, `inserted=N, updated=0`; generated = значения API | `tests/integration/test_stats_repository_postgres.py` | storage: уникальность, производные колонки |
| `IT-MS-03` | integration | идемпотентность | повтор ключа другим заданием | значения заменены, строк не прибавилось, `updated=N` | то же | storage: повторный парсинг |
| `IT-MS-04` | integration | агрегация | тот же ключ тем же заданием во втором пакете (пример спеки `/tours?utm` + `/tours`); `visits=0` | суммы; `bounce_rate=25`, `page_depth=1.75`, `avg=80`; при нуле визитов 0 | то же | storage: агрегация после нормализации, нулевые визиты |
| `IT-MS-05` | integration | данные | сверка окна | удалены только строки окна/конюшни/вида другого задания | то же | storage: сверка окна |
| `IT-MS-06` | integration | изоляция | выборка по конюшне; `MAX(stat_date)` по видам; нет строк → None | только своя конюшня; даты раздельно | то же | storage: фильтрация, последняя дата |
| `IT-MS-07` | integration | constraints | отрицательные значения, `bounces > visits`, окно >5 дней, неизвестный статус/вид, запись в generated-колонку | отказ CHECK / ошибка записи | `tests/integration/test_schema_postgres.py` | storage: недопустимые значения; queue: декомпозиция |
| `IT-MS-08` | integration | порядок | claim аккаунта FIFO по запуску/sequence; отложенный повтор пропускается; `list_dispatchable_accounts` — аккаунты с готовыми и без running | ожидаемые задания/аккаунты | `tests/integration/test_tasks_repository_postgres.py` | queue: порядок, доставка |
| `IT-MS-09` | integration | конкурентность | два параллельных claim одного аккаунта / разных аккаунтов | 1 running / 2 running | то же | queue: один running, дублирующая доставка |
| `IT-MS-10` | integration | constraint | прямой перевод второго задания аккаунта в running | `UniqueViolation` | то же | queue: гарантия БД |
| `IT-MS-11` | integration | восстановление | истёкший lease → reaper; исчерпанные попытки | `queued`+`attempts+1`+`lease_expired` / `failed` | то же | queue: lease |
| `IT-MS-12` | integration | транзакционность | upsert страницы + checkpoint в одной транзакции, ошибка в середине | откат обоих | то же | ingestion: ELT checkpoint, сбой записи |
| `IT-MS-13` | integration | конкурентность | две одновременные постановки одной конюшни | 1 run, второй — признак активного запуска | то же | queue/trigger: один активный запуск |
| `IT-MS-14` | integration | fail-fast | `fail_queued_by_account` | `queued` аккаунта → `failed`, другие аккаунты не тронуты | то же | queue: быстрый отказ |

### Фича F2 — парсинг, исполнение и endpoint (`UT-MS-*`, `AT-MS-*`)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где проверяется | Трассировка |
|---|---|---|---|---|---|---|
| `UT-MS-01` | unit | валидация/обрезка | явный диапазон: внутри границ; верх > today; низ < today−2y; целиком в будущем; целиком старше 2 лет; перевёрнутый; одна дата | обрезанный диапазон + `clamped` / `ParseRangeError` | `tests/unit/test_parse_date_resolver.py` | trigger: явный диапазон с обрезкой |
| `UT-MS-02` | unit | граничные | авто: нет статистики; last=вчера; last старше 2 лет; разные даты видов; 29.02; смещение UTC (переход суток при +3, отрицательное) | диапазоны по D9 | то же | trigger: автодиапазон, смещение UTC |
| `UT-MS-03` | unit | happy path | декомпозиция 20/7/1 день, разные диапазоны видов | 8 заданий в порядке спеки; 5+2; 1+1; чередование | `tests/unit/test_parse_decomposer.py` | queue: декомпозиция |
| `UT-MS-04` | unit | внешние ошибки | постановка: нет привязки; yandex-service timeout/400; активный запуск; успех сохраняет counter/account и вызывает dispatcher после commit; ошибка dispatcher не ломает постановку | доменные ошибки / задания созданы, warning | `tests/unit/test_parse_enqueue_service.py` | trigger: привязка, активный запуск; queue: сигнал потерян |
| `UT-MS-05` | unit | контракт API | параметры `stat/v1/data`, OAuth header, токен не в query, валидация оболочки, статусы 400/403/429/5xx/timeout | точные params; исключения со статусом и категорией | `tests/clients/test_yandex_metrica_stat.py` | ingestion: запрос к API, классификация |
| `UT-MS-06` | unit | пагинация | total=35, limit=10; total=0; пустая страница; старт с `next_offset` | offsets 1/11/21/31; 1 запрос; остановка; resume | `tests/unit/test_stat_ingestion_service.py` | ingestion: постраничная выгрузка, checkpoint |
| `UT-MS-07` | unit | разбор | конвертация в `bounces=round(rate×visits/100)`, `visit_duration_seconds=round(avg×visits)`; null/пустое измерение; 5 метрик; нецелые visits; дата вне окна; плохая оболочка; `sampled` | пропуски считаются; `provider_response_invalid`; флаг | то же | storage: аддитивные колонки; ingestion: разбор строк |
| `UT-MS-08` | unit | агрегация | два URL → один UUID в пакете (и в разных пакетах резолва одной страницы) | одна строка, суммы аддитивных колонок | то же | storage: агрегация после нормализации |
| `UT-MS-09` | unit | внешние ошибки | resolve: 2500 значений → 3 пакета, header; 400 → бисекция; 5xx → `seo_unavailable` | по D6 | то же + `tests/clients/test_seo_service.py` | ingestion: резолв через SEO |
| `UT-MS-10` | unit | ретраи | классификация всех `error_code` D8, backoff, исчерпание, fail-fast по аккаунту | ретрай / failed | `tests/unit/test_parse_retry_policy.py`, `test_parse_task_runner.py` | queue: ретраи, быстрый отказ |
| `UT-MS-11` | unit | креды | Y7 совпадает; `counter=null`/другой → `binding_changed`; Y5 400 → `credentials_unavailable`; decrypt fail; ciphertext из yandex-формата расшифровывается | `ParseJob` с токеном в памяти / failed | `tests/unit/test_parse_job_factory.py` | ingestion: креды; Y5 совместимость |
| `UT-MS-12` | unit | секреты в логах | старт/финиш с inserted/updated/skipped/deleted; ошибка 403; маркер токена/ciphertext/фразы | маркеров нет в caplog | `tests/unit/test_parse_task_runner.py` | ingestion: логирование |
| `UT-MS-13` | unit | регрессия | базовый клиент: категории timeout/transport/http/response; `get_counters` через наследника | поведение M1 неизменно | `tests/clients/test_base_client.py`, `test_yandex_metrica.py` | ingestion: базовый клиент |
| `UT-MS-14` | unit | Celery-задачи | `process_account`: успех → re-dispatch при `has_more`, тихий выход при занятом аккаунте/нет заданий, `asyncio.run` + закрытие engine; `dispatch_ready`: reaper + сообщение на каждый аккаунт; `autoretry_for` только на инфраструктурные ошибки | по D7 | `tests/workers/test_metrica_parse_tasks.py` | queue: доставка, последовательная обработка, отложенный повтор |
| `UT-MS-15` | unit | конфигурация | лимиты настроек (page limit 1..100000, batch 1..1000, смещение UTC −12..14 целое, `CelerySettings` defaults DB 5/6) | ошибка конфигурации / значения | `tests/unit/test_settings.py` | trigger: смещение UTC; ingestion: запрос к API |
| `UT-MS-16` | unit | конфигурация Celery | очередь `ya_metrica` default, JSON, `acks_late`, `reject_on_worker_lost`, prefetch 1, ignore_result, visibility_timeout, beat schedule `metrica.dispatch_ready`; `CeleryParseDispatcher` шлёт `metrica.process_account` в `ya_metrica`; DI Singleton | по D7 | `tests/workers/test_celery_app.py`, `tests/unit/test_containers.py` | queue: доставка заданий |
| `AT-MS-01` | API | access M2 anonymous | валидный POST без cookie | `200`, схема ответа с `clamped`, `queued` | `tests/api/test_parse_api.py` | trigger: access, endpoint |
| `AT-MS-02` | API | access M2 with auth | тот же POST с Cookie/Bearer | идентичный результат | то же | trigger: заголовки |
| `AT-MS-03` | API | валидация | нет/не UUID `equestrian_id`, плохая дата, лишнее поле, одна дата | `400` без отражения ввода | то же | trigger: невалидный вход |
| `AT-MS-04` | API | ошибки | нет привязки; yandex-service недоступен; активный запуск; пустой после обрезки диапазон; обрезка → `200 clamped=true` | `400` с точными safe detail / `200` | то же | trigger: привязка, активный запуск, обрезка |
| `AT-MS-05` | API | контракт ответа | ответ без токена/ciphertext/account/профиля | поля отсутствуют | то же | trigger: ответ без секретов |
| `AT-MS-06` | API | регрессия | M1 `/api/metrica/counters`, H1 `/health` anonymous и с заголовками | прежние ответы | `tests/api/test_counters_api.py`, `test_health.py` | peer matrix M1/H1 |

### yandex-service (`UT-YS-*`)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где проверяется | Трассировка |
|---|---|---|---|---|---|---|
| `UT-YS-01` | unit | контракт | сервис возвращает сохранённый ciphertext, decrypt не вызывается | `enc_access_token == stored` | `tests/unit/test_service_authorization.py` | peer: выдача ciphertext |
| `UT-YS-02` | API | access Y5 | anonymous и с Cookie/Bearer, в т.ч. чужой tenant | `200 {"enc_access_token"}`, нет `access_token` | `tests/api/test_servicing.py` | matrix Y5 |
| `UT-YS-03` | API | валидация | malformed / отсутствующий account | `400` safe detail | то же | peer: отсутствующий аккаунт |
| `UT-YS-04` | unit | секреты | лог при ошибке не содержит ciphertext/текста исключения | caplog чист | `tests/unit/test_service_authorization.py` | peer: ответ и логи |

### Live (`SM-MS-*`) — `SMOKE-1`, реальная PostgreSQL, Redis и живой Яндекс

Данные: конюшня `5f6496aa-4fe9-42da-a763-29f9bab22d73`, счётчик `105850153`, аккаунт Яндекса `799c85a2-1f16-4477-9ef5-cb44ee4b81b2` (login `Igor-526`). Эталон probe за `2026-10-21..2026-10-25` (суммы сохраняются при любых коллизиях нормализации, т.к. колонки аддитивны):

| Набор | строк API | `SUM(visits)` | `SUM(users)` | `SUM(pageviews)` | `SUM(bounces)` | `SUM(visit_duration_seconds)` |
|---|---|---|---|---|---|---|
| страницы | 35 | 176 | 169 | 304 | 25 | 18844 |
| запросы (без 5 строк `null`) | 27 | 29 | 29 | 61 | 3 | 5704 |

Вызовы peers — изнутри `eqsitecms_network` (`docker exec … curl/python`), т.к. CMS-авторизации у peers нет; шаблон отчётности — `.claude/skills/api-smoke-test`.

| ID | Сценарий | Ожидание |
|---|---|---|
| `SM-MS-01` | discovery DB через `docker inspect`; rebuild/restart yandex и ya-metrica; `ya-metrica-migration` → `head`; запуск `ya-metrica-celery-worker` и `ya-metrica-celery-beat`; адресный `celery inspect ping` | 4 таблицы, alembic head = новая ревизия, pong от worker, beat жив |
| `SM-MS-02` | Y5 anonymous и с Cookie/Bearer | `200 {"enc_access_token"}`, значение — Fernet ciphertext (не равно токену; булево сравнение внутри контейнера) |
| `SM-MS-03` | M2 anonymous, явный `2026-10-21..2026-10-25` | `200`, `clamped=false`, 2 задания `queued` (pages, search_queries) |
| `SM-MS-04` | M2 с Cookie/Bearer во время активного запуска | `400 «Парсинг конюшни уже выполняется»` |
| `SM-MS-05` | дождаться выполнения | оба `succeeded`; суммы в таблицах = эталон выше; строк страниц ≤35, запросов ≤27; `rows_skipped ≥ 5` у запросов; generated-колонки = значения API для строк без коллизий; логи старт/финиш с inserted/updated |
| `SM-MS-06` | повтор того же диапазона (с Cookie/Bearer) | `200`; после выполнения число строк и суммы те же, `inserted=0`, `updated>0` |
| `SM-MS-07` | M2 без дат | `date_mode=auto`, диапазоны от последней записанной даты каждого вида включительно до сегодня (по `YA_METRICA_UTC_OFFSET_HOURS`) |
| `SM-MS-08` | явные 20 дней (`2026-10-01..2026-10-20`) | 8 заданий в порядке спеки; при опросе БД никогда >1 `running` на аккаунт; все `succeeded` |
| `SM-MS-09` | негатив anonymous и с заголовками: конюшня без привязки, не-UUID, `date_from>date_to`, одна дата, целиком будущий диапазон | `400` с safe detail, заданий не создано |
| `SM-MS-10` | обрезка: `2026-10-24..2026-10-31` | `200`, `clamped=true`, задания до сегодняшней даты |
| `SM-MS-11` | секреты: grep логов ya-metrica API/worker/beat и yandex, дамп таблиц на токен/ciphertext (булево внутри контейнера) | совпадений нет |
| `SM-MS-12` | изоляция: строки только с `equestrian_id` тестовой конюшни; `page_id`/`search_query_id` присутствуют в `GET /api/pages` / `GET /api/search-queries` seo-service с `X-Equestrian-Id` | все UUID найдены в SEO этой конюшни |
| `SM-MS-13` | устойчивость доставки и регрессия: ручная отправка двух `metrica.process_account` одного аккаунта; остановка worker во время задания и запуск снова; M1/H1 live | не более одного `running`; задание завершается (продолжение с checkpoint/reaper); M1/H1 прежние |

Неприменимые оси: UI/frontend — нет UI diff; NATS/AsyncAPI — контракт не меняется; owner-only email policy — не затрагивается; tenant selector `401` — у ya-metrica нет selector (equestrian_id — идентификатор ресурса, см. Access matrix).

## PostgreSQL для smoke-тестов

Получено `docker inspect` (пароли не извлекались):

| Контейнер | Образ | Host port → 5432 | `POSTGRES_USER` / `POSTGRES_DB` | Сеть |
|---|---|---|---|---|
| `eqsitecms-db-ya-metrica` | `postgres:16` | `5439` (0.0.0.0/::) | `eqsitecmsyametrica` / `eqsitecmsyametrica` | `eqsitecms_network` |
| `eqsitecms-db-yandex` | `postgres:16` | `5438` | `eqsitecmsyandex` / `eqsitecmsyandex` | `eqsitecms_network` |
| `eqsitecms-db-seo` | `postgres:16` | `5437` | `eqsitecmsseo` / `eqsitecmsseo` | `eqsitecms_network` |

App `eqsitecms-ya-metrica-service`: host `32769 → 8000`, `src` смонтирован `ro` (после изменений нужен restart/rebuild). Redis — `eqsitecms-redis` (healthy). Текущая alembic-ревизия ya-metrica — `20260710_0001`. `SMOKE-1` обязан повторить discovery (`SM-MS-01`), а не полагаться на эти значения; `psql` — через `docker exec … sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'`.

## Risks / Trade-offs

- [`users` при коллизиях нормализации суммируется — верхняя оценка уникальных] → допускается; README фиксирует неаддитивность `users`.
- [`bounces`/`visit_duration_seconds` восстанавливаются округлением из процентов/средних] → probe: отклонение < 1e-7 при `accuracy=full`; при сэмплировании возможна погрешность ±1 визит, задание помечается `sampled`.
- [Offset-пагинация по «живому» дню может сдвинуться между попытками] → стабильная сортировка + сверка окна при следующем запуске.
- [`Query is too complicated` на очень больших счётчиках даже за 5 дней] → `provider_query_error` без ретрая; разбиение окна — вне scope.
- [Квоты Reporting API] → один running на аккаунт, 1 запрос за раз; первый авто-запуск ≈ 300 запросов.
- [M1 (`/counters`) может обратиться к Метрике тем же аккаунтом параллельно с воркером] → редкий интерактивный вызов, вне scope.
- [Celery + asyncio: engine/loop] → engine `NullPool` на каждый `asyncio.run`, закрытие в `finally` (`UT-MS-14`).
- [Два beat-экземпляра дублируют dispatch] → дубли безвредны (claim + partial unique), но compose держит один beat.
- [Redis `visibility_timeout` меньше длительности задания → повторная доставка] → 3600 с; повторная доставка безвредна по claim.
- [Credential-less peers в production] → существующий production gate `yandex-peer-http-contract`.
- [Живой токен лежал в untracked файле] → удаление в `MS-BE-2`; ротация отложена пользователем.

## Migration Plan

1. Зарезервировать Redis DB `5`/`6` в `agents/redis-databases.yaml`; оператор задаёт `CELERY_APP_*` с паролем Redis в `services/ya-metrica-service/.env`. Единственный источник Redis/Celery credentials — окружение/.env самого сервиса, без копирования из других сервисов и без зависимости от Router/оркестратора. Отсутствующий пароль — блокер настройки, произвольно менять его нельзя.
2. `YS-1` и миграция ya-metrica независимы; Y5 BREAKING безопасен (потребителей нет), но раскатывать вместе с ya-metrica.
3. `ya-metrica-migration` → `head` (новые таблицы, существующих данных нет), затем `ya-metrica-service`, `ya-metrica-celery-worker`, `ya-metrica-celery-beat`.
4. Откат: остановить worker/beat, `alembic downgrade 20260710_0001` (удаляет только новые таблицы), откатить Y5 на предыдущую версию; Redis DB 5/6 очистить.

## Решения пользователя (ревизия 2)

1. Префикс `daily` в именах таблиц убран: `metrica_page_stats`, `metrica_search_query_stats`.
2. Таймзона — целое смещение от UTC в `.env` (`YA_METRICA_UTC_OFFSET_HOURS`, по умолчанию `3`); глобальная поддержка таймзон клиентов — позже.
3. Поле Y5 — `enc_access_token`.
4. Явный диапазон обрезается до `[сегодня − 2 года; сегодня]` и парсится обрезанный; `400` — только если после обрезки ничего не осталось.
5. Endpoint статусов, NATS-триггер, ротация токена — не делаем.
6. Исполнитель — Celery (рассмотрено в D7, выбран гибрид с PostgreSQL как источником истины).
7. Коллизии нормализации (разные значения Метрики → один UUID) агрегируются: визиты/просмотры (и отказы, длительность) суммируются, проценты и время — средние, взвешенные по визитам (D1, D2).

Разрешённая пользователем одноразовая подготовка (после PLAN-1): Router создал локальную `dev` от `main` и скопировал существующий `REDIS_PASSWORD` из `.docker-compose/.env` в `.env` ya-metrica-service без вывода значения. Это не runtime-зависимость: приложение читает только собственное окружение/.env, не `.docker-compose/.env` и не `.env` других сервисов. `CelerySettings` подставляет URL-encoded `REDIS_PASSWORD` из собственного `.env` в `CELERY_APP_BROKER/BACKEND` без встроенного пароля (DB 5/6). Новое копирование или смена пароля не требуется.
