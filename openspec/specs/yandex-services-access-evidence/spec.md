# Evidence baseline — доступ и границы сервисов Яндекса

## Purpose

Сводный ретроспективный baseline доступа ко всем существующим HTTP endpoints двух сервисов: полнота маршрутов, происхождение evidence и честное разделение действующей peer policy, наблюдаемого enforcement и непроверенных границ. Это документационная capability, не реализация безопасности и не утверждение небезопасного поведения.

### Область, baseline и предел доказательства

Unit `PLAN-S1`, профиль Planner, по [заданию 097](<../../../../../docs/tasks/097_yandex_services_retrospective_specs.md#L1-L18>). Ownership — только эта delta; остальные slices, shared artifacts, root/tooling и оба сервиса readonly. Approval на service implementation отсутствует. Нормативные SHALL/MUST ниже относятся к полноте и честности документации, а не к сохранению auth/token gaps.

Статически подтверждены HEAD: root `457be4391fa800214ce6939030d3e125962b89be`, yandex-service `d3cf1dc5879d5ebc2f75bbdb437ca657cf1a4de4`, ya-metrica-service `0bd7434cc97ac41f0a0aef1088e99b77ead48e1b`; оба service working tree чисты. Main specs и compose читаются из существующего root dirty overlay, не выдаются за root HEAD. Тесты **прочитаны, не запущены**. Runtime anonymous/authenticated/foreign-owner проверки, реальные DB/network/production isolation — **NOT RUN**. ENV, реальные токены, credentials и секреты не читались.

### Действующая норма, не новое access decision

- Общий дефолт [API Access Policy](<../../../../../AGENTS.md#L92-L117>) остаётся: GET Public Read; POST/PATCH/DELETE Protected Write. Для чувствительных GET и credential-less writes ниже уже есть explicit dev peer exceptions, а не новые исключения S1.
- Принятая [main peer access matrix и boundary](<../../../../specs/yandex-peer-http-contract/spec.md#L35-L79>) — источник классов Y1..Y9/M1/H1/D1/R1. Y4/Y8/Y9 — существующие Private Peer Write exceptions из Protected Write в заявленном dev окружении; успешный anonymous characterization не легализует внешнюю CMS-запись. Private boundary — требование доверенного контура, **не** наблюдаемая auth-проверка route.
- Числа ниже — локальный peer-контракт и assertions существующих тестов, а не результаты запуска. Успех предполагает пригодные данные/ресурс/зависимости. `400` локального peer не заменяет `401/403` main backend; missing/invalid tenant selector общего backend не переопределяется peer validation. Новая user/peer auth и её HTTP outcomes требуют отдельного security change и пересмотра существующего peer-контракта, а не молчаливой нормализации auth denial.
- Main [safe diagnostics](<../../../../specs/yandex-client-failures/spec.md#L31-L53>) сохраняется. Ни HTTP sanitization, ни отсутствие CORS не доказывают безопасные access/proxy/telemetry logs или authentication.

### Консолидированная access matrix

`Y` = yandex-service, `M` = ya-metrica-service; поле path содержит полный app route prefix. «С auth» в main означает тот же запрос с cookie/Authorization, не дополнительное право. Во **всех** строках валидная сессия/roles не доказаны; колонка ниже отдельно указывает только assertions с синтетическими headers. Доверенный peer — требуемый класс caller, а не обнаруженная роль CMS. UUID tenant/account/binding и encrypted access_token — не proof of caller authorization.

| ID / service | method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|---|
| Y1 / Y | GET | `/api/auth/link` | Public Read, auth initiation в private peer | любой caller peer; локальной role check нет | main/test source: 200; missing/malformed equestrian_id → 400 (E-YA) | fake headers: те же assertions; валидная сессия/roles не доказаны |
| Y2 / Y | POST | `/api/auth/code` | существующий Public Auth POST exception | caller OAuth-потока private peer; role check нет | main/test source: 200; invalid body/code/upstream → 400; callback несёт code в body (E-YA) | fake headers: те же assertions; валидная сессия/roles не доказаны |
| Y3 / Y | GET | `/api/accounts/` | существующий Private Peer Read exception; PII, не consumer Public Read | доверенный внутренний caller; owner/role check нет | main/test source: 200; missing/malformed selector/params → 400 (E-YB) | fake headers: те же assertions; валидная сессия/roles не доказаны |
| Y4 / Y | DELETE | `/api/accounts/{account_id}` | существующий Private Peer Write exception; не новое снятие Protected Write | доверенный внутренний caller; tenant/owner/role check нет | main/test source: 204, включая absent/repeat; malformed UUID → 400 (E-YB) | fake headers: те же assertions; валидная сессия/roles не доказаны |
| Y5 / Y | GET | `/api/servicing/access-token/{account_id}` | существующий Sensitive Private Peer Read exception; plaintext secret response | доверенный внутренний сервис; tenant/owner/role check нет | main/test source: 200 с access_token; malformed/absent/decrypt failure → 400 (E-YC) | fake headers: те же assertions; валидная сессия/roles не доказаны |
| Y6 / Y | GET | `/api/metrica/counters` | существующий Sensitive Private Peer Read exception | доверенный внутренний caller; owner/role check нет | main/test source: 200; missing/malformed account_id/params, absent account/peer failure → 400 (E-YD) | fake headers: те же assertions; валидная сессия/roles не доказаны |
| Y7 / Y | GET | `/api/connections/metrica/{equestrian_id}` | существующий Private Peer Read exception; вложенный account profile | доверенный внутренний caller; owner/role check нет | main/test source: 200, включая counter=null; malformed UUID → 400; absent referenced account → 400 по service (E-YE) | fake headers: assertions found/null; absent referenced account — source inference, не отдельный API PASS; валидная сессия/roles не доказаны |
| Y8 / Y | POST | `/api/connections/metrica` | существующий Private Peer Write exception; не новое снятие Protected Write | доверенный внутренний caller; account-tenant/caller/role check нет | main/test source: 200 create/update/no-op; invalid/absent account/conflict → 400; foreign account accepted в fake harness (E-YE) | fake headers: те же assertions; валидная сессия/roles не доказаны |
| Y9 / Y | DELETE | `/api/connections/metrica/{counter_id}` | существующий Private Peer Write exception; counter_id здесь UUID binding | доверенный внутренний caller; tenant/owner/role check нет | main/test source: 204, включая absent/repeat; malformed UUID → 400 (E-YE) | fake headers: те же assertions; валидная сессия/roles не доказаны |
| M1 / M | GET | `/api/metrica/counters` | существующий Sensitive Private Peer Read exception; sensitive query access_token | доверенный внутренний caller; token не CMS identity; role check нет | main/test source: 200 с пригодным ciphertext/upstream; missing/invalid token/params/upstream → 400 (E-M) | synthetic cookie/Bearer: те же assertions; валидная сессия/roles не доказаны |
| H1-Y / Y | GET | `/health` | Public Read; static liveness | любой caller | main/test source: 200 status=ok; не DB/peer readiness (E-HY) | fake headers: тот же assertion; валидная сессия/roles не доказаны |
| H1-M / M | GET | `/health` | Public Read; static liveness | любой caller | main/test source: 200 status=ok; не DB/provider readiness (E-HM) | synthetic headers: тот же assertion; валидная сессия/roles не доказаны |
| D1-Y1 / Y | GET, HEAD¹ | `/docs` | Public Read, служебный | любой caller | main/GET test: 200; HEAD: static framework inference, NOT RUN (E-D) | GET fake headers: 200 assertion; HEAD и валидная сессия/roles не доказаны |
| D1-Y2 / Y | GET, HEAD¹ | `/redoc` | Public Read, служебный | любой caller | main/GET test: 200; HEAD: static framework inference, NOT RUN (E-D) | GET fake headers: 200 assertion; HEAD и валидная сессия/roles не доказаны |
| D1-Y3 / Y | GET, HEAD¹ | `/openapi.json` | Public Read, служебный | любой caller | main/GET test: 200; HEAD: static framework inference, NOT RUN (E-D) | GET fake headers: 200 assertion; HEAD и валидная сессия/roles не доказаны |
| D1-Y4 / Y | GET, HEAD¹ | `/docs/oauth2-redirect` | Public Read, Swagger helper; не business callback Y2 | любой caller | main/GET test: 200; HEAD: static framework inference, NOT RUN (E-D) | GET fake headers: 200 assertion; HEAD и валидная сессия/roles не доказаны |
| D1-M1 / M | GET, HEAD¹ | `/docs` | Public Read, служебный | любой caller | main/GET test: 200; HEAD: static framework inference, NOT RUN (E-D) | GET synthetic headers: 200 assertion; HEAD и валидная сессия/roles не доказаны |
| D1-M2 / M | GET, HEAD¹ | `/redoc` | Public Read, служебный | любой caller | main/GET test: 200; HEAD: static framework inference, NOT RUN (E-D) | GET synthetic headers: 200 assertion; HEAD и валидная сессия/roles не доказаны |
| D1-M3 / M | GET, HEAD¹ | `/openapi.json` | Public Read, служебный | любой caller | main/GET test: 200; HEAD: static framework inference, NOT RUN (E-D) | GET synthetic headers: 200 assertion; HEAD и валидная сессия/roles не доказаны |
| D1-M4 / M | GET, HEAD¹ | `/docs/oauth2-redirect` | Public Read, Swagger helper | любой caller | main/GET test: 200; HEAD: static framework inference, NOT RUN (E-D) | GET synthetic headers: 200 assertion; HEAD и валидная сессия/roles не доказаны |
| R1 / Y, M | иной method / путь | неизвестный путь, unsupported method, slash mismatch | Framework rejection; не endpoint и не auth denial | никто | main/test source: 400 без вызова business operation и redirect (E-D) | synthetic headers: то же; не доказательство authenticated denial |

¹ HEAD указан как автоматически зарегистрированный companion к четырём Starlette docs routes каждого app, а не новая security норма: main D1 явно перечисляет GET, framework evidence E-F подтверждает регистрацию HEAD; парных HEAD tests в прочитанном pack нет. Для обычных FastAPI business/health routes дополнительные методы здесь не изобретаются. Полнота: **9 business + 1 health + 4 docs paths** у Y, **1 business + 1 health + 4 docs paths** у M; итого 20 app-qualified paths, 20 GET/POST/DELETE комбинаций и 8 framework HEAD companions (28 method/path комбинаций), R1 отдельно. Сверка prefixes: `/api/{auth,accounts,servicing,metrica,connections}` у Y и `/api/metrica` у M, `/health` и docs вне `/api`.

**Причины уже существующих исключений:** Y2 обрабатывает OAuth до user session; Y3 содержит профиль с email/телефоном; Y5 выдаёт plaintext token; Y6/M1 читают приватные счётчики и M1 принимает чувствительный ciphertext; Y7 раскрывает вложенный профиль. Y4/Y8/Y9 — изменения account/binding, допускавшиеся существующим main только в доверенном dev peer-контуре. Ни один из этих фактов не доказывает private isolation. Повторное принятие исключений или новые production access decisions данным backfill не выполняются.

### Source anchors и уровни evidence

Каждый anchor — прочитанный источник, не выполненная проверка. Service anchors привязаны к HEAD выше; E-N/E-X — root overlay; E-F — локально установленный framework, дополнительное непереносимое evidence, не tracked service baseline.

| ID | Источник enforcement / boundary | Test source / предел |
|---|---|---|
| E-N | [Main access, exceptions, foreign governance и backend boundary](<../../../../specs/yandex-peer-http-contract/spec.md#L35-L79>), [safe diagnostics](<../../../../specs/yandex-client-failures/spec.md#L31-L53>) | нормативная ссылка, не security/runtime PASS |
| E-RY | [Y main: middleware, registration, health и handlers](<../../../../../services/yandex-service/src/main.py#L44-L120>), [route exports](<../../../../../services/yandex-service/src/api/__init__.py#L1-L13>) | APIRouter/app dependencies auth не заданы; middleware ловит ошибки, не аутентифицирует |
| E-RM | [M main: middleware, registration, health и handlers](<../../../../../services/ya-metrica-service/src/main.py#L31-L106>), [route exports](<../../../../../services/ya-metrica-service/src/api/__init__.py#L1-L5>) | auth middleware/dependencies в этой зарегистрированной цепочке не найдены |
| E-DI | [Y providers](<../../../../../services/yandex-service/src/containers/services.py#L13-L45>), [M providers](<../../../../../services/ya-metrica-service/src/containers/services.py#L6-L18>), [transaction wrapper](<../../../../../services/yandex-service/src/utils/transactional_route.py#L10-L30>), [Y session dependency](<../../../../../services/yandex-service/src/depends/utils.py#L8-L10>), [M session dependency](<../../../../../services/ya-metrica-service/src/depends/utils.py#L8-L10>) | dependencies здесь — service/DB lifecycle, не role/owner auth; название ServiceAuthorization не означает проверку caller |
| E-YA | [OAuth routes](<../../../../../services/yandex-service/src/api/yandex_auth.py#L12-L34>), [callback DTO](<../../../../../services/yandex-service/src/core/schemas/api/yandex_auth.py#L14-L18>), [OAuth service state и обмен](<../../../../../services/yandex-service/src/core/services/yandex_oauth_service.py#L27-L58>), [authorize URL и token POST](<../../../../../services/yandex-service/src/clients/yandex_oauth_client.py#L66-L82>) | [anonymous/fake headers success assertions](<../../../../../services/yandex-service/tests/api/test_yandex_auth.py#L18-L41>); [validation/failure anchors и gaps Y1](<../yandex-oauth-accounts/spec.md#L127-L151>), [Y1 source/gaps](<../../proposal.md#L63-L83>) |
| E-YB | [Account routes](<../../../../../services/yandex-service/src/api/yandex_accounts.py#L13-L41>), [tenant list/delete service](<../../../../../services/yandex-service/src/core/services/yandex_accounts_service.py#L18-L41>) | [list/foreign selector/absent delete assertions](<../../../../../services/yandex-service/tests/api/test_yandex_accounts.py#L16-L93>); tenant list predicate — не caller permission |
| E-YC | [Secret token route](<../../../../../services/yandex-service/src/api/servicing.py#L12-L25>), [token lookup/decrypt и unsafe catch-all log](<../../../../../services/yandex-service/src/core/services/yandex_service_authorization_service.py#L21-L33>) | [anonymous/fake headers/foreign/absent assertions](<../../../../../services/yandex-service/tests/api/test_servicing.py#L15-L55>); [Y1 decrypt tests anchor](<../../proposal.md#L71-L81>); настоящий owner denial не проверен |
| E-YD | [Gateway route](<../../../../../services/yandex-service/src/api/yandex_metrica.py#L12-L29>), [lookup/ciphertext forwarding](<../../../../../services/yandex-service/src/core/services/yandex_metrica_service.py#L25-L43>), [peer query](<../../../../../services/yandex-service/src/clients/yandex_metrica_service_client.py#L60-L75>) | [mock transport/foreign assertions](<../../../../../services/yandex-service/tests/api/test_yandex_metrica.py#L72-L121>), [strict xfail plaintext expectation](<../../../../../services/yandex-service/tests/unit/test_yandex_metrica_service.py#L124-L130>); это не живой Y→M прогон |
| E-YE | [Binding routes](<../../../../../services/yandex-service/src/api/yandex_connections.py#L16-L53>), [set/delete/account lookup service](<../../../../../services/yandex-service/src/core/services/yandex_metrica_counter_service.py#L28-L69>) | [found/null, foreign set, absent/conflict, repeat delete assertions](<../../../../../services/yandex-service/tests/api/test_yandex_connections.py#L16-L96>); [Y2 validation/access gaps](<../yandex-metrica-gateway/spec.md#L33-L44>), [G-Y2-01..05](<../yandex-metrica-gateway/spec.md#L163-L171>) |
| E-M | [Adapter route/query](<../../../../../services/ya-metrica-service/src/api/yandex_metrica.py#L10-L30>), [decrypt before provider](<../../../../../services/ya-metrica-service/src/core/services/yandex_metrica_service.py#L20-L42>), [provider OAuth header](<../../../../../services/ya-metrica-service/src/clients/yandex_metrica.py#L62-L80>) | [synthetic headers/query/marker safety/decrypt chain assertions](<../../../../../services/ya-metrica-service/tests/api/test_counters_api.py#L18-L125>); [M1 boundary/key/runtime gaps](<../ya-metrica-adapter/spec.md#L50-L56>) |
| E-HY | [Y health](<../../../../../services/yandex-service/src/main.py#L89-L91>) | [без services/session, fake headers](<../../../../../services/yandex-service/tests/api/test_health.py#L31-L38>), [Y3 access](<../yandex-service-runtime/spec.md#L42-L48>), [Y3 runtime/telemetry gaps](<../yandex-service-runtime/spec.md#L183-L195>) |
| E-HM | [M health](<../../../../../services/ya-metrica-service/src/main.py#L71-L73>) | [health/headers assertions](<../../../../../services/ya-metrica-service/tests/api/test_health.py#L15-L21>) |
| E-D | E-RY/E-RM не отключают docs, redirect_slashes=false | [Y docs/rejection](<../../../../../services/yandex-service/tests/api/test_health.py#L41-L69>), [M docs/rejection](<../../../../../services/ya-metrica-service/tests/api/test_health.py#L15-L38>); GET tests, не HEAD |
| E-F | [Y FastAPI setup](<../../../../../services/yandex-service/.venv/lib/python3.14/site-packages/fastapi/applications.py#L1105-L1158>), [Y Starlette GET→HEAD](<../../../../../services/yandex-service/.venv/lib/python3.14/site-packages/starlette/routing.py#L212-L234>), [M FastAPI setup](<../../../../../services/ya-metrica-service/.venv/lib/python3.14/site-packages/fastapi/applications.py#L1105-L1158>), [M Starlette GET→HEAD](<../../../../../services/ya-metrica-service/.venv/lib/python3.14/site-packages/starlette/routing.py#L212-L234>) | только static local framework observation; переносимое runtime доказательство HEAD отсутствует |
| E-T | [Y AUTH_HEADERS и fake sessions](<../../../../../services/yandex-service/tests/api/conftest.py#L18-L81>), [M caller headers и mock shutdown](<../../../../../services/ya-metrica-service/tests/api/test_counters_api.py#L18-L37>) | Bearer fake-caller/foreign-user и session=foreign — синтетические маркеры, не валидная сессия |
| E-X | [Y compose ports/expose/uvicorn/network](<../../../../../.docker-compose/docker-compose.yandex.yml#L12-L27>), [M compose ports/expose/uvicorn/network](<../../../../../.docker-compose/docker-compose.ya_metrica.yml#L12-L27>) | host port templates и uvicorn 0.0.0.0:8000, без явного loopback bind в шаблонах; значения variables, реальные bindings, proxy/firewall и production deployment не исследованы |

### Реестр gaps и открытые security questions — не blockers документационного backfill

| ID | Evidence / неизвестность | Отдельное решение или будущая проверка; не задача S1 |
|---|---|---|
| G-S1-AUTH | E-RY/E-RM/E-DI/E-T: caller identity, peer credentials, CMS session/roles не проверяются локально; E-X не доказывает private isolation | Где enforcement доверенного peer boundary: gateway/network или service auth? Какие principals/scopes допустимы? Решение требует отдельного security change; до production — подтверждение защиты по E-N |
| G-S1-OWNER | E-YB/E-YC/E-YD/E-YE: tenant selector фильтрует список, но caller не связан с tenant; delete/token по resource UUID; binding set проверяет наличие account, не его tenant/право на counter | Нужны ли user/owner проверки непосредственно peers или в upstream? Перечень read/write/secret permissions, foreign owner/privileged behavior и denial status пока не утверждены. Не переносить email owner-only policy на peers |
| G-S1-TOKEN | E-YC/E-YD/E-M: Y5 отдаёт plaintext в response, account_id в path не secret credential; gateway передаёт ciphertext в query access_token, adapter дешифрует и передаёт plaintext в provider Authorization | Согласовать wire/token boundary отдельно: Y2 G-Y2-01 и xfail ожидают plaintext, M1 принимает ciphertext. Не утверждать, что forwarding доказанно корректен или что его нужно сохранять/чинить; живой cross-service совместимости нет |
| G-S1-STATE | E-YA: state=str(tenant UUID) в authorize query; callback POST /code содержит code+equestrian_id в body, но не state; state verification/nonce/replay control в handoff Y1 и прочитанной цепочке не найдены | Определить state binding/TTL/одноразовость и replay/CSRF checks отдельным change. Swagger oauth2-redirect не подменяет business callback. Не добавлять вымышленный GET callback или code query в локальный route |
| G-S1-LIFECYCLE | [Y1 expiry/refresh/key gaps](<../../proposal.md#L77-L81>), [M1 key/runtime handoff](<../ya-metrica-adapter/spec.md#L50-L55>), E-YC/E-YD: refresh/expiry enforcement при чтении не найдено | Сохранённый expiry/refresh не доказывает refresh policy; согласовать freshness, revocation, ключи/rotation/versioning/совместимость отдельно. Реальные keys не читались; шифрование не authentication |
| G-S1-LOG | E-YC catch-all интерполирует raw exception в logger/ClientError, что конфликтует с безопасной диагностикой E-N; E-M validation сохраняет loc/type, не полное input; E-X запускает сервер без доказанной query-redaction | Known unsafe log не исправлен и не принят нормой. Marker tests не доказывают все decrypt branches, dynamic loc reflection, query/path/proxy access logs, Sentry/telemetry. Нужны синтетические leak cases без настоящих секретов; нормальный Y5 secret response проверять как разрешённый private response, не путать с запрещёнными error/log leaks |
| G-S1-EXPOSURE | E-X публикует host ports по variables; expose/network не являются access-control. [Y3 telemetry/runtime caveats](<../yandex-service-runtime/spec.md#L183-L191>) и M1 не доказывают isolation/secret redaction | Фактические dev bindings и production firewall/proxy/auth неизвестны. Q2 dev-допущение main — не production evidence; production gate сохраняется, отдельный security fix не prerequisite docsbackfill |
| G-S1-TEST | E-T — fake credentials; source tests только прочитаны. Foreign account fixture не является authenticated foreign-owner сессией; health static, не readiness | Anonymous, valid-auth/roles, invalid/revoked auth, foreign-owner, network isolation и HEAD runtime не выполнялись. Не выставлять PASS/200 для неизвестной валидной сессии; future tests зависят от выбранной enforcement boundary |

### Будущие проверки — точный охват без обещания реализации

Это документированный test backlog отдельного security решения, **не** checklist на запуск в S1/F1. IDs трассируются к сценариям ниже; ожидания существующего trusted peer сверяются с E-N, а новые user/peer allow/deny outcomes требуют approval.

| ID | Строки / ось | Имеющееся test-source evidence | Нужный будущий случай и статус сейчас |
|---|---|---|---|
| FT-01 | Y1..Y9, M1, H1, D1 / anonymous | E-YA..E-D, E-T | Повторить все строки без credentials на разрешённом runtime; сейчас NOT RUN, только assertions источников |
| FT-02 | все строки / authenticated | E-T: только synthetic headers | Подлинная валидная сессия/roles на выбранной auth boundary, invalid/expired credentials отдельно; сейчас валидная сессия/roles не доказаны. Для trusted peer user session не даёт новых прав по E-N; проверять сам trusted caller механизм, когда он определён |
| FT-03 | Y3..Y9 / foreign resource | E-YB/E-YC/E-YD/E-YE fake repository fixtures | Owner/foreign-tenant/privileged callers с доказанной identity и проверкой до lookup/downstream; текущий peer foreign outcome только по E-N; новые denial classes не выбраны, NOT RUN |
| FT-04 | Y5, Y6, M1 / secrets | E-YC/E-YD/E-M marker/decrypt tests; G-S1-TOKEN/LOG | Synthetic plaintext/ciphertext markers в token path/query/error/log/telemetry, provider headers и decrypt unexpected error; Y5 deliberate response отделить от diagnostic leaks. Реальный cross-service и logs NOT RUN |
| FT-05 | Y1/Y2 / OAuth | E-YA; G-S1-STATE | Missing/mismatched/expired/replayed state и повтор code после выбора нового контракта; сейчас защиты/outcomes не доказаны, NOT RUN |
| FT-06 | private routes / network | E-X; G-S1-EXPOSURE | Actual bindings и попытка внешнего anonymous доступа против доверенного peer; production isolation NOT RUN, перед release — gate E-N |
| FT-07 | H1/D1/R1 / infrastructure HTTP | E-HY/E-HM/E-D/E-F | Anonymous/валидный caller, GET/HEAD docs, unsupported methods и slash variants; HEAD static registration, runtime NOT RUN; health не считать readiness |
| FT-08 | Y5/Y6/M1 / lifecycle | Y1/M1 handoffs; G-S1-LIFECYCLE | Expired/revoked token, mismatch/rotated key и переходный формат отдельно от permissions; refresh/rotation outcomes не утверждены, NOT RUN |



## Requirements

### Requirement: Полнота сводного endpoint baseline
Документационный baseline MUST содержать все зарегистрированные business, health и служебные HTTP пути каждого app с полными prefixes и method. Полнота SHALL проверяться по registration, route definitions и существующей main matrix, без импорта приложения или чтения реальных ENV.

#### Scenario: S1-01 Сверка business routes и health
- **WHEN** reviewer сопоставляет E-RY/E-RM с route anchors E-YA..E-M
- **THEN** находит все 9 business routes Y, 1 business route M и оба health в матрице; одноимённые пути двух app не сливаются

#### Scenario: S1-02 Документация и framework companions
- **WHEN** reviewer сверяет D1 и локальное E-F
- **THEN** каждый app имеет четыре docs paths; GET assertions отделены от статически зарегистрированных HEAD без runtime evidence; helper oauth2-redirect не назван business callback

### Requirement: Неизменность существующего access governance
Документация MUST ссылаться на E-N как на действующие peer exceptions и MUST NOT создавать новые anonymous permissions, CMS roles либо менять общую GET/Protected Write policy. Требуемый private boundary SHALL отделяться от наблюдаемого отсутствия route auth.

#### Scenario: S1-03 Чувствительное чтение
- **WHEN** читатель рассматривает Y3/Y5/Y6/Y7/M1
- **THEN** видит причины private exceptions, включая PII/token/query, а не разрешение общедоступного consumer чтения

#### Scenario: S1-04 Административные записи
- **WHEN** читатель рассматривает Y4/Y8/Y9 и OAuth Y2
- **THEN** существующие dev Private Peer Write и Public Auth POST exceptions названы со ссылкой на E-N; credential-less execution не превращается в новое security approval

### Requirement: Честное anonymous и authenticated evidence
Baseline MUST отличать нормативные локальные outcomes, assertions прочитанных tests, static inference и выполненную runtime verification. Fake Cookie/Authorization MUST NOT считаться валидной сессией, проверкой роли или доказанным allow/deny.

#### Scenario: S1-05 Anonymous characterization
- **WHEN** reviewer читает success/validation outcomes каждой строки матрицы
- **THEN** может проследить test/source anchor и предпосылки, видит NOT RUN и не трактует assertions как результат текущего запуска

#### Scenario: S1-06 Header-bearing не валидная аутентификация
- **WHEN** встречаются Bearer fake-caller/foreign-user или session=foreign из E-T
- **THEN** одинаковые assertions описаны только как synthetic probes; валидная сессия/roles не доказаны, а FT-02 сохраняет будущую проверку выбранного enforcement boundary

### Requirement: Tenant и resource selector не подменяют полномочия
Baseline MUST фиксировать различие tenant filtering, resource lookup и caller authorization. Наличие UUID либо найденного аккаунта MUST NOT считаться доказательством ownership или доступа к счётчику.

#### Scenario: S1-07 Tenant list и foreign read
- **WHEN** account list фильтруется equestrian_id или gateway/token read ищет account_id
- **THEN** E-YB/E-YC/E-YD документируются как selector/lookup; foreign fixtures не выдаются за проверенный authenticated owner denial

#### Scenario: S1-08 Delete и cross-tenant binding
- **WHEN** delete получает только resource UUID или set принимает account другого tenant в E-YE
- **THEN** G-S1-OWNER сохраняет отсутствие caller/owner checks и account-tenant проверки; новые права либо denial HTTP статусы не придумываются

### Requirement: Секретные wire boundaries описываются без легализации gaps
Baseline MUST явно различать secret token response Y5, ciphertext query M1, gateway forwarding и provider Authorization. Противоречие между xfail Y2 и входным ciphertext M1 SHALL оставаться открытым вопросом, а не решаться изменением кода или новым SHALL на небезопасное поведение.

#### Scenario: S1-09 Token path и sensitive response
- **WHEN** reviewer рассматривает Y5
- **THEN** account_id в path не объявляется credential, plaintext access_token response помечен sensitive private, local auth/owner gap и future secret-handling evidence остаются явными

#### Scenario: S1-10 Gateway и adapter query
- **WHEN** reviewer сопоставляет E-YD и E-M
- **THEN** ciphertext forwarding, query access_token, adapter decrypt и provider OAuth header различены; совместимость, plaintext xfail и требуемый wire contract не объявлены разрешёнными или живо проверенными

### Requirement: OAuth state и lifecycle ограничения не скрываются
Baseline MUST консолидировать handoff caveats state/replay, expiry/refresh и key rotation, не повторяя business scenarios соседних capabilities. UUID state и зашифрованное хранение MUST NOT считаться CSRF/replay защитой или доказательством свежести токена.

#### Scenario: S1-11 Callback и state
- **WHEN** reviewer сопоставляет link state и callback DTO E-YA
- **THEN** видит tenant UUID в authorize query и code+tenant в POST body без отдельного state; verification/nonce/replay не доказаны, FT-05 относится к будущему security решению

#### Scenario: S1-12 Expiry и ключи
- **WHEN** reviewer читает G-S1-LIFECYCLE и handoffs Y1/M1
- **THEN** сохранение expiry/refresh не выдаётся за refresh-on-read, а key rotation/versioning/revocation и live совместимость отмечены неизвестными без чтения секретов

### Requirement: Безопасная диагностика сохраняет нормативный приоритет
Документация MUST ссылаться на safe-diagnostics E-N и регистрировать raw exception logging, query/log/telemetry и reflection unknowns как gaps. Наличие HTTP sanitization MUST NOT считаться доказательством отсутствия секретов во всех логах и промежуточных системах.

#### Scenario: S1-13 Known unsafe decrypt log
- **WHEN** E-YC catch-all содержит raw ex в logger и ClientError
- **THEN** G-S1-LOG явно противоставляет это действующему safe-diagnostics contract, не принимает утечку нормой и не исправляет код в docs unit

#### Scenario: S1-14 Query и reflection unknowns
- **WHEN** marker tests E-M не охватывают proxy access logs, telemetry и все loc/path ветки
- **THEN** baseline не заявляет полную sanitization; FT-04 требует synthetic evidence отдельно от deliberate private token response

### Requirement: Dev exposure не доказывает production isolation
Baseline MUST фиксировать tracked host-exposure шаблоны отдельно от фактических bindings и production deployment. Dev-допущение E-N SHALL сохраняться без расширения; production gate защиты чувствительных peer APIs MUST NOT объявляться выполненным.

#### Scenario: S1-15 Compose host publication
- **WHEN** reviewer читает E-X
- **THEN** видит host ports templates, expose/network и uvicorn 0.0.0.0 без предположений о значениях variables, firewall или реальной внешней доступности

#### Scenario: S1-16 Nonblocking docs и production gate
- **WHEN** документационный backfill завершается с G-S1-EXPOSURE
- **THEN** docs planning не блокируется будущим security change, но неизвестная защита не снимает production deployment/release gate из E-N

### Requirement: Health и HTTP boundary не подменяют authorization
Baseline MUST сохранять различие статического health, framework rejection и auth enforcement. Локальная peer normalization MUST NOT переноситься на main backend либо соседние tenant/owner policies.

#### Scenario: S1-17 Health только liveness
- **WHEN** health возвращает status=ok по E-HY/E-HM
- **THEN** это не evidence DB/provider readiness, валидной identity или сетевой изоляции

#### Scenario: S1-18 Framework и backend denial
- **WHEN** malformed peer input получает 400 либо R1 отклоняет method/path
- **THEN** baseline не называет это auth denial и не переписывает backend 401/403; future service auth потребует отдельного согласования HTTP contract

### Requirement: Передача синтезу сохраняет ограниченный ownership
Документационный результат MUST передавать F1 полную матрицу, anchors, gaps, unknowns и future cases без runtime/securityimplementation задач. Общие proposal/design/tasks SHALL завершаться только владельцем F1 после всех slices и до пользовательского approval gate.

#### Scenario: S1-19 Трассировка будущих проверок
- **WHEN** F1 собирает общую test matrix
- **THEN** переносит S1-01..20 и FT-01..08 как документационную трассировку/непроведённые будущие security cases соответственно, не отмечая runtime PASS или запуск тестов

#### Scenario: S1-20 Передача без побочного apply
- **WHEN** S1 заканчивает status/strict и проверку собственных anchors
- **THEN** меняется только эта delta; F1 получает context pack ниже, shared checklist здесь не редактируется, sync/archive/commit/deploy и security fixes не выполняются

### Контекст передачи — локальная декомпозиция и exact F1 context pack

Deliverable S — эта access delta, один архитектурный access slice; 20 docs scenarios и 8 future-case групп. Девять групп действий S1: профиль/контекст, main access clauses, route/prefix inventory, dependency/middleware boundary, source tests, compose exposure, consolidated gaps/matrix, delta drafting, verification/handoff. Это не изменение общего checklist.

| Unit | Профиль | Ownership | Зависит от | Verification |
|---|---|---|---|---|
| PLAN-S1 | Planner | только эта delta | PLAN-Y1, PLAN-Y2, PLAN-M1, PLAN-Y3 | static coverage/anchors + status/strict всего change |
| PLAN-F1 | Planner | shared proposal/design/tasks; регистрация capabilities всех slices | PLAN-S1 и все предыдущие slices | полный planning status/strict, approval gate; не apply |

DAG: `{Y1, Y2, M1, Y3} → S1 → F1 → пользовательский approval gate`. Ни открытые future security decisions, ни старые root QG/tests не prerequisite этого docs unit. Shared proposal пока WIP Y1; отсутствие design/tasks — оставленная работа F1, не разрешение исправить их в S1.

Точный первый context pack F1 (10 файлов, без всего source tree):
1. [Задание 097](<../../../../../docs/tasks/097_yandex_services_retrospective_specs.md#L1-L18>).
2. [Planner core](<../../../../../agents/planner.md#L1-L16>); relevant planning sections — только для исполнения синтеза.
3. [Shared proposal](<../../proposal.md>) — текущий WIP; F1 исправляет устаревшее описание slices/ownership, регистрирует все пять new capabilities и сохраняет baseline/overlay.
4. [OAuth/accounts delta](<../yandex-oauth-accounts/spec.md>) — F1 консолидирует её 21 сценарий и Y1 handoff; S1 читал только access/gaps и anchors proposal.
5. [Gateway delta](<../yandex-metrica-gateway/spec.md>) — 22 сценария, anchors, G-Y2-01..05.
6. [Adapter delta](<../ya-metrica-adapter/spec.md>) — 17 сценариев, anchors, access/key/runtime caveats.
7. [Y runtime delta](<../yandex-service-runtime/spec.md>) — 20 сценариев, anchors и runtime/telemetry gaps.
8. [Эта access delta](<spec.md>) — 20 docs scenarios, вся матрица, G-S1-*, FT-01..08, coverage и граница решений.
9. [Main peer contract](<../../../../specs/yandex-peer-http-contract/spec.md#L35-L79>) — только matrix/governance/boundary; принятая норма, не новая работа normalization.
10. [Main client failures](<../../../../specs/yandex-client-failures/spec.md#L31-L53>) — safe diagnostics/service mapping.

Для уточнения конкретного evidence F1 следует **только соответствующему anchor** таблицы, не перечитывает все implementation/specs деревья. Framework E-F — вспомогательный local observation; его непереносимость и HEAD runtime gap сохранить, не превращать в production evidence. Составить shared deliverables/units/DAG, grouped documentation test matrix/tasks; будущие security решения отделить от завершения ретроспективной документации. Общий change ещё не объявлен apply-ready и ждёт F1/пользовательского approval.

### Verification PLAN-S1

- Статическая AST-сверка route decorators + registration prefixes с этой матрицей: PASS, 28 method/path комбинаций / 20 app-qualified paths; 20 сценариев S1. Приложения не импортировались; HEAD docs учтён по E-F, не runtime.
- Проверка всех 73 Markdown anchors этой delta: PASS, target files существуют, line ranges в границах файлов; семантика источников проверялась точечным чтением, не одним link checker.
- `openspec-local status --change document-yandex-services-baseline --json`: proposal/specs done, design ready, tasks blocked отсутствующим design; `isPlanningComplete=false`. Это ожидаемый handoff F1, не blocker docs slice.
- `openspec-local validate document-yandex-services-baseline --type change --strict`: PASS; INFO о контекстных заголовках deltas не являются warnings/errors; это ненормативный handoff-контекст для F1, не дополнительные requirements.
- Сервисные tests/runtime/security audit, реальные ENV/tokens/credentials, Make/npm/uv/Docker, sync/archive/commit не запускались; оба service tree readonly.
