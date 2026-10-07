## 1. Backend Schemas + DTOs (BE-1)

- [ ] 1.1 Создать `PricePhotosUploadDto` в `services/backend/src/core/schemas/prices.py`
- [ ] 1.2 Создать `HorsePhotosUploadDto` в `services/backend/src/core/schemas/horses.py`
- [ ] 1.3 Создать `NewsPhotosUploadDto` в `services/backend/src/core/schemas/news.py` (если не существует)
- [ ] 1.4 Создать `PhotoBatchUploadResponseDto` в `services/backend/src/core/schemas/photos.py` с полями `photos: list[PhotoOutShortDto]`, `errors: list[dict]`
- [ ] 1.5 Валидация: max 20 files, min 1 file, optional names[] и descriptions[]

## 2. Backend Service Methods (BE-2)

- [ ] 2.1 Реализовать `upload_and_attach_photos` в `PriceService` (services/backend/src/core/services/prices.py)
- [ ] 2.2 Реализовать `upload_and_attach_photos` в `HorseService` (services/backend/src/core/services/horses.py)
- [ ] 2.3 Реализовать `upload_and_attach_photos` в `NewsService` (services/backend/src/core/services/news.py)
- [ ] 2.4 Логика partial success: обработка ошибок по файлам, возврат успешных + массив errors
- [ ] 2.5 Переиспользование `PhotoService.create` для каждого файла
- [ ] 2.6 Обновление entity.photo_ids массива после успешной загрузки каждого файла

## 3. Backend API Endpoints (BE-3)

- [ ] 3.1 Добавить `POST /prices/{id}/photos/upload` endpoint в services/backend/src/api/prices.py
- [ ] 3.2 Добавить `POST /horses/{id}/photos/upload` endpoint в services/backend/src/api/horses.py
- [ ] 3.3 Добавить `POST /news/{id}/photos/upload` endpoint в services/backend/src/api/news.py
- [ ] 3.4 Multipart/form-data parsing: files[], names[], descriptions[]
- [ ] 3.5 Access control: Protected Write (current_user required, owner check)
- [ ] 3.6 Response format: PhotoBatchUploadResponseDto с photos[] и errors[]

## 4. Backend Unit Tests (BE-4)

- [ ] 4.1 Тесты для PriceService.upload_and_attach_photos (success, partial success, full failure)
- [ ] 4.2 Тесты для HorseService.upload_and_attach_photos
- [ ] 4.3 Тесты для NewsService.upload_and_attach_photos
- [ ] 4.4 Тесты для access control (401 без auth, 403 для чужого entity, 404 для несуществующего)
- [ ] 4.5 Тесты для валидации (max 20 files, min 1 file)
- [ ] 4.6 Тесты для partial success с разными ошибками (file too large, invalid format)
- [ ] 4.7 Запустить `PYTHONPATH=src uv run pytest -s -vv tests/unit`
- [ ] 4.8 Запустить `uv run mypy src`
- [ ] 4.9 Запустить `uv run isort src && uv run black src`

## 5. Frontend Layout Refactoring (FE-1)

- [x] 5.1 Изменить PhotoSelectorList: заменить Ant Design Row с flex на CSS Grid с `grid-template-columns: repeat(4, 1fr)`
- [x] 5.2 Сохранить gap через CSS Grid gap вместо Ant Design gutter
- [x] 5.3 Обновить PhotoElement: убрать адаптивные Col flex-пропорции, использовать фиксированную ширину карточки
- [x] 5.4 Проверить responsive behavior на разных разрешениях (desktop, tablet)
- [x] 5.5 Визуально проверить: первый ряд полностью заполнен (если >= 4 фото), последний ряд прижат слева

## 6. Frontend Upload UI (FE-2)

- [ ] 6.1 Добавить кнопку "Загрузить" в PhotoSelectorModal под заголовком "Добавить ещё"
- [ ] 6.2 Добавить скрытый file input с атрибутами `type="file"`, `multiple`, `accept="image/*"`
- [ ] 6.3 Связать кнопку с file input через ref и onClick trigger
- [ ] 6.4 Добавить loading state во время upload (disable кнопки, показать spinner)

## 7. Frontend API Integration (FE-3)

- [ ] 7.1 Создать API функции в src/api/photos.ts:
  - [ ] 7.1.1 `uploadPhotosToPrice(priceId, files, names?, descriptions?)` → POST /prices/{id}/photos/upload
  - [ ] 7.1.2 `uploadPhotosToHorse(horseId, files, names?, descriptions?)` → POST /horses/{id}/photos/upload
  - [ ] 7.1.3 `uploadPhotosToNews(newsId, files, names?, descriptions?)` → POST /news/{id}/photos/upload
- [ ] 7.2 Расширить usePhotoSelector hook: добавить `uploadPhotos` функцию
- [ ] 7.3 Реализовать `uploadPhotos`: вызов batch upload+attach endpoint в зависимости от entityType
- [ ] 7.4 Обработка response: успешные фото добавить в selectedPhotos, errors показать через notifications
- [ ] 7.5 Показывать success notification "Загружено N фотографий"
- [ ] 7.6 Показывать error notifications для каждого failed файла из errors[]
- [ ] 7.7 Обработка HTTP ошибок (401, 403, 404, 422, 500)

## 8. Frontend Drag-and-Drop (FE-4)

- [ ] 8.1 Добавить state `isDragOver` в PhotoSelectorModal для визуальной индикации
- [ ] 8.2 Реализовать обработчики `onDragOver`, `onDragLeave`, `onDrop` на контейнере PhotoSelectorList
- [ ] 8.3 Валидация dropped файлов: проверить тип (только image/*), показать error для не-изображений
- [ ] 8.4 При успешном drop вызывать `uploadPhotos` из usePhotoSelector hook
- [ ] 8.5 Добавить визуальную индикацию drag-over (border/background change)
- [ ] 8.6 Блокировка concurrent drop: если уже идёт загрузка, показать "Файлы уже загружаются, подождите..."

## 9. Frontend Tests (FE-5)

- [ ] 9.1 Обновить PhotoSelectorModal.test.tsx: добавить тесты для кнопки "Загрузить"
- [ ] 9.2 Добавить mock для file input change event с FileList
- [ ] 9.3 Mock batch upload API endpoints, проверить вызовы с правильными entityType и files
- [ ] 9.4 Тесты для обработки partial success response (photos[] + errors[])
- [ ] 9.5 Добавить тесты для drag-and-drop handlers (dragover, drop)
- [ ] 9.6 Тесты на обработку ошибок загрузки (401, 403, 422)
- [ ] 9.7 Regression тесты: добавление из галереи (PlusOutlined) продолжает работать
- [ ] 9.8 Regression тесты: установка главной фотографии (StarOutlined) работает после upload
- [ ] 9.9 Запустить `npm test` в services/frontend
- [ ] 9.10 Запустить `tsc --noEmit`
- [ ] 9.11 Запустить `npm run lint`
- [ ] 9.12 Запустить `npm run build`

## 10. Manual Browser QA (FE-6)

- [ ] 10.1 Проверить layout на разных разрешениях (desktop, tablet)
- [ ] 10.2 Проверить upload через file picker для услуги (price)
- [ ] 10.3 Проверить upload через file picker для лошади (horse)
- [ ] 10.4 Проверить upload через file picker для новости (news)
- [ ] 10.5 Проверить drag-and-drop для всех entity types
- [ ] 10.6 Проверить partial success: загрузить 1 валидный + 1 слишком большой файл
- [ ] 10.7 Проверить concurrent drop блокировку
- [ ] 10.8 Проверить infinite scroll после добавления drag-and-drop зоны
- [ ] 10.9 Проверить backward compatibility: добавление из галереи + upload в одной сессии

## 11. Quality Gate

- [ ] 11.1 QG-BE lane: Clean Architecture review, access policy на коде, unit tests coverage
- [ ] 11.2 QG-FE lane: lint, tsc, build, unit tests coverage
- [ ] 11.3 QG-CONTRACTS lane: проверить access matrix, соответствие specs (batch endpoints, partial success)
- [ ] 11.4 QG-LIVE lane: smoke test через реальный `POST /prices/{id}/photos/upload` с PostgreSQL
- [ ] 11.5 QG-SYNTH lane: свести findings всех lanes, вынести вердикт APPROVED/REWORK
- [ ] 11.6 Устранить findings (если REWORK), повторить затронутые lanes
- [ ] 11.7 Создать отчёт Quality Gate в docs/reports/photos-selector-improve-qg.md

## 12. Finalization

- [ ] 12.1 Sync delta specs: запустить `openspec sync specs --change photos-selector-improve`
- [ ] 12.2 Validate синхронизированные main specs: `openspec validate --strict`
- [ ] 12.3 Archive change: `openspec archive --change photos-selector-improve`
- [ ] 12.4 Обновить changelog (если применимо)
