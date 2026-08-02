# short-names-024 — Frontend evidence

Дата: 2026-08-02. Scope: `services/frontend`, OpenSpec tasks 1.71–1.83.

## Automated checks

- `npm test`: passed, 35 files / 268 tests.
- `npm run lint`: exit 0, 0 errors / 389 pre-existing warnings.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; `/horses` production bundle generated.
- Targeted short-name matrix: 6 files / 29 tests passed.
- Tests use MSW/jsdom and do not call a live API.

Coverage includes breed/coat-color query and body serialization, `short_name` data rendering,
search apply/clear, ascending/descending/clear sort, `limit/offset`, offset reset, create/update,
empty/63/64-character validation, field errors, success/error and HTTP 401/403 handling.
Existing protected-layout and horse-scope suites cover anonymous/authenticated route behavior and
scope-present/scope-missing UI guards.

## Self-check

- Runtime `fetch` remains confined to existing API/auth boundaries; matches in documentation views
  are static code snippets. No new direct API import was added to UI or pages.
- Horse list contracts use `limit/offset`; no page-based API field was added.
- No `shared`, `widgets` or `entities` directory was created.
- `services/site-ad` diff is empty and CMS code has no new consumer imports.
- `git diff --check` passed for frontend and the task checklist.

## Manual QA

Выполнен 2026-08-02 реальным Chromium (временный Playwright runner) против локальных
`http://localhost:3000` и live API `http://localhost:8001`, PostgreSQL `eqsitecms-db`.

- Anonymous `/horses` перенаправлен на `/login`; временный SUPERUSER видит обе вкладки.
- Для пород и мастей пройдены create/update/refresh с live `200`, пустое значение, 63 символа и
  client error на 64 символах, substring search, clear, asc/desc sort и `offset=0` вместе с
  `limit` в Network.
- Ограниченный пользователь не видит mutation action; автоматизированная MSW-матрица дополнительно
  подтверждает `401/403`, generic/network error и сохранение modal state.
- Проверен double-click. Первый прогон выявил две POST-мутации; добавлен `submitGuard`/loading в обе
  модалки. Повторный live прогон подтвердил ровно один POST и успешный refresh.
- Responsive smoke пройден на desktop 1440×900, tablet 768×1024 и mobile 390×844: controls доступны,
  модалки и таблицы не перекрываются, горизонтальная прокрутка сохраняется.
- Screenshots: `docs/reports/assets/short-names-024/desktop-1440x900.png`,
  `tablet-768x1024.png`, `mobile-390x844.png`.
- Временные пользователи `qa_short_names_024`, `qa_short_names_limited` и все `QA Breed/QA Coat`
  rows удалены; контрольные counts после cleanup: breeds=0, coat_color=0, users=0.
