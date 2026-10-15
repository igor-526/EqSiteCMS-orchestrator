# Tasks — migrate-yandex-service-dependency-injector

Runtime ownership, DAG, contextFiles и test matrix заданы в design.md. Все проверки отражать evidence; checkbox отмечать сразу после фактического выполнения. План уже согласован, повторное approval не требуется.

## Execution units

| Unit | Профиль | Ownership | Зависимость | Verification | contextFiles |
|---|---|---|---|---|---|
| DI-1 | Backend | containers, utils/database, test_containers | — | pytest unit/lint | design.md#execution-units; spec.md; depends/*; containers/settings.py; utils/database.py |
| DI-2 | Backend | main/API/settings/Sentry/Alembic/README/config/tests/api, удаление depends | DI-1 | full pytest/lint/types | design.md#execution-units; spec.md; main/API/settings/Sentry/Alembic; test_health.py; DI-1 handoff |
| OPS-DI | Backend | scripts/stackctl only: yandex profile/alias | DI-2 | node --check; ready --no-migrate yandex-service | scripts/stackctl; docker-compose.yandex.yml; stack-control skill; design.md |
| QG-ENV | Quality Gate | локальный service runtime | OPS-DI | stack-control; локальный rebuild; DB/API readiness | design.md#postgresql-для-smoke-тестов; runtime config; stack-control skill |
| QG-BE | Quality Gate | read-only service review | QG-ENV | test matrix/backend checks | design.md#test-matrix; service diff; tasks.md |
| QG-CONTRACTS | Quality Gate | read-only contracts/architecture | QG-ENV | specs/access/OpenAPI | spec.md; API diff; design.md |
| QG-LIVE | Quality Gate | локальные live проверки | QG-BE, QG-CONTRACTS | SM-DI-01 | design.md#test-matrix; QG-ENV evidence; api-smoke-test skill |
| QG-FORMAT | Quality Gate | финальные format/lint/test | QG-LIVE | root make format/lint/test | root Makefile; diff; lane evidence |
| QG-SYNTH | Quality Gate | OpenSpec/handoff | QG-FORMAT | strict validate/общий verdict | все артефакты change; lane evidence |
| SENTRY-1 | Backend | только восемь файлов follow-up из design | DI-2 (done) | focused pytest/styles/types | design.md#follow-up; spec.md Sentry requirement; src/settings.py; src/containers/settings.py; src/main.py; src/utils/configure_sentry.py; tests/conftest.py; tests/api/test_app_di.py; tests/unit/test_sentry_settings.py; src/migration/env.py (read-only) |
| SENTRY-QA | Quality Gate | read-only service diff, собственный checklist/evidence | SENTRY-1 | focused checks/live health/strict validate | design.md#test-matrix-sentry; spec.md Sentry requirement; SENTRY-1 handoff; stack-control/api-smoke-test skills |

| RESOURCE-1 | Backend | восемь runtime/test файлов Resource follow-up; README только minor | SENTRY-QA (done) | focused/full service pytest/styles/types | design.md#follow-up-resource-lifecycle-db-engine-2026-10-14; spec.md lifecycle/async requirements; восемь paths из design; containers/request.py и migration/env.py (read-only) |
| RESOURCE-QA | Quality Gate | read-only Resource diff, свой checklist/evidence | RESOURCE-1 | scoped checks/live HTTP/DB/strict validate | design.md#test-matrix-resource; spec.md; RESOURCE-1 handoff; stack-control/api-smoke-test skills |

## 1. DI-1 — контейнеры и request lifecycle (профиль: Backend)

**Specs:** yandex-service-dependency-injection · **Пути:** containers/**, utils/database.py, tests/unit/test_containers.py · **Зависит от:** —

- [x] DI-1.1 Развить пользовательский containers scaffold: SettingsContainer с независимыми lazy settings providers.
- [x] DI-1.2 Создать DatabaseContainer Singleton engine/sessionmaker и убрать DB globals, сохранив helper-функции и параметры SQLAlchemy.
- [x] DI-1.3 Создать ClientsContainer Singleton OAuth client и SharedServicesContainer Singleton encryption.
- [x] DI-1.4 Создать RepositoriesContainer session Dependency + Factory repository и ServicesContainer Factory OAuth service.
- [x] DI-1.5 Создать отдельный RequestContainer с Object session, client/encryption и вложенной composition.
- [x] DI-1.6 Реализовать async request-scope с commit/rollback BaseException/close, включая commit failure/cancellation.
- [x] DI-1.7 Собрать ApplicationContainer с Factory request_scope без Resource/Closing/shared request overrides.
- [x] DI-1.8 Реализовать и прогнать UT-DI-01..UT-DI-05 из design.md → Test matrix.
- [x] DI-1.V Проверить unit pytest и non-mutating Ruff для ownership; отметить задачи и передать DI-2 точный интерфейс/evidence.

## 2. DI-2 — HTTP и bootstrap (профиль: Backend)

**Specs:** yandex-service-dependency-injection · **Пути:** main/API/settings/Sentry/Alembic/depends/README/config/tests/api · **Зависит от:** DI-1

- [x] DI-2.1 Убрать глобальные Settings/YandexAppSettings instances, сохранив классы, public names/ENV/валидацию.
- [x] DI-2.2 Реализовать create_app(container=None), app.state.container и main:app с прежними handlers/routes.
- [x] DI-2.3 Включить dispose engine в lifespan finally без создания request-sessions на startup.
- [x] DI-2.4 Перевести yandex_auth endpoints на Request и явный async with scope с прежними бизнес-вызовами.
- [x] DI-2.5 Передавать Settings в configure_sentry; Alembic разрешает только SettingsContainer.settings.
- [x] DI-2.6 Удалить src/depends и все FastAPI Depends/imports, обновить first-party конфигурацию без отката dependency/lockfile пользователя.
- [x] DI-2.7 Обновить README: container scopes, app factory, transaction lifecycle, миграции без OAuth ENV.
- [x] DI-2.8 Реализовать UT-DI-06..UT-DI-09; сохранить baseline tests и получить UT-DI-10 evidence.
- [x] DI-2.V Прогнать полный pytest, Ruff check/format --check и basedpyright; baseline findings отделить от регрессий; передать QG handoff.

## 3. QG-BE — общий backend gate (профиль: Quality Gate)

**Specs:** yandex-service-dependency-injection · **Пути:** read-only service diff/checks · **Зависит от:** QG-ENV

- [x] QG-BE.1 Проверить design Test matrix и ownership; отсутствие shared request state и старого DI.
- [x] QG-BE.2 Проверить backend lifecycle matrix и Alembic без OAuth ENV без реальных внешних OAuth вызовов.
- [x] QG-BE.3 Прогнать общие non-mutating tests/lint/types; findings вернуть владельцу DI-1/DI-2 и повторить затронутые проверки.
- [x] QG-BE.V Выдать backend lane verdict/evidence; общий verdict принадлежит QG-SYNTH.

## 4. QG-ENV — локальная среда (профиль: Quality Gate)

**Specs:** yandex-service-dependency-injection · **Пути:** локальный runtime · **Зависит от:** OPS-DI

- [x] QG-ENV.1 Через stack-control обнаружить локальный сервис/PostgreSQL и получить параметры docker inspect без вывода секретов.
- [x] QG-ENV.2 Через stack-control выполнить необходимый локальный rebuild yandex-service без миграций, затем проверить DB/API readiness, reload и installed dependency-injector; ручные Docker mutations не выполнять.
- [x] QG-ENV.V Передать readiness evidence или конкретный blocker; не объявлять доступность без проверки.

## 5. QG-CONTRACTS — контракты и архитектура (профиль: Quality Gate)

**Specs:** yandex-service-dependency-injection · **Пути:** read-only diff/specs · **Зависит от:** QG-ENV

- [x] QG-CONTRACTS.1 Проверить ownership и соответствие diff согласованным specs/tasks, отсутствие изменений внешних контрактов.
- [x] QG-CONTRACTS.2 Проверить access matrix/OpenAPI и сохранение public POST OAuth exception без нового auth.
- [x] QG-CONTRACTS.V Вернуть contract lane verdict/evidence и findings владельцам.

## 6. QG-LIVE — локальный smoke (профиль: Quality Gate)

**Specs:** yandex-service-dependency-injection · **Пути:** live HTTP/DB checks · **Зависит от:** QG-BE, QG-CONTRACTS

- [x] QG-LIVE.1 Выполнить SM-DI-01 из design через api-smoke-test на localhost:8007 с реальной обнаруженной PostgreSQL: публичные health/link и invalid UUID/code payload, без OAuth code exchange и CMS login.
- [x] QG-LIVE.V Передать ответы health/link/validation и DB readiness evidence; недоступный runtime отметить blocker, не успешным smoke.

## 7. QG-FORMAT — финальная проверка (профиль: Quality Gate)

**Specs:** yandex-service-dependency-injection · **Пути:** согласованная область изменения · **Зависит от:** QG-LIVE

- [ ] QG-FORMAT.1 Выполнить clean-worktree workflow router и root make format/lint/test с сохранением пользовательского diff и без расширения scope.
- [x] QG-FORMAT.V Передать результаты финальных проверок или конкретные blockers QG-SYNTH.

**QG-FORMAT evidence (2026-10-14): BLOCKED.** Clean-worktree guard из `agents/quality_gate.md` не выполнен: корень — 10 dirty entries; `services/backend` — 2 (`.dockerignore`, `Dockerfile`); `services/yandex-service` — 20. Пользовательские и сторонние изменения сохранены; root `make format/lint/test` не запускались. QG-FORMAT.1 остаётся открытым.

В изолированной копии текущего yandex-service `/tmp/yandex-qg-format-rfuf0ame/service` выполнены сервисные `make format`, `make lint`, `make test` с `UV_NO_SYNC=1`: все exit 0; formatter оставил 60 файлов без изменений, SHA-256 inventory не изменился; mypy — 60 файлов без ошибок; flake8 — чисто; pytest — 30 passed, 0 failed, 0.70s. Эти проверки не заменяют обязательный root gate.

## 8. QG-SYNTH — спецификации и handoff (профиль: Quality Gate)

**Specs:** yandex-service-dependency-injection · **Пути:** этот OpenSpec change · **Зависит от:** QG-FORMAT

- [x] QG-SYNTH.1 Сопоставить результат со specs/tasks и evidence всех lanes, включая QG-ENV; QG-FE-AUTO/QG-FE-MANUAL неприменимы; свести findings в единый report.
- [ ] QG-SYNTH.1S Выполнить sync specs после закрытия root QG-FORMAT, без расширения scope.
- [x] QG-SYNTH.2 Выполнить openspec status и validate --type change --strict.
- [ ] QG-SYNTH.2A После закрытия задач подготовить archive по локальному workflow.
- [x] QG-SYNTH.V Подготовить итоговый report/handoff с diff/checks/ограничениями для Router; merge/push/deploy оставить оператору.

**QG-SYNTH evidence (2026-10-14): BLOCKED.** Scoped migration/checks complete; runtime/code findings нет. Единый report: `docs/reports/migrate-yandex-service-dependency-injector-qg-review.md`. OpenSpec status: 4/4 artifacts complete; strict change validation: valid. Root QG-FORMAT.1, sync specs и archive остаются открытыми из-за clean-worktree guard; service evidence не заменяет root gate.

## 9. OPS-DI — регистрация локального runtime (профиль: Backend)

**Specs:** yandex-service-dependency-injection · **Пути:** scripts/stackctl only · **Зависит от:** DI-2 · **Порядок:** перед QG-ENV, независимо от номера секции.

- [x] OPS-DI.1 Прочитать существующие registry и compose yandex-service; добавить только необходимый yandex profile и alias yandex-service в scripts/stackctl без изменения других service definitions.
- [x] OPS-DI.2 Проверить node --check scripts/stackctl и scripts/stackctl ready --no-migrate yandex-service; schema migration не нужна, недоступность runtime фиксировать evidence.
- [x] OPS-DI.V Передать QG-ENV interface/evidence для штатного локального rebuild, не выполняя deploy/merge/push.

## 10. SENTRY-1 — отдельные настройки Sentry (профиль: Backend)

**Specs:** yandex-service-dependency-injection · **Пути:** восемь файлов из design → Follow-up · **Зависит от:** DI-2 (done). Прямое поручение пользователя; повторное approval не требуется. Старые выполненные tasks сохраняются как историческое evidence.

- [x] SENTRY-1.1 Выделить SentrySettings в src/settings.py: пять прежних fields/aliases/defaults/ge/le, прежний .env config и DSN validator; Settings оставить app/DB/encryption без Sentry reexports/globals.
- [x] SENTRY-1.2 Добавить независимый lazy Singleton SettingsContainer.sentry_settings.
- [x] SENTRY-1.3 Разрешать SentrySettings в create_app и передавать его configure_sentry; сохранить SDK init kwargs/integrations.
- [x] SENTRY-1.4 Адаптировать tests/conftest.py и затронутые app fixtures к отдельному provider, изолируя .env.
- [x] SENTRY-1.5 Реализовать UT-SENTRY-01..UT-SENTRY-05 из design → Test matrix Sentry с mock SDK без сети.
- [x] SENTRY-1.6 Дополнить существующую Alembic subprocess-проверку UT-SENTRY-06: enabled/no DSN без OAuth ENV; migration runtime не менять.
- [x] SENTRY-1.7 При необходимости кратко обновить README об отдельных settings providers.
- [x] SENTRY-1.V Прогнать focused pytest/style/type checks затронутых файлов, отметить выполненные tasks и вернуть SENTRY-QA handoff; максимум восемь файлов edits.

**SENTRY-1 evidence (2026-10-14):** 8 service files changed; UT-SENTRY-01..06 covered without network/.env dependencies. `uv run --no-sync pytest -q` — 38 passed; focused Sentry/bootstrap pytest — 20 passed. Ruff check/format-check — clean (61 files formatted); mypy src/tests — clean (61 files); flake8 src/tests — clean; basedpyright — 0 errors/warnings; `git diff --check` — clean. SDK kwargs/integrations and OpenAPI baseline preserved. Migration runtime unchanged; offline Alembic succeeds with enabled Sentry without DSN and absent OAuth ENV. Root blocked gate preserved; live smoke belongs to SENTRY-QA.

## 11. SENTRY-QA — проверка Sentry follow-up (профиль: Quality Gate)

**Specs:** yandex-service-dependency-injection · **Пути:** read-only service diff; SENTRY-QA checklist/evidence · **Зависит от:** SENTRY-1.

- [x] SENTRY-QA.1 Проверить сохранение ENV/defaults/.env config, lazy independence, отсутствие legacy Sentry полей и неизменённый Alembic bootstrap.
- [x] SENTRY-QA.2 Прогнать UT-SENTRY-01..UT-SENTRY-06 и затронутые bootstrap regression tests; focused non-mutating styles/types; повторять проверки только при findings/изменениях.
- [x] SENTRY-QA.3 Проверить SM-SENTRY-01 через api-smoke-test на обнаруженном локальном runtime через stack-control после reload; зафиксировать результат или blocker, без OAuth exchange.
- [x] SENTRY-QA.V Выполнить openspec status и strict validate; передать scoped verdict/evidence Router. Исторический root QG-FORMAT BLOCKED сохраняется; весь QG pipeline, очистка worktree, commit, sync/archive не входят в продолжение.

## 12. RESOURCE-1 — Resource lifecycle DB engine (профиль: Backend)

**Specs:** yandex-service-dependency-injection · **Пути:** восемь runtime/test файлов из design → Resource follow-up; README только minor · **Зависит от:** SENTRY-QA (done). Прямое поручение пользователя; повторное approval не требуется. Исторические done tasks и root BLOCKED сохраняются.

- [x] RESOURCE-1.1 Добавить engine async context manager в utils/database.py: прежний make_async_engine, try/yield/finally await dispose и прежние SQL параметры.
- [x] RESOURCE-1.2 Перевести DatabaseContainer.engine на providers.Resource, session_factory на Factory с текущим engine для безопасного shutdown/reinit.
- [x] RESOURCE-1.3 Явно включить ApplicationContainer.request_scope.enable_async_mode(); сохранить существующий transaction helper/private graph без Resource/Closing для sessions.
- [x] RESOURCE-1.4 Перевести lifespan на try init_resources/yield finally shutdown_resources, включая cleanup при startup failure.
- [x] RESOURCE-1.5 Перевести оба auth endpoints на await request_scope.async_() перед async with без API/OpenAPI изменений.
- [x] RESOURCE-1.6 Адаптировать fake Resource/fixtures и покрыть UT-RESOURCE-01..06 из design → Test matrix Resource, сохранив concurrency/cancellation/commit regression checks.
- [x] RESOURCE-1.7 При необходимости кратко поправить README о Resource lifecycle и async resolution.
- [x] RESOURCE-1.V Прогнать focused/full service pytest, non-mutating styles/types и diff check; отметить только выполненные tasks, передать RESOURCE-QA точный interface/evidence.

## 13. RESOURCE-QA — проверка Resource follow-up (профиль: Quality Gate)

**Specs:** yandex-service-dependency-injection · **Пути:** read-only Resource service diff; собственный checklist/evidence · **Зависит от:** RESOURCE-1.

- [x] RESOURCE-QA.1 Проверить lifecycle/async contract и ownership: Resource engine, Factory sessionmaker без stale binding, explicit request-scope async mode, прежние private graphs/transactions, отдельный Alembic engine и неизменные Sentry/client/settings lifetimes.
- [x] RESOURCE-QA.2 Проверить UT-RESOURCE-01..06 и focused/full service checks; API/OpenAPI/access regression; повторять только при findings/новом diff.
- [x] RESOURCE-QA.3 Через stack-control обнаружить runtime и DB параметры через docker inspect без вывода секретов; выполнить SM-RESOURCE-01 через api-smoke-test после reload на реальной PostgreSQL без OAuth exchange; только необходимая штатная локальная подготовка, без миграций.
- [x] RESOURCE-QA.V Выполнить openspec status и strict validate; передать scoped verdict/evidence Router. Исторический root QG-FORMAT BLOCKED, sync/archive остаются открытыми; очистка worktree, commit и повтор общего QG pipeline не входят в продолжение.


## 14. DOC-1 — руководство по Dependency Injector (профиль: Planner / technical documentation)

**Пути:** `services/yandex-service/docs/dependency-injector.md`, ссылка в service README; только документация текущей реализации. Прямое поручение пользователя; новый runtime proposal не требуется. Исторические tasks и root BLOCKED сохраняются.

- [x] DOC-1.1 Создать русскоязычное руководство для новичка: constructor injection, провайдеры и все контейнеры, настройки/bootstrap, async Resource engine, приватный request graph и транзакции, тестовые подмены и расширение сборки.
- [x] DOC-1.2 Добавить ссылку на руководство в README сервиса.
- [x] DOC-1.V Сверить текст с текущим исходным кодом и официальной документацией, проверить относительные ссылки и синтаксис законченных Python-примеров без runtime mutations; передать handoff Router.


**DOC-1 evidence (2026-10-14): done.** Руководство сверено с текущими `src/containers`, HTTP/bootstrap, settings, DB helpers, Sentry, бизнес-классами и lifecycle tests; общие semantics сверены с официальной документацией Dependency Injector и SQLAlchemy. Non-mutating Python-проверка: 23 относительные ссылки на файлы существуют, 5 Python-блоков проходят `ast.parse`, README содержит валидную ссылку. `git diff --check -- README.md docs/dependency-injector.md` — exit 0. Runtime tests не запускались для documentation-only unit. Исторический root gate и чужие изменения сохранены.

## 15. DOC-QA — независимое ревью руководства (профиль: Quality Gate)

**Пути:** read-only service guide/README и относящиеся исходники; собственный checklist/evidence. **Зависит от:** DOC-1. Documentation-only unit; исторический root BLOCKED сохраняется.

- [x] DOC-QA.1 Проверить понятность для новичка и соответствие текущим провайдерам, async lifecycle, bootstrap, request graph, транзакциям, подменам и Alembic.
- [x] DOC-QA.V Независимо проверить относительные ссылки, Python-синтаксис и scoped diff whitespace; вернуть Router findings/evidence без runtime mutations и общего QG pipeline.

**DOC-QA evidence (2026-10-14): done; findings нет.** Текст и Mermaid-граф сверены с текущими контейнерами, bootstrap/settings, DB helpers, request scope, OAuth handlers, бизнес-сервисом/репозиторием/клиентом, Alembic и lifecycle regression tests. Различия provider/object, `.provided`/`.provider`, per-container Singleton, async Resource engine и Factory sessionmaker/scope, per-scope Object сессии и отсутствие Factory-кеша описаны корректно. Границы commit/rollback/close и сериализации ответа, отдельный Sentry SDK bootstrap и HTTP client на каждый вызов отражены явно. Независимая non-mutating проверка: 23 относительные ссылки существуют, 5 Python-блоков проходят `ast.parse`, ссылка README валидна; `git diff --check -- README.md docs/dependency-injector.md` — exit 0. Runtime/API/browser lanes и новые pytest неприменимы к documentation-only unit; предыдущие gates и author checkbox не изменены.
