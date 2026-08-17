## Why

Породы сейчас существуют только как плоский справочник, поэтому CMS и публичные потребители не могут объединять их в верхнеуровневые категории. Нужна tenant-scoped сущность группы пород и управляемая связь с породой, сохраняя публичное чтение и защищённое администрирование.

## What Changes

- Добавляется справочник групп пород с `name`, `equestrian_id`, timestamps, `slug` и безопасным `page_data`, CRUD API, пагинацией, фильтрами и сортировкой `created_at desc` по умолчанию.
- В породе появляется nullable-связь с группой; удаление группы выполняет `SET NULL`, а create/update породы позволяют назначить или снять группу.
- DTO и list API пород возвращают человекочитаемую группу и поддерживают фильтр по списку UUID групп и сортировку по группе.
- Добавляются endpoint'ы `GET/POST /horses/breed-groups`, `GET/PATCH/DELETE /horses/breed-groups/{slug_or_id}`; меняются контракты `GET/POST /horses/breeds` и `GET/PATCH /horses/breeds/{slug_or_id}`. Полная access matrix и anonymous/authenticated сценарии фиксируются в delta specs.
- В CMS перед вкладкой «Породы» появляется вкладка «Группы пород» с таблицей, фильтрами, сортировкой, пагинацией и modal-flow создания, изменения, удаления и редактирования `page_data` без фотографий.
- Таблица пород получает колонку «Группа», фильтр и сортировку, новый порядок колонок; форма породы получает nullable selector группы.

## Capabilities

### New Capabilities

- `breed-group-management`: Backend-модель, tenant-scoped API групп пород, связь с породами, `SET NULL`, page data, фильтрация, сортировка и access-контракт.
- `cms-breed-group-management`: CMS-вкладка групп пород и расширение UI пород с permissions, API boundary, пагинацией, фильтрами, сортировкой, nullable selector и modal-flows.

### Modified Capabilities

Нет: существующие main specs не определяют нормативный контракт справочника пород и его CMS-представления.

## Impact

- Backend: `services/backend/src/{models,core,repositories,depends,api,migration}`, регистрация роутера и unit-тесты.
- API/DB: новая таблица групп пород, nullable FK в `breeds`, новые Public Read GET и Protected Write POST/PATCH/DELETE; NATS/AsyncAPI не затрагиваются.
- Frontend CMS: `services/frontend/src/{types,api,features/horses,features/pageEditor,app/(protected)/horses}` и тесты на MSW/Vitest.
- Публичные сайты не меняются, но смогут читать новые GET без cookie при передаче валидного Equestrian Key.
