# Архитектура и Сервисы

В данном документе описана высокоуровневая архитектура EqSiteCMS, роли микросервисов, инфраструктурных компонентов и способы их взаимодействия.

## 🚀 Общая архитектура

Проект построен по событийно-ориентированной микросервисной (и Service-Oriented) архитектуре.
Стек четко разделяет **Сбор/Аналитику данных**, **Бизнес-логику API** и **UI/Пользовательский интерфейс**.
Тяжёлые вычисления (кластеризация, сбор сторонней статистики) вынесены в асинхронные воркеры.

### Контур доступа API

EqSiteCMS поддерживает два контура доступа к API:

- **Public Read API**: публичные `GET` endpoint'ы для внешних сайтов-потребителей (например, `site-ad`) без авторизации.
- **Protected Admin API**: `POST`/`PATCH`/`DELETE` endpoint'ы для CMS-администрирования только с авторизацией и проверкой прав.

Исключения из этого дефолта допускаются только как явно задокументированные контрактные случаи.

---

## 🏗 Инфраструктура (Databases / Brokers)

- **PostgreSQL**: Основная транзакционная БД. Хранит пользователей, проекты, балансы, настройки сущностей.
- **Redis**: Брокер сообщений и backend для Celery. Номера БД распределены по сервисам (см. `agents/redis-databases.yaml`).
  - БД 0 — зарезервирована (кэш backend)
  - БД 1 — broker для email-service
  - БД 2 — backend для email-service
  - БД 3 — broker для vk-service
  - БД 4 — backend для vk-service
  - Следующий свободный номер — 5
- **NATS Jetstream**: Система обмена событиями между сервисами. Используется для pub/sub и command-потоков.

---

## ⚙️ Основные сервисы (Микросервисы)


| Сервис        | Путь                | Роль                                                 |
| ------------- | ------------------- | ---------------------------------------------------- |
| Backend Core  | `services/backend`  | API и бизнес-логика CMS + public read API для сайтов |
| Frontend CMS  | `services/frontend` | Админский интерфейс CMS (авторизованный контур)      |
| Email Service | `services/email-service` | Отправка email через NATS-команды и Celery-очередь |
| Notification Service | `services/notification-service` | Маршрутизация notification-команд между backend и каналами доставки |
| VK Service | `services/vk-service` | Канал доставки VK и бот привязки пользователей (вне core release scope; доставка уведомлений о событиях ещё не реализована) |
| Site: site-ad | `services/site-ad`  | Публичный сайт-потребитель read API                  |


### 1. Backend Core (`services/backend`)

**Технологии:** Python, FastAPI, Clean Architecture (core, api, repositories), SQLAlchemy, Alembic.  
**Роль:** Основной шлюз бизнес-логики и API-контрактов проекта.  
**Функциональность:**

- Обработка API-запросов для CMS (`services/frontend`).
- Публичная выдача данных для сайтов семейства `site-`* через public `GET`.
- Защищенные admin-операции (`POST`/`PATCH`/`DELETE`) с авторизацией и проверкой прав.
- Управление пользователями и auth-потоками.

### 2. Frontend CMS (`services/frontend`)

**Технологии:** React, Next.js, Turbopack, UI-kit.  
**Роль:** Клиентская часть CMS (SSR/CSR SPA), работающая в авторизованном контуре.  
**Функциональность:**

- Админские страницы и роутинг (`src/app`).
- Функциональные модули (`src/features`) для управления контентом и сущностями.
- Работа с protected admin API backend-сервиса.
- Ограничение: тяжелая бизнес-логика остается на backend.

### 3. Email Service (`services/email-service`)

**Технологии:** Python, FastAPI, Clean Architecture, NATS Jetstream, Celery + Redis.  
**Роль:** Асинхронная отправка email-уведомлений.  
**Функциональность:**

- Получает команды по NATS (`commands.notification.email.send`).
- Очередь задач Celery (`email`) для отложенной/фоновой отправки.
- DI-контейнер с NATS consumer и Celery app.
- Параллельные независимые системы: NATS для событий, Celery для задач в очереди.

### 4. Notification Service (`services/notification-service`)

**Технологии:** Python, FastAPI, PostgreSQL, NATS JetStream.
**Роль:** принимает события backend и публикует команды каналам доставки по каноническому AsyncAPI-контракту. Входит в core release scope.

### 5. VK Service (`services/vk-service`)

**Технологии:** Python, FastAPI, Clean Architecture, NATS JetStream, Celery + Redis, SQLAlchemy, Alembic, `vkbottle` (VK API + Bots Long Poll).
**Роль:** канал доставки VK и бот привязки пользователей. Сервис владеет привязкой пользователя EqSiteCMS к аккаунту VK: выдаёт контрольную строку, принимает её сообщением боту группы, хранит состояние привязки и журнал действий. Создан копированием каркаса `services/email-service` с полной очисткой email-специфики.

**Границы сервиса (что есть и чего нет):**

- Реализовано: привязка и отвязка аккаунта VK, состояния `PENDING` / `ACTIVE` / `BLOCKED`, long-poll бот, приватный REST API `/vks*`.
- **Не реализовано:** доставка уведомлений о событиях в VK. Публикации и потребления `commands.notification.vk.send` нет, поэтому включённый в CMS переключатель `callback/vk` пока не приводит к отправке сообщений. Также отсутствуют массовые рассылки, вложения и клавиатуры бота.
- HTTP endpoints: `GET /health` (Public Read) и приватные `/vks*` — `GET /vks`, `GET /vks/bot-info`, `POST /vks`, `POST /vks/issue-confirmation`, `DELETE /vks/{user_id}`. Унаследованных `/emails*` endpoint'ов нет. Порт на host не публикуется: browser-facing gateway — только главный backend через `/api/vks/*`.
- Публичного маршрута подтверждения нет: контрольную строку сверяет long-poll runtime по сообщению из VK, а не HTTP-запрос.
- Prometheus listener `:9000/metrics` поднимается только при `ENVIRONMENT=production` и на host **не публикуется**.
- Alembic: initial-миграция плюс ревизия VK-домена. `alembic upgrade head` создаёт `alembic_version`, `user_vks`, `vk_confirmations`, `vk_logs`.
- NATS JetStream клиент подключается, но **не создаёт** stream `NOTIFICATION_COMMANDS` и **не регистрирует** durable consumer. Владельцами stream остаются `notification-service` и `email-service`. Имена будущего VK-канала зарезервированы в настройках: subject `commands.notification.vk.send`, durable `vk-service-commands-send-vk`.
- `services/vk-service/docs/asyncapi.yaml` **не создан**: публиковать канал, который сервис не потребляет, значит создать ложный канонический контракт.
- Celery: очередь `vk`, `task_default_queue=vk`, задача-пробник `vk.integration_probe`, worker `--hostname vk-worker@%h`.

**Ресурсы:**

| Ресурс | Значение |
|---|---|
| PostgreSQL | контейнер `eqsitecms-db-vk`, БД/пользователь `eqsitecmsvk`, host-порт `5436`, volume `docker-compose_eqsitecms_vk_db_data`, таблицы `user_vks`, `vk_confirmations`, `vk_logs` |
| Redis | DB 3 (Celery broker), DB 4 (Celery backend) |
| Celery очередь / worker hostname | `vk` / `vk-worker` |
| NATS | `nats://eqsitecms-nats:4222` (клиент без streams/consumers) |
| Main backend | `MAIN_BACKEND_URL` + `X-Service-Key` |
| Compose-файл | `.docker-compose/docker-compose.vk.yml` |
| Compose-проект | `eqsitecms-vk` |
| Контейнеры | `eqsitecms-vk-service`, `eqsitecms-vk-service-migration`, `eqsitecms-vk-celery-worker`, `eqsitecms-vk-bot` (long-poll runtime, **единственный экземпляр**: Bots Long Poll допускает одного слушателя на группу) |
| Образы | `eqsitecms-vk:latest`, `eqsitecms-vk-migration:latest`, `eqsitecms-vk-celery:latest`, `eqsitecms-vk-bot:latest` |
| Порт приложения | `8000` внутри контейнера, `expose` без публикации на host |

**Make-цели (автономные, вне core release scope):** `vk-build`, `vk-build-nc`, `vk`, `vk-attach`, `vk-bot-logs`, `vk-bot-restart`, `check-vk`, `fix-vk`. Валидация compose входит в `make compose-check`.

**Переменные окружения VK-домена** (в `services/vk-service/.env`, placeholders — в `.env.example`):

| Переменная | По умолчанию | Кто заполняет |
|---|---|---|
| `VK_GROUP_TOKEN` | — | **Владелец VK-группы.** Секрет; в tracked-файлы, логи и ответы API не попадает |
| `VK_GROUP_ID` | `0` | **Владелец VK-группы** |
| `VK_GROUP_SCREEN_NAME` | — | **Владелец VK-группы** |
| `VK_API_VERSION` | `5.199` | значение по умолчанию |
| `VK_BOT_LINK_COMMAND` | `/link` | значение по умолчанию |
| `VK_CONFIRMATION_TTL_MINUTES` | `30` | значение по умолчанию |
| `VK_CONFIRMATION_CODE_LENGTH` | `8` | значение по умолчанию |
| `VK_CONFIRMATION_MAX_ATTEMPTS` | `5` | значение по умолчанию |
| `VK_CONFIRMATION_ATTEMPT_WINDOW_MINUTES` | `10` | значение по умолчанию |
| `VK_LONGPOLL_WAIT_SECONDS` | `25` | значение по умолчанию |

Пока первые три переменные не заполнены, контейнер `eqsitecms-vk-bot` завершается с понятной ошибкой в логах, `GET /vks/bot-info` отвечает `503`, а `eqsitecms-vk-service` остаётся `healthy`.

Главный backend адресует сервис переменной `VK_SERVICE_URL=http://eqsitecms-vk-service:8000`.

⚠️ **Запускать `vk-service` следует только через `make vk` (проект `eqsitecms-vk`).** Поскольку `db-vk` объявлен в общем `.docker-compose/docker-compose.infra.yml`, цель `make infra` поднимает его без явного списка сервисов — то есть в проекте `eqsitecms-infra`. Если сначала выполнить `make infra`, а затем `make vk`, Docker вернёт `Conflict. The container name "/eqsitecms-db-vk" is already in use`: контейнер с этим именем уже принадлежит другому compose-проекту. В таком случае удалите лишний контейнер (`docker rm -f eqsitecms-db-vk`) и поднимите сервис заново через `make vk` — данные сохранятся в volume `docker-compose_eqsitecms_vk_db_data`. Цели `make migrate-core` и `make recreate-core` этой проблемой не затронуты: они перечисляют инфраструктурные сервисы явно и `db-vk` не поднимают.

**Переменные локального `.docker-compose/.env`** (файл не версионируется, воспроизводится вручную):

```bash
EXPOSE_VK_SERVICE_PORT=8004
POSTGRES_VK_USER=eqsitecmsvk
POSTGRES_VK_PASSWORD=<локальное dev-значение>
POSTGRES_VK_NAME=eqsitecmsvk
EXPOSE_VK_DB_PORT=5436
```

Опционально: `EQSITECMS_VK_DB_VOLUME` (по умолчанию `docker-compose_eqsitecms_vk_db_data`).
Переменные приложения задаются в `services/vk-service/.env` (создаётся из `services/vk-service/.env.example`); compose подключает этот файл с `required: true`.

Для `make -C services/vk-service test-infra` дополнительно нужны `VK_TEST_CELERY_BROKER` и `VK_TEST_CELERY_BACKEND` (адреса Redis DB 3/4 с точки зрения хоста, где запускаются тесты) и `VK_TEST_DATABASE_URL` (адрес БД `eqsitecmsvk` с точки зрения хоста; при отсутствии берётся адрес из настроек сервиса).

#### Ограничения интеграции в монорепозиторий

`vk-service` сознательно оставлен вне процессной обвязки монорепозитория:

- **Не входит в `services.manifest`.** Внутри `services/vk-service` создан локальный git-репозиторий через `git init` **без remote**. Следствия: `make sync` его не синхронизирует, `make services-branches` его не показывает, `make secret-scan` его не сканирует (`scripts/secret-scan.sh` выполняет `git -C services/<name> ls-files` по манифесту).
- **Не входит в core release scope.** Цели `build`, `build-nc`, `check`, `fix`, `test`, `lint`, `format`, переменная `DC_CORE` и цели `migrate-core`, `recreate-core`, `health-core`, `status-core`, `logs-core` остаются на четырёх core-сервисах (`backend`, `frontend`, `email-service`, `notification-service`).
- **Не входит в `asyncapi-validate`.** Цель проверяет три существующих контракта (`backend`, `notification-service`, `email-service`).

Включение `vk-service` в манифест и core release scope выполняется отдельным change после создания remote-репозитория.

#### ⚠️ Технический долг: деплой-конфигурация не готова

Каталоги `services/vk-service/.helm/**` и `services/vk-service/.github/**` **скопированы из `services/email-service` без изменений** (решение пользователя: helm и секреты не трогать в рамках инициализации). Поэтому они описывают **email-service**, а не VK:

| Артефакт | Фактическое значение (унаследовано от `email-service`) |
|---|---|
| Helm release name | `eqcms-email-service` |
| Docker-образ в CI | `ghcr.io/igor-526/eqsitecms-email-service` |
| Команда worker'а в `.helm/values.yaml` | `-Q email` |
| Kubernetes-секрет | `eqsitecms-email-service-secret` |
| Имена шаблонов helm | `.helm/templates/email-service-*` |

**`services/vk-service` НЕ готов к деплою.** Выкатывать его запрещено: CI/Helm перезапишут релиз `email-service`. Приведение деплой-конфигурации к VK выполняется отдельным change вместе с созданием remote-репозитория и k8s-секрета.

### 6. Public Site `site-ad` (`services/site-ad`)

**Технологии:** отдельный фронтенд-проект сайта.  
**Роль:** Внешний сайт-потребитель API EqSiteCMS.  
**Функциональность:**

- Использует public read API backend-сервиса (преимущественно `GET` без авторизации).
- Не использует CMS-only endpoint'ы для администрирования.
- Может иметь собственную презентационную логику и маршруты, но контент получает из backend EqSiteCMS.

---
