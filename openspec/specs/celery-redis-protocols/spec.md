# celery-redis-protocols Specification

## Purpose
TBD - created by archiving change celery-redis-architecture. Update Purpose after archive.
## Requirements
### Requirement: Протокол Celery в agents/howto
Файл `agents/howto/celery-protocols.md` MUST содержать архитектурный протокол использования Celery в микросервисах EqSiteCMS. Протокол SHALL включать: архитектуру (диаграмма потоков), структуру настроек (`CelerySettings`), переменные окружения, реализацию Celery app, DI-интеграцию, определение задач, naming conventions, best practices и структуру файлов.

#### Scenario: Протокол существует и содержит все секции
- **WHEN** агент читает `agents/howto/celery-protocols.md`
- **THEN** файл СОДЕРЖИТ секции: Архитектура, Конфигурация, Переменные окружения, Celery App, DI-интеграция, Задачи (Tasks), Структура файлов, Лучшие практики

#### Scenario: Протокол ссылается на redis-databases.yaml
- **WHEN** агент читает протокол Celery
- **THEN** протокол СОДЕРЖИТ ссылку на `agents/redis-databases.yaml` как на источник нумерации БД Redis

### Requirement: Настройки Celery в отдельном классе
Каждый сервис, использующий Celery, SHALL выносить настройки в отдельный Pydantic-класс `CelerySettings` с префиксом `CELERY_`. Класс MUST включать поля: `celery_app_main`, `celery_app_broker`, `celery_app_backend`. Класс MUST использовать `SettingsConfigDict(populate_by_name=True)`.

#### Scenario: CelerySettings содержит обязательные поля
- **WHEN** приложение импортирует `CelerySettings`
- **THEN** класс СОДЕРЖИТ поля `celery_app_main` (alias `CELERY_APP_MAIN`), `celery_app_broker` (alias `CELERY_APP_BROKER`), `celery_app_backend` (alias `CELERY_APP_BACKEND`)

#### Scenario: Значения по умолчанию указывают на Redis
- **WHEN** переменные окружения не заданы
- **THEN** `celery_app_broker` ИМЕЕТ значение `redis://:<password>@redis:6379/1`, а `celery_app_backend` ИМЕЕТ значение `redis://:<password>@redis:6379/2`

### Requirement: DI-интеграция Celery app
Celery app MUST быть зарегистрирован как `providers.Singleton` в `ApplicationContainer` сервиса. CelerySettings SHALL инжектироваться отдельно от основных `Settings`.

#### Scenario: Celery app доступен через DI-контейнер
- **WHEN** контейнер инициализирован
- **THEN** `container.celery_app()` ВОЗВРАЩАЕТ экземпляр Celery с корректной конфигурацией

### Requirement: Задачи Celery в workers/tasks/
Задачи Celery MUST определяться в `src/workers/tasks/` с отдельным файлом на домен. Задачи SHALL использовать декоратор `@shared_task` или явную регистрацию через `celery_app.task()`. Autodiscovery MUST быть настроен через `celery_app.autodiscover_tasks()`.

#### Scenario: Задачи автодискаверятся
- **WHEN** celery worker запускается
- **THEN** все задачи из `src/workers/tasks/*.py` РЕГИСТРИРУЮТСЯ автоматически

### Requirement: Naming convention для задач
Имена задач Celery MUST следовать формату `<domain>.<action>` (например, `email.send`). Имя сервиса уже содержится в `celery_app_main` и не дублируется.

#### Scenario: Имя задачи email-сервиса
- **WHEN** определена задача отправки email в email-service
- **THEN** имя задачи ИМЕЕТ формат `email.send`

### Requirement: Очереди по доменам
Каждый домен задач SHALL иметь свою именованную очередь. Очередь MUST быть зарегистрирована в `celery_app.conf.task_queues`. Default queue MUST быть указана явно.

#### Scenario: email-service имеет очередь email
- **WHEN** celery app email-service сконфигурирован
- **THEN** `task_queues` СОДЕРЖИТ очередь `email`, а `task_default_queue` РАВНА `email`

### Requirement: Retry и обработка ошибок
Задачи Celery MUST использовать `autoretry_for` с указанными исключениями, `max_retries` и `retry_backoff`. После исчерпания ретраев задача SHALL логироваться как failed.

#### Scenario: Задача ретраится при таймауте SMTP
- **WHEN** задача email.send получает `smtplib.SMTPException`
- **THEN** задача ПОВТОРЯЕТСЯ до `max_retries` раз с exponential backoff

#### Scenario: Задача помечается как failed после ретраев
- **WHEN** все ретраи исчерпаны
- **THEN** задача ПЕРЕХОДИТ в состояние FAILURE и логируется ошибка

