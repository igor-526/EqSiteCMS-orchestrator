# Review: 026 validation bugs

**Статус: ✅ APPROVED**  
**Дата:** 2026-08-02  
**OpenSpec change:** `fix-026-validation-bugs` (approval: пользовательское `apply`)

## Итог

Повторный совокупный Quality Gate после rework пройден. Все шесть findings первого цикла закрыты: coat-color Protected Write проверяет существующие scopes в service layer, CMS dictionary actions защищены в header/page/table/modal, live access и 30 smoke scenarios подтверждены, UT-01..UT-30 сопоставлены, browser QA приложен. Исключений из access policy нет.

## Diff и архитектура

- Backend: `api/coat_color.py`, services пород/мастей и их unit tests. Router передаёт typed user, permission/business validation остаются в service layer; repositories/SQL/transactions не протекли в API.
- Frontend: horse scope registry, page/header/table/modal guards и tests/hooks. Guard действует на visibility, open handler, row interaction и mutation callback; сервер остаётся authoritative enforcement.
- Миграции, NATS/AsyncAPI и `services/site-ad` не изменены. Smoke pytest-файлы не добавлены.

## Backend checks

- `uv run pytest`: **766 passed, 5 skipped, 0 failed**.
- `uv run mypy src && uv run flake8 && uv run ruff check src tests`: **passed**.
- Feature mapping: **UT-01..UT-30**, плюс отдельные scope/tenant tests.
- Live smoke: **SM-01..SM-30 passed** на реальном API/PostgreSQL; timings 0.002337–0.049459 s, no-write/tenant isolation и cleanup подтверждены.
- Fresh `docker inspect`: `eqsitecms-db` (`0905da513e53`), `postgres:16`, project/service `eqsitecms/db`, host `5433`, aliases `eqsitecms-db`,`db`.

Полное evidence: `docs/reports/026-validation-bugs-backend-evidence.md`.

## Frontend test gate

- `npm test`: **36 files, 323 tests passed**.
- `npm run lint`: **0 errors, 392 baseline warnings**.
- `npx tsc --noEmit`: **passed**.
- `npm run build`: **passed**, 13 static pages.
- MSW/jsdom покрывают success, empty payload, validation/generic/401/403, state retention и double submit; live network не требуется.
- Pagination `limit/offset`, page/page-size и reset offset tests passed.
- Required rg/find self-checks reviewed: direct fetch остаётся в разрешённом API boundary либо documentation examples; новых app/feature UI API-boundary нарушений, `site-*` mixing и legacy `shared/widgets/entities` нет.

Browser evidence: anonymous redirect выполнен против real backend 401. Authenticated/no-scope/forced-denial UI cases использовали Playwright routing из-за отсутствия credential fixtures; ограничение явно зафиксировано и не подменяет live backend smoke. Desktop/tablet/mobile screenshots визуально проверены.

Полное evidence: `docs/reports/026-validation-bugs-frontend-qa.md` и `docs/reports/assets/026-validation-bugs/`.

## Access verification results

| Endpoint/UI | Anonymous | Auth + scope | No scope | Foreign tenant |
|---|---|---|---|---|
| Breed POST/PATCH | 401, no write | 200 | 403, no write | 400 hidden, no write |
| Coat-color POST/PATCH | 401, no write | 200 | 403, no write | 400 hidden, no write |
| CMS `/horses` | redirect `/login` | actions/render available | create/edit/delete guarded at multiple UI layers | backend authoritative denial |

Scopes соответствуют существующей роли-модели: `SUPERUSER`, `ADMIN`, `DEVELOPER`. Новых Public Read/Protected Write исключений нет.

## Validation

- `openspec validate fix-026-validation-bugs --strict`: **valid** перед sync/archive.
- Findings: **0 open**.
- Quality Gate tasks 1.78–1.84: complete.

Обе delta specs синхронизированы в `openspec/specs/backend-domain-capabilities/spec.md` и `openspec/specs/cms-horse-ui-quality/spec.md`; устаревшие coat-color access rows согласованы с подтверждённым `SUPERUSER`/`ADMIN`/`DEVELOPER` contract. Task 1.85 выполнен перед archive.
