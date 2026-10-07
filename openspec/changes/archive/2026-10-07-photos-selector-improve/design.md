## Context

**Текущее состояние:**
- PhotoSelectorModal используется для выбора фотографий к услугам, новостям и лошадям
- Компоненты: PhotoSelectorModal (контейнер), PhotoSelectorList (сетка), PhotoElement (карточка фото)
- Текущий layout: Ant Design Row/Col с адаптивными flex-пропорциями (`xs: 100%`, `sm: 50%`, `md: 40%`, `lg: 20%`, `xl: 10%`)
- Workflow загрузки: сначала загрузить в галерею через отдельную форму (`AddPhotosModal`), затем выбрать в PhotoSelectorModal
- API текущий: 
  - `POST /photos` (Protected Write) — загрузка фото в галерею (single file)
  - `POST /prices/{id}/photos` (Protected Write) — обновление списка photo_ids для услуги
  - `POST /horses/{id}/photos` (Protected Write) — обновление списка photo_ids для лошади
  - `POST /news/{id}/photos` (Protected Write, предполагается) — обновление списка photo_ids для новости

**Ограничения:**
- Нужна обратная совместимость с текущими страницами (услуги, новости, лошади)
- Компоненты переиспользуются, изменения должны работать везде
- Можно и нужно менять backend API для чистоты архитектуры

**Stakeholders:**
- Администраторы CMS (основные пользователи)
- Backend agent (новые endpoints для upload+attach)
- Frontend agent (UI и интеграция с новыми endpoints)
- Quality Gate (проверка архитектуры, UX и тестов)

## Goals / Non-Goals

**Goals:**
- Фиксированная сетка 4 фотографии в ряд (первый ряд всегда заполнен, последний прижат слева)
- Прямая загрузка фотографий через file picker прямо из PhotoSelectorModal
- Поддержка drag-and-drop для загрузки фотографий
- Автоматическое присоединение загруженных фото к текущей сущности **одним запросом**
- Сохранение существующего функционала (выбор/отмена, main photo)
- Чистая архитектура без "колхоза" на frontend

**Non-Goals:**
- Изменение логики галереи (AddPhotosModal остаётся как есть)
- Редактирование метаданных фото (name, description) в PhotoSelectorModal
- Progress tracking для больших файлов (можно добавить позже)

## Decisions

### 1. Фиксированная сетка через CSS Grid вместо Ant Design flex

**Решение:** Заменить Row/Col с flex на CSS Grid с `grid-template-columns: repeat(4, 1fr)`

**Обоснование:**
- Flex с процентными значениями растягивает элементы при неполном ряду
- CSS Grid позволяет фиксировать количество колонок и автоматически прижимает неполный последний ряд влево
- Ant Design Row gutter можно сохранить через gap в grid

**Альтернативы:**
- Flex с `max-width` на карточках — сложнее управлять последним рядом
- Tailwind arbitrary grid — менее читаемо, но возможно использовать

### 2. Upload UI интегрируется в PhotoSelectorModal

**Решение:** Добавить кнопку "Загрузить" в header PhotoSelectorModal под заголовком "Добавить ещё" с:
- File input (скрытый, триггерится кнопкой)
- Drag-and-drop зона поверх существующего PhotoSelectorList
- Multiple files support

**Обоснование:**
- Минимальные изменения UI — кнопка в существующем месте
- Не требуется новый модал или отдельная форма
- Drag-and-drop интуитивен для пользователей

**Альтернативы:**
- Отдельный UploadPhotosModal — усложняет navigation, лишний клик
- Замена AddPhotosModal — нарушает backward compatibility с галереей

### 3. **NEW: Entity-specific batch upload+attach endpoints вместо двухэтапного процесса**

**Решение:** Создать специализированные endpoints для каждого типа сущности:
- `POST /prices/{id}/photos/upload` — batch upload + auto-attach для услуги
- `POST /horses/{id}/photos/upload` — batch upload + auto-attach для лошади
- `POST /news/{id}/photos/upload` — batch upload + auto-attach для новости

**Формат запроса:**
- `multipart/form-data` с несколькими `files[]` полями
- Опциональные `names[]` и `descriptions[]` массивы для метаданных (по индексу)

**Формат ответа:**
- `200 OK` с массивом загруженных `PhotoOutShortDto[]`
- Partial success: успешные фото в `photos`, ошибки в `errors: [{index, message}]`

**Обоснование:**
- **Атомарность**: один HTTP запрос вместо N×`POST /photos` + 1×`POST /{entity}/photos`
- **Простота frontend**: один вызов API вместо цепочки последовательных запросов
- **Лучшая обработка ошибок**: backend знает контекст entity, может валидировать и откатывать транзакцию
- **Производительность**: меньше round-trips, можно обработать все файлы в одной транзакции БД

**Альтернативы рассмотрены:**

#### Alt 1: Универсальный `POST /photos/batch-upload-attach`
```json
{
  "files": [...],
  "entity_type": "price",
  "entity_id": "uuid"
}
```
**Отклонено:** 
- Размывает границы ownership (один endpoint для всех entity типов)
- Сложнее access control (нужна проверка прав на разные entity типы в одном месте)
- Нарушает RESTful принцип (операция над price должна быть в `/prices/**`)

#### Alt 2: `POST /photos/batch` + отдельный `POST /{entity}/photos`
**Отклонено:**
- Всё ещё два запроса вместо одного
- Нет атомарности (загрузка успешна, но attach может упасть)
- Frontend усложняется обработкой partial success на двух этапах

#### Alt 3: Параллельная загрузка N×`POST /photos` + batch attach
**Отклонено:**
- Сложная обработка ошибок (какие файлы прошли, какие нет)
- Race conditions при параллельных запросах
- Перегрузка backend при большом N
- Всё равно остаётся два этапа (upload, attach)

### 4. Drag-and-drop через нативный browser API

**Решение:** Использовать нативные события `dragover`, `drop` без библиотек типа react-dropzone

**Обоснование:**
- Малый объём кода
- Нет дополнительных зависимостей
- Достаточно для file upload use case

**Альтернативы:**
- react-dropzone — overkill для простого upload
- Ant Design Upload — конфликтует с существующим layout PhotoSelectorList

### 5. Backend реализация batch upload+attach

**Решение:** Добавить метод `upload_and_attach_photos` в entity services (PriceService, HorseService, NewsService):
1. Валидация прав доступа к entity (current_user может редактировать эту сущность)
2. Для каждого файла:
   - Загрузить файл в storage (S3/local)
   - Создать запись Photo в БД
3. Обновить entity.photo_ids массив (append новые IDs)
4. Вернуть массив созданных PhotoOutShortDto

**Транзакция:**
- Весь процесс оборачивается в database transaction
- При ошибке любого файла — rollback всех созданных Photo records
- Опционально: можно сделать partial success (успешные фото коммитятся, ошибочные пропускаются с отчётом)

**Обоснование:**
- Переиспользование существующей логики PhotoService.create
- Атомарность операции upload+attach
- Entity service знает правила валидации для своей сущности (например, price может иметь max 10 фото)

### 6. Ownership и Execution Units

**Ownership:**
- **Backend agent** владеет:
  - `services/backend/src/api/prices.py` (новый endpoint)
  - `services/backend/src/api/horses.py` (новый endpoint)
  - `services/backend/src/api/news.py` (новый endpoint)
  - `services/backend/src/core/services/prices.py` (новый метод)
  - `services/backend/src/core/services/horses.py` (новый метод)
  - `services/backend/src/core/services/news.py` (новый метод, если не существует)
  - `services/backend/src/core/schemas/prices.py` (новые DTOs)
  - `services/backend/src/core/schemas/horses.py` (новые DTOs)
  - `services/backend/src/core/schemas/news.py` (новые DTOs)
  - Backend unit tests

- **Frontend agent** владеет:
  - `services/frontend/src/features/photoSelector/**`
  - `services/frontend/src/api/photos.ts` (новая функция для batch upload+attach)
  - Frontend tests

**Execution Units:**
```
BE-1: Schemas + DTOs для batch upload+attach (prices, horses, news)
  ↓
BE-2: Service methods upload_and_attach_photos (prices, horses, news)
  ↓
BE-3: API endpoints POST /{entity}/{id}/photos/upload (prices, horses, news)
  ↓
BE-4: Backend unit tests (transaction rollback, partial success, access control)
  ↓
FE-1: Layout refactoring (PhotoSelectorList → CSS Grid, PhotoElement sizing)
  ↓
FE-2: Upload UI (button, file input, handlers в PhotoSelectorModal)
  ↓
FE-3: API integration (usePhotoSelector hook → batch upload+attach endpoint)
  ↓
FE-4: Drag-and-drop integration
  ↓
FE-5: Frontend tests (PhotoSelectorModal.test.tsx updates, browser QA)
```

**Обоснование разбиения:**
- BE-1..BE-4: Backend реализация атомарна, тестируется изолированно
- FE-1: изолированные CSS изменения, простая verification
- FE-2: UI без API calls, тестируется с mocks
- FE-3: интеграция с реальными endpoints, требует BE-1..BE-3
- FE-4: независимая feature поверх FE-2+FE-3
- FE-5: regression tests и manual QA

**Зависимости:**
- FE-3 зависит от BE-3 (endpoints должны быть готовы)
- FE-4 зависит от FE-3 (drag-and-drop использует ту же upload функцию)
- FE-5 зависит от FE-1..FE-4 (все features реализованы)

**Quality Gate lanes:**
- `QG-BE`: backend unit/integration тесты, Clean Architecture, access policy на коде
- `QG-FE`: frontend lint, tsc, build, unit tests
- `QG-CONTRACTS`: соответствие specs (layout, upload, dnd, access matrix)
- `QG-LIVE`: smoke test через реальный `POST /prices/{id}/photos/upload` с PostgreSQL
- `QG-SYNTH`: финальный вердикт

## Risks / Trade-offs

### [Risk] Batch upload может упасть на одном файле и откатить все предыдущие
**Mitigation:** Реализовать partial success mode: каждый файл обрабатывается независимо, успешные коммитятся, ошибочные возвращаются в `errors[]`. Frontend показывает детальный feedback.

### [Risk] Большие файлы могут превысить timeout HTTP запроса
**Mitigation:** 
- Backend увеличивает timeout для upload endpoints (например, 5 минут вместо 30 секунд)
- Frontend показывает loading indicator
- Валидация размера файла на frontend (max 10MB per file, можно настроить)
- Будущее улучшение: chunked upload с progress tracking

### [Risk] CSS Grid может не работать в старых браузерах
**Mitigation:** CSS Grid поддерживается всеми современными браузерами (Chrome 57+, Firefox 52+, Safari 10.1+). EqSiteCMS — внутренний admin tool, требования к браузерам управляемы. Fallback не требуется.

### [Risk] Drag-and-drop может конфликтовать с existing drag для reorder (если добавят в будущем)
**Mitigation:** Сейчас reorder не реализован. Если потребуется, разделим drag zones или используем modifier key (Ctrl+drag для upload, обычный drag для reorder)

### [Trade-off] Создание 3 похожих endpoints для prices/horses/news вместо одного универсального
**Обоснование:** 
- Каждый entity type может иметь свои правила валидации (max photos, required fields)
- Access control разный для разных entity (права на редактирование price != права на редактирование horse)
- RESTful принцип: операция над price живёт в `/prices/**`
- Цена дублирования кода минимальна (переиспользуем PhotoService.create)
- Выигрыш: чистота архитектуры, явный ownership, простота тестирования

### [Trade-off] Partial success усложняет frontend обработку
**Обоснование:** 
- Partial success даёт лучший UX (пользователь видит, что 4 из 5 файлов загружены успешно)
- Альтернатива "всё или ничего" хуже при большом количестве файлов (один плохой файл блокирует все остальные)
- Frontend уже показывает toast notifications, легко добавить обработку `errors[]` из ответа
