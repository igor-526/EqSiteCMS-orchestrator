# Review: renaming-horse-code-046

**Статус: ❌ REWORK**  
**Дата:** 2026-08-17

## Итог

Совместный backend/frontend diff соответствует proposal, design и delta specs; blocking code findings не обнаружены. После remediation полная access matrix подтверждена live API. Gate пока не может быть утверждён только без responsive/manual browser QA.

OpenSpec: `openspec/changes/renaming-horse-code-046/` (`proposal.md`, `design.md`, `specs/**`, `tasks.md`), apply подтверждён пользователем. Исходная задача: `docs/tasks/046_renaming_horse_code.md`.

## Findings

1. **HIGH — Manual QA 1.88 не выполнен.** `services/frontend/docs/reports/renaming-horse-code-046-manual-qa.md:13-17`. Browser discovery повторно вернул пустой список / `No browser is available`; отсутствуют desktop/tablet/mobile, cookie session и Network evidence.

Устранённый finding предыдущего прохода: backend создал временные access fixtures, подтвердил authenticated no-scope `POST/PATCH -> 403` без mutation и second-tenant `PATCH -> 400` без изменения foreign row, затем подтвердил cleanup. Tasks 1.55–1.56 закрыты; access finding снят.

## Проверенный diff

- Backend: migration, horse model/entity/DTO/repository/service и unit/access/migration tests.
- Frontend: horse types, validators, API-boundary/MSW tests, table/modal, documentation.
- `services/site-ad`: рабочее дерево чистое; runtime-изменений нет.
- Clean Architecture: projection находится в `HorseService`; repository сохраняет canonical data и не содержит auth/presentation logic.
- NATS/AsyncAPI: неприменимо, messaging contract не изменён.

Рекомендуемая ветка: `feature/renaming-horse-code-046`.

## Backend checks

- Повторный `make check-backend`: 964 passed, 5 skipped; mypy, ruff check, ruff format check и flake8 — успешно.
- Relevant horse tests содержат более 30 разнообразных cases: DTO/entity boundaries, repository SQL, service projections, permissions, tenant selectors, pagination и migration.
- Alembic: отдельная временная PostgreSQL DB `eqsitecms_qg_046` прошла `upgrade head -> downgrade a1b2c3d4e5f6 -> upgrade head`; downgrade дал `code`, повторный upgrade дал nullable `pedigree_name VARCHAR(63)`. Временная DB удалена.
- Live schema основной DB: revision `d4c6e8f0a246`; `pedigree_name VARCHAR(63) NULL`, `code` отсутствует.

## Frontend test gate

- Последний полный `npm test -- --run` после horse-table regression fix: 46 files, 424 passed, 0 failed.
- Повторный `npm run lint`: 0 errors, 397 pre-existing/baseline warnings.
- Повторный `npx tsc --noEmit`: успешно.
- Повторный `npm run build`: успешно; `/horses` собран.
- MSW/API-boundary: success, raw null, omitted, validation/generic/401/403; live backend calls не требуются.
- UI/component: data/loading/empty/error, create/edit/clear, double submit, scopes и pagination покрыты.
- Self-checks `fetch|axios`, `@/api` imports, pagination, public/site mixing и legacy FSD dirs просмотрены; новых boundary violations в change diff нет.
- Manual QA: blocked, см. finding 1.

### Horse table regression review

Повторный scoped review `HorsesTable.tsx` / `HorsesTable.test.tsx` выполнен отдельно от параллельного change 048; findings не обнаружены.

- default `this_stable: true` отображается как «Наши» без пустого active tag;
- выбор «Чужие» сохраняет boolean `false`, API serializer формирует `this_stable=false`, `offset` сбрасывается в `0`;
- populated row содержит соседние заполненные колонки «База»/«Кличка» и не получает `ant-table-placeholder`;
- placeholder row и multi-column `colspan` присутствуют только при пустом `horses=[]`;
- targeted `npx vitest run src/features/horses/ui/Horses/HorsesTable.test.tsx`: 21 passed;
- scoped ESLint: 0 errors, 19 существующих warnings;
- `npx tsc --noEmit` и `npm run build`: успешно.

## SMOKE-тесты

Skill `api-smoke-test` применён к live API `localhost:8001` и PostgreSQL container `eqsitecms-db` (`7c720ddc783d`). Повторный `docker inspect`: project `eqsitecms-core`, service `db`, PostgreSQL 16, host port `5433`. Выполнено 34/34 доступных проверок; ниже feature/access endpoints (login/cleanup также имели timings).

| Проверка | Endpoint | HTTP | Time | Результат |
|---|---|---:|---:|---|
| create pedigree | `POST /api/horses` | 200 | 36.34 ms | ✅ exact raw value |
| create null | `POST /api/horses` | 200 | 27.25 ms | ✅ SQL/JSON null |
| boundary 63 | `POST /api/horses` | 200 | 48.13 ms | ✅ |
| boundary 64 | `POST /api/horses` | 400 | 28.14 ms | ✅ no row |
| anonymous write | `POST /api/horses` | 401 | 2.26 ms | ✅ |
| anonymous write | `PATCH /api/horses/{id}` | 401 | 1.89 ms | ✅ |
| replace | `PATCH /api/horses/{id}` | 200 | 52.95 ms | ✅ |
| omitted | `PATCH /api/horses/{id}` | 200 | 26.88 ms | ✅ preserved |
| public list projection | `GET /api/horses` | 200 | 25.91 ms | ✅ effective name + raw field |
| public detail projection | `GET /api/horses/{id}` | 200 | 24.22 ms | ✅ |
| public null fallback | `GET /api/horses/{id}` | 200 | 23.33 ms | ✅ base name + null |
| CMS raw named | `GET /api/horses/{id}` | 200 | 22.97 ms | ✅ no fallback |
| CMS raw null | `GET /api/horses/{id}` | 200 | 22.95 ms | ✅ explicit null |
| cookie priority | `GET /api/horses/{id}` + spoofed key | 200 | 25.11 ms | ✅ CMS projection |
| missing selector | `GET /api/horses` | 401 | 2.62 ms | ✅ |
| invalid selector | `GET /api/horses` | 401 | 19.09 ms | ✅ |
| unknown horse | `GET /api/horses/{id}` | 404 | 23.21 ms | ✅ |
| pagination | `GET /api/horses?limit=1&offset=0` | 200 | 24.15 ms | ✅ |
| pagination | `GET /api/horses?limit=1&offset=1` | 200 | 22.30 ms | ✅ |
| filter | `GET /api/horses?name=...` | 200 | 46.32 ms | ✅ |
| sort | `GET /api/horses?sort=name` | 200 | 29.02 ms | ✅ |
| sire candidates | `GET /api/horses/{id}/pedigree/sire` | 200 | 39.36 ms | ✅ |
| dam candidates | `GET /api/horses/{id}/pedigree/dam` | 200 | 34.92 ms | ✅ |
| child candidates | `GET /api/horses/{id}/pedigree/children` | 200 | 34.08 ms | ✅ |
| recursive detail | `GET /api/horses/{id}?pedigree=2` | 200 | 30.70 ms | ✅ |
| explicit clear | `PATCH /api/horses/{id}` | 200 | 29.23 ms | ✅ |
| fallback after clear | `GET /api/horses/{id}` | 200 | 32.89 ms | ✅ |
| anonymous delete | `DELETE /api/horses/{id}` | 401 | 2.63 ms | ✅ |
| authenticated delete | `DELETE /api/horses/{id}` | 204 | 54.52 ms | ✅ |

## Access verification results

- Public Read with valid tenant key: passed for list/detail/candidates/pedigree; raw `pedigree_name` retained and only `name` receives fallback.
- CMS cookie: passed raw name/raw nullable field; cookie wins over spoofed service key.
- Missing/invalid tenant selector: 401 passed. Unknown tenant-scoped horse: 404 passed.
- Protected Write anonymous/authenticated success: POST/PATCH/DELETE passed.
- Authenticated no-scope: live `POST/PATCH -> 403`, mutation отсутствует — passed после remediation.
- Foreign tenant: live `PATCH -> 400`, foreign row не изменён — passed после remediation.
- Public write exceptions: none.

## Повторный gate

Для завершения пользователю нужно открыть/подключить browser session с доступом к `http://localhost:3001`, авторизоваться в CMS и сообщить Router, что браузер готов. Затем Quality Gate выполнит design Manual QA 1.88 на viewport 1440×900, 768×1024 и 390×844, проверит cookie/service-key Network projections и обновит evidence.

До этого открыты 1.88, 2.8 и 2.14; sync/archive 2.15–2.16 не выполнялись и невозможны до успешного повторного gate.
