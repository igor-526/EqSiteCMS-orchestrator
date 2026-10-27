# Proposal — Метрики поисковых запросов

## Why

Статистика поисковых запросов уже сохраняется Метрикой, но вкладка SEO «Запросы» не показывает её. Задание `docs/tasks/103_metrics_queries.md` распространяет окончательные решения 102 на запросы, без второго движка таблиц и без изменения вкладки «Страницы».

## What Changes

- Расширить существующие `GET` backend `/api/seo/search-queries` и SEO `/api/search-queries` параметрами метрик и обязательным `metrics_table` версии 1, сохранив `items/total`, поиск и пагинацию.
- Добавить **новые**, пока не существующие peers Метрики: `GET /api/metrica/search-query-stats/table` и `GET /api/metrica/search-query-stats/ranking`. Источник исключительно `metrica_search_query_stats`, идентичность — `equestrian_id + stat_date + search_query_id`.
- SEO повторно использует `seo-metrics-period`, реестр, formatters и универсальный builder; Метрика агрегирует и ранжирует в SQL, SEO фильтрует/сортирует/пагинирует сущности в SQL до выдачи.
- CMS повторно использует универсальный renderer: обязательные фильтры, закреплённые основные колонки, верхние действия, дата создания без времени, одна серверная сортировка и точечный сброс.
- Сохранить строго ADMIN на backend. Полные access matrix с anonymous/authenticated outcomes находятся в delta specs и design; внутренние peers не становятся Public Read.
- Подтвердить SQL/N+1 на реальной PostgreSQL, доступ, tenant isolation, ошибки, гонки и desktop UI 1366×768.

## Capabilities

### New Capabilities

- `metrica-search-query-stats-query`: пакетные SQL-агрегаты запросов и ранжирование через два приватных HTTP peers.

### Modified Capabilities

- `seo-entity-listing`: список запросов с метриками и глобальной SQL-сортировкой.
- `seo-backend-proxy`: параметры и валидация DTO списка запросов при прежнем ADMIN-доступе.
- `seo-peer-http-contract`: access matrix и ошибки расширенного списка запросов.
- `cms-seo-data-ui`: метрики, фильтры, сортировка, пагинация и раскладка «Запросов».

`metrics-table-contract` и `seo-metrics-period` не изменяются: их нормативное поведение уже универсально; применимость к запросам закрепляется в delta списка и UI.

## Impact

Код четырёх сервисов: `seo-service`, `ya-metrica-service`, `backend`, `frontend`; сервисные README, backend route inventory и централизованный `SERVICES.md`. Миграций, новых env, NATS/AsyncAPI, парсинга, нормализации, изменений `site-*` и поведения «Страниц» нет. Минимальная адаптация внутренних page-oriented имён builder допускается с совместимым адаптером; DTO версии 1 не меняется. Сетевая production-изоляция — унаследованный обязательный release gate, не доказанный этим планированием.

Реализация разрешается только после явного пользовательского approval этого change.
