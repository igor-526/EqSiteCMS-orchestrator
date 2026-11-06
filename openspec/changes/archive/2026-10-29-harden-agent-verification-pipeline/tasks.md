# Tasks — harden-agent-verification-pipeline

Каждый unit меняет только свой deliverable и непосредственно зависимые tests/fixtures; [ownership, DAG, Test matrix и prerequisites](design.md) — в design. Все checkbox остаются пустыми до фактической реализации. `D§N` — секция решения N design, `S-*` — delta spec соответствующей capability в этом change. Handoff предыдущего unit передаётся Router, не перечитывается весь change.

## Execution units

| Unit | Профиль | Deliverable / Ownership paths | Зависит от | Verification group | contextFiles |
|---|---|---|---|---|---|
| RULES-1 | Backend | A: AGENTS, planner/backend/frontend, verification/context howto, policy test | — | POL-01 static | `design.md` §§1–2, `specs/repository-process-tooling/spec.md` workflow, `specs/openspec-workflow/spec.md` prerequisites/closure, `agents/backend.md` §§0/13, `agents/frontend.md` §§13–14, `agents/planner.md` §§2–3, `agents/howto/context-economy-patterns.md` замеры/бюджет |
| BROWSER-1 | Frontend | C: scripts/qa/browser/**, run-scenarios, qa-browser, qa-browser.test | RULES-1 | FIX-01, BR-01..03 Chromium suite | `design.md` §3, `specs/agent-acceptance-tooling/spec.md` browser/evidence, `scripts/qa/run-scenarios.mjs`, `scripts/qa-browser.mjs`, `scripts/qa/browser-env.sh`, `.agents/skills/ui-qa/SKILL.md` invocation |
| WIRE-1 | Backend | D: scripts/qa/contracts/**, qa-contracts.test | RULES-1 | WIRE harness unit suite | `design.md` §4, `specs/agent-acceptance-tooling/spec.md` wire, `services/seo-service/tests/clients/test_yandex_lifecycle_contract.py`, `services/yandex-service/src/core/schemas/api/yandex_metrica_counters.py` DTO interface |
| INFRA-1 | Backend | E: scripts/qa/infra/**, test_qa_infra.py | RULES-1 | INF-01 fixture/guard suite | `design.md` §5, `specs/agent-acceptance-tooling/spec.md` fixtures/acceptance, `services/seo-service/tests/integration/conftest.py`, `services/ya-metrica-service/tests/integration/conftest.py` |
| STACK-1 | Backend | H: scripts/stackctl, stackctl.test, stack-control skill | RULES-1 | STACK-01 mocked Docker suite | `design.md` §6, `specs/repository-process-tooling/spec.md` SEO stack, `scripts/stackctl` registry/DB/ready/ports, `scripts/tests/stackctl.test.mjs`, `.agents/skills/stack-control/SKILL.md` |
| USAGE-1 | Backend | I: scripts/qa/usage/**, test_pipeline_usage.py | RULES-1 | USG-01..02 offline golden suite | `design.md` §7, `specs/agent-pipeline-measurement/spec.md`, `.qa/pipeline-analysis/analyze.py` usage loop, `agents/howto/verification-policy.md` ledger boundary |
| SEO-1 | Backend | F: назначенные SEO tests/fixtures (design Deliverables) | WIRE-1, INFRA-1 | SEO boundary acceptance + final suite | `design.md` §§4–5, `specs/agent-acceptance-tooling/spec.md` wire/infra, SEO lifecycle test/conftest, `services/seo-service/src/clients/nats/maintenance_results.py`, `services/ya-metrica-service/src/clients/nats/maintenance_result_publisher.py`, contracts/infra README после handoff |
| METRICA-1 | Backend | G: назначенные Метрика tests/fixtures | INFRA-1 | Метрика PG/NATS acceptance + final suite | `design.md` §5, `specs/agent-acceptance-tooling/spec.md` real acceptance, `services/ya-metrica-service/tests/integration/{conftest,test_cleanup_worker_postgres,test_nats_broker}.py`, infra README после handoff |
| PROTOCOL-1 | Quality Gate | B: quality_gate, browser/NATS howto, qg-lanes/ui-qa skills | все C–I units | POL-01 protocol consistency | `design.md` §§1–8 только CLI/policy contracts, `specs/openspec-workflow/spec.md`, `agents/quality_gate.md` lanes/format, browser/NATS acceptance howto, qg-lanes/ui-qa skills, краткие helper handoffs |
| QG-ENV | Quality Gate | J: .qa/<change>/QG-ENV/** | PROTOCOL-1 | ENV-01 preflight | `design.md` §§5,6,8 и matrix ENV-01, infra manifest/permit schema, implementation handoffs prerequisites |
| QG-BE | Quality Gate | J: .qa/<change>/QG-BE/** | QG-ENV | INF/PG/NATS + service regression audit | `design.md` matrix INF-01/PG-01..02/NATS-01, fixtures diff F/G, test-support README, ENV handoff |
| QG-CONTRACTS | Quality Gate | J: .qa/<change>/QG-CONTRACTS/** | QG-ENV | POL/BR/WIRE/STACK/USG root suite | `design.md` matrix root IDs, четыре delta specs только применимые requirements, C/D/H/I handoffs, rules diff |
| QG-SYNTH | Quality Gate | J: docs/reports/harden-agent-verification-pipeline.md | QG-BE, QG-CONTRACTS | SYN-01 итоговая сверка | `design.md` Test matrix/Mapping/Risks, QG handoffs, status/strict validation, baseline evidence |

Полные пути ownership — [design → Deliverables](design.md#deliverables). Один владелец spec/файла; stack amendments к repo spec принимает A последовательно, остальные test/tooling spec amendments принимает C. QG не переписывает specs/runtime, только фиксирует findings.

## 1. RULES-1 — единая verification и ownership policy (профиль: Backend)

**Deliverable:** A · **Specs:** repository-process-tooling, openspec-workflow · **Зависит от:** —.

- [x] RULES-1.1 Создать `agents/howto/verification-policy.md` с таблицей unit/final/QG/fix, условиями invalidation и ledger fields; POL-01 проверяет наличие всех границ и отсутствие duplicate aliases.
- [x] RULES-1.2 Обновить `AGENTS.md`: указатель на единую policy, prerequisites/evidence owner, closure зависимых tests/fixtures/wiring/inventories и budget как эвристика; POL-01 сверяет нормы и запрет checkpoint units.
- [x] RULES-1.3 Обновить `agents/planner.md` acceptance/prerequisites matrix и execution шаблоны; пример включает изоляцию, permission, stop condition и конкретные evidence IDs, что проверяет POL-01.
- [x] RULES-1.4 Согласовать `agents/backend.md` §0/завершение с targeted/final/fix policy; исправить heading reference, paired boundaries и persisted rollback prerequisites; POL-01 не находит прежнее unconditional full suite per unit.
- [x] RULES-1.5 Согласовать `agents/frontend.md` §§13–14/завершение: dedup make/npm aliases, scoped self-check selection и exact keyboard reproducer; убрать legacy docs/plans check path, сохранить mandatory final gate; POL-01 проверяет ссылки.
- [x] RULES-1.6 Исправить context-economy howto: bootstrap не универсальная цена, cache не квота, polling выводы зависят от выборки; сохранить read-once/circuit breaker и no artificial split; проверка POL-01/ручная сверка с mapping анализа.
- [x] RULES-1.7 Добавить `scripts/tests/pipeline-policy.test.mjs` с позитивными/негативными synthetic document fixtures для stage table, whitespace exception, ownership/prerequisites и unreproduced fix; все fixture assertions зелёные без runtime.
- [x] RULES-1.V Выполнить policy static suite POL-01 и scoped diff-check собственных путей, отметить только выполненные IDs, вернуть handoff с командой/результатом и ссылкой на policy.

## 2. BROWSER-1 — scoped browser assertions и безопасное evidence (профиль: Frontend)

**Deliverable:** C · **Specs:** agent-acceptance-tooling · **Зависит от:** RULES-1.

- [x] BROWSER-1.1 Выделить schema/selection в `scripts/qa/browser/` и расширить existing runner mode/IDs/budgets, сохранив старые шаги; BR-03 ловит unknown/empty/invalid inputs до PASS.
- [x] BROWSER-1.2 Добавить реальные focus/hidden/count/attribute keyboard assertions; BR-01 проверяет Tab/Shift+Tab/Enter/Space/Escape и nested pending/nonpending на synthetic fixtures.
- [x] BROWSER-1.3 Добавить geometry/scroll/clipping assertions и lifecycle-safe waits; BR-02 различает bad overflow/hidden sizing/remount и исправные fixtures без увеличения workers/ослабления assertions.
- [x] BROWSER-1.4 Добавить computed contrast state assertions и scoped axe; BR-02 проверяет threshold/alpha, unsupported background не PASS и обязательную причину axe exclude.
- [x] BROWSER-1.5 Ввести allowlisted report/evidence policy: raw live traces off, unsafe screenshot disabled/masked до записи, console/network только безопасные outcomes; BR-03 проверяет secret sentinel и backward report compatibility.
- [x] BROWSER-1.6 Сохранить tracked synthetic fixtures и safe reproducer examples Space→Escape before FAIL/after PASS, long error/contrast/geometry; FIX-01/BR-01..02 исполняются настоящим Chromium 1366×768.
- [x] BROWSER-1.7 CMS branch `scripts/qa-browser.mjs` направить в канонический runner, сохранив site-* поведение; BR-03 проверяет отсутствие CMS tablet/mobile и правильный desktop viewport.
- [x] BROWSER-1.8 Добавить `scripts/tests/qa-browser.test.mjs` и README для self-check/QG вызовов, requirements/dependency resolution существующего FE Playwright env; suite воспроизводимо запускается одной документированной командой без нового root npm install.
- [x] BROWSER-1.V Прогнать Chromium helper suite FIX-01/BR-01..03 с bounded server lifecycle, сохранить безопасный report в .qa/<change>/BROWSER-1, отметить IDs и вернуть handoff. Product UI suite не запускать.

## 3. WIRE-1 — paired producer→consumer runner (профиль: Backend)

**Deliverable:** D · **Specs:** agent-acceptance-tooling · **Зависит от:** RULES-1.

- [x] WIRE-1.1 Создать manifest/schema allowlisted adapter IDs, explicit repo env/paths, scenario IDs/output dir; qa-contracts unit cases отклоняют произвольный shell/неизвестный adapter и пустой selection.
- [x] WIRE-1.2 Реализовать bounded subprocess bridge отдельного producer/consumer interpreter environment со stdin/stdout JSON; unit fixtures ловят import collisions, timeout, oversize/invalid output без raw stderr.
- [x] WIRE-1.3 Добавить protocol adapter interface HTTP production serialize→parse и NATS bytes/headers→handler/storage capture; tests различают real boundary adapter и synthetic mock fixture.
- [x] WIRE-1.4 Ввести strict monorepo/no-skip guard и completeness summary по expected scenario IDs; отсутствие peer/dependency/scenario даёт явный FAIL, standalone skip не превращается в acceptance PASS.
- [x] WIRE-1.5 Добавить synthetic negative harness fixtures strict wire date, detail null/false/0, malformed headers/identity/timestamp как reusable patterns; qa-contracts проверяет ошибочные wire variants без изменения продукта.
- [x] WIRE-1.6 Добавить `scripts/tests/qa-contracts.test.mjs` для lifecycle/exit/schema/privacy sentinel и README с command/adapter contract; linked imports production seed отдать SEO-1 через handoff, не писать в его файлы.
- [x] WIRE-1.V Прогнать qa-contracts harness unit suite; сохранить безопасное evidence WIRE-1, отметить IDs, вернуть точный adapter interface SEO-1 и QG. Реальные paired seeds отдельно исполняются SEO-1.

## 4. INFRA-1 — isolated PG/NATS helpers и permission guard (профиль: Backend)

**Deliverable:** E · **Specs:** agent-acceptance-tooling · **Зависит от:** RULES-1.

- [x] INFRA-1.1 Создать manifest/permit schemas и preflight CLI; INF-01 доказывает отказ до подключения/mutation при missing/expired/wrong-scope permit, без автоматической выдачи разрешения.
- [x] INFRA-1.2 Реализовать PG lifecycle `_test` target/unique schema/search_path без public/app fallback, resource ownership manifest; guard tests отвергают unsafe names/DB/roles и не выводят credentials.
- [x] INFRA-1.3 Реализовать NATS lifecycle отдельного test broker/account/namespace, bounded setup/cleanup only-owned resources; tests запрещают canonical streams и wildcard delete.
- [x] INFRA-1.4 Реализовать partial-setup/finally/timeout/residual manifest handling для обоих transports; INF-01 failure injection подтверждает отсутствие чужого cleanup и безопасную диагностику.
- [x] INFRA-1.5 Добавить run allowlisted service test commands с node-ID selection, service-local lockfile env, no-skip/completeness gate; missing env/0 tests/skip дают не PASS в acceptance summary.
- [x] INFRA-1.6 Описать explicit test-support import/bootstrap для service integration fixtures, standalone prerequisites и отдельное разрешение cleanup в README; проверка примеров в guard suite без raw env.
- [x] INFRA-1.7 Добавить `scripts/tests/test_qa_infra.py`: negative guards и fixture lifecycle tests; real PG/NATS selftest создать с отдельным разрешением и resource manifest, при отсутствии prerequisites вернуть blocked, не исполнить destructive команды.
- [x] INFRA-1.V Выполнить INF-01 helper verification group (offline guards + разрешённый real fixture selftest), сохранить report, отметить реально выполненное и вернуть service integration handoff. Не заявлять mock evidence доказательством PG/NATS acceptance.


**INFRA-1 verification:** offline INF-01 — ранее 23 tests PASS (не повторялся); после отдельного согласия `approval:isolated_test_infra_consent_20261029` real PG/NATS helper selftests PASS, journals `state=removed`, cleanup PASS; отсутствие exact owned schema/stream подтверждено независимыми соединениями. Evidence `.qa/harden-agent-verification-pipeline/INFRA-1/real-report.json`. Target-ID regression FAIL→PASS; SQL-name guards не ослаблены. INFRA-1.V закрыта; это не заменяет service acceptance SEO/METRICA. Контейнеры оставлены Router. CLI/bootstrap — `scripts/qa/infra/README.md`.

## 5. STACK-1 — недостающий SEO scope и published endpoints (профиль: Backend)

**Deliverable:** H · **Specs:** repository-process-tooling · **Зависит от:** RULES-1.

- [x] STACK-1.1 Добавить seo profile/exact aliases API/scheduler/maintenance с существующими Compose project/key/container; STACK-01 mocked commands доказывают отсутствие запуска соседей и сохранение existing project.
- [x] STACK-1.2 Добавить db-seo в ограниченный infra registry и runtimeTcp DB_CONFIG; STACK-01 проверяет buildable:false и отказ ready/rebuild DB без изменения legacy peers.
- [x] STACK-1.3 Для ready SEO требовать --no-migrate; STACK-01 проверяет default deny до build и dry-run без lock/up/exec/migration даже при занятом lock.
- [x] STACK-1.4 Добавить read-only endpoints CLI с inspect published URL/internalOnly, reject unknown/ambiguous mappings без defaults/секретов; STACK-01 проверяет dynamic port и отсутствие URL у internal workers.
- [x] STACK-1.5 Расширить auth/readiness regression tests для db-seo по существующей positive/negative password probe модели; wrong password действительно auth отказ, произвольный сбой не успех, stdout/argv без секретов.
- [x] STACK-1.6 Обновить stack-control skill точными командами, limits и JSON contracts; documentation assertions в STACK-01 подтверждают сохранение exit0/1/2, allowlist/lock/no destructive и существующих aliases.
- [x] STACK-1.V Выполнить `node --test scripts/tests/stackctl.test.mjs`, scoped diff check и handoff; реальные rebuild/psql/Compose mutation в этой verification group не нужны и не выполняются.

## 6. USAGE-1 — offline usage и execution ledger (профиль: Backend)

**Deliverable:** I · **Specs:** agent-pipeline-measurement · **Зависит от:** RULES-1.

- [x] USAGE-1.1 Создать streaming offline JSONL/ZIP collector с явными --input/--ledger/output, bounded record/archive parsing без global scan/extraction; USG-01 ловит malformed/oversize/zip-slip inputs безопасной диагностикой.
- [x] USAGE-1.2 Реализовать terminal assistant/message usage allowlist/dedup identities и file digest, конфликт дублей — error; USG-01 исключает chunks/tool/step/end и отмечает ограничение legacy records без stable ID.
- [x] USAGE-1.3 Реализовать total/input/output/cache-read/cache-write по ролям, initial-message context отдельно, unknown/completeness; golden summary USG-01 не восстанавливает поля из total.
- [x] USAGE-1.4 Создать ledger schema/append CLI для session/resume/unit/split/partial/finding/verification/wait; USG-02 проверяет identities, enum reasons, duplicates и отсутствие raw handoff text.
- [x] USAGE-1.5 Реализовать first-pass/partial causes/exact FAIL→PASS/reopen/full-suite repeats с явными знаменателями и coverage; USG-02 golden fixtures проверяют blocked/unknown и причины повторов.
- [x] USAGE-1.6 Реализовать measured intervals с overlaps/unknown и JSON/Markdown summary без cost/quota conversion; USG-02 проверяет not-calculated и отсутствие процентов по несопоставимой выборке.
- [x] USAGE-1.7 Добавить synthetic golden logs/ledger с secret sentinels и `scripts/tests/test_pipeline_usage.py`; allowlist tests гарантируют, что raw text/env/URL/tool args/results не экспортируются и не попадают в stderr.
- [x] USAGE-1.8 Описать README с несколькими примерами append/collect, классификацией сравнимых changes и обязательными неизвестными данными; проверить documented commands на synthetic fixtures, не перечитывая восемь архивов.
- [x] USAGE-1.V Выполнить offline golden suite USG-01..02, сохранить summary .qa/<change>/USAGE-1, отметить IDs и вернуть Router/QG handoff с ledger integration contract.

## 7. SEO-1 — реальные paired границы и безопасные SEO fixtures (профиль: Backend)

**Deliverable:** F · **Specs:** agent-acceptance-tooling · **Зависит от:** WIRE-1, INFRA-1.

- [x] SEO-1.1 Подключить test-support к SEO integration conftest, убрать public fallback и добавить `_test`/permit/resource ownership guards; PG-02/INF-01 отклоняют unsafe target до SQL mutation.
- [x] SEO-1.2 Адаптировать существующий lifecycle HTTP test к strict EQCMS_MONOREPO guard и отдельным lockfile env producer/consumer, сохранив standalone explicit skip вне acceptance; WIRE-01 фактически прогоняет production Яндекс DTO→SEO parser.
- [x] SEO-1.3 Добавить SEO-owned bridge/adapters в `tests/integration/test_acceptance_boundaries.py` для production Метрика result publisher→SEO handler, не копировать schemas; WIRE-02 подтверждает валидный путь и no-storage invalid variants.
- [x] SEO-1.4 Связать SEO broker tests с isolated helper/permit, добавить selected existing-config compatible/incompatible cases и valid replay header; NATS-01 проверяет reject без silent topology repair.
- [x] SEO-1.5 Добавить public-shadow regression в dedicated test DB и fixture-level failure cleanup cases, обновить непосредственно зависимые test expectations; PG-02 доказывает SQL error без public read. Product src/migrations не менять.
- [x] SEO-1.6 Описать service test node-ID mapping и ожидаемые prerequisites через docstrings/fixture instructions, передать manifest entries владельцам root helpers через interface без записи в их paths; completeness check обнаруживает missing/skip IDs.
- [x] SEO-1.V После отдельного test-only разрешения выполнить SEO boundary acceptance group WIRE-01..02/PG-02/NATS-01 через harness, затем финальные SEO `make test`, `make lint` и scoped canonical format-check один раз; указать каждый прогон/причину в ledger, отметить факт и вернуть handoff. Нет разрешения — blocked/partial с unchecked IDs, не PASS.

### Продолжение SEO-1b — разрешённая closure / public-shadow

SEO-1 → SEO-1a (выполненная часть .1–.4/.6, evidence `SEO-1/`) + SEO-1b (остаток .5/V, evidence `SEO-1/SEO-1b/`). Router разрешил только migration test expectations; product migrations/source и permanent baseline collection config не входят. Операторская `pipeline_test.public.qa_seo_public_shadow` заранее создана по отдельному согласию; тесты только читают, schema-only permit не расширяется.

- [x] SEO-1b.1 Заменить обе legacy prefix assertions в `test_migrations_postgres.py` точным совпадением с `qa_infra_context.resource.schema`, сохранив прочие expectations/baseline; scoped checks/collection без обхода runner allowlist.
- [x] SEO-1b.2 Выполнить public-shadow retest с новым exact PG manifest/permit под общим flock; подтвердить доступность контрольной public-таблицы, SQLSTATE 42P01 без fallback и независимый owned cleanup, не удаляя контрольную таблицу/контейнер.
- [x] SEO-1b.V Обновить registry/ledger и закрыть .5/V только по фактам; прошлые wire/broker/full-suite evidence не повторять без invalidation. Сохранить baseline collection classification и importlib override, migration collection не выдавать за real acceptance.

## 8. METRICA-1 — persisted rollback и lease acceptance (профиль: Backend)

**Deliverable:** G · **Specs:** agent-acceptance-tooling · **Зависит от:** INFRA-1.

- [x] METRICA-1.1 Подключить isolated test-support/permit к Метрика PG conftest, сохранив `_test` guard и metadata setup; INF-01 cases подтверждают no fallback/no mutation без scope.
- [x] METRICA-1.2 Усилить существующий test_cleanup_worker_postgres failure acceptance независимой session после rollback, не дублировать уже имеющиеся durable attempts/error_code scenarios; PG-01 доказывает persisted failure, не mock state.
- [x] METRICA-1.3 Зафиксировать selected lease/concurrency node IDs с двумя sessions, bounded synchronization и обязательным отсутствием skip; PG-02 проверяет уже действующий fencing contract.
- [x] METRICA-1.4 Подключить real broker fixture к helper resource manifest/permit и сохранить canonical production serializer headers в replay; NATS-01 проверяет ACK/redelivery/duplicate и existing topology без изменения product settings.
- [x] METRICA-1.5 Добавить `test_acceptance_helpers.py` для refusal/partial cleanup/secret-free fixture diagnostics и test-only setup isolation; отрицательные cases запускаются безопасно, real cleanup только в owned namespace.
- [x] METRICA-1.6 Обновить service fixture docs/marker/node-ID mapping и прямо зависимые expectations; missing infra/0 scenarios/skip в acceptance — не PASS, что подтверждает summary harness.
- [x] METRICA-1.V После отдельного разрешения выполнить PG-01..02/NATS-01 acceptance group, затем один финальный service `make test`, `make lint` и scoped canonical format-check, сохранить evidence/ledger reason, отметить выполненное и вернуть handoff без продуктовых fixes.

## 9. PROTOCOL-1 — внедрение helpers в QG и owner self-check (профиль: Quality Gate)

**Deliverable:** B · **Specs:** openspec-workflow · **Зависит от:** BROWSER-1, WIRE-1, INFRA-1, STACK-1, USAGE-1, SEO-1, METRICA-1.

- [x] PROTOCOL-1.1 Обновить quality_gate lanes/format/testing sections указателем на policy и evidence registry с одним владельцем/ссылками; POL-01 исключает дубли root suites и whitespace-only rework, сохраняя независимый запуск QG.
- [x] PROTOCOL-1.2 Обновить browser QA protocol scoped self-check/полный QG distinction, конечные scenario IDs и precise reproducer, безопасные trace/screenshot exceptions; сверить с BR-01..03 командами из handoff.
- [x] PROTOCOL-1.3 Обновить NATS howto acceptance section paired serializer→handler/invalid-before-storage и isolated topology/permit/no-skip требованиями; POL-01 сохраняет canonical contract и запрет silent repair.
- [x] PROTOCOL-1.4 Обновить `.agents/skills/ui-qa/SKILL.md` поддержанными runner flags, prerequisite gates, redacted evidence и 1366×768; static examples проверяются против delivered schema без product browser запуска.
- [x] PROTOCOL-1.5 Обновить `.agents/skills/qg-lanes/SKILL.md` evidence ownership/scenario registry, конечные budgets/stop conditions/один recheck, ledger append примеры и отличие external OAuth gap от tooling defect; POL-01 проверяет обязательные поля и отсутствие скрытого PASS.
- [x] PROTOCOL-1.6 Прогнать consistency fixtures документации с реальными CLI --help/schema validation и analysis mapping; убедиться, что каждое правило имеет исполнимую команду/проверяемый результат без runtime продукта.
- [x] PROTOCOL-1.V Выполнить POL-01 protocol consistency suite, передать Router точный QG registry с IDs и prerequisites, отметить tasks и завершить unit. Это интеграция правил, не формальный промежуточный QG verdict.

## 10. QG-ENV — prerequisites и изоляция (профиль: Quality Gate)

**Deliverable:** J, только ignored evidence · **Зависит от:** PROTOCOL-1 · **Профиль gate:** QG-FULL.

- [x] QG-ENV.1 Сверить фактический diff с ownership/baseline и применимость lanes, проверить конечный registry ENV-01 и budgets; никакого продукта/чужих файлов в scope.
- [x] QG-ENV.2 Проверить наличие helpers и service-local зависимостей, CLI schemas и scenario manifests; missing IDs/dep — explicit blocker, не автоматическая установка во все сервисы.
- [x] QG-ENV.3 Проверить отдельное согласие пользователя/permit target/resource scope/expiry; без него вернуть blocked до setup/teardown, proposal approval не считать разрешением.
- [x] QG-ENV.4 Получить только безопасные facts test-target discovery/readiness; подтвердить dedicated `_test` DB/роль, NATS test broker/account и отсутствие app/public/canonical resource targets, не выводя inspect env/credentials.
- [x] QG-ENV.5 Проверить bounded resource lifecycle/residual manifest/cleanup scope и не более двух infrastructure repair attempts; безопасный preflight ENV-01 фиксирует результат и непроверенное.
- [x] QG-ENV.V Сохранить `.qa/<change>/QG-ENV/preflight.json`, ledger и handoff с prerequisites outcome; отметить только выполненное, QG-BE/CONTRACTS запускать после успешного preflight или явного решения о blocked coverage.

## 11. QG-BE — независимая PG/NATS и fixture семантика (профиль: Quality Gate)

**Deliverable:** J, только ignored evidence · **Зависит от:** QG-ENV.

- [x] QG-BE.1 Проверить fixture diff и guards по INF-01, explicit isolation/ownership teardown, отсутствие app settings fallback/секретов, сохранив единственный evidence owner этих осей.
- [x] QG-BE.2 Независимо выполнить PG-01 durable failure после rollback в новой session на разрешённой реальной PostgreSQL; collection/mock/skip не считаются evidence.
- [x] QG-BE.3 Независимо выполнить PG-02 lease/concurrency/public-shadow scenarios в тестовых схемах; проверить bounded synchronization и отсутствие public fallback/чужого cleanup.
- [x] QG-BE.4 Независимо выполнить NATS-01 real-broker compatible/incompatible existing topology/replay/ACK cases, проверить config before/after и canonical headers; wire identity coverage WIRE-02 сослать CONTRACTS, не строить второй harness.
- [x] QG-BE.5 Выполнить применимые финальные non-mutating service suites/static gates SEO/Метрика по policy один раз на revision, проверить failure classification и ledger причины повторов; исправления отдавать владельцам, не runtime чинить самому.
- [x] QG-BE.V Сохранить безопасные report outputs `.qa/<change>/QG-BE/`, передать IDs passed/failed/unchecked и bounded findings, отметить tasks. Один targeted recheck тем же агентом после fix; далее stop/пользователь.

## 12. QG-CONTRACTS — независимые root tooling контракты (профиль: Quality Gate)

**Deliverable:** J, только ignored evidence · **Зависит от:** QG-ENV.

- [x] QG-CONTRACTS.1 Независимо проверить POL-01/FIX-01: policy boundaries, exact reproducer, ownership closure, whitespace exception, budgets/evidence owners; prerequisite gaps не скрыты.
- [x] QG-CONTRACTS.2 Независимо прогнать BR-01..03 Chromium synthetic fixtures и оценить assertions/report privacy, viewport/scoped selection/compatibility; продуктовый UI gate неприменим.
- [x] QG-CONTRACTS.3 Независимо выполнить WIRE-01..02 production producer→consumer manifests в отдельных env и no-storage negative cases; missing checkout/deps/skip — FAIL. Real topology proof принадлежит BE, ссылка вместо дубликата.
- [x] QG-CONTRACTS.4 Независимо выполнить STACK-01 mocked Docker suite, проверить no mutation dry-run/endpoints/SEO aliases/DB auth gate и сохранение Яндекс support; реальные rebuild/SQL не нужны.
- [x] QG-CONTRACTS.5 Независимо выполнить USG-01..02 golden suite, проверить знаменатели/cache/unknown/dedup/privacy/ledger integration и no cost/quota claims, не читать raw исторические архивы.
- [x] QG-CONTRACTS.6 Проверить scripts scoped static checks, пути/README examples, actual CLI schema/specs trace; root aggregate четырёх core сервисов неприменим: Makefile и product runtime не менялись.
- [x] QG-CONTRACTS.V Сохранить `.qa/<change>/QG-CONTRACTS/` evidence registry/ledger, handoff passed/failed/unchecked с бюджетом и findings; отметить tasks, без самостоятельного исправления helpers или повторного создания инфраструктуры.

## 13. QG-SYNTH — единый итоговый gate (профиль: Quality Gate)

**Deliverable:** J, единственный итоговый report · **Зависит от:** QG-BE, QG-CONTRACTS.

- [x] QG-SYNTH.1 Сопоставить каждый matrix ID с результатом, code/environment fingerprint и единственным QG evidence owner; SYN-01 не допускает missing critical или owner PASS вместо independent evidence.
- [x] QG-SYNTH.2 Свести findings/recheck outcome/unchecked и external gaps, отличить продуктовый blocker от инструмента; при exhausted budget/повторном failed finding остановить gate для решения пользователя, не добавлять бесконечные harness.
- [x] QG-SYNTH.3 Сверить analysis mapping всех рекомендаций, отсутствие product/Compose/DSH/foreign-baseline правок и отсутствие секретов в evidence/report; waived не разрешает secrets/destructive actions.
- [x] QG-SYNTH.4 Проверить полноту ledger, full-suite reasons и synthetic measurement summary; first-pass/экономию реальных будущих changes не придумывать, все неизвестные явно указать.
- [x] QG-SYNTH.5 Выполнить `openspec status --change harden-agent-verification-pipeline --json` и `openspec validate harden-agent-verification-pipeline --type change --strict`, проверить артефакты/ссылки и prerequisites завершения по SYN-01.
- [x] QG-SYNTH.V Создать единственный `docs/reports/harden-agent-verification-pipeline.md` с вердиктом/ссылками/gaps/неприменимыми lanes, отметить фактически сделанное, вернуть Router handoff без повторного suite запуска.

## 14. FIX-EVIDENCE-1 — lane-local root suite evidence (профиль: Backend)

**Finding:** CONTRACTS-OWN-01 · **Ownership:** четыре root test entrypoints и contracts README; без изменения product/helpers.

- [x] FIX-EVIDENCE-1.1 Воспроизвести static FAIL, добавить общий fail-closed QA_EVIDENCE_ROOT contract с отдельными suite childdirs и сохранением defaults, проверить default/override/negative/collision для всех четырёх wrappers, исполнить impacted suites только в fix scope, подтвердить неизменность owner evidence fingerprints/sentinels, сохранить before/after и ledger и передать QG точные команды.

## Workflow follow-up

- Если QG возвращает findings — Router выдаёт bounded fix unit соответствующего владельца с exact reproducer, затем один targeted recheck тем же QG агентом. При изменении scope обновить только OpenSpec.
- После положительного gate Router выполняет READY-FOR-MANUAL с пустым runtime списком, sync delta specs, повторную validation и archive; чужой baseline не включать. Это reference workflow, а не tasks, требующие уже архивированный change.
- Merge/release — отдельные существующие пользовательские approval gates. Следующие сопоставимые changes дают реальную выборку метрик; не блокировать архив текущего tooling ожиданием обещанного процента экономии.
