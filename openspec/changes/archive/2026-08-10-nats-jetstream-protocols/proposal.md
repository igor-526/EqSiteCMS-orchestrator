## Why

Текущая реализация NATS Jetstream в основном backend использует `app.state.nats_client` вместо Dependency Injector, что нарушает архитектурные паттерны проекта и не соответствует SOLID принципам. Также отсутствует стандартизированная документация по работе с NATS Jetstream, что может привести к несогласованности реализации между сервисами.

## What Changes

- **Исправление архитектурной ошибки**: Замена `app.state.nats_client` на Dependency Injector в основном backend
- **Стандартизация протоколов**: Создание документации по корректной работе с NATS Jetstream
- **Обновление инструкций агента**: Добавление правил работы с NATS в файл backend агента
- **Создание нового capability**: Документирование протоколов NATS Jetstream как отдельной спецификации

## Capabilities

### New Capabilities

- `nats-jetstream-protocols`: Документирование протоколов и паттернов работы с NATS Jetstream включая настройку, Dependency Injection, публикацию и потребление событий

### Modified Capabilities

- `backend-domain-capabilities`: Добавление NATS Jetstream как инфраструктурной capability с требованиями к DI и конфигурации

## Impact

- **Код**: `services/backend/src/main.py`, `services/backend/src/depends/utils.py`, `services/backend/src/depends/publishers.py`
- **Агенты**: `agents/backend.md` - добавление секции по NATS Jetstream
- **Спецификации**: Новая спецификация `nats-jetstream-protocols`, обновление `backend-domain-capabilities`
- **Зависимости**: Требуется проверка совместимости с существующими NATS клиентами в notification-service и email-service
