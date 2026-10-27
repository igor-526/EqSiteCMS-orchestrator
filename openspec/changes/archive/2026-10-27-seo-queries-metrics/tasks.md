# Tasks — seo-queries-metrics

Ownership A–E, DAG, test matrix и Manual QA находятся в `design.md`; apply только после явного approval. Каждый unit меняет только свои пути внутри deliverable, сразу отмечает лишь выполненные IDs и возвращает handoff; evidence только `.qa/seo-queries-metrics/`. Сокращённые пути в contextFiles относительно соответствующего `services/<сервис>/`, `design.md`/`specs/` — относительно change. Source task и docs/plans read-only. Секции design читаются точечно, не весь change.

## Execution units

| Unit | Профиль | Deliverable / ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| MQ-1 | Backend | A: ya-metrica query entities/protocol/repository, stats helper, integration tests | approval | targeted PostgreSQL tests | `design.md#d3-sql-метрики`, `specs/metrica-search-query-stats-query/spec.md`, ya-metrica `src/models/metrica_stats.py`, `src/repositories/page_stats_query_repository.py`, `src/core/entities/metrica_stats_query.py`, `src/core/protocols/repositories/page_stats_query.py`, `tests/integration/test_page_stats_query_postgres.py`, `tests/integration/conftest.py` |
| MQ-2 | Backend | A: query API/schemas/service/DI/registration, tests, README | MQ-1 | make test Метрики | `design.md#d2-новые-peer-endpoints-метрики`, `design.md#access-matrix`, `specs/metrica-search-query-stats-query/spec.md`, ya-metrica `src/api/page_stats.py`, `src/core/schemas/api/page_stats.py`, `src/core/services/page_stats_query_service.py`, `src/containers/application.py`, `src/main.py`; handoff MQ-1 |
| SQ-1 | Backend | B: SEO repo/protocol/client/schemas/builder + tests | approval | targeted repo/client/builder | `design.md#d4-seo-поток-и-универсальный-builder`, `specs/seo-entity-listing/spec.md`, SEO `src/repositories/page_repository.py`, `src/repositories/search_query_repository.py`, `src/core/protocols/repositories/search_query_repository.py`, `src/clients/ya_metrica.py`, `src/core/schemas/clients/ya_metrica.py`, `src/core/protocols/clients/ya_metrica.py`, `src/core/services/metrics_table/builder.py` |
| SQ-2 | Backend | B: SEO query service/API/schema/DI, tests/docs, SERVICES.md | SQ-1,MQ-2 | make test SEO | `design.md#d4-seo-поток-и-универсальный-builder`, `design.md#d5-ошибки-и-безопасность`, `specs/seo-entity-listing/spec.md`, `specs/seo-peer-http-contract/spec.md`, SEO `src/core/services/search_query_service.py`, `src/core/services/page_service.py`, `src/api/search_queries.py`, `src/core/schemas/api/search_queries.py`, `src/containers/services.py`; handoffs SQ-1/MQ-2 |
| GW-1 | Backend | C: backend SEO route/proxy/protocol/client/schema/tests/inventory | approval | make test backend | `design.md#d1-контракт-списка-и-совместимость`, `design.md#access-matrix`, `specs/seo-backend-proxy/spec.md`, backend `src/api/seo.py`, `src/core/services/seo_proxy.py`, `src/core/protocols/seo_service.py`, `src/clients/seo_service/client.py`, `src/clients/seo_service/schemas.py`, `src/core/schemas/metrics_table.py` |
| FE-1 | Frontend | D: CMS query DTO/API/service/hook и tests | approval | targeted boundary/hook | `design.md#d6-cms-state-и-переиспользование`, `design.md#test-matrix` (только FT-QM-01..07,09), frontend `src/types/api/seo.ts`, `src/api/seo.ts`, `src/features/seo/services/seoDataService.ts`, `src/features/seo/services/pageMetricsOptions.ts`, `src/features/seo/hooks/useSeoPagesTable.ts`, `src/features/seo/hooks/useSeoDataTable.ts`, `src/features/seo/hooks/useSeoScopes.ts` |
| FE-2 | Frontend | D: CMS query panel/shared filter props/SeoPage/styles + tests | FE-1 | targeted component/pages + tsc | `design.md#d7-cms-раскладка`, `specs/cms-seo-data-ui/spec.md`, frontend `src/features/seo/ui/SeoQueriesPanel.tsx`, `src/features/seo/ui/SeoPage.tsx`, `src/features/seo/ui/SeoPagesFilters.tsx`, `src/features/seo/ui/SeoPagesPanel.tsx`, `src/features/seo/ui/SeoDataTable.tsx`, `src/features/seo/ui/seoStyles.ts`, `src/ui/metricsTable/buildMetricsTableColumns.tsx`; handoff FE-1 |
| QG-ENV | Quality Gate | E: readiness/evidence only | MQ-2,SQ-2,GW-1,FE-2 | узкая readiness группа | `design.md#postgresql-для-smoke-тестов`, `design.md#migration-plan`, `.qa/seo-queries-metrics/plan-1/db-inventory.json`, `.docker-compose/docker-compose.seo.yml`, `.docker-compose/docker-compose.ya_metrica.yml`; handoffs исполнителей |
| QG-BE | Quality Gate | E: Python review/verification only | QG-ENV | Python scoped gate | `design.md#test-matrix` (backend), `design.md#deliverables-и-ownership`, три backend delta specs; path-scoped diff и handoffs MQ/SQ/GW |
| QG-FE-AUTO | Quality Gate | E: CMS automated only | QG-ENV | npm test/lint/tsc/build | `design.md#test-matrix` (frontend), `specs/cms-seo-data-ui/spec.md`, frontend `package.json`; FE diff/handoffs |
| QG-CONTRACTS | Quality Gate | E: HTTP/spec review only | QG-ENV | OpenSpec/access/contract review | `design.md#access-matrix`, `design.md#d1-контракт-списка-и-совместимость`, `design.md#d2-новые-peer-endpoints-метрики`, пять delta specs; API/protocol diff |
| QG-LIVE | Quality Gate | E: API/SQL evidence only | QG-BE,QG-FE-AUTO,QG-CONTRACTS | SM-QM-01..06 | `design.md#test-matrix` (Live API), `design.md#postgresql-для-smoke-тестов`, `design.md#access-matrix`; ENV handoff и findings трёх lanes |
| QG-FE-MANUAL | Quality Gate | E: browser evidence only | QG-BE,QG-FE-AUTO,QG-CONTRACTS | M-QM-01..08 | `design.md#manual-qa-steps-ui-тестирование`, `specs/cms-seo-data-ui/spec.md`, `agents/howto/browser-qa-protocol.md`; ENV и FE-AUTO handoffs |
| QG-SYNTH | Quality Gate | E: docs/reports/seo-queries-metrics.md | QG-LIVE,QG-FE-MANUAL | единый QG verdict | `design.md#test-matrix`, `design.md#risks--trade-offs`, `tasks.md`; findings/handoffs lanes и их evidence indexes |

## 1. MQ-1 — SQL чтения статистики запросов (профиль: Backend)

**Specs:** metrica-search-query-stats-query · **Пути:** A, repository slice · **Зависит от:** approval.

- [x] MQ-1.1 Добавить query stats value entity и repository protocol с search_query_id, используя существующие enums/buckets; проверить типы и query-only имена.
- [x] MQ-1.2 Переиспользовать whitelist формул через узкий trusted-table helper при необходимости; проверить неизменность page SQL expressions тестами.
- [x] MQ-1.3 Реализовать M5 repository SQL на metrica_search_query_stats и пакетных buckets/UUID[]; проверить разреженность и один результат на пару.
- [x] MQ-1.4 Реализовать M6 repository SQL с числовым порядком и UUID asc; проверить отсутствие JOIN parse tasks/pages/counters.
- [x] MQ-1.5 Добавить PostgreSQL tests `IT-MQ-02..04`, включая SQL counters/logging и все восемь metrics; проверить формулы, tenant и объём 100×31.
- [x] MQ-1.V Прогнать targeted query stats integration tests и page repository regression на реальной PostgreSQL; сохранить обезличенный SQL/count evidence, отметить IDs и вернуть handoff.

## 2. MQ-2 — peer API запросов (профиль: Backend)

**Specs:** metrica-search-query-stats-query · **Пути:** A, API slice · **Зависит от:** MQ-1.

- [x] MQ-2.1 Добавить входные query DTO и повторное использование validators buckets/dates/UUID; проверить bounds `UT-MQ-01`.
- [x] MQ-2.2 Добавить выходные table/ranking DTO с числовой сериализацией до 8 знаков; проверить JSON schema и query UUID naming.
- [x] MQ-2.3 Добавить query service с Protocol зависимостью и безопасным mapping, без calendar/search; проверить service tests.
- [x] MQ-2.4 Собрать request-local read graph в containers и registered router M5/M6; проверить оба точных URL через API tests.
- [x] MQ-2.5 Реализовать API/access/error tests `UT-MQ-01,05` для anonymous и Cookie/Bearer, missing resource и DB failure; проверить 200/400 без утечки.
- [x] MQ-2.6 Обновить README Метрики новыми endpoints, wire examples, формулами и production isolation gate; сверить с access matrix.
- [x] MQ-2.V Прогнать `make -C services/ya-metrica-service test` один раз для сервиса, включая page regression; evidence и handoff с точным peer контрактом.

## 3. SQ-1 — SQL, peer client и адаптация builder (профиль: Backend)

**Specs:** seo-entity-listing, metrics-table-contract (read-only) · **Пути:** B, adapters/repository · **Зависит от:** approval.

- [x] SQ-1.1 Расширить query repository protocol ранжированными UUID и created_at ordering; проверить сохранение legacy signatures по вызовам.
- [x] SQ-1.2 Реализовать query SQL ORDER BY query/timestamp/unnest ordinal NULLS LAST до pagination; проверить tenant/search/count и stable ties.
- [x] SQ-1.3 Добавить отдельные query table/ranking client DTO без ложного page_id; проверить parsing/metric/direction validation.
- [x] SQ-1.4 Расширить YaMetricaClientProtocol и client query_table/query_ranking, используя безопасный `_get`; проверить endpoints, параметры и credentials-free requests.
- [x] SQ-1.5 Ввести нейтральный внутренний builder input/adapter для query values с совместимым page wrapper; проверить один formatter/builder путь и только row UUID текущей страницы.
- [x] SQ-1.6 Добавить tests `UT-SQ-02,03`, `IT-SQ-04` и SQL-count часть `UT-SQ-05`; проверить PostgreSQL numeric ordering на >2 страницах.
- [x] SQ-1.V Прогнать targeted SEO repository/client/builder tests и существующий page builder regression; сохранить evidence, отметить IDs и вернуть handoff.

## 4. SQ-2 — композиция списка запросов в SEO (профиль: Backend)

**Specs:** seo-entity-listing, seo-peer-http-contract · **Пути:** B, domain/API/docs · **Зависит от:** SQ-1,MQ-2.

- [x] SQ-2.1 Расширить search query input/output schemas с обязательным metrics_table и export; проверить DTO совместимость items/total.
- [x] SQ-2.2 Расширить SearchQueryService валидацией и существующим resolver/registry, сохранив clamp limit/offset; проверить ошибки до БД/peer.
- [x] SQ-2.3 Подключить SQL ranking→list/count→batch table→builder поток и outside-period fallback; проверить `UT-SQ-01,05`.
- [x] SQ-2.4 Расширить существующий GET route и DI метрик, не меняя resolve/normalizers/pages; проверить wiring и запрет дублей.
- [x] SQ-2.5 Добавить service/API/access tests `UT-SQ-01,03,05,06`, включая selector и ≤2 peer-вызова; проверить anonymous/authenticated и safe 502.
- [x] SQ-2.6 Обновить README SEO и SERVICES.md централизованным query metrics flow, peers, access и сохранёнными env; сверить отсутствие обещаний production readiness.
- [x] SQ-2.V Прогнать `make -C services/seo-service test`, включая PostgreSQL query metrics и pages/resolve regression, сохранить evidence и handoff.

## 5. GW-1 — backend proxy запросов (профиль: Backend)

**Specs:** seo-backend-proxy · **Пути:** C · **Зависит от:** approval.

- [x] GW-1.1 Добавить SearchQueriesOutDto с общей MetricsTableOutDto, допуская неизвестные v1 поля; проверить missing/invalid metrics_table → 502.
- [x] GW-1.2 Расширить SEO client protocol и HTTP client метрик-параметрами queries; проверить только actor selector, без browser credentials.
- [x] GW-1.3 Расширить proxy service валидацией dates/ordering и forwarding, сохранив numeric limit/offset clamp; проверить 400 до SEO без period calculations.
- [x] GW-1.4 Расширить GET route query params/response_model, сохранив строгий ADMIN dependency; проверить 401/403 до downstream.
- [x] GW-1.5 Реализовать и прогнать `UT-GW-01..02`, включая tenant spoof, extras, timeout/5xx, invalid ordering/date; проверить безопасные ошибки.
- [x] GW-1.6 Актуализировать backend route inventory штатным механизмом; проверить GET exception/ADMIN/tenant и ссылку на тесты.
- [x] GW-1.V Прогнать `make -C services/backend test`, включая pages proxy regression; evidence и handoff, отметить только свои IDs.

- [x] GW-FIX-1 Исправить только перенос строки с join(seo_validation) в maintain/route_inventory.py по BE-M1; проверить scoped formatter/check и diff-check.

## 6. FE-1 — API и состояние запросов CMS (профиль: Frontend)

**Specs:** cms-seo-data-ui · **Пути:** D, boundary/hooks · **Зависит от:** approval.

- [x] FE-1.1 Расширить query DTO/output/filter types в src/types/api/seo.ts общей metrics схемой, без page/pageSize в wire; проверить TypeScript consumers.
- [x] FE-1.2 Расширить src/api/seo.ts параметрами queries без selector и peer access; проверить MSW/mocked API forwarding.
- [x] FE-1.3 Расширить seoDataService query ordering whitelist и fetch forwarding без silent stripping metrics; проверить `FT-QM-01` включая 400/502/401/403.
- [x] FE-1.4 Добавить useSeoQueriesTable с отдельным state/request snapshot и переиспользованием existing options helpers; проверить server defaults, period sync и notify-only-clamp `FT-QM-03`.
- [x] FE-1.5 Реализовать debounce/draft/single sort/reset/limit-offset и generation/scope guards; проверить `FT-QM-02,04..07,09`, включая один reset request и stale response.
- [x] FE-1.6 Добавить tests hook success/empty/error, scope present/missing/revoke и paginator duplicate callback; проверить no live backend calls и отсутствие изменений page hook.
- [x] FE-1.V Прогнать targeted API/seoDataService/useSeoQueriesTable tests, зафиксировать покрытие FT IDs и вернуть handoff без дальнейшего UI apply.

## 7. FE-2 — раскладка и renderer запросов (профиль: Frontend)

**Specs:** cms-seo-data-ui · **Пути:** D, UI/shared props/tests · **Зависит от:** FE-1.

- [x] FE-2.1 Описать структурные общие filter control props в src/types и переиспользовать SeoPagesFilters для queries с отдельным aria label; проверить page label/поведение не изменены.
- [x] FE-2.2 Подключить новый hook/model к SeoQueriesPanel и существующий buildMetricsTableColumns; проверить text/hint/empty_text без локального format engine.
- [x] FE-2.3 Совместимо расширить тип модели SeoDataTable для useSeoQueriesTable и подключить metrics filters, hidePagination/dateOnly/fixedColumns; проверить отсутствие date filters/query normalization и неизменность существующих consumers.
- [x] FE-2.4 Добавить queries paginator/reset в строку вкладок SeoPage, оставив pages branch/normalization; проверить active-tab действия и независимость состояний.
- [x] FE-2.5 Переиспользовать существующие layout styles/высоту тела для queries, точечно дополнив seoStyles; проверить sticky header/filters и horizontal scroll без overlap на 1366×768.
- [x] FE-2.6 Добавить component/API-boundary tests `FT-QM-08..10` и pages regression; проверить data/loading/empty/error/callback/permissions и auth surface.
- [x] FE-2.V Прогнать targeted component/pages tests и `npx tsc --noEmit` из frontend; выполнить scoped self-check API layering, limit/offset, no site-* mixing (rg либо grep/find эквиваленты), вернуть handoff.

### FE-FIX-1 — стабилизация тестов после QG-FE-AUTO-B1

- [x] FE-FIX-1 Стабилизировать lifecycle/стоимость SeoPage reset и SeoQueriesPanel callback tests без увеличения timeout, skip, глобальных workers/tooling и изменения продукта; targeted tests, штатный npm test, scoped lint/typecheck/diff-check; evidence `.qa/seo-queries-metrics/fe-fix-1/`, повторная проверка тем же QG-FE-AUTO.

  Реализация fix выполнена: targeted 29/29, оба изменённых файла проходят в трёх штатных full runs; scoped lint/typecheck/diff PASS. Повторный QG подтвердил FE-FIX-1: штатный `npm test` — 1167/1167 (97 файлов), B1 закрыт. NotificationsPage 11/11, внешний непостоянный timeout классифицирован вне scope (import graph не пересекается с change). Evidence QG: `.qa/seo-queries-metrics/QG-FE-AUTO/handoff.md`, `recheck-full.log`, `recheck-notifications-isolation.json`. Evidence: `.qa/seo-queries-metrics/fe-fix-1/handoff.md`. Внешние тесты/configuration не менялись.

## 8. QG-ENV — готовность окружения (профиль: Quality Gate)

**Specs:** access contracts · **Пути:** E, runtime/evidence, без кода · **Зависит от:** все исполнители.

- [x] QG-ENV.1 Загрузить stack-control, проверить актуальную поддержку сервисов и выполнить узкий readiness/rebuild четырёх изменённых приложений; проверить health без изменения registry.
- [x] QG-ENV.2 Повторить discovery PostgreSQL через labels/fallback/docker inspect для трёх DB; получить credentials только в память, сохранить redacted inventory.
- [x] QG-ENV.3 Проверить DB/schema readiness и timezone alignment, доступ peers из trusted network, без новых внешних портов; зафиксировать pre-existing exposure отдельно.
- [x] QG-ENV.4 Выбрать изолированные tenant fixtures, auth sessions, URLs и контролируемый failure/logging способ для live/browser; проверить `.claude/skills/api-smoke-test` доступность либо объявить blocked-env.
- [x] QG-ENV.V Сохранить readiness evidence и передать lanes handoff с non-secret переменными, fixtures/cleanup правилами, блокерами и пределами production утверждений.

## 9. QG-BE — Python качество и тесты (профиль: Quality Gate)

**Specs:** backend/SEO/Метрика · **Пути:** E, проверка · **Зависит от:** QG-ENV.

- [x] QG-BE.1 Проверить Clean Architecture/Protocol/DI и отсутствие изменений parsing/normalization/page behavior по scoped diff; записать findings по ownership.
- [x] QG-BE.2 Проверить SQL формулы, UUID matching, global sort до pagination/NULLS LAST, отсутствие in-memory aggregation и размножающих JOIN; сопоставить `IT-MQ-02..04,IT-SQ-04`.
- [x] QG-BE.3 Проверить качество backend tests по матрице `UT-MQ/SQ/GW/REG`, tenant/access/errors/DTO unknown fields, не только число tests.
- [x] QG-BE.4 Выполнить scoped format/lint/test трёх Python-сервисов в текущем дереве штатными Make targets; pre-existing failures отделить evidence, не создавать отдельный FORMAT unit.
- [x] QG-BE.V Сохранить команды/результаты, coverage IDs и findings, отметить свои IDs и вернуть handoff; никаких отдельных docs/reports lane-файлов.

## 10. QG-FE-AUTO — автоматические проверки CMS (профиль: Quality Gate)

**Specs:** cms-seo-data-ui · **Пути:** E, проверка · **Зависит от:** QG-ENV.

- [x] QG-FE-AUTO.1 Сверить `FT-QM-01..10` с behavior diff и minimum tests для hook/filter/table/paginator; проверить реальные assertions, MSW/mocks без live backend.
- [x] QG-FE-AUTO.2 Проверить ADMIN present/missing/revoked, anonymous flow, 401/403/error states, limit/offset и отсутствие новых mutations.
- [x] QG-FE-AUTO.3 Проверить слои API/feature/types, no site-* mixing и применимые rg self-check из agents/planner.md (grep/find fallback при отсутствии rg); сохранить результат.
- [x] QG-FE-AUTO.4 Из `services/frontend` выполнить `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`; scoped format при наличии штатной команды, не добавлять tooling.
- [x] QG-FE-AUTO.V Передать browser lane handoff с прошедшими FT IDs, маршрутами/UI states и findings; сохранить evidence и отметить IDs.

## 11. QG-CONTRACTS — HTTP и OpenSpec (профиль: Quality Gate)

**Specs:** пять delta specs · **Пути:** E, проверка · **Зависит от:** QG-ENV.

- [x] QG-CONTRACTS.1 Сверить существующие изменённые GET и новые M5/M6 с полным wire DTO/params/status, не спутать resource UUID 400 с selector 401.
- [x] QG-CONTRACTS.2 Сверить A1–A5 exception reasons, ADMIN-only, no role override и tenant spoof coverage; проверить anonymous/authenticated pairs в тестах.
- [x] QG-CONTRACTS.3 Проверить единый metrics_table/resolver/renderer и совместимость page wrappers, сохранение неизвестных fields, README/inventory/SERVICES соответствие.
- [x] QG-CONTRACTS.4 Проверить ownership/bounded units/нет миграций и NATS diff; выполнить `openspec status --change seo-queries-metrics --json` и `openspec validate seo-queries-metrics --type change --strict` через доступный CLI.
- [x] QG-CONTRACTS.V Сохранить contract evidence/findings и handoff; production isolation gap не считать закрытым live success.

## 12. QG-LIVE — API, PostgreSQL и отсутствие N+1 (профиль: Quality Gate)

**Specs:** API/SQL contracts · **Пути:** E, runtime verification · **Зависит от:** три review lanes.

- [x] QG-LIVE.1 Через `.claude/skills/api-smoke-test` на живом API и реальной PostgreSQL выполнить `SM-QM-01..02`; сохранить anonymous/authenticated/tenant статусы без credentials.
- [x] QG-LIVE.2 На изолированных fixtures выполнить `SM-QM-03..04`: восемь метрик, четыре режима, clamp, numeric global sorting/NULLS LAST/offset/search/ties; сверить с исходными SQL значениями.
- [x] QG-LIVE.3 Снять прежний SQL logging config двух DB и безопасно включить scoped либо согласованное временное логирование; убедиться, что evidence не раскрывает секреты.
- [x] QG-LIVE.4 Выполнить `SM-QM-05` со сравнением 5/50/100 строк и 1/31 колонок, с/без ranking/empty; сохранить SQL counts, peer counts, timings и планы, а не только скрин UI.
- [x] QG-LIVE.5 Выполнить `SM-QM-06` controlled failure/recovery и pages regression; восстановить точные прежние logging/dependency settings и удалить только созданные fixture UUID с подтверждённым target scope. **LIVE-D: failure/recovery и restoration выполнены; cleanup pending — destructive часть сознательно НЕ выполнена без отдельного согласия пользователя. Все 3229 fixture rows сохранены, manifest передан SYNTH.**
- [x] QG-LIVE.V Сохранить evidence таблицы SM IDs/SQL counters, вернуть handoff с findings/blocked-env при непройденной ключевой проверке.

Execution tracking принятого split (scope QG-LIVE не меняется; LIVE-A — access partial):
- [x] QG-LIVE.LIVE-B Завершить fixtures/metrics/global sort: SM-QM-03..04 и остаток HTTP access/tenant проверок SM-QM-01..02; counters отказов относятся к LIVE-C.
- [x] QG-LIVE.LIVE-C SQL/N+1: scoped instrumentation, SM-QM-05, SQL/peer counters отказов, timings/EXPLAIN (QG-LIVE.3/.4 и SQL-часть .1/.V).
- [x] QG-LIVE.LIVE-D Failure/recovery: SM-QM-06, pages regression, проверка восстановления и сводка lane (QG-LIVE.5/.V); cleanup только по отдельному согласию.

## 13. QG-FE-MANUAL — браузерная приёмка (профиль: Quality Gate)

**Specs:** cms-seo-data-ui · **Пути:** E, browser evidence · **Зависит от:** три review lanes.

- [x] QG-FE-MANUAL.1 Загрузить stack-control/ui-qa и browser-qa-protocol; подготовить scripted Playwright на 1366×768 и проверить предусловия из design.
- [x] QG-FE-MANUAL.2 Выполнить `M-QM-01..03` auth/filter/period/error flows; сохранить network assertions и визуальные состояния без cookie.
- [x] QG-FE-MANUAL.3 Выполнить `M-QM-04..06` sticky/body scroll, global sort/search/pagination/reset-one-request/races; снять и просмотреть screenshots изменённых состояний.
- [x] QG-FE-MANUAL.4 Выполнить `M-QM-07..08` error/retry/keyboard/axe и pages/normalization regression на изолированном правиле; новые serious/critical и overlap считать findings.
- [x] QG-FE-MANUAL.V Сохранить scripted report, screenshots/console/network/axe в lane evidence, passed/failed шаги и handoff; не создавать итоговый docs/reports файл.

## 14. QG-SYNTH — единый вердикт (профиль: Quality Gate)

**Specs:** все затронутые contracts · **Пути:** E, только итоговый report · **Зависит от:** QG-LIVE,QG-FE-MANUAL.

- [x] QG-SYNTH.1 Свести findings всех lanes с классами blocking/minor/pre-existing/blocked-env/waived и ownership, сверить отсутствие пропущенного обязательного lane.
- [x] QG-SYNTH.2 Проверить трассировку UT/IT/FT/SM/M IDs на evidence, SQL/N+1 и anonymous/authenticated outcomes; непроверенное не объявлять PASS.
- [x] QG-SYNTH.3 Передать fixes Router по владельцам при необходимости; проверить evidence повторного прогона теми же lanes, waiver принимать только явно от пользователя.
- [x] QG-SYNTH.4 Создать единственный `docs/reports/seo-queries-metrics.md` с разделами lanes/покрытие/результаты/production limitation и итоговым APPROVED/APPROVED_WITH_WAIVER/REWORK/BLOCKED; проверить strict validation.
- [x] QG-SYNTH.V Вернуть Router финальный handoff/вердикт и ссылки, отметить только фактически завершённые IDs; не начинать release/sync/archive без следующего разрешённого этапа.

## SQ-FIX-1 — строгие wire-даты SEO (профиль: Backend)

**Finding:** QG-CONTRACTS C-01 · **Пути:** SEO query route/schemas и API regression tests · **Зависит от:** SQ-2.

- [x] SQ-FIX-1 Отклонять numeric/datetime значения date_from/date_to существующего GET `/api/search-queries`, сохраняя wire YYYY-MM-DD, selector-first 401 и Pages/resolver/peer без изменений; проверить API 400 до БД/peer, корректные парные даты и anonymous/authenticated outcomes, scoped format/lint/type/diff-check.

## Workflow follow-up

- После единого APPROVED либо явно согласованного APPROVED_WITH_WAIVER Router обрабатывает финализацию по актуальным правилам; изменение specs/tasks задним числом для сокрытия findings запрещено.
- Sync пяти delta specs штатным openspec-sync-specs, затем strict validation изменённых main specs/change и archive через openspec-archive-change только при разрешённой пользователем финализации. Эти шаги вне tracked implementation progress и не выполняются PLAN-1.
- Production release требует отдельного подтверждения внешней недоступности приватных peers и БД. Этот change не снимает network gate.
