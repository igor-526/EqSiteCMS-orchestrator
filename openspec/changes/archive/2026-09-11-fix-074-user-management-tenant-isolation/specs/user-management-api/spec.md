## ADDED Requirements

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
