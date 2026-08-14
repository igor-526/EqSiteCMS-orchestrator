## Why

Проект EqSiteCMS добавляет асинхронную обработку задач через Celery. Первый сервис — `email-service` — будет использовать Celery для отправки email через очередь. Текущая реализация содержит черновой код (`workers/celery_app.py`) без архитектурного протокола, без Redis в инфраструктуре, без документации и без учёта БД Redis. Необходимо спроектировать архитектуру Celery+Redis для микросервисов, зафиксировать протоколы использования (по аналогии с NATS), поднять Redis в инфраструктурном docker compose и создать инструмент учёта БД Redis.

## What Changes

- **Создание протокола Celery** — файл `agents/howto/celery-protocols.md` по аналогии с `nats-jetstream-protocols.md`: архитектура, настройки, DI, очереди, best practices.
- **Создание YAML-файла учёта БД Redis** — `agents/redis-databases.yaml` с перечнем номеров БД, сервисов и назначений.
- **Redis в инфраструктурном docker compose** — добавление сервиса Redis в `.docker-compose/docker-compose.infra.yml` с паролем, последней стабильной версией, volume и сетью.
- **Переменные окружения Redis** — добавление `REDIS_PASSWORD` и `EXPOSE_REDIS_PORT` в `.docker-compose/.env`.
- **Настройки Celery в `.env.example` email-service** — перенос `CELERY_APP_MAIN`, `CELERY_APP_BROKER`, `CELERY_APP_BACKEND`, `REDIS_PASSWORD` в `.env.example`.
- **Доработка `workers/celery_app.py`** — полноценная конфигурация Celery app с очередями, retry, serialization, task routes.
- **Обновление `settings.py` email-service** — добавление `CelerySettings` с валидацией URL Redis и номеров БД.
- **DI-интеграция** — регистрация Celery app в `ApplicationContainer` email-service.
- **Определение задач Celery** — задача `send_email_task` в `workers/tasks/email.py` с retry и error handling.
- **Обновление README.md email-service** — секция об очередях Celery, командах запуска worker/beat.
- **Обновление Dockerfile email-service** — добавление команды запуска Celery worker.
- **Обновление docker-compose.email.yml** — добавление сервиса celery-worker.

## Capabilities

### New Capabilities
- `celery-redis-protocols`: Архитектура и протоколы использования Celery в микросервисах EqSiteCMS: конфигурация, DI, очереди, naming conventions, SOLID-принципы, best practices.
- `redis-infrastructure`: Инфраструктурный Redis в docker compose, паролевой доступ, переменные окружения, учёт БД в YAML-файле.
- `email-celery-integration`: Интеграция Celery в email-service: задачи отправки email, очереди, worker, DI-контейнер.

### Modified Capabilities
<!-- Нет затронутых существующих capabilities -->

## Impact

- **Инфраструктура**: новый контейнер Redis в `.docker-compose/docker-compose.infra.yml`, новый volume `eqsitecms_redis_data`.
- **email-service**: изменения в `settings.py`, `workers/celery_app.py`, `containers/application.py`, `.env.example`, `README.md`, `Dockerfile`, `docker-compose.yaml`.
- **Агенты**: новый `agents/howto/celery-protocols.md`, новый `agents/redis-databases.yaml`, обновление `agents/backend.md` и `agents/quality_gate.md` (ссылки на redis-databases.yaml).
- **Инфраструктурный docker compose**: обновление `.docker-compose/docker-compose.email.yml` с celery-worker сервисом.
- **Зависимости**: `celery[redis]` уже в `pyproject.toml` email-service.
