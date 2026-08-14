## Why

Email-сервис в `email-service` в настоящее время реализует только получение событий из NATS и заглушечную обработку. Для полноценной отправки email необходимо:

1. Реализовать бизнес-логику отправки email с полной схемой полей (получатель, тема, тело, копии и т.д.)
2. Обеспечить идемпотентность при скейлинге сервиса через NATS event UUID
3. Логировать все отправленные сообщения в PostgreSQL для аудита и отладки
4. Следовать SOLID принципам — бизнес-логика в core слое, инфраструктурные зависимости через протоколы

## What Changes

- **Расширение схемы email**: добавление полей `to`, `subject`, `body`, `cc`, `bcc`, `reply_to`, `from_name`, `from_email` в `NotificationCommandSendEmail`
- **Идемпотентность**: PostgreSQL таблица `email_logs` с уникальным constraint на `event_uuid` для защиты от дублирования событий из NATS
- **Логирование**: сохранение всех полей email (кроме вложений) в БД с отслеживанием статусов (`pending` / `sent` / `failed`)
- **SOLID в core слое**: бизнес-логика обработки событий и формирования email в `core/services/`, инфраструктурные зависимости (NATS, Celery, SMTP) через Protocol-ы
- **Миграции Alembic**: создание таблицы `email_logs` и расширение существующей схемы
- **Интеграция NATS → Core Service → Celery**: единый пайплайн обработки с защитой от повторной отправки

## Capabilities

### New Capabilities
- `email-send-logic`: бизнес-логика отправки email — валидация, формирование, идемпотентность, логирование
- `email-database-models`: модели и репозитории для PostgreSQL — email_logs, миграции

### Modified Capabilities
- `email-celery-integration`: расширение Celery task для использования core-сервиса вместо заглушки

## Impact

- **Затронутый код**: `services/email-service/src/core/`, `services/email-service/src/models/`, `services/email-service/src/repositories/`, `services/email-service/src/workers/tasks/`, `services/email-service/src/migration/`
- **Зависимости**: PostgreSQL (Alembic миграции), NATS (события), Celery (очередь задач), SMTP (отправка)
- **Без breaking changes**: расширение существующих компонентов без изменения публичных интерфейсов
