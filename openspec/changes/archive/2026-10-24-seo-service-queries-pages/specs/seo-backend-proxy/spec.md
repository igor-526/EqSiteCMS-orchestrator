# Spec Delta

## Purpose

Admin-эндпоинты основного backend, через которые CMS получает поисковые запросы и страницы своей конюшни и управляет черными списками нормализации страниц в seo-service.

**Access matrix backend.** Конюшня во всех строках берётся из сессии (`actor.equestrian_id`), tenant selector от клиента не принимается. «Без ADMIN» включает `SUPERUSER`, `DEVELOPER` и прочие роли: наследования нет. Batch resolve в backend не проксируется.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/seo/search-queries` | Protected GET exception | только `ADMIN` | `401` | `200`; без ADMIN `403` до downstream; `400` нечисловые limit/offset или неизвестный ordering; `502` peer недоступен |
| GET | `/api/seo/pages` | Protected GET exception | только `ADMIN` | `401` | `200`; без ADMIN `403`; `400`; `502` |
| GET | `/api/seo/page-normalization/blacklisted-query-params` | Protected GET exception | только `ADMIN` | `401` | `200`; без ADMIN `403`; `502` |
| POST | `/api/seo/page-normalization/blacklisted-query-params` | Protected write | только `ADMIN` | `401` | `201`; без ADMIN `403`; `400` невалидное тело/значение; `409` дубль; `502` |
| PATCH | `/api/seo/page-normalization/blacklisted-query-params/{item_id}` | Protected write | только `ADMIN` | `401` | `200`; без ADMIN `403`; `400` malformed `item_id`/тело; `404` чужой/отсутствующий; `409`; `502` |
| DELETE | `/api/seo/page-normalization/blacklisted-query-params/{item_id}` | Protected write | только `ADMIN` | `401` | `204`; без ADMIN `403`; `400` malformed `item_id`; `404` чужой/отсутствующий; `502` |
| GET | `/api/seo/page-normalization/blacklisted-hashes` | Protected GET exception | только `ADMIN` | `401` | `200`; без ADMIN `403`; `502` |
| POST | `/api/seo/page-normalization/blacklisted-hashes` | Protected write | только `ADMIN` | `401` | `201`; без ADMIN `403`; `400`; `409`; `502` |
| PATCH | `/api/seo/page-normalization/blacklisted-hashes/{item_id}` | Protected write | только `ADMIN` | `401` | `200`; без ADMIN `403`; `400`; `404`; `409`; `502` |
| DELETE | `/api/seo/page-normalization/blacklisted-hashes/{item_id}` | Protected write | только `ADMIN` | `401` | `204`; без ADMIN `403`; `400`; `404`; `502` |

Причина GET-исключений: SEO-данные и настройки нормализации — внутренние данные администрирования конюшни, публичным сайтам `site-*` не нужны.

## ADDED Requirements

### Requirement: Только роль ADMIN
Каждый маршрут `/api/seo/search-queries`, `/api/seo/pages` и `/api/seo/page-normalization/**` SHALL требовать валидную сессию (`401` без неё) и роль `ADMIN`. Пользователь без `ADMIN` MUST получать `403` до любого обращения к seo-service; роли `SUPERUSER` и `DEVELOPER` MUST NOT заменять `ADMIN`.

#### Scenario: Anonymous
- **WHEN** запрос к любому из 10 маршрутов приходит без cookie `access_token`
- **THEN** ответ `401`, seo-service не вызывается

#### Scenario: Пользователь без ADMIN
- **WHEN** пользователь с ролями `SUPERUSER` и `DEVELOPER`, но без `ADMIN`, вызывает любой из 10 маршрутов
- **THEN** ответ `403`, seo-service не вызывается

#### Scenario: ADMIN
- **WHEN** пользователь с `ADMIN` вызывает `GET /api/seo/pages`
- **THEN** backend вызывает seo-service и возвращает `200` с его списком

### Requirement: Конюшня из сессии
Backend SHALL обращаться к seo-service по адресу из настройки `SEO_SERVICE_URL`, передавая `X-Equestrian-Id`, равный конюшне текущего пользователя, без каких-либо credentials. Конюшня из query, тела или заголовков клиента MUST NOT использоваться; cookie и заголовки клиента MUST NOT пересылаться в seo-service.

#### Scenario: Клиентские cookie не пересылаются
- **WHEN** ADMIN вызывает `GET /api/seo/pages`
- **THEN** запрос к seo-service содержит только `X-Equestrian-Id` конюшни сессии и не содержит cookie `access_token` и других клиентских заголовков

#### Scenario: Попытка указать чужую конюшню
- **WHEN** ADMIN конюшни A передаёт `X-Equestrian-Id` или `equestrian_id` конюшни B
- **THEN** backend обращается к seo-service с конюшней A

#### Scenario: Элемент другой конюшни
- **WHEN** ADMIN конюшни A удаляет элемент черного списка конюшни B
- **THEN** seo-service отвечает `404`, backend возвращает `404`, элемент B не удалён

### Requirement: Проксирование списков
`GET /api/seo/search-queries` и `GET /api/seo/pages` SHALL передавать в seo-service `search`, `ordering`, `limit`, `offset` и возвращать `{"items", "total"}` той же структуры. `limit` MUST приводиться к 1..100, отрицательный `offset` — к 0 до вызова peer.

#### Scenario: Параметры передаются
- **WHEN** ADMIN запрашивает `/api/seo/search-queries?search=лошад&ordering=-query&limit=500&offset=-1`
- **THEN** seo-service вызывается с `search=лошад`, `ordering=-query`, `limit=100`, `offset=0`

### Requirement: Проксирование настроек нормализации
Маршруты `/api/seo/page-normalization/blacklisted-query-params` и `/api/seo/page-normalization/blacklisted-hashes` SHALL проксировать list/create/update/delete в одноимённые маршруты seo-service с теми же телами и статусами успеха (`200`, `201`, `204`). Не-UUID `item_id` MUST давать `400` без вызова peer.

#### Scenario: Создание параметра
- **WHEN** ADMIN отправляет `POST /api/seo/page-normalization/blacklisted-query-params` с `{"value": "utm_source"}`
- **THEN** ответ `201` с элементом, созданным в seo-service для конюшни ADMIN

#### Scenario: Malformed item_id
- **WHEN** ADMIN вызывает `DELETE /api/seo/page-normalization/blacklisted-hashes/abc`
- **THEN** ответ `400`, seo-service не вызывается

### Requirement: Трансляция ошибок seo-service
Backend SHALL транслировать ответы seo-service: `400` → `400` с безопасным `detail` (не длиннее 300 символов, иначе нейтральный текст), `404` → `404`, `409` → `409`. Ошибка транспорта, таймаут, `401` (нарушение контракта tenant selector), `5xx`, иной статус или невалидный payload MUST давать `502` без деталей peer.

#### Scenario: Дубль
- **WHEN** seo-service отвечает `409` на создание
- **THEN** backend отвечает `409`

#### Scenario: Peer недоступен или отклонил запрос
- **WHEN** seo-service недоступен, отвечает `500` или `401`
- **THEN** backend отвечает `502` без тела ошибки peer

#### Scenario: Невалидный ответ peer
- **WHEN** seo-service отвечает `200` с телом, не соответствующим схеме
- **THEN** backend отвечает `502`

### Requirement: Route inventory
Backend SHALL классифицировать все 10 маршрутов в route inventory с access class, ролью только `ADMIN`, конюшней из сессии и ссылкой на тесты; сгенерированный `docs/backend-route-inventory.md` MUST соответствовать приложению.

#### Scenario: Инвентарь актуален
- **WHEN** выполняется тест route inventory
- **THEN** все `/api/seo/*` маршруты классифицированы, GET — как protected GET exception, запись — как protected write
