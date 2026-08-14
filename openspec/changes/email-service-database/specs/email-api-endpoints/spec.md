# email-api-endpoints Specification

## Purpose
REST API эндпоинты email-service для CRUD операций с email и подтверждением.

## ADDED Requirements

### Requirement: GET /emails — массовое получение email
MUST реализовать GET эндпоинт `/emails` с query-параметрами `user_ids` (обязательный, список UUID) и `approved` (опциональный, bool). Возвращает массив объектов `{id, user_id, email, approved}`.

#### Scenario: Получение email по user_ids
- **WHEN** запрос `GET /emails?user_ids=uuid1,uuid2`
- **THEN** MUST вернуть 200 с массивом non-deleted email для указанных пользователей

#### Scenario: Фильтр по approved=true
- **WHEN** запрос `GET /emails?user_ids=uuid1&approved=true`
- **THEN** MUST вернуть только email с `approved = true`

#### Scenario: Фильтр по approved=false
- **WHEN** запрос `GET /emails?user_ids=uuid1&approved=false`
- **THEN** MUST вернуть только email с `approved = false`

#### Scenario: Пустой результат
- **WHEN** ни один из user_ids не имеет non-deleted email
- **THEN** MUST вернуть 200 с пустым массивом `[]`

#### Scenario: Access — Public Read
- **WHEN** запрос без авторизации
- **THEN** MUST вернуть 200 с данными (GET /emails — Public Read, исключение из дефолтной policy)

### Requirement: POST /emails — запись email пользователя
MUST реализовать POST эндпоинт `/emails` принимающий `{user_id, email}`. Возвращает `{id, user_id, email, approved: false}`.

#### Scenario: Успешное создание
- **WHEN** запрос `POST /emails` с валидным `{user_id, email}`
- **THEN** MUST вернуть 201 с объектом `{id, user_id, email, approved: false}`

#### Scenario: Дубликат user_id (active record exists)
- **WHEN** для данного `user_id` уже существует non-deleted запись
- **THEN** MUST вернуть 409 Conflict

#### Scenario: Дубликат email (active record exists)
- **WHEN** данный `email` уже привязан к другому non-deleted пользователю
- **THEN** MUST вернуть 409 Conflict

#### Scenario: Валидация — невалидный email
- **WHEN** поле `email` не содержит `@`
- **THEN** MUST вернуть 422 Unprocessable Entity

#### Scenario: Валидация — отсутствие обязательных полей
- **WHEN** запрос не содержит `user_id` или `email`
- **THEN** MUST вернуть 422 Unprocessable Entity

#### Scenario: Access — Protected Write
- **WHEN** запрос без валидного service key
- **THEN** MUST вернуть 401/403

### Requirement: PATCH /emails — смена email пользователя
MUST реализовать PATCH эндпоинт `/emails` принимающий `{user_id, email}`. Идемпотентный: если email совпадает — `approved` не сбрасывается.

#### Scenario: Успешная смена email
- **WHEN** запрос `PATCH /emails` с `{user_id, "new@example.com"}`, текущий email другой
- **THEN** MUST вернуть 200 с `{..., email: "new@example.com", approved: false}`

#### Scenario: Идемпотентность — тот же email
- **WHEN** запрос `PATCH /emails` с `{user_id, "same@example.com"}`, текущий email совпадает
- **THEN** MUST вернуть 200 без изменения `approved` (если было true — остаётся true)

#### Scenario: Пользователь не найден
- **WHEN** `user_id` не имеет non-deleted email
- **THEN** MUST вернуть 404 Not Found

#### Scenario: Дубликат нового email
- **WHEN** новый `email` уже привязан к другому non-deleted пользователю
- **THEN** MUST вернуть 409 Conflict

#### Scenario: Access — Protected Write
- **WHEN** запрос без валидного service key
- **THEN** MUST вернуть 401/403

### Requirement: DELETE /emails/{user_id} — мягкое удаление
MUST реализовать DELETE эндпоинт `/emails/{user_id}`. Идемпотентный: 204 в любом случае.

#### Scenario: Успешное удаление
- **WHEN** запрос `DELETE /emails/{uuid}` для существующего non-deleted email
- **THEN** MUST вернуть 204, запись MUST быть помечена как deleted

#### Scenario: Идемпотентность — уже удалён
- **WHEN** запрос `DELETE /emails/{uuid}` для уже удалённого email
- **THEN** MUST вернуть 204 без ошибки

#### Scenario: Пользователь не найден
- **WHEN** `user_id` не существует в БД
- **THEN** MUST вернуть 204 (идемпотентность)

#### Scenario: Access — Protected Write
- **WHEN** запрос без валидного service key
- **THEN** MUST вернуть 401/403

### Requirement: PATCH /emails/confirm — подтверждение по контрольной строке
MUST реализовать PATCH эндпоинт `/emails/confirm` принимающий `{code}`.

#### Scenario: Успешное подтверждение
- **WHEN** запрос `PATCH /emails/confirm` с валидным `code`
- **THEN** MUST вернуть 200 с подтверждением

#### Scenario: Истёкший код
- **WHEN** `code` истёк (`expires_at <= now()`)
- **THEN** MUST вернуть 410 Gone

#### Scenario: Уже использованный код
- **WHEN** `code` уже использован (`used_at IS NOT NULL`)
- **THEN** MUST вернуть 409 Conflict

#### Scenario: Несуществующий код
- **WHEN** `code` не найден
- **THEN** MUST вернуть 404 Not Found

#### Scenario: Access — Protected Write
- **WHEN** запрос без валидного service key
- **THEN** MUST вернуть 401/403

### Requirement: POST /emails/send-confirmation — запрос отправки письма
MUST реализовать POST эндпоинт `/emails/send-confirmation` принимающий `{user_id}`.

#### Scenario: Успешный запрос отправки
- **WHEN** запрос `POST /emails/send-confirmation` с валидным `user_id`, email существует
- **THEN** MUST вернуть 202 Accepted и запустить отправку письма через Celery

#### Scenario: Email не найден
- **WHEN** у `user_id` нет non-deleted email
- **THEN** MUST вернуть 404 Not Found

#### Scenario: Access — Protected Write
- **WHEN** запрос без валидного service key
- **THEN** MUST вернуть 401/403
