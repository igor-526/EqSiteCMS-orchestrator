# Design — fix-065-runtime-error-noise

**Тикет:** `docs/tasks/065_bugs.md` · **Дата:** 2026-09-03 · **Сервисы:** Notification Service, VK Service

## Context

GlitchTip issue из `docs/bugs/065_notification_service.md` и `docs/bugs/065_vk_service_2.md` показывает встроенный `TimeoutError` из `nats.js.client._fetch_n()` на строке `fetch()`. Текущие consumers перехватывают `nats.errors.TimeoutError`, который в установленном `nats-py 2.15.0` является отдельным, не родственным встроенному `asyncio.TimeoutError` классом. Поэтому штатное завершение pull request без сообщений попадает в широкий `except Exception`, логируется через `logger.exception` и становится Sentry event.

`docs/bugs/065_vk_service_1.md` показывает отдельное библиотечное сообщение `vkbottle`: `Unable to make request to BotPolling, retrying...`. Фактический `BasePolling.listen()` переживает такой сбой, а существующие stub-тесты подтверждают продолжение цикла. Следовательно, это ожидаемый retry-сигнал, но Sentry LoggingIntegration ошибочно классифицирует его как инцидент.

AsyncAPI обоих сервисов и `NatsSettings` совпадают по stream/subject/durable и не требуют изменения. HTTP endpoint, схема БД и межсервисный payload не меняются.

## Goals / Non-Goals

**Goals:**

- устранить ложные GlitchTip события для штатного idle pull timeout в обоих consumers;
- устранить ложное событие штатного `vkbottle` retry, сохранив локальный лог;
- сохранить cancellation, backoff реальных broker errors, ack/nak и видимость прикладных ошибок;
- закрепить поведение regression-тестами и live evidence.

**Non-Goals:**

- изменение NATS topology, AsyncAPI schemas, retry/backoff настроек или delivery semantics;
- замена либо monkey patch `nats-py`/`vkbottle`;
- изменение HTTP API, access policy, PostgreSQL schema, Helm/CI VK Service;
- устранение причины внешних DNS/VK/NATS сбоев: change исправляет их классификацию, не инфраструктуру.

## Decisions

### 1. Перехватывать фактический idle timeout на границе `fetch()`

В обоих consumer loops будет точечно учтён встроенный `asyncio.TimeoutError` наряду с совместимым NATS timeout. Перехват располагается только вокруг `fetch()` и немедленно продолжает цикл. `asyncio.CancelledError` сохраняется отдельной веткой и пробрасывается; остальные исключения продолжают попадать в существующий error/backoff path.

Альтернатива — фильтровать эти события только в `before_send`. Она отклонена: consumer продолжал бы писать ложный error-log и выполнять секундный backoff вместо штатного нового fetch, а фильтр по stack/message был бы хрупким.

### 2. Подавлять только Sentry-интеграцию библиотечного logger `vkbottle`

VK Sentry-конфигуратор расширит существующий список `ignore_logger` для точного имени, которым `vkbottle` передаёт retry record в стандартный logging bridge. Это не меняет уровень или наличие локального runtime log и не отключает Sentry для собственных модулей `bot.*`, NATS consumer и доменных handlers.

Альтернатива — глобально повысить logging threshold либо отключить LoggingIntegration — отклонена, поскольку скрыла бы полезные прикладные события всего сервиса. Фильтрация по тексту в `before_send` также отклонена как зависимая от формулировки сторонней библиотеки.

### 3. Messaging contract остаётся неизменным

`services/notification-service/docs/asyncapi.yaml`, `services/vk-service/docs/asyncapi.yaml` и настройки рассматриваются как read-only verification context. Если implementation выявит необходимость менять stream, subject, durable, payload или ack semantics, unit возвращает `blocked`, а Router инициирует расширение change и повторный approval.

### 4. Проверки разделены по сервисам и observability slice

Каждый runtime-владелец реализует и проверяет свой consumer независимо. VK observability/long-poll вынесен в следующий последовательный unit, поскольку он затрагивает другую tightly-coupled зону и другую группу тестов. Live verification выполняется только skill `.claude/skills/api-smoke-test` на поднятых сервисах и реальном NATS; новые `tests/smoke/` не создаются.

## API contract и access matrix

Endpoint changes отсутствуют, поэтому матрица `method | path | access class | roles | expected without auth | expected with auth` неприменима. Дефолтные Public Read/Protected Write контракты остаются без изменений; anonymous/authenticated HTTP-тесты в этот change не добавляются, поскольку HTTP boundary не затронут.

## Data model

Миграции и изменение PostgreSQL отсутствуют. Live-сценарии не должны создавать прикладные записи при idle; для проверки PostgreSQL используется только подтверждение отсутствия побочных эффектов в соответствующих БД.

## Deliverables

| Deliverable | Профиль-владелец | Ownership |
|---|---|---|
| A — Notification idle classification | Backend | `services/notification-service/src/clients/nats/consumers/callback_request.py`, релевантные tests |
| B — VK command idle classification | Backend | `services/vk-service/src/clients/nats/consumers/notification_commands_send_vk.py`, релевантные consumer tests |
| C — VK long-poll observability | Backend | `services/vk-service/src/utils/configure_sentry.py`, observability/long-poll tests |
| D — Live evidence | Quality Gate | verification-only, `docs/reports/**` только через QG synthesis |
| E — Contracts и единый verdict | Quality Gate | OpenSpec/AsyncAPI review и `docs/reports/**` |

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| `065-NOTIFY-1` | Backend | A | notification consumer + `tests/unit/messaging/**` | — | точечный pytest Notification Service |
| `065-VK-NATS-1` | Backend | B | VK NATS consumer + `tests/clients/nats/**` | — | точечный pytest VK consumer |
| `065-VK-OBS-1` | Backend | C | VK Sentry config + observability/long-poll tests | `065-VK-NATS-1` | точечный pytest observability и bot resilience |
| `065-QG-BE` | Quality Gate | E | read-only runtime/tests | все implementation units | service test/lint/type gates |
| `065-QG-FE` | Quality Gate | E | — | — | неприменимо: frontend diff отсутствует |
| `065-QG-CONTRACTS` | Quality Gate | E | read-only specs/AsyncAPI/diff | все implementation units | strict OpenSpec + AsyncAPI validation |
| `065-QG-LIVE` | Quality Gate | D | live verification | `065-QG-BE`, `065-QG-CONTRACTS` | smoke skill, реальные NATS/PostgreSQL |
| `065-QG-SYNTH` | Quality Gate | E | `docs/reports/**` | все применимые QG lanes | единый APPROVED/REWORK report |

### DAG

```text
065-NOTIFY-1 ───────────────┐
                           ├→ 065-QG-BE ───────┐
065-VK-NATS-1 → 065-VK-OBS-1┘                  ├→ 065-QG-LIVE ─┐
                           └→ 065-QG-CONTRACTS ┘               ├→ 065-QG-SYNTH
065-QG-FE (неприменимо) ───────────────────────────────────────┘
```

`065-NOTIFY-1` и `065-VK-NATS-1` независимы и могут выполняться параллельно. `065-VK-OBS-1` идёт после VK NATS unit, чтобы ownership tests не пересекался во времени. После rework повторяются только затронутые lanes и synthesis.

## Test matrix

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где проверяется | Трассировка |
|---|---|---|---|---|---|---|
| `UT-065-N-01` | unit | регрессия/idle | Notification fetch выбрасывает built-in timeout, затем cancellation | timeout не логируется, следующий fetch выполнен, cancellation проброшен | notification messaging tests | nats spec: Notification idle |
| `UT-065-N-02` | unit | happy path после деградации | после timeout приходит message | handler вызван, ack один раз | notification messaging tests | nats spec: message after idle |
| `UT-065-N-03` | unit | внешняя ошибка | connection/protocol error | error path и backoff сохранены | notification messaging tests | nats spec: broker error |
| `UT-065-VN-01` | unit | регрессия/idle | VK command fetch выбрасывает built-in timeout | без log/delivery/ack/nak, следующий fetch | VK consumer tests | nats spec: VK idle |
| `UT-065-VN-02` | unit | happy path после деградации | после timeout приходит command | handler и ack выполняются | VK consumer tests | nats spec: message after idle |
| `UT-065-VN-03` | unit | cancellation/внешняя ошибка | cancel и non-timeout broker error | cancel проброшен; broker error видим и retried | VK consumer tests | nats spec: cancel/broker error |
| `UT-065-VO-01` | unit | регрессия observability | enabled Sentry configuration | `vkbottle` logger зарегистрирован в ignore list вместе с NATS | VK observability tests | observability spec: retry |
| `UT-065-VO-02` | unit | границы фильтра | собственный application logger/exception | не попадает в ignore list, event остаётся доступен | VK observability tests | observability spec: unhandled error |
| `UT-065-VO-03` | unit | long-poll recovery | timeout/network drop, затем event | process loop продолжает работу, event доставлен | VK bot resilience tests | longpoll spec: recovery |
| `UT-065-VO-04` | unit | secrets/контракт | sanitization после новой ignore настройки | credentials/body отфильтрованы без изменения | VK observability tests | observability spec: secrets |
| `IT-065-N-01` | integration | реальный broker | пустой Notification durable дольше fetch timeout, затем callback | consumer остаётся жив и принимает callback | real JetStream integration/live harness | nats spec: Notification idle |
| `IT-065-V-01` | integration | реальный broker | пустой VK durable дольше fetch timeout, затем VK command | consumer остаётся жив и принимает command | real JetStream integration/live harness | nats spec: VK idle |
| `SM-065-01` | smoke | production-like idle | оба поднятых consumer проходят минимум два idle windows | процессы healthy, нет restart/error telemetry | smoke skill на live API/NATS | оба idle scenarios |
| `SM-065-02` | smoke | доставка после idle | безопасные тестовые messages после idle | durable state продвигается, сообщения не теряются | smoke skill на live API/NATS | message after idle |
| `SM-065-03` | smoke | наблюдаемость VK | контролируемый штатный VK retry либо эквивалентный доступный runtime evidence | нет нового GlitchTip issue штатного retry; локальный лог есть | smoke skill + logs/monitoring | VK observability retry |
| `SM-065-04` | smoke | реальные БД/побочные эффекты | сравнить релевантные counts до/после idle-only окна | idle не создаёт notification/VK records | smoke skill + real PostgreSQL | no side effects |
| `CT-065-01` | contract | topology drift | AsyncAPI/runtime validation | stream/subject/durable/payload неизменны | QG-CONTRACTS | immutable messaging contract |

Оси access matrix, validation input, транзакционность/конкурентная запись и HTTP response contract неприменимы: change не меняет endpoint/input и не выполняет запись в idle/retry path. Идемпотентность delivery остаётся существующим контрактом и проверяется только как отсутствие повторной обработки после idle.

## PostgreSQL для smoke-тестов

Discovery 2026-09-03 выполнен через Docker labels, затем fallback по именам, поскольку контейнера с labels `project=eqsitecms, service=db` нет. Повторный `docker inspect` обязателен в `065-QG-LIVE`; приведённые значения являются evidence текущего окружения, не хардкодом:

| Сервис | Контейнер / image | Compose labels | DB/user | Host port | Aliases |
|---|---|---|---|---|---|
| Notification | `eqsitecms-db-notifications` / `postgres:16` | `project=eqsitecms-core`, `service=db-notifications` | `eqsitecmsnotifications` / `eqsitecmsnotifications` | `5434` | `eqsitecms-db-notifications`, `db-notifications` |
| VK | `eqsitecms-db-vk` / `postgres:16` | `project=eqsitecms-vk`, `service=db-vk` | `eqsitecmsvk` / `eqsitecmsvk` | `5436` | `eqsitecms-db-vk`, `db-vk` |

Пароли получены inspect (`POSTGRES_PASSWORD` совпадает с user в текущем локальном окружении), но не должны выводиться в smoke evidence/report. Перед live run параметры перечитываются из `Config.Env` и `NetworkSettings.Ports`.

## Migration Plan

1. Последовательно развернуть Notification и VK runtime fixes после прохождения unit gates.
2. Наблюдать consumer health/restart count и отсутствие новых issue IDs соответствующих сигнатур минимум через два fetch windows.
3. Rollback — вернуть соответствующий service image; schema/data rollback не требуется.
4. После единого `APPROVED` синхронизировать delta specs, повторить strict validation и архивировать change отдельными Router steps.

## Risks / Trade-offs

- [Слишком широкий timeout catch скроет реальный сбой] → ограничить перехват только `fetch()` и точными timeout types; отдельно тестировать protocol error и cancellation.
- [Игнорирование `vkbottle` logger скроет полезную библиотечную ошибку] → application exceptions остаются на собственных logger/error handler; QG проверяет controlled unexpected error.
- [Версия библиотеки изменит тип или logger name] → тестировать фактические установленные зависимости и закрепить contract review при upgrade.
- [Live VK failure трудно безопасно индуцировать] → `SM-065-03` допускает наблюдение естественного controlled retry/evidence; отсутствие воспроизводимого сбоя помечается как ограничение, но unit tests остаются обязательны.

## Open Questions

Открытых продуктовых или API-вопросов нет. Во время apply исполнитель должен подтвердить точное имя logging record `vkbottle`; если фактический bridge использует дочернее имя, выбрать минимальный совместимый logger pattern и зафиксировать решением в handoff.
