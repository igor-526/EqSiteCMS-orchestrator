# Design — restore-seo-qa-readiness

Тикет: новый запрос «Сделай» после `docs/tasks/110_seo_tasks.md`. Дата: 2026-11-07. Зоны: root QA tooling и test configuration `ya-metrica-service`.

## Context

Мотивация — proposal.md. Источник фактов — `docs/reports/seo-metrica-task-monitor.md`, §§77–105; `.qa/seo-metrica-task-monitor/QG-{ENV,LIVE}/prerequisites.md`; `QG-FE-MANUAL/handoff-notes.md`, строки 38–48. Прежний change не редактируется.

| Наблюдение | Установленный контракт | Вывод, не гипотеза |
|---|---|---|
| PG/API | ENV обнаружил только app stack, нет test target/DB/role/actors/isolation/permits, current-source неизвестен | Не доказана неисправность Docker/БД; подтверждено отсутствие prerequisites |
| contrast | `scripts/qa/browser/assertions.mjs` вычисляет RGB/RGBA ancestor compositing, отказывает при image/opacity/filter/blend/pseudo/overlap; README прямо описывает unsupported | Unsupported не автоматически bug: first determine paint/reason, не выключать guards |
| retry | `supplemental.mjs:72` использует exact role/name matcher; контроль DOM дал disabled=false/ariaDisabled=null, explicit retry не достигнут | Matcher contradiction, а не подтверждённый product defect |
| smoke | `.agents/skills/api-smoke-test/SKILL.md` существует, LIVE получил unknown skill от штатного loader; текущий catalog также не содержит skill | Внешний runtime/catalog blocker; нельзя объявлять отсутствующий файл или чинить DSH молча |
| collection | два `tests/{unit,integration}/test_maintenance_topology.py`; `pyproject.toml` не задаёт import mode; default `make test` фильтрует infrastructure лишь после collection | Подтверждённая pre-existing collision, product topology не меняется |
| a11y | modal empty/reload independently closed 2/2 PASS, axe0; card/forbidden старые 2/6/1 violations | Modal не переоткрывать; старый palette — отдельное ограниченное backlog решение |

Root уже содержит чужой diff в `scripts/qa/infra/{README.md,contracts.py,*.schema.json}` и `scripts/tests/test_qa_infra.py`, shipping и SERVICES; его не присваивать. В DSH есть чужой package/lock diff. В этом change эти файлы read-only.

## Goals / Non-Goals

**Цели:** проверяемые helper semantics; конечная диагностика retry; штатный offline readiness contract с точным операционным runbook; полная collection без коллизии; честное разделение blocked-tool/blocked-env/unreproduced и product FAIL.

**Не цели:** переделка SEO UI/API, ACL/auth bypass, новые endpoints, migration/schema/vendor/worker/AsyncAPI изменения, root aggregate order, все долги монорепозитория, сбор секретов, новый smoke/lifecycle harness, исправление DSH или палитры. Здесь нет разрешения реального HTTP/DB/Docker даже на read. Пользовательское approval этого плана впоследствии разрешит кодовые units, но не перечисленные runtime действия.

## Decisions

### A. Contrast: диагностика прежде расширения paint support

Владелец — Backend root tooling (`QA-BROWSER-1`). Сохранить `checkContrast`, schema thresholds и существующий runner. Добавить безопасный `unsupportedReason` enum: `color-format`, `background-image`, `opacity`, `filter-or-blend`, `pseudo-paint`, `overlap`, `not-visible`; не сохранять DOM text/styles/raw HTML. Error/runner сохраняют stepId/state и reason без ratio. При ошибке generic API `contrast_unsupported` сохраняется для совместимости.

Synthetic fixtures должны изолировать каждую причину и поддерживаемые RGB/RGBA/transparent ancestor случаи. Аналитические ratios: black/white 21, одинаковые цвета 1, alpha существующего regression 12.6347 ±0.001; независимый расчёт expected, не тот же implementation. Normal/hover/focus/error — отдельные scenario IDs, с явным проверенным error applicability. Не объявлять ошибкой сам отказ на градиент/opacity/неоднозначный overlay.

Точный исходный `UI-QA-07-error`/`UI-QA-07-contrast` переносится как неизменённый вход в ignored evidence и запускается на том же synthetic production build после approval. Если причина корректная, helper граница документируется, исходные ветки остаются blocked; чтобы получить numeric acceptance на таком paint понадобится отдельное решение, не fake PASS. Если отказ ошибочный для поддерживаемой геометрии/цвета, локально исправить классификацию/вычисление с negative overlay regression. Расширение CSS color spaces, screenshot pixel sampling, gradient rasterization — вне scope. Альтернатива axe-only отвергнута: не доказывает требуемые numeric state assertions.

### B. Retry: finite диагностика, не product fix

Владелец — Frontend test tooling (`QA-RETRY-1`), product `services/frontend/**` только read. Существующий supplemental script и `browser-check.mjs` — источники, не новый runtime harness. Добавить reusable сценарный модуль `scripts/qa/browser/fixtures/seo-post-retry.mjs` к существующей fail-closed synthetic инфраструктуре и focused regression `scripts/tests/qa-post-retry.test.mjs`; не переписывать старую ignored историю.

Сначала ровно исходный role/name/confirmation input, затем безопасные признаки: locator count, accessible name match boolean, native disabled, aria-disabled, loading, attached/visible, stale/remount, requests counters. Не сохранять пользовательский текст, auth headers, response body или raw DOM. Проверить import provenance `playwright/test`, совпадение browser/expect версии и AntD accessible-name semantics. Подозреваемая split-Cyrillic accessible name — гипотеза, не факт. Разрешён устойчивый semantic locator только после доказательства причины; generic `.ant-btn-primary`, обход role через `evaluate(click)`, увеличение sleep/timeout вместо ожидания состояния запрещены.

Finite cases: 400/403/502/503/network с явным retry→202, отдельный 401 auth path, pending/double-submit, истинный disabled/ambiguous-name negative controls. До retry posts=1/reads=1 (после исходного открытия), не возникает auto-retry/reset. После retry posts=2; 202 закрывает confirmation и показывает принятие, не completion. Явный «Обновить список» увеличивает reads на1; не добавлять polling/optimistic запись. При unreproduced before closure blocked, не генерировать искусственный product FAIL. Если диагноз требует product fix, остановка и передача Router нового scope.

### C. Readiness: подготовка контракта, не самовольный provisioning

Владелец — Backend root tooling (`QA-ENV-1`). Новые `scripts/qa/readiness/{README.md,profile.schema.json,validate.py,examples/profile.template.json}`, `scripts/tests/test_qa_readiness.py`. Validator строго offline, stdlib Python, без Docker/HTTP/DB imports/subprocess/env/credentials. Это admission validator, не конкурент `scripts/qa/infra/run.py` и не issuer permit. CLI контракт: `python3 scripts/qa/readiness/validate.py --profile <path>`, exit0 `offline-profile-valid`, exit2 safe invalid/missing field codes. Шаблон намеренно неполон и невалиден, содержит null placeholders, не executable consent.

Профиль v1 включает:
- change/runId; безопасные opaque target IDs и endpoint scheme/host/port без userinfo/query; dedicated API project/network identity и external isolation attestation refs;
- PG target refs для нужных сервисов, database/role `_test`, explicit dedicated cluster/ACL attestation; точные owned resource IDs, schema/runId pattern; отдельные PG acceptance и API fixtures namespaces, не смешивать runner schema с API DB;
- source/runtime revisions и проверяемый attestation ref для соответствия build→source, неизвестное null блокирует runtime;
- tenants A/B и actor refs SEO-only/SEO+ADMIN/non-SEO/ADMIN-only, anonymous case; `credentialRef` — opaque идентификатор operator secret channel, не путь для чтения validator;
- fixture IDs, ожидаемые totals/order/pages, history после unbind, provider binding refs; operation owner и residual journal;
- ссылки на реальные operator consent records/manifest/permit, exact target/resources/actions/expiry и bounded setup/test/cleanup; перечисление не является разрешением;
- smoke `diskPresent`, `runtimeLoadVerified` и external owner ticket ref; отдельно optional synthetic queue/binding/worker и vendor status=unchecked. Отсутствующий optional POST permit блокирует POST, не разрешённые read/PG группы.

Runbook описывает две штатные ветки: предоставленный заранее выделенный test stack; либо оператором создаваемый отдельный test project/cluster по exact permit. Не копировать app `.env`, не использовать app volumes/DB/public. Сначала operator согласует target/resources/actions/expiry/isolation, потом подготавливает проект/сеть/БД/роль/ACL/миграции в рамках разрешения. `stackctl` — discovery/readiness только для поддерживаемых сервисов; неподдерживаемые — существующие service Make/Compose команды под проверенной dedicated project/config identity, а не расширение stackctl. До предоставления target невозможно подставить реальные argv: runbook содержит placeholders и обязательный operator review resolved config, не запускаемый универсальный provisioner.

PG-01..04 используют уже существующий registry `change=seo-metrica-task-monitor`, четыре exact nodes `test_metrica_task_list_postgres.py::{test_aggregate_identity,test_status_order_pagination,test_consistent_read_snapshot,test_history_survives_cleanup}`, их manifest/permit и runner root `.qa/seo-metrica-task-monitor/INFRA-1/<runId>/`. Не добавлять новый change в registry, не переносить старый scope; новое readiness evidence лишь ссылается на разрешённый запуск. Команды `preflight --kind pg --manifest <provided> --permit <provided>` / `run ...` через `python3 scripts/qa/infra/run.py`; runner сам использует service interpreter, exact-node collection gate и fresh owned schema. Preflight offline, exit0 не real PG. Здесь ни один из них не запускался.

API preparation reuse: штатный backend SEO seeder и `maintain/provision_seo_smoke_user.py` умеют только одного SEO actor; они НЕ доказывают готовность A/B и всех ролей. Runbook назначает operator создание остальных synthetic fixtures через существующее управление/seed/явно согласованные операции, фиксирует IDs/relations и cleanup только по ownership, не по username. Если штатные средства не позволяют получить fixture без нового кода — blocked и Router назначает отдельный bounded fixture unit после уточнения путей; не писать скрытый SQL/harness. Persisted history поставляет acceptance owner согласно четырём PG cases и прежнему SM-03, не одноразовый LIVE helper.

### D. Smoke runtime — внешний dependency, не DSH patch

Есть disk entry `.agents/skills/api-smoke-test/SKILL.md` и совместимый `.claude/skills/api-smoke-test/SKILL.md`; credential files рядом не открывались. Наличие каталога не свидетельствует о runtime registration. Владелец DSH catalog/skill loader находится вне ownership EqSiteCMS; Router передаёт запрос владельцу runtime: зарегистрировать существующий skill штатным механизмом и дать новую сессию с доступным `api-smoke-test`. Нельзя редактировать `dsh/home/profiles/web/{package.json,pnpm-lock.yaml}` или угадывать preset mapping.

В readiness README — минимальный diagnostics/handoff: disk paths, штатный unknown-skill result, ожидаемое появление catalog entry и успешный `skill(name="api-smoke-test")`, без credentials. Внешнее исправление не checkbox местного исполнителя. Smoke только через этот skill на реальном API/PG после допуска; не создавать pytest smoke или читать файл вручную как замену недоступному loader. Vendor input refs отсутствуют: сохранять unchecked. Для synthetic POST возможны только заранее разрешённые изолированные binding/queue/worker; 202≠delivery≠completion. Если production worker нельзя безопасно остановить до vendor boundary — POST blocked, не вызывать реальный парсинг.

### E. Collection — importlib, без удаления тестов

Владелец Backend Метрика (`METRICA-COL-1`). Установить `--import-mode=importlib` в существующем `addopts` вместе с `--strict-markers`, сохраняя pythonpath/testpaths/markers. Сначала exact before: `.venv/bin/python -m pytest --collect-only -m 'not infrastructure'`; выполнить в service cwd без network. Проверить обе topology функции/числа до/после AST inventory и collection без marker. Выбран importlib вместо package-marker каскада или переименования тестов: сохраняет node IDs и минимизирует ref churn. Риск локальных `from tests...`/bare imports проверяется до правки; если потребуется broad rewrite — partial и split, не скрытый scope.

Добавить `scripts/tests/test_metrica_collection.py` в root: subprocess только service `.venv/bin/python`, finite collection двух topology файлов и четырёх PG nodes, проверка обоих module identities/неизменного inventory, никакого тестового runtime подключения. Scope включает `services/ya-metrica-service/pyproject.toml`; два topology файла и `tests/conftest.py` read-only, допускается только доказанная минимальная import compatibility closure в этих трёх файлах. Бизнес assertions и инфраструктурные fixtures не меняются. Final-service: полный `make test`, `make lint`, canonical Ruff check/format-check; другие failures остаются отдельными фактами.

## Access matrix

Новых/изменённых endpoints нет; контрольная матрица сохранена также в `specs/qa-readiness-profile/spec.md`.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/seo/metrica/tasks` | Protected Read exception | SEO-only, SEO+ADMIN | 401 до query/peer | 200, invalid query400, non-SEO/ADMIN-only403, peer error502 |
| GET | `/api/metrica/tasks`, valid selector | Internal Trusted Network Read exception | trusted peer | 200 / invalid query400 | те же200/400, Cookie/Bearer игнорируются |
| GET | `/api/metrica/tasks`, missing/invalid selector | Internal Trusted Network Read exception | trusted peer | 401 до query/storage | 401, auth не заменяет selector |
| POST | `/api/seo/parse-jobs` | Protected Write | SEO-only, SEO+ADMIN | 401 | 202 / invalid400 / без SEO403 / dependency502 / queue503 |

Причины GET exceptions: служебная tenant history и внутренний peer без public consumer surface. Spoof tenant B из browser не пересылается; SEO+ADMIN не даёт права на чужой tenant. AC-01/02 требуют отдельных anonymous/authenticated outcomes, не смешивать network auth и identity hint. Production external-isolation gate неизменён.

## Deliverables и ownership

| Deliverable | Владелец | Изменяемые пути; потребляемый контракт (read-only при apply) | Исключения |
|---|---|---|---|
| A — computed contrast | Backend | `scripts/qa/browser/{assertions.mjs,runner.mjs,schema.mjs,README.md}`, `scripts/qa/browser/fixtures/{surface.html,scenarios.mjs}`, `scripts/tests/qa-browser.test.mjs`; delta agent-acceptance-tooling contrast | существующий `fixtures/server.mjs` read-only; при необходимом wiring изменение сначала согласовать Router |
| B — retry fixture | Frontend | новые `scripts/qa/browser/fixtures/seo-post-retry.mjs`, `scripts/tests/qa-post-retry.test.mjs`; delta agent-acceptance-tooling retry | shared A paths не менять; production frontend не менять |
| C — readiness | Backend | новые `scripts/qa/readiness/**`, `scripts/tests/test_qa_readiness.py`; delta qa-readiness-profile | `scripts/qa/infra/**`, `scripts/tests/test_qa_infra.py`, SERVICES, Makefile, DSH read-only |
| D — collection | Backend | `services/ya-metrica-service/pyproject.toml`, минимальная import closure `tests/conftest.py`, `tests/{unit,integration}/test_maintenance_topology.py`, новый `scripts/tests/test_metrica_collection.py`; delta python-test-collection | runtime topology/assertions не менять |
| E — независимый gate | Quality Gate | только `.qa/restore-seo-qa-readiness/QG/`, будущий `docs/reports/restore-seo-qa-readiness.md`, собственные checkbox | не исправляет пути A–D |

Specs при apply неизменяемый approved контракт; изменения требований — только Planner через Router. Общий tasks.md: каждый исполнитель изменяет только свои checkboxes, handoff последовательно Router. Неназначенная dependency closure — blocker, не разрешение взять чужой файл.

## Execution units

Каждый unit — один slice, 5–8 содержательных действий и одна verification-группа; checkpoint/commit не отдельный unit.

| Unit | Профиль | Deliverable / ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| QA-BROWSER-1 | Backend | A, перечисленные paths | approval | scoped browser helper suite CT-01..03 | design §A; delta agent-acceptance-tooling contrast; assertions.mjs; qa-browser.test.mjs; прежние scenarios.json и browser-check.mjs для exact двух cases |
| QA-RETRY-1 | Frontend | B, два новых файла | QA-BROWSER-1 | один finite synthetic RT-01..03 прогон | design §B; delta retry; прежний supplemental.mjs:1–55,72; существующие fixtures/server.mjs и runner.mjs; handoff A |
| QA-ENV-1 | Backend | C, readiness paths/tests | approval | offline validator/schema/runbook suite ENV-01..03/SK-01 | design §C/D и permissions; delta readiness; scripts/qa/infra/README.md:1–169; backend README:91–129; прежние ENV/LIVE prerequisites |
| METRICA-COL-1 | Backend | D, config и collection closure | approval | COL-01..03 + final-service Метрики | design §E; delta collection; pyproject.toml; tests/conftest.py; два topology файла; service Makefile |
| QG | Quality Gate | E, evidence/report | все четыре owner units | независимые root suites + full Метрики; внешний readiness finite census | design Test matrix/permissions; owner handoffs; три delta; scoped diff |

DAG:

```text
approval ─┬─ QA-BROWSER-1 ─ QA-RETRY-1 ─┐
          ├─ QA-ENV-1 ──────────────────┼─ QG ─ approval дальнейших операций
          └─ METRICA-COL-1 ─────────────┘
```

A/C/D могут идти параллельно, B после A исключает shared runner drift. Router operations ниже не являются скрытыми агентными кодовыми units и не запускаются этим DAG. Профиль **QG-LITE**: код в двух контурах (root tooling, Метрика), миграций/NATS/API/UI diff нет. QG-FE-MANUAL отдельным unit неприменим — product UI не меняется; QG сам запускает synthetic browser helper cases и инспектирует screenshots по необходимости. Реальные PG/API и прежние UI acceptance не дублируются QG этого change.

## Prerequisites / permissions и операции Router

| Фаза | Владелец | Нужные inputs/разрешение | Действие и граница |
|---|---|---|---|
| PLAN | Planner | нынешний scope | read files, OpenSpec/static only; никаких DB/Docker/HTTP/setup/cleanup |
| Код A–D | профильные агенты | явный approval этого change | менять только ownership, offline tests и synthetic localhost UI, без реальных API/vendor/DB; deps install не подразумевается |
| OP-ENV admission | Router + оператор среды | предоставленные безопасные identities и изоляция, source attestation, dependency checkout | статически review resolved target/profile/runbook, штатная загрузка smoke skill после внешнего исправления; это не PASS доступности |
| OP-ENV setup | оператор среды; не Planner/LIVE | **отдельный exact permit**: project/network/volumes, PG clusters/DB/roles/ACL, API migrations/fixtures, target/resources/actions/expiry/isolation/consentRef | bounded provisioning только выделенных ресурсов; существующий runner НЕ создаёт DB/roles; no app fallback |
| OP-ACTORS | оператор + acceptance owner | точные tenant/actor/fixture IDs, role scope, setup/test/cleanup разрешение и secret-channel refs | создать synthetic actors A/B/history/binding только штатными средствами; conflicts→stop, не менять настоящих пользователей |
| OP-PG | прежний acceptance owner BE | свежий runId/schema, existing manifest/permit, QA_INFRA_PG_URL из operator channel, test-only роль | существующий guarded runner PG-01..04, schema only; test role no superuser/CREATEDB/CREATEROLE/BYPASSRLS/non-test CONNECT |
| OP-READ | прежний LIVE | test API/peer realPG, isolation/current-source, actors и read permit, доступный smoke skill | реальные anonymous/authenticated SM-01..03; browser real UI требует отдельный UI consent |
| OP-POST | прежний LIVE + operator queue owner | **отдельный synthetic POST permit**, exact binding/queue/delivery/worker IDs, no vendor egress, разрешённый readback/cleanup | SM-04 только synthetic; готовность HTTP health недостаточна, создание NATS/Redis resources отдельно согласуется |
| OP-CLEANUP | тот же operator | ещё действующий permit на exact owned IDs | удалить только своё; expiry/неизвестная ownership→stop/residual, новый permit до дальнейшего действия |

Exact permit содержит target identity, безопасные ресурсы, allowlisted actions (включая каждое DB/role/volume create/drop если нужны), время expiry с timezone, независимый consentRef, подтверждённую изоляцию, cleanup budget и владельца. Оператор предоставляет реальное согласие, агент не выпускает его сам. Ни один placeholder/template не принимается за permit. Runtime budget: ≤120s scenario, ≤10s HTTP, ≤15min группа, cleanup≤30s на runner resource; максимум 2 явно разрешённых infra repairs, затем stop; один targeted QG recheck с previousRunId. Общего repair mandate нет.

## Test matrix

Scenario IDs соответствуют именам в delta; variant groups конечны. Один независимый evidenceOwner `QG` для всех свойств этого change; owner self-check сохраняется в своём unit и не заменяет QG. Для прежнего product acceptance прежние BE/LIVE остаются единственными владельцами и не пересчитываются здесь.

| riskId | scenarioId | unit | testPath/command | evidenceOwner | prerequisites | isolation | permission | budget | stopCondition | status |
|---|---|---|---|---|---|---|---|---|---|---|
| R-COLOR | CT-01 | QA-BROWSER-1 | `node --test scripts/tests/qa-browser.test.mjs`, analytic values + state variants | QG | existing frontend Playwright/Chromium | synthetic loopback,1366×768 | code approval | group≤15min, case≤120s | missing deps/unknown egress | planned |
| R-PAINT | CT-02 | QA-BROWSER-1 | тот же suite, unsupported enum/negative fixtures | QG | fixture paint cases | no real API | code approval | та же группа | fake ratio/unsafe diagnostics→FAIL | planned |
| R-EXACT | CT-03 | QA-BROWSER-1 | прежний `QG-FE-MANUAL/browser-check.mjs`, QA_IDS двух исходных cases; adapted copy под новым evidence root | QG | тот же production build/source fingerprint и synthetic routes | real service calls aborted | code approval, только synthetic | ≤2cases×120s | unreproduced/legitimate unsupported→blocked closure | planned |
| R-MATCH | RT-01 | QA-RETRY-1 | `node --test scripts/tests/qa-post-retry.test.mjs`, пять error variants→202 + negative disabled/ambiguous | QG | Playwright/expect версии; build | synthetic routes, unknown abort | code approval | group≤15min | product fix нужен→stop | planned |
| R-AUTH | RT-02 | QA-RETRY-1 | тот же suite,401; pending/double-submit regressions | QG | synthetic auth refresh | без credential input | code approval | та же группа | real request attempted→FAIL | planned |
| R-EVIDENCE | RT-03 | QA-RETRY-1 | exact supplemental role/name matcher before/after diagnostics | QG | baseline fixture input неизменен | safe DOM booleans only | code approval | один before/after и один recheck | before PASS→unreproduced, не closed | planned |
| R-ADMISSION | ENV-01/02/03 | QA-ENV-1 | `python3 -m unittest discover -s scripts/tests -p test_qa_readiness.py` | QG | stdlib; complete/invalid synthetic profiles | offline, socket/subprocess/env access negative guard | code approval | ≤120s | network/secret access→FAIL | planned |
| R-SKILL | SK-01 | QA-ENV-1 | readiness docs + static disk path/capability matrix tests | QG | disk skill entry, known runtime error ref | no credentials read | code approval | ≤120s | не выдавать disk PASS за load PASS | planned |
| R-COLLECT | COL-01/02/03 | METRICA-COL-1 | новый `scripts/tests/test_metrica_collection.py` через root unittest; service collect-only; `make -C services/ya-metrica-service test` | QG | service .venv/uv.lock | deterministic conftest,no infra tests | code approval | collection≤120s, full≤15min | mismatch/node loss/real network→FAIL | planned |
| R-GATE | COL-02 | METRICA-COL-1 | final-service `make lint`; `.venv/bin/ruff check .` и `.venv/bin/ruff format --check .` в service cwd | QG | canonical Makefile/env | offline | code approval | group≤15min | other failures reported,not hidden | planned |
| R-REAL | ENV-04 + AC-01/02 | Router OP-PG/OP-READ; не кодовый unit | existing guarded PG nodes + smoke skill SM-01..03 | прежние BE/LIVE, ссылки в QG | dedicated targets/actors/history/current-source отсутствуют | dedicated PG/API | отдельный exact permit отсутствует | group≤15min | missing inputs→до подключения stop | blocked: inputs/permit отсутствуют |
| R-RUNTIME | SK-02 | Router / внешний DSH owner | штатный `skill(name="api-smoke-test")` в новой session | QG для availability; LIVE для smoke | external registration | catalog only | отдельный scope runtime owner | одна загрузка после handoff | loader unknown→blocked | blocked: внешняя catalog entry отсутствует |
| R-VENDOR | ENV-05 | Router OP-POST / прежний LIVE | существующий SM-04 через smoke skill | прежний LIVE | synthetic queue/binding/worker/no-egress не предоставлены | isolated delivery; no vendor | отдельный POST/queue permit отсутствует | ≤120s | vendor risk/permit missing→stop | blocked; vendor unchecked |

Для root helper suite текущий `QA_EVIDENCE_ROOT` ограничен старым hardcoded prefix. A переносит **только свой** browser test evidence contract: default для новых запусков `.qa/restore-seo-qa-readiness/QA-BROWSER-1/`, разрешённые lane roots нового change и прежний legacy prefix, без wildcard/absolute escape/symlink/overwrites. Negative path tests обязательны; предыдущие ledgers не переписываются. B/C/D используют собственные новые paths. QG выбирает `.qa/restore-seo-qa-readiness/QG/` и exclusive children; логи/скриншоты/JSON не в docs/reports. Ledger поля и fingerprint invalidation — `agents/howto/verification-policy.md`.

Root verification: scoped тесты каждой зоны, не root Make aggregate. Последняя сервисная граница только Метрика; backend/FE full не повторять, их production code не меняется. QG независим: root suites по назначенным paths, один full Метрики на актуальной revision плюс его lint/canonical checks; collection-only не PASS SQL semantics. При missing runtime внешние строки остаются blocked/unchecked; не выдавать новый зелёный SEO QG автоматически. Профиль QG-LITE может отдельно оценить offline code, но итоговый отчёт обязан сохранить недоступную операционную acceptance и внешнюю зависимость явно.

## PostgreSQL для smoke-тестов

Discovery Docker/inspect/подключения в PLAN запрещены и не выполнялись. По прежнему ENV предоставлен только app stack, это не test target. Параметры test контейнера берёт оператор через штатные инструменты **после отдельного допуска**, без env dumps/secrets. Значения host/port/database/role и target/resources нельзя угадывать. Пока это blocked prerequisite, а не дефект PG и не обязательство незаметно создать роль/БД. Existing runner isolation guards/registry остаются неизменны.

## Manual QA steps (UI тестирование)

Product UI diff отсутствует; отдельная полная ручная CMS матрица неприменима. Helper проверки Chromium desktop1366×768, fixture-only; before/after сохраняют точные locators/state/input/keys и fingerprints. Старые SEO browser rechecks и квоты не перезапускаются автоматически новым change.

## Risks / Trade-offs

- [Unsupported может оказаться корректным] → сохранить explicit blocked, не обещать numeric PASS на сложном paint. Дополнительный renderer — новый scope.
- [Importlib меняет import semantics] → full service collection и suite; при широкой closure bounded split, не удалять проверки.
- [Readiness без targets не создаёт среду] → код и runbook готовы к применению независимо; реальные операции явно заблокированы до inputs и exact permits.
- [Smoke registration внешний] → request runtime owner, не изменять соседний DSH diff и не подменять skill новым harness.
- [Нужны дополнительные fixture средства] → existing provisioning только SEO; при невозможности A/B setup — blocked с конкретной недостающей штатной операцией, не самовольный SQL.
- [Старый card/forbidden contrast] → решение BACKLOG-A11Y-CARD: deferred/non-waived, новые helper/SEO результаты не закрывают. Граница будущей задачи: исходные unbound/bound card и non-SEO/ADMIN forbidden states, existing selectors, exact axe before/after, feature-local text styles, 1366×768; никаких shared palette/theme/disabled/outline изменений без отдельного proposal. Новую docs/tasks задачу назначает Router; этот PLAN её не создаёт.

## Migration Plan

1. Approval новых артефактов; затем A/C/D параллельно, B после A; никаких product migrations.
2. Независимый QG-LITE и один report этого change; blocked externals сохраняются. Старый SEO change не менять, пока Router отдельно не возобновит его acceptance по прежнему контракту и явному разрешению новых запусков.
3. При необходимости откатить только свои helper/config изменения, сохранив историческое evidence. Runtime cleanup лишь по действующему exact permit; git rollback не authorization teardown.
4. Sync/archive/finalize только отдельным Router workflow после требуемого положительного verdict/approval; этим планом не разрешены.

## Open Questions

Не блокируют создание code artifacts, но блокируют операции: кто внешний владелец DSH registration и когда даст сессию со smoke skill; какие точные test project/PG/API targets/resources и permits предоставит оператор; какие synthetic actor/history/binding inputs будут доступны штатно. Выбор product исправлений или ослабление paint/access policy не оставлены на усмотрение исполнителя — они запрещены этим scope.
