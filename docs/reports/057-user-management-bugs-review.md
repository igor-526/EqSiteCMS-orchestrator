# Review: 057 User Management Bugs

**Статус: ✅ APPROVED**  
**Дата:** 2026-08-25  
**Рекомендуемая ветка:** `fix/057-user-management-bugs`

## Ссылки

- Задача: [`docs/tasks/057_user_management_bugs.md`](../tasks/057_user_management_bugs.md)
- OpenSpec change: [`openspec/changes/fix-057-user-management-bugs`](../../openspec/changes/fix-057-user-management-bugs)
- Proposal: [`proposal.md`](../../openspec/changes/fix-057-user-management-bugs/proposal.md)
- Design: [`design.md`](../../openspec/changes/fix-057-user-management-bugs/design.md)
- Delta spec: [`specs/user-management-ui/spec.md`](../../openspec/changes/fix-057-user-management-bugs/specs/user-management-ui/spec.md)
- Tasks: [`tasks.md`](../../openspec/changes/fix-057-user-management-bugs/tasks.md)
- Approval: пользователь явно ответил `Apply` после показа apply-ready artifacts.

## Итог

После финального rework роли нормализованы под raw backend array contract, create payload получает `currentUser.equestrian_id`, а frontend validation синхронизирована с backend. Автоматические gates и live QA пройдены; временные test users после create/edit и USER_MANAGER checks удалены, повторный GET вернул 404.

Backend, API-контракт и `site-*` данным change не изменены. В frontend worktree одновременно есть несвязанные изменения callbackRequests/horses; они не включались в path-scoped review change 057.

## Изменённые файлы change 057

- `src/app/(protected)/users/page.tsx`
- `src/app/(protected)/users/users.page.test.tsx`
- `src/features/user-management/hooks/useUserManagement.ts`
- `src/features/user-management/hooks/useUserManagementScopes.ts`
- `src/features/user-management/hooks/useUserManagement.test.ts`
- `src/features/user-management/hooks/useUserManagementScopes.test.ts`
- `src/features/user-management/ui/UserFormModal.tsx`
- `src/features/user-management/ui/UserFormModal.test.tsx`
- `src/features/user-management/ui/UserActionsCell.test.tsx`
- `src/features/user-management/ui/UsersHeader.tsx`
- `src/features/user-management/ui/UsersHeader.test.tsx`
- `src/features/user-management/ui/UsersTabs.tsx`
- `src/features/user-management/ui/UsersUserDocumentationView.tsx`
- `src/features/user-management/ui/UsersDeveloperDocumentationView.tsx`

## Blocking findings

Нет.

Resolved on re-review:

- tests/access: create/update validation, generic, 401/403, UUID payload, refresh, form preservation, success close, double-submit, redirect/render and mutation guards covered;
- tests/UI: page-level order, gap and both documentation views covered;
- newly added error inline style replaced with utility classes.

## Frontend test gate

| Проверка | Результат | Evidence |
|---|---|---|
| targeted Vitest | passed | 6 files, 34 tests, 0 failed |
| `npm test` | passed | 68 files, 557 tests, 0 failed |
| `npm run lint` | passed with baseline warnings | 0 errors, 429 warnings |
| `npx tsc --noEmit` | passed | exit 0 |
| `NEXT_DIST_DIR=.next-qg057-final npm run build` | passed | isolated build; 17 static pages, `/users` generated |
| `git diff --check` | passed | no whitespace errors |
| `openspec validate fix-057-user-management-bugs --strict` | passed | change valid |

Tests use mocked services and do not make live backend calls. A normal `.next` build initially failed from concurrent `next dev --port 3000` writes to the same output directory; isolated `distDir` build passed, proving an infrastructure race rather than a source failure. The temporary Next.js rewrite of `tsconfig.json` was reverted; `git diff -- tsconfig.json` is empty.

## Self-check results

- Direct `fetch`: only existing API boundary (`src/api/client.ts`, `src/api/auth.ts`, `src/api/email.ts`) and documentation snippets; none added to user-management UI.
- `limit/offset`: user-management hook test checks initial/page/page-size/search/reset behavior; no page-based API parameter introduced.
- `site-*` / Public Read mixing: none in change 057; no legacy `shared/widgets/entities` directories found.
- `response.status === "ok"`: not introduced; changed hook uses `isApiSuccess`.
- New inline styles: none; the new role error uses utility classes. Existing tag/display-error inline styles predate this change.
- Makefile contract: root targets call backend → notification-service → email-service → frontend explicitly; frontend declares `.PHONY: test lint format build`. Root `make format/test/lint` were not run because the worktree contains unrelated active changes and this is a frontend-only path-scoped review; required frontend commands were run directly.

## Access verification results

| Contract | Result |
|---|---|
| GET `/api/user-management/roles` Protected Read | anonymous `401` (2.5 ms), SUPERUSER `200` (25.9 ms, array of 4), ADMIN/no-scope `403` (21.5 ms) |
| Anonymous / scope missing route protection | Page-level tests pass; live ADMIN `/users` redirected to `/dashboard`, table never rendered, denial UI surfaced |
| USER_MANAGER / SUPERUSER render | SUPERUSER browser render passed; temporary USER_MANAGER authenticated API checks returned `200`, then user was removed |
| POST Protected Write | anonymous `401`, ADMIN/no-scope `403`; SUPERUSER create with `equestrian_id` returned `201` (32.3 ms) |
| PATCH Protected Write | SUPERUSER update with UUID `scope_ids` returned `200` (30.5 ms); browser edit preload/refreshed values passed |
| Backend 401/403 surfaced | Real statuses verified; browser ADMIN denial redirected and displayed permission error |

No access policy weakening was found.

## SMOKE-тесты

Backend runtime diff отсутствует, но smoke workflow применён для проверки access matrix, от которой зависит frontend behavior:

| # | Endpoint | Mode | HTTP | Time | Result |
|---|---|---|---|---|---|
| SM-01 | GET `/api/user-management/roles` | anonymous | 401 | 2.5 ms | pass |
| SM-02 | GET `/api/user-management/roles` | SUPERUSER | 200 | 25.9 ms | API access pass; frontend shape mismatch |
| SM-03 | GET `/api/user-management/roles` | ADMIN/no-scope | 403 | 21.5 ms | pass |
| SM-04 | POST `/api/user-management/users` | anonymous | 401 | 2.0 ms | pass |
| SM-05 | POST `/api/user-management/users` | ADMIN/no-scope | 403 | 21.6 ms | pass |
| SM-06 | POST `/api/user-management/users` | SUPERUSER | 201 | 32.3 ms | pass: tenant UUID and two role UUIDs accepted |
| SM-07 | PATCH `/api/user-management/users/{id}` | SUPERUSER | 200 | 30.5 ms | pass: name and UUID role array updated |
| SM-08 | DELETE `/api/user-management/users/{id}` | SUPERUSER | 204 | 33.1 ms | pass; follow-up GET 404 |
| SM-09 | GET roles/users | temporary USER_MANAGER | 200/200 | 25.5/27.2 ms | pass; temporary user deleted, follow-up GET 404 |

All temporary users were deleted and verified absent with follow-up `404`. Credentials were loaded internally and never logged.

## Manual QA evidence

- Current environment: `http://localhost:3000/users`, authenticated protected CMS, current source, 2026-08-25.
- Desktop 1440×900: tabs 112–158px, controls 174–206px, table region starts 222px; no overlap or horizontal overflow.
- Tablet 768×1024: controls wrap to 76px height, paginator remains right-aligned, table starts 266px; no overlap or horizontal overflow.
- Mobile 390×844: controls wrap to 116px height, paginator remains after controls, table starts 306px; document width remains 390px with no page overflow. Modal bounds `x=8..382`, width 374, within viewport.
- Tabs and table render from current change. Create modal shows four localized options; multiple selected tags (`Администратор`, `Разработчик`) contain no visible UUID.
- Smoke ADMIN credentials were used after explicit action-time confirmation. ADMIN login succeeded; `/users` redirected to `/dashboard`, protected content did not render, and permission denial UI appeared. Credentials were not exposed.
- SUPERUSER access, protected page, tabs/table and responsive composition passed. Temporary USER_MANAGER authenticated access returned 200 for roles/users and was cleaned up.
- Live API create accepted `equestrian_id` and two role UUIDs. Browser list refresh displayed the created row and both localized roles. Edit modal preloaded localized tags without UUID. PATCH changed the name and role UUID; browser reload showed `QualityUpdated` and `Менеджер пользователей`.
- Cleanup: created QA user DELETE 204 then GET 404; temporary USER_MANAGER DELETE 204 then GET 404.
- Verdict: passed.

## Rework checklist

### Frontend

- [x] Add page/component tests for the complete header/table/documentation composition and tab switching.
- [x] Add create and update tests for UUID `scope_ids`, success close/refresh, validation/generic/401/403 failure, form preservation and double-submit.
- [x] Add route/access component tests for redirect, allowed render, scope missing, mutation guard and surfaced denial.
- [x] Cover multiple selected roles and selected tag labels, including absence of UUID text.
- [x] Replace the newly added static inline error style with utility classes.
- [x] Correct the roles API boundary from paginated object to backend array contract and add regression coverage using array response shape.
- [x] Add required `equestrian_id` to create flow from current authenticated tenant; cover success and cleanup.
- [x] Complete create/edit role option/tag, multiple UUID payload and success refresh QA.
- [x] Verify temporary USER_MANAGER authenticated access and clean up its record.
- [x] Complete and check task 1.13 with live evidence.

### Quality Gate

- [x] Repeat the full path-scoped review after fixes.
- [x] Re-run tests, lint, typecheck, isolated build, strict OpenSpec validation and self-checks.
- [x] Verify Manual QA evidence against the current build before APPROVED.
