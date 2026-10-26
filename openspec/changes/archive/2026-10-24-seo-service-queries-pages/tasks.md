# Tasks — seo-service-queries-pages

Deliverable A (`services/seo-service/**`, units `SEO-BE-1..4` последовательно) и deliverable B (backend-прокси, units `SEO-PROXY-1..2`) не пересекаются и идут параллельно; затем `SEO-SMOKE-1` и `QG-FULL`. DAG — `design.md#dag`, test matrix — `design.md#test-matrix`, access matrix — `design.md#access-matrix`.

`contextFiles` перечислены **по units**, а не общим списком на весь change. Пути `src/…`, `tests/…` в units `SEO-BE-*` — относительно `services/seo-service/`.

## Execution units

| Unit | Профиль | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| `SEO-BE-1` | Backend | `services/seo-service/{pyproject.toml,uv.lock,.env.example}`, `src/{utils/basemodel.py,models/**,core/entities/**,migration/versions/**}`, `tests/integration/{conftest.py,test_migrations_postgres.py,test_models_postgres.py}` | — | `IT-SEO-01..02`; `make test`; `make lint`; alembic upgrade/downgrade/upgrade | `design.md` (D1, D2, D3, D14, `#postgresql-для-smoke-тестов`, `#test-matrix`), `specs/seo-entity-resolution/spec.md` (уникальность), `specs/seo-page-normalization-settings/spec.md` (таблицы), `services/yandex-service/{pyproject.toml,src/models/**,src/core/entities/**,tests/integration/conftest.py}` |
| `SEO-BE-2a` (done; .1–.4) | Backend | `src/{core/exceptions/**,core/protocols/**,core/services/search_query_normalizer.py,core/services/page_normalizer.py}`, `tests/unit/test_search_query_normalizer.py`, `tests/unit/test_page_normalizer.py` | `SEO-BE-1` | `UT-SEO-01..07`; targeted pytest; scoped lint/typecheck/format | handoff `SEO-BE-1`, `design.md` (D4, D5), `specs/seo-normalization/spec.md`, `services/yandex-service/src/core/{exceptions/**,protocols/repositories/**}` |
| `SEO-BE-2b` (.5–.7, .V) | Backend | `src/repositories/**`, `tests/integration/test_*_repository_postgres.py` | `SEO-BE-1`, `SEO-BE-2a` | `IT-SEO-03..06`; targeted pytest; scoped lint/typecheck/format; полный suite в `SEO-BE-4` | handoff `SEO-BE-2a` (`.qa/seo-service-queries-pages/SEO-BE-2/handoff.md`), `design.md` (D6, D10, D11, `#test-matrix`), `specs/seo-{entity-resolution,entity-listing,page-normalization-settings}/spec.md`, `src/{core/protocols/repositories/**,models/**,core/entities/**,core/exceptions/**}`, `tests/integration/conftest.py`, `services/yandex-service/src/repositories/**` |
| `SEO-BE-3a` (done; .1–.4) | Backend | `src/{core/schemas/**,core/services/{__init__,search_query_service,page_service,blacklisted_query_param_service,blacklisted_hash_service}.py}`, `tests/unit/test_{search_query_service,page_service,blacklist_services,listing_services,schemas}.py` | `SEO-BE-2` | `UT-SEO-08..12`; targeted pytest; scoped lint/typecheck/format | handoff `SEO-BE-2`, `design.md` (D6, D7, D10, D11, `#api-контракт-seo-service-dto`, `#test-matrix`), `specs/seo-{entity-resolution,entity-listing,page-normalization-settings}/spec.md`, `services/yandex-service/src/{core/services/yandex_accounts_service.py,core/schemas/**}` |
| `SEO-BE-3b` (done; .5–.7, .V) | Backend | `src/containers/{settings,repositories,services,application,__init__}.py`, `src/depends/utils.py`, `src/utils/transactional_route.py`, `tests/unit/test_containers.py` | `SEO-BE-3a` | `UT-SEO-13`; targeted регрессия `UT-SEO-08..12`; scoped lint/typecheck/format; полный suite в `SEO-BE-4` | handoff `.qa/seo-service-queries-pages/SEO-BE-3/handoff.md`, `design.md` (D1, D6, D12, `#test-matrix`), `src/{utils/database.py,settings.py,core/services/**,core/protocols/**}`, `services/yandex-service/src/{containers/**,depends/utils.py,utils/transactional_route.py}`, `services/yandex-service/tests/unit/test_containers.py` |
| `SEO-BE-4a` (done; .1–.5) | Backend | `src/{api/**,depends/tenant.py,main.py}`, `tests/api/{conftest,test_access,test_health}.py` | `SEO-BE-3` | `UT-SEO-14..16`; targeted pytest; scoped lint/typecheck/format | handoff `SEO-BE-3`, `design.md` (D1, D8, D9, D12, `#access-matrix`, `#test-matrix`), `specs/seo-peer-http-contract/spec.md` |
| `SEO-BE-4b` (.6, .7, .V) | Backend | `tests/api/{test_resolve_api,test_listing_api,test_blacklist_api,test_errors}.py`, соответствующие fixtures, `README.md`, `pyproject.toml`, `uv.lock`; API — только обнаруженные дефекты | `SEO-BE-4a` | `UT-SEO-17..20`; полный `make test` + `make test-infra` с PostgreSQL, `make lint`, scoped format | handoff `.qa/seo-service-queries-pages/SEO-BE-4/handoff.md`, `design.md` (D8, D9, D12, access/test matrix), `specs/seo-{peer-http-contract,entity-resolution,entity-listing,page-normalization-settings}/spec.md` |
| `SEO-PROXY-1` | Backend | `services/backend/src/{settings.py,clients/seo_service/**,core/protocols/seo_service.py,core/services/seo_proxy.py,depends/services.py}`, `services/backend/.env.example`, `services/backend/tests/unit/api/test_seo_client_boundary.py`, `services/backend/tests/unit/core/services/test_seo_proxy_service.py` | — | `UT-SEOP-01..04`; targeted pytest; `uv run mypy src` | `design.md` (D13, D14, `#api-контракт-seo-service-dto`, `#test-matrix`), `specs/seo-backend-proxy/spec.md`, `services/backend/src/{clients/yandex_service/**,core/protocols/yandex_service.py,core/services/yandex_proxy.py}`, `services/backend/tests/unit/api/test_yandex_client_boundary.py` |
| `SEO-PROXY-2` | Backend | `services/backend/src/{api/seo.py,api/__init__.py,main.py}`, `services/backend/maintain/route_inventory.py`, `services/backend/docs/backend-route-inventory.md`, `services/backend/tests/unit/api/{test_seo_proxy_api.py,test_route_access_inventory.py}` | `SEO-PROXY-1` | `UT-SEOP-05..11`; `PYTHONPATH=src uv run pytest -s -vv tests/unit`; `uv run mypy src`; `uv run isort src && uv run black src` | handoff `SEO-PROXY-1`, `design.md` (D13, `#access-matrix`, `#test-matrix`), `specs/seo-backend-proxy/spec.md`, `services/backend/src/api/yandex.py`, `services/backend/maintain/route_inventory.py` (ветка `/api/yandex/`), `services/backend/tests/unit/api/test_yandex_proxy_api.py` |
| `SEO-SMOKE-1` | Backend | локальный backend `.env` (`SEO_SERVICE_URL`, не коммитится), runtime seo/backend, БД `eqsitecms-db-seo` (только тестовые строки), `SERVICES.md` (секция SEO Service) | `SEO-BE-4`, `SEO-PROXY-2` | `SM-SEO-01..13` через `.agents/skills/api-smoke-test` на реальной PostgreSQL | handoffs `SEO-BE-4`, `SEO-PROXY-2`, `design.md` (D14, D15, `#postgresql-для-smoke-тестов`, `#test-matrix` — раздел smoke, `#access-matrix`), `.agents/skills/api-smoke-test`, `.agents/skills/stack-control` |
| `QG` | Quality Gate | `docs/reports/seo-service-queries-pages.md`, `.qa/seo-service-queries-pages/**` | `SEO-SMOKE-1` | `QG-FULL` по DAG | `design.md` (`#quality-gate`, `#access-matrix`, `#test-matrix`, `#postgresql-для-smoke-тестов`), все `specs/**`, handoff `SEO-SMOKE-1` |

## 1. SEO-BE-1 — зависимости, схема БД и миграция (профиль: Backend)

**Specs:** `seo-entity-resolution`, `seo-page-normalization-settings` · **Пути:** см. таблицу · **Зависит от:** —

- [x] SEO-BE-1.1 `pyproject.toml`: `name = "seo-service"`, описание, зависимость `dependency-injector>=4.49.1`, `containers` в `known-first-party`; `uv lock`; `.env.example` — `APP_TITLE=EqSiteCMS SEO Service` (новых ENV нет); проверить `uv sync` без ошибок
- [x] SEO-BE-1.2 `src/models/{search_queries,pages,blacklisted_query_params,blacklisted_hashes}.py` + `models/__init__.py` по D2 (TEXT без длины, `*_hash BYTEA`, `VARCHAR(255)` у черных списков, все уникальные/обычные/GIN индексы с именами из D2); `utils/basemodel.py` — только при необходимости
- [x] SEO-BE-1.3 `src/core/entities/{search_query,page,blacklisted_query_param,blacklisted_hash}.py` + `PaginatedEntities` в `base.py` по образцу эталона; экспорт в `core/entities/__init__.py`
- [x] SEO-BE-1.4 Миграция `src/migration/versions/20261023_0002_seo_queries_pages.py` (`down_revision = "20260710_0001"`) по D3: `pg_trgm`, 4 таблицы, индексы; `downgrade` удаляет индексы и таблицы
- [x] SEO-BE-1.5 `tests/integration/conftest.py` (отдельная схема на тест, `TEST_DATABASE_URL`, без чтения runtime settings — по образцу `yandex-service`) и `IT-SEO-01..02` (`test_migrations_postgres.py`, `test_models_postgres.py`); прогнать с `TEST_DATABASE_URL` на `eqsitecms-db-seo` (параметры — `docker inspect`, пароль не логировать)
- [x] SEO-BE-1.V `make test`, `make lint`; `alembic -c src/alembic.ini upgrade head → downgrade -1 → upgrade head` на `eqsitecms-db-seo` (лог в `.qa/seo-service-queries-pages/SEO-BE-1/`); отметить tasks, вернуть handoff (имена таблиц/колонок/индексов, способ вычисления hash)

## 2. SEO-BE-2 — исключения, нормализаторы, repository protocols и репозитории (профиль: Backend)

Утверждённый split: `SEO-BE-2a` = .1–.4 (done), `SEO-BE-2b` = .5–.7 и .V (done). Ссылки-зависимости на `SEO-BE-2` означают завершение обоих units; handoffs: `.qa/seo-service-queries-pages/SEO-BE-2/handoff.md` и `.qa/seo-service-queries-pages/SEO-BE-2b/handoff.md`.

**Specs:** `seo-normalization`, `seo-entity-resolution`, `seo-entity-listing`, `seo-page-normalization-settings` · **Пути:** см. таблицу · **Зависит от:** `SEO-BE-1`

- [x] SEO-BE-2.1 `src/core/exceptions/base.py`: `AppError(status_code, безопасное сообщение)`, `ClientError` 400, `UnauthorizedError` 401, `NotFoundError` 404, `AlreadyExistsError` 409, `RepositoryError`; экспорт в `__init__.py`
- [x] SEO-BE-2.2 `src/core/services/search_query_normalizer.py` (`SearchQueryNormalizer`, D4) + `tests/unit/test_search_query_normalizer.py` — `UT-SEO-01..02`
- [x] SEO-BE-2.3 `src/core/services/page_normalizer.py` (`PageNormalizer`, D5, чистая функция) + `tests/unit/test_page_normalizer.py` — `UT-SEO-03..07`
- [x] SEO-BE-2.4 `src/core/protocols/repositories/{base_repository,search_query_repository,page_repository,blacklisted_query_param_repository,blacklisted_hash_repository}.py` — Protocol-контракты (`resolve`, `get_filtered`, `count_filtered`, `get_values`, `get_by_value`, tenant-scoped `get/update/delete`)
- [x] SEO-BE-2.5 `src/repositories/abstract_repository.py` (по эталону) и `search_query_repository.py`, `page_repository.py`: `resolve` по D6 (sha256, сортировка по hash, `ON CONFLICT DO NOTHING` + `SELECT ANY`), фильтр/сортировка/`count` по D11 с экранированием LIKE
- [x] SEO-BE-2.6 `src/repositories/{blacklisted_query_param_repository,blacklisted_hash_repository}.py`: список по `value ASC`, `get_values` → `frozenset`, tenant-scoped get/update/delete по `(id, equestrian_id)`, `IntegrityError` уникальности → `AlreadyExistsError`; экспорт в `repositories/__init__.py`
- [x] SEO-BE-2.7 Реализовать и прогнать `IT-SEO-03..06` (`tests/integration/test_*_repository_postgres.py`) на реальной PostgreSQL, включая конкурентный тест `IT-SEO-04`
- [x] SEO-BE-2.V После split: targeted pytest `IT-SEO-03..06` с `TEST_DATABASE_URL`, scoped ruff check/format, mypy и flake8; полный suite — один раз в `SEO-BE-4`; отметить tasks, вернуть handoff (сигнатуры протоколов, формат ошибки нормализации с индексом)

## 3. SEO-BE-3 — DTO, доменные сервисы, DI-контейнеры и транзакция (профиль: Backend)

Утверждённый split: `SEO-BE-3a` = .1–.4 (done), `SEO-BE-3b` = .5–.7 и .V (done). Зависимость `SEO-BE-3` означает завершение обоих units; handoffs: `.qa/seo-service-queries-pages/SEO-BE-3/handoff.md` и `.qa/seo-service-queries-pages/SEO-BE-3b/handoff.md`. Scope не изменён, полный suite — в `SEO-BE-4`.

**Specs:** `seo-entity-resolution`, `seo-entity-listing`, `seo-page-normalization-settings` · **Пути:** см. таблицу · **Зависит от:** `SEO-BE-2`

- [x] SEO-BE-3.1 `src/core/schemas/api/*` — DTO из `design.md#api-контракт-seo-service-dto` (`extra="forbid"` для входных, 1..1000 для resolve, без `*_hash`/`equestrian_id` в выходных) + `tests/unit/test_schemas.py` (часть `UT-SEO-10`)
- [x] SEO-BE-3.2 `src/core/services/search_query_service.py` (`SearchQueryService`: `resolve`, `list_filtered`) — нормализация до БД, дедупликация, порядок входа, clamp пагинации
- [x] SEO-BE-3.3 `src/core/services/page_service.py` (`PageService`: `resolve` с однократной загрузкой обоих черных списков конюшни, `list_filtered`)
- [x] SEO-BE-3.4 `src/core/services/{blacklisted_query_param_service,blacklisted_hash_service}.py` — list/create/update/delete по D10; экспорт в `core/services/__init__.py`
- [x] SEO-BE-3.5 `src/depends/utils.py` (`get_session`) и `src/utils/transactional_route.py` по эталону
- [x] SEO-BE-3.6 `src/containers/{settings,repositories,services,application,__init__}.py` по D1 (`ContextLocalResource` session, Factory репозиториев и сервисов, нормализаторы)
- [x] SEO-BE-3.7 Реализовать и прогнать `UT-SEO-08..12` (сервисы на fake/mock-репозиториях) и `UT-SEO-13` (`tests/unit/test_containers.py`)
- [x] SEO-BE-3.V После split: targeted pytest `UT-SEO-08..13`, scoped ruff check/format, mypy и flake8; полный suite — в `SEO-BE-4`; отметить tasks, вернуть handoff (имена провайдеров `ServicesContainer`, методы сервисов, lifecycle)

## 4. SEO-BE-4 — HTTP API, tenant selector, ошибки и README (профиль: Backend)

Утверждённый split: `SEO-BE-4a` = .1–.5 (done), `SEO-BE-4b` = .6, .7, .V. Зависимость `SEO-BE-4` означает завершение обоих units. В `SEO-BE-4b` разрешена техническая декларация `httpx` в dev-зависимостях/lock; форматирование только scoped, без изменения чужих файлов. Полный suite включает оба make-target (`test` и `test-infra`) с `TEST_DATABASE_URL`.

**Specs:** `seo-peer-http-contract`, `seo-entity-resolution`, `seo-entity-listing`, `seo-page-normalization-settings` · **Пути:** см. таблицу · **Зависит от:** `SEO-BE-3`

- [x] SEO-BE-4.1 `src/depends/tenant.py`: `get_equestrian_id` (`X-Equestrian-Id`, missing/blank/не-UUID → `401` до валидации тела), без каких-либо credentials-проверок (D8, D9)
- [x] SEO-BE-4.2 `src/api/{search_queries,pages}.py`: `POST /resolve`, `GET /` (`search`, `ordering` Literal, `limit`, `offset`), `TransactionalRoute`, `@inject` + `Provide[ServicesContainer.…]`
- [x] SEO-BE-4.3 `src/api/{blacklisted_query_params,blacklisted_hashes}.py`: `GET /`, `POST /` (`201`), `PATCH /{item_id}`, `DELETE /{item_id}` (`204` без тела); `api/__init__.py`
- [x] SEO-BE-4.4 `src/main.py`: wiring 4 модулей, `APIRouter(prefix="/api")` (tenant dependency на всех `/api/*`) с префиксами `/search-queries`, `/pages`, `/page-normalization/blacklisted-query-params`, `/page-normalization/blacklisted-hashes`; `redirect_slashes=False`; lifespan `close_database`; обработчики ошибок и `SafeHttpErrorBoundary` по D12; `/health` без tenant dependency
- [x] SEO-BE-4.5 `tests/conftest.py`/`tests/api/conftest.py` (override контейнеров, fake-сервисы) и `UT-SEO-14..16` (`tests/api/test_access.py`, `test_health.py`) — параметризация по всем зарегистрированным `/api/*` маршрутам
- [x] SEO-BE-4.6 Реализовать и прогнать `UT-SEO-17..20` (`tests/api/test_resolve_api.py`, `test_listing_api.py`, `test_blacklist_api.py`, `test_errors.py`)
- [x] SEO-BE-4.7 `README.md` seo-service: назначение, дерево `src/` по эталону, граница доверенной внутренней сети и условие production-изоляции (D8), таблица API с access matrix из `design.md#access-matrix`, команды и запуск `IT-SEO-*` с `TEST_DATABASE_URL`
- [x] SEO-BE-4.V Полный `make test` + `make test-infra` (`IT-SEO-*` с `TEST_DATABASE_URL`), `make lint`, scoped `ruff check`/`ruff format --check` вместо массового `make format`; отметить tasks, вернуть handoff (точные пути маршрутов, формат ошибок)

## 5. SEO-PROXY-1 — настройки, клиент seo-service и прокси-сервис backend (профиль: Backend)

**Specs:** `seo-backend-proxy` · **Пути:** см. таблицу · **Зависит от:** — (контракт из specs и D13)

- [x] SEO-PROXY-1.1 `services/backend/src/settings.py`: `seo_service_url` (`SEO_SERVICE_URL`, default `http://eqsitecms-seo-service:8000`); `services/backend/.env.example` — `SEO_SERVICE_URL`
- [x] SEO-PROXY-1.2 `services/backend/src/clients/seo_service/schemas.py` — DTO ответов/запросов по `design.md#api-контракт-seo-service-dto` (списки, элементы черного списка)
- [x] SEO-PROXY-1.3 `services/backend/src/core/protocols/seo_service.py` — `SeoServiceClientProtocol` (10 операций) и `SeoServiceUnavailableError`
- [x] SEO-PROXY-1.4 `services/backend/src/clients/seo_service/client.py` — `SeoServiceClient` по D13: только заголовок `X-Equestrian-Id` (без credentials и пересылки cookie/заголовков клиента), маппинг `400/404/409` и `502`-класса, без логирования тел peer
- [x] SEO-PROXY-1.5 `services/backend/src/core/services/seo_proxy.py` (`SeoProxyService`: конюшня из actor, clamp `limit/offset`) и `depends/services.py` (`get_seo_service_client`, `get_seo_proxy_service`)
- [x] SEO-PROXY-1.6 Реализовать и прогнать `UT-SEOP-01..04` (`tests/unit/api/test_seo_client_boundary.py`, `tests/unit/core/services/test_seo_proxy_service.py`)
- [x] SEO-PROXY-1.V Targeted `PYTHONPATH=src uv run pytest tests/unit/api/test_seo_client_boundary.py tests/unit/core/services/test_seo_proxy_service.py`, `uv run mypy src`, `uv run isort src && uv run black src`; отметить tasks, вернуть handoff

## 6. SEO-PROXY-2 — API-роутер, ADMIN guard и route inventory backend (профиль: Backend)

**Specs:** `seo-backend-proxy` · **Пути:** см. таблицу · **Зависит от:** `SEO-PROXY-1`

- [x] SEO-PROXY-2.1 `services/backend/src/api/seo.py`: `require_seo_admin` (только `ADMIN`, `403` до downstream), 10 маршрутов по D13, ручной разбор `item_id` → `400`, `_proxy` → `502`; статусы `201`/`204`
- [x] SEO-PROXY-2.2 Подключить роутер в `src/api/__init__.py` и `src/main.py`
- [x] SEO-PROXY-2.3 `services/backend/maintain/route_inventory.py`: ветка `/api/seo/` с outcomes по `design.md#access-matrix`; перегенерировать `services/backend/docs/backend-route-inventory.md`
- [x] SEO-PROXY-2.4 `tests/unit/api/test_route_access_inventory.py`: счётчик маршрутов +10, тест классификации `/api/seo/*` — `UT-SEOP-11`
- [x] SEO-PROXY-2.5 Реализовать и прогнать `UT-SEOP-05..07` (`tests/unit/api/test_seo_proxy_api.py`: anonymous, роли, happy path)
- [x] SEO-PROXY-2.6 Реализовать и прогнать `UT-SEOP-08..10` (malformed `item_id`/body, чужая конюшня, `404`/`409`/`502`)
- [x] SEO-PROXY-2.V Полный `PYTHONPATH=src uv run pytest -s -vv tests/unit`, `uv run mypy src`, `uv run isort src && uv run black src`; отметить tasks, вернуть handoff

### SEO-PROXY-FIX-1 — whitespace по QG-BE

- [x] SEO-PROXY-FIX-1.1 Удалить пустую строку после `SeoServiceClientProtocol` и применить Ruff-перенос условного выражения в `test_seo_proxy_api.py` без изменения семантики; scoped Ruff format/check, Black/isort check и targeted tests. Black 25.1.0 требует обратный перенос условного выражения и конфликтует с Ruff; diff и результаты — `.qa/seo-service-queries-pages/SEO-PROXY-FIX-1/`.

## 7. SEO-SMOKE-1 — живой стек, smoke на реальной PostgreSQL и SERVICES.md (профиль: Backend)

**Specs:** все 6 · **Пути:** см. таблицу (код не меняется) · **Зависит от:** `SEO-BE-4`, `SEO-PROXY-2`

- [x] SEO-SMOKE-1.1 Discovery БД: `docker inspect eqsitecms-db-seo` (образ, порт, сеть, user/db; пароль только в рантайме) — сверить с `design.md#postgresql-для-smoke-тестов`, записать в `.qa/seo-service-queries-pages/SEO-SMOKE-1/`
- [x] SEO-SMOKE-1.2 Backend `.env` — `SEO_SERVICE_URL` (если отличается от default; не коммитить); `make seo-build`, миграция через `seo-migration` (D3), перезапуск `seo-service` и backend (`make`/`docker compose`, stackctl seo не поддерживает); `GET /health` обоих — `200`
- [x] SEO-SMOKE-1.3 Выполнить `SM-SEO-01..09` (прямые вызовы seo-service, tenant A/B по D15) через `.agents/skills/api-smoke-test` на реальной PostgreSQL с SQL-проверками
- [x] SEO-SMOKE-1.4 Выполнить `SM-SEO-10..13` (backend anonymous/без ADMIN/ADMIN, чужая конюшня, отсутствие внутренних полей в ответах и пересылки cookie в seo-service)
- [ ] SEO-SMOKE-1.5 Очистка по D15 (черные списки — API; tenant B — SQL по префиксу; строки tenant A с префиксом оставить для `QG-LIVE`). Отложено по прямому запрету пользователя на SQL cleanup без отдельного согласия: UUID/tenant/prefix и оставшиеся blacklist fixtures записаны в `.qa/seo-service-queries-pages/SEO-SMOKE-1/fixtures.json` и `retained-rows.json`; свои CRUD-test DELETE выполнены через API.
- [x] SEO-SMOKE-1.6 `SERVICES.md`: секция SEO Service (назначение, ресурсы compose/БД, backend `SEO_SERVICE_URL`, API-контур и access — internal trusted network + условие production-изоляции, ограничение stackctl) по фактически проверенным данным
- [x] SEO-SMOKE-1.V Свод результатов `SM-SEO-01..13` в `.qa/seo-service-queries-pages/SEO-SMOKE-1/`; отметить tasks, вернуть handoff (ключевые UUID/данные для QG-LIVE)

## 8. QG — Quality Gate `QG-FULL` (профиль: Quality Gate)

**Specs:** все 6 · **Пути:** `docs/reports/seo-service-queries-pages.md`, `.qa/seo-service-queries-pages/**` · **Зависит от:** `SEO-SMOKE-1`

- [x] QG.1 `QG-ENV`: seo (пересборка, миграция), backend, `eqsitecms-db-seo` через `make`/`docker compose`; наличие данных из handoff `SEO-SMOKE-1`
- [x] QG.2 `QG-BE`: архитектура и DI по эталону (D1), Clean Architecture, scoped format/lint/test обоих сервисов, `IT-SEO-*` с `TEST_DATABASE_URL`, покрытие `UT-SEO-*`/`UT-SEOP-*` против матрицы, отсутствие секретов
- [x] QG.3 `QG-CONTRACTS`: обе access matrix (anonymous/authenticated, исключения с причинами, включая Internal Trusted Network без credentials и условие production-изоляции), route inventory; AsyncAPI — неприменимо (NATS не затронут)
- [x] QG.4 `QG-LIVE`: сверка/повтор `SM-SEO-01..13` через `.agents/skills/api-smoke-test`, повтор `upgrade/downgrade/upgrade` миграции
- [x] QG.5 `QG-FE-AUTO`, `QG-FE-MANUAL` — неприменимо (нет UI diff); `QG-SYNTH`: единый отчёт `docs/reports/seo-service-queries-pages.md` с вердиктом

## SEO-IT-FIX-1 — изоляция SQL-error integration теста (профиль: Backend)

- [x] SEO-IT-FIX-1.1 Исключить public fallback после намеренного DROP только собственной тестовой таблицы в `tests/integration/test_blacklist_repository_postgres.py`, сохранить pg_trgm для миграций и строгие assertions; прогнать все 19 integration тестов PostgreSQL только в новых test_seo_* схемах и scoped lint/typecheck/format. Evidence: `.qa/seo-service-queries-pages/SEO-IT-FIX-1/`. Продуктовый код и рабочие данные не менять.

## Workflow follow-up

- После `QG-SYNTH = APPROVED` (или `APPROVED_WITH_WAIVER`): sync delta specs в `openspec/specs/`, повторный `openspec validate --strict`, archive change (Router), финализация через `.agents/skills/task-finalize`.
- Удаление тестовых строк tenant A с префиксом `eqsite-smoke-` после QG.
