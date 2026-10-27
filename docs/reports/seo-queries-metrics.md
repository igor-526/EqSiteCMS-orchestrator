# Quality Gate: seo-queries-metrics

**Профиль: QG-FULL · Вердикт: APPROVED (функциональный QG, не production release).**
**Дата:** 2026-10-27. **Текущая ветка:** `main`; отдельная конвенция ветки в переданном design не задана.

## Контекст и ссылки

Метрики запросов: SQL-агрегация/ранжирование Метрики, композиция SEO, ADMIN gateway и CMS с общими renderer/period controls, server sorting и pagination. Новых write endpoints, миграций и messaging diff нет.
- [Change/proposal](../../openspec/changes/seo-queries-metrics/proposal.md), [design/test matrix](../../openspec/changes/seo-queries-metrics/design.md#test-matrix), [пять delta specs](../../openspec/changes/seo-queries-metrics/specs/), [tasks](../../openspec/changes/seo-queries-metrics/tasks.md).
- Исходная [задача 103](../tasks/103_metrics_queries.md) не редактировалась SYNTH. Основание проверки — назначение Router: implementation и обязательные lanes завершены. Отдельного артефакта/цитаты пользовательского implementation approval в переданных индексах нет; этот отчёт не заменяет approval и не разрешает release/sync/archive.
- Дальнейшие пути evidence указаны от корня репозитория; префикс **E** = `.qa/seo-queries-metrics/`.
- Проверка наличия источников и SHA256: `E/QG-SYNTH/evidence-index.json`. Полный список путей change от корня для `shipctl plan`: `E/QG-SYNTH/changed-paths.txt` (66 сервисных файлов из CONTRACTS + root/OpenSpec/report; посторонние dirty-файлы исключены).
- SYNTH изменил только этот отчёт и свои checkbox в tasks; проверки других lanes не повторял.

## Lanes

| Lane | Статус / evidence под E |
|---|---|
| QG-ENV | Пройден; `QG-ENV/handoff.md`, `readiness-summary.json`, `status-after.json`, `timezone-schema-readiness.json` |
| QG-BE | Пройден в scope; `QG-BE/handoff.md`; два внешних suite failure не скрыты |
| QG-FE-AUTO | Пройден после FE-FIX-1; `QG-FE-AUTO/handoff.md`, `coverage.json`, `recheck-full.log` |
| QG-CONTRACTS | Пройден после SQ-FIX-1; `QG-CONTRACTS/handoff.md`, `c01-recheck.log` |
| QG-LIVE | Пройден для изменённого read-flow; второстепенные ограничения регрессии ниже; `QG-LIVE/handoff.md`, `coverage.json` |
| QG-FE-MANUAL | Пройден, 23/23 Chromium, только 1366×768; `QG-FE-MANUAL/handoff.md`, `final-report.json` |
| QG-FORMAT | Встроен в BE/FE-AUTO; отдельный агент не требуется |
| QG-SYNTH | Сведение/трассировка/strict validation выполнены; обязательные lanes не пропущены |

ENV: четыре приложения rebuilt/running, три API healthy, frontend HTTP 200; три DB SELECT/schema/UTC проверены, миграции не выполнялись. Combined ready был прерван: его успех не заявляется, backend подтверждён отдельно. SEO — штатный Compose fallback; один ремонт binding Метрики к исходному порту, продолжение frontend readiness отдельно (не дополнительный ремонт); registry не менялся. Финальные семь bindings исходные. В SYNTH repair attempts=0; в BE/FE/LIVE/browser также 0.

## Unit / integration и Frontend test gate

| Команда / сервис | Результат и evidence под E |
|---|---|
| `make lint`, три Python-сервиса | 3/3 успешно; `QG-BE/*-lint.log` |
| `make test`, ya-metrica-service | 1050 passed, включая PostgreSQL query/pages; `QG-BE/ya-metrica-service-test.log` |
| `make test`, seo-service | 690 passed, 1 skipped, 52 deselected; `QG-BE/seo-service-test.log` |
| `make test`, backend | 1995 passed, 5 skipped, **2 pre-existing failed**; `QG-BE/backend-test.log`; suite целиком не назван зелёным |
| Backend scoped pytest / SEO PostgreSQL | 297 / 45 passed; `QG-BE/backend-targeted.log`, `seo-postgres.log` |
| `npm test` из services/frontend | Штатный финальный прогон **1167/1167, 97 файлов**, без overrides; `QG-FE-AUTO/recheck-full.log` |
| `npm run lint` / `npx --no-install tsc --noEmit` / `npm run build` | Exit 0; 435 внешних lint warnings; `QG-FE-AUTO/{lint,typecheck,build}.log`; tsc использует установленный компилятор |
| Scoped format/self-check/test-quality | Ruff/layout dry-run без оставшихся новых дефектов; FE 16 файлов без warnings. Assertions, MSW, границы API, no site-* mixing, no live unit backend проверены; `QG-FE-AUTO/review.md`, `self-check-full.log`, `recheck-results.txt` |
| C-01 targeted recheck | 68 passed, 1 прежний skipped; строгие wire YYYY-MM-DD, 400 до repo/peer и selector-first 401; `QG-CONTRACTS/c01-recheck.log` |

Build не повторялся после FE-FIX-1: изменились только tests/tasks. Новые tests не ослабляли timeout/assertions; FE-B1 закрыт независимым штатным suite. Числовое coverage/fail_under не измерялось и не утверждается.

## Покрытие test matrix

| ID | Фактический сценарий / evidence под E |
|---|---|
| UT-MQ-01, UT-MQ-05 | `tests/unit/test_search_query_stats_query_service.py`, `tests/api/test_search_query_stats_api.py`: validation до SQL, access/error pairs; `QG-BE/ya-metrica-service-test.log` |
| IT-MQ-02..04 | `tests/integration/test_search_query_stats_query_postgres.py`: weighted/large/zero/sparse, tenant/tasks/dates, numeric rank/ties/100×31/1 SQL; тот же лог |
| UT-SQ-01..03 | service/period/builder/client/API tests: 4 modes×8 metrics, boundaries, DTO, safe errors; `QG-BE/seo-service-test.log`; wire-date дополнен C-01 recheck |
| IT-SQ-04, UT-SQ-05 | `test_search_query_metrics_postgres.py`, `test_search_query_service_postgres.py`, repository tests: global sort/search/count/offset, N+1/fallback; `QG-BE/seo-postgres.log`, `seo-postgres-sql.log` |
| UT-SQ-06 | `test_query_metrics_api.py`: selector-first/credentials ignored; `QG-BE/seo-service-test.log` и C-01 recheck |
| UT-GW-01..02 | `test_seo_proxy_api.py`, `test_seo_client_boundary.py`, `test_seo_proxy_service.py`: ADMIN/actor tenant, DTO/forwarding/error; `QG-BE/backend-targeted.log` |
| UT-REG-01 | 44 Pages PostgreSQL Метрики + SQL equality, SEO existing pages/period/builder/normalizers/entity tests, backend Pages boundary; `QG-BE/handoff.md` содержит точную трассировку |
| FT-QM-01..03 | API/service/hook tests: params/DTO/errors, debounce/reset, modes/period; `QG-FE-AUTO/review.md`, `coverage.json`, `recheck-full.log` |
| FT-QM-04..07 | Hook/paginator: 25/0, offset, size/filter/reset-one-request; те же источники |
| FT-QM-08..10 | Panel/renderer/SeoPage: states/callbacks, scope/races, Pages/normalization/layers; те же источники |
| SM-QM-01..02 | A1–A5 HTTP/access/tenant и отказ до I/O; `QG-LIVE/api-results.json`, `live-b/api-results.json`, `live-c/results.json` |
| SM-QM-03..04 | 8 metrics×4 modes, 31464 cells, clamp, global order/search/ties/NULLS LAST; `QG-LIVE/live-b/{api-results,observations}.json` |
| SM-QM-05 | 5/50/100 ×1/31 ×default/metric±, empty/outside-period; `QG-LIVE/live-c/counts.md`, `results.json`, `explain.json` |
| SM-QM-06 | Настоящий 503/ReadTimeout→safe502/rollback/recovery200; ограниченная Pages/normalization регрессия; `QG-LIVE/live-d/{checks.md,results.json}` |
| M-QM-01..03 | Anonymous/non-admin/ADMIN, defaults/periods/8 metrics/clamp; `QG-FE-MANUAL/final-report.json`, `handoff.md` |
| M-QM-04..07 | Real sticky/body scroll, literal search/global pagination, reset/races, keyboard/error/retry; те же источники + `recheck-report.json` |
| M-QM-08 | Pages/normalization modal, live ADD; **DELETE только route injection**, правило сохранено реальным GET; те же источники |

Полностью непокрытых ID нет; **SM-QM-06 и M-QM-08 не являются полным live acceptance прежних mutations**. Непустые Pages не проверены именно в LIVE failure dataset; это не отменяет отдельные PostgreSQL/page regression suites и browser Pages. Успешный normalization resolve и настоящий DELETE не проверены. Новых mutations нет, parsing/normalization не изменялись; эти пробелы — **minor SYNTH-M1**, второстепенная регрессия, а не непроверенный новый access/error/SQL контракт. Никакого waiver или PASS непроверенным веткам не присваивается.

## Access verification results

- A1 backend: anonymous/invalid cookie **401**, authenticated без точного ADMIN (включая SUPERUSER/DEVELOPER) **403**, ADMIN **200**; actor tenant only, spoof query/header не влияет, credential headers downstream не уходят.
- A2/A3 SEO: selector valid **200** с/без credentials; missing/empty/invalid **401** до session/SQL/peer, invalid query **400**. Selector — non-secret identity hint, не замена сетевой изоляции.
- A4/A5 M5/M6: anonymous/Cookie/Bearer дают одинаковые **200**, missing/invalid resource/validation/DB error — sanitized **400**; resource UUID в query, не из header. Эти public peer GET — явные network-trusted exceptions, не публичный gateway ADMIN bypass.
- 16 реальных отказов измерены до downstream (0 SEO/M SQL и peer calls); auth SQL backend учтён отдельно. FE guards present/missing/revoked, 401/403 и отсутствие query writes подтверждены automated/browser. Новые Protected Write — неприменимо; старый normalization DELETE подтверждён только в UI injection.

## SMOKE и SQL evidence

LIVE-A/B/C/D: **498/498 уникальных assertions**, 474 primary HTTP; не сумма повторных прогонов, browser отдельно. Настоящие HTTP/PostgreSQL через api-smoke-test, не ASGI/pytest smoke. LIVE-C/D — изолированные процессы в существующих контейнерах; backend lifespan off для исключения registry/NATS writes, SEO/Метрика lifespan штатный. Shared runtime не подменён.

| GET endpoint / сценарий | HTTP / время | Evidence под E |
|---|---|---|
| `/api/seo/search-queries`, сетка 18 комбинаций | 200; **99.250–332.508 ms** | `QG-LIVE/live-c/counts.md` — каждая комбинация отдельно |
| `/api/search-queries`, ranked baseline | 200; **83.974 ms** | `QG-LIVE/live-d/results.json`, наблюдение SEO 82.916 ms |
| `/api/metrica/search-query-stats/table` / `ranking`, тот же baseline | 200; **31.388 / 26.071 ms** | Там же, измерения внутренних HTTP запросов Метрики |
| M5/M6 timeout через SEO/backend | 502; **4008.096–4036.663 ms** | `QG-LIVE/live-d/checks.md`, все failure/recovery времена по строкам |
| Восстановление запросов | 200; **43.001–102.045 ms** | Там же; полное равенство исходных тел |

SEO=2 прикладных SELECT, M5=1 при непустых rows, M6=1 при in-period ranking, ≤2 peer calls; empty без M5, outside-period без M6. 4 EXPLAIN, bound arrays, ranking 107 UUID/~4.2KB; не нагрузочный benchmark/гарантия произвольного tenant. M5 failure — физический rollback; M6 failure до SQL, rollback не заявляется. После проверки процессы/listeners завершены, DB logging/settings и семь shared bindings/environment точно восстановлены/неизменны (`QG-LIVE/live-d/restoration.json`).

## Browser evidence

`E/QG-FE-MANUAL/final-report.json`: 23/23, M01..08 в обозначенных границах; 11 просмотренных изображений с SHA в `visualInspection` (screenshots в этом же lane), актуальная геометрия в `recheck-report.json`. Реальные fixed cells, body scroll 100×31, document=768/scrollY=0, controls без overlap; не jsdom геометрия. `console.json`, `network.json`, `axe.json`: page errors/failed requests=0, неожиданных ошибок нет; восемь ожидаемых console resource errors от 401/инъецированных ответов не скрыты. Trace не сохранялся из-за отсутствия актуальных failed scenarios и защиты session data.

## Findings, pre-existing и waivers

- **Закрыты теми же lanes, один раунд:** blocking C-01→SQ-FIX-1 (`QG-CONTRACTS/c01-recheck.log`); blocking FE-B1→FE-FIX-1 (`QG-FE-AUTO/recheck-full.log`); minor BE-M1→GW-FIX-1 (`QG-BE/BE-M1-recheck.txt`, AST-identical). Новых product blocking findings нет; новых fixes не требуется.
- **Открыт minor SYNTH-M1:** границы regression live DELETE/resolve/непустые Pages выше; ownership последующей приёмки — Router→QG-LIVE/QG-FE-MANUAL после согласования destructive scope. Для изменённого read-flow критичные оси покрыты.
- **Pre-existing BE-P1:** два standalone discovery tests backend; helper из HEAD воспроизводит workspace ancestor под `.qa`, `QG-BE/backend-pre-existing-reproduction.json`. BE-P2: прежние pytest warnings Метрики; старые full-file inventory formatting вне SEO блока не исправлялись.
- **Pre-existing FE/browser:** 435 lint warnings вне scope; axe contrast header/active AntD tab воспроизведён на неизменённой Pages. Notifications timeout — вне графа импортов change, отдельный suite 11/11 passed; baseline failure без change не заявляется (`QG-FE-AUTO/recheck-notifications-isolation.json`).
- **Blocked-env:** ENV tooling limitations обойдены штатно; открытых ключевых environment blockers нет. Отсутствующий rg заменён grep/find, инструменты не ремонтировались.
- Router рекомендуется предложить отдельные задачи в `docs/tasks` по discovery temp-path, внешней test timing fragility/lint/axe и сетевой изоляции; здесь они не создавались.
- **Waivers: нет.** Пользователь риск не принимал; `APPROVED_WITH_WAIVER` не используется.

## Production limitation и cleanup

**Production release запрещён до отдельного доказательства внешней недоступности приватных peers и DB.** Bindings 0.0.0.0/:: унаследованы, внешняя изоляция не доказана и не waived. Это отдельный pre-existing release gate, не functional QG blocker; ни успешный smoke, ни APPROVED его не снимают.

**Cleanup pending, не выполнен:** `E/QG-LIVE/fixture-manifest.json` — 3229 сохранённых rows; `E/QG-FE-MANUAL/fixtures.json` — 2 tenants, 13 users (со scope relations), 105 queries, 2 pages, 103 stats, 2 normalization rules; BE test schemas сохранены с TEST_KEEP_SCHEMA=1, evidence в `QG-BE/handoff.md`. ENV только зарезервировал UUID. Никаких DELETE/DROP/reset/purge/volume операций и удаления fixtures SYNTH не выполнял. Checkbox LIVE.5 не означает выполненную destructive часть. Нужны отдельное согласие пользователя и точный manifest scope.

## Итоговая validation

`/srv/eqSiteCMS/.cache/openspec-tool/1.14.3/openspec-local status --change seo-queries-metrics --json` и `validate seo-queries-metrics --type change --strict` → exit 0, **valid**; `E/QG-SYNTH/{openspec-status.json,strictvalidation.log}`. Это validation артефактов, не production readiness. SYNTH.1/.2/.3/.4/.V завершены; sync/archive/release не выполнялись.
