# email-database-models Specification

## Purpose
Модели данных и репозитории для PostgreSQL — таблица email_logs, миграции, CRUD операции.

## ADDED Requirements

### Requirement: Таблица email_logs
MUST создать таблицу `email_logs` с полями: `id` (UUID, PK), `event_uuid` (UUID, UNIQUE), `to` (JSON array), `subject` (String), `body` (Text), `cc` (JSON array, nullable), `bcc` (JSON array, nullable), `reply_to` (String, nullable), `from_name` (String, nullable), `from_email` (String, nullable), `status` (String: pending/sent/failed), `error_message` (Text, nullable), `attempts` (Integer, default 0), `created_at` (DateTime), `sent_at` (DateTime, nullable), `updated_at` (DateTime).

#### Scenario: Создание таблицы
- **WHEN** миграция применяется
- **THEN** таблица `email_logs` MUST существовать с всеми указанными полями

#### Scenario: Unique constraint на event_uuid
- **WHEN** попытка вставить запись с существующим `event_uuid`
- **THEN** MUST возникнуть ошибка unique constraint violation

### Requirement: Alembic миграция
MUST создать миграцию `20260710_0002_add_email_logs.py` для создания таблицы `email_logs`.

#### Scenario: Применение миграции
- **WHEN** выполняется `alembic upgrade head`
- **THEN** таблица `email_logs` MUST быть создана

#### Scenario: Откат миграции
- **WHEN** выполняется `alembic downgrade -1`
- **THEN** таблица `email_logs` MUST быть удалена

### Requirement: SQLAlchemy модель EmailLog
MUST создать модель `EmailLog` в `src/models/email_log.py` с маппингом на таблицу `email_logs`.

#### Scenario: Создание модели
- **WHEN** модель определена
- **THEN** MUST маппиться на таблицу `email_logs` с всеми полями

#### Scenario: Статусы по умолчанию
- **WHEN** создается новая запись
- **THEN** статус MUST быть `pending`, `attempts` MUST быть `0`

### Requirement: Репозиторий EmailLogRepository
MUST создать абстрактный `EmailLogRepositoryProtocol` и реализацию `SQLAlchemyEmailLogRepository` в `src/repositories/`.

#### Scenario: Создание записи
- **WHEN** вызван `create(email_log: EmailLog)`
- **THEN** MUST вставить запись в БД и вернуть созданный объект

#### Scenario: Обновление статуса
- **WHEN** вызван `update_status(id: UUID, status: str, error_message: Optional[str])`
- **THEN** MUST обновить статус и `updated_at` в записи

#### Scenario: Поиск по event_uuid
- **WHEN** вызван `find_by_event_uuid(event_uuid: UUID)`
- **THEN** MUST вернуть запись или `None`

#### Scenario: Инкремент попыток
- **WHEN** вызван `increment_attempts(id: UUID)`
- **THEN** MUST увеличить `attempts` на 1

### Requirement: Индексы для производительности
Таблица `email_logs` MUST иметь индексы на `event_uuid` (unique), `status`, `created_at`.

#### Scenario: Поиск по статусу
- **WHEN** запрос с фильтром по `status`
- **THEN** MUST использовать индекс для ускорения выборки

#### Scenario: Сортировка по дате
- **WHEN** запрос с сортировкой по `created_at`
- **THEN** MUST использовать индекс для ускорения сортировки
