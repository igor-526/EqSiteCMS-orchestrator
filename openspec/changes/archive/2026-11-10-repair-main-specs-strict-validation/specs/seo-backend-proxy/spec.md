## MODIFIED Requirements

### Requirement: Проксирование списков
Backend SHALL проксировать списки запросов и страниц с параметрами, валидацией и ответами согласно сценарию «Полный контракт проксирования списков».

#### Scenario: Параметры передаются
- **WHEN** SEO запрашивает `/api/seo/search-queries?search=лошад&ordering=-query&limit=500&offset=-1`
- **THEN** seo-service вызывается с `search=лошад`, `ordering=-query`, `limit=100`, `offset=0`

#### Scenario: Параметры метрик страниц передаются
- **WHEN** SEO запрашивает `/api/seo/pages?mode=week&metric=bounce_rate&date_from=2026-09-01&date_to=2026-10-26&ordering=-metric:2026-10-19`
- **THEN** seo-service вызывается с теми же `mode`, `metric`, `date_from`, `date_to`, `ordering` и `X-Equestrian-Id` конюшни сессии, ответ `200` содержит `metrics_table` из seo-service

#### Scenario: Невалидный режим без вызова peer
- **WHEN** SEO запрашивает `/api/seo/pages?mode=quarter` либо `/api/seo/pages?date_from=2026-10-01`
- **THEN** ответ `400`, seo-service не вызывается

#### Scenario: Ответ без metrics_table
- **WHEN** seo-service отвечает `200` на список страниц без `metrics_table` или с колонкой без `key`
- **THEN** backend отвечает `502`

#### Scenario: Метрики запросов и неизвестные поля
- **WHEN** SEO передаёт mode/metric/обе даты для списка запросов, а SEO возвращает metrics_table версии 1 с новым необязательным полем
- **THEN** backend передаёт параметры и сохраняет неизвестное поле в ответе; при отсутствии metrics_table или обязательного поля отвечает 502

#### Scenario: Полный контракт проксирования списков
- **WHEN** проверяется сохранение существующего контракта capability
- **THEN** MUST соблюдаться все следующие исходные условия без изменения поведения:

Оба маршрута `GET /api/seo/search-queries` и `GET /api/seo/pages` SHALL передавать в seo-service `search`, `ordering`, `limit`, `offset`, а также `mode`, `metric`, `date_from`, `date_to` и возвращать `{"items", "total", "metrics_table"}`, где `metrics_table` проверяется по схеме capability `metrics-table-contract` (неизвестные поля допускаются и передаются без изменений). `limit` MUST приводиться к 1..100, отрицательный `offset` — к 0 до вызова peer. Неизвестные `mode`/`metric`, некорректная дата, одна дата без другой и `date_from > date_to` MUST давать `400` без вызова seo-service; значение `ordering` проверяет seo-service, а для списка запросов его синтаксис также проверяет backend до downstream; правила периода (выравнивание, лимит, сегодняшний день по часовому поясу seo-service) применяет seo-service.
