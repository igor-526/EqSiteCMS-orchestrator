## Context

Таблица `horse_service_relations` и сущность `HorseServiceRelations` уже существуют в кодовой базе (модель `services/backend/src/models/horse_service.py`, сущность `services/backend/src/core/entities/horse_service.py`). Таблица содержит поля: `id`, `horse_id` (FK→horse), `service_id` (FK→horse_service), `description_override`, `price_override`, `price_formatter_override`.

Текущее состояние:
- Репозиторий лошадей (`horse_repository.py`) загружает услуги через JOIN `horse_service` ↔ `horse_service_relations`, но **игнорирует override-поля** — выбирает только колонки `horse_service`.
- `HorseOutDto` уже содержит поле `services: list[HorseServiceOutDto]`, но возвращает дефолтные значения услуги.
- API для управления связями **отсутствует** — нет эндпоинтов, сервисного слоя, репозитория.
- В CMS нет UI для управления связями — только таблица лошадей с кнопками «Фото» и «Родословная».
- Модальное окно создания/редактирования услуги (`HorseServicesCreateUpdateModal.tsx`) имеет баги: slug не генерируется автоматически, описание обязательно.

Существующие паттерны CRUD (breeds, coat colors, owners, services):
- GET list — `get_read_equestrian_context` (Public Read), `PaginatedEntities[OutDto]`
- GET by id/slug — `get_read_equestrian_context`, single DTO
- POST — `get_current_user` + `get_protected_equestrian_context` (Protected Write)
- PATCH — аналогично POST
- DELETE — аналогично POST, статус 204

## Goals / Non-Goals

**Goals:**
- Реализовать API CRUD для управления связями лошадь-услуга с override-полями
- Обновить репозиторий лошадей для подстановки override-значений из `horse_service_relations`
- Реализовать CMS UI: кнопка, Drawer, таблица, модальное окно для управления связями
- Исправить баги валидации в модальном окне услуги (slug, description)
- Обновить инструкции в CMS

**Non-Goals:**
- Изменение модели БД (таблица уже существует)
- Изменение consumer-сайта (`site-ad`) — услуги лошади уже возвращаются в HorseOutDto
- Добавление page_data для связей (override — только description, price, price_formatter)
- Изменение существующего API услуг (`/api/horses/services/*`)

## Decisions

### D1: Отдельный роутер для связей vs расширение существующего

**Решение**: Создать отдельный роутер `horse_service_relations.py` с путями `/api/horses/{horse_id}/services/*`.

**Обоснование**: Связи привязаны к конкретной лошади, а не к услуге. Путь `/api/horses/{horse_id}/services` интуитивно отражает владение: «услуги этой лошади». Существующий роутер `/api/horses/services/*` управляет справочником услуг — это разные доменные контексты.

**Альтернатива**: Расширить существующий роутер `/api/horses/services/{id}/relations` — отклонено, т.к. связи принадлежат лошади, а не услуге.

### D2: Отдельный DTO для связи vs переиспользование HorseServiceOutDto

**Решение**: Создать `HorseServiceRelationOutDto`, содержащий как поля услуги (name, slug), так и override-поля (description, price, price_formatter с учётом override).

**Обоснование**: При чтении связи клиенту нужны оба набора данных: исходные параметры услуги и переопределённые. HorseServiceOutDto не содержит override-информации. Новый DTO может агрегировать данные на уровне сервиса/репозитория.

**Альтернатива**: Расширить HorseServiceOutDto опциональными override-полями — отклонено, т.к. это загрязняет DTO справочника услуг.

### D3: Подстановка override в репозитории лошадей

**Решение**: Обновить запрос услуг в `horse_repository.py` так, чтобы SELECT включал колонки `horse_service_relations` (description_override, price_override, price_formatter_override). В `_build_horse_dto` подставлять override-значения: если override не null, использовать его вместо дефолтного значения услуги.

**Обоснование**: Минимальное изменение — не нужно менять HorseServiceOutDto, достаточно логики подстановки в репозитории. Потребитель (site-ad) получит корректные данные без изменений.

### D4: UI — Drawer vs Modal для списка связей

**Решение**: Использовать Ant Design `<Drawer>` (справа, на полэкрана) для отображения таблицы связанных услуг.

**Обоснование**: Задача из specs — Drawer по аналогии с галереей фотографий. Drawer не блокирует основной интерфейс, позволяет видеть контекст таблицы лошадей. Таблица внутри Drawer — 2 колонки: «Наименование» и «Цена».

**Альтернатива**: Полноэкранное модальное окно — отклонено по требованию задачи.

### D5: Модальное окно связи — выбор услуги через Select с серверным поиском

**Решение**: При создании связи показывать `<Select>` с доступными услугами — только те, что ещё **не привязаны** к данной лошади. Поиск по наименованию реализуется на **backend** (параметр `search` в GET endpoint списка доступных услуг). При редактировании — услуга фиксирована (readonly), меняются только override-поля.

**Обоснование**: Фильтрация на backend исключает дубли и масштабируется на большой справочник услуг. Frontend передаёт строку поиска, backend возвращает отфильтрованный список.

### D6: Исправление багов валидации — backend

**Решение**: 
- Slug: в `HorseServiceService.create()` и `update()` — если slug пустой или null, генерировать автоматически из name (как в price/breed). Паттерн уже реализован в `SlugMixin`.
- Description: в схеме `HorseServiceCreateDto` и `HorseServiceUpdateDto` — description уже `str | None`, проблема в сервисном слое, который валидирует пустую строку как ошибку. Убрать валидацию «описание не может быть пустым».

## Risks / Trade-offs

**[R1] Производительность запроса услуг при большом количестве связей** → При загрузке списка лошадей каждая лошадь выполняет отдельный SELECT для услуг. При необходимости оптимизации — batch-загрузка услуг для всех лошадей в списке (как уже сделано для photos). Mitigation: текущий объём данных не критичен, оптимизация — в отдельном change.

**[R2] Конкурентное создание связей** → Пользователь может попытаться создать дублирующую связь (та же услуга к той же лошади). Mitigation: UNIQUE constraint на (horse_id, service_id) в таблице + обработка ошибки в API с понятным сообщением.

**[R3] Удаление услуги из справочника** → При удалении услуги каскадно удалятся все связи (ON DELETE CASCADE в FK). Mitigation: вывести предупреждение в UI при удалении услуги, если она привязана к лошадям.

## Migration Plan

Миграция БД не требуется — таблица `horse_service_relations` уже существует с нужной структурой.

Порядок реализации:
1. Backend: schemas → repository → service → API router → DI → регистрация в main.py
2. Backend: исправление валидации slug/description в horse_service
3. Backend: обновление horse_repository для override
4. Frontend: types → validators → service → hook → компоненты UI
5. Frontend: интеграция в page.tsx и HorsesTable
6. Инструкции: обновление документации

## Open Questions

1. Какие услуги показывать в Select при создании связи — только те, что ещё не привязаны к лошади, или все? **Решение**: только не привязанные, для предотвращения дублей. **Поиск**: реализуется на backend (параметр `search`), никакого frontend-фильтра.
2. Нужно ли batch-обновление связей (одновременное добавление/удаление нескольких услуг)? **Решение**: нет, по одной связи — проще и надёжнее.
