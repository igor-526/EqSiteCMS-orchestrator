# Единые ошибки Яндекс-клиентов и HTTP-контракт peers

Дата: 2026-07-17. Тикет: [096](../../../docs/tasks/096_yandex_client_exceptions.md). Сервисы: `services/yandex-service`, `services/ya-metrica-service`. Статус: финальный approval получен явным «Начинай» после показа артефактов; пять BE units завершены, далее обязательный QG. Исторически PLAN-1/PLAN-2 были planning-only до approval; PLAN-4 меняет только процессные документы.

## Context

Основание: [proposal](proposal.md). Manifest подтверждает фактические пути; записей двух сервисов в `SERVICES.md` нет. Зарегистрированных OpenSpec stores нет: используется repo-local planning home `/home/igor/projects/eqSiteCMS`, change root `/home/igor/projects/eqSiteCMS/openspec/changes/normalize-yandex-client-failures`.

Evidence из прочитанного кода и тестов, не исторические намерения:

- В обоих сервисах уже существует самостоятельный `core.exceptions.yandex.YandexClientException(status: int, error, error_description)`, `.message`; `ClientError.status_code=400`, `AppError=500`, `AlreadyExistsError=409`.
- Три клиента используют `httpx`, делают `response.json()` до проверки статуса, не оборачивают transport/JSON/DTO failures. Тесты OAuth и Метрики прямо закрепляют эти gaps как propagation — ожидания надо заменить, не оставить старую утечку ради зелёных тестов.
- OAuth service ловит `YandexClientException` на обоих вызовах; оба Metrica service не ловят. Ya-metrica service допускает TypeError при `int(None)` и частичный успешный результат при повреждённых счётчиках; клиент должен проверять upstream целиком.
- Main handlers сохраняют `AppError.status_code`, request validation уже `400`. Нет централизованного framework/unexpected error mapping, slash redirect включён по умолчанию.
- Все перечисленные peer routes без user/service auth dependency; `access_token` — зашифрованный OAuth input, не аутентификация caller. DELETE отсутствующего ID идемпотентно `204`; отсутствующий connection возвращает `200 counter=null` — это сохранить.
- Read-only `docker inspect`: yandex опубликован `0.0.0.0:8007` и `[::]:8007`, ya-metrica — `0.0.0.0:32768` и `[::]:32768`, оба на `eqsitecms_network`. Это подтверждает host exposure, но не проверку firewall/доступа из Интернета. Private-default предположение сейчас НЕ подтверждено; нельзя считать чувствительные routes безопасными публичными endpoints.
- NATS-контрактов в `docs/asyncapi*` этих двух сервисов не найдено; задача меняет HTTP, не события/subjects.

## Goals / Non-Goals

Цель: `client failure → локальный YandexClientException → сервисный ClientError → HTTP 400`, включая прямую и проксированную Метрику, с сохранением успешных DTO и безопасной диагностикой. Дополнительная предложенная цель — буквальное множество HTTP `200/204/400` в этих двух приложениях.

Вне границ: backend/frontend/SEO, новые роли/auth, изменение external Яндекс OAuth wire contract, aiohttp-миграция, DI refactor, retry, новые endpoints, БД/миграции, события, общая Python библиотека, runtime/compose изменения в PLAN-1. Сетевой hardening при недопустимости существующей экспозиции — отдельный согласованный change, а не скрытое расширение реализации.

## Decisions

### 1. Локальное типизированное исключение

Сохранить имя и местоположение двух классов, расширить `status` до `int | None`, добавить при необходимости безопасную категорию. Для transport/timeout без ответа — `None`, а не выдуманные 408/500/504. Числовой status upstream не становится статусом peer HTTP. Сохранить совместимость числовых вызовов и `.message`, но не сырой upstream error_description.

Оборачивать всю обычную операцию HTTP client lifecycle + разбор + method-level validation. Предпочтительны узкие httpx/JSON/Pydantic catches с последним `except Exception` на внешней границе операции клиента для остальных обычных отказов, безопасной категорией и chaining. Уже типизированное исключение пропускать; `BaseException`, cancellation, KeyboardInterrupt/SystemExit не ловить. Не делать blanket catch в API или во всём use case, не маскировать ошибки repository под YandexClientException. HTTP clients закрываются при успехе и ошибке. Никаких автоматических повторов OAuth code exchange.

Альтернативы: оборачивать только TimeoutException недостаточно (transport/JSON/DTO останутся); общий cross-service import нарушает независимость; глобально перехватывать httpx в main обходит границу клиент→сервис и не удовлетворяет запросу.

### 2. Валидация upstream на стороне клиента

Ошибки OAuth high-level DTO validation и непригодного целиком DTO `YaMetricaServiceClient.get_metrica_counters` должны завершаться локальным исключением. В ya-metrica клиенте проверить top-level `rows/counters`; использовать локальную client schema/validator без импорта соседнего сервиса и без требования валидности каждого элемента для успеха всего ответа. Timeout/transport/HTTP failure, невалидный целиком JSON и непригодный top-level ответ по-прежнему дают `YandexClientException → ClientError → 400`.

По ответу Q3 «Нет, сохранить частичный список» некорректный отдельный счётчик (`id/site` или не-object элемент) пропускается по существующему поведению; корректные элементы возвращаются частичным `200`, в том числе через peer client. Это пропуск элемента, а не отказ всего клиентского вызова. Сохранить dict Protocol, успешные числовые строки и прежний mapping `total/items`; не вводить новые правила пересчёта `total`, пустого результата или случая, когда все элементы пропущены. Исключить raw TypeError/ValueError и сырой ответ в логах, не заменяя допустимый partial success полным отказом.

### 3. Преобразование сервисом

OAuth сохранить отдельные безопасные сообщения обмена кода/профиля. В обоих Metrica service добавить `except YandexClientException` непосредственно вокруг client call, `raise ClientError(<фиксированное русское сообщение>) from ex`. Не передавать `.message` с непроверенным upstream текстом в detail. Не менять DB errors на интеграционные. При OAuth failure не вызывать сохранение; при отказе внутри транзакции должен произойти rollback до HTTP response.

### 4. Согласованный буквальный HTTP-охват (Q1)

Локально в каждом main централизовать handlers: ClientError→400; остальные AppError/409→400 с безопасным detail; RequestValidationError→400 с сериализуемыми безопасными полями, без отражения input/token; Starlette HTTPException/routing→400; unexpected/ResponseValidationError→400 generic detail с внутренней безопасной диагностикой. Ошибки должны выйти из транзакции до HTTP handler, иначе можно случайно commit вместо rollback. Generic handler не должен отдавать traceback даже при debug; integration tests должны проверять response с подавлением test-client rethrow (`raise_app_exceptions=False`/`raise_server_exceptions=False`), а не ловить тестовое исключение.

Ответ Q1 «Все ответы двух сервисов» закрепляет полный application/framework охват, а не только integration failures. Отключить redirect_slashes, неправильный slash→400; health/docs/openapi/oauth2-redirect успешны `200`; DELETE успешен `204` без тела. Новых status codes нет. Нельзя менять `AppError` глобально во всех сервисах. Граница гарантии остаётся на уровне приложений: proxy/process/network и уже начатый streaming response не нормализуются задним числом.

Согласованный blanket HTTPException mapping внутри двух peers включает 401/403 только как код отказа, никогда как разрешение операции. Существующие права и проверки не меняются; внешние main backend auth/tenant selector остаются `401/403`. Новые auth checks и network hardening не входят в ownership этой задачи.

### 5. Access matrix и доверенная граница (Q2)

Полная нормативная матрица Y1..Y9/M1/H1/D1/R1 и причины исключений: [HTTP delta spec](specs/yandex-peer-http-contract/spec.md#requirement-access-matrix-существующих-peer-endpoints). Она является также access matrix этого design; не заменяется условным «все GET публичны».

Ответ Q2: «Это dev окружение. На production такого не будет». Сохраняются существующие credential-less peer exceptions и права в заявленном dev окружении, без переклассификации чувствительного чтения в user Public Read. Отдельный security change не требуется до apply или dev live verification; окончательный approval реализации был отдельным обязательным gate и уже получен явным «Начинай» после показа артефактов. Текущее host exposure не объявляется устранённым, а заявление пользователя не доказывает production isolation. Подтверждение защиты чувствительных APIs от внешних anonymous callers остаётся явным условием production deployment/release; без него production выпуск блокируется. QG-ENV фиксирует фактические bindings и это ограничение read-only, а не требует исправлять dev сеть. Auth/network changes вне ownership; не вводить X-Service-Key и не заимствовать backend auth.

## Risks / Trade-offs

- `400` для внутренних аварий скрывает 5xx от мониторинга → безопасные error categories/correlation, QG проверяет отсутствие silent success; полный охват подтверждён Q1, финальный apply approval получен отдельным «Начинай» после показа артефактов.
- Изменение 409/404/405/redirect может сломать callers → контрактные regression tests и release notes. Partial counters сохраняются по Q3: регрессия должна отличать пропуск элемента от непригодного целиком ответа.
- `.message`, logger.exception traceback, httpx URL и query с OAuth token могут раскрыть секрет → не выводить raw exception/body/traceback с секретом, тесты marker+caplog/capsys; chaining сам по себе не разрешает его печать.
- Generic handler может перехватить слишком рано и commit → сохранить transaction boundary; API rollback tests, без перехода в 200.
- Network exposure чувствительных APIs существует в заявленном dev окружении → Q2 закрыт ответом, не prerequisite отдельного security change до apply/dev live. Production isolation не проверена: read-only QG-ENV фиксирует риск; подтверждённая защита от внешних anonymous callers обязательна для production deployment/release, remediation вне ownership.

## Execution units

### Deliverables / ownership

| Deliverable | Владелец | Непересекающаяся зона |
|---|---|---|
| A | Backend, yandex | Только перечисленные в tasks клиенты, exceptions, Protocols, два integration service, main и связанные тесты внутри `services/yandex-service`; последовательные YA-BE units |
| B | Backend, ya-metrica | Клиент, client schemas, exceptions, Protocol, Metrica service, main и связанные тесты внутри `services/ya-metrica-service`; последовательные M-BE units |
| C | Quality Gate | Только lane-specific evidence в `docs/reports/normalize-yandex-client-failures/`; runtime/specs read-only |
| D | Router/Planner после approval | Этот change и его specs; синхронизация main specs/archive только после общего APPROVED; не поручается backend units |
| E | Backend, bounded tooling | Только `scripts/stackctl` и новый `scripts/tests/stackctl.test.mjs`; последовательные units TOOL-1 → TOOL-2. Ни сервисный код A/B, ни compose/env/network/auth, ни другие registries |

Указание сервиса — ownership, не execution boundary. Каждая реализационная unit ограничена одним slice, не более ~8–12 существенных действий с учётом тестов; проверка одной сервисной группой. При превышении бюджета исполнитель возвращает partial/split, не расширяет invocation.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| YA-BE-1 | Backend | A | два yandex clients, exception/Protocol, их unit tests | финальный apply approval | yandex `make format test lint` |
| YA-BE-2 | Backend | A | OAuth/Metrica services и их unit tests | YA-BE-1 | yandex `make format test lint` |
| YA-BE-3 | Backend | A | main и API/transaction tests | YA-BE-2 | yandex `make format test lint` |
| M-BE-1 | Backend | B | клиент Метрики, client schema, exception/Protocol и client tests | финальный apply approval | ya-metrica `make format test lint` |
| M-BE-2 | Backend | B | Metrica service, main, service/API tests | M-BE-1 | ya-metrica `make format test lint` |
| TOOL-1 | Backend | E | `scripts/stackctl`, `scripts/tests/stackctl.test.mjs` | показ и подтверждение tooling scope после PLAN-5; сохранённый ENV-01 | одна hermetic группа `node --test scripts/tests/stackctl.test.mjs`, без реального Docker |
| QG-ENV | Quality Gate | C | `environment.md` report | YA-BE-3, M-BE-2, TOOL-1 | ENV-R1: rebuild/health завершены; SQL auth blocked ENV-02, завершается через ENV-R2 |
| TOOL-2 | Backend | E | Только `scripts/stackctl`, `scripts/tests/stackctl.test.mjs` | PLAN-6, TOOL-1, ENV-02 | одна hermetic группа `node --test scripts/tests/stackctl.test.mjs`, без Docker/runtime |
| ENV-R2 | Quality Gate | C | Только `environment.md` report и свои checklist IDs | TOOL-2, сохранённый ENV-R1 | одна SQL-auth/health группа двух БД/peers, без rebuild/ready/repair; закрывает QG-ENV.1 |
| QG-BE | Quality Gate | C | `backend.md` report, runtime read-only | QG-ENV | единый backend review evidence, оба service test/lint |
| QG-CONTRACTS | Quality Gate | C | `contracts.md` report | QG-ENV | specs/access/API traceability |
| QG-LIVE | Quality Gate | C | `live.md` report | QG-BE, QG-CONTRACTS; dev readiness из QG-ENV | один integration HTTP smoke SM-01..04 |
| YA-CP | Backend | A, операционный checkpoint | Только assigned implementation paths YA-BE-1/2/3; один commit в YA repo | QG-LIVE | staged paths/diff → commit → чистый YA status, SHA в handoff |
| M-CP | Backend | B, операционный checkpoint | Только assigned implementation paths M-BE-1/2; один commit в M repo | YA-CP | staged paths/diff → commit → чистый M status, SHA в handoff |
| DOCS-CP-PRE | Planner | D + commit-only C/E | Этот change, запрос 096, environment/backend/contracts/live evidence; те же строго два root tooling paths по handoffs TOOL-1/TOOL-2 | M-CP, QG-LIVE, TOOL-2, ENV-R2 | own root commit по явным paths; неизменность foreign content/index, SHA для изоляции |
| QG-CLEAN-SETUP | Quality Gate | C, операционный setup | Только отдельный checkout root и nested service worktrees, workspace-local ignored dependencies/caches; оригинальные sources read-only | DOCS-CP-PRE | одна readiness/status группа без make: SHA manifest, реальные пути, tools/dependencies и clean root/all services |
| QG-FORMAT | Quality Gate | C | Изолированный checkout; `format.md` evidence; исправления только через владельцев A/B/E | QG-CLEAN-SETUP | только из isolated root на чистом worktree: `make format`, `make lint`, `make test`; evidence/checklist после verification |
| DOCS-CP-FORMAT | Planner | D + commit-only evidence C | Только tasks этого change и `format.md` report в оригинальном root | QG-FORMAT | перенос safe evidence, отдельный own docs commit; clean evidence isolated checkout и неизменность foreign original |
| QG-SYNTH | Quality Gate | C | `synthesis.md` report | QG-ENV, QG-BE, QG-CONTRACTS, QG-LIVE, QG-FORMAT, DOCS-CP-FORMAT | единый итог APPROVED/REWORK, включая environment и format evidence |
| SPEC-FINAL | Planner | D | change и три соответствующие main specs, включая repository-process-tooling | QG-SYNTH APPROVED | sync → strict validation → archive → handoff Router для skill task-finalize; gates самих skills |

```text
финальный apply approval ─┬→ YA-BE-1 → YA-BE-2 → YA-BE-3 ─┐
                └→ M-BE-1 → M-BE-2 ───────────────┤
показ/подтверждение tooling scope → TOOL-1 ────────┴→ QG-ENV / ENV-R1 (rebuild done, ENV-02 blocked)
ENV-02 → PLAN-6 → TOOL-2 → ENV-R2 (только SQL auth/health; завершает QG-ENV) ─┬→ QG-BE ─────┐
                                                                       └→ QG-CONTRACTS ──┴→ QG-LIVE → YA-CP → M-CP → DOCS-CP-PRE → QG-CLEAN-SETUP → QG-FORMAT → DOCS-CP-FORMAT → QG-SYNTH
QG-SYNTH учитывает evidence всех пяти lanes, включая QG-ENV.
QG-SYNTH APPROVED → SPEC-FINAL (sync specs → strict validate → archive → skill task-finalize через Router)
```

YA/M units независимы между сервисами, могут идти параллельно; внутри A/B строго последовательно. Quality Gate общий после обеих реализаций, не отдельный запуск полного gate после каждой. QG-FE-AUTO/QG-FE-MANUAL неприменимы: UI diff отсутствует. ContextFiles каждого unit даны в [tasks](tasks.md), не общий пакет на всю задачу.

### PLAN-7 / BE-01: ограниченная доработка безопасной ASGI-границы

Это устранение P1 в уже утверждённой гарантии controlled logs (Decision 4, API-03), не новый scope и не новый approval gate. [BE-01](../../../docs/reports/normalize-yandex-client-failures/backend.md#be-01--p1--blocking-raw-unexpected-exception-попадает-в-штатный-asgi-server-log) подтверждает: оба приложения отвечают safe400, но Starlette ServerErrorMiddleware повторно выбрасывает unexpected exception, после чего Uvicorn печатает raw exception/cause. TestClient с подавлением app exceptions проверяет только response и не доказывает безопасность server log. Отмеченные QG-BE tasks означают завершённый review, **не passed**; исходный verdict FAILED сохраняется до targeted повторной проверки. Пять завершённых BE units и остальной checklist не переоткрываются.

#### Ограничения решения и регрессии

- Исполнитель самостоятельно выбирает кодовое решение локально в main каждого peer. Ordinary unexpected failure до начала HTTP response должен обрабатываться на безопасной ASGI-границе до передачи raw exception server-level rethrow/logging. Сохранить controlled diagnostic category; запретить raw exception/body/URL, секреты и traceback, включая chained cause. Нельзя решать дефект отключением server logger/диагностики или подменой Uvicorn run_asgi в тесте.
- Сохранить rollback до формирования error response: не поглощать исключение внутри transactional route. Cancellation и другие BaseException не нормализовать в 400; уже начатый response не перехватывать для замены/второго ответа. Существующая debug-safe policy сохраняется. Startup/lifespan/proxy/process ошибки не входят в этот fix.
- Auth/access matrix, статусы/схемы/headers, success200/204, slash policy, partial200/empty/total и main backend 401/403/tenant selector не меняются. Не добавлять endpoints, auth, cross-service imports, третьи сервисы, новые файлы или изменения dependencies/tooling.
- Регрессия API-03/BE-01 в каждом сервисе: реальный `uvicorn.protocols.http.h11_impl.RequestResponseCycle.run_asgi(main.app)` с hermetic transport/h11 и in-memory failing route, synthetic secret в unexpected exception **и chained cause**. Наблюдать фактический HTTP400, отсутствие обоих маркеров в response и server log, отсутствие traceback в server log; безопасная категория остаётся наблюдаемой в controlled logs. Изоляция/восстановление route/logger/app state обязательны. Не заменять это TestClient-only или mock run_asgi доказательством; TCP/Docker/rebuild не нужны.
- Сохранить existing direct API safe checks, debug policy и отрицательные гарантии cancellation/BaseException/начатого response; тесты rollback из существующей сервисной группы остаются зелёными. Тесты и harness помещаются в назначенные existing test files. Если ownership недостаточен — blocker Router, не расширять самостоятельно.

#### Execution units и точечные context packs

| Unit | Профиль | Deliverable / ownership | Зависит от | Одна verification group | contextFiles |
|---|---|---|---|---|---|
| YA-FIX-HTTP-LOG | Backend | A: только `services/yandex-service/src/main.py`, `services/yandex-service/tests/api/test_exception_handlers.py`; свои task IDs | PLAN-7, QG-BE BE-01 | `make -C services/yandex-service test lint`, workspace-local UV cache | ядро AGENTS/Backend; Decision 4 и эта rework-секция; tasks секция 6a; backend report только BE-01 и reproducer; эти два owned файла |
| M-FIX-HTTP-LOG | Backend | B: только `services/ya-metrica-service/src/main.py` и existing `tests/api/test_counters_api.py` **или** `tests/api/test_health.py` внутри M; свои task IDs | PLAN-7, QG-BE BE-01 | `make -C services/ya-metrica-service test lint`, workspace-local UV cache | ядро AGENTS/Backend; Decision 4 и эта rework-секция; tasks секция 6b; backend report только BE-01 и reproducer; main и выбранный existing test file |
| QG-BE-R1 | Quality Gate | C: только existing backend report и свои task IDs, runtime read-only | оба FIX handoffs | targeted review BE-01 + server-boundary regression/service test-lint evidence | ядро QG; эта секция; tasks 6c; оба fix handoffs и только их main/test diff; backend BE-01/reproducer |
| QG-CONTRACTS-R1 | Quality Gate | C: только existing contracts report и свои task IDs, runtime read-only | оба FIX handoffs, завершённый исходный QG-CONTRACTS | при влиянии на HTTP boundary traceability — точечная сверка Decision 4/API-03 и HTTP spec, иначе документированное неприменимо | ядро QG; эта секция; tasks 6d; оба fix handoffs/main-test diff; только относящиеся строки existing contracts report и HTTP spec |

Backend units независимы, каждый — один сервисный slice (main + existing test file), три checklist действия implement/regression/verify, без runtime/commits. Для M исполнитель выбирает один из двух existing test files и фиксирует выбор в handoff, а не расширяет ownership на оба. При параллельной реализации запись своих task IDs в общем checklist сериализуется Router; не перезаписывать файл целиком и чужие строки QG-CONTRACTS. Точные относительные пути, контекст и task IDs закреплены также в [tasks](tasks.md#6a-ya-fix-http-log--безопасная-asgi-граница-yandex-профиль-backend).

#### Rework DAG и сохранение checkpoints

```text
QG-BE review done / FAILED (BE-01) → PLAN-7 ─┬→ YA-FIX-HTTP-LOG ─┐
                                          └→ M-FIX-HTTP-LOG ──┴─┬→ QG-BE-R1 passed ────────────────┐
исходный QG-CONTRACTS done ──────────────────────────────────────┴→ QG-CONTRACTS-R1 passed / N/A ───┴→ QG-LIVE
QG-LIVE → YA-CP → M-CP → DOCS-CP-PRE → QG-CLEAN-SETUP → QG-FORMAT → DOCS-CP-FORMAT → QG-SYNTH
QG-SYNTH APPROVED → SPEC-FINAL
```

Это обязательная rework-вставка в основной DAG, а не обход FAILED по старым checked tasks. До LIVE Router читает оба fix handoffs, QG-BE-R1 passed и итог точечного CONTRACTS-R1; исходные ENV readiness/SQL evidence сохраняются. LIVE использует актуальные артефакты peers по своему протоколу; PLAN-7 и FIX units сами runtime не меняют. YA-CP/M-CP сохраняют прежние allowlists: main и все разрешённые здесь existing test files уже входят в секции YA-BE-3/M-BE-2. Checkpoints учитывают fix handoffs и включают исправления в прежний один сервисный commit, без новых paths/commit units; последующий DAG и root tooling allowlist не меняются.

### TOOL-1: границы и локальная verification group

ENV-01 подтверждён сохранённым [environment report](../../../docs/reports/normalize-yandex-client-failures/environment.md): peers healthy/HTTP 200 и DSN consistency не заменяют rebuild и SQL auth; attempts=0. Поддержка не расширяется на SEO или весь стек. Новый ADDED requirement [repository-process-tooling](specs/repository-process-tooling/spec.md) нужен, поскольку появляется проверяемый контракт новых aliases/DB auth, а не меняется API peers.

Точные изменения: PROFILES `ya-metrica` (files `ya_metrica`, serviceKeys peer/migration как существующий compose, но без добавления миграций в ready) и ограниченный `infra` (files `infra`, serviceKeys только `db-yandex/db-ya-metrica`); SERVICES — только три новых alias/container mappings, DB `buildable:false`; DB_CONFIG — два новых entries с режимом TCP/runtime-container-env. Источники профилей — существующие Make recipes, значения credentials не копируются в код или docs. Для этих двух БД psql использует runtime `POSTGRES_*` внутри контейнера (без передачи password в host argv), существующий non-loopback password-protected TCP endpoint этого DB-контейнера на внутреннем порту 5432 через runtime hostname/контейнерный IP, `-X -w`, SQL отдельным аргументом, без интерполяции SQL в shell. Выбор loopback в TOOL-1 оказался технически ошибочным и заменяется TOOL-2; host dynamic published port не используется. Отказ credential/auth или недоказанная auth-ready проверка — безопасный exit 1. Legacy DB путь не рефакторить. Readiness БД — отдельные `psql … -c "SELECT 1"`, а `ready` получает только два peers. Никакого rebuild БД/infra up и нового migration support.

Сохранить текущий project label при адресной операции, не выбирать compose-файл без целевого key; в ready dry-run устранить только локальный вход в flock (сейчас нарушает существующий контракт). Сохранить allowlist/JSON/exit codes/lock реальных мутаций. Не редактировать skills, Makefile, compose, env, network/auth или service code.

Новый `scripts/tests/stackctl.test.mjs` содержит собственный fake Docker/flock через временный PATH и fixtures, включая очистку; не менять общие test helpers. Одна команда `node --test scripts/tests/stackctl.test.mjs`, без Docker daemon/rebuild/runtime. Это тесты CLI, не pytest smoke. Группа трассируется на пять scenarios tooling delta:

| ID | Проверяемый риск | Ожидаемое evidence |
|---|---|---|
| UT-TOOL-01 | Ready/rebuild двух peers, project/key, dynamic ports | Только targeted build/up --no-deps/health, правильные profiles и URL; нет соседних сервисов/миграций |
| UT-TOOL-02 | Dry-run/lock и legacy regression | План двух aliases без flock/build/up/exec; реальные мутации сохраняют lock/exit 2; empty ready и существующий YA alias не регрессируют |
| UT-TOOL-03 | Doctor/logs новых aliases и allowlist | Точные три контейнера; unknown alias exit 1; JSON stdout |
| UT-TOOL-04 | DB readiness | Обе DB_CONFIG entries: TCP + -w + SELECT 1, credentials только внутри контейнера; legacy DB поведение сохранено |
| UT-TOOL-05 | Безопасный отказ | Missing credential/auth failure → exit 1 без секретов/fallback; DB rebuild/ready отвергаются без infra мутаций |

HTTP endpoints/access matrix в TOOL-1/TOOL-2 не меняются: anonymous/authenticated API проверки остаются в существующих QG-CONTRACTS/LIVE. Production isolation по-прежнему не подтверждена и остаётся отдельным release condition.

#### PLAN-6 / TOOL-2: техническая коррекция ENV-02

TOOL-1 отдельно одобрен «Да, доработать stackctl (Recommended)», реализован, 57 hermetic tests прошли; его checkbox не сбрасываются. QG-ENV-R1 уже выполнил targeted ready (exit 0, 46.9 s), оба peers rebuilt/healthy, health 200, обе БД вернули SELECT 1; loopback first-match HBA line 119 — trust, поздний общий line 128 — scram. ENV-01 устранён; только ENV-02 оставляет QG-ENV.1 открытым. «Доработай» действует: замена ошибочного адреса — коррекция реализации утверждённой password-auth цели, не новый product/auth/network scope и не новый approval-вопрос.

TOOL-2 владеет той же E-зоной, строго два файла `scripts/stackctl` и `scripts/tests/stackctl.test.mjs`, только psql runtimeTcp branch и связанные tests. Новые aliases/profiles/defaults/сервисы, изменения legacy DB branch, HBA/network/auth/config/compose, make/runtime/rebuild/commits запрещены. Read-only feasibility: существующий branch уже получает credentials внутри `docker exec … sh -c` и передаёт SQL позиционным аргументом; исправление ограничивается обнаружением/валидацией runtime target и auth gate, без изменения сервисов.

Контракт:
1. Внутри выбранного DB-контейнера определить runtime hostname, разрешить/проверить non-loopback адрес этого контейнера, либо выбрать его runtime контейнерный IP. Зафиксировать один target для обоих probes и пользовательского SQL. Не использовать host published port, hardcoded loopback, socket или fallback на trust; нельзя менять конфигурацию, чтобы probe стал успешным. Если безопасный target недоступен/неоднозначен — fail closed, без перебора к менее защищённому endpoint.
2. До пользовательского SQL выполнить read-only положительный `SELECT 1` с текущим runtime password, теми же runtime user/database и `-X -w`; нужен успешный результат 1. Затем generated неверный password (проверить отличие от runtime) на том же target/user/database обязан дать именно password-auth отказ. Одинаковый успех означает trust/непроверенный password и exit 1. Timeout/connection/exec/SQL error negative probe не является доказательством: тоже exit 1. Реализация может распознавать auth diagnostic внутри контейнера в стабильной locale; raw diagnostics наружу не передавать.
3. Оба пароля создаются/используются только внутри контейнера, не host argv, output, JSON или evidence. Не применять shell tracing. Вывод diagnostics probes подавить/классифицировать внутри; наружу только безопасный итог/target и отдельные исходы positive/negative. Сохранить secret guard вывода пользовательского SQL, SQL как отдельный аргумент; после failed gate пользовательский SQL не выполняется. Для запроса SELECT 1 можно вернуть результат positive probe после проверки negative. Ограничить время подключения/всего gate; ошибки discovery/credentials/probes возвращают `ok:false`/exit 1 без repairs/mutation. JSON stdout/allowlist/exit codes/legacy behavior сохраняются.

Одна hermetic verification group TOOL-2: `node --test scripts/tests/stackctl.test.mjs` с fake Docker/flock, без real Docker. UT-TOOL-01..05 сохраняются (SQL target expectation UT-TOOL-04 исправляется); добавить одну группу регрессии:

| ID | Проверяемый риск | Ожидаемое evidence |
|---|---|---|
| UT-TOOL-06 | Обе DB aliases, non-loopback target и реальный auth gate | Runtime hostname/IP, один внутренний target:5432, positive SELECT 1 → 1 и wrong-password → auth denial; ни loopback, ни host published port |
| UT-TOOL-07 | Trust и ложноположительный negative | Wrong-password success либо timeout/connection/exec/SQL failure → exit 1; переданный SQL не выполняется после failed gate |
| UT-TOOL-08 | Safe failure / no mutation / secrets / legacy | Missing credentials/invalid target/positive failure, bounded timeout; нет passwords/raw diagnostics в host argv/output/JSON, нет config/repair/runtime mutations; legacy DB behavior неизменно |

После TOOL-2 выполняется только ENV-R2 (Quality Gate, ownership C): одна SQL-auth/health verification group через stack-control; без ready/rebuild/restart/migrations/repair. Проверить текущие health обоих peers и две реальные БД через исправленный `psql … -c "SELECT 1"`, записать separate positive/negative evidence с runtime target без секретов, при необходимости read-only подтвердить password HBA match. Проверить отсутствие mutation/изменения DB StartedAt; ранее выполненный rebuild не повторять. BASE_YA/BASE_M из ENV-R1 лишь revalidate/discover read-only (последние `127.0.0.1:8007` и `127.0.0.1:32769`). При ошибке безопасно остановиться с blocker, не ремонтировать окружение. Обновить только environment report и свои IDs; при успехе закрыть QG-ENV.1, сохранить QG-ENV.2/.3/.V. Dev-допущение Q2 и production release condition не меняются.

## Test matrix

Scenario names — из [client delta](specs/yandex-client-failures/spec.md) и [HTTP delta](specs/yandex-peer-http-contract/spec.md); `C` означает все три клиента, параметризация вместо копирования одинаковых тестов.

| ID | Уровень | Риск/ось | Сценарий / трассировка | Ожидание | Где проверяется |
|---|---|---|---|---|---|
| UT-C-01 | unit | happy path | Успешный запрос; Пустой валидный список | прежний DTO/dict, headers/query/timeout и закрытие | client tests обоих сервисов |
| UT-C-02 | unit | regression timeout | Timeout и transport: connect/read/write/pool | единственный локальный YandexClientException, cause, status=None, close | C client tests |
| UT-C-03 | unit | external degradation | Timeout и transport: connect/DNS/TLS/read/protocol, lifecycle failure | тот же контракт | C client tests |
| UT-C-04 | unit | upstream status | Неуспешный HTTP upstream: 199/300/401/403/429/500/503 × JSON/HTML/empty | YandexClientException с upstream status | C client tests |
| UT-C-05 | unit | malformed response | Непригодный успешный ответ: empty/invalid JSON/null/list/scalar | типизированный отказ, не raw decoder | C client tests |
| UT-C-06 | unit | DTO regression | Непригодный успешный ответ: отсутствующие/неверные OAuth/peer DTO fields | не ValidationError | yandex client tests |
| UT-C-07 | unit | counter structure/partial regression | Непригодный целиком ответ Метрики; Некорректный отдельный счётчик; Пустой валидный список | rows missing/null/bad, counters missing/not-list → YandexClientException; bad item пропускается, корректные остаются; numeric strings и существующие total/empty semantics сохранены | ya-metrica client + service tests |
| UT-C-08 | unit | cancellation | Отмена и повторное исключение | cancellation не преобразована; same exception не удвоено | C client tests |
| UT-C-09 | unit | безопасность | Ответ не получен; Upstream прислал секрет в ошибке | marker отсутствует в message/payload/caplog/capsys, без raw body print | оба сервиса |
| UT-S-01 | unit | OAuth atomicity | Ошибка обмена кода или профиля | ClientError + cause, no create/update | OAuth service tests |
| UT-S-02 | unit | сквозной mapping | Сквозной отказ Метрики | оба service call boundaries → ClientError | два Metrica service test modules |
| UT-S-03 | unit | input boundaries | M1, Y6 pagination/decryption/not-found | прежние clamp 1..100 и offset>=0; invalid token 400; no call после отказа decrypt | Metrica service tests |
| API-01 | in-process HTTP | access | Anonymous и authenticated для каждой строки Y1..Y9/M1/H1/D1 | статусы/payload по matrix, credential не меняет права | API tests обоих сервисов |
| API-02 | in-process HTTP | validation/foreign | Валидация и чужой ресурс, R1 | missing/malformed input 400; foreign и absent по matrix; upstream не вызывается при invalid input | API tests обоих сервисов |
| API-03 | in-process HTTP | HTTP regression | Внутренняя ошибка и конфликт; Явный отказ доступа | ClientError/AppError/409/RuntimeError/response error/HTTPException →400, no secret, debug-safe | main/API handler tests |
| API-04 | in-process HTTP | framework | Routing ошибки; Health и документация | unknown/method/slash 400, health/docs 200, 204 empty | main/API tests |
| API-05 | in-process HTTP | chain/transaction/partial | OAuth и сквозная Метрика с настоящим service/client + MockTransport; Непригодный целиком ответ Метрики; Некорректный отдельный счётчик | timeout/transport/HTTP/невалидный JSON/top-level/DTO failure →400, rollback до ответа; одиночный bad counter → partial200 с корректными элементами напрямую и через peer, не полный отказ; empty/total без новых правил | yandex API tests, ya-metrica API tests |
| SM-01 | live smoke | доступ | H1/D1/R1 и safe read Y1/Y3/Y6/Y7/M1, anonymous/authenticated | matrix, no redirect/secret; private caller; BASE_YA/BASE_M из readiness | api-smoke-test, real PostgreSQL |
| SM-02 | live smoke | input/error regression | malformed UUID/limit, invalid encrypted token M1, неизвестный account Y5/Y6 | 400, без реального OAuth upstream и без секрета | api-smoke-test, real PostgreSQL |
| SM-03 | live smoke | persistence/idempotency | тестовый counter Y8/Y7/Y9, повтор DELETE, только выделенный fixture tenant/account | 200→200→204→204; после удаления 200 counter=null; DB readback | api-smoke-test, real PostgreSQL |
| SM-04 | live smoke | exposure | Проверка private boundary | зафиксированы фактические dev bindings/exposure и заявление Q2, без утверждения проверенной production isolation; dev live не блокируется отсутствием отдельного security change; production deployment/release требует подтверждённой защиты чувствительных routes; backend 401/403 не изменены | QG-ENV evidence + api-smoke-test |

Реальный OAuth code exchange в smoke не повторять: single-use code, внешние credentials и доступность upstream не являются надёжной фикстурой. Детерминированные upstream failures проверяются HTTP MockTransport в API-05 без live network. PostgreSQL constraints/миграции/новые конкурентные записи неприменимы к diff: схемы и repository операции не меняются; существующую атомарность OAuth проверить UT-S-01/API-05, persistence/idempotency — SM-03 на реальной БД. Не создавать `tests/smoke/` и pytest smoke; live только через проектный api-smoke-test skill.

## PostgreSQL для smoke-тестов

Planning discovery выполнен read-only: label `project=eqsitecms, service=db` не дал результата (exit 0); fallback `docker ps` нашёл отдельные PostgreSQL контейнеры. Затем `docker inspect eqsitecms-db-yandex eqsitecms-db-ya-metrica` (exit 0):

| Признак | yandex | ya-metrica |
|---|---|---|
| Container | eqsitecms-db-yandex | eqsitecms-db-ya-metrica |
| Image | postgres:16 | postgres:16 |
| Compose project/service | eqsitecms-infra / db-yandex | eqsitecms-infra / db-ya-metrica |
| Network aliases | eqsitecms-db-yandex, db-yandex | eqsitecms-db-ya-metrica, db-ya-metrica |
| POSTGRES_DB / POSTGRES_USER | eqsitecmsyandex / eqsitecmsyandex | eqsitecmsyametrica / eqsitecmsyametrica |
| Host port 5432/tcp | 5438 | 5439 |
| POSTGRES_PASSWORD | установлен, не публиковать | установлен, не публиковать |

Значения — снимок inspect, не настройки для хардкода. QG-ENV/QG-LIVE обязаны заново получить password и параметры из inspect в памяти, не печатать и не сохранять их в report; проверить соответствие сервисным DSN без раскрытия секретов. Smoke использует обе реальные БД, не SQLite. Не запускать destructive API без выделенных fixture tenant/account; отсутствие fixture — конкретный blocker live lane, не повод писать произвольные данные.

## Migration Plan

1. Q1..Q3 закрыты и отражены в артефактах; отдельный финальный user approval до apply получен явным «Начинай» после показа артефактов (исторически в PLAN-1/PLAN-2 ещё ожидался). Отдельный security change не prerequisite для apply/dev live; подтверждённая защита чувствительных APIs остаётся условием production deployment/release, не задачей auth/network реализации здесь.
2. Реализовать bounded units A/B, обновить относящиеся gap tests и сохранить partial-success regression coverage; не исправлять соседние OAuth URL encoding/DI задачи.
3. PLAN-5 расширяет только tooling scope после ENV-01: «Доработай» разрешает подготовку; Router показывает обновлённые артефакты и получает подтверждение до TOOL-1. Пять BE units не переоткрывать. TOOL-1 без commits и runtime; его approval и выполнение завершены. PLAN-6 исправляет только технический выбор SQL target по ENV-02 без нового scope/gate: TOOL-2 (те же два файла, hermetic tests) → ENV-R2 (только SQL auth/health, без повторного ready/rebuild/repair; закрыть QG-ENV.1, обновить report, сохранить ранее завершённые ENV.2/.3/.V и rebuild evidence ENV-R1; BASE_M revalidate read-only) → параллельно QG-BE/QG-CONTRACTS → QG-LIVE → YA-CP → M-CP → DOCS-CP-PRE → QG-CLEAN-SETUP → QG-FORMAT → DOCS-CP-FORMAT → QG-SYNTH. Checkpoints — только операционное условие existing QG-FORMAT, не новые функциональные deliverables. Пять BE units уже завершены; исторический запрет Router на промежуточные implementation commits заменяется только этими назначенными bounded checkpoints, не разрешением произвольных commit.
   - После LIVE каждый Backend-владелец делает ровно один безопасный commit только назначенных implementation paths своего repo: YA-CP для YA-BE-1/2/3, затем M-CP для M-BE-1/2. Затем Planner в DOCS-CP-PRE делает один root checkpoint commit: этот change, исходный запрос 096, завершённые lane evidence environment/backend/contracts/live и строго `scripts/stackctl`, `scripts/tests/stackctl.test.mjs` по завершённым TOOL-1/TOOL-2 handoffs. TOOL-2 не добавляет paths в allowlist. Это явное дополнение root allowlist, не новый checkpoint или право менять tooling: C/E передаются commit-only без переписывания verdicts/кода, функциональные ownership A/B/C/D/E сохраняются. YA-CP/M-CP и DOCS-CP-FORMAT boundaries не расширяются; tooling нельзя оставить dirty до FORMAT. Units последовательны из-за общего checklist.
   - PLAN-8: checkpoints используют own feature-ветки без merge/push/release/restore/reset/stash/shipctl, code/runtime/make. YA-CP/M-CP сохраняют строгую сервисную allowlist и чистый итоговый status. В root классифицированный foreign unstaged/untracked diff не блокирует own commit DOCS-CP-PRE/DOCS-CP-FORMAT: stage только явно раскрытые own file paths, проверить staged names и только own diff; без `git add .`/`git add -A`. Заранее staged foreign/неопознанный path — blocker, не unstage. Пересечение ownership, небезопасное переключение ветки или гонка index — blocker; сериализовать с другими index writers. Foreign content и index entries не менять, diff/содержимое не читать, не коммитить. До/после этапов сохранять metadata-only foreign path/status, непрозрачные content hashes (включая untracked) и index object/mode/stage hashes; сравнивать неизменность всех foreign entries, а не служебных байтов index при own staging. Параллельное изменение — остановка/rebaseline с Router, не восстановление. Известные foreign зоны: README.md, SERVICES.md, dsh/home/profiles/web package/lock, docs/tasks/097*, dsh/bundles*, reconcile-yandex-root-onboarding change и reports; список уточнять только status metadata. Checklist отмечать после проверок до own docs commit, окончательный SHA/status передавать handoff без новых writes; сбой — partial/blocked. Service checklist фиксирует DOCS-CP-PRE.
   - **QG-CLEAN-SETUP** — один bounded workspace-readiness slice (~8–12 действий), отдельный от FORMAT: создать isolated root git worktree от own DOCS-CP-PRE SHA и независимые nested service git worktrees: YA/M от YA-CP/M-CP SHA, остальные от зафиксированных original HEAD. Сохранить manifest всех service repos/SHAs; root Makefile:239–269 агрегирует backend/frontend/notification-service/email-service/vk-service/seo-service/yandex-service/ya-metrica-service, но status проверяется во всех service repos, включая неагрегируемые site-*. Не переносить/читать foreign original изменения, env/credentials, не копировать dirty sources и не symlink original source dirs. Git object access допустим; original sources неизменны. Проверить реальные пути, отсутствие выхода рецептов/импортов в original, корректное представление nested worktrees в root status; не маскировать dirty новыми excludes/config/skip-worktree.
   - Setup имеет только одну readiness/status verification group, **без make checks**: SHA manifest, discovery/fixture safety, tools/dependencies, resolved paths и clean root/all services. Dependencies/venv/cache — внутри isolated workspace или отдельного ignored workspace cache, без записи в original sources; shared existing ignored cache допустим лишь при доказанной immutable/read-only безопасности, без editable/symlink импортов original source. Не обещать готовность: uv может sync venv, npm/npx искать/докачивать tools; tracked locks менять нельзя, чужие auth/network/данные не использовать. Existing scripts запускают ruff discovery `.` и создают/удаляют .github/.helm fixtures; notification cleanup содержит необычный `.helm/format-regression../` — проверить безопасность/ожидаемый status без изменения tooling и без запуска format в setup. Предсуществующие fixture данные, невозможность clean nested структуры, недоступные dependencies, необходимость unsafe copies/access либо выход за бюджет — точный blocker и варианты пользователю (предоставить безопасное готовое окружение/зависимости либо отдельный bounded follow-up), не новая framework/Makefile patch. Read-only feasibility подтверждает локальные cwd рецептов, но readiness устанавливает только setup handoff.
   - QG-FORMAT выполняется **только в isolated checkout** после QG-CLEAN-SETUP: сверить manifest, до проверок, сразу после `make format` и после всей группы получить пустой `git status --porcelain` isolated root/all service repos. Original root не обязан быть clean при параллельной работе. Format diff → остановка/finding владельцу, lint/test не продолжать; иначе последовательно `make lint`, `make test`. Evidence/exit codes сохранять вне tracked checkout; никаких report/checklist writes между проверками. Передать safe evidence (cwd, root PRE SHA, все service SHAs, команды/exit codes, clean statuses до/после) DOCS-CP-FORMAT; после verification сериализованно записать только report и свои checklist IDs в оригинальном root. DOCS-CP-FORMAT переносит только safe evidence, не source/env/foreign patches, делает own commit ровно report/tasks по root-протоколу, подтверждает clean isolated checkout и неизменность foreign original hashes/status/index. Original может сохранять классифицированный foreign diff. Не выдавать bookkeeping за format diff и новый docs SHA за проверенный PRE SHA, не повторять тесты ради отчёта. При failed checks/runtime diff — REWORK через владельцев и нужные lanes/checkpoints, повтор setup/FORMAT на обновлённых SHAs; docs checkpoint не скрывает findings. Synthesis сверяет цепочку SHA/evidence; финализационные skills позже сами проверяют свои предусловия, включая original clean если требуется: изоляция не отменяет release gates.
   - Synthesis обязательно учитывает environment и format evidence. Stack management через stack-control; PLAN-1/PLAN-2/PLAN-4/PLAN-5 не запускают rebuild/restart/migration, make или runtime-проверки; PLAN-4/PLAN-5 не выполняют ни одного checkpoint commit. TOOL-1/TOOL-2 выполняют только hermetic CLI verification; реальные rebuild уже выполнены ENV-R1. PLAN-6 не выполняет make/runtime/commits; ENV-R2 проверяет только SQL auth/health без нового rebuild.
4. После QG-SYNTH APPROVED: sync → strict validation → archive → skill task-finalize через Router. Соблюдать предусловия и gates самих skills (включая readiness до sync/archive и проверки после archive), не добавлять отдельных approval gates для sync/archive. Не архивировать незавершённые реализационные/QG tasks; merge/release — только Router по task-finalize.
5. Rollback — предыдущие образы обоих peers, без DB migration. До релиза уведомить callers о новых HTTP outcomes; rollback возвращает прежние статусы и требует согласованного отката callers, если они изменялись отдельно.

## Open Questions

- **Q1 — закрыт:** «Все ответы двух сервисов». Принят буквальный application/framework контракт `200/204/400` (Decision 4); main backend `401/403` и существующие права не меняются.
- **Q2 — закрыт:** «Это dev окружение. На production такого не будет». Это заявление о среде, не техническое доказательство production isolation. Отдельный security change не требуется до apply/dev verification; production exposure остаётся deployment/release условием (Decision 5), auth/network changes вне ownership.
- **Q3 — закрыт:** «Нет, сохранить частичный список». Повреждённый отдельный счётчик пропускается, корректные элементы сохраняют partial200. Timeout/transport/HTTP/невалидный целиком JSON/top-level response остаются полным отказом `YandexClientException → ClientError → 400`; новых правил пустого результата нет.

Содержательных открытых вопросов Q1..Q3 нет. Исторический запрет apply до отдельного approval соблюдён: после показа артефактов пользователь явно ответил «Начинай», финальный approval получен. Пять BE units завершены; mandated QG и операционные checkpoints выполняются без нового approval, без изменения функционального scope или доступа. Production deployment/release требует подтверждения защиты чувствительных APIs; dev заявление не подменяет эту проверку.
