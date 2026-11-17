# Spec Delta

## MODIFIED Requirements

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
- **THEN** система возвращает `404 Not Found`
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

### Requirement: Формат запроса multipart/form-data

Все batch upload endpoints ДОЛЖНЫ (SHALL) принимать `multipart/form-data` с следующими полями:
- `files` — массив файлов (обязательное поле, минимум 1 файл, максимум 20 файлов)
- `names` — массив строк с названиями (опциональное поле, по индексу соответствует `files`)
- `descriptions` — массив строк с описаниями (опциональное поле, по индексу соответствует `files`)

#### Scenario: Валидация минимального количества файлов

- **WHEN** администратор отправляет запрос без `files`
- **THEN** система возвращает `400 Bad Request` с сообщением об обязательном массиве файлов
- **AND** никакие Photo записи НЕ создаются

#### Scenario: Валидация максимального количества файлов

- **WHEN** администратор отправляет 21 файл
- **THEN** система возвращает `400 Bad Request` с сообщением о превышении лимита файлов
- **AND** никакие Photo записи НЕ создаются

#### Scenario: Несоответствие длины массивов names и files

- **WHEN** администратор отправляет 3 файла и 2 names
- **THEN** система использует указанные names для первых 2 файлов
- **AND** для 3-го файла генерирует name из filename
- **AND** загрузка проходит успешно

### Requirement: Access control матрица

Все batch upload endpoints ДОЛЖНЫ (SHALL) требовать cookie-аутентификацию, административные права и tenant из сессии. Доступная сущность принадлежит tenant сессии; отсутствие записи в этом tenant возвращает 404 без глобального поиска. Административными считаются scopes ADMIN, SUPERUSER или DEVELOPER; SEO-only и пустой набор scopes не дают права записи.

#### Scenario: Anonymous request к batch upload endpoint

- **WHEN** неавторизованный пользователь отправляет валидный multipart-запрос к любому batch upload endpoint
- **THEN** система возвращает `401 Unauthorized` с `WWW-Authenticate`
- **AND** storage, Photo records и связи не изменяются

#### Scenario: Authenticated non-admin request

- **WHEN** пользователь без административного scope отправляет валидный запрос к любому из трёх upload endpoints
- **THEN** система возвращает `403 Forbidden` до загрузки и изменения связей

#### Scenario: Authenticated admin request к entity другого tenant

- **WHEN** администратор tenant A отправляет запрос к entity tenant B
- **THEN** система возвращает `404 Not Found`, как для отсутствующей entity
- **AND** файлы и связи обоих tenant не изменяются

#### Scenario: Матрица доступа для всех batch upload endpoints

- **WHEN** приходит запрос к одному из перечисленных endpoints с корректным multipart
- **THEN** применяется соответствующая строка матрицы

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| POST | `/api/prices/{slug_or_id}/photos/upload` | Protected Write | ADMIN, SUPERUSER, DEVELOPER | 401 | 200 для своей entity; 403 без scope; 404 чужая/отсутствующая |
| POST | `/api/horses/{horse_id}/photos/upload` | Protected Write | ADMIN, SUPERUSER, DEVELOPER | 401 | 200 для своей entity; 403 без scope; 404 чужая/отсутствующая |
| POST | `/api/news/{news_id}/photos/upload` | Protected Write | ADMIN, SUPERUSER, DEVELOPER | 401 | 200 для своей entity; 403 без scope; 404 чужая/отсутствующая |

Исключений из Protected Write нет. 404 вместо исторического 403 для чужой entity исключает поиск за границей tenant и раскрытие существования записи. Tenant определяется сессией: отсутствующий/невалидный cookie даёт 401; переданный клиентом selector не заменяет tenant и не расширяет доступ. Anonymous/authenticated проверки: UT-UP-03..05, SM-UP-02 в design.

#### Scenario: Клиентский selector не расширяет запись

- **WHEN** администратор tenant A передаёт selector tenant B или не передаёт selector
- **THEN** операция использует только tenant A из сессии
- **AND** чужая entity остаётся недоступной с 404

## ADDED Requirements

### Requirement: Работоспособная загрузка через штатную сборку приложения

Система ДОЛЖНА (SHALL) выполнять загрузку и присоединение фотографий для услуг, лошадей и новостей через штатный HTTP-маршрут без ошибок отсутствующей инициализации. Успешный ответ содержит id, is_main и доступный URL каждого нового фото; tenant фото и связи совпадает с tenant сессии.

#### Scenario: UP-01 — загрузка всех сущностей через приложение

- **WHEN** администратор отправляет валидное изображение в каждый из трёх endpoints с повторяемым полем `files`
- **THEN** каждый запрос возвращает 200 и непустой photos с id, is_main=false и URL
- **AND** фото и связь сохраняются и доступны при последующем чтении
- **AND** не возникает ошибок отсутствующего сервиса или построителя URL

### Requirement: Сохранение выбранных и главной фотографии при загрузке

Batch upload ДОЛЖЕН (SHALL) сохранять ранее присоединённые фото и прежнюю главную фотографию во всех трёх типах сущностей. Новые фото не становятся главными автоматически; при отказе валидации файла старые связи и main не меняются.

#### Scenario: UP-02 — добавление с существующей главной фотографией

- **WHEN** сущность имеет выбранные фото и главную фотографию и администратор загружает ещё два валидных файла
- **THEN** оба новых фото присоединяются, прежние связи остаются, прежняя главная остаётся главной

#### Scenario: UP-03 — частичный успех не сбрасывает main

- **WHEN** к сущности с главной фотографией отправлены один валидный файл и один невалидный файл
- **THEN** ответ 200 содержит одну фотографию и ошибку с индексом невалидного файла
- **AND** прежние фото и главная остаются неизменными
