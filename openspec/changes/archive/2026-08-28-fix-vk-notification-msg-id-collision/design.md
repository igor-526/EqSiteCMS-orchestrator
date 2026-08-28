## Context

Текущее production-поведение (кластер `eqcms`, namespace `cms`, 2026-08-28) подтверждено прямыми наблюдениями:

- `NOTIFICATION_COMMANDS`: `msgs=4`, все четыре сообщения в `commands.notification.email.send`, `Nats-Msg-Id` каждого равен `callback_request_id` события.
- durable `notification-service-commands-send-email`: `delivered=4, pending=0`; durable `vk-service-commands-send-vk`: `delivered=0, pending=0, redelivered=0`.
- durable `notification-service-callback-requested`: `delivered=4, ack_floor=4, redelivered=0` — событие обработано без исключений и ретраев.
- `duplicate_window = 120.0 s`, `retention = limits`, `max_age = 0`.
- В `user_notification_settings` VK-канал (`22222222-…`) включён 19:32:44; backend-лог показывает один `GET /api/service/users/` на callback до включения и два после — то есть VK-ветка оркестратора реально выполняется и находит получателей.
- В задеплоенном образе `notification-service` оба publisher формируют `event_id = idempotency_key or …`, а `idempotency_key` оркестратор передаёт одинаковый — `callback_request_id`; `_publish_event` кладёт его в `Nats-Msg-Id`.
- `notification-service` не пишет прикладных логов: `src/migration/env.py:15` вызывает `fileConfig(config.config_file_name)` без учёта `alembic_config.attributes["configure_logger"] = False`, который выставляет `src/utils/seeding/init_registry.py`. `logging.config.fileConfig` по умолчанию использует `disable_existing_loggers=True` и глушит все логгеры, созданные до in-process миграции. В `services/backend/src/migration/env.py:21` guard уже реализован корректно; `email-service` и `vk-service` миграции in-process не применяют и симптомом не затронуты.

Ограничения: топология JetStream неизменна (`nats-jetstream-protocols` требует отдельного change для topology), stream принадлежит notification-service, изменение заголовка команды затрагивает две кодовые базы одновременно.

## Goals / Non-Goals

**Goals:**
- VK- и email-команды одного callback сосуществуют в stream и доставляются каждая своему durable.
- Молчаливая потеря команды невозможна: ответ брокера анализируется, дубликат виден в логах.
- Прикладные логи notification-service восстановлены, чтобы подобный класс дефектов диагностировался по логам, а не по чтению stream.
- Поведение при штатной redelivery callback-события остаётся идемпотентным и не порождает бесконечный NAK.

**Non-Goals:**
- Изменение payload-схем команд, subjects, streams, durables, `duplicate_window`.
- Изменение HTTP endpoints и access classes.
- Приведение канала `sms` в рабочее состояние или удаление его из seeds.
- Унификация трёх реализаций NATS-клиента.
- Ретроспективная доставка VK-уведомлений по уже потерянным заявкам.

## Decisions

### D1. `Nats-Msg-Id = uuid5(NAMESPACE_NOTIFICATION_COMMAND, f"{callback_request_id}:{channel_code}")`

Детерминированный UUIDv5 от пары «callback + канал».

- *Почему так*: сохраняет UUID-формат заголовка (vk-handler уже парсит `UUID(headers["Nats-Msg-Id"])`, AsyncAPI описывает header как UUID), даёт разные значения для email и VK, и остаётся стабильным между повторными обработками одного и того же callback-события — то есть дедупликация продолжает защищать от двойной отправки при redelivery.
- *Альтернатива «строка `{callback_request_id}:{channel}`»*: отклонена — ломает формат заголовка и требует изменения AsyncAPI header schema и парсинга у потребителей.
- *Альтернатива «использовать `event_uuid`»*: отклонена — `event_uuid` генерируется через `uuid.uuid4()` на каждой обработке события, поэтому при redelivery дедупликация перестала бы работать и пользователь получил бы повторное письмо/сообщение.
- *Альтернатива «отдельный stream на канал»*: отклонена — это topology change, запрещённый требованием «Неизменность NATS topology и контрактов» без отдельного change.

Namespace-константа и функция вычисления дублируются в обоих сервисах (общей библиотеки в монорепозитории нет). Дрейф контракта закрывается фиксированным тестовым вектором: один и тот же `(callback_request_id, channel_code)` → одно и то же ожидаемое значение, проверяемое unit-тестами в обеих кодовых базах, и описанием алгоритма в AsyncAPI обоих сервисов.

### D2. `PubAck` доходит до оркестратора

`NatsJetstreamClient.publish` уже возвращает `PubAck`, но `NatsEventPublisher._publish_event` его отбрасывает. Publisher начинает возвращать результат вида «идентификатор сообщения + признак duplicate», оркестратор его интерпретирует.

Семантика duplicate — идемпотентный успех, а не ошибка: после D1 duplicate может означать только повторную публикацию команды того же канала по тому же callback, то есть сообщение уже лежит в stream и будет обработано consumer'ом. Трактовка «дубликат = недоставлено» привела бы к отказу от `confirm_callback_delivery`, исключению и бесконечной redelivery. Поэтому канал засчитывается доставленным, но пишется `warning` с `correlation_id` и `channel_code` — это делает аномалию наблюдаемой.

### D3. Детерминированный порядок каналов

`ChannelRepository.get_active_channels()` получает `ORDER BY code`. Сейчас порядок определяется физическим порядком строк, и именно он решал, какой канал переживёт дедупликацию: при другом порядке потерялся бы email, а не VK. После D1 порядок на корректность не влияет, но детерминизм нужен для воспроизводимости тестов и логов.

### D4. Guard логирования в alembic env

`migration/env.py` каждого сервиса повторяет уже принятое в backend решение: `fileConfig` вызывается только если `config.attributes.get("configure_logger", True)` истинно. Правка применяется к `notification-service` (где дефект наблюдается), а также превентивно к `email-service` и `vk-service`. Вариант «глобально передавать `disable_existing_loggers=False`» отклонён — он расходится с эталоном backend и оставляет alembic-конфигурацию логирования частично применённой.

Регрессия закрывается unit-тестом: создать логгер, выполнить `apply_migration` с подменённым `command.upgrade`, проверить, что логгер не `disabled`.

### D5. Ownership и порядок исполнения

| Deliverable | Ownership | Профиль |
|---|---|---|
| A. notification-service: msg-id, PubAck, порядок каналов, logging guard, AsyncAPI headers | `services/notification-service/**` | Backend |
| B. vk-service: валидация заголовка, logging guard, AsyncAPI headers | `services/vk-service/**` | Backend |
| B2. email-service: превентивный logging guard | `services/email-service/src/migration/env.py` | Backend |
| C. Протокол и документация | `agents/howto/nats-jetstream-protocols.md`, README-секции сервисов | Backend |

Зоны не пересекаются. B зависит от A только контрактом (значение msg-id), поэтому B выполняется после A и берёт тестовый вектор из handoff A. Quality Gate по lanes: `QG-BE` (обе кодовые базы), `QG-CONTRACTS` (AsyncAPI, headers, ownership), `QG-LIVE` (реальный JetStream: обе команды одного callback), затем `QG-SYNTH`. `QG-FE` неприменим — frontend не затрагивается.

## Risks / Trade-offs

- **Рассинхронизация формулы msg-id между двумя репозиториями** → фиксированный тестовый вектор в unit-тестах обоих сервисов + явное описание алгоритма в AsyncAPI обоих сторон; расхождение падает на `QG-CONTRACTS`.
- **Команды, опубликованные старым producer и не обработанные к моменту деплоя, не пройдут новую валидацию заголовка** → перед деплоем проверяется `pending=0` у durable `vk-service-commands-send-vk` (сейчас фактически `0`, так как VK-команды до stream не доходили); notification-service и vk-service выкатываются совместно.
- **Дубликат перестал быть «ошибкой», и реальная аномалия может остаться незамеченной** → duplicate обязателен к логированию на уровне `warning` с correlation context, что после D4 действительно попадёт в stdout.
- **Восстановление логов увеличит объём stdout** → уровень остаётся `INFO`, PII в логи не добавляется; требование «Защита чувствительных данных» из `platform-observability` не ослабляется.
- **`sms` остаётся активным и неподдерживаемым каналом** → сознательный Non-Goal; после D3 он предсказуемо даёт одну запись `Unsupported channel` на событие и не участвует в публикации.

## Migration Plan

1. Реализовать A (notification-service), затем B (vk-service), затем C (протокол/README).
2. Прогнать `QG-BE`, `QG-CONTRACTS`, затем `QG-LIVE` на реальном JetStream.
3. Перед деплоем зафиксировать `pending=0` у durable `vk-service-commands-send-vk` и `notification-service-commands-send-email`.
4. Выкатить notification-service и vk-service совместно.
5. Post-deploy verification: создать callback при включённых обоих каналах; ожидается два сообщения в stream (`commands.notification.email.send` и `commands.notification.vk.send`) с разными `Nats-Msg-Id`, `delivered=1` у VK durable, доставленное VK-сообщение и прикладные логи notification-service в stdout.
6. Rollback: откат обоих сервисов одной операцией. Односторонний откат запрещён — он возвращает коллизию заголовков либо оставляет несовместимую валидацию.

## Resolved Questions

- **Канал `sms` не трогаем.** Решение пользователя от 2026-08-28. Он остаётся seeded-активным и неподдерживаемым; после D3 предсказуемо даёт одну запись `Unsupported channel for callback: sms` на событие и в публикации не участвует. Отдельный change по нему не заводится.
- **Guard логирования переносится на все сервисы с `migration/env.py`.** Решение пользователя от 2026-08-28. Правка применяется не только к notification-service, где дефект наблюдается, но и превентивно к `email-service` и `vk-service`: они сейчас применяют миграции отдельной командой, но любой переход на in-process накат воспроизвёл бы тот же отказ. В `backend` guard уже есть и не меняется.
