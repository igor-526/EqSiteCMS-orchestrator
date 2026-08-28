## MODIFIED Requirements

### Requirement: NotificationOrchestratorService
The system MUST provide an orchestrator service for processing notification events and MUST send each channel notification only to users who are currently role-eligible, have explicitly enabled the event/channel tuple, and have a valid destination owned by the destination service. For callback events the orchestrator MUST independently publish email and VK commands through channel-specific protocols and MUST treat a channel failure as fail-closed without expanding recipients.

#### Scenario: Process callback_request event
- **WHEN** обрабатывается callback_request event с phone, comment и equestrian_id
- **THEN** текущие ADMIN/SUPERUSER пересекаются независимо с enabled `callback/email` и `callback/vk`, после чего публикуются только непустые email/VK commands соответствующих каналов

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
Изменение recipient selection MUST сохранить существующие AsyncAPI contracts `events.site.callback.requested` и `commands.notification.email.send` и MUST добавить синхронный producer/consumer contract `commands.notification.vk.send` без изменения stream identity и email durable.

#### Scenario: Existing AsyncAPI regression
- **WHEN** contract tests сравнивают callback event и email command до/после change
- **THEN** их subjects, headers и payload schemas остаются совместимыми

#### Scenario: VK AsyncAPI equality
- **WHEN** contract tests сравнивают Notification Service publish и VK Service subscribe для `commands.notification.vk.send`
- **THEN** stream, subject, headers, required payload fields, formats и `additionalProperties` совпадают

### Requirement: Изолированная проверка publisher failures
Система MUST предоставлять отдельный one-shot local CLI composition root для smoke-проверки orchestrator с production handler/domain/repositories и scripted email/VK publisher adapters. Harness MUST быть disabled by default, MUST отказать до внешних подключений вне явно подтверждённого local режима, MUST работать только с точным synthetic callback fixture и MUST NOT входить в production DI/lifespan, создавать HTTP endpoints, публиковать реальные downstream commands либо выводить payload/PII/secrets.

#### Scenario: Оба publisher завершаются ошибкой
- **WHEN** для synthetic callback оба scripted publishers настроены на deterministic failure
- **THEN** production orchestrator не вызывает delivery confirmation и callback flag остаётся `false`

#### Scenario: Только один publisher подтверждён
- **WHEN** один scripted publisher возвращает ack, а второй завершается ошибкой или не имеет eligible recipients
- **THEN** delivery confirmation вызывается ровно один раз согласно command-acceptance semantics

#### Scenario: Production runtime запускается
- **WHEN** стартует штатный Notification Service container/lifespan
- **THEN** smoke harness не импортируется и production NATS publishers остаются единственными runtime adapters
