# Quality Gate — vk-user-confirmation-060

**Дата:** 2026-08-27
**Change:** `vk-user-confirmation-060`
**Итог:** PASSED — findings, требующих возврата владельцам, нет.

Все шесть deliverables (A–F) прошли один общий review по всему diff. Дефекты,
найденные в ходе реализации и UI QA, устранены внутри своих deliverables до gate;
они перечислены в разделе «Устранено до gate» и в
[`vk-user-confirmation-060-ui-qa.md`](vk-user-confirmation-060-ui-qa.md).

## Состав diff и ownership (7.1)

| Deliverable | Репозиторий | Файлы | Выход за назначенные пути |
|---|---|---|---|
| A. Домен и данные | `services/vk-service` | `models/**`, `repositories/**`, `core/**`, миграция, тесты | нет |
| B. HTTP API и настройки | `services/vk-service` | `api/**`, `settings.py`, `main.py`, `containers/`, `pyproject.toml`, `uv.lock`, `.env.example`, `README.md` | нет |
| C. Bot runtime | `services/vk-service` | `bot/**`, `clients/vk/**`, `tests/bot/**` | нет |
| D. Backend-прокси | `services/backend` | `api/vks.py`, `clients/vk_service/**`, `core/**`, `depends/`, `settings.py`, `.env.example`, тесты | **да, обосновано** (см. ниже) |
| E. CMS UI | `services/frontend` | `api/vk.ts`, `types/api/notifications.ts`, `features/notifications/**` | нет |
| F. Оркестрация | корень | `docker-compose.vk.yml`, `Makefile`, `SERVICES.md` | нет |

**Расширение scope deliverable D.** План не учёл генерируемый артефакт
`docs/backend-route-inventory.md` и его источник `maintain/route_inventory.py`:
backend-тест `test_route_access_inventory.py` требует, чтобы каждый
зарегистрированный маршрут имел ровно одну запись классификации, и жёстко
проверяет их число. Четыре новых маршрута `/api/vks/*` без этого ломают gate.
Файлы принадлежат той же зоне и тому же владельцу, поэтому классификации
добавлены, документ перегенерирован, счётчик обновлён `104 → 108`.

`services/email-service` и `services/notification-service` — **0 изменённых
файлов** (7.7), контракты email- и notification-контуров не тронуты.

## Архитектура (7.2)

- `vkbottle` импортируется только в `bot/main.py` и `clients/vk/client.py`;
  `core/**`, `repositories/**`, `models/**`, `api/**` от библиотеки не зависят.
  Проверено `grep` и автотестом `test_vk_library_isolation.py`.
- `vk_api`, `aiovk`, `vkwave` отсутствуют в исходниках и манифесте.
- CMS не содержит адресов приватных сервисов и импортов `site-*`; все VK-запросы
  идут на `/api/vks/*` через цепочку `page → feature UI → hook → service → src/api`.
- Long-poll не стартует в HTTP-приложении: `main.py` не содержит `vkbottle`
  и `run_polling`.

## Access matrix (7.3) — live-прогон

**Приватный `vk-service`** (изнутри `eqsitecms_network`, контейнер поднят):

| Запрос | Ожидание | Факт |
|---|---|---|
| `GET /vks?user_ids=<uuid>` | `200` | `200` |
| `GET /vks?user_ids=nope` | `400` | `400` |
| `GET /vks?...&state=WRONG` | `400` | `400` |
| `GET /vks/bot-info` (группа не настроена) | `503` | `503` |
| `POST /vks` первый / повторный | `201` / `200` | `201` / `200` |
| `POST /vks` невалидный UUID | `400` | `400` |
| `POST /vks/issue-confirmation` | `201` | `201` |
| `DELETE /vks/{uuid}` первый / повторный | `204` / `204` | `204` / `204` |
| `DELETE /vks/nope` | `400` | `400` |
| `GET /emails` (унаследованный) | `404` | `404` |

**Основной backend** (anonymous, с хоста, `http://localhost:8001`):

| Запрос | Ожидание | Факт |
|---|---|---|
| `GET /api/vks/bot-info` | `200`/`503` без авторизации (Public Read) | `503` |
| `GET /api/vks/me` | `401` до downstream | `401` |
| `POST /api/vks/issue-confirmation` | `401` до downstream | `401` |
| `DELETE /api/vks/{uuid}` | `401` до downstream | `401` |
| `DELETE /api/vks/not-a-uuid` | `401` (auth предшествует разбору UUID) | `401` |

Authenticated, foreign-resource и downstream-сценарии покрыты 28 unit-тестами
`test_vk_proxy_api.py` и 9 тестами `test_vk_proxy_service.py`: `403` для чужого
`user_id` возвращается **до** downstream-вызова и не зависит от scope
(`None`/`ADMIN`/`SUPERUSER`), `404` при отсутствии привязки, `409` для
`ACTIVE`/`BLOCKED`, `400` на malformed UUID, `502` на timeout/невалидное тело.

**Сетевая изоляция подтверждена:** порт `vk-service` на host не опубликован
(`docker port` пуст), запрос с хоста не проходит. Peer-service credential
отсутствует: `X-Service-Key` нет ни в клиенте, ни в запросах
(`test_vk_client_boundary.py`).

**Валидация — `400`, а не `422`.** Спецификация приведена в соответствие с
сервисным соглашением: обработчик `RequestValidationError` в `src/main.py`
установлен требованием скелета и не изменялся.

## Исключения из policy (7.4)

- VK-контур **не имеет публичных write-исключений**: маршрута `/vks/confirm` нет
  ни в приватном сервисе, ни в backend. Контрольную строку сверяет только
  long-poll runtime по сообщению из VK.
- Единственное исключение из Public Read — `GET /api/vks/me`
  (Protected Sensitive Read), симметрично утверждённому `GET /api/emails/me`.
- `GET /api/vks/bot-info` остаётся Public Read: только публичные атрибуты группы.
- Существующие email-исключения сохранены без изменений: `POST /api/emails/send-confirmation`
  (строка 119) и `PATCH /api/emails/confirm` (строка 104) на месте.

## Прогон проверок (7.5)

| Команда | Результат |
|---|---|
| `make check-vk` | mypy, basedpyright, ruff check, ruff format, flake8 — чисто; **201 passed**, 19 deselected |
| `make check-backend` | mypy, ruff, flake8 — чисто; **1300 passed**, 5 skipped |
| `make check-frontend` | **588 passed** (69 файлов), lint **0 errors** / 430 warnings (базовая линия репозитория была 438), typecheck и `next build` — успешно |
| `make compose-check` | OK, включая `docker-compose.vk.yml` |
| `make secret-scan` | passed |
| `uv sync --locked` (vk-service) | без изменений lock-файла |

## Миграции на реальной PostgreSQL (7.6)

БД `eqsitecmsvk` (`eqsitecms-db-vk`, host-порт 5436):

- `alembic upgrade head` → код `0`, схема: `alembic_version`, `user_vks`,
  `vk_confirmations`, `vk_logs` и ничего кроме них; email-таблиц нет.
- `alembic revision --autogenerate` → **0 операций** (модели совпадают со схемой);
  пробная ревизия удалена.
- `alembic downgrade -1` → три таблицы удалены, `alembic_version` сохранён;
  повторный `upgrade head` восстанавливает схему.
- Partial unique индексы созданы в ожидаемом виде:
  `uq_user_vks_user_id_active … WHERE deleted_at IS NULL` и
  `uq_user_vks_peer_id_active … WHERE deleted_at IS NULL AND vk_peer_id IS NOT NULL`.
- 16 infrastructure-тестов `test_vk_repositories.py` на реальной БД — passed.

## Live end-to-end привязки

Полный цикл против работающего сервиса и реальной PostgreSQL:

| Шаг | Результат |
|---|---|
| `POST /vks/issue-confirmation` | код длиной 8, состояние `PENDING` |
| подтверждение кодом в нижнем регистре с пробелами | `confirmed`, состояние `ACTIVE`, `vk_peer_id` и кэш имени записаны |
| повторная доставка того же кода с того же peer | `already_confirmed`, вторая привязка не создана |
| тот же код с другого peer | `ConflictError`, привязка не изменена |
| неизвестный код | `NotFoundError` |
| `DELETE /vks/{user_id}` | `204`, чтение возвращает `[]` |

Тестовые данные из БД удалены после прогона.

## Секреты (7.8)

- `VK_GROUP_TOKEN` отсутствует в tracked-файлах; в `.env.example` — placeholder
  `<set-vk-group-access-token>`.
- Полная контрольная строка не попадает в `vk_logs`: в журнале только
  маскированное значение вида `4E***(len=8)` — проверено выборкой из живой БД по
  всем статусам (`success`, `already_confirmed`, `used`, `not_found`).
- Токен не появляется в логах bot runtime при ошибке авторизации и в теле
  `GET /vks/bot-info` — покрыто тестами.
- Bot-контейнер без токена завершается с понятным сообщением, при этом
  `eqsitecms-vk-service` остаётся `healthy`, а `GET /health` отвечает `200`.

## UI QA (7.9)

Отчёт: [`vk-user-confirmation-060-ui-qa.md`](vk-user-confirmation-060-ui-qa.md).
27 кейсов (3 ширины × 9 состояний) в реальном браузере против production-сборки:
горизонтальное переполнение отсутствует, неожиданных console-ошибок нет,
скриншоты сохранены. Четыре дефекта вёрстки найдены и исправлены до gate.

**Оговорка:** прогон выполнен без live CMS-сессии (пароли dev-пользователей
неизвестны, заводить QA-аккаунт в scope не входило); backend подменялся на
сетевом уровне. Auth-guard покрыт unit-тестами и live smoke.

## Устранено до gate

| # | Дефект | Deliverable |
|---|---|---|
| 1 | `previous_state` в журнале читался после мутации строки — репозиторий мог вернуть тот же объект | A |
| 2 | Состояния VK-карточки возвращали фрагмент: antd `Space` не расставлял вертикальные отступы | E |
| 3 | Подписи каналов ломались посимвольно на mobile | E |
| 4 | Ошибка мутации дублировалась в карточке и в модальном окне | E |
| 5 | Заголовок состояния `PENDING` дублировал текст тега | E |
| 6 | Cognitive complexity `VkCard` 38 при лимите 12 — разбит на компоненты по состояниям | E |

## Корректировки спецификации по итогам реализации

1. **`vk-bot-longpolling` — устойчивость цикла.** Формулировка «экспоненциальный
   backoff» заменена на «возрастающий и ограниченный сверху», а требование
   дополнено явным указанием, что оно считается выполненным реализацией
   `vkbottle.polling.base.BasePolling.listen()`. Причина: библиотека уже
   обрабатывает `failed=1/2/3`, сетевые ошибки и ошибки обработчика, сохраняя
   `server`/`ts`; собственная реализация дублировала бы её с большим риском.
   Поведение цикла проверяется 9 тестами на stub-сервере.
2. **`vk-api-endpoints` — статус валидации.** `422` заменён на `400` с
   обоснованием: сервис-wide обработчик `RequestValidationError` задан
   требованием скелета и изменять его нельзя.

Обе правки внесены в delta specs change до gate; `openspec validate --strict`
проходит.

## Не входит в этот change

Доставка уведомлений о событиях в VK (публикация и потребление
`commands.notification.vk.send`) не реализована — по решению владельца
переключатель `callback/vk` включён заранее, рядом с ним в UI выводится
предупреждение. Gap зафиксирован в `proposal.md`, `SERVICES.md` и README сервиса.

## Живой прогон с реальной VK-группой (2026-08-27, после заполнения ENV)

Владелец заполнил `VK_GROUP_TOKEN`, `VK_GROUP_ID=240649595`,
`VK_GROUP_SCREEN_NAME=eqcms`. Сообщество: `Equestrian Site CMS`, токен со scopes
`['manage', 'messages']`, Long Poll `is_enabled=True`, версия `5.199`, включены
события `message_new`, `message_allow`, `message_deny`.

Полный цикл выполнен через **реального бота и живой аккаунт VK**
(`vk_peer_id=28964076`):

| Время | Действие | Результат |
|---|---|---|
| 12:02:54 | `POST /vks/issue-confirmation` | `201`, код длиной 8, `PENDING` |
| 12:03:45 | пользователь нажал «Начать» | `vk_message_allow` → `no_binding` (без ошибки), `vk_message` → `unknown_command`, бот ответил инструкцией |
| 12:03:58 | пользователь отправил `/link <код>` | `vk_confirmation` → **success**; бот ответил «Готово! Этот аккаунт VK привязан…»; запись `ACTIVE`, `vk_peer_id`, `vk_screen_name=iigorrr526`, `vk_display_name` сохранены |
| 12:04 | `POST /vks/issue-confirmation` при `ACTIVE` | `409` «Аккаунт VK уже привязан» |
| 12:05:11 | пользователь повторил ту же команду | `already_confirmed`, вторая привязка не создана |
| 12:05:37 | пользователь запретил сообщения сообщества | `vk_message_deny` → success, `ACTIVE → BLOCKED` |
| 12:05 | `POST /vks/issue-confirmation` при `BLOCKED` | `409` «Бот заблокирован: разрешите сообщения…» |
| 12:06:45 | пользователь разрешил сообщения обратно | `vk_message_allow` → success, `BLOCKED → ACTIVE` |
| 12:07 | `DELETE /vks/{user_id}` | `204`, чтение возвращает `[]`, `vk_unlink` → success |

Бот стабильно держал long-poll всё время прогона: перезапусков контейнера не
было, блокировка пользователем процесс не уронила. Контрольная строка в журнале
маскирована (`JJ***(len=8)`) во всех статусах. Тестовые записи из БД удалены.

## Дефекты, найденные на живом прогоне (после архивации change)

| # | Дефект | Как исправлен |
|---|---|---|
| 1 | При нехватке прав токена ошибка всплывала внутри long-poll цикла сырым `VKAPIError`, а `restart: always` превращала её в бесконечный поток трейсбеков без указания причины | Добавлен preflight-запрос `groups.getLongPollServer` перед стартом цикла: выход с кодом `1` и текстом, называющим требуемые scopes (`messages` + `manage`) и настройки Long Poll. Коды `15`/`100` (права) и `5`/`27`/`28` (токен) разведены; сетевой сбой старту не мешает. Требование расширено в main spec `vk-bot-longpolling`, 11 новых тестов |
| 2 | `make vk-bot-restart` выполняла `docker restart`, который не перечитывает `env_file`: после замены токена процесс поднимался со старым окружением | Цель пересоздаёт контейнер через `compose up -d --no-deps --force-recreate vk-bot` |
| 3 | README предписывал запускать бота из `src/`, но `.env` лежит в корне сервиса и читается относительно cwd — настройки молча брали дефолты (`VK_GROUP_ID=0`, пустой токен) | Инструкция исправлена на запуск из корня сервиса с пояснением; в контейнере проблемы не было |
| 4 | **`get_vk_binding_service` передавал `messenger=None`** — уведомление об отвязке в VK не отправлялось, хотя требование «Уведомление пользователя в VK при отвязке» spec `vk-api-endpoints` его предписывает | Подключён `VkbottleMessenger`; добавлены 4 теста, включая проверку самой проводки зависимости |

**Почему Quality Gate пропустил дефект №4.** API-тест `DELETE` проверял только код
`204` и факт soft-delete, а тест доменного сервиса передавал messenger напрямую,
минуя реальную проводку зависимости. Ни один тест не проверял, что именно
подставляет `get_vk_binding_service`. Добавлен тест
`test_the_wired_dependency_supplies_a_real_messenger`, фиксирующий проводку.

После исправлений: `make check-vk` — **216 passed**, lint чистый, `compose-check`
и `secret-scan` — OK.

## Остаётся владельцу

Пройти привязку из интерфейса CMS под реальной учётной записью `ADMIN`/`SUPERUSER`
(таблицы VK-домена очищены, `vk_peer_id` свободен) и подтвердить, что бот
прислал сообщение об отмене привязки при отвязке из CMS.
