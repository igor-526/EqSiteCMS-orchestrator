---
name: task-finalize
description: Финализация задачи после QG-SYNTH APPROVED — от stackctl ready до merge/release
whenToUse: После QG-SYNTH = APPROVED и архивирования OpenSpec change, когда нужно слить изменения в main и зарелизить сервисы
---

# Task Finalization

Процедура выполняется **строго Router** после `QG-SYNTH = APPROVED` по стадиям ниже.
Никаких автоисправлений: при сбое — отчёт и остановка.

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

После archive повторно проверь `openspec validate <change> --type change --strict`.

---

## OPS-PLAN — финальный план

После архивирования пути archive также войдут в автоматический набор:

```bash
scripts/shipctl plan \
  --change <change-id> \
  --summary "<summary>" \
  --paths-file paths.txt
```

Fingerprint обновится (включает пути archive). План перезапишет `.qa/ship/<change>/plan.json`.

---

## Gate «Слить в main?»

Покажи: repo, ветку, `included`/`foreign`, commit message, «Feature-ветки запушатся, foreign не коммитятся», занятые варианты.

`ask_user_question`: header "Слияние", options ["Слить в main", "Не сливать"]. Custom → `--include`/`--exclude`, перезапусти plan. Fallback (вне DSH) — текст + останов. «Не сливать» → останови.

---

## OPS-MERGE — слияние

```bash
scripts/shipctl merge --plan .qa/ship/<change>/plan.json
```

Exit: `0` — все `pushed`, `1` — stop (конфликт/push/sync), `2` — окружение, `3` — `plan_stale`.

Стадии: `planned→committed→switched→branch-pushed→synced→merged→pushed`, `conflict`, `failed`, `untouched`.

**Конфликт:** JSON содержит `stage: conflict`, `conflictFiles`. Отчёт: «разрешите вручную: cd services/<name>, git add, commit, затем `merge --resume --change <c>`». Останови. После «разрешил» — запусти `--resume`.

**Частичный успех:** покажи pushed/merged/synced. Повтор `merge` без `--resume` запрещён.

---

## Gate «Релизить?»

Только если: все `pushed`, есть `hasRelease: true`, корень `not-applicable`.

Покажи: repo, SHA main, ff/noop, «Push в release → CI/CD деплой».

`ask_user_question`: header "Релиз", options ["Релизить", "Не релизить"]. Custom → `--repos <list>`. «Не релизить» → останови.

---

## OPS-RELEASE — fast-forward main → release

```bash
scripts/shipctl release --change <c> [--repos <list>]
```

Exit: `0` — успех (все ff или noop), `1` — push failure, `3` — blocker (release_diverged, main_moved).

Стадии: `pushed` (ff успешен), `noop` (release уже на main), `not-applicable` (корень), `no-release-branch`, `skipped` (по --repos), `release_diverged`, `main_moved`.

При `release_diverged` — покажи коммиты в release, которых нет в main, и останови. При `main_moved` — origin/main изменился после merge, останови.

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
CI: [skip] или success/failure
Итог: SUCCESS / PARTIAL / BLOCKED
```

---

## Закрытый список команд

**Разрешены:**
- `scripts/shipctl status|plan|merge|release|ci`
- `scripts/stackctl ready|doctor|status|logs`
- `openspec sync|archive|validate`
- Чтение JSON-файлов `.qa/ship/<change>/*.json`

**Запрещены:**
- Произвольные git-команды вне shipctl
- Правка файлов сервисов/specs
- Разрешение конфликтов автоматически
- `gh run rerun|cancel`
- Rollback деплоя
- Очистка dirty-файлов пользователя

При блокере — останови, отчёт пользователю.

---

## Заметки

`shipctl merge` — `flock`. Fingerprint: SHA+branch+included; изменение → `plan_stale`. `foreign` не коммитятся. Ветки: `feature|bug/<change>[-N]`. Commit: `feat|fix(<c>): <s>` + trailers.
