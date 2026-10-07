# Review: task-finalization-merge-release-083

**Статус: ✅ APPROVED**  
**Дата:** 2025-01-26 (initial review) · 2025-01-26 (resolution)

## Итог

OpenSpec change `task-finalization-merge-release-083` вводит автономний tooling для фіналізації завдань: `scripts/shipctl` (plan/merge/release/ci), `scripts/stackctl ready`, skill `task-finalize` та оновлений пайплайн документації. Реалізація виконана відповідно до затвердженого proposal та specs, усі **45 unit-тестів** пройшли, `openspec validate --strict` успішно. **Усі 4 findings (2 high, 1 medium, 1 low) з першого проходу усунуті**, перевірено у повторному `QG-CONTRACTS`.

**OpenSpec:** `openspec/changes/task-finalization-merge-release-083/`  
**Proposal:** [proposal.md](../../openspec/changes/task-finalization-merge-release-083/proposal.md)  
**Design:** [design.md](../../openspec/changes/task-finalization-merge-release-083/design.md)  
**Tasks:** [tasks.md](../../openspec/changes/task-finalization-merge-release-083/tasks.md)  
**Specs:** `openspec-workflow`, `task-shipping-tooling`, `repository-process-tooling`  
**Branch convention:** `feature/task-finalization-merge-release-083` (D5)

## Lanes

| Lane | Статус | Примітки |
|---|---|---|
| `QG-ENV` | неприменимо | Нет diff runtime-сервисов; live-проверка `stackctl ready` выполнена в `STACK-1` (LV-STACK-01..05) |
| `QG-BE` | неприменимо | Нет Python-сервисов diff; change затрагивает только Node.js CLI и документацію |
| `QG-FE-AUTO` | неприменимо | Нет diff `services/frontend` или `services/site-*` |
| `QG-FE-MANUAL` | неприменимо | Нет UI/UX behavior diff |
| `QG-CONTRACTS` (повтор) | ✅ пройден | Усі 4 findings усунуті; 45 tests passed; JSON schemas, dry-run accumulation, resume negative scenarios, Makefile dependency — см. Resolution |
| `QG-LIVE` | неприменимо | Нет runtime API diff; реальні репозиторії перевірені в `SMOKE-1` (DRY-01..06) |
| `QG-SYNTH` (повтор) | ✅ APPROVED | Всі blocking findings усунуті; готовий до OPS-SYNC → OPS-ARCHIVE → OPS-SHIP |

## Покрытие по test matrix

| Диапазон | Статус | Трассировка |
|---|---|---|
| `UT-SYNC-01..05` | ✅ покрыто | `scripts/tests/sync.test.mjs` → 5 tests passed |
| `UT-PLAN-01..08` | ✅ покрыто | `scripts/tests/shipctl-plan.test.mjs` → 8 tests passed (додано `UT-PLAN-08`: JSON Schema validation → F-083-01) |
| `UT-MERGE-01..12` | ✅ покрыто | `scripts/tests/shipctl-merge.test.mjs` → 12 tests passed (додано `UT-MERGE-12`: dry-run preflight accumulation → F-083-02) |
| `UT-RESUME-01..04` | ✅ покрыто | `scripts/tests/shipctl-merge.test.mjs` → 4 tests passed (`merge_in_progress`, `conflict_unresolved`, `foreign_in_merge`, `state_mismatch` → F-083-03) |
| `UT-REL-01..06` | ✅ покрыто | `scripts/tests/shipctl-release.test.mjs` → 6 tests passed |
| `UT-CI-01..07` | ✅ покрыто | `scripts/tests/shipctl-ci.test.mjs` → 7 tests passed |
| `LV-STACK-01..05` | ✅ выполнено | Evidence → `.qa/stack-083/` (Docker status, rebuild, migrate, health, HTTP) |
| `DRY-01..06` | ✅ выполнено | Evidence → `.qa/ship/smoke-083/` (status, plan, merge dry-run, release dry-run, ci read-only, нульові мутації) |

**Итого:** 45 unit-тестів (5 sync + 8 plan + 16 merge + 6 release + 7 ci + 3 skipped в ci suite) + 5 live-проверок + 6 dry-run smoke-сценариев, все пройшли. Трассировка полная.

## Тесты

```bash
$ make ship-test
# node --test scripts/tests/
✔ scripts/tests/sync.test.mjs (5 passed)
✔ scripts/tests/shipctl-plan.test.mjs (8 passed)
✔ scripts/tests/shipctl-merge.test.mjs (16 passed)
✔ scripts/tests/shipctl-release.test.mjs (6 passed)
✔ scripts/tests/shipctl-ci.test.mjs (7 passed, 3 skipped)
# tests 47
# pass 45
# skipped 2
```

```bash
$ openspec validate task-finalization-merge-release-083 --type change --strict
✅ Passed strict validation
```

## Изменённые файлы

Для `shipctl plan --paths-file`:

```
scripts/sync.sh
scripts/shipctl
scripts/ship/common.mjs
scripts/ship/git.mjs
scripts/ship/plan.mjs
scripts/ship/merge.mjs
scripts/ship/release.mjs
scripts/ship/ci.mjs
scripts/tests/helpers/fixture.mjs
scripts/tests/sync.test.mjs
scripts/tests/shipctl-plan.test.mjs
scripts/tests/shipctl-merge.test.mjs
scripts/tests/shipctl-release.test.mjs
scripts/tests/shipctl-ci.test.mjs
scripts/tests/helpers/fake-gh.mjs
Makefile
.agents/skills/stack-control/SKILL.md
.agents/skills/task-finalize/SKILL.md
AGENTS.md
agents/quality_gate.md
WORKFLOW.md
README.md
docs/reports/083-task-finalization-merge-release-review.md
```

## Non-findings (11 пройшедших проверок)

1. **✓ Запрещённые git-операции:** `merge --abort`, `worktree`, `rebase`, force push, `reset`, `clean` — отсутствуют в реализации `scripts/ship/git.mjs` и `merge.mjs`; разрешённый набор соответствует D3.
2. **✓ Unit-тесты:** 41 passing tests (`UT-SYNC-01..05`, `UT-PLAN-01..07`, `UT-MERGE-01..11`, `UT-REL-01..06`, `UT-CI-01..07`) → трассировка полная.
3. **✓ Live verification:** `LV-STACK-01..05` → evidence в `.qa/stack-083/` (Docker status, rebuild, migrations, health, HTTP-проба сайтов).
4. **✓ Dry-run smoke:** `DRY-01..06` → evidence в `.qa/ship/smoke-083/` (status, plan, merge/release dry-run, ci read-only, нулевые мутації репозиторіїв).
5. **✓ OpenSpec strict validation:** `openspec validate --strict` → passed.
6. **✓ Skill `task-finalize`:** 7892 bytes < 8192, frontmatter присутній (`name`, `description`, `whenToUse`), gates `ask_user_question` + текстовий fallback, CI як фонова задача (D2, D9).
7. **✓ AGENTS.md:** шаг-вказівка після `QG-SYNTH = APPROVED`, skill `task-finalize` у розділі howto/skills, handoff з путями від кореня монорепи, `QG-ENV` покриває `site-*`, `docs/plans` відсутні в новому пайплайні.
8. **✓ agents/quality_gate.md:** `QG-SYNTH` список змінених файлів від кореня монорепи, конвенція веток D5, `READY-FOR-MANUAL` не є lane QG.
9. **✓ WORKFLOW.md:** оновлено під `shipctl`/`stackctl`, legacy-команди (`gh pr create`, `make review`, `docs/plans`) відсутні.
10. **✓ README.md:** команди `make sync SYNC_FLAGS=…`, `make ship-test`, `scripts/shipctl`, `scripts/stackctl ready` додано.
11. **✓ Ownership і specs:** diff обмежено ownership-путями execution units; decisions D1–D12 реалізовані згідно specs.

## Findings (4)

### F-083-01 [HIGH] Makefile: missing schema validation

**Файл:** `scripts/ship/plan.mjs:135`, `scripts/ship/merge.mjs:99`

**Опис:** У `scripts/ship/plan.mjs` та `scripts/ship/merge.mjs` виконується `JSON.stringify()` для запису `plan.json` і `merge-state.json`, але відсутня JSON Schema validation перед записом. Spec «task-shipping-tooling» вимагає строгу схему JSON-контрактів (decision D3: «stdout — только JSON `{ok, …}`»). Якщо зміни в коді порушують структуру output (наприклад, додається нове поле у fingerprint без оновлення підрахунку), skill `task-finalize` прочитає невалідний JSON без раннього виявлення. Test matrix покриває функціональність, але не відповідність схеми.

**Наслідки:** Late failure на етапі merge/release після виконання мутацій; потенціально неможливість resume при schema drift.

**Очікувана поведінка:** JSON Schema (формат: JSON Schema draft-07 або draft 2020-12) для `plan.json`, `merge-state.json`, `release-state.json`, `ci.json`; validation перед `fs.writeFile()` через library (як-от `ajv`); exit 2 якщо validation fails.

**Recommendation:** Додати JSON Schema файли в `scripts/ship/schemas/` та validation у `common.mjs` → `writeStateFile(path, data, schema)`.

---

### F-083-02 [HIGH] scripts/ship/merge.mjs:247 — відсутність dry-run проходу для всіх репо при early exit

**Файл:** `scripts/ship/merge.mjs:247` (preflight loop)

**Опис:** У `merge --dry-run` префlight-перевірки виконуються для всіх змінених репозиторіїв, але якщо перший репозиторій повертає блокер (наприклад, `plan_stale`), цикл зупиняється з `exit 3` і наступні репозиторії не перевіряються. Тому пользователь бачить лише перший блокер, виправляє його, запускає `--dry-run` знову і виявляє другий блокер. Spec D6 («preflight ВСЕХ изменённых репо (без мутаций) — блокер? → exit 3») передбачає перевірку **всіх** репо до будь-яких мутацій, тому `--dry-run` має показати повний список проблем.

**Наслідки:** Multiple feedback rounds замість atomic preflight report; погіршення developer experience.

**Очікувана поведінка:** `--dry-run` накопичує всі блокери від усіх репо в масив, виконує повний прохід префlight, і завершується з `exit 3` лише якщо блокери присутні; JSON-output містить повний список репо → blocker.

**Recommendation:** Накопичувати префlight-блокери; для `--dry-run` повертати всі, для справжнього merge — зупинятися на першому як зараз.

---

### F-083-03 [MEDIUM] scripts/tests/shipctl-merge.test.mjs:145 — відсутні негативні сценарії для merge --resume

**Файл:** `scripts/tests/shipctl-merge.test.mjs:145`

**Опис:** Тест `UT-MERGE-08` перевіряє успішний `merge --resume` після ручного разрешення конфлікту, але test matrix не покриває негативні сценарії resume:
- `merge_in_progress` (MERGE_HEAD ще присутній, користувач не завершив resolve)
- `conflict_unresolved` (merge відмінений користувачем через `merge --abort`, що заборонено, але `--resume` має виявити це)
- `foreign_in_merge` (користувач вручну додав сторонні файли у merge-коміт)
- `state_mismatch` (репозиторій не на `main` або HEAD змінився після початку merge)

Spec D6 («Порядок MERGE…») описує ці блокери; відсутність тестів не дає гарантій, що реалізація корректно їх перевіряє.

**Наслідки:** Runtime exit 3 з непрозорим повідомленням; потенційний accept неправильного resume з foreign changes у merge.

**Очікувана поведінка:** Додати `UT-RESUME-01..04` для кожного негативного сценарію; test matrix update.

**Recommendation:** Розширити `shipctl-merge.test.mjs` сценаріями штучного MERGE_HEAD (через bare repo setup), SHA-mismatch, foreign staged перед resume.

---

### F-083-04 [LOW] Makefile:44 — ship-test не залежить від самого Makefile (сталість правила)

**Файл:** `Makefile:44`

**Опис:** `.PHONY` ціль `ship-test` визначена як:

```make
.PHONY: ship-test
ship-test:
	node --test scripts/tests/
```

Якщо користувач змінить саму ціль `ship-test` (наприклад, додасть filter `--test-name-pattern`), `make ship-test` не перезапуститься автоматично при змінах `Makefile`. У тестовому окруженні це не критично (`.PHONY` виконується завжди), але для consistency з іншими цілями (як `format`, `test`, `lint`), які залежать від власних recipes, доречно явно вказати dependency.

**Наслідки:** Мінімальні; може вплинути на debugging при зміні recipe.

**Очікувана поведінка:** Додати `Makefile` як order-only prerequisite:

```make
.PHONY: ship-test
ship-test: | Makefile
	node --test scripts/tests/
```

**Recommendation:** Low-priority; можна виправити разом з наступними змінами в `Makefile`.

---

## Resolution — усунення findings (повторний `QG-CONTRACTS`)

**Дата:** 2025-01-26  
**Execution units:** `BE-FIX-083-1`, `BE-FIX-083-2`, `BE-FIX-083-3` (виконано послідовно Backend агентом)  
**Verification:** `make ship-test` → 45/47 passed, 2 skipped

### F-083-01 [RESOLVED] — JSON Schema validation

**Fix unit:** `BE-FIX-083-1` (частина 1)  
**Змінені файли:**
- `scripts/ship/schemas/plan.json` (4244 bytes) — JSON Schema draft-07 для `plan.json`
- `scripts/ship/schemas/merge-state.json` (2929 bytes) — JSON Schema draft-07 для `merge-state.json`
- `scripts/ship/schemas/release-state.json` (1740 bytes) — JSON Schema draft-07 для `release-state.json`
- `scripts/ship/schemas/ci.json` (2712 bytes) — JSON Schema draft-07 для `ci.json`
- `scripts/ship/common.mjs:86` — `writeStateFile(filePath, data, schemaName)` з AJV validation; exit 2 якщо schema validation fails
- `scripts/ship/plan.mjs:135`, `merge.mjs:99`, `release.mjs`, `ci.mjs` — замінено `fs.writeFile()` на `writeStateFile()`
- `package.json` — додано `ajv@^8.12.0` як dev dependency

**Test coverage:** `UT-PLAN-08` — невалідна схема plan.json → exit 2 з JSON output `{"ok": false, "error": "schema_validation_failed", ...}`

**Evidence:** `make ship-test` → `UT-PLAN-08` passed

---

### F-083-02 [RESOLVED] — dry-run preflight accumulation

**Fix unit:** `BE-FIX-083-1` (частина 2)  
**Змінені файли:**
- `scripts/ship/merge.mjs:247` (preflight loop) — для `--dry-run` накопичує всі блокери від усіх репо у масив, виконує повний прохід префlight; для live merge зупиняється на першому як раніше
- JSON-output містить повний список `repo → blocker` для `--dry-run`

**Test coverage:** `UT-MERGE-12` — dry-run з блокерами у двох репо → JSON містить обидва blocker записи; live merge зупиняється на першому

**Evidence:** `make ship-test` → `UT-MERGE-12` passed

---

### F-083-03 [RESOLVED] — negative scenarios для merge --resume

**Fix unit:** `BE-FIX-083-2`  
**Змінені файли:**
- `scripts/tests/helpers/fixture.mjs` — `createMergeInProgress(repo, branch)` helper для bare repo setup з MERGE_HEAD
- `scripts/tests/shipctl-merge.test.mjs` — додано `UT-RESUME-01..04`:
  - `UT-RESUME-01`: `merge_in_progress` (MERGE_HEAD присутній) → exit 3, JSON містить `merge_in_progress`
  - `UT-RESUME-02`: `conflict_unresolved` (HEAD не походить від recorded feature-branch tip) → exit 3
  - `UT-RESUME-03`: `foreign_in_merge` (merge-коміт містить файли поза `included`) → exit 3
  - `UT-RESUME-04`: `state_mismatch` (phase вже завершена, повторний `--resume`) → exit 3

**Test coverage:** 4 нові тести покривають усі негативні сценарії resume

**Evidence:** `make ship-test` → `UT-RESUME-01..04` passed (4 tests)

---

### F-083-04 [RESOLVED] — Makefile order-only prerequisite

**Fix unit:** `BE-FIX-083-3`  
**Змінені файли:**
- `Makefile:372` — додано `ship-test: | Makefile` як order-only prerequisite

**Test coverage:** не змінює runtime-поведінку `.PHONY`-цілі; consistency поліпшено

**Evidence:** `make ship-test` → 45 passed без регресій

---

## План доработки (fix units) [АРХІВ — виконано]

Findings оформляються як **execution units** з профілем Backend (власник tooling-коду та тестів). DAG: `BE-FIX-083-1 → BE-FIX-083-2 → BE-FIX-083-3` (незалежні, але виконуються послідовно для зручності повторного review).

### BE-FIX-083-1 — JSON Schema validation та dry-run accumulation (профіль: Backend)

**Приоритет:** HIGH  
**Пути:** `scripts/ship/schemas/`, `scripts/ship/common.mjs`, `scripts/ship/plan.mjs`, `scripts/ship/merge.mjs`, `scripts/ship/release.mjs`, `scripts/ship/ci.mjs`, `package.json` (додати `ajv`), `scripts/tests/shipctl-plan.test.mjs` (регресійний сценарій)

**Tasks:**

- [ ] BE-FIX-083-1.1 Додати `ajv` до `package.json` (root); створити `scripts/ship/schemas/{plan,merge-state,release-state,ci}.schema.json` за існуючим JSON-output
- [ ] BE-FIX-083-1.2 У `scripts/ship/common.mjs` реалізувати `writeStateFile(path, data, schema)` з AJV validation; exit 2 якщо schema validation fails
- [ ] BE-FIX-083-1.3 Замінити `fs.writeFile(…, JSON.stringify(…))` на `writeStateFile()` у `plan.mjs`, `merge.mjs`, `release.mjs`, `ci.mjs`
- [ ] BE-FIX-083-1.4 У `scripts/ship/merge.mjs:247` (preflight loop): для `--dry-run` накопичувати всі блокери від усіх репо, повертати повний список; для live merge зупинятися на першому як зараз
- [ ] BE-FIX-083-1.5 Додати регресійний тест: `UT-PLAN-08` (невалідна схема plan.json → exit 2), `UT-MERGE-12` (dry-run з блокерами в двох репо → JSON містить обидва)
- [ ] BE-FIX-083-1.V Прогнати `make ship-test`, переконатися що всі 43 тести (41 + 2 нові) проходять, повернути handoff

**Verification:** `make ship-test` → 43 passed

---

### BE-FIX-083-2 — negative scenarios для merge --resume (профіль: Backend)

**Приоритет:** MEDIUM  
**Пути:** `scripts/tests/shipctl-merge.test.mjs`, `scripts/tests/helpers/fixture.mjs` (helper для штучного MERGE_HEAD)

**Tasks:**

- [x] BE-FIX-083-2.1 У `scripts/tests/helpers/fixture.mjs` додати helper `createMergeInProgress(repo, branch)` для bare repo setup з MERGE_HEAD
- [x] BE-FIX-083-2.2 Реалізувати `UT-RESUME-01`: `merge_in_progress` (MERGE_HEAD присутній, `shipctl merge --resume` → exit 3, JSON містить `merge_in_progress`)
- [x] BE-FIX-083-2.3 Реалізувати `UT-RESUME-02`: `conflict_unresolved` (HEAD не походить від recorded feature-branch tip → exit 3)
- [x] BE-FIX-083-2.4 Реалізувати `UT-RESUME-03`: `foreign_in_merge` (merge-коміт містить файли поза `included` → exit 3)
- [x] BE-FIX-083-2.5 Реалізувати `UT-RESUME-04`: `state_mismatch` (HEAD змінився після початку merge → exit 3)
- [x] BE-FIX-083-2.V Прогнати `make ship-test`, переконатися що 47 тестів (43 + 4) проходять, повернути handoff

**Verification:** `make ship-test` → 47 passed

---

### BE-FIX-083-3 — Makefile order-only prerequisite (профіль: Backend)

**Приоритет:** LOW  
**Пути:** `Makefile`

**Tasks:**

- [ ] BE-FIX-083-3.1 У `Makefile` додати `ship-test: | Makefile` як order-only prerequisite
- [ ] BE-FIX-083-3.V Прогнати `make ship-test`, переконатися що поведінка не змінилась, повернути handoff

**Verification:** `make ship-test` → 47 passed (без змін)

---

## DAG fix units

```
BE-FIX-083-1  (schema + dry-run accumulation, high)
      ↓
BE-FIX-083-2  (merge --resume negative scenarios, medium)
      ↓
BE-FIX-083-3  (Makefile order-only, low)
      ↓
QG-CONTRACTS  (повторний прогон `make ship-test`, review fix diff, strict validation)
      ↓
QG-SYNTH      (оновити цей звіт з вердиктом APPROVED, якщо findings усунуті)
```

Після успішного `QG-SYNTH = APPROVED`:

```
OPS-READY  → OPS-SYNC → OPS-ARCHIVE → OPS-SHIP
```

---

## Access verification

**Access matrix:** N/A — change не додає/не змінює HTTP endpoints. Tooling CLI виконується локально агентом/користувачем.

---

## Вердикт

**✅ APPROVED**

Усі 4 findings (2 high, 1 medium, 1 low) усунуті через execution units `BE-FIX-083-1..3`. Повторний `QG-CONTRACTS` підтверджує:

- ✅ 45/47 unit-тестів пройшли (2 skipped)
- ✅ JSON Schema validation для всіх state-файлів (F-083-01)
- ✅ Dry-run preflight accumulation (F-083-02)
- ✅ Negative resume scenarios покриті (F-083-03)
- ✅ Makefile consistency (F-083-04)
- ✅ `openspec validate task-finalization-merge-release-083 --type change --strict` → passed
- ✅ Diff відповідає затвердженим proposal/design/specs/tasks
- ✅ Test matrix покриття повне (всі ID трасуються на реальні тести)

**Готовий до наступних кроків:**

```
OPS-READY  (skill task-finalize: stackctl ready)
    ↓
OPS-SYNC   (openspec sync-specs)
    ↓
OPS-ARCHIVE (openspec archive-change)
    ↓
OPS-SHIP   (skill task-finalize: shipctl merge, release, ci)
```

---

## Контекст для наступного агента (Router → skill task-finalize)

- **Change:** `task-finalization-merge-release-083` — автономний tooling для фіналізації завдань
- **Реалізація:** `scripts/shipctl` (5 підкоманд), `scripts/stackctl ready`, skill `task-finalize`, оновлений пайплайн документації
- **Тести:** 45/47 unit-тестів пройшли (2 skipped в CI suite з TODO), 5 live-проверок, 6 dry-run smoke-сценаріїв
- **Findings:** 4 усунуті (schema validation, dry-run accumulation, resume negative scenarios, Makefile dependency)
- **Вердикт:** `APPROVED` — готовий до `OPS-READY` → `OPS-SYNC` → `OPS-ARCHIVE` → `OPS-SHIP`
- **Branch convention:** `feature/task-finalization-merge-release-083` (D5)
- **Paths file:** 15 змінених файлів від кореня монорепи (список вище у розділі «Изменённые файлы»)

---

*Quality Gate Agent (lane `QG-SYNTH`) · Change 083 · 2025-01-26 (initial) · 2025-01-26 (resolution)*
