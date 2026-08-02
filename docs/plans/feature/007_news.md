# План: Фича "Новости"

**Тикет:** FEATURE-news
**Дата:** 2026-05-11
**Затронутые сервисы:** services/backend, services/frontend
**Ветка:** feature/news

---

## Контекст

В CMS отсутствует раздел новостей. Администратор не может публиковать новости, которые затем отображаются на сайте. Сайт-потребитель (site-ad) должен получать только опубликованные и не удалённые новости через публичный read API. Изменений в `services/site-ad` не требуется.

## Цель

После реализации:
- Администратор CMS может создавать, редактировать, удалять (soft delete) новости с полями: название, сниппет, HTML-контент (через TipTap-редактор), дата публикации, фотографии из галереи.
- `GET /api/news-cms` (CMS, защищённый) — возвращает все новости без ограничений по `published_at` и `is_deleted`, с расширенной фильтрацией.
- `GET /api/news` (consumer) — возвращает только опубликованные (`published_at <= now()`) и не удалённые (`is_deleted = FALSE`).
- Frontend CMS отображает таблицу новостей с колонками: Наименование, Сниппет, Дата публикации, Статус, Действия.
- Сниппет автогенерируется из `content` (strip HTML, первые 255 символов) если не задан явно.

---

## Детали реализации

### Backend

#### Access matrix

| Метод | Endpoint | Класс доступа | Роли | Без auth | С auth |
|---|---|---|---|---|---|
| GET | `/api/news-cms` | Protected GET (исключение) | SUPERUSER, ADMIN, DEVELOPER | 401 | 200 |
| GET | `/api/news` | Public Read (X-Equestrian-Service-Key) | — | 400 (нет ключа) | 200 |
| GET | `/api/news/{id}` | Public Read (X-Equestrian-Service-Key) | — | 400 (нет ключа) | 200 |
| POST | `/api/news` | Protected Write | SUPERUSER, ADMIN, DEVELOPER | 401 | 201 |
| PATCH | `/api/news/{id}` | Protected Write | SUPERUSER, ADMIN, DEVELOPER | 401 | 200 |
| DELETE | `/api/news/{id}` | Protected Write (soft delete) | SUPERUSER, ADMIN, DEVELOPER | 401 | 204 |
| POST | `/api/news/{id}/photos` | Protected Write | SUPERUSER, ADMIN, DEVELOPER | 401 | 204 |

**Исключение из дефолтной policy:**
- `GET /api/news-cms` — защищённый GET. **Причина:** endpoint возвращает неопубликованные (`published_at > now()`) и удалённые (`is_deleted = TRUE`) новости, которые не должны быть публично доступны. Статусы: без auth → 401, с auth без прав → 403, с auth и правами → 200.

#### Схема БД

```sql
CREATE TABLE news (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NULL,
    equestrian_id UUID NOT NULL REFERENCES equestrians(id) ON DELETE CASCADE,
    name          VARCHAR(63) NOT NULL,
    snippet       VARCHAR(255) NULL,
    content       TEXT NOT NULL DEFAULT '',
    published_at  TIMESTAMPTZ NOT NULL,
    is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at    TIMESTAMPTZ NULL
);

CREATE INDEX ix_news_equestrian_id ON news(equestrian_id);
CREATE INDEX ix_news_published_at  ON news(published_at);
CREATE INDEX ix_news_is_deleted    ON news(is_deleted);

CREATE TABLE news_photos (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id  UUID NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    is_main  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX ix_news_photos_news_id  ON news_photos(news_id);
CREATE INDEX ix_news_photos_photo_id ON news_photos(photo_id);
```

**SoftDeleteMixin** — новый миксин по аналогии с `TimestampMixin`:

```python
# В services/backend/src/models/mixins.py
def soft_delete_columns():
    return (
        Column("is_deleted", Boolean(), nullable=False,
               default=False, server_default=text("false")),
        Column("deleted_at", DateTime(timezone=True), nullable=True),
    )
```

Соответствующий Pydantic-миксин в `core/entities/base.py`:

```python
class SoftDeleteMixin(BaseModel):
    is_deleted: bool = Field(default=False)
    deleted_at: datetime | None = Field(default=None)
```

#### Enums

```python
# В services/backend/src/core/entities/news.py

class NewsStatus(str, Enum):
    PUBLISHED = "published"   # is_deleted=FALSE AND published_at <= now()
    SCHEDULED = "scheduled"   # is_deleted=FALSE AND published_at > now()
    DELETED = "deleted"       # is_deleted=TRUE

class NewsSortField(str, Enum):
    NAME_ASC = "name"
    NAME_DESC = "-name"
    PUBLISHED_AT_ASC = "published_at"
    PUBLISHED_AT_DESC = "-published_at"
    STATUS_ASC = "status"
    STATUS_DESC = "-status"
    CREATED_AT_ASC = "created_at"
    CREATED_AT_DESC = "-created_at"
```

**Status → SQL mapping (в репозитории):**

| NewsStatus | SQL-условие |
|---|---|
| `PUBLISHED` | `is_deleted = FALSE AND published_at <= now()` |
| `SCHEDULED` | `is_deleted = FALSE AND published_at > now()` |
| `DELETED` | `is_deleted = TRUE` |

Несколько статусов — объединяются через `OR`.

**Status sort → SQL ORDER BY CASE:**

```sql
CASE
    WHEN is_deleted = TRUE THEN 3
    WHEN published_at > now() THEN 2
    ELSE 1
END ASC  -- или DESC
```

#### Snippet автогенерация

Логика в `core/services/news.py` (сервисный слой, не в InDto и не в репозитории):

```python
import re

def _strip_html_to_text(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()

# При create/update: если snippet is None и content не пустой:
auto_snippet = _strip_html_to_text(content)[:255] or None
```

Правило: `snippet=None` + непустой `content` → автогенерация. `snippet` задан явно → использовать как есть. Пустая строка в `snippet` → ClientError (сниппет не может быть пустым).

#### Фильтрация GET /api/news-cms (CMS, защищённый)

Query-параметры (`NewsCmsFilterDto`):

| Параметр | Тип | Default | Описание |
|---|---|---|---|
| `page` | int | 1 | Страница |
| `limit` | int | 25 | Размер страницы |
| `name` | str \| None | None | Поиск по тексту: `name ~* re.escape(term)` |
| `snippet` | str \| None | None | Поиск по тексту: `snippet ~* re.escape(term)` |
| `content` | str \| None | None | Поиск по тексту: `content ~* re.escape(term)` |
| `published_at_from` | datetime \| None | None | Фильтр `published_at >= value` |
| `published_at_to` | datetime \| None | None | Фильтр `published_at <= value` |
| `status` | list[NewsStatus] \| None | None | Фильтр по списку статусов (OR) |
| `sort` | NewsSortField | `-published_at` | Сортировка |

**Текстовый поиск:** всегда через оператор `~*` (регистронезависимая регулярка PostgreSQL) с экранированием ввода через `re.escape`. Подробно — см. `agents/backend.md` раздел 12.

**Комбинация фильтров:** все условия объединяются через `AND`. Условия статусов между собой — через `OR`.

#### Фильтрация GET /api/news (consumer)

Query-параметры:
- `page` (int, default 1)
- `limit` (int, default 25)

Фиксированные фильтры (не переопределяются клиентом):
- `published_at <= now()`
- `is_deleted = FALSE`

Сортировка: `published_at DESC` (фиксированная).

#### Новые файлы и изменения

| Что | Путь | Описание |
|---|---|---|
| SoftDelete util | `services/backend/src/models/mixins.py` | `soft_delete_columns()` |
| SoftDeleteMixin entity | `services/backend/src/core/entities/base.py` | `class SoftDeleteMixin(BaseModel)` |
| SQLAlchemy tables | `services/backend/src/models/news.py` | таблицы `news`, `news_photos` |
| Импорт model | `services/backend/src/models/__init__.py` | добавить `news` |
| Entity + Enums | `services/backend/src/core/entities/news.py` | `News`, `NewsPhoto`, `NewsStatus`, `NewsSortField` |
| Schemas | `services/backend/src/core/schemas/news.py` | `NewsCreateInDto`, `NewsUpdateInDto`, `NewsOutDto`, `NewsPublicOutDto`, `NewsPhotosUpdateDto`, `NewsCmsFilterDto` |
| Repository Protocol | `services/backend/src/core/protocols/repositories/news_repository.py` | `NewsRepositoryProtocol` |
| Protocol `__init__` | `services/backend/src/core/protocols/repositories/__init__.py` | добавить `NewsRepositoryProtocol` |
| Repository | `services/backend/src/repositories/news_repository.py` | `NewsRepository` |
| Repositories `__init__` | `services/backend/src/repositories/__init__.py` | добавить `NewsRepository` |
| Service | `services/backend/src/core/services/news.py` | `class NewsService` |
| DI repository | `services/backend/src/depends/repositories.py` | `get_news_repository()` |
| DI service | `services/backend/src/depends/services.py` | `get_news_service()` |
| API router | `services/backend/src/api/news.py` | все 7 endpoint'ов |
| Router registration | `services/backend/src/api/__init__.py` | добавить `news_router` |
| Main | `services/backend/src/main.py` | зарегистрировать `news_router` |
| Alembic migration | `services/backend/src/migration/versions/<hash>_add_news_tables.py` | `down_revision = "b3e7a2f91c04"` |
| Unit tests | `services/backend/tests/unit/core/services/test_news_service.py` | ≥30 unit-тестов |

#### API контракт

```
# CMS endpoint (ИСКЛЮЧЕНИЕ: GET защищён)
GET /api/news-cms
Authorization: Cookie access_token=<token>
Query: page=1, limit=25, sort=-published_at
       name=<text>, snippet=<text>, content=<text>
       published_at_from=<ISO datetime>, published_at_to=<ISO datetime>
       status=published&status=scheduled  (multiple values)
Response 200: PaginatedEntities[NewsOutDto]
Response 401: без auth
Response 403: auth без прав admin/superuser/dev

# Consumer list (Public Read)
GET /api/news
X-Equestrian-Service-Key: <key>
Query: page=1, limit=25
Response 200: PaginatedEntities[NewsPublicOutDto]
Response 400: нет service_key

# Consumer detail (Public Read)
GET /api/news/{id}
X-Equestrian-Service-Key: <key>
Response 200: NewsPublicOutDto
Response 404: не найдена / не опубликована / удалена

# Create
POST /api/news
Authorization: Cookie access_token=<token>
Body: {
  "name": "string (1-63)",
  "snippet": "string (1-255) | null",
  "content": "string (HTML)",
  "published_at": "ISO 8601 datetime with timezone",
  "photo_ids": ["uuid"], "main_photo_id": "uuid | null"
}
Response 201: NewsOutDto

# Update
PATCH /api/news/{id}
Authorization: Cookie access_token=<token>
Body: partial fields
Response 200: NewsOutDto

# Soft Delete
DELETE /api/news/{id}
Authorization: Cookie access_token=<token>
Response 204  (is_deleted=True, deleted_at=now(), запись не удаляется физически)

# Photos management
POST /api/news/{id}/photos
Authorization: Cookie access_token=<token>
Body: { "photo_ids": ["uuid"], "main_photo_id": "uuid | null" }
Response 204
```

**NewsOutDto** (CMS — все поля):
```json
{
  "id": "uuid",
  "name": "string",
  "snippet": "string | null",
  "content": "string",
  "published_at": "ISO datetime",
  "is_deleted": false,
  "deleted_at": null,
  "photos": [{"id": "uuid", "is_main": true, "url": "string"}],
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime | null"
}
```

**NewsPublicOutDto** (consumer — без `is_deleted`, `deleted_at`, `content`):
```json
{
  "id": "uuid",
  "name": "string",
  "snippet": "string | null",
  "published_at": "ISO datetime",
  "photos": [{"id": "uuid", "is_main": true, "url": "string"}]
}
```

#### Права доступа

Допустимые роли для write операций и для `GET /api/news-cms`: `SUPERUSER`, `ADMIN`, `DEVELOPER`.

В `NewsService._check_admin_permission(user)` — по паттерну `PriceGroupService._check_admin_permission`.

#### Валидация HTML

Использовать существующую `validate_no_js_in_html` из `core/utils/html_security.py` при create/update `content`. Вызывать после `_validate_optional_text` — аналогично `_validate_price_data`.

---

### Frontend

#### Новые файлы

| Что | Путь | Описание |
|---|---|---|
| Types | `services/frontend/src/types/api/news.ts` | `NewsOutDto`, `NewsPublicOutDto`, `NewsCreateInDto`, `NewsUpdateInDto`, `NewsCmsQueryParams`, `NewsStatus` |
| API-функции | `services/frontend/src/api/news.ts` | `newsCmsList` (→ /api/news-cms), `newsCreate`, `newsUpdate`, `newsDelete`, `newsDetail`, `newsPhotosUpdate` |
| pageEditor adapter | `services/frontend/src/features/pageEditor/services/newsPageDataService.ts` | `fetchNewsPageData`, `saveNewsPageData` |
| Validators | `services/frontend/src/features/news/validators/news.ts` | Zod-схемы |
| Feature service | `services/frontend/src/features/news/services/newsService.ts` | обёртки вокруг API |
| Feature hook | `services/frontend/src/features/news/hooks/useNews.ts` | стейт, CRUD, загрузка, фильтры |
| Scopes hook | `services/frontend/src/features/news/hooks/useNewsScopes.ts` | реестр прав `newsPageScopesRegistry` + `useNewsPageActionScopes` |
| Tabs | `services/frontend/src/features/news/ui/NewsTabs.tsx` | `NewsTabsEnum` + компонент с conditional вкладками по правам |
| Table | `services/frontend/src/features/news/ui/NewsTable.tsx` | табличное представление |
| Form modal | `services/frontend/src/features/news/ui/NewsModal.tsx` | создание/редактирование |
| Admin docs view | `services/frontend/src/features/news/ui/NewsAdminDocumentationView.tsx` | инструкция для администратора |
| Developer docs view | `services/frontend/src/features/news/ui/NewsDeveloperDocumentationView.tsx` | API-документация для разработчика |
| Page | `services/frontend/src/app/(protected)/news/page.tsx` | точка входа |
| Layout menu | `services/frontend/src/app/(protected)/layout.tsx` | добавить пункт "Новости" |

#### Структура фичи (FSD)

```
src/features/news/
├── hooks/
│   ├── useNews.ts
│   └── useNewsScopes.ts
├── services/
│   └── newsService.ts
├── ui/
│   ├── NewsTable.tsx
│   ├── NewsModal.tsx
│   ├── NewsTabs.tsx
│   ├── NewsAdminDocumentationView.tsx
│   └── NewsDeveloperDocumentationView.tsx
└── validators/
    └── news.ts
```

#### UX: колонки таблицы

| Колонка | Источник | Форматирование | Поиск/Фильтр |
|---|---|---|---|
| Наименование | `name` | Кликабельное (открывает NewsModal), обрезать до 40 символов с "..." | Текстовый поиск + сортировка |
| Сниппет | `snippet` | `trimText(snippet ?? "", 32)` с "..." | Текстовый поиск |
| Дата публикации | `published_at` | `DD.MM.YYYY HH:mm` | Фильтр от/до + сортировка |
| Статус | вычисляемый | Tag: Опубликовано/Запланировано/Удалено | Фильтр по списку + сортировка |
| Действия | — | Кнопка фото (`FileImageOutlined`), кнопка HTML-редактора (`Html5Outlined`) | — |

#### UX: статусы

| Статус | Условие | Цвет |
|---|---|---|
| Опубликовано | `is_deleted=false` AND `published_at <= now()` | green |
| Запланировано | `is_deleted=false` AND `published_at > now()` | blue |
| Удалено | `is_deleted=true` | red |

#### UX: фильтры в шапке таблицы

- **Наименование**: `Input.Search` над колонкой (debounce 400ms), передаёт `name` в query
- **Сниппет**: `Input.Search` над колонкой, передаёт `snippet` в query
- **Дата публикации**: `DatePicker.RangePicker` над колонкой, передаёт `published_at_from` + `published_at_to`
- **Статус**: `Select multiple` с опциями `Опубликовано | Запланировано | Удалено`, передаёт `status[]` в query

Все фильтры — controlled state в `useNews`. При изменении любого фильтра сбрасывается на первую страницу.

#### UX: форма NewsModal

Поля:
- **Название** (`name`) — Input, maxLength=63, обязательное
- **Сниппет** (`snippet`) — TextArea, maxLength=255, необязательное; подсказка: "Если не заполнено — автогенерируется из содержимого"
- **Дата публикации** (`published_at`) — `DatePicker showTime` (Ant Design)
- **Содержимое** — кнопка "Редактировать HTML" → `PageEditorModal` из `features/pageEditor/`
- **Фотографии** — кнопка "Управление фото" → по аналогии с паттерном prices

Кнопки:
- Создание: "Закрыть" + "Добавить"
- Редактирование: "Закрыть" + "Удалить" (Popconfirm, soft delete) + "Изменить"

#### UX: вкладки страницы и документация

Страница `/news` содержит три вкладки. Вкладки рендерятся через `NewsTabs` аналогично `PricesTabs`.

**`NewsTabsEnum`:**

```typescript
export enum NewsTabsEnum {
    NEWS = 'news',
    ADMIN_DOCS = 'admin_docs',
    DEVELOPER_DOCS = 'developer_docs',
}
```

**Права на вкладки (`newsPageScopesRegistry`):**

| Действие | Роли | Видит вкладку |
|---|---|---|
| `SEE_ADMIN_INSTRUCTIONS` | `[SUPERUSER, ADMIN]` | "Инструкция" |
| `SEE_DEVELOPER_DOCS` | `[SUPERUSER, DEVELOPER]` | "Документация" |

Итоговая видимость по роли:
- **SUPERUSER** — видит обе вкладки: "Инструкция" + "Документация"
- **ADMIN** — видит только "Инструкция"
- **DEVELOPER** — видит только "Документация"

**`NewsTabs` компонент** — добавляет вкладки условно по `hasPermission`:

```typescript
const items = [
    { key: NewsTabsEnum.NEWS, label: 'Новости' },
];
if (hasPermission(NEWS_PAGE_SCOPES_ACTIONS.SEE_ADMIN_INSTRUCTIONS)) {
    items.push({ key: NewsTabsEnum.ADMIN_DOCS, label: 'Инструкция' });
}
if (hasPermission(NEWS_PAGE_SCOPES_ACTIONS.SEE_DEVELOPER_DOCS)) {
    items.push({ key: NewsTabsEnum.DEVELOPER_DOCS, label: 'Документация' });
}
```

**Рендеринг в `page.tsx`** — аналогично `prices/page.tsx`:
- При `activeTab === NEWS` → показывает `NewsTable` + модалы
- При `activeTab === ADMIN_DOCS` → показывает `NewsAdminDocumentationView`
- При `activeTab === DEVELOPER_DOCS` → показывает `NewsDeveloperDocumentationView`

Каждый doc-view самостоятельно рендерит `NewsTabs` в шапке (по аналогии с `PricesDeveloperDocumentationView`).

#### Содержимое NewsAdminDocumentationView (Инструкция)

Целевая аудитория: **администратор CMS** (роль ADMIN, SUPERUSER).

| Раздел | Содержимое |
|---|---|
| 1. Управление новостями | Создание, редактирование, удаление (soft delete) |
| 2. Статусы новостей | Опубликовано / Запланировано / Удалено — что значит каждый, как они меняются |
| 3. Поля новости | name (63 символа), snippet (255, автогенерация), published_at, content, фотографии |
| 4. HTML-редактор | Как открыть, что можно редактировать, ограничения безопасности (нет JS) |
| 5. Фотографии | Выбор из галереи, выбор главной фотографии |
| 6. Фильтры и поиск | Поиск по названию/сниппету/содержимому, фильтр по дате, фильтр по статусу |

#### Содержимое NewsDeveloperDocumentationView (Документация)

Целевая аудитория: **разработчик сайта-потребителя** (роль DEVELOPER, SUPERUSER).

| Раздел | Содержимое |
|---|---|
| 1. Аутентификация | Заголовок `X-Equestrian-Service-Key`, когда нужен, что возвращается без него |
| 2. GET /api/news | Параметры запроса (page, limit), формат ответа `PaginatedEntities[NewsPublicOutDto]` |
| 3. GET /api/news/{id} | Параметры пути, формат ответа `NewsPublicOutDto`, 404 при удалённой/неопубликованной |
| 4. Структура NewsPublicOutDto | id, name, snippet, published_at, photos — с описанием каждого поля; явно: нет content/is_deleted/deleted_at |
| 5. Структура фотографии | id, url, is_main |
| 6. Примеры запросов | curl/fetch примеры для списка и детальной новости |
| 7. Примечания | CMS-endpoint `GET /api/news-cms` защищён и не предназначен для потребителей |

#### Подключение pageEditor

По аналогии с `pricePageDataService.ts`:

```typescript
// src/features/pageEditor/services/newsPageDataService.ts
export const fetchNewsPageData = (id: string) =>
    newsDetail(id as UUID, { content: true });

export const saveNewsPageData = (id: string, content: string) =>
    newsUpdate(id as UUID, { content });
```

#### Меню

В `services/frontend/src/app/(protected)/layout.tsx`:
- Добавить пункт "Новости" в массив `items`
- Добавить в `pageTitles`: `'/news': 'Новости'`
- Добавить в `getActiveKey()`: `if (pathname?.startsWith('/news')) return 'news';`

---

## Порядок выполнения

1. Backend: `SoftDeleteMixin` — утилита в `models/mixins.py`, миксин в `core/entities/base.py`
2. Backend: SQLAlchemy модели — `models/news.py` (таблицы `news`, `news_photos`)
3. Backend: Entity + Enums — `core/entities/news.py` (`News`, `NewsPhoto`, `NewsStatus`, `NewsSortField`)
4. Backend: Schemas — `core/schemas/news.py` (включая `NewsCmsFilterDto`)
5. Backend: Protocol — `core/protocols/repositories/news_repository.py`
6. Backend: Repository — `repositories/news_repository.py` (text search через `~*` + `re.escape`)
7. Backend: Service — `core/services/news.py` (snippet-автогенерация, HTML-валидация, soft delete, права)
8. Backend: DI — фабрики в `depends/repositories.py` и `depends/services.py`
9. Backend: Router — `api/news.py`, регистрация в `api/__init__.py` и `main.py`
10. Backend: Миграция — `down_revision = "b3e7a2f91c04"`, применить `make migrate`
11. Backend: Unit-тесты — `tests/unit/core/services/test_news_service.py` (≥30 тестов)
12. Backend: `make format && make test && make lint` — чисто
13. Frontend: Types → API → pageEditor adapter → Validators → Service → Hook → UI → Page → Layout menu
14. Smoke-тесты — через скилл `api-smoke-test`

---

## Backend test plan

### PostgreSQL для smoke-тестов

Перед smoke-тестами выполнить:
```bash
docker ps --filter "label=com.docker.compose.project=eqsitecms" --filter "label=com.docker.compose.service=db"
docker inspect eqsitecms-db
```

Взять из `Config.Env`:
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`

Взять из `NetworkSettings.Ports["5432/tcp"]`:
- host port

Известный пример из текущего окружения (проверять через `docker inspect` перед каждым запуском):
- Container: `eqsitecms-db`
- `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`
- Host port: `5433`

### Unit-тесты backend-фичи News

#### Группа 1: snippet-автогенерация (8 тестов)

| # | Сценарий |
|---|---|
| UT-01 | `create`: snippet=None, content с HTML → snippet автогенерируется как plain text |
| UT-02 | `create`: snippet задан явно → используется без изменений |
| UT-03 | `create`: snippet=None, content пустой → snippet остаётся None |
| UT-04 | `create`: content с HTML-тегами → теги удаляются из snippet |
| UT-05 | `create`: content > 255 символов → snippet обрезается до 255 |
| UT-06 | `update`: snippet=None в patch → snippet перегенерируется из нового content |
| UT-07 | `update`: snippet задан явно → используется без изменений |
| UT-08 | `_strip_html_to_text`: множественные пробелы и переносы нормализуются |

#### Группа 2: валидация полей (8 тестов)

| # | Сценарий |
|---|---|
| UT-09 | `create`: name пустой → ClientError |
| UT-10 | `create`: name > 63 символов → ClientError |
| UT-11 | `create`: snippet > 255 символов → ClientError |
| UT-12 | `create`: snippet пустая строка → ClientError (явный пустой snippet недопустим) |
| UT-13 | `create`: content с `<script>` → ClientError |
| UT-14 | `create`: content с `javascript:` → ClientError |
| UT-15 | `create`: content с `onerror=` → ClientError |
| UT-16 | `create`: корректный HTML без JS → успех |

#### Группа 3: soft delete (5 тестов)

| # | Сценарий |
|---|---|
| UT-17 | `soft_delete`: устанавливает `is_deleted=True` и `deleted_at != None` |
| UT-18 | `soft_delete`: несуществующий id → ClientError |
| UT-19 | `get_cms_list`: `show_deleted=True` (все статусы) → удалённые записи в ответе |
| UT-20 | `get_cms_list`: фильтр `status=[PUBLISHED, SCHEDULED]` → удалённые не возвращаются |
| UT-21 | `get_public_list`: никогда не возвращает удалённые записи |

#### Группа 4: публикация и базовая фильтрация (5 тестов)

| # | Сценарий |
|---|---|
| UT-22 | `get_public_list`: не возвращает новости с `published_at > now()` |
| UT-23 | `get_public_list`: возвращает новости с `published_at <= now()` |
| UT-24 | `get_cms_list`: возвращает новости с `published_at` в будущем (фильтр не применён) |
| UT-25 | `get_cms_list`: sort=`-published_at` — последние публикации первыми |
| UT-26 | `get_cms_list`: пагинация (limit, offset) корректна |

#### Группа 5: текстовый поиск (8 тестов)

| # | Сценарий |
|---|---|
| UT-27 | `get_cms_list`: `name="конюшня"` → repository вызывается с `name ~* 'конюшня'` |
| UT-28 | `get_cms_list`: `name="КОНЮШНЯ"` → то же условие, поиск регистронезависимый |
| UT-29 | `get_cms_list`: `name="конюшня"` → записи без совпадения в name не возвращаются |
| UT-30 | `get_cms_list`: `snippet="анонс"` → repository вызывается с `snippet ~* 'анонс'` |
| UT-31 | `get_cms_list`: `content="подробности"` → repository вызывается с `content ~* 'подробности'` |
| UT-32 | `get_cms_list`: `name=None` → условие по name не добавляется |
| UT-33 | `get_cms_list`: `name="test.com"` → спецсимволы регулярки экранируются через `re.escape` |
| UT-34 | `get_cms_list`: `name="new"` + `status=[PUBLISHED]` → комбинированная фильтрация |

#### Группа 6: фильтрация по дате и статусу (8 тестов)

| # | Сценарий |
|---|---|
| UT-35 | `get_cms_list`: `published_at_from=T` → записи с `published_at < T` не возвращаются |
| UT-36 | `get_cms_list`: `published_at_to=T` → записи с `published_at > T` не возвращаются |
| UT-37 | `get_cms_list`: `published_at_from + published_at_to` → только диапазон |
| UT-38 | `get_cms_list`: `status=[PUBLISHED]` → только опубликованные |
| UT-39 | `get_cms_list`: `status=[SCHEDULED]` → только запланированные |
| UT-40 | `get_cms_list`: `status=[DELETED]` → только удалённые |
| UT-41 | `get_cms_list`: `status=[PUBLISHED, SCHEDULED]` → опубликованные И запланированные (OR) |
| UT-42 | `get_cms_list`: `sort=status` → сортировка по CASE WHEN expression ASC |

#### Группа 7: права доступа и CRUD (8 тестов)

| # | Сценарий |
|---|---|
| UT-43 | `create`: пользователь ADMIN → успех |
| UT-44 | `create`: пользователь без admin-роли → ClientError |
| UT-45 | `create`: user=None → ClientError |
| UT-46 | `update`: несуществующий id → ClientError |
| UT-47 | `update`: partial update — незатронутые поля не меняются |
| UT-48 | `update_photos`: main_photo_id не входит в photo_ids → ClientError |
| UT-49 | `update_photos`: photo_id не принадлежит текущей конюшне → ClientError |
| UT-50 | `get_public_list`: ответ NewsPublicOutDto не содержит `content`, `is_deleted`, `deleted_at` |

### Smoke-тесты backend-фичи News

Выполняются через скилл `api-smoke-test` на живом API.

| # | Endpoint | Auth | HTTP | Сценарий |
|---|---|---|---|---|
| SM-01 | `GET /api/news-cms` | без auth | 401 | Исключение: CMS GET защищён |
| SM-02 | `GET /api/news-cms` | auth (admin) | 200 | CMS видит все новости |
| SM-03 | `GET /api/news-cms` | auth (без прав) | 403 | Недостаточно прав |
| SM-04 | `GET /api/news-cms?sort=-published_at` | auth (admin) | 200 | Сортировка по дате DESC |
| SM-05 | `GET /api/news-cms?sort=name` | auth (admin) | 200 | Сортировка по name ASC |
| SM-06 | `GET /api/news-cms?sort=status` | auth (admin) | 200 | Сортировка по статусу ASC |
| SM-07 | `GET /api/news-cms?name=опубл` | auth (admin) | 200 | Текстовый поиск по name |
| SM-08 | `GET /api/news-cms?name=ОПУБЛ` | auth (admin) | 200 | Поиск регистронезависим: те же записи |
| SM-09 | `GET /api/news-cms?snippet=анонс` | auth (admin) | 200 | Текстовый поиск по snippet |
| SM-10 | `GET /api/news-cms?content=подробн` | auth (admin) | 200 | Текстовый поиск по content |
| SM-11 | `GET /api/news-cms?published_at_from=2026-01-01T00:00:00Z` | auth (admin) | 200 | Фильтр от даты |
| SM-12 | `GET /api/news-cms?published_at_to=2026-12-31T23:59:59Z` | auth (admin) | 200 | Фильтр до даты |
| SM-13 | `GET /api/news-cms?status=published` | auth (admin) | 200 | Только опубликованные |
| SM-14 | `GET /api/news-cms?status=scheduled` | auth (admin) | 200 | Только запланированные |
| SM-15 | `GET /api/news-cms?status=deleted` | auth (admin) | 200 | Только удалённые |
| SM-16 | `GET /api/news-cms?status=published&status=scheduled` | auth (admin) | 200 | Несколько статусов |
| SM-17 | `GET /api/news-cms?name=тест&status=published` | auth (admin) | 200 | Комбинация фильтров |
| SM-18 | `GET /api/news` | без service_key | 400 | Нет ключа сервиса |
| SM-19 | `GET /api/news` | service_key | 200 | Только опубликованные и не удалённые |
| SM-20 | `GET /api/news` | service_key | 200 | Нет будущих новостей в ответе |
| SM-21 | `GET /api/news` | service_key | 200 | Нет удалённых в ответе |
| SM-22 | `GET /api/news/{id}` | service_key | 200 | Существующая опубликованная |
| SM-23 | `GET /api/news/{id}` (удалённая) | service_key | 404 | Soft-deleted → не доступна |
| SM-24 | `POST /api/news` | без auth | 401 | Защищённый endpoint |
| SM-25 | `POST /api/news` | auth (admin) | 201 | Создание с автогенерацией snippet |
| SM-26 | `POST /api/news` | auth (admin) | 201 | Создание с явным snippet |
| SM-27 | `POST /api/news` | auth (admin) | 201 | `published_at` в будущем (запланированная) |
| SM-28 | `POST /api/news` | auth (admin) | 400 | name пустой |
| SM-29 | `POST /api/news` | auth (admin) | 400 | name > 63 символа |
| SM-30 | `POST /api/news` | auth (admin) | 400 | content с `<script>` |
| SM-31 | `POST /api/news` | auth (admin) | 400 | content с `javascript:` |
| SM-32 | `POST /api/news` | auth (admin) | 201 | корректный HTML в content |
| SM-33 | `PATCH /api/news/{id}` | без auth | 401 | Защищённый endpoint |
| SM-34 | `PATCH /api/news/{id}` | auth (admin) | 200 | Обновление name |
| SM-35 | `DELETE /api/news/{id}` | без auth | 401 | Защищённый endpoint |
| SM-36 | `DELETE /api/news/{id}` | auth (admin) | 204 | Soft delete успешен |
| SM-37 | `GET /api/news` после DELETE | service_key | 200 | Список не содержит удалённую |
| SM-38 | `GET /api/news-cms?status=deleted` после DELETE | auth (admin) | 200 | CMS видит с is_deleted=true |
| SM-39 | `POST /api/news/{id}/photos` | без auth | 401 | Защищённый endpoint |
| SM-40 | `POST /api/news/{id}/photos` | auth (admin) | 204 | Корректные photo_ids |
| SM-41 | `POST /api/news/{id}/photos` | auth (admin) | 400 | main_photo_id не в photo_ids |
| SM-42 | `GET /api/news` | service_key | 200 | NewsPublicOutDto без `content`, `is_deleted`, `deleted_at` |
| SM-43 | `GET /api/news-cms` | auth (admin) | 200 | NewsOutDto содержит `content`, `is_deleted`, `deleted_at` |
| SM-44 | `GET /api/news-cms?name=test.com` | auth (admin) | 200 | Спецсимволы в поиске не вызывают 500 |

---

## Чеклист

### Backend

- [x] Добавить `soft_delete_columns()` в `services/backend/src/models/mixins.py`
- [x] Добавить `SoftDeleteMixin` в `services/backend/src/core/entities/base.py`
- [x] Создать `services/backend/src/models/news.py` — таблицы `news`, `news_photos` с индексами
- [x] Добавить import `news` в `services/backend/src/models/__init__.py`
- [x] Создать `services/backend/src/core/entities/news.py` — `News`, `NewsPhoto`, `NewsStatus`, `NewsSortField`
- [x] Создать `services/backend/src/core/schemas/news.py` — `NewsCreateInDto`, `NewsUpdateInDto`, `NewsOutDto`, `NewsPublicOutDto`, `NewsPhotosUpdateDto`, `NewsCmsFilterDto`
- [x] Создать `services/backend/src/core/protocols/repositories/news_repository.py` — `NewsRepositoryProtocol`
- [x] Добавить `NewsRepositoryProtocol` в `services/backend/src/core/protocols/repositories/__init__.py`
- [x] Создать `services/backend/src/repositories/news_repository.py` — `NewsRepository` с text search через `column.op("~*")(re.escape(term))`
- [x] Добавить `NewsRepository` в `services/backend/src/repositories/__init__.py`
- [x] Создать `services/backend/src/core/services/news.py` — `NewsService` со snippet-автогенерацией, HTML-валидацией, soft delete, правами
- [x] Добавить `get_news_repository` в `services/backend/src/depends/repositories.py`
- [x] Добавить `get_news_service` в `services/backend/src/depends/services.py`
- [x] Создать `services/backend/src/api/news.py` — 7 endpoint'ов: `GET /api/news-cms`, `GET /api/news`, `GET /api/news/{id}`, `POST`, `PATCH`, `DELETE`, `POST /photos`
- [x] Добавить `news_router` в `services/backend/src/api/__init__.py`
- [x] Зарегистрировать `news_router` в `services/backend/src/main.py`
- [x] Заполнить Access matrix: `GET /api/news-cms` — Protected GET exception, причина зафиксирована
- [x] Создать миграцию Alembic `down_revision = "b3e7a2f91c04"` для таблиц `news` и `news_photos`
- [x] Применить миграцию: `make migrate`
- [x] Найти PostgreSQL контейнер по labels `com.docker.compose.project=eqsitecms` + `com.docker.compose.service=db`, получить DB env/host port через `docker inspect`
- [x] Unit: News — create: snippet=None + HTML content → snippet автогенерируется как plain text
- [x] Unit: News — create: snippet задан явно → используется без изменений
- [x] Unit: News — create: snippet=None + content пустой → snippet остаётся None
- [x] Unit: News — create: content с HTML-тегами → теги удаляются из snippet
- [x] Unit: News — create: content > 255 символов → snippet обрезается до 255
- [x] Unit: News — update: snippet=None в patch → snippet перегенерируется из нового content
- [x] Unit: News — update: snippet задан явно → используется без изменений
- [x] Unit: News — _strip_html_to_text: множественные пробелы нормализуются
- [x] Unit: News — create: name пустой → ClientError
- [x] Unit: News — create: name > 63 символов → ClientError
- [x] Unit: News — create: snippet > 255 символов → ClientError
- [x] Unit: News — create: snippet пустая строка → ClientError
- [x] Unit: News — create: content с `<script>` → ClientError
- [x] Unit: News — create: content с `javascript:` → ClientError
- [x] Unit: News — create: content с `onerror=` → ClientError
- [x] Unit: News — create: корректный HTML без JS → успех
- [x] Unit: News — soft_delete: устанавливает is_deleted=True и deleted_at != None
- [x] Unit: News — soft_delete: несуществующий id → ClientError
- [x] Unit: News — get_cms_list: status=[PUBLISHED,SCHEDULED] → удалённые не возвращаются
- [x] Unit: News — get_public_list: никогда не возвращает удалённые
- [x] Unit: News — get_public_list: не возвращает published_at > now()
- [x] Unit: News — get_public_list: возвращает published_at <= now()
- [x] Unit: News — get_cms_list: возвращает опубликованные в будущем
- [x] Unit: News — get_cms_list: sort=-published_at — последние публикации первыми
- [x] Unit: News — get_cms_list: пагинация (limit, offset) корректна
- [x] Unit: News — get_cms_list: name="конюшня" → repository вызван с условием ~*
- [x] Unit: News — get_cms_list: name="КОНЮШНЯ" → регистронезависимо, то же условие
- [x] Unit: News — get_cms_list: name=None → условие по name не добавляется
- [x] Unit: News — get_cms_list: snippet="анонс" → repository вызван с условием ~*
- [x] Unit: News — get_cms_list: content="подробн" → repository вызван с условием ~*
- [x] Unit: News — get_cms_list: name="test.com" → спецсимволы экранированы через re.escape
- [x] Unit: News — get_cms_list: name + status → комбинированная фильтрация
- [x] Unit: News — get_cms_list: published_at_from фильтрует записи до даты
- [x] Unit: News — get_cms_list: published_at_to фильтрует записи после даты
- [x] Unit: News — get_cms_list: published_at_from + to → только диапазон
- [x] Unit: News — get_cms_list: status=[PUBLISHED] → только опубликованные
- [x] Unit: News — get_cms_list: status=[SCHEDULED] → только запланированные
- [x] Unit: News — get_cms_list: status=[DELETED] → только удалённые
- [x] Unit: News — get_cms_list: status=[PUBLISHED, SCHEDULED] → OR-условие
- [x] Unit: News — get_cms_list: sort=status → сортировка по CASE WHEN ASC
- [x] Unit: News — create: ADMIN → успех
- [x] Unit: News — create: пользователь без admin-роли → ClientError
- [x] Unit: News — create: user=None → ClientError
- [x] Unit: News — update: несуществующий id → ClientError
- [x] Unit: News — update: partial update — незатронутые поля не меняются
- [x] Unit: News — update_photos: main_photo_id не в photo_ids → ClientError
- [x] Unit: News — update_photos: photo_id не из этой конюшни → ClientError
- [x] Unit: News — get_public_list: ответ не содержит content/is_deleted/deleted_at
- [x] Smoke: News — миграции применены на реальной PostgreSQL
- [x] Smoke: News — GET /api/news-cms без auth → 401
- [x] Smoke: News — GET /api/news-cms с auth (admin) → 200
- [x] Smoke: News — GET /api/news-cms с auth (без прав) → 403
- [x] Smoke: News — GET /api/news-cms?sort=-published_at → порядок DESC
- [x] Smoke: News — GET /api/news-cms?sort=name → порядок ASC
- [x] Smoke: News — GET /api/news-cms?sort=status → порядок по CASE WHEN
- [x] Smoke: News — GET /api/news-cms?name=подстрока → только совпадающие записи
- [x] Smoke: News — GET /api/news-cms?name=ПОДСТРОКА → те же записи (регистронезависимо)
- [x] Smoke: News — GET /api/news-cms?snippet=анонс → поиск по сниппету
- [x] Smoke: News — GET /api/news-cms?content=подробн → поиск по содержимому
- [x] Smoke: News — GET /api/news-cms?published_at_from=... → фильтр от даты
- [x] Smoke: News — GET /api/news-cms?published_at_to=... → фильтр до даты
- [x] Smoke: News — GET /api/news-cms?status=published → только опубликованные
- [x] Smoke: News — GET /api/news-cms?status=scheduled → только запланированные
- [x] Smoke: News — GET /api/news-cms?status=deleted → только удалённые
- [x] Smoke: News — GET /api/news-cms?status=published&status=scheduled → OR
- [x] Smoke: News — GET /api/news-cms?name=тест&status=published → комбинация
- [x] Smoke: News — GET /api/news-cms?name=test.com → не вызывает 500 (спецсимволы)
- [x] Smoke: News — GET /api/news без service_key → 400
- [x] Smoke: News — GET /api/news с service_key → 200 (только опубликованные)
- [x] Smoke: News — GET /api/news не содержит published_at > now()
- [x] Smoke: News — GET /api/news не содержит is_deleted=true
- [x] Smoke: News — GET /api/news/{id} с service_key → 200 для опубликованной
- [x] Smoke: News — GET /api/news/{id} для soft-deleted → 404
- [x] Smoke: News — POST /api/news без auth → 401
- [x] Smoke: News — POST /api/news с auth → 201 (autosnippet)
- [x] Smoke: News — POST /api/news с явным snippet → 201
- [x] Smoke: News — POST /api/news с published_at в будущем → 201
- [x] Smoke: News — POST /api/news с пустым name → 400
- [x] Smoke: News — POST /api/news с `<script>` в content → 400
- [x] Smoke: News — PATCH /api/news/{id} без auth → 401
- [x] Smoke: News — PATCH /api/news/{id} с auth → 200
- [x] Smoke: News — DELETE /api/news/{id} без auth → 401
- [x] Smoke: News — DELETE /api/news/{id} с auth → 204 (soft delete)
- [x] Smoke: News — GET /api/news после DELETE не содержит удалённую
- [x] Smoke: News — GET /api/news-cms?status=deleted после DELETE содержит is_deleted=true
- [x] Smoke: News — POST /api/news/{id}/photos без auth → 401
- [x] Smoke: News — POST /api/news/{id}/photos с корректными photo_ids → 204
- [x] Smoke: News — POST /api/news/{id}/photos main не в photo_ids → 400
- [x] Smoke: News — GET /api/news → NewsPublicOutDto без content/is_deleted/deleted_at
- [x] Smoke: News — GET /api/news-cms → NewsOutDto содержит content/is_deleted/deleted_at
- [x] `make format` — чисто
- [x] `make test` — все тесты зелёные
- [x] `make lint` — чисто

### Frontend

- [x] Создать `services/frontend/src/types/api/news.ts` — `NewsOutDto`, `NewsPublicOutDto`, `NewsCreateInDto`, `NewsUpdateInDto`, `NewsCmsQueryParams`, `NewsStatus`
- [x] Создать `services/frontend/src/api/news.ts` — `newsCmsList` (→ `/api/news-cms`), `newsCreate`, `newsUpdate`, `newsDelete`, `newsDetail`, `newsPhotosUpdate`
- [x] Создать `services/frontend/src/features/pageEditor/services/newsPageDataService.ts` — `createFetchNewsPageData` (factory, читает content из CMS-списка), `saveNewsPageData`
- [x] Создать `services/frontend/src/features/news/validators/news.ts` — Zod-схемы
- [x] Создать `services/frontend/src/features/news/services/newsService.ts`
- [x] Создать `services/frontend/src/features/news/hooks/useNews.ts` — с состоянием фильтров (name, snippet, published_at_from, published_at_to, status[])
- [x] Создать `services/frontend/src/features/news/hooks/useNewsScopes.ts` — `NEWS_PAGE_SCOPES_ACTIONS` enum, `newsPageScopesRegistry` (SEE_ADMIN_INSTRUCTIONS: [SUPERUSER, ADMIN]; SEE_DEVELOPER_DOCS: [SUPERUSER, DEVELOPER]), `useNewsPageActionScopes` hook
- [x] Создать `services/frontend/src/features/news/ui/NewsTabs.tsx` — `NewsTabsEnum` (NEWS | ADMIN_DOCS | DEVELOPER_DOCS), условное добавление вкладок по `hasPermission`
- [x] Создать `services/frontend/src/features/news/ui/NewsTable.tsx` — колонки с inline-фильтрами: Input.Search для name/snippet, DatePicker.RangePicker для published_at, Select multiple для status
- [x] Создать `services/frontend/src/features/news/ui/NewsModal.tsx` — поля: name, snippet (optional), published_at (DatePicker showTime), content (PageEditorModal), photos
- [x] Создать `services/frontend/src/features/news/ui/NewsAdminDocumentationView.tsx` — 6 разделов инструкции для администратора, рендерит `NewsTabs` в шапке
- [x] Создать `services/frontend/src/features/news/ui/NewsDeveloperDocumentationView.tsx` — 7 разделов API-документации для разработчика, рендерит `NewsTabs` в шапке
- [x] Создать `services/frontend/src/app/(protected)/news/page.tsx` — рендер NewsTable при NEWS, NewsAdminDocumentationView при ADMIN_DOCS, NewsDeveloperDocumentationView при DEVELOPER_DOCS
- [x] Обновить `services/frontend/src/app/(protected)/layout.tsx` — добавить "Новости" в menu, pageTitles, getActiveKey()
- [x] `npm run lint` в `services/frontend` — чисто
- [x] TypeScript typecheck (`npx tsc --noEmit`) — 0 ошибок

### Quality Gate

- [x] Проверить Access matrix: `GET /api/news-cms` защищён, причина зафиксирована
- [x] Тест: `GET /api/news-cms` без auth → 401
- [x] Тест: `GET /api/news-cms` с auth без прав → 403
- [x] Тест: `GET /api/news` без service_key → 400
- [x] Тест: `GET /api/news` → только published_at <= now() AND is_deleted=false
- [x] Проверить text search: `name`, `snippet`, `content` используют `~*` с `re.escape` (не ILIKE, не LIKE)
- [x] Проверить `GET /api/news-cms?name=test.com` не вызывает 500 (экранирование спецсимволов)
- [x] Проверить `GET /api/news-cms?name=ПОДСТРОКА` возвращает те же записи что и нижний регистр
- [x] Проверить status-фильтры: PUBLISHED / SCHEDULED / DELETED / комбинации
- [x] Проверить sort=status: CASE WHEN expression без SQL-ошибок
- [x] SoftDeleteMixin корректно применён в News entity (is_deleted, deleted_at)
- [x] Snippet автогенерируется из content как plain text, max 255 символов
- [x] HTML-валидация content через `validate_no_js_in_html` — JS в content даёт 400
- [x] Soft delete: DELETE ставит is_deleted=True, deleted_at=now(), физически не удаляет
- [x] NewsPublicOutDto не содержит content, is_deleted, deleted_at
- [x] NewsOutDto содержит content, is_deleted, deleted_at
- [x] Frontend: статус "Удалено" отображается красным тегом
- [x] Frontend: snippet в таблице обрезается до 32 символов с "..."
- [x] Frontend: `PageEditorModal` подключён через `newsPageDataService.ts`
- [x] Frontend: раздел "Новости" добавлен в главное меню
- [x] Frontend: `newsCmsList` вызывает `/api/news-cms`, не `/api/news`
- [x] Frontend: SUPERUSER видит обе вкладки "Инструкция" и "Документация"
- [x] Frontend: ADMIN видит только вкладку "Инструкция", не видит "Документация"
- [x] Frontend: DEVELOPER видит только вкладку "Документация", не видит "Инструкция"
- [x] Проверить что каждая backend-фича имеет минимум 30 Unit checklist-пунктов с разными сценариями
- [x] Проверить что каждая backend-фича имеет минимум 30 Smoke checklist-пунктов на реальной PostgreSQL
- [x] Проверить что smoke-тесты берут параметры PostgreSQL из `docker inspect`, без хардкода
- [x] Clean Architecture не нарушена: нет SQL в `core/services/`, нет импортов моделей в `core/entities/`
- [x] FSD не нарушен: нет бизнес-логики в компонентах, нет прямых fetch в компонентах
- [x] Убедиться что `make test` проходит
- [x] Smoke-тесты (≥30) выполнены через скилл `api-smoke-test`
