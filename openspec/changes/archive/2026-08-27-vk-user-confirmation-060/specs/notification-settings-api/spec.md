## ADDED Requirements

### Requirement: Eligibility VK-канала для события callback

Основной backend MUST добавить в `NOTIFICATION_ELIGIBILITY` комбинацию `("callback", "vk")` с требуемыми scopes `ADMIN` и `SUPERUSER`, идентичными комбинации `("callback", "email")`. `KNOWN_NOTIFICATION_CHANNELS` уже содержит `vk` и MUST NOT изменяться. Notification-service MUST NOT изменяться: его `NotificationSettingsService.get_settings` уже возвращает кортеж `callback/vk` для активных seed-записей события `callback` и канала `vk`.

#### Scenario: Eligible пользователь видит оба канала

- **WHEN** authenticated пользователь со scope `ADMIN` или `SUPERUSER` запрашивает `GET /api/notification-settings`
- **THEN** ответ MUST быть `200` и содержать ровно две записи для события `callback`: с `channel_code="email"` и с `channel_code="vk"`

#### Scenario: Ineligible пользователь не видит VK-канал

- **WHEN** authenticated пользователь без `ADMIN` и `SUPERUSER` запрашивает каталог
- **THEN** ответ MUST быть `200` с пустым списком и MUST NOT раскрывать комбинацию `callback/vk`

#### Scenario: Независимость каналов

- **WHEN** eligible пользователь включает `callback/vk`
- **THEN** значение `enabled` для `callback/email` MUST остаться неизменным, и наоборот

#### Scenario: Доставка в VK вне scope этого change

- **WHEN** eligible пользователь включил `callback/vk` и произошло событие обратного звонка
- **THEN** уведомление в VK MUST NOT отправляться, поскольку публикация `commands.notification.vk.send` реализуется отдельной задачей; включение настройки MUST NOT приводить к ошибке обработки события

#### Scenario: Notification-service не изменяется

- **WHEN** reviewer сверяет `services/notification-service` до и после change
- **THEN** seed-данные, репозитории, приватные routes и `NotificationSettingsService` MUST остаться неизменными

## MODIFIED Requirements

### Requirement: Owner-scoped каталог настроек уведомлений

Основной backend MUST предоставлять `GET /api/notification-settings`, выводить owner из authenticated session и возвращать только активные event/channel комбинации, доступные scopes пользователя, вместе с `enabled`.

#### Scenario: Eligible пользователь читает настройки

- **WHEN** authenticated пользователь со scope `ADMIN` или `SUPERUSER` запрашивает настройки
- **THEN** ответ MUST быть `200` и содержать `callback/email` и `callback/vk` с фактическим owner state каждой комбинации

#### Scenario: Пользователь без eligible scope

- **WHEN** authenticated пользователь без `ADMIN` и `SUPERUSER` запрашивает настройки
- **THEN** ответ MUST быть `200` с пустым списком и MUST NOT раскрывать недоступное событие

#### Scenario: Неизвестная комбинация от downstream

- **WHEN** приватный notification-service возвращает комбинацию с `event_code` вне `KNOWN_NOTIFICATION_EVENTS` либо `channel_code` вне `KNOWN_NOTIFICATION_CHANNELS`
- **THEN** backend MUST вернуть `502` и MUST NOT отдавать неизвестную комбинацию клиенту

### Requirement: Server-confirmed изменение настройки

Основной backend MUST предоставлять `PATCH /api/notification-settings/{event_code}/{channel_code}` с `{enabled: boolean}`, применять owner из session и изменять настройку только для eligible комбинации события и канала.

#### Scenario: Enable eligible setting

- **WHEN** eligible owner отправляет `enabled=true` для `callback/email` либо `callback/vk`
- **THEN** backend MUST идемпотентно сохранить единственную настройку указанной комбинации и вернуть `200` с `enabled=true`

#### Scenario: Disable eligible setting

- **WHEN** eligible owner отправляет `enabled=false` для `callback/email` либо `callback/vk`
- **THEN** backend MUST идемпотентно удалить/деактивировать настройку указанной комбинации и вернуть `200` с `enabled=false`

#### Scenario: Ineligible write

- **WHEN** authenticated пользователь без требуемого scope изменяет `callback/email` или `callback/vk`
- **THEN** backend MUST вернуть `403` до internal write

#### Scenario: Unknown combination

- **WHEN** event или channel неизвестен либо неактивен, включая канал `sms`, отсутствующий в `NOTIFICATION_ELIGIBILITY`
- **THEN** backend MUST вернуть `404` и не менять данные

#### Scenario: Изменение одного канала не затрагивает другой

- **WHEN** eligible owner меняет `enabled` для `callback/vk`
- **THEN** сохранённое значение для `callback/email` MUST остаться прежним

### Requirement: Access matrix notification settings

Система MUST соблюдать следующую матрицу; protected GET являются исключениями из Public Read, потому что раскрывают персональные предпочтения и не предназначены consumer sites.

| method | path | access class | roles | expected without auth | expected with auth | foreign-resource tests |
|---|---|---|---|---|---|---|
| GET | `/api/notification-settings` | Protected Sensitive Read | authenticated; catalog filtered by scopes | `401` | eligible `200` list с `callback/email` и `callback/vk`; ineligible `200 []` | owner derived from session; request cannot select foreign ID |
| PATCH | `/api/notification-settings/{event_code}/{channel_code}` | Protected Write | authenticated + event eligibility (`ADMIN`/`SUPERUSER` for `callback/email` and `callback/vk`) | `401` | eligible `200`; ineligible `403`; unknown `404` | owner derived from session; verify no foreign mutation |

#### Scenario: Anonymous behavior

- **WHEN** anonymous caller обращается к любому browser-facing settings endpoint
- **THEN** backend MUST вернуть `401` без private-service call

#### Scenario: Authenticated owner isolation

- **WHEN** authenticated caller читает или меняет настройку любого канала
- **THEN** backend MUST использовать только `actor.id`, а public request schema MUST NOT принимать foreign `user_id`

#### Scenario: VK-канал подчиняется той же матрице

- **WHEN** anonymous и authenticated вызывающие обращаются к `PATCH /api/notification-settings/callback/vk`
- **THEN** результаты MUST совпадать со строкой матрицы: `401` без авторизации, `200` для eligible, `403` для ineligible

### Requirement: Backend test evidence

Backend-фича MUST иметь не менее 30 разнообразных unit и 30 live smoke сценариев, включая anonymous/authenticated, eligible/ineligible scopes, idempotency, concurrency, downstream failures, real PostgreSQL и foreign-resource isolation. Покрытие MUST включать канал `vk` наравне с `email`, а также независимость двух каналов одного события.

#### Scenario: Unit evidence

- **WHEN** backend deliverable передан в Quality Gate
- **THEN** не менее 30 unit scenarios MUST проходить и иметь трассировку к access matrix, включая сценарии для `callback/vk`

#### Scenario: Live smoke evidence

- **WHEN** core stack поднят для проверки
- **THEN** не менее 30 smoke scenarios MUST быть выполнены smoke skill на PostgreSQL, параметры которой повторно получены через `docker inspect`, без pytest smoke scripts; callback delivery MUST подтверждаться коррелированным прохождением до acceptance email-service без проверки inbox

#### Scenario: VK smoke evidence

- **WHEN** выполняются smoke-сценарии каталога настроек
- **THEN** они MUST подтверждать наличие `callback/vk` в ответе eligible пользователя и успешное независимое переключение обоих каналов
