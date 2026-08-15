# User Management API

## Purpose

Спецификация API управления пользователями в CMS. Позволяет пользователям с ролью USER_MANAGER или SUPERUSER создавать, редактировать, удалять, блокировать пользователей и управлять их ролями.

## Access Matrix

| Method | Path | Access Class | Roles | Expected without auth | Expected with auth |
|--------|------|--------------|-------|----------------------|-------------------|
| GET | /api/user-management/users | Protected Write | USER_MANAGER, SUPERUSER | 401 | 200 + пагинированный список |
| GET | /api/user-management/users/{id} | Protected Write | USER_MANAGER, SUPERUSER | 401 | 200 + данные пользователя |
| POST | /api/user-management/users | Protected Write | USER_MANAGER, SUPERUSER | 401 | 201 + созданный пользователь |
| PATCH | /api/user-management/users/{id} | Protected Write | USER_MANAGER, SUPERUSER | 401 | 200 + обновлённый пользователь |
| DELETE | /api/user-management/users/{id} | Protected Write | USER_MANAGER, SUPERUSER | 401 | 204 |
| PATCH | /api/user-management/users/{id}/block | Protected Write | USER_MANAGER, SUPERUSER | 401 | 200 + статус блокировки |
| PATCH | /api/user-management/users/{id}/unblock | Protected Write | USER_MANAGER, SUPERUSER | 401 | 200 + статус блокировки |
| PATCH | /api/user-management/users/{id}/password | Protected Write | USER_MANAGER, SUPERUSER | 401 | 204 |
| GET | /api/user-management/roles | Protected Write | USER_MANAGER, SUPERUSER | 401 | 200 + список ролей |

## Requirements

### Requirement: Получение списка пользователей с фильтрацией
`GET /api/user-management/users` SHALL возвращать пагинированный список пользователей с возможностью фильтрации и сортировки. Endpoint доступен только пользователям с ролью `USER_MANAGER` или `SUPERUSER`. MUST исключать удалённых пользователей из выдачи.

#### Scenario: Получение всех пользователей без фильтров
- **WHEN** авторизованный пользователь с ролью USER_MANAGER вызывает `GET /api/user-management/users`
- **THEN** backend возвращает `200` с пагинированным списком активных (не удалённых) пользователей

#### Scenario: Фильтр по username
- **WHEN** авторизованный пользователь вызывает `GET /api/user-management/users?username=admin`
- **THEN** backend возвращает `200` с пользователями, у которых username совпадает по регистронезависимому regex

#### Scenario: Фильтр по search (поиск по first_name, last_name, middle_name)
- **WHEN** авторизованный пользователь вызывает `GET /api/user-management/users?search=Иван`
- **THEN** backend возвращает `200` с пользователями, у которых ИЛИ first_name ИЛИ last_name ИЛИ middle_name совпадает по регистронезависимому regex

#### Scenario: Фильтр по is_blocked
- **WHEN** авторизованный пользователь вызывает `GET /api/user-management/users?is_blocked=true`
- **THEN** backend возвращает `200` только с заблокированными пользователями

#### Scenario: Сортировка по умолчанию
- **WHEN** авторизованный пользователь вызывает `GET /api/user-management/users` без параметра sort
- **THEN** backend возвращает `200` с пользователями, отсортированными по `is_blocked ASC` (сначала незаблокированные), затем по `last_name ASC`

#### Scenario: Неавторизованный запрос
- **WHEN** неавторизованный пользователь вызывает `GET /api/user-management/users`
- **THEN** backend возвращает `401 Unauthorized`

### Requirement: Создание пользователя
`POST /api/user-management/users` SHALL создавать нового пользователя в системе. Endpoint доступен только пользователям с ролью `USER_MANAGER` или `SUPERUSER`.

#### Scenario: Успешное создание пользователя
- **WHEN** авторизованный USER_MANAGER отправляет `POST /api/user-management/users` с валидными данными `{username, password, confirm_password, first_name, last_name, middle_name, equestrian_id, scope_ids}`
- **THEN** backend возвращает `201` с данными созданного пользователя

#### Scenario: UM пытается назначить роль SUPERUSER
- **WHEN** авторизованный USER_MANAGER отправляет `POST /api/user-management/users` с `scope_ids` содержащим SUPERUSER
- **THEN** backend возвращает `403 Forbidden` с сообщением "USER_MANAGER не может назначать роль SUPERUSER"

### Requirement: Обновление пользователя
`PATCH /api/user-management/users/{id}` SHALL обновлять данные существующего пользователя. Endpoint доступен только пользователям с ролью `USER_MANAGER` или `SUPERUSER`.

#### Scenario: Успешное обновление данных
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}` с `{first_name, last_name, middle_name, username}`
- **THEN** backend возвращает `200` с обновлёнными данными пользователя

#### Scenario: UM пытается обновить SUPERUSER
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}` где пользователь имеет роль SUPERUSER
- **THEN** backend возвращает `403 Forbidden`

#### Scenario: UM пытается снять с себя роль USER_MANAGER
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}` где `{id}` — это его собственный ID, и `scope_ids` не содержит USER_MANAGER
- **THEN** backend возвращает `403 Forbidden` с сообщением "Нельзя снять с себя роль USER_MANAGER"

### Requirement: Удаление пользователя (soft-delete)
`DELETE /api/user-management/users/{id}` SHALL помечать пользователя как удалённого (soft-delete). Endpoint доступен только пользователям с ролью `USER_MANAGER` или `SUPERUSER`.

#### Scenario: Успешное удаление пользователя
- **WHEN** авторизованный USER_MANAGER отправляет `DELETE /api/user-management/users/{id}`
- **THEN** backend возвращает `204`, пользователь помечен как `is_deleted=true`, `deleted_at=now()`

#### Scenario: UM пытается удалить самого себя
- **WHEN** авторизованный USER_MANAGER отправляет `DELETE /api/user-management/users/{id}` где `{id}` — это его собственный ID
- **THEN** backend возвращает `403 Forbidden` с сообщением "Нельзя удалить самого себя"

#### Scenario: UM пытается удалить SUPERUSER
- **WHEN** авторизованный USER_MANAGER отправляет `DELETE /api/user-management/users/{id}` где пользователь имеет роль SUPERUSER
- **THEN** backend возвращает `403 Forbidden`

### Requirement: Блокировка пользователя
`PATCH /api/user-management/users/{id}/block` SHALL устанавливать флаг `is_blocked=true` для пользователя. Endpoint доступен только пользователям с ролью `USER_MANAGER` или `SUPERUSER`.

#### Scenario: Успешная блокировка пользователя
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}/block`
- **THEN** backend возвращает `200` с `{is_blocked: true}`

#### Scenario: UM пытается заблокировать самого себя
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}/block` где `{id}` — это его собственный ID
- **THEN** backend возвращает `403 Forbidden` с сообщением "Нельзя заблокировать самого себя"

### Requirement: Разблокировка пользователя
`PATCH /api/user-management/users/{id}/unblock` SHALL снимать флаг `is_blocked` для пользователя. Endpoint доступен только пользователям с ролью `USER_MANAGER` или `SUPERUSER`.

#### Scenario: Успешная разблокировка пользователя
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}/unblock`
- **THEN** backend возвращает `200` с `{is_blocked: false}`

### Requirement: Смена пароля пользователя
`PATCH /api/user-management/users/{id}/password` SHALL изменять пароль пользователя. Endpoint доступен только пользователям с ролью `USER_MANAGER` или `SUPERUSER`.

#### Scenario: Успешная смена пароля
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}/password` с `{new_password, confirm_password}`
- **THEN** backend возвращает `204`

#### Scenario: Пароли не совпадают
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}/password` с разными паролями
- **THEN** backend возвращает `422 Validation Error`

### Requirement: Получение списка ролей
`GET /api/user-management/roles` SHALL возвращать список всех ролей пользователей. Endpoint доступен только пользователям с ролью `USER_MANAGER` или `SUPERUSER`. Поддерживает поиск по `scope_name` (регистронезависимое regex).

#### Scenario: Получение всех ролей
- **WHEN** авторизованный USER_MANAGER вызывает `GET /api/user-management/roles`
- **THEN** backend возвращает `200` со списком ролей

#### Scenario: Поиск ролей по имени
- **WHEN** авторизованный USER_MANAGER вызывает `GET /api/user-management/roles?scope_name=admin`
- **THEN** backend возвращает `200` с ролями, у которых scope_name совпадает по регистронезависимому regex
