# User Management API

## Purpose

Спецификация API управления пользователями в CMS. Позволяет пользователям с ролью USER_MANAGER или SUPERUSER создавать, редактировать, удалять, блокировать пользователей и управлять их ролями.

## Access Matrix

| Method | Path | Access Class | Roles | Expected without auth | Expected with auth |
|--------|------|--------------|-------|----------------------|-------------------|
| GET | `/api/user-management/users` | Protected Admin Read (исключение) | `USER_MANAGER`, `SUPERUSER` | `401` | `200`, только свой tenant; без роли `403` |
| GET | `/api/user-management/users/{id}` | Protected Admin Read (исключение) | `USER_MANAGER`, `SUPERUSER` | `401` | `200` свой tenant; чужой tenant `404`; без роли `403` |
| POST | `/api/user-management/users` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `201` свой tenant; чужой tenant `403`; без роли `403` |
| PATCH | `/api/user-management/users/{id}` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `200` свой tenant; чужой tenant `404`; без роли `403` |
| DELETE | `/api/user-management/users/{id}` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `204` свой tenant; чужой tenant `404`; без роли `403` |
| PATCH | `/api/user-management/users/{id}/block` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `200` свой tenant; чужой tenant `404`; без роли `403` |
| PATCH | `/api/user-management/users/{id}/unblock` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `200` свой tenant; чужой tenant `404`; без роли `403` |
| PATCH | `/api/user-management/users/{id}/password` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `204` свой tenant; чужой tenant `404`; без роли `403` |
| GET | `/api/user-management/roles` | Protected Admin Read (исключение) | `USER_MANAGER`, `SUPERUSER` | `401` | `200`; без роли `403` |

## Requirements

### Requirement: Tenant isolation операций управления пользователями
Все операции над пользователями под `/api/user-management/users` SHALL выполняться только в tenant boundary текущего авторизованного оператора, определяемой как `current_user.equestrian_id`. Роль `SUPERUSER` SHALL NOT предоставлять межтенантный доступ. Список, его фильтры, пагинация и `total` MUST учитывать только пользователей этой конюшни. Адресные чтение и mutation чужого пользователя MUST возвращать `404`, не раскрывая существование ресурса. При создании переданный `equestrian_id` MUST совпадать с `current_user.equestrian_id`, иначе endpoint MUST вернуть `403` до записи данных.

#### Scenario: Список ограничен конюшней оператора
- **WHEN** авторизованный `USER_MANAGER` или `SUPERUSER` вызывает `GET /api/user-management/users`, а в БД существуют пользователи нескольких конюшен
- **THEN** ответ `200` содержит только пользователей с `equestrian_id = current_user.equestrian_id`, а `total` подсчитан по той же tenant-scoped выборке

#### Scenario: Фильтры и пагинация не расширяют tenant boundary
- **WHEN** разрешённый оператор передаёт `username`, ФИО, `scope_ids`, `search`, `is_blocked`, `limit` или `offset`
- **THEN** каждый фильтр, сортировка и пагинация применяются после обязательного ограничения по `current_user.equestrian_id`

#### Scenario: Получение чужого пользователя скрывает существование ресурса
- **WHEN** разрешённый оператор вызывает `GET /api/user-management/users/{id}` для существующего пользователя другой конюшни
- **THEN** backend возвращает `404` без данных чужого пользователя

#### Scenario: Создание пользователя своей конюшни
- **WHEN** разрешённый оператор отправляет валидный `POST /api/user-management/users` с `equestrian_id`, равным `current_user.equestrian_id`
- **THEN** backend создаёт пользователя в этой конюшне и возвращает `201`

#### Scenario: Создание пользователя чужой конюшни запрещено
- **WHEN** разрешённый оператор отправляет `POST /api/user-management/users` с `equestrian_id`, отличным от `current_user.equestrian_id`
- **THEN** backend возвращает `403` и не создаёт пользователя

#### Scenario: Изменение чужого пользователя скрывает существование ресурса
- **WHEN** разрешённый оператор вызывает `PATCH /api/user-management/users/{id}`, `/block`, `/unblock` или `/password` для существующего пользователя другой конюшни
- **THEN** backend возвращает `404` и не изменяет пользователя, его роли, пароль или статус блокировки

#### Scenario: Удаление чужого пользователя скрывает существование ресурса
- **WHEN** разрешённый оператор вызывает `DELETE /api/user-management/users/{id}` для существующего пользователя другой конюшни
- **THEN** backend возвращает `404` и не устанавливает признаки soft-delete

### Requirement: Access matrix CMS user-management
Endpoint'ы CMS user-management SHALL соответствовать следующей матрице. Защищённые `GET` являются явным исключением из Public Read, потому что ответы содержат учётные записи, роли и служебные статусы. Все writes являются Protected Write. Для каждой строки MUST существовать anonymous/authenticated проверка; а для адресных операций — проверка чужой конюшни.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/user-management/users` | Protected Admin Read (исключение) | `USER_MANAGER`, `SUPERUSER` | `401` | `200`, только свой tenant; без роли `403` |
| GET | `/api/user-management/users/{id}` | Protected Admin Read (исключение) | `USER_MANAGER`, `SUPERUSER` | `401` | `200` свой tenant; чужой tenant `404`; без роли `403` |
| POST | `/api/user-management/users` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `201` свой tenant; чужой tenant `403`; без роли `403` |
| PATCH | `/api/user-management/users/{id}` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `200` свой tenant; чужой tenant `404`; без роли `403` |
| DELETE | `/api/user-management/users/{id}` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `204` свой tenant; чужой tenant `404`; без роли `403` |
| PATCH | `/api/user-management/users/{id}/block` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `200` свой tenant; чужой tenant `404`; без роли `403` |
| PATCH | `/api/user-management/users/{id}/unblock` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `200` свой tenant; чужой tenant `404`; без роли `403` |
| PATCH | `/api/user-management/users/{id}/password` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `204` свой tenant; чужой tenant `404`; без роли `403` |
| GET | `/api/user-management/roles` | Protected Admin Read (исключение) | `USER_MANAGER`, `SUPERUSER` | `401` | `200`; без роли `403` |

#### Scenario: Anonymous доступ запрещён
- **WHEN** неавторизованный клиент вызывает любую строку access matrix
- **THEN** backend возвращает `401` и не раскрывает пользовательские данные или роли

#### Scenario: Аутентифицированный пользователь без управляющей роли запрещён
- **WHEN** аутентифицированный пользователь без `USER_MANAGER` и `SUPERUSER` вызывает любую строку access matrix
- **THEN** backend возвращает `403` и не читает и не изменяет управляемые данные

#### Scenario: Разрешённая роль не отменяет tenant boundary
- **WHEN** аутентифицированный `SUPERUSER` или `USER_MANAGER` адресует пользователя другой конюшни
- **THEN** backend применяет tenant outcomes из матрицы, не предоставляя глобального доступа

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
