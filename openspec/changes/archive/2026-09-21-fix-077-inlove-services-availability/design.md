# Design — fix-077-inlove-services-availability

Тикет: `docs/tasks/077_services_bug.md` · Дата: 2026-09-21 · Сервисы: `services/site-ksk-inlove`; backend — read-only contract reference.

## Context

Три страницы услуг (`/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy`) собирают данные из **двух независимых** источников через `Promise.all`:

1. `loadServiceGroup(route)` (`src/features/contentPages/services/serviceGroups.ts`) — ищет в каталоге `horse_services` (`GET /api/horse_services?name=<точное имя>`) запись с точным именем «Занятия»/«Прогулки»/«Постой». Даёт `data.group`: используется только для description-текста в `IntroSection`/`EditorialSplitSection` и SEO metadata. `matches.length === 1 ? success : empty` — отсутствие записи и дубликат одинаково дают `empty`.
2. `createPriceGroupLoaders(...)` (`src/features/contentPages/services/pricesLoaders.ts` + `lessonsLoaders.ts`/`ridesLoaders.ts`/`boardingLoaders.ts`) — реальные тарифы через `GET /api/prices?groups=<имя price_groups>` (для постоя — «Постой частных лошадей», для занятий — «Разовые»/«Абонементы», для прогулок — «Прогулки»). Даёт `data.prices`.

Баг: `LessonsContent.tsx`, `RidesContent.tsx`, `BoardingContent.tsx` считают `data.group` предохранителем для `data.prices`:

```ts
const visiblePrices = data.group.status === "success" ? data.prices : { status: "empty" as const };
```

Из отчёта бага: production-логи backend показывают `200 OK` на `GET /api/prices?groups=...`, и тот же запрос через Postman отдаёт валидный `PriceOutWithTablesDto`. Значит `data.prices` в проде реально `success`. При этом все три страницы показывают «временно недоступна» — то есть `data.group` в проде `empty`. Это согласуется с кодом: `horse_services` — отдельный каталог от `price_groups`, и ничто не гарантирует, что в проде для него заведены записи с точным именем «Занятия»/«Прогулки»/«Постой» (либо там дубликаты — тест `serviceGroups.test.ts` явно фиксирует, что дубликаты тоже дают `empty`). Локально `horse_services`, судя по всему, заполнен тестовыми данными, поэтому баг не воспроизводится.

Существующие тесты (`LessonsContent.test.tsx`, `RidesContent.test.tsx`, `BoardingContent.test.tsx`) не покрывают комбинацию `group: empty/error` + `prices: success` — во всех текущих тестах, где `prices` успешен или является ошибкой, `group` тоже выставлен в `success`. Это подтверждает, что состояние из бага никогда не тестировалось.

Компоненты `<LessonsPrices>`/`<RidesPrices>`/`<BoardingPrices>` уже полностью корректно обрабатывают `prices.status` (`success` → карточки, `empty`/`!items.length` → `EmptyState` с CTA, `error` → `ErrorBlock` с retry) — их менять не нужно, только исправить то, что им передаётся.

## Goals / Non-Goals

**Goals:**

- Видимость и состояние карточек тарифов на всех трёх страницах услуг определяются исключительно `data.prices` (собственный price-group Public Read ответ страницы).
- Убрать сообщение о недоступности услуги, ложно срабатывающее при пустом/переименованном/дублированном дескрипторе описания, когда тарифы реально доступны.
- Сохранить существующую мягкую деградацию описания (`data.group.status === "error"` → «Не удалось загрузить описание услуги.») и её independence от цен.
- Закрыть тестовый пробел: `group: empty/error` + `prices: success` для всех трёх страниц.

**Non-Goals:**

- Изменения backend/API/DB/NATS: `GET /api/prices`, `GET /api/horse_services`, их access class и роли не меняются.
- Заполнение или исправление данных `horse_services` в проде — это CMS-контент, не код; задача явно ограничена клиентским сайтом.
- Миграция description-группы с `horse_services` на `price_groups` (например, переиспользование `groupsQuery` группы как источника описания) — не входит в зафиксированный баг-репорт и не имеет прямого evidence необходимости; отмечено как открытый вопрос.
- Визуальные/geometry изменения — фикс чисто логический (data flow), UI-компоненты цен не трогаются.

## Decisions

### 1. `data.prices` передаётся в `<XPrices>` без подмены через `data.group`

`const prices = data.prices;` (lessons) / `const visiblePrices = data.prices;` (rides, boarding) — вместо тернарника на `data.group.status`. `<XPrices>` уже сам показывает `EmptyState`/`ErrorBlock`/карточки по реальному состоянию — дублирующая проверка на другом источнике данных только маскирует валидные данные.

Альтернатива — оставить `data.group` предохранителем, но добавить fallback-поиск description-группы через `price_groups` — отклонена: усложняет фикс, требует изменения `serviceGroups.ts`/loaders и не обязательна для устранения репортнутого бага (тарифы должны быть видны уже сейчас, без миграции источника описания).

### 2. Сообщение `«Услуга «X» временно недоступна»` удаляется, а не переориентируется на `data.prices`

Дублировать сообщение поверх уже корректного `EmptyState` внутри `<XPrices>` («Стоимость уточняется»/«Стоимость и наличие мест уточняются» + CTA) избыточно и создаёт двойной message при реальном отсутствии тарифов. Убираем `{data.group.status === "empty" ? <p role="status">...</p> : null}` целиком; `{data.group.status === "error" ? <p role="alert">Не удалось загрузить описание услуги.</p> : null}` остаётся без изменений — это про description-текст, а не про доступность услуги.

### 3. Регрессионные тесты добавляются в три существующих `*.test.tsx`, без новых файлов

Новый `it(...)` в каждом файле: `data = { ...empty, group: { status: "empty" }, prices: { status: "success", data: [<тариф>] } }` → карточка тарифа видна, кнопка CTA есть, текст «временно недоступна» отсутствует. Дополнительно кейс `group: { status: "error", statusCode: 503 }` + `prices: success` — та же проверка, плюс `role="alert"` описание-ошибка видна и не блокирует тарифы.

## Access matrix

Изменений нет. Используются существующие Public Read endpoints без изменения access class:

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `GET` | `/api/prices` | Public Read + tenant selector (см. `inlove-production-api-config`) | нет | `200` valid selector; `401` missing/invalid | без изменений |
| `GET` | `/api/horse_services` | Public Read + tenant selector | нет | `200` valid selector; `401` missing/invalid | без изменений |

Оба endpoint уже покрыты access matrix `inlove-production-api-config`; этот change не добавляет и не меняет исключений.

## Deliverables и ownership

| Deliverable | Профиль-владелец | Ownership |
|---|---|---|
| A — decouple price visibility from description group | Site Consumer | `services/site-ksk-inlove/src/features/contentPages/{lessons,rides,boarding}/*Content.tsx` и их `*.test.tsx` |

Единственный deliverable, один владелец, не пересекается с активными INLOVE changes (design source docs не редактируются).

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| `IL77-SC-1` | Site Consumer | A | `src/features/contentPages/lessons/LessonsContent.tsx`, `.../rides/RidesContent.tsx`, `.../boarding/BoardingContent.tsx` и три `*.test.tsx` | — | `UT-SVC-01..06` + `npx tsc --noEmit` |
| `QG-FE` | Quality Gate | A | read-only diff | `IL77-SC-1` | `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` + review |
| `QG-CONTRACTS` | Quality Gate | A | read-only OpenSpec/diff | `IL77-SC-1` | strict validation + conformance |
| `QG-SYNTH` | Quality Gate | A | `docs/reports/077_services_bug.md` | `QG-FE`, `QG-CONTRACTS` | один verdict |
| `OPS-SYNC` | Router/OpenSpec | A | `openspec/specs/inlove-services-pages/spec.md` | `QG-SYNTH=APPROVED` | sync + strict validation |
| `OPS-ARCHIVE` | Router/OpenSpec | A | OpenSpec archive | `OPS-SYNC` | archive + final validation |

`QG-BE` неприменим: backend runtime/schema/данные не меняются этим change (production-содержимое `horse_services` — отдельный, вне-кодовый вопрос). `QG-LIVE` неприменим: контракт API не меняется, а исправляемое поведение — чисто клиентская data-flow логика, полностью покрываемая mocked component-тестами (`UT-SVC-01..06`); реального runtime API diff, требующего live-проверки, нет.

### DAG зависимостей

```text
IL77-SC-1 → (QG-FE ∥ QG-CONTRACTS) → QG-SYNTH → OPS-SYNC → OPS-ARCHIVE
```

## Test matrix

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где проверяется |
|---|---|---|---|---|---|
| `UT-SVC-01` | component/regression | data-flow decoupling | `group: empty`, `prices: success` на `/uslugi/zanyatiya` | тарифы отображаются, нет текста «временно недоступна» | `LessonsContent.test.tsx` |
| `UT-SVC-02` | component/regression | data-flow decoupling | `group: empty`, `prices: success` на `/uslugi/progulki` | тарифы отображаются, нет текста «временно недоступна» | `RidesContent.test.tsx` |
| `UT-SVC-03` | component/regression | data-flow decoupling | `group: empty`, `prices: success` на `/uslugi/postoy` | тарифы отображаются, нет текста «временно недоступна» | `BoardingContent.test.tsx` |
| `UT-SVC-04` | component | ошибка description-группы не блокирует цены | `group: error(503)`, `prices: success` на всех трёх страницах | тарифы отображаются; `role="alert"` «Не удалось загрузить описание услуги.» присутствует | все три `*.test.tsx` |
| `UT-SVC-05` | component (существующее поведение) | реально пустые/ошибочные цены | `prices: empty` / `prices: error` (независимо от `group`) | `EmptyState`/`ErrorBlock` из `<XPrices>` как раньше, без регрессии | существующие тесты, не изменяются |
| `UT-SVC-06` | typecheck | контракт компонентов | `npx tsc --noEmit` после удаления тернарника | без ошибок типов на `visiblePrices`/`prices` | `services/site-ksk-inlove` |

Неприменимые оси: транзакционность/идемпотентность/конкурентность (нет записи), реальная PostgreSQL (нет backend/DB diff), access matrix regression (endpoint'ы не менялись, уже покрыты `inlove-production-api-config`).

## Migration Plan

1. Внести правку в три `*Content.tsx` и добавить `UT-SVC-01..04` в существующие `*.test.tsx`.
2. Прогнать `IL77-SC-1` verification (`npm test` scope + `npx tsc --noEmit`).
3. Выполнить `QG-FE` и `QG-CONTRACTS` параллельно, затем `QG-SYNTH`.
4. При `APPROVED` — sync delta spec `inlove-services-pages` в main specs, повторная strict validation, archive.
5. Rollback: точечный revert трёх файлов и их тестов; backend/data изменений нет, откатывать нечего на этой стороне.

## Risks / Trade-offs

- [Production `horse_services` каталог остаётся пустым/дублированным для «Занятия»/«Прогулки»/«Постой»] → после фикса это уже не блокирует показ тарифов, но description-текст и SEO description на этих страницах продолжат использовать статический fallback (уже реализованный в `lessonsMetadata`/`ridesMetadata`/`boardingMetadata`); зафиксировано как открытый вопрос для владельца контента, не блокирует этот change.
- [Скрытое ожидание, что `data.group` — это предохранитель от «сырых»/неполных прод-данных] → явно не подтверждено ни кодом, ни спеками; `<XPrices>` уже сам обрабатывает `empty`/`error` цен, так что защитная роль `data.group` избыточна и её удаление не открывает новый класс дефектов.

## Open Questions

Блокирующих вопросов нет. Не выяснено (вне scope этого change): почему в production каталог `horse_services` не содержит (или содержит дублированные) записи с точным именем «Занятия»/«Прогулки»/«Постой» — рекомендуется отдельная проверка CMS-контента владельцем каталога.
