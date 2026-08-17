# email-backend-proxy Specification

## Purpose
Проксирование 5 эндпоинтов email-service через основной backend с owner-only access boundary, публичными confirmation-flow исключениями и точными status/idempotency контрактами.

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
Backend MUST проксировать `POST /api/emails` в private email-service только после user authentication и проверки точного совпадения authenticated user ID с `body.user_id`; role/scope MUST NOT обходить owner rule. Downstream call MUST выполняться без peer-service credential после подтверждённой network isolation.

#### Scenario: Первый create владельцем
- **WHEN** authenticated owner отправляет валидный новый email
- **THEN** backend возвращает `201` с `EmailResponse` и создаётся один ресурс

#### Scenario: Повторный create того же email
- **WHEN** owner повторно создаёт тот же нормализованный email
- **THEN** backend возвращает `201` с тем же логическим `EmailResponse`, не создаёт вторую запись и сохраняет `confirmed/approved=true`

#### Scenario: Другой email уже существующего owner
- **WHEN** owner создаёт email, отличный от уже существующего
- **THEN** backend возвращает `409` и не меняет существующий ресурс

#### Scenario: Anonymous и foreign create
- **WHEN** запрос не аутентифицирован либо authenticated ID не равен `body.user_id`
- **THEN** backend возвращает соответственно `401` либо `403` до lookup/downstream независимо от scope

#### Scenario: Invalid create
- **WHEN** UUID, body или email некорректен
- **THEN** backend возвращает `400`, а не framework `422`, без downstream call

### Requirement: Проксирование PATCH /emails
Backend MUST проксировать `PATCH /api/emails` только для authenticated owner без privileged override и без peer credential.

#### Scenario: Owner update
- **WHEN** authenticated owner обновляет существующий email валидным body
- **THEN** backend возвращает успешный `EmailResponse`

#### Scenario: Update access и отсутствие ресурса
- **WHEN** caller anonymous, foreign либо owner не имеет требуемого email
- **THEN** backend возвращает соответственно `401`, `403` до lookup/downstream либо owner-only `404`

#### Scenario: Invalid update
- **WHEN** UUID/body/email некорректен
- **THEN** backend возвращает `400`

### Requirement: Проксирование DELETE /emails/{user_id}
Backend MUST проксировать `DELETE /api/emails/{user_id}` только для authenticated owner без privileged override и без peer credential.

#### Scenario: Owner delete
- **WHEN** authenticated owner удаляет существующий email
- **THEN** backend возвращает `204`

#### Scenario: Delete access и отсутствие ресурса
- **WHEN** caller anonymous, foreign либо owner email отсутствует
- **THEN** backend возвращает соответственно `401`, `403` до lookup/downstream либо `404`

#### Scenario: Invalid delete UUID
- **WHEN** path UUID некорректен
- **THEN** backend возвращает `400`

### Requirement: Проксирование PATCH /emails/confirm
Backend MUST публично проксировать `PATCH /api/emails/confirm` как утверждённое confirmation-flow исключение без CMS session и peer credential; email-service SHALL сопоставлять ресурс по контрольной строке.

#### Scenario: Успешное публичное confirm
- **WHEN** anonymous или authenticated caller передаёт валидный code
- **THEN** backend возвращает подтверждённый `EmailResponse`

#### Scenario: Invalid confirm request
- **WHEN** body/code malformed или invalid
- **THEN** backend возвращает `400`; истёкший code сохраняет явно определённый доменный status, если он не является malformed request

### Requirement: Проксирование POST /emails/send-confirmation
Backend MUST публично проксировать `POST /api/emails/send-confirmation` как утверждённое confirmation-flow исключение без CMS session и peer credential; email-service SHALL находить пользователя/email по контрольной строке запроса.

#### Scenario: Успешный публичный send-confirmation
- **WHEN** anonymous или authenticated caller передаёт валидную контрольную строку
- **THEN** backend возвращает `202`, не требуя user cookie

#### Scenario: Invalid send-confirmation
- **WHEN** request malformed или контрольная строка invalid
- **THEN** backend возвращает `400`

### Requirement: ENV — адрес email-service в backend
MUST добавить ENV `EMAIL_SERVICE_URL` в backend для адресации email-service.

#### Scenario: Конфигурация адреса
- **WHEN** backend стартует
- **THEN** MUST использовать `EMAIL_SERVICE_URL` для формирования запросов к email-service

### Requirement: Access matrix email proxy
Backend MUST реализовать следующую access matrix.

| method | path | access class | roles | tenant selector | owner rule | without auth | with auth | foreign resource | validation status | tests |
|---|---|---|---|---|---|---|---|---|---|---|
| POST | `/api/emails` | Protected Write | authenticated user | N/A | exact `actor.id == body.user_id`, no override | `401` | owner first/same `201`, different `409` | `403` before lookup | all malformed/invalid `400` | anonymous/owner/foreign/first/same/different/confirmed |
| PATCH | `/api/emails` | Protected Write | authenticated user | N/A | exact owner, no override | `401` | owner success or missing `404` | `403` before lookup | `400` | anonymous/owner/foreign/missing/invalid |
| DELETE | `/api/emails/{user_id}` | Protected Write | authenticated user | N/A | exact owner, no override | `401` | owner `204` or missing `404` | `403` before lookup | malformed UUID `400` | anonymous/owner/foreign/missing/invalid |
| POST | `/api/emails/send-confirmation` | Public Confirmation Write | anonymous/authenticated | N/A | control-string lookup in email-service | public `202` or domain error | same contract | N/A | malformed/invalid `400` | anonymous/authenticated/invalid/downstream |
| PATCH | `/api/emails/confirm` | Public Confirmation Write | anonymous/authenticated | N/A | code lookup in email-service | public success or domain error | same contract | N/A | malformed/invalid `400` | anonymous/authenticated/valid/invalid/expired/reused |

Public confirmation writes являются исключениями, потому что flow должен работать без CMS session и идентифицирует ресурс контрольной строкой. Create/update/delete не имеют privileged bypass.

#### Scenario: Foreign denial precedes lookup
- **WHEN** authenticated caller передаёт чужой `user_id` в owner-only route
- **THEN** backend возвращает `403`, не вызывает downstream и не раскрывает наличие email
