## Context

### Текущее состояние
- **email-service** (Python/FastAPI, Clean Architecture): отправляет email через NATS → Celery → SMTP
- Таблица `email_logs` хранит логи отправки (event_uuid, to, subject, status)
- Нет хранения email пользователей, нет верификации
- Backend проксирует запросы к другим микросервисам через clients-пакет
- Frontend (React/Next.js) взаимодействует только с backend

### Стейкхолдеры
- **notification-service** — потребляет email пользователей для рассылки
- **backend** — проксирует write-операции к email-service
- **frontend** — обрабатывает callback подтверждения email

## Goals / Non-Goals

**Goals:**
- Хранить привязку email к пользователю (1:1) с подтверждением
- Обеспечить уникальность email в рамках Equestrian ID (non-deleted записи)
- Реализовать soft-delete для email
- Подтверждать email через ссылку с контрольной строкой (TTL)
- Предоставить API для CRUD и подтверждения email
- Проксировать write-эндпоинты через backend
- Реализовать frontend-страницу `/callback/email`

**Non-Goals:**
- Валидация email перед отправкой письма (responsibility notification-service)
- Массовая рассылка подтверждений (каждый email по отдельности)
- Миграция существующих email из других источников
- Интеграция notification-service с GET `/emails` (отдельная задача)
- Rate limiting для отправки писем (отдельная задача)
- Очистка истёкших кодов подтверждения (отдельная задача)

## Decisions

### 1. Таблица `user_emails` вместо расширения `email_logs`

**Решение:** Создать отдельную таблицу `user_emails`.

**Обоснование:**
- `email_logs` — логи отправки (event_uuid, attempts, status) ≠ хранилище email пользователей
- Разные жизненные циклы: email_logs append-only, user_emails CRUD с soft-delete
- Чистое разделение ответственности по Clean Architecture

**Альтернативы:**
- Расширить `email_logs` — нарушает Single Responsibility, усложняет запросы

### 2. Soft-delete через `deleted_at` timestamp

**Решение:** Поле `deleted_at TIMESTAMP NULL` вместо булева флага.

**Обоснование:**
- Позволяет восстановление (если потребуется)
- Уникальный constraint `UNIQUE(user_id) WHERE deleted_at IS NULL` для 1:1
- Partial index для защиты от дубликатов email: `UNIQUE(email) WHERE deleted_at IS NULL`
- Стандартный паттерн в PostgreSQL

**Альтернативы:**
- Булев флаг `is_deleted` — менее гибко, сложнее восстановление

### 3. Контрольная строка подтверждения — UUID v4 + salt

**Решение:** Генерировать `code = uuid4().hex + random_salt(8)` (итого ≥40 символов).

**Обоснование:**
- UUID v4 — 32 hex символа, collision-resistant
- Дополнительный salt повышает энтропию
- Превышает требование ≥20 символов
- Легко генерировать, легко индексировать

**Хранение:**
- Таблица `email_confirmations`: `id`, `user_email_id` (FK), `code` (unique index), `expires_at`, `created_at`, `used_at` (nullable)

**Альтернативы:**
- JWT token — избыточно, не нужна подпись для одноразового кода
- Короткий random string — ниже энтропия, выше collision risk

### 4. TTL контрольной строки — параметризируемый, по умолчанию 24 часа

**Решение:** ENV `EMAIL_CONFIRMATION_TTL_HOURS=24`, хранение `expires_at = now() + ttl`.

**Обоснование:**
- Баланс между usability (пользователь успеет перейти) и security (не вечно)
- Параметризация позволяет менять без деплоя

### 5. Проксирование через backend с service-to-service auth

**Решение:** Backend проксирует 5 эндпоинтов (все кроме GET `/emails`), используя `BACKEND_SERVICE_KEY` для auth.

**Обоснование:**
- email-service не виден снаружи (internal service)
- Backend — единственный entry point для write-операций
- GET `/emails` — исключение: notification-service ходит напрямую (Public Read)

**Альтернативы:**
- Все запросы через backend — избыточный hop для read-only запроса notification-service

### 6. Frontend `/callback/email` — ISR/SSR страница без авторизации

**Решение:** Next.js страница с `getServerSideProps`, читает query param `code`, делает fetch к backend.

**Обоснование:**
- Страница должна быть доступна без авторизации (пользователь переходит по ссылке из письма)
- SSR для SEO не нужен (callback page), но SSR упрощает обработку ошибок
- `getServerSideProps` позволяет сразу сделать запрос к backend и вернуть результат

### 7. Логирование попыток подтверждения в существующую таблицу `email_logs`

**Решение:** Каждый запрос на подтверждение (успешный и неуспешный) логируется в существующую таблицу `email_logs` email-service.

**Поля лога:**
- `event_uuid` — генерируется автоматически (UUID v4)
- `action` — "email_confirmation"
- `status` — "success" | "expired" | "used" | "not_found"
- `user_email_id` — ID записи из user_emails (nullable для "not_found")
- `code` — переданный код подтверждения
- `timestamp` — время запроса (created_at)

**Обоснование:**
- Переиспользуем существующую инфраструктуру логирования
- Единый формат логов для всех email-операций
- Легко расширять для других действий (отправка, смена email)

**Альтернативы:**
- Отдельная таблица `email_confirmation_logs` — избыточно, дублирование структуры

## Risks / Trade-offs

| Риск | Митигация |
|------|-----------|
| Race condition при одновременном POST email для одного user_id | Unique constraint + обработка IntegrityError |
| Спам-запросы на отправку подтверждений | Rate limiting — Non-Goals, отдельная задача |
| Утечка email через GET `/emails` (Public Read) | Фильтрация только по approved=true в notification-service |
| Дубликаты email в разных Equestrian ID | Partial unique constraint `WHERE deleted_at IS NULL` — email уникален глобально |
| TTL контрольной строки истёк | Возврат 410 Gone с сообщением "запросите новое подтверждение" |

## Migration Plan

1. **Миграция БД email-service:**
   - Создать таблицу `user_emails` (user_id UUID PK, email, approved, deleted_at, created_at, updated_at)
   - Создать таблицу `email_confirmations` (id, user_email_id FK, code unique, expires_at, used_at)
   - Partial unique indexes: `user_emails(user_id) WHERE deleted_at IS NULL`, `user_emails(email) WHERE deleted_at IS NULL`

2. **Деплой email-service** с новыми эндпоинтами и Celery-задачей

3. **Деплой backend** с проксированием и schemas

4. **Деплой frontend** со страницей `/callback/email`

5. **Rollback:** Drop таблиц (данных пока нет), revert код

## Open Questions (Closed)

1. **Rate limiting для отправки писем** — НЕ реализуем в этом change. Добавлено в Non-Goals.
2. **Логирование попыток подтверждения** — В существующую таблицу `email_logs`. Добавлено логирование каждого запроса на подтверждение (успешного и неуспешного) с полями: event_uuid, action="email_confirmation", status="success"/"expired"/"used"/"not_found", user_email_id, code, timestamp.
3. **Очистка истёкших кодов** — НЕ в этом change. Добавлено в Non-Goals.
