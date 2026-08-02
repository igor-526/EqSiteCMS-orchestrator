## MODIFIED Requirements

### Requirement: Управление лошадьми в tenant-контексте
Backend SHALL предоставлять tenant-scoped CRUD лошадей, фильтрацию, сортировку и пагинацию; mutations MUST требовать CMS-аутентификацию и требуемый scope. Каждая лошадь SHALL поддерживать nullable `code` как произвольную строку длиной не более 31 символа; поле SHALL приниматься create/partial update и SHALL присутствовать во всех полных horse response-схемах, включая list/detail, pedigree/foal/candidate и mutation responses. Отсутствующее поле PATCH MUST сохранять прежний code, а явный `null` MUST очищать его.

| method | path | access class | roles | expected without auth | expected with auth | связанные тесты |
|---|---|---|---|---|---|---|
| `GET` | `/api/horses` | Public Read | anonymous с tenant key; CMS user | `200` с валидным key; `400` без key; `404` с неизвестным | `200` | U-13..U-18, SM-01..SM-08 |
| `GET` | `/api/horses/{slug_or_id}` | Public Read | anonymous с tenant key; CMS user | `200` с валидным key; tenant/resource error `400/404` | `200` | U-19..U-23, SM-09..SM-14 |
| `GET` | `/api/horses/{id}/pedigree/{mode}` и responses с `pedigree` | Public Read | anonymous с tenant key; CMS user | `200` с валидным key; tenant errors как выше | `200` | U-24..U-27, SM-15..SM-18 |
| `POST` | `/api/horses` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `200`; без scope `403`; invalid length `400` по глобальному `RequestValidationError` contract | U-01..U-06, U-28, SM-19..SM-26 |
| `PATCH` | `/api/horses/{horse_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `200`; без scope `403`; чужой tenant `400`; invalid length `400` по глобальному `RequestValidationError` contract | U-07..U-12, U-29..U-30, SM-27..SM-35 |

Исключений из дефолтной access policy нет.

#### Scenario: Публичное чтение лошадей
- **WHEN** consumer с валидным tenant service key вызывает `GET /api/horses` или `GET /api/horses/{slug_or_id}` без CMS cookie
- **THEN** backend возвращает `200` только для данных соответствующего tenant, и каждая полная horse-схема содержит `code` со строкой либо `null`

#### Scenario: Создание лошади с кодом
- **WHEN** authenticated пользователь с требуемым scope создаёт лошадь с code длиной от 0 до 31 символа либо без code
- **THEN** backend возвращает `200`, точно сохраняет переданное значение либо `NULL` и отдаёт его последующими list/detail запросами

#### Scenario: Граничная длина кода
- **WHEN** клиент передаёт code длиной ровно 31 символ в POST или PATCH
- **THEN** операция принимается, а значение длиной 32 символа отклоняется `400` существующим глобальным `RequestValidationError` handler без изменения PostgreSQL

#### Scenario: Частичное обновление и очистка
- **WHEN** authorized PATCH не содержит поле code, содержит новое значение либо явный `null`
- **THEN** backend соответственно сохраняет прежний code, заменяет его или очищает до SQL `NULL`, не изменяя неуказанные поля

#### Scenario: Код во вложенных horse responses
- **WHEN** клиент читает лошадь с pedigree, candidates/foals либо получает horse response после поддерживаемой mutation
- **THEN** каждая полная схема лошади сериализует собственный code без подстановки code корневой записи

#### Scenario: Анонимное изменение лошади
- **WHEN** anonymous клиент вызывает POST или PATCH семейства `/api/horses`
- **THEN** backend возвращает `401` и не изменяет code или другие данные

#### Scenario: Недостаточный scope
- **WHEN** authenticated пользователь без требуемого horse scope вызывает POST или PATCH
- **THEN** backend возвращает `403` и не выполняет запись

#### Scenario: Изменение чужого tenant-ресурса
- **WHEN** authenticated пользователь пытается изменить code лошади вне разрешённого tenant context
- **THEN** repository lookup ограничен tenant пользователя, backend возвращает текущий service-layer статус `400` как «ресурс не найден» и чужая запись остаётся неизменной
