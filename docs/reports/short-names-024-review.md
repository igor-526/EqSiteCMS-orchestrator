# Review: short-names-024

**Статус: ✅ APPROVED**  
**Дата:** 2026-08-02

## Итог

Совокупный backend/frontend diff соответствует утверждённым query/UI contracts. После первого REWORK оба blocking findings устранены и повторно проверены: Manual QA выполнен на трёх viewport, найденный double-submit исправлен и покрыт regression tests; access fixtures подтвердили scope-missing `403` и foreign-tenant isolation без mutation. Автоматические gates, live API/PostgreSQL smoke и strict validation зелёные. Tasks 1.81, 1.85 и 1.90 завершены.

## Контекст и ownership

- OpenSpec: `openspec/changes/short-names-024/{proposal.md,design.md,specs/**,tasks.md}`; пользовательский approval получен.
- Исходная задача: `docs/tasks/024_short_names.md`.
- Backend ownership соблюдён: route → service → Protocol → repository; SQL/regex остаются в repository, tenant predicate сохранён. Изменений миграций/NATS нет.
- Frontend ownership соблюдён: DTO/API boundary → services/hooks → feature UI; новых FSD legacy directories и consumer imports нет.
- `services/site-ad`: diff отсутствует.
- Рекомендуемая ветка: текущая change branch после закрытия blockers и повторного общего Quality Gate.

## Findings и remediation

1. **[RESOLVED][HIGH][Frontend] Manual QA и double-submit.**
   - Chromium/live API QA выполнен на desktop `1440×900`, tablet `768×1024`, mobile `390×844`; screenshots находятся в `docs/reports/assets/short-names-024/`.
   - Проверены anonymous redirect, authenticated UI, обе вкладки, query/sort/pagination reset, create/update/empty/63/64, permission UI и responsive horizontal scroll.
   - Первый live прогон обнаружил две POST-мутации при double-click. В обе модалки добавлены синхронный `submitGuard` и loading; повторный live прогон дал один POST.
   - Два regression tests независимо прошли в общем suite. QG проверил общий guard path для create/update и обеих модалок.

2. **[RESOLVED][HIGH][Backend] Scope-missing и foreign tenant fixtures.**
   - Limited authenticated user с `scopes=[]`: breed POST и PATCH вернули `403`; до/после PostgreSQL probes подтвердили отсутствие mutation.
   - `SUPERUSER` tenant A против breed/coat rows tenant B: оба PATCH вернули `400`, обе foreign rows остались неизменны.
   - Coat-color не имеет отдельного scope requirement по утверждённой matrix; для него подтверждены authentication и foreign-tenant isolation.
   - Повторный cleanup probe QG: temporary users `0`, tenants `0`, breeds `0`, coat colors `0`.

## Backend checks

- `make test`: **687 passed, 5 skipped, 0 failed** (692 collected; существенно больше требуемых 30 Unit scenarios).
- `make lint`: mypy 139 files clean; flake8/ruff clean.
- `uv run isort --check-only src tests`: clean.
- `uv run black --check src tests`: 166 files unchanged.
- `git diff --check`: clean.
- Architecture review: бизнес-логики/SQL в API нет; services зависят от Protocol; repository использует escaped PostgreSQL `~*`; tenant predicate, OR semantics, sort allowlist, count без pagination подтверждены кодом/tests.
- `src/main.py` меняет validation mapping только для query `sort`, что обеспечивает утверждённый `422` invalid-sort contract; unit/live smoke подтверждают.

## Docker/PostgreSQL evidence

- Discovery по compose labels: `eqsitecms-db`, container `0905da513e53`, service `db`, image `postgres:16`.
- Актуальный `docker inspect`: DB `eqsitecms`, user `eqsitecms`, container port `5432`, discovered host port `5433`.
- Значения получены runtime discovery/inspect; smoke использовал API `http://localhost:8001`, DB hardcode в runtime diff не добавлен.
- PostgreSQL schema: `breeds.short_name` и `coat_color.short_name` — `NOT NULL`.
- Smoke cleanup: `qg-short-name-breed=0`, `qg-short-name-color=0` rows после DELETE.

## Live SMOKE

Cookie login выполнен через `/api/auth/login`; Public Read запросы выполнялись без cookie с `X-Equestrian-Service-Key`, protected writes — отдельно без cookie и с cookie. **34/34 passed**. Время — wall time curl.

| ID | Scenario | HTTP | Time |
|---|---|---:|---:|
| SM01 | login su | 200 | 24.952 ms |
| SM02 | auth/me | 200 | 27.574 ms |
| SM03–SM05 | breeds public/base/no-context/pagination | 200/400/200 | 25.705/2.138/27.147 ms |
| SM06–SM08 | breeds lower/upper/no-match filter | 200/200/200 | 22.223/21.135/20.247 ms |
| SM09–SM12 | breeds asc/desc/invalid/paginated filter | 200/200/422/200 | 22.899/23.053/20.592/44.956 ms |
| SM13–SM15 | coat colors public/base/no-context/pagination | 200/400/200 | 22.448/1.545/28.504 ms |
| SM16–SM18 | coat lower/upper/no-match filter | 200/200/200 | 21.262/21.341/21.072 ms |
| SM19–SM22 | coat asc/desc/invalid/paginated filter | 200/200/422/200 | 21.553/22.103/20.264/22.911 ms |
| SM23–SM24 | anonymous breed/coat POST | 401/401 | 1.638/1.617 ms |
| SM25–SM27 | breed auth create/read/PATCH | 200/200/200 | 26.829/21.702/25.843 ms |
| SM28–SM30 | coat auth create/read/PATCH | 200/200/200 | 25.446/28.592/47.186 ms |
| SM31–SM32 | authenticated cleanup DELETE | 204/204 | 26.430/26.329 ms |
| SM33–SM34 | post-cleanup empty reads | 200/200 | 40.100/21.482 ms |

## Frontend test gate

- `npm test` после remediation: **35 files, 270 passed, 0 failed**; jsdom/MSW, без live backend calls.
- `npm run lint`: exit 0, **0 errors**, 389 pre-existing warnings.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; `/horses` bundle generated.
- Behavior matrix: `short_name` DTO/query/body, data/loading/empty/error, search apply/clear, asc/desc/clear sort, `limit/offset`, reset offset, page/page-size, modal create/update/empty/63/64, validation/backend errors/refresh, anonymous/authenticated/scopes/401/403 покрыты automated suites.
- Self-check: runtime fetch остаётся в API/auth boundary; найденные UI matches — documentation snippets. API imports в horse UI не добавлены. `limit/offset` contract сохранён. `site-*` mixing и новые `shared/widgets/entities` отсутствуют.

## Access verification results

- Public breeds/coat GET: anonymous + tenant key → `200`; no tenant context → `400`.
- Protected breed/coat POST: no cookie → `401`, DB rows не созданы.
- Protected create/PATCH with `SUPERUSER`: `200`, explicit `short_name` сохранён; cleanup подтверждён.
- Invalid sort: `422` для обоих endpoints.
- Scope missing: limited user `scopes=[]`, breed POST/PATCH → `403`, без mutation.
- Foreign tenant: breed/coat PATCH → `400`, чужие строки неизменны.
- Исключений из Public Read/Protected Write policy нет.

## OpenSpec validation

- `openspec validate short-names-024 --strict`: `Change 'short-names-024' is valid`.

## Повторный Quality Gate

Повторный полный review завершён успешно. Blocking findings отсутствуют; change готов к Router workflow sync/strict validation/archive.

## Backend remediation evidence: access fixtures

**Дата повторной проверки:** 2026-08-02. Backend owner предоставил fixture evidence для finding 2; повторный общий Quality Gate выше подтвердил evidence и закрыл task 1.85.

- PostgreSQL повторно найден runtime discovery по compose labels (`project=eqsitecms`, `service=db`) с fallback по image; container `0905da513e53`, image `postgres:16`.
- `docker inspect` непосредственно перед прогоном вернул DB `eqsitecms`, user `eqsitecms`, container port `5432`, host port `5433`. Имена контейнера/DB и порт не использовались как hardcode в fixture flow.
- В PostgreSQL временно создан пользователь `qg024_limited_1785667054` в основном tenant. Для совместимости с тестовыми credentials использован password hash существующего `dev`, но записи в `user_scopes_relations` не создавались. Login вернул `200`, `/api/auth/me` подтвердил `scopes=[]`.
- Временно создан второй tenant `46f66a29-bf70-4a7d-88b7-3559b3855c64` с отдельным service key, foreign breed и foreign coat-color. Также создана одна main-tenant breed fixture для scope-denied PATCH.

| Проверка | Principal/context | HTTP | PostgreSQL до | PostgreSQL после | Результат |
|---|---|---:|---|---|---|
| Breed POST без допустимого scope | authenticated limited user, main tenant | `403` | rows `0` | rows `0` | mutation отсутствует |
| Breed PATCH без допустимого scope | authenticated limited user, main tenant | `403` | `QGMAIN` | `QGMAIN` | значение неизменно |
| Foreign breed PATCH | `SUPERUSER` tenant A, row tenant B | `400` | `QGFOREIGN-B` | `QGFOREIGN-B` | tenant isolation подтверждён |
| Foreign coat-color PATCH | `SUPERUSER` tenant A, row tenant B | `400` | `QGFOREIGN-C` | `QGFOREIGN-C` | tenant isolation подтверждён |

Coat-color write не имеет отдельного scope requirement по утверждённой Access matrix, поэтому scope-missing `403` применим к breeds; для coat colors проверяется authentication и foreign-tenant isolation.

После проверок удалены limited user (включая каскадные tokens/relations), main fixture и второй tenant с обеими foreign rows. Итоговый SQL cleanup probe по user, tenant, breeds и coat_color: `remaining=0`.
