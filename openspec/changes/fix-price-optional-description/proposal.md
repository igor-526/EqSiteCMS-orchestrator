# Proposal

## Why

Создание и изменение услуги через prices API ошибочно отклоняет пустое описание с `400`: необязательное поле обрабатывается как непустое. Исходный запрос — [задача 116](../../../docs/tasks/116_price_optional_description.md).

## What Changes

- Разрешить `description=""` и строки из пробельных символов при создании и редактировании цены, сохраняя нормализованную пустую строку.
- Сохранить текущие правила: PATCH без description не меняет описание; `null` игнорируется при PATCH и означает отсутствие описания при create.
- Добавить компактное регрессионное покрытие domain/HTTP для create/update, отсутствующего поля, `null`, длины и неизменности прав.
- Не менять валидацию `page_data`, `name`, `slug`, описаний групп и horse services. Форма CMS уже допускает пустое описание; UI-реализация не требуется.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `backend-domain-capabilities`: добавить явное требование необязательного описания именно price (не horse service), включая partial-update semantics и access matrix.

## Impact

- Реализация: `services/backend/src/core/services/prices.py`, зависимые unit-тесты сервиса и HTTP-контракта; без миграций, DTO-breaking изменений и NATS.
- Затронуты `POST /api/prices` и `PATCH /api/prices/{slug_or_id}`; оба остаются Protected Write. Access matrix и anonymous/authenticated сценарии приведены в delta spec и design. Public Read не меняется.
- Единственный изменяемый план — этот OpenSpec change. Один bounded Backend unit и один общий `QG-LITE` после него; apply запрещён до approval пользователя.
