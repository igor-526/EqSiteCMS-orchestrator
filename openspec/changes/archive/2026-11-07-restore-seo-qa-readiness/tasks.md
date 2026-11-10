# Tasks — restore-seo-qa-readiness

До approval этого нового плана реализация запрещена; ownership, DAG, Test matrix и раздельные runtime permissions — в design.md. Все checkbox ниже намеренно не выполнены; PLAN их не закрывает.

## Execution units

Пути относительно корня монорепозитория; `design.md` и `specs/` в contextFiles — внутри этого change. Таблица ownership полна в design → Deliverables, здесь указаны те же bounded зоны. Чужие infra/shipping/DSH diff read-only.

| Unit | Профиль | Deliverable / ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| QA-BROWSER-1 | Backend | A: `scripts/qa/browser/{assertions.mjs,runner.mjs,schema.mjs,README.md,fixtures/surface.html,fixtures/scenarios.mjs}`, `scripts/tests/qa-browser.test.mjs` | approval | CT-01..03, scoped browser suite | `design.md` §A/Test matrix; `specs/agent-acceptance-tooling/spec.md` contrast; `scripts/qa/browser/assertions.mjs`; `scripts/tests/qa-browser.test.mjs`; прежние `.qa/seo-metrica-task-monitor/QG-FE-MANUAL/{scenarios.json,browser-check.mjs}` только два exact cases |
| QA-RETRY-1 | Frontend | B: новые `scripts/qa/browser/fixtures/seo-post-retry.mjs`, `scripts/tests/qa-post-retry.test.mjs` | QA-BROWSER-1 | RT-01..03, finite synthetic suite | `design.md` §B; delta retry; прежний `QG-FE-MANUAL/supplemental.mjs` строки1–55,72; `scripts/qa/browser/{runner.mjs,fixtures/server.mjs}`; handoff A |
| QA-ENV-1 | Backend | C: новые `scripts/qa/readiness/**`, `scripts/tests/test_qa_readiness.py` | approval | ENV-01..03/SK-01, offline tests | `design.md` §C/D/permissions; `specs/qa-readiness-profile/spec.md`; `scripts/qa/infra/README.md` строки1–169; `services/backend/README.md` строки91–129; прежние `QG-{ENV,LIVE}/prerequisites.md` |
| METRICA-COL-1 | Backend | D: `services/ya-metrica-service/pyproject.toml`, минимальная import closure `tests/conftest.py`, два `tests/{unit,integration}/test_maintenance_topology.py`; новый `scripts/tests/test_metrica_collection.py` | approval | COL-01..03; final-service Метрики | `design.md` §E; `specs/python-test-collection/spec.md`; перечисленные service файлы и `services/ya-metrica-service/Makefile` |
| QG | Quality Gate | E: `.qa/restore-seo-qa-readiness/QG/`, `docs/reports/restore-seo-qa-readiness.md`, свои checkbox | все owner units | независимые root suites, full Метрики; finite external census | `design.md` Test matrix/permissions; scoped diff; owner handoffs; три delta |

## 1. QA-BROWSER-1 — computed contrast boundary (профиль: Backend)

**Specs:** agent-acceptance-tooling contrast. **Пути:** A. **Бюджет:** 6–8 действий, одна browser verification-группа. Existing fixture server read-only; расширение closure только через Router.

- [x] QA-BROWSER-1.1 Сохранить точный before CT-03 для двух прежних unsupported cases (те же inputs/locators/states, synthetic production build) и безопасный reason inventory; проверить reproducer-before.json по verification policy, unreproduced не закрывать.
- [x] QA-BROWSER-1.2 Добавить unsupported reason enum и его безопасную передачу assertions→runner/schema без ratio при отказе; проверить negative reason/secret-sentinel cases CT-02.
- [x] QA-BROWSER-1.3 Добавить CT-01/02 fixture variants в существующие surface/scenarios и аналитические expected ratios, отдельные normal/hover/focus/error, gradient/opacity/filter/pseudo/overlay negatives; проверить все ID и thresholds без ослабления.
- [x] QA-BROWSER-1.4 Исправить только доказанную ошибочную классификацию поддерживаемого paint либо явно закрепить корректную unsupported границу; сравнить CT-03 before/after, не объявлять unsupported PASS и не закрывать исходное finding без доказательства.
- [x] QA-BROWSER-1.5 Адаптировать evidence root только browser test suite к новому change с сохранением legacy compatibility и path/symlink/overwrite guards; negative path tests и safe ledger не допускают escape из `.qa/`.
- [x] QA-BROWSER-1.6 Обновить `scripts/qa/browser/README.md` по фактическому контракту reason codes, state independence и численных проверок; проверить соответствие CT-01..03 и отсутствие обещаний сложного paint support.
- [x] QA-BROWSER-1.V Выполнить scoped `node --test scripts/tests/qa-browser.test.mjs` и exact CT-03 в пределах одной группы; сохранить `.qa/restore-seo-qa-readiness/QA-BROWSER-1/` before/after/ledger, отметить лишь сделанное и вернуть Router handoff. Product suites/DB/HTTP запрещены.

## 2. QA-RETRY-1 — диагностика POST matcher и явного retry (профиль: Frontend)

**Specs:** agent-acceptance-tooling retry. **Пути:** B; shared runner и `services/frontend/**` read-only. **Зависит от:** QA-BROWSER-1. **Бюджет:** 6–8 действий, одна finite synthetic browser-группа.

- [x] QA-RETRY-1.1 Повторить exact supplemental role/name/assertion для RT-03 в том же synthetic input, сохранить before и provenance Playwright/expect; проверить safe diagnostics locator count/accessible-name-match/native/ARIA/loading/remount без raw DOM.
- [x] QA-RETRY-1.2 Добавить reusable finite fixture/scenario module `scripts/qa/browser/fixtures/seo-post-retry.mjs`, используя существующие runner/synthetic routes, abort unknown egress; проверить что не возникает второго runtime smoke harness.
- [x] QA-RETRY-1.3 Реализовать `scripts/tests/qa-post-retry.test.mjs` для RT-01/02: 400/403/502/503/network→явный retry202, 401 auth, pending/double-submit; проверить отсутствие auto-retry/reset и requests counters до/после явного GET.
- [x] QA-RETRY-1.4 Диагностировать contradiction и внести только доказанную locator/harness поправку в свои два файла; RT-03 before/after сохраняют семантику, true disabled/ambiguous-name negative controls обязаны падать. При нужде product fix остановиться с blocked handoff Router.
- [x] QA-RETRY-1.5 Зафиксировать конечный результат RT-01..03 и локальный сценарный usage в reusable module/tests: unreproduced/blocked не заменять PASS; expected error не маскирует неизвестные API calls и не увеличивает timeout вместо решения.
- [x] QA-RETRY-1.V Выполнить `node --test scripts/tests/qa-post-retry.test.mjs` и targeted exact matcher recheck в одной группе; сохранить before/after/ledger под `.qa/restore-seo-qa-readiness/QA-RETRY-1/`, отметить только выполненные tasks и передать handoff. Реальный POST/vendor запрещён.

## 3. QA-ENV-1 — readiness contract и операционный runbook (профиль: Backend)

**Specs:** qa-readiness-profile. **Пути:** C. **Бюджет:** 6–8 действий, только offline verification. Реальные операции принадлежат Router/оператору по design → Prerequisites / permissions, не этому invocation.

- [x] QA-ENV-1.1 Создать `scripts/qa/readiness/profile.schema.json` с безопасными target/resources/actor refs, isolation/current-source attestations, ownership, раздельными permission groups и optional POST; проверить ENV-01/02 валидные/невалидные synthetic inputs.
- [x] QA-ENV-1.2 Реализовать offline `scripts/qa/readiness/validate.py --profile <path>` (exit0 только offline-profile-valid, exit2 safe errors), cross-field/expiry/isolation и group missing fields; negative tests подтверждают отсутствие subprocess/network/env/credential чтения.
- [x] QA-ENV-1.3 Добавить намеренно невалидный `examples/profile.template.json` с null placeholders и non-secret refs; проверить отказ без реального target, не создавать настоящие manifests/permits и не заполнять consentRef от имени пользователя.
- [x] QA-ENV-1.4 Написать readiness README/runbook: два штатных пути dedicated stack setup, operator review exact scope, existing guarded PG runner/четыре nodes/прежний registry, fixtures A/B/roles/history через штатные средства и owned cleanup. Проверить все ссылки/команды статически; отсутствие штатного fixture средства явно blocker, не скрытая SQL автоматизация.
- [x] QA-ENV-1.5 Добавить disk/runtime smoke matrix и внешний handoff владельцу DSH, criteria штатной загрузки в новой сессии; отдельные binding/queue/worker/no-vendor gates и BACKLOG-A11Y-CARD deferred/non-waived решение. Проверить SK-01 и отсутствие changes `dsh/**`/чужих infra файлов.
- [x] QA-ENV-1.6 Добавить `scripts/tests/test_qa_readiness.py` ENV-01..03/SK-01 с finite cases missing/expired/mismatched resources, unsafe URLs/secret fields, read-only без POST разрешения и запретом network access; убедиться, что offline valid не выдаёт real acceptance.
- [x] QA-ENV-1.V Выполнить `python3 -m unittest discover -s scripts/tests -p test_qa_readiness.py`, scoped static/link checks; evidence `.qa/restore-seo-qa-readiness/QA-ENV-1/`, handoff Router с точными отсутствующими inputs/внешним владельцем. Не запускать setup/preflight/run/HTTP/Docker/cleanup.

## 4. METRICA-COL-1 — независимая pytest collection (профиль: Backend)

**Specs:** python-test-collection. **Пути:** D. **Бюджет:** 5–7 действий; одна test-configuration verification-группа, это final-service граница Метрики. Не менять product topology и инфраструктурные assertions.

- [x] METRICA-COL-1.1 Сохранить exact before `.venv/bin/python -m pytest --collect-only -m 'not infrastructure'` в service cwd и inventory обоих topology модулей; проверить исходный import mismatch либо unreproduced, без реальных подключений.
- [x] METRICA-COL-1.2 Добавить pytest `--import-mode=importlib`, сохранив остальные addopts/markers/pythonpath/testpaths; проверить совместимость локальных test imports по точечному inventory, при broad closure вернуть bounded split.
- [x] METRICA-COL-1.3 Создать `scripts/tests/test_metrica_collection.py`: под service interpreter собрать оба topology файла и четыре прежних exact PG nodes; проверить неизменные node IDs/count и отсутствие marker exclusions. Только collection, не DB/NATS execution.
- [x] METRICA-COL-1.4 Выполнить COL-01..03 before/after и минимально необходимую import closure только в назначенных тестовых путях; negative regression доказывает, что оба topology набора действительно собраны, не потеряны и не переименованы.
- [x] METRICA-COL-1.5 Зафиксировать фактическую import-mode compatibility/команду collection в docstring regression и evidence; статически подтвердить неизменность assertions, markers, guarded runner registry и service runtime code.
- [x] METRICA-COL-1.V Выполнить root collection regression, `make -C services/ya-metrica-service test`, `make -C services/ya-metrica-service lint`, service canonical Ruff check/format-check без aliases/реальной инфраструктуры; evidence `.qa/restore-seo-qa-readiness/METRICA-COL-1/`, отметить только выполненные tasks и вернуть handoff, прочие failures не скрывать.

## 5. QG — независимая проверка нового scope (профиль: Quality Gate)

**Профиль gate:** QG-LITE. **Пути:** E. **Зависит от:** все owner units. **Бюджет:** 6–8 действий, одна независимая scoped integration verification-группа. Отдельный product UI manual lane неприменим; новых product API/NATS/migrations нет.

- [x] QG.1 Проверить ownership/fingerprints и approved scope по owner handoffs; убедиться, что старый SEO change/report и чужие infra/shipping/DSH diff не присвоены. Сохранить finite registry с evidenceOwner и prerequisites/status для всех IDs design Test matrix.
- [x] QG.2 Независимо выполнить root browser contrast/retry suites CT-01..03/RT-01..03 на Chromium1366×768 с exact reproducer evidence и negative controls; unsupported/unreproduced и один targeted recheck учитывать честно, не менять product code.
- [x] QG.3 Независимо выполнить offline readiness suite ENV-01..03/SK-01 и проверить runbook/access matrix/permit boundaries; network/credential/auto-permit leakage недопустимы. ENV-04/05/SK-02 сохранять blocked до внешних inputs, не запускать runtime самовольно.
- [x] QG.4 Независимо выполнить COL-01..03/collection regression и один full Метрики плюс lint/canonical checks на актуальной revision; collection не считается PG acceptance, новых NATS connections нет.
- [x] QG.5 Оформить внешний census OP-ENV/ACTORS/PG/READ/POST/CLEANUP, disk/runtime smoke blocker и deferred card/forbidden backlog; проверить отсутствие vendor PASS на synthetic, сохранить pending external inputs и старые квоты SEO recheck.
- [x] QG.6 Создать единственный `docs/reports/restore-seo-qa-readiness.md` с verdict, точными passed/blocked/unchecked/unreproduced outcomes и ссылками evidence; не писать новый SEO verdict и не отмечать прежние tasks. Не трактовать code-ready как разрешение runtime или завершение SEO acceptance.
- [x] QG.V Выполнить pinned `openspec status --change restore-seo-qa-readiness --json`, `openspec validate restore-seo-qa-readiness --type change --strict` и scoped diff check; evidence `.qa/restore-seo-qa-readiness/QG/`, отметить фактические checkbox и остановиться с handoff Router.

## Workflow follow-up

- Операторские операции отдельно перечислены в design → Prerequisites / permissions. Router запрашивает настоящие targets/resources/actions/expiry/isolation и отдельное consent до setup/cleanup/PG/API/POST, внешнюю регистрацию smoke skill — у runtime owner. При отсутствии inputs — blocked, а не расширение code scope.
- Возобновление прежних PG/SM/real UI scenarios и новый recheck budget SEO QG — отдельное назначение Router после inputs; прежний change не редактируется задним числом и не закрывается автоматически этим gate.
- При положительном применимом QG verdict и требуемых approvals Router отдельно выполняет sync specs, повторную strict validation, archive и дальнейший workflow. В рамках PLAN/этих кодовых units sync/archive/finalize не выполняются.
