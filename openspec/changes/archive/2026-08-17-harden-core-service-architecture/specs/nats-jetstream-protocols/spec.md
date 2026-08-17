## ADDED Requirements

### Requirement: Канонический AsyncAPI core messaging
Backend, notification-service и email-service MUST содержать `docs/asyncapi.yaml`, описывающий фактические streams, subjects, headers, payload schemas и producer/consumer ownership без расхождения с runtime settings/handlers.

#### Scenario: Контракт валидируется
- **WHEN** выполняется `make asyncapi-validate`
- **THEN** все три AsyncAPI проходят validation, а subjects/payload/header fields совпадают с кодом

### Requirement: Real JetStream acceptance matrix
Messaging gate MUST выполняться на реальном NATS JetStream и покрывать stream provisioning, durable/filter, успешный ack, временный nak/redelivery, poison message до max-deliver, duplicate-event idempotency и сквозную совместимость backend producer → notification consumer/producer → email consumer. Skip, отсутствие tests или mocked broker MUST NOT считаться PASS.

#### Scenario: Успешная доставка
- **WHEN** валидное callback event публикуется backend
- **THEN** notification обрабатывает его один раз, публикует совместимую email command, email consumer ack-ает command после успешной передачи в Celery

#### Scenario: Временная ошибка и poison message
- **WHEN** handler временно падает либо payload постоянно невалиден
- **THEN** broker evidence подтверждает nak/redelivery и достижение max-deliver без ложного ack

#### Scenario: Дубликат event
- **WHEN** одно logical event приходит повторно с тем же message identity
- **THEN** обработка не создаёт повторную пользовательскую отправку

### Requirement: Разделение contract ownership и adapters
Один последовательный владелец SHALL сначала изменить AsyncAPI/howto, после чего adapters каждого сервиса SHALL обновляться по непересекающимся path ownership. Объединение трёх NATS client implementations MUST NOT быть обязательным для acceptance.

#### Scenario: Требуется topology change
- **WHEN** implementation обнаруживает необходимость менять subject, stream, durable или payload
- **THEN** работа останавливается до обновления delta spec и повторного approval
