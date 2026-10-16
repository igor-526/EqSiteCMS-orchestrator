# Tasks — normalize-yandex-client-failures

Q1..Q3 закрыты ответами пользователя; финальный apply approval получен явным «Начинай» после показа артефактов, пять BE units завершены (см. [design](design.md#open-questions)). Повторный approval на mandated QG/checkpoints не требуется. Tooling scope E из PLAN-5 отдельно одобрен «Да, доработать stackctl (Recommended)», TOOL-1 завершён. PLAN-6 по действующему «Доработай» исправляет только ошибочный loopback target для уже утверждённой password-auth цели: TOOL-2 → ENV-R2, без нового функционального scope/approval-вопроса. Rebuild обоих peers уже выполнен ENV-R1 и не повторяется. Доступ не меняется. Ownership A/B/C/D/E, DAG и test matrix заданы в [design](design.md#execution-units); здесь только исполняемый чеклист. Ни один пункт не выполнен в PLAN-1. Отмечать только фактически завершённые действия, возвращать handoff после каждой unit. Форматирование ограничивать своим diff: обнаруженные сторонние изменения не включать в ownership.

## Execution units

Сокращения путей: `YA=services/yandex-service`, `M=services/ya-metrica-service`, `REPORT=docs/reports/normalize-yandex-client-failures`; это обозначения, а не shell-переменные. В contextFiles читать только указанные части design и профильные требования. Точные runtime paths перечислены в секциях units ниже; общие правила `AGENTS.md` и ядро своего профиля обязательны для каждого invocation.

| Unit | Профиль | Deliverable / Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| YA-BE-1 | Backend | A / два YA clients, exception/Protocol и client tests | финальный apply approval | `make -C services/yandex-service format test lint` | [client spec](specs/yandex-client-failures/spec.md), [design Decisions 1–2](design.md#decisions), YA clients/oauth + peer, exceptions/yandex, их protocols/tests |
| YA-BE-2 | Backend | A / YA два service + их tests | YA-BE-1 | та же одна сервисная группа | [client spec](specs/yandex-client-failures/spec.md), [design Decisions 3](design.md#decisions), handoff YA-BE-1, YA OAuth/Metrica service + service tests |
| YA-BE-3 | Backend | A / YA main + API/transaction tests | YA-BE-2 | та же одна сервисная группа | [HTTP spec](specs/yandex-peer-http-contract/spec.md), [design Decisions 4–5, matrix](design.md#decisions), YA main/base exceptions/transactional_route, API routes и относящиеся API tests |
| M-BE-1 | Backend | B / M client/schema/exception/Protocol и client tests | финальный apply approval | `make -C services/ya-metrica-service format test lint` | [client spec](specs/yandex-client-failures/spec.md), [design Decisions 1–2](design.md#decisions), M client, exception, Protocol, counter DTO, client tests |
| M-BE-2 | Backend | B / M service/main + service/API tests | M-BE-1 | та же одна сервисная группа | [обе delta specs](specs/yandex-peer-http-contract/spec.md), [client spec](specs/yandex-client-failures/spec.md), [design Decisions 3–5, matrix](design.md#decisions), handoff M-BE-1, M service/main/base exceptions/API и соответствующие tests |
| QG-BE | Quality Gate | C / REPORT/backend.md; runtime read-only | QG-ENV | review архитектурного slice и service test/lint evidence | handoffs пяти BE units, [design Test matrix UT/API](design.md#test-matrix), оба delta specs, только touched runtime/test diff |
| QG-CONTRACTS | Quality Gate | C / REPORT/contracts.md | QG-ENV | traceability/access/contracts review | [HTTP spec](specs/yandex-peer-http-contract/spec.md), [client spec](specs/yandex-client-failures/spec.md), main specs service-endpoint-auth/api-access-governance/service-env-and-clients; [tooling delta](specs/repository-process-tooling/spec.md) и TOOL-1/TOOL-2 handoffs/UT-TOOL evidence; только touched API/main/Protocol/CLI diff |
| TOOL-1 | Backend | E / `scripts/stackctl`, новый `scripts/tests/stackctl.test.mjs` | показ/подтверждение tooling scope, ENV-01 | одна hermetic группа `node --test scripts/tests/stackctl.test.mjs` | [design TOOL-1](design.md#tool-1-границы-и-локальная-verification-group), [tooling delta](specs/repository-process-tooling/spec.md), REPORT/environment.md только ENV-01/DSN; stackctl только registries/validation/profileForService/ready/psql/lock и связанные rebuild/doctor/logs; Makefile только DC_YANDEX/DC_YA_METRICA/DC_INFRA; compose двух peers/DB read-only по необходимости; новый тест |
| QG-ENV | Quality Gate | C / REPORT/environment.md | YA-BE-3, M-BE-2, TOOL-1; завершение через ENV-R2 | ENV-R1 rebuild/health done; QG-ENV.1 остаётся открыт до SQL auth ENV-R2 | сохранённый ENV-R1 handoff; [design Q2](design.md#open-questions); ранее завершённые ENV.2/.3/.V не сбрасывать |
| TOOL-2 | Backend | E / строго `scripts/stackctl`, `scripts/tests/stackctl.test.mjs` | PLAN-6, TOOL-1, ENV-02 | одна hermetic группа `node --test scripts/tests/stackctl.test.mjs` | [design TOOL correction](design.md#plan-6--tool-2-техническая-коррекция-env-02), [tooling delta только SQL target/auth](specs/repository-process-tooling/spec.md), REPORT/environment.md только ENV-02; stackctl только runtimeTcp psql branch и связанные tests; сервисы/compose не читать |
| ENV-R2 | Quality Gate | C / только REPORT/environment.md и свои checklist IDs | TOOL-2, ENV-R1 | одна SQL auth/health группа, без ready/rebuild/repair | TOOL-2 handoff, REPORT/environment.md ENV-02 и сохранённый ENV-R1 evidence/BASE URLs; [design TOOL correction](design.md#plan-6--tool-2-техническая-коррекция-env-02), [tooling SQL scenarios](specs/repository-process-tooling/spec.md); stack-control skill, dev Q2/production condition без изменений |
| YA-FIX-HTTP-LOG | Backend | A / строго YA main + existing test_exception_handlers; свои IDs | PLAN-7, BE-01 | отдельная YA `make test lint` группа | точный пакет секции 6a; design PLAN-7; backend только BE-01/reproducer |
| M-FIX-HTTP-LOG | Backend | B / строго M main + один existing counters_api или health test; свои IDs | PLAN-7, BE-01 | отдельная M `make test lint` группа | точный пакет секции 6b; design PLAN-7; backend только BE-01/reproducer |
| QG-BE-R1 | Quality Gate | C / existing REPORT/backend.md; свои IDs | оба FIX handoffs | targeted BE-01 review | точный пакет секции 6c, только fix diff/evidence |
| QG-CONTRACTS-R1 | Quality Gate | C / existing REPORT/contracts.md; свои IDs | оба FIX handoffs, исходный QG-CONTRACTS done | targeted HTTP traceability либо обоснованное N/A | точный пакет секции 6d, только relevant HTTP boundary |
| QG-LIVE | Quality Gate | C / REPORT/live.md | QG-BE-R1 passed, QG-CONTRACTS passed + R1 passed/N/A; dev readiness из QG-ENV | один интеграционный SM-01..04 прогон | [design Test matrix SM](design.md#test-matrix), [HTTP matrix](specs/yandex-peer-http-contract/spec.md#requirement-access-matrix-существующих-peer-endpoints), QG-ENV report, stack-control и проектный api-smoke-test skill |
| YA-CP | Backend | A / commit-only assigned paths YA-BE-1/2/3 в YA; свои checklist IDs | QG-LIVE | staged allowlist/diff, один commit, чистый YA status, SHA | [design Migration Plan](design.md#migration-plan), секции 1–3 и 9a этого checklist, YA handoffs, существующие git-правила; только assigned diff |
| M-CP | Backend | B / commit-only assigned paths M-BE-1/2 в M; свои checklist IDs | YA-CP | staged allowlist/diff, один commit, чистый M status, SHA | [design Migration Plan](design.md#migration-plan), секции 4–5 и 9b этого checklist, M handoffs, существующие git-правила; только assigned diff |
| DOCS-CP-PRE | Planner | D + commit-only C/E / этот change, запрос 096, REPORT/{environment,backend,contracts,live}.md и те же строго два tooling paths по TOOL-1/TOOL-2 handoffs | M-CP, QG-LIVE, TOOL-2, ENV-R2 | own root commit docs/evidence/tooling; foreign content/index неизменны; SHA для setup | [design Migration Plan](design.md#migration-plan), секция 9c и checklist progress, approval и handoffs LIVE/YA-CP/M-CP; docs diff по allowlist |
| QG-CLEAN-SETUP | Quality Gate | C / isolated root и nested worktrees; workspace ignored dependencies/caches; originals read-only | DOCS-CP-PRE | одна readiness/status группа без make checks, manifest и clean isolated root/all services | [design Migration Plan PLAN-8](design.md#migration-plan), секция 9d, PRE/YA/M SHA handoffs; root/nested Makefile и scripts/check-format-excludes.sh только feasibility |
| QG-FORMAT | Quality Gate | C / isolated checkout, REPORT/format.md evidence; исправления через A/B/E | QG-CLEAN-SETUP | только isolated root clean worktree: `make format`, `make lint`, `make test`; evidence после verification | [design Migration Plan](design.md#migration-plan), setup manifest/readiness handoff, agents/quality_gate.md:406–467, только touched diff |
| DOCS-CP-FORMAT | Planner | D + commit-only C / только этот tasks.md и REPORT/format.md в original root | QG-FORMAT | safe evidence transfer, own root docs commit; isolated clean evidence и foreign original неизменны | [design Migration Plan](design.md#migration-plan), секция 10a, handoffs PRE/setup/FORMAT, только own report/checklist diff |
| QG-SYNTH | Quality Gate | C / REPORT/synthesis.md | QG-ENV, QG-BE, QG-CONTRACTS, QG-LIVE, QG-FORMAT, DOCS-CP-FORMAT | единый APPROVED/REWORK | пять lane reports, [tasks](tasks.md), [design Q1..Q3](design.md#open-questions), approval evidence |
| SPEC-FINAL | Planner | D / change, три соответствующие main specs (включая repository-process-tooling), archive этого change | QG-SYNTH APPROVED | sync → strict validation → archive → handoff Router для task-finalize | [proposal](proposal.md), обе delta specs, [tasks](tasks.md), QG synthesis, openspec-sync-specs/openspec-archive-change/task-finalize; предусловия и gates самих skills |

## 1. YA-BE-1 — граница двух HTTP-клиентов yandex (профиль: Backend)

**Specs:** `yandex-client-failures` · **Пути (от YA):** `src/clients/yandex_oauth_client.py`, `src/clients/yandex_metrica_service_client.py`, `src/core/exceptions/yandex.py`, `src/core/protocols/clients/yandex_oauth_client.py`, `src/core/protocols/clients/yandex_metrica_service_client.py`, `tests/unit/test_yandex_oauth_client.py`, `tests/unit/test_yandex_metrica_service_client.py`, `tests/unit/test_exceptions.py`. **Зависит от:** approval.

- [x] YA-BE-1.1 Расширить локальный YandexClientException для отсутствующего upstream status, безопасных категорий и совместимой `.message`; удалить возможность сырого секретного сообщения.
- [x] YA-BE-1.2 Обернуть HTTP lifecycle/status/JSON и DTO validation в OAuth client, сохранив wire contract, close и cancellation.
- [x] YA-BE-1.3 Применить тот же контракт к YaMetricaServiceClient, включая peer 400 и невалидный DTO; без cross-service import/retry.
- [x] YA-BE-1.4 Документировать raises/успешные результаты обоих Protocol без ненужной смены signatures.
- [x] YA-BE-1.5 Заменить propagation-gap tests и реализовать UT-C-01..06, UT-C-08..09 для этих двух клиентов, включая exception compatibility; не менять несвязанный OAuth URL encoding xfail.
- [x] YA-BE-1.V Прогнать `make -C services/yandex-service format test lint`, проверить отсутствие чужого diff, отметить только свои tasks, вернуть Router handoff с командами и evidence.

## 2. YA-BE-2 — преобразование ошибок в сервисах yandex (профиль: Backend)

**Specs:** `yandex-client-failures` · **Пути (от YA):** `src/core/services/yandex_oauth_service.py`, `src/core/services/yandex_metrica_service.py`, `tests/unit/test_yandex_oauth_service.py`, `tests/unit/test_yandex_metrica_service.py`. **Зависит от:** YA-BE-1.

- [x] YA-BE-2.1 Уточнить безопасное преобразование обоих OAuth call failures в ClientError, убрать raw exception logging и сохранить no-write-before-valid-profile.
- [x] YA-BE-2.2 Добавить локальный YandexClientException→ClientError вокруг peer client call Метрики, сохранить lookup/pagination/happy DTO.
- [x] YA-BE-2.3 Реализовать/обновить UT-S-01..03 и сервисную часть UT-C-09: cause, no downstream/no write после отказа, без маскировки repository ошибок под client failure.
- [x] YA-BE-2.V Прогнать `make -C services/yandex-service format test lint`, отметить свои tasks и вернуть handoff.

## 3. YA-BE-3 — единый HTTP-контракт yandex (профиль: Backend)

**Specs:** `yandex-peer-http-contract` · **Пути (от YA):** `src/main.py`, `tests/api/test_exception_handlers.py`, `tests/api/test_yandex_auth.py`, `tests/api/test_yandex_metrica.py`, `tests/api/test_transactions.py`, `tests/api/test_health.py`, `tests/api/test_servicing.py`, `tests/api/test_yandex_accounts.py`, `tests/api/test_yandex_connections.py`, `tests/api/conftest.py`. **Зависит от:** YA-BE-2. Routes/transactional_route читаются как контекст, не переписываются без возврата ownership Router.

- [x] YA-BE-3.1 Реализовать в main централизованные safe 400 handlers для application/validation/HTTP/unexpected/response errors и debug-safe response; сохранить rollback вне handler.
- [x] YA-BE-3.2 Отключить slash redirect; сохранить success health/docs/DTO и 204 empty; не добавлять и не удалять auth checks.
- [x] YA-BE-3.3 Реализовать API-01..04 для Y1..Y9/H1/D1/R1: anonymous/authenticated, validation/foreign/absent outcomes, safe errors, native status normalization согласно approved Q1.
- [x] YA-BE-3.4 Реализовать API-05 на настоящих client/service с MockTransport и API transaction tests, включая OAuth/peer timeout и rollback до ответа; обновить прежние 409/500 ожидания только в scope нового контракта.
- [x] YA-BE-3.V Прогнать `make -C services/yandex-service format test lint`, проверить UT/API coverage evidence, отметить свои tasks и вернуть handoff.

## 4. M-BE-1 — граница внешнего клиента Метрики (профиль: Backend)

**Specs:** `yandex-client-failures` · **Пути (от M):** `src/clients/yandex_metrica.py`, `src/core/exceptions/yandex.py`, `src/core/protocols/clients/yandex_metrica.py`, `src/core/schemas/clients/yandex_metrica.py` (новый), `tests/clients/test_yandex_metrica.py`, `tests/unit/test_schemas_exceptions.py`. **Зависит от:** approval. Новый schema импортировать непосредственно, без ненужных re-export правок.

- [x] M-BE-1.1 Расширить собственный YandexClientException совместимо с числовыми вызовами и отсутствующим status, исключить секреты.
- [x] M-BE-1.2 Нормализовать lifecycle/timeout/transport/status/JSON failures в client, удалить raw body print, сохранить close/cancellation/wire.
- [x] M-BE-1.3 Добавить локальную валидацию top-level rows/counters с типизированным полным отказом при непригодном ответе; не требовать валидности каждого id/site для успеха всего вызова. Сохранить пропуск некорректного отдельного счётчика, partial200 корректных элементов, numeric strings и dict Protocol; не вводить новых правил total/empty.
- [x] M-BE-1.4 Уточнить raises/результат Protocol и реализовать UT-C-01..05, UT-C-07..09, заменив tests с raw ValueError/httpx propagation.
- [x] M-BE-1.V Прогнать `make -C services/ya-metrica-service format test lint`, отметить свои tasks и вернуть handoff.

## 5. M-BE-2 — сервис и HTTP Метрики (профиль: Backend)

**Specs:** обе capabilities · **Пути (от M):** `src/core/services/yandex_metrica_service.py`, `src/main.py`, `tests/unit/test_yandex_metrica_service.py`, `tests/api/test_counters_api.py`, `tests/api/test_health.py`. **Зависит от:** M-BE-1.

- [x] M-BE-2.1 Добавить YandexClientException→ClientError на client boundary для отказа всего вызова; исключить raw TypeError/ValueError, сохранив существующий skip invalid items и partial200 корректных элементов. Сохранить mapping total/items, прежнее empty/clamp/decrypt поведение с безопасными сообщениями.
- [x] M-BE-2.2 Реализовать в main полный approved HTTP mapping/debug safety/slash policy аналогично контракту yandex без runtime import из соседнего сервиса.
- [x] M-BE-2.3 Реализовать UT-S-02..03/UT-C-07/UT-C-09 для service и API-01..05 для M1/H1/D1/R1: настоящий service/client failure →400, secret marker, malformed input, замена 409/500 expectations; сохранить partial-success regression для корректных элементов, прежний total/empty и не смешивать skip элемента с отказом всего вызова.
- [x] M-BE-2.V Прогнать `make -C services/ya-metrica-service format test lint`, отметить свои tasks и вернуть handoff.

## 6. QG-BE — общий review backend slice (профиль: Quality Gate)

**Ownership:** только `REPORT/backend.md`, runtime read-only. **Зависит от:** QG-ENV; QG-BE и QG-CONTRACTS могут выполняться параллельно.

- [x] QG-BE.1 Проверить layer boundaries и отсутствие cross-service imports/blanket catch в роутерах; сопоставить UT-C/UT-S/API behavior diff с тестами, cancellation, chaining, close, rollback, safe logging.
- [x] QG-BE.2 Проверить service-local test/lint evidence, при необходимости повторить `make -C services/yandex-service test lint` и `make -C services/ya-metrica-service test lint` одной review-группой; записать результаты/дефекты, не менять runtime.
- [x] QG-BE.V Сохранить lane verdict/evidence, отметить только выполненные tasks, вернуть handoff. Исправления только Router→соответствующий ownership unit.

## 6a. YA-FIX-HTTP-LOG — безопасная ASGI-граница yandex (профиль: Backend)

**Deliverable:** A · **Specs:** existing controlled logs / HTTP boundary, API-03 · **Пути:** только `services/yandex-service/src/main.py`, `services/yandex-service/tests/api/test_exception_handlers.py`; в root только свои task IDs. **Зависит от:** PLAN-7, BE-01; не от M-FIX. **contextFiles:** ядро `AGENTS.md`/`agents/backend.md`; [Decision 4](design.md#4-согласованный-буквальный-http-охват-q1), [PLAN-7 constraints/DAG](design.md#plan-7--be-01-ограниченная-доработка-безопасной-asgi-границы), эта секция; [backend report](../../../docs/reports/normalize-yandex-client-failures/backend.md) только BE-01 (13–21) и reproducer (39–81); два owned main/test файла. Не читать весь change/code/другие reports. Новый approval не требуется.

- [x] YA-FIX-HTTP-LOG.1 Исправить main по PLAN-7 constraints: safe ASGI handling ordinary unexpected error до server-level rethrow, controlled category без raw exception/cause/traceback/секретов; сохранить rollback до response, cancellation/BaseException, неперехват начатого response и debug policy. Кодовое решение выбирает исполнитель; auth/access/status/partial не менять.
- [x] YA-FIX-HTTP-LOG.2 Добавить API-03/BE-01 regression в existing test_exception_handlers: реальный `uvicorn.protocols.http.h11_impl.RequestResponseCycle.run_asgi(main.app)`, synthetic secret в exception и chained cause, HTTP400, маркеры отсутствуют в response/server log, traceback отсутствует в server log; сохранить controlled diagnostics, existing direct API safe checks и отрицательные гарантии из design. Hermetic transport/h11, изоляция состояния; не mock run_asgi и не TestClient-only.
- [x] YA-FIX-HTTP-LOG.V Выполнить одну YA-группу `UV_CACHE_DIR="$PWD/.cache/uv" make -C services/yandex-service test lint` из корня; проверить свой diff, отметить только свои выполненные IDs, вернуть handoff (paths, команды/результаты, server-boundary evidence, сохранённые гарантии) и остановиться. Без commits/runtime/третьих сервисов/новых файлов.

## 6b. M-FIX-HTTP-LOG — безопасная ASGI-граница Метрики (профиль: Backend)

**Deliverable:** B · **Specs:** existing controlled logs / HTTP boundary, API-03 · **Пути:** только `services/ya-metrica-service/src/main.py` и один existing файл на выбор: `services/ya-metrica-service/tests/api/test_counters_api.py` **или** `services/ya-metrica-service/tests/api/test_health.py`; в root только свои task IDs. Выбор записать в handoff, второй test file не менять. **Зависит от:** PLAN-7, BE-01; не от YA-FIX. **contextFiles:** ядро `AGENTS.md`/`agents/backend.md`; [Decision 4](design.md#4-согласованный-буквальный-http-охват-q1), [PLAN-7 constraints/DAG](design.md#plan-7--be-01-ограниченная-доработка-безопасной-asgi-границы), эта секция; [backend report](../../../docs/reports/normalize-yandex-client-failures/backend.md) только BE-01 (13–21) и reproducer (39–81); свой main и выбранный existing test file. Не читать соседний сервис/весь change/прочие reports. Новый approval не требуется.

- [x] M-FIX-HTTP-LOG.1 Исправить main по PLAN-7 constraints: safe ASGI handling ordinary unexpected error до server-level rethrow, controlled category без raw exception/cause/traceback/секретов; сохранить rollback до response, cancellation/BaseException, неперехват начатого response и debug policy. Кодовое решение выбирает исполнитель; auth/access/status/partial/total/empty не менять.
- [x] M-FIX-HTTP-LOG.2 Добавить API-03/BE-01 regression в выбранный existing API test: реальный `uvicorn.protocols.http.h11_impl.RequestResponseCycle.run_asgi(main.app)`, synthetic secret в exception и chained cause, HTTP400, маркеры отсутствуют в response/server log, traceback отсутствует в server log; сохранить controlled diagnostics, existing direct API safe checks и отрицательные гарантии из design. Hermetic transport/h11, изоляция состояния; не mock run_asgi и не TestClient-only.
- [x] M-FIX-HTTP-LOG.V Выполнить одну M-группу `UV_CACHE_DIR="$PWD/.cache/uv" make -C services/ya-metrica-service test lint` из корня; проверить свой diff, отметить только свои выполненные IDs, вернуть handoff (выбранный test file, команды/результаты, server-boundary evidence, сохранённые гарантии) и остановиться. Без commits/runtime/третьих сервисов/новых файлов.

## 6c. QG-BE-R1 — targeted повтор BE-01 (профиль: Quality Gate)

**Ownership:** только existing `REPORT/backend.md` и свои task IDs, runtime read-only. **Зависит от:** оба FIX handoffs. **contextFiles:** ядро QG; [PLAN-7](design.md#plan-7--be-01-ограниченная-доработка-безопасной-asgi-границы), эта секция; два fix handoffs, только их main/test diff; backend BE-01/reproducer. Исходные QG-BE checked tasks означают review done, не passed; исходный FAILED и checklist сохранять.

- [x] QG-BE-R1.1 Проверить закрытие BE-01 обоих peers: реальный run_asgi, HTTP400, secret/cause/traceback отсутствуют в server log, safe category наблюдаема; сохранены rollback/debug/cancellation/BaseException/начатый response и direct API safe checks. Сверить обе отдельные service test/lint evidence; не повторять весь change/третьи сервисы.
- [x] QG-BE-R1.V Добавить targeted verdict/evidence к existing backend report, не стирая исходный finding; отметить свои IDs, вернуть handoff. Незакрытый BE-01 блокирует LIVE; checkbox review не означает passed.

## 6d. QG-CONTRACTS-R1 — точечная traceability после HTTP fix (профиль: Quality Gate)

**Ownership:** только existing `REPORT/contracts.md` и свои task IDs, runtime read-only. **Зависит от:** оба FIX handoffs и завершённый исходный QG-CONTRACTS. **contextFiles:** ядро QG; [PLAN-7](design.md#plan-7--be-01-ограниченная-доработка-безопасной-asgi-границы), эта секция; оба fix handoffs/main-test diff; только относящиеся строки existing contracts report и HTTP spec. Исходный QG-CONTRACTS passed, его checked tasks/report сохранять.

- [x] QG-CONTRACTS-R1.1 Оценить влияние fix на HTTP boundary traceability. При влиянии точечно повторить Decision 4/API-03/controlled-log coverage и неизменность access/auth/status/debug/response-start границ по HTTP spec; иначе явно обосновать N/A. Полный CONTRACTS/tooling и прочие reports не перечитывать.
- [x] QG-CONTRACTS-R1.V Зафиксировать targeted passed либо обоснованное N/A в existing contracts report, отметить свои IDs, вернуть handoff. Далее existing LIVE/checkpoint DAG только после QG-BE-R1 passed.

## 7. QG-CONTRACTS — API и access policy (профиль: Quality Gate)

**Ownership:** только `REPORT/contracts.md`. **Зависит от:** QG-ENV; QG-BE и QG-CONTRACTS могут выполняться параллельно.

- [x] QG-CONTRACTS.1 Сверить все строки access matrix, причины private exceptions, anonymous/authenticated/foreign tests, закрытые решения Q1..Q3 и отдельный финальный apply approval; подтвердить неизменность backend 401/403/tenant selector.
- [x] QG-CONTRACTS.2 Проверить три клиентских boundary, DTO/wire success совместимость, полное 200/204/400 application множество и документированные исключения уровня proxy/process; выполнить `openspec validate normalize-yandex-client-failures --type change --strict`.
- [x] QG-CONTRACTS.V Сохранить traceability/verdict/evidence, отметить свои tasks и вернуть handoff.

## 7a. TOOL-1 — минимальная поддержка peers/DB в stackctl (профиль: Backend)

Tooling expansion gate закрыт: после показа расширения пользователь отдельно подтвердил «Да, доработать stackctl (Recommended)»; базовый apply approval — «Начинай».

**Specs:** `repository-process-tooling`, только ADDED requirement. **Ownership:** E, строго `scripts/stackctl`, новый `scripts/tests/stackctl.test.mjs`; в checklist только TOOL-1 IDs. **Зависит от:** показ/подтверждение расширенного tooling scope после PLAN-5. Не выполнять runtime/rebuild/make/commits, не редактировать compose/env/network/auth/skills/Makefile и service code; не поддерживать другие сервисы. Одна CLI verification group, матрица UT-TOOL-01..05 в [design](design.md#tool-1-границы-и-локальная-verification-group).

- [x] TOOL-1.1 Добавить только profiles `ya-metrica` и ограниченный `infra`, SERVICES mappings трёх aliases; точные existing compose keys/container names, DB buildable:false, без автоматических миграций.
- [x] TOOL-1.2 Обеспечить targeted ready/rebuild обоих peers с сохранением project label и правильного compose key; doctor/logs трёх новых aliases; не запускать соседние сервисы/infra.
- [x] TOOL-1.3 Добавить только два DB_CONFIG entries и ограниченный TCP/runtime-container-env psql путь для них: SELECT 1 с -w, без password в host argv/output, missing/auth failure exit 1 без socket fallback; legacy DB поведение сохранить.
- [x] TOOL-1.4 Обеспечить ready --dry-run без lock/мутаций, не ослабляя lock настоящих операций; сохранить JSON stdout, namespace/unknown alias rejection и exit codes.
- [x] TOOL-1.5 Создать hermetic `scripts/tests/stackctl.test.mjs` с локальными fake Docker/flock fixtures и покрытием UT-TOOL-01..05, включая negative cases и legacy regression; без real Docker и изменений общих helpers.
- [x] TOOL-1.V Выполнить только `node --test scripts/tests/stackctl.test.mjs`; отметить фактические TOOL-1 tasks, передать Router paths/results и handoff повторному QG-ENV, затем остановиться. Commit tooling выполнит только DOCS-CP-PRE по явному allowlist после LIVE.

## 7b. TOOL-2 — коррекция SQL password-auth gate по ENV-02 (профиль: Backend)

**Specs:** `repository-process-tooling`, только SQL target/auth requirement и scenarios. **Ownership:** E, строго `scripts/stackctl` и `scripts/tests/stackctl.test.mjs`; checklist только TOOL-2 IDs. **Зависит от:** PLAN-6, завершённый TOOL-1 и ENV-02. Это техническая коррекция отдельно одобренной password-auth цели, не новый product scope. TOOL-1 checkboxes сохранить. Не выполнять Docker/runtime/rebuild/make/commits; не читать/менять сервисы, не менять HBA/network/auth/config/compose/defaults/aliases/legacy DB branch. Матрица UT-TOOL-06..08 и контракт — [design TOOL correction](design.md#plan-6--tool-2-техническая-коррекция-env-02).

- [x] TOOL-2.1 Заменить только runtimeTcp loopback target на существующий non-loopback endpoint выбранного DB-контейнера: runtime hostname с проверкой non-loopback/container identity либо runtime контейнерный IP, внутренний порт 5432, не host dynamic published port. Неопределённый/небезопасный target → safe exit 1, без fallback/mutation.
- [x] TOOL-2.2 Добавить bounded read-only auth gate на одном target/user/database с `-X -w`: positive SELECT 1 с текущим runtime password возвращает 1; negative SELECT 1 с generated отличным password получает именно password-auth отказ. Wrong-password success/trust и любой недоказанный negative failure → `ok:false`/exit 1. Переданный SQL исполнять только после успешного gate, без shell-интерполяции; для SELECT 1 можно использовать positive результат.
- [x] TOOL-2.3 Сохранить credentials/generated password и raw probe diagnostics только внутри контейнера, не host argv/output/JSON/evidence; наружу безопасные target и отдельные исходы probes. Сохранить secret output guard, JSON/allowlist/exit codes, legacy DB поведение и no mutation.
- [x] TOOL-2.4 Обновить target expectation UT-TOOL-04 и реализовать UT-TOOL-06..08 одной hermetic test-группой с fake Docker/flock: оба aliases, valid/invalid/trust/indeterminate failures, отсутствие secrets/mutations и legacy regression; сохранить существующие UT-TOOL-01..05.
- [x] TOOL-2.V Выполнить только `node --test scripts/tests/stackctl.test.mjs`; отметить фактические TOOL-2 IDs, передать Router результаты/точные paths и ENV-R2 handoff, остановиться. Ни real Docker, ни runtime, ни commit; DOCS allowlist остаётся ровно из двух прежних tooling файлов.

## 8. QG-ENV — готовность и граница exposure (профиль: Quality Gate)

**Ownership:** только `REPORT/environment.md`. **Зависит от:** все BE units и TOOL-1; завершение SQL-auth части через TOOL-2 → ENV-R2. ENV-01 устранён ENV-R1: real ready exit 0/46.9 s, оба peers rebuilt/healthy, health 200; повторный ready/rebuild запрещён. Только ENV-02 оставляет QG-ENV.1 открытым. Сохранённые ENV.2/.3/.V и rebuild evidence не сбрасывать; обновление report и закрытие .1 выполняет ENV-R2.

- [x] QG-ENV.1 Завершить через ENV-R2 только недоказанную SQL password-auth часть после TOOL-2: обе реальные PostgreSQL через исправленные `psql db-yandex -c "SELECT 1"` / `psql db-ya-metrica -c "SELECT 1"`, с отдельным positive/negative evidence, и read-only health обоих peers. Учесть уже выполненный ENV-R1 rebuild, не повторять ready/rebuild/restart/repair/migrations; running/DSN consistency не подменяют SQL auth. При сбое безопасная остановка и точный blocker.
- [x] QG-ENV.2 Повторно обнаружить DB через labels/fallback и docker inspect; получить DSN-параметры/password в памяти без записи секретов, сверить service DSN, зафиксировать безопасное evidence.
- [x] QG-ENV.3 Зафиксировать dev-заявление Q2 и текущие HTTP exposure bindings read-only; all-interface exposure не считать устранённым, production isolation — технически подтверждённой. Не требовать отдельного security change для apply/dev live; явно передать условие production deployment/release: подтверждённая защита чувствительных APIs от внешних anonymous callers, иначе production выпуск блокируется. Не менять compose/auth/network.
- [x] QG-ENV.V Сохранить readiness/exposure verdict, отметить выполненные tasks и вернуть handoff.

## 8a. ENV-R2 — повтор только SQL auth/health после TOOL-2 (профиль: Quality Gate)

**Ownership:** C, только `REPORT/environment.md`; checklist только ENV-R2 IDs и закрытие QG-ENV.1 при полном успехе. **Зависит от:** TOOL-2, сохранённый ENV-R1. Одна SQL-auth/health verification group; ни runtime/source changes, ни ready/rebuild/restart/repair/migrations/make/commits. Dev Q2 и production release condition остаются без изменений.

- [x] ENV-R2.1 Загрузить stack-control, прочитать TOOL-2 handoff и ENV-02/ENV-R1 evidence; read-only revalidate/discover текущие BASE_YA/BASE_M и health 200 обоих уже rebuilt peers, без повторного ready. Зафиксировать DB StartedAt read-only для сравнения отсутствия mutation.
- [x] ENV-R2.2 Через исправленный stackctl выполнить только `psql db-yandex -c "SELECT 1"` и `psql db-ya-metrica -c "SELECT 1"` на реальных БД; подтвердить non-loopback runtime target внутри каждого контейнера, positive результат 1 и отдельный password-auth отказ generated wrong-password probe, отсутствие секретов. Не считать trust или произвольный negative failure успехом; при недоказанном исходе остановиться без repair с точным blocker.
- [x] ENV-R2.V Обновить secret-free environment report результатами обоих probes и health, сравнением DB StartedAt/отсутствием mutation; сохранить ENV.2/.3/.V и ENV-R1 rebuild evidence. Только при полном успехе закрыть QG-ENV.1 и фактически выполненные ENV-R2 IDs; вернуть Router handoff, не начинать следующие units. Production isolation по-прежнему не подтверждена, release condition сохранён.

## 9. QG-LIVE — интеграционный HTTP smoke (профиль: Quality Gate)

**Ownership:** только `REPORT/live.md`, без runtime/test source изменений. **Зависит от:** QG-BE-R1 passed и исходного QG-CONTRACTS passed с QG-CONTRACTS-R1 passed/обоснованным N/A по [rework DAG](design.md#rework-dag-и-сохранение-checkpoints); старые checked QG-BE не разрешают LIVE при BE-01 FAILED. Dev readiness берётся из QG-ENV. Закрытый Q2 не требует отдельного security change до dev live.

- [x] QG-LIVE.1 Загрузить stack-control и проектный api-smoke-test skill, заново получить PostgreSQL параметры через docker inspect без печати секретов, BASE_YA/BASE_M из readiness; проверить выделенные fixture tenant/account и cleanup до операций записи.
- [x] QG-LIVE.2 Выполнить SM-01..04 из design на живых API с реальными PostgreSQL: anonymous/authenticated, safe malformed inputs, persistence/идемпотентность, exposure. Не писать pytest smoke/`tests/smoke/`, не переиспользовать реальный OAuth code.
- [x] QG-LIVE.V Сохранить запросы/статусы/безопасные payload и DB readback evidence с verdict, очистить только свои fixtures по заранее подтверждённым IDs, отметить tasks и вернуть handoff.

## 9a. YA-CP — implementation checkpoint yandex (профиль: Backend)

**PLAN-7 / rework:** учитывать YA-FIX-HTTP-LOG handoff; его main/test paths уже входят в allowlist YA-BE-3 (секция 3). Новый path, отдельный fix commit и расширение checkpoint ownership не нужны; единый прежний checkpoint только после LIVE по rework DAG.

**Ownership:** A, commit-only assigned implementation paths YA-BE-1/2/3 из секций 1–3 в YA; в root только свои checklist IDs. **Зависит от:** QG-LIVE. Checkpoints — операционные units existing QG gate, не новые функциональные deliverables. Для checkpoint units обязателен безопасный git-протокол [Migration Plan](design.md#migration-plan): feature-ветки по существующим правилам, полный tracked/untracked/index status и staged allowlist/diff, только явные paths без широкого staging; чужие/неопознанные изменения в сервисном checkpoint — blocker; root checkpoints используют отдельный PLAN-8 протокол сохранения foreign unstaged/untracked content/index. Не коммитить чужое. Никаких code changes, make/runtime/shipctl, merge/push/release/restore/reset/stash.

- [x] YA-CP.1 Сверить ветку, полный status/index YA, handoffs и точный allowlist секций 1–3; убедиться в отсутствии чужих/неопознанных изменений, включая заранее staged файлы.
- [x] YA-CP.2 Явно stage только assigned implementation paths YA, проверить staged names/diff и сделать ровно один безопасный локальный commit.
- [x] YA-CP.V Проверить пустой `git status --porcelain` в YA, отметить только YA-CP IDs для будущего DOCS-CP-PRE; вернуть SHA, paths, branch/status и handoff. Root docs пока могут быть dirty, FORMAT ещё запрещён.

## 9b. M-CP — implementation checkpoint ya-metrica (профиль: Backend)

**PLAN-7 / rework:** учитывать M-FIX-HTTP-LOG handoff и выбранный test file; main/counters_api/health уже входят в allowlist M-BE-2 (секция 5). Новых paths/commit units нет, прежний M-CP остаётся после YA-CP.

**Ownership:** B, commit-only assigned implementation paths M-BE-1/2 из секций 4–5 в M; в root только свои checklist IDs. **Зависит от:** YA-CP. Последовательность исключает гонку общего checklist; общий безопасный протокол YA-CP обязателен.

- [x] M-CP.1 Сверить ветку, полный status/index M, handoffs и точный allowlist секций 4–5; любые чужие/неопознанные изменения — blocker.
- [x] M-CP.2 Явно stage только assigned implementation paths M, проверить staged names/diff и сделать ровно один безопасный локальный commit.
- [x] M-CP.V Проверить пустой `git status --porcelain` в M, отметить только M-CP IDs для DOCS-CP-PRE; вернуть SHA, paths, branch/status и handoff.

## 9c. DOCS-CP-PRE — root docs checkpoint перед FORMAT (профиль: Planner)

**Ownership:** D и commit-only передача C/E: только `openspec/changes/normalize-yandex-client-failures/**`, `docs/tasks/096_yandex_client_exceptions.md`, `REPORT/environment.md`, `REPORT/backend.md`, `REPORT/contracts.md`, `REPORT/live.md`, а также строго `scripts/stackctl` и `scripts/tests/stackctl.test.mjs` по завершённым TOOL-1/TOOL-2 handoffs. TOOL-2 не расширяет allowlist. Последние два paths — единственное расширение root checkpoint allowlist, без права менять код; не оставлять tooling dirty навсегда. Не переписывать verdicts и не включать другие changes/requests/reports либо сервисные pointers. **Зависит от:** QG-LIVE, YA-CP, M-CP, TOOL-2, ENV-R2. Общий безопасный протокол YA-CP обязателен; новый approval не нужен.

- [x] DOCS-CP-PRE.1 Проверить own feature-ветку root, metadata-only полный status/index root/all service repos, handoffs и раскрытый до файлов own allowlist. Сериализовать index writers; сохранить контрольные foreign path/status/content hashes (включая untracked) и index object/mode/stage hashes по PLAN-8 без чтения foreign diff/содержимого. Foreign уже staged/неопознанный index, пересечение ownership, небезопасная ветка или гонка — blocker, не unstage/reset/restore/stash. Классифицированный foreign unstaged/untracked diff сохраняется, не требует очистки original.
- [x] DOCS-CP-PRE.2 Stage только явные assigned docs/evidence files и строго два tooling paths по handoffs, проверить только own staged names/diff, неизменность foreign entries и сделать один own root checkpoint commit. Свои фактически выполненные IDs отметить после проверок до commit; сбой — partial/blocked. Не захватывать чужие README/SERVICES/dsh/097/change/report, не читать их содержимое.
- [x] DOCS-CP-PRE.V Сверить foreign hashes/status/index до/после, отсутствие остаточного own implementation/tooling diff, чистые YA/M и зафиксированные HEAD остальных service repos; вернуть own root/YA/M SHA, manifest/status и handoff QG-CLEAN-SETUP без writes после commit. Original root может сохранять foreign diff. Этот ID включить в тот же commit по предшествующим проверкам, успех подтвердить post-commit handoff; параллельный foreign drift — blocker/rebaseline через Router, не восстановление.

## 9d. QG-CLEAN-SETUP — изолированное clean окружение (профиль: Quality Gate)

**Deliverable:** C, операционный workspace-readiness slice, не source/tooling implementation. **Ownership:** отдельный isolated root checkout/nested service worktrees и собственные ignored workspace dependencies/caches; original sources read-only, в original checklist только свои IDs после verification, сериализованно. **Зависит от:** DOCS-CP-PRE. **contextFiles:** [Migration Plan PLAN-8](design.md#migration-plan), PRE/YA/M SHA handoffs; root/nested Makefile format/lint/test и scripts/check-format-excludes.sh только feasibility/discovery, без service code и foreign contents. Один invocation ~8–12 действий, одна readiness/status группа, **без make format/lint/test/runtime**.

- [ ] QG-CLEAN-SETUP.1 Сверить PRE manifest/feature checkpoint SHAs и original foreign контрольный снимок; выбрать безопасный отдельный путь и создать root git worktree от own PRE commit, nested service worktrees YA/M от own checkpoint SHA, остальные от pinned original HEAD. Зафиксировать все service repos/SHAs, включая неагрегируемые; никакие foreign изменения/env/credentials/dirty source copies не переносить. Не symlink original source dirs; не merge/push и не менять original content/index.
- [ ] QG-CLEAN-SETUP.2 Подготовить безопасные workspace-local ignored dependencies/venv/cache без original writes и tracked lock changes. Shared existing ignored cache — только при доказанной immutable/read-only безопасности и без original editable/symlink source imports. Проверить tools/dependency readiness, реальные пути и make discovery восьми сервисов, корректный nested root status без новых excludes/skip-worktree/config, отсутствие ценных .github/.helm fixture paths; учесть необычный notification cleanup из design. Не запускать сами make checks, не менять Makefile/scripts. Недоступность/unsafe copies/auth/network либо превышение бюджета — точный blocker и варианты пользователю, не обещание готовности/новая framework.
- [ ] QG-CLEAN-SETUP.V Одной readiness/status группой подтвердить pinned SHAs, path/dependency safety и пустой `git status --porcelain` isolated root/all service repos; сверить original foreign hashes/status/index до/после. Только при успехе передать FORMAT cwd/manifest/readiness/контрольные снимки, отметить свои IDs в original после проверки; запись checklist не переносить в проверяемое дерево. На blocker вернуть partial/blocked и остановиться без FORMAT.

## 10. QG-FORMAT — корневые проверки монорепозитория (профиль: Quality Gate)

**Ownership:** isolated checkout и safe `REPORT/format.md` evidence, свои checklist IDs; исправления source только через A/B/E. **Зависит от:** успешного QG-CLEAN-SETUP, после LIVE/service/root checkpoints. Original root clean не требуется; правило clean root/all services сохраняется для всего проверяемого isolated checkout.

- [ ] QG-FORMAT.1 Сверить setup cwd/manifest/SHAs и подтвердить пустой `git status --porcelain` isolated root/all service repos; dirty → blocker без restore/reset/stash. Зафиксировать original foreign контрольный снимок, не читать foreign contents. Не создавать report/checklist до конца verification-группы.
- [ ] QG-FORMAT.2 Только из isolated root выполнить `make format`, сразу проверить isolated root/all service statuses: diff → finding владельцу, lint/test не продолжать. Если чисто — `make lint`, затем `make test`, exit codes/evidence сохранять вне tracked checkout; после группы проверить clean statuses до bookkeeping. Никаких report/checklist writes между checks, никаких checks в original. При rework повторить нужные lanes/checkpoints/setup на новых SHAs.
- [ ] QG-FORMAT.V Передать safe verdict/evidence (проверенные cwd/PRE root SHA/all service SHAs, команды/exit codes, clean statuses до/после, foreign original hashes/status/index сравнение) в DOCS-CP-FORMAT. После verification сериализованно записать report/свои IDs только в original root, не загрязнять isolated checkout; не переносить source/env/foreign patches и не скрывать FAIL/REWORK. Bookkeeping не требует повторных tests.

## 10a. DOCS-CP-FORMAT — checkpoint report/checklist после verification (профиль: Planner)

**Ownership:** только `openspec/changes/normalize-yandex-client-failures/tasks.md` и `REPORT/format.md`, evidence C commit-only без изменения verdict. **Зависит от:** завершённая verification QG-FORMAT; при FAIL/REWORK передать finding Router, не открывать SYNTH как успешный gate. Общий безопасный протокол YA-CP обязателен.

- [ ] DOCS-CP-FORMAT.1 В original root сверить own feature-ветку, PRE/setup/FORMAT handoffs, SHA цепочку и safe clean evidence isolated checkout; перенести только разрешённое report/checklist evidence, без изменения verdict. Сверить полный metadata-only status/index и foreign hashes/status/index по PRE-протоколу, сериализовать index writers. Ожидаемый own diff — только два assigned docs paths, classified foreign unstaged/untracked допустим; foreign staged/ownership collision/drift — blocker без unstage/restore/reset/stash.
- [ ] DOCS-CP-FORMAT.2 Stage только два явных own paths в original, проверить own staged names/diff и неизменность foreign entries, отметить фактически выполненные собственные IDs после проверок до commit; сделать один own локальный root docs commit. Не коммитить/читать foreign diff и не исправлять runtime. Повторные tests ради docs bookkeeping не нужны.
- [ ] DOCS-CP-FORMAT.V Подтвердить clean isolated root/all services и неизменность original foreign hashes/status/index до/после; original root может оставаться dirty только классифицированным foreign diff. Вернуть own docs SHA, реально проверенный PRE SHA/service manifest, status evidence и handoff SYNTH без новых writes после commit. ID включить в этот commit по протоколу PRE.V, сбой — partial/blocked. Не выдавать новый docs SHA за проверенный; не обходить последующие finalize/release gates, original clean если требуется решит skill.

## 11. QG-SYNTH — единый итоговый Quality Gate (профиль: Quality Gate)

**Ownership:** только `REPORT/synthesis.md`. **Зависит от:** QG-ENV, QG-BE, QG-CONTRACTS, QG-LIVE, QG-FORMAT, DOCS-CP-FORMAT. QG-FE-AUTO/QG-FE-MANUAL неприменимы: UI diff нет.

- [ ] QG-SYNTH.1 Собрать backend/contracts/environment/live/format verdicts, явно включить QG-ENV readiness/exposure и корневые format/lint/test evidence; проверить полноту evidence и approval; выдать единый APPROVED либо REWORK/BLOCKED с точными findings и владельцами.
- [ ] QG-SYNTH.2 При findings вернуть Router rework в соответствующие ownership units и повтор затронутых lanes; не разрешать sync/archive при незавершённом live evidence. Q2 закрыт: отдельный security change не блокирует dev verification/sync/archive; передать Router явное условие production deployment/release — подтверждённая защита чувствительных APIs, без её evidence production выпуск запрещён.
- [ ] QG-SYNTH.V Зафиксировать окончательный verdict, отметить свои tasks и вернуть handoff Router; самостоятельно не начинать archive/release.

## 12. SPEC-FINAL — синхронизация и завершение спецификаций (профиль: Planner)

**Ownership:** D — этот change, `openspec/specs/yandex-client-failures/spec.md`, `openspec/specs/yandex-peer-http-contract/spec.md` и archive только этого change. **Зависит от:** QG-SYNTH APPROVED. Runtime/сетевой hardening не входит. Последовательность: sync → strict validation → archive → skill task-finalize через Router. Соблюдать предусловия и gates самих skills, включая readiness до sync/archive; дополнительных approval gates для sync/archive не вводить.

- [ ] SPEC-FINAL.1 Загрузить openspec-sync-specs и синхронизировать три delta specs (включая ADDED requirement repository-process-tooling) в main specs после выполнения обязательных предусловий skills; не менять общепроектные auth/client specs.
- [ ] SPEC-FINAL.2 Повторить `openspec status --change normalize-yandex-client-failures --json` и `openspec validate normalize-yandex-client-failures --type change --strict`, убедиться в фактическом завершении реализационных/QG tasks и наличии финального apply approval; production deployment/release условие Q2 передать Router отдельно, не превращать его в требование security change до dev sync/archive. Соблюдать gates skills; собственные SPEC-FINAL checkbox отметить по завершении соответствующих действий.
- [ ] SPEC-FINAL.3 Загрузить openspec-archive-change и архивировать change после sync и успешной strict validation, соблюдая gates skill; выполнить требуемую task-finalize проверку после archive.
- [ ] SPEC-FINAL.V Вернуть Router handoff для продолжения через skill task-finalize с уже выполненными sync/archive; merge/release и их approval gates выполняет только Router по skill. PLAN-2 не запускает финализацию.
