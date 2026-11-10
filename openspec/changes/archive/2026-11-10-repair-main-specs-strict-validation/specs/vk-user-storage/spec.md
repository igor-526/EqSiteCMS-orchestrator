## MODIFIED Requirements

### Requirement: Таблица user_vks

`vk-service` MUST создать таблицу `user_vks` с полным набором полей, типов, nullable-ограничений и defaults из сценария структуры. Таблица MUST объявляться через SQLAlchemy Core (`Table`) в `src/models/user_vk.py` и регистрироваться в `utils.basemodel.metadata`.

#### Scenario: Создание таблицы

- **WHEN** применяется миграция VK-домена на пустой БД `eqsitecmsvk`
- **THEN** таблица `user_vks` MUST существовать со всеми перечисленными полями и типами

#### Scenario: Значения по умолчанию

- **WHEN** создаётся запись только с `user_id`
- **THEN** `state` MUST быть `PENDING`, `vk_peer_id` MUST быть `NULL`, `deleted_at` MUST быть `NULL`

#### Scenario: Модель зарегистрирована в metadata

- **WHEN** выполняется `alembic revision --autogenerate` после применения миграций
- **THEN** сгенерированная ревизия MUST NOT содержать операций создания или изменения `user_vks`

#### Scenario: Полная структура таблицы user_vks

- **WHEN** проверяется полный исходный контракт требования «Таблица user_vks»
- **THEN** `vk-service` MUST создать таблицу `user_vks` с полями: `id` (UUID, PK, `server_default gen_random_uuid()`), `user_id` (UUID, NOT NULL), `vk_peer_id` (BIGINT, nullable), `state` (String(16), NOT NULL, default `PENDING`), `vk_screen_name` (String(64), nullable), `vk_display_name` (String(255), nullable), `deleted_at` (TIMESTAMPTZ, nullable), `created_at` (TIMESTAMPTZ, NOT NULL, default `now()`), `updated_at` (TIMESTAMPTZ, NOT NULL, default `now()`). Таблица MUST объявляться через SQLAlchemy Core (`Table`) в `src/models/user_vk.py` и регистрироваться в `utils.basemodel.metadata`.
