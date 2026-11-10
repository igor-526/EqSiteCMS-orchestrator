# redis-infrastructure Specification

## Purpose
Зафиксировать инфраструктурное размещение Redis в Docker Compose с парольным доступом и сохранением данных, необходимые переменные окружения и единый справочник распределения БД между сервисами, включая резервирование номеров и проверку отсутствия конфликтов агентами Backend и Quality Gate.
## Requirements
### Requirement: Redis в инфраструктурном docker compose
Сервис Redis MUST быть добавлен в `.docker-compose/docker-compose.infra.yml`. Образ SHALL быть `redis:7-alpine` (последняя стабильная версия). Контейнер MUST использовать паролевой доступ через `--requirepass`. Контейнер MUST быть в сети `eqsitecms_network`. Данные MUST персиститься в volume `eqsitecms_redis_data`.

#### Scenario: Redis запускается с паролем
- **WHEN** выполняется `docker compose -f docker-compose.infra.yml up redis`
- **THEN** контейнер `eqsitecms-redis` ЗАПУСКАЕТСЯ, ДОСТУПЕН на порту из `EXPOSE_REDIS_PORT`, ТРЕБУЕТ пароль из `REDIS_PASSWORD`

#### Scenario: Redis персистит данные
- **WHEN** контейнер Redis перезапущен
- **THEN** данные СОХРАНЯЮТСЯ в volume `eqsitecms_redis_data`

### Requirement: Переменные окружения Redis в .docker-compose/.env
Файл `.docker-compose/.env` MUST СОДЕРЖАТЬ переменные: `REDIS_PASSWORD` (пароль Redis) и `EXPOSE_REDIS_PORT` (внешний порт, по умолчанию `6379`).

#### Scenario: Переменные присутствуют в .env
- **WHEN** администратор открывает `.docker-compose/.env`
- **THEN** файл СОДЕРЖИТ `REDIS_PASSWORD=<значение>` и `EXPOSE_REDIS_PORT=6379`

### Requirement: YAML-файл учёта БД Redis
Файл `agents/redis-databases.yaml` MUST содержать справочник распределения БД Redis с конвенцией `db_number`, резервированием БД 0 и непересекающимися номерами сервисов согласно сценариям; переименование ключа остаётся вне scope.

#### Scenario: Файл содержит все текущие записи
- **WHEN** агент читает `agents/redis-databases.yaml`
- **THEN** файл СОДЕРЖИТ записи для: БД 0 (reserved, кэш backend), БД 1 (email-service, broker/очередь), БД 2 (email-service, backend/результаты), БД 3 (vk-service, broker/очередь), БД 4 (vk-service, backend/результаты)

#### Scenario: Нумерация начинается с 1 для сервисов
- **WHEN** новый сервис добавляется в Redis
- **THEN** ему назначаются БД начиная со следующего свободного номера после 4 (т.е. 5 и 6)

#### Scenario: Конвенция ключей файла сохранена

- **WHEN** reviewer читает `agents/redis-databases.yaml`
- **THEN** номер БД записан ключом `db_number`, единообразно во всех записях
- **AND** несогласованного переименования ключа в рамках этого change не производилось

#### Scenario: Номера БД не пересекаются между сервисами
- **WHEN** reviewer сверяет `agents/redis-databases.yaml` с фактическими `CELERY_APP_BROKER` и `CELERY_APP_BACKEND` в `services/email-service/.env.example` и `services/vk-service/.env.example`
- **THEN** email-service использует только БД 1 и 2, vk-service — только БД 3 и 4, пересечений нет

#### Scenario: Полный контракт справочника и границы изменения
- **WHEN** reviewer проверяет структуру и распределение БД в `agents/redis-databases.yaml`
- **THEN** Файл `agents/redis-databases.yaml` MUST существовать и содержать массив записей.
- **AND** Каждая запись MUST СОДЕРЖАТЬ поле номера БД, поле `service` (имя сервиса) и поле `purpose` (назначение).
- **AND** Фактическая конвенция файла для номера БД — `db_number` (integer); архивная редакция этого требования называла поле `db`, что не соответствовало файлу.
- **AND** Требование фиксирует фактическую конвенцию `db_number`; переименование ключа не выполняется и вынесено за scope, поскольку файл не парсится инструментами и является справочником для агентов.
- **AND** БД 0 MUST быть зарезервирована с пометкой `reserved` и описанием "Кэш backend (пока не используется)".
- **AND** Сервис `vk-service` MUST занимать БД 3 (broker, `CELERY_APP_BROKER`) и БД 4 (backend, `CELERY_APP_BACKEND`); комментарий о следующем свободном номере MUST быть обновлён на 5.

### Requirement: Инструкция в backend.md и quality_gate.md
Файлы `agents/backend.md` и `agents/quality_gate.md` MUST СОДЕРЖАТЬ инструкцию: при добавлении нового сервиса с Celery/Redis — обновлять `agents/redis-databases.yaml`, проверять отсутствие конфликтов нумерации.

#### Scenario: Backend agent проверяет redis-databases.yaml
- **WHEN** backend agent добавляет новый сервис с Celery
- **THEN** agent ЧИТАЕТ `agents/redis-databases.yaml` и ВЫБИРАЕТ следующий свободный номер БД

#### Scenario: Quality Gate проверяет актуальность redis-databases.yaml
- **WHEN** Quality Gate ревьюит change с Redis
- **THEN** quality_gate СВЕРЯЕТ номера БД в коде с `agents/redis-databases.yaml`

