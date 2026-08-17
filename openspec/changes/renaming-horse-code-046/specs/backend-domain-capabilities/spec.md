## MODIFIED Requirements

### Requirement: Управление лошадьми в tenant-контексте
Backend SHALL предоставлять tenant-scoped CRUD лошадей, фильтрацию, сортировку и пагинацию; mutations MUST требовать CMS-аутентификацию и требуемый scope. Каждая лошадь SHALL поддерживать nullable `pedigree_name` длиной не более 63 символов вместо удалённого `code`; поле SHALL приниматься create/partial update и SHALL присутствовать во всех полных horse response-схемах, включая public JSON, list/detail, pedigree/foal/parent/candidate и mutation responses. Отсутствующее поле PATCH MUST сохранять прежнее значение, а явный `null` MUST очищать его. Только при Public Read через `X-Equestrian-Service-Key` backend MUST рекурсивно возвращать `name = pedigree_name`, когда поле задано, иначе исходную `name`; само поле `pedigree_name` остаётся raw nullable. При CMS cookie-аутентификации backend MUST возвращать исходную `name` и raw `pedigree_name` без подмены, включая явный JSON `null`. Alembic migration MUST удалить `code` без переноса данных и добавить nullable `pedigree_name VARCHAR(63)`.

| method | path | access class | roles | expected without auth | expected with auth | связанные тесты |
|---|---|---|---|---|---|---|
| `GET` | `/api/horses` | Public Read | anonymous с tenant key; CMS user | `200` с валидным key; `401` missing/invalid | `200`, cookie projection имеет приоритет | U-13..U-20, SM-01..SM-10 |
| `GET` | `/api/horses/{slug_or_id}` | Public Read | anonymous с tenant key; CMS user | `200` с валидным key; `401` missing/invalid; `404` resource missing | `200` | U-21..U-25, SM-11..SM-16 |
| `GET` | `/api/horses/{id}/pedigree/{mode}` и responses с `pedigree` | Public Read | anonymous с tenant key; CMS user | `200` с валидным key; `401` missing/invalid | `200` | U-26..U-30, SM-17..SM-22 |
| `POST` | `/api/horses` | Protected Write | user с horse write scope | `401` | `200`; без scope `403`; invalid length `400` | U-01..U-06, SM-23..SM-26 |
| `PATCH` | `/api/horses/{horse_id}` | Protected Write | user с horse write scope | `401` | `200`; без scope `403`; foreign tenant текущий `400`; invalid length `400` | U-07..U-12, SM-27..SM-32 |
| `DELETE` | `/api/horses/{horse_id}` | Protected Write | user с horse write scope | `401` | `204`; без scope `403`; foreign tenant текущий `400` | regression, SM-33..SM-35 |

Исключений из дефолтной access policy нет. Tenant selector является identity hint: missing/invalid selector возвращает `401`.

#### Scenario: Public list использует кличку родословной
- **WHEN** consumer с валидным tenant service key без CMS cookie вызывает `GET /api/horses` для лошадей с заполненным и пустым `pedigree_name`
- **THEN** backend возвращает `200`, подставляет заполненное значение в `name`, а при `NULL` сохраняет основную `name`

#### Scenario: Public detail и вложенная родословная
- **WHEN** service-key consumer читает detail/pedigree/candidates с root, sire, dam, foals и parents
- **THEN** каждый horse node независимо получает эффективную `name = pedigree_name ?? name` без подстановки значения другой записи

#### Scenario: CMS читает необработанные значения
- **WHEN** authenticated cookie CMS user вызывает horse list/detail/pedigree, даже если также передан service key
- **THEN** backend возвращает исходную `name` и raw nullable `pedigree_name` каждого node без public fallback; незаполненное значение сериализуется именно как `pedigree_name: null`

#### Scenario: Создание и частичное изменение клички родословной
- **WHEN** пользователь с horse write scope создаёт или изменяет horse с `pedigree_name` длиной до 63 символов, omits поле либо передаёт `null`
- **THEN** backend соответственно сохраняет значение, сохраняет прежнее либо очищает SQL `NULL` и возвращает CMS projection

#### Scenario: Невалидная длина
- **WHEN** POST или PATCH получает `pedigree_name` длиной 64 символа
- **THEN** backend возвращает контрактный `400` без изменения PostgreSQL

#### Scenario: Удалённое поле code
- **WHEN** migration применена и клиент читает или изменяет horse
- **THEN** PostgreSQL и DTO не содержат `code`, старые значения не перенесены, а неизвестное поле не становится частью persisted contract

#### Scenario: Анонимные и недостаточно привилегированные writes
- **WHEN** anonymous либо authenticated без horse write scope вызывает POST/PATCH/DELETE
- **THEN** backend возвращает соответственно `401` или `403` и не изменяет `pedigree_name` либо другие данные

#### Scenario: Чужой tenant
- **WHEN** authenticated пользователь изменяет horse вне своего tenant
- **THEN** lookup остаётся tenant-scoped, backend возвращает текущий `400`, и чужая запись не изменяется
