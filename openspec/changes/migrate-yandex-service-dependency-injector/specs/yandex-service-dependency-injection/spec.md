## ADDED Requirements

### Requirement: Контейнерная сборка приложения

Сервис SHALL создавать settings, engine/sessionmaker, OAuth client и encryption через ApplicationContainer; SHALL удалять пакет depends и использование FastAPI Depends. Settings, SentrySettings и YandexAppSettings SHALL быть независимыми lazy Singleton; client/encryption SHALL принадлежать приложению; engine SHALL предоставляться async Resource, sessionmaker SHALL создаваться Factory с текущим engine.

#### Scenario: Независимые приложения
- **WHEN** создаются два приложения через create_app(container=None) с независимыми тестовыми контейнерами
- **THEN** каждый app.state.container указывает на свой контейнер; settings и ресурсы одного приложения не изменяют другое

#### Scenario: Валидация настроек
- **WHEN** Settings разрешаются без обязательного encryption key
- **THEN** сохраняется существующая ошибка Settings validation, все ENV/public names и опечатки сохраняются

### Requirement: Изолированный request graph

Каждый request-scope SHALL создавать отдельную session и RequestContainer с Object session и вложенными RepositoriesContainer/ServicesContainer. Repository/service SHALL создаваться Factory и получать именно session этого scope; shared root SHALL не изменяться request-time overrides.

#### Scenario: Изолированный request graph
- **WHEN** приложение последовательно открывает два request-scope
- **THEN** они используют разные sessions и request containers, но общие client/encryption

#### Scenario: Конкурентные запросы
- **WHEN** два request-scope выполняются одновременно и первый закрывается раньше второго
- **THEN** sessions различаются, repository каждого scope получает его session, завершение первого не закрывает session второго

### Requirement: Транзакционная граница

Обычный async context manager SHALL охватывать сборку request graph и вызов бизнеса; SHALL commit при успешном выходе, rollback при BaseException и close всегда. Ошибка и отмена SHALL распространяться вызывающему коду. Resource/Closing SHALL не управлять transaction-on-error.

#### Scenario: Транзакционная граница
- **WHEN** бизнес-вызов завершается успешно или сборка/вызов выбрасывает ошибку
- **THEN** успешный scope делает commit, ошибочный делает rollback без commit, оба закрывают session

#### Scenario: Ошибка commit
- **WHEN** commit выбрасывает исключение
- **THEN** выполняются rollback и close, исключение не подавляется

#### Scenario: Отмена запроса
- **WHEN** task отменён внутри request-scope
- **THEN** выполняются rollback и close, CancelledError распространяется

### Requirement: Bootstrap и teardown

Сервис SHALL сохранять main:app и предоставлять create_app(container=None); Sentry SHALL получать SentrySettings аргументом. Lifespan SHALL выполнять await container.init_resources() внутри try до yield и await container.shutdown_resources() в finally, включая ошибку startup. Async Resource engine SHALL вызывать await engine.dispose() в finally своего async context manager; параметры SQLAlchemy SHALL сохраняться. Startup SHALL не создавать request-sessions. Alembic SHALL разрешать только Settings и самостоятельно управлять migration engine.

#### Scenario: Завершение приложения
- **WHEN** lifespan завершается нормально или исключением
- **THEN** engine приложения получает dispose, request-sessions не создавались на startup

#### Scenario: Ошибка lifecycle
- **WHEN** init_resources ошибается после инициализации engine, тело lifespan выбрасывает исключение либо shutdown/dispose завершается ошибкой
- **THEN** lifespan выполняет shutdown ресурсов в finally, инициализированный engine получает dispose, ошибки не подавляются

#### Scenario: Повторная инициализация engine
- **WHEN** engine Resource проходит init/shutdown/reinit и заново разрешается session_factory
- **THEN** прежний engine disposed, новый sessionmaker привязан к новому engine и не использует disposed экземпляр

#### Scenario: Alembic без OAuth ENV
- **WHEN** Alembic запускается с валидными Settings и без YANDEX_APP_CLIENT_ID/SECRET/REDIRECT_URI
- **THEN** bootstrap миграций работает, YandexAppSettings не разрешаются

### Requirement: HTTP совместимость

Endpoint SHALL получать container через Request.app.state, разрешать context manager через await container.request_scope.async_() и открывать явный async with. ApplicationContainer SHALL явно включать async mode request_scope, сохраняя awaitable контракт при sync overrides. Request helper SHALL получать уже разрешённый sessionmaker; transaction context manager SHALL сохраняться. Маршруты, DTO, бизнес/OAuth client и существующие статусы/validation SHALL сохраняться. Request/service/scope SHALL не появляться в публичной OpenAPI схеме.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | /health | public | любые | 200, status=ok | тот же 200 |
| GET | /api/auth/link | public | любые | 200 при валидном equestrian_id | тот же результат |
| POST | /api/auth/code | public OAuth exception | любые | прежний успешный DTO/status при fake OAuth; прежние ошибки | тот же результат |

POST code — сохранённое существующее исключение OAuth callback/exchange, а не новый административный write. DI-refactor не вводит auth; произвольный auth header не меняет поведение. Невалидный UUID/body сохраняет 400, неизвестные маршруты — 404.

#### Scenario: Асинхронное разрешение request-scope
- **WHEN** endpoint открывает request-scope с async engine Resource либо синхронными тестовыми overrides
- **THEN** await request_scope.async_() возвращает async context manager с разрешённым sessionmaker, который создаёт свежую session и private graph с прежней транзакционной границей

#### Scenario: HTTP совместимость
- **WHEN** health/link/code вызываются без auth или с auth header, а внешние зависимости заменены fake providers
- **THEN** сохраняются прежние ответы/access matrix, validation 400 и публичная схема параметров без DI-объектов

### Requirement: Независимые настройки Sentry

Сервис SHALL определять отдельный SentrySettings(BaseSettings) с пятью прежними sentry_* полями, без изменения ENV aliases, defaults, sample rate диапазона [0,1] и `.env` config. SentrySettings SHALL проверять обязательный DSN при включённом Sentry. Settings SHALL содержать только app/DB/encryption настройки и прежнюю encryption validation без legacy Sentry полей/reexports. SettingsContainer SHALL предоставлять независимый lazy Singleton sentry_settings, который create_app SHALL передавать configure_sentry(settings:SentrySettings); глобальные settings instances SHALL отсутствовать. Alembic SHALL разрешать только Settings, независимо от Sentry validation и OAuth ENV.

#### Scenario: Изолированная валидация Sentry и Alembic
- **WHEN** Settings/Alembic разрешаются с валидным encryption key при SENTRY_ENABLED=true без DSN и без OAuth ENV, либо отдельно разрешается SentrySettings с неверным DSN/sample rate
- **THEN** Settings/Alembic работают без разрешения SentrySettings/YandexAppSettings; отдельный SentrySettings отклоняет enabled без DSN и sample rate вне [0,1], принимает 0/1 при валидном DSN; lazy providers независимы между контейнерами

#### Scenario: Инициализация SDK из SentrySettings
- **WHEN** configure_sentry получает выключенный либо валидный включённый SentrySettings
- **THEN** при выключенном Sentry SDK init не вызывается; при включённом получает прежние dsn, environment, release, traces_sample_rate, send_default_pii=false и FastAPI/SQLAlchemy integrations
