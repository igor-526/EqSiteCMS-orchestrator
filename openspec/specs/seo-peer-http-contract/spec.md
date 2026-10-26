# seo-peer-http-contract

## Purpose

HTTP-контракт seo-service как внутреннего peer-сервиса доверенной сети: передача контекста конюшни, множество HTTP-статусов, безопасный формат ошибок и граница доступа для всех `/api/*` маршрутов.

**Access matrix seo-service.** seo-service — internal trusted network peer по образцу `yandex-service`/`ya-metrica-service`: credentials не требуются и не проверяются, пользовательские cookie/Authorization игнорируются. Поэтому «without auth» и «with auth» дают одинаковый результат. Единственная проверка доступа — tenant selector `X-Equestrian-Id` (несекретный UUID конюшни): missing/invalid → `401`.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/health` | Public Read | любой | `200 {"status":"ok"}` | то же |
| POST | `/api/search-queries/resolve` | Internal Trusted Network Write (исключение из Protected Write) | доверенный внутренний caller (парсеры) | `200`; без/невалидный `X-Equestrian-Id` `401`; невалидный body `400` | то же (cookie/Authorization игнорируются) |
| POST | `/api/pages/resolve` | Internal Trusted Network Write (исключение) | доверенный внутренний caller (парсеры) | `200`; tenant `401`; `400` | то же |
| GET | `/api/search-queries` | Internal Trusted Network Read (исключение из Public Read) | доверенный внутренний caller (backend) | `200`; tenant `401`; невалидные query `400` | то же |
| GET | `/api/pages` | Internal Trusted Network Read (исключение) | доверенный внутренний caller (backend) | `200`; tenant `401`; `400` | то же |
| GET | `/api/page-normalization/blacklisted-query-params` | Internal Trusted Network Read (исключение) | доверенный внутренний caller (backend) | `200`; tenant `401` | то же |
| POST | `/api/page-normalization/blacklisted-query-params` | Internal Trusted Network Write (исключение) | доверенный внутренний caller (backend) | `201`; `400` невалидное значение; `409` дубль в конюшне; tenant `401` | то же |
| PATCH | `/api/page-normalization/blacklisted-query-params/{item_id}` | Internal Trusted Network Write (исключение) | доверенный внутренний caller (backend) | `200`; `404` чужой/отсутствующий; `409` дубль; `400` невалидный id/значение; tenant `401` | то же |
| DELETE | `/api/page-normalization/blacklisted-query-params/{item_id}` | Internal Trusted Network Write (исключение) | доверенный внутренний caller (backend) | `204`; `404` чужой/отсутствующий; `400` невалидный id; tenant `401` | то же |
| GET | `/api/page-normalization/blacklisted-hashes` | Internal Trusted Network Read (исключение) | доверенный внутренний caller (backend) | `200`; tenant `401` | то же |
| POST | `/api/page-normalization/blacklisted-hashes` | Internal Trusted Network Write (исключение) | доверенный внутренний caller (backend) | `201`; `400`; `409`; tenant `401` | то же |
| PATCH | `/api/page-normalization/blacklisted-hashes/{item_id}` | Internal Trusted Network Write (исключение) | доверенный внутренний caller (backend) | `200`; `404`; `409`; `400`; tenant `401` | то же |
| DELETE | `/api/page-normalization/blacklisted-hashes/{item_id}` | Internal Trusted Network Write (исключение) | доверенный внутренний caller (backend) | `204`; `404`; `400`; tenant `401` | то же |

Причины исключений (решение пользователя): seo-service — внутренний peer без публичной экспозиции, как эталонные Яндекс-сервисы; его вызывают только доверенные сервисы внутренней сети (парсеры напрямую, CMS — через backend с проверкой `ADMIN`). GET не являются Public Read: это внутренние SEO-данные и настройки, публичным `site-*` не нужны. Запись без credentials допустима только внутри доверенной сети; защита от внешних anonymous callers обеспечивается сетевой изоляцией, а не приложением.

## Requirements

### Requirement: Доверенная внутренняя сеть без credentials
seo-service SHALL обслуживать `/api/*` без проверки credentials: сервисные ключи, cookie и Authorization MUST NOT требоваться и MUST NOT давать дополнительных прав. Проверка роли `ADMIN` выполняется только в backend. Перед production deployment SHALL быть подтверждено, что seo-service недоступен внешним callers; иначе выпуск блокируется.

#### Scenario: Запрос без credentials
- **WHEN** внутренний caller вызывает `GET /api/pages` с валидным `X-Equestrian-Id` без каких-либо credentials
- **THEN** ответ `200` со списком страниц этой конюшни

#### Scenario: Посторонние credentials не меняют результат
- **WHEN** тот же запрос содержит произвольные cookie или `Authorization`
- **THEN** ответ идентичен запросу без них

### Requirement: Tenant selector конюшни
Каждый маршрут `/api/*` SHALL получать конюшню только из заголовка `X-Equestrian-Id` (UUID). Отсутствующий, пустой или не-UUID заголовок MUST давать `401` до валидации тела и доступа к данным. Selector не является секретом; seo-service MUST NOT проверять существование конюшни и MUST NOT принимать конюшню из тела или query.

#### Scenario: Нет tenant selector
- **WHEN** caller вызывает `/api/*` маршрут без `X-Equestrian-Id`
- **THEN** ответ `401`, данные не читаются и не создаются

#### Scenario: Невалидный tenant selector
- **WHEN** `X-Equestrian-Id` равен `not-a-uuid` или пустой строке
- **THEN** ответ `401`

#### Scenario: Конюшня из тела игнорируется
- **WHEN** тело resolve-запроса содержит посторонние поля, включая `equestrian_id`
- **THEN** ответ `400` (лишние поля запрещены), конюшня из тела не используется

### Requirement: Множество HTTP-статусов и безопасные ошибки
seo-service SHALL отвечать `200`, `201`, `204` при успехе; `400` при невалидном теле, query, path-параметре или нормализации; `401` только при проблемах tenant selector; `404` для отсутствующего в конюшне элемента; `409` для дубля; `500` для непредвиденной ошибки. Тело ошибки MUST содержать только `detail` без входных значений, SQL, traceback и параметров подключения.

#### Scenario: Невалидное тело
- **WHEN** caller с валидным `X-Equestrian-Id` отправляет malformed JSON или тело неверной схемы
- **THEN** ответ `400`, `detail` не содержит введённых значений

#### Scenario: Непредвиденная ошибка
- **WHEN** обработка запроса завершается неожиданным исключением, например недоступностью БД
- **THEN** ответ `500` с безопасным `detail`, без traceback и параметров подключения; транзакция откатывается

### Requirement: Статический health
`GET /health` SHALL возвращать `200` и `{"status":"ok"}` без проверки tenant selector и без обращения к БД.

#### Scenario: Anonymous health
- **WHEN** caller без заголовков запрашивает `GET /health`
- **THEN** ответ `200` и `{"status":"ok"}`

#### Scenario: Health с посторонними заголовками
- **WHEN** caller передаёт cookie, `Authorization` или `X-Equestrian-Id`
- **THEN** ответ тот же `200`

### Requirement: Транзакция на запрос
Каждый `/api/*` запрос SHALL выполняться в одной транзакции БД, фиксируемой до отправки успешного ответа. При любой ошибке после начала транзакции изменения MUST откатываться целиком.

#### Scenario: Ошибка посреди batch
- **WHEN** resolve-запрос завершается ошибкой после вставки части значений
- **THEN** ни одно значение этого запроса не остаётся в БД
