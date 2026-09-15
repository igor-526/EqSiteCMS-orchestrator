# Review: inlove-layout-spacing-and-group-filters

**Статус: ✅ APPROVED**
**Дата:** 2026-09-12

## Итог

Diff соответствует утверждённым `proposal.md`/`design.md`/`specs/*`. Один blocking finding (`FE-6.5`, маркер активного пункта dropdown) найден в первом прогоне `QG-FE`, исправлен единственным execution unit `FE-FIX-1` и реверифицирован тем же lane. Все остальные lanes прошли без blocking findings. Access policy не затронута новыми/изменёнными endpoint'ами; `DATA-1` — прямая SQL-запись данных, вне API. Готово к синхронизации specs и архивации.

## OpenSpec

- Change: `openspec/changes/inlove-layout-spacing-and-group-filters/`
- Артефакты: `proposal.md`, `design.md` (Decisions D1–D7, Access matrix, Execution units/DAG, Test matrix, Manual QA steps, PostgreSQL для smoke-тестов), `specs/{inlove-ui-components,inlove-content-pages,inlove-services-pages,inlove-horses-pages,inlove-site-shell,inlove-price-group-curation}/spec.md`, `tasks.md`
- Approval: пользовательский review открытых вопросов закрыл все 5 OQ первой версии (см. `tasks.md` шапка, ревизия design.md), реализация выполнена по подтверждённому плану.
- Задача-источник: `docs/tasks/075_inlove_site_bugs_and_improvements.md`

## Подтверждение чекбоксов tasks.md

Все чекбоксы units `DOC-1`, `FE-1`, `FE-2`, `FE-3`, `FE-4`, `FE-4B`, `FE-5`, `FE-6` (включая `*.V` handoff-пункты) и `DATA-1` отмечены `[x]` в `openspec/changes/inlove-layout-spacing-and-group-filters/tasks.md`. Фикс `FE-FIX-1` (finding первого прогона `QG-FE`) задокументирован отдельным примечанием в разделе FE-6 (не отдельным execution unit с чекбоксами, так как объём — точечная правка одного CSS-правила + один регрессионный тест в уже назначенном FE-6 ownership-файле `navigation.test.tsx`).

## Lanes

| Lane | Статус |
|---|---|
| `QG-FE` | пройден (после одного цикла finding → `FE-FIX-1` → реверификация) |
| `QG-CONTRACTS` | пройден |
| `QG-LIVE` | пройден |
| `QG-BE` | неприменимо — нет diff в `services/backend/src/**`; `DATA-1` — прямая SQL-запись данных, не код (`git -C services/backend status/diff` пуст) |

### QG-FE — детали

- Первый прогон: `npm test` 362/362, `npm run lint` 0 ошибок, `npx tsc --noEmit` чисто, `npm run build` успешно (14 routes). Manual QA 9/10 шагов PASSED; шаг «Header/Footer, маркер активного пункта dropdown» — FAILED (blocking finding, `UT-SC-14` — manual-only, поэтому CI её не поймал).
- Finding: `.navLink[aria-current=page]::after`/`.servicesTrigger[data-active=true]::after` в `src/ui/navigation/navigation.module.css` использовало `transform:translate(-50%,11px)`, из-за чего маркер визуально смещался на 13.3px по Y относительно центра текста.
- Fix `FE-FIX-1`: заменено на `top:50%;transform:translate(-50%,-50%)` — геометрически корректное центрирование относительно `position:relative` flex-контейнера пункта (`align-items:center`), а не магический пиксельный оффсет. Добавлен регрессионный статический CSS-тест в `src/ui/navigation/navigation.test.tsx` по паттерну существующих проверок файла (например `UT-NAV-01`/`UT-NAV-04`): проверяет наличие `top:50%`/`translate(-50%,-50%)` и отсутствие `bottom:`/ненулевого Y-сдвига. Тест вручную проверен на регрессию (временный откат на `translate(-50%,11px)` ломает тест).
- Реверификация: `npm test` 363/363 (включая новый тест), `npm run lint`/`npx tsc --noEmit` чисто. Смещение маркера численно подтверждено через `getBoundingClientRect` в реальном браузере: 13.3px → 0.3px.
- Прочие known-findings первого прогона признаны приемлемыми отклонениями, изменений кода не требуют:
  - FE-6: правка `src/ui/atoms/atoms.module.css` (убран ghost-outline логотипа) — точечная CSS-правка в границах ownership FE-6.
  - FE-4: SSR-eager-both для переключателя «Занятия» — оба групповых запроса (`groups=Разовые`/`groups=Абонементы`) реально выполняются на SSR; удовлетворяет spec-сценарию по существу и соответствует SSR-политике `agents/site_consumer.md`.
  - FE-2: расширение `ContactSection` пропом `trimBottom` в общем файле `src/ui/sections/index.tsx` — совместимо с ownership FE-1/FE-2 на этот файл.
- Non-blocking: формулировка сценария `HorsesGrid` empty-state в `specs/inlove-horses-pages/spec.md` неоднозначна относительно наличия CTA в пустом состоянии (не путать с удалённым `HorsesCta.tsx`, который относится к списочной странице и намеренно убран по `FE-5.2`). Реализация внутренне консистентна с test-matrix (`UT-SC-11`), изменений кода не требует — рекомендация уточнить формулировку spec при следующей ревизии этой capability.

### QG-CONTRACTS — детали

- Access matrix (`design.md` → `## Access matrix`) подтверждена: нет новых/изменённых endpoint'ов; `DATA-1` не вызывал `POST /api/prices/groups` (прямая SQL-запись, см. D6); `git -C services/backend diff`/`status` пуст.
- Design-docs `docs/sites/inlove/{scheme.md,components.md,design_system_specification.md}` (DOC-1) согласованы с фактической реализацией по всем ключевым контрактам: `Section`/`trimBottom`, `IntroSection.spacing`, full-width `EditorialSplitSection`, `TariffCard` (сетка/font-weight/image-link), `GroupedNavigation` (визуальная группа «Услуги», прозрачный логотип, выровненный маркер), `PricesSection` (без `notice`).
- `grep -rn "Основные услуги" src/` в `services/site-ksk-inlove` — совпадения только в комментариях и regression-фикстурах; ни один loader/компонент не использует catch-all группу «Основные услуги» как источник карточек (принцип «страница = группа» подтверждён для всех трёх страниц услуг).
- Ownership: каждый изменённый файл сопоставлен ровно с одним execution unit согласно таблице `tasks.md` → `## Execution units`; совместное владение `src/ui/cards/index.tsx`/`cards.module.css` между `FE-2` (NewsCard) и `FE-3` (TariffCard) — diff по этим файлам непротиворечив, конфликтов записи не найдено.
- `QG-BE` неприменимость подтверждена фактически: `git -C services/backend status`/`diff` пуст (кроме одного нерелевантного untracked файла вне scope этого change).
- Non-blocking: `design.md`/`tasks.md` декларировали `FE-2`/`FE-3` как параллельно исполнимые несмотря на разделяемые файлы `src/ui/cards/index.tsx`/`cards.module.css`, что формально противоречит правилу `AGENTS.md` «пересекающиеся задания выполняются последовательно». На практике Router выполнил их не строго параллельно, файл-конфликта не возникло — доработка сейчас не требуется, но рекомендация: при декомпозиции будущих change с разделяемыми файлами явно помечать такие unit'ы как последовательные, а не «независимые», в таблице Execution units.

### QG-LIVE — детали

Независимый прогон `SM-SC-01..06` через `.claude/skills/api-smoke-test` на реальной PostgreSQL (`eqsitecms-db`, host-порт 5433, tenant `inlove`) — 6/6 PASS:

| # | Сценарий | Результат |
|---|---|---|
| `SM-SC-01` | `GET /api/prices?groups=Разовые` (anonymous, valid selector) | PASS — состав ровно 3 slug'а (`individual-lesson-official`, `group-lesson-official`, `riding-training-yandex`) |
| `SM-SC-02` | `GET /api/prices?groups=Абонементы` (anonymous, valid selector) | PASS — состав ровно 5 тарифов из Context |
| `SM-SC-03` | `GET /api/prices?groups=Прогулки` (anonymous, valid selector) | PASS — состав ровно 2 slug'а |
| `SM-SC-04` | `GET /api/prices?groups=Постой частных лошадей` (anonymous, valid selector) | PASS — единственный item `horse-boarding-yandex` |
| `SM-SC-05` | `GET /api/prices?groups=...` без/с неверным selector | PASS — `401` |
| `SM-SC-06` | `POST /api/prices/groups` без auth | PASS — `401` (регрессия политики доступа) |

Идемпотентность подтверждена: 6 групп / 29 связей до и после повторного прогона `DATA-1.3–DATA-1.5`, дубликатов имён нет.

## Покрытие по test matrix

| Диапазон | Статус |
|---|---|
| `UT-SC-01..13`, `UT-SC-15..17` | покрыто unit/component тестами |
| `UT-SC-14` | покрыто вручную (Manual QA) + добавлен статический CSS regression-тест (`FE-FIX-1`) как дополнительная защита; geometry-проверка через `getBoundingClientRect` в jsdom невозможна, manual QA остаётся основной проверкой фактической геометрии |
| `SM-SC-01..06` | выполнено на реальной PostgreSQL (`QG-LIVE`, независимый повторный прогон) |

Расхождений между `design.md` → `## Test matrix` и фактическим покрытием не найдено.

## Frontend test gate

Из `services/site-ksk-inlove`:

- `npm test`: 363 passed, 0 failed (362 → 363 после `FE-FIX-1`)
- `npm run lint`: 0 ошибок
- `npx tsc --noEmit`: чисто
- `npm run build`: успешно, 14 routes

Self-checks и test quality review — выполнены `QG-FE`, замечаний, требующих доработки, не осталось (см. раздел «QG-FE — детали» выше).

## Access verification results

- Anonymous/public: `GET /api/prices?groups=<name>` для всех 4 групп — `200` с корректным составом (`SM-SC-01..04`); без/с невалидным selector — `401` (`SM-SC-05`).
- Authenticated/protected: `POST /api/prices/groups` без auth — `401`, регрессия политики доступа подтверждена (`SM-SC-06`); endpoint не используется `DATA-1` (прямая SQL-запись в обход API, задокументировано в D6).
- Исключений из дефолтной матрицы (Public Read `GET` / Protected Write `POST/PATCH/DELETE`) в этом change нет — таблица `design.md` → `## Access matrix` описывает только существующее поведение, упражняемое новым frontend-usage.

## Изменённые файлы

`services/site-ksk-inlove` (Site Consumer, все FE-* + DOC-1 design-docs):

- `docs/sites/inlove/{scheme.md,components.md,design_system_specification.md}` (DOC-1)
- `src/ui/foundations/{foundations.module.css,index.tsx,tokens.css,foundations.test.tsx}` (FE-1)
- `src/ui/sections/{index.tsx,sections.module.css,sections.test.tsx}` (FE-1/FE-2/FE-4)
- `src/features/contentPages/home/**`, `src/ui/cards/{index.tsx,cards.module.css,cards.test.tsx}` (FE-2/FE-3)
- `src/features/contentPages/{lessons,rides,boarding}/*.module.css` (FE-3)
- `src/features/contentPages/services/{pricesLoaders.ts,lessonsLoaders.ts,ridesLoaders.ts,boardingLoaders.ts}` + новые unit-тесты (FE-4/FE-4B)
- `src/features/contentPages/lessons/LessonsPrices.tsx` (+ новый `LessonsPrices.test.tsx`) (FE-4)
- `src/features/contentPages/rides/RidesPrices.tsx` (+ новый `RidesPrices.test.tsx`), `src/features/contentPages/boarding/BoardingContent.tsx` (FE-4B)
- `src/features/contentPages/horses/{HorsesContent,HorsesGrid}.tsx`, удалён `HorsesCta.tsx`, `src/features/contentPages/about/AboutContent.tsx` (FE-5)
- `src/ui/navigation/{index.tsx,navigation.module.css,navigation.test.tsx}`, `src/ui/atoms/{index.tsx,atoms.module.css}`, новый `public/images/inlove-logo-transparent.png` (FE-6 + `FE-FIX-1`)

Backend (DATA-1): данные `price_groups`/`price_groups_relations` tenant `inlove` в `eqsitecms-db` — без diff в коде.

Рекомендуемая ветка: `main` (изменения уже находятся в рабочей копии `services/site-ksk-inlove`, отдельный git-репозиторий вне корневого eqSiteCMS согласно `services.manifest`/`.gitignore`).

## Уборка временных артефактов

Проверена рабочая директория `services/site-ksk-inlove` на предмет scratch-файлов предыдущих units (например `.scratch-fe6/`): `find` по маскам `*scratch*`, `*.tmp`, `*.bak` — совпадений нет; `git status --porcelain --ignored` не показывает посторонних untracked путей за пределами ожидаемого diff (изменённые файлы FE-1..FE-6/FE-4B, удалённый `HorsesCta.tsx`, новые `public/images/inlove-logo-transparent.png` и 4 новых test-файла). Мусора не найдено, удалять нечего.

## Non-blocking рекомендации на будущее

1. Уточнить формулировку сценария empty-state `HorsesGrid` в `specs/inlove-horses-pages/spec.md` относительно наличия/отсутствия CTA в пустом состоянии — не блокирует этот change, но снижает риск неоднозначного чтения при следующей ревизии capability.
2. При декомпозиции будущих change с разделяемыми файлами (как `src/ui/cards/index.tsx`/`cards.module.css` между `FE-2`/`FE-3` здесь) явно маркировать такие unit'ы как последовательные в `design.md`/`tasks.md`, а не «независимые», чтобы не полагаться на то, что Router на практике не запустит их строго параллельно.

## Вердикт

Все blocking findings устранены и реверифицированы, access policy не нарушена, покрытие test matrix полное, ownership и specs согласованы с реализацией. **APPROVED.**

Готово к синхронизации delta specs в main specs и архивации change.
