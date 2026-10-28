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
| GET | `/api/pages` | Internal Trusted Network Read (исключение) | доверенный внутренний caller (backend) | `200` c `items/total/metrics_table`; без/невалидный `X-Equestrian-Id` `401` до обращения к БД и ya-metrica; невалидные `mode`/`metric`/даты (одна дата без другой, обратный диапазон)/`ordering`/`limit`/`offset` `400` без вызова ya-metrica; будущие даты не отклоняются, а ограничиваются сегодняшним днём по `SEO_UTC_OFFSET_HOURS`; сбой ya-metrica `502` | то же (cookie/Authorization игнорируются) |
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
seo-service SHALL обслуживать `/api/*` без проверки credentials: сервисные ключи, cookie и Authorization MUST NOT требоваться и MUST NOT давать дополнительных прав. Проверка роли `SEO` выполняется только в backend. Перед production deployment SHALL быть подтверждено, что seo-service недоступен внешним callers; иначе выпуск блокируется.

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
seo-service SHALL отвечать `200`, `201`, `202`, `204` при успехе (`202` — только постановка команды парсинга); `400` при невалидном теле, query, path-параметре или нормализации; `401` только при проблемах tenant selector; `404` для отсутствующего в конюшне элемента; `409` для дубля; `502`, когда зависимый peer-сервис (ya-metrica-service, yandex-service) недоступен или нарушил контракт; `503`, когда недоступна очередь задач NATS; `500` для непредвиденной ошибки. Тело ошибки MUST содержать только `detail` без входных значений, SQL, traceback, параметров подключения и тела ответа peer-сервиса.

#### Scenario: Невалидное тело
- **WHEN** caller с валидным `X-Equestrian-Id` отправляет malformed JSON или тело неверной схемы
- **THEN** ответ `400`, `detail` не содержит введённых значений

#### Scenario: Непредвиденная ошибка
- **WHEN** обработка запроса завершается неожиданным исключением, например недоступностью БД
- **THEN** ответ `500` с безопасным `detail`, без traceback и параметров подключения; транзакция откатывается

#### Scenario: Сбой зависимого peer-сервиса
- **WHEN** при обработке `GET /api/pages` ya-metrica-service недоступна, отвечает не `200` или возвращает тело неверной схемы
- **THEN** ответ `502` с безопасным `detail`, без тела и адреса peer-сервиса

#### Scenario: Постановка парсинга и сбой очереди
- **WHEN** `POST /api/parse-jobs` принят, а брокер NATS недоступен
- **THEN** ответ `503` с безопасным `detail`, транзакция откатывается, адрес брокера не раскрывается

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

### Requirement: Access matrix списка страниц с метриками
Изменённый маршрут `GET /api/pages` SHALL сохранять класс Internal Trusted Network Read (исключение из Public Read) по матрице ниже; credentials не требуются и не меняют результат, конюшня — только из `X-Equestrian-Id`.

#### Scenario: Anonymous и посторонние credentials
- **WHEN** caller вызывает `GET /api/pages` с валидным `X-Equestrian-Id` без credentials, затем с произвольными cookie и `Authorization`
- **THEN** оба ответа `200` с идентичным телом, включая `metrics_table`

#### Scenario: Нет tenant selector
- **WHEN** caller вызывает `GET /api/pages?mode=week` без `X-Equestrian-Id`
- **THEN** ответ `401`, ни БД seo-service, ни ya-metrica не вызываются

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/pages` | Internal Trusted Network Read (исключение) | доверенный внутренний caller (backend) | `200` c `items/total/metrics_table`; без/невалидный `X-Equestrian-Id` `401` до обращения к БД и ya-metrica; невалидные `mode`/`metric`/даты (одна дата без другой, обратный диапазон)/`ordering`/`limit`/`offset` `400` без вызова ya-metrica; будущие даты не отклоняются, а ограничиваются сегодняшним днём по `SEO_UTC_OFFSET_HOURS`; сбой ya-metrica `502` | то же (cookie/Authorization игнорируются) |

Причина исключения не меняется: статистика и список страниц — внутренние SEO-данные администрирования, публичным `site-*` не нужны.

### Requirement: Access matrix списка запросов с метриками
`GET /api/search-queries` SHALL сохранять Internal Trusted Network Read exception по матрице ниже. Причина исключения из Public Read — приватная аналитика конюшни, доступная CMS только через SEO backend. Selector MUST оставаться несекретным UUID; cookie/Authorization его не заменяют. Production MUST блокироваться без подтверждения внешней недоступности peer и БД.

#### Scenario: Anonymous и посторонние credentials
- **WHEN** caller без credentials, затем с cookie и Bearer вызывает список запросов с валидным X-Equestrian-Id и параметрами метрик
- **THEN** оба ответа 200 с одинаковыми items/total/metrics_table

#### Scenario: Selector отсутствует или невалиден
- **WHEN** caller без credentials либо с ними не передал X-Equestrian-Id или передал пустой/не-UUID selector
- **THEN** 401 до БД и Метрики; пользовательская авторизация не помогает

#### Scenario: Невалидный query
- **WHEN** selector валиден, но mode/metric/даты/ordering невалидны либо limit/offset нечисловые
- **THEN** 400 до вызова Метрики

#### Scenario: Ошибка downstream
- **WHEN** M5 или M6 недоступен либо нарушает контракт
- **THEN** 502 с безопасным detail без URL/тела peer, транзакция чтения завершается откатом

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | SEO `/api/search-queries` с валидным selector | Internal Trusted Network Read exception | доверенный backend | `200` с items/total/metrics_table; mode/metric/даты/ordering или нечисловые limit/offset невалидны — `400`; Метрика недоступна/невалидна — `502`; непредвиденная внутренняя ошибка — безопасный `500` | то же; cookie/Authorization игнорируются |
| GET | SEO `/api/search-queries` без/с невалидным selector | Internal selector exception | любой внутренний caller | `401` до данных и peer | `401`; credentials не заменяют selector |

### Requirement: Access matrix постановки парсинга
Маршрут `POST /api/parse-jobs` SHALL относиться к классу Internal Trusted Network Write (исключение из Protected Write) наравне с остальными `/api/**`: credentials не требуются и не меняют результат, конюшня — только из `X-Equestrian-Id`, selector отсутствует или невалиден — `401` до разбора тела.

#### Scenario: Anonymous и посторонние credentials
- **WHEN** caller вызывает `POST /api/parse-jobs` с валидным selector без credentials, затем с произвольными cookie и `Authorization`
- **THEN** оба ответа `202` с одинаковой схемой, различается только `job_id`

#### Scenario: Нет selector
- **WHEN** caller вызывает маршрут без `X-Equestrian-Id`
- **THEN** ответ `401`, тело не разбирается, ни БД, ни NATS, ни yandex-service не вызываются

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| POST | `/api/parse-jobs` | Internal Trusted Network Write (исключение) | доверенный внутренний caller (backend) | `202`; без/невалидный `X-Equestrian-Id` `401`; невалидное тело/провайдер/нет интеграции `400`; yandex-service недоступен `502`; брокер недоступен `503` | то же (cookie/Authorization игнорируются) |

Причина исключения не меняется: seo-service — приватный peer, роль `ADMIN` проверяет backend.
