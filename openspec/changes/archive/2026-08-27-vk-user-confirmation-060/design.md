## Context

**Текущее состояние (evidence из кода)**

- `services/vk-service` — скелет из change `2026-08-27-vk-service-initialization-059`: `src/main.py` без роутеров, `src/api/` отсутствует, `src/models/__init__.py` пуст, единственная миграция `20260710_0001_initial.py`, DI-контейнер отдаёт только NATS и Celery, очередь Celery — `vk`, задача-пробник `vk.integration_probe`. Единственный endpoint — `GET /health`.
- `services/email-service` — референсная реализация того же домена для email: `src/api/endpoints/emails.py` (5 endpoints), `src/core/services/user_email.py`, `src/core/services/email_confirmation.py`, `src/repositories/{user_email,email_confirmation,email_log}.py`, модели `user_emails` / `email_confirmations` с partial unique индексами, Celery-таск `email.send_confirmation`.
- `services/backend` — owner-only прокси email: `src/api/emails.py`, `src/core/services/email_proxy.py` (`_require_owner` сравнивает `actor.id` с `body.user_id`), `src/clients/email_service/`, ENV `EMAIL_SERVICE_URL`.
- `services/notification-service` — `src/core/seeds/channels.py` уже содержит активный канал `vk` (`22222222-2222-2222-2222-222222222222`), `NotificationSettingsService.get_settings` перечисляет декартово произведение активных событий и каналов, то есть кортеж `callback/vk` **уже возвращается** приватным API. `src/core/services/handlers/callback_handler.py` при `channel_code != "email"` возвращает `None`.
- `services/backend/src/core/policies/notification_settings.py` — `NOTIFICATION_ELIGIBILITY` содержит только `("callback", "email")`, `KNOWN_NOTIFICATION_CHANNELS` уже включает `vk`, поэтому кортеж `callback/vk` сегодня отфильтровывается на backend, а не падает.
- `services/frontend` — `src/features/notifications/ui/NotificationSettingsCard.tsx` рендерит один `Switch` на строку каталога и подписывает его `aria-label={...}: email`, то есть предполагает единственный канал.

**Намерения задачи (docs/tasks/060_vk_service_confirmation.md), не подтверждённые кодом**

- «Наш сервис будет одновременно и ботом» — bot runtime в репозитории отсутствует.
- «Держи состояние Active, Blocked и тд» — конкретный набор состояний в задаче не перечислен; фиксируется в этом design.
- «В идеале… ссылка, которая будет сразу направлять пользователя в диалог с уже собранным сообщением боту» — явно помечено как желательное, а не обязательное.

**Зарегистрированные gaps**

1. VK API не поддерживает предзаполнение текста сообщения в ссылке на диалог (`https://vk.me/<screen_name>` открывает диалог, но текст не подставляется). Требование деградирует до «диалог открывается + код копируется одной кнопкой»; полный автозаполненный текст остаётся `SHOULD`, реализуется только если подтверждён работающий механизм.
2. Доставка уведомлений в VK (`commands.notification.vk.send`) не реализуется в этом change, но переключатель `callback/vk` по решению пользователя включается сразу. Это осознанный gap: включённый переключатель до следующей задачи не приводит к отправке сообщений.
3. `services/email-service` не имеет автотестов для bot-подобных сценариев — переиспользовать нечего, тестовый каркас для long-poll пишется с нуля.

**Ограничения**

- Python `>=3.14,<3.15`, pydantic 2, SQLAlchemy Core (`Table`, а не declarative), asyncpg, Clean Architecture с protocols в `core/protocols`, репозитории возвращают `dict`.
- `vk-service` — приватный сервис: браузер обращается только к основному backend. Сеть `eqsitecms_network`, отдельный compose-проект `eqsitecms-vk`, отдельная БД `eqsitecmsvk`.
- API Access Policy: `GET` — Public Read по умолчанию, `POST`/`PATCH`/`DELETE` — Protected Write; исключения фиксируются в access matrix.
- `.helm/**` и `.github/**` в `vk-service` не редактируются (требование `vk-service-skeleton`).

## Goals / Non-Goals

**Goals:**

- Пользователь CMS может привязать свой VK-аккаунт, отправив боту группы сообщение с контрольной строкой, и отвязать его.
- `vk-service` владеет данными привязки, состояниями и журналом; знает, кто из пользователей CMS соответствует какому `vk_peer_id`.
- Состояние привязки корректно отражает разрешение на сообщения от группы: блокировка бота пользователем переводит привязку в `BLOCKED`, повторное разрешение — обратно в `ACTIVE`.
- Основной backend — единственный browser-facing gateway с owner-only boundary и полной access matrix.
- CMS показывает состояние привязки, контрольную строку, ссылки на группу и диалог (в новых вкладках) и позволяет отвязать VK.
- Пользователь может независимо включать каналы `email` и `vk` для события «Обратный звонок».
- Реализация останавливается на границе, где остаётся только заполнить реальные ENV (групповой токен, id/screen name группы).

**Non-Goals:**

- Публикация/потребление `commands.notification.vk.send`, форматирование и отправка уведомлений о событиях в VK.
- Webhook-режим (Callback API) VK — только long-polling.
- Клавиатуры, кнопки, вложения, диалоговые сценарии бота помимо привязки.
- Изменение существующего email-домена, его специфических требований и контрактов.
- Изменения `services/site-ad` и разделов CMS вне `/notifications`.
- Заполнение секретов и live-прогон против реальной VK-группы силами исполнителей.

## Decisions

### D1. Библиотека VK: `vkbottle`

**Выбор:** `vkbottle` (актуальная опубликованная версия `4.11.0`, релиз 2026-08-26) с транзитивным `vkbottle-types`.

**Обоснование:**

- Активно поддерживается: последний релиз — вчера относительно даты планирования.
- Классификаторы включают `Programming Language :: Python :: 3.14`, требование `python <4.0,>=3.10` — совместимо с `requires-python = ">=3.14,<3.15"`.
- Требует `pydantic <3.0.0,>=2.13.4` — совпадает с pydantic 2 в сервисе (текущее ограничение `pydantic>=2.10` поднимается до `>=2.13.4`).
- Требует `aiohttp <4.0.0,>=3.14.3`; в сервисе уже `aiohttp>=3.12`, ограничение поднимается до `>=3.14.3`.
- Даёт готовый `Bot` с Bots Long Poll, типизированными событиями (`message_new`, `message_allow`, `message_deny`) и типизированным API-клиентом, то есть закрывает и приём, и отправку сообщений.

**Альтернативы:**

- Собственный тонкий клиент на `aiohttp` (`groups.getLongPollServer` + `act=a_check`): минус внешняя зависимость, но плюс ~400 строк собственного кода, ручные ретраи, ручной разбор событий и типов. Отклонено: задача прямо просит выбрать поддерживаемую библиотеку.
- `vkwave` — развитие практически остановлено. `aiovk` — не обновляется. `vk_api` — синхронный. Все отклонены.

**Изоляция:** `vkbottle` используется только в `src/clients/vk/` и `src/bot/`. Домен (`core/services`, `repositories`) зависит от протоколов `core/protocols/vk/`, а не от библиотеки, поэтому замена библиотеки не затрагивает бизнес-логику и тесты домена.

### D2. Long-poll runtime — отдельный процесс и отдельный контейнер

**Решение:** `src/bot/main.py` — самостоятельная точка входа (`python -m bot` / `uv run python src/bot/main.py`), поднимаемая контейнером `eqsitecms-vk-bot` в `docker-compose.vk.yml`. FastAPI-приложение и Celery-воркер остаются без long-poll.

**Обоснование:**

- Bots Long Poll от VK допускает только один активный слушатель на группу: несколько экземпляров получают дубли событий и «воруют» друг у друга `ts`. Отдельный контейнер с `deploy.replicas = 1` делает это ограничение явным, тогда как фоновая задача в `lifespan` FastAPI ломается при масштабировании приложения.
- Долгоживущий цикл в `lifespan` мешает graceful restart HTTP-приложения и смешивает readiness API с состоянием внешнего соединения.
- В репозитории уже есть паттерн отдельных контейнеров под отдельные runtime (`vk-celery-worker`, `email-service` + `celery-worker`).

**Альтернативы:** background task в `lifespan` (отклонено — конфликт с масштабированием и рестартами); Celery beat с периодическим опросом (отклонено — long-poll держит соединение 25 с, это не задача для очереди).

### D3. Формат контрольной строки — короткая, человекопечатаемая

**Решение:** код из 8 символов алфавита `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (без визуально неоднозначных `I`, `O`, `0`, `1`), генерируется через `secrets.choice`, хранится в верхнем регистре, сверяется без учёта регистра и окружающих пробелов. Команда привязки — `VK_BOT_LINK_COMMAND` (значение по умолчанию `/link`), пользователь отправляет боту `\link ABC23XYZ`. TTL — `VK_CONFIRMATION_TTL_MINUTES`, по умолчанию 30 минут.

**Обоснование:** в отличие от email, где код попадает в кликабельную ссылку и может быть длиной 40 символов (`uuid4().hex + secrets.token_hex(4)`), здесь пользователь набирает или вставляет код руками. 8 символов из 32-символьного алфавита — 40 бит энтропии; вместе с коротким TTL, инвалидацией предыдущего кода и rate limit попыток этого достаточно. Полный `uuid4().hex` был бы непечатаемым на практике.

**Trade-off:** 40 бит слабее 160 бит email-кода. Компенсируется TTL 30 минут (против 24 часов), одноразовостью, единственным активным кодом на пользователя и ограничением попыток на `vk_peer_id`.

### D4. Модель данных

`user_vks`:

| поле | тип | примечание |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `user_id` | UUID NOT NULL | пользователь CMS |
| `vk_peer_id` | BIGINT nullable | id пользователя VK; `NULL`, пока привязка не подтверждена |
| `state` | VARCHAR(16) NOT NULL | `PENDING` / `ACTIVE` / `BLOCKED` |
| `vk_screen_name` | VARCHAR(64) nullable | кэш для отображения в CMS |
| `vk_display_name` | VARCHAR(255) nullable | кэш для отображения в CMS |
| `deleted_at` | TIMESTAMPTZ nullable | soft-delete |
| `created_at` / `updated_at` | TIMESTAMPTZ NOT NULL | `now()` |

Partial unique индексы: `uq_user_vks_user_id_active` на `user_id WHERE deleted_at IS NULL`, `uq_user_vks_peer_id_active` на `vk_peer_id WHERE deleted_at IS NULL AND vk_peer_id IS NOT NULL`. Индекс `ix_user_vks_state`.

`vk_confirmations`: `id`, `user_vk_id` (FK на `user_vks.id`), `code` (VARCHAR(16), unique index), `expires_at`, `created_at`, `used_at` nullable. Полностью повторяет форму `email_confirmations`.

`vk_logs`: `id`, `event_uuid` (UUID unique), `action`, `status`, `details` (JSONB), `created_at`. Аналог `email_logs`, но без полей письма — журнал действий привязки и bot-событий.

**Обоснование состояний:** три состояния покрывают жизненный цикл, наблюдаемый через VK: `PENDING` — код выдан, сообщение от пользователя не получено; `ACTIVE` — `vk_peer_id` привязан и группа имеет право писать; `BLOCKED` — получен `message_deny` (пользователь запретил сообщения от группы). Отвязка — не состояние, а soft-delete: это сохраняет симметрию с `user_emails` и делает `user_id` переиспользуемым после отвязки. Отдельное `UNLINKED` состояние отклонено как дублирующее `deleted_at`.

### D5. Ответственность за подтверждение — на стороне bot runtime, не HTTP

Пользователь инициирует привязку из CMS (`POST /api/vks/issue-confirmation`), что создаёт/переиспользует запись `user_vks` в состоянии `PENDING` и новую строку `vk_confirmations`. Само подтверждение выполняет bot runtime при получении `message_new`: он парсит команду, сверяет код, вызывает домен-сервис и отвечает пользователю в диалоге. Публичного «confirm»-endpoint нет — в отличие от email, где `PATCH /api/emails/confirm` нужен для клика по ссылке из письма.

**Следствие:** у VK-домена нет публичных write-исключений. Все browser-facing VK-эндпоинты — либо Protected Sensitive Read, либо Protected Write с owner-only правилом, что строго соответствует дефолтной API Access Policy.

### D6. Backend-контур VK-прокси

| маршрут backend | маршрут vk-service | назначение |
|---|---|---|
| `GET /api/vks/me` | `GET /vks?user_ids=<actor.id>` | состояние привязки владельца |
| `GET /api/vks/bot-info` | `GET /vks/bot-info` | id/screen name группы, команда, ссылки |
| `POST /api/vks/issue-confirmation` | `POST /vks/issue-confirmation` | выдать/обновить код владельцу |
| `DELETE /api/vks/{user_id}` | `DELETE /vks/{user_id}` | отвязка (soft-delete), owner-only |

`POST /vks` в приватном сервисе остаётся служебным (создание записи без выдачи кода) и через backend не проксируется, чтобы у CMS не было двух путей создания.

`VkProxyService._require_owner` копирует контракт `EmailProxyService`: `403` до любого downstream-вызова при чужом `user_id`, `401` для anonymous, `400` на malformed UUID/body вместо framework `422`, `502` на недоступность downstream. Role/scope не дают override.

**Обоснование `GET /api/vks/me` как Protected Sensitive Read:** привязка VK — персональные данные, consumer-сайтам не нужна; исключение симметрично уже утверждённому `GET /api/emails/me`.

**Обоснование `GET /api/vks/bot-info` как Public Read:** возвращает только публичные атрибуты группы VK (id, screen name, шаблон команды) без пользовательских данных, поэтому остаётся дефолтным Public Read и не требует исключения.

### D7. Каталог настроек: переключатели по каналам

`NOTIFICATION_ELIGIBILITY` получает `("callback", "vk"): frozenset({"ADMIN", "SUPERUSER"})`. Приватный notification-service уже возвращает кортеж `callback/vk`, поэтому изменения в notification-service не требуются — меняется только фильтр eligibility в backend.

Frontend перестраивает `NotificationSettingsCard`: строки каталога группируются по `event_code`, внутри строки рендерится по одному переключателю на `channel_code` с подписью канала; `pendingKey` остаётся `event_code/channel_code`, поэтому блокировка двойной отправки не меняется. Требование «no optimistic mutation» сохраняется.

VK-переключатель показывается независимо от состояния привязки, но при отсутствии активной привязки рядом выводится предупреждение, что уведомления не будут доставлены до привязки VK. Это честнее, чем скрывать переключатель, и не создаёт скрытых зависимостей между двумя карточками.

### D8. Устойчивость long-poll

- Один экземпляр на группу (`replicas: 1`, `restart: always`).
- Ошибки сети и `failed: 1/2/3` от VK обрабатываются переполучением long-poll сервера с экспоненциальным backoff; runtime не завершается при единичной ошибке.
- Обработка события идемпотентна: повторная доставка того же `message_id` не создаёт вторую привязку — код уже помечен `used_at`, повторная попытка получает ответ «уже подтверждено».
- Все bot-события журналируются в `vk_logs` независимо от результата, по аналогии с требованием логирования в `email-confirmation`.
- Rate limit: не более `VK_CONFIRMATION_MAX_ATTEMPTS` (по умолчанию 5) неуспешных попыток кода на `vk_peer_id` за окно `VK_CONFIRMATION_ATTEMPT_WINDOW_MINUTES`; при превышении бот отвечает отказом и не обращается к БД за сверкой.

### D9. Новые ENV `vk-service`

`VK_GROUP_TOKEN` (секрет, обязателен для bot runtime), `VK_GROUP_ID`, `VK_GROUP_SCREEN_NAME`, `VK_API_VERSION`, `VK_BOT_LINK_COMMAND`, `VK_CONFIRMATION_TTL_MINUTES`, `VK_CONFIRMATION_CODE_LENGTH`, `VK_CONFIRMATION_MAX_ATTEMPTS`, `VK_CONFIRMATION_ATTEMPT_WINDOW_MINUTES`, `VK_LONGPOLL_WAIT_SECONDS`. `VK_GROUP_TOKEN` добавляется в список обязательных production-секретов `Settings.validate_production_secrets`. В `.env.example` — только placeholders (`<set-...>`).

Backend получает `VK_SERVICE_URL` (каноническое значение `http://eqsitecms-vk-service:8000`).

**Граница остановки по требованию задачи:** исполнители доводят код, миграции, тесты и `.env.example` до готовности и фиксируют в отчёте перечень переменных, которые заполняет пользователь. Live-прогон против реальной VK-группы в этом change не выполняется.

## Ownership и границы

| Deliverable | Владелец | Пути (эксклюзивно) |
|---|---|---|
| A. Домен и данные `vk-service` | Backend | `services/vk-service/src/{models,repositories,core}/**`, `services/vk-service/src/migration/versions/**`, `services/vk-service/tests/{models,repositories,services}/**` |
| B. HTTP API и настройки `vk-service` | Backend | `services/vk-service/src/{api,settings.py,main.py,containers,depends}`, `services/vk-service/.env.example`, `services/vk-service/README.md`, `services/vk-service/pyproject.toml`, `uv.lock`, `services/vk-service/tests/api/**` |
| C. Bot runtime и VK-клиент | Backend | `services/vk-service/src/{bot,clients/vk}/**`, `services/vk-service/tests/bot/**` |
| D. Backend-прокси и eligibility | Backend | `services/backend/src/{api/vks.py,clients/vk_service,core/services/vk_proxy.py,core/protocols/vk_service.py,core/policies/notification_settings.py,depends/services.py,settings.py,main.py}`, `services/backend/.env.example`, `services/backend/tests/**` |
| E. CMS UI | Frontend | `services/frontend/src/api/vk.ts`, `services/frontend/src/types/api/notifications.ts`, `services/frontend/src/features/notifications/**`, `services/frontend/.env.example` |
| F. Оркестрация и документация | Backend | `.docker-compose/docker-compose.vk.yml`, `Makefile`, `SERVICES.md` |

Пересечения разрешаются порядком: A → B → C выполняются последовательно одним владельцем зоны `vk-service` (общие `settings.py`, `containers/application.py`, `pyproject.toml`). D и E зависят от согласованного контракта из B, но файлово не пересекаются с A/B/C и могут идти параллельно после фиксации контракта. F выполняется после C.

## Порядок Quality Gate, sync и archive

1. Все исполнители (A–F) завершают deliverables и отмечают только фактически выполненные tasks.
2. Router запускает **один общий Quality Gate** по всему diff: архитектура, соответствие access matrix (отдельно anonymous и authenticated), owner-only и foreign-resource проверки, отсутствие импортов приватных сервисов и `site-*` в CMS, прогон `make check-vk`, `make check-be`, `make check-fe`, unit/component тесты, ручной UI QA на desktop/tablet/mobile.
3. Findings возвращаются владельцам зон, исправляются, после чего общий review повторяется целиком.
4. После успешного Quality Gate — sync delta specs в `openspec/specs/`, повторная `openspec validate --strict`, затем archive change.

Evidence Quality Gate складывается в `docs/reports/`.

## Risks / Trade-offs

- **[Дубли событий при нескольких экземплярах long-poll]** → отдельный контейнер с одним экземпляром, требование в spec `vk-bot-longpolling`, проверка в Quality Gate.
- **[Групповой токен даёт полный доступ к переписке группы]** → токен только в `.env` bot-контейнера, никогда в `.env.example` и логах; `VK_GROUP_TOKEN` в списке обязательных production-секретов; в логах и отчётах маскируется.
- **[40 бит энтропии кода]** → короткий TTL, единственный активный код, одноразовость, лимит попыток на `vk_peer_id`.
- **[Пользователь заблокировал бота — сообщения молча теряются]** → обработка `message_deny` переводит привязку в `BLOCKED`, CMS показывает состояние и инструкцию по восстановлению.
- **[Включённый переключатель `callback/vk` без доставки]** → предупреждение в UI и явная фиксация gap в proposal; поведение согласовано с пользователем.
- **[Предзаполненный текст сообщения в ссылке невозможен]** → ссылка открывает диалог, код копируется кнопкой; полное автозаполнение остаётся `SHOULD`.
- **[Смена `aiohttp` до `>=3.14.3` и `pydantic` до `>=2.13.4`]** → `uv lock` пересобирается, `make check-vk` подтверждает совместимость; email-service и notification-service не затрагиваются (отдельные lock-файлы).
- **[Ложное `PENDING` навсегда]** → истёкшие `PENDING` записи без `vk_peer_id` не мешают повторной выдаче кода: `issue-confirmation` идемпотентно переиспользует запись и инвалидирует предыдущий код.
- **[Live-проверка против VK недоступна исполнителям]** → smoke-сценарии bot runtime выполняются против фейкового VK API (локальный stub long-poll), реальный прогон — после заполнения ENV пользователем.

## Migration Plan

1. Применить миграции `vk-service` на `eqsitecmsvk` (`make vk` поднимает `vk-migration` до `vk-service`). Миграции только добавляют таблицы — обратная совместимость полная.
2. Задеплоить `vk-service` и `vk-bot` (bot стартует и без валидного токена завершается с понятной ошибкой, не ломая HTTP-контур).
3. Задеплоить backend с `VK_SERVICE_URL`; до появления переменной новые маршруты отвечают `502`, существующие не затрагиваются.
4. Задеплоить CMS: карточка VK и VK-переключатель появляются вместе.
5. **Rollback:** отключить контейнер `vk-bot`, убрать `("callback", "vk")` из `NOTIFICATION_ELIGIBILITY` (переключатель исчезает, данные сохраняются), откатить frontend. `alembic downgrade` для VK-таблиц выполняется только при полном отказе от фичи — email- и notification-контуры от него не зависят.

## Open Questions

- Требуется ли модерация/белый список: должен ли бот отклонять привязку от пользователей, не состоящих в группе? Текущее решение — не требовать членства (код сам является доказательством владения аккаунтом CMS).
- Нужно ли уведомлять пользователя в VK о факте отвязки из CMS? Текущее решение — да, короткое информационное сообщение при `state = ACTIVE`; при `BLOCKED` отправка не выполняется.
