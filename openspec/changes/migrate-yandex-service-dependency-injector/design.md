## Context

Текущий граф: depends.clients → depends.repositories(session) → depends.services(client, repository, encryption). `get_session` делает commit после успеха, rollback при исключении и close в finally. `utils.database` содержит глобальные engine/sessionmaker и дублирующую session-зависимость. Settings/YandexAppSettings создаются при импорте; settings используются также Sentry и Alembic.

Пользователь уже добавил dependency-injector в pyproject/uv.lock и создал containers; его изменения сохраняются и развиваются. Baseline от Router: `uv run --no-sync pytest -q` — 8 passed. Более широкий untracked `docs/tasks/095_refactoring_dependency_injector_specs.md` не является scope этого change; источник — согласованный текущий запрос пользователя.

## Goals / Non-Goals

**Goals:** полный отказ от FastAPI Depends и src/depends; контейнерный bootstrap; независимые sessions для конкурентных запросов; прежний API и настройки.

**Non-Goals:** изменение бизнес-классов, OAuth HTTP transport, схемы БД, auth policy, DTO, маршрутов и других сервисов. Единственный tooling prerequisite — регистрация yandex-service в scripts/stackctl для штатной локальной проверки изменённого сервиса.

## Decisions

### Application composition

- SettingsContainer содержит независимые lazy Singleton Settings, SentrySettings и YandexAppSettings. В settings.py остаются определения классов без глобальных instances. Сохраняются ENV, public names/опечатки, validation encryption key и database_url.
- DatabaseContainer содержит async Resource engine и Factory sessionmaker: прежний выбор NullPool по debug, expire_on_commit=False, autoflush=False. Resource использует async context manager из utils/database.py, создающий engine существующим helper и вызывающий await engine.dispose() в finally. Приложение владеет lifecycle через init_resources/shutdown_resources. Первоначальная реализация Singleton/manual dispose отражена в завершённых DI tasks; этот выбор заменён согласованным RESOURCE follow-up.
- ClientsContainer содержит Singleton OAuth client. SharedServicesContainer содержит Singleton encryption. Client безопасен как Singleton: хранит конфигурацию, httpx.AsyncClient по-прежнему создаётся внутри вызова.
- RepositoriesContainer содержит session Dependency и Factory repository. ServicesContainer содержит dependencies repository/client/encryption и Factory OAuth service. ApplicationContainer объединяет общие контейнеры и Factory request_scope; root находится в containers/application.py.
- Не использовать Resource/Closing для sessions или общий provider.override на запрос. Resource глобально кеширует экземпляр; Closing в установленном 4.49.1 не передаёт исключение shutdowner, поэтому commit после yield может выполнить запись при ошибке.

### Request composition и транзакция

Factory request_scope после await provider.async_() возвращает обычный async context manager с разрешённым sessionmaker и общими client/encryption. Async engine делает зависимые providers асинхронными; ApplicationContainer явно включает request_scope.enable_async_mode(), чтобы sync overrides сохраняли awaitable контракт. При входе создаётся новая session и новый RequestContainer с `session=providers.Object(session)`, client/encryption Object. Внутри него `providers.Container(RepositoriesContainer, session=session)` и `providers.Container(ServicesContainer, repositories=repositories, client=client, encryption=encryption)`; repository Factory получает session Dependency, OAuth Factory — repository provider. Эти constructor bindings принадлежат новому private instance и не меняют application graph.

Endpoint принимает Request и выполняет `scope_context = await request.app.state.container.request_scope.async_()` и `async with scope_context as scope`, затем получает `scope.services.yandex_oauth_service()` и вызывает прежний бизнес-метод. Scope охватывает создание графа, вызов и commit. Успех → commit; BaseException, включая ошибку сборки/commit и CancelledError → rollback, повторное возбуждение; close всегда. Сессии не создаются на startup и не передаются background tasks.

### Bootstrap и инструменты

`create_app(container=None)` создаёт ApplicationContainer по умолчанию или использует переданный тестовый контейнер. Container сохраняется в app.state.container. HTTP bootstrap разрешает три settings provider, передаёт SentrySettings в configure_sentry(settings:SentrySettings), регистрирует прежние routes/handlers. `app = create_app()` сохраняет main:app. Тесты передают независимые контейнеры с Object settings и fake providers; никаких request-time shared overrides.

Alembic создаёт SettingsContainer и разрешает только Settings; YandexAppSettings и SentrySettings остаются lazy, поэтому OAuth ENV и валидная Sentry configuration не требуются. Alembic продолжает владеть своим migration engine. Encryption key по существующей Settings validation остаётся обязательным. README описывает scopes, app factory и запуск Alembic. Ruff first-party заменяет depends на containers и включает используемые локальные пакеты.

## Follow-up: отдельные настройки Sentry (2026-10-14)

Прямое поручение пользователя продолжает уже согласованную миграцию; повторное approval не требуется. Deliverable SENTRY принадлежит Backend: не более восьми runtime/test/documentation файлов в одном сервисе. Проверка этого продолжения ограничена новым diff и не перезапускает завершённые QG lanes. Исторический root QG-FORMAT остаётся BLOCKED: не очищать worktree, не создавать commit, не закрывать sync/archive без ранее требуемого gate.

В `src/settings.py` определить `SentrySettings(BaseSettings)` с пятью прежними полями `sentry_enabled`, `sentry_dsn`, `sentry_environment`, `sentry_traces_sample_rate`, `sentry_release`. Сохранить имена, aliases `SENTRY_*`, defaults, `ge=0.0`, `le=1.0` и прежний `.env` config. Перенести проверку enabled/DSN в SentrySettings. Settings содержит только app/DB/encryption поля, прежний encryption validator и database_url; legacy Sentry reexports и глобальные instances не добавлять. Независимый lazy `SettingsContainer.sentry_settings = providers.Singleton(SentrySettings)` разрешается в create_app и передаётся configure_sentry. SDK init сохраняет прежние kwargs и integrations. Alembic runtime остаётся без изменений: разрешает только Settings.

| Unit | Профиль | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| SENTRY-1 | Backend | src/settings.py, src/containers/settings.py, src/main.py, src/utils/configure_sentry.py, tests/conftest.py, tests/api/test_app_di.py, tests/unit/test_sentry_settings.py, README.md (при необходимости) | DI-2 (done) | focused pytest, style/type checks затронутых файлов | design.md#follow-up-отдельные-настройки-sentry-2026-10-14; spec.md требования «Bootstrap и teardown»/«Независимые настройки Sentry»; названные runtime/test файлы; src/migration/env.py (read-only) |
| SENTRY-QA | Quality Gate | read-only затронутый service diff; только SENTRY-QA checklist/evidence | SENTRY-1 | focused pytest/styles/types, localhost health, strict OpenSpec validate | design.md#test-matrix-sentry; spec.md#requirement-независимые-настройки-sentry; SENTRY-1 handoff; tasks.md#11-sentry-qa; stack-control/api-smoke-test skills для live проверки |

DAG продолжения: SENTRY-1 → SENTRY-QA. SENTRY-QA объединяет применимые backend/contract/live/synthesis проверки в один bounded unit. Frontend, schema migration, новые endpoint/access scenarios, NATS, OAuth network и повторный общий QG pipeline неприменимы: меняется только bootstrap configuration.

## Follow-up: Resource lifecycle DB engine (2026-10-14)

Прямое поручение пользователя «Давай переделаем» продолжает миграцию; повторное approval не требуется. Settings, encryption и OAuth wrapper остаются Singleton: у настроек/encryption нет close, wrapper хранит конфигурацию и создаёт HTTP client в существующем async with на каждый вызов. Sentry SDK не получает нового lifecycle. Alembic владеет отдельным engine и остаётся неизменным.

Engine — единственный новый async Resource. Helper в utils/database.py использует @asynccontextmanager: создать engine с прежними SQLAlchemy параметрами, try/yield, finally/await dispose. Lifespan выполняет try: await container.init_resources(); yield; finally: await container.shutdown_resources(). Try охватывает startup, поэтому уже инициализированные ресурсы освобождаются и при ошибке init_resources, а также при ошибке тела lifespan; ошибки shutdown не подавляются.

DatabaseContainer.session_factory становится providers.Factory(make_async_session_factory, engine=engine). Кеширующий Singleton sessionmaker мог бы удержать disposed engine после shutdown/reinit Resource; Factory каждый раз связывает sessionmaker с текущим engine. У sessionmaker нет отдельного закрываемого lifecycle. Async mode распространяется от engine к session_factory и root request_scope; явный request_scope.enable_async_mode() закрепляет awaitable контракт при синхронных тестовых overrides. Endpoints получают context manager через await request_scope.async_() и только затем входят в async with. Helper containers/request.py, private Object graph, Factory repositories/services и commit/rollback/close остаются прежними; Resource/Closing не управляют request-транзакцией.

| Unit | Профиль | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| RESOURCE-1 | Backend | src/utils/database.py, src/containers/database.py, src/containers/application.py, src/main.py, src/api/yandex_auth.py, tests/conftest.py, tests/api/test_app_di.py, tests/unit/test_containers.py; README.md только краткая правка при необходимости | SENTRY-QA (done) | focused/full service pytest и non-mutating styles/types | этот follow-up; spec.md требования lifecycle/async resolution; перечисленные файлы; src/containers/request.py и src/migration/env.py (read-only) |
| RESOURCE-QA | Quality Gate | read-only RESOURCE service diff; собственный checklist/evidence | RESOURCE-1 | backend/contract review, scoped checks, live HTTP/DB, strict OpenSpec validate | Test matrix Resource; spec.md; RESOURCE-1 handoff; stack-control/api-smoke-test skills |

DAG: RESOURCE-1 → RESOURCE-QA. Максимум восемь содержательных действий и одна группа verification в RESOURCE-1. RESOURCE-QA объединяет применимые backend/contract/live/synthesis проверки в один bounded unit. Frontend, NATS, OAuth network, schema migration и новый полный QG pipeline неприменимы. Исторический root QG-FORMAT BLOCKED сохраняется: не очищать worktree, не создавать commit, не выполнять sync/archive. Bind-mounted src с reload позволяет проверку без rebuild; штатная локальная подготовка через stack-control допустима только при фактической необходимости.

## Test matrix Resource

| ID | Уровень | Риск/ось | Сценарий | Ожидание / трассировка | Где |
|---|---|---|---|---|---|
| UT-RESOURCE-01 | unit/integration isolated | lifecycle happy path | Fake engine Resource, обычный lifespan | init до yield, dispose/shutdown один раз после yield; startup без request sessions; «Завершение приложения» | test_containers.py, test_app_di.py |
| UT-RESOURCE-02 | unit/integration isolated | startup/body/shutdown errors | init_resources ошибается после engine init, тело lifespan ошибается, dispose ошибается | finally вызывает shutdown для инициализированного engine; ошибки не подавляются; «Ошибка lifecycle» | test_app_di.py |
| UT-RESOURCE-03 | unit | async overrides/контракт | Root request_scope с реальным async Resource и sync fake overrides | await async_() возвращает context manager; внутри request helper получает sessionmaker, не awaitable; «Асинхронное разрешение request-scope» | test_containers.py, test_app_di.py |
| UT-RESOURCE-04 | unit | stale engine regression | init → session_factory → shutdown → reinit → session_factory | новый engine, новый sessionmaker bound к нему; прежний engine disposed; «Повторная инициализация engine» | test_containers.py |
| UT-RESOURCE-05 | regression | транзакции/конкурентность/отмена | Повтор UT-DI-01..05 через async resolution | private graphs, свежие sessions, commit/rollback/close и cancellation сохраняются | test_containers.py |
| UT-RESOURCE-06 | integration isolated | HTTP/access/schema | Существующий API/OpenAPI и Alembic/Sentry regression suite | access matrix/DTO/400 unchanged, public schema без DI, независимый Alembic/Sentry bootstrap | test_app_di.py, full service pytest |
| SM-RESOURCE-01 | smoke | live HTTP/реальная PostgreSQL | Обнаруженный через stack-control runtime после reload: health, link, invalid UUID/body; SELECT 1 через текущий engine/sessionmaker | прежние статусы/контракт и доступность реальной DB без OAuth exchange; «HTTP совместимость»/«Bootstrap и teardown» | RESOURCE-QA через api-smoke-test |

Для SM-RESOURCE-01 DB-параметры обнаружить через docker inspect без вывода секретов. Новая входная валидация и внешние business ошибки не добавляются; прежняя suite покрывает эти оси. Персистентность проверяется доступностью реальной PostgreSQL, схема/constraints не меняются.

## Risks / Trade-offs

- Общая session или provider.override → отдельный RequestContainer и конкурентный тест с barrier.
- Commit после ошибки → явный async with, проверка сервисной ошибки, ошибки commit и отмены.
- Import-time OAuth requirement для Alembic → lazy отдельный settings provider и subprocess-проверка без OAuth ENV.
- Изменение API из-за Request-параметра → сравнить OpenAPI request schemas и HTTP responses с baseline; Request не должен появляться в публичных параметрах.
- Singleton client/encryption → оба не содержат request-session; существующий OAuth transport сохраняется.

## Execution units

Все service paths относительно `services/yandex-service`. Единственный владелец каждого runtime/test файла указан ниже; OpenSpec checklist отмечается исполнителем сразу после фактической проверки.

| Unit | Профиль | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| DI-1 | Backend | src/containers/**, src/utils/database.py, tests/unit/test_containers.py | — | pytest test_containers; ruff checks затронутых файлов | design.md, spec.md, src/depends/{utils,repositories,services,clients}.py, src/containers/settings.py, src/utils/database.py |
| DI-2 | Backend | src/main.py, src/api/**, src/settings.py, src/utils/configure_sentry.py, src/migration/env.py, src/depends/** (удаление), README.md, pyproject.toml, tests/api/** | DI-1 | весь pytest; ruff check/format --check; basedpyright по проектной конфигурации | design.md, spec.md, src/main.py, src/api/yandex_auth.py, src/settings.py, src/utils/configure_sentry.py, src/migration/env.py, tests/api/test_health.py, результат DI-1 |
| OPS-DI | Backend | scripts/stackctl (только yandex profile/alias) | DI-2 | node --check scripts/stackctl; ready --no-migrate yandex-service | scripts/stackctl, .docker-compose/docker-compose.yandex.yml, stack-control SKILL.md, этот design |
| QG-ENV | Quality Gate | локальный runtime yandex-service, без deploy | OPS-DI | stack-control discovery, локальные PostgreSQL/API health | design.md#postgresql-для-smoke-тестов, service runtime config, stack-control SKILL.md |
| QG-BE | Quality Gate | read-only service checks; findings владельцам DI-1/DI-2 | QG-ENV | итоговые tests/lint/types | design.md#test-matrix, tasks.md, service diff |
| QG-CONTRACTS | Quality Gate | read-only архитектура/access/OpenAPI | QG-ENV | соответствие specs/tasks, HTTP/schema evidence | spec.md, design.md, service API diff |
| QG-LIVE | Quality Gate | локальные live HTTP/DB checks | QG-BE, QG-CONTRACTS | SM-DI-01 через api-smoke-test с реальной PostgreSQL | design.md#test-matrix, QG-ENV evidence, api-smoke-test SKILL.md |
| QG-FORMAT | Quality Gate | финальный format/lint/test затронутой области | QG-LIVE | root make format/lint/test согласно router workflow | service diff, root Makefile, lane evidence |
| QG-SYNTH | Quality Gate | этот change (tasks/sync/validation), итоговый handoff | QG-FORMAT | OpenSpec strict validate, общий verdict всех lanes | proposal.md, design.md, spec.md, tasks.md, lane evidence |

DAG: DI-1 → DI-2 → OPS-DI → QG-ENV → (QG-BE ∥ QG-CONTRACTS) → QG-LIVE → QG-FORMAT → QG-SYNTH. QG-FE-AUTO/QG-FE-MANUAL неприменимы: frontend отсутствует в scope. QG-ENV/QG-LIVE применимы из-за runtime/API diff. Использовать stack-control для локальной инфраструктуры и api-smoke-test для live smoke; недоступный runtime фиксировать как evidence blocker, не заменять придуманным результатом.

## Test matrix

| ID | Уровень | Риск/ось | Сценарий | Ожидание / трассировка | Где |
|---|---|---|---|---|---|
| UT-DI-01 | unit | happy path/lifetime | Два последовательных scopes и повторная сборка repository | Свежие session/graph, общие client/encryption; «Изолированный request graph» | test_containers.py |
| UT-DI-02 | unit | конкурентность | Два scopes перекрываются через barrier | Разные sessions; завершение одного не закрывает другой; «Конкурентные запросы» | test_containers.py |
| UT-DI-03 | unit | транзакция | Успех, ошибка сервиса/сборки графа | commit только при успехе; rollback при ошибке; close всегда; «Транзакционная граница» | test_containers.py |
| UT-DI-04 | unit | commit failure | commit выбрасывает исключение | rollback, close, ошибка распространяется; «Ошибка commit» | test_containers.py |
| UT-DI-05 | unit | отмена | Отмена task внутри scope | rollback/close, CancelledError не подавлен; «Отмена запроса» | test_containers.py |
| UT-DI-06 | unit | bootstrap/teardown | Независимые контейнеры, нормальный и ошибочный lifespan | Settings не перетекают, engine dispose в finally; «Независимые приложения»/«Завершение приложения» | tests/api/test_app_di.py |
| UT-DI-07 | integration isolated | HTTP/access | health/link/code без auth и с произвольным auth header, fake OAuth | Прежние статусы/DTO/URL, заголовок не меняет доступ; access matrix | tests/api/test_app_di.py |
| UT-DI-08 | integration isolated | validation/schema | Невалидный UUID/body, сравнение публичной OpenAPI | Прежний 400, нет service/scope/Request публичных параметров; «HTTP совместимость» | tests/api/test_app_di.py |
| UT-DI-09 | integration isolated | инструменты/config | Alembic offline bootstrap без OAuth ENV; обязательный encryption отсутствует | Alembic работает с только Settings; прежняя ошибка validation для encryption; «Alembic без OAuth ENV»/«Валидация настроек» | tests/api/test_app_di.py |
| UT-DI-10 | regression | зависимости | Статический поиск старого DI и полный baseline pytest | Нет imports Depends/depends, нет глобального DB bootstrap; 8 baseline tests сохраняются | QG-BE |
| SM-DI-01 | smoke | runtime/API/реальная PostgreSQL | Локальный API: health, link с валидным UUID, invalid UUID, code с пустым невалидным body; подключение к обнаруженной PostgreSQL | 200 health/link, прежний 400 validation без OAuth exchange; успешный SELECT 1 через реальную DB/session; «HTTP совместимость»/«Bootstrap и teardown» | QG-LIVE через api-smoke-test |

Внешние OAuth ошибки покрываются сохранёнными бизнес unit-тестами. Секреты/DTO неизменны и проверяются сравнением contract. PostgreSQL persistence/constraints/idempotency и миграции схемы неприменимы: SQL и business implementation не меняются. Live smoke ограничен локальным health/link/validation и проверкой реальной DB; реальный OAuth code exchange не выполняется.

### Test matrix Sentry

| ID | Уровень | Риск/ось | Сценарий | Ожидание / трассировка | Где |
|---|---|---|---|---|---|
| UT-SENTRY-01 | unit | disabled bootstrap | configure_sentry с выключенным SentrySettings | SDK init не вызывается; «Инициализация SDK из SentrySettings» | tests/unit/test_sentry_settings.py |
| UT-SENTRY-02 | unit | enabled bootstrap/контракт | Валидные SentrySettings, mock SDK init | Прежние DSN/environment/release/sample rate/send_default_pii=False/integrations, без сети; «Инициализация SDK из SentrySettings» | tests/unit/test_sentry_settings.py |
| UT-SENTRY-03 | unit | validation | enabled=true без DSN | Прежняя ошибка validation только SentrySettings; «Изолированная валидация Sentry и Alembic» | tests/unit/test_sentry_settings.py |
| UT-SENTRY-04 | unit | границы | Sample rate на 0/1 и вне диапазона | 0/1 принимаются, значения вне [0,1] отклоняются; «Изолированная валидация Sentry и Alembic» | tests/unit/test_sentry_settings.py |
| UT-SENTRY-05 | unit | isolation/regression | Settings и независимые lazy settings providers при невалидном Sentry ENV | Settings валидны при валидном encryption key; Sentry отдельно валидируется, providers/instances не перетекают; «Изолированная валидация Sentry и Alembic» | tests/unit/test_sentry_settings.py |
| UT-SENTRY-06 | integration isolated | Alembic regression | Offline Alembic с enabled Sentry без DSN и без OAuth ENV | Миграции работают без разрешения SentrySettings/YandexAppSettings; «Изолированная валидация Sentry и Alembic» | tests/api/test_app_di.py |
| SM-SENTRY-01 | smoke | HTTP bootstrap | Публичный localhost /health на уже доступном runtime после reload | 200 status=ok; «Bootstrap и teardown» | SENTRY-QA через api-smoke-test |

Проверки внешней отправки событий неприменимы: SDK mocked; API/auth/DTO, записи и constraints PostgreSQL не меняются. Для live health используется уже обнаруженный локальный стек через stack-control; OAuth обмен не выполняется. Секреты не выводить. Ошибки SDK transport не добавляются к неизменённой логике init ради количества сценариев.

## PostgreSQL для smoke-тестов

QG-ENV определяет существующий локальный стек через stack-control, получает реальные DB-параметры через docker inspect без вывода секретов и фиксирует доступность API/PostgreSQL. Параметры не хардкодить. При необходимости только локальная подготовка затронутого сервиса; deploy/merge/push не входят в scope. Если runtime нельзя поднять или проверить, QG-ENV/QG-LIVE возвращают конкретный blocker evidence, общий gate не объявляется успешным. QG-FORMAT следует clean-worktree workflow router; пользовательский dirty diff сохраняется, не сбрасывается и не форматируется вне согласованной области.

Router discovery до reload: eqsitecms-yandex-service running/healthy, health на localhost:8007 возвращал 200; src bind-mounted в /app/src, uvicorn работает с reload/reload-dir. eqsitecms-db-yandex running, host port 5438. Более поздний Docker logs evidence: ModuleNotFoundError dependency_injector; mounted source обновился, но image dependency отсутствует, требуется локальный rebuild.

OPS-DI добавляет минимальный yandex profile и alias yandex-service в существующие registry scripts/stackctl по текущему compose; остальные service definitions не меняются. Проверки: node --check scripts/stackctl и штатный `scripts/stackctl ready --no-migrate yandex-service`; QG-ENV выполняет необходимый локальный rebuild через stack-control и затем проверяет installed dependency/reload/health. Схема БД не менялась: migration отключена. Ручные Docker mutations, deploy/merge/push и расширение других сервисов запрещены. Если штатный rebuild/readiness всё ещё недоступен, зафиксировать новый конкретный blocker. QG-LIVE проверяет публичные routes и invalid OAuth payload без CMS login; credentials не включать в evidence.

## Migration Plan

Реализация в feature-ветке сервиса с сохранением пользовательского diff. DI-1 и DI-2 выполняются последовательно; после общего QG findings возвращаются владельцам. Sync specs, strict validation и archive следуют после завершения всех checklist задач и итогового handoff. Deploy, merge/push выполняет оператор; rollback — возврат service-refactor без изменения БД/ENV. Финализацию не расширять на другие сервисы.

## Open Questions

Нет: scopes, API integration и bootstrap согласованы; пользователь явно разрешил реализацию.
