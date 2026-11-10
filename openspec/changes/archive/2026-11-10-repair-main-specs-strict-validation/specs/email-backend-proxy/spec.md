## MODIFIED Requirements

### Requirement: Расширенная access matrix email proxy
Backend MUST сохранять расширенную матрицу доступа email proxy и её исключения согласно сценарию «Полный контракт расширенной матрицы».

#### Scenario: Existing confirmation exceptions unchanged
- **WHEN** anonymous caller использует `POST /api/emails/send-confirmation` или `PATCH /api/emails/confirm`
- **THEN** существующий public confirmation-flow contract MUST сохраниться

#### Scenario: Полный контракт расширенной матрицы
- **WHEN** проверяется сохранение существующего контракта capability
- **THEN** MUST соблюдаться все следующие исходные условия без изменения поведения:

Backend MUST добавить следующую строку к существующей email access matrix; create/update/delete остаются owner-only без role override, а send-confirmation/confirm остаются public write exceptions.

| method | path | access class | roles | expected without auth | expected with auth | foreign resource | tests |
|---|---|---|---|---|---|---|---|
| GET | `/api/emails/me` | Protected Sensitive Read | authenticated owner | `401` | `200` или `404` | owner derived from session, selector отсутствует | anonymous/owner/missing/downstream invalid/timeout |

Protected GET является исключением из Public Read, поскольку email и confirmation state — персональные данные и не нужны consumer sites.

### Requirement: Access matrix email proxy
Backend MUST соблюдать неизменную матрицу email proxy, owner-only ограничения и публичные confirmation-flow исключения согласно сценарию «Полный контракт матрицы email».

#### Scenario: Foreign denial precedes lookup
- **WHEN** authenticated caller передаёт чужой `user_id` в owner-only route
- **THEN** backend возвращает `403`, не вызывает downstream и не раскрывает наличие email

#### Scenario: Полный контракт матрицы email
- **WHEN** проверяется сохранение существующего контракта capability
- **THEN** MUST соблюдаться все следующие исходные условия без изменения поведения:

Backend MUST реализовать следующую access matrix.

| method | path | access class | roles | tenant selector | owner rule | without auth | with auth | foreign resource | validation status | tests |
|---|---|---|---|---|---|---|---|---|---|---|
| POST | `/api/emails` | Protected Write | authenticated user | N/A | exact `actor.id == body.user_id`, no override | `401` | owner first/same `201`, different `409` | `403` before lookup | all malformed/invalid `400` | anonymous/owner/foreign/first/same/different/confirmed |
| PATCH | `/api/emails` | Protected Write | authenticated user | N/A | exact owner, no override | `401` | owner success or missing `404` | `403` before lookup | `400` | anonymous/owner/foreign/missing/invalid |
| DELETE | `/api/emails/{user_id}` | Protected Write | authenticated user | N/A | exact owner, no override | `401` | owner `204` or missing `404` | `403` before lookup | malformed UUID `400` | anonymous/owner/foreign/missing/invalid |
| POST | `/api/emails/send-confirmation` | Public Confirmation Write | anonymous/authenticated | N/A | control-string lookup in email-service | public `202` or domain error | same contract | N/A | malformed/invalid `400` | anonymous/authenticated/invalid/downstream |
| PATCH | `/api/emails/confirm` | Public Confirmation Write | anonymous/authenticated | N/A | code lookup in email-service | public success or domain error | same contract | N/A | malformed/invalid `400` | anonymous/authenticated/valid/invalid/expired/reused |

Public confirmation writes являются исключениями, потому что flow должен работать без CMS session и идентифицирует ресурс контрольной строкой. Create/update/delete не имеют privileged bypass.
