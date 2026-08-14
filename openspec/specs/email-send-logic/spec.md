# email-send-logic Specification

## Purpose
Бизнес-логика обработки NATS-событий и отправки email. Core слой, не зависящий от инфраструктуры.

## Requirements
### Requirement: Валидация схемы email-события
Схема `NotificationCommandSendEmail` MUST содержать поля: `event_uuid` (UUID4), `to` (список email), `subject` (строка), `body` (строка), `cc` (опционально, список email), `bcc` (опционально, список email), `reply_to` (опционально, email), `from_name` (опционально, строка), `from_email` (опционально, email).

#### Scenario: Валидное событие с обязательными полями
- **WHEN** NATS-событие содержит `event_uuid`, `to`, `subject`, `body`
- **THEN** схема MUST успешно десериализоваться

#### Scenario: Отсутствие обязательного поля
- **WHEN** NATS-событие не содержит `to`
- **THEN** десериализация MUST завершиться ошибкой валидации

#### Scenario: Невалидный формат email
- **WHEN** поле `to` содержит строку без `@`
- **THEN** валидация MUST отклонить значение

### Requirement: Идемпотентная обработка событий
`EmailProcessingService` MUST проверять уникальность `event_uuid` перед обработкой. При дубликате MUST вернуть результат без повторной отправки.

#### Scenario: Первичная обработка события
- **WHEN** сервис получает событие с новым `event_uuid`
- **THEN** MUST создать запись в `email_logs` со статусом `pending` и передать в Celery

#### Scenario: Повторное событие (идемпотентность)
- **WHEN** сервис получает событие с уже существующим `event_uuid`
- **THEN** MUST пропустить обработку и вернуть существующую запись

### Requirement: Формирование email для отправки
Сервис MUST извлечь все поля из валидированной схемы и передать в email sender без потерь.

#### Scenario: Полные данные email
- **WHEN** событие содержит все поля (to, subject, body, cc, bcc, reply_to, from_name, from_email)
- **THEN** email sender MUST получить все поля в формате, пригодном для SMTP

#### Scenario: Минимальные данные email
- **WHEN** событие содержит только обязательные поля (to, subject, body)
- **THEN** email sender MUST получить обязательные поля, опциональные MUST быть `None`

### Requirement: Логирование статусов отправки
Сервис MUST обновлять статус записи в `email_logs` при изменении состояния отправки.

#### Scenario: Успешная отправка
- **WHEN** email sender подтверждает успешную отправку
- **THEN** MUST обновить статус на `sent` и записать `sent_at`

#### Scenario: Ошибка отправки
- **WHEN** email sender возвращает ошибку
- **THEN** MUST обновить статус на `failed` и записать `error_message`

### Requirement: Обработка ошибок валидации
При ошибке валидации входных данных сервис MUST логировать ошибку и отклонять событие без создания записи в `email_logs`.

#### Scenario: Невалидный JSON
- **WHEN** NATS-событие содержит невалидный JSON
- **THEN** MUST логировать ошибку парсинга и отклонить событие

#### Scenario: Отсутствие event_uuid
- **WHEN** событие не содержит `event_uuid`
- **THEN** MUST отклонить событие, так как идемпотентность невозможна
