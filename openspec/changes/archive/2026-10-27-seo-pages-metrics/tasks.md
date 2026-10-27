# Tasks — seo-pages-metrics

Работа разбита на четыре deliverable, каждый идёт своей цепочкой units. Все цепочки опираются на контракт из `design.md`: D2, D5, «API contract», «Access matrix».

| Deliverable | Ownership | Units |
|---|---|---|
| A | `services/ya-metrica-service/**` | `MP-BE-1..2` |
| B | `services/seo-service/**` и корневой `SERVICES.md` | `SEO-BE-1..3` |
| C | `services/backend/**` | `BE-1` |
| D | `services/frontend/**` | `FE-1..2` |

После цепочек — `SMOKE-1`, затем `QG-FULL`. Test matrix, manual QA steps и DAG — в `design.md` (`## Test matrix`, `## Manual QA steps (UI тестирование)`, `### DAG`).

- `contextFiles` указаны отдельно для каждого unit, а не одним списком на весь change.
- Пути внутри unit — относительно корня сервиса, если не указано иное.
- Работа ведётся в текущей ветке (`main`) каждого сервиса: без создания и переключения веток, без коммитов. Git выполняет пользователь, список изменённых файлов возвращается в handoff.
- Evidence — только в `.qa/seo-pages-metrics/`.

## Execution units

| Unit | Профиль | Ownership paths | Зависит от | Verification | contextFiles |
| --- | --- | --- | --- | --- | --- |
| `MP-BE-1` | Backend | `src/core/entities/metrica_stats_query.py`, `src/core/protocols/repositories/page_stats_query.py`, `src/repositories/page_stats_query_repository.py` (+ экспорты `__init__.py`), `tests/integration/test_page_stats_query_postgres.py`, `tests/integration/conftest.py` | — | `IT-MP-01..06` | `design.md` D3, D8, `## Test matrix` (MP), `specs/metrica-page-stats-query/spec.md`, `openspec/specs/metrica-stats-storage/spec.md`, `src/models/metrica_stats.py`, `src/repositories/metrica_stats_repository.py` (паттерн) |
| `MP-BE-2` | Backend | `src/core/services/page_stats_query_service.py`, `src/core/schemas/api/page_stats.py`, `src/api/page_stats.py`, `src/api/__init__.py`, `src/main.py`, `src/containers/**`, `tests/unit/test_page_stats_query_service.py`, `tests/unit/test_page_stats_schemas.py`, `tests/unit/test_containers.py`, `tests/api/test_page_stats_api.py`, `README.md` | `MP-BE-1` | `UT-MP-01..02`, `AT-MP-01..04`, `make test-cov`, `make lint` | `design.md` D1, D3, «API contract» (M3/M4), `## Access matrix`, `specs/metrica-page-stats-query/spec.md`, `openspec/specs/yandex-peer-http-contract/spec.md`, `src/api/parse.py` (паттерн сессии), handoff `MP-BE-1` |
| `SEO-BE-1` | Backend | `src/settings.py` (`SEO_UTC_OFFSET_HOURS`), `.env.example`, `src/core/services/metrics_period/**`, `src/core/services/metrics_table/registry.py`, `value_formatter.py`, `header_formatter.py`, `src/core/schemas/api/metrics_table.py`, `tests/unit/test_metrics_period.py`, `tests/unit/test_metrics_table_formatters.py`, `tests/unit/test_settings.py` | — | `UT-SP-01..08`, targeted pytest, `make lint` | `design.md` D2, D5, D6, `specs/seo-metrics-period/spec.md`, `specs/metrics-table-contract/spec.md`, `services/ya-metrica-service/src/core/services/parse_date_resolver.py` (паттерн смещения и инъекции часов) |
| `SEO-BE-2` | Backend | `src/settings.py` (`YA_METRICA_*`), `.env.example`, `src/clients/**`, `src/core/protocols/clients/**`, `src/core/schemas/clients/**`, `src/core/exceptions/**`, `src/core/services/metrics_table/builder.py`, `src/containers/**`, `tests/clients/**`, `tests/unit/test_metrics_table_builder.py`, `tests/unit/test_containers.py` | `SEO-BE-1` | `UT-SP-09..10`, targeted pytest, `make lint` | `design.md` D5, D7, «API contract» (M3/M4), `specs/metrics-table-contract/spec.md`, `services/ya-metrica-service/src/clients/base.py` и `services/backend/src/clients/seo_service/client.py` (паттерны peer-клиента), handoff `SEO-BE-1` |
| `SEO-BE-3` | Backend | `src/repositories/abstract_repository.py`, `src/repositories/page_repository.py`, `src/core/protocols/repositories/page_repository.py`, `src/core/services/page_service.py`, `src/core/schemas/api/pages.py`, `src/api/pages.py`, `src/api/route.py`, `src/main.py`, `tests/integration/test_entity_repository_postgres.py`, `tests/integration/conftest.py`, `tests/unit/test_page_service.py`, `tests/unit/test_listing_services.py`, `tests/api/test_listing_api.py`, `tests/api/test_access.py`, `tests/api/test_errors.py`, `README.md`, корневой `SERVICES.md` (§8/9, §10) | `SEO-BE-2` | `UT-SP-11..13`, `IT-SP-01..04`, `AT-SP-01..05`, `make test`, `make lint` | `design.md` D1, D4, D7, D8, D11, `## Access matrix`, `specs/seo-entity-listing/spec.md`, `specs/seo-peer-http-contract/spec.md`, `specs/seo-metrics-period/spec.md`, handoffs `SEO-BE-1`, `SEO-BE-2` |
| `BE-1` | Backend | `src/core/schemas/metrics_table.py`, `src/clients/seo_service/**`, `src/core/protocols/seo_service.py`, `src/core/services/seo_proxy.py`, `src/api/seo.py`, `tests/unit/api/test_seo_proxy_api.py`, `tests/unit/api/test_seo_client_boundary.py`, `tests/unit/core/services/test_seo_proxy_service.py`, `tests/unit/api/test_route_access_inventory.py`, `docs/backend-route-inventory.md` | — | `UT-BP-01..08`, `make test`, `make lint` | `design.md` D5, D7, «API contract» (backend), `## Access matrix`, `specs/seo-backend-proxy/spec.md`, `specs/metrics-table-contract/spec.md`, `openspec/specs/seo-backend-proxy/spec.md` |
| `FE-1` | Frontend | `src/types/api/metricsTable.ts`, `src/types/api/seo.ts`, `src/api/seo.ts`, `src/api/seo.test.ts`, `src/features/seo/services/seoDataService.ts` (+test), `src/features/seo/services/pageMetricsOptions.ts` (+test), `src/features/seo/hooks/useSeoPagesTable.ts` (+test) | — | `FT-PM-01..10`, `npm test -- seo`, `npx tsc --noEmit` | `design.md` D5, D9, `## Test matrix` (Frontend), `specs/cms-seo-data-ui/spec.md`, `specs/metrics-table-contract/spec.md`, `src/features/seo/hooks/useSeoDataTable.ts` (паттерн, не менять), `agents/frontend.md` (FSD) |
| `FE-2` | Frontend | `src/ui/metricsTable/**`, `src/features/seo/ui/SeoPage.tsx` (+test), `SeoPagesPanel.tsx`, `SeoPagesFilters.tsx` (+test), `SeoDataTable.tsx` (+test), `seoStyles.ts` | `FE-1` | `FT-PM-11..16`, `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` | `design.md` D5, D9, `## Test matrix` (Frontend), `## Manual QA steps`, `specs/cms-seo-data-ui/spec.md`, `src/features/prices/ui/PricesHeader.tsx` и `src/ui/MainTable.tsx` (эталон раскладки), handoff `FE-1` |
| `SMOKE-1` | Backend | — (evidence `.qa/seo-pages-metrics/smoke/`) | `MP-BE-2`, `SEO-BE-3`, `BE-1` | `SM-PM-01..12` на живом стеке и реальной PostgreSQL | `design.md` `### Smoke`, D8, `## PostgreSQL для smoke-тестов`, `## Access matrix`, `.agents/skills/stack-control`, `.claude/skills/api-smoke-test`, handoffs `MP-BE-2`, `SEO-BE-3`, `BE-1` |
| `QG-ENV` | Quality Gate | `.qa/seo-pages-metrics/qg-env/` | `SMOKE-1`, `FE-2` | пересборка и health 4 сервисов; согласованность `SEO_UTC_OFFSET_HOURS` и `YA_METRICA_UTC_OFFSET_HOURS` | `agents/quality_gate.md`, `design.md` `## PostgreSQL для smoke-тестов`, `## Risks` |
| `QG-BE` | Quality Gate | `.qa/seo-pages-metrics/qg-be/` | `QG-ENV` | scoped format/lint/test ya-metrica, seo, backend; покрытие `MP/SP/BP` | `design.md` `## Test matrix`, все `specs/**` |
| `QG-FE-AUTO` | Quality Gate | `.qa/seo-pages-metrics/qg-fe-auto/` | `QG-ENV` | `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `FT-PM-16` | `design.md` `## Test matrix` (Frontend), `specs/cms-seo-data-ui/spec.md` |
| `QG-CONTRACTS` | Quality Gate | `.qa/seo-pages-metrics/qg-contracts/` | `QG-ENV` | access matrix 4 маршрутов, статусы peers, контракт `metrics_table`, контракт колонок M3/M4, секреты | `design.md` `## Access matrix`, D3, D5, D7, `specs/metrica-page-stats-query/spec.md`, `specs/seo-peer-http-contract/spec.md`, `specs/seo-backend-proxy/spec.md`, `specs/metrics-table-contract/spec.md` |
| `QG-LIVE` | Quality Gate | `.qa/seo-pages-metrics/qg-live/` | `QG-BE`, `QG-CONTRACTS` | независимый прогон `SM-PM-01,02,05,06,07,09,11,12` | `design.md` `### Smoke`, D8, handoff `SMOKE-1` |
| `QG-FE-MANUAL` | Quality Gate | `.qa/seo-pages-metrics/qg-fe-manual/` | `QG-FE-AUTO` | `M-PM-01..17` на 1366×768 | `design.md` `## Manual QA steps`, `agents/howto/browser-qa-protocol.md`, `.agents/skills/ui-qa` |
| `QG-SYNTH` | Quality Gate | `docs/reports/seo-pages-metrics.md` | `QG-LIVE`, `QG-FE-MANUAL` | итоговый вердикт | handoffs lanes |

DAG — `design.md` → `### DAG`. Цепочки `MP-BE-*`, `SEO-BE-*`, `BE-1` и `FE-*` независимы и могут идти параллельно. Внутри каждой цепочки units выполняются строго последовательно.

## 1. MP-BE-1 — SQL-агрегация по переданным колонкам и ранжирование (профиль: Backend)

**Specs:** `metrica-page-stats-query` · **Пути:** `services/ya-metrica-service/` (см. таблицу) · **Зависит от:** —

- [x] MP-BE-1.1 Добавить `src/core/entities/metrica_stats_query.py`: enum показателей, колонка (`date_from`, `date_to`, ключ = начало), направление. Проверка: импорт в integration-тесте.
- [x] MP-BE-1.2 Добавить протокол `src/core/protocols/repositories/page_stats_query.py` с методами «таблица значений» и «ранжирование» и whitelist-отображение показателей на SQL-выражения из D3.
- [x] MP-BE-1.3 Реализовать в `src/repositories/page_stats_query_repository.py` один SQL `table`: `unnest` массивов начал и концов колонок, `JOIN` по `BETWEEN`, `GROUP BY` страница/колонка, без интерполяции ввода.
- [x] MP-BE-1.4 Реализовать один SQL `ranking`: `GROUP BY page_id`, `ORDER BY` значение и `page_id`. Экспортировать репозиторий в `__init__.py`.
- [x] MP-BE-1.5 Добавить в `tests/integration/conftest.py` фикстуру для D8: SQL-лог и счётчик операторов через `before_cursor_execute` и `logging`.
- [x] MP-BE-1.6 Реализовать и прогнать на реальной PostgreSQL (`TEST_DATABASE_URL`) `IT-MP-01..05`: суммы, средневзвешенные, совпадение с днём, изоляция и разреженность, ранжирование.
- [x] MP-BE-1.7 Реализовать и прогнать `IT-MP-06`: ровно 1 оператор для M3 на 100 UUID × 31 колонку и для M4. SQL-лог сохранить в `.qa/seo-pages-metrics/mp-be-1/`.
- [x] MP-BE-1.V Прогнать `uv run pytest tests/integration/test_page_stats_query_postgres.py` и `make lint`, отметить выполненные task IDs, вернуть handoff по формату `AGENTS.md` со списком изменённых файлов.

## 2. MP-BE-2 — сервис и API M3/M4 (профиль: Backend)

**Specs:** `metrica-page-stats-query` · **Пути:** `services/ya-metrica-service/` (см. таблицу) · **Зависит от:** `MP-BE-1`

- [x] MP-BE-2.1 Добавить API-схемы `src/core/schemas/api/page_stats.py` по «API contract»:
  - повторяемые `bucket=YYYY-MM-DD..YYYY-MM-DD` — 1..31 колонка, по возрастанию, без пересечений;
  - `page_ids` — 1..100, дубликаты схлопываются;
  - M4: `date_from ≤ date_to`, не больше 366 дней, `direction`;
  - числа в ответах: целые для аддитивных показателей, до 8 знаков для средних.

  Проверка: `UT-MP-01`.
- [x] MP-BE-2.2 Реализовать `src/core/services/page_stats_query_service.py`: границы передаются в репозиторий без изменений. Проверка: `UT-MP-02`.
- [x] MP-BE-2.3 Реализовать `src/api/page_stats.py`: `GET /page-stats/table`, `GET /page-stats/ranking`, сессия на запрос как в `api/parse.py`. Подключить в `src/api/__init__.py` и `src/main.py` под `/api/metrica`.
- [x] MP-BE-2.4 Зарегистрировать репозиторий и сервис в `src/containers/**`, обновить `tests/unit/test_containers.py`.
- [x] MP-BE-2.5 Реализовать и прогнать `AT-MP-01..02`: anonymous и cookie/Bearer дают идентичные `200` для M3 и M4.
- [x] MP-BE-2.6 Реализовать и прогнать `AT-MP-03..04`: валидация `400` без входных значений в `detail`; ошибка БД и framework-ошибки дают безопасный `400`.
- [x] MP-BE-2.7 Описать в `README.md` M3/M4, формат колонок, агрегацию и access class. Проверка: примеры совпадают с тестами.
- [x] MP-BE-2.V Прогнать `make test-cov` (с `TEST_DATABASE_URL`, порог покрытия сервиса не снижается) и `make lint`, отметить task IDs, вернуть handoff.

## 3. SEO-BE-1 — разрешение периода и форматирование (профиль: Backend)

**Specs:** `seo-metrics-period`, `metrics-table-contract` · **Пути:** `services/seo-service/` (см. таблицу) · **Зависит от:** —

- [x] SEO-BE-1.1 Добавить `SEO_UTC_OFFSET_HOURS` (`int`, −12..14, по умолчанию 3) в `src/settings.py` и `.env.example`. Проверка: `UT-SP-08`.
- [x] SEO-BE-1.2 Реализовать `src/core/services/metrics_period/` — `MetricsPeriodResolver` по D2: инъекция часов, умолчания, будущее начало заменяется на сегодня, выравнивание, лимит, «сегодня», колонки, флаги `defaulted/adjusted/clamped`.
- [x] SEO-BE-1.3 Прогнать `UT-SP-01..03`: умолчания и часовой пояс, выравнивание, ограничение сегодняшним днём.
- [x] SEO-BE-1.4 Прогнать `UT-SP-04..05`: лимит, валидация, колонки.
- [x] SEO-BE-1.5 Добавить универсальный DTO `src/core/schemas/api/metrics_table.py`: таблица, колонка, ячейка, период с `adjusted`, показатель — по `metrics-table-contract`.
- [x] SEO-BE-1.6 Реализовать `registry.py` (8 показателей) и `value_formatter.py`. Проверка: `UT-SP-06`.
- [x] SEO-BE-1.7 Реализовать `header_formatter.py`: `title` — единица целиком, `hint` — фактические даты, год по `period.today`. Проверка: `UT-SP-07`.
- [x] SEO-BE-1.V Прогнать `uv run pytest tests/unit/test_metrics_period.py tests/unit/test_metrics_table_formatters.py tests/unit/test_settings.py` и `make lint`, отметить task IDs, вернуть handoff.

## 4. SEO-BE-2 — клиент ya-metrica и builder metrics_table (профиль: Backend)

**Specs:** `metrics-table-contract`, `seo-entity-listing` · **Пути:** `services/seo-service/` (см. таблицу) · **Зависит от:** `SEO-BE-1`

- [x] SEO-BE-2.1 Добавить `YA_METRICA_SERVICE_URL` (по умолчанию `http://eqsitecms-ya-metrica-service:8000`) и `YA_METRICA_TIMEOUT_SECONDS` (по умолчанию `4`) в `src/settings.py` и `.env.example`.
- [x] SEO-BE-2.2 Добавить схемы ответов M3/M4 `src/core/schemas/clients/ya_metrica.py` и протокол `src/core/protocols/clients/ya_metrica.py`.
- [x] SEO-BE-2.3 Реализовать клиент `src/clients/ya_metrica.py`: httpx, `trust_env=False`, без cookie и Authorization, повторяемые `bucket` и `page_ids`. Добавить исключение `MetricaUnavailableError` в `src/core/exceptions/**` (D7).
- [x] SEO-BE-2.4 Реализовать и прогнать `UT-SP-09` в `tests/clients/test_ya_metrica_client.py` на MockTransport. Проверка: тело и URL peer не попадают в исключение и логи.
- [x] SEO-BE-2.5 Реализовать `src/core/services/metrics_table/builder.py`: из периода, значений M3, UUID строк и применённого `ordering` собирается `metrics_table`. Проверка: `UT-SP-10`.
- [x] SEO-BE-2.6 Зарегистрировать resolver, клиент и builder в `src/containers/**`, обновить `tests/unit/test_containers.py`.
- [x] SEO-BE-2.V Прогнать `uv run pytest tests/clients tests/unit` и `make lint`, отметить task IDs, вернуть handoff.

## 5. SEO-BE-3 — список страниц с метриками, сортировки и 502 (профиль: Backend)

**Execution split (scope без изменений):** `SEO-BE-3a` — SQL/repository, tasks `.1..3` (done); `SEO-BE-3b` — service/API/docs, tasks `.4..8` и `.V`, зависит от `SEO-BE-3a`.

**Specs:** `seo-entity-listing`, `seo-peer-http-contract`, `seo-metrics-period` · **Пути:** `services/seo-service/` и корневой `SERVICES.md` · **Зависит от:** `SEO-BE-2`

- [x] SEO-BE-3.1 Расширить `ResolvableRepository` и `PageRepository`:
  - сортировка `created_at/-created_at` — только для страниц;
  - выборка с ранжированием через `unnest(:ranked) WITH ORDINALITY` и `NULLS LAST` (D4).

  Обновить протокол репозитория.
- [x] SEO-BE-3.2 Реализовать и прогнать на реальной PostgreSQL `IT-SP-01..02` и `IT-SP-04`.
- [x] SEO-BE-3.3 Добавить фикстуру SQL-лога в `tests/integration/conftest.py` и прогнать `IT-SP-03`: ровно 2 оператора при `limit=5/50`, с рангом и без. Лог сохранить в `.qa/seo-pages-metrics/seo-be-3/`.
- [x] SEO-BE-3.4 Описать query и ответ страниц в `src/core/schemas/api/pages.py`: `mode`, `metric`, даты, `ordering` с `metric:`; ответ `items/total/metrics_table`.
- [x] SEO-BE-3.5 Реализовать поток `PageService.list_filtered` для страниц по D4:
  - валидация → период → (M4, только если колонка в периоде) → SQL → (M3, только при непустой выборке) → builder;
  - колонки нет в периоде → сортировка по умолчанию и `ordering=null`.

  Проверка: `UT-SP-11..13`.
- [x] SEO-BE-3.6 Расширить `src/api/pages.py` новыми query-параметрами и добавить обработчик `MetricaUnavailableError` → `502` с безопасным `detail` (`src/main.py`/`src/api/route.py`), транзакция откатывается. `GET /api/search-queries` не менять.
- [x] SEO-BE-3.7 Реализовать и прогнать `AT-SP-01..05`:
  - access: anonymous и authenticated;
  - `401` без selector — без вызовов;
  - `400` — без вызова клиента;
  - `502`;
  - регрессия «Запросов».
- [x] SEO-BE-3.8 Обновить документацию:
  - `README.md` seo: параметры, алгоритм периода, `SEO_UTC_OFFSET_HOURS` с предупреждением о согласовании с `YA_METRICA_UTC_OFFSET_HOURS`, `metrics_table`, зависимость от ya-metrica, `502`, env;
  - корневой `SERVICES.md`: §8/9 — M3/M4 и потребитель seo; §10 — зависимость seo → ya-metrica, `502`, новые env.
- [x] SEO-BE-3.V Прогнать `make test` (с `TEST_DATABASE_URL`) и `make lint`, отметить task IDs, вернуть handoff.

  SEO-BE-3b: UT/API — 208 passed; `make lint` — OK. Недеструктивный `make test` с тестовой PostgreSQL и `TEST_KEEP_SCHEMA=1` — 513 passed, 25 deselected (24 infrastructure штатно исключены Makefile; дополнительно исключён `test_migration_round_trip`, выполняющий downgrade/DROP TABLE). QG-BE независимо подтвердил 513 passed и успешный lint; schema/models/migration diff отсутствует, поэтому destructive migration round-trip неприменим к change и НЕ запускался. QG-SYNTH согласовал закрытие `.V` по фактически выполненной применимой verification, без waiver и без разрешения DROP/reset/purge. Evidence: `.qa/seo-pages-metrics/seo-be-3b/`, `.qa/seo-pages-metrics/qg-be/verification.md`.

## 6. BE-1 — backend-прокси списка страниц с metrics_table (профиль: Backend)

**Specs:** `seo-backend-proxy`, `metrics-table-contract` · **Пути:** `services/backend/` (см. таблицу) · **Зависит от:** — (контракт `design.md`)

- [x] BE-1.1 Добавить универсальную схему `src/core/schemas/metrics_table.py`: pydantic, `extra="allow"`, обязательные поля контракта, период с `adjusted`.
- [x] BE-1.2 Расширить `src/clients/seo_service/schemas.py` ответом страниц с `metrics_table`; добавить параметры `mode`, `metric`, `date_from`, `date_to` в метод `list_pages` клиента и в протокол.
- [x] BE-1.3 Расширить `SeoProxyService.list_pages` и `GET /api/seo/pages` в `src/api/seo.py`:
  - enum `mode` и `metric`, тип `date`;
  - проверки «обе даты или ни одной» и `date_from ≤ date_to` → `400` до вызова seo;
  - правила «сегодня» и лимиты не применять.
- [x] BE-1.4 Реализовать и прогнать `UT-BP-01..04` в `tests/unit/api/test_seo_proxy_api.py`.
- [x] BE-1.5 Реализовать и прогнать `UT-BP-05..06` в `tests/unit/api/test_seo_client_boundary.py`: трансляция ошибок, невалидный payload → `502`, лишние поля проходят.
- [x] BE-1.6 Обновить строку `/api/seo/pages` в `docs/backend-route-inventory.md` (новые `400`-условия) и прогнать `UT-BP-07..08`.
- [x] BE-1.V Прогнать `make test` и `make lint` в `services/backend`, отметить task IDs, вернуть handoff.

## 7. FE-1 — типы, API, сервис и hook таблицы страниц (профиль: Frontend)

**Specs:** `cms-seo-data-ui`, `metrics-table-contract` · **Пути:** `services/frontend/` (см. таблицу) · **Зависит от:** — (контракт `design.md`)

- [x] FE-1.1 Добавить `src/types/api/metricsTable.ts` (таблица, колонка, ячейка, период с `adjusted/clamped/today`) и расширить `src/types/api/seo.ts`: query страниц с `mode/metric/date_from/date_to/ordering`, ответ с `metrics_table`. Типы «Запросов» не менять.
- [x] FE-1.2 Добавить `src/features/seo/services/pageMetricsOptions.ts`:
  - режимы и 8 показателей с названиями;
  - подписи лимитов для уведомления;
  - перевод выбора пикера в даты по режиму (неделя пн..вс, месяц, год) с ограничением «сегодня».
- [x] FE-1.3 Расширить `getSeoPages` в `src/api/seo.ts`, а также `fetchSeoPages` и mapping `ordering` в `seoDataService.ts`. Прогнать `FT-PM-01..03` (MSW: success, empty, `400`, `401`, `403`, `502`) и `FT-PM-02`.
- [x] FE-1.4 Реализовать новый hook `useSeoPagesTable` по D9:
  - фильтры и одна сортировка;
  - замена дат периодом из ответа;
  - уведомление только при `clamped`;
  - «Сбросить» — только сортировка и поиск;
  - generation-защита и scope guard.

  `useSeoDataTable` не менять.
- [x] FE-1.5 Реализовать и прогнать `FT-PM-04..06`: первый запрос; смена режима, показателя и дат; `clamped` и `adjusted`.
- [x] FE-1.6 Реализовать и прогнать `FT-PM-07..10`: пагинация, сортировка и синхронизация с `ordering=null`, сброс, устаревшие ответы и scope.
- [x] FE-1.V Прогнать `npm test -- seo` и `npx tsc --noEmit` в `services/frontend`, отметить task IDs, вернуть handoff.

## 8. FE-2 — раскладка, фильтры и универсальный рендер колонок (профиль: Frontend)

**Specs:** `cms-seo-data-ui` · **Пути:** `services/frontend/` (см. таблицу) · **Зависит от:** `FE-1`

- [x] FE-2.1 Реализовать `src/ui/metricsTable/` — `buildMetricsTableColumns`: заголовок с `Tooltip(hint)`, `align`, `sorter` при `sortable`, `text`/`empty_text`, неизвестные поля игнорируются. Проверка: `FT-PM-11`.
- [x] FE-2.2 Реализовать `SeoPagesFilters.tsx`: селекты «Режим» и «Показатель», `RangePicker` с `picker` по режиму, `allowClear=false`, `disabledDate` по `period.today`, доступные имена. Проверка: `FT-PM-14`.
- [x] FE-2.3 Расширить `SeoDataTable.tsx` необязательными пропсами для страниц:
  - дополнительные колонки;
  - «Создано» как `DD.MM.YYYY` с сортировкой;
  - строка фильтров через `filtersElements` `MainTable`;
  - `fixed: "left"` для колонок «Страница» и «Создано».

  Без пропсов рендер «Запросов» не меняется. Логику фильтра заголовка не копировать.
- [x] FE-2.4 Собрать `SeoPagesPanel.tsx`: фильтры и таблица на `useSeoPagesTable`; при `clamped` — уведомление через `message.warning`.
- [x] FE-2.5 Перестроить строку вкладок `SeoPage.tsx`:
  - на «Страницах» справа `TablePaginator`, «Сбросить» (как в `PricesHeader`) и «Нормализация»;
  - на других вкладках этих элементов нет;
  - стили в `seoStyles.ts`: без перекрытий на 1366×768, прокручивается только тело таблицы.
- [x] FE-2.6 Реализовать и прогнать `FT-PM-12..13`: раскладка, scopes, `403`; таблица — data, loading, empty, error, interaction, «Создано», колонки метрик.
- [x] FE-2.7 Прогнать `FT-PM-15` (регрессия «Запросов», нормализации, a11y фильтра) и self-checks `FT-PM-16` (`rg`/`find` из `agents/planner.md` §2.2). Вывод сохранить в `.qa/seo-pages-metrics/fe-2/`.
- [x] FE-2.8 Выполнить быструю визуальную самопроверку на 1366×768 через Playwright MCP: вкладки, фильтры, прокрутка, будущие даты в пикере. Скриншот — в `.qa/seo-pages-metrics/fe-2/`. Эквивалентная scripted Playwright selfcheck выполнена FE-FIX-1 (без MCP/установок): вкладки, все режимы/future units, keyboard focus, stress 100×31 и визуальная инспекция; evidence `.qa/seo-pages-metrics/fe-fix-1/report.json`, `trace.zip`, screenshots.
- [x] FE-2.V Прогнать `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` в `services/frontend`, отметить task IDs, вернуть handoff.

## 9. SMOKE-1 — live-проверка цепочки и N+1 (профиль: Backend)

**Specs:** все delta specs · **Пути:** только evidence `.qa/seo-pages-metrics/smoke/` · **Зависит от:** `MP-BE-2`, `SEO-BE-3`, `BE-1`

- [x] SMOKE-1.1 Выполнить discovery PostgreSQL через `docker inspect` (`eqsitecms-db-ya-metrica`, `eqsitecms-db-seo`, `eqsitecms-db`) по `design.md` → `## PostgreSQL для smoke-тестов`. Пароли не записывать. Проверить, что `SEO_UTC_OFFSET_HOURS` совпадает с `YA_METRICA_UTC_OFFSET_HOURS`; значения не выводить, только сравнить.
- [x] SMOKE-1.2 Пересобрать и перезапустить ya-metrica и seo через `make`/Compose (`stackctl` SEO не поддерживает) и backend через `scripts/stackctl … app`. Проверить health и host-порты.
- [x] SMOKE-1.3 Выполнить через `.claude/skills/api-smoke-test` сценарии `SM-PM-01..04` для M3/M4: access, сверка агрегатов и ранжирования с SQL, валидация.
- [x] SMOKE-1.4 Выполнить `SM-PM-05..08` для seo: selector, access, период (умолчания, выравнивание, лимит, «сегодня»), сортировки, `400`.
- [x] SMOKE-1.5 Выполнить `SM-PM-09..10` для backend: anonymous, без ADMIN, ADMIN; локальная валидация без вызова seo.
- [x] SMOKE-1.6 Выполнить `SM-PM-11`: остановка и запуск ya-metrica → `502` в seo и backend, затем восстановление.
- [x] SMOKE-1.7 Выполнить `SM-PM-12`: live N+1 с `log_statement=all` и обязательным reset. Сохранить выдержки логов.
- [x] SMOKE-1.V Свести результаты `SM-PM-01..12` в `.qa/seo-pages-metrics/smoke/summary.md`, отметить task IDs и вернуть handoff. Findings указывать с ID сценария и ответственным unit.

## 10. QG — Quality Gate профиля QG-FULL (профиль: Quality Gate)

**Specs:** все delta specs · **Пути:** `.qa/seo-pages-metrics/<lane>/`, `docs/reports/seo-pages-metrics.md` · **Зависит от:** `SMOKE-1`, `FE-2`

- [x] QG.1 `QG-ENV`: пересборка и health ya-metrica, seo, backend, frontend; согласованность двух настроек часового пояса. Миграции — неприменимо: схемы БД не меняются.
- [x] QG.2 `QG-BE`: scoped format/lint/test ya-metrica, seo, backend; покрытие `UT/IT/AT-MP`, `UT/IT/AT-SP`, `UT-BP` из `design.md` → `## Test matrix`.
- [x] QG.3 `QG-FE-AUTO`: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Review тестов: соответствие behavior diff, access и scopes, MSW без live backend, pagination `limit/offset`, нет смешения с `site-*` (`FT-PM-16`).
- [x] QG.4 `QG-CONTRACTS`:
  - access matrix M3/M4, seo `/api/pages`, backend `/api/seo/pages`: anonymous, authenticated, без ADMIN;
  - статусы peers: `200/400` у ya-metrica, `502` у seo;
  - контракт колонок M3/M4 и `metrics_table`;
  - отсутствие секретов в ответах и логах;
  - AsyncAPI — неприменимо, NATS не меняется.
- [x] QG.5 `QG-LIVE`: независимый прогон `SM-PM-01,02,05,06,07,09,11,12`, включая live N+1.
- [x] QG.6 `QG-FE-MANUAL`: `M-PM-01..17` на 1366×768 по `agents/howto/browser-qa-protocol.md` и `.agents/skills/ui-qa`. Проверка выполнена; после FE-FIX-1 единственный повторный раунд закрыл MANUAL-01/02/03, новых blocking findings нет; evidence `.qa/seo-pages-metrics/qg-fe-manual/recheck-summary.json` (первичный результат сохранён в `report.json`).
- [x] QG.7 `QG-SYNTH`: отчёт `docs/reports/seo-pages-metrics.md` с вердиктом APPROVED; MANUAL-01/02/03 закрыты одним targeted recheck, waiver отсутствует. Существующий внешний release gate R-G4 остаётся вне change; sync/strict validation/archive — последующий workflow Router.

## Workflow follow-up

- После `QG-SYNTH = APPROVED`:
  1. Sync delta specs в `openspec/specs/`; обновить Purpose-матрицы `seo-peer-http-contract` и `seo-backend-proxy` строками этого change.
  2. Прогнать `openspec validate --strict`.
  3. Архивировать change.
- Git (ветки, коммиты, merge, push) выполняет пользователь.

## FE-FIX-1 — замечания QG-FE-MANUAL (Frontend)

- [x] FE-FIX-1.1 MANUAL-01: scoped AA-контраст кнопки «Сбросить», включая hover/focus; regression test и axe.
- [x] FE-FIX-1.2 MANUAL-02: вписать только «Страницы» в высоту CMS, без внешней прокрутки/обрезки toolbar после keyboard focus; regression scripted test на 1366×768.
- [x] FE-FIX-1.3 MANUAL-03: локальный календарь Пн–Вс и отображение текущей недели по сегодня; targeted regression tests.
- [x] FE-FIX-1.V Targeted UI tests, scoped lint, typecheck и scripted visual/axe; evidence `.qa/seo-pages-metrics/fe-fix-1/`.
