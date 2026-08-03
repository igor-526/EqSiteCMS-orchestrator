## 1. Backend — API связей лошадь-услуга

- [x] 1.1 Создать DTO для связей: `HorseServiceRelationOutDto`, `HorseServiceRelationCreateDto`, `HorseServiceRelationUpdateDto` в `services/backend/src/core/schemas/horse_service_relations.py`
- [x] 1.2 Создать репозиторий `HorseServiceRelationsRepository` в `services/backend/src/repositories/horse_service_relations_repository.py` с методами create, get_by_id, get_list_by_horse, get_available_services (с фильтром search, исключая уже привязанные), update, delete
- [x] 1.3 Создать сервис `HorseServiceRelationsService` в `services/backend/src/core/services/horse_service_relations.py` с бизнес-логикой CRUD и валидацией (уникальность horse_id+service_id, существование horse/service)
- [x] 1.4 Создать API-роутер в `services/backend/src/api/horse_service_relations.py` с эндпоинтами: `POST /api/horses/{horse_id}/services`, `PATCH /api/horses/{horse_id}/services/{relation_id}`, `DELETE /api/horses/{horse_id}/services/{relation_id}`, `GET /api/horses/{horse_id}/services`
- [x] 1.4.1 Добавить эндпоинт `GET /api/horses/{horse_id}/available-services?search=` — возвращает услуги, ещё не привязанные к данной лошади, с фильтрацией по `search` (поиск по name на backend)
- [x] 1.5 Зарегистрировать зависимости (DI) в `services/backend/src/depends/services.py`: `get_horse_service_relations_repository`, `get_horse_service_relations_service`
- [x] 1.6 Зарегистрировать роутер в `services/backend/src/main.py`
- [x] 1.7 Написать unit-тесты для сервиса и репозитория связей

## 2. Backend — Исправление багов валидации услуги

- [x] 2.1 Исправить автогенерацию slug: в `HorseServiceService.create()` и `update()` — если slug пустой или null, генерировать из name (паттерн `SlugMixin`)
- [x] 2.2 Исправить необязательное описание: в `HorseServiceService` убрать валидацию «описание не может быть пустым», принимать `description=null` и `description=""`
- [x] 2.3 Написать unit-тесты для исправленной валидации slug и description

## 3. Backend — Override-подстановка в репозитории лошадей

- [x] 3.1 Обновить запрос услуг в `horse_repository.py` (`get_horse_full_info_by_slug`, `get_horse_full_info_by_id`, `get_horse_list_full_info`): SELECT включает `description_override`, `price_override`, `price_formatter_override` из `horse_service_relations`
- [x] 3.2 Обновить `_build_horse_dto` в `horse_repository.py`: подставлять override-значения (если не null) вместо дефолтных значений услуги при формировании `HorseServiceOutDto`
- [x] 3.3 Написать unit-тесты для override-подстановки

## 4. Frontend — Типы, валидаторы, API-сервис

- [x] 4.1 Создать типы `HorseServiceRelationOutDto`, `HorseServiceRelationCreateInDto`, `HorseServiceRelationUpdateInDto` в `services/frontend/src/types/api/horseServiceRelations.ts`
- [x] 4.2 Создать Zod-схемы валидации в `services/frontend/src/features/horses/validators/horseServiceRelations.ts`
- [x] 4.3 Создать API-сервис `services/frontend/src/features/horses/services/horseServiceRelationsService.ts` с функциями fetch, create, update, delete, fetchAvailableServices (с параметром search)

## 5. Frontend — Хук управления связями

- [x] 5.1 Создать хук `useHorseServiceRelations` в `services/frontend/src/features/horses/hooks/useHorseServiceRelations.ts` с логикой загрузки, создания, обновления, удаления связей и управления состоянием Drawer/Modal

## 6. Frontend — Компоненты UI

- [x] 6.1 Создать компонент `HorseServiceRelationsDrawer` в `services/frontend/src/features/horses/ui/HorseServiceRelations/HorseServiceRelationsDrawer.tsx`: Drawer с заголовком, кнопкой «Добавить», таблицей (2 колонки: Наименование, Цена) или NoData-заглушкой
- [x] 6.2 Создать компонент `HorseServiceRelationsTable` в `services/frontend/src/features/horses/ui/HorseServiceRelations/HorseServiceRelationsTable.tsx`: таблица связанных услуг с обработчиком клика по строке
- [x] 6.3 Создать компонент `HorseServiceRelationCreateUpdateModal` в `services/frontend/src/features/horses/ui/HorseServiceRelations/HorseServiceRelationCreateUpdateModal.tsx`: модальное окно с Select с серверным поиском (выбор услуги из доступных, поиск по name на backend), полями override (description, price через Radio.Group + Input), кнопками «Добавить»/«Изменить»/«Удалить»/«Закрыть»
- [x] 6.4 Создать index-файл экспорта в `services/frontend/src/features/horses/ui/HorseServiceRelations/index.ts`

## 7. Frontend — Интеграция в таблицу лошадей и страницу

- [x] 7.1 Добавить кнопку «Услуги» в колонку «Действия» `HorsesTable.tsx` (иконка финансов + badge с количеством услуг), добавить `onServicesClick` в props
- [x] 7.2 Добавить состояние Drawer и Modal в `page.tsx`: `horseServiceRelationsDrawerOpen`, `selectedHorseForServices`, `horseServiceRelationModalOpen`, `selectedHorseServiceRelation`
- [x] 7.3 Добавить обработчики в `page.tsx`: `handleServicesClick`, `handleOpenServiceRelationModal`, `handleCreateServiceRelation`, `handleUpdateServiceRelation`, `handleDeleteServiceRelation`
- [x] 7.4 Рендерить `HorseServiceRelationsDrawer` и `HorseServiceRelationCreateUpdateModal` в секции `HorsesTabsKeys.HORSES` в `page.tsx`
- [x] 7.5 Передать `onServicesClick` в `HorsesTable` из `page.tsx`

## 8. Frontend — Исправление багов валидации модального окна услуги

- [x] 8.1 В `HorseServicesCreateUpdateModal.tsx` и `useHorseServices.ts` — убедиться, что пустой slug и пустое описание передаются корректно (slug=null при пустом поле, description=null при пустом поле)

## 9. Инструкции и документация

- [x] 9.1 Обновить раздел «Инструкция» (user docs) в `HorsesUserDocumentationView` — добавить описание управления услугами лошади
- [x] 9.2 Обновить раздел «Документация» (developer docs) в `HorsesDeveloperDocumentationView` — добавить описание нового API связей

## 10. Quality Gate

### Backend
- [x] 10.1 Запустить `PYTHONPATH=src uv run pytest -s -vv tests/unit` — все тесты проходят (792 passed, 5 skipped)
- [x] 10.2 Запустить `uv run mypy src` — без ошибок типизации (145 source files clean)
- [x] 10.3 Запустить `uv run isort src && uv run black src` — форматирование корректно
- [x] 10.4 Проверить access matrix (code review):
  - [x] Anonymous `GET /api/horses/{horse_id}/services` с tenant key → `200` (get_read_equestrian_context)
  - [x] Anonymous `GET /api/horses/{horse_id}/services` без tenant key → `400`
  - [x] Anonymous `POST/PATCH/DELETE` → `401` (get_current_user dependency)
  - [x] Authenticated без scope `POST/PATCH/DELETE` → `403` (get_protected_equestrian_context)
  - [x] Authenticated `GET /api/horses/{horse_id}/available-services` → `200` (Protected Read)
  - [x] Anonymous `GET /api/horses/{horse_id}/available-services` → `401` (get_current_user)
- [x] 10.5 Проверить override-подстановку: ИСПРАВЛЕНО — `horse_repository.py:124,132` заменено `or` на `is not None` для description_override и price_formatter_override
- [x] 10.6 Проверить серверный поиск: `search` параметр передаётся через API → service → repository

### Frontend
- [x] 10.7 Запустить `pnpm test` — все тесты проходят (323 passed, 36 test files, jsdom, MSW)
- [x] 10.8 Запустить `pnpm lint` — 0 ошибок (396 warnings — все pre-existing)
- [x] 10.9 Запустить `pnpm tsc --noEmit` — без ошибок типизации
- [x] 10.10 Проверить UI-сценарии:
  - [x] Кнопка «Услуги» отображается с badge количества (HorsesTable.tsx Badge + DollarOutlined)
  - [x] Drawer открывается с таблицей или NoData-заглушкой (HorseServiceRelationsDrawer.tsx)
  - [x] Модальное окно создания: Select с серверным поиском, override-поля, валидация
  - [x] Модальное окно редактирования: readonly Select, override-поля, кнопки «Изменить»/«Удалить»
  - [x] Double submit protection — ИСПРАВЛЕНО: useRef-based guard + submitting prop для disabled кнопок
  - [x] Backend denial (401/403/409) — отображается через toast + inline error в modal
  - [x] Scope-aware UX: canMutate={canManageHorseServices} — кнопки скрыты без scope
  - [x] Dedicated component/hook тесты — ДОБАВЛЕНО: 35 новых тестов (useHorseServiceRelations, Drawer, Modal)
- [x] 10.11 Проверить изоляцию consumer-контура: `services/site-ad` не изменён, нет импортов `site-*`
- [x] 10.12 Проверить инструкции: ОБНОВЛЕНЫ — user docs (секция 9: Услуги лошади) + developer docs (секция 7: Связи лошадь-услуга с API reference)
