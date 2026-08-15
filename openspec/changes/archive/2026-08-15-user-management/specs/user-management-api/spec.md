## ADDED Requirements

### Access Matrix

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

### Requirement: Получение списка пользователей с фильтрацией
`GET /api/user-management/users` SHALL возвращать пагинированный список пользователей с возможностью фильтрации и сортировки. Endpoint доступен только пользователям с ролью `USER_MANAGER` или `SUPERUSER`. MUST исключать удалённых пользователей из выдачи.

#### Scenario: Получение всех пользователей без фильтров
- **WHEN** авторизованный пользователь с ролью USER_MANAGER вызывает `GET /api/user-management/users`
- **THEN** backend возвращает `200` с пагинированным списком активных (не удалённых) пользователей

#### Scenario: Фильтр по username
- **WHEN** авторизованный пользователь вызывает `GET /api/user-management/users?username=admin`
- **THEN** backend возвращает `200` с пользователями, у которых username совпадает по регистронезависимому regex

#### Scenario: Фильтр по first_name
- **WHEN** авторизованный пользователь вызывает `GET /api/user-management/users?first_name=Иван`
- **THEN** backend возвращает `200` с пользователями, у которых first_name совпадает по регистронезависимому regex

#### Scenario: Фильтр по last_name
- **WHEN** авторизованный пользователь вызывает `GET /api/user-management/users?last_name=Иванов`
- **THEN** backend возвращает `200` с пользователями, у которых last_name совпадает по регистронезависимому regex

#### Scenario: Фильтр по middle_name
- **WHEN** авторизованный пользователь вызывает `GET /api/user-management/users?middle_name=Иванович`
- **THEN** backend возвращает `200` с пользователями, у которых middle_name совпадает по регистронезависимому regex

#### Scenario: Фильтр по scope_ids (логика ИЛИ)
- **WHEN** авторизованный пользователь вызывает `GET /api/user-management/users?scope_ids=<uuid1>&scope_ids=<uuid2>`
- **THEN** backend возвращает `200` с пользователями, имеющими scope uuid1 ИЛИ uuid2

#### Scenario: Фильтр по search (поиск по first_name, last_name, middle_name)
- **WHEN** авторизованный пользователь вызывает `GET /api/user-management/users?search=Иван`
- **THEN** backend возвращает `200` с пользователями, у которых ИЛИ first_name ИЛИ last_name ИЛИ middle_name совпадает по регистронезависимому regex

#### Scenario: Фильтр по is_blocked
- **WHEN** авторизованный пользователь вызывает `GET /api/user-management/users?is_blocked=true`
- **THEN** backend возвращает `200` только с заблокированными пользователями

#### Scenario: Сортировка по умолчанию
- **WHEN** авторизованный пользователь вызывает `GET /api/user-management/users` без параметра sort
- **THEN** backend возвращает `200` с пользователями, отсортированными по `is_blocked ASC` (сначала незаблокированные), затем по `last_name ASC`

#### Scenario: Пользователь с ролью SUPERUSER имеет доступ
- **WHEN** авторизованный пользователь с ролью SUPERUSER вызывает `GET /api/user-management/users`
- **THEN** backend возвращает `200` с пагинированным списком пользователей

#### Scenario: Неавторизованный запрос
- **WHEN** неавторизованный пользователь вызывает `GET /api/user-management/users`
- **THEN** backend возвращает `401 Unauthorized`

#### Scenario: Пользователь без required scope
- **WHEN** авторизованный пользователь с ролью ADMIN (без USER_MANAGER/SUPERUSER) вызывает `GET /api/user-management/users`
- **THEN** backend возвращает `403 Forbidden`

### Requirement: Создание пользователя
`POST /api/user-management/users` SHALL создавать нового пользователя в системе. Endpoint доступен только пользователям с ролью `USER_MANAGER` или `SUPERUSER`.

#### Scenario: Успешное создание пользователя
- **WHEN** авторизованный USER_MANAGER отправляет `POST /api/user-management/users` с валидными данными `{username, password, first_name, last_name, middle_name, equestrian_id, scope_ids}`
- **THEN** backend возвращает `201` с данными созданного пользователя

#### Scenario: Дублирование username
- **WHEN** авторизованный USER_MANAGER отправляет `POST /api/user-management/users` с username, который уже существует
- **THEN** backend возвращает `409 Conflict`

#### Scenario: Невалидные данные
- **WHEN** авторизованный USER_MANAGER отправляет `POST /api/user-management/users` с пустым username
- **THEN** backend возвращает `422 Validation Error`

#### Scenario: UM пытается назначить роль SUPERUSER
- **WHEN** авторизованный USER_MANAGER отправляет `POST /api/user-management/users` с `scope_ids` содержащим SUPERUSER
- **THEN** backend возвращает `403 Forbidden` с сообщением "USER_MANAGER не может назначать роль SUPERUSER"

#### Scenario: SUPERUSER может назначить любую роль
- **WHEN** авторизованный SUPERUSER отправляет `POST /api/user-management/users` с `scope_ids` содержащим SUPERUSER
- **THEN** backend возвращает `201` с данными созданного пользователя

### Requirement: Обновление пользователя
`PATCH /api/user-management/users/{id}` SHALL обновлять данные существующего пользователя. Endpoint доступен только пользователям с ролью `USER_MANAGER` или `SUPERUSER`.

#### Scenario: Успешное обновление данных
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}` с `{first_name, last_name, middle_name, username}`
- **THEN** backend возвращает `200` с обновлёнными данными пользователя

#### Scenario: Обновление ролей пользователя
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}` с `{scope_ids}`
- **THEN** backend возвращает `200` с обновлёнными данными пользователя

#### Scenario: UM пытается обновить SUPERUSER
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}` где пользователь имеет роль SUPERUSER
- **THEN** backend возвращает `403 Forbidden`

#### Scenario: UM пытается снять с себя роль USER_MANAGER
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}` где `{id}` — это его собственный ID, и `scope_ids` не содержит USER_MANAGER
- **THEN** backend возвращает `403 Forbidden` с сообщением "Нельзя снять с себя роль USER_MANAGER"

#### Scenario: SUPERUSER пытается снять с себя роль SUPERUSER
- **WHEN** авторизованный SUPERUSER отправляет `PATCH /api/user-management/users/{id}` где `{id}` — это его собственный ID, и `scope_ids` не содержит SUPERUSER
- **THEN** backend возвращает `403 Forbidden` с сообщением "Нельзя снять с себя роль SUPERUSER"

#### Scenario: UM пытается назначить SUPERUSER при обновлении
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}` с `scope_ids` содержащим SUPERUSER
- **THEN** backend возвращает `403 Forbidden` с сообщением "USER_MANAGER не может назначать роль SUPERUSER"

#### Scenario: Пользователь не найден
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{несуществующий-uuid}`
- **THEN** backend возвращает `404 Not Found`

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

#### Scenario: Пользователь не найден
- **WHEN** авторизованный USER_MANAGER отправляет `DELETE /api/user-management/users/{несуществующий-uuid}`
- **THEN** backend возвращает `404 Not Found`

### Requirement: Блокировка пользователя
`PATCH /api/user-management/users/{id}/block` SHALL устанавливать флаг `is_blocked=true` для пользователя. Endpoint доступен только пользователям с ролью `USER_MANAGER` или `SUPERUSER`.

#### Scenario: Успешная блокировка пользователя
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}/block`
- **THEN** backend возвращает `200` с `{is_blocked: true}`

#### Scenario: UM пытается заблокировать самого себя
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}/block` где `{id}` — это его собственный ID
- **THEN** backend возвращает `403 Forbidden` с сообщением "Нельзя заблокировать самого себя"

#### Scenario: UM пытается заблокировать SUPERUSER
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}/block` где пользователь имеет роль SUPERUSER
- **THEN** backend возвращает `403 Forbidden`

#### Scenario: Пользователь уже заблокирован
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}/block` для уже заблокированного пользователя
- **THEN** backend возвращает `200` с `{is_blocked: true}` (идемпотентно)

### Requirement: Разблокировка пользователя
`PATCH /api/user-management/users/{id}/unblock` SHALL устанавливать флаг `is_blocked=false` для пользователя. Endpoint доступен только пользователям с ролью `USER_MANAGER` или `SUPERUSER`.

#### Scenario: Успешная разблокировка пользователя
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}/unblock`
- **THEN** backend возвращает `200` с `{is_blocked: false}`

#### Scenario: Пользователь не заблокирован
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}/unblock` для незаблокированного пользователя
- **THEN** backend возвращает `200` с `{is_blocked: false}` (идемпотентно)

### Requirement: Смена пароля пользователя
`PATCH /api/user-management/users/{id}/password` SHALL изменять пароль пользователя. Endpoint доступен только пользователям с ролью `USER_MANAGER` или `SUPERUSER`.

#### Scenario: Успешная смена пароля
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}/password` с `{new_password, confirm_password}`
- **THEN** backend возвращает `204`, пароль пользователя изменён

#### Scenario: Пароли не совпадают
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}/password` с `{new_password: "Pass123!", confirm_password: "Pass456!"}`
- **THEN** backend возвращает `422 Validation Error` с сообщением "Пароли не совпадают"

#### Scenario: Пароль не соответствует требованиям
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}/password` с `{new_password: "123", confirm_password: "123"}`
- **THEN** backend возвращает `422 Validation Error` с сообщением о требованиях к паролю

### Requirement: Получение списка ролей
`GET /api/user-management/roles` SHALL возвращать список всех ролей (scopes) для заполнения селекторов в UI. Endpoint доступен только пользователям с ролью `USER_MANAGER` или `SUPERUSER`. Поддерживает поиск по `scope_name` (регистронезависимое regex).

#### Scenario: Получение всех ролей
- **WHEN** авторизованный USER_MANAGER вызывает `GET /api/user-management/roles`
- **THEN** backend возвращает `200` со списком всех ролей `[{id, scope_name, scope_description}, ...]`

#### Scenario: Поиск ролей по scope_name
- **WHEN** авторизованный USER_MANAGER вызывает `GET /api/user-management/roles?scope_name=ADMIN`
- **THEN** backend возвращает `200` с ролями, у которых scope_name совпадает по регистронезависимому regex

#### Scenario: Пустой результат поиска
- **WHEN** авторизованный USER_MANAGER вызывает `GET /api/user-management/roles?scope_name=NEXISTING`
- **THEN** backend возвращает `200` с пустым списком

### Requirement: Запрет действий с удалёнными пользователями
Все эндпоинты управления пользователями MUST отклонять запросы к удалённым пользователям.

#### Scenario: Попытка обновить удалённого пользователя
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}` где пользователь `is_deleted=true`
- **THEN** backend возвращает `404 Not Found`

#### Scenario: Попытка заблокировать удалённого пользователя
- **WHEN** авторизованный USER_MANAGER отправляет `PATCH /api/user-management/users/{id}/block` где пользователь `is_deleted=true`
- **THEN** backend возвращает `404 Not Found`
