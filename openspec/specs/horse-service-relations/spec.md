# horse-service-relations Specification

## Purpose
Зафиксировать требования к API CRUD для управления связями лошадь-услуга с override-полями (description, price, price_formatter).

## ADDED Requirements

### Requirement: Создание связи лошадь-услуга
Backend SHALL предоставлять эндпоинт `POST /api/horses/{horse_id}/services` для создания связи между лошадью и услугой с опциональными override-полями. Эндпоинт SHALL требовать авторизации и horse write scope.

#### Scenario: Успешное создание связи
- **WHEN** авторизованный пользователь с horse write scope отправляет `POST /api/horses/{horse_id}/services` с `service_id` и опциональными `description_override`, `price_override`, `price_formatter_override`
- **THEN** backend создаёт запись в `horse_service_relations`, возвращает `201` с `HorseServiceRelationOutDto`

#### Scenario: Создание связи без авторизации
- **WHEN** анонимный пользователь отправляет `POST /api/horses/{horse_id}/services`
- **THEN** backend возвращает `401`

#### Scenario: Дублирование связи
- **WHEN** авторизованный пользователь создаёт связь с услугой, которая уже привязана к данной лошади
- **THEN** backend возвращает `409` с сообщением «Услуга уже привязана к этой лошади»

#### Scenario: Несуществующая лошадь
- **WHEN** авторизованный пользователь создаёт связь с несуществующим `horse_id`
- **THEN** backend возвращает `404`

#### Scenario: Несуществующая услуга
- **WHEN** авторизованный пользователь создаёт связь с несуществующим `service_id`
- **THEN** backend возвращает `404`

### Requirement: Обновление связи лошадь-услуга
Backend SHALL предоставлять эндпоинт `PATCH /api/horses/{horse_id}/services/{relation_id}` для обновления override-полей связи. Эндпоинт SHALL требовать авторизации и horse write scope.

#### Scenario: Успешное обновление связи
- **WHEN** авторизованный пользователь отправляет `PATCH /api/horses/{horse_id}/services/{relation_id}` с обновлёнными override-полями
- **THEN** backend обновляет запись, возвращает `200` с обновлённым `HorseServiceRelationOutDto`

#### Scenario: Обновление несуществующей связи
- **WHEN** авторизованный пользователь обновляет связь с несуществующим `relation_id`
- **THEN** backend возвращает `404`

#### Scenario: Обновление связи без авторизации
- **WHEN** анонимный пользователь отправляет `PATCH /api/horses/{horse_id}/services/{relation_id}`
- **THEN** backend возвращает `401`

### Requirement: Удаление связи лошадь-услуга
Backend SHALL предоставлять эндпоинт `DELETE /api/horses/{horse_id}/services/{relation_id}` для удаления связи. Эндпоинт SHALL требовать авторизации и horse write scope.

#### Scenario: Успешное удаление связи
- **WHEN** авторизованный пользователь отправляет `DELETE /api/horses/{horse_id}/services/{relation_id}`
- **THEN** backend удаляет запись, возвращает `204`

#### Scenario: Удаление несуществующей связи
- **WHEN** авторизованный пользователь удаляет связь с несуществующим `relation_id`
- **THEN** backend возвращает `404`

#### Scenario: Удаление связи без авторизации
- **WHEN** анонимный пользователь отправляет `DELETE /api/horses/{horse_id}/services/{relation_id}`
- **THEN** backend возвращает `401`

### Requirement: Получение списка связей лошади
Backend SHALL предоставлять эндпоинт `GET /api/horses/{horse_id}/services` для получения списка связанных услуг лошади с учётом override. Эндпоинт SHALL быть Public Read (доступен без авторизации с tenant service key).

#### Scenario: Получение списка связей с авторизацией
- **WHEN** авторизованный пользователь отправляет `GET /api/horses/{horse_id}/services`
- **THEN** backend возвращает `200` с `PaginatedEntities[HorseServiceRelationOutDto]`

#### Scenario: Получение списка связей без авторизации (Public Read)
- **WHEN** анонимный consumer с tenant service key отправляет `GET /api/horses/{horse_id}/services`
- **THEN** backend возвращает `200` с `PaginatedEntities[HorseServiceRelationOutDto]`

### Requirement: Получение доступных услуг для привязки
Backend SHALL предоставлять эндпоинт `GET /api/horses/{horse_id}/available-services?search=` для получения услуг, ещё не привязанных к данной лошади, с фильтрацией по `search` (substring search по name, case-insensitive). Эндпоинт SHALL быть Protected Read (требовать авторизации, т.к. используется в CMS Select).

#### Scenario: Получение доступных услуг
- **WHEN** авторизованный пользователь отправляет `GET /api/horses/{horse_id}/available-services`
- **THEN** backend возвращает `200` со списком услуг, не привязанных к данной лошади

#### Scenario: Поиск доступных услуг
- **WHEN** авторизованный пользователь отправляет `GET /api/horses/{horse_id}/available-services?search=раз`
- **THEN** backend возвращает `200` только с услугами, содержащими «раз» в name (case-insensitive), и не привязанными к лошади

#### Scenario: Получение доступных услуг без авторизации
- **WHEN** анонимный пользователь отправляет `GET /api/horses/{horse_id}/available-services`
- **THEN** backend возвращает `401`

### Requirement: Access matrix для связей лошадь-услуга
Backend SHALL соблюдать следующую access matrix для endpoints связей лошадь-услуга. POST, PATCH и DELETE SHALL требовать авторизации (Protected Write). GET списка связей SHALL быть доступен без авторизации с tenant service key (Public Read). GET доступных услуг SHALL требовать авторизации (Protected Read). Исключений из дефолтной access policy нет.

| method | path | access class | roles | expected without auth | expected with auth | связанные тесты |
|--------|------|-------------|-------|----------------------|-------------------|-----------------|
| `POST` | `/api/horses/{horse_id}/services` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `201`; без scope `403`; дубликат `409`; несуществующий horse/service `404` | HSR-01..HSR-05 |
| `PATCH` | `/api/horses/{horse_id}/services/{relation_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `200`; несуществующая связь `404`; без scope `403` | HSR-06..HSR-08 |
| `DELETE` | `/api/horses/{horse_id}/services/{relation_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `204`; несуществующая связь `404`; без scope `403` | HSR-09..HSR-11 |
| `GET` | `/api/horses/{horse_id}/services` | Public Read | anonymous с tenant key; CMS user | `200` с tenant key; `400` без key | `200` | HSR-12..HSR-13 |
| `GET` | `/api/horses/{horse_id}/available-services?search=` | Protected Read | authenticated CMS user | `401` | `200` с отфильтрованным списком; без scope `403` | HSR-14..HSR-16 |

#### Scenario: Anonymous POST отклонён
- **WHEN** анонимный пользователь отправляет `POST /api/horses/{horse_id}/services`
- **THEN** backend возвращает `401` и не создаёт связь

#### Scenario: Authenticated POST без scope
- **WHEN** авторизованный пользователь без horse write scope отправляет `POST /api/horses/{horse_id}/services`
- **THEN** backend возвращает `403` и не создаёт связь

#### Scenario: Authenticated POST принят
- **WHEN** авторизованный пользователь с horse write scope отправляет `POST /api/horses/{horse_id}/services` с валидными данными
- **THEN** backend возвращает `201` с созданной связью

#### Scenario: Anonymous GET принят
- **WHEN** анонимный consumer с tenant service key отправляет `GET /api/horses/{horse_id}/services`
- **THEN** backend возвращает `200` со списком связей

#### Scenario: Anonymous GET без tenant key
- **WHEN** анонимный consumer без tenant service key отправляет `GET /api/horses/{horse_id}/services`
- **THEN** backend возвращает `400` (отсутствует tenant context)

#### Scenario: Anonymous GET доступных услуг отклонён
- **WHEN** анонимный пользователь отправляет `GET /api/horses/{horse_id}/available-services`
- **THEN** backend возвращает `401`

#### Scenario: Изоляция tenant
- **WHEN** авторизованный пользователь пытается создать связь для лошади чужого tenant
- **THEN** backend возвращает `404` и не создаёт связь

### Requirement: Override-подстановка при чтении лошади
Backend SHALL подставлять override-значения из `horse_service_relations` при формировании `HorseOutDto.services`. Если `description_override` не null, использовать его вместо `description` услуги. Аналогично для `price_override` и `price_formatter_override`.

#### Scenario: Лошадь с переопределёнными услугами
- **WHEN** consumer читает `GET /api/horses/{slug_or_id}` и у лошади есть связь с `price_override=600000`
- **THEN** `HorseOutDto.services[].price` возвращает `600000` (override), а не дефолтную цену услуги

#### Scenario: Лошадь без переопределений
- **WHEN** consumer читает `GET /api/horses/{slug_or_id}` и связи не имеют override
- **THEN** `HorseOutDto.services` возвращает дефолтные значения услуг

### Requirement: Автогенерация slug для услуги
Backend SHALL автоматически генерировать slug из name при создании или обновлении услуги, если slug не передан или передана пустая строка.

#### Scenario: Создание услуги без slug
- **WHEN** авторизованный пользователь отправляет `POST /api/horses/services` с `name="Разведение"` и `slug=null`
- **THEN** backend генерирует slug из name (например, `razvedenie`), возвращает `200` с заполненным slug

#### Scenario: Создание услуги с пустым slug
- **WHEN** авторизованный пользователь отправляет `POST /api/horses/services` с `name="Разведение"` и `slug=""`
- **THEN** backend генерирует slug из name, возвращает `200` с заполненным slug

#### Scenario: Обновление услуги с пустым slug
- **WHEN** авторизованный пользователь отправляет `PATCH /api/horses/services/{slug_or_id}` с `slug=""`
- **THEN** backend генерирует slug из name, возвращает `200` с заполненным slug

### Requirement: Необязательное описание услуги
Backend SHALL принимать пустое описание услуги (`description=null` или `description=""`) при создании и обновлении без возврата ошибки валидации.

#### Scenario: Создание услуги без описания
- **WHEN** авторизованный пользователь отправляет `POST /api/horses/services` с `description=null`
- **THEN** backend создаёт услугу, возвращает `200` с `description=null`

#### Scenario: Создание услуги с пустым описанием
- **WHEN** авторизованный пользователь отправляет `POST /api/horses/services` с `description=""`
- **THEN** backend создаёт услугу, возвращает `200` с `description=null` (пустая строка → null)

#### Scenario: Обновление услуги с пустым описанием
- **WHEN** авторизованный пользователь отправляет `PATCH /api/horses/services/{slug_or_id}` с `description=""`
- **THEN** backend обновляет услугу, возвращает `200` с `description=null`
