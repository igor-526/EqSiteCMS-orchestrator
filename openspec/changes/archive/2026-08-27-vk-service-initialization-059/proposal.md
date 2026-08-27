## Why

Задача `docs/tasks/059_vk_service_initialization.md` требует подготовить площадку для будущей рассылки VK и подтверждения пользователей через VK по аналогии с уже работающим `email-service`. Сейчас в монорепозитории нет ни одного канала доставки, кроме email, поэтому `notification-service` не может публиковать VK-команды, а разработка VK-логики упирается в отсутствие сервисного скелета, compose-файла и Make-целей. Change создаёт чистый, проверяемый и запускаемый скелет `services/vk-service`, чтобы следующая задача занималась только бизнес-логикой VK.

## What Changes

- Создать новый сервис `services/vk-service` копированием структуры `services/email-service` с полной очисткой email-специфики из реализации: удалить SMTP-отправку, email-модели/репозитории/сервисы/схемы, email-миграции, email Celery-задачи, email NATS consumer/handler и email-тесты. Контрольная guard-проверка на остатки email применяется к реализации (`src/`, `pyproject.toml`, `.env.example`); тесты и `README.md` из неё исключены, потому что обязаны называть email-сущности прямыми литералами — тесты фиксируют отсутствие `/emails*` endpoints, README указывает происхождение деплой-конфигурации.
- Оставить в скелете только переиспользуемый каркас: FastAPI-приложение с `GET /health`, Sentry/Prometheus observability, Alembic с одной initial-миграцией, SQLAlchemy engine/session, DI-контейнер, NATS JetStream клиент без streams/consumers, Celery-приложение с очередью `vk`, HTTP-клиент main backend, `Makefile`, `Dockerfile`, а также `.github/**` и `.helm/**`, скопированные из `email-service` **без изменений** (решение пользователя: helm и секреты не трогать).
- Убрать из `pyproject.toml` зависимости, нужные только email (`aiosmtplib`, `email`-extra у `pydantic`), и пересобрать `uv.lock`.
- Очистить `src/settings.py` от `SMTPSettings`, `EMAIL_CONFIRMATION_TTL_HOURS` и `FRONTEND_URL`; зарезервировать NATS-имена будущего VK-канала (`commands.notification.vk.send`, durable `vk-service-commands-send-vk`) без активации подписки.
- Создать `.docker-compose/docker-compose.vk.yml` по образцу `docker-compose.email.yml` (API + миграции + celery-worker) и добавить в `.docker-compose/docker-compose.infra.yml` контейнер БД `db-vk`.
- Доработать корневой `Makefile` автономными целями `vk-build`, `vk-build-nc`, `vk`, `vk-attach`, `check-vk`, `fix-vk` и строкой в `compose-check`, не расширяя core release scope (`build`, `check`, `test`, `lint`, `format`, `DC_CORE`, `migrate-core`, `recreate-core`, `health-core`, `status-core`, `logs-core`, `asyncapi-validate` остаются на четырёх core-сервисах).
- Выделить `vk-service` номера Redis DB 3 (broker) и 4 (backend) и обновить реестр `agents/redis-databases.yaml`.
- Обновить `SERVICES.md` разделом о `vk-service` и его границах.
- Явное ограничение: `services.manifest` НЕ изменяется. **BREAKING** изменений существующих контрактов нет: stream `NOTIFICATION_COMMANDS`, subject `commands.notification.email.send`, durable `notification-service-commands-send-email`, AsyncAPI backend/notification/email и схемы БД остаются нетронутыми.
- Явное ограничение scope: `.helm/**` и `.github/workflows/check_and_deploy.yml` копируются как есть и временно описывают `email-service` (release name, образ, k8s-секрет, имена шаблонов `email-service-*`); новый сервис в этом change НЕ готов к деплою — приведение деплой-конфигурации к VK выполняется отдельным change вместе с созданием remote-репозитория и k8s-секрета. Это осознанный технический долг.
- Явное ограничение scope: бизнес-логика VK (VK API-клиент, отправка сообщений, подтверждение пользователей, модели БД, endpoints рассылки) в этом change НЕ проектируется и НЕ реализуется.

## Capabilities

### New Capabilities

- `vk-service-skeleton`: состав и границы кода нового сервиса `services/vk-service` — что копируется из `email-service`, что переименовывается, что удаляется; конфигурация, зависимости, Celery-очередь `vk`, NATS-клиент без активных streams/consumers, единственный HTTP endpoint `GET /health` с access matrix и baseline-тесты.
- `vk-service-orchestration`: оркестрация нового сервиса — `.docker-compose/docker-compose.vk.yml`, контейнер `db-vk` в `docker-compose.infra.yml`, переменные `.docker-compose/.env`, распределение портов/имён контейнеров и образов, автономные цели корневого `Makefile`, неизменность `services.manifest` и core release scope.

### Modified Capabilities

- `redis-infrastructure`: реестр `agents/redis-databases.yaml` должен содержать записи БД 3 и 4 для `vk-service`, следующим свободным номером становится 5.
- `celery-redis-protocols`: контракт очередей по доменам расширяется очередью `vk` и naming convention `vk.<action>` для задач нового сервиса.
- `nats-jetstream-protocols`: фиксируется правило владения stream `NOTIFICATION_COMMANDS` и резервирование VK subject/durable без активации consumer и без создания `services/vk-service/docs/asyncapi.yaml` на этапе скелета.

## Impact

- Новый код: `services/vk-service/**` (создаётся целиком; `src/`, `tests/`, `Makefile`, `Dockerfile`, `pyproject.toml`, `uv.lock`, `.env.example`, `README.md`, `scripts/`). Каталоги `.github/workflows/` и `.helm/` входят в копию, но не редактируются. Внутри `services/vk-service` выполняется `git init` без remote; `services.manifest` не изменяется.
- Оркестрация: новый `.docker-compose/docker-compose.vk.yml`, изменение `.docker-compose/docker-compose.infra.yml`, локальный (gitignored) `.docker-compose/.env`, корневой `Makefile`.
- Документация и реестры: `SERVICES.md`, `agents/redis-databases.yaml`.
- Не изменяются: `services.manifest`, `services/email-service/**`, `services/notification-service/**`, `services/backend/**`, `services/frontend/**`, `services/site-ad/**`, `scripts/recreate-core.sh`, `scripts/secret-scan.sh`, `scripts/sync.sh`.
- API Access Policy: применима. Новый сервис поднимает единственный HTTP endpoint `GET /health` (Public Read внутри `eqsitecms_network`) и production-only инфраструктурный listener `:9000/metrics`. Полная матрица `method | path | access class | roles | expected without auth | expected with auth`, включая подтверждение отсутствия унаследованных `/emails*` endpoints, находится в `specs/vk-service-skeleton/spec.md`.
- NATS/AsyncAPI: существующие контракты не меняются; новый AsyncAPI-документ на этапе скелета не создаётся, поэтому цель `asyncapi-validate` не расширяется.
- БД: создаётся отдельная пустая БД `eqsitecmsvk` в контейнере `eqsitecms-db-vk`; существующие схемы и данные не затрагиваются.
