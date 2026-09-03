# Development Report: 065 — runtime error noise

**Статус:** `APPROVED`
**Дата:** `2026-09-03`
**Рекомендуемая ветка:** `065_bugs`

## Ссылки

- Задача: [`docs/tasks/065_bugs.md`](../tasks/065_bugs.md)
- OpenSpec change: [`fix-065-runtime-error-noise`](../../openspec/changes/fix-065-runtime-error-noise/)
- Proposal: [`proposal.md`](../../openspec/changes/fix-065-runtime-error-noise/proposal.md)
- Design и test matrix: [`design.md`](../../openspec/changes/fix-065-runtime-error-noise/design.md)
- Delta specs: [`specs/`](../../openspec/changes/fix-065-runtime-error-noise/specs/)
- Tasks: [`tasks.md`](../../openspec/changes/fix-065-runtime-error-noise/tasks.md)
- Approval: пользователь явно подтвердил `Apply` после предъявления apply-ready change.

## Итог

Diff соответствует утверждённому change. Notification Service и VK Service теперь считают фактический timeout `nats-py` на границе `fetch()` штатным idle-состоянием, сохраняя cancellation, broker-error/backoff и delivery semantics. VK Service исключает только библиотечный retry logger `vkbottle` из Sentry LoggingIntegration; локальный logging, прикладные ошибки и sanitization сохранены.

Все blocking findings начальных backend-проверок устранены в `NOTIFY-R1`, `VK-NATS-R2` и `VK-OBS-R1`; повторный backend lane прошёл без findings. Контрактный и применимые live-сценарии прошли. Итоговый вердикт: **✅ APPROVED**.

## Lanes

| Lane | Статус | Evidence |
|---|---|---|
| `QG-BE` | пройден после rework | `make check-notification`: format/lint/type gates чистые, `132 passed, 2 deselected`; `make check-vk`: format/lint/type gates чистые, `290 passed, 21 deselected`; повторных findings нет |
| `QG-FE` | неприменимо | В change отсутствует diff в `services/frontend` и `services/site-*`; frontend test gate не запускается |
| `QG-CONTRACTS` | пройден | AsyncAPI Notification/VK валидны; contract tests: Notification `11 passed`, VK `1 passed`; strict OpenSpec validation успешна; `CT-065-01` пройден |
| `QG-LIVE` | пройден с допустимым ограничением | `SM-065-01`, `SM-065-02`, `SM-065-04` пройдены; `SM-065-03` — `LIMITED` согласно design, без ложного заявления об успешной live-проверке GlitchTip |

## Изменённые файлы

| Файл | Что изменено |
|---|---|
| `services/notification-service/src/clients/nats/consumers/callback_request.py` | Точная классификация idle timeout на fetch boundary |
| `services/notification-service/tests/unit/messaging/test_callback_request_consumer.py` | Регрессии idle, delivery after idle, cancellation и broker error |
| `services/vk-service/src/clients/nats/consumers/notification_commands_send_vk.py` | Точная классификация idle timeout VK command consumer |
| `services/vk-service/src/utils/configure_sentry.py` | Минимальное Sentry-исключение библиотечного logger `vkbottle` |
| `services/vk-service/tests/clients/nats/test_vk_notification_consumer.py` | Регрессии VK NATS consumer |
| `services/vk-service/tests/unit/test_observability.py` | Границы Sentry ignore и sanitization |
| `services/vk-service/tests/bot/test_longpoll_resilience.py` | Восстановление polling после временного сбоя |
| `services/vk-service/tests/unit/test_vk_library_isolation.py` | Проверка фактического поведения библиотечного logging bridge |
| `openspec/changes/fix-065-runtime-error-noise/**` | Утверждённые proposal, design, delta specs и execution tasks |

AsyncAPI, runtime topology/settings, HTTP API и схема БД не изменены.

## Покрытие по test matrix

| ID | Фактическая проверка | Статус |
|---|---|---|
| `UT-065-N-01` | Notification consumer: built-in timeout, повторный fetch, cancellation | покрыто |
| `UT-065-N-02` | Notification consumer: сообщение после idle, handler и однократный ack | покрыто |
| `UT-065-N-03` | Notification consumer: видимый broker error и сохранённый backoff | покрыто |
| `UT-065-VN-01` | VK consumer: idle без delivery/ack/nak/error telemetry | покрыто |
| `UT-065-VN-02` | VK consumer: команда после idle и ack | покрыто |
| `UT-065-VN-03` | VK consumer: cancellation и non-timeout broker error | покрыто |
| `UT-065-VO-01` | Sentry configuration игнорирует точный `vkbottle` logger | покрыто |
| `UT-065-VO-02` | Собственные application logger/exception не игнорируются | покрыто |
| `UT-065-VO-03` | Фактический polling loop восстанавливается и доставляет событие | покрыто |
| `UT-065-VO-04` | Sanitization credentials/body сохранена | покрыто |
| `IT-065-N-01` | Реальный NATS: Notification delivery после idle | покрыто `SM-065-01/02` |
| `IT-065-V-01` | Реальный NATS: VK delivery после idle | покрыто `SM-065-01/02` |
| `SM-065-01` | Два развёрнутых consumer пережили idle window | пройдено |
| `SM-065-02` | Изолированная доставка через реальный NATS после idle | пройдено |
| `SM-065-03` | Controlled VK retry / GlitchTip evidence | `LIMITED`, допустимо design |
| `SM-065-04` | Counts реальных БД до/после idle | пройдено |
| `CT-065-01` | AsyncAPI/runtime topology drift | пройдено |

Непокрытых обязательных unit/contract IDs нет. Оси HTTP input/response, access matrix, транзакционная запись и frontend неприменимы: соответствующие boundaries change не затрагивает.

## Unit / Integration тесты

| Команда | Результат | Примечание |
|---|---|---|
| `make check-notification` | passed | format/lint/type checks чистые; `132 passed, 2 deselected` |
| `make check-vk` | passed | format/lint/type checks чистые; `290 passed, 21 deselected` |
| Notification contract tests | passed | `11 passed` |
| VK contract tests | passed | `1 passed` |
| AsyncAPI validation Notification/VK | passed | topology, payload, headers и ack без drift |
| `openspec validate fix-065-runtime-error-noise --type change --strict` | passed | change valid |

## Frontend test gate

Неприменимо: нет runtime или documentation diff в `services/frontend` либо `services/site-*`. `npm test`, lint, `tsc --noEmit`, build, browser/manual QA и frontend access checks обоснованно не запускались.

## SMOKE-тесты

| ID | Boundary | Метод / HTTP | Time | Результат | Примечание |
|---|---|---|---|---|---|
| `SM-065-01` | Notification/VK consumers | NATS idle | `10.520 s / 10.515 s` | passed | Exact deployed consumers healthy, restart `0`, error logs отсутствуют |
| `SM-065-02` | Isolated real NATS delivery | NATS publish/ack | `0.001 s / 0.001 s` | passed | Оба сообщения доставлены и acked; production durables не изменены |
| `SM-065-03` | VK observability | runtime monitoring | — | `LIMITED` | `SENTRY_ENABLED=false`; безопасно индуцировать controlled retry и проверить GlitchTip было невозможно |
| `SM-065-04` | Notification/VK PostgreSQL | read-only counts | — | passed | Релевантные counts до/после не изменились, все `0` |
| health | Notification Service `/health` | `GET 200` | `0.233 s` | passed | Развёрнут точный проверяемый source hash |
| health | VK Service `/health` | `GET 200` | `0.237 s` | passed | Развёрнут точный проверяемый source hash |

Итог SMOKE: `3 passed / 1 limited`; health endpoints `2/2 passed`. Временные isolated streams удалены, production messages/data не создавались и не изменялись. Source hashes в контейнерах совпали с проверяемым кодом; контейнеры имели свежий `StartedAt`, healthy status и restart count `0`.

### Оценка ограничения SM-065-03

Ограничение не блокирует `APPROVED`: approved design прямо допускает пометку ограничения, если безопасный controlled VK retry недоступен, при условии обязательного unit-покрытия. Это покрытие (`UT-065-VO-01..04`, включая границы фильтра, recovery и sanitization) прошло внутри полного `make check-vk`. Нельзя утверждать, что отсутствие нового GlitchTip issue подтверждено live: Sentry был отключён, поэтому это остаётся известным post-deploy observation risk.

## Access verification results

Неприменимо. Endpoint diff отсутствует, HTTP access matrix не меняется. Поэтому anonymous/public и authenticated/protected проверки, роли и исключения отсутствуют в scope; существующие Public Read / Protected Write контракты не затронуты.

## Findings, rework и риски

- Первичные blockers устранены execution units `NOTIFY-R1`, `VK-NATS-R2`, `VK-OBS-R1`; повторный `QG-BE-R1` findings не выявил.
- Открытых blocking findings и новых rework execution units нет.
- Остаточный риск: фактическое отсутствие GlitchTip event для штатного `vkbottle` retry следует наблюдать после deployment с включённым Sentry; это не заменяет и не отменяет пройденные автоматические границы фильтра.

## Следующий шаг Router

Выполнить строго последовательно: **sync delta specs в main specs → strict validation → archive change**. Реализация и sync/archive не входят в этот synthesis lane.
