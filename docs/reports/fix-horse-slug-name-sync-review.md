# Review: fix-horse-slug-name-sync

**Статус: ✅ APPROVED**  
**Дата:** 2026-08-25  
**Approval:** пользователь подтвердил `Apply` после review apply-ready OpenSpec artifacts.

## Итог

Change соответствует [proposal](../../openspec/changes/archive/2026-08-25-fix-horse-slug-name-sync/proposal.md),
[design](../../openspec/changes/archive/2026-08-25-fix-horse-slug-name-sync/design.md),
[delta spec](../../openspec/changes/archive/2026-08-25-fix-horse-slug-name-sync/specs/cms-horse-ui-quality/spec.md)
и [tasks](../../openspec/changes/archive/2026-08-25-fix-horse-slug-name-sync/tasks.md). Runtime diff остаётся
frontend-only. Backend, API/DTO, PostgreSQL migrations, NATS/AsyncAPI и `site-ad` не
изменены.

Первый общий browser review обнаружил blocking finding: реальный PATCH conflict
показывался только global toast, без field-level slug error. Finding возвращён
Frontend owner. После исправления `useHorses` маппит только точный backend detail
`Slug лошади уже занят` для create/update в `horsesValidationErrors.slug`, сохраняя
global toast; generic/401/403 не маппятся в field errors. Повторный полный Quality
Gate findings не обнаружил.

## Проверенный diff

- `services/frontend/src/features/horses/ui/Horses/HorseCreateUpdateModal.tsx`
- `services/frontend/src/features/horses/ui/Horses/HorseCreateUpdateModal.test.tsx`
- `services/frontend/src/features/horses/hooks/useHorses.ts`
- `services/frontend/src/features/horses/hooks/useHorses.test.ts`

Рекомендуемая ветка: `fix/horse-slug-name-sync`.

## Frontend test gate

Версии: Node `v24.18.0`, npm `11.16.0`, Next.js `15.5.23`, Vitest `4.1.6`.

| Команда | Результат |
|---|---|
| `npm test` | ✅ 68 files, 568/568 tests |
| `npm run lint` | ✅ 0 errors, 429 baseline warnings |
| `npx tsc --noEmit` | ✅ |
| `npm run build` | ✅ 17 static pages, `/horses` built |
| Docker production build/restart frontend | ✅ final source image built and started |
| `openspec validate fix-horse-slug-name-sync --strict` | ✅ valid |

Regression quality подтверждена для untouched prefill, name-triggered empty slug,
обоих порядков manual precedence, explicit clear, close/reopen reset, field error,
scope present/missing, 401/403 flow и double submit. Новые MSW tests проверяют
реальный parent flow PATCH/POST `400` -> `validationErrors.slug`; regression падает
до fix. Unit/component tests не выполняют live backend calls.

Self-checks подтверждают: direct fetch остаётся только в API boundary и developer
documentation snippets; horse UI идёт через `feature -> service -> api`; pagination
contract `limit/offset` не менялся; DTO остаются в `src/types`; `site-*` mixing и
новые `shared/widgets/entities` отсутствуют.

## Manual QA

Актуальный source проверен в пользовательском Chrome на пересобранном
`http://localhost:3001`, backend `http://localhost:8001`, реальная PostgreSQL.

- untouched edit prefill: `Justin` / `dzhastin`;
- name -> auto: поле slug очистилось; единственный logical PATCH (OPTIONS + один
  PATCH) передал `{"name":"QG Justin Auto","slug":""...}` и вернул `200`
  (~42.8 ms); success refresh показал `qg-justin-auto`;
- manual slug -> name сохранил `qg-manual-before-name`;
- name -> manual сначала очистил slug, затем сохранил `qg-manual-after-name`;
- explicit clear -> name оставил пустое значение;
- close/reopen восстановил persisted `qg-justin-auto`, то есть session flag reset;
- быстрый double click дал ровно один PATCH и disabled/loading submit;
- реальный conflict payload `name=QG Conflict Recheck`, `slug=madonna` вернул
  PATCH `400` за 32.949 ms; modal осталась открыта, оба значения сохранены, текст
  `Slug лошади уже занят` появился непосредственно под slug field; global toast
  также сохранился;
- responsive desktop/tablet/mobile modal и footer не менялись этим diff и сверены
  с тем же DOM/layout baseline предыдущего 056 Quality Gate; label/input/error/footer
  доступны, modal прокручивается;
- list/filter/sort/pagination не изменились, success refresh показал актуальные
  name/slug.

Anonymous/no-scope browser route/action guards не затрагивались diff и подтверждены
существующими component/access regressions и browser baseline 056; live denial
повторён на текущем API ниже. Это не потребовало передачи новых credentials в UI.

## Access verification results / live SMOKE

| Проверка | HTTP | Time | Результат |
|---|---:|---:|---|
| login SUPERUSER | 200 | 25.743 ms | ✅ cookie auth |
| anonymous POST `/api/horses` | 401 | 3.113 ms | ✅ protected write |
| browser PATCH name -> generated slug | 200 | 42.8 ms | ✅ один PATCH, `slug=""` |
| browser PATCH occupied manual slug | 400 | 32.949 ms | ✅ field error/state preserved |
| anonymous PATCH `/api/horses/{id}` | 401 | 1.902 ms | ✅ mutation отсутствует |
| USER_MANAGER login | 200 | 38.266 ms | ✅ no-scope session |
| USER_MANAGER PATCH `/api/horses/{id}` | 403 | 24.315 ms | ✅ mutation guard/backend denial |
| anonymous public detail, valid selector, new slug | 200 | 33.596 ms | ✅ Public Read |
| anonymous public detail, valid selector, old slug | 404 | 25.600 ms | ✅ old slug missing |
| public GET, missing selector | 401 | 2.019 ms | ✅ tenant selector contract |
| authenticated restore PATCH | 200 | 31.544 ms | ✅ `Justin` / `dzhastin` restored |
| cleanup DELETE QA target | 204 | 26.832 ms | ✅ |
| cleanup DELETE QA conflict row | 204 | 24.914 ms | ✅ |

Исключений из default access policy нет. GET остаётся Public Read с valid tenant
selector; PATCH остаётся Protected Write. PostgreSQL cleanup: QA marker rows `0`;
существующая запись полностью восстановлена (`Justin`, `dzhastin`).

## Quality Gate checklist

- [x] Proposal/design/delta spec/ownership соответствуют diff.
- [x] Regression tests проверены, включая failing-before-fix parent-flow mapping.
- [x] Access matrix и anonymous/authenticated/no-scope outcomes подтверждены.
- [x] MSW/mocks/no-live-unit, field/generic errors и double-submit подтверждены.
- [x] API/FSD/pagination/site-consumer boundaries подтверждены.
- [x] Полный frontend gate и strict OpenSpec validation успешны.
- [x] Browser Manual QA, real PATCH/Public Read evidence и cleanup завершены.
- [x] Повторный единый review после исправления: APPROVED.

## Финализация OpenSpec

- Delta `cms-horse-ui-quality` интеллектуально синхронизирована в main spec:
  изменено существующее requirement «Поле slug в CMS-форме лошади», остальные
  requirements/scenarios сохранены.
- Idempotence подтверждена: итоговый requirement main spec дословно совпадает с
  delta requirement; повторное применение не создаёт diff или duplicate requirement.
- До архива `openspec validate --all --strict`: ✅ `49 passed, 0 failed`.
- Чеклист завершён: `34/34`.
- Change архивирован в
  `openspec/changes/archive/2026-08-25-fix-horse-slug-name-sync`; каталог содержит
  `.openspec.yaml`, proposal, design, delta spec и завершённый tasks checklist.
- После архива `openspec validate --all --strict`: ✅ `48 passed, 0 failed`;
  `openspec list --json` возвращает пустой active list, active path отсутствует,
  archived checklist остаётся `34/34`.

Tasks 1.24–1.34 выполнены.
