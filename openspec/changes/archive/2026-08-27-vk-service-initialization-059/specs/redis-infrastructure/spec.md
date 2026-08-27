## MODIFIED Requirements

### Requirement: YAML-файл учёта БД Redis
Файл `agents/redis-databases.yaml` MUST существовать и содержать массив записей. Каждая запись MUST СОДЕРЖАТЬ поле номера БД, поле `service` (имя сервиса) и поле `purpose` (назначение). Фактическая конвенция файла для номера БД — `db_number` (integer); архивная редакция этого требования называла поле `db`, что не соответствовало файлу. Требование фиксирует фактическую конвенцию `db_number`; переименование ключа не выполняется и вынесено за scope, поскольку файл не парсится инструментами и является справочником для агентов. БД 0 MUST быть зарезервирована с пометкой `reserved` и описанием "Кэш backend (пока не используется)". Сервис `vk-service` MUST занимать БД 3 (broker, `CELERY_APP_BROKER`) и БД 4 (backend, `CELERY_APP_BACKEND`); комментарий о следующем свободном номере MUST быть обновлён на 5.

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
