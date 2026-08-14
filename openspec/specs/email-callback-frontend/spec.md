# email-callback-frontend Specification

## Purpose
Frontend страница `/callback/email` для обработки подтверждения email пользователя.

## Requirements

### Requirement: Страница /callback/email
MUST создать Next.js страницу по пути `/callback/email`, доступную без авторизации.

#### Scenario: Доступ без авторизации
- **WHEN** неавторизованный пользователь открывает `/callback/email?code=xxx`
- **THEN** страница MUST загрузиться без редиректа на login

#### Scenario: Страница без параметра code
- **WHEN** пользователь открывает `/callback/email` без query-параметра `code`
- **THEN** MUST отобразить сообщение об ошибке "Отсутствует код подтверждения"

### Requirement: Считывание параметра code из URL
MUST считывать query-параметр `code` из URL и передавать его в запрос к backend.

#### Scenario: Извлечение code из URL
- **WHEN** пользователь открывает `/callback/email?code=abc123`
- **THEN** MUST извлечь `code = "abc123"` из query string

### Requirement: Запрос к backend на подтверждение
MUST выполнять `PATCH /api/emails/confirm` с `{code}` к основному backend.

#### Scenario: Успешное подтверждение
- **WHEN** backend возвращает 200
- **THEN** MUST отобразить сообщение "Email успешно подтверждён"

#### Scenario: Код истёк (410 Gone)
- **WHEN** backend возвращает 410
- **THEN** MUST отобразить сообщение "Срок действия ссылки истёк. Запросите новое подтверждение"

#### Scenario: Код уже использован (409 Conflict)
- **WHEN** backend возвращает 409
- **THEN** MUST отобразить сообщение "Ссылка уже была использована"

#### Scenario: Код не найден (404 Not Found)
- **WHEN** backend возвращает 404
- **THEN** MUST отобразить сообщение "Неверная ссылка подтверждения"

#### Scenario: Ошибка сети
- **WHEN** запрос к backend не удался (timeout, 500)
- **THEN** MUST отобразить сообщение "Произошла ошибка. Попробуйте позже"
