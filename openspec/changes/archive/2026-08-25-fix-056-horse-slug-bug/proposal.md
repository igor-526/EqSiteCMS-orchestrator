## Why

CMS показывает slug лошади в таблице, но не позволяет задать его при создании или изменить при редактировании. Backend DTO также запрещают поле `slug`, поэтому администратор не может управлять публичным URL лошади, а попытка добавить поле только в UI завершилась бы `422`.

## What Changes

- Расширить `POST /api/horses` и `PATCH /api/horses/{horse_id}` поддержкой необязательного slug с tenant-scoped проверкой уникальности и сохранением текущей автогенерации, когда slug не задан.
- Добавить в модальное окно создания/редактирования лошади поле «Путь URL» по существующему CMS-паттерну новостей и услуг: пустое значение означает автогенерацию, в edit-режиме показывается сохранённый slug.
- Расширить frontend DTO, payload-сборку, field-error rendering и регрессионные тесты slug-flow.
- Зафиксировать access matrix и anonymous/authenticated проверки: изменяемые write endpoint'ы остаются Protected Write, публичные horse GET не меняются.
- Не менять схему БД, NATS-контракты и публичный `site-ad`.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `backend-domain-capabilities`: ручной slug становится частью create/update-контракта лошади с автогенерацией для отсутствующего или пустого значения и явной обработкой tenant-scoped коллизий.
- `cms-horse-ui-quality`: форма лошади получает управляемое поле slug, согласованное с backend DTO, permissions и состояниями ошибок.

## Impact

- Backend: `services/backend/src/core/schemas/horses.py`, `services/backend/src/core/services/horse.py` и связанные unit-тесты API/service/entity/repository boundary.
- CMS frontend: `services/frontend/src/types/api/horses.ts`, `services/frontend/src/features/horses/ui/Horses/HorseCreateUpdateModal.tsx` и связанные component/API-boundary тесты.
- API: изменяется тело существующих `POST /api/horses` и `PATCH /api/horses/{horse_id}` без изменения методов, путей и access-классов.
- Данные и интеграции: миграция БД и изменение NATS/AsyncAPI не требуются; `slug VARCHAR(63)` и tenant-scoped unique index уже существуют.
