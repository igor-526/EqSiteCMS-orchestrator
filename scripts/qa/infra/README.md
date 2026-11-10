# Изолированная infrastructure acceptance (v1)

Test-only helper; не продуктовая зависимость. Approval change **не является** разрешением
setup/teardown. CLI не создаёт permit. Без отдельного согласия допустимы только offline
unit tests и `preflight` (он не соединяется с target и не доказывает его доступность).

## CLI и schemas

Из корня монорепы:

```sh
python3 scripts/qa/infra/run.py preflight --kind pg --manifest .qa/harden-agent-verification-pipeline/INFRA-1/pg-manifest.json --permit .qa/harden-agent-verification-pipeline/INFRA-1/pg-permit.json
# ТОЛЬКО после отдельного явного согласия пользователя:
python3 scripts/qa/infra/run.py run --kind pg --manifest .qa/harden-agent-verification-pipeline/INFRA-1/pg-manifest.json --permit .qa/harden-agent-verification-pipeline/INFRA-1/pg-permit.json
```

Для NATS **только у `harden-agent-verification-pipeline`** те же команды с `--kind nats` и отдельными `nats-manifest.json` /
`nats-permit.json`. Оба inputs — ignored JSON, без credentials. Структурные контракты:
[`manifest.schema.json`](manifest.schema.json), [`permit.schema.json`](permit.schema.json).
Дополнительные cross-field/expiry/endpoint/command проверки обязательны в
`infra.contracts.validate(manifest, permit, kind)`. JSON Schema отдельно их не заменяет.
Неверные inputs/permit дают exit 2, runtime failure/неполный тест — exit 1.
`preflight` exit 0 означает только **offline-preflight-only**, не real acceptance.

Manifest v1 имеет ровно следующие поля:

- `version: 1`, `change`: один из точных IDs registry ниже;
- `runId`: свежий UUID hex (32 lowercase hex), `kind`: `pg` / `nats`;
- `service`: `seo-service` / `ya-metrica-service`;
- `target`: `id` (opaque safe identifier), `host` (без credentials), `port`;
- PG target дополнительно: `isolation: "dedicated-test-db-role"`, `database` и
  `role` — оба safe identifiers с суффиксом `_test`; роль не admin;
- NATS target: `isolation: "dedicated-test-broker"`;
- PG `resource: {"schema": "qa_<runId>_<12 random hex>"}`;
- NATS `resource`: `stream`, `durable` в формате `qa_<runId>_<12 random hex>`;
  `subject: "qa.<runId>.<последние 12 hex stream>"` (без wildcard);
- `nodeIds`: точные pytest node IDs (параметризованные варианты только для старого change),
  либо только `["selftest"]` для реального helper lifecycle probe **старого change**;
- `timeout`: 1–900 секунд на command; `cleanupTimeout`: 1–30 секунд на cleanup;
  `cleanup: true`.

Permit v1: `version/change/runId/kind/target/resource` **точно равны manifest**;
`consentRef: "approval:<идентификатор отдельного пользовательского согласия>"`
(8–100 alnum/underscore/hyphen после префикса),
`actions: ["setup", "test", "teardown"]`, `expiresAt`: timezone-aware ISO timestamp.
Ссылка должна указывать на настоящее согласие, не на approval proposal/apply.
Никаких автоматически выдаваемых permit, wildcard scope или общего cleanup.
Это fail-closed safety guard, не криптографическое доказательство consent.
Expiry должен покрывать setup, оба command budgets и teardown. Истёкший permit
не разрешает даже teardown: residual требует нового явного согласия на exact scope.

Credentials передаются только через текущую среду процесса:
`QA_INFRA_PG_URL=postgresql://<role>:<secret>@<host>:<port>/<db>`,
`QA_INFRA_NATS_URL=nats://<user>:<secret>@<host>:<port>`.
Не передавать их в argv, manifest, stdout, screenshots, reports; не печатать env.
Нет fallback на DATABASE_URL, TEST_DATABASE_URL, runtime settings или .env.
Endpoint/DB/role URL проверяются на точное совпадение с target до соединения.

## Конечный registry (TOOL-01/02)

`contracts.REGISTRY` и JSON schemas разрешают только следующие комбинации:

| change | service | kind | test file в `tests/integration/` |
|---|---|---|---|
| `harden-agent-verification-pipeline` | `seo-service` | `pg` | `test_acceptance_boundaries.py` |
| `harden-agent-verification-pipeline` | `seo-service` | `nats` | `test_nats_broker.py` |
| `harden-agent-verification-pipeline` | `ya-metrica-service` | `pg` | `test_cleanup_worker_postgres.py`, `test_acceptance_helpers.py` |
| `harden-agent-verification-pipeline` | `ya-metrica-service` | `nats` | `test_nats_broker.py` |
| `seo-metrica-task-monitor` | `ya-metrica-service` | `pg` | `test_metrica_task_list_postgres.py` |

Selftest сохраняется только у старого change для прежних service/kind.
Новый change не разрешает NATS, selftest или прежние PG files. Unknown change,
service/kind, traversal, pytest flags и произвольные test paths отклоняются до
подключения. Только у старого change каждый node —
`tests/integration/<разрешённый file>::test_<имя>`; необязательный параметр
`[<alnum/underscore/hyphen>]` задаётся точно, без glob. Это legacy-правило сохранено.
Для `seo-metrica-task-monitor` registry и manifest schema разрешают **только четыре
точных node IDs ниже**, без произвольных имён функций, суффиксов и параметров
(например, `test_unregistered_probe` и `test_aggregate_identity[unregistered]` запрещены).
Допускается непустая выборка из этих четырёх; для PG-01..04 нужны все четыре:

```text
tests/integration/test_metrica_task_list_postgres.py::test_aggregate_identity
tests/integration/test_metrica_task_list_postgres.py::test_status_order_pagination
tests/integration/test_metrica_task_list_postgres.py::test_consistent_read_snapshot
tests/integration/test_metrica_task_list_postgres.py::test_history_survives_cleanup
```

Для M-1 manifest содержит все обязательные поля v1 выше, ровно
`change: "seo-metrica-task-monitor"`, `service: "ya-metrica-service"`, `kind: "pg"`,
эти exact `nodeIds`, свежий runId и предоставленные
оператором test target/resource. Permit использует тот же change/runId/kind/
target/resource; отдельное настоящее consentRef, actions и expiry обязательны.
Не создавать permit из примера и не искать credentials в app settings.
Примеры CLI с ignored inputs (inputs сами по себе не являются разрешением):

```sh
python3 scripts/qa/infra/run.py preflight --kind pg --manifest .qa/seo-metrica-task-monitor/M-1/pg-manifest.json --permit .qa/seo-metrica-task-monitor/M-1/pg-permit.json
# ТОЛЬКО после отдельного явного разрешения setup/test/teardown на exact scope:
python3 scripts/qa/infra/run.py run --kind pg --manifest .qa/seo-metrica-task-monitor/M-1/pg-manifest.json --permit .qa/seo-metrica-task-monitor/M-1/pg-permit.json
```

Evidence нового запуска: `.qa/seo-metrica-task-monitor/INFRA-1/<runId>/`;
старый путь `.qa/harden-agent-verification-pipeline/INFRA-1/<runId>/` сохранён.
Root выбирается только из проверенного change; подмена runId/path и symlink
за пределы root запрещены. T-1 проверяет только offline guard simulations:
PG target и отдельный permit пока не предоставлены, runtime PASS не заявляется.

## Минимальные prerequisites / разрешения Router

1. **Отдельное разрешение PG** на CREATE/DROP только указанной случайной schema
   в заранее выделенной `_test` DB под заранее выделенной `_test` ролью.
   Helper не создаёт DB/роль и не меняет ACL/Compose. У роли нет superuser,
   CREATEDB, CREATEROLE, BYPASSRLS и CONNECT к non-test databases (включая postgres).
   Изоляция проверяется также SQL-проверками после permit. При стандартном PUBLIC
   CONNECT на product DB guard откажет: нужен подготовленный отдельный test cluster
   или безопасно подготовленные администратором ACL, не auto-repair helper.
2. **Отдельное разрешение NATS** на отдельный test broker, не product broker;
   точный endpoint, stream/durable/subject scope, publish synthetic probe и удаление
   только owned stream вместе с его owned children. Dedicated broker isolation —
   явная внешняя аттестация пользователя/ENV в target+permit; account_info сам по себе
   её не доказывает. Shared product broker не поддерживается даже с test prefix.
3. Доступные service `.venv/bin/python` и `uv.lock` (lock-sync обеспечивает владелец
   среды, helper зависимости не устанавливает). В PG env нужен asyncpg, в NATS —
   nats-py; для service node IDs также pytest и pytest-asyncio. Каждый сервис
   запускается отдельно под своим interpreter; root dependencies не смешиваются.
4. Manifest/permit paths в ignored evidence root; существующий runId не переиспользовать.
   Только для `harden-agent-verification-pipeline`: для real helper selftest выбрать `nodeIds: ["selftest"]` отдельно для каждого kind.
   Это не доказывает recovery/concurrency/production topology service acceptance.

## Service fixture bootstrap (SEO-1 / METRICA-1)

Standalone unit suite не импортирует helper и не требует root/infra. Только в
явном infrastructure режиме fixture добавляет **предоставленный** test-support root:

```python
# QA_TEST_SUPPORT_ROOT явно передаёт Router/владелец suite.
# Монорепа: /srv/eqSiteCMS/scripts/qa; standalone: путь к ТОМУ ЖЕ checkout helper.
import os
import sys
from pathlib import Path

support = Path(os.environ["QA_TEST_SUPPORT_ROOT"]).resolve(strict=True)
assert (support / "infra" / "contracts.py").is_file()
sys.path.insert(0, str(support))
from infra import load_context

# Обязательное имя fixture/dependency для runner collection gate:
# @pytest.fixture
# def qa_infra_context():
#     return load_context("pg")  # либо "nats"
```

Runner сам выставляет PYTHONPATH helper, `QA_TEST_SUPPORT_ROOT`,
`QA_INFRA_MANIFEST`, `QA_INFRA_PERMIT`, `QA_INFRA_ACTIVE` и `QA_INFRA_RESULT`.
Прямой infrastructure вызов без runner-owned journal/permit должен fail,
не skip. Не вендорить старую небезопасную fixture в standalone checkout.

`load_context(kind)` возвращает mapping (не логировать):
`manifest`, `url` (credential value только в памяти), `resource`;
PG также `connect_args={"server_settings":{"search_path": schema}}` и
`version_table_schema=schema`. Для SQLAlchemy явно сменить URL driver на
`postgresql+asyncpg` в памяти. Engine `NullPool`, hide_parameters=True;
никакого `,public`, app settings или default schema. Миграции используют
`version_table_schema` явно; extensions — только schema-qualified, не public fallback.
Fixture **использует уже созданную runner schema/stream**, не генерирует другую,
не создаёт/удаляет root resource. Dispose/rollback session в fixture обязателен.
Дополнительная NATS topology — только внутри exact owned stream/subject prefix;
все durables должны быть exact manifest durable. Не менять canonical streams.

Legacy Node-ID allowlist (`harden-agent-verification-pipeline`):
`tests/integration/test_nats_broker.py::test_*` обоих сервисов;
PG SEO: `test_acceptance_boundaries.py`; PG Метрика:
`test_cleanup_worker_postgres.py`, `test_acceptance_helpers.py`.
Новый change — только четыре exact nodes из registry выше.
Без pytest flags, arbitrary exec и shell.
Collection gate требует dependency `qa_infra_context` до setup/root mutation;
старые fixtures **ещё не поддерживаются**, их изменяют SEO-1/METRICA-1.
Runner отключает plugin autoload, загружает asyncio/plugin gate явно,
очищает PYTEST_ADDOPTS и app env. Collection-only не acceptance.
Skip/xfail/0 tests/missing selected IDs/ошибка teardown дают ненулевой результат.
Raw subprocess stdout/stderr отбрасывается (может содержать credentials).

## Lifecycle / evidence

Journal `.qa/<проверенный change>/INFRA-1/<runId>/resources.json`
записывается **до CREATE**. Confirmed ownership фиксируется после успешного
CREATE; коллизия не усыновляется. В finally только exact confirmed root
удаляется с повторным guard и timeout. NATS дополнительно сверяет synthetic
ownership description и subjects перед delete; config before/after probe
сохраняется allowlisted. Pending/timeout/crash оставляет residual manifest.
Неопределённый CREATE (потерян ответ) **не** удаляется автоматически: требуется
reconciliation оператором с тем же exact target/resource и действующим согласием.
Нет wildcard purge/list-all-delete и нет автоматического crash recovery.

`summary.json`: fingerprint manifest, status, scope; `tests.json`: только counts/status,
`collection.json`: явно collection-only. Journal не содержит credentials.
`state=removed` доказывает только подтверждённый cleanup; отсутствие финального
summary/незавершённый journal не считается PASS. Hard worker timeout останавливает
process group; cleanup после SIGKILL не обещается, journal остаётся для оператора.

## Offline INF-01

```sh
python3 -m unittest discover -s scripts/tests -p test_qa_infra.py
```

Все permits/targets в этом suite — synthetic in-memory simulations; test.invalid,
никаких соединений. Offline artifacts suite в `.qa/seo-metrica-task-monitor/T-1-FIX-1/offline/`;
симулированный CLI journal сохраняет зарегистрированный change-specific root. Эти PASS **не заменяют**
разрешённые real PG/NATS selftests и независимую QG acceptance.
