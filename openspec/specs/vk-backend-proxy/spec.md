# vk-backend-proxy Specification

## Purpose
Проксирование VK-эндпоинтов через основной backend с owner-only boundary, access matrix, ENV `VK_SERVICE_URL` и client schemas приватного `vk-service`.

## Requirements

### Requirement: ENV — адрес vk-service в backend

Основной backend MUST получить ENV `VK_SERVICE_URL` для адресации приватного `vk-service`. Каноническое значение для локальной инфраструктуры — `http://eqsitecms-vk-service:8000`. Переменная MUST присутствовать в `services/backend/.env.example` и быть задокументирована в `services/backend/README.md`.

#### Scenario: Конфигурация адреса

- **WHEN** backend стартует
- **THEN** он MUST использовать `VK_SERVICE_URL` для формирования запросов к `vk-service`

#### Scenario: Переменная задокументирована

- **WHEN** reviewer читает `.env.example` и README backend
- **THEN** `VK_SERVICE_URL` MUST присутствовать с каноническим значением и пояснением

### Requirement: Client и schemas для vk-service

Основной backend MUST создать `src/clients/vk_service/` с `client.py`, `schemas.py` и протоколом `src/core/protocols/vk_service.py`. Схемы MUST включать `VkBindingResponse` (`id`, `user_id`, `vk_peer_id: int | None`, `state`, `vk_screen_name: str | None`, `vk_display_name: str | None`), `VkBotInfoResponse` (`group_id`, `group_screen_name`, `link_command`, `group_url`, `dialog_url`), `VkIssueConfirmationResponse` (`code`, `expires_at`, `state`, `link_command`, `dialog_url`). Публичные request-схемы MUST NOT принимать `user_id` от вызывающего для owner-scoped маршрутов.

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

### Requirement: Защищённое чтение собственной привязки VK

Backend MUST проксировать `GET /api/vks/me` в приватный `vk-service` только для authenticated пользователя, выводить `user_id` из session и возвращать только его non-deleted привязку. Запрос MUST NOT принимать `user_id` от вызывающего.

#### Scenario: Привязка найдена

- **WHEN** authenticated owner имеет non-deleted привязку
- **THEN** backend MUST вернуть `200` с `VkBindingResponse`, включая `state`

#### Scenario: Привязка отсутствует

- **WHEN** authenticated owner не имеет non-deleted привязки
- **THEN** backend MUST вернуть `404`

#### Scenario: Anonymous read

- **WHEN** anonymous вызывающий запрашивает `/api/vks/me`
- **THEN** backend MUST вернуть `401` без downstream-вызова

#### Scenario: Downstream недоступен

- **WHEN** `vk-service` не отвечает или возвращает невалидное тело
- **THEN** backend MUST вернуть `502` без раскрытия внутреннего адреса сервиса

### Requirement: Публичное чтение данных бота

Backend MUST проксировать `GET /api/vks/bot-info` как Public Read: endpoint возвращает только публичные атрибуты VK-группы и MUST быть доступен без авторизации.

#### Scenario: Anonymous доступ

- **WHEN** anonymous вызывающий запрашивает `/api/vks/bot-info`
- **THEN** backend MUST вернуть `200` с публичными данными группы

#### Scenario: Authenticated доступ

- **WHEN** authenticated пользователь запрашивает тот же endpoint
- **THEN** ответ MUST быть идентичным anonymous-ответу

#### Scenario: Конфигурация VK не завершена

- **WHEN** `vk-service` возвращает `503` из-за незаполненных переменных группы
- **THEN** backend MUST вернуть `503` с понятным сообщением

### Requirement: Проксирование выдачи контрольной строки

Backend MUST предоставлять `POST /api/vks/issue-confirmation` без тела запроса либо с пустым телом, выводить владельца из session и вызывать `POST /vks/issue-confirmation` приватного сервиса с `user_id = actor.id`. Role/scope MUST NOT давать возможность выдать код чужому пользователю.

#### Scenario: Успешная выдача владельцу

- **WHEN** authenticated owner без активной привязки запрашивает выдачу
- **THEN** backend MUST вернуть `201` с `code`, `expires_at`, `state`, `link_command`, `dialog_url`

#### Scenario: Повторная выдача

- **WHEN** authenticated owner повторно запрашивает выдачу, имея неиспользованный код
- **THEN** backend MUST вернуть `201` с новым кодом, а предыдущий код MUST перестать действовать

#### Scenario: Привязка уже активна или бот заблокирован

- **WHEN** downstream возвращает `409` для состояния `ACTIVE` или `BLOCKED`
- **THEN** backend MUST вернуть `409` с доменным сообщением

#### Scenario: Anonymous выдача

- **WHEN** anonymous вызывающий обращается к `/api/vks/issue-confirmation`
- **THEN** backend MUST вернуть `401` без downstream-вызова

#### Scenario: Попытка передать foreign user_id

- **WHEN** authenticated вызывающий добавляет в тело запроса `user_id` другого пользователя
- **THEN** backend MUST игнорировать это поле и использовать `actor.id`, либо вернуть `400`; downstream MUST NOT получить чужой `user_id`

#### Scenario: Malformed тело

- **WHEN** тело запроса не является валидным JSON
- **THEN** backend MUST вернуть `400`, а не framework `422`

### Requirement: Проксирование отвязки VK

Backend MUST проксировать `DELETE /api/vks/{user_id}` только для authenticated owner: `actor.id` MUST точно совпадать с path `user_id`, privileged override MUST NOT существовать. Отказ по чужому ресурсу MUST предшествовать любому downstream-вызову и lookup.

#### Scenario: Owner delete

- **WHEN** authenticated owner отвязывает свою привязку
- **THEN** backend MUST вернуть `204`

#### Scenario: Идемпотентная отвязка

- **WHEN** authenticated owner повторно отвязывает уже отвязанный VK
- **THEN** backend MUST вернуть `204` без ошибки

#### Scenario: Anonymous delete

- **WHEN** anonymous вызывающий обращается к `DELETE /api/vks/{user_id}`
- **THEN** backend MUST вернуть `401` без downstream-вызова

#### Scenario: Foreign delete

- **WHEN** authenticated вызывающий передаёт `user_id` другого пользователя, в том числе имея scope `ADMIN` или `SUPERUSER`
- **THEN** backend MUST вернуть `403` до lookup и downstream-вызова и MUST NOT раскрывать наличие чужой привязки

#### Scenario: Malformed UUID

- **WHEN** path-параметр не является UUID
- **THEN** backend MUST вернуть `400`, а не framework `422`

### Requirement: Отсутствие peer-service credential

Downstream-вызовы backend к `vk-service` MUST выполняться без peer-service credential, поскольку сетевая изоляция приватного сервиса подтверждена. Заголовок `X-Service-Key` MUST NOT добавляться к запросам в `vk-service`.

#### Scenario: Запросы без credential

- **WHEN** reviewer читает `clients/vk_service/client.py`
- **THEN** он MUST NOT содержать `X-Service-Key` и любых иных peer-credential заголовков

#### Scenario: Изоляция подтверждена

- **WHEN** выполняется запрос к `vk-service` с хоста вне `eqsitecms_network`
- **THEN** соединение MUST NOT устанавливаться

### Requirement: Access matrix VK proxy

Backend MUST реализовать следующую матрицу.

| method | path | access class | roles | tenant selector | owner rule | expected without auth | expected with auth | foreign resource | validation status | tests |
|---|---|---|---|---|---|---|---|---|---|---|
| GET | `/api/vks/me` | Protected Sensitive Read | authenticated owner | отсутствует | owner выводится из session | `401` | `200` или `404` | запрос не может выбрать чужой id | N/A | anonymous/owner/missing/downstream invalid/timeout |
| GET | `/api/vks/bot-info` | Public Read | none | N/A | N/A | `200` | `200` | N/A | downstream `503` → `503` | anonymous/authenticated/неполная конфигурация |
| POST | `/api/vks/issue-confirmation` | Protected Write | authenticated owner | отсутствует | `user_id = actor.id`, override отсутствует | `401` | `201`; `ACTIVE`/`BLOCKED` → `409` | foreign `user_id` в теле игнорируется либо `400`; downstream не получает чужой id | malformed body `400` | anonymous/owner/повтор/`409`/foreign field/malformed |
| DELETE | `/api/vks/{user_id}` | Protected Write | authenticated owner | отсутствует | exact `actor.id == path.user_id`, override отсутствует | `401` | `204` (идемпотентно) | `403` до lookup и downstream | malformed UUID `400` | anonymous/owner/foreign/повтор/malformed |

`GET /api/vks/me` — исключение из Public Read: привязка VK и её состояние являются персональными данными и не нужны consumer-сайтам; исключение симметрично уже утверждённому `GET /api/emails/me`. `GET /api/vks/bot-info` остаётся Public Read по дефолту, поскольку содержит только публичные атрибуты VK-группы. Публичных write-исключений VK-контур MUST NOT иметь: в отличие от email, где `PATCH /api/emails/confirm` нужен для перехода по ссылке из письма, подтверждение VK выполняется bot runtime по сообщению из VK.

#### Scenario: Foreign denial предшествует lookup

- **WHEN** authenticated вызывающий передаёт чужой `user_id` в owner-only маршрут
- **THEN** backend MUST вернуть `403`, MUST NOT вызывать downstream и MUST NOT раскрывать наличие привязки

#### Scenario: Anonymous поведение всех protected маршрутов

- **WHEN** anonymous вызывающий обращается к `/api/vks/me`, `/api/vks/issue-confirmation` или `DELETE /api/vks/{user_id}`
- **THEN** каждый маршрут MUST вернуть `401` без downstream-вызова

#### Scenario: Scope не даёт override

- **WHEN** пользователь со scope `SUPERUSER` пытается отвязать VK другого пользователя
- **THEN** backend MUST вернуть `403`

### Requirement: Тестовое покрытие VK proxy

Backend MUST покрыть VK-прокси unit-тестами API и client-boundary тестами по образцу email-контура: `tests/unit/api/test_vk_proxy_api.py` и `tests/unit/api/test_vk_client_boundary.py`. Покрытие MUST включать anonymous, owner, foreign, отсутствие ресурса, идемпотентность, downstream `409`/`503`/timeout/невалидное тело и отсутствие peer credential.

#### Scenario: Unit evidence

- **WHEN** deliverable backend передаётся в Quality Gate
- **THEN** тесты MUST существовать для каждой строки access matrix и трассироваться к ней

#### Scenario: Client boundary evidence

- **WHEN** выполняются client-boundary тесты
- **THEN** они MUST подтверждать формируемые URL, отсутствие `X-Service-Key` и отказ на неоднозначный ответ downstream
