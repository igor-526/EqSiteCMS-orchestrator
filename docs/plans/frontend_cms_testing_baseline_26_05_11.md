# План: Baseline тестирования CMS frontend

**Тикет:** frontend_cms_testing_baseline_26_05_11
**Дата:** 2026-05-11
**Затронутые сервисы:** `services/frontend`
**Ветка:** `feature/frontend-cms-testing-baseline-26-05-11`

---

## Контекст

`services/frontend` - это Protected Admin CMS UI для EqSiteCMS. Он работает в авторизованном CMS-контуре, использует protected admin API backend-сервиса и не должен смешиваться с публичными сайтами-потребителями `site-*`.

На момент подготовки плана в `services/frontend/package.json` отсутствует test runner и test scripts. Доступные команды: `dev`, `build`, `start`, `lint`. В зависимостях нет явной тестовой инфраструктуры `Vitest`, `React Testing Library`, `jsdom`, `MSW` или `Playwright` как прямых dev-зависимостей проекта, поэтому этот план описывает будущий baseline без реализации кода и без добавления зависимостей.

Фактические зоны риска текущего frontend-кода:

| Область | Текущий факт | Риск для регрессий |
|---|---|---|
| Таблицы | Есть общий `src/ui/MainTable.tsx`, feature tables и серверная сортировка через `currentSort/onSortChange` | Поломка mapping сортировки, loading/empty states, columns/actions |
| Пагинация | `src/ui/TablePaginator.tsx` работает через `limit/offset`; часть UI может быть page-based | Регрессия backend-контракта, неверный `offset`, отсутствие reset offset |
| Фильтры | Есть `StringFilter`, `ListFilter`, feature filters | Неконсистентная нормализация пустого значения, сброс фильтров, reset pagination |
| Auth/scopes | `UserContext`, `usePriceScopes`, `useNewsScopes`; не все фичи имеют явный scope registry | Действия могут отображаться или запускаться без прав |
| API boundary | `src/api/*`, feature services, auth/client flow | Прямые runtime `fetch`, неверная сериализация query, неявная обработка `401/403` |
| Feature flows | `prices`, `news`, `horses`, `gallery`, `siteSettings` | Мутации Protected Write, модалки, таблицы, empty/error/loading states |

## Цель

Подготовить отдельный план покрытия текущего CMS frontend тестами, который после согласования позволит Frontend Agent добавить минимальную тестовую инфраструктуру и первые регрессионные тесты без изменения API-контрактов.

Критерии приемки будущей реализации по этому плану:

- в `services/frontend` добавлен baseline unit/component/API-boundary test stack;
- первые тесты покрывают shared primitives, filters, pagination, scopes/auth helpers и API serialization;
- unit/component/API-boundary тесты не ходят в реальный backend;
- Protected Admin UI behavior проверяется отдельно для anonymous/authenticated, scope present/scope missing, `401/403`;
- `site-*` Public Read контур не используется и не меняется;
- существующие P0 checks остаются обязательными до появления тестового runner'а и после него.

---

## Детали реализации

### Backend

Backend не меняется.

#### Новые сущности и файлы

| Что | Путь | Описание |
|---|---|---|
| Нет изменений | - | API, endpoint'ы, БД, миграции и backend-код не входят в scope |

#### API контракт

Новые endpoint'ы не добавляются, существующие endpoint'ы не меняются.

Тесты frontend должны проверять поведение на границе API через mocks:

- unit/component/API-boundary тесты используют mocked services или MSW;
- реальные backend-запросы в unit/component/API-boundary tests запрещены;
- Playwright smoke/e2e добавляется позже и требует отдельного решения: test backend + seed data или route mocks;
- `POST/PATCH/DELETE` остаются Protected Write;
- auth `POST` endpoint'ы остаются явным исключением из общего правила protected write.

#### Схема БД

Миграции не нужны.

### Frontend

Код, зависимости и `package.json` в рамках создания этого плана не меняются. Будущая реализация должна идти по этапам.

#### Новые/обновляемые файлы

| Что | Путь | Описание |
|---|---|---|
| План | `docs/plans/frontend_cms_testing_baseline_26_05_11.md` | Этот deliverable |
| Test runner config | `services/frontend/vitest.config.*` или эквивалент | Будущий этап 1, после согласования |
| Test setup | `services/frontend/src/test/setup.*` или `services/frontend/test/setup.*` | Будущий setup `jsdom`, RTL matchers, mocks |
| Test utilities | `services/frontend/src/test/*` или `services/frontend/test/*` | Render helpers, providers, fixtures, MSW setup |
| Unit/component tests | `services/frontend/src/**/*.test.ts(x)` или согласованный `__tests__` pattern | Первые P1/P2 regression tests |
| Playwright config | `services/frontend/playwright.config.*` | Будущий этап 3, не в baseline unit/component шаге |

#### Этап 0: текущий P0 baseline без test runner

Пока test runner отсутствует, обязательный baseline качества для любого frontend-diff:

| Проверка | Команда | Ожидаемый результат |
|---|---|---|
| ESLint | `cd services/frontend && npm run lint` | Нет lint errors |
| TypeScript | `cd services/frontend && npx tsc --noEmit` | Нет type errors |
| Production build | `cd services/frontend && npm run build` | Next build проходит |
| Self-check direct fetch | `rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'` | Runtime-вызовы только в разрешенном API/auth boundary; documentation snippets проверяются вручную |
| Self-check API imports | `rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'` | Нет прямых API imports в pages/UI вне feature service pattern |
| Self-check pagination contract | `rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'` | `page` допустим только как UI-state/control, API DTO/query остается `limit/offset` |
| Self-check public/admin mixing | `rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'` | CMS frontend не использует consumer-only public site code |
| Self-check test infra fact | `rg -n "\"test\"|vitest|jest|testing-library|msw|jsdom|playwright" services/frontend/package.json services/frontend -g '*.{json,ts,tsx,mjs,js}'` | До этапа 1 фиксирует отсутствие или появление test runner'а |

#### Этап 1: Vitest + React Testing Library + jsdom

Цель этапа: добавить минимальную unit/component инфраструктуру для текущего React/Next кода.

Минимальный состав:

| Часть | Назначение |
|---|---|
| `vitest` | Unit/component runner |
| `@testing-library/react` | Render и пользовательские проверки React-компонентов |
| `@testing-library/user-event` | User interactions |
| `@testing-library/jest-dom` | DOM matchers |
| `jsdom` | DOM environment для component tests |
| setup-файл | Global cleanup, matchers, minimal browser API mocks |
| test scripts | `test`, `test:watch`, возможно `test:coverage` после согласования thresholds |

Первый этап не должен подключаться к реальному backend. API/service calls мокируются на уровне функций или через MSW, если этап 2 выполняется сразу.

#### Этап 2: MSW для API boundary, auth/client, `401/403`

Цель этапа: стабилизировать тесты на HTTP boundary и auth behavior.

MSW должен покрыть:

- success/error responses для `src/api/*`;
- query serialization с `limit/offset`;
- auth/client behavior на `401`, refresh/redirect expectations;
- `403` для отсутствующих scopes;
- Protected Write UX для `POST/PATCH/DELETE`: действие без scope не доступно в UI, backend `403` корректно surfaced при отказе;
- отсутствие реальных network calls в unit/component/API-boundary тестах.

#### Этап 3: Playwright позже для smoke/e2e

Playwright не является блокером для первого baseline. Его нужно добавлять отдельным шагом после unit/component/API-boundary покрытия.

Условия для Playwright:

- выбрать один режим: test backend + seed data или route mocks;
- не использовать случайные live backend данные;
- зафиксировать login/session strategy;
- покрыть только high-value smoke flows, а не дублировать все unit/component tests.

Минимальные smoke/e2e сценарии:

| Сценарий | Что проверить |
|---|---|
| Anonymous CMS access | Anonymous user попадает на `/login` или получает blocked state |
| Authenticated navigation | Authenticated user видит основные CMS routes |
| Forbidden action | Пользователь без scope не может запустить Protected Write action |
| Representative mutation | Один happy path Protected Write flow на стабильных данных |
| Public/admin separation | CMS smoke не зависит от `site-*` Public Read routes |

### Access matrix

| UI/API flow | Access class | Что тестировать |
|---|---|---|
| CMS route `/dashboard`, `/horses`, `/site-settings`, `/gallery`, `/prices`, `/news` | Protected Admin UI | Anonymous redirect/block; authenticated render; no `site-*` dependency |
| CMS read calls from admin UI | Protected Admin context | Calls go through `src/api`/feature services; `401` path surfaced through auth flow |
| CMS mutations `POST/PATCH/DELETE` | Protected Write | Scope-aware UI, disabled/hidden actions, mutation guard, backend `401/403` handling |
| Auth `POST` login/refresh/logout | Explicit auth exception | Login can be public by contract; exception не открывает общий write-контур |
| `site-*` public content reads | Public Read, outside scope | Не тестировать как часть CMS frontend baseline; проверять отсутствие смешения |

Исключения: новых исключений из API Access Policy этот план не добавляет.

### Первые регрессионные тесты

#### P1 shared primitives и contracts

| Объект | Минимальные сценарии |
|---|---|
| `src/ui/MainTable.tsx` | render with data; loading state; empty state; sort callback maps ascend/descend to backend sort array; currentSort restores sortOrder |
| `src/ui/TablePaginator.tsx` или будущий reusable pagination control | initial page from `limit/offset`; page change maps to `offset`; page size change maps to `limit/offset`; filter change resets `offset` in owner hook/control |
| `StringFilter` | apply value; clear value; empty value normalization; no unexpected trim/regression during input if current behavior is preserved |
| `ListFilter` | apply selected values; clear selected values; empty value normalization; multi-value serialization expectation if used |
| Scopes helpers / `UserContext` | authenticated scopes available; missing scope returns false; allowed action visible/enabled; forbidden action hidden/disabled |
| API serialization | `limit/offset` query; sort query; filters query; auth/client `401/403`; no real backend call |

#### P2 risk-oriented feature tests

| Feature | Риск | Минимальные первые тесты |
|---|---|---|
| `prices` | Protected Write, scopes, nested groups/items, reorder/update/delete | table/render; permitted action; missing scope; API error; `401/403` surfaced |
| `news` | Scopes, table sort/filter, modal create/update, docs tabs | table render; sort/filter query; modal submit; forbidden action; docs snippets are text |
| `horses` | Несколько справочников, tabs, docs, validators | tab render; table/list state; create/update validation path; API error; no cross-feature API import |
| `gallery` | Upload/batch actions, photo selection, filters | filters query; batch action permission; loading/empty/error; upload API mocked |
| `siteSettings` | Settings table and create/update modal | table render; modal validation; successful update invalidation/refresh; backend error state |

### Количественные минимумы

Baseline после этапов 1-2:

| Категория | Минимум |
|---|---|
| Test infrastructure | 1 setup-файл, 1 render helper с providers, 1 fixture/mocks module, test scripts в `package.json` |
| Shared primitives | Не меньше 12 tests суммарно для `MainTable`, pagination control, `StringFilter`, `ListFilter` |
| API boundary | Не меньше 8 tests на serialization, success/error, `401/403`, no-real-network behavior |
| Auth/scopes | Не меньше 6 tests на authenticated/anonymous/scope present/scope missing/forbidden mutation |
| Feature regressions | Не меньше 2 tests на каждую P2 feature: `prices`, `news`, `horses`, `gallery`, `siteSettings` |
| Regression fixes после baseline | Каждый bugfix behavior должен добавлять минимум 1 тест, который фиксирует регрессию |

Минимумы для будущих изменений:

| Тип изменения | Минимум тестов/checks |
|---|---|
| Любое frontend-изменение | `npm run lint`, `npx tsc --noEmit`, `npm run build`, применимые `rg` self-checks |
| Hook/service/helper | 3 unit scenarios: base/success, empty/edge input, error path |
| Filter/search/sort | 4 scenarios: apply, clear/normalize, debounce/no-debounce expectation, reset `offset`; для sort - field mapping и clear sort |
| Pagination | 4 scenarios: initial `limit/offset`, page change, page size change, filter change resets `offset` |
| Permissioned action | 4 scenarios: scope present, scope missing, disabled/hidden UX, backend `401/403` |
| Table/list component | 5 component scenarios: data, loading, empty, error, interaction callback |
| Modal/form mutation | 5 scenarios: open/close, valid submit, validation error, backend error, success refresh/invalidation |
| Feature page/flow | 1 smoke/e2e happy path и 1 protected/negative scenario после Playwright; до Playwright - manual QA steps в отчете |

---

## Порядок выполнения

1. Получить согласование этого плана у пользователя.
2. Frontend Agent: добавить Vitest + React Testing Library + jsdom + setup-файл, не меняя runtime-поведение CMS.
3. Frontend Agent: добавить первые P1 tests для `MainTable`, pagination, filters, scopes helpers/UserContext и API serialization.
4. Frontend Agent: добавить MSW API boundary для auth/client, `401/403`, Protected Write UX и no-real-network guarantee.
5. Frontend Agent: добавить P2 feature tests по риск-ориентированному списку: `prices`, `news`, `horses`, `gallery`, `siteSettings`.
6. Quality Gate: проверить P0 checks, test commands, отсутствие реальных backend calls в unit/component/API-boundary tests и соответствие Access Policy.
7. Отдельным будущим планом добавить Playwright smoke/e2e с test backend/seed или route mocks.

---

## Чеклист

> ⚠️ Этот раздел используется агентами для отслеживания прогресса.
> Агент обязан менять `[ ]` → `[x]` после выполнения каждого пункта.
> Оркестратор парсит именно этот раздел.

### Backend

- [x] Подтвердить, что backend-код, API endpoint'ы, БД и миграции не меняются
- [x] Подтвердить, что новых исключений из API Access Policy нет
- [x] Подтвердить, что frontend tests используют mocks/MSW, а не реальный backend, кроме будущего явно настроенного Playwright test backend

### Frontend

- [x] Зафиксировать текущий факт: в `services/frontend/package.json` нет test runner/test scripts, доступны `dev`, `build`, `start`, `lint`
- [x] Добавить `Vitest`, `React Testing Library`, `user-event`, `jest-dom`, `jsdom`
- [x] Добавить setup-файл для test environment и минимальных browser API mocks
- [x] Добавить render helper с CMS providers, включая User/Notification/PageTitle contexts где применимо
- [x] Добавить test scripts в `services/frontend/package.json`
- [x] Добавить первые tests для `MainTable`: render, loading, empty, sort callback, current sort state
- [x] Добавить tests для `TablePaginator` или нового reusable pagination control: `limit/offset`, page change, page size change
- [x] Добавить tests, что изменение фильтров сбрасывает `offset`
- [x] Добавить tests для `StringFilter`: apply, clear, empty normalization
- [x] Добавить tests для `ListFilter`: apply, clear, empty/multi-value behavior
- [x] Добавить tests для scopes helpers/UserContext: authenticated, anonymous, scope present, scope missing
- [x] Добавить API serialization tests для `limit/offset`, sort и filters
- [x] Добавить MSW handlers для success/error/validation/auth responses
- [x] Добавить tests для auth/client `401` и `403`
- [x] Добавить tests для Protected Write UX: action visible/enabled with scope, hidden/disabled without scope, backend denial surfaced
- [x] Добавить P2 tests для `prices`
- [x] Добавить P2 tests для `news`
- [x] Добавить P2 tests для `horses`
- [x] Добавить P2 tests для `gallery`
- [x] Добавить P2 tests для `siteSettings`
- [x] Проверить, что unit/component/API-boundary tests не ходят в реальный backend
- [x] Проверить, что CMS frontend tests не импортируют и не используют `site-*` Public Read consumer code
- [x] Не добавлять Playwright в первый baseline без отдельного решения про test backend/seed или route mocks

### Quality Gate

- [x] Запустить `cd services/frontend && npm run lint`
- [x] Запустить `cd services/frontend && npx tsc --noEmit`
- [x] Запустить `cd services/frontend && npm run build`
- [x] Запустить добавленную test command после этапа 1
- [x] Запустить применимые `rg` self-checks из раздела P0
- [x] Проверить, что test runner/config/setup не меняют production runtime
- [x] Проверить, что unit/component/API-boundary tests используют mocks/MSW и не требуют запущенного backend
- [x] Проверить anonymous/protected UI behavior для CMS routes
- [x] Проверить scope present/scope missing behavior для permissioned actions
- [x] Проверить обработку `401/403`
- [x] Проверить Protected Write UX и отсутствие утверждений, что UI hiding заменяет backend authorization
- [x] Проверить, что `limit/offset` остается API pagination contract и `page/limit` не добавлен как API DTO/query
- [x] Проверить, что `site-*` Public Read контур не входит в scope и не смешан с CMS frontend
- [x] Проверить, что количественные минимумы baseline выполнены или явно отмечены как deferred с причиной
