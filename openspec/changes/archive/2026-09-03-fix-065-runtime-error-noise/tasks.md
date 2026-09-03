# Tasks — fix-065-runtime-error-noise

Ownership разделён между двумя runtime-сервисами и Quality Gate lanes; test matrix и DAG находятся в `design.md` (`## Test matrix`, `## Execution units`). `contextFiles` перечислены точечно для каждого unit.

## Execution units

| Unit | Профиль | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| `065-NOTIFY-1` | Backend | Notification consumer/tests | — | точечный pytest | `design.md#1-перехватывать-фактический-idle-timeout-на-границе-fetch`, `specs/nats-jetstream-protocols/spec.md`, consumer и messaging test |
| `065-VK-NATS-1` | Backend | VK NATS consumer/tests | — | точечный pytest | `design.md#1-перехватывать-фактический-idle-timeout-на-границе-fetch`, `specs/nats-jetstream-protocols/spec.md`, VK consumer/test |
| `065-VK-OBS-1` | Backend | VK Sentry/long-poll tests | `065-VK-NATS-1` | точечный pytest | `design.md#2-подавлять-только-sentry-интеграцию-библиотечного-logger-vkbottle`, observability и longpoll delta specs, Sentry config/tests |
| `065-QG-BE` | Quality Gate | read-only runtime/tests | implementation units | service gates | `design.md#test-matrix`, три delta specs, handoffs implementation units |
| `065-QG-FE` | Quality Gate | — | — | неприменимо | `proposal.md#impact` |
| `065-QG-CONTRACTS` | Quality Gate | read-only OpenSpec/AsyncAPI/diff | implementation units | strict + AsyncAPI | `design.md#3-messaging-contract-остаётся-неизменным`, nats delta spec, два AsyncAPI |
| `065-QG-LIVE` | Quality Gate | verification only | BE/contracts lanes | smoke skill | `design.md#test-matrix`, `design.md#postgresql-для-smoke-тестов`, prior lane handoffs |
| `065-QG-SYNTH` | Quality Gate | `docs/reports/**` | применимые lanes | единый verdict | lane handoffs/findings, `design.md#execution-units` |

## 1. 065-NOTIFY-1 — Notification idle timeout (профиль: Backend)

**Specs:** `nats-jetstream-protocols` · **Пути:** `services/notification-service/src/clients/nats/consumers/callback_request.py`, `services/notification-service/tests/unit/messaging/**` · **Зависит от:** —

- [x] 065-NOTIFY-1.1 Подтвердить фактическую иерархию timeout-типов установленного `nats-py` и ограничить исправление границей `fetch()`.
- [x] 065-NOTIFY-1.2 Исправить классификацию built-in/NATS idle timeout без изменения cancellation и broker-error ветвей.
- [x] 065-NOTIFY-1.3 Реализовать `UT-065-N-01..UT-065-N-03` из `design.md#test-matrix` без реального broker в unit tests.
- [x] 065-NOTIFY-1.4 Проверить отсутствие изменений settings, AsyncAPI, ack/nak и handler semantics.
- [x] 065-NOTIFY-1.V Прогнать точечные messaging tests Notification Service, отметить выполненные IDs и вернуть Router handoff.

## 2. 065-VK-NATS-1 — VK command idle timeout (профиль: Backend)

**Specs:** `nats-jetstream-protocols` · **Пути:** `services/vk-service/src/clients/nats/consumers/notification_commands_send_vk.py`, `services/vk-service/tests/clients/nats/**` · **Зависит от:** —

- [x] 065-VK-NATS-1.1 Подтвердить фактическую иерархию timeout-типов установленного `nats-py` и границу consumer fetch.
- [x] 065-VK-NATS-1.2 Исправить классификацию built-in/NATS idle timeout, сохранив cancellation, error/backoff и delivery semantics.
- [x] 065-VK-NATS-1.3 Реализовать `UT-065-VN-01..UT-065-VN-03` из `design.md#test-matrix`.
- [x] 065-VK-NATS-1.4 Проверить отсутствие изменений AsyncAPI, settings, ack/nak и idempotency handler.
- [x] 065-VK-NATS-1.V Прогнать точечные VK consumer tests, отметить выполненные IDs и вернуть Router handoff.

## 3. 065-VK-OBS-1 — VK long-poll observability (профиль: Backend)

**Specs:** `platform-observability`, `vk-bot-longpolling` · **Пути:** `services/vk-service/src/utils/configure_sentry.py`, `services/vk-service/tests/unit/test_observability.py`, `services/vk-service/tests/bot/test_longpoll_resilience.py` · **Зависит от:** `065-VK-NATS-1`

- [x] 065-VK-OBS-1.1 Подтвердить точное имя logging record штатного `vkbottle` retry на установленной версии.
- [x] 065-VK-OBS-1.2 Добавить минимальное исключение этого logger из Sentry LoggingIntegration без изменения локального logging и sanitization.
- [x] 065-VK-OBS-1.3 Реализовать `UT-065-VO-01..UT-065-VO-02` и `UT-065-VO-04`, проверяя границы фильтра и защиту секретов.
- [x] 065-VK-OBS-1.4 Дополнить/подтвердить `UT-065-VO-03` на фактическом `vkbottle` polling loop без реальной сети/VK token.
- [x] 065-VK-OBS-1.5 Проверить, что собственные `bot.*`, handler и preflight errors не подавлены.
- [x] 065-VK-OBS-1.V Прогнать точечные observability и bot resilience tests VK Service, отметить IDs и вернуть Router handoff.

## 4. 065-QG-BE — backend/runtime lane (профиль: Quality Gate)

**Specs:** все delta specs · **Пути:** read-only diff обоих Python-сервисов · **Зависит от:** `065-NOTIFY-1`, `065-VK-NATS-1`, `065-VK-OBS-1`

- [x] 065-QG-BE.1 Проверить diff на точность exception classification, отсутствие широкого подавления, корректность cancellation/backoff и Clean Architecture.
- [x] 065-QG-BE.2 Оценить качество и фактическую трассировку `UT-065-N-*`, `UT-065-VN-*`, `UT-065-VO-*`, включая негативные границы.
- [x] 065-QG-BE.3 Прогнать полный применимый test/lint/type gate Notification Service.
- [x] 065-QG-BE.4 Прогнать полный применимый `make check-vk`/test/lint/type gate VK Service без infrastructure tests.
- [x] 065-QG-BE.V Вернуть lane handoff с findings/evidence; verdict change не ставить.

## 5. 065-QG-FE — frontend/browser lane (профиль: Quality Gate)

**Specs:** неприменимо · **Пути:** — · **Зависит от:** —

- [x] 065-QG-FE.1 Зафиксировать lane как `неприменимо`: change не содержит diff в `services/frontend` или `services/site-*`.
- [x] 065-QG-FE.V Вернуть краткий handoff `неприменимо`; frontend команды не запускать.

## 6. 065-QG-CONTRACTS — contracts lane (профиль: Quality Gate)

**Specs:** все delta specs · **Пути:** OpenSpec change, Notification/VK AsyncAPI и NATS settings · **Зависит от:** все implementation units

- [x] 065-QG-CONTRACTS.1 Сверить diff с утверждёнными specs/tasks, ownership и handoffs; endpoint/access matrix подтвердить как неприменимые.
- [x] 065-QG-CONTRACTS.2 Проверить неизменность stream/subject/durable/ack/payload/header и соответствие runtime settings двум AsyncAPI.
- [x] 065-QG-CONTRACTS.3 Прогнать `make asyncapi-validate` и `make asyncapi-validate-vk` либо эквивалентные канонические цели.
- [x] 065-QG-CONTRACTS.4 Прогнать `openspec validate fix-065-runtime-error-noise --type change --strict`.
- [x] 065-QG-CONTRACTS.V Вернуть lane handoff с `CT-065-01` evidence/findings; verdict change не ставить.

## 7. 065-QG-LIVE — live NATS/PostgreSQL lane (профиль: Quality Gate)

**Specs:** `nats-jetstream-protocols`, `platform-observability`, `vk-bot-longpolling` · **Пути:** verification only · **Зависит от:** `065-QG-BE`, `065-QG-CONTRACTS`

- [x] 065-QG-LIVE.1 Через labels/fallback повторно найти NATS и DB-контейнеры, выполнить `docker inspect`, извлечь runtime-параметры без хардкода и не выводить пароли в evidence.
- [x] 065-QG-LIVE.2 Выполнить `SM-065-01..SM-065-04` только через `.claude/skills/api-smoke-test` на живых API, реальном NATS и PostgreSQL; pytest smoke files не создавать.
- [x] 065-QG-LIVE.3 Зафиксировать consumer health/durable progress, отсутствие побочных DB-записей и доступное monitoring/log evidence без секретов.
- [x] 065-QG-LIVE.4 Если безопасный controlled VK retry недоступен, явно отметить ограничение `SM-065-03`, не симулировать успешный live результат.
- [x] 065-QG-LIVE.V Вернуть lane handoff с passed/failed scenario IDs; общий verdict не ставить.

## 8. 065-QG-SYNTH — единый Quality Gate verdict (профиль: Quality Gate)

**Specs:** все delta specs · **Пути:** `docs/reports/**` · **Зависит от:** `065-QG-BE`, `065-QG-FE`, `065-QG-CONTRACTS`, `065-QG-LIVE`

- [x] 065-QG-SYNTH.1 Свести handoffs всех lanes и проверить, что неприменимость QG-FE обоснована.
- [x] 065-QG-SYNTH.2 Сопоставить findings с владельцами и при наличии проблем сформировать непересекающиеся rework execution units.
- [x] 065-QG-SYNTH.3 Создать единый отчёт в `docs/reports/` с evidence, ограничениями и verdict `APPROVED` либо `REWORK`.
- [x] 065-QG-SYNTH.4 При `APPROVED` указать Router следующий порядок: sync delta specs → strict validation → archive; не выполнять apply за пределами lane.
- [x] 065-QG-SYNTH.V Вернуть Router synthesis handoff и остановиться.
