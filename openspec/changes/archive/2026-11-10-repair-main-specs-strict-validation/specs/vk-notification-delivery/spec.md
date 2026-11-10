## MODIFIED Requirements

### Requirement: Каноническая VK notification command

Notification Service MUST публиковать каноническую `NotificationVkCommand`, а VK Service MUST проверять идентичный контракт payload и заголовка; идентификаторы email- и VK-команд одного callback MUST различаться в общем stream.

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

#### Scenario: Полный контракт payload и заголовка VK-команды

- **WHEN** Notification Service формирует команду VK и VK Service проверяет её контракт
- **THEN** Notification Service MUST публиковать `NotificationVkCommand` в subject `commands.notification.vk.send` существующего stream `NOTIFICATION_COMMANDS`. Payload MUST содержать `occurred_at`, `event_uuid`, `callback_request_id`, непустой уникальный массив `user_ids` и непустой plain-text `text`, MUST запрещать дополнительные поля и MUST использовать `Nats-Msg-Id`, детерминированно производный от пары `callback_request_id` и кода канала и уникальный в пределах stream `NOTIFICATION_COMMANDS`. `Nats-Msg-Id` VK-команды MUST NOT совпадать с `Nats-Msg-Id` email-команды того же callback. VK Service MUST валидировать заголовок по тому же правилу производности и MUST NOT требовать равенства `Nats-Msg-Id` и `callback_request_id`. Notification Service producer schema и VK Service consumer schema MUST быть идентичны.

### Requirement: Изолированный local smoke harness

Система MUST предоставлять отключённый по умолчанию изолированный one-shot local CLI harness для проверки доставки через реальные JetStream и PostgreSQL со scripted messenger; harness MUST проверять local opt-in и точные synthetic targets до подключений и MUST NOT затрагивать production или раскрывать чувствительные данные.

#### Scenario: Полный отказ provider
- **WHEN** local harness получает synthetic recipient с планом `fail-always`
- **THEN** штатный consumer/handler сохраняет `FAILED`, выполняет NAK и наблюдает bounded redelivery без вызова реального VK

#### Scenario: Частичный отказ provider
- **WHEN** один synthetic recipient имеет `success`, а второй `fail-first-then-success`
- **THEN** первая обработка сохраняет первый `SENT` и второй `FAILED`, redelivery не повторяет первый и переводит второй в `SENT`

#### Scenario: Guard или cleanup нарушен
- **WHEN** отсутствует local opt-in, target не точный либо runner завершается успешно/с ошибкой
- **THEN** до подключения выполняется fail-fast, а после запуска удаляются только перечисленные fixture IDs и run-scoped topology; production resources не изменяются

#### Scenario: Границы и изоляция local smoke harness

- **WHEN** запускается local CLI harness для live проверки VK delivery
- **THEN** Система MUST предоставлять отдельный one-shot local CLI composition root для live проверки VK consumer/handler/repository через реальный JetStream и PostgreSQL с детерминированным scripted messenger. Harness MUST быть disabled by default, MUST отказать до внешних подключений вне явно подтверждённого local режима, MUST принимать только точные synthetic targets и MUST использовать отдельные run-scoped stream/subject/durable. Он MUST NOT входить в production DI/lifespan, создавать HTTP endpoints, вызывать VK API, подписываться на production subject/durable либо выводить payload, text, phone, token, peer ID или user IDs.
