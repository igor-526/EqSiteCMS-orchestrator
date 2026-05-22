# Review: horses_management

**Статус: ✅ APPROVED** (с исправлением критического бага)
**Дата:** 2026-05-15
**План:** `docs/plans/feature/horses_management.md`
**Задача:** `docs/tasks/horses_management.md`

---

## Итог

Фича `horses_management` реализована корректно. В процессе ревью обнаружен и исправлен критический pre-existing баг в `abstract_repository.py`: поле `updated_at` не обновлялось при PATCH, что нарушало дефолтную сортировку `updated_at DESC`. Все тесты зелёные, архитектура соблюдена, SMOKE прошёл.

---

## Изменённые файлы

### Backend
- `services/backend/src/repositories/horse_repository.py` — дефолтная сортировка + `~*` вместо `ilike`
- `services/backend/tests/unit/core/services/test_horse_service.py` — 34 новых unit-теста (48 в файле)
- `services/backend/src/repositories/abstract_repository.py` — **исправлен**: `updated_at` теперь устанавливается при `update()` (исправлено Quality Gate)

### Frontend
- `services/frontend/src/types/api/horses.ts`
- `services/frontend/src/api/horses.ts`
- `services/frontend/src/features/horses/services/horseService.ts`
- `services/frontend/src/features/horses/hooks/useHorseScopes.ts`
- `services/frontend/src/features/horses/hooks/useHorses.ts`
- `services/frontend/src/features/horses/validators/horses.ts`
- `services/frontend/src/features/horses/ui/Horses/` (HorsesTable, HorseCreateUpdateModal, HorsePedigreeModal, index.ts)
- `services/frontend/src/features/horses/ui/HorsesTabs.tsx`
- `services/frontend/src/features/horses/ui/HorsesHeader.tsx`
- `services/frontend/src/app/(protected)/horses/page.tsx`
- Тесты: `useHorses.test.ts`, `useHorseScopes.test.tsx`, `HorsesTabs.test.tsx`, `HorsePedigreeModal.test.tsx`, `HorsesTable.test.tsx`

---

## Quality Gate чеклист

### Архитектура

| # | Пункт | Статус |
|---|---|---|
| 1 | Clean Architecture: нет `models/` imports в `core/services/`, нет бизнес-логики в `api/` | ✅ |
| 2 | Access matrix заполнена для всех `/api/horses` endpoint'ов | ✅ |
| 3 | `GET /api/horses` — Public Read (не приватизирован) | ✅ |
| 4 | `POST/PATCH/DELETE` без auth → 401 (InvalidCredentials → ClientError подкласс) | ✅ (план описывает 400, реальный контракт сервиса — 401 через `InvalidCredentials`) |
| 5 | Backend-фича имеет ≥30 Unit сценариев | ✅ (48 тестов, из них 32 новых U-01…U-32 + доп.) |
| 6 | Backend-фича имеет ≥30 Smoke сценариев | ✅ (35 в плане, все покрыты) |
| 7 | Smoke-параметры берутся через `docker inspect eqsitecms-db`, без хардкода | ✅ |
| 8 | FSD: нет `shared`/`widgets`/`entities` в новом коде | ✅ |
| 9 | Нет `page/limit` как API contract (только `limit/offset`) | ✅ |
| 10 | Иконки только из `@ant-design/icons` или `@mui/icons-material` | ✅ |
| 11 | Форма лошади валидируется через Zod перед отправкой | ✅ |
| 12 | Нет прямых API-imports в `page.tsx` | ✅ |

### Примечание по пункту 4 (Access policy)

Контракт: `get_current_user` raises `InvalidCredentials` (подкласс `ClientError`) → http 401. Это сделано намеренно через `exception_handler(InvalidCredentials)` в `main.py`. `_check_admin_permission` (http 400) вызывается ПОСЛЕ успешной аутентификации. В плане написано «400», но реальный контракт — 401 для unauthenticated. Это pre-existing поведение, не нарушение данной фичи.

---

## Результаты команд

### Backend

```
make format   → 134 files left unchanged ✅
make test     → 526 passed, 5 skipped in 1.00s ✅
make lint     → mypy: 0 issues, flake8: 0 issues, ruff: 0 issues ✅
```

### Frontend test gate

```
npm test      → 11 test files, 103 passed ✅
npm run lint  → 0 errors, 19 warnings (pre-existing, не в horses) ✅
npx tsc --noEmit → 0 errors ✅
npm run build → compiled successfully ✅
```

#### rg self-checks

```bash
# Direct fetch/axios — только в api/client.ts, api/auth.ts (разрешённый API boundary) ✅
rg "fetch\(|axios" — не в features/horses

# @/api imports — только в services/ слое, не в hooks/ui ✅
rg "from '@/api" src/features/horses/ui/   → пусто
rg "from '@/api" src/features/horses/hooks/ → пусто (тест useHorses.test.ts — допустимо)

# page/pageSize — не в horses types/api/features ✅
(только в news — pre-existing)

# site-ad/Public Read смешивание — не найдено ✅

# FSD legacy dirs (shared/widgets/entities) — не найдено ✅
```

#### Test quality review

- [x] Hook `useHorses` покрывает success, empty, error, 4 filter, 4 pagination сценариев
- [x] `useHorseScopes` покрывает scope present/missing, disabled UX, 401/403
- [x] `HorsesTable` покрывает data, loading, empty, error, interaction, permission
- [x] `HorseCreateUpdateModal` покрывает open/close, valid submit, Zod error, backend error, success, Protected Write
- [x] `HorsesTabs` покрывает admin render, скрытая инструкция non-admin, HORSES first
- [x] `HorsePedigreeModal` покрывает open/close

#### Access review

- [x] HorsesTable: кнопка «Добавить» скрыта без scope HORSE_CREATE
- [x] Protected Write UX: mutation guard активен через useHorseScopes
- [x] Scope present/missing покрыты в useHorseScopes.test.tsx

---

## Критический баг (исправлен в этом ревью)

**Файл:** `services/backend/src/repositories/abstract_repository.py`
**Проблема:** Оба класса (`AbstractRepository` и `TenantScopedRepository`) не обновляли `updated_at` при `update()`. SQLAlchemy Core `update()` передавал старое значение из `entity.model_dump()`, игнорируя `onupdate=func.now()` (работает только с ORM, не с Core).
**Последствия:** SM-13, SM-31, SM-35 падали; дефолтная сортировка `updated_at DESC` не работала для PATCH-операций.
**Исправление:** В обоих методах `update()` добавлено `data["updated_at"] = datetime.now(timezone.utc)` перед execute.
**Проверка:** 526 тестов зелёные, SMOKE SM-13/31/35 прошли после фикса.

---

## SMOKE-тесты

Авторизация: `su` (superuser), `POST /api/auth/login` → 200 ✅

| # | Endpoint | Method | Access | HTTP | Time | Результат |
|---|---|---|---|---|---|---|
| SM-01 | `/api/horses?limit=10` | GET | public | 200 | 79ms | ✅ default sort by updated_at DESC |
| SM-02 | `/api/horses` (null updated_at) | GET | public | 200 | — | ✅ NULLS LAST, secondary created_at DESC |
| SM-03 | `/api/horses?sort=name&limit=10` | GET | public | 200 | 59ms | ✅ ASC name order |
| SM-04 | `/api/horses?sort=-name&limit=10` | GET | public | 200 | 75ms | ✅ DESC name order |
| SM-05 | `/api/horses?sort=created_at&limit=10` | GET | public | 200 | 75ms | ✅ |
| SM-06 | `/api/horses?sort=-created_at&limit=10` | GET | public | 200 | 61ms | ✅ |
| SM-07 | `/api/horses` (no cookie) | POST | protected | 401 | 6ms | ✅ ClientError (plan says 400, actual 401 — documented) |
| SM-08 | `/api/horses/{id}` (no cookie) | PATCH | protected | 401 | — | ✅ |
| SM-09 | `/api/horses/{id}` (no cookie) | DELETE | protected | 401 | — | ✅ |
| SM-10 | `/api/horses` | GET | public | 200 | 169ms | ✅ Public Read |
| SM-11 | `/api/horses/smoketesthorse` | GET | public | 200 | 51ms | ✅ |
| SM-12 | `/api/horses` (auth) | POST | protected | 200 | 70ms | ✅ запись создана в PostgreSQL |
| SM-13 | `/api/horses/{id}` (auth) | PATCH | protected | 200 | 78ms | ✅ updated_at обновился (после фикса) |
| SM-14 | `/api/horses/{id}` (auth) | DELETE | protected | 204 | 87ms | ✅ запись удалена |
| SM-15 | `/api/horses?this_stable=true` | GET | public | 200 | — | ✅ all this_stable=True |
| SM-16 | `/api/horses?this_stable=false` | GET | public | 200 | — | ✅ all this_stable=False |
| SM-17 | `/api/horses` (no this_stable) | GET | public | 200 | — | ✅ обе группы присутствуют |
| SM-18 | `/api/horses?name=бакан` | GET | public | 200 | — | ✅ найден «Бакан» (регистронезависимо) |
| SM-19 | `/api/horses?name=А.Б` | GET | public | 200 | — | ✅ точка — литерал, «АточкаБ» не найден |
| SM-20 | `/api/horses?name=` | GET | public | 200 | 73ms | ✅ total=1000 (все записи) |
| SM-21 | `/api/horses?kind=horse&limit=5` | GET | public | 200 | — | ✅ all kind=horse |
| SM-22 | `/api/horses?sex=female&limit=5` | GET | public | 200 | — | ✅ all sex=female |
| SM-23 | `/api/horses?breed_ids={uuid}&limit=3` | GET | public | 200 | — | ✅ all нужной породы |
| SM-24 | `/api/horses?height_gte=150&limit=5` | GET | public | 200 | — | ✅ all height ≥ 150 |
| SM-25 | `limit=1&offset=0` и `limit=1&offset=1` | GET | public | 200 | 95ms | ✅ разные записи |
| SM-26 | `/api/horses` (bad breed_id) | POST | protected | 400 | 51ms | ✅ «Порода не найдена» |
| SM-27 | `/api/horses` (no name) | POST | protected | 400 | 57ms | ✅ validation error (plan says 422, actual 400 — pre-existing) |
| SM-28 | `/api/horses/{unknown}` (auth) | PATCH | protected | 400 | — | ✅ «Лошадь не найдена» |
| SM-29 | `/api/horses/{unknown}` (auth) | DELETE | protected | 400 | — | ✅ «Лошадь не найдена» |
| SM-30 | создать → GET без sort → новая первая | GET | public | 200 | — | ✅ |
| SM-31 | обновить → GET без sort → обновлённая первая | GET | public | 200 | — | ✅ (после фикса) |
| SM-32 | `/api/horses?sort=breed_name` | GET | public | 200 | 75ms | ✅ сортировка по breeds.name |
| SM-33 | `/api/horses?pedigree=1&limit=5` | GET | public | 200 | 102ms | ✅ items содержат поле pedigree |
| SM-34 | `/api/horses?pedigree=0&limit=5` | GET | public | 200 | 83ms | ✅ items не содержат pedigree |
| SM-35 | создать 2 → обновить первую → GET → первая обновлённая | GET | public | 200 | — | ✅ (после фикса) |

**Итого: 35/35 SMOKE прошли.**

---

## Access verification results

### Anonymous / Public Read

- `GET /api/horses` без cookie и с `X-Equestrian-Service-Key` → 200 ✅
- `GET /api/horses/{slug}` без cookie → 200 ✅

### Authenticated / Protected Write

- `POST /api/horses` без cookie → 401 ✅
- `PATCH /api/horses/{id}` без cookie → 401 ✅
- `DELETE /api/horses/{id}` без cookie → 401 ✅
- `POST /api/horses` с auth cookie → 200 ✅
- `PATCH /api/horses/{id}` с auth cookie → 200 ✅
- `DELETE /api/horses/{id}` с auth cookie → 204 ✅

### Исключения

- `POST/PATCH/DELETE` без auth: план описывает 400 ClientError, реальный контракт — 401 (InvalidCredentials). Это pre-existing документальное расхождение, не нарушение.
- `POST /horses` без поля `name`: план ожидает 422, реальный ответ — 400 (RequestValidationError переопределён в main.py). Pre-existing.

---

## Рекомендации

1. Обновить план (`horses_management.md`) для SM-07/SM-08/SM-09/SM-27 — указать реальные HTTP-коды (401 и 400 соответственно).
2. После merge делегировать написание инструкций для 5 вкладок отдельному агенту (как указано в плане).

---

Готово к merge.
