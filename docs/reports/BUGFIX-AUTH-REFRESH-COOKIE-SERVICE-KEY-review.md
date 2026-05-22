# Review: BUGFIX-AUTH-REFRESH-COOKIE-SERVICE-KEY

**Статус:** No blocking findings after targeted recheck
**Дата:** 2026-05-17
**План:** `docs/plans/bugfix/authorization_refresh_cookie_service_key.md`

## Findings

No blocking findings.

Previous blocker is fixed: `refresh_token` is now set with `Path=/`, browser-like refresh-only cookie jar reaches representative CMS dual-mode read, and `GET /api/horses/breeds` returns `401` instead of the previous public-read `400`.

## Changed Files Reviewed

- `services/backend/src/api/auth.py`
- `services/backend/src/depends/services.py`
- `services/backend/tests/unit/depends/test_auth_dependencies.py`
- `services/backend/tests/unit/api/test_auth_cookie_contract.py`
- `services/frontend/src/api/api-boundary.test.ts`
- `docs/plans/bugfix/authorization_refresh_cookie_service_key.md`

## Code Review Notes

- `services/backend/src/api/auth.py`: `refresh_token` uses `Path=/`; login/refresh also delete legacy `Path=/api/auth/refresh`; logout deletes current and legacy paths.
- `services/backend/src/depends/services.py`: refresh-cookie-only CMS read raises `InvalidCredentials` before service-key fallback; no-cookie/no-key public read remains `ClientError`/`400`; valid service key remains public context.
- `services/frontend/src/api/api-boundary.test.ts`: regressions cover `401` refresh/retry success, failed refresh without infinite retry, form-data protected write refresh/retry, and `400` missing service key not triggering refresh.

## Verification Commands

- `PYTHONPATH=src uv run pytest -q tests/unit/depends/test_auth_dependencies.py tests/unit/api/test_auth_cookie_contract.py` from `services/backend`: 20 passed.
- `PYTHONPATH=src uv run pytest -q tests/unit/core/services/test_auth_service.py tests/unit/depends/test_auth_dependencies.py tests/unit/api/test_auth_cookie_contract.py` from `services/backend`: 46 passed.
- `uv run ruff check src/api/auth.py src/depends/services.py tests/unit/depends/test_auth_dependencies.py tests/unit/api/test_auth_cookie_contract.py` from `services/backend`: passed.
- `npm test -- src/api/api-boundary.test.ts` from `services/frontend`: 1 file passed, 25 tests passed.
- `npm test` from `services/frontend`: 16 files passed, 157 tests passed. Vitest printed existing jsdom `getComputedStyle(... pseudo-elements)` notices.
- `npm run lint` from `services/frontend`: exited 0, 15 warnings, 0 errors.
- `npx tsc --noEmit` from `services/frontend`: passed.
- `npm run build` from `services/frontend`: passed.

## Smoke Results

Live API: `http://localhost:8001`.
Service key: `default-equestrian`.
Credentials role: `su`.

| # | Request | Mode | HTTP | Time | Result |
|---|---|---|---:|---:|---|
| SM-01 | `POST /api/auth/login` | cookie jar | 200 | 0.067543s | pass |
| Cookie check | login `Set-Cookie` | headers | n/a | n/a | `refresh_token` has `Path=/`; legacy `Path=/api/auth/refresh` deleted |
| Jar check | refresh-only jar | cookie jar | n/a | n/a | contains only `refresh_token` at `/` |
| SM-02 | `GET /api/auth/me` | authenticated jar | 200 | 0.019786s | pass |
| SM-03 | `GET /api/auth/me` | no cookies | 401 | 0.003225s | pass |
| SM-04 | `GET /api/auth/me` | refresh-only jar | 401 | 0.002613s | pass |
| SM-08 | `GET /api/horses/breeds` | browser-like refresh-only jar | 401 | 0.003367s | pass |
| SM-09 | `GET /api/horses/breeds` | no cookies, no key | 400 | 0.002561s | pass |
| SM-10 | `GET /api/horses/breeds` | valid service key | 200 | 0.025170s | pass |
| SM-11 | `GET /api/horses/breeds` | invalid service key | 404 | 0.022054s | pass |
| SM-12 | `GET /api/horses/breeds` | authenticated jar | 200 | 0.024403s | pass |
| SM-05 | `POST /api/auth/refresh` | refresh-only jar | 200 | 0.021907s | pass |
| Cookie check | refresh `Set-Cookie` | headers | n/a | n/a | `refresh_token` has `Path=/`; legacy `Path=/api/auth/refresh` deleted |
| SM-33 | `GET /api/horses/breeds` | after refresh | 200 | 0.024235s | pass |
| SM-06 | `POST /api/auth/refresh` | no cookies | 401 | 0.001737s | pass |
| Logout | `POST /api/auth/logout` | authenticated jar | 204 | 0.001101s | pass; clears `Path=/` and legacy path |
| SM-31 | `POST /api/horses/breeds` | refresh-only jar | 401 | 0.002087s | pass |
| SM-32 | `POST /api/horses/breeds` | no cookies | 401 | 0.002418s | pass |

## Frontend Gate

- Required commands passed: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Static checks reviewed:
  - raw `fetch` remains in API/auth boundary or developer documentation examples;
  - no new app/page direct API imports outside existing boundary patterns;
  - no unrelated pagination contract changes found for this diff;
  - no CMS/site-consumer mixing found;
  - no legacy `shared`, `widgets`, or `entities` dirs under `services/frontend/src`.
- MSW-backed API-boundary tests do not require live backend calls.

## Access Verification Results

- Refresh-only browser-like CMS read: `GET /api/horses/breeds` -> `401`.
- Public read without cookies and without service key: `GET /api/horses/breeds` -> `400`.
- Public read with valid service key: `GET /api/horses/breeds` -> `200`.
- Public read with invalid service key: `GET /api/horses/breeds` -> `404`.
- Refresh endpoint public auth exception: no refresh cookie -> `401`; valid refresh cookie -> `200`.
- Representative protected write: refresh-only and no-cookie `POST /api/horses/breeds` -> `401`.

## Remaining Unchecked

- Full live smoke matrix SM-01..SM-34 was not completed; only the targeted rework/access scenarios above were run.
- Browser manual QA report for initial request, refresh request, retry status, and expired-refresh redirect remains unchecked.
- Existing-session migration risk remains: browsers that only have an old legacy-path refresh cookie from before this rework will not send it to dual-mode reads until they login or refresh successfully.
