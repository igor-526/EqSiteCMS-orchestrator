## Why

В email-service уже реализована отправка email-писем через NATS/Celery, но сами адреса пользователей нигде не хранятся и не подтверждаются. Без этого невозможно:
- Уведомлять пользователей по персональному email (notification-service не знает адресов)
- Верифицировать владение почтовым ящиком перед массовой рассылкой
- Обеспечить GDPR-совместимое хранение с soft-delete

Задача 041 закрывает эту функциональность: хранилище email, система подтверждения через письмо со ссылкой, API-эндпоинты и интеграция с backend/frontend.

## What Changes

- **Новая таблица `user_emails`** в PostgreSQL email-service — привязка email к пользователю (1:1), подтверждение по умолчанию `false`, уникальность email в рамках Equestrian ID (только non-deleted записи), soft-delete
- **Система подтверждения email** — генерация контрольной строки (≥20 символов) с TTL, отправка письма со ссылкой, PATCH-эндпоинт для подтверждения по коду
- **6 API-эндпоинтов в email-service**:
  - `GET /emails?user_ids=...&approved=...` — массовое получение (Public Read, для notification-service)
  - `POST /emails` — запись email пользователя (Protected Write)
  - `PATCH /emails` — смена email (идемпотентный, Protected Write)
  - `DELETE /emails/{user_id}` — мягкое удаление (идемпотентный, 204, Protected Write)
  - `PATCH /emails/confirm` — подтверждение по контрольной строке (Protected Write, логирует в email_logs)
  - `POST /emails/send-confirmation` — запрос отправки письма подтверждения (Protected Write)
- **Проксирование через backend** — 5 эндпоинтов (все кроме GET массового получения) проксируются через основной backend; schemas в clients-пакете
- **Frontend страница `/callback/email`** — доступна без авторизации, считывает параметр `code` из URL, делает запрос к backend на подтверждение
- **ENV-переменные** — сервисный ключ backend в email-service, адрес email-service в backend и notification-service, параметризация TTL ссылки и адреса frontend


## Non-Goals

- Валидация email перед отправкой письма (responsibility notification-service)
- Массовая рассылка подтверждений (каждый email по отдельности)
- Миграция существующих email из других источников
- Интеграция notification-service с GET `/emails` (отдельная задача)
- **Rate limiting для отправки писем** — отдельная задача, не в scope данного change
- **Очистка истёкших кодов подтверждения** — отдельная задача, не в scope данного change

## Capabilities

### New Capabilities
- `email-user-storage`: Хранение привязки email к пользователю (1:1), soft-delete, защита от дубликатов, таблица user_emails, миграции, репозитории
- `email-confirmation`: Система подтверждения email через контрольную строку с TTL, отправка письма, верификация по коду
- `email-api-endpoints`: REST API эндпоинты email-service для CRUD операций с email и подтверждением
- `email-backend-proxy`: Проксирование 5 эндпоинтов email-service через основной backend, schemas в clients-пакете
- `email-callback-frontend`: Frontend страница `/callback/email` для обработки подтверждения email

### Modified Capabilities
- `email-database-models`: Добавление новой таблицы `user_emails` (существующая `email_logs` остаётся для логов отправки)
- `email-celery-integration`: Добавление Celery-задачи для отправки письма подтверждения email

## Impact

### Сервисы
- **email-service** — основные изменения: новая таблица, репозитории, API-эндпоинты, Celery-задача
- **backend** — проксирование 5 эндпоинтов, schemas в `clients/email-service`
- **frontend** — новая страница `/callback/email`
- **notification-service** — будет использовать GET `/emails` для получения адресов (интеграция в отдельной задаче)

### Инфраструктура
- PostgreSQL email-service — новая миграция для таблицы `user_emails`
- ENV: `BACKEND_SERVICE_KEY` (email-service), `EMAIL_SERVICE_URL` (backend, notification-service), `EMAIL_CONFIRMATION_TTL_HOURS`, `FRONTEND_URL` (email-service)

### API Access Matrix

| Method | Path | Access Class | Roles | Expected without auth | Expected with auth |
|--------|------|--------------|-------|----------------------|-------------------|
| GET | `/emails` | Public Read | — | 200 + данные | 200 + данные |
| POST | `/emails` | Protected Write | service | 401/403 | 201 |
| PATCH | `/emails` | Protected Write | service | 401/403 | 200 |
| DELETE | `/emails/{user_id}` | Protected Write | service | 401/403 | 204 |
| PATCH | `/emails/confirm` | Protected Write | service | 401/403 | 200 |
| POST | `/emails/send-confirmation` | Protected Write | service | 401/403 | 202 |

> GET `/emails` — единственное исключение из дефолтной policy: публичный доступ необходим notification-service для получения адресов без проксирования через backend. Остальные эндпоинты доступны только через backend (service-to-service auth).
