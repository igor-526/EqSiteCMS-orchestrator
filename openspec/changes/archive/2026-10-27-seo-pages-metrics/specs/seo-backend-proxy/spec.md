# Spec Delta: seo-backend-proxy

## MODIFIED Requirements

### Requirement: Проксирование списков
`GET /api/seo/search-queries` SHALL передавать в seo-service `search`, `ordering`, `limit`, `offset` и возвращать `{"items", "total"}` той же структуры. `GET /api/seo/pages` SHALL дополнительно передавать `mode`, `metric`, `date_from`, `date_to` и возвращать `{"items", "total", "metrics_table"}`, где `metrics_table` проверяется по схеме capability `metrics-table-contract` (неизвестные поля допускаются и передаются без изменений). `limit` MUST приводиться к 1..100, отрицательный `offset` — к 0 до вызова peer. Неизвестные `mode`/`metric`, некорректная дата, одна дата без другой и `date_from > date_to` MUST давать `400` без вызова seo-service; значение `ordering` проверяет seo-service, правила периода (выравнивание, лимит, сегодняшний день по часовому поясу seo-service) применяет seo-service.

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

## ADDED Requirements

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
