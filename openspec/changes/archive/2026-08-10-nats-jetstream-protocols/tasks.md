## 1. Исправление архитектуры NATS в основном backend

- [x] 1.1 Создать контейнер Dependency Injector для NATS Jetstream клиента в `services/backend/src/containers/`
- [x] 1.2 Обновить `services/backend/src/main.py` для использования DI контейнера вместо `app.state.nats_client`
- [x] 1.3 Обновить `services/backend/src/depends/utils.py` для получения NATS клиента из DI контейнера
- [x] 1.4 Обновить `services/backend/src/depends/publishers.py` для использования DI контейнера
- [x] 1.5 Проверить работоспособность исправленной архитектуры

## 2. Стандартизация NATS конфигурации

- [x] 2.1 Проверить соответствие `services/backend/src/settings.py` требованиям к `NatsSettings` с префиксом `NATS_`
- [x] 2.2 При необходимости обновить настройки NATS в соответствии с требованиями спецификации
- [x] 2.3 Проверить совместимость с настройками в notification-service и email-service

## 3. Обновление инструкций backend агента

- [x] 3.1 Добавить секцию по NATS Jetstream в `agents/backend.md`
- [x] 3.2 Включить правила работы с NATS Jetstream в инструкции агента
- [x] 3.3 Добавить примеры корректной реализации NATS Jetstream

## 4. Документирование протоколов NATS Jetstream

- [x] 4.1 Создать документацию по протоколам NATS Jetstream в `docs/nats-jetstream-protocols.md`
- [x] 4.2 Включить примеры кода для публикации и потребления сообщений
- [x] 4.3 Документировать настройку streams и consumers
- [x] 4.4 Добавить примеры Dependency Injection для NATS компонентов

## 5. Тестирование и валидация

- [x] 5.1 Проверить работоспособность NATS Jetstream в основном backend
- [x] 5.2 Проверить совместимость с notification-service и email-service
- [x] 5.3 Запустить существующие тесты для проверки обратной совместимости
- [x] 5.4 Проверить соответствие спецификациям OpenSpec
