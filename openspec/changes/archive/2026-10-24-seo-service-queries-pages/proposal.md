# Proposal — seo-service: поисковые запросы, страницы и нормализация

Входной запрос: [`docs/tasks/099_seo_service.md`](../../../docs/tasks/099_seo_service.md).

## Why

`services/seo-service` развёрнут как пустой шаблон FastAPI: в нём нет ни таблиц, ни API, ни `dependency-injector`. Будущим сервисам-парсерам нужен единый источник UUID поисковых запросов и страниц сайта конюшни, чтобы связывать с ними свои данные, а SEO-специалисту — управление правилами нормализации страниц и просмотр накопленных запросов и страниц из CMS backend.

## What Changes

- **seo-service — хранение.** Две tenant-scoped таблицы `search_queries` и `pages` (значение `TEXT` без ограничения длины, уникальность в рамках конюшни, без m2m — одинаковые значения у разных конюшень хранятся отдельными строками) и две таблицы черного списка нормализации страниц: `blacklisted_query_params` и `blacklisted_hashes`. Одна Alembic-миграция.
- **seo-service — нормализация.** Поисковый запрос: первый символ заглавный, остальные строчные (плюс trim и схлопывание пробелов). Страница: путь от домена, удаление query-параметров и хешей из черного списка конюшни, канонический порядок параметров. Изменение черного списка не применяется к уже сохранённым страницам.
- **seo-service — batch resolve для парсеров.** `POST /api/search-queries/resolve` и `POST /api/pages/resolve`: пачка до 1000 значений → нормализация → find-or-create в контексте конюшни → UUID в порядке входа. Конкурентно-безопасно (`INSERT … ON CONFLICT DO NOTHING` + повторное чтение). В backend не проксируются.
- **seo-service — списки и настройки.** `GET /api/search-queries`, `GET /api/pages` (ilike-поиск, сортировка `query`/`page`, дефолт `created_at DESC`, `limit/offset`); CRUD (list/create/update/delete) элементов двух черных списков.
- **seo-service — peer-контракт.** Внутренний peer доверенной сети без credentials (как `yandex-service`/`ya-metrica-service`). Все `/api/*` требуют tenant selector `X-Equestrian-Id`; missing/invalid → `401`. `/health` — Public Read.
- **seo-service — архитектура.** Структура и DI по эталону `yandex-service`: `containers/` (`dependency-injector`), `core/{entities,exceptions,protocols,schemas,services}`, `models/`, `repositories/`, `api/`, `TransactionalRoute`.
- **backend — admin-прокси.** `/api/seo/search-queries`, `/api/seo/pages` и `/api/seo/page-normalization/**` (10 маршрутов): только роль `ADMIN`, конюшня из сессии, клиент `clients/seo_service`, обновление route inventory.

Новых NATS-событий, CMS UI и ролей нет: frontend (`services/frontend`) вне scope. Breaking changes отсутствуют (seo-service ранее не имел API).

### Затронутые endpoints (access matrix — в specs и `design.md#access-matrix`)

| Сервис | Методы и пути |
|---|---|
| seo-service | `POST /api/search-queries/resolve`, `POST /api/pages/resolve`, `GET /api/search-queries`, `GET /api/pages`, `GET\|POST /api/page-normalization/blacklisted-query-params`, `PATCH\|DELETE /api/page-normalization/blacklisted-query-params/{item_id}`, то же для `blacklisted-hashes`, `GET /health` |
| backend | `GET /api/seo/search-queries`, `GET /api/seo/pages`, `GET\|POST /api/seo/page-normalization/blacklisted-query-params`, `PATCH\|DELETE /api/seo/page-normalization/blacklisted-query-params/{item_id}`, то же для `blacklisted-hashes` |

Исключения из дефолтной policy: `GET` backend — защищённые (только `ADMIN`), а `GET` seo-service не являются Public Read (внутренние SEO-данные и настройки не предназначены для публичных сайтов); все `/api/*` seo-service, включая запись, — Internal Trusted Network без credentials (защита — сетевая изоляция; роль `ADMIN` проверяет backend).

## Capabilities

### New Capabilities

- `seo-peer-http-contract`: граница доверенной внутренней сети, tenant selector `X-Equestrian-Id`, множество HTTP-статусов и безопасные ошибки seo-service, access matrix seo-service.
- `seo-normalization`: правила нормализации поисковых запросов и страниц, влияние черного списка конюшни, отсутствие ретроактивного применения.
- `seo-entity-resolution`: хранение запросов и страниц с уникальностью в рамках конюшни и batch find-or-create API для парсеров.
- `seo-entity-listing`: tenant-scoped списки запросов и страниц с поиском, сортировкой и пагинацией.
- `seo-page-normalization-settings`: управление черными списками query-параметров и хешей конюшни.
- `seo-backend-proxy`: admin-эндпоинты backend, проксирующие списки и настройки нормализации в seo-service.

### Modified Capabilities

Нет. Существующие `yandex-*` и `service-endpoint-auth` не меняются.

## Impact

- **Код:** `services/seo-service/**` (почти всё дерево `src/`, `tests/`, `pyproject.toml`, `uv.lock`, `.env.example`, `README.md`); `services/backend/src/{settings.py,clients/seo_service/**,core/protocols/seo_service.py,core/services/seo_proxy.py,depends/services.py,api/seo.py,api/__init__.py,main.py}`, `services/backend/maintain/route_inventory.py`, `services/backend/docs/backend-route-inventory.md`, `services/backend/.env.example`, тесты backend.
- **БД:** новая миграция seo-service (4 таблицы, расширение `pg_trgm`), БД `eqsitecms-db-seo`.
- **Зависимости:** `dependency-injector` в seo-service.
- **Конфигурация:** backend `SEO_SERVICE_URL` (локальные `.env` не коммитятся); новых настроек seo-service нет.
- **Документация:** `services/seo-service/README.md`, секция SEO Service в `SERVICES.md`.
- **Quality Gate:** `QG-FULL` (миграция).
