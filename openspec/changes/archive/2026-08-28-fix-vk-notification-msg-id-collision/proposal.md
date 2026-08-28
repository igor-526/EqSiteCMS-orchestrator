## Why

VK-уведомление о запросе обратного звонка молча теряется в production: notification-service публикует email- и VK-команды в один stream `NOTIFICATION_COMMANDS` с одинаковым заголовком `Nats-Msg-Id = callback_request_id`, а дедупликация JetStream работает на уровне stream (не subject) с окном `duplicate_window = 120s`. Email публикуется первым, VK-команда через ~100 мс отбрасывается брокером как дубликат; `PubAck.duplicate` не проверяется, поэтому оркестратор считает публикацию успешной и подтверждает доставку заявки. Диагностика осложнена тем, что notification-service не пишет в stdout ни одной прикладной строки: in-process alembic upgrade вызывает `fileConfig()` без guard и отключает все ранее созданные логгеры.

Подтверждено на кластере `eqcms` (namespace `cms`) 2026-08-28: stream `NOTIFICATION_COMMANDS` содержит 4 сообщения, все в `commands.notification.email.send` с `Nats-Msg-Id`, равным `callback_request_id`; durable `vk-service-commands-send-vk` имеет `delivered=0, pending=0`; consumer `notification-service-callback-requested` отработал без redelivery.

## What Changes

- **BREAKING (messaging contract)**: `Nats-Msg-Id` VK- и email-команд перестаёт быть равным `callback_request_id` и становится уникальным в пределах stream идентификатором, детерминированно производным от пары «callback + канал». Producer и consumer меняются синхронно одним change.
- `vk-service` перестаёт валидировать равенство `Nats-Msg-Id == callback_request_id` и переходит на новое правило заголовка; per-recipient идемпотентность продолжает опираться на `event_uuid` из payload, а не на заголовок.
- Публикация в NATS перестаёт игнорировать ответ брокера: `PubAck.duplicate` проверяется и доходит до оркестратора. Дубликат логируется на уровне `warning` с correlation context и трактуется как идемпотентно принятая ранее команда того же канала, а не как ошибка — иначе штатная redelivery события приводила бы к отказу от подтверждения доставки и бесконечному NAK.
- `get_active_channels()` получает детерминированный порядок, чтобы состав и очерёдность публикуемых команд не зависели от физического порядка строк.
- notification-service снова пишет прикладные логи: in-process alembic upgrade перестаёт отключать существующие логгеры (guard `configure_logger`, как уже сделано в `services/backend/src/migration/env.py:21`). Тот же guard превентивно переносится в `email-service` и `vk-service`.
- Регрессионное покрытие: unit-тесты на уникальность msg-id и на обработку `duplicate=true`, а также live-проверка обоих каналов одного callback на реальном JetStream.

Вне scope: изменение состава каналов — канал `sms` по решению пользователя не трогаем, он остаётся seeded-активным и неподдерживаемым; изменение HTTP endpoints; изменение схемы payload команд.

## Capabilities

### New Capabilities

Новых capability нет — change исправляет поведение уже существующих.

### Modified Capabilities

- `vk-notification-delivery`: требование «MUST использовать `Nats-Msg-Id=callback_request_id`» заменяется на per-channel уникальный msg-id; соответственно меняется правило валидации заголовка в VK consumer.
- `notification-orchestrator`: оркестратор различает новое сообщение и duplicate в `PubAck`, логирует duplicate как аномалию и не роняет обработку; порядок обхода активных каналов детерминирован.
- `nats-jetstream-protocols`: фиксируется правило «`Nats-Msg-Id` уникален в пределах stream, а не subject» для всех producer'ов shared stream и расширяется real-JetStream acceptance matrix кейсом «две команды разных каналов по одному callback».
- `platform-observability`: in-process применение миграций MUST NOT отключать уже созданные логгеры сервиса.

## Impact

Код:
- `services/notification-service/src/clients/nats/publisher.py` — формирование `Nats-Msg-Id` для email и VK publishers.
- `services/notification-service/src/core/services/notification_orchestrator.py` — учёт `PubAck.duplicate`, признак `published`, подтверждение delivery.
- `services/notification-service/src/clients/nats/client.py` — проброс `PubAck` до вызывающего кода.
- `services/notification-service/src/repositories/channel.py` — детерминированный порядок активных каналов.
- `services/notification-service/src/migration/env.py`, `services/email-service/src/migration/env.py`, `services/vk-service/src/migration/env.py` — guard `configure_logger`.
- `services/vk-service/src/clients/nats/handlers/notification_commands_send_vk.py` — валидация заголовка.
- AsyncAPI-контракты notification-service и vk-service в части headers команд `commands.notification.email.send` и `commands.notification.vk.send`.

Инфраструктура и данные: топология JetStream (stream, subjects, durables, `duplicate_window`) не меняется; миграций БД нет; переменные окружения не добавляются.

API: HTTP endpoints не добавляются и не изменяются; access classes остаются прежними.

Совместимость: команды, опубликованные до деплоя и не обработанные, останутся валидными по payload, но их заголовок не пройдёт новую проверку в vk-service — поэтому деплой notification-service и vk-service выполняется совместно, при пустом `pending` у durable `vk-service-commands-send-vk`.
