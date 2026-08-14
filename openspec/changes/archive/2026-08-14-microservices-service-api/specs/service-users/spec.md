## ADDED Requirements

### Requirement: Получение списка пользователей для сервисов
`GET /api/service/users` SHALL возвращать пагинированный список пользователей платформы с возможностью фильтрации по конюшням и ролям. Endpoint доступен ТОЛЬКО по `X-Service-Key`.

#### Scenario: Получение всех пользователей без фильтров
- **WHEN** микросервис вызывает `GET /api/service/users` с валидным `X-Service-Key`
- **THEN** backend возвращает `200` с пагинированным списком пользователей (default limit=100)

#### Scenario: Получение пользователей по ID конюшни
- **WHEN** микросервис вызывает `GET /api/service/users?equestrian_ids=<uuid1>&equestrian_ids=<uuid2>` с валидным `X-Service-Key`
- **THEN** backend возвращает `200` с пользователями, принадлежащими конюшням uuid1 ИЛИ uuid2

#### Scenario: Получение пользователей по service_key конюшни
- **WHEN** микросервис вызывает `GET /api/service/users?equestrian_service_keys=<key1>&equestrian_service_keys=<key2>` с валидным `X-Service-Key`
- **THEN** backend возвращает `200` с пользователями, принадлежащими конюшням с service_key key1 ИЛИ key2

#### Scenario: Получение пользователей по роли
- **WHEN** микросервис вызывает `GET /api/service/users?role=ADMIN_USERS&role=DEVELOPER` с валидным `X-Service-Key`
- **THEN** backend возвращает `200` с пользователями, имеющими scope `ADMIN_USERS` ИЛИ `DEVELOPER`

#### Scenario: Комбинация фильтров (AND логика)
- **WHEN** микросервис вызывает `GET /api/service/users?equestrian_ids=<uuid>&role=ADMIN_USERS` с валидным `X-Service-Key`
- **THEN** backend возвращает `200` с пользователями, которые принадлежат конюшне UUID И ИМЕЮТ scope `ADMIN_USERS`

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
