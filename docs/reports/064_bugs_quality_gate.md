# Quality Gate — 064_bugs / fix-nats-lifecycle-and-ci-064

Дата: 2026-08-28
Change: `openspec/changes/fix-nats-lifecycle-and-ci-064/`
Вердикт: **APPROVED**

## Что исправлено

Шесть GlitchTip-событий и два падения CI сведены к четырём дефектам.

| Источник | Дефект | Исправление |
|---|---|---|
| `064_main_backend_1` | `close()` пробрасывает `ConnectionReconnectingError` из `drain()` | Точечный перехват `(TimeoutError, nats.errors.Error)` + fallback на `close()` во всех 4 сервисах |
| `064_main_backend_2/3`, `064_email_service_1/2` | Транзиентный reconnect → error-события (4 события от одного перезапуска NATS) | `NatsConnectionErrorPolicy`: warning до порога, одна error за инцидент после, сброс на reconnect; `ignore_logger("nats.aio.client")` |
| `064_notification_service` | `404 stream not found` при `add_consumer` на чужом stream | Bounded retry по `NotFoundError` в notification-service и vk-service |
| CI notification-service, CI vk-service | `FileNotFoundError` на AsyncAPI соседнего репозитория | `tests/support/cross_repo.py`: skip вне монорепы, падение при `EQCMS_MONOREPO=1`; цель `make contracts-check` |
| Найдено при разборе | `livenessProbe` бьёт в `/api/v1/health` при `failureThreshold: 1` | Путь исправлен на `/health` в notification-, email-, vk-service |

Ownership NATS-топологии, AsyncAPI-документы, HTTP-контракты и матрица доступа не изменялись.

## Lanes

### QG-BE — PASS

| Сервис | test | lint |
|---|---|---|
| backend | 1308 passed, 5 skipped | mypy / ruff / format / flake8 — 0 |
| notification-service | 118 passed, 2 deselected | + basedpyright — 0 |
| email-service | 87 passed, 4 deselected | + basedpyright — 0 |
| vk-service | 279 passed, 21 deselected | + basedpyright — 0 |

Корневые `make test` и `make lint` — 0.

Сверка на расхождение между репозиториями выявила и устранила два отличия в backend: `asyncio.TimeoutError` вместо builtin `TimeoutError` и оставшийся неиспользуемый импорт `asyncio`. После правки все четыре сервиса имеют идентичную политику (`close_guard=1`, `cb=4`, `ignore_logger`); `lifecycle.py` отличается только шириной строки из-за разного `line-length` в ruff.

`vk-service/tests/unit/test_skeleton_boundaries.py` отклонил первую редакцию docstring, упоминавшую донорский домен, — формулировка переписана без него. Guard отработал по назначению.

### QG-CONTRACTS — PASS

- `docs/asyncapi.yaml` не изменён ни в одном из четырёх сервисов.
- Ownership stream'ов сохранён: backend создаёт только `SITE_EVENTS`; notification- и email-service — `NOTIFICATION_COMMANDS`; vk-service не создаёт ничего (`setup_streams()` остаётся no-op). Ретрай не подменяет отсутствующий stream созданием.
- `src/api` не изменялся ни в одном сервисе; новых и изменённых endpoint'ов нет, access matrix не требуется.
- Diff соответствует утверждённым specs и tasks.

### QG-FE — неприменимо

Нет diff в `services/frontend` и `services/site-*`.

### QG-LIVE — PASS

Инфраструктура пользователя (14 контейнеров `eqsitecms-*`, uptime 10 часов) не затрагивалась: проверки выполнены на одноразовом брокере `nats:2.10-alpine` с JetStream на порту 14222, удалённом после прогона. `make infra` не запускался — он конфликтует по имени существующего контейнера `eqsitecms-minio`.

1. **Гонка деплоя (`064_notification_service`).** Клиент запущен раньше владельца `SITE_EVENTS`. Три ретрая с backoff, затем владелец создаёт stream — `setup_consumers()` успешен через 6.0 с, durable `notification-service-callback-requested` зарегистрирован на `SITE_EVENTS`. До исправления этот путь давал crash-loop.
2. **Остановка во время reconnect (`064_main_backend_1/2/3`).** Брокер остановлен под работающим клиентом, затем вызван `close()`. В одном прогоне воспроизведены все три продовых сигнала — `nats: unexpected EOF`, `[Errno 111] Connect call failed`, `nats: connection reconnecting` — и все три пришли на уровне WARNING. Исключение не проброшено, `_connection` и `_jetstream` обнулены.
3. **Порог эскалации.** 12 последовательных сбоев → 11 warning и ровно 1 error с приложенным `exc_info`. После `reconnected` новый короткий инцидент из 3 сбоев не дал ни одной error.

SMOKE через `.claude/skills/api-smoke-test` не выполнялся: runtime API не изменялся (`src/api` без diff), затронуты только shutdown, телеметрия и startup-последовательность.

### Guard кросс-репозиторных проверок — PASS

Проверены все четыре состояния:

| Сосед | `EQCMS_MONOREPO` | Результат |
|---|---|---|
| на месте | не задан | passed |
| на месте | `1` | passed |
| отсутствует | не задан | `skipped` с указанием недостающего пути |
| отсутствует | `1` | `AssertionError`, `make contracts-check` завершается кодом 1 |

Четвёртая строка — существенная: без неё зелёный CI покупался бы ценой навсегда пропущенной проверки контракта.

## Замечания вне scope

- `readinessProbe` не настроен ни в одном сервисе (по решению пользователя не добавляется).
- Корневой `make test` при перенаправлении вывода в `/dev/null` возвращает 2; с записью в файл — 0 без ошибок. Артефакт вывода frontend-раннера, воспроизводится и на нетронутом дереве.
