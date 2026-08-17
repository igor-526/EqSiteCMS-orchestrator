# Бриф аудита EqSiteCMS для будущего OpenSpec

**Статус:** ❌ REWORK / входной бриф, не OpenSpec change  
**Дата:** 2026-08-16  
**Исходная задача:** `docs/tasks/045_refactoring_codex.md`  
**Отклонённый change:** `openspec/changes/refactor-codex-045` удалён по прямому указанию пользователя; его proposal/design/spec/tasks не являются планом реализации.  
**Область:** orchestration root, `services/backend`, `services/frontend` (CMS), `services/email-service`, `services/notification-service`.  
**Явно исключено:** Consumer Frontend — `services/site-ad` и любые `services/site-*` не читались, не проверялись и не изменялись.

## Цель и метод

Это evidence-бриф для последующего формирования русскоязычного OpenSpec исправлений. Runtime-код, тесты, main/delta specs и конфигурация не исправлялись. Проверялись архитектурные границы, API access policy, статическая типизация, lint/format, unit-тесты, CMS build, NATS/Celery контракты и root orchestration. Подтверждённые дефекты ниже основаны на текущем коде и воспроизводимых командах; риски отделены от дефектов.

## Краткий итог

Проект не готов к общему release gate. Главные блокеры:

1. Backend не аутентифицирует пользователя перед create/update/delete email и тем самым позволяет анонимно инициировать привилегированные операции. После пользовательской проверки backend должен обращаться к private email-service без межсервисной авторизации.
2. Реализованный `X-Equestrian-Service-Key` является задуманным публичным, несекретным tenant selector. Runtime-поведение сохраняется, но общая access policy агентов и документация должны явно описывать это исключение и контракт `401` для отсутствующего/неверного selector.
3. Backend не проходит mypy, Ruff и format-check; полный typed gate tests даёт 547 ошибок.
4. Email/notification проходят pytest, mypy, Ruff и format-check, но падают на объявленном basedpyright (3 и 5 ошибок).
5. NATS/AsyncAPI/Celery не имеют реального межсервисного/infrastructure evidence; compose worker не зависит от Redis и не имеет healthcheck.
6. Root `make build/test/lint/format` не является полным non-mutating gate: email не входит в build, проверки охватывают только backend, lint/format меняют файлы.

## Подтверждённые дефекты

### F-01 — CRITICAL — backend не защищает email create/update/delete

- **Evidence:** `services/backend/src/api/emails.py:19-84`: глобальный concrete `EmailServiceClient`; create/update/delete не получают current user и не проверяют owner/scope. `services/backend/src/clients/email_service/client.py:11-68` добавляет bearer service key ко всем downstream-вызовам, хотя утверждённый контракт peer-сервисов не предусматривает межсервисную авторизацию.
- **Граница:** public HTTP → backend → доверенный service-to-service email API.
- **Воздействие:** анонимный вызывающий может заставить backend создавать, менять или удалять email произвольного `user_id`.
- **Нормативный контракт:** backend единолично выполняет user authentication/authorization; create/update/delete являются owner-only Protected Write без privileged override. `POST /send-confirmation` и `PATCH /confirm` — утверждённые публичные исключения: email-service сопоставляет пользователя/email по контрольной строке, а confirmation flow должен работать без CMS session. После проверки на backend вызов private email-service выполняется без peer-service credential.
- **Access semantics:** unauthenticated → `401`; authenticated caller с чужим `user_id` → `403` до lookup/downstream; никакая роль/scope не разрешает чужую операцию; owner получает `404`, если операция требует существующего email, но его нет. Любой некорректный запрос этого email-контракта → `400`, включая malformed UUID/body: потребуется сознательно нормализовать framework/Pydantic validation, которая сейчас обычно даёт `422`.
- **Create semantics:** первый create возвращает существующий контракт `201` и обычный `EmailResponse`. Повторный create того же email также возвращает `201` с тем же логическим ресурсом/тем же body shape, не создаёт вторую запись и сохраняет `confirmed/approved=true`, если email уже подтверждён. `409` возвращается только когда owner создаёт email, отличный от уже существующего.
- **Направление:** явная access matrix; owner check для create/update/delete до downstream call; узкий Protocol + DI; удалить не предусмотренную peer-service credential; tests для `401`, foreign `403` до lookup, owner `404`, first/same/different create, preservation confirmed state, всех malformed/invalid → `400`, downstream errors и публичного confirmation flow.
- **Зависимости:** обеспечить реальную сетевую приватность микросервиса до удаления peer credential.

### F-02 — MEDIUM — access policy не описывает утверждённый tenant selector

- **Evidence:** `docs/tasks/003_equestrian_entity.md:36-38` определяет `X-Equestrian-Service-Key` как несекретный фильтрующий идентификатор конюшни для запросов сайтов без пользовательской авторизации. Код этому соответствует: `services/backend/src/depends/services.py:111-123,132-153`; GET-роуты используют `get_read_equestrian_context`, например `services/backend/src/api/horses.py:34-46,131-139`. При этом общая policy в `AGENTS.md` и `SERVICES.md:11-18` говорит только «GET без авторизации» и не фиксирует обязательный selector.
- **Граница:** внешний anonymous consumer → backend tenant resolution.
- **Воздействие:** runtime tenant isolation является задуманной, но агенты могут ошибочно удалить selector, считая его нарушением Public Read.
- **Нормативный контракт:** название `X-Equestrian-Service-Key` сохраняется; это не секрет и не user authentication, а обязательный tenant selector для соответствующих Public Read GET. Отсутствующий или неверный selector возвращает `401`.
- **Направление:** runtime-механику не заменять slug/host mapping без нового решения; обновить policy/howto/docs и покрыть missing/invalid/valid selector, anonymous и authenticated scenarios.
- **Зависимости:** нет открытого продуктового решения.

### F-03 — HIGH — backend release typing gate красный

- **Evidence:** `cd services/backend && uv run mypy src` → exit 1, 6 ошибок в 3 файлах; в частности `src/repositories/user_management_repository.py:82` несовместимый тип условия. `uv run mypy src tests` → exit 1, 547 ошибок в 30 файлах.
- **Граница:** Protocol/service/repository contracts и достоверность тестовых doubles.
- **Направление:** сначала исправить source Protocol/signature typing, затем последовательными доменными пакетами привести tests/fakes/fixtures к тем же контрактам; не исключать tests из mypy.

### F-04 — MEDIUM — backend lint/format gate красный

- **Evidence:** `uv run ruff check src tests` → 3 ошибки: unused `data` в `tests/e2e/test_email_e2e.py:118`, unused `MagicMock` в `tests/unit/core/services/test_user_management_service.py:3`, unused `patch` в `tests/unit/repositories/test_user_management_repository.py:3`. `uv run ruff format --check src tests` → 11 файлов требуют форматирования.
- **Граница:** release quality/tooling.
- **Направление:** отдельная механическая пачка после typing, с non-mutating `lint` и `format-check` acceptance.

### F-05 — HIGH — Python async services имеют несовместимые quality gates

- **Evidence:** email: pytest 31 passed, mypy/Ruff/format-check pass, `uv run basedpyright` → 3 errors; notification: pytest 19 passed, mypy/Ruff/format-check pass, basedpyright → 5 errors. Ошибки включают неизвестный `send_email_task.delay` и несовместимые overrides seeder.
- **Граница:** declared toolchain ↔ фактическая типизация Python 3.14 сервисов.
- **Направление:** исправить обе группы ошибок; basedpyright является обязательной частью non-mutating gate наряду с mypy, Ruff, format-check и pytest.

### F-06 — HIGH — нет доказательства NATS/AsyncAPI совместимости и delivery semantics

- **Evidence:** инструкции существуют в `agents/howto/nats-jetstream-protocols.md`, а Quality Gate требует AsyncAPI validation. Однако в трёх проверяемых сервисах отсутствуют `docs/asyncapi.yaml`; поиск tests по `NatsJetstreamClient`, `pull_subscribe`, `ack()`/`nak()` не нашёл NATS tests. Код дублирует topology setup в `services/backend/src/clients/nats/client.py`, `services/notification-service/src/clients/nats/client.py`, `services/email-service/src/clients/nats/client.py`; реальные producer/consumer contracts не проверяются broker-тестом.
- **Граница:** backend event producer → notification consumer/producer → email consumer → Celery.
- **Направление:** привести проекты к существующему howto: канонический AsyncAPI; contract tests payload/header/subject; real JetStream tests stream provisioning, durable/filter, успешный ack, временная ошибка с nak/redelivery, poison message с достижением max-deliver, идемпотентность duplicate event и end-to-end backend producer → notification → email consumer. Архитектурное объединение клиентов — отдельное решение, не обязательное условие тестирования.

### F-07 — HIGH — Celery worker orchestration неполна

- **Evidence:** существующие `agents/howto/celery-protocols.md` и `agents/quality_gate.md` требуют Redis dependency. `.docker-compose/docker-compose.email.yml:49-64`: worker не имеет `depends_on` Redis, healthcheck/readiness и отдельной observability policy. `services/email-service/src/workers/celery_app.py:6-27` задаёт корректные queue/JSON/acks/TTL, но runtime доступность не проверялась. Тесты не содержат реального Redis/Celery delivery evidence.
- **Граница:** NATS handler → Celery broker → worker → SMTP/log repository.
- **Readiness contract:** единственный readiness probe worker — адресный `celery inspect ping` с ограниченным timeout. Prerequisites: healthy Redis dependency, стабильный адрес/nodename worker и сохранение ping timeout + Redis/worker logs в Quality Gate. Queue registration и canary task не являются readiness-критерием.
- **Направление:** добавить Redis health dependency и адресный ping health/readiness evidence. Отдельные integration tests общего audit scope сохраняются: real Redis/Celery enqueue→worker execution→result, retry/backoff/acks-late после временной ошибки, отсутствие повторной отправки для duplicate event и восстановление после worker restart; они не должны запускаться как readiness canary. Проверить DB session lifecycle у singleton `EmailProcessingService` (`containers/application.py:29-49`).

### F-07a — HIGH — утверждённая private-network модель микросервисов не обеспечена compose-контрактом

- **Evidence:** пользователь утвердил отсутствие peer-service authentication только для сервисов, доступных друг другу в локальной сети. При этом `.docker-compose/docker-compose.notification.yml:12-13` и `.docker-compose/docker-compose.email.yml:12-13` публикуют HTTP-порты на host interface; backend email client дополнительно использует bearer credential (`services/backend/src/clients/email_service/client.py:16-20`).
- **Граница:** внешняя сеть/host → внутренние microservice API.
- **Воздействие:** простое удаление credential без сетевой изоляции расширит анонимную поверхность микросервисов за пределы утверждённой trust boundary.
- **Направление:** сделать notification/email API доступными только внутри compose network либо явно привязать debug exposure к loopback/dev profile; только после этого удалить peer credential. Добавить network-boundary verification в Quality Gate.

### F-08 — HIGH — root release gate неполный и мутирующий

- **Evidence:** `Makefile:78` aggregate build включает backend/notification/frontend, но пропускает email. `Makefile:148-155` test/lint/format охватывают только backend; lint использует `ruff --fix`, format запускает isort/black и меняет worktree. Нет aggregate typecheck, email/notification/CMS tests, compose validation, migrations/readiness, smoke/e2e или clean-diff assertion.
- **Граница:** monorepo orchestration → релизоспособность всех сервисов.
- **Направление:** разделить fix-команды и check-команды; создать полный non-mutating aggregate gate только для включённого scope; добавить deterministic builds, migrations, controlled recreate, health/log evidence и rollback instructions.

### F-09 — MEDIUM — service catalog расходится с manifest/runtime

- **Evidence:** `services.manifest` содержит notification-service; таблица и описания `SERVICES.md:33-85` notification-service не содержат. README всё ещё утверждает, что root test/lint «зарезервированы», хотя команды существуют, и использует устаревшие `services/be`, `services/fe` названия.
- **Граница:** архитектурная документация и ownership.
- **Направление:** синхронизировать `SERVICES.md`, README и manifest, сохранив один каталог бизнес-границ в `SERVICES.md`.

### F-10 — MEDIUM — CMS frontend standalone typecheck нестабилен и lint не блокирует 401 warning

- **Evidence:** `npm test` → 40 files/380 tests pass; `npm run build` pass; `npm run lint` exit 0 при 401 warning. `npx tsc --noEmit`, запущенный параллельно с build, завершился exit 2 из-за отсутствующих `.next/types/...`; это подтверждает зависимость команды от изменяемого build cache/гонку. Крупные hotspots: `HorsesDeveloperDocumentationView.tsx` 1336 строк, `PriceEditModal.tsx` 1331, `PricesDeveloperDocumentationView.tsx` 1147, `useHorsesPage.ts` 907.
- **Граница:** CMS UI quality gate/build cache и maintainability.
- **Направление:** сделать deterministic type generation/typecheck без общей изменяемой `.next`; последовательно классифицировать warnings и повышать правила до blocking; декомпозировать hotspots по behavior с тестами, не механически.
- **Примечание:** повторный typecheck после build не выполнялся, чтобы не скрыть воспроизводимую race; build сам прошёл.

### F-11 — MEDIUM — небезопасные dev defaults в конфигурации

- **Evidence:** `services/backend/src/settings.py:12,27-36` содержит рабочие-looking defaults для JWT/DB/S3; `services/backend/.env.example:12` содержит не placeholder-подобный `SECRET_KEY`, а email `.env.example` содержит фиксированный Redis password.
- **Граница:** config/secrets → deployment.
- **Направление:** production fail-fast для секретов, безопасные placeholders в examples, secret scanning и rotation checklist. Наличие этих значений в production не проверено.

## Риски и непроверенные гипотезы

- **R-01 (HIGH):** `EmailProcessingService` зарегистрирован singleton с factory-created repository/session (`services/email-service/src/containers/application.py:29-49`). Возможны разделение одной session между сообщениями, утечки и некорректные транзакции. Нужен concurrency/integration test и уточнение lifecycle; статикой дефект исполнения не доказан.
- **R-02 (HIGH):** NATS handlers используют broad exception flow и best-effort parsing (`email ...handler.py:53-64`); без broker evidence неизвестно, достигаются ли max-deliver/DLQ semantics и не создаются ли дубликаты между DB log, NATS ack и Celery enqueue.
- **R-03 (MEDIUM):** `notification-service` вызывает `uuid.UUID(headers.get(...))`; отсутствующий header способен дать `TypeError`, тогда как перехватывается только `ValueError` (`clients/nats/handlers/callback_request.py:29-32`). Нужен focused test; типизация уже указывает на слабый boundary.
- **R-04 (MEDIUM):** миграции backend содержат пустые historical revisions; корректность полного upgrade с нуля и downgrade не проверена на новой PostgreSQL.
- **R-05 (MEDIUM):** крупные backend repository/service файлы (до 1111/843/799 строк) повышают связанность, но размер сам по себе не дефект. Нужна dependency/complexity карта перед декомпозицией.
- **R-06 (MEDIUM):** Docker images не собирались `--no-cache`, сервисы не перезапускались, live health/SMOKE/SMTP/Redis/PostgreSQL/NATS не проверялись; статические и unit PASS не доказывают runtime release.
- **R-07 (LOW):** compose `config -q` всех пяти включённых файлов проходит с локальными env, но external network existence и cross-project DNS/order старта не доказаны.

## Принятые архитектурные решения

1. User authentication и authorization выполняет основной backend до обращения к микросервису.
2. Peer-to-peer authentication между private микросервисами не используется. Исключение направления: при обращении микросервиса к основному backend используются только `/api/service/...` endpoint и специальный service key; cookie и equestrian key там недопустимы.
3. Email create/update/delete — owner-only Protected Write без privileged override. `POST /emails/send-confirmation` и `PATCH /emails/confirm` — публичные исключения confirmation flow без CMS session.
4. `X-Equestrian-Service-Key` сохраняет название и служит несекретным tenant selector для соответствующих Public Read GET. Missing/invalid selector → `401`.
5. Все обнаруженные mypy/Ruff/format-check/basedpyright ошибки подлежат исправлению; basedpyright нельзя удалить из declared gate вместо исправления.
6. NATS/Celery должны соответствовать существующим `agents/howto`; минимальная реальная integration matrix задана в F-06/F-07.
7. Email access statuses: unauthenticated `401`; authenticated foreign target `403` до lookup/downstream; owner получает `404` только при отсутствии требуемого email; любой malformed/invalid request этого контракта нормализуется в `400`.
8. Идемпотентный create того же email возвращает `201` с существующим `EmailResponse`, не создаёт второй ресурс и не сбрасывает подтверждение; `409` используется только для другого email при уже существующем owner email.
9. Celery readiness определяется только адресным `celery inspect ping`; Redis health/timeout/logs обязательны как prerequisites/evidence, queue inspection и canary не входят в readiness.

## Access verification results

Полного live access smoke не было. Статически подтверждено:

| Поверхность | Ожидание | Факт | Статус |
|---|---|---|---|
| Контентные GET с tenant context | Public Read без user auth, обязательный несекретный `X-Equestrian-Service-Key`; missing/invalid → 401 | runtime соответствует selector-модели, policy её не описывает | ⚠️ agent/policy F-02 |
| Email create/update/delete | Owner-only Protected Write; 401 anonymous, 403 foreign до lookup, owner 404 при missing | backend route анонимный | ❌ project F-01 |
| Email send-confirmation | публичное исключение confirmation flow | анонимный proxy, но downstream получает лишний peer credential | ⚠️ project boundary F-01/F-07a |
| Email confirm | публичное исключение по контрольной строке | анонимный proxy, но downstream получает лишний peer credential | ⚠️ project boundary F-01/F-07a |
| Остальные writes | auth + tenant/permission | по выборочной статике используют current user/protected context | ⚠️ нужен полный generated route matrix + API tests |
| Повторный create того же email | 201 + существующий `EmailResponse`, без второй записи, confirmed сохраняется | явный idempotency contract не доказан | ❌ project F-01 |
| Create другого email при существующем | 409 | явный proxy contract не доказан | ❌ project F-01 |
| Некорректный email request | всегда 400, включая framework validation | FastAPI/Pydantic обычно возвращает 422 | ❌ project/policy F-01 |
| Чужие ресурсы | 403 до lookup/mutation независимо от scope | email proxy ownership отсутствует | ❌ F-01 |

Будущий OpenSpec обязан сгенерировать полную матрицу `method | path | access class | tenant selector | owner rule | without auth | with auth | foreign resource | validation status | tests` для всех backend routes, а не только изменяемых.

## Будущие изменения в проектах

Пакеты должны иметь непересекающийся ownership и выполняться в указанной зависимости. Это runtime/config/test/docs изменения репозиториев:

1. **P-A — Network/access foundation:** закрыть host exposure notification/email, удалить peer credential после подтверждения network isolation; полная endpoint matrix по принятым решениям.
2. **P-B1 — Backend email boundary:** Protocol/DI/error mapping; owner-only auth для create/update/delete без privileged override; idempotent same-email create `201` с сохранением confirmed; different-email conflict `409`; endpoint-specific normalization всех invalid requests в `400`; публичные send-confirmation/confirm; focused access tests. Зависит от P-A.
3. **P-B2 — Backend source typing:** repository/protocol/service typing; не пересекается с P-B1.
4. **P-B3 — Backend typed tests и style:** доменные последовательные пачки tests, затем Ruff/format; зависит от P-B1/P-B2.
5. **P-M1 — Messaging contracts:** AsyncAPI и contract tests без изменения topology; общий владелец контрактов, затем adapters последовательно.
6. **P-M2 — JetStream/Celery infrastructure:** матрица F-06/F-07, delivery/idempotency/session lifecycle; Celery readiness только через адресный `inspect ping`, integration tests запускаются отдельно, не как readiness canary; зависит от P-M1.
7. **P-E/P-N — Email и notification typing:** раздельные basedpyright-пакеты; basedpyright остаётся обязательным.
8. **P-F1 — CMS deterministic gate:** isolated Next type generation, blocking lint policy, tests/build; только `services/frontend`.
9. **P-F2+ — CMS hotspots:** отдельные behavior-oriented пакеты horses/prices/docs и затем прочие features, после P-F1.
10. **P-O — Orchestration/catalog:** root non-mutating aggregate gate, все включённые builds, migrations/readiness/health/rollback и `SERVICES.md`/README; после сервисных пакетов.
11. **P-Q — Единый Quality Gate:** clean worktrees, all checks, no-cache images, controlled runtime, PostgreSQL/NATS/Redis/Celery evidence, access SMOKE timings; findings возвращать владельцам и повторять полностью.

## Требуемые доработки агентов/howto/policy

**Verdict: REQUIRED.** Текущие инструкции противоречат утверждённым endpoint-specific решениям либо не содержат достаточного acceptance. Это отдельный documentation ownership; изменения не заменяют runtime/project work.

| Файл | Проблема | Требуемое изменение контракта | Acceptance |
|---|---|---|---|
| `AGENTS.md` | Public Read описан только как GET без auth; Protected Write — как все POST/PATCH/DELETE без перечисления новых исключений | Зафиксировать обязательный несекретный `X-Equestrian-Service-Key` как tenant selector для соответствующих Public Read GET и `401` для missing/invalid. Добавить email `send-confirmation`/`confirm` как публичные write-исключения; create/update/delete — owner-only без privileged override | Router передаёт Planner точные исключения и owner rule; шаблон access matrix различает user auth и tenant selector |
| `agents/planner.md` | Матрица не содержит tenant selector/owner/validation status; примеры предписывают `422` malformed request | Расширить access matrix колонками `tenant selector`, `owner rule`, `validation status`. Для email change фиксировать 401/403-before-lookup/404-owner, same-email `201`, different-email `409`, все invalid `400`; не переносить email-specific `400` глобально на остальные endpoints | Proposal не может стать apply-ready без всех email scenarios и явных endpoint-specific exceptions |
| `agents/backend.md` | Общая инструкция разрешает `422` для структурных FastAPI ошибок и описывает privileged Protected Write без owner-only email исключения; peer client guidance допускает credentials | Добавить узкий email proxy contract: owner-only, no scope override; validation handler/DTO boundary нормализует даже framework errors в `400`; idempotent same-email create `201` с тем же `EmailResponse` и сохранением confirmed; `409` только для другого email. Зафиксировать anonymous peer calls только внутри проверенной private network; service key только microservice → main backend `/api/service/...` | Реализация и unit tests подтверждают status/body/state matrix; foreign denial происходит до client call; второй ресурс не создаётся |
| `agents/quality_gate.md` | QG допускает структурный `422`, не проверяет owner-only/no-override, network boundary, basedpyright и точный Celery readiness | Добавить email-specific checks: любой invalid → `400`, anonymous/owner/foreign и отсутствие privileged bypass, idempotency/confirmed preservation. Добавить basedpyright для email/notification, проверку private network и non-mutating aggregate gate. Celery readiness — только адресный `inspect ping` с timeout/log evidence после healthy Redis; queue/canary не требовать для readiness. Real Celery/NATS integration tests оставить отдельным blocking gate | APPROVED невозможен без полной access/status matrix, ping evidence с worker address/time, integration results и clean worktrees |
| `agents/howto/celery-protocols.md` | Есть Redis `depends_on`, но нет нормативного readiness contract и разделения readiness/integration | Описать healthy Redis prerequisite, стабильный worker nodename, адресный `celery inspect ping`, timeout и сбор логов. Явно запретить queue registration/canary как обязательную readiness-проверку; сохранить отдельные integration tests enqueue/retry/acks-late/idempotency/restart | Compose/QG используют адресный ping; failure/timeout красит readiness; integration suite запускается отдельно |
| `agents/howto/nats-jetstream-protocols.md` | Реализационный паттерн есть, обязательная real-broker acceptance matrix не закреплена | Добавить отдельную матрицу stream/durable/filter, ack, nak/redelivery, max-deliver poison message, duplicate idempotency и backend→notification→email compatibility; не связывать её с Celery readiness | Отсутствие/skip real JetStream tests не считается PASS |

`agents/backend.md` уже содержит service endpoint/client разделы, поэтому требуется точечная корректировка контрактов, а не создание параллельного нового howto. `agents/howto/nats-jetstream-protocols.md` и `agents/howto/celery-protocols.md` существуют и остаются нормативной базой.

Consumer Frontend должен оставаться вне этого change, если пользователь отдельно не расширит scope.

## Оставшиеся открытые вопросы

Нет. Owner/status/idempotency/validation contract email и механизм Celery readiness утверждены. Детали реализации должны быть выбраны в design будущего OpenSpec без изменения этих outcomes.

## Выполненные команды

| Команда | Результат |
|---|---|
| backend `uv run pytest` | 918 passed, 5 skipped |
| backend `uv run mypy src` | FAIL: 6 errors / 3 files |
| backend `uv run mypy src tests` | FAIL: 547 errors / 30 files |
| backend `uv run ruff check src tests` | FAIL: 3 errors |
| backend `uv run ruff format --check src tests` | FAIL: 11 files |
| email `uv run pytest` | 31 passed |
| email mypy / Ruff / format-check | PASS |
| email `uv run basedpyright` | FAIL: 3 errors |
| notification `uv run pytest` | 19 passed |
| notification mypy / Ruff / format-check | PASS |
| notification `uv run basedpyright` | FAIL: 5 errors |
| frontend `npm test` | 40 files, 380 tests passed |
| frontend `npm run lint` | exit 0, 401 warnings |
| frontend `npx tsc --noEmit` параллельно с build | FAIL: `.next/types` race/missing files |
| frontend `npm run build` | PASS |
| `docker compose ... config -q` infra/backend/notification/email/frontend | PASS для всех 5 |
| статические `rg` по API auth, imports, NATS, secrets, TODO, tests | выполнено; evidence включён выше |

## Не выполнено и ограничения

- Не читался и не проверялся Consumer Frontend (`services/site-ad`, `services/site-*`) по прямому запрету.
- Не запускались auto-fix/format команды; tracked файлы сервисов остались чистыми.
- Не запускались Docker builds, recreate, migrations, live API SMOKE, e2e, SMTP и реальные PostgreSQL/NATS/Redis/Celery проверки: они изменяют/требуют runtime state и должны выполняться в контролируемом Quality Gate после утверждённого OpenSpec.
- Не выполнены dependency vulnerability/license scans и внешняя проверка актуальных CVE.
- Полная семантическая корректность всех бизнес use cases недоказуема статикой и существующими тестами; отчёт не заявляет «отсутствие любых ошибок», а фиксирует найденное evidence и пробелы доказательства.

## Изменения текущей работы

- Удалён только отклонённый незакоммиченный каталог `openspec/changes/refactor-codex-045`.
- Создан только этот отчёт: `docs/reports/045-project-architecture-audit-brief.md`.
- Runtime-код, тесты, specs, `docs/plans` и Consumer Frontend не изменялись.
