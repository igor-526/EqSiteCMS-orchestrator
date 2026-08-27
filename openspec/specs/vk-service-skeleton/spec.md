# vk-service-skeleton Specification

## Purpose
Состав, границы и контракты сервиса `services/vk-service`: что копируется из `email-service`, что удаляется, конфигурация и зависимости (включая `vkbottle`), Celery-очередь `vk`, NATS-клиент без активных streams/consumers, HTTP-поверхность (`GET /health` и маршруты VK-домена) с access matrix, миграционная цепочка и baseline-тесты.

## Requirements

### Requirement: Сервис vk-service создаётся копированием email-service

Каталог `services/vk-service` SHALL создаваться копированием `services/email-service` без `.git`, `.venv`, `.env`, `.mypy_cache`, `.ruff_cache` и `.pytest_cache`. Копия MUST сохранять переиспользуемый каркас: `Dockerfile`, `.dockerignore`, `.flake8`, `.gitignore`, `.python-version`, `.vscode/settings.json`, `Makefile`, `scripts/check-format-excludes.sh`, `pyproject.toml`, `uv.lock`, `.env.example`, `docker-compose.yaml`, `.github/workflows/check_and_deploy.yml`, `.helm/**`, а в `src/` — `main.py`, `settings.py`, `alembic.ini`, `migration/env.py`, `migration/script.py.mako`, `migration/versions/20260710_0001_initial.py`, `containers/`, `core/entities/base.py`, `core/exceptions/`, `core/schemas/base.py`, `core/schemas/messaging/base_event_data.py`, `clients/nats/client.py`, `clients/main_backend/client.py`, `depends/`, `utils/**`, `workers/celery_app.py`, `workers/tasks/integration_probe.py`. Каталоги `.helm/**` и `.github/**` MUST копироваться побайтово и MUST NOT редактироваться. Внутри `services/vk-service` MUST выполняться `git init` без настройки remote. Исходный `services/email-service` MUST оставаться неизменным.

#### Scenario: Скелет создан и не затронул источник

- **WHEN** исполнитель завершил создание `services/vk-service`
- **THEN** каталог существует с перечисленным каркасом
- **AND** `git -C services/email-service status --porcelain` не содержит изменений

#### Scenario: Служебные каталоги не скопированы

- **WHEN** reviewer проверяет содержимое `services/vk-service`
- **THEN** унаследованные из копии `.git`, `.venv`, `.env`, `.mypy_cache`, `.ruff_cache`, `.pytest_cache` отсутствуют

#### Scenario: Локальный git-репозиторий без remote

- **WHEN** выполняется `git -C services/vk-service remote -v`
- **THEN** вывод пуст, при этом `git -C services/vk-service rev-parse --git-dir` завершается успешно
- **AND** `services.manifest` остаётся неизменным

### Requirement: Email-специфичный код полностью удалён

Скелет `vk-service` MUST NOT содержать email-логику. Удалению подлежат: пакет `src/api/` целиком, `src/infrastructure/`, `src/core/services/{email_confirmation,email_processing,user_email,notification_command_send_email}.py`, `src/core/protocols/{email_publisher,email_sender}.py`, `src/core/protocols/messaging/handlers/notification_command_send_email.py`, `src/core/schemas/messaging/notification_command_send_email.py`, `src/models/{email_confirmation,email_log,user_email}.py`, `src/repositories/{email_confirmation,email_log,user_email,protocols}.py`, `src/migration/versions/{20260710_0002_add_email_logs,20260814_0003_add_user_emails_and_confirmations}.py`, `src/clients/nats/consumers/notification_commands_send_email.py`, `src/clients/nats/handlers/notification_commands_send_email.py`, `src/workers/tasks/{email,confirmation}.py`, а также тесты `tests/api/test_emails.py`, `tests/models/**`, `tests/services/**`, `tests/integration/test_email_log_concurrency.py`, `tests/clients/nats/test_notification_commands_send_email_consumer.py`. Пакеты `src/models`, `src/repositories`, `src/core/services`, `src/clients/nats/consumers`, `src/clients/nats/handlers`, `src/core/protocols/messaging/handlers`, `src/workers/tasks` SHALL сохраняться как точки расширения с пустым `__all__` и без неиспользуемых импортов. Guard-проверка на остатки email-домена SHALL применяться только к реализации — `src/`, `pyproject.toml`, `.env.example` — и MUST NOT распространяться на `tests/**`, `README.md`, `.helm/**`, `.github/**` и `uv.lock`.

#### Scenario: Текстовый поиск email не находит совпадений в реализации

- **WHEN** выполняется `rg -ni "email|smtp|aiosmtplib" services/vk-service/src services/vk-service/pyproject.toml services/vk-service/.env.example`
- **THEN** совпадений нет
- **AND** область проверки намеренно ограничена реализацией и не включает `services/vk-service/tests/**`, `services/vk-service/README.md`, `services/vk-service/.helm/**`, `services/vk-service/.github/**` и `services/vk-service/uv.lock`

#### Scenario: Email-модули отсутствуют

- **WHEN** reviewer перечисляет файлы `services/vk-service/src`
- **THEN** перечисленные email-модули, миграции и тесты отсутствуют
- **AND** пустые пакеты-точки расширения присутствуют с пустым `__all__`

#### Scenario: Пустые пакеты проходят статический анализ

- **WHEN** в `services/vk-service` выполняется `make lint`
- **THEN** `mypy`, `basedpyright`, `ruff check`, `ruff format --check` и `flake8` завершаются с кодом 0

### Requirement: Запрещённые токены в тестах и документации пишутся обычными литералами

Тесты `services/vk-service/tests/**` и документация `services/vk-service/README.md` SHALL называть email-сущности (`email`, `smtp`, `aiosmtplib`, пути `/emails*`, имена `SMTPSettings`, `smtp_settings`) **обычными строковыми литералами**. Склейка токенов из фрагментов (`"e" + "mail"`, `"smt" + "p"`, `"aio" + "smt" + "p" + "lib"`), кодирование, форматирование через f-string из частей и любые иные приёмы обхода guard-проверки MUST быть запрещены. Причина: guard ограничен реализацией, поэтому обфускация в тестах и документации не требуется, ломает grep-ability и маскирует проверку вместо её выполнения. Тесты MUST оставаться читаемыми и находимыми поиском по имени проверяемой сущности, включая самосканирующий тест, который использует искомые токены как данные.

#### Scenario: Тесты называют отсутствующие endpoints напрямую

- **WHEN** reviewer читает тесты, проверяющие `404` для `/emails`, `/emails/send-confirmation` и `/emails/confirm`
- **THEN** пути записаны обычными литералами без склейки из фрагментов
- **AND** поиск `rg -n "/emails" services/vk-service/tests` находит эти тесты

#### Scenario: Обфускация токенов отсутствует

- **WHEN** выполняется `rg -n '"e"\s*\+\s*"mail"|"smt"\s*\+\s*"p"|"aio"\s*\+\s*"smt"' services/vk-service`
- **THEN** совпадений нет

#### Scenario: Самосканирующий тест использует прямые литералы

- **WHEN** reviewer читает тест, проверяющий отсутствие email-токенов в `src/`
- **THEN** искомые токены объявлены прямыми литералами, а сам тест расположен вне области guard (`tests/`), поэтому не конфликтует с ним

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

### Requirement: Деплой-конфигурация копируется без изменений и помечается как неготовая

`services/vk-service/.helm/**` и `services/vk-service/.github/**` MUST быть побайтово идентичны соответствующим каталогам `services/email-service` и MUST NOT редактироваться в этом change. Это означает, что release name `eqcms-email-service`, образ `ghcr.io/igor-526/eqsitecms-email-service`, ссылка на k8s-секрет `eqsitecms-email-service-secret`, worker-команда `-Q email` и имена файлов `.helm/templates/email-service-*` сознательно сохраняются. Деплой `vk-service` в рамках этого change MUST NOT выполняться: ветка `release` для нового сервиса не создаётся, k8s-секрет не заводится. `services/vk-service/README.md` MUST содержать раздел техдолга, который **прямо называет `email-service`** сервисом-донором `.helm/**` и `.github/**` — без обобщённых формулировок вида «сервис-донор» без имени — и перечисляет конкретные следствия: release name `eqcms-email-service`, образ `ghcr.io/igor-526/eqsitecms-email-service`, worker-очередь `-Q email`, k8s-секрет `eqsitecms-email-service-secret`, имена шаблонов `.helm/templates/email-service-*`. Раздел MUST содержать явный запрет выкатки `vk-service` этой конфигурацией. `SERVICES.md` MUST фиксировать тот же техдолг. Приведение конфигурации к VK выполняется отдельным change вместе с созданием remote-репозитория, записи в `services.manifest` и секрета в кластере.

#### Scenario: Helm и CI побайтово идентичны источнику

- **WHEN** выполняются `diff -r services/email-service/.helm services/vk-service/.helm` и `diff -r services/email-service/.github services/vk-service/.github`
- **THEN** обе команды не выводят различий и завершаются с кодом 0

#### Scenario: Технический долг задокументирован с прямым указанием донора

- **WHEN** reviewer читает раздел техдолга в `services/vk-service/README.md`
- **THEN** `email-service` назван прямо как источник `.helm/**` и `.github/**`
- **AND** перечислены release name `eqcms-email-service`, образ `ghcr.io/igor-526/eqsitecms-email-service`, worker-очередь `-Q email` и k8s-секрет `eqsitecms-email-service-secret`
- **AND** присутствует явный запрет выкатки, а исправление вынесено в отдельный change

#### Scenario: Обобщённые формулировки отклоняются

- **WHEN** раздел техдолга описывает источник конфигурации как «сервис-донор» или иным обезличенным способом без имени `email-service`
- **THEN** Quality Gate фиксирует finding и возвращает его владельцу

#### Scenario: Деплой не производится

- **WHEN** reviewer проверяет состояние нового сервиса после реализации
- **THEN** ветка `release` не создана, k8s-секрет `eqsitecms-vk-service-secret` не заводился и helm-выкатка не выполнялась

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

### Requirement: Адрес main backend указывает на существующий контейнер

`MAIN_BACKEND_URL` в `services/vk-service/.env.example` и в локальном `services/vk-service/.env` MUST указывать на фактически существующий main backend. Каноническое значение — `http://eqsitecms-app:8000`. Значение `http://eqsitecms-backend:8000` MUST NOT использоваться: контейнера с таким именем в `eqsitecms_network` не существует, поэтому клиент `clients/main_backend/client.py` не сможет установить соединение.

Обоснование выбора: main backend публикуется в `eqsitecms_network` под двумя DNS-именами — `eqsitecms-app` (`container_name`) и `backend` (compose-alias). Выбирается `eqsitecms-app`, потому что остальные адреса сервиса уже записаны через полные имена контейнеров (`POSTGRES_HOST=eqsitecms-db-vk`, `NATS_SERVERS=nats://eqsitecms-nats:4222`, Redis `eqsitecms-redis:6379`); compose-alias `backend` устойчив только пока сервис поднят тем же compose-проектом, а `vk-service` запускается отдельным проектом `eqsitecms-vk`. `MAIN_BACKEND_URL` MUST быть задокументирован в `services/vk-service/README.md`.

#### Scenario: Значение указывает на существующий контейнер

- **WHEN** reviewer читает `MAIN_BACKEND_URL` в `.env.example` и локальном `.env`
- **THEN** значение равно `http://eqsitecms-app:8000` и не содержит `eqsitecms-backend`

#### Scenario: Имя резолвится из контейнера сервиса

- **WHEN** из работающего контейнера `eqsitecms-vk-service` выполняется резолв хоста из `MAIN_BACKEND_URL`
- **THEN** имя разрешается в IP-адрес внутри `eqsitecms_network` без ошибки DNS

#### Scenario: Переменная задокументирована

- **WHEN** reviewer читает таблицу переменных окружения в `services/vk-service/README.md`
- **THEN** `MAIN_BACKEND_URL` присутствует с актуальным значением и пояснением назначения

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

### Requirement: Celery сконфигурирован на домен vk

`services/vk-service/src/workers/celery_app.py` SHALL регистрировать очередь `vk` в `task_queues` и устанавливать `task_default_queue = "vk"`. Имена задач MUST следовать формату `vk.<action>`; сохранённая задача-пробник MUST называться `vk.integration_probe`. Пакет `workers/tasks/__init__.py` MUST экспортировать только фактически существующие задачи. Автообнаружение задач SHALL сохраняться через `autodiscover_tasks(["workers.tasks"])`.

#### Scenario: Очередь vk зарегистрирована

- **WHEN** читается конфигурация `celery_app` сервиса `vk-service`
- **THEN** `task_queues` содержит очередь `vk`, а `task_default_queue` равна `vk`
- **AND** очередь `email` отсутствует

#### Scenario: Задача-пробник переименована

- **WHEN** reviewer читает `workers/tasks/integration_probe.py`
- **THEN** имя задачи равно `vk.integration_probe`

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
