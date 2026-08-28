## ADDED Requirements

### Requirement: Уникальность Nats-Msg-Id в пределах stream
Дедупликация JetStream действует на уровне stream, а не subject, поэтому каждый producer shared stream SHALL формировать `Nats-Msg-Id`, уникальный среди всех сообщений этого stream внутри `duplicate_window`. Два сообщения, относящиеся к одному бизнес-событию, но адресованные разным subjects одного stream, MUST получать различные `Nats-Msg-Id`; корреляция таких сообщений MUST выражаться полями payload, а не общим заголовком. Правило SHALL быть зафиксировано в `agents/howto/nats-jetstream-protocols.md` и в README-секциях «NATS JetStream» сервисов-производителей.

#### Scenario: Одно событие, два канала
- **WHEN** одно бизнес-событие порождает команды в два разных subject одного stream внутри `duplicate_window`
- **THEN** их `Nats-Msg-Id` различаются
- **AND** stream принимает оба сообщения как новые

#### Scenario: Правило задокументировано
- **WHEN** reviewer читает `agents/howto/nats-jetstream-protocols.md`
- **THEN** протокол явно указывает, что дедупликация действует на уровне stream, и запрещает переиспользовать один `Nats-Msg-Id` для разных subjects

### Requirement: Признак duplicate в PubAck обрабатывается явно
Каждый producer SHALL получать `PubAck` от JetStream и SHALL проверять признак duplicate вместо того, чтобы игнорировать ответ брокера. Publisher MUST NOT логировать публикацию как успешную без проверки этого признака и MUST сообщать вызывающему коду, было ли сообщение принято как новое или отброшено как дубликат. Отброшенный дубликат MUST логироваться записью уровня не ниже `warning` с correlation context, поскольку при уникальном в пределах stream `Nats-Msg-Id` он означает повторную обработку того же бизнес-события, а не потерю сообщения.

#### Scenario: Брокер вернул duplicate
- **WHEN** `PubAck` содержит признак duplicate
- **THEN** publisher возвращает вызывающему коду признак «принято ранее», а не признак нового сообщения
- **AND** в логах присутствует запись уровня не ниже `warning` с correlation context и кодом канала

#### Scenario: Обычная публикация
- **WHEN** `PubAck` не содержит признак duplicate
- **THEN** публикация считается новым принятым сообщением и возвращает идентификатор сообщения

#### Scenario: Ответ брокера не игнорируется
- **WHEN** reviewer проверяет код publisher
- **THEN** `PubAck` не отбрасывается, а его признак duplicate влияет на возвращаемый результат

## MODIFIED Requirements

### Requirement: Real JetStream acceptance matrix
Messaging gate MUST выполняться на реальном NATS JetStream и покрывать stream provisioning, durable/filter, успешный ack, временный nak/redelivery, poison message до max-deliver, duplicate-event idempotency, публикацию двух команд разных каналов по одному бизнес-событию внутри `duplicate_window` и сквозную совместимость backend producer → notification consumer/producer → email/VK consumer. Skip, отсутствие tests или mocked broker MUST NOT считаться PASS.

#### Scenario: Успешная доставка
- **WHEN** валидное callback event публикуется backend
- **THEN** notification обрабатывает его один раз, публикует совместимую email command, email consumer ack-ает command после успешной передачи в Celery

#### Scenario: Две команды одного callback
- **WHEN** один callback имеет включёнными оба канала и notification публикует email- и VK-команды подряд
- **THEN** broker evidence подтверждает два принятых сообщения без duplicate
- **AND** durable email и durable VK каждый получает ровно одну команду

#### Scenario: Временная ошибка и poison message
- **WHEN** handler временно падает либо payload постоянно невалиден
- **THEN** broker evidence подтверждает nak/redelivery и достижение max-deliver без ложного ack

#### Scenario: Дубликат event
- **WHEN** одно logical event приходит повторно с тем же message identity
- **THEN** обработка не создаёт повторную пользовательскую отправку
