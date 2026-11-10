# Design — add-safe-services-autogit

Тикет: `docs/tasks/108_git_auto_commands.md`. Дата: 2026-11-07. Контур: root repository tooling; сервисный код не затрагивается.

## Context

Мотивация — [proposal.md](proposal.md). Исследованы только root Makefile, `scripts/shipctl`, plan/merge/git, схемы и тестовые entrypoints, основной spec `task-shipping-tooling`, `task-finalize`, WORKFLOW, Git-раздел SERVICES. Никаких реальных merge/push/release и тестов runtime не выполнялось. `agents/router.md` намеренно не читался согласно профильному запрету; источник правил финализации — загруженный skill, AGENTS и WORKFLOW. Router сам проверяет свой нормативный раздел перед реализацией.

| Область | Уже есть | Gap / требуемое изменение |
|---|---|---|
| Наблюдение | `make services-branches`, manifest, `shipctl status` | Не дублировать |
| Выбор файлов | plan с paths-file/include/exclude, porcelain `-z`, foreign, declaredClean, ignored Git | Не заменять на add-all; закрыть границы путей и credential selection |
| CLI | `plan --change --summary --kind`; автоматические conventions | Нет точных branch/message overrides и Make-адаптера |
| Dirty | `plan.mjs:checkPreconditions` ставит `dirty_worktree` на любые included/foreign изменения | Устраняет смысл финализации незакоммиченных правок: убрать blanket blocker, оставить реальные unsafe outcomes |
| Формат plan | `repos` — объект, корень `.`; merge нормализует объект в массив, часть путей различает только `root` | Проверить реальный plan→merge→release; канонизировать имя корня, не полагаться на hand-authored тестовые планы |
| Fingerprint | Есть вычисление fingerprint; merge проверяет blobHash только если он присутствует | Обязать selected content hashes, deletion/rename/index state и approval identity, без необязательного fallback |
| Мутации | Двухфазный merge, sync barrier, lock, state, resume, ff release, CI | Сохранить; совместимость и fail-closed preflight перед адаптером |
| Agent UX | `task-finalize` уже предлагает «Слить?» и «Релизить?», branch/commit | Расширить overrides и точную связь gate с планом, не разрабатывать кнопку заново |
| Политика веток | Task, skill, WORKFLOW и ship spec исходят из main | SERVICES требует feature от dev и ручной operator merge: явное решение approval, затем точечное согласование |

Это статические наблюдения, не утверждение PASS существующих tests. Pre-existing diff в task/dsh и других файлах чужой: не включать автоматически ни в реализацию, ни в будущий shipping scope.

## Goals / Non-Goals

**Цели:** один движок финализации, предсказуемый CLI, безопасность dirty trees и нескольких repo, конкретный подтверждаемый план, конечный offline acceptance.

**Не-цели:** второй Git orchestrator; коммит всех dirty файлов без отбора; сохранение посторонних hunks в одном файле отдельно; PR, dev-flow, force push, автоматическое разрешение конфликтов или rollback; создание release веток; изменение CI workflow; новый UI/DSH; обход branch protection; remote smoke/deploy в QG.

HTTP access matrix, anonymous/authenticated tests, PostgreSQL, NATS, live API и browser QA — неприменимы: нет соответствующего diff. Discovery контейнеров не требуется.

## Decisions

### 1. Make — адаптер, не парсер пользовательских флагов

Проверено `make --help`: GNU Make игнорирует `-b` и `-m`; следующие строки становятся отдельными целями, не аргументами рецепта. `--release` также не является пользовательским флагом Make. Нормативный интерфейс:

```sh
# Создать план; никакого commit/push
make services-autogit CHANGE=task-108 BRANCH=feature/seo-improve \
  MESSAGE="Улучшено SEO" PATHS_FILE=.qa/task-108/paths.txt

# После gate «Слить?»; значение PLAN_TOKEN берётся из показанного плана
make services-autogit ACTION=merge PLAN=.qa/ship/task-108/plan.json \
  CONFIRM_PUSH=<PLAN_TOKEN> RELEASE=1

# Только после успешного merge и отдельного gate «Релизить?»
make services-autogit ACTION=release CHANGE=task-108 \
  CONFIRM_RELEASE=<RELEASE_TOKEN>
```

`ACTION=plan` по умолчанию. `RELEASE=0|1` (по умолчанию 0), `PLAN` для merge, `CHANGE` для release; branch/message нужны только при создании плана. Пустые обязательные поля и неизвестные ACTION/флаги отклоняются, exit 3. В stdout адаптера — один JSON, stderr — пояснения. Exit-коды shipctl сохраняются; `release_pending:true` после успешного merge означает успешный merge, а не выполненный release.

`scripts/services-autogit` — Node-entrypoint, получает Make-параметры через окружение без подстановки пользовательских строк в shell-рецепт; дочерний shipctl вызывается argv-массивом. Make export использует raw values, не eval и не shell-интерполяцию; тест обязателен на `$(shell ...)`, обратные кавычки и `$()` как буквальный ввод. В Make CLI для буквального `$` требуется `$$`; help это объясняет. Для сложных строк доступен прямой `shipctl plan --branch ... --message ...` с обычным shell quoting. Не разбирать MESSAGE по пробелам. Запретить NUL/CR/LF, пустое/whitespace-only сообщение, сохранить существующий лимит subject 72 символа; Unicode не резать посередине. Не добавлять raw credentials в argv/evidence.

Альтернатива отдельного shell-скрипта с `git add *` отклонена: дублирует state/lock и теряет safety.

### 2. Overrides дополняют, а не ломают conventions

Новые параметры `shipctl plan --branch` и `--message` имеют приоритет только при явном указании. Без них сохраняются `--kind`/`--summary`, feat/fix и suffix. Точный MESSAGE становится subject; OpenSpec/Task trailers неизменны. Branch проверяется `git check-ref-format --branch` и запретом `main`, `release`, `dev`, ведущего дефиса и управляющих символов. Разрешены `feature/...`, `bug/...`, `bugs/...` и иные безопасные refnames; занятое явное имя в любом included-repo блокирует всё, не получает suffix молча. Неуспех `ls-remote` — недостоверный probe, а не «ветка свободна».

### 3. Inventory, included и секреты

Inventory = корень + ровно клоны services.manifest, не рекурсивный поиск `.git`. Проверить дубликаты, traversal и соответствие реального Git top-level ожидаемой границе; remote origin должен быть доступен и соответствовать записи manifest (эквивалентность SSH/HTTPS нормализуется без вывода credentials). Для корня показывать безопасную identity origin. Чужой nested repo вне inventory не включать. Все inventory repo должны быть на main до мутации, даже если у них нет included. Missing clone/origin/main, dirty merge/rebase/cherry-pick/revert/sequencer, detached или dev — блокер, не auto-repair. Clean included set — noop без feature/commit/push/release. Изменения только foreign — не повод shipping.

`PATHS_FILE` обязателен для Make plan; UTF-8, по одному repo-root-relative literal path на строку, без glob, абсолютных путей, `..` и NUL. Путь с переводом строки требует ручной обработки вне адаптера и блокируется, а пробелы и ведущий дефис поддерживаются. Указанная директория означает ограниченное разворачивание её dirty descendants, не blanket staging; symlink-родители не должны выводить за repo boundary. Файл-symlink stage-ится как ссылка, без чтения target. Git pathspec-ы передаются в literal-режиме с `--`. Селекторы направляются точному repo, а не корню для `services/**`; для корня `.qa/**` и вложенные repo всегда исключены. Rename проверяет обе стороны по реальной семантике `porcelain -z`, удаление учитывается как отсутствие blob. Cross-scope rename блокируется до пользовательского уточнения paths-file.

Ignored не force-add. Credential denylist действует и для tracked, и для untracked: `.env`, `.env.*` кроме явно выбранных `.env.example`/`.env.sample`/`.env.template`, `credentials.json`, `credentials.*.json`, private key `id_rsa`/`id_ed25519`, `*.key`, `*.p12`, `*.pfx`, `.npmrc`/`.netrc`, DSH auth/credential stores. Обнаруженные автоматически под объявленной директорией — исключаются с безопасным warning, явный denied file — блокер. Selected content дополнительно проверяется на PRIVATE KEY headers и неплейсхолдерные TOKEN/PASSWORD/SECRET_KEY/SERVICE_KEY assignments по ограниченному scanner; диагностика — путь и rule ID, не значение/строка. Legacy secret-scan с raw grep не запускать как scanner этого пути. Это defense-in-depth, не обещание универсального secret detection: review included обязателен.

Staged included допустимы, но коммитится файл целиком из текущего дерева (пользователь видит предупреждение о whole-file); partial staging не сохраняется для included. Foreign staged блокируют. Foreign unstaged допускаются только если Git switch/merge/sync их не перезаписывает; автоматический stash/reset/clean запрещён. Existing strict sync barrier сохраняется: он может ff-обновить clean клоны вне included — это раскрывается в merge gate; он не должен коммитить или пушить их. При unsafe dirty blocker остановить до опасной операции, foreign content/index сверять тестами.

### 4. Канонический plan и preflight

Канонический persisted `repos` остаётся object, корень `.`. На границах исполнения legacy `root` нормализуется к `.`, конфликт двух обозначений блокируется. Схемы plan/state и consumers используют одну identity. Новые планы имеют version и обязательные content hashes; старый план без полного safety material отвергается как `plan_stale` с предложением replan, не достраивается после approval.

PLAN_TOKEN — digest канонического плана: inventory identities, origin (без credentials), branch, commit subject/trailers, selected paths/status/blob/index hashes, HEAD и exclusions. `RELEASE` не входит в PLAN_TOKEN: это немутирующее намерение, не разрешение на release, и оно может быть добавлено при merge. Это защита от случайно устаревшего согласования, не authentication boundary. Изменения foreign/staged и inventory также перепроверяются. План хранится в существующей `.qa/ship/<change>/`; test evidence этого change — только `.qa/add-safe-services-autogit/`. Preflight под общим shipctl flock заново проверяет inventory, branches, состояние, hashes, refs, занятую ветку, foreign staged, main_ahead/diverged/missing refs и выбранный remote. Неизменившийся dirty included допустим. До первой локальной мутации глобальная проверка проходит во всех repo; ошибка сети/прав probe — fail closed. Доступность probe не гарантирует будущий push: server-side protection/race остаётся runtime failure.

Не превращать read-only plan/dry-run в fetch/sync: разрешены read probes, не изменение refs/index/HEAD; получение актуальных remote SHA — `ls-remote`. Existing merge sync barrier после feature push сохраняется по основному spec. Error 3 означает отсутствие новых task-мутаций в данном запуске, не откат предыдущих стадий.

### 5. Два явных remote gates

Make не рисует UI и не спрашивает пароль/подтверждение сам. Default plan возвращает безопасный preview и PLAN_TOKEN. Router показывает repo/origin, included/foreign/ignored-denied counts, branch, полный subject/trailers, whole-file scope, strict sync и предупреждение «feature и main будут отправлены в origin». Пользователь может исправить ветку, MESSAGE или scope: Router создаёт новый план и спрашивает снова. `CONFIRM_PUSH` — только перенос уже данного пользователем approval конкретного плана, не автоматическое `yes`. Адаптер передаёт его в `shipctl merge --plan <path> --plan-token <PLAN_TOKEN>`; core под existing flock сверяет ожидаемый token с digest того же прочитанного/валидированного in-memory плана до любых Git mutations. Расхождение даёт exit 3 `plan_approval_mismatch`, malformed/повторный token — exit 3 `invalid_plan_token`; token с `--resume` запрещён. Прямой исторический CLI без `--plan-token` сохраняет explicit operator workflow; token-bound callers обязаны передавать token, в том числе при dry-run. Resume по durable state и отдельный release gate не меняются.

`RELEASE=1` не включает release в merge: после успеха адаптер возвращает `release_pending` и read-only release preview с repo/main SHA, ff/noop, root not-applicable, no-release. RELEASE_TOKEN связан с этим preview и merge-state; preview строится через расширение existing `shipctl release --dry-run`, без fetch/refs mutation. Выбор repo передаётся `REPOS=a,b` в release, token покрывает subset. При отличии subset/SHA/origin/remote release от preview требуется новое подтверждение. Новый gate явно предупреждает «push release запускает workflow и возможный deploy». Вызов release без token — preview и остановка без push. `RELEASE=0` не запрещает поздний отдельно подтверждённый release. Все pushed обязательны; partial/failed merge не получает release token. Отказ пользователя — безопасная остановка, не rollback.

Router использует существующую кнопку ask_user_question, а при её отсутствии текстовый вопрос и прекращение исполнения до ответа. Approval change, QG APPROVED, согласие на merge и согласие на deploy — разные разрешения. Никакой доработки DSH для «одной кнопки» в scope нет.

### 6. Частичные сбои

Сохраняется existing двухфазный алгоритм, порядок manifest→root, state и fail-stop. Никакой межрепозиторной транзакции не обещается. Обёртка возвращает pushed/merged/failed/untouched и existing resume guidance, не повторяет команды, не откатывает refs. `merge --resume` — отдельное осознанное действие с проверкой state, не повтор `ACTION=merge` с прежним планом. Для release failure показать уже опубликованные repo; никаких повторных deploy или force. Рабочие клоны после успешного пути остаются main: release использует refspec без checkout release; generic cleanup-switch после конфликта запрещён.

## Execution units

Реализация root scripts/tooling принадлежит Backend; Router координирует и не пишет код/тесты. Planner меняет только текущий change. Все units последовательны: общий tightly-coupled tooling ownership не делится между профилями. Каждый unit — один slice, 5–8 существенных действий с тестами и handoff, без checkpoint-only запуска.

### Deliverables

| Deliverable | Владелец | Ownership и closure |
|---|---|---|
| A — движок и адаптер | Backend (scripts/tooling) | `scripts/shipctl`, `scripts/ship/**`, `scripts/services-autogit`, `Makefile`, `scripts/tests/shipctl-*.test.mjs`, новый `scripts/tests/services-autogit.test.mjs`, `scripts/tests/helpers/**` только shipping fixtures; shared helpers правятся последовательно |
| B — документация финализации | Backend (scripts/tooling) | `README.md`, `WORKFLOW.md`, только Git-workflow раздел `SERVICES.md`, `.agents/skills/task-finalize/SKILL.md`, связанные проверки shipping в `scripts/tests/pipeline-policy.test.mjs`; Router проверяет собственные правила без передачи Planner содержимого |
| C — независимая приёмка | Quality Gate | `.qa/add-safe-services-autogit/QG/**`, единственный итоговый `docs/reports/add-safe-services-autogit.md` создаётся только QG после реализации |

Основной spec `openspec/specs/task-shipping-tooling/spec.md` не входит в apply ownership: им занимается Router на sync после QG. Каждый исполнитель отмечает только свои task IDs текущего change; это единственное общее метаданное, units выполняются последовательно.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| OPS-1 | Backend | A | plan/git/common, plan schema, shipping fixtures и plan tests | approval | targeted plan scenarios AG-03..08, AG-10 |
| OPS-2 | Backend | A | merge/release/status/ci consumers, state schemas, entrypoint, merge/release tests и общие A paths при необходимости | OPS-1 | targeted сквозные AG-05/06/10..12 и release preview |
| OPS-3 | Backend | A | Makefile, adapter, adapter tests и A wiring | OPS-2 | AG-01/02/09 и полный `make ship-test` — финальная граница tooling |
| OPS-4 | Backend | B | Только B paths | OPS-3 | targeted pipeline-policy + static command/link review |
| QG | Quality Gate | C | report/evidence; реализационные файлы read-only | OPS-4 | QG-LITE: независимо `make ship-test`, policy/static/OpenSpec, один отчёт |

DAG: `approval → OPS-1 → OPS-2 → OPS-3 → OPS-4 → QG → sync → strict validate → archive → final plan → gate merge → gate release`. Sync/archive выполняет Router после QG, не отдельный execution unit/checkpoint. Runtime LIVE/ENV, FE-AUTO/MANUAL, messaging и migrations неприменимы; QG — один агент. Блокер сверх бюджета → atomic partial и bounded split, не героическое завершение.

## Test matrix

Все сценарии определены в [delta spec](specs/task-shipping-tooling/spec.md). Статус на planning: planned, прогоны не заявлены. Параметры evidence: revision/codeFingerprint, environmentFingerprint (Node/Git/Make versions без secrets), options и ledger по verification-policy.

Общие prerequisites P: Node, Git, GNU Make, flock и checkout shipping tests; разрешены только owned `.qa/add-safe-services-autogit/<unit>/` fixtures и локальные bare remotes без сети; fake gh/make для побочных эффектов. Isolation I: уникальные repo/bare fixtures, remote path проверяется до первого push; запрет SSH/HTTP/git://, process env не наследует production credentials/hooks; реальный `SHIPCTL_ROOT` никогда не используется для mutating tests. Permission T: apply разрешает код, offline test mutation только своих fixtures, не remote deploy/PG/NATS. Budget B: один targeted suite до 120 с на unit, полный suite до 300 с на финальной границе/QG. Stop S: nonlocal remote, неясный target, missing deps, timeout или неожиданный production command → остановка; missing prerequisite = blocked, не PASS. Cleanup только своих проверенных абсолютных fixture paths, никаких /tmp или global cleanup.

| riskId | scenarioId | unit | testPath/command | evidenceOwner | prerequisites | isolation | permission | budget | stopCondition | status |
|---|---|---|---|---|---|---|---|---|---|---|
| R-CLI | AG-01, AG-02 | OPS-3 | `node --test scripts/tests/services-autogit.test.mjs` | OPS-3; независимо QG | P | I | T | B | S | planned |
| R-OVERRIDE | AG-03, AG-04 | OPS-1 | `node --test scripts/tests/shipctl-plan.test.mjs` | OPS-1; независимо QG | P | I | T | B | S | planned |
| R-INVENTORY | AG-05 | OPS-1, OPS-2 | plan + merge tests: missing/dev/detached/no-origin/rebase и failed probe | OPS-2; независимо QG | P | I | T | B | S | planned |
| R-DIRTY | AG-06 | OPS-1, OPS-2 | plan + merge tests: included dirty, foreign staged, foreign hash/index до/после | OPS-2; независимо QG | P | I | T | B | S | planned |
| R-SECRET | AG-07 | OPS-1 | plan tests: hidden/ignored/denylist/content scan без raw secret в JSON/stderr | OPS-1; независимо QG | P | I | T | B | S | planned |
| R-PATH | AG-08 | OPS-1 | plan tests: literal paths, rename/delete, traversal, symlink, nested repo | OPS-1; независимо QG | P | I | T | B | S | planned |
| R-GATE | AG-09 | OPS-3, OPS-4 | adapter tests + static skill review: gate отказ/нет канала/release intent не deploy | OPS-3; независимо QG | P | I | T | B | S | planned |
| R-STALE | AG-10 | OPS-1, OPS-2 | plan/merge tests: content/index/HEAD/origin/inventory/token changes, zero mutation | OPS-2; независимо QG | P | I | T | B | S | planned |
| R-COMPAT | AG-11 | OPS-2 | merge tests: вызов настоящего plan→merge→release preview, root+2 services, canonical schemas | OPS-2; независимо QG | P | I | T | B | S | planned |
| R-PARTIAL | AG-12 | OPS-2 | merge/release tests: local rejecting hook, conflict, durable state, explicit resume, no auto-release | OPS-2; независимо QG | P | I | T | B | S | planned |
| R-REGRESSION | существующие plan/merge/release/ci/sync и AG-01..12 | OPS-3, QG | `make ship-test` без alias-повтора | OPS-3; независимо QG — единственный QG evidence owner | P | I | T | 300 с | S | planned |
| R-POLICY | AG-01, AG-09 и ссылки/branch-policy | OPS-4, QG | `node --test scripts/tests/pipeline-policy.test.mjs`; OpenSpec strict и `git diff --check -- <owned paths>` | OPS-4; независимо QG | P | I | T | B | S | planned |

Существующие tests/helpers перед запуском перенаправить с временных system dirs на owned `.qa` и local-remotes allowlist, если они этого ещё не обеспечивают; это closure A, не отдельная infra task. При pre-existing FAIL — точный reproducer, записать baseline и исправлять только необходимое shipping closure. Formatter — существующий repo canonical tool, если настроен для этих paths; при отсутствии не изобретать новый форматтер, использовать `node --check` изменённых JS и diff whitespace check.

## Risks / Trade-offs

- [Main против dev] → выбран task/ship main-контракт, approval должно явно принять это решение; при выборе dev план пересматривается до apply, не создаётся универсальный multi-base workflow.
- [Все клоны main строже old changed-only preflight] → сознательно соответствует запросу; untouched dev clone блокирует удобство, не переключается автоматически.
- [Dirty и secrets] → whole-file preview, denylist/content scan, no force-add; detection не заменяет review и не гарантирует выявление любого секрета.
- [Multi-repo не атомарно] → global preflight только уменьшает риск, state и fail-stop сохраняют наблюдаемый partial result; push может инициировать workflows даже на main/feature — gate предупреждает о remote consequences.
- [Existing tests могут быть красными] → не объявлять весь shipctl рабочим по наличию кода; OPS-1/2 закрывают только непосредственно необходимый end-to-end closure, иной blast radius возвращается Router для split.
- [Make escaping] → корректные переменные, raw export, argv и adversarial tests; не обещать поддержку `make -b/-m` и не использовать eval.

## Migration Plan

После пользовательского approval выполнить units последовательно, QG-LITE и review требований. Старый прямой CLI без overrides сохраняется, старый план с неполной safety metadata требует replan. Согласовать Git-раздел SERVICES и skill в том же change. После успешного QG Router синхронизирует specs, делает strict validation, архивирует change штатным workflow и формирует новый shipping plan. Ни apply, ни archive не означают согласия на push/deploy. Откат tooling — отдельная правка/коммит оператора, не автоматический reset refs или деплоя.

## Решения для пользовательского approval

Предлагаемые безопасные defaults: (1) main, не dev, с явным исправлением конфликта документации; (2) точные branch/message overrides и обязательный PATHS_FILE вместо всех dirty; (3) два gate, RELEASE=1 только намерение; (4) корень включён в merge, но исключён из release; (5) все manifest-клоны должны существовать и быть main. Это завершённый контракт, а не отложенные проектные неизвестные. До approval реализация запрещена; несогласие с default требует правки change. Открытых технических блокеров после принятия defaults нет. Единственная внешняя проверка — Router подтверждает согласованность собственных закрытых для Planner правил перед apply.
