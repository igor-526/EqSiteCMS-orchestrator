## Why

В задачах 031 и 033 мы реализовали протоколирование использования технологий (NATS JetStream и Celery/Redis). Один из выводов — полезно фиксировать параметры использования технологий прямо в README.md сервиса. Сейчас протокол NATS JetStream (`agents/howto/nats-jetstream-protocols.md`) не содержит такого правила, а README.md сервисов `backend`, `notification-service` и `email-service` либо отсутствуют, либо содержат шаблонный текст без информации о NATS.

## What Changes

- Добавить в протокол `agents/howto/nats-jetstream-protocols.md` новую секцию «Документирование в README.md» с правилом: если сервис использует NATS JetStream, его README.md должен содержать таблицу streams/subjects/consumers с описанием назначения.
- Создать/обновить README.md сервисов:
  - `services/backend/README.md` — добавить секцию NATS JetStream (роль: Publisher, stream SITE_EVENTS, subject events.site.callback.requested).
  - `services/notification-service/README.md` — заменить шаблонный текст на реальное описание сервиса с секцией NATS JetStream (роль: Pub/Sub, два stream).
  - `services/email-service/README.md` — заменить шаблонный текст на реальное описание сервиса с секцией NATS JetStream (роль: Consumer, stream NOTIFICATION_COMMANDS).

## Capabilities

### New Capabilities
- `nats-readme-documentation`: Правило документирования использования NATS JetStream в README.md сервисов и обновлённые README.md для backend, notification-service, email-service.

### Modified Capabilities
<!-- Нет существующих specs, которые требуют изменения на уровне требований -->

## Impact

- Файлы: `agents/howto/nats-jetstream-protocols.md`, `services/backend/README.md`, `services/notification-service/README.md`, `services/email-service/README.md`
- API: нет изменений
- Зависимости: нет новых
