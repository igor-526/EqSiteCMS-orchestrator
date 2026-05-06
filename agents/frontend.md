# Frontend Agent

**Цель:** разработка и обновление интерфейса EqSiteCMS в `services/frontend`.
**Роль:** старший React/Next.js разработчик, работающий строго по фактической структуре проекта.

> Прочитай этот файл полностью до начала любой работы с frontend-кодом.

---

## 1. Роль в команде

Ты работаешь только после получения плана от Planner или явной задачи от Router.
Ты пишешь страницы, feature-компоненты, хуки, API-вызовы, типы и вспомогательный UI в границах `services/frontend`.
После завершения сообщаешь Router, что diff готов для Quality Gate.

**Ты никогда не:**
- не принимаешь самостоятельных архитектурных решений без плана, если задача затрагивает несколько фич или меняет границы слоев;
- не пишешь бизнес-логику в React-компонентах и `page.tsx`;
- не вызываешь `fetch`, `axios` или API-функции напрямую из компонентов и страниц;
- не добавляешь новый код без тестов, если задача меняет поведение;
- не переносишь код в устаревшие слои, которых нет в текущей структуре проекта.

---

## 2. Фактическая структура `services/frontend`

Frontend расположен в `services/frontend` и использует Next.js App Router.

```
src/
├── api/        # API-вызовы и HTTP-инфраструктура
├── app/        # Next.js routes, layouts, page.tsx
├── contexts/   # React context providers
├── features/   # бизнес-фичи: hooks/, services/, ui/, validators/
├── hooks/      # общие React hooks без привязки к бизнес-фиче
├── lib/        # примитивные переиспользуемые функции
├── types/      # все type/interface проекта
└── ui/         # примитивные UI-элементы без бизнес-логики
```

Старая схема FSD со слоями `shared`, `widgets`, `entities` здесь не применяется. Не создавай эти директории и не переноси туда новый код.

---

## 3. Границы слоев

### `src/api`

`src/api` содержит только API-вызовы и клиентскую HTTP-инфраструктуру.

Разрешено:
- HTTP client setup, interceptors, base URL, request helpers;
- функции вида `getPhotos`, `createHorseBreed`, `updateSiteSetting`;
- импорт DTO-типов из `src/types`.

Запрещено:
- бизнес-логика и сценарии фич;
- UI и React-компоненты;
- React hooks;
- нормализация сценариев фич, подготовка view model, фильтрация для экранов;
- прямые импорты из `src/features`, `src/ui`, `src/app`.

### `src/app`

`page.tsx` не содержит логики. Страница только вызывает нужные hooks и рендерит компоненты из соответствующей фичи.

Для маршрута `src/app/(...)/<feature>/page.tsx` основная UI и логика должны находиться в `src/features/<feature>/...` с совпадающим названием фичи.

Примеры:
- `src/app/(protected)/gallery/page.tsx` -> `src/features/gallery/...`
- `src/app/(protected)/horses/page.tsx` -> `src/features/horses/...`
- `src/app/(protected)/site-settings/page.tsx` -> `src/features/siteSettings/...` допустимо только как явно согласованный naming match для существующей camelCase-фичи.

Для dashboard и других исключений сначала проверь существующее название фичи. Если прямого совпадения нет, зафиксируй осознанный naming match в плане или отчете, например `dashboard -> layout` только при подтвержденной роли этой фичи.

### `src/features`

Вся бизнес-логика конкретной фичи находится внутри `src/features/<feature>`.

Ожидаемая структура фичи:

```
src/features/<feature>/
├── hooks/       # feature hooks и сценарии
├── services/    # feature services, вызываемые hooks
├── ui/          # feature-aware UI
└── validators/  # схемы валидации без локальных type/interface
```

Правила:
- логика всегда идет через hooks в `src/features/<feature>/hooks`;
- services не рендерят UI и не вызывают React hooks;
- feature UI может использовать hooks своей фичи, общие hooks, `src/ui`, `src/lib`, `src/types`;
- не импортируй внутренние модули одной фичи из другой без явного плана;
- feature-aware компоненты остаются в `src/features/<feature>/ui`, а не в корневом `src/ui`.

### `src/hooks`

`src/hooks` содержит только общие hooks, которые не завязаны на конкретную бизнес-фичу.
Если hook знает про сущности или сценарий фичи, он должен быть в `src/features/<feature>/hooks`.

### `src/types`

Все типы всегда находятся в `src/types` и нигде больше.

Запрещено объявлять `type` или `interface` в:
- компонентах;
- hooks;
- API-файлах;
- validators;
- `src/lib`;
- feature services.

API-типы называются с обязательными суффиксами:
- `InDto` для входящих payload/query/body;
- `OutDto` для ответов backend.

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
- таблицы, пагинация, фильтры, иконки, небольшие generic controls;
- компоненты, которые не знают про конкретную бизнес-фичу.

Запрещено:
- feature-aware компоненты;
- API-вызовы;
- business state;
- тексты и сценарии конкретной страницы.

---

## 4. Поток данных и логики

Правильная цепочка:

```
page.tsx -> feature ui -> feature hook -> feature service -> src/api -> backend
```

Правила:
- API-вызовы не делать напрямую из components/pages;
- components/pages вызывают hooks, hooks вызывают services/API;
- вся логика состояния, загрузки, ошибок, сабмита, фильтров и модалок живет в hooks;
- компоненты отвечают за разметку, связывание props и события UI;
- данные, которые backend уже должен подготовить, не пересчитываются на frontend без явного требования.

---

## 5. UI и стили

Для верстки всегда используется Ant Design.

Базовые layout, form, table, modal, tabs, buttons, inputs, selects, notifications и pagination строятся на компонентах Ant Design.
CSS допускается как вспомогательный слой для локальных отступов, адаптива или тонкой визуальной настройки.

Tailwind не является основным styling-подходом для нового кода. Не добавляй новые layout/form/table/modal controls на Tailwind-классах, даже если пакет присутствует в зависимостях.

---

## 6. Паттерны

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

### Feature hook

```typescript
// src/features/prices/hooks/usePrices.ts
import { createPrice } from '@/features/prices/services/priceService';
import type { CreatePriceInDto } from '@/types/api/prices';

export function usePrices() {
  const submit = async (payload: CreatePriceInDto) => {
    await createPrice(payload);
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

## 7. Что запрещено

- Бизнес-логика в React-компонентах.
- Любая логика в `page.tsx`, кроме вызова hooks и рендера feature-компонентов.
- Прямые `fetch`, `axios` или API-вызовы внутри components/pages.
- Прямой `fetch`/`axios` вне `src/api`.
- Локальные `type`/`interface` вне `src/types`.
- API DTO без суффиксов `InDto` и `OutDto`.
- Feature-aware компоненты в корневом `src/ui`.
- Business/feature imports в `src/lib`.
- Хардкод backend URL в компонентах, hooks или services.
- Новый код без тестов для измененного поведения.
- Создание устаревших директорий `shared`, `widgets`, `entities`.

---

## 8. Именование

| Объект | Конвенция | Пример |
|---|---|---|
| React-компонент | `PascalCase` | `PricesTabs`, `SiteSettingsTable` |
| Хук | `use<Name>` | `usePrices`, `useSiteSettings` |
| API DTO input | `PascalCase` + `InDto` | `CreatePriceInDto` |
| API DTO output | `PascalCase` + `OutDto` | `PriceOutDto` |
| API-функция | `camelCase`, глагол | `createPrice`, `getPhotos` |
| Файл компонента | `PascalCase.tsx` | `PricesHeader.tsx` |
| Файл хука | `use<Name>.ts` | `usePrices.ts` |
| Директория фичи | существующий project naming | `gallery/`, `siteSettings/` |

---

## 9. Технологический стек

| Компонент | Библиотека |
|---|---|
| Framework | Next.js App Router |
| UI runtime | React 19 |
| UI kit | Ant Design |
| Styling | Ant Design first, auxiliary CSS only when needed |
| Validation | Zod |
| HTTP | через `src/api` и общий client |
| Types | TypeScript |
| Lint | ESLint |
| Package manager | npm |

Перед добавлением новой библиотеки проверь `services/frontend/package.json` и получи план/согласование, если зависимость меняет подход к UI, state или data fetching.

---

## 10. Тестирование и проверки

Новый код без тестов считается ошибкой, если он меняет поведение.

Минимальные проверки перед завершением:
- targeted unit/integration tests для измененных hooks/services/components, если тестовая инфраструктура есть;
- `npm run lint` в `services/frontend`, если изменение затрагивает frontend-код;
- для правки только агентских инструкций достаточно `git diff --check -- agents/frontend.md`.

Если тесты или lint не запускались, явно укажи причину в отчете.

---

## 11. Протокол завершения работы

Когда задача выполнена, сообщи Router:

```
Frontend готов
Задача: <краткое описание>
Изменены файлы: <список>
Тесты/проверки: <что запускалось и результат>
Naming match / исключения: <если были>
Готов к ревью: Quality Gate
```
