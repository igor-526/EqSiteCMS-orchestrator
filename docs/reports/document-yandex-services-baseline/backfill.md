# Документационная приёмка baseline — document-yandex-services-baseline

## DOC-1-PREP: DOC-1.1 — approval и границы

Статус: выполнена только подготовка DOC-1.1/.2. Это рабочий backfill report, **не итоговый Quality Gate report и не QG APPROVED**, не разрешение merge/release.

Прямой approval пользователя, переданный в задании:

> «Да. Заодно синхронизируй и заархивируй остальные незаархивированные спеки в том виде, в котором они и есть сейчас».

Approval принят для публикации сервисного docs-only change `document-yandex-services-baseline` и последующих sync/archive остальных незаархивированных specs **content as-is**. Это не поручение исправлять source/runtime/README, менять delta, закрывать невыполненные checkbox или обходить QG. Approval на действие не является доказательством качества реализации.

В этом unit разрешены только данный report, metadata evidence с префиксом `doc-1-prep-` и два checkbox DOC-1.1/.2 в [tasks](<../../../openspec/changes/document-yandex-services-baseline/tasks.md#L23-L24>). Source/specs/прочие changes read-only. Пять delta и исходники не читались; proposal повторно не читался. Design не менялся. Sync/archive/commit, Make/npm/uv/Docker/runtime, installs/cache audits не выполнялись. Чужой dirty overlay не исправлялся, не форматировался и не присваивается этому unit.

## DOC-1.2 — provenance и baseline

Основания: handoff PUB-PLAN-0 из задания, PLAN-F1 и owners, переданные через него; [design: provenance/scope](<../../../openspec/changes/document-yandex-services-baseline/design.md#L5-L20>); прямые `git rev-parse HEAD` и `git status --porcelain=v1 --untracked-files=all` в корне и двух сервисах. Сырые metadata и scoped verification: [DOC-1-PREP evidence](<doc-1-prep-metadata.json>).

| Слой | HEAD из handoff | HEAD в DOC-1-PREP | Статус и сверка |
|---|---|---|---|
| Root | `457be4391fa800214ce6939030d3e125962b89be` | `457be4391fa800214ce6939030d3e125962b89be` | Совпадает; dirty overlay. Документы из рабочего дерева не приписываются HEAD. |
| yandex-service | `d3cf1dc5879d5ebc2f75bbdb437ca657cf1a4de4` | `d3cf1dc5879d5ebc2f75bbdb437ca657cf1a4de4` | Совпадает; clean, status пуст. |
| ya-metrica-service | `0bd7434cc97ac41f0a0aef1088e99b77ead48e1b` | `0bd7434cc97ac41f0a0aef1088e99b77ead48e1b` | Совпадает; clean, status пуст. |

Root status содержит 159 исходных записей. В частности, change `document-yandex-services-baseline` untracked; main `yandex-client-failures`/`yandex-peer-http-contract` untracked; прежний активный `normalize-yandex-client-failures` удалён, его архив `2026-10-19-normalize-yandex-client-failures` untracked. Это согласуется с переданным accepted archived normalization overlay: он сохранён, не создан этим unit. Другие modified/deleted/untracked записи перечислены только как metadata в evidence; их содержимое, причины и авторство не аудировались. Установить точное побайтовое равенство overlay прежнему PUB-PLAN-0 нельзя: прежний полный snapshot не передан. Подтверждены HEAD, clean двух сервисов и совместимые признаки root overlay, а не полная историческая идентичность.

### Provenance owners и границы evidence

| Переданный owner / handoff | Срез и источник | Следующая приёмка |
|---|---|---|
| PLAN-Y1 / DOC-OAUTH, DOC-TX | OAuth/account; [yandex-service](<../../../services/yandex-service/>) | DOC-1.3: 21 сценарий, E1..E10/gaps |
| PLAN-Y2 / DOC-GATEWAY, DOC-TX | Gateway/binding, transactions; тот же [yandex-service](<../../../services/yandex-service/>) | DOC-1.4: 22 сценария, ciphertext/xfail, DB/concurrency gaps |
| PLAN-M1 / DOC-ADAPTER | Adapter; [ya-metrica-service](<../../../services/ya-metrica-service/>) | DOC-1.5: 17 сценариев / 8 requirements, config/lifecycle, DB persistence limits |
| PLAN-Y3 / DOC-RUNTIME | Runtime/DI/session/transaction ownership; [yandex-service](<../../../services/yandex-service/>) | DOC-1.6: 20 сценариев, readiness/shutdown/pooling/telemetry limits |
| PLAN-S1 | Access matrix/gaps/FT, межсервисные границы | DOC-1.7: 20 access scenarios, ссылки S1, пять capabilities / 100 сценариев |
| PLAN-F1 → PUB-PLAN-0 | Planning synthesis и metadata handoff | DOC-1.V: свести принятые slices, не дублировать доменную норму |

Это атрибуция по переданным handoffs/design, не новый source audit и не подтверждение содержимого delta. Переданные PLAN-F1 результаты: 317 links PASS; пять capabilities, 100 сценариев (21/22/17/20/20); 28 method/path, 20 app-qualified. В DOC-1-PREP эти числа **не перепроверялись** и не означают выполненные тесты или access PASS.

PUB-PLAN-0 передал: активный change 0/40, четыре planning artifacts done, QG reports отсутствуют; `reconcile-yandex-root-onboarding` 77/78 с открытым `.FORMAT.5`, прежний SYNTH report отсутствует в новом workspace; normalize уже archived и исключён из active. Также переданы отсутствие active capability conflict и отсутствие пяти target main capabilities. Эти данные остаются handoff-only: независимая inventory/validation/sync/archive в DOC-1-PREP не проводилась. После выполнения собственных DOC-1.1/.2 ожидается 2/40, остальные task IDs не закрываются.

### Unknowns и verification

- CLI `openspec` отсутствует в PATH: попытка `openspec status --change document-yandex-services-baseline --json` завершилась exit 127; `command -v openspec` — exit 1. Из-за `&&` запрос `instructions apply` не исполнялся. CLI artifact status/validation здесь не подтверждены, зависимости не устанавливались. Это не блокирует два metadata-only task с явно назначенным контекстом.
- Static metadata ≠ runtime/access PASS. Runtime, anonymous/authenticated, DB/concurrency, реальные зависимости и валидные сессии: **NOT RUN / не проверено**. Реальные env/secrets/ключи/credentials не читались; сессии не создавались и не подделывались.
- Scoped verification: Git HEAD/status трёх репозиториев, сверка с handoff/design и проверка собственных изменений/checkbox. Машинный результат после записи — в [evidence](<doc-1-prep-metadata.json>). Сравнение статусов до/после исключает только собственные report/evidence и tasks; это не побайтовый source audit.

## Handoff для следующего fresh unit

DOC-1-PREP заканчивается после DOC-1.1/.2. Остаток: DOC-1.3–DOC-1.7 и DOC-1.V из [назначенных tasks](<../../../openspec/changes/document-yandex-services-baseline/tasks.md#L25-L30>), отдельный fresh unit с контекстом соответствующих DOC-OAUTH/TX/GATEWAY/ADAPTER/RUNTIME и S1 handoffs. Вход: данный report, metadata evidence, PUB-PLAN-0/PLAN-F1 provenance и ограничения static evidence. Delta не исправлять самостоятельно; substantive finding возвращать как bounded owner rework. Sync/archive, QG lanes и финальный вердикт не входят в завершённый DOC-1-PREP.

## DOC-1-ACCEPT — документационная приёмка пяти slices

**Статус: done. Документационная приёмка content as-is завершена; это не общий QG APPROVED и не разрешение merge/deployment/release.** Предыдущие секции описывают исторический DOC-1-PREP и не заменяются этой записью. Продолжение прямо разрешено пользователем только для DOC-1.3/.4/.5/.6/.7/.V; остальные lanes здесь не исполнялись.

Основание: [назначенные tasks](<../../../openspec/changes/document-yandex-services-baseline/tasks.md#L25-L30>), [статическая test matrix](<../../../openspec/changes/document-yandex-services-baseline/design.md#L117-L127>), пять delta и ранее переданный provenance. Повторного source audit, чтения proposal, всех main specs, реальных env или secrets не было. Проверена документационная трассировка, не истинность реализации заново. Baseline остаётся из DOC-1-PREP; новый Git/source provenance audit не заявляется.

Машинный [manifest DOC-1-ACCEPT](<doc-1-accept-evidence.json>) фиксирует SHA-256 пяти delta/design, requirement/scenario titles с номерами строк и документированные anchor links. Ссылки извлечены из delta; глобальная проверка targets/line ranges и семантики proposal E anchors относится к DOC-LINKS следующего unit, не объявлена здесь выполненной.

### Пять сгруппированных reviews — одна документационная verification group

| Task / verification | Принятый slice и counts | Документационное evidence / сохранённые ограничения |
|---|---|---|
| DOC-1.3 / DOC-OAUTH, DOC-TX | [OAuth/accounts](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-oauth-accounts/spec.md#L11-L151>): 21, Y1-01..21 | E1..E10 встречаются в delta; [источник E definitions](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-oauth-accounts/spec.md#L7>) остаётся ссылкой на ранее принятый proposal, не повторно прочитанной таблицей. Y1-01..17: OAuth/profile/DTO/encryption/search/storage; Y1-18..19: transaction/error; Y1-20..21: access evidence. |
| DOC-1.4 / DOC-GATEWAY, DOC-TX | [Gateway/bindings](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-metrica-gateway/spec.md#L48-L161>): 22, Y2-01..22 | [E1..E12](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-metrica-gateway/spec.md#L14-L31>) связывают query/lookup/wire/DTO/bindings/storage/transactions с source/test anchors; [G-Y2-01..05](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-metrica-gateway/spec.md#L163-L171>) сохранены. |
| DOC-1.5 / DOC-ADAPTER | [Adapter](<../../../openspec/changes/document-yandex-services-baseline/specs/ya-metrica-adapter/spec.md#L60-L150>): 17 сценариев, 8 requirements | [Evidence по восьми осям](<../../../openspec/changes/document-yandex-services-baseline/specs/ya-metrica-adapter/spec.md#L28-L41>): query/clamp/search, decrypt/key mismatch, provider/envelope, partial/empty DTO, errors, config, health/lifecycle. [Persistence/lifecycle/config/gaps](<../../../openspec/changes/document-yandex-services-baseline/specs/ya-metrica-adapter/spec.md#L43-L56>) не расширены. |
| DOC-1.6 / DOC-RUNTIME | [Runtime](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-service-runtime/spec.md#L52-L160>): 20, Y3-01..20 | [Composition ownership](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-service-runtime/spec.md#L30-L40>), [coverage anchors](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-service-runtime/spec.md#L162-L177>) и [runtime gaps](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-service-runtime/spec.md#L183-L191>) согласованы по границам доказательства. |
| DOC-1.7 / inclusion | [Access evidence](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-services-access-evidence/spec.md#L105-L213>): 20, S1-01..20 | Включены все пять capabilities: 21 + 22 + 17 + 20 + 20 = **100 acceptance scenarios**, не 100 выполненных runtime tests. [S1 matrix](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-services-access-evidence/spec.md#L20-L50>), [anchors](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-services-access-evidence/spec.md#L52-L73>), [gaps](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-services-access-evidence/spec.md#L75-L86>), [FT-01..08](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-services-access-evidence/spec.md#L88-L101>) передаются CONTRACTS по ссылкам, без копирования нормы. |

#### OAuth/accounts — результат DOC-OAUTH/TX

Документационно приняты tenant-state hint без обещания nonce/state verification, последовательность обмена и подготовки до записи, tenant-pair lookup/update с сохранением UUID, минимальный DTO без OAuth secrets и randomized encryption без rotation promise. Expiry/refresh сохраняются, но refresh-on-read не заявлен. Search — SQL ILIKE pattern, не regex; nullable storage и uniqueness для non-null tenant не превращаются в более сильный tenant invariant. Repository flush отделён от route commit; sequential repeat/delete не доказывает concurrency. Fake-session commit/rollback/cleanup не доказывает PostgreSQL durability/cascade. Unsafe decrypt log остаётся gap через [S1 G-S1-LOG](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-services-access-evidence/spec.md#L84>), не безопасной нормой. E1..E9 — документированная трассировка functional/transaction части, E10 — synthetic header evidence; их наличие не означает исполнения.

#### Gateway/bindings — результат DOC-GATEWAY/TX

Приняты query defaults/clamp и delegated search, lookup до peer, DTO без recount, nullable binding response, create/update/sequential no-op и delete по UUID binding. Передача ciphertext в peer query и strict xfail желаемого plaintext явно **не разрешают противоречие**: adapter принимает ciphertext; живой совместимости нет. G-Y2-01 остаётся разрывом/вопросом отдельного решения, не нормой сохранять forwarding. Unique/FK/cascade anchors и существующие PostgreSQL tests не подтверждают runtime constraints, concurrent upsert/retry, rollback после настоящего DB conflict. Injected AlreadyExistsError не равен реальному DB outcome. Nullable tenant, validation limits и отсутствие отдельного multi-item order assertion не скрыты.

#### Adapter — результат DOC-ADAPTER

Приняты восемь requirements и все 17 сценариев, включая пустые строки, offset+1, unchanged search/total, decrypt before provider, envelope/partial items и controlled errors по существующим main contracts. Tracked config, required nonempty key и lifecycle notes не выданы за реальные env/startup. В описанной операции counters **не найдена и не обещана DB persistence операция**; это ограничение изученной цепочки, не аудит всей инфраструктуры. Request-local HTTP cleanup отделён от application shutdown. Health только liveness, mock DB close не доказывает реальный dispose; refresh/rotation/live compatibility, query-log safety и README metadata drift остаются gaps, без исправлений.

#### Runtime — результат DOC-RUNTIME

Приняты tracked aliases/defaults и различие eager global/lazy DI settings. Settings singleton providers, clients/services/repositories factories и context-local session не названы глобальной общей сессией или app-owned HTTP pool. Session async context освобождает ресурс; transaction принадлежит TransactionalRoute, отдельный get_db helper не подменяет get_session и не добавляет второй commit. Background/streaming требуют собственного владения. Health/import/startup не readiness; штатный dispose не гарантирует exceptional/cancelled shutdown, draining/deadline, закрытие всех containers или Sentry flush. DEBUG branch NullPool/default pool не переносит backend DB_POOL_* и не доказывает real PostgreSQL isolation. PII flag/logger config не доказывают полной sanitization telemetry. Все семь GAP-Y3-* сохраняются.

### DOC-1.V — conclusion, findings и verification

**Вывод: документационная приёмка пяти slices завершена в назначенном scope.** Новых substantive дефектов документационной полноты/границ, требующих owner rework, в этом review не выявлено. Уже зарегистрированные auth/owner/token/state/log/exposure/runtime gaps остаются открытыми; это не подтверждение их исправления и не ослабление production gate. Если CONTRACTS обнаружит substantive finding, Router назначает bounded owner unit; delta здесь readonly и content as-is.

- Одна scoped verification group: подсчёт requirement/scenario headings и E1..E10 references, manifest anchors/hashes, затем проверка append-only report, неизменности пяти delta/design и точных checkbox. Итог машинной проверки записывается в manifest; это documentation evidence consistency, не тест реализации.
- **Runtime: NOT RUN.** Anonymous/authenticated/foreign-owner, valid sessions/roles, live Y→M/provider, реальные PostgreSQL constraints/concurrency/durability, shutdown/pooling/telemetry, actual network exposure и HEAD runtime не выполнялись. Fake headers не valid auth, статические assertions не PASS.
- Tests/Make/npm/uv/Docker, real env/secrets, source fixes, cache audits/install, sync/archive/commit не выполнялись. CLI status/strict в этом unit не запускались: это отдельный QG-CONTRACTS.7; отсутствие bare openspec не blocker. Ранее переданный PLAN-F1 strict/link результат не присваивается этому review.
- Итог checklist после DOC-1-ACCEPT: DOC-1.1/.2 сохранены; выполнены только DOC-1.3/.4/.5/.6/.7/.V, суммарно **8/40**. Остальные 32 IDs открыты. QG-CONTRACTS/FORMAT/SYNTH/PUB не выполнены этим unit; ENV/BE/FE/LIVE не исполнялись ввиду docs-only scope, это не замена обязательным последующим gates.

### Handoff DOC-1-ACCEPT → QG-CONTRACTS

Следующий fresh unit: только QG-CONTRACTS. Контекст: этот backfill и manifest, [DOC-ACCESS/SECURITY/LINKS matrix](<../../../openspec/changes/document-yandex-services-baseline/design.md#L128-L130>), [назначенные CONTRACTS tasks](<../../../openspec/changes/document-yandex-services-baseline/tasks.md#L32-L43>), S1 matrix/anchors/gaps/FT по ссылкам выше. Пять delta — по coverage, main peer clauses и safe diagnostics — только указанные в task context ranges; proposal E1..E10 — семантическая сверка DOC-LINKS, не новый implementation audit. CLI при необходимости: `/srv/eqSiteCMS/.cache/openspec-tool/1.14.3/openspec-local`, без установки и без bare PATH retry. Проверить 28 method/path и 20 app-qualified paths отдельно: здесь принята их документированная inclusion, не выполнен DOC-ACCESS. Ownership следующего unit — его contracts report и собственные IDs; текущие delta/common plan/source/tooling readonly. QG-FORMAT остаётся отдельным изолированным unit; запуск не входит в этот handoff.

