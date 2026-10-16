# QG-BE — normalize-yandex-client-failures

**Lane: failed. Unit: done (review завершён).** Общий вердикт оставлен QG-SYNTH. Source не изменялся.

## Scope и результат

Проверен единый backend/runtime slice двух peers: три HTTP clients, локальные exceptions/Protocol, service mapping, main handlers и относящиеся unit/API tests. Использован переданный handoff пяти BE units; реализация не восстанавливалась заново. Не проверялись root tooling, другие сервисы и полная access matrix (QG-CONTRACTS). QG-ENV passed принят по handoff; dev exposure не означает подтверждённую production isolation.

Client→service→HTTP границы сохранены: сервисы используют Protocol, cross-service Python imports и преобразование интеграционных ошибок в роутерах не добавлены. Timeout/transport/JSON/DTO и lifecycle failures нормализованы; cancellation/BaseException и identity уже типизированного исключения сохранены, HTTP clients закрываются. Non-2xx проверяется до JSON. OAuth не обращается к repository до валидного профиля. Typed service catches узкие, repository/programming errors не маскируются под интеграционные. Partial/empty200, numeric strings, прежний total и pagination сохранены. Rollback выполняется transactional route до HTTP response, а не handler. Safe HTTP payload/debug/slash policy подтверждены; однако безопасность unexpected-error logging не обеспечена (BE-01).

## Findings

### BE-01 — P1 / blocking: raw unexpected exception попадает в штатный ASGI server log

- Пути: [YA main:83–89](../../../services/yandex-service/src/main.py#L83-L89), [M main:71–76](../../../services/ya-metrica-service/src/main.py#L71-L76).
- Owner: Backend, deliverables A/B. Suggested unit: `BE-FIX-HTTP-LOG` — один tightly-coupled HTTP error-boundary slice обоих peers, без изменения auth/status/success/transaction контрактов; verification одной backend test/lint группой.
- `@app.exception_handler(Exception)` устанавливает handler ServerErrorMiddleware. После безопасного ответа Starlette повторно выбрасывает исходное исключение; штатный `uvicorn ... run_asgi` пишет traceback вместе с raw exception и chained cause. `debug=False` защищает HTTP body, но не этот log. Если исключение содержит token/code/URL/персональные данные, они оказываются в runtime logs. Это ошибка обработки обычного зарегистрированного запроса до ответа, а не исключённый из гарантии startup/proxy/process failure.
- Требование: [client spec:27–37](../../../openspec/changes/normalize-yandex-client-failures/specs/yandex-client-failures/spec.md#L27-L37), [HTTP spec:11–13](../../../openspec/changes/normalize-yandex-client-failures/specs/yandex-peer-http-contract/spec.md#L11-L13); ось API-03.
- Воспроизведено отдельно в каждом peer реальным `uvicorn.protocols.http.h11_impl.RequestResponseCycle.run_asgi(main.app)` с mock transport/h11, без TCP, startup, Docker или изменения исходников. На in-memory `/health` route установлен ASGI endpoint, бросающий `RuntimeError('QG_SYNTHETIC_SECRET_MARKER')`; logger Uvicorn направлен в StringIO. В обоих случаях: `HTTP_400=True`, `SECRET_IN_RESPONSE=False`, **`SECRET_IN_SERVER_LOG=True`, `TRACEBACK_IN_SERVER_LOG=True`**. Оба Python прогона exit 0.
- Существующие [YA tests:14–56](../../../services/yandex-service/tests/api/test_exception_handlers.py#L14-L56) и [M tests:78–97](../../../services/ya-metrica-service/tests/api/test_counters_api.py#L78-L97) наблюдают только in-process HTTP с подавлением raised app exceptions, не реальный server logger. Поэтому зелёные caplog assertions этот дефект не обнаруживают.
- Исправление владельцу: обеспечить безопасную обработку ordinary unexpected failures на ASGI boundary без передачи raw исключения server logger, сохранив rollback до ответа, cancellation/BaseException и ограничения уже начатого response; добавить server-boundary regression с secret в exception/cause. Не отключать диагностику целиком: оставить безопасную категорию.

## Verification evidence

Одна backend review verification group из корня, workspace-local UV cache:

```bash
UV_CACHE_DIR="$PWD/.cache/uv" make -C services/yandex-service test lint
UV_CACHE_DIR="$PWD/.cache/uv" make -C services/ya-metrica-service test lint
```

| Peer | Test | Lint | Exit |
|---|---|---|---|
| YA | 658 passed, 7 deselected, 2 xfailed; 3.29 s | mypy: 104 files, no issues; flake8 clean | 0 |
| M | 257 passed; 1.50 s | mypy: 54 files, no issues; flake8 clean | 0 |

M mypy выдаёт только существующий informational `annotation-unchecked`, не ошибку. Legacy GAP-MET-01 и OAuth URL-encoding xfail не расширялись в findings. Make format/autofix/root gates/runtime manage/commits не запускались.

Для воспроизведения BE-01 из каталога любого из двух peers использован `UV_CACHE_DIR="$PWD/.cache/uv" PYTHONPATH=src:. uv run python -` со следующим hermetic кодом (в stdout только boolean evidence, маркер синтетический):

```python
import tests.conftest
import asyncio, io, logging
from unittest.mock import Mock
import h11
import main
from uvicorn.protocols.http.h11_impl import RequestResponseCycle

async def fail(scope, receive, send):
    raise RuntimeError('QG_SYNTHETIC_SECRET_MARKER')

for route in main.app.routes:
    if getattr(route, 'path', '') == '/health':
        route.app = fail
stream = io.StringIO()
logger = logging.getLogger('qg.hermetic.uvicorn')
logger.handlers = [logging.StreamHandler(stream)]
logger.propagate = False
transport = Mock()
transport.is_closing.return_value = False
flow = Mock()
flow.write_paused = False
scope = {'type': 'http', 'asgi': {'version': '3.0', 'spec_version': '2.3'},
         'http_version': '1.1', 'method': 'GET', 'scheme': 'http',
         'path': '/health', 'raw_path': b'/health', 'query_string': b'',
         'root_path': '', 'headers': [], 'server': ('test', 80), 'client': ('test', 1)}

async def run():
    cycle = RequestResponseCycle(
        scope=scope, conn=h11.Connection(h11.SERVER), transport=transport,
        flow=flow, logger=logger, access_logger=logger, access_log=False,
        default_headers=[], message_event=asyncio.Event(), on_response=lambda: None)
    await cycle.run_asgi(main.app)
    wire = b''.join(call.args[0] for call in transport.write.call_args_list)
    print('HTTP_400=', b'400' in wire.split(b'\r\n', 1)[0])
    print('SECRET_IN_RESPONSE=', b'QG_SYNTHETIC_SECRET_MARKER' in wire)
    print('SECRET_IN_SERVER_LOG=', 'QG_SYNTHETIC_SECRET_MARKER' in stream.getvalue())
    print('TRACEBACK_IN_SERVER_LOG=', 'Traceback' in stream.getvalue())

asyncio.run(run())
```

## Traceability UT/API

Источник осей: [Test matrix:156–178](../../../openspec/changes/normalize-yandex-client-failures/design.md#L156-L178). Ниже проверена backend behavior часть; полный перебор anonymous/auth/foreign строк принадлежит CONTRACTS.

| IDs | Реальные тесты / evidence | Результат |
|---|---|---|
| UT-C-01 | [YA OAuth](../../../services/yandex-service/tests/unit/test_yandex_oauth_client.py): `test_generic_request_wire_contract`, `test_token_exchange_wire_and_response_dto`, `test_user_info_wire_and_optional_phone_dto`; [YA peer](../../../services/yandex-service/tests/unit/test_yandex_metrica_service_client.py): `test_counters_wire_query_and_dto`, `test_counter_response_defaults_to_empty_items`; [M client](../../../services/ya-metrica-service/tests/clients/test_yandex_metrica.py): `test_make_request_accepts_successful_dictionary_response`, `test_get_counters_maps_pagination_and_authorization` | passed |
| UT-C-02/03 | те же три client modules: transport/network parametrization, `test_lifecycle_failure` / `test_lifecycle_failures_are_wrapped`, cause/status/closed assertions | passed |
| UT-C-04/05 | три client modules: status×JSON/HTML/empty, non-object JSON и malformed JSON tests | passed |
| UT-C-06 | два YA client modules: `test_oauth_response_dto_validation`, `test_counter_response_dto_validation` | passed |
| UT-C-07 | [M client](../../../services/ya-metrica-service/tests/clients/test_yandex_metrica.py): `test_get_counters_rejects_unusable_top_level`, `test_get_counters_preserves_rows_and_partial_items`; [M service](../../../services/ya-metrica-service/tests/unit/test_yandex_metrica_service.py): `test_invalid_counters_are_skipped_without_losing_valid_entries`, `test_empty_after_skip_keeps_upstream_total` | passed |
| UT-C-08 | три client modules: cancellation/system/typed failure identity и high-level boundary tests | passed |
| UT-C-09 | три client modules: safe diagnostics/caplog/capsys; [YA exception](../../../services/yandex-service/tests/unit/test_exceptions.py) и [M exception](../../../services/ya-metrica-service/tests/unit/test_schemas_exceptions.py) legacy/status/category tests | client boundary passed; unexpected runtime logs — BE-01 |
| UT-S-01 | [YA OAuth service:116–150](../../../services/yandex-service/tests/unit/test_yandex_oauth_service.py#L116-L150): `test_provider_failures_map_to_client_error_before_writes`, exchange/profile×http/timeout/response | passed |
| UT-S-02 | [YA service:81–105](../../../services/yandex-service/tests/unit/test_yandex_metrica_service.py#L81-L105): `test_provider_failure_maps_to_safe_client_error`; [M service:124–144](../../../services/ya-metrica-service/tests/unit/test_yandex_metrica_service.py#L124-L144): typed failure/chaining, unrelated failure identity | passed |
| UT-S-03 | оба Metrica service modules: pagination; YA missing account/no client и repository propagation; M decrypt/no downstream и fixed-message tests | passed; legacy encrypted-token characterization не переоценена |
| API-01/02 | соответствующие route API suites прошли; backend malformed input/no service, absent resource и no writes checked; полный access audit передан CONTRACTS | backend часть passed |
| API-03 | [YA exception handlers](../../../services/yandex-service/tests/api/test_exception_handlers.py), [M counters API](../../../services/ya-metrica-service/tests/api/test_counters_api.py): safe400/debug/headers/response-validation | HTTP passed; **server logging failed BE-01** |
| API-04 | [YA health](../../../services/yandex-service/tests/api/test_health.py), [M health](../../../services/ya-metrica-service/tests/api/test_health.py); YA DELETE route suites: 204 empty | passed |
| API-05 | [YA OAuth:44–90](../../../services/yandex-service/tests/api/test_yandex_auth.py#L44-L90), [YA peer:72–121](../../../services/yandex-service/tests/api/test_yandex_metrica.py#L72-L121), [M chain:145–206](../../../services/ya-metrica-service/tests/api/test_counters_api.py#L145-L206): реальные service/client + MockTransport, timeout/transport/http/json/DTO/top-level400, partial/empty200; [transaction tests](../../../services/yandex-service/tests/api/test_transactions.py) и [assert_transaction:119–122](../../../services/yandex-service/tests/api/conftest.py#L119-L122): rollback/close до response | passed |

## Точечная оценка legacy authorization logging

В [authorization service:25–33](../../../services/yandex-service/src/core/services/yandex_service_authorization_service.py#L25-L33) остаётся raw generic decrypt logging. Реальный [EncryptionService:17–22](../../../services/yandex-service/src/core/services/encryption_service.py#L17-L22) для повреждённого ciphertext даёт fixed ValueError, а UnicodeDecodeError также попадает в ValueError branch. Поэтому штатный invalid-token путь не доказывает новую утечку из generic branch; искусственная подмена decrypt на RuntimeError с секретом сама по себе не основание расширять ownership. HTTP payload теперь generic независимо от legacy message. Это существующий остаточный риск для иных неожиданных decrypt failures, не отдельный blocking finding данного diff. BE-01, напротив, воспроизведён на реальном server error boundary обоих приложений и нарушает заявленную гарантию unexpected-error safety.

## Handoff

QG-BE.1/.2/.V выполнены как review/evidence, а не утверждение отсутствия дефектов. До устранения BE-01 lane не passed. Router возвращает finding владельцу; затем targeted QG-BE повтор. Общий APPROVED не выдавался. Live/FORMAT/SYNTH, production isolation и полный CONTRACTS не выполнялись этим unit.

## QG-BE-R1 — targeted recheck BE-01

**Lane: passed. Unit: done. BE-01 закрыт в обоих peers.** Исходные FAILED, finding и reproducer выше сохранены как история первоначального review; текущий результат относится только к исправлению BE-01. Общий вердикт остаётся исключительно QG-SYNTH.

### Scope и проверенные гарантии

Приняты два переданных FIX handoff: YA — main и existing exception-handlers test; M — main и выбранный existing health test. Повторно проверены только эти main/test diff, PLAN-7 constraints и минимальные transaction/fixture interfaces. Полный change/client/access/tooling review не повторялся.

- [YA boundary:44–76](../../../services/yandex-service/src/main.py#L44-L76) и [M boundary:31–64](../../../services/ya-metrica-service/src/main.py#L31-L64): user ASGI middleware находится **внутри ServerErrorMiddleware и снаружи ExceptionMiddleware** (порядок дополнительно проверен на фактически построенном stack). Generic Exception/500 handler отсутствует; специализированный ResponseValidationError handler сохранён. Ordinary Exception до response start поглощается только после unwind inner app и преобразуется в прежний safe400. Raw exception/cause не передаются server rethrow; controlled diagnostic category сохраняется. Debug и slash redirects выключены. Auth/access/status/partial contracts этим fix не изменены.
- [YA real-Uvicorn regression:101–152](../../../services/yandex-service/tests/api/test_exception_handlers.py#L101-L152) и [M regression:73–137](../../../services/ya-metrica-service/tests/api/test_health.py#L73-L137) действительно вызывают штатный RequestResponseCycle.run_asgi(main.app), без его mock/подмены. В failing route RuntimeError содержит synthetic secret, chained ValueError — отдельный secret. Проверяются HTTP400 **и response_complete**, отсутствие маркеров в wire/server/controlled logs, отсутствие server traceback и наличие safe unexpected category. Route/logger overrides восстанавливаются; M также восстанавливает middleware-stack state. В YA сохраняющийся lazy stack содержит ту же неизменённую chain и не захватывает подменённый route endpoint; route.app восстанавливается monkeypatch.
- Отрицательные гарантии: [YA:155–181](../../../services/yandex-service/tests/api/test_exception_handlers.py#L155-L181), [M:140–182](../../../services/ya-metrica-service/tests/api/test_health.py#L140-L182) подтверждают identity/propagation cancellation и BaseException, а также уже начатого partial200 без второго ответа. Дополнительный probe обоих middleware подтвердил bypass lifespan **и websocket**: исходный RuntimeError identity сохранён, send не вызван. Это не обещание safe400 для startup/process/started-response failures.
- Rollback сохранён: [YA TransactionalRoute:17–28](../../../services/yandex-service/src/utils/transactional_route.py#L17-L28) завершает session.begin и shutdown до выхода в outer middleware. [Fixture:106–122](../../../services/yandex-service/tests/api/conftest.py#L106-L122) наблюдает точную последовательность open → begin → rollback → close → response400, а не только факт rollback когда-нибудь. Direct API unexpected и response-validation tests остаются зелёными, как и 17 transaction tests. В [M read route:13–30](../../../services/ya-metrica-service/src/api/yandex_metrica.py#L13-L30) нет transactional write scope; его независимый Uvicorn probe подтверждает inner finally до transport.write, не выдавая synthetic unwind за SQL rollback.

### Новые команды и evidence

Одна targeted backend verification group обоих peers; выполнены **полные service test/lint**, а не только целевые тесты, чтобы независимо перепроверить direct API и rollback regressions без повторного change review:

```bash
UV_CACHE_DIR="$PWD/.cache/uv" make -C services/yandex-service test lint
UV_CACHE_DIR="$PWD/.cache/uv" make -C services/ya-metrica-service test lint
```

| Peer | Test | Lint | Exit |
|---|---|---|---|
| YA | 662 passed, 7 deselected, 2 xfailed; 3.46 s | mypy: 104 files, no issues; flake8 clean | 0 |
| M | 262 passed; 1.45 s | mypy: 54 files, no issues; flake8 clean | 0 |

M annotation-unchecked остаётся informational note, не error. Числа совпали с FIX handoffs. Existing infrastructure deselection/legacy xfails не менялись.

Дополнительно из корня выполнен inline hermetic Python sensitivity probe по обоим peers, entry command:

```bash
# Для каждого service = services/yandex-service, services/ya-metrica-service:
UV_CACHE_DIR="$PWD/.cache/uv" PYTHONPATH=src:. uv run --directory "$service" python -
```

Переданный stdin расширял исходный reproducer выше: импорт test conftest для offline settings; отдельный активный logging.Logger(ERROR) → StringIO; реальные h11/RequestResponseCycle и mock transport; failing health route с RuntimeError(secret) from ValueError(cause-secret) и finally-флагом. Каждый transport.write проверял finally-флаг. Captured controlled logs наблюдались отдельным handler. После safe-прогона выполнялся **положительный контроль чувствительности**: `ServerErrorMiddleware(stack.app.app, handler=main.unexpected_error_handler, debug=False)` при chain ServerErrorMiddleware → SafeBoundary → ExceptionMiddleware, то есть inner ExceptionMiddleware без safe boundary, с прежним generic-handler placement. Ни source, ни Uvicorn run_asgi не менялись. Для обоих прогонов server logger после запроса дополнительно писал diagnostic-probe, который обязан присутствовать в StringIO. Route, app.middleware_stack и handlers восстанавливались в finally; процесс изолирован от pytest/runtime.

Фактический stdout **для каждого peer** (общая команда exit 0):

```text
SAFE: HTTP400 complete; markers/traceback absent; category present; unwind before write; logger active
CONTROL: former ServerErrorMiddleware handler reproduces secret/cause/traceback log leak
NON_HTTP: lifespan/websocket preserve exception identity and emit no response
```

В CONTROL проверены complete400 и наличие **всех трёх** secret/cause/Traceback в server log. Следовательно, отсутствие утечки в SAFE не является ложным pass из-за выключенного logger, недошедшего route или неполного ответа. Контроль утечки полностью in-memory с синтетическими маркерами, без публикации raw captured logs.

### Handoff / остаток

QG-BE-R1.1/.V выполнены; новых findings нет. BE-01 больше не блокирует LIVE со стороны backend lane; дополнительно нужен результат QG-CONTRACTS-R1 по DAG. ENV readiness/SQL evidence не пересматривались; production Q2 isolation остаётся release condition, не dev blocker. LIVE/FORMAT/SYNTH не выполнялись. Runtime source, сервисные тесты и окружение не изменялись; format/autofix/rebuild/commits не запускались.
