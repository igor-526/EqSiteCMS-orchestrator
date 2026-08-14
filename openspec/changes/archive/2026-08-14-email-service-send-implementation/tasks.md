## 1. Database Models and Migration

- [ ] 1.1 Создать модель `EmailLog` в `src/models/email_log.py` с SQLAlchemy маппингом на таблицу `email_logs`
- [ ] 1.2 Создать миграцию Alembic `20260710_0002_add_email_logs.py` для таблицы `email_logs` с уникальным constraint на `event_uuid` и индексами
- [ ] 1.3 Применить миграцию и проверить создание таблицы

## 2. Repository Layer

- [ ] 2.1 Создать протокол `EmailLogRepositoryProtocol` в `src/repositories/protocols.py`
- [ ] 2.2 Реализовать `SQLAlchemyEmailLogRepository` в `src/repositories/email_log.py` с методами: create, update_status, find_by_event_uuid, increment_attempts

## 3. Email Sender

- [ ] 3.1 Создать протокол `EmailSenderProtocol` в `src/core/protocols/email_sender.py`
- [ ] 3.2 Реализовать `SMTPEmailSender` в `src/infrastructure/email_sender.py` с использованием `aiosmtplib`
- [ ] 3.3 Добавить `SMTPSettings` в `src/settings.py` (host, port, user, password, use_tls)

## 4. Core Business Logic

- [ ] 4.1 Расширить схему `NotificationCommandSendEmail` в `src/core/schemas/messaging/notification_command_send_email.py` полями: event_uuid, to, subject, body, cc, bcc, reply_to, from_name, from_email
- [ ] 4.2 Создать `EmailProcessingService` в `src/core/services/email_processing.py` с методами: process_incoming_event (идемпотентность + логирование), complete_sending (отправка + обновление статуса)
- [ ] 4.3 Реализовать логику идемпотентности: проверка event_uuid → создание записи → передача в Celery

## 5. NATS Integration

- [ ] 5.1 Обновить NATS consumer handler в `src/workers/nats_handler.py` для вызова `EmailProcessingService.process_incoming_event()`
- [ ] 5.2 Обработать ошибки валидации: логировать в Sentry, отклонять событие

## 6. Celery Task

- [ ] 6.1 Обновить `send_email_task` в `src/workers/tasks/email.py` для вызова `EmailProcessingService.complete_sending()` по `email_log_id`
- [ ] 6.2 Настроить autoretry_for, max_retries=3, retry_backoff=True

## 7. DI Container

- [ ] 7.1 Зарегистрировать `EmailLogRepository` в `src/containers/application.py`
- [ ] 7.2 Зарегистрировать `EmailSender` в `src/containers/application.py`
- [ ] 7.3 Зарегистрировать `EmailProcessingService` в `src/containers/application.py`

## 8. Tests

- [ ] 8.1 Написать unit-тесты для `EmailProcessingService` (идемпотентность, валидация, обработка ошибок)
- [ ] 8.2 Написать integration-тесты для `SQLAlchemyEmailLogRepository`
- [ ] 8.3 Написать unit-тесты для `SMTPEmailSender` (мок SMTP)

## 9. Documentation

- [ ] 9.1 Обновить README.md email-service секцией о новой архитектуре отправки
