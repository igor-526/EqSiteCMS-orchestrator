# Quality Gate — fix-vk-notification-msg-id-collision

Дата: 2026-08-28
Change: `openspec/changes/fix-vk-notification-msg-id-collision`
Вердикт: **APPROVED с условием** — код и контракты приняты, `QG-LIVE` закрыт частично (см. ниже),
деплой и post-deploy verification не выполнялись.

Оговорка по процессу: lane-проверки выполнены в одной сессии без делегирования профильным
агентам — операторская инструкция сессии запрещает запуск субагентов. Содержание проверок
соответствует lane-модели `AGENTS.md`, форма исполнения — команды вместо отдельных агентных
сессий.

## QG-BE — PASS

| Команда | Результат |
|---|---|
| `make check-notification` | mypy, basedpyright, ruff, flake8 — чисто; 129 passed, 2 deselected |
| `make check-vk` | mypy, basedpyright, ruff, flake8 — чисто; 285 passed, 21 deselected |
| `make check-email` | mypy, basedpyright, ruff, flake8 — чисто; 87 passed, 4 deselected |

Новое покрытие:

- `notification-service/tests/unit/messaging/test_command_identity.py` — фиксированный вектор
  msg-id, различие каналов одной корреляции, стабильность между обработками, `duplicate=True`
  как идемпотентный успех с `warning`.
- `notification-service/tests/unit/repositories/test_channel_repository.py` — `ORDER BY code`.
- `notification-service/tests/unit/test_migration_logging.py` — `configure_logger=False`
  передаётся в alembic, guard присутствует в `env.py` до вызова `fileConfig`.
- `vk-service/tests/clients/nats/test_notification_commands_send_vk_handler.py` — принимается
  канальный msg-id; отклоняются «сырой» `callback_request_id`, msg-id чужого канала и
  отсутствующий заголовок; идемпотентность опирается на `(event_uuid, user_id)`.

Регресса по существующим требованиям `notification-orchestrator` и `vk-notification-delivery`
нет: затронутые тесты (`test_ut07_ut08`, adapter contract, orchestrator, wiring) обновлены под
новый контракт публикации, остальные прошли без изменений.

## QG-CONTRACTS — PASS

| Проверка | Результат |
|---|---|
| `make asyncapi-validate` | 0 errors (6 warnings — предсуществующие) |
| `make asyncapi-validate-vk` | 0 errors (6 warnings — предсуществующие) |
| `make contracts-check` | 11 passed + 1 passed |

Идентичность producer/consumer подтверждена прямым сравнением вычислений в двух кодовых базах:

```text
NAMESPACE  c9393127-2bab-5de1-8176-5a66012af5d7   (обе кодовые базы)
callback   e317a8b9-5513-437b-ae2a-abb0a8883ca8
  → email  0a08d7c9-ac68-5c4f-8e7a-7c30d3c8c1d4
  → vk     aacfe433-467a-5b34-812d-165f7773589d   (обе кодовые базы)
```

Тот же вектор зафиксирован тестами в обоих репозиториях, поэтому дрейф формулы падает как
unit-регресс, а не как молчаливая потеря сообщений.

Ownership: diff не выходит за границы, объявленные в `design.md` D5 —
`services/notification-service/**`, `services/vk-service/**`,
`services/email-service/src/migration/env.py`, `agents/howto/nats-jetstream-protocols.md`.
Пересечений между зонами нет.

Топология JetStream не изменена: stream, subjects, durables и `duplicate_window` те же.
HTTP endpoints не добавлялись и не изменялись, access matrix не затронута.

## QG-LIVE — PARTIAL

Выполнено на реальном JetStream (локальный broker `127.0.0.1:4222`, изолированный run-scoped
stream `EQCMS_MSGID_CHECK_<run>`, memory storage, `duplicate_window=120s`, удалён после прогона):

```text
1. email accepted: duplicate=False msg_id=721fb9a7-1d5d-5b91-89d6-7f70de12b992
2. vk    accepted: duplicate=False msg_id=36d9bb62-06fa-56c9-a41c-2da94c571d9c
3. stream messages = 2
4. оба канала присутствуют в stream с разными Nats-Msg-Id
5. повторная vk-публикация: duplicate=True, messages=2 (лишнего сообщения нет)
```

Это воспроизводит исходный сценарий отказа и доказывает, что он закрыт: до правки вторая
команда одного callback отбрасывалась брокером, теперь принимаются обе, а штатная redelivery
остаётся идемпотентной и логируется как `warning`.

Не выполнено и остаётся к прогону перед архивированием:

- `delivered=1` у обоих production durable — требует деплоя пересобранных образов;
- SMOKE через `.claude/skills/api-smoke-test` — локальные контейнеры собраны из образов до
  правки, прогон против них не проверял бы изменение;
- `vk-service` smoke harness (`EQSITECMS_SMOKE_HARNESS=1`) на реальных JetStream + PostgreSQL —
  консьюмерская нога проверена только unit-тестами.

## QG-FE — неприменимо

Изменений в `services/frontend` и `services/site-*` нет; UI-поверхность и клиентские контракты
не затрагиваются.

## QG-SYNTH

Findings, требующих возврата владельцам, нет. Открытый пункт один — незакрытая часть
`QG-LIVE`, которая по своей природе выполняется после деплоя и зафиксирована как задача 6.4
в `tasks.md`. Sync delta specs и archive (задачи 6.1–6.3) сознательно не выполнены: до
подтверждения на production spec-состояние менять преждевременно.
