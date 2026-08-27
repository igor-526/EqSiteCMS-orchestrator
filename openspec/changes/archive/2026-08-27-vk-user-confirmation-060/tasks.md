# Tasks — vk-user-confirmation-060

Deliverables A–F соответствуют таблице ownership в `design.md`. Каждый исполнитель читает `proposal.md`, `design.md` и указанные specs, меняет **только** назначенные пути, отмечает checkbox сразу после фактического выполнения и возвращает Router завершённый deliverable с evidence. Порядок: A → B → C последовательно (одна зона `vk-service`), затем F; D и E выполняются после фиксации контракта в задаче 2.1 и файлово не пересекаются с A/B/C.

`contextFiles` для всех deliverables: `AGENTS.md`, `openspec/changes/vk-user-confirmation-060/proposal.md`, `openspec/changes/vk-user-confirmation-060/design.md`, соответствующие `openspec/changes/vk-user-confirmation-060/specs/*/spec.md`.

## 1. Deliverable A — домен и данные vk-service (владелец: Backend)

**Specs:** `vk-user-storage`, `vk-confirmation`. **Пути:** `services/vk-service/src/{models,repositories,core}/**`, `services/vk-service/src/migration/versions/**`, `services/vk-service/tests/{models,repositories,services}/**`.

- [x] 1.1 Прочитать `services/email-service/src/{models,repositories,core/services}` как референс и `services/vk-service/src/utils/basemodel.py`; зафиксировать в отчёте, какие приёмы переиспользуются
- [x] 1.2 Создать модели `src/models/user_vk.py`, `src/models/vk_confirmation.py`, `src/models/vk_log.py` с полями, индексами и partial unique indexes по spec `vk-user-storage`; зарегистрировать их в `src/models/__init__.py`
- [x] 1.3 Создать миграцию `src/migration/versions/20260827_0002_add_vk_domain.py` с `down_revision = "20260710_0001"`, upgrade и downgrade для трёх таблиц и всех индексов
- [x] 1.4 Проверить миграцию на реальной PostgreSQL: `alembic upgrade head` → в схеме только `alembic_version`, `user_vks`, `vk_confirmations`, `vk_logs`; `alembic revision --autogenerate` не предлагает изменений; `alembic downgrade -1` удаляет таблицы. Приложить вывод команд
- [x] 1.5 Добавить протоколы `UserVkRepositoryProtocol`, `VkConfirmationRepositoryProtocol`, `VkLogRepositoryProtocol` в `src/repositories/protocols.py`
- [x] 1.6 Реализовать `src/repositories/user_vk.py` (`create`, `get_by_user_id`, `get_by_user_ids`, `get_by_peer_id`, `activate`, `set_state`, `soft_delete`) с обработкой конфликта unique в `AlreadyExistsError`
- [x] 1.7 Реализовать `src/repositories/vk_confirmation.py` (`create`, `get_by_code`, `invalidate_previous`, `mark_used`) и `src/repositories/vk_log.py` (`log_action`, подсчёт неуспешных попыток по `vk_peer_id` в окне)
- [x] 1.8 Добавить генератор кода в домен: алфавит `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, `secrets.choice`, длина из настроек, повтор при коллизии не более 5 раз
- [x] 1.9 Реализовать `src/core/services/vk_binding.py`: выдача кода (идемпотентность по владельцу, инвалидация предыдущих, `409` для `ACTIVE`/`BLOCKED`), отвязка (soft-delete + инвалидация + журнал, идемпотентность)
- [x] 1.10 Реализовать `src/core/services/vk_confirmation.py`: нормализация кода, проверки `used_at`/`expires_at`/конфликта `vk_peer_id`, активация привязки, идемпотентность повторной доставки, rate limit по `vk_peer_id`, журналирование всех исходов с маскированием кода
- [x] 1.11 Реализовать `src/core/services/vk_state.py` (или эквивалент): переводы `ACTIVE ↔ BLOCKED` по событиям разрешения/запрета сообщений, обработка отсутствия привязки без исключения
- [x] 1.12 Определить протоколы `src/core/protocols/vk/` (отправка сообщения, получение профиля) — домен MUST NOT импортировать `vkbottle`
- [x] 1.13 Добавить доменные исключения VK в `src/core/exceptions/` при необходимости (rate limit, незавершённая VK-конфигурация)
- [x] 1.14 Написать unit-тесты репозиториев и доменных сервисов: все scenarios specs `vk-user-storage` и `vk-confirmation`, включая конфликты unique, истёкший/использованный/чужой код, rate limit, идемпотентность, отсутствие полного кода в журнале
- [x] 1.15 Прогнать `make check-vk`; приложить вывод

## 2. Deliverable B — HTTP API и настройки vk-service (владелец: Backend)

**Specs:** `vk-api-endpoints`, delta `vk-service-skeleton`. **Пути:** `services/vk-service/src/{api,settings.py,main.py,containers,depends}`, `services/vk-service/pyproject.toml`, `uv.lock`, `.env.example`, `README.md`, `services/vk-service/tests/api/**`.

- [x] 2.1 Зафиксировать и передать Router контракт API (пути, тела запросов/ответов, статусы) для deliverables D и E до начала их работы
- [x] 2.2 Добавить в `pyproject.toml` зависимости `vkbottle>=4.11,<5`, поднять `aiohttp>=3.14.3` и `pydantic>=2.13.4`, обновить `known-first-party` (`api`, `bot`), пересобрать `uv.lock`; подтвердить `uv sync --locked`
- [x] 2.3 Добавить класс `VkSettings` в `src/settings.py` со всеми `VK_*` полями и значениями по умолчанию из delta `vk-service-skeleton`; добавить `VK_GROUP_TOKEN` в список обязательных production-секретов
- [x] 2.4 Обновить `.env.example`: все `VK_*` переменные с placeholder-значениями, `VK_GROUP_TOKEN` в виде `<set-...>`; реальных секретов нет
- [x] 2.5 Создать `src/api/schemas/vk.py` (request/response схемы всех endpoint'ов) и `src/api/dependencies.py` (сборка доменных сервисов из сессии)
- [x] 2.6 Создать `src/api/endpoints/vks.py` с префиксом `/vks`: `GET /vks`, `GET /vks/bot-info`, `POST /vks`, `POST /vks/issue-confirmation`, `DELETE /vks/{user_id}` по spec `vk-api-endpoints`
- [x] 2.7 Реализовать отображение доменных исключений в HTTP-статусы (`404`, `409`, `410`, `400`, `429`, `503`) без раскрытия кода и токена в телах ошибок
- [x] 2.8 Подключить VK-роутер в `src/main.py`, сохранив `GET /health`, отсутствие CORS и auth-маршрутов, no-op NATS setup и production-only metrics listener; long-poll в lifespan MUST NOT запускаться
- [x] 2.9 Добавить в `src/containers/application.py` провайдеры `vk_settings` и VK API-клиента; email-провайдеров не добавлять; контейнер не хранить в `app.state`
- [x] 2.10 Написать API-тесты `tests/api/**`: успешный путь и все определённые ошибочные статусы каждого endpoint'а, идемпотентность `POST /vks` и `DELETE`, `422` на невалидные UUID и `state`, `503` при незаполненной VK-конфигурации, отсутствие `VK_GROUP_TOKEN` в ответе `bot-info`
- [x] 2.11 Обновить существующие baseline-тесты сервиса так, чтобы они подтверждали наличие `/vks*` и сохранение `404` для `/emails*`, без обфускации токенов
- [x] 2.12 Обновить `services/vk-service/README.md` по delta `vk-service-skeleton`: структура `src/`, запуск приложения и бота, таблица `VK_*` переменных с пометкой заполняемых владельцем группы, таблица API с `/vks*`, раздел «Привязка пользователя VK», обновлённый раздел «Границы сервиса»
- [x] 2.13 Прогнать `make check-vk`; приложить вывод

## 3. Deliverable C — bot runtime и VK-клиент (владелец: Backend)

**Spec:** `vk-bot-longpolling`. **Пути:** `services/vk-service/src/{bot,clients/vk}/**`, `services/vk-service/tests/bot/**`.

- [x] 3.1 Реализовать `src/clients/vk/client.py` — адаптер `vkbottle` под протоколы `core/protocols/vk/`: отправка сообщения, получение профиля пользователя; импорты `vkbottle` только здесь и в `bot/`
- [x] 3.2 Реализовать `src/bot/main.py` — самостоятельную точку входа long-poll runtime с fail-fast при пустом или placeholder `VK_GROUP_TOKEN` и корректным завершением по `SIGTERM`
- [x] 3.3 Реализовать обработчик `message_new`: парсинг `<VK_BOT_LINK_COMMAND> <code>` без учёта регистра и лишних пробелов, вызов доменного подтверждения, ответы пользователю для успеха, неизвестной команды, команды без кода, недействительного/использованного/истёкшего кода, конфликта `vk_peer_id`, rate limit; игнорирование сообщений из беседы
- [x] 3.4 Реализовать обработчики `message_deny` и `message_allow` с переводом состояния и журналированием, включая случай отсутствия привязки
- [x] 3.5 Реализовать устойчивость цикла: `failed=1` → продолжение с новым `ts`, `failed=2/3` → переполучение long-poll сервера, сетевые ошибки → экспоненциальный backoff с верхней границей, ошибка обработчика не останавливает цикл
- [x] 3.6 Подключить Sentry-конфигуратор и структурное логирование; убедиться, что `VK_GROUP_TOKEN` не попадает в логи, `vk_logs` и сообщения об ошибках
- [x] 3.7 Написать stub VK API и long-poll сервера в `tests/bot/` и покрыть все scenarios spec `vk-bot-longpolling`; тесты не требуют интернета и токена
- [x] 3.8 Добавить architecture-тест, подтверждающий отсутствие импортов `vkbottle` вне `clients/vk/**` и `bot/**`
- [x] 3.9 Прогнать `make check-vk`; приложить вывод

## 4. Deliverable D — backend-прокси и eligibility (владелец: Backend)

**Specs:** `vk-backend-proxy`, delta `notification-settings-api`. **Пути:** `services/backend/src/{api/vks.py,clients/vk_service,core/services/vk_proxy.py,core/protocols/vk_service.py,core/policies/notification_settings.py,depends/services.py,settings.py,main.py}`, `services/backend/.env.example`, `services/backend/README.md`, `services/backend/tests/**`.

- [x] 4.1 Прочитать `services/backend/src/api/emails.py`, `src/core/services/email_proxy.py`, `src/clients/email_service/**` как референс owner-only прокси
- [x] 4.2 Добавить `VK_SERVICE_URL` в `src/settings.py`, `.env.example` и таблицу переменных `README.md` со значением `http://eqsitecms-vk-service:8000`
- [x] 4.3 Создать `src/clients/vk_service/schemas.py` (`VkBindingResponse`, `VkBotInfoResponse`, `VkIssueConfirmationResponse`) и `src/core/protocols/vk_service.py`
- [x] 4.4 Создать `src/clients/vk_service/client.py` без `X-Service-Key` и любых peer-credential; отказ на неоднозначный ответ downstream
- [x] 4.5 Реализовать `src/core/services/vk_proxy.py` с `_require_owner` (`403` до downstream и lookup, без role override), `get_mine`, `get_bot_info`, `issue_confirmation` (владелец из session), `delete`
- [x] 4.6 Создать `src/api/vks.py`: `GET /api/vks/me`, `GET /api/vks/bot-info` (Public Read), `POST /api/vks/issue-confirmation`, `DELETE /api/vks/{user_id}`; malformed UUID/body → `400`, downstream недоступен → `502`, downstream `503` → `503`; подключить роутер в `main.py` и зарегистрировать зависимость в `depends/services.py`
- [x] 4.7 Добавить `("callback", "vk"): frozenset({"ADMIN", "SUPERUSER"})` в `NOTIFICATION_ELIGIBILITY`; `KNOWN_NOTIFICATION_CHANNELS` и notification-service не менять
- [x] 4.8 Написать `tests/unit/api/test_vk_proxy_api.py` — покрытие каждой строки access matrix spec `vk-backend-proxy`: anonymous `401`, owner success, foreign `403` без downstream, missing `404`, идемпотентность `204`, `409` для `ACTIVE`/`BLOCKED`, malformed `400`, downstream timeout/невалидное тело → `502`, `503`, попытка передать foreign `user_id` в теле
- [x] 4.9 Написать `tests/unit/api/test_vk_client_boundary.py` — формируемые URL, отсутствие `X-Service-Key`, отказ на неоднозначный ответ
- [x] 4.10 Расширить тесты каталога настроек: eligible видит `callback/email` и `callback/vk`, ineligible — пустой список, независимость каналов, `403` для ineligible write канала `vk`, `404` для `callback/sms`
- [x] 4.11 Довести unit-покрытие настроек уведомлений до требуемых delta `notification-settings-api` объёмов с трассировкой к access matrix
- [x] 4.12 Прогнать `make check-be`; приложить вывод

## 5. Deliverable E — CMS UI (владелец: Frontend)

**Specs:** `vk-settings-ui`, delta `notification-settings-ui`. **Пути:** `services/frontend/src/api/vk.ts`, `services/frontend/src/types/api/notifications.ts`, `services/frontend/src/features/notifications/**`, `services/frontend/.env.example`.

- [x] 5.1 Прочитать существующие `EmailCard.tsx`, `EmailModals.tsx`, `NotificationSettingsCard.tsx`, `useNotifications.ts`, `notificationService.ts` и контракт API из задачи 2.1
- [x] 5.2 Добавить типы `VkBindingOutDto`, `VkBotInfoOutDto`, `VkIssueConfirmationOutDto` в `src/types/api/notifications.ts`
- [x] 5.3 Создать `src/api/vk.ts` с `getMyVkBinding`, `getVkBotInfo`, `issueVkConfirmation`, `deleteVkBinding` через `apiFetch`
- [x] 5.4 Расширить `src/features/notifications/services/notificationService.ts` функциями VK; прямых `fetch` в компонентах не добавлять
- [x] 5.5 Расширить `useNotifications.ts`: загрузка привязки и `bot-info`, состояния загрузки/ошибки, выдача и обновление кода, отвязка, pending-флаги и защита от двойной отправки, перезапрос состояния после мутаций
- [x] 5.6 Создать `src/features/notifications/ui/VkCard.tsx` со всеми пятью состояниями (загрузка, не привязан, ожидает подтверждения, привязан, бот заблокирован) и отдельным alert при ошибке загрузки
- [x] 5.7 Реализовать блок кода: моноширинное отображение, кнопка копирования полной строки `<link_command> <code>`, срок действия, пометка истёкшего кода, graceful-обработка недоступного Clipboard API
- [x] 5.8 Реализовать ссылки на группу и диалог из `bot-info` с `target="_blank"` и `rel="noopener noreferrer"`; при `503`/ошибке `bot-info` показать сообщение о незавершённой настройке и скрыть ссылки, не блокируя остальные карточки
- [x] 5.9 Создать модальное окно подтверждения отвязки с предупреждением о необходимости новой привязки; сохранять открытое модальное окно при ошибке
- [x] 5.10 Встроить `VkCard` в `NotificationsPage.tsx` между email-карточкой и карточкой событий
- [x] 5.11 Переработать `NotificationSettingsCard.tsx`: группировка строк каталога по `event_code`, переключатель на каждый `channel_code`, уникальные accessible labels `<событие>: <канал>`, `pendingKey` = `event_code/channel_code`, отсутствие оптимистичного обновления, предупреждение у канала `vk` при отсутствующей или `BLOCKED` привязке
- [x] 5.12 Написать unit/component тесты (mocks/MSW): все состояния карточки VK, ошибка загрузки, выдача и обновление кода, копирование, атрибуты ссылок, недоступный `bot-info`, модальное окно отвязки (успех и ошибка), `401`/`403`/`409`/`502`, двойное нажатие, две колонки каналов и их изоляция при ошибке
- [x] 5.13 Выполнить manual QA в реальном браузере на desktop/tablet/mobile по требованиям `vk-settings-ui` и delta `notification-settings-ui`; сохранить passed/failed отчёт со скриншотами и network status/body для failed-кейсов
- [x] 5.14 Прогнать `make check-fe`; приложить вывод

## 6. Deliverable F — оркестрация и документация (владелец: Backend)

**Spec:** delta `vk-service-orchestration`. **Пути:** `.docker-compose/docker-compose.vk.yml`, `Makefile`, `SERVICES.md`, `agents/redis-databases.yaml`, `agents/howto/celery-protocols.md`.

- [x] 6.1 Добавить сервис `vk-bot` в `.docker-compose/docker-compose.vk.yml`: `container_name: eqsitecms-vk-bot`, `image: eqsitecms-vk-bot:latest`, `restart: always`, единственный экземпляр с комментарием-обоснованием, без `ports` и `expose`, без HTTP-healthcheck
- [x] 6.2 Добавить `vk-bot` в `VK_SERVICES` и в цели сборки корневого `Makefile`; добавить цели `vk-bot-logs` и `vk-bot-restart` с регистрацией в `.PHONY`
- [x] 6.3 Убедиться, что core release scope не расширен: цели `build`, `check`, `fix`, `test`, `migrate-core`, `recreate-core`, `health-core`, `status-core`, `logs-core`, `asyncapi-validate` и `DC_CORE` не изменены
- [x] 6.4 Проверить `make compose-check`, `make vk-build`, `make vk`, `make email`; подтвердить, что `eqsitecms-vk-service` становится `healthy` при незаполненном `VK_GROUP_TOKEN`, а `eqsitecms-vk-bot` завершается с понятной ошибкой
- [x] 6.5 Проверить `make vk-bot-logs` и `make vk-bot-restart`: перезапуск затрагивает только контейнер бота
- [x] 6.6 Обновить `SERVICES.md`: роль сервиса, ресурсы (таблицы `user_vks`/`vk_confirmations`/`vk_logs`, контейнер бота, Redis DB 3/4, очередь `vk`, порты), перечень `VK_*` переменных с пометкой заполняемых владельцем группы, границы (доставка уведомлений в VK не реализована)
- [x] 6.7 Обновить `agents/redis-databases.yaml` и `agents/howto/celery-protocols.md`, если сведения о `vk-service` требуют актуализации; изменения не пересекаются с зоной `services/vk-service/**`
- [x] 6.8 Прогнать `make secret-scan`; подтвердить отсутствие `VK_GROUP_TOKEN` и других секретов в tracked-файлах

## 7. Единый Quality Gate (владелец: Quality Gate)

- [x] 7.1 Собрать полный diff change и проверить соответствие ownership: ни один исполнитель не выходил за назначенные пути
- [x] 7.2 Проверить архитектуру: Clean Architecture в `vk-service`, отсутствие `vkbottle` вне `clients/vk/**` и `bot/**`, цепочка `page → feature UI → hook → service → src/api` в CMS, отсутствие обращений CMS к приватным сервисам и импортов `site-*`
- [x] 7.3 Проверить каждую строку access matrix specs `vk-api-endpoints`, `vk-backend-proxy` и delta `notification-settings-api` **отдельно для anonymous и authenticated**, включая foreign-resource отказы до downstream и отсутствие role override
- [x] 7.4 Подтвердить отсутствие публичных write-исключений в VK-контуре и сохранность существующих email-исключений (`POST /api/emails/send-confirmation`, `PATCH /api/emails/confirm`)
- [x] 7.5 Прогнать `make check-vk`, `make check-be`, `make check-fe`, `make compose-check`, `make secret-scan`; приложить выводы
- [x] 7.6 Проверить миграции на реальной PostgreSQL: `upgrade head`, `revision --autogenerate` без изменений, `downgrade -1`
- [x] 7.7 Проверить, что контракты email- и notification-service не изменены: diff `services/email-service` и `services/notification-service` пуст либо ограничен согласованными изменениями
- [x] 7.8 Проверить, что `VK_GROUP_TOKEN` и контрольные строки не появляются в логах, `vk_logs`, телах ответов, tracked-файлах и отчётах
- [x] 7.9 Проверить UI QA-отчёт deliverable E на полноту (desktop/tablet/mobile, все состояния, ошибки, скриншоты failed-кейсов)
- [x] 7.10 Сохранить evidence Quality Gate в `docs/reports/`

## 8. Findings, sync и archive (владелец: Router)

- [x] 8.1 Вернуть findings Quality Gate владельцам соответствующих зон
- [x] 8.2 Дождаться исправлений и повторить **общий** Quality Gate целиком
- [x] 8.3 Зафиксировать в отчёте перечень переменных окружения, которые заполняет пользователь (`VK_GROUP_TOKEN`, `VK_GROUP_ID`, `VK_GROUP_SCREEN_NAME`), и остановиться перед live-прогоном против реальной VK-группы
- [x] 8.4 Синхронизировать delta specs в `openspec/specs/` через `openspec-sync-specs`
- [x] 8.5 Повторно выполнить `openspec validate vk-user-confirmation-060 --strict` и `openspec status --change vk-user-confirmation-060`
- [x] 8.6 Архивировать change через `openspec-archive-change`
