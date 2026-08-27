# vk-user-storage Specification

## Purpose
Хранение привязки пользователя EqSiteCMS к аккаунту VK: таблица `user_vks` с состояниями `PENDING`/`ACTIVE`/`BLOCKED`, soft-delete, partial unique индексы, журнал `vk_logs`, репозитории и миграция VK-домена.

## Requirements

### Requirement: Таблица user_vks

`vk-service` MUST создать таблицу `user_vks` с полями: `id` (UUID, PK, `server_default gen_random_uuid()`), `user_id` (UUID, NOT NULL), `vk_peer_id` (BIGINT, nullable), `state` (String(16), NOT NULL, default `PENDING`), `vk_screen_name` (String(64), nullable), `vk_display_name` (String(255), nullable), `deleted_at` (TIMESTAMPTZ, nullable), `created_at` (TIMESTAMPTZ, NOT NULL, default `now()`), `updated_at` (TIMESTAMPTZ, NOT NULL, default `now()`). Таблица MUST объявляться через SQLAlchemy Core (`Table`) в `src/models/user_vk.py` и регистрироваться в `utils.basemodel.metadata`.

#### Scenario: Создание таблицы

- **WHEN** применяется миграция VK-домена на пустой БД `eqsitecmsvk`
- **THEN** таблица `user_vks` MUST существовать со всеми перечисленными полями и типами

#### Scenario: Значения по умолчанию

- **WHEN** создаётся запись только с `user_id`
- **THEN** `state` MUST быть `PENDING`, `vk_peer_id` MUST быть `NULL`, `deleted_at` MUST быть `NULL`

#### Scenario: Модель зарегистрирована в metadata

- **WHEN** выполняется `alembic revision --autogenerate` после применения миграций
- **THEN** сгенерированная ревизия MUST NOT содержать операций создания или изменения `user_vks`

### Requirement: Состояния привязки VK

Поле `state` MUST принимать только значения `PENDING`, `ACTIVE`, `BLOCKED`. `PENDING` означает, что контрольная строка выдана, но подтверждающее сообщение от пользователя не получено. `ACTIVE` означает подтверждённую привязку с непустым `vk_peer_id` и разрешением группы писать пользователю. `BLOCKED` означает подтверждённую привязку, для которой VK сообщил о запрете сообщений от группы. Отвязка MUST NOT выражаться отдельным состоянием и MUST выполняться soft-delete.

#### Scenario: Допустимые значения состояния

- **WHEN** репозиторий записывает `state`
- **THEN** значение MUST принадлежать множеству `{PENDING, ACTIVE, BLOCKED}`

#### Scenario: ACTIVE требует peer id

- **WHEN** запись переводится в `ACTIVE`
- **THEN** `vk_peer_id` MUST быть непустым

#### Scenario: PENDING не имеет peer id

- **WHEN** запись создана выдачей контрольной строки и подтверждение не получено
- **THEN** `state` MUST быть `PENDING`, а `vk_peer_id` MUST быть `NULL`

#### Scenario: Отвязка не создаёт новое состояние

- **WHEN** пользователь отвязывает VK
- **THEN** `deleted_at` MUST быть установлен, а `state` MUST сохранить последнее значение без введения `UNLINKED`

### Requirement: Partial unique indexes для user_vks

`vk-service` MUST создать partial unique index `uq_user_vks_user_id_active` на `user_id WHERE deleted_at IS NULL` и partial unique index `uq_user_vks_peer_id_active` на `vk_peer_id WHERE deleted_at IS NULL AND vk_peer_id IS NOT NULL`, а также обычный index `ix_user_vks_state` на `state`.

#### Scenario: Одна активная привязка на пользователя

- **WHEN** существует non-deleted запись с `user_id = X` и выполняется вставка второй записи с `user_id = X`
- **THEN** вставка MUST завершиться ошибкой unique constraint violation

#### Scenario: Один активный VK-аккаунт на систему

- **WHEN** существует non-deleted запись с `vk_peer_id = 12345` и выполняется вставка второй записи с тем же `vk_peer_id`
- **THEN** вставка MUST завершиться ошибкой unique constraint violation

#### Scenario: Несколько PENDING записей без peer id не конфликтуют

- **WHEN** существуют две non-deleted записи разных пользователей с `vk_peer_id IS NULL`
- **THEN** обе записи MUST быть допустимы, поскольку partial index исключает `NULL`

#### Scenario: Переиспользование после soft-delete

- **WHEN** запись с `user_id = X` и `vk_peer_id = 12345` помечена как deleted
- **THEN** MUST быть возможно создать новую запись с тем же `user_id` и позднее привязать тот же `vk_peer_id`

### Requirement: Soft-delete привязки VK

`vk-service` MUST реализовать мягкое удаление привязки установкой `deleted_at = now()` без физического удаления строки; операция MUST быть идемпотентной.

#### Scenario: Мягкое удаление активной привязки

- **WHEN** вызван `soft_delete(user_id)` для существующей non-deleted записи
- **THEN** `deleted_at` MUST быть установлен, строка MUST остаться в БД, а `vk_peer_id` MUST сохраниться для истории

#### Scenario: Идемпотентность soft-delete

- **WHEN** вызван `soft_delete(user_id)` для уже удалённой записи или для отсутствующего пользователя
- **THEN** вызов MUST завершиться успешно без исключения

### Requirement: Репозиторий UserVkRepository

`vk-service` MUST определить `UserVkRepositoryProtocol` в `src/repositories/protocols.py` и реализацию `SQLAlchemyUserVkRepository` в `src/repositories/user_vk.py`. Репозиторий MUST возвращать `dict` и MUST NOT возвращать удалённые записи из методов чтения по умолчанию.

#### Scenario: Создание PENDING записи

- **WHEN** вызван `create(user_id)`
- **THEN** MUST быть создана запись с `state="PENDING"`, `vk_peer_id=None`, `deleted_at=None` и возвращён объект

#### Scenario: Получение по user_id

- **WHEN** вызван `get_by_user_id(user_id)` для существующей non-deleted записи
- **THEN** MUST быть возвращён `dict` с `id`, `user_id`, `vk_peer_id`, `state`, `vk_screen_name`, `vk_display_name`

#### Scenario: Получение по user_id — не найдено

- **WHEN** вызван `get_by_user_id(user_id)` для отсутствующей или удалённой записи
- **THEN** MUST быть возвращён `None`

#### Scenario: Массовое получение по user_ids

- **WHEN** вызван `get_by_user_ids(user_ids, state=None)`
- **THEN** MUST быть возвращён список non-deleted записей, отфильтрованный по `state`, если параметр передан

#### Scenario: Получение по vk_peer_id

- **WHEN** вызван `get_by_peer_id(vk_peer_id)`
- **THEN** MUST быть возвращена non-deleted запись или `None`

#### Scenario: Активация привязки

- **WHEN** вызван `activate(record_id, vk_peer_id, vk_screen_name, vk_display_name)`
- **THEN** MUST быть установлены `vk_peer_id`, `state="ACTIVE"`, кэш имён и обновлён `updated_at`

#### Scenario: Смена состояния

- **WHEN** вызван `set_state(record_id, state)` со значением из допустимого множества
- **THEN** MUST быть обновлены `state` и `updated_at`

#### Scenario: Конфликт peer id при активации

- **WHEN** `activate` вызывается с `vk_peer_id`, уже привязанным к другой non-deleted записи
- **THEN** репозиторий MUST поднять `AlreadyExistsError`

### Requirement: Журнал действий vk_logs

`vk-service` MUST создать таблицу `vk_logs` с полями `id` (UUID, PK), `event_uuid` (UUID, UNIQUE), `action` (String(64)), `status` (String(32)), `details` (JSONB, nullable), `created_at` (TIMESTAMPTZ, NOT NULL), а также `VkLogRepositoryProtocol` и `SQLAlchemyVkLogRepository` с методом `log_action(action, status, details)`. Индексы MUST существовать на `event_uuid` (unique), `action`, `created_at`.

#### Scenario: Создание таблицы журнала

- **WHEN** применяется миграция VK-домена
- **THEN** таблица `vk_logs` MUST существовать со всеми перечисленными полями и индексами

#### Scenario: Запись действия

- **WHEN** вызван `log_action(action="vk_confirmation", status="success", details={...})`
- **THEN** MUST быть создана запись с новым `event_uuid` (UUID v4) и `created_at`

#### Scenario: Unique constraint на event_uuid

- **WHEN** выполняется вставка записи с существующим `event_uuid`
- **THEN** MUST возникнуть ошибка unique constraint violation

### Requirement: Alembic миграция VK-домена

`vk-service` MUST добавить единственную новую ревизию `20260827_0002_add_vk_domain.py`, создающую `user_vks`, `vk_confirmations` и `vk_logs` с индексами, с `down_revision` на `20260710_0001_initial`. `downgrade` MUST удалять все три таблицы.

#### Scenario: Применение миграции на реальной PostgreSQL

- **WHEN** на пустой БД `eqsitecmsvk` выполняется `alembic -c alembic.ini upgrade head`
- **THEN** команда MUST завершиться с кодом `0`, а в схеме MUST присутствовать `alembic_version`, `user_vks`, `vk_confirmations`, `vk_logs`

#### Scenario: Откат миграции

- **WHEN** выполняется `alembic -c alembic.ini downgrade -1`
- **THEN** таблицы `user_vks`, `vk_confirmations`, `vk_logs` MUST быть удалены, а `alembic_version` MUST сохраниться

#### Scenario: Email-таблицы не появляются

- **WHEN** reviewer читает схему БД после `upgrade head`
- **THEN** таблицы `user_emails`, `email_confirmations`, `email_logs` MUST отсутствовать
