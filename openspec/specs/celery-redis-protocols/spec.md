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
Каждый домен задач SHALL иметь свою именованную очередь. Очередь MUST быть зарегистрирована в `celery_app.conf.task_queues`. Default queue MUST быть указана явно. Разные сервисы MUST NOT разделять одну очередь и MUST NOT разделять одни и те же номера Redis DB для broker/backend.

#### Scenario: email-service имеет очередь email
- **WHEN** celery app email-service сконфигурирован
- **THEN** `task_queues` СОДЕРЖИТ очередь `email`, а `task_default_queue` РАВНА `email`

#### Scenario: vk-service имеет очередь vk
- **WHEN** celery app vk-service сконфигурирован
- **THEN** `task_queues` СОДЕРЖИТ очередь `vk`, `task_default_queue` РАВНА `vk`, а очередь `email` ОТСУТСТВУЕТ

#### Scenario: Очереди сервисов не пересекаются
- **WHEN** reviewer сверяет `celery_app.conf` и compose-команды воркеров email-service и vk-service
- **THEN** воркеры слушают разные очереди (`-Q email` и `-Q vk`), имеют разные `hostname` (`email-worker` и `vk-worker`) и разные номера Redis DB

### Requirement: Retry и обработка ошибок
Задачи Celery MUST использовать `autoretry_for` с указанными исключениями, `max_retries` и `retry_backoff`. После исчерпания ретраев задача SHALL логироваться как failed.

#### Scenario: Задача ретраится при таймауте SMTP
- **WHEN** задача email.send получает `smtplib.SMTPException`
- **THEN** задача ПОВТОРЯЕТСЯ до `max_retries` раз с exponential backoff

#### Scenario: Задача помечается как failed после ретраев
- **WHEN** все ретраи исчерпаны
- **THEN** задача ПЕРЕХОДИТ в состояние FAILURE и логируется ошибка

### Requirement: Celery worker readiness
Email Celery worker SHALL зависеть от healthy Redis и иметь стабильный nodename. Единственным readiness probe MUST быть адресный `celery inspect ping` для этого worker с ограниченным timeout; Quality Gate SHALL сохранять command, address, elapsed time, timeout outcome и Redis/worker logs.

#### Scenario: Worker готов
- **WHEN** Redis healthy и адресный inspect ping получает pong до timeout
- **THEN** worker считается ready

#### Scenario: Ping timeout или Redis unhealthy
- **WHEN** Redis unhealthy либо адресный ping не отвечает вовремя
- **THEN** readiness FAIL независимо от queue registration или других сигналов

#### Scenario: Queue/canary не подменяет readiness
- **WHEN** queue зарегистрирована или canary task выполнена
- **THEN** это не является обязательным readiness criterion и не заменяет адресный ping

### Requirement: Real Celery integration gate
Отдельный blocking integration suite SHALL на реальном Redis/Celery проверять enqueue→worker execution→result, retry/backoff/acks-late после временной ошибки, duplicate-event idempotency, восстановление после worker restart и безопасный DB session lifecycle при конкурентной обработке. Эти tests MUST NOT запускаться как readiness canary.

#### Scenario: Delivery и retry
- **WHEN** task поставлена в очередь и первая попытка получает временную ошибку
- **THEN** evidence подтверждает retry/backoff, единственный итоговый side effect и корректное result state

#### Scenario: Worker restart
- **WHEN** worker перезапускается во время pending/in-flight work
- **THEN** задача восстанавливается по acks-late contract без двойной отправки

#### Scenario: Concurrent session lifecycle
- **WHEN** несколько email tasks обрабатываются одновременно
- **THEN** repositories/sessions не разделяют небезопасное mutable transaction state

### Requirement: Доменное именование задач нового сервиса vk-service
Задачи `vk-service` MUST следовать формату `vk.<action>`. Сохранённая при инициализации задача-пробник MUST называться `vk.integration_probe` и MUST NOT переиспользовать имя `email.integration_probe`. `workers/tasks/__init__.py` MUST экспортировать только фактически существующие задачи сервиса.

#### Scenario: Пробник переименован под домен vk
- **WHEN** reviewer читает `services/vk-service/src/workers/tasks/integration_probe.py`
- **THEN** имя задачи РАВНО `vk.integration_probe`

#### Scenario: Экспорт задач соответствует файлам
- **WHEN** выполняется импорт `workers.tasks` в `vk-service`
- **THEN** импорт завершается успешно и `__all__` содержит только существующие задачи

### Requirement: Таблица очередей в agents/howto/celery-protocols.md актуальна

Раздел «Сервисы и их очереди» в `agents/howto/celery-protocols.md` MUST перечислять все сервисы EqSiteCMS, использующие Celery, включая `vk-service` с очередью `vk` и задачей `vk.integration_probe`. Требование нормативно закреплено шагом 2 раздела «Добавление нового сервиса с Celery/Redis» в `agents/backend.md`. Владельцем файла в рамках change является инфраструктурный владелец — тот же, что владеет `agents/redis-databases.yaml`.

#### Scenario: Новый сервис внесён в таблицу очередей

- **WHEN** reviewer читает раздел «Сервисы и их очереди» в `agents/howto/celery-protocols.md`
- **THEN** таблица содержит строку `vk-service` с очередью `vk` и задачей `vk.integration_probe`
- **AND** существующая строка `email-service` с очередью `email` сохранена

#### Scenario: Требование agents/backend.md выполнено полностью

- **WHEN** reviewer сверяет шаги раздела «Добавление нового сервиса с Celery/Redis» из `agents/backend.md` с фактическим diff
- **THEN** обновлены и `agents/redis-databases.yaml`, и `agents/howto/celery-protocols.md`, и `CelerySettings`, и `.env.example`, и DI-регистрация, и compose-воркер
