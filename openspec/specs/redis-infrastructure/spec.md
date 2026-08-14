# redis-infrastructure Specification

## Purpose
TBD - created by archiving change celery-redis-architecture. Update Purpose after archive.
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
Файл `agents/redis-databases.yaml` MUST существовать и содержать массив записей. Каждая запись MUST СОДЕРЖАТЬ поля: `db` (номер БД, integer), `service` (имя сервиса), `purpose` (назначение). БД 0 MUST быть зарезервирована с пометкой `reserved` и описанием "Кэш backend (пока не используется)".

#### Scenario: Файл содержит все текущие записи
- **WHEN** агент читает `agents/redis-databases.yaml`
- **THEN** файл СОДЕРЖИТ записи для: БД 0 (reserved, кэш backend), БД 1 (email-service, broker/очередь), БД 2 (email-service, backend/результаты)

#### Scenario: Нумерация начинается с 1 для сервисов
- **WHEN** новый сервис добавляется в Redis
- **THEN** ему назначаются БД начиная со следующего свободного номера после 2 (т.е. 3 и 4)

### Requirement: Инструкция в backend.md и quality_gate.md
Файлы `agents/backend.md` и `agents/quality_gate.md` MUST СОДЕРЖАТЬ инструкцию: при добавлении нового сервиса с Celery/Redis — обновлять `agents/redis-databases.yaml`, проверять отсутствие конфликтов нумерации.

#### Scenario: Backend agent проверяет redis-databases.yaml
- **WHEN** backend agent добавляет новый сервис с Celery
- **THEN** agent ЧИТАЕТ `agents/redis-databases.yaml` и ВЫБИРАЕТ следующий свободный номер БД

#### Scenario: Quality Gate проверяет актуальность redis-databases.yaml
- **WHEN** Quality Gate ревьюит change с Redis
- **THEN** quality_gate СВЕРЯЕТ номера БД в коде с `agents/redis-databases.yaml`

