## ADDED Requirements

### Requirement: Callback event не переносит UUID всадника и не раскрывает UUID пользователю
Канонические backend и notification-service AsyncAPI и runtime schemas MUST определять `events.site.callback.requested` payload с `occurred_at`, внутренним `callback_request_id`, `phone`, optional `name` и optional `comment`; callback message MUST NOT содержать `equestrian_id`, `X-Equestrian-Id` или UUID всадника. `callback_request_id` нужен только для корреляции service update, а `Nats-Msg-Id` — для transport idempotency; оба MUST NOT попадать в пользовательское письмо.

#### Scenario: Producer-consumer contract
- **WHEN** backend публикует созданную и сохранённую заявку
- **THEN** notification-service принимает schema-compatible payload с callback_request_id, без UUID всадника/tenant header, а transport message сохраняет `Nats-Msg-Id`

#### Scenario: AsyncAPI validation
- **WHEN** выполняется `make asyncapi-validate` и contract tests обоих сервисов
- **THEN** required fields, headers и runtime schemas совпадают, а `X-Equestrian-Id`/equestrian UUID отсутствуют

#### Scenario: Email boundary
- **WHEN** notification-service преобразует событие в email command
- **THEN** transport identity используется только для delivery/idempotency и не включается в subject/body
