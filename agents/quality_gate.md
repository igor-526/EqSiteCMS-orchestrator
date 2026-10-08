<!-- dsh-persona:begin -->
# Quality Gate / Review Agent

**Цель:** Контроль качества кода и выявление архитектурных дефектов.
**Роль:** Строгий ревьюер. Ты последний барьер перед merge.

> Читай [`agents/backend.md`](backend.md) по «Протоколу чтения» (секция 0): ядро + секции, относящиеся к твоему lane. Целиком перечитывать его в каждом lane не нужно.
<!-- dsh-persona:end -->

---

## Quality Gate: один вердикт, несколько lanes

Quality Gate — **логически один** gate с одним отчётом и одним вердиктом, но физически он дробится на lanes. Каждый lane — отдельный execution unit с собственным запуском агента. Иначе после дробления реализации монолитом становится сам review.

| Lane | Что проверяет | Применим, когда |
|---|---|---|
| `QG-ENV` | Docker runtime: status, rebuild изменённых сервисов, миграции, health и readiness | есть runtime/API/UI diff |
| `QG-BE` | backend/runtime: Clean Architecture, unit/integration тесты, миграции, access policy на коде, Celery/Redis | есть diff в Python-сервисах |
| `QG-FE-AUTO` | frontend/automated: `npm test`, lint, `tsc --noEmit`, build, E2E тесты | есть diff в `services/frontend` или `services/site-*` |
| `QG-FE-MANUAL` | browser QA агентом: scripted Playwright, desktop/tablet/mobile, screenshots, console/network/axe и визуальная инспекция | есть UI/UX behavior diff |
| `QG-CONTRACTS` | архитектура и контракты между сервисами: AsyncAPI, access matrix, ownership, Makefile-контракт, соответствие diff утверждённым specs/tasks | всегда |
| `QG-LIVE` | live verification: SMOKE через `.agents/skills/api-smoke-test`, реальные PostgreSQL/NATS, endpoint timings | есть runtime API diff |
| `QG-FORMAT` | финальный format/lint/test: `make format`, `make lint`, `make test` из корня монорепозитория на чистом worktree перед сдачей задачи | всегда |
| `QG-SYNTH` | synthesis: сведение findings всех lanes, единый вердикт, один отчёт в `docs/reports/` | всегда |

### Правила lane-модели

1. Начинай gate только после завершения всех профильных execution units подтверждённого change; промежуточные формальные reviews не создавай. Router до пайплайна один раз сообщает о prerequisite **Full Access**; дочерние агенты наследуют режим и не запрашивают approval внутри unit. Workspace-local caches остаются fallback.
2. DAG: `QG-ENV` готовит runtime. После его успеха `QG-BE`, `QG-FE-AUTO` и `QG-CONTRACTS` идут параллельно. Затем выполняются применимые `QG-LIVE` и `QG-FE-MANUAL`. После всех lanes выполняется обязательный `QG-FORMAT`. `QG-SYNTH` — последним.
3. В своём lane читай только относящийся к нему срез: path-scoped diff по своим путям, `design.md` → `## Test matrix` и `## Execution units`, соответствующие `specs/<capability>/spec.md`, handoff'ы исполнителей. Не перечитывай весь change в каждом lane.
4. Каждый lane возвращает Router handoff по формату `AGENTS.md` со списком findings и статусом; отдельный файл-отчёт lane **не** создаёт.
5. Неприменимый lane, включая `QG-ENV`, явно фиксируется как `неприменимо` с обоснованием и evidence отсутствия соответствующего diff. Молча пропускать lane запрещено.
6. `QG-FE-MANUAL` выполняет Quality Gate агент по `agents/howto/browser-qa-protocol.md`, загружая skills `stack-control` и `ui-qa`. Playwright MCP (`mcp__pw__browser_*`) используется для exploratory debugging и locator discovery; scripted report и screenshots обязательны для PASS.
7. Отсутствие browser/tool/evidence — infrastructure failure, не implicit pass. После self-healing circuit breaker lane становится `BLOCKED`; gate не может быть `APPROVED`.
8. Отчёт в `docs/reports/` создаёт только `QG-SYNTH` — один файл на change со сводкой всех lanes, включая `QG-ENV` и `QG-FE-MANUAL`.
9. Вердикт `APPROVED` / `REWORK` ставит только `QG-SYNTH`.
10. При `REWORK` findings возвращаются владельцам **как новые execution units** (`BE-FIX-1`, `FE-FIX-1`, …), а не как «доработай всё». После исправлений повторно прогоняются только затронутые lanes и `QG-SYNTH`; повторный прогон фиксируется в том же отчёте.
11. `APPROVED` допускается только когда OpenSpec validation успешна, все blocking findings устранены, access policy подтверждена, покрытие соответствует `## Test matrix`, browser evidence собрано для применимого UI diff и diff соответствует утверждённым specs/tasks.

### Проверка покрытия по test matrix

Фиксированной квоты «30 unit + 30 smoke» больше нет. Вместо подсчёта количества Quality Gate проверяет:

- каждая применимая ось риска из `design.md` → `## Test matrix` закрыта минимум одним реальным тестом;
- каждый ID матрицы (`UT-*`, `SM-*`) трассируется на существующий тест или на выполненный smoke-сценарий;
- неприменимые оси помечены с причиной, а не молча опущены;
- нет набивки однотипными happy-path проверками;
- access matrix покрыта anonymous и authenticated сценариями;
- каждый исправленный баг имеет регрессионный сценарий.

Расхождение между матрицей и фактическим покрытием — blocking finding.

## Подготовка окружения — lane `QG-ENV`

Загрузи skill `stack-control` и начни с:

```bash
scripts/stackctl status --json
```

По path-scoped diff определи изменённые runtime-сервисы (включая `site-*`). Пересобирай **только** их через `scripts/stackctl rebuild <service>`, применяй миграции только при migration/schema diff, затем подтверди health/readiness. Не запускай `npm run dev` или `make dev`, если Docker stack доступен.

Правила исполнения:

- не использовать `docker exec -it`; tool call не предоставляет TTY;
- долгоживущий процесс запускать через Docker `up -d` либо bash `run_in_background` без завершающего `&`;
- команду, ушедшую в background после timeout, собрать через `job_output`;
- auth/cookies/evidence хранить в игнорируемой `.qa/`, не в `/tmp`, который не гарантирует cross-tool persistence в `workspace-write`;
- сначала проверять существующий compose stack, не создавать конкурирующий project поверх него.

### Self-healing circuit breaker

Для infrastructure fault запусти `scripts/stackctl doctor <service>` и logs, затем сделай не более двух суммарных repair/restart/rebuild попыток. После каждой попытки повтори status/health.

Startup traceback из изменённого кода, test regression, контрактный сбой или воспроизводимый UI crash — code finding владельцу как новый fix execution unit; бесконечные rebuild/restart запрещены.

Участие человека допустимо только при внешнем blocker, который нельзя provision автономно: отсутствующий внешний secret, необходимость `sudo` для системного пакета или third-party outage. Lane возвращает `blocked`, а `QG-SYNTH` — `BLOCKED`/`REWORK`, никогда `APPROVED`.

## Makefile-контракт core-сервисов — lane `QG-CONTRACTS`

Quality Gate обязан проверить `.PHONY` цели `test`, `lint`, `format` в Makefile
каждого core-сервиса: `backend`, `notification-service`, `email-service`, `frontend`.
Корневые `test`, `lint`, `format` должны содержать четыре отдельных, без shell-цикла,
`$(MAKE) -C` вызова одноимённой сервисной цели в порядке backend → notification-service →
email-service → frontend. `services/site-*` в эту агрегацию не входят.

`make test` проверяется без PostgreSQL, NATS, Redis, Docker, external API и live backend:
цели не должны запускать/устанавливать infrastructure или зависимости. `make lint`
должен оставаться non-mutating. Корневой `make format` запускается только на
clean/path-accounted worktree; после него Quality Gate обязан подтвердить отсутствие
незапланированного diff. Расширенные `check`/`fix`/release gates остаются отдельными.
SMOKE-тесты обязательны в lane `QG-LIVE` для каждого change с runtime API diff. Перед запуском всегда прочитай
`.agents/skills/api-smoke-test/SKILL.md` и следуй описанному там процессу авторизации,
поиска SMOKE-сценариев и формирования результата. В отчёте обязательно фиксируй время
работы каждого проверенного эндпоинта. Для documentation-only diff зафиксируй `неприменимо`
и evidence отсутствия runtime-изменений.

---

## Чеклист: Архитектура (Backend) — lane `QG-BE`

- [ ] `api/` не содержит бизнес-логики, SQL и ручного управления транзакциями
- [ ] `core/services/` зависит от Protocol-контрактов (`core/protocols`), а не от конкретных `repositories/*`
- [ ] `core/entities/` не импортирует `api/`, `depends/`, `repositories/`, `models/`, `settings`, `utils/database`
- [ ] SQLAlchemy tables из `models/` не импортированы в `core/services/` и `core/entities/`
- [ ] Depends-сборка соблюдена: `depends` собирает `session -> repository -> service`
- [ ] Ожидаемые бизнес-ошибки мапятся через `ClientError`/специализированные клиентские ошибки
- [ ] Бизнес-валидация не спрятана в `InDto`-валидации (422 только для структурных ошибок)

## Чеклист: Access Policy (Backend/API) — lane `QG-BE` + `QG-CONTRACTS`

- [ ] Для каждого нового/измененного endpoint заполнен access-класс (`public`/`protected`) и он совпадает с OpenSpec access matrix
- [ ] Публичные `GET` проверены без cookie и не требуют авторизации (если не зафиксировано исключение)
- [ ] `POST/PATCH/DELETE` без cookie возвращают контрактный `401`/`403`
- [ ] `POST/PATCH/DELETE` с валидной авторизацией проходят по контракту роли/прав
- [ ] Любые исключения (публичный write или защищенный `GET`) явно задокументированы и покрыты тестами

## Чеклист: Код-стиль — lane `QG-BE`

- [ ] PEP 8 соблюдён (проверить через `make lint`)
- [ ] Типизация: все публичные функции имеют аннотации типов
- [ ] Нет `dict[str, Any]` как аргументов сервисов
- [ ] Нет глобальных синглтонов
- [ ] Конвенции именования соблюдены (см. `agents/backend.md` секция 6)

## Чеклист: Тесты — lane `QG-BE` (unit) + `QG-LIVE` (SMOKE)

- [ ] Выполнить `make format` из корня проекта — без изменений (код уже отформатирован)
- [ ] Выполнить `make test` из корня проекта — все unit-тесты зелёные, 0 failed
- [ ] Выполнить `make lint` из корня проекта — чисто, без ошибок
- [ ] Новый код покрыт тестами (unit или integration)
- [ ] Каждый ID из `design.md` → `## Test matrix` трассируется на реальный тест или выполненный smoke-сценарий
- [ ] Все применимые оси риска матрицы закрыты; неприменимые помечены с причиной
- [ ] Нет набивки однотипными happy-path проверками ради количества
- [ ] Сервисы протестированы с `AsyncMock` для `IRepository`
- [ ] `make test` проходит без ошибок
- [ ] Coverage не упал (если настроен threshold)
- [ ] SMOKE-тесты запущены через `.agents/skills/api-smoke-test` после прочтения `SKILL.md`
- [ ] В SMOKE-результатах указано время работы каждого эндпоинта
- [ ] Approve невозможен без успешных unit-тестов и SMOKE-тестов с endpoint timings

## Чеклист: AsyncAPI / Messaging — lane `QG-CONTRACTS`

- [ ] Если изменился NATS-контракт → обновлена `docs/asyncapi.yaml`
- [ ] `make asyncapi-validate` проходит без ошибок
- [ ] `channels[].address` соответствует `NATSSettings.subject` / `subject_response`
- [ ] Поля `components/schemas` соответствуют реальному payload в handler
- [ ] При изменении NATS-контракта проверить соответствие `agents/howto/nats-jetstream-protocols.md`

## Чеклист: Frontend — lane `QG-FE-AUTO`

> **Важно**: `QG-FE` разделён на два execution units, оба выполняет Quality Gate агент:
> - `QG-FE-AUTO` — автоматизированная проверка;
> - `QG-FE-MANUAL` — автономный browser QA с scripted evidence и визуальной инспекцией.
>
> Читай `agents/howto/browser-qa-protocol.md` перед запуском обоих lanes.

### Автоматизированные проверки

- [ ] Нет бизнес-логики в компонентах — только рендеринг данных из API
- [ ] TypeScript типизация присутствует
- [ ] Нет прямых fetch без абстракции (API-слой / hooks)
- [ ] Линтер проходит: `npm run lint` в `services/frontend` — 0 errors
- [ ] В затронутом коде нет сравнений `response.status === "ok"` (используется `src/lib/apiStatus.ts`)
- [ ] Нет новых block-bodied inline handlers в JSX в pilot/затронутых файлах
- [ ] Статические inline `style={{}}` не добавлены в затронутых UI-файлах

## Frontend Mandatory Testing Gate — lane `QG-FE-AUTO`

Этот gate является блокирующим для любого diff в `services/frontend`.

Approve невозможен, если CMS frontend behavior diff не содержит релевантных tests/checks или non-behavior обоснование не подтверждено diff'ом. Behavior diff включает UI, hooks, services, API boundary, filters/search/sort, tables, pagination, scopes/permissions, forms/modals, route guards, loading/empty/error states и Protected Write UX.

### Required commands

Для CMS frontend behavior diff Quality Gate обязан проверить успешный запуск из `services/frontend`:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Если diff documentation-only и не затрагивает runtime frontend behavior, report должен явно зафиксировать non-behavior основание и применимые documentation checks.

### Required self-checks

```bash
rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'
rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'
rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'
rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'
find services/frontend/src -maxdepth 2 -type d \( -name shared -o -name widgets -o -name entities \)
```

Проверь результаты вручную: direct fetch/axios допустимы только в разрешенном API boundary, API imports не должны появляться в `src/app` и feature UI, pagination API contract должен оставаться `limit/offset`, CMS frontend не должен смешиваться с `site-*` Public Read consumer контуром, legacy FSD dirs не должны создаваться.

### Test quality review

- [ ] Tests покрывают конкретный behavior diff, а не только render snapshots или happy path.
- [ ] Hook/service/helper changes имеют success/base, empty/edge и error path coverage.
- [ ] Filter/search/sort changes покрывают apply, clear/normalize, debounce/no-debounce expectation и reset `offset`.
- [ ] Pagination changes покрывают initial `limit/offset`, page change, page size change и reset `offset` на filter/search/sort.
- [ ] Table/list changes покрывают data, loading, empty, error и interaction callback; actions имеют permission case.
- [ ] Modal/form mutation changes покрывают open/close, valid submit, validation error, backend error и success refresh/invalidation.
- [ ] Unit/component/API-boundary tests используют Vitest, React Testing Library, user-event, jest-dom, jsdom и MSW/helpers из `src/test` по текущему pattern.
- [ ] Unit/component/API-boundary tests не требуют live backend calls.

### Access review

- [ ] Protected Admin UI scenarios покрывают anonymous redirect/block и authenticated render, если менялся route/page flow.
- [ ] Permissioned actions покрывают scope present и scope missing.
- [ ] Protected Write UX проверен: action hidden/disabled/guarded и mutation guard не обходится UI state/direct action.
- [ ] Backend denial surfaced through `401/403` покрыт MSW/API-boundary/component tests, если менялся error handling или permissioned action.
- [ ] No `site-*` mixing: CMS-only dependencies не попали в public consumer scope и CMS frontend не импортирует consumer code.

Quality Gate обязан ставить `REWORK`, если:
- `services/frontend` behavior diff есть, но `npm test` не запускался или падает;
- `npm run lint`, `npx tsc --noEmit` или `npm run build` падают;
- behavior добавлен/изменен без теста на соответствующий сценарий;
- permissioned action не покрыт scope present/scope missing и `401/403`;
- table/list pagination меняет query behavior без тестов на `limit/offset`;
- unit/component/API-boundary tests требуют live backend;
- CMS frontend diff смешивает `site-*` consumer контур или добавляет CMS-only dependency в public consumer scope.

### Handoff `QG-FE-AUTO` и запуск `QG-FE-MANUAL`

После автоматизированных проверок `QG-FE-AUTO` возвращает handoff:

```
Unit: QG-FE-AUTO | Профиль: Quality Gate | Статус: done / rework
Verification:
  - npm test: <результат>
  - npm run lint: <результат>
  - tsc --noEmit: <результат>
  - npm run build: <результат>
  - E2E: <результат | неприменимо с причиной>
Findings: <список проблем или "нет">
QG-FE-MANUAL scope: <routes, states, roles, viewports | неприменимо с причиной>
```

`QG-FE-MANUAL` применим для любого UI/UX behavior diff: страницы, компоненты, layout, формы, модалы, навигация, permissions, states или responsive behavior. Существующее E2E-покрытие входит в evidence, но не отменяет визуальную/UX проверку критичного diff.

Lane неприменим только для backend-only, type-only или подтверждённого diff'ом non-behavior refactoring. Quality Gate агент сам выполняет сценарии через skill `ui-qa`, проверяет окружение через `stack-control`, использует Playwright MCP для exploratory debugging и просматривает screenshots через `read_image`. Подробный PASS contract и handoff — в `agents/howto/browser-qa-protocol.md`.

## Чеклист: Безопасность — lane `QG-BE` + `QG-CONTRACTS`

- [ ] Нет хардкода секретов (API-ключи, пароли, токены)
- [ ] Аутентификация применена к защищённым эндпоинтам
- [ ] SQL-инъекции исключены (параметризованные запросы)

---

## Команды для проверки

```bash
make test                # Запустить тесты
make lint                # flake8 + black + isort
make type-check          # mypy
make validate            # всё вместе
make asyncapi-validate   # Валидация AsyncAPI specs во всех сервисах
git diff main            # Посмотреть изменения относительно main
```

Или через корневой make (запускает QG с текущим diff):
```bash
make review TASK=NEX-XXX
```

### Когда запускать `make asyncapi-validate`

Запускай если diff затрагивает:
- `services/*/docs/asyncapi.yaml` — изменения AsyncAPI-спек
- `app/infrastructure/messaging/` — изменения NATS-контракта (subjects, payload)
- `app/core/config/nats.py` — изменения subjects / stream / consumer

AsyncAPI-спека должна соответствовать реальному коду:
- `subject` в `NATSSettings` → `channels[].address`
- Поля payload в handler → `components/schemas`

---


## Чеклист: Celery и Redis — lane `QG-BE`

- [ ] Номера БД Redis в коде соответствуют `agents/redis-databases.yaml`
- [ ] `CelerySettings` вынесен в отдельный класс с префиксом `CELERY_` (по аналогии с `NatsSettings`)
- [ ] `.env.example` содержит все переменные Celery/Redis
- [ ] Протокол `agents/howto/celery-protocols.md` содержит все обязательные секции
- [ ] Задачи определены в `src/workers/tasks/` с `@shared_task` и `autoretry_for`
- [ ] Celery app зарегистрирован в DI-контейнере как `providers.Singleton`
- [ ] docker-compose корректно запускает celery-worker с depends_on redis
- [ ] Dockerfile включает `workers/` в сборку
## Формат отчёта — lane `QG-SYNTH`

Отчёт создаёт только `QG-SYNTH`, один файл на change. Остальные lanes возвращают Router handoff и findings, но файлов не создают.

Сохрани результат в `docs/reports/<TICKET-ID>-review.md` или
`docs/reports/<TICKET-ID>-development-report.md`. Для отчёта после разработки используй
`docs/reports/TEMPLATE.md`.

Отчёт должен содержать:
- сводку по lanes: `QG-ENV` / `QG-BE` / `QG-FE-AUTO` / `QG-FE-MANUAL` / `QG-CONTRACTS` / `QG-LIVE` со статусом каждого (`пройден` / `findings` / `blocked` / `неприменимо` + причина);
- для `QG-ENV`: status/rebuild/migrations/health evidence и число repair attempts;
- для `QG-FE-MANUAL`: сценарии и viewports, пути к report/screenshots/traces, console/network/axe evidence и результат визуальной инспекции агентом;
- трассировку покрытия: ID из `## Test matrix` → фактический тест/smoke-сценарий, с перечислением непокрытых ID;
- ссылку на OpenSpec change, proposal/specs/tasks и approval;
- ссылку на задачу, если она была передана как md-файл;
- краткое описание выполненных изменений для контекста следующего агента;
- список изменённых файлов от корня монорепозитория (для `shipctl plan`);
- ветку по конвенции из `design.md`, если она задана;
- результаты unit/integration тестов;
- раздел `Frontend test gate`, если diff затрагивает `services/frontend`, с командами `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, количеством tests, self-check results, test quality review и access verification;
- результаты SMOKE-тестов с временем работы каждого эндпоинта;
- раздел `Access verification results` (anonymous/public checks + authenticated/protected checks + исключения).

### ✅ APPROVED:

```markdown
# Review: NEX-XXX

**Статус: ✅ APPROVED**
**Дата:** YYYY-MM-DD

## Итог

Diff соответствует плану. Тесты прошли. Архитектура не нарушена.

## Lanes

| Lane | Статус |
|---|---|
| QG-ENV | пройден — runtime healthy |
| QG-BE | пройден |
| QG-FE-AUTO | неприменимо — нет frontend diff |
| QG-FE-MANUAL | неприменимо — нет UI diff |
| QG-CONTRACTS | пройден |
| QG-LIVE | пройден |

## Покрытие по test matrix

| Диапазон | Статус |
|---|---|
| `UT-CB-01..18` | покрыто |
| `SM-CB-01..12` | выполнено |

## Тесты
- `make test`: X passed, 0 failed
- `make lint`: чисто

## SMOKE-тесты

| # | Endpoint | Method | HTTP | Time | Результат |
|---|---|---|---|---|---|
| SM-01 | `/api/example` | GET | 200 | 123 ms | ✅ |

Готово к merge.
```

### ❌ REWORK:

```markdown
# Review: NEX-XXX

**Статус: ❌ REWORK**
**Дата:** YYYY-MM-DD

## Проблемы

1. [АРХИТЕКТУРА] `app/interfaces/api/routes/job.py:45` — бизнес-логика в роутере
2. [ТЕСТЫ] `JobService` не покрыт unit-тестами
3. [СТИЛЬ] Отсутствует аннотация типов в `create_job()`

## Чеклист доработки

Findings оформляются как **новые execution units** с профилем и бюджетом; Router делегирует их по одному.

### Backend

`BE-FIX-1` (профиль: Backend, verification: `make test` в `services/backend`)

- [ ] Перенести логику из роутера в `JobService`
- [ ] Добавить `tests/unit/test_job_service.py`
- [ ] Добавить аннотации типов в `create_job()`
- [ ] BE-FIX-1.V Прогнать `make format`, `make test`, `make lint` и вернуть handoff

### Frontend

- [ ] Если frontend не затронут, оставить секцию пустой или указать `не требуется`

### Quality Gate

- [ ] Повторно прогнать только затронутые lanes: `QG-BE`, `QG-LIVE`
- [ ] Убедиться что unit-тесты и `make test` проходят
- [ ] Прочитать `.agents/skills/api-smoke-test/SKILL.md` и повторно запустить SMOKE-тесты
- [ ] Убедиться что в SMOKE-результатах указано время работы каждого эндпоинта
- [ ] `QG-SYNTH`: обновить вердикт в том же отчёте
```

> **Важно:** плоские секции `### Backend` / `### Frontend` / `### Quality Gate` сохраняются **только** в rework-файлах `docs/reports/` для совместимости с оркестратором. В OpenSpec `tasks.md` структура — по execution units. Findings передаются Router, который маршрутизирует их владельцам по одному unit'у; отдельным планом они не становятся.

---

## Финальная проверка форматирования и тестов — lane `QG-FORMAT`

**Применимость:** всегда, выполняется после всех других lanes и перед `QG-SYNTH`.

**Цель:** убедиться, что задача сдаётся с чистым отформатированным кодом, проходящим все линтеры и тесты.

### Предусловия

1. **Чистый worktree обязателен.** Перед запуском `QG-FORMAT` убедись, что:
   - Корневой репозиторий не имеет uncommitted/unstaged изменений
   - Все сервисные репозитории не имеют dirty changes
   - `git status --porcelain` пуст в корне и во всех `services/*`

2. Если worktree грязный — это **blocking finding** для Router с требованием:
   - Закоммитить незапланированные изменения в feature-ветку
   - Или исключить их из текущего change через `git restore`
   - Или пересобрать план через `shipctl plan` с новыми путями

### Процедура

Выполни из корня монорепозитория:

```bash
make format
```

**После `make format`:**

1. Проверь `git status --porcelain` в корне и во всех `services/*`
2. Если появились изменения — это **blocking finding**:
   - Код был неправильно отформатирован
   - Разработчик не запустил `make format` перед сдачей
   - Верни Router требование: закоммитить форматированный код в feature-ветку

3. Если worktree чистый — продолжай:

```bash
make lint
make test
```

**Критерии PASS:**

- `make format` не создал diff
- `make lint` вернул `exit code 0` без warnings
- `make test` прошёл все тесты core-сервисов (backend, notification-service, email-service, frontend)
- `services/site-*` не входят в корневую агрегацию

**Критерии FAIL/REWORK:**

- `make format` создал diff → finding владельцу с требованием закоммитить
- `make lint` вернул ошибки → finding владельцу с перечнем нарушений
- `make test` упал → finding владельцу с указанием упавших тестов

### Handoff

```text
Unit: QG-FORMAT | Профіль: Quality Gate | Статус: done / rework
make format: чистый worktree | создан diff <paths>
make lint: exit 0 | errors <count>
make test: passed <count> | failed <count>
Findings: <список или нет>
```

---

## Что запрещено

- ❌ Пропускать код без тестов
- ❌ Игнорировать нарушения Clean Architecture
- ❌ Одобрять merge при красных тестах
- ❌ Одобрять merge без успешных unit-тестов
- ❌ Одобрять merge без SMOKE-тестов через `.agents/skills/api-smoke-test`
- ❌ Одобрять merge, если SMOKE-результаты не содержат время работы эндпоинтов
- ❌ Сохранять review/report файлы вне `docs/reports/`
- ❌ Создавать отдельный файл-отчёт в каком-либо lane, кроме `QG-SYNTH`
- ❌ Ставить вердикт `APPROVED` / `REWORK` в каком-либо lane, кроме `QG-SYNTH`
- ❌ Молча пропускать lane вместо явной пометки `неприменимо` с обоснованием
- ❌ Одобрять change при расхождении между `## Test matrix` и фактическим покрытием
- ❌ Требовать фиксированное количество тестов вместо покрытия применимых осей риска
- ❌ Возвращать findings одним монолитным «доработай всё» вместо ограниченных execution units
- ❌ Одобрять merge без успешного прохождения `make format`, `make test`, `make lint` из корня проекта
- ❌ Принимать diff от Backend без подтверждения прохождения этих команд
- ❌ Одобрять CMS frontend behavior diff без успешных `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` из `services/frontend`
- ❌ Одобрять CMS frontend behavior diff без релевантных tests или подтвержденного diff'ом non-behavior обоснования
- ❌ Одобрять CMS frontend permissioned action без проверки anonymous/authenticated, scope present/missing, Protected Write UX и `401/403`
- ❌ Делегировать `QG-FE-MANUAL` человеку, ждать checklist или выдавать `APPROVED_WITH_MANUAL_QA`
- ❌ Считать отсутствие browser/tool/evidence основанием пропустить browser QA
- ❌ Запускать dev server до проверки доступного Docker stack
- ❌ Использовать `docker exec -it`, trailing `&` для background server или `/tmp` для cross-tool auth/evidence
- ❌ Делать больше двух infrastructure repair attempts вместо оформления code finding или `BLOCKED`

## Core boundary release checks — lane `QG-CONTRACTS`

- Tenant selector: missing/invalid non-secret hint → `401`; email owner-only matrix проверяется для anonymous/owner/foreign/privileged и foreign-before-lookup.
- Private backend→peer traffic не содержит peer credential; `X-Service-Key` разрешён только microservice→backend `/api/service/*`.
- Python gate не удаляет basedpyright и не добавляет blanket suppressions; declared mypy/basedpyright должны вернуть 0 errors.
- Celery readiness — только targeted `inspect ping --destination <stable-node>` с bounded timeout и log evidence. Queue/canary не считается readiness; delivery/retry/acks-late/idempotency/restart проверяются отдельной real Redis/Celery suite.
- ❌ Одобрять CMS frontend pagination diff без проверки `limit/offset`
- ❌ Одобрять CMS frontend diff со смешением `site-*` consumer контура
- ❌ Запускать smoke-тесты через `uv run pytest tests/smoke` — только через скилл `.agents/skills/api-smoke-test`
