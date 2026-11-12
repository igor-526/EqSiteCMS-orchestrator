# Design — отправка подтверждения при привязке email

Задача: `docs/tasks/112_email_confirmation_on_bind.md`. Дата: 2026-11-11.
Реализация: `services/backend`; frontend/email-service — только контекст существующего потока.

## Context

Мотивация — proposal.md, раздел Why. Локализован конкретный пропущенный шаг оркестрации:

| Участок | Наблюдение по коду |
|---|---|
| `services/frontend/src/features/notifications/hooks/useNotifications.ts`, submitEmail / resendConfirmation | submitEmail вызывает только saveEmail с user_id/email; после успеха показывает «Подтвердите адрес по ссылке из письма». Ручной resend — отдельный вызов |
| `services/frontend/src/api/email.ts` | createEmail → POST `/emails`; sendEmailConfirmation → отдельный POST `/emails/send-confirmation` |
| `services/backend/src/api/emails.py`, `src/core/services/email_proxy.py` | create после owner-check вызывает только client.create_email; send_confirmation не вызывается |
| `services/backend/src/clients/email_service/client.py` | private create и send-confirmation — независимые HTTP-запросы |
| `services/email-service/src/core/services/user_email.py` | create сохраняет/возвращает существующий normalized адрес; подтверждение не инициирует |
| `services/email-service/src/api/endpoints/emails.py` | только POST send-confirmation вызывает существующую Celery-задачу через delay |
| `services/email-service/src/workers/tasks/confirmation.py` | задача находит адрес, инвалидирует старые коды, создаёт код/TTL, вызывает SMTP sender, пишет log, commit; ошибка → rollback и существующий retry |

**Причина:** привязка не вызывает существующий send-confirmation flow ни на одном слое. Это доказательство пропуска по коду, но НЕ runtime-воспроизведение и НЕ доказательство работоспособности SMTP. Возможные дополнительные инфраструктурные ошибки остаются непроверенными.

Прочитанные AsyncAPI backend/email-service и NATS-настройки в `src/settings.py` подтверждают отдельный notification command flow. Указанных в старых правилах `src/core/config/nats.py` в этих сервисах нет. Подтверждение использует HTTP/Celery, NATS менять не нужно.

### Расхождения контекста, не расширяющие scope

- В коде и действующей spec confirm имеет метод `PATCH`, поэтому формулировка про «public POST exceptions» не означает переход на POST.
- send-confirmation принимает `user_id`, а не секретную контрольную строку. Новый флаг не расширяет это существующее публичное исключение; его hardening — отдельная задача.
- Email routes не принимают tenant selector: owner выводится из access session. Нормативный missing/invalid selector → `401` относится только к endpoints, где selector обязателен. Не добавляем selector к email API. В отдельном public context helper обнаружены другие текущие статусы; это pre-existing расхождение вне email scope, его нельзя объявлять исправленным/проверенным этим change.
- Legacy `tests/e2e/test_email_e2e.py` не является безопасным acceptance runner: содержит фиксированные внешние цели и не различает queue acceptance/SMTP success. Не запускать и не использовать как доказательство.

## Goals / Non-Goals

**Цель:** backend-only запуск подтверждения при POST-привязке, с явным opt-out и без ложной гарантии доставки. Контракт — delta `email-backend-proxy`.

**Не входит:** auto-send при PATCH-смене адреса, изменение frontend/UI текстов, email-service, модели/миграции, outbox/exactly-once, исправление worker transaction/retry, NATS/Celery topology, публичные access исключения. Неприменимы browser QA, миграционные и новые messaging-тесты: таких изменений нет.

## Decisions

### 1. Флаг и совместимость

Body POST: `{user_id: UUID, email: string, send_confirmation?: boolean}`. Использовать строгий boolean (например StrictBool), default `true`; `null`, строки и 0/1 → `400` через существующий email validation mapping. Сохранить прежние user_id/email validators и отсутствие нового флага в PATCH.

Default `true` выбран вместо `false`, иначе текущий frontend по-прежнему никогда не запустит письмо без доработки. **Да, текущий frontend автоматически запрашивает отправку при новой POST-привязке без изменения кода. Нет, PATCH-смена адреса автоматически отправлять не начнёт.** Это совместимость формата, а не неизменность побочного эффекта. Для прежнего режима сторонний клиент передаёт `false`.

### 2. Оркестрация в сервисе, не в router

- `src/clients/email_service/schemas.py`: добавить флаг только EmailCreateRequest. Флаг остаётся локальным backend input.
- `src/api/emails.py`: передать его в create use case, не добавлять бизнес-логику в endpoint.
- `src/core/services/email_proxy.py`: сначала `_require_owner`, затем существующий private create. Только после валидного ответа, при `send_confirmation=true` и `approved=false`, вызвать существующий client.send_confirmation. Внутренний default create также `true`, чтобы прямые вызовы не расходились с API.
- `src/clients/email_service/client.py`: проверить create через существующий EmailResponse и соответствие user_id/normalized email. Можно сохранить dict return protocol, валидируя и возвращая JSON-совместимый словарь без приватных полей. Сравнение нормализации соответствует email-service: strip + casefold. При malformed/foreign/mismatch → безопасный `502`, отправку не делать.
- В существующем send_confirmation adapter требовать `202`; остальные 2xx также не являются подтверждением принятия очередью. Body resend не получает нового флага. Существующий `EmailServiceClientProtocol` уже достаточен и не требует новой операции.
- Прежний `201 EmailResponse` без дополнительных delivery/status полей. Успех означает принятие задачи по существующему API-контракту, не успех worker/SMTP.

Альтернатива «флаг в email-service create» затрагивает второй сервис и требует решать commit-before-queue; не нужна для минимального backend fix. Альтернатива «frontend вызывает resend» не отвечает backend-only запросу.

### 3. Ошибки и границы транзакций

Шаг A: private POST create, отдельная транзакция email-service (request-scoped get_session commit). Шаг B: private POST send-confirmation, отдельный запрос, затем worker со своей session. Backend не держит общей SQL-транзакции и не может атомарно откатить A при сбое B.

| Место ошибки | Ответ backend | Состояние / восстановление |
|---|---|---|
| Auth/owner/input | `401` / `403` / `400` | без downstream |
| Create HTTP 4xx/5xx | существующий downstream status | send не вызывается |
| Create transport / invalid response | безопасный `502` | запись могла сохраниться при timeout; не утверждать rollback; send не вызывать |
| После валидного create: send HTTP не 202 / malformed JSON response / timeout / transport | `502`, detail «Email сохранён, но отправку подтверждения не удалось подтвердить. Повторите запрос или используйте повторную отправку.» | адрес сохранён; постановка при timeout могла произойти; не компенсировать DELETE |
| Worker/SMTP после `202` | прежний `201` уже завершён | существующие email-service retry/logs; синхронный backend не знает исхода |

Не пробрасывать raw ошибку второго шага как будто create отклонён (например `404` после concurrent delete). Для безопасного stage-aware mapping допустим узкий core exception и handler в `src/main.py`; не менять общие HTTP handlers других routes. Логировать стадию/безопасный correlation ID, но не email/code/token/сырой downstream payload. Для invalid response использовать контролируемую ошибку, а не необработанный ValidationError/500. Не глотать неизвестные программные исключения широким catch-all.

Если реальный peer отвечает до commit и тест показывает race видимости, не «лечить» sleep/retry: остановить unit с blocker и вернуть Router необходимость отдельного peer slice. В нормальном потоке второй HTTP начинается после завершённого create; acceptance должен проверить реальную видимость записи.

### 4. Повторы, confirmed и конкуренция

Idempotency email resource сохраняется: повтор одинакового normalized email → одна запись/тот же id; другой адрес → `409`. Уже approved → `201` без отправки и без изменения approved. Для неподтверждённого адреса повтор при `true` намеренно повторяет постановку, чтобы восстановиться после сбоя B.

Не добавлять внутренние HTTP retry, locks или marker-таблицу. Максимум один send вызов за backend create request. Параллельные/повторные запросы могут поставить несколько писем; timeout B может означать уже принятую задачу. Существующий worker инвалидирует старые коды и имеет собственный retry. Exactly-once, сериализация кодов и устранение race «адрес изменился между create и worker lookup по user_id» вне scope: этот риск уже есть у ручного resend. Backend-only флаг не усиливает контракт до отправки строго тому snapshot, который вернул create.

## Access matrix

Нормативный источник и anonymous/authenticated scenarios — delta spec `A-MATRIX`, `A-NO-BYPASS`, `A-PUBLIC`, `A-SELECTOR`.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| POST | `/api/emails` | Protected Write | exact owner, без role override | `401` | owner `201`, different `409`, partial send `502`, invalid `400`; foreign `403` до lookup |
| PATCH | `/api/emails` | Protected Write | exact owner | `401` | `200` / missing `404` / invalid `400`; foreign `403` |
| DELETE | `/api/emails/{user_id}` | Protected Write | exact owner | `401` | `204` / missing `404` / invalid `400`; foreign `403` |
| GET | `/api/emails/me` | Protected Sensitive Read | owner из session | `401` | `200` / `404` |
| POST | `/api/emails/send-confirmation` | Public Confirmation Write | anonymous/authenticated | `202` / missing `404` / invalid `400` | те же исходы |
| PATCH | `/api/emails/confirm` | Public Confirmation Write | anonymous/authenticated | `200` / invalid `400` / expired `410` / used `409` / missing email `404` | те же исходы |
| — | endpoints с обязательным tenant selector (email — N/A) | существующий tenant boundary | selector не даёт прав | missing/invalid selector `401` | missing/invalid selector `401` независимо от роли |

Причины исключений: sensitive GET содержит персональный адрес; send-confirmation позволяет начать flow без CMS session по user_id; confirm проверяет code без CMS session. Это существующие исключения, не новое разрешение create. Backend→private peer по существующей изолированной сети не получает X-Service-Key/Authorization. Новый флаг не обходит owner и не становится downstream auth hint.

## Deliverables и ownership

| Deliverable | Владелец | Пути / closure |
|---|---|---|
| A — backend email create orchestration | Backend | `services/backend/src/api/emails.py`, `src/clients/email_service/{schemas.py,client.py}`, `src/core/services/email_proxy.py`, новый `src/core/exceptions/email_proxy.py` при необходимости, `src/main.py` только узкий handler, `tests/unit/api/test_email_proxy_api.py`, `tests/unit/api/test_email_client_boundary.py`, новый `tests/unit/core/services/test_email_proxy.py`, новый `tests/integration/test_email_bind_confirmation.py`; относительные пути после первого — от services/backend |
| B — независимый acceptance и отчёт | Quality Gate | только `docs/reports/send-email-confirmation-on-bind.md`, `.qa/send-email-confirmation-on-bind/QG/`; код A не редактирует |
| C — спецификация / lifecycle | Planner до approval, далее Router | этот change и `docs/tasks/112_email_confirmation_on_bind.md`; после APPROVED Router sync только `openspec/specs/email-backend-proxy/spec.md` и archive по approval gates |

Новых fixtures/conftest/DI wiring не ожидается: protocol/DI существуют, изоляция тестов локальна новым тестовым модулям. Если потребуются общие fixtures/генераторы/пути вне списка, сначала согласовать ownership с Router. Исполнители отмечают в общем tasks.md только свои выполненные IDs последовательно.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| EM-BE-1 | Backend | A | перечисленные production пути + три unit test модуля | approval | targeted email unit suite + scoped static; исходный reproducer до правки |
| EM-BE-2 | Backend | A | новый integration test модуль, локальные test doubles; production пути A только при найденном integration дефекте | EM-BE-1 | paired/real-PG integration acceptance, затем final-service `make test`, `make lint` |
| EM-QG | Quality Gate | B | отчёт + `.qa/.../QG/`, без runtime edits | EM-BE-2 | единый QG-LITE: независимые backend/contract/live проверки и вердикт |

DAG: `пользовательский approval → EM-BE-1 → EM-BE-2 → EM-QG → Router sync → validation → archive (по gates)`.
Параллельных реализационных units нет: один tightly-coupled backend owner. Каждый unit содержит 5–8 связанных действий, см. tasks. Никакого unit только для setup/checkpoint. EM-BE-2 — финальная граница backend. Format подготовка владельца только на своих путях (`uv run ruff check --fix ...`, `uv run ruff format ...`); canonical non-mutating check — Ruff, включён в make lint. Black и root aggregate не запускать.

Точечные contextFiles указаны отдельно для каждого unit в tasks; не загружать соседние changes. QG профиль будущей реализации — `QG-LITE` (один сервис, без миграций/NATS); текущий PLAN-1 — только статические проверки документов. FE lanes и UI manual — неприменимы, UI diff отсутствует.

## Test matrix

UT — планируемые pytest сценарии; SM — реальные HTTP smoke, не pytest smoke-скрипты. ScenarioId после стрелки — delta spec, кроме SM-EM-04, который закрывает исходный runtime gap. Никакой тест пока не исполнен.

| ID | Уровень | riskId / ось | Сценарий → spec | Ожидание | testPath/command |
|---|---|---|---|---|---|
| UT-EM-01 | unit | R-REGRESSION / исходный пропуск | POST без флага → F-DEFAULT | before нет send; after create → send один раз, `201` | `tests/unit/core/services/test_email_proxy.py`, `tests/unit/api/test_email_proxy_api.py` |
| UT-EM-02 | unit | R-INPUT / opt-out и тип | false/true/omitted/null/строка/число/коллекции → F-OFF, F-INVALID | false без send; invalid `400` без effects | те же модули |
| UT-EM-03 | unit | R-APPROVED / confirmed | повтор confirmed → F-APPROVED | без send, approved сохранён | `tests/unit/core/services/test_email_proxy.py` |
| UT-EM-04 | unit | R-CREATE / ошибки первого шага | 400/409/5xx/timeout → F-CREATE-FAIL | нет send, прежний status/502 | core + API test модули |
| UT-EM-05 | unit | R-PARTIAL / второй шаг | non-202 (включая 200/204), malformed JSON, timeout/transport → F-QUEUE-FAIL | `502`, safe detail, без DELETE/retry | core + API + client boundary test модули |
| UT-EM-06 | unit | R-IDEMPOTENCY / повтор | partial → same request → F-RETRY | повтор send, не новый ресурс; unit не доказывает SQL uniqueness | core test модуль |
| UT-EM-07 | unit | R-WIRE / producer-consumer DTO | реальный client serializes create; response malformed/foreign/mismatch → F-WIRE | флаг не уходит peer; валидный EmailResponse, иначе 502 без send/утечки | `tests/unit/api/test_email_client_boundary.py` + API test модуль |
| UT-EM-08 | unit | R-ACCESS / безопасность create | anonymous/owner/foreign включая ADMIN/SUPERUSER с обоими флагами → A-NO-BYPASS | owner only, no downstream на denied | API + core test модули |
| UT-EM-09 | unit | R-ASYNC / граница гарантии | `202` с queued body, без ожидания worker → F-ASYNC | `201`, не утверждает sent/SMTP | core + client boundary test модули |
| UT-EM-10 | unit | R-REGRESSION / остальной API | anonymous/authenticated GET/PATCH/DELETE/send/confirm, missing/invalid/expired/reused → A-MATRIX, A-PUBLIC | исходные статусы, PATCH не инициирует send, no peer credentials | существующие API/client/notification gateway test модули |
| IT-EM-01 | integration, paired + PostgreSQL | R-PERSIST / commit, retry, конкуренция | backend production HTTP client → настоящий email-service API/DTO/storage → F-RETRY, F-CONCURRENT | commit виден второму шагу; repeated/concurrent same → один id/row; conflict сохраняет адрес; после injected failure шага B независимая session видит запись; после retry есть принятие | новый `tests/integration/test_email_bind_confirmation.py`; запуск `uv run pytest tests/integration/test_email_bind_confirmation.py` |
| SM-EM-01 | live HTTP + PostgreSQL | R-REGRESSION / точный flow | owner POST без флага, не нажимать resend → F-DEFAULT | `201`, запись + queue acceptance; before/after; не путать с delivered | `.claude/skills/api-smoke-test`, разрешённый backend/email test target |
| SM-EM-02 | live HTTP + PostgreSQL | R-PARTIAL / восстановление | false; same/confirmed; controlled failure B → F-OFF/F-APPROVED/F-QUEUE-FAIL/F-RETRY | прежний ресурс, safe 502, повтор успешен | тот же skill; failure injection только в изолированном test peer, не останавливать общий broker |
| SM-EM-03 | live HTTP | R-ACCESS / матрица | anonymous + authenticated owner/foreign; public send/confirm → A-MATRIX/A-PUBLIC | реальные статусы; немедленный confirm разрешённого тестового кода, затем approved | тот же skill, masked evidence |
| SM-EM-04 | live SMTP sink, отдельно | R-DELIVERY / граница наблюдения | письмо без resend → исходный запрос пользователя | сообщение реально появилось в разрешённом test inbox/sink; не утверждать внешнюю доставку по HTTP 201/202 | тот же skill + read-only test mail sink; нет доступа → unchecked с причиной |

UT-EM-10 использует также `tests/unit/api/test_notification_ui_gateway.py` read-only; расширение его ownership сначала согласуется, если регрессия потребует правки. Полный suite в финальной границе выполняется один раз, не дублируется aliases. Не добавлять квоты однотипных тестов.

### Acceptance registry / prerequisites

Обозначения: P-UNIT — установленное backend lockfile-окружение, local doubles без сети. P-PAIR — отдельные lockfile-окружения backend/email-service, настоящий private HTTP API и production DTO; isolated PG с выделенной `_test` БД/ролью; queue-dispatch spy/test sink вместо реальной внешней доставки. P-LIVE — готовые изолированные backend/email-service/worker/Redis/PG test targets, тестовые owner/foreign аккаунты, только разрешённый mail sink, безопасный read-only способ проверить очередь/запись. Не выдавать substituted queue/SMTP за реальное wire/delivery evidence.

Для всех строк evidenceOwner=`EM-QG` (независимое выполнение); owner self-check в указанном unit сохраняет отдельные evidence и не заменяет QG. Все paths логов — `.qa/send-email-confirmation-on-bind/<unit>/`, ledger по единой verification policy.

| riskId | scenarioId | unit | testPath/command | evidenceOwner | prerequisites | isolation | permission | budget | stopCondition | status |
|---|---|---|---|---|---|---|---|---|---|---|
| R-REGRESSION,R-INPUT,R-APPROVED,R-CREATE,R-PARTIAL,R-IDEMPOTENCY,R-WIRE,R-ACCESS,R-ASYNC | UT-EM-01..10 | EM-BE-1 | targeted pytest путей матрицы | EM-QG | P-UNIT | mocks только на unit уровне | локальные tests без infra mutation | 120 с/группа | missing deps/0 tests → blocked | planned |
| R-PERSIST | IT-EM-01 | EM-BE-2 | integration pytest из матрицы | EM-QG | P-PAIR; версии env зафиксированы; test doubles локальны модулю | выделенная `_test` DB; concurrent проверки в двух sessions; новая session после сбоя | отдельный permit target/resources/expiry до любого PG setup/teardown; без него stop | 180 с/группа; bounded synchronization, ≤2 infra repairs | нет peer checkout/deps/изоляции/permit → blocked до mutation; race видимости → stop без sleep-fix | planned |
| R-REGRESSION | SM-EM-01 | EM-BE-2 | api-smoke-test, точный POST flow | EM-QG | P-LIVE + разрешённый introspection очереди | выделенные test owner/email и PG | отдельный runtime/PG permit; не внешний адрес | 120 с/сценарий | нет before FAIL → unreproduced, closure blocked; нет target/permit → blocked | planned |
| R-PARTIAL | SM-EM-02 | EM-BE-2 | api-smoke-test, controlled peer failure | EM-QG | P-LIVE + изолированный injectable peer | только owned test route/resource, не общий Redis/worker | отдельное разрешение на test failure injection и cleanup | 120 с/сценарий | нельзя безопасно inject → blocked, не выключать общую infra | planned |
| R-ACCESS | SM-EM-03 | EM-BE-2 | api-smoke-test, access matrix | EM-QG | P-LIVE + allowed token source | owner/foreign тестовые данные; code только в памяти, сразу confirm | permit на тестовые записи/token lookup; secrets не писать | 120 с/сценарий | нет test code source/permit → blocked | planned |
| R-DELIVERY | SM-EM-04 | EM-BE-2 | test SMTP sink read-only | EM-QG | P-LIVE + sink access | только тестовый inbox, не production SMTP | явное разрешение отправки в sink | ожидание ≤60 с | нет sink → unchecked; timeout → failed, не «SMTP работает» | planned |
| R-SELECTOR | A-SELECTOR | EM-QG | review email routes + существующие tenant tests, без изменения helper | EM-QG | статическое чтение применимости | без infra | read-only | 60 с | выявлен pre-existing drift → отдельный gap, не scope creep | not-applicable — email API selector не принимает; нормативный 401 зафиксирован, общий helper этим change не исправляется |

Точный исходный reproducer до runtime fix: owner POST без флага и без ручного resend на безопасном test target; зафиксировать отсутствие enqueue/письма, не подменяя это timeout SMTP. Сохранять `reproducer-before.json`/`reproducer-after.json` с одинаковыми безопасными input/route/ожиданиями и fingerprints, без полных адресов/cookies/кодов. Если runtime before недоступен, unit reproducer показывает только локализованный пропуск; runtime finding остаётся blocked/unreproduced, не закрывается mock PASS. Никакого искусственного отката кода ради получения before FAIL. Максимум один targeted QG recheck, затем stop и решение Router/пользователя.

## PostgreSQL для smoke-тестов

В PLAN-1 контейнеры/credentials не обнаруживались, docker inspect не запускался: задача docs-only, разрешение setup/teardown отсутствует. Конкретные container identity/DB/role/порт сейчас **не определены**, acceptance planned, не PASS.

До EM-BE-2 Router обязан передать безопасный test-target descriptor и отдельный permit с target/resources/expiry. Только после этого исполнитель проверяет identity через разрешённый ограниченный `docker inspect`, не печатает env/DSN/секреты, подтверждает `_test` isolation и owned cleanup. Нет этих prerequisites → blocked, без fallback в app/public БД. Approval change сам по себе не даёт разрешения PG/NATS setup/teardown. NATS mutation вообще не требуется. Новые provisioning инструменты в этот scope не входят.

## Risks / Trade-offs

- [Default true добавляет эффект и точку отказа] → явно документировать opt-out; успешная схема остаётся прежней; безопасный stage-aware 502.
- [Сохранён адрес, клиент видит ошибку] → честный detail и idempotent retry/ручной resend; не выдавать ложный успех отправки. UI при 502 может оставить модалку открытой — допустимое существующее error UI, FE fix не нужен.
- [HTTP timeout / concurrent requests дают дубликаты писем] → один вызов за запрос, без auto HTTP retry; exactly-once не обещаем.
- [Worker отправляет SMTP до commit и может повторить после rollback] → существующий риск, не устранять в backend-only change; не объявлять SMTP транзакционным.
- [Утечка response/секретов] → валидация create response, безопасные детали; не копировать legacy e2e payload/адреса в evidence.

## Migration Plan

Миграций нет. После approval выполнить EM-BE-1 → EM-BE-2 → единый EM-QG. Разворачивается только backend, private API и frontend остаются прежними. Откат — предыдущая backend revision, она снова не инициирует подтверждение; уже сохранённые адреса/очередь/approved не удалять. Для клиента переход к прежнему поведению — `send_confirmation=false`.

После APPROVED Router синхронизирует только затронутую capability, повторяет strict validation, выполняет archive/финализацию по пользовательским gates. Единственный будущий отчёт — `docs/reports/send-email-confirmation-on-bind.md`; PLAN-1 его не создаёт.

## Open Questions

Архитектурных нерешённых вопросов нет: предлагаемые default=true, scope POST-only и partial 502 являются выбранным контрактом для approval, а не неопределёнными вариантами. До runtime acceptance остаётся получить у Router безопасные test targets/permit и доступ к test mail sink. Без sink нельзя подтвердить реальную доставку; без среды нельзя закрыть исходный runtime finding.
