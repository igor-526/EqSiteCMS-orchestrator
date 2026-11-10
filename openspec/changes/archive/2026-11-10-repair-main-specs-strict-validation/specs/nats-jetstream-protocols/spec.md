## MODIFIED Requirements

### Requirement: NATS Jetstream клиент должен использовать Dependency Injection

Система SHALL управлять NATS Jetstream клиентом через Dependency Injector; shutdown MUST точечно обрабатывать ошибки NATS и timeout с warning и close(), не прерывать lifespan и всегда обнулять внутреннее состояние согласно сценариям.

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

#### Scenario: Полный контракт DI и устойчивого завершения клиента
- **WHEN** создаётся или завершается NATS Jetstream клиент через DI
- **THEN** Система SHALL использовать Dependency Injector для управления жизненным циклом NATS Jetstream клиента. Завершение клиента MUST быть устойчиво к состоянию соединения: если `drain()` завершается ошибкой `nats.errors.Error` или таймаутом (в частности `ConnectionReconnectingError` при остановке во время reconnect), клиент MUST перехватить её, зафиксировать `warning` и закрыть соединение через `close()`, не пробрасывая исключение в `lifespan`. Перехват MUST быть точечным по типам ошибок NATS и MUST NOT подменяться широким `except Exception`. Внутреннее состояние (`_connection`, `_jetstream`) MUST обнуляться независимо от исхода.

### Requirement: NATS Jetstream consumers должны настраиваться автоматически

Система SHALL автоматически настраивать consumers при запуске только для активных обработчиков, ретраить отсутствие чужого stream без его создания и соблюдать ограничения регрессионной live-проверки shared stream согласно сценариям.

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

#### Scenario: Полный контракт регистрации consumers и границ регрессии
- **WHEN** при запуске настраиваются consumers либо проверяется влияние сервиса на shared stream
- **THEN** Система SHALL автоматически настраивать NATS Jetstream consumers при запуске. Durable consumer MUST регистрироваться только сервисом, который фактически обрабатывает сообщения соответствующего subject. Сервис без активного обработчика MUST оставлять `setup_consumers()` no-op и MUST NOT создавать durable, чтобы не порождать неподтверждаемые pending-сообщения. Регрессионная проверка влияния такого сервиса на чужие цепочки SHALL ограничиваться shared stream, к которому он имеет доступ, и MUST NOT требовать сквозного прогона producer-legs, с которыми у сервиса нет точек соприкосновения. Live-проверка shared stream MUST NOT вызывать реальных внешних побочных эффектов (отправка писем, записи в БД чужих сервисов): для этого используется уже обработанный идемпотентный идентификатор события, а опубликованное сообщение удаляется из stream после проверки.
- **AND** Регистрация durable consumer на stream, которым сервис не владеет, MUST быть устойчива к порядку деплоя: `setup_consumers()` SHALL ретраить `nats.js.errors.NotFoundError` (`stream not found`) с backoff, ограниченным `NATS_SETUP_MAX_ATTEMPTS` (default `10`, `ge=1`) и `NATS_SETUP_BACKOFF_SECONDS` (default `2.0`, `ge=0`), и MUST завершать startup ошибкой только после исчерпания попыток. Ретрай MUST NOT приводить к созданию чужого stream: `add_stream` на stream другого владельца остаётся запрещённым.

### Requirement: Резервирование VK messaging-имён без активации контракта

`vk-service` SHALL резервировать VK subject и durable в NatsSettings под существующим wildcard и документировать неактивный канал; на этапе скелета MUST NOT создавать AsyncAPI или расширять asyncapi-validate согласно сценариям.

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

#### Scenario: Полный контракт резервирования VK и отложенной активации
- **WHEN** VK-канал находится на этапе скелета и резервируются его messaging-имена
- **THEN** `vk-service` SHALL резервировать имена будущего VK-канала в `NatsSettings`: `NATS_SUBJECT_NOTIFICATION_COMMANDS_SEND_VK` со значением `commands.notification.vk.send` и `NATS_CONSUMER_NOTIFICATION_COMMANDS_SEND_VK` со значением `vk-service-commands-send-vk`. Зарезервированный subject MUST попадать под уже существующий wildcard `commands.notification.>` stream `NOTIFICATION_COMMANDS`, чтобы активация канала не требовала изменения существующей топологии. На этапе скелета файл `services/vk-service/docs/asyncapi.yaml` MUST NOT создаваться, а цель `asyncapi-validate` корневого `Makefile` MUST NOT расширяться: канонический AsyncAPI-документ MUST появляться одновременно с реальным consumer и обработчиком отдельным change. `services/vk-service/README.md` MUST содержать раздел «NATS JetStream (зарезервировано)» с планируемыми stream/subject/durable и явной пометкой о неактивированном контракте.

### Requirement: NATS-клиент регистрирует connection-колбэки с политикой эскалации

Каждый сервис SHALL регистрировать собственные connection-колбэки и применять пороговую эскалацию: warning без exc_info до превышения порога, ровно один error с exc_info на инцидент после него и сброс состояния при reconnect согласно сценариям.

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

#### Scenario: Полный контракт connection-колбэков и порога эскалации
- **WHEN** сервис подключается к NATS и обрабатывает последовательные сбои либо восстановление соединения
- **THEN** Каждый сервис при `connect()` SHALL регистрировать собственные `error_cb`, `disconnected_cb`, `reconnected_cb` и `closed_cb`, чтобы транзиентные сбои брокера не превращались в error-события мониторинга. Последовательные неудачи одного инцидента MUST логироваться на уровне `warning` без `exc_info`, пока их число не превысит порог `NATS_ERROR_REPORT_AFTER_ATTEMPTS` (default `3`, `ge=1`). После превышения порога сервис MUST записать ровно один `error` с `exc_info` на инцидент и MUST NOT повторять его на каждой следующей попытке. Успешный `reconnected_cb` MUST сбрасывать счётчик и признак уже отправленной эскалации.

### Requirement: Уникальность Nats-Msg-Id в пределах stream

Каждый producer shared stream SHALL обеспечивать уникальность Nats-Msg-Id внутри duplicate_window, различать сообщения разных subjects одного бизнес-события, выражать корреляцию через payload и документировать правило согласно сценариям.

#### Scenario: Одно событие, два канала
- **WHEN** одно бизнес-событие порождает команды в два разных subject одного stream внутри `duplicate_window`
- **THEN** их `Nats-Msg-Id` различаются
- **AND** stream принимает оба сообщения как новые

#### Scenario: Правило задокументировано
- **WHEN** reviewer читает `agents/howto/nats-jetstream-protocols.md`
- **THEN** протокол явно указывает, что дедупликация действует на уровне stream, и запрещает переиспользовать один `Nats-Msg-Id` для разных subjects

#### Scenario: Полный контракт stream-дедупликации и корреляции
- **WHEN** producer формирует сообщения shared stream или документирует правило их идентичности
- **THEN** Дедупликация JetStream действует на уровне stream, а не subject, поэтому каждый producer shared stream SHALL формировать `Nats-Msg-Id`, уникальный среди всех сообщений этого stream внутри `duplicate_window`. Два сообщения, относящиеся к одному бизнес-событию, но адресованные разным subjects одного stream, MUST получать различные `Nats-Msg-Id`; корреляция таких сообщений MUST выражаться полями payload, а не общим заголовком. Правило SHALL быть зафиксировано в `agents/howto/nats-jetstream-protocols.md` и в README-секциях «NATS JetStream» сервисов-производителей.

### Requirement: Признак duplicate в PubAck обрабатывается явно

Каждый producer SHALL проверять duplicate в PubAck до признания публикации успешной, возвращать различимый результат для нового сообщения и дубликата и логировать дубликат не ниже warning с correlation context согласно сценариям.

#### Scenario: Брокер вернул duplicate
- **WHEN** `PubAck` содержит признак duplicate
- **THEN** publisher возвращает вызывающему коду признак «принято ранее», а не признак нового сообщения
- **AND** в логах присутствует запись уровня не ниже `warning` с correlation context и кодом канала

#### Scenario: Обычная публикация
- **WHEN** `PubAck` не содержит признак duplicate
- **THEN** публикация считается новым принятым сообщением и возвращает идентификатор сообщения

#### Scenario: Ответ брокера не игнорируется
- **WHEN** reviewer проверяет код publisher
- **THEN** `PubAck` не отбрасывается, а его признак duplicate влияет на возвращаемый результат

#### Scenario: Полный контракт проверки PubAck и диагностики дубликата
- **WHEN** producer получает ответ JetStream на публикацию сообщения
- **THEN** Каждый producer SHALL получать `PubAck` от JetStream и SHALL проверять признак duplicate вместо того, чтобы игнорировать ответ брокера. Publisher MUST NOT логировать публикацию как успешную без проверки этого признака и MUST сообщать вызывающему коду, было ли сообщение принято как новое или отброшено как дубликат. Отброшенный дубликат MUST логироваться записью уровня не ниже `warning` с correlation context, поскольку при уникальном в пределах stream `Nats-Msg-Id` он означает повторную обработку того же бизнес-события, а не потерю сообщения.

### Requirement: Штатный idle timeout pull-consumers Notification и VK

Pull-consumers Notification и VK MUST трактовать fetch timeout без сообщений как idle с новым fetch без telemetry и прикладных эффектов, учитывать поддерживаемые timeout-типы только на fetch boundary и не подавлять остальные ошибки согласно сценариям.

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

#### Scenario: Полный контракт idle timeout Notification и VK
- **WHEN** pull-consumer Notification или VK выполняет fetch и классифицирует его результат
- **THEN** Pull-consumers `notification-service` для `events.site.callback.requested` и `vk-service` для `commands.notification.vk.send` MUST классифицировать истечение timeout операции JetStream `fetch()` без сообщений как штатное idle-состояние. Перехват MUST учитывать фактически выбрасываемый поддерживаемой версией `nats-py` встроенный `asyncio.TimeoutError` и совместимый NATS timeout, MUST быть ограничен fetch boundary и MUST NOT подавлять cancellation, connection/protocol или handler errors. Idle MUST продолжать следующий fetch без error/warning log, Sentry/GlitchTip event, ack/nak и прикладного побочного эффекта.
