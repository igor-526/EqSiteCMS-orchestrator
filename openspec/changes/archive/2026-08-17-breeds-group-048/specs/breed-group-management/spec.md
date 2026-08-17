## ADDED Requirements

### Requirement: Tenant-scoped модель группы пород
Система MUST хранить группу пород в таблице `breed_groups` с UUID, обязательными `equestrian_id`, `name`, `slug`, `page_data`, `created_at`, `updated_at`; уникальность `name` и `slug` MUST действовать внутри конного объекта. `page_data` MUST по умолчанию быть `<div></div>` и проходить существующую проверку запрета исполняемого JavaScript.

#### Scenario: Создание валидной группы
- **WHEN** администратор создаёт группу с уникальным названием в выбранном конном объекте
- **THEN** система сохраняет tenant-scoped группу, генерирует уникальный slug при его отсутствии и возвращает timestamps

#### Scenario: Изоляция tenants
- **WHEN** один `name` или `slug` используется в разных конных объектах
- **THEN** система допускает обе записи и никогда не возвращает группу другого tenant

#### Scenario: Небезопасный page_data
- **WHEN** create или update содержит HTML с исполняемым JavaScript
- **THEN** система отклоняет бизнес-валидацию с HTTP `400` и не изменяет данные

### Requirement: Связь породы с группой
Система MUST добавить в породу nullable `breed_group_id`, ссылающийся на группу того же `equestrian_id`; DTO породы MUST возвращать nullable компактный объект группы `{id, name, slug}`. Create/update породы MUST принимать nullable `breed_group_id`, причём явный `null` при update MUST отвязывать группу.

#### Scenario: Назначение группы
- **WHEN** protected create/update породы получает UUID существующей группы текущего tenant
- **THEN** связь сохраняется, а read DTO породы содержит `id`, `name` и `slug` группы

#### Scenario: Снятие группы
- **WHEN** PATCH породы получает `breed_group_id: null`
- **THEN** связь удаляется, а последующее чтение возвращает `group: null`

#### Scenario: Чужая или отсутствующая группа
- **WHEN** create/update породы получает UUID отсутствующей группы или группы другого tenant
- **THEN** система возвращает HTTP `400` до записи породы и не раскрывает данные другого tenant

#### Scenario: Удаление группы
- **WHEN** группа удаляется
- **THEN** PostgreSQL `ON DELETE SET NULL` атомарно обнуляет `breed_group_id` у связанных пород, не удаляя породы

### Requirement: List и detail API групп пород
Система SHALL предоставлять `GET /horses/breed-groups` с пагинацией `limit/offset`, текстовыми фильтрами `name`, `slug`, `page_data`, сортировками `name`, `slug`, `created_at`, `updated_at` и обратными вариантами; без `sort` MUST применяться стабильная сортировка `created_at DESC, id DESC`. `GET /horses/breed-groups/{slug_or_id}` MUST искать внутри tenant и включать `page_data` только при `page_data=true`.

#### Scenario: Публичный список
- **WHEN** anonymous consumer передаёт валидный Equestrian Key и вызывает list GET
- **THEN** API возвращает `items/total` только текущего tenant без обязательной cookie

#### Scenario: Стандартная сортировка
- **WHEN** list GET не содержит `sort`
- **THEN** группы возвращаются по `created_at DESC, id DESC` до применения `limit/offset`

#### Scenario: Detail с page_data
- **WHEN** consumer запрашивает группу по slug или UUID с `page_data=true`
- **THEN** ответ содержит безопасно сохранённый `page_data`; без флага поле отсутствует

#### Scenario: Невалидный tenant selector
- **WHEN** Equestrian Key отсутствует или невалиден
- **THEN** Public Read возвращает HTTP `401`

### Requirement: CRUD API групп пород
Система SHALL предоставлять `POST /horses/breed-groups`, `PATCH /horses/breed-groups/{slug_or_id}` и `DELETE /horses/breed-groups/{slug_or_id}` как Protected Write. Только scopes `SUPERUSER`, `ADMIN`, `DEVELOPER` MUST выполнять mutation; anonymous получает `401`, authenticated без разрешённого scope — `403`.

#### Scenario: Авторизованная mutation
- **WHEN** пользователь с разрешённым scope и валидным Equestrian Key выполняет create/update/delete
- **THEN** операция применяется только к текущему tenant и возвращает соответственно `200`, `200`, `204`

#### Scenario: Anonymous mutation
- **WHEN** запрос mutation не имеет валидной аутентификации
- **THEN** API возвращает `401` без записи в БД

#### Scenario: Недостаточный scope
- **WHEN** аутентифицированный пользователь без разрешённого scope выполняет mutation
- **THEN** API возвращает `403` без записи в БД

### Requirement: Расширенный list API пород
`GET /horses/breeds` MUST принимать повторяемый `breed_group_ids` как список UUID, фильтровать по объединению выбранных групп, поддерживать `group_name/-group_name` и `created_at/-created_at` в `sort` и по умолчанию применять `created_at DESC, id DESC`. DTO list/detail породы MUST содержать nullable `group`; create/update DTO MUST принимать nullable `breed_group_id`.

#### Scenario: Фильтр по нескольким группам
- **WHEN** list GET получает два или более `breed_group_ids`
- **THEN** API возвращает породы, относящиеся к любой из выбранных групп, и корректный `total`

#### Scenario: Сортировка по группе
- **WHEN** list GET получает `sort=group_name` или `sort=-group_name`
- **THEN** результат сортируется по человекочитаемому названию группы с детерминированным tie-breaker и согласованным положением пород без группы

#### Scenario: Публичность расширенного DTO
- **WHEN** anonymous consumer с валидным Equestrian Key читает породы
- **THEN** расширенный GET остаётся Public Read и возвращает группу без cookie

### Requirement: Access matrix API групп и пород
Endpoint'ы MUST соответствовать следующей матрице; Equestrian Key является non-secret selector, поэтому missing/invalid selector даёт `401`. Исключений из дефолта Public Read/Protected Write нет.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/horses/breed-groups` | Public Read | все, валидный Equestrian Key | `200`; missing/invalid key `401` | `200`; missing/invalid key `401` |
| GET | `/horses/breed-groups/{slug_or_id}` | Public Read | все, валидный Equestrian Key | `200`/`400` not found; missing/invalid key `401` | то же |
| POST | `/horses/breed-groups` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `200`; без scope `403`; invalid key `401`; validation `400` |
| PATCH | `/horses/breed-groups/{slug_or_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `200`; без scope `403`; foreign/not found `400`; invalid key `401` |
| DELETE | `/horses/breed-groups/{slug_or_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `204`; без scope `403`; foreign/not found `400`; invalid key `401` |
| GET | `/horses/breeds` | Public Read | все, валидный Equestrian Key | `200`; missing/invalid key `401` | то же |
| GET | `/horses/breeds/{slug_or_id}` | Public Read | все, валидный Equestrian Key | `200`/`400` not found; missing/invalid key `401` | то же |
| POST | `/horses/breeds` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `200`; без scope `403`; invalid/foreign group `400` |
| PATCH | `/horses/breeds/{slug_or_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `200`; без scope `403`; invalid/foreign breed/group `400` |

#### Scenario: Контрактная проверка access matrix
- **WHEN** Quality Gate выполняет anonymous и authenticated smoke-сценарии каждой строки
- **THEN** фактические статусы и отсутствие side effects совпадают с матрицей
