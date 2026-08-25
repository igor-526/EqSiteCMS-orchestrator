## Why

После исправления 056 поле slug стало редактируемым, но в edit-режиме изменение клички оставляет прежний slug в payload. Backend трактует непустой slug как ручной и поэтому не запускает уже реализованную регенерацию из нового `name`; пользователь ожидает, что публичный URL синхронизируется с изменённой кличкой.

## What Changes

- Добавить в CMS-форму лошади явное состояние авто/ручного управления slug: изменение клички переводит не изменённый вручную slug в режим backend-автогенерации.
- Если пользователь вручную вводит slug в той же сессии формы, ручное значение имеет приоритет и дальнейшее редактирование клички его не перезаписывает.
- При открытии существующей записи считать slug автоматически связанным с кличкой, поскольку backend не хранит признак происхождения slug; первое изменение клички очищает поле и отправляет `slug=""`, запрашивая регенерацию из итогового имени.
- Сохранить существующие field errors, scope/mutation guards, double-submit guard и backend-контракт `PATCH`: пустой slug регенерируется, непустой считается ручным, отсутствующий сохраняет текущее значение.
- Добавить регрессионные component tests и browser Manual QA для name/slug precedence; backend endpoints, access policy, DTO, БД, NATS и `site-ad` не менять.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `cms-horse-ui-quality`: CMS-форма лошади автоматически запрашивает обновление slug при изменении клички, сохраняя приоритет явного ручного ввода slug в текущей сессии.

## Impact

- CMS frontend: `services/frontend/src/features/horses/ui/Horses/HorseCreateUpdateModal.tsx` и его component tests; при необходимости локальный frontend helper/hook в той же feature ownership-зоне.
- API: методы, пути, DTO и access class не меняются; используется существующая семантика `PATCH /api/horses/{horse_id}` с `slug=""` для регенерации.
- Backend, PostgreSQL schema/data, NATS/AsyncAPI и публичный `site-ad` не затрагиваются.
