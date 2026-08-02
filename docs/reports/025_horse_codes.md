# Quality Gate: 025 horse codes

**Статус: ✅ APPROVED**  
**Дата:** 2026-08-02  
**OpenSpec:** `openspec/changes/horse-codes`  
**Approval apply:** подтверждён пользователем

## Итог

Повторный единый Quality Gate пройден. Совокупный backend/frontend diff соответствует proposal, design, delta specs и access matrix. Первичные findings по backend unit quality и browser Manual QA устранены и независимо перепроверены. Blocking findings отсутствуют; change готов к lifecycle handoff Router: sync delta specs, strict validation main specs, затем archive.

Runtime-код Quality Gate не менял. Task 3.19 оставлен Router.

## Артефакты и ownership

- Входная задача: `docs/tasks/025_horse_codes.md`.
- OpenSpec: `openspec/changes/horse-codes/{proposal.md,design.md,specs/**,tasks.md}`.
- Backend owner: только `services/backend/**`; Frontend owner: только `services/frontend/**`.
- `services/site-ad`: working tree чист, diff отсутствует. Consumer runtime regression проверен browser QA.
- NATS/AsyncAPI diff отсутствует; asyncapi validation неприменима.
- Рекомендуемая ветка: текущая feature branch change `horse-codes`.

## Реализация и архитектура

- Migration `4c8f9a2d6e10_add_horse_code.py`: `VARCHAR(31) NULL`, без default, unique, index и backfill; downgrade удаляет только колонку. Design фиксирует data-loss note и backup/export перед production downgrade.
- Фактическая PostgreSQL schema: `character varying | 31 | YES | no default`; compose discovery подтверждает `eqsitecms-db`, `postgres:16`, service label `db`, host port `5433`, aliases `eqsitecms-db/db`.
- Model/entity/create-update DTO/OutDto/service/repository проводят `code` без trim/normalization.
- PATCH использует `model_dump(exclude_unset=True)`: omitted сохраняет значение, explicit `null` очищает.
- Full horse responses подтверждены для list/detail UUID/detail slug/root pedigree/sire/dam/foal/candidate/photos.
- API routing/DI/Protocol boundaries соблюдены; бизнес-логика, SQL и transaction management в API не добавлены.

## Backend test gate

| Команда | Результат |
|---|---|
| `make format` | 140 src и 30 test files unchanged |
| `make test` | 739 passed, 5 skipped, 0 failed |
| `make lint` | mypy: 140 files clean; flake8/ruff clean |
| `git -C services/backend diff --check` | clean |

Feature matrix теперь содержит 56+ horse-code cases: базовые entity/DTO/column проверки и focused tests в `test_horse_code_layers.py`, `test_horse_code_access.py`, `test_horse_repository.py`. Review подтвердил:

- create `value/null/empty`, invalid-before-mutation;
- update code-only/explicit-null/omitted с сохранением других полей;
- AsyncMock repository interaction и tenant-scoped lookup;
- repository insert/update SQL, full-info mapping, `limit/offset`;
- UUID/slug detail, root/sire/dam/foal/candidate/photos serialization;
- anonymous POST/PATCH `401`, no-scope `403`, cross-tenant no mutation.

Тесты проверяют behavior diff, а не только количество или snapshots.

## Access verification results

| Контракт | Результат |
|---|---|
| Anonymous GET + valid tenant key | `200`, horse items содержат `code` |
| Anonymous GET без key | `400` |
| Anonymous GET с unknown key | `404` |
| Authenticated GET | `200`, tenant пользователя |
| Anonymous POST/PATCH | `401`, mutation не выполняется |
| Authenticated allowed roles | `200` по live smoke/browser evidence |
| Authenticated no-scope | `403`, mutation не выполняется |
| Cross-tenant PATCH | `400`, foreign record unchanged |

Исключений из Public Read / Protected Write нет. Повторные live probes: login `200` (25.693 ms), `/api/auth/me` `200` (32.707 ms), public list `200` (27.103 ms), missing key `400` (2.340 ms), unknown key `404` (21.078 ms), authenticated list `200` (27.629 ms), anonymous POST `401` (2.190 ms), anonymous PATCH `401` (1.862 ms).

## Live API smoke

Перед повторной проверкой прочитан `.claude/skills/api-smoke-test/SKILL.md`. Cookie auth использован для protected flow; Public Read выполнялся без cookie. API: `http://localhost:8001`; database — реальная PostgreSQL, не SQLite/mock/in-memory.

Полный artifact `/tmp/horse-smoke-results.json` повторно проверен: ровно SM-01..SM-40, допустимые contract statuses, положительный timing каждого запроса. Source evidence: `services/backend/docs/evidence/horse_codes_smoke.md`. Итог: **40/40 passed**.

| IDs | Endpoint family | HTTP | Time range |
|---|---|---|---|
| SM-01..06 | GET list | 200 | 25.858–59.974 ms |
| SM-07..08 | GET tenant errors | 400/404 | 5.001–31.051 ms |
| SM-09..18 | GET detail/pedigree/candidates | 200/400 | 1.805–54.853 ms |
| SM-19..26 | POST semantics/access | 200/400/401/403 | 1.385–53.220 ms |
| SM-27..35 | PATCH semantics/access/tenant | 200/400/401/403 | 1.310–76.681 ms |
| SM-36..39 | response consistency/photos/restart | 200 | 23.412–30.646 ms |
| SM-40 | protected cleanup | 204 | 267.318 ms |

Все fixtures удалены; pytest smoke files отсутствуют; credentials/cookies/service keys в report не раскрыты.

## Frontend test gate

| Команда | Результат |
|---|---|
| `npm test` | 35 files, 289 passed, 0 failed |
| `npm run lint` | 0 errors, 392 non-blocking existing warnings, exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | Next.js production build successful; `/horses` generated |
| `git -C services/frontend diff --check` | clean |

Automated coverage подтверждает DTO/validator/API boundary exact/null/empty/Unicode/31/32, `400/401/403/500`, mocks/MSW без live backend, table data/null/loading/empty/error, modal open/edit/create/clear/error/double-submit, scope present/missing и pagination `limit/offset` reset behavior.

Mandatory self-checks выполнены и классифицированы:

- runtime fetch остаётся в `src/api`; остальные совпадения — developer-documentation examples;
- horse API import проходит через `features/horses/services/horseService.ts`; новых imports из page/UI нет;
- horse runtime pagination остаётся `limit/offset`, page-based params не добавлены;
- `site-*`/Public Read consumer mixing и новые legacy `shared/widgets/entities` directories отсутствуют;
- в затронутом diff нет `response.status === "ok"`, новых block-bodied inline JSX handlers или static inline styles.

## Browser Manual QA

Evidence: `services/frontend/docs/qa/horse-codes-manual.md`, raw `horse-codes-artifacts/browser-results.json`, 13 PNG screenshots.

**17/17 PASS.** Проверены anonymous redirect; authenticated table; null/exact code; desktop 1440, tablet 900, mobile 390; create/31-char/update/clear; controlled validation/network/401/403; no-scope UI; roles SUPERUSER/ADMIN/DEVELOPER; pagination/page-size/filter reset; loading/empty/error/retry; focus/Tab/Esc; pedigree/photos; unchanged site-ad consumer.

Raw Network evidence содержит sanitized method/path/status/request/response. Выборочно визуально перепроверены mobile table, modal при `403` и site-ad screenshot. PNG dimensions соответствуют заявленным viewports. SQL cleanup подтверждает `QG025-* horses = 0`, temporary `qg025_noscope users = 0`.

## OpenSpec validation и verdict

- `openspec validate horse-codes --type change --strict`: `Change 'horse-codes' is valid`.
- Tasks 1.*, 2.*, 3.1–3.18 выполнены.
- Task 3.19 не отмечен: sync/validation/archive выполняет Router после этого положительного gate.

**Verdict: ✅ APPROVED — готово к sync delta specs и archive workflow.**
