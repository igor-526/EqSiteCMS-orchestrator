# Design

Задача: уточнение после `docs/tasks/100_seo_frontend.md`. Дата: 2026-10-26. Сервис: `services/frontend`.

## Context

Мотивация — `proposal.md`. Проверен текущий код и тесты, а не намерения архивного плана; runtime/browser в PLAN не запускались. Предыдущие QG/1043 PASS и a11y fixes — переданный Router исторический контекст, не результат этого change.

### Сравнение эталона и SEO

| Аспект | «Услуги и цены» — фактический код | SEO — фактический код | Решение |
|---|---|---|---|
| Композиция | `PricesTable`: column.filterIcon + filterDropdown через MainTable | `SeoValueHeader` внутри title, самостоятельный Popover | Нативный column.filterDropdown, без второго popup |
| Триггер/активность | SearchOutlined, синий #1677ff при фильтре; стандартная область справа | маленький Button рядом с текстом, primary при search | Стандартное положение и синий поиск без заливки; filtered из применённого search |
| Содержимое | StringFilter, padding 8, Input + отдельная небольшая danger outlined «Очистить» | Popover с Input allowClear, только крестик; dataFilter padding 8, width 280 | Общий StringFilter и кнопка; padding 8 в одном месте, компактная ширина 280 допустима для desktop |
| Ввод | StringFilter вызывает trim на каждом change; тесты закрепляют legacy | hook хранит сырой draft, trim после 300 мс | Сохранить SEO-семантику opt-in настройкой StringFilter, legacy default не менять |
| A11y | StringFilter не имеет явного label/ref, keyboard/focus native dropdown не доказан | имена, autofocus, Escape/focus return, disabled sizing Button, focusable scroll body | Добавить безопасные opt-in параметры; реальный AntD проверять, дефекты не копировать |
| Сортировка | MainTable адаптирует sorter, remount по currentSort | тот же MainTable + SEO mapping page/query | Не менять mapping, API и MainTable |

Источники: `src/features/prices/ui/Price/PricesTable.tsx`, `src/ui/MainTable.tsx`, `src/ui/filters/{StringFilter.tsx,filter.styles.ts,filters.test.tsx}`, `src/features/seo/ui/{SeoDataTable.tsx,SeoDataTable.test.tsx,seoStyles.ts}`, `src/features/seo/hooks/{useSeoDataTable.ts,useSeoDataTable.test.ts}` (все от `services/frontend`). Main specs `cms-seo-data-ui` и `cms-seo-yandex-ui` прочитаны полностью. Последняя остаётся неизменной: ни Яндекс, ни навигация не получают новых требований.

## Goals / Non-Goals

Единообразие двух SEO-фильтров по образцу колонки «Наименование», не перенос группового ListFilter. Нет дополнительного Apply/«Найти», поиска над таблицей, фильтра дат или расширения CMS-wide scope. Не изменять API, tenant, права, нормализацию, Метрику, Вебмастер, MainTable и таблицы цен. Mobile/tablet не реализуются.

## Decisions

1. Задать строковый title, `filterIcon`, controlled `filtered=Boolean(table.filters.search)` и `filterDropdown` в колонке значения `SeoDataTable`. Нельзя полагаться на `selectedKeys`/`confirm` AntD как на источник серверного фильтра: источником остаётся hook. Не задавать `onFilter` (никакой локальной фильтрации). Не позволять filter-change событию случайно вызвать changeSort со сбросом сортировки: проверить реальный Table, не вызывать confirm для ввода/очистки, которые уже запускают server search. Отдельный Popover удалить.
2. Переиспользовать StringFilter, а не копировать input+button. Добавить опциональный `trimOnChange` (default true, для SEO false), `inputAriaLabel` и `inputRef` (AntD InputRef) для фокуса. Старые props и default сохраняются; существующие тесты trim/undefined не переписывать под новую семантику. SEO преобразует callback undefined в `changeSearch("")`. Кнопка «Очистить» остаётся из shared UI; новый MUI не добавлять.
3. Открытие панели контролируется локально в SEO через column.filterDropdownProps, а не в API/hook. После открытия фокус Input через ref; Escape закрывает и возвращает на видимый native filter trigger этой колонки; за пределами панели клик закрывает её без очистки. Очистка оставляет панель открытой. Имена «Фильтр: Страница/Запрос», «Поиск: Страница/Запрос», состояние раскрытия на самом фокусируемом триггере. Не создавать вложенную кнопку: filterIcon — только иконка. Если native trigger требует aria/focus адаптации, локализовать её в SEO (эффект в границах panelRef, повтор после sort remount), не патчить глобально MainTable/AntD.
4. Нельзя просто удалить sizing-защиту вместе с SeoValueHeader: native filter trigger тоже проверяется в aria-hidden клоне. Локальная SEO-адаптация обязана исключить sizing-контролы и из Tab, и из программного focus (для native button — disabled, одного tabindex=-1 недостаточно); видимый trigger остаётся активен. Сохранить focusable `.ant-table-body` после каждого remount. Если установленная версия AntD не позволяет безопасно выполнить контракт локально, вернуть blocked и уточнить scope, а не начать общую миграцию MainTable.
5. Hook без продуктовых изменений: debounce ровно 300 мс, немедленный clear, search literal/trim, page/query ordering, reset offset, независимость состояний и generation guard уже реализованы. Допускаются только дополнительные регрессионные тесты. Индикатор отражает применённый search, не draft. Ввод/clear/open/close не меняют ordering/limit.
6. Общий filter.styles не менять без необходимости; локальная панель SEO использует dataFilter, удалить только ставший неиспользуемым dataHeader. Статические стили — antd-style. ESLint rollout CMS-wide, warn→error и миграция prices/gallery/news/siteSettings здесь неприменимы: это bounded UI унификация, не lint rollout. SEO уже использует isApiError из apiStatus, новые API status проверки не нужны.

## Access matrix

Endpoint changes отсутствуют. Нормативная полная матрица восьми операций остаётся в `openspec/specs/cms-seo-data-ui/spec.md#access-matrix`, без изменений/новых исключений. Для затронутого чтения регрессионный срез:

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/seo/pages` | Protected GET exception | только ADMIN | 401 | ADMIN 200; без ADMIN 403; query 400; downstream 502 |
| GET | `/api/seo/search-queries` | Protected GET exception | только ADMIN | 401 | ADMIN 200; без ADMIN 403; query 400; downstream 502 |

Причина существующего исключения Public Read: приватные SEO-данные конюшни. Tenant остаётся из сессии, selector не добавляется. Anonymous `/seo` → login, authenticated non-ADMIN (включая SUPERUSER/DEVELOPER) → forbidden без запросов. Guards hooks, общий 401 flow и видимый 403 сохраняются. Изменения Protected Write отсутствуют, расширять тестирование всех mutation flows заново не требуется; существующие access/mutation тесты выполняются в regression.

## Deliverables и ownership

- **A / Frontend**: `services/frontend/src/ui/filters/StringFilter.tsx`, `.../filters.test.tsx`, `services/frontend/src/features/seo/ui/SeoDataTable.tsx`, `.../SeoDataTable.test.tsx`, `.../seoStyles.ts`, `services/frontend/src/features/seo/hooks/useSeoDataTable.test.ts`. Один владелец tightly-coupled интеграции; MainTable, prices, hook runtime и API read-only. Specs capability cms-seo-data-ui закреплены за этим deliverable по реализации, без самостоятельной правки main spec до sync.
- **B / Quality Gate**: verification-only, evidence `.qa/seo-header-filter-consistency/{qg,manual}/`; единственный отчёт `docs/reports/seo-header-filter-consistency.md` принадлежит QG. Продуктовые файлы QG не меняет; findings возвращаются Frontend в те же пути A.
- **C / Router**: этот OpenSpec change и будущий sync только `openspec/specs/cms-seo-data-ui/spec.md`, archive после approval/QG; не отдельный агентный invocation.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| FE-1 | Frontend | A | перечисленные шесть файлов A | пользовательский approval | targeted filters+SEO+prices tests; scoped lint; typecheck; полный npm test один раз в конце FE |
| QG-FE-MANUAL | Quality Gate | B | `.qa/.../manual/**` | FE-1 | scripted browser+visual/axe, M01–M07 на 1366×768 |
| QG | Quality Gate | B | `.qa/.../qg/**`, `docs/reports/seo-header-filter-consistency.md` | QG-FE-MANUAL | QG-LITE: review, npm test/lint/tsc/build, синтез |

DAG: `approval → FE-1 → QG-FE-MANUAL → QG → Router sync/validate → archive/finalization approval`.
Нет параллельных ownership-записей. FE-1 — один UI slice, 6 файлов, 8–10 существенных действий; browser verification выделена. QG-LITE достаточен: нет backend/API/security policy изменений; backend/NATS/DB lanes неприменимы. Проверки tasks/handoff/короткий checkpoint входят в свой unit, не отдельные invocations.

### contextFiles по units

- FE-1: этот design (Decisions/Test matrix), delta `specs/cms-seo-data-ui/spec.md`, `src/features/prices/ui/Price/PricesTable.tsx`, `src/ui/MainTable.tsx`, `src/ui/filters/{StringFilter.tsx,filters.test.tsx,filter.styles.ts}`, `src/features/seo/ui/{SeoDataTable.tsx,SeoDataTable.test.tsx,seoStyles.ts}`, `src/features/seo/hooks/{useSeoDataTable.ts,useSeoDataTable.test.ts}`. Пути src относительно services/frontend.
- QG-FE-MANUAL: раздел M01–M07 этого design, delta, FE-1 handoff, `agents/howto/browser-qa-protocol.md`, skill ui-qa; runtime discovery через stack-control при необходимости. Без чтения архива целиком.
- QG: proposal, delta, раздел Test matrix этого design, FE/manual handoffs, `services/frontend/package.json`, `openspec/specs/cms-seo-yandex-ui/spec.md`, существующие `src/features/seo/services/seoDataService.test.ts`, `src/api/seo.test.ts` (наличие подтвердить при запуске), QG rules. Нет повторного восстановления изменений по всему монорепозиторию.

## Test matrix

Команды из services/frontend. Unit/component/API-boundary только mocks/MSW, без live backend. Имена прежних UT-SEO остаются; новые SF-IDs трассируют delta.

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| SF-01 StringFilter | opt-in raw input/ref/label | legacy trimmed/whitespace/clear undefined + opt-in сохраняет multiword/пробелы, поле именовано, ref focus | нейтральный primitive | `npm test -- src/ui/filters/filters.test.tsx` |
| SF-02 обе SEO таблицы | стандартный dropdown вместо Popover | parametrized component: data/loading/empty/error+retry, один видимый filter trigger только value, явная очистка, нет toolbar input, draft callback и blue applied indicator | ADMIN render; forbidden без контролов | `npm test -- src/features/seo/ui/SeoDataTable.test.tsx` |
| SF-03 взаимодействие | a11y без прежних hacks title | real AntD provider: Tab/Enter/Space, autofocus, Escape/focus return, outside click; clear/open/close не вызывают sort, очистка не закрывает; sizing focus невозможен после asc/desc/clear, keyboard scroll сохраняется | ADMIN | та же component suite, M02–M04 |
| SF-04 hook | контракт неизменен | success/empty/error; apply 299/300 мс, trim literal %_\\, immediate clear/cancel queued draft; initial 25/0, page 25, size reset 0, filter/sort reset 0; sort asc/desc/clear mapping; изоляция и race | ADMIN; scope missing/revoke blocks API | `npm test -- src/features/seo/hooks/useSeoDataTable.test.ts` |
| SF-05 access/API boundary | без изменений | существующие seo API/service/page tests: anonymous 401 refresh/login, ADMIN success, non-ADMIN local no-call/403, 400/502/network error различимы от empty; tenant/DTO неизменны | anonymous, ADMIN, SUPERUSER/DEVELOPER без ADMIN | `npm test -- src/features/seo src/api/seo.test.ts`; M01/M06 |
| SF-06 цены и границы | backward compatibility | StringFilter default/PricesTable interactions unchanged, без site-* imports, новых fetch/axios/DTO page/pageSize и runtime hook изменений | прежние prices scopes | `npm test -- src/features/prices/ui/Price/PricesTable.test.tsx src/ui/filters/filters.test.tsx`; scoped grep/diff review |

FE targeted группа: `npm test -- src/ui/filters/filters.test.tsx src/features/seo src/api/seo.test.ts src/features/prices/ui/Price/PricesTable.test.tsx`; scoped eslint изменённых ts/tsx и `npm run typecheck`. Затем один полный `npm test` в конце FE-1. QG повторяет независимый gate `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Уже существующие чужие failures классифицировать отдельно, не чинить без scope. Self-check через grep (rg в текущем окружении нет) новых imports site-*, fetch/axios, page/pageSize в diff назначенных файлов; существующие UI-local page controls не объявлять нарушением.

## Manual QA steps (UI тестирование)

Предусловия: поднятый CMS/backend, fixtures >25 строк и длинные значения в обеих таблицах; доступные тестовые сессии anonymous/ADMIN/non-ADMIN. Применять skill ui-qa и browser QA protocol: scripted evidence плюс визуальная инспекция, не только exploratory MCP. Только viewport 1366×768. Все шаги пройти для pages и queries, не менять боевые данные.

1. **M01 / доступ:** anonymous прямой `/seo` → login; non-ADMIN (включая SUPERUSER/DEVELOPER) → forbidden и ноль `/api/seo/**`/`/api/yandex/**`; ADMIN → четыре вкладки и таблицы. Изменённые фильтры не обходят guards.
2. **M02 / эталон:** открыть `/prices`, фильтр «Наименование», затем `/seo` → «Страницы»/«Запросы». Сравнить стандартное положение SearchOutlined, отсутствие залитой кнопки, padding/input/отдельную маленькую «Очистить». Скриншоты эталона и обеих SEO таблиц; длинные строки, дата, пагинация и popup без overlap/clipping, нет горизонтального scroll страницы.
3. **M03 / клавиатура:** Tab к видимому фильтру, Enter/Space → поле с видимым фокусом; ввести `  два слова %_\\  `, Tab к «Очистить», Escape → фокус на видимый trigger. Outside click закрывает без очистки. Повторить после каждого сортировочного remount; скрытые measure-контролы отсутствуют в tab order и не фокусируются программно. Scroll region достижима; axe serious/critical = 0 для открытой/закрытой панели.
4. **M04 / поиск и очистка:** со второй страницы ввести текст, Network до 300 мс без нового search, после — trim search и offset=0. Нет локальной фильтрации поверх ответа. Закрытие/открытие сохраняет draft; blue indicator по applied search. «Очистить» сразу убирает search, отменяет pending draft, сохраняет ordering/limit, offset=0, popup открыт. После 300 мс старый search не возвращается; пустой результат отличим от ошибки.
5. **M05 / сортировка и pagination:** asc/desc/clear отправляют только page/-page или query/-query/отсутствие ordering; offset=0. Изменение фильтра не меняет sort. Начально limit=25 offset=0, следующая offset=25; size change → offset=0. Вкладки сохраняют свои фильтры, сортировку и страницу; отложенные ответы не подменяют текущие. Дата без filter/sorter.
6. **M06 / ошибки и регрессии:** в контролируемой mock/proxy сессии GET 400/403/502/network → видимая ошибка+retry, не empty/success; 401 → штатный auth flow, не обход guards. После retry success таблица восстановлена. Яндекс.Метрика и заглушка Вебмастера открываются по существующему сценарию, нормализация не затронута. Protected Write flow не менялся — проверить отсутствие diff guards/mutations, не делать destructive live операции.
7. **M07 / цены:** повторить поиск и «Очистить» в `/prices`, проверить прежнюю trim-семантику, сортировку, группы и permissions без изменений. Записать passed/failed M01–M07, screenshots, axe/keyboard evidence, для failed API network status/body в `.qa/seo-header-filter-consistency/manual/`; вернуть findings и handoff для QG, не создавать второй reports-файл.

## Risks / Trade-offs

- [Native filter trigger и measure clone зависят от AntD] → тесты с реальным AntD, локальная адаптация по жизненному циклу remount; не принимать один tabindex=-1 как решение.
- [Legacy StringFilter aggressive trim] → default сохраняется ради остальных CMS, raw opt-in только SEO; отдельная массовая миграция не предлагается.
- [Общий primitive затронут] → opt-in без новых зависимостей, legacy/цены regression; если требуется широкая правка, остановиться с предложением split.
- [Существующие dirty changes задачи099/DSH] → не трогать и не выполнять git/ship; причины отказа проверок фиксировать по evidence.

## Migration Plan

После approval — FE-1, независимый UI manual, единый QG-LITE. Исправления findings возвращаются владельцу A с точечным rerun; затем Router sync delta, strict validate и archive по отдельным gates. Rollback — возврат только UI изменений этого change и opt-in props, без миграций БД/API. Никакого apply или финализации на этапе PLAN.

## Open Questions

Блокирующих технических вопросов нет. На approval предлагается подтвердить выбранный единый UX: отдельная «Очистить» как в ценах, без Apply/«Найти», с сохранением SEO debounce и необрезанного draft. Вопрос не отложен на исполнителя: это рекомендуемое поведение уже зафиксировано в delta; при несогласии требуется корректировка change до apply.
