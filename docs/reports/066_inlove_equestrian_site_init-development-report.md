# Development Report: 066 — inlove-equestrian-site-init

**Статус:** `APPROVED`
**Дата:** `2026-09-08`
**Рекомендуемая ветка:** `066-inlove-equestrian-site-init`

## Ссылки и approval

- Задача: [`docs/tasks/066_inlove_equestrian_site_init.md`](../tasks/066_inlove_equestrian_site_init.md)
- OpenSpec change: [`openspec/changes/inlove-equestrian-site-init`](../../openspec/changes/inlove-equestrian-site-init/)
- Proposal: [`proposal.md`](../../openspec/changes/inlove-equestrian-site-init/proposal.md)
- Design: [`design.md`](../../openspec/changes/inlove-equestrian-site-init/design.md)
- Delta specs: [`inlove-site-skeleton`](../../openspec/changes/inlove-equestrian-site-init/specs/inlove-site-skeleton/spec.md), [`site-consumer-contracts`](../../openspec/changes/inlove-equestrian-site-init/specs/site-consumer-contracts/spec.md)
- Tasks: [`tasks.md`](../../openspec/changes/inlove-equestrian-site-init/tasks.md)
- Approval: пользователь явно подтвердил apply командой `Apply` после согласования открытых решений.

## Итоговый вердикт

`APPROVED`. Повторный `QG-FE-R1` подтвердил исправление tenant selector и успешный обязательный frontend gate. `QG-CONTRACTS-R2` подтвердил закрытие последнего blocking finding: targeted suite проверяет точные method/path/query всех 16 retained Public Read GET wrappers, включая семь detail routes; targeted 16/16, полный набор 43/43, TypeScript и strict OpenSpec validation прошли. Остаточных findings нет; traceability specs → test matrix → tasks → diff подтверждена. Change готов к `OPS-SYNC`, затем к archive после повторной strict validation.

## Краткий контекст изменений

Создан нейтральный Next.js-каркас `services/site-ksk-inlove` на базе tracked baseline `site-ad`: сохранены API/types, callback и site-settings integration, observability и technical shell; удалены контент, UI, analytics, webmaster/SEO artifacts и брендовые assets. Deployment trees скопированы без редактирования и помечены как запрещённые к deploy до отдельного change. `SERVICES.md` дополнен новым public consumer; `services.manifest` и исходный `site-ad` не изменены.

## Сводка lanes

| Lane | Статус | Evidence |
| --- | --- | --- |
| `QG-BE` | неприменимо | Python/backend diff отсутствует |
| `QG-FE-R1` | пройден | 27/27 tests на момент lane; `npm run build` (включая lint) прошёл; отдельные lint и `tsc --noEmit` прошли; selector precedence исправлен и покрыт regression tests; runtime/hash evidence остаётся актуальным, production scope после lane не менялся |
| `QG-CONTRACTS-R2` | пройден | targeted wrapper suite 16/16, полный набор 43/43, `tsc --noEmit` и strict validation прошли; access matrix содержит 16 GET + единственный callback POST exception, execution-unit traceability подтверждена |
| `QG-LIVE` | неприменимо | runtime API diff отсутствует; PostgreSQL/NATS smoke не требуется |

## Изменённые файлы

| Зона | Что изменено |
| --- | --- |
| `services/site-ksk-inlove/*` | package/toolchain, env/config, Docker и документация нового сайта |
| `services/site-ksk-inlove/.helm/**`, `.github/**` | неизменённые deployment-заготовки `site-ad` |
| `services/site-ksk-inlove/src/**` | retained API/types/services/hooks/observability, minimal App Router shell и тесты |
| `SERVICES.md` | каталог нового public site consumer |
| `openspec/changes/inlove-equestrian-site-init/**` | утверждённые proposal/design/specs/tasks и execution status |

## Frontend test gate

| Проверка | Результат |
| --- | --- |
| `npm test` | passed: 27/27 в `QG-FE-R1`; после добавления contract tests полный набор passed: 43/43 в `QG-CONTRACTS-R2` |
| `npm run lint` | passed |
| `npx tsc --noEmit` | passed |
| `npm run build` | passed; встроенный lint также passed |
| Source/brand/security static checks | passed; selector caller override устранён |
| Runtime `/` | passed: стандартный `404`, custom content route отсутствует |
| Immutable hashes / source isolation | passed |

Тесты покрывают API client, все retained Public Read wrappers, callback exception, site-settings provider/hook и observability без live backend. Обязательный frontend gate пройден полностью. После `IL-SC-FIX-3` targeted suite напрямую вызывает все 16 collection/detail wrappers и подтверждает их method/path/query; production scope не изменился.

## Трассировка test matrix

| IDs | Evidence | Статус |
| --- | --- | --- |
| `UT-IL-01` | `src/api/publicReadWrappers.test.ts`: parameterized API-boundary checks всех 16 retained GET wrappers, включая семь detail routes; targeted 16/16, полный набор 43/43 | покрыто |
| `UT-IL-02..UT-IL-06` | API client/callback/site-settings tests; повторный lane подтвердил 27/27 tests, включая selector precedence regression | покрыто |
| `ST-IL-01..ST-IL-03` | brand/analytics/webmaster и удалённый UI/content inventory | покрыто |
| `ST-IL-04..ST-IL-06` | immutable hash equality, Git/local boundary, CMS auth/write scan; selector override regression passed | покрыто |
| `BLD-IL-01` | 27/27 tests, lint, typecheck и production build прошли | покрыто |
| `REN-IL-01` | production runtime `/` → стандартный `404`; HTML/Network sanity passed | покрыто |
| `REG-IL-01` | `services/site-ad` source isolation passed | покрыто |

Непокрытых ID нет. Все ID `UT-IL-01..06`, `ST-IL-01..06`, `BLD-IL-01`, `REN-IL-01` и `REG-IL-01` трассируются на фактические tests/checks; неприменимые backend/live оси явно обоснованы отсутствием runtime API diff.

## Access verification results

- Anonymous Public Read и отсутствие CMS cookie/token подтверждены существующими тестами и static review.
- Caller больше не может переопределить либо удалить обязательный `X-Equestrian-Service-Key`; configured selector precedence и missing-selector поведение покрыты regression tests.
- Обновлённая access matrix содержит 16 retained GET routes и единственное write-исключение; expected outcomes для selector/auth задокументированы.
- Protected CMS writes в consumer отсутствуют.
- Единственное разрешённое write-исключение сохраняется без расширения: public anonymous `POST /api/callback_requests` с обязательным tenant selector, без CMS auth; ожидаются `2xx` для валидного запроса, `400` для malformed/invalid payload и `401` для missing/invalid selector.
- Backend endpoints не менялись; authenticated/protected live checks неприменимы этому change.

## Findings и закрытые bounded rework units

Исходные units `IL-SC-FIX-1`, `IL-SC-FIX-2` и `PLAN-FIX-1` закрыты повторными lanes: selector precedence исправлен, lint проходит, 16 GET + callback отражены в access matrix, а фактическое разбиение `IL-SC-2a..2e` трассируется через design/tasks.

`IL-SC-FIX-3` закрыт без изменения production scope: добавлен `src/api/publicReadWrappers.test.ts`, targeted suite прошёл 16/16, полный набор — 43/43. Повторный `QG-CONTRACTS-R2` подтвердил соответствие access matrix и отсутствие новых findings. Все ранее зафиксированные findings закрыты; активных rework units нет.

## Rework DAG и повторный Quality Gate

```text
IL-SC-FIX-1 ─┬→ QG-FE-R1 (PASS) ─────────┐
             └→ QG-CONTRACTS-R1 ─────────┤
IL-SC-FIX-2 ───→ QG-FE-R1 (PASS)         ├→ QG-SYNTH-R1 (REWORK)
PLAN-FIX-1 ─────→ QG-CONTRACTS-R1 ───────┘

IL-SC-FIX-3 → QG-CONTRACTS-R2 (PASS) → QG-SYNTH-R2 (APPROVED)
```

Quality Gate завершён. `QG-FE-R1` и `QG-CONTRACTS-R2` пройдены; `QG-BE` и `QG-LIVE` остаются неприменимыми. Change готов к `OPS-SYNC`; archive разрешён только после успешного sync и повторной strict validation.

## SMOKE-тесты

Неприменимо: change не содержит runtime API diff и не меняет PostgreSQL/NATS взаимодействие; endpoint timings не требуются.
