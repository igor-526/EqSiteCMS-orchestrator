# Review: seo-metrica-task-monitor

**Профиль: QG-FULL · Вердикт: BLOCKED · Дата: 2026-11-07**

## Итог и контекст

**MANUAL-A11Y-01 закрыт** scoped fix и независимым targeted recheck того же QG-FE-MANUAL: 2/2 PASS, axe0. Открытых подтверждённых product blocking/minor findings нет. Вердикт изменён REWORK → **BLOCKED**: ключевая real acceptance и инструментальные UX assertions ещё не подтверждены. Waivers отсутствуют; пользовательское «Да» разрешало scoped fix и ровно один дополнительный recheck, НЕ принятие остаточных рисков и НЕ real PG/API/POST permit. Sync/archive/merge/release/finalize не разрешены этим отчётом.
Реализованы read-проекция ledger Метрики, SEO gateway, пагинируемое окно задач и перенос запуска внутрь него; регистрация PG runner ограничена четырьмя exact nodes. Схема БД/workers/AsyncAPI не меняются.
История tenant-wide, включая прежние привязки; без действующей привязки вход из UI исчезает, API сохраняется. 202 означает принятие, не выполнение: ручное чтение без optimistic строки/polling. Это согласованный trade-off, не дефект.

## Ссылки и scope

- [Задача](../tasks/110_seo_tasks.md), [proposal](../../openspec/changes/seo-metrica-task-monitor/proposal.md), [design: матрица/риски/ownership](../../openspec/changes/seo-metrica-task-monitor/design.md), [delta specs](../../openspec/changes/seo-metrica-task-monitor/specs/), [tasks](../../openspec/changes/seo-metrica-task-monitor/tasks.md).
- Основание approval: переданный Router контекст завершённых owner units; отдельная цитата/артефакт пользовательского approval в SYNTH не предоставлены. Это не разрешение runtime mutations или финализации. Ветка design не задана.
- Полный **path-scoped список 68 файлов от корня**, включая approved TablePaginator closure и удаление WebmasterStub: [changed-paths.json](../../.qa/seo-metrica-task-monitor/QG-SYNTH/changed-paths.json). Root shipping/dsh/посторонний dirty diff исключён, в scope автоматически не включён.
- SYNTH изменил только этот отчёт, checkbox QG-SYNTH в tasks.md и ignored `.qa/seo-metrica-task-monitor/QG-SYNTH/`. Product не менялся; suites/browser не повторялись.

## Lanes

Все ссылки evidence далее относительно `.qa/seo-metrica-task-monitor/`.

| Lane | Статус и независимое evidence |
|---|---|
| QG-ENV | blocked-env: offline доступно; PG/actors/permits/isolation/current-source readiness отсутствуют. `QG-ENV/prerequisites.md`, `environment.json`, `stack-status.json`, `ready-dry-run.json`. Repairs/rebuild/migrations/DB connections: 0; status/health не доказывают current-source readiness. |
| QG-BE | Offline пройдено; PG blocked-env; full Метрики pre-existing collection failure. `QG-BE/notes.md`, `ledger.json`. |
| QG-FE-AUTO | пройден: FE-01..10, full/lint/typecheck/layout/build. `QG-FE-AUTO/handoff-notes.md`, `registry.json`. |
| QG-CONTRACTS | пройден после единственного targeted recheck; CONTRACTS-01/02 закрыты. `QG-CONTRACTS/recheck.md`, `recheck-closure.json`, before/after JSON. |
| QG-LIVE | blocked-env/blocked-tool: SM-01..04 не исполнены, vendor unchecked. `QG-LIVE/prerequisites.md`, `ledger.json`. |
| QG-FE-MANUAL | product finding CLOSED; blocked-env/tool сохраняются. `QG-FE-MANUAL/contrast-recheck-handoff.md`, `contrast-recheck/closure.json`, `registry.json`; прежний handoff исторический. |
| QG-FORMAT | отдельный lane неприменим; scoped проверки включены в BE/FE-AUTO, без mutating formatter. |
| QG-SYNTH | сведение выполнено; status/strict PASS, единый вердикт BLOCKED после closure. |

## Конечный scenario/evidence census

[registry.json](../../.qa/seo-metrica-task-monitor/QG-SYNTH/registry.json): **33 уникальных ID, 17 passed / 16 blocked / 0 real failed / 0 unchecked на верхнем уровне**. Исторический product fixture failure и его scoped closure записаны отдельно; непроверенные подветки сохраняются — это не зелёный UX gate. ENV planned/unchecked snapshot заменён evidence назначенных владельцев, а не засчитан вторым прогоном.

| Design ID → риск/spec | Единственный evidenceOwner | Факт / точная трассировка |
|---|---|---|
| TOOL-01/02 → R-PERMIT | CONTRACTS | passed: TOOL32, exact4 positive + 2 negative; `TOOL-UT-recheck.log`, `CONTRACTS-01-reproducer-after.json`. |
| UT-M-01 → MT-03..07; UT-M-02 → MT-09..11 | BE | passed: 60 + 76; `ya-metrica-service-UT-M-01.log`, `ya-metrica-service-UT-M-02.log`. SQLite truth table не PG. |
| UT-GW-01/02 → GW-01..04 | BE | Исходные 99 PASS; после DTO fix impacted83 PASS у CONTRACTS, без дублирования; `WIRE-01-client-safe502-recheck.log`. |
| PG-01..04 → R-AGG/ORDER/SNAPSHOT/HISTORY, MT-01..09 | BE | blocked: aggregate_identity/status_order_pagination/consistent_read_snapshot/history_survives_cleanup не запускались; exact paths в design и BE registry. |
| WIRE-01 → R-WIRE, MT-01/GW-01/02 | CONTRACTS | passed: production serializer→parser, 8 cases/15 enum combos; `wire-results-recheck.json`. Producer не изменён, consumer перепроверен в отдельном lockfile env. |
| FE-01..10 → R-FE | FE-AUTO | passed: registry содержит точные API/service/hooks/scopes/modal/card/SeoPage tests и static review refs; MSW/mock-only. |
| SM-01..04 → R-LIVE | LIVE | blocked: реальные auth/selector/spoof/history/POST outcomes отсутствуют; `ledger.json`. |
| UI-QA-01..08 / FE-11 → R-UX, UI-01..06/RF-01..03 | MANUAL | real blocked все8; fixture aggregate: 01/02/03/07 failed, 04/05/08 passed, 06 blocked. Исторические product fail03/07 superseded scoped contrast closure2/2 PASS; это не общий PASS этих групп. 01/02 — pre-existing, 06 — matcher gap. |

Не закрыты: real PG dedup/order/snapshot/cleanup, live access/history/POST; browser retry/revoke/binding-change pending GET, computed hover/focus contrast, полная 31-дневная UI-матрица метрик, actual vendor path. FE unit assertions и закрытые два contrast cases не заменяют browser/PG acceptance. NATS topology/write recovery/migrations, filters/debounce/user sort, tablet/mobile неприменимы: соответствующего diff нет.

## Unit / Integration и Frontend test gate

- BE: backend `make test` **2644 PASS + 5 pre-existing skip**; `make lint`/canonical PASS. Это исторический full до DTO fix, **не full PASS новой fingerprint**. Изменённые schema/client/API границы покрыты impacted83 и paired recheck; неизменённые checks сохранены по blast radius, full не повторялся.
- Метрика: targeted136 PASS, `make lint` и canonical Ruff check/format-check PASS; full `make test` **exit2 collection error, не PASS**. PG0 исполнений; collection/skip не evidence SQL semantics.
- FE: `make test` = `npm test` = `vitest run`: **107 файлов / 1625 PASS**; девять изменённых test files/268 assertions-tests входят в этот run, не отдельный повтор. `make lint` включает ESLint/typecheck; отдельный tsc/aliases не повторялись. Canonical ESLint layout dry-run: 0 errors/drift, `npm run build` PASS.
- Test quality: data/error/empty, pagination/reset/stale, permissions/no ADMIN override, nested pending/double-submit/202/no table invalidation, unlink5s и API-layer/no site mixing проверены, не только snapshots. Owner self-check не заменял независимый QG.
- После bounded contrast fix: owner targeted35 PASS, scoped ESLint/layout/typecheck/build PASS, impacted UI-QA-02/05/07 3/3 PASS. Независимый MANUAL extra run: только два exact contrast cases 2/2 PASS. Исторический full1625 не переименован в новый full: invalidation известного локального CSS/span/test blast radius закрыта targeted evidence, без повторного full/lint.
- CONTRACTS: TOOL32 PASS, inventory8 PASS; numeric RFC3339 guard и neutral502 regression закрыты exact before→after. OpenSpec SYNTH: pinned `.cache/openspec-tool/1.14.3/openspec-local status --change seo-metrica-task-monitor --json` и `validate seo-metrica-task-monitor --type change --strict` → exit0. `QG-SYNTH/openspec-status-after-contrast.json`, `openspec-validate-after-contrast.log` (обновлены после closure). `isComplete` означает полноту planning artifacts, не acceptance/tasks PASS.

## Browser evidence и Access verification results

MANUAL: Chromium **1366×768**, fail-closed synthetic API, текущий production build; 29 уникальных cases **16 PASS / 13 FAIL**, один targeted503 повтор FAIL отдельно. Canonical5/9 и supplemental11/20; supplemental exit0 не suite PASS. 9 screenshots действительно просмотрены агентом (список в handoff §§54–65); `browser/report.json`, `supplemental/report.json`, `supplemental/targeted-report.json`, `fixture-requests.json`. Traces OFF. Unexpected API/page errors0; injected errors в console/network сохранены, не названы outage. Native keyboard-scroll/focus/geometry PASS, прежний scrollability fix не регрессировал. Исторические 29 cases и targeted503 FAIL не переписаны. Разрешённый дополнительный независимый run `manual-contrast-extra-1`: **2/2 PASS**, empty7:1 и hovered reload6.15:1 при пороге4.5, axe0/console/network/page errors0; posts0. Оба новых screenshots действительно просмотрены (`contrast-recheck/supplemental/{empty,keyboard-focus}.png`); trace OFF. Новые ratios получены прямыми axe checks, не проблемным canonical helper.

| Граница | Проверенный offline outcome | Реальное подтверждение |
|---|---|---|
| GET `/api/seo/metrica/tasks` | anonymous401 до query/peer; SEO-only/SEO+ADMIN200; остальные403; invalid400; neutral502. Actor-bound selector, spoof B не пересылается. | SM-01/03 blocked |
| GET `/api/metrica/tasks` | anonymous и Cookie/Bearer: UUID selector200/invalid query400; missing/invalid selector401 прежде query/storage; credentials selector не заменяют. | SM-02 blocked |
| POST `/api/seo/parse-jobs` | Protected Write прежний, SEO guard, safe400/401/403/502/503 и synthetic202/pending/double-submit. Browser явный retry недоказан. | SM-04 blocked |

Два GET — документированные исключения Public Read (служебная tenant history, trusted-network peer). Браузер не вызывает peer. Внешняя недоступность credential-less peer и БД **не подтверждена**, R-ISOLATION остаётся отдельным блокирующим release gate.

| Smoke | HTTP / время | Причина |
|---|---|---|
| SM-01 gateway access; SM-02 peer selector | null / null | safe API+real PG/isolation/actors/auth inputs и runtime skill отсутствуют |
| SM-03 tenant A/B history/spoof/pagination | null / null | дополнительно нужны persisted A/B fixtures и setup/cleanup permit |
| SM-04 POST→явный GET | null / null | дополнительно отдельный POST permit, binding, готовые queue/worker; vendor unchecked |

## Findings, Pre-existing, Waivers

- **MANUAL-A11Y-01 CLOSED (ранее blocking):** те же `UI-QA-03-empty` и `UI-QA-07-keyboard-reload`, synthetic SEO/empty либо mixed100/native keyboard/reload. Owner exact before→after: Empty description3.36→7:1 и hovered reload span2.98→6.15:1; feature-local Empty span/CSS без shared palette/outline/disabled изменений. Независимый after того же MANUAL: 2/2 PASS, axe0, native scroll/focus сохранены; `QG-FE-MANUAL/contrast-recheck-handoff.md`, `contrast-recheck/closure.json`, `contrast-recheck/supplemental/targeted-report.json`. Исходный независимый before сохранил serious contrast1 на каждом state, но не numeric ratios; исходные ratios принадлежат owner diagnostics, не выдуманы задним числом для QG. Открытых подтверждённых product blocking findings: **0**.
- **minor открытых: 0.** CONTRACTS-01 (blocking exact-node registry) и CONTRACTS-02 (minor numeric date) закрыты независимым exact recheck, не waiver.
- **blocked-env:** PG4, SM4 и real UI8: dedicated `_test` DB/role/target, isolation, manifest/exact consentRef/resources/actions/expiry permit, actors/tenants/history/binding/current-source readiness не предоставлены. Никакого app DB fallback, setup/teardown, secrets discovery; HTTP/PG/real POST0.
- **blocked-tool MANUAL-TOOL-01:** normal/error `contrast_unsupported`; numeric hover/focus unchecked. Root helper вне scope. **MANUAL-TOOL-02:** POST matcher FAIL, но DOM disabled=false и визуально enabled; product-disabled regression НЕ подтверждён, retry unchecked. api-smoke-test есть на диске, отсутствует в runtime catalog. Внескоуповые tools не исправлялись.
- **Pre-existing:** BE-PRE-01 — Метрика basename collision двух test_maintenance_topology.py, оба HEAD44408c5; exact collection reproducer/HEAD equality в `QG-BE/preexisting-collision.{json,log}`. BE-PRE-02 — 5 backend skips с HEAD equality. MANUAL-PRE-01 — старые card/forbidden contrast (baseline diff/HEAD в MANUAL); FE TablePaginator identical-functions warning; CONTRACTS-PRE-01 — прежние root Makefile aggregate order. Не блокируют diff сами по себе, не устранены и не waived. Предложение отдельной задачи `docs/tasks/<новый-ID>_qg_preexisting.md`: раздельно collection collision, baseline accessibility и tooling/aggregate debt; файл здесь не создавался.
- **Waivers:** отсутствуют. Пользовательское «Да» (Router handoff) = approval scoped contrast fix + **одного** дополнительного targeted recheck сверх лимита; не waiver, не разрешение real acceptance/provisioning.

## Fingerprints, invalidation, бюджет

`QG-SYNTH/fingerprint-audit.json` сохраняет исходную сверку; `contrast-closure-audit.json` — актуальная сверка нового MANUAL snapshot и closed finding. Bounded product drift: `MetricaTasksModal.tsx`, `.test.tsx`, `seoStyles.ts`, плюс `.next/BUILD_ID` среди ранее хешированных файлов. Остальные сервисы/контракты не инвалидированы локальным CSS/span fix; исходный FE full исторический, impacted owner35/3cases + независимые2cases закрывают только соответствующую границу. Backend прежняя invalidation DTO/schema+2 tests закрыта CONTRACTS83/paired, не новым full PASS.
Revisions root `a84e18018831af956db642b9d84ae3dda534b0a5`, backend `bc65f10314bffa50980e549f876b188b06707931`, Метрика `44408c5a1cf1817e8ccc6096e37abb8f74477547`, FE `bd42a705de67817a73a27f9ebd2d6797f920eb73`; dirty hashes важнее неизменного HEAD.
Новый MANUAL codeFingerprint `e6875a9d6e67abc361bbb37477e4122715ff4c31105ab4c301ce152f87c6f06c`, предыдущий `c077ff64…`; post-run drift0, SYNTH independently сравнил новый snapshot с диском. BE/CONTRACTS/FE historical fingerprints/options сохранены в ledgers. ENV attestation `5a90e8d242637817d652b458a2f715c196160e1218679ba70f774d9426b2805d`; FE/MANUAL independent environmentFingerprint=null, LIVE code/env/runtimeRevision=null. Lock alignment/runtime↔source не выдуманы.
**Один change-level qgRound1 census** дополнен explicit user-approved extra run, а не молча сброшенным лимитом: CONTRACTS targeted round1 closed, MANUAL прежний matcher recheck FAIL и разрешённый дополнительный `manual-contrast-extra-1` PASS2/2, reason=code-changed, previousRunId=manual-supplemental-1. `QG-SYNTH/qg-round-census.json` сохраняет history/approval. Infra repairs0; новых suites/browser/rechecks SYNTH0. Разрешение extra run исчерпано; новых повторов автоматически нет.

## Чеклист доработки и конечные решения

### Backend
- Нового product fix не назначено. После предоставления prerequisites возобновить только PG/real HTTP acceptance у BE/LIVE; pre-existing collection collision — отдельная задача, не расширение этого change.

### Frontend
- F-2-CONTRAST-FIX-1 завершён, MANUAL-A11Y-01 независимо CLOSED. Нового product fix не требуется по этому finding. Старый card/forbidden contrast — отдельный pre-existing backlog, не waiver и не причина требовать palette retrofit в change.

### Quality Gate
- **Необходимые inputs для PG/LIVE/real UI:** safe dedicated `_test` DB/role/target и isolation attestation, exact manifest/consentRef/resources/actions/expiry permits; current-source API readiness; tenant A/B persisted history, SEO-only/SEO+ADMIN/non-SEO auth inputs, UI consent; доступный runtime api-smoke-test. Для SM-04 дополнительно отдельный POST permit, binding и готовые queue/worker; vendor path без credentials/permit остаётся unchecked. Production peer/DB isolation подтверждается отдельно перед release.
- **Отдельное решение по инструментальным gaps:** bounded diagnosis/ownership для MANUAL-TOOL-01 canonical contrast helper и TOOL-02 contradictory POST retry matcher либо конкретное явное принятие соответствующих непроверенных веток. Сейчас решения/waiver нет; product-disabled regression не подтверждён. Revoke/binding-change и полная metrics matrix также остаются явно непроверенными browser ветками. Новых rechecks этим SYNTH не назначается.
- **Pre-existing backlog:** отдельно зарегистрировать задачу collection collision Метрики и baseline accessibility/tooling debt; не чинить окружение или чужие пути внутри этого unit.
- M-1.6/V, M-2.V, F-2.8, ENV.3/.4, BE.3, LIVE.2..4, MANUAL.3/.4 сохранены unchecked. QG-SYNTH.1..4/V уже отмечены за выполненный синтез, новых checkbox не требуется. После inputs/решений обновляется этот же отчёт; без положительного verdict sync/archive/finalize не запускаются.
