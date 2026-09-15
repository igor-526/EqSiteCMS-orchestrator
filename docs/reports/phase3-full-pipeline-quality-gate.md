# Review: orchestrator/phase3-full-pipeline

**Статус: ✅ APPROVED**
**Дата:** 2026-09-14

## Итог

Diff проекта `orchestrator` (физически отдельный репозиторий от `eqSiteCMS`, отчёт размещён здесь по подтверждённому пользователем решению при approval этого change — см. `AGENTS.md` eqSiteCMS, `docs/reports` хранит evidence Quality Gate всей мультиагентной системы) реализует сквозной пайплайн Phase 3 в соответствии с `proposal.md`/`design.md`/4 delta specs. Все четыре независимых lane (`QG-BE`, `QG-FE`, `QG-CONTRACTS`, `QG-LIVE`) в финальном состоянии — `APPROVED`. Два lane потребовали rework-цикла (`QG-BE`, `QG-FE`), оба finding устранены точечными execution units и реверифицированы тем же lane на живом стеке. `QG-CONTRACTS` и `QG-LIVE` прошли с первой попытки без blocking findings.

## OpenSpec

- Change: `orchestrator/openspec/changes/phase3-full-pipeline/`
- Артефакты: `proposal.md`, `design.md` (Decisions 0–7, Схема данных, API-контракт, Access matrix, Execution units/DAG, Test matrix, PostgreSQL для smoke-тестов, Manual QA steps), `specs/{git-worktree-lifecycle,pipeline-stage-runs,run-live-stream,artifact-discovery}/spec.md`, `tasks.md`
- Approval: change подтверждён пользователем 2026-09-12, включая явное решение о размещении итогового `QG-SYNTH`-отчёта в `docs/reports/` репозитория `eqSiteCMS`.

## Краткое summary скоупа фазы

Phase 3 закрывает архитектурный блокер, зафиксированный в AO-005/AO-006 (контейнеры `api`/`worker` без Claude Code CLI, инлайн-спавн в `api` вместо потребления очереди `worker`'ом), и собирает из прототипа Phase 2 реальный сквозной пайплайн:

- **Worktree lifecycle** — детерминированный путь/ветка по `task_id`, создание при «Взятии в работу», переиспользование при повторном клике, отдельный смонтированный volume `/worktrees` (не подпуть `/target_repo`).
- **Стадии OpenSpec → Decision-гейт → Developing → Quality Gate** как `runs` на `ClaudeAdapter`, с реальным потреблением очереди `worker`'ом (`SELECT ... FOR UPDATE SKIP LOCKED`), гейтом принятия решения (`rework` через `--resume`/`proceed`) и авто-циклом QG «один run на стадию, retry при failed».
- **Живой чат через WebSocket** — worker публикует событие в Redis-канал `run:<run_id>` и пишет в `run_events`; `api` отдаёt `WS /runs/{id}/stream` (relay) поверх существующего `GET /runs/{id}/events` (история/reconnect).
- **Обнаружение артефактов** — после каждого `run` worker считает `git diff --name-status` worktree относительно базовой ветки, индексирует файлы по паттернам `openspec/changes/**`/`docs/reports/**` в таблицу `artifacts`; вкладка «Артефакты» отдаёт реальный список.

Новая Alembic-миграция `0003_create_artifacts_decisions.py` (таблицы `artifacts`/`decisions`) и `0004_add_runs_prompt.py` (`runs.prompt`). Вне скоупа фазы: продуктовая обработка исчерпания лимитов (Phase 4), стадии Completion/Release (Phase 5), адаптеры Codex/MiMo.

## Lanes

| Lane | Статус | Rework-цикл |
|---|---|---|
| `QG-BE` | пройден (APPROVED, попытка 2) | да — 2 findings (изоляция dev-БД, coverage gap `GET /tasks/{id}/artifacts`) → `BE-10`/`BE-12` |
| `QG-FE` | пройден (APPROVED, попытка 2) | да — 1 blocking finding (`WS.close(1008)` до `accept()`) → `BE-11` |
| `QG-CONTRACTS` | пройден (APPROVED, попытка 1) | нет — 1 non-blocking находка (ownership-документация `worker_loop.py`, исправлена в `tasks.md`) |
| `QG-LIVE` | пройден (APPROVED, попытка 1) | нет — операционная находка (`docker compose build` перед пересозданием), зафиксирована, не блокирует |

### `QG-BE` — детали

**Попытка 1 — REWORK.** Backend-дифф сверен с `design.md`/4 delta specs (Clean Architecture, репозитории, миграции, все 7 решений) и Test matrix — все `UT-*` ID трассируются на реальные тесты. `pytest` в `orchestrator/api`: 72 passed, 0 failed. Найдено 2 findings:

1. **[BLOCKING]** `api/tests/conftest.py` (`db_engine`) выполнял `Base.metadata.drop_all`/`create_all` прямо на `DATABASE_URL` из окружения контейнера `api` — той же живой Postgres, на которой крутится dev/demo-стек `orchestrator`. Отдельного `TEST_DATABASE_URL` не существовало ни в `.env.example`, ни в `docker-compose.yml`. Каждый обязательный verification-прогон `pytest` уничтожал ручные QA-данные dev-окружения.
2. **[Coverage gap]** `GET /tasks/{id}/artifacts` не имел ни одного HTTP-уровневого теста (ни `404`, ни `200`-happy-path через реальный route) при том, что оба сценария зафиксированы в access matrix `design.md`; существующий `test_artifacts_service.py` покрывал только `discover_artifacts()`/`ArtifactRepository`.

Findings делегированы владельцу как `BE-10` (изоляция `TEST_DATABASE_URL` + 2 HTTP-теста) и `BE-12` (dev-зависимости `pytest`/`httpx`/`pytest-asyncio` через `pip install -e ".[dev]"`, не переживавшие пересборку образа `api`).

**Попытка 2 — APPROVED.** Оба findings подтверждены устранёнными:

- Finding 1: `TEST_DATABASE_URL` читается независимо от `DATABASE_URL`, с fallback на `orchestrator_test` и жёстким guard'ом — модуль бросает `RuntimeError` при импорте, если `TEST_DATABASE_URL == DEV_DATABASE_URL`. `_ensure_test_database_exists()` создаёт БД через отдельное AUTOCOMMIT-подключение к `postgres` с regex-guard на имя БД против SQL-инъекции. Эмпирически подтверждено: `count(*) from tasks` в dev-БД `orchestrator` — 5 до и 5 после прогона `pytest` (без DROP/пересоздания), `\l` подтверждает существование отдельной `orchestrator_test`.
- Finding 2: добавлены `test_list_task_artifacts_returns_discovered_artifacts` (200) и `test_list_task_artifacts_404_for_unknown_task` (404) в `test_tasks_api.py`.
- `pytest` → **74 passed, 0 failed**, dev-зависимости уже в образе (`BE-12`) — one-off install больше не требуется.

Non-blocking (техдолг, не требуют execution unit): WS-сессия `runs.py` держит `AsyncSession` открытой на всё время жизни соединения, не закрывается сама при завершении run; `POST /stages/{id}/decisions` не проверяет `stage.stage_type == StageType.openspec` защитно (сейчас безопасно, т.к. никакой другой `stage_type` не переводится в `waiting_decision`).

### `QG-FE` — детали

**Попытка 1 — REWORK.** `FE-1`/`FE-2`/`FE-3` сверены с `design.md` и QA-1/QA-2 отчётами, регрессий Phase 1/2 UI нет, `npm run build` — успешно (0 ошибок). Найден 1 **blocking** finding:

`api/src/api/runs.py::stream_run()` вызывал `websocket.close(code=WS_1008_POLICY_VIOLATION)` **до** `websocket.accept()` на неизвестном `run_id`. По WS-протоколу код закрытия не долетает до клиента без состоявшегося handshake — реальный WS-клиент (проверено живым Node.js-клиентом) видел `CloseEvent{code:1006, wasClean:false}`, а не `1008`. Из-за этого `frontend/src/app/runs/[id]/page.tsx`'s проверка `ev.code === WS_POLICY_VIOLATION_CODE` никогда не срабатывала на настоящем клиенте — страница уходила в бесконечный reconnect с экспоненциальным backoff вместо терминального сообщения «Run не найден…». Существующий юнит-тест использовал duck-typed fake WebSocket в обход реального ASGI-handshake, поэтому не поймал баг; находка не была поймана `QA-1`/`QA-2`, т.к. ни один Manual QA шаг не тестировал подключение к несуществующему `run_id`.

Finding делегирован владельцу как `BE-11`.

**Попытка 2 — APPROVED.** Фикс подтверждён: порядок в `stream_run()` теперь — `accept()` → проверка `run` → `close(1008)` при `run is None`. Живой WS-клиент (Node v24) к несуществующему `run_id`: `CLOSE code=1008 reason="" wasClean=true` (было `1006`/`wasClean=false`). Юнит-тест переписан на реальный WS-handshake (`websockets` поверх subprocess `uvicorn`, не duck-typed мок) — прогнан вживую, 74 passed. Фронтенд подтверждён в реальном браузере (`claude-in-chrome`): статус страницы переходит в терминальное «закрыто» и остаётся таким ≥11с (перекрывает весь диапазон backoff), реконнект не запускается. `npm run build` — успешно, 0 ошибок, все 5 маршрутов.

Новая non-blocking находка (обнаружена при этой же живой проверке, не блокирует): на `/runs/{неизвестный-id}` пользователь реально видит текст ошибки из `syncHistory` (`"...404 Not Found..."`), а не задуманный текст из `ws.onclose` — гонка двух параллельных запросов (`REST GET .../events` и WS handshake+close), исход недетерминирован. Терминальный статус «закрыто» (без reconnect) при этом выставляется корректно независимо от исхода гонки — сам блокирующий баг попытки 1 не воспроизводится.

Non-blocking (техдолг): страница `runs/[id]` не имеет отдельного состояния «run завершён, событий больше не будет» — любое иное закрытие уходит в `scheduleReconnect()`; вкладка «Артефакты» рендерит таблицу путей без `overflow-x`/`word-break` для `<code>{artifact.path}</code>` — не проверено на 400px в рамках `QA-2.2`.

### `QG-CONTRACTS` — детали

**APPROVED с первой попытки.** Access matrix `design.md` сверена с фактическими эндпоинтами (`POST /tasks/{id}/take-into-work`, `GET /stages/{id}/runs`, `POST /stages/{id}/decisions`, `GET /tasks/{id}/artifacts`, `WS /runs/{id}/stream`, изменённый `POST /runs`); реализация сверена со всеми 4 delta specs. Одна non-blocking находка: документационная неточность по ownership `worker_loop.py` — файл расширялся несколькими execution units (`BE-4`, `BE-6`, `BE-8`), уточнение внесено Router'ом непосредственно в `tasks.md` без отдельного execution unit, т.к. объём — правка одной строки таблицы ownership.

### `QG-LIVE` — детали

**APPROVED с первой попытки.** Независимый повторный прогон `SM-PIPE-01..08` через `.claude/skills/api-smoke-test` на реальной PostgreSQL/Redis, изолированном тестовом git-репозитории (не `eqSiteCMS`), пересобранных `api`/`worker` образах — **8/8 PASS**:

| # | Сценарий | Результат |
|---|---|---|
| `SM-PIPE-01` | `POST /tasks` → `take-into-work` на реальном тестовом репозитории | PASS — worktree на диске, `run(stage=openspec, status=queued)` |
| `SM-PIPE-02` | Завершение `run` (реальный спавн стаб-CLI) | PASS — `run.status=succeeded`, `stage(openspec).status=waiting_decision` |
| `SM-PIPE-03` | `POST /stages/{id}/decisions {action: proceed}` | PASS — `stage(openspec).status=done`, новый `run(stage=developing)` |
| `SM-PIPE-04` | Повторный `take-into-work` на той же задаче | PASS — тот же `worktree_path`, второй worktree не создан |
| `SM-PIPE-05` | `GET /stages/{id}/runs` после нескольких `run`'ов | PASS — все `run`'ы в порядке `started_at` |
| `SM-PIPE-06` | `GET /tasks/{id}/artifacts` после файла в worktree | PASS — запись `kind=openspec` |
| `SM-PIPE-07` | `WS /runs/{id}/stream` во время выполнения `run` | PASS — события по WS без обращения к `GET .../events` |
| `SM-PIPE-08` | `POST /stages/{id}/decisions {action: rework, comment_text: ""}` | PASS — `400` |

Найден и устранён операционный process-finding (не blocking, зафиксирован ниже в Lessons learned): живой стек изначально обслуживал устаревшие `api`/`worker` образы (собраны до `BE-9`) — `docker compose up --force-recreate` не подтягивает новый код при `COPY . .` в Dockerfile без `docker compose build`. После `docker compose build api worker` + recreate поведение совпало с кодом. Регрессий `BE-8`/`BE-9` не найдено: `git worktree add` не падает `dubious ownership`, спавн с испорченным `CLAUDE_ADAPTER_CLI_COMMAND` корректно даёт `run.status=failed`.

## Execution units — полный список и итоговый статус

### Backend (13 запланированных + 6 гэп-фиксов Router'а)

| Unit | Название | Статус | Примечание |
|---|---|---|---|
| `BE-1` | Инфраструктура: CLI в worker, worktree volume | done | план Planner'а |
| `BE-2` | Схема: `artifacts`/`decisions` | done | план Planner'а |
| `BE-3` | Worktree-сервис, StageRepository, «Взять в работу» | done | план Planner'а |
| `BE-4` | Worker: потребление очереди, Redis pub/sub, WS relay | done | план Planner'а |
| `BE-5` | Гейт принятия решения | done | план Planner'а |
| `BE-6` | QG-стадия и обнаружение артефактов | done | план Planner'а |
| `BE-7` | Backend-тесты: свод и регрессия | done | план Planner'а |
| `SMOKE-1` | Live verification на реальной PostgreSQL | done | план Planner'а |
| `BE-8` | Гэп-фиксы по итогам `SMOKE-1` (`safe.directory`, спавн-ошибки → `failed`) | done | **добавлен Router'ом** сверх плана — реальная находка `SMOKE-1` |
| `BE-9` | Фикс: стадия `forming` никогда не закрывается | done | **добавлен Router'ом** сверх плана — реальная находка `QA-1` |
| `BE-10` | Гэп-фиксы по итогам `QG-BE` (изоляция `TEST_DATABASE_URL`, coverage `GET /tasks/{id}/artifacts`) | done | **добавлен Router'ом** сверх плана — находка `QG-BE` |
| `BE-11` | Фикс: `WS.close(1008)` до `accept()` не долетает до клиента | done | **добавлен Router'ом** сверх плана — находка `QG-FE` |
| `BE-12` | Фикс: dev-зависимости не переживают пересборку образа `api` | done | **добавлен Router'ом** сверх плана — повторяющаяся операционная проблема |

### Frontend (3 запланированных)

| Unit | Название | Статус |
|---|---|---|
| `FE-1` | «Взять в работу» и гейт принятия решения | done |
| `FE-2` | Живой чат через WebSocket | done |
| `FE-3` | Вкладка «Артефакты» | done |

### Manual QA (1 запланированный + 1 повтор Router'а)

| Unit | Название | Статус | Примечание |
|---|---|---|---|
| `QA-1` | Manual QA (шаги 1-9) | partial → done | шаги 1/2/3/8/9 passed; 4-7 blocked дефектом `forming` (найден этим unit'ом, устранён `BE-9`) |
| `QA-2` | Manual QA: повтор шагов 4-8 после `BE-9` | done | **повторный прогон добавлен Router'ом** сверх плана после root-cause находки (`docker compose cp` без `restart`, см. Lessons learned) |

### Quality Gate (5 lanes)

| Unit | Название | Статус |
|---|---|---|
| `QG-BE` | Quality Gate: backend lane | APPROVED (попытка 2, после `BE-10`/`BE-12`) |
| `QG-FE` | Quality Gate: frontend lane | APPROVED (попытка 2, после `BE-11`) |
| `QG-CONTRACTS` | Quality Gate: контракты и ownership | APPROVED (попытка 1) |
| `QG-LIVE` | Quality Gate: live verification | APPROVED (попытка 1) |
| `QG-SYNTH` | Quality Gate: единый вердикт (этот отчёт) | APPROVED |

**Итого 6 execution units (`BE-8`, `BE-9`, `BE-10`, `BE-11`, `BE-12`, повторная `QA-2`) добавлены Router'ом по ходу фазы сверх исходного плана Planner'а**, по реальным находкам `SMOKE-1`/`QA-1`/`QG-BE`/`QG-FE`. Это нормальная часть процесса rework-циклов и live-верификации, а не провал планирования: исходный план Planner'а не мог предвидеть дефекты, воспроизводимые только на реальном docker-стеке (dubious ownership на чужом uid, зависший `forming`, WS-handshake семантику, изоляцию тестовой БД) — все они найдены соответствующим verification-lane'ом (`SMOKE-1`/`QA-1`/`QG-BE`/`QG-FE`) именно потому, что была предусмотрена live-проверка, а не только unit-тесты.

## Lessons learned / процессные риски

1. **`docker compose cp` без `restart` маскирует применённые фиксы.** Во время `QA-2` (попытка 1) Router лично обнаружил и устранил инцидент: фикс `BE-9` (закрытие стадии `forming`) был синхронизирован в контейнер через `docker compose cp` без перезапуска `uvicorn`, из-за чего живой HTTP-сервер временно обслуживал запросы старым кодом в памяти (Python не переимпортирует уже загруженный модуль при изменении файла на диске без `--reload`/restart) — это привело к ложному "blocked"-статусу первой попытки `QA-2`: прямой вызов `take_into_work()` в свежем python-процессе внутри того же контейнера работал корректно, а настоящий HTTP-запрос — нет, до `docker compose restart api worker`. Отдельно `QG-LIVE` столкнулся с зеркальным вариантом того же класса проблемы: `docker compose up --force-recreate` не подтягивает новый код при `COPY . .` в Dockerfile без предварительного `docker compose build`. **Правило на будущее:** после синхронизации кода в контейнер любым способом (`cp`, bind-mount правка) — всегда `docker compose restart <service>`; после изменения зависимостей/Dockerfile — всегда `docker compose build <service>` перед `up`/`restart`/`recreate`. Ни один из этих шагов не заменяет другой.
2. **Dev-зависимости должны быть в образе с самого начала, не one-off.** `BE-5`/`BE-6`/`QG-BE`/`BE-10` — каждый independently ставил `pytest`/`httpx`/`pytest-asyncio` one-off поверх уже запущенного контейнера `api`, и это состояние терялось при любой пересборке образа. Устранено `BE-12` (`pip install -e ".[dev]"` в `Dockerfile`), но потребовало 4 повторных столкновения прежде, чем стало отдельным execution unit'ом. Правило на будущее: dev/test-зависимости, нужные CI/QG внутри контейнера, фиксируются в образе на этапе `BE-1`/инфраструктурного unit'а, а не добавляются реактивно.
3. **`TARGET_REPO_PATH`/тестовый репозиторий для live/smoke unit'ов должен быть явно одноразовым, не продовым чекаутом.** Это было прямо прописано в задании фазы, но потребовало напоминания несколько раз. Проявившийся риск: `SMOKE-1`/`QA-2` живого тестирования были на короткое время выполнены с `TARGET_REPO_PATH=/home/igor/projects/eqSiteCMS` (продовый чекаут) вместо одноразового тестового репозитория — побочным эффектом стало появление 9 stale worktree/веток `agent/*` в реальном репозитории `eqSiteCMS`. Router нашёл и удалил все 9 после обнаружения. Инцидент не привёл к потере/повреждению кода только благодаря тому, что агентам была дана явная инструкция использовать отдельный тестовый репозиторий и они (в итоге) её выполнили — но сама конфигурация `TARGET_REPO_PATH` в моменте указывала не туда. **Правило на будущее:** для любого live/smoke/QA unit'а Router обязан явно (не подразумевая) указать и проверить, что `TARGET_REPO_PATH` — одноразовый тестовый репозиторий, созданный специально для этого прогона, до делегирования unit'а, а не полагаться на то, что исполнитель сам выберет правильный путь по общей инструкции задания.

## Открытые вопросы / техдолг (non-blocking)

Не блокируют текущий вердикт, зафиксированы как известные ограничения для следующей фазы:

- `WS /runs/{id}/stream` держит DI-сессию `AsyncSession` открытой на всё время жизни соединения и не закрывается сама при завершении `run` (только при разрыве клиента) — расходится с буквальной формулировкой spec «до закрытия соединения ИЛИ завершения run».
- `POST /stages/{id}/decisions` не проверяет `stage.stage_type == StageType.openspec` защитно перед применением openspec-специфичной proceed/rework логики (сейчас безопасно, т.к. ни один другой `stage_type` не переводится в `waiting_decision`).
- Retry-цикл QG (`UT-QG-03`) не верифицирован live — только unit-тестом, т.к. детерминированный success committed-стаб-CLI (`worker/fixtures/fake_claude_cli.py`) не имеет штатного способа спровоцировать `failed` без правки самого стаба; обход не найден в рамках `QA-2.1`.
- Гонка сообщений об ошибке на `/runs/{unknown-id}` между `ws.onclose` и `syncHistory` — недетерминированный порядок `setError(...)`, пользователь видит либо специфичное сообщение из WS-ветки, либо generic `404` из REST-истории; терминальный статус «закрыто» (без reconnect) при этом выставляется корректно независимо от исхода.
- Таблица артефактов (`tasks/[id]/page.tsx`) рендерит `<code>{artifact.path}</code>` без `overflow-x`/`word-break` — длинный путь на ~400px viewport потенциально даёт horizontal overflow; не проверено визуально в рамках `QA-2.2` (который покрыл decision-гейт и карточки `runs`, но не вкладку «Артефакты» с реальными длинными путями).
- `StageType.decision`/`completion`/`release` создаются (видны в `STAGE_ORDER`), но не активируются в этой фазе — `currentStage`-логика выбора первой `active`/`waiting_decision` стадии устойчива сейчас, но потребует ревизии при будущей фазе, вводящей отдельный `run` для стадии `decision`.

## Изменённые файлы (по deliverable)

Backend (`orchestrator/api/**`, `orchestrator/worker/**`, `orchestrator/docker-compose.yml`, `orchestrator/.env.example`, `orchestrator/Makefile`):

- `worker/Dockerfile`, `worker/src/main.py`, `worker/fixtures/fake_claude_cli.py`
- `api/Dockerfile`, `api/src/core/{config.py,models.py,worktree.py,errors.py,claude_adapter.py,worker_loop.py,redis_client.py,artifacts_service.py}`
- `api/src/repositories/{stages.py,runs.py,decisions.py,artifacts.py}`
- `api/src/api/{tasks.py,runs.py,stages.py,main.py}`
- `api/alembic/versions/{0003_create_artifacts_decisions.py,0004_add_runs_prompt.py}`
- `api/tests/**` (включая `conftest.py`, `test_tasks_api.py`, `test_runs_ws.py`)
- `docker-compose.yml`, `.env.example`, `Makefile`

Frontend (`orchestrator/frontend/src/**`):

- `frontend/src/app/tasks/[id]/page.tsx`
- `frontend/src/app/runs/[id]/page.tsx`
- `frontend/src/lib/api.ts`

Рекомендуемая ветка: основная рабочая ветка `orchestrator` (отдельный репозиторий от `eqSiteCMS` согласно `services.manifest`).

## Вердикт

Все blocking findings обоих rework-циклов (`QG-BE`, `QG-FE`) устранены и реверифицированы на живом стеке; `QG-CONTRACTS` и `QG-LIVE` прошли без blocking findings; access policy (no-auth проект) не нарушена; покрытие test matrix полное (все `UT-*`/`SM-PIPE-*` ID трассируются на реальные тесты/smoke-сценарии, включая регрессионные тесты для обоих исправленных дефектов); процессные риски фазы задокументированы как lessons learned, не как блокеры. **APPROVED.**

Задачи `QG-SYNTH.1`, `QG-SYNTH.V` отмечены в `orchestrator/openspec/changes/phase3-full-pipeline/tasks.md`.
