# Tasks — fix-071-inlove-site-bugs

Ownership разделён по deliverables A–F; DAG и test matrix находятся в `design.md#dag-зависимостей` и `design.md#test-matrix`. `contextFiles` перечислены точечно для каждого bounded execution unit; change `069` не редактируется.

## Execution units

| Unit | Профиль | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| `IL71-API-SC-1` | Site Consumer | `src/api/client.ts`, client/public wrapper tests | доступный `069` site diff | `UT-API-01..04`, typecheck | `design.md` decisions 1–2/access; production-api spec; current `src/api/client*`; 069 shell/callback specs; `scheme.md` access matrix |
| `IL71-DEPLOY-SC-1` | Site Consumer | `.github/workflows/check_and_deploy.yml`, `Dockerfile`, `.dockerignore`, `package.json`, `scripts/validate-production-config.mjs`, `scripts/verify-production-deployment.mjs`, `.env.example`, `README.md`; `.helm/**` conditional | `IL71-API-SC-1` | `UT-DEP-01..03` | API handoff; `design.md` decision 1/migration; production-api spec; `.github/workflows/check_and_deploy.yml`; `Dockerfile`; `.dockerignore`; `package.json`; `scripts/validate-production-config.mjs`; `scripts/verify-production-deployment.mjs`; `.env.example`; `README.md`; `.helm/**` only if runtime evidence |
| `IL71-NAV-SC-1` | Site Consumer | `src/ui/navigation/**` | доступный `069` site diff | `UT-NAV-01..04`, typecheck | navigation spec; `design.md` decisions 3–4; `components.md#Navigation`; `scheme.md#Общий-header`; design spec §§0,17,39,45,47,53–54,89–92,99–101; current navigation files |
| `IL71-HOME-SC-1` | Site Consumer | `src/features/contentPages/home/**` | доступный `070` site diff | `UT-HOME-01..03`, typecheck | home spec; `design.md` decision 5; `scheme.md#Главная`; `components.md#HomePage`; design spec §§0,8–11,23,43,47,53–54,66,84,86,89–92,99–101; current home files |
| `IL71-CB-SC-1` | Site Consumer | callback feature/service tests | `IL71-API-SC-1` | `UT-CB71-01..06`, typecheck | API handoff; callback-validation spec; `design.md` decision 6/access; backend `src/core/schemas/callbackrequest.py` read-only; 069 callback spec; current schema/modal/service files; components CallbackModal; design spec §§29–34,73–77,99–101 |
| `IL71-VERIFY-SC-1` | Site Consumer | verification-only; fixes only in owning paths | all implementation units | tests/lint/typecheck/build/scans | all implementation handoffs; `design.md#test-matrix`; four delta specs; package/config files |
| `IL71-BQA-SC-1` | Site Consumer | verification-only | `IL71-VERIFY-SC-1` | `BQA-71-01..08` | verify handoff; `design.md#browser-qa-steps-ui-тестирование`; four delta specs; local API/env prerequisites |
| `QG-FE` | Quality Gate | read-only site/deployment diff | BQA | frontend commands + review | implementation/BQA handoffs; design matrices; relevant diff; site design protocol |
| `QG-CONTRACTS` | Quality Gate | read-only specs/tasks/diff | BQA | strict validation + conformance | proposal; design access/ownership/units; four specs; tasks; diff |
| `QG-LIVE` | Quality Gate | live verification-only | QG-FE + QG-CONTRACTS | `LIVE-API-01..06` | QG handoffs; production image/config evidence; access matrix; smoke skill instructions |
| `QG-SYNTH` | Quality Gate | `docs/reports/071_bugs.md` | applicable QG lanes | one verdict | all QG handoffs/findings; tasks status |
| `OPS-SYNC` | Router/OpenSpec | main specs | approved synthesis | sync + strict validate | approved report; four delta specs |
| `OPS-ARCHIVE` | Router/OpenSpec | archive | sync | archive + final validate | sync handoff; completed change/status |

## 1. IL71-API-SC-1 — production-safe API client (профиль: Site Consumer)

**Specs:** `inlove-production-api-config` · **Пути:** `services/site-ksk-inlove/src/api/client.ts`, client/public wrapper tests · **Зависит от:** доступный site diff `069`

- [x] IL71-API-SC-1.1 Удалить selector fallback `default` и определить явный error contract для missing/blank configuration.
- [x] IL71-API-SC-1.2 Гарантировать configured selector для каждого разрешённого GET и callback POST до network call.
- [x] IL71-API-SC-1.3 Сохранить overwrite caller selector, `credentials: omit` и удаление Cookie/Authorization без CMS fallback.
- [x] IL71-API-SC-1.4 Реализовать `UT-API-01..04` из `design.md#test-matrix`, включая exact headers и `401` outcome.
- [x] IL71-API-SC-1.5 Проверить отсутствие иных прямых fetch/API boundaries, обходящих общий client.
- [x] IL71-API-SC-1.V Прогнать targeted tests и `npx tsc --noEmit`, отметить фактически выполненные tasks и вернуть Router handoff.

## 2. IL71-DEPLOY-SC-1 — production build/deploy config wiring (профиль: Site Consumer)

**Specs:** `inlove-production-api-config` · **Пути:** `.github/workflows/check_and_deploy.yml`, `Dockerfile`, `.dockerignore`, `package.json`, `scripts/validate-production-config.mjs`, `scripts/verify-production-deployment.mjs`, `.env.example`, `README.md`; `.helm/**` только при подтверждённой runtime необходимости · **Зависит от:** `IL71-API-SC-1`

- [x] IL71-DEPLOY-SC-1.1 Добавить fail-fast validation API URL/selector до image push/deploy без печати значений.
- [x] IL71-DEPLOY-SC-1.2 Согласовать workflow build args и Docker builder/runner config с доказанным Next.js build-time boundary.
- [x] IL71-DEPLOY-SC-1.3 Не добавлять runtime Helm env без evidence; при необходимости внести минимальную согласованную template/value wiring в том же ownership.
- [x] IL71-DEPLOY-SC-1.4 Обновить `.env.example`/README: selector обязателен, non-secret, fallback отсутствует, production input проверяется.
- [x] IL71-DEPLOY-SC-1.5 Реализовать `UT-DEP-01..03`, включая production artifact/header harness и secret/log hygiene scan.
- [x] IL71-DEPLOY-SC-1.6 Зафиксировать image/config evidence без реального selector value и без изменения release destination.
- [x] IL71-DEPLOY-SC-1.V Прогнать production config/image verification, отметить tasks и вернуть Router handoff.

## 3. IL71-NAV-SC-1 — dropdown и fullscreen mobile menu (профиль: Site Consumer)

**Specs:** `inlove-navigation-regressions` · **Пути:** `services/site-ksk-inlove/src/ui/navigation/**` · **Зависит от:** доступный site diff `069`

- [x] IL71-NAV-SC-1.1 Сделать trigger/dropdown непрерывной pointer hit area без timing workaround.
- [x] IL71-NAV-SC-1.2 Применить opaque surface/background, border/shadow и stacking по существующим tokens.
- [x] IL71-NAV-SC-1.3 Вынести mobile overlay на viewport-level root/portal вне sticky header containing block.
- [x] IL71-NAV-SC-1.4 Добавить `100dvh`/fallback, safe-area и internal overflow для короткого viewport.
- [x] IL71-NAV-SC-1.5 Сохранить scroll lock, focus trap, Escape, focus return, active group и 44px targets.
- [x] IL71-NAV-SC-1.6 Реализовать `UT-NAV-01..04`, включая pointer bridge CSS contract и mobile portal lifecycle.
- [x] IL71-NAV-SC-1.V Прогнать navigation tests и `npx tsc --noEmit`, отметить tasks и вернуть Router handoff.

## 4. IL71-HOME-SC-1 — компактная SSR-секция услуг (профиль: Site Consumer)

**Specs:** `inlove-home-services-regression` · **Пути:** `services/site-ksk-inlove/src/features/contentPages/home/**` · **Зависит от:** доступный site diff `070`

- [x] IL71-HOME-SC-1.1 Добавить server-rendered `h2` «Услуги» в общий section/container с service nav.
- [x] IL71-HOME-SC-1.2 Согласовать heading rhythm с NewsSection, используя существующие typography/spacing tokens.
- [x] IL71-HOME-SC-1.3 Заменить создающий пустоту fixed square geometry на content-driven responsive min-height/padding.
- [x] IL71-HOME-SC-1.4 Сохранить четыре labels/icons/href, semantic nav и SSR-only content path.
- [x] IL71-HOME-SC-1.5 Реализовать `UT-HOME-01..03` для heading/source, links и responsive CSS regression.
- [x] IL71-HOME-SC-1.V Прогнать home tests и `npx tsc --noEmit`, отметить tasks и вернуть Router handoff.

## 5. IL71-CB-SC-1 — Zod/backend DTO parity (профиль: Site Consumer)

**Specs:** `inlove-callback-validation-regression` · **Пути:** `services/site-ksk-inlove/src/features/callBackRequest/**` и принадлежащие feature callback service tests · **Зависит от:** `IL71-API-SC-1`

- [x] IL71-CB-SC-1.1 Сверить schema с read-only `CallbackRequestCreateDto`: phone 1–63, optional name 127, optional comment 2000.
- [x] IL71-CB-SC-1.2 Нормализовать whitespace optional name/comment в backend-compatible отсутствие значения.
- [x] IL71-CB-SC-1.3 Валидировать/компоновать итоговый comment с entity context в общем лимите 2000 без route/page context.
- [x] IL71-CB-SC-1.4 Сохранить consent UI-only, first-invalid focus, pending guard и exact three-field payload.
- [x] IL71-CB-SC-1.5 Сохранить public POST selector/no-credentials и UI outcomes `201/401/422/5xx`.
- [x] IL71-CB-SC-1.6 Реализовать `UT-CB71-01..06` из test matrix без live backend calls.
- [x] IL71-CB-SC-1.V Прогнать callback/schema/service tests и `npx tsc --noEmit`, отметить tasks и вернуть Router handoff.

## 6. IL71-VERIFY-SC-1 — integrated automated verification (профиль: Site Consumer)

**Specs:** четыре capability · **Пути:** verification-only; test/config fixes только в ранее назначенном ownership · **Зависит от:** все implementation units

- [x] IL71-VERIFY-SC-1.1 Прогнать все `UT-API-*`, `UT-DEP-*`, `UT-NAV-*`, `UT-HOME-*`, `UT-CB71-*` и подтвердить mocks/no-live boundary.
- [x] IL71-VERIFY-SC-1.2 Прогнать `npm test` из `services/site-ksk-inlove`.
- [x] IL71-VERIFY-SC-1.3 Прогнать `npm run lint` и `npx tsc --noEmit` без autofix.
- [x] IL71-VERIFY-SC-1.4 Прогнать `npm run build` с controlled non-production values и production artifact test.
- [x] IL71-VERIFY-SC-1.5 Выполнить scans direct fetch, Cookie/Authorization, CMS-only endpoint, fallback `default`, tracked selector values.
- [x] IL71-VERIFY-SC-1.6 Проверить SSR source contract home и отсутствие изменений backend/NATS/DB/design docs/069 artifacts.
- [x] IL71-VERIFY-SC-1.V Свести evidence, отметить tasks и вернуть Router handoff.

## 7. IL71-BQA-SC-1 — browser QA regression flow (профиль: Site Consumer)

**Specs:** navigation, home, callback, production API config · **Пути:** verification-only · **Зависит от:** `IL71-VERIFY-SC-1`

- [x] IL71-BQA-SC-1.1 Поднять production-like site build с local API, controlled selector и anonymous browser session.
- [x] IL71-BQA-SC-1.2 Выполнить `BQA-71-01..03`: dropdown/mobile overlay/keyboard на 320/768/1024/1440 и коротком viewport.
- [x] IL71-BQA-SC-1.3 Выполнить `BQA-71-04`: heading/density/spacing home services на четырёх widths.
- [x] IL71-BQA-SC-1.4 Выполнить `BQA-71-05..06`: Zod boundaries, consent, success и error states.
- [x] IL71-BQA-SC-1.5 Выполнить `BQA-71-07..08`: sanitized Network access evidence и server-rendered source.
- [x] IL71-BQA-SC-1.6 Проверить zoom 200%, focus rings, reduced motion, no overlap/horizontal scroll.
- [x] IL71-BQA-SC-1.V Вернуть passed/failed IDs, screenshots/network evidence и handoff; не отмечать непроведённые визуальные проверки.

## 8. QG-FE — frontend/browser lane (профиль: Quality Gate)

**Specs:** все capability · **Пути:** read-only site/deployment diff · **Зависит от:** `IL71-BQA-SC-1`

- [x] QG-FE.1 Запустить `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` с controlled config.
- [x] QG-FE.2 Проверить качество tests относительно behavior diff, production artifact test и no-live unit boundary.
- [x] QG-FE.3 Проверить browser evidence dropdown/menu/home/form на 320/768/1024/1440, keyboard/zoom/reduced motion.
- [x] QG-FE.4 Проверить SSR home, API selector/no credentials и отсутствие CMS/site mixing.
- [x] QG-FE.5 Вернуть severity/file-line/scenario findings и bounded rework ownership.
- [x] QG-FE.V Вернуть lane handoff без общего verdict и runtime edits.

## 9. QG-CONTRACTS — architecture/contracts lane (профиль: Quality Gate)

**Specs:** все capability · **Пути:** read-only OpenSpec/tasks/diff · **Зависит от:** `IL71-BQA-SC-1`

- [x] QG-CONTRACTS.1 Выполнить strict validation и сверить diff с proposal/design/specs/tasks.
- [x] QG-CONTRACTS.2 Проверить ownership, unit boundedness, checkbox/handoff evidence и отсутствие edits change `069`.
- [x] QG-CONTRACTS.3 Сверить access matrix, public POST exception, selector `401`, no Cookie/Authorization.
- [x] QG-CONTRACTS.4 Подтвердить отсутствие backend/DB/NATS/API schema и design source изменений.
- [x] QG-CONTRACTS.5 Проверить deployment config classification: selector non-secret, реальное значение не tracked/logged.
- [x] QG-CONTRACTS.V Вернуть lane findings/handoff без общего verdict.

## 10. QG-LIVE — production image и live API lane (профиль: Quality Gate)

**Specs:** production API config, callback validation · **Пути:** verification-only · **Зависит от:** `QG-FE`, `QG-CONTRACTS`

- [x] QG-LIVE.1 Проверить local API/site prerequisites и получить controlled tenant selector без вывода значения.
- [x] QG-LIVE.2 Выполнить `LIVE-API-01..03` Public Read на production image: valid/missing/invalid selector и no credentials.
- [x] QG-LIVE.3 Выполнить `LIVE-API-04..06` callback: valid/invalid/selector outcomes, один POST, exact payload.
- [x] QG-LIVE.4 Подтвердить отсутствие persistence для invalid client/backend requests и отсутствие pytest smoke files.
- [x] QG-LIVE.5 Сохранить sanitized status/header/body/image digest evidence.
- [x] QG-LIVE.V Вернуть lane handoff/findings без общего verdict.

## 11. QG-SYNTH — единый Quality Gate verdict (профиль: Quality Gate)

**Specs:** все capability · **Пути:** `docs/reports/071_bugs.md` · **Зависит от:** QG-FE, QG-CONTRACTS, QG-LIVE

- [x] QG-SYNTH.1 Собрать lane handoffs, удалить дубли findings и сохранить severity/evidence/owner.
- [x] QG-SYNTH.2 Пометить `QG-BE` неприменимым: backend diff отсутствует.
- [x] QG-SYNTH.3 Для blocking findings сформировать bounded rework units и список повторяемых lanes.
- [x] QG-SYNTH.4 Записать единый report `docs/reports/071_bugs.md` с verdict `APPROVED` либо `REWORK`.
- [x] QG-SYNTH.V Вернуть Router synthesis handoff.

## 12. OPS-SYNC — sync delta specs (профиль: Router/OpenSpec workflow)

- [x] OPS-SYNC.1 При `APPROVED` синхронизировать четыре delta capability в main specs штатным OpenSpec workflow.
- [x] OPS-SYNC.2 Повторить strict validation change/main specs и проверить отсутствие потери access matrix/scenarios.
- [x] OPS-SYNC.V Зафиксировать status/validation и перейти к archive только при успехе.

## 13. OPS-ARCHIVE — archive change (профиль: Router/OpenSpec workflow)

- [x] OPS-ARCHIVE.1 Подтвердить завершённые implementation/QG tasks и отсутствие blocking findings.
- [x] OPS-ARCHIVE.2 Архивировать `fix-071-inlove-site-bugs` штатной OpenSpec командой.
- [x] OPS-ARCHIVE.V Выполнить финальную validation/status проверку и сообщить путь архива.
