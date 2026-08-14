# email-celery-integration Delta Specification

## Purpose
Добавление Celery-задачи для отправки письма подтверждения email.

## ADDED Requirements

### Requirement: Celery-задача send_confirmation_email
MUST создать Celery-задачу `send_confirmation_email` в `src/tasks/confirmation.py`.

#### Scenario: Отправка письма подтверждения
- **WHEN** задача вызвана с `user_email_id`
- **THEN** MUST сгенерировать контрольную строку, сохранить в `email_confirmations`, отправить email через SMTP

#### Scenario: Email пользователя не найден
- **WHEN** `user_email_id` не существует или запись удалена
- **THEN** MUST залогировать ошибку и завершить без отправки

#### Scenario: SMTP ошибка
- **WHEN** SMTP-сервер недоступен или возвращает ошибку
- **THEN** MUST залогировать ошибку, обновить статус попытки, НЕ помечать `used_at`

### Requirement: Формат письма подтверждения
MUST формировать email с subject "Подтверждение email" и body содержащим ссылку `{FRONTEND_URL}/callback/email?code={code}`.

#### Scenario: Корректная ссылка в письме
- **WHEN** письмо сформировано
- **THEN** body MUST содержать полную ссылку с валидным code

#### Scenario: Тема письма
- **WHEN** письмо сформировано
- **THEN** subject MUST быть "Подтверждение email"

### Requirement: ENV для параметризации
MUST использовать ENV `EMAIL_CONFIRMATION_TTL_HOURS` (по умолчанию 24) и `FRONTEND_URL` (обязательный) для формирования ссылки.

#### Scenario: Параметризация TTL
- **WHEN** `EMAIL_CONFIRMATION_TTL_HOURS=48`
- **THEN** `expires_at` MUST быть `now() + 48 часов`

#### Scenario: Параметризация frontend URL
- **WHEN** `FRONTEND_URL=https://example.com`
- **THEN** ссылка MUST быть `https://example.com/callback/email?code={code}`

#### Scenario: Отсутствие FRONTEND_URL
- **WHEN** ENV `FRONTEND_URL` не задан
- **THEN** MUST вернуть ошибку конфигурации при старте
