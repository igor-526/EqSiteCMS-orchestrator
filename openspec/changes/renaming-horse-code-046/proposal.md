## Why

Поле `horse.code`, добавленное для отображения родословных, не описывает реальную предметную модель: в родословной нужна отдельная кличка, которая может отличаться от основной клички лошади. Публичный consumer должен автоматически видеть родословную кличку с fallback на основную, а CMS — хранить и редактировать nullable значение без подмены.

## What Changes

- **BREAKING**: удалить поле `code` из модели, схем БД и всех horse DTO и заменить его nullable-полем `pedigree_name` длиной не более 63 символов.
- Выполнить одноразовую Alembic-миграцию, которая удаляет `horse.code` без переноса данных и добавляет nullable `horse.pedigree_name`.
- Для Public Read `GET /api/horses`, `GET /api/horses/{slug_or_id}` и `GET /api/horses/{id}/pedigree/{mode}` при tenant-аутентификации через `X-Equestrian-Service-Key` возвращать в поле `name` значение `pedigree_name`, если оно задано, иначе основную `name`; правило распространяется на вложенные pedigree/foal/parent/candidate DTO.
- Для тех же GET при CMS cookie-аутентификации возвращать исходную `name` и отдельное raw nullable `pedigree_name`; если значение не задано, JSON MUST содержать `pedigree_name: null` без fallback, чтобы CMS явно отображала пустое состояние и могла его изменить.
- Сохранить Protected Write policy для `POST /api/horses` и `PATCH /api/horses/{horse_id}`: CMS принимает, изменяет и очищает `pedigree_name`; `DELETE` и pedigree mutations не меняют форму запроса.
- В CMS заменить колонку и поле формы «Код» на «Кличка в родословной», обновить типы, validators, hooks, документацию и тесты; `site-ad` не изменять.

## Capabilities

### New Capabilities

- Нет.

### Modified Capabilities

- `backend-domain-capabilities`: заменить контракт horse `code` на `pedigree_name`, определить контекстное отображение `name` для service-key Public Read и cookie CMS, миграцию и access matrix.
- `cms-horse-ui-quality`: заменить CMS-представление и редактирование horse code на nullable кличку в родословной с сохранением admin-контракта и permission UX.
- `site-consumer-contracts`: зафиксировать, что существующие public horse endpoints без изменений consumer-кода получают эффективную кличку родословной в `name`.

## Impact

- Backend: `services/backend/src/models/horse.py`, horse entity/DTO/service/repository, API/DI auth context, Alembic migration и horse unit/integration tests.
- CMS frontend: `services/frontend/src/types/api/horses.ts`, horse validators/hooks/table/modal/docs и тесты.
- API: форма horse DTO и mutation payload является breaking change (`code` удаляется, `pedigree_name` добавляется); методы и пути endpoint-ов сохраняются.
- Данные: существующие значения `code` намеренно теряются; `pedigree_name` создаётся как `NULL`.
- Public consumer: `services/site-ad` не меняется; backend сохраняет совместимое отображение через эффективное поле `name`.
