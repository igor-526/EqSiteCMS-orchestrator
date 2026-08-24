## MODIFIED Requirements

### Requirement: CallbackEventHandler
The system MUST provide a handler for formatting callback_request notifications whose subject and HTML body contain only the applicant name, phone and comment and MUST NOT contain callback, tenant/equestrian, event or other UUID values.

#### Scenario: Format email notification
- **WHEN** callback_request payload with name, phone and comment is formatted for `channel_code="email"`
- **THEN** `NotificationCommandSendEmailData` with subject and HTML body is returned and neither field contains UUID labels or UUID values

#### Scenario: Unsupported channel
- **WHEN** callback_request payload is formatted for `channel_code="sms"`
- **THEN** `None` is returned

### Requirement: CallbackRequestHandler Integration
The CallbackRequestHandler MUST use NotificationOrchestratorService, MUST accept the internal callback_request_id for service correlation, and MUST NOT accept an equestrian UUID field.

#### Scenario: Process callback via orchestrator
- **WHEN** a CallbackRequestedData payload with callback_request_id, phone and optional name/comment is handled
- **THEN** the orchestrator.process_event is called with event_code="callback" without requiring or injecting an equestrian UUID, and callback_request_id is not rendered into subject/body
