## Why

Реализация управления услугами лошади из задачи 027 прошла первичный Quality Gate, но CI выявил неиспользуемые импорты, а пользовательские сценарии остались неполными: связи сортируются нестабильно, форма создания не наследует данные выбранной услуги, индикаторы действий неоднородны и список лошадей нельзя отфильтровать по оказываемым услугам. Продолжение 028 должно устранить эти дефекты и подтвердить результат единым воспроизводимым Quality Gate.

## What Changes

- В `horse_service_relations` добавляется `created_at` с безопасным заполнением существующих строк и серверным значением для новых строк; список связей по умолчанию сортируется по `-created_at` со стабильным дополнительным порядком.
- Публичный `GET /api/horses` получает повторяемый query-параметр `services: list[UUID]`; несколько UUID применяются по OR-семантике, а count и выдача остаются tenant-scoped и согласованными.
- В CMS-фильтры таблицы лошадей добавляется multi-select услуг, сериализующий значения повторяемыми `services` и сбрасывающий `offset` в `0` при изменении или очистке.
- При выборе услуги в create-modal её `description`, `price` и `price_formatter` становятся реальными значениями override-полей формы и отправляются в Protected Write, пока пользователь их не изменит или не очистит.
- Индикаторы фотографий, родословной и услуг приводятся к единому badge-представлению на основе текущего индикатора услуг; badge услуг меняет красный цвет на серый.
- Устраняются известные CI `F401`, добавляются backend unit/live smoke и frontend unit/component/API-boundary проверки, browser Manual QA и один общий Quality Gate.
- После успешного Quality Gate delta specs синхронизируются в main specs, strict validation повторяется, затем change архивируется.

## Capabilities

### New Capabilities

Новые capability не вводятся.

### Modified Capabilities

- `horse-service-relations`: временной порядок связей, безопасная миграция `created_at` и стабильная сортировка списка по `-created_at`.
- `backend-domain-capabilities`: Public Read фильтрация списка лошадей по повторяемому списку UUID услуг с OR-семантикой и tenant isolation.
- `horse-service-relations-ui`: наследование данных выбранной услуги как реальных override-значений create-form.
- `cms-horse-ui-quality`: единый серый badge для действий и multi-select фильтр услуг с `limit`/`offset`, auth/scopes и test boundaries.

## Impact

- Backend: модель и Alembic migration для `horse_service_relations`, repository/service/API цепочка связей и списка лошадей, DTO/protocol signatures, unit tests и исправления lint в файлах задачи 027.
- API: изменяется только `GET /api/horses` добавлением optional `services`; access class остаётся Public Read. Существующие relation writes остаются Protected Write, а `available-services` остаётся явно защищённым GET для CMS Select.
- Frontend CMS: horse DTO/query types, API serialization, feature hooks/services, таблица/фильтры, action indicators, relation modal и их тесты. `services/site-ad` не изменяется.
- Database: реальная PostgreSQL, backfill существующих связей без удаления пользовательских данных; downgrade удаляет только добавленную колонку.
- Процесс: профильные Backend и Frontend deliverables с непересекающимся ownership, затем единый Quality Gate, sync и archive.
