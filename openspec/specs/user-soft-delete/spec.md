## Purpose
Определить мягкое удаление пользователей и исключение удалённых записей из обычных запросов.

## Requirements

### Requirement: Soft-delete модель для пользователей
Таблица `users` MUST содержать поля `is_deleted` (boolean, default=false) и `deleted_at` (datetime, nullable) для реализации мягкого удаления. Удалённые пользователи MUST помечаться как `is_deleted=true` с установкой `deleted_at` на момент удаления.

#### Scenario: Поля существуют в таблице users
- **WHEN** миграция Alembic применяется
- **THEN** таблица `users` содержит колонки `is_deleted` (boolean, default=false, not null) и `deleted_at` (datetime, nullable)

#### Scenario: Дефолтное значение для существующих пользователей
- **WHEN** миграция применяется к существующим данным
- **THEN** все существующие пользователи имеют `is_deleted=false`, `deleted_at=null`

#### Scenario: Установка значений при удалении
- **WHEN** вызывается операция soft-delete для пользователя
- **THEN** `is_deleted` устанавливается в `true`, `deleted_at` устанавливается на текущий момент

### Requirement: Использование существующего SoftDeleteMixin
Сущность `User` MUST наследовать или включать поля из существующего `SoftDeleteMixin` из `core/entities/base.py`.

#### Scenario: User наследует SoftDeleteMixin
- **WHEN** определяется сущность User
- **THEN** User включает поля `is_deleted` и `deleted_at` из SoftDeleteMixin

### Requirement: Исключение удалённых пользователей из запросов
Все запросы на получение пользователей MUST исключать записи с `is_deleted=true`, кроме явно оговоренных случаев.

#### Scenario: Запрос списка пользователей
- **WHEN** выполняется запрос на получение списка пользователей
- **THEN** в результат НЕ включаются пользователи с `is_deleted=true`

#### Scenario: Запрос конкретного пользователя по ID
- **WHEN** выполняется запрос на получение пользователя по ID, и пользователь `is_deleted=true`
- **THEN** возвращается ошибка 404 Not Found

### Requirement: Индекс на поле is_deleted
Для оптимизации запросов MUST быть создан индекс на поле `is_deleted`.

#### Scenario: Индекс существует
- **WHEN** миграция применяется
- **THEN** на таблице `users` создан индекс для колонки `is_deleted`
