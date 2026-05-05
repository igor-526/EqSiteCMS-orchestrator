# Workflow разработки (EqSiteCMS)

Этот документ описывает **мануальный пайплайн** работы команды с агентами.
В будущем пайплайн будет автоматизирован через `orchestrator/` — см. [`orchestrator/AGENTS.md`](orchestrator/AGENTS.md).

---

## Обзор пайплайна

```
[Команда] → задача
     ↓
[Planner] → docs/plans/NEX-XXX.md
     ↓
[Человек] → ревью плана, правки
     ↓
[Backend / Frontend] → код на feature-ветке
     ↓
[Человек] → git diff, проверка
     ↓
[Quality Gate] → docs/plans/NEX-XXX-review.md
     ↓
[Человек] → принять / вернуть на доработку
     ↓
[Backend / Frontend] → доработка по rework-плану
     ↓
[Человек] → merge
```

---

## Шаг 0. Подготовка

```bash
# Убедиться, что находишься на свежей ветке
git checkout main && git pull
git checkout -b feature/NEX-XXX-short-description
```

Или использовать оркестратор, который создаёт ветку автоматически:
```bash
make task NEX-XXX "краткое описание задачи"
```

---

## Шаг 1. Planner — генерация плана

**Открыть Cursor**, убедиться что контекст = корень репозитория (`AGENTS.md` читается автоматически как правило).

Дать задачу Planner-агенту:

```
@agents/planner.md

Задача: NEX-XXX — <описание>
Контекст: <дополнительный контекст если нужен>
```

**Ожидаемый результат:** файл `docs/plans/NEX-XXX.md` по формату [`docs/plans/TEMPLATE.md`](docs/plans/TEMPLATE.md).

---

## Шаг 2. Ревью плана (человек)

1. Открыть `docs/plans/NEX-XXX.md`
2. Проверить:
   - Правильно ли декомпозированы задачи?
   - Не нарушает ли план архитектуру?
   - Указаны ли конкретные файлы?
   - Есть ли чеклист для каждого агента?
3. Внести правки если нужно
4. Можно добавить/убрать пункты из чеклиста — агенты ориентируются именно по нему

---

## Шаг 3. Раздача задач агентам (человек)

Открыть нужного агента в Cursor, дать ему план:

### Backend-агент:
```
@agents/backend.md

Выполни Backend-задачи из плана:
@docs/plans/NEX-XXX.md

Сервис: services/be
```

### Frontend-агент:
```
@agents/frontend.md

Выполни Frontend-задачи из плана:
@docs/plans/NEX-XXX.md

Сервис: services/fe
```

**Агенты обязаны отмечать выполненные пункты как `[x]` в чеклисте плана.**

---

## Шаг 4. Проверка diff (человек)

```bash
# Смотрим что изменилось
git diff main

# Или красиво через make (если настроено)
make diff
```

Беглый просмотр:
- Нет ли лишних файлов?
- Нет ли изменений вне scope задачи?
- Файлы в правильных директориях?

---

## Шаг 5. Quality Gate

Запустить Quality Gate агент:

```
@agents/quality_gate.md

Проверь diff для задачи NEX-XXX:
@docs/plans/NEX-XXX.md

git diff: [вставить вывод git diff или указать файлы]
```

Или через make (запускает QG с текущим diff):
```bash
make review TASK=NEX-XXX
```

**Ожидаемый результат:** файл `docs/plans/NEX-XXX-review.md` с одним из итогов:
- ✅ `APPROVED` — можно мержить
- ❌ `REWORK` — список проблем + микро-план доработки

---

## Шаг 6. Доработка (если REWORK)

Вернуть план доработки агенту:

```
@agents/backend.md

Доработай по результатам ревью:
@docs/plans/NEX-XXX-review.md
```

Повторить шаги 4–5 до получения `APPROVED`.

---

## Шаг 7. Merge

```bash
git add .
git commit -m "feat(NEX-XXX): краткое описание"
```

Создать PR через gh:
```bash
gh pr create --title "feat(NEX-XXX): описание" --body "Closes NEX-XXX"
```

---

## Соглашения

### Имена веток
```
feature/NEX-XXX-short-slug
fix/NEX-XXX-short-slug
refactor/NEX-XXX-short-slug
```

### Коммит-сообщения
```
feat(NEX-XXX): добавлена сущность Job
fix(NEX-XXX): исправлен 500 при пустом title
refactor(NEX-XXX): перенесена логика из роутера в JobService
```

### Файлы планов
```
docs/plans/NEX-XXX.md          # план задачи (генерирует Planner)
docs/plans/NEX-XXX-review.md   # отчёт ревью (генерирует Quality Gate)
docs/plans/NEX-XXX-report.md   # итоговый отчёт (генерирует Orchestrator)
```

---

## Быстрый старт (TL;DR)

```bash
# 1. Ветка
git checkout -b feature/NEX-XXX-slug

# 2. Planner → план
# (в Cursor: @agents/planner.md + описание задачи)

# 3. Ревью плана руками

# 4. Раздать агентам
# (в Cursor: @agents/backend.md + @docs/plans/NEX-XXX.md)

# 5. Проверить diff
git diff main

# 6. Quality Gate
# (в Cursor: @agents/quality_gate.md + @docs/plans/NEX-XXX.md)

# 7. Если APPROVED → merge
gh pr create ...
```
