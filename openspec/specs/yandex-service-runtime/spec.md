# Эксплуатационный baseline yandex-service

## Purpose

Зафиксировать существующие настройки, health, композицию ресурсов и lifecycle yandex-service отдельно от OAuth/accounts и gateway. Это ретроспективный эксплуатационный контракт, а не новая runtime-функция или обещание production readiness.

### Границы evidence и ownership (контекст delta)

PLAN-Y3 по [заданию 097](<../../../../../docs/tasks/097_yandex_services_retrospective_specs.md>). Единственный изменяемый артефакт unit — эта delta. Общие proposal/design/tasks и регистрация capability в proposal принадлежат F1; consolidated access — S1. Approval на service change отсутствует. Нормативные SHALL ниже фиксируют наблюдаемый функциональный baseline, не разрешают небезопасные практики или deployment.

Service HEAD подтверждён: `d3cf1dc5879d5ebc2f75bbdb437ca657cf1a4de4`, рабочее дерево чистое. Root baseline `457be4391fa800214ce6939030d3e125962b89be` и dirty overlay приняты из handoff Y1; корневой diff здесь не исследован. Main specs читаются из overlay, не выдаются за содержимое root HEAD. Тесты ниже прочитаны, **не запущены**. Реальные ENV/credentials не читались, значения ниже — только tracked defaults.

Ошибки и HTTP outcomes не определяются повторно: действуют [граница клиента и закрытие HTTP client](<../../../../specs/yandex-client-failures/spec.md#L7-L29>), [безопасная диагностика](<../../../../specs/yandex-client-failures/spec.md#L31-L41>), [локальные HTTP-статусы и framework errors](<../../../../specs/yandex-peer-http-contract/spec.md#L7-L33>). OAuth/token refresh и business gateway остаются в [Y1](<../yandex-oauth-accounts/spec.md>) и [Y2](<../yandex-metrica-gateway/spec.md>).

### Конфигурационный каталог (контекст delta)

Все строки получены из [tracked settings](<../../../../../services/yandex-service/src/settings.py#L7-L59>). Обязательность относится к созданию соответствующей settings-модели, не обязательно ко всему startup.

| Группа | ENV aliases → поля | Required / tracked defaults и ограничения |
|---|---|---|
| Приложение | `ENVIRONMENT` → `environment`; `DEBUG` → `debug`; `APP_TITLE` → `app_title` | `development`; `true`; `FastAPI Template`. `DEBUG` не включает HTTP traceback |
| Sentry | `SENTRY_ENABLED` → `sentry_enabled`; `SENTRY_DSN` → `sentry_dsn`; `SENTRY_ENVIRONMENT` → `sentry_environment`; `SENTRY_TRACES_SAMPLE_RATE` → `sentry_traces_sample_rate`; `SENTRY_RELEASE` → `sentry_release` | `false`; пустая строка; `development`; `0.0` с границами `0..1`; `None`. Непустой DSN обязателен только при enablement |
| PostgreSQL | `POSTGRES_USER` → `postgres_user`; `POSTGRES_PASSWORD` → `postgres_password`; `POSTGRES_HOST` → `postgres_host`; `POSTGRES_PORT` → `postgres_port`; `POSTGRES_DB` → `postgres_db` | `app`; `app`; `localhost`; `5432` (int); `app`. Это defaults исходников, не найденные credentials окружения и не production recipe |
| Шифрование | `ENCRYPTION_SERVICE_KEY` → `enctyption_service_key` | Default пустая строка, но итоговая валидация отклоняет её во всех environments. Опечатка имени Python-поля реальна; ENV alias без опечатки. Whitespace/strength/rotation validation здесь не доказаны |
| OAuth-приложение | `YANDEX_APP_CLIENT_ID` → `yandex_app_client_id`; `YANDEX_APP_CLIENT_SECRET` → `yandex_app_client_secret`; `YANDEX_APP_REDIRECT_URI` → `yandex_app_redirect_uri` | Все три обязательны, без defaults. Объявлены `str`, не специализированные URL-типы; непустота отдельно не ограничена |
| Peer Метрики | `YA_METRTICA_SERVICE_URL` → `ya_metrica_service_url` | Обязателен без default; опечатка `METRTICA` является фактическим alias. Правильно написанный `YA_METRICA_SERVICE_URL` его не заменяет; поле `str`, не URL-валидатор |

`Settings` и `YandexAppSettings` объявляют UTF-8 dotenv по пути корня сервиса, вычисленному относительно исходника, и `extra="ignore"`. `YandexMetricaServiceSettings` **не** объявляет такой `model_config`: наличие alias не доказывает загрузку peer URL из того же dotenv. Файл dotenv не открывался. Глобальный `settings = Settings()` создаётся при импорте; DI singleton app settings — отдельная инстанциация, не тот же объект. Cached `database_url` собирается как `postgresql+asyncpg://…` из пяти PostgreSQL полей; изменения поля после первого чтения не пересчитывают URL. URL с credentials не является допустимым diagnostic payload.

### Композиция и владение ресурсами (контекст delta)

| Узел | Область жизни / владелец | Граница доказанного |
|---|---|---|
| Composition root | [application](<../../../../../services/yandex-service/src/containers/application.py#L6-L13>) создаёт settings/clients/repositories/services containers; [main](<../../../../../services/yandex-service/src/main.py#L39-L41>) wire пяти API modules и сохраняет services container в app state | Нет startup `init_resources` или shutdown всех контейнеров в lifespan |
| Settings providers | [три Singleton](<../../../../../services/yandex-service/src/containers/settings.py#L6-L9>) | Ленивые модели; не единый объект с глобальным settings |
| Clients | [Factory providers](<../../../../../services/yandex-service/src/containers/clients.py#L6-L18>) получают OAuth fields и peer URL из settings providers | Это не application-owned HTTP pool и не DI Resource. Закрытие request-local HTTP client регулирует main client-failures contract; новый механизм disposal не вводится |
| Services | [Factory graph](<../../../../../services/yandex-service/src/containers/services.py#L13-L45>): encryption ← app key; OAuth ← client/encryption/user repository; accounts ← user repository; authorization ← encryption/user repository; metrica ← peer client/encryption/user repository; counter binding ← counter/user repositories | Шифрование и сервисы не Singleton. Business contracts не повторяются |
| Repository/session | [ContextLocalResource и два Factory repository](<../../../../../services/yandex-service/src/containers/repositories.py#L7-L11>); [get_session](<../../../../../services/yandex-service/src/depends/utils.py#L8-L10>) владеет async session context | Context-local reuse не означает глобальную общую сессию; `get_session` сам не commit/rollback |
| Route transaction | [TransactionalRoute](<../../../../../services/yandex-service/src/utils/transactional_route.py#L10-L30>) получает session, входит в `begin()`, завершает resource в `finally` | Это владелец request transaction; background/streaming должны владеть своими сессиями. Существующие business transaction scenarios остаются Y1 |
| Engine | [database](<../../../../../services/yandex-service/src/utils/database.py#L8-L18>) создаёт module-level engine/session factory; [lifespan](<../../../../../services/yandex-service/src/main.py#L33-L36>) вызывает dispose через close_database после yield | Не startup SQL probe. Нет обещания аварийного disposal, deadline или draining |

### Access matrix — наблюдение, не security approval (контекст delta)

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/health` | Public Read, статический health | Роли не проверяются | `200`, `{"status":"ok"}` при обработке запроса | Тот же `200` и payload; source не содержит auth dependency, тест с заголовками использует fake caller, а не доказанную валидную identity |

Исключения из GET Public Read отсутствуют. Это не разрешение публиковать сервис или его business API. Anonymous evidence и header-bearing evidence: [health tests](<../../../../../services/yandex-service/tests/api/test_health.py#L31-L38>) и [AUTH_HEADERS](<../../../../../services/yandex-service/tests/api/conftest.py#L28-L28>). Валидная authenticated session/role интеграция не доказана; S1 консолидирует этот gap. Ошибки запроса и неканонические method/path регулируются peer contract, а не новой политикой этой delta. Автоматические docs endpoints уже покрывает peer contract; их [наличие в tests](<../../../../../services/yandex-service/tests/api/test_health.py#L41-L48>) не создаёт здесь второй access-нормы.



## Requirements

### Requirement: Явная конфигурация приложения
Сервис SHALL читать конфигурацию по aliases и defaults каталога, сохраняя различие process environment и явно объявленного dotenv. Требуемые значения SHALL проверяться при создании соответствующей settings-модели; baseline MUST NOT обещать eager-проверку всех DI settings при startup.

#### Scenario: Y3-01 — Defaults и aliases приложения
- **WHEN** создаётся общая конфигурация с непустым encryption key без переопределений остальных полей либо с ENV aliases приложения и PostgreSQL
- **THEN** без переопределений действуют tracked defaults каталога, а заданные aliases переопределяют соответствующие поля; cached database URL не меняется от последующей мутации PostgreSQL поля после первого чтения

#### Scenario: Y3-02 — Область dotenv не переносится на peer модель
- **WHEN** проверяются источники настроек общей, OAuth и peer моделей
- **THEN** только первые две явно объявляют вычисленный UTF-8 dotenv и игнорирование дополнительных dotenv полей; наличие общего dotenv не считается доказательством конфигурации обязательного peer URL

### Requirement: Валидация encryption key независимо от environment
Общая конфигурация SHALL отклонять отсутствующий или равный пустой строке `ENCRYPTION_SERVICE_KEY` независимо от `ENVIRONMENT`. Этот контракт MUST NOT трактоваться как проверка криптографической стойкости или управление ротацией ключа.

#### Scenario: Y3-03 — Отсутствующий или пустой ключ
- **WHEN** создаётся общая конфигурация без encryption key либо с пустой строкой
- **THEN** возникает ошибка валидации с указанием имени обязательной переменной, а глобальная конфигурация не может успешно завершить импорт

#### Scenario: Y3-04 — Непустой ключ и фактическое имя поля
- **WHEN** создаётся общая конфигурация с непустым `ENCRYPTION_SERVICE_KEY`
- **THEN** значение доступно через фактическое поле `enctyption_service_key`, без заявлений о проверке длины, whitespace, entropy или key rotation

### Requirement: Обязательная конфигурация внешних клиентов
При разрешении клиентских зависимостей сервис SHALL требовать три OAuth aliases и peer alias `YA_METRTICA_SERVICE_URL` из каталога. Строковый тип этих полей MUST NOT выдаваться за проверку URL или непустоты.

#### Scenario: Y3-05 — Отсутствующее обязательное OAuth поле
- **WHEN** создаётся OAuth settings-модель без одного из трёх обязательных aliases
- **THEN** создание завершается ошибкой валидации с именем отсутствующего alias, а не подстановкой выдуманного default

#### Scenario: Y3-06 — Опечатка peer alias значима
- **WHEN** в process environment есть только `YA_METRICA_SERVICE_URL`, но отсутствует `YA_METRTICA_SERVICE_URL`, и создаётся peer settings-модель
- **THEN** обязательное поле не считается заполненным; при наличии фактического alias его строка передаётся в peer client provider

### Requirement: Явное включение Sentry
Сервис SHALL инициализировать Sentry только при enablement, требуя непустой DSN и rate в диапазоне `0..1`. При включении SHALL передаваться environment, release, rate, FastAPI/SQLAlchemy integrations и `send_default_pii=false`; это MUST NOT считаться доказательством полной sanitization телеметрии.

#### Scenario: Y3-07 — Наблюдаемость выключена
- **WHEN** конфигурация имеет `SENTRY_ENABLED=false` и вызывается настройка Sentry
- **THEN** SDK init не вызывается; отсутствие DSN допустимо, а constraints rate продолжают действовать на settings-модели

#### Scenario: Y3-08 — Включённая конфигурация и её границы
- **WHEN** включается Sentry с непустым DSN и rate `0` либо `1`, или проверяется конфигурация с пустым DSN либо rate вне `0..1`
- **THEN** допустимые значения передаются SDK вместе с integrations и отключённым default PII, а недопустимые отклоняются settings-моделью; фактическая отправка событий этим не доказывается

### Requirement: Статический health без проверки зависимостей
Успешный `GET /health` SHALL возвращать `200` с единственным полем `status=ok`, без получения DB session или вызовов business services. Ответ MUST NOT интерпретироваться как readiness PostgreSQL, upstream Яндекса, peer сервиса или валидность всех ленивых settings.

#### Scenario: Y3-09 — Anonymous health
- **WHEN** приложение обрабатывает anonymous `GET /health`
- **THEN** ответ равен `200` и `{"status":"ok"}`, без открытия request session и вызова business services

#### Scenario: Y3-10 — Health с credential-bearing заголовками
- **WHEN** то же приложение обрабатывает `GET /health` с Authorization/Cookie
- **THEN** ответ остаётся тем же без проверки ролей и dependency readiness; static test с fake заголовками не считается подтверждением реальной аутентификации

### Requirement: Startup не является dependency readiness gate
Сервис SHALL настраивать logger/Sentry и composition wiring при импорте приложения, публикуя container в app state. Вход в lifespan SHALL не инициализировать request sessions и не выполнять явный SQL/upstream readiness probe.

#### Scenario: Y3-11 — Создание приложения и импортные ограничения
- **WHEN** приложение успешно импортировано с допустимой общей конфигурацией
- **THEN** title берётся из APP_TITLE, composition wiring выполнен, container доступен в app state; ошибки импорта/конфигурации не обещаны как HTTP error responses

#### Scenario: Y3-12 — Вход в lifespan
- **WHEN** начинается lifespan приложения
- **THEN** выполнение достигает yield без вызова close_database и без явного открытия session или SQL probe; это не гарантирует доступности зависимостей

### Requirement: Освобождение engine при штатном shutdown
После штатного выхода из lifespan сервис SHALL await закрытие базы через dispose module-level async engine. Baseline MUST NOT обещать выполнение после process kill, при исключении внутри yield или гарантированный timeout/порядок disposal всех внешних ресурсов.

#### Scenario: Y3-13 — Штатное завершение lifespan
- **WHEN** контекст lifespan завершается без исключения
- **THEN** close_database ожидается ровно один раз после yield, а не при startup

#### Scenario: Y3-14 — Делегирование закрытия engine
- **WHEN** вызывается close_database
- **THEN** ожидается dispose текущего async engine; тест с mock не является доказательством завершения реальных PostgreSQL connections или аварийного cleanup

### Requirement: Владение DI ресурсами и изоляция sessions
Композиция SHALL предоставлять settings как singleton providers, clients/services/repositories как factories, session как context-local resource. Сессия SHALL переиспользоваться в текущем контексте и отделяться от параллельного контекста, завершаясь через её async context manager, а не оставаясь общей на всё приложение.

#### Scenario: Y3-15 — Провайдеры и граф зависимостей
- **WHEN** повторно разрешаются settings и factories сервисов с подменённой session
- **THEN** settings provider сохраняет identity, factory создаёт новый service, а соответствующие repositories получают session своего resource; зависимости соответствуют таблице композиции, без нового app-owned HTTP pool

#### Scenario: Y3-16 — Параллельные контексты и освобождение
- **WHEN** два независимых async контекста получают context-local session и затем завершают resource
- **THEN** в каждом контексте session переиспользуется, между контекстами sessions различны, а каждый session context завершается; get_session сам не выполняет commit или rollback

### Requirement: Различение session lifecycle и transaction ownership
Сервис SHALL сохранять request transaction ownership за transactional route и освобождать его session resource в finally. Отдельный helper get_db SHALL завершать успешный yield commit, обычную ошибку rollback и всегда закрывать session; он MUST NOT выдаваться за фактическую DI request dependency.

#### Scenario: Y3-17 — Request session lifecycle
- **WHEN** transactional route завершает обработку либо получает исключение
- **THEN** её transaction context завершается до возврата ответа, а session resource shutdown вызывается в finally; бизнес-outcomes и ошибки остаются в Y1 и main contracts

#### Scenario: Y3-18 — Отдельный helper не подменяет DI
- **WHEN** проверяется get_db отдельно при успехе, ошибке тела или commit
- **THEN** успех выполняет commit, обычная ошибка выполняет rollback и повторно выбрасывается, finally закрывает session; это не добавляет второго commit в get_session

### Requirement: Эксплуатационные границы HTTP и DB конфигурации
Сервис SHALL оставлять HTTP debug отключённым независимо от DEBUG и не добавлять CORS headers. DEBUG SHALL выбирать NullPool при true и стандартный pool SQLAlchemy при false; baseline MUST NOT приписывать сервису backend pool env или новые CORS knobs.

#### Scenario: Y3-19 — Debug и CORS не наследуются из шаблона
- **WHEN** общая настройка DEBUG=true и выполняется `GET /health` с Origin
- **THEN** ASGI app сохраняет debug=false и ответ не содержит access-control-allow-origin/credentials; catalog не содержит cors_origins, а HTTP error handlers остаются под существующим peer contract

#### Scenario: Y3-20 — DB engine и session factory
- **WHEN** создаётся module-level engine при DEBUG=true либо false
- **THEN** используется соответственно NullPool либо стандартный pool без явно заданных pool sizing/pre_ping/recycle, а session factory имеет expire_on_commit=false и autoflush=false; настройки DB_POOL_* основного backend не считаются поддержанными здесь

### Coverage: source → requirement/scenario → evidence (контекст delta)

Ссылки относятся к подтверждённому service HEAD; каждая строка даёт проверяемое static evidence, не runtime PASS.

| Источник | Requirement / scenarios | Тестовое evidence и границы |
|---|---|---|
| [Settings и dotenv](<../../../../../services/yandex-service/src/settings.py#L7-L59>) | Явная конфигурация; Y3-01..02 | [Defaults/cache/aliases](<../../../../../services/yandex-service/tests/unit/test_settings.py#L23-L35>), [aliases](<../../../../../services/yandex-service/tests/unit/test_settings.py#L63-L90>); различие model_config — source inspection, отдельного dotenv test не найдено в прочитанном файле |
| [Key validator](<../../../../../services/yandex-service/src/settings.py#L27-L37>) | Валидация encryption key; Y3-03..04 | [Missing/empty](<../../../../../services/yandex-service/tests/unit/test_settings.py#L38-L42>), [поле с опечаткой](<../../../../../services/yandex-service/tests/unit/test_settings.py#L82-L86>); все environments — отсутствие условной ветки в source |
| [Client settings](<../../../../../services/yandex-service/src/settings.py#L47-L56>), [providers](<../../../../../services/yandex-service/src/containers/clients.py#L9-L18>) | Обязательная конфигурация клиентов; Y3-05..06 | [Required/alias spelling](<../../../../../services/yandex-service/tests/unit/test_settings.py#L93-L111>) |
| [Sentry validator](<../../../../../services/yandex-service/src/settings.py#L15-L37>), [SDK config](<../../../../../services/yandex-service/src/utils/configure_sentry.py#L8-L19>) | Явное включение Sentry; Y3-07..08 | [Rate/DSN](<../../../../../services/yandex-service/tests/unit/test_settings.py#L45-L60>), [mock init, без export](<../../../../../services/yandex-service/tests/unit/test_observability.py#L34-L60>) |
| [Health](<../../../../../services/yandex-service/src/main.py#L89-L91>) | Статический health; Y3-09..10 | [Anonymous и fake headers, без services/session](<../../../../../services/yandex-service/tests/api/test_health.py#L31-L38>); настоящая identity — gap |
| [Import, wiring, app](<../../../../../services/yandex-service/src/main.py#L22-L41>), [app state](<../../../../../services/yandex-service/src/main.py#L75-L78>) | Startup не readiness gate; Y3-11..12 | [Lifespan mock](<../../../../../services/yandex-service/tests/api/test_lifespan.py#L10-L16>), [logger mock](<../../../../../services/yandex-service/tests/unit/test_observability.py#L12-L31>); отсутствие startup probe — source inspection |
| [Lifespan](<../../../../../services/yandex-service/src/main.py#L33-L36>), [dispose](<../../../../../services/yandex-service/src/utils/database.py#L49-L50>) | Освобождение engine; Y3-13..14 | [Mock shutdown](<../../../../../services/yandex-service/tests/api/test_lifespan.py#L10-L16>), [mock dispose](<../../../../../services/yandex-service/tests/unit/test_database.py#L64-L68>) |
| [Settings providers](<../../../../../services/yandex-service/src/containers/settings.py#L6-L9>), [repository resource](<../../../../../services/yandex-service/src/containers/repositories.py#L7-L11>), [service graph](<../../../../../services/yandex-service/src/containers/services.py#L13-L45>) | Владение DI; Y3-15..16 | [Graph/reuse](<../../../../../services/yandex-service/tests/unit/test_containers.py#L26-L64>), [concurrent resource cleanup](<../../../../../services/yandex-service/tests/unit/test_containers.py#L67-L97>), [get_session exit](<../../../../../services/yandex-service/tests/unit/test_dependencies.py#L9-L29>); всё с fake sessions |
| [Route resource boundary](<../../../../../services/yandex-service/src/utils/transactional_route.py#L20-L28>), [get_db](<../../../../../services/yandex-service/src/utils/database.py#L37-L46>) | Session/transaction ownership; Y3-17..18 | [Helper success/body/commit error](<../../../../../services/yandex-service/tests/unit/test_database.py#L35-L61>), [API harness transaction assertions](<../../../../../services/yandex-service/tests/api/conftest.py#L119-L122>); бизнес-трассировка route transaction уже в Y1 |
| [ASGI app и boundary](<../../../../../services/yandex-service/src/main.py#L44-L78>), [engine/factory](<../../../../../services/yandex-service/src/utils/database.py#L8-L34>) | HTTP/DB границы; Y3-19..20 | [CORS absence](<../../../../../services/yandex-service/tests/api/test_health.py#L22-L28>), [helper constructors](<../../../../../services/yandex-service/tests/unit/test_database.py#L12-L32>); module-level DEBUG branch — source inspection, не test полного pooling |

### Actual execution — только static observation (контекст delta)

[Dockerfile](<../../../../../services/yandex-service/Dockerfile#L1-L16>) объявляет Python 3.14.6-slim, PYTHONPATH=/app/src, locked non-dev dependency install и запуск `uv run --no-sync uvicorn main:app --app-dir src --host 0.0.0.0 --port 8000`. Это tracked CMD, не доказательство запущенного container/порта, migrations или production process management. Отдельного entrypoint в tracked CMD нет; lifecycle не запускает migrations. [Makefile](<../../../../../services/yandex-service/Makefile#L8-L21>) разделяет non-infrastructure и infrastructure pytest; ни Make, ни runtime команды здесь не запускались. Отсутствие deployment audit намеренное.

### Нормативные сопоставления и gaps для S1/F1 (контекст delta)

- GAP-Y3-READINESS: static health и успешный импорт не доказывают подключение PostgreSQL, доступность peer/OAuth либо заполненность ленивых settings. Не вводится readiness endpoint или startup probe. Реальная PG/disposal/нагрузка не проверялись.
- GAP-Y3-SHUTDOWN: lifespan содержит yield, затем dispose без try/finally вокруг yield. Ошибка/отмена, graceful deadlines, draining, Sentry flush, закрытие всех containers не доказаны. Client factories не являются DI Resources; application shutdown клиентского pool не обещается. Client cleanup — существующее требование main client-failures, не новый recipe.
- GAP-Y3-CONFIG: whitespace encryption key и пустые строки обязательных client fields отдельно не запрещены; URL validation, escaping credentials в database_url, hot reload/rotation не доказаны. У общей модели есть eager import validation, у DI моделей — отдельные lazy instances. Не заполнять неизвестные operational значения догадками.
- GAP-Y3-POOL: [main pooling requirement](<../../../../specs/database-connection-pooling/spec.md#L6-L36>) явно относится к services/backend. Его размеры, pre_ping, recycle и DB_POOL_* не переносятся на yandex-service; здесь только DEBUG branch. Session isolation tests — fake, не PostgreSQL isolation evidence.
- GAP-Y3-TELEMETRY: [Sentry requirement](<../../../../specs/platform-observability/spec.md#L9-L22>) перечисляет Core/Email/Notification, а Yandex фактически использует совместимые ENV names, не автоматически получает их production guarantee. `send_default_pii=false` и WARNING для httpx в [logger](<../../../../../services/yandex-service/src/utils/configure_logger.py#L4-L13>) не доказывают удаления секретов из всех logs/events. [Защита чувствительных данных](<../../../../specs/platform-observability/spec.md#L69-L82>) и main safe-diagnostics сохраняют силу; source secret logging не узаконивается. GAP-Y1-LOG остаётся в Y1 без повторного расследования.
- GAP-Y3-PEER-ENV: [межсервисный URL из ENV](<../../../../specs/service-env-and-clients/spec.md#L33-L38>) соотносится с peer URL, но alias содержит историческую опечатку. [MAIN_BACKEND_URL/SERVICE_KEY](<../../../../specs/service-env-and-clients/spec.md#L20-L31>) условны для обращающихся к backend; в прочитанном operational graph такой клиент не обнаружен. Добавлять эти переменные без отдельного evidence нельзя.
- GAP-Y3-ACCESS: только `/health` проверен в пределах slice; S1 получает public/static результат и ограничение fake authenticated evidence. CORS отсутствует, что не является auth barrier. Перечень зарегистрированных ошибок: AppError, RequestValidationError, HTTPException, ResponseValidationError плюс SafeHttpErrorBoundary; обработка исключений после начала ответа и не-HTTP scope ограничена существующим peer contract. Регистрация auth/register и docs/routing outcomes не переписываются здесь.

### Передача в синтез (контекст delta)

F1 добавляет `yandex-service-runtime` в общий proposal, execution units/DAG и grouped test matrix/tasks; PLAN-Y3 не получает права редактировать shared artifacts. Рекомендуемая зависимость: `{Y1, Y2, M1, Y3} → S1 → F1 → approval gate`. Для S1 достаточно этой access matrix и gaps, для F1 — этой delta и предыдущих handoffs. Никаких новых runtime tasks, sync/archive или сервисных tests этим unit не выполнено.
