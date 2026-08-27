# nats-jetstream-protocols Specification

## Purpose
Документирование протоколов и паттернов работы с NATS Jetstream включая настройку, Dependency Injection, публикацию, потребление событий и документирование использования в README.md сервисов.

## Requirements

### Requirement: NATS Jetstream конфигурация должна использовать отдельный класс настроек

Система SHALL использовать отдельный класс `NatsSettings` для всех настроек NATS Jetstream с префиксом `NATS_`.

#### Scenario: Настройки NATS вынесены в отдельный класс
- **WHEN** приложение запускается
- **THEN** все настройки NATS Jetstream загружаются из отдельного класса `NatsSettings`
- **AND** все переменные окружения NATS начинаются с префикса `NATS_`

#### Scenario: Валидация настроек NATS
- **WHEN** заданы некорректные настройки NATS
- **THEN** система должна выбросить ошибку валидации при запуске

### Requirement: NATS Jetstream клиент должен использовать Dependency Injection

Система SHALL использовать Dependency Injector для управления жизненным циклом NATS Jetstream клиента.

#### Scenario: NATS клиент создается через DI контейнер
- **WHEN** приложение запускается
- **THEN** NATS Jetstream клиент создается через Dependency Injector контейнер
- **AND** клиент доступен через DI, а не через `app.state`

#### Scenario: NATS клиент корректно закрывается
- **WHEN** приложение останавливается
- **THEN** NATS Jetstream клиент корректно закрывается через DI контейнер

### Requirement: NATS Jetstream streams должны настраиваться автоматически

Система SHALL автоматически настраивать NATS Jetstream streams при запуске.

#### Scenario: Streams создаются при запуске
- **WHEN** сервис запускается
- **THEN** все необходимые NATS Jetstream streams создаются автоматически
- **AND** конфигурация streams соответствует требованиям сервиса

#### Scenario: Идемпотентность настройки streams
- **WHEN** сервис перезапускается
- **THEN** существующие streams не создаются заново
- **AND** конфигурация streams обновляется при необходимости

### Requirement: NATS Jetstream consumers должны настраиваться автоматически

Система SHALL автоматически настраивать NATS Jetstream consumers при запуске.

#### Scenario: Consumers создаются при запуске
- **WHEN** сервис запускается
- **THEN** все необходимые NATS Jetstream consumers создаются автоматически
- **AND** конфигурация consumers соответствует требованиям сервиса

#### Scenario: Идемпотентность настройки consumers
- **WHEN** сервис перезапускается
- **THEN** существующие consumers не создаются заново
- **AND** конфигурация consumers обновляется при необходимости

### Requirement: NATS Jetstream publishing должен использовать DI

Система SHALL использовать Dependency Injection для публикации сообщений в NATS Jetstream.

#### Scenario: Publisher создается через DI
- **WHEN** нужно опубликовать сообщение
- **THEN** publisher создается через Dependency Injection
- **AND** publisher использует NATS клиент из DI контейнера

#### Scenario: Публикация сообщения
- **WHEN** нужно отправить событие в NATS Jetstream
- **THEN** сообщение публикуется в указанный subject
- **AND** возвращается PubAck подтверждение

### Requirement: NATS Jetstream consuming должен использовать DI

Система SHALL использовать Dependency Injection для потребления сообщений из NATS Jetstream.

#### Scenario: Consumer создается через DI
- **WHEN** нужно потреблять сообщения
- **THEN** consumer создается через Dependency Injection
- **AND** consumer использует NATS клиент из DI контейнера

#### Scenario: Обработка сообщений
- **WHEN** сообщение поступает в NATS Jetstream
- **THEN** consumer обрабатывает сообщение
- **AND** отправляет ack подтверждение после успешной обработки

### Requirement: Протокол NATS JetStream содержит правило документирования в README.md

Протокол `agents/howto/nats-jetstream-protocols.md` SHALL содержать секцию «Документирование в README.md» с правилом: если сервис использует NATS JetStream, его README.md MUST содержать секцию «NATS JetStream» с таблицей streams/subjects/consumers.

#### Scenario: Правило присутствует в протоколе
- **WHEN** разработчик открывает `agents/howto/nats-jetstream-protocols.md`
- **THEN** он находит секцию «Документирование в README.md» с описанием формата таблицы и требования к заполнению.

### Requirement: README.md сервиса backend содержит секцию NATS JetStream

Файл `services/backend/README.md` MUST существовать и содержать секцию «NATS JetStream» с ролью Publisher, таблицей stream SITE_EVENTS и subject events.site.callback.requested.

#### Scenario: README.md backend создан и содержит NATS секцию
- **WHEN** разработчик открывает `services/backend/README.md`
- **THEN** он находит секцию «NATS JetStream» с ролью «Publisher», stream «SITE_EVENTS», subject «events.site.callback.requested» и описанием «Публикация события запроса обратного звонка».

### Requirement: README.md сервиса notification-service содержит секцию NATS JetStream

Файл `services/notification-service/README.md` MUST содержать секцию «NATS JetStream» с ролью Pub/Sub, таблицей двух streams (SITE_EVENTS, NOTIFICATION_COMMANDS) и соответствующих subjects.

#### Scenario: README.md notification-service содержит NATS секцию
- **WHEN** разработчик открывает `services/notification-service/README.md`
- **THEN** он находит секцию «NATS JetStream» с ролью «Pub/Sub», stream «SITE_EVENTS» (subject «events.site.callback.requested», входящий), stream «NOTIFICATION_COMMANDS» (subject «commands.notification.email.send», исходящий).

### Requirement: README.md сервиса email-service содержит секцию NATS JetStream

Файл `services/email-service/README.md` MUST содержать секцию «NATS JetStream» с ролью Consumer, таблицей stream NOTIFICATION_COMMANDS и subject commands.notification.email.send.

#### Scenario: README.md email-service содержит NATS секцию
- **WHEN** разработчик открывает `services/email-service/README.md`
- **THEN** он находит секцию «NATS JetStream» с ролью «Consumer», stream «NOTIFICATION_COMMANDS», subject «commands.notification.email.send» и описанием «Приём команды на отправку email».

### Requirement: Канонический AsyncAPI core messaging
Backend, notification-service и email-service MUST содержать `docs/asyncapi.yaml`, описывающий фактические streams, subjects, headers, payload schemas и producer/consumer ownership без расхождения с runtime settings/handlers.

#### Scenario: Контракт валидируется
- **WHEN** выполняется `make asyncapi-validate`
- **THEN** все три AsyncAPI проходят validation, а subjects/payload/header fields совпадают с кодом

### Requirement: Real JetStream acceptance matrix
Messaging gate MUST выполняться на реальном NATS JetStream и покрывать stream provisioning, durable/filter, успешный ack, временный nak/redelivery, poison message до max-deliver, duplicate-event idempotency и сквозную совместимость backend producer → notification consumer/producer → email consumer. Skip, отсутствие tests или mocked broker MUST NOT считаться PASS.

#### Scenario: Успешная доставка
- **WHEN** валидное callback event публикуется backend
- **THEN** notification обрабатывает его один раз, публикует совместимую email command, email consumer ack-ает command после успешной передачи в Celery

#### Scenario: Временная ошибка и poison message
- **WHEN** handler временно падает либо payload постоянно невалиден
- **THEN** broker evidence подтверждает nak/redelivery и достижение max-deliver без ложного ack

#### Scenario: Дубликат event
- **WHEN** одно logical event приходит повторно с тем же message identity
- **THEN** обработка не создаёт повторную пользовательскую отправку

### Requirement: Разделение contract ownership и adapters
Один последовательный владелец SHALL сначала изменить AsyncAPI/howto, после чего adapters каждого сервиса SHALL обновляться по непересекающимся path ownership. Объединение трёх NATS client implementations MUST NOT быть обязательным для acceptance.

#### Scenario: Требуется topology change
- **WHEN** implementation обнаруживает необходимость менять subject, stream, durable или payload
- **THEN** работа останавливается до обновления delta spec и повторного approval

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

### Requirement: Callback event MUST carry tenant identity
Backend Core producer и Notification Service consumer MUST использовать согласованный payload `events.site.callback.requested` с обязательным `equestrian_id` формата UUID. Значение MUST происходить из уже проверенного `EquestrianContext.id` создания заявки и MUST оставаться неизменным на пути до recipient selection.

#### Scenario: Producer publishes tenant UUID
- **WHEN** callback-заявка создана для валидного tenant context
- **THEN** опубликованный payload содержит `equestrian_id`, равный tenant UUID сохранённой заявки

#### Scenario: Producer and consumer contracts match
- **WHEN** Quality Gate сравнивает Backend Core и Notification Service AsyncAPI/DTO
- **THEN** обязательные поля, UUID format и `additionalProperties: false` для callback payload совпадают

#### Scenario: Old payload is rejected safely
- **WHEN** consumer получает ранее допустимый payload без `equestrian_id`
- **THEN** payload не приводит к глобальному recipient lookup или публикации email command и обрабатывается по действующей retry/DLQ политике
