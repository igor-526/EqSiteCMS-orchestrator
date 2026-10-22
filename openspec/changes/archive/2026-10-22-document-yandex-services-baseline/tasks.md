# Tasks — document-yandex-services-baseline

Только документационная приемка и подготовка публикации готового backfill; ownership, DAG и test matrix определены в [design](<design.md#execution-units>). PLAN-Y1/Y2/M1/Y3/S1/F1 — подготовка planning-артефактов, не выполненные implementation tasks. Все checkbox ниже открыты до явного пользовательского approval и фактического выполнения. Source/security/runtime fixes и переписывание README исключены.

## Execution units

Все будущие reports находятся в `docs/reports/document-yandex-services-baseline/`. Каждый unit владеет только своим report; checklist-отметки выполняются последовательно по собственным IDs. Пять delta readonly; при substantive finding Router назначает bounded rework их владельцу, не даёт verification-исполнителю менять соседний slice.

| Unit | Профиль | Deliverable / ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| DOC-1 | Quality Gate | V, будущий `backfill.md` в reports | Явный approval после PLAN-F1 | DOC-OAUTH/TX/GATEWAY/ADAPTER/RUNTIME | [Proposal](<proposal.md>), [design coverage](<design.md#decisions>), [OAuth](<specs/yandex-oauth-accounts/spec.md>), [gateway](<specs/yandex-metrica-gateway/spec.md>), [adapter](<specs/ya-metrica-adapter/spec.md>), [runtime](<specs/yandex-service-runtime/spec.md>), [access](<specs/yandex-services-access-evidence/spec.md>) — только boundaries/scenario list/evidence/gaps |
| QG-CONTRACTS | Quality Gate | C, будущий `contracts.md` в reports | DOC-1 | DOC-ACCESS/SECURITY/LINKS + CLI | [Test matrix](<design.md#test-matrix>), [access matrix/gaps](<specs/yandex-services-access-evidence/spec.md#L20-L101>), [peer clauses](<../../specs/yandex-peer-http-contract/spec.md#L35-L79>), [safe diagnostics](<../../specs/yandex-client-failures/spec.md#L31-L53>), delta по coverage, backfill report |
| QG-FORMAT-PREP (исторический partial) | Quality Gate | F, [format report](<../../../docs/reports/document-yandex-services-baseline/format.md>), готовые owned exports | DOC-1 | Только QG-FORMAT.1 done; архивы готовы, .2 ещё открыт | [PREP handoff](<../../../docs/reports/document-yandex-services-baseline/format.md#L57-L67>) |
| QG-FORMAT-PREP-ENV | Quality Gate | F, environment metadata/deps/local Git baseline в [owned repo](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/>), format evidence/report; original readonly | PREP partial, принятый Router split | До 12 действий, одна environment verification group; завершить QG-FORMAT.2 без Make | [FORMAT protocol и input paths](<design.md#lanes-и-обязательный-format>), этот checklist только FORMAT, [handoff §57–67](<../../../docs/reports/document-yandex-services-baseline/format.md#L57-L67>), [snapshot manifest](<../../../docs/reports/document-yandex-services-baseline/format-snapshot.json>), [PREP metadata](<../../../docs/reports/document-yandex-services-baseline/format-prep-evidence.json>), [env](<../../../docs/reports/document-yandex-services-baseline/format-env.sh>); восемь dependency-input groups по design |
| QG-FORMAT-RUN | Quality Gate | F, те же owned repo и format report/evidence, последовательная передача ownership | PREP-ENV done, Router прочитал handoff | Шесть действий QG-FORMAT.3–.7/.V: root make format/lint/test и Git/generated accounting | [FORMAT protocol](<design.md#lanes-и-обязательный-format>), этот checklist только FORMAT, свежий PREP-ENV handoff (baseline IDs, env/TMPDIR, install exits, ledger), [env](<../../../docs/reports/document-yandex-services-baseline/format-env.sh>), owned root Makefile/инструкции запуска; без source/spec audit |
| QG-SYNTH | Quality Gate | S, будущий `synthesis.md` в reports | QG-CONTRACTS, QG-FORMAT | DOC-SYNTH | [Design](<design.md>), [tasks](<tasks.md>), три полученных backfill/contracts/format report, без source tree |
| DOC-PUB-1 | Quality Gate | U, будущий `publishing.md` в reports | QG-SYNTH = APPROVED | DOC-PUBLISH | [Proposal](<proposal.md>), этот checklist, synthesis report, 5 delta из таблицы DOC-1 как manifest sync, CLI status |

Порядок и параллельность — [DAG](<design.md#execution-units>); QG-CONTRACTS/FORMAT параллельны только с изоляцией FORMAT и сериализованными checklist writes. Внутри FORMAT: исторический PREP partial → PREP-ENV → Router handoff → RUN в свежем контексте → отдельный SYNTH. Остальные units — по 8 действий; PREP-ENV до 12, RUN шесть, по одной группе verification; превышение бюджета → partial + bounded split по environment groups, не семь сессий без обоснования. Неприменимы QG-ENV/BE/FE-AUTO/FE-MANUAL/LIVE: code/runtime/UI diff отсутствует; CONTRACTS/FORMAT/SYNTH обязательны. Процессный split не меняет исторические IDs/checkbox: остаётся 17/40, новые выполненные задачи не заявлены.

## 1. DOC-1 — документационная приемка baseline (профиль: Quality Gate)

**Specs:** пять delta из таблицы выше · **Пути:** будущий backfill report · **Зависит от:** явный пользовательский approval.

- [x] DOC-1.1 Зафиксировать approval и разрешённый docs-only scope в backfill report; проверить отсутствие поручения на runtime/source/README fixes.
- [x] DOC-1.2 Сверить provenance root/двух service HEAD и overlay с handoffs; результат — таблица baseline в report, без реальных env/secrets и нового source audit.
- [x] DOC-1.3 Принять готовый OAuth/account slice по DOC-OAUTH/TX; проверить наличие 21 сценария и E1..E10/gaps, записать результат без утверждения runtime PASS.
- [x] DOC-1.4 Принять gateway/binding slice по DOC-GATEWAY/TX; проверить 22 сценария, ciphertext/xfail, DB/concurrency gaps и зафиксировать результат в report.
- [x] DOC-1.5 Принять adapter slice по DOC-ADAPTER; проверить 17 сценариев/8 requirements, config/lifecycle и отсутствие найденной DB persistence операции; записать результат.
- [x] DOC-1.6 Принять runtime slice по DOC-RUNTIME; проверить 20 сценариев, DI/session/transaction ownership и limits readiness/shutdown/pooling/telemetry; записать результат.
- [x] DOC-1.7 Проверить включение 20 access scenarios и всего набора 5 capabilities/100 сценариев; в report передать ссылки на S1 matrix/gaps/FT, не копировать доменную норму.
- [x] DOC-1.V Свести DOC-OAUTH/TX/GATEWAY/ADAPTER/RUNTIME в backfill report, отдельно указать NOT RUN runtime; отметить только выполненные IDs и вернуть Router handoff. Substantive finding — bounded owner rework, не самостоятельная правка delta.

## 2. QG-CONTRACTS — статическая сверка контрактов (профиль: Quality Gate)

**Specs:** все пять delta; main clauses только по ссылкам · **Пути:** будущий contracts report · **Зависит от:** DOC-1.

- [x] QG-CONTRACTS.1 Проверить наличие/границы принятого backfill report и 5 capabilities proposal↔delta; результат — manifest в contracts report.
- [x] QG-CONTRACTS.2 Выполнить DOC-ACCESS: сверить 28 method/path, 20 app-qualified paths, business/health/docs/HEAD и routing rejection coverage; записать counts и ограничения inference.
- [x] QG-CONTRACTS.3 Проверить method/path/access class/roles/without-auth/with-auth всех строк S1 и причины существующих exceptions по main; результат — explicit unchanged governance, не новые anonymous write approvals.
- [x] QG-CONTRACTS.4 Проверить раздельность anonymous/fake-header/valid-auth unknown и foreign fixtures, трассировку FT-01..03/07; результат записать без вымышленных сессий/denial outcomes.
- [x] QG-CONTRACTS.5 Выполнить DOC-SECURITY по S1 и FT-04..06/08: token/state/refresh/key/log/exposure gaps, unsafe log conflict и production gate сохранены; результат в report.
- [x] QG-CONTRACTS.6 Выполнить DOC-LINKS: проверить локальные targets/line ranges всех восьми артефактов и семантическую сохранность E1..E10 proposal; результат — counts/errors в report, без повторного implementation audit.
- [x] QG-CONTRACTS.7 Выполнить `openspec-local status --change document-yandex-services-baseline --json` и `openspec-local validate document-yandex-services-baseline --type change --strict`; сохранить exit codes/вывод в report, отличать planning done от implementation/QG done.
- [x] QG-CONTRACTS.V Свести DOC-ACCESS/SECURITY/LINKS и CLI в contracts verdict; проверить сохранение main backend 401/403 и docs-only scope, отметить фактически выполненные IDs, передать Router handoff и bounded findings при необходимости.

## 3. QG-FORMAT-PREP — историческая подготовка (профиль: Quality Gate)

**Deliverable:** F · **Пути:** [format report](<../../../docs/reports/document-yandex-services-baseline/format.md>), owned isolation · **Зависит от:** DOC-1. Принят partial: root+8 nested и approved-docs archives готовы, Make не запускался. Original readonly, exports не повторять; docs-only не отменяет FORMAT.

- [x] QG-FORMAT.1 Зафиксировать исходный root status и approved docs diff boundary в format report; проверить, что чужой overlay не будет форматироваться/сбрасываться/коммититься.

## 3a. QG-FORMAT-PREP-ENV — завершить окружение и baseline (профиль: Quality Gate)

**Deliverable:** F, последовательный ownership · **Зависит от:** принятый PREP partial. Только существующий QG-FORMAT.2; операционные действия ниже не добавляют checkbox и не закрываются авансом. [Протокол/budget/input paths](<design.md#lanes-и-обязательный-format>) обязателен.

1. Принять frozen [snapshot manifest](<../../../docs/reports/document-yandex-services-baseline/format-snapshot.json>)/[sealed](<../../../.qa/qg-format-document-yandex-services-baseline-v1/sealed/>), сверить разрешённые hashes/metadata, подготовить sanitized env через [format-env.sh](<../../../docs/reports/document-yandex-services-baseline/format-env.sh>) и новый пустой test TMPDIR sibling [owned repo](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/>), не внутри repo. uv PATH/версии известны; без повторного source/secret/cache audit.
2. Создать batch Git-aware/path-accounted baseline root+8 nested только из safe exports. Разрешён throwaway local Git baseline внутри owned export для diff measurement, не продуктовые коммиты/ветки/original objects. Зафиксировать mapping baseline IDs, исключения и начальные tracked/index status; original Git и исключённые secret blobs не читать/не менять.
3. Подготовить locked Python env backend по его `pyproject.toml`/`uv.lock` в owned export.
4. Подготовить locked Python env notification-service по его immutable inputs.
5. Подготовить locked Python env email-service по его immutable inputs.
6. Подготовить locked Python env vk-service по его immutable inputs.
7. Подготовить locked Python env seo-service по его immutable inputs.
8. Подготовить locked Python env yandex-service по его immutable inputs.
9. Подготовить locked Python env ya-metrica-service по его immutable inputs.
10. Подготовить frontend locked Node env по существующим `package.json`/`package-lock.json`. Для всех восьми installs сохранить точные команды/cwd/exits, не использовать original deps; pins/locks/configs immutable, дополнительные frozen build tools — только evidence-local metadata.
11. Одна environment verification group: tools/install exits, unchanged input hashes, root+nested tracked/index clean baseline и generated allowlist/ledger. Никаких `make format/lint/test` в PREP-ENV. Environment repair limit **2**; прежние exporter safety guards не dependency repair. После лимита — конкретный blocker/partial и остановка, не бесконечные installs/расследования. Превышение 8–12 действий — split по обоснованным environment groups до расширения.
12. Передать Router handoff: точные paths/baseline IDs/env/TMPDIR, восемь install exits, hashes/generated ledger, blockers, фактические task IDs; остановиться. RUN получает новую сессию и не повторяет exports/provisioning.

- [x] QG-FORMAT.2 Завершить готовый изолированный snapshot: Git-aware baseline root+8 nested и восемь locked env по действиям PREP-ENV; сохранить baseline/manifest и начальный clean tracked/index status, environment verification и handoff. Отмечать только при готовности всех восьми окружений; невоспроизводимость — конкретный infrastructure blocker, не PASS. Frozen source/main accepted contracts/18 approved files остаются content-as-is, без userdocs rewrites или core fixes.

## 3b. QG-FORMAT-RUN — обязательная root verification group (профиль: Quality Gate)

**Deliverable:** F, тот же ownership после handoff · **Зависит от:** QG-FORMAT.2 done и прочитанный Router PREP-ENV handoff. Свежий контекст, шесть действий ниже; все три root команды обязательны, безопасный nonzero не отменяет остальные. До/между/после команд — root+nested tracked/index diffs/status и generated accounting; не переносить formatter diff в original. Изменения approved source — findings без fixes, generated outputs учитывать отдельно. Полные правила failure/approval — [FORMAT protocol](<design.md#lanes-и-обязательный-format>).
- [x] QG-FORMAT.3 Запустить обязательный `make format` из корня clean worktree; сохранить команду, stdout/stderr, exit code и статус, не переносить unrelated formatter changes в исходное дерево.
- [x] QG-FORMAT.4 Запустить обязательный `make lint` из того же корня; сохранить команду, stdout/stderr, exit code или конкретную infrastructure failure, не исключать проверку из-за docs-only.
- [x] QG-FORMAT.5 Запустить обязательный `make test` из того же корня; сохранить команду, stdout/stderr и exit code, не объявлять сервисные/runtime сценарии выполненными по факту root tests.
- [x] QG-FORMAT.6 Проверить итоговый `git status --short` clean worktree и соответствие разрешённому docs diff; зафиксировать чистоту/неожиданные изменения, не маскировать их автоматическим коммитом или reset исходного overlay.
- [x] QG-FORMAT.7 Классифицировать failures/infrastructure по одному failing target/slice и предложить bounded follow-up с ownership/verification; результат — реестр blockers в format report, без бесконечного baseline repair или непрошенных fixes.
- [x] QG-FORMAT.V Свести DOC-FORMAT, все три exit codes и root clean-worktree outcome в format verdict; проверка не считается APPROVED при неразрешённых blockers, отметить фактические IDs и передать Router handoff.

## 4. QG-SYNTH — единый итоговый gate (профиль: Quality Gate)

**Пути:** будущий synthesis report · **Зависит от:** QG-CONTRACTS и QG-FORMAT.

- [x] QG-SYNTH.1 Проверить полноту backfill/contracts/format reports и их привязку к одному разрешённому docs snapshot; результат — evidence index в synthesis report.
- [x] QG-SYNTH.2 Проверить обязательность CONTRACTS/FORMAT/SYNTH и обоснование N/A ENV/BE/FE-AUTO/FE-MANUAL/LIVE по отсутствию diff; записать lane table, не N/A для FORMAT.
- [x] QG-SYNTH.3 Проверить разрешение всех contract findings либо точные bounded owner rework units; незакрытые blockers перечислить явно в synthesis report.
- [x] QG-SYNTH.4 Проверить make format/lint/test и clean-worktree outcome по format report; документированные failures не заменять успешными проверками.
- [x] QG-SYNTH.5 Проверить scope: нет source/runtime/security/README fixes и переноса root onboarding tasks; результат — scope verdict без чтения всех старых root QG logs.
- [x] QG-SYNTH.6 Проверить сохранение production gate и всех unknowns/NOT RUN runtime, включая valid auth, live cross-service и реальные PostgreSQL constraints; результат — limitations в report.
- [x] QG-SYNTH.7 Сформировать итоговый verdict по evidence: APPROVED только при реально удовлетворённых применимых gates; иначе rework/blocked с ограниченным следующим unit, результат — synthesis report.
- [x] QG-SYNTH.V Проверить согласованность итогового verdict/checkbox с фактическим evidence, отметить выполненные IDs и передать Router handoff; planning strict сам по себе не является этим approval.

## 5. DOC-PUB-1 — пакет передачи на публикацию (профиль: Quality Gate)

**Пути:** будущий publishing report · **Зависит от:** QG-SYNTH = APPROVED. Это подготовка publishing, не выполнение sync/archive/finalize.

- [x] DOC-PUB-1.1 Зафиксировать ссылку на фактический QG-SYNTH APPROVED и пользовательский approval в publishing report; при отсутствии любого gate остановиться с конкретным blocker.
- [x] DOC-PUB-1.2 Составить manifest пяти delta→целевых main capability paths из proposal; проверить отсутствие изменений существующих client-failures/peer contracts.
- [x] DOC-PUB-1.3 Проверить статус текущих docs tasks и отсутствие неразрешённых bounded rework findings; результат — readiness table, без автоматической отметки невыполненных tasks.
- [x] DOC-PUB-1.4 Сверить итоговый provenance/accepted overlay snapshot с QG evidence; результат записать, исходный dirty overlay не менять.
- [x] DOC-PUB-1.5 Зафиксировать последовательность отдельных skill gates sync→strict→archive→task-finalize и их preconditions по design; результат — Router checklist в publishing report, не исполнение этих действий.
- [x] DOC-PUB-1.6 Указать документационный rollback scope и сохранённый production gate; проверить отсутствие deployment/release permission в пакете.
- [x] DOC-PUB-1.7 Выполнить финальные status JSON и strict validation подготовленного пакета; сохранить команды/exit codes в publishing report, runtime остаётся NOT RUN.
- [x] DOC-PUB-1.V Проверить DOC-PUBLISH по manifest/gates/evidence, отметить фактически выполненные IDs и передать Router publishing handoff без sync/archive/commit в этом unit.

## Workflow follow-up

- Router после выполненного docs checklist и QG-SYNTH APPROVED проходит `openspec-sync-specs` для пяти delta; не переносит peer/security/runtime fixes или посторонний overlay.
- Выполнить повторную strict validation синхронизированного change; при ошибке назначить точный bounded rework до archive.
- Пройти `openspec-archive-change` по его preconditions, затем `task-finalize` с отдельными актуальными approval gates. Требуемые этими skills metadata/commit/env/release действия не разрешены заранее данным planning и не выполняются PLAN-F1.
- Сохранить evidence ссылок после архивирования и отдельный production gate: docs completion не доказывает protection sensitive peer APIs и не разблокирует production deployment/release.
