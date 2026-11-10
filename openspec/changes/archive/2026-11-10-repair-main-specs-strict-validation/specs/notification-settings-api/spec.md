## MODIFIED Requirements

### Requirement: Access matrix notification settings
Система MUST соблюдать матрицу доступа notification settings, приведённую в сценарии «Полная матрица доступа настроек»; protected GET являются исключением из Public Read из-за персональных предпочтений и отсутствия назначения для consumer sites.

#### Scenario: Anonymous behavior

- **WHEN** anonymous caller обращается к любому browser-facing settings endpoint
- **THEN** backend MUST вернуть `401` без private-service call

#### Scenario: Authenticated owner isolation

- **WHEN** authenticated caller читает или меняет настройку любого канала
- **THEN** backend MUST использовать только `actor.id`, а public request schema MUST NOT принимать foreign `user_id`

#### Scenario: VK-канал подчиняется той же матрице

- **WHEN** anonymous и authenticated вызывающие обращаются к `PATCH /api/notification-settings/callback/vk`
- **THEN** результаты MUST совпадать со строкой матрицы: `401` без авторизации, `200` для eligible, `403` для ineligible

#### Scenario: Полная матрица доступа настроек
- **WHEN** проверяется доступ к browser-facing settings endpoints
- **THEN** Система MUST соблюдать следующую матрицу; protected GET являются исключениями из Public Read, потому что раскрывают персональные предпочтения и не предназначены consumer sites.

| method | path | access class | roles | expected without auth | expected with auth | foreign-resource tests |
|---|---|---|---|---|---|---|
| GET | `/api/notification-settings` | Protected Sensitive Read | authenticated; catalog filtered by scopes | `401` | eligible `200` list с `callback/email` и `callback/vk`; ineligible `200 []` | owner derived from session; request cannot select foreign ID |
| PATCH | `/api/notification-settings/{event_code}/{channel_code}` | Protected Write | authenticated + event eligibility (`ADMIN`/`SUPERUSER` for `callback/email` and `callback/vk`) | `401` | eligible `200`; ineligible `403`; unknown `404` | owner derived from session; verify no foreign mutation |
