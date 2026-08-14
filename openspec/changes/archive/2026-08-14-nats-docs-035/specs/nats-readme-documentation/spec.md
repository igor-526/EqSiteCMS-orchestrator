## ADDED Requirements

### Requirement: Протокол NATS JetStream содержит правило документирования в README.md

Протокол `agents/howto/nats-jetstream-protocols.md` SHALL содержать секцию «Документирование в README.md» с правилом: если сервис использует NATS JetStream, его README.md MUST содержать секцию «NATS JetStream» с таблицей streams/subjects/consumers.

#### Scenario: Правило присутствует в протоколе
- **WHEN** разработчик открывает `agents/howto/nats-jetstream-protocols.md`
- **THEN** он находит секцию «Документирование в README.md» с описанием формата таблицы и требования к заполнению.

### Requirement: README.md сервиса backend содержит секцию NATS JetStream

Файл `services/backend/README.md` MUST существовать и содержать секцию «NATS JetStream» с ролью Publisher, таблицей stream SITE_EVENTS и subject events.site.callback.requested.

#### Scenario: README.md backend создан и содержит NATS секцию
- **WHEN** разработчик открывает `services/backend/README.md`
- **THEN** он находит секцию «NATS JetStream» с ролью «Publisher», stream «SITE_EVENTS», subject «events.site.callback.requested» и описанием «Публикация события запроса обратного звонка».

### Requirement: README.md сервиса notification-service содержит секцию NATS JetStream

Файл `services/notification-service/README.md` MUST содержать секцию «NATS JetStream» с ролью Pub/Sub, таблицей двух streams (SITE_EVENTS, NOTIFICATION_COMMANDS) и соответствующих subjects.

#### Scenario: README.md notification-service содержит NATS секцию
- **WHEN** разработчик открывает `services/notification-service/README.md`
- **THEN** он находит секцию «NATS JetStream» с ролью «Pub/Sub», stream «SITE_EVENTS» (subject «events.site.callback.requested», входящий), stream «NOTIFICATION_COMMANDS» (subject «commands.notification.email.send», исходящий).

### Requirement: README.md сервиса email-service содержит секцию NATS JetStream

Файл `services/email-service/README.md` MUST содержать секцию «NATS JetStream» с ролью Consumer, таблицей stream NOTIFICATION_COMMANDS и subject commands.notification.email.send.

#### Scenario: README.md email-service содержит NATS секцию
- **WHEN** разработчик открывает `services/email-service/README.md`
- **THEN** он находит секцию «NATS JetStream» с ролью «Consumer», stream «NOTIFICATION_COMMANDS», subject «commands.notification.email.send» и описанием «Приём команды на отправку email».
