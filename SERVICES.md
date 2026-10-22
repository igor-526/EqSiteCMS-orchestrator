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

## 🌿 Git-workflow сервисных репозиториев (обязательно)

Каждый `services/<name>` — отдельный git-репозиторий со своим `origin` (см. `services.manifest`); корневой репозиторий их не отслеживает (`/services/` в `.gitignore`).

Когда задача требует изменений внутри любого `services/<name>`:

- **Никогда** не коммитить и не пушить напрямую в `main` или `dev` сервисного репозитория; `dev` — самая актуальная ветка (разработка идёт в ней, из `dev` операторы льют в `main`).
- Создать в сервисном репозитории отдельную feature-ветку от актуального `dev`; для связанной работы во всех репозиториях использовать одинаковое имя ветки, если оператор не указал иное.
- Не делать `git push` и не сливать feature-ветку в `dev` самостоятельно. После успешного Quality Gate локальное слияние и последующий push выполняет оператор.
- Перед слиянием оператор проверяет staged-изменения, пересечения локального diff и возможные конфликты.
- Локальная ветка `dev` сервисного репозитория создаётся и обновляется оператором; агент её напрямую не изменяет.

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
| Yandex Service | [services/yandex-service](<services/yandex-service/>) | Интеграция с Яндексом; вне core release scope |
| Ya Metrica Service | [services/ya-metrica-service](<services/ya-metrica-service/>) | Адаптер Яндекс Метрики; вне core release scope |
| Site: site-ad | `services/site-ad`  | Публичный сайт-потребитель read API                  |
| Site: site-ksk-inlove | `services/site-ksk-inlove` | Нейтральный каркас публичного сайта-потребителя Public Read API (вне core release scope; deployment запрещён) |


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
**Роль:** канал доставки VK и бот привязки пользователей. Сервис владеет привязкой пользователя EqSiteCMS к аккаунту VK: выдаёт контрольную строку, принимает её сообщением боту группы, хранит состояние привязки и журнал действий. Также потребляет callback-команды `commands.notification.vk.send` и доставляет сообщения по активным привязкам с per-recipient идемпотентностью. Создан копированием каркаса `services/email-service` с полной очисткой email-специфики.

**Границы сервиса (что есть и чего нет):**

- Реализовано: привязка и отвязка аккаунта VK, состояния `PENDING` / `ACTIVE` / `BLOCKED`, long-poll бот, приватный REST API `/vks*`.
- **Реализовано:** доставка callback-уведомлений через durable NATS consumer `commands.notification.vk.send`; выбор только ACTIVE/non-deleted привязок и отдельный ledger `vk_notification_deliveries` предотвращают повторную отправку уже успешному получателю.
- **Не реализовано:** массовые рассылки, вложения и клавиатуры бота.
- HTTP endpoints: `GET /health` (Public Read) и приватные `/vks*` — `GET /vks`, `GET /vks/bot-info`, `POST /vks`, `POST /vks/issue-confirmation`, `DELETE /vks/{user_id}`. Унаследованных `/emails*` endpoint'ов нет. Порт на host не публикуется: browser-facing gateway — только главный backend через `/api/vks/*`.
- Публичного маршрута подтверждения нет: контрольную строку сверяет long-poll runtime по сообщению из VK, а не HTTP-запрос.
- Prometheus listener `:9000/metrics` поднимается только при `ENVIRONMENT=production` и на host **не публикуется**.
- Alembic: initial-миграция, ревизия VK-домена и ledger доставки. `alembic upgrade head` создаёт `alembic_version`, `user_vks`, `vk_confirmations`, `vk_logs`, `vk_notification_deliveries`.
- NATS JetStream клиент **не создаёт** stream `NOTIFICATION_COMMANDS`: владельцем stream остаётся `notification-service`. VK Service регистрирует и запускает только собственный durable consumer `vk-service-commands-send-vk` для subject `commands.notification.vk.send`.
- `services/vk-service/docs/asyncapi.yaml` содержит зеркальный subscribe-контракт VK-команды. Он проверяется отдельной root-командой `make asyncapi-validate-vk`.
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
- **Не входит в core release scope.** Цели `build`, `build-nc`, `check`, `fix`, переменная `DC_CORE` и цели `migrate-core`, `recreate-core`, `health-core`, `status-core`, `logs-core` остаются на четырёх core-сервисах (`backend`, `frontend`, `email-service`, `notification-service`). Root `test`, `lint`, `format` используют расширенный набор service targets; это не расширяет норматив core gate (см. [текущую матрицу команд](<SERVICES.md#команды-и-пределы-поддержки-яндекса>)).
- **Не входит в core `asyncapi-validate`.** Цель по-прежнему проверяет три core-контракта (`backend`, `notification-service`, `email-service`); автономный VK-контракт проверяется отдельной целью `asyncapi-validate-vk`.

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

### 7. Public Site `site-ksk-inlove` (`services/site-ksk-inlove`)

**Технологии:** Next.js 15, React, TypeScript.

**Статус:** нейтральный starter публичного сайта-потребителя вне core release scope.

**Роль:** заготовка сайта InLove для anonymous Public Read API EqSiteCMS; пользовательские страницы и брендовый контент пока отсутствуют.

**Границы доступа и эксплуатации:**

- Публичные данные читаются через `GET` без CMS cookie, `Authorization` и иных admin credentials; tenant-bound маршруты требуют явно настроенный `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` и не имеют fallback на чужой tenant.
- Единственное сохранённое write-исключение — anonymous `POST /api/callback_requests` с tenant selector; формы и другого пользовательского UI в starter нет. CMS-only endpoint'ы и остальные write-операции запрещены.
- Stand domain `inlove-stand.eqcms.ru` является только deployment/configuration value, не runtime fallback. Git, remote и включение в `services.manifest` выполняются пользователем отдельно.
- `.helm/**` и `.github/**` неизменно унаследованы от `site-ad` и сохраняют его deployment identity. **Запускать Helm/Actions и развёртывать `site-ksk-inlove` запрещено** до отдельного deployment change.

### 8. Yandex Service и 9. Ya Metrica Service

[Yandex Service](<services/yandex-service/>) — интеграция с Яндексом; [Ya Metrica Service](<services/ya-metrica-service/>) — адаптер Яндекс Метрики. Это два самостоятельных ignored nested Git-репозитория, не submodules; оба зарегистрированы в [manifest:13–14](<services.manifest#L13-L14>). Регистрация не включает их в core release scope.

Полные lifecycle/storage/API/access-контракты и app settings оформляются отдельным service-backfill по [заданию 097](<docs/tasks/097_yandex_services_retrospective_specs.md>), а не этим корневым onboarding.

#### Ресурсы Яндекса

| Ресурс | Yandex | Metrica |
|---|---|---|
| Service Compose | [Yandex Compose](<.docker-compose/docker-compose.yandex.yml>) | [Metrica Compose](<.docker-compose/docker-compose.ya_metrica.yml>) |
| Compose project из Make | `eqsitecms-yandex` | `eqsitecms-ya-metrica` |
| App key / container | `yandex-service` / `eqsitecms-yandex-service` | `ya-metrica-service` / `eqsitecms-ya-metrica-service` |
| One-shot migration key / container | `yandex-migration` / `eqsitecms-yandex-service-migration` | `ya-metrica-migration` / `eqsitecms-ya-metrica-service-migration` |
| PostgreSQL 16 key / container | `db-yandex` / `eqsitecms-db-yandex` | `db-ya-metrica` / `eqsitecms-db-ya-metrica` |
| Logical volume | `eqsitecms_yandex_db_data` | `eqsitecms_ya_metrica_db_data` |
| Default volume name | `docker-compose_eqsitecms_yandex_db_data` | `docker-compose_eqsitecms_ya_metrica_db_data` |

Обе DB и volumes объявлены в [infra Compose:87–119](<.docker-compose/docker-compose.infra.yml#L87-L119>) и [195–198](<.docker-compose/docker-compose.infra.yml#L195-L198>), проект Make — `eqsitecms-infra`. Внутренние порты: app `8000`, DB `5432`; DB data mount — `/var/lib/postgresql/data`.

#### Безопасный root env inventory Яндекса

Это только инвентарь root Compose/Make, не полный список app settings. Значения портов, DB identity и credentials здесь не обнаруживались и не задаются по умолчанию.

| Переменные | Назначение | Безопасное представление |
|---|---|---|
| `EXPOSE_YANDEX_SERVICE_PORT`, `EXPOSE_YA_METRICA_SERVICE_PORT` | Host → app `8000` | `<выбранный свободный локальный порт>` |
| `POSTGRES_YANDEX_USER`, `POSTGRES_YA_METRICA_USER` | DB identity | `<локальный пользователь БД>` |
| `POSTGRES_YANDEX_NAME`, `POSTGRES_YA_METRICA_NAME` | DB name | `<локальное имя БД>` |
| `POSTGRES_YANDEX_PASSWORD`, `POSTGRES_YA_METRICA_PASSWORD` | DB secrets | `<задаётся локально; не публиковать>`; без default |
| `EXPOSE_YANDEX_DB_PORT`, `EXPOSE_YA_METRICA_DB_PORT` | Host → DB `5432` | `<выбранный свободный локальный порт>` |
| `EQSITECMS_YANDEX_DB_VOLUME` | Опциональное имя Yandex volume | Default: `docker-compose_eqsitecms_yandex_db_data` |
| `EQSITECMS_YA_METRICA_DB_VOLUME` | Опциональное имя Metrica volume | Default: `docker-compose_eqsitecms_ya_metrica_db_data` |
| `DEV_MOUNT` | Режим source mount | Defaults: app Yandex `rw`, app Metrica `ro`, обе migrations `ro`; override не проверялся |
| `SKIP_MIGRATIONS` | Условие пропуска миграции | Только точное `true` пропускает; не рекомендация отключать миграции |

Два независимых env-контура:

- Service Compose требует `services/yandex-service/.env` и `services/ya-metrica-service/.env` (`required: true`); [Make:26–30](<Makefile#L26-L30>) использует соответствующий service файл через `--env-file`.
- Infra Make использует отдельный `.docker-compose/.env`. Оператор согласовывает DB identity/credentials и адреса между контурами самостоятельно; service env не заменяет infra env.

Frontend-приоритет `.env.local`/`.env.prod` к этим сервисам не применяется: их Compose подключает только обязательный service `.env`. Локальные env не читать для документационной сверки; пароли и app credentials не переносить в tracked файлы. Полнота сервисных `.env.example` не проверялась и не обещается; полный app inventory — отдельный service-backfill по [заданию 097](<docs/tasks/097_yandex_services_retrospective_specs.md>). `SKIP_MIGRATIONS` читается shell контейнера через `$$`, не является доказанным обязательным app setting. Не использовать `docker compose config` для такой сверки: вывод может раскрыть интерполированные secrets.

#### Команды и пределы поддержки Яндекса

| Поверхность | Yandex | Metrica | Граница утверждения |
|---|---|---|---|
| Make up | `make yandex`, `make yandex-attach` | `make ya-metrica`, `make ya-metrica-attach` | Service Compose up; DB автоматически не поднимается |
| Make build | `make yandex-build`, `make yandex-build-nc` | `make ya-metrica-build`, `make ya-metrica-build-nc` | Индивидуальная сборка; `-nc` без cache, не core release |
| Root quality | `make test`, `make lint`, `make format` делегируют одноимённые service targets | То же | Расширенный набор по [Make:239–269](<Makefile#L239-L269>), не только четыре core-сервиса; факт delegation, не PASS service suites |
| Aggregate build/build-nc | Не включён | Не включён | По [Make:104–106](<Makefile#L104-L106>) только backend, notification, email, CMS frontend |
| Core check | Готовность не подтверждена | Готовность не подтверждена | `test`/`lint` не алиасы `check`; нормативный core gate не расширяется |
| stackctl registry, только baseline HEAD `4be101744e20299690773060a84c362184a2d5cc` | На этом HEAD профиль `yandex`, alias `yandex-service`; DB не зарегистрирована | На этом HEAD профиль, alias и DB не зарегистрированы | Не утверждение о текущем дереве; чужой local dirty overlay вне проверенного docs-only scope, не доказательство ready/migrate/release цепочки |
| shipctl plan | Обнаружение через manifest | Обнаружение через manifest | Не подтверждает release/ci/deploy поддержку |

Registry/discovery границы приведены по [design §2 и источникам](<openspec/changes/reconcile-yandex-root-onboarding/design.md#2-матрица-документируемых-команд>): [immutable stackctl registry:68–118 на baseline HEAD `4be101744e20299690773060a84c362184a2d5cc`](<https://github.com/igor-526/EqSiteCMS-orchestrator/blob/4be101744e20299690773060a84c362184a2d5cc/scripts/stackctl#L68-L118>) (локальная сверка: `git show 4be101744e20299690773060a84c362184a2d5cc:scripts/stackctl`, строки 68–118) и [shipctl plan discovery](<scripts/ship/plan.mjs#L462-L478>). Local dirty overlay registry отличается от этого baseline; он вне проверенного docs-only scope и не принят как подтверждение поддержки `ready`/`migrate`/release. Working-tree registry не является immutable evidence. Непроверенные `ready`/release рецепты для этих сервисов здесь не предлагаются.

`make format` изменяет файлы (mutating). Lane QG-FORMAT выполняет `make -C services/<svc> format/lint/test` только для сервисов, затронутых change, в текущем рабочем дереве (см. `agents/quality_gate.md`); изолированные копии и clean baseline не используются. Полный root-прогон — ответственность CI. Расширенные root recipes не меняют норматив core gate четырёх сервисов.

Оба service Compose требуют заранее существующую external network `eqsitecms_network`; DB и dependencies в них не объявлены. Individual up не гарантирует готовность DB/dependencies, успешность миграций или барьер запуска app после one-shot migration. `make infra` поднимает все infra services без списка, а не только эти две DB; это не безопасный узкий smoke.

**Host exposure:** текущие Compose публикуют app `8000` и DB `5432` на host через переменные без явного loopback bind. Dev Compose не является разрешением публичного или production использования. Документирование не закрывает и не узаконивает наблюдавшиеся auth/token gaps: сетевые ограничения и access remediation требуют отдельного service/access change с полной access matrix и anonymous/authenticated тестами. В этом docs-only change endpoint changes, endpoint/access matrix и HTTP access tests неприменимы; доступа к маршрутам он не доказывает.

#### Отложенные gaps Яндекса

| Gap | Не закрывается этим onboarding | Следующий контур |
|---|---|---|
| R-G1 | Root recipes расширены относительно нормативного core gate | Отдельное решение о scope quality tooling, без core promotion |
| R-G2 | Фактическая готовность core `check` не подтверждена | Tooling audit; нет обещания PASS или alias |
| R-G3 | Только на immutable baseline HEAD `4be101744e20299690773060a84c362184a2d5cc`: нет Metrica profile/alias и обеих DB в registry, у Yandex профиль без DB. Чужой local dirty overlay отличается, но вне проверенного docs-only scope и не доказывает ready/migration/release orchestration | Остаётся deferred; отдельный tooling change, этим docs-only fix gap не закрывается |
| R-G4 | Host exposure и наблюдавшиеся auth/token gaps | Будущий S1 access/boundary и peer contract после service units |
| R-G5 | Полные app env, lifecycle/storage, API/bindings и adapter contracts | Отдельное планирование Y1 → Y2; M1; затем S1 → F1 по [заданию 097](<docs/tasks/097_yandex_services_retrospective_specs.md>) |
| R-G6 | Deployment/Helm/CI/release readiness не аудитированы | Отдельное решение; manifest discovery недостаточно, core release не расширяется |
| R-G7 | Endpoint/errors зависят от принятого результата `normalize-yandex-client-failures` | Service-backfill после freeze; активный change не изменяется |

---
