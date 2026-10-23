# Паттерны экономии контекста (Context Economy Patterns)

## Проблема

DSH имеет жёсткий лимит: **200K токенов на turn**. Превышение приводит к ошибке `400 prompt is too long`.

При мультиагентной разработке с OpenSpec workflow контекст расходуется на:
- Системные инструкции (AGENTS.md, профильные .md агентов)
- OpenSpec артефакты (proposal, design, specs, tasks)
- Handoff'ы предыдущих execution units
- Код сервисов и файлы проекта
- История диалога

**Основная причина перерасхода**: повторное чтение одного и того же контекста — в каждом execution unit и на каждом шаге Router.

### Фактические замеры (сессии 2026-10, задачи yandex/ya-metrica)

| Статья | Доля токенов задачи |
|---|---|
| Шаги Router (контекст ~100–130K перечитывается на каждом шаге) | 17–44% |
| из них: поллинг `sleep`/`job_output` (~190 холостых шагов на задачу) | ~20% |
| из них: перечитывание этого файла перед каждым делегированием (72 раза) | ~7% |
| QG-FORMAT на «чистом worktree» с изолированной копией и установкой зависимостей | 13–54% |
| Починка инструментов/окружения вне scope change внутри change | ~11–16% |
| Units-«чекпоинты» и перепланирования Planner | ~5–10% |
| Реальная реализация + ревью | ~20–25% |

Каждый новый запуск агента стоит ~0.5–1.5M токенов только на bootstrap и чтение правил. Поэтому экономия — это прежде всего **меньше шагов Router и меньше запусков агентов**, а уже потом — точечные contextFiles.

---

## Архитектурные принципы

### 1. Read-Once Principle

**OpenSpec артефакты читаются один раз на change:**

```
Router (start) → читает proposal.md полностью
    ↓
BE-1           → читает только design.md ## Backend + specs/projects/spec.md
    ↓
BE-2           → читает только handoff BE-1 (НЕ перечитывает design.md)
    ↓
QG-BE          → читает design.md ## Test matrix + BE diff (НЕ перечитывает весь design)
```

**Запрещено**: формулировки «прочитай весь change», «изучи proposal.md», «ознакомься с design.md» в каждом unit.

**Обязательно**: точечный `contextFiles` список для каждого unit.

---

### 2. Layered Context Pack

Контекст делится на слои по частоте использования:

#### Layer 0: Core (читается агентом по «Протоколу чтения»)
- `AGENTS.md` → секция роли агента
- `agents/<profile>.md` → ядро (секция 0) + секции конкретного unit

**Пример** (Backend):
```
BE-1 (schema/migration) → секция 0 + секция 2 (schema/models)
BE-2 (repository)       → секция 0 + секция 3 (repositories)
BE-3 (API)              → секция 0 + секция 4 (API)
```

Агент **не** перечитывает весь `backend.md` (56KB) в каждом unit.

#### Layer 1: Change Blueprint (читается Router один раз, потом точечно)
- `proposal.md` — только Router при старте
- `design.md` — Router полностью, исполнители точечно (одна секция)
- `specs/<capability>/spec.md` — только если unit касается этой capability

#### Layer 2: Execution Context (передаётся через handoff)
- Handoff предыдущего unit (короткий блок)
- Список изменённых файлов (пути, без diff)
- Решения, влияющие на следующие units

#### Layer 3: Code (читается только необходимое)
- Только файлы, которые unit **реально меняет**
- Только интерфейсы зависимостей (protocols, contracts)
- **НЕ** весь сервис целиком

---

### 3. Точечный contextFiles

**Плохо** (расход ~40K токенов):
```
contextFiles:
  - proposal.md
  - design.md
  - specs/projects/spec.md
  - specs/project-categories/spec.md
  - services/backend/api/routes/projects.py
  - services/backend/core/services/projects.py
  - services/backend/core/protocols/projects.py
  - services/backend/repositories/projects.py
  - services/backend/models/projects.py
  - tests/unit/test_projects.py
```

**Хорошо** (расход ~8K токенов):
```
Unit: BE-2 (repository + domain)
contextFiles:
  - design.md → ## Backend → Repository Layer (только эта секция)
  - specs/projects/spec.md → ## Data Model (только схема)
  - handoff BE-1 (короткий блок)
  - services/backend/core/protocols/projects.py (интерфейс)
contextInstructions:
  - Создать repositories/projects.py по protocol
  - Реализовать domain services
  - НЕ читать models/ (уже есть после BE-1)
  - НЕ читать api/ (будет в BE-3)
```

---

### 4. Handoff как канал передачи состояния

Handoff заменяет необходимость «изучать, что уже сделано»:

**Формат handoff** (обязательно короткий):
```
Unit: BE-2 — repository + domain | Профиль: Backend | Статус: done
Изменённые файлы:
  - services/backend/repositories/projects.py
  - services/backend/core/services/projects.py
Verification: make test → 0 failed
Отмеченные tasks: TASK-003, TASK-004
Решения:
  - ProjectRepository.get_by_slug использует index idx_project_slug
  - Transaction scope — service level (не в repository)
Остаток: API endpoints (BE-3), unit tests (BE-4)
```

**Запрещено** в handoff:
- Пересказ всего плана
- Дублирование diff
- История предыдущих units

Следующий unit **не** перечитывает код предыдущего, если не меняет его напрямую.

---

### 5. Circuit Breaker для больших units

Если агент видит, что unit не помещается в бюджет **контекста**, он:

1. Выполняет безопасную атомарную часть
2. Возвращает handoff со статусом `partial` и предложением split
3. Предлагает границы нового разбиения с зависимостями

**Пример**:
```
Unit: BE-3 — API + access control
Статус: partial
Выполнено: API endpoints (TASK-005)
Предложение split:
  BE-3a: API endpoints (done)
  BE-3b: access control + decorators
Причина: contextFiles для полного unit ~85K токенов, превышает бюджет
```

Router **обязан** принять split и делегировать `BE-3b` следующим запуском.

---

### 6. Шаги Router дороже всего

Каждый шаг Router перечитывает весь его контекст (обычно 100–130K токенов). Поэтому:

- делегирование в фоне + завершение ответа; уведомление о завершении само разбудит Router; независимые units — одним сообщением;
- goal-режим отключён: при активной цели DSH будит Router раундом на каждом простое (сессия 9c242c5a: 158 холостых раундов, 16.6M токенов — 54% расхода Router);
- никаких `sleep`, циклов `job_output`/`list_agents`, перечитывания правил между делегированиями;
- `send_message` у дочерних агентов отключён: промежуточные статусы будили Router (7 пробуждений, 2.7M в той же сессии);
- упавший по лимиту агент возобновляется `send_message`, а не заменяется новым.

### 6a. Browser QA и изображения

Каждый `read_image` остаётся в контексте QA-агента до конца сессии: 91–93 screenshots на трёх viewport поднимали контекст до 215K, а два прогона `QG-FE-MANUAL` стоили 25.7M (20% задачи). CMS проверяется только в 1366×768, screenshots смотрятся только для изменённых состояний (≤~15).

### 7. Нижняя граница unit

Unit меньше ~5 существенных действий стоит дороже своей пользы. Чекпоинты, фиксации, отметка tasks — в составе рабочего unit. Механическая работа по нескольким сервисам — один unit.

### 8. Перепроверка тем же агентом

QG-агент, нашедший findings, перепроверяет их сам после fix (Router — `send_message` continuable-агенту). Новый QG-агент на перепроверку — повторный bootstrap и повторное чтение всего среза.

---

## Чеклист Router перед делегированием

Рабочий чеклист встроен в `agents/router.md` («Context pack и чеклист перед делегированием») и находится в system prompt Router. Этот файл перед делегированием **не** перечитывается.

---

## Протокол чтения для агентов

Каждый профильный агент (`backend.md`, `frontend.md`, `quality_gate.md`) обязан начинаться с **секции 0: Ядро (Core)**:

```markdown
# Backend Agent

## Секция 0: Ядро (Core) — читай всегда

<15-20 строк ключевых принципов>

---

## Протокол чтения

Ты **не** перечитываешь весь `backend.md` в каждом execution unit.

Router передаёт тебе конкретный unit с границами:
- BE-1 (schema/migration) → читай секцию 0 + секцию 2
- BE-2 (repository)       → читай секцию 0 + секцию 3
- BE-3 (API)              → читай секцию 0 + секцию 4
- BE-4 (tests)            → читай секцию 0 + секцию 8

Если Router передал тебе unit без указания секций, выбери их сам по `grep -n '^## '` и протоколу чтения, не читая весь файл.

---

## Секция 2: Schema & Models
...

## Секция 3: Repositories
...
```

Это позволяет агенту читать только релевантную часть своего профильного файла.

---

## Примеры экономии

### Пример 1: Backend change (4 execution units)

**Без экономии контекста**:
```
BE-1: proposal (12K) + design (8K) + backend.md (56K) + specs (5K) = 81K
BE-2: proposal (12K) + design (8K) + backend.md (56K) + specs (5K) + handoff (2K) = 83K
BE-3: proposal (12K) + design (8K) + backend.md (56K) + specs (5K) + handoff (2K) = 83K
BE-4: proposal (12K) + design (8K) + backend.md (56K) + specs (5K) + handoff (2K) = 83K
Итого: 330K токенов (читается повторно)
```

**С экономией контекста**:
```
BE-1: design ## Backend (2K) + backend.md секция 0+2 (8K) + specs ## Data Model (1K) = 11K
BE-2: handoff BE-1 (0.5K) + backend.md секция 0+3 (6K) + protocol (0.5K) = 7K
BE-3: handoff BE-2 (0.5K) + backend.md секция 0+4 (7K) + specs ## API (2K) = 9.5K
BE-4: handoff BE-3 (0.5K) + backend.md секция 0+8 (5K) = 5.5K
Итого: 33.5K токенов (экономия 90%)
```

### Пример 2: Quality Gate (5 lanes)

**Без экономии**:
```
QG-BE:        proposal + design + всё BE diff + backend.md полностью = 95K
QG-FE:        proposal + design + весь FE diff + frontend.md полностью = 78K
QG-CONTRACTS: proposal + design + все specs + все handoff'ы = 62K
QG-LIVE:      proposal + design + все SMOKE-сценарии = 45K
QG-SYNTH:     все findings всех lanes + весь diff = 58K
Итого: 338K токенов
```

**С экономией**:
```
QG-BE:        design ## Test matrix (1K) + BE diff paths (2K) + quality_gate.md секция QG-BE (4K) = 7K
QG-FE:        design ## Test matrix (1K) + FE diff paths (1.5K) + quality_gate.md секция QG-FE (3K) = 5.5K
QG-CONTRACTS: design ## Architecture (2K) + access matrix (1K) + specs diff (3K) = 6K
QG-LIVE:      SMOKE scenarios (8K) + endpoint list (1K) = 9K
QG-SYNTH:     findings summary (4K) + handoff'ы lanes (2K) = 6K
Итого: 33.5K токенов (экономия 90%)
```

---

## Мониторинг расхода контекста

Отдельный лог размера delegation prompt не ведётся. Если unit явно тянет >150K токенов контекста — он делится до делегирования; агент, обнаруживший это в процессе, возвращает `partial` со split.

---

## Анти-паттерны (запрещено)

### ❌ Монолитный contextFiles
```
contextFiles:
  - proposal.md
  - design.md
  - specs/**/*.md
  - services/backend/**/*.py
```

### ❌ «Прочитай весь change»
```
Задача: изучи весь change и реализуй backend
```

### ❌ Перечитывание профильного .md
```
BE-1: прочитай backend.md
BE-2: прочитай backend.md
BE-3: прочитай backend.md
```

### ❌ Перечитывание OpenSpec артефактов
```
BE-1: прочитай proposal.md, design.md, specs/
BE-2: прочитай proposal.md, design.md, specs/
```

### ❌ «Изучи, что уже сделано» вместо handoff
```
Задача: изучи diff и продолжи работу предыдущего unit
```

---

## Валидация экономии

После внедрения паттернов Router обязан подтвердить:

1. Ни один execution unit не превышает лимит 200K токенов
2. Повторное чтение одних и тех же артефактов устранено
3. Каждый handoff короткий (≤1K токенов)
4. `contextFiles` точечные (≤10 файлов на unit)
5. Агенты читают свои профильные .md по «Протоколу чтения» (секции, а не весь файл)

---

## Эскалация

Если после применения всех паттернов unit всё равно превышает лимит:

1. Агент возвращает `partial` со split-предложением
2. Router обязан принять split и обновить план execution units
3. Новые units делегируются с обновлённым `contextFiles`

**Запрещено**: требовать от агента «уместить всё в одной сессии» или игнорировать split-предложение.
