## Context

Email-сервис `services/email-service` в текущем состоянии:
- Получает события из NATS stream `NOTIFICATION_COMMANDS` на subject `commands.notification.email.send`
- Имеет заглушечную схему `NotificationCommandSendEmail` с полями `email` и `text`
- Celery настроен с очередью `email`, broker Redis DB1, backend Redis DB2
- PostgreSQL подключен через async SQLAlchemy, но миграции пустые
- DI-контейнер регистрирует NATS и Celery, но сервис не использует БД

Ограничения:
- Сервис может быть заскейлен (несколько экземпляров)
- NATS может доставить событие повторно (at-least-once delivery)
- Вложения пока не поддерживаются

## Goals / Non-Goals

**Goals:**
- Реализовать полноценную отправку email с полной схемой полей
- Обеспечить идемпотентность при повторных NATS-событиях через event UUID
- Логировать все отправки в PostgreSQL для аудита
- Следовать SOLID: бизнес-логика в core слое, инфраструктура через протоколы

**Non-Goals:**
- Обработка вложений (отложено)
- Retry логика на уровне NATS consumer (уже есть в Celery)
- Admin UI для просмотра логов
- Шаблонизация email (body передается в событии)

## Decisions

### 1. Архитектура: NATS → Core Service → Celery → Email Provider

**Решение**: Единый пайплайн с разделением ответственности:
- NATS Worker (infrastructure) → парсит событие, вызывает Core Service
- Core Service (business logic) → валидация, проверка идемпотентности, логирование
- Celery Task (infrastructure) → отправка через SMTP provider

**Альтернативы**:
- Обработка в NATS worker напрямую — нарушает SOLID, смешивает бизнес-логику с инфраструктурой
- Использование отдельного сервиса для идемпотентности — избыточно для текущего масштаба

### 2. Идемпотентность: PostgreSQL с unique constraint на event_uuid

**Решение**: Таблица `email_logs` с полем `event_uuid` (unique constraint). При получении события:
1. Попытка вставить запись с `event_uuid`
2. При конфликте (duplicate key) — пропуск обработки
3. Статус записи меняется: `pending` → `sent` / `failed`

**Альтернативы**:
- Redis для хранения UUID — потеря данных при перезапуске, сложнее аудит
- Отдельная таблица идемпотентности — избыточная нормализация

### 3. SMTP Provider: внешняя библиотека aiosmtplib

**Решение**: Использование `aiosmtplib` для async отправки. SMTP настройки через `SMTPSettings` в settings.py.

**Альтернативы**:
- Стандартная `smtplib` — блокирующий I/O, не подходит для async worker
- Внешний API (SendGrid, Mailgun) — добавляет зависимость, не требуется по ТЗ

### 4. DI и SOLID: Protocol-based dependency injection

**Решение**:
- `EmailSenderProtocol` (абстракция) → `SMTPEmailSender` (реализация)
- `EmailLogRepositoryProtocol` (абстракция) → `SQLAlchemyEmailLogRepository` (реализация)
- `EmailProcessingService` (core) → зависит от протоколов, не от реализаций

**Альтернативы**:
- Прямые зависимости от конкретных классов — нарушает DIP
- Внешний DI фреймворк — избыточно, dependency-injector уже используется

### 5. Обработка ошибок и статусы

**Решение**:
- `pending` — событие получено, запись создана
- `sent` — SMTP отправка успешна
- `failed` — ошибка отправки (логируем traceback)
- При ошибке валидации — не создаем запись, логируем в Sentry

## Risks / Trade-offs

[Risk] Дублирование событий при параллельной обработке → Mitigation: unique constraint на `event_uuid` + transaction isolation

[Risk] SMTP сервер недоступен → Mitigation: autoretry в Celery (3 попытки), статус `failed` в БД

[Risk] Миграция пустой БД → Mitigation: создание миграции через Alembic, проверка в тестах

[Risk] Race condition при вставке → Mitigation: `INSERT ... ON CONFLICT DO NOTHING` + проверка результата

## Migration Plan

1. Создать миграцию Alembic для таблицы `email_logs`
2. Применить миграцию перед деплоем
3. Обновить NATS consumer и Celery task
4. Проверить работу на staging с тестовым NATS-событием

## Open Questions

- Нужно ли добавить поле `attempts_count` для подсчета попыток отправки?
- Нужно ли логировать ошибки валидации (отсутствующие поля) в `email_logs`?
