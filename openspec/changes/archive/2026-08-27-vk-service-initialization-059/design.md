## Context

Тикет `059`, дата планирования: 2026-08-27. Входной запрос: `docs/tasks/059_vk_service_initialization.md`.

Change создаёт новый сервис `services/vk-service` и трогает оркестрацию монорепозитория (`.docker-compose/`, корневой `Makefile`, `agents/redis-databases.yaml`, `SERVICES.md`).

### Evidence из кода (проверено при планировании)

- `services/email-service` содержит смешанный каркас: переиспользуемая часть (FastAPI + lifespan, `utils/configure_sentry.py`, `utils/observability.py`, `utils/database.py`, `utils/basemodel.py`, `core/exceptions/base.py`, `core/entities/base.py`, `core/schemas/base.py`, `clients/nats/client.py`, `clients/main_backend/client.py`, `containers/application.py`, `workers/celery_app.py`, Alembic-каркас `src/migration/env.py` + `src/alembic.ini`) и строго email-специфичная часть (`api/endpoints/emails.py`, `api/schemas/email.py`, `api/dependencies.py`, `core/services/{email_confirmation,email_processing,user_email,notification_command_send_email}.py`, `core/protocols/{email_publisher,email_sender}.py`, `core/protocols/messaging/handlers/notification_command_send_email.py`, `core/schemas/messaging/notification_command_send_email.py`, `infrastructure/email_sender.py`, `models/{email_confirmation,email_log,user_email}.py`, `repositories/{email_confirmation,email_log,user_email,protocols}.py`, `workers/tasks/{email,confirmation}.py`).
- Миграции email-сервиса: `20260710_0001_initial.py` (базовая, без email-таблиц), `20260710_0002_add_email_logs.py`, `20260814_0003_add_user_emails_and_confirmations.py` (email-специфичные).
- `pyproject.toml` объявляет `aiosmtplib>=3.0` и `pydantic[email]`; обе нужны только email-логике. `[project].name` до сих пор `fastapi-template`.
- `src/settings.py` содержит `SMTPSettings`, `email_confirmation_ttl_hours`, `frontend_url` и требует `SMTP_PASSWORD` в production-валидации.
- `clients/nats/client.py` в email-service **создаёт** stream `NOTIFICATION_COMMANDS` с subjects `commands.notification.>` и durable consumer `notification-service-commands-send-email`, то есть фактически владеет топологией совместно с `notification-service`.
- `services/email-service/docs/asyncapi.yaml` и `services/notification-service/docs/asyncapi.yaml` описывают один канал `commands.notification.email.send` со схемой `NotificationEmailPayload`; VK-каналов нет.
- `agents/redis-databases.yaml`: БД 0 зарезервирована, 1 и 2 заняты email-service, «следующий свободный номер: 3».
- `.docker-compose/.env` (gitignored, локальный) занял порты: `8001` backend, `8002` notification, `8003` email; БД `5433`, `5434`, `5435`; Redis `6379`; NATS `4222`; MinIO `9000/9001`.
- Корневой `.gitignore` содержит `/services/`; каждый существующий сервис является отдельным git-клоном по `services.manifest`. Задача запрещает менять манифест.
- `scripts/secret-scan.sh` перечисляет сервисы явным списком `backend email-service notification-service frontend` и выполняет `git -C services/<name> ls-files`; `scripts/recreate-core.sh` содержит фиксированный core-набор compose-файлов и контейнеров.
- Архивная спека `repository-process-tooling` («Полный non-mutating core release gate») нормативно фиксирует core scope как **четыре** сервиса: `backend`, `frontend`, `notification-service`, `email-service`, и требует, чтобы aggregate build включал только их.

### Gap между намерением задачи и фактическим репозиторием

Задача говорит «в оркестраторе в директории `.docker-compose`». Фактически `.docker-compose/` лежит в корне монорепозитория, а каталог `orchestrator/` содержит другое. Планирование выполняется по фактической структуре: все compose-изменения — в корневом `.docker-compose/`.

## Goals / Non-Goals

**Goals:**

- получить запускаемый и проходящий `make lint` / `make test` скелет `services/vk-service` без упоминаний email в **реализации** (`src/`, `pyproject.toml`, `.env.example`); тесты и `README.md` наоборот обязаны называть email-сущности прямыми литералами, чтобы доказывать их отсутствие и происхождение деплой-конфигурации; `.helm/**` и `.github/**` копируются как есть по решению пользователя;
- сохранить архитектурные инварианты EqSiteCMS: Clean Architecture слои, DI-контейнер вместо `app.state`, отдельные классы настроек, Sentry/Prometheus lifecycle, Alembic-каркас;
- дать сервису собственные, не конфликтующие с существующими ресурсы: БД, Redis DB-номера, порты, имена контейнеров/образов, Celery-очередь;
- дать оркестрации `.docker-compose/docker-compose.vk.yml` и автономные Make-цели, не расширяя core release scope и не ломая `recreate-core.sh` / `secret-scan.sh`;
- зарезервировать имена будущего VK NATS-контракта так, чтобы реализация не требовала менять существующую топологию.

**Non-Goals:**

- бизнес-логика VK: VK API-клиент, токены сообщества, отправка сообщений, подтверждение пользователей, модели `vk_*`, endpoints рассылки, шаблоны;
- активный NATS consumer/handler VK-команд и публикация VK-команд из `notification-service`;
- любые правки `.helm/**` и `.github/**` нового сервиса (переименование release/образа/шаблонов, заведение k8s-секрета) и его production-деплой;
- изменение `services.manifest`, создание git-remote для нового сервиса и включение `vk-service` в core release gate (`build`, `check`, `test`, `lint`, `format`, `DC_CORE`, `migrate-core`, `recreate-core`, `health-core`, `status-core`, `logs-core`, `asyncapi-validate`);
- изменение поведения `email-service`, `notification-service`, `backend`, `frontend`, `site-ad`;

## Decisions

### 1. Скелет копируется целиком, затем вычищается по явному белому/чёрному списку

`vk-service` создаётся как копия `services/email-service` (без `.git`, `.venv`, `.mypy_cache`, `.ruff_cache`, `.pytest_cache`, `.env`), после чего применяется детерминированный список удалений и переименований, зафиксированный в `specs/vk-service-skeleton/spec.md`.

**Остаётся (переиспользуемый каркас):** `Dockerfile`, `.dockerignore`, `.flake8`, `.gitignore`, `.python-version`, `.vscode/settings.json`, `Makefile`, `scripts/check-format-excludes.sh`, `pyproject.toml`, `uv.lock`, `.env.example`, `README.md`, `docker-compose.yaml` (локальный dev), `.github/workflows/check_and_deploy.yml`, `.helm/**`; в `src/`: `main.py`, `settings.py`, `alembic.ini`, `migration/env.py`, `migration/script.py.mako`, `migration/versions/20260710_0001_initial.py`, `containers/`, `core/entities/base.py`, `core/exceptions/`, `core/schemas/base.py`, `core/schemas/messaging/base_event_data.py`, `clients/nats/client.py`, `clients/main_backend/client.py`, `depends/`, `models/__init__.py` (пустой реестр), `repositories/__init__.py` (пустой), `utils/**`, `workers/celery_app.py`, `workers/tasks/integration_probe.py`.

**Удаляется (email-специфика):** `src/api/**` целиком (`endpoints/emails.py`, `schemas/email.py`, `dependencies.py`), `src/infrastructure/**`, `src/core/services/*.py` (все четыре email-сервиса), `src/core/protocols/email_publisher.py`, `src/core/protocols/email_sender.py`, `src/core/protocols/messaging/handlers/notification_command_send_email.py`, `src/core/schemas/messaging/notification_command_send_email.py`, `src/models/{email_confirmation,email_log,user_email}.py`, `src/repositories/{email_confirmation,email_log,user_email,protocols}.py`, `src/migration/versions/{20260710_0002_add_email_logs,20260814_0003_add_user_emails_and_confirmations}.py`, `src/clients/nats/consumers/notification_commands_send_email.py`, `src/clients/nats/handlers/notification_commands_send_email.py`, `src/workers/tasks/{email,confirmation}.py`, тесты `tests/api/test_emails.py`, `tests/models/**`, `tests/services/**`, `tests/integration/test_email_log_concurrency.py`, `tests/clients/nats/test_notification_commands_send_email_consumer.py`.

Альтернатива «написать сервис с нуля по `fastapi_template`» отклонена: задача явно требует копирования `email-service`, а копия сохраняет уже отревьюенные Sentry/Prometheus/Celery/NATS решения и структуру CI/Helm.

Альтернатива «оставить email-код закомментированным как образец» отклонена: задача требует чистый сервис, а мёртвый код ломает `lint` и вводит ложный контракт.

### 2. Пустые пакеты сохраняются как точки расширения, а не удаляются

`src/models/__init__.py`, `src/repositories/__init__.py`, `src/core/services/__init__.py`, `src/clients/nats/consumers/__init__.py`, `src/clients/nats/handlers/__init__.py`, `src/core/protocols/messaging/handlers/__init__.py`, `src/workers/tasks/__init__.py` остаются с пустыми `__all__`. Это сохраняет Clean Architecture-скелет, не создаёт мёртвого кода и делает добавление VK-логики аддитивным. `src/migration/env.py` продолжает импортировать `models`, поэтому `models/__init__.py` обязателен.

Пакет `src/api/` удаляется целиком, потому что единственный оставшийся endpoint `GET /health` объявлен прямо в `src/main.py`; создавать пустой router-слой без единого маршрута — мёртвая абстракция. При появлении VK-endpoints слой восстанавливается по образцу `email-service`.

### 3. Отдельная БД `db-vk` заводится сразу, но остаётся пустой

Скелет сохраняет Alembic, `utils/database.py`, `models/__init__.py` и compose-сервис миграций — значит нужна реальная БД. Заводится контейнер `eqsitecms-db-vk` (`postgres:16`) в `.docker-compose/docker-compose.infra.yml`, БД/пользователь `eqsitecmsvk`, volume `eqsitecms_vk_db_data`, host-порт `5436` (следующий свободный после `5435`).

В `src/migration/versions/` остаётся только `20260710_0001_initial.py`, поэтому `alembic upgrade head` создаёт лишь `alembic_version`. Это доказуемо рабочая миграционная цепочка без email-таблиц.

Альтернатива «скелет без БД» отклонена: пришлось бы удалить Alembic, `utils/database.py` и compose-сервис миграций, а потом восстанавливать их в следующем change — это удорожает VK-задачу и расходится с образцом `email-service`.

Альтернатива «отдельная схема в существующей `eqsitecms-db-email`» отклонена: нарушает границу database-per-service, действующую для backend/notification/email.

### 4. Redis: отдельные DB 3 (broker) и 4 (backend), очередь `vk`

Реестр `agents/redis-databases.yaml` фиксирует правило «каждый сервис получает 2 последовательных номера, следующий свободный: 3». `vk-service` получает `CELERY_APP_BROKER=redis://:<password>@eqsitecms-redis:6379/3` и `CELERY_APP_BACKEND=...:6379/4`; реестр обновляется, следующим свободным становится 5. `CELERY_APP_MAIN=vk-service`, `task_queues=(Queue("vk"),)`, `task_default_queue="vk"`, worker `--hostname vk-worker@%h -Q vk`.

`workers/tasks/integration_probe.py` сохраняется как реальный broker-пробник, но имя задачи меняется `email.integration_probe` → `vk.integration_probe` в соответствии с naming convention `<domain>.<action>`.

Альтернатива «переиспользовать DB 1/2» отклонена: общий broker смешал бы очереди двух сервисов и сломал бы адресный `celery inspect ping` readiness-контракт.

### 5. NATS: клиент остаётся, топология не создаётся, имена резервируются

`vk-service` **не** создаёт stream `NOTIFICATION_COMMANDS` и **не** регистрирует durable consumer. `NatsJetstreamClient.setup_streams()` и `setup_consumers()` в новом сервисе становятся no-op, `connect()` использует `name="vk-service"`. Причина: stream уже создаётся `notification-service` и `email-service` с subjects `commands.notification.>`; третий владелец с расходящимся `StreamConfig` — источник конфликтов `add_stream`. Будущий VK subject `commands.notification.vk.send` уже покрыт существующим wildcard, поэтому реализация VK-consumer'а потребует только `add_consumer` с `filter_subject` и НЕ потребует менять stream.

В `NatsSettings` резервируются `NATS_SUBJECT_NOTIFICATION_COMMANDS_SEND_VK=commands.notification.vk.send` и `NATS_CONSUMER_NOTIFICATION_COMMANDS_SEND_VK=vk-service-commands-send-vk`; поля email (`..._SEND_EMAIL`) удаляются.

`services/vk-service/docs/asyncapi.yaml` на этапе скелета **не создаётся**, и цель `asyncapi-validate` не расширяется: публиковать канал, которого сервис не потребляет, значит создать ложный канонический контракт. В `README.md` добавляется раздел «NATS JetStream (зарезервировано)» с таблицей планируемых stream/subject/durable и явной пометкой, что контракт активируется отдельным change вместе с созданием `docs/asyncapi.yaml` и строкой в `asyncapi-validate`.

Существующие контракты (`commands.notification.email.send`, durable `notification-service-commands-send-email`, payload `NotificationEmailPayload`, headers `Nats-Msg-Id`) не изменяются.

### 6. Оркестрация: автономный проект `eqsitecms-vk`, core release scope не расширяется

`.docker-compose/docker-compose.vk.yml` повторяет структуру `docker-compose.email.yml` тремя сервисами:

| compose service | container | image | назначение |
|---|---|---|---|
| `vk-service` | `eqsitecms-vk-service` | `eqsitecms-vk:latest` | FastAPI, `expose: 8000`, healthcheck `GET /health` |
| `vk-migration` | `eqsitecms-vk-service-migration` | `eqsitecms-vk-migration:latest` | `alembic upgrade head`, поддержка `SKIP_MIGRATIONS` |
| `vk-celery-worker` | `eqsitecms-vk-celery-worker` | `eqsitecms-vk-celery:latest` | `celery ... -Q vk`, hostname `vk-worker`, `depends_on: redis healthy` |

Ключ compose-сервиса намеренно `vk-celery-worker`, а не `celery-worker` (как в email-файле), чтобы будущее объединение файлов в один проект не приводило к коллизии имён. Имя контейнера миграций — `eqsitecms-vk-service-migration` (без опечаточной склейки, присутствующей в существующих файлах).

Корневой `Makefile` получает только автономные цели: `COMPOSE_VK`, `DC_VK = docker compose -f $(COMPOSE_INFRA) -f $(COMPOSE_VK)`, `vk-build`, `vk-build-nc`, `vk`, `vk-attach`, `check-vk`, `fix-vk` и строку `docker compose -f $(COMPOSE_INFRA) -f $(COMPOSE_VK) config --quiet` в `compose-check`. Агрегаты `build`, `build-nc`, `check`, `fix`, `test`, `lint`, `format`, а также `DC_CORE`, `migrate-core`, `recreate-core`, `health-core`, `status-core`, `logs-core`, `asyncapi-validate` **не изменяются**.

Причины: (1) архивная спека `repository-process-tooling` нормативно ограничивает core scope четырьмя сервисами; (2) `scripts/secret-scan.sh` выполняет `git -C services/<name> ls-files`, а `vk-service` без записи в `services.manifest` не является git-клоном — включение сломало бы `make check`; (3) `scripts/recreate-core.sh` содержит собственный фиксированный core-набор и разошёлся бы с Makefile.

Альтернатива «сразу включить vk-service в core» отклонена и вынесена в открытые вопросы как отдельный follow-up change после появления git-репозитория и строки в манифесте.

### 7. Порты, имена и переменные окружения без конфликтов

| Ресурс | Значение | Основание |
|---|---|---|
| `EXPOSE_VK_SERVICE_PORT` | `8004` | заняты 8001/8002/8003; переменная резервируется в `.env` по аналогии с email (compose публикует только `expose: 8000` внутри сети) |
| `EXPOSE_VK_DB_PORT` | `5436` | заняты 5433/5434/5435 |
| `POSTGRES_VK_USER` / `POSTGRES_VK_NAME` | `eqsitecmsvk` | паттерн `eqsitecmsemail` |
| `POSTGRES_VK_PASSWORD` | локальное dev-значение / placeholder в примерах | `.docker-compose/.env` gitignored |
| `EQSITECMS_VK_DB_VOLUME` | `docker-compose_eqsitecms_vk_db_data` | паттерн существующих volume |
| Redis DB | `3` broker, `4` backend | реестр `agents/redis-databases.yaml` |
| Celery queue / hostname | `vk` / `vk-worker` | naming convention |
| Prometheus listener | `:9000` внутри контейнера, только `ENVIRONMENT=production` | как у остальных сервисов; на host не публикуется |

`.docker-compose/.env` — gitignored локальный файл, поэтому добавление `EXPOSE_VK_SERVICE_PORT`, `POSTGRES_VK_USER`, `POSTGRES_VK_PASSWORD`, `POSTGRES_VK_NAME`, `EXPOSE_VK_DB_PORT` является локальной инфраструктурной операцией; tracked-контрактом остаются сами compose-файлы. `services/vk-service/.env` создаётся локально из обновлённого `.env.example` (compose требует `required: true`).

### 8. Настройки: убираем SMTP и email-специфику, сохраняем production-валидацию

Из `src/settings.py` удаляются класс `SMTPSettings` и его экспорт `smtp_settings`, поля `email_confirmation_ttl_hours`, `frontend_url`, а из списка required production-секретов — `SMTP_PASSWORD`. Остаются `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `CELERY_APP_BROKER`, `CELERY_APP_BACKEND`, `MAIN_BACKEND_SERVICE_KEY`, `NATS_SERVERS`. `APP_TITLE` по умолчанию становится `VK Service`, `[project].name` в `pyproject.toml` — `vk-service`, `[project].description` — описание VK-сервиса.

Зависимости: удаляются `aiosmtplib`, `pydantic[email]` заменяется на `pydantic` (email-validator нужен только email-схемам). `uv.lock` пересобирается `uv lock`. `aiohttp` сохраняется (нужен `clients/main_backend/client.py`).

`DI-контейнер` очищается от `smtp_settings`, `email_sender`, email-service/handler/consumer провайдеров; остаются `nats_settings`, `nats_client`, `celery_settings`, `celery_app`.

`main.py`: удаляются импорт и подключение `emails_router`, старт/стоп email-consumer'а; остаются lifespan с `nats_client.connect()/close()`, metrics runtime, `close_database()`, обработчики `AppError` и `RequestValidationError`, endpoint `GET /health`.

### 9. CI и Helm копируются без изменений; переименовывается только документация

Решение пользователя: **«helm и секреты не трогай вообще, скопируй как есть»**. Поэтому `.helm/**` и `.github/workflows/check_and_deploy.yml` переносятся из `email-service` побайтово, без единой правки.

Практическое следствие, принимаемое сознательно: в новом сервисе остаются email-значения — `.github/workflows/check_and_deploy.yml` (`IMAGE=ghcr.io/igor-526/eqsitecms-email-service`, helm release `eqcms-email-service`, 2 вхождения), `.helm/values.yaml` (`eqcms-email-service`, `email-service`, `eqsitecms-email-service-secret`, образ, worker `-Q email`, 5 вхождений), `.helm/Chart.yaml` (1 вхождение) и пять файлов `.helm/templates/email-service-*.y*ml`. **Деплой-конфигурация `vk-service` в этом change нерабочая и не должна выкатываться.** Это осознанный технический долг, а не недосмотр: workflow целиком обслуживает helm-деплой, который исключён из scope, ветка `release` для нового сервиса не создаётся (remote отсутствует), а k8s-секрет `eqsitecms-vk-service-secret` не заводится. Приведение `.helm/**` и `.github/**` к VK выполняется отдельным change одновременно с созданием remote-репозитория, записи в `services.manifest` и секрета в кластере.

Проверяемым требованием вместо переименования становится побайтовая идентичность: `diff -r services/email-service/.helm services/vk-service/.helm` и `diff -r services/email-service/.github services/vk-service/.github` MUST быть пустыми.

Из-за этого guard-проверка на остатки email **не может** быть repo-wide по `services/vk-service`. См. решение 9a о её фактической области.

`README.md` полностью переписывается под VK-сервис: стек, структура `src/`, запуск, Celery-очередь `vk`, переменные окружения, API-таблица с единственным `GET /health`, раздел «NATS JetStream (зарезервировано)», раздел «Границы скелета» и отдельное предупреждение о неготовности `.helm/**` и `.github/**` к деплою.

`SERVICES.md` получает пункт «VK Service (`services/vk-service`)» с ролью «скелет канала доставки VK, вне core release scope», обновлённый список Redis DB и ту же пометку о деплой-долге.

### 9a. Guard-проверка ограничена реализацией; обфускация токенов запрещена

Guard на остатки email-домена применяется **только к реализации**: `services/vk-service/src`, `pyproject.toml`, `.env.example`.

Из области намеренно исключены:

| Исключение | Причина |
|---|---|
| `tests/**` | Тесты **обязаны** называть email-сущности: Unit-сценарии проверяют `404` для `/emails`, `/emails/send-confirmation`, `/emails/confirm`, отсутствие `SMTPSettings`/`smtp_settings` и донорских полей `NatsSettings`, а самосканирующий тест использует токены как данные |
| `README.md` | Раздел техдолга обязан **прямо** назвать `email-service` источником `.helm/**`/`.github/**` с конкретными значениями |
| `.helm/**`, `.github/**` | Копируются побайтово по решению пользователя (решение 9) |
| `uv.lock` | Содержит транзитивные имена пакетов |

Первая редакция плана включала в guard `tests/**` и `README.md`. Это оказалось прямым внутренним противоречием: требования спеки обязывают тесты называть email-эндпоинты, а guard запрещал сам токен. На практике противоречие было обойдено обфускацией литералов (`"e" + "mail"`, `"smt" + "p"`, `f"/{_DONOR_DOMAIN}s"`), из-за чего guard стал зелёным **обходом, а не соответствием**: проверка была замаскирована, тесты потеряли grep-ability, а README получил обезличенную формулировку «сервис-донор» вместо имени.

Поэтому вводится второе, встречное требование: запрещённые токены в `tests/**` и `README.md` MUST записываться обычными строковыми литералами. Склейка из фрагментов, кодирование и f-string-сборка из частей запрещены и проверяются отдельным Quality Gate пунктом `rg -n '"e"\s*\+\s*"mail"|"smt"\s*\+\s*"p"|"aio"\s*\+\s*"smt"' services/vk-service` с нулевым результатом.

Смысл разделения: guard доказывает, что **реализация** не содержит email-домена; тесты и документация доказывают, что email-поверхность **отсутствует** и откуда взялась деплой-конфигурация. Это разные задачи, и они не должны конкурировать за одну проверку.

Альтернатива «оставить guard широким и разрешить обфускацию» отклонена: она делает проверку недоказуемой и нечитаемой. Альтернатива «убрать guard совсем» отклонена: он остаётся единственной механической защитой от забытых email-фрагментов в `src/`.

### 9b. Известные расхождения и принятые отклонения реализации

Зафиксированы по факту выполнения зон 1 и 2; изменение плана здесь следует за проверенной на живом стеке реализацией, а не наоборот.

**1. Ключ `db_number` против `db` в `agents/redis-databases.yaml`.** Файл использует `db_number`, а архивная редакция требования `redis-infrastructure` описывала поле `db`. Расхождение **предсуществующее**: оно уже присутствует в main specs и не создано этим change. Файл не парсится ни одним инструментом и служит справочником для агентов. Инфраструктурный владелец сохранил фактическую конвенцию файла, чтобы не выполнять несогласованный рефакторинг с непроверяемым blast radius. Delta-спека этого change приведена к фактической конвенции `db_number`, чтобы `openspec sync specs` не занёс в main specs заведомо неверное утверждение. Полноценное согласование (переименование ключа в файле либо явное закрепление `db_number` во всех связанных документах) выносится в отдельный change. Альтернатива «переименовать ключ здесь» отклонена: это правка чужого реестра вне заявленного scope, а альтернатива «оставить в спеке `db`» отклонена, потому что sync зафиксировал бы ложь.

**2. Два `--env-file` в целях `vk`/`vk-attach`.** План изначально предполагал только `services/vk-service/.env`. Фактически необходимы оба файла: `POSTGRES_VK_USER/PASSWORD/NAME` и `EXPOSE_VK_DB_PORT` объявлены в `.docker-compose/.env`, а переменные приложения — в сервисном `.env`. Отклонение принято, задача 2.8 и спека `vk-service-orchestration` приведены в соответствие.

**3. `up -d --no-deps` и условный старт `redis`.** Объявленный в compose `depends_on: redis` с `condition: service_healthy` затягивал core-контейнер `eqsitecms-redis` в проект `eqsitecms-vk` и приводил к `Conflict. The container name "/eqsitecms-redis" is already in use`. Решение: поднимать сервисы по явному списку с `--no-deps`, а `redis` стартовать только при его фактическом отсутствии. Декларация `depends_on` в compose сохранена как выражение зависимости для сценариев, где проект поднимается изолированно. Это следствие принятого решения 6 (автономный проект `eqsitecms-vk` при общей инфраструктуре в `eqsitecms_network`).

**4. Фактический project label — `eqsitecms-vk`.** Задача 1.34 ожидала `com.docker.compose.project=eqsitecms`; `docker inspect eqsitecms-db-vk` показал `eqsitecms-vk` и `com.docker.compose.service=db-vk`. Первичный селектор исправлен, fallback по имени контейнера и запрет хардкода connection-параметров сохранены.

**5. Дефект `MAIN_BACKEND_URL`.** Реализация внесла `http://eqsitecms-backend:8000` — контейнера с таким именем не существует (донор `email-service` имел `http://localhost:8000`). Каноническим значением выбран `http://eqsitecms-app:8000`: main backend доступен в сети под именами `eqsitecms-app` (`container_name`) и `backend` (compose-alias), но остальные адреса `vk-service` уже записаны полными именами контейнеров, а alias `backend` надёжен лишь внутри compose-проекта backend, тогда как `vk-service` живёт в отдельном проекте. Исправление и проверка резолва вынесены в задачу 1.37.

**6. Незакрытый пробел ownership: `agents/howto/celery-protocols.md`.** `agents/backend.md` (шаг 2 раздела «Добавление нового сервиса с Celery/Redis») нормативно требует внести новый сервис в таблицу «Сервисы и их очереди», но первая редакция плана не назначила этот файл никому. Файл передан инфраструктурному владельцу, который уже владеет `agents/redis-databases.yaml`; добавлены задача 2.18, требование в спеке `celery-redis-protocols` и Quality Gate пункт.

**7. Пробел в документации переменных.** Спека требовала перечень инфраструктурных переменных и в `SERVICES.md`, и в `README.md`; фактически он попал только в `SERVICES.md`. Добавлена задача 1.36, включая `VK_TEST_CELERY_BROKER`/`VK_TEST_CELERY_BACKEND`, без которых infrastructure-тест `tests/integration/test_real_celery.py` не запускается.

**8. Регрессия email-цепочки сужена до проверенного leg.** Первая редакция smoke-сценария требовала сквозного прогона `backend → notification → email`. Полный end-to-end триггер требует публикации `events.site.callback.requested` в `SITE_EVENTS`, что отправило бы **реальное письмо** через настроенный SMTP и создало строки в БД трёх чужих сервисов. Исполнитель обоснованно отказался это делать, и пользователь принял проверенный leg.

Обоснование сужения: `vk-service` в этом change не создаёт stream, не регистрирует durable и не публикует ни одного сообщения — `setup_streams()` и `setup_consumers()` являются no-op (решение 5). Единственная точка, через которую он физически мог повлиять на email-цепочку, — shared stream `NOTIFICATION_COMMANDS`. Leg `backend → notification` не имеет ни одной точки соприкосновения с change, поэтому его регрессионная проверка вне scope.

Фактическое evidence live-прогона: `published_seq=47`, `delivered_and_acked=true`; consumer до `{num_pending:0, num_ack_pending:0, delivered_stream_seq:46, ack_floor:46}` → после `{num_pending:0, num_ack_pending:0, delivered_stream_seq:47, ack_floor:47}`; сообщения в stream `24 → 25 → (delete_msg seq=47) → 24`. Лог `eqsitecms-email-service`: `Processing incoming email event` → `Duplicate event_uuid — skipping` → `acking NATS`. Использован уже обработанный `event_uuid`, поэтому обработчик распознал дубликат, ack'нул и не дёрнул Celery; `email_logs` = 85 до и после, письмо не отправлено.

Запрет на реальную отправку письма — сознательное ограничение smoke-прогона, а не пропуск проверки: идемпотентность обработчика используется как безопасный способ проверить живость доставки без внешних побочных эффектов. Требование и два сценария зафиксированы в delta-спеке `nats-jetstream-protocols`. Альтернатива «выполнить полный end-to-end» отклонена: она выходит за границы ownership change, изменяет данные чужих сервисов и отправляет письмо реальному адресату.

### 10. Разделение ownership, порядок Quality Gate, sync и archive

| # | Deliverable | Владелец | Затронутые пути (эксклюзивно) |
|---|---|---|---|
| 1 | Скелет кода сервиса: копирование, чистка email, settings/DI/main/Celery/NATS, зависимости, тесты, README сервиса | **Backend** | `services/vk-service/**` |
| 2 | Оркестрация и реестры: compose-файлы, `.docker-compose/.env`, корневой `Makefile`, оба справочника в `agents/`, `SERVICES.md` | **Инфраструктура** (Backend-агент в роли infra-владельца) | `.docker-compose/docker-compose.vk.yml`, `.docker-compose/docker-compose.infra.yml`, `.docker-compose/.env`, `Makefile`, `agents/redis-databases.yaml`, `agents/howto/celery-protocols.md`, `SERVICES.md` |
| 3 | Общий Quality Gate по совокупному diff, включая smoke на живом стеке | **Quality Gate** | read-only по всем путям; findings возвращаются владельцам 1 и 2 |

Пересечений по файлам нет: владелец 1 не трогает ничего вне `services/vk-service/`, владелец 2 не трогает ничего внутри него. Deliverable 1 выполняется первым (нужен собираемый образ), deliverable 2 — вторым, deliverable 3 — после обоих.

Порядок завершения change: (1) approval пользователя; (2) Backend deliverable; (3) инфраструктурный deliverable; (4) единый Quality Gate; (5) устранение findings владельцами и повторный общий review; (6) `openspec sync specs`; (7) повторная `openspec validate <change> --type change --strict`; (8) archive.

### 11. API Access Policy

Скелет сознательно поднимает только `GET /health`. Полная access matrix с anonymous/authenticated сценариями и подтверждением отсутствия унаследованных `/emails*` endpoints зафиксирована в `specs/vk-service-skeleton/spec.md`. Исключений из дефолта (`GET` — Public Read, `POST/PATCH/DELETE` — Protected Write) нет, потому что write-endpoints в скелете отсутствуют. `:9000/metrics` не является FastAPI endpoint — это отдельный production-only infrastructure listener внутри `eqsitecms_network`, публикация которого на host запрещена.

### 12. Тестовая стратегия

Инициализация сервиса рассматривается как одна backend-фича «vk-service skeleton». План содержит не менее 30 разнообразных unit-сценариев и не менее 30 smoke-сценариев. Unit-тесты не требуют инфраструктуры и запускаются `make test` (`pytest -m "not infrastructure"`). Smoke выполняются **только** скиллом `.claude/skills/api-smoke-test` на поднятом стеке и реальной PostgreSQL; pytest-файлы в `tests/smoke/` запрещены.

#### PostgreSQL для smoke-тестов

Поиск 2026-08-27 по требуемым labels `com.docker.compose.project=eqsitecms` + `com.docker.compose.service=db` не дал результата: фактический project label существующего стека — `eqsitecms-core`. Применён fallback по имени/образу. `docker inspect eqsitecms-db-email` вернул: id `4e0c9823ee32`, `Name=/eqsitecms-db-email`, `Config.Image=postgres:16`, labels `com.docker.compose.project=eqsitecms-core`, `com.docker.compose.service=db-email`, network aliases `eqsitecms-db-email`/`db-email`, env `POSTGRES_DB=eqsitecmsemail`, `POSTGRES_USER=eqsitecmsemail`, `POSTGRES_PASSWORD=eqsitecmsemail`, host port `5432/tcp → 5435`.

Контейнер `eqsitecms-db-vk` на момент планирования не существует — он создаётся этим change. Исполнитель **обязан** после `make vk` повторить discovery уже для `eqsitecms-db-vk` (сначала labels `com.docker.compose.service=db-vk`, затем fallback по имени `eqsitecms-db-vk` / образу `postgres`) и взять `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` и host-порт `5432/tcp` из свежего `docker inspect`, без хардкода. Приведённые выше значения — evidence планирования, а не источник конфигурации.

## Risks / Trade-offs

- [Копия email-service сохранит скрытые email-упоминания в строках, комментариях и именах задач] → обязательная контрольная проверка `rg -ni "email|smtp|aiosmtplib" services/vk-service/src services/vk-service/pyproject.toml services/vk-service/.env.example` с нулевым результатом в чеклистах Backend и Quality Gate. Repo-wide проверка заведомо упала бы: `.helm/**`, `.github/**`, `tests/**` и `README.md` обязаны или вынужденно содержат email-токены (решения 9 и 9a).
- [Исполнитель обойдёт guard обфускацией литералов вместо приведения кода в соответствие] → guard ограничен реализацией, а обфускация запрещена отдельным требованием спеки и проверяется Quality Gate шаблонным поиском склеенных токенов; зелёный guard, достигнутый обходом, считается finding, а не выполнением.
- [`.helm/**` и `.github/**` останутся email-конфигурацией и кто-то попытается выкатить сервис] → зафиксировать долг в `README.md`, `SERVICES.md` и design; не создавать ветку `release` и k8s-секрет; Quality Gate проверяет побайтовую идентичность `.helm`/`.github` с email-service вместо переименования.
- [`uv.lock` после удаления `aiosmtplib`/`pydantic[email]` может разойтись с `Dockerfile` (`uv sync --locked`)] → пересобрать lock командой `uv lock`, проверить `uv sync --locked` и собрать образ `make vk-build-nc`.
- [Скелет `vk-service` не является git-клоном и попадает под корневой `/services/` в `.gitignore`] → сервис остаётся локальным до отдельного change, заводящего remote и строку в `services.manifest`; `scripts/secret-scan.sh` намеренно не расширяется.
- [Добавление `db-vk` в `docker-compose.infra.yml` изменит поведение `make infra` (появится лишний контейнер) и `DC_CORE down --remove-orphans`] → зафиксировать это в `SERVICES.md`/README, не включать `db-vk` в `migrate-core`/`recreate-core`, проверить `make compose-check` и работоспособность существующего core-стека после изменения.
- [Три сервиса могут конкурировать за создание stream `NOTIFICATION_COMMANDS`] → `vk-service` намеренно не создаёт stream и consumers (решение 5); проверяется unit-тестом на no-op `setup_streams`/`setup_consumers`.
- [Отсутствие `docs/asyncapi.yaml` может быть воспринято как нарушение требования «канонический AsyncAPI»] → в README зафиксировано, что сервис пока не участвует в messaging-контракте; активация канала — отдельный change с созданием AsyncAPI и расширением `asyncapi-validate`.
- [Пустые пакеты `models`/`repositories` могут провалить `basedpyright`/`ruff` на неиспользуемых импортах] → `__init__.py` содержат пустой `__all__` без импортов; `make lint` в сервисе обязателен до передачи deliverable.
- [Расхождение `db_number`/`db` между файлом и спекой введёт в заблуждение будущих исполнителей] → delta-спека приведена к фактической конвенции `db_number`, расхождение помечено как предсуществующее и вынесено в отдельный change; рефакторинг реестра в этом change запрещён.
- [`make vk` перехватит core-контейнер `eqsitecms-redis` в проект `eqsitecms-vk`] → подъём выполняется с `--no-deps` по явному списку сервисов, `redis` стартует только при отсутствии; Quality Gate проверяет сохранность project label у `eqsitecms-redis`.
- [Порт `8004` или `5436` может оказаться занят на конкретной машине] → значения задаются переменными `.docker-compose/.env`; при конфликте оператор меняет локальное значение без изменения compose-файлов.
- [`.docker-compose/.env` gitignored — новые переменные не попадут в репозиторий и сломают чужое окружение] → полный перечень новых переменных и их значений по умолчанию зафиксирован в spec и README, чтобы их можно было воспроизвести вручную.
- [Celery-очередь `vk` без задач может выглядеть «пустым» воркером] → сохранён `vk.integration_probe`, который делает воркер осмысленно проверяемым адресным `celery inspect ping` и infrastructure-тестом.

## Migration Plan

1. Получить пользовательское approval apply-ready change (Router останавливается здесь).
2. Backend-владелец создаёт `services/vk-service`, выполняет чистку, обновляет зависимости и тесты, оставляет `.helm/**` и `.github/**` нетронутыми, выполняет `git init` без remote и добивается зелёных `make lint` и `make test` внутри сервиса.
3. Инфраструктурный владелец добавляет `docker-compose.vk.yml`, `db-vk` в infra, локальные переменные `.docker-compose/.env`, Make-цели, обновляет `agents/redis-databases.yaml` и `SERVICES.md`; проверяет `make compose-check`.
4. Локально: `make vk-build-nc`, `make vk`, дождаться healthy `eqsitecms-vk-service` и `eqsitecms-vk-celery-worker`, выполнить `vk-migration`.
5. Повторить `docker inspect eqsitecms-db-vk`, затем выполнить smoke скиллом `api-smoke-test` по сценариям из `tasks.md`.
6. Единый Quality Gate по совокупному diff; findings возвращаются владельцам; повторный общий review.
7. `openspec sync specs`, повторная `openspec validate vk-service-initialization-059 --type change --strict`, archive.
8. Rollback: удалить `services/vk-service` вместе с его локальным `.git`, `.docker-compose/docker-compose.vk.yml`, откатить блок `db-vk` в `docker-compose.infra.yml`, VK-цели в `Makefile`, записи 3/4 в `agents/redis-databases.yaml` и раздел в `SERVICES.md`; `docker compose -p eqsitecms-vk down -v`. Существующие сервисы не затрагиваются, поэтому откат не требует миграций данных.

## Open Questions

Все вопросы планирования закрыты пользовательским approval от 2026-08-27. Ниже зафиксированы принятые решения; повторное открытие любого из них требует нового approval.

1. **Git-репозиторий и `services.manifest`** — РЕШЕНО: выполняется `git init` внутри `services/vk-service` **без remote**; `services.manifest` не изменяется. Remote и запись в манифест — отдельный follow-up change.
2. **Включение `vk-service` в core release scope** — РЕШЕНО: сервис остаётся вне `build`/`check`/`test`/`lint`/`format`/`DC_CORE`/`migrate-core`/`recreate-core`/`health-core`/`status-core`/`logs-core`/`asyncapi-validate`/`secret-scan` до появления VK-логики и git-remote.
3. **Имя будущего VK subject** — РЕШЕНО и УТВЕРЖДЕНО: `commands.notification.vk.send` и durable `vk-service-commands-send-vk` резервируются; оба покрыты существующим wildcard `commands.notification.>`, топология не меняется.
4. **Подтверждение пользователей через VK** — РЕШЕНО: выносится в отдельный будущий change; в этом change БД остаётся пустой (только `alembic_version`).
5. **Helm и секреты** — РЕШЕНО дословным указанием пользователя «helm и секреты не трогай вообще, скопируй как есть»: `.helm/**` и `.github/**` копируются побайтово, переименование отменено, k8s-секрет не заводится, деплой не производится. Технический долг зафиксирован в решении 9 и проверяется Quality Gate через `diff -r`.
