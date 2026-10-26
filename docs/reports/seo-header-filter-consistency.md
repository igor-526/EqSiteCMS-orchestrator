# Quality Gate: seo-header-filter-consistency

**Профиль:** QG-LITE · **Дата:** 2026-10-26
**Единый итоговый UI verdict: APPROVED.** Auto PASS; M01–M07 покрыты, первичный M03 FAIL устранён FE-FIX-1 и подтверждён единственным targeted R1 recheck. Новых serious/critical нет; известный baseline вне scope сохранён. Waiver не требуется и не выдавался. Продуктовый код QG не менял.

## Контекст и ссылки

Унификация фильтров SEO с ценами: native column dropdown, общий StringFilter с opt-in raw draft/ref/label, локальная keyboard/sizing адаптация. Default фильтра, API, tenant, ADMIN guards и runtime hook не меняются.

- Change: `openspec/changes/seo-header-filter-consistency/` — `proposal.md`, `design.md`, `tasks.md`, `specs/cms-seo-data-ui/spec.md`.
- Источник: `docs/tasks/100_seo_frontend.md`, уточнение после seo-frontend; approval/FE-1 done переданы Router.
- База access: `openspec/specs/cms-seo-data-ui/spec.md#access-matrix`; регрессия `openspec/specs/cms-seo-yandex-ui/spec.md`.
- По заданию Router применяется **auto → manual**, вопреки обратной зависимости таблицы tasks/design. Scope/specs не менялись.
- Проверка в текущем dirty-дереве; сторонняя работа root/backend/seo-service/DSH и предшествующий seo-frontend не изменялись. Ветка change в design не задана.

## Lanes

| Lane | Состояние |
|---|---|
| QG-FE-AUTO | пройден: tests/lint/tsc/build, review SF-01–06 |
| QG-CONTRACTS | пройден: delta, access, backward compatibility, strict validate |
| QG-FORMAT | пройден: scoped layout dry-run без изменений; lint без errors |
| QG-ENV | пройден: frontend rebuild ok/running, backend healthy; плановых rebuild 2 (первичный + R1 recheck), repair/restart attempts 0 |
| QG-FE-MANUAL | пройден scoped: M01–M07 + targeted R1 recheck, только 1366×768; R1 закрыт |
| QG-BE / QG-LIVE / NATS / DB | неприменимо: нет runtime API/backend/messaging/schema diff |
| Makefile-контракт | неприменимо: Makefile/tooling не менялись |
| QG-SYNTH | APPROVED: R1 исправлен владельцем A и перепроверен QG |

## Назначенные продуктовые пути

От корня монорепозитория; QG продуктовые файлы не редактировал:

- `services/frontend/src/ui/filters/StringFilter.tsx`
- `services/frontend/src/ui/filters/filters.test.tsx`
- `services/frontend/src/features/seo/ui/SeoDataTable.tsx`
- `services/frontend/src/features/seo/ui/SeoDataTable.test.tsx`
- `services/frontend/src/features/seo/ui/seoStyles.ts`
- `services/frontend/src/features/seo/hooks/useSeoDataTable.test.ts`

SEO-файлы частично untracked от предыдущего change: полный HEAD diff не выдаётся за diff текущего change. На FE-1 стили сверены с входным snapshot: удалён dataHeader; FE-FIX-1 затем добавил только локальную SEO palette clear, без изменения default StringFilter/prices. MainTable, PricesTable, API и hook runtime — read-only.

## Frontend test gate

Все четыре команды выполнены **последовательно**, без одновременного typecheck/test.
Evidence prefix: `.qa/seo-header-filter-consistency/qg/`.

| Команда из services/frontend | Результат | Evidence |
|---|---|---|
| `npm test` | exit 0; 91 файл, 1057 passed, 0 failed | `test.log` |
| `npm run lint` | exit 0; 0 errors, 435 warnings | `lint.log` |
| `npx --no-install tsc --noEmit` | exit 0 | `tsc.log` |
| `npm run build` | exit 0; production build, 19 static pages | `build.log` |
| scoped `eslint --fix-dry-run --fix-type layout` | exit 0; все 6 файлов без layout changes; 2 warnings | `format-dry-run.json`, `format-summary.log` |
| OpenSpec launcher `validate seo-header-filter-consistency --strict` | exit 0, valid | `openspec-validate.log` |

Exit codes: `exit-codes.tsv`, `format-exit-code.tsv`, `openspec-exit-code.tsv`.
Dry-run вместо мутирующего format соответствует запрету QG чинить код; исходники не менялись.

Self-check (`self-check.log`): в scoped файлах нет новых direct fetch/axios, UI API imports, site-* mixing, DTO pageSize/page_size, статических inline styles; legacy FSD dirs не созданы. Pagination API остаётся limit/offset. JSX handlers вынесены; status helpers/бизнес-логика остаются в прежних слоях.

Качество тестов: реальные AntD/MainTable/StringFilter, параметризация pages/queries, не только render snapshots. Hook/service mocks и MSW (`onUnhandledRequest: error`) исключают необходимость live backend. Проверены success/empty/error, retry, debounce/clear/races, permissions и contract boundaries. Browser evidence дополнено отдельным manual unit: штатный runner и расширенный сценарий, результаты ниже; unit tests не выдаются за browser PASS.

## Покрытие test matrix

| ID | Фактическое auto evidence | Остаток |
|---|---|---|
| SF-01 | `filters.test.tsx`, 8 tests: legacy trim/clear + raw multiword/whitespace/ref/name | нет |
| SF-02 | `SeoDataTable.test.tsx`, 22 tests: обе таблицы, header-only, applied active class, clear, loading/empty/error/retry/forbidden | M02 visual PASS |
| SF-03 | тот же real AntD suite: Tab/Enter/Space/autofocus/Escape/outside, no sort, clear stays open, inert sizing + программный focus и scroll после asc/desc/clear remount | M03 keyboard/geometry PASS; R1 axe PASS после fix |
| SF-04 | `useSeoDataTable.test.ts`, 26 tests: 299/300 мс, raw/trim literal, clear/cancel с сохранением sort/limit, limit-offset/reset, mapping, races/изоляция, revoke | M04–M05 PASS |
| SF-05 | `api/seo.test.ts`, 80 tests; `seoDataService.test.ts`, 22; SeoPage, 12; useSeoScopes и прочие SEO tests в полном suite | M01/M06 browser access/errors PASS |
| SF-06 | PricesTable, 7 tests; StringFilter legacy tests; scoped review/self-check, неизменные API/hook runtime | M07 prices interaction PASS |

Числа относятся к соответствующим файлам, не являются квотой покрытия. Визуальная/axe проверка не заявляется пройденной по jsdom.

## Access verification results

Новых/изменённых endpoints нет. Существующее исключение Public Read для приватных SEO GET остаётся ADMIN-only; tenant из сессии, selector не добавлен.

- Anonymous: MSW 401 → общий refresh; denied refresh не даёт success/retry. Проверены обе таблицы и остальные операции существующей матрицы.
- Authenticated ADMIN: exact request/result, credentials include, нет X-Equestrian-Id/tenant query/body; limit/offset/search/ordering сохранены.
- Без ADMIN, включая SUPERUSER/DEVELOPER: SeoPage/useSeoScopes/hook tests запрещают UI/API; revoke блокирует retry/search/sort. HTTP 403 остаётся error без refresh/ложного success; 400/502/network различимы от empty.
- Новых Protected Write flows нет; существующая regression suite выполнена без destructive live операций. M01: anonymous → login; реальные SUPERUSER/DEVELOPER без ADMIN → forbidden и ноль SEO/Yandex calls; ADMIN → четыре вкладки/live reads. M06: обе таблицы 400/403/502/network → error+retry → восстановление, 401+refresh401 без success. В manual не было tenant header или live CRUD. Серверное enforcement заново не проверялось: API runtime diff отсутствует.

## Findings и ограничения

- **blocking:** нет; R1 закрыт targeted browser recheck после FE-FIX-1. Auto/review регрессий не обнаружили.
- **minor:** два scoped `unicorn/no-useless-undefined` — legacy clear callback и новый assertion его контракта. Не основание менять undefined-семантику. Остальные 433 warnings вне scope; lint/build успешны, массовый rollout не входит в change.
- **Pre-existing:** serious contrast неизменённых shell header grey (3.94:1) и SEO tabs blue (4.1:1), moderate h1/portal landmarks; прежняя палитра shared clear в prices также недоступна (`manual/prices-baseline-axe.json`). Не блокируют сами по себе; не исправлялись. Предложение Router: отдельная `docs/tasks/cms-accessibility-baseline.md` (не создавалась).
- **blocked-env:** нет в выполненной auto части. **Waivers:** нет.
- Manual evidence собрано; новый clear теперь соблюдает запрет новых serious. Gate APPROVED относится к scoped change; дальнейшие sync/archive/finalization выполняет Router по approval gates.

Детали review: `.qa/seo-header-filter-consistency/qg/review.md`; scoped diff: `scoped-tracked.diff`; статус после: `frontend-status-after.txt`. Полные логи не копируются в отчёт.

## Browser QA — M01–M07 и история до R1 fix

Все пути ниже относительно **M = `.qa/seo-header-filter-consistency/manual/`**. Реальный CMS `localhost:3001`, backend `localhost:8001`; desktop **1366×768**. Нового/подменяющего сервера нет. Контролируемые read-only Playwright routes дают fixtures 75 строк/длинные значения и GET failures; пользовательские данные не изменялись, normalization CRUD не повторялся.

- Runtime: M`stack-status.json`, `rebuild.json` (ok:true), `rebuild.log`, `stack-status-after.json`; плановый rebuild 1, инфраструктурных repair/restart 0, миграции неприменимы.
- Tooling обход: root QA scripts не разрешают bare imports; ignored M`loader.mjs` использует установленный frontend Playwright, M`axe-adapter.mjs` запускает настоящий установленный axe-core без отключения правил. MCP Chrome отсутствует, scripted Chromium работает. Product/tooling code не исправлялся.
- Login helper API200/UI timeout сохранён в M`auth-*-result.json`, не объявлен PASS; использованы существующие admin/superuser/developer storage states, проверенные на реальном `/seo` и обновлённые штатным refresh. Secrets в отчёте отсутствуют.
- Сценарии: M`scenarios.json`, `manual.mjs`; первичный M`report.json`, `manual.log`: **6/7 до fix** (не перезаписывались). Дополнительный M`targeted-report.json`, `targeted.log`: M03 повторно FAIL, M05 PASS (Tab scroll и независимые page/sort/filter).
- Штатный runner: M`run-final/report.json` — **0/2, axe serious**, при этом console/page errors, failed requests и 5xx отсутствуют. Первые попытки/уточнения локаторов: M`attempt1-report.json`, `attempt2-report.json`, `run/report.json`; не итоговый PASS.
- Traces: M`M01-*-trace.zip`, `M02-trace.zip` … `M07-trace.zip`, отдельные `M06-*-trace.zip`; штатные M`run-final/seo-*-open-desktop/trace.zip`.
- Основной run: page errors 0; console — 2 ожидаемых anonymous401 и 12 сообщений контролируемых ошибок M06; request failures — только 2 намеренных abort, 5xx — только 2 намеренных 502. Network/axe nodes в report JSON, status/body/visible error — M`pages-error-*.json`, `search-queries-error-*.json`.

| ID | Результат и фактическая проверка |
|---|---|
| M01 | PASS: раздельные anonymous/ADMIN/SUPERUSER/DEVELOPER live guards, четыре вкладки; access результаты выше |
| M02 | PASS: prices reference и обе SEO таблицы, стандартный SearchOutlined/input/отдельная clear; длинные значения/даты/pagination, popup внутри viewport, document overflow отсутствует |
| M03 | **PASS после targeted R1 recheck** (первично FAIL); keyboard часть PASS до/после asc/desc/clear обеих таблиц: Tab/Enter/Space/autofocus/raw multiword/Tab clear/Escape focus return/outside; hidden inert без Tab и программного focus; scroll достижим Tab после каждого remount |
| M04 | PASS: page2 → debounce/trim literal/offset0; Enter не ускоряет, applied indicator не draft; draft сохраняется при закрытии; clear отменяет pending без потери sort/limit и закрытия панели, empty отличим от error |
| M05 | PASS: page/-page/query/-query/clear, limit25/offset25, size50→offset0; stale old игнорируется; tabs сохраняют filter/size и nontrivial offset50/asc отдельно от query search |
| M06 | PASS: обе таблицы 400/403/502/network error+retry восстановлены, 401/refresh401 без success; loading; live Метрика/Вебмастер; guards/mutations без diff по auto |
| M07 | PASS: реальные prices — прежний trim непосредственно в поле, clear, asc/desc, groups; permissions/код без изменений, writes отсутствуют |

Визуальная инспекция read_image: M`prices-reference.png`, `pages-open.png`, `search-queries-open.png`, `pages-keyboard-focus.png`, `pages-empty.png`, `search-queries-error.png`, `pages-loading.png`. Геометрия/ellipsis/date/focus/popup корректны, нет clipping/горизонтального overflow страницы; первичный текст clear не проходил contrast, исправление подтверждено ниже. Непроверенных M-ID нет; SF-03 acceptance после fix выполнен. Отдельный API SMOKE неприменим: API runtime diff отсутствует, destructive live операции запрещены.

## R1 — закрыт после FE-FIX-1 / targeted recheck

**История, до fix:** новый текст «Очистить» в обеих SEO dropdown: `#ff4d4f` на `#ffffff`, 14px, contrast **3.26:1 < 4.5:1**, axe `color-contrast`, **serious**. ADMIN `/seo` → «Страницы» или «Запросы» → SearchOutlined → дождаться анимации → axe. Повторяется после sort; critical нет. До fix новая экспозиция clear в изменённом SEO flow не удовлетворяла delta «Полный клавиатурный цикл»/M03; дефект старой shared палитры не повод отключать gate или расширять fix на prices.
Место интеграции: `services/frontend/src/features/seo/ui/SeoDataTable.tsx:119–123`, локальный `seoStyles.ts:106–109`; источник унаследованного цвета `StringFilter.tsx:47–53`. Evidence: M`targeted-report.json` (pages-open/search-queries-open, точные nodes), `run-final/report.json`, M03 trace и screenshots.

**Единственный targeted recheck после FE-FIX-1: PASS**, реальный rebuild frontend M`r1-rebuild.json`, health M`r1-stack-before.json`/`r1-stack-after.json`; дополнительных repair 0. Сценарий M`r1-recheck.mjs`, результаты M`r1-recheck-report.json`, `r1-recheck.log`, trace `r1-recheck-trace.zip`. Полный M suite/CRUD не повторялись.
- Обе панели: computed text/background normal `#a61d24/#ffffff` = **7.4399:1**, реальные hover/keyboard focus-visible/pressed active `#820014/#ffffff` = **10.7183:1**; 8 измерений ≥4.5, outline focus-visible 3px сохранён.
- Настоящий axe: **10 scans**, normal/hover/focus/active/open + closed обеих таблиц; **новых serious/critical 0**. Оставшиеся serious относятся только к ранее зафиксированным header/tab, не к clear. Штатный runner M`run-r1/report.json` честно остаётся 0/2 из-за этих baseline nodes, а не R1; правила/порог runner не ослаблялись. Это pre-existing classification, не самостоятельный waiver.
- В обеих таблицах после asc/desc/clear: Enter/Space/autofocus/raw literal, clear немедленно отменяет pending search и сохраняет ordering/limit/open; Escape возвращает фокус, hidden inert не фокусируется, scroll достижим Tab. Регрессий нет. Console/page errors/request failures/5xx **0**, live writes **0**.
- Визуально read_image проверены M`r1-pages-normal.png`, `r1-pages-focus.png`, `r1-queries-normal.png`, `r1-queries-focus.png`: читаемый тёмно-красный текст/граница, явный focus ring, неизменные layout/padding/геометрия. Hover/active имеют измеренные те же цвета/белый фон, что focus.
- FE-FIX-1 evidence `.qa/seo-header-filter-consistency/fe-fix-1/`: targeted **435 PASS / 19 файлов**, scoped format/lint/typecheck exit0; fix только SEO `seoStyles.ts` и `SeoDataTable.test.tsx`. Предыдущие full suite1057/lint/tsc/build сохранены, полный suite для bounded palette fix не повторялся.

## Чеклист доработки — закрыт

### Backend
Не требуется.

### Frontend
- [x] Router → **FE-FIX-1**, владелец A: обеспечить локальный SEO contrast clear ≥4.5:1 в обеих панелях; ownership SEO `seoStyles.ts`/`SeoDataTable.tsx` + scoped tests. Default StringFilter/prices, padding, keyboard/search/API не менять. Verification: targeted SEO/filter tests, scoped lint/typecheck, browser axe открытых панелей + visual. Не расширять до глобальной theme-задачи.

### Quality Gate
- [x] После fix rebuild frontend, targeted M03/затронутые M02/M04 и штатные live axe выполнены; R1 закрыт, QG.4 подтверждена.
- Manual execution и QG.1–5/QG.V завершены; единый verdict APPROVED. Открытых scoped findings нет. Sync/archive/ship не запускались. QG изменил только tasks и этот единственный отчёт; остальные артефакты ignored в M.
