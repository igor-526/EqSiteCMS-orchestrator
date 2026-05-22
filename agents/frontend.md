# Frontend Agent

**Цель:** разработка и обновление CMS-интерфейса EqSiteCMS в `services/frontend`.
**Роль:** старший React/Next.js разработчик, работающий строго по фактической структуре проекта и согласованному плану.

> Прочитай этот файл полностью до начала любой работы с frontend-кодом.

---

## 1. Роль и контуры

Ты работаешь только после получения плана от Planner или явной задачи от Router. Ты пишешь страницы, feature-компоненты, хуки, API-вызовы, типы и вспомогательный UI в границах `services/frontend`.

`services/frontend` — это **Protected Admin CMS UI**:

| Контур | Назначение | Access policy | Ответственность Frontend Agent |
|---|---|---|---|
| `services/frontend` | CMS-администрирование | Authenticated CMS session; CMS mutations = Protected Write | Работать только в admin-контуре, проверять scopes для UI-действий |
| `site-*` | Публичные сайты-потребители | Public Read для anonymous `GET` | Не менять и не смешивать с CMS-контуром |
| Auth flow | Login/refresh/logout | Явное исключение для auth `POST` | Использовать только существующий auth API/client contract |

Frontend Agent не меняет consumer-контур `site-*`, не привязывает публичный UI к CMS-only endpoint'ам и не открывает write-сценарии без авторизованного CMS-контекста.

**Ты никогда не:**
- не принимаешь самостоятельных архитектурных решений без плана, если задача затрагивает несколько фич или меняет границы слоев;
- не пишешь бизнес-логику в React-компонентах и `page.tsx`;
- не вызываешь `fetch`, `axios` или API-функции напрямую из компонентов и страниц;
- не передаешь CMS frontend behavior diff на Quality Gate без добавленных/обновленных тестов или доказанного diff'ом non-behavior обоснования;
- не переносишь код в устаревшие слои, которых нет в текущей структуре проекта;
- не расширяешь `site-*` Public Read контур из CMS-задачи.

После завершения сообщаешь Router, что diff готов для Quality Gate.

---

## 2. Фактическая архитектура

Frontend расположен в `services/frontend` и использует Next.js App Router.

| Директория | Назначение | Разрешенные зависимости | Запрещено |
|---|---|---|---|
| `src/api` | API-вызовы и HTTP-инфраструктура | `src/types`, local HTTP helpers | React, UI, feature hooks/services, `src/app`, business orchestration |
| `src/app` | Next.js routes, layouts, `page.tsx` | feature UI/containers, contexts/providers | API imports, feature services, mutation orchestration, complex state |
| `src/contexts` | React providers глобального состояния | `src/types`, `src/api` только для провайдеров auth/session при существующем паттерне | Feature-specific state |
| `src/features` | Бизнес-фичи CMS | `src/api` через feature services, `src/ui`, `src/hooks`, `src/lib`, `src/types` | Импорт внутренних модулей другой фичи без плана |
| `src/hooks` | Общие hooks без бизнес-фичи | `src/lib`, `src/types` | Entity/use-case knowledge конкретной фичи |
| `src/lib` | Примитивные переиспользуемые функции | `src/types` при необходимости | React, API-вызовы, state, feature/app imports |
| `src/types` | DTO, query, filter, domain и shared UI-типы | Только типовые зависимости | Runtime logic, API calls, React state |
| `src/ui` | Примитивные UI-элементы без бизнес-логики | AntD, shared hooks/lib/types | Feature-aware тексты, сценарии, API, business state |

Старая схема FSD со слоями `shared`, `widgets`, `entities` здесь не применяется. Не создавай эти директории и не переноси туда новый код.

### 2.1. Куда класть новый frontend-код

| Что добавляется | Куда класть | Правило |
|---|---|---|
| Route/page shell | `src/app/(protected)/<route>/page.tsx` | Только рендер feature container/UI и минимальная route-связка |
| Feature UI | `src/features/<feature>/ui` | Компоненты, знающие про сценарий фичи |
| Feature hook/use-case | `src/features/<feature>/hooks` | Loading/error/empty state, filters, pagination, modals, submit handlers |
| Feature service | `src/features/<feature>/services` | Оркестрация вызовов `src/api`, mapping для фичи без React |
| API function | `src/api/<resource>.ts` | Один HTTP boundary, DTO из `src/types` |
| DTO/query/filter/domain type | `src/types/...` | Контракты API и бизнес-домена только здесь |
| Local UI props | Рядом с компонентом или `src/types` по масштабу | Допустимы только для UI props, не для DTO/domain/query/filter contracts |
| Generic table/filter/pagination primitive | `src/ui` | Без знания конкретной фичи |
| Feature table/filter composition | `src/features/<feature>/ui` | Собирает generic primitives и feature columns/actions |
| Documentation tabs/views | `src/features/<feature>/ui` | User/Admin/Developer docs как UI-текст, без runtime API |
| Scopes registry/action map | `src/features/<feature>` или существующий локальный паттерн фичи | Явная связка `FeatureAction -> scopes` |

---

## 3. Границы слоев

Правильная цепочка данных и логики:

```text
page.tsx -> feature ui/container -> feature hook -> feature service -> src/api -> backend
```

### `src/api`

`src/api` содержит только API-вызовы и клиентскую HTTP-инфраструктуру.

Разрешено:
- HTTP client setup, interceptors, base URL, request helpers;
- функции вида `getPhotos`, `createHorseBreed`, `updateSiteSetting`;
- импорт DTO/query/filter типов из `src/types`;
- raw `fetch` только в `src/api/client.ts` и auth API (`src/api/auth.ts` или существующий auth boundary).

Запрещено:
- бизнес-логика и сценарии фич;
- UI и React-компоненты;
- React hooks;
- нормализация сценариев фич, подготовка view model, фильтрация для экранов;
- прямые импорты из `src/features`, `src/ui`, `src/app`;
- raw `fetch`/`axios` вне разрешенных API-boundary исключений.

### `src/app`

`page.tsx` не содержит бизнес-логики. Страница только вызывает нужные hooks/containers и рендерит компоненты из соответствующей фичи.

Для маршрута `src/app/(...)/<feature>/page.tsx` основная UI и логика должны находиться в `src/features/<feature>/...` с совпадающим названием фичи.

Примеры:
- `src/app/(protected)/gallery/page.tsx` -> `src/features/gallery/...`
- `src/app/(protected)/horses/page.tsx` -> `src/features/horses/...`
- `src/app/(protected)/site-settings/page.tsx` -> `src/features/siteSettings/...` допустимо только как явно согласованный naming match для существующей camelCase-фичи.

Если существующий `page.tsx` уже содержит много modal/orchestration state и handlers, не расширяй этот паттерн. Новый state, filters, submit handlers, modal orchestration и use-case logic выноси в feature hooks/containers. Массовую миграцию старых страниц делай только по отдельному плану.

### `src/features`

Вся бизнес-логика конкретной фичи находится внутри `src/features/<feature>`.

Ожидаемая структура фичи:

```text
src/features/<feature>/
├── hooks/       # feature hooks и сценарии
├── services/    # feature services, вызываемые hooks
├── ui/          # feature-aware UI
└── validators/  # схемы валидации без DTO/domain contracts
```

Правила:
- логика всегда идет через hooks в `src/features/<feature>/hooks`;
- services не рендерят UI и не вызывают React hooks;
- feature UI может использовать hooks своей фичи, общие hooks, `src/ui`, `src/lib`, `src/types`;
- не импортируй внутренние модули одной фичи из другой без явного плана;
- feature-aware компоненты остаются в `src/features/<feature>/ui`, а не в корневом `src/ui`.

### `src/hooks`

`src/hooks` содержит только общие hooks, которые не завязаны на конкретную бизнес-фичу. Если hook знает про сущности или сценарий фичи, он должен быть в `src/features/<feature>/hooks`.

### `src/types`

DTO, query, filter и domain contracts всегда находятся в `src/types`.

Правила:
- API input/query/body типы называются с суффиксом `InDto`;
- API response типы называются с суффиксом `OutDto`;
- query/filter/domain типы не объявляются локально в компонентах, hooks, API-файлах, validators, `src/lib` или feature services;
- локальные UI props/types допустимы рядом с компонентом, если они не описывают API/domain/query/filter contract и не переиспользуются вне локального UI;
- при расширении существующего локального UI props паттерна не превращай его в DTO/domain contract.

Примеры: `CreatePriceInDto`, `PriceOutDto`, `LoginInDto`, `UserOutDto`.

### `src/lib`

`src/lib` содержит только примитивные переиспользуемые функции, которые могут применяться где угодно.

Запрещено:
- бизнес-логика;
- React;
- API-вызовы;
- состояние;
- импорты из `src/features`;
- функции, которые знают про конкретный экран или пользовательский сценарий.

### `src/ui`

Корневой `src/ui` содержит только примитивные UI-элементы без бизнес-логики.

Разрешено:
- таблицы, пагинация, фильтры, иконки, generic controls;
- компоненты, которые не знают про конкретную бизнес-фичу.

Запрещено:
- feature-aware компоненты;
- API-вызовы;
- business state;
- тексты и сценарии конкретной страницы.

---

## 4. API Access и Scopes

### 4.1. Access-соответствие UI и endpoint'ов

| UI/API flow | Access class | Проверка Frontend Agent |
|---|---|---|
| CMS route `/dashboard`, `/horses`, `/site-settings`, `/gallery`, `/prices`, `/news` | Protected Admin UI | Anonymous user redirect/block to `/login`; authenticated user sees allowed screen |
| CMS read calls from admin UI | Protected Admin context для CMS UI | Calls go through `src/api` + feature services; `401` handled by auth/client flow |
| CMS mutations `POST/PATCH/DELETE` | Protected Write | UI action requires authenticated session and feature action scope when applicable |
| Auth `POST` login/refresh/logout | Explicit auth exception | Exception is limited to auth API, not general write access |
| `site-*` public content reads | Public Read, outside CMS scope | Do not use CMS-only frontend code/endpoints |

Для каждого нового пользовательского сценария проверь соответствие `UI flow -> endpoint access class` и зафиксируй в отчете.

### 4.2. Scope model

Единая модель для permissioned UI:

```text
FeatureAction -> required scopes -> hasPermission(scopes) -> UI visibility/enabled state -> mutation guard
```

| UI element | Требование |
|---|---|
| Tabs | Скрывать или disabled для actions без scope; docs/read-only tabs могут иметь отдельное правило |
| Buttons | Не показывать или disabled без required scope; primary mutation button всегда scope-aware |
| Modals | Не открывать mutation modal без scope; direct URL/state не должен обходить guard |
| Table actions | Actions column проверяет scope на каждое действие |
| Mutations | Перед submit повторно проверять action permission в hook/service boundary |
| Menu items | Видимость меню должна учитывать auth и feature scopes, если фича не read-only |

Правила:
- `UserContext` является источником authenticated user и scopes для UI;
- каждая feature с permissioned actions должна иметь явный registry/map `FeatureAction -> scopes`;
- используй существующие helpers вроде `hasPermission`, `usePriceScopes`, `useNewsScopes` и расширяй их локальный паттерн;
- для новых фич не оставляй actions без scope registry, если backend требует scopes;
- UI hiding/disabled — это UX, а не authorization. Backend остается источником истины и должен вернуть `401/403` при нарушении доступа;
- loading/error/empty/forbidden states должны быть видимыми и тестируемыми.

---

## 5. Таблицы, сортировка и пагинация

### 5.1. `MainTable`

`src/ui/MainTable.tsx` — основной reusable table primitive для CMS-таблиц. Не дублируй table primitives в фичах без причины.

| Область | Правило |
|---|---|
| Columns | Каждая column имеет стабильный `key`; `dataIndex` указывается только когда соответствует полю данных |
| Server sort | Sort UI маппится в backend query через явный адаптер; не смешивай AntD field/order напрямую с API contract без mapping |
| Current sort | `currentSort` отражает server state, а не локальную догадку компонента |
| Row click | Row click не должен конфликтовать с buttons/actions внутри строки; stop propagation для actions |
| Actions column | Последняя колонка, без `dataIndex`, с permission checks и стабильной шириной |
| Loading/empty/error | Таблица или feature wrapper обязаны явно показать loading, empty и error state |
| Scroll/height | Для больших таблиц задавай предсказуемый scroll/height, чтобы layout не прыгал |
| Pagination | Используй общий pagination control/pattern; query DTO/API получают только `{ limit, offset }` |

В текущем `MainTableProps` есть исторический контракт `сolumns` с кириллической буквой `с`. Не размножай этот контракт в новом коде и не копируй его в новые primitives. Исправление возможно только отдельным migration plan с учетом всех call sites.

### 5.2. Пагинация

Backend/API contract для CMS frontend — только `limit/offset`.

Правила:
- reusable frontend pagination filter/control может показывать page-based UI;
- преобразование UI page/pageSize выполняется до API boundary в `{ limit, offset }`;
- query DTO и `src/api` не должны использовать `page/limit` как контракт;
- `page`, `pageSize`, `page_size` допустимы только как локальный UI state внутри pagination control или AntD adapter;
- изменение фильтра, поиска, sort или page size должно сбрасывать `offset` по согласованному правилу, обычно в `0`;
- добавление `page/limit` API-контракта возможно только через отдельный backend/API migration plan.

---

## 6. Фильтры

Используй generic filters из `src/ui` (`StringFilter`, `ListFilter`) и feature composition в `src/features/<feature>/ui`.

| Тип фильтра | Правило |
|---|---|
| `StringFilter` | Не ломать ввод aggressive normalization; trim/normalization применять в agreed boundary, debounce для server search |
| `ListFilter` | Multi/single values сериализуются явно в query filter type |
| Date/range | Хранить nullable range явно; serialize в API query только валидные границы |
| Empty values | `""`, пустой массив, invalid date и cleared select нормализовать в `undefined`/отсутствие query param по принятому contract |
| Debounce | Server-side text search/filter должен иметь debounce или явное объяснение, почему debounce не нужен |
| Reset pagination | Любое изменение фильтра/search/sort сбрасывает `offset` |
| Backend alignment | Query DTO должен совпадать с backend filter contract, включая text search semantics вроде `~*`, если это закреплено backend |

Не размещай filter state в `page.tsx`, если это новый код. Держи filter state и serialization в feature hooks/services.

---

## 7. Документационные вкладки

Для встроенных инструкций фич используй стандарт:

| Раздел | Naming | Содержимое |
|---|---|---|
| User docs | `USER_DOCS` / user tab | Как пользователь выполняет сценарий в UI |
| Admin docs | `ADMIN_DOCS` / admin tab | Правила администрирования, доступы, ограничения |
| Developer docs | `DEVELOPER_DOCS` / developer tab | Контракты, DTO, API notes, implementation notes |

Правила:
- documentation views живут в feature UI;
- docs tabs не выполняют API calls;
- `fetch(...)` в documentation views допустим только как текстовый code snippet внутри markdown/code block, не runtime-вызов;
- доступ к docs tab должен соответствовать общей access/scopes модели фичи.

---

## 8. UI Kit и стили

Для верстки всегда используется Ant Design.

| Область | Правило |
|---|---|
| Layout/forms/table/modal/tabs/buttons/inputs/selects/notifications/pagination | AntD first |
| Icons | Использовать иконки только из `@ant-design/icons` или `@mui/icons-material`; для нового кода `@ant-design/icons` по умолчанию |
| MUI | Не расширять использование MUI icons/components без причины и плана; иконки из `@mui/icons-material` допустимы как второй разрешённый источник |
| Tailwind | Не использовать как основной styling-подход для нового layout/form/table/modal code |
| CSS | Допустим как вспомогательный слой для локальных отступов, адаптива или тонкой настройки |
| Статические layout/spacing/border | `createStyles` из `antd-style` (как `MainTable.tsx`) или CSS module; не `style={{}}` без runtime-зависимости |
| Динамические стили | className через `createStyles` variants; inline допустим только для значений из props/state вне конечного набора |

Перед добавлением новой библиотеки проверь `services/frontend/package.json` и получи план/согласование, если зависимость меняет подход к UI, state или data fetching.

---

## 9. Паттерны

### API-файл

```typescript
// src/api/prices.ts
import { apiClient } from './client';
import type { CreatePriceInDto, PriceOutDto } from '@/types/api/prices';

export async function createPrice(payload: CreatePriceInDto): Promise<PriceOutDto> {
  const response = await apiClient.post<PriceOutDto>('/prices', payload);
  return response.data;
}
```

### Feature service

```typescript
// src/features/prices/services/priceService.ts
import { createPrice } from '@/api/prices';
import type { CreatePriceInDto, PriceOutDto } from '@/types/api/prices';

export async function submitPrice(payload: CreatePriceInDto): Promise<PriceOutDto> {
  return createPrice(payload);
}
```

### Feature hook

```typescript
// src/features/prices/hooks/usePrices.ts
import { submitPrice } from '@/features/prices/services/priceService';
import type { CreatePriceInDto } from '@/types/api/prices';

export function usePrices() {
  const submit = async (payload: CreatePriceInDto) => {
    await submitPrice(payload);
  };

  return { submit };
}
```

### Feature component

```typescript
// src/features/prices/ui/PricesHeader.tsx
import { Button } from 'antd';
import { usePrices } from '@/features/prices/hooks/usePrices';

export function PricesHeader() {
  const { submit } = usePrices();

  return <Button onClick={() => submit(/* data from form hook/state */)}>Save</Button>;
}
```

### Page

```typescript
// src/app/(protected)/prices/page.tsx
import { PricesTabs } from '@/features/prices/ui/PricesTabs';

export default function PricesPage() {
  return <PricesTabs />;
}
```

---

## 10. Что запрещено

- Бизнес-логика в React-компонентах.
- Любая новая логика в `page.tsx`, кроме вызова hooks/containers и рендера feature-компонентов.
- Прямые `fetch`, `axios` или API-вызовы внутри components/pages.
- Прямой `fetch`/`axios` вне `src/api/client.ts` и auth API.
- Runtime API calls из documentation views.
- API imports в `src/app` и feature UI.
- DTO/query/filter/domain `type`/`interface` вне `src/types`.
- API DTO без суффиксов `InDto` и `OutDto`.
- Feature-aware компоненты в корневом `src/ui`.
- Business/feature imports в `src/lib`.
- Хардкод backend URL в компонентах, hooks или services.
- Новый behavior code без тестов или явного test-gap отчета.
- Создание устаревших директорий `shared`, `widgets`, `entities`.
- Использование CMS-only endpoint'ов в публичных страницах/компонентах.
- Использование write endpoint'ов без авторизованного CMS-контура.
- `page/limit` как API pagination contract без отдельной backend/API миграции.
- Размножение `сolumns` с кириллической буквой из `MainTableProps` без migration plan.
- Использование иконок из любых библиотек, кроме `@ant-design/icons` и `@mui/icons-material`.
- Отправка формы на сервер без предварительной клиентской валидации через Zod.

---

## 11. Именование

| Объект | Конвенция | Пример |
|---|---|---|
| React-компонент | `PascalCase` | `PricesTabs`, `SiteSettingsTable` |
| Хук | `use<Name>` | `usePrices`, `useSiteSettings` |
| API DTO input | `PascalCase` + `InDto` | `CreatePriceInDto` |
| API DTO output | `PascalCase` + `OutDto` | `PriceOutDto` |
| API-функция | `camelCase`, глагол | `createPrice`, `getPhotos` |
| Feature action | `camelCase`/string literal в registry | `createPrice`, `deleteNews` |
| Файл компонента | `PascalCase.tsx` | `PricesHeader.tsx` |
| Файл хука | `use<Name>.ts` | `usePrices.ts` |
| Директория фичи | существующий project naming | `gallery/`, `siteSettings/` |

---

## 12. Технологический стек

| Компонент | Библиотека |
|---|---|
| Framework | Next.js App Router |
| UI runtime | React 19 |
| UI kit | Ant Design |
| Icons | `@ant-design/icons` для нового кода; допускается `@mui/icons-material`; других библиотек иконок не использовать |
| Styling | Ant Design first, auxiliary CSS only when needed |
| Validation | Zod — обязательно для клиентской валидации любых форм, которые можно заполнить перед отправкой на сервер |
| HTTP | через `src/api` и общий client |
| Types | TypeScript |
| Lint | ESLint |
| Package manager | npm |

---

## 13. Обязательное тестирование CMS frontend

Любой CMS frontend behavior diff требует добавленных или обновленных тестов. Behavior diff включает изменение hook/service/helper, UI flow, scopes, query serialization, form, modal, table, filter/search/sort, pagination, API boundary, route guard, loading/empty/error state и permissioned action. Исключение допустимо только для доказанного non-behavior diff: formatting, comments, markdown или механическая правка без runtime/user-visible эффекта; это нужно явно зафиксировать в completion report и подтвердить diff'ом.

Текущий baseline stack для `services/frontend`:

| Уровень | Baseline |
|---|---|
| Test runner | Vitest |
| Component tests | React Testing Library |
| User interactions | user-event |
| Assertions | jest-dom |
| Environment | jsdom |
| API mocks | MSW |

Правила размещения:
- tests клади рядом с покрываемым кодом или по текущему pattern фичи;
- shared helpers, render wrappers, fixtures и MSW handlers бери из `src/test`;
- unit/component/API-boundary tests не ходят в live backend и не требуют запущенного API;
- API boundary, success/error/validation/`401`/`403` scenarios мокируются через MSW или существующие test doubles;
- live backend допускается только для явно выделенного smoke/e2e flow с подготовленным окружением.

Access tests для Protected Admin UI обязательны, когда behavior diff затрагивает route/page, scopes, action visibility, mutation или API error handling:
- anonymous redirect/block или auth guard state;
- authenticated render для разрешенного пользователя;
- scope present;
- scope missing;
- Protected Write UX: action hidden/disabled/guarded;
- backend denial surfaced through `401/403`.

Для списков/таблиц обязательно проверяй `limit/offset`: initial query, page change, page size change и reset `offset` на filter/search/sort. Не добавляй `page/limit` как API DTO/query contract.

### 13.1. Минимумы тестов

| Тип изменения | Минимум тестов/checks |
|---|---|
| Hook/service/helper | 3 unit scenarios: success/base, empty/edge input, error/exception |
| Filter/search/sort behavior | 4 scenarios: apply, clear/normalize empty, debounce or no-debounce expectation, reset `offset`; для sort - field mapping и clear sort |
| Pagination behavior | 4 scenarios: initial `limit/offset`, page change, page size change, filter/search/sort resets `offset` |
| Permissioned action | 4 scenarios: scope present, scope missing, disabled/hidden UX, backend `401/403` handling |
| Table/list component | 5 component scenarios: data render, loading, empty, error, interaction callback; если есть actions - permission case |
| Modal/form mutation | 5 scenarios: open/close, valid submit, validation error, backend error, success invalidation/refresh; если Protected Write - permission case |
| Новая feature page/flow | Component/API-boundary coverage + 1 smoke/e2e happy path; если Playwright еще не настроен для flow, manual QA steps в отчете |
| Регрессия | Минимум 1 тест, который фиксирует исправленное поведение |
| Non-behavior documentation-only diff | Markdown/static check и явное обоснование, почему runtime tests не применимы |

### 13.2. Обязательные команды

Перед передачей CMS frontend behavior diff на Quality Gate выполни из `services/frontend`:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Если diff documentation-only и не затрагивает runtime `services/frontend`, эти команды можно не запускать, но completion report должен явно указать, что runtime tests/checks не применимы.

## 14. Self-check

Перед передачей на Quality Gate выполни применимые проверки. Для документационных правок по агентским инструкциям достаточно checks по измененным markdown-файлам.

| Проверка | Команда | Что ловит |
|---|---|---|
| Direct fetch вне API | `rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'` | Runtime API-вызовы вне `src/api`; code snippets в docs проверять вручную |
| API imports в UI/pages | `rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'` | Нарушение цепочки `feature service -> src/api` |
| Page/limit API pagination | `rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'` | Page-based API DTO/state; допустим только UI adapter с `limit/offset` |
| Site consumer mixing | `rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'` | Смешение CMS frontend с `site-*` Public Read consumer контуром |
| Устаревшие FSD-слои | `find services/frontend/src -maxdepth 2 -type d \\( -name shared -o -name widgets -o -name entities \\)` | Создание запрещенных директорий |
| Локальные DTO/domain types | `rg -n "type .*Dto|interface .*Dto|type .*Query|interface .*Query" services/frontend/src -g '*.{ts,tsx}'` | DTO/query/filter типы вне `src/types` |
| Scope registry | `rg -n "SCOPES_ACTIONS|ScopesRegistry|hasPermission|KNOWN_USER_SCOPES" services/frontend/src/features services/frontend/src/contexts` | Наличие прав для feature actions |
| Page orchestration | `rg -n "useState|useEffect|useMemo|useCallback|from ['\\\"]@/api|from ['\\\"]@/features/.*/services" services/frontend/src/app -g 'page.tsx'` | Рост логики в `page.tsx` |
| Markdown diff | `git diff --check -- agents/planner.md agents/frontend.md agents/quality_gate.md docs/plans/frontend_testing_mandatory_agents_26_05_11.md` | Whitespace/errors в документационных правках |

Обязательные проектные команды для CMS frontend behavior diff:

```bash
cd services/frontend
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Если изменение не затрагивает runtime frontend-код, явно укажи, что lint/typecheck/build не запускались как не применимые к documentation-only diff.

---

## 14.1. Code style и ESLint

Обязательные правила для нового и изменяемого CMS frontend-кода:

| Область | Правило |
|---|---|
| API status | `API_STATUS`, `isApiSuccess` / `isApiError` из `src/lib/apiStatus.ts`; не сравнивать с `"ok"` / `"error"` |
| Нейминг в колбэках | Осмысленные имена (`horse`, не `h`) в `find` / `filter` / `map` |
| JSX | Логика условий props и block-bodied handlers — в hooks/containers, не inline в `on*` |
| Функции | Cognitive complexity ≤ 12; один use-case на функцию в hooks |
| Стили | Статика через `createStyles`; см. секцию 8 |
| Линтер | `npm run lint` обязателен; pilot/error scope — `eslint.config.mjs`; для агентов допустимо `npm run lint:ai` |

Тесты используют те же константы (`API_STATUS.OK`), не строковые литералы.

---

## 15. Тестирование

Новый или измененный CMS frontend behavior без релевантных тестов считается ошибкой. `services/frontend/package.json` содержит baseline `npm test`/`test:watch`, Vitest, React Testing Library, user-event, jest-dom, jsdom и MSW; используй этот стек для unit/component/API-boundary coverage.

| Уровень | Инструмент | Что проверять |
|---|---|---|
| Static/self-check | `rg`, ESLint, TypeScript, Next build | Архитектурные запреты, типы, сборка |
| Unit | Vitest + React Testing Library | Hooks/services, filter normalization, permission helpers, pagination mapping, table sort mapping |
| Component | React Testing Library | Таблицы, фильтры, reusable pagination control, модалки, disabled/hidden actions by scopes |
| API boundary mocks | MSW | Success/error/loading, `401/403`, refresh expectations, DTO/query serialization |
| Smoke/e2e | Playwright после отдельного config | Login redirect, protected CMS routes, CRUD happy path, forbidden action visibility |
| Manual QA | Browser on `http://localhost:3000` | Layout, AntD regressions, table scroll/filter UX |

Тесты unit/component/API-boundary не ходят в реальный backend. Используй mock services или MSW. E2E допускается только с явно подготовленным test backend/seed или route mocks.

### 15.1. Приоритеты покрытия

| Приоритет | Что покрыть первым | Минимальный набор |
|---|---|---|
| P0 static | Архитектурные запреты и сборка | `rg` self-check, `npm run lint`, `npx tsc --noEmit`, `npm run build` |
| P1 shared table primitives | `MainTable`, `TablePaginator`, future pagination control | Render with data, loading/empty, sort callback, `{ page, pageSize } -> { limit, offset }`, page size change |
| P1 filters | `StringFilter`, `ListFilter`, date/range filters | Apply, clear normalized empty, debounce expectation, reset `offset` |
| P1 permissions/scopes | `UserContext`, feature scope registries, `usePriceScopes`, `useNewsScopes` | Allowed visible, missing scope hidden/disabled, mutation blocked in UI, backend `401/403` surfaced |
| P1 API boundary | `src/api/client.ts`, `src/api/auth.ts`, feature services | Success mapping, `limit/offset` query serialization, validation/error response, auth refresh/redirect |
| P2 feature UI | Tables/modals/forms in `horses`, `prices`, `news`, `gallery`, `siteSettings` | Happy render, loading, error, empty, primary action with scope, forbidden action |
| P2 protected pages | CMS route guards and page containers | Anonymous redirect, authenticated render, no `site-*` public API mixing, docs snippets as text |
| P3 smoke/e2e | High-value CMS flows | Login redirect, authenticated navigation, read table data, representative protected mutation, forbidden action visibility |

### 15.2. Количественные минимумы

| Тип изменения | Минимум тестов/checks |
|---|---|
| Любое CMS frontend behavior diff | Все применимые `rg` self-check + `npm test` + `npm run lint` + `npx tsc --noEmit` + `npm run build` |
| Новый/измененный hook/service/helper | Минимум 3 unit scenarios: success/base, empty/edge input, error/exception |
| Новый/измененный filter/search/sort behavior | Минимум 4 scenarios: apply, clear/normalize empty, debounce or no-debounce expectation, reset `offset`; для sort - field mapping и clear sort |
| Новый/измененный pagination behavior | Минимум 4 scenarios: initial `limit/offset`, page change, page size change, filter change resets `offset` |
| Новый/измененный permissioned action | Минимум 4 scenarios: scope present, scope missing, disabled/hidden UX, backend `401/403` handling |
| Новый/измененный table/list component | Минимум 5 component scenarios: data render, loading, empty, error, interaction callback; если есть actions - permission case |
| Новый/измененный modal/form mutation | Минимум 5 scenarios: open/close, valid submit, validation error, backend error, success invalidation/refresh; если protected - permission case |
| Новая feature page или крупный flow | Минимум 1 smoke/e2e happy path и 1 negative/protected scenario; до Playwright - manual QA steps в отчете |
| Исправление регрессии | Минимум 1 тест, который падает на старом поведении; без инфраструктуры указать будущий тест в плане |
| Текстовая/documentation-only правка | Static markdown check и объяснение, почему runtime tests не применимы |

Если изменение затрагивает несколько категорий, бери объединение обязательных cases без дублирования одного риска на разных уровнях.

---

## 16. Протокол завершения работы

Перед ответом Router:

1. Проверь, что изменены только файлы в scope задачи.
2. Проверь access/scopes последствия: Protected Admin CMS, Protected Write mutations, auth exception, отсутствие смешения с `site-*`.
3. Запусти применимые self-check/test команды: для CMS frontend behavior diff обязательны `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`; для documentation-only diff явно объясни, почему runtime checks не применимы.
4. Укажи test gaps и инфраструктурные ограничения, если они есть.
5. Укажи добавленные/обновленные tests, `rg` self-checks, access/scopes результат и готовность к Quality Gate.
6. Не оставляй незавершенные migration steps без плана.

Формат отчета:

```text
Frontend готов
Задача: <краткое описание>
Изменены файлы: <список>
Тесты/проверки: <что запускалось и результат>
Access/scopes: <что проверено, исключения>
Naming/migration notes: <если были>
Не применялось: <если lint/build/tests не запускались для documentation-only>
Готов к ревью: Quality Gate
```
