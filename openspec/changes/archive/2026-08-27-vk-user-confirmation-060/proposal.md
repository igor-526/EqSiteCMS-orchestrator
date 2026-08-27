## Why

В задаче `059_vk_service_initialization` создан чистый скелет `services/vk-service` (Celery-очередь `vk`, зарезервированные NATS-имена, единственный endpoint `GET /health`), но у сервиса нет ни домена, ни собственных данных: VK-канал уведомлений (`channel.code = "vk"` в seed notification-service) невозможно использовать, потому что система не знает, какому пользователю EqSiteCMS соответствует какой пользователь VK.

Задача `docs/tasks/060_vk_service_confirmation.md` требует закрыть эту дыру: `vk-service` становится одновременно и ботом VK-группы, пользователь привязывает свой VK к аккаунту CMS, отправив боту сообщение с контрольной строкой, а CMS получает управление привязкой и настройками уведомлений по аналогии с email. Фактическая доставка уведомлений в VK остаётся следующей задачей — здесь строится идентификация и жизненный цикл привязки.

## What Changes

### vk-service (новый домен и bot runtime)

- Добавляется зависимость `vkbottle` (async, актуальная версия поддерживает Python 3.14 и pydantic 2) и её транзитивные требования; `aiohttp` поднимается до `>=3.14.3`.
- Появляются таблицы `user_vks` (привязка `user_id` ↔ VK `peer_id`, состояние, soft-delete), `vk_confirmations` (контрольная строка с TTL) и `vk_logs` (журнал действий по аналогии с `email_logs`), а также Alembic-миграции.
- Появляется отдельный long-polling runtime бота (`Bots Long Poll API` через `vkbottle`), запускаемый как самостоятельный процесс. Runtime обрабатывает `message_new` (команда привязки), `message_allow`, `message_deny`, приводит состояние привязки в `ACTIVE` / `BLOCKED` и отвечает пользователю в диалоге.
- Появляется приватный REST API `vk-service`: `GET /vks`, `POST /vks`, `DELETE /vks/{user_id}`, `POST /vks/issue-confirmation`, `GET /vks/bot-info`.

### services/backend (проксирование)

- Новый прокси-роутер `/api/vks` с owner-only boundary поверх приватного `vk-service`: `GET /api/vks/me`, `POST /api/vks/issue-confirmation`, `DELETE /api/vks/{user_id}`, `GET /api/vks/bot-info`.
- Новый ENV `VK_SERVICE_URL`, клиент `clients/vk_service` со схемами и protocol.
- `callback/vk` добавляется в `NOTIFICATION_ELIGIBILITY` (`ADMIN`, `SUPERUSER`), поэтому каталог `/api/notification-settings` начинает возвращать вторую строку для события «Обратный звонок».

### services/frontend (CMS)

- В разделе `/notifications` → «Настройки» появляется карточка «VK для уведомлений»: состояние привязки (не привязан / ожидает подтверждения / привязан / бот заблокирован), контрольная строка с копированием, ссылка на группу и на диалог с ботом (все внешние ссылки — `target="_blank" rel="noopener noreferrer"`), кнопки «Обновить код» и «Отвязать».
- Карточка «События» начинает рендерить переключатели по каналам: у события «Обратный звонок» появляются независимые переключатели `email` и `vk`.

### Оркестрация

- В `.docker-compose/docker-compose.vk.yml` добавляется сервис `vk-bot` (long-poll runtime) и зависимость приложения от `vk-migration`; в корневом `Makefile` — цели управления ботом и логами.
- Расширяется набор переменных окружения `vk-service`: токен группы, id и screen name группы, команда привязки, TTL контрольной строки, параметры long-poll.

### Вне scope

- Публикация и потребление `commands.notification.vk.send` и фактическая отправка уведомлений о событиях в VK.
- Массовые рассылки, вложения, клавиатуры бота, callback-кнопки.
- Изменения `services/frontend` CMS вне раздела `/notifications` и любые изменения `services/site-ad`.
- Заполнение реальных секретов (`VK_GROUP_TOKEN` и др.) — по требованию задачи реализация останавливается перед заполнением ENV пользователем.

## Capabilities

### New Capabilities

- `vk-user-storage`: таблица `user_vks`, состояния привязки (`PENDING`, `ACTIVE`, `BLOCKED`), soft-delete, partial unique индексы на `user_id` и `vk_peer_id`, репозиторий и protocol.
- `vk-confirmation`: генерация человекочитаемой контрольной строки с TTL, инвалидация предыдущих кодов, сверка кода из сообщения бота, привязка `vk_peer_id` к `user_id`, журналирование попыток в `vk_logs`.
- `vk-bot-longpolling`: выбор библиотеки и её обоснование, отдельный long-poll runtime, обработка `message_new` / `message_allow` / `message_deny`, ответы пользователю, идемпотентность, устойчивость к обрывам и rate limit VK.
- `vk-api-endpoints`: приватный REST-контракт `vk-service` с access matrix и статусами.
- `vk-backend-proxy`: проксирование VK-эндпоинтов через основной backend с owner-only правилом, access matrix и ENV `VK_SERVICE_URL`.
- `vk-settings-ui`: карточка VK в CMS-разделе «Уведомления» — состояния, код, ссылки в новых вкладках, отвязка, тесты и manual QA.

### Modified Capabilities

- `vk-service-skeleton`: HTTP-поверхность больше не ограничена `GET /health`, миграционная цепочка больше не пуста, `settings.py` получает VK-конфигурацию, DI-контейнер и `main.py` получают VK-зависимости; требования скелета переводятся из «запрещено» в «расширено».
- `vk-service-orchestration`: добавляется контейнер long-poll бота, новые ENV и Make-цели, `db-vk` начинает содержать доменные таблицы.
- `notification-settings-api`: `callback/vk` становится eligible комбинацией, каталог возвращает две строки для события `callback`, добавляется строка access matrix для VK-канала.
- `notification-settings-ui`: карточка «События» рендерит переключатели по каналам, а не один переключатель на событие; добавляется VK-блок жизненного цикла привязки.

## Impact

**Код и файлы**

- `services/vk-service/`: `pyproject.toml`, `uv.lock`, `.env.example`, `README.md`, `src/settings.py`, `src/main.py`, `src/containers/application.py`, новые `src/models/`, `src/repositories/`, `src/core/services/`, `src/api/`, `src/clients/vk/`, `src/bot/`, `src/migration/versions/`, `tests/`.
- `services/backend/`: `src/api/vks.py`, `src/clients/vk_service/`, `src/core/services/vk_proxy.py`, `src/core/protocols/vk_service.py`, `src/core/policies/notification_settings.py`, `src/depends/services.py`, `src/settings.py`, `src/main.py`, `.env.example`, `tests/`.
- `services/frontend/`: `src/api/vk.ts`, `src/types/api/notifications.ts`, `src/features/notifications/**`, `.env.example`, тесты.
- Корень: `.docker-compose/docker-compose.vk.yml`, `Makefile`, `SERVICES.md`.

**API**

Изменяются/добавляются: `GET /api/vks/me`, `GET /api/vks/bot-info`, `POST /api/vks/issue-confirmation`, `DELETE /api/vks/{user_id}` (основной backend); `GET /vks`, `GET /vks/bot-info`, `POST /vks`, `POST /vks/issue-confirmation`, `DELETE /vks/{user_id}` (приватный `vk-service`); поведение каталога `GET /api/notification-settings` и `PATCH /api/notification-settings/{event_code}/{channel_code}` для `channel_code = vk`. Полные access matrix с колонками `method | path | access class | roles | tenant selector | owner rule | expected without auth | expected with auth | foreign resource | validation status | tests` содержатся в specs `vk-api-endpoints`, `vk-backend-proxy` и delta `notification-settings-api`.

**Зависимости**

`vkbottle` (+ `vkbottle-types`, `vbml`, `choicelib`, `aiofiles`, `colorama`) в `vk-service`; повышение `aiohttp` до `>=3.14.3`. Внешняя зависимость — VK API группы (Bots Long Poll), требующая группового токена с правами на сообщения.

**Инфраструктура**

Новый контейнер `eqsitecms-vk-bot` в сети `eqsitecms_network`; доменные таблицы в БД `eqsitecmsvk`; долгоживущие исходящие HTTPS-соединения к `api.vk.com`.

**Риски**

Групповой токен — секрет с широкими правами на переписку; блокировка бота пользователем должна не ломать доставку; long-poll runtime должен запускаться строго в одном экземпляре, иначе события дублируются.
