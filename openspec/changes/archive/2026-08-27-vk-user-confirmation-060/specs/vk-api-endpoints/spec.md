## ADDED Requirements

### Requirement: Роутер VK и его подключение

`vk-service` MUST предоставлять роутер `src/api/endpoints/vks.py` с префиксом `/vks`, подключаемый в `src/main.py`, и зависимости в `src/api/dependencies.py`, собирающие доменные сервисы из репозиториев и сессии. Схемы запросов и ответов MUST находиться в `src/api/schemas/vk.py`. Endpoint `GET /health` MUST сохраниться без изменений. Endpoints `/emails*` MUST продолжать отсутствовать и возвращать `404`.

#### Scenario: Роутер подключён

- **WHEN** приложение `vk-service` поднято
- **THEN** маршруты с префиксом `/vks` MUST присутствовать в OpenAPI-схеме, а `GET /health` MUST возвращать `200` и `{"status": "ok"}`

#### Scenario: Email-поверхность отсутствует

- **WHEN** выполняется запрос `GET /emails` к `vk-service`
- **THEN** ответ MUST быть `404`

### Requirement: GET /vks — массовое получение привязок

`vk-service` MUST реализовать `GET /vks` с обязательным query-параметром `user_ids` (список UUID через запятую) и опциональным `state`. Ответ MUST быть массивом объектов `{id, user_id, vk_peer_id, state, vk_screen_name, vk_display_name}`, содержащим только non-deleted записи.

#### Scenario: Получение привязок по user_ids

- **WHEN** выполняется `GET /vks?user_ids=uuid1,uuid2`
- **THEN** ответ MUST быть `200` с массивом non-deleted привязок указанных пользователей

#### Scenario: Фильтр по состоянию

- **WHEN** выполняется `GET /vks?user_ids=uuid1&state=ACTIVE`
- **THEN** ответ MUST содержать только записи со `state="ACTIVE"`

#### Scenario: Неизвестное состояние в фильтре

- **WHEN** выполняется `GET /vks?user_ids=uuid1&state=WRONG`
- **THEN** ответ MUST быть `400`

#### Scenario: Пустой результат

- **WHEN** ни у одного из `user_ids` нет non-deleted привязки
- **THEN** ответ MUST быть `200` с пустым массивом `[]`

#### Scenario: Некорректный UUID

- **WHEN** `user_ids` содержит значение, не являющееся UUID
- **THEN** ответ MUST быть `400`

#### Scenario: Access — Public Read внутри сети

- **WHEN** запрос выполняется без авторизации из `eqsitecms_network`
- **THEN** ответ MUST быть `200`, поскольку `vk-service` приватный и browser-facing доступ невозможен

### Requirement: GET /vks/bot-info — публичные данные бота

`vk-service` MUST реализовать `GET /vks/bot-info`, возвращающий `{group_id, group_screen_name, link_command, group_url, dialog_url}`, где `group_url` формируется как `https://vk.com/{group_screen_name}`, а `dialog_url` — как `https://vk.me/{group_screen_name}`. Endpoint MUST NOT возвращать групповой токен и MUST NOT содержать данных пользователей.

#### Scenario: Успешное получение данных бота

- **WHEN** выполняется `GET /vks/bot-info` при заданных `VK_GROUP_ID` и `VK_GROUP_SCREEN_NAME`
- **THEN** ответ MUST быть `200` с `group_id`, `group_screen_name`, `link_command`, `group_url`, `dialog_url`

#### Scenario: Токен не раскрывается

- **WHEN** reviewer читает тело ответа `GET /vks/bot-info`
- **THEN** `VK_GROUP_TOKEN` и любые его фрагменты MUST отсутствовать

#### Scenario: Группа не сконфигурирована

- **WHEN** `VK_GROUP_SCREEN_NAME` пуст
- **THEN** ответ MUST быть `503` с сообщением о незавершённой конфигурации VK

#### Scenario: Access — Public Read

- **WHEN** запрос выполняется без авторизации
- **THEN** ответ MUST быть `200`: данные группы публичны, исключение из дефолтной policy не требуется

### Requirement: POST /vks — служебное создание записи привязки

`vk-service` MUST реализовать `POST /vks`, принимающий `{user_id}` и создающий запись `user_vks` в состоянии `PENDING` без выдачи контрольной строки. Endpoint MUST быть идемпотентным по владельцу.

#### Scenario: Успешное создание

- **WHEN** выполняется `POST /vks` с `user_id`, у которого нет non-deleted записи
- **THEN** ответ MUST быть `201` с объектом привязки в состоянии `PENDING`

#### Scenario: Повторный вызов для того же владельца

- **WHEN** выполняется `POST /vks` для `user_id`, у которого уже есть non-deleted запись
- **THEN** ответ MUST быть `200` с существующей записью без создания второй строки

#### Scenario: Валидация обязательных полей

- **WHEN** тело запроса не содержит `user_id` или содержит некорректный UUID
- **THEN** ответ MUST быть `400`

#### Scenario: Access — Protected Write внутри сети

- **WHEN** запрос выполняется из `eqsitecms_network`
- **THEN** он MUST обрабатываться; endpoint MUST NOT проксироваться основным backend и MUST NOT быть доступен браузеру

### Requirement: POST /vks/issue-confirmation — выдача контрольной строки

`vk-service` MUST реализовать `POST /vks/issue-confirmation`, принимающий `{user_id}` и возвращающий `{code, expires_at, state, link_command, dialog_url}`. Endpoint MUST вызывать доменную операцию выдачи, инвалидирующую предыдущие коды.

#### Scenario: Успешная выдача

- **WHEN** выполняется `POST /vks/issue-confirmation` для пользователя без привязки либо в состоянии `PENDING`
- **THEN** ответ MUST быть `201` с новым `code`, `expires_at`, `state="PENDING"`, `link_command` и `dialog_url`

#### Scenario: Привязка уже активна

- **WHEN** у пользователя привязка в состоянии `ACTIVE`
- **THEN** ответ MUST быть `409` с пояснением, что VK уже привязан

#### Scenario: Бот заблокирован пользователем

- **WHEN** у пользователя привязка в состоянии `BLOCKED`
- **THEN** ответ MUST быть `409` с пояснением, что нужно разрешить сообщения от группы

#### Scenario: Предыдущий код инвалидирован

- **WHEN** у пользователя был non-used код и выполняется повторная выдача
- **THEN** ответ MUST быть `201`, а предыдущий код MUST перестать подходить для подтверждения

#### Scenario: Валидация тела

- **WHEN** тело запроса не содержит `user_id` или содержит некорректный UUID
- **THEN** ответ MUST быть `400`

#### Scenario: Access — Protected Write внутри сети

- **WHEN** запрос выполняется из `eqsitecms_network` основным backend
- **THEN** он MUST обрабатываться; owner-проверка выполняется основным backend, а `vk-service` доверяет переданному `user_id` в пределах приватной сети

### Requirement: DELETE /vks/{user_id} — отвязка

`vk-service` MUST реализовать `DELETE /vks/{user_id}`, выполняющий soft-delete привязки. Endpoint MUST быть идемпотентным и возвращать `204` во всех успешных случаях.

#### Scenario: Успешная отвязка

- **WHEN** выполняется `DELETE /vks/{uuid}` для существующей non-deleted привязки
- **THEN** ответ MUST быть `204`, запись MUST быть помечена deleted, а non-used коды MUST быть инвалидированы

#### Scenario: Идемпотентность

- **WHEN** выполняется `DELETE /vks/{uuid}` для уже удалённой или отсутствующей привязки
- **THEN** ответ MUST быть `204` без ошибки

#### Scenario: Некорректный UUID в пути

- **WHEN** выполняется `DELETE /vks/not-a-uuid`
- **THEN** ответ MUST быть `400`

#### Scenario: Уведомление пользователя в VK при отвязке

- **WHEN** отвязывается привязка в состоянии `ACTIVE`
- **THEN** MUST быть предпринята попытка отправить пользователю информационное сообщение в VK, а её неуспех MUST NOT влиять на код ответа `204`

#### Scenario: Отвязка заблокированной привязки не отправляет сообщение

- **WHEN** отвязывается привязка в состоянии `BLOCKED`
- **THEN** сообщение в VK MUST NOT отправляться, а ответ MUST быть `204`

### Requirement: Access matrix приватного VK API

`vk-service` MUST соблюдать следующую матрицу. Сервис приватный: доступ возможен только из `eqsitecms_network`, browser-facing gateway — исключительно основной backend, поэтому peer-service credential не используется (сетевая изоляция подтверждена в `vk-service-orchestration`).

| method | path | access class | roles | tenant selector | owner rule | expected without auth | expected with auth | foreign resource | validation status | tests |
|---|---|---|---|---|---|---|---|---|---|---|
| GET | `/health` | Public Read | none | N/A | N/A | `200` | `200` | N/A | N/A | anonymous |
| GET | `/vks` | Public Read (private network) | none | N/A | filter by `user_ids` | `200` | `200` | вызывающий обязан передавать только собственные id; owner-проверка на backend | некорректный UUID/`state` `400` | anonymous/список/фильтр/пустой/invalid |
| GET | `/vks/bot-info` | Public Read | none | N/A | N/A | `200` | `200` | N/A | неполная конфигурация `503` | anonymous/успех/неполная конфигурация |
| POST | `/vks` | Protected Write (private network) | internal caller | N/A | `body.user_id` | `201`/`200` внутри сети | то же | N/A | `400` | создание/идемпотентность/invalid |
| POST | `/vks/issue-confirmation` | Protected Write (private network) | internal caller | N/A | `body.user_id` | `201` внутри сети | то же | N/A | `400` | выдача/повтор/`ACTIVE` `409`/`BLOCKED` `409`/invalid |
| DELETE | `/vks/{user_id}` | Protected Write (private network) | internal caller | N/A | path `user_id` | `204` внутри сети | то же | N/A | `400` | удаление/идемпотентность/invalid |

`GET /vks` и `GET /vks/bot-info` остаются Public Read по дефолтной policy. Исключение из Public Read здесь не требуется, поскольку endpoint недоступен из браузера: персональные данные защищены сетевой изоляцией и owner-проверкой на основном backend, описанной в `vk-backend-proxy`. Публичных write-исключений VK-домен MUST NOT иметь: подтверждение выполняется bot runtime по сообщению из VK, а не публичным HTTP-запросом.

#### Scenario: Anonymous поведение приватных write endpoints

- **WHEN** anonymous вызывающий обращается к `POST /vks/issue-confirmation` или `DELETE /vks/{user_id}` изнутри `eqsitecms_network`
- **THEN** запрос MUST обрабатываться по контракту: сервис не имеет пользовательской аутентификации и полагается на сетевую изоляцию

#### Scenario: Публичный confirm отсутствует

- **WHEN** reviewer сверяет маршруты `vk-service` с email-контуром
- **THEN** маршрут вида `PATCH /vks/confirm` MUST отсутствовать, а подтверждение MUST выполняться только bot runtime

#### Scenario: Сервис не публикуется наружу

- **WHEN** reviewer читает compose-описание `vk-service`
- **THEN** порт `8000` MUST быть только в `expose`, а публикация `ports` MUST отсутствовать

### Requirement: Обработка доменных ошибок в HTTP-статусы

`vk-service` MUST отображать доменные исключения VK на HTTP-статусы: `NotFoundError` → `404`, `ConflictError` и `AlreadyExistsError` → `409`, `GoneError` → `410`, `ClientError` → `400`, ошибка rate limit → `429`, незавершённая VK-конфигурация → `503`. Ошибки валидации запроса MUST возвращать `400`, а не framework `422`: сервис-wide обработчик `RequestValidationError` в `src/main.py` установлен требованием скелета и MUST NOT изменяться. Тела ошибок MUST NOT содержать контрольную строку и групповой токен.

#### Scenario: Конфликт состояния

- **WHEN** доменная операция поднимает `ConflictError`
- **THEN** ответ MUST быть `409` с текстовым `detail` без секретов

#### Scenario: Rate limit

- **WHEN** доменная операция поднимает ошибку rate limit
- **THEN** ответ MUST быть `429`

#### Scenario: Секреты не попадают в ошибки

- **WHEN** reviewer читает тела ответов всех ошибочных сценариев
- **THEN** контрольная строка и групповой токен MUST отсутствовать

### Requirement: Тестовое покрытие VK API

`vk-service` MUST иметь автотесты API, покрывающие для каждого endpoint успешный путь, все перечисленные коды ошибок, идемпотентность и валидацию. Тесты MUST выполняться без реального VK API и без группового токена.

#### Scenario: Покрытие endpoint'ов

- **WHEN** deliverable API передаётся в Quality Gate
- **THEN** каждый endpoint MUST иметь тесты успеха, валидации и всех определённых для него ошибочных статусов

#### Scenario: Тесты не требуют секретов

- **WHEN** выполняется `uv run pytest -m "not infrastructure"`
- **THEN** все API-тесты MUST проходить без `VK_GROUP_TOKEN`
