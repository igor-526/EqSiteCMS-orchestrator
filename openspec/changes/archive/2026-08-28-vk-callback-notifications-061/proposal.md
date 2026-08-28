## Why

Callback-заявки уже доставляются администраторам конюшни по email, а канал VK присутствует в настройках пользователей, но фактически не маршрутизируется и не потребляется. Нужно завершить сквозной путь `backend → notification-service → vk-service → VK API`, сохранив tenant isolation, пользовательские channel preferences и существующую семантику флага доставки.

## What Changes

- Notification Service начнёт формировать отдельную VK-команду для callback-события только для текущих `ADMIN`/`SUPERUSER` нужной конюшни, у которых включён `callback/vk`.
- В `NOTIFICATION_COMMANDS` появится канонический subject `commands.notification.vk.send`; Notification Service станет его producer, а VK Service — durable consumer.
- VK Service будет принимать идемпотентную команду, выбирать только активные привязки адресатов и отправлять каждому текстовое сообщение через существующий VK messenger; неподтверждённые, заблокированные и удалённые привязки исключаются.
- `notifications_delivered=true` по-прежнему будет означать успешную публикацию хотя бы одной предусмотренной downstream command (email или VK), без ожидания SMTP/VK receipt; если ни один канал не получил команду, флаг остаётся `false`.
- Будут добавлены синхронные AsyncAPI-контракты Notification Service и VK Service, unit/contract/integration coverage и live smoke-проверки на реальных PostgreSQL/NATS/VK.
- После REWORK Quality Gate будет добавлен локальный one-shot smoke harness: отдельные test-only composition roots переиспользуют production handler/domain/repository, но подставляют детерминированные scripted VK/publisher adapters и изолированную run-scoped JetStream topology. Harness по умолчанию выключен, не входит в service lifespan, не создаёт HTTP API и не затрагивает реальные bindings/сообщения.
- Новые и изменённые HTTP endpoints отсутствуют; существующие access boundaries не открываются и не приватизируются.

## Capabilities

### New Capabilities

- `vk-notification-delivery`: каноническая VK-команда, durable consumption, recipient binding selection, идемпотентная обработка и отправка callback-сообщения через VK API.

### Modified Capabilities

- `notification-callback-handler`: callback handler формирует tenant-scoped команды для email и VK с независимыми channel preferences.
- `notification-orchestrator`: orchestrator публикует команду через publisher соответствующего канала и подтверждает callback delivery после успешной публикации хотя бы одной команды.

## Impact

- Сервисы: `services/notification-service`, `services/vk-service`; Backend Core участвует только в неизменяемых service/API и callback-event контрактах и в live evidence.
- Messaging: новый subject `commands.notification.vk.send` внутри существующего stream `NOTIFICATION_COMMANDS`, новый durable `vk-service-commands-send-vk`, новый `services/vk-service/docs/asyncapi.yaml`, обновление `services/notification-service/docs/asyncapi.yaml`.
- Данные: новых таблиц и миграций не требуется; используются существующие notification settings и `user_vks`, а идемпотентность VK consumer должна опираться на устойчивый журнал обработки/ограничение в VK Service (при необходимости — минимальная миграция журнала, решение фиксируется в design).
- Внешняя зависимость: реальная VK API группы для финального live smoke; секреты и токены не сохраняются в артефактах или отчётах.
- UI, `services/frontend`, `services/site-ad`, Email Service и HTTP endpoint surface не меняются.
- Amendment не меняет deploy/Helm/CI и production DI: smoke harness запускается только явной локальной командой через skill `smoke`, работает с синтетическими fixture IDs и удаляет run-scoped NATS/DB fixtures в `finally`.
