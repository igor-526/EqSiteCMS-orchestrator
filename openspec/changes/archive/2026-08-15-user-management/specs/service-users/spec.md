## MODIFIED Requirements

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
