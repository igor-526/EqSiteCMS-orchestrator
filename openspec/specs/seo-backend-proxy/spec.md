# seo-backend-proxy

## Purpose

Admin-эндпоинты основного backend, через которые CMS получает поисковые запросы и страницы своей конюшни и управляет черными списками нормализации страниц в seo-service.

**Access matrix backend.** Конюшня во всех строках берётся из сессии (`actor.equestrian_id`), tenant selector от клиента не принимается. «Без ADMIN» включает `SUPERUSER`, `DEVELOPER` и прочие роли: наследования нет. Batch resolve в backend не проксируется.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/seo/search-queries` | Protected GET exception | только `ADMIN` | `401` | `200`; без ADMIN `403` до downstream; `400` нечисловые limit/offset или неизвестный ordering; `502` peer недоступен |
| GET | `/api/seo/pages` | Protected GET exception | только `ADMIN` | `401`, seo-service не вызывается | `200` с `items/total/metrics_table`; без ADMIN (включая SUPERUSER/DEVELOPER) `403` до downstream; невалидные `mode`/`metric`/даты, нечисловые `limit`/`offset` — `400` без вызова peer; неизвестный `ordering` — `400` от seo-service; seo-service `5xx`/`502` (в т.ч. сбой ya-metrica), транспорт, невалидный payload — `502` |
| GET | `/api/seo/page-normalization/blacklisted-query-params` | Protected GET exception | только `ADMIN` | `401` | `200`; без ADMIN `403`; `502` |
| POST | `/api/seo/page-normalization/blacklisted-query-params` | Protected write | только `ADMIN` | `401` | `201`; без ADMIN `403`; `400` невалидное тело/значение; `409` дубль; `502` |
| PATCH | `/api/seo/page-normalization/blacklisted-query-params/{item_id}` | Protected write | только `ADMIN` | `401` | `200`; без ADMIN `403`; `400` malformed `item_id`/тело; `404` чужой/отсутствующий; `409`; `502` |
| DELETE | `/api/seo/page-normalization/blacklisted-query-params/{item_id}` | Protected write | только `ADMIN` | `401` | `204`; без ADMIN `403`; `400` malformed `item_id`; `404` чужой/отсутствующий; `502` |
| GET | `/api/seo/page-normalization/blacklisted-hashes` | Protected GET exception | только `ADMIN` | `401` | `200`; без ADMIN `403`; `502` |
| POST | `/api/seo/page-normalization/blacklisted-hashes` | Protected write | только `ADMIN` | `401` | `201`; без ADMIN `403`; `400`; `409`; `502` |
| PATCH | `/api/seo/page-normalization/blacklisted-hashes/{item_id}` | Protected write | только `ADMIN` | `401` | `200`; без ADMIN `403`; `400`; `404`; `409`; `502` |
| DELETE | `/api/seo/page-normalization/blacklisted-hashes/{item_id}` | Protected write | только `ADMIN` | `401` | `204`; без ADMIN `403`; `400`; `404`; `502` |

Причина GET-исключений: SEO-данные и настройки нормализации — внутренние данные администрирования конюшни, публичным сайтам `site-*` не нужны.

## Requirements

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
Оба маршрута `GET /api/seo/search-queries` и `GET /api/seo/pages` SHALL передавать в seo-service `search`, `ordering`, `limit`, `offset`, а также `mode`, `metric`, `date_from`, `date_to` и возвращать `{"items", "total", "metrics_table"}`, где `metrics_table` проверяется по схеме capability `metrics-table-contract` (неизвестные поля допускаются и передаются без изменений). `limit` MUST приводиться к 1..100, отрицательный `offset` — к 0 до вызова peer. Неизвестные `mode`/`metric`, некорректная дата, одна дата без другой и `date_from > date_to` MUST давать `400` без вызова seo-service; значение `ordering` проверяет seo-service, а для списка запросов его синтаксис также проверяет backend до downstream; правила периода (выравнивание, лимит, сегодняшний день по часовому поясу seo-service) применяет seo-service.

#### Scenario: Параметры передаются
- **WHEN** ADMIN запрашивает `/api/seo/search-queries?search=лошад&ordering=-query&limit=500&offset=-1`
- **THEN** seo-service вызывается с `search=лошад`, `ordering=-query`, `limit=100`, `offset=0`

#### Scenario: Параметры метрик страниц передаются
- **WHEN** ADMIN запрашивает `/api/seo/pages?mode=week&metric=bounce_rate&date_from=2026-09-01&date_to=2026-10-26&ordering=-metric:2026-10-19`
- **THEN** seo-service вызывается с теми же `mode`, `metric`, `date_from`, `date_to`, `ordering` и `X-Equestrian-Id` конюшни сессии, ответ `200` содержит `metrics_table` из seo-service

#### Scenario: Невалидный режим без вызова peer
- **WHEN** ADMIN запрашивает `/api/seo/pages?mode=quarter` либо `/api/seo/pages?date_from=2026-10-01`
- **THEN** ответ `400`, seo-service не вызывается

#### Scenario: Ответ без metrics_table
- **WHEN** seo-service отвечает `200` на список страниц без `metrics_table` или с колонкой без `key`
- **THEN** backend отвечает `502`

#### Scenario: Метрики запросов и неизвестные поля
- **WHEN** ADMIN передаёт mode/metric/обе даты для списка запросов, а SEO возвращает metrics_table версии 1 с новым необязательным полем
- **THEN** backend передаёт параметры и сохраняет неизвестное поле в ответе; при отсутствии metrics_table или обязательного поля отвечает 502

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
Backend SHALL классифицировать все 11 маршрутов `/api/seo/*` в route inventory с access class, ролью только `ADMIN`, конюшней из сессии и ссылкой на тесты; сгенерированный `docs/backend-route-inventory.md` MUST соответствовать приложению.

#### Scenario: Инвентарь актуален
- **WHEN** выполняется тест route inventory
- **THEN** все `/api/seo/*` маршруты классифицированы, GET — как protected GET exception, запись (включая `POST /api/seo/parse-jobs`) — как protected write

### Requirement: Access matrix списка страниц с метриками
Изменённый маршрут `GET /api/seo/pages` SHALL сохранять класс Protected GET exception (только `ADMIN`, конюшня из сессии) по матрице ниже. Остальные 9 маршрутов `/api/seo/**` не меняются.

#### Scenario: Anonymous
- **WHEN** запрос `GET /api/seo/pages?mode=month` приходит без cookie `access_token`
- **THEN** ответ `401`, seo-service не вызывается

#### Scenario: Пользователь без ADMIN
- **WHEN** пользователь с ролями `SUPERUSER` и `DEVELOPER` без `ADMIN` запрашивает `GET /api/seo/pages?metric=visits`
- **THEN** ответ `403`, seo-service не вызывается

#### Scenario: ADMIN и сбой ya-metrica
- **WHEN** ADMIN запрашивает список страниц, а seo-service отвечает `502` из-за недоступности ya-metrica
- **THEN** backend отвечает `502` без тела ошибки peer

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/seo/pages` | Protected GET exception | только `ADMIN` | `401`, seo-service не вызывается | `200` с `items/total/metrics_table`; без ADMIN (включая SUPERUSER/DEVELOPER) `403` до downstream; невалидные `mode`/`metric`/даты, нечисловые `limit`/`offset` — `400` без вызова peer; неизвестный `ordering` — `400` от seo-service; seo-service `5xx`/`502` (в т.ч. сбой ya-metrica), транспорт, невалидный payload — `502` |

Причина GET-исключения не меняется: SEO-данные и статистика — внутренние данные администрирования конюшни, публичным `site-*` не нужны.

### Requirement: Access matrix списка запросов с метриками
`GET /api/seo/search-queries` SHALL соответствовать матрице ниже. Причина исключения Public Read — приватная административная аналитика; требуется строго ADMIN, без role override. Tenant MUST браться только из сессии, а не из клиентского selector. Backend MUST проверять синтаксис параметров метрик и ordering до downstream, но не вычислять период или форматирование.

#### Scenario: Anonymous и недостаточная роль
- **WHEN** список запросов вызван без сессии либо только с SUPERUSER/DEVELOPER без ADMIN
- **THEN** соответственно 401 и 403 до вызова SEO

#### Scenario: ADMIN и чужой selector
- **WHEN** ADMIN конюшни A передаёт X-Equestrian-Id или query equestrian_id конюшни B
- **THEN** SEO получает только selector A, credentials клиента не пересылаются, ответ 200 содержит только данные A

#### Scenario: Ошибки и ранняя валидация
- **WHEN** ADMIN передал невалидный mode/metric/ordering, одиночную/обратную/некорректную дату либо нечисловой limit/offset
- **THEN** 400 без SEO; корректная metric-дата вне периода передаётся SEO, который применяет default

#### Scenario: Невалидный ответ или downstream отказ
- **WHEN** SEO вернул 5xx, неожиданный статус, невалидный DTO, либо произошёл timeout/transport error
- **THEN** 502 без деталей peer; безопасный 400 от SEO передаётся как 400

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | backend `/api/seo/search-queries` | Protected GET exception | только ADMIN | `401`, SEO не вызывается | ADMIN `200` с items/total/metrics_table; без ADMIN `403` до downstream; невалидный query `400`; downstream/DTO error `502`; tenant только из сессии |

### Requirement: Проксирование постановки парсинга
Backend SHALL предоставлять `POST /api/seo/parse-jobs` и проксировать его в `POST /api/parse-jobs` seo-service с `X-Equestrian-Id` конюшни сессии; access class, роли и статусы определяет capability `seo-parse-trigger-api`. Остальные 10 маршрутов `/api/seo/**` не меняются.

#### Scenario: Прокси вызывает только seo-service
- **WHEN** ADMIN вызывает `POST /api/seo/parse-jobs`
- **THEN** backend обращается только к seo-service, без cookie и клиентских заголовков, и не обращается к ya-metrica-service
