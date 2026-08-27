## MODIFIED Requirements

### Requirement: Compose-файл vk-service в .docker-compose

Файл `.docker-compose/docker-compose.vk.yml` MUST существовать в корневом каталоге `.docker-compose/` и повторять структуру `.docker-compose/docker-compose.email.yml`. Он SHALL объявлять ровно четыре сервиса, использующих внешнюю сеть `eqsitecms_network`, сборочный контекст `../services/vk-service`, `env_file` `../services/vk-service/.env` с `required: true` и монтирование `../services/vk-service/src:/app/src:${DEV_MOUNT:-ro}`:

| compose service | container_name | image | назначение |
|---|---|---|---|
| `vk-service` | `eqsitecms-vk-service` | `eqsitecms-vk:latest` | FastAPI, `expose: "8000"`, healthcheck по `http://localhost:8000/health` |
| `vk-migration` | `eqsitecms-vk-service-migration` | `eqsitecms-vk-migration:latest` | `restart: "no"`, `alembic -c alembic.ini upgrade head` с поддержкой `SKIP_MIGRATIONS=true` |
| `vk-celery-worker` | `eqsitecms-vk-celery-worker` | `eqsitecms-vk-celery:latest` | `celery -A workers.celery_app worker -Q vk`, `hostname: vk-worker`, `depends_on: redis` с `condition: service_healthy`, healthcheck адресным `celery inspect ping` |
| `vk-bot` | `eqsitecms-vk-bot` | `eqsitecms-vk-bot:latest` | long-poll runtime бота VK, единственный экземпляр, `restart: always`, порты MUST NOT публиковаться и MUST NOT объявляться в `expose` |

Ключ compose-сервиса воркера MUST быть `vk-celery-worker`, а не `celery-worker`, чтобы исключить коллизию имён при объединении compose-файлов в один проект. Порт приложения MUST NOT публиковаться на host. Сервис `vk-bot` MUST запускать точку входа bot runtime, MUST NOT масштабироваться более одного экземпляра (Bots Long Poll допускает одного слушателя на группу) и MUST NOT иметь HTTP-healthcheck; его готовность проверяется по логам и по статусу процесса.

#### Scenario: Compose-файл валиден

- **WHEN** выполняется `docker compose -f .docker-compose/docker-compose.infra.yml -f .docker-compose/docker-compose.vk.yml config --quiet`
- **THEN** команда завершается с кодом 0

#### Scenario: Имена контейнеров и образов не конфликтуют

- **WHEN** reviewer сравнивает `docker-compose.vk.yml` с `docker-compose.be.yml`, `docker-compose.notification.yml`, `docker-compose.email.yml` и `docker-compose.fe.yml`
- **THEN** ни одно значение `container_name`, `image` или ключа сервиса не совпадает с уже используемым

#### Scenario: Сервис поднимается и становится healthy

- **WHEN** выполняется `make vk` при поднятой сети `eqsitecms_network`
- **THEN** контейнеры `eqsitecms-vk-service` и `eqsitecms-vk-celery-worker` переходят в состояние `healthy`
- **AND** `eqsitecms-vk-service-migration` завершается с кодом 0

#### Scenario: Bot-контейнер объявлен единственным экземпляром

- **WHEN** reviewer читает описание сервиса `vk-bot`
- **THEN** масштабирование более одного экземпляра запрещено явной пометкой либо `deploy.replicas: 1`
- **AND** причина (единственный слушатель Bots Long Poll на группу) зафиксирована комментарием

#### Scenario: Bot без токена не ломает HTTP-контур

- **WHEN** `VK_GROUP_TOKEN` не заполнен и выполняется `make vk`
- **THEN** контейнер `eqsitecms-vk-bot` завершается с понятной ошибкой в логах
- **AND** `eqsitecms-vk-service` остаётся `healthy`, а `GET /health` отвечает `200`

#### Scenario: Bot-контейнер не публикует порты

- **WHEN** reviewer читает описание сервиса `vk-bot`
- **THEN** секции `ports` и `expose` отсутствуют

### Requirement: Непересекающееся распределение портов и переменных окружения

Локальный (gitignored) файл `.docker-compose/.env` SHALL получить переменные `EXPOSE_VK_SERVICE_PORT=8004`, `POSTGRES_VK_USER=eqsitecmsvk`, `POSTGRES_VK_PASSWORD=<локальное значение>`, `POSTGRES_VK_NAME=eqsitecmsvk`, `EXPOSE_VK_DB_PORT=5436`. Значения MUST NOT конфликтовать с занятыми `8001`, `8002`, `8003`, `5433`, `5434`, `5435`, `6379`, `4222`, `9000`, `9001`. Поскольку файл не версионируется, полный перечень новых переменных MUST быть продублирован в `services/vk-service/README.md` и в `SERVICES.md`, чтобы окружение воспроизводилось вручную. README MUST также перечислять `VK_TEST_CELERY_BROKER` и `VK_TEST_CELERY_BACKEND`, требуемые infrastructure-тестом `tests/integration/test_real_celery.py`.

Переменные VK-домена (`VK_GROUP_TOKEN`, `VK_GROUP_ID`, `VK_GROUP_SCREEN_NAME`, `VK_API_VERSION`, `VK_BOT_LINK_COMMAND`, `VK_CONFIRMATION_TTL_MINUTES`, `VK_CONFIRMATION_CODE_LENGTH`, `VK_CONFIRMATION_MAX_ATTEMPTS`, `VK_CONFIRMATION_ATTEMPT_WINDOW_MINUTES`, `VK_LONGPOLL_WAIT_SECONDS`) относятся к приложению и MUST находиться в `services/vk-service/.env` с placeholder-значениями в `services/vk-service/.env.example`. `VK_SERVICE_URL=http://eqsitecms-vk-service:8000` MUST быть добавлен в `services/backend/.env.example` и в локальный `.env` основного backend. Реальные секреты MUST NOT попадать в tracked-файлы; `VK_GROUP_TOKEN` MUST NOT появляться в `.env.example`, `SERVICES.md`, README и логах.

#### Scenario: Порты свободны

- **WHEN** оператор поднимает стек с новыми переменными
- **THEN** `eqsitecms-vk-service` и `eqsitecms-db-vk` стартуют без ошибок `port is already allocated`

#### Scenario: Переменные документированы

- **WHEN** выполняется `rg -cE "EXPOSE_VK_SERVICE_PORT|POSTGRES_VK_|EXPOSE_VK_DB_PORT|VK_TEST_CELERY" services/vk-service/README.md`
- **THEN** результат ненулевой, и `SERVICES.md` содержит тот же перечень
- **AND** новый разработчик может воспроизвести окружение, не читая gitignored `.docker-compose/.env`

#### Scenario: Секреты не коммитятся

- **WHEN** выполняется `make secret-scan`
- **THEN** проверка завершается успешно и tracked-файлы не содержат реальных паролей, service key или группового токена VK

#### Scenario: Переменные VK перечислены как заполняемые владельцем

- **WHEN** reviewer читает таблицу переменных в `services/vk-service/README.md`
- **THEN** `VK_GROUP_TOKEN`, `VK_GROUP_ID` и `VK_GROUP_SCREEN_NAME` явно помечены как заполняемые владельцем VK-группы перед первым запуском бота

#### Scenario: Адрес vk-service доступен основному backend

- **WHEN** reviewer читает `services/backend/.env.example`
- **THEN** `VK_SERVICE_URL` присутствует со значением `http://eqsitecms-vk-service:8000`

### Requirement: Автономные Make-цели vk-service без расширения core release scope

Корневой `Makefile` SHALL получить переменные `COMPOSE_VK = $(COMPOSE_DIR)/docker-compose.vk.yml` и `DC_VK = docker compose -f $(COMPOSE_INFRA) -f $(COMPOSE_VK)`, цели `vk-build`, `vk-build-nc`, `vk`, `vk-attach`, `vk-bot-logs`, `vk-bot-restart`, `check-vk`, `fix-vk` с регистрацией в `.PHONY`, а также строку валидации `docker compose -f $(COMPOSE_INFRA) -f $(COMPOSE_VK) config --quiet` в цели `compose-check`. Переменная `VK_SERVICES` MUST включать `vk-bot`. Цели `build`, `build-nc`, `check`, `fix`, `test`, `lint`, `format`, переменная `DC_CORE` и цели `migrate-core`, `recreate-core`, `health-core`, `status-core`, `logs-core`, `asyncapi-validate`, `secret-scan`, `services-branches` MUST оставаться неизменными: `vk-service` не входит в core release scope до отдельного change. `check-vk` SHALL выполнять `mypy`, `basedpyright`, `ruff check`, `ruff format --check`, `flake8` и `pytest -m "not infrastructure"`; `fix-vk` SHALL вызывать `$(MAKE) -C services/vk-service format`. Цели `vk` и `vk-attach` MUST передавать **два** `--env-file` — `$(COMPOSE_DIR)/.env` (источник `POSTGRES_VK_*` и `EXPOSE_VK_DB_PORT`) и `$(SERVICES_DIR)/vk-service/.env` (переменные приложения) — и MUST подниматься с `--no-deps` по явному списку сервисов, стартуя `redis` только при его отсутствии. Причина: без `--no-deps` объявленный в compose `depends_on: redis` затягивает core-контейнер `eqsitecms-redis` в проект `eqsitecms-vk` и падает с `Conflict. The container name "/eqsitecms-redis" is already in use`. Объявление `depends_on` с `condition: service_healthy` в compose-файле при этом MUST сохраняться как декларация зависимости. `vk-bot-logs` SHALL показывать логи контейнера `eqsitecms-vk-bot`, `vk-bot-restart` SHALL перезапускать только этот контейнер.

#### Scenario: Автономный запуск сервиса

- **WHEN** оператор выполняет `make vk-build` и затем `make vk`
- **THEN** образы собираются, проект `eqsitecms-vk` поднимается, существующий core-стек не пересоздаётся

#### Scenario: Core Redis не перехватывается проектом vk

- **WHEN** оператор выполняет `make vk` при уже запущенном core-контейнере `eqsitecms-redis`
- **THEN** команда завершается успешно без ошибки `Conflict. The container name "/eqsitecms-redis" is already in use`
- **AND** `eqsitecms-redis` сохраняет исходный project label и не пересоздаётся в проекте `eqsitecms-vk`

#### Scenario: Core release gate не расширен

- **WHEN** reviewer сравнивает diff корневого `Makefile`
- **THEN** цели `build`, `build-nc`, `check`, `fix`, `test`, `lint`, `format`, `migrate-core`, `recreate-core`, `health-core`, `status-core`, `logs-core`, `asyncapi-validate` и переменная `DC_CORE` не изменены

#### Scenario: Валидация compose включает новый файл

- **WHEN** выполняется `make compose-check`
- **THEN** проверяется в том числе `docker-compose.vk.yml` и команда завершается с кодом 0

#### Scenario: Существующие сценарии запуска не сломаны

- **WHEN** после изменения `Makefile` выполняются `make compose-check` и `make email`
- **THEN** обе команды работают как до change

#### Scenario: Bot включён в список сервисов и имеет собственные цели

- **WHEN** оператор выполняет `make vk`, затем `make vk-bot-logs` и `make vk-bot-restart`
- **THEN** `eqsitecms-vk-bot` поднят вместе с остальными сервисами проекта, его логи отображаются, а перезапуск затрагивает только этот контейнер

#### Scenario: Сборка включает образ бота

- **WHEN** выполняется `make vk-build`
- **THEN** собирается в том числе образ `eqsitecms-vk-bot:latest`

### Requirement: Архитектурная документация и реестры синхронизированы

`SERVICES.md` SHALL содержать запись о `services/vk-service` в каталоге сервисов и отдельный раздел с ролью «канал доставки VK и бот привязки пользователей, вне core release scope», перечнем ресурсов (БД `eqsitecmsvk` с таблицами `user_vks`, `vk_confirmations`, `vk_logs`, Redis DB 3/4, очередь `vk`, контейнер бота, порты), явными границами (доставка уведомлений о событиях в VK не реализована) и пометкой, что `.helm/**` и `.github/**` нового сервиса скопированы из `email-service` без изменений и не готовы к деплою. Раздел MUST перечислять переменные окружения VK-домена и указывать, какие из них заполняет владелец VK-группы. Помимо `SERVICES.md`, инфраструктурный владелец SHALL обновлять оба справочника в `agents/`: `agents/redis-databases.yaml` (номера Redis DB) и `agents/howto/celery-protocols.md` (таблица «Сервисы и их очереди»). Оба файла входят в его эксклюзивную зону ownership. Список Redis DB в `SERVICES.md` MUST быть обновлён записями для `vk-service`.

#### Scenario: Каталог сервисов актуален

- **WHEN** reviewer читает `SERVICES.md`
- **THEN** таблица сервисов содержит `services/vk-service`, а раздел описывает его роль, ресурсы, границы и неготовность деплой-конфигурации

#### Scenario: Список Redis DB актуален

- **WHEN** reviewer читает раздел инфраструктуры `SERVICES.md`
- **THEN** перечислены БД 3 (broker `vk-service`) и 4 (backend `vk-service`)

#### Scenario: Оба справочника в agents обновлены одним владельцем

- **WHEN** reviewer проверяет diff `agents/`
- **THEN** обновлены и `agents/redis-databases.yaml`, и `agents/howto/celery-protocols.md`
- **AND** изменения выполнены инфраструктурным владельцем без пересечения с зоной `services/vk-service/**`

#### Scenario: Роль сервиса и контейнер бота описаны

- **WHEN** reviewer читает раздел `vk-service` в `SERVICES.md`
- **THEN** контейнер `eqsitecms-vk-bot` перечислен среди ресурсов сервиса с пояснением про единственный экземпляр long-poll
- **AND** явно указано, что доставка уведомлений о событиях в VK ещё не реализована
