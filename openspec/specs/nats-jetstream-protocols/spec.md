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

Система SHALL использовать Dependency Injector для управления жизненным циклом NATS Jetstream клиента. Завершение клиента MUST быть устойчиво к состоянию соединения: если `drain()` завершается ошибкой `nats.errors.Error` или таймаутом (в частности `ConnectionReconnectingError` при остановке во время reconnect), клиент MUST перехватить её, зафиксировать `warning` и закрыть соединение через `close()`, не пробрасывая исключение в `lifespan`. Перехват MUST быть точечным по типам ошибок NATS и MUST NOT подменяться широким `except Exception`. Внутреннее состояние (`_connection`, `_jetstream`) MUST обнуляться независимо от исхода.

#### Scenario: NATS клиент создается через DI контейнер
- **WHEN** приложение запускается
- **THEN** NATS Jetstream клиент создается через Dependency Injector контейнер
- **AND** клиент доступен через DI, а не через `app.state`

#### Scenario: NATS клиент корректно закрывается
- **WHEN** приложение останавливается
- **THEN** NATS Jetstream клиент корректно закрывается через DI контейнер

#### Scenario: Остановка во время reconnect не роняет shutdown
- **WHEN** приложение останавливается в момент, когда соединение находится в состоянии reconnecting, и `drain()` выбрасывает `ConnectionReconnectingError`
- **THEN** `close()` перехватывает ошибку, пишет `warning` и вызывает `close()` соединения
- **AND** `lifespan` завершается без трейсбэка и без error-события мониторинга
- **AND** `_connection` и `_jetstream` обнуляются

### Requirement: NATS Jetstream streams должны настраиваться автоматически

Система SHALL автоматически настраивать NATS Jetstream streams при запуске. Stream MUST создаваться только сервисами-владельцами топологии; сервис, не публикующий и не потребляющий сообщения этого stream, MUST NOT вызывать `add_stream` и MUST оставлять `setup_streams()` no-op, чтобы не конкурировать за `StreamConfig`. Владельцами stream `NOTIFICATION_COMMANDS` остаются `notification-service` и `email-service`; `vk-service` на этапе скелета владельцем не является.

#### Scenario: Streams создаются при запуске
- **WHEN** сервис запускается
- **THEN** все необходимые NATS Jetstream streams создаются автоматически
- **AND** конфигурация streams соответствует требованиям сервиса

#### Scenario: Идемпотентность настройки streams
- **WHEN** сервис перезапускается
- **THEN** существующие streams не создаются заново
- **AND** конфигурация streams обновляется при необходимости

#### Scenario: Сервис без активного канала не создаёт stream
- **WHEN** запускается `vk-service` в состоянии скелета
- **THEN** `setup_streams()` не выполняет ни одного вызова `add_stream`
- **AND** конфигурация stream `NOTIFICATION_COMMANDS` остаётся такой, какой её создали сервисы-владельцы

### Requirement: NATS Jetstream consumers должны настраиваться автоматически

Система SHALL автоматически настраивать NATS Jetstream consumers при запуске. Durable consumer MUST регистрироваться только сервисом, который фактически обрабатывает сообщения соответствующего subject. Сервис без активного обработчика MUST оставлять `setup_consumers()` no-op и MUST NOT создавать durable, чтобы не порождать неподтверждаемые pending-сообщения. Регрессионная проверка влияния такого сервиса на чужие цепочки SHALL ограничиваться shared stream, к которому он имеет доступ, и MUST NOT требовать сквозного прогона producer-legs, с которыми у сервиса нет точек соприкосновения. Live-проверка shared stream MUST NOT вызывать реальных внешних побочных эффектов (отправка писем, записи в БД чужих сервисов): для этого используется уже обработанный идемпотентный идентификатор события, а опубликованное сообщение удаляется из stream после проверки.

Регистрация durable consumer на stream, которым сервис не владеет, MUST быть устойчива к порядку деплоя: `setup_consumers()` SHALL ретраить `nats.js.errors.NotFoundError` (`stream not found`) с backoff, ограниченным `NATS_SETUP_MAX_ATTEMPTS` (default `10`, `ge=1`) и `NATS_SETUP_BACKOFF_SECONDS` (default `2.0`, `ge=0`), и MUST завершать startup ошибкой только после исчерпания попыток. Ретрай MUST NOT приводить к созданию чужого stream: `add_stream` на stream другого владельца остаётся запрещённым.

#### Scenario: Consumers создаются при запуске
- **WHEN** сервис запускается
- **THEN** все необходимые NATS Jetstream consumers создаются автоматически
- **AND** конфигурация consumers соответствует требованиям сервиса

#### Scenario: Идемпотентность настройки consumers
- **WHEN** сервис перезапускается
- **THEN** существующие consumers не создаются заново
- **AND** конфигурация consumers обновляется при необходимости

#### Scenario: Сервис без обработчика не создаёт durable
- **WHEN** запускается `vk-service` в состоянии скелета
- **THEN** `setup_consumers()` не выполняет ни одного вызова `add_consumer`
- **AND** durable `notification-service-commands-send-email` и его состояние доставки не изменяются

#### Scenario: Доставка через shared stream остаётся живой

- **WHEN** после запуска `vk-service` в subject `commands.notification.email.send` публикуется сообщение с уже обработанным `event_uuid`
- **THEN** сообщение доставляется durable `notification-service-commands-send-email` и ack'ается
- **AND** `num_pending` и `num_ack_pending` возвращаются к нулю, а `delivered_stream_seq` и `ack_floor` продвигаются на опубликованный seq
- **AND** побочных эффектов нет: обработчик распознаёт дубликат, Celery-задача не создаётся, письмо не отправляется и `email_logs` не растёт
- **AND** опубликованное сообщение удаляется из stream, восстанавливая исходное число сообщений

#### Scenario: Регрессия producer-leg вне scope

- **WHEN** оценивается необходимость сквозной проверки `backend → notification`
- **THEN** она не относится к scope change, поскольку `vk-service` не создаёт stream, не регистрирует durable и не публикует ни одного сообщения
- **AND** единственная точка влияния на email-цепочку — shared stream `NOTIFICATION_COMMANDS` — проверяется отдельным live-сценарием

#### Scenario: Чужой stream ещё не создан владельцем
- **WHEN** `notification-service` стартует раньше `backend` и `add_consumer` на `SITE_EVENTS` отвечает `404 stream not found`
- **THEN** сервис повторяет попытку с backoff в пределах `NATS_SETUP_MAX_ATTEMPTS`
- **AND** после создания stream владельцем durable регистрируется, а startup завершается успешно
- **AND** `add_stream` для `SITE_EVENTS` со стороны `notification-service` не вызывается

#### Scenario: Владелец stream так и не появился
- **WHEN** чужой stream отсутствует дольше, чем допускают `NATS_SETUP_MAX_ATTEMPTS` и `NATS_SETUP_BACKOFF_SECONDS`
- **THEN** `setup_consumers()` завершается ошибкой и startup падает явно
- **AND** причина отказа содержит имя отсутствующего stream

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

### Requirement: Резервирование VK messaging-имён без активации контракта

`vk-service` SHALL резервировать имена будущего VK-канала в `NatsSettings`: `NATS_SUBJECT_NOTIFICATION_COMMANDS_SEND_VK` со значением `commands.notification.vk.send` и `NATS_CONSUMER_NOTIFICATION_COMMANDS_SEND_VK` со значением `vk-service-commands-send-vk`. Зарезервированный subject MUST попадать под уже существующий wildcard `commands.notification.>` stream `NOTIFICATION_COMMANDS`, чтобы активация канала не требовала изменения существующей топологии. На этапе скелета файл `services/vk-service/docs/asyncapi.yaml` MUST NOT создаваться, а цель `asyncapi-validate` корневого `Makefile` MUST NOT расширяться: канонический AsyncAPI-документ MUST появляться одновременно с реальным consumer и обработчиком отдельным change. `services/vk-service/README.md` MUST содержать раздел «NATS JetStream (зарезервировано)» с планируемыми stream/subject/durable и явной пометкой о неактивированном контракте.

#### Scenario: Имена зарезервированы и не конфликтуют
- **WHEN** reviewer сверяет `NatsSettings` сервисов `email-service` и `vk-service`
- **THEN** subjects `commands.notification.email.send` и `commands.notification.vk.send` различаются, durable `notification-service-commands-send-email` и `vk-service-commands-send-vk` различаются
- **AND** оба subject покрываются wildcard `commands.notification.>`

#### Scenario: Ложный канонический контракт не публикуется
- **WHEN** reviewer проверяет `services/vk-service/docs/` и цель `asyncapi-validate`
- **THEN** `services/vk-service/docs/asyncapi.yaml` отсутствует
- **AND** `asyncapi-validate` валидирует только backend, notification-service и email-service

#### Scenario: Резерв задокументирован
- **WHEN** reviewer читает `services/vk-service/README.md`
- **THEN** раздел «NATS JetStream (зарезервировано)» перечисляет планируемые stream, subject и durable и указывает, что подписка не активирована

### Requirement: NATS-клиент регистрирует connection-колбэки с политикой эскалации

Каждый сервис при `connect()` SHALL регистрировать собственные `error_cb`, `disconnected_cb`, `reconnected_cb` и `closed_cb`, чтобы транзиентные сбои брокера не превращались в error-события мониторинга. Последовательные неудачи одного инцидента MUST логироваться на уровне `warning` без `exc_info`, пока их число не превысит порог `NATS_ERROR_REPORT_AFTER_ATTEMPTS` (default `3`, `ge=1`). После превышения порога сервис MUST записать ровно один `error` с `exc_info` на инцидент и MUST NOT повторять его на каждой следующей попытке. Успешный `reconnected_cb` MUST сбрасывать счётчик и признак уже отправленной эскалации.

#### Scenario: Кратковременный сбой брокера не эскалируется
- **WHEN** соединение с NATS теряется и восстанавливается за число попыток, не превышающее `NATS_ERROR_REPORT_AFTER_ATTEMPTS`
- **THEN** сервис пишет только `warning` без `exc_info`
- **AND** ни одного `error`-события мониторинга по этому инциденту не создаётся

#### Scenario: Затяжная недоступность брокера эскалируется один раз
- **WHEN** число последовательных неудачных попыток соединения превышает `NATS_ERROR_REPORT_AFTER_ATTEMPTS`
- **THEN** сервис записывает ровно один `error` с `exc_info` за инцидент
- **AND** последующие неудачные попытки того же инцидента остаются на уровне `warning`

#### Scenario: Восстановление соединения сбрасывает состояние
- **WHEN** после эскалации соединение восстанавливается и срабатывает `reconnected_cb`
- **THEN** счётчик последовательных неудач и признак эскалации сбрасываются
- **AND** следующий независимый инцидент снова проходит полный порог перед эскалацией
