## MODIFIED Requirements

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

## ADDED Requirements

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
