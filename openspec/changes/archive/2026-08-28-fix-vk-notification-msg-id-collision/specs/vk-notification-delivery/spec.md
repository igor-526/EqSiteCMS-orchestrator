## MODIFIED Requirements

### Requirement: Каноническая VK notification command
Notification Service MUST публиковать `NotificationVkCommand` в subject `commands.notification.vk.send` существующего stream `NOTIFICATION_COMMANDS`. Payload MUST содержать `occurred_at`, `event_uuid`, `callback_request_id`, непустой уникальный массив `user_ids` и непустой plain-text `text`, MUST запрещать дополнительные поля и MUST использовать `Nats-Msg-Id`, детерминированно производный от пары `callback_request_id` и кода канала и уникальный в пределах stream `NOTIFICATION_COMMANDS`. `Nats-Msg-Id` VK-команды MUST NOT совпадать с `Nats-Msg-Id` email-команды того же callback. VK Service MUST валидировать заголовок по тому же правилу производности и MUST NOT требовать равенства `Nats-Msg-Id` и `callback_request_id`. Notification Service producer schema и VK Service consumer schema MUST быть идентичны.

#### Scenario: Валидная команда опубликована
- **WHEN** callback имеет хотя бы одного eligible пользователя с включённым VK-каналом
- **THEN** Notification Service публикует AsyncAPI-valid command в `commands.notification.vk.send` с UUID адресатов и callback correlation ID
- **AND** брокер принимает команду как новое сообщение, а не как duplicate

#### Scenario: Email и VK команды одного callback сосуществуют
- **WHEN** для одного `callback_request_id` публикуются email- и VK-команды внутри `duplicate_window` stream `NOTIFICATION_COMMANDS`
- **THEN** их `Nats-Msg-Id` различаются
- **AND** stream содержит оба сообщения, а durable каждого канала получает своё

#### Scenario: Заголовок команды не соответствует правилу
- **WHEN** VK Service получает команду, чей `Nats-Msg-Id` не соответствует правилу производности от `callback_request_id` и кода канала
- **THEN** обработка отклоняется как невалидная по действующей retry/DLQ политике без вызова VK API

#### Scenario: Recipient list пуст
- **WHEN** ни один пользователь не проходит tenant, role и `callback/vk` preference filters
- **THEN** VK command не публикуется

#### Scenario: PII и внутренние UUID в тексте
- **WHEN** формируется текст VK notification
- **THEN** он содержит только отображаемые поля заявки с fallback-значениями и MUST NOT содержать callback, tenant, event или user UUID

## ADDED Requirements

### Requirement: Per-recipient идемпотентность не зависит от Nats-Msg-Id
VK Service MUST определять повторную обработку только по паре `(event_uuid, user_id)` из payload и MUST NOT использовать `Nats-Msg-Id` как ключ идемпотентности доставки. Изменение схемы формирования `Nats-Msg-Id` MUST NOT приводить к повторной отправке уже `SENT` получателям.

#### Scenario: Redelivery после смены схемы msg-id
- **WHEN** команда с прежним `event_uuid` доставляется повторно уже после перехода на новый `Nats-Msg-Id`
- **THEN** получатели со статусом `SENT` не получают сообщение повторно
- **AND** команда ACK-ается

#### Scenario: Ключ идемпотентности в ledger
- **WHEN** reviewer проверяет ledger доставки
- **THEN** уникальность обеспечивается парой `(event_uuid, user_id)`, а `Nats-Msg-Id` в ключ не входит
