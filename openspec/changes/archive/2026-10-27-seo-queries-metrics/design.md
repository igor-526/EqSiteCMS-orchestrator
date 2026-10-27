# Design — seo-queries-metrics

**Тикет:** `docs/tasks/103_metrics_queries.md` · **Дата:** 2026-10-27.
**Сервисы:** ya-metrica-service, seo-service, backend, frontend CMS.
**Статус:** планирование; apply только после явного approval пользователя.

## Context

Мотивация — `proposal.md#why`. Основания: постановка 103 целиком, `docs/tasks/102_metrics_pages.md` как исторический запрос, окончательные `openspec/specs/seo-metrics-period/spec.md`, `openspec/specs/metrics-table-contract/spec.md` и архив `openspec/changes/archive/2026-10-27-seo-pages-metrics/design.md` (D1–D4, D6–D9, access matrix). Ранний DTO 102 не используется.

Фактическое evidence, а не обещания старого плана:

| Зона | Прочитанный источник | Наблюдение / необходимый delta |
|---|---|---|
| Хранилище | ya-metrica `src/models/metrica_stats.py`, `src/repositories/metrica_stats_repository.py` | Общая фабрика создаёт две разные stats-таблицы. Для запросов уникальность eq/date/search_query_id, generated производные. Upsert одной parse task суммирует, новая task заменяет; чтение не должно повторять слияние |
| SQL метрик | ya-metrica `src/repositories/page_stats_query_repository.py`, `src/core/schemas/api/page_stats.py`, `src/api/page_stats.py` | Существуют только page peers, SQL whitelist привязан к page table; новые query peers нужно реализовать, не выдавать за существующие |
| SEO список | `src/api/search_queries.py`, `src/core/services/search_query_service.py`, `src/repositories/search_query_repository.py`, `src/models/search_queries.py` | Сейчас items/total и query/-query, без метрик; hash уникален внутри tenant, индекс created_at/id уже есть |
| SEO аналог | `src/core/services/page_service.py`, `src/repositories/page_repository.py`, `src/clients/ya_metrica.py` | Ранжирование → SQL unnest(UUID[]) WITH ORDINALITY → поиск/pagination → table; до двух peer-вызовов |
| Универсальность | SEO `metrics_period/__init__.py`, `metrics_table/builder.py` | Resolver универсален; builder пока имеет внутренние page_ids/PageStatsTable. Нужен совместимый query adapter к одному builder, не копия |
| Gateway | backend `src/api/seo.py`, `src/core/services/seo_proxy.py`, `src/clients/seo_service/schemas.py` | require_seo_admin уже строго ADMIN; queries пока без метрик; pages использует общую схему metrics_table |
| CMS | `useSeoPagesTable.ts`, `useSeoDataTable.ts`, `seoDataService.ts`, `SeoPage.tsx`, `SeoQueriesPanel.tsx`, `SeoPagesFilters.tsx`, `src/ui/metricsTable/buildMetricsTableColumns.tsx` | Queries — старый общий hook, pages — metrics hook; renderer универсален, controls пока типизированы pages. Общие механизмы переиспользуем без смены поведения pages |

Транспорт только HTTP read; NATS/events не добавляются. Проверен backend `docs/asyncapi.yaml`: callback messaging не связан с аналитикой; у SEO/Метрики собственных `docs/asyncapi.yaml` и `app/core/config/nats.py` не найдено. AsyncAPI changes неприменимы. Миграции не нужны: существующий уникальный stats-индекс начинается с eq/date.

## Goals / Non-Goals

**Цель:** одна строка search_queries, метрики по search_query_id, server-side период, SQL-агрегация/порядок до pagination и совместимый metrics_table v1.

**Вне scope:** страницы и их пользовательское поведение, парсинг, resolve/нормализация запросов, настройки нормализации, новые env/таблицы/миграции, materialized views/cache, репликация сущностей между БД, mobile/tablet, production network remediation. Общие файлы меняются лишь для подключения нового consumer с регрессионными тестами страниц.

## Decisions

### D1. Контракт списка и совместимость

Изменяются существующие GET backend `/api/seo/search-queries`, SEO `/api/search-queries`, а не создаётся параллельный endpoint для CMS. Query: search, ordering, limit=20, offset=0; mode=day, metric=visits; date_from/date_to optional только вместе. Восемь metrics — ровно registry и фактическая query model: visits/users/pageviews/bounces/visit_duration_seconds/bounce_rate/page_depth/avg_visit_duration_seconds. Технические поля не metrics.

Сохраняем прежнюю нормализацию pagination запросов: числовой limit приводится к 1..100, offset к >=0 на gateway и SEO; нечисловые — 400. Не переносим незаметно строгий Query(ge/le) страниц на queries: существующий `seo-entity-listing` гарантирует clamp. Новые mode/metric/даты/ordering валидируются до downstream; ordering = query/-query, created_at/-created_at, ±metric:ISO-date либо отсутствует. Multiple ordering не поддерживается.

Ответ: `{items:[{id,query,created_at}],total,metrics_table}`. Это аддитивное расширение ответа, backend/CMS обновляются синхронно и требуют таблицу; неизвестные дополнительные поля v1 сохраняются backend и игнорируются renderer. row_key="id", columns — упорядоченный массив, values — разреженный map UUID **только текущей страницы**, text/value/hint — по существующей спецификации. Отсутствие не становится нулём; total не зависит от stats. Метрика не возвращает текст запросов, query_hash, parse_task_id или секреты.

### D2. Новые peer endpoints Метрики

**M5** `GET /api/metrica/search-query-stats/table`:
- equestrian_id UUID, metric enum;
- повторяемый bucket `YYYY-MM-DD..YYYY-MM-DD`, 1..31, упорядоченные непересекающиеся границы;
- повторяемый search_query_ids: 1..100 различных UUID, дедупликация перед ограничением;
- `200 {metric,values:[{search_query_id,bucket,value}]}`, bucket=date_from; пары без строк опущены, реальные нули присутствуют.

**M6** `GET /api/metrica/search-query-stats/ranking`:
- equestrian_id, metric, date_from/date_to одной готовой колонки, 1..366 включительных дней, direction=asc|desc;
- `200 {metric,direction,search_query_ids:[UUID...]}`; все UUID с данными tenant/диапазона, без search/limit/offset.

Оба endpoint **новые**, без credentials по peer policy 102. Все локальные ошибки ввода/БД/обработки → безопасный 400. Календарь, today, лимиты SEO и search сюда не переносятся. Ресурс equestrian_id передаётся query, не X-Equestrian-Id: сохраняем peer 102; отсутствие даёт 400, не SEO selector 401.

### D3. SQL Метрики

Отдельный read repository/protocol/query service для query stats, не изменения StatsRepository парсинга. Переиспользовать Metric/Direction/StatsBucket и валидаторы границ; metric-expression builder можно сделать внутренней общей функцией с переданной **доверенной таблицей/колонкой**, без пользовательского SQL identifier. При выделении helper page wrapper сохраняет прежние выражения и выходные типы; это не второй движок metrics_table.

M5 — один bound SQL: unnest двух date[] как buckets, join stats по BETWEEN, WHERE eq и search_query_id=ANY(UUID[]) и min/max date, GROUP BY search_query_id,bucket_from. M6 — один SQL WHERE eq/date, GROUP BY search_query_id, ORDER BY whitelist expression asc/desc, search_query_id asc. Никаких join pages/counters/parse tasks и запросов на каждую строку/колонку.

Формулы: суммы пяти базовых счётчиков; производные из сумм visits, округление numeric до 8 знаков; visits=0 → 0. users — сумма сохранённых дневных users. Не усреднять generated daily metrics. Python только преобразует готовые rows в DTO, не агрегирует/сортирует.

### D4. SEO поток и универсальный builder

1. Валидация query и clamp pagination до данных/peer. MetricRegistry подтверждает metric.
2. **Тот же** MetricsPeriodResolver вычисляет период и buckets: defaults 7/4/6/2, limits 31/16/12/5, ISO-неделя пн–вс, выравнивание → clamp второй даты → today. Собственный SEO_UTC_OFFSET_HOURS, согласованный с YA_METRICA_UTC_OFFSET_HOURS; чужая env не читается.
3. Для существующего ключа ±metric:date — query_ranking M6. Для валидного ключа вне периода ordering=null, ranking не нужен. Некорректная дата/поле — 400.
4. SearchQueryRepository: наследуем literal ILIKE search; для query/created_at обычный SQL order; для метрики outer join unnest одного typed UUID[] WITH ORDINALITY, order ordinal asc NULLS LAST, затем default created_at desc/id desc. WHERE tenant/search применяется до limit/offset. Ранжированный UUID чужой конюшни/отсутствующий в SEO ничего не добавляет в список. Никакого merge/sort в Python.
5. SQL count с тем же tenant/search, без stats join. Всего два SQL SEO.
6. Если items непусты, query_table M5 с UUID страницы и всеми buckets. При пустом результате M5 не нужен; M6 мог уже понадобиться для сортировки.
7. Адаптер переводит `{search_query_id,bucket,value}` в нейтральные готовые ячейки `(row_id,bucket,value)`; builder использует row_ids и эти значения. Существующий `build(page_ids=..., stats=PageStatsTable)` остаётся совместимым wrapper, делегирующим тому же внутреннему build. Форматтеры/registry/resolver не копируются. Альтернатива «переименовать запросы в page_id в wire DTO» отвергнута как ложная семантика.

Возвращается фактическая ordering (в том числе query/created_at, null для default). Основной backend не вызывает Метрику и не рассчитывает период.

### D5. Ошибки и безопасность

HTTP client расширяется query_table/query_ranking с отдельными query response DTO. Использовать существующий `_get`, trust_env=False, без auth/cookie и redirects, валидацию metric/direction. Не логировать URL/peer payload, не отправлять credentials браузера. Метрика non-200, schema/metric/direction mismatch, timeout/transport → MetricaUnavailableError → SEO 502 `Сервис статистики недоступен`, rollback. Не подменять сбой пустыми ячейками. Backend invalid payload/неожиданный статус/5xx/transport → безопасный 502; безопасный 400 SEO сохраняется.

Сохраняются timeout SEO→Метрика 4 с и backend→SEO 10 с, ≤2 последовательных вызовов. Бюджет 8 с peer ожиданий оставляет запас, но не гарантирует 10 с при большой SQL нагрузке — QG-LIVE измеряет время и размер ranking, не внедряет cache/replication в этом change.

### D6. CMS state и переиспользование

Новый `useSeoQueriesTable` с LIST_QUERIES guard, отдельным состоянием от pages. Не переводить pages на новый generic hook ради рефакторинга. Использовать существующие pageMetricsOptions pure helpers/списки (название историческое, вычисления общие) и renderer buildMetricsTableColumns; переиспользовать SeoPagesFilters через структурный интерфейс props в src/types, нейтральный aria label передаётся consumer. Не дублировать UI/filter/formatter engine. Page consumer сохраняет прежнее значение label и поведение.

API DTO/types и boundary расширить metrics-параметрами; feature service явно whitelist mapping query/created_at/metric keys. В hook хранить filters отдельно от request snapshot: серверные даты/ordering меняют отображение без fetch. Первый вход/смена режима — без дат. RangePicker allowClear=false, режим/метрика не очищаются; date helper переводит выбор в границы, окончательно решает SEO. До первого ответа допустим браузерный today для disabledDate (как pages), после — только period.today; defaults браузер не рассчитывает.

Search draft — debounce 300 мс, trim лишь в request, literal спецсимволы сохраняются. Любое пользовательское изменение search/sort/метрик/размера сбрасывает offset, изменение page — нужный offset. Mode/date снимают metric sort, metric сохраняет. Индикатор — server ordering. Generation guard и scope guard отбрасывают старые ответы при смене фильтра/вкладки/прав; pending debounce отменяется reset и отзывом прав. Reset единственным commit снимает draft/search/sort, offset=0, сохраняет limit/mode/metric/серверные даты, один запрос. No auto retry mutations: новых mutations здесь нет.

### D7. CMS раскладка

SeoPage для активной queries выводит справа TablePaginator и danger outlined «Сбросить» с FilterOutlined, без нормализации; pagination внутри SeoDataTable скрыта. Отдельная строка фильтров через filtersElements, дополнительные columns от renderer, dateOnly/fixedColumns для «Запрос» и «Создано». MainTable рассчитывает тело; горизонтальный max-content scroll и вертикальный scroll только body. Переиспользовать pages layout classes без переименований и изменения page branch. Фильтр только в шапке «Запрос», никаких date filters в Created/dynamic columns. Создано — DD.MM.YYYY, сервер сортирует полный timestamp.

## Access matrix

Исключения обоснованы приватностью ADMIN-аналитики; peers доверены **сети**, а selector не является авторизацией. Cookie/Bearer не усиливают peer-права. Конкретные нормативные строки находятся в соответствующих delta specs, здесь сводная матрица A1–A5 для трассировки тестов.

| ID | method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|---|
| A1 | GET | backend `/api/seo/search-queries` | Protected GET exception | только ADMIN | 401, без SEO | ADMIN 200; без ADMIN, в т.ч. SUPERUSER/DEVELOPER, 403 до downstream; invalid query 400; downstream/DTO 502 |
| A2 | GET | SEO `/api/search-queries`, валидный X-Equestrian-Id | Internal Trusted Network Read exception | доверенный backend | 200; invalid query 400 до Метрики; Метрика failure 502; unexpected internal 500 | то же, credentials игнорируются |
| A3 | GET | SEO `/api/search-queries`, отсутствующий/пустой/invalid selector | Internal selector exception | внутренний caller | 401 до БД/peer | 401, credentials не заменяют selector |
| A4 | GET | Метрика `/api/metrica/search-query-stats/table` | Private Peer Read exception | доверенный SEO | 200; invalid/missing equestrian_id, metric, buckets, IDs 400; БД/processing 400 | то же, credentials игнорируются |
| A5 | GET | Метрика `/api/metrica/search-query-stats/ranking` | Private Peer Read exception | доверенный SEO | 200; invalid/missing equestrian_id, metric, dates, direction 400; БД/processing 400 | то же, credentials игнорируются |

Backend берёт tenant только actor.equestrian_id; подмена через browser query/header не действует. M5/M6 принимают resource query UUID по peer-политике 102, не SEO selector. Production isolation подтверждается отдельно; доступные снаружи anonymous peers/БД блокируют выпуск независимо от успешного live smoke.

## Deliverables и ownership

| Deliverable | Владелец | Изменяемые пути / specs |
|---|---|---|
| A — чтение Метрики | Backend | `services/ya-metrica-service/src/{repositories,core/entities,core/protocols/repositories,core/services,core/schemas/api,api,containers}/` — только query stats и узкие stats helpers; `src/main.py`, tests query/page stats, README; spec metrica-search-query-stats-query |
| B — SEO композиция | Backend | `services/seo-service/src/{api/search_queries.py,core/services/search_query_service.py,core/schemas/api/search_queries.py,core/schemas/api/__init__.py,core/protocols/repositories/search_query_repository.py,repositories/search_query_repository.py,clients/ya_metrica.py,core/protocols/clients/ya_metrica.py,core/schemas/clients/ya_metrica.py,core/services/metrics_table/builder.py,containers/}` и соответствующие tests, README; `SERVICES.md`; specs seo-entity-listing/seo-peer-http-contract |
| C — gateway | Backend | backend `src/api/seo.py`, `src/core/services/seo_proxy.py`, `src/core/protocols/seo_service.py`, `src/clients/seo_service/{client,schemas}.py`, профильные tests, docs/backend-route-inventory.md; spec seo-backend-proxy |
| D — CMS | Frontend | frontend `src/types/api/seo.ts`, `src/api/seo.ts`, `src/features/seo/{hooks/useSeoQueriesTable.ts,services/seoDataService.ts,ui/SeoQueriesPanel.tsx,ui/SeoPagesFilters.tsx,ui/SeoDataTable.tsx,ui/SeoPage.tsx,ui/seoStyles.ts}` и тесты этих зон; tests универсального renderer, SeoDataTable, pages regression; spec cms-seo-data-ui |
| E — приёмка | Quality Gate | runtime только проверки, evidence `.qa/seo-queries-metrics/<lane>/`; единственный итог `docs/reports/seo-queries-metrics.md` создаётся SYNTH |

Specs принадлежат Planner до approval; при реализации исполнители читают их, не меняют контракт самовольно. Общие файлы внутри deliverable меняются последовательно; tasks checkbox — координационный exception, каждый unit отмечает только свои IDs. Новые тестовые файлы в профильных tests разрешены; `tests/smoke` не создаётся.

## Execution units

Коды ownership A–E раскрыты выше; точечные contextFiles — в `tasks.md`, одинаковые правила применяются к таблице здесь. В каждой unit 5–10 существенных действий, одна verification-группа; выполнение останавливается после handoff. Последний unit сервиса прогоняет full suite один раз.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| MQ-1 | Backend | A | query entities/protocol/repository + stats SQL helper, integration tests | approval | targeted PostgreSQL query stats + page SQL regression |
| MQ-2 | Backend | A | query schemas/service/API/DI/registration, tests, README | MQ-1 | `make -C services/ya-metrica-service test` |
| SQ-1 | Backend | B | query repo/protocol, peer client/schemas/protocol, builder, tests | approval | targeted SEO repository/client/builder |
| SQ-2 | Backend | B | search query service/API/schemas/DI, tests, README, SERVICES.md | SQ-1, MQ-2 | `make -C services/seo-service test` |
| GW-1 | Backend | C | API/proxy/protocol/client/schemas, tests, inventory | approval | `make -C services/backend test` |
| FE-1 | Frontend | D | query DTO/API/service/hook + тесты | approval | targeted API/service/hook tests |
| FE-2 | Frontend | D | panels/filters/SeoPage/styles + component tests | FE-1 | targeted UI/pages regression + typecheck |
| QG-ENV | Quality Gate | E | verification only | MQ-2,SQ-2,GW-1,FE-2 | readiness четырёх сервисов/DB |
| QG-BE | Quality Gate | E | verification only, backend lanes | QG-ENV | scoped Python format/lint/test review |
| QG-FE-AUTO | Quality Gate | E | verification only, CMS | QG-ENV | npm test/lint/tsc/build |
| QG-CONTRACTS | Quality Gate | E | verification only, HTTP/specs | QG-ENV | strict validation + contract/access review |
| QG-LIVE | Quality Gate | E | verification only, API/PostgreSQL | QG-BE,QG-FE-AUTO,QG-CONTRACTS | SM-QM-01..06, SQL/N+1 |
| QG-FE-MANUAL | Quality Gate | E | verification only, browser | QG-BE,QG-FE-AUTO,QG-CONTRACTS | M-QM-01..08, scripted evidence |
| QG-SYNTH | Quality Gate | E | итоговый report | QG-LIVE,QG-FE-MANUAL | единый вердикт/покрытие |

```text
approval ─┬─ MQ-1 → MQ-2 ───────┐
          ├─ SQ-1 ──────────────┴→ SQ-2 ─┐
          ├─ GW-1 ──────────────────────┤
          └─ FE-1 → FE-2 ────────────────┴→ QG-ENV
QG-ENV → (QG-BE ∥ QG-FE-AUTO ∥ QG-CONTRACTS)
       → (QG-LIVE ∥ QG-FE-MANUAL) → QG-SYNTH
```

Первые MQ-1/SQ-1/GW-1/FE-1 независимы по утверждённым wire contracts, мокам и ownership. SQ-2 требует готовый peer для интеграции. Quality Gate **QG-FULL**, потому что код четырёх сервисов; отдельного QG-FORMAT нет. NATS/AsyncAPI lane subsection неприменим — нет messaging diff. Sync specs/archive после APPROVED или явно принятого waiver и финализации Router; сейчас не выполняются.

## Test matrix

Все ID — группы параметризованных сценариев, не квоты checkbox. Трассировка: L=delta seo-entity-listing, M=metrica-search-query-stats-query, B=seo-backend-proxy, P=seo-peer-http-contract, U=cms-seo-data-ui; указывается Requirement. Новых write нет: транзакционность записей/идемпотентность/конкурентные mutations неприменимы; read race покрыта UI. Регрессия — сохранение pages и normalization. Никаких smoke pytest-файлов.

### Backend и PostgreSQL

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где / трассировка |
|---|---|---|---|---|---|
| UT-MQ-01 | unit/API | validation | все восемь metrics, bucket count/order/overlap, UUID dedup, 0/101 IDs, dates/direction/366 | 200 либо 400 до SQL | ya-metrica tests/unit + API; M: Вход таблицы/ранжирования |
| IT-MQ-02 | integration PostgreSQL | формулы/типы | неравные дневные visits, 5 сумм, 3 взвешенных, zero/missing, numeric large sums | точные JSON numbers, не daily AVG | tests/integration/test_search_query_stats_query_postgres.py; M: Формулы |
| IT-MQ-03 | integration PostgreSQL | identity/security | tenant B, совпадающий query UUID, разные parse tasks/dates | нет утечки/дублей, не query×page | там же; M: Источник |
| IT-MQ-04 | integration PostgreSQL | global numeric rank/N+1 | asc/desc/ties, UUID asc, 100×31 + малый размер, SQL log/count | 1 SQL M5, 1 M6 | там же; M: Ответ таблицы/ранжирования |
| UT-MQ-05 | API | access/errors | A4/A5 без auth и Cookie/Bearer; missing resource; ошибка БД | identical 200, invalid/DB 400 sanitized | ya-metrica API/unit; M: Peer API |
| UT-SQ-01 | unit/API | validation/period | four modes defaults/limits, clamp конца, leap/month/year boundaries, future, timezone midnight | существующий resolver без drift, 400 invalid до БД/peer | SEO tests/unit/test_search_query_service.py + existing period tests; L: Период |
| UT-SQ-02 | unit/client/builder | DTO | 8 metrics, row_id adapter, unknown fields, headers through years, formatting/zero/missing/current-page UUID | тот же v1 и formatters, no duplicates | SEO builder/client tests; L: Список/Период |
| UT-SQ-03 | unit/API | failure | M5/M6 non-200/timeout/transport/invalid/schema metric/direction mismatch | безопасный 502, rollback, не empty | SEO clients/API; L: Пакетность; A2 |
| IT-SQ-04 | integration PostgreSQL | SQL sort/search | >2 страниц, asc/desc по query/full timestamp/metric, ties/NULLS LAST, literal %,_,\\, tenant, offset/total | global sort до page, count по search, no dup | SEO tests/integration/test_search_query_metrics_postgres.py; L: Сортировка/SQL поток |
| UT-SQ-05 | unit/integration | N+1/fallback | limit 5/50/100, max buckets, empty, metric date вне периода | 2 SEO SQL, ≤2 peer; empty no M5, outside no M6 | SEO service + repository tests; L: Пакетность/SQL поток |
| UT-SQ-06 | API | access | A2/A3 anonymous и credentials, selector valid/missing/invalid | 200/401, selector отказ до данных | SEO tests/api/test_access.py; P: Access matrix |
| UT-GW-01 | API/unit | auth/tenant | A1 anonymous, ADMIN, non-admin incl SUPERUSER/DEVELOPER, malicious tenant query/header | 401/403 до SEO; actor tenant only | backend tests SEO; B: Access matrix |
| UT-GW-02 | unit/client | validation/DTO/error | forward all args, limit clamp, invalid params, missing/bad metrics_table, unknown extra, downstream error | 400 no peer, DTO error 502; extras retained | backend tests client/proxy; B: Проксирование списков |
| UT-REG-01 | regression | pages/parsing | page stats repository, SEO pages builder and period, backend pages proxy | прежние ответы/поведение неизменны; ingestion source diff отсутствует | существующие suites трёх сервисов |

### Frontend

Все unit/component/API-boundary tests — MSW/mocks, **без live backend**, типы в src/types, API только через src/api. Новых Protected Write действий нет; mutation guards/double submit для queries неприменимы, существующая normalization проверяется на регрессию M-QM-08.

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| FT-QM-01 API/service | параметры и metrics DTO | success, empty, 400,502,401,403; forwarding limit/offset, unknown fields, no selector; минимум base/edge/error | A1 anonymous/authenticated | targeted api/seo + seoDataService tests |
| FT-QM-02 hook search/sort/reset | query/created_at/metric sort, draft debounce, reset | apply/clear/300ms timer, sort mapping/clear; reset during pending timer ровно 1 request; limits/metric dates сохранены | guard scope present/missing | targeted useSeoQueriesTable tests |
| FT-QM-03 hook metrics | server defaults, period sync, notify | day/week/month/year, mode no dates, adjusted silently/clamped warning, today picker, no repeat fetch, date/mode clear metric sort, metric preserve | allowed only | targeted hook + options tests |
| FT-QM-04 paginator initial | старт | initial limit=25 offset=0; API без page/pageSize | ADMIN | hook/component tests |
| FT-QM-05 paginator page | смена страницы | offset=limit*(page-1), total из server | ADMIN | hook/component tests |
| FT-QM-06 paginator size | смена размера | limit меняется, offset=0, нет двойного запроса от двух callbacks | ADMIN | hook/component tests |
| FT-QM-07 paginator filters | сброс страницы | search/sort/mode/metric/date reset offset, metric state сохранён reset | ADMIN | hook/component tests |
| FT-QM-08 data table/panels | renderer/controls | минимум data/loading/empty/error/retry/callback; dateOnly, fixed left, no date filters; no normalization; generic text/zero/— | present/missing scope | targeted panels/SeoPage/renderer tests |
| FT-QM-09 auth/races | запрет чтения, stale data | anonymous block, allowed render, scope missing hidden/denied, no call guard, 401/403 surfaced; late response/scope revoke/tab switch | ADMIN vs other roles, без role override | hook + SeoPage mocks |
| FT-QM-10 regression/layers | pages/normalization unchanged | существующие SeoPagesFilters/useSeoPagesTable/SeoDataTable/SeoPage tests; no site-* imports/no live tests | прежние guards | npm test/lint/tsc/build, scoped rg self-check |

### Live API (реальная PostgreSQL)

Использовать skill `.claude/skills/api-smoke-test` (если в окружении его нет — blocked-env, не подменять pytest smoke). Переменные BASE_URL, SEO_URL, METRICA_URL, ADMIN_COOKIE, NO_ADMIN_COOKIE, TENANT_A/B, Q1..QN определяются QG-ENV; cookie/пароли в tracked evidence не сохраняются. Для fixtures разрешено добавлять только изолированные тестовые tenants/query stats в реальную PostgreSQL с точным cleanup по созданным UUID; не менять существующую статистику/нормализацию. M5/M6 можно вызывать из доверенной сети, не публикуя новые порты.

| ID | Запрос / действия | Проверка / трассировка |
|---|---|---|
| SM-QM-01 | A1 без cookie, с non-admin, с ADMIN; tenant spoof; A2/A3 с/без credentials и valid/invalid selector | 401/403/200, peer 200/401; отказ до downstream, tenant A only; B/P matrix |
| SM-QM-02 | M5/M6 без/с Cookie/Bearer; missing resource/invalid bucket/direction, tenant B | A4/A5 200/400, одинаковые тела, без утечки; M: Peer API |
| SM-QM-03 | backend список для 8 metrics и 4 modes, clamp 01.09–26.10 на фиксированных часах либо аналогичный прошлый диапазон | формулы, period и formatters, нули/пропуски; L: Период; M: Формулы |
| SM-QM-04 | несколько страниц, asc/desc query/created_at/metric + search/offset, UUID ties и no stats | полный SQL порядок, total, nulls last, без дублирования; IT-SQ-04 |
| SM-QM-05 | SQL logs SEO/Метрики: размеры 5/50/100, колонки 1/31, metric sort on/off, empty | 2 SELECT SEO, 1 per peer, ≤2 calls; сохранить counts/timings/EXPLAIN (без ANALYZE на пользовательских writes), bounded bind arrays; L/M N+1 |
| SM-QM-06 | управляемый timeout/недоступность Метрики, восстановление; страницы после восстановления | SEO/backend 502 sanitized, не empty; восстановление 200; pages/normalization regression; L: Пакетность |

SQL evidence: request correlation/последовательный изолированный прогон, таблица `limit×buckets×ordering → SQL SEO/SQL M5/SQL M6/peer calls/latency`, не просто «быстро». Считать прикладные SELECT отдельно от BEGIN/COMMIT/health. Снять прежний log_statement, временно включить логирование на двух DB, обязательно вернуть прежнее значение в finally, не безусловный RESET. Если global logging недопустим, настроить scoped SQLAlchemy logging/count на проверочном instance; запрет не обходить. SQL/параметры в evidence обезличить.

## PostgreSQL для smoke-тестов

Discovery выполнен в PLAN-1: основной label project=eqsitecms/service=db не совпал (текущий project=eqsitecms-infra), fallback по имени postgres контейнера; затем `docker inspect` трёх DB. Безопасный результат `.qa/seo-queries-metrics/plan-1/db-inventory.json`:

| Контейнер | image | project/service | DB / user | host 5432/tcp | aliases |
|---|---|---|---|---|---|
| eqsitecms-db | postgres:16 | eqsitecms-infra/db | eqsitecms / eqsitecms | 5433 | eqsitecms-db, db |
| eqsitecms-db-seo | postgres:16 | eqsitecms-infra/db-seo | eqsitecmsseo / eqsitecmsseo | 5437 | eqsitecms-db-seo, db-seo |
| eqsitecms-db-ya-metrica | postgres:16 | eqsitecms-infra/db-ya-metrica | eqsitecmsyametrica / eqsitecmsyametrica | 5439 | eqsitecms-db-ya-metrica, db-ya-metrica |

Общая сеть eqsitecms_network; в контейнерной сети использовать alias:5432. Password присутствует в inspect, намеренно не раскрывается/не фиксируется; QG получает его в память из Config.Env при повторном discovery. Это наблюдения, не hardcoded test config. Host bindings сейчас 0.0.0.0/:: — production isolation не доказана. PLAN-1 не соединялся с БД и не менял runtime.

## Manual QA steps (UI тестирование)

QG-FE-MANUAL: реальный browser через scripted Playwright, skills stack-control/ui-qa и agents/howto/browser-qa-protocol.md, viewport **1366×768**. Предусловия: frontend/backend/SEO/Метрика готовы, ADMIN и non-admin session, тестовые tenants A/B, ≥100 queries (несколько длинных), данные с nonzero/zero/missing в нескольких годах; результаты automated lane прочитаны. URL `${CMS_URL}/seo`. Evidence `.qa/seo-queries-metrics/QG-FE-MANUAL/`, скриншоты плюс ручная визуальная инспекция, console/network/axe; failed API — status/body без секретов.

| Шаг | Действие | Ожидание |
|---|---|---|
| M-QM-01 | Anonymous прямой /seo; затем non-admin, затем ADMIN → «Запросы» | anonymous redirect/block; non-admin отказ без query request; ADMIN таблица, mode day/visits, серверные даты; backend 401/403 явно обрабатываются |
| M-QM-02 | ADMIN выбрать week/month/year/day, открыть picker; сравнить network с period | mode запрос без дат; 4/6/2/7 defaults, future disabled по today, поля нельзя очистить; picker/labels без overlap |
| M-QM-03 | Выбрать длинный диапазон дней, затем выравниваемые недели и текущий месяц | clamp только конца с предупреждением; adjusted без warning; даты заменены ответом, один request на действие; title календарный, hint фактический |
| M-QM-04 | Показать 100 строк и 31 колонку; vertical/horizontal scroll | sticky вкладки/actions/filters/header, скролл только body, query/created слева, без overlap/дублирующей pagination; длинный query с tooltip; screenshot |
| M-QM-05 | Ввести search, %,_, пробелы; дождаться debounce; сортировать query/date/dynamic в обоих направлениях; следующая страница/размер | literal search; одна сортировка по server ordering, full timestamp при одинаковой дате, NULLS LAST обоими направлениями, global page order, offset resets и limit/offset без pageSize в API |
| M-QM-06 | Настроить metrics/limit/search/sort/page, начать новый draft и нажать «Сбросить» до debounce; быстро менять фильтр/вкладку | один reset request, mode/metric/dates/limit сохранены, search/draft/sort пусты; поздний ответ не перезаписывает, состояние pages независимо |
| M-QM-07 | Empty search; вызвать контролируемые 400/502, retry; пройти filters Tab/Enter/Space/Escape | различимые loading/empty/error, фильтры сохранены, retry работает, 0/— не смешаны; фокус возвращается видимому trigger, sizing copies не фокусируются; нет новых axe serious/critical |
| M-QM-08 | Переключить «Страницы», открыть/закрыть нормализацию, на изолированном правиле add/delete при ADMIN; затем «Запросы», «Метрика», «Вебмастер» | pages layout/метрики/нормализация без изменений, mutation guards/401/403 прежние; «Запросы» никогда не показывает normalization; другие вкладки без query actions; passed/failed + evidence |

## Risks / Trade-offs

- [Большой ranking UUID[]] → наследуем подход 102 без репликации; bound array вместо CASE/IN expansion, latency/response size/EXPLAIN в live. Если реальные объёмы превышают transport budget, вернуть blocker и перепроектирование, не in-memory sort.
- [Page-oriented внутренние типы] → нейтральный builder adapter и shared control props с совместимыми wrappers; regression suites, никаких wire page_id для query stats.
- [Рассинхронизация timezones] → ENV/QG сверяет значения SEO_UTC_OFFSET_HOURS и YA_METRICA_UTC_OFFSET_HOURS без чтения чужой env приложением; midnight unit tests.
- [Разные версии сервисов] → порядок rollout ниже; обязательный metrics_table не считать optional fallback, старый downstream должен дать 502, а не тихую потерю метрик.
- [Host exposure унаследован] → planning/apply-ready не равно production-ready; без отдельного доказательства сетевой изоляции production запрещён.
- [Инструменты] → global openspec отсутствует в PATH; доступен `.cache/openspec-tool/1.14.3/openspec-local`. `rg` отсутствует; QG использует grep/find эквиваленты self-check либо фиксирует tooling gap, не устанавливает инструменты/не меняет root tooling внутри change.

## Migration Plan

Нет schema migrations/backfill. После approval: deliverables по DAG; deploy ya-metrica → SEO → backend → frontend. Убедиться в готовности DB/service с узкими штатными make/Compose fallback там, где stackctl не поддерживает сервис. Не чинить registry в этом change. Rollback обратный: frontend/backend к совместимой паре, затем SEO/Метрика; данные не откатываются, новых записей runtime change нет.

После всех units один QG-FULL; findings возвращаются владельцам, повторная проверка тем же lane. Только QG-SYNTH создаёт итоговый docs/reports/seo-queries-metrics.md. После APPROVED/APPROVED_WITH_WAIVER Router выполняет разрешённую пользователем финализацию, sync пяти delta specs, strict validation и archive; legacy docs/plans, source task не редактируются.

## Open Questions

Блокирующих вопросов архитектуры нет. Для approval требуется принять конкретные M5/M6 и их peer 200/400 resource-policy, сохранение clamp limit/offset и минимальные совместимые adapters общих компонентов без изменения pages поведения. До live нужно выбрать разрешённые тестовые tenant fixtures и способ controlled failure/logging; это операционные входы QG-ENV, не незавершённый API-дизайн. Production network isolation остаётся release blocker вне scope. Реализация, sync и archive сейчас не разрешены.
