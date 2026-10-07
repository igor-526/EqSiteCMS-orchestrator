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

После `QG-SYNTH = APPROVED`:

1. **OPS-READY:** `stackctl ready <aliases>` (ожидаемо «нет runtime-изменений»)
2. **OPS-SYNC:** синхронизация delta specs в main specs
3. **OPS-ARCHIVE:** архивирование change
4. **OPS-PLAN:** финальный `shipctl plan` с путями archive
5. **Gate «Слить в main?»** — показывает план, варианты «Слить» / «Не сливать»
6. **OPS-MERGE:** `shipctl merge` — создание feature-веток, commit included-файлов, push веток и main
7. **Gate «Релизить?»** (только при успехе merge и наличии release-репозиториев)
8. **OPS-RELEASE:** fast-forward `main → release` (пока не реализован)
9. **OPS-CI:** контроль CI через `gh` (пока не реализован)
10. **Итоговый отчёт**

См. `.agents/skills/task-finalize/SKILL.md`.

---

## Соглашения

### Имена веток

Создаются автоматически `shipctl merge`:
```
feature/<change-id>
bug/<change-id>
```

Автосуффикс `-2`, `-3` при занятости.

### Коммит-сообщения

```
feat(<change-id>): <summary>
fix(<change-id>): <summary>

OpenSpec: <change-id>
Task: docs/tasks/<file>
```

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
