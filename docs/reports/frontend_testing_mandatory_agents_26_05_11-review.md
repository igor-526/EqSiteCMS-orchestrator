# Review: frontend_testing_mandatory_agents_26_05_11

**Статус: APPROVED**
**Дата:** 2026-05-11

## Итог

Diff соответствует плану `docs/plans/frontend_testing_mandatory_agents_26_05_11.md`.
Изменения являются documentation-only: обновлены агентские инструкции и чеклист плана.
Runtime код `services/frontend`, backend, endpoint'ы, миграции и API access policy не менялись.

## Измененные файлы в scope

- `agents/planner.md`
- `agents/frontend.md`
- `agents/quality_gate.md`
- `docs/plans/frontend_testing_mandatory_agents_26_05_11.md`

## Проверки

| Команда | Результат |
|---|---|
| `git diff --check -- agents/planner.md agents/frontend.md agents/quality_gate.md docs/plans/frontend_testing_mandatory_agents_26_05_11.md` | Passed |
| `git diff --name-only -- agents/planner.md agents/frontend.md agents/quality_gate.md docs/plans/frontend_testing_mandatory_agents_26_05_11.md services/frontend` | Только разрешенные docs/instruction files; `services/frontend` отсутствует |
| `git diff -- services/frontend` | No diff |
| `rg` по обязательным требованиям | Passed: найдены Planner test matrix, Frontend hard rule, Quality Gate blocking gate, required commands, access/scopes, `401/403`, `limit/offset`, no `site-*` mixing, documentation-only исключение |

## Подтверждения по требованиям

- Planner теперь обязан планировать frontend tests для каждой новой или измененной CMS frontend feature в `services/frontend`.
- Planner обязан добавлять frontend test matrix с behavior diff, required tests, access scenarios и commands.
- Planner обязан включать access coverage: anonymous/authenticated, scope present/missing, Protected Write UX, backend denial through `401/403`.
- Planner обязан требовать no `site-*` mixing self-check и pagination coverage через `limit/offset`.
- Frontend Agent теперь не может передавать CMS frontend behavior diff на Quality Gate без добавленных/обновленных tests или подтвержденного diff'ом non-behavior основания.
- Frontend Agent обязан использовать baseline stack: Vitest, React Testing Library, user-event, jest-dom, jsdom, MSW.
- Frontend Agent обязан запрещать live backend calls в unit/component/API-boundary tests.
- Quality Gate теперь блокирует approve CMS frontend behavior diff без `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, self-checks и релевантных tests.
- Quality Gate обязан проверять качество tests относительно behavior diff, access/scopes, MSW/no live backend calls, pagination `limit/offset` и no `site-*` mixing.

## Frontend test gate

Не применимо для запуска runtime-команд в этом review: diff documentation-only и не затрагивает runtime `services/frontend`.

| Команда | Статус |
|---|---|
| `cd services/frontend && npm test` | Not run: non-applicable for documentation-only diff |
| `cd services/frontend && npm run lint` | Not run: non-applicable for documentation-only diff |
| `cd services/frontend && npx tsc --noEmit` | Not run: non-applicable for documentation-only diff |
| `cd services/frontend && npm run build` | Not run: non-applicable for documentation-only diff |

`services/frontend/package.json` проверен как связанный baseline-контекст: `test`/`test:watch`, Vitest, React Testing Library, user-event, jest-dom, jsdom и MSW присутствуют.

## Access verification results

| Area | Result |
|---|---|
| Backend endpoint policy | Не менялась |
| Public Read `GET` default | Не менялся |
| Protected Write `POST/PATCH/DELETE` default | Не менялся |
| Auth `POST` exception | Не менялся |
| Protected Admin UI tests | Требуются инструкциями для CMS route/page, scopes, actions, mutations and API error handling |
| Anonymous/authenticated | Требуются Planner, Frontend Agent и Quality Gate инструкциями |
| Scope present/missing | Требуются Planner, Frontend Agent и Quality Gate инструкциями |
| Protected Write UX | Требуется: hidden/disabled/guarded action, mutation guard, backend `401/403` surfaced |
| Pagination | Требуется `limit/offset` coverage; `page/limit` API DTO/query contract запрещен |
| `site-*` mixing | Запрещено; self-check обязателен для CMS frontend diff |

## SMOKE Tests

Backend/runtime smoke tests не применимы: задача не меняет backend code, endpoints, migrations, runtime API contracts или frontend runtime code.

| # | Endpoint | Method | HTTP | Time | Результат |
|---|---|---|---|---|---|
| N/A | N/A | N/A | N/A | N/A | Non-applicable for documentation-only agent instruction diff |

## Решение

Approved. Rework не требуется.
