## Why

Таблица `horse_service_relations` и сущность `HorseServiceRelations` существуют в кодовой базе, но API для управления связями лошадь-услуга отсутствует. Пользователь CMS не может привязать услугу к лошади, задать индивидуальные описание и цену, или удалить связь. Текущий запрос услуг в репозитории лошадей не использует override-поля (`description_override`, `price_override`, `price_formatter_override`), поэтому HorseOutDto возвращает дефолтные значения услуги вместо переопределённых. Также в модальном окне создания/редактирования услуги присутствуют баги валидации: slug не генерируется автоматически при пустом значении, а описание услуги ошибочно считается обязательным.

## What Changes

- **Новое API для связей лошадь-услуга**: CRUD-эндпоинты `POST /api/horses/{horse_id}/services`, `PATCH /api/horses/{horse_id}/services/{relation_id}`, `DELETE /api/horses/{horse_id}/services/{relation_id}` для управления связями с override-полями. Endpoint `GET /api/horses/{horse_id}/available-services?search=` для получения доступных (не привязанных) услуг с серверным поиском по name.
- **Новая схема DTO для связи**: `HorseServiceRelationOutDto` (содержит service_id, name, slug, price, price_formatter, description с учётом override) и `HorseServiceRelationCreateDto` / `HorseServiceRelationUpdateDto` для входных данных.
- **Доработка HorseOutDto**: поле `services` уже существует, но необходимо обновить репозиторий, чтобы он подставлял override-значения из `horse_service_relations` вместо дефолтных значений услуги.
- **Новый UI управления услугами лошади**: кнопка в колонке «Действия» таблицы лошадей, Drawer с таблицей связанных услуг, модальное окно добавления/редактирования связи.
- **Исправление багов валидации услуги**: автогенерация slug при пустом значении (backend), необязательное описание услуги (backend).
- **Обновление инструкций**: разделы «Инструкция» и «Документация» в CMS.

## Capabilities

### New Capabilities

- `horse-service-relations`: API CRUD для управления связями лошадь-услуга с override (description, price, price_formatter). Включает создание, обновление, удаление связей, а также получение списка услуг лошади с учётом override. Access matrix: POST/PATCH/DELETE — Protected Write, чтение связей в составе HorseOutDto — Public Read.

- `horse-service-relations-ui`: CMS-интерфейс управления услугами лошади из таблицы лошадей. Кнопка «Услуги» в колонке «Действия», Drawer с таблицей связанных услуг, модальное окно добавления/редактирования связи с выбором услуги и заданием override-полей.

### Modified Capabilities

- `backend-domain-capabilities`: Исправление багов валидации horse service — автогенерация slug при пустом значении, необязательное описание услуги. Обновление репозитория лошадей для подстановки override-значений из `horse_service_relations`.

- `cms-horse-ui-quality`: Добавление кнопки управления услугами в таблицу лошадей, Drawer и модальное окно для связей лошадь-услуга.

## Impact

### Backend

- **Новые файлы**: `services/backend/src/api/horse_service_relations.py` (роутер, включая `GET /api/horses/{horse_id}/available-services?search=`), `services/backend/src/core/schemas/horse_service_relations.py` (DTO), `services/backend/src/core/services/horse_service_relations.py` (сервис), `services/backend/src/repositories/horse_service_relations_repository.py` (репозиторий, включая `get_available_services` с фильтром search).
- **Изменённые файлы**: `services/backend/src/models/horse_service.py` (модель уже существует), `services/backend/src/core/entities/horse_service.py` (сущность уже существует), `services/backend/src/repositories/horse_repository.py` (обновить запрос услуг с override), `services/backend/src/api/horse_service.py` (исправление валидации slug/description), `services/backend/src/core/services/horse_service.py` (исправление валидации), `services/backend/src/depends/services.py` (DI для нового сервиса/репозитория).
- **Миграция БД**: не требуется — таблица `horse_service_relations` уже существует.
- **Регистрация роутера**: `services/backend/src/main.py` (добавить новый роутер).

### Frontend

- **Новые файлы**: `services/frontend/src/features/horses/ui/HorseServiceRelations/` (компоненты Drawer, таблицы, модального окна), `services/frontend/src/features/horses/hooks/useHorseServiceRelations.ts` (хук), `services/frontend/src/features/horses/services/horseServiceRelationsService.ts` (API-сервис), `services/frontend/src/features/horses/validators/horseServiceRelations.ts` (Zod-схема), `services/frontend/src/types/api/horseServiceRelations.ts` (типы).
- **Изменённые файлы**: `services/frontend/src/features/horses/ui/Horses/HorsesTable.tsx` (добавить кнопку), `services/frontend/src/app/(protected)/horses/page.tsx` (состояние и обработчики Drawer), `services/frontend/src/features/horses/ui/HorseServices/HorseServicesCreateUpdateModal.tsx` (исправление валидации).

### Access Policy

| method | path | access class | roles | expected without auth | expected with auth |
|--------|------|-------------|-------|----------------------|-------------------|
| `POST` | `/api/horses/{horse_id}/services` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `201`; без scope `403`; дубликат `409` |
| `PATCH` | `/api/horses/{horse_id}/services/{relation_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `200`; несуществующая связь `404`; без scope `403` |
| `DELETE` | `/api/horses/{horse_id}/services/{relation_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `204`; несуществующая связь `404`; без scope `403` |
| `GET` | `/api/horses/{horse_id}/services` | Public Read | anonymous с tenant key | `200` с tenant key; `400` без key | `200` |
| `GET` | `/api/horses/{horse_id}/available-services?search=` | Protected Read | authenticated CMS user | `401` | `200` с отфильтрованным списком; без scope `403` |
| `GET` | `/api/horses`, `/api/horses/{slug_or_id}` | Public Read | anonymous с tenant key | `200` с services (override) | `200` с services (override) |
