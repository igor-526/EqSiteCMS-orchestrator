## MODIFIED Requirements

### Requirement: NotificationOrchestratorService
Система MUST предоставлять orchestrator service для обработки notification events и MUST отправлять уведомление каждого канала только пользователям, которые сохраняют допустимую роль, явно включили соответствующую пару event/channel и имеют валидное назначение во владеющем им сервисе. Для callback events orchestrator MUST независимо публиковать email- и VK-команды через протокол соответствующего канала и MUST обрабатывать сбой канала по fail-closed модели без расширения списка получателей. Orchestrator MUST различать `PubAck`, в котором сообщение принято как новое, и `PubAck` с признаком duplicate: дубликат MUST трактоваться как идемпотентно принятая ранее команда того же канала, MUST логироваться на уровне не ниже `warning` с correlation context и кодом канала и MUST NOT приводить ни к ошибке обработки события, ни к повторной публикации. Обход активных каналов MUST быть детерминированным и не зависеть от физического порядка строк в хранилище.

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

### Requirement: Canonical messaging compatibility
Изменение recipient selection MUST сохранить существующие AsyncAPI contracts `events.site.callback.requested` и `commands.notification.email.send` в части subject, stream identity, payload schema и email durable. Заголовок `Nats-Msg-Id` команд `commands.notification.email.send` и `commands.notification.vk.send` MUST изменяться синхронно у producer и consumer каждого канала и MUST быть уникальным в пределах stream `NOTIFICATION_COMMANDS`. Producer/consumer contract `commands.notification.vk.send` MUST оставаться синхронным.

#### Scenario: Existing AsyncAPI regression
- **WHEN** contract tests сравнивают callback event и email command до/после change
- **THEN** их subjects, stream identity и payload schemas остаются совместимыми
- **AND** изменение правила `Nats-Msg-Id` отражено в AsyncAPI обоих сторон канала

#### Scenario: VK AsyncAPI equality
- **WHEN** contract tests сравнивают Notification Service publish и VK Service subscribe для `commands.notification.vk.send`
- **THEN** stream, subject, headers, required payload fields, formats и `additionalProperties` совпадают
