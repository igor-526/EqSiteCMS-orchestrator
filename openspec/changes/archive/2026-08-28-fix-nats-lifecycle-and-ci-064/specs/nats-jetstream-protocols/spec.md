## ADDED Requirements

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

## MODIFIED Requirements

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
