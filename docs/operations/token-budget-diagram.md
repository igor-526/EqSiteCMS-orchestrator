# Визуализация бюджета токенов и экономии контекста

## Проблема: превышение лимита 200K токенов

```
┌─────────────────────────────────────────────────────────────┐
│ DSH Hard Limit: 200,000 tokens per turn                    │
└─────────────────────────────────────────────────────────────┘

❌ БЕЗ экономии контекста (4 backend execution units):

Router → BE-1:
  ├─ AGENTS.md (15K)
  ├─ backend.md ВЕСЬ ФАЙЛ (56K)
  ├─ proposal.md (12K)
  ├─ design.md (8K)
  ├─ specs/projects/spec.md (5K)
  └─ код (10K)
  = 106K токенов

Router → BE-2:
  ├─ AGENTS.md (15K)
  ├─ backend.md ВЕСЬ ФАЙЛ (56K)    ← ПОВТОРНО!
  ├─ proposal.md (12K)               ← ПОВТОРНО!
  ├─ design.md (8K)                  ← ПОВТОРНО!
  ├─ specs/projects/spec.md (5K)    ← ПОВТОРНО!
  ├─ handoff BE-1 (2K)
  └─ код (10K)
  = 108K токенов

Router → BE-3:
  ├─ AGENTS.md (15K)
  ├─ backend.md ВЕСЬ ФАЙЛ (56K)    ← ПОВТОРНО!
  ├─ proposal.md (12K)               ← ПОВТОРНО!
  ├─ design.md (8K)                  ← ПОВТОРНО!
  ├─ specs/projects/spec.md (5K)    ← ПОВТОРНО!
  ├─ handoff BE-2 (2K)
  └─ код (12K)
  = 110K токенов

Router → BE-4:
  ├─ AGENTS.md (15K)
  ├─ backend.md ВЕСЬ ФАЙЛ (56K)    ← ПОВТОРНО!
  ├─ proposal.md (12K)               ← ПОВТОРНО!
  ├─ design.md (8K)                  ← ПОВТОРНО!
  ├─ specs/projects/spec.md (5K)    ← ПОВТОРНО!
  ├─ handoff BE-3 (2K)
  └─ тесты (8K)
  = 106K токенов

ИТОГО на 4 units: 430K токенов
Повторно прочитано: proposal (3×), design (3×), backend.md (4×), specs (4×)

⚠️  ПЕРЕРАСХОД: 430K > 200K = ОШИБКА!
```

---

## Решение: паттерны экономии контекста

```
✅ С экономией контекста (4 backend execution units):

Router → BE-1 (schema + migration):
  ├─ AGENTS.md → Router секция (3K)
  ├─ backend.md → секция 0 (Core) + секция 2 (Schema) (8K)
  ├─ design.md → ТОЛЬКО ## Backend → Schema Layer (2K)
  ├─ specs/projects/spec.md → ТОЛЬКО ## Data Model (1K)
  └─ models/projects.py (5K)
  = 19K токенов

Router → BE-2 (repository + domain):
  ├─ AGENTS.md → Router секция (3K)
  ├─ backend.md → секция 0 (Core) + секция 3 (Repository) (6K)
  ├─ handoff BE-1 (0.5K)                ← ВМЕСТО повторного чтения
  ├─ core/protocols/projects.py (1K)    ← ТОЛЬКО интерфейс
  ├─ repositories/projects.py (3K)
  └─ core/services/projects.py (4K)
  = 17.5K токенов

Router → BE-3 (API + access control):
  ├─ AGENTS.md → Router секция (3K)
  ├─ backend.md → секция 0 (Core) + секция 4 (API) (7K)
  ├─ design.md → ТОЛЬКО ## API Contracts (2K)
  ├─ specs/projects/spec.md → ТОЛЬКО ## API (2K)
  ├─ handoff BE-2 (0.5K)                ← ВМЕСТО повторного чтения
  ├─ core/protocols/projects.py (1K)    ← ТОЛЬКО интерфейс
  └─ api/routes/projects.py (6K)
  = 21.5K токенов

Router → BE-4 (unit tests):
  ├─ AGENTS.md → Router секция (3K)
  ├─ backend.md → секция 0 (Core) + секция 8 (Testing) (5K)
  ├─ handoff BE-3 (0.5K)                ← ВМЕСТО повторного чтения
  ├─ core/protocols/projects.py (1K)    ← ТОЛЬКО интерфейс
  └─ tests/unit/test_projects.py (8K)
  = 17.5K токенов

ИТОГО на 4 units: 75.5K токенов
Экономия: 430K → 75.5K = 82% экономии!

✅ ВСЕ UNITS В ПРЕДЕЛАХ ЛИМИТА: max 21.5K << 200K
```

---

## Ключевые паттерны экономии

### 1. Read-Once Principle

```
proposal.md:  Router → читается 1 раз
              BE-1   → НЕ читается
              BE-2   → НЕ читается
              BE-3   → НЕ читается

design.md:    Router → читается ПОЛНОСТЬЮ
              BE-1   → читается ТОЛЬКО ## Backend → Schema Layer
              BE-2   → НЕ читается (есть в handoff)
              BE-3   → читается ТОЛЬКО ## API Contracts
```

### 2. Протокол чтения профильных .md

```
backend.md (56KB):

Секция 0: Core (5KB)         ← читается ВСЕГДА
Секция 2: Schema (3KB)       ← BE-1 читает
Секция 3: Repository (1KB)   ← BE-2 читает
Секция 4: API (2KB)          ← BE-3 читает
Секция 8: Testing (0.5KB)    ← BE-4 читает

BE-1 читает: секция 0 + секция 2 = 8KB вместо 56KB (86% экономии)
BE-2 читает: секция 0 + секция 3 = 6KB вместо 56KB (89% экономии)
BE-3 читает: секция 0 + секция 4 = 7KB вместо 56KB (88% экономии)
BE-4 читает: секция 0 + секция 8 = 5.5KB вместо 56KB (90% экономии)
```

### 3. Handoff вместо «изучи diff»

```
❌ ПЛОХО:
  contextInstructions:
    - Изучи, что уже сделано в предыдущих units
    - Прочитай diff и продолжи работу
  
  → Агент перечитывает весь diff (20K токенов)

✅ ХОРОШО:
  Handoff BE-1:
    Unit: BE-1 — schema + migration | Статус: done
    Изменённые файлы:
      - models/projects.py
      - alembic/versions/001_add_projects.py
    Verification: make test → 0 failed
    Отмеченные tasks: TASK-001, TASK-002
    Решения:
      - ProjectModel.slug использует unique index
      - Миграция создаёт idx_project_slug
    Остаток: repository (BE-2), API (BE-3), tests (BE-4)
  
  → Агент получает сжатое состояние (0.5K токенов)
  → Экономия: 20K → 0.5K = 97.5% экономии!
```

### 4. Точечный contextFiles

```
❌ ПЛОХО (BE-3):
  contextFiles:
    - proposal.md                               (12K)
    - design.md                                  (8K)
    - specs/projects/spec.md                     (5K)
    - services/backend/models/projects.py        (10K)
    - services/backend/repositories/projects.py  (8K)
    - services/backend/core/services/projects.py (12K)
    - services/backend/api/routes/projects.py    (15K)
  = 70K токенов

✅ ХОРОШО (BE-3):
  contextFiles:
    - design.md → ТОЛЬКО ## API Contracts        (2K)
    - specs/projects/spec.md → ТОЛЬКО ## API     (2K)
    - core/protocols/projects.py (интерфейс)     (1K)
    - api/routes/projects.py (создаём)           (0K)
  contextInstructions:
    - Создать api/routes/projects.py по protocol
    - НЕ читать models/ (уже есть после BE-1)
    - НЕ читать repositories/ (уже есть после BE-2)
  = 5K токенов
  
  → Экономия: 70K → 5K = 93% экономии!
```

---

## Quality Gate: экономия через lanes

```
❌ БЕЗ lanes (монолитный QG):

Router → QG-MONO:
  ├─ AGENTS.md (15K)
  ├─ quality_gate.md ВЕСЬ ФАЙЛ (27K)
  ├─ proposal.md (12K)
  ├─ design.md (8K)
  ├─ specs/** (15K)
  ├─ BE diff (40K)
  ├─ FE diff (30K)
  └─ все handoff'ы (8K)
  = 155K токенов

✅ С lanes (5 execution units):

Router → QG-BE:
  ├─ AGENTS.md → QG секция (3K)
  ├─ quality_gate.md → секция QG-BE (4K)
  ├─ design.md → ТОЛЬКО ## Test matrix (1K)
  ├─ BE diff paths (2K)
  └─ BE handoff'ы (2K)
  = 12K токенов

Router → QG-FE-AUTO:
  ├─ AGENTS.md → QG секция (3K)
  ├─ quality_gate.md → секция QG-FE-AUTO (3K)
  ├─ design.md → ТОЛЬКО ## Test matrix (1K)
  ├─ FE diff paths (1.5K)
  └─ FE handoff'ы (1.5K)
  = 10K токенов

Router → QG-CONTRACTS:
  ├─ AGENTS.md → QG секция (3K)
  ├─ quality_gate.md → секция QG-CONTRACTS (2K)
  ├─ design.md → ТОЛЬКО ## Architecture (2K)
  ├─ access matrix (1K)
  └─ specs diff (3K)
  = 11K токенов

Router → QG-LIVE:
  ├─ AGENTS.md → QG секция (3K)
  ├─ SMOKE scenarios (8K)
  └─ endpoint list (1K)
  = 12K токенов

Router → QG-SYNTH:
  ├─ AGENTS.md → QG секция (3K)
  ├─ findings summary (4K)
  └─ handoff'ы lanes (2K)
  = 9K токенов

ИТОГО на 5 lanes: 54K токенов
Экономия: 155K → 54K = 65% экономии!
```

---

## Circuit Breaker: split при превышении бюджета

```
Сценарий: unit превышает бюджет контекста

Router → BE-3 (API + access control):
  Оценка contextFiles: 85K токенов
  
  ⚠️  85K > 50K (бюджет execution unit)
  
  Router обязан разделить ДО делегирования:
  
  BE-3a: API endpoints (15K токенов)
  BE-3b: access control + decorators (20K токенов)

Agent BE-3a:
  Выполняет только API endpoints
  Возвращает handoff:
    Unit: BE-3a — API endpoints | Статус: done
    Остаток: access control (BE-3b)

Router → BE-3b (с handoff BE-3a)

✅ Оба units в пределах бюджета
```

---

## Мониторинг и валидация

```
Router обязан логировать перед каждым делегированием:

Delegation BE-2:
  contextFiles: 4 файла, ~7K токенов
  systemPrompt: AGENTS.md роль + backend.md секция 0+3, ~12K токенов
  handoff BE-1: ~0.5K токенов
  instructions: ~1K токенов
  ─────────────────────────────────────────────
  Итого: ~20.5K токенов
  Запас: 179.5K токенов (запас 89.75%)
  ✅ В ПРЕДЕЛАХ БЮДЖЕТА

Если итого > 150K:
  ❌ ПРЕВЫШЕН БЮДЖЕТ
  → unit делится ДО делегирования
```

---

## Итоговая схема workflow

```
OpenSpec Change (подтверждён)
  ↓
Router: планирование execution units с оценкой размера
  ├─ Каждый unit ≤ 150K токенов (оценка)
  ├─ contextFiles точечные (≤10 файлов)
  └─ handoff передаёт состояние между units
  ↓
Execution Units (последовательно):
  BE-1 (19K) → handoff → BE-2 (17.5K) → handoff → BE-3 (21.5K) → handoff → BE-4 (17.5K)
  ↓
Quality Gate Lanes (параллельно):
  QG-BE (12K) + QG-FE-AUTO (10K) + QG-CONTRACTS (11K)
  ↓
  QG-LIVE (12K)
  ↓
  QG-SYNTH (9K)
  ↓
✅ APPROVED / ❌ REWORK

ИТОГО: 130K токенов вместо 585K (78% экономии)
ВСЕ UNITS В ПРЕДЕЛАХ ЛИМИТА: max 21.5K << 200K
```

---

**Статус**: Обязательная схема для всех changes  
**Последнее обновление**: 2024-10-06  
**Связанные документы**: [`context-economy-patterns.md`](../../agents/howto/context-economy-patterns.md)
