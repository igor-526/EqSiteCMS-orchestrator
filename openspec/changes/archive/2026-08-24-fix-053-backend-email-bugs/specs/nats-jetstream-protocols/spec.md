## ADDED Requirements

### Requirement: Штатный idle timeout pull-consumer email-service

Email-service MUST классифицировать истечение timeout операции JetStream pull `fetch()` при отсутствии сообщений как штатное idle-состояние: consumer продолжает следующий fetch без error/warning log, Sentry exception event, ack/nak или создания email-log. Перехват MUST учитывать фактические timeout-типы поддерживаемой runtime-версии `nats-py`, быть ограничен fetch boundary и не подавлять cancellation, connection, protocol или handler errors.

#### Scenario: Пустая очередь
- **WHEN** `fetch()` заканчивается штатным timeout без сообщений
- **THEN** consumer продолжает работу, не пишет `Failed to fetch NATS messages` и не отправляет exception telemetry

#### Scenario: Совместимые timeout-типы
- **WHEN** поддерживаемая runtime-библиотека поднимает `nats.errors.TimeoutError` либо совместимый built-in/asyncio timeout из fetch
- **THEN** оба фактически возможных штатных типа классифицируются одинаково как idle

#### Scenario: Остановка consumer
- **WHEN** task consumer отменяется во время fetch
- **THEN** `asyncio.CancelledError` пробрасывается, stop завершается и consumer не начинает новый fetch

#### Scenario: Реальная broker error
- **WHEN** fetch завершается connection/protocol exception, не являющимся idle timeout
- **THEN** consumer логирует `Failed to fetch NATS messages`, применяет backoff и затем повторяет fetch

#### Scenario: Сообщение после idle windows
- **WHEN** после одного или нескольких idle timeout появляется валидная email command
- **THEN** consumer обрабатывает её существующим handler и ack-ает после успешной передачи без потери сообщения

#### Scenario: Handler error не маскируется
- **WHEN** fetch возвращает сообщение, но handler завершается ошибкой
- **THEN** consumer сохраняет существующее error-log и nak поведение; timeout fix не преобразует ошибку в idle

### Requirement: Неизменность NATS topology и контрактов

Исправление idle timeout MUST NOT менять stream `NOTIFICATION_COMMANDS`, subject `commands.notification.email.send`, durable consumer, headers, payload schema или producer/consumer ownership. Runtime settings и `services/email-service/docs/asyncapi.yaml` MUST оставаться согласованными. Необходимость topology/payload изменения MUST остановить apply до расширения delta spec и нового approval.

#### Scenario: Contract validation
- **WHEN** выполняется AsyncAPI/runtime contract review
- **THEN** stream, subject, durable, headers и payload совпадают с текущим каноническим контрактом, а изменение ограничено consumer exception classification

### Requirement: Проверки регрессии email idle timeout

Реализация MUST иметь не менее 30 разнообразных unit scenarios и 30 live smoke scenarios. Smoke MUST выполняться smoke skill на реальном NATS JetStream и реальной PostgreSQL email-service, найденной повторным `docker inspect`; mocks допустимы только в unit tests, pytest smoke scripts запрещены.

#### Scenario: Unit gate email consumer
- **WHEN** Email Backend owner завершает реализацию
- **THEN** unit suite не менее чем 30 отдельными проверками покрывает timeout-типы, logging/telemetry silence, cancellation, broker failures/backoff, start/stop, ack/nak и сообщения после idle

#### Scenario: Live smoke gate email consumer
- **WHEN** Quality Gate проверяет change на живой инфраструктуре
- **THEN** smoke skill выполняет не менее 30 сценариев с idle windows, реальным publish/delivery/redelivery, email-log PostgreSQL evidence и отсутствием ложных error events
