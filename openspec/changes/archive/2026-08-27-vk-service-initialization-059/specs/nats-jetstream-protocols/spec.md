## MODIFIED Requirements

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

## ADDED Requirements

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
