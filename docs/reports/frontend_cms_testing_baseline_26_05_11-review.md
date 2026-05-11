# Review: frontend_cms_testing_baseline_26_05_11

**Статус: APPROVED**
**Дата:** 2026-05-11

## Итог

Реализация baseline тестовой инфраструктуры для `services/frontend` соответствует плану `docs/plans/frontend_cms_testing_baseline_26_05_11.md`. Production code не менялся; изменения ограничены test runner/config, test helpers, тестами и dev dependencies.

## Измененные файлы в scope

- `services/frontend/package.json`
- `services/frontend/package-lock.json`
- `services/frontend/vitest.config.ts`
- `services/frontend/src/test/fixtures.ts`
- `services/frontend/src/test/render.tsx`
- `services/frontend/src/test/setup.ts`
- `services/frontend/src/test/msw/server.ts`
- `services/frontend/src/api/api-boundary.test.ts`
- `services/frontend/src/features/filters-reset.test.ts`
- `services/frontend/src/features/scopes.test.tsx`
- `services/frontend/src/ui/MainTable.test.tsx`
- `services/frontend/src/ui/TablePaginator.test.tsx`
- `services/frontend/src/ui/filters/filters.test.tsx`
- `docs/plans/frontend_cms_testing_baseline_26_05_11.md`

## Рекомендуемая ветка

`feature/frontend-cms-testing-baseline-26-05-11`

Текущий frontend worktree на момент проверки: `main`.

## Проверки

| Команда | Результат |
|---|---|
| `cd services/frontend && npm test` | Passed: 6 files, 41 tests |
| `cd services/frontend && npm run lint` | Passed: 0 errors, 22 existing warnings |
| `cd services/frontend && npx tsc --noEmit` | Passed |
| `cd services/frontend && npm run build` | Passed |

## Self-checks

| Проверка | Результат |
|---|---|
| `rg -n "fetch\\(|axios" src -g '*.{ts,tsx}'` | Runtime calls remain in `src/api/auth.ts` and `src/api/client.ts`; other matches are documentation snippets in developer documentation views |
| `rg -n "from ['\\\"]@/api" src/app src/features -g '*.{ts,tsx}'` | Feature imports are through feature services; app imports are existing auth login/logout boundaries |
| `rg -n "\\bpage\\b|pageSize|page_size" src/features src/api src/types -g '*.{ts,tsx}'` | Existing news `page` contract/documentation remains present; this baseline did not add runtime API contract changes. New tests assert `limit/offset` for the covered CMS API boundary and no `page` param for price list |
| `rg -n "site-ad|site-\\*|Public Read|public read" src -g '*.{ts,tsx}'` | No matches |
| `rg -n "playwright|@playwright" package.json package-lock.json vitest.config.ts src/test src -g '*.{json,ts,tsx,js,mjs}'` | No direct `package.json` dependency or config; only optional peer metadata in lockfile |

## Architecture Review

- `package.json` adds `test` and `test:watch` scripts plus direct dev dependencies for Vitest, React Testing Library, user-event, jest-dom, jsdom, MSW, and Vite React plugin.
- `vitest.config.ts` uses `jsdom`, `@` alias, React plugin, and test setup only; no production runtime config is changed.
- `src/test/setup.ts` starts MSW with `onUnhandledRequest: "error"`, resets handlers after each test, and provides minimal browser API mocks.
- `src/test/render.tsx` wraps components with CMS-level AntD, Notification, and PageTitle providers.
- Unit/component/API-boundary tests do not require a real backend. The API-boundary suite verifies success/error, validation error, `401` refresh handling, `403`, and unhandled request blocking through MSW.
- Protected Admin scope behavior is covered for anonymous user, scope present, scope missing, enabled action, and disabled action. The tests do not claim UI hiding/restriction replaces backend authorization.
- P2 feature service boundary coverage exists for `prices`, `news`, `horses`, `gallery`, and `siteSettings`.

## Notes

- `src/features/filters-reset.test.ts` currently verifies a local test helper rather than production code. This is a low-risk baseline quality gap, not a merge blocker for the initial infrastructure, because the rest of the planned checks and commands pass.
- The existing news `page` query contract is still present outside this diff. The reviewed implementation did not introduce new production API contract changes.

## Access Verification Results

| Area | Result |
|---|---|
| Anonymous / Protected Admin UI | Covered at helper level: anonymous users lack protected admin action scopes |
| Authenticated / scope present | Covered for price/news scope helpers and enabled protected write action |
| Scope missing / forbidden UI | Covered with disabled protected write action and missing-scope checks |
| Backend denial | Covered with mocked `403` responses for protected write service calls |
| `401` auth handling | Covered with failed refresh and successful refresh retry paths |
| Public Read `site-*` consumer | Not used; no matches in CMS frontend source self-check |
| API exceptions | No new exceptions introduced |

## SMOKE Tests

Backend/API smoke tests: not applicable for this Quality Gate. The implementation did not change backend code, endpoints, migrations, auth policy, or runtime API contracts; tests are unit/component/API-boundary tests with MSW mocks.

| # | Endpoint | Method | HTTP | Time | Результат |
|---|---|---|---|---|---|
| N/A | N/A | N/A | N/A | N/A | Backend smoke not applicable: no endpoint/backend changes |

## Решение

Approved for merge after normal branch hygiene. No production code rework required.
