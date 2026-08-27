## MODIFIED Requirements

### Requirement: CallbackEventHandler
Система MUST предоставлять handler форматирования callback_request notification, который выбирает получателей только внутри `equestrian_id` события: запрашивает активных пользователей Backend Core с одновременными фильтрами `equestrian_ids=[equestrian_id]` и `role=[ADMIN,SUPERUSER]`, пересекает их с `enabled_user_ids`, затем оставляет только подтверждённые email. Subject и HTML body MUST содержать только имя, телефон и комментарий заявителя и MUST NOT содержать callback, tenant/equestrian, event или другие UUID.

#### Scenario: Tenant-scoped email notification
- **WHEN** валидное callback_request событие tenant A форматируется для `channel_code="email"`
- **THEN** handler вызывает Backend Core с tenant A и допустимыми ролями, а email command содержит только подтверждённые адреса eligible/enabled пользователей tenant A

#### Scenario: Пользователь другой конюшни исключён
- **WHEN** пользователь tenant B имеет допустимую роль, включённую callback-настройку и подтверждённый email, но событие относится к tenant A
- **THEN** его идентификатор не передаётся в email lookup и его адрес отсутствует в email command

#### Scenario: Tenant не передан или невалиден
- **WHEN** callback payload не содержит валидный `equestrian_id`
- **THEN** событие отклоняется до recipient lookup и email command не публикуется

#### Scenario: Format email notification
- **WHEN** callback_request payload с `equestrian_id`, name, phone и comment форматируется для `channel_code="email"`
- **THEN** возвращается `NotificationCommandSendEmailData`, а subject/body не содержат UUID labels или UUID values

#### Scenario: Unsupported channel
- **WHEN** callback_request payload форматируется для `channel_code="sms"`
- **THEN** возвращается `None`

#### Scenario: Ошибка recipient lookup
- **WHEN** tenant-scoped запрос пользователей или запрос email завершается ошибкой
- **THEN** handler работает fail-closed, не возвращает email command и не расширяет выборку до всех пользователей

### Requirement: CallbackRequestHandler Integration
CallbackRequestHandler MUST использовать NotificationOrchestratorService, MUST принимать внутренние `callback_request_id` и `equestrian_id` для service correlation и tenant routing, передавать их без подмены в orchestrator и MUST NOT отображать эти UUID в subject/body.

#### Scenario: Process tenant-scoped callback via orchestrator
- **WHEN** обрабатывается валидный `CallbackRequestedData` с `callback_request_id`, `equestrian_id`, phone и optional name/comment
- **THEN** вызывается `orchestrator.process_event(event_code="callback")` с исходным tenant UUID, а callback/tenant UUID не отображаются в subject/body

#### Scenario: Callback event без tenant UUID
- **WHEN** consumer получает payload без `equestrian_id` или с невалидным UUID
- **THEN** schema validation отклоняет сообщение, оно не маршрутизируется получателям и применяется существующая retry/DLQ политика consumer

