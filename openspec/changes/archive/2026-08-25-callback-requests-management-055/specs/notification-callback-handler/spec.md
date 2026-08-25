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

## ADDED Requirements

### Requirement: Семантика доставки callback-уведомления
Notification-service MUST выставлять `notifications_delivered=true` через защищённый backend service endpoint только после успешной публикации хотя бы одной предусмотренной downstream email command. Отсутствие eligible recipients, ошибка routing/publish либо отсутствие подтверждения публикации MUST оставлять значение `false`. SMTP acknowledgement/receipt MUST NOT требоваться и MUST NOT влиять на этот флаг.

#### Scenario: Downstream command успешно опубликована
- **WHEN** notification-service успешно публикует предусмотренную email command для callback_request_id
- **THEN** он выполняет идемпотентное service update `notifications_delivered=true`, не ожидая SMTP acknowledgement

#### Scenario: Downstream command не опубликована
- **WHEN** eligible recipients отсутствуют либо routing/publish завершается ошибкой
- **THEN** service update в `true` не выполняется и значение остаётся `false`

#### Scenario: SMTP outcome не изменяет callback-флаг
- **WHEN** email-service позднее доставляет или не доставляет письмо на SMTP-уровне
- **THEN** callback contract не ожидает receipt и не выполняет дополнительное изменение `notifications_delivered`
