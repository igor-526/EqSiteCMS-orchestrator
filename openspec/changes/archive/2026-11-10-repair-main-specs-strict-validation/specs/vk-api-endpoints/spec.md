## MODIFIED Requirements

### Requirement: Access matrix приватного VK API

`vk-service` MUST соблюдать матрицу приватного VK API: доступ только из `eqsitecms_network`, browser-facing gateway — основной backend; peer-service credential не используется. Методы, пути, роли, статусы, ограничения и причины исключений определены в сценарии матрицы.

#### Scenario: Anonymous поведение приватных write endpoints

- **WHEN** anonymous вызывающий обращается к `POST /vks/issue-confirmation` или `DELETE /vks/{user_id}` изнутри `eqsitecms_network`
- **THEN** запрос MUST обрабатываться по контракту: сервис не имеет пользовательской аутентификации и полагается на сетевую изоляцию

#### Scenario: Публичный confirm отсутствует

- **WHEN** reviewer сверяет маршруты `vk-service` с email-контуром
- **THEN** маршрут вида `PATCH /vks/confirm` MUST отсутствовать, а подтверждение MUST выполняться только bot runtime

#### Scenario: Сервис не публикуется наружу

- **WHEN** reviewer читает compose-описание `vk-service`
- **THEN** порт `8000` MUST быть только в `expose`, а публикация `ports` MUST отсутствовать

#### Scenario: Матрица и ограничения доступа приватного VK API

- **WHEN** проверяется полный исходный контракт требования «Access matrix приватного VK API»
- **THEN** `vk-service` MUST соблюдать следующую матрицу. Сервис приватный: доступ возможен только из `eqsitecms_network`, browser-facing gateway — исключительно основной backend, поэтому peer-service credential не используется (сетевая изоляция подтверждена в `vk-service-orchestration`).

| method | path | access class | roles | tenant selector | owner rule | expected without auth | expected with auth | foreign resource | validation status | tests |
|---|---|---|---|---|---|---|---|---|---|---|
| GET | `/health` | Public Read | none | N/A | N/A | `200` | `200` | N/A | N/A | anonymous |
| GET | `/vks` | Public Read (private network) | none | N/A | filter by `user_ids` | `200` | `200` | вызывающий обязан передавать только собственные id; owner-проверка на backend | некорректный UUID/`state` `400` | anonymous/список/фильтр/пустой/invalid |
| GET | `/vks/bot-info` | Public Read | none | N/A | N/A | `200` | `200` | N/A | неполная конфигурация `503` | anonymous/успех/неполная конфигурация |
| POST | `/vks` | Protected Write (private network) | internal caller | N/A | `body.user_id` | `201`/`200` внутри сети | то же | N/A | `400` | создание/идемпотентность/invalid |
| POST | `/vks/issue-confirmation` | Protected Write (private network) | internal caller | N/A | `body.user_id` | `201` внутри сети | то же | N/A | `400` | выдача/повтор/`ACTIVE` `409`/`BLOCKED` `409`/invalid |
| DELETE | `/vks/{user_id}` | Protected Write (private network) | internal caller | N/A | path `user_id` | `204` внутри сети | то же | N/A | `400` | удаление/идемпотентность/invalid |

`GET /vks` и `GET /vks/bot-info` остаются Public Read по дефолтной policy. Исключение из Public Read здесь не требуется, поскольку endpoint недоступен из браузера: персональные данные защищены сетевой изоляцией и owner-проверкой на основном backend, описанной в `vk-backend-proxy`. Публичных write-исключений VK-домен MUST NOT иметь: подтверждение выполняется bot runtime по сообщению из VK, а не публичным HTTP-запросом.

### Requirement: Обработка доменных ошибок в HTTP-статусы

`vk-service` MUST отображать доменные ошибки в HTTP-статусы по сценарию отображения, возвращать `400` вместо framework `422` при валидации запроса и не раскрывать контрольную строку и групповой токен. Сервис-wide обработчик `RequestValidationError` в `src/main.py` MUST NOT изменяться.

#### Scenario: Конфликт состояния

- **WHEN** доменная операция поднимает `ConflictError`
- **THEN** ответ MUST быть `409` с текстовым `detail` без секретов

#### Scenario: Rate limit

- **WHEN** доменная операция поднимает ошибку rate limit
- **THEN** ответ MUST быть `429`

#### Scenario: Секреты не попадают в ошибки

- **WHEN** reviewer читает тела ответов всех ошибочных сценариев
- **THEN** контрольная строка и групповой токен MUST отсутствовать

#### Scenario: Полное отображение ошибок и неизменность обработчика валидации

- **WHEN** проверяется полный исходный контракт требования «Обработка доменных ошибок в HTTP-статусы»
- **THEN** `vk-service` MUST отображать доменные исключения VK на HTTP-статусы: `NotFoundError` → `404`, `ConflictError` и `AlreadyExistsError` → `409`, `GoneError` → `410`, `ClientError` → `400`, ошибка rate limit → `429`, незавершённая VK-конфигурация → `503`. Ошибки валидации запроса MUST возвращать `400`, а не framework `422`: сервис-wide обработчик `RequestValidationError` в `src/main.py` установлен требованием скелета и MUST NOT изменяться. Тела ошибок MUST NOT содержать контрольную строку и групповой токен.
