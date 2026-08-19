## MODIFIED Requirements

### Requirement: NotificationOrchestratorService
The system MUST provide an orchestrator service for processing notification events and MUST send a channel notification only to users who are currently role-eligible, have explicitly enabled the event/channel tuple, and have a confirmed destination.

#### Scenario: Process callback_request event
- GIVEN a callback_request event with phone, comment, equestrian_id
- WHEN calling process_event
- THEN the event is validated, currently eligible ADMIN/SUPERUSER recipients are intersected with enabled `callback/email` settings and confirmed emails, and one email command is sent only to the resulting recipients

#### Scenario: Validate event payload
- GIVEN an event with metadata defining required fields
- WHEN processing event with missing required field
- THEN InvalidPayloadError is raised

#### Scenario: No enabled recipient
- GIVEN no currently eligible user has both enabled `callback/email` and a confirmed email
- WHEN processing callback_request
- THEN no email command is published

#### Scenario: Role revoked after enable
- GIVEN a user has enabled `callback/email` but no longer has ADMIN or SUPERUSER eligibility
- WHEN processing callback_request
- THEN that user is excluded from recipients

#### Scenario: Dependency failure is fail closed
- GIVEN role, setting, or confirmed-email lookup fails
- WHEN processing callback_request
- THEN the failure is logged with correlation context and no broader fallback recipient list is used

## ADDED Requirements

### Requirement: Canonical messaging compatibility
Изменение recipient selection MUST сохранить существующие AsyncAPI subjects, headers и payload schemas backend, notification-service и email-service.

#### Scenario: AsyncAPI regression
- **WHEN** contract tests сравнивают `events.site.callback.requested` и `commands.notification.email.send`
- **THEN** producer/consumer schemas MUST оставаться совместимыми без новых subjects

