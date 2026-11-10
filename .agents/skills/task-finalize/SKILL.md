---
name: task-finalize
description: Финализация задачи после QG-SYNTH APPROVED — от stackctl ready до merge/release
whenToUse: После QG-SYNTH = APPROVED для ready, sync/archive и отдельно подтверждённых merge/release
---

# Task Finalization

Процедура выполняется **строго Router** после `QG-SYNTH = APPROVED` по стадиям ниже.
Никаких автоисправлений: при сбое — отчёт и остановка. Допустим явно согласованный `APPROVED_WITH_WAIVER`. Backend пишет код/тесты; Router координирует. Approval change, QG, согласие на push и согласие на deploy — разные разрешения. Реальный shipping в apply/QG запрещён.

## Стадии

```text
QG-SYNTH = APPROVED
  → OPS-READY       (stackctl ready → отчёт URL)
  → OPS-SYNC        (openspec sync)
  → OPS-ARCHIVE     (openspec archive)
  → OPS-PLAN        (shipctl plan финальный)
  → Gate «Слить?»   (ask_user_question / текст)
  → OPS-MERGE       (shipctl merge; конфликт → ручное разрешение → merge --resume)
  → Gate «Релиз?»   (только при успехе merge и наличии release-репозиториев)
  → OPS-RELEASE     (shipctl release)
  → OPS-CI          (shipctl ci --wait фоном)
  → Итоговый отчёт
```

---

## OPS-READY — проверка runtime

Выполняется **до** sync/archive. Собери union путей из handoff units, сохрани в `paths.txt`.

```bash
scripts/shipctl plan --change <id> --summary "<text>" --paths-file paths.txt
```

Exit: `0` — ok, `2` — окружение, `3` — блокеры (`detached_head`, `not_on_main`, `foreign_staged`, `main_ahead`, `MERGE_HEAD`, `dirty_worktree`). При `3` — останови.

План содержит `included`/`foreign`/`declaredClean`/`runtimeAliases`. Если `runtimeAliases` пуст — пропусти ready.

```bash
scripts/stackctl ready <alias...>
```

**≤2 repair-попытки** при infrastructure failure. Startup crash из кода → findings владельцу. URLs из JSON покажи пользователю.

---

## OPS-SYNC, OPS-ARCHIVE

Используй `.claude/skills/openspec-sync-specs` и `.claude/skills/openspec-archive-change`.

До archive выполни `openspec validate <change> --type change --strict`. После archive проверяй archived artifacts штатным workflow, не ссылайся на уже отсутствующий active change. Sync/archive не разрешают push/deploy.

---

## OPS-PLAN — финальный план

**После archive Router предлагает точные BRANCH и MESSAGE**, принимает правки пользователя и обновляет PATHS_FILE union-путями handoff, sync/archive. Чужой pre-existing diff не включать. Примеры — шаблоны для fake-root/local-only проверки, не разрешение shipping в рабочем checkout. Строки `PLAN_TOKEN`/`RELEASE_TOKEN` заменять значениями preview только после соответствующего ответа пользователя.

```bash
make services-autogit CHANGE=task-108 BRANCH=feature/seo-improve \
  MESSAGE="Улучшено SEO" PATHS_FILE=.qa/task-108/paths.txt
```

Default `ACTION=plan`, `RELEASE=0`: только preview без commit/push. Для plan обязательны `CHANGE`, `BRANCH`, `MESSAGE`, `PATHS_FILE`; merge требует `PLAN`/`CONFIRM_PUSH`, release — `CHANGE`. Прямой CLI поддерживает `shipctl plan --branch ... --message ...`.

- GNU Make `-b`/`-m` не передают параметры рецепту; `--release` не поддерживается. Использовать `BRANCH=`, `MESSAGE=`, `RELEASE=1`. Для literal `$` в Make CLI нужны `$$` и одинарные shell-кавычки: `MESSAGE='Цена $$5'`. Environment values literal, без eval/shell interpolation.
- Явное имя ветки точное, занятое имя блокирует без suffix; main/dev/release запрещены как feature names. MESSAGE — точный однострочный subject до 72 символов без feat/fix-префикса, OpenSpec/Task trailers сохраняются. Без overrides прямой CLI сохраняет conventions/suffix.
- PATHS_FILE — UTF-8, один literal repo-root-relative путь на строку, включая `services/<name>/...`, без glob/абсолютных путей/`..`. Директория разворачивается только в dirty descendants; границы symlink/rename проверяет core. Root `.qa` и чужие nested repo не включаются.
- Whole-file: included коммитятся целиком из текущего дерева, partial staging included не сохраняется. Foreign не коммитятся, foreign staged блокируют. Ignored не force-add; credential paths/content исключаются либо блокируют с redacted diagnostics. Scanner не заменяет review и не гарантирует нахождение всех секретов.
- Корень и **все** manifest-клоны должны существовать, иметь корректный origin и быть на main (main-default принят), без detached/незавершённых Git-операций. Missing/dev/unsafe dirty/probe failure — blocker без auto-clone/switch. Included dirty допустимы; foreign unstaged — только если switch/sync/merge не перезапишут их.

План v2 сохраняется в `.qa/ship/<change>/plan.json`, `repos` — object, root `.`. PLAN_TOKEN покрывает inventory/origin, branch, subject/trailers, selected content/index/status, HEAD и exclusions; legacy/неполный план требует replan. Финальный plan после archive всегда свежий.

---

## Gate «Слить в main?»

Покажи repo/безопасный origin, included/foreign и ignored-denied counts/exclusions, ветку, полный subject/trailers, whole-file scope и `PLAN_TOKEN`. Предупреди: **feature и main будут отправлены в origin**; strict sync может ff-обновить clean клоны вне included, не коммитя/пуша их.

Используй ask_user_question («Слить в main» / «Не сливать»), если кнопка доступна; иначе **текстовый вопрос и остановка до ответа**. Нет ответа/отказ — без merge, auto-yes запрещён. `CONFIRM_PUSH` — перенос уже данного согласия конкретному плану, не его замена.

Явные правки пользователя ветки/MESSAGE/scope, изменение selected content/index/HEAD/origin/inventory или `plan_stale` → **replan и новый gate**. Старые token/approval не переиспользовать.

---

## OPS-MERGE — слияние

```bash
make services-autogit ACTION=merge PLAN=.qa/ship/task-108/plan.json \
  CONFIRM_PUSH='PLAN_TOKEN' RELEASE=1
```

Exit: `0` — все `pushed`, `1` — stop (конфликт/push/sync), `2` — окружение, `3` — `plan_stale`.

Стадии: `planned→committed→switched→branch-pushed→synced→merged→pushed`, `conflict`, `failed`, `untouched`.

**Конфликт:** JSON содержит `stage: conflict`, `conflictFiles`. Отчёт: «разрешите вручную: cd services/<name>, git add, commit, затем `merge --resume --change <c>`». Останови. После «разрешил» и отдельного осознанного решения продолжить — только явный `scripts/shipctl merge --resume --change <c>` с проверкой state/предусловий. Phase1 failure автоматически не повторяется; если resume неприменим — остановка, не обход state.

**Частичный успех:** покажи durable `mergeState`, pushed/merged/synced, failed/untouched и точный `resumeCommand`. Повтор ACTION=merge старого плана, auto-retry, rollback, force, stash/reset/clean и generic checkout-main после конфликта запрещены. Partial merge не получает release token и не релизится.

`RELEASE=1` — лишь намерение: только после phase2-complete и всех pushed возвращаются `release_pending:true` и read-only `releasePreview` через release --dry-run, без deploy. CONFIRM_RELEASE в merge игнорируется. При RELEASE=0 поздний отдельно подтверждённый release разрешён. Двухфазный порядок manifest→root, strict sync barrier и fail-stop сохраняются; межрепозиторной атомарности нет.

---

## Gate «Релизить?»

Только если: все `pushed`, есть `hasRelease: true`, корень `not-applicable`.

Если нужен preview или другой subset:

```bash
make services-autogit ACTION=release CHANGE=task-108 REPOS=backend,frontend
```

Без CONFIRM_RELEASE — только read-only preview. Покажи repo/main SHA, ff/noop, root not-applicable, no-release-branch, REPOS и `RELEASE_TOKEN`. Предупреди: **push release запускает workflow и возможный deploy**.

ask_user_question («Релизить» / «Не релизить») либо текстовый вопрос и остановка до ответа. Отказ не откатывает merge. Новый subset/SHA/origin/remote release/merge-state → новый preview/token и согласие. QG/approval change/merge approval не разрешают deploy.

---

## OPS-RELEASE — fast-forward main → release

```bash
make services-autogit ACTION=release CHANGE=task-108 REPOS=backend,frontend \
  CONFIRM_RELEASE='RELEASE_TOKEN'
```

REPOS должен совпадать с preview (либо одинаково отсутствовать в обоих вызовах). Core перепроверяет token/subset/SHAs/origins/state под lock. Root не релизится, release ветки не создаются автоматически, checkout release не выполняется. При failure покажи уже опубликованные repo и остановись без auto-retry/force/rollback.

Exit: `0` — успех (все ff или noop), `1` — push failure, `3` — blocker (release_diverged, main_moved).

Стадии: `pushed` (ff успешен), `noop` (release уже на main), `not-applicable` (корень), `no-release-branch`, `skipped` (по --repos), `release_diverged`, `main_moved`.

При `release_diverged` — покажи коммиты в release, которых нет в main, и останови. При `main_moved` — origin/main изменился после merge, останови.

---

## Состояние веток после успеха

Успешный путь оставляет клоны на main. Отдельный generic checkout-main не нужен и после конфликта запрещён: сохраняй state для ручного разрешения и explicit resume. Не создавай main автоматически и не скрывай partial failure переключением веток.

---

## OPS-CI — контроль CI

```bash
scripts/shipctl ci --change <c> --wait
```

Запускай **фоном** через bash tool с `run_in_background: true`, не опрашивай вручную. По завершении собери результат через `job_output`.

Exit: `0` — все runs успешны, `1` — failure/cancelled/timed_out/no_run, `2` — gh недоступен или не авторизован.

Логи неудачных runs в `.qa/ship/<c>/ci/<repo>-<runId>.log`. JSON-отчёт в `.qa/ship/<c>/ci.json`.

Timeout по умолчанию: 30 минут общий, 3 минуты на появление run. При `no_run` или `timed_out` — exit 1.

---

## Итоговый отчёт

```markdown
# Финализация <change>
READY: <aliases> + URLs
SYNC/ARCHIVE: ok
MERGE: ветка <b>, слиты <repos + SHA>, feature-ветки запушены
RELEASE: [skip] или зарелизены <repos + SHA>, noop <list>
STATE: main при полном успехе либо точный partial/conflict state, без cleanup-switch
CI: [skip] или success/failure
Итог: SUCCESS / PARTIAL / BLOCKED
```

---

## Закрытый список команд

**Разрешены:**
- `make services-autogit` только по стадиям и gates выше
- `scripts/shipctl status|plan|merge|release|ci`
- `scripts/stackctl ready|doctor|status|logs`
- `openspec sync|archive|validate`
- Чтение JSON-файлов `.qa/ship/<change>/*.json`
- `git status` и `git branch --show-current` для диагностики

**Запрещены:**
- Произвольные Git mutations вне shipctl, auto-clone/switch/cleanup
- Правка файлов сервисов/specs
- Разрешение конфликтов автоматически
- `gh run rerun|cancel`
- Rollback деплоя
- Очистка dirty-файлов пользователя

При блокере — останови, отчёт пользователю.

---

## Заметки

`shipctl merge` — общий `flock`, global preflight до первой мутации любого repo. Read-only plan/preview не делают fetch/refs/index/HEAD mutation. Изменение подтверждаемого материала → plan_stale/replan, а не достраивание плана после approval.

stdout адаптера — один JSON с `adapter_exit_code`; direct/core exit 0/1/2/3. GNU Make при ошибке рецепта возвращает свой exit 2; исходный код — в JSON. Exit 3 не откатывает предыдущие стадии.

Примеры: [README](../../../README.md#безопасная-финализация-через-make); процесс: [WORKFLOW](../../../WORKFLOW.md#шаг-6-финализация-skill-task-finalize).
