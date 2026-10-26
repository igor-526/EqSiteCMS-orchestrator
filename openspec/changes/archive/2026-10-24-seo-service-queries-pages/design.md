# Design — seo-service: поисковые запросы, страницы и нормализация

- **Тикет:** [`docs/tasks/099_seo_service.md`](../../../docs/tasks/099_seo_service.md)
- **Дата:** 2026-10-23
- **Сервисы:** `services/seo-service` (основной), `services/backend` (admin-прокси). `services/frontend` и `site-*` не затрагиваются.
- **Change:** `seo-service-queries-pages`
- **Профиль Quality Gate:** `QG-FULL` (миграция БД)

## Context

Мотивация — см. `proposal.md` → Why. Текущее состояние, влияющее на подход:

- `services/seo-service` — шаблон FastAPI (Python 3.14, SQLAlchemy Core + asyncpg, Alembic) без `dependency-injector`, без `containers/`, без `repositories/abstract_repository.py`, без `utils/transactional_route.py`; единственная миграция `20260710_0001` пустая; `pyproject.toml` называется `fastapi-template`.
- Эталон — `services/yandex-service`: `containers/{settings,clients,repositories,services,application}.py` на `dependency-injector`; `RepositoriesContainer.session = providers.ContextLocalResource(get_session)`; `TransactionalRoute` открывает `session.begin()` на запрос; маршруты `@inject` + `Depends(Provide[ServicesContainer.<service>])`; `core/protocols/repositories/*` (Protocol) ↔ `repositories/*` (реализации `AbstractRepository[E]`); сущности `core/entities` (pydantic `Entity`, `TimestampMixin`, `PaginatedEntities`); DTO в `core/schemas/api/*` с суффиксами `InDto`/`OutDto`; таблицы `models/*.py` через `utils/basemodel.py` (`uuid_pk`, `timestamp_columns`); конюшня — `equestrian_id`.
- Эталон peer-доступа: yandex-service не имеет credentials (доверенная приватная сеть, gap production-изоляции зафиксирован в `yandex-peer-http-contract`). Backend проксирует его через `clients/yandex_service` + `core/services/yandex_proxy.py` + `api/yandex.py` с guard «только `ADMIN`, конюшня из сессии», маппинг peer `400 → 400`, прочее → `502`; маршруты классифицированы в `maintain/route_inventory.py` и `docs/backend-route-inventory.md` (тест считает маршруты, сейчас 120).
- Инфраструктура: `.docker-compose/docker-compose.seo.yml` (`seo-service`, `seo-migration`, исходники смонтированы `ro`, без `--reload`); БД `eqsitecms-db-seo` (PostgreSQL 16) в infra compose; `make seo`, `make seo-build`. `scripts/stackctl` seo не регистрирует — штатный обход через `make`/`docker compose`.
- `pg_trgm` доступен в образе `postgres:16`; `convert_to()` в PostgreSQL — `STABLE`, поэтому не годится для generated column/индекса по выражению (учтено в D2).

## Goals / Non-Goals

**Goals:**

- Привести seo-service к структуре и DI эталона и реализовать 4 таблицы, нормализацию, batch resolve, списки и CRUD черных списков.
- Добавить в backend 10 admin-маршрутов `/api/seo/**` с полной access matrix и route inventory.
- Обеспечить конкурентно-безопасный find-or-create без ограничения длины значений.

**Non-Goals (из запроса и design-уровня):**

- Кэширование (в т.ч. черных списков) — не делается.
- Изменение и удаление поисковых запросов и страниц — API нет.
- Парсинг, сервисы-парсеры и их регистрация — вне scope.
- Создание роли SEO-специалиста / нового scope — используется существующая `ADMIN`.
- Ретроактивное применение черных списков к сохранённым страницам, слияние дублей — следующая задача.
- Проксирование resolve-эндпоинтов через backend.
- CMS UI (`services/frontend`) для списков запросов/страниц и настроек нормализации — вне scope по решению пользователя (Q6); при необходимости — отдельный frontend change.
- Сервисные credentials seo-service (ключи, токены) — не вводятся по решению пользователя (Q1), как в эталонах.
- Seed значений черных списков по умолчанию (`utm_*`, `yclid`, `gclid`) — не делается (Q4).
- Проверка, что хост URL принадлежит домену конюшни; разрешение `.`/`..` в пути; wildcard/prefix-правила черного списка.
- Регистрация seo в `scripts/stackctl` (tooling вне change).
- NATS-события: не вводятся, `docs/asyncapi.yaml` не меняется.

## Decisions

### D1. Структура seo-service и DI по эталону

Дерево `services/seo-service/src` (новые/изменяемые элементы):

```text
src/
├── api/
│   ├── __init__.py                     # *_router экспорт
│   ├── search_queries.py               # POST /resolve, GET /
│   ├── pages.py                        # POST /resolve, GET /
│   ├── blacklisted_query_params.py     # GET/POST /, PATCH/DELETE /{item_id}
│   └── blacklisted_hashes.py           # GET/POST /, PATCH/DELETE /{item_id}
├── containers/
│   ├── __init__.py, application.py     # settings → repositories → services
│   ├── settings.py                     # SettingsContainer.app_settings = Singleton(Settings)
│   ├── repositories.py                 # session = ContextLocalResource(get_session) + 4 Factory
│   └── services.py                     # нормализаторы + 4 доменных сервиса (Factory)
├── core/
│   ├── entities/{base,search_query,page,blacklisted_query_param,blacklisted_hash}.py
│   ├── exceptions/base.py              # AppError, ClientError(400), UnauthorizedError(401), NotFoundError(404), AlreadyExistsError(409), RepositoryError
│   ├── protocols/repositories/{base_repository,search_query_repository,page_repository,blacklisted_query_param_repository,blacklisted_hash_repository}.py
│   ├── schemas/api/{seo_entities,search_queries,pages,blacklist}.py
│   └── services/{search_query_normalizer,page_normalizer,search_query_service,page_service,blacklisted_query_param_service,blacklisted_hash_service}.py
├── depends/{utils.py,tenant.py}        # get_session; get_equestrian_id
├── models/{search_queries,pages,blacklisted_query_params,blacklisted_hashes}.py
├── repositories/{abstract_repository,search_query_repository,page_repository,blacklisted_query_param_repository,blacklisted_hash_repository}.py
├── utils/{basemodel,database,transactional_route,configure_sentry}.py
├── migration/versions/20261023_0002_seo_queries_pages.py
├── main.py, settings.py
```

Наименования: таблицы во множественном числе snake_case; сущности `SearchQuery`, `Page`, `BlacklistedQueryParam`, `BlacklistedHash`; репозитории `<Entity>Repository` + `<Entity>RepositoryProtocol`; сервисы `SearchQueryService`, `PageService`, `BlacklistedQueryParamService`, `BlacklistedHashService`, чистые нормализаторы `SearchQueryNormalizer`, `PageNormalizer`; провайдеры контейнеров — snake_case имени класса. `ClientsContainer` не создаётся: у seo-service нет исходящих клиентов (отличие от эталона осознанное). `main.py`: `services_container.wire(modules=[...4 api модуля])`, `app.state.container`, `APIRouter(prefix="/api")`, `redirect_slashes=False`, lifespan → `close_database()`. `pyproject.toml`: `name = "seo-service"`, зависимость `dependency-injector>=4.49.1`, `known-first-party` + `containers`.

*Альтернатива:* FastAPI `Depends` без DI-контейнера (как в шаблоне/backend) — отклонена требованием пользователя следовать эталону.

### D2. Модель данных

| Таблица | Колонки | Ограничения и индексы |
|---|---|---|
| `search_queries` | `id UUID PK`, `equestrian_id UUID NOT NULL`, `query TEXT NOT NULL`, `query_hash BYTEA NOT NULL`, `created_at timestamptz NOT NULL default now()`, `updated_at timestamptz NULL` | `ux_search_queries_equestrian_id_query_hash UNIQUE (equestrian_id, query_hash)`; `ix_search_queries_equestrian_id_created_at (equestrian_id, created_at DESC, id DESC)`; `ix_search_queries_query_trgm GIN (query gin_trgm_ops)` |
| `pages` | `id`, `equestrian_id`, `page TEXT NOT NULL`, `page_hash BYTEA NOT NULL`, `created_at`, `updated_at` | `ux_pages_equestrian_id_page_hash UNIQUE (equestrian_id, page_hash)`; `ix_pages_equestrian_id_created_at`; `ix_pages_page_trgm GIN (page gin_trgm_ops)` |
| `blacklisted_query_params` | `id`, `equestrian_id UUID NOT NULL`, `value VARCHAR(255) NOT NULL`, `created_at`, `updated_at` | `ux_blacklisted_query_params_equestrian_id_value UNIQUE (equestrian_id, value)` |
| `blacklisted_hashes` | `id`, `equestrian_id UUID NOT NULL`, `value VARCHAR(255) NOT NULL`, `created_at`, `updated_at` | `ux_blacklisted_hashes_equestrian_id_value UNIQUE (equestrian_id, value)` |

- **Почему hash-колонка.** Значения `TEXT` не ограничены, а запись B-tree индекса ограничена ~2704 байтами: `UNIQUE (equestrian_id, query)` упал бы на длинном URL/запросе. Уникальность обеспечивается по `sha256(UTF-8(normalized))` (32 байта). Хеш вычисляет репозиторий (`hashlib.sha256(value.encode("utf-8")).digest()`) — единственный писатель. Generated column невозможна: `convert_to()` не `IMMUTABLE`; `md5(text)` immutable, но криптографически слаб для значений, частично приходящих из пользовательского ввода поисковиков. Коллизии sha256 практически исключены; integration-тест сверяет хеш в БД с Python.
- **Без btree по значению.** Сортировка по `query`/`page` выполняется в пределах выборки конюшни (сортировка в памяти PostgreSQL); btree по TEXT не создаётся по той же причине лимита.
- **pg_trgm GIN** ускоряет `ILIKE '%…%'` на больших объёмах; `pg_trgm` — trusted extension, создаётся владельцем БД.
- `equestrian_id` без FK: конюшни живут в БД backend (как в эталоне).
- `updated_at` присутствует через общий `timestamp_columns()` для единообразия; у запросов/страниц он остаётся `NULL`.

### D3. Миграция

Одна ревизия `20261023_0002` (`down_revision = "20260710_0001"`), файл `src/migration/versions/20261023_0002_seo_queries_pages.py`, рукописная (не autogenerate-заглушка): `CREATE EXTENSION IF NOT EXISTS pg_trgm`, 4 таблицы, все индексы из D2. `downgrade()` удаляет индексы и таблицы; расширение не удаляется (может использоваться иначе, удаление требует прав). Проверка: `upgrade head → downgrade -1 → upgrade head` на реальной PostgreSQL (`SEO-BE-1`, повтор в `QG-LIVE`). Данных для переноса нет.

### D4. Нормализация поискового запроса

`SearchQueryNormalizer.normalize(raw) -> str`: `unicodedata.normalize("NFC", raw)` → `strip()` → `re.sub(r"\s+", " ", …)` → пусто ⇒ `InvalidValueError` → `value[:1].upper() + value[1:].lower()`.

- Схлопывание пробелов и NFC не названы в запросе явно, но без них `"купить  лошадь"` и `"купить лошадь"` стали бы разными сущностями; это прямо служит цели уникальности.
- «Первая буква» трактуется как первый символ строки: `"2-КОМНАТНЫЙ"` → `"2-комнатный"`. Используется `upper()` первого символа, а не `str.capitalize()`, чтобы не зависеть от titlecase-особенностей.
- Имена собственные тоже понижаются (`"в МОСКВЕ"` → `"в москве"`) — это буквальное требование.

### D5. Нормализация страницы

`PageNormalizer.normalize(raw, *, blacklisted_params: frozenset[str], blacklisted_hashes: frozenset[str]) -> str` — чистая функция без I/O. Алгоритм:

1. `strip()`; пусто ⇒ invalid.
2. `urllib.parse.urlsplit(raw)`. Если `scheme` непустая: допустимы только `http`/`https` (без учёта регистра), иначе invalid; берутся `path`, `query`, `fragment`, хост/порт/userinfo отбрасываются. Если `raw` начинается с `//` — protocol-relative, netloc отбрасывается. Иначе значение — путь; при отсутствии ведущего `/` он добавляется (`"horses/1"` → `"/horses/1"`).
3. **Путь.** Пустой → `/`. Делится по литеральному `/`; каждый сегмент percent-декодируется (`unquote(errors="strict")`), затем кодируется обратно функцией канонического кодирования: символы `%`, `/`, `?`, `#`, пробельные (`str.isspace`) и управляющие (категория `Cc`) → `%XX` (UTF-8, hex верхний регистр); остальные (включая кириллицу) остаются как есть. Если декодирование сегмента даёт невалидный UTF-8 или встречается невалидная `%`-последовательность — сегмент сохраняется исходным с переводом корректных `%xx` в верхний регистр (значение не отклоняется: старые URL в cp1251 не должны ронять batch). Регистр пути и завершающий `/` не меняются: веб-серверы могут различать `/A` и `/a`, `/a` и `/a/`.
4. **Query.** `parse_qsl(query, keep_blank_values=True)` (декодирует `+` как пробел и `%XX`); пары с пустым именем отбрасываются; пары с именем ∈ `blacklisted_params` отбрасываются (точное совпадение с учётом регистра); оставшиеся — `sorted(pairs, key=lambda p: p[0])` (стабильная сортировка сохраняет порядок повторов); сборка `name=value` через `&` с каноническим кодированием, где дополнительно кодируются `&`, `=`, `+`. Следствие: `flag` ≡ `flag=`. Пустой результат ⇒ без `?`.
5. **Fragment.** Percent-декодируется; пустой ⇒ удаляется; ∈ `blacklisted_hashes` ⇒ удаляется; иначе добавляется `#` + каноническое кодирование.
6. Результат `path [+ "?" + query] [+ "#" + fragment]`.

Почему сортировка параметров: порядок параметров не меняет ресурс, а парсеры разных источников присылают его по-разному — без сортировки одна страница дублировалась бы. Почему декодированная форма: читаемость в CMS и работа `ILIKE` по кириллице. Регистр параметров не понижается: значения могут быть чувствительны (ID, токены).

### D6. Find-or-create и конкурентность

`SearchQueryRepository.resolve(*, equestrian_id, values: Sequence[str]) -> dict[str, UUID]` (аналогично `PageRepository`), вызывается сервисом с уже нормализованными **уникальными** значениями:

1. Посчитать `hash` для каждого значения; отсортировать пары по `hash` (одинаковый порядок захвата блокировок уникального индекса во всех транзакциях ⇒ нет deadlock).
2. `INSERT INTO search_queries (id, equestrian_id, query, query_hash) VALUES … ON CONFLICT (equestrian_id, query_hash) DO NOTHING` — один многострочный statement (`sqlalchemy.dialects.postgresql.insert(...).on_conflict_do_nothing(index_elements=[...])`).
3. `SELECT id, query_hash FROM search_queries WHERE equestrian_id = :e AND query_hash = ANY(:hashes)` → отображение `hash → id` → `value → id`. Если какое-то значение не найдено — `RepositoryError` (не должно происходить) ⇒ `500` и откат.

Корректность при READ COMMITTED: конфликтующая незакоммиченная вставка заставляет `INSERT` ждать; после её commit строка пропускается, а следующий `SELECT` (новый snapshot statement-а) её видит; после rollback — наша вставка проходит. `ON CONFLICT DO UPDATE … RETURNING` отклонён: он пишет новую версию существующих строк (bloat, лишний WAL) на каждый повторный resolve. «SELECT, затем INSERT» без `ON CONFLICT` отклонён: гонка даёт `UniqueViolation`.

Сервис: нормализует все элементы (ошибка ⇒ `ClientError` с индексом, до обращения к БД), дедуплицирует, вызывает репозиторий, собирает ответ в порядке входа `[{source, normalized, id}]`. `PageService` перед нормализацией один раз читает оба черных списка конюшни (`get_values(equestrian_id) -> frozenset[str]`).

### D7. Batch API

- Тело: `{"items": [str, ...]}`, `min_length=1`, `max_length=1000`, `extra="forbid"`. Ответ `200`: `{"items": [{"source": str, "normalized": str, "id": UUID}]}`.
- **Почему 1000:** одна многострочная вставка 1000 × 4 параметра = 4000 bind-параметров (< лимита asyncpg/PostgreSQL 32767); `ANY(:hashes)` по 1000 значений — один index scan; объём ответа умеренный. Парсер с большим объёмом отправляет несколько batch.
- Код ответа `200`, а не `201`: в batch смешаны найденные и созданные сущности. Признак `created` не возвращается — парсерам нужен только UUID.
- Длина отдельного элемента не ограничивается (требование «не ограничивать длину»); общий размер тела ограничен инфраструктурой. Риск — в Risks.

### D8. Доверенная внутренняя сеть без credentials

По решению пользователя (Q1) seo-service, как `yandex-service`/`ya-metrica-service`, — внутренний peer доверенной сети: сервисных ключей, токенов и проверки cookie нет, новых настроек безопасности нет. Парсеры вызывают seo-service напрямую, CMS — только через backend, где проверяется роль `ADMIN` (D13). Защита от внешних anonymous callers — сетевая изоляция: compose-сеть `eqsitecms_network`; host-порт `EXPOSE_SEO_SERVICE_PORT` предназначен только для локальной разработки. Перед production deployment изоляция должна быть подтверждена (требование spec `seo-peer-http-contract`), иначе выпуск блокируется — то же наследуемое ограничение, что зафиксировано для Яндекс-peers в `yandex-peer-http-contract`. Это явное исключение из Protected Write (access matrix ниже).

*Отклонённая альтернатива:* сервисный ключ `X-Service-Key` на всех `/api/*` — отклонён пользователем ради единообразия с эталонами.

### D9. Tenant selector `X-Equestrian-Id`

Конюшня передаётся только заголовком `X-Equestrian-Id` (UUID) на всех `/api/*`; dependency `get_equestrian_id` возвращает `UUID`, missing/blank/не-UUID ⇒ `401` (правило AGENTS.md: selector — несекретный identity hint, missing/invalid → `401`). Реализация — `depends/tenant.py`, подключается dependency каждого `/api/*` маршрута (router-level), поэтому срабатывает до валидации тела. Порядок проверок: selector (`401`) → валидация (`400`). Существование конюшни не проверяется (у seo-service нет реестра конюшен; вызывающие — доверенные внутренние сервисы). Единый заголовок вместо `equestrian_id` в query/body (как в эталоне) выбран, чтобы одинаково покрыть GET, POST, PATCH и DELETE и исключить подмену tenant через тело; лишние поля тела запрещены (`extra="forbid"` ⇒ `400`).

### D10. Черные списки — на конюшню, без ретроактивности

Черные списки tenant-scoped: сайты конюшен разные, и ADMIN одной конюшни не должен менять нормализацию другой (backend передаёт конюшню из сессии). Значение: trim; для хеша — удаление одного ведущего `#`; непустое, ≤255, без пробельных/управляющих символов и `#`; для параметра также без `&`, `=`, `?`. Сравнение точное, с учётом регистра (как в нормализаторе). Дубль ⇒ `409`: сервис проверяет существование (`get_by_value`), а гонку закрывает перехват `IntegrityError` уникального индекса в репозитории ⇒ `AlreadyExistsError`. Update/delete ищут по `(id, equestrian_id)`; отсутствие ⇒ `NotFoundError` (`404`), чужой элемент неотличим от отсутствующего. Операции над черными списками не обращаются к таблице `pages` (ретроактивность — Non-goal). Seed значений по умолчанию нет (Q4).

### D11. Списки

`GET /api/search-queries|/api/pages?search=&ordering=&limit=&offset=` → `PaginatedEntities[...OutDto]` (`items`, `total`). `search`: trim, пусто ⇒ без фильтра; экранирование `\`, `%`, `_` и `ILIKE '%' || :s || '%' ESCAPE '\'`. `ordering`: `Literal["query", "-query"]` / `Literal["page", "-page"]` — иное ⇒ `400` (валидация FastAPI); по умолчанию `created_at DESC, id DESC`; при сортировке по значению вторичный ключ `id`. `limit`/`offset` — `int` (нечисловые ⇒ `400`), clamp в сервисе 1..100 / ≥0 (как `YandexAccountsService`). Списки черных списков — без пагинации (малый объём), `ORDER BY value ASC`.

### D12. Ошибки и статусы seo-service

`main.py` регистрирует обработчики: `AppError` и наследники ⇒ `status_code` класса, `detail` = безопасное сообщение класса (не текст из входа); `RequestValidationError` ⇒ `400` с `[{type: "request_validation", loc, msg: "Некорректные параметры запроса"}]` без `input`/`ctx`; `HTTPException` ⇒ свой статус с нейтральным `detail`; прочие исключения ⇒ `500` `{"detail": "Внутренняя ошибка сервиса"}` + `logger.error` категории без деталей; `SafeHttpErrorBoundary` по образцу эталона. В отличие от yandex peer (только `200/204/400`) используются семантические статусы `401/404/409/500`: их различает backend-прокси (D13), а единый `400` скрыл бы конфликт и «не найдено».

### D13. Backend-прокси

Файлы по образцу Yandex: `src/clients/seo_service/{__init__,client,schemas}.py` (`SeoServiceClient(base_url, transport=None)`, `httpx.AsyncClient(timeout=10.0)` на запрос, единственный заголовок контекста — `X-Equestrian-Id`; credentials не передаются, cookie и заголовки браузера не пересылаются); `src/core/protocols/seo_service.py` (`SeoServiceClientProtocol`, `SeoServiceUnavailableError`); `src/core/services/seo_proxy.py` (`SeoProxyService`: tenant из `actor.equestrian_id`, clamp `limit/offset`); `src/depends/services.py` (`get_seo_service_client`, `get_seo_proxy_service`); `src/api/seo.py` (`router = APIRouter(prefix="/seo")`, `require_seo_admin` — копия семантики `require_yandex_admin`, без рефакторинга чужого кода; `_proxy` → `502`; `item_id: str` разбирается вручную ⇒ `400`, чтобы обойти backend-правило «path validation ⇒ 422»); подключение в `api/__init__.py`, `main.py`. Маппинг peer: `400` ⇒ `ClientError(detail≤300 или нейтральный)`; `404` ⇒ `NotFoundError`; `409` ⇒ `ConflictError` (backend уже отдаёт `409`); `401` (нарушение контракта tenant selector — ошибка интеграции, не пользователя), `5xx`, иной статус, транспорт, невалидный payload ⇒ `SeoServiceUnavailableError` ⇒ `502`. Тела peer не логируются. `ordering` проходит строкой; неизвестное значение отклоняет seo-service (`400` → `400`).

Пути backend: `/api/seo/search-queries`, `/api/seo/pages`, `/api/seo/page-normalization/blacklisted-query-params[/{item_id}]`, `/api/seo/page-normalization/blacklisted-hashes[/{item_id}]` (10 маршрутов). Route inventory: ветка `path.startswith("/api/seo/")` в `classify`, ассерт количества маршрутов `120 → 130` (или текущее +10), перегенерация `docs/backend-route-inventory.md`.

### D14. Конфигурация

| Сервис | ENV | Назначение / default |
|---|---|---|
| backend | `SEO_SERVICE_URL` | default `http://eqsitecms-seo-service:8000` |

Новых настроек у seo-service нет (credentials не вводятся, D8); его `.env.example` меняет только `APP_TITLE`. Backend `.env.example` получает `SEO_SERVICE_URL`; реальные значения — только в локальных `.env` (не коммитятся).

### D15. Тестовые данные smoke

Smoke использует две синтетические конюшни: tenant A — конюшня тестового ADMIN-пользователя из `.agents/skills/api-smoke-test/credentials.json` (для проверок через backend), tenant B — случайный UUID (только прямые вызовы seo-service). Значения с префиксом `eqsite-smoke-` / путь `/eqsite-smoke/…`. Записи в `search_queries`/`pages` API не удаляются (нет API удаления); по завершении smoke-агент удаляет только свои строки SQL-запросом по префиксу и `equestrian_id` tenant B (запись в отчёт), строки tenant A с префиксом оставляются для QG-LIVE и удаляются после QG. Элементы черных списков удаляются через API.

## API-контракт seo-service (DTO)

| DTO | Поля |
|---|---|
| `SeoResolveInDto` | `items: list[str]` (1..1000), `extra="forbid"` |
| `SeoResolveItemOutDto` | `source: str`, `normalized: str`, `id: UUID` |
| `SeoResolveOutDto` | `items: list[SeoResolveItemOutDto]` |
| `SearchQueryOutDto` | `id: UUID`, `query: str`, `created_at: datetime` |
| `PageOutDto` | `id: UUID`, `page: str`, `created_at: datetime` |
| `BlacklistItemInDto` | `value: str`, `extra="forbid"` |
| `BlacklistItemOutDto` | `id: UUID`, `value: str`, `created_at: datetime` |
| Списки | `PaginatedEntities[T]` → `{"items": [...], "total": int}` |

## Access matrix

Нормативные копии: `specs/seo-peer-http-contract/spec.md` (seo-service) и `specs/seo-backend-proxy/spec.md` (backend). Сводно:

**seo-service** — internal trusted network peer (D8): credentials не требуются и не проверяются, поэтому «without auth» и «with auth» (любые cookie/`Authorization`) дают одинаковый результат; единственная проверка — tenant selector `X-Equestrian-Id`, missing/invalid ⇒ `401`:

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/health` | Public Read | любой | `200` | то же |
| POST | `/api/search-queries/resolve` | Internal Trusted Network Write (исключение из Protected Write) | доверенные внутренние сервисы (парсеры) | `200`; tenant missing/invalid `401`; `400` | то же |
| POST | `/api/pages/resolve` | Internal Trusted Network Write (исключение) | парсеры | `200`; tenant `401`; `400` | то же |
| GET | `/api/search-queries` | Internal Trusted Network Read (исключение из Public Read) | backend | `200`; tenant `401`; `400` | то же |
| GET | `/api/pages` | Internal Trusted Network Read (исключение) | backend | `200`; tenant `401`; `400` | то же |
| GET | `/api/page-normalization/blacklisted-query-params` | Internal Trusted Network Read (исключение) | backend | `200`; tenant `401` | то же |
| POST | `/api/page-normalization/blacklisted-query-params` | Internal Trusted Network Write (исключение) | backend | `201`; `400`; `409`; tenant `401` | то же |
| PATCH | `/api/page-normalization/blacklisted-query-params/{item_id}` | Internal Trusted Network Write (исключение) | backend | `200`; `400`; `404` чужой/нет; `409`; tenant `401` | то же |
| DELETE | `/api/page-normalization/blacklisted-query-params/{item_id}` | Internal Trusted Network Write (исключение) | backend | `204`; `400`; `404`; tenant `401` | то же |
| GET | `/api/page-normalization/blacklisted-hashes` | Internal Trusted Network Read (исключение) | backend | `200`; tenant `401` | то же |
| POST | `/api/page-normalization/blacklisted-hashes` | Internal Trusted Network Write (исключение) | backend | `201`; `400`; `409`; tenant `401` | то же |
| PATCH | `/api/page-normalization/blacklisted-hashes/{item_id}` | Internal Trusted Network Write (исключение) | backend | `200`; `400`; `404`; `409`; tenant `401` | то же |
| DELETE | `/api/page-normalization/blacklisted-hashes/{item_id}` | Internal Trusted Network Write (исключение) | backend | `204`; `400`; `404`; tenant `401` | то же |

**backend** (`authenticated` = cookie `access_token`; конюшня из сессии; только `ADMIN`, без `SUPERUSER`/`DEVELOPER` override):

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/seo/search-queries` | Protected GET exception | ADMIN | `401` | `200`; без ADMIN `403` до peer; `400`; `502` |
| GET | `/api/seo/pages` | Protected GET exception | ADMIN | `401` | `200`; `403`; `400`; `502` |
| GET | `/api/seo/page-normalization/blacklisted-query-params` | Protected GET exception | ADMIN | `401` | `200`; `403`; `502` |
| POST | `/api/seo/page-normalization/blacklisted-query-params` | Protected write | ADMIN | `401` | `201`; `403`; `400`; `409`; `502` |
| PATCH | `/api/seo/page-normalization/blacklisted-query-params/{item_id}` | Protected write | ADMIN | `401` | `200`; `403`; `400`; `404` чужой/нет; `409`; `502` |
| DELETE | `/api/seo/page-normalization/blacklisted-query-params/{item_id}` | Protected write | ADMIN | `401` | `204`; `403`; `400`; `404`; `502` |
| GET | `/api/seo/page-normalization/blacklisted-hashes` | Protected GET exception | ADMIN | `401` | `200`; `403`; `502` |
| POST | `/api/seo/page-normalization/blacklisted-hashes` | Protected write | ADMIN | `401` | `201`; `403`; `400`; `409`; `502` |
| PATCH | `/api/seo/page-normalization/blacklisted-hashes/{item_id}` | Protected write | ADMIN | `401` | `200`; `403`; `400`; `404`; `409`; `502` |
| DELETE | `/api/seo/page-normalization/blacklisted-hashes/{item_id}` | Protected write | ADMIN | `401` | `204`; `403`; `400`; `404`; `502` |

Причины исключений: (1) GET backend защищены ролью `ADMIN`, а GET seo-service не являются Public Read — это внутренние SEO-данные и настройки администрирования конюшни, публичным `site-*` не нужны; (2) запись в seo-service без credentials — решение пользователя (Q1) по образцу эталонных Яндекс-peers: seo-service доступен только внутри доверенной сети, внешняя изоляция обязательна перед production; (3) роль `ADMIN` проверяет только backend. Чужой ресурс: элемент черного списка другой конюшни ⇒ `404` (неотличим от отсутствующего); списки и resolve адресуют только конюшню selector-а/сессии. Email owner-only policy и `X-Equestrian-Service-Key` неприменимы.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| `SEO-BE-1` | Backend | A — seo-service | `services/seo-service/{pyproject.toml,uv.lock,.env.example}`, `src/{utils/basemodel.py,models/**,core/entities/**,migration/versions/**}`, `tests/integration/{conftest.py,test_migrations_postgres.py,test_models_postgres.py}` | — | `IT-SEO-01..02`; `make test`; `make lint`; alembic upgrade/downgrade на `eqsitecms-db-seo` |
| `SEO-BE-2` | Backend | A — seo-service | `src/{core/exceptions/**,core/protocols/**,repositories/**,core/services/{search_query_normalizer,page_normalizer}.py}`, `tests/unit/test_*normalizer.py`, `tests/integration/test_*repository_postgres.py` | `SEO-BE-1` | `UT-SEO-01..07`, `IT-SEO-03..06`; `make test`; `make lint` |
| `SEO-BE-3` | Backend | A — seo-service | `src/{core/schemas/**,core/services/{search_query_service,page_service,blacklisted_query_param_service,blacklisted_hash_service}.py,core/services/__init__.py,containers/**,depends/utils.py,utils/transactional_route.py}`, `tests/unit/test_*_service.py`, `tests/unit/test_containers.py` | `SEO-BE-2` | `UT-SEO-08..13`; `make test`; `make lint` |
| `SEO-BE-4` | Backend | A — seo-service | `src/{api/**,depends/tenant.py,main.py}`, `tests/api/**`, `tests/conftest.py`, `README.md` | `SEO-BE-3` | `UT-SEO-14..20`; полный `make test`, `make lint`, `make format` |
| `SEO-PROXY-1` | Backend | B — backend proxy | `services/backend/src/{settings.py,clients/seo_service/**,core/protocols/seo_service.py,core/services/seo_proxy.py,depends/services.py}`, `services/backend/.env.example`, `services/backend/tests/unit/api/test_seo_client_boundary.py`, `services/backend/tests/unit/core/services/test_seo_proxy_service.py` | — (контракт из specs) | `UT-SEOP-01..04`; targeted pytest; `uv run mypy src` |
| `SEO-PROXY-2` | Backend | B — backend proxy | `services/backend/src/{api/seo.py,api/__init__.py,main.py}`, `services/backend/maintain/route_inventory.py`, `services/backend/docs/backend-route-inventory.md`, `services/backend/tests/unit/api/{test_seo_proxy_api.py,test_route_access_inventory.py}` | `SEO-PROXY-1` | `UT-SEOP-05..11`; `PYTHONPATH=src uv run pytest tests/unit`; `uv run mypy src`; `isort`+`black` |
| `SEO-SMOKE-1` | Backend | C — live verification + docs | локальный backend `.env` (`SEO_SERVICE_URL`, не коммитится), runtime seo/backend, БД `eqsitecms-db-seo` (только тестовые строки), `SERVICES.md` (секция SEO Service) | `SEO-BE-4`, `SEO-PROXY-2` | `SM-SEO-01..13` через `.agents/skills/api-smoke-test` на реальной PostgreSQL |
| `QG-*` | Quality Gate | — | `docs/reports/seo-service-queries-pages.md`, `.qa/seo-service-queries-pages/**` | `SEO-SMOKE-1` | `QG-FULL` по DAG |

Пути `src/…`, `tests/…` в строках `SEO-BE-*` — относительно `services/seo-service/`. Deliverable A — один владелец (`services/seo-service/**`), четыре последовательных запуска; B — один владелец backend-файлов; A и B не пересекаются и выполняются параллельно.

### DAG

```text
SEO-BE-1 → SEO-BE-2 → SEO-BE-3 → SEO-BE-4 ──┐
                                            ├→ SEO-SMOKE-1 → QG-ENV → (QG-BE ∥ QG-CONTRACTS) → QG-LIVE → QG-SYNTH
SEO-PROXY-1 → SEO-PROXY-2 ──────────────────┘
```

`SEO-PROXY-*` стартуют сразу: контракт seo-service зафиксирован в specs/D13, тесты backend используют `httpx.MockTransport` и fake-клиенты без живого peer.

## Test matrix

Трассировка: `N-*` → `specs/seo-normalization`, `R-*` → `specs/seo-entity-resolution`, `L-*` → `specs/seo-entity-listing`, `S-*` → `specs/seo-page-normalization-settings`, `P-*` → `specs/seo-peer-http-contract` (включая access matrix seo-service), `B-*` → `specs/seo-backend-proxy` (включая access matrix backend). Smoke — только через `.agents/skills/api-smoke-test`, без pytest-файлов `tests/smoke/`.

### seo-service: нормализация и домен (`UT-SEO-01..13`)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Трассировка / где |
|---|---|---|---|---|---|
| `UT-SEO-01` | unit | happy path | Нормализация запроса: регистр, схлопывание пробелов, NFC, первый символ не буква | `"Купить лошадь в москве"`, `"2-комнатный денник"`; NFD/NFC дают один результат | N «Нормализация поискового запроса»; `tests/unit/test_search_query_normalizer.py` |
| `UT-SEO-02` | unit | валидация/границы | Пустой/пробельный запрос; 10 000 символов | invalid; длинный без усечения | N; там же |
| `UT-SEO-03` | unit | happy path | Страница: абсолютный URL с userinfo/портом, protocol-relative, только домен, путь без `/` | `/horses/1?x=1`, `/`, `/horses/1` | N «Путь страницы»; `tests/unit/test_page_normalizer.py` |
| `UT-SEO-04` | unit | валидация | `mailto:`, `javascript:`, пустое, пробелы | invalid | N «Путь страницы»; там же |
| `UT-SEO-05` | unit | граничные значения | Кодированная/декодированная кириллица, `%2f`→`%2F`, пробел→`%20`, невалидные `%zz`/не-UTF-8 не роняют, регистр и `/` в конце сохраняются | по сценариям spec | N «Канонический вид пути»; там же |
| `UT-SEO-06` | unit | граничные значения | Query: удаление по черному списку с учётом регистра, стабильная сортировка, повторы, `flag`≡`flag=`, пустые имена, `+`, все удалены ⇒ без `?` | по сценариям spec | N «Query-параметры страницы»; там же |
| `UT-SEO-07` | unit | граничные значения | Fragment: в черном списке, вне, пустой, кодированный | по сценариям spec | N «Хеш страницы»; там же |
| `UT-SEO-08` | unit | happy path, идемпотентность | `SearchQueryService.resolve`: порядок входа, дедупликация `["лошадь","ЛОШАДЬ"," лошадь "]` ⇒ одно значение в репозиторий, `source/normalized/id` | один вызов репозитория с уникальными значениями | R «Batch resolve поисковых запросов»; `tests/unit/test_search_query_service.py` |
| `UT-SEO-09` | unit | изоляция tenant | `PageService.resolve` читает черные списки только своей конюшни ровно один раз на batch и применяет их | fake-репозитории получают `equestrian_id` selector-а | N «Черный список … своей конюшни», R «Batch resolve страниц»; `tests/unit/test_page_service.py` |
| `UT-SEO-10` | unit | валидация/границы | Batch 0 / 1 / 1000 / 1001; невалидный элемент в середине ⇒ `ClientError` с индексом без значения, репозиторий не вызван | по сценариям spec | R «Ограничения batch»; `tests/unit/test_schemas.py`, сервисные тесты |
| `UT-SEO-11` | unit | валидация, конфликты | Сервисы черных списков: trim, снятие `#`, запрещённые символы, 255/256, дубль ⇒ `AlreadyExistsError`, update/delete чужого/нет ⇒ `NotFoundError`, таблица страниц не трогается | по сценариям spec | S «Создание/Изменение/Удаление», «…не трогает сохранённые страницы»; `tests/unit/test_blacklist_services.py` |
| `UT-SEO-12` | unit | валидация | Сервисы списков: clamp `limit` 0/500 ⇒ 1/100, `offset` −1 ⇒ 0, пустой `search` игнорируется | по сценариям spec | L «Пагинация», «Поиск»; `tests/unit/test_listing_services.py` |
| `UT-SEO-13` | unit | конфигурация DI | Граф DI-контейнеров собирает все сервисы и репозитории с одной context-local session; провайдеры settings — Singleton | граф по D1 | P «Транзакция на запрос»; `tests/unit/test_containers.py` |

### seo-service: HTTP и access (`UT-SEO-14..20`)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Трассировка / где |
|---|---|---|---|---|---|
| `UT-SEO-14` | api | access matrix (без credentials) | Все 12 `/api/*` маршрутов с валидным `X-Equestrian-Id` без credentials и с посторонними cookie/`Authorization` (параметризация по маршрутам приложения) | одинаковый успешный статус, credentials не влияют | P «Доверенная внутренняя сеть без credentials»; строки matrix seo-service; `tests/api/test_access.py` |
| `UT-SEO-15` | api | access matrix (tenant) | Все 12 маршрутов без/с пустым/с не-UUID `X-Equestrian-Id` (в т.ч. с невалидным телом — `401` раньше `400`); `equestrian_id` в теле resolve | `401`, сервисы/БД не вызваны; тело с лишним полем `400` | P «Tenant selector»; `tests/api/test_access.py` |
| `UT-SEO-16` | api | access matrix (public) | `GET /health` anonymous и с посторонними заголовками | `200 {"status":"ok"}` без БД | P «Статический health»; `tests/api/test_health.py` |
| `UT-SEO-17` | api | контракт ответа | Resolve запросов и страниц: `200`, порядок, поля `source/normalized/id`, `400` на 0/1001/invalid | по spec | R; `tests/api/test_resolve_api.py` |
| `UT-SEO-18` | api | контракт, валидация | Списки: форма `{items,total}`, поля без `query_hash`/`equestrian_id`; `ordering=created_at` ⇒ `400`; `offset=abc` ⇒ `400` | по spec | L; `tests/api/test_listing_api.py` |
| `UT-SEO-19` | api | контракт, конфликты | CRUD черных списков: `201/200/204` (без тела), `400` не-UUID `item_id`, `404`, `409` | по spec | S, строки matrix seo-service; `tests/api/test_blacklist_api.py` |
| `UT-SEO-20` | api | безопасность ошибок, транзакционность | Тела `400/401/404/409/500` не содержат входа, SQL, traceback, параметров подключения; неожиданное исключение ⇒ `500`; ошибка в handler откатывает транзакцию (`TransactionalRoute`) | по spec | P «Множество HTTP-статусов», «Транзакция на запрос»; `tests/api/test_errors.py` |

### seo-service: реальная PostgreSQL (`IT-SEO-01..06`)

Запуск с `TEST_DATABASE_URL` на `eqsitecms-db-seo` (отдельная схема на тест, как `yandex-service/tests/integration/conftest.py`); без переменной — `skip`, поэтому их прогон обязателен в verification units и в `QG-BE`.

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Трассировка |
|---|---|---|---|---|---|
| `IT-SEO-01` | integration | миграции | `alembic upgrade head → downgrade -1 → upgrade head` на реальной БД | 4 таблицы, уникальные/GIN индексы, `pg_trgm`; downgrade чистый | design D3 |
| `IT-SEO-02` | integration | constraints, типы | Прямая вставка дубля `(equestrian_id, hash)` ⇒ `IntegrityError`; то же значение у другой конюшни — ок; значение 100 000 символов сохраняется; hash в БД = sha256 Python | по spec | R «Уникальность в рамках конюшни» |
| `IT-SEO-03` | integration | идемпотентность | `resolve` репозиториев: смешанные новые/существующие, повтор ⇒ те же UUID, число строк не растёт | по spec | R «Batch resolve …» |
| `IT-SEO-04` | integration | конкурентность | Две параллельные сессии/транзакции с пересекающимися batch (`["а","б","в"]` ∥ `["в","б","г"]`), 20 повторов | без исключений и deadlock, общие UUID совпадают, 4 строки | R «Конкурентная безопасность» |
| `IT-SEO-05` | integration | сортировка, поиск | Изоляция tenant, `ILIKE` по кириллице без учёта регистра, экранирование `_`/`%`, `ordering` ±, default `created_at DESC, id DESC`, `total` | по spec | L |
| `IT-SEO-06` | integration | constraints, изоляция | Черные списки: уникальность в конюшне и списке, одно значение в двух списках, update/delete по `(id, equestrian_id)`, гонка дубля ⇒ `AlreadyExistsError`, `pages` не меняется | по spec | S |

### backend-прокси (`UT-SEOP-01..11`)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Трассировка / где |
|---|---|---|---|---|---|
| `UT-SEOP-01` | unit | контракт peer | Клиент: методы/пути/query/body и заголовок `X-Equestrian-Id` на всех 10 операциях; credentials/cookie не отправляются (`httpx.MockTransport`) | точное соответствие D13 | B «Конюшня из сессии»; `tests/unit/api/test_seo_client_boundary.py` |
| `UT-SEOP-02` | unit | внешние ошибки | Peer `400` (короткий/длинный detail, не-JSON), `404`, `409`, `401`, `500`, `418`, timeout/`RequestError`, невалидный JSON/схема | `ClientError`/`NotFoundError`/`ConflictError`/`SeoServiceUnavailableError` | B «Трансляция ошибок»; там же |
| `UT-SEOP-03` | unit | изоляция tenant, валидация | `SeoProxyService`: конюшня только из actor, clamp `limit/offset`, передача `search/ordering` | по spec | B «Проксирование списков»; `tests/unit/core/services/test_seo_proxy_service.py` |
| `UT-SEOP-04` | unit | конфигурация, утечки | `SEO_SERVICE_URL`: default и override из ENV; тела ответов peer и URL с query не попадают в логи/исключения клиента | по D13, D14 | B «Трансляция ошибок»; `test_seo_client_boundary.py` |
| `UT-SEOP-05` | api | access matrix | 10 маршрутов anonymous | `401`, клиент не вызван | B «Только роль ADMIN»; `tests/unit/api/test_seo_proxy_api.py` |
| `UT-SEOP-06` | api | access matrix (роли) | 10 маршрутов: без ролей; `SUPERUSER`+`DEVELOPER`; `USER_MANAGER` | `403` до downstream | B; там же |
| `UT-SEOP-07` | api | happy path, контракт | ADMIN: `200/201/204` (без тела), payload passthrough | по spec | B «Проксирование списков/настроек»; там же |
| `UT-SEOP-08` | api | валидация | Не-UUID `item_id` ⇒ `400` без вызова; malformed body ⇒ `400` | по spec | B; там же |
| `UT-SEOP-09` | api | чужой ресурс, tenant | Клиентский `X-Equestrian-Id`/`equestrian_id` игнорируется; peer `404` ⇒ `404` | вызов с конюшней сессии | B «Конюшня из сессии…»; там же |
| `UT-SEOP-10` | api | внешние ошибки | Peer `409` ⇒ `409`; unavailable ⇒ `502` без деталей | по spec | B «Трансляция ошибок»; там же |
| `UT-SEOP-11` | unit | access governance | Route inventory: 10 строк `/api/seo/*`, GET — protected GET exception, запись — protected write, роли «ADMIN only», tenant «from session»; общее число маршрутов +10; артефакт актуален | по spec | B «Route inventory»; `tests/unit/api/test_route_access_inventory.py` |

### Smoke на живом стеке и реальной PostgreSQL (`SM-SEO-01..13`)

| ID | Риск/ось | Сценарий | Ожидание | Трассировка |
|---|---|---|---|---|
| `SM-SEO-01` | access (public) | `GET /health` seo-service anonymous | `200` | P «Статический health» |
| `SM-SEO-02` | access (tenant, без credentials) | seo `/api/*` (по одному маршруту каждого класса): без tenant, пустой tenant, не-UUID tenant ⇒ `401` ×3; валидный tenant без credentials и с посторонним cookie ⇒ одинаковый успешный ответ | по spec | P, matrix seo-service |
| `SM-SEO-03` | happy, идемпотентность, БД | Resolve запросов tenant B: новые + повтор + дубли внутри batch; SQL-проверка строк и нормализованных значений | UUID стабильны, строки уникальны | R, N |
| `SM-SEO-04` | happy, нормализация | Создать параметр `utm_source` и хеш `top` (seo напрямую, tenant B); resolve `https://x.ru/eqsite-smoke/a?utm_source=1&b=2&a=1#top` и `/eqsite-smoke/a?a=1&b=2` | один UUID, `normalized` `/eqsite-smoke/a?a=1&b=2` | N, R «Batch resolve страниц» |
| `SM-SEO-05` | нетретроактивность | Страница с `utm_medium` сохранена → добавить `utm_medium` в черный список → SQL: старая строка не изменилась; новый resolve даёт другой UUID | по spec | N «Отсутствие ретроактивного…», S |
| `SM-SEO-06` | изоляция tenant | Одинаковое значение в tenant A и B ⇒ разные UUID; списки каждого tenant без чужих | по spec | R «Уникальность…», L |
| `SM-SEO-07` | конкурентность | 4 параллельных resolve с пересечением | все `200`, общие UUID совпадают, без дублей в БД | R «Конкурентная безопасность» |
| `SM-SEO-08` | валидация/границы | 1000 элементов `200`; 1001 ⇒ `400`; batch с пробельным элементом ⇒ `400` и SQL: ни одна строка batch не создана | по spec | R «Ограничения batch» |
| `SM-SEO-09` | поиск/сортировка | Списки seo: `search` кириллица в другом регистре, `search=a_b`, `ordering=±query/page`, default, `limit=500` | по spec | L |
| `SM-SEO-10` | access (backend) | 10 маршрутов `/api/seo/**` anonymous | `401` | B, matrix backend |
| `SM-SEO-11` | access (роли) | Тестовый пользователь без ADMIN (роль подтверждается `/api/auth/me`) | `403` на 10 маршрутах | B «Только роль ADMIN» |
| `SM-SEO-12` | happy, чужой ресурс, конфликт | ADMIN tenant A: списки, CRUD черных списков `201/200/204`, дубль `409`, PATCH/DELETE элемента tenant B ⇒ `404` и элемент B цел | по spec | B, S |
| `SM-SEO-13` | контракт, утечки | Ответы backend и seo не содержат `query_hash`/`page_hash`/`equestrian_id`; ошибки без traceback/SQL; запросы backend → seo не несут cookie пользователя (по логам доступа seo, если включены, иначе по unit `UT-SEOP-01`) | по spec | P «Множество HTTP-статусов», B «Конюшня из сессии» |

Применимость осей: внешние ошибки — `UT-SEOP-02/10` (peer), `UT-SEO-20` (БД); регрессия — неприменимо (новая функциональность, багов не исправляется).

## PostgreSQL для smoke-тестов

Получено `docker inspect eqsitecms-db-seo` (2026-10-23; пароль не выводился):

| Параметр | Значение |
|---|---|
| Контейнер / образ | `eqsitecms-db-seo` / `postgres:16` (16.15) |
| Сеть | `eqsitecms_network`; хост сервиса для seo-service: `eqsitecms-db-seo:5432` |
| Порт хоста | `5437` → `5432` |
| Пользователь / БД | `eqsitecmsseo` / `eqsitecmsseo` |
| Пароль | только из `docker inspect … .Config.Env` (`POSTGRES_PASSWORD`) в рантайме; не записывать в tracked файлы и отчёт |
| Текущее состояние | только `alembic_version` (пустая начальная ревизия); `pg_trgm` доступен |

`SEO-SMOKE-1` обязан повторить discovery через `docker inspect` (параметры могли измениться). Backend: контейнер `eqsitecms-app`, сеть та же. seo-service: `eqsitecms-seo-service`, порт хоста `EXPOSE_SEO_SERVICE_PORT` (сейчас `8005`), исходники смонтированы `ro` без `--reload` и новая зависимость `dependency-injector` ⇒ нужна пересборка образа (`make seo-build`) и перезапуск; миграция — `seo-migration` (`docker compose -p eqsitecms-seo -f .docker-compose/docker-compose.seo.yml --env-file services/seo-service/.env run --rm seo-migration`). `stackctl` seo не поддерживает — штатный обход через `make`/`docker compose`.

## Manual QA steps (UI тестирование)

Неприменимо: UI diff отсутствует.

## Quality Gate

Профиль `QG-FULL` (миграция БД, 2 сервиса с кодом). Lanes:

- `QG-ENV` — подъём seo (пересборка, миграция), backend, БД через `make`/`docker compose` (stackctl seo не знает).
- `QG-BE` — `services/seo-service` и `services/backend`: архитектура по эталону (D1), scoped format/lint/test (`make format/lint/test` seo; `pytest tests/unit`, `mypy`, `isort`/`black` backend), `IT-SEO-*` с `TEST_DATABASE_URL`, покрытие test matrix.
- `QG-CONTRACTS` — обе access matrix, route inventory, исключения и их причины (включая Internal Trusted Network без credentials и наследуемое условие production-изоляции); AsyncAPI — неприменимо (NATS не затронут).
- `QG-LIVE` — повтор/сверка `SM-SEO-01..13`, повторный `upgrade/downgrade/upgrade` миграции.
- `QG-FE-AUTO`, `QG-FE-MANUAL` — неприменимо (нет UI diff).
- `QG-SYNTH` — отчёт `docs/reports/seo-service-queries-pages.md`.

## Risks / Trade-offs

- [Без credentials любой сервис внутренней сети может читать SEO-данные и менять черные списки любой конюшни, указав её `X-Equestrian-Id`] → решение пользователя (Q1) по образцу эталонов; сетевая изоляция seo-service — обязательное условие production-выпуска (spec `seo-peer-http-contract`), CMS-доступ только через backend с `ADMIN`.
- [Host-порт `EXPOSE_SEO_SERVICE_PORT` публикует seo-service на хосте разработки] → допустимо только для dev; production-конфигурация не публикует порт наружу.
- [seo-service не проверяет существование конюшни: опечатка UUID у парсера создаёт «сиротские» данные] → вызывающие — доверенные внутренние сервисы; backend всегда берёт конюшню из сессии.
- [Неограниченная длина элементов + 1000 элементов ⇒ большие тела запросов] → ограничение размера тела на уровне инфраструктуры/прокси; парсеры доверены.
- [Сортировка по `query`/`page` без btree-индекса — сортировка в памяти на больших tenant] → GIN для поиска есть; при росте — индекс по `left(value, 512)` отдельной задачей.
- [Канонизация пути (декодирование, сохранение регистра и `/`) может объединить или не объединить страницы не так, как ожидает SEO-специалист] → правила подтверждены пользователем (Q3) и зафиксированы сценариями; изменения — новый change без ретроактивности.
- [Хеш вычисляется приложением, а не БД] → единственный писатель — репозиторий; `IT-SEO-02` сверяет хеш.
- [Семантические статусы seo-service отличаются от yandex peer (только `200/204/400`)] → осознанно (D12); backend транслирует их явно.
- [`stackctl` не знает seo] → обход через `make`/`docker compose`, регистрация — отдельный tooling change.

## Migration Plan

1. `SEO-BE-1` добавляет ревизию `20261023_0002`; проверяется upgrade/downgrade на `eqsitecms-db-seo`.
2. Деплой: пересборка образов seo (`make seo-build`), запуск `seo-migration`, затем `seo-service`; backend — с `SEO_SERVICE_URL`. Перед production — подтвердить, что seo-service недоступен извне (D8).
3. Откат: `alembic downgrade 20260710_0001` (данных до change нет; данные, созданные после, теряются) и откат образов; backend без seo возвращает `502` на `/api/seo/**`, остальные маршруты не затронуты.

## Согласованные решения пользователя

Открытых вопросов нет. Решения approval gate (PLAN-2) уже отражены в specs, design и tasks:

- **Q1. Защита seo-service** — сервисный ключ не нужен; seo-service доверяет внутренней сети, как `yandex-service`/`ya-metrica-service` (D8). `401` — только за missing/invalid `X-Equestrian-Id`; backend проверяет только `ADMIN` и настраивается одной переменной `SEO_SERVICE_URL`.
- **Q2. Область черных списков** — у каждой конюшни свои (D10).
- **Q3. Правила нормализации страниц** — подтверждены как в D5: точное совпадение имени параметра с учётом регистра, без шаблонов; фрагменты вне черного списка сохраняются; регистр и завершающий `/` пути сохраняются; параметры сортируются.
- **Q4. Значения по умолчанию** — черные списки изначально пустые, seed нет.
- **Q5. Нормализация запроса** — trim, схлопывание пробелов, NFC сохраняются (D4).
- **Q6. CMS UI** — frontend не затрагивается, UI вне scope (Non-Goals).
- **Q7. Tenant selector** — заголовок `X-Equestrian-Id`, missing/invalid ⇒ `401` (D9).
