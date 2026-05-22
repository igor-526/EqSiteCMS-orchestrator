# План: Управление лошадьми (horses_management)

**Тикет:** horses_management
**Дата:** 2026-05-15
**Затронутые сервисы:** services/backend, services/frontend
**Ветка:** feature/horses-management

---

## Контекст

Backend имеет полный набор endpoint'ов для работы с лошадьми (`GET/POST/PATCH/DELETE /api/horses`), но в методе `get_horse_list_full_info` репозитория `HorseRepository` отсутствует дефолтная сортировка при `sort=None`. Также в репозитории используется `ilike` вместо `~*` для текстовых фильтров (нарушение архитектурного правила из `agents/backend.md`).

Frontend (`services/frontend/src/features/horses/`) содержит вкладки для управления породами, мастями, владельцами и услугами, но не имеет вкладки для управления самими лошадьми. Текущий `HorsesTabs` имеет устаревшие ключи `DOCUMENTATION`/`INSTRUCTION` вместо принятой в других фичах модели `USER_DOCS`/`DEVELOPER_DOCS`, что тоже требует обновления в рамках задачи.

## Цель

1. **Backend**: Обеспечить дефолтную сортировку `updated_at DESC, created_at DESC` при `sort=None` в `GET /api/horses`. Исправить текстовые фильтры с `ilike` на `~*`.
2. **Frontend CMS**: Добавить вкладку «Лошади» (первая по счёту) с таблицей, фильтрами, сортировкой, формой добавления/редактирования, кнопкой «Фотографии» (со счётчиком) и кнопкой «Родословная» с индикаторами и tooltip.
3. **Инструкции**: Написание текстов инструкций (User + Developer) для 5 вкладок раздела «Лошади» делегируется отдельному агенту с чистым контекстом после завершения основной реализации.

---

## Детали реализации

### Backend

#### Изменяемые файлы

| Что | Путь | Описание изменения |
|---|---|---|
| Репозиторий | `services/backend/src/repositories/horse_repository.py` | Добавить дефолтную сортировку `updated_at DESC, created_at DESC` когда `sort is None`; заменить `ilike` на `~*` с `re.escape` |
| Unit-тест | `services/backend/tests/unit/core/services/test_horse_service.py` | Добавить тесты дефолтной сортировки и поведения с явным sort |

#### Суть изменения в репозитории

В методе `get_horse_list_full_info` класса `HorseRepository`:

```python
# Было:
if sort:
    order_by_clauses = []
    for field in sort:
        ...
    base_stmt = base_stmt.order_by(*order_by_clauses)

# Нужно:
if sort:
    order_by_clauses = []
    for field in sort:
        ...
    base_stmt = base_stmt.order_by(*order_by_clauses)
else:
    base_stmt = base_stmt.order_by(
        horse.c.updated_at.desc().nulls_last(),
        horse.c.created_at.desc().nulls_last(),
    )
```

Также заменить `ilike`:
```python
# Было:
if name:
    conditions.append(horse.c.name.ilike(f"%{name}%"))
if description:
    conditions.append(horse.c.description.ilike(f"%{description}%"))

# Нужно:
if name:
    safe = re.escape(name)
    conditions.append(horse.c.name.op("~*")(safe))
if description:
    safe = re.escape(description)
    conditions.append(horse.c.description.op("~*")(safe))
```

Добавить `import re` в начало файла.

#### API контракт (поведение без изменений схемы)

```
GET /api/horses
Params: sort (list[str] | None), name, description, breed_ids, coat_color_ids,
        kind, height_gte, height_lte, sex, bdate_gte, bdate_lte, ddate_gte,
        ddate_lte, horse_owner_ids, this_stable, exclude_ids, include_ids,
        pedigree, limit, offset

Response 200: {
  "total": int,
  "items": [HorseOutDto | HorseWithPedigreeOutDto]
}

Дефолтная сортировка (sort=None): updated_at DESC NULLS LAST, created_at DESC NULLS LAST
Явный sort: переопределяет дефолт полностью
```

#### Access matrix

| Method | Path | Access class | Roles | Without auth | With auth |
|---|---|---|---|---|---|
| GET | /api/horses | Public Read | — | 200 OK | 200 OK |
| GET | /api/horses/{slug_or_id} | Public Read | — | 200 OK | 200 OK |
| POST | /api/horses | Protected Write | SUPERUSER, ADMIN, DEVELOPER | 400 ClientError | 200 OK |
| PATCH | /api/horses/{horse_id} | Protected Write | SUPERUSER, ADMIN, DEVELOPER | 400 ClientError | 200 OK |
| DELETE | /api/horses/{horse_id} | Protected Write | SUPERUSER, ADMIN, DEVELOPER | 400 ClientError | 204 No Content |

> Примечание: backend использует `ClientError` с HTTP 400 (вместо 401/403) для отклонения неаутентифицированных write-запросов. Это задокументированный контракт сервиса, реализованный через `_check_admin_permission`. Не нарушение — явное исключение.

---

### Frontend

#### Новые файлы

| Что | Путь | Описание |
|---|---|---|
| DTO типы | `src/types/api/horses.ts` | `HorseOutDto`, `HorseWithPedigreeOutDto`, `HorsePedigreeDto`, `HorseCreateInDto`, `HorseUpdateInDto`, `HorseListQueryParams`, `HorseAvailableSorting` |
| API функции | `src/api/horses.ts` | `horseList()`, `horseCreate()`, `horseUpdate()`, `horseDelete()` |
| Feature service | `src/features/horses/services/horseService.ts` | `fetchHorseList`, `fetchCreateHorse`, `fetchUpdateHorse`, `fetchDeleteHorse` |
| Feature hook | `src/features/horses/hooks/useHorses.ts` | Загрузка, CRUD, фильтры, пагинация, валидация |
| Scopes registry | `src/features/horses/hooks/useHorseScopes.ts` | `HORSES_PAGE_SCOPES_ACTIONS`, `horsesPageScopesRegistry`, `useHorsePageActionScopes` |
| Zod схема | `src/features/horses/validators/horses.ts` | `horseCreateSchema`, `horseUpdateSchema` |
| Таблица | `src/features/horses/ui/Horses/HorsesTable.tsx` | Таблица с колонками, fixed-колонками, фильтрами |
| Форма CRUD | `src/features/horses/ui/Horses/HorseCreateUpdateModal.tsx` | Форма по 4 категориям с Zod |
| Модал родословной | `src/features/horses/ui/Horses/HorsePedigreeModal.tsx` | «В разработке» |
| Индекс | `src/features/horses/ui/Horses/index.ts` | Экспорт |

#### Изменяемые файлы

| Что | Путь | Изменение |
|---|---|---|
| Вкладки | `src/features/horses/ui/HorsesTabs.tsx` | Добавить `HORSES = 'horses'` первым; `DOCUMENTATION` → `DEVELOPER_DOCS`, `INSTRUCTION` → `USER_DOCS`; scope-контроль по паттерну `NewsTabs` |
| Заголовок | `src/features/horses/ui/HorsesHeader.tsx` | Добавить обработку вкладки HORSES; фильтры слева от пагинации (загрузка breeds/coat_colors/owners по API) |
| Page | `src/app/(protected)/horses/page.tsx` | HORSES как default tab; интеграция `useHorses`, `HorsesTable`, модалов; `PhotoSelectorModal` для лошадей |

#### Таблица HorsesTable — колонки

| Столбец | Поле | Fixed | Сортировка | Фильтр в колонке |
|---|---|---|---|---|
| База | `this_stable` (булев → Да/Нет) | left | — | — |
| Кличка | `name` (trimText 32) | left | `name` / `-name` | StringFilter |
| Описание | `description` (trimText 32) | — | — | StringFilter |
| Порода | `breed.short_name ?? breed.name` (trimText 32) | — | `breed_name` / `-breed_name` | ListFilter (загрузка) |
| Масть | `coat_color.short_name ?? coat_color.name` (trimText 32) | — | `coat_color_name` / `-coat_color_name` | ListFilter (загрузка) |
| Тип | `kind` (русифицировать) | — | `kind` / `-kind` | ListFilter (статика) |
| Пол | `sex` (русифицировать) | — | `sex` / `-sex` | ListFilter (статика) |
| Владелец | `horse_owner.name` (trimText 32) | — | — | — |
| Возраст | `age` | — | — | — |
| Путь URL | `slug` | — | — | — |
| Действия | — | right | — | — |

Fixed-колонки: `fixed: 'left'` / `fixed: 'right'` в column props + `scroll={{ x: 'max-content' }}` в `MainTable`.

**Русификация:**
- `kind`: `horse` → «Лошадь», `pony` → «Пони»
- `sex`: `male` → «Жеребец», `female` → «Кобыла», `geld` → «Мерин»

#### Фильтры без колонки (в HorsesHeader, слева от пагинации)

- `this_stable` — Select (Все / Наши / Чужие), **по умолчанию `true`**
- `breed_ids` — MultiSelect с загрузкой пород (ref: GalleryFilters pattern)
- `coat_color_ids` — MultiSelect с загрузкой мастей
- `horse_owner_ids` — MultiSelect с загрузкой владельцев
- `kind` — MultiSelect (статика: Лошадь / Пони)
- `sex` — MultiSelect (статика: Жеребец / Кобыла / Мерин)
- `height_gte` / `height_lte` — два числовых поля
- `bdate_gte` / `bdate_lte` — DatePicker (range)

#### Действия в строке

**Фотографии:**
- Иконка `FileImageOutlined` (как в PricesTable)
- Рядом с иконкой `<sup>{photos.length}</sup>`
- Нажатие → `PhotoSelectorModal` (паттерн из `prices/page.tsx`)

**Родословная:**
- Иконка `BranchesOutlined` из `@ant-design/icons`
- Три цветные точки:
  1. Серая / синяя (синяя при наличии `pedigree.sire`)
  2. Серая / розовая (розовая при наличии `pedigree.dam`)
  3. Серая / зелёная (зелёная при наличии `pedigree.foals.length > 0`)
- Tooltip AntD при наведении:
  ```
  Отец: {pedigree.sire?.name ?? '—'}
  Мать: {pedigree.dam?.name ?? '—'}
  Потомство: {foals.length <= 2 ? foals.map(f => f.name).join(', ') : foals.length}
  ```
- Нажатие → `HorsePedigreeModal` («Функционал в разработке»)
- Требует `pedigree=1` в запросе таблицы по умолчанию

#### Форма HorseCreateUpdateModal — категории

**Основные данные:**
- `name` — Input (обязательное)
- `description` — TextArea
- В одну строку (`Space`): `kind` (Select), `this_stable` (Select), `sex` (Select)

**Дополнительно:**
- `breed_id` — Select (загрузка пород)
- `coat_color_id` — Select (загрузка мастей)
- `height` — InputNumber (0–300 см)

**Даты:**
- В одну строку: `bdate` (DatePicker) + `bdate_mode` (Select: Y/YM/YMD/HIDE)
- В одну строку: `ddate` (DatePicker) + `ddate_mode` (Select: Y/YM/YMD/HIDE)

**Владелец:**
- `horse_owner_id` — Select (загрузка владельцев)

Валидация через `horseCreateSchema` / `horseUpdateSchema` (Zod) перед отправкой.

#### Инструкции (документационные вкладки)

Написание текстов инструкций (User + Developer) для всех 5 вкладок (**Лошади**, **Породы**, **Масти**, **Владельцы**, **Услуги**) делегируется отдельному агенту с чистым контекстом **после** завершения основной реализации. В рамках текущего плана реализуются только заготовки-плейсхолдеры компонентов.

---

## PostgreSQL для smoke-тестов

Контейнер определяется через `docker inspect` перед каждым запуском smoke-тестов:

```bash
docker inspect eqsitecms-db
```

Актуальные параметры (пример последнего обнаруженного окружения — верифицировать перед запуском):
- **Контейнер**: `eqsitecms-db`
- **Labels**: `com.docker.compose.project=eqsitecms`, `com.docker.compose.service=db`
- **Image**: `postgres:17`
- **POSTGRES_DB**: `eqsitecms`
- **POSTGRES_USER**: `eqsitecms`
- **POSTGRES_PASSWORD**: `eqsitecms`
- **Host port**: `5433`

---

## Unit-тесты backend-фичи (дефолтная сортировка)

Расположение: `services/backend/tests/unit/core/services/test_horse_service.py` (дополнить).

| # | Сценарий |
|---|---|
| U-01 | `sort=None` → репозиторий вызывается с `ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST` |
| U-02 | `sort=["name"]` → ORDER BY содержит только `name ASC`, дефолт не применяется |
| U-03 | `sort=["-name"]` → ORDER BY содержит `name DESC`, дефолта нет |
| U-04 | `sort=["created_at"]` → дефолт не применяется, явная сортировка по `created_at ASC` |
| U-05 | `sort=["-created_at"]` → `created_at DESC`, дефолт не применяется |
| U-06 | `sort=[]` (пустой список) → трактуется как «нет sort», применяется дефолт |
| U-07 | `sort=None`, множество записей с разными `updated_at` → первой идёт запись с наибольшим `updated_at` |
| U-08 | `sort=None`, записи с одинаковым `updated_at` → вторичная сортировка по `created_at DESC` |
| U-09 | `sort=None`, запись с `updated_at=None` → NULL идут последними (`NULLS LAST`) |
| U-10 | `sort=None`, запись с `created_at=None` → NULL идут последними во вторичной сортировке |
| U-11 | Фильтр `name="TEST"` → условие `name ~* 'TEST'`, не `ilike` |
| U-12 | Фильтр `description="test"` → условие `description ~* 'test'` |
| U-13 | Фильтр `name="А.Б"` (с точкой) → паттерн экранируется через `re.escape` |
| U-14 | Фильтр `name="(тест)"` (со скобками) → символы экранируются корректно |
| U-15 | `name=None` → условие поиска по имени не добавляется в WHERE |
| U-16 | `name=""` (пустая строка) → условие не добавляется в WHERE |
| U-17 | Фильтр `this_stable=True` → WHERE `this_stable = true` |
| U-18 | Фильтр `this_stable=False` → WHERE `this_stable = false` |
| U-19 | Фильтр `this_stable=None` → условие не добавляется, возвращаются все |
| U-20 | Фильтр `breed_ids=[uuid1, uuid2]` → WHERE `breed_id IN (...)` |
| U-21 | Фильтр `coat_color_ids=[uuid1]` → WHERE `coat_color_id IN (...)` |
| U-22 | Фильтр `horse_owner_ids=[uuid1]` → WHERE `horse_owner_id IN (...)` |
| U-23 | Фильтр `kind=["horse"]` → WHERE `kind IN ('horse')` |
| U-24 | Фильтр `sex=["male", "female"]` → WHERE `sex IN ('male', 'female')` |
| U-25 | Фильтр `height_gte=150` → WHERE `height >= 150` |
| U-26 | Пагинация `limit=0` → clamp до 1 (согласно сервисному слою) |
| U-27 | Пагинация `limit=200` → clamp до 100 |
| U-28 | Пагинация `offset=-1` → offset становится 0 |
| U-29 | `sort=None`, результат из репозитория → сервис возвращает PaginatedEntities с сохранённым порядком |
| U-30 | `sort=["breed_name"]` → сортировка применяется к `breeds.c.name`, не к `horse.c.breed_name` |
| U-31 | `sort=["coat_color_name"]` → сортировка применяется к `coat_color.c.name` |
| U-32 | Фильтр `name="тест*"` (со звёздочкой) → `re.escape` превращает в `тест\*` (литерал) |

---

## Smoke-тесты backend-фичи (дефолтная сортировка)

Все smoke-тесты выполняются через скилл `api-smoke-test` на реальном API с реальной PostgreSQL.

Переменные: `BASE_URL=http://localhost:8001/api`

| # | Запрос | Проверка |
|---|---|---|
| SM-01 | `GET /horses?limit=10` (без sort) | Порядок items: `updated_at` убывает |
| SM-02 | `GET /horses?limit=10` без sort, два item с одинаковым `updated_at` | Среди них: `created_at` убывает |
| SM-03 | `GET /horses?sort=name&limit=10` | Порядок по name ASC, отличается от дефолтного |
| SM-04 | `GET /horses?sort=-name&limit=10` | Порядок по name DESC |
| SM-05 | `GET /horses?sort=created_at&limit=10` | Порядок по created_at ASC |
| SM-06 | `GET /horses?sort=-created_at&limit=10` | Порядок по created_at DESC |
| SM-07 | `POST /horses` без cookie | 400 с detail «не авторизован» |
| SM-08 | `PATCH /horses/{id}` без cookie | 400 ClientError |
| SM-09 | `DELETE /horses/{id}` без cookie | 400 ClientError |
| SM-10 | `GET /horses` без cookie | 200 OK (Public Read) |
| SM-11 | `GET /horses/{slug}` без cookie | 200 OK |
| SM-12 | `POST /horses` с валидным auth cookie (admin) | 200, запись появляется в PostgreSQL |
| SM-13 | `PATCH /horses/{id}` с auth | 200, `updated_at` обновился |
| SM-14 | `DELETE /horses/{id}` с auth | 204, запись удалена |
| SM-15 | `GET /horses?this_stable=true&limit=10` | Все items имеют `this_stable=true` |
| SM-16 | `GET /horses?this_stable=false&limit=10` | Все items имеют `this_stable=false` |
| SM-17 | `GET /horses` без `this_stable` | Присутствуют обе группы |
| SM-18 | `GET /horses?name=тест` | Регистронезависимый поиск: находит «Тест», «ТЕСТ» |
| SM-19 | `GET /horses?name=А.Б` (точка в паттерне) | Точка — литерал, не любой символ |
| SM-20 | `GET /horses?name=` (пустая строка) | Возвращает все записи |
| SM-21 | `GET /horses?kind=horse&limit=10` | Все items имеют `kind=horse` |
| SM-22 | `GET /horses?sex=female&limit=10` | Все items имеют `sex=female` |
| SM-23 | `GET /horses?breed_ids={uuid}&limit=10` | Все items имеют соответствующую породу |
| SM-24 | `GET /horses?height_gte=150&limit=10` | Все items имеют `height >= 150` |
| SM-25 | `GET /horses?limit=1&offset=0` + `GET /horses?limit=1&offset=1` | Разные записи, без дублей |
| SM-26 | `POST /horses` с несуществующим `breed_id` | 400 «Порода не найдена» |
| SM-27 | `POST /horses` без поля `name` | 422 от FastAPI |
| SM-28 | `PATCH /horses/{unknown_uuid}` с auth | 400 «Лошадь не найдена» |
| SM-29 | `DELETE /horses/{unknown_uuid}` с auth | 400 «Лошадь не найдена» |
| SM-30 | Создать лошадь → `GET /horses?limit=1` без sort | Новая запись первая |
| SM-31 | Обновить лошадь → `GET /horses?limit=1` без sort | Обновлённая запись первая |
| SM-32 | `GET /horses?sort=breed_name&limit=10` | Сортировка по `breeds.name`, не по `horse.breed_name` |
| SM-33 | `GET /horses?pedigree=1&limit=5` | Каждый item содержит поле `pedigree` |
| SM-34 | `GET /horses?pedigree=0&limit=5` | items не содержат поле `pedigree` |
| SM-35 | Создать 2 лошадей, обновить первую → GET без sort | Первой идёт обновлённая лошадь |

---

## Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| `src/types/api/horses.ts` | Новые DTO типы | static typecheck | — | `npx tsc --noEmit` |
| `src/api/horses.ts` | Новый API boundary | 3 MSW: success, error, 401 | authenticated context | `npm test` |
| `src/features/horses/services/horseService.ts` | Feature service | 3 unit: success, empty, error | — | `npm test` |
| `src/features/horses/hooks/useHorses.ts` | Загрузка, CRUD, фильтры, пагинация | success/empty/error + 4 filter + 4 pagination + 5 modal | authenticated | `npm test` |
| `src/features/horses/validators/horses.ts` | Zod schema | 3: valid, invalid name, boundary | — | `npm test` |
| `src/features/horses/ui/Horses/HorsesTable.tsx` | Новая таблица | 5 component: data/loading/empty/error/interaction + permission | authenticated/scopes | `npm test` |
| `src/features/horses/ui/Horses/HorseCreateUpdateModal.tsx` | Форма create/update с Zod | 5+1: open/close, valid submit, Zod error, backend error, success + Protected Write | scope present/missing | `npm test` |
| `src/features/horses/ui/Horses/HorsePedigreeModal.tsx` | «В разработке» | 2: open, close | — | `npm test` |
| `src/features/horses/hooks/useHorseScopes.ts` | Scope registry | 4: scope present, missing, disabled UX, 401/403 | admin/non-admin | `npm test` |
| `src/features/horses/ui/HorsesTabs.tsx` | HORSES первая вкладка, scope-контроль | 3: render admin, скрытая инструкция non-admin, HORSES first | authenticated/anonymous | `npm test` |
| `src/app/(protected)/horses/page.tsx` | Default tab, PhotoSelector, Pedigree | 1 manual QA | anonymous redirect, authenticated render | `npm run build` |

---

## Manual QA steps (UI тестирование)

Пользователь выполняет следующие шаги в браузере `http://localhost:3000` и отправляет результат для проверки:

1. + Открыть раздел «Лошади» → убедиться, что первой активной вкладкой является **«Лошади»**
2. + Таблица загружается, отображаются все колонки: База, Кличка, Описание, Порода, Масть, Тип, Пол, Владелец, Возраст, Путь URL, Действия
3. + При горизонтальной прокрутке колонки «База» и «Кличка» остаются зафиксированными слева
4. + По умолчанию применён фильтр `this_stable = true` — все строки показывают «Да» в колонке «База»
5. + Сбросить фильтр `this_stable` → появляются лошади обеих групп
6. + Применить фильтр по породе (dropdown) → таблица обновляется, offset сбрасывается в 0
7. + Применить текстовый фильтр по кличке (в колонке) → регистронезависимый поиск работает
8. + Кликнуть на заголовок колонки «Кличка» → сортировка ASC, затем DESC, затем сброс
9. + Кликнуть на заголовок «Порода» → сортировка по `breed_name` работает
10. + Нажать «Добавить» → открывается форма с категориями **«Основные данные»**, **«Дополнительно»**, **«Даты»**, **«Владелец»**
11. + В блоке «Основные данные» `kind`/`this_stable`/`sex` расположены в одну строку
12. + В блоке «Даты» `bdate` и `bdate_mode` — попарно в одну строку; аналогично `ddate`/`ddate_mode`
13. + Сабмит пустой формы (без `name`) → клиентская ошибка Zod, запрос на сервер не уходит
14. + Заполнить `name`, нажать «Добавить» → запись создаётся, таблица обновляется, новая запись идёт первой
15. + Кликнуть на строку лошади → форма редактирования с заполненными полями
16. + Изменить имя и сохранить → изменения сохранены, обновлённая запись первая в таблице
17. Кнопка **«Фотографии»**: рядом с иконкой видна цифра с количеством фото; нажать → открывается `PhotoSelectorModal`
    1.  При нажатии на добавление фото в модальном окне происходит POST запрос `http://localhost:8001/api/horses/38855fb2-3649-460d-8f6c-8299e20afe7b/photos` c body `{"photo_ids":["9df91eb5-1fcf-4776-9a99-d8db86903788"]}`. Ответ 500. Должна происходить привязка фотографии к лошади аналогично, как это сделано в услугах и ценах. Логи в контейнере eqsitecms-app (46df99783206)
18. + Кнопка **«Родословная»**: три цветные точки (серые/цветные в зависимости от наличия pedigree); навести → tooltip с «Отец/Мать/Потомство»; нажать → модал «Функционал в разработке»
19. + Пагинация: изменить страницу → данные обновляются; изменить размер страницы → offset сбрасывается
20. + Перейти на вкладку **«Породы»** → работает как прежде (регрессия)
21. + Перейти на вкладки **«Масти»**, **«Владельцы»**, **«Услуги»** → работают как прежде
22. + Переключиться на вкладку **«Инструкция»** (если есть нужный scope) → плейсхолдер отображается
---

## Порядок выполнения

1. **Backend**: Исправить `horse_repository.py` — дефолтная сортировка + `~*` вместо `ilike`
2. **Backend**: Написать unit-тесты (дополнить `test_horse_service.py`)
3. **Backend**: Запустить `make format`, `make test`, `make lint` — чисто
4. **Frontend**: Создать `src/types/api/horses.ts`
5. **Frontend**: Создать `src/api/horses.ts`
6. **Frontend**: Создать `src/features/horses/services/horseService.ts`
7. **Frontend**: Создать `src/features/horses/hooks/useHorseScopes.ts`
8. **Frontend**: Создать `src/features/horses/validators/horses.ts` (Zod)
9. **Frontend**: Создать `src/features/horses/hooks/useHorses.ts`
10. **Frontend**: Создать `src/features/horses/ui/Horses/` (таблица, модалы, index)
11. **Frontend**: Обновить `HorsesTabs.tsx` — HORSES первым, переименовать DOCUMENTATION/INSTRUCTION, scope-контроль
12. **Frontend**: Обновить `HorsesHeader.tsx` — вкладка HORSES + фильтры
13. **Frontend**: Обновить `page.tsx` — интегрировать всё, HORSES как default
14. **Frontend**: Написать тесты
15. **Frontend**: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`
16. **После реализации**: Делегировать написание инструкций для 5 вкладок отдельному агенту с чистым контекстом

---

## Чеклист

> ⚠️ Этот раздел используется агентами для отслеживания прогресса.
> Агент обязан менять `[ ]` → `[x]` после выполнения каждого пункта.

### Backend

- [ ] Заполнить Access matrix для всех endpoint'ов `GET/POST/PATCH/DELETE /api/horses`
- [ ] Зафиксировать контракт: `ClientError("Пользователь не авторизован")` для write без auth → HTTP 400 (не менять)
- [ ] Найти PostgreSQL контейнер через `docker inspect` по labels `com.docker.compose.project=eqsitecms` + `com.docker.compose.service=db`, fallback `eqsitecms-db`/`postgres`; получить DB env и host port
- [ ] Добавить `import re` в `horse_repository.py`
- [ ] Заменить `horse.c.name.ilike(...)` на `horse.c.name.op("~*")(re.escape(name))`
- [ ] Заменить `horse.c.description.ilike(...)` на `horse.c.description.op("~*")(re.escape(description))`
- [ ] Добавить ветку `else` для `sort is None` в `get_horse_list_full_info`: `ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST`
- [ ] Unit: дефолтная сортировка — `sort=None` → ORDER BY `updated_at DESC NULLS LAST, created_at DESC NULLS LAST`
- [ ] Unit: дефолтная сортировка — `sort=["name"]` → только `name ASC`, дефолта нет
- [ ] Unit: дефолтная сортировка — `sort=["-name"]` → `name DESC`, дефолта нет
- [ ] Unit: дефолтная сортировка — `sort=["created_at"]` → явная `created_at ASC`, без дефолта
- [ ] Unit: дефолтная сортировка — `sort=["-created_at"]` → явная `created_at DESC`
- [ ] Unit: дефолтная сортировка — `sort=[]` (пустой список) → применяется дефолт
- [ ] Unit: дефолтная сортировка — записи с разными `updated_at` → убывающий порядок
- [ ] Unit: дефолтная сортировка — одинаковый `updated_at` → вторичная `created_at DESC`
- [ ] Unit: дефолтная сортировка — `updated_at=None` → NULL last
- [ ] Unit: дефолтная сортировка — `created_at=None` → NULL last во вторичной
- [ ] Unit: текстовый фильтр — `name="TEST"` → условие `~*`, не `ilike`
- [ ] Unit: текстовый фильтр — `description="test"` → `description ~* 'test'`
- [ ] Unit: текстовый фильтр — `name="А.Б"` → `re.escape` применён
- [ ] Unit: текстовый фильтр — `name="(тест)"` → скобки экранированы
- [ ] Unit: текстовый фильтр — `name=None` → условие не добавляется
- [ ] Unit: текстовый фильтр — `name=""` → условие не добавляется
- [ ] Unit: `this_stable=True` → WHERE `this_stable = true`
- [ ] Unit: `this_stable=False` → WHERE `this_stable = false`
- [ ] Unit: `this_stable=None` → без условия
- [ ] Unit: `breed_ids=[uuid1, uuid2]` → `WHERE breed_id IN (...)`
- [ ] Unit: `coat_color_ids=[uuid1]` → `WHERE coat_color_id IN (...)`
- [ ] Unit: `horse_owner_ids=[uuid1]` → `WHERE horse_owner_id IN (...)`
- [ ] Unit: `kind=["horse"]` → `WHERE kind IN ('horse')`
- [ ] Unit: `sex=["male", "female"]` → `WHERE sex IN ('male', 'female')`
- [ ] Unit: `height_gte=150` → `WHERE height >= 150`
- [ ] Unit: `limit=0` → clamp до 1
- [ ] Unit: `limit=200` → clamp до 100
- [ ] Unit: `offset=-1` → offset становится 0
- [ ] Unit: сервис возвращает PaginatedEntities с сохранённым порядком при `sort=None`
- [ ] Unit: `sort=["breed_name"]` → сортировка по `breeds.c.name`
- [ ] Unit: `sort=["coat_color_name"]` → сортировка по `coat_color.c.name`
- [ ] Unit: `name="тест*"` → `re.escape` экранирует звёздочку
- [ ] Smoke: `GET /horses?limit=10` без sort → items упорядочены по `updated_at DESC` (реальная PostgreSQL)
- [ ] Smoke: два item с одинаковым `updated_at` → вторичная `created_at DESC` работает
- [ ] Smoke: `GET /horses?sort=name` → порядок по name ASC
- [ ] Smoke: `GET /horses?sort=-name` → порядок по name DESC
- [ ] Smoke: `GET /horses?sort=created_at` → порядок по created_at ASC
- [ ] Smoke: `GET /horses?sort=-created_at` → порядок по created_at DESC
- [ ] Smoke: `POST /horses` без cookie → 400 «Пользователь не авторизован»
- [ ] Smoke: `PATCH /horses/{id}` без cookie → 400 ClientError
- [ ] Smoke: `DELETE /horses/{id}` без cookie → 400 ClientError
- [ ] Smoke: `GET /horses` без cookie → 200 OK
- [ ] Smoke: `GET /horses/{slug}` без cookie → 200 OK
- [ ] Smoke: `POST /horses` с auth (admin) → 200, запись в PostgreSQL
- [ ] Smoke: `PATCH /horses/{id}` с auth → 200, `updated_at` обновился
- [ ] Smoke: `DELETE /horses/{id}` с auth → 204, запись удалена
- [ ] Smoke: `GET /horses?this_stable=true` → все `this_stable=true`
- [ ] Smoke: `GET /horses?this_stable=false` → все `this_stable=false`
- [ ] Smoke: `GET /horses` без `this_stable` → обе группы
- [ ] Smoke: `GET /horses?name=тест` → регистронезависимый поиск работает
- [ ] Smoke: `GET /horses?name=А.Б` → точка — литерал
- [ ] Smoke: `GET /horses?name=` → все записи
- [ ] Smoke: `GET /horses?kind=horse` → все `kind=horse`
- [ ] Smoke: `GET /horses?sex=female` → все `sex=female`
- [ ] Smoke: `GET /horses?breed_ids={uuid}` → все нужной породы
- [ ] Smoke: `GET /horses?height_gte=150` → все `height >= 150`
- [ ] Smoke: пагинация `limit=1&offset=0` и `limit=1&offset=1` → разные записи
- [ ] Smoke: `POST /horses` с несуществующим `breed_id` → 400 «Порода не найдена»
- [ ] Smoke: `POST /horses` без `name` → 422 от FastAPI
- [ ] Smoke: `PATCH /horses/{unknown_uuid}` → 400 «Лошадь не найдена»
- [ ] Smoke: `DELETE /horses/{unknown_uuid}` → 400 «Лошадь не найдена»
- [ ] Smoke: создать лошадь → `GET /horses?limit=1` без sort → новая первая
- [ ] Smoke: обновить лошадь → `GET /horses?limit=1` без sort → обновлённая первая
- [ ] Smoke: `GET /horses?sort=breed_name` → по `breeds.name`
- [ ] Smoke: `GET /horses?pedigree=1&limit=5` → items содержат поле `pedigree`
- [ ] Smoke: `GET /horses?pedigree=0&limit=5` → items не содержат `pedigree`
- [ ] Smoke: создать 2 лошадей, обновить первую → GET без sort → первой идёт обновлённая
- [ ] Запустить `make format` — чисто
- [ ] Запустить `make test` — все тесты зелёные
- [ ] Запустить `make lint` — чисто

### Frontend

- [ ] Создать `src/types/api/horses.ts` с `HorseOutDto`, `HorseWithPedigreeOutDto`, `HorsePedigreeDto`, `HorseCreateInDto`, `HorseUpdateInDto`, `HorseListQueryParams`, `HorseAvailableSorting`
- [ ] Создать `src/api/horses.ts` с `horseList()`, `horseCreate()`, `horseUpdate()`, `horseDelete()`
- [ ] Создать `src/features/horses/services/horseService.ts`
- [ ] Создать `src/features/horses/hooks/useHorseScopes.ts` (`HORSES_PAGE_SCOPES_ACTIONS`, scopes registry, `useHorsePageActionScopes`)
- [ ] Создать `src/features/horses/validators/horses.ts` с `horseCreateSchema` и `horseUpdateSchema` (Zod)
- [ ] Создать `src/features/horses/hooks/useHorses.ts` (загрузка, CRUD, фильтры, пагинация, Zod-валидация)
- [ ] Создать `src/features/horses/ui/Horses/HorsesTable.tsx` — колонки, fixed «База»/«Кличка», кнопки Фотографии (счётчик) + Родословная (3 точки + tooltip)
- [ ] Создать `src/features/horses/ui/Horses/HorseCreateUpdateModal.tsx` — 4 категории, Zod, scope-контроль
- [ ] Создать `src/features/horses/ui/Horses/HorsePedigreeModal.tsx` — «В разработке»
- [ ] Создать `src/features/horses/ui/Horses/index.ts`
- [ ] Обновить `HorsesTabs.tsx`: `HORSES = 'horses'` первым; `DOCUMENTATION` → `DEVELOPER_DOCS`, `INSTRUCTION` → `USER_DOCS`; scope-контроль инструкций
- [ ] Обновить `HorsesHeader.tsx`: обработка вкладки HORSES; загрузка пород/мастей/владельцев; фильтры `this_stable`/`breed_ids`/`coat_color_ids`/`horse_owner_ids` слева от пагинации
- [ ] Обновить `src/app/(protected)/horses/page.tsx`: HORSES как default; интеграция `useHorses`; модалы; PhotoSelector для лошадей
- [ ] Добавить `pedigree=1` по умолчанию в запрос таблицы лошадей
- [ ] Unit: `src/api/horses.ts` — 3 MSW-теста: success list, error, 401
- [ ] Unit: `horseService.ts` — 3 unit: success, empty, error
- [ ] Unit: `horseCreateSchema` — 3 Zod: valid, invalid (name empty), boundary
- [ ] Unit: `useHorses` — success загрузка
- [ ] Unit: `useHorses` — empty list
- [ ] Unit: `useHorses` — error при загрузке
- [ ] Filter: `useHorses` — применение фильтра name
- [ ] Filter: `useHorses` — очистка фильтра (→ undefined)
- [ ] Filter: `useHorses` — изменение фильтра сбрасывает offset в 0
- [ ] Filter: `useHorses` — sort field mapping корректен
- [ ] Pagination: `useHorses` — initial `{ limit: 25, offset: 0 }`
- [ ] Pagination: `useHorses` — page change обновляет offset
- [ ] Pagination: `useHorses` — page size change обновляет limit и сбрасывает offset
- [ ] Pagination: `useHorses` — изменение фильтра сбрасывает offset
- [ ] Scope: `useHorseScopes` — scope ADMIN → `HORSE_CREATE` разрешён
- [ ] Scope: `useHorseScopes` — без admin → `HORSE_CREATE` запрещён
- [ ] Scope: `HorsesTable` — кнопка «Добавить» hidden/disabled без scope
- [ ] Scope: backend 400/403 сурфейсится в toast
- [ ] Component: `HorsesTable` — data render (все колонки, trimText 32, русификация)
- [ ] Component: `HorsesTable` — loading state
- [ ] Component: `HorsesTable` — empty state
- [ ] Component: `HorsesTable` — error state
- [ ] Component: `HorsesTable` — клик на строку вызывает onOpenHorseModal
- [ ] Component: `HorsesTable` — action permission (DELETE без scope)
- [ ] Modal: `HorseCreateUpdateModal` — open/close
- [ ] Modal: `HorseCreateUpdateModal` — valid submit вызывает `createHorse`
- [ ] Modal: `HorseCreateUpdateModal` — Zod error → запрос не уходит
- [ ] Modal: `HorseCreateUpdateModal` — backend error отображается
- [ ] Modal: `HorseCreateUpdateModal` — success → список обновляется
- [ ] Modal: `HorseCreateUpdateModal` — Protected Write: submit без scope заблокирован
- [ ] Component: `HorsesTabs` — render всех вкладок для admin
- [ ] Component: `HorsesTabs` — инструкция скрыта для non-admin
- [ ] Component: `HorsesTabs` — «Лошади» первая вкладка
- [ ] rg: нет прямых `fetch`/`axios` вне `src/api`
- [ ] rg: нет `@/api` imports в `src/app` или `src/features`
- [ ] rg: нет `page`/`pageSize`/`page_size` в API DTO/query/filter types
- [ ] rg: нет `site-ad`/`site-*`/`Public Read` в CMS frontend коде
- [ ] find: нет запрещённых директорий `shared`/`widgets`/`entities`

### Quality Gate

- [ ] Проверить Clean Architecture backend: нет прямых imports `models/` в `core/services/`, нет бизнес-логики в `api/`
- [ ] Проверить, что Access matrix заполнена для всех endpoint'ов `/api/horses`
- [ ] Проверить, что `GET /api/horses` остаётся Public Read
- [ ] Проверить, что `POST/PATCH/DELETE` без auth → 400 ClientError (контракт не нарушен)
- [ ] Проверить, что каждая backend-фича имеет минимум 30 Unit checklist-пунктов с разными сценариями
- [ ] Проверить, что каждая backend-фича имеет минимум 30 Smoke checklist-пунктов на реальной PostgreSQL
- [ ] Проверить, что smoke-тесты берут параметры из `docker inspect eqsitecms-db` без хардкода
- [ ] Проверить FSD: нет `shared`/`widgets`/`entities` в новом коде
- [ ] Проверить: нет `page/limit` как API contract (только `limit/offset`)
- [ ] Проверить: иконки только из `@ant-design/icons` или `@mui/icons-material`
- [ ] Проверить: форма лошади валидируется через Zod перед отправкой
- [ ] Проверить: нет прямых API-imports в `page.tsx`
- [ ] Запустить из `services/backend`: `make format` — чисто
- [ ] Запустить из `services/backend`: `make test` — все тесты зелёные
- [ ] Запустить из `services/backend`: `make lint` — чисто
- [ ] Запустить из `services/frontend`: `npm test` — все тесты зелёные
- [ ] Запустить из `services/frontend`: `npm run lint` — чисто
- [ ] Запустить из `services/frontend`: `npx tsc --noEmit` — без ошибок типов
- [ ] Запустить из `services/frontend`: `npm run build` — успешная сборка
- [ ] Выполнить 22 manual QA шага в браузере, отправить результат для проверки
- [ ] После завершения основной реализации: передать задачу написания инструкций для 5 вкладок отдельному агенту с чистым контекстом
