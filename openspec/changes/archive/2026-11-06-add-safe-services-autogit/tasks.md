# Tasks — add-safe-services-autogit

Ownership deliverables A/B/C, DAG и test matrix заданы в [design.md](design.md#execution-units); реализация только после пользовательского approval предложенных там defaults. Все checkbox относятся к будущей реализации, не к подготовке плана; отмечать только выполненные пункты. Реализацию root scripts/tooling выполняет Backend; Router координирует, runtime-сервисы не затрагиваются.

## Execution units

Пути contextFiles ниже относительны корню репозитория, а `design.md`/`specs/...` — текущему change. Общие пути A принадлежат одному профилю и изменяются строго последовательно, не параллельно.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|---|
| OPS-1 | Backend (scripts/tooling) | A | `scripts/ship/{plan,git,common}.mjs`, `scripts/ship/schemas/plan.json`, `scripts/tests/shipctl-plan.test.mjs`, shipping fixtures в `scripts/tests/helpers/**` | approval | targeted plan tests + JS static | `design.md` §1–4 и Test matrix; `specs/task-shipping-tooling/spec.md`; `scripts/ship/plan.mjs`; `scripts/ship/git.mjs`; `scripts/ship/schemas/plan.json`; `scripts/tests/shipctl-plan.test.mjs` |
| OPS-2a | Backend (scripts/tooling) | A | `scripts/shipctl`, release preview/token, release-state schema/tests | OPS-1 | targeted merge/release + static (выполнено) | handoff OPS-1; `design.md` §4–6/Test matrix; delta AG-09/10/12; release schema/tests |
| OPS-2b | Backend (scripts/tooling) | A | `scripts/ship/merge.mjs`, необходимые plan/git/common/state schema helpers, merge tests/fixtures | OPS-2a | targeted v2 merge/global preflight + JS static | handoff OPS-1/2a; `.qa/add-safe-services-autogit/OPS-{1,2}/contract.json`; `design.md` §4–6/Test matrix; delta AG-05/06/10/11 |
| OPS-2c | Backend (scripts/tooling) | A | merge-state/writes/resume, status/ci consumers, связанные schemas/tests/fixtures | OPS-2b | targeted AG-11/12 producer→consumers + static | handoff OPS-2b; `design.md` §4–6/Test matrix; delta AG-11/12; merge/state/status/ci/release tests |
| OPS-3 | Backend (scripts/tooling) | A | `Makefile`, `scripts/services-autogit`, `scripts/tests/services-autogit.test.mjs`, непосредственно связанное A wiring/fixtures | OPS-2c | adapter tests, затем полный `make ship-test` | handoff OPS-2; `design.md` §1/5 и Test matrix; delta spec AG-01/02/09; `Makefile`; `scripts/shipctl`; plan/release CLI outputs из handoff |
| OPS-4 | Backend (scripts/tooling) | B | `README.md`, `WORKFLOW.md`, Git-раздел `SERVICES.md`, `.agents/skills/task-finalize/SKILL.md`, shipping assertions `scripts/tests/pipeline-policy.test.mjs` | OPS-3 | policy targeted + static examples/links | handoff OPS-3; `design.md` §5 и Решения для approval; README shipping section; WORKFLOW финализация; SERVICES Git-workflow; task-finalize; собственные правила Router |
| QG | Quality Gate | C | `.qa/add-safe-services-autogit/QG/**`, `docs/reports/add-safe-services-autogit.md`; реализация read-only | OPS-4 | независимый `make ship-test`, static/policy/OpenSpec | handoff OPS-1..4; `design.md#test-matrix`; delta spec; `tasks.md`; затронутые shipping tests; `agents/howto/verification-policy.md` |

## 1. OPS-1 — план, селекция и safety metadata (профиль: Backend)

**Specs:** `task-shipping-tooling`, AG-03..08/10. **Пути:** A plan/storage slice из таблицы. **Зависит от:** approval. Одно семейство targeted plan verification.

- [x] OPS-1.1 Добавить `--branch`/`--message`, строгую проверку известных аргументов/значений и conditional обязательность summary/message в plan; AG-03/04 проверяют exact overrides, 72 символа, ref validation и legacy defaults.
- [x] OPS-1.2 Исправить blanket dirty blocker и fail-closed inventory/origin/main discovery с проверкой всех manifest-клонов; AG-05/06 доказывают допустимость included dirty и остановку на missing/dev/detached/rebase/foreign staged/failed probe до мутаций.
- [x] OPS-1.3 Реализовать literal-path ownership и boundary checks, точное rename/delete отображение, ignored/hidden/credential selection и redacted content scanner; AG-07/08 проверяют безопасные скрытые файлы, denylist, traversal/symlink/nested repo и отсутствие secret values в выводе.
- [x] OPS-1.4 Версионировать canonical plan с root `.` и обязательными selected blob/index/status hashes, inventory/origin и PLAN_TOKEN; AG-10 проверяет изменение token при изменении подтверждаемых параметров и deterministic output без credentials.
- [x] OPS-1.5 Актуализировать plan schema, shipping fixtures и grouped tests AG-03..08/10; fixture creation/cleanup ограничены owned `.qa/add-safe-services-autogit/OPS-1/`, каждый remote проверен local-only, без /tmp и сетевых push.
- [x] OPS-1.V Выполнить `node --test scripts/tests/shipctl-plan.test.mjs`, `node --check` изменённых JS и scoped `git diff --check`; сохранить ledger/evidence, отметить только выполненное и вернуть handoff с plan schema/CLI контрактом. Pre-existing unrelated FAIL — blocker/split, не скрывать.

## 2. OPS-2 — сквозной merge, preflight и release preview (профиль: Backend)

**Specs:** `task-shipping-tooling`, AG-05/06/09..12 и существующие release/resume требования. **Пути:** A execution/state slice. **Зависит от:** OPS-1. Targeted integration без реальных remote.

Принятый split без изменения scope: **OPS-2a (release, done) → OPS-2b (v2 merge/global preflight) → OPS-2c (state/resume/consumers, сквозные AG-11/12) → OPS-3**. Общие пункты 2.1/2.5 не закрываются до завершения OPS-2c; исторический OPS-2.V относился к release slice OPS-2a. OPS-2c подтвердил весь назначенный merge/release integration: 64 PASS, 0 FAIL/SKIP; свежие ledger, schemas/AG-11/12 и strict/static evidence — `.qa/add-safe-services-autogit/OPS-2c/`. Status/CI production consumers не менялись: root `.` уже поддерживается, release сохраняет `pushed/ownerRepo/sha`; CI-specific suite не запускался.

- [x] OPS-2.1 Согласовать root identity, версию/структуру plan и state schemas со всеми merge/release/status/ci consumers; AG-11 создаёт реальный plan для корня и двух сервисов и исполняет без ручного JSON-патча; legacy plan без обязательных hashes требует replan.
- [x] OPS-2.2 Перепроверять inventory, exact branch, selected/index hashes, remote identity/refs и блокеры всех клонов под existing lock до первой мутации; AG-05/06/10 доказывают zero-mutation при stale/unsafe plan и сохранность foreign index/content.
- [x] OPS-2.3 Добавить read-only release preview/token к existing `release --dry-run` без fetch/checkout/refs mutation; AG-09/10 проверяют repo subset, merge-state SHA, remote SHA, ff/noop/diverged, root not-applicable и отсутствие release-token при partial merge.
- [x] OPS-2.4 Сохранить двухфазный merge/sync, fail-stop state и ручной resume, убрать только несовместимости прямого plan→merge пути; grouped AG-11/12 проверяют rejecting local hooks/конфликт, durable partial state и отсутствие auto-retry/auto-release/rollback.
- [x] OPS-2.5 Обновить связанные schemas и grouped tests/fixtures AG-05/06/09..12; проверить read-only dry-run снимками HEAD/refs/index/status и локальный ff release без checkout release, без вызова production root.
- [x] OPS-2.V Выполнить targeted `node --test scripts/tests/shipctl-merge.test.mjs scripts/tests/shipctl-release.test.mjs` и scoped JS/static checks; записать evidence и вернуть handoff, включая release preview/token CLI, safe resume guidance и статус совместимости ci consumer. CI-specific test запускать только при изменении этого consumer.

### Детализация завершения OPS-2 по принятому split

- [x] OPS-2b.1 (часть OPS-2.1) Merge принимает v2 repos-object, root `.`, lone legacy alias `root` нормализуется, конфликт aliases и неполный/legacy plan требуют replan; exact subject/trailers и literal staging сохраняются. Добавлена только необходимая schema closure для v2 file metadata, не полный state/resume.
- [x] OPS-2b.2 (часть OPS-2.5) Grouped AG-05/06/10 tests: global blockers/stale → zero mutation, foreign content/index, dry-run snapshots, минимальный реальный plan→merge root+service; targeted JS/static evidence в `.qa/add-safe-services-autogit/OPS-2b/`.
- [x] OPS-2c.1 (остаток OPS-2.1) Завершить merge-state/writes и status/ci consumer closure; реальный plan root+2 services→merge→release preview без JSON-патча, canonical schema проверки AG-11.
- [x] OPS-2c.2 (OPS-2.4 и остаток OPS-2.5) Безопасный explicit resume v2, durable partial/conflict state и AG-12; мигрировать legacy hand-authored merge/resume fixtures на новый контракт и выполнить соответствующую targeted verification.

## 3. OPS-3 — Make-адаптер и полная offline интеграция (профиль: Backend)

**Specs:** `task-shipping-tooling`, AG-01/02/09 и regression. **Пути:** A interface/wiring slice. **Зависит от:** OPS-2. Финальная граница root tooling.

- [x] OPS-3.1 Добавить `.PHONY` Make target `services-autogit` и безопасный raw export входных переменных в Node-entrypoint без shell/eval interpolation; AG-01/02 проверяют GNU Make синтаксис, пробелы, quotes, literal make/shell expressions и доллар.
- [x] OPS-3.2 Реализовать адаптер ACTION=plan/merge/release с conditional required inputs, PATHS_FILE, RELEASE=0/1 и JSON/exit-code контрактом; AG-01/02 доказывают default plan и no mutation на invalid input.
- [x] OPS-3.3 Привязать `CONFIRM_PUSH`/`CONFIRM_RELEASE` к конкретным preview tokens, реализовать release_pending только после полного merge; AG-09/10 проверяют no token/wrong token, отказ/нет канала, смену preview и отсутствие автоматического deploy при RELEASE=1.
- [x] OPS-3.4 Добавить `scripts/tests/services-autogit.test.mjs` с local-only fixtures, spy/fake child tooling, grouped AG-01/02/09, включая exact Make→adapter→shipctl argv и отсутствие command injection; включить suite в existing ship-test без дублирования alias.
- [x] OPS-3.5 Встроить краткий help адаптера с рабочими примерами, `$` escaping, whole-file/foreign/secret warnings, двумя gates и partial failure guidance; сверить его тестом help/CLI contract.
- [ ] OPS-3.V Выполнить targeted adapter tests и один полный `make ship-test` как final-tooling gate, scoped `node --check`/whitespace checks; сохранить ledger с причиной полного прогона, отметить tasks и передать Router handoff без реального shipping.

OPS-3: adapter AG-01/02/09/10 targeted — 9 PASS, 0 FAIL/SKIP; один полный `make ship-test` — 386 PASS, 14 FAIL, 0 SKIP (400 tests). Pre-existing блокеры вне ownership: POL-01 ссылается на отсутствующий `openspec/changes/harden-agent-verification-pipeline/tasks.md`; Chromium headless shell не установлен (qa-browser). CI fixture PATH исправлен в непосредственной shipping fixture closure: отдельный targeted run — 7 PASS, 0 FAIL/SKIP; контракт — в `.qa/add-safe-services-autogit/OPS-3/contract.json`. Полный gate не объявлен PASS и не повторяется без решения Router по prerequisites/ownership; OPS-3.V остаётся unchecked. Runtime/реальных shipping-операций не было.

## 4. OPS-4 — правила финализации и согласование документации (профиль: Backend)

**Specs:** `task-shipping-tooling`, AG-01/09/10. **Пути:** B. **Зависит от:** OPS-3. Это deliverable документационного UX/контракта, не отложенные unit tests реализации.

- [x] OPS-4.1 Обновить README рабочими make-примерами, обязательными inputs и пояснением `-b/-m/--release`; static review и fake-root запуск примеров доказывают корректный argv без реальных Git mutations.
- [x] OPS-4.2 Обновить WORKFLOW только по финализации: existing QG→ready→sync/archive→plan сохраняется, точные branch/message overrides, два remote gates и текстовый fallback; сверить с адаптером и AG-09.
- [x] OPS-4.3 После явно принятого main-default согласовать только Git-workflow раздел SERVICES с автоматизацией от main; убрать конфликт dev/operator-only для данного подтверждаемого процесса, не менять сервисный каталог; static review фиксирует единственный непротиворечивый контракт.
- [x] OPS-4.4 Уточнить `.agents/skills/task-finalize/SKILL.md`: Router предлагает ветку/subject, принимает правки, replans, вызывает make только после gate, не выполняет generic checkout-main при конфликте; проверить AG-09/10 и сохранность lock/resume/CI правил.
- [x] OPS-4.5 Проверить собственные правила Router на соответствие skill/AGENTS без изменения `agents/router.md` в текущем ownership; при реальном конфликте остановиться и запросить расширение ownership, не импровизировать. Обновить принадлежащие B shipping assertions policy-теста и проверить согласованность путей/примеров.
- [ ] OPS-4.V Выполнить targeted `node --test scripts/tests/pipeline-policy.test.mjs`, scoped `git diff --check`, static links/CLI review и `openspec validate add-safe-services-autogit --type change --strict`; отметить tasks и вернуть handoff с evidence и согласованным UX.

OPS-4: OPS-4.1–4.5 выполнены. Правила Router сверены по AGENTS и переданным ограничениям (Backend пишет код; предложение branch/message после archive; остановка до отдельных push/deploy approvals; explicit corrections → replan); `agents/router.md` не читался и не менялся. Новые shipping assertions — 4 PASS; README/skill примеры — fake-root recorder без Git/remote, 8 make-команд и 2 dollar-примера PASS; scoped JS/whitespace/links и OpenSpec strict PASS. OPS-4.V остаётся unchecked: targeted pipeline-policy блокируется pre-existing POL-01 с отсутствующим `openspec/changes/harden-agent-verification-pipeline/tasks.md`, вне scope. Evidence: `.qa/add-safe-services-autogit/OPS-4/`. Полный ship-test в OPS-4 не повторялся; OPS-3.V не принят, Chromium/env не исправлялись; общий verdict оставлен QG.

## 5. QG — независимый QG-LITE (профиль: Quality Gate)

**Specs:** `task-shipping-tooling`, вся test matrix. **Пути:** C. **Зависит от:** OPS-4. Один evidence owner QG, без API/UI/infra lanes.

- [x] QG.1 Провести safety/prerequisite review по design и verification-policy: actual remote targets local-only, fixtures owned `.qa`, разрешения ограничены offline test mutation; записать применимость lanes и blocked gaps, не заявлять команду как выполненную без evidence.
- [x] QG.2 Независимо выполнить один `make ship-test` на актуальной revision и оценить AG-01..12/legacy regression, реальный plan→merge и partial failure; выводы owner не заменяют этот run, повтор alias suite не нужен.
- [x] QG.3 Выполнить policy/static/doc review, scoped whitespace/JS checks и OpenSpec status/strict validation; pipeline-policy не запускать повторно, если его уже покрывает успешный полный ship-test этого QG run; проверить main/dev resolution и два explicit gates без реального remote push/deploy.
- [x] QG.4 Зафиксировать findings и вернуть их владельцу для exact reproducer FAIL→PASS/impacted regression; при отсутствии findings записать отсутствие. Повторная проверка — тем же QG, один targeted recheck, без самостоятельной правки чужих paths.
- [x] QG.V Создать единственный итоговый `docs/reports/add-safe-services-autogit.md` с evidence `.qa/add-safe-services-autogit/QG/`, verdict APPROVED/REWORK и неприменимостью API/UI/PG/NATS; отметить фактически выполненные задачи и вернуть финальный handoff. Этот отчёт не создаётся на стадии PLAN-1.

QG: независимый QG-LITE завершён с verdict **REWORK**. Один `make ship-test`: 397 PASS / 7 FAIL / 0 SKIP (404 tests); pre-existing POL-01 и blocked-env Chromium отделены от change. Новый blocking QG-01 (AG-09/10): между проверкой CONFIRM_PUSH в адаптере и locked core read настоящий план A заменяется настоящим планом B; exit 0 и local-only push B воспроизведены. Scoped static/OpenSpec status/strict PASS. QG checkboxes означают выполненную проверку, не успешный acceptance. OPS-3.V/OPS-4.V не менялись. Отчёт: `docs/reports/add-safe-services-autogit.md`; registry/ledger/exact reproducer: `.qa/add-safe-services-autogit/QG/`. Реализация read-only, никаких shipping-операций в пользовательских репозиториях.

## Workflow follow-up

- После положительного общего QG Router синхронизирует delta в основные specs, повторяет strict validation и архивирует change штатным workflow; это не отдельные checkpoint units.
- После archive Router создаёт свежий shipping plan с окончательными путями; PLAN-1 не даёт разрешения на merge/push/deploy. Выполнение допускается только после отдельных пользовательских gates, предусмотренных skill и design.

## 6. FIX-QG-01 — locked approval boundary (Backend)

- [x] FIX-QG-01.1 Воспроизвести QG-01 FAIL→PASS на owned local-only Git fixture; передавать CONFIRM_PUSH как ожидаемый `merge --plan-token`, сравнивать с валидированным планом под existing lock до Git mutations; deterministic adapter/CLI race, malformed/mismatch/stale и approved-plan compatibility, impacted targeted tests и scoped static/OpenSpec strict. Release boundary не ослаблять; полный suite и внешние POL-01/Chromium не повторять/не исправлять.

FIX-QG-01: exact QG-01 reproducer FAIL→PASS: до исправления опубликован B, после — exit 3 `plan_approval_mismatch`, HEAD/refs/index/status без изменений. Targeted adapter/approval/merge/release: 77 PASS, 0 FAIL/SKIP; scoped JS/whitespace и OpenSpec strict PASS. CLI: optional `merge --plan-token <PLAN_TOKEN>` связывает caller approval с plan под existing flock; адаптер всегда передаёт CONFIRM_PUSH. Старый direct CLI без token сохраняется, resume/release gates не изменены. Evidence: `.qa/add-safe-services-autogit/FIX-QG-01/`; следующий шаг — независимый targeted QG recheck. OPS-3.V/OPS-4.V не закрыты, полный suite не повторялся; POL-01/Chromium вне scope.

QG env closure: пользователь/Router устранили Chromium prerequisite без изменения кода. Независимый QG `make ship-test` после env invalidation: 407 PASS / 1 FAIL / 0 SKIP (408 tests); Chromium helpers PASS, единственный POL-01 доказан pre-existing и не блокирует по quality_gate policy. QG-01 остаётся закрытым; итоговый отчёт обновлён до **APPROVED**, waiver не требуется. Это не дополнительный code-fix/review раунд; checkbox OPS-3.V/OPS-4.V не менялись, реальные shipping операции не выполнялись. Evidence: `.qa/add-safe-services-autogit/QG/env-ship-test.log`, ledger/registry.
