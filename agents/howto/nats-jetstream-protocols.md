# NATS Jetstream Protocols

## Обзор

Документ описывает протоколы и паттерны работы с NATS Jetstream в экосистеме EqSiteCMS. Включает архитектуру, конфигурацию, Dependency Injection, публикацию и потребление сообщений.

## Архитектура

### Потоки сообщений

```mermaid
flowchart LR
    A[Backend\n(Publisher)] -->|SITE_EVENTS| B[Notification\nService\n(Pub/Sub)]
    B -->|NOTIFICATION_COMMANDS| C[Email\nService\n(Consumer)]
```

### Сервисы и их роли

| Сервис | Роль | Streams | Subjects |
|--------|------|---------|----------|
| `backend` | Publisher | SITE_EVENTS | `events.site.*` |
| `notification-service` | Pub/Sub | SITE_EVENTS, NOTIFICATION_COMMANDS | `events.site.callback.requested`, `commands.notification.email.send` |
| `email-service` | Consumer | NOTIFICATION_COMMANDS | `commands.notification.email.send` |

## Конфигурация

### Структура настроек

Все настройки NATS Jetstream должны находиться в отдельном классе `NatsSettings` с префиксом `NATS_`.

```python
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class NatsSettings(BaseSettings):
    # Базовые настройки
    nats_servers_raw: str = Field(
        default="nats://localhost:4222",
        alias="NATS_SERVERS",
    )

    @property
    def nats_servers(self) -> list[str]:
        if self.nats_servers_raw.strip():
            return [server.strip() for server in self.nats_servers_raw.split(",") if server.strip()]
        return ["nats://localhost:4222"]

    # Streams
    nats_stream_site_events: str = Field(
        default="SITE_EVENTS",
        alias="NATS_STREAM_SITE_EVENTS",
    )
    nats_stream_notification_commands: str = Field(
        default="NOTIFICATION_COMMANDS",
        alias="NATS_STREAM_NOTIFICATION_COMMANDS",
    )

    # Subjects
    nats_subject_callback_requested: str = Field(
        default="events.site.callback.requested",
        alias="NATS_SUBJECT_CALLBACK_REQUESTED",
    )
    nats_subject_notification_commands_send_email: str = Field(
        default="commands.notification.email.send",
        alias="NATS_SUBJECT_NOTIFICATION_COMMANDS_SEND_EMAIL",
    )

    # Consumers
    nats_consumer_callback_requested: str = Field(
        default="notification-service-callback-requested",
        alias="NATS_CONSUMER_CALLBACK_REQUESTED",
    )

    # Delivery settings
    nats_consumer_ack_wait_seconds: int = Field(
        default=30,
        alias="NATS_CONSUMER_ACK_WAIT_SECONDS",
        ge=1,
    )
    nats_consumer_max_deliver: int = Field(
        default=5,
        alias="NATS_CONSUMER_MAX_DELIVER",
        ge=1,
    )

    model_config = SettingsConfigDict(populate_by_name=True)
```

### Переменные окружения

| Переменная | Описание | Значение по умолчанию |
|------------|----------|----------------------|
| `NATS_SERVERS` | Список серверов NATS (через запятую) | `nats://localhost:4222` |
| `NATS_STREAM_SITE_EVENTS` | Имя stream для событий сайта | `SITE_EVENTS` |
| `NATS_STREAM_NOTIFICATION_COMMANDS` | Имя stream для команд уведомлений | `NOTIFICATION_COMMANDS` |
| `NATS_SUBJECT_CALLBACK_REQUESTED` | Subject для событий обратного звонка | `events.site.callback.requested` |
| `NATS_SUBJECT_NOTIFICATION_COMMANDS_SEND_EMAIL` | Subject для команд отправки email | `commands.notification.email.send` |
| `NATS_CONSUMER_CALLBACK_REQUESTED` | Durable имя consumer | `notification-service-callback-requested` |
| `NATS_CONSUMER_ACK_WAIT_SECONDS` | Время ожидания ack (секунды) | `30` |
| `NATS_CONSUMER_MAX_DELIVER` | Максимум попыток доставки | `5` |

## NATS Jetstream Client

### Реализация клиента

```python
from nats import NATS
from nats.js import JetStreamContext
from nats.js.api import PubAck

from settings import NatsSettings


class NatsJetstreamClient:
    def __init__(self, settings: NatsSettings) -> None:
        self._settings = settings
        self._connection: NATS | None = None
        self._jetstream: JetStreamContext | None = None

    @property
    def is_connected(self) -> bool:
        return self._connection is not None and self._connection.is_connected

    def _get_jetstream(self) -> JetStreamContext:
        if self._jetstream is None or not self.is_connected:
            raise RuntimeError("NATS JetStream client is not connected")
        return self._jetstream

    @property
    def jetstream(self) -> JetStreamContext:
        return self._get_jetstream()

    async def connect(self) -> None:
        if self.is_connected:
            return

        self._connection = NATS()
        await self._connection.connect(
            servers=self._settings.nats_servers,
            name="service-name",  # Уникальное имя сервиса
            connect_timeout=5,
            reconnect_time_wait=2,
            max_reconnect_attempts=-1,
        )
        self._jetstream = self._connection.jetstream()

    async def close(self) -> None:
        if self._connection is None:
            return

        try:
            if not self._connection.is_closed:
                await self._connection.drain()
        finally:
            self._connection = None
            self._jetstream = None

    async def setup(self) -> None:
        """Создаёт и актуализирует инфраструктуру JetStream."""
        if not self.is_connected:
            raise RuntimeError("NATS client must be connected before setup")

        await self.setup_streams()
        await self.setup_consumers()

    async def setup_streams(self) -> None:
        # Реализация в наследниках
        pass

    async def setup_consumers(self) -> None:
        # Реализация в наследниках
        pass

    async def publish(
        self,
        *,
        subject: str,
        payload: bytes,
        headers: dict[str, str] | None = None,
    ) -> PubAck:
        jetstream = self._get_jetstream()
        return await jetstream.publish(
            subject=subject,
            payload=payload,
            headers=headers,
        )
```

## Dependency Injection

### Правильный паттерн

**НЕ храните контейнер в `app.state`!** Контейнер создаётся как модульный singleton.

```python
# containers/application.py
from dependency_injector import containers, providers

from clients.nats import NatsJetstreamClient
from clients.nats.publisher import CallbackRequestEventPublisher
from settings import nats_settings as nats_settings_instance


class ApplicationContainer(containers.DeclarativeContainer):
    nats_settings = providers.Object(nats_settings_instance)

    nats_client = providers.Singleton(
        NatsJetstreamClient,
        settings=nats_settings,
    )

    callback_request_event_publisher = providers.Singleton(
        CallbackRequestEventPublisher,
        client=nats_client,
        settings=nats_settings,
    )
```

```python
# containers/__init__.py
from .application import ApplicationContainer

# Создаём модульный singleton
container = ApplicationContainer()
```

### Использование в main.py

```python
# main.py
from containers import container  # Импортируем готовый экземпляр

@asynccontextmanager
async def lifespan(_: FastAPI):
    nats_client = container.nats_client()
    
    await nats_client.connect()
    await nats_client.setup()
    
    try:
        yield
    finally:
        await nats_client.close()


app = FastAPI(lifespan=lifespan)
```

### Получение зависимостей

```python
# depends/utils.py
from containers import container  # Импортируем модульный singleton

async def get_nats_client() -> NatsJetstreamClient:
    return container.nats_client()


# depends/publishers.py
from containers import container

def get_callback_request_event_publisher() -> CallbackRequestEventPublisher:
    return container.callback_request_event_publisher()
```

## Publishing (Публикация событий)

### Базовый Publisher

```python
from uuid import UUID

from clients.nats.client import NatsJetstreamClient
from core.schemas.messaging import MessagingBaseEventData, MessagingEvent
from settings import NatsSettings


class NatsEventPublisher:
    def __init__(
        self,
        *,
        client: NatsJetstreamClient,
        settings: NatsSettings,
    ) -> None:
        self._client = client
        self._settings = settings

    async def _publish_event(
        self,
        *,
        event: MessagingEvent,
        payload: MessagingBaseEventData,
        headers: dict[str, str] | None = None,
    ) -> None:
        completed_headers = {
            "Nats-Msg-Id": str(event.event_id),
        }
        if headers is not None:
            completed_headers.update(headers)

        await self._client.publish(
            subject=event.event_subject,
            payload=payload.model_dump_json().encode("utf-8"),
            headers=completed_headers,
        )
```

### Специализированный Publisher

```python
from clients.nats.client import NatsJetstreamClient
from core.schemas.messaging import CallbackRequestedData, MessagingEvent
from settings import NatsSettings


class CallbackRequestEventPublisher(NatsEventPublisher):
    def __init__(
        self,
        *,
        client: NatsJetstreamClient,
        settings: NatsSettings,
    ) -> None:
        super().__init__(client=client, settings=settings)

    async def publish(
        self,
        *,
        payload: CallbackRequestedData,
        equestrian_id: UUID,
    ) -> UUID:
        event = MessagingEvent(
            event_subject=self._settings.nats_subject_callback_requested,
        )
        await self._publish_event(
            event=event,
            payload=payload,
            headers={"X-Equestrian-Id": str(equestrian_id)},
        )
        return event.event_id
```

## Consuming (Потребление сообщений)

### Consumer с Pull-подпиской

```python
import asyncio
import logging

from nats.aio.msg import Msg
from nats.errors import TimeoutError

from clients.nats.client import NatsJetstreamClient
from core.protocols.messaging.handlers.callback_request import CallbackRequestHandlerProtocol
from settings import NatsSettings

logger = logging.getLogger(__name__)


class CallbackRequestConsumer:
    def __init__(
        self,
        *,
        client: NatsJetstreamClient,
        settings: NatsSettings,
        handler: CallbackRequestHandlerProtocol,
    ) -> None:
        self._client = client
        self._settings = settings
        self._handler = handler
        self._task: asyncio.Task[None] | None = None

    @property
    def is_running(self) -> bool:
        return self._task is not None and not self._task.done()

    async def start(self) -> None:
        if self.is_running:
            return

        self._subscription = await self._client.jetstream.pull_subscribe(
            subject=self._settings.nats_subject_callback_requested,
            durable=self._settings.nats_consumer_callback_requested,
            stream=self._settings.nats_stream_site_events,
        )

        self._task = asyncio.create_task(
            self._consume(),
            name="callback-request-consumer",
        )

    async def stop(self) -> None:
        if self._task is None:
            return

        self._task.cancel()
        try:
            await self._task
        except asyncio.CancelledError:
            pass
        finally:
            self._task = None
            self._subscription = None

    async def _consume(self) -> None:
        subscription = await self._client.jetstream.pull_subscribe(
            subject=self._settings.nats_subject_callback_requested,
            durable=self._settings.nats_consumer_callback_requested,
            stream=self._settings.nats_stream_site_events,
        )

        while True:
            try:
                messages = await subscription.fetch(
                    batch=self._settings.nats_consumer_fetch_batch_size,
                    timeout=self._settings.nats_consumer_fetch_timeout_seconds,
                )
            except TimeoutError:
                continue
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Failed to fetch NATS messages")
                await asyncio.sleep(1)
                continue

            for message in messages:
                await self._process_message(message)

    async def _process_message(self, message: Msg) -> None:
        headers = dict(message.headers) if message.headers is not None else {}

        try:
            await self._handler.handle(
                payload=message.data,
                headers=headers,
            )
        except Exception:
            logger.exception("Failed to process callback request message")
            await message.nak()
            return

        await message.ack()
```

### Handler

```python
import logging
import uuid

from core.schemas.messaging import CallbackRequestedData
from core.services import CallbackRequestService

logger = logging.getLogger(__name__)


class CallbackRequestHandler:
    def __init__(
        self,
        *,
        service: CallbackRequestService,
    ) -> None:
        self._service = service

    async def handle(
        self,
        *,
        payload: bytes,
        headers: dict[str, str],
    ) -> None:
        event_data = CallbackRequestedData.model_validate_json(payload)

        try:
            equestrian_id = uuid.UUID(headers.get("X-Equestrian-Id"))
        except ValueError as ex:
            raise ValueError("Can't parse Equestrian UUID") from ex

        await self._service.process(
            payload=event_data,
            equestrian_id=equestrian_id,
        )
```

## Schemas (Схемы данных)

### Базовое событие

```python
import uuid

from pydantic import BaseModel, Field


class MessagingEvent(BaseModel):
    event_id: uuid.UUID = Field(default_factory=uuid.uuid4, description="UUID события")
    event_subject: str = Field(default="site.callback.requested", description="Тип события")
```

### Базовые данные события

```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MessagingBaseEventData(BaseModel):
    occurred_at: datetime = Field(default_factory=datetime.now, description="Когда произошло событие")

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )
```

### Данные обратного звонка

```python
import uuid

from pydantic import Field

from core.schemas.messaging.base_event_data import MessagingBaseEventData


class CallbackRequestedData(MessagingBaseEventData):
    callback_request_id: uuid.UUID = Field(..., description="UUID заявки на обратный звонок")
    name: str | None = Field(default=None, description="Имя заявителя")
    comment: str | None = Field(default=None, description="Комментарий заявителя")
    phone: str = Field(..., description="Контактный номер телефона")
```

## Streams и Consumers

### Настройка Streams

```python
from nats.js.api import RetentionPolicy, StorageType, StreamConfig


async def setup_site_events_stream(self) -> None:
    jetstream = self._get_jetstream()

    config = StreamConfig(
        name=self._settings.nats_stream_site_events,
        subjects=self._settings.nats_subjects_site_events,
        storage=StorageType.FILE,
        retention=RetentionPolicy.LIMITS,
    )

    await jetstream.add_stream(config=config)


async def setup_notification_commands_stream(self) -> None:
    jetstream = self._get_jetstream()

    config = StreamConfig(
        name=self._settings.nats_stream_notification_commands,
        subjects=self._settings.nats_subjects_notification_commands,
        storage=StorageType.FILE,
        retention=RetentionPolicy.LIMITS,
    )

    await jetstream.add_stream(config=config)
```

### Настройка Consumers

```python
from nats.js.api import AckPolicy, ConsumerConfig, DeliverPolicy


async def setup_callback_requested_consumer(self) -> None:
    jetstream = self._get_jetstream()

    await jetstream.add_consumer(
        stream=self._settings.nats_stream_site_events,
        config=ConsumerConfig(
            durable_name=self._settings.nats_consumer_callback_requested,
            filter_subject=self._settings.nats_subject_callback_requested,
            deliver_policy=DeliverPolicy.ALL,
            ack_policy=AckPolicy.EXPLICIT,
            ack_wait=self._settings.nats_consumer_ack_wait_seconds,
            max_deliver=self._settings.nats_consumer_max_deliver,
        ),
    )
```

## Структура файлов

### Backend (Publisher)

```
services/backend/src/
├── clients/
│   └── nats/
│       ├── __init__.py
│       ├── client.py              # NatsJetstreamClient
│       └── publisher.py           # CallbackRequestEventPublisher
├── containers/
│   ├── __init__.py                # container = ApplicationContainer()
│   └── application.py             # ApplicationContainer
├── core/
│   └── schemas/
│       └── messaging/
│           ├── __init__.py
│           ├── base_event_data.py # MessagingBaseEventData
│           ├── callback_requested.py # CallbackRequestedData
│           └── event.py           # MessagingEvent
├── depends/
│   ├── utils.py                   # get_nats_client (импортирует container)
│   └── publishers.py              # get_callback_request_event_publisher (импортирует container)
└── settings.py                    # NatsSettings
```

### Notification Service (Pub/Sub)

```
services/notification-service/src/
├── clients/
│   └── nats/
│       ├── __init__.py
│       ├── client.py              # NatsJetstreamClient
│       ├── publisher.py           # NotificationCommandsSendEmailEventPublisher
│       ├── consumers/
│       │   ├── __init__.py
│       │   └── callback_request.py # CallbackRequestConsumer
│       └── handlers/
│           ├── __init__.py
│           └── callback_request.py # CallbackRequestHandler
├── containers/
│   ├── __init__.py
│   └── application.py             # ApplicationContainer
└── settings.py                    # NatsSettings
```

### Email Service (Consumer)

```
services/email-service/src/
├── clients/
│   └── nats/
│       ├── __init__.py
│       ├── client.py              # NatsJetstreamClient
│       └── consumers/
│           ├── __init__.py
│           └── notification_commands_send_email.py # NotificationCommandsSendEmailConsumer
├── containers/
│   ├── __init__.py
│   └── application.py             # ApplicationContainer
└── settings.py                    # NatsSettings
```

## Протоколы взаимодействия

### Публикация события обратного звонка

1. Backend получает `POST /api/callback_requests`
2. Создает `CallbackRequestedData` с данными заявки
3. Через `CallbackRequestEventPublisher` публикует в stream `SITE_EVENTS`
4. Subject: `events.site.callback.requested`
5. Headers: `Nats-Msg-Id` (UUID), `X-Equestrian-Id` (UUID)

### Обработка события в Notification Service

1. `CallbackRequestConsumer` слушает subject `events.site.callback.requested`
2. Получает сообщение через pull-подписку
3. `CallbackRequestHandler` обрабатывает сообщение
4. Создает `NotificationCommandSendEmailData`
5. Через `NotificationCommandsSendEmailEventPublisher` публикует в stream `NOTIFICATION_COMMANDS`
6. Subject: `commands.notification.email.send`

### Отправка email в Email Service

1. `NotificationCommandsSendEmailConsumer` слушает subject `commands.notification.email.send`
2. Получает сообщение через pull-подписку
3. `NotificationCommandsSendEmailHandler` обрабатывает сообщение
4. Отправляет email через `NotificationCommandSendEmailService`

## Документирование в README.md

Каждый сервис, использующий NATS JetStream, **обязан** содержать в своём `README.md` секцию **«NATS JetStream»**.

### Требования к секции

1. **Таблица streams/subjects/consumers** — перечисляет все streams и subjects, с которыми работает сервис.
2. **Описание назначения** — кратко поясняет, зачем сервис использует данный stream/subject.
3. **Роль сервиса** — Publisher, Consumer или Pub/Sub.

### Формат таблицы

| Колонка | Описание |
|---------|----------|
| **Stream** | Имя JetStream-потока (например, `SITE_EVENTS`) |
| **Subject** | Топик сообщений (например, `events.site.callback.requested`) |
| **Назначение** | Краткое описание бизнес-смысла сообщений |
| **Роль** | `входящий` (сервис потребляет) / `исходящий` (сервис публикует) |

### Пример

```markdown
## NATS JetStream

| Stream | Subject | Назначение | Роль |
|--------|---------|------------|------|
| SITE_EVENTS | events.site.callback.requested | Публикация события запроса обратного звонка | исходящий |
| NOTIFICATION_COMMANDS | commands.notification.email.send | Команда на отправку email | входящий |

## Real-broker acceptance gate

Canonical AsyncAPI и runtime config должны совпадать по stream, subject, durable, filter и payload/header contract. Blocking integration gate использует реальный NATS JetStream без mocked broker и проверяет создание/lookup stream, durable/filter, explicit ack, nak/redelivery, max-deliver, duplicate idempotency и backend→notification→email compatibility. Ресурсы имеют уникальные имена, bounded timeout и обязательный cleanup.

Default unit suite может исключать marker `infrastructure`. Однако canonical real-broker command обязан завершаться ошибкой при отсутствии env, NATS или JetStream; skip/absence не является PASS и не может использоваться как release evidence. Любая требуемая смена topology (subject/stream/durable/filter/payload) требует обновления OpenSpec/AsyncAPI и повторного approval до runtime-изменений.
```
## Лучшие практики

### 1. Используйте Dependency Injection

Всегда используйте DI контейнер для управления NATS компонентами. **НЕ храните контейнер в `app.state`!**

### 2. Идемпотентность

Используйте `Nats-Msg-Id` header для обеспечения идемпотентности публикации.

### 3. Ack/Nak для consumers

Всегда отправляйте `ack` после успешной обработки и `nak` при ошибке.

### 4. Обработка ошибок

Используйте retry с exponential backoff для обработки временных ошибок.

### 5. Мониторинг

Логируйте все операции с NATS для отладки и мониторинга.

### 6. Конфигурация

Выносите все настройки NATS в отдельный класс `NatsSettings` с префиксом `NATS_`.
