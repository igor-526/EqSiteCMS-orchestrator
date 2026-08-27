## Why

Событие `events.site.callback.requested` сейчас не переносит идентификатор конюшни, а Notification Service запрашивает администраторов только по ролям. Поэтому уведомление о заявке корректного tenant может уйти администраторам других конюшен — это нарушение tenant isolation и утечка персональных данных заявителя.

## What Changes

- Добавить обязательный `equestrian_id` в producer/consumer DTO и AsyncAPI payload события `events.site.callback.requested` и заполнять его из проверенного tenant context при создании заявки.
- В Notification Service валидировать tenant события и запрашивать пользователей Backend Core одновременно по `equestrian_ids=[equestrian_id]` и ролям `ADMIN`/`SUPERUSER`.
- Сохранить пересечение tenant- и role-eligible пользователей с пользователями, включившими callback email, и подтверждёнными email; при отсутствии tenant, получателей или ошибке lookup работать fail-closed без публикации email command и без подтверждения доставки.
- Добавить контрактные, unit, интеграционные и live smoke-регрессии, доказывающие, что пользователи другой конюшни никогда не становятся получателями.
- Endpoint `GET /api/service/users` не меняет метод, путь, access class или формат ответа; существующий необязательный фильтр `equestrian_ids` становится обязательной частью именно callback routing-вызова Notification Service.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `notification-callback-handler`: callback event и выбор получателей становятся tenant-scoped; прежний запрет принимать `equestrian_id` заменяется обязательной передачей внутреннего tenant UUID без вывода его в письмо.
- `nats-jetstream-protocols`: канонический payload `events.site.callback.requested` расширяется обязательным `equestrian_id` синхронно у producer и consumer.
- `service-users`: фиксируется обязательное совместное применение фильтров tenant и role для callback notification routing без изменения HTTP access-контракта endpoint.

## Impact

- Сервисы: `services/backend`, `services/notification-service`; Email Service и CMS/site UI не меняются.
- Контракты: оба `docs/asyncapi.yaml`, зеркальные Pydantic DTO события, contract tests.
- Backend Core: создание callback event и тесты publisher/use case.
- Notification Service: callback handler, Main Backend client boundary/protocol и recipient-selection tests.
- HTTP: новых endpoint нет; `GET /api/service/users` остаётся `Service Read`, доступным только с валидным `X-Service-Key` (`401` без/с невалидным ключом, `200` с валидным ключом).
- БД и миграции: схема не меняется. Live smoke использует существующую реальную PostgreSQL Backend Core и реальный межсервисный/NATS поток.
