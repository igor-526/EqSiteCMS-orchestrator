# Review: 073_inlove_site_settings

**Статус: ✅ APPROVED**

**Дата:** 2026-09-11

**Рекомендуемая ветка:** `feature/073-inlove-site-settings` (текущая рабочая ветка `main`; создать ветку до commit)

## Ссылки и approval

- Исходная задача: [`docs/tasks/073_inlove_site_settings.md`](../tasks/073_inlove_site_settings.md)
- OpenSpec change: [`openspec/changes/inlove-site-settings-073/`](../../openspec/changes/inlove-site-settings-073/)
- Proposal: [`proposal.md`](../../openspec/changes/inlove-site-settings-073/proposal.md)
- Design и test matrix: [`design.md`](../../openspec/changes/inlove-site-settings-073/design.md)
- Delta specs: [`specs/`](../../openspec/changes/inlove-site-settings-073/specs/)
- Tasks: [`tasks.md`](../../openspec/changes/inlove-site-settings-073/tasks.md)
- Apply approval: пользователь явно подтвердил командой `Apply`; реализация и Quality Gate выполнены после approval.

## Итог

Site Consumer переведён на curated site-settings allowlist, единый основной телефон, четыре about-поля и профильные Public Read API для трёх услуг. Unbounded settings-запросы home/horses/news заменены selected-key loaders. Локально и tenant-scoped созданы три exact service groups и сокращён inventory `inlove` до 16 разрешённых keys; операции идемпотентны, rollback проверен. Перенос таблицы во внешнюю среду в change не входил.

Все применимые lanes завершены, test matrix `UT-073-01..08` и `SM-073-01..05` покрыта, незакрытых findings нет. Ранние findings QG-FE и QG-CONTRACTS были возвращены владельцу bounded remediation units; повторные `QG-FE-R2` и `QG-CONTRACTS-R3` завершились без замечаний.

## Lanes

| Lane | Статус | Evidence |
|---|---|---|
| `QG-BE` | неприменимо | Runtime/Python backend change в scope отсутствует; два SQL data-script и DB evidence проверены как tenant-scoped, транзакционные и идемпотентные. Посторонний backend worktree diff не относится к change. |
| `QG-FE-R2` | пройден | `315/315` Vitest, lint, TypeScript и production build прошли; browser QA desktop/mobile прошёл, Chrome console: 0 errors; privacy main landmark: 1. Все предыдущие findings устранены. |
| `QG-CONTRACTS-R3` | пройден | Diff соответствует четырём delta specs, allowlist, ownership, access matrix, exact-group contract и DB scope; strict validation прошла. Все предыдущие findings устранены. |
| `QG-LIVE` | пройден | `SM-073-01..05` PASS на локальной PostgreSQL/API/SSR; valid/missing/invalid selector и итоговый inventory подтверждены; внешних подключений не было. |

## Покрытие по test matrix

| ID | Фактическое покрытие | Статус |
|---|---|---|
| `UT-073-01` | `getSiteSettings.test.ts`, `contentPages/services/loaders.test.ts`: curated allowlist и запрет legacy consumers | покрыто |
| `UT-073-02` | `getSiteSettings.test.ts`, `SiteSettingsProvider.test.tsx`: primary phone, empty/error degradation | покрыто |
| `UT-073-03` | `AboutContent.test.tsx`, `app/about/page.test.tsx`: полные/неполные about pairs и атомарные контакты | покрыто |
| `UT-073-04` | `serviceGroups.test.ts`: exact group identity, missing/renamed/duplicate outcomes | покрыто |
| `UT-073-05` | service loaders/pages/content tests: Public Read DTO, empty/error/404, SSR и metadata | покрыто |
| `UT-073-06` | `loaders.test.ts`: exact selected keys для home/about/home-horses-news, без `limit=1000` | покрыто |
| `UT-073-07` | `api/client.test.ts`, `publicReadWrappers.test.ts`: anonymous selector boundary без cookie | покрыто |
| `UT-073-08` | существующий `services/backend/tests/unit/api/test_site_settings_access.py`: anonymous/no-scope write denial | покрыто; runtime backend не менялся |
| `SM-073-01` | DB-1a: два повторных script run, exact 3-row fingerprint и неизменность других tenants | выполнено |
| `SM-073-02` | exact group API: valid `200`, missing/invalid selector `401` | выполнено |
| `SM-073-03` | DB-1b: 16-row allowlist, second-run no-op, rollback hash и other-tenant counts | выполнено |
| `SM-073-04` | selected-key site settings: valid `200` с 16/16 keys, missing/invalid `401` | выполнено |
| `SM-073-05` | service/price list+detail, пять SSR routes и Chrome browser outcome | выполнено |

Непокрытые ID: нет. HTTP-write concurrency неприменима: runtime write API не менялся и data correction выполнялась прямым локальным SQL. Dependency outage покрыт consumer error-path tests.

## Изменённые файлы

| Зона | Что изменено |
|---|---|
| `services/site-ksk-inlove/src/app/**` | SSR pages, metadata, privacy route и route regressions |
| `services/site-ksk-inlove/src/features/siteSettings/**` | typed curated config, selected-key adapter, phone/policy behavior и tests |
| `services/site-ksk-inlove/src/features/contentPages/**` | about/contact composition, exact service-group loaders, service pages и tests |
| `services/site-ksk-inlove/src/features/siteChrome/**`, `src/ui/sections/**` | shared phone/contact rendering и tests |
| `docs/sites/inlove/{scheme.md,components.md}` | актуальные источники данных, allowlist и consumer contracts |
| `services/backend/maintain/{ensure_inlove_horse_service_groups.sql,curate_inlove_site_settings.sql}` | локальные tenant-scoped идемпотентные data operations |
| `openspec/changes/inlove-site-settings-073/{db-1a-evidence.md,db-1b-evidence.md}` | sanitized PostgreSQL/API evidence и rollback fingerprints |

## Unit / integration test gate

| Команда | Результат |
|---|---|
| `npm test` (`services/site-ksk-inlove`) | PASS — 315/315 tests |
| `npm run lint` | PASS — 0 errors |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |

QG-BE unit suite неприменима к change: Python runtime code не менялся. SQL/data behavior проверено реальной локальной PostgreSQL в `SM-073-01/03`.

## Frontend test gate

Затронут публичный `services/site-ksk-inlove`, не CMS `services/frontend`. Обязательная эквивалентная группа команд consumer прошла полностью. Tests покрывают success, missing/empty, error, exact-match, legacy-regression и SSR/metadata paths; они не требуют live backend. Self-check подтвердил, что fetch остаётся в API/loader boundary, CMS и Site Consumer contours не смешаны, unbounded `limit=1000` для затронутых settings consumers отсутствует. Browser QA desktop/mobile для `/`, `/about`, `/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy` прошёл; console errors — 0, privacy page содержит один `main` landmark.

## SMOKE-тесты

| ID | Endpoint / проверка | HTTP | Time | Результат |
|---|---|---|---|---|
| `SM-073-01` | PostgreSQL exact groups + idempotency + other-tenant fingerprint | n/a | n/a (read-only SQL) | PASS |
| `SM-073-02` | `GET /api/horses/services?name=<exact>` с valid selector | 200 | 53–69 ms | PASS — три exact groups |
| `SM-073-02` | тот же Public Read, missing / invalid selector | 401 / 401 | 5 / 57 ms | PASS |
| `SM-073-03` | PostgreSQL 16-key inventory + idempotency + rollback rehearsal | n/a | n/a (read-only SQL) | PASS |
| `SM-073-04` | selected-key `GET /api/site_settings`, valid selector | 200 | 65 ms | PASS — 16/16 keys |
| `SM-073-04` | тот же Public Read, missing / invalid selector | 401 / 401 | 6 / 60 ms | PASS |
| `SM-073-05` | anonymous service/price list GET | 200 | 67–82 ms | PASS |
| `SM-073-05` | 14 anonymous service/price detail GET | 200 | 54–74 ms | PASS — 3 service + 11 price profiles |
| `SM-073-05` | SSR `/`, `/about`, три service routes | 200 | 126–206 ms | PASS — 5/5, Chrome console 0 errors |

Итог SMOKE: `5/5` matrix scenarios выполнены.

## Access verification results

- Public Read: anonymous GET с selector `inlove` вернул `200`; site settings строго tenant-scoped и содержат 16/16 разрешённых keys; exact service groups и все используемые service/price profiles доступны без CMS credentials.
- Selector boundary: missing и invalid selector возвращают `401` для проверенных Public Read endpoints.
- Protected Write: новые write endpoints и изменения runtime access logic отсутствуют. Существующий `UT-073-08` подтверждает `403` без требуемого scope и отсутствие вызова mutation service; default `401/403` contract не изменён.
- Исключения access matrix: отсутствуют. Data correction выполнена напрямую только в локальной PostgreSQL и не создаёт public-write исключений.

## Findings и remediation history

Первичные статические lanes обнаружили ограниченные consumer/contract несоответствия. Они были разделены на bounded rework units: selected-key boundary и связанные regressions были доведены в Site Consumer, документация/test-matrix/ownership evidence приведены к фактическому состоянию. Повторные lanes `QG-FE-R2` и `QG-CONTRACTS-R3` — clean. `QG-LIVE` findings не обнаружил. Незакрытых замечаний и рисков для scope change нет.

## Вердикт

**APPROVED.** `OPS-SYNC` и независимая post-sync strict validation завершены; change готов к последующему архивированию. Перенос таблицы остаётся отдельной будущей задачей.

## Post-sync validation (`OPS-VALIDATE`)

Проверка выполнена `2026-09-11T23:57:25+08:00` после синхронизации delta specs, без изменения specs, runtime-кода или данных.

| Проверка | Результат |
|---|---|
| `openspec validate inlove-site-settings-073 --type change --strict --no-interactive` | PASS — `Change 'inlove-site-settings-073' is valid` |
| `openspec validate --all --strict --no-interactive` | PASS — `73 passed, 0 failed (73 items)` |
| `openspec status --change inlove-site-settings-073 --json` | PASS — `isComplete: true`; proposal/design/specs/tasks: `done` |
| Delta → main requirement spot comparison | 13 requirement-блоков проверены: 12/13 совпадают дословно и однократно; в `inlove-site-shell` scenario `Shared settings доступны при SSR` main spec содержит `shared settings` вместо `разрешённые shared settings`. Нормативный текст того же requirement по-прежнему требует получать только разрешённые настройки; отдельный requirement `Существующая матрица доступа сохраняется` совпадает дословно. Потери access contract не обнаружено. |
| `git diff --check -- docs/reports/073_inlove_site_settings.md openspec/changes/inlove-site-settings-073/tasks.md` | PASS — whitespace errors отсутствуют до фиксации evidence |

Архивирование в `OPS-VALIDATE` не выполнялось.
