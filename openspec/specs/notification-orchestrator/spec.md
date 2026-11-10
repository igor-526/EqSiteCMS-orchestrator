# notification-orchestrator Specification

## Purpose
Оркестрация событий уведомлений с отбором допустимых получателей, независимой публикацией команд email и VK, идемпотентным подтверждением брокера и изолированной локальной проверкой сбоев каналов.

## Requirements
### Requirement: NotificationOrchestratorService
Система MUST обрабатывать notification events, отбирать получателей каждого канала по действующей роли, явному включению event/channel и валидному назначению, независимо публиковать callback-команды email/VK с fail-closed обработкой и идемпотентным учётом PubAck в детерминированном порядке.

#### Scenario: Process callback_request event
- **WHEN** обрабатывается callback_request event с phone, comment и equestrian_id
- **THEN** текущие ADMIN/SUPERUSER пересекаются независимо с enabled `callback/email` и `callback/vk`, после чего публикуются только непустые email/VK commands соответствующих каналов

#### Scenario: Оба канала включены одним пользователем
- **WHEN** один и тот же eligible пользователь включил и `callback/email`, и `callback/vk`
- **THEN** публикуются обе команды и обе принимаются брокером как новые сообщения

#### Scenario: Брокер вернул duplicate при повторной обработке события
- **WHEN** callback event переобрабатывается после redelivery и `PubAck` канала содержит признак duplicate
- **THEN** канал считается идемпотентно принятым, обработка события завершается без ошибки и без повторной публикации
- **AND** в логах присутствует запись уровня не ниже `warning` с correlation context и кодом канала

#### Scenario: Детерминированный порядок каналов
- **WHEN** orchestrator получает список активных каналов
- **THEN** порядок обхода детерминирован и воспроизводим между запусками

#### Scenario: Validate event payload
- **WHEN** событие не содержит обязательное поле metadata schema
- **THEN** поднимается InvalidPayloadError до любой downstream публикации

#### Scenario: No enabled recipient
- **WHEN** ни один currently eligible пользователь не включил email/VK либо не имеет требуемого destination
- **THEN** downstream command не публикуется и delivery flag не подтверждается

#### Scenario: Role revoked after enable
- **WHEN** пользователь включил notification channel, но больше не имеет ADMIN или SUPERUSER eligibility
- **THEN** он исключается из recipients всех каналов

#### Scenario: Dependency failure is fail closed
- **WHEN** role, setting или destination lookup завершается ошибкой
- **THEN** ошибка логируется с correlation context и broader fallback recipient list не используется

#### Scenario: Channel-specific dispatch
- **WHEN** handler возвращает email либо VK command
- **THEN** orchestrator вызывает publisher того же канала и MUST NOT передавать command publisher другого канала

#### Scenario: Полный контракт отбора и публикации по каналам
- **WHEN** orchestrator обрабатывает notification event
- **THEN** Система MUST предоставлять orchestrator service для обработки notification events и MUST отправлять уведомление каждого канала только пользователям, которые сохраняют допустимую роль, явно включили соответствующую пару event/channel и имеют валидное назначение во владеющем им сервисе. Для callback events orchestrator MUST независимо публиковать email- и VK-команды через протокол соответствующего канала и MUST обрабатывать сбой канала по fail-closed модели без расширения списка получателей. Orchestrator MUST различать `PubAck`, в котором сообщение принято как новое, и `PubAck` с признаком duplicate: дубликат MUST трактоваться как идемпотентно принятая ранее команда того же канала, MUST логироваться на уровне не ниже `warning` с correlation context и кодом канала и MUST NOT приводить ни к ошибке обработки события, ни к повторной публикации. Обход активных каналов MUST быть детерминированным и не зависеть от физического порядка строк в хранилище.

### Requirement: Canonical messaging compatibility
Система MUST сохранять совместимость callback/email AsyncAPI contracts и синхронность producer/consumer контрактов каждого канала, включая уникальный в NOTIFICATION_COMMANDS заголовок Nats-Msg-Id.

#### Scenario: Existing AsyncAPI regression
- **WHEN** contract tests сравнивают callback event и email command до/после change
- **THEN** их subjects, stream identity и payload schemas остаются совместимыми
- **AND** изменение правила `Nats-Msg-Id` отражено в AsyncAPI обоих сторон канала

#### Scenario: VK AsyncAPI equality
- **WHEN** contract tests сравнивают Notification Service publish и VK Service subscribe для `commands.notification.vk.send`
- **THEN** stream, subject, headers, required payload fields, formats и `additionalProperties` совпадают

#### Scenario: Полный контракт совместимости сообщений
- **WHEN** проверяется совместимость messaging contracts при изменении recipient selection
- **THEN** Изменение recipient selection MUST сохранить существующие AsyncAPI contracts `events.site.callback.requested` и `commands.notification.email.send` в части subject, stream identity, payload schema и email durable. Заголовок `Nats-Msg-Id` команд `commands.notification.email.send` и `commands.notification.vk.send` MUST изменяться синхронно у producer и consumer каждого канала и MUST быть уникальным в пределах stream `NOTIFICATION_COMMANDS`. Producer/consumer contract `commands.notification.vk.send` MUST оставаться синхронным.

### Requirement: Изолированная проверка publisher failures
Система MUST предоставлять изолированный one-shot local CLI harness проверки orchestrator с production компонентами и scripted publishers, выключенный по умолчанию и ограниченный подтверждённым local режимом и synthetic fixture без production-интеграции, реальных команд и раскрытия данных.

#### Scenario: Оба publisher завершаются ошибкой
- **WHEN** для synthetic callback оба scripted publishers настроены на deterministic failure
- **THEN** production orchestrator не вызывает delivery confirmation и callback flag остаётся `false`

#### Scenario: Только один publisher подтверждён
- **WHEN** один scripted publisher возвращает ack, а второй завершается ошибкой или не имеет eligible recipients
- **THEN** delivery confirmation вызывается ровно один раз согласно command-acceptance semantics

#### Scenario: Production runtime запускается
- **WHEN** стартует штатный Notification Service container/lifespan
- **THEN** smoke harness не импортируется и production NATS publishers остаются единственными runtime adapters

#### Scenario: Границы локального harness
- **WHEN** запускается smoke harness orchestrator
- **THEN** Система MUST предоставлять отдельный one-shot local CLI composition root для smoke-проверки orchestrator с production handler/domain/repositories и scripted email/VK publisher adapters. Harness MUST быть disabled by default, MUST отказать до внешних подключений вне явно подтверждённого local режима, MUST работать только с точным synthetic callback fixture и MUST NOT входить в production DI/lifespan, создавать HTTP endpoints, публиковать реальные downstream commands либо выводить payload/PII/secrets.

### Requirement: EventHandlerRegistry
The system MUST provide a registry for mapping event codes to handlers.

#### Scenario: Get handler for known event
- GIVEN a handler registered for "callback_request"
- WHEN calling get_handler with "callback_request"
- THEN the handler instance is returned

#### Scenario: Get handler for unknown event
- GIVEN no handler for "unknown_event"
- WHEN calling get_handler with "unknown_event"
- THEN HandlerNotFoundError is raised

### Requirement: CallbackEventHandler
The system MUST provide a handler for formatting callback_request notifications.

#### Scenario: Format email notification
- GIVEN callback_request payload and channel_code="email"
- WHEN calling format_notification
- THEN EmailNotificationData with subject and HTML body is returned

#### Scenario: Unsupported channel
- GIVEN callback_request payload and channel_code="sms"
- WHEN calling format_notification
- THEN UnsupportedChannelError is raised
