# vk-notification-delivery Specification

## Purpose
Определить каноническую VK-команду, безопасную и идемпотентную доставку уведомлений через VK Service, а также изолированную live-проверку этого контура.

## Requirements

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

### Requirement: Durable VK consumer
VK Service MUST регистрировать и запускать pull consumer `vk-service-commands-send-vk` с filter subject `commands.notification.vk.send`, explicit ack, настраиваемыми `ack_wait` и `max_deliver`. Сервис MUST NOT создавать stream `NOTIFICATION_COMMANDS`, владельцем stream остаётся Notification Service.

#### Scenario: Consumer запускается в lifespan
- **WHEN** VK Service стартует при доступном NATS
- **THEN** durable consumer создан/актуализирован и consumption task запущен ровно один раз

#### Scenario: Успешная обработка
- **WHEN** валидная command обработана без retryable failures
- **THEN** consumer выполняет ACK

#### Scenario: Невалидная или временно неуспешная обработка
- **WHEN** payload/header невалиден либо VK send возвращает retryable failure
- **THEN** consumer выполняет NAK и JetStream повторяет command не более настроенного `max_deliver`

### Requirement: Получатели определяются только по активным VK-привязкам
VK Service MUST выбирать назначения только среди переданных `user_ids` и только из `user_vks` со `state=ACTIVE`, непустым `vk_peer_id` и `deleted_at IS NULL`. PENDING, BLOCKED, soft-deleted, отсутствующие и не перечисленные привязки MUST NOT приводить к вызову VK API.

#### Scenario: Active binding
- **WHEN** command содержит user ID с ACTIVE не удалённой привязкой
- **THEN** messenger вызывается с сохранённым `vk_peer_id` и текстом command

#### Scenario: Неактивная привязка
- **WHEN** binding находится в PENDING/BLOCKED, soft-deleted либо отсутствует
- **THEN** VK API не вызывается для этого user ID

#### Scenario: Чужая привязка
- **WHEN** в БД существует ACTIVE binding пользователя, отсутствующего в `user_ids` command
- **THEN** эта привязка не выбирается и сообщение ей не отправляется

### Requirement: Идемпотентная per-recipient доставка
VK Service MUST хранить устойчивое состояние доставки отдельно для каждой пары `(event_uuid,user_id)`. Успешный send MUST фиксироваться как `SENT` после ответа VK API; повторная обработка MUST не отправлять SENT recipient снова. Failed recipient MUST быть retryable независимо от уже успешных recipients той же command, а конкурентные дубликаты MUST приводить не более чем к одному успешному send на пару.

#### Scenario: Redelivery после полного успеха
- **WHEN** та же command доставлена повторно после фиксации всех recipients как SENT
- **THEN** VK API не вызывается повторно и command ACK-ается

#### Scenario: Частичный успех
- **WHEN** один recipient отправлен успешно, а второй завершился retryable failure
- **THEN** первый фиксируется SENT, command NAK-ается, а при redelivery повторяется только второй recipient

#### Scenario: Конкурентный дубликат
- **WHEN** два обработчика конкурентно получают один `event_uuid` и `user_id`
- **THEN** уникальное ограничение и транзакционная обработка не допускают два успешных send

### Requirement: Безопасная наблюдаемость VK delivery
VK Service MUST фиксировать event/user/peer correlation, status, attempts и безопасную причину ошибки, но MUST NOT сохранять или логировать VK group token, полный message text либо phone заявителя. Миграция ledger MUST иметь проверяемый upgrade/downgrade и не изменять таблицы привязки/подтверждения.

#### Scenario: Успешный audit
- **WHEN** VK message отправлена
- **THEN** ledger содержит SENT, event/user identity, peer snapshot, attempt count и timestamps без текста или token

#### Scenario: Ошибка audit
- **WHEN** VK API отклоняет send
- **THEN** ledger содержит FAILED и безопасную диагностическую категорию без payload PII и secrets

### Requirement: HTTP access surface остаётся неизменной
Change MUST NOT добавлять или изменять HTTP endpoints. Существующие callback create, notification settings, service users и delivery-confirmation boundaries MUST сохранять текущие access classes и anonymous/authenticated/service-key outcomes из design access matrix.

#### Scenario: Access regression
- **WHEN** Quality Gate проверяет связанные HTTP endpoints без auth, с user auth и с service key
- **THEN** public callback exception, protected private settings и protected service endpoints отвечают по существующему контракту без нового доступа

### Requirement: Изолированный local smoke harness
Система MUST предоставлять отдельный one-shot local CLI composition root для live проверки VK consumer/handler/repository через реальный JetStream и PostgreSQL с детерминированным scripted messenger. Harness MUST быть disabled by default, MUST отказать до внешних подключений вне явно подтверждённого local режима, MUST принимать только точные synthetic targets и MUST использовать отдельные run-scoped stream/subject/durable. Он MUST NOT входить в production DI/lifespan, создавать HTTP endpoints, вызывать VK API, подписываться на production subject/durable либо выводить payload, text, phone, token, peer ID или user IDs.

#### Scenario: Полный отказ provider
- **WHEN** local harness получает synthetic recipient с планом `fail-always`
- **THEN** штатный consumer/handler сохраняет `FAILED`, выполняет NAK и наблюдает bounded redelivery без вызова реального VK

#### Scenario: Частичный отказ provider
- **WHEN** один synthetic recipient имеет `success`, а второй `fail-first-then-success`
- **THEN** первая обработка сохраняет первый `SENT` и второй `FAILED`, redelivery не повторяет первый и переводит второй в `SENT`

#### Scenario: Guard или cleanup нарушен
- **WHEN** отсутствует local opt-in, target не точный либо runner завершается успешно/с ошибкой
- **THEN** до подключения выполняется fail-fast, а после запуска удаляются только перечисленные fixture IDs и run-scoped topology; production resources не изменяются

### Requirement: Per-recipient идемпотентность не зависит от Nats-Msg-Id
VK Service MUST определять повторную обработку только по паре `(event_uuid, user_id)` из payload и MUST NOT использовать `Nats-Msg-Id` как ключ идемпотентности доставки. Изменение схемы формирования `Nats-Msg-Id` MUST NOT приводить к повторной отправке уже `SENT` получателям.

#### Scenario: Redelivery после смены схемы msg-id
- **WHEN** команда с прежним `event_uuid` доставляется повторно уже после перехода на новый `Nats-Msg-Id`
- **THEN** получатели со статусом `SENT` не получают сообщение повторно
- **AND** команда ACK-ается

#### Scenario: Ключ идемпотентности в ledger
- **WHEN** reviewer проверяет ledger доставки
- **THEN** уникальность обеспечивается парой `(event_uuid, user_id)`, а `Nats-Msg-Id` в ключ не входит
