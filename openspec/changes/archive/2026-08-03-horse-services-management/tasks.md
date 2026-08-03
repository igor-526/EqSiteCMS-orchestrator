## 1. Backend — API связей лошадь-услуга

- [ ] 1.1 Создать DTO для связей: `HorseServiceRelationOutDto`, `HorseServiceRelationCreateDto`, `HorseServiceRelationUpdateDto` в `services/backend/src/core/schemas/horse_service_relations.py`
- [ ] 1.2 Создать репозиторий `HorseServiceRelationsRepository` в `services/backend/src/repositories/horse_service_relations_repository.py` с методами create, get_by_id, get_list_by_horse, update, delete
- [ ] 1.3 Создать сервис `HorseServiceRelationsService` в `services/backend/src/core/services/horse_service_relations.py` с бизнес-логикой CRUD и валидацией (уникальность horse_id+service_id, существование horse/service)
- [ ] 1.4 Создать API-роутер в `services/backend/src/api/horse_service_relations.py` с эндпоинтами: `POST /api/horses/{horse_id}/services`, `PATCH /api/horses/{horse_id}/services/{relation_id}`, `DELETE /api/horses/{horse_id}/services/{relation_id}`, `GET /api/horses/{horse_id}/services`
- [ ] 1.4.1 Добавить эндпоинт `GET /api/horses/{horse_id}/available-services?search=` — возвращает услуги, ещё не привязанные к данной лошади, с фильтрацией по `search` (поиск по name на backend)
- [ ] 1.5 Зарегистрировать зависимости (DI) в `services/backend/src/depends/services.py`: `get_horse_service_relations_repository`, `get_horse_service_relations_service`
- [ ] 1.6 Зарегистрировать роутер в `services/backend/src/main.py`
- [ ] 1.7 Написать unit-тесты для сервиса и репозитория связей



## 2. Backend — Исправление багов валидации услуги

- [ ] 2.1 Исправить автогенерацию slug: в `HorseServiceService.create()` и `update()` — если slug пустой или null, генерировать из name (паттерн `SlugMixin`)
- [ ] 2.2 Исправить необязательное описание: в `HorseServiceService` убрать валидацию «описание не может быть пустым», принимать `description=null` и `description=""`
- [ ] 2.3 Написать unit-тесты для исправленной валидации slug и description



## 3. Backend — Override-подстановка в репозитории лошадей

- [ ] 3.1 Обновить запрос услуг в `horse_repository.py` (`get_horse_full_info_by_slug`, `get_horse_full_info_by_id`, `get_horse_list_full_info`): SELECT включает `description_override`, `price_override`, `price_formatter_override` из `horse_service_relations`
- [ ] 3.2 Обновить `_build_horse_dto` в `horse_repository.py`: подставлять override-значения (если не null) вместо дефолтных значений услуги при формировании `HorseServiceOutDto`
- [ ] 3.3 Написать unit-тесты для override-подстановки



## 4. Frontend — Типы, валидаторы, API-сервис

- [ ] 4.1 Создать типы `HorseServiceRelationOutDto`, `HorseServiceRelationCreateInDto`, `HorseServiceRelationUpdateInDto` в `services/frontend/src/types/api/horseServiceRelations.ts`
- [ ] 4.2 Создать Zod-схемы валидации в `services/frontend/src/features/horses/validators/horseServiceRelations.ts`
- [ ] 4.3 Создать API-сервис `services/frontend/src/features/horses/services/horseServiceRelationsService.ts` с функциями fetch, create, update, delete



## 5. Frontend — Хук управления связями

- [ ] 5.1 Создать хук `useHorseServiceRelations` в `services/frontend/src/features/horses/hooks/useHorseServiceRelations.ts` с логикой загрузки, создания, обновления, удаления связей и управления состоянием Drawer/Modal



## 6. Frontend — Компоненты UI

- [ ] 6.1 Создать компонент `HorseServiceRelationsDrawer` в `services/frontend/src/features/horses/ui/HorseServiceRelations/HorseServiceRelationsDrawer.tsx`: Drawer с заголовком, кнопкой «Добавить», таблицей (2 колонки: Наименование, Цена) или NoData-заглушкой
- [ ] 6.2 Создать компонент `HorseServiceRelationsTable` в `services/frontend/src/features/horses/ui/HorseServiceRelations/HorseServiceRelationsTable.tsx`: таблица связанных услуг с обработчиком клика по строке
- [ ] 6.3 Создать компонент `HorseServiceRelationCreateUpdateModal` в `services/frontend/src/features/horses/ui/HorseServiceRelations/HorseServiceRelationCreateUpdateModal.tsx`: модальное окно с Select (выбор услуги), полями override (description, price через Radio.Group + Input), кнопками «Добавить»/«Изменить»/«Удалить»/«Закрыть»
- [ ] 6.4 Создать index-файл экспорта в `services/frontend/src/features/horses/ui/HorseServiceRelations/index.ts`



## 7. Frontend — Интеграция в таблицу лошадей и страницу

- [ ] 7.1 Добавить кнопку «Услуги» в колонку «Действия» `HorsesTable.tsx` (иконка финансов + badge с количеством услуг), добавить `onServicesClick` в props
- [ ] 7.2 Добавить состояние Drawer и Modal в `page.tsx`: `horseServiceRelationsDrawerOpen`, `selectedHorseForServices`, `horseServiceRelationModalOpen`, `selectedHorseServiceRelation`
- [ ] 7.3 Добавить обработчики в `page.tsx`: `handleServicesClick`, `handleOpenServiceRelationModal`, `handleCreateServiceRelation`, `handleUpdateServiceRelation`, `handleDeleteServiceRelation`
- [ ] 7.4 Рендерить `HorseServiceRelationsDrawer` и `HorseServiceRelationCreateUpdateModal` в секции `HorsesTabsKeys.HORSES` в `page.tsx`
- [ ] 7.5 Передать `onServicesClick` в `HorsesTable` из `page.tsx`



## 8. Frontend — Исправление багов валидации модального окна услуги

- [ ] 8.1 В `HorseServicesCreateUpdateModal.tsx` и `useHorseServices.ts` — убедиться, что пустой slug и пустое описание передаются корректно (slug=null при пустом поле, description=null при пустом поле)



## 9. Инструкции и документация

- [ ] 9.1 Обновить раздел «Инструкция» (user docs) в `HorsesUserDocumentationView` — добавить описание управления услугами лошади
- [ ] 9.2 Обновить раздел «Документация» (developer docs) в `HorsesDeveloperDocumentationView` — добавить описание нового API связей



## 10. Quality Gate

- [ ] 10.1 Запустить `PYTHONPATH=src uv run pytest -s -vv tests/unit` — все тесты проходят
- [ ] 10.2 Запустить `uv run mypy src` — без ошибок типизации
- [ ] 10.3 Запустить `uv run isort src && uv run black src` — форматирование корректно
- [ ] 10.4 Проверить access matrix: anonymous GET возвращает 200, anonymous POST/PATCH/DELETE возвращает 401
- [ ] 10.5 Проверить override-подстановку: HorseOutDto.services возвращает корректные значения
- [ ] 10.6 Проверить UI: кнопка, Drawer, таблица, модальное окно работают корректно