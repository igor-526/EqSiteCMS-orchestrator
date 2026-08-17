# Review: breeds-group-048

**Статус: ❌ REWORK**  
**Дата:** 2026-08-17

## Итог

Backend rework принят: root format/test/lint, архитектура, unit coverage, frontend gates и независимый live SM-01..SM-38 теперь зелёные. Совокупный diff всё ещё имеет один внешний блокер: browser Manual QA 3.11/4.20 не имеет desktop/tablet/mobile/Network evidence, потому что browser runtime не предоставляет ни одного браузера.

Последующий frontend runtime rework также принят: бесконечный render/update cycle устранён стабильными reset callback references, regression coverage добавлен и полный frontend gate повторно зелёный.

OpenSpec: `openspec/changes/breeds-group-048/{proposal.md,design.md,specs/**,tasks.md}`; apply approval дан пользователем. Исходная задача: `docs/tasks/048_breeds_group.md`.

## Findings

1. **[BLOCKER][Manual QA]** OpenSpec 3.11/4.20 — desktop 1440×900, tablet 768×1024, mobile 390×844, permission/error/page refresh и Network evidence отсутствуют. Повторный browser skill bootstrap вернул `No browser is available`; после обязательного `bootstrap-troubleshooting` вызов `agent.browsers.list()` вернул `[]`. Требуемое внешнее действие: пользователь должен открыть/подключить in-app Browser либо установить и подключить ChatGPT browser extension через **Settings → Computer use**, затем запросить повторный Quality Gate. Пункты 3.11/4.20 не отмечены выполненными. Owner: Frontend/Router.

## Architecture and access review

- Backend layering соответствует `api -> depends -> core.services -> protocols/repositories`; router группы содержит HTTP orchestration, SQL остаётся в repositories; DI обоих repositories использует request-scoped `get_session`.
- Migration содержит tenant constraints/indexes, nullable `breeds.breed_group_id` и `ON DELETE SET NULL`; NATS/AsyncAPI и `site-*` не затронуты.
- Routes: group GET используют `get_read_equestrian_context`; POST/PATCH/DELETE используют current user + protected context. Live checks: missing selector 401, invalid selector 401, valid selector anonymous GET 200, cookie GET 200, anonymous POST 401.
- Frontend API calls для change идут через `src/api` + feature services; прямых new live calls в components нет. `site-*` mixing не найден. Прямые `fetch` matches относятся к существующим API/client/auth либо documentation snippets.

## Frontend runtime rework review

- `resetHorseBreedGroupsFilters` и `resetHorseBreedGroupsValidation` обёрнуты в `useCallback(..., [])`; их identity не меняется при render/state updates. Effect открытой modal, зависящий от `onResetValidation`, больше не запускается на каждом render и не создаёт `maximum update depth` storm.
- `setHorseBreedGroupsFilters` использует functional `setFiltersState(prev => ...)`, поэтому callback стабилен и не захватывает stale filters.
- `loadHorseBreedGroups` корректно зависит от `horseBreedGroupsFilters` и стабильного notification API; mutations зависят от актуального `loadHorseBreedGroups`, поэтому refresh после mutation использует текущие filters, а не stale closure.
- Regression test монтирует open-modal effect, вызывает reset callback через dependency array, ограничивает render count `<10` и отдельно проверяет referential equality обоих reset callbacks после rerender.
- Targeted command: `npm test -- --run src/features/horses/hooks/useHorseBreedGroups.test.ts` — **12/12 PASS**.
- Full frontend command: `npm test` — **46 files, 421/421 PASS**; новая regression увеличила suite с 420 до 421 tests.

## Commands

| Команда | Результат |
|---|---|
| `openspec status --change breeds-group-048 --json` | artifacts done |
| `openspec instructions apply --change breeds-group-048 --json` | contextFiles прочитаны полностью |
| root `make format` | PASS, 183 src + 58 tests unchanged |
| root `make test` | PASS: backend 1003 passed/5 skipped; email 39 passed; notification 23 passed; frontend 420 passed; type/lint/build/AsyncAPI/secret scan passed |
| root `make lint` | PASS, полный root check повторён |
| frontend gates after runtime rework | PASS: 46 files/421 tests; lint 0 errors (warnings); `npx tsc --noEmit`; build `/horses` |
| `openspec validate breeds-group-048 --strict` | PASS |
| required frontend `rg`/`find` self-checks | выполнены; no `site-*` mixing/FSD violation для change |

## Live smoke SM-01..SM-38

PostgreSQL заново обнаружен: container `eqsitecms-db` (`7c720ddc783d`), compose project `eqsitecms-core`, service `db`; env получен через inspect, port `5432/tcp -> 5433` (не hardcode).

| ID | Проверка | HTTP | Time ms | Result |
|---|---|---:|---:|---|
| SM-01 | DB table/FK `SET NULL` | DB | 0 | PASS |
| SM-02 | GET group list, anonymous valid selector | 200 | 23.458 | PASS |
| SM-03 | GET group detail, anonymous | 200 | 20.470 | PASS |
| SM-04 | GET missing selector | 401 | 1.634 | PASS |
| SM-05 | GET invalid selector | 401 | 20.103 | PASS |
| SM-06 | POST anonymous | 401 | 1.667 | PASS |
| SM-07 | PATCH anonymous | 401 | 1.420 | PASS |
| SM-08 | DELETE anonymous | 401 | 1.296 | PASS |
| SM-09 | write invalid selector/access | 401 | 1.651 | PASS |
| SM-10 | POST + direct DB row | 200 | 0 DB evidence | PASS |
| SM-11 | whitespace name | 400 | 21.753 | PASS |
| SM-12 | malformed structural payload | 422 | 21.778 | PASS |
| SM-13 | duplicate tenant name | 400 | 22.045 | PASS |
| SM-14 | same name other tenant | DB | 0 | PASS |
| SM-15 | unsafe page_data | 400 | 21.956 | PASS |
| SM-16 | default page_data | DB | 0 | PASS |
| SM-17 | text filters | 200 | 25.744 | PASS |
| SM-18 | default stable order | 200 | 25.505 | PASS |
| SM-19 | explicit sorts | 200 | 27.956 | PASS |
| SM-20 | pagination second page | 200 | 30.117 | PASS |
| SM-21 | detail omits page_data | 200 | 26.367 | PASS |
| SM-22 | detail includes page_data=true | 200 | 21.500 | PASS |
| SM-23 | PATCH rename/slug | 200 | 28.989 | PASS |
| SM-24 | empty PATCH | 400 | 24.434 | PASS |
| SM-25 | DELETE then detail | 204/400 | 69.405/45.546 | PASS |
| SM-26 | foreign tenant no disclosure | 400 | 25.359 | PASS |
| SM-27 | breed POST valid group | 200 | 28.335 | PASS |
| SM-28 | breed POST unknown group | 400 | 22.139 | PASS |
| SM-29 | breed PATCH assign group | 200 | 33.465 | PASS |
| SM-30 | breed PATCH explicit null | 200 | 24.526 | PASS |
| SM-31 | breed PATCH omitted group preserves | 200 | 29.608 | PASS |
| SM-32 | breed GET Public Read nested null | 200 | 22.135 | PASS |
| SM-33 | multi-group filter | 200 | 36.223 | PASS |
| SM-34 | group_name sort | 200 | 23.978 | PASS |
| SM-35 | delete linked group, breed retained/null | 200 | 21.085 | PASS |
| SM-36 | duplicate creates one success | 200/400 | 20.942 | PASS |
| SM-37 | mutation rollback/no partial row | 400 | 24.484 | PASS |
| SM-38 | response privacy | 200 | 23.144 | PASS |

Итог: **38/38 PASS**. Temporary groups, breed и temporary tenant очищены; repository smoke-файлы не создавались.

### Решение о повторном smoke после frontend runtime rework

Полный SM-01..SM-38 не запускался повторно после последнего frontend rework: change ограничен `services/frontend/src/features/horses/hooks/useHorseBreedGroups.ts` и его regression test, backend API/DB/migration code не менялся. Повторная path-scoped проверка backend API diff дала SHA-256 `f5d2bb31aeebe86c9954c3962ae9cc7c7b86d8b2500b7e3e0836bd25f0320aba`; это тот же API scope, против которого выполнен зафиксированный выше 38/38 live rerun. Поэтому предыдущий полный smoke остаётся применимым; frontend runtime behavior покрыт targeted и full frontend gates.

## OpenSpec checklist state

- 3.11: pending — browser evidence blocked.
- 4.1–4.19, 4.21: выполнены.
- 4.20: pending из-за browser blocker.
- 4.22–4.25: pending; sync/archive запрещены до clean rerun.

## Rework checklist

### Frontend

- [ ] Подключить Browser/Chrome extension и выполнить Manual QA design steps 1–14 на трёх viewport с Network evidence и screenshots failures.

### Quality Gate rerun

- [ ] Повторить общий затронутый review и только после APPROVED разрешить sync/validation/archive.
