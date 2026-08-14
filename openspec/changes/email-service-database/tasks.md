## 1. Database Models & Migrations (email-service)

- [ ] 1.1 Создать SQLAlchemy модель `UserEmail` в `src/models/user_email.py`
- [ ] 1.2 Создать SQLAlchemy модель `EmailConfirmation` в `src/models/email_confirmation.py`
- [ ] 1.3 Создать Alembic миграцию `20260814_0003_add_user_emails_and_confirmations.py`
- [ ] 1.4 Проверить применение миграции (`alembic upgrade head`)
- [ ] 1.5 Проверить откат миграции (`alembic downgrade -1`)

## 2. Repositories (email-service)

- [ ] 2.1 Создать протокол `UserEmailRepositoryProtocol` в `src/repositories/protocols.py`
- [ ] 2.2 Реализовать `SQLAlchemyUserEmailRepository` в `src/repositories/user_email.py`
- [ ] 2.3 Создать протокол `EmailConfirmationRepositoryProtocol` в `src/repositories/protocols.py`
- [ ] 2.4 Реализовать `SQLAlchemyEmailConfirmationRepository` в `src/repositories/email_confirmation.py`
- [ ] 2.5 Зарегистрировать репозитории в DI контейнере

## 3. Core Services (email-service)

- [ ] 3.1 Создать `UserEmailService` в `src/core/services/user_email.py` (CRUD + soft-delete)
- [ ] 3.2 Создать `EmailConfirmationService` в `src/core/services/email_confirmation.py` (генерация кода, подтверждение)
- [ ] 3.3 Добавить ENV `EMAIL_CONFIRMATION_TTL_HOURS` и `FRONTEND_URL` в `src/settings.py`
- [ ] 3.4 Добавить ENV `BACKEND_SERVICE_KEY` в `src/settings.py`
- [ ] 3.5 Добавить метод логирования в `EmailConfirmationService` для записи в `email_logs` (event_uuid, action="email_confirmation", status, user_email_id, code, timestamp)

## 4. Celery Tasks (email-service)

- [ ] 4.1 Создать задачу `send_confirmation_email` в `src/tasks/confirmation.py`
- [ ] 4.2 Реализовать формирование ссылки `{FRONTEND_URL}/callback/email?code={code}`
- [ ] 4.3 Реализовать отправку email через SMTP с subject "Подтверждение email"
- [ ] 4.4 Обработка ошибок SMTP с логированием

## 5. API Endpoints (email-service)

- [ ] 5.1 Создать schemas в `src/api/schemas/email.py` (EmailCreate, EmailUpdate, EmailConfirm, EmailResponse)
- [ ] 5.2 Реализовать `GET /emails` (Public Read) в `src/api/endpoints/emails.py`
- [ ] 5.3 Реализовать `POST /emails` (Protected Write) в `src/api/endpoints/emails.py`
- [ ] 5.4 Реализовать `PATCH /emails` (Protected Write, идемпотентный) в `src/api/endpoints/emails.py`
- [ ] 5.5 Реализовать `DELETE /emails/{user_id}` (Protected Write, идемпотентный, 204) в `src/api/endpoints/emails.py`
- [ ] 5.6 Реализовать `PATCH /emails/confirm` (Protected Write) в `src/api/endpoints/emails.py` с логированием в `email_logs`
- [ ] 5.7 Реализовать `POST /emails/send-confirmation` (Protected Write, 202) в `src/api/endpoints/emails.py`
- [ ] 5.8 Добавить middleware для проверки `BACKEND_SERVICE_KEY` на Protected Write эндпоинтах
- [ ] 5.9 Зарегистрировать роутер в `src/main.py`

## 6. Backend Proxy (backend)

- [ ] 6.1 Создать schemas в `clients/email-service/schemas.py`
- [ ] 6.2 Создать клиент `EmailServiceClient` в `clients/email-service/client.py`
- [ ] 6.3 Добавить ENV `EMAIL_SERVICE_URL` в `src/core/config/settings.py`
- [ ] 6.4 Реализовать проксирование `POST /api/emails` → email-service
- [ ] 6.5 Реализовать проксирование `PATCH /api/emails` → email-service
- [ ] 6.6 Реализовать проксирование `DELETE /api/emails/{user_id}` → email-service
- [ ] 6.7 Реализовать проксирование `PATCH /api/emails/confirm` → email-service
- [ ] 6.8 Реализовать проксирование `POST /api/emails/send-confirmation` → email-service

## 7. Frontend Callback (frontend)

- [ ] 7.1 Создать страницу `src/pages/callback/email.tsx`
- [ ] 7.2 Реализовать считывание query-параметра `code`
- [ ] 7.3 Реализовать запрос `PATCH /api/emails/confirm` с `{code}`
- [ ] 7.4 Отобразить результат: успех / ошибка (410, 409, 404, network error)
- [ ] 7.5 Страница доступна без авторизации (public route)

## 8. Notification Service ENV (notification-service)

- [ ] 8.1 Добавить ENV `EMAIL_SERVICE_URL` в notification-service settings

## 9. Unit Tests (email-service)

- [ ] 9.1 Тесты модели UserEmail (создание, значения по умолчанию)
- [ ] 9.2 Тесты модели EmailConfirmation (создание, unique constraint)
- [ ] 9.3 Тесты UserRepository — create (успешное создание)
- [ ] 9.4 Тесты UserRepository — create (дубликат user_id, non-deleted)
- [ ] 9.5 Тесты UserRepository — create (дубликат email, non-deleted)
- [ ] 9.6 Тесты UserRepository — create после soft-delete (успех)
- [ ] 9.7 Тесты UserRepository — get_by_user_id (найден)
- [ ] 9.8 Тесты UserRepository — get_by_user_id (не найден / deleted)
- [ ] 9.9 Тесты UserRepository — get_by_user_ids (массовый запрос)
- [ ] 9.10 Тесты UserRepository — get_by_user_ids с фильтром approved
- [ ] 9.11 Тесты UserRepository — update_email (смена email, approved=false)
- [ ] 9.12 Тесты UserRepository — update_email (идемпотентность, тот же email)
- [ ] 9.13 Тесты UserRepository — soft_delete (успех)
- [ ] 9.14 Тесты UserRepository — soft_delete (идемпотентность, уже удалён)
- [ ] 9.15 Тесты UserRepository — approve (установка approved=true)
- [ ] 9.16 Тесты ConfirmationRepository — create (генерация кода ≥20 символов)
- [ ] 9.17 Тесты ConfirmationRepository — get_by_code (найден)
- [ ] 9.18 Тесты ConfirmationRepository — get_by_code (не найден)
- [ ] 9.19 Тесты ConfirmationRepository — mark_used (установка used_at)
- [ ] 9.20 Тесты ConfirmationRepository — invalidate_previous (пометка старых кодов)
- [ ] 9.21 Тесты UserEmailService — create_email (успех)
- [ ] 9.22 Тесты UserEmailService — create_email (дубликат, 409)
- [ ] 9.23 Тесты UserEmailService — change_email (успех, approved=false)
- [ ] 9.24 Тесты UserEmailService — change_email (идемпотентность)
- [ ] 9.25 Тесты UserEmailService — soft_delete (успех, идемпотентность)
- [ ] 9.26 Тесты EmailConfirmationService — confirm (успех)
- [ ] 9.27 Тесты EmailConfirmationService — confirm (код истёк, 410)
- [ ] 9.28 Тесты EmailConfirmationService — confirm (код использован, 409)
- [ ] 9.29 Тесты EmailConfirmationService — confirm (код не найден, 404)
- [ ] 9.30 Тесты EmailConfirmationService — send_confirmation (успех, email отправлен)

## 10. Smoke Tests

- [ ] 10.1 Smoke: GET /emails — Public Read, 200 без авторизации
- [ ] 10.2 Smoke: GET /emails?user_ids=... — фильтрация по user_ids
- [ ] 10.3 Smoke: GET /emails?approved=true — фильтрация по approved
- [ ] 10.4 Smoke: POST /emails — Protected Write, 401 без service key
- [ ] 10.5 Smoke: POST /emails — Protected Write, 201 с валидным service key
- [ ] 10.6 Smoke: POST /emails — 409 при дубликате user_id
- [ ] 10.7 Smoke: POST /emails — 409 при дубликате email
- [ ] 10.8 Smoke: POST /emails — 422 при невалидном email
- [ ] 10.9 Smoke: PATCH /emails — смена email, 200, approved=false
- [ ] 10.10 Smoke: PATCH /emails — идемпотентность (тот же email, approved не сброшен)
- [ ] 10.11 Smoke: PATCH /emails — 404 если пользователь не найден
- [ ] 10.12 Smoke: DELETE /emails/{user_id} — 204, мягкое удаление
- [ ] 10.13 Smoke: DELETE /emails/{user_id} — 204, идемпотентность (уже удалён)
- [ ] 10.14 Smoke: DELETE /emails/{user_id} — 204, несуществующий user_id
- [ ] 10.15 Smoke: PATCH /emails/confirm — 200, успешное подтверждение
- [ ] 10.16 Smoke: PATCH /emails/confirm — 410, код истёк
- [ ] 10.17 Smoke: PATCH /emails/confirm — 409, код уже использован
- [ ] 10.18 Smoke: PATCH /emails/confirm — 404, код не найден
- [ ] 10.19 Smoke: POST /emails/send-confirmation — 202, email отправлен
- [ ] 10.20 Smoke: POST /emails/send-confirmation — 404, email не найден
- [ ] 10.21 Smoke: POST /emails/send-confirmation — 401 без service key
- [ ] 10.22 Smoke: Backend proxy POST /api/emails — 201 через backend
- [ ] 10.23 Smoke: Backend proxy PATCH /api/emails — 200 через backend
- [ ] 10.24 Smoke: Backend proxy DELETE /api/emails/{user_id} — 204 через backend
- [ ] 10.25 Smoke: Backend proxy PATCH /api/emails/confirm — 200 через backend
- [ ] 10.26 Smoke: Backend proxy POST /api/emails/send-confirmation — 202 через backend
- [ ] 10.27 Smoke: GET /emails — response schema содержит id, user_id, email, approved
- [ ] 10.28 Smoke: POST /emails — response schema содержит id, user_id, email, approved=false
- [ ] 10.29 Smoke: PATCH /emails — response schema содержит обновлённые данные
- [ ] 10.30 Smoke: Cleanup — удаление всех тестовых данных из PostgreSQL

## 11. Quality Gate

- [ ] 11.1 Проверить Clean Architecture (email-service) — domain не зависит от infrastructure
- [ ] 11.2 Проверить Access matrix для всех 6 эндпоинтов
- [ ] 11.3 Проверить, что GET /emails — единственный Public Read
- [ ] 11.4 Проверить, что все POST/PATCH/DELETE требуют service key
- [ ] 11.5 Проверить идемпотентность PATCH /emails и DELETE /emails/{user_id}
- [ ] 11.6 Проверить, что partial unique constraints работают (user_id, email)
- [ ] 11.7 Проверить, что soft-delete не физически удаляет данные
- [ ] 11.8 Проверить, что код подтверждения ≥20 символов
- [ ] 11.9 Проверить, что TTL параметризируется через ENV
- [ ] 11.10 Проверить, что frontend /callback/email доступен без авторизации
- [ ] 11.11 Убедиться что `make test` проходит
- [ ] 11.12 Проверить наличие всех 30+ unit-тестов
- [ ] 11.13 Проверить наличие всех 30+ smoke-тестов
- [ ] 11.14 Проверить логирование всех попыток подтверждения в email_logs (success, expired, used, not_found)
- [ ] 11.15 Проверить наличие полей лога: event_uuid, action, status, user_email_id, code, timestamp
