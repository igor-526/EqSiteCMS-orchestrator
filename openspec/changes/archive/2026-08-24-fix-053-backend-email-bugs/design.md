## Context

Тикет: `053_bugs`. Дата: 2026-08-24. Источники evidence: `docs/bugs/053_main_backend.json` и `docs/bugs/053_email_service.json`.

В `services/backend` `HorseService.create_horse()` строит `Horse`, чей slug генерируется из имени, и сразу вызывает общий repository `create`. Уникальный индекс `ix_horse_equestrian_slug` защищает пару `(equestrian_id, slug)`, но предварительного разрешения коллизии и доменного маппинга race-condition сейчас нет. Поэтому повторное имя `Норманн` в одном tenant приводит к необработанному `IntegrityError` и HTTP 500.

В `services/email-service` pull consumer вызывает `subscription.fetch(batch=10, timeout=5)`. Отчёт показывает штатный `TimeoutError` при пустой очереди, зарегистрированный через ветку `logger.exception("Failed to fetch NATS messages")`. Текущий код импортирует `TimeoutError` из `nats.errors`; runtime-библиотека может поднимать built-in/asyncio timeout, поэтому классификация должна опираться на фактические типы исключений поддерживаемой версии `nats-py`, а tests должны фиксировать обе совместимые формы.

Изменение межсервисное, но ownership непересекающийся. Контракты NATS topology и payload остаются прежними. OpenSpec change — единственный изменяемый план; `docs/plans` не меняется.

## Goals / Non-Goals

**Goals:**

- не допускать HTTP 500 при повторном автоматически сгенерированном horse slug в одном tenant;
- выдавать стабильные slug `base`, `base-1`, `base-2`, … с соблюдением максимальной длины;
- сохранить tenant isolation и обработать конкурентную коллизию как контролируемый клиентский исход, не скрывая другие DB errors;
- считать пустой pull-fetch штатным idle-состоянием без error-log/Sentry noise;
- сохранить cancellation propagation, retry/backoff для реальных broker errors и ack/nak semantics сообщений;
- доказать обе регрессии unit-тестами и smoke skill на живых PostgreSQL/NATS.

**Non-Goals:**

- изменение horse API path, DTO, auth/scopes, схемы БД или уникального индекса;
- изменение NATS stream/subject/durable/payload/headers или AsyncAPI topology;
- изменение retry/DLQ политики обработки poison message;
- frontend/site-ad изменения;
- подавление всех `TimeoutError` вне pull-fetch операции.

## Decisions

### 1. Slug разрешается в horse domain service через узкий repository protocol

В `HorseRepositoryProtocol` добавляется tenant-scoped проверка занятости slug либо переиспользуется эквивалентный уже существующий нейтральный метод. `HorseService` нормализует базовый slug тем же доменным механизмом, что `Horse`, проверяет `base`, затем последовательно добавляет `-N`, обрезая базу так, чтобы итог не превышал фактический лимит поля. Выбран сервисный слой, потому что политика именования является use-case правилом; SQL и уникальный индекс остаются в repository/model.

Альтернатива — ловить любой `IntegrityError` в общем repository — отклонена: она смешивает разные constraints и может превратить реальные DB defects в ложную slug-коллизию. Альтернатива — вернуть `400` на любую заранее найденную коллизию — отклонена, поскольку auto-generated slug уже является производным идентификатором и может быть безопасно суффиксирован.

### 2. Race-condition закрывается узким маппингом конкретного unique constraint

Предварительная проверка нужна для обычного детерминированного пути, но не устраняет гонку. На insert реализация должна распознать только constraint `ix_horse_equestrian_slug`, откатить/восстановить корректное состояние транзакции в рамках существующего session boundary и либо выполнить ограниченное повторение с новым суффиксом, если это безопасно в текущем repository/UoW, либо вернуть `ClientError`/HTTP 400 с понятным сообщением о конфликте. Любой другой `IntegrityError` пробрасывается как инфраструктурная ошибка.

Предпочтение отдаётся ограниченному retry в той же use-case операции, если repository предоставляет безопасную savepoint/flush границу; иначе согласованный `400` лучше скрытого повторного commit. Бесконечный retry запрещён.

### 3. Idle timeout email consumer классифицируется отдельно от broker failure

Вокруг единственного `fetch()` consumer перехватывает фактический набор timeout-классов, используемых поддерживаемой версией `nats-py` (`nats.errors.TimeoutError` и совместимый built-in/asyncio timeout, если они различны), и немедленно продолжает цикл без error/warning log и без sleep. `asyncio.CancelledError` продолжает пробрасываться. Другие исключения логируются один раз на попытку, затем применяется существующий backoff.

Альтернатива — увеличить timeout — не устраняет ложную классификацию. Альтернатива — подавить все `Exception` — отклонена, поскольку скроет потерю соединения и ошибки broker.

### 4. NATS contract остаётся неизменным

Исполнитель сверяет `services/backend/docs/asyncapi.yaml`, `services/email-service/docs/asyncapi.yaml`, runtime settings и `agents/howto/nats-jetstream-protocols.md`. Если для исправления потребуется изменить subject, stream, durable, headers или payload, он останавливается: это расширение scope требует delta spec и нового approval. AsyncAPI файлы не получают механических правок без contract diff.

### 5. Access matrix

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `POST` | `/api/horses` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401`; missing/invalid tenant selector также `401`; запись не создаётся | `200` с разрешённым scope и валидным selector; `403` без scope; foreign/invalid selector `401`; ожидаемая бизнес-валидация `400`; duplicate generated slug разрешается суффиксом без `500` |

Исключений из default policy нет. Email NATS consumer не является HTTP endpoint. Существующие Public Read `GET /api/horses*` не меняются и проверяются на отсутствие регрессии.

### 6. PostgreSQL и live smoke environment

Поиск сначала выполнен по обязательным labels `com.docker.compose.project=eqsitecms` + `service=db`; результатов нет, потому что текущий compose project называется `eqsitecms-core`. Fallback нашёл контейнеры по именам/image, после чего параметры получены через `docker inspect`:

| Назначение | container/id | image | compose labels | aliases | DB/user/password | host port |
|---|---|---|---|---|---|---|
| main backend | `eqsitecms-db` / `7c720ddc783d` | `postgres:16` | project=`eqsitecms-core`, service=`db` | `eqsitecms-db`, `db` | `eqsitecms` / `eqsitecms` / `eqsitecms` | `5433` |
| email service | `eqsitecms-db-email` / `4e0c9823ee32` | `postgres:16` | project=`eqsitecms-core`, service=`db-email` | `eqsitecms-db-email`, `db-email` | `eqsitecmsemail` / `eqsitecmsemail` / `eqsitecmsemail` | `5435` |

Перед smoke Quality Gate обязан повторить discovery/inspect и использовать актуальные значения. Пароли приведены только как evidence текущего локального inspect, не становятся hardcoded test configuration. Email timeout fix сам не пишет в БД, но end-to-end acceptance использует реальную email PostgreSQL для проверки отсутствия побочных/дублирующих email-log записей.

### 7. Ownership и порядок

1. Backend owner: только `services/backend/src/core/{services,protocols}`, `services/backend/src/repositories` и соответствующие backend tests. Завершённый deliverable — уникальный horse slug без 500 и зелёные `make format/test/lint`.
2. Email owner: только `services/email-service/src/clients/nats/consumers` и соответствующие email tests. Он начинает после фиксации неизменности NATS contract; завершённый deliverable — idle timeout без error telemetry и зелёные `make format/test/lint`.
3. Один общий Quality Gate после обоих owners: review diff, unit suites, live smoke skill, AsyncAPI validation, access checks. Findings возвращаются владельцу соответствующей зоны, затем общий gate повторяется.
4. После PASS Router синхронизирует delta specs в main specs, повторяет strict validation и только затем архивирует change.

## Risks / Trade-offs

- [TOCTOU между exists-check и insert] → конкретный constraint распознаётся отдельно, retry ограничен и проверяется конкурентным PostgreSQL scenario.
- [Slug suffix может превысить длину] → базовая часть обрезается с учётом `-N`, включая многозначный suffix.
- [Неверное распознавание IntegrityError] → проверяется имя constraint; остальные constraints не преобразуются.
- [Слишком широкий catch timeout скроет реальный сбой] → перехват ограничен `fetch()` и только известными timeout types; connection/protocol errors остаются error-log + backoff.
- [Busy loop на пустой очереди] → fetch сам ждёт настроенный timeout; дополнительный sleep для штатного idle не нужен, cadence подтверждается тестом.
- [Исторический Sentry report уже частично исправлен текущим кодом] → acceptance основан на воспроизводимом runtime type и тестах, а не на предположении по одной строке source context.
- [Smoke требует живой NATS/сервисы] → отсутствие инфраструктуры считается BLOCKED/FAIL, не PASS и не заменяется mocks.

## Migration Plan

1. Применить backend deliverable и его unit/integration tests; миграций БД нет.
2. Применить email deliverable и его unit tests; topology/AsyncAPI не менять.
3. Выполнить сервисные format/test/lint и общий Quality Gate.
4. На живом окружении создать две одноимённые лошади в одном tenant и проверить разные slug/отсутствие 500; выдержать пустую email queue несколько fetch windows и проверить отсутствие error event; затем опубликовать валидную команду и проверить обработку.
5. Rollback — откат двух path-scoped code deliverables; схема данных и брокер не требуют rollback.

## Open Questions

- Требуется подтвердить пользовательским approval выбранное клиентское поведение для редкой конкурентной коллизии: ограниченный auto-retry предпочтителен, а если текущая UoW не позволяет безопасный retry — явный HTTP 400 вместо HTTP 500.
- Нужен ли продуктовый предел количества suffix attempts ниже технического лимита? В proposal принято ограниченное детерминированное сканирование/retry без изменения API; конкретный безопасный предел исполнитель фиксирует тестом и не должен создавать бесконечный цикл.
