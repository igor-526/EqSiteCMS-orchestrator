## MODIFIED Requirements

### Requirement: Access matrix API групп и пород
Endpoint'ы MUST соответствовать следующей матрице; Equestrian Key является non-secret selector, поэтому missing/invalid selector даёт `401`. Исключений из дефолта Public Read/Protected Write нет.

#### Scenario: Контрактная проверка access matrix
- **WHEN** Quality Gate выполняет anonymous и authenticated smoke-сценарии каждой строки
- **THEN** фактические статусы и отсутствие side effects совпадают с матрицей

#### Scenario: Неизменная access matrix и основания её применения
- **WHEN** проверяется доступ по строкам следующей матрицы
- **THEN** действует следующий исходный контракт без изменения условий и outcomes:

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
