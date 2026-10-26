# Quality Gate: seo-frontend

**Дата:** 2026-10-25 (browser run 24.10, cleanup recheck 25.10) · **Профиль:** QG-LITE + QG-FE-MANUAL · **Итоговый вердикт: APPROVED.**
F01–F04 и остаточный F03-R1 закрыты независимыми browser rechecks. Дополнительные FE-FIX-2 и проверка явно разрешены пользователем через Router. Новых blocking findings нет; waivers не требуются. Итоговое покрытие M01..M12 — 12 PASS (первичный прогон + targeted rechecks).

## Контекст и ссылки

Реализованы вкладки «Страницы»/«Запросы» с серверными таблицами и модалка двух коллекций нормализации с локальной пагинацией и защищёнными create/delete. Backend API, shared primitives/client и site-* не меняются.

- Утверждённый change: [proposal](<../../openspec/changes/seo-frontend/proposal.md>), [design D1–D4, access и Test matrix](<../../openspec/changes/seo-frontend/design.md>), [tasks](<../../openspec/changes/seo-frontend/tasks.md>).
- Specs: [данные SEO](<../../openspec/changes/seo-frontend/specs/cms-seo-data-ui/spec.md>), [вкладки](<../../openspec/changes/seo-frontend/specs/cms-seo-yandex-ui/spec.md>).
- Задача: [100](<../tasks/100_seo_frontend.md>). Approval утверждённого change подтверждён Router при делегировании; handoffs FE-1..3 учтены.
- Рабочая frontend-ветка: `main`; отдельная обязательная branch convention в design не задана.
- [Подробности review/self-checks](<../../.qa/seo-frontend/qg/review.txt>), [tracked diff](<../../.qa/seo-frontend/qg/tracked.diff>), [точный список 24 файлов](<../../.qa/seo-frontend/qg/paths.json>).

## Lanes

| Lane | Результат |
|---|---|
| QG-FE-AUTO | пройден — полный suite, lint, TypeScript, production build |
| QG-CONTRACTS | пройден — ownership, D1–D4, обе delta specs, 8 операций, UT-SEO-01..17 |
| QG-FORMAT | пройден — scoped layout dry-run без изменений, 0 warnings/errors |
| QG-ENV | пройден — существующий Docker runtime, frontend rebuild PASS; app/SEO healthy; repair attempts: 0 |
| QG-FE-MANUAL | пройден — M01..M12:12 PASS / 0 FAIL / 0 BLOCKED с targeted rechecks; только1366×768 |
| QG-BE / QG-LIVE | неприменимо — нет backend/runtime API diff; DB smoke и timings не требуются |
| AsyncAPI / Makefile-контракт | неприменимо — messaging/tooling/Makefile не менялись |
| QG-SYNTH | APPROVED — F01–F04/F03-R1 закрыты; дополнительный FE-FIX-2/recheck явно разрешён пользователем |

## Frontend test gate

| Команда из frontend | Независимый результат / evidence |
|---|---|
| `npm test` | **1043 passed, 0 failed; 91 file**, 39.69s — [лог](<../../.qa/seo-frontend/qg/test.log>) |
| `npm run lint` | exit 0, 0 errors, 434 внешних warnings — [лог](<../../.qa/seo-frontend/qg/lint.log>) |
| `npx --no-install tsc --noEmit` | exit 0 — [лог](<../../.qa/seo-frontend/qg/tsc.log>) |
| `npm run build` | exit 0, `/seo` prerendered — [лог](<../../.qa/seo-frontend/qg/build.log>) |
| Scoped ESLint `--fix-dry-run --fix-type layout` | 24 файла, 0 layout changes, 0 errors/warnings — [JSON](<../../.qa/seo-frontend/qg/format.json>) |
| `git diff --check` | PASS; продуктовые файлы не менялись, [до](<../../.qa/seo-frontend/qg/status-before.txt>)/[после](<../../.qa/seo-frontend/qg/status-after.txt>) совпадают |
| OpenSpec strict | PASS — [лог](<../../.qa/seo-frontend/qg/validate.log>) |

Формат проверен non-mutating scoped эквивалентом вместо `make format` на всём `src`, чтобы не изменять продуктовый код и внешние пути. Зависимости уже доступны; install/repair не требовались.

`openspec` отсутствует в PATH, но обнаружен уже установленный штатный launcher **@fission-ai/openspec 1.14.3**. Независимая команда:
```bash
node /home/igor/.npm/_npx/20f2b75ddc8bce88/node_modules/@fission-ai/openspec/bin/openspec.js validate seo-frontend --type change --strict
```
Tooling не изменялся, скачивания не было; это не blocker.

**Self-checks:** raw fetch новых модулей отсутствует; API imports только service/test; DTO только types. `page` — domain field/ordering либо локальный paginator, wire contract только limit/offset. Blacklist GET без query. Нет site-* mixing, новых shared/widgets/entities, status-string branching, static inline styles или block-bodied JSX handlers. Legacy MainTable prop только на boundary. Search/sort исключительно в value header; дата display-only; сверху только пагинация, нормализация — tabBarExtraContent pages. Старые совпадения в других features не расширяют scope.

**Качество тестов:** проверены реальные assertions, а не только ID/счётчик. Покрыты success/empty/error, обе коллекции/таблицы, debounce и clear, correction, stale responses, guards/revoke, validation, двойные submits и GET-only reconciliation. MSW использует `onUnhandledRequest: error` и reset/cleanup; service mocks локальные, live UT не обнаружены. Отдельного существующего SEO Playwright test suite в репозитории не найдено; M01..M12 не подменены компонентными тестами.

## Покрытие Test matrix

Все пути ниже относительно [frontend src](<../../services/frontend/src/>); фактические tests исполнены полным suite.

| ID | Трассировка и проверенные оси |
|---|---|
| UT-SEO-01 | [API 80 tests](<../../services/frontend/src/api/seo.test.ts>), [service](<../../services/frontend/src/features/seo/services/seoDataService.test.ts>): 8 путей/методов, body, items/total, empty/canonical, 204=null, no query/selector |
| UT-SEO-02 | API parameterization всех 8: refresh success/denied/retry-denied, 403/502/network, применимые 400/409/404; service detail-array sanitation |
| UT-SEO-03 | API/service: literal search, whitelist/clear, URL encoding, только limit/offset |
| UT-SEO-04 | API: foreign/missing 404 для обоих DELETE, encoded ID, отсутствие selector |
| UT-SEO-05 | [scopes](<../../services/frontend/src/features/seo/hooks/useSeoScopes.test.ts>), hooks: ADMIN present/missing, SUPERUSER/DEVELOPER, rerender/revoke/no-call |
| UT-SEO-06 | [validator 35 tests](<../../services/frontend/src/features/seo/validators/normalization.test.ts>): trim/case/#, whitespace/Cc, 255/256 astral code points, разные запреты hashes/params |
| UT-SEO-07 | [table hook](<../../services/frontend/src/features/seo/hooks/useSeoDataTable.test.ts>), [table UI](<../../services/frontend/src/features/seo/ui/SeoDataTable.test.tsx>): 300мс, draft/trim/clear/timer cleanup, offset reset, header-only |
| UT-SEO-08 | Те же tests: оба поля asc/desc/clear, invalid field, controlled indicator, date display-only |
| UT-SEO-09 | Те же tests: 25/0, next page, size reset, filter/sort reset, total/correction |
| UT-SEO-10 | Те же tests: оба варианта data/loading/empty/error/interaction/long value, stale success/error, независимость, revoke/deactivate/unmount |
| UT-SEO-11 | [SeoPage](<../../services/frontend/src/features/seo/ui/SeoPage.test.tsx>), [protected layout](<../../services/frontend/src/app/(protected)/layout.test.tsx>): четыре tabs/default, keyboard/panels, anonymous redirect, forbidden/no-call, regression |
| UT-SEO-12 | [normalization hook](<../../services/frontend/src/features/seo/hooks/usePageNormalization.test.ts>), [list](<../../services/frontend/src/features/seo/ui/NormalizationList.test.tsx>): 10 локально без GET, states, switch/reopen/reset/late requests |
| UT-SEO-13 | Hook + [modal](<../../services/frontend/src/features/seo/ui/PageNormalizationModal.test.tsx>): plus/Enter, validation/error/context, canonical/201 refresh, GET failure не повторяет POST |
| UT-SEO-14 | Hook/modal/list: отдельное confirm/cancel, kind+ID, 204/clamp, 404 reconciliation, selectedMissing, GET failure не повторяет DELETE |
| UT-SEO-15 | Scopes/hook/modal/page + API: guards present/missing/revoke, no-call, 401/403; повышенные роли не заменяют ADMIN |
| UT-SEO-16 | Hook/modal: синхронный lock, double submit/confirm, pending context locks, unlock, GET-only reconciliation |
| UT-SEO-17 | SeoPage integration: страницы→нормализация→create/delete **обоих** видов, страницы неизменны, focus return; существующие SEO regressions PASS |
| M01..M12 | Выполнены scripted browser; сводная трассировка по каждому ID и findings — ниже |

Непокрытых применимых UT ID не обнаружено.

## Access verification results

Все **8 операций ADMIN-only**, включая 4 GET как утверждённые существующие exceptions. UI не выбирает tenant, не отправляет X-Equestrian-Id и не обращается к peer. Все строки матрицы сверены с параметризацией API tests и guards:
- ADMIN: mocked 200/201/204, credentials include; 204 обрабатывается общим клиентом как null.
- Anonymous/expired: mocked 401 на всех операциях, штатный refresh + единственный retry либо отказ. Protected layout redirect покрыт существующим тестом; реальный `/seo` anonymous проверит browser unit.
- Non-ADMIN/SUPERUSER/DEVELOPER: UI forbidden/no requests; hook guards перед чтением/мутацией, revoke invalidates in-flight results; mocked 403 не становится success.
- Foreign/missing DELETE: mocked 404 обеих коллекций; это проверка frontend-контракта, **не** новое доказательство серверной tenant isolation.
- D4 соблюдён: raw HTTP status hooks не получают; текст не используется для status guessing; ошибки безопасны, DELETE error сохраняет confirm и делает только GET; отсутствующий ID блокирует повтор до отмены.

## Findings / Pre-existing / Waivers

**Blocking нет: F01–F04 и F03-R1 закрыты после FE-FIX-1/2.** Внешние 434 lint warnings — pre-existing, новые SEO файлы дают 0; Router может выделить отдельную lint-cleanup задачу. Ранее сообщённые Notifications failure и CRUD timeout **не воспроизвелись**: полный suite зелёный. Shared contrast заголовка/активного tab и отсутствие h1 также воспроизводятся в прежнем состоянии Метрики ([baseline axe](<../../.qa/seo-frontend/browser/report.json>)); это внешние pre-existing, не основание расширять change, отдельный follow-up — доступность темы/layout CMS. **Waivers отсутствуют.**

## Изменённые продуктовые файлы change

Список от корня монорепозитория (продуктовый код QG не менял):
- [DTO](<../../services/frontend/src/types/api/seo.ts>), [API](<../../services/frontend/src/api/seo.ts>), [API tests](<../../services/frontend/src/api/seo.test.ts>).
- [service](<../../services/frontend/src/features/seo/services/seoDataService.ts>), [service tests](<../../services/frontend/src/features/seo/services/seoDataService.test.ts>), [validator](<../../services/frontend/src/features/seo/validators/normalization.ts>), [validator tests](<../../services/frontend/src/features/seo/validators/normalization.test.ts>).
- [scopes](<../../services/frontend/src/features/seo/hooks/useSeoScopes.ts>), [scopes tests](<../../services/frontend/src/features/seo/hooks/useSeoScopes.test.ts>), [table hook](<../../services/frontend/src/features/seo/hooks/useSeoDataTable.ts>), [table hook tests](<../../services/frontend/src/features/seo/hooks/useSeoDataTable.test.ts>).
- [normalization hook](<../../services/frontend/src/features/seo/hooks/usePageNormalization.ts>), [hook tests](<../../services/frontend/src/features/seo/hooks/usePageNormalization.test.ts>).
- [table](<../../services/frontend/src/features/seo/ui/SeoDataTable.tsx>), [table tests](<../../services/frontend/src/features/seo/ui/SeoDataTable.test.tsx>), [pages panel](<../../services/frontend/src/features/seo/ui/SeoPagesPanel.tsx>), [queries panel](<../../services/frontend/src/features/seo/ui/SeoQueriesPanel.tsx>).
- [normalization list](<../../services/frontend/src/features/seo/ui/NormalizationList.tsx>), [list tests](<../../services/frontend/src/features/seo/ui/NormalizationList.test.tsx>), [modal](<../../services/frontend/src/features/seo/ui/PageNormalizationModal.tsx>), [modal tests](<../../services/frontend/src/features/seo/ui/PageNormalizationModal.test.tsx>).
- [SeoPage](<../../services/frontend/src/features/seo/ui/SeoPage.tsx>), [page tests](<../../services/frontend/src/features/seo/ui/SeoPage.test.tsx>), [styles](<../../services/frontend/src/features/seo/ui/seoStyles.ts>).

## Browser verification — QG-FE-MANUAL

Существующие CMS `http://localhost:3001` и backend `http://localhost:8001`; один штатный `stackctl rebuild frontend` PASS, без миграций/repair: [runtime status](<../../.qa/seo-frontend/browser/stack-status.json>). ADMIN/SUPERUSER/DEVELOPER проверены реальным login; anonymous — отдельный context. Первый login после холодного старта не отправил POST, повтор штатного входа успешен: [auth evidence без секретов](<../../.qa/seo-frontend/browser/login-admin-retry.json>). Установленные frontend Playwright/axe-core использованы из ignored копий runner, без установки/изменения tooling; MCP Chrome отсутствует, scripted Chromium доступен.

Команды: `source scripts/qa/browser-env.sh && node .qa/seo-frontend/browser/{manual,retry,focused,states}.mjs`; штатный scenarios-runner адаптирован только для разрешения локальных dependencies. Исходные ошибки селекторов/слишком быстрого mock-abort исправлены только в QA scripts и перепроверены, не объявлены дефектами продукта. [Первичный summary до FE-FIX-1](<../../.qa/seo-frontend/browser/browser-summary.json>) → **10 PASS / 2 FAIL / 0 BLOCKED**; [основной прогон](<../../.qa/seo-frontend/browser/report.json>), [точечный повтор](<../../.qa/seo-frontend/browser/report-retry.json>), [focused assertions/network/axe](<../../.qa/seo-frontend/browser/focused-report.json>), [дополнительные states](<../../.qa/seo-frontend/browser/states-report.json>). [Штатный runner report](<../../.qa/seo-frontend/browser/live-run/report.json>) → 0/2 из-за axe, не функционального crash.

| ID | Итог | Фактически проверено / evidence |
|---|---|---|
| M01 | PASS | Реальный anonymous `/seo`→`/login`, без SEO calls; injected GET401/refresh401 bounded — основной report |
| M02 | PASS | Четыре tab, default Метрика, мышь и ArrowLeft/Enter — focused report; динамический live-region учтён в locator |
| M03 | PASS | Реальные SUPERUSER/DEVELOPER без ADMIN: forbidden/no SEO calls; ADMIN injected403 видим — [permission](<../../.qa/seo-frontend/browser/forbidden-developer.png>) |
| M04 | PASS | Оба header-only search, debounce300, trim/literal `%`, `_`, `\`, clear/reset offset — основной report |
| M05 | PASS после fix | Исходный reset bug воспроизведён, затем закрыт: обе таблицы25/25→50/0, без промежуточного50/50; следующий page50/50 работает — targeted recheck |
| M06 | PASS | Intercepted 60-row/long/loading/empty/502/retry/stale race — retry report; [long table](<../../.qa/seo-frontend/browser/table-long.png>), [error](<../../.qa/seo-frontend/browser/table-error.png>) |
| M07 | PASS | Обе intercepted list_all коллекции по11, page2 без GET/query, reopen reset; loading/empty/read502/retry — основной/states reports |
| M08 | PASS | Реальные POST201 обеих коллекций через Enter/plus, canonical/trim/#, validation до API; только уникальные QA values — основной report |
| M09 | PASS | Явные mocks POST409/400/403/401/502/network, double-submit lock, pending context/Esc и201+GET error; retry только GET — retry report |
| M10 | PASS | Реальные cancel/noDELETE и DELETE204 обоих своих UUID; mocked404/403/502, double-confirm, last-page clamp,204+refresh error — основной report |
| M11 | PASS после FE-FIX-2 | Filter/scroll/ARIA/контраст исправлены; hidden sizing-кнопка disabled и не получает Tab/programmatic focus во всех8 состояниях двух ресурсов, включая sort remount; финальный report |
| M12 | PASS | Только два созданных QA UUID удалены и отсутствие подтверждено realGET; прежняя привязка Метрики/Вебмастер сохранены, tenant hint/peer calls отсутствуют — основной report |

Реальные таблицы содержат мало строк: pagination/long/race и >10 rules проверены **явными browser fixtures**, без импорта/resolve/правок БД. Mutation happy paths — **не mocks**: два POST201 и два DELETE204; cleanup обоих UUID подтверждён в `created` основного report и [повторным read-only GET после возобновления](<../../.qa/seo-frontend/browser/cleanup-check.json>) 25.10: оба200, UUID отсутствуют, новых mutations0. Для recheck обновлена истёкшая сессия; первый UI login вновь потребовал прогрева, повтор успешен. Пользовательские правила/привязки не изменялись. Browser401/403 не доказывают заново серверную tenant isolation; все8 boundary contracts остаются результатом auto unit.

Console/page/network: page errors и неожиданных live5xx нет; resource errors401 anonymous и injected400/401/403/404/409/502/ERR_FAILED ожидаемы и сохранены в reports, не скрыты. HTTP error bodies задаются очищенными `QA ...` fixtures в [script](<../../.qa/seo-frontend/browser/manual.mjs>). Трассы перечислены в summary; ключевой [focused trace](<../../.qa/seo-frontend/browser/focused-trace.zip>), [live modal trace](<../../.qa/seo-frontend/browser/live-run/live-normalization-desktop/trace.zip>). Credentials/cookies/headers с секретами в отчёт не выводились.

Визуально через `read_image` проверены desktop states: реальная таблица/модалка, long table/list, nested confirm, permission, empty, loading rules и обе ошибки; список просмотренного — `visualInspection` summary. Наложений/горизонтального overflow нет, поля/иконки/пагинация/оба dialog помещаются; [long confirm](<../../.qa/seo-frontend/browser/confirm-long-focus.png>), [list](<../../.qa/seo-frontend/browser/normalization-long.png>), [loading](<../../.qa/seo-frontend/browser/rules-loading.png>), [refresh error](<../../.qa/seo-frontend/browser/post-refresh-error.png>). После повторного GET ошибка refresh закономерно становится обычной read error. Исходный недостаточный контраст пояснения после FE-FIX-1 закрыт (16.56:1). Tablet/mobile не проверялись.

## Targeted rechecks FE-FIX-1/2 — 25.10, итог APPROVED

[FE-FIX-1 handoff](<../../.qa/seo-frontend/fe-fix-1/handoff.md>): SEO332/API80, scoped axe2, lint/typecheck/format/strict validate PASS. После него QG закрыл F01/F02/F04, выявил F03-R1 (`aria-hidden-focus` sizing-копии). История: [recheck summary](<../../.qa/seo-frontend/browser/recheck-summary.json>), [network/axe](<../../.qa/seo-frontend/browser/recheck-report.json>), [keyboard/контраст](<../../.qa/seo-frontend/browser/recheck-detail.json>). Первый F04 assertion исправлял только QA selector отсутствующего ancestor, затем contrast измерен корректно.

Пользователь **явно разрешил дополнительный fix и проверку F03-R1** через Router. [FE-FIX-2 handoff](<../../.qa/seo-frontend/fe-fix-2/handoff.md>): SEO334, scoped axe2, ESLint/typecheck/strict validate PASS; native disabled только для hidden sizing-копии. QG независимо выполнил [rebuild/production build PASS](<../../.qa/seo-frontend/browser/fix2-rebuild.json>), [ADMIN login PASS](<../../.qa/seo-frontend/browser/fix2-login.json>) на прежнем Docker URL, без repair/замещающего сервера. Прежний полный suite1043 остаётся исходной auto-проверкой; после fixes — targeted suites и новый production build, не повтор всего suite/CRUD.

| Finding | Итог независимой проверки |
|---|---|
| F01 | Закрыт: оба ресурса25/25→50/0 без промежуточного50/50, следующий обычный page50/50 |
| F02 | Закрыт: action сосед tablist, нет `aria-required-children`, четыре tabs сохранены |
| F03/F03-R1 | Закрыт: hidden sizing Button disabled, без tabindex; programmatic focus остаётся на region, Tab пропускает hidden descendants. Видимый Tab/Enter/autofocus/Esc работает без сортировки; PageDown реально scrollTop0→350 |
| F04 | Закрыт: rgba(0,0,0,0.88) на белом, contrast16.56:1, secondary отсутствует, axe не отмечает пояснение |

Финальный запуск: `source scripts/qa/browser-env.sh && node .qa/seo-frontend/browser/fix2-recheck.mjs` → **8/8 PASS**, оба ресурса × no-sort/asc/desc/clear, включая каждый MainTable remount. [Machine-readable итог](<../../.qa/seo-frontend/browser/final-summary.json>), [report/network/axe/DOM](<../../.qa/seo-frontend/browser/fix2-report.json>), [script](<../../.qa/seo-frontend/browser/fix2-recheck.mjs>), [trace](<../../.qa/seo-frontend/browser/fix2-trace.zip>). `aria-hidden-focus`, `scrollable-region-focusable`, `aria-required-children`, button-name/nested-interactive — нарушений0 во всех8 состояниях. Неожиданных critical/serious0; shared heading/tab contrast и отсутствие h1 остаются документированными pre-existing, не waiver новых findings.

Console/page errors0, failed requests0, HTTP5xx0, **SEO mutations0**. Только1366×768, readonly browser fixtures; полный M01..M12 и реальные CRUD повторно не запускались, прежний cleanup остаётся подтверждённым. Финальные screenshots [Страницы](<../../.qa/seo-frontend/browser/fix2-page-scroll.png>) и [Запросы](<../../.qa/seo-frontend/browser/fix2-query-scroll.png>) просмотрены через `read_image`: видимый focus, header/controls/scroll помещаются, overlap/overflow нет. Продуктовый код/specs QG не менял.

### Backend
Доработки не требуются.
### Frontend
- [x] FE-FIX-1/2 выполнены исполнителем, все findings закрыты QG; дополнительных доработок нет.
### Quality Gate
- [x] Итоговый gate **APPROVED**, M01..M12 накопительно12 PASS / 0 FAIL / 0 BLOCKED. Waivers отсутствуют; sync/archive/штатная финализация остаются за Router по пользовательским approval gates.
