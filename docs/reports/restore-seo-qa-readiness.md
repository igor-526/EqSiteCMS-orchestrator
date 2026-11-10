# Quality Gate — restore-seo-qa-readiness

**Профиль:** QG-LITE · **Вердикт: APPROVED** · **Дата:** 2026-11-07

Одобрен только новый code/offline scope: helper contracts, synthetic retry, readiness contract и importlib collection. Это **не новый SEO verdict**, не runtime permit и не закрытие прежних blocked acceptance. Waivers отсутствуют. Корректный unsupported не назван PASS.

## Основание и границы

- [Change/design](../../openspec/changes/restore-seo-qa-readiness/design.md), [tasks](../../openspec/changes/restore-seo-qa-readiness/tasks.md), [proposal](../../openspec/changes/restore-seo-qa-readiness/proposal.md); три delta specs внутри change.
- Основание допуска кодовых проверок: явное approval нового change в задании Router. Разрешены только offline и synthetic loopback; реальных HTTP/PG/NATS/POST/setup/cleanup не выполнялось.
- Root revision `a84e18018831af956db642b9d84ae3dda534b0a5`, Метрика `44408c5a1cf1817e8ccc6096e37abb8f74477547`; рабочие ветки `main`. Чужой dirty diff не включён в ownership.
- Все evidence ниже относительно `.qa/restore-seo-qa-readiness/QG/` (**Q**). `fingerprints-before.json`, `service-fingerprint.json`, `fingerprints-after.json` содержат actual hashes; неизвестные runtime identities/current-source — `null` с причиной `independent-qg`.
- Один независимый evidence owner QG для локальных свойств; прежние BE/LIVE сохраняют ownership реальной SEO acceptance. Конечный `registry.json` — 19 IDs; `runs/*.json` — команды, время, options, fingerprints, aliases и process outcomes.

## Lanes

| Lane | Результат |
|---|---|
| QG-ENV | Runtime неприменим к коду change; внешний admission census blocked, без discovery/setup. Repairs 0. |
| QG-BE | Пройден: test configuration Метрики, collection и полный неинфраструктурный suite. Runtime архитектура не менялась. |
| QG-CONTRACTS | Пройден: root helper/synthetic/offline contracts; CT-03 numeric closure остаётся blocked по предусмотренной границе. |
| QG-FORMAT | Пройден: service lint/Ruff; root scoped syntax/tests/links/whitespace, без aggregate чужих сервисов. |
| QG-FE-AUTO / QG-FE-MANUAL | Неприменимо: product UI diff отсутствует; Chromium fixtures проверены внутри CONTRACTS. |
| QG-LIVE | Неприменимо: runtime API diff отсутствует; реальная прежняя acceptance не запускалась. |
| QG-SYNTH | Завершён: один отчёт, без sync/archive/shipping. |

## Независимая verification и matrix

| IDs | Команда / evidence | Фактический результат |
|---|---|---|
| CT-01/02 | `QA_EVIDENCE_ROOT=.qa/restore-seo-qa-readiness/QG node --test scripts/tests/qa-browser.test.mjs`; `browser.log`, `qa-browser/contrast-contract/report.json` | 9/9 tests PASS; 1366×768. Аналитические ratios/state applicability, независимые normal/hover/focus/error, unsupported enum/no ratio, thresholds и path/symlink/overwrite/legacy guards. Отрицательные fixtures действительно failed, а не numeric PASS. |
| CT-03 | `QA_IDS=UI-QA-07-error,UI-QA-07-contrast QA_OUTPUT=exact-current node Q/browser-check.mjs`; `ct03.log`, `exact-current/report.json`, `reproducer-current.json` | **2/2 unsupported:overlap**, exit1; numeric closure blocked. Для error step-5, contrast step-7, state normal; ratio отсутствует. Последующие hover/focus unchecked. |
| RT-01/02/03 | `node --test Q/qa-post-retry.test.mjs`; `retry.log`, `retry-1794032100984-717573/` | 10/10 tests PASS. Пять ошибок 400/403/502/503/network → explicit retry202; отдельно 401 auth, pending/double-submit, true-disabled и ambiguous negative controls, existing runner scenario. Unknown API/egress calls 0. |
| ENV-01/02/03, SK-01 | `python3 -m unittest discover -s scripts/tests -p test_qa_readiness.py`; `readiness.log`, `static-checks.json` | 9/9 PASS: missing/null/expired/mismatched scope, безопасные diagnostics, independent optional POST, offline-only guards. Disk-only skill проверен без чтения credentials; runtime load не заявлен. |
| COL-01/03 | `python3 -m unittest discover -s scripts/tests -p test_metrica_collection.py`; `collection.log` | 3/3 PASS: topology 73+26 distinct nodes с exact hashes, отрицательные inventory controls, четыре прежних PG nodes **только collected**. |
| COL-01 baseline | `runs/collection-baseline.json`, `collection-baseline.log` | Независимый CLI override `--import-mode=prepend` для двух exact topology modules воспроизвёл import-file mismatch, exit2. Файлы/конфигурация не откатывались; это expected baseline observation, не FAIL текущего importlib. |
| COL-02 | `make -C services/ya-metrica-service test`; `metrica-test.log` | **1578 passed, 276 deselected**, 2 deprecation warnings; инфраструктурные тесты не выполнялись. |
| COL-02 lint/format | `make -C services/ya-metrica-service lint`; `.venv/bin/ruff check .` и `.venv/bin/ruff format --check .` в service cwd | PASS: mypy/flake8, Ruff check, 217 files formatted. Effective aliases не повторялись. |
| AC-03 | Статическая сверка delta access matrix ↔ readiness README | PASS контракта; не runtime AC-01/02. |
| ENV-04/05, SK-02, AC-01/02 | `external-census.json`, `registry.json` | **blocked** до внешних inputs/permits; vendor **unchecked**. Не запускались. |

Q = указанный evidence root, а не буквальный CLI alias. Все commands вызываются через сохранённый `Q/run.py`; реальные argv — в `runs/*.json`. Root formatter не определён: Makefile агрегирует другие сервисы; использованы scoped Node syntax, suites, static links и whitespace check, без второго Python formatter.

## Exact evidence: честная граница результата

**CT-03.** `exact-input-check.json` подтверждает побайтово эквивалентные JSON scenario objects двух исходных cases. Historical before находится в `.qa/restore-seo-qa-readiness/QA-BROWSER-1/reproducer-before.json` и принадлежит owner, не выдан за независимый before QG. Его build hash совпадает с текущим `a8ba0c9e…9278`. Независимый current run подтвердил тот же отказ с новым безопасным reason. Поддерживаемая paint-classification correction **не доказана**; conservative overlap boundary явно закреплена, что допускают design §A и CT-03. Это не закрывает MANUAL-TOOL-01 и не заменяет численные assertions axe.

**RT-03.** Независимые `retry-1794032100984-717573/reproducer-{before,after}.json`: exact role/name assertion FAIL, count0, loading-prefix count1 при nativeDisabled=false/ARIA=null/loading=false; anchored semantic matcher count1/enabled=true PASS на том же input. Исходный exact matcher остаётся отрицательным контролем; true disabled и ambiguity также отклонены. Это исправление диагностики/locator, не product-disabled fix. `provenance.json`: Playwright/expect 1.62.1, AntD6.0.0, общий Chromium, 1366×768. Unreproduced среди этих фактических запусков нет.

До explicit retry posts1/reads1; после принятия posts2/reads2 (существующий reloadFromStart), после явного «Обновить список» reads3. 202 означает принятие, не completion/delivery/vendor PASS. Для QG copies изменены только evidence destination/import resolution; assertions сохранены (`adaptations.json`). Вложенный producer ledger имеет исторические owner labels; авторитетный независимый QG ledger — `runs/retry.json`.

## Findings и residual external inputs

**Blocking / REWORK:** нет нарушений утверждённого code scope. **Waived:** нет.

| Класс / ID | Остаток и решение |
|---|---|
| `blocked-env` EXT-ENV (ENV-04, AC-01/02) | Нет exact dedicated project/network/volumes/API/peer/PG targets, isolation/ACL/current-source attestation, tenants A/B, четырёх role actors, persisted history/binding/pages и owner journal. Нет настоящих раздельных permits environment/actors/PG/read/cleanup. Передать Router/оператору; никаких app fallback и автоматических разрешений. |
| `blocked-env` EXT-SKILL (SK-02) | Skill присутствует на диске, но отсутствует в переданном runtime catalog. Внешний DSH owner и ticket неизвестны (`null`); нужны штатная registration и новая сессия с успешным load. Новый harness/DSH patch запрещены. |
| `blocked-env` EXT-POST (ENV-05) | Нет отдельного synthetic POST permit, exact binding/queue/worker/delivery/no-egress/readback/cleanup. POST blocked; vendor unchecked. |
| Ограничение контракта CT-03 | Legitimate unsupported, не дефект helper scope. Numeric original finding blocked; сложный stacked paint требует отдельного решения, не fake PASS. |
| `pre-existing` BACKLOG-A11Y-CARD | Старые unbound/bound card и forbidden contrast deferred/non-waived. Router назначает отдельную задачу в `docs/tasks`; этот gate её не создаёт и shared palette не меняет. |
| `minor` WARN-COL | Два pytest deprecation warnings для неизменённых parametrization iterables; suite/lint зелёные, скрытых failures нет. |

Полный конечный census **OP-ENV/ACTORS/PG/READ/POST/CLEANUP** — `external-census.json`, с owner/missing inputs/status. Полное штатное средство A/B/roles/history bootstrap не предоставлено: при недостаточности текущего seeder нужен отдельный bounded fixture unit, не one-off SQL.

## Access verification results

Новых/изменённых endpoints нет. Protected gateway GET/POST, SEO-only без ADMIN override и trusted-peer selector exception статически сохранены. Реальные anonymous/authenticated outcomes, tenant B spoof, missing/invalid selector и Cookie/Bearer equivalence остаются **blocked AC-01/02** до допуска; synthetic401 не назван их runtime PASS. PG collection не равна SQL acceptance. Никаких endpoint timings нет, поскольку реальные вызовы запрещены.

Прежний SEO report/change/tasks не изменены. Исторический targeted matcher FAIL и пользовательский дополнительный `manual-contrast-extra-1` остаются историей; extra approval уже исчерпан. Этот code gate не обновляет/обнуляет старую квоту и не выдаёт новый SEO recheck permit. Corrective QG recheck rounds этого change: 0; infra repairs: 0.

## Файлы change и итоговые проверки

Review scoped: `scripts/qa/browser/{assertions.mjs,runner.mjs,schema.mjs,README.md,fixtures/surface.html,fixtures/scenarios.mjs,fixtures/seo-post-retry.mjs}`, `scripts/tests/{qa-browser.test.mjs,qa-post-retry.test.mjs,test_qa_readiness.py,test_metrica_collection.py}`, `scripts/qa/readiness/{README.md,profile.schema.json,validate.py,examples/profile.template.json}`, `services/ya-metrica-service/pyproject.toml` (только importlib). Diff snapshots: `root-scoped.diff`, `metrica-scoped.diff`; topology assertions/guards/runtime не изменялись этим change.

Сам QG изменил только этот отчёт, свои checkbox в `openspec/changes/restore-seo-qa-readiness/tasks.md` и ignored Q evidence. Старый SEO report/tasks hashes сохранены. Чужие infra/shipping/DSH/product diff не присвоены.

Pinned `.cache/openspec-tool/1.14.3/openspec-local status --change restore-seo-qa-readiness --json` — exit0; strict `validate restore-seo-qa-readiness --type change --strict` — PASS. Scoped `git diff --check` root/service и проверка новых файлов — PASS (`diffcheck.log`, `final-integrity.json`). Status planningComplete/isComplete относится к наличию артефактов, не подтверждает runtime acceptance.

**Решение:** code scope APPROVED; внешняя operational acceptance и CT-03 numeric closure остаются blocked. Sync/archive/finalize и прежние SEO tasks — только отдельное решение Router/оператора.
