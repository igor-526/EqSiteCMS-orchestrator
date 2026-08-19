## ADDED Requirements

### Requirement: Защищённое чтение собственного email
Backend MUST проксировать `GET /api/emails/me` в private email-service только для authenticated пользователя, выводить `user_id` из session и возвращать только его активный email.

#### Scenario: Owner email найден
- **WHEN** authenticated owner имеет активный email
- **THEN** backend MUST вернуть `200 EmailResponse` с `approved`, не принимая `user_id` от caller

#### Scenario: Owner email отсутствует
- **WHEN** authenticated owner не имеет активного email
- **THEN** backend MUST вернуть `404`

#### Scenario: Anonymous read
- **WHEN** anonymous caller запрашивает `/api/emails/me`
- **THEN** backend MUST вернуть `401` без downstream call

### Requirement: Расширенная access matrix email proxy
Backend MUST добавить следующую строку к существующей email access matrix; create/update/delete остаются owner-only без role override, а send-confirmation/confirm остаются public write exceptions.

| method | path | access class | roles | expected without auth | expected with auth | foreign resource | tests |
|---|---|---|---|---|---|---|---|
| GET | `/api/emails/me` | Protected Sensitive Read | authenticated owner | `401` | `200` или `404` | owner derived from session, selector отсутствует | anonymous/owner/missing/downstream invalid/timeout |

Protected GET является исключением из Public Read, поскольку email и confirmation state — персональные данные и не нужны consumer sites.

#### Scenario: Existing confirmation exceptions unchanged
- **WHEN** anonymous caller использует `POST /api/emails/send-confirmation` или `PATCH /api/emails/confirm`
- **THEN** существующий public confirmation-flow contract MUST сохраниться

### Requirement: Безопасный live confirmation flow
Live QA MUST получать строку/токен подтверждения только из разрешённого тестового источника, немедленно выполнять `PATCH /api/emails/confirm`, не раскрывать полный токен в отчётах и очищать временное значение после сценария; проверка фактического почтового ящика не требуется.

#### Scenario: Немедленное подтверждение тестового email
- **WHEN** send-confirmation создал тестовую строку/токен и QA получил её из тестовой PostgreSQL либо service log
- **THEN** QA MUST сразу выполнить anonymous confirm-запрос, проверить `200` и `approved=true`, сохранить только маскированное evidence и удалить временную копию секрета
