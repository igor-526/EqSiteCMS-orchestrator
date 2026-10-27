# Spec Delta

## MODIFIED Requirements

### Requirement: Access matrix существующих peer endpoints

Change SHALL сохранять фактическую модель доступа приведённых путей без добавления публичной экспозиции, обхода backend authorization или ослабления существующих проверок. `authenticated` означает тот же запрос с user cookie/Authorization: в текущих peer routes они не дают дополнительных прав и не требуются. `access_token` Метрики — вход для Яндекс, не user authentication. По ответу Q2 пользователь заявил: «Это dev окружение. На production такого не будет»; существующие access exceptions сохраняются в рамках этого dev change без auth/network changes. Отдельный security change MUST NOT становиться prerequisite для apply или dev verification; финальный approval реализации по-прежнему требуется. Это заявление MUST NOT считаться техническим подтверждением production isolation: перед production deployment/release SHALL быть подтверждена защита чувствительных peer APIs от внешних anonymous callers, иначе production выпуск блокируется. Устранение production exposure выполняется вне ownership этого change.

Идентификаторы Y1..Y10/M1/M2/H1/D1/R1 служат трассировкой тестов. Результаты `200/204` предполагают валидные данные и существующий ресурс; ошибка данных/интеграции → `400` независимо от cookie.

| ID | method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|---|
| Y1 | GET | yandex `/api/auth/link` | Public Read, auth initiation | любой caller private peer | 200; invalid/missing equestrian_id 400 | то же |
| Y2 | POST | yandex `/api/auth/code` | Public Auth POST exception | caller OAuth-потока private peer | 200; invalid code/body/upstream 400 | то же |
| Y3 | GET | yandex `/api/accounts/` | Private Peer Read exception | доверенный внутренний caller | 200; invalid/missing equestrian_id 400 | то же |
| Y4 | DELETE | yandex `/api/accounts/{account_id}` | Private Peer Write exception | доверенный внутренний caller | 204, включая отсутствующий ID (идемпотентность); malformed ID 400 | то же |
| Y5 | GET | yandex `/api/servicing/access-token/{account_id}` | Sensitive Private Peer Read exception (service-to-service) | доверенный внутренний сервис (ya-metrica-service) | 200 `{"enc_access_token": <ciphertext>}` без открытого токена; malformed/missing resource 400 | то же |
| Y6 | GET | yandex `/api/metrica/counters` | Sensitive Private Peer Read exception | доверенный внутренний caller | 200; invalid/missing account_id/upstream 400 | то же |
| Y7 | GET | yandex `/api/connections/metrica/{equestrian_id}` | Private Peer Read exception | доверенный внутренний caller | 200, включая counter=null; malformed ID 400 | то же |
| Y8 | POST | yandex `/api/connections/metrica` | Private Peer Write exception | доверенный внутренний caller | 200; validation/conflict 400 | то же |
| Y9 | DELETE | yandex `/api/connections/metrica/{counter_id}` | Private Peer Write exception | доверенный внутренний caller | 204, включая отсутствующий ID (идемпотентность); malformed ID 400 | то же |
| Y10 | GET | yandex `/api/connections/metrica` (`limit`, `offset`) | Private Peer Read exception | доверенный внутренний caller (seo-service scheduler) | 200 `{total, items:[{equestrian_id, counter_id}]}`; invalid `limit`/`offset` 400 | то же |
| M1 | GET | ya-metrica `/api/metrica/counters` | Sensitive Private Peer Read exception | доверенный внутренний caller | 200; missing/invalid access_token/params/upstream 400 | то же |
| M2 | POST | ya-metrica `/api/metrica/stats/parse` | Удалён: framework rejection R1 (неизвестный маршрут) | никто | 400; операция не вызвана, run и задания не создаются | то же |
| H1 | GET | оба `/health` | Public Read | любой caller | 200; internal failure 400 | то же |
| D1 | GET | оба `/docs`, `/redoc`, `/openapi.json`, `/docs/oauth2-redirect` | Public Read, служебные | любой caller | 200; internal failure 400 | то же |
| R1 | любой | оба неизвестный путь, unsupported method, slash mismatch | Framework rejection | никто | 400; операция не вызвана | то же |

Причины исключений: Y2 инициирует OAuth до user session. Y3..Y10 и M1 не имеют auth dependency и являются доверенными peer API, а не CMS user API; Y5 выдаёт только ciphertext токена (расшифровка — у ya-metrica-service общим ключом), но он остаётся чувствительным и потому Y5 НЕ Public Read; Y6/M1 оперируют приватными данными и поэтому НЕ классифицируются как общедоступное чтение сайтов. Y10 отдаёт только `equestrian_id` и `counter_id` без токенов и данных аккаунта; M2 удалён, постановка парсинга выполняется через NATS-команду seo-service (`parse-job-messaging`). Y4/Y8/Y9 credential-less запись — существующее явное исключение из Protected Write, сохраняемое в заявленном пользователем dev окружении, а не новое разрешение публичного production доступа. Production deployment/release требует подтверждённой защиты на внешней границе; этот change не доказывает private exposure, не создаёт peer credential и не разрешает публичную production выдачу токенов.

Дополнительные оси governance: `equestrian_id`/`account_id`/`counter_id` — resource/tenant identity, не секретная аутентификация; `X-Equestrian-Service-Key` здесь не используется. Owner/foreign проверок на user cookies в данных peers нет: валидный ID другого tenant имеет тот же контракт у доверенного внутреннего caller, а неизвестный ресурс следует строке матрицы (`400` для Y5/Y6, `204` для DELETE, `200 counter=null` для Y7). Это существующая граница доверия, не новое разрешение CMS-пользователю; owner-only email policy неприменима. Роли CMS не создаются и не меняются.

#### Scenario: Anonymous и authenticated для каждой строки
- **WHEN** тесты вызывают каждую строку Y1..Y10, M1, H1 и D1 без cookies, затем с cookie/Authorization; для M2 проверяется rejection `400` в обоих режимах
- **THEN** подтверждаются одинаковые контрактные статусы и payload по матрице, а upstream/token input не принимается за user authentication

#### Scenario: Валидация и чужой ресурс
- **WHEN** anonymous и authenticated caller передают missing/malformed ID, неизвестный ID, валидный ID другого tenant либо невалидный input Метрики
- **THEN** validation даёт `400`, неизвестный ресурс следует явным outcomes матрицы, foreign ID не получает новых прав от cookie и обрабатывается только в существующем доверенном peer-контуре; внешняя граница не становится публичной

#### Scenario: Проверка private boundary
- **WHEN** Quality Gate проверяет runtime exposure двух сервисов
- **THEN** фиксирует фактические bindings/exposure и dev-допущение Q2, не выдавая их за проверенную production isolation; dev apply/live не требуют отдельного security change, но production deployment/release блокируется без подтверждения защиты чувствительных routes от внешних anonymous callers; auth/network remediation не входит в этот change
