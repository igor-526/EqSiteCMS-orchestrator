# email-celery-integration Specification

## Purpose
Расширение Celery task для использования core-сервиса вместо заглушки.

## MODIFIED Requirements

### Requirement: Задача отправки email
Файл `services/email-service/src/workers/tasks/email.py` MUST СОДЕРЖАТЬ задачу `send_email_task` с декоратором `@shared_task`. Задача MUST принимать `email_log_id` (UUID) и вызывать `EmailProcessingService.complete_sending()`. Задача SHALL использовать `autoretry_for` с `max_retries=3` и `retry_backoff=True`.

#### Scenario: Задача вызывает core-сервис
- **WHEN** задача `send_email_task` вызвана с `email_log_id`
- **THEN** MUST вызвать `EmailProcessingService.complete_sending()` с указанным ID

#### Scenario: Успешная отправка через core-сервис
- **WHEN** `EmailProcessingService.complete_sending()` завершается успешно
- **THEN** задача MUST завершиться без ошибок

#### Scenario: Ошибка отправки
- **WHEN** `EmailProcessingService.complete_sending()` выбрасывает исключение
- **THEN** задача MUST перехватить исключение и пробросить дальше для retry

#### Scenario: Задача ретраится при ошибке SMTP
- **WHEN** SMTP-сервер недоступен
- **THEN** задача ПОВТОРЯЕТСЯ до 3 раз с exponential backoff
