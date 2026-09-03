## Why

В production штатное отсутствие сообщений в pull-consumers Notification Service и VK Service ошибочно фиксируется GlitchTip как `TimeoutError`, а устойчивый retry VK Bots Long Poll — как error-событие `Unable to make request to BotPolling, retrying...`. Эти события создают постоянный мониторинговый шум и маскируют реальные отказы, хотя оба runtime продолжают работу.

## What Changes

- Классифицировать фактический `asyncio.TimeoutError`, выбрасываемый `nats-py` pull `fetch()`, как штатное idle-состояние в Notification Service и VK Service без error/warning telemetry.
- Сохранить видимость реальных NATS connection/protocol errors, ошибок handler и корректную отмену consumer task.
- Исключить штатный retry-логгер `vkbottle` из Sentry/GlitchTip в VK Service, сохранив захват необработанных и прикладных ошибок bot runtime.
- Добавить регрессионные unit/integration и live-проверки, подтверждающие продолжение обработки после idle/retry и отсутствие ложных событий мониторинга.
- Не менять NATS topology, AsyncAPI payload/headers, HTTP API, БД и access policy.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `nats-jetstream-protocols`: распространить контракт штатного idle timeout на pull-consumers Notification Service и VK Service с учётом фактического типа исключения `nats-py`.
- `platform-observability`: отделить ожидаемые retry-сигналы `vkbottle` от событий мониторинга, не скрывая реальные ошибки VK runtime.
- `vk-bot-longpolling`: закрепить, что штатный сетевой retry Bots Long Poll не создаёт error-событие GlitchTip и не останавливает процесс.

## Impact

- Код: `services/notification-service/src/clients/nats/consumers/callback_request.py`, `services/vk-service/src/clients/nats/consumers/notification_commands_send_vk.py`, `services/vk-service/src/utils/configure_sentry.py`.
- Тесты: точечные consumer/observability/long-poll tests обоих сервисов и live verification на реальном NATS.
- Контракты: delta specs трёх существующих capabilities; AsyncAPI остаётся неизменным и проверяется на отсутствие drift.
- API/данные: endpoint changes и миграции отсутствуют; access matrix неприменима.
