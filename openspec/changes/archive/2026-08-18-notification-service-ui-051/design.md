## Context

Ticket `051_notification_service_ui`, дата планирования 2026-08-18. Затронуты CMS `services/frontend`, основной API gateway `services/backend` и приватный `services/notification-service`; `services/email-service` остаётся исполнительным сервисом, `services/site-*` не меняются.

Сейчас backend проксирует создание/изменение/удаление email и public confirmation flow, но не умеет прочитать email текущего пользователя. В notification-service уже есть таблицы каналов, событий и `user_notification_settings`, однако REST API настроек отсутствует, а callback handler получает всех администраторов и игнорирует таблицу настроек. Канонические NATS subjects `events.site.callback.requested` и `commands.notification.email.send` менять не требуется.

## Goals / Non-Goals

**Goals:**

- дать каждому authenticated CMS user единый раздел управления email и доступными ему уведомлениями;
- оставить email-service и notification-service недоступными браузеру: цепочка UI → main backend → private service;
- обеспечить owner-only семантику и не раскрывать чужие настройки;
- применять сохранённое состояние при реальном callback-flow до acceptance email-service;
- доказать контракт frontend tests, не менее чем 30 backend unit и 30 live smoke сценариями, а также прохождением callback до acceptance email-service на заданных тестовых адресах; доступ к фактическим почтовым ящикам не требуется.

**Non-Goals:**

- история уведомлений, SMS/VK UI, массовое администрирование чужих настроек;
- изменение NATS subjects/payload, публичного consumer UI или создание нового notification DB schema;
- автоматическое включение callback для существующих пользователей: безопасный default — `enabled=false`.
- внедрение service token или mTLS между private services: для этого change сохраняется существующая network-isolation модель.

## Decisions

### 1. Один публичный gateway

Frontend вызывает только `/api/emails/*` и `/api/notification-settings`; backend проверяет session/owner/scopes и обращается к private services. Прямые URL микросервисов в frontend запрещены. Альтернатива — browser → microservice — отклонена из-за production network boundary.

### 2. Owner derived from session

Новые read/settings endpoint’ы не принимают `user_id` от браузера: backend выводит его из `actor.id`. Это устраняет обычный foreign-resource vector. Существующие create/update/delete email сохраняют точную owner-проверку без role override.

### 3. API и role eligibility

`GET /api/emails/me` — защищённое исключение из default Public Read, потому что email и confirmation state являются персональными данными. Возвращает `200 EmailResponse` либо `404`.

`GET /api/notification-settings` — защищённое исключение: отдаёт только каталог событий, разрешённых scopes текущего пользователя, и его enabled state. Для `callback/email` eligibility фиксируется как `SUPERUSER` или `ADMIN`; пользователь без этих scopes видит пустой список, но сам раздел доступен. `PATCH /api/notification-settings/{event_code}/{channel_code}` — Protected Write, body `{enabled: boolean}`, owner берётся из session; ineligible scope получает `403`, неизвестная/неактивная комбинация — `404`.

Backend вызывает private notification-service `GET /internal/notification-settings/{user_id}` и `PUT /internal/notification-settings/{user_id}/{event_code}/{channel_code}`. Эти routes не публикуются наружу; `PUT` здесь является идемпотентным internal upsert/delete и принимает trusted identity от gateway. Альтернатива — хранить настройки в main backend — отклонена, потому что authoritative таблица уже принадлежит notification-service.

### 4. Recipient selection

Callback orchestrator сначала получает eligible ADMIN/SUPERUSER IDs из main backend, затем пересекает их с user IDs, у которых есть запись `callback/email`, и только после этого запрашивает подтверждённые email. Пустое пересечение завершает обработку без email command. Это сохраняет актуальную role-проверку даже после отзыва роли. Ошибка downstream логируется и не приводит к отправке более широкому списку (fail closed).

### 5. UI composition и mutation state

Route shell `/notifications` рендерит feature container по цепочке `page → ui → hook → service → src/api`. Вкладка «История» показывает заглушку. «Настройки» содержит email card и event checkbox. Checkbox, кнопки и modal submit блокируются на время запроса; checked state меняется только после успешного ответа, при ошибке остаётся прежним. Email create показывается при отсутствии адреса; change/delete — только при наличии; неподтверждённый адрес красный. После create/change пользователь получает предупреждение о повторном подтверждении и может запросить письмо. После успешных mutations queries/refetch синхронизируют UI.

### 6. Access matrix

| method | path | access class | roles | without auth | with auth | foreign resource |
|---|---|---|---|---|---|---|
| GET | `/api/emails/me` | Protected Sensitive Read (исключение) | authenticated owner | `401` | `200`/`404` | не адресуем, owner из session |
| POST | `/api/emails` | Protected Write | authenticated owner | `401` | `201`/domain error | `403`, no override |
| PATCH | `/api/emails` | Protected Write | authenticated owner | `401` | `200`/domain error | `403`, no override |
| DELETE | `/api/emails/{user_id}` | Protected Write | authenticated owner | `401` | `204`/`404` | `403`, no override |
| POST | `/api/emails/send-confirmation` | Public Write exception | anonymous/authenticated control flow | `202`/domain error | тот же контракт | N/A |
| PATCH | `/api/emails/confirm` | Public Write exception | anonymous/authenticated control flow | `200`/domain error | тот же контракт | N/A |
| GET | `/api/notification-settings` | Protected Sensitive Read (исключение) | authenticated; event filtered by scope | `401` | `200`, возможно `[]` | не адресуем, owner из session |
| PATCH | `/api/notification-settings/{event}/{channel}` | Protected Write | authenticated + event scope | `401` | `200`; ineligible `403`; unknown `404` | не адресуем, owner из session |

Public confirmation writes остаются исключениями, потому что link/control flow работает вне CMS session. Оба protected GET являются исключениями, потому что раскрывают PII/персональные предпочтения и не нужны consumer sites.

### 7. Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| protected layout/sidebar/route | пункт доступен всем logged-in, route blocked anonymous | layout/component + route smoke | anonymous redirect; authenticated any scope render | `npm test`, `npm run build` |
| email API/service/hook | load/create/change/delete/resend, state/error mapping | unit + API-boundary mocks: success, empty/404, validation, generic, 401, 403 | owner; foreign denial surfaced | `npm test`, `npx tsc --noEmit` |
| email card/modals | 3 states, conditional actions, validation, double-submit guard, refresh | не менее 5 component tests на modal + state cases | protected writes; 401/403 visible | `npm test` |
| notification settings API/hook | eligible catalog, empty list, mutation only after success | unit/API-boundary success, empty, generic, 401, 403 | scope present/missing | `npm test`, `npm run lint` |
| event checkbox | pending guard, success commit, failure rollback/no optimistic state | component tests: data/loading/empty/error/interaction/permission | ADMIN/SUPERUSER vs missing scope | `npm test` |
| `/notifications` tabs | history placeholder/settings composition | page component + 1 happy flow smoke/e2e | authenticated render | `npm test`, `npm run build` |
| architecture | no raw calls outside API, no `site-*` mixing | required `rg`/directory checks | CMS only | commands from tasks |

Unit/component/API-boundary tests MUST use mocks/MSW and MUST NOT call live backend. Список/таблица и pagination отсутствуют, поэтому `limit/offset` не применимы.

### 8. Backend unit test plan (30 сценариев)

| ID | Сценарий |
|---|---|
| U-01 | anonymous `GET /api/emails/me` → 401 без downstream |
| U-02 | owner email найден → 200 schema |
| U-03 | owner email отсутствует → 404 |
| U-04 | malformed downstream email response → 502 |
| U-05 | email-service timeout → 502 |
| U-06 | anonymous settings GET → 401 |
| U-07 | ADMIN видит callback/email disabled |
| U-08 | SUPERUSER видит callback/email |
| U-09 | DEVELOPER без ADMIN/SUPERUSER получает пустой catalog |
| U-10 | USER_MANAGER получает пустой catalog |
| U-11 | несколько scopes с ADMIN дают одну запись без дубля |
| U-12 | inactive event исключается |
| U-13 | inactive channel исключается |
| U-14 | неизвестное upstream event schema → 502 fail closed |
| U-15 | notification-service timeout → 502 |
| U-16 | anonymous PATCH setting → 401 |
| U-17 | ADMIN enable создаёт setting и возвращает enabled=true |
| U-18 | SUPERUSER disable удаляет setting и возвращает false |
| U-19 | повторный enable идемпотентен |
| U-20 | повторный disable идемпотентен |
| U-21 | missing scope PATCH → 403 без downstream write |
| U-22 | unknown event → 404 |
| U-23 | unknown channel → 404 |
| U-24 | invalid enabled body → 400 без downstream |
| U-25 | foreign user_id невозможно передать public schema |
| U-26 | repository concurrent enable не создаёт duplicate |
| U-27 | repository disable удаляет только owner/event/channel tuple |
| U-28 | orchestrator пересекает eligible IDs с enabled IDs |
| U-29 | orchestrator отбрасывает неподтверждённый email |
| U-30 | orchestrator при downstream failure не публикует email command |
| U-31 | orchestrator при пустом intersection не публикует command |
| U-32 | callback payload/NATS headers сохраняют canonical contract |

### 9. Live smoke plan (30 сценариев)

Все сценарии выполняются smoke skill против поднятых сервисов и реальной PostgreSQL, не pytest-файлами. Переменные: `BASE_URL`, `NOTIFICATION_INTERNAL_URL`, `ADMIN_COOKIE`, `SUPERUSER_COOKIE`, `DEVELOPER_COOKIE`, `USER_MANAGER_COOKIE`, `OWNER_ID`, `FOREIGN_ID`, `CALLBACK_EVENT=callback`, `CHANNEL=email`. Фактический inbox не проверяется: успешной доставкой считается подтверждённое прохождение команды через callback/NATS/notification-service до acceptance email-service по correlation/log evidence. Для valid confirmation строка/токен извлекается из разрешённого тестового источника (тестовая PostgreSQL либо service log), сохраняется только в изолированном временном evidence с маскированием в отчёте и немедленно передаётся в confirm-запрос; секрет не коммитится и удаляется после flow.

| ID | Запрос/flow | Проверка |
|---|---|---|
| SM-01 | anonymous GET email/me | 401 |
| SM-02 | owner без email GET | 404 |
| SM-03 | owner create email | 201 |
| SM-04 | owner GET email/me | 200 и тот же address |
| SM-05 | foreign create | 403 |
| SM-06 | owner change email | approved=false |
| SM-07 | foreign change | 403 |
| SM-08 | anonymous send-confirmation | 202/domain contract |
| SM-09 | confirmation invalid code | documented 4xx |
| SM-10 | получить строку/токен confirmation из разрешённого тестового источника и сразу вызвать confirm | 200 approved=true; в отчёте токен замаскирован, временное значение очищено |
| SM-11 | reused confirmation link | 409 |
| SM-12 | expired confirmation link | 410 |
| SM-13 | anonymous settings GET | 401 |
| SM-14 | ADMIN settings GET | callback/email present |
| SM-15 | SUPERUSER settings GET | callback/email present |
| SM-16 | DEVELOPER settings GET | empty |
| SM-17 | USER_MANAGER settings GET | empty |
| SM-18 | ADMIN enable callback/email | 200 enabled=true |
| SM-19 | repeated enable | 200, одна DB row |
| SM-20 | ADMIN disable | 200 enabled=false |
| SM-21 | repeated disable | 200, zero rows |
| SM-22 | ineligible PATCH | 403 и DB unchanged |
| SM-23 | unknown event PATCH | 404 |
| SM-24 | unknown channel PATCH | 404 |
| SM-25 | malformed body PATCH | 400 |
| SM-26 | enabled + confirmed callback request | acceptance email-service для единственной команды подтверждён correlation/log evidence; inbox не проверяется |
| SM-27 | disabled callback request | email command/acceptance отсутствуют |
| SM-28 | enabled + unconfirmed email | email command/acceptance отсутствуют |
| SM-29 | enabled, затем role revoked | email command/acceptance отсутствуют |
| SM-30 | два enabled eligible recipients | email-service принимает по одной команде для каждого адресата; inbox не проверяется |
| SM-31 | callback duplicate/idempotency replay | нет неожиданной повторной доставки по действующему contract |
| SM-32 | owner delete email и GET | 204 затем 404, setting не раскрывает PII |

### 10. PostgreSQL для smoke

Поиск по требуемому label `com.docker.compose.project=eqsitecms` не дал результата; fallback нашёл `eqsitecms-db`. `docker inspect eqsitecms-db` на 2026-08-18: container `eqsitecms-db` (runtime ID начинается `7c720ddc783d`), image `postgres:16`, compose project `eqsitecms-core`, service `db`, aliases `eqsitecms-db`,`db`, host port `5433`, `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, password получен из `Config.Env`. Исполнитель MUST повторить discovery/inspect перед smoke и не переносить credential в отчёт/репозиторий.

## Risks / Trade-offs

- [Role mapping должен оставаться точным] → пользователь подтвердил окончательный контракт `callback = ADMIN|SUPERUSER`; `DEVELOPER` и `USER_MANAGER` исключены, таблица eligibility централизуется в backend.
- [Настройки уже отсутствуют у текущих администраторов] → default off исключает нежелательную рассылку; QA явно включает enable перед delivery.
- [Два legacy callback processing path] → исполнитель обязан определить реально wired path и устранить/синхронизировать дублирование в пределах notification ownership.
- [Internal REST без peer credential опирается на network isolation] → не публиковать port/routes наружу и добавить compose/static evidence; service token/mTLS явно не требуются и остаются вне scope.
- [Фактический inbox не проверяется] → считать delivery успешной только по коррелированному прохождению callback/NATS/notification-service и acceptance email-service, а не по одному HTTP 202; сохранять correlation IDs и минимально необходимые маскированные logs.
- [Confirmation token является чувствительным тестовым значением] → извлекать только из разрешённой тестовой PostgreSQL/service log, не печатать целиком, немедленно использовать, затем очищать временный файл/переменную и изолировать тестовые записи.

## Migration Plan

1. Реализовать notification-service internal settings API и recipient filtering без изменения NATS schema.
2. Реализовать backend gateway и access inventory; прогнать unit tests.
3. Реализовать CMS UI и mock-based tests.
4. Повторно обнаружить PostgreSQL, применить существующие migrations, пересоздать/restart email container с актуальным `.env`, поднять core stack.
5. Прогнать live smoke и ручной UI QA на трёх заданных адресах; проверить email-service acceptance без inbox, выполнить немедленный confirm по сохранённой тестовой строке/токену и сохранить маскированное evidence в `docs/reports`.
6. Общий Quality Gate; findings возвращаются владельцам. После pass Router синхронизирует delta specs, валидирует и архивирует change.

Rollback: откатить UI/backend/notification runtime changes совместно; NATS и DB schema не меняются. Созданные settings rows можно оставить неиспользуемыми либо удалить точечно после evidence/backup.

## Open Questions

Открытых вопросов нет: eligibility окончательно ограничена `ADMIN|SUPERUSER`, проверка inbox не требуется, confirmation выполняется немедленно по безопасно полученному тестовому токену, а service token/mTLS не входят в scope.
