# Review: horses_management (финальный QG)

**Статус: ✅ APPROVED**
**Дата:** 2026-05-15
**Ревьюер:** Quality Gate

---

## Итог

Diff соответствует плану. Все тесты зелёные, архитектура не нарушена. SMOKE-тесты прошли. Diff готов к мёрджу.

---

## Изменённые файлы

**Backend:**
- `services/backend/src/repositories/horse_repository.py` — исправлен `UUID(str(...))` паттерн, маппинг breed/coat_color через prefixed labels, сортировка `breed_name`→`breeds.c.short_name`, `coat_color_name`→`coat_color.c.short_name`, реализован `set_horse_photos`
- `services/backend/src/core/services/breeds.py` — авто-генерация `short_name` на create/update
- `services/backend/src/core/services/coat_color.py` — авто-генерация `short_name` на create/update
- `services/backend/src/core/services/horse.py` — метод `update_horse_photos`
- `services/backend/src/core/schemas/horses.py` — добавлен `HorsePhotosUpdateInDto`
- `services/backend/src/api/horses.py` — эндпоинт `POST /horses/{horse_id}/photos`

**Frontend:**
- `services/frontend/src/features/horses/ui/Horses/HorsesTable.tsx` — убран `fixed: 'right'` с Actions, удалена 3-я disabled кнопка
- `services/frontend/src/features/horses/ui/Horses/HorseCreateUpdateModal.tsx` — тёмно-серые заголовки секций, loading props для Масть/Владелец Select
- `services/frontend/src/app/(protected)/horses/page.tsx` — переданы loading states
- `services/frontend/src/features/horses/ui/HorsesUserDocumentationView.tsx` — полная перезапись Admin docs
- `services/frontend/src/features/horses/ui/HorsesDeveloperDocumentationView.tsx` — полная перезапись Developer docs

---

## Ссылка на план

`docs/plans/feature/horses_management.md`

---

## Архитектура Backend ✅

- [ ✅ ] `api/horses.py` не содержит бизнес-логики, SQL или ручного управления транзакциями
- [ ✅ ] `core/services/horse.py` зависит только от Protocol-контрактов из `core/protocols`, не от конкретных репозиториев
- [ ✅ ] `core/entities/` не импортирует `models/`, `repositories/`, `settings`, `api/`
- [ ✅ ] SQLAlchemy tables не импортированы в `core/services/` или `core/entities/`
- [ ✅ ] Depends-сборка: `session -> repository -> service` — `get_horse_service` корректно wires `photo_repository`
- [ ✅ ] `UUID(str(...))` паттерн применён единообразно во всех 11 точках horse_repository.py
- [ ✅ ] Sort mapping: `breed_name` → `breeds.c.short_name`, `coat_color_name` → `coat_color.c.short_name`
- [ ✅ ] Авто-генерация `short_name`: реализована в `breeds.py` и `coat_color.py` на create и update

---

## Access Policy ✅

| Endpoint | Метод | Access class | Зависимость |
|---|---|---|---|
| `/api/horses` | GET | Public Read | `get_read_equestrian_context` |
| `/api/horses/{slug}` | GET | Public Read | `get_read_equestrian_context` |
| `/api/horses` | POST | Protected Write | `get_current_user` + `get_protected_equestrian_context` |
| `/api/horses/{id}` | PATCH | Protected Write | `get_current_user` + `get_protected_equestrian_context` |
| `/api/horses/{id}` | DELETE | Protected Write | `get_current_user` + `get_protected_equestrian_context` |
| `/api/horses/{id}/photos` | POST | Protected Write | `get_current_user` (non-optional) + `get_protected_equestrian_context` |
| `/api/horses/{id}/pedigree` | POST | Protected Write | `get_current_user` + `get_protected_equestrian_context` |

Замечание: `update_horse_photos` в router объявлен как `current_user: Annotated[UserOutDto, Depends(get_current_user)]` (non-optional — строжайшая форма). Корректно.

---

## Тесты

### Backend
- `make format`: **чисто** — 135 файлов unchanged, 20 тест-файлов unchanged
- `make test`: **545 passed, 5 skipped, 0 failed** (1.00s)
- `make lint`: **чисто** — mypy success (135 source files), ruff all checks passed

Тесты `update_horse_photos` покрывают:
- U-33: success path — `set_horse_photos` вызывается на репозитории
- U-34: horse not found → `ClientError`
- U-35: unauthorized (user=None) → `ClientError`

---

## Frontend Test Gate ✅

Diff включает две части:
1. **Behavior fixes** (HorsesTable, HorseCreateUpdateModal, page.tsx loading props)
2. **Documentation rewrite** (HorsesUserDocumentationView, HorsesDeveloperDocumentationView — non-behavior)

### Команды

| Команда | Результат |
|---|---|
| `npm test` | 124 passed (12 test files), 0 failed |
| `npm run lint` | 0 errors, 19 warnings (pre-existing unused imports) |
| `npx tsc --noEmit` | чисто |
| `npm run build` | успешно — `/horses` 23.7 kB |

### Self-checks

```
rg -n "fetch\(|axios" services/frontend/src/features/horses -g '*.{ts,tsx}'
```
→ **пусто** — нет прямых fetch/axios в feature

```
rg -n "from '@/api'" services/frontend/src/features/horses/ui -g '*.{ts,tsx}'
```
→ **пусто** — API imports только в services layer, не в UI компонентах

```
rg -n "from '@/api'" services/frontend/src/app -g '*.{ts,tsx}'
```
→ только `auth` imports в `login/page.tsx` и `layout.tsx` — допустимо

- Документационные компоненты не содержат `fetch`, `axios`, `import @/api`, `import @/hooks`
- Нет `site-*` смешения в diff
- Нет legacy FSD dirs

### Test quality review

- Behavior diff (HorsesTable fixes, HorseCreateUpdateModal loading props) покрыт существующими тестами в `HorsesTable.test.tsx` и `HorseCreateUpdateModal.test.tsx`
- Documentation diff: non-behavior, только JSX/text — не требует поведенческих тестов

### Access verification

- Protected Write UX: кнопки Create/Update/Delete скрыты при отсутствии scope — подтверждено тестами `useHorseScopes.test.tsx`
- Anonymous redirect не затронут этим diff'ом (layout.tsx не изменялся)

---

## SMOKE-тесты

Авторизация: superuser (`su`), base_url: `http://localhost:8001`

| # | Endpoint | Method | Access | Режим | HTTP | Время | Результат |
|---|---|---|---|---|---|---|---|
| SM-01 | `/horses?limit=10` | GET | public | anonymous | 200 | 100ms | ✅ `updated_at` DESC OK |
| SM-03 | `/horses?sort=name` | GET | public | authenticated | 200 | 106ms | ✅ names ASC: Авир, Авэль... |
| SM-04 | `/horses?sort=-name` | GET | public | authenticated | 200 | 106ms | ✅ names DESC: Шатэль... |
| SM-07 | `/horses` POST | POST | protected | no-cookie | 401 | 31ms | ✅ 401 «Неверный логин или пароль» |
| SM-08 | `/horses/{id}` PATCH | PATCH | protected | no-cookie | 401 | 29ms | ✅ 401 |
| SM-09 | `/horses/{id}` DELETE | DELETE | protected | no-cookie | 401 | 29ms | ✅ 401 |
| SM-10 | `/horses` | GET | public | anonymous | 200 | ~30ms | ✅ Public Read OK |
| SM-12 | `/horses` POST | POST | protected | authenticated | 200 | 101ms | ✅ horse created (id returned) |
| SM-13 | `/horses/{id}` PATCH | PATCH | protected | authenticated | 200 | 114ms | ✅ name updated |
| SM-14 | `/horses/{id}` DELETE | DELETE | protected | authenticated | 204 | 90ms | ✅ 204 |
| SM-15 | `/horses?this_stable=true` | GET | public | authenticated | 200 | 106ms | ✅ all `this_stable=true` |
| SM-26 | `/horses` POST bad breed_id | POST | protected | authenticated | 400 | 94ms | ✅ «Порода не найдена» |
| SM-27 | `/horses` POST no name | POST | protected | authenticated | 400 | 87ms | ✅ 400 (проект маппит 422→400) |
| SM-28 | `/horses/{unknown}` PATCH | PATCH | protected | authenticated | 400 | 91ms | ✅ «Лошадь не найдена» |
| SM-29 | `/horses/{unknown}` DELETE | DELETE | protected | authenticated | 400 | 81ms | ✅ 400 «Лошадь не найдена» |
| SM-30 | Create → GET limit=1 | GET | public | authenticated | 200 | 112ms | ✅ новая запись первая |
| SM-31 | Update → GET limit=1 | GET | public | authenticated | 200 | 97ms | ✅ обновлённая запись первая |
| SM-32 | `/horses?sort=breed_name` | GET | public | authenticated | 200 | 102ms | ✅ сортировка по breeds.short_name |
| SM-33 | `/horses?pedigree=1` | GET | public | authenticated | 200 | 133ms | ✅ все items имеют поле pedigree |
| SM-34 | `/horses?pedigree=0` | GET | public | authenticated | 200 | 113ms | ✅ items не имеют поле pedigree |
| SM-A (NEW) | `/horses/{id}/photos` POST | POST | protected | no-cookie | 401 | 30ms | ✅ 401 Protected Write |
| SM-B (NEW) | `/horses/{id}/photos` POST | POST | protected | authenticated | 200 | 109ms | ✅ HorseOutDto, photos: [] |
| SM-C (NEW) | `/horses/{id}/photos` POST + real photo_id | POST | protected | authenticated | 200 | 109ms | ✅ photos: [1 photo], URL корректен |

**Итог SMOKE: 23/23 тестов прошли**

---

## Access Verification Results

### Anonymous (без cookie)

- `GET /horses` (с X-Equestrian-Service-Key: default-equestrian) → 200 ✅
- `POST /horses` без cookie → 401 ✅
- `PATCH /horses/{id}` без cookie → 401 ✅
- `DELETE /horses/{id}` без cookie → 401 ✅
- `POST /horses/{id}/photos` без cookie → 401 ✅

### Authenticated (с cookie superuser)

- `POST /horses` → 200 ✅
- `PATCH /horses/{id}` → 200 ✅
- `DELETE /horses/{id}` → 204 ✅
- `POST /horses/{id}/photos` → 200 HorseOutDto ✅

### Примечания

- Проект намеренно преобразует FastAPI `RequestValidationError` (422) в HTTP 400 через `main.py::validation_error_handler` — это глобальное решение предшествует данному diff'у. Plan SM-27 ожидал 422, реальный ответ 400 — поведение корректно для данного проекта.
- Для Public Read требуется заголовок `X-Equestrian-Service-Key` (CMS-tenant архитектура).

---

## Рекомендуемая ветка для мёрджа

`main`

Готово к merge.
