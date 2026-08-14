# notification-seed-data

## Описание

Модуль сидирования начальных данных для notification-service. Реализован по аналогии с backend проектом.

## Архитектура

### Компоненты

1. **BaseSeeder** (`utils/seeding/seeders/base_seeder.py`)
   - Абстрактный базовый класс
   - Методы: `prepare()`, `fetch_existing()`, `diff()`, `create_missing()`

2. **SimpleSeeder** (`utils/seeding/seeders/simple_seeder.py`)
   - Generic seeder для простых случаев
   - Дженерик параметр `T: Entity`
   - Дедупликация по `id` поля

3. **ChannelSeeder** (`utils/seeding/seeders/channel_seeder.py`)
   - Наследник `SimpleSeeder[ChannelEntity]`
   - Сидирует каналы: email, vk, sms

4. **EventSeeder** (`utils/seeding/seeders/event_seeder.py`)
   - Наследник `SimpleSeeder[EventEntity]`
   - Сидирует событие callback_request

5. **init_registry** (`utils/seeding/init_registry.py`)
   - `apply_migration()` — накат миграций с retry
   - `run_seeders_with_retry()` — запуск seeder'ов с retry
   - `_build_seeders()` — фабрика seeder'ов

## Seed данные

### Каналы (core/seeds/channels.py)

```python
CHANNEL_SEEDS = [
    ChannelEntity(
        id=UUID("..."),  # фиксированный UUID
        code="email",
        name="Электронная почта",
        description="Доставка уведомлений на электронную почту пользователя",
        is_active=True,
    ),
    ChannelEntity(
        id=UUID("..."),
        code="vk",
        name="VK",
        description="Доставка уведомлений от бота в социальную сеть VK",
        is_active=True,
    ),
    ChannelEntity(
        id=UUID("..."),
        code="sms",
        name="СМС",
        description="Доставка СМС сообщений на мобильный номер телефона",
        is_active=True,
    ),
]
```

### События (core/seeds/events.py)

```python
EVENT_SEEDS = [
    EventEntity(
        id=UUID("..."),
        code="callback",
        name="Обратный звонок",
        description="Обработка формы заявки на обратный звонок",
        metadata={
            "phone": {"required": True, "type": "phone_number"},
            "comment": {"required": False, "type": "string"},
            "equestrian_id": {"required": True, "type": "uuid4"},
        },
        is_active=True,
    ),
]
```

## Инициализация

### В main.py

```python
from utils.seeding.init_registry import init_registry

@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_registry()
    # ... остальная инициализация
```

### В DI-контейнере

Не требуется — сидирование происходит в lifespan приложения.

## Дедупликация

SimpleSeeder проверяет существование записей по `id`:
1. `prepare()` — возвращает список seed данных
2. `fetch_existing()` — загружает существующие записи по списку id
3. `diff()` — вычисляет разницу
4. `create_missing()` — вставляет недостающие записи

## Retry логика

- `apply_migration()` — до 5 попыток с exponential backoff
- `run_seeders_with_retry()` — до 5 попыток с exponential backoff
- Конфигурация через env: `INIT_REGISTRY_TIMEOUT`, `INIT_REGISTRY_MAX_ATTEMPTS`, `INIT_REGISTRY_BACKOFF_SECONDS`
