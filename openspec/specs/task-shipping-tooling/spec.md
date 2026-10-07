# Purpose

Инструментальная поддержка life cycle задачи после `QG-SYNTH = APPROVED`: готовность runtime к ручной проверке, пофайловое слияние в `main` с защитой посторонних изменений, fast-forward релиз в `release` и контроль CI/CD через `scripts/shipctl` и `scripts/stackctl ready`.

## Requirements

### Requirement: Контракт CLI shipctl
Репозиторий SHALL предоставлять `scripts/shipctl` с подкомандами `status`, `plan`, `merge` (включая `--resume`), `release`, `ci` (включая `--wait`). stdout MUST содержать только JSON-объект `{ "ok": true|false, ... }`, прогресс и человекочитаемые таблицы SHALL идти в stderr. Exit-коды SHALL быть фиксированы: `0` — успех; `1` — операция остановлена (конфликт, отказ push, сбой sync, неуспешный CI); `2` — недоступно окружение (нет `git`/`gh`/`flock`, `gh` не авторизован, lock занят); `3` — нарушено предусловие или устарел план, при этом ни один репозиторий не изменён в этом запуске. Код MUST NOT содержать `stash`, `reset`, `checkout --`, `restore`, `clean`, `rebase`, `merge --abort`, `worktree` и push с `--force*` или `+refspec`. Мутирующие подкоманды (`merge`, `release`) MUST выполняться под системным `flock`; `status`, `plan`, `ci` и любой `--dry-run` MUST NOT менять refs, индекс, рабочие деревья и удалённые репозитории. Состояние SHALL сохраняться в `.qa/ship/<change>/` (`plan.json`, `merge-state.json`, `sync.json`, `release-state.json`, `ci.json`, `ci/*.log`).

#### Scenario: Параллельный запуск мутирующих команд
- **WHEN** `shipctl merge` выполняется, а второй процесс запускает `shipctl release`
- **THEN** второй процесс завершается exit `2` с `ok:false` и сообщением о занятом lock, не трогая репозитории

#### Scenario: Dry-run не мутирует
- **WHEN** `shipctl merge --plan <file> --dry-run` выполняется на реальных репозиториях
- **THEN** вывод содержит пошаговый список git-операций по каждому репозиторию, а `git status --porcelain`, `git for-each-ref` и HEAD всех репозиториев совпадают до и после запуска

### Requirement: Определение изменённого репозитория и пофайловый план
`shipctl plan --change <name>` SHALL рассматривать корень монорепы и каждый клон из `services.manifest`. Объявленные пути change SHALL собираться из: путей, переданных Router через `--paths-file`/`--include` (объединение «Изменённые файлы» из handoff всех units и отчёта `QG-SYNTH`, пути от корня монорепы); автоматически — директории change (`openspec/changes/<change>/` и `openspec/changes/archive/*-<change>/`), main specs capability из `specs/` change и `--task` файла. Каждая dirty-запись `git status --porcelain=v1 -z --untracked-files=all` SHALL классифицироваться как `included` (совпадает с объявленным файлом или лежит под объявленной директорией и не исключена `--exclude`) или `foreign`. Репозиторий SHALL считаться изменённым только при наличии хотя бы одного `included` файла. План MUST содержать по каждому репозиторию: ветку, HEAD, текущую ветку, `included`, `foreign`, объявленные, но чистые пути (`declaredClean`), runtime aliases, наличие `origin/release`, блокеры предусловий, выбранное имя ветки и общий fingerprint (HEAD + имя ветки + список included + blob-хэши их содержимого).

#### Scenario: Посторонние dirty-файлы в репозитории
- **WHEN** в `services/backend` 16 dirty-файлов, из которых 3 объявлены change
- **THEN** план показывает 3 `included` и 13 `foreign`, и только 3 файла попадут в коммит

#### Scenario: Репозиторий без файлов change
- **WHEN** в клоне есть только `foreign` dirty-файлы
- **THEN** репозиторий помечается `untouched` и не участвует в `MERGE`

#### Scenario: План устарел после подтверждения
- **WHEN** между подтверждением плана и `shipctl merge` изменилось содержимое included-файла, HEAD репозитория или ветка плана стала занятой
- **THEN** `merge` завершается exit `3` с `plan_stale` до любой мутации

#### Scenario: Объявленный путь не изменён
- **WHEN** handoff перечисляет путь, которого нет среди dirty-записей
- **THEN** путь попадает в `declaredClean` как предупреждение для пользователя, а не в коммит

### Requirement: Защита посторонних изменений
`shipctl` MUST NOT коммитить, stage'ить, stash'ить, сбрасывать (`reset`, `checkout --`, `restore`, `clean`) или иначе изменять `foreign` файлы; это страховка, очистку посторонних файлов выполняет пользователь. Коммит SHALL включать только `included` пути целиком (выбор hunk'ов вне scope). Если в индексе есть staged-записи вне `included` или `git switch`/`git merge` требует перезаписать локальные изменения, `shipctl` MUST остановиться без автоисправления. Файл, содержащий одновременно правки change и посторонние правки, классифицируется целиком; решение о его включении принимает пользователь при подтверждении плана.

#### Scenario: Переключение на main с посторонними изменениями
- **WHEN** после коммита included-файлов в `feature/<change>` выполняется `git switch main`
- **THEN** все `foreign` файлы остаются в рабочем дереве с тем же содержимым, что до запуска

#### Scenario: Staged посторонний файл
- **WHEN** в индексе репозитория уже staged файл, не входящий в `included`
- **THEN** preflight завершает `merge` exit `3` с блокером `foreign_staged` до любой мутации

### Requirement: Именование веток и commit convention
Тип ветки SHALL определяться флагом `--kind feature|bug`; без флага change с префиксом `fix-` или `bug-` SHALL получать `bug`, остальные — `feature`. Ветка SHALL называться `feature/<change>` или `bug/<change>`, где `<change>` — имя change без даты архива. Коммит изменений SHALL иметь заголовок `feat(<change>): <summary>` или `fix(<change>): <summary>` (summary передаёт Router через `--summary`, до 72 символов) и trailers `OpenSpec: <change>` и `Task: <docs/tasks/...>` при наличии. Merge-коммит в `main` SHALL иметь сообщение `Merge branch '<branch>' into main` с trailer `OpenSpec: <change>`; в `release` merge-коммиты MUST NOT создаваться. Если базовое имя занято (ветка существует локально или на `origin`, проверка через `ls-remote`) хотя бы в одном изменённом репозитории, `plan` SHALL выбрать первое из `<base>-2`, `<base>-3`, …, свободное во всех изменённых репозиториях, и использовать одно имя для всех; выбранное имя и пропущенные занятые варианты SHALL отражаться в плане.

#### Scenario: Багфикс change
- **WHEN** change называется `fix-074-user-management-tenant-isolation` и `--kind` не передан
- **THEN** ветка `bug/fix-074-user-management-tenant-isolation`, коммит `fix(fix-074-user-management-tenant-isolation): …`

#### Scenario: Ветка уже существует
- **WHEN** в `services/frontend` уже есть локальная ветка `feature/<change>`, а на `origin` корня — `feature/<change>-2`
- **THEN** план для всех изменённых репозиториев использует `feature/<change>-3` и перечисляет занятые имена

### Requirement: Порядок MERGE и остановка при сбое
`shipctl merge --plan <file>` SHALL сначала выполнить preflight всех изменённых репозиториев (fingerprint и свободное имя ветки, текущая ветка `main`, не detached HEAD, нет незавершённого merge/rebase, нет `foreign_staged`, локальный `main` не опережает `origin/main`) и только при отсутствии блокеров перейти к мутациям. Фаза 1 по каждому изменённому репозиторию (сервисы в порядке manifest, корень последним): `git switch -c <branch>` от текущего HEAD → `git add -A -- <included>` → `git commit` → `git switch main` → `git push origin <branch>`. Feature-ветка MUST пушиться всегда, в каждом изменённом репозитории, включая корень. Барьер: однократный `make sync SYNC_FLAGS="--strict --include-root --report .qa/ship/<change>/sync.json"`; сбой sync в изменённом репозитории MUST останавливать merge, сбой в неизменённом SHALL фиксироваться как предупреждение. Фаза 2 по каждому изменённому репозиторию: `git merge --no-ff <branch>` → `git push origin main`. При любом сбое `shipctl` MUST остановиться немедленно, без повторов и обходных действий. `merge-state.json` и JSON-итог SHALL отражать стадию каждого репозитория (`planned`, `committed`, `switched`, `branch-pushed`, `synced`, `conflict`, `merged`, `pushed`, `failed`, `untouched`) с SHA и ошибкой.

#### Scenario: Успешный merge нескольких репозиториев
- **WHEN** план содержит `backend`, `frontend` и корень, preflight чист, sync и merge без конфликтов
- **THEN** в каждом репозитории `main` содержит merge-коммит `--no-ff` с коммитом change, `origin/main` совпадает с локальным `main`, feature-ветка присутствует на `origin`, `foreign` файлы не изменены

#### Scenario: Detached HEAD или не main
- **WHEN** в изменённом клоне HEAD detached или текущая ветка не `main`
- **THEN** preflight завершает exit `3` с блокером `detached_head` или `not_on_main` без мутаций во всех репозиториях

#### Scenario: Отказ push
- **WHEN** `git push origin main` или `git push origin <branch>` отклонён (non-fast-forward или права)
- **THEN** shipctl останавливается exit `1`, репозиторий остаётся на `main`, локальные коммиты сохраняются, state отражает последнюю успешную стадию, повторного push и rebase нет

### Requirement: Ручное разрешение конфликта и продолжение
При конфликте `git merge --no-ff <branch>` в фазе 2 `shipctl` MUST NOT выполнять `git merge --abort` или иное разрешение: конфликт SHALL оставаться в рабочем дереве для ручного разбора, репозиторий SHALL получать стадию `conflict` со списком конфликтующих файлов, следующие репозитории MUST NOT обрабатываться, exit `1`. JSON-итог SHALL перечислять уже слитые и запушенные репозитории, репозиторий с конфликтом и его файлы, ещё не обработанные репозитории и команду продолжения. `shipctl merge --resume --change <name>` SHALL: для репозитория в стадии `conflict` — завершаться exit `3` с `merge_in_progress`, если `MERGE_HEAD` ещё существует; с `conflict_unresolved`, если tip feature-ветки не является предком `HEAD`; с `foreign_in_merge`, если первый родитель `HEAD` не совпадает с записанным pre-merge `main` или файлы `git diff --name-only HEAD^1 HEAD` выходят за `included` репозитория; иначе принять merge-коммит пользователя как стадию `merged`. Для остальных репозиториев фактическая ветка и SHA MUST совпадать с записанными, иначе exit `3` `state_mismatch`. Затем `--resume` SHALL повторить барьер строгого `make sync`, выполнить `git push origin main` для `merged` и продолжить фазу 2 для оставшихся репозиториев.

#### Scenario: Конфликт во втором репозитории
- **WHEN** `backend` уже слит и запушен, а merge во `frontend` даёт конфликт
- **THEN** во `frontend` остаётся незавершённый merge с маркерами конфликтов, итог показывает `backend: pushed`, `frontend: conflict (файлы …)`, корень `synced`, exit `1`, `merge --abort` не вызывался, push `main` во `frontend` и корне не выполнялся

#### Scenario: Продолжение после ручного разрешения
- **WHEN** пользователь разрешил конфликт во `frontend`, закоммитил merge и запустил `shipctl merge --resume --change <name>`
- **THEN** shipctl повторяет строгий sync, пушит `main` во `frontend`, сливает и пушит корень и завершается exit `0`

#### Scenario: Разрешение не завершено
- **WHEN** `--resume` запускается, пока во `frontend` существует `MERGE_HEAD`
- **THEN** shipctl завершается exit `3` с `merge_in_progress` без мутаций

#### Scenario: В merge-коммит попал посторонний файл
- **WHEN** пользователь закоммитил разрешение вместе с `foreign` файлом
- **THEN** `--resume` завершается exit `3` с `foreign_in_merge`, push не выполняется

### Requirement: Строгий режим make sync
`scripts/sync.sh` SHALL сохранять текущее поведение по умолчанию и SHALL поддерживать флаги `--strict` (pull через `git pull --ff-only`, накопление ошибок и exit `1` при любом сбое вместо проглатывания), `--include-root` (сначала `git pull --ff-only` корня по текущей ветке) и `--report <file>` (JSON-итог по каждому репозиторию: имя, ветка, результат `updated|fetched|cloned|failed`, ошибка). `make sync` SHALL передавать скрипту переменную `SYNC_FLAGS`.

#### Scenario: Pull одного клона упал
- **WHEN** `make sync SYNC_FLAGS="--strict --report r.json"` выполняется и pull клона завершается ошибкой (dirty-конфликт или divergence)
- **THEN** скрипт обрабатывает остальные клоны, пишет `failed` с текстом ошибки в `r.json` и завершается exit `1`

#### Scenario: Ручной запуск без флагов
- **WHEN** инженер запускает `make sync`
- **THEN** поведение совпадает с прежним: ошибки выводятся, но exit `0`

### Requirement: RELEASE fast-forward main в release
`shipctl release --change <name>` SHALL обрабатывать только репозитории со стадией `pushed` в `merge-state.json` и существующей `origin/release`, с опциональным сужением `--repos`. Корень монорепы SHALL получать статус `not-applicable` (релизить нечего), сервис без `origin/release` — `no-release-branch`, исключённый пользователем — `skipped`. В ветке `release` MUST NOT создаваться коммиты: `release` SHALL указывать на тот же коммит, что `main`. Preflight всех выбранных репозиториев SHALL выполняться до любого push: `git fetch origin main release`; `sha := origin/main`; `sha` ≠ записанного в `merge-state.json` SHA `main` → блокер `main_moved`; `origin/release == sha` → `noop`; `git merge-base --is-ancestor origin/release sha` → готов к fast-forward; иначе → блокер `release_diverged` со списком коммитов, отсутствующих в `main`. Любой блокер MUST завершать команду exit `3` без единого push. Затем по каждому готовому репозиторию SHALL выполняться `git push origin <sha>:refs/heads/release` без force с записью `owner/repo` (из URL `origin`), SHA и статуса в `release-state.json`. Отказ push SHALL немедленно останавливать команду exit `1` с таблицей уже зарелиженных репозиториев. Рабочие клоны MUST оставаться на `main`, их рабочие деревья MUST NOT затрагиваться, временные worktree и локальная ветка `release` MUST NOT создаваться.

#### Scenario: Релиз двух сервисов
- **WHEN** `backend` и `frontend` слиты в этой задаче, `origin/release` у обоих — предок нового `main`
- **THEN** `origin/release` каждого указывает на SHA `main`, клоны остаются на `main` без изменений рабочих деревьев, `release-state.json` содержит SHA и `owner/repo`

#### Scenario: Корень монорепы
- **WHEN** корень слит в этой задаче
- **THEN** он отражается как `not-applicable` и не участвует в релизе и контроле CI

#### Scenario: release разошёлся с main
- **WHEN** в `origin/release` одного из выбранных сервисов есть коммит, отсутствующий в `main`
- **THEN** команда завершается exit `3` с `release_diverged` и списком таких коммитов, ни в один репозиторий push не выполняется, автоисправлений нет

#### Scenario: release уже совпадает с main
- **WHEN** `origin/release` уже равен SHA `main`
- **THEN** репозиторий получает статус `noop` без push и без контроля CI

### Requirement: Контроль CI через gh
`shipctl ci --change <name>` SHALL для каждой записи `release-state.json` со статусом push (кроме `noop`) опрашивать `gh run list --repo <owner/repo> --branch release --commit <sha> --json databaseId,status,conclusion,url,workflowName,event`. Без `--wait` команда SHALL выполнять один снимок (статус `pending` допустим, exit `0` при успешном запросе). С `--wait` команда SHALL ждать терминального статуса всех runs этого коммита с общим таймаутом (`--timeout`, по умолчанию 1800 с), таймаутом появления run (`--appear-timeout`, по умолчанию 180 с) и интервалом (`--interval`, по умолчанию 20 с). Итог SHALL содержать таблицу repo → run URL → workflow → conclusion и итоговый статус `success|failure|cancelled|timed_out|no_run`, сохраняемую также в `ci.json`. Для неуспешных runs SHALL сохраняться `gh run view <id> --log-failed` в `.qa/ship/<change>/ci/<repo>-<id>.log` и выдержка последних строк в JSON. `shipctl` MUST NOT выполнять `gh run rerun`, `cancel`, revert или любые правки; с `--wait` exit `0` только когда все runs `success`, иначе `1`.

#### Scenario: Один CI упал
- **WHEN** run `frontend` завершился `failure`, а `backend` — `success`
- **THEN** `ci --wait` возвращает exit `1`, таблицу с обоими URL и conclusion и выдержку `--log-failed` для `frontend`, без rerun

#### Scenario: Run не появился
- **WHEN** за `--appear-timeout` по SHA релиза на ветке `release` не найден ни один run
- **THEN** статус репозитория `no_run`, итог exit `1`

#### Scenario: Таймаут
- **WHEN** run остаётся `in_progress` дольше `--timeout`
- **THEN** статус `timed_out` с URL run, ожидание прекращается, run не отменяется

#### Scenario: Снимок без ожидания
- **WHEN** `ci --change <name>` запускается без `--wait`, пока run `in_progress`
- **THEN** команда один раз опрашивает `gh`, возвращает статус `pending` и exit `0`

### Requirement: Тестирование инструментов без реальных push
Поведение `shipctl` и строгого `sync.sh` SHALL покрываться автоматическими тестами `node --test` на временных git-репозиториях с локальными bare remote и fake `gh` (через переменные окружения `SHIPCTL_ROOT`, `SHIPCTL_GH_BIN`). Тесты MUST NOT обращаться к сети и MUST падать, если обнаруживают remote, не являющийся локальным путём. Корневой `make ship-test` SHALL запускать весь набор. Проверка на реальных репозиториях монорепы SHALL выполняться только в режимах `status`, `plan`, `--dry-run` и read-only `ci`.

#### Scenario: Прогон тестов
- **WHEN** инженер выполняет `make ship-test`
- **THEN** выполняются сценарии plan/merge/release/ci/sync на временных репозиториях, ни один реальный remote не изменён, exit `0`
