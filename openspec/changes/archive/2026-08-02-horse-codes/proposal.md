## Why

Некоторые лошади имеют внешний идентификатор для однозначного сопоставления в родословных деревьях, но текущая модель и CMS не позволяют хранить и редактировать его. Нужно провести поле `code` через БД, весь horse API и административный интерфейс, сохранив существующие access-границы.

## What Changes

- Добавить nullable-поле `horse.code`: произвольная строка длиной не более 31 символа; пустая строка допустима, уникальность не требуется.
- Добавить обратимо совместимую nullable-колонку PostgreSQL и провести поле через доменную entity, create/update DTO, базовый horse response и все вложенные/расширенные схемы, наследующие или включающие лошадь.
- Возвращать `code` в `GET /api/horses`, `GET /api/horses/{slug_or_id}`, ответах `POST /api/horses`, `PATCH /api/horses/{horse_id}` и прочих horse DTO (pedigree, кандидаты, фотооперации), не меняя методы, пути и access classes.
- В CMS добавить колонку «Код» в таблицу вкладки «Лошади» и строковое поле «Код» в create/edit modal с ограничением 31 символ и обработкой backend validation/error состояний.
- Добавить backend unit evidence (не менее 30 явных сценариев), live-API smoke evidence (не менее 30 явных сценариев на обнаруженной через Docker реальной PostgreSQL), frontend automated matrix и подробный browser Manual QA.
- Не изменять `services/site-ad`: расширение ответа обратно совместимо, отображение кода публичным consumer в эту задачу не входит.

## Capabilities

### New Capabilities

<!-- Новые capability не создаются: поле расширяет существующие horse-контракты. -->

### Modified Capabilities

- `backend-domain-capabilities`: tenant-scoped horse CRUD и все horse response-схемы получают nullable `code` длиной до 31 символа.
- `cms-horse-ui-quality`: защищённый CMS-интерфейс показывает код в таблице и поддерживает его в create/edit modal с валидацией и permission/error UX.

## Impact

- Backend: `services/backend/src/models/horse.py`, новая Alembic migration, `core/entities/horse.py`, `core/schemas/horses.py`, преобразования/репозиторные выборки horse, существующие unit-тесты horse entity/service/repository/API boundary.
- API: изменяется форма horse DTO и payload `POST/PATCH /api/horses`; URL и access policy не меняются. `GET` остаются Public Read в tenant context, `POST/PATCH` — Protected Write для `SUPERUSER`, `ADMIN`, `DEVELOPER`.
- Frontend CMS: `types/api/horses.ts`, валидаторы, horse hook/service boundary, `HorsesTable`, `HorseCreateUpdateModal` и их тесты.
- Инфраструктура: nullable migration без backfill; NATS/AsyncAPI и зависимости не меняются.
- Consumer: `services/site-ad` не изменяется; новое nullable-поле может игнорироваться существующим клиентом.
