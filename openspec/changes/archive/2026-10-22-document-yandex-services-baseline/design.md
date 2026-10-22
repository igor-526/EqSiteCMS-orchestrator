# Design — ретроспективные контракты сервисов Яндекса

Задание: [097](<../../../docs/tasks/097_yandex_services_retrospective_specs.md>) · Change: `document-yandex-services-baseline` · Дата: 2026-10-19 · Сервисы: yandex-service, ya-metrica-service.

## Context

Мотивация — в [proposal](<proposal.md#why>). Это docs-only backfill вручную реализованного поведения, а не проектирование новых сервисов. PLAN-Y1/Y2/M1/Y3/S1 подготовили пять delta; PLAN-F1 синтезирует только общие proposal/design/tasks. Их наличие означает готовность planning-артефактов, но не исполнение будущих tasks, прохождение QG или пользовательское разрешение apply.

### Baseline, provenance и методология

| Слой | Фактический baseline из handoff | Что доказывает |
|---|---|---|
| Корень | `457be4391fa800214ce6939030d3e125962b89be`, исходный dirty overlay | HEAD и рабочее дерево различаются; main Yandex specs/архив и задание прочитаны из overlay, не приписываются commit |
| yandex-service | `d3cf1dc5879d5ebc2f75bbdb437ca657cf1a4de4`, clean по Y1/Y2/Y3/S1 | Статический срез исходников и существующих тестов |
| ya-metrica-service | `0bd7434cc97ac41f0a0aef1088e99b77ead48e1b`, clean по M1 | Статический срез адаптера, не старый template HEAD |
| F1 | Handoff всех slices и целевые boundary/coverage/gaps sections | Документационный синтез, без повторной implementation inspection |

Нормативные main clauses, static source observation, прочитанный test assertion и реально выполненный тест — разные уровни evidence. Здесь доступны первые три, runtime PASS отсутствует. E1..E10 OAuth сохранены в [приложении proposal](<proposal.md#source-anchors>) с прежними line anchors, чтобы не ломать readonly delta. Остальные anchors принадлежат своим delta; ссылки на них не требуют повторного чтения всего сервиса. Framework HEAD inference из локальной установки — ограниченное observation, а не переносимый контракт установленной версии. Cache/install history не является функцией сервисов.

Никакие реальные env, ключи, сессии, DB credentials и production bindings не читались. Tests, Make, Docker, installs, sync/archive и commits в F1 не запускаются. Исходный dirty overlay не форматируется и не включается в результат этого unit.

## Goals / Non-Goals

**Goals:** сохранить трассировку наблюдаемого поведения до requirement/scenario и evidence; указать все обнаруженные endpoint/config/storage/DI/lifecycle области; разделить принятые ограничения и неизвестные гарантии; подготовить ограниченные документационные verification/publishing units.

**Non-Goals:** исправлять runtime, auth/state/replay/refresh/key rotation/logging, схему БД, HTTP статусы, metadata сервисов или README; менять main contracts на planning; обновлять root onboarding, переносить его старые tasks; подтверждать deployment, живую интеграцию, production isolation или валидные роли. Новый план в legacy docs/plans не создаётся.

## Decisions

### 1. Пять capability boundaries вместо повторного описания домена в общих файлах

| Capability / delta | Сценарии | Область и статическая трассировка |
|---|---:|---|
| [yandex-oauth-accounts](<specs/yandex-oauth-accounts/spec.md>) | 21, Y1-01..21 | OAuth initiation/exchange/profile; account DTO/search/delete; encryption; storage identity/constraints; commit/rollback; expiry без refresh. E1..E10 и GAP-Y1-* — [proposal](<proposal.md#source-anchors>) |
| [yandex-metrica-gateway](<specs/yandex-metrica-gateway/spec.md>) | 22, Y2-01..22 | Gateway query/DTO, lookup и wire boundary; binding read/set/delete; unique/FK/cascade/conflicts. E1..E12 и G-Y2-01..05 — [coverage/gaps](<specs/yandex-metrica-gateway/spec.md#L163-L171>) |
| [ya-metrica-adapter](<specs/ya-metrica-adapter/spec.md>) | 17, восемь requirements | Query, clamp/search, decrypt, provider HTTP/envelope, partial/empty DTO, safe error mapping, key config, static health. [Notes](<specs/ya-metrica-adapter/spec.md#L43-L56>) покрывают config/DI/provider closure/shutdown и отсутствие DB persistence операции |
| [yandex-service-runtime](<specs/yandex-service-runtime/spec.md>) | 20, Y3-01..20 | Settings/defaults/aliases, key/OAuth/peer/Sentry validation, health/startup, DI factories/resources/session/transaction ownership, normal shutdown, DB engine/pooling и telemetry limits; [source→scenario coverage](<specs/yandex-service-runtime/spec.md#L162-L191>) |
| [yandex-services-access-evidence](<specs/yandex-services-access-evidence/spec.md>) | 20, S1-01..20 | Endpoint inventory, access governance, anonymous/header-bearing evidence, owner/token/state/log/exposure gaps, FT-01..08 и ограничения выводов |

Всего 100 acceptance scenarios, не 100 implementation tasks или исполненных тестов. Сценарии адаптера трассируются по названиям в delta; новые ID им не приписываются. Исторические context/handoff headers в Y2/Y3/S1 не являются Requirements и не переопределяют текущий общий план.

Альтернатива — монолитный spec и дублирование фактов в design — отклонена: смешивает владельцев и превращает разные уровни evidence в ложную общую гарантию. Полнота здесь ограничена обнаруженным scope источников и handoffs: не заявляется аудит всех инфраструктурных механизмов, скрытых runtime-функций или deployment. Некрытая substantive функция требует нового bounded owner unit, а не самостоятельной правки чужого delta в F1.

### 2. Зависимости действующих контрактов, не новые параллельные нормы

| Зависимость | Применение | Граница |
|---|---|---|
| [yandex-client-failures](<../../specs/yandex-client-failures/spec.md#L31-L53>) | Safe diagnostics, локальный client exception и service mapping | Небезопасный raw decrypt log остаётся gap; baseline не разрешает его вопреки норме |
| [yandex-peer-http-contract](<../../specs/yandex-peer-http-contract/spec.md#L35-L79>) | Существующая peer matrix, dev exceptions, foreign outcomes и production gate | Не меняются глобальные backend `401/403`; user session не добавляет peer прав |
| [Runtime normative mapping](<specs/yandex-service-runtime/spec.md#L183-L191>) | Ссылки на pooling/observability/env contracts | Backend pooling recipe и scope Core/Email/Notification не переносятся автоматически на Yandex; MAIN_BACKEND_URL/SERVICE_KEY не добавляются без evidence |

Альтернатива — заново нормализовать ошибки/access или рефакторить DI — отклонена: соответствующие main clauses уже существуют; новые security/runtime решения требуют отдельного approval и change.

### 3. Access matrix и endpoint coverage

Единственная сводная матрица baseline — [S1: method | path | access class | roles | expected without auth | expected with auth](<specs/yandex-services-access-evidence/spec.md#L20-L50>); proposal перечисляет весь набор методов/путей. Здесь она подключена ссылкой без второй копии статусов. S1 содержит 20 app-qualified paths / 28 method-path комбинаций: десять business operations (девять Yandex и одна adapter), два health, восемь framework docs paths с GET/HEAD; R1 — отрицательные routing cases, не дополнительный endpoint. Общий `/api/metrica/counters` считается отдельно для двух приложений.

Причины существующих исключений — [main governance](<../../specs/yandex-peer-http-contract/spec.md#L57-L59>): OAuth callback выполняется до user session; account/profile/counters/token относятся к private peer, не Public Read consumer; credential-less Y4/Y8/Y9 сохранены только как прежнее dev-допущение, не новое разрешение public production writes. Заявление Q2 не является техническим подтверждением isolation. Health/docs публичны, health статический и не проверяет PostgreSQL/peer/provider readiness. Swagger redirect не является business OAuth callback.

Anonymous и header-bearing assertions перечислены раздельно в S1. Fake Bearer/cookie не доказывают валидную сессию, роль или owner. Foreign fixtures не доказывают foreign-owner denial; selectors не credentials. Новые `401/403` для этих peers не изобретаются. Защита main backend не ослабляется. Альтернатива — назвать все чувствительные GET публичными или объявить writes защищёнными на основании имени dependency — отвергнута как противоречащая evidence.

### 4. Gaps не превращаются в разрешение и не расширяют docs-only scope

Сводный [реестр G-S1-*](<specs/yandex-services-access-evidence/spec.md#L75-L101>) связывает вопросы с Y1/Y2/M1/Y3 evidence и FT-01..08. Ключевые ограничения: caller/owner gates отсутствуют в изученной локальной цепочке; state/replay не доказаны; expiry/refresh/rotation не реализованы в examined read chain; gateway передаёт ciphertext при strict xfail ожидании plaintext, adapter дешифрует — живой совместимости нет; raw decrypt exception может попасть в log; query/proxy/telemetry redaction и production isolation неизвестны.

Storage notes не усиливаются: nullable DB tenant не становится API гарантией; sequential idempotence не доказывает concurrent upsert/retry/isolation; migration/SQL inspection и fake sessions не равны real PostgreSQL PASS. Adapter операция не имеет найденных DB persistence operations, хотя инфраструктурный DB lifecycle существует. README/template metadata drift зафиксирован M1, но его исправление не включено.

Будущие security решения не блокируют документационный backfill. Production deployment/release остаётся blocked до доказанной защиты sensitive peer APIs; этот change и его будущий docs QG не снимают production gate.

## Execution units

### Deliverables и ownership

| Deliverable | Владелец | Пути / граница |
|---|---|---|
| P — общие planning-артефакты | Planner PLAN-F1 | [proposal](<proposal.md>), [design](<design.md>), [tasks](<tasks.md>); только эти три файла в текущем unit |
| A/B/C/D/E — подготовленные delta | Planner Y1/Y2/M1/Y3/S1 соответственно | Пять отдельных capability paths из таблицы выше; F1 их не меняет |
| V — документационный backfill verification | Quality Gate, DOC-1 | Будущий `docs/reports/document-yandex-services-baseline/backfill.md`; specs readonly |
| C — контракты | Quality Gate, QG-CONTRACTS | Будущий `docs/reports/document-yandex-services-baseline/contracts.md` |
| F — формат/корневые проверки | Quality Gate, QG-FORMAT | Будущий `docs/reports/document-yandex-services-baseline/format.md`; проверка в clean worktree, не форматирование исходного overlay |
| S — общий verdict | Quality Gate, QG-SYNTH | Будущий `docs/reports/document-yandex-services-baseline/synthesis.md` |
| U — подготовка публикации | Quality Gate, DOC-PUB-1 | Будущий `docs/reports/document-yandex-services-baseline/publishing.md`; только пакет передачи на skill gates |

Checklist обновляет текущий исполнитель только по своим фактически завершённым IDs, последовательно; это не совместное владение содержательными артефактами. При rework Router назначает владельцу delta отдельный ограниченный unit с точными requirements/paths; косметический linkfix shared proposal — F1, substantive delta rework не его ownership.

| Unit | Профиль | Deliverable / ownership | Зависит от | Verification / размер | contextFiles |
|---|---|---|---|---|---|
| PLAN-F1 | Planner | P, три общих артефакта | Y1/Y2/M1/Y3 → S1 | Одна static/CLI группа; 8 групп действий: instructions, provenance, boundaries, coverage, proposal, design, tasks, validation/handoff | Задание 097, planner core/planning, proposal и пять delta только в согласованном срезе |
| DOC-1 | Quality Gate | V, backfill report | Явный approval после F1 | Документационная приемка пяти готовых slices; 8 действий | [Proposal](<proposal.md>), [coverage](<#decisions>), пять delta: boundary/titles/scenario list/evidence/gaps; source не перечитывать |
| QG-CONTRACTS | Quality Gate | C, contracts report | DOC-1 | Одна contract/static/CLI группа; 8 действий | [Design](<#test-matrix>), [access delta](<specs/yandex-services-access-evidence/spec.md>), [peer clauses](<../../specs/yandex-peer-http-contract/spec.md#L35-L79>), [safe diagnostics](<../../specs/yandex-client-failures/spec.md#L31-L53>), пять delta по ссылкам coverage, backfill report |
| QG-FORMAT-PREP (исторический partial) | Quality Gate | F, format report и owned exports | DOC-1 | Архивы/approved docs подготовлены; выполнен только QG-FORMAT.1, QG-FORMAT.2 открыт | [PREP handoff](<../../../docs/reports/document-yandex-services-baseline/format.md#L57-L67>) |
| QG-FORMAT-PREP-ENV | Quality Gate | F, environment metadata/deps/Git-aware baseline только в owned isolation; format evidence/report | PREP partial, принят Router split | Один environment-provisioning slice, до 12 действий, одна environment verification group; завершает только QG-FORMAT.2 | [FORMAT protocol](<#lanes-и-обязательный-format>), [FORMAT checklist](<tasks.md#3-qg-format-prep--историческая-подготовка-профиль-quality-gate>), [handoff](<../../../docs/reports/document-yandex-services-baseline/format.md#L57-L67>), [manifest](<../../../docs/reports/document-yandex-services-baseline/format-snapshot.json>), [env](<../../../docs/reports/document-yandex-services-baseline/format-env.sh>); dependency inputs только по таблице ниже |
| QG-FORMAT-RUN | Quality Gate | F, тот же owned snapshot, diffs/logs и format report; source readonly кроме измеряемого эффекта mandatory formatter | PREP-ENV done + прочитанный Router handoff | Одна root verification group, шесть действий QG-FORMAT.3–.7/.V; три root команды обязательны | [FORMAT protocol](<#lanes-и-обязательный-format>), [FORMAT checklist](<tasks.md>), PREP-ENV handoff с baseline IDs/install exits/generated ledger, [env](<../../../docs/reports/document-yandex-services-baseline/format-env.sh>), owned root Makefile/инструкции запуска; без повторного source review |
| QG-SYNTH | Quality Gate | S, synthesis report | QG-CONTRACTS, QG-FORMAT | Одна synthesis verification группа; 8 действий | [Design](<design.md>), [tasks](<tasks.md>), backfill/contracts/format reports; не весь source |
| DOC-PUB-1 | Quality Gate | U, publishing report | QG-SYNTH = APPROVED | Одна проверка готовности публикационного пакета; 8 действий | [Proposal](<proposal.md>), [tasks](<tasks.md>), synthesis report, пять delta как перечень sync, текущий CLI status |

После approval DOC-1 принимает подготовленные артефакты, не создаёт их заново. У каждой будущей сессии один независимо проверяемый результат; FORMAT после принятого circuit breaker разделён на PREP-ENV и RUN с последовательным владением одним deliverable F. У остальных units сохраняются 8 пунктов включая verification/handoff. Контекст разворачивается только до конкретного anchor при обнаруженном противоречии. Бюджет превышен — partial и split до расширения, не бесконечный baseline repair.

DAG:

```text
PLAN-Y1 → PLAN-Y2 ─┐
PLAN-M1 ──────────┼→ PLAN-S1 → PLAN-F1 → явный пользовательский approval
PLAN-Y3 ─────────┘                         ↓
                                       DOC-1
                                  ┌──────┴──────┐
                           QG-CONTRACTS     QG-FORMAT-PREP (partial; .1 done)
                                  │             ↓
                                  │         QG-FORMAT-PREP-ENV (.2)
                                  │             ↓ fresh context / handoff
                                  │         QG-FORMAT-RUN (.3–.7/.V)
                                  └──────┬──────┘
                                      QG-SYNTH
                                  (только APPROVED)
                                          ↓
                                      DOC-PUB-1
                                          ↓
                          отдельные sync/strict/archive/finalize gates
```

QG-CONTRACTS и QG-FORMAT могут идти параллельно только при изолированном worktree FORMAT и разных report paths; checklist-отметки сериализует Router. Planning completion не означает QG-SYNTH APPROVED.

## Test matrix

Это статическая risk-based документационная матрица. ID ниже — verification cases, не новые backend unit/smoke tests. Наличие исходного теста не означает его выполнение. Общие checklist tasks группируют ID, не размножаются на 100 acceptance scenarios.

| ID | Уровень | Риск/ось, трассировка | Проверка / ожидание | Где проверяется |
|---|---|---|---|---|
| DOC-OAUTH | static | Happy/validation/DTO/encryption, Y1-01..17 | Все 17 scenarios имеют E1..E9; gaps search/nullable storage/refresh не заменены обещаниями | DOC-1, backfill report |
| DOC-TX | static | Transaction/idempotence/concurrency: Y1-16..19; Y2-11..20 | Sequential no-op/commit описаны; Pg/constraints/concurrency не объявлены runtime PASS | DOC-1, backfill report |
| DOC-GATEWAY | static | Query/lookup/wire/DTO/bindings: Y2-01..20 | Evidence и G-Y2-01..05 сохранены; ciphertext vs xfail не замалчивается и не чинится | DOC-1, backfill report |
| DOC-ADAPTER | static | Все 17 scenarios восьми requirements адаптера | Defaults/invalid/empty input; pagination/search; decrypt/key mismatch; provider/envelope; partial/empty DTO; error; config; health покрыты; DB persistence операции не приписана | DOC-1, backfill report |
| DOC-RUNTIME | static | Y3-01..20 | Config/DI/resources/session/transaction/startup/shutdown/pooling/telemetry traceability; health только liveness; реальные env не нужны | DOC-1, backfill report |
| DOC-ACCESS | static contract | Y1-20..21; Y2-21..22; S1-01..08,17..20; S1 matrix Y1..Y9/M1/H1/D1/R1 | 28 method/path /20 app-qualified paths, причины/status exceptions, anonymous и header-bearing отдельно, valid-auth/roles/foreign unknown; HEAD inference отдельно | QG-CONTRACTS, contracts report |
| DOC-SECURITY | static contract | S1-09..16; G-S1-TOKEN/STATE/LIFECYCLE/LOG/EXPOSURE; FT-01..08 | Secrets response отделён от forbidden diagnostic leaks; known raw log — gap; exceptions не являются новым production approval; future cases NOT RUN | QG-CONTRACTS, contracts report |
| DOC-LINKS | static | Все пять delta, proposal/design/tasks и referenced main clauses | Локальные targets/line ranges существуют; proposal E anchors семантически сохранены; 5 capabilities/100 scenarios согласованы; ссылки не означают tests PASS | QG-CONTRACTS, contracts report |
| DOC-FORMAT | root verification | Scope isolation/format/lint/regression | Обязательные `make format`, `make lint`, `make test` в подготовленном clean worktree; exit codes и итоговый git status зафиксированы | QG-FORMAT, format report |
| DOC-SYNTH | synthesis | Все применимые lanes и docs-only scope | Сводный verdict не выдан заранее; failures/infra blockers не скрыты; production gate остаётся | QG-SYNTH, synthesis report |
| DOC-PUBLISH | static publishing | Принятые 5 delta и gates | Публикационный manifest и handoff готовы; sync/archive/finalize ещё требуют своих skill gates | DOC-PUB-1, publishing report |

Будущие anonymous/valid-auth/foreign/secret/state/network/HEAD/lifecycle runtime cases — [FT-01..08](<specs/yandex-services-access-evidence/spec.md#L88-L101>). Они не выполняются в документационном apply и не объявляются PASS. Их реализация зависит от отдельного утверждённого security boundary.

### Lanes и обязательный FORMAT

- QG-CONTRACTS, QG-FORMAT, QG-SYNTH обязательны даже для docs-only change.
- QG-ENV, QG-BE, QG-FE-AUTO, QG-FE-MANUAL, QG-LIVE неприменимы: нет code/runtime/UI/deployment diff, не планируется живой smoke. Это не waiver FORMAT.
- Принятый PREP partial — [handoff §57–67](<../../../docs/reports/document-yandex-services-baseline/format.md#L57-L67>). Архивы root+8 nested и approved-docs уже готовы; выполнен только QG-FORMAT.1, общий фактический прогресс 17/40. Git baseline/зависимости ещё не готовы, Make не запускался. Это процессная поправка FORMAT-SPLIT-PLAN, не новый функциональный proposal/approval и не разрешение менять пользовательские документы.
- Единственные исходные входы — готовый [owned export](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/>), readonly [sealed archives](<../../../.qa/qg-format-document-yandex-services-baseline-v1/sealed/>), [snapshot manifest](<../../../docs/reports/document-yandex-services-baseline/format-snapshot.json>) и hashes/dependency metadata из [PREP evidence](<../../../docs/reports/document-yandex-services-baseline/format-prep-evidence.json>). Root `457be4391fa800214ce6939030d3e125962b89be`, восемь nested HEAD — [provenance](<../../../docs/reports/document-yandex-services-baseline/format.md#L33-L43>). Не повторять exporter, не пересоздавать архивы из dirty original и не переносить новые planning/checklist edits обратно в frozen snapshot (его исторические 16/40 intentional). Manifest из 18 approved files и accepted main peer/error overlay immutable: source/main contracts/user docs проверяются content-as-is, без rewrites, core fixes, lock/pin/config updates.
- Original root/nested `.git`, objects, index, branches и secret blobs не менять/не переносить; секреты не читать. Сверка original ограничена tracked-path metadata/HEAD/status/index и разрешёнными hashes, не аудитом unrelated overlay/caches. Разрешён throwaway local Git baseline **внутри owned export**, созданный только из положительного safe-path manifest: локальные baseline commit/index допустимы исключительно для измерения diff, не продуктовые коммиты/ветки и не импорт original objects. Root и восемь nested учитывать раздельно, не прятать nested/source изменения за clean root status. Зафиксировать export HEAD→local baseline mapping, все исключения и clean tracked/index status до RUN; generated outputs учитывать отдельно.
- PREP-ENV — один environment-provisioning slice, максимум 12 существенных действий: (1) сверка frozen metadata и sanitized окружения; (2) batch Git-aware baseline root+8 nested; (3–9) семь locked Python env по таблице; (10) locked Node env; (11) одна общая environment verification group — tool versions, install exits, lock/input hashes unchanged, root+nested tracked/index clean, generated ledger; (12) handoff/отметка QG-FORMAT.2 только при полной готовности. Не запускать root Make в PREP-ENV. Если реальные environment groups/ремонт выходят за бюджет, до расширения вернуть partial и предложить split по конкретным environment groups с результатами/зависимостями; не предписывать семь мелких сессий без бюджетного обоснования. QG-FORMAT.2 остаётся открытым до завершения всех групп.

Все пути следующей таблицы относительны [owned repo](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/>); manifest/hashes — входы для установки, не повод читать сервисный source:

| Environment group | Locked dependency inputs |
|---|---|
| backend | [pyproject.toml](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/services/backend/pyproject.toml>), [uv.lock](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/services/backend/uv.lock>) |
| notification | [pyproject.toml](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/services/notification-service/pyproject.toml>), [uv.lock](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/services/notification-service/uv.lock>) |
| email | [pyproject.toml](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/services/email-service/pyproject.toml>), [uv.lock](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/services/email-service/uv.lock>) |
| VK | [pyproject.toml](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/services/vk-service/pyproject.toml>), [uv.lock](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/services/vk-service/uv.lock>) |
| SEO | [pyproject.toml](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/services/seo-service/pyproject.toml>), [uv.lock](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/services/seo-service/uv.lock>) |
| Yandex | [pyproject.toml](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/services/yandex-service/pyproject.toml>), [uv.lock](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/services/yandex-service/uv.lock>) |
| adapter | [pyproject.toml](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/services/ya-metrica-service/pyproject.toml>), [uv.lock](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/services/ya-metrica-service/uv.lock>) |
| frontend | [package.json](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/services/frontend/package.json>), [package-lock.json](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/services/frontend/package-lock.json>) |

- Использовать [format-env.sh](<../../../docs/reports/document-yandex-services-baseline/format-env.sh>): uv `0.13.5`, node `24.22.1`, npm `11.19.1`, make `4.4.1`, uv PATH уже известен, повторный поиск/установка CLI не нужны. HOME/cache/deps принадлежат isolation; исходные env/deps не использовать. Для новых standalone test runs нужен новый пустой TMPDIR — sibling exported repo, не внутри него; его точный путь передать RUN. Не включать implicit sync/npx downloads. Для явного locked provisioning разрешать сеть/синхронизацию только на ограниченную install-команду, не снимать frozen/lock guards для последующего RUN. Точные команды/cwd/exit codes и фактические версии сохранить; frozen tools/deps/build tools при необходимости фиксируются в evidence-local metadata, не правкой сервиса/main pins/locks. Принятый NOTE об обычных local cache/version effects остаётся NOTE, не новый supply-chain/cache audit.
- Environment failure budget — не более **двух** bounded repair attempts на PREP-ENV slice; две прежние exporter guard corrections касались metadata до archive и не расходуют этот dependency repair budget. Повторный failure после лимита → конкретный blocker с командой/exit/группой, handoff и остановка; никаких endless installs/cache/supply-chain расследований, source/corefixes или изменения locks. Если нужны secrets, не читать их: обозначить missing prerequisite.
- PREP-ENV → Router handoff → **новая сессия RUN**. Передать точные snapshot/local baseline IDs, sanitized env/TMPDIR, восемь install commands/exits, hashes, generated allowlist/ledger, blockers и task status. Router читает handoff до RUN; RUN не восстанавливает состояние по diff и не повторяет exports/installs. Ownership F (owned isolation, format report/evidence) передаётся последовательно, checklist writes только по собственным фактически завершённым IDs; design/specs/original source readonly.
- RUN — шесть действий QG-FORMAT.3/.4/.5/.6/.7/.V, одна root verification group. Из того же корня owned repo последовательно обязательны `make format`, `make lint`, `make test`; фактический обход восьми сервисов не сокращается. До/между/после команд сохранить root+nested tracked/index diff/status и generated accounting, stdout/stderr/exit каждого запуска. Safe nonzero не отменяет оставшиеся команды; при угрозе изоляции остановиться с конкретным blocker, не выдать пропускам PASS. Formatter diff не переносить в original и не прятать reset/автокоммитом. Любое изменение source/контрактов фиксировать как finding без самостоятельного исправления; allowlisted generated outputs не равны source autofix, их diff/происхождение учитываются отдельно.
- QG-FORMAT.7 закрывается только по фактическим root failures/findings (либо evidence отсутствия failures), не за принятие PREP split. Итог APPROVED возможен только при трёх успешных командах, неизменном approved source и разрешённых blockers с полным Git/generated accounting. Иначе конкретный bounded follow-up на failing target/environment group; FORMAT остаётся обязательным, не docs N/A. Ни PREP-ENV done, ни planning strict не означают общий gate PASS. Далее только отдельный QG-SYNTH; concurrent old root change/77–78 blockers не чинить и не перепроверять.

### PostgreSQL для smoke-тестов

Неприменимо: в этом docs-only change нет smoke/runtime DB verification; Docker discovery и реальные credentials не нужны. PG assertions в Y1/Y2 — прочитанные источники, не подтверждённые constraints/migrations/isolation. Будущий runtime change должен отдельно планировать DB discovery и проверки по профильным правилам.

### Manual QA steps (UI тестирование)

Неприменимо: UI diff отсутствует. Browser/FE tests и скриншоты не требуются и не имитируются.

## Risks / Trade-offs

- [Baseline читают как желаемую security-норму] → сохраняются main governance, gaps и отдельный production gate; header-bearing не считается valid auth.
- [Line anchors proposal съедут при синтезе] → E1..E10 и Y1 gaps сохранены в прежних строках; future mechanical rework проверяет все входящие ссылки, не редактирует чужие delta без назначения.
- [Документационный QG внезапно разрастается в ремонт монорепозитория] → clean-worktree FORMAT с фиксированными командами/exit codes и bounded follow-up, без unrelated fixes.
- [Overlay отсутствует у следующего исполнителя] → зафиксировать необходимый accepted docs snapshot до FORMAT/publishing; не подменять отсутствующий main contract старым HEAD.
- [Новые source функции обнаружатся позднее] → точный bounded unit соответствующего capability owner, не утверждение неограниченной полноты и не повторный общий audit.

## Migration Plan

Runtime deployment, schema migration и rollback данных отсутствуют. Сначала Router получает явный пользовательский approval на подготовленный docs-only change; только затем apply выполняет документационную приемку, обязательные QG lanes и подготовку публикационного пакета. Все будущие checkbox пока открыты.

После QG-SYNTH = APPROVED и DOC-PUB-1 Router проходит отдельные skill gates: openspec-sync-specs для пяти capabilities → strict validation → openspec-archive-change → task-finalize с его актуальными approval gates. Эти действия не выполняются F1; перечисление не разрешает обход их preconditions, metadata/commit/release действия или deployment. Если task-finalize требует окружение, оно проверяется тогда по skill, а не заранее в F1. Production gate чувствительных API не снимается документационным архивом.

Документационный rollback — отмена только согласованного docs diff в отдельной future операции; чужой dirty overlay, service HEAD и runtime не откатываются. Независимый root onboarding change и его blocked status не переносятся сюда.

## Open Questions

Все вопросы ниже nonblocking для документационного backfill, поскольку текущий baseline и границы уже явно зафиксированы; ни один ответ не нужен для запуска docs verification. Изменение поведения оформляется отдельным future change.

1. Где должен обеспечиваться trusted peer enforcement, какие caller principals/scopes и owner/foreign denial outcomes выбрать? G-S1-AUTH/OWNER; production защита остаётся обязательной.
2. Какой token wire формат, refresh/revocation policy и схема rotation/versioning должны стать целевыми? G-S1-TOKEN/LIFECYCLE, G-Y2-01; текущий mixed evidence не является live compatibility PASS.
3. Как утвердить state binding/TTL/одноразовость/replay и закрыть raw decrypt/query/proxy/telemetry leaks? G-S1-STATE/LOG, GAP-Y3-TELEMETRY; известных гарантий не добавлено.
4. Какие реальные bindings/isolation/readiness/shutdown/DB concurrency гарантии нужны для production? G-S1-EXPOSURE/TEST, GAP-Y1-DB, G-Y2-03, GAP-Y3-READINESS/SHUTDOWN/POOL. Никаких runtime outcomes сейчас не обещано.
