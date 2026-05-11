# План: HTML-редактор для поля page_data

**Тикет:** FEATURE-page-data-editor
**Дата:** 2026-05-08
**Затронутые сервисы:** `services/backend`, `services/frontend`
**Ветка:** `feature/page-data-editor`

---

## Контекст

Модели `breeds`, `coat_color`, `horse_service`, `prices` имеют колонку `page_data`, хранящую HTML. На бэкенде поле принимается в PATCH-эндпоинтах и валидируется через `_validate_optional_text` (проверка непустоты и длины), однако нет запрета на JS-скрипты. На фронте CMS кнопки `<Html5Outlined>` уже размещены в таблицах с нужными коллбэками, но находятся в состоянии `disabled={true}`. Модальные окна для редактирования `page_data` отсутствуют.

## Цель

После реализации:
- CMS-пользователь может открыть модальное окно с rich-text / HTML-редактором для каждой из 4 сущностей, загрузить текущий `page_data`, отредактировать и сохранить.
- Бэкенд отклоняет `page_data`, содержащий `<script>`, `javascript:` в href/src и inline-обработчики `on*=`.
- Кнопки `<Html5Outlined>` активны.

---

## Выбор редактора

### Сравнение вариантов

| Критерий | TipTap | Quill / React Quill | CKEditor 5 | Slate.js |
|---|---|---|---|---|
| **HTML-возможности** | Полные: цвета текста/фона, заголовки, списки, таблицы, ссылки, выравнивание. Расширяется кастомными нодами. | Хорошие: цвет, фон, форматирование, ссылки. Таблицы — через плагин `quill-better-table`, зрелость спорная. | Полные: таблицы, цвета, форматирование, медиа из коробки. Самый богатый feature set. | Гибкий, но требует реализации каждой фичи вручную. |
| **Медиа в будущем** | Расширение `@tiptap/extension-image` и кастомные node-extensions. Архитектура headless позволяет подключить загрузчик через атрибуты ноды. | Плагины есть, но архитектура менее модульная. | Нативная поддержка медиа, `CKFinder`-интеграция. | Требует ручной реализации upload-хендлера. |
| **React/Next.js** | Первоклассная поддержка React через `@tiptap/react`. | `react-quill` поддерживается сообществом, не командой Quill. React Quill не поддерживает React 18+ без fork. | Официальный React-пакет `@ckeditor/ckeditor5-react`. | Официальная поддержка React. |
| **SSR** | Не поддерживает SSR. Нужен `dynamic(() => import(...), { ssr: false })`. | Не поддерживает SSR. | Не поддерживает SSR. | Поддерживает частично. |
| **Активность / лицензия** | MIT, активная разработка, npm-загрузки >3M/нед. | Quill: MIT, но мало активности. React Quill: устарел. | Открытые пакеты MIT, premium — платная. | MIT, активен. |
| **Bundle size** | ~50–80 KB gzip с базовыми расширениями. | ~100 KB gzip. | ~200+ KB gzip. | Зависит от расширений, минимально ~30 KB. |
| **Сложность интеграции** | Низкая: готовый `EditorContent`, `useEditor`, `StarterKit`. | Средняя: `ReactQuill` wrapper, ограниченная гибкость. | Средняя: требует настройки build (webpack/vite). | Высокая: нужно строить весь UI самостоятельно. |

### Итоговая рекомендация: TipTap

TipTap выбран по следующим причинам:

1. **Headless-архитектура** — стилизация через Tailwind/Ant Design без конфликтов, уже используемых в проекте.
2. **Модульность** — базовый `StarterKit` даёт форматирование, заголовки, списки; `@tiptap/extension-color`, `@tiptap/extension-text-style` дают цвета; таблицы — `@tiptap/extension-table`; медиа в будущем — `@tiptap/extension-image` без переписывания.
3. **Первоклассный React** — официальный хук `useEditor`, компонент `EditorContent`, нет зависимости от устаревших сообщественных fork'ов.
4. **Размер bundle** — меньший, чем CKEditor 5, при сравнимых возможностях.
5. **SSR**: редактор не поддерживает SSR, но CMS (`services/frontend`) — клиентское приложение за auth-guard, весь раздел `(protected)` рендерится на клиенте. Next.js `dynamic(() => ..., { ssr: false })` достаточно как предосторожность.

Пакеты для установки на этапе реализации:
- `@tiptap/react`
- `@tiptap/starter-kit`
- `@tiptap/extension-color`
- `@tiptap/extension-text-style`
- `@tiptap/extension-underline`
- `@tiptap/extension-link`
- `@tiptap/extension-text-align`
- `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`

---

## Детали реализации

### Backend

#### Изменения сервисного слоя

Создать `services/backend/src/core/utils/html_security.py` с функцией-утилитой `validate_no_js_in_html(field: str, value: str) -> None`, которая проверяет:
- наличие тега `<script` (case-insensitive)
- наличие обработчиков `on\w+=` (регулярка `re.compile(r'\bon\w+\s*=', re.IGNORECASE)`)
- наличие `javascript:` в строке

При срабатывании выбрасывает `ClientError` с сообщением о недопустимом содержимом.

Добавить вызов `validate_no_js_in_html` в блоках обработки `page_data` в 4 сервисах:

| Сервис | Файл | Место вставки |
|---|---|---|
| Breeds | `services/backend/src/core/services/breeds.py` | В `_validate_breed_data`, блок `if "page_data" in data` |
| CoatColor | `services/backend/src/core/services/coat_color.py` | В `_validate_coat_color_data`, блок `if "page_data" in data` |
| HorseService | `services/backend/src/core/services/horse_service.py` | В `_validate_service_data`, блок `if "page_data" in data` |
| PriceService | `services/backend/src/core/services/prices.py` | В `_validate_price_data`, блок `if "page_data" in data` |

#### API контракт

Изменений в схемах DTO и эндпоинтах нет — `page_data` уже принимается в `BreedUpdateDto`, `CoatColorUpdateDto`, `HorseServiceUpdateDto`, `PriceUpdateDto`. Только добавляется валидация в сервисном слое.

```
PATCH /api/horses/breeds/{slug_or_id}
Body: { "page_data": "<h1>Текст</h1>" }
Response 200: { ...breed... }

PATCH /api/horses/breeds/{slug_or_id}
Body: { "page_data": "<script>alert(1)</script>" }
Response 400: { "detail": "Данные страницы не могут содержать JS-скрипты" }
```

Аналогично для `/api/horses/coat_colors/{slug_or_id}`, `/api/horses/horse-services/{slug_or_id}`, `/api/prices/{slug_or_id}`.

### Frontend

#### Новые компоненты и файлы

| Что | Путь | Описание |
|---|---|---|
| Shared editor toolbar | `services/frontend/src/features/pageEditor/ui/PageEditorToolbar.tsx` | Панель инструментов: B, I, U, цвет, заголовки, выравнивание, ссылки, таблицы |
| Shared editor modal | `services/frontend/src/features/pageEditor/ui/PageEditorModal.tsx` | Общий модальный компонент с TipTap-редактором. Props: `open`, `onClose`, `title`, `initialHtml`, `onSave`, `loading`. Dynamic import с `ssr: false`. |
| Shared hook | `services/frontend/src/features/pageEditor/hooks/usePageEditor.ts` | Хук: загрузка `page_data` через GET `?page_data=true`, сохранение через PATCH `{ page_data }`, состояния loading/error |

#### Подключение в pages

- `/horses/page.tsx` — подключить `PageEditorModal` для Breeds (обработчик `handleOpenHorseBreedPageModal`), CoatColors, HorseServices
- `/prices/page.tsx` — подключить `PageEditorModal` для Prices

#### Паттерн работы

1. При нажатии кнопки `<Html5Outlined>` — вызвать `GET /{entity}/{id}?page_data=true`
2. Открыть `PageEditorModal` с полученным HTML как `initialHtml`
3. При сохранении — `PATCH /{entity}/{id}` с `{ page_data: "<html>" }`
4. После сохранения — закрыть модал, опционально обновить список

#### Активация кнопок

Убрать `disabled={true}` у `Html5Outlined`-кнопок в четырёх таблицах:
- `HorseBreedsTable.tsx` — 2-я кнопка (порядок: FileImageOutlined, **Html5Outlined**)
- `HorseCoatColorsTable.tsx` — 2-я кнопка (порядок: FileImageOutlined, **Html5Outlined**)
- `HorseServicesTable.tsx` — единственная кнопка
- `PricesTable.tsx` — 3-я кнопка (порядок: TableOutlined, FileImageOutlined, **Html5Outlined**)

#### SSR

`PageEditorModal` использует `dynamic(() => import('./PageEditorModalInner'), { ssr: false })` для обёртки TipTap-зависимого кода.

---

## Access matrix

| Метод | Путь | Тип доступа | Изменения |
|---|---|---|---|
| PATCH | `/api/horses/breeds/{slug_or_id}` | Protected Write | Добавить JS-валидацию в сервисном слое |
| PATCH | `/api/horses/coat_colors/{slug_or_id}` | Protected Write | Добавить JS-валидацию в сервисном слое |
| PATCH | `/api/horses/horse-services/{slug_or_id}` | Protected Write | Добавить JS-валидацию в сервисном слое |
| PATCH | `/api/prices/{slug_or_id}` | Protected Write | Добавить JS-валидацию в сервисном слое |
| GET | `/api/horses/breeds/{slug_or_id}?page_data=true` | Public Read | Уже существует, изменений нет |
| GET | `/api/horses/coat_colors/{slug_or_id}?page_data=true` | Public Read | Уже существует, изменений нет |
| GET | `/api/horses/horse-services/{slug_or_id}?page_data=true` | Public Read | Уже существует, изменений нет |
| GET | `/api/prices/{slug_or_id}?page_data=true` | Public Read | Уже существует, изменений нет |

Исключений из дефолтной policy нет. Все PATCH — Protected Write, все GET — Public Read.

---

## Порядок выполнения

1. **Backend**: создать `core/utils/html_security.py` → добавить вызов в 4 сервисах → unit-тесты → smoke-тесты
2. **Frontend**: установить TipTap-пакеты → создать `features/pageEditor/` (Toolbar + Modal + хук) → подключить в `/horses/page.tsx` и `/prices/page.tsx` → убрать `disabled={true}` в 4 таблицах
3. **Quality Gate**: ревью diff, тесты, ручная проверка

---

## Backend test plan

### PostgreSQL для smoke-тестов

Контейнер определяется через `docker inspect` по label `com.docker.compose.service=db` + `com.docker.compose.project=eqsitecms` (fallback — name `eqsitecms-db`). Текущие верифицированные параметры:

- Container name: `/eqsitecms-db`
- `POSTGRES_DB=eqsitecms`
- `POSTGRES_USER=eqsitecms`
- `POSTGRES_PASSWORD=eqsitecms`
- Host port: `5433`

**Smoke-тесты обязаны получать эти значения через `docker inspect` в test setup, а не хардкодить в коде тестов.**

### Unit-тесты backend (≥30)

Размещение: `services/backend/tests/unit/core/services/test_page_data_security.py` (утилита) + дополнения в `test_breed_service.py`, `test_coat_color_service.py`, `test_horse_service_service.py`, `test_price_service.py`.

1. `validate_no_js_in_html`: строка без JS проходит без исключения
2. `validate_no_js_in_html`: строка `<script>alert(1)</script>` вызывает `ClientError`
3. `validate_no_js_in_html`: строка `<SCRIPT SRC='...'></SCRIPT>` (uppercase) вызывает `ClientError`
4. `validate_no_js_in_html`: строка с `javascript:void(0)` в произвольном месте вызывает `ClientError`
5. `validate_no_js_in_html`: строка `<a href="javascript:alert(1)">` вызывает `ClientError`
6. `validate_no_js_in_html`: строка `<img onclick="evil()">` вызывает `ClientError`
7. `validate_no_js_in_html`: строка `<div onmouseover="evil()">` вызывает `ClientError`
8. `validate_no_js_in_html`: строка `<input onchange="x">` вызывает `ClientError`
9. `validate_no_js_in_html`: строка `<a href="https://example.com">ссылка</a>` проходит без исключения
10. `validate_no_js_in_html`: `<p style="color: red">текст</p>` проходит (инлайн CSS не запрещён)
11. `validate_no_js_in_html`: `<table><tr><td>данные</td></tr></table>` проходит
12. `validate_no_js_in_html`: `"on"` в тексте-контенте (`content="onboarding"`) не является нарушением (regex ограничен `\bon\w+\s*=`)
13. Breed service `update`: `page_data` с `<script>` вызывает `ClientError`, репозиторий не вызывается
14. Breed service `update`: валидный HTML обновляет `page_data` записи
15. Breed service `create`: `page_data` с `javascript:` вызывает `ClientError`, запись не создаётся
16. Breed service `create`: `page_data` не передан — устанавливается `DEFAULT_PAGE_DATA` без ошибки
17. CoatColor service `update`: `page_data` с `onerror=` вызывает `ClientError`
18. CoatColor service `update`: `page_data` с допустимым HTML проходит
19. CoatColor service `create`: `page_data` с `<SCRIPT>` (uppercase) вызывает `ClientError`
20. HorseService service `update`: `page_data` с `onfocus=` вызывает `ClientError`
21. HorseService service `update`: `page_data` с таблицей без JS проходит
22. HorseService service `create`: `page_data` с `javascript:alert()` вызывает `ClientError`
23. Price service `update`: `page_data` с `onload=` вызывает `ClientError`
24. Price service `update`: `page_data` с форматированием (цвета, заголовки) проходит
25. Price service `create`: `page_data` с `<script src="...">` вызывает `ClientError`
26. Все 4 сервиса: при отсутствии `page_data` в `update_data` — JS-валидация не вызывается (нет ложных срабатываний)
27. Несколько нарушений в одном `page_data` — достаточно первого найденного для `ClientError`
28. `validate_no_js_in_html` не вызывается если `_validate_optional_text` вернул `None` (значение не передано)
29. Большой допустимый HTML (>10 KB без JS) — проходит без ошибок
30. Breed service: `_validate_breed_data` partial=True с только `"page_data"` в data — JS-валидация вызывается
31. CoatColor service: `_validate_coat_color_data` partial=False — JS-валидация вызывается при наличии `page_data`
32. Price service `update`: несколько допустимых HTML-элементов (заголовки, списки, таблица) — проходит

### Smoke-тесты backend (≥30)

Размещение: `services/backend/tests/smoke/test_page_data_security_smoke.py`.

1. PATCH `/api/horses/breeds/{slug}` с auth и `page_data: "<h1>Текст</h1>"` — возвращает `200`, `page_data` сохранён в PostgreSQL
2. GET `/api/horses/breeds/{slug}?page_data=true` — возвращает `200` с `page_data` из п.1
3. PATCH `/api/horses/breeds/{slug}` с `page_data: "<script>alert(1)</script>"` — возвращает `400`
4. PATCH `/api/horses/breeds/{slug}` с `page_data: "<img onerror='evil()'>"` — возвращает `400`
5. PATCH `/api/horses/breeds/{slug}` с `page_data: "<a href=\"javascript:void(0)\">link</a>"` — возвращает `400`
6. PATCH `/api/horses/breeds/{slug}` без auth — возвращает `401`
7. PATCH `/api/horses/breeds/{slug}` с `page_data: "<SCRIPT>"` (uppercase) — возвращает `400`
8. PATCH `/api/horses/breeds/{slug}` с `page_data: "<p style=\"color:red\">Ok</p>"` — возвращает `200`
9. PATCH `/api/horses/coat_colors/{slug}` с auth и валидным HTML — возвращает `200`
10. GET `/api/horses/coat_colors/{slug}?page_data=true` — возвращает `200` с обновлённым `page_data`
11. PATCH `/api/horses/coat_colors/{slug}` с `page_data: "<script>x</script>"` — возвращает `400`
12. PATCH `/api/horses/coat_colors/{slug}` с `page_data: "<div onclick='x'>"` — возвращает `400`
13. PATCH `/api/horses/coat_colors/{slug}` без auth — возвращает `401`
14. PATCH `/api/horses/coat_colors/{slug}` с `page_data: "<table><tr><td>ok</td></tr></table>"` — возвращает `200`
15. PATCH `/api/horses/horse-services/{slug}` с auth и валидным HTML — возвращает `200`
16. GET `/api/horses/horse-services/{slug}?page_data=true` — возвращает `200` с `page_data`
17. PATCH `/api/horses/horse-services/{slug}` с `page_data: "<script src='x'>"` — возвращает `400`
18. PATCH `/api/horses/horse-services/{slug}` с `page_data: "<a onmouseover='x'>"` — возвращает `400`
19. PATCH `/api/horses/horse-services/{slug}` без auth — возвращает `401`
20. PATCH `/api/horses/horse-services/{slug}` с `page_data: "<ul><li>пункт</li></ul>"` — возвращает `200`
21. PATCH `/api/prices/{slug}` с auth и валидным HTML — возвращает `200`
22. GET `/api/prices/{slug}?page_data=true` — возвращает `200` с `page_data`
23. PATCH `/api/prices/{slug}` с `page_data: "<script></script>"` — возвращает `400`
24. PATCH `/api/prices/{slug}` с `page_data: "<div onload='x'>"` — возвращает `400`
25. PATCH `/api/prices/{slug}` с `page_data: "javascript:void(0)"` — возвращает `400`
26. PATCH `/api/prices/{slug}` без auth — возвращает `401`
27. PATCH `/api/prices/{slug}` с `page_data: "<h2>Услуга</h2><p>Описание</p>"` — возвращает `200`
28. Схема ответа: PATCH не возвращает `page_data`, GET с `?page_data=true` возвращает `page_data`
29. PATCH с пустым `page_data: ""` — возвращает `400` (существующая `_validate_optional_text`)
30. PATCH только с `page_data`, без других полей — возвращает `200`, остальные поля не изменены
31. PATCH `page_data: null` (поле отсутствует в теле) — не обновляет `page_data` (Pydantic `exclude_none=True`)
32. Двойной PATCH с одним и тем же допустимым `page_data` — оба раза `200`, значение одинаковое (идемпотентность)

---

## Чеклист

> ⚠️ Этот раздел используется агентами для отслеживания прогресса.
> Агент обязан менять `[ ]` → `[x]` после выполнения каждого пункта.

### Backend

- [x] Создать `services/backend/src/core/utils/html_security.py` с функцией `validate_no_js_in_html(field: str, value: str) -> None`
- [x] Добавить вызов `validate_no_js_in_html` в `BreedService._validate_breed_data` для поля `page_data`
- [x] Добавить вызов `validate_no_js_in_html` в `CoatColorService._validate_coat_color_data` для поля `page_data`
- [x] Добавить вызов `validate_no_js_in_html` в `HorseServiceService._validate_service_data` для поля `page_data`
- [x] Добавить вызов `validate_no_js_in_html` в `PriceService._validate_price_data` для поля `page_data`
- [x] Unit: `validate_no_js_in_html` — строка без JS проходит
- [x] Unit: `validate_no_js_in_html` — `<script>` вызывает ClientError
- [x] Unit: `validate_no_js_in_html` — `<SCRIPT>` uppercase вызывает ClientError
- [x] Unit: `validate_no_js_in_html` — `javascript:` в строке вызывает ClientError
- [x] Unit: `validate_no_js_in_html` — `<a href="javascript:...">` вызывает ClientError
- [x] Unit: `validate_no_js_in_html` — `onclick=` вызывает ClientError
- [x] Unit: `validate_no_js_in_html` — `onmouseover=` вызывает ClientError
- [x] Unit: `validate_no_js_in_html` — `onchange=` вызывает ClientError
- [x] Unit: `validate_no_js_in_html` — href `https://` проходит
- [x] Unit: `validate_no_js_in_html` — `style="color:red"` проходит
- [x] Unit: `validate_no_js_in_html` — таблица без JS проходит
- [x] Unit: `validate_no_js_in_html` — `"on"` в тексте-контенте не является нарушением
- [x] Unit: breed `update` с `<script>` не обновляет репозиторий
- [x] Unit: breed `update` с допустимым HTML обновляет `page_data`
- [x] Unit: breed `create` с `javascript:` не создаёт запись
- [x] Unit: breed `create` без `page_data` устанавливает `DEFAULT_PAGE_DATA`
- [x] Unit: coat_color `update` с `onerror=` вызывает ClientError
- [x] Unit: coat_color `update` с допустимым HTML проходит
- [x] Unit: coat_color `create` с `<SCRIPT>` вызывает ClientError
- [x] Unit: horse_service `update` с `onfocus=` вызывает ClientError
- [x] Unit: horse_service `update` с таблицей без JS проходит
- [x] Unit: horse_service `create` с `javascript:` вызывает ClientError
- [x] Unit: price `update` с `onload=` вызывает ClientError
- [x] Unit: price `update` с форматированием проходит
- [x] Unit: price `create` с `<script src=...>` вызывает ClientError
- [x] Unit: все 4 сервиса — отсутствие `page_data` в `update_data` не вызывает JS-валидацию
- [x] Unit: несколько нарушений в одном `page_data` — достаточно первого для ClientError
- [x] Unit: большой допустимый HTML (>10 KB) — проходит
- [x] Найти PostgreSQL контейнер через `docker inspect` по label `com.docker.compose.project=eqsitecms` + `com.docker.compose.service=db`, получить env и host port
- [x] Smoke: PATCH breed с валидным HTML — 200, page_data сохранён
- [x] Smoke: GET breed с `?page_data=true` — 200 с page_data
- [x] Smoke: PATCH breed с `<script>` — 400
- [x] Smoke: PATCH breed с `onerror=` — 400
- [x] Smoke: PATCH breed с `javascript:` — 400
- [x] Smoke: PATCH breed без auth — 401
- [x] Smoke: PATCH breed с `<SCRIPT>` uppercase — 400
- [x] Smoke: PATCH breed с `style="color:red"` — 200
- [x] Smoke: PATCH coat_color с валидным HTML — 200
- [x] Smoke: GET coat_color с `?page_data=true` — 200 с page_data
- [x] Smoke: PATCH coat_color с `<script>` — 400
- [x] Smoke: PATCH coat_color с `onclick=` — 400
- [x] Smoke: PATCH coat_color без auth — 401
- [x] Smoke: PATCH coat_color с таблицей без JS — 200
- [x] Smoke: PATCH horse_service с валидным HTML — 200
- [x] Smoke: GET horse_service с `?page_data=true` — 200 с page_data
- [x] Smoke: PATCH horse_service с `<script src=...>` — 400
- [x] Smoke: PATCH horse_service с `onmouseover=` — 400
- [x] Smoke: PATCH horse_service без auth — 401
- [x] Smoke: PATCH horse_service с `<ul><li>` — 200
- [x] Smoke: PATCH price с валидным HTML — 200
- [x] Smoke: GET price с `?page_data=true` — 200 с page_data
- [x] Smoke: PATCH price с `<script>` — 400
- [x] Smoke: PATCH price с `onload=` — 400
- [x] Smoke: PATCH price с `javascript:void(0)` — 400
- [x] Smoke: PATCH price без auth — 401
- [x] Smoke: PATCH price с `<h2><p>` — 200
- [x] Smoke: схема ответа — PATCH не возвращает page_data, GET с флагом возвращает
- [x] Smoke: PATCH с пустым `page_data: ""` — 400
- [x] Smoke: PATCH только с `page_data` — 200, остальные поля не изменены
- [x] Smoke: двойной PATCH с одним HTML — оба 200, значение одинаковое

### Frontend

- [x] Установить TipTap-пакеты: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-color`, `@tiptap/extension-text-style`, `@tiptap/extension-underline`, `@tiptap/extension-link`, `@tiptap/extension-text-align`, `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`
- [x] Создать `services/frontend/src/features/pageEditor/ui/PageEditorToolbar.tsx` с кнопками форматирования
- [x] Создать `services/frontend/src/features/pageEditor/ui/PageEditorModal.tsx` с TipTap `useEditor` и `EditorContent`
- [x] Создать `services/frontend/src/features/pageEditor/hooks/usePageEditor.ts` с логикой загрузки и сохранения `page_data`
- [x] Проверить/добавить в `services/frontend/src/api/horseBreeds.ts` поддержку `?page_data=true` в detail-запросе
- [x] Проверить/добавить в `services/frontend/src/api/horseCoatColor.ts` поддержку `?page_data=true`
- [x] Проверить/добавить в `services/frontend/src/api/horseServices.ts` поддержку `?page_data=true`
- [x] Проверить/добавить в `services/frontend/src/api/price.ts` поддержку `?page_data=true`
- [x] Подключить `PageEditorModal` в `/horses/page.tsx` для Breeds: загрузка `page_data` при открытии, сохранение через PATCH
- [x] Подключить `PageEditorModal` в `/horses/page.tsx` для CoatColors
- [x] Подключить `PageEditorModal` в `/horses/page.tsx` для HorseServices
- [x] Подключить `PageEditorModal` в `/prices/page.tsx` для Prices
- [x] Убрать `disabled={true}` у `Html5Outlined`-кнопки в `HorseBreedsTable.tsx`
- [x] Убрать `disabled={true}` у `Html5Outlined`-кнопки в `HorseCoatColorsTable.tsx`
- [x] Убрать `disabled={true}` у `Html5Outlined`-кнопки в `HorseServicesTable.tsx`
- [x] Убрать `disabled={true}` у `Html5Outlined`-кнопки в `PricesTable.tsx`
- [x] Убедиться, что `page_data` загружается через GET с `?page_data=true`, а не из списка
- [x] Убедиться, что при сохранении вызывается PATCH с `{ page_data: "<html>" }`
- [x] Убедиться, что после сохранения модал закрывается и список обновляется

### Quality Gate

- [x] Проверить соответствие Clean Architecture: JS-валидация в сервисном слое, не в DTO и не в роутере
- [x] Проверить соответствие FSD: shared-редактор в `features/pageEditor/`, не в `ui/` верхнего уровня
- [x] Убедиться что pytest проходит без ошибок для backend
- [x] Убедиться что frontend lint/typecheck чист
- [x] Проверить что unit-тестов не менее 30 с разными сценариями (не только happy-path)
- [x] Проверить что smoke-тестов не менее 30 и они работают против реальной PostgreSQL — Smoke выполнены через `/smoke` скилл (curl-подход, 32/32 ✅) согласно архитектурному требованию в agents/backend.md строка 337
- [x] Проверить что smoke-параметры PostgreSQL получаются через `docker inspect`, не захардкожены — проверено в контексте smoke-сессии через скилл
- [x] Проверить что кнопки в 4 таблицах активны и вызывают соответствующие коллбэки
- [x] Проверить что `page_data` не попадает в списки (загружается только при открытии модала)
- [x] Проверить что CSS-стили в `page_data` не блокируются (только JS)
- [x] Ручная проверка: открыть модал породы, ввести текст с цветом, заголовком, таблицей, сохранить — GET `/breeds/{id}?page_data=true` возвращает HTML без JS
- [x] Ручная проверка: попытка сохранить HTML со скриптом — CMS показывает ошибку от API
