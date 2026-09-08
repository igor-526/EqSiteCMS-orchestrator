# Tasks — inlove-equestrian-site-init

Реализация начинается только после пользовательского approval; ownership, test matrix и DAG заданы в `design.md`, а `contextFiles` перечислены отдельно для каждого bounded execution unit.

## Execution units

| Unit | Профиль | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| `IL-SC-1` | Site Consumer | `services/site-ksk-inlove/*`, `.helm/**`, `.github/**`, кроме `src/**` | — | tracked inventory, SHA-256/diff immutable trees, dependency/config sanity | `design.md#d1-источник-копирования-только-tracked-baseline`, `design.md#d4-deployment-trees-неизменяемы-побайтово`, `specs/inlove-site-skeleton/spec.md` |
| `IL-SC-2a` | Site Consumer | `src/api/**`, `src/types/**`; legacy content/API helper removal | `IL-SC-1` | targeted API tests + import/inventory checks | `design.md#d3-целевой-allowlist-вместо-списка-отдельных-удалений`, `design.md#api-access-matrix`, `specs/site-consumer-contracts/spec.md` |
| `IL-SC-2b` | Site Consumer | site-settings provider/context/hook/service; callback wrapper/tests | `IL-SC-2a` | provider/hook + callback targeted tests | `design.md#api-access-matrix`, `design.md#test-matrix`, `specs/site-consumer-contracts/spec.md` |
| `IL-SC-2c` | Site Consumer | `src/lib/observability/**`, Sentry/instrumentation entrypoints/tests | `IL-SC-2b` | targeted observability tests + `npx tsc --noEmit` | `design.md#d2-sentry-сохраняется-как-отключённая-конфигурируемая-возможность`, `specs/inlove-site-skeleton/spec.md` |
| `IL-SC-2d` | Site Consumer | minimal `src/app/**` shell + neutral global styles | `IL-SC-2c` | `npm run build` + HTTP `404` runtime sanity | `design.md#d5-корневой-route-временно-отсутствует`, `design.md#manual-qa--runtime-sanity`, `specs/inlove-site-skeleton/spec.md` |
| `IL-SC-2e` | Site Consumer | verification-only по `services/site-ksk-inlove/src/**` | `IL-SC-2d` | `UT-IL-01..06`, static scan, test/lint/typecheck/build | `design.md#test-matrix`, `design.md#api-access-matrix`, `specs/site-consumer-contracts/spec.md` |
| `IL-SC-3` | Site Consumer | `SERVICES.md` | `IL-SC-2e` | `ST-IL-01..06`, `REN-IL-01`, `REG-IL-01`, catalog/manifest check | `design.md#d7-каталог-сервисов-и-git-lifecycle-разделены`, `design.md#manual-qa--runtime-sanity`, `specs/inlove-site-skeleton/spec.md#requirement-новый-consumer-отражён-в-каталоге-сервисов` |
| `QG-FE` | Quality Gate | read-only site diff/evidence | `IL-SC-3` | tests, lint, typecheck, build, runtime/source review | `design.md#test-matrix`, `design.md#manual-qa--runtime-sanity`, `specs/inlove-site-skeleton/spec.md`, `specs/site-consumer-contracts/spec.md` |
| `QG-CONTRACTS` | Quality Gate | read-only specs/tasks/diff | `IL-SC-3` | access/ownership/task review + strict validate | `proposal.md`, `design.md#api-access-matrix`, `design.md#execution-units`, `specs/site-consumer-contracts/spec.md`, `tasks.md#execution-units` |
| `QG-SYNTH` | Quality Gate | `docs/reports/**` | `QG-FE`, `QG-CONTRACTS` | единый verdict report | handoff `QG-FE`, handoff `QG-CONTRACTS`, `design.md#execution-units` |
| `PLAN-FIX-1` | Planner | `design.md`, `tasks.md`, `specs/site-consumer-contracts/spec.md` | `QG-SYNTH=REWORK` | status + strict validate + `git diff --check` + traceability | QG report findings, `design.md#api-access-matrix`, `design.md#execution-units` |
| `OPS-SYNC` | Router/OpenSpec | main `openspec/specs/**` | `QG-SYNTH=APPROVED` | sync + strict validation | approved QG report, delta specs этого change |
| `OPS-ARCHIVE` | Router/OpenSpec | archive change | `OPS-SYNC` | archive + final validation | handoff `OPS-SYNC`, approved QG report |

Неприменимо: `QG-BE` — нет Python/backend diff; `QG-LIVE` — нет runtime API diff, PostgreSQL/NATS smoke не требуется. DAG не дублируется: `design.md` → `## DAG зависимостей`.

## 1. IL-SC-1 — bootstrap и конфигурационный каркас (профиль: Site Consumer)

**Specs:** `inlove-site-skeleton` · **Пути:** `services/site-ksk-inlove/*`, `.helm/**`, `.github/**`, кроме `src/**` · **Зависит от:** —

- [x] IL-SC-1.1 Получить authoritative tracked inventory через `git -C services/site-ad ls-files` и создать `services/site-ksk-inlove` без `.git`, `.env`, `.next`, `node_modules`, coverage и caches.
- [x] IL-SC-1.2 Скопировать `.helm/**` и `.github/**` без edits; сохранить source/target SHA-256 manifests как verification evidence, не добавляя их в runtime tree.
- [x] IL-SC-1.3 Скопировать базовый Next.js/TypeScript/PostCSS/ESLint/Vitest toolchain и `.gitignore`, исключив Storybook-конфигурацию и presentation docs.
- [x] IL-SC-1.4 Переименовать package identity в `site-ksk-inlove`, удалить UI/Storybook-only dependencies, обновить Next.js `15.5.6` → `15.5.25` без major-миграции и штатно пересоздать lockfile; остальные runtime-версии не обновлять без требования совместимости.
- [x] IL-SC-1.5 Нейтрализовать `next.config.ts`, удалив домены исходного клиента и `mc.yandex.ru`; сохранить только необходимые generic/Sentry настройки.
- [x] IL-SC-1.6 Нейтрализовать `.env.example`, README, Dockerfile и `docker-compose.yaml`: документировать stand domain `inlove-stand.eqcms.ru`, конфигурируемые API URL/обязательный selector/Sentry, target container identity, без runtime domain fallback, чужих defaults и секретов; оставить Sentry выключенным до пользовательской env-настройки.
- [x] IL-SC-1.7 Скопировать `openapi.json` только если он не содержит брендовых/client-specific данных и остаётся полезным контрактным reference; иначе исключить с зафиксированным решением в handoff.
- [x] IL-SC-1.8 Добавить в README явное предупреждение: неизменённые `.helm/**`/`.github/**` сохраняют deploy identity `site-ad`, deployment запрещён до отдельного change; Git не инициализируется.
- [x] IL-SC-1.9 Проверить отсутствие локальных artifacts, package/config consistency и полное SHA-256 равенство immutable trees.
- [x] IL-SC-1.V Отметить только фактически выполненные IDs и вернуть Router handoff по `AGENTS.md`, приложив команды inventory/hash verification.

## 2. IL-SC-2 — integration layer, security boundary и technical shell (профиль: Site Consumer)

**Specs:** `inlove-site-skeleton`, `site-consumer-contracts` · **Пути:** `services/site-ksk-inlove/src/**` · **Зависит от:** `IL-SC-1`

Фактическая история исполнения сохранена как пять последовательных bounded units одного deliverable/владельца. Существующие task IDs не переименовываются задним числом; mapping фиксирует handoff каждого запуска:

| Unit | Выполненные task IDs | Результат / checkpoint |
|---|---|---|
| `IL-SC-2a` | `IL-SC-2.1`, `IL-SC-2.5` | initial API/types slice, allowlist и удаление legacy content/import graph |
| `IL-SC-2b` | `IL-SC-2.2`, `IL-SC-2.7` | site-settings provider/hook и callback exception с targeted tests |
| `IL-SC-2c` | `IL-SC-2.3` | observability и Sentry/instrumentation slice |
| `IL-SC-2d` | `IL-SC-2.4` | neutral technical shell и стандартный `404` |
| `IL-SC-2e` | `IL-SC-2.6`, `IL-SC-2.8`, `IL-SC-2.9`, `IL-SC-2.V` | финальные API/access tests, static checks и полный verification handoff |

- [x] IL-SC-2.1 Перенести `src/api/**` и `src/types/**`, исключив `imagesFromFolder.ts` и иные helpers, связанные с UI/public assets; исправить только import graph нового сайта.
- [x] IL-SC-2.2 Сохранить `siteSettings` context/provider/hook/service и callback service wrapper без form/UI; исключить page-data/content assembly services.
- [x] IL-SC-2.3 Сохранить observability library и необходимые Sentry/instrumentation entrypoints, заменив source-specific release/test fixtures нейтральной target identity.
- [x] IL-SC-2.4 Создать минимальный технический App Router shell (`layout`, neutral globals, global error) без custom content route и metadata исходного клиента; удалить analytics, webmaster verification, `robots.ts` и `sitemap.ts`, обеспечить стандартный `404` на `/`.
- [x] IL-SC-2.5 Удалить `src/app/(site)/**`, остальные content routes, feature data/UI, `src/ui/**`, stories и все presentation assets; не переносить import-зависимости удалённого слоя.
- [x] IL-SC-2.6 Реализовать/адаптировать `UT-IL-01..UT-IL-03` для URL/query, anonymous GET, selector header и missing-selector без чужого fallback.
- [x] IL-SC-2.7 Реализовать/адаптировать `UT-IL-04..UT-IL-06` для callback public POST exception, error normalization и site-settings provider/hook; использовать только mocks без live backend.
- [x] IL-SC-2.8 Проверить статически отсутствие CMS cookie/token, CMS-only endpoints и write wrappers кроме явного `/api/callback_requests`.
- [x] IL-SC-2.9 Прогнать из нового сайта `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`; исправлять только target ownership.
- [x] IL-SC-2.V Отметить выполненные IDs и вернуть Router handoff по `AGENTS.md` с Public Read и build evidence.

## 3. IL-SC-3 — каталог, очистка наследия и runtime sanity (профиль: Site Consumer)

**Specs:** `inlove-site-skeleton` · **Пути:** `SERVICES.md` (runtime нового сайта только read-only verification) · **Зависит от:** `IL-SC-2`

- [x] IL-SC-3.1 Добавить `site-ksk-inlove` в таблицу и раздел public consumers `SERVICES.md`, указав neutral starter status, Public Read boundary и запрет deploy через унаследованные Helm/Actions.
- [x] IL-SC-3.2 Подтвердить, что `services.manifest` не изменён и target `.git` отсутствует: Git, remote и manifest/orchestration пользователь выполняет самостоятельно вне change.
- [x] IL-SC-3.3 Выполнить `ST-IL-01..ST-IL-03`: brand/analytics/webmaster scan вне immutable trees и inventory отсутствующих routes/UI/stories/public media.
- [x] IL-SC-3.4 Выполнить `ST-IL-04..ST-IL-06`: повторное hash equality, local/Git boundary и отсутствие CMS auth/CMS-only writes.
- [x] IL-SC-3.5 Выполнить `REN-IL-01` на production build для desktop/tablet/mobile и проверить HTML/Network по `design.md` → `## Manual QA / runtime sanity`.
- [x] IL-SC-3.6 Выполнить `REG-IL-01`: подтвердить отсутствие изменений в `services/site-ad`; сохранить passed/failed evidence и screenshots/network details только для failures.
- [x] IL-SC-3.V Отметить выполненные IDs и вернуть Router handoff по `AGENTS.md`, включая catalog, brand scan и runtime evidence.

## 4. QG-FE — frontend/site-consumer lane (профиль: Quality Gate)

**Specs:** обе capability · **Пути:** read-only diff/evidence · **Зависит от:** `IL-SC-3`

- [x] QG-FE.1 Проверить scope/ownership: source `site-ad` неизменён, target без `.git`/local artifacts, удалённый UI/content не восстановлен ради build.
- [x] QG-FE.2 Независимо сверить SHA-256 relative-path manifests `.helm/**` и `.github/**`; любое расхождение оформить finding.
- [x] QG-FE.3 Проверить качество и полноту `UT-IL-01..06`, mocks/no-live-backend, anonymous selector и callback exception.
- [x] QG-FE.4 Запустить в target `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- [x] QG-FE.5 Повторить `ST-IL-01..06` и проверить отсутствие brand/analytics/webmaster/CMS-auth следов вне документированного immutable exception.
- [x] QG-FE.6 Выполнить runtime sanity `REN-IL-01` и проверить отсутствие custom UI/content, старых network calls и responsive defects.
- [x] QG-FE.V Вернуть Router lane-handoff `pass/fail` с findings/evidence; не ставить общий verdict.

## 5. QG-CONTRACTS — contracts и архитектура (профиль: Quality Gate)

**Specs:** обе capability · **Пути:** read-only specs/tasks/diff · **Зависит от:** `IL-SC-3`

- [x] QG-CONTRACTS.1 Сверить diff с утверждёнными proposal/design/spec scenarios и task IDs; незаявленный scope оформить finding.
- [x] QG-CONTRACTS.2 Проверить ownership и boundedness handoff каждого unit, неизменность source и отсутствие пересечений файлов.
- [x] QG-CONTRACTS.3 Проверить access matrix: anonymous Public Read GET, selector missing/invalid `401`, callback как единственное public POST exception, отсутствие CMS credentials.
- [x] QG-CONTRACTS.4 Проверить, что `SERVICES.md` обновлён, `services.manifest`/Git не изменены, deploy limitation задокументирована.
- [x] QG-CONTRACTS.5 Выполнить `openspec status --change inlove-equestrian-site-init` и `openspec validate inlove-equestrian-site-init --type change --strict`.
- [x] QG-CONTRACTS.V Вернуть Router lane-handoff `pass/fail` с findings/evidence; не ставить общий verdict.

## 6. QG-SYNTH — единый Quality Gate verdict (профиль: Quality Gate)

**Specs:** обе capability · **Пути:** `docs/reports/**` · **Зависит от:** `QG-FE`, `QG-CONTRACTS`

- [x] QG-SYNTH.1 Получить handoff обоих применимых lanes и отметить `QG-BE`/`QG-LIVE` как неприменимые с причиной.
- [x] QG-SYNTH.2 Дедуплицировать findings, назначить severity, владельца и отдельный bounded rework unit для каждого tightly-coupled набора.
- [x] QG-SYNTH.3 Создать один русскоязычный report в `docs/reports/**` с evidence lanes и единым verdict `APPROVED` либо `REWORK`.
- [x] QG-SYNTH.4 При `REWORK` вернуть findings Router; после fixes принять результаты только повторно запущенных затронутых lanes.
- [x] QG-SYNTH.5 При отсутствии findings подтвердить traceability specs → matrix → tasks → diff и готовность к sync/archive.
- [x] QG-SYNTH.V Отметить выполненные IDs и вернуть Router финальный QG handoff с путём отчёта.

## 7. PLAN-FIX-1 — устранение contract/process findings (профиль: Planner)

**Specs:** `site-consumer-contracts` · **Пути:** `design.md`, `tasks.md`, `specs/site-consumer-contracts/spec.md` · **Зависит от:** `QG-SYNTH=REWORK`

- [x] PLAN-FIX-1.1 Добавить семь фактически retained detail-wrapper routes в access matrix design и delta spec с Public Read, selector `401`, authenticated outcome и test coverage.
- [x] PLAN-FIX-1.2 Зафиксировать фактическое последовательное разбиение `IL-SC-2a..2e`, ownership, verification, зависимости и mapping выполненных task IDs без изменения product scope или истории checkbox.
- [x] PLAN-FIX-1.3 Сверить внутреннюю трассируемость access matrix ↔ spec scenarios ↔ test matrix и execution units ↔ tasks ↔ DAG.
- [x] PLAN-FIX-1.V Выполнить OpenSpec status/strict validation и `git diff --check`; вернуть Router handoff для повторного `QG-CONTRACTS`.

## 8. OPS-SYNC — синхронизация delta specs (профиль: Router/OpenSpec)

**Specs:** обе capability · **Пути:** main `openspec/specs/**` · **Зависит от:** `QG-SYNTH=APPROVED`

- [x] OPS-SYNC.1 Через `openspec-sync-specs` синхронизировать `inlove-site-skeleton` и addition `site-consumer-contracts` в main specs без archive.
- [x] OPS-SYNC.2 Проверить отсутствие runtime/docs изменений вне результата sync.
- [x] OPS-SYNC.3 Выполнить strict validation синхронизированных specs/change.
- [x] OPS-SYNC.V Вернуть handoff с путями и результатом validation.

## 9. OPS-ARCHIVE — архивирование change (профиль: Router/OpenSpec)

**Specs:** обе capability · **Пути:** OpenSpec archive · **Зависит от:** `OPS-SYNC`

- [x] OPS-ARCHIVE.1 Через `openspec-archive-change` архивировать `inlove-equestrian-site-init` после подтверждённого sync.
- [x] OPS-ARCHIVE.2 Повторно выполнить strict validation и проверить итоговый статус/archive location.
- [x] OPS-ARCHIVE.V Вернуть финальный handoff с archive и validation evidence.
