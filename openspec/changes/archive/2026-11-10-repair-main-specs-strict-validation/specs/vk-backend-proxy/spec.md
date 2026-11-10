## MODIFIED Requirements

### Requirement: Client и schemas для vk-service

Основной backend MUST предоставить клиент и протокол приватного `vk-service`, а также схемы `VkBindingResponse`, `VkBotInfoResponse` и `VkIssueConfirmationResponse` с путями, полями и типами из сценария контракта. Публичные request-схемы owner-scoped маршрутов MUST NOT принимать `user_id` от вызывающего.

#### Scenario: Схема VkBindingResponse

- **WHEN** определена схема `VkBindingResponse`
- **THEN** она MUST содержать `id`, `user_id`, `vk_peer_id`, `state`, `vk_screen_name`, `vk_display_name`

#### Scenario: Схема VkIssueConfirmationResponse

- **WHEN** определена схема `VkIssueConfirmationResponse`
- **THEN** она MUST содержать `code`, `expires_at`, `state`, `link_command`, `dialog_url`

#### Scenario: Public request не принимает foreign user_id

- **WHEN** reviewer читает схемы browser-facing запросов VK-прокси
- **THEN** ни одна из них MUST NOT содержать поле `user_id`

#### Scenario: Неоднозначный ответ downstream

- **WHEN** `vk-service` возвращает для запроса одного владельца более одной записи либо запись с чужим `user_id`
- **THEN** клиент MUST поднять ошибку валидации, а backend MUST вернуть `502`

#### Scenario: Пути клиента и полный контракт схем VK

- **WHEN** проверяется полный исходный контракт требования «Client и schemas для vk-service»
- **THEN** Основной backend MUST создать `src/clients/vk_service/` с `client.py`, `schemas.py` и протоколом `src/core/protocols/vk_service.py`. Схемы MUST включать `VkBindingResponse` (`id`, `user_id`, `vk_peer_id: int | None`, `state`, `vk_screen_name: str | None`, `vk_display_name: str | None`), `VkBotInfoResponse` (`group_id`, `group_screen_name`, `link_command`, `group_url`, `dialog_url`), `VkIssueConfirmationResponse` (`code`, `expires_at`, `state`, `link_command`, `dialog_url`). Публичные request-схемы MUST NOT принимать `user_id` от вызывающего для owner-scoped маршрутов.

### Requirement: Access matrix VK proxy

Backend MUST соблюдать матрицу VK proxy из сценария контракта: защищённое owner-only чтение привязки, Public Read данных бота и Protected Write без privileged override. Методы, пути, роли, статусы, причины исключений и отсутствие публичных write-исключений определены в этом сценарии.

#### Scenario: Foreign denial предшествует lookup

- **WHEN** authenticated вызывающий передаёт чужой `user_id` в owner-only маршрут
- **THEN** backend MUST вернуть `403`, MUST NOT вызывать downstream и MUST NOT раскрывать наличие привязки

#### Scenario: Anonymous поведение всех protected маршрутов

- **WHEN** anonymous вызывающий обращается к `/api/vks/me`, `/api/vks/issue-confirmation` или `DELETE /api/vks/{user_id}`
- **THEN** каждый маршрут MUST вернуть `401` без downstream-вызова

#### Scenario: Scope не даёт override

- **WHEN** пользователь со scope `SUPERUSER` пытается отвязать VK другого пользователя
- **THEN** backend MUST вернуть `403`

#### Scenario: Матрица и причины исключений VK proxy

- **WHEN** проверяется полный исходный контракт требования «Access matrix VK proxy»
- **THEN** Backend MUST реализовать следующую матрицу.

| method | path | access class | roles | tenant selector | owner rule | expected without auth | expected with auth | foreign resource | validation status | tests |
|---|---|---|---|---|---|---|---|---|---|---|
| GET | `/api/vks/me` | Protected Sensitive Read | authenticated owner | отсутствует | owner выводится из session | `401` | `200` или `404` | запрос не может выбрать чужой id | N/A | anonymous/owner/missing/downstream invalid/timeout |
| GET | `/api/vks/bot-info` | Public Read | none | N/A | N/A | `200` | `200` | N/A | downstream `503` → `503` | anonymous/authenticated/неполная конфигурация |
| POST | `/api/vks/issue-confirmation` | Protected Write | authenticated owner | отсутствует | `user_id = actor.id`, override отсутствует | `401` | `201`; `ACTIVE`/`BLOCKED` → `409` | foreign `user_id` в теле игнорируется либо `400`; downstream не получает чужой id | malformed body `400` | anonymous/owner/повтор/`409`/foreign field/malformed |
| DELETE | `/api/vks/{user_id}` | Protected Write | authenticated owner | отсутствует | exact `actor.id == path.user_id`, override отсутствует | `401` | `204` (идемпотентно) | `403` до lookup и downstream | malformed UUID `400` | anonymous/owner/foreign/повтор/malformed |

`GET /api/vks/me` — исключение из Public Read: привязка VK и её состояние являются персональными данными и не нужны consumer-сайтам; исключение симметрично уже утверждённому `GET /api/emails/me`. `GET /api/vks/bot-info` остаётся Public Read по дефолту, поскольку содержит только публичные атрибуты VK-группы. Публичных write-исключений VK-контур MUST NOT иметь: в отличие от email, где `PATCH /api/emails/confirm` нужен для перехода по ссылке из письма, подтверждение VK выполняется bot runtime по сообщению из VK.
