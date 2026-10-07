# Tasks — task-finalization-merge-release-083

Ownership и порядок — по таблице ниже; DAG, test matrix (`UT-*`, `LV-*`, `DRY-*`) и решения D1–D12 лежат в `design.md`, здесь на них только ссылки.

`contextFiles` перечислены **по units**, а не общим списком на весь change. `proposal.md` читается один раз; исполнитель получает только указанные разделы `design.md` и нужный `specs/<capability>/spec.md`.

## Execution units

| Unit | Профиль | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| `SHIP-1` | Backend | `scripts/sync.sh`, `Makefile` (`sync`, `ship-test`), `scripts/tests/helpers/fixture.mjs`, `scripts/tests/sync.test.mjs` | — | `node --test scripts/tests/sync.test.mjs`, `bash -n scripts/sync.sh` | `design.md` → D7, Test matrix (Sync), `specs/task-shipping-tooling/spec.md` («Строгий режим make sync», «Тестирование…»), `scripts/sync.sh`, `Makefile` (`sync`, `services-branches`) |
| `SHIP-2` | Backend | `scripts/shipctl`, `scripts/ship/{common,git,plan}.mjs`, `scripts/tests/shipctl-plan.test.mjs`, `scripts/tests/helpers/fixture.mjs` | `SHIP-1` | `node --test scripts/tests/shipctl-plan.test.mjs` | `design.md` → D3, D4, D5, Test matrix (Plan), `specs/task-shipping-tooling/spec.md` (CLI, план, ветки), `scripts/stackctl` (строки lock/output), `services.manifest`, handoff `SHIP-1` |
| `SHIP-3` | Backend | `scripts/ship/merge.mjs`, `scripts/shipctl` (dispatch), `scripts/tests/shipctl-merge.test.mjs` | `SHIP-2` | `node --test scripts/tests/shipctl-merge.test.mjs` | `design.md` → D6, Test matrix (`UT-MERGE-01..04`), spec «Порядок MERGE…», «Защита посторонних изменений», handoff `SHIP-2` |
| `SHIP-4` | Backend | `scripts/ship/merge.mjs`, `scripts/tests/shipctl-merge.test.mjs` | `SHIP-3` | `node --test scripts/tests/shipctl-merge.test.mjs` | `design.md` → D6, D7, Test matrix (`UT-MERGE-05..11`), spec «Порядок MERGE…», «Ручное разрешение конфликта и продолжение», handoff `SHIP-3` |
| `SHIP-5` | Backend | `scripts/ship/release.mjs`, `scripts/shipctl` (dispatch), `scripts/tests/shipctl-release.test.mjs` | `SHIP-4` | `node --test scripts/tests/shipctl-release.test.mjs` | `design.md` → D8, Test matrix (Release), spec «RELEASE fast-forward main в release», handoff `SHIP-4` |
| `SHIP-6` | Backend | `scripts/ship/ci.mjs`, `scripts/shipctl` (dispatch), `scripts/tests/helpers/fake-gh.mjs`, `scripts/tests/shipctl-ci.test.mjs` | `SHIP-5` | `make ship-test` | `design.md` → D9, Test matrix (CI), spec «Контроль CI через gh», `services/backend/.github/workflows/check_and_deploy.yml`, handoff `SHIP-5` |
| `STACK-1` | Backend | `scripts/stackctl`, `.agents/skills/stack-control/SKILL.md` | — | `LV-STACK-01..05` | `design.md` → D10, Test matrix (stackctl), `specs/repository-process-tooling/spec.md`, `scripts/stackctl`, `services/site-*/docker-compose.yaml` |
| `DOC-1` | Planner | `AGENTS.md`, `agents/quality_gate.md` | — | `rg`-проверки из `DOC-1.V`, `openspec validate … --strict` | `design.md` → D1, D2, D4 (handoff-пути), D11, D12, `specs/openspec-workflow/spec.md`, `AGENTS.md`, `agents/quality_gate.md` (секции QG-ENV, QG-SYNTH) |
| `DOC-2` | Planner | `.agents/skills/task-finalize/SKILL.md` (новый), `WORKFLOW.md`, `README.md` | `SHIP-6`, `STACK-1`, `DOC-1` | `DOC-2.V`: `wc -c` < 8192, frontmatter, `rg`-проверки, сверка команд с фактическим CLI | `design.md` → D1, D5, D6, D8, D9, D12, `specs/openspec-workflow/spec.md`, `specs/repository-process-tooling/spec.md` («Актуальная документация»), handoff `SHIP-6`, `STACK-1`, `DOC-1`, `.agents/skills/stack-control/SKILL.md` (формат frontmatter) |
| `SMOKE-1` | Backend | — (evidence в `.qa/ship/smoke-083/`) | `SHIP-6`, `STACK-1` | `DRY-01..06` | Test matrix (Реальные репозитории), handoff `SHIP-6`, `STACK-1` |
| `QG-CONTRACTS` | Quality Gate | — | `SMOKE-1`, `DOC-2` | `make ship-test`, review diff vs specs, strict validation | `design.md` → `## Execution units`, `## Test matrix`, D3, D12, все три `specs/*/spec.md`, handoff'ы units |
| `QG-SYNTH` | Quality Gate | `docs/reports/083-task-finalization-merge-release-review.md` | `QG-CONTRACTS` | один отчёт, вердикт | handoff `QG-CONTRACTS`, `design.md` → `## Execution units` |
| `OPS-READY` | Router (skill `task-finalize`) | — | `QG-SYNTH = APPROVED` | `stackctl ready` | `.agents/skills/task-finalize/SKILL.md` |
| `OPS-SYNC` | Router/OpenSpec | `openspec/specs/**` | `OPS-READY` | `openspec validate --specs --strict` | `.claude/skills/openspec-sync-specs` |
| `OPS-ARCHIVE` | Router/OpenSpec | `openspec/changes/archive/**` | `OPS-SYNC` | `openspec list` | `.claude/skills/openspec-archive-change` |
| `OPS-SHIP` | Router (skill `task-finalize`) | git-операции корня | `OPS-ARCHIVE` | `shipctl merge` JSON | `.agents/skills/task-finalize/SKILL.md` |

Неприменимые lanes Quality Gate: `QG-ENV` — нет diff runtime-сервисов (live-проверка `stackctl ready` — в `STACK-1`); `QG-BE` — нет Python diff; `QG-FE-AUTO`, `QG-FE-MANUAL` — нет frontend/UI diff; `QG-LIVE` — нет runtime API diff (реальные репозитории проверяются в `SMOKE-1`). Access matrix — неприменимо, endpoint нет.

DAG: `SHIP-1 → SHIP-2 → SHIP-3 → SHIP-4 → SHIP-5 → SHIP-6`; `STACK-1` и `DOC-1` параллельно с цепочкой; `SHIP-6 + STACK-1 → SMOKE-1`; `SHIP-6 + STACK-1 + DOC-1 → DOC-2`; `SMOKE-1 + DOC-2 → QG-CONTRACTS → QG-SYNTH → OPS-READY → OPS-SYNC → OPS-ARCHIVE → OPS-SHIP` (см. `design.md` → `## Execution units`).

## 1. SHIP-1 — строгий режим sync и тестовая фикстура (профиль: Backend)

**Specs:** `task-shipping-tooling` · **Пути:** `scripts/sync.sh`, `Makefile`, `scripts/tests/helpers/fixture.mjs`, `scripts/tests/sync.test.mjs` · **Зависит от:** —

- [x] SHIP-1.1 Добавить в `scripts/sync.sh` разбор флагов `--strict`, `--include-root`, `--report <file>` без изменения поведения по умолчанию
- [x] SHIP-1.2 Реализовать `--strict`: `git pull --ff-only`, накопление ошибок по клонам, итоговый exit 1
- [x] SHIP-1.3 Реализовать `--include-root` (первым шагом `pull --ff-only` корня) и JSON-report `{name,path,branch,result,error}`
- [x] SHIP-1.4 `Makefile`: `sync` передаёт `$(SYNC_FLAGS)`; добавить `.PHONY` цель `ship-test` (`node --test scripts/tests/`)
- [x] SHIP-1.5 Создать `scripts/tests/helpers/fixture.mjs`: временный корень + клоны из manifest с локальными bare remote (ветки `main` и `release`), guard на не-локальные remote, снимки `status`/`for-each-ref`/HEAD
- [x] SHIP-1.6 Реализовать и прогнать `UT-SYNC-01..UT-SYNC-05` из `design.md` → `## Test matrix`
- [x] SHIP-1.V Прогнать `node --test scripts/tests/sync.test.mjs` и `bash -n scripts/sync.sh`, отметить выполненные task IDs и вернуть handoff

## 2. SHIP-2 — каркас shipctl, status и plan (профиль: Backend)

**Specs:** `task-shipping-tooling` · **Пути:** `scripts/shipctl`, `scripts/ship/{common,git,plan}.mjs`, `scripts/tests/shipctl-plan.test.mjs`, `scripts/tests/helpers/fixture.mjs` · **Зависит от:** `SHIP-1`

- [x] SHIP-2.1 Создать исполняемый `scripts/shipctl` и `scripts/ship/common.mjs`: JSON-only stdout, exit-коды 0/1/2/3, `flock` для мутирующих подкоманд, env `SHIPCTL_ROOT`/`SHIPCTL_GH_BIN`/`SHIPCTL_MAKE_BIN`, каталог `.qa/ship/<change>/`
- [x] SHIP-2.2 `scripts/ship/git.mjs`: обёртки только разрешённых git-операций из D3, разбор `status --porcelain=v1 -z`, `ls-remote --heads`, owner/repo из ssh/https URL; запрещённые операции отсутствуют
- [x] SHIP-2.3 Подкоманда `status` по корню и клонам manifest (ветка, HEAD, dirty, ahead/behind, `origin/release`)
- [x] SHIP-2.4 `plan`: сбор объявленных путей (`--paths-file`, автопути change/archive/specs/`--task`, `--include`/`--exclude`) и классификация `included`/`foreign`/`declaredClean`/`untouched`
- [x] SHIP-2.5 `plan`: kind и базовое имя ветки по D5, автосуффикс `-2`, `-3`, … по локальным и `origin`-веткам всех изменённых репо (одно имя на все), commit message
- [x] SHIP-2.6 `plan`: runtime aliases по D4, блокеры preflight (D6), fingerprint с именем ветки, запись `plan.json`
- [x] SHIP-2.7 Реализовать и прогнать `UT-PLAN-01..UT-PLAN-07`
- [x] SHIP-2.V Прогнать `node --test scripts/tests/shipctl-plan.test.mjs`, отметить выполненные task IDs и вернуть handoff (включая финальную JSON-схему `plan.json`)

## 3. SHIP-3 — merge: preflight, фаза 1 и dry-run (профиль: Backend)

**Specs:** `task-shipping-tooling` · **Пути:** `scripts/ship/merge.mjs`, `scripts/shipctl`, `scripts/tests/shipctl-merge.test.mjs` · **Зависит от:** `SHIP-2`

- [x] SHIP-3.1 Подключить `merge --plan <file> [--dry-run]` в dispatch `scripts/shipctl`
- [x] SHIP-3.2 Preflight всех изменённых репозиториев до мутаций: fingerprint и свободная ветка (`plan_stale`), `not_on_main`, `detached_head`, MERGE_HEAD/rebase, `foreign_staged`, `main_ahead` → exit 3
- [x] SHIP-3.3 Фаза 1 по репозиториям (manifest-порядок, корень последним): `switch -c` → `add -A -- <included>` → `commit` с convention D5 → `switch main`; остановка при `would be overwritten`
- [x] SHIP-3.4 Фаза 1: `git push origin <branch>` для каждого изменённого репо (включая корень) после `switch main`; отказ → stop exit 1, репо на `main`
- [x] SHIP-3.5 `merge-state.json` со стадиями `planned/committed/switched/branch-pushed`, SHA коммитов и pre-merge `main`
- [x] SHIP-3.6 `--dry-run`: полный preflight и пошаговый список операций фаз 1/2 (включая push веток и `make sync`) без мутаций
- [x] SHIP-3.7 Реализовать и прогнать `UT-MERGE-01..UT-MERGE-04`
- [x] SHIP-3.V Прогнать `node --test scripts/tests/shipctl-merge.test.mjs`, отметить выполненные task IDs и вернуть handoff

## 4. SHIP-4 — merge: sync-барьер, фаза 2, конфликт и resume (профиль: Backend)

**Specs:** `task-shipping-tooling` · **Пути:** `scripts/ship/merge.mjs`, `scripts/tests/shipctl-merge.test.mjs` · **Зависит от:** `SHIP-3`

- [x] SHIP-4.1 Барьер: `make sync SYNC_FLAGS="--strict --include-root --report .qa/ship/<c>/sync.json"`, разбор report: сбой в изменённом репо → stop, в untouched → warning
- [x] SHIP-4.2 Фаза 2: `merge --no-ff <branch>` с сообщением D5 → `push origin main`; отказ push → stop, state `merged`
- [x] SHIP-4.3 Конфликт: без `merge --abort`, конфликт остаётся в рабочем дереве, стадия `conflict` + список файлов, следующие репо не обрабатываются, exit 1, в JSON — команда продолжения
- [x] SHIP-4.4 JSON-итог и `merge-state.json` с полной таблицей repo → стадия → SHA → ошибка/файлы при любом исходе
- [x] SHIP-4.5 `merge --resume --change <c>`: проверки `merge_in_progress`, `conflict_unresolved`, `foreign_in_merge` для `conflict`; `state_mismatch` для остальних → exit 3
- [x] SHIP-4.6 `--resume`: повтор строгого sync-барьера, `push origin main` для `merged`, продолжение фазы 2 для оставшихся
- [x] SHIP-4.7 Реализовать и прогнати `UT-MERGE-05..UT-MERGE-11`, перепрогнать `UT-MERGE-01..04`
- [x] SHIP-4.V Прогнать `node --test scripts/tests/shipctl-merge.test.mjs`, отметить выполненные task IDs и вернуть handoff

## 5. SHIP-5 — release fast-forward (профиль: Backend)

**Specs:** `task-shipping-tooling` · **Пути:** `scripts/ship/release.mjs`, `scripts/shipctl`, `scripts/tests/shipctl-release.test.mjs` · **Зависит от:** `SHIP-4`

- [x] SHIP-5.1 Подключить `release --change <c> [--repos] [--dry-run]`; отбор: стадия `pushed` + `origin/release`; корень → `not-applicable`, без release → `no-release-branch`, вне `--repos` → `skipped`
- [x] SHIP-5.2 Preflight всех выбранных репо до push: `fetch origin main release`, `main_moved`, `noop`, `merge-base --is-ancestor` → ff, иначе `release_diverged` со списком коммитов → exit 3 без push
- [x] SHIP-5.3 Push `git push origin <sha>:refs/heads/release` без force; отказ → stop exit 1 с таблицей уже зарелиженных; без worktree и локальной `release`
- [x] SHIP-5.4 `release-state.json`: repo, owner/repo, SHA, статус
- [x] SHIP-5.5 `--dry-run` (допускает `--repos` без merge-state): классификация по текущим remote-tracking refs без fetch и push
- [x] SHIP-5.6 Реализовать и прогнать `UT-REL-01..UT-REL-06`
- [x] SHIP-5.V Прогнать `node --test scripts/tests/shipctl-release.test.mjs`, отметить выполненные task IDs и вернуть handoff

## 6. SHIP-6 — контроль CI через gh (профиль: Backend)

**Specs:** `task-shipping-tooling` · **Пути:** `scripts/ship/ci.mjs`, `scripts/shipctl`, `scripts/tests/helpers/fake-gh.mjs`, `scripts/tests/shipctl-ci.test.mjs` · **Зависит от:** `SHIP-5`

- [x] SHIP-6.1 Подключить `ci --change <c> [--wait]` и read-only `ci --repo <name> --sha <sha>`; preflight `gh auth status` → exit 2; `noop`-репо пропускаются
- [x] SHIP-6.2 Без `--wait` — один снимок (`pending` допустим, exit 0); с `--wait` — опрос `gh run list --branch release --commit` с общим deadline, `--appear-timeout`, `--interval`; статусы `success|failure|cancelled|timed_out|no_run`
- [x] SHIP-6.3 Для неуспешных runs: `gh run view --log-failed` в `.qa/ship/<c>/ci/<repo>-<id>.log` и выдержка в JSON; `ci.json` с таблицей repo → URL → workflow → conclusion
- [x] SHIP-6.4 `scripts/tests/helpers/fake-gh.mjs`: сценарии из fixture-файла и журнал вызовов (для проверки отсутствия `rerun`/`cancel` и числа опросов)
- [x] SHIP-6.5 Реализовать и прогнать `UT-CI-01..UT-CI-07`
- [x] SHIP-6.V Прогнать `make ship-test` (весь набір), отметить выполненные task IDs и вернуть handoff (с итоговым `--help`/JSON-контрактом всех подкоманд для `DOC-2`)

## 7. STACK-1 — stackctl: сайты и команда ready (профиль: Backend)

**Specs:** `repository-process-tooling` · **Пути:** `scripts/stackctl`, `.agents/skills/stack-control/SKILL.md` · **Зависит от:** —

- [x] STACK-1.1 Обобщить `composeArgs` на профили с абсолютными compose/env путями; добавить профили `site-ad`, `site-ksk-inlove` (проекты `eqsitecms-site-*`)
- [x] STACK-1.2 Добавить aliases `site-ad` (`ad-site`) и `site-ksk-inlove` в явный allowlist контейнеров; `status` их показывает
- [x] STACK-1.3 Команда `ready <alias...> [--dry-run] [--no-migrate]`: rebuild → migrate профилей с миграциями → health; HTTP-проба сайтов (`<500`, 60 с); URL из опубликованных портов
- [x] STACK-1.4 Preflight `env_missing`/`port_busy` (env `STACKCTL_SITE_ENV_DIR` для проверки), пустой список → «нет runtime-изменений»; `--dry-run` без lock
- [x] STACK-1.5 Обновить `.agents/skills/stack-control/SKILL.md`: aliases сайтов, `ready`, правило ≤2 repair-попыток для READY
- [x] STACK-1.6 Выполнить `LV-STACK-01..LV-STACK-05` на локальном Docker и сохранить JSON-evidence в `.qa/stack-083/`
- [x] STACK-1.V Прогнать `node --check scripts/stackctl` и `LV-STACK-01..05`, отметить выполненные task IDs и вернуть handoff

## 8. DOC-1 — AGENTS.md и Quality Gate (профиль: Planner)

**Specs:** `openspec-workflow` · **Пути:** `AGENTS.md`, `agents/quality_gate.md` · **Зависит от:** —

- [x] DOC-1.1 `AGENTS.md`: короткий шаг-указатель после шага 8 — «после `QG-SYNTH = APPROVED` загрузи skill `task-finalize` (`.agents/skills/task-finalize/SKILL.md`) и выполни его; без автоисправлений»; процедуру не дублировать (D11, D12)
- [x] DOC-1.2 `AGENTS.md`: формат handoff — «Изменённые файлы» как пути от корня монорепы; один пункт Чеклиста Router про финализацию по skill; skill `task-finalize` в разделе howto/skills; `QG-ENV` покрывает `site-*`
- [x] DOC-1.3 `agents/quality_gate.md`: `QG-ENV` пересобирает и `site-*` через `stackctl`; `QG-SYNTH` — список изменённых файлов от корня монорепы, ветка по конвенции D5, `READY-FOR-MANUAL` не является lane QG
- [x] DOC-1.V Проверить `rg -n "task-finalize|READY-FOR-MANUAL" AGENTS.md agents/quality_gate.md`, отсутствие `git-ship` и пошаговой процедуры merge/release в `AGENTS.md`, `openspec validate task-finalization-merge-release-083 --type change --strict`; отметить task IDs и вернуть handoff

## 9. DOC-2 — skill task-finalize, WORKFLOW.md, README (профиль: Planner)

**Specs:** `openspec-workflow`, `repository-process-tooling` · **Пути:** `.agents/skills/task-finalize/SKILL.md`, `WORKFLOW.md`, `README.md` · **Зависит от:** `SHIP-6`, `STACK-1`, `DOC-1`

- [x] DOC-2.1 Создать `.agents/skills/task-finalize/SKILL.md`: frontmatter `name: task-finalize`, `description`, `whenToUse`; стадии D1, точные команды из handoff `SHIP-6`/`STACK-1`, сбор `--paths-file` из handoff, интерпретация exit-кодов и стадий
- [x] DOC-2.2 В skill: gates через `ask_user_question` (`«Слить в main»`/`«Не сливать»`, `«Релизить»`/`«Не релизить»`, план в тексте вопроса, свободный ответ = правка плана/`--repos`) и fallback текстовым вопросом вне DSH
- [x] DOC-2.3 В skill: конфликт — отчёт и `shipctl merge --resume` после сообщения пользователя; `shipctl ci --wait` как фоновая задача без опроса в цикле; закрытый список команд, запреты, шаблон итогового отчёта
- [x] DOC-2.4 Переписать `WORKFLOW.md` под актуальный пайплайн (без создания `docs/plans`, `make review`, `gh pr create`), конвенции веток/коммитов по D5, ссылка на skill
- [x] DOC-2.5 README: `make sync SYNC_FLAGS=…`, `make ship-test`, `scripts/shipctl`, `scripts/stackctl ready`
- [x] DOC-2.V Проверить `wc -c .agents/skills/task-finalize/SKILL.md` (< 8192), frontmatter `name/description/whenToUse`, `rg -n "gh pr create|docs/plans/NEX|make review|git-ship" WORKFLOW.md README.md` (пусто), сверить команды skill с фактическим CLI; отметить task IDs и вернуть handoff

## 10. SMOKE-1 — dry-run на реальных репозиториях (профиль: Backend)

**Specs:** `task-shipping-tooling` · **Пути:** — (evidence `.qa/ship/smoke-083/`) · **Зависит от:** `SHIP-6`, `STACK-1`

- [x] SMOKE-1.1 Снять снимки `git status --porcelain`, `git for-each-ref`, HEAD корня и всех клонов до проверок
- [x] SMOKE-1.2 Выполнить `DRY-01..DRY-03` (`status`, `plan` для этого change с union handoff-путей, `merge --dry-run`)
- [x] SMOKE-1.3 Выполнить `DRY-04..DRY-06` (`release --dry-run --repos backend,frontend`, read-only `ci --repo backend --sha <origin/release>`, `make ship-test`, `bash -n`, `node --check`)
- [x] SMOKE-1.4 Повторно снять снимки и подтвердить отсутствие мутаций; сохранить JSON-evidence
- [x] SMOKE-1.V Вернуть handoff с таблицей `DRY-01..06` → результат и путями evidence

## 11. QG-CONTRACTS — tooling и governance против specs (профиль: Quality Gate)

**Specs:** все три capability · **Пути:** — · **Зависит от:** `SMOKE-1`, `DOC-2`

- [ ] QG-CONTRACTS.1 Path-scoped review diff `scripts/**`, `Makefile`, `.agents/skills/**`, `AGENTS.md`, `agents/quality_gate.md`, `WORKFLOW.md`, `README.md` против specs и D1–D12 (запрещённые git-операции, включая `merge --abort`, `worktree` и force push, отсутствуют)
- [ ] QG-CONTRACTS.2 Перепрогнать `make ship-test`; сверить трассировку `UT-*`/`LV-*`/`DRY-*` → тесты/evidence
- [ ] QG-CONTRACTS.3 Проверить skill `task-finalize` (размер < 8192, frontmatter, gates `ask_user_question` + fallback, фоновый CI) и шаг-указатель в `AGENTS.md`
- [ ] QG-CONTRACTS.4 Зафиксировать неприменимые lanes (`QG-ENV`, `QG-BE`, `QG-FE-AUTO`, `QG-FE-MANUAL`, `QG-LIVE`) и access matrix `N/A` с обоснованием
- [ ] QG-CONTRACTS.V `openspec validate task-finalization-merge-release-083 --type change --strict`, вернуть handoff с findings

## 12. QG-SYNTH — итоговый вердикт (профиль: Quality Gate)

**Specs:** — · **Пути:** `docs/reports/083-task-finalization-merge-release-review.md` · **Зависит от:** `QG-CONTRACTS`

- [x] QG-SYNTH.1 Свести findings и lanes в один отчёт (включая список изменённых файлов от корня монорепы для `shipctl plan`)
- [x] QG-SYNTH.V Выставить `APPROVED`/`REWORK`; findings оформить как fix execution units; вернуть handoff

## 13. OPS-READY — готовность к ручной проверке (профиль: Router)

**Specs:** `openspec-workflow` · **Пути:** — · **Зависит от:** `QG-SYNTH = APPROVED`

- [ ] OPS-READY.1 По skill `task-finalize`: `scripts/shipctl plan` (предварительный) → `scripts/stackctl ready <aliases>`; ожидаемо «нет runtime-изменений», отчёт пользователю

## 14. OPS-SYNC — синхронизация delta specs (профиль: Router/OpenSpec)

**Specs:** все три · **Пути:** `openspec/specs/**` · **Зависит от:** `OPS-READY`

- [ ] OPS-SYNC.1 Синхронизировать delta specs в main specs (новая capability `task-shipping-tooling`) и выполнить `openspec validate --specs --strict`

## 15. OPS-ARCHIVE — архивирование (профиль: Router/OpenSpec)

**Specs:** — · **Пути:** `openspec/changes/archive/**` · **Зависит от:** `OPS-SYNC`

- [ ] OPS-ARCHIVE.1 Архивировать change и проверить `openspec list`

## 16. OPS-SHIP — первый прогон финализации (профиль: Router, skill task-finalize)

**Specs:** `openspec-workflow`, `task-shipping-tooling` · **Пути:** git-операции корня · **Зависит от:** `OPS-ARCHIVE`

- [ ] OPS-SHIP.1 Финальный `shipctl plan`, gate «Сливать в main?» через `ask_user_question`, при «Слить в main» — `shipctl merge` (feature-ветка и `main` корня запушены), итоговая таблица
- [ ] OPS-SHIP.2 Релиз: корень `not-applicable`, вопрос «Релизить?» не задаётся; итоговый отчёт финализации
