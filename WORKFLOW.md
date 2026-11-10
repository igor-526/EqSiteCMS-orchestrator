# Workflow разработки (EqSiteCMS)

Этот документ описывает **пайплайн** работы команды с агентами и OpenSpec.

---

## Обзор пайплайна

```
[Задача] → Router
     ↓
[Planner] → OpenSpec proposal/design/specs/tasks
     ↓
[Человек] → approval
     ↓
[Backend/Frontend/Site Consumer] → код (execution units)
     ↓
[Quality Gate] → lanes (QG-ENV, QG-BE, QG-FE-AUTO, QG-FE-MANUAL, QG-CONTRACTS, QG-LIVE)
     ↓
[QG-SYNTH] → APPROVED / REWORK
     ↓
[OPS-READY] → stackctl ready
     ↓
[OPS-SYNC/ARCHIVE] → specs синхронизированы
     ↓
[task-finalize skill] → merge → release → CI → итоговый отчёт
```

---

## Шаг 0. Подготовка

```bash
# Убедиться что находишься на main
git checkout main && git pull
```

Никаких feature-веток вручную: `shipctl merge` создаёт их автоматически.

---

## Шаг 1. Router → Planner → OpenSpec

Дать задачу Router (он направит Planner при необходимости):

```
Задача: <описание>
Контекст: <дополнительный контекст>
```

**Ожидаемый результат:** OpenSpec change в `openspec/changes/<id>/` с файлами:
- `proposal.md` — краткий summary
- `design.md` — решения, DAG, test matrix
- `specs/<capability>/spec.md` — delta specs
- `tasks.md` — execution units с ownership и verification

Router показывает артефакты и **останавливается** до явного approval.

---

## Шаг 2. Approval (человек)

Проверить:
- Правильно ли декомпозированы execution units?
- Не нарушает ли план архитектуру?
- Указаны ли ownership paths?
- Есть ли verification для каждого unit?

После подтверждения Router запускает реализацию по execution units.

---

## Шаг 3. Реализация (агенты)

Router делегирует **по одному execution unit** профильному агенту. Агент:
- Читает только свои `contextFiles` из `tasks.md`
- Реализует назначенные task IDs
- Запускает verification этого unit
- Отмечает выполненные tasks
- Возвращает handoff

Handoff содержит:
- Unit ID, статус (done/partial/blocked)
- Изменённые файлы (пути от корня монорепы)
- Verification результат
- Отмеченные task IDs
- Решения, влияющие на следующие units

Router ждёт handoff и запускает следующий unit.

---

## Шаг 4. Quality Gate

После завершения всех execution units Router запускает Quality Gate по lanes:

- `QG-ENV` — подготовка runtime (rebuild, migrate, health)
- `QG-BE` — backend review (Clean Arch, тесты, миграции, access policy)
- `QG-FE-AUTO` — frontend automated (`npm test`, lint, tsc, build, E2E)
- `QG-FE-MANUAL` — browser QA агентом (Playwright, screenshots, console/network/axe)
- `QG-CONTRACTS` — архитектура и контракты (AsyncAPI, access matrix, specs)
- `QG-LIVE` — live verification (SMOKE, PostgreSQL/NATS)
- `QG-SYNTH` — synthesis (findings всех lanes, один вердикт, отчёт в `docs/reports/`)

Неприменимые lanes помечаются `неприменимо` с обоснованием.

Вердикт:
- ✅ `APPROVED` — можно финализировать
- ❌ `REWORK` — findings → владельцам как новые execution units

---

## Шаг 5. Доработка (если REWORK)

Router возвращает findings владельцам как новые execution units.

После исправлений повторяются **только затронутые lanes** и `QG-SYNTH`.

---

## Шаг 6. Финализация (skill task-finalize)

После `QG-SYNTH = APPROVED` (либо явно согласованного `APPROVED_WITH_WAIVER`) Router выполняет:

1. **OPS-READY:** preliminary plan по union путей handoff, затем `stackctl ready <aliases>`; пустой runtime scope — ready не нужен.
2. **OPS-SYNC:** синхронизация delta specs в main specs, strict validate.
3. **OPS-ARCHIVE:** штатное архивирование change, проверка archived artifacts.
4. **OPS-PLAN:** после archive Router предлагает точные `BRANCH` и `MESSAGE`, дополняет `PATHS_FILE` путями sync/archive и создаёт свежий финальный план через `make services-autogit CHANGE=... BRANCH=... MESSAGE="..." PATHS_FILE=...`. Default `ACTION=plan`, `RELEASE=0`: никаких commit/push.
5. **Gate «Слить в main?»** — показать repo/origin, included/foreign/exclusions, branch, subject/trailers, whole-file scope и strict sync; предупредить: feature и main будут отправлены в origin. Правки пользователя → replan → новый gate. Только ответ для конкретного `PLAN_TOKEN` разрешает `CONFIRM_PUSH`.
6. **OPS-MERGE:** `make services-autogit ACTION=merge PLAN=... CONFIRM_PUSH='PLAN_TOKEN' RELEASE=1` после согласия; `RELEASE=1` лишь запрашивает read-only preview после полного успеха, не запускает deploy. Lock/global preflight и двухфазный strict sync сохранены.
7. **Gate «Релизить?»** — только полный merge (все pushed), release repo/SHA, ff/noop, root not-applicable/no-release. Push release запускает workflow и возможный deploy; это отдельное согласие по `RELEASE_TOKEN` и точному subset `REPOS`, не QG/approval change. Без `CONFIRM_RELEASE` ACTION=release — только preview.
8. **OPS-RELEASE:** `make services-autogit ACTION=release CHANGE=... CONFIRM_RELEASE='RELEASE_TOKEN'` с тем же `REPOS`, если subset задан; fast-forward `main → release`, без checkout release. Поздний отдельно подтверждённый release возможен и при `RELEASE=0`.
9. **OPS-CI:** `scripts/shipctl ci --change ... --wait` фоном, затем собрать результат. Успешный shipping оставляет клоны на main; отдельный generic checkout-main не нужен.
10. **Итоговый отчёт:** state по repo/SHA, опубликованные стадии, skipped/blocked и CI.

Если кнопка ask_user_question недоступна — текстовый вопрос и остановка до ответа; auto-yes запрещён. Отказ — остановка без rollback. При partial/conflict показать durable state, pushed/merged/failed/untouched и `resumeCommand`, остановиться. После ручного разрешения — только явно согласованный `shipctl merge --resume --change ...` при выполненных предусловиях; никакого повтора старого ACTION=merge, auto-retry/release или generic checkout-main после конфликта.

Все inventory repo (корень + manifest) должны быть на main; missing/dev/detached/unsafe dirty — блокер без auto-repair. Included dirty допустимы, whole-file commit не сохраняет их partial staging; foreign staged блокируют, foreign unstaged не коммитятся. Пути — literal, ignored/секреты исключаются либо блокируют, scanner не заменяет review. GNU Make `-b`/`-m`/`--release` не являются параметрами задачи; `$` в CLI экранируется как `$$` с shell single quotes. stdout адаптера — JSON с `adapter_exit_code`, Make при ошибке рецепта возвращает exit 2.

Рабочие шаблоны — [README](README.md#безопасная-финализация-через-make); полный протокол — [task-finalize](.agents/skills/task-finalize/SKILL.md). Approval на change не разрешает реальные push/deploy во время apply/QG.

---

## Соглашения

### Имена веток

В этой автоматизации база — main (main-default принят). `shipctl merge` создаёт ветки из плана. Явный `BRANCH` используется точно, занятое имя блокирует без суффикса. Без override прямой CLI сохраняет `feature/<change-id>`/`bug/<change-id>` и автосуффикс `-2`, `-3`.

### Коммит-сообщения

Явный `MESSAGE` — точный однострочный subject до 72 символов, без автоматического feat/fix-префикса. Без override прямой CLI сохраняет `feat(<change-id>): <summary>`/`fix(<change-id>): <summary>`. Trailers `OpenSpec: <change-id>` и `Task: docs/tasks/<file>` сохраняются в обоих случаях.

### Файлы OpenSpec

```
openspec/changes/<id>/proposal.md
openspec/changes/<id>/design.md
openspec/changes/<id>/specs/<capability>/spec.md
openspec/changes/<id>/tasks.md
openspec/changes/archive/YYYY-MM-DD-<id>/  # после архивирования
```

### Отчёты Quality Gate

```
docs/reports/<id>-<name>-review.md
```

---

## Быстрый старт (TL;DR)

```bash
# 1. Задача → Router
# (Router → Planner → OpenSpec proposal/design/specs/tasks)

# 2. Approval artifacts

# 3. Router делегирует execution units
# (Агенты возвращают handoff после каждого unit)

# 4. Quality Gate lanes → QG-SYNTH

# 5. Если APPROVED:
#    stackctl ready → sync/archive → shipctl plan
#    Gate «Слить?» → shipctl merge
#    Gate «Релизить?» → shipctl release → CI

# Итоговый отчёт
```

---

## Sync и ship

```bash
# Синхронизация клонов manifest
make sync

# Строгий режим (ff-only, включая корень, JSON-report)
make sync SYNC_FLAGS="--strict --include-root --report .qa/ship/<c>/sync.json"

# Unit-тесты shipctl
make ship-test
```

См. `scripts/shipctl --help`, `scripts/stackctl --help`, `.agents/skills/task-finalize/SKILL.md`.
