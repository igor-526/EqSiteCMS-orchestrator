## ADDED Requirements

### Requirement: Фильтрация лошадей по оказываемым услугам
Backend SHALL принимать в `GET /api/horses` optional повторяемый query-параметр `services: list[UUID]`. Несколько UUID SHALL иметь OR-семантику; data и count SHALL использовать одинаковый tenant-scoped predicate, не дублировать лошадей и сохранять `limit`/`offset`/sort.

| method | path | access class | roles | expected without auth | expected with auth | связанные тесты |
|---|---|---|---|---|---|---|
| `GET` | `/api/horses?services=<uuid>&services=<uuid>` | Public Read | anonymous с tenant key; authenticated CMS user | `200` с tenant key; `400` без tenant context; malformed UUID `422` | `200`; foreign-tenant service IDs дают пустую выдачу без раскрытия | UT-11..UT-23, SM-11..SM-23 |

Изменение не является исключением из default access policy: `GET` остаётся Public Read. Tenant service key задаёт read context и не является CMS-аутентификацией.

#### Scenario: Одна услуга
- **WHEN** consumer вызывает `GET /api/horses?services=<service-a>` в tenant A
- **THEN** backend возвращает только лошадей tenant A, связанных с service-a

#### Scenario: Несколько услуг используют OR
- **WHEN** consumer повторяет параметр `services` для service-a и service-b
- **THEN** backend возвращает уникальное объединение лошадей, связанных хотя бы с одной услугой

#### Scenario: Пустой фильтр
- **WHEN** `services` отсутствует или нормализован в пустой список
- **THEN** backend не добавляет service predicate и сохраняет прежнюю выдачу

#### Scenario: Count и pagination
- **WHEN** service filter применяется вместе с `limit`, `offset` и sort
- **THEN** `count` отражает полный уникальный filtered set, а items соответствуют запрошенной странице

#### Scenario: Anonymous Public Read
- **WHEN** anonymous consumer с валидным tenant key применяет services filter
- **THEN** backend возвращает `200` без CMS cookie

#### Scenario: Отсутствующий tenant context
- **WHEN** anonymous consumer без tenant key вызывает endpoint
- **THEN** backend возвращает действующий контрактный `400`

#### Scenario: Authenticated CMS read
- **WHEN** authenticated CMS user применяет services filter
- **THEN** backend возвращает `200` только в tenant пользователя

#### Scenario: Чужая услуга
- **WHEN** tenant A передаёт UUID услуги tenant B
- **THEN** backend возвращает пустой результат для этого UUID и не раскрывает существование чужой услуги

#### Scenario: Невалидный UUID
- **WHEN** `services` содержит malformed UUID
- **THEN** FastAPI возвращает `422`, не выполняя repository query
