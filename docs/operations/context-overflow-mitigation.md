# Решение проблемы превышения лимита токенов (201034 > 200000)

## Проблема

В процессе реализации пайплайна сервисов возникли две проблемы:

1. **Manual QA в браузере**: Quality Gate lane `QG-FE` требовал manual проверку UI, но субагент не может открыть браузер.
2. **Превышение лимита токенов**: `400 {"error": "prompt is too long: 201034 tokens > 200000 maximum"}` в архивированных сессиях dsh.

## Причины превышения лимита

1. **Повторное чтение одного и того же контекста** в каждом execution unit
2. **Монолитные contextFiles**: агенты получали «прочитай весь change» вместо точечных файлов
3. **Перечитывание профильных .md**: каждый unit читал весь `backend.md` (56KB), `frontend.md` и т.д.
4. **Отсутствие handoff-based state transfer**: вместо короткого handoff агенты «изучали, что уже сделано» по полному diff
5. **Недостаточное дробление execution units**: большие блоки работы в одном запуске

## Решение

### 1. Паттерны экономии контекста

Создан обязательный протокол [`agents/howto/context-economy-patterns.md`](../../agents/howto/context-economy-patterns.md):

**Ключевые принципы**:
- **Read-Once Principle**: OpenSpec артефакты читаются один раз на change
- **Layered Context Pack**: контекст делится на слои (Core → Blueprint → Execution → Code)
- **Точечный contextFiles**: только файлы, которые unit реально меняет (≤10 файлов)
- **Handoff как канал состояния**: короткий блок (≤1K токенов) вместо «изучи diff»
- **Circuit Breaker**: если unit не помещается в контекст, агент возвращает `partial` со split-предложением

**Экономия**: до 90% токенов на повторных чтениях.

**Пример**:
```
Без экономии (4 backend units): 330K токенов
С экономией (4 backend units):   33.5K токенов
```

### 2. Browser QA Protocol

Создан протокол [`agents/howto/browser-qa-protocol.md`](../../agents/howto/browser-qa-protocol.md):

**`QG-FE` разделён на два execution units**:

1. **`QG-FE-AUTO`** (агент):
   - `npm test`, `lint`, `tsc --noEmit`, `build`
   - Playwright/Puppeteer E2E (если есть)
   - Возвращает handoff с флагом `требуется QG-FE-MANUAL: да/нет`

2. **`QG-FE-MANUAL`** (пользователь, если применимо):
   - Делегируется через QA checklist с конкретными сценариями
   - Применим только при UI diff без E2E-покрытия
   - Пользователь отвечает вердиктом `APPROVED` / `REWORK`

**Workflow**:
```
QG-FE-AUTO (агент)
    ↓
    ├─ done + manual QA не требуется → QG-SYNTH
    │
    └─ done + manual QA требуется → QA checklist → пользователь
           ↓
           ├─ APPROVED → QG-SYNTH
           └─ REWORK → FE-FIX execution units
```

### 3. Обновлённые инструкции

**`AGENTS.md`**:
- Добавлена ссылка на `context-economy-patterns.md` как **обязательное** чтение Router перед делегированием
- Добавлена ссылка на `browser-qa-protocol.md` для Quality Gate

**`agents/quality_gate.md`**:
- Обновлена lane-таблица: `QG-FE` → `QG-FE-AUTO` + `QG-FE-MANUAL`
- Добавлены правила делегирования manual QA
- Обновлён формат handoff `QG-FE-AUTO`
- Обновлён формат отчёта `QG-SYNTH` для учёта `QG-FE-MANUAL`

---

## Применение

### Для Router (перед каждым делегированием)

1. **Прочитай** `agents/howto/context-economy-patterns.md` — **обязательно**
2. Проверь чеклист экономии контекста:
   - [ ] `contextFiles` точечные (≤10 файлов на unit)
   - [ ] Нет формулировок «прочитай весь change», «изучи proposal.md»
   - [ ] Передан handoff предыдущего unit (или явно указано, что предыдущего нет)
   - [ ] Агенту указано, какие секции `design.md` и профильного .md читать
   - [ ] Оценка delegation prompt ≤ 150K токенов (запас на ответ)
3. Если оценка превышает 150K — раздели unit **до** делегирования

### Для Quality Gate (при наличии frontend diff)

1. **Прочитай** `agents/howto/browser-qa-protocol.md`
2. Запусти `QG-FE-AUTO`:
   - Автоматизированные проверки
   - Определи, требуется ли `QG-FE-MANUAL`
   - Верни handoff с флагом
3. Если `QG-FE-MANUAL` применим:
   - Router создаёт QA checklist для пользователя
   - Останавливается до получения ответа
   - Передаёт результат в `QG-SYNTH`

### Для профильных агентов

1. Читай свой профильный .md **по «Протоколу чтения»**:
   - Секция 0 (Core) всегда
   - Только секции, относящиеся к твоему unit
2. **Не** перечитывай весь файл в каждом unit
3. Если unit не помещается в бюджет контекста:
   - Выполни безопасную атомарную часть
   - Верни `partial` со split-предложением
   - **Не** пытайся доделать героически

---

## Валидация

После применения паттернов Router обязан подтвердить:

✅ Ни один execution unit не превышает лимит 200K токенов  
✅ Повторное чтение одних и тех же артефактов устранено  
✅ Каждый handoff короткий (≤1K токенов)  
✅ `contextFiles` точечные (≤10 файлов на unit)  
✅ Агенты читают профильные .md по «Протоколу чтения» (секции, а не весь файл)  
✅ `QG-FE` разделён на `QG-FE-AUTO` + `QG-FE-MANUAL` (если применимо)  

---

## Дальнейшие шаги

1. **Immediate**: применить паттерны во всех новых changes
2. **Short-term**: добавить «Протокол чтения» во все профильные .md (`backend.md`, `frontend.md`, `site_consumer.md`)
3. **Medium-term**: автоматизировать оценку размера delegation prompt в Router
4. **Long-term**: создать E2E-покрытие для устранения `QG-FE-MANUAL` в большинстве cases

---

## Связанные документы

- [`agents/howto/context-economy-patterns.md`](../../agents/howto/context-economy-patterns.md) — паттерны экономии контекста
- [`agents/howto/browser-qa-protocol.md`](../../agents/howto/browser-qa-protocol.md) — протокол manual QA
- [`AGENTS.md`](../../AGENTS.md) — обновлённая архитектура агентов
- [`agents/quality_gate.md`](../../agents/quality_gate.md) — обновлённый Quality Gate

---

**Дата создания**: 2024-10-06  
**Статус**: Активно, обязательно к применению  
**Автор**: Router Agent  
