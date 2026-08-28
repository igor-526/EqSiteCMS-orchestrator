## Context

Backend Core уже публикует tenant-scoped `events.site.callback.requested`. Notification Service пересекает роли `ADMIN`/`SUPERUSER`, настройки `callback/email` и подтверждённые email, публикует `commands.notification.email.send` и после PubAck ставит общий флаг заявки `notifications_delivered=true`. Канал `vk` уже seeded и доступен через существующие notification settings, но handler возвращает `None`; publisher и AsyncAPI для VK отсутствуют.

VK Service уже владеет привязками `PENDING/ACTIVE/BLOCKED`, soft-delete, `vk_peer_id`, клиентом `VkbottleMessenger.send_message`, PostgreSQL и NATS client. Subject и durable зарезервированы в settings, но consumer намеренно не активирован, `docs/asyncapi.yaml` отсутствует. Таблица `vk_logs` имеет уникальный `event_uuid` и используется общим audit-контуром, поэтому она не подходит как единственный ledger доставки нескольким адресатам.

Изменение не создаёт HTTP endpoints. Оно меняет messaging-контракт и два backend-сервиса. Профиль admin, упомянутый во входной задаче, используется только как live fixture: идентификаторы и VK token не фиксируются в change/evidence.

## Goals / Non-Goals

**Goals:**

- Доставлять callback-уведомление в VK только текущим `ADMIN`/`SUPERUSER` той же конюшни, включившим `callback/vk` и имеющим ACTIVE, не удалённую VK-привязку.
- Сохранить независимость email/VK preferences: отключение одного канала не блокирует другой.
- Добавить строгий AsyncAPI producer/consumer contract, durable pull consumer и retry-safe per-recipient idempotency.
- Сохранить текущую семантику callback delivery flag: достаточно PubAck хотя бы одной email/VK command; receipt внешнего провайдера не ожидается.
- Доказать tenant isolation, roles, preferences, binding states, retries и реальную доставку live smoke-тестами.
- Закрыть оставшиеся smoke-сценарии безопасной детерминированной failure injection без остановки общих сервисов, вызова реального VK для synthetic recipients и изменения deploy-контура.

**Non-Goals:**

- Не менять UI, HTTP endpoint surface, роли, callback event producer или Email Service.
- Не добавлять массовые рассылки, вложения, клавиатуры, шаблонизатор или пользовательские ответы боту.
- Не считать общий callback-флаг подтверждением чтения либо гарантированной доставки каждого канала.
- Не включать VK Service в core release/Helm rollout и не исправлять существующий deploy-техдолг.
- Не добавлять runtime/admin/test HTTP endpoints, постоянно работающий control plane, production feature flag или общий NATS fault proxy.

## Decisions

### 1. Notification Service остаётся владельцем recipient eligibility и channel preferences

Для каждого активного канала handler получает отдельный `enabled_user_ids`. Для `vk` он делает тот же tenant+role lookup `get_users(equestrian_ids=[tenant], role=[ADMIN,SUPERUSER])`, пересекает IDs с `callback/vk` и публикует только UUID получателей. VK Service отвечает исключительно за состояние привязки и доставку.

Альтернатива — передать всех пользователей tenant в VK Service и проверять роли/preferences там — отклонена: это дублирует бизнес-правила, расширяет PII boundary и требует доступа VK Service к Notification DB.

### 2. VK command содержит IDs, текст и устойчивую correlation identity

Payload `NotificationVkCommand` содержит `occurred_at`, `event_uuid`, `callback_request_id`, непустой уникальный `user_ids` и непустой plain-text `text`; `additionalProperties: false`. `Nats-Msg-Id` равен `callback_request_id`, как в email path, subject — `commands.notification.vk.send`, stream — существующий `NOTIFICATION_COMMANDS`.

Текст включает имя, телефон и комментарий с безопасными fallback-значениями, но не содержит callback/tenant/user UUID. HTML не используется. Один command на callback объединяет получателей канала; VK consumer разворачивает её в per-recipient delivery.

Альтернатива — отдельная NATS command на каждого пользователя — отклонена из-за лишнего fan-out и усложнения общей PubAck-семантики. Альтернатива — передавать `vk_peer_id` — нарушает ownership привязок VK Service.

### 3. Отдельный publisher protocol и типизированный channel result

Notification orchestrator получает независимые email/VK publisher protocols; handler возвращает discriminated channel command либо узкий типизированный результат, а не общий `dict`. `_process_channel` dispatch-ит по `channel.code`; неизвестный/sms канал остаётся fail-closed без публикации. Ошибка одного канала логируется и не отменяет уже успешный PubAck другого, но NATS handler обязан не подтверждать исходное событие при неожиданной retryable ошибке до согласованного завершения обработки.

Альтернатива — расширить email DTO полями VK — отклонена как смешение контрактов.

### 4. Callback delivery flag сохраняет command-acceptance semantics

После успешного PubAck хотя бы одной предусмотренной email или VK command orchestrator идемпотентно вызывает существующий service endpoint `PATCH /api/service/callback_requests/{id}/notifications-delivered`. Отсутствие адресатов во всех каналах или отсутствие PubAck оставляет `false`. SMTP outcome и результат `messages.send` не откатывают флаг.

Это согласуется с текущим main spec и прямым указанием считать email доставленным после отправки без receipt. Альтернатива — ждать VK receipt/result event — потребовала бы channel-specific delivery state вместо одного boolean и выходит за scope.

### 5. VK consumer отправляет синхронно и хранит per-recipient ledger

VK Service активирует durable pull consumer `vk-service-commands-send-vk`, валидирует headers/payload, выбирает `user_vks` по `user_ids`, `state=ACTIVE`, `deleted_at IS NULL`, затем вызывает `VkMessengerProtocol.send_message` для каждого peer. Для retry-safe обработки вводится таблица `vk_notification_deliveries` с ключом `(event_uuid, user_id)`, snapshot `vk_peer_id`, статусом `PENDING/SENT/FAILED`, attempt count, последней безопасной ошибкой и timestamps. Успешный recipient больше не отправляется повторно; failed recipient повторяется при redelivery. Commit состояния `SENT` выполняется после успешного `messages.send`; consumer ACK-ает command, когда все eligible recipients терминально обработаны, а retryable failures приводят к NAK до `max_deliver`.

Отсутствующие/PENDING/BLOCKED/deleted bindings фиксируются как skipped terminal outcome без вызова VK API и не расширяют recipient list. В логах нет token/text/phone; разрешены event UUID, user UUID, peer ID и status согласно текущему audit boundary.

Альтернатива — использовать уникальный `vk_logs.event_uuid` — не поддерживает несколько recipients и конфликтует с audit-событиями. Альтернатива — Celery fan-out — добавляет второй broker/retry boundary без необходимости для единственного text send и усложняет NATS ACK.

### 6. Владельцы JetStream topology разделены

Notification Service, уже владеющий stream `NOTIFICATION_COMMANDS`, продолжает создавать stream с wildcard `commands.notification.>` и публикует VK command. VK Service не создаёт stream, но создаёт/актуализирует только собственный durable consumer и запускает его в FastAPI lifespan. `services/notification-service/docs/asyncapi.yaml` получает publish channel, новый `services/vk-service/docs/asyncapi.yaml` — зеркальный subscribe channel.

Deploy consumer-first: migration + VK consumer/schema, затем producer Notification Service. Это исключает потерю команд при появлении producer.

### 7. HTTP access matrix (endpoint diff отсутствует)

Контракты ниже используются smoke-настройкой и delivery flag, но не меняются:

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `POST` | `/api/callback_requests` | Public POST exception | anonymous | `201` при valid tenant selector; missing/invalid selector `401` | `201` при valid selector |
| `GET` | `/api/notification-settings` | Protected Read exception (private profile settings) | authenticated user | `401` | `200`, только настройки actor |
| `PATCH` | `/api/notification-settings/{event_code}/{channel_code}` | Protected Write | authenticated owner | `401` | `200`; foreign actor невозможен, user ID берётся из auth context |
| `GET` | `/api/service/users` | Service Read exception | valid `X-Service-Key` | `401` без/с invalid key | `200` с service key; cookie/selector не заменяют key |
| `PATCH` | `/api/service/callback_requests/{id}/notifications-delivered` | Protected Service Write | valid `X-Service-Key` | `401` | `200` с service key; обычная user auth не даёт доступ |

Причины исключений: callback create публичен для формы сайта; notification settings чувствительны и относятся к профилю; service endpoints доступны только межсервисному ключу. Anonymous/authenticated/service-key scenarios обязательны, хотя endpoint behavior не меняется.

### 8. Ownership и порядок

1. Notification owner: только `services/notification-service/**` — DTO/protocol/publisher/handler/orchestrator/AsyncAPI/tests.
2. VK owner после фиксации producer contract: только `services/vk-service/**` — migration/model/repository/service/consumer/wiring/AsyncAPI/tests. Не редактирует Notification Service.
3. Orchestration/docs owner при необходимости: только корневые `Makefile`, `SERVICES.md` и validation wiring; включение VK AsyncAPI в общий validator допускается отдельным последовательным deliverable без runtime-кода сервисов.
4. Один Quality Gate после всех owners: contract equality, migrations, unit/integration commands, live smoke skill и evidence в `docs/reports/061_vk_notifications_quality_gate.md`; findings возвращаются владельцам.
5. После успешного gate Router синхронизирует delta specs, повторяет strict validation и только затем архивирует change.

### 9. Amendment после QG REWORK: изолированный one-shot smoke harness

Оставшиеся SM-11..24, SM-26/28/29/32/34 требуют изолированных synthetic fixtures, а SM-30/31 и SM-35 — детерминированных отказов внешних adapters. Остановка общего NATS, переключение production DI, реальные отправки synthetic recipients, deploy/Helm/CI diff и публичный либо admin test endpoint запрещены.

В каждом затронутом сервисе добавляется отдельный **локальный CLI composition root**, который импортирует production schemas, handler/domain services и repositories, но не импортируется `main.py`, штатным container или lifespan:

- VK harness поднимает run-scoped ephemeral JetStream stream/subject/durable, запускает штатный `NotificationCommandsSendVkConsumer` и `NotificationCommandsSendVkHandler` с реальными VK PostgreSQL repositories, но с `ScriptedVkMessenger`. План adapter задаётся только в памяти процесса: `success`, `fail-always` или `fail-first-then-success` для точных synthetic `user_id`; adapter считает попытки и MUST NOT создавать `VkbottleMessenger` или обращаться к сети VK.
- Notification harness собирает штатные `CallbackEventHandler`/`NotificationOrchestratorService` и реальные Notification PostgreSQL repositories/Backend service client с двумя `ScriptedPublisher` adapters. Для точного synthetic callback plan каждого publisher задаётся `ack` либо `fail`; production NATS publishers не вызываются. Это доказывает SM-35 и channel combinations без публикации email/VK реальным consumers.
- Root smoke orchestration только запускает эти CLI через skill `smoke`, передаёт run UUID и connection values через environment, создаёт synthetic tenant/users/settings/bindings/callback rows, собирает sanitized counters/statuses и удаляет строго перечисленные fixture IDs и run-scoped JetStream resources в `finally`. Постоянный root script, pytest smoke-файл, compose override и tracked credentials не создаются.

Guard выполняется до подключения к PostgreSQL/NATS: обязательны `EQSITECMS_SMOKE_HARNESS=1`, `EQSITECMS_ENVIRONMENT=local`, валидный новый `run_id` и непустой точный список synthetic IDs. Любое отсутствие/невалидность даёт non-zero exit. CLI запрещает production/staging, wildcard targets, реальные peer/token/phone и payload/text в stdout/logs. Имена topology выводятся только из `run_id`; harness не подписывается на production subjects/durables и не изменяет production consumers. Credentials читаются только из environment, не принимаются через argv и не печатаются.

Этот выбор проверяет live NATS ACK/NAK/redelivery и реальные PostgreSQL transaction/ledger boundaries тем же production consumer/handler кодом, одновременно исключая внешний provider и общие runtime paths. Он намеренно не является production failure-injection feature.

### 10. Amendment ownership, execution units и DAG

| Unit | Профиль | Ownership | Результат | Verification |
|---|---|---|---|---|
| `VK-H1` | Backend | только `services/vk-service/src/smoke_harness/**`, связанные exports/settings-free helpers и `services/vk-service/tests/unit/smoke_harness/**` | guarded CLI composition root, isolated JetStream lifecycle, scripted messenger | unit group `HT-VK-01..06` + сервисные lint/type checks |
| `NT-H1` | Backend | только `services/notification-service/src/smoke_harness/**`, связанные exports и `services/notification-service/tests/unit/smoke_harness/**` | guarded CLI composition root и scripted channel publishers | unit group `HT-NT-01..05` + сервисные lint/type checks |
| `SMOKE-H1` | Quality Gate | runtime fixtures/evidence; единственный изменяемый report `docs/reports/061_vk_notifications_quality_gate.md` | live выполнение pending SM IDs через skill `smoke`, cleanup evidence | `SM-11..24,26,28..32,34,35` |
| `QG-BE-R1` | Quality Gate | read-only review | backend/runtime review обоих harness units | targeted tests + root applicable gates |
| `QG-CONTRACTS-R1` | Quality Gate | read-only review | scope, guards, topology isolation, access/AsyncAPI regression | strict OpenSpec + AsyncAPI validation |
| `QG-SYNTH-R1` | Quality Gate | только QG report | единый итоговый вердикт | synthesis после live lane |

DAG: `VK-H1` и `NT-H1` независимы; после обоих идут параллельно `QG-BE-R1` и `QG-CONTRACTS-R1`; затем `SMOKE-H1`; последним `QG-SYNTH-R1`. Findings возвращаются владельцу как новый узкий execution unit, затем повторяются только затронутый lane и synthesis.

## Backend test plan

### Unit-тесты backend-фичи VK callback delivery

| ID | Сценарий |
|---|---|
| UT-01 | VK command DTO принимает валидные UUID, непустые recipients и text |
| UT-02 | DTO отклоняет отсутствующий `event_uuid`/`callback_request_id` |
| UT-03 | DTO отклоняет пустой `user_ids` |
| UT-04 | DTO нормализует/отклоняет duplicate `user_ids` по контракту |
| UT-05 | DTO отклоняет пустой/слишком длинный text |
| UT-06 | DTO запрещает extra properties |
| UT-07 | Publisher использует subject `commands.notification.vk.send` |
| UT-08 | Publisher устанавливает `Nats-Msg-Id=callback_request_id` |
| UT-09 | Notification/VK AsyncAPI payload и headers идентичны |
| UT-10 | Callback handler для `vk` передаёт tenant и роли ADMIN/SUPERUSER |
| UT-11 | ADMIN нужной конюшни с enabled VK включён в command |
| UT-12 | SUPERUSER нужной конюшни с enabled VK включён в command |
| UT-13 | Неадминистратор исключён независимо от enabled setting |
| UT-14 | Администратор другой конюшни исключён |
| UT-15 | Администратор с disabled VK исключён, email selection не меняется |
| UT-16 | Disabled email не исключает того же пользователя из VK command |
| UT-17 | Пустое пересечение VK не вызывает publish |
| UT-18 | Backend users lookup error работает fail-closed без fallback |
| UT-19 | Email и VK commands форматируются независимо из одного event |
| UT-20 | SMS/unknown channel не использует email/VK publisher |
| UT-21 | Успешный только email PubAck ставит delivery flag |
| UT-22 | Успешный только VK PubAck ставит delivery flag |
| UT-23 | Оба PubAck приводят к одному идемпотентному confirm call |
| UT-24 | Нет ни одного PubAck — confirm call отсутствует |
| UT-25 | VK consumer ACK после успешной обработки всех eligible recipients |
| UT-26 | Malformed payload/header приводит к NAK без VK API call |
| UT-27 | ACTIVE binding вызывает send с правильным peer и text |
| UT-28 | PENDING binding пропускается без send |
| UT-29 | BLOCKED binding пропускается без send |
| UT-30 | Soft-deleted binding пропускается без send |
| UT-31 | Binding чужого user ID не попадает в delivery |
| UT-32 | Несколько ACTIVE bindings получают по одному send |
| UT-33 | Успешный send сохраняет `SENT` и attempt count |
| UT-34 | Ошибка send сохраняет `FAILED` и вызывает NAK |
| UT-35 | Redelivery не повторяет уже `SENT` recipient |
| UT-36 | Redelivery повторяет только `FAILED` recipient |
| UT-37 | Unique `(event_uuid,user_id)` выдерживает concurrent duplicate delivery |
| UT-38 | Частичный успех не дублирует successful recipient после retry |
| UT-39 | Consumer start/stop идемпотентны и lifespan корректно закрывает task |
| UT-40 | Логи/ledger не содержат group token, text и phone |

### Smoke-тесты backend-фичи VK callback delivery

Smoke выполняются только skill `smoke` на живом API/NATS с реальными PostgreSQL; pytest smoke-файлы запрещены.

Для pending сценариев synthetic recipients используются только run-scoped harness fixtures. `SM-25/27/33/36..40` сохраняют уже полученное evidence; их не повторяют. `SM-30/31` выполняются VK harness с `fail-always`/`fail-first-then-success`, `SM-35` — Notification harness с двумя `fail`; остальные pending сценарии используют scripted capture/counters без внешней доставки. Capture проверяется в памяти и в sanitized итогах; message text/phone/user IDs не записываются в report.

| ID | Запрос/действие | Проверка |
|---|---|---|
| SM-01 | Public callback POST с valid tenant selector | `201`, row создан в core PostgreSQL |
| SM-02 | Public callback POST без selector | `401`, row/event отсутствуют |
| SM-03 | Public callback POST с invalid selector | `401`, row/event отсутствуют |
| SM-04 | `GET /api/notification-settings` anonymous | `401` |
| SM-05 | Тот же GET под admin | `200`, есть `callback/email` и `callback/vk` |
| SM-06 | PATCH notification setting anonymous | `401` |
| SM-07 | PATCH `callback/vk` под admin | `200`, настройка сохраняется в notification PostgreSQL |
| SM-08 | Service users без key | `401` |
| SM-09 | Service users cookie-only/selector-only | `401` |
| SM-10 | Service users с valid key + tenant A + roles | `200`, только A ADMIN/SUPERUSER |
| SM-11 | Неадминистратор tenant A, оба канала enabled, callback A | нет email command и VK command для него |
| SM-12 | ADMIN tenant B, оба канала enabled, callback A | нет email/VK command для него |
| SM-13 | ADMIN tenant A, email off/VK on | только VK command |
| SM-14 | ADMIN tenant A, email on/VK off | только email command |
| SM-15 | ADMIN tenant A, оба off | обе commands отсутствуют, flag false |
| SM-16 | ADMIN tenant A, оба on | обе commands опубликованы |
| SM-17 | SUPERUSER tenant A, VK on | включён в VK recipients |
| SM-18 | Два eligible admin tenant A, VK on | command содержит оба уникальных IDs |
| SM-19 | VK command AsyncAPI-valid | headers/payload проходят schema validation |
| SM-20 | Malformed VK command | consumer NAK/retry, VK send отсутствует |
| SM-21 | Unknown user ID в command | send отсутствует, чужие bindings не выбираются |
| SM-22 | PENDING binding | send отсутствует |
| SM-23 | BLOCKED binding | send отсутствует |
| SM-24 | Soft-deleted binding | send отсутствует |
| SM-25 | ACTIVE admin binding | реальное сообщение приходит в VK admin |
| SM-26 | Текст реального сообщения | содержит callback name/phone/comment и не содержит UUID |
| SM-27 | VK API success | ledger имеет `SENT`, один attempt |
| SM-28 | Повторный тот же NATS command | второе VK-сообщение не приходит |
| SM-29 | Concurrent duplicate commands | не более одного send на `(event,user)` |
| SM-30 | Инъецированная ошибка VK API | `FAILED`, NAK/redelivery observable |
| SM-31 | Partial failure двух recipients | successful не дублируется, failed повторяется |
| SM-32 | Только успешный email PubAck | callback flag true без SMTP receipt |
| SM-33 | Только успешный VK PubAck | callback flag true до VK receipt по command-acceptance contract |
| SM-34 | Нет eligible recipients | callback flag остаётся false |
| SM-35 | Notification publish error обоих каналов | flag остаётся false |
| SM-36 | Service delivery PATCH без/invalid key | `401`, flag не меняется |
| SM-37 | Service delivery PATCH с valid key | `200`, идемпотентное true |
| SM-38 | Перезапуск VK Service | durable продолжает с сохранённой позицией без duplicate SENT |
| SM-39 | Проверка stream/consumer | subject в `NOTIFICATION_COMMANDS`, durable имеет explicit ack/max deliver |
| SM-40 | Cleanup | созданные core/notification/VK rows удалены, реальные настройки admin восстановлены |

### Harness unit test matrix (amendment)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где проверяется |
|---|---|---|---|---|---|
| HT-VK-01 | unit | guard | enable/local/run ID/targets отсутствуют или невалидны | fail-fast до NATS/DB, non-zero | VK harness unit tests |
| HT-VK-02 | unit | isolation | topology строится для run ID | только уникальные smoke stream/subject/durable; production names запрещены | VK harness unit tests |
| HT-VK-03 | unit | provider safety | scripted success/failure plan | `VkbottleMessenger` не создаётся, сеть VK не вызывается | VK harness unit tests |
| HT-VK-04 | unit | deterministic retry | fail-first-then-success | `FAILED` + NAK, затем только failed recipient становится `SENT` | VK harness unit tests |
| HT-VK-05 | unit | concurrency/idempotency | duplicate publish | scripted send не более одного раза для уже `SENT` | VK harness unit tests |
| HT-VK-06 | unit | cleanup/observability | success и исключение runner | topology/fixtures удалены по IDs; stdout/logs без payload/PII/secrets | VK harness unit tests |
| HT-NT-01 | unit | guard | enable/local/run ID/targets отсутствуют или невалидны | fail-fast до DB/backend/NATS | Notification harness unit tests |
| HT-NT-02 | unit | adapter isolation | scripted publisher composition | production NATS publishers не создаются/не вызываются | Notification harness unit tests |
| HT-NT-03 | unit | channel outcomes | email/VK ack/fail combinations | flag вызывается только при хотя бы одном scripted ack | Notification harness unit tests |
| HT-NT-04 | unit | оба publishers fail | оба adapters выбрасывают детерминированную ошибку | confirm отсутствует, callback flag false | Notification harness unit tests |
| HT-NT-05 | unit | cleanup/observability | success и исключение runner | fixtures удалены по IDs; output не содержит payload/PII/secrets | Notification harness unit tests |

### PostgreSQL для smoke-тестов

Discovery по требуемым labels `project=eqsitecms,service=db` 2026-08-27 не дал результата; fallback обнаружил актуальные контейнеры. `docker inspect` дал snapshot:

| Контур | Контейнер / image | DB / user / password | host port | compose labels / aliases |
|---|---|---|---|---|
| Backend Core | `eqsitecms-db` (`7c720ddc783d`), `postgres:16` | `eqsitecms` / `eqsitecms` / `eqsitecms` | `5433` | `project=eqsitecms-core`, `service=db`; `eqsitecms-db`, `db` |
| Notification | `eqsitecms-db-notifications` (`71ffa0bcde12`), `postgres:16` | `eqsitecmsnotifications` / `eqsitecmsnotifications` / `eqsitecmsnotifications` | `5434` | `project=eqsitecms-core`, `service=db-notifications`; `eqsitecms-db-notifications`, `db-notifications` |
| VK | `eqsitecms-db-vk` (`eb65425bc835`), `postgres:16` | `eqsitecmsvk` / `eqsitecmsvk` / `eqsitecmsvk` | `5436` | `project=eqsitecms-vk`, `service=db-vk`; `eqsitecms-db-vk`, `db-vk` |

Это локальные dev-значения snapshot, не production secrets. Smoke runner MUST непосредственно перед тестом повторить `docker ps`/`docker inspect`, получить `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` и port из фактического контейнера и не хардкодить таблицу выше.

Переменные smoke: `BASE_URL`, `NATS_URL`, `SERVICE_KEY`, `TENANT_A_SELECTOR/ID`, `TENANT_B_SELECTOR/ID`, `ADMIN_A_ID`, `ADMIN_B_ID`, `NON_ADMIN_A_ID`, `VK_ADMIN_PEER` (не логировать), DB-параметры всех трёх контуров из inspect. Реальный кейс SM-25 требует подтверждения пользователя, что сообщение появилось в привязанном VK профиля admin.

## Risks / Trade-offs

- [Один boolean не отражает outcome каждого канала] → сохранить документированную command-acceptance semantics; channel delivery status вынести в отдельный change.
- [PubAck VK ставит flag до фактического VK API send] → явно проверить это в SM-33 и не называть flag receipt/read confirmation.
- [Partial multi-recipient failure] → per-recipient ledger и retry только FAILED, SENT не повторять.
- [VK API не классифицирует transient/permanent error в текущем adapter] → ограничить retry JetStream `max_deliver`, фиксировать безопасный failure status; детальную классификацию вынести отдельно.
- [Consumer-first deploy при старом stream config] → wildcard уже включает VK subject; проверить effective stream перед producer rollout.
- [Реальный VK тест зависит от внешней группы и пользователя] → автоматические tests используют stub; live SM-25 выполняется только с согласованным admin fixture и ручным подтверждением пользователя.
- [Tracked dev credentials в planning artifact] → указаны только значения локальных disposable контейнеров, полученные по обязательному inspect; Quality Gate не публикует tokens/service keys.

## Migration Plan

1. VK owner добавляет migration ledger, consumer DTO/handler/wiring и AsyncAPI; применяет migration к `eqsitecms-db-vk`.
2. Поднять VK Service consumer, проверить durable и отсутствие сообщений на новом subject.
3. Notification owner добавляет VK formatter/publisher/orchestrator dispatch и обновляет AsyncAPI.
4. Проверить contract equality и выполнить unit/integration gates обоих сервисов.
5. Через skill `smoke` подготовить tenant/user/settings fixtures, выполнить SM-01..SM-40, реальную VK доставку согласовать с пользователем, восстановить настройки и удалить fixtures.
6. Rollback producer-first: остановить публикацию VK commands, дождаться/удалить только согласованный test backlog, затем остановить consumer. Ledger/table можно оставить совместимыми; destructive downgrade только по отдельному подтверждению.

## Open Questions

- Для live SM-25 пользователь должен подтвердить получение сообщения в VK профиля admin; точный момент теста согласуется после approval и поднятия consumer.
- Продуктовый контракт command-acceptance для общего `notifications_delivered` принят как продолжение существующего email behavior. Если требуется флаг только после фактического `messages.send`, нужен отдельный delivery-result event и изменение модели callback status до apply.
