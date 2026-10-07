# Howto инструкции — справочник

Эта папка содержит детальные протоколы для конкретных технологий и ситуаций.

## Обязательные протоколы (читаются всегда)

### [`context-economy-patterns.md`](context-economy-patterns.md)
**Кто читает**: Router перед каждым делегированием  
**Когда**: Всегда, при любом делегировании  
**Цель**: Предотвращение превышения лимита 200K токенов

**Ключевые принципы**:
- Read-Once: OpenSpec артефакты читаются один раз на change
- Точечный contextFiles (≤10 файлов)
- Handoff как канал состояния (≤1K токенов)
- Circuit Breaker при превышении бюджета

**Экономия**: до 90% токенов на повторных чтениях

---

## Технологические протоколы (по необходимости)

### [`nats-jetstream-protocols.md`](nats-jetstream-protocols.md)
**Кто читает**: Backend, Quality Gate  
**Когда**: Работа с NATS Jetstream (messaging, events)  
**Цель**: Корректная реализация pub/sub, streams, consumers

### [`site-ksk-inlove-design.md`](site-ksk-inlove-design.md)
**Кто читает**: Site Consumer  
**Когда**: Работа с `services/site-ksk-inlove/**`  
**Цель**: Соблюдение дизайн-протокола INLOVE (схема, компоненты, визуальная спецификация)

### [`browser-qa-protocol.md`](browser-qa-protocol.md)
**Кто читает**: Quality Gate, Router  
**Когда**: Frontend diff с UI changes без E2E-покрытия  
**Цель**: Разделение QG-FE на автоматизированную и manual части

**Workflow**:
- `QG-FE-AUTO` → автоматизированные проверки (агент)
- `QG-FE-MANUAL` → QA checklist для пользователя (если применимо)

---

## Как использовать

1. **Router**: всегда читай `context-economy-patterns.md` перед делегированием
2. **Агенты**: читай только протоколы, относящиеся к твоей задаче
3. **Quality Gate**: читай `browser-qa-protocol.md` при frontend diff

---

## Добавление новых протоколов

При создании нового howto:

1. Назови файл по технологии/ситуации: `<tech>-protocols.md` или `<situation>-protocol.md`
2. Обнови этот `README.md` с описанием
3. Обнови `AGENTS.md` → секция «Howto инструкции»
4. Укажи:
   - Кто читает
   - Когда применимо
   - Цель
   - Ключевые правила

---

**Статус**: Активный справочник  
**Последнее обновление**: 2024-10-06
