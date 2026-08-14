# email-confirmation Specification

## Purpose
Система подтверждения email через контрольную строку с TTL, отправку письма и верификацию по коду.

## ADDED Requirements

### Requirement: Таблица email_confirmations
MUST создать таблицу `email_confirmations` с полями: `id` (UUID, PK), `user_email_id` (UUID, FK на user_emails), `code` (String, UNIQUE), `expires_at` (DateTime), `created_at` (DateTime), `used_at` (DateTime, nullable).

#### Scenario: Создание таблицы
- **WHEN** миграция применяется
- **THEN** таблица `email_confirmations` MUST существовать со всеми указанными полями

#### Scenario: Unique constraint на code
- **WHEN** попытка вставить запись с существующим `code`
- **THEN** MUST возникнуть ошибка unique constraint violation

### Requirement: Генерация контрольной строки
MUST генерировать `code` длиной не менее 20 символов. Рекомендуемый формат: `uuid4().hex + random_salt(8)` (итого 40+ символов).

#### Scenario: Длина контрольной строки
- **WHEN** генерируется новый code
- **THEN** длина MUST быть ≥ 20 символов

#### Scenario: Уникальность контрольной строки
- **WHEN** генерируются два code подряд
- **THEN** они MUST быть различны (collision-resistant)

### Requirement: TTL контрольной строки
MUST вычислять `expires_at = now() + EMAIL_CONFIRMATION_TTL_HOURS`. Значение по умолчанию — 24 часа. Параметризируется через ENV `EMAIL_CONFIRMATION_TTL_HOURS`.

#### Scenario: Вычисление TTL
- **WHEN** создаётся запись подтверждения
- **THEN** `expires_at` MUST быть `created_at + TTL`

#### Scenario: Значение TTL по умолчанию
- **WHEN** ENV `EMAIL_CONFIRMATION_TTL_HOURS` не задан
- **THEN** TTL MUST быть 24 часа

### Requirement: Отправка письма со ссылкой подтверждения
MUST отправлять email с ссылкой формата `{FRONTEND_URL}/callback/email?code={code}`. ENV `FRONTEND_URL` параметризирует базовый адрес.

#### Scenario: Формирование ссылки
- **WHEN** запрошена отправка подтверждения для user_id
- **THEN** письмо MUST содержать ссылку `{FRONTEND_URL}/callback/email?code={code}`

#### Scenario: Отсутствие email у пользователя
- **WHEN** у user_id нет non-deleted email в БД
- **THEN** MUST вернуть ошибку 404 "email не найден"

### Requirement: Подтверждение по контрольной строке
MUST искать запись в `email_confirmations` по `code`, проверять `expires_at > now()`, `used_at IS NULL`, и подтверждать email.

#### Scenario: Успешное подтверждение
- **WHEN** предоставлен валидный `code`, `expires_at > now()`, `used_at IS NULL`
- **THEN** MUST установить `approved = true` в `user_emails`, установить `used_at = now()` в `email_confirmations`, вернуть 200

#### Scenario: Истёкший код
- **WHEN** `expires_at <= now()`
- **THEN** MUST вернуть 410 Gone с сообщением "срок действия ссылки истёк"

#### Scenario: Уже использованный код
- **WHEN** `used_at IS NOT NULL`
- **THEN** MUST вернуть 409 Conflict с сообщением "ссылка уже использована"

#### Scenario: Несуществующий код
- **WHEN** `code` не найден в БД
- **THEN** MUST вернуть 404 Not Found

### Requirement: Логирование попыток подтверждения
MUST логировать каждый запрос на подтверждение в существующую таблицу `email_logs` email-service. Логирование MUST происходить независимо от результата запроса (успешный, неуспешный, несуществующий код).

#### Scenario: Логирование успешного подтверждения
- **WHEN** предоставлен валидный `code`, `expires_at > now()`, `used_at IS NULL`
- **THEN** MUST создать запись в `email_logs` с полями: `event_uuid` (UUID v4), `action`="email_confirmation", `status`="success", `user_email_id`, `code`, `timestamp`

#### Scenario: Логирование истёкшего кода
- **WHEN** `expires_at <= now()`
- **THEN** MUST создать запись в `email_logs` с `status`="expired", `user_email_id` из найденной записи, `code`

#### Scenario: Логирование использованного кода
- **WHEN** `used_at IS NOT NULL`
- **THEN** MUST создать запись в `email_logs` с `status`="used", `user_email_id` из найденной записи, `code`

#### Scenario: Логирование несуществующего кода
- **WHEN** `code` не найден в БД
- **THEN** MUST создать запись в `email_logs` с `status`="not_found", `user_email_id`=NULL, `code`

### Requirement: Инвалидация предыдущих кодов
При запросе нового подтверждения MUST помечать все предыдущие non-used коды этого email как использованные (установить `used_at = now()`).

#### Scenario: Повторный запрос подтверждения
- **WHEN** пользователь запрашивает повторную отправку, имея non-used код
- **THEN** старый код MUST быть помечен как использованный, новый MUST быть создан
