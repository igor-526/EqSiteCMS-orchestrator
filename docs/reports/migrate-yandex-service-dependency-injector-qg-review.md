# Review: migrate-yandex-service-dependency-injector

**Вердикт: BLOCKED** · **Дата:** 2026-10-14

Реализация перехода завершена: `depends`/FastAPI `Depends` и глобальные settings/DB instances удалены; application/request containers, `create_app`, явный transaction scope, Sentry/Alembic bootstrap внедрены. Проверки согласованного сервиса прошли; runtime/code findings отсутствуют. Общий monorepo gate не завершён из-за clean-worktree prerequisite, поэтому APPROVED не выставляется.

## Источники и согласование

[Change proposal](../../openspec/changes/migrate-yandex-service-dependency-injector/proposal.md), [design и Test matrix](../../openspec/changes/migrate-yandex-service-dependency-injector/design.md), [delta spec](../../openspec/changes/migrate-yandex-service-dependency-injector/specs/yandex-service-dependency-injection/spec.md), [tasks](../../openspec/changes/migrate-yandex-service-dependency-injector/tasks.md). Пользователь согласовал план и поручил начать работу. Более широкий пользовательский `docs/tasks/095_refactoring_dependency_injector_specs.md` не задаёт scope этого change. Конкретное имя ветки в design не задано.

## Lanes и evidence

| Lane | Результат |
|---|---|
| QG-ENV | Пройден: `stackctl ready --no-migrate yandex-service`, 1 локальный rebuild, 0 repair attempts; установлен dependency-injector 4.49.1; HTTP health 200 (1.805 ms), engine SELECT 1. Миграции не требуются, schema diff отсутствует. |
| QG-BE | Пройден: 30 pytest tests, Ruff check/format --check, mypy 60 файлов, flake8, basedpyright. Проверены изоляция графа, отмена, commit failure и сохранение исходного исключения при cleanup error; findings нет. |
| QG-CONTRACTS | Пройден для scope: OpenAPI совпадает с исходным HEAD целиком; targeted 15 tests; Alembic без OAuth ENV и без .env. Существующее отклонение порядка core targets в root Makefile подтверждено в baseline, вне change; не исправлялось. |
| QG-LIVE | Пройден: 8 HTTP cases и SELECT 1 через реальный sessionfactory/PostgreSQL (32.81 ms); OAuth exchange не выполнялся. |
| QG-FE-AUTO | Неприменимо: frontend отсутствует в scope/diff этого change. |
| QG-FE-MANUAL | Неприменимо: UI behavior отсутствует в scope/diff этого change; browser evidence не требуется. |
| QG-FORMAT | BLOCKED: обязательные root make format/lint/test не запускались из-за грязного monorepo worktree. Сервисные проверки изолированной копии прошли, см. ниже. |
| QG-SYNTH | Review/evidence и strict validation завершены; общий verdict BLOCKED. Sync/archive отложены до закрытия root gate. |

В изолированной копии `/tmp/yandex-qg-format-rfuf0ame/service` выполнены `make format`, `make lint`, `make test` с `UV_NO_SYNC=1`: exit 0; formatter оставил 60 файлов без изменений, SHA-256 inventory сохранился; mypy 60 файлов без ошибок, flake8 чисто; pytest 30 passed, 0 failed (0.70s). Это service evidence, не замена root gate.

## Test matrix и Access verification results

| ID | Фактическое покрытие |
|---|---|
| UT-DI-01..05 | `tests/unit/test_containers.py`: последовательные/конкурентные scopes, fresh repository graph, shared client/encryption, service/graph failure, commit failure, cancellation; дополнительно cleanup/construction failure. |
| UT-DI-06 | `tests/api/test_app_di.py`: independent apps/settings и lifespan dispose normal/error без request sessions. |
| UT-DI-07..08 | `tests/api/test_app_di.py`: public health/link/code с fake OAuth без auth и с произвольным Authorization header, OAuth error rollback, прежний 400 validation и OpenAPI baseline equality. |
| UT-DI-09 | `tests/api/test_app_di.py`: обязательный encryption key и Alembic offline bootstrap без OAuth ENV/.env. |
| UT-DI-10 | QG-BE: поиск старого DI/DB globals и полный pytest; 8 исходных tests сохранены, всего 30 passed. |
| SM-DI-01 | QG-LIVE: таблица ниже и real PostgreSQL sessionfactory SELECT 1. |

Непокрытых применимых ID нет. Schema migrations, PostgreSQL persistence/constraints/idempotency, messaging и UI неприменимы: соответствующие SQL/business/contracts не менялись.

| HTTP case | Anonymous HTTP / ms | Authorization header HTTP / ms |
|---|---|---|
| GET /health | 200 / 6.17 | 200 / 3.10 |
| GET /api/auth/link, valid UUID | 200 / 3.70 | 200 / 2.23 |
| GET /api/auth/link, invalid UUID | 400 / 1.39 | 400 / 1.01 |
| POST /api/auth/code, body {} | 400 / 1.40 | 400 / 1.19 |

Все 8 HTTP cases прошли. Header проверяет неизменность public access; это не проверка валидной CMS login session. Protected routes в scope отсутствуют; POST code сохраняет задокументированное public OAuth exception. Успех OAuth покрыт изолированными fake-provider tests; внешний обмен code/credentials не запускался.

## Изменённые пути

Пути от корня monorepo для последующего scoped accounting:

- `services/yandex-service/src/containers/{__init__,application,clients,database,repositories,request,services,settings,shared_services}.py`
- `services/yandex-service/src/{main,settings}.py`, `src/api/yandex_auth.py`, `src/migration/env.py`, `src/utils/{configure_sentry,database}.py` (все сокращённые `src/` пути относятся к yandex-service).
- Удалены `services/yandex-service/src/depends/{__init__,clients,repositories,services,utils}.py`.
- `services/yandex-service/tests/{conftest.py,api/test_health.py,api/test_app_di.py,api/openapi_baseline.json,unit/test_containers.py}`.
- `services/yandex-service/{README.md,pyproject.toml,uv.lock}`; пользовательские dependency/lockfile/scaffold изменения сохранены.
- `scripts/stackctl`: только yandex profile/alias для штатной локальной проверки.
- `openspec/changes/migrate-yandex-service-dependency-injector/{proposal.md,design.md,tasks.md,.openspec.yaml,specs/yandex-service-dependency-injection/spec.md}` и этот report.

## Blocker и остаток

`agents/quality_gate.md` → «Финальная проверка форматирования и тестов» требует: **«Чистый worktree обязателен»** и `git status --porcelain` пуст в корне/сервисах до root commands. QG-FORMAT зафиксировал 10 dirty root entries, 2 пользовательских backend entries (`Dockerfile`, `.dockerignore`) и 20 yandex-service entries. Пользовательские и сторонние изменения сохранены; root formatting и чужие исправления не выполнялись. Количество отражает момент QG-FORMAT до добавления этого отчёта.

Остаются clean/path-accounted root QG-FORMAT, затем повторный QG-SYNTH, sync specs/archive. Commit/merge/push/deploy не выполнялись и не запрашиваются в рамках этого refactor. Открытые tasks не означают дефект контейнерной реализации.

`openspec status --change migrate-yandex-service-dependency-injector`: 4/4 artifacts complete; это полнота артефактов, не закрытие checklist. `openspec validate migrate-yandex-service-dependency-injector --type change --strict`: valid.


## SENTRY-QA follow-up (2026-10-14)

**Scoped result: PASS; code findings: 0.** Исторический общий verdict **BLOCKED** и root QG-FORMAT prerequisite сохраняются. Проверен только согласованный Sentry follow-up; DB lifecycle/Resource redesign, root commands, sync/archive и commit не входят в этот unit.

Сравнение с исходными полями подтвердило сохранение пяти `sentry_*` имён, ENV aliases/defaults, диапазона sample rate [0,1], `.env` path/encoding/extra config и прежней ошибки enabled без DSN. `Settings` больше не содержит Sentry fields; отдельный lazy Singleton `sentry_settings` независим между контейнерами и от Settings/OAuth. `create_app` передаёт именно SentrySettings, SDK kwargs/integrations сохранены. Alembic runtime follow-up не менялся и разрешает только Settings.

`uv run --no-sync pytest -q tests/unit/test_sentry_settings.py tests/api/test_app_di.py` → **20 passed, 0 failed** (0.79s): UT-SENTRY-01..06, independent app/bootstrap/lifespan, public access, validation и полный OpenAPI baseline. SDK init замокан без внешней сети; offline Alembic успешно работает при enabled Sentry без DSN и без OAuth ENV/.env. Ruff check и format --check по 7 затронутым Python-файлам → clean; mypy src/tests → 61 files clean; flake8 src/tests → clean; basedpyright → 0 errors/warnings; service `git diff --check` → clean.

Для live verification прочитаны stack-control/api-smoke-test skills. `stackctl status --json` подтвердил running/healthy `eqsitecms-yandex-service`, порт 8007; `stackctl logs yandex-service --since 5m` подтвердил WatchFiles reload всех четырёх изменённых runtime файлов и успешный startup. Rebuild/repair не требовались. SM-SENTRY-01: public anonymous `GET http://localhost:8007/health` → **200**, `{"status":"ok"}`, **7.66 ms**. Дополнительно `GET /openapi.json` → 200, **7.15 ms**, JSON полностью совпадает с `tests/api/openapi_baseline.json`. Таймаут обеих HTTP-проб — 10s; login и OAuth exchange не выполнялись.

`openspec status --change migrate-yandex-service-dependency-injector` → 4/4 artifacts complete; strict validation → valid. Отмечены только SENTRY-QA.1, SENTRY-QA.2, SENTRY-QA.3 и SENTRY-QA.V.


## RESOURCE-QA follow-up (2026-10-14)

**Scoped result: PASS; code findings: 0.** Исторический общий verdict **BLOCKED**, root QG-FORMAT, sync/archive остаются прежними; проверен только Resource follow-up. Runtime source не изменялся Quality Gate; rebuild, migrations и repair не требовались.

Engine — async Resource с настоящим try/yield/finally/await dispose; sessionmaker Factory получает текущий engine после reinit, без stale binding. Lifespan finally охватывает startup и body exceptions; shutdown errors распространяются. Request transaction helper/private graph сохранён, sessions не создаются на startup; Settings/Sentry/client/encryption и отдельный Alembic engine не получают нового lifecycle. Explicit request-scope async mode повторно включается после DeclarativeContainer deepcopy. Дополнительная non-mutating проверка constructor kwargs с sync Factory override, instance async flags и двух независимых containers прошла: overrides делегируются, состояние не перетекает.

UT-RESOURCE-01..06 трассируются на test_lifespan_disposes_engine_without_sessions, test_lifespan_cleans_up_after_partial_startup_failure, test_lifespan_propagates_resource_shutdown_failure, test_sync_request_scope_override_keeps_awaitable_contract, test_request_scope_resolves_async_engine_before_session_factory, test_engine_resource_reinitializes_session_factory_binding и сохранённые transaction/concurrency/cancellation/API/OpenAPI/Alembic/Sentry regressions. Проверки утверждают identity engine/sessionmaker и dispose count, исходные ошибки и отсутствие startup sessions; непокрытых применимых ID нет.

`uv run --no-sync pytest -q tests/unit/test_containers.py tests/api/test_app_di.py` → **27 passed** (0.67s); full service `pytest -q` → **43 passed** (0.70s). Ruff check/format-check восьми Resource Python-файлов → clean; mypy src/tests → 61 files clean; service git diff --check → clean. Backend handoff также подтверждает clean flake8/basedpyright.

Stack-control status: yandex-service running/healthy, localhost:8007; PostgreSQL running. Read-only docker inspect подтвердил source bind mount /app/src, Uvicorn reload, обнаруженные DB host eqsitecms-db-yandex/port 5432, совпадение DB identity и наличие credentials без вывода секретов. Stack-control logs подтвердил reload всех пяти runtime-файлов, затем application.py, успешные shutdown/startup. SM-RESOURCE-01 выполнен по api-smoke-test с таймаутом HTTP 10s; произвольный Authorization header проверяет сохранённый public access, CMS login/OAuth exchange не выполнялись.

| HTTP case | Anonymous HTTP / ms | Authorization header HTTP / ms |
|---|---|---|
| GET /health | 200 / 7.58 | 200 / 1.09 |
| GET /api/auth/link, valid UUID | 200 / 3.80 | 200 / 2.47 |
| GET /api/auth/link, invalid UUID | 400 / 1.89 | 400 / 1.40 |
| POST /api/auth/code, body {} | 400 / 1.99 | 400 / 1.27 |

Все 8 HTTP cases прошли; POST code сохраняет public OAuth exception. GET /openapi.json → 200 / 7.96 ms, полное JSON equality с fixture. Через stackctl exec yandex-service и установленный Python выполнены await init_resources(), await database.session_factory.async_(), проверка bind identity, реальный session SELECT 1 → **PASS / 69.85 ms**, finally await shutdown_resources() и engine.initialized=false. Схема/SQL business logic не менялись.

Отмечены только RESOURCE-QA.1, RESOURCE-QA.2, RESOURCE-QA.3 и RESOURCE-QA.V. `openspec status --change migrate-yandex-service-dependency-injector` → 4/4 artifacts complete; `openspec validate migrate-yandex-service-dependency-injector --type change --strict` → valid. Исторические незавершённые root задачи сохранены.
