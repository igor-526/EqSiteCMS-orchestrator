# Spec Delta — модели email без изменения контракта

## MODIFIED Requirements

### Requirement: Таблица email_logs
Таблица `email_logs` MUST хранить журнал отправки с полным составом полей и ограничений, указанным в сценарии «Структура журнала отправки».

#### Scenario: Структура журнала отправки
- **WHEN** создаётся таблица журнала отправки
- **THEN** MUST создать таблицу `email_logs` с полями: `id` (UUID, PK), `event_uuid` (UUID, UNIQUE), `to` (JSON array), `subject` (String), `body` (Text), `cc` (JSON array, nullable), `bcc` (JSON array, nullable), `reply_to` (String, nullable), `from_name` (String, nullable), `from_email` (String, nullable), `status` (String: pending/sent/failed), `error_message` (Text, nullable), `attempts` (Integer, default 0), `created_at` (DateTime), `sent_at` (DateTime, nullable), `updated_at` (DateTime).

#### Scenario: Создание таблицы
- **WHEN** миграция применяется
- **THEN** таблица `email_logs` MUST существовать с всеми указанными полями

#### Scenario: Unique constraint на event_uuid
- **WHEN** попытка вставить запись с существующим `event_uuid`
- **THEN** MUST возникнуть ошибка unique constraint violation

### Requirement: Alembic миграция
Миграции MUST создавать `email_logs` через `20260710_0002_add_email_logs.py`, а `user_emails` и `email_confirmations` — через `20260814_0003_add_user_emails_and_confirmations.py`, с сохранением обратного удаления создаваемых таблиц при откате.

#### Scenario: Применение миграции
- **WHEN** выполняется `alembic upgrade head` с миграцией `20260710_0002_add_email_logs.py`
- **THEN** таблица `email_logs` MUST быть создана

#### Scenario: Откат миграции
- **WHEN** выполняется `alembic downgrade -1` для миграции `20260710_0002_add_email_logs.py`
- **THEN** таблица `email_logs` MUST быть удалена

#### Scenario: Применение миграции user_emails и email_confirmations
- **WHEN** выполняется `alembic upgrade head` с миграцией `20260814_0003_add_user_emails_and_confirmations.py`
- **THEN** таблицы `user_emails` и `email_confirmations` MUST быть созданы

#### Scenario: Откат миграции user_emails и email_confirmations
- **WHEN** выполняется `alembic downgrade -1` для миграции `20260814_0003_add_user_emails_and_confirmations.py`
- **THEN** таблицы `user_emails` и `email_confirmations` MUST быть удалены
