## ADDED Requirements

### Requirement: Имя фотографии безопасно укладывается в ограничение хранения
Backend SHALL принимать имя фотографии любой длины и MUST до repository insert/update преобразовать его в tenant-scoped уникальное display name длиной не более 63 Unicode code points. Алгоритм SHALL нормализовать basename в NFC, удалить path/control components, сохранить безопасное extension и для длинного имени сформировать `<readable-prefix>-<digest12><extension>`, где `digest12` получен из SHA-256 полного нормализованного исходного имени и identity ресурса/содержимого. DB `StringDataRightTruncationError` и HTTP `500` не являются допустимым outcome длины имени.

#### Scenario: Граничное имя создаётся
- **WHEN** authenticated tenant user отправляет `POST /api/photos` с валидным файлом и именем ровно 63 символа
- **THEN** backend сохраняет media object и photo row и возвращает успешный create response

#### Scenario: Длинное имя сокращается без участия пользователя
- **WHEN** authenticated tenant user отправляет `POST /api/photos` с именем 64 или более символов
- **THEN** backend создаёт фотографию, возвращает фактически сохранённое имя длиной ≤63 с читаемым prefix, `digest12` и сохранённым extension и не возвращает `500`

#### Scenario: Длинное имя при update сокращается стабильно
- **WHEN** authenticated owner отправляет `PATCH /api/photos/{id}` с именем 64 или более символов с новым файлом или без него
- **THEN** backend использует UUID этой фотографии как identity, сохраняет bounded name ≤63 и возвращает успешный updated DTO

#### Scenario: Имя из filename проходит тот же инвариант
- **WHEN** create использует filename как fallback для пустого name и полученное имя превышает 63 символа
- **THEN** backend нормализует и сокращает fallback тем же алгоритмом и успешно создаёт фотографию

#### Scenario: Одинаковое имя у разных файлов различается hash
- **WHEN** в одном tenant загружаются разные файлы с одинаковым длинным исходным именем
- **THEN** content identity формирует разные `digest12`, обе фотографии создаются и оба имени укладываются в 63 символа

#### Scenario: Повторная загрузка того же файла создаёт отдельный ресурс
- **WHEN** в одном tenant повторно загружается тот же content с тем же исходным именем
- **THEN** первый bounded candidate совпадает, repository collision loop добавляет `-2` (далее `-3`, ...) перед extension и создаёт отдельную photo row

#### Scenario: Одинаковое короткое имя сохраняет читаемость
- **WHEN** в одном tenant загружаются разные или одинаковые файлы с одинаковым именем, которое помещается в 63 символа
- **THEN** первая row получает исходное нормализованное имя, следующие получают `-2`, `-3`, ... перед extension без обязательного hash

#### Scenario: Hash collision разрешается без потери данных
- **WHEN** разные inputs дают одинаковые первые 12 hex SHA-256 либо candidate уже занят
- **THEN** backend не полагается на вероятность hash, а находит свободное bounded имя последовательным discriminator и не возвращает `500`

#### Scenario: Unicode и очень длинное имя остаются корректными
- **WHEN** исходное имя содержит decomposed Unicode, emoji/CJK, path components или тысячи code points
- **THEN** backend применяет basename + NFC + safe extension, не разрезает кодировку и сохраняет итог длиной ≤63

#### Scenario: Параллельная коллизия сериализуется ограничением БД
- **WHEN** два concurrent create вычисляют одинаковый свободный candidate
- **THEN** unique constraint определяет победителя, а проигравший выполняет до 100 attempts с новым discriminator, после чего возвращает явный `409` без internal `500`

### Requirement: Tenant-scoped уникальность имён гарантируется схемой PostgreSQL
Таблица `photos` SHALL иметь именованный `UniqueConstraint(equestrian_id, name)` `uq_photos_equestrian_name`. Alembic upgrade MUST до создания constraint транзакционно обнаружить и детерминированно переименовать существующие exact duplicates без удаления rows, media paths или relations; после cleanup повторная preflight-проверка MUST доказать отсутствие дублей. Неуникальный `ix_photos_equestrian_name` SHALL быть заменён constraint-backed unique index.

#### Scenario: Чистая БД получает constraint без изменений данных
- **WHEN** migration запускается на PostgreSQL без tenant-scoped duplicate names
- **THEN** ни одна photo row не переименовывается, старый индекс удаляется и `uq_photos_equestrian_name` создаётся

#### Scenario: Existing duplicates разрешаются детерминированно
- **WHEN** tenant содержит несколько rows с одинаковым name
- **THEN** keeper выбирается по `created_at NULLS LAST, id`, остальные получают первые свободные bounded suffix names с учётом всех уже существующих names tenant

#### Scenario: Existing suffix не перезаписывается
- **WHEN** tenant содержит duplicates `photo.jpg` и отдельную row `photo-2.jpg`
- **THEN** cleanup резервирует `photo-2.jpg` и переименовывает duplicate в следующий свободный candidate, например `photo-3.jpg`

#### Scenario: Migration сохраняет связи и media identity
- **WHEN** cleanup переименовывает конфликтующую photo row
- **THEN** её `id`, `path`, timestamps и horse/price/news relations сохраняются, меняется только `name`

#### Scenario: Failed post-check откатывает upgrade
- **WHEN** после cleanup остаётся duplicate либо имя превышает 63 code points
- **THEN** migration aborts и PostgreSQL transaction откатывает updates/drop/create operations

#### Scenario: Downgrade сохраняет данные без ложного восстановления имён
- **WHEN** выполняется downgrade
- **THEN** unique constraint удаляется и неуникальный индекс восстанавливается, но детерминированные rename не обращаются автоматически и это явно отражено в migration metadata

### Requirement: Access matrix операций фотографий сохраняется
Изменение SHALL сохранять существующие access classes и tenant isolation. Новых endpoint или исключений из default policy нет.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `GET` | `/api/photos`, `/api/photos/{id}` | Public Read с tenant selector | anonymous consumer с валидным tenant key или authenticated tenant user | валидный key: `200/404`; missing/invalid selector: действующий `400/404`, refresh-only: `401` | `200/404` в tenant пользователя |
| `POST` | `/api/photos` | Protected Write | authenticated tenant user | `401` | валидный файл с name любой длины: success и bounded unique name; чужой tenant context не создаёт ресурс |
| `PATCH` | `/api/photos/{id}` | Protected Write | authenticated tenant user, только свой tenant resource | `401` | owner: `200` с bounded unique name; foreign resource: действующий non-success contract без mutation |
| `DELETE` | `/api/photos/{id}` | Protected Write | authenticated tenant user, только свой tenant resource | `401` | owner: `204`; foreign/not-found: действующий non-success contract без mutation |

#### Scenario: Anonymous write запрещён
- **WHEN** запрос `POST`, `PATCH` или `DELETE` фотографии выполняется без valid authentication
- **THEN** backend возвращает `401` и не изменяет PostgreSQL/media storage

#### Scenario: Authenticated validation не меняет access outcome
- **WHEN** authenticated tenant user создаёт или переименовывает собственную фотографию
- **THEN** backend применяет bounded naming после authentication/tenant resolution и возвращает success независимо от длины валидного исходного имени

#### Scenario: Чужой ресурс не мутируется
- **WHEN** authenticated user пытается PATCH или DELETE фотографии другого tenant
- **THEN** backend возвращает действующий контрактный non-success status и не меняет чужую строку или media object

#### Scenario: Public read не приватизируется
- **WHEN** anonymous consumer выполняет GET фотографии с валидным tenant selector
- **THEN** backend сохраняет существующий Public Read outcome без требования CMS cookie
