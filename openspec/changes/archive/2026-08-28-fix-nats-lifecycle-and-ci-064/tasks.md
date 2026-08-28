## 1. BE-1 — backend: референсная реализация lifecycle и телеметрии NATS

Ownership: `services/backend/**`. Предыдущий unit: нет.

- [x] 1.1 Добавить в `NatsSettings` (`services/backend/src/settings.py`) поле `nats_error_report_after_attempts` (alias `NATS_ERROR_REPORT_AFTER_ATTEMPTS`, default `3`, `ge=1`)
- [x] 1.2 Реализовать в `services/backend/src/clients/nats/client.py` объект состояния инцидента (счётчик последовательных неудач + признак отправленной эскалации) и колбэки `error_cb` / `disconnected_cb` / `reconnected_cb` / `closed_cb` по политике из design (warning без `exc_info` до порога, один `error` с `exc_info` после, сброс на reconnect)
- [x] 1.3 Передать эти колбэки в `self._connection.connect(...)`
- [x] 1.4 Сделать `close()` устойчивым: перехват `nats.errors.Error` и `asyncio.TimeoutError` вокруг `drain()`, `warning`, fallback на `close()` соединения, обнуление `_connection`/`_jetstream` в `finally`
- [x] 1.5 Добавить `ignore_logger("nats.aio.client")` в `services/backend/src/utils/configure_sentry.py`, не меняя существующие `before_send`/`_sanitize`
- [x] 1.6 Unit-тест: `close()` при `ConnectionReconnectingError` из `drain()` не пробрасывает исключение, вызывает `close()` соединения и обнуляет состояние
- [x] 1.7 Unit-тест: `error_cb` до порога пишет только `warning`; после превышения — ровно один `error` на инцидент
- [x] 1.8 Unit-тест: `reconnected_cb` сбрасывает счётчик и признак эскалации, следующий инцидент снова проходит полный порог
- [x] 1.9 Verification: `make -C services/backend test` и `make -C services/backend lint` — зелёные

## 2. NS-1 — notification-service: lifecycle, телеметрия и bounded retry

Ownership: `services/notification-service/src/**`, `services/notification-service/tests/unit/**`. Предыдущий unit: BE-1 (эталон реализации).

- [x] 2.1 Добавить в `NatsSettings` (`services/notification-service/src/settings.py`) поля `nats_error_report_after_attempts`, `nats_setup_max_attempts` (default `10`, `ge=1`), `nats_setup_backoff_seconds` (default `2.0`, `ge=0`)
- [x] 2.2 Перенести из BE-1 колбэки, объект состояния инцидента и устойчивый `close()` в `services/notification-service/src/clients/nats/client.py`
- [x] 2.3 Добавить `ignore_logger("nats.aio.client")` в `services/notification-service/src/utils/configure_sentry.py`
- [x] 2.4 Обернуть `_setup_callback_requested_consumer()` в bounded retry по `nats.js.errors.NotFoundError` с линейным backoff по образцу `services/notification-service/src/utils/seeding/init_registry.py:54`; прочие `APIError` не ретраить
- [x] 2.5 Убедиться, что `setup_streams()` по-прежнему не вызывает `add_stream` для `SITE_EVENTS`
- [x] 2.6 Unit-тесты `close()` / порога эскалации / сброса на reconnect (аналогично 1.6–1.8)
- [x] 2.7 Unit-тест: `setup_consumers()` ретраит `NotFoundError` и завершается успешно, когда stream появляется на N-й попытке
- [x] 2.8 Unit-тест: после исчерпания `nats_setup_max_attempts` `setup_consumers()` падает, а сообщение об ошибке содержит имя отсутствующего stream
- [x] 2.9 Verification: `make -C services/notification-service test` и `make -C services/notification-service lint` — зелёные

## 3. ES-1 — email-service: lifecycle и телеметрия

Ownership: `services/email-service/src/**`, `services/email-service/tests/**`. Предыдущий unit: BE-1.

- [x] 3.1 Добавить `nats_error_report_after_attempts` в `NatsSettings` (`services/email-service/src/settings.py`)
- [x] 3.2 Перенести колбэки, объект состояния инцидента и устойчивый `close()` в `services/email-service/src/clients/nats/client.py`
- [x] 3.3 Добавить `ignore_logger("nats.aio.client")` в `services/email-service/src/utils/configure_sentry.py`
- [x] 3.4 Unit-тесты `close()` / порога эскалации / сброса на reconnect
- [x] 3.5 Verification: `make -C services/email-service test` и `make -C services/email-service lint` — зелёные

## 4. VK-1 — vk-service: lifecycle, телеметрия и bounded retry

Ownership: `services/vk-service/src/**`, `services/vk-service/tests/unit/**`. Предыдущий unit: BE-1, NS-1.

- [x] 4.1 Добавить в `NatsSettings` (`services/vk-service/src/settings.py`) поля `nats_error_report_after_attempts`, `nats_setup_max_attempts`, `nats_setup_backoff_seconds`
- [x] 4.2 Перенести колбэки, объект состояния инцидента и устойчивый `close()` в `services/vk-service/src/clients/nats/client.py`
- [x] 4.3 Добавить `ignore_logger("nats.aio.client")` в `services/vk-service/src/utils/configure_sentry.py`
- [x] 4.4 Обернуть `setup_consumers()` (durable на чужом `NOTIFICATION_COMMANDS`) в тот же bounded retry по `NotFoundError`
- [x] 4.5 Убедиться, что `setup_streams()` остаётся no-op и `add_stream` не вызывается
- [x] 4.6 Unit-тесты `close()` / порога эскалации / сброса на reconnect / retry и исчерпания попыток
- [x] 4.7 Verification: `make -C services/vk-service test` и `make -C services/vk-service lint` — зелёные

## 5. NS-2 — notification-service: кросс-репозиторный контрактный тест

Ownership: `services/notification-service/tests/**`. Предыдущий unit: NS-1.

- [x] 5.1 Создать `services/notification-service/tests/support/cross_repo.py` с резолвом пути к соседнему документу, `pytest.skip` при отсутствии и `AssertionError` при `EQCMS_MONOREPO=1`
- [x] 5.2 Перевести `test_backend_and_notification_asyncapi_callback_schemas_match` (`tests/unit/messaging/test_nats_adapter_contract.py:97`) на этот хелпер
- [x] 5.3 Verification: `make -C services/notification-service test` — зелёный; повторный прогон с `EQCMS_MONOREPO=1` — тест исполняется, не `skipped`
- [x] 5.4 Verification: при временно недоступном `services/backend/docs/asyncapi.yaml` прогон без переменной даёт `skipped`, а с `EQCMS_MONOREPO=1` — падение

## 6. VK-2 — vk-service: кросс-репозиторный контрактный тест

Ownership: `services/vk-service/tests/**`. Предыдущий unit: VK-1.

- [x] 6.1 Создать `services/vk-service/tests/support/cross_repo.py` с той же семантикой
- [x] 6.2 Перевести `test_ut09_notification_and_vk_asyncapi_payload_and_headers_are_equal` (`tests/clients/nats/test_vk_contract_equality.py:9`) на этот хелпер
- [x] 6.3 Verification: `make -C services/vk-service test` — зелёный; прогон с `EQCMS_MONOREPO=1` — тест исполняется, не `skipped`

## 7. INFRA-1 — исправление пути liveness probe

Ownership: `services/{notification-service,email-service,vk-service}/.helm/templates/*deployment*.yml`. Предыдущий unit: нет (независим).

- [x] 7.1 Заменить `http://localhost:8000/api/v1/health` на `http://localhost:8000/health` в `services/notification-service/.helm/templates/notification-service-deployment.yml`
- [x] 7.2 То же в `services/email-service/.helm/templates/email-service-deployment.yml`
- [x] 7.3 То же в `services/vk-service/.helm/templates/email-service-deployment.yml`
- [x] 7.4 Verification: `helm template .helm/` в каждом из трёх сервисов рендерится без ошибок и содержит `/health`; путь совпадает с маршрутом, зарегистрированным в `src/main.py` соответствующего сервиса

## 8. DOC-1 — монорепа: канонический howto и root tooling

Ownership: `agents/howto/nats-jetstream-protocols.md`, корневой `Makefile`. Предыдущий unit: BE-1, NS-1, NS-2, VK-2.

- [x] 8.1 Обновить секцию «NATS Jetstream Client» в `agents/howto/nats-jetstream-protocols.md`: устойчивый `close()`, регистрация колбэков, объект состояния инцидента, новые env-переменные в таблице
- [x] 8.2 Дополнить секцию «Consuming» правилом bounded retry для durable на stream другого владельца
- [x] 8.3 Добавить в корневой `Makefile` `.PHONY` цель `contracts-check`, запускающую кросс-репозиторные контрактные тесты с `EQCMS_MONOREPO=1`
- [x] 8.4 Включить `contracts-check` в цель `check`
- [x] 8.5 Verification: `make contracts-check` — тесты исполняются и проходят, ни один не `skipped`

## 9. Quality Gate

- [x] 9.1 `QG-BE`: Clean Architecture, unit-тесты и настройки во всех четырёх сервисах; сверка, что реализации колбэков и `close()` не разошлись между репозиториями
- [x] 9.2 `QG-CONTRACTS`: неизменность AsyncAPI и NATS-топологии, соблюдение ownership stream'ов, соответствие diff утверждённым specs и tasks, отсутствие изменений access matrix
- [x] 9.3 `QG-FE`: пометить `неприменимо` — нет diff в `services/frontend` и `services/site-*`
- [x] 9.4 `QG-LIVE`: `make infra`, `make migrate-core`, `make recreate-core`, `make health-core`; воспроизведение бага порядка старта (notification-service без backend → ретраит, не крэшится; после `make be` consumer поднимается); `docker restart eqsitecms-nats` → в GlitchTip нет событий, в логах warning'и; остановка сервиса во время reconnect → нет трейсбэка; SMOKE через `.claude/skills/api-smoke-test`
- [x] 9.5 `QG-SYNTH`: сведение findings всех lanes, единый вердикт `APPROVED` / `REWORK`, отчёт в `docs/reports/`

## 10. Завершение change

- [x] 10.1 Синхронизировать delta specs в main specs (`openspec-sync-specs`)
- [x] 10.2 Повторить strict validation
- [x] 10.3 Архивировать change (`openspec-archive-change`)
