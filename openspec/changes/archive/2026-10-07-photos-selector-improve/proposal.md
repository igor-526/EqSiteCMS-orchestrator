## Why

Текущий процесс добавления фотографий к сущностям (услуги, новости, лошади) в CMS является неудобным: администратор должен сначала загрузить фотографии в общую галерею, а затем выбрать их в форме редактирования сущности. Этот двухэтапный процесс требует N+1 HTTP запросов (N загрузок в галерею + 1 обновление entity) и усложняет обработку ошибок. Кроме того, визуальное отображение выбранных и доступных фотографий неоптимально — при малом количестве фото в ряду они растягиваются по всей ширине, что ухудшает UX.

## What Changes

### Frontend Changes
- **UI/Layout**: Изменение сетки отображения фотографий с адаптивного растягивания на фиксированную сетку 4 фото в ряд
- **Upload Flow**: Добавление кнопки "Загрузить" непосредственно в PhotoSelectorModal с поддержкой file picker и drag-and-drop
- **Auto-attach**: Автоматическое присоединение загруженных фотографий к текущей сущности одним запросом
- Улучшение компонентов `PhotoSelectorModal`, `PhotoSelectorList`, `PhotoElement`
- Интеграция с новыми batch upload+attach endpoints

### Backend Changes
- **NEW: Batch upload+attach endpoints** для атомарной загрузки и присоединения фотографий:
  - `POST /prices/{id}/photos/upload` — batch upload + auto-attach для услуги
  - `POST /horses/{id}/photos/upload` — batch upload + auto-attach для лошади
  - `POST /news/{id}/photos/upload` — batch upload + auto-attach для новости
- **Формат**: `multipart/form-data` с массивом `files[]`, опциональными `names[]` и `descriptions[]`
- **Ответ**: `200 OK` с массивом `PhotoOutShortDto[]` + опциональный `errors[]` для partial success
- **Access**: Protected Write (требуется авторизация + права на редактирование entity)
- Добавление методов `upload_and_attach_photos` в entity services (PriceService, HorseService, NewsService)
- Новые DTOs для batch upload в schemas (prices, horses, news)

## Capabilities

### New Capabilities

- `photo-upload-ui`: UI компоненты для прямой загрузки фотографий с file picker и drag-and-drop поддержкой в контексте PhotoSelectorModal
- `photo-batch-upload-attach`: Backend API для атомарной загрузки нескольких фотографий и автоматического присоединения к entity за один HTTP запрос

### Modified Capabilities

<!-- Изменений на уровне требований к существующим capabilities не требуется. -->

## Impact

**Frontend (services/frontend)**:
- `src/features/photoSelector/ui/PhotoSelectorModal.tsx` — добавление кнопки "Загрузить" и обработчиков
- `src/features/photoSelector/ui/PhotoSelectorList.tsx` — изменение grid layout с адаптивного на фиксированный (4 колонки)
- `src/features/photoSelector/ui/PhotoElement.tsx` — корректировка flex sizing для фиксированной сетки
- `src/features/photoSelector/hooks/usePhotoSelector.ts` — интеграция с batch upload+attach endpoints
- `src/api/photos.ts` — новые API функции для batch upload+attach
- Drag-and-drop зона интегрируется в PhotoSelectorList

**Backend (services/backend)**: 
- `src/api/prices.py` — новый endpoint `POST /prices/{id}/photos/upload`
- `src/api/horses.py` — новый endpoint `POST /horses/{id}/photos/upload`
- `src/api/news.py` — новый endpoint `POST /news/{id}/photos/upload`
- `src/core/services/prices.py` — новый метод `upload_and_attach_photos`
- `src/core/services/horses.py` — новый метод `upload_and_attach_photos`
- `src/core/services/news.py` — новый метод `upload_and_attach_photos`
- `src/core/schemas/prices.py` — новый DTO `PricePhotosUploadDto`
- `src/core/schemas/horses.py` — новый DTO `HorsePhotosUploadDto`
- `src/core/schemas/news.py` — новый DTO `NewsPhotosUploadDto`
- Backend unit tests для новых endpoints и methods

**Consumer Sites (site-*)**:
- Без изменений — изменения касаются только административного интерфейса CMS

**Access Policy Matrix**:

| Method | Path | Access Class | Roles | Expected без auth | Expected с auth |
|--------|------|--------------|-------|-------------------|-----------------|
| POST | `/prices/{id}/photos/upload` | Protected Write | admin | 401 Unauthorized | 200 OK (если owner) / 403 Forbidden (если не owner) |
| POST | `/horses/{id}/photos/upload` | Protected Write | admin | 401 Unauthorized | 200 OK (если owner) / 403 Forbidden (если не owner) |
| POST | `/news/{id}/photos/upload` | Protected Write | admin | 401 Unauthorized | 200 OK (если owner) / 403 Forbidden (если не owner) |
