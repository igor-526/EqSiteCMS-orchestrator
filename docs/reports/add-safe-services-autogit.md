# Quality Gate: add-safe-services-autogit

**Профиль:** QG-LITE · **Вердикт: APPROVED_WITH_WAIVER** · **Дата:** 2026-11-06

## Итог

После единственного targeted recheck **QG-01 закрыт**, новых code findings нет. Независимый exact reproducer теперь возвращает exit 3 `plan_approval_mismatch` и zero-mutation; impacted regression — **77 PASS / 0 FAIL / 0 SKIP**. QG реализацию не менял; пользовательские репозитории не коммитились, не сливались и не публиковались.

После установки Chromium и системных библиотек пользователем/Router независимо повторён `make ship-test` на неизменённом исправленном коде: **407 passed / 1 failed / 0 skipped**, 408 tests, 65,95 с, exit 2. Chromium helpers и весь shipping slice прошли. Единственный FAIL — доказанный **pre-existing POL-01** вне причинного scope change; согласно `agents/quality_gate.md` (классификация pre-existing, QG-FORMAT PASS) он не блокирует и не требует waiver. Новых gaps/findings нет: **APPROVED**, не APPROVED_WITH_WAIVER. Aggregate exit 0 не заявляется.

## Контекст и ссылки

Добавлены Make→Node адаптер, планы v2 с literal selection/секретным scanner, whole-inventory preflight, durable merge/resume и отдельный release preview/token; согласована shipping-документация.

- [Proposal](../../openspec/changes/add-safe-services-autogit/proposal.md), [design / matrix](../../openspec/changes/add-safe-services-autogit/design.md#test-matrix), [delta spec](../../openspec/changes/add-safe-services-autogit/specs/task-shipping-tooling/spec.md), [tasks](../../openspec/changes/add-safe-services-autogit/tasks.md).
- [Исходная задача](../tasks/108_git_auto_commands.md). Approval реализации/main-default передан Router; remote approval не предоставлялся и не требовался для local-only fixtures.
- Ветка shipping не назначена: точные BRANCH/MESSAGE должны согласовываться после archive, сейчас shipping запрещён.

## Lanes

| Lane | Результат |
|---|---|
| QG-ENV | пройден — Chromium v1234 и библиотеки доступны; независимый browser subset внутри aggregate PASS; QG repair attempts: 0 |
| QG-BE / tooling | пройден после fix — QG-01 закрыт; Python Clean Architecture неприменима |
| QG-CONTRACTS | пройден — AG-09/10 исправлены и независимо перепроверены; прочее evidence без изменений |
| QG-FORMAT | пройден — scoped `node --check` и `git diff --check`; новый formatter не вводился |
| QG-FE-AUTO / MANUAL | неприменимо — нет product UI diff; synthetic browser helper не является UI change |
| QG-LIVE / Access verification | неприменимо — HTTP endpoints, anonymous/authenticated API, PG/NATS/миграции не изменены |
| QG-SYNTH | APPROVED — code finding закрыт, env prerequisite снят; POL-01 non-blocking pre-existing |

## История finding и результат повторной проверки

### QG-01 — TOCTOU подтверждения плана (AG-09/10): CLOSED

**Владелец: Backend.** `scripts/services-autogit:71–78`; `scripts/ship/merge.mjs:113–128,551–557`.

Адаптер читает PLAN и сверяет CONFIRM_PUSH, затем передаёт core только `merge --plan <path>`. Core под flock заново читает файл и проверяет внутреннюю согласованность его нового токена, но не равенство первоначально подтверждённому токену. Параллельный read-only replan может заменить persisted файл между этими чтениями: plan не берёт mutating lock.

Exact reproducer: `node .qa/add-safe-services-autogit/QG/reproduce-token-race.mjs`.

1. В owned fixture с проверенными local bare origin создать настоящие планы A и B с одинаковыми selected bytes/веткой, но разными subject/token.
2. Вернуть A в PLAN и вызвать настоящий адаптер с CONFIRM_PUSH=A.
3. Shim `flock` детерминированно заменяет PLAN на B перед вызовом настоящего `/usr/bin/flock`; прочее исполнение — production shipctl/merge.
4. **Ожидание:** отказ до branch/commit/push. **Факт:** exit 0, phase2-complete, state.planToken=B, в bare remote опубликован `UNAPPROVED subject B`.

Evidence: `.qa/add-safe-services-autogit/QG/reproducer-before.json`, `token-race.log`; сценарий не требует сети или изменения пользовательских Git refs. Shim моделирует окно между двумя чтениями, не подменяет merge/preflight/token validation. Исправление должно передавать ожидаемый approval digest до locked core boundary и сравнивать его до первой мутации; одной повторной сверки в адаптере недостаточно.

### Единственный независимый recheck после FIX-QG-01

- Исправлены только adapter→core approval boundary и непосредственно зависимые tests/design/tasks. Адаптер всегда передаёт CONFIRM_PUSH через `merge --plan-token`; core сравнивает его с валидированным in-memory plan под flock, до preflight и мутаций.
- `node .qa/add-safe-services-autogit/QG/recheck-token-race.mjs`: **PASS**. Сохранены исходные A/B subjects, selected bytes, маршрут adapter→flock shim→production core. Замена файла на B подтверждена; HEAD/refs/raw index/status/selected bytes/local bare refs и отсутствие merge-state не изменились. Evidence: `reproducer-after.json`, `recheck-token-race.log`; исходный `reproducer-before.json` сохранён.
- `node --test scripts/tests/shipctl-approval.test.mjs scripts/tests/services-autogit.test.mjs scripts/tests/shipctl-merge.test.mjs scripts/tests/shipctl-release.test.mjs`: **77 PASS**, 0 FAIL/SKIP, 58,35 с. Включены adapter/CLI race, malformed/duplicate/mismatch tokens, stale-content preflight, dry-run/resume, happy-path A, durable partial и release regression.
- Scoped syntax/whitespace четырёх изменённых JS paths — PASS. Strict повторён только из-за изменённых design/tasks — PASS; неизменённые status/policy/полный suite не повторялись (`recheck-static.log`, `recheck-strict.log`).
- **Direct CLI без token:** сохраняет прежний explicit operator workflow, но сам не является token-bound approval gate и не доказывает согласие пользователя. Это согласуется с исходным сохранением existing CLI и моделью «Router + Make adapter требуют gates», а token — не authentication boundary. Router обязан использовать token-bound adapter; обход через historical CLI вместо утверждённого gate недопустим. Нового blocking finding по этой совместимости нет.
- Текущий code fingerprint: `d2bfe2e8ca2a938c54273a2f48cb65f5aa674d391eae8000c5257aa487ebda86` (`recheck-fingerprints.json`); первоначальный full-suite fingerprint ниже — исторический, не полный PASS на исправленной версии. Независимые неизменённые evidence сохранены; затронутый slice обновлён targeted run согласно verification policy.

## Покрытие Test matrix

Единственный независимый evidenceOwner всех строк — QG. Основной run QG-SUITE-1; before — QG-RACE-1; закрытие — QG-RACE-2 и QG-TARGETED-2. После env invalidation выполнен QG-SUITE-ENV-2; это не второй code-fix/review раунд. Подробный registry/команды/revision/options/prerequisites/isolation: `.qa/add-safe-services-autogit/QG/ledger.jsonl`, `registry.json`; результаты тестов: `matrix-test-results.txt`.

| IDs / риск | Фактические сценарии | Статус |
|---|---|---|
| AG-01/02 / R-CLI | `services-autogit.test.mjs`: literal Make/env inputs, quotes/dollar/shell expressions, invalid inputs, настоящий Make→shipctl | passed |
| AG-03/04 / R-OVERRIDE | `shipctl-plan.test.mjs:625,639`: точные overrides/trailers, collision, fallback/ref/Unicode | passed |
| AG-05 / R-INVENTORY | plan:656,684; merge:828,846,861: blockers вне included, failed probes, global preflight/lock, zero mutation | passed |
| AG-06 / R-DIRTY | plan:700,830; merge:767,881,922: whole-file, foreign/index preservation, dirty sync overlap, noop | passed |
| AG-07 / R-SECRET | plan:717: hidden/ignored/denylist/templates/content scanner, отсутствие sentinel в JSON/stderr | passed |
| AG-08 / R-PATH | plan:753,779; merge:881: spaces/dashes, rename/delete, traversal/pathspec/nested repo/symlink bytes | passed |
| AG-09 / R-GATE | adapter + release:60,236 + SHIP-POL: release intent/отказ/preview/отдельный token/lock | passed после FIX-QG-01 — QG-RACE-2 / QG-TARGETED-2 |
| AG-10 / R-STALE | plan:798; merge global stale cases; release:107: content/index/HEAD/origin/subset/state/remote SHA | passed после FIX-QG-01 — race отвергнута без мутаций; исходные cases сохранены |
| AG-11 / R-COMPAT | merge:1005: реальный generated plan root+2 services→merge→status→release preview, Ajv schemas; release:219 aliases | passed |
| AG-12 / R-PARTIAL | merge:1051,1082,1103,1146 и release:156,196: hooks/conflict/durable checkpoints/explicit resume/no auto-release | passed |
| R-REGRESSION | QG-SUITE-ENV-2: shipping/approval/plan/merge/release/ci/sync и Chromium helpers прошли; aggregate 407/1 | пройден для change; 1 FAIL — non-blocking pre-existing POL-01 |
| R-POLICY | 4 новых SHIP-POL assertions и review main-default/двух gates/документации/ссылок | passed в shipping scope; POL-01 отдельно ниже |

## Verification и evidence

- HEAD: `a84e18018831af956db642b9d84ae3dda534b0a5` + dirty change; SHA-256 code fingerprint: `4b657fd4dea19b88fa47b699ec66ba143a17c59df08a7b718246b8068965e277` (`fingerprints.json`).
- Node v24.22.1; Git 2.53.0; GNU Make 4.4.1; `/usr/bin/flock`. Прогон 10:09:36–10:10:42 UTC; `ship-test.log`, `environment.txt`.
- Полный suite повторён один раз только после env change (Chromium/dependencies), с ledger reason/previousRunId; pipeline-policy/browser отдельно в QG не дублировались.
- 14 scoped JS/entrypoint syntax checks + whitespace: PASS, `static.log`. Корневые test/lint/format aggregates проверены статически, runtime services не запускались (`review-static.txt`).
- Cached OpenSpec CLI: `status --change add-safe-services-autogit` — 4/4 artifacts complete; `validate add-safe-services-autogit --type change --strict` — PASS (`openspec-status.log`, `openspec-strict.log`). Это не означает принятия unchecked OPS-3.V/OPS-4.V.
- Изоляция: новые QG fixtures только в `.qa/add-safe-services-autogit/QG/fixtures/`, fetch/push URLs проверены как absolute owned bare paths. Git global/system config отключён; реальные SHIPCTL_ROOT/remote shipping не вызывались. Existing full-suite harness сохраняет свои hardcoded `.qa` fixture/evidence bases; он не переписывался ради gate. QG logs/registry/reproducer находятся только в QG.
- Baseline: `status-before.txt`, `scoped-before.diff`; во время каждого QG run код не менялся; между раундами изменения FIX-QG-01 отражены в `recheck-fingerprints.json`. Дефекты не исправлялись, remote operations в пользовательских репозиториях отсутствуют.

## Pre-existing / blocked-env / Waivers

1. **Pre-existing POL-01:** `pipeline-policy.test.mjs:189–194` проверяет старый пример verification-policy с отсутствующим `openspec/changes/harden-agent-verification-pipeline/tasks.md`. Исходный assertion и policy одинаковы с HEAD, diff только добавляет SHIP-POL ниже него. Точный failure — `ship-test.log:461–477`; baseline — `review-static.txt`. Не code blocker этого change. Router: предложить отдельную задачу в `docs/tasks` на актуализацию статического policy example.
2. **Исторический blocked-env снят:** Chromium headless shell v1234 установлен Router; libnspr4/libnss3/libasound2t64 — пользователем. Независимый QG `ldd` без `not found`, synthetic Chromium helpers внутри QG-SUITE-ENV-2 — все 7 tests PASS. `env-ldd.log`, `env-environment.txt`, `env-ship-test.log`; setup QG не выполнял, ремонт реализации не требовался.
3. **Waivers:** отсутствуют и для доказанного pre-existing POL-01 не требуются. Обязательное независимое исполнение suite и применимые acceptance оси теперь доказаны; literal exit 0 всего aggregate не является дополнительным условием, отменяющим явное разрешение policy на non-blocking pre-existing. OPS-3.V/OPS-4.V остаются историческими unchecked owner tasks: QG не выдаёт свою проверку за их исполнение.

## Изменённые пути change / границы review

`Makefile`, `scripts/services-autogit`, `scripts/shipctl`, `scripts/ship/{git,plan,merge,release}.mjs`, `scripts/ship/schemas/{plan,merge-state,release-state}.json`, `scripts/tests/helpers/fixture.mjs`, `scripts/tests/{services-autogit,shipctl-approval,pipeline-policy,shipctl-ci,shipctl-merge,shipctl-plan,shipctl-release,sync}.test.mjs`, `README.md`, `WORKFLOW.md`, `SERVICES.md` (Git section), `.agents/skills/task-finalize/SKILL.md`, `openspec/changes/add-safe-services-autogit/{proposal,design,tasks}.md`, `openspec/changes/add-safe-services-autogit/specs/task-shipping-tooling/spec.md`, этот отчёт.

Не включать автоматически: `dsh/home/profiles/web/{package.json,pnpm-lock.yaml}`, удаление `docs/tasks/108_layout.md`, новые `docs/tasks/108_git_auto_commands.md`, `docs/tasks/110_seo_tasks.md`, `openspec/changes/seo-metrica-task-monitor/` — входной/посторонний diff, не реализация shipping; сохранён.

## Чеклист доработки

### Backend

**BE-FIX-QG-01** — один tooling approval-boundary slice (примерно 5–8 действий): adapter→CLI→locked merge contract, непосредственно зависимые schema/help/tests при необходимости; остальные safety проверки сохранить.

- [x] FIX-QG-01 выполнен владельцем; approval digest связан с locked in-memory plan. Независимый exact reproducer подтвердил закрытие.
- [x] Deterministic adapter/CLI A→B regression, zero-mutation, valid A, malformed/mismatch/stale cases — 77-test targeted run PASS.
- [x] Exact reproducer FAIL→PASS, impacted regression и scoped static проверены; полный suite не повторялся.

### Frontend

Не требуется.

### Quality Gate

- [x] Тот же QG-агент выполнил единственный targeted recheck QG-01 и затронутых contracts, обновил этот отчёт; повторный раунд исчерпан.
- [x] Внешний Chromium prerequisite снят; QG независимо подтвердил это aggregate run. Итог APPROVED. POL-01 передать в отдельную pre-existing задачу; новых fix units/review rounds не требуется. Реальные push/deploy по-прежнему требуют отдельных пользовательских gates.

## Закрытие внешнего prerequisite (не code-review раунд)

Пользователь выбрал исправление окружения вместо waiver. Code fingerprint остался `d2bfe2e8ca2a938c54273a2f48cb65f5aa674d391eae8000c5257aa487ebda86`. Независимый QG-SUITE-ENV-2 выполнен 12:27:06–12:28:12 UTC: `timeout 300 make ship-test` с sanitized Git env, **407/1**, 0 skipped. Единственный failure точно совпадает с первоначальным POL-01 (`pipeline-policy.test.mjs:189–194`, отсутствующий старый tasks path); новых errors нет. Google Chrome for Testing 151.0.7922.34; libnspr4 2:4.38.2-1ubuntu1, libnss3 2:3.120-1ubuntu2.2, libasound2t64 1.2.15.3-1ubuntu1.1. Команды/fingerprints/isolation/reason/previousRunId — в ledger/registry. Static/strict/status и exact reproducer повторно не запускались: код/контракт не менялся, закрытие QG-01 сохраняется. Это закрывает прежний env gap; дополнительного пользовательского решения по acceptance не требуется.

## Согласованное исключение при архивировании

Пользователь разрешил архивирование несмотря на 9 предупреждений strict validation основной `task-shipping-tooling` о длине старых требований (>500 символов): «Да» в ответ на конкретный запрос Router. Статус: waived by user. Новые требования предупреждений не получили; strict validation самого change прошла. Итог: **APPROVED_WITH_WAIVER**.
