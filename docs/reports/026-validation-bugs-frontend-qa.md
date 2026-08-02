# Frontend QA evidence: 026 validation bugs

Дата: 2026-08-02. Frontend: `http://127.0.0.1:3000`; backend health/API: `http://127.0.0.1:8001`.

Browser: Playwright 1.62.1, local Chromium, headless. Anonymous redirect проверен с реальным backend `401`. Репозиторий не содержит воспроизводимых credential fixtures, поэтому authenticated, no-scope и forced-denial browser cases выполнены через Playwright API routing; live backend mutations не выполнялись. Это не заменяет backend smoke evidence.

| Step | Viewport / access | Result | Evidence |
|---|---|---|---|
| Anonymous `/horses` | 1440×900, real backend `GET /api/auth/me -> 401` | PASS: redirect `/login` | `assets/026-validation-bugs/anonymous-redirect-desktop.png` |
| Authenticated breeds modal | 1440×900, mocked `ADMIN` auth context | PASS: labels, inputs, counters, footer visible; no overlap | `assets/026-validation-bugs/breed-modal-desktop.png` |
| Authenticated breeds modal | 768×1024, mocked `ADMIN` auth context | PASS: modal fits viewport; controls accessible | `assets/026-validation-bugs/breed-modal-tablet.png` |
| Authenticated breeds modal | 390×844, mocked `ADMIN` auth context | PASS: modal width 374px, footer visible, vertical content fits/scrolls | `assets/026-validation-bugs/breed-modal-mobile.png` |
| Empty breed submit | 1440×900, mocked `ADMIN` auth context | PASS: `Наименование должно быть заполнено`, modal remains open, description counter remains `0/511`, no crash | browser assertion/output |
| Empty optional payload + double submit | 1440×900, mocked `ADMIN`; delayed success response | PASS: exactly one `POST /api/horses/breeds`; returned generated `slug=qa-poroda`, `description=null`; modal closes | browser network counter: `postRequests=1` |
| No dictionary scope | 1440×900, authenticated with empty scopes | PASS: breed «Добавить» absent; component tests also guard breed/coat row edit and modal mutation controls | `assets/026-validation-bugs/no-scope-breeds-desktop.png` |
| Forced coat-color denial | 1440×900, mocked `ADMIN`; `POST /api/horses/coat_colors -> 403 {"detail":"Forbidden by QA"}` | PASS: error surfaced, dialog remains open, `QA масть` retained | `assets/026-validation-bugs/coat-403-state-retained.png` |
| `401`/`403`, validation and generic API errors | isolated jsdom/MSW | PASS: no live requests; state/error behavior covered for both dictionaries | full Vitest suite |
| Pagination/search/sort | component/hook browser-independent regression matrix | PASS: initial `limit=25,offset=0`, page change, page-size reset and filter/search/sort offset reset | Vitest pagination/hook suites |
| Consumer isolation | static checks | PASS for this diff: no `site-*` runtime import/change and no legacy directory added | required `rg`/`find` output |

Screenshots were visually inspected after AntD animations completed. Desktop/tablet/mobile modal controls are readable and unobscured. The surrounding mobile horse table remains horizontally constrained by its existing responsive layout; the modal itself remains accessible and is not clipped.

