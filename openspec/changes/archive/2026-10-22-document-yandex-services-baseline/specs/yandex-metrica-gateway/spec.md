# Delta: gateway Метрики и привязки счётчиков

## Purpose

Зафиксировать существующие контракты gateway списка счётчиков и привязки одного счётчика к конюшне в yandex-service. Ретроспективный baseline отделяет подтверждённую функциональность от пробелов доступа и передачи токена; runtime-изменения этим документом не разрешаются.

### Границы и происхождение (контекст delta, для переноса в F1)

- Исходный запрос: [097](<../../../../../docs/tasks/097_yandex_services_retrospective_specs.md#L1-L18>).
- Unit `PLAN-Y2`, capability `yandex-metrica-gateway`; единственный изменяемый файл — этот delta. Общие артефакты синтезирует `F1`; OAuth/accounts принадлежат `PLAN-Y1`, adapter Метрики — параллельному `M1`.
- Статически проверенный baseline: root `457be4391fa800214ce6939030d3e125962b89be`, service `d3cf1dc5879d5ebc2f75bbdb437ca657cf1a4de4`; `git -C services/yandex-service status --short` пуст. Root уже содержит посторонний dirty overlay, в том числе main specs ошибок/peer HTTP и архив предыдущего change; ссылки ниже относятся к прочитанному рабочему дереву, а не приписываются root HEAD. Тесты только прочитаны, не запускались.
- Нормативная семантика HTTP/ошибок не дублируется: [peer HTTP: локальные статусы](<../../../../specs/yandex-peer-http-contract/spec.md#L7-L17>), [Y6–Y9 и граница доступа](<../../../../specs/yandex-peer-http-contract/spec.md#L35-L79>), [client failures: клиентская граница](<../../../../specs/yandex-client-failures/spec.md#L7-L41>) и [преобразование Метрики](<../../../../specs/yandex-client-failures/spec.md#L43-L53>). Их наличие не является новым approval service change или подтверждением production isolation.

### Evidence anchors (контекст delta)

Все пути service относятся к указанному service HEAD; тестовый anchor означает наличие проверки в исходниках, не результат её исполнения.

| Anchor | Источник | Подтверждает |
|---|---|---|
| E1 | [gateway route](<../../../../../services/yandex-service/src/api/yandex_metrica.py#L12-L29>), [registration](<../../../../../services/yandex-service/src/main.py#L80-L86>) | GET, query и полные префиксы |
| E2 | [gateway service](<../../../../../services/yandex-service/src/core/services/yandex_metrica_service.py#L25-L43>) | clamp, lookup, вызов peer, отсутствие локальной сортировки/фильтрации |
| E3 | [peer client](<../../../../../services/yandex-service/src/clients/yandex_metrica_service_client.py#L60-L75>), [protocol](<../../../../../services/yandex-service/src/core/protocols/clients/yandex_metrica_service_client.py#L6-L15>), [wire tests](<../../../../../services/yandex-service/tests/unit/test_yandex_metrica_service_client.py#L151-L190>) | query-передача и DTO peer |
| E4 | [DTO списка/привязки](<../../../../../services/yandex-service/src/core/schemas/api/yandex_metrica_counters.py#L9-L43>), [account DTO](<../../../../../services/yandex-service/src/core/schemas/api/yandex_account.py#L8-L25>) | типы ID, поля и отсутствие token-полей |
| E5 | [binding routes](<../../../../../services/yandex-service/src/api/yandex_connections.py#L16-L53>), [binding service](<../../../../../services/yandex-service/src/core/services/yandex_metrica_counter_service.py#L28-L69>) | read/set/delete, проверки до записи, reuse UUID |
| E6 | [binding entity](<../../../../../services/yandex-service/src/core/entities/yandex_metrica_counter.py#L8-L13>), [lookup](<../../../../../services/yandex-service/src/repositories/yandex_metrica_counter_repository.py#L11-L21>), [repository protocol](<../../../../../services/yandex-service/src/core/protocols/repositories/yandex_metrica_counter_repository.py#L9-L14>) | строковый ID до 31 символа и tenant lookup |
| E7 | [model](<../../../../../services/yandex-service/src/models/yandex_metrica_counters.py#L13-L26>), [initial migration](<../../../../../services/yandex-service/src/migration/versions/6fe0626759ae_.py#L48-L58>), [unique migration](<../../../../../services/yandex-service/src/migration/versions/61c3a74f4ba9_.py#L18-L28>) | unique tenant, FK cascade; DB tenant nullable |
| E8 | [writes/delete](<../../../../../services/yandex-service/src/repositories/abstract_repository.py#L43-L72>), [route transaction](<../../../../../services/yandex-service/src/utils/transactional_route.py#L10-L30>) | flush без commit в repository; transaction до ответа |
| E9 | [gateway unit tests](<../../../../../services/yandex-service/tests/unit/test_yandex_metrica_service.py#L36-L130>), [gateway API tests](<../../../../../services/yandex-service/tests/api/test_yandex_metrica.py#L17-L121>) | filters/pages/errors; token xfail |
| E10 | [binding unit tests](<../../../../../services/yandex-service/tests/unit/test_yandex_metrica_counter_service.py#L35-L148>), [binding API tests](<../../../../../services/yandex-service/tests/api/test_yandex_connections.py#L16-L124>) | null, create/update/no-op/delete, conflict, validation |
| E11 | [repository unit tests](<../../../../../services/yandex-service/tests/unit/test_yandex_metrica_counter_repository.py#L15-L49>), [PostgreSQL uniqueness tests](<../../../../../services/yandex-service/tests/integration/test_counter_repository_postgres.py#L15-L36>), [FK/cascade test](<../../../../../services/yandex-service/tests/integration/test_models_postgres.py#L30-L53>) | SQL/constraints; PostgreSQL проверки существуют, но здесь не выполнялись |
| E12 | [header fixtures](<../../../../../services/yandex-service/tests/api/conftest.py#L18-L28>), [transaction harness](<../../../../../services/yandex-service/tests/api/conftest.py#L56-L81>), [event assertions](<../../../../../services/yandex-service/tests/api/conftest.py#L119-L122>) | anonymous и fake headers; подменённые сессии, не доказательство valid session/реального commit |

### Access matrix — наблюдение, не разрешение публичного доступа

`expected with auth` ниже разделяет fake-header characterization и настоящую аутентифицированную сессию. Чувствительные GET возвращают список доступных аккаунту счётчиков либо вложенный профиль, включая email/phone; это НЕ Public Read для сайтов. POST/DELETE остаются Protected Write по общей policy. Локально routes не проверяют caller/роль/владельца; tenant/resource UUID — selector, не permission. Отсутствие auth dependency не доказывает доступность извне или защиту на внешней границе. Окончательное cross-service решение принадлежит `S1`.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/metrica/counters` | чувствительный peer read; исключение из Public Read, boundary не доказана | роли локально не проверяются; доверенный peer — намерение границы, не доказательство | observed: 200 при существующем account; invalid/missing account_id, неверные числа, absent account/peer failure → 400 | fake headers: то же; valid session/role/owner: не проверено |
| GET | `/api/connections/metrica/{equestrian_id}` | приватный peer read; исключение из Public Read из-за account profile | роли/owner локально не проверяются | observed: 200 с binding либо `counter=null`; malformed UUID → 400; missing referenced account → 400 по цепочке E5 | fake headers: то же для покрытых случаев; valid session/role/owner: не проверено |
| POST | `/api/connections/metrica` | Protected Write по policy; credential-less исполнение — gap, НЕ public exception этого delta | роли и согласованность tenant аккаунта не проверяются | observed: 200 create/update/no-op; validation/absent account/conflict → 400; foreign account принят в fake-repository API test | fake headers: тот же observed исход; valid session/role/owner: не проверено |
| DELETE | `/api/connections/metrica/{counter_id}` | Protected Write по policy; credential-less исполнение — gap | роли/owner локально не проверяются | observed: 204, в том числе absent/repeat; malformed UUID → 400 | fake headers: то же; valid session/role/owner: не проверено |

HTTP числа — characterization существующего main-контракта, не новый норматив этой capability. `counter_id` в DELETE — UUID записи привязки, не строковый/числовой ID Яндекс. Anonymous/fake проверки: E9/E10/E12. Настоящие auth, запрет foreign tenant и внешняя private boundary остаются неподтверждёнными; нельзя выдавать fake bearer/cookie за успешную авторизацию.

## ADDED Requirements

### Requirement: Параметры запроса списка счётчиков
Gateway SHALL принимать обязательный UUID `account_id`, необязательный `search` и целочисленные `limit/offset` с defaults 20/0. Перед peer-вызовом SHALL ограничивать limit диапазоном 1..100 и offset снизу нулём; некорректный синтаксис параметров MUST NOT доходить до сервиса.

#### Scenario: Y2-01 — defaults и передача фильтра
- **WHEN** запрошен список с UUID аккаунта без paging либо с `search`, включая пустую строку
- **THEN** gateway передаёт выбранный UUID и исходный `search` без локальной нормализации; defaults равны 20/0 (E1/E2/E9)

#### Scenario: Y2-02 — границы пагинации
- **WHEN** limit меньше 1 или больше 100 либо offset отрицателен
- **THEN** peer получает соответственно limit 1 или 100 и offset 0; большой неотрицательный offset не ограничивается сверху (E2/E9)

#### Scenario: Y2-03 — некорректные query параметры
- **WHEN** account_id отсутствует/не UUID либо limit/offset не разбирается как integer
- **THEN** сервис списка не вызывается; отказ следует существующему peer HTTP контракту (E1/E9)

### Requirement: Выбор аккаунта и передача peer query
Gateway SHALL искать аккаунт по `account_id` и при его отсутствии прекращать обработку до peer-вызова с «Аккаунт не найден». Peer-вызов SHALL использовать GET `/api/metrica/counters` с query `access_token/search/limit/offset`; локальных параметров sort и локальной фильтрации списка gateway не добавляет. Источник содержимого token отмечен как gap G-Y2-01, а не безопасный норматив.

#### Scenario: Y2-04 — неизвестный аккаунт
- **WHEN** lookup выбранного account_id не находит аккаунт
- **THEN** peer не вызывается и возникает безопасный отказ «Аккаунт не найден» (E2/E9)

#### Scenario: Y2-05 — wire query
- **WHEN** gateway вызывает peer с параметрами поиска и paging
- **THEN** клиент передаёт их в query указанного GET; `search=None` на wire сериализуется в пустое значение, собственного sort query или Authorization header этот метод не формирует (E3)

### Requirement: Сохранение DTO списка без пересчёта
Gateway SHALL возвращать `total` и `items` из валидного peer DTO: элемент содержит integer `counter_id` и string `site`, отсутствующий `items` имеет default пустого списка. Gateway MUST NOT пересчитывать total по длине страницы, переставлять элементы или вводить собственную семантику поиска; алгоритм adapter относится к M1.

#### Scenario: Y2-06 — неполная страница и порядок
- **WHEN** peer вернул валидные items в определённом порядке и total, отличный от длины items
- **THEN** gateway сохраняет их порядок и total без локальной сортировки или recount (E2/E3/E4; partial response проверяется E9, отдельного multi-item order assertion нет)

#### Scenario: Y2-07 — пустая страница
- **WHEN** peer возвращает пустые items, в том числе total больше нуля при offset за страницей, либо не передаёт items
- **THEN** items остаётся пустым списком, а total сохраняется; отсутствие items не равно отсутствию обязательного total (E3/E4/E9)

### Requirement: Чтение tenant привязки
Чтение привязки SHALL выбирать одну запись по точному `equestrian_id` и возвращать `counter=null`, если её нет. Найденная запись SHALL содержать UUID записи, equestrian_id, строковый counter_id и вложенный account DTO без token-полей. Проверка принадлежности аккаунта tenant не следует из этого lookup.

#### Scenario: Y2-08 — отсутствующая привязка
- **WHEN** lookup конюшни не находит записи
- **THEN** ответ содержит `counter=null`, а lookup аккаунта не выполняется (E5/E10/E11)

#### Scenario: Y2-09 — найденная привязка
- **WHEN** запись и связанный аккаунт найдены
- **THEN** counter содержит `id/equestrian_id/counter_id/yandex_account`; account DTO содержит `id/yandex_id/yandex_login/display_name/email/yandex_phone`, но не access/refresh token и не их ciphertext (E4/E5/E10)

#### Scenario: Y2-10 — отсутствующий связанный аккаунт
- **WHEN** запись привязки найдена, а lookup её аккаунта возвращает отсутствие
- **THEN** результат не маскируется под `counter=null`; возникает «Аккаунт не найден» (E5/E10)

### Requirement: Создание и замена привязки
Set SHALL принимать `equestrian_id`, `yandex_account_id` и строковый `counter_id` длиной не более 31 символа, искать существующую запись по tenant и проверять существование аккаунта до записи. Для нового tenant SHALL создавать запись; при изменении counter/account SHALL заменять значения существующей записи, сохраняя её UUID и created_at. Проверка доступности счётчика у Яндекс этим set не выполняется.

#### Scenario: Y2-11 — первая привязка
- **WHEN** у tenant нет записи, входные данные и аккаунт валидны
- **THEN** создаётся одна привязка и возвращается её новый UUID с выбранным аккаунтом; peer Метрики не вызывается (E5/E6/E10)

#### Scenario: Y2-12 — изменение counter или аккаунта
- **WHEN** у tenant есть запись и меняется counter_id, yandex_account_id либо оба
- **THEN** обновляется та же запись с сохранением UUID и created_at, а не создаётся вторая (E5/E8/E10)

#### Scenario: Y2-13 — последовательный повтор
- **WHEN** повторяется set с теми же tenant, account и counter
- **THEN** возвращается прежний UUID и профиль аккаунта, create/update не выполняются; lookup аккаунта сохраняется (E5/E10)

#### Scenario: Y2-14 — invalid counter или неизвестный аккаунт
- **WHEN** counter_id длиннее 31 символа либо выбранный аккаунт отсутствует
- **THEN** create/update не выполняются; получаются соответственно «Некорректные данные счётчика» либо «Аккаунт не найден»; при первом случае account lookup не нужен (E5/E6/E10)

### Requirement: Ограничения хранения и конфликты
Хранилище SHALL допускать не более одной привязки на ненулевой equestrian_id и существующий account FK с cascade delete. Одинаковый counter_id у разных tenant не ограничен unique constraint. Sequential set idempotency MUST NOT трактоваться как конкурентный upsert: read-then-create может встретить constraint conflict, обработка которого следует main peer HTTP контракту.

#### Scenario: Y2-15 — unique tenant и повторное использование counter
- **WHEN** создаются записи разных tenant с одним counter_id, затем insert/update пытается продублировать tenant
- **THEN** разные tenant допустимы, duplicate tenant отклоняется constraint; repository не гарантирует retry или last-write-wins для гонки (E7/E11)

#### Scenario: Y2-16 — FK и cascade
- **WHEN** записывается несуществующий account FK либо удаляется связанный аккаунт
- **THEN** в первом случае FK отклоняет запись, во втором связанные привязки удаляются; это storage contract, не новый account lifecycle в этой capability (E7/E11)

### Requirement: Удаление по UUID привязки
Удаление SHALL использовать UUID записи привязки из path `counter_id`, а не ID счётчика Яндекс. При отсутствии записи и повторном удалении операция SHALL оставаться идемпотентной и без payload; предварительный account lookup не требуется.

#### Scenario: Y2-17 — удаление и повтор
- **WHEN** delete запрошен по UUID записи, в том числе отсутствующему либо уже удалённому
- **THEN** repository удаляет по id без проверки наличия аккаунта; успешный ответ без тела следует main peer HTTP контракту (E5/E8/E10)

#### Scenario: Y2-18 — malformed path и body
- **WHEN** GET/DELETE binding получает malformed UUID либо set получает отсутствующие обязательные поля/невалидный UUID
- **THEN** binding repository и account repository не вызываются, ввод не отражается в безопасном отказе (E4/E5/E10)

### Requirement: Завершение транзакции до ответа
Gateway и binding routes SHALL завершать request-scoped транзакцию до отправки HTTP ответа: успех — commit, исключение — rollback, затем освобождение сессии. Ошибка записи/commit MUST NOT превращаться в успешный результат. Repository не выполняет собственный commit; новый error/status mapping этим требованием не вводится.

#### Scenario: Y2-19 — успешный запрос
- **WHEN** GET списка/привязки, set либо delete завершился успешно
- **THEN** транзакция завершается и сессия освобождается перед отправкой ответа; это проверено исходниками fake-session assertions, не реальным PostgreSQL commit в данном unit (E8/E9/E10/E12)

#### Scenario: Y2-20 — отказ и конфликт
- **WHEN** validation, отсутствующий аккаунт, peer failure или injected write conflict прерывает route
- **THEN** выполняется rollback/cleanup до ответа; детали конфликта не раскрываются, статус определяется main peer HTTP контрактом (E8/E9/E10/E12)

### Requirement: Разделение access characterization и security гарантий
Ретроспективная спецификация MUST сохранять различие между наблюдаемым поведением без credentials/с fake headers и доказанной авторизацией. Tenant/account/binding UUID MUST NOT считаться permission. Public Read чувствительных данных и credential-less публичная запись MUST NOT выводиться из успешного characterization; final cross-service access review остаётся за S1.

#### Scenario: Y2-21 — anonymous и fake headers
- **WHEN** существующие API тесты вызывают четыре строки матрицы без заголовков и с `Bearer fake-caller`/`session=fake-caller`
- **THEN** фиксируются одинаковые observed исходы матрицы; второй вариант не считается проверкой valid session, роли или owner (E9/E10/E12)

#### Scenario: Y2-22 — foreign ID не доказывает permission
- **WHEN** gateway lookup использует account другого tenant либо set получает несогласованные tenant/account и fake repository возвращает аккаунт
- **THEN** baseline фиксирует отсутствие локального owner/tenant gate, а не разрешённый доступ CMS caller; требуются отдельные решения S1 о внешней границе и корректных anonymous/authenticated/foreign проверках (E2/E5/E9/E10)

### Gaps и точечная передача S1/F1 (контекст delta)

| ID | Наблюдение / неопределённость | Кому и что передать |
|---|---|---|
| G-Y2-01 | Gateway передаёт `enc_access_token` прямо как peer `access_token`, injected encryption не используется. Есть strict xfail желаемой дешифровки; expiry/refresh в этом chain не проверяются. Это дефект/разрыв контракта, НЕ требование сохранять ciphertext forwarding. | S1: E2 и [token xfail](<../../../../../services/yandex-service/tests/unit/test_yandex_metrica_service.py#L124-L130>), E3 query. Не смешивать с уже описанной Y1 выдачей токена, где selected token дешифруется. Remediation требует отдельного решения/approval. |
| G-Y2-02 | Caller/roles/owner не проверяются на четырёх routes; GET binding включает profile email/phone. Set проверяет наличие account, но не равенство его tenant входному tenant и не доступность counter в Яндекс. | S1: E1/E4/E5, матрица, Y2-21..22; main peer HTTP Y6–Y9. Valid-session/role/foreign-denial и реальная private exposure не доказаны. Не легализовать Public Read/write без auth; не менять 401/403 соседних API. |
| G-Y2-03 | Sequential no-op доказан unit исходниками; concurrent upsert/retry не реализован. Conflict API test инжектирует AlreadyExistsError, но binding repository выдаёт raw DB ошибки; HTTP нормализуется main контрактом. | F1: E5/E7/E8/E10/E11. Нет прогона реальной DB/двух конкурентных set/rollback после conflict; constraint наличие не равно доказанному concurrency outcome. |
| G-Y2-04 | Entity/API требуют UUID tenant; migration/model допускают NULL tenant, unique не делает NULL единственным. Length 31 есть у entity/storage, но нет min_length/numeric/положительности для set counter_id. Пустую/нечисловую строку код явно не запрещает. | F1: E4/E6/E7; не придумывать validation или tenant invariant сильнее sources. Не выполнять schema fix в retrospective change. |
| G-Y2-05 | Query search делегируется как есть; gateway не считает/не сортирует. Multi-item order assertion и настоящий authenticated allow/deny отсутствуют в прочитанном pack. Тесты не запущены. | M1 определяет adapter search/count/sort; F1 переносит traceability, не делает этот delta источником adapter алгоритма. |

### Локальная декомпозиция для синтеза (контекст delta)

Это передача ownership, не изменение общего checklist и не разрешение runtime-реализации.

| Unit | Профиль | Deliverable / ownership | Зависит от | Verification |
|---|---|---|---|---|
| PLAN-Y2 | Planner | только этот delta; gateway/bindings, 22 сценария; 8 групп действий: baseline, route/service, peer/DTO, storage, tests, access/gaps, delta, verification/handoff | PLAN-Y1 завершён; его delta не требовалось перечитывать | source anchors + status/strict change validate |
| S1 | Planner | cross-service security synthesis; пути назначает Router, этот delta readonly | PLAN-Y1, PLAN-Y2, M1 и остальные назначенные slices | сопоставление access/evidence/gaps, без runtime |
| F1 | Planner | общие proposal/design/tasks; этот delta readonly | все slices и S1 | итоговые status/strict и approval gate |

DAG: `PLAN-Y1 → PLAN-Y2 → S1 → F1`; `M1 → S1`, M1 и PLAN-Y2 не пересекаются по ownership. Точечный context pack S1: этот delta (матрица и G-Y2-01..05), E1/E2/E4/E5, E3 только строки 60–75, E9 token xfail и gateway foreign/API chain, E10 binding access test, E12 header fixtures; main peer HTTP только Y6–Y9/граница, client failures только client/service clauses. OAuth/serviceauthorization, полный adapter и остальные specs для PLAN-Y2 не читались.
