# Review: FEATURE-news

**Статус: ✅ APPROVED**
**Дата:** 2026-05-11

## Ссылки

- **План:** `docs/plans/feature/007_news.md`
- **Тикет:** FEATURE-news

---

## Краткое описание изменений

Реализован полный раздел «Новости» в EqSiteCMS:

- **Backend:** Новые таблицы `news` / `news_photos`, SQLAlchemy-модели, entity с `SoftDeleteMixin`, схемы (`NewsOutDto`, `NewsPublicOutDto`, `NewsCreateDto`, `NewsUpdateDto`, `NewsPhotosUpdateDto`), Protocol, Repository с text search через `~*` + `re.escape`, Service со snippet-автогенерацией / HTML-валидацией / soft delete / правами, DI, 7 endpoint'ов, Alembic-миграция, 50 unit-тестов.
- **Frontend:** Типы в `types/api/news.ts`, API-функции в `api/news.ts`, pageEditor adapter `newsPageDataService.ts` (factory pattern), Validators, Service, Hook (`useNews`), Scopes hook (`useNewsScopes`), UI-компоненты (`NewsTabs`, `NewsTable`, `NewsModal`, `NewsAdminDocumentationView`, `NewsDeveloperDocumentationView`), страница `/news`, обновлён `layout.tsx`.

---

## Изменённые файлы

### Backend
- `services/backend/src/models/mixins.py` (+ `soft_delete_columns()` уже в `utils/basemodel.py`)
- `services/backend/src/core/entities/base.py` (+ `SoftDeleteMixin`)
- `services/backend/src/models/news.py` (new)
- `services/backend/src/models/__init__.py`
- `services/backend/src/core/entities/news.py` (new)
- `services/backend/src/core/schemas/news.py` (new)
- `services/backend/src/core/protocols/repositories/news_repository.py` (new)
- `services/backend/src/core/protocols/repositories/__init__.py`
- `services/backend/src/repositories/news_repository.py` (new)
- `services/backend/src/repositories/__init__.py`
- `services/backend/src/core/services/news.py` (new)
- `services/backend/src/depends/repositories.py`
- `services/backend/src/depends/services.py`
- `services/backend/src/api/news.py` (new)
- `services/backend/src/api/__init__.py`
- `services/backend/src/main.py`
- `services/backend/src/migration/versions/e1a5f2b8c319_add_news_tables.py` (new)
- `services/backend/tests/unit/core/services/test_news_service.py` (new)

### Frontend
- `services/frontend/src/types/api/news.ts` (new)
- `services/frontend/src/api/news.ts` (new)
- `services/frontend/src/features/pageEditor/services/newsPageDataService.ts` (new)
- `services/frontend/src/features/news/validators/news.ts` (new)
- `services/frontend/src/features/news/services/newsService.ts` (new)
- `services/frontend/src/features/news/hooks/useNews.ts` (new)
- `services/frontend/src/features/news/hooks/useNewsScopes.ts` (new)
- `services/frontend/src/features/news/ui/NewsTabs.tsx` (new)
- `services/frontend/src/features/news/ui/NewsTable.tsx` (new)
- `services/frontend/src/features/news/ui/NewsModal.tsx` (new)
- `services/frontend/src/features/news/ui/NewsAdminDocumentationView.tsx` (new)
- `services/frontend/src/features/news/ui/NewsDeveloperDocumentationView.tsx` (new)
- `services/frontend/src/app/(protected)/news/page.tsx` (new)
- `services/frontend/src/app/(protected)/layout.tsx`

---

## Рекомендуемая ветка

`feature/news` → `main`

---

## Результаты тестов

### Unit / Integration

| Команда | Результат |
|---|---|
| `make format` | isort зафиксировал 1 правку в `news_repository.py` (порядок импортов) |
| `make test` | **462 passed, 5 skipped, 0 failed** |
| `make lint` | **Чисто** (mypy + flake8 + ruff) |
| `npx tsc --noEmit` | **0 errors** |
| `npm run lint` | **0 errors** (22 warnings в pre-existing файлах) |

Тест `test_news_service.py`: **50/50 passed**

---

## Access Verification Results

### Anonymous / Public checks

| Endpoint | Ожидаемый статус | Факт |
|---|---|---|
| `GET /api/news-cms` (без auth) | 401 | ✅ 401 |
| `GET /api/news` (без X-Equestrian-Service-Key) | 400 | ✅ 400 |
| `GET /api/news/{id}` (soft-deleted, с ключом) | 404 | ✅ 404 |
| `POST /api/news` (без auth) | 401 | ✅ 401 |
| `PATCH /api/news/{id}` (без auth) | 401 | ✅ 401 |
| `DELETE /api/news/{id}` (без auth) | 401 | ✅ 401 |
| `POST /api/news/{id}/photos` (без auth) | 401 | ✅ 401 |

### Authenticated / Protected checks

| Endpoint | Auth | Ожидаемый статус | Факт |
|---|---|---|---|
| `GET /api/news-cms` | admin | 200 | ✅ 200 |
| `GET /api/news-cms` | без прав (smoke_noscope_news) | 403 | ✅ 403 |
| `POST /api/news` | admin | 201 | ✅ 201 |
| `PATCH /api/news/{id}` | admin | 200 | ✅ 200 |
| `DELETE /api/news/{id}` | admin | 204 | ✅ 204 |
| `POST /api/news/{id}/photos` | admin | 204 | ✅ 204 |

### Исключения

| Endpoint | Класс | Причина |
|---|---|---|
| `GET /api/news-cms` | Protected GET (исключение) | Возвращает неопубликованные и удалённые записи — не должны быть публично доступны |

---

## SMOKE-тесты

| # | Endpoint | Method | Auth | Expected HTTP | Actual HTTP | Time | Результат |
|---|---|---|---|---|---|---|---|
| SM-01 | `/api/news-cms` | GET | без auth | 401 | 401 | 18 ms | ✅ |
| SM-02 | `/api/news-cms` | GET | admin | 200 | 200 | 39 ms | ✅ |
| SM-03 | `/api/news-cms` | GET | без прав | 403 | 403 | 35 ms | ✅ |
| SM-04 | `/api/news-cms?sort=-published_at` | GET | admin | 200 | 200 | 48 ms | ✅ |
| SM-05 | `/api/news-cms?sort=name` | GET | admin | 200 | 200 | 30 ms | ✅ |
| SM-06 | `/api/news-cms?sort=status` | GET | admin | 200 | 200 | 30 ms | ✅ |
| SM-07 | `/api/news-cms?name=опубл` | GET | admin | 200, match | 200, total=1 | 34 ms | ✅ |
| SM-08 | `/api/news-cms?name=ОПУБЛ` | GET | admin | 200, same as SM-07 | 200, total=1 | 39 ms | ✅ |
| SM-09 | `/api/news-cms?snippet=анонс` | GET | admin | 200 | 200, total=2 | 33 ms | ✅ |
| SM-10 | `/api/news-cms?content=подробн` | GET | admin | 200 | 200, total=2 | 33 ms | ✅ |
| SM-11 | `/api/news-cms?published_at_from=2026-01-01` | GET | admin | 200 | 200, total=8 | 31 ms | ✅ |
| SM-12 | `/api/news-cms?published_at_to=2026-12-31` | GET | admin | 200 | 200, total=6 | 29 ms | ✅ |
| SM-13 | `/api/news-cms?status=published` | GET | admin | 200 | 200, total=5 | 40 ms | ✅ |
| SM-14 | `/api/news-cms?status=scheduled` | GET | admin | 200 | 200, total=2 | 27 ms | ✅ |
| SM-15 | `/api/news-cms?status=deleted` | GET | admin | 200 | 200, total=1 | 24 ms | ✅ |
| SM-16 | `/api/news-cms?status=published&status=scheduled` | GET | admin | 200 | 200, total=7 | 58 ms | ✅ |
| SM-17 | `/api/news-cms?name=тест&status=published` | GET | admin | 200 | 200, total=0 | 28 ms | ✅ |
| SM-18 | `/api/news` | GET | без ключа | 400 | 400 | 2 ms | ✅ |
| SM-19 | `/api/news` | GET | service_key | 200 | 200, total=5 | 30 ms | ✅ |
| SM-20 | `/api/news` | GET | service_key | нет future | future_count=0 | 24 ms | ✅ |
| SM-21 | `/api/news` | GET | service_key | нет is_deleted | is_deleted field absent | 24 ms | ✅ |
| SM-22 | `/api/news/{id}` | GET | service_key | 200 | 200 | 26 ms | ✅ |
| SM-23 | `/api/news/{id}` (soft-deleted) | GET | service_key | 404 | 404 | 24 ms | ✅ |
| SM-24 | `/api/news` | POST | без auth | 401 | 401 | 2 ms | ✅ |
| SM-25 | `/api/news` | POST | admin | 201, autosnippet | 201, snippet='Содержимое для автогенерации сниппета' | 30 ms | ✅ |
| SM-26 | `/api/news` | POST | admin | 201, explicit snippet | 201, snippet='Мой явный сниппет' | 38 ms | ✅ |
| SM-27 | `/api/news` | POST | admin | 201, future published_at | 201, published_at=2030-06-01T10:00:00+00:00 | 28 ms | ✅ |
| SM-28 | `/api/news` (empty name) | POST | admin | 400 | 400 | 24 ms | ✅ |
| SM-29 | `/api/news` (name > 63) | POST | admin | 400 | 400 | 31 ms | ✅ |
| SM-30 | `/api/news` (script in content) | POST | admin | 400 | 400 | 29 ms | ✅ |
| SM-31 | `/api/news` (javascript: in content) | POST | admin | 400 | 400 | 24 ms | ✅ |
| SM-32 | `/api/news` (valid HTML) | POST | admin | 201 | 201 | 23 ms | ✅ |
| SM-33 | `/api/news/{id}` | PATCH | без auth | 401 | 401 | 3 ms | ✅ |
| SM-34 | `/api/news/{id}` | PATCH | admin | 200, updated | 200, name updated | 29 ms | ✅ |
| SM-35 | `/api/news/{id}` | DELETE | без auth | 401 | 401 | 2 ms | ✅ |
| SM-36 | `/api/news/{id}` | DELETE | admin | 204 soft-delete | 204 | 25 ms | ✅ |
| SM-37 | `/api/news` after DELETE | GET | service_key | deleted not in list | not in list | 26 ms | ✅ |
| SM-38 | `/api/news-cms?status=deleted` after DELETE | GET | admin | is_deleted=true in CMS | found with is_deleted=True | 23 ms | ✅ |
| SM-39 | `/api/news/{id}/photos` | POST | без auth | 401 | 401 | 2 ms | ✅ |
| SM-40 | `/api/news/{id}/photos` | POST | admin | 204 | 204 | 23 ms | ✅ |
| SM-41 | `/api/news/{id}/photos` (main not in ids) | POST | admin | 400 | 400 | 25 ms | ✅ |
| SM-42 | `/api/news` | GET | service_key | no content/is_deleted/deleted_at | all 3 absent | 24 ms | ✅ |
| SM-43 | `/api/news-cms` | GET | admin | has content/is_deleted/deleted_at | all 3 present | 25 ms | ✅ |
| SM-44 | `/api/news-cms?name=test.com` | GET | admin | 200 (no 500) | 200 | 30 ms | ✅ |

**Итог SMOKE: 44/44 тестов прошли**

---

## Замечания

1. `make format` (`isort`) зафиксировал правку в `repositories/news_repository.py` — файл был не отформатирован. **Исправлено** форматтером in-place. Необходимо включить в коммит.

Все остальные проверки чисты.

---

Готово к merge.
