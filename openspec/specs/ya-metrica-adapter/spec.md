# Ретроспективная спецификация адаптера Яндекс.Метрики

## Purpose

Адаптер предоставляет внутреннему peer-caller список доступных счётчиков Яндекс.Метрики по зашифрованному токену, преобразуя параметры поиска, пагинацию и ответ провайдера в локальный HTTP-контракт. Спецификация документирует существующее поведение, а не разрешает новую публичную экспозицию или runtime-исправления.

**Baseline и границы evidence**

- Источник запроса: [задача 097](<../../../../../docs/tasks/097_yandex_services_retrospective_specs.md#L1-L18>).
- Корневой HEAD при анализе: `457be4391fa800214ce6939030d3e125962b89be`; HEAD вложенного репозитория адаптера: `0bd7434cc97ac41f0a0aef1088e99b77ead48e1b`, рабочее дерево адаптера чистое. Старые `b64a0bd`/`d3cf1dc5` не являются baseline этого slice.
- Evidence — чтение tracked исходников и существующих тестов. Тесты, приложение, PostgreSQL и сеть в PLAN-M1 не запускались. Наличие теста не означает его прохождение в текущем окружении.
- Только adapter slice: без исходников yandex-service, OAuth/account/connections, корневых compose/env и полного API-аудита. Отдельная полная access matrix — PLAN-S1; общий design/tasks — PLAN-F1.
- Уже действующие нормы ошибок и peer HTTP не копируются и не изменяются: [ошибки клиента и частичный результат](<../../../../specs/yandex-client-failures/spec.md#L31-L69>), [строка M1 и governance доступа](<../../../../specs/yandex-peer-http-contract/spec.md#L35-L79>).

**Access matrix адаптера**

Таблица ссылается на существующие M1/H1, а не создаёт новые исключения. Для `200` предполагаются валидный зашифрованный токен и пригодный upstream. «С auth» в нормативном peer-контракте — тот же запрос с cookie/Authorization, без дополнительных прав; валидная пользовательская сессия отдельно не доказана. Зашифрованный `access_token` не является CMS-сессией.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/metrica/counters` | Sensitive Private Peer Read exception, существующая M1 | доверенный внутренний caller по peer-контракту; роли кодом не проверяются | локально `200`; отсутствующий/непригодный token, malformed pagination или upstream failure → `400` | по peer-контракту те же `200/400`; тесты содержат только синтетические cookie/header, не валидную сессию |
| GET | `/health` | Public Read, существующая H1 | любой caller | `200 {"status":"ok"}` при обработанном запросе | по peer-контракту то же; валидная сессия отдельно не проверена |

**Причина существующего исключения M1:** приватные счётчики и чувствительный query token не являются общедоступными данными сайтов. В route нет auth dependency; это наблюдение не доказывает сетевую изоляцию. Dev-допущение и production gate остаются ровно из main peer-контракта: production защита чувствительного API требует подтверждения; PLAN-M1 не вводит security exception и не выполняет remediation.

**Разделение проверок для PLAN-S1:** anonymous/без cookies и синтетические Bearer/Cookie покрыты текстом [route-тестов](<../../../../../services/ya-metrica-service/tests/api/test_counters_api.py#L18-L75>) и [health-тестов](<../../../../../services/ya-metrica-service/tests/api/test_health.py#L15-L38>). Это не доказательство authenticated identity, owner/foreign authorization или production boundary. PLAN-S1 должен отдельно трассировать anonymous и действительно authenticated caller либо явно обосновать неприменимость user session для private peer и указать неизвестное runtime exposure. Ожидания нельзя подменять выдуманными `401/403` или переносить локальный `400` на main backend.

**Evidence anchors**

Все пути относятся к tracked исходникам baseline выше. Таблица — статическая трассировка, не протокол запуска тестов.

| Ось | Исходник | Существующая тестовая трассировка |
|---|---|---|
| Query, обязательность, route prefix | [route:13–30](<../../../../../services/ya-metrica-service/src/api/yandex_metrica.py#L13-L30>), [mount:66–73](<../../../../../services/ya-metrica-service/src/main.py#L66-L73>) | [query:40–75](<../../../../../services/ya-metrica-service/tests/api/test_counters_api.py#L40-L75>) |
| Clamp/search/offset | [service:20–40](<../../../../../services/ya-metrica-service/src/core/services/yandex_metrica_service.py#L20-L40>), [provider:62–80](<../../../../../services/ya-metrica-service/src/clients/yandex_metrica.py#L62-L80>) | [границы:20–46](<../../../../../services/ya-metrica-service/tests/unit/test_yandex_metrica_service.py#L20-L46>), [mapping:154–168](<../../../../../services/ya-metrica-service/tests/clients/test_yandex_metrica.py#L154-L168>) |
| Шифрование и token boundary | [cipher:7–22](<../../../../../services/ya-metrica-service/src/core/services/encryption_service.py#L7-L22>), [DI:11–18](<../../../../../services/ya-metrica-service/src/containers/services.py#L11-L18>) | [roundtrip/key mismatch:7–36](<../../../../../services/ya-metrica-service/tests/unit/test_encryption_service.py#L7-L36>), [HTTP chain:100–125](<../../../../../services/ya-metrica-service/tests/api/test_counters_api.py#L100-L125>) |
| Provider HTTP/timeout и оболочка | [HTTP:13–60](<../../../../../services/ya-metrica-service/src/clients/yandex_metrica.py#L13-L60>), [validator:4–15](<../../../../../services/ya-metrica-service/src/core/schemas/clients/yandex_metrica.py#L4-L15>), [Protocol:4–17](<../../../../../services/ya-metrica-service/src/core/protocols/clients/yandex_metrica.py#L4-L17>) | [envelope/timeout:171–220](<../../../../../services/ya-metrica-service/tests/clients/test_yandex_metrica.py#L171-L220>) |
| DTO, частичный и пустой список | [DTO:6–17](<../../../../../services/ya-metrica-service/src/core/schemas/api/yandex_metrica_counters.py#L6-L17>), [conversion:43–65](<../../../../../services/ya-metrica-service/src/core/services/yandex_metrica_service.py#L43-L65>) | [partial:170–206](<../../../../../services/ya-metrica-service/tests/api/test_counters_api.py#L170-L206>) |
| Ошибки и sanitation | [handlers:76–106](<../../../../../services/ya-metrica-service/src/main.py#L76-L106>) | [failure chain:136–167](<../../../../../services/ya-metrica-service/tests/api/test_counters_api.py#L136-L167>) |
| Config и ключ | [tracked settings:7–44](<../../../../../services/ya-metrica-service/src/settings.py#L7-L44>) | [isolated settings:12–80](<../../../../../services/ya-metrica-service/tests/unit/test_settings.py#L12-L80>) |
| Health и завершение | [lifespan:17–28](<../../../../../services/ya-metrica-service/src/main.py#L17-L28>), [health:71–73](<../../../../../services/ya-metrica-service/src/main.py#L71-L73>) | [health:15–21](<../../../../../services/ya-metrica-service/tests/api/test_health.py#L15-L21>), [cleanup mock:23–29](<../../../../../services/ya-metrica-service/tests/api/test_counters_api.py#L23-L29>) |

**Ограниченные notes по persistence, lifecycle и metadata**

- **Persistence:** [сборка операции](<../../../../../services/ya-metrica-service/src/containers/services.py#L6-L18>) передаёт только encryption и provider client; [весь путь операции](<../../../../../services/ya-metrica-service/src/core/services/yandex_metrica_service.py#L13-L65>) не использует repository/session. [Repository container](<../../../../../services/ya-metrica-service/src/containers/repositories.py#L1-L7>) объявляет инфраструктурный ресурс, но он не внедрён в эту операцию. [Пакет repositories](<../../../../../services/ya-metrica-service/src/repositories/__init__.py>) и [пакет models](<../../../../../services/ya-metrica-service/src/models/__init__.py>) пусты; [initial migration](<../../../../../services/ya-metrica-service/src/migration/versions/20260710_0001_initial.py#L1-L14>) не создаёт схему. Для счётчиков не заявлены DB persistence, кэш, транзакции, сохранение или обновление токенов. Это не аудит всей DB-инфраструктуры.
- **Lifecycle:** [entrypoint](<../../../../../services/ya-metrica-service/src/main.py#L17-L28>) вызывает конфигурацию Sentry при импорте, wiring route и `close_database()` после yield lifespan; startup readiness-проверка БД/Яндекса здесь не наблюдается. [HTTP-клиент](<../../../../../services/ya-metrica-service/src/clients/yandex_metrica.py#L28-L60>) создаётся на запрос с контекстным закрытием; его ошибки и отмена принадлежат main client-failures. Mock закрытия БД не доказывает реальный connect/dispose.
- **Tracked config defaults, не реальные env:** [settings](<../../../../../services/ya-metrica-service/src/settings.py#L7-L34>) объявляют `ENVIRONMENT=development`, `DEBUG=true`, `APP_TITLE=FastAPI Template`; key имеет декларативное пустое значение, отвергаемое validator. Sentry по умолчанию выключен, sample rate `0.0`; включение требует DSN. `DEBUG` не включает traceback HTTP: [создание app](<../../../../../services/ya-metrica-service/src/main.py#L60-L64>) фиксирует `debug=False`. Настройки PostgreSQL — инфраструктура, не доказательство использования БД операцией. Реальные env/секреты не читались.
- **Metadata drift:** [README:1–3,57–63](<../../../../../services/ya-metrica-service/README.md#L1-L63>) всё ещё описывает пустой template/только health, а [pyproject:1–6](<../../../../../services/ya-metrica-service/pyproject.toml#L1-L6>) содержит `fastapi-template`, `0.1.0`, Python `>=3.14,<3.15`. [README note об xfail](<../../../../../services/ya-metrica-service/README.md#L85-L88>) расходится с [текущим тестом без xfail](<../../../../../services/ya-metrica-service/tests/unit/test_yandex_metrica_service.py#L83-L97>) и текущим обработчиком rows. Это документационный gap, не задача исправления в PLAN-M1.

**Gaps и точный handoff для PLAN-S1 / PLAN-F1**

1. **Наблюдаемое vs нормативное:** отсутствие route auth и синтетические headers не означают валидную сессию. Использовать строки M1/H1 main peer-контракта; полная матрица S1 должна отдельно указать доказанные anonymous outcomes, непроверенный authenticated runtime, роли и private boundary. Не добавлять исключений и не менять глобальные `401/403`.
2. **Sensitive GET query:** зашифрованный token всё равно чувствителен; sanitation приложения не доказывает отсутствие query в access/proxy logs, telemetry или промежуточных системах. S1 фиксирует этот gap вместе с неизвестной production isolation; никаких security/network/logging fixes здесь нет.
3. **Token/key boundary:** tracked поведение не содержит expiry policy, key version/rotation или нескольких ключей; совместимость с внешним producer доказана только форматом, не живым межсервисным прогоном. Новая ротация/refresh/persistence не обещается.
4. **Runtime:** provider доступность, реальная БД и shutdown, bindings/proxy, production credentials и валидные user sessions не проверялись. Health — liveness, не readiness. Это ограничения evidence, а не blocker для planning.
5. **Интеграция F1:** перенести трассировку сценариев в общую risk-based test matrix, отразить отсутствие DB-зависимости операции и metadata drift. Сам PLAN-M1 меняет только эту delta; shared proposal/design/tasks и чужие capability не прочитаны и не изменены. Approval на apply отсутствует.



## Requirements

### Requirement: Query-контракт списка счётчиков
Адаптер SHALL принимать `GET /api/metrica/counters` с обязательным строковым query `access_token`, необязательным `search`, целочисленными `limit` и `offset` по умолчанию `20` и `0`. Проверка типов запроса и доменная обработка токена SHALL оставаться разными границами.

#### Scenario: Параметры по умолчанию
- **WHEN** caller передаёт только пригодный `access_token` и провайдер возвращает пригодный ответ
- **THEN** применяется `search=None`, `limit=20`, `offset=0`, ответ имеет статус `200`

#### Scenario: Отсутствующий токен или неверный тип пагинации
- **WHEN** отсутствует query `access_token` либо `limit/offset` нельзя разобрать как целое число
- **THEN** возвращается безопасный `400` по main peer HTTP-контракту до вызова доменной операции

#### Scenario: Пустые строковые параметры
- **WHEN** caller передаёт `access_token=""` и `search=""`
- **THEN** query-граница принимает строки без нового запрета пустоты, пустой token проходит в расшифровку и при её отказе возвращается `400` без вызова провайдера

### Requirement: Нормализация пагинации и передача поиска
Адаптер SHALL ограничивать `limit` диапазоном `1..100`, заменять отрицательный `offset` на `0` и передавать `search` провайдеру без локальной фильтрации результата. Нормализация чисел SHALL выполняться после query parsing, а не посредством отклонения допустимых целых значений.

#### Scenario: Границы размера страницы
- **WHEN** переданы целочисленные `limit=0` или `limit=200`
- **THEN** провайдер получает соответственно размер страницы `1` или `100`; значения внутри диапазона сохраняются

#### Scenario: Смещение страницы
- **WHEN** передан отрицательный либо неотрицательный `offset`
- **THEN** локальное смещение равно соответственно `0` либо исходному значению, а provider offset равен локальному смещению плюс `1`

#### Scenario: Поиск передаётся провайдеру
- **WHEN** caller задаёт поисковую строку, пустую строку либо не передаёт `search`
- **THEN** adapter передаёт соответственно исходную строку, пустую строку либо `None` как `search_string`, без локального поиска или пересчёта total

### Requirement: Граница зашифрованного токена
Адаптер SHALL расшифровывать входной query token до обращения к провайдеру. Совместимость шифротекста SHALL сохраняться с форматом Fernet и ключом, получаемым как URL-safe base64 от SHA-256 UTF-8 значения `ENCRYPTION_SERVICE_KEY`. Токен MUST NOT трактоваться как user authentication или возвращаться в DTO счётчиков.

#### Scenario: Пригодный шифротекст
- **WHEN** поступает токен, зашифрованный совместимым форматом с тем же секретом
- **THEN** провайдер получает расшифрованную UTF-8 строку, а в ответе caller отсутствуют зашифрованный и открытый токены

#### Scenario: Повреждённый токен или другой ключ
- **WHEN** расшифровка не проходит, включая повреждение либо несовпадающий ключ
- **THEN** провайдер не вызывается, а HTTP-ответ равен `400` с `detail="Ошибка расшифровки токена"`, без вывода токена и текста исходного исключения

#### Scenario: Совместимость шифрования
- **WHEN** одну UTF-8 строку шифруют дважды с одним секретом и затем расшифровывают
- **THEN** оба шифротекста восстанавливают исходную строку, но не обязаны совпадать; смена секрета не обещает расшифровку старых токенов

### Requirement: HTTP-контракт с провайдером
Для получения счётчиков адаптер SHALL вызывать `GET https://api-metrika.yandex.net/management/v1/counters` с `Authorization: OAuth <расшифрованный токен>`, query `per_page`, `offset`, `search_string` и timeout по умолчанию `10.0` секунд. Provider HTTP status MUST NOT напрямую подменять локальный HTTP-контракт.

#### Scenario: Параметры исходящего запроса
- **WHEN** после расшифровки локальная пагинация равна `limit=20, offset=0` и задан поиск
- **THEN** исходящий запрос содержит `per_page=20`, `offset=1`, исходный поиск в `search_string` и OAuth header с открытым токеном, но не token query провайдера

#### Scenario: Граница успешного provider ответа
- **WHEN** провайдер отвечает успешным HTTP с JSON-объектом, пригодными `rows` и списком `counters`
- **THEN** ответ передаётся для формирования локального `total/items`; lifecycle клиента и все непригодные ответы обрабатываются по main client-failures, без дополнительного retry-контракта

### Requirement: DTO списка и семантика total
Адаптер SHALL возвращать JSON `{"total": <int>, "items": [...]}`, где каждый item содержит только `counter_id: int` и `site: str`. `total` SHALL происходить из целочисленного преобразования provider `rows`, а не из длины страницы. Правила частичных и непригодных ответов SHALL определяться существующей capability `yandex-client-failures`.

#### Scenario: Преобразование полей
- **WHEN** пригодный provider ответ содержит `rows="2"` и счётчик `{"id":"42","site":"example.org","extra":"ignored"}`
- **THEN** локальный ответ содержит `total=2` и item `{"counter_id":42,"site":"example.org"}`, без provider id/extra и без секретных полей

#### Scenario: Частичная страница сохраняет порядок и total
- **WHEN** в пригодном списке вперемешку находятся корректные и некорректные счётчики
- **THEN** корректные элементы возвращаются в исходном порядке, некорректные пропускаются согласно main client-failures, а total не пересчитывается по числу оставшихся items

#### Scenario: Пустые items не обнуляют total
- **WHEN** provider `rows="12"`, а список пуст либо все элементы пропущены
- **THEN** сохраняется успешный ответ `{"total":12,"items":[]}` без запроса дополнительной страницы

### Requirement: Применение существующего безопасного error-контракта
Адаптер SHALL применять main `yandex-client-failures` и `yandex-peer-http-contract` к отказам расшифровки, provider HTTP/lifecycle, top-level ответа и HTTP-валидации. Этот baseline MUST NOT вводить альтернативную классификацию ошибок, raw upstream payload, отражение query input или новые допустимые HTTP-статусы.

#### Scenario: Сквозная ошибка провайдера
- **WHEN** возникают timeout, transport/HTTP failure, невалидный JSON или непригодные `rows/counters`
- **THEN** выполняется существующее безопасное преобразование client failure в локальный `400` с `detail`, без секрет-маркера в ответе и контролируемых приложением логах; частичный `200` не маскирует отказ всего ответа

### Requirement: Конфигурационная граница ключа
Адаптер SHALL требовать непустой `ENCRYPTION_SERVICE_KEY` при загрузке конфигурации. Это требование SHALL действовать независимо от `ENVIRONMENT`; отсутствие значения MUST NOT превращаться в успешный запрос к провайдеру с неявным ключом.

#### Scenario: Отсутствующий ключ
- **WHEN** tracked конфигурация загружается без `ENCRYPTION_SERVICE_KEY` либо с пустой строкой
- **THEN** загрузка конфигурации отклоняется до обслуживания запроса; это ошибка конфигурации, а не обещанный HTTP `400` startup/lifespan

### Requirement: Health отражает живость приложения
`GET /health` SHALL возвращать `200 {"status":"ok"}` при успешной обработке запроса. Этот ответ MUST NOT считаться доказательством готовности PostgreSQL, доступности Яндекса, правильности токена или production isolation.

#### Scenario: Health без provider проверки
- **WHEN** вызывается `/health` без cookies и provider токена
- **THEN** handler возвращает `{"status":"ok"}` без обращения за счётчиками или проверки БД

