# Service Users Endpoint

## Purpose

Спецификация сервисного эндпоинта `GET /api/service/users` для получения пагинированного списка пользователей с фильтрацией по конюшням и ролям.

## Requirements

### Requirement: Получение списка пользователей для сервисов
`GET /api/service/users` SHALL возвращать пагинированный список пользователей платформы с возможностью фильтрации по конюшням и ролям. Endpoint доступен ТОЛЬКО по `X-Service-Key`. MUST исключать пользователей с `is_deleted=true` и `is_blocked=true` из результатов.

#### Scenario: Получение всех пользователей без фильтров
- **WHEN** микросервис вызывает `GET /api/service/users` с валидным `X-Service-Key`
- **THEN** backend возвращает `200` с пагинированным списком активных (не удалённых, не заблокированных) пользователей (default limit=100)

#### Scenario: Получение пользователей по ID конюшни
- **WHEN** микросервис вызывает `GET /api/service/users?equestrian_ids=<uuid1>&equestrian_ids=<uuid2>` с валидным `X-Service-Key`
- **THEN** backend возвращает `200` с активными пользователями, принадлежащими конюшням uuid1 ИЛИ uuid2

#### Scenario: Получение пользователей по service_key конюшни
- **WHEN** микросервис вызывает `GET /api/service/users?equestrian_service_keys=<key1>&equestrian_service_keys=<key2>` с валидным `X-Service-Key`
- **THEN** backend возвращает `200` с активными пользователями, принадлежащими конюшням с service_key key1 ИЛИ key2

#### Scenario: Получение пользователей по роли
- **WHEN** микросервис вызывает `GET /api/service/users?role=ADMIN_USERS&role=DEVELOPER` с валидным `X-Service-Key`
- **THEN** backend возвращает `200` с активными пользователями, имеющими scope `ADMIN_USERS` ИЛИ `DEVELOPER`

#### Scenario: Комбинация фильтров (AND логика)
- **WHEN** микросервис вызывает `GET /api/service/users?equestrian_ids=<uuid>&role=ADMIN_USERS` с валидным `X-Service-Key`
- **THEN** backend возвращает `200` с активными пользователями, которые принадлежат конюшне UUID И ИМЕЮТ scope `ADMIN_USERS`

#### Scenario: Пустой результат
- **WHEN** микросервис вызывает `GET /api/service/users?equestrian_ids=<несуществующий-uuid>` с валидным `X-Service-Key`
- **THEN** backend возвращает `200` с пустым списком `items` и `total=0`

#### Scenario: Пользователь не найден по роли
- **WHEN** микросервис вызывает `GET /api/service/users?role=NEXISTING_ROLE` с валидным `X-Service-Key`
- **THEN** backend возвращает `200` с пустым списком `items` и `total=0`

### Requirement: Формат ответа GET /api/service/users
Ответ MUST содержать полный DTO пользователя в формате `UserOutDto` (id, equestrian_id, username, first_name, last_name, middle_name, created_at, updated_at, scopes). Ответ MUST соответствовать формату `PaginatedEntities[UserOutDto]` с полями `items` и `total`.

#### Scenario: Формат успешного ответа
- **WHEN** запрос `GET /api/service/users` успешен
- **THEN** ответ содержит JSON: `{"items": [UserOutDto, ...], "total": <int>}`

### Requirement: Потенциал расширения сервисных users-эндпоинтов
Endpoint MUST быть спроектирован так, чтобы добавление новых фильтров не ломало существующую логику. Каждый новый фильтр является необязательным query-параметром.

#### Scenario: Добавление нового фильтра
- **WHEN** разработчик добавляет новый необязательный query-параметр фильтрации
- **THEN** существующие вызовы без этого параметра продолжают работать как прежде

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
