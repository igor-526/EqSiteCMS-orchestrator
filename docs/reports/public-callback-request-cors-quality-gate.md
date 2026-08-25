# Quality Gate: public-callback-request-cors

**Статус: APPROVED**  
**Дата:** 2026-08-25

## Findings

### Resolved

1. **[Site Consumer / selector] Исправлено.** Клиент теперь читает только `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY`, server-only env и скрытый fallback отсутствуют; пустое значение не создаёт header и приводит к CORS-readable `401`. Dockerfile, compose, workflow, README и `.env.example` используют единый build-time contract. Production build с `invalid-browser-qa` подтверждён bundle verifier и реальным Chrome request header; valid build отдельно подтверждён.

Открытых blocking findings нет.

## Reviewed scope

- OpenSpec: `openspec/changes/public-callback-request-cors/{proposal.md,design.md,tasks.md,specs/**}`.
- Backend: `README.md`, `docs/public-callback-cors.md`, `src/core/middleware/cors.py`, `tests/unit/api/test_cors_middleware.py`.
- Site Consumer: `.env.example`, `README.md`, `next.config.ts`, `src/api/callBackRequest.test.ts`, `src/api/client.test.ts`.
- Live evidence: `docs/reports/public-callback-request-cors-live-smoke.md`.

## Static/access review

- Exact immutable allowlist содержит только `("POST", "/api/callback_requests")`; negative coverage включает trailing slash, detail, similar prefix и service path.
- Consumer preflight: wildcard, `POST, OPTIONS`, два разрешённых header, credentialless; неизвестный header отклоняется без ACAO.
- CMS origin сохраняет reflected origin, credentials и `Vary: Origin`.
- Остальные writes/protected GET остаются strict; PII list/detail не открыты; Public GET policy не изменена.
- Миграций, NATS/messaging и AsyncAPI changes в diff нет.
- `SITE_API_PROXY_TARGET` и callback rewrite в `site-ad` отсутствуют.

## Independent CLI gates

- Backend `make test`: **1238 passed, 5 skipped**.
- Backend `make lint`: **PASS**; mypy (270 files), ruff check, ruff format check и flake8.
- Отдельной Make target `type-check` нет; type check выполнен внутри `make lint`.
- Site-ad `npm test -- --run`: **32/32 passed** (7 files).
- Site-ad `npm run lint`: **PASS with 8 pre-existing warnings, 0 errors**.
- Site-ad `npx tsc --noEmit`: **PASS**.
- Site-ad production builds с invalid и valid selector: **PASS**, по 17 static pages.
- `npm run verify:public-selector-bundle`: **PASS** для обоих build-time значений; verifier рекурсивно проверяет только `.next/static/chunks/**/*.js` и fail-fast при отсутствии expected selector.
- `openspec validate public-callback-request-cors --strict`: **PASS**.
- Root `make format` не запускался: общий worktree содержит unrelated/untracked changes; backend `ruff format --check` подтвердил 270 formatted files.

## Unit and live smoke evidence

- Backend CORS test module содержит 49 scenarios, включая более 30 разнообразных allowlist/access/header/origin/actual-response checks.
- Live smoke report независимо просмотрен: **36/36 PASS** на реальном API/PostgreSQL, с timings, свежим Docker discovery и cleanup.
- Public GET statuses и другой public GET: `200` + wildcard; protected callback list без cookie: `401`, PII отсутствует.
- Protected/service writes от foreign origin: strict, state unchanged.

## Chrome QA

- Origin `http://localhost:3002`; direct backend URL `http://localhost:8001/api/callback_requests`; proxy отсутствует.
- Preflight `OPTIONS 200`; actual — один `POST 201` даже при double-click.
- Request не содержал `Authorization`, `Cookie` или credential mode; response содержал ACAO `*` без credentials.
- Success modal показан, форма закрыта/очищена.
- Mobile `390x844`: dialog `375x844`; tablet `768x1024`: dialog `753x1024`; horizontal overflow отсутствует.
- Invalid-selector production build: browser отправил `invalid-browser-qa`, получил `401` + ACAO `*`; форма осталась открыта, name/comment сохранились, показана selector error.
- Schema-invalid request: временный Chrome interception заменил POST body на malformed JSON; backend вернул `422`, форма сохранилась и показала validation error. Interception после сценария снят.
- Generic/network error: временная Chrome URL block дала network failure; форма сохранилась и показала generic error. Блокировка после сценария снята.
- Valid production build: header `default-equestrian`, один прямой POST при double-click, `201` + ACAO `*`, без Cookie/Authorization/credentials; success modal, после повторного открытия поля пусты.
- Responsive form ранее и повторно проверена на mobile/tablet; Public GET regression подтверждена live smoke (`200` + wildcard) и неизменным middleware branch.
- Синтетические rows очищены; финальный повторный cleanup удалил 1 valid row, invalid/error scenarios inserts не создали.

## Verdict

**APPROVED.** Backend CORS implementation, site-ad direct integration, deployment selector contract, live access matrix и Chrome QA проходят. Q01–Q12 завершены; Q13/Q14 остаются Router для sync/strict validation/archive.
