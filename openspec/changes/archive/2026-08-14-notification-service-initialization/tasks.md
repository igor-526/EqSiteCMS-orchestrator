## 1. Database Models (SQLAlchemy)

- [x] 1.1 Создать модель `Channel` в `models/channel.py`
  - Поля: id (UUID), created_at, updated_at, code (15), name (31), description (511), is_active
  - Таблица: `notification_channels`

- [x] 1.2 Создать модель `Event` в `models/event.py`
  - Поля: id (UUID), created_at, updated_at, code (15), name (31), description (511), metadata (JSON), is_active
  - Таблица: `notification_events`

- [x] 1.3 Создать модель `UserNotificationSetting` в `models/user_notification_setting.py`
  - Поля: id (UUID), created_at, updated_at, user_id (UUID), action_id (UUID), channel_id (UUID)
  - Таблица: `user_notification_settings`
  - Foreign keys: action_id → notification_events.id, channel_id → notification_channels.id
  - Unique constraint: (user_id, action_id, channel_id)

- [x] 1.4 Обновить `models/__init__.py` с экспортом моделей

## 2. Database Migration & Seeding

- [x] 2.1 Создать миграцию `20260814_0001_create_notification_tables.py`
  - Создание таблиц: notification_channels, notification_events, user_notification_settings
  - Индексы: code (unique), user_id + action_id + channel_id (unique)

- [x] 2.2 Создать модуль сидирования (по аналогии с backend)
  - `utils/seeding/__init__.py`
  - `utils/seeding/seeders/__init__.py`
  - `utils/seeding/seeders/base_seeder.py` — абстрактный базовый класс (копия из backend)
  - `utils/seeding/seeders/simple_seeder.py` — generic seeder (копия из backend)
  - `utils/seeding/init_registry.py` — apply_migration + run_seeders_with_retry

- [x] 2.3 Создать entity классы для сидирования
  - `core/entities/channel.py` — ChannelEntity
  - `core/entities/event.py` — EventEntity

- [x] 2.4 Создать seed данные
  - `core/seeds/channels.py` — список каналов (email, vk, sms) с фиксированными UUID
  - `core/seeds/events.py` — событие callback_request с metadata

- [x] 2.5 Создать seeder классы
  - `utils/seeding/seeders/channel_seeder.py` — ChannelSeeder(SimpleSeeder[ChannelEntity])
  - `utils/seeding/seeders/event_seeder.py` — EventSeeder(SimpleSeeder[EventEntity])

- [x] 2.6 Обновить `_build_seeders` в `utils/seeding/init_registry.py`
  - Добавить ChannelSeeder и EventSeeder

## 3. Repositories

- [x] 3.1 Создать `repositories/base.py` с базовым `BaseRepository`
  - Методы: get_by_id, get_all, create, update, delete

- [x] 3.2 Создать `repositories/channel.py` с `ChannelRepository`
  - Методы: get_by_code, get_active_channels

- [x] 3.3 Создать `repositories/event.py` с `EventRepository`
  - Методы: get_by_code, get_active_events

- [x] 3.4 Создать `repositories/user_notification_setting.py` с `UserNotificationSettingRepository`
  - Методы: get_by_user_and_event, get_users_by_event

- [x] 3.5 Обновить `repositories/__init__.py` с экспортом репозиториев

## 4. Service Layer

- [x] 4.1 Создать `core/services/notification_orchestrator.py` с `NotificationOrchestratorService`
  - Метод: `process_event(event_code, payload)`
  - Логика:
    1. Получить событие из БД по коду
    2. Получить equestrian_id из payload
    3. Получить пользователей от main backend
    4. Получить настройки пользователей из БД
    5. Найти активные каналы
    6. Для каждого канала: найти обработчик, сформировать уведомление, отправить команду

- [x] 4.2 Создать `core/services/event_handler_registry.py` с `EventHandlerRegistry`
  - Registry для маппинга event_code → handler_class
  - Метод: `get_handler(event_code)`

- [x] 4.3 Создать `core/services/handlers/callback_handler.py` с `CallbackEventHandler`
  - Реализация `EventHandler` интерфейса
  - Метод: `format_notification(channel_code, payload)`
  - Форматирование email для callback_request

- [x] 4.4 Обновить `core/services/callback_request.py`
  - Интеграция с `NotificationOrchestratorService`
  - Удаление хардкода email
  - Получение email из настроек пользователя

- [x] 4.5 Обновить `core/services/__init__.py` с экспортом сервисов

## 5. DI Container

- [x] 5.1 Обновить `containers/database.py` с подключением к PostgreSQL
  - AsyncSession factory
  - Репозитории как Singleton

- [x] 5.2 Обновить `containers/application.py`
  - Регистрация репозиториев
  - Регистрация сервисов
  - Регистрация обработчиков

## 6. NATS Integration

- [x] 6.1 Обновить `clients/nats/handlers/callback_request.py`
  - Интеграция с `NotificationOrchestratorService`
  - Удаление прямого вызова `CallbackRequestService`

- [x] 6.2 Обновить `clients/nats/consumers/callback_request.py`
  - Обновление DI зависимостей

## 7. Settings & Configuration

- [x] 7.1 Обновить `settings.py`
  - Добавить `NotificationServiceSettings` с настройками для notification-service
  - DATABASE_URL, MAIN_BACKEND_URL, MAIN_BACKEND_SERVICE_KEY

- [x] 7.2 Создать `.env.example` с примерами переменных окружения

## 8. Testing

- [x] 8.1 Создать `tests/unit/repositories/test_channel_repository.py`
  - Тесты CRUD операций
  - Тесты get_by_code, get_active_channels

- [x] 8.2 Создать `tests/unit/services/test_notification_orchestrator.py`
  - Тесты пайплайна обработки событий
  - Mock зависимостей

- [x] 8.3 Создать `tests/integration/test_callback_flow.py`
  - Интеграционный тест полного пайплайна
  - Mock main backend

## 9. Documentation

- [x] 9.1 Обновить `README.md` с описанием notification-service
  - Архитектура, настройка, запуск

- [x] 9.2 Создать `docs/notification-service.md` с детальным описанием
  - Модели, репозитории, сервисы, обработчики
