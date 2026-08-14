# email-database-models Delta Specification

## Purpose
Добавление таблиц `user_emails` и `email_confirmations` к существующим моделям данных email-service.

## ADDED Requirements

### Requirement: Таблица user_emails
MUST создать таблицу `user_emails` с полями: `user_id` (UUID, PK), `email` (String(255), NOT NULL), `approved` (Boolean, default false), `deleted_at` (DateTime, nullable), `created_at` (DateTime), `updated_at` (DateTime).

#### Scenario: Создание таблицы
- **WHEN** миграция применяется
- **THEN** таблица `user_emails` MUST существовать со всеми указанными полями

#### Scenario: Значения по умолчанию
- **WHEN** создаётся новая запись
- **THEN** `approved` MUST быть `false`, `deleted_at` MUST быть `NULL`

### Requirement: Partial unique indexes для user_emails
MUST создать partial unique indexes: `uq_user_emails_user_id_active` на `user_id WHERE deleted_at IS NULL` и `uq_user_emails_email_active` на `email WHERE deleted_at IS NULL`.

#### Scenario: Unique user_id для non-deleted записей
- **WHEN** существует non-deleted запись с данным user_id
- **THEN** вставка дубликата MUST завершиться ошибкой

#### Scenario: Unique email для non-deleted записей
- **WHEN** существует non-deleted запись с данным email
- **THEN** вставка дубликата MUST завершиться ошибкой

### Requirement: Таблица email_confirmations
MUST создать таблицу `email_confirmations` с полями: `id` (UUID, PK), `user_email_id` (UUID, FK на user_emails), `code` (String(64), UNIQUE), `expires_at` (DateTime), `created_at` (DateTime), `used_at` (DateTime, nullable).

#### Scenario: Создание таблицы
- **WHEN** миграция применяется
- **THEN** таблица `email_confirmations` MUST существовать со всеми указанными полями

#### Scenario: Unique constraint на code
- **WHEN** попытка вставить запись с существующим code
- **THEN** MUST возникнуть ошибка unique constraint violation

### Requirement: Alembic миграция
MUST создать миграцию `20260814_0003_add_user_emails_and_confirmations.py`.

#### Scenario: Применение миграции
- **WHEN** выполняется `alembic upgrade head`
- **THEN** таблицы `user_emails` и `email_confirmations` MUST быть созданы

#### Scenario: Откат миграции
- **WHEN** выполняется `alembic downgrade -1`
- **THEN** таблицы MUST быть удалены

### Requirement: SQLAlchemy модели
MUST создать модели `UserEmail` и `EmailConfirmation` с маппингом на соответствующие таблицы.

#### Scenario: Модель UserEmail
- **WHEN** модель определена
- **THEN** MUST маппиться на таблицу `user_emails` со всеми полями

#### Scenario: Модель EmailConfirmation
- **WHEN** модель определена
- **THEN** MUST маппиться на таблицу `email_confirmations` со всеми полями
