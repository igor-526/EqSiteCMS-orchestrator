# Design — harden-agent-verification-pipeline

Задача: [109](../../../docs/tasks/109_agent_pipeline_hardening.md). Дата планирования: 2026-10-29. Контуры: agents/rules, root tooling, test-only SEO/Метрика; Яндекс — read-only producer.

## Context

Мотивация — [proposal.md](proposal.md). Фактически проверено:
- `AGENTS.md` задаёт targeted проверки и финальный suite; `agents/backend.md` §504 и `agents/frontend.md` §§13–14 требуют пересекающиеся полные команды. `repository-process-tooling` содержит раннее требование root repeat, противоречащее scoped QG: оно меняется полным MODIFIED блоком.
- `scripts/qa/run-scenarios.mjs` уже умеет goto/click/fill/wait/press/checkVisible/checkText/screenshot, Chromium 1366×768, axe/report; не умеет assertion focus/hidden/geometry/contrast. Axe сейчас проверяет всю страницу, traces включают raw network/sources. Не создавать второй runner.
- `scripts/qa-browser.mjs` — legacy wrapper с CMS 1920×1080 и mobile/tablet. CMS направить в канонический runner; site-* policy сохранить.
- stackctl уже поддерживает `yandex-service`, `ya-metrica-service`, обе их DB и TCP auth gate. Недостают `seo-service`, `seo-scheduler`, `seo-maintenance`, `db-seo`; соответствующие Compose keys/container names существуют. Повторно реализовывать уже поддержанные peers не нужно.
- `services/seo-service/tests/clients/test_yandex_lifecycle_contract.py` уже вызывает реальный Яндекс serializer subprocess, но пропускает отсутствие соседа. Это основа paired HTTP acceptance, не новый продуктовый fix.
- `services/ya-metrica-service/tests/integration/test_cleanup_worker_postgres.py` уже содержит durable attempts/error_code после failure и lease cases. Не заявлять их отсутствующими; сделать постоянный безопасный acceptance-entrypoint и проверяемый no-skip режим.
- PG fixtures в обоих сервисах создают случайные схемы; SEO использует `search_path=<schema>,public`, что оставляет риск public fallback. В Метрике есть проверка DB suffix `_test`, в SEO её нет. NATS broker fixtures уже выделяют namespace, но общего разрешения и resource manifest нет.
- Анализ `analyze.py` — одноразовый reader восьми архивов с raw текстами и жёсткими путями. В постоянный collector не копировать raw контент, пути attachments и весь DSH checkout.

### Baseline
На входе зафиксированы чужие `.docker-compose/docker-compose.{seo,ya_metrica}.yml`, восемь изменённых main specs, untracked отчёт/архив 106–107 и `metrica-maintenance-protocol`. Полный `git status --short` сохранён в `.qa/harden-agent-verification-pipeline/planning/baseline.txt`. Эти пути не принадлежат change. При apply заново снять status назначенных сервисных репозиториев; их baseline на планировании не объявляется чистым. Никакого stash/restore/commit чужих файлов.

## Goals / Non-Goals

**Цель:** исполняемые воспроизводимые acceptance helpers плюс согласованные правила их использования и измерение повторов. Ссылки на существующие tests — намерение переиспользования, не evidence PASS.

**Не цель:** закрыть оставшиеся findings 106–107, изменить production DTO/handlers/transactions/AsyncAPI/roles, чинить vendor OAuth, мигрировать runtime БД, менять Compose/env/HBA, управлять глобальным DSH или fine-tuning. Если новый тест находит продуктовый дефект — failed scenario и отдельное решение Router, не скрытый runtime fix внутри этой задачи.

## Decisions

### 1. Единая staged verification policy
Создать `agents/howto/verification-policy.md`, в `AGENTS.md` дать канонический указатель и краткие нормы, профильные правила/skills ссылаются на него вместо дублирования команд. Цели Makefile не меняются только ради этой политики. Устранить неверную ссылку Backend §0 на заголовок завершения; frontend legacy docs/plans ссылку заменить scoped diff check. Канонический formatter берётся из Makefile/конфигурации данного сервиса, второй formatter не запускается поверх первого без установленной совместимости.

| Граница | Обязательная verification | Что не повторять автоматически |
|---|---|---|
| Промежуточный unit | targeted tests изменённых модулей и зависимых fixtures, scoped non-mutating lint/typecheck/format-check по доступному инструменту | полный suite/build сервиса; root aggregate |
| Последний unit сервиса | полный `make test`, `make lint`, format/check по каноническому Makefile; для FE `npm run build`, без второго запуска эквивалентных npm aliases | npm test после make test, отдельный tsc если уже включён в lint |
| Первый handoff FE до QG | scoped browser self-check выбранных по diff механизмов, evidence ID | весь browser gate |
| Fix | exact reproducer FAIL→PASS, затем impacted regression; full suite только с причиной: общий код/неизвестный blast radius/сломанный gate | фиктивный FAIL, substitute mock, весь root suite |
| QG | независимый запуск обязательных тестов затронутых зон, один full suite на сервис на актуальной revision, своей lane принадлежит evidence | чужой lane дубликат, повтор для alias той же команды |
| Docs-only | static policy/links/OpenSpec checks | runtime suites |

Если scoped команда отсутствует — использовать прямой нативный вызов инструмента на paths; полный запуск допустим как fallback с причиной `scoped-command-unavailable`, фиксируемой в ledger. Любой новый diff после suite инвалидирует затронутые evidence по dependency/blast radius, но не все независимые сервисы. Evidence ключ: scenario + revision/code fingerprint + environment fingerprint + options; rerun имеет reason и previousRunId.

Whitespace/import ordering без смены смысла и при зелёном canonical gate — minor, не unit fix/recheck. QG не форматирует чужие пути и не переключает Black↔Ruff циклически. Если canonical gate сам падает от drift — один scoped repair владельцу; его реальная причина зафиксирована.

**Альтернатива отклонена:** каждый unit запускает все commands и QG root suites — дороже и противоречит scoped правилам; полностью доверять owner tests также нельзя.

### 2. Prerequisites, ownership closure и stop conditions
В шаблон планирования добавить поля `riskId, scenarioId, unit, testPath/command, evidenceOwner, prerequisites, isolation, permission, budget, stopCondition, status`. Статусы: planned/passed/failed/blocked/not-applicable/unchecked; причина обязательна для последних трёх. Подготовка fixtures/ролей — часть законченного slice, не отдельный checkpoint. Зависимые tests, conftest, migration/head fixtures, DTO snapshots, inventories/generators заранее включаются в ownership. Пересечение файла — один владелец/последовательность, не одновременная запись.

Бюджет ~5–12 действий — эвристика, не число файлов; 2 связанных fixture не являются причиной нового invocation. При реальном превышении scope/context — atomic partial + reason scope/ownership/infrastructure/other и split. Героическое завершение запрещено. Read-once и отсутствие холостого поллинга сохраняются, но документ не переносит статистику поллинга одной выборки на другую. В context-economy заменить «bootstrap 0.5–1.5M» и обещания процентов на различение первого запроса/накопленного usage и маркированные исторические наблюдения.

Fix хранит `.qa/<change>/<unit>/reproducer-{before,after}.json`: finding/scenario, revision, safe environment identity, точные keys/input/route/DOM locator, expected/actual, timestamps. Не записывать secrets и полные payload. Если FAIL не воспроизведён — `unreproduced`/blocked; не ломать код искусственно. После fix тот же сценарий, затем regression, один QG recheck; остался дефект — stop и решение пользователя.

### 3. Канонический browser runner
Расширить `scripts/qa/run-scenarios.mjs`, вынести side-effect-free schema/assertions в `scripts/qa/browser/`. CLI сохраняет `--scenarios --auth --output-dir --base-url`; добавить `--mode self-check|qg`, `--scenario-ids`, `--timeout-ms`, `--max-scenarios`. Для CMS service selector даёт только desktop 1366×768, site-* retains own policy. Self-check не означает ослабленные assertions, только меньший явный список сценариев.

Версионированный JSON scenario: id/riskId/url/prerequisites/steps/expected/axeScope/evidencePolicy; старые поддержанные шаги остаются. Новые steps: checkHidden, checkCount, checkFocused, checkAttribute, checkGeometry (overflow/clipping/focus viewport), checkContrast (computed fg/bg/threshold/state), scoped axe include/exclude с обязательной причиной exclude. Шаги keyboard используют настоящий Chromium Tab/Shift+Tab/Enter/Space/Escape, не dispatch mock events. Unknown action/ambiguous selector/nonfinite threshold/пустой selection — ошибка до PASS. Contrast учитывает фон/alpha; unsupported gradient/image/неоднозначный compositing даёт unchecked/failed check, не вымышленное ratio. Порог задаёт сценарий по WCAG (обычный текст 4.5:1, крупный 3:1, применимые UI boundaries 3:1), запрещено снижать порог ради PASS.

Tracked синтетические fixtures в `scripts/qa/browser/fixtures/`: nested dialog pending/nonpending, скрытая sizing-копия, remount table, overflow toolbar/длинная ошибка, contrast state. Это не продуктовый UI; test runner поднимает fixture через managed bounded local server на случайном localhost port без shell `&`. Assertions имеют положительные и deliberately bad fixture variants, включая Space→Escape, focus return и public missing selector. Сортировка/page-size сценарий проверяет state/offset через fixture callbacks, не обещает реальную API проверку.

По умолчанию report содержит allowlisted sanitized URLs без query/userinfo и outcomes, не console text/raw headers. Для live authenticated страниц raw trace отключён; screenshot допускается только на разрешённом безопасном фрагменте/с маскированием чувствительных областей, иначе `evidence-redacted` и assertions вместо изображения; это отражено в QA protocol. Trace с DOM/network разрешён только на синтетических fixtures без секретов. Не сохранять raw секретный файл с намерением очистить потом. Auth input хранится отдельно ignored `.qa/`, не копируется в report. Existing report consumers получают schemaVersion и compatibility test.

**Альтернатива:** новый второй browser framework отвергнут: уже есть runner/login/browser-env и Playwright зависимости в FE; root package install не требуется. Проверить resolution через существующий browser-env, не устанавливать весь стек.

### 4. Paired wire harness
Создать `scripts/qa/contracts/` с CLI `node scripts/qa/contracts/run.mjs --manifest <path> --scenario-ids <ids> --output-dir .qa/<change>/<unit>`. Манифест выбирает allowlisted adapter id и repo path; произвольный shell из JSON не исполняется. Producer и consumer работают отдельными subprocess в lockfile окружении своих сервисов (не один `sys.executable` для обоих), иначе конфликт `core/settings` и зависимостей. Bridge передаёт bounded JSON через stdin/stdout, timeout каждого процесса, schema/error validation, безопасный summary, не raw stderr и credentials.

HTTP seed: существующий Яндекс DTO serializer → SEO ConnectedMetricaCounter/client parser; lifecycle fields present/absent counter, missing/negative/bool/wrong types, strict wire-date и fallback detail null/false/0 представлены как pattern fixtures; не добавлять product fixes ради pattern. Фактический HTTP seed импортирует production schemas, не локальную копию DTO. Synthetic helper fixtures не выдаются за проверку vendor/auth.

NATS seed: Метрика production result serializer → SEO maintenance result handler; имя адаптера и точные imports фиксируются SEO-1 после targeted чтения этих двух границ. API harness задаёт payload bytes, headers, capture storage/disposition; валидный payload и missing/wrong Nats-Msg-Id, mismatched deterministic identity, invalid timestamp. Harness transport spy допустим в paired-wire тесте, но topology/ACK acceptance отдельно на реальном broker. Production serializers/handlers не переписывать; expected dispositions берутся из действующего контракта, не придумываются. `EQCMS_MONOREPO=1` означает fail при missing checkout/dependency/scenario, standalone pytest может skip только вне обязательного acceptance. Existing `make contracts-check` остаётся совместимым; новый явный entrypoint документирован, root Makefile не расширяется, чтобы не менять четыре core suites.

### 5. PG/NATS test-only lifecycle helpers
Создать `scripts/qa/infra/` Python test-support + CLI `python3 scripts/qa/infra/run.py preflight|run --kind pg|nats --manifest <path> --permit <path>`. Run только для allowlisted test commands, subprocess argv без shell; no generic exec. Реальные credentials передаются через текущую среду процесса, не argv/log. Manifest описывает runId/change, opaque target ID, database ending `_test`, random schema prefix `qa_<runId>_...`, NATS test namespace, сценарии, timeout, cleanup intent. Permit — ignored JSON с точной ссылкой на отдельное согласие пользователя, scope target/resource prefix/setup/teardown/expiry. Router создаёт его только после явного согласия; инструмент не выдаёт consent сам. Проверка permit до соединения/CREATE/publish/delete; это защита от случайных операций, не криптографический access control.

Не выбирать app DB по умолчанию. Изоляция PG: выделенная DB `_test`, отдельно выделенная роль без доступа к product DB, unique schema, `search_path` только тестовая схема (pg_catalog доступен системно), explicit version_table_schema; extensions при необходимости — явно schema-qualified, без public fallback. Ресурс создаёт сам run; удаления по сохранённому exact manifest ownership и в finally с bounded timeout. NATS — отдельный test broker/account, unique stream/durable/subject namespace, сохранение config до/после; canonical streams не трогать. Чужую incompatible topology симулирует test-owned existing stream: проверка MUST не менять её. Crash оставляет safe residual manifest; cleanup только тем же scope/разрешением, не wildcard.

Service fixtures SEO/Метрика используют helper через явный test-support путь монорепы, только в infrastructure режиме; отсутствующий helper/permit в обязательном acceptance — fail до mutation. Standalone service unit suite по-прежнему не требует root/PG/NATS. Для одиночного checkout infrastructure тесты требуют установленный/явно переданный тот же test-support root, не незаметную копию небезопасной fixture. Исходные tests сохраняются, выделяются сценарии через node IDs. PG result подтверждается новой независимой session после rollback, lease test — двумя connection/session с bounded synchronization. Cleanup public таблиц и production topology не допускается даже при permit.

**Альтернатива:** выделять ещё один постоянный инфраструктурный сервис или вендорить helper во все сервисы отвергнуто; этот change — root monorepo acceptance с явной standalone границей, не поставка runtime зависимости.

### 6. stackctl: только доказанно недостающий SEO scope
Изменения `scripts/stackctl`, `scripts/tests/stackctl.test.mjs`, `.agents/skills/stack-control/SKILL.md` — один владелец. Добавить профиль seo: project `eqsitecms-seo`, existing `.docker-compose/docker-compose.seo.yml`, envFile `services/seo-service/.env`, serviceKeys `seo-service`, `seo-scheduler`, `seo-maintenance`; aliases → контейнеры `eqsitecms-seo-service`, `eqsitecms-seo-scheduler`, `eqsitecms-seo-maintenance`. Миграционный key не разрешать и автомиграции не добавлять. `ready` этих aliases требует `--no-migrate`, отсутствие флага — fail до build; documented command не даёт видимость применённых миграций.

`db-seo` → `eqsitecms-db-seo`, infra registry только с добавленным этим key, `buildable:false`, DB_CONFIG runtimeTcp по существующему Яндекс auth gate (правильный/неправильный password, fail closed). Existing project detection/service-key file selection не переписывать. Dry-run без lock/exec/migration. Published URL брать из inspect/runtime ports, не из defaults runner: добавить read-only `endpoints <alias...>` → `{ok, services:[{alias, urls, internalOnly}]}`; unknown/malformed mapping — безопасная ошибка. Только http(s) host/port, никакие env/query/userinfo. Сохранить contracts exit 0/1/2, stdout JSON, mutation lock, namespace allowlist, отсутствие destructive команд. Compose/env/network/auth не менять.

### 7. Offline measurement и ledger
Создать `scripts/qa/usage/collect.py` (stdlib) и JSON schemas/examples. Вход: явно переданные JSONL/ZIP `--input` и обезличенный `--ledger`; не сканировать home/DSH/attachments. Потоково ограничивать размер записи/archive, отклонять zip-slip/повреждённые входы, ничего не извлекать на произвольные пути. Использовать allowlist event fields, не text/tools payload. Terminal `assistant/message.data.usage` учитывать один раз по eventId/messageId с session identity; duplicate конфликт — ошибка. Для legacy событий без ID использовать source file+line identity и явно отметить невозможность dedup повторно экспортированных записей; один и тот же file digest повторно не суммировать. Chunks/tool/step/end не участвуют. Нет универсального inferred usage из разности total-cache: поля независимы, неизвестное — null с completeness.

Ledger schemaVersion=1: changeId, unitId, role, sessionId, invocationId, eventType(session-start/resume/handoff/finding/verification/wait), timestamp, partialReason, parentUnit/splitFrom, findingId/class/reopened, exactBefore/After result IDs, commandClass/service/revision/reason/previousRunId, start/end/category. Значения allowlisted, произвольный handoff text не хранить. Сбор ledger — явная запись root CLI `python3 scripts/qa/usage/ledger.py append ...` по событиям выполнения, без patch DSH. Команды примеров встроить в canonical verification policy и qg-lanes handoff template; session metadata берётся из доступного runtime ID или явно передаётся, отсутствие ID отмечается unknown, не угадывается.

Summary JSON/Markdown: новые сессии/продолжения/units отдельно; partial распределение (scope/ownership/infrastructure/other/unknown), first-pass = changes без product blocking / changes с завершённым первым QG (blocked отдельно); fixes с исходным FAIL и PASS / fixes с полной парой evidence, плюс coverage всех fixes; reopen по finding identity; usage по ролям/полям, measured intervals по категориям с overlaps/unknown, full suite runs по service/revision/reason. Не вычитать пересекающиеся времена как будто они последовательны. Cost/quota `not-calculated` без тарифной/квотной модели; в этой поставке вычисления денег нет.

Приёмка collector — синтетические golden fixtures, не повторное чтение архивов. Следующие реальные сопоставимые changes — сбор данных для оценки, не условие завершения tooling. Удалить недоказанные обещания экономии из context howto; исторические примеры маркировать как гипотезы/локальные наблюдения с выборкой.

### 8. Единый QG и evidence registry
У каждой строки matrix один `evidenceOwner`; до QG registry фиксирует IDs, command/revision/environment, prerequisites, budget, stop condition и ссылки на owner evidence. Независимость = QG запускает owner test на актуальном коде и сверяет assertions/границу, а не принимает его PASS. Она не требует по второму harness на то же свойство. BE проверяет fixture/transaction семантику, CONTRACTS самостоятельно исполняет paired wire и browser helper suite и проверяет протокол. ENV подтверждает разрешение/изоляцию и здоровье выделенных dependencies, не запускает product acceptance заново. SYNTH сводит без повторных suites.

Для этого change профиль **QG-FULL**: код root + SEO + Метрика (более двух зон) и реальный NATS test tooling, хотя production NATS/AsyncAPI не меняется. Применимы ENV, BE, CONTRACTS, SYNTH. FE-AUTO/FE-MANUAL — неприменимо: product frontend/site diff отсутствует; реальный Chromium для helper fixture tests — часть tooling checks CONTRACTS. LIVE — неприменимо: runtime API diff отсутствует, PG/NATS integration не называется API smoke. FORMAT — процедура scoped, не lane/agent. Не запускать product UI gate или API smoke ради root helper.

Budget по умолчанию на lane: конечный набор IDs из matrix, не более двух infrastructure repair attempts всего и один recheck затронутого finding тем же агентом; runtime acceptance timeout на scenario 120s, suite 15min (можно меньше в manifest). При превышении — failed timeout/blocked с unchecked IDs, не зелёный skip. Дополнительные scenarios вне registry — только при новом подтверждённом риске с причиной, единым evidence owner и bounded расширением; exhausted budget требует решения Router/пользователя. Waiver не заменяет разрешение destructive операций и не разрешает секреты.

## Access matrix

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| N/A | endpoint changes отсутствуют | N/A | N/A | N/A | N/A |

Новых/изменённых HTTP endpoints нет. CLI не расширяет access policy. Синтетические HTTP wire adapters не доказывают anonymous/authenticated поведение существующих маршрутов. Для будущего endpoint diff остаются обязательными отдельные access matrix rows и тесты auth/roles/чужих ресурсов; исключения здесь не вводятся.

## Deliverables

Пути ниже — allowlist изменений, не приглашение читать весь каталог. Каждый spec принадлежит одному deliverable; tasks.md отмечает каждый unit только по его факту, синхронизация main specs — после QG, не во время реализации.

| Deliverable | Владелец | Ownership |
|---|---|---|
| A — verification/ownership rules | Backend | `AGENTS.md`, `agents/{planner,backend,frontend}.md`, `agents/howto/{verification-policy,context-economy-patterns}.md`, `scripts/tests/pipeline-policy.test.mjs`; delta `repository-process-tooling` (кроме stack requirement — согласование через того же владельца последовательно) |
| B — QG/protocol integration | Quality Gate | `agents/quality_gate.md`, `agents/howto/{browser-qa-protocol,nats-jetstream-protocols}.md`, `.agents/skills/{qg-lanes,ui-qa}/SKILL.md`; delta `openspec-workflow` |
| C — browser helpers | Frontend | `scripts/qa/run-scenarios.mjs`, `scripts/qa-browser.mjs`, `scripts/qa/browser/**`, `scripts/tests/qa-browser.test.mjs`; delta `agent-acceptance-tooling` — единственный spec owner C, остальные предлагают изменение через него |
| D — wire harness | Backend | `scripts/qa/contracts/**`, `scripts/tests/qa-contracts.test.mjs` |
| E — isolated infra helpers | Backend | `scripts/qa/infra/**`, `scripts/tests/test_qa_infra.py` |
| F — SEO test integration | Backend | `services/seo-service/tests/clients/test_yandex_lifecycle_contract.py`, `tests/integration/{conftest.py,test_nats_broker.py,test_acceptance_boundaries.py}`, `tests/conftest.py` при необходимости marker/strict wiring |
| G — Метрика test integration | Backend | `services/ya-metrica-service/tests/integration/{conftest.py,test_cleanup_worker_postgres.py,test_nats_broker.py,test_acceptance_helpers.py}`, `tests/conftest.py` при необходимости strict wiring |
| H — stack support | Backend | `scripts/stackctl`, `scripts/tests/stackctl.test.mjs`, `.agents/skills/stack-control/SKILL.md`; spec amendments через A, без параллельной записи |
| I — измерение | Backend | `scripts/qa/usage/**`, `scripts/tests/test_pipeline_usage.py`; delta `agent-pipeline-measurement` |
| J — единый QG | Quality Gate | `.qa/<change>/QG-*/**`; единственный tracked report `docs/reports/harden-agent-verification-pipeline.md` — только SYNTH |

Другие сервисные tests/fixtures не расширяются автоматически. Если импортная closure требует неуказанный файл — сначала точечная корректировка ownership, не новый продуктовый scope. `agents/router.md`, DSH checkout, root Makefile, product src, Compose и восемь baseline specs исключены.

## Execution units

Сокращения contextFiles ниже: `D§X` = только секция X раздела Decisions этого design; `S(tool)` = `specs/agent-acceptance-tooling/spec.md`, `S(flow)` = `specs/openspec-workflow/spec.md`, `S(repo)` = `specs/repository-process-tooling/spec.md`, `S(usage)` = `specs/agent-pipeline-measurement/spec.md`. Все пути от корня; spec paths относительно change. Handoff dependency передаётся коротко, не требует чтения всего change.

| Unit | Профиль | Deliverable / ownership | Зависит от | Verification group | contextFiles |
|---|---|---|---|---|---|
| RULES-1 | Backend | A (6 правил + policy test) | — | policy static suite | D§1–2, S(repo), S(flow) ownership/prerequisites, analysis §§3.1–3.4; AGENTS уже в persona |
| BROWSER-1 | Frontend | C | RULES-1 | browser helper suite в Chromium | D§3, S(tool) browser/evidence, runner, browser-env, ui-qa (только вызов runner) |
| WIRE-1 | Backend | D | RULES-1 | paired harness unit suite | D§4, S(tool) wire, existing SEO lifecycle test, producer DTO interface |
| INFRA-1 | Backend | E | RULES-1 | infra helper suite (guards + real fixture selftest после permit) | D§5, S(tool) isolation/acceptance, два integration conftest |
| STACK-1 | Backend | H | RULES-1 | stackctl mocked-command suite | D§6, S(repo) stack, stackctl registry/DB gate, existing stackctl tests |
| USAGE-1 | Backend | I | RULES-1 | offline usage golden suite | D§7, S(usage), analyze.py (usage loop только как legacy reference) |
| SEO-1 | Backend | F | WIRE-1, INFRA-1 | SEO boundary acceptance group + финальный service suite | D§4–5, S(tool) wire/infra, lifecycle test, integration conftest, maintenance_results handler, producer serializer interfaces |
| METRICA-1 | Backend | G | INFRA-1 | Метрика PG/NATS acceptance group + финальный service suite | D§5, S(tool) infra/acceptance, integration conftest, cleanup_worker_postgres, nats_broker |
| PROTOCOL-1 | Quality Gate | B | BROWSER-1, WIRE-1, INFRA-1, STACK-1, USAGE-1, SEO-1, METRICA-1 | policy/protocol consistency suite | D§1–8 (только контракты команд и policy), S(flow), relevant howto/skills sections, handoff новых CLI |
| QG-ENV | Quality Gate | J ignored env evidence | PROTOCOL-1 | изоляция/prerequisites preflight | D§5,6,8, Test matrix ENV; helper manifests/permit (не credentials) |
| QG-BE | Quality Gate | J ignored BE evidence | QG-ENV | real PG/NATS acceptance + service regression review | D§5,8, Test matrix PG/NATS, F/G handoffs, scoped fixture diff |
| QG-CONTRACTS | Quality Gate | J ignored contracts evidence | QG-ENV | root tooling contracts suite | D§3,4,6–8, Test matrix root checks, C/D/H/I handoffs, S(tool), S(usage) |
| QG-SYNTH | Quality Gate | J report | QG-BE, QG-CONTRACTS | matrix/evidence/strict validation synthesis | D§Test matrix, Mapping, два QG handoff, status/validation |

Units содержат 5–10 существенных действий + verification, а не 5–10 микроправок ради количества. Для unit, впервые запускающего реальную infra, отсутствие отдельного разрешения даёт blocked без выполнения setup/teardown; non-destructive часть можно сдать partial с точным остатком. QG units — набор независимых review obligations, не checkpoint/отметка tasks.

### DAG

```text
RULES-1 ─┬→ BROWSER-1 ──────────────────────┐
         ├→ WIRE-1 ─┐                      │
         ├→ INFRA-1 ┼→ SEO-1 ──────────────┤
         │          └→ METRICA-1 ──────────┤
         ├→ STACK-1 ───────────────────────┤
         └→ USAGE-1 ───────────────────────┴→ PROTOCOL-1 → QG-ENV
                                                           ├→ QG-BE ────────┐
                                                           └→ QG-CONTRACTS ─┴→ QG-SYNTH
```

C/D/E/H/I после RULES независимы. F/G раздельные сервисы, могут параллельно после своих зависимостей. Прямые/генерируемые specs изменяет только назначенный владелец; H→A amendment последовательно, не второй writer. Sync/archive выполняет Router после approval/успешного gate и READY-FOR-MANUAL: runtime aliases этого tooling-only change пустые, rebuild продукта не требуется.

## Test matrix

Каждая строка содержит конкретную группу сценариев одного риска, не десятки отдельных checklist tasks. Paths новых helpers — реализационные targets. Spec trace — requirement/scenario из delta. Единый evidence root `.qa/harden-agent-verification-pipeline/`; файлы report ниже относительны ему. Owner evidence не подменяет QG independent run.

| ID / риск | Unit → единственный QG evidence owner | Проверка / ожидаемое доказательство | Prerequisites / stop | Trace |
|---|---|---|---|---|
| POL-01 противоречия rules | RULES-1, PROTOCOL-1 → CONTRACTS | `node --test scripts/tests/pipeline-policy.test.mjs`: stage table, aliases dedup, formatter rule, ownership closure, верные ссылки/заголовки; `QG-CONTRACTS/policy.json` | Node, tracked rules; stop на несовпадении/битой ссылке | repo workflow; flow closure/prerequisites |
| FIX-01 ложное закрытие | RULES-1, BROWSER-1 → CONTRACTS | policy fixtures missing-before/unreproduced + deliberately bad nested modal fixture FAIL→PASS, одинаковые keys/DOM state; `QG-CONTRACTS/reproducer.json` | Chromium; FAIL ожидается на bad fixture, исправление продукта не выполняется | flow Exact reproducer |
| BR-01 focus/keyboard | BROWSER-1 → CONTRACTS | `node --test scripts/tests/qa-browser.test.mjs`: synthetic Space→Escape pending/nonpending, Tab/Shift+Tab, sizing hidden, focus return/remount, отрицательные variants | existing FE Playwright deps/browser; scenario 120s, suite 15min | tool Scoped browser |
| BR-02 geometry/contrast | BROWSER-1 → CONTRACTS | тот же suite: overflow/clipping/long error, normal/hover/focus/error ratios, scoped axe, unsupported backgrounds не PASS | synthetic safe fixtures; no vendor; no mobile | tool browser table/control |
| BR-03 schema/privacy | BROWSER-1 → CONTRACTS | invalid action/selector/empty IDs, compatibility old steps, report version, secret sentinel отсутствует в report/stdout/screenshots/trace; unsafe live trace disabled | synthetic credentials only; stop при утечке | tool Безопасное evidence |
| WIRE-01 HTTP mismatch | WIRE-1, SEO-1 → CONTRACTS | `node --test scripts/tests/qa-contracts.test.mjs` и real paired manifest HTTP seed: current DTO output→SEO parser, lifecycle strict cases, per-service subprocess imports; bounded outputs | оба service lockfile env; missing peer=FAIL, not skip | tool Парная wire HTTP |
| WIRE-02 NATS boundary | WIRE-1, SEO-1 → CONTRACTS | paired manifest NATS seed production serializer→handler, valid и invalid headers/identity/timestamps; capture no storage before validation и disposition | SEO/Метрика imports, synthetic message; broker не требуется для wire assertion | tool Невалидный envelope |
| INF-01 fail-closed/isolation | INFRA-1 → BE | `python3 -m unittest discover -s scripts/tests -p test_qa_infra.py`: no permit/wrong target/public/expiry/unsafe resource/partial setup/cleanup failure, отсутствие mutation и secret sentinel | mocked command guard cases без infra; real fixture selftest только после отдельного permit | tool Изолированные fixtures |
| PG-01 persisted failure | METRICA-1 → BE | infra runner allowlisted cleanup_worker_postgres failure cases, новая session видит attempts/error_code после rollback; safe `QG-BE/pg.json` | выделенная `_test` DB/роль, permit, timeout; no skip | tool Recovery после rollback |
| PG-02 concurrency/isolation | SEO-1, METRICA-1 → BE | существующие lease/concurrency cases + regression public shadow table только в отдельной test DB; drop generated test table не открывает public fallback | та же изоляция, two connections, bounded sync; no global DROP | tool PG fixtures/public/acceptance |
| NATS-01 existing topology/replay | SEO-1, METRICA-1 → BE | infra runner selected real-broker cases compatible config и incompatible TTL/discard/durable/filter, valid serializer header replay/duplicate/ack-redelivery; config до/после не изменилась при reject | отдельный test broker/account, permit, unique namespace; no skip/silent repair | tool topology/реальная acceptance |
| STACK-01 registry/port/auth | STACK-1 → CONTRACTS | `node --test scripts/tests/stackctl.test.mjs`: SEO exact aliases, old projects, no migrate/default deny, dry-run no lock, db rebuild deny, TCP positive/negative auth outcome, endpoints dynamic/internal/malformed, existing peers regression | mocked Docker, runtime mutation не нужна; JSON exit0/1/2 | repo Ограниченная поддержка SEO |
| USG-01 usage correctness | USAGE-1 → CONTRACTS | `python3 -m unittest discover -s scripts/tests -p test_pipeline_usage.py`: duplicate events/archives, chunks/end ignored, conflicting IDs rejected, unknown fields/null completeness | synthetic golden input only, bounded parse | usage Однократный учёт |
| USG-02 process/privacy | USAGE-1 → CONTRACTS | тот же suite: 1 session/2 resumes/split, partial causes, denominators/blocked/reopen, FAIL→PASS coverage, time overlap/unknown, suite reasons; token sentinel не экспортирован, cost/quota not-calculated | allowlisted ledger, no raw DSH scan | usage Метрики/Время/Allowlist |
| ENV-01 prerequisites | QG-ENV → ENV | preflight permit scope/expiry, unique resources, DB/account isolation, timeout/cleanup manifest, helper existence; safe `QG-ENV/preflight.json` | реальный infra target и отдельное согласие; без них BLOCKED, не setup | tool fixtures; flow prerequisites |
| SYN-01 полнота | QG-SYNTH → SYNTH | matrix IDs→evidence fingerprint, нет missing critical/duplicate owners/skip PASS, review baseline untouched, status/strict validation, один итоговый report | handoff ENV/BE/CONTRACTS; unchecked ключевые блокируют | flow конечный QG |

Неприменимые оси этого change: runtime access anonymous/authenticated/roles/чужие ресурсы — нет endpoint diff; новые migrations/domain happy path — нет product schema/src diff; vendor OAuth acceptance — внешний нецелевой coverage gap, synthetic wire не заменяет; product UI manual QA — нет UI diff. Error paths, concurrency/transactions, serialized contracts, privacy и regression helpers покрыты выше.

## PostgreSQL для smoke-тестов
API smoke здесь не планируется; Docker inspect и runtime product suites на планировании не запускались. Для будущих test-only integration прогонов discovery выполняется после отдельного разрешения в ENV: определить explicit test target и dedicated `_test` DB/роль, извлечь нужные параметры в память без stdout env/credentials. `stackctl psql db-seo` проверяет существующий DB alias, но сам по себе НЕ делает product DB разрешённой тестовой целью. Не использовать runtime app DB как fallback. Если выделенной test DB нет — blocker с точным prerequisite, а не автоматический CREATE DATABASE/правка глобальных auth.

## Manual QA steps (UI тестирование)
Product CMS UI diff отсутствует. Для helper acceptance используются реальные Chromium synthetic fixtures: открыть nested wizard, сфокусировать opener, Space, Escape, assert inner/outer/focus; повторить pending; пройти Tab/Shift+Tab через таблицу до/после sort/remount; проверить toolbar viewport/long error и contrast состояний. Это автоматизированный suite BR-01..03, не запрос пользователю проверить продукт и не два полных browser gates.

## Mapping рекомендаций анализа

| Источник анализа | Scope / task mapping | Применимость |
|---|---|---|
| §2.1 и P0 FE self-check | BROWSER-1, RULES-1, PROTOCOL-1 / BR-01..03, FIX-01 | все перечисленные механизмы, selection по diff |
| §2.2, P0 paired contracts | WIRE-1, SEO-1 / WIRE-01..02 | реальные serializers/parsers, не локальные согласованные mocks |
| §2.3 rollback/lease/migrations | INFRA-1, METRICA-1, SEO-1 / PG-01..02 | reuse existing recovery/lease tests, safe fixtures; migration/head closure rule, без новой миграции |
| §2.3 topology/header replay | INFRA-1, SEO-1, METRICA-1 / NATS-01 | test-owned existing config, canonical production topology не трогать |
| §2.3 search_path isolation | SEO-1 / PG-02 | fail-closed без public fallback |
| §2.3 settings kwargs/task_expires/midnight | RULES-1, PROTOCOL-1 / POL-01 | включать config boundary и время внутри long batch в risk checklist будущих diff; чинить продукт 101/104 не требуется |
| §2.4 timeout workers/lifecycle | BROWSER-1, RULES-1 / BR-01..03, POL-01 | bounded waits, deterministic fixture lifecycle; production FE tests 103 вне scope |
| §2.4 whitespace/Black Ruff | RULES-1, PROTOCOL-1 / POL-01 | один canonical formatter, no whitespace-only rework |
| §2.4 OAuth/role fixtures | PROTOCOL-1 / ENV-01, prerequisite fields | external OAuth gap отдельно от provisionable test-role fixture |
| §3.1 дробление | RULES-1 / POL-01 | slice+tests+acceptance; эвристика, circuit breaker сохраняется |
| §3.2 ownership tests/fixtures/inventories | RULES-1 / POL-01, F/G ownership | closure заранее, не разрешение на pre-existing scope |
| §3.3 verification | RULES-1, PROTOCOL-1 / POL-01 | единая unit/final/QG/fix таблица |
| §3.4 bootstrap/cache | USAGE-1, RULES-1 / USG-01..02 | удалить неподтверждённую универсальную оценку, измерять первое сообщение отдельно |
| §3.5 polling | RULES-1 / POL-01 | сохранять no-polling, не назначать его доказанной основной причиной этих восьми архивов |
| §3.6 одноразовый QG harness | BROWSER-1, WIRE-1, INFRA-1, SEO-1, METRICA-1 | постоянные helpers/tests, ephemeral evidence ignored |
| P0 exact reproducer | RULES-1, BROWSER-1, PROTOCOL-1 / FIX-01 | FAIL→PASS или честное unreproduced/blocked |
| P1 prerequisites/risk→unit→evidence | RULES-1, PROTOCOL-1 / matrix, ENV-01 | отдельное разрешение test cleanup до исполнения |
| P1 canonical helpers/stack | C/D/E/H / BR, WIRE, INF, STACK | Яндекс/Метрика aliases уже есть; добавить только SEO и endpoint discovery |
| P2 dedup/budget | PROTOCOL-1, QG-* / SYN-01 | один evidence owner, конечные IDs, 2 repairs/1 recheck, unchecked gaps |
| §5.1–8 метрики | USAGE-1 / USG-01..02 | все 8 метрик, причины повторов, coverage/знаменатели |
| §4 fine-tuning | вне scope | явно не обоснован выборкой; веса/датасет не создаются |
| §5 оценка экономии | USAGE-1 + последующие сопоставимые changes | tooling и пилот на synthetic golden готовы в change, будущая выборка не симулируется |

## Risks / Trade-offs

- [Acceptance выявит новый продуктовый дефект] → failed evidence/отдельное решение, product src не менять; прежние незакрытые 106–107 findings не объявлять закрытыми.
- [Нет dedicated PG/NATS или согласия] → preflight blocked, без setup/cleanup; нельзя согласие на proposal трактовать как разрешение destructive тестов.
- [Shared fixture усложнит standalone service infra tests] → unit suite автономен, infra helper root явно prerequisite; no silent fallback/skip в canonical acceptance.
- [Browser trace может раскрыть auth] → raw live trace выключен до capture, sanitized allowlist reports, синтетические traces; screenshot redaction до записи.
- [Большой change] → девять independently bounded implementation units; общий scope/контракты позволяют один change, без скрытой фазовой зависимости от продуктовой переработки. Если implementation context превысит budget — circuit breaker с конкретной границей, не автоматическая цепочка micro-units.
- [Метрики неполные/несопоставимы] → unknown/coverage/denominators, no quota/cost conversion, без обещаний процентов.

## Migration Plan

1. После approval артефактов выполнить RULES-1, затем независимые helpers и test integration, затем PROTOCOL-1. Разрешение isolated runtime tests запросить отдельно до их запуска, можно продолжать безопасные offline проверки до этого.
2. Один QG по приведённому DAG; fixtures очищают только созданные ресурсы с permit, evidence остаётся в `.qa/`.
3. Router выполняет READY-FOR-MANUAL с пустым runtime списком, sync, validation, archive после успешного gate; merge/release — отдельные существующие пользовательские gates.
4. Откат tooling — возврат только собственных code/rules changes обычным согласованным workflow; product migrations/данных нет. Residual test resources удаляются только с тем же точным scope и действующим отдельным разрешением, не глобальным cleanup.

## Open Questions

Проектных блокирующих вопросов нет. Перед фактическим PG/NATS acceptance нужны явные test targets, dedicated access и отдельное разрешение пользователя на test-only setup/teardown; это runtime prerequisite, а не право запускать его на планировании. Будущая тарифная/quota модель намеренно не требуется: стоимость не вычисляется.
