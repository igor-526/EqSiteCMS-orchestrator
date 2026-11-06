# Quality Gate: harden-agent-verification-pipeline
**Профиль:** QG-FULL · **Вердикт: APPROVED** · **Дата:** 2026-10-29
## Контекст и основание
Унифицированы staged verification/ownership, reusable browser/wire/isolated-infra helpers, SEO stack support и offline ledger; интегрированы SEO/Метрика tests. Продуктовые UI/API/schema/src не менялись в рамках change.
[Proposal](../../openspec/changes/harden-agent-verification-pipeline/proposal.md), [design/matrix/mapping](../../openspec/changes/harden-agent-verification-pipeline/design.md), [delta specs](../../openspec/changes/harden-agent-verification-pipeline/specs/), [tasks](../../openspec/changes/harden-agent-verification-pipeline/tasks.md). Основание scope/approval — делегирование Router по утверждённым specs; отдельный test-only consent подтверждён ENV. Пользовательских waivers нет.
## Lanes
| Lane | Итог |
|---|---|
| QG-ENV | Пройден: read-only PG/NATS readiness, 7 offline preflight; 0 infrastructure repairs. Rebuild/новые migrations не требуются. |
| QG-BE | Пройден: offline24, real acceptance39, 7 fresh manifests, cleanup7/7; 0 repairs/rechecks. |
| QG-CONTRACTS | Пройден после единственного ownership recheck; 7 первых независимых commands, 0 repairs. |
| QG-SYNTH | Пройден: 16 IDs, schema/relations26 lane ledger records, актуальные fingerprints, mapping21, strict validation и scoped diff-check. Suites не повторял. |
| QG-FE-AUTO / QG-FE-MANUAL / QG-LIVE | Неприменимы: нет product UI/API diff. Chromium synthetic принадлежит CONTRACTS, desktop1366×768. |
## Matrix → независимые доказательства
Evidence root: [`.qa/harden-agent-verification-pipeline/`](../../.qa/harden-agent-verification-pipeline/). Ниже пути относительно него.
| ID | Единственный owner | Исполненное доказательство / результат |
|---|---|---|
| POL-01 | CONTRACTS | `pipeline-policy.test.mjs`:49 PASS; `QG-CONTRACTS/registry.json`. |
| FIX-01 | CONTRACTS | Synthetic pending/nonpending exact before=failed→after=passed; одинаковые keys/DOM/environment; `privacy-reproducer-review.json`. Не product fix. |
| BR-01 | CONTRACTS | `qa-browser.test.mjs`: keyboard/focus/remount, nested layers; общий Chromium suite7 PASS. |
| BR-02 | CONTRACTS | Тот же run: geometry/clipping/contrast/axe, unsupported backgrounds не PASS. |
| BR-03 | CONTRACTS | Тот же run: compatibility/schema/privacy; 54 artifacts/26 synthetic traces; sentinel отсутствует, masks визуально проверены lane. |
| WIRE-01 | CONTRACTS | `qa-contracts.test.mjs`:33 PASS + production HTTP8/8 serializer→parser в service env; `WIRE-01/independent-1/summary.json`. |
| WIRE-02 | CONTRACTS | Тот же helper run + production NATS7/7 serializer→handler; invalid TERM/0 storage; `WIRE-02/independent-1/summary.json`. Не real broker proof. |
| INF-01 | BE | `test_qa_infra.py`:24 PASS + real runner adoption9; `QG-BE/scenario-report.json`. |
| PG-01 | BE | Persisted rollback/failure3, новая session: `QG-BE/04-PG-01-ya-metrica-service.json`. |
| PG-02 | BE | SEO4+public-shadow1, Метрика5: bounded two-session contention/fencing/search_path; `01/03/05` reports в QG-BE. |
| NATS-01 | BE | SEO7+Метрика10 real broker existing config/replay/dispositions; `02/07` reports в QG-BE. |
| STACK-01 | CONTRACTS | `stackctl.test.mjs`:205 PASS, mocked Docker; без runtime mutation. |
| USG-01 | CONTRACTS | `test_pipeline_usage.py`:15 PASS общий run; dedup/unknown/conflicts. |
| USG-02 | CONTRACTS | Тот же run; census/coverage/repeats/time/privacy; synthetic, cost/quota not-calculated. |
| ENV-01 | ENV | `QG-ENV/preflight.json`: permit/isolation/deps/readiness passed, не acceptance. |
| SYN-01 | SYNTH | `QG-SYNTH/registry.json`, `fingerprint-check.json`, `mapping-review.json`, `ledger-review.json`, OpenSpec outputs и `scoped-diff-check.json`. |
Полная связь ID→runId→revision/codeFingerprint/environmentFingerprint/options/reason/previousRunId: `QG-SYNTH/registry.json` и lane ledgers. 16 уникальных owners, missing critical/hidden acceptance skips отсутствуют. BR/FIX и USG используют общие runs, не duplicate owners.
Fingerprints CONTRACTS inputs и всех14 BE reports повторно сверены hash-only без запуска suites. Исторические environment facts не выдаются за новый runtime probe. Root HEAD в evidence `90b81c61794971cef0f727255ec81fb04f581461`; fix owner `4c1ed468` — отдельная указанная Router revision; identity определяется fingerprints, а не только HEAD.
## Regression, границы и findings
SEO: canonical scoped format-check + `make lint` PASS; `PYTEST_ADDOPTS=--import-mode=importlib make test`:1440 passed,1 pre-existing skip,137 deselected. Метрика: те же gates PASS;1442 passed,272 deselected,0 skipped/failed. Оба full-suite reason=`independent-qg`, каждый один раз; targeted real acceptance39 — без skip/xfail/partial. Deselected tests не объявлены выполненными.
**CONTRACTS-OWN-01 CLOSED:** исходный gate blocked до исполнения suites из-за четырёх writers в owner evidence. FIX-EVIDENCE-1 добавил безопасный lane override/exclusive child. Owner exact static FAIL→PASS; тот же CONTRACTS агент сделал один targeted recheck: `ownership-recheck.json`, reason=code-changed, previousRunId=`4005d91f191b4939b1f5958c4106e02d`. Затем первые suites PASS;181 owner files fingerprint+mtime сохранены. Это НЕ product FAIL→PASS и НЕ first-pass-clean.
ENV отдельно сохранил initial blocked собственного over-constrained publicCreate assertion; fixture-changed recheck PASS без изменения окружения/продукта. Это не infrastructure repair. У SYNTH была исправлена только диагностическая привязка service поля ledger к canonical run report; suites/код/среда не менялись.
**Открытых findings нет.** Исчерпания budgets нет: ≤120s/scenario,≤900s/suite; infrastructure repairs0; дополнительных recheck циклов нет.
### Pre-existing
SEO `tests/api/test_query_metrics_api.py:99`: `table has no direction field`, один skip вне critical acceptance. Default basename collision `tests/{unit,integration}/test_maintenance_topology.py` воспроизведён на HEAD conftests; разрешён importlib override. Предложение Router: отдельная задача в `docs/tasks` на collection collision и отдельная на skip; здесь чужие fixtures/config не исправляются.
Чужие root Compose,8 main specs,106–107 report/archive, service dirty product src/AsyncAPI/migrations и duplicate-basename untracked исключены. Baseline: `planning/baseline.txt`; scope review ENV/BE/CONTRACTS. SYNTH их не менял; старые106–107 findings не закрывает.
## Mapping, privacy, неприменимость
Все21 строки design Mapping трассированы в `QG-SYNTH/mapping-review.json`: self-check/exact→FIX/BR/POL; paired→WIRE; rollback/lease/search_path→PG/INF; topology→NATS; config/time/lifecycle/formatter/closure/stages/budget→POL; prerequisites→ENV;8 метрик/bootstrap/cache/dedup/time→USG. Fine-tuning и обещание будущей экономии явно вне scope.
Access verification results / API SMOKE / manual UI / vendor OAuth: N/A — нет endpoint/UI diff; anonymous/authenticated/roles/чужие ресурсы не меняются. Synthetic vendor PASS не заявлен. Реальные migrations N/A: SEO prefix fixture closure static/collection2 tests НЕ acceptance выполнения миграций.
Privacy подтверждена `QG-CONTRACTS/privacy-reproducer-review.json`, `QG-BE/privacy.json`; report содержит только sanitized refs, без secrets/env/DSH/raw payload. Waivers отсутствуют.
## Ledger и окончательная validation
`QG-SYNTH/ledger.jsonl` сохраняет исторический first-QG census qgRound1=blocked и закрытие после fix, а не переписывает его в first-pass-clean. Отдельный итоговый handoff после closure — qgRound2=passed; это не новый suite gate. Lane ledgers и before/after сохранены.
`USAGE-1/summary.json` — только synthetic golden: не реальные usage/savings/first-pass changes. Actual session/cache/input/time вне записанных интервалов unknown; cost/quota not-calculated. Проценты экономии/конверсия квот не выводятся.
CLI `.cache/openspec-tool/1.14.3/openspec-local`: `status --change harden-agent-verification-pipeline --json` — все4 planning artifacts done; `validate harden-agent-verification-pipeline --type change --strict` — PASS. Это planning status, фактические checkbox проверены отдельно. Scoped root/service `git diff --check` и проверки ссылок/report uniqueness — PASS; outputs в QG-SYNTH.
## Операционный остаток
BE независимо подтвердил7/7 owned schemas/streams removed,residual0 (`cleanup-independent.json`). Временные контейнеры и SELECT-only public shadow намеренно сохранены: **pending cleanup Router после успешного QG**, не product defect. Consent/cleanup expiry **2026-10-30T14:08:54Z**; не продлевать, при истечении Router запрашивает новое разрешение. SYNTH teardown не выполнял. Затем Router: READY-FOR-MANUAL с пустым runtime списком, sync/validation/archive; merge/release требуют отдельных gates.
## Изменённые пути change
Точный root-relative inventory77 файлов для подготовки `shipctl plan`: [`QG-SYNTH/change-paths.json`](../../.qa/harden-agent-verification-pipeline/QG-SYNTH/change-paths.json). Это allowlist текущего change, не весь dirty status и не разрешение включать чужие изменения.
Группы inventory: `AGENTS.md`; `agents/{planner,backend,frontend,quality_gate}.md`; `agents/howto/{verification-policy,context-economy-patterns,browser-qa-protocol,nats-jetstream-protocols}.md`; `.agents/skills/{qg-lanes,ui-qa,stack-control}/SKILL.md`; `scripts/{stackctl,qa-browser.mjs}`; `scripts/qa/{run-scenarios.mjs,browser/**,contracts/**,infra/**,usage/**}`; `scripts/tests/{pipeline-policy,qa-browser,qa-contracts,stackctl}.test.mjs`, `scripts/tests/{test_pipeline_usage,test_qa_infra}.py`; change artifacts и этот report.
Сервисные пути: `services/seo-service/tests/{conftest.py,clients/test_yandex_lifecycle_contract.py,integration/{conftest.py,test_acceptance_boundaries.py,test_nats_broker.py,test_migrations_postgres.py}}`; `services/ya-metrica-service/tests/integration/{conftest.py,test_acceptance_helpers.py,test_cleanup_worker_postgres.py,test_nats_broker.py}`. Product src/Compose не входят. Ветка рабочего checkout: `main`; отдельная branch convention в design не задана.
