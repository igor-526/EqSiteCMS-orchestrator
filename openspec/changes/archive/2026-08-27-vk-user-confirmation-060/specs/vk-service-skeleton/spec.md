## ADDED Requirements

### Requirement: Миграционная цепочка содержит VK-домен и применима

`services/vk-service/src/migration/versions/` MUST содержать ревизию `20260710_0001_initial.py` и единственную новую ревизию VK-домена, описанную в spec `vk-user-storage`. `alembic upgrade head` на пустой БД `eqsitecmsvk` SHALL завершаться успешно и SHALL создавать `alembic_version`, `user_vks`, `vk_confirmations`, `vk_logs` и ничего кроме них. `src/migration/env.py` SHALL продолжать импортировать `models` и использовать `utils.basemodel.metadata`. Email-таблицы MUST NOT создаваться ни на одном шаге цепочки.

#### Scenario: Миграции применяются на реальной PostgreSQL

- **WHEN** на пустой БД `eqsitecmsvk` выполняется `alembic -c alembic.ini upgrade head`
- **THEN** команда завершается с кодом 0
- **AND** в схеме присутствуют только `alembic_version`, `user_vks`, `vk_confirmations`, `vk_logs`

#### Scenario: Autogenerate не предлагает изменений

- **WHEN** после `upgrade head` выполняется `alembic revision --autogenerate`
- **THEN** сгенерированная ревизия не содержит операций создания или изменения таблиц

#### Scenario: Email-таблицы отсутствуют

- **WHEN** reviewer читает схему БД после `upgrade head`
- **THEN** таблицы `user_emails`, `email_confirmations`, `email_logs` отсутствуют

### Requirement: HTTP-поверхность сервиса ограничена health и VK-домены

`vk-service` SHALL предоставлять `GET /health`, возвращающий `200` и тело `{"status": "ok"}`, и маршруты VK-домена с префиксом `/vks`, контракт которых определён в spec `vk-api-endpoints`. Унаследованные от `email-service` endpoints `/emails*` MUST отсутствовать и MUST возвращать `404`. Prometheus-метрики MUST NOT публиковаться как FastAPI-маршрут на порту приложения: отдельный listener `0.0.0.0:9000` SHALL запускаться только при `ENVIRONMENT=production` и оставаться доступным только внутри `eqsitecms_network`. CORS-конфигурация и auth-маршруты MUST отсутствовать.

Access matrix инфраструктурной и унаследованной поверхности:

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `GET` | `/health` | Public Read | нет (роли не проверяются) | `200`, тело `{"status": "ok"}` | `200`, тело `{"status": "ok"}` |
| `GET` | `:9000/metrics` (отдельный listener, только `ENVIRONMENT=production`) | Infrastructure-only, не FastAPI-маршрут | нет (сетевая изоляция вместо ролей) | `200` и Prometheus content type при запросе изнутри `eqsitecms_network`; недоступно с host, порт не публикуется | `200` и Prometheus content type изнутри `eqsitecms_network` |
| `GET` | `/emails` | endpoint отсутствует | — | `404` | `404` |
| `POST` | `/emails` | endpoint отсутствует | — | `404` | `404` |
| `PATCH` | `/emails` | endpoint отсутствует | — | `404` | `404` |
| `DELETE` | `/emails/{user_id}` | endpoint отсутствует | — | `404` | `404` |
| `POST` | `/emails/send-confirmation` | endpoint отсутствует | — | `404` | `404` |
| `PATCH` | `/emails/confirm` | endpoint отсутствует | — | `404` | `404` |
| `POST` | `/api/auth/register` | endpoint отсутствует | — | `404` | `404` |

`GET /health` остаётся Public Read как инфраструктурный readiness-контракт, используемый docker healthcheck и Quality Gate. `:9000/metrics` является исключением из HTTP-маршрутизации приложения и защищается сетевой изоляцией, а не авторизацией; публикация этого порта на host запрещена. Access matrix маршрутов `/vks*`, включая их access-классы и исключения, зафиксирована в spec `vk-api-endpoints` и MUST NOT дублироваться здесь.

#### Scenario: Anonymous health

- **WHEN** анонимный клиент внутри `eqsitecms_network` выполняет `GET /health` без cookie и заголовков авторизации
- **THEN** ответ имеет статус `200` и тело `{"status": "ok"}`

#### Scenario: Authenticated health

- **WHEN** клиент выполняет `GET /health` с валидной сессионной cookie CMS
- **THEN** ответ имеет статус `200` и тело `{"status": "ok"}`, поведение не отличается от anonymous

#### Scenario: Унаследованные email endpoints отсутствуют

- **WHEN** анонимный клиент выполняет `GET /emails?user_ids=<uuid>`, `POST /emails`, `PATCH /emails`, `DELETE /emails/<uuid>`, `POST /emails/send-confirmation` или `PATCH /emails/confirm`
- **THEN** каждый запрос возвращает `404`
- **AND** те же запросы с валидной авторизацией также возвращают `404`

#### Scenario: Auth-маршруты не зарегистрированы

- **WHEN** выполняется `POST /api/auth/register`
- **THEN** ответ имеет статус `404`

#### Scenario: CORS не настроен

- **WHEN** выполняется `GET /health` с заголовком `Origin`
- **THEN** ответ не содержит `access-control-allow-origin` и `access-control-allow-credentials`

#### Scenario: Metrics listener только в production

- **WHEN** сервис запускается с `ENVIRONMENT=development`
- **THEN** отдельный listener на порту `9000` не открывается
- **AND** порт `9000` не публикуется на host ни в одном окружении

#### Scenario: VK-маршруты зарегистрированы

- **WHEN** анонимный клиент внутри `eqsitecms_network` запрашивает OpenAPI-схему сервиса
- **THEN** в ней присутствуют маршруты с префиксом `/vks`

## MODIFIED Requirements

### Requirement: Идентичность и зависимости сервиса приведены к VK

`services/vk-service/pyproject.toml` MUST объявлять `[project].name = "vk-service"` и описание VK-сервиса, MUST NOT содержать `aiosmtplib` и MUST использовать `pydantic` без extra `email`. `pyproject.toml` MUST объявлять зависимость `vkbottle` (`>=4.11,<5`), `aiohttp>=3.14.3` и `pydantic>=2.13.4` согласно spec `vk-bot-longpolling`. `uv.lock` MUST быть пересобран так, чтобы `uv sync --locked` завершался успешно. `known-first-party` в конфигурации isort MUST отражать фактические пакеты сервиса, включая новые пакеты `api` и `bot`.

#### Scenario: Lock соответствует зависимостям

- **WHEN** в `services/vk-service` выполняется `uv sync --locked`
- **THEN** команда завершается с кодом 0 и не требует обновления lock-файла

#### Scenario: SMTP-зависимость удалена

- **WHEN** reviewer читает `services/vk-service/pyproject.toml`
- **THEN** `aiosmtplib` отсутствует, а `pydantic` объявлен без extra `email`

#### Scenario: Имя проекта соответствует сервису

- **WHEN** reviewer читает секцию `[project]` в `services/vk-service/pyproject.toml`
- **THEN** `name` равен `vk-service`, описание относится к VK-сервису и не содержит `fastapi-template` или email-формулировок

#### Scenario: VK-библиотека объявлена

- **WHEN** reviewer читает `dependencies` в `services/vk-service/pyproject.toml`
- **THEN** `vkbottle` присутствует с ограничением версии, а `aiohttp` и `pydantic` подняты до версий, требуемых библиотекой

#### Scenario: Первопартийные пакеты актуальны

- **WHEN** reviewer читает `known-first-party`
- **THEN** список включает `api` и `bot` и не содержит отсутствующих пакетов

### Requirement: Настройки очищены от email и содержат VK-конфигурацию

`services/vk-service/src/settings.py` MUST NOT содержать класс `SMTPSettings`, экспорт `smtp_settings`, поля `email_confirmation_ttl_hours` и `frontend_url`. Список обязательных production-секретов MUST состоять из `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `CELERY_APP_BROKER`, `CELERY_APP_BACKEND`, `MAIN_BACKEND_SERVICE_KEY`, `NATS_SERVERS`, `VK_GROUP_TOKEN` и MUST NOT включать `SMTP_PASSWORD`. `APP_TITLE` SHALL иметь значение по умолчанию `VK Service`, `CELERY_APP_MAIN` — `vk-service`, `CELERY_APP_BROKER` — Redis DB `3`, `CELERY_APP_BACKEND` — Redis DB `4`. `NatsSettings` MUST содержать зарезервированные `NATS_SUBJECT_NOTIFICATION_COMMANDS_SEND_VK` со значением `commands.notification.vk.send` и `NATS_CONSUMER_NOTIFICATION_COMMANDS_SEND_VK` со значением `vk-service-commands-send-vk`, и MUST NOT содержать email-эквиваленты.

Дополнительно MUST существовать класс `VkSettings` с полями и значениями по умолчанию: `VK_GROUP_TOKEN` (пусто), `VK_GROUP_ID` (`0`), `VK_GROUP_SCREEN_NAME` (пусто), `VK_API_VERSION` (`5.199`), `VK_BOT_LINK_COMMAND` (`/link`), `VK_CONFIRMATION_TTL_MINUTES` (`30`), `VK_CONFIRMATION_CODE_LENGTH` (`8`), `VK_CONFIRMATION_MAX_ATTEMPTS` (`5`), `VK_CONFIRMATION_ATTEMPT_WINDOW_MINUTES` (`10`), `VK_LONGPOLL_WAIT_SECONDS` (`25`). `.env.example` MUST перечислять полный набор переменных сервиса, включая VK-переменные, с placeholder-значениями и без реальных секретов.

#### Scenario: Production-валидация без SMTP

- **WHEN** `Settings` инициализируется с `ENVIRONMENT=production` и безопасными значениями всех обязательных переменных, но без `SMTP_PASSWORD`
- **THEN** валидация проходит успешно

#### Scenario: Production-валидация отклоняет небезопасный секрет

- **WHEN** `Settings` инициализируется с `ENVIRONMENT=production` и `REDIS_PASSWORD=eqsitecmsredis`
- **THEN** поднимается `ValueError` с перечислением небезопасных переменных

#### Scenario: Production-валидация требует групповой токен

- **WHEN** `Settings` инициализируется с `ENVIRONMENT=production` и пустым либо placeholder-значением `VK_GROUP_TOKEN`
- **THEN** поднимается `ValueError`, в перечислении небезопасных переменных присутствует `VK_GROUP_TOKEN`

#### Scenario: VK NATS-имена зарезервированы

- **WHEN** читается экземпляр `NatsSettings` без переопределяющих переменных окружения
- **THEN** `nats_subject_notification_commands_send_vk` равно `commands.notification.vk.send`
- **AND** `nats_consumer_notification_commands_send_vk` равно `vk-service-commands-send-vk`
- **AND** email-эквиваленты отсутствуют

#### Scenario: Redis DB не пересекается с email-service

- **WHEN** читается экземпляр `CelerySettings` без переопределяющих переменных окружения
- **THEN** broker указывает на Redis DB `3`, backend — на Redis DB `4`

#### Scenario: Значения VkSettings по умолчанию

- **WHEN** читается экземпляр `VkSettings` без переопределяющих переменных окружения
- **THEN** `vk_bot_link_command` равно `/link`, `vk_confirmation_ttl_minutes` — `30`, `vk_confirmation_code_length` — `8`, `vk_confirmation_max_attempts` — `5`, `vk_confirmation_attempt_window_minutes` — `10`, `vk_longpoll_wait_seconds` — `25`

#### Scenario: .env.example не содержит реальных секретов

- **WHEN** reviewer читает `services/vk-service/.env.example`
- **THEN** все VK-переменные перечислены, а `VK_GROUP_TOKEN` имеет placeholder-значение вида `<set-...>`

### Requirement: Приложение поднимается без email-роутера и без активной NATS-топологии

`services/vk-service/src/main.py` MUST NOT импортировать и подключать email-роутер и MUST NOT запускать email-consumer. `main.py` SHALL подключать VK-роутер `api/endpoints/vks.py`. Lifespan SHALL выполнять `nats_client.connect()`, запускать production metrics runtime, а при завершении — закрывать NATS-соединение, БД и metrics runtime. Lifespan MUST NOT запускать long-poll цикл: bot runtime является отдельным процессом согласно spec `vk-bot-longpolling`. `NatsJetstreamClient` нового сервиса SHALL подключаться с `name="vk-service"`, а его `setup_streams()` и `setup_consumers()` MUST быть no-op: сервис MUST NOT создавать stream `NOTIFICATION_COMMANDS` и MUST NOT регистрировать durable consumer. DI-контейнер `containers/application.py` SHALL предоставлять `nats_settings`, `nats_client`, `celery_settings`, `celery_app` и VK-провайдеры (`vk_settings`, VK API-клиент), MUST NOT содержать `smtp_settings`, `email_sender` и email-провайдеры, и MUST NOT храниться в `app.state`.

#### Scenario: Приложение импортируется без email-зависимостей

- **WHEN** выполняется импорт `main` в тестовом окружении
- **THEN** импорт завершается успешно
- **AND** ни один модуль email-логики не участвует в графе импортов

#### Scenario: Long-poll не стартует вместе с приложением

- **WHEN** приложение поднимается в тестовом окружении без `VK_GROUP_TOKEN`
- **THEN** старт завершается успешно, а обращения к VK API не выполняются

#### Scenario: Топология JetStream не изменяется новым сервисом

- **WHEN** вызываются `setup_streams()` и `setup_consumers()` NATS-клиента `vk-service`
- **THEN** ни один вызов `add_stream` или `add_consumer` не выполняется

#### Scenario: Существующие контракты сохранены

- **WHEN** reviewer сверяет `services/email-service/docs/asyncapi.yaml` и `services/notification-service/docs/asyncapi.yaml` до и после change
- **THEN** stream `NOTIFICATION_COMMANDS`, subject `commands.notification.email.send`, durable `notification-service-commands-send-email`, headers и payload остаются неизменными

### Requirement: Baseline-тесты подтверждают чистоту скелета

`services/vk-service/tests/` SHALL содержать тесты, применимые к сервису: `conftest.py` с отключением Sentry, health/HTTP-контракт, отсутствие email-поверхности, observability, конфигурация настроек, Celery-конфигурация, no-op NATS setup, DI-wiring, а также тесты VK-домена — репозитории, доменные сервисы, API-контракт и bot runtime против stub VK API. `make test` (`pytest -m "not infrastructure"`) MUST проходить без поднятой инфраструктуры, без `VK_GROUP_TOKEN` и без доступа в интернет. Infrastructure-тесты, требующие реальных Redis/NATS/PostgreSQL или реальной VK-группы, SHALL быть помечены маркером `infrastructure` и запускаться только целью `make test-infra`.

#### Scenario: Автономный тестовый прогон

- **WHEN** в `services/vk-service` без поднятых PostgreSQL, NATS и Redis выполняется `make test`
- **THEN** прогон завершается с кодом 0

#### Scenario: Infrastructure-тесты изолированы

- **WHEN** выполняется `make test` без инфраструктуры
- **THEN** тесты с маркером `infrastructure` не выполняются

#### Scenario: Тесты не требуют VK-секретов

- **WHEN** выполняется `make test` без заданного `VK_GROUP_TOKEN`
- **THEN** прогон завершается с кодом 0, а обращения к `api.vk.com` не выполняются

### Requirement: Документация сервиса описывает границы скелета

`services/vk-service/README.md` SHALL описывать VK-сервис и MUST NOT содержать email-инструкций по работе сервиса; упоминания email допускаются и требуются только в разделе техдолга деплой-конфигурации и в описании границ сервиса. README MUST включать: стек, структуру `src/` (включая `api/`, `bot/`, `clients/vk/`, `models/`, `repositories/`), инструкции локального и docker-запуска приложения и bot runtime, таблицу переменных окружения приложения (включая `MAIN_BACKEND_URL` и все VK-переменные с пояснением, какие из них заполняет владелец группы) и таблицу инфраструктурных переменных, необходимых для запуска — `EXPOSE_VK_SERVICE_PORT=8004`, `POSTGRES_VK_USER=eqsitecmsvk`, `POSTGRES_VK_PASSWORD`, `POSTGRES_VK_NAME=eqsitecmsvk`, `EXPOSE_VK_DB_PORT=5436` из gitignored `.docker-compose/.env` — а также `VK_TEST_CELERY_BROKER` и `VK_TEST_CELERY_BACKEND`, требуемые infrastructure-тестом `tests/integration/test_real_celery.py`, таблицу API с `GET /health` и маршрутами `/vks*`, раздел Celery с очередью `vk`, раздел «NATS JetStream (зарезервировано)» с планируемыми stream `NOTIFICATION_COMMANDS`, subject `commands.notification.vk.send`, durable `vk-service-commands-send-vk` и явной пометкой, что контракт не активирован и `docs/asyncapi.yaml` появится отдельным change, раздел «Границы сервиса» с перечнем того, что сознательно отсутствует (доставка уведомлений в VK, потребление `commands.notification.vk.send`, рассылки, клавиатуры и вложения бота), раздел «Привязка пользователя VK» с описанием пайплайна подтверждения, а также раздел-предупреждение, прямо называющий `email-service` источником `.helm/**` и `.github/**`, перечисляющий унаследованные email-значения и запрещающий выкатку. Токены `email`/`smtp` в README MUST записываться обычными литералами: guard-проверка на README не распространяется.

#### Scenario: README описывает VK-сервис

- **WHEN** reviewer читает `services/vk-service/README.md`
- **THEN** документ описывает VK-сервис, содержит все обязательные разделы, а упоминания email допускаются только в разделе техдолга деплой-конфигурации и в описании границ сервиса

#### Scenario: README предупреждает о неготовой деплой-конфигурации

- **WHEN** reviewer читает раздел о `.helm/**` и `.github/**`
- **THEN** `email-service` назван прямо, унаследованные значения перечислены и выкатка запрещена
- **AND** имена записаны обычными литералами, читаемыми без расшифровки

#### Scenario: Инфраструктурные переменные перечислены

- **WHEN** выполняется `rg -cE "EXPOSE_VK_SERVICE_PORT|POSTGRES_VK_|EXPOSE_VK_DB_PORT|VK_TEST_CELERY" services/vk-service/README.md`
- **THEN** результат ненулевой, и перечисленные значения совпадают с фактическим `.docker-compose/.env`

#### Scenario: Зарезервированный messaging-контракт помечен как неактивный

- **WHEN** reviewer читает раздел «NATS JetStream (зарезервировано)»
- **THEN** таблица содержит планируемые stream/subject/durable
- **AND** явно указано, что подписка не активирована и `services/vk-service/docs/asyncapi.yaml` не создан

#### Scenario: VK-переменные и пайплайн задокументированы

- **WHEN** reviewer читает таблицу переменных окружения и раздел «Привязка пользователя VK»
- **THEN** все `VK_*` переменные присутствуют с пояснениями, а пайплайн подтверждения описан от выдачи кода в CMS до ответа бота

## REMOVED Requirements

### Requirement: Миграционная цепочка пуста и применима

**Reason**: Сервис получил собственный домен, поэтому требование пустой миграционной цепочки перестало быть верным.

**Migration**: Заменено требованием «Миграционная цепочка содержит VK-домен и применима» в этой же capability; состав таблиц и содержание ревизии описаны в spec `vk-user-storage`, требование «Alembic миграция VK-домена».

### Requirement: HTTP-поверхность скелета ограничена health endpoint

**Reason**: Сервис перестал быть скелетом с единственным endpoint: добавлены маршруты VK-домена.

**Migration**: Заменено требованием «HTTP-поверхность сервиса ограничена health и VK-домены» в этой же capability, которое сохраняет контракт `GET /health`, отсутствие CORS и auth-маршрутов, `404` для унаследованных `/emails*` и production-only metrics listener. Access matrix маршрутов `/vks*` зафиксирована в spec `vk-api-endpoints`.
