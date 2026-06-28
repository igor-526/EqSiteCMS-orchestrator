# План: Обязательное frontend-тестирование в агентских инструкциях

**Тикет:** frontend_testing_mandatory_agents_26_05_11
**Дата:** 2026-05-11
**Затронутые сервисы:** агентские инструкции монорепозитория, `services/frontend`
**Ветка:** `feature/frontend-testing-mandatory-agents-26-05-11`

---

## Контекст

В `services/frontend` уже внедрен baseline тестирования CMS frontend: `package.json` содержит `test`/`test:watch`, Vitest, React Testing Library, jsdom и MSW; Quality Gate по baseline зафиксировал успешные проверки `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

После этого агентские инструкции нужно синхронизировать с новым правилом: для CMS frontend тестирование больше не optional. Planner должен планировать покрытие для каждой новой CMS frontend фичи, Frontend Agent должен добавлять или обновлять тесты на каждый behavior diff, а Quality Gate должен блокировать merge без frontend tests/checks для CMS изменений.

Scope этой задачи - только план будущих правок в `agents/planner.md`, `agents/frontend.md`, `agents/quality_gate.md`. Агентские инструкции и production/test код в рамках этого плана не менять.

## Цель

После реализации согласованного плана:

- Planner включает frontend test matrix для каждой новой CMS frontend feature;
- Frontend Agent обязан добавлять/обновлять тесты для любого изменения поведения в `services/frontend`;
- Quality Gate не может approve CMS frontend diff без `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` и применимых `rg` self-checks;
- обязательные тесты покрывают Protected Admin UI: anonymous/authenticated, scopes/permissions, Protected Write UX, `401/403`, no `site-*` mixing, pagination `limit/offset` если применимо;
- backend endpoint access policy не меняется.

---

## Детали реализации

### Backend

Backend, API endpoint'ы, БД, миграции и backend endpoint policy не меняются.

#### API контракт

Новых endpoint'ов нет. Существующая policy остается прежней:

- `GET` по умолчанию Public Read для сайтов-потребителей, если нет явно описанного исключения;
- `POST/PATCH/DELETE` Protected Write;
- CMS frontend работает как Protected Admin UI и должен тестировать admin UX поверх защищенного контекста;
- auth `POST` остается явным исключением.

### Frontend

Runtime frontend-код не меняется в рамках этого плана. Будущая реализация меняет только инструкции агентов.

#### Обновить `agents/planner.md`

Добавить секцию "Обязательное планирование тестов для CMS frontend-фич":

| Что добавить | Содержание |
|---|---|
| Trigger | Любая новая или измененная feature в `services/frontend`, включая UI, hooks, services, API boundary, filters, tables, pagination, scopes, forms/modals |
| Frontend test matrix | Для каждой CMS frontend feature Planner обязан включать таблицу: area, behavior diff, required tests, access scenario, commands |
| Protected Admin coverage | Anonymous redirect/block, authenticated render, scope present, scope missing, Protected Write hidden/disabled/guarded, backend denial surfaced through `401/403` |
| API boundary | MSW/mocks для success/error/validation/`401`/`403`; unit/component/API-boundary tests не ходят в реальный backend |
| Pagination | Если есть списки/таблицы: проверить `limit/offset`, page change, page size change, reset `offset` на filter/search/sort |
| No mixing | Проверить, что CMS frontend не импортирует и не использует `site-*` Public Read consumer code |
| Checklist | В `### Frontend` плана добавлять конкретные test tasks; в `### Quality Gate` - команды и self-checks |

Минимумы, которые Planner должен планировать для CMS frontend behavior diff:

| Тип изменения | Минимум |
|---|---|
| Hook/service/helper | 3 unit tests: success/base, empty/edge input, error path |
| Filter/search/sort | 4 tests: apply, clear/normalize, debounce/no-debounce expectation, reset `offset`; для sort - mapping и clear sort |
| Pagination | 4 tests: initial `limit/offset`, page change, page size change, filter/search/sort resets `offset` |
| Permissioned action | 4 tests: scope present, scope missing, disabled/hidden UX, `401/403` handling |
| Table/list | 5 component tests: data, loading, empty, error, interaction callback; если есть actions - добавить permission case |
| Modal/form mutation | 5 tests: open/close, valid submit, validation error, backend error, success refresh/invalidation; если Protected Write - permission case |
| Новая feature page/flow | Минимум component/API-boundary coverage + 1 smoke/e2e или, если Playwright еще не настроен для flow, manual QA steps в отчете |
| Регрессия | Минимум 1 тест, который фиксирует исправленное поведение |

#### Обновить `agents/frontend.md`

Добавить или усилить секцию "Обязательное тестирование CMS frontend":

| Что добавить | Содержание |
|---|---|
| Hard rule | Нельзя передавать behavior diff на QG без добавленных/обновленных тестов или явного non-behavior обоснования |
| Test stack | Использовать существующий baseline: Vitest, React Testing Library, user-event, jest-dom, jsdom, MSW |
| Test placement | Tests рядом с покрываемым кодом или по текущему pattern; helpers/fixtures использовать из `src/test` |
| MSW rule | API boundary tests должны мокировать backend, запрещены реальные network calls в unit/component/API-boundary tests |
| Behavior diff rule | Изменил hook/service/helper/UI flow/scopes/query serialization/form/modal/table/filter - добавь или обнови тесты на это поведение |
| Access tests | Для CMS Protected Admin UI проверять anonymous/authenticated, scope present/missing, Protected Write UX, `401/403` |
| Pagination tests | Для списков проверять `limit/offset`; не добавлять `page/limit` как API DTO/query |
| Completion report | Frontend Agent сообщает измененные файлы, добавленные тесты, команды, self-checks, access/scopes результат и готовность к QG |

Обязательные команды перед передачей на Quality Gate:

```bash
cd services/frontend && npm test
cd services/frontend && npm run lint
cd services/frontend && npx tsc --noEmit
cd services/frontend && npm run build
```

Обязательные `rg` self-checks для релевантного frontend diff:

```bash
rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'
rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'
rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'
rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'
find services/frontend/src -maxdepth 2 -type d \( -name shared -o -name widgets -o -name entities \)
```

#### Обновить `agents/quality_gate.md`

Добавить отдельный блок "Frontend Mandatory Testing Gate" и сделать его блокирующим для diff в `services/frontend`.

| Что добавить | Содержание |
|---|---|
| Blocking rule | Approve невозможен, если CMS frontend behavior diff не содержит релевантных tests или non-behavior обоснование не подтверждено diff'ом |
| Required commands | `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` из `services/frontend` |
| Required self-checks | Direct fetch/axios, API imports, pagination `page/pageSize/page_size`, `site-*` mixing, legacy FSD dirs |
| Test review | Проверить, что tests покрывают behavior diff, а не только render snapshots/happy path |
| Access review | Проверить anonymous/authenticated, scope present/missing, Protected Write UX, `401/403` |
| MSW/no network | Unit/component/API-boundary tests не требуют запущенного backend и не ходят в live API |
| Report | В review report добавить раздел `Frontend test gate` с командами, количеством tests, self-check results и access verification |

Quality Gate должен ставить `REWORK`, если:

- `services/frontend` behavior diff есть, но `npm test` не запускался или падает;
- добавлен/изменен behavior без теста на соответствующий сценарий;
- permissioned action не покрыт scope present/scope missing и `401/403`;
- table/list pagination меняет query behavior без тестов на `limit/offset`;
- unit/component/API-boundary tests требуют live backend;
- CMS frontend diff смешивает `site-*` consumer контур или добавляет CMS-only dependency в public consumer scope;
- `npm run lint`, `npx tsc --noEmit` или `npm run build` падают.

### Access matrix

| UI/API flow | Access class | Roles / scopes | Expected without auth | Expected with auth | Required frontend tests |
|---|---|---|---|---|---|
| CMS route/page in `services/frontend` | Protected Admin UI | Authenticated CMS session | Redirect/block to `/login` or auth guard state | Page/container renders allowed content | Anonymous + authenticated render tests for new page/flow |
| CMS read from admin UI | Protected Admin context | Authenticated CMS session, feature read scope if required | `401` handled by auth/client flow | Data loads through `src/api` + feature service | MSW success + `401`/error state where changed |
| CMS mutation `POST/PATCH/DELETE` | Protected Write | Authenticated user + feature action scope | UI action unavailable or backend denial surfaced as `401/403` | Mutation works; success refresh/invalidation happens | Scope present/missing, disabled/hidden UX, backend `401/403`, success/error |
| Auth `POST` login/refresh/logout | Explicit auth exception | Auth contract | Login can be public by contract | Session established/refreshed/cleared | Only when auth flow changes |
| `site-*` public content | Public Read, outside CMS scope | Not owned by `services/frontend` | Public site behavior unchanged | Not part of CMS frontend | `rg` self-check proves no mixing for CMS diff |

Исключений из API Access Policy эта задача не добавляет.

---

## Порядок выполнения

1. Получить согласование этого плана у пользователя.
2. Frontend Agent: обновить `agents/planner.md`, добавив обязательную frontend test matrix для новых CMS frontend фич.
3. Frontend Agent: обновить `agents/frontend.md`, добавив hard rule про тесты для любого behavior diff, команды и self-checks.
4. Frontend Agent: обновить `agents/quality_gate.md`, добавив блокирующий frontend mandatory testing gate.
5. Quality Gate: проверить только diff агентских инструкций на соответствие этому плану и baseline report.

---

## Чеклист

> ⚠️ Этот раздел используется агентами для отслеживания прогресса.
> Агент обязан менять `[ ]` → `[x]` после выполнения каждого пункта.
> Оркестратор парсит именно этот раздел.

### Backend

- [x] Подтвердить, что backend, API endpoint'ы, БД и миграции не меняются
- [x] Подтвердить, что backend endpoint access policy не меняется
- [x] Подтвердить, что новых исключений из API Access Policy нет

### Frontend

- [x] Обновить `agents/planner.md`: добавить секцию обязательного планирования тестов для каждой новой CMS frontend feature
- [x] Обновить `agents/planner.md`: добавить frontend test matrix с behavior diff, required tests, access scenarios и commands
- [x] Обновить `agents/planner.md`: требовать checklist-пункты на tests для anonymous/authenticated, scopes/permissions, Protected Write UX и `401/403`
- [x] Обновить `agents/planner.md`: требовать pagination coverage `limit/offset` и reset `offset`, если фича содержит списки/таблицы
- [x] Обновить `agents/planner.md`: требовать no `site-*` mixing self-check для CMS frontend фич
- [x] Обновить `agents/frontend.md`: добавить hard rule "любой behavior diff требует тестов"
- [x] Обновить `agents/frontend.md`: зафиксировать test stack Vitest/RTL/user-event/jest-dom/jsdom/MSW как текущий baseline
- [x] Обновить `agents/frontend.md`: описать test placement и использование `src/test` helpers/fixtures/MSW
- [x] Обновить `agents/frontend.md`: запретить live backend calls в unit/component/API-boundary tests
- [x] Обновить `agents/frontend.md`: добавить минимумы тестов по типам изменений
- [x] Обновить `agents/frontend.md`: добавить обязательные команды `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`
- [x] Обновить `agents/frontend.md`: добавить обязательные `rg` self-checks для direct fetch/API imports/pagination/site mixing/legacy dirs
- [x] Обновить `agents/frontend.md`: требовать completion report с tests/checks/access/scopes результатом
- [x] Обновить `agents/quality_gate.md`: добавить блокирующий `Frontend Mandatory Testing Gate`
- [x] Обновить `agents/quality_gate.md`: запретить approve без frontend tests/checks для CMS behavior diff
- [x] Обновить `agents/quality_gate.md`: требовать проверку качества tests относительно behavior diff, а не только факт наличия test files
- [x] Обновить `agents/quality_gate.md`: требовать review anonymous/authenticated, scope present/missing, Protected Write UX, `401/403`
- [x] Обновить `agents/quality_gate.md`: требовать report-раздел `Frontend test gate`

### Quality Gate

- [x] Проверить, что diff ограничен `agents/planner.md`, `agents/frontend.md`, `agents/quality_gate.md` и планом
- [x] Проверить, что инструкции не меняют backend endpoint policy
- [x] Проверить, что Planner теперь обязан планировать frontend tests для каждой новой CMS frontend feature
- [x] Проверить, что Frontend Agent теперь обязан добавлять/обновлять tests для любого CMS frontend behavior diff
- [x] Проверить, что Quality Gate блокирует merge без `cd services/frontend && npm test`
- [x] Проверить, что Quality Gate блокирует merge без `cd services/frontend && npm run lint`
- [x] Проверить, что Quality Gate блокирует merge без `cd services/frontend && npx tsc --noEmit`
- [x] Проверить, что Quality Gate блокирует merge без `cd services/frontend && npm run build`
- [x] Проверить, что Quality Gate требует применимые `rg` self-checks
- [x] Проверить, что обязательные scenarios включают anonymous/authenticated, scopes/permissions, Protected Write UX и `401/403`
- [x] Проверить, что pagination scenarios используют `limit/offset`, если применимо
- [x] Проверить, что инструкции запрещают смешение CMS frontend с `site-*` consumer контуром
