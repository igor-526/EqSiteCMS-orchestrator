## Why

Шесть production-событий GlitchTip из `docs/bugs/064_*.md` и два падения CI при деплое (`docs/tasks/064_bugs.md`) сводятся к трём системным дефектам, растиражированным по Python-сервисам из общего шаблона `agents/howto/nats-jetstream-protocols.md`, и к одному дефекту кросс-репозиторных контрактных тестов. Сейчас штатная остановка сервиса даёт трейсбэк, один перезапуск NATS порождает четыре ложных error-события, notification-service крэшлупит при неудачном порядке деплоя, а `make test` в CI сервисных репозиториев падает и блокирует релиз.

## What Changes

- **Устойчивый `close()`.** `NatsJetstreamClient.close()` во всех четырёх Python-сервисах перестаёт пробрасывать наружу ошибки `drain()` (в проде — `nats.errors.ConnectionReconnectingError` при остановке во время reconnect) и деградирует до `close()` соединения.
- **Политика эскалации ошибок NATS вместо шума.** Сервисы регистрируют собственные `error_cb` / `disconnected_cb` / `reconnected_cb` / `closed_cb`. Транзиентные сбои логируются как `warning` без `exc_info` и не порождают событий в GlitchTip; `error` с событием отправляется один раз за инцидент только после порога последовательных неудач (`NATS_ERROR_REPORT_AFTER_ATTEMPTS`, default 3) и сбрасывается при reconnect. Логгер `nats.aio.client` исключается из Sentry LoggingIntegration, чтобы библиотека не обходила эту политику.
- **Bounded retry для durable consumer на чужом stream.** `setup_consumers()` в notification-service (`SITE_EVENTS`, владелец — backend) и vk-service (`NOTIFICATION_COMMANDS`, владельцы — notification/email) ретраит `nats.js.errors.NotFoundError` с backoff (`NATS_SETUP_MAX_ATTEMPTS`, `NATS_SETUP_BACKOFF_SECONDS`) и падает только после исчерпания попыток. Ownership stream'ов не меняется: `add_stream` на чужой stream по-прежнему запрещён.
- **Кросс-репозиторные контрактные тесты не падают вне монорепы.** Тесты, читающие AsyncAPI соседнего сервиса, пропускаются с явной причиной, когда соседнего репозитория нет (CI сервисного репозитория), и остаются обязательными в монорепе: при `EQCMS_MONOREPO=1` отсутствие соседа — ошибка, а не skip. Root Makefile получает цель `contracts-check`, включённую в `check`.
- **Корректный liveness probe.** В `.helm` notification-, email- и vk-service probe бьёт в несуществующий `/api/v1/health` при `failureThreshold: 1`; путь исправляется на фактический `/health` (как уже сделано в backend).
- **Синхронизация канонического шаблона.** `agents/howto/nats-jetstream-protocols.md` обновляется исправленным паттерном, чтобы следующий сервис не унаследовал те же дефекты.

Breaking changes отсутствуют: новые env-переменные имеют безопасные значения по умолчанию, публичные HTTP-контракты и NATS subjects не меняются.

## Capabilities

### New Capabilities

Новых capability не вводится — изменения уточняют требования уже существующих.

### Modified Capabilities

- `nats-jetstream-protocols`: требования к жизненному циклу клиента дополняются устойчивым завершением (`close()` не падает на `drain()`), обязательными connection-колбэками с политикой эскалации и bounded retry при регистрации durable consumer на stream, которым сервис не владеет.
- `platform-observability`: добавляется требование к шумоподавлению инфраструктурной телеметрии — транзиентные reconnect-ошибки NATS не становятся Sentry-событиями, а затяжная недоступность брокера порождает ровно одно событие на инцидент.
- `core-service-release-hardening`: safe production configuration дополняется требованием, что liveness probe каждого сервиса указывает на фактически обслуживаемый health-путь.
- `repository-process-tooling`: non-mutating release gate дополняется требованием, что кросс-репозиторные контрактные проверки исполняются в монорепе и деградируют до явного skip только вне её, без молчаливой потери покрытия.

## Impact

**Код (runtime):**
- `services/{backend,notification-service,email-service,vk-service}/src/clients/nats/client.py`
- `services/{backend,notification-service,email-service,vk-service}/src/utils/configure_sentry.py`
- Модули настроек `NatsSettings` тех же четырёх сервисов (три новых поля)

**Тесты:**
- `services/notification-service/tests/unit/messaging/test_nats_adapter_contract.py`
- `services/vk-service/tests/clients/nats/test_vk_contract_equality.py`
- Новые unit-тесты жизненного цикла NATS-клиента в каждом из четырёх сервисов

**Инфраструктура и процессы:**
- `services/{notification-service,email-service,vk-service}/.helm/templates/*deployment*.yml`
- `Makefile` (root): цели `contracts-check`, `check`
- `agents/howto/nats-jetstream-protocols.md`

**API Access Policy:** новых и изменённых HTTP-endpoint'ов нет, матрица доступа не меняется; access matrix в delta specs не требуется.

**Зависимости:** новых пакетов не добавляется; используются уже присутствующие `nats-py` и `sentry-sdk`.
