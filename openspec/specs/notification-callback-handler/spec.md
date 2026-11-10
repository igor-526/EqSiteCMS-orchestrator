# notification-callback-handler Specification

## Purpose
Обработка событий обратного звонка формирует уведомления email и VK для разрешённых получателей конюшни, исключает внутренние идентификаторы из текста и отмечает доставку после публикации команды, не ожидая результата провайдера.
## Requirements
### Requirement: CallbackEventHandler
Система MUST форматировать callback_request по каналу с tenant-scoped выборкой активных ADMIN/SUPERUSER и enabled_user_ids; для email MUST использовать подтверждённые адреса, для VK — UUID без lookup bindings, а тексты MUST исключать внутренние UUID согласно сценариям.

#### Scenario: Tenant-scoped email notification
- **WHEN** валидное callback_request событие tenant A форматируется для `channel_code="email"`
- **THEN** handler вызывает Backend Core с tenant A и допустимыми ролями, а email command содержит только подтверждённые адреса eligible/enabled пользователей tenant A

#### Scenario: Tenant-scoped VK notification
- **WHEN** валидное callback_request событие tenant A форматируется для `channel_code="vk"`
- **THEN** handler вызывает Backend Core с tenant A и допустимыми ролями, а VK command содержит только IDs eligible пользователей tenant A с включённым `callback/vk`

#### Scenario: Пользователь другой конюшни исключён
- **WHEN** пользователь tenant B имеет допустимую роль и включённые callback settings, но событие относится к tenant A
- **THEN** его идентификатор и email отсутствуют во всех downstream commands события tenant A

#### Scenario: Пользователь без административной роли исключён
- **WHEN** пользователь tenant A включил email/VK, но не имеет роли ADMIN или SUPERUSER
- **THEN** он отсутствует в обеих downstream commands

#### Scenario: Настройки каналов независимы
- **WHEN** eligible пользователь включил только один из `callback/email` и `callback/vk`
- **THEN** он присутствует только в command включённого канала

#### Scenario: Tenant не передан или невалиден
- **WHEN** callback payload не содержит валидный `equestrian_id`
- **THEN** событие отклоняется до recipient lookup и ни одна downstream command не публикуется

#### Scenario: Format email notification
- **WHEN** callback_request payload форматируется для `channel_code="email"`
- **THEN** возвращается `NotificationCommandSendEmailData`, а subject/body не содержат UUID labels или UUID values

#### Scenario: Format VK notification
- **WHEN** callback_request payload форматируется для `channel_code="vk"`
- **THEN** возвращается типизированная VK command с plain-text полями заявки, IDs получателей и без внутренних UUID в тексте

#### Scenario: Unsupported channel
- **WHEN** callback_request payload форматируется для неподдерживаемого канала, включая `sms`
- **THEN** возвращается `None` и publisher не вызывается

#### Scenario: Ошибка recipient lookup
- **WHEN** tenant-scoped запрос пользователей или channel destination lookup завершается ошибкой
- **THEN** handler работает fail-closed, не возвращает command этого канала и не расширяет выборку до всех пользователей

#### Scenario: Полный контракт выбора получателей и приватности текста
- **WHEN** handler форматирует callback_request notification для выбранного канала
- **THEN** Система MUST предоставлять handler форматирования callback_request notification, который для каждого канала выбирает получателей только внутри `equestrian_id` события: запрашивает активных пользователей Backend Core с одновременными фильтрами `equestrian_ids=[equestrian_id]` и `role=[ADMIN,SUPERUSER]` и пересекает их с `enabled_user_ids` соответствующего канала. Для email handler MUST оставить только подтверждённые email; для VK MUST передать только UUID eligible/enabled пользователей, не запрашивая VK bindings. Subject/body/text MUST содержать только имя, телефон и комментарий заявителя и MUST NOT содержать callback, tenant/equestrian, event или user UUID.

### Requirement: CallbackRequestHandler Integration
CallbackRequestHandler MUST использовать NotificationOrchestratorService, MUST принимать внутренние `callback_request_id` и `equestrian_id` для service correlation и tenant routing, передавать их без подмены в orchestrator и MUST NOT отображать эти UUID в subject/body.

#### Scenario: Process tenant-scoped callback via orchestrator
- **WHEN** обрабатывается валидный `CallbackRequestedData` с `callback_request_id`, `equestrian_id`, phone и optional name/comment
- **THEN** вызывается `orchestrator.process_event(event_code="callback")` с исходным tenant UUID, а callback/tenant UUID не отображаются в subject/body

#### Scenario: Callback event без tenant UUID
- **WHEN** consumer получает payload без `equestrian_id` или с невалидным UUID
- **THEN** schema validation отклоняет сообщение, оно не маршрутизируется получателям и применяется существующая retry/DLQ политика consumer


### Requirement: DI Container Update
The application container MUST register orchestrator dependencies.

#### Scenario: Container provides orchestrator
- GIVEN the ApplicationContainer
- WHEN resolving CallbackRequestHandler
- THEN it receives NotificationOrchestratorService dependency

#### Scenario: Container provides repositories
- GIVEN the ApplicationContainer
- WHEN resolving NotificationOrchestratorService
- THEN it receives EventRepository, ChannelRepository, UserNotificationSettingRepository


### Requirement: Семантика доставки callback-уведомления
Notification-service MUST выставлять `notifications_delivered=true` через защищённый backend service endpoint только после успешной публикации хотя бы одной предусмотренной downstream email или VK command. Отсутствие eligible recipients во всех каналах, ошибка routing/publish либо отсутствие PubAck MUST оставлять значение `false`. SMTP acknowledgement/receipt и фактический outcome VK API MUST NOT требоваться и MUST NOT изменять этот общий флаг.

#### Scenario: Email command успешно опубликована
- **WHEN** notification-service успешно публикует предусмотренную email command для callback_request_id
- **THEN** он выполняет идемпотентное service update `notifications_delivered=true`, не ожидая SMTP acknowledgement

#### Scenario: VK command успешно опубликована
- **WHEN** notification-service успешно публикует предусмотренную VK command для callback_request_id
- **THEN** он выполняет идемпотентное service update `notifications_delivered=true`, не ожидая результата `messages.send`

#### Scenario: Обе команды опубликованы
- **WHEN** email и VK commands получили PubAck
- **THEN** service update выполняется идемпотентно один раз

#### Scenario: Downstream command не опубликована
- **WHEN** eligible recipients отсутствуют во всех каналах либо routing/publish всех предусмотренных commands завершается ошибкой
- **THEN** service update в `true` не выполняется и значение остаётся `false`

#### Scenario: Provider outcome не изменяет callback-флаг
- **WHEN** Email Service или VK Service позднее доставляет либо не доставляет сообщение
- **THEN** callback contract не ожидает receipt и не выполняет дополнительное изменение `notifications_delivered`
