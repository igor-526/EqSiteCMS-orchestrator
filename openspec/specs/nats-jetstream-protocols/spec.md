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
