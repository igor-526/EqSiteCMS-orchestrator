# QG-CONTRACTS — normalize-yandex-client-failures

**Unit: done. Lane: passed.** Блокирующих findings не найдено. Общий APPROVED не выносится: он принадлежит QG-SYNTH.

## Scope и основание

Проверен только контрактный slice: [HTTP delta](</home/igor/projects/eqSiteCMS/openspec/changes/normalize-yandex-client-failures/specs/yandex-peer-http-contract/spec.md>), тип ошибки/сервисная граница/partial в [client delta](</home/igor/projects/eqSiteCMS/openspec/changes/normalize-yandex-client-failures/specs/yandex-client-failures/spec.md>), полный ADDED requirement [tooling delta](</home/igor/projects/eqSiteCMS/openspec/changes/normalize-yandex-client-failures/specs/repository-process-tooling/spec.md>). Прочитаны main governance [service-endpoint-auth](</home/igor/projects/eqSiteCMS/openspec/specs/service-endpoint-auth/spec.md>), [api-access-governance](</home/igor/projects/eqSiteCMS/openspec/specs/api-access-governance/spec.md>), [service-env-and-clients](</home/igor/projects/eqSiteCMS/openspec/specs/service-env-and-clients/spec.md>) и затронутый ready/lock requirement [repository-process-tooling:137–150](</home/igor/projects/eqSiteCMS/openspec/specs/repository-process-tooling/spec.md#L137-L150>).

Q1 «Все ответы двух сервисов», Q2 «Это dev окружение. На production такого не будет», Q3 «Нет, сохранить частичный список» согласованы с [design:214–220](</home/igor/projects/eqSiteCMS/openspec/changes/normalize-yandex-client-failures/design.md#L214-L220>). Финальное «Начинай» после показа артефактов и отдельное tooling approval «Да, доработать stackctl (Recommended)» приняты из прямого задания Router; transcript самостоятельно не восстанавливался. PLAN-6 — техническая коррекция существующей password-auth цели, не новый scope. TOOL-1/TOOL-2 завершены согласно [tasks:96–117](</home/igor/projects/eqSiteCMS/openspec/changes/normalize-yandex-client-failures/tasks.md#L96-L117>).

Клиентские реализации и внутренности сервисов повторно не ревьюились: это параллельный QG-BE. Просмотрены API/main/Protocol diff, локальные exceptions, публичные DTO boundaries и релевантные тесты для traceability. Никаких source edits, runtime/DB probes, rebuild, make, format или commits в этом unit нет.

## Access verification: все строки матрицы

Ниже — статическая проверка кода и assertions существующих тестов, **не повторный запуск pytest и не live evidence**. У YA оба caller-варианта заданы в [AUTH_HEADERS](</home/igor/projects/eqSiteCMS/services/yandex-service/tests/api/conftest.py#L28>); у M — в [caller_headers](</home/igor/projects/eqSiteCMS/services/ya-metrica-service/tests/api/test_counters_api.py#L18-L28>). Cookie/Authorization здесь не валидируются и не дают прав: «authenticated» по определению peer matrix означает запрос с этими заголовками, а не подтверждённую CMS-сессию.

| ID | Anonymous / с caller headers; foreign/absent/validation | Тестовая трассировка |
|---|---|---|
| Y1 | 200 link; missing/malformed tenant → 400. Tenant — identity/state hint, не user auth; owner/lookup отсутствует | [auth:18–26,93–102](</home/igor/projects/eqSiteCMS/services/yandex-service/tests/api/test_yandex_auth.py#L18-L102>): `test_auth_link`, `test_link_validation` |
| Y2 | 200 прежний account DTO без tokens; invalid/missing/malformed body и реальные exchange/profile failures → 400; до валидного профиля repository/encryption не вызваны | [auth:29–131](</home/igor/projects/eqSiteCMS/services/yandex-service/tests/api/test_yandex_auth.py#L29-L131>): `test_auth_code_returns_account_without_secrets`, `test_real_oauth_failure_chain`, body/JSON validation |
| Y3 | 200 список/пустая страница; foreign tenant передаётся как selector без cookie override; missing/malformed selector/params → 400 | [accounts:16–53,69–112](</home/igor/projects/eqSiteCMS/services/yandex-service/tests/api/test_yandex_accounts.py#L16-L112>): list, empty page, foreign selector, validation |
| Y4 | 204 без тела; credential-less delete не принимает owner selector; неизвестный UUID повторно → 204; malformed UUID → 400, сервис не вызван | [accounts:56–121](</home/igor/projects/eqSiteCMS/services/yandex-service/tests/api/test_yandex_accounts.py#L56-L121>): public delete, absent idempotency, UUID validation |
| Y5 | 200 deliberate token для существующего, включая foreign account; absent → 400 без decrypt; malformed → 400 без сервисного вызова | [servicing:15–55](</home/igor/projects/eqSiteCMS/services/yandex-service/tests/api/test_servicing.py#L15-L55>): token, foreign/absent, UUID validation |
| Y6 | 200 total/items, partial/empty сохраняются и для foreign account; absent → 400 без upstream; missing/malformed ID/params и реальные peer failures → 400 | [metrica:17–121](</home/igor/projects/eqSiteCMS/services/yandex-service/tests/api/test_yandex_metrica.py#L17-L121>): counters, validation, `test_real_peer_chain` |
| Y7 | 200 counter либо counter=null для отсутствующей связи; произвольный tenant UUID — lookup key без owner policy; malformed → 400 | [connections:16–42,99–124](</home/igor/projects/eqSiteCMS/services/yandex-service/tests/api/test_yandex_connections.py#L16-L124>): `test_get_connected_counter_returns_200`, validation |
| Y8 | foreign account допускается существующим trusted-peer контрактом → 200; absent account/conflict → 400; missing/malformed body → 400 без repository calls | [connections:45–77,99–124](</home/igor/projects/eqSiteCMS/services/yandex-service/tests/api/test_yandex_connections.py#L45-L124>): `test_set_counter_access`, validation |
| Y9 | ID-only delete без owner lookup/прав от cookie; absent/repeat → 204 без тела; malformed → 400 без repository calls | [connections:80–124](</home/igor/projects/eqSiteCMS/services/yandex-service/tests/api/test_yandex_connections.py#L80-L124>): absent idempotency, validation |
| M1 | 200 total/items, partial/empty; missing token/invalid params → 400; invalid encrypted token → 400 до client; реальные upstream/top-level failures → 400. Token — вход Яндекс, не CMS auth; tenant ID/owner lookup отсутствует | [counters API:18–206](</home/igor/projects/eqSiteCMS/services/ya-metrica-service/tests/api/test_counters_api.py#L18-L206>): query, invalid token, failure chain, partial/empty |
| H1 | Оба caller-варианта → 200; не требует БД/auth | [YA health:31–38](</home/igor/projects/eqSiteCMS/services/yandex-service/tests/api/test_health.py#L31-L38>), [M health:8–14](</home/igor/projects/eqSiteCMS/services/ya-metrica-service/tests/api/test_health.py#L8-L14>) |
| D1 | Оба caller-варианта, все четыре docs/openapi/oauth2 пути → 200 | [YA docs:41–48](</home/igor/projects/eqSiteCMS/services/yandex-service/tests/api/test_health.py#L41-L48>), [M docs:8–14](</home/igor/projects/eqSiteCMS/services/ya-metrica-service/tests/api/test_health.py#L8-L14>) |
| R1 | Unknown path/method/slash → 400 без redirect; YA дополнительно проверяет отсутствие sessions/service calls | [YA routing:51–69](</home/igor/projects/eqSiteCMS/services/yandex-service/tests/api/test_health.py#L51-L69>), [M routing:17–31](</home/igor/projects/eqSiteCMS/services/ya-metrica-service/tests/api/test_health.py#L17-L31>) |

Foreign/absent/validation применены по смыслу каждого route, а не механически к health/docs или OAuth initiation. У ID-only DELETE отсутствие owner lookup — существующий контракт; нормализация не добавляет разрешение на чужой ресурс. API auth dependencies не удалялись: route diff отсутствует, существующие auth/init public, Y3..Y9/M1 — явно описанные dev private-peer exceptions. Причины sensitive read и credential-less writes зафиксированы в [HTTP spec:31–67](</home/igor/projects/eqSiteCMS/openspec/changes/normalize-yandex-client-failures/specs/yandex-peer-http-contract/spec.md#L31-L67>); они не объявлены Public Read для сайтов.

Отказ HTTPException 401/403 остаётся ошибкой 400, не успешным ответом: [YA exception tests:14–56](</home/igor/projects/eqSiteCMS/services/yandex-service/tests/api/test_exception_handlers.py#L14-L56>) проверяют rollback; [M exception tests:78–97](</home/igor/projects/eqSiteCMS/services/ya-metrica-service/tests/api/test_counters_api.py#L78-L97>) проверяют безопасный 400. Это handler-тесты, не доказательство существования user auth в peers.

## Application statuses и межсервисные контракты

- [YA main:42–89](</home/igor/projects/eqSiteCMS/services/yandex-service/src/main.py#L42-L89>) и [M main:30–76](</home/igor/projects/eqSiteCMS/services/ya-metrica-service/src/main.py#L30-L76>): `debug=False`, `redirect_slashes=False`, глобальные AppError / request validation / HTTPException / response validation / ordinary Exception handlers → безопасный 400. Успехи API/health/docs — 200; оба DELETE — 204 без тела. Неожиданная ошибка не превращается в partial200.
- Routing/framework, AppError/AlreadyExistsError, malformed JSON/UUID/query, response validation, безопасные detail/headers/logs имеют трассировку в таблице и exception tests. Зона гарантии — до отправки ASGI response; proxy/process/network и уже начатый streaming исключены явно [HTTP spec:3–5](</home/igor/projects/eqSiteCMS/openspec/changes/normalize-yandex-client-failures/specs/yandex-peer-http-contract/spec.md#L3-L5>). Streaming endpoints не добавлены.
- Три client boundaries используют локальный `core.exceptions.yandex.YandexClientException`; constructors сохраняют числовой status и `.message`, добавляют `None` и safe category allowlist. Protocol signatures/успешные return types не менялись; расширены docstrings. Cross-service Python imports/новая shared runtime-библиотека не добавлены (AST scan обоих src).
- Публичные API DTO/routes не изменены. Wire assertions сохранены: [OAuth token/profile:177–224](</home/igor/projects/eqSiteCMS/services/yandex-service/tests/unit/test_yandex_oauth_client.py#L177-L224>), [peer query/DTO:152–189](</home/igor/projects/eqSiteCMS/services/yandex-service/tests/unit/test_yandex_metrica_service_client.py#L152-L189>), [M pagination/top-level/partial:154–219](</home/igor/projects/eqSiteCMS/services/ya-metrica-service/tests/clients/test_yandex_metrica.py#L154-L219>). Сохраняются OAuth headers, query pagination, timeout 10s, dict rows/counters, числовые строки и API total/items. Новый M schema helper — внутренняя top-level validation, не новый публичный DTO/wire.
- По Q3 отдельный повреждённый counter пропускается, total не пересчитывается; даже all-skipped/empty остаются 200. Непригодный целиком ответ → typed failure → service ClientError → 400. Подтверждено API chain assertions Y6/M1; typed catches/chaining/cancellation/lifecycle — зона QG-BE, не дублировалась.
- Main backend 401/403, tenant selector и owner-only email policy не затрагиваются. Path-scoped tracked diff backend/core peers отсутствует; здесь нет backend auth/network edits, новых X-Service-Key или X-Equestrian-Service-Key. General main-spec 500 для вызова backend→peer не переписывается локальным peer→caller контрактом. Existing httpx не заменялся: выбор библиотеки вне этого change.

## Tooling traceability

Сверены адресный diff [stackctl](</home/igor/projects/eqSiteCMS/scripts/stackctl>) и весь новый [hermetic test file](</home/igor/projects/eqSiteCMS/scripts/tests/stackctl.test.mjs>). Runtime повторно не запускался.

| IDs | Подтверждённый контракт / тестовые assertions |
|---|---|
| UT-TOOL-01 | Только три новых aliases, ya-metrica и ограниченный infra profiles; exact key/container/env/project. Build/up адресные, `--no-deps`; project label сохраняется даже при несовместимом известном project; compose files выбираются по service key. Dynamic URL и отсутствие автоматических YA migrations. [tests:198–247,515–522](</home/igor/projects/eqSiteCMS/scripts/tests/stackctl.test.mjs#L198-L522>) |
| UT-TOOL-02 | Dry-run проходит занятый flock без exec/build/up/migrate; реальные ready/rebuild/psql под lock → exit 2 при contention. Empty ready, legacy YA/core project, JSON/errors сохранены. [tests:249–292](</home/igor/projects/eqSiteCMS/scripts/tests/stackctl.test.mjs#L249-L292>) |
| UT-TOOL-03 | Doctor/logs только точные aliases/containers; unknown/container-name/prototype aliases отклоняются. [tests:294–324](</home/igor/projects/eqSiteCMS/scripts/tests/stackctl.test.mjs#L294-L324>) |
| UT-TOOL-04/05 | Две runtimeTcp DB entries; DB buildable:false, mixed ready заранее отвергается без peer/infra мутации. `-X -w`, SQL positional без shell interpolation. Missing/empty credentials/auth failure/secret output → safe exit 1. Все четыре legacy DB argv сохранены. [tests:326–418](</home/igor/projects/eqSiteCMS/scripts/tests/stackctl.test.mjs#L326-L418>) |
| UT-TOOL-06 | Verified container Name/64-hex Id и один non-loopback IPv4 из inspect; exec закреплён за Id. Positive SELECT 1 и negative generated password на одном target:5432/user/db; negative обязан быть psql exit 2 + C-locale password-auth diagnostic; SELECT 1 может переиспользовать positive. [tests:426–449](</home/igor/projects/eqSiteCMS/scripts/tests/stackctl.test.mjs#L426-L449>) |
| UT-TOOL-07 | Trust success, timeout, connection/exec/SQL/signal failure negative → fail closed, пользовательский SQL не выполняется. [tests:451–468](</home/igor/projects/eqSiteCMS/scripts/tests/stackctl.test.mjs#L451-L468>) |
| UT-TOOL-08 | Missing/ambiguous/foreign/invalid/loopback target отсекается до exec; positive/exec failures безопасны. Connect/statement/probe/host timeout bounded; без fallback/repair/config changes. Пароли/raw probe diagnostics внутри контейнера; secret output guard, safe JSON outcomes. [tests:470–513](</home/igor/projects/eqSiteCMS/scripts/tests/stackctl.test.mjs#L470-L513>) |

TOOL-2 branch inspected в [stackctl:431–490](</home/igor/projects/eqSiteCMS/scripts/stackctl#L431-L490>). Из handoff: **115 passed hermetic**, не новый запуск этого lane. Реальная positive/negative password-auth проверка обеих БД, unchanged StartedAt и healthy rebuilt peers приняты из [ENV-R2 evidence:96–131](</home/igor/projects/eqSiteCMS/docs/reports/normalize-yandex-client-failures/environment.md#L96-L131>); ENV-01/02 закрыты. Fake Docker tests не подменяются live DB evidence и наоборот.

## Ownership, governance, неприменимость

Изменения соответствуют двум сервисным ownership и строго двум tooling paths; расширение public auth/network scope не найдено. Свои edits ограничены этим отчётом и тремя checkbox секции 7 [tasks](</home/igor/projects/eqSiteCMS/openspec/changes/normalize-yandex-client-failures/tasks.md#L88-L94>). Чужие checklist IDs не отмечались.

NATS/AsyncAPI **неприменимы**: среди изменённых путей двух сервисов нет handlers/subjects/messaging/NATS settings/AsyncAPI; HTTP client errors/status mapping и CLI DB-auth gate не меняют сообщений, payload или subjects. `make asyncapi-validate` не запускался. Core Makefile contract **не затронут**: scoped tracked diff корневого Makefile и core service pointers отсутствует; existing core агрегация не менялась, make/FORMAT остаются отдельному lane. Обзор unrelated core implementation не выполнялся.

## Verification и ограничения

Одна read-only verification group:

1. `openspec validate normalize-yandex-client-failures --type change --strict` → **valid, exit 0**.
2. Scoped static traceability (Python AST/assertions + path-scoped git diff) → **PASS, exit 0**: все 13 matrix IDs имеют реальные test functions; три client boundaries локальны, public API/DTO diff отсутствует, main flags фиксированы; UT-TOOL-01..08 присутствуют, tracked core/backend/AsyncAPI diff отсутствует. Дополнительно вручную прочитаны assertions обоих caller-вариантов и M health/docs/routing.

Первичный path discovery вызвал git с ошибочным именем каталога `services/yandex-metrika-service` → exit 128; исправлено на существующий `services/ya-metrica-service`, повторный scoped status/diff успешен. Изменений от ошибочной команды нет.

**Findings:** нет (severity/path/owner/suggested unit: неприменимо).

**Release condition, не dev finding:** [ENV exposure evidence:83–94](</home/igor/projects/eqSiteCMS/docs/reports/normalize-yandex-client-failures/environment.md#L83-L94>) показывает all-interface HTTP/DB bindings; production isolation/firewall/Internet reachability не доказаны. Q2 разрешает только данный dev flow. Production deployment/release запрещён без технического подтверждения защиты sensitive peer APIs от external anonymous callers; remediation вне ownership этого change.

Далее Router получает handoff; QG-BE/QG-LIVE/QG-FORMAT/QG-SYNTH не подменяются данным passed. SOURCE не исправлялся.

## QG-CONTRACTS-R1 — targeted recheck после BE-01 fix

**Unit: done. Lane: passed. Findings: нет.** Исходный passed и его evidence выше сохранены. Recheck применим, не N/A: перенос ordinary unexpected failures из generic exception handler в pure ASGI middleware меняет границу перехвата и требует повторной трассировки Decision 4/API-03. Основание — действующие approval «Начинай» и rework «Доделывай», [PLAN-7:115–125](../../../openspec/changes/normalize-yandex-client-failures/design.md#L115-L125); новый scope не вводится.

### Точечная трассировка

| Контракт / ограничение | Проверенное соответствие |
|---|---|
| Ordinary pre-start failure → safe400, controlled logs; unwind до ответа | [YA boundary:44–70](../../../services/yandex-service/src/main.py#L44-L70) и [M boundary:31–57](../../../services/ya-metrica-service/src/main.py#L31-L57) ждут завершения inner ASGI app и ловят только `Exception` снаружи route/dependency cleanup. Middleware регистрируются как user middleware внутри Starlette ServerErrorMiddleware. Generic `Exception` handler больше не зарегистрирован; ordinary failure не доходит до server-level rethrow. |
| ResponseValidationError и безопасная категория сохранены | [YA handler:115–120](../../../services/yandex-service/src/main.py#L115-L120), [M handler:102–106](../../../services/ya-metrica-service/src/main.py#L102-L106): специализированная регистрация сохранена, фиксированный detail/категория, нет raw exception/URL/body/traceback. |
| Cancellation/BaseException и начатый ответ не нормализуются; non-HTTP вне гарантии | `except Exception`, non-HTTP passthrough, response-start tracking с bare rethrow. Трассировка negatives: [YA:155–181](../../../services/yandex-service/tests/api/test_exception_handlers.py#L155-L181), [M:140–182](../../../services/ya-metrica-service/tests/api/test_health.py#L140-L182). Второго ответа нет; started failure может штатно уйти серверу, это не нарушение pre-start гарантии. |
| API-03 / controlled-log coverage | Реальный `RequestResponseCycle.run_asgi(app)` с h11, synthetic exception + chained cause, assertions HTTP400/no secret/no traceback/наблюдаемая safe category: [YA:101–152](../../../services/yandex-service/tests/api/test_exception_handlers.py#L101-L152), [M:74–137](../../../services/ya-metrica-service/tests/api/test_health.py#L74-L137). Это проверка наличия и соответствия coverage, не повторный запуск server-log regression. |
| Debug/slash/status/success DTO не меняются fix-ом | `debug=False`, `redirect_slashes=False` сохранены: [YA:73–86](../../../services/yandex-service/src/main.py#L73-L86), [M:60–68](../../../services/ya-metrica-service/src/main.py#L60-L68). Scoped main diff не меняет endpoints, DTO или успешные `200/204`. Boundary реагирует только на exception, не переписывает корректный partial200/empty/total. |
| Access/auth/noChecksChange | [HTTP spec:19–29](../../../openspec/changes/normalize-yandex-client-failures/specs/yandex-peer-http-contract/spec.md#L19-L29) соблюдён: local denied400 остаётся отказом, не permission grant; middleware не вызывает операцию повторно и не добавляет/удаляет auth checks. Main backend `401/403` и tenant selector вне fix scope. Исходная passed access matrix не переоткрывается. |

### Verification и границы вывода

- `openspec validate normalize-yandex-client-failures --type change --strict` → **valid, exit 0**.
- Read-only scoped main diff + ручное чтение соответствующих main/test sections + Python AST assertions по двум boundaries → **PASS, exit 0**: catch только `Exception`, started rethrow, debug/slash false, нет generic Exception registration, есть ResponseValidationError registration и реальные API-03/negative test functions.
- Из переданных FIX handoffs: YA **662 passed, 2 xfail**, mypy **104 clean**; M **262 passed**, mypy **54 clean**, выбран existing health test. Эти результаты здесь не переисполнялись. Server-log regression и test/lint evidence оценивает отдельно QG-BE-R1; данный passed не закрывает BE-01.
- Полная access matrix, client code, tooling, другие reports и неизменённые части change не перечитывались. Source/tests/runtime/commits/format не изменялись; дополнены только этот исторический report и собственные R1 checklist IDs в [tasks:115–120](../../../openspec/changes/normalize-yandex-client-failures/tasks.md#L115-L120).

**Далее:** LIVE разрешается только после **QG-BE-R1 passed**; исходный BE-01 остаётся открытым до его проверки. Production release condition выше сохраняется. Итоговый APPROVED — исключительно QG-SYNTH.
