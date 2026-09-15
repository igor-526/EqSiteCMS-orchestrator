# Tasks — inlove-layout-spacing-and-group-filters

Ownership: весь код принадлежит `services/site-ksk-inlove` (Site Consumer), кроме `DATA-1` (Backend, только данные прямой SQL-записью в локальную dev-БД, без diff в `services/backend/src/**` и без вызова API). Порядок исполнения и DAG — в `design.md` → `## Execution units`. Test matrix — `design.md` → `## Test matrix`. Manual QA — `design.md` → `## Manual QA steps (UI тестирование)`. `contextFiles` перечислены по units, не общим списком.

> **Ревизия после пользовательского review открытых вопросов.** Все 5 OQ из первой версии design.md закрыты решениями пользователя (см. `design.md` → Decisions D5–D7, Open Questions). Ключевые изменения относительно первой версии: (1) переключатель «Занятия» использует два отдельных HTTP-запроса вместо одного repeatable; (2) `DATA-1` пишет напрямую в БД, без вызова API и без discovery endpoint'а; (3) scope расширен на страницу «Прогулки» (новая группа «Прогулки», новый unit `FE-4B`) — принцип «страница = группа» применяется ко всем трём страницам услуг, catch-all «Основные услуги» выводится из использования; (4) логотип — новый файл-копия, оригинал не трогается; (5) подтверждено чтением кода, что на `/loshadi/[slug]` CTA нет и удалять нечего.

## Execution units

| Unit | Профиль | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| `DOC-1` | Site Consumer | `docs/sites/inlove/scheme.md`, `docs/sites/inlove/components.md`, `docs/sites/inlove/design_system_specification.md` | — | ручная сверка с proposal/design | `proposal.md`, `design.md#decisions`, `agents/howto/site-ksk-inlove-design.md` |
| `FE-1` | Site Consumer | `src/ui/foundations/**`, `src/ui/sections/index.tsx`, `src/ui/sections/sections.module.css` | `DOC-1` | `npm test`, `npm run lint`, `npx tsc --noEmit` | `design.md#decisions` (D1–D4), `specs/inlove-ui-components/spec.md` |
| `FE-2` | Site Consumer | `src/features/contentPages/home/**`, `src/ui/cards/index.tsx` (NewsCard), `src/ui/cards/cards.module.css`, `src/ui/sections/index.tsx` (NewsSection) | `FE-1` | `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` | `design.md#decisions` (D1, D2), `specs/inlove-content-pages/spec.md` |
| `FE-3` | Site Consumer | `src/ui/cards/index.tsx` (TariffCard), `src/ui/cards/cards.module.css`, `src/features/contentPages/{lessons,rides,boarding}/*.module.css` | `DOC-1` | `npm test`, `npm run lint`, `npx tsc --noEmit` | `specs/inlove-services-pages/spec.md` (сетка/image-click требование) |
| `FE-4` | Site Consumer | `src/features/contentPages/services/pricesLoaders.ts`, `src/features/contentPages/services/lessonsLoaders.ts`, `src/features/contentPages/lessons/LessonsPrices.tsx`, `src/ui/sections/index.tsx` (PricesSection notice-контракт) | `DOC-1`, `FE-1` | `npm test`, `npm run lint`, `npx tsc --noEmit` | `design.md#decisions` (D5), `specs/inlove-services-pages/spec.md` |
| `FE-4B` | Site Consumer | `src/features/contentPages/services/ridesLoaders.ts`, `src/features/contentPages/services/boardingLoaders.ts`, `src/features/contentPages/rides/RidesPrices.tsx`, `src/features/contentPages/boarding/BoardingContent.tsx` | `FE-4` | `npm test`, `npm run lint`, `npx tsc --noEmit` | `design.md#decisions` (D5), `specs/inlove-services-pages/spec.md` |
| `FE-5` | Site Consumer | `src/features/contentPages/horses/{HorsesContent,HorsesGrid,HorsesCta}.tsx`, `src/features/contentPages/about/AboutContent.tsx` | `FE-1` | `npm test`, `npm run lint`, `npx tsc --noEmit` | `specs/inlove-horses-pages/spec.md`, `specs/inlove-content-pages/spec.md` (about), `design.md#open-questions` |
| `FE-6` | Site Consumer | `src/ui/navigation/**`, `src/ui/atoms/index.tsx` (Logo), новый файл `public/images/inlove-logo-transparent.png` (`inlove-logo.jpg` не изменяется) | `DOC-1` | `npm test`, `npm run lint`, `npx tsc --noEmit`; визуальная проверка | `specs/inlove-site-shell/spec.md`, `design.md#decisions` (D7) |
| `DATA-1` | Backend | БД `price_groups`/`price_groups_relations` tenant `inlove` — прямая SQL-запись в локальную dev-БД `eqsitecms-db` (без diff в `services/backend/src/**`, без вызова API) | — | `.claude/skills/api-smoke-test` (`SM-SC-01..06`) | `specs/inlove-price-group-curation/spec.md`, `design.md#decisions` (D6), `design.md#postgresql-для-smoke-тестов` |
| `QG-FE` | Quality Gate | весь diff `services/site-ksk-inlove` | `FE-1..FE-6`, `FE-4B`, `DATA-1` | `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, Manual QA | `design.md#manual-qa-steps-ui-тестирование`, `design.md#test-matrix` |
| `QG-CONTRACTS` | Quality Gate | design-docs + specs + ownership | `DOC-1..DATA-1` | сверка diff с access matrix/ownership/design-docs | `design.md#access-matrix`, все `specs/*/spec.md` этого change |
| `QG-LIVE` | Quality Gate | — (verification only) | `DATA-1`, `FE-4`, `FE-4B` | `SM-SC-01..06` через `.claude/skills/api-smoke-test` | `design.md#test-matrix`, `design.md#postgresql-для-smoke-тестов` |
| `QG-BE` | Quality Gate | — | — | неприменимо: нет diff в `services/backend/src/**`, `DATA-1` — прямой SQL, не код | — |
| `QG-SYNTH` | Quality Gate | `docs/reports/**` | `QG-FE`, `QG-CONTRACTS`, `QG-LIVE`, `QG-BE` | единый вердикт APPROVED/REWORK | результаты всех lanes выше |

### DAG зависимостей

```text
DOC-1 ─┬→ FE-1 ─┬→ FE-2 ───────────────────┐
       │        ├→ FE-4 → FE-4B ───────────┤
       │        └→ FE-5 ───────────────────┤
       ├→ FE-3 ────────────────────────────┤
       └→ FE-6 ────────────────────────────┤
                                            │
DATA-1 ──────────────────────────────────────┴→ QG-FE ─┐
                                          QG-CONTRACTS ─┤→ QG-LIVE → QG-SYNTH
                                     QG-BE (неприменимо) ┘
```

`FE-2`, `FE-3`, `FE-5`, `FE-6` независимы друг от друга. `FE-4B` строго после `FE-4` (тот же профиль/deliverable, использует обновлённую `pricesLoaders.ts`). `DATA-1` независим по коду, может идти параллельно с любым `FE-*`, но должен завершиться до `QG-LIVE` и до финальной live-проверки `FE-4`/`FE-4B`.

## 1. DOC-1 — обновление design-docs источника истины (профиль: Site Consumer)

**Specs:** все capability этого change · **Пути:** `docs/sites/inlove/scheme.md`, `docs/sites/inlove/components.md`, `docs/sites/inlove/design_system_specification.md` · **Зависит от:** —

- [x] DOC-1.1 В `scheme.md`: обновить раздел «Услуги / Занятия и абонементы» — заменить описание `groups=Основные услуги` + client allow-list/category на два отдельных запроса `groups=Разовые`/`groups=Абонементы`, убрать «notice» из вёрстки
- [x] DOC-1.2 В `scheme.md`: обновить раздел «Услуги / Прогулки» — заменить `name=Конные+прогулки&name=Конная+прогулка` на `groups=Прогулки`
- [x] DOC-1.3 В `scheme.md`: обновить раздел «Услуги / Постой» — заменить `name=Постой+частных+лошадей` на `groups=Постой частных лошадей`, убрать «notice» из вёрстки
- [x] DOC-1.4 В `scheme.md`: обновить раздел «Наши лошади» — убрать CTA из состава секций списочной страницы, зафиксировать отсутствие второго заголовка секции
- [x] DOC-1.5 В `scheme.md`: обновить раздел «О клубе» — зафиксировать компактный spacing первого блока и полноширинный второй блок
- [x] DOC-1.6 В `components.md`: обновить контракт `PageContainer и Section` — добавить seam-механизм, `trimBottom`, конфигурируемый `IntroSection.spacing`, full-width `EditorialSplitSection` без `image`
- [x] DOC-1.7 В `components.md`: обновить контракт `PricesSection` (убрать `notice?`), `TariffCard`/grid (3 колонки desktop, mobile-изображение, bold, image-link), `GroupedNavigation`/Header/Footer (визуальная группа «Услуги», прозрачный logo, выровненный маркер)
- [x] DOC-1.8 В `design_system_specification.md` §10–11: добавить seam-токен (56px desktop / 32px mobile)
- [x] DOC-1.V Сверить обновлённые разделы с `proposal.md`/`design.md`, зафиксировать расхождения как handoff-решения и вернуть Router handoff

## 2. FE-1 — spacing-примитив: seam, trimBottom, конфигурируемый IntroSection (профиль: Site Consumer)

**Specs:** `inlove-ui-components` · **Пути:** `src/ui/foundations/**`, `src/ui/sections/index.tsx`, `src/ui/sections/sections.module.css` · **Зависит от:** `DOC-1`

- [x] FE-1.1 Добавить в `foundations.module.css` CSS-правило смежности `.section + .section` (seam-коллапс, desktop/mobile токены) и escape-hatch (data-атрибут)
- [x] FE-1.2 Добавить `Section.trimBottom` проп в `foundations/index.tsx`
- [x] FE-1.3 Сделать `IntroSection.spacing` конфигурируемым (`"editorial" | "compact"`, default `"editorial"`)
- [x] FE-1.4 Добавить в `sections/index.tsx`/`sections.module.css` full-width вариант `EditorialSplitSection` при отсутствии `image`
- [x] FE-1.5 Реализовать и прогнать `UT-SC-13` и точечные тесты на `trimBottom`/`IntroSection.spacing`/`EditorialSplitSection` full-width из `design.md` → `## Test matrix`
- [x] FE-1.V Прогнать `npm test`, `npm run lint`, `npx tsc --noEmit`, отметить выполненные task IDs и вернуть Router handoff

## 3. FE-2 — Главная: компактная горизонтальная новость и сокращённые разрывы (профиль: Site Consumer)

**Specs:** `inlove-content-pages` · **Пути:** `src/features/contentPages/home/**`, `src/ui/cards/index.tsx` (NewsCard), `src/ui/cards/cards.module.css`, `src/ui/sections/index.tsx` (NewsSection) · **Зависит от:** `FE-1`

- [x] FE-2.1 Добавить в `NewsCard` горизонтальный компактный вариант: изображение сбоку, меньшая высота, на всю ширину контейнера
- [x] FE-2.2 Обновить `cards.module.css` под горизонтальный вариант (grid/flex layout, responsive fallback на mobile)
- [x] FE-2.3 Подключить компактный вариант в `NewsSection`/`HomeContent.tsx` для единственной новости главной
- [x] FE-2.4 Применить `Section.trimBottom` на `ContactSection` главной перед `SiteFooter`
- [x] FE-2.5 Проверить, что переход «карточки услуг → Новости» использует seam-механизм `FE-1` без точечных отступов в `HomeContent.tsx`
- [x] FE-2.6 Реализовать и прогнать `UT-SC-01` из `design.md` → `## Test matrix`
- [x] FE-2.V Прогнать `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, отметить выполненные task IDs и вернуть Router handoff

## 4. FE-3 — Карточки тарифов: сетка, изображение, название, переход (профиль: Site Consumer)

**Specs:** `inlove-services-pages` · **Пути:** `src/ui/cards/index.tsx` (TariffCard), `src/ui/cards/cards.module.css`, `src/features/contentPages/{lessons,rides,boarding}/*.module.css` · **Зависит от:** `DOC-1`

- [x] FE-3.1 Изменить grid `lessons.module.css`/`rides.module.css`/`boarding.module.css` на `repeat(3, minmax(0,1fr))` для desktop (≥1024px), сохранив mobile 1 колонку
- [x] FE-3.2 Добавить mobile-специфичное уменьшенное соотношение изображения в `TariffCard`
- [x] FE-3.3 Увеличить начертание названия тарифа в `TariffCard` до `font-weight: 700` через отдельный modifier-класс
- [x] FE-3.4 Обернуть изображение `TariffCard` в `Link` на detail-страницу тарифа; отключить клик на mobile (`pointer-events: none`)
- [x] FE-3.5 Реализовать и прогнать `UT-SC-02`, `UT-SC-03` из `design.md` → `## Test matrix`
- [x] FE-3.V Прогнать `npm test`, `npm run lint`, `npx tsc --noEmit`, отметить выполненные task IDs и вернуть Router handoff

## 5. FE-4 — Занятия: групповая фильтрация (два запроса) + notice cleanup (профиль: Site Consumer)

**Specs:** `inlove-services-pages` · **Пути:** `src/features/contentPages/services/pricesLoaders.ts`, `src/features/contentPages/services/lessonsLoaders.ts`, `src/features/contentPages/lessons/LessonsPrices.tsx`, `src/ui/sections/index.tsx` (PricesSection) · **Зависит от:** `DOC-1`, `FE-1`

- [x] FE-4.1 Сделать `allowedSlugs` в `createPriceGroupLoaders` (`pricesLoaders.ts`) необязательным (без него — без клиентской фильтрации, полное доверие backend-группе)
- [x] FE-4.2 Изменить `loadDetail` в `pricesLoaders.ts`: guard через поле `groups` тарифа (пересечение с переданным множеством допустимых имён групп страницы) вместо `allowedSlugs.includes(slug)`
- [x] FE-4.3 Переписать `lessonsLoaders.ts`: убрать `LESSONS_GROUP_NAME`/`LESSONS_ALLOWED_SLUGS`/`LESSON_CATEGORY`; завести два независимых loader-вызова с `groupsQuery: 'Разовые'` и `groupsQuery: 'Абонементы'`
- [x] FE-4.4 Обновить `LessonsPrices.tsx`: переключатель «Разовые/Абонементы» переключает источник данных между двумя раздельными наборами (два запроса, не клиентская категоризация); решить и задокументировать в handoff — оба состояния подгружаются при SSR или второе состояние грузится лениво при переключении
- [x] FE-4.5 Убрать проп `notice`/`InlineNotice` из `PricesSection` (`sections/index.tsx`) и из вызова в `LessonsPrices.tsx`
- [x] FE-4.6 Реализовать и прогнать `UT-SC-04`, `UT-SC-05`, `UT-SC-07..09`, `UT-SC-17` (для zanyatiya) из `design.md` → `## Test matrix`
- [x] FE-4.V Прогнать `npm test`, `npm run lint`, `npx tsc --noEmit`, отметить выполненные task IDs и вернуть Router handoff; указать финальную сигнатуру `createPriceGroupLoaders`/`loadDetail` для `FE-4B`

## 6. FE-4B — Прогулки и Постой: групповая фильтрация, spacing, notice cleanup Rides (профиль: Site Consumer)

**Specs:** `inlove-services-pages` · **Пути:** `src/features/contentPages/services/ridesLoaders.ts`, `src/features/contentPages/services/boardingLoaders.ts`, `src/features/contentPages/rides/RidesPrices.tsx`, `src/features/contentPages/boarding/BoardingContent.tsx` · **Зависит от:** `FE-4`

- [x] FE-4B.1 Переписать `ridesLoaders.ts`: убрать `RIDES_NAME_QUERY`/`RIDES_ALLOWED_SLUGS`, использовать `groupsQuery: 'Прогулки'` через обновлённую (`FE-4`) фабрику `createPriceGroupLoaders`
- [x] FE-4B.2 Переписать `boardingLoaders.ts`: убрать `BOARDING_NAME_QUERY`/`BOARDING_ALLOWED_SLUGS`, использовать `groupsQuery: 'Постой частных лошадей'`
- [x] FE-4B.3 Убрать проп `notice`/`InlineNotice` из `RidesPrices.tsx`
- [x] FE-4B.4 Применить seam-механизм `FE-1` для сокращения разрывов между блоками «Постой»/«Инфраструктура»/«Что входит»/«Стоимость» в `BoardingContent.tsx` (проверить, достаточно ли автоматического seam, при необходимости — явный `spacing`/`trimBottom`)
- [x] FE-4B.5 Реализовать и прогнать `UT-SC-06`, `UT-SC-16`, `UT-SC-17` (для progulki/postoy), `UT-SC-09` (rides notice) из `design.md` → `## Test matrix`
- [x] FE-4B.V Прогнать `npm test`, `npm run lint`, `npx tsc --noEmit`, отметить выполненные task IDs и вернуть Router handoff; явно указать, требуется ли live-проверка после `DATA-1`

## 7. FE-5 — Наши лошади и О клубе: удаление лишнего, spacing, full-width (профиль: Site Consumer)

**Specs:** `inlove-horses-pages`, `inlove-content-pages` · **Пути:** `src/features/contentPages/horses/{HorsesContent,HorsesGrid,HorsesCta}.tsx`, `src/features/contentPages/about/AboutContent.tsx` · **Зависит от:** `FE-1`

- [x] FE-5.1 Убрать `<Text as="h2">Лошади клуба</Text>` и обёртку `.heading` из `HorsesGrid.tsx`; применить компактный/seam spacing к `Section` сетки
- [x] FE-5.2 Убрать использование `HorsesCta` из `HorsesContent.tsx`; удалить `HorsesCta.tsx` (подтверждено: единственное использование)
- [x] FE-5.3 Подтвердить в handoff (уже проверено на этапе планирования, `HorseDetail.tsx` прочитан целиком): `/loshadi/[slug]` не содержит никакого CTA — действие не требуется, только зафиксировать факт
- [x] FE-5.4 Применить `IntroSection spacing="compact"` для h1 «Наши лошади» (`HorsesContent.tsx`)
- [x] FE-5.5 Применить `IntroSection spacing="compact"` для h1 первого блока «О клубе» (`AboutContent.tsx`)
- [x] FE-5.6 Убедиться, что второй блок «О клубе» (`EditorialSplitSection` без `image`) рендерится в full-width варианте из `FE-1` без дополнительных правок разметки
- [x] FE-5.7 Реализовать и прогнать `UT-SC-10`, `UT-SC-11`, `UT-SC-12` из `design.md` → `## Test matrix`
- [x] FE-5.V Прогнать `npm test`, `npm run lint`, `npx tsc --noEmit`, отметить выполненные task IDs и вернуть Router handoff

## 8. FE-6 — Header/Footer: логотип-копия, группа «Услуги», маркер активного пункта (профиль: Site Consumer)

**Specs:** `inlove-site-shell` · **Пути:** `src/ui/navigation/**`, `src/ui/atoms/index.tsx`, новый файл `public/images/inlove-logo-transparent.png` · **Зависит от:** `DOC-1`

- [x] FE-6.1 Создать `public/images/inlove-logo-transparent.png` как копию `inlove-logo.jpg` с автоматически удалённым белым фоном (alpha-канал); **не изменять и не удалять** `inlove-logo.jpg`
- [x] FE-6.2 Визуально проверить `inlove-logo-transparent.png` на артефакты по краям; если качество неудовлетворительно — оставить `Logo`-компонент на оригинале и вернуть `partial` с открытым вопросом об исходном ассете от владельца бренда
- [x] FE-6.3 Обновить `Logo`-компонент (`atoms/index.tsx`) на новый файл, проверить рендер на светлом и тёмном (`tone`) фоне секции
- [x] FE-6.4 Переработать `.groupedServices` (`navigation.module.css`) на визуально отличимое оформление группы (контейнер/разделитель/иконка) для desktop dropdown, mobile menu и footer
- [x] FE-6.5 Исправить позиционирование `.navLink[aria-current=page]::after`/`.servicesTrigger[data-active=true]::after` — выровнять маркер по вертикали относительно текста
- [x] FE-6.6 Реализовать и прогнать `UT-SC-15` из `design.md` → `## Test matrix`; `UT-SC-14` (маркер) закрыть через Manual QA
- [x] FE-6.V Прогнать `npm test`, `npm run lint`, `npx tsc --noEmit`, зафиксировать визуальную проверку логотипа/маркера/группы в handoff (в т.ч. статус `partial`, если логотип неудовлетворителен), отметить выполненные task IDs и вернуть Router handoff

**Примечание (FE-FIX-1, finding QG-FE):** FE-6.5 закрыла свою задачу не полностью — правило `.navLink[aria-current=page]::after,.servicesTrigger[data-active=true]::after` осталось со смещением `transform:translate(-50%,11px)`, из-за чего маркер в desktop dropdown «Услуги» визуально смещался ниже и правее строки текста активного пункта (регрессия поймана QG-FE через реальный браузер на `/uslugi/zanyatiya`, `UT-SC-14` — manual-only, поэтому CI её не поймал). Причина: `.navLink`/`.servicesTrigger` — `position:relative` flex-контейнеры с `align-items:center`, поэтому `top:50%` уже соответствует центру строки текста (измерено через DOM `getBoundingClientRect`: разница центров < 1px); любой дополнительный `transform` со смещением по Y (будь то прежний `bottom:4px`, либо `translate(-50%,11px)`) уводит маркер от центра текста вниз. Исправлено в `navigation.module.css` на `transform:translate(-50%,-50%)` — маркер теперь центрируется относительно собственного бокса `.navLink`/`.servicesTrigger`, что совпадает с центром строки текста в обоих контекстах (top-level nav и dropdown) без магических чисел. Визуально подтверждено через `claude-in-chrome` на `/uslugi/zanyatiya` (desktop dropdown, пункт «Занятия»). По расширению scope от Router (разрешено точечно для `navigation.test.tsx`) добавлен регрессионный статический CSS-тест `UT-SC-14` в `navigation.test.tsx` (по паттерну существующих CSS-regex-проверок файла, например `UT-NAV-01`/`UT-NAV-04`): читает `navigation.module.css` через `readFileSync`, находит правило `.navLink[aria-current=page]::after,.servicesTrigger[data-active=true]::after` и проверяет наличие `top:50%` и `transform:translate(-50%,-50%)`, а также отсутствие `bottom:` и любого ненулевого/не-`-50%` Y-сдвига в `translate(...)` (например `11px`). Тест вручную проверен на регрессию: временный откат правила на `translate(-50%,11px)` ломает тест с понятным diff, возврат к `translate(-50%,-50%)` — тест снова зелёный. `npm test` (363 → включая новый тест), `npm run lint`, `npx tsc --noEmit` повторно прогнаны и зелёные. `UT-SC-14` теперь имеет и manual, и автоматическую (CSS-static) регрессионную защиту — geometry-проверка через `getBoundingClientRect` в jsdom невозможна (нет layout-движка), поэтому manual QA по-прежнему остаётся основной проверкой фактической геометрии.

## 9. DATA-1 — Curation price_groups tenant inlove прямой SQL-записью (профиль: Backend)

**Specs:** `inlove-price-group-curation` · **Пути:** данные `price_groups`/`price_groups_relations` tenant `inlove` — прямая SQL-запись в локальную dev-БД `eqsitecms-db` (без diff в `services/backend/src/**`, без вызова API) · **Зависит от:** —

- [x] DATA-1.1 Выполнить `docker inspect eqsitecms-db` (заново), подтвердить параметры подключения к реальной PostgreSQL; получить `equestrian_id` tenant `inlove` (`SELECT id FROM equestrians WHERE service_key='inlove'`)
- [x] DATA-1.2 Сохранить snapshot текущих строк `price_groups`/`price_groups_relations` tenant `inlove` (before) для rollback — включая состав группы «Основные услуги» (11 связей) как эталон для проверки её неизменности
- [x] DATA-1.3 Идемпотентно создать группы «Разовые», «Абонементы», «Прогулки», «Постой частных лошадей» прямым `INSERT` в `price_groups` (`SELECT`-проверка на точное имя перед каждой вставкой — таблица не имеет `UNIQUE` на `name`)
- [x] DATA-1.4 Идемпотентно вставить связи в `price_groups_relations` по маппингу из `specs/inlove-price-group-curation/spec.md` (`SELECT`-проверка на пару `(price_id, group_id)`, `display_order` `1..N` внутри каждой новой группы)
- [x] DATA-1.5 Проверить через `GET /api/prices?groups=<name>` (anonymous, valid selector) для всех четырёх групп, что состав items соответствует назначению; отдельно подтвердить, что состав группы «Основные услуги» не изменился
- [x] DATA-1.6 Повторно применить DATA-1.3–DATA-1.5 и подтвердить отсутствие дубликатов (идемпотентность) — count групп и связей идентичен первому применению
- [x] DATA-1.7 Реализовать и прогнать `SM-SC-01..06` из `design.md` → `## Test matrix` через `.claude/skills/api-smoke-test` на реальной PostgreSQL
- [x] DATA-1.V Зафиксировать before/after snapshot, rollback-инструкцию (`DELETE`/`UPDATE` по сохранённым id) и результаты `SM-SC-01..06` в handoff; отметить выполненные task IDs и вернуть Router handoff

## 10. QG-FE — Quality Gate lane: frontend/browser (профиль: Quality Gate)

**Specs:** все specs этого change · **Пути:** весь diff `services/site-ksk-inlove` · **Зависит от:** `FE-1..FE-6`, `FE-4B`, `DATA-1`

- [x] QG-FE.1 Прогнать `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` из `services/site-ksk-inlove` по всему diff change
- [x] QG-FE.2 Пройти Manual QA steps 1–10 из `design.md` → `## Manual QA steps (UI тестирование)`, зафиксировать passed/failed и скриншоты
- [x] QG-FE.3 Проверить регрессионное покрытие `UT-SC-01..17` относительно фактического diff
- [x] QG-FE.V Вернуть findings владельцам как новые execution units (если есть), иначе зафиксировать lane как пройденный в едином отчёте `QG-SYNTH`

## 11. QG-CONTRACTS — Quality Gate lane: архитектура и контракты (профиль: Quality Gate)

**Specs:** все specs этого change · **Пути:** design-docs + specs + ownership · **Зависит от:** `DOC-1..DATA-1`

- [x] QG-CONTRACTS.1 Сверить diff с `design.md` → `## Access matrix`: подтвердить отсутствие новых/изменённых endpoint'ов и что `DATA-1` не вызывал `POST /api/prices/groups`
- [x] QG-CONTRACTS.2 Проверить, что `docs/sites/inlove/{scheme.md,components.md,design_system_specification.md}` (DOC-1) согласованы с фактической реализацией FE-1..FE-6/FE-4B
- [x] QG-CONTRACTS.3 Проверить ownership: каждый файл изменён ровно одним unit согласно таблице `## Execution units`; подтвердить, что группа «Основные услуги» действительно не используется ни одним loader'ом (`grep`)
- [x] QG-CONTRACTS.V Вернуть findings владельцам как новые execution units (если есть), иначе зафиксировать lane как пройденный

## 12. QG-LIVE — Quality Gate lane: live verification (профиль: Quality Gate)

**Specs:** `inlove-price-group-curation` · **Пути:** — (verification only) · **Зависит от:** `DATA-1`, `FE-4`, `FE-4B`

- [x] QG-LIVE.1 Независимо прогнать `SM-SC-01..06` через `.claude/skills/api-smoke-test` на реальной PostgreSQL (`docker inspect eqsitecms-db` заново)
- [x] QG-LIVE.V Зафиксировать evidence (request/response) в `docs/reports/` и передать в `QG-SYNTH`

## 13. QG-BE — Quality Gate lane: backend/runtime (профиль: Quality Gate)

**Неприменимо.** В `services/backend/src/**` нет diff — `DATA-1` использует прямую SQL-запись, не API и не код. Лейн фиксируется как «неприменимо» с этим обоснованием в едином отчёте `QG-SYNTH`.

## 14. QG-SYNTH — единый вердикт (профиль: Quality Gate)

**Пути:** `docs/reports/**` · **Зависит от:** `QG-FE`, `QG-CONTRACTS`, `QG-LIVE`, `QG-BE`

- [x] QG-SYNTH.1 Свести findings всех применимых lanes в один отчёт `docs/reports/`
- [x] QG-SYNTH.2 Вынести единый вердикт `APPROVED`/`REWORK`; при `REWORK` — вернуть findings владельцам как новые execution units и повторить только затронутые lanes
- [x] QG-SYNTH.V При `APPROVED`: синхронизировать delta specs в main specs (`openspec-sync-specs`), повторно выполнить `openspec validate --strict` и передать change на archive
