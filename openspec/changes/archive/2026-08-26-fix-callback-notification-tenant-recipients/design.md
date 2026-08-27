## Context

Локализованный дефект состоит из двух связанных gaps. Backend сохраняет `CallbackRequest.equestrian_id`, но конструирует `CallbackRequestedData` без него; оба AsyncAPI и DTO также не объявляют tenant UUID. Notification Service затем вызывает `MainBackendClient.get_users(role=["ADMIN", "SUPERUSER"])` без `equestrian_ids`, поэтому role-eligible пользователи выбираются глобально. Заголовок сайта не является надёжным источником авторизации и не должен использоваться notification routing: authoritative tenant уже получен Backend Core через `EquestrianContext`.

Существующий `GET /api/service/users` уже поддерживает AND между `equestrian_ids` и `role`, исключает deleted/blocked users и защищён `X-Service-Key`. Новые endpoint, миграции БД и UI-изменения не нужны. Межсервисный контракт NATS меняется синхронно в Backend Core и Notification Service.

## Goals / Non-Goals

**Goals:**

- Гарантировать tenant isolation получателей callback email.
- Передать authoritative `equestrian_id` в каноническом NATS event.
- Использовать существующий service users filter одновременно с role filter.
- Сохранить fail-closed поведение при malformed event, пустой выборке и downstream errors.
- Доказать регрессию unit/contract/integration и live smoke-тестами.

**Non-Goals:**

- Не менять текст/заголовок письма, notification preferences UX или Email Service.
- Не добавлять endpoint, таблицы, миграции, роли или fallback-группы.
- Не доверять tenant name/code из consumer frontend как identity.
- Не поддерживать silent compatibility со старыми NATS payload без tenant: такой payload небезопасен и должен быть отклонён.

## Decisions

### 1. Источник tenant — `EquestrianContext.id` Backend Core

Producer добавляет `equestrian_id=entity.equestrian_id` (эквивалент проверенного context id) в `CallbackRequestedData`. Это связывает событие с той же tenant-записью, которая была сохранена. Альтернатива — передавать code/header сайта — отклонена: это presentation hint, а не канонический UUID.

### 2. `equestrian_id` обязателен в event contract

Поле становится required UUID в обоих DTO и AsyncAPI. Fail-open/fallback к глобальному списку запрещён. Альтернатива nullable field для rolling compatibility отклонена из-за риска повторить утечку. Deploy выполняется consumer-first в состоянии, готовом принять новое поле, затем producer; до producer switch старые сообщения будут безопасно отклоняться/retry/DLQ.

### 3. Tenant и roles передаются одним service users запросом

Handler вызывает `get_users(equestrian_ids=[tenant_id], role=["ADMIN", "SUPERUSER"])`; Backend Core применяет AND между группами. Затем сохраняется существующее пересечение с `enabled_user_ids` и confirmed emails. Альтернатива — получить глобальных admins и фильтровать локально по DTO — создаёт лишнюю выдачу PII и повышает риск ошибки.

### 4. HTTP access boundary не меняется

`GET /api/service/users` остаётся protected Service Read exception: только `X-Service-Key`, без cookie/tenant selector. Access matrix находится в delta spec. Изменяется call-site, а не endpoint contract. Новых/изменённых HTTP endpoints нет.

### 5. Разделённый ownership и порядок

1. Backend owner: producer DTO, callback create event, Backend AsyncAPI и связанные tests.
2. Notification owner после producer-контракта: consumer DTO/AsyncAPI, handler/client call и tests. Эти зоны не пересекаются по файлам.
3. Один общий Quality Gate проверяет оба diff, синхронность contracts, unit suites, live NATS/API smoke и evidence report в `docs/reports`.
4. Findings возвращаются соответствующему owner; после повторного успешного gate Router выполняет spec sync, strict validation и archive.

## Backend test plan

### Unit-тесты backend-фичи tenant-scoped callback routing

Ниже 30 разных сценариев, распределённых между Backend Core и Notification Service: producer schema/publish, consumer validation, filter composition, access и fail-closed routing.

| ID | Сценарий |
|---|---|
| UT-01 | Callback create переносит точный `EquestrianContext.id` в event DTO |
| UT-02 | Event tenant совпадает с `equestrian_id` сохранённой entity |
| UT-03 | Producer DTO принимает валидный UUID tenant |
| UT-04 | Producer DTO отклоняет отсутствующий tenant |
| UT-05 | Producer DTO отклоняет malformed tenant |
| UT-06 | Producer serialization включает `equestrian_id` строкой UUID |
| UT-07 | Backend AsyncAPI требует `equestrian_id` |
| UT-08 | Backend AsyncAPI задаёт UUID format и additionalProperties false |
| UT-09 | Consumer DTO принимает producer payload с tenant |
| UT-10 | Consumer DTO отклоняет payload без tenant |
| UT-11 | Consumer DTO отклоняет malformed tenant |
| UT-12 | Notification AsyncAPI совпадает с producer required fields |
| UT-13 | Handler передаёт `equestrian_ids=[tenant]` в `get_users` |
| UT-14 | Handler одновременно передаёт роли ADMIN и SUPERUSER |
| UT-15 | Пользователь tenant A с ADMIN и enabled setting выбран |
| UT-16 | Пользователь tenant A с SUPERUSER и enabled setting выбран |
| UT-17 | Пользователь tenant B с ролью и enabled setting исключён upstream filter contract |
| UT-18 | Eligible, но disabled пользователь исключён пересечением |
| UT-19 | Enabled, но без допустимой роли пользователь исключён |
| UT-20 | Blocked/deleted пользователь отсутствует в service users response |
| UT-21 | Неподтверждённый email исключён |
| UT-22 | Email с foreign user_id исключён даже при ошибочном downstream ответе |
| UT-23 | Пустой tenant-scoped users result не вызывает email lookup |
| UT-24 | Пустое пересечение settings/users не вызывает email lookup |
| UT-25 | Backend client timeout подавляет notification fail-closed |
| UT-26 | Backend client HTTP error не вызывает unscoped retry/fallback |
| UT-27 | Email client error подавляет notification fail-closed |
| UT-28 | Unsupported channel не выполняет users/email lookup |
| UT-29 | Tenant/callback UUID отсутствуют в subject/body |
| UT-30 | Повторная обработка одинакового event сохраняет тот же tenant filter и idempotency boundary |

### Smoke-тесты backend-фичи tenant-scoped callback routing

Smoke выполняются только skill `smoke` на живом API/NATS и реальной PostgreSQL, не pytest-файлами.

| ID | Запрос/действие | Проверка |
|---|---|---|
| SM-01 | Создать tenant A callback через public POST | row в PostgreSQL имеет tenant A |
| SM-02 | Создать tenant B callback | row имеет tenant B, данные не смешаны |
| SM-03 | Public POST tenant A без cookie | `201` по текущему exception contract |
| SM-04 | Public POST без tenant selector | `401`, event не опубликован |
| SM-05 | Public POST с invalid selector | `401`, event не опубликован |
| SM-06 | Service users без key | `401` |
| SM-07 | Service users с invalid key | `401` |
| SM-08 | Service users только с cookie | `401` |
| SM-09 | Service users только с tenant selector | `401` |
| SM-10 | Service users valid key + tenant A + roles | `200`, только A admins |
| SM-11 | Аналогичный запрос tenant B | `200`, только B admins |
| SM-12 | Tenant A без eligible roles | `200`, empty, без fallback |
| SM-13 | Tenant A с ADMIN | ADMIN присутствует |
| SM-14 | Tenant A с SUPERUSER | SUPERUSER присутствует |
| SM-15 | Tenant A user другой роли | отсутствует |
| SM-16 | Blocked ADMIN tenant A | отсутствует |
| SM-17 | Soft-deleted ADMIN tenant A | отсутствует |
| SM-18 | Комбинация tenant+roles | AND между группами, OR внутри roles |
| SM-19 | Pagination limit/offset scoped query | items/total не включают tenant B |
| SM-20 | NATS event tenant A | payload содержит точный UUID A |
| SM-21 | NATS event tenant B | payload содержит точный UUID B |
| SM-22 | Publish malformed event без tenant | email command отсутствует, retry/DLQ observable |
| SM-23 | Publish event с malformed tenant | email command отсутствует |
| SM-24 | Tenant A ADMIN enabled + confirmed email | command адресован A |
| SM-25 | Tenant B ADMIN enabled + confirmed email при event A | адрес B отсутствует |
| SM-26 | Tenant A ADMIN disabled notification | command для него отсутствует |
| SM-27 | Tenant A ADMIN с unapproved email | адрес отсутствует |
| SM-28 | Нет scoped recipients | delivery flag остаётся false |
| SM-29 | Успешная scoped email command | delivery flag становится true |
| SM-30 | Повторная доставка NATS event | нет cross-tenant адресов, idempotency сохраняется |

### PostgreSQL для smoke-тестов

Поиск по требуемым labels `project=eqsitecms, service=db` не дал результата, потому что актуальный compose project называется `eqsitecms-core`; fallback нашёл `eqsitecms-db` (`7c720ddc783d`, image `postgres:16`). `docker inspect` на 2026-08-25: `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`, host port `5433`, network aliases `eqsitecms-db`, `db`, labels `project=eqsitecms-core`, `service=db`. Smoke runner MUST повторить discovery/inspect непосредственно перед запуском и использовать фактически найденные значения, не хардкодить этот snapshot.

Переменные smoke: `BASE_URL`, `NOTIFICATION_BASE_URL`, `NATS_URL`, `SERVICE_KEY`, `TENANT_A_SELECTOR`, `TENANT_B_SELECTOR`, `TENANT_A_ID`, `TENANT_B_ID`, `USER_A_ADMIN_ID`, `USER_B_ADMIN_ID`, DB-параметры из inspect.

## Risks / Trade-offs

- [Старые queued payload не содержат tenant] → consumer отклоняет их fail-closed; перед rollout очистить/дождаться backlog или принять DLQ evidence.
- [Несинхронный deploy DTO/AsyncAPI] → consumer-compatible deploy первым, contract comparison в gate, затем producer.
- [Пагинация default=100 может пропустить enabled admins крупного tenant] → текущий bugfix сохраняет контракт; Quality Gate фиксирует риск. При фактических tenant >100 нужен отдельный change с page traversal.
- [Handler получает raw dict] → schema validation должна завершаться до handler; unit tests отдельно доказывают отсутствие fallback для missing/malformed tenant.
- [PII в event/logs] → tenant UUID используется только для routing; subject/body не содержат UUID, logs не должны включать applicant PII сверх существующей policy.

## Migration Plan

1. Применить consumer DTO/handler/AsyncAPI и тесты Notification Service, готовые принимать tenant field.
2. Проверить backlog subject; старые сообщения без tenant безопасно завершить через retry/DLQ, не рассылать глобально.
3. Применить Backend producer DTO/create/AsyncAPI.
4. Запустить unit/contract suites и live smoke с двумя tenant на реальной PostgreSQL/NATS.
5. Rollback: остановить producer callback events и откатить оба сервиса согласованно; не возвращать глобальный recipient fallback. При частичном rollback уведомления могут быть подавлены, но не cross-tenant.

## Open Questions

Открытых продуктовых вопросов нет. Принято безопасное решение: старые сообщения без `equestrian_id` не доставлять. Операционный вопрос перед apply — проверить размер backlog `events.site.callback.requested`; он не меняет контракт и может быть решён исполнителем/Quality Gate.
