## ADDED Requirements

### Requirement: Поиск и сортировка справочников по короткому наименованию
Backend SHALL принимать необязательный `short_name` в Public Read list endpoint'ах пород и мастей, SHALL выполнять tenant-scoped case-insensitive substring search по соответствующей колонке и SHALL разрешать `short_name` и `-short_name` в sort allowlist. Create/update/out DTO MUST сохранять существующий контракт `short_name`, включая автогенерацию из `name` при пустом значении.

#### Scenario: Анонимное tenant-scoped чтение пород
- **WHEN** consumer без CMS cookie, но с валидным tenant key вызывает `GET /api/horses/breeds?short_name=ар&sort=short_name`
- **THEN** backend возвращает `200`, только совпавшие записи tenant и сортирует их по возрастанию `short_name`

#### Scenario: Анонимное tenant-scoped чтение мастей
- **WHEN** consumer без CMS cookie, но с валидным tenant key вызывает `GET /api/horses/coat_colors?short_name=гн&sort=-short_name`
- **THEN** backend возвращает `200`, только совпавшие записи tenant и сортирует их по убыванию `short_name`

#### Scenario: Невалидное поле сортировки
- **WHEN** клиент передаёт неизвестное значение sort в list endpoint
- **THEN** FastAPI отклоняет запрос с `422`, не выполняя неразрешённый доступ к колонке

#### Scenario: Protected Write сохраняет короткое наименование
- **WHEN** разрешённый authenticated tenant user создаёт или изменяет породу либо масть с явным `short_name`
- **THEN** backend сохраняет значение и возвращает его в DTO, anonymous write получает `401`, а breed write без требуемого scope получает `403`

### Requirement: Access matrix коротких наименований
Backend SHALL сохранять access classes существующих routes без исключений из Public Read/Protected Write.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/horses/breeds?short_name=&sort=` | Public Read | tenant key | `200` с tenant key; `400` без tenant context | `200` |
| GET | `/api/horses/coat_colors?short_name=&sort=` | Public Read | tenant key | `200` с tenant key; `400` без tenant context | `200` |
| POST/PATCH | `/api/horses/breeds*` | Protected Write | authenticated tenant user + horse/breed scope | `401` | success со scope; `403` без scope; foreign tenant не изменяется |
| POST/PATCH | `/api/horses/coat_colors*` | Protected Write | authenticated tenant user по текущему contract | `401` | success; foreign tenant не изменяется |

#### Scenario: Access review
- **WHEN** Quality Gate проверяет change
- **THEN** anonymous/authenticated tests подтверждают обе Public Read строки и Protected Write `401/403`, а review не объявляет нового access exception
