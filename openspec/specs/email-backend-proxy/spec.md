# email-backend-proxy Specification

## Purpose
Проксирование 5 эндпоинтов email-service через основной backend с валидацией schemas в clients-пакете.

## Requirements

### Requirement: Client schemas для email-service
MUST создать schemas в `clients/email-service/` для валидации ответов проксируемых эндпоинтов: `EmailCreate`, `EmailUpdate`, `EmailConfirm`, `EmailSendConfirmation`, `EmailResponse`.

#### Scenario: Схема EmailCreate
- **WHEN** определена схема EmailCreate
- **THEN** MUST содержать поля `user_id` (UUID), `email` (str)

#### Scenario: Схема EmailResponse
- **WHEN** определена схема EmailResponse
- **THEN** MUST содержать поля `id` (UUID), `user_id` (UUID), `email` (str), `approved` (bool)

### Requirement: Проксирование POST /emails
MUST проксировать `POST /emails` из backend в email-service. Backend принимает запрос от frontend/CMS, валидирует, пересылает с service key.

#### Scenario: Успешное проксирование POST
- **WHEN** backend получает `POST /api/emails` с валидным body
- **THEN** MUST переслать в email-service с `BACKEND_SERVICE_KEY`, вернуть ответ клиенту

#### Scenario: Ошибка email-service
- **WHEN** email-service возвращает 409 Conflict
- **THEN** MUST вернуть 409 клиенту с тем же телом

### Requirement: Проксирование PATCH /emails
MUST проксировать `PATCH /emails` из backend в email-service.

#### Scenario: Успешное проксирование PATCH
- **WHEN** backend получает `PATCH /api/emails` с валидным body
- **THEN** MUST переслать в email-service, вернуть ответ клиенту

### Requirement: Проксирование DELETE /emails/{user_id}
MUST проксировать `DELETE /emails/{user_id}` из backend в email-service.

#### Scenario: Успешное проксирование DELETE
- **WHEN** backend получает `DELETE /api/emails/{user_id}`
- **THEN** MUST переслать в email-service, вернуть 204 клиенту

### Requirement: Проксирование PATCH /emails/confirm
MUST проксировать `PATCH /emails/confirm` из backend в email-service.

#### Scenario: Успешное проксирование confirm
- **WHEN** backend получает `PATCH /api/emails/confirm` с `{code}`
- **THEN** MUST переслать в email-service, вернуть ответ клиенту

#### Scenario: Ошибка 410 Gone
- **WHEN** email-service возвращает 410 Gone (код истёк)
- **THEN** MUST вернуть 410 клиенту

### Requirement: Проксирование POST /emails/send-confirmation
MUST проксировать `POST /emails/send-confirmation` из backend в email-service.

#### Scenario: Успешное проксирование send-confirmation
- **WHEN** backend получает `POST /api/emails/send-confirmation` с `{user_id}`
- **THEN** MUST переслать в email-service, вернуть 202 клиенту

### Requirement: ENV — адрес email-service в backend
MUST добавить ENV `EMAIL_SERVICE_URL` в backend для адресации email-service.

#### Scenario: Конфигурация адреса
- **WHEN** backend стартует
- **THEN** MUST использовать `EMAIL_SERVICE_URL` для формирования запросов к email-service

### Requirement: ENV — сервисный ключ backend в email-service
MUST добавить ENV `BACKEND_SERVICE_KEY` в email-service для валидации запросов от backend.

#### Scenario: Валидация service key
- **WHEN** email-service получает запрос с `Authorization: Bearer {key}`
- **THEN** MUST проверить `key == BACKEND_SERVICE_KEY`, иначе 401
