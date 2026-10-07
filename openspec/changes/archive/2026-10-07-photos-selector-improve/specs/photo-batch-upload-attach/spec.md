## ADDED Requirements

### Requirement: Batch upload endpoint для услуг

Система ДОЛЖНА (SHALL) предоставлять endpoint `POST /prices/{id}/photos/upload` для атомарной загрузки нескольких фотографий и автоматического присоединения их к услуге за один HTTP запрос.

#### Scenario: Успешная загрузка 3 файлов к услуге

- **WHEN** администратор отправляет `POST /prices/{price_id}/photos/upload` с 3 файлами в `multipart/form-data`
- **THEN** система создаёт 3 записи Photo в БД
- **AND** система добавляет 3 photo_ids в массив `price.photo_ids`
- **AND** возвращает `200 OK` с массивом из 3 `PhotoOutShortDto`

#### Scenario: Partial success (2 из 3 файлов успешны)

- **WHEN** администратор отправляет 3 файла, один из которых превышает max размер
- **THEN** система создаёт 2 записи Photo для валидных файлов
- **AND** система добавляет 2 photo_ids в `price.photo_ids`
- **AND** возвращает `200 OK` с `photos: [2 PhotoOutShortDto]` и `errors: [{index: 2, message: "File too large"}]`

#### Scenario: Попытка загрузить без авторизации

- **WHEN** неавторизованный пользователь отправляет `POST /prices/{price_id}/photos/upload`
- **THEN** система возвращает `401 Unauthorized`
- **AND** файлы НЕ загружаются
- **AND** `price.photo_ids` не меняется

#### Scenario: Попытка загрузить к чужой услуге

- **WHEN** администратор tenant A отправляет запрос к услуге tenant B
- **THEN** система возвращает `403 Forbidden`
- **AND** файлы НЕ загружаются
- **AND** `price.photo_ids` не меняется

#### Scenario: Несуществующая услуга

- **WHEN** администратор отправляет запрос к несуществующему `price_id`
- **THEN** система возвращает `404 Not Found`
- **AND** файлы НЕ загружаются

#### Scenario: Загрузка с метаданными (names и descriptions)

- **WHEN** администратор отправляет 2 файла с `names[]` = ["Фото 1", "Фото 2"] и `descriptions[]` = ["Описание 1", ""]
- **THEN** система создаёт Photo записи с соответствующими name и description
- **AND** возвращает `200 OK` с массивом из 2 `PhotoOutShortDto` содержащими указанные метаданные

### Requirement: Batch upload endpoint для лошадей

Система ДОЛЖНА (SHALL) предоставлять endpoint `POST /horses/{id}/photos/upload` для атомарной загрузки нескольких фотографий и автоматического присоединения их к лошади за один HTTP запрос.

#### Scenario: Успешная загрузка 5 файлов к лошади

- **WHEN** администратор отправляет `POST /horses/{horse_id}/photos/upload` с 5 файлами
- **THEN** система создаёт 5 записей Photo в БД
- **AND** система добавляет 5 photo_ids в массив `horse.photo_ids`
- **AND** возвращает `200 OK` с массивом из 5 `PhotoOutShortDto`

#### Scenario: Попытка загрузить без прав доступа к лошади

- **WHEN** администратор без прав на редактирование horse отправляет запрос
- **THEN** система возвращает `403 Forbidden`
- **AND** файлы НЕ загружаются
- **AND** `horse.photo_ids` не меняется

### Requirement: Batch upload endpoint для новостей

Система ДОЛЖНА (SHALL) предоставлять endpoint `POST /news/{id}/photos/upload` для атомарной загрузки нескольких фотографий и автоматического присоединения их к новости за один HTTP запрос.

#### Scenario: Успешная загрузка 1 файла к новости

- **WHEN** администратор отправляет `POST /news/{news_id}/photos/upload` с 1 файлом
- **THEN** система создаёт 1 запись Photo в БД
- **AND** система добавляет 1 photo_id в массив `news.photo_ids`
- **AND** возвращает `200 OK` с массивом из 1 `PhotoOutShortDto`

#### Scenario: Попытка загрузить без прав доступа к новости

- **WHEN** администратор без прав на редактирование news отправляет запрос
- **THEN** система возвращает `403 Forbidden`
- **AND** файлы НЕ загружаются
- **AND** `news.photo_ids` не меняется

### Requirement: Формат запроса multipart/form-data

Все batch upload endpoints ДОЛЖНЫ (SHALL) принимать `multipart/form-data` с следующими полями:
- `files[]` — массив файлов (обязательное поле, минимум 1 файл, максимум 20 файлов)
- `names[]` — массив строк с названиями (опциональное поле, по индексу соответствует `files[]`)
- `descriptions[]` — массив строк с описаниями (опциональное поле, по индексу соответствует `files[]`)

#### Scenario: Валидация минимального количества файлов

- **WHEN** администратор отправляет запрос без `files[]`
- **THEN** система возвращает `422 Unprocessable Entity` с сообщением "At least one file is required"
- **AND** никакие Photo записи НЕ создаются

#### Scenario: Валидация максимального количества файлов

- **WHEN** администратор отправляет 21 файл
- **THEN** система возвращает `422 Unprocessable Entity` с сообщением "Maximum 20 files allowed"
- **AND** никакие Photo записи НЕ создаются

#### Scenario: Несоответствие длины массивов names и files

- **WHEN** администратор отправляет 3 файла и 2 names
- **THEN** система использует указанные names для первых 2 файлов
- **AND** для 3-го файла генерирует name из filename
- **AND** загрузка проходит успешно

### Requirement: Формат ответа с поддержкой partial success

Все batch upload endpoints ДОЛЖНЫ (SHALL) возвращать JSON с полями:
- `photos: PhotoOutShortDto[]` — массив успешно загруженных фотографий
- `errors: {index: int, message: string}[]` — массив ошибок для неудачных файлов (опциональное поле)

#### Scenario: Полный успех (все файлы загружены)

- **WHEN** все файлы валидны и успешно загружены
- **THEN** ответ содержит `photos: [...]` с N элементами
- **AND** поле `errors` отсутствует или пустой массив

#### Scenario: Partial success (некоторые файлы с ошибками)

- **WHEN** 2 файла валидны, 1 файл превышает размер, 1 файл не является изображением
- **THEN** ответ содержит `photos: [2 PhotoOutShortDto]` для успешных файлов
- **AND** поле `errors: [{index: 2, message: "File too large"}, {index: 3, message: "Invalid image format"}]`
- **AND** HTTP status = `200 OK` (не 207 Multi-Status, чтобы упростить frontend обработку)

#### Scenario: Полный провал (все файлы с ошибками)

- **WHEN** все файлы невалидны (например, все не изображения)
- **THEN** ответ содержит `photos: []` (пустой массив)
- **AND** поле `errors: [{index: 0, ...}, {index: 1, ...}, ...]` со всеми ошибками
- **AND** HTTP status = `200 OK` (клиент должен проверить `photos.length === 0`)

### Requirement: Транзакционность операции

Система ДОЛЖНА (SHALL) выполнять операцию batch upload+attach в рамках database transaction. При включённом режиме "strict transaction" (по умолчанию выключен), любая ошибка ДОЛЖНА (SHALL) приводить к rollback всех созданных Photo records и изменений в entity.photo_ids.

#### Scenario: Strict transaction mode — rollback при ошибке

- **WHEN** strict transaction mode включён
- **AND** администратор загружает 3 файла, второй файл вызывает ошибку БД
- **THEN** система откатывает все изменения (rollback)
- **AND** НЕ создаётся ни одна Photo запись
- **AND** `entity.photo_ids` не меняется
- **AND** возвращает `500 Internal Server Error` или `422 Unprocessable Entity`

#### Scenario: Partial success mode (по умолчанию) — успешные файлы коммитятся

- **WHEN** strict transaction mode выключен (default)
- **AND** администратор загружает 3 файла, второй файл невалиден
- **THEN** система создаёт Photo записи для файлов 0 и 2
- **AND** система добавляет 2 photo_ids в `entity.photo_ids`
- **AND** возвращает `200 OK` с `photos: [2 PhotoOutShortDto]` и `errors: [{index: 1, ...}]`

### Requirement: Access control матрица

Все batch upload endpoints ДОЛЖНЫ (SHALL) проверять права доступа согласно следующей матрице:

| Method | Path | Access Class | Roles | Expected без auth | Expected с auth (owner) | Expected с auth (не owner) |
|--------|------|--------------|-------|-------------------|------------------------|---------------------------|
| POST | `/prices/{id}/photos/upload` | Protected Write | admin | 401 Unauthorized | 200 OK | 403 Forbidden |
| POST | `/horses/{id}/photos/upload` | Protected Write | admin | 401 Unauthorized | 200 OK | 403 Forbidden |
| POST | `/news/{id}/photos/upload` | Protected Write | admin | 401 Unauthorized | 200 OK | 403 Forbidden |

#### Scenario: Anonymous request к batch upload endpoint

- **WHEN** неавторизованный пользователь отправляет запрос к любому batch upload endpoint
- **THEN** система возвращает `401 Unauthorized`
- **AND** header `WWW-Authenticate` присутствует

#### Scenario: Authenticated non-admin request

- **WHEN** авторизованный пользователь без роли admin отправляет запрос
- **THEN** система возвращает `403 Forbidden`
- **AND** файлы НЕ загружаются

#### Scenario: Authenticated admin request к entity другого tenant

- **WHEN** admin tenant A отправляет запрос к entity tenant B
- **THEN** система возвращает `403 Forbidden`
- **AND** файлы НЕ загружаются
