## Why

Текущий notification-service имеет базовую структуру (FastAPI + NATS клиент), но не реализует бизнес-логику обработки уведомлений. Миграция пустая, модели и репозитории не реализованы. Существующий код обработки callback_request жёстко привязан к email-каналу с хардкодом email-адреса.

**Проблема:**
- Нет моделей БД для хранения каналов, событий и настроек пользователей
- Нет репозиторного слоя для работы с данными
- Нет сервисного слоя для поиска адресатов и каналов
- Нет обработчиков событий, привязанных к БД
- Хардкод email-адреса вместо динамического поиска

**Решение:** Реализовать полноценный notification-service с:
- Моделями SQLAlchemy для channels, events, user_notification_settings
- Миграцией Alembic для создания таблиц
- Сидированием данных через SimpleSeeder (по аналогии с backend)
- Репозиторным слоем для CRUD операций
- Сервисным слоем для пайплайна обработки событий
- Обработчиком callback-событий с интеграцией в БД

## What Changes

### Новые компоненты:
1. **Модели SQLAlchemy** (`models/`):
   - `Channel` — каналы доставки (email, vk, sms)
   - `Event` — события с метаданными для валидации
   - `UserNotificationSetting` — настройки уведомлений пользователей

2. **Миграция Alembic**:
   - Создание таблиц channels, events, user_notification_settings

3. **Сидирование данных** (по аналогии с backend):
   - `utils/seeding/seeders/base_seeder.py` — абстрактный базовый класс
   - `utils/seeding/seeders/simple_seeder.py` — generic seeder
   - `utils/seeding/init_registry.py` — apply_migration + run_seeders_with_retry
   - `core/seeds/channels.py` — seed данные каналов
   - `core/seeds/events.py` — seed данные событий
   - `utils/seeding/seeders/channel_seeder.py` — ChannelSeeder
   - `utils/seeding/seeders/event_seeder.py` — EventSeeder

4. **Entity классы** (`core/entities/`):
   - `ChannelEntity` — entity для сидирования каналов
   - `EventEntity` — entity для сидирования событий

5. **Репозитории** (`repositories/`):
   - `ChannelRepository` — CRUD для каналов
   - `EventRepository` — CRUD для событий
   - `UserNotificationSettingRepository` — CRUD для настроек

6. **Сервисный слой** (`core/services/`):
   - `NotificationOrchestratorService` — оркестрация пайплайна обработки событий
   - `EventHandlerRegistry` — registry для обработчиков событий
   - `CallbackEventHandler` — обработчик callback_request

7. **Обновление callback_request.py**:
   - Интеграция с БД вместо хардкода
   - Получение email из настроек пользователя

8. **Обновление DI-контейнера** (`containers/application.py`):
   - Регистрация репозиториев и сервисов

### Модифицированные компоненты:
- `settings.py` — добавление настроек БД для notification-service
- `main.py` — инициализация БД подключения и сидирования
- `clients/nats/` — обновление консьюмеров и хэндлеров

## Capabilities

### New Capabilities
- `notification-database-models`: SQLAlchemy модели для channels, events, user_notification_settings
- `notification-repositories`: Репозиторный слой для работы с данными уведомлений
- `notification-orchestrator`: Сервис оркестрации пайплайна обработки событий
- `notification-seed-data`: Сидирование начальных данных (каналы, событие callback)
- `notification-event-handlers`: Обработчики событий по registry паттерну

### Modified Capabilities
- `notification-callback-handler`: Обновление обработчика callback для работы с БД вместо хардкода

## Impact

### Затронутый код:
- `services/notification-service/src/models/` — новые модели
- `services/notification-service/src/repositories/` — новые репозитории
- `services/notification-service/src/core/services/` — обновление callback_request.py + новый orchestrator
- `services/notification-service/src/utils/seeding/` — модуль сидирования
- `services/notification-service/src/core/seeds/` — seed данные
- `services/notification-service/src/core/entities/` — entity классы
- `services/notification-service/src/containers/application.py` — обновление DI
- `services/notification-service/src/clients/nats/` — обновление хэндлеров

### Зависимости:
- SQLAlchemy (уже установлена)
- Alembic (уже установлена)
- asyncpg (уже установлена)

### Риски:
- Изменение схемы БД требует миграции
- Необходимость синхронизации с main backend для получения пользователей
