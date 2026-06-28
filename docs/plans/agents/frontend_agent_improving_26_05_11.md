# План: Улучшение Frontend Agent для CMS-контура

**Тикет:** frontend_agent_improving_26_05_11
**Дата:** 2026-05-11
**Затронутые сервисы:** `services/frontend`, `agents/frontend.md`
**Ветка:** `feature/frontend-agent-improving-26-05-11`

---

## Контекст

План подготовлен по задаче `docs/tasks/frontend_agent_improving_26_05_11.md`. Пользователь запросил аудит frontend части CMS, сравнение строгости `agents/frontend.md` с `agents/backend.md` и план улучшения Frontend Agent без реализации до согласования.

Фактический CMS frontend находится в `services/frontend` и является Protected Admin контуром. Публичные сайты-потребители семейства `site-*` не входят в scope этого плана.

### Что уже есть в `agents/frontend.md`

| Область | Текущее состояние | Вывод |
|---|---|---|
| Роль и границы | Описаны `services/frontend`, запрет на устаревшие FSD-слои, базовый поток `page -> feature ui -> hook -> service -> api` | Хорошая база, но меньше операционной строгости, чем у Backend Agent |
| Структура сервиса | Зафиксированы `src/api`, `src/app`, `src/features`, `src/hooks`, `src/lib`, `src/types`, `src/ui` | Нужно расширить правилами для таблиц, фильтров, прав, документационных разделов и self-check |
| Access policy | Есть базовое разделение CMS/public и `UI flow -> endpoint access class` | Не хватает матриц UI actions/scopes и проверок anonymous/authenticated поведения |
| Тесты | Указано "новый код без тестов" | Не хватает конкретных frontend-команд, уровней проверок, smoke-сценариев и отчета о завершении |
| Инструменты самоконтроля | Есть список запретов | Нет grep/rg-чеков, чеклиста перед передачей Quality Gate и правил для типичных CMS-паттернов |

### Фактический аудит `services/frontend`

| Область аудита | Найденные паттерны | Найденные пробелы для отражения в агенте |
|---|---|---|
| Таблицы | Общий `src/ui/MainTable.tsx` на Ant Design Table, серверная сортировка через `onSortChange/currentSort`, отдельный `TablePaginator`, таблицы фич в `src/features/*/ui/*Table.tsx` | Нет явной инструкции, когда использовать `MainTable`, как оформлять `key/dataIndex/sort`, как отделять actions column, как не смешивать frontend sort mapping с API sort без явного адаптера. В `MainTableProps` есть опечатка `сolumns` кириллической `с`, агенту нужен запрет размножать этот контракт без плана миграции |
| Фильтры | Есть generic `StringFilter`, `ListFilter`, фильтры в AntD `filterDropdown`, query params живут в hooks/types | Нет единого правила empty state (`undefined`/`null`/`""`), reset pagination on filter change, debounce, range filters, multi-select values, связь с backend `~*` text search. `StringFilter` делает `trim()` на каждом `onChange`, что может влиять на ввод |
| Пагинация | `TablePaginator` работает через `limit/offset`; `news` использует локальный page-based UI state и AntD Pagination прямо на странице | Нужно закрепить единый backend-контракт `limit/offset`, вынести управление пагинацией во frontend reusable pagination filter/control и запретить добавлять `page/limit` как API-контракт без отдельной backend/API миграции |
| Инструкции разделов | Есть `*DocumentationView` для horses/prices/siteSettings/news; вкладки инструкций подключены на страницах | Нет общей схемы разделов `USER_DOCS/ADMIN_DOCS/DEVELOPER_DOCS`, нет правила доступа к инструкциям, нет требования держать примеры кода как документацию, а не рабочую интеграцию |
| Права доступа | `UserContext` получает `scopes`; action scopes есть в `prices` и `news`; `layout` не фильтрует меню по scopes; `horses`, `siteSettings`, `gallery` без явных scope registry | Нужна унифицированная система `FeatureAction -> scopes`, матрица видимости tab/button/modal/action, distinction UX-hide vs backend authorization, и обязательное тестирование "нет scope" |
| API-контур | `src/api/client.ts` централизует cookies/refresh; `auth.ts` использует raw `fetch` для auth endpoints; сервисы фич импортируют `@/api/*` | Нужно явно закрепить raw `fetch` как исключение только для `src/api/client.ts` и auth API, запретить API-вызовы из `page.tsx`/components. В документационных view есть `fetch(...)` в code snippets, агент должен отличать текст примера от runtime-кода |
| Страницы | `horses/page.tsx`, `prices/page.tsx`, `news/page.tsx` содержат много modal/orchestration state и handlers | Текущий `frontend.md` запрещает логику в `page.tsx`, но фактический код уже нарушает это. Нужна миграционная инструкция: новый код выносить в feature hooks/containers, существующий не расширять без плана |
| Типы | `src/types` есть, но локальные props/types встречаются во многих компонентах и hooks | Текущий полный запрет локальных `type/interface` слишком жесткий относительно факта. Нужно уточнить: DTO/domain/query/filter типы только в `src/types`, локальные UI props допустимы рядом с компонентом до отдельной миграции или после явного решения |
| UI kit | Основной UI на Ant Design, но также есть MUI icons и Tailwind utility classes | Нужно закрепить AntD как основной UI kit, `@ant-design/icons` для новых иконок, MUI не расширять без причины, Tailwind utility classes допустимы только как существующий вспомогательный слой или после отдельного решения |
| Проверки | `package.json` содержит `dev`, `build`, `start`, `lint`; `tsconfig.json` strict/noEmit; тестовых runner'ов/config'ов не найдено | Нужно добавить в agent self-check: `npm run lint`, `npx tsc --noEmit`, `npm run build`; тесты планировать после выбора runner (`Vitest/RTL` для unit/component, Playwright для smoke/e2e) |

## Цель

После согласования и реализации этого плана `agents/frontend.md` должен стать практическим регламентом уровня строгости `agents/backend.md` для CMS frontend:

- давать агенту таблицы "куда класть код", "как строить таблицы/фильтры", "как оформлять права";
- фиксировать Protected Admin контур `services/frontend` и запрет смешения с `site-*` Public Read;
- описывать action-scope систему для UI видимости и мутаций;
- закреплять единый frontend/backend pagination contract `limit/offset` и reusable frontend pagination filter/control;
- задавать инструменты самоконтроля: статический аудит через `rg`, lint/typecheck/build, тестовую матрицу, smoke-проверки;
- вводить протокол завершения работы и передачи на Quality Gate;
- не менять frontend-код и не переписывать агент до согласования плана.

Критерий приемки плана: файл содержит фактический аудит, target-структуру будущего `agents/frontend.md`, порядок работ, access matrix и чеклист для Frontend/Quality Gate.

---

## Детали реализации

### Backend

Backend не меняется.

#### Новые сущности и файлы

| Что | Путь | Описание |
|---|---|---|
| Нет изменений | - | API, БД, миграции и backend-тесты не входят в scope |

#### API контракт

Новые endpoint'ы не добавляются, существующие endpoint'ы не меняются.

Пагинация для CMS frontend должна следовать существующему backend-контракту `limit/offset`. Frontend может показывать пользователю page-based control, но это только UI-представление: reusable pagination filter/control обязан преобразовывать выбранную страницу и размер страницы в `{ limit, offset }` для query DTO/API calls. Формат `page/limit` не считается допустимым frontend/backend API-контрактом и не должен добавляться или расширяться без отдельного плана backend/API миграции.

#### Схема БД

Миграции не нужны.

### Frontend

Код `services/frontend` на этапе планирования не менять. Будущая реализация после согласования должна обновить только агентские инструкции и, при необходимости, сопутствующую документацию.

#### Новые/обновляемые файлы

| Что | Путь | Описание |
|---|---|---|
| План | `docs/plans/frontend_agent_improving_26_05_11.md` | Этот deliverable |
| Инструкции Frontend Agent | `agents/frontend.md` | Обновить после согласования плана |
| Задача | `docs/tasks/frontend_agent_improving_26_05_11.md` | Использовать как исходный контекст, не менять без отдельного запроса |

#### Target-структура будущего `agents/frontend.md`

| Раздел | Что добавить/уточнить | Основание аудита |
|---|---|---|
| Роль и контуры | Явно: `services/frontend` = Protected Admin CMS; `site-*` = Public Read consumer; Frontend Agent не меняет consumer-контур | `SERVICES.md`, текущий `agents/frontend.md` |
| Фактическая архитектура | Таблица директорий + dependency rules, аналогично Backend Agent | `src/api`, `src/app`, `src/features`, `src/ui`, `src/types` |
| Куда класть новый код | Таблица "page/feature hook/feature service/API/types/ui/filter/table/docs/scopes" | Сейчас правила есть текстом, но без операционной таблицы |
| Таблицы | Правила `MainTable`, columns, `key`, server sort, actions column, row click, scroll/height, pagination, запрет дублировать table primitives | `MainTable`, `SiteSettingsTable`, `NewsTable`, `PricesTable`, horses tables |
| Фильтры | Правила `StringFilter/ListFilter`, reusable pagination filter/control, date range, debounce, reset `offset` при изменении фильтров, empty-value normalization, query DTO alignment | `StringFilter`, `ListFilter`, `TablePaginator`, `NewsTable`, `GalleryFilters` |
| Документационные разделы | Стандарт вкладок и naming для user/admin/developer instructions; code snippets только как docs text | `*DocumentationView`, tabs in pages |
| Access/scopes | Единая модель `FeatureAction -> scopes`, registry per feature, `hasPermission`, матрица UI actions; UX-hide не заменяет backend authorization | `UserContext`, `usePriceScopes`, `useNewsScopes` |
| API-клиент и auth | Разрешить raw `fetch` только в `src/api/client.ts` и auth API; все feature services через `src/api` | `api/client.ts`, `api/auth.ts`, services imports |
| Page migration rule | Не расширять orchestration-heavy `page.tsx`; новый modal/state/use-case orchestration выносить в feature hooks/containers | `horses/page.tsx`, `prices/page.tsx`, `news/page.tsx` |
| Типы | DTO/query/filter/domain types только в `src/types`; локальные UI props допускаются как существующий паттерн, но не для API/domain contracts | `rg` показал локальные props/types во многих UI-файлах |
| Styling/UI kit | AntD как основной kit; `@ant-design/icons` по умолчанию; MUI icons/Tailwind utility не расширять без причины | `package.json`, UI files |
| Тестирование | Команды lint/typecheck/build; план внедрения Vitest/RTL, MSW и Playwright; smoke checklist и количественные минимумы для CMS flows | Нет текущих test configs |
| Self-check tools | `rg`-команды для запретов: direct fetch, API imports in page/ui, local DTO types, shared/widgets/entities, missing scopes, page logic | Аналог Backend Agent self-control |
| Протокол завершения | Стандартизированный отчет: изменены файлы, тесты, checks, access/scopes, QG readiness | Аналог Backend Agent |

#### Access matrix

Так как этот план не меняет API, матрица фиксирует контур и будущие проверки, а не новые endpoint'ы.

| Method | Path / UI flow | Access class | Roles / scopes | Expected without auth | Expected with auth |
|---|---|---|---|---|---|
| GET | CMS route `/dashboard`, `/horses`, `/site-settings`, `/gallery`, `/prices`, `/news` | Protected Admin UI | User must have authenticated session; feature actions additionally require scopes | Redirect to `/login` or blocked by auth guard | Route renders if authenticated; action visibility follows feature scope registry |
| GET | CMS read calls from `services/frontend` to backend | Protected Admin context for CMS UI; backend may expose public GET separately for `site-*` | Authenticated CMS session; sensitive GET may require backend auth | Current UI should redirect/refresh auth on `401`; future tests must assert no anonymous CMS screen access | Data loads through `src/api/*` and feature services |
| POST/PATCH/DELETE | CMS mutations: create/update/delete/reorder/upload/batch actions | Protected Write | Authenticated user + action scope where applicable | `401`/redirect to login or backend `401/403`; no UI action should be reachable as enabled control | Mutation allowed only for permitted action; backend remains source of authorization truth |
| POST | Auth flow `/auth/login`, `/auth/refresh`, `/auth/logout` | Explicit auth exception | Login/refresh/logout contract | Login can be public; refresh/logout depend on cookies | Session established/refreshed/cleared according to backend contract |
| GET | `site-*` public content consumption | Public Read | Not owned by `services/frontend` | Public site can read without CMS auth | Not part of CMS frontend implementation |

Исключения: для этой задачи новых исключений нет. Существующий auth `POST` является допустимым исключением из default Protected Write и должен оставаться явно описанным в `agents/frontend.md`.

#### Планируемые self-check команды для будущего Frontend Agent

| Проверка | Команда | Что ловит |
|---|---|---|
| Direct fetch вне API | `rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'` | Runtime API-вызовы вне `src/api`; исключить code snippets в documentation views вручную |
| API imports в UI/pages | `rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'` | Нарушение цепочки `feature service -> src/api` |
| Page/limit API pagination | `rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'` | Выявить page-based state/DTO; допустим только UI state внутри reusable pagination control с маппингом в `limit/offset`, не API query contract |
| Устаревшие FSD-слои | `find services/frontend/src -maxdepth 2 -type d \\( -name shared -o -name widgets -o -name entities \\)` | Создание запрещенных директорий |
| Локальные DTO/domain types | `rg -n "type .*Dto|interface .*Dto|type .*Query|interface .*Query" services/frontend/src -g '*.{ts,tsx}'` | DTO/query/filter типы вне `src/types` |
| Scope registry | `rg -n "SCOPES_ACTIONS|ScopesRegistry|hasPermission|KNOWN_USER_SCOPES" services/frontend/src/features services/frontend/src/contexts` | Есть ли права для новых feature actions |
| Page orchestration | `rg -n "useState|useEffect|useMemo|useCallback|from ['\\\"]@/api|from ['\\\"]@/features/.*/services" services/frontend/src/app -g 'page.tsx'` | Рост логики в `page.tsx` |
| Проверки проекта | `cd services/frontend && npm run lint && npx tsc --noEmit && npm run build` | ESLint, TypeScript strict, Next build |

#### План тестирования будущих результатов Frontend Agent

| Уровень | Инструмент | Что проверять |
|---|---|---|
| Static/self-check | `rg`, ESLint, TypeScript, Next build | Архитектурные запреты, типы, сборка |
| Unit | Vitest + React Testing Library после отдельного добавления зависимостей | Hooks/services без DOM, filter normalization, permission helpers, pagination mapping, table sort mapping |
| Component | React Testing Library | Таблицы, фильтры, reusable pagination control, reset `offset` on filter change, модалки, disabled/hidden actions by scopes |
| API boundary mocks | MSW после отдельного добавления зависимостей | Feature services и API client behavior на границе HTTP: success/error/loading, `401/403`, retry/refresh expectations, DTO/query serialization |
| Smoke/e2e | Playwright после отдельного добавления config | Login redirect, protected CMS routes, CRUD happy path, forbidden action visibility, no public consumer API mixing |
| Manual QA | Browser on `http://localhost:3000` | Layout, AntD visual regressions, table scroll/filter UX |

Текущий `services/frontend/package.json` не содержит test runner. Поэтому будущий `agents/frontend.md` должен требовать lint/typecheck/build сейчас, а unit/component/API-boundary/e2e тесты планировать как отдельный инфраструктурный шаг перед обязательным применением.

#### Практическая стратегия покрытия текущего frontend-кода

Цель покрытия: сначала зафиксировать поведение общих primitives и наиболее рискованных CMS flows, затем требовать тесты для каждого нового изменения. Тесты не должны ходить в реальный backend; для unit/component используется мок сервисов или MSW, для Playwright - подготовленный тестовый backend/seed или стабильные route mocks, выбранные отдельным инфраструктурным планом.

| Приоритет | Что покрыть первым | Минимальный набор сценариев |
|---|---|---|
| P0 static | Архитектурные запреты и сборка | `rg` self-check, `npm run lint`, `npx tsc --noEmit`, `npm run build` на каждый diff Frontend Agent |
| P1 shared table primitives | `MainTable`, `TablePaginator`, будущий reusable pagination filter/control | 1 render with data, 1 loading/empty state, 1 sort callback, 1 pagination mapping `{ page, pageSize } -> { limit, offset }`, 1 page size change resets/calculates offset |
| P1 filters | `StringFilter`, `ListFilter`, date/range/multi-select filters in features | 1 apply value, 1 clear value normalized to agreed empty state, 1 debounce case where applicable, 1 reset `offset` on any filter change |
| P1 permissions/scopes | `UserContext`, feature scope registries, `usePriceScopes`, `useNewsScopes`, future registries for missing features | 1 allowed action visible/enabled, 1 missing scope hidden/disabled, 1 mutation blocked in UI, 1 backend `401/403` surfaced without enabling action |
| P1 API boundary | `src/api/client.ts`, `src/api/auth.ts`, feature services | 1 success response mapping, 1 query serialization with `limit/offset`, 1 validation/error response, 1 auth refresh/redirect path where applicable |
| P2 feature UI | Feature tables/modals/forms in `horses`, `prices`, `news`, `gallery`, `siteSettings` | 1 happy render, 1 loading state, 1 error state, 1 empty state, 1 primary action with permitted scope, 1 forbidden action state |
| P2 protected pages | CMS route guards and page containers after migration out of orchestration-heavy `page.tsx` | 1 anonymous redirect to `/login`, 1 authenticated render, 1 no `site-*` public API usage, 1 docs tab renders snippets as text rather than runtime API calls |
| P3 smoke/e2e | High-value CMS flows | login redirect, authenticated navigation to key routes, read table data, create/update/delete or reorder for one representative protected mutation, forbidden action visibility |

#### Количественные правила для Frontend Agent

Эти правила должны попасть в `agents/frontend.md` после согласования плана.

| Тип изменения | Минимум тестов/checks |
|---|---|
| Любое frontend-изменение | Все применимые `rg` self-check + `npm run lint` + `npx tsc --noEmit` + `npm run build` |
| Новый или измененный hook/service/helper | Минимум 3 unit scenarios: success/base case, empty/edge input, error/exception path |
| Новый или измененный filter/search/sort behavior | Минимум 4 scenarios: apply, clear/normalize empty value, debounce or no-debounce expectation, reset `offset`; для sort - field mapping и clear sort |
| Новый или измененный pagination behavior | Минимум 4 scenarios: initial `limit/offset`, page change, page size change, filter change resets `offset`; запрет `page/limit` в API DTO проверяется тестом или статическим self-check |
| Новый или измененный permissioned action | Минимум 4 scenarios: scope present, scope missing, disabled/hidden UX, backend `401/403` handling; UI hiding не засчитывается как authorization |
| Новый или измененный table/list component | Минимум 5 component scenarios: data render, loading, empty, error, user interaction callback; если есть actions - добавить permission case |
| Новый или измененный modal/form mutation | Минимум 5 scenarios: open/close, valid submit, validation error, backend error, success invalidation/refresh; если mutation protected - добавить permission case |
| Новая feature page или крупный flow | Минимум 1 smoke/e2e scenario на happy path и 1 negative/protected scenario; до Playwright-инфраструктуры эти сценарии фиксируются как manual QA steps в отчете |
| Исправление регрессии | Минимум 1 тест, который падает на старом поведении и проходит после исправления; если тестовая инфраструктура еще не создана, в плане задачи явно указать, какой тест будет добавлен после инфраструктуры |

Если изменение затрагивает несколько категорий, Frontend Agent берет объединение обязательных cases, но может не дублировать один и тот же сценарий на разных уровнях, если он явно покрывает один риск. Для мелких текстовых правок без runtime-поведения достаточно static/self-check и объяснения, почему unit/component/smoke не применимы.

---

## Порядок выполнения

1. Получить согласование этого плана у пользователя.
2. Frontend Agent: обновить `agents/frontend.md` по target-структуре, без изменений `services/frontend`.
3. Frontend Agent: добавить в `agents/frontend.md` таблицы правил для таблиц, фильтров, документационных вкладок, scopes, тестирования и self-check.
4. Frontend Agent: зафиксировать текущие фактические исключения и миграционные правила, чтобы агент не ломал существующий код массовым рефакторингом.
5. Quality Gate: проверить diff только по агентским инструкциям и соответствие аудиту/плану.
6. После отдельного согласования можно планировать второй этап: тестовая инфраструктура frontend (`Vitest/RTL`, `MSW`, затем Playwright) и возможная миграция orchestration-heavy pages.

---

## Чеклист

> ⚠️ Этот раздел используется агентами для отслеживания прогресса.
> Агент обязан менять `[ ]` → `[x]` после выполнения каждого пункта.
> Оркестратор парсит именно этот раздел.

### Backend

- [x] Подтвердить, что backend, API endpoints, БД и миграции не меняются в рамках этой задачи
- [x] Подтвердить, что новых исключений из API Access Policy не добавляется

### Frontend

- [x] Обновить `agents/frontend.md`: добавить раздел с Protected Admin CMS контуром и запретом смешения с `site-*` Public Read
- [x] Обновить `agents/frontend.md`: добавить таблицу фактической архитектуры `services/frontend/src`
- [x] Обновить `agents/frontend.md`: добавить таблицу "куда класть новый frontend-код"
- [x] Обновить `agents/frontend.md`: добавить dependency rules для `src/api`, `src/app`, `src/features`, `src/ui`, `src/types`, `src/lib`
- [x] Обновить `agents/frontend.md`: добавить правила для `MainTable`, columns, server sort, row click, actions column и pagination
- [x] Обновить `agents/frontend.md`: явно зафиксировать, что контракт `сolumns` с кириллической буквой в `MainTable` не размножается без отдельного плана миграции
- [x] Обновить `agents/frontend.md`: добавить правила для `StringFilter`, `ListFilter`, date/range filters, debounce и empty-value normalization
- [x] Обновить `agents/frontend.md`: добавить правило reset `offset` при изменении фильтров
- [x] Обновить `agents/frontend.md`: описать единый backend pagination contract `limit/offset`
- [x] Обновить `agents/frontend.md`: добавить reusable frontend pagination filter/control, который может отображать page-based UI, но в query DTO/API передает только `limit/offset`
- [x] Обновить `agents/frontend.md`: запретить `page/limit` как API-контракт без отдельной backend/API миграции
- [x] Обновить `agents/frontend.md`: добавить стандарт документационных вкладок user/admin/developer и их naming
- [x] Обновить `agents/frontend.md`: добавить правило, что `fetch(...)` в documentation views допустим только как текстовый code snippet, не runtime-вызов
- [x] Обновить `agents/frontend.md`: добавить систему `FeatureAction -> scopes -> hasPermission -> UI visibility`
- [x] Обновить `agents/frontend.md`: добавить матрицу прав для tabs/buttons/modals/actions/mutations
- [x] Обновить `agents/frontend.md`: зафиксировать, что UI hiding/disabled не заменяет backend authorization
- [x] Обновить `agents/frontend.md`: добавить правило для `UserContext`, menu visibility и feature scope registries
- [x] Обновить `agents/frontend.md`: добавить исключение для raw `fetch` только в `src/api/client.ts` и auth API
- [x] Обновить `agents/frontend.md`: добавить миграционное правило для существующих orchestration-heavy `page.tsx`
- [x] Обновить `agents/frontend.md`: уточнить правила типов: DTO/query/filter/domain types только в `src/types`, локальные UI props отдельно
- [x] Обновить `agents/frontend.md`: добавить правила UI kit: AntD first, `@ant-design/icons` для нового кода, MUI/Tailwind не расширять без причины
- [x] Обновить `agents/frontend.md`: добавить frontend self-check `rg` команды
- [x] Обновить `agents/frontend.md`: добавить обязательные команды `npm run lint`, `npx tsc --noEmit`, `npm run build`
- [x] Обновить `agents/frontend.md`: добавить тестовую стратегию current/future для lint/typecheck/build, Vitest/RTL, MSW, Playwright
- [x] Обновить `agents/frontend.md`: добавить приоритеты покрытия текущего кода: shared tables, filters, pagination control, permissions/scopes, API boundary, protected pages, docs snippets
- [x] Обновить `agents/frontend.md`: добавить количественные минимумы тестов/checks для hooks/services, filters, pagination, permissioned actions, tables/lists, modals/forms, feature pages и regression fixes
- [x] Обновить `agents/frontend.md`: зафиксировать обязательные loading/error/empty states для новых или измененных UI flows
- [x] Обновить `agents/frontend.md`: зафиксировать, что тесты не ходят в реальный backend; API boundary мокается сервисами или MSW, а e2e требует отдельный test backend/seed или route mocks
- [x] Обновить `agents/frontend.md`: добавить протокол завершения работы Frontend Agent перед Quality Gate
- [x] Не менять `services/frontend` код в рамках реализации этого плана без отдельного согласования

### Quality Gate

- [ ] Проверить, что diff после реализации затрагивает `agents/frontend.md` и, при необходимости, только согласованную документацию
- [ ] Проверить, что `agents/frontend.md` не противоречит `SERVICES.md` по CMS/Public Read контурам
- [ ] Проверить, что правила Access Policy для Protected Admin CMS и Protected Write мутаций отражены явно
- [ ] Проверить, что исключение auth `POST` описано отдельно и не открывает общий write-контур
- [ ] Проверить, что правила таблиц соответствуют текущим `MainTable`, `TablePaginator` и feature tables
- [ ] Проверить, что правила пагинации закрепляют только backend-контракт `limit/offset`, reusable pagination filter/control и reset `offset` при изменении фильтров
- [ ] Проверить, что `page/limit` не описан как допустимый API-контракт без отдельной backend/API миграции
- [ ] Проверить, что правила фильтров соответствуют текущим `StringFilter`, `ListFilter`, `NewsTable`, `GalleryFilters`
- [ ] Проверить, что правила scopes учитывают `UserContext`, `usePriceScopes`, `useNewsScopes` и пробелы в `horses/siteSettings/gallery`
- [ ] Проверить, что self-check команды не требуют отсутствующего test runner как обязательного текущего шага
- [ ] Проверить, что будущие Vitest/RTL/MSW/Playwright указаны как отдельная инфраструктурная задача, если зависимости еще не добавлены
- [ ] Проверить, что правила тестирования содержат количественные минимумы для каждого типа frontend-изменения
- [ ] Проверить, что тестовая стратегия покрывает Protected Admin UI, scope-based actions, `401/403`, loading/error/empty states и отсутствие смешения с `site-*`
- [ ] Проверить, что pagination tests/self-checks закрепляют `limit/offset`, reusable pagination control и запрет `page/limit` в API DTO
- [ ] Проверить, что протокол завершения Frontend Agent содержит список файлов, тесты/checks, access/scopes и готовность к Quality Gate
