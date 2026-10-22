# Purpose

Локальный HTTP-контракт Яндекс-peers: допустимые статусы, framework-ошибки, матрица существующего доступа и неизменность общепроектной авторизации.

## Requirements

### Requirement: Локальное множество HTTP-статусов

После принятия полного охвата оба приложения SHALL создавать только `200`, `204` и `400` для обычных HTTP-запросов, включая `/api/*`, `/health`, документацию и routing/framework errors. Существующие успешные DTO SHALL сохраняться; `204` MUST NOT иметь тела. Ожидаемые ошибки клиента/валидации SHALL возвращать `400`; `AppError`, `AlreadyExistsError`, необработанные ошибки и response validation errors SHALL централизованно давать безопасный `400`, не меняя внутреннюю классификацию ошибок. Debug traceback MUST NOT попадать в ответ. Ошибки до запуска ASGI, аварийное завершение процесса, сетевой timeout caller/proxy и ответы reverse proxy не входят в гарантию приложения; начатый/оборванный streaming response не превращается задним числом в `400`, streaming endpoints данным change не добавляются.

#### Scenario: Ошибка клиента и валидации
- **WHEN** API получает `ClientError`, некорректный UUID, отсутствующий обязательный параметр или malformed body
- **THEN** приложение возвращает `400` с сериализуемым `detail`, без отражения секретного ввода

#### Scenario: Внутренняя ошибка и конфликт
- **WHEN** обработка любого зарегистрированного пути завершается `AppError`, `AlreadyExistsError`, неожиданным исключением либо response validation error до отправки ответа
- **THEN** приложение отвечает `400`, не раскрывает внутренние данные и фиксирует безопасную диагностическую категорию; ошибки не становятся успешным `200`

#### Scenario: Health и документация
- **WHEN** anonymous или authenticated caller запрашивает `/health`, `/docs`, `/redoc`, `/openapi.json` либо `/docs/oauth2-redirect`
- **THEN** успешный ответ имеет статус `200`, а ошибка обработки — `400`

### Requirement: Framework ошибки не обходят контракт

Приложения SHALL возвращать `400` для неизвестного пути, неподдерживаемого HTTP method и ошибок HTTPException, а не framework defaults `404/405`. Slash redirect SHALL быть отключён: неканонический путь MUST возвращать `400`, а не `307/308`. Нормализация статуса MUST NOT отменять отказ доступа или превращать ошибку в успешное выполнение операции.

#### Scenario: Routing ошибки
- **WHEN** caller запрашивает неизвестный путь, неверный method или вариант существующего пути с неправильным trailing slash
- **THEN** получает `400`, а сервис не вызывается и redirect отсутствует

#### Scenario: Явный отказ доступа
- **WHEN** внутри этих peers возникает явный отказ HTTPException, включая 401/403
- **THEN** при одобренном полном охвате он остаётся отказом с `400`, без вызова запрещённой операции; статусы авторизации main backend не меняются

### Requirement: Access matrix существующих peer endpoints

Change SHALL сохранять фактическую модель доступа приведённых путей без добавления публичной экспозиции, обхода backend authorization или ослабления существующих проверок. `authenticated` означает тот же запрос с user cookie/Authorization: в текущих peer routes они не дают дополнительных прав и не требуются. `access_token` Метрики — вход для Яндекс, не user authentication. По ответу Q2 пользователь заявил: «Это dev окружение. На production такого не будет»; существующие access exceptions сохраняются в рамках этого dev change без auth/network changes. Отдельный security change MUST NOT становиться prerequisite для apply или dev verification; финальный approval реализации по-прежнему требуется. Это заявление MUST NOT считаться техническим подтверждением production isolation: перед production deployment/release SHALL быть подтверждена защита чувствительных peer APIs от внешних anonymous callers, иначе production выпуск блокируется. Устранение production exposure выполняется вне ownership этого change.

Идентификаторы Y1..M1/H1/D1/R1 служат трассировкой тестов. Результаты `200/204` предполагают валидные данные и существующий ресурс; ошибка данных/интеграции → `400` независимо от cookie.

| ID | method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|---|
| Y1 | GET | yandex `/api/auth/link` | Public Read, auth initiation | любой caller private peer | 200; invalid/missing equestrian_id 400 | то же |
| Y2 | POST | yandex `/api/auth/code` | Public Auth POST exception | caller OAuth-потока private peer | 200; invalid code/body/upstream 400 | то же |
| Y3 | GET | yandex `/api/accounts/` | Private Peer Read exception | доверенный внутренний caller | 200; invalid/missing equestrian_id 400 | то же |
| Y4 | DELETE | yandex `/api/accounts/{account_id}` | Private Peer Write exception | доверенный внутренний caller | 204, включая отсутствующий ID (идемпотентность); malformed ID 400 | то же |
| Y5 | GET | yandex `/api/servicing/access-token/{account_id}` | Sensitive Private Peer Read exception | доверенный внутренний сервис | 200; invalid/missing resource 400 | то же |
| Y6 | GET | yandex `/api/metrica/counters` | Sensitive Private Peer Read exception | доверенный внутренний caller | 200; invalid/missing account_id/upstream 400 | то же |
| Y7 | GET | yandex `/api/connections/metrica/{equestrian_id}` | Private Peer Read exception | доверенный внутренний caller | 200, включая counter=null; malformed ID 400 | то же |
| Y8 | POST | yandex `/api/connections/metrica` | Private Peer Write exception | доверенный внутренний caller | 200; validation/conflict 400 | то же |
| Y9 | DELETE | yandex `/api/connections/metrica/{counter_id}` | Private Peer Write exception | доверенный внутренний caller | 204, включая отсутствующий ID (идемпотентность); malformed ID 400 | то же |
| M1 | GET | ya-metrica `/api/metrica/counters` | Sensitive Private Peer Read exception | доверенный внутренний caller | 200; missing/invalid access_token/params/upstream 400 | то же |
| H1 | GET | оба `/health` | Public Read | любой caller | 200; internal failure 400 | то же |
| D1 | GET | оба `/docs`, `/redoc`, `/openapi.json`, `/docs/oauth2-redirect` | Public Read, служебные | любой caller | 200; internal failure 400 | то же |
| R1 | любой | оба неизвестный путь, unsupported method, slash mismatch | Framework rejection | никто | 400; операция не вызвана | то же |

Причины исключений: Y2 инициирует OAuth до user session. Y3..Y9 и M1 сейчас не имеют auth dependency и являются доверенными peer API, а не CMS user API; Y5 выдаёт чувствительный token, Y6/M1 оперируют приватными данными и поэтому НЕ классифицируются как общедоступное чтение сайтов. Y4/Y8/Y9 credential-less запись — существующее явное исключение из Protected Write, сохраняемое в заявленном пользователем dev окружении, а не новое разрешение публичного production доступа. Production deployment/release требует подтверждённой защиты на внешней границе; этот change не доказывает private exposure, не создаёт peer credential и не разрешает публичную production выдачу токенов.

Дополнительные оси governance: `equestrian_id`/`account_id`/`counter_id` — resource/tenant identity, не секретная аутентификация; `X-Equestrian-Service-Key` здесь не используется. Owner/foreign проверок на user cookies в данных peers нет: валидный ID другого tenant имеет тот же контракт у доверенного внутреннего caller, а неизвестный ресурс следует строке матрицы (`400` для Y5/Y6, `204` для DELETE, `200 counter=null` для Y7). Это существующая граница доверия, не новое разрешение CMS-пользователю; owner-only email policy неприменима. Роли CMS не создаются и не меняются.

#### Scenario: Anonymous и authenticated для каждой строки
- **WHEN** тесты вызывают каждую строку Y1..Y9, M1, H1 и D1 без cookies, затем с cookie/Authorization
- **THEN** подтверждаются одинаковые контрактные статусы и payload по матрице, а upstream/token input не принимается за user authentication

#### Scenario: Валидация и чужой ресурс
- **WHEN** anonymous и authenticated caller передают missing/malformed ID, неизвестный ID, валидный ID другого tenant либо невалидный input Метрики
- **THEN** validation даёт `400`, неизвестный ресурс следует явным outcomes матрицы, foreign ID не получает новых прав от cookie и обрабатывается только в существующем доверенном peer-контуре; внешняя граница не становится публичной

#### Scenario: Проверка private boundary
- **WHEN** Quality Gate проверяет runtime exposure двух сервисов
- **THEN** фиксирует фактические bindings/exposure и dev-допущение Q2, не выдавая их за проверенную production isolation; dev apply/live не требуют отдельного security change, но production deployment/release блокируется без подтверждения защиты чувствительных routes от внешних anonymous callers; auth/network remediation не входит в этот change

### Requirement: Граница с общепроектной авторизацией

Данный локальный контракт MUST NOT переписывать `401/403` main backend, tenant selector или других сервисов. Если пользователь выберет user/peer auth непосредственно в этих сервисах с сохранением `401/403`, это SHALL потребовать пересмотра абсолютного множества `200/204/400`, матрицы и tasks до apply, а не молчаливого удаления auth checks.

#### Scenario: Main backend отказывает в доступе
- **WHEN** запрос к защищённому main backend endpoint приходит без auth или с чужими правами
- **THEN** сохраняется действующий `401/403`; нормализация статусов peers не применяется к backend
