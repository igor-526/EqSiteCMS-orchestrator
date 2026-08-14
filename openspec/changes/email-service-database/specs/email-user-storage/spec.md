# email-user-storage Specification

## Purpose
Хранение привязки email к пользователю (1:1) с soft-delete и защитой от дубликатов в рамках Equestrian ID.

## ADDED Requirements

### Requirement: Таблица user_emails
MUST создать таблицу `user_emails` с полями: `user_id` (UUID, PK), `email` (String, NOT NULL), `approved` (Boolean, default false), `deleted_at` (DateTime, nullable), `created_at` (DateTime), `updated_at` (DateTime).

#### Scenario: Создание таблицы
- **WHEN** миграция применяется
- **THEN** таблица `user_emails` MUST существовать со всеми указанными полями

#### Scenario: Значения по умолчанию
- **WHEN** создаётся новая запись без указания `approved`
- **THEN** `approved` MUST быть `false`, `deleted_at` MUST быть `NULL`

### Requirement: Уникальность user_id (1:1 привязка)
MUST создать partial unique constraint `uq_user_emails_user_id_active` на `user_id` WHERE `deleted_at IS NULL`.

#### Scenario: Попытка создать дубликат для активного пользователя
- **WHEN** существует non-deleted запись с `user_id = X`
- **THEN** попытка создать ещё одну запись с `user_id = X` MUST завершиться ошибкой unique constraint violation

#### Scenario: Создание после soft-delete
- **WHEN** существовала запись с `user_id = X`, но она помечена как deleted (`deleted_at IS NOT NULL`)
- **THEN** MUST быть возможно создать новую запись с `user_id = X`

### Requirement: Уникальность email в рамках Equestrian ID
MUST создать partial unique constraint `uq_user_emails_email_active` на `email` WHERE `deleted_at IS NULL`.

#### Scenario: Попытка создать дубликат email
- **WHEN** существует non-deleted запись с `email = "test@example.com"`
- **THEN** попытка создать запись с тем же email MUST завершиться ошибкой unique constraint violation

#### Scenario: Email после soft-delete может быть переиспользован
- **WHEN** существовала запись с `email = "test@example.com"`, но она помечена как deleted
- **THEN** MUST быть возможно создать новую запись с тем же email

### Requirement: Soft-delete
MUST реализовать мягкое удаление: установка `deleted_at = now()` вместо физического удаления.

#### Scenario: Мягкое удаление записи
- **WHEN** вызван метод soft-delete для существующей non-deleted записи
- **THEN** MUST установить `deleted_at = now()`, запись MUST остаться в БД

#### Scenario: Идемпотентность soft-delete
- **WHEN** вызван метод soft-delete для уже удалённой записи
- **THEN** MUST вернуть успех без ошибки (запись уже удалена)

### Requirement: Репозиторий UserRepository
MUST создать абстрактный `UserEmailRepositoryProtocol` и реализацию `SQLAlchemyUserEmailRepository`.

#### Scenario: Создание email
- **WHEN** вызван `create(user_id, email)`
- **THEN** MUST создать запись с `approved=false`, `deleted_at=NULL`, вернуть объект

#### Scenario: Получение email по user_id
- **WHEN** вызван `get_by_user_id(user_id)` для существующего non-deleted пользователя
- **THEN** MUST вернуть запись

#### Scenario: Получение email — не найден
- **WHEN** вызван `get_by_user_id(user_id)` для несуществующего или удалённого пользователя
- **THEN** MUST вернуть `None`

#### Scenario: Массовое получение email по user_ids
- **WHEN** вызван `get_by_user_ids(user_ids: list[UUID], approved: bool | None = None)`
- **THEN** MUST вернуть список non-deleted записей, отфильтрованный по `approved` если параметр указан

#### Scenario: Обновление email
- **WHEN** вызван `update_email(user_id, new_email)`
- **THEN** MUST обновить `email`, установить `approved = false`, обновить `updated_at`

#### Scenario: Обновление email — идемпотентность
- **WHEN** новый email совпадает с текущим
- **THEN** MUST сохранить текущее значение `approved` (не сбрасывать)

#### Scenario: Soft-delete
- **WHEN** вызван `soft_delete(user_id)`
- **THEN** MUST установить `deleted_at = now()`

#### Scenario: Подтверждение email
- **WHEN** вызван `approve(user_id)`
- **THEN** MUST установить `approved = true`, обновить `updated_at`
