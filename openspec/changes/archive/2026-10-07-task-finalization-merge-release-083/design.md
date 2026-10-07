# Design — task-finalization-merge-release-083

**Тикет:** `docs/tasks/083_task_finalization_merge_release.md` · **Дата:** 2026-10-07 (ревизия PLAN-2) · **Сервисы:** процесс/инструменты корня монорепы (runtime-код `services/**` не меняется).

## Context

- Router-пайплайн (`AGENTS.md`, шаги 1–8) заканчивается sync/archive и текстовым отчётом. `QG-ENV` пересобирает сервисы в начале Quality Gate, но правки по `REWORK` после него в контейнеры не попадают гарантированно (повторяются только затронутые lanes).
- Корень (`git@github.com:igor-526/EqSiteCMS-orchestrator.git`, ветка `main`, без `release` и CI) хранит OpenSpec, `docs/`, `agents/**`, скрипты. Семь клонов из `services.manifest` (`backend`, `notification-service`, `email-service`, `frontend`, `vk-service`, `site-ad`, `site-ksk-inlove`) имеют `main` и `origin/release`; `.github/workflows/check_and_deploy.yml` срабатывает на push в `release` (lint/test → GHCR → `helm upgrade --wait`).
- По локальным remote-tracking refs на дату ревизии `origin/release == origin/main` во всех семи клонах (0 коммитов только в `release`), поэтому fast-forward `main → release` применим. Ветка `release` по решению пользователя никогда не используется для работы: в неё только вливается `main`.
- Рабочие деревья часто грязные посторонними изменениями (корень — десятки файлов, backend — 16, frontend — 11). Пользователь чистит их сам, инструмент страхует от их коммита. `/services/` игнорируется корневым `.gitignore`, так что корень и клоны независимы.
- `scripts/sync.sh` пулит **текущую** ветку каждого клона, глотает ошибки (`|| { echo …; }`), не трогает корень и делает обычный `git pull` (возможен merge-коммит).
- `scripts/stackctl` (Node, JSON stdout, `flock` `/tmp/stackctl.lock`, exit 0/1/2) управляет только `eqsitecms-*`; `site-*` поднимаются собственными `services/<site>/docker-compose.yaml` (контейнеры `ad-site`, `site-ksk-inlove`, порт `${PORT:-3000}`; у `site-ad` `PORT=5100`).
- `gh` 2.101 установлен и авторизован (`igor-526`, scope `repo`), поддерживает `gh run list --commit`.
- **DSH-факты** (основная среда Router): skills автоматически обнаруживаются в `<projectRoot>/.agents/skills/<name>/SKILL.md` (frontmatter `name`, `description`, опционально `whenToUse`; так уже работает `stack-control`); `ask_user_question` задаёт вопрос с фиксированными вариантами и свободным ответом (`custom`), при этом человеческий вопрос может открыть только корневой агент — дочерний агент не может; Bash-инструмент поддерживает `run_in_background` с уведомлением о завершении задачи и чтением результата через `job_output`.
- `AGENTS.md` запрещает Router писать код; git/release шаги должны получить явное место в модели ролей.

## Goals / Non-Goals

**Goals:**

- Финальные стадии: `READY-FOR-MANUAL` → sync/archive → gate «Сливать в main?» → `MERGE` → gate «Релизить?» → `RELEASE` + CI → итоговый отчёт.
- DSH-first: процедура для Router — самодостаточный skill `.agents/skills/task-finalize`, gates — `ask_user_question`, ожидание CI — фоновая задача; детерминированный engine `scripts/shipctl` работает и вне DSH.
- Детерминированные, тестируемые инструменты (`shipctl`, строгий `sync.sh`, `stackctl ready`) вместо «умных» git-сессий агента.
- Страховка от коммита посторонних dirty-файлов; явный отчёт о частичном успехе; возможность продолжить после ручного разрешения конфликта.
- Никаких автоисправлений при сбоях merge/push/CI.

**Non-Goals:**

- Перенос ролей Router/Planner/исполнителей/Quality Gate в DSH presets — отдельный change 084.
- Pull requests, code review на GitHub, branch protection, rerun/revert CI, rollback деплоя.
- Hunk-level выбор изменений внутри одного файла; автоматическая очистка посторонних dirty-файлов.
- Создание `release`/CI в корневом репозитории.
- Изменение runtime-кода сервисов, их CI-workflow, compose-файлов сайтов.
- Очистка legacy-веток `agent/<uuid>` (только не создаём новых).

## Decisions

### D1. Порядок стадий: READY до sync/archive

```text
QG-SYNTH = APPROVED
  → READY-FOR-MANUAL   (shipctl plan → stackctl ready <aliases> → отчёт URL)
  → OPS-SYNC → OPS-ARCHIVE
  → shipctl plan (финальный, с archive-путями)
  → Gate «Сливать в main?»  (ask_user_question; план в тексте вопроса)
  → MERGE              (shipctl merge --plan; конфликт → ручное разрешение → merge --resume)
  → Gate «Релизить?»   (только при полном успехе MERGE и наличии release-репозиториев)
  → RELEASE            (shipctl release, ff-only) → CI (shipctl ci --wait в фоне)
  → итоговый отчёт
```

**Решение (принято в PLAN-1):** `READY-FOR-MANUAL` выполняется сразу после `APPROVED`, до sync/archive. Если контейнер падает из-за кода, change ещё активен: Router оформляет fix unit, повторяет затронутые lanes, `QG-SYNTH` и `READY`, затем архивирует. Вопрос о слиянии задаётся после archive, чтобы план включал финальные пути архива.

**Альтернатива:** READY после archive. Отклонена: сбой из кода после archive требует отдельного bugfix change или «разархивирования».

### D2. Кто выполняет git/release-операции

**Решение:** Router сам, как **операционный шаг**, строго по skill `.agents/skills/task-finalize/SKILL.md` через `scripts/shipctl` и `scripts/stackctl ready`. Вся логика (preflight, классификация файлов, порядок операций, остановки) зашита в детерминированный CLI с JSON-выводом, `flock`, exit-кодами и `--dry-run`; Router только запускает команды, читает JSON, задаёт вопросы и отчитывается. Закрытый список разрешённых команд и запреты (правки файлов, разрешение конфликтов, произвольные мутирующие git-команды, rerun/revert) живут в skill; `AGENTS.md` содержит только короткий шаг-указатель и принцип «без автоисправлений».

| Вариант | Плюсы | Минусы | Итог |
|---|---|---|---|
| Router + skill `task-finalize` + `shipctl` (выбран) | gates — диалог, который в DSH может открыть только корневой агент; нет лишних сессий и повторного чтения контекста; поведение тестируемо | расширение роли Router требует явной формулировки | **выбран** |
| Отдельный профиль `agents/release.md` (lane `OPS-SHIP`) | чистое разделение ролей | дочерний агент не может открыть `ask_user_question`, gates всё равно в Router → 3–4 дополнительные сессии; логика всё равно нужна в скрипте | отклонён |
| Quality Gate lane | уже есть доступ к stackctl | QG — reviewer и не должен мутировать git; вердикт уже выставлен | отклонён |
| Агент выполняет git-команды «вручную» по инструкции | быстро внедрить | недетерминированно, нетестируемо, высокий риск закоммитить чужое | отклонён |
| Вся логика только в skill без CLI | меньше кода | нетестируемо, не работает детерминированно вне DSH | отклонён |

### D3. CLI `scripts/shipctl`

Node ESM (как `stackctl`), точка входа `scripts/shipctl` + модули `scripts/ship/{common,git,plan,merge,release,ci}.mjs`.

| Подкоманда | Мутирует | Lock | Назначение |
|---|---|---|---|
| `status` | нет | нет | ветка, HEAD, dirty count, ahead/behind, `origin/release` по корню и всем клонам (JSON-аналог `make services-branches`) |
| `plan --change <c> [--kind] --summary <s> [--task <f>] [--paths-file <f>] [--include <p>]… [--exclude <p>]…` | нет (пишет только `.qa/ship/<c>/plan.json`) | нет | пофайловый план, имя ветки (с суффиксом), блокеры, fingerprint, runtime aliases |
| `merge --plan <f> [--dry-run]` / `merge --resume --change <c>` | да | да | MERGE (D6); `--resume` — продолжение после остановки, в т. ч. после ручного разрешения конфликта |
| `release --change <c> [--repos a,b] [--dry-run]` | да | да | RELEASE (D8); в `--dry-run` `--repos` допускается без `merge-state.json` |
| `ci --change <c> [--wait] [--timeout 1800] [--appear-timeout 180] [--interval 20]` / `ci --repo <name> --sha <sha>` | нет | нет | контроль CI (D9); без `--wait` — один снимок; вторая форма — read-only проверка произвольного коммита |

- stdout — только JSON `{ok, …}`; прогресс — stderr. Exit: `0` успех, `1` операция остановлена (конфликт, отказ push, сбой sync, неуспешный CI), `2` окружение/lock, `3` предусловие/устаревший план (гарантированно без мутаций в этом запуске).
- Lock: `flock -n .qa/ship/shipctl.lock` (паттерн `stackctl`: самоперезапуск под `flock`, env `SHIPCTL_LOCKED=1`).
- Конфигурация для тестов: `SHIPCTL_ROOT`, `SHIPCTL_GH_BIN` (по умолчанию `gh`), `SHIPCTL_MAKE_BIN`.
- Разрешённые git-операции: `status`, `rev-parse`, `ls-remote`, `merge-base --is-ancestor`, `fetch origin`, `switch -c`, `add -A -- <paths>`, `commit`, `switch main`, `merge --no-ff`, `push origin <branch>`, `push origin main`, `push origin <sha>:refs/heads/release`. Запрещены в коде: `stash`, `reset`, `checkout -- `, `restore`, `clean`, `rebase`, `merge --abort`, `worktree`, любой `push` с `--force*`/`+refspec`.

### D4. «Изменённый репозиторий» и пофайловый план

**Источники объявленных путей** (все пути — от корня монорепы):

1. `--paths-file`: Router собирает объединение строк «Изменённые файлы» из handoff всех execution units и fix units change, плюс путь отчёта `QG-SYNTH` в `docs/reports/`. В `AGENTS.md` формат handoff уточняется: пути от корня монорепы (`services/backend/src/...`), директории допускаются с завершающим `/`.
2. Автоматически: `openspec/changes/<change>/`, `openspec/changes/archive/*-<change>/`, `openspec/specs/<capability>/` для каждой capability из `specs/` change, файл `--task`.
3. Правки пользователя на gate (свободный ответ): `--include`/`--exclude`.

**Классификация:** по каждому репозиторию `git status --porcelain=v1 -z --untracked-files=all`; путь репозитория префиксуется (`services/<name>/`) и сопоставляется с объявленными (точное совпадение или префикс директории). Rename учитывается по обоим путям. Итог: `included`, `foreign`, `declaredClean`. Репозиторий без `included` — `untouched`.

**Почему не path-scoped diff по ownership:** ownership-маски (`services/backend/**`) захватили бы все посторонние dirty-файлы. Посторонние файлы пользователь убирает сам; классификация остаётся страховкой.

**Runtime aliases (для READY):** `backend→app`, `frontend→frontend`, `notification-service→notification-service`, `email-service→email-service,email-celery-worker`, `vk-service→vk-service,vk-celery-worker,vk-bot`, `site-ad→site-ad`, `site-ksk-inlove→site-ksk-inlove`; корень: `.docker-compose/docker-compose.<x>.yml` → aliases соответствующего профиля, остальные пути корня → нет.

**Fingerprint:** sha256 от (repo, HEAD, текущая ветка, имя ветки плана, отсортированные `included` со статусом и `git hash-object` содержимого). `merge` пересчитывает его и проверяет, что ветка плана всё ещё свободна; при расхождении — `plan_stale` (exit 3).

### D5. Ветки и commit convention

- `kind`: `--kind` или префикс change `fix-`/`bug-` → `bug`, иначе `feature`. Базовое имя: `feature/<change>` / `bug/<change>`; `<change>` — без даты архива.
- **Занятое имя → автосуффикс.** Имя считается занятым, если ветка существует локально (`rev-parse --verify refs/heads/<n>`) или на `origin` (`ls-remote --heads origin <n>`) хотя бы в одном изменённом репозитории. `plan` перебирает `<base>`, `<base>-2`, `<base>-3`, … до первого имени, свободного во **всех** изменённых репозиториях, и использует одно имя для всех (единый идентификатор запуска в отчётах). Выбранное имя и пропущенные занятые варианты показываются на gate.
- Коммит: `feat(<change>): <summary>` / `fix(<change>): <summary>`, trailers `OpenSpec: <change>`, `Task: docs/tasks/<file>`.
- Merge в `main`: `Merge branch '<branch>' into main` + `OpenSpec: <change>`. В `release` merge-коммиты не создаются (D8).

### D6. Порядок MERGE с dirty worktree

```text
preflight ВСЕХ изменённых репо (без мутаций) ─ блокер? → exit 3
Фаза 1, по репо (сервисы по manifest, корень последним):
  git switch -c <branch>            # от текущего HEAD = main
  git add -A -- <included…>
  git commit -m …                   # в индексе только included
  git switch main                   # foreign переносятся как есть
  git push origin <branch>          # feature-ветка пушится всегда
Барьер: make sync SYNC_FLAGS="--strict --include-root --report .qa/ship/<c>/sync.json"
  сбой в изменённом репо → stop (exit 1); в untouched → warning
Фаза 2, по репо:
  git merge --no-ff <branch> -m …   # конфликт → оставить в рабочем дереве → stop (exit 1)
  git push origin main              # отказ → stop, state=merged
```

**Preflight:** fingerprint и свободное имя ветки; текущая ветка `main`; не detached; нет `MERGE_HEAD`/rebase; staged-записи ⊆ `included` (`foreign_staged`); `main` не опережает `origin/main` (`main_ahead`).

**Почему безопасно:** коммит включает файлы целиком, поэтому `switch main` не затрагивает `foreign`; если git отказывается (`would be overwritten`) — stop. Push feature-ветки выполняется уже на `main`, поэтому его отказ не оставляет репозиторий на feature-ветке. `make sync` — после фазы 1, строго `--ff-only`. Корень последним — его коммит фиксирует OpenSpec-архив и отчёт после успешного слияния сервисов.

**Конфликт (решение пользователя):** `shipctl` НЕ выполняет `merge --abort`. Конфликт остаётся в рабочем дереве (`MERGE_HEAD`, маркеры), стадия репозитория — `conflict` со списком конфликтующих файлов, следующие репозитории не обрабатываются, exit 1. JSON-итог и skill дают отчёт: какие репозитории уже `pushed`, в каком `conflict` и какие файлы, какие ещё не обработаны (`synced`/`branch-pushed`), и команду продолжения. Альтернатива `merge --abort` + stop отклонена пользователем: ручной разбор в живом merge удобнее, чем повторный запуск.

**`merge --resume --change <c>`** (читает `plan.json` и `merge-state.json`):

1. Для репозитория в стадии `conflict`: `MERGE_HEAD` ещё есть → exit 3 `merge_in_progress` («завершите разрешение и закоммитьте merge»); tip feature-ветки не предок `HEAD` (merge отменён пользователем) → exit 3 `conflict_unresolved`; `HEAD^1` ≠ записанный pre-merge `main` или файлы `git diff --name-only HEAD^1 HEAD` выходят за `included` этого репозитория → exit 3 `foreign_in_merge`. Иначе стадия → `merged` (merge-коммит пользователя принимается как есть).
2. Для остальных репозиториев фактическое состояние (ветка, SHA) должно совпадать с записанным, иначе exit 3 `state_mismatch`.
3. Повторяется барьер строгого `make sync` (ff-only безопасен для уже слитых и необработанных репозиториев; несовместимый upstream → stop).
4. Продолжение: `push origin main` для `merged`, затем фаза 2 для оставшихся репозиториев.

**Частичный успех:** `merge-state.json` и JSON-итог: repo → стадия (`planned|committed|switched|branch-pushed|synced|conflict|merged|pushed|failed|untouched`) → SHA → ошибка/файлы. Gate «Релизить?» задаётся только если все изменённые репозитории `pushed`.

### D7. Строгий `make sync`

`scripts/sync.sh` получает флаги, поведение без флагов не меняется:

- `--strict`: `git pull --ff-only origin <current>`; ошибки накапливаются, остальные клоны обрабатываются, итоговый exit `1`.
- `--include-root`: первым шагом `git pull --ff-only` корня по его текущей ветке.
- `--report <file>`: JSON-массив `{name, path, branch, result: updated|fetched|cloned|failed, error}`.

`Makefile`: `sync: bash scripts/sync.sh $(SYNC_FLAGS)`. `shipctl` вызывает именно `make sync SYNC_FLAGS=…` — требование «перед слиянием обязательно `make sync`» выполняется буквально. **Альтернатива** — отдельный pull внутри `shipctl`: отклонена, дублирует sync.

### D8. RELEASE: fast-forward `main → release` push'ем SHA, без worktree

Только репозитории со стадией `pushed` в `merge-state.json` и существующей `origin/release`, сужение `--repos`. Корень — `not-applicable` (релизить нечего), сервис без `origin/release` — `no-release-branch`, исключённый пользователем — `skipped`.

```text
Preflight ВСЕХ выбранных репо (без push):
  git fetch origin main release
  sha := origin/main;  sha ≠ merge-state.mainSha        → main_moved      ┐
  origin/release == sha                                 → noop            ├ любой блокер → exit 3, ничего не запушено
  merge-base --is-ancestor origin/release sha           → ff (готов)      │
  иначе (release разошёлся или впереди)                 → release_diverged┘
Push, по репо:
  git push origin <sha>:refs/heads/release              # без force; отказ → stop exit 1
  release-state.json: repo, owner/repo (из URL origin), sha, status
```

**Решение:** ff-only через `git push origin <sha>:refs/heads/release` после проверки `merge-base --is-ancestor`. Временный worktree из PLAN-1 больше не нужен: при fast-forward не создаётся merge-коммит, значит не нужно рабочее дерево; рабочие клоны не переключаются и не получают локальную ветку `release`, а удалённый сервер дополнительно отклоняет non-ff push без `--force` (второй рубеж при гонке). Меньше движущихся частей: нет cleanup worktree после сбоя.

**Альтернативы:** временный worktree + `merge --ff-only` — тот же результат, но лишние операции и cleanup, отклонён; `checkout release` в рабочем клоне — риск `would be overwritten` и забытого переключения, отклонён; `merge --no-ff main` в `release` — противоречит решению «release = main», отклонён.

**Расхождение:** `release_diverged` (в `release` есть коммиты вне `main`) — остановка без автоисправлений; отчёт содержит число и список коммитов только в `release`, решение принимает пользователь вне `shipctl`. `main_moved` (после нашего push в `origin/main` появились чужие коммиты) — остановка, чтобы не выпустить непроверенные изменения.

**Поиск CI-run:** релиз указывает на тот же SHA, что `main`; run ищется по этому SHA с фильтром `--branch release` (workflow запускается только push'ем в `release`). `noop` не порождает CI и в `ci` не проверяется.

### D9. Контроль CI через `gh`

Предусловие: `gh auth status` (иначе exit 2). Без `--wait` — один снимок статусов (`pending` допустим, exit 0 при успешном запросе). С `--wait` — опрос с общим deadline для всех репозиториев параллельно:

```text
gh run list --repo <o/r> --branch release --commit <sha> --json databaseId,status,conclusion,url,workflowName,event
```

- run не появился за `--appear-timeout` (180 с, утверждено) → `no_run`;
- все runs SHA `completed` → `success` если все `success`, иначе `failure`/`cancelled`;
- превышен `--timeout` (1800 с, утверждено; учитывает `helm --wait`) → `timed_out` (run не отменяется);
- для неуспешных: `gh run view <id> --repo <o/r> --log-failed` → `.qa/ship/<c>/ci/<repo>-<id>.log`, последние 60 строк в JSON.

Итог — `ci.json` и stdout JSON: repo → run URL → workflow → conclusion. С `--wait` exit `0` только при всех `success`, иначе `1`. Rerun/cancel/revert отсутствуют в коде; тест проверяет, что fake `gh` их не получал.

**Ожидание в DSH:** Router запускает `scripts/shipctl ci --change <c> --wait` через Bash с `run_in_background: true`, не опрашивает статус в цикле, получает уведомление о завершении задачи и забирает JSON через `job_output`. Вне DSH (Codex/Claude Code) та же команда выполняется в foreground.

### D10. `site-*` в stackctl и `stackctl ready`

**Решение:** расширить `stackctl`: профили `site-ad`/`site-ksk-inlove` с compose-файлом `services/<site>/docker-compose.yaml`, env `services/<site>/.env`, проектами `eqsitecms-site-ad`/`eqsitecms-site-ksk-inlove`; контейнеры `ad-site`/`site-ksk-inlove` — в явный allowlist (переименование `container_name` отклонено — вне ownership). `composeArgs` обобщается на абсолютные пути файлов профиля.

`ready <alias...> [--dry-run] [--no-migrate]`: под `flock`; rebuild каждого alias, затем `migrate` для профилей с миграциями (`be`, `notification`, `email`, `vk`; идемпотентный `upgrade head`), затем health (60 с; для сайтов без healthcheck — HTTP-проба опубликованного порта, ответ `<500`). URL: опубликованные порты → `http://localhost:<port>`; без портов → «внутренний сервис». Пустой список → `ok:true`, «нет runtime-изменений». `--dry-run` — preflight (`.env`, свободный порт, профиль) без lock. Отсутствие `.env`/занятый порт → `ok:false` с причиной. Repair (≤2 попытки) выполняет Router по skill. Это же расширение позволяет `QG-ENV` пересобирать сайты.

### D11. Обновление governance

- `AGENTS.md`: короткий шаг-указатель после шага 8 — «после `QG-SYNTH = APPROVED` загрузи skill `task-finalize` (`.agents/skills/task-finalize/SKILL.md`) и выполни его; без автоисправлений»; формат handoff — пути от корня монорепы; Чеклист Router — один пункт про финализацию по skill; skill в разделе howto/skills; Quality Gate — `QG-ENV` покрывает `site-*`. Пошаговая процедура в `AGENTS.md` не дублируется.
- `agents/quality_gate.md`: `QG-ENV` — сайты через `stackctl`; `QG-SYNTH` — ссылка на конвенцию D5 вместо «рекомендуемой ветки», список изменённых файлов от корня монорепы (вход для `shipctl plan`), `READY-FOR-MANUAL` — не lane QG.
- `WORKFLOW.md`: переписать под актуальный пайплайн (без `docs/plans`, `make review`, `gh pr create`).
- README: `make sync SYNC_FLAGS`, `make ship-test`, `scripts/shipctl`, `scripts/stackctl ready`.

### D12. DSH-first: skill `task-finalize` и approval gates

- **Skill** `.agents/skills/task-finalize/SKILL.md`: frontmatter `name: task-finalize`, `description`, `whenToUse` (после `QG-SYNTH = APPROVED`); самодостаточен (стадии, точные команды, сбор `--paths-file`, интерпретация exit-кодов и стадий, тексты вопросов, шаблоны таблиц, правила остановки, закрытый список команд и запреты, продолжение после конфликта); размер < 8192 символов. DSH подхватывает его автоматически из `.agents/skills`; вне DSH `AGENTS.md` указывает путь к файлу для прямого чтения.
- **Gate «Сливать в main?»** — `ask_user_question`: `header: "Слияние"`, текст вопроса содержит URL из READY и план (repo → ветка → включённые файлы → посторонние, не коммитятся → предупреждения, commit message, «feature-ветки будут запушены»); варианты `«Слить в main»` / `«Не сливать»`. Свободный ответ трактуется как правка плана (`--include`/`--exclude`) → новый `plan` → повтор вопроса.
- **Gate «Релизить?»** — `ask_user_question`: `header: "Релиз"`, текст — репозитории (repo → SHA `main` → ff/noop) и предупреждение «push в `release` запускает CI/CD с деплоем»; варианты `«Релизить»` / `«Не релизить»`; свободный ответ со списком репозиториев → `--repos`.
- **Fallback:** если `ask_user_question` недоступен (Codex/Claude Code), тот же текст и варианты задаются обычным сообщением, Router останавливается до ответа.
- **CI** — фоновая задача (D9). Перенос ролей в DSH presets — change 084, не здесь.

## Access matrix

Неприменимо: change не добавляет и не меняет HTTP endpoint. `method | path | access class | roles | expected without auth | expected with auth` — `N/A`; anonymous/authenticated HTTP-тесты не планируются.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| `SHIP-1` | Backend | A — ship tooling | `scripts/sync.sh`, `Makefile`, `scripts/tests/helpers/fixture.mjs`, `scripts/tests/sync.test.mjs` | — | `node --test scripts/tests/sync.test.mjs`, `bash -n scripts/sync.sh` |
| `SHIP-2` | Backend | A | `scripts/shipctl`, `scripts/ship/{common,git,plan}.mjs`, `scripts/tests/shipctl-plan.test.mjs`, (расширение) `scripts/tests/helpers/fixture.mjs` | `SHIP-1` | `node --test scripts/tests/shipctl-plan.test.mjs` |
| `SHIP-3` | Backend | A | `scripts/ship/merge.mjs`, `scripts/tests/shipctl-merge.test.mjs`, dispatch в `scripts/shipctl` | `SHIP-2` | `node --test scripts/tests/shipctl-merge.test.mjs` (`UT-MERGE-01..04`) |
| `SHIP-4` | Backend | A | `scripts/ship/merge.mjs`, `scripts/tests/shipctl-merge.test.mjs` | `SHIP-3` | `node --test scripts/tests/shipctl-merge.test.mjs` (`UT-MERGE-01..11`) |
| `SHIP-5` | Backend | A | `scripts/ship/release.mjs`, `scripts/tests/shipctl-release.test.mjs`, dispatch в `scripts/shipctl` | `SHIP-4` | `node --test scripts/tests/shipctl-release.test.mjs` |
| `SHIP-6` | Backend | A | `scripts/ship/ci.mjs`, `scripts/tests/helpers/fake-gh.mjs`, `scripts/tests/shipctl-ci.test.mjs`, dispatch в `scripts/shipctl` | `SHIP-5` | `make ship-test` |
| `STACK-1` | Backend | B — stackctl | `scripts/stackctl`, `.agents/skills/stack-control/SKILL.md` | — | `LV-STACK-01..05` |
| `DOC-1` | Planner | C — governance | `AGENTS.md`, `agents/quality_gate.md` | — | `rg`-проверки согласованности, `openspec validate` |
| `DOC-2` | Planner | C | `.agents/skills/task-finalize/SKILL.md` (новый), `WORKFLOW.md`, `README.md` | `SHIP-6`, `STACK-1`, `DOC-1` | `wc -c` skill < 8192, frontmatter, `rg`-проверки, сверка команд с фактическим CLI |
| `SMOKE-1` | Backend | D — verification | — (evidence в `.qa/ship/smoke-083/`) | `SHIP-6`, `STACK-1` | `DRY-01..06` на реальных репозиториях без мутаций |
| `QG-CONTRACTS` | Quality Gate | — | — | `SMOKE-1`, `DOC-2` | `make ship-test`, review diff vs specs, `openspec validate --strict` |
| `QG-SYNTH` | Quality Gate | — | `docs/reports/083-*-review.md` | `QG-CONTRACTS` | один отчёт и вердикт |
| `OPS-READY` | Router (skill `task-finalize`) | — | — | `QG-SYNTH = APPROVED` | `stackctl ready` (ожидаемо «нет runtime-изменений») |
| `OPS-SYNC` / `OPS-ARCHIVE` | Router/OpenSpec | — | `openspec/specs/**`, `openspec/changes/archive/**` | `OPS-READY` | `openspec validate --specs --strict` |
| `OPS-SHIP` | Router (skill `task-finalize`) | — | git-операции корня | `OPS-ARCHIVE` + 2 gates | первый боевой прогон: корень merge + push `main` и feature-ветки; release `not-applicable` |

Неприменимые lanes: `QG-ENV` (нет diff runtime-сервисов; live-проверка `stackctl ready` выполняется в `STACK-1` и сверяется в `QG-CONTRACTS`), `QG-BE` (нет Python diff), `QG-FE-AUTO` и `QG-FE-MANUAL` (нет frontend/UI diff), `QG-LIVE` (нет runtime API diff; проверка на реальных репозиториях — `SMOKE-1`).

### DAG

```text
SHIP-1 → SHIP-2 → SHIP-3 → SHIP-4 → SHIP-5 → SHIP-6 ─┬→ SMOKE-1 ─┐
STACK-1 ─────────────────────────────────────────────┤           ├→ QG-CONTRACTS → QG-SYNTH → OPS-READY → OPS-SYNC → OPS-ARCHIVE → OPS-SHIP
DOC-1 ──────────────────────────────────────────────→└→ DOC-2 ───┘
```

Параллельно с цепочкой `SHIP-*` можно запускать `STACK-1` и `DOC-1` (разные файлы). `SHIP-*` последовательны: общий `scripts/shipctl` и фикстура. `DOC-2` ждёт `SHIP-6`/`STACK-1`, чтобы skill ссылался на фактический CLI.

## Test matrix

Уровни: `UT` — `node --test` на временных репозиториях с bare remote и fake `gh` (без сети); `LV` — live на локальном Docker; `DRY` — реальные репозитории монорепы только в read-only/dry-run (снимки `git status --porcelain`, `git for-each-ref`, HEAD до/после должны совпасть).

### Sync (`SHIP-1`)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где проверяется |
|---|---|---|---|---|---|
| `UT-SYNC-01` | UT | регрессия | без флагов, pull одного клона падает | ошибка выведена, exit 0 (прежнее поведение) | `scripts/tests/sync.test.mjs` |
| `UT-SYNC-02` | UT | ошибки зависимостей | `--strict`, один клон diverged/конфликт с dirty | остальные обработаны, `failed` в report, exit 1 | там же |
| `UT-SYNC-03` | UT | идемпотентность | `--strict` при divergence | merge-коммит не создан (`--ff-only`) | там же |
| `UT-SYNC-04` | UT | happy path | `--strict --include-root --report f` | корень pulled первым, JSON-схема корректна | там же |
| `UT-SYNC-05` | UT | контракт | `make sync SYNC_FLAGS=…` в фикстуре | флаги переданы скрипту | там же |

### Plan / CLI (`SHIP-2`)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где |
|---|---|---|---|---|---|
| `UT-PLAN-01` | UT | happy path / защита foreign | modified, added, deleted, renamed, untracked-в-директории | корректные `included`/`foreign`/`untouched` | `scripts/tests/shipctl-plan.test.mjs` |
| `UT-PLAN-02` | UT | полнота | автопути change (active + archive), main specs, `--task` | включены без явного перечисления | там же |
| `UT-PLAN-03` | UT | валидация входа | `--include`/`--exclude`, несуществующий путь, путь вне репо | `declaredClean`, ошибка валидации exit 3 | там же |
| `UT-PLAN-04` | UT | конвенции / суффикс | `fix-`/`bug-` префикс, `--kind`, дата архива; базовая ветка занята локально в одном репо и `-2` на `origin` в другом | ветка и commit message по D5; выбрано общее `<base>-3`, занятые варианты перечислены | там же |
| `UT-PLAN-05` | UT | предусловия | detached, not_on_main, foreign_staged, main_ahead, MERGE_HEAD | блокеры в плане | там же |
| `UT-PLAN-06` | UT | контракт | fingerprint стабилен/меняется (вкл. имя ветки); aliases; `hasRelease`; owner/repo из ssh/https | значения по D4 | там же |
| `UT-PLAN-07` | UT | CLI-контракт | stdout только JSON, exit 0/2/3, lock занят | контракт D3 | там же |

### Merge (`SHIP-3`, `SHIP-4`)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где |
|---|---|---|---|---|---|
| `UT-MERGE-01` | UT | без мутаций | `--dry-run` | шаги фаз 1/2 выведены, снимки до/после равны | `scripts/tests/shipctl-merge.test.mjs` |
| `UT-MERGE-02` | UT | предусловия | любой блокер в одном из репо | exit 3, ни одно репо не изменено | там же |
| `UT-MERGE-03` | UT | устаревание | изменён included-файл после plan; ветка плана стала занятой | `plan_stale`, exit 3 | там же |
| `UT-MERGE-04` | UT | защита foreign / push ветки | фаза 1 | коммит содержит только included; foreign байт-в-байт; HEAD на `main`; feature-ветка есть в bare | там же |
| `UT-MERGE-05` | UT | happy path | 2 сервиса + корень | `--no-ff` в `main`, push `main` и feature-ветки в bare, корень последним | там же |
| `UT-MERGE-06` | UT | частичный успех / конфликт | конфликт во втором репо | конфликт оставлен (`MERGE_HEAD`, файлы в JSON), `merge --abort` не вызывался, foreign не тронуты, таблица стадий, exit 1, следующие репо не слиты | там же |
| `UT-MERGE-07` | UT | ошибки remote | push `main` или feature-ветки отклонён (hook/non-ff) | exit 1, state `merged`/`switched`, репо на `main`, повторов нет | там же |
| `UT-MERGE-08` | UT | ошибки sync | sync упал в изменённом / в untouched репо | stop до фазы 2 / warning и продолжение | там же |
| `UT-MERGE-09` | UT | идемпотентность | `--resume` после отказа push; рассинхрон state | продолжение с места остановки; `state_mismatch` exit 3 | там же |
| `UT-MERGE-10` | UT | контракт | сообщения commit/merge и trailers | по D5 | там же |
| `UT-MERGE-11` | UT | resume после конфликта | (а) `MERGE_HEAD` ещё есть; (б) пользователь закоммитил разрешение; (в) пользователь отменил merge; (г) merge-коммит содержит foreign-путь | (а) `merge_in_progress` exit 3; (б) повтор sync, push `main`, продолжение остальных, exit 0; (в) `conflict_unresolved` exit 3; (г) `foreign_in_merge` exit 3, push нет | там же |

### Release (`SHIP-5`)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где |
|---|---|---|---|---|---|
| `UT-REL-01` | UT | отбор | pushed + `origin/release`; корень; сервис без release; `--repos` | только они; корень `not-applicable`, `no-release-branch`, `skipped` | `scripts/tests/shipctl-release.test.mjs` |
| `UT-REL-02` | UT | happy path / защита клона | ff push | `origin/release` == SHA `main`; клон на `main`, без локальной `release`, worktree не создавался, foreign не тронуты | там же |
| `UT-REL-03` | UT | идемпотентность | `release` уже == `main` | `noop`, без push | там же |
| `UT-REL-04` | UT | расхождение | во втором репо `release` содержит коммит вне `main` | `release_diverged` в preflight, exit 3, ни одного push (вкл. первое репо), список коммитов в JSON | там же |
| `UT-REL-05` | UT | без мутаций | `--dry-run --repos` без merge-state | план операций (ff/noop/diverged), снимки равны | там же |
| `UT-REL-06` | UT | гонки | `origin/main` ≠ merge-state SHA; push в `release` отклонён после preflight | `main_moved` exit 3 без push; отказ → exit 1, таблица уже зарелиженных, без force | там же |

### CI (`SHIP-6`)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где |
|---|---|---|---|---|---|
| `UT-CI-01` | UT | happy path | `--wait`, все runs `success` | exit 0, таблица URL | `scripts/tests/shipctl-ci.test.mjs` |
| `UT-CI-02` | UT | без автоисправлений | один run `failure` | log-failed сохранён, выдержка, exit 1, fake gh не получал `rerun`/`cancel` | там же |
| `UT-CI-03` | UT | внешние ошибки | run не появился | `no_run`, exit 1 | там же |
| `UT-CI-04` | UT | таймаут | run висит дольше `--timeout` | `timed_out`, run не отменён | там же |
| `UT-CI-05` | UT | окружение | `gh` нет / не авторизован | exit 2 | там же |
| `UT-CI-06` | UT | контракт | `ci --repo --sha` read-only; `noop`-репо не проверяются | итог без state | там же |
| `UT-CI-07` | UT | контракт фонового режима | без `--wait` при `in_progress` | один снимок, `pending`, exit 0, один вызов `gh run list` на репо | там же |

### stackctl (`STACK-1`)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где |
|---|---|---|---|---|---|
| `LV-STACK-01` | LV | без мутаций | `ready --dry-run app frontend site-ad site-ksk-inlove` | план операций, preflight env/port, без lock | `scripts/stackctl` |
| `LV-STACK-02` | LV | happy path | `ready site-ad` | контейнер пересобран, HTTP-проба `<500`, URL `http://localhost:5100` | там же |
| `LV-STACK-03` | LV | граница | `ready` без aliases | `ok:true`, «нет runtime-изменений» | там же |
| `LV-STACK-04` | LV | ошибки | `--dry-run` с `STACKCTL_SITE_ENV_DIR` на пустую директорию | `env_missing`, `ok:false` | там же |
| `LV-STACK-05` | LV | регрессия | `ready app` (rebuild + migrate `be` + health) и `status --json` | существующие aliases работают как прежде | там же |

### Реальные репозитории (`SMOKE-1`)

| ID | Уровень | Сценарий | Ожидание |
|---|---|---|---|
| `DRY-01` | DRY | `shipctl status` | 8 репозиториев, ветки/dirty совпадают с `make services-branches` |
| `DRY-02` | DRY | `shipctl plan --change task-finalization-merge-release-083 --paths-file <union handoff>` | корень: included = файлы change, остальные dirty — foreign; сервисы `untouched`; имя ветки с учётом занятых |
| `DRY-03` | DRY | `shipctl merge --plan … --dry-run` | шаги фаз 1/2 (включая push feature-ветки) и вызов `make sync` перечислены, снимки равны |
| `DRY-04` | DRY | `shipctl release --dry-run --repos backend,frontend --change …` | ff/noop/diverged по текущим remote-tracking refs, без fetch и push, снимки равны |
| `DRY-05` | DRY | `shipctl ci --repo backend --sha <origin/release>` | conclusion существующего run, без мутаций |
| `DRY-06` | DRY | `make ship-test` + `bash -n scripts/sync.sh` + `node --check` модулей | exit 0 |

Трассировка: `UT-SYNC-*` → «Строгий режим make sync»; `UT-PLAN-*` → «Контракт CLI», «Определение изменённого репозитория…», «Именование веток…»; `UT-MERGE-*` → «Порядок MERGE…», «Ручное разрешение конфликта и продолжение», «Защита посторонних изменений»; `UT-REL-*` → «RELEASE fast-forward…»; `UT-CI-*` → «Контроль CI через gh»; `LV-STACK-*` → `repository-process-tooling` «stackctl покрывает публичные сайты…»; `DRY-*` → «Тестирование инструментов без реальных push», «Dry-run не мутирует». Skill `task-finalize` проверяется в `DOC-2.V` (размер, frontmatter, команды) и `QG-CONTRACTS` против `openspec-workflow`. Оси access matrix и PostgreSQL — неприменимо.

## Risks / Trade-offs

- [Handoff не перечислил файл] → файл окажется `foreign` и не будет закоммичен → `declaredClean`/`foreign` показываются на gate; пользователь добавляет его свободным ответом (`--include`).
- [Файл содержит и правки change, и посторонние] → коммитится целиком или не коммитится → выбор пользователя на gate; hunk-level — non-goal.
- [Конфликт оставлен в рабочем дереве с посторонними файлами] → пользователь может случайно закоммитить foreign в merge → `--resume` проверяет `foreign_in_merge` до push.
- [Feature-ветки пушатся всегда] → remote накапливает ветки `feature/*`, `bug/*` → осознанное решение пользователя; суффиксы `-2`, `-3` делают повторные запуски явными.
- [Гонка: кто-то пушит в `main` между sync и push] → push отклонён → stop, state `merged`; `--resume` повторяет строгий sync, ff-only не пройдёт при расхождении → решение пользователя.
- [`release` разойдётся с `main` (ручной hotfix в release)] → `release_diverged`, ни одного push → пользователь выравнивает вручную.
- [Push в `release` = production deploy] → отдельный явный gate с предупреждением; CI-сбой без rerun/rollback, только отчёт.
- [Долгий helm `--wait`] → таймаут 30 мин; ожидание в фоне не блокирует Router; `timed_out` не отменяет run.
- [Порт `site-ksk-inlove` по умолчанию 3000 может быть занят] → preflight `port_busy`, без автоисправления.
- [Router получает операционные полномочия] → закрытый список команд в skill, вся мутирующая логика в протестированном CLI с `flock` и exit 3 без мутаций.

## Migration Plan

1. Реализовать units по DAG; инструменты аддитивны, `make sync` без флагов не меняется.
2. После `QG-SYNTH = APPROVED` — `OPS-READY` → sync/archive → `OPS-SHIP` как первый боевой прогон на этом change (только корень: feature-ветка, merge в `main`, push ветки и `main`; release — `not-applicable`, вопрос «Релизить?» не задаётся).
3. Откат: удалить `scripts/shipctl`, `scripts/ship/`, skill `task-finalize` и шаг-указатель в `AGENTS.md`; `sync.sh`/`stackctl` остаются обратно совместимыми. Выполненные merge/push не откатываются автоматически.

## Open Questions

Блокирующих вопросов нет. Решения пользователя PLAN-2 (push feature-веток, корень `not-applicable` в RELEASE, ff-only `release`, таймауты CI, автосуффикс ветки, конфликт без abort + `--resume`, посторонние файлы чистит пользователь, DSH-first) внесены в D3–D12 и specs.
