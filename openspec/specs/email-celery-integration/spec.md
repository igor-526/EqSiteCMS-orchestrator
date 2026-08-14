# email-celery-integration Specification

## Purpose
TBD - created by archiving change celery-redis-architecture. Update Purpose after archive.
## Requirements
### Requirement: Настройки Celery в .env.example email-service
Файл `services/email-service/.env.example` MUST СОДЕРЖАТЬ секцию `# CELERY SETTINGS` с переменными: `CELERY_APP_MAIN`, `CELERY_APP_BROKER`, `CELERY_APP_BACKEND`, `REDIS_PASSWORD`. Значения по умолчанию SHALL указывать на Redis с БД 1 (broker) и БД 2 (backend).

#### Scenario: .env.example содержит настройки Celery
- **WHEN** разработчик копирует `.env.example` в `.env`
- **THEN** файл СОДЕРЖИТ `CELERY_APP_MAIN=email-service`, `CELERY_APP_BROKER=redis://:<password>@redis:6379/1`, `CELERY_APP_BACKEND=redis://:<password>@redis:6379/2`

### Requirement: CelerySettings в settings.py
Файл `services/email-service/src/settings.py` MUST СОДЕРЖАТЬ класс `CelerySettings` (по аналогии с `NatsSettings`). Класс SHALL инжектироваться в `celery_app_settings` как глобальный singleton.

#### Scenario: CelerySettings инициализируется из env
- **WHEN** приложение стартует
- **THEN** `celery_app_settings.celery_app_broker` СОДЕРЖИТ значение из `CELERY_APP_BROKER`

### Requirement: Полноценная конфигурация celery_app.py
Файл `services/email-service/src/workers/celery_app.py` MUST СОДЕРЖАТЬ: создание Celery app, регистрацию очередей (`email`), настройку `task_default_queue`, `task_serializer`, `result_serializer`, `accept_content`, `task_expires`, `task_acks_late`, `worker_prefetch_multiplier`.

#### Scenario: Celery app сконфигурирован с очередью email
- **WHEN** celery worker запускается
- **THEN** worker СЛУШАЕТ очередь `email`, сериализация ИСПОЛЬЗУЕТ `json`, `task_expires` РАВЕН 3600

#### Scenario: Задачи ack после выполнения
- **WHEN** задача завершена
- **THEN** `task_acks_late=True` ОЗНАЧАЕТ, что ack отправляется после выполнения, а не при получении

### Requirement: Задача отправки email
Файл `services/email-service/src/workers/tasks/email.py` MUST СОДЕРЖАТЬ задачу `send_email_task` с декоратором `@shared_task`. Задача MUST принимать `recipient`, `subject`, `body` и вызывать email-отправку. Задача SHALL использовать `autoretry_for` с `max_retries=3` и `retry_backoff=True`.

#### Scenario: Задача отправляет email
- **WHEN** задача `send_email_task` вызвана с валидными параметрами
- **THEN** email ОТПРАВЛЯЕТСЯ на указанный `recipient`

#### Scenario: Задача ретраится при ошибке SMTP
- **WHEN** SMTP-сервер недоступен
- **THEN** задача ПОВТОРЯЕТСЯ до 3 раз с exponential backoff

### Requirement: DI-контейнер email-service регистрирует Celery
Файл `services/email-service/src/containers/application.py` MUST СОДЕРЖАТЬ `celery_app` как `providers.Singleton` с инжекцией `CelerySettings`.

#### Scenario: Celery app доступен через контейнер
- **WHEN** контейнер инициализирован
- **THEN** `container.celery_app()` ВОЗВРАЩАЕТ сконфигурированный Celery app

### Requirement: Docker-compose запускает celery-worker
docker-compose email-service MUST СОДЕРЖАТЬ сервис `celery-worker`, который запускает `celery -A workers.celery_app worker -Q email -l info`.

#### Scenario: docker-compose запускает celery-worker
- **WHEN** выполняется `docker compose -f docker-compose.email.yml up`
- **THEN** СУЩЕСТВУЕТ сервис `celery-worker`, который запускает `celery -A workers.celery_app worker -Q email -l info`

### Requirement: README.md email-service содержит секцию Celery
README.md email-service MUST СОДЕРЖАТЬ секцию "Celery" с описанием: назначение очередей, команды запуска worker, переменные окружения.

#### Scenario: README содержит команды запуска worker
- **WHEN** разработчик читает README
- **THEN** README СОДЕРЖИТ команду `celery -A workers.celery_app worker -Q email -l info`

