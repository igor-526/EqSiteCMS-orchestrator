## 1. BE-1 — notification-service: msg-id и PubAck

Ownership: `services/notification-service/**`. Профиль: Backend.

- [x] 1.1 Добавить в `services/notification-service/src/core/schemas/messaging/` детерминированное вычисление `Nats-Msg-Id`: `uuid5(NAMESPACE_NOTIFICATION_COMMAND, f"{callback_request_id}:{channel_code}")` с namespace-константой и docstring, описывающим правило уникальности в пределах stream
- [x] 1.2 Перевести `NotificationCommandsSendEmailEventPublisher` и `NotificationCommandsSendVkEventPublisher` в `src/clients/nats/publisher.py` на вычисление msg-id из 1.1; убрать передачу одного `idempotency_key` в оба publisher как источник заголовка
- [x] 1.3 Пробросить `PubAck` через `NatsEventPublisher._publish_event` и вернуть из `publish()` результат с признаком duplicate вместо голого UUID
- [x] 1.4 В `src/core/services/notification_orchestrator.py` учесть признак duplicate: канал считается принятым, пишется `warning` с `correlation_id` и `channel_code`, исключение не поднимается, повторная публикация не выполняется
- [x] 1.5 Добавить `ORDER BY code` в `ChannelRepository.get_active_channels()` (`src/repositories/channel.py`)
- [x] 1.6 Unit-тесты: разные msg-id для email и VK одного callback; стабильность msg-id между двумя обработками одного callback; фиксированный тестовый вектор `(callback_request_id, channel_code) → msg-id`; duplicate `PubAck` не роняет обработку и не мешает delivery confirmation; детерминированный порядок каналов
- [x] 1.7 Verification: `make test` (или эквивалент) в `services/notification-service`; приложить вывод в handoff

## 2. BE-2 — notification-service: восстановление логирования

Ownership: `services/notification-service/**`, `services/email-service/src/migration/env.py`, `services/vk-service/src/migration/env.py`. Профиль: Backend. Зависит от: BE-1 (та же кодовая база, выполняется после).

- [x] 2.1 В `src/migration/env.py` вызывать `fileConfig` только при `config.attributes.get("configure_logger", True)`, по образцу `services/backend/src/migration/env.py:21`
- [x] 2.1a Перенести тот же guard превентивно в `services/email-service/src/migration/env.py` и `services/vk-service/src/migration/env.py`
- [x] 2.2 Unit-тест регрессии: логгер, созданный до `apply_migration`, после применения миграций не находится в состоянии `disabled`
- [x] 2.3 Verification: `make check-notification`, `make check-email`, `make check-vk`

## 3. BE-3 — vk-service: валидация заголовка

Ownership: `services/vk-service/**`. Профиль: Backend. Зависит от: BE-1 (тестовый вектор msg-id берётся из handoff BE-1).

- [x] 3.1 Добавить в `services/vk-service/src/core/schemas/messaging/` вычисление msg-id, идентичное 1.1, с тем же namespace и тем же фиксированным тестовым вектором
- [x] 3.2 В `src/clients/nats/handlers/notification_commands_send_vk.py` заменить проверку `message_id != command.callback_request_id` на сверку `Nats-Msg-Id` с вычисленным значением для канала `vk`
- [x] 3.3 Убедиться, что per-recipient идемпотентность продолжает опираться только на пару `(event_uuid, user_id)` и не использует `Nats-Msg-Id`
- [x] 3.4 Unit-тесты: валидный заголовок принимается; заголовок, равный `callback_request_id`, отклоняется; заголовок чужого канала отклоняется; тестовый вектор совпадает с вектором notification-service
- [x] 3.5 Verification: `make test` в `services/vk-service`; приложить вывод в handoff

## 4. CONTRACTS-1 — AsyncAPI и протокол

Ownership: `services/notification-service/docs/asyncapi.yaml`, `services/vk-service/docs/asyncapi.yaml`, `agents/howto/nats-jetstream-protocols.md`, README-секции «NATS JetStream» затронутых сервисов. Профиль: Backend. Зависит от: BE-1, BE-3.

- [x] 4.1 Обновить header-описание `Nats-Msg-Id` для `commands.notification.email.send` и `commands.notification.vk.send` в AsyncAPI обоих сервисов: формат UUID сохраняется, правило производности описано, значения producer и consumer идентичны
- [x] 4.2 Внести в `agents/howto/nats-jetstream-protocols.md` правило: дедупликация JetStream действует на уровне stream, а не subject; переиспользование одного `Nats-Msg-Id` для разных subjects одного stream запрещено; `PubAck.duplicate` обязателен к проверке
- [x] 4.3 Обновить README-секции «NATS JetStream» notification-service и vk-service в части заголовка команд
- [x] 4.4 Verification: `make asyncapi-validate` и `make asyncapi-validate-vk` в корне; приложить вывод в handoff. `Nats-Msg-Id` остаётся `type: string, format: uuid` в обоих документах — меняется только описание правила

## 5. Quality Gate

> Выполнено в рамках одной сессии без делегирования профильным агентам: операторская
> инструкция сессии запрещает запуск субагентов. Lane-проверки прогнаны как команды.

- [x] 5.1 `QG-BE` — PASS (`make check-notification` 129 passed, `make check-vk` 285 passed, `make check-email` 87 passed; статический анализ чист)
- [x] 5.2 `QG-CONTRACTS` — PASS (`make asyncapi-validate` и `-vk` 0 errors, `make contracts-check` 12 passed; вектор msg-id совпал в обеих кодовых базах; diff в границах ownership; топология и access matrix не изменены)
- [ ] 5.3 `QG-LIVE` — PARTIAL. Выполнено на реальном JetStream (локальный broker, изолированный run-scoped stream): два принятых сообщения одного callback с разными `Nats-Msg-Id`, повторная публикация даёт `duplicate=True` без лишнего сообщения. Остаётся после деплоя: `delivered=1` у обоих production durable, SMOKE через `.claude/skills/api-smoke-test`, vk-service smoke harness на реальных JetStream + PostgreSQL
- [x] 5.4 `QG-FE` — неприменимо: изменений в `services/frontend` и `services/site-*` нет
- [x] 5.5 `QG-SYNTH` — `APPROVED с условием`, отчёт: `docs/reports/fix-vk-notification-msg-id-collision-quality-gate.md`
- [x] 5.6 Findings, требующих возврата владельцам, нет

## 6. Завершение

- [x] 6.1 Синхронизировать delta specs в main specs (`openspec-sync-specs`) — обновлены `nats-jetstream-protocols`, `notification-orchestrator`, `platform-observability`, `vk-notification-delivery`
- [x] 6.2 Повторно выполнить `openspec validate fix-vk-notification-msg-id-collision --strict` — valid; `openspec validate --all --strict` — 58 passed, 0 failed
- [x] 6.3 Заархивировать change (`openspec-archive-change`)
- [ ] 6.4 **НЕ ВЫПОЛНЕНО НА МОМЕНТ АРХИВИРОВАНИЯ.** Post-deploy verification по шагу 5 «Migration Plan» из `design.md`: проверить два сообщения в stream, доставку VK-уведомления и наличие прикладных логов notification-service в stdout

> Change заархивирован по решению пользователя до деплоя. Незакрытыми остаются задача 6.4 и
> часть `QG-LIVE` (5.3): `delivered=1` у production durable, SMOKE через
> `.claude/skills/api-smoke-test` и vk-service smoke harness на реальных JetStream + PostgreSQL.
> Деплой notification-service и vk-service выполняется совместно; односторонний откат запрещён.
> Подробности: `docs/reports/fix-vk-notification-msg-id-collision-quality-gate.md`.
