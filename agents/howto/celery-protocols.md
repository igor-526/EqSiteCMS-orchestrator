# Celery Protocols

## Обзор

Документ описывает протоколы и паттерны работы с Celery в экосистеме EqSiteCMS. Включает архитектуру, конфигурацию, Dependency Injection, определение задач и best practices.

## Архитектура

### Потоки задач

```mermaid
flowchart LR
    A[API / NATS Consumer] -->|publish task| B[Redis\nBroker\n(очередь)]
    B -->|consume| C[Celery\nWorker]
    C -->|execute| D[Send Email / Background Job]
    C -->|store result| E[Redis\nBackend\n(результаты)]
```

### Назначение

- **Celery** — система асинхронной обработки задач в очереди. Используется для email-отправки, фоновых операций и отложенных вычислений.
- **Redis** — брокер сообщений (очередь задач) и backend (хранение результатов).
- **NATS** — остаётся основной системой обмена событиями между сервисами. Celery — параллельная независимая система для задач в очереди.

### Сервисы и их очереди

| Сервис | Очередь | Задачи |
|--------|---------|--------|
| `email-service` | `email` | `send_email_task` |

## Конфигурация

### Структура настроек

Все настройки Celery должны находиться в отдельном классе `CelerySettings` (по аналогии с `NatsSettings`).

```python
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class CelerySettings(BaseSettings):
    celery_app_main: str = Field(
        default="email-service",
        alias="CELERY_APP_MAIN",
    )
    celery_app_broker: str = Field(
        default="redis://:<password>@redis:6379/1",
        alias="CELERY_APP_BROKER",
    )
    celery_app_backend: str = Field(
        default="redis://:<password>@redis:6379/2",
        alias="CELERY_APP_BACKEND",
    )

    model_config = SettingsConfigDict(
        populate_by_name=True,
    )
```

### Обязательные поля

| Поле | Alias | Описание | Значение по умолчанию |
|------|-------|----------|----------------------|
| `celery_app_main` | `CELERY_APP_MAIN` | Имя приложения Celery (совпадает с именем сервиса) | `email-service` |
| `celery_app_broker` | `CELERY_APP_BROKER` | URL Redis для broker (очередь) | `redis://:<password>@redis:6379/1` |
| `celery_app_backend` | `CELERY_APP_BACKEND` | URL Redis для backend (результаты) | `redis://:<password>@redis:6379/2` |

### Правила выбора БД Redis

Смотрите [`agents/redis-databases.yaml`](../redis-databases.yaml) для актуального распределения номеров БД.

- **БД 0** — зарезервирована (кэш backend, пока не используется)
- **БД 1** — broker для email-service
- **БД 2** — backend для email-service
- Каждый новый сервис, использующий Celery, получает 2 БД (broker + backend)

## Переменные окружения

Переменные окружения для Celery/Redis должны быть вынесены в `.env.example` сервиса.

```env
# CELERY SETTINGS
CELERY_APP_MAIN=email-service
CELERY_APP_BROKER=redis://:<password>@redis:6379/1
CELERY_APP_BACKEND=redis://:<password>@redis:6379/2

# REDIS (для подключения к Redis с паролем)
REDIS_PASSWORD=<your-redis-password>
```

### Формат URL Redis с паролем

```
redis://:<password>@redis:6379/<db_number>
```

## Celery App

### Базовая конфигурация

```python
from celery import Celery
from kombu import Queue
from settings import celery_app_settings

celery_app = Celery(
    celery_app_settings.celery_app_main,
    broker=celery_app_settings.celery_app_broker,
    backend=celery_app_settings.celery_app_backend,
)

# Очереди
celery_app.conf.task_queues = (
    Queue("email"),
)
celery_app.conf.task_default_queue = "email"

# Сериализация
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]

# Надёжность
celery_app.conf.task_expires = 3600        # TTL задач — 1 час
celery_app.conf.task_acks_late = True       # ack после выполнения
celery_app.conf.worker_prefetch_multiplier = 1  # fair scheduling

# Autodiscovery
celery_app.autodiscover_tasks(["workers.tasks"])
```

### Обязательные настройки

| Параметр | Значение | Назначение |
|----------|----------|------------|
| `task_serializer` | `json` | Сериализация задач |
| `result_serializer` | `json` | Сериализация результатов |
| `accept_content` | `["json"]` | Только JSON |
| `task_expires` | `3600` | TTL задач — 1 час |
| `task_acks_late` | `True` | Ack после выполнения, не при получении |
| `worker_prefetch_multiplier` | `1` | Fair scheduling — по одной задаче за раз |

## DI-интеграция

Celery app регистрируется в DI-контейнере через `dependency-injector` как `providers.Singleton`.

```python
from dependency_injector import containers, providers
from settings import celery_app_settings_instance
from workers.celery_app import celery_app


class ApplicationContainer(containers.DeclarativeContainer):
    # ... существующие провайдеры ...

    celery_settings = providers.Object(celery_app_settings_instance)
    celery_app = providers.Singleton(
        lambda: celery_app,
    )
```

**Примечание:** `celery_app` создаётся как модульный singleton и передаётся в контейнер. DI-контейнер не пересоздаёт его, а оборачивает для унифицированного доступа.

## Задачи (Tasks)

### Структура файлов

```text
src/workers/
├── __init__.py
├── celery_app.py          # Celery app instance
└── tasks/
    ├── __init__.py         # пакет задач
    └── email.py            # @shared_task для отправки email
```

### Naming convention

Имена задач следуют формату `<domain>.<action>`:

- `email.send` — отправка email

Имя сервиса уже содержится в `celery_app_main` и не дублируется.

### Пример задачи

```python
from celery import shared_task
from core.services import NotificationCommandSendEmailService


@shared_task(
    bind=True,
    name="email.send",
    autoretry_for=(Exception,),
    max_retries=3,
    retry_backoff=True,
)
def send_email_task(self, recipient: str, subject: str, body: str) -> dict:
    """Отправка email через очередь."""
    service = NotificationCommandSendEmailService()
    result = service.process_sync(recipient=recipient, subject=subject, body=body)
    return {"status": "sent", "recipient": recipient}
```

### Обязательные параметры декоратора

| Параметр | Значение | Назначение |
|----------|----------|------------|
| `bind=True` | передаёт `self` | Доступ к retry через `self.retry()` |
| `autoretry_for` | `(Exception,)` | Автоматический retry при любой ошибке |
| `max_retries` | `3` | Максимум 3 попытки |
| `retry_backoff` | `True` | Экспоненциальная задержка между retry |

### Autodiscovery

Все задачи из `src/workers/tasks/*.py` автоматически регистрируются через:

```python
celery_app.autodiscover_tasks(["workers.tasks"])
```

## Структура файлов

### Общая для всех сервисов

```text
<service>/
├── src/
│   ├── settings.py            # CelerySettings + celery_app_settings
│   ├── containers/
│   │   └── application.py     # DI: celery_app как Singleton
│   └── workers/
│       ├── __init__.py
│       ├── celery_app.py      # Celery app конфигурация
│       └── tasks/
│           ├── __init__.py
│           └── email.py       # Задачи домена email
├── .env.example               # CELERY_APP_MAIN, CELERY_APP_BROKER, CELERY_APP_BACKEND
├── Dockerfile                 # CMD для celery worker
└── README.md                  # Секция Celery
```

### Docker-compose

```yaml
celery-worker:
  build:
    context: ../services/<service>
    dockerfile: Dockerfile
  image: eqsitecms-<service>-celery:latest
  container_name: eqsitecms-<service>-celery-worker
  restart: always
  env_file:
    - path: ../services/<service>/.env
      required: true
  command: celery -A workers.celery_app worker -Q <queue> -l info
  depends_on:
    redis:
      condition: service_started
  networks:
    - eqsitecms_network
```

## Лучшие практики

1. **Одна очередь на домен** — не смешивайте задачи разных доменов в одной очереди.
2. **JSON-сериализация** — не используйте pickle из соображений безопасности.
3. **task_acks_late=True** — гарантирует, что задача не потеряется при падении worker.
4. **task_expires** — устанавливайте TTL на задачи, чтобы не допускать накопления устаревших задач.
5. **Изоляция БД Redis** — каждому сервису выделяются 2 БД (broker + backend), см. `agents/redis-databases.yaml`.
6. **Не смешивайте NATS и Celery** — NATS для событий между сервисами, Celery для фоновых задач в очереди.

## Readiness и real integration acceptance

Readiness worker проверяется только адресным `celery inspect ping --destination <stable-node>` с ограниченным внешним и Celery timeout. Stable nodename задаётся явно; stdout/stderr сохраняются как evidence. Queue inspection, отправка canary-задачи или наличие процесса не заменяют readiness.

Отдельный blocking real Redis/Celery gate проверяет delivery, retry, `acks_late`, duplicate idempotency, worker restart/redelivery и concurrent repository/session lifecycle. Он использует реальные Redis и worker, уникальные ресурсы, bounded waits и cleanup. Default unit suite может исключать marker `infrastructure`, но canonical integration command обязан FAIL, а не skip, при отсутствии обязательного env/infra.
7. **Structured logging** — логируйте task_id, имя задачи, статус, длительность.
8. **DI-контейнер** — регистрируйте celery_app через dependency-injector для тестируемости.
