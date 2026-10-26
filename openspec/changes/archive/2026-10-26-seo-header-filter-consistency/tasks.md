# Tasks — seo-header-filter-consistency

Только после approval. Ownership deliverables A/B/C, DAG, SF-01–SF-06 и M01–M07 заданы в `design.md`. Отмечать только фактически выполненные задачи сразу после проверки; завершать unit handoff по AGENTS.md и останавливаться. При превышении бюджета — partial/split, без расширения scope.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|---|
| FE-1 | Frontend | A | `services/frontend/src/ui/filters/{StringFilter.tsx,filters.test.tsx}`, `src/features/seo/ui/{SeoDataTable.tsx,SeoDataTable.test.tsx,seoStyles.ts}`, `src/features/seo/hooks/useSeoDataTable.test.ts` (src от services/frontend) | approval | targeted SF-01–06, scoped eslint/typecheck; npm test в конце | `design.md` Decisions/Test matrix + FE-1 contextFiles, delta `specs/cms-seo-data-ui/spec.md`, PricesTable, MainTable, StringFilter, SEO UI/hook/tests |
| QG-FE-MANUAL | Quality Gate | B | `.qa/seo-header-filter-consistency/manual/**` | FE-1 | M01–M07, browser/axe/visual desktop | `design.md` Manual QA, delta, FE-1 handoff, browser-qa-protocol, ui-qa |
| QG | Quality Gate | B | `.qa/seo-header-filter-consistency/qg/**`, `docs/reports/seo-header-filter-consistency.md` | QG-FE-MANUAL | QG-LITE, npm test/lint/tsc/build | proposal, delta, design Test matrix + QG contextFiles, frontend package.json, cms-seo-yandex-ui, FE/manual handoffs |

Точные contextFiles и полный список путей — `design.md#contextfiles-по-units` и раздел Deliverables. MainTable/prices/API/hook runtime и чужие dirty changes read-only. Main specs меняет только Router при sync, не исполнитель.

## 1. FE-1 — единый фильтр обеих SEO таблиц (профиль: Frontend)

**Specs:** `cms-seo-data-ui` · **Пути:** A · **Зависит от:** approval.

- [x] FE-1.1 Расширить `StringFilter.tsx` opt-in trimOnChange=false, доступным именем и inputRef без изменения default; проверить старый контракт trim/clear и SF-01.
- [x] FE-1.2 Дополнить `filters.test.tsx` raw multiword/whitespace/ref/label regression; все прежние тесты и новые SF-01 проходят без live API.
- [x] FE-1.3 Заменить SeoValueHeader/Popover на column.filterDropdown + SearchOutlined/filtered в `SeoDataTable.tsx`; подключить общий StringFilter к searchDraft/changeSearch, undefined→пустая строка, без selectedKeys/confirm/onFilter; SF-02 подтверждает header-only и явную очистку обеих таблиц.
- [x] FE-1.4 В том же SEO-компоненте реализовать controlled open, autofocus, имя/expanded native trigger, Escape/focus return, изоляцию sort; SF-03 проверяет Enter/Space/outside click и clear без закрытия/изменения ordering.
- [x] FE-1.5 Сохранить исключение скрытых sizing-контролов из Tab и программного focus и доступность scroll region после каждого remount; SF-03 проверяет asc/desc/clear с реальным AntD, без вложенных кнопок.
- [x] FE-1.6 В `seoStyles.ts` оставить единственный padding панели и компактный layout, удалить только неиспользуемые dataHeader стили; SF-02 и последующий M02 подтверждают отсутствие лишнего UI и overlap.
- [x] FE-1.7 Адаптировать `SeoDataTable.test.tsx` к стандартному filter trigger вместо устаревшего запрета `.ant-table-filter-trigger`; SF-02–03 проходят для pages/queries, loading/empty/error/forbidden не потеряны.
- [x] FE-1.8 Дополнить `useSeoDataTable.test.ts` только недостающими регрессиями SF-04 (pending clear с сохранением sort/limit), выполнить существующие SF-04–06; API 401/403/scopes/tenant и prices default не меняются, hooks runtime не редактировать.
- [x] FE-1.V Выполнить targeted команду SF-01–06 из design, scoped eslint и `npm run typecheck`, один полный `npm test`; no site-* / fetch / DTO-page self-check назначенных путей, сохранить evidence `.qa/seo-header-filter-consistency/fe/`, отметить фактические tasks и вернуть handoff. Полный build/lint остаётся QG.

## 2. QG-FE-MANUAL — визуальная и keyboard проверка (профиль: Quality Gate)

**Specs:** `cms-seo-data-ui`, регрессия `cms-seo-yandex-ui` · **Пути:** B/manual · **Зависит от:** FE-1.

- [x] QG-FE-MANUAL.1 Выполнить M01–M07 по `design.md#manual-qa-steps-ui-тестирование`, включая эталон цен, обе SEO таблицы, anonymous/ADMIN/non-ADMIN, browser errors, 1366×768, scripted keyboard/axe и визуальную инспекцию; сохранить сценарий, результаты, screenshots и failed network evidence в manual ownership.
- [x] QG-FE-MANUAL.V Сверить все M-шаги, отсутствие axe serious/critical и скрытого focus после сортировки, передать Router findings/handoff с evidence; не менять продуктовые файлы и не выпускать отдельный docs/reports файл.

Один manual unit объединяет 7 содержательных браузерных действий M01–M07; чеклист не размножает каждый browser step. Первичный прогон: M01/M02/M04–M07 PASS, M03 FAIL R1. После FE-FIX-1 выполнен единственный targeted browser recheck обеих панелей (normal/hover/focus/active contrast, axe, keyboard/clear/inert/remount) — PASS; R1 и QG.4 закрыты. Итог APPROVED; прежний baseline вне scope сохранён без waiver. Evidence `.qa/seo-header-filter-consistency/manual/r1-recheck-report.json`, единый отчёт актуализирован.

## 3. QG — единый Quality Gate QG-LITE (профиль: Quality Gate)

**Specs:** delta `cms-seo-data-ui`, unchanged guards `cms-seo-yandex-ui` · **Пути:** B/qg + итоговый отчёт · **Зависит от:** QG-FE-MANUAL.

- [x] QG.1 Выполнить scoped code/test review против SF-01–06 и delta, подтвердить сохранность default StringFilter/prices, API/access/tenant и отсутствие site-* mixing; результаты включить в отчёт.
- [x] QG.2 Из `services/frontend` выполнить `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, сохранить выходы/exit codes в qg evidence; чужие baseline failures отделить от findings change.
- [x] QG.3 Сверить качество mocks/MSW/no live calls, debounce/clear/pagination limit-offset, permissions/401/403 и manual keyboard/axe evidence; missing evidence — finding, не объявлять PASS по старому QG.
- [x] QG.4 Направить findings владельцу A через Router и проверить их устранение targeted reruns; не чинить продуктовые файлы/чужие изменения; зафиксировать открытые gaps или отсутствие findings.
- [x] QG.5 Выпустить единственный `docs/reports/seo-header-filter-consistency.md` с verdict и ссылками на evidence; backend/NATS/DB lanes неприменимы, так как контрактов/реализации этих контуров нет.
- [x] QG.V Отметить только подтверждённые задачи, передать Router итоговый handoff/verdict; остановиться до sync/archive/finalization gates.

## Workflow follow-up

- Router после успешного QG синхронизирует delta только в main `cms-seo-data-ui`, выполняет status и strict validate повторно; `cms-seo-yandex-ui` остаётся без diff.
- Router архивирует change и проводит финализацию только по соответствующим approval gates. В PLAN запрещены apply, runtime edits, git и shipctl; чужие dirty changes не исправлять.

## 4. FE-FIX-1 — локальный контраст SEO clear (профиль: Frontend)

Источник: QG R1, `docs/reports/seo-header-filter-consistency.md`. Ownership A; только локальные SEO стили и регрессионные тесты. Defaults StringFilter/prices, API/guards/tenant, padding и keyboard lifecycle не менять.

- [x] FE-FIX-1.1 Исправить normal/hover/focus/active цвета «Очистить» локально в SEO dropdown, контраст текста ≥4.5:1; сохранить outline и layout.
- [x] FE-FIX-1.2 Добавить регрессию цветов/контраста обеих панелей; подтвердить existing keyboard/clear/remount и default StringFilter/prices targeted тестами.
- [x] FE-FIX-1.V Выполнить scoped format/lint и typecheck последовательно с targeted; evidence `.qa/seo-header-filter-consistency/fe-fix-1/`, передать R1 на targeted browser axe/visual recheck тому же manual QG. Отчёт QG и его checkbox не менять.
