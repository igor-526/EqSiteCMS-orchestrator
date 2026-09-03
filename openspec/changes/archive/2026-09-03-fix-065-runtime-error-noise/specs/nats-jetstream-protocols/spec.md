## ADDED Requirements

### Requirement: Штатный idle timeout pull-consumers Notification и VK

Pull-consumers `notification-service` для `events.site.callback.requested` и `vk-service` для `commands.notification.vk.send` MUST классифицировать истечение timeout операции JetStream `fetch()` без сообщений как штатное idle-состояние. Перехват MUST учитывать фактически выбрасываемый поддерживаемой версией `nats-py` встроенный `asyncio.TimeoutError` и совместимый NATS timeout, MUST быть ограничен fetch boundary и MUST NOT подавлять cancellation, connection/protocol или handler errors. Idle MUST продолжать следующий fetch без error/warning log, Sentry/GlitchTip event, ack/nak и прикладного побочного эффекта.

#### Scenario: Notification consumer простаивает без событий
- **WHEN** `CallbackRequestConsumer.fetch()` завершается встроенным `asyncio.TimeoutError` при пустом stream
- **THEN** consumer начинает следующий fetch без error/warning telemetry и без ack/nak

#### Scenario: VK command consumer простаивает без команд
- **WHEN** `NotificationCommandsSendVkConsumer.fetch()` завершается встроенным `asyncio.TimeoutError` при пустом stream
- **THEN** consumer начинает следующий fetch без error/warning telemetry и без попытки доставки VK-сообщения

#### Scenario: Сообщение появляется после idle windows
- **WHEN** после одного или нескольких idle timeout поступает валидное сообщение
- **THEN** соответствующий consumer обрабатывает его штатным handler и подтверждает через ack без потери сообщения

#### Scenario: Отмена consumer не маскируется
- **WHEN** consumer task получает `asyncio.CancelledError`
- **THEN** cancellation пробрасывается, stop завершается и новый fetch не начинается

#### Scenario: Реальная ошибка broker остаётся видимой
- **WHEN** fetch завершается connection/protocol exception, не являющимся idle timeout
- **THEN** consumer пишет диагностическое сообщение, применяет предусмотренный backoff и продолжает цикл

### Requirement: Неизменность messaging-контракта исправления 065

Исправление MUST NOT менять streams `SITE_EVENTS` и `NOTIFICATION_COMMANDS`, subjects, durable names, ack policy, headers, payload schemas или producer/consumer ownership. Runtime settings и AsyncAPI Notification Service/VK Service MUST оставаться согласованными; обнаруженная необходимость topology/payload изменения MUST остановить apply до расширения delta spec и повторного approval.

#### Scenario: AsyncAPI и runtime согласованы
- **WHEN** выполняется contract review и валидация AsyncAPI
- **THEN** topology и схемы совпадают с текущим каноническим контрактом, а diff ограничен exception classification и observability

