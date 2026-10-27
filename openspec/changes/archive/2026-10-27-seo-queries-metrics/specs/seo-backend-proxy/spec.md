# Проксирование запросов с метриками

## MODIFIED Requirements

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

## ADDED Requirements

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
