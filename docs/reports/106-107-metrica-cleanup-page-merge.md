# Development Report: 106-107-metrica-cleanup-page-merge

**Профиль:** QG-FULL · **Lane:** QG-SYNTH · **Вердикт:** APPROVED_WITH_WAIVER
**Дата:** 2026-10-29 · **Sync/archive:** разрешены пользователем · **Release:** отдельные gates task-finalize · **Waiver:** предоставлен 2026-10-29.

## Ссылки и границы
- Change: [proposal](../../openspec/changes/archive/2026-10-29-106-107-metrica-cleanup-page-merge/proposal.md), [design / Test matrix](../../openspec/changes/archive/2026-10-29-106-107-metrica-cleanup-page-merge/design.md), [specs](../../openspec/changes/archive/2026-10-29-106-107-metrica-cleanup-page-merge/specs/), [tasks](../../openspec/changes/archive/2026-10-29-106-107-metrica-cleanup-page-merge/tasks.md).
- Далее `E` означает `.qa/106-107-metrica-cleanup-page-merge/`; пути evidence относительно корня репозитория. Предпосылки approval/завершения предыдущей задачи/сверки 105 подтверждены QG-ENV.1 и переданным Router контекстом. Это не approval итоговой приёмки.
- SYNTH использовал готовые handoffs/coverage; **новые тесты, browser/review, исправления продукта и окружения не выполнялись**. Исполнены только status/strict validation и сериализация документов.
- Реализованы lifecycle DELETE/outbox, приоритет cleanup > merge > parse, bounded cleanup/merge, SEO revision/result/finalized barriers и desktop countdown-подтверждения. Исправлены найденные wire/topology/storage/DTO нарушения; account Escape остаётся красным.
- Ветка рабочего корня `main`; специальная рекомендуемая ветка в прочитанном Execution units не задана. Отдельный md-файл исходной задачи не передан.

## Итог и открытые findings
1. **MAN-FOCUS-02 — UNRESOLVED, приёмка требует доработки.** На свежем FIX-F-02 bundle: account icon → Space → Escape закрывает и confirmation, и wizard (0 диалогов вместо 1), возврат фокуса невозможен. `E/QG-FE-MANUAL/final-recheck/handoff.md`, `report.json`, `F01-exact-A04-account-child-escape-focus-trace.zip`. Причина окончательно не локализована; новая регрессия относительно baseline не утверждается, но обязательная приёмка не пройдена.
2. **Pending acceptance неполон:** F02 сохранил оба диалога по Escape, затем disabled assertion упал; остальные проверки case не достигнуты. Ни полный PASS, ни повтор прежнего pending-дефекта не заявляются.
3. **Обязательные coverage gaps:** SM-D-01/02, SM-N-02/03 и MANUAL-B частичны. Это не новые доказанные дефекты реализации; они отдельно препятствуют общему APPROVED.

## Lanes и evidence
| Lane | Статус | Основание (внутри E) |
|---|---|---|
| QG-ENV | пройден | `QG-ENV/handoff.md`, верхняя rollout-актуализация; прежний blocked статус исторический |
| QG-BE-Y | пройден после targeted fixes, minor | `QG-BE-Y/handoff.md`, последний раздел; Y-B01/Y-M01/README resolved |
| QG-BE-M | пройден аудит и targeted recheck | `QG-BE-M/handoff.md`, `recheck-FIX-M-01/handoff.md`; M-01..04 resolved, не новый full-suite PASS |
| QG-BE-S | пройден после targeted fixes | `QG-BE-S/handoff.md`, `recheck-FIX-S-01/handoff.md`; S-BLOCK-01 resolved |
| QG-FE-AUTO | пройден с оговоркой актуальности | `QG-FE-AUTO/handoff.md`; полный suite до последующих UI fixes, затем targeted verification |
| QG-CONTRACTS | пройден | `QG-CONTRACTS/recheck-b/handoff.md`, `crossflow-summary.json`; C-01..03 resolved, C-04 coverage PASS |
| QG-LIVE | findings: обязательное покрытие частично | `QG-LIVE/recheck-FIX-LIVE-01/handoff.md`, `coverage-summary-abc-updated.json`; LIVE-C01 resolved |
| QG-FE-MANUAL | findings: REWORK, покрытие частично | `QG-FE-MANUAL/final-recheck/handoff.md`, `report.json`; MAN-A11Y-01 resolved, MAN-FOCUS-02 unresolved |
| QG-FORMAT | неприменимо отдельным unit | Scoped format/lint внутри соответствующих lanes |
| QG-SYNTH | завершён синтез; устранение blocker открыто | `QG-SYNTH/task-serialization.json`, `openspec-*.log` |

## Окружение
Рабочие heads Y=`9e106a107001`, M/S=`20261102_0004`; backfill проверен, active legacy=0. Свежие API/worker images, flags ON, три M pong, SEO heartbeat, HTTP health 200. Семь durables: filters/explicit ACK/waiters проверены; это readiness, не business acceptance. Router после ENV пересоздал beat/scheduler; поздний LIVE recheck подтвердил healthy runtime. Evidence: `E/QG-ENV/rollout-{verification,nats,status}.json`, `E/QG-LIVE/recheck-FIX-LIVE-01/status*.json`.
ENV: одна repair-попытка rebuild Y, затем согласованный rollout Router; SYNTH repair attempts=0. Registry/Compose limitations обойдены штатным service Compose, tooling не исправлялся. SEO flake8 AF_UNIX path too long обойдён `--jobs 1`, PASS. DEPLOY-CONFIG-1: DNS/peer URLs/flags проверены, секреты неизменны. Maintenance window/test-only teardown/owned synthetic fixtures разрешены; резервные копии трёх БД получены с mode 0600 по handoff Router.

## Unit / Integration тесты
Все числа ниже — результаты соответствующих исполненных раундов, **не суммируются в число уникальных тестов**.
| Проверка | Фактический результат |
|---|---|
| Y `make lint test test-infra` | lint PASS; full 808 passed, 2 xfailed; infra сначала 22 passed/1 failed; owner после FIX-Y-01 26 passed; QG targeted 4 passed + 1 real NATS→PG inbox replay PASS |
| M `make lint test test-infra`, дополнительные PG | lint PASS; full 1366 passed/129 skipped; infra **88 passed/1 failed**, отдельный PG **127 passed/3 failed** до fixes. Все связанные findings resolved targeted: 49 unit + 77 real PG, 0 skips; нового полного прогона после fixes нет |
| S `make lint test test-infra` | lint PASS; full 1275 passed/1 skipped; infra 94 passed до fix; targeted 155 unit + 4 PG, 6 identity + 10 timestamp negatives TERM без storage |
| CONTRACTS initial | три AsyncAPI: каждый 0 errors/0 warnings; шесть mirrors совпали; 1445 unit/access regression passed. Прежний Y broker 1 failed/1 passed сохранён, C-03 resolved последующим recheck |
| CONTRACTS recheck-b | 216 unit + 58 infrastructure passed; 49 service-isolated real PG/NATS шагов одного crossflow, не 49 тестов; все четыре result/finalized направления, physical delete до release barrier, early cleanup, restart/replay после реальных 121s при window120; cleanup PASS |

Пропуски обычных suites не считаются инфраструктурным PASS: acceptance опирается на отдельные реальные PG/NATS проверки. Первичные FAIL сохранены в исходных lane логах; targeted fixes закрывают конкретные findings, а не заменяют историю зелёным full-suite результатом.

## Frontend test gate
- `npm test`: первоначально 1556 passed/5 timeout; полный `npm test -- --maxWorkers=2`: **1561/1561 passed**, timeout/config не ослаблялись.
- `npm run lint`: 0 errors/438 warnings; `npx --no-install tsc --noEmit`, `npm run typecheck`, `npm run build`: PASS на QG-FE-AUTO snapshot.
- FE-01..12/self-check/test quality: fake timers 4999/5000, Enter/entity reset, pending/double-submit, MSW error/401/403/404, guards/revoke, selection/offset проверены; transport mocks не выданы за live. Review слоёв и отсутствие consumer mixing подтверждены lane.
- После FIX-F-01/F-02: owner targeted 84/91 tests и lint/typecheck PASS; полный suite заново не выполнялся. Router сообщил успешный rebuild; browser доказал свежесть bundle. Эти результаты **не доказывают Escape acceptance**.
- Browser только **1366×768**, `http://localhost:3001/seo`; route fixtures, не business LIVE. Ранний manual 22/26; финальный targeted **1/3 PASS**, report.status=REWORK; exit0 runner не означает успешный gate.
- MAN-A11Y-01 resolved: counter/account именованные focusable scroll regions, keyboard/geometry; counter focus PASS. Финальная визуальная инспекция lane: F01 wizard отсутствует, F02 оба диалога/ошибка читаемы; footer не перекрыт, outline виден.
- Evidence: `E/QG-FE-MANUAL/final-recheck/{report.json,failed-F01-exact-A04-account-child-escape-focus.png,failed-F02-exact-A05-account-pending-Escape.png}`, F01/F02/F03 traces; предыдущие screenshot/axe/keyboard в `recheck-FIX-F-01/` и исходном handoff.
- Финальный recheck: 2 ожидаемых controlled400, page errors/network failures/HTTP5xx=0; прежний contrast остаётся. Первичные React #31/controlled5xx/refresh aborts не объявляются clean и не стираются последним узким прогоном. SYNTH изображения повторно не инспектировал.

## Покрытие по Test matrix
| ID | Evidence → фактический сценарий → task | Статус / границы |
|---|---|---|
| UT-D-01..04 | BE-Y lifecycle/outbox/completed + BE-M cleanup → QG-BE-Y.4/M.4 | покрыто, fixes targeted resolved |
| UT-D-05..06 | BE-M parse recovery/write gate/priority unit и реальные PG → M-1.4/M-2.5 | покрыто на unit/storage уровне, не полный vendor LIVE |
| UT-D-07 | CONTRACTS unit-y/access-backend + FE MSW → QG-CONTRACTS.5/FE-AUTO.2 | unit/peer/gateway покрыто; live matrix отдельно частична |
| IT-D-01 | BE-Y lifecycle/outbox real PG → QG-BE-Y.2/.4, Y-2.V | покрыто |
| IT-D-02 | BE-M cleanup batch/worker/write gate real PG + FIX-M-01 → M-3.3/.7 | покрыто; исходные FAIL resolved targeted |
| UT-N-01..07 | BE-M/BE-S normalization, aggregation, identity, access; CONTRACTS → QG-BE-M/S.4 | покрыто по handoffs, S-BLOCK-01/C-01 resolved |
| IT-N-01 | BE-S real PG revision/scan/finalization → S-1.6/S-2.7/S-3.6 | покрыто |
| IT-N-02 | BE-M real PG merge/checkpoint/overflow и fresh reconcile component → M-4.2/.6 | покрыто; не полный provider→ingest LIVE |
| IT-N-03 | CONTRACTS recheck-b canonical topology, all directions, restart/replay120s → QG-CONTRACTS.3/.4 | покрыто реальными broker+PG |
| SM-D-01 | LIVE a/c DELETE обоих путей/batches, controlled drain/rebind/late replay | **PARTIAL**: полного vendor-running parse нет |
| SM-D-02 | LIVE a 93/93 HTTP и targeted parse auth/selector | **PARTIAL**: не все paired role/peer/foreign комбинации |
| SM-N-01 | LIVE b query/hash, 5 сумм/ratios, source/result/finalized, PATCH/DELETE → QG-LIVE.4 частично | PASS данного сценария, не всего task |
| SM-N-02 | LIVE a/c delete preemption, storage drain/queued cancel/rebind | **PARTIAL**: actual parse↔merge admissions/new merge during cleanup не проверены |
| SM-N-03 | LIVE b + FIX-LIVE-01 real peer/gateway202, 3 durable pending intents до cleanup delivery | **PARTIAL**: остальные access/hash/foreign combinations не исчерпаны |
| FE-01..12 | FE-AUTO mocks/component/API → F-1.1..6 | покрыто автоматикой; не browser acceptance |
| Manual 1–5 / F-1.7 | route-fixture flows + final recheck | **PARTIAL/REWORK**, MAN-FOCUS-02, pending case неполон |
| Manual 6–7, реальные роли/revoke/bound interleaving | MANUAL-B | **НЕ ПРОВЕРЕНО**; LIVE/component не подменяет UI |
| Manual 8 | screenshot/console/network/axe и визуальная инспекция → QG-FE-MANUAL.5 | фиксация evidence выполнена, не зелёный gate |

## SMOKE и Access verification results
- LIVE a: 93/93 HTTP совпадений; b: 9/9; FIX-LIVE-01: 12/12, включая setup. c: controlled storage drain/rollback/queued cancel/rebind/late replay PASS. Это HTTP/component результаты, не 100% сценариев SM.
- Время **каждого endpoint/mode/status** сохранено в `E/QG-LIVE/endpoint-timings.json`, `b/endpoint-timings.json`, `c/http-summary.json`, `recheck-FIX-LIVE-01/endpoint-timings.json`; не заменяется выдуманными timings. Из c: 6 acceptance requests 27.15–144.92ms; компактная выборка без body: `E/QG-SYNTH/c-http-summary-timings.json`.
- Public consumer GET не менялся; нового Public Read endpoint нет. Gateway protected write: проверенные anonymous401/ADMIN-only403/SEO success; foreign outcomes проверены в части a/b. Sensitive/internal peer exception сверялся с matrix; selector missing/invalid401. Targeted Y GET200 с тремя lifecycle полями, SEO peer POST202 без/с Cookie+Bearer, gateway202, absent binding400; 202 не completed parse.
- Full anonymous/authenticated/SEO+ADMIN/foreign/peer matrix **не объявляется PASS**: часть combinations не исполнена live. MSW permissions/real auth/tenant isolation не взаимозаменяемы.
- Остаток LIVE: нет разрешённых synthetic vendor OAuth для полного fresh/running provider→ingest/checkpoint/finalize; actual crash после provider page/late ingest/expired lease, HTTP commit-failure400, parse↔merge races не выполнены. Storage rollback/fences и production prepare/upsert/reconcile component PASS не закрывают эти пробелы.
- Все owned LIVE/CONTRACTS fixture cleanup PASS; manual не создавал DB fixtures, route contexts закрыты. Чужие OAuth/данные не использовались; shared streams не purge/delete. Полный vendor parse ограничен внешним prerequisite, MANUAL-B — coverage gap, не доказанный env outage.

## Minor / Pre-existing / внешние ограничения
- Доказанные pre-existing Y strict xfails GAP-OAUTH-01/GAP-MET-01: `E/QG-BE-Y/baseline-xfail.txt`; не блокируют change. Предложение отдельной задачи `docs/tasks/yandex-existing-xfails.md` (не создавалась).
- MAN-VALIDATION-03: array detail → React error page; неизменённый тракт найден, **baseline browser не воспроизведён**, поэтому только pre-existing candidate, не PASS и не доказанная новая регрессия. Пользователь согласовал не расширять scope на validation arrays; это не waiver приёмки. Предложение отдельного triage в `docs/tasks/seo-validation-array-triage.md`.
- Global contrast — baseline candidate; прежний refresh retry и localhost/CORS workaround вне scope. Не чинить shared theme/API client в этом change. Y `.env.example:21` устаревший комментарий — minor. FE max-lines/438 warnings и первоначальные timeouts сохранены; нагрузочная причина не доказана.
- Merge 1101 mapping при 1/tick30s ≈9.2h — наблюдение, не SLA blocker без требования; отдельная performance triage при необходимости.

## Изменённые файлы и фактические отметки
Продуктовые зоны: `services/{yandex-service,ya-metrica-service,seo-service}/` (domain/storage/migrations/transport/tests/README/AsyncAPI), `services/frontend/src/features/seo/{ui,hooks}/`, `services/frontend/src/api/yandex.test.ts`, сервисные Compose. Список файлов из сохранённых lane diffs: `E/QG-SYNTH/changed-files-from-lane-evidence.txt` (87 путей). Это **snapshot-инвентарь, не гарантированно полный shipctl manifest после owner commits**; release-base diff должен определить Router при разрешённой финализации. SYNTH release plan не выполнял.
SYNTH изменил только этот отчёт, `openspec/changes/106-107-metrica-cleanup-page-merge/tasks.md` и ignored `E/QG-SYNTH/`. Сериализация: `task-serialization.json`; проверенные BE/FE-AUTO/CONTRACTS audits отмечены, родительская manual/live приёмка не повышена из partial. FIX-F-01/F-02 вновь открыты из-за составного unresolved Escape требования; component implementation evidence сохранено. M-4.7/.V консервативно открыты, нового полного PASS после fixes нет. QG-SYNTH.2 открыт до устранения blocker.

## Waivers и решение пользователя
2026-10-29 пользователь явно подтвердил: **«Принимаю риски из отчёта, архивируй»**.

**Waived by user:** MAN-FOCUS-02 (Space → Escape закрывает wizard вместе с confirmation), неполная pending acceptance, все перечисленные в отчёте LIVE/MANUAL coverage gaps (включая внешний OAuth parse, crash/HTTP failure/races, неполную access matrix и MANUAL-B), а также остальные зафиксированные minor/непроверенные риски отчёта. Findings остаются технически неустранёнными, непроверенные сценарии не становятся PASS. Исторический вердикт SYNTH — REWORK; текущее решение после waiver — **APPROVED_WITH_WAIVER**.

Sync/archive и последующая штатная финализация разрешены. Новые исправления и QA units не требуются. Невыполненные checkbox сохраняют фактический статус; архивирование выполняется с принятыми рисками. Waiver не разрешает вывод секретов или дополнительные деструктивные операции с данными.

## OpenSpec validation
Launcher `.cache/openspec-tool/1.14.3/openspec-local`: `status --change 106-107-metrica-cleanup-page-merge` → exit0, 4/4 planning artifacts; `validate 106-107-metrica-cleanup-page-merge --strict` → exit0, valid. Логи: `E/QG-SYNTH/openspec-status.log`, `openspec-validate-strict.log`. **Валидность артефактов не равна завершению tasks или approval продукта. Текущий итог после явного waiver — APPROVED_WITH_WAIVER.**

## Архивация после waiver
2026-10-29: девять delta specs синхронизированы (14 добавлений, 13 изменений требований); change архивирован в `openspec/changes/archive/2026-10-29-106-107-metrica-cleanup-page-merge/`. По отдельному разрешению пользователя два справочных заголовка main `yandex-metrica-gateway` нормализованы без изменения текста. Общая `validate --all --strict`: 47 passed / 65 failed; среди затронутых specs `metrica-parse-queue` содержит предупреждения о длине существующих requirement blocks. Глобальную нормализацию чужих specs в scope не включали. Успешная архивация не означает глобальный strict PASS.
