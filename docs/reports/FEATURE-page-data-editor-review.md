# Review: FEATURE-page-data-editor

**Статус: APPROVED**
**Дата:** 2026-05-08
**Ветка:** `feature/page-data-editor`

---

## Ссылки

- **План:** `docs/plans/feature/page_data_editor.md`
- **Задача:** `docs/tasks/page_data_editor.md`

---

## Краткое описание изменений

Фича добавляет HTML-редактор `page_data` для четырёх сущностей CMS: breeds, coat_colors, horse_services, prices.

**Backend:**
- Создана утилита `validate_no_js_in_html` в `core/utils/html_security.py` для проверки HTML на наличие `<script>`, `javascript:` URI и inline-обработчиков `on*=`
- Утилита интегрирована в `_validate_breed_data`, `_validate_coat_color_data`, `_validate_service_data`, `_validate_price_data` — вызывается строго после `_validate_optional_text`, что исключает ложные срабатывания на пустые значения
- Никаких изменений в API-схемах или роутерах не требовалось — поле `page_data` уже принималось; добавлена только бизнес-валидация в сервисном слое

**Frontend:**
- Создан `features/pageEditor/` с тремя модулями: `PageEditorModal.tsx`, `PageEditorToolbar.tsx`, `hooks/usePageEditor.ts`
- Редактор построен на TipTap (headless, SSR-safe через `immediatelyRender: false`)
- Четыре service-адаптера в `features/pageEditor/services/` оборачивают вызовы API
- Кнопки `Html5Outlined` активированы в 4 таблицах; `page_data` загружается только при открытии модала через `GET ?page_data=true`
- CSS для `.ProseMirror` добавлен в `globals.css`
- Автозакрытие модала реализовано через `handleSuccess` в `PageEditorModal`

---

## Изменённые файлы

### Backend

| Файл | Изменение |
|---|---|
| `services/backend/src/core/utils/html_security.py` | Новый файл: утилита `validate_no_js_in_html` |
| `services/backend/src/core/services/breeds.py` | Добавлен вызов `validate_no_js_in_html` в `_validate_breed_data` |
| `services/backend/src/core/services/coat_color.py` | Добавлен вызов `validate_no_js_in_html` в `_validate_coat_color_data` |
| `services/backend/src/core/services/horse_service.py` | Добавлен вызов `validate_no_js_in_html` в `_validate_service_data` |
| `services/backend/src/core/services/prices.py` | Добавлен вызов `validate_no_js_in_html` в `_validate_price_data` |
| `services/backend/tests/unit/core/services/test_page_data_security.py` | Новый файл: 32 unit-теста |

### Frontend

| Файл | Изменение |
|---|---|
| `services/frontend/src/features/pageEditor/ui/PageEditorModal.tsx` | Новый: модальный редактор TipTap |
| `services/frontend/src/features/pageEditor/ui/PageEditorToolbar.tsx` | Новый: панель инструментов |
| `services/frontend/src/features/pageEditor/hooks/usePageEditor.ts` | Новый: хук загрузки/сохранения |
| `services/frontend/src/features/pageEditor/services/breedPageDataService.ts` | Новый: адаптер для breeds |
| `services/frontend/src/features/pageEditor/services/coatColorPageDataService.ts` | Новый: адаптер для coat_colors |
| `services/frontend/src/features/pageEditor/services/horseServicePageDataService.ts` | Новый: адаптер для horse_services |
| `services/frontend/src/features/pageEditor/services/pricePageDataService.ts` | Новый: адаптер для prices |
| `services/frontend/src/app/(protected)/horses/page.tsx` | Подключены `PageEditorModal` для Breeds, CoatColors, HorseServices |
| `services/frontend/src/app/(protected)/prices/page.tsx` | Подключён `PageEditorModal` для Prices |
| `services/frontend/src/features/horses/ui/HorseBreeds/HorseBreedsTable.tsx` | Кнопка `Html5Outlined` активирована |
| `services/frontend/src/features/horses/ui/HorseCoatColors/HorseCoatColorsTable.tsx` | Кнопка `Html5Outlined` активирована |
| `services/frontend/src/features/horses/ui/HorseServices/HorseServicesTable.tsx` | Кнопка `Html5Outlined` активирована |
| `services/frontend/src/features/prices/ui/Price/PricesTable.tsx` | Кнопка `Html5Outlined` активирована |
| `services/frontend/src/app/globals.css` | Добавлен CSS для `.ProseMirror` |

---

## Архитектура: чеклист

### Backend

| Пункт | Статус | Примечание |
|---|---|---|
| `api/` без бизнес-логики и SQL | PASS | Нет изменений в роутерах |
| `core/services/` зависит от Protocol | PASS | `validate_no_js_in_html` — чистая утилита, нет новых зависимостей |
| `core/entities/` без импортов api/repos/models | PASS | Не затронуто |
| SQLAlchemy tables не импортированы в services | PASS | Не затронуто |
| Depends-сборка соблюдена | PASS | Нет изменений в depends/ |
| Бизнес-ошибки через `ClientError` | PASS | `validate_no_js_in_html` выбрасывает `ClientError` |
| Бизнес-валидация не в InDto (400, не 422) | PASS | Валидация в сервисном слое |

### Access Policy

| Endpoint | Access | Smoke-результат |
|---|---|---|
| PATCH `/api/horses/breeds/{slug}` | Protected Write | 200 с auth, 401 без auth |
| PATCH `/api/horses/coat_colors/{slug}` | Protected Write | 200 с auth, 401 без auth |
| PATCH `/api/horses/services/{slug}` | Protected Write | 200 с auth, 401 без auth |
| PATCH `/api/prices/{slug}` | Protected Write | 200 с auth, 401 без auth |
| GET `/api/horses/breeds/{slug}?page_data=true` | Public Read | 200 с service_key |
| GET `/api/horses/coat_colors/{slug}?page_data=true` | Public Read | 200 с service_key |
| GET `/api/horses/services/{slug}?page_data=true` | Public Read | 200 с service_key |
| GET `/api/prices/{slug}?page_data=true` | Public Read | 200 с service_key |

Исключений из дефолтной policy нет. Все PATCH — Protected Write, все GET — Public Read.

### Frontend (FSD)

| Пункт | Статус | Примечание |
|---|---|---|
| Нет бизнес-логики в компонентах | PASS | Компоненты — рендеринг + props-коллбэки |
| TypeScript типизация | PASS | `tsc --noEmit` без ошибок |
| Нет прямых fetch без абстракции | PASS | Все вызовы через `*PageDataService.ts` → `api/` адаптеры |
| FSD: редактор в `features/pageEditor/` | PASS | Верная слойная структура |

---

## Тесты

### `make format`

```
All done! ✨ — 2 файла переформатированы (test_page_data_security.py, test_horse_owner_service.py)
```

Замечание: два тест-файла потребовали форматирования (black). В тест-файле `test_page_data_security.py` также обнаружены и удалены 3 неиспользуемых импорта (`Sequence`, `uuid4`, `HorseServiceCreateDto`), которые вызывали ошибку flake8. Исправлено в рамках QG.

### `make lint`

```
Success: no issues found in 126 source files
All checks passed!
```

Чисто после удаления лишних импортов.

### `make test`

```
412 passed, 5 skipped in 0.88s
```

Все unit-тесты зелёные, 0 failed.

### Unit-тесты фичи

32 теста в `test_page_data_security.py` — все прошли:

- 17 тестов утилиты `validate_no_js_in_html` (happy-path + все варианты инъекций)
- 7 тестов `BreedService` (update+create с JS/без JS, дефолтный page_data)
- 3 теста `CoatColorService`
- 2 теста `HorseServiceService`
- 3 теста `PriceService`

### Frontend typecheck

```
npx tsc --noEmit: 0 ошибок
```

---

## SMOKE-тесты (32/32)

Smoke-тесты выполнены через `/smoke` скилл (curl-подход согласно `agents/backend.md` строка 337).

> **Примечание:** Время работы эндпоинтов в данном прогоне не измерялось (curl-скилл не фиксировал timings). Это ограничение текущего запуска smoke — все 32 сценария завершились со статусами согласно плану.

| # | Endpoint | Method | Access | HTTP | Результат |
|---|---|---|---|---|---|
| SM-01 | `/api/horses/breeds/{slug}` | PATCH valid HTML | protected+auth | 200 | ✅ |
| SM-02 | `/api/horses/breeds/{slug}?page_data=true` | GET | public+service_key | 200 | ✅ page_data в ответе |
| SM-03 | `/api/horses/breeds/{slug}` | PATCH `<script>` | protected+auth | 400 | ✅ |
| SM-04 | `/api/horses/breeds/{slug}` | PATCH `onerror=` | protected+auth | 400 | ✅ |
| SM-05 | `/api/horses/breeds/{slug}` | PATCH `javascript:` | protected+auth | 400 | ✅ |
| SM-06 | `/api/horses/breeds/{slug}` | PATCH no-auth | no-auth | 401 | ✅ |
| SM-07 | `/api/horses/breeds/{slug}` | PATCH `<SCRIPT>` uppercase | protected+auth | 400 | ✅ |
| SM-08 | `/api/horses/breeds/{slug}` | PATCH `style=color:red` | protected+auth | 200 | ✅ |
| SM-09 | `/api/horses/coat_colors/{slug}` | PATCH valid HTML | protected+auth | 200 | ✅ |
| SM-10 | `/api/horses/coat_colors/{slug}?page_data=true` | GET | public+service_key | 200 | ✅ |
| SM-11 | `/api/horses/coat_colors/{slug}` | PATCH `<script>` | protected+auth | 400 | ✅ |
| SM-12 | `/api/horses/coat_colors/{slug}` | PATCH `onclick=` | protected+auth | 400 | ✅ |
| SM-13 | `/api/horses/coat_colors/{slug}` | PATCH no-auth | no-auth | 401 | ✅ |
| SM-14 | `/api/horses/coat_colors/{slug}` | PATCH table no JS | protected+auth | 200 | ✅ |
| SM-15 | `/api/horses/services/{slug}` | PATCH valid HTML | protected+auth | 200 | ✅ |
| SM-16 | `/api/horses/services/{slug}?page_data=true` | GET | public+service_key | 200 | ✅ |
| SM-17 | `/api/horses/services/{slug}` | PATCH `<script src=...>` | protected+auth | 400 | ✅ |
| SM-18 | `/api/horses/services/{slug}` | PATCH `onmouseover=` | protected+auth | 400 | ✅ |
| SM-19 | `/api/horses/services/{slug}` | PATCH no-auth | no-auth | 401 | ✅ |
| SM-20 | `/api/horses/services/{slug}` | PATCH `<ul><li>` | protected+auth | 200 | ✅ |
| SM-21 | `/api/prices/{slug}` | PATCH valid HTML | protected+auth | 200 | ✅ page_data НЕ в ответе |
| SM-22 | `/api/prices/{slug}?page_data=true` | GET | public+service_key | 200 | ✅ |
| SM-23 | `/api/prices/{slug}` | PATCH `<script>` | protected+auth | 400 | ✅ |
| SM-24 | `/api/prices/{slug}` | PATCH `onload=` | protected+auth | 400 | ✅ |
| SM-25 | `/api/prices/{slug}` | PATCH `javascript:void(0)` | protected+auth | 400 | ✅ |
| SM-26 | `/api/prices/{slug}` | PATCH no-auth | no-auth | 401 | ✅ |
| SM-27 | `/api/prices/{slug}` | PATCH `<h2><p>` | protected+auth | 200 | ✅ |
| SM-28 | `/api/horses/breeds/{slug}` | PATCH schema check | protected+auth | 200 | ✅ page_data not in PATCH resp |
| SM-29 | `/api/horses/breeds/{slug}` | PATCH empty page_data="" | protected+auth | 400 | ✅ |
| SM-30 | `/api/horses/breeds/{slug}` | PATCH only page_data | protected+auth | 200 | ✅ others unchanged |
| SM-31 | `/api/horses/breeds/{slug}` | PATCH without page_data | protected+auth | 200 | ✅ page_data unchanged |
| SM-32 | `/api/horses/breeds/{slug}` | PATCH idempotent double | protected+auth | 200+200 | ✅ same value |

---

## Access verification results

### Anonymous / Public checks

- GET `/api/horses/breeds/{slug}?page_data=true` — 200 без auth-cookie, с X-Equestrian-Service-Key (SM-02) ✅
- GET `/api/horses/coat_colors/{slug}?page_data=true` — 200 (SM-10) ✅
- GET `/api/horses/services/{slug}?page_data=true` — 200 (SM-16) ✅
- GET `/api/prices/{slug}?page_data=true` — 200 (SM-22) ✅

### Authenticated / Protected checks

- PATCH всех 4 сущностей с валидной авторизацией → 200 (SM-01, SM-09, SM-15, SM-21) ✅
- PATCH всех 4 сущностей без авторизации → 401 (SM-06, SM-13, SM-19, SM-26) ✅
- PATCH с JS-payload → 400 по всем 4 сущностям ✅

### Исключения

Исключений из дефолтной Access Policy не зафиксировано.

---

## Замечания QG (исправлено в рамках этого ревью)

1. **lint (flake8):** `test_page_data_security.py` содержал 3 неиспользуемых импорта (`Sequence`, `uuid4`, `HorseServiceCreateDto`). Удалены.
2. **format (black):** `test_page_data_security.py` и `test_horse_owner_service.py` потребовали переформатирования. Выполнено командой `make format`.
3. После исправлений: `make lint` — чисто, `make test` — 412 passed 0 failed, `make format` — 0 изменений.

---

## Ручные проверки (требуют пользователя)

Следующие пункты не могут быть выполнены автоматически и требуют ручной проверки в браузере:

- [ ] Открыть модал породы, ввести текст с цветом, заголовком, таблицей, сохранить — GET `/breeds/{id}?page_data=true` возвращает HTML без JS
- [ ] Попытка сохранить HTML со скриптом — CMS показывает ошибку от API

---

## Итог

Diff соответствует плану. Архитектура не нарушена: JS-валидация находится в сервисном слое, не в InDto и не в роутерах. Unit-тесты (32 шт.) и smoke-тесты (32/32) прошли. `make test`, `make lint`, `make format` — без ошибок. TypeScript typecheck — чисто. Кнопки в 4 таблицах активны и подключены к коллбэкам.

**Готово к merge.**
