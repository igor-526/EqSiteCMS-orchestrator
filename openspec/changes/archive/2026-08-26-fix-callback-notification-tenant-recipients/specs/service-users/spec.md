## ADDED Requirements

### Requirement: Callback recipient lookup MUST combine tenant and role filters
Notification Service MUST вызывать существующий `GET /api/service/users` для callback routing с `equestrian_ids=[payload.equestrian_id]` и `role=[ADMIN,SUPERUSER]` в одном запросе. Backend Core MUST применять AND между группами фильтров и MUST NOT менять access boundary или автоматически расширять пустой результат до нефильтрованного списка.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/service/users?equestrian_ids=<uuid>&role=ADMIN&role=SUPERUSER` | Service Read (protected GET exception) | microservice с valid `X-Service-Key`; внутри выборки ADMIN или SUPERUSER указанной конюшни | `401`; cookie или `X-Equestrian-Service-Key` без service key также `401` | valid service key: `200`, только active/non-blocked users tenant с допустимой ролью; invalid key: `401` |

Исключение защищённого `GET` сохраняется без изменений: endpoint возвращает приватные пользовательские данные только доверенным микросервисам и потому не является Public Read.

#### Scenario: Valid service request is tenant- and role-scoped
- **WHEN** Notification Service отправляет запрос с valid `X-Service-Key`, tenant UUID события и обеими допустимыми ролями
- **THEN** Backend Core возвращает `200` и только active/non-blocked пользователей этой конюшни с ADMIN или SUPERUSER

#### Scenario: Anonymous and cookie-only requests are rejected
- **WHEN** запрос выполнен без `X-Service-Key`, только с cookie или только с tenant selector
- **THEN** Backend Core возвращает `401` и не раскрывает пользователей

#### Scenario: Invalid service key is rejected
- **WHEN** запрос содержит invalid `X-Service-Key` вместе с валидными tenant/role filters
- **THEN** Backend Core возвращает `401` и не раскрывает пользователей

#### Scenario: Foreign tenant users are absent
- **WHEN** tenant A и tenant B имеют пользователей с ADMIN/SUPERUSER, а запрос фильтрует tenant A
- **THEN** ответ содержит только пользователей tenant A и корректный `total`

#### Scenario: Empty scoped result stays empty
- **WHEN** указанная конюшня не имеет active/non-blocked ADMIN/SUPERUSER
- **THEN** endpoint возвращает `200`, `items=[]`, `total=0`, а Notification Service не выполняет fallback без tenant filter

