## ADDED Requirements

### Requirement: Owner-scoped каталог настроек уведомлений
Основной backend MUST предоставлять `GET /api/notification-settings`, выводить owner из authenticated session и возвращать только активные event/channel комбинации, доступные scopes пользователя, вместе с `enabled`.

#### Scenario: Eligible пользователь читает настройки
- **WHEN** authenticated пользователь со scope `ADMIN` или `SUPERUSER` запрашивает настройки
- **THEN** ответ MUST быть `200` и содержать `callback/email` с фактическим owner state

#### Scenario: Пользователь без eligible scope
- **WHEN** authenticated пользователь без `ADMIN` и `SUPERUSER` запрашивает настройки
- **THEN** ответ MUST быть `200` с пустым списком и MUST NOT раскрывать недоступное событие

### Requirement: Server-confirmed изменение настройки
Основной backend MUST предоставлять `PATCH /api/notification-settings/{event_code}/{channel_code}` с `{enabled: boolean}`, применять owner из session и изменять настройку только для eligible события.

#### Scenario: Enable eligible setting
- **WHEN** eligible owner отправляет `enabled=true` для `callback/email`
- **THEN** backend MUST идемпотентно сохранить единственную настройку и вернуть `200` с `enabled=true`

#### Scenario: Disable eligible setting
- **WHEN** eligible owner отправляет `enabled=false` для `callback/email`
- **THEN** backend MUST идемпотентно удалить/деактивировать настройку и вернуть `200` с `enabled=false`

#### Scenario: Ineligible write
- **WHEN** authenticated пользователь без требуемого scope изменяет `callback/email`
- **THEN** backend MUST вернуть `403` до internal write

#### Scenario: Unknown combination
- **WHEN** event или channel неизвестен либо неактивен
- **THEN** backend MUST вернуть `404` и не менять данные

### Requirement: Private notification-service API
Notification-service MUST владеть сохранением настроек и предоставить доступные только во внутренней сети routes `GET /internal/notification-settings/{user_id}` и `PUT /internal/notification-settings/{user_id}/{event_code}/{channel_code}`; основной backend MUST быть единственным browser-facing gateway.

#### Scenario: Internal read
- **WHEN** main backend запрашивает настройки owner
- **THEN** notification-service MUST вернуть активные комбинации и сохранённый enabled state без чужих записей

#### Scenario: Internal idempotent write
- **WHEN** main backend повторяет одинаковый enable или disable
- **THEN** notification-service MUST вернуть тот же state без duplicate row и без изменения чужих tuples

### Requirement: Access matrix notification settings
Система MUST соблюдать следующую матрицу; protected GET являются исключениями из Public Read, потому что раскрывают персональные предпочтения и не предназначены consumer sites.

| method | path | access class | roles | expected without auth | expected with auth | foreign-resource tests |
|---|---|---|---|---|---|---|
| GET | `/api/notification-settings` | Protected Sensitive Read | authenticated; catalog filtered by scopes | `401` | eligible `200` list; ineligible `200 []` | owner derived from session; request cannot select foreign ID |
| PATCH | `/api/notification-settings/{event_code}/{channel_code}` | Protected Write | authenticated + event eligibility (`ADMIN`/`SUPERUSER` for callback) | `401` | eligible `200`; ineligible `403`; unknown `404` | owner derived from session; verify no foreign mutation |

#### Scenario: Anonymous behavior
- **WHEN** anonymous caller обращается к любому browser-facing settings endpoint
- **THEN** backend MUST вернуть `401` без private-service call

#### Scenario: Authenticated owner isolation
- **WHEN** authenticated caller читает или меняет настройку
- **THEN** backend MUST использовать только `actor.id`, а public request schema MUST NOT принимать foreign `user_id`

### Requirement: Backend test evidence
Backend-фича MUST иметь не менее 30 разнообразных unit и 30 live smoke сценариев, включая anonymous/authenticated, eligible/ineligible scopes, idempotency, concurrency, downstream failures, real PostgreSQL и foreign-resource isolation.

#### Scenario: Unit evidence
- **WHEN** backend deliverable передан в Quality Gate
- **THEN** не менее 30 unit scenarios MUST проходить и иметь трассировку к access matrix

#### Scenario: Live smoke evidence
- **WHEN** core stack поднят для проверки
- **THEN** не менее 30 smoke scenarios MUST быть выполнены smoke skill на PostgreSQL, параметры которой повторно получены через `docker inspect`, без pytest smoke scripts; callback delivery MUST подтверждаться коррелированным прохождением до acceptance email-service без проверки inbox
