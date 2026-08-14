## 1. Реализация PhotoSelector для лошадей

- [x] 1.1 Добавить полную логику usePhotoSelector для лошадей в horses/page.tsx
- [x] 1.2 Реализовать обработчик handleOpenHorsePhotosModal для открытия модального окна
- [x] 1.3 Реализовать обработчик handleUpdateHorsePhotos для обновления фотографий лошади
- [x] 1.4 Добавить PhotoSelectorModal в JSX с корректными пропсами (selectedPhotos, allPhotos, onUpdate, onLoadMorePhotos)
- [x] 1.5 Протестировать открытие модального окна и выбор фотографии

## 2. Удаление логики фотографий из таблицы пород

- [x] 2.1 Удалить пропс onOpenHorseBreedPhotosModal из интерфейса HorseBreedsTable
- [x] 2.2 Удалить использование onOpenHorseBreedPhotosModal из JSX HorseBreedsTable
- [x] 2.3 Удалить кнопку "Фотографии" из столбца "Действия" в HorseBreedsTable
- [x] 2.4 Обновить тесты для HorseBreedsTable (удалить ссылки на onOpenHorseBreedPhotosModal)

## 3. Удаление логики фотографий из таблицы мастей

- [x] 3.1 Удалить пропс onOpenHorseCoatColorPhotosModal из интерфейса HorseCoatColorsTable
- [x] 3.2 Удалить использование onOpenHorseCoatColorPhotosModal из JSX HorseCoatColorsTable
- [x] 3.3 Удалить кнопку "Фотографии" из столбца "Действия" в HorseCoatColorsTable
- [x] 3.4 Обновить тесты для HorseCoatColorsTable (удалить ссылки на onOpenHorseCoatColorPhotosModal)

## 4. Очистка состояний и обработчиков в horses/page.tsx

- [x] 4.1 Удалить неиспользуемые состояния, связанные с фотографиями пород (если есть)
- [x] 4.2 Удалить неиспользуемые состояния, связанные с фотографиями мастей (если есть)
- [x] 4.3 Удалить неиспользуемые обработчики событий для фотографий пород (если есть)
- [x] 4.4 Удалить неиспользуемые обработчики событий для фотографий мастей (если есть)
- [x] 4.5 Проверить отсутствие неиспользуемых импортов

## 5. Проверка backend логики

- [x] 5.1 Проверить наличие логики фотографий пород в backend (модели, endpoints, сервисы)
- [x] 5.2 Проверить наличие логики фотографий мастей в backend (модели, endpoints, сервисы)
- [x] 5.3 При наличии — удалить лишний backend код

## 6. Тестирование и валидация

- [x] 6.1 Протестировать полный цикл выбора фотографии для лошади
- [x] 6.2 Проверить отсутствие кнопок фотографий в таблицах пород и мастей
- [x] 6.3 Запустить существующие тесты для horses/page.tsx
- [x] 6.4 Запустить тесты для HorseBreedsTable и HorseCoatColorsTable
- [x] 6.5 Проверить TypeScript компиляцию без ошибок
