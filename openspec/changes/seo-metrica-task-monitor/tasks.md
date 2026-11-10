# Tasks — seo-metrica-task-monitor

Единственный изменяемый checklist реализации; deliverables A–E и точные ownership closure, DAG, test matrix, prerequisites и UI QA находятся в `design.md`. Реализацию начинать только после явного approval пользователя; отмечать только фактически выполненные пункты своего unit, evidence — `.qa/seo-metrica-task-monitor/`.

## Execution units

Пути указаны от корня; `design.md` и `specs/...` — относительно данного change. Каждому unit обязательно передаётся handoff predecessor, а не весь diff.

| Unit | Профиль | Deliverable / Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| T-1 | Backend | D: scripts/qa/infra/{contracts.py,manifest.schema.json,permit.schema.json,README.md}, scripts/tests/test_qa_infra.py | approval | offline TOOL-UT, scoped static | design §5/registry; specs/agent-acceptance-tooling/spec.md; contracts.py, обе schemas, offline tests |
| M-1 | Backend | A: ya-metrica src/core/entities/metrica_task_list.py, core/protocols/repositories/metrica_task_list.py, repositories/metrica_task_list_repository.py; tests/unit/test_metrica_task_list.py, tests/integration/test_metrica_task_list_postgres.py, dependent conftest | T-1 | targeted UT-M-01, real PG-01..04 с permit | design §1–2/PG matrix; specs/metrica-task-list/spec.md; src/models/metrica_{parse,maintenance}.py; tests/integration/conftest.py |
| M-2 | Backend | A: ya-metrica schemas/api/metrica_tasks.py, core/services/metrica_task_list_service.py, api/metrica_tasks.py, read wiring api/__init__.py/main.py/containers/application.py; tests/api/test_metrica_tasks_api.py, README | M-1 | UT-M-02; final-service Метрика | design §3/access; specs/metrica-task-list/spec.md; api/page_stats.py; containers/application.py; main.py |
| B-1 | Backend | B: backend src/api/seo.py, clients/ya_metrica_service/**, core/protocols/ya_metrica_service.py, core/services/metrica_tasks_proxy.py, depends/services.py, settings.py, .env.example/README; tests API/client/service, inventory source/generator/output/tests; SERVICES.md | M-2 | UT-GW, WIRE-01, final-service backend | design §3/access; specs/seo-backend-proxy/spec.md; api/seo.py; clients/seo_service/client.py; maintain/route_inventory.py |
| F-1 | Frontend | C: frontend src/types/api/seo.ts, api/seo{,.test}.ts, feature seo services/metricaTasksService*, hooks/useMetricaTasks*, hooks/useSeoScopes* | approval | FE-01..06/10 targeted Vitest/ESLint | design §4/FE matrix; specs/metrica-task-list/spec.md; hooks/useSeoScopes.ts; api/seo.ts; types/api/seo.ts |
| F-2 | Frontend | C: frontend feature seo ui/MetricaTasksModal*, MetricaConnectionCard*, SeoPage*, WebmasterStub.tsx, seoStyles.ts; hooks/useSeoParseRefresh* и зависимые UI tests | F-1, B-1 | FE-07..11; scoped browser; final-service frontend | design §4/UI QA; specs/cms-seo-{yandex-ui,parse-refresh-ui,data-ui}/spec.md; SeoPage.tsx; MetricaConnectionCard.tsx; useSeoParseRefresh.ts |
| QG-ENV | Quality Gate | E: .qa/<change>/QG-ENV/** | T-1,M-2,B-1,F-2 | prerequisites registry, ready/readiness | design acceptance prerequisites/PG; owner handoffs; scripts/qa/infra/README.md |
| QG-BE | Quality Gate | E: .qa/<change>/QG-BE/** | QG-ENV | independent Python gates/PG | design BE matrix; metrica-task-list/seo-backend-proxy specs; owner test handoffs |
| QG-FE-AUTO | Quality Gate | E: .qa/<change>/QG-FE-AUTO/** | QG-ENV | independent frontend gates | design FE matrix; cms deltas; F-1/F-2 handoffs; frontend Makefile/package.json |
| QG-CONTRACTS | Quality Gate | E: .qa/<change>/QG-CONTRACTS/** | QG-ENV | TOOL/WIRE/inventory/OpenSpec | design access/registry; specs agent-acceptance-tooling/metrica-task-list/seo-backend-proxy; T/M/B handoffs |
| QG-LIVE | Quality Gate | E: .qa/<change>/QG-LIVE/** | QG-BE,QG-FE-AUTO,QG-CONTRACTS | real PG HTTP SM-01..04 | design HTTP scenarios/access/prerequisites; ENV handoff; scripts/qa/infra/README.md |
| QG-FE-MANUAL | Quality Gate | E: .qa/<change>/QG-FE-MANUAL/** | QG-BE,QG-FE-AUTO,QG-CONTRACTS | UI-QA-01..08 | design Manual QA; F-2/FE-AUTO handoffs; agents/howto/browser-qa-protocol.md |
| QG-SYNTH | Quality Gate | E: docs/reports/seo-metrica-task-monitor.md, .qa/<change>/QG-SYNTH/** | QG-LIVE,QG-FE-MANUAL | finite evidence registry + strict validation | design registry/risks; lane handoffs, tasks.md |

## 1. T-1 — безопасная регистрация PG acceptance (профиль: Backend)

**Specs:** agent-acceptance-tooling · **Пути:** D из design · **Зависит от:** approval. Без DB/network/setup; не выдавать permit.

- [x] T-1.1 Добавить конечный per-change registry в contracts.py: сохранить прежний change; новый только ya-metrica-service/pg/test_metrica_task_list_postgres.py; проверить TOOL-02 на отказ arbitrary change/path/kind/service.
- [x] T-1.2 Согласовать manifest/permit JSON schemas с тем же конечным registry; offline test сверяет разрешённые change IDs и сохранение обязательных полей/expiry/scope.
- [x] T-1.3 Привязать evidence_dir к проверенному m.change, сохранить прежний путь старого change; offline test запрещает path traversal и чужой evidence root.
- [x] T-1.4 Расширить scripts/tests/test_qa_infra.py для TOOL-01/02, regression старого registry и всех permit guards; никакого real PG/NATS из offline suite.
- [x] T-1.5 Обновить infra README с exact registration/CLI, без credentials и claims runtime PASS; сверить команды со schema/run.py.
- [x] T-1.V Выполнить `python3 -m unittest discover -s scripts/tests -p test_qa_infra.py`, scoped static и diff-check; передать M-1 точный manifest contract, отметить реальные IDs и вернуть handoff Router.

## 2. M-1 — SQL read model и PostgreSQL семантика (профиль: Backend)

**Specs:** metrica-task-list · **Пути:** A, storage slice таблицы units · **Зависит от:** T-1.

- [x] M-1.1 Добавить независимые от инфраструктуры row/types/status contracts в core/entities и repository Protocol; проверить единый безопасный набор полей/enum через UT-M-01.
- [x] M-1.2 Реализовать tenant-scoped intent/run projection, stable identity и anti-join legacy runs в repository; PG-01 проверяет одну строку/total без N+1.
- [x] M-1.3 Реализовать SQL aggregation статусов parse и native maintenance mapping, включая awaiting_seo/failed_blocked/zero-task; UT-M-01 и PG-02 сверяют весь mapping delta.
- [x] M-1.4 Реализовать общий UNION/order/count/page consistent snapshot, пустой offset и read-only поведение; PG-02/03 проверяют порядок/снимок и отсутствие записи.
- [x] M-1.5 Добавить сгруппированные unit и real PG-01..04 tests с closure fixtures; cleanup history проверять реальным production cleanup в изолированной schema и новой session, не mock.
- [ ] M-1.6 Подготовить safe ignored manifest с четырьмя exact node IDs и finite evidence registry, проверить offline preflight после предоставления permit; missing target/permit — blocked, без discovery app secrets/setup fallback.
- [ ] M-1.V Прогнать targeted unit+scoped lint/Ruff check; PG-01..04 только через разрешённый runner на real PostgreSQL, без skip/нулевого selection. Вернуть результаты/blocked prerequisites/точные nodes Router, отметить только выполненное.

- [x] M-1-FIX-1 Устранить W503 в cleanup-history assertions `test_metrica_task_list_postgres.py`; exact canonical flake8 FAIL→PASS и scoped Ruff format-check/check, без PG/full suite.

## 3. M-2 — read API Метрики (профиль: Backend)

**Specs:** metrica-task-list · **Пути:** A, HTTP slice · **Зависит от:** M-1.

- [x] M-2.1 Добавить API DTO для items/total и limit/offset, сопоставить безопасный row contract; schema tests проверяют обязательные поля/валидные enum.
- [x] M-2.2 Добавить use case через repository Protocol без SQL/write/peer calls; targeted tests проверяют ответ/ошибки и отсутствие мутаций.
- [x] M-2.3 Добавить selector-first endpoint GET /api/metrica/tasks: missing/invalid UUID 401, только затем query 400; UT-M-02 проверяет приоритет и credentials ignored.
- [x] M-2.4 Зарегистрировать request-scoped read session/DI/router в containers/application.py/api/__init__.py/main.py; API test вызывает реальный зарегистрированный route без запуска внешнего lifespan.
- [x] M-2.5 Реализовать API tests UT-M-02 и безопасные error/response cases; anonymous и Cookie/Bearer, boundaries/empty и no storage до validation — обязательны.
- [x] M-2.6 Документировать API, статусы, tenant history и production isolation в README Метрики; подготовить production serialized DTO samples для WIRE-01 без секретов, сверить с delta.
- [ ] M-2.V Выполнить targeted API tests и final-service `make -C services/ya-metrica-service test`, `make -C services/ya-metrica-service lint`, canonical Ruff format-check/check по сервисной конфигурации без второго formatter; передать B-1 DTO/wiring handoff и отметить выполненные IDs.

## 4. B-1 — CMS gateway и контракт peer (профиль: Backend)

**Specs:** seo-backend-proxy · **Пути:** B из design · **Зависит от:** M-2.

- [x] B-1.1 Добавить отдельный core peer Protocol и DTO в clients/ya_metrica_service, совместимые с M-2; тесты reject invalid payload/enum/типов и private-field leakage.
- [x] B-1.2 Реализовать HTTP client GET /api/metrica/tasks с 4s timeout/trust_env=false/no retry и safe 502; UT-GW-02 проверяет транспорт, все неожиданные статусы/invalid JSON и отсутствие credential forwarding.
- [x] B-1.3 Добавить actor-bound use case и DI без зависимости seo-client от Метрики; unit tests проверяют selector только actor и отсутствие вызова seo-service.
- [x] B-1.4 Добавить YA_METRICA_SERVICE_URL в settings/.env.example/README и SERVICES.md; проверить default/constructor boundary, реальные env не менять.
- [x] B-1.5 Добавить route /api/seo/metrica/tasks с auth/SEO до query и строгим limit/offset; UT-GW-01 проверяет anonymous, SEO-only/SEO+ADMIN, все non-SEO роли, spoof selector и no downstream при отказе.
- [x] B-1.6 Обновить inventory source/generator output/tests для 12 SEO routes; inventory test должен подтверждать Protected GET exception нового route, без изменений policy прежних путей.
- [x] B-1.7 Реализовать/прогнать grouped UT-GW-01/02; покрыть safe error mapping и false-success отсутствие по design matrix.
- [x] B-1.8 Выполнить WIRE-01: production serializer Метрики → production parser backend в отдельных service lockfile environments, valid/invalid variants; safe artifacts сохранить только .qa/<change>/B-1/.
- [x] B-1.V Выполнить final-service backend `make test`/`make lint` (из services/backend; lint уже содержит Ruff format-check), без alias repeats; вернуть exact tests/wire evidence/inventory handoff Router, отметить выполненные IDs.

### B-1-FIX-1 — CONTRACTS-02 defensive wire validation

- [x] B-1-FIX-1.1 Отклонять numeric/bool/null/invalid/date-only/naive created_at в backend DTO как не-RFC3339 wire string; сохранить корректные aware строки, safe502 и no retry. Выполнить exact before→after, targeted schema/client/API checks, scoped lint и paired WIRE revalidation без изменения samples.

## 5. F-1 — DTO, boundary и hook списка (профиль: Frontend)

**Specs:** metrica-task-list, cms-seo-yandex-ui · **Пути:** C data/hooks slice · **Зависит от:** approval; runtime API не нужен.

- [x] F-1.1 Добавить DTO/query типов tasks в src/types/api/seo.ts, только limit/offset; type/API tests сверяют fields/type/status с delta и строковый id.
- [x] F-1.2 Добавить GET boundary /seo/metrica/tasks в src/api/seo.ts и MSW tests success/empty/400/401/403/502/network (FE-01), без прямого peer URL/live backend.
- [x] F-1.3 Добавить feature service metricaTasksService и безопасное mapping ошибок, ≥3 success/empty/error tests; private response fields не логировать.
- [x] F-1.4 Добавить SEO_ACTIONS.LIST_METRICA_TASKS и scope tests present/missing/no override; hook повторно проверяет разрешение, не только UI hidden.
- [x] F-1.5 Реализовать useMetricaTasks с open/binding inputs, limit/offset, total/loading/error/retry/manual reload и bounded correction offset; FE-02..05 проверяют initial/page/size/reset, никакого polling/resort.
- [x] F-1.6 Покрыть FE-05/06 stale answers/unmount/revoke/change binding, 401/403 и mutation guards без живой сети; передать F-2 interface hook и точные tests.
- [x] F-1.V Выполнить targeted Vitest по новым API/service/hooks/scopes tests и scoped ESLint, no-site/limit-offset self-check FE-10; отметить выполненные IDs и вернуть handoff, без полного suite/build на промежуточной границе.

## 6. F-2 — окно задач и перенос запуска (профиль: Frontend)

**Specs:** три cms delta · **Пути:** C UI/refresh slice · **Зависит от:** F-1,B-1.

**Принятый split:** predecessor F-2 partial выполнил F-2.3; F-2b — F-2.1/.2/.4/.5/.6/.7 и targeted FE-07..10; F-2c — F-2.8 и F-2.V (browser self-check и final-service). Ownership C дополнен разрешённым Router closure `services/frontend/src/ui/TablePaginator.tsx` и непосредственным `TablePaginator.test.tsx`: optional размеры 20/50/100, прежние defaults 10/25/50/100 и consumers сохраняются. Units последовательны; runtime/real mutations/PG без отдельного permit запрещены.

- [x] F-2.1 Добавить MetricaTasksModal с MainTable/TablePaginator, type/status/date, пояснением tenant history, loading/empty/error и «Обновить список»; FE-07 проверяет ≥5 состояний/callbacks и permission.
- [x] F-2.2 Добавить карточке «Яндекс.Метрика» кнопку «Задачи» только для действующей привязки/SEO, передать binding identity hook без повторного GET connection; card tests проверяют bound/null/error/loading.
- [x] F-2.3 Переименовать вкладку «Интеграции», удалить Webmaster item/import/неиспользуемый stub; SeoPage tests подтверждают три вкладки, default, keyboard/tab-panel и forbidden/no calls.
- [x] F-2.4 Убрать refresh/confirmation из header Страниц/Запросов/SeoPage orchestration, сохранив paginator/reset/normalization/metrics; FE-09 regression проверяет обе таблицы.
- [x] F-2.5 Перенести запуск через useSeoParseRefresh/общий ConfirmActionModal внутрь задач, callback после 202 → offset=0/один GET; FE-08 проверяет прежние guards/error, no table invalidation/no auto POST/no optimistic row и eventual notice.
- [x] F-2.6 Реализовать nested focus/keyboard/close/pending и stale-binding handling в feature hook/container; FE-08/11 проверяют Esc только верхнего окна, focus return и один POST при double submit, не ломая unlink 5s/danger.
- [x] F-2.7 Завершить scoped styles и grouped component/API tests FE-07..09: 1366×768, внутренняя прокрутка, длинные значения, read errors и POST 400/401/403/502/503/network; MSW only.
- [x] F-2d-FIX-1 Устранить `scrollable-region-focusable` нового окна: actual `.ant-table-body` — именованный Tab-stop с native keyboard-scroll и видимым focus; component regression и exact browser FAIL→PASS, impacted UI-QA-02/05/07. Разрешённый Router shared closure: `services/frontend/src/ui/MainTable.tsx` и `MainTable.test.tsx` только при необходимости optional prop, с прежними defaults/consumers; TablePaginator closure прежний. Выбрано feature-local решение, shared source/tests не меняются, массового retrofit/palette/tooling fixes нет. Final-service gates — F-2.V; contrast/baseline blockers — не waiver.
- [x] F-2-CONTRAST-FIX-1 Исправить MANUAL-A11Y-01 только в новом SEO modal: exact empty и focused/reloaded keyboard-scroll inputs, безопасно локализовать actual nodes/ratios, feature-local palette и regression tests, browser before→after/screenshots и impacted gates. Явное разрешение пользователя на scoped fix/дополнительную проверку после исчерпанного QG лимита; не waiver, без global/shared palette/root helper/старых card/forbidden и real auth/API/POST/PG/provisioning. Независимый MANUAL targeted recheck — отдельный разрешённый запуск того же QG.
- [ ] F-2.8 До QG выполнить scoped browser self-check UI-QA-02/04/05/07 с scripted assertions, geometry/focus/contrast/axe и безопасным evidence; real POST только по отдельному permit, иначе blocked scope указать явно.
- [x] F-2.V Выполнить final-service `make -C services/frontend test`, `make -C services/frontend lint` (включает typecheck), `npm run build` в services/frontend; canonical ESLint layout check без autofix чужих файлов и повторов aliases. FE-10 no-site/API-layer/limit-offset checks; вернуть handoff/отметить IDs.

**F-2c owner evidence:** `.qa/seo-metrica-task-monitor/F-2c/`. F-2.8/V остаются unchecked: full `make test` — 1622 PASS / 2 timeout (SeoPage MANUAL-01 и FE-A04, по 5s); exact targeted recheck этих двух — 2 PASS, не заменяет красный full gate. `make lint` (с typecheck), build, FE-10 и canonical layout check — PASS (0 errors, 1 прежнее warning, drift 0). Chromium 1366×768, текущий production build, только перехваченные API fixtures: UI-QA-04 PASS; UI-QA-02/05 и targeted UI-QA-07 keyboard/focus/geometry/scroll assertions PASS, но scoped axe — serious `scrollable-region-focusable` (1 node). Card unbound/bound baseline scans также выявили serious color-contrast; без waiver/внескоупового исправления. Normal/error contrast helper возвращает `contrast_unsupported` (hit-test включает фоновые sibling layers за непрозрачной модалкой); hover/focus computed contrast остаются unchecked, визуально focus просмотрен. Нужен bounded F-2d: keyboard-scroll accessibility fix в C (MainTable closure — только после отдельного согласования), exact browser reproducer и impacted/final gates; отдельно решение по baseline/tooling blockers. Реальных POST/auth/HTTP/PG acceptance не было; target/permit по-прежнему missing. Точные scripts/selectors/outcomes — ignored `handoff-notes.md`, `browser/report.json`, `browser-targeted/report.json`; это owner self-check, не независимый QG.

**F-2d owner evidence:** `.qa/seo-metrica-task-monitor/F-2d/`. F-2d-FIX-1 выполнен feature-local: именованный `tabIndex=0` на actual `.ant-table-body`, локальный `:focus-visible` outline, восстановление после reload; shared MainTable/TablePaginator и их defaults/consumers не изменены. Exact production fixture axe: UI-QA-02 before serious `scrollable-region-focusable` 1 node → after 0 violations; Tab → ArrowDown/PageDown/End/Home → Tab/Shift+Tab проверяет настоящий body scroll/focus. В Chromium implicit focus уже работал до fix, исходный FAIL — именно axe/отсутствие явного Tab-stop, не выдуманный keyboard failure. Новая component regression before FAIL → after PASS; targeted modal/MainTable/TablePaginator 34 PASS. Scoped browser UI-QA-02/05/07 geometry/keyboard/axe 3/3 PASS, 90 assertions, screenshots визуально просмотрены; contrast не включён в этот scoped recheck, прежний blocker не закрыт. На текущем коде один full `make test`: 107 files / 1625 PASS (включая прежние два timeout cases), `make lint` с typecheck и production build PASS; scoped canonical layout 0 errors/warnings/drift, FE-10 PASS. Поэтому F-2.V отмечен; это не изменение timeout/tooling и не утверждение устранения его недетерминизма. F-2.8 остаётся unchecked: прежний pale-card color-contrast и canonical normal/error `contrast_unsupported` с непроверенным computed hover/focus вне scope; нет waiver/exclusion/ослабления thresholds. Реальных auth/POST/PG/vendor acceptance не было, fixture не заменяет permits/SM. Точный handoff и воспроизводимые ignored scripts — `F-2d/handoff-notes.md`.

**F-2-CONTRAST-FIX-1 owner evidence:** `.qa/seo-metrica-task-monitor/F-2-CONTRAST-FIX-1/`. MANUAL-A11Y-01 локализован на actual nodes: empty `.ant-empty-description` #8c8c8c/white 3.36:1 и span «Обновить список», остающийся hovered после reload/native keyboard-focus, #4096ff/white 2.98:1. Это не baseline card/forbidden и не возврат scrollable-region-focusable. Fix только нового modal: собственный span Empty #595959 (axe 7:1); default outlined actions внутри `tasksActions` hover/focus-visible/active #0958d9 на white (axe hovered reload 6.15:1), без override outline/disabled/shared palette. Exact QG inputs before 2 FAIL serious color-contrast1→after 2 PASS axe0; native Tab/ArrowDown/PageDown/End/Home/footer/ShiftTab до и после reload сохранён. Component regression 2 meaningful FAIL на прежнем коде→targeted modal/accessibility 35 PASS; scoped ESLint/layout 0 errors/warnings/drift, canonical typecheck и production build PASS; impacted UI-QA-02/05/07 3 PASS/90 assertions, screenshots просмотрены. Full test/lint не повторялись: bounded feature-local CSS/span/test diff с известным blast radius, no shared/runtime orchestration change; прежние full PASS не переименованы в новый full run. F-2.8 по-прежнему unchecked: helper/matcher/старый card/forbidden и real acceptance prerequisites не закрыты, waiver/exclusions/порогов ниже 4.5 нет. Независимый один дополнительный MANUAL targeted recheck разрешён пользователем и ещё не заменён owner evidence; QG report не менялся.

## 7. QG-ENV — prerequisites общего gate (профиль: Quality Gate)

**Пути:** E, только ignored QG-ENV evidence · **Зависит от:** все владельцы. Профиль QG-FULL: 3 code-сервиса, lanes по design DAG, отдельного FORMAT unit нет.

- [x] QG-ENV.1 Сверить owner handoffs/actual task completion и конечный scenario registry; незавершённые критические owner evidence обозначить blocked, не начинать gate фиктивно.
- [x] QG-ENV.2 Проверить service lockfile environments, runtime URLs и требуемые инструменты/skills/Chromium; безопасная readiness без чтения secrets, missing — blocked-env.
- [ ] QG-ENV.3 Проверить отдельный PG target *_test DB/role, exact resource/consent/expiry, isolation и offline manifest preflight; не создавать DB/роль/ACL/permit автоматически.
- [ ] QG-ENV.4 Подтвердить test actors/tenant fixtures/binding/готовую очередь для SM/UI; production peer/DB isolation не считать доказанной одной Compose network.
- [x] QG-ENV.V Передать lanes safe environment fingerprint, manifest/permit references и blocked IDs; evidence в своей зоне, ≤2 infra repairs и stop по budget; отметить выполненное и вернуть handoff.

**QG-ENV audit:** `.qa/seo-metrica-task-monitor/QG-ENV/{prerequisites.md,registry.json,environment.json,fingerprints.json,ledger.json}`. Offline BE/FE-AUTO/CONTRACTS prerequisites доступны, независимые проверки ещё не выполнены. QG-ENV.3/.4 blocked: dedicated PG target/manifest/permit/isolation, реальные actors/tenants/binding/queue и consent не предоставлены; preflight/PG/real POST не запускались. Runtime status/endpoints и ready --dry-run сняты без мутаций; current-source readiness не доказана. api-smoke-test есть на диске, но отсутствует в runtime skills catalog. Chromium/dependencies доступны; owner contrast/tooling gaps F-2.8 сохранены. Repairs/Docker mutations/DB connections: 0; общего вердикта ENV не ставит.

## 8. QG-BE — независимые Python и PG проверки (профиль: Quality Gate)

**Пути:** E, QG-BE evidence · **Зависит от:** QG-ENV.

- [x] QG-BE.1 Проверить Clean Architecture/read-only SQL/tenant anti-join и статусную таблицу по metrica-task-list; отсутствие изменения workers/NATS/schema подтвердить diff review.
- [x] QG-BE.2 Независимо прогнать UT-M/GW и full test/lint/canonical format-check Метрики/backend на текущей revision один раз без alias repeats; failures вне scope классифицировать с evidence.
- [ ] QG-BE.3 Независимо выполнить PG-01..04 на real PostgreSQL через permitted runner с новой session/concurrency/snapshot и cleanup-history; skips/0 selection не PASS.
- [x] QG-BE.4 Сверить anonymous/authenticated peer/gateway outcomes, selector priority/spoofing и безопасную response schema; WIRE evidence не дублировать, сослаться на CONTRACTS.
- [x] QG-BE.V Записать результаты/invalidated evidence/risks по policy, вернуть handoff и отметить только выполненное; owner PASS не заменяет этот запуск.

## 9. QG-FE-AUTO — независимые frontend проверки (профиль: Quality Gate)

**Пути:** E, QG-FE-AUTO evidence · **Зависит от:** QG-ENV.

- [x] QG-FE-AUTO.1 Сверить FE-01..10 behavior diff с тестами, включая pagination четыре случая, permissions present/missing и 401/403, не только snapshots.
- [x] QG-FE-AUTO.2 Проверить MSW/mock isolation/no live backend calls, response/error/empty и no site-* imports; raw fetch/API layer/limit-offset self-check scoped к diff.
- [x] QG-FE-AUTO.3 Независимо выполнить frontend make test/make lint/canonical layout format-check/npm run build один раз, не дублировать npm aliases/typecheck.
- [x] QG-FE-AUTO.4 Проверить nested modal tests/stale answers/double submit/202 invalidation и regression unlink/таблиц; сопоставить scoped owner browser evidence, не выдавая его за независимый manual.
- [x] QG-FE-AUTO.V Передать MANUAL точные selectors/routes/fixtures и автоматические outcomes, вернуть handoff; evidence только своей lane.

## 10. QG-CONTRACTS — парные DTO, tooling и OpenSpec (профиль: Quality Gate)

**Пути:** E, QG-CONTRACTS evidence · **Зависит от:** QG-ENV.

- [x] QG-CONTRACTS.1 Сверить все новые/потребляемые endpoint строки access matrix, роли/tenant/privacy и отсутствие незаявленных endpoint/AsyncAPI changes; route inventory generator output должен совпасть с приложением.
- [x] QG-CONTRACTS.2 Независимо выполнить WIRE-01 production DTO exchange в отдельных environments с valid/invalid cases; mocks и отсутствие peer не засчитывать.
- [x] QG-CONTRACTS.3 Независимо выполнить TOOL-UT и проверить registry/schemas/evidence routing, сохранение старых регистраций/permit guards и запрет new-change NATS/arbitrary path.
- [x] QG-CONTRACTS.4 Проверить change scope/ownership/context paths, SERVICES/docs/schema соответствие; выполнить OpenSpec status JSON и strict validate.
- [x] QG-CONTRACTS.V Вернуть handoff с finite findings и ссылками WIRE/TOOL evidence; отдельный docs/reports lane файл не создавать, отметить выполненные IDs.

## 11. QG-LIVE — живые HTTP acceptance (профиль: Quality Gate)

**Пути:** E, QG-LIVE evidence · **Зависит от:** QG-BE,QG-FE-AUTO,QG-CONTRACTS.

- [x] QG-LIVE.1 До запросов подтвердить safe test stack/real PostgreSQL/permit/fixture identity из ENV handoff; отсутствующее — blocked, без app DB fallback. Аудит: prerequisites отсутствуют → blocked; `.qa/seo-metrica-task-monitor/QG-LIVE/prerequisites.md`, готовность не подтверждена.
- [ ] QG-LIVE.2 Выполнить SM-01/02 через skill api-smoke-test (не pytest smoke), anonymous/authenticated и peer selector priority; сохранить безопасные HTTP outcomes.
- [ ] QG-LIVE.3 Выполнить SM-03 на смешанной persisted истории tenant A/B с пагинацией/старым delete и spoof selector; не дублировать PG SQL harness QG-BE.
- [ ] QG-LIVE.4 Выполнить SM-04 только с отдельным разрешением на запуск/готовой test очередью; если vendor path не обеспечен — unchecked vendor gap явно, не выдавать synthetic за реальную загрузку.
- [x] QG-LIVE.V Сохранить конечный ledger/status по всем SM IDs, timings, residual/blocked причины и handoff; нет smoke файлов tests/smoke и скрытого setup. `.qa/seo-metrica-task-monitor/QG-LIVE/{ledger.json,prerequisite-check.json,prerequisites.md}`: SM-01..04 blocked, HTTP outcomes/timings null; реальные запросы не выполнялись.

## 12. QG-FE-MANUAL — desktop browser acceptance (профиль: Quality Gate)

**Пути:** E, QG-FE-MANUAL evidence · **Зависит от:** QG-BE,QG-FE-AUTO,QG-CONTRACTS.

- [x] QG-FE-MANUAL.1 Получить FE-AUTO/ENV handoff, загрузить ui-qa/browser-qa protocol; проверить safe auth inputs, test URL/fixtures и Chromium 1366×768.
- [x] QG-FE-MANUAL.2 Исполнить scripted UI-QA-01..04 из design: доступ/вкладки/binding/list/пагинация и порядок, с network/assertion evidence.
- [ ] QG-FE-MANUAL.3 Исполнить UI-QA-05/06: вложенное подтверждение, Space/Enter/Escape/focus, pending/double submit/error/access/revoke/stale response; реальные mutations только с permit.
- [ ] QG-FE-MANUAL.4 Исполнить UI-QA-07/08: geometry/scroll/contrast/axe и визуальная инспекция, отсутствие header refresh и регрессий unlink/нормализации; mobile/tablet не проверять.
- [x] QG-FE-MANUAL.V Передать SYNTH passed/failed steps и безопасные screenshots/network, finite findings; failed closure только exact reproducer и один targeted recheck; отметить выполненные IDs.

**QG-FE-MANUAL evidence:** `.qa/seo-metrica-task-monitor/QG-FE-MANUAL/handoff-notes.md`, `registry.json`, `ledger.json`. Независимый Chromium1366×768, только текущий production build и fail-closed synthetic API: canonical 5/9 PASS, supplemental после обязательного учёта axe 11/20 PASS; один targeted POST503 recheck FAIL с enabled DOM attributes (не подтверждённый product-disabled defect). .1/.2/.V означают аудит/fixture исполнение и передачу, НЕ real acceptance PASS. Новые modal empty/focused states: serious color-contrast1; baseline card/forbidden contrast — pre-existing, не waiver. Canonical normal/error contrast_unsupported, computed hover/focus и POST retry/revoke/binding-change остаются gaps; .3/.4 unchecked. Geometry/native scroll/focus fix, pagination и nested pending/202 assertions PASS; 9 безопасных screenshots действительно просмотрены. Real UI/auth/POST/HTTP/PG blocked: actors/current-source stack readiness/target/isolation/permits отсутствуют. Product/palette/tooling не менялись, full suites не повторялись; общий вердикт только SYNTH.

## 13. QG-SYNTH — единый вердикт (профиль: Quality Gate)

**Пути:** E, единственный будущий docs/reports/seo-metrica-task-monitor.md · **Зависит от:** QG-LIVE,QG-FE-MANUAL и остальные handoffs.

- [x] QG-SYNTH.1 Сопоставить конечные scenario IDs/риски/prerequisites с независимым lane evidence, выявить unchecked/blocked, исключить PASS по collection/skip/старой revision.
- [x] QG-SYNTH.2 Свести findings blocking/minor/pre-existing/blocked-env/waived; при REWORK вернуть владельцам exact reproducer fix, максимум один targeted recheck тем же lane.
- [x] QG-SYNTH.3 Проверить actual task completion и финальное соответствие proposal/specs/design, включая tenant-history trade-off и release isolation gate.
- [x] QG-SYNTH.4 Выполнить `OS status --change seo-metrica-task-monitor --json` и `OS validate seo-metrica-task-monitor --type change --strict`, где OS — реальный CLI из design; сохранить evidence и создать единственный итоговый отчёт.
- [x] QG-SYNTH.V Выдать единый APPROVED/APPROVED_WITH_WAIVER/REWORK/BLOCKED с причинами, отметить фактически выполненные IDs и вернуть handoff Router; merge/release/apply approval не подменять.

## T-1-FIX-1 — CONTRACTS-01 / TOOL-02 exact-node registry

- [x] T-1-FIX-1.1 Сузить только seo-metrica-task-monitor до четырёх exact PG node IDs без suffix/param; согласовать manifest/permit schemas, сохранить legacy registry/permit guards, добавить positive/negative offline regression и точное описание README; выполнить exact reproducer FAIL→PASS, TOOL-UT и scoped static/diff-check. Evidence: `.qa/seo-metrica-task-monitor/T-1-FIX-1/`; независимый targeted recheck выполняет QG-CONTRACTS.

## Workflow follow-up

- Только после положительного общего QG и пользовательского решения Router синхронизирует delta specs через openspec-sync-specs, повторяет strict validation и выполняет archive через openspec-archive-change.
- Финализация/merge/release — отдельные approval gates Router. Approval change не разрешает setup/teardown PG/NATS или production deployment.
- PLAN-1 завершает только артефакты: все checkbox реализации остаются пустыми; runtime, отчёт QG и sync/archive на стадии планирования запрещены.
