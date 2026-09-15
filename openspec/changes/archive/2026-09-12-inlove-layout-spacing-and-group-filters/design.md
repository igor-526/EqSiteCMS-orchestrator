# Design — inlove-layout-spacing-and-group-filters

**Тикет:** docs/tasks/075_inlove_site_bugs_and_improvements.md
**Дата:** 2026-09-12 (пересмотрено после пользовательского review открытых вопросов)
**Сервисы:** `services/site-ksk-inlove` (Site Consumer, основной объём), `services/backend` (только данные напрямую в БД, без кода), design-docs `docs/sites/inlove/**`

> **Ревизия после review.** Пользователь рассмотрел change и дал решения по всем 5 открытым вопросам первой версии. Ниже — обновлённый design с зафиксированными решениями; апрув на реализацию получен, Planner не приступает к ней сам. Раздел «Open Questions» ниже отражает только это: все прежние пункты закрыты.

## Context

Сайт `site-ksk-inlove` использует переиспользуемый layout-примитив `Section`/`PageContainer` (`src/ui/foundations`) со спецификацией spacing (`docs/sites/inlove/design_system_specification.md` §10–11). Примитив уже существует и используется почти везде — жалобы «слишком много свободного места» вызваны архитектурным дефектом: `Section` не поддерживает margin-collapse, и когда две секции идут подряд, видимый разрыв равен **сумме** нижнего паддинга первой и верхнего паддинга второй (120+120=240px, editorial+default=160+120=280px). Подтверждено чтением кода для всех мест из задачи.

Карточки тарифов (`TariffCard`) используют сетку `repeat(2, 1fr)` на десктопе и портретное `4:5` без мобильного уменьшения. Фильтрация «Занятия»/«Прогулки»/«Постой» построена на клиентских хардкодах (`LESSONS_ALLOWED_SLUGS`, `LESSON_CATEGORY`, `RIDES_NAME_QUERY`/`RIDES_ALLOWED_SLUGS`, `BOARDING_NAME_QUERY`/`BOARDING_ALLOWED_SLUGS`) поверх общей фабрики `createPriceGroupLoaders`.

**Реальные данные БД (проверено напрямую, tenant `inlove` = `equestrian_id` `685c6079-3922-4dbb-95b6-533bc9060547`):** в `price_groups` существует только две группы — «Основные услуги» (11 тарифов: все, что сейчас показывают `/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy`) и «Дополнительные услуги» (7 тарифов, ни один сейчас не отображается ни на одной странице сайта). Групп «Занятия»/«Прогулки»/«Постой»/«Разовые»/«Абонементы» в `price_groups` не существует — эти имена сейчас применяются только к отдельной сущности `horse_service` (используется исключительно для copy-текста страницы, не для фильтрации тарифов).

Точный состав «Основные услуги» по `groups`/`name` (проверено `SELECT` по `prices`/`price_groups_relations`):

| slug | name | текущая страница | новая группа |
|---|---|---|---|
| `individual-lesson-official` | Индивидуальное занятие | zanyatiya | Разовые |
| `group-lesson-official` | Групповое занятие | zanyatiya | Разовые |
| `riding-training-yandex` | Тренировка по верховой езде | zanyatiya | Разовые |
| `training-package-8-official` | Пакет обучения — 8 занятий | zanyatiya | Абонементы |
| `individual-membership-official` | Абонемент на индивидуальные занятия | zanyatiya | Абонементы |
| `subscription-4-yandex` | Абонемент на 4 занятия | zanyatiya | Абонементы |
| `subscription-8-yandex` | Абонемент на 8 занятий | zanyatiya | Абонементы |
| `individual-subscription-8-yandex` | Абонемент на 8 индивидуальных тренировок | zanyatiya | Абонементы |
| `horse-rides-official` | Конные прогулки | progulki | Прогулки |
| `horse-ride-yandex` | Конная прогулка | progulki | Прогулки |
| `horse-boarding-yandex` | Постой частных лошадей | postoy | Постой частных лошадей |

`LESSON_CATEGORY`-словарь (`lessonsLoaders.ts`) уже содержит именно это разбиение single/subscription — подтверждено чтением файла, не выведено по аналогии.

## Goals / Non-Goals

**Goals:**
- Один переиспользуемый механизм схлопывания отступа между смежными `Section`, применяемый автоматически везде.
- Перевести фильтрацию «Занятия»/«Прогулки»/«Постой» на существующий backend `groups`-фильтр, убрав клиентские allow-list/категоризацию/`name`-фильтры **на всех трёх страницах услуг**, а не только на двух — по принципу пользователя «Основных услуг быть не должно. Группа = страница с услугами».
- Закрыть все 11 пунктов docs/tasks/075 в пределах `services/site-ksk-inlove` и design-docs.
- Сохранить существующую access policy без изменений (никаких новых endpoint'ов; `DATA-1` не вызывает Protected Write endpoint вовсе — см. D6).

**Non-Goals:**
- Добавление `group_ids`-фильтра в backend `GET /api/prices` — не требуется, см. D5.
- Удаление/очистка старой группы «Основные услуги» и её 11 связей — пользователь требует лишь, чтобы она **не использовалась активными страницами**; сама группа и её существующие связи остаются нетронутыми (см. D6, Findings).
- Deployment/Helm для `site-ksk-inlove`.
- Перенос данных на stand/production — data-операция строго локальная/dev.
- Изготовление нового брендового логотипа дизайнером — best-effort копия с удалённым фоном, оригинал не трогается (см. D7).
- Redesign `ServiceCard`/`PricesSection` сверх удаления `notice` из контракта.

## Decisions

### D1. Section seam-коллапс вместо суммирования паддингов
Без изменений относительно первой версии: CSS-правило смежности `.section + .section { padding-top: 0; margin-top: var(--space-seam) }` (56px desktop / 32px mobile), с escape hatch для намеренно смежных крупных секций.

### D2. `Section.trimBottom` для границы с `SiteFooter`
Без изменений: явный проп `trimBottom?: boolean`, применяется на `ContactSection` главной и `/about`.

### D3. `IntroSection.spacing` конфигурируемый вместо хардкода `"editorial"`
Без изменений: `spacing?: "editorial" | "compact"`, default `"editorial"`; `/loshadi` и `/about` передают `"compact"`.

### D4. `EditorialSplitSection` full-width вариант без `image`
Без изменений: `grid-template-columns: 1fr`, когда `image` не передан.

### D5. Групповая backend-фильтрация — ПЕРЕСМОТРЕНО (OQ1 + OQ4)
**Решение (OQ1):** вместо одного запроса с повторяемым `?groups=A&groups=B` и неопределённой AND/OR-семантикой используются **два независимых HTTP-запроса**, по одному на каждую группу — семантика становится тривиальной (каждый запрос фильтрует по ровно одному точному имени группы, поведение `groups`-фильтра для единственного значения уже подтверждено кодом `price_repository.py` без всякой двусмысленности). Риск «неизвестная семантика повторяемого параметра» устранён полностью, а не смягчён.

**Решение (OQ4 — расширенный scope):** принцип «одна страница услуг = одна выделенная price-группа» применяется ко **всем трём** страницам услуг, не только к «Занятиям»/«Постою»:
- `/uslugi/zanyatiya` — переключатель запрашивает `GET /api/prices?groups=Разовые` либо `GET /api/prices?groups=Абонементы` (два раздельных запроса, по одному на состояние тумблера).
- `/uslugi/progulki` — `GET /api/prices?groups=Прогулки` (новая группа) вместо `?name=Конные+прогулки&name=Конная+прогулка`.
- `/uslugi/postoy` — `GET /api/prices?groups=Постой частных лошадей` вместо `?name=Постой+частных+лошадей`.

Ни одна из трёх страниц MUST NOT обращаться к группе «Основные услуги» после этого change.

**Detail-route guard (`/uslugi/.../[slug]`)** больше не сверяется со статическим массивом slug'ов. `GET /api/prices/{slug_or_id}` уже возвращает поле `groups: PriceGroupSimpleDto[]` у каждого тарифа (подтверждено `pricesLoaders.ts`/`types/prices.ts`) — guard проверяет, что `detail.groups` содержит имя одной из групп, допустимых для этой страницы (`{Разовые, Абонементы}` для zanyatiya; `{Прогулки}` для progulki; `{Постой частных лошадей}` для postoy). Это заменяет старые константы `LESSONS_ALLOWED_SLUGS`/`RIDES_ALLOWED_SLUGS`/`BOARDING_ALLOWED_SLUGS` полностью — ни список групп, ни список slug'ов не хардкодятся как источник состава карточек, только как **допустимое множество имён групп страницы** (что само по себе — «неизменяемые идентификаторы профильного API», по формулировке `scheme.md`, а не производный от данных allow-list).

**Фабрика `createPriceGroupLoaders`:** `allowedSlugs` становится необязательным параметром (по умолчанию — без фильтрации, полное доверие backend-группе); `nameQuery`-режим перестаёт использоваться живыми страницами (остаётся в типе как неиспользуемый legacy-path, либо убирается, если не мешает другим потребителям — решает FE-4/FE-4B по факту чтения файла).

**Альтернативы:** (a) один repeatable-запрос — отклонено пользователем как источник неопределённости; (b) добавить `group_ids` в backend — не требуется, см. Non-Goals.

### D6. Данные — прямая запись в БД вместо API (ПЕРЕСМОТРЕНО, OQ2)
**Решение:** `DATA-1` выполняет создание групп и назначение тарифов **напрямую в PostgreSQL** (`INSERT` в `price_groups`, `INSERT` в `price_groups_relations`) локальной dev-БД `eqsitecms-db`, а не через discovery неподтверждённого CMS/API endpoint'а. Это устраняет риск «relation-assignment endpoint не подтверждён» из первой версии полностью — он больше не применим, т.к. API не используется вовсе для этой операции.

Обязательные гарантии прямой записи:
- **Snapshot before/after** точных строк `price_groups`/`price_groups_relations` для `equestrian_id` tenant `inlove` (уже требовалось Migration Plan п.5 первой версии — здесь становится единственным механизмом отката, т.к. `POST`/`PATCH` history через API отсутствует).
- **Строго локальная dev-БД** (`eqsitecms-db`, порт `5433` на момент планирования, переподтверждается `docker inspect` перед записью) — никогда не stand/production.
- **Идемпотентность на уровне SQL**: `INSERT` группы только если `NOT EXISTS` строки с точным `name` для этого `equestrian_id`; `INSERT` связи только если `NOT EXISTS` строки `(price_id, group_id)`.
- **`display_order`**: для каждой новой группы новые связи получают последовательные `1..N` (группа создаётся пустой — коллизий с `uix_price_groups_relations_group_order` нет; правило двухфазного сдвига из `agents/backend.md` §5.1 неприменимо, т.к. это не reorder существующих строк, а первичная вставка в пустую группу).

Четыре группы вместо трёх (расширение из-за OQ4): «Разовые», «Абонементы», «Прогулки», «Постой частных лошадей» — состав см. таблицу в Context.

**Альтернатива:** seed через Alembic-миграцию — отклонена, как и в первой версии (`price_groups` принципиально управляется данными, не миграциями).

### D7. Логотип — best-effort прозрачность, копия вместо перезаписи (ПЕРЕСМОТРЕНО, OQ5)
**Решение:** создаётся **новый файл** `public/images/inlove-logo-transparent.png` — копия существующего `inlove-logo.jpg` с автоматически удалённым белым фоном (flood-fill/chroma-key, alpha-канал). **Оригинальный `inlove-logo.jpg` не изменяется и не удаляется** (остаётся в репозитории как есть — фактическая причина появления бага, но также fallback/источник, если прозрачная версия окажется неудовлетворительного качества). `Logo`-компонент (`src/ui/atoms/index.tsx`) переключается на новый файл как основной asset.
Если автоматический результат неудовлетворителен (сложные края, тени) — `FE-6` возвращается `partial`, оригинальный JPG остаётся действующим (без регресса), открытый вопрос эскалируется за исходным ассетом от владельца бренда.

## Risks / Trade-offs

- **[Риск] Автоматическое удаление фона логотипа даёт артефакты на сложных краях** → Митигация: копия, а не перезапись (D7) — оригинал всегда доступен как безопасный откат; явная visual QA перед переключением `Logo`-компонента.
- **[Риск] Seam-CSS-правило `.section + .section` может неожиданно сработать там, где нужен полный отступ** → Митигация: явный escape hatch (data-атрибут), задокументированный в `components.md`.
- **[Trade-off] `trimBottom` — явный проп, а не универсальное CSS-правило** → осознанно: 2 применения не оправдывают неявное поведение на границе разнородных компонентов.
- **[Trade-off] Два HTTP-запроса вместо одного для переключателя «Занятия»** → осознанно принято пользователем (OQ1): убирает риск неверной интерпретации AND/OR-семантики полностью; цена — одно дополнительное сетевое обращение при переключении тумблера (или при первом SSR обоих состояний, если оба нужны сразу — решает FE-4 по UX: либо lazy-fetch второго состояния при переключении, либо оба сразу при SSR для мгновенного клиентского переключения без загрузки; оба варианта совместимы со спецификацией, выбор — deталь реализации FE-4, не blocking для этого design).
- **[Trade-off] Прямая SQL-запись в `DATA-1` вместо API** → осознанно принято пользователем (OQ2): быстрее и не зависит от неподтверждённого endpoint'а; цена — обход `PriceGroupService._ensure_unique_name`/бизнес-валидации сервисного слоя, поэтому идемпотентность и уникальность имени `DATA-1` обязан проверять сам через `SELECT ... WHERE name = ... AND equestrian_id = ...` перед `INSERT`, а не полагаться на constraint (в БД нет `UNIQUE` на `(equestrian_id, name)`, только обычный индекс — см. Access matrix).
- **[Finding, не риск] «Основные услуги» станет полностью неиспользуемой активными страницами** после `FE-4`/`FE-4B`, но её 11 существующих связей и сама группа остаются в БД нетронутыми (пользователь разрешил оставить как deprecated, не требовал очистки). Единственный текущий потребитель имени группы в коде — `LESSONS_GROUP_NAME` в `lessonsLoaders.ts`, который `FE-4` удаляет; других ссылок на «Основные услуги» в `services/site-ksk-inlove/src` не найдено (подтверждено `grep`).

## Migration Plan

1. `DOC-1` (design-docs) — первым.
2. `FE-1` (spacing primitive) — база для page-level units.
3. `FE-2`, `FE-3`, `FE-4`, `FE-5`, `FE-6` — параллельно там, где не пересекаются файлами (см. обновлённый DAG ниже); `FE-4B` следует за `FE-4` (использует обновлённую `pricesLoaders.ts`).
4. `DATA-1` — независим по коду, выполняется в любой момент, но должен завершиться до live/manual-проверки `FE-4`/`FE-4B` и до `QG-LIVE`.
5. Rollback: page-level/primitive-изменения — `git revert`. `DATA-1` — restore из snapshot before (прямой `DELETE`/`UPDATE` по сохранённым id, только для tenant `inlove`, только в dev-БД).

## Open Questions

Все 5 открытых вопросов первой версии закрыты пользовательским review (см. Decisions D5–D7 выше). Новых blocking-вопросов эта ревизия не порождает. Единственный non-blocking finding зафиксирован выше («Основные услуги» remains deprecated-in-place) — не требует решения пользователя, только awareness Router/Quality Gate.

Подтверждённая находка по detail-route CTA (закрывает бывший OQ3): `services/site-ksk-inlove/src/features/contentPages/horses/HorseDetail.tsx` (рендерит `/loshadi/[slug]`) **не содержит никакого CTA/кнопки записи** — прочитан целиком, единственные интерактивные элементы: ссылка «Все лошади клуба» и retry-ссылка на error-state. Пользовательское решение «если CTA есть и на detail — тоже удалить» в данном случае не требует изменений кода, т.к. удалять нечего; `FE-5` фиксирует это как подтверждённый факт в handoff, а не как открытый риск.

## Access matrix

Никаких новых или изменённых endpoint'ов. `DATA-1` теперь не вызывает ни один из них (прямая запись в БД, см. D6) — таблица ниже документирует существующие endpoint'ы, которые упражняются этим change через **frontend**-переключение источника запроса, и регрессионно проверяет, что `POST /api/prices/groups` (которым `DATA-1` сознательно не пользуется) продолжает требовать авторизацию.

| Method | Path | Access class | Роли | Expected without auth/selector | Expected with auth/selector |
|---|---|---|---|---|---|
| `GET` | `/api/prices?groups=<exact name>` | Public Read + tenant selector | нет | `401` missing/invalid selector | `200`, items только своего tenant и группы («Разовые», «Абонементы», «Прогулки», «Постой частных лошадей») |
| `GET` | `/api/prices/{slug_or_id}` | Public Read + tenant selector | нет | `401` | `200` при `detail.groups` ∩ допустимые группы страницы ≠ ∅; `404` иначе |
| `POST` | `/api/prices/groups` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | не используется `DATA-1` (см. D6); проверяется только регрессионно — политика доступа endpoint'а не должна была измениться |

`price_groups.name` не имеет `UNIQUE`-ограничения на уровне БД (только обычный индекс `(equestrian_id, name)`) — уникальность обеспечивает сервисный слой API (`_ensure_unique_name`), который `DATA-1` **обходит**, поэтому `DATA-1` обязан сам проверить отсутствие точного имени перед `INSERT` (см. D6/Risks).

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| `DOC-1` | Site Consumer | Design docs | `docs/sites/inlove/scheme.md`, `docs/sites/inlove/components.md`, `docs/sites/inlove/design_system_specification.md` | — | ручная сверка с proposal/design |
| `FE-1` | Site Consumer | Spacing primitive | `services/site-ksk-inlove/src/ui/foundations/**`, `src/ui/sections/index.tsx`, `src/ui/sections/sections.module.css` | `DOC-1` | `npm test`, `npm run lint`, `npx tsc --noEmit` |
| `FE-2` | Site Consumer | Главная | `src/features/contentPages/home/**`, `src/ui/cards/index.tsx` (NewsCard), `src/ui/cards/cards.module.css` | `FE-1` | `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` |
| `FE-3` | Site Consumer | Карточки тарифов | `src/ui/cards/index.tsx` (TariffCard), `src/ui/cards/cards.module.css`, `src/features/contentPages/{lessons,rides,boarding}/*.module.css` | `DOC-1` | `npm test`, `npm run lint`, `npx tsc --noEmit` |
| `FE-4` | Site Consumer | Занятия: групповая фильтрация + notice cleanup | `src/features/contentPages/services/pricesLoaders.ts`, `src/features/contentPages/services/lessonsLoaders.ts`, `src/features/contentPages/lessons/LessonsPrices.tsx`, `src/ui/sections/index.tsx` (PricesSection notice-контракт) | `DOC-1`, `FE-1` | `npm test`, `npm run lint`, `npx tsc --noEmit` |
| `FE-4B` | Site Consumer | Прогулки + Постой: групповая фильтрация, Постой spacing, notice cleanup Rides | `src/features/contentPages/services/ridesLoaders.ts`, `src/features/contentPages/services/boardingLoaders.ts`, `src/features/contentPages/rides/RidesPrices.tsx`, `src/features/contentPages/boarding/BoardingContent.tsx` | `FE-4` | `npm test`, `npm run lint`, `npx tsc --noEmit` |
| `FE-5` | Site Consumer | Наши лошади + О клубе | `src/features/contentPages/horses/{HorsesContent,HorsesGrid,HorsesCta}.tsx`, `src/features/contentPages/about/AboutContent.tsx` | `FE-1` | `npm test`, `npm run lint`, `npx tsc --noEmit` |
| `FE-6` | Site Consumer | Header/Footer | `src/ui/navigation/**`, `src/ui/atoms/index.tsx` (Logo), новый файл `public/images/inlove-logo-transparent.png` (оригинал `inlove-logo.jpg` не изменяется) | `DOC-1` | `npm test`, `npm run lint`, `npx tsc --noEmit`; визуальная проверка |
| `DATA-1` | Backend | Price group curation | БД `price_groups`/`price_groups_relations` tenant `inlove` — прямая SQL-запись в локальной dev-БД `eqsitecms-db` (без diff в `services/backend/src/**`, без вызова API) | — | `docker inspect` DB-параметров, before/after snapshot, `GET /api/prices?groups=...` через `.claude/skills/api-smoke-test` |
| `QG-FE` | Quality Gate | — | весь diff `services/site-ksk-inlove` | `FE-1..FE-6`, `FE-4B`, `DATA-1` | `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, Manual QA |
| `QG-CONTRACTS` | Quality Gate | — | design-docs + specs + ownership | `DOC-1..DATA-1` | сверка diff с access matrix, ownership, design-docs |
| `QG-LIVE` | Quality Gate | — (verification only) | `DATA-1`, `FE-4`, `FE-4B` | `SM-SC-01..06` через `.claude/skills/api-smoke-test` на реальной PostgreSQL |
| `QG-BE` | Quality Gate | — | — | **неприменимо**: нет diff в `services/backend/src/**` (данные — прямой SQL, не код) |
| `QG-SYNTH` | Quality Gate | — | `docs/reports/**` | `QG-FE`, `QG-CONTRACTS`, `QG-LIVE`, `QG-BE` | единый вердикт |

### DAG зависимостей

```text
DOC-1 ─┬→ FE-1 ─┬→ FE-2 ────────────────────┐
       │        ├→ FE-4 → FE-4B ────────────┤
       │        └→ FE-5 ────────────────────┤
       ├→ FE-3 ─────────────────────────────┤
       └→ FE-6 ─────────────────────────────┤
                                             │
DATA-1 ──────────────────────────────────────┴→ QG-FE ─┐
                                          QG-CONTRACTS ─┤→ QG-LIVE → QG-SYNTH
                                     QG-BE (неприменимо) ┘
```

`FE-2`, `FE-3`, `FE-5`, `FE-6` независимы друг от друга и могут делегироваться параллельно после `DOC-1`(+`FE-1` где применимо). `FE-4B` строго после `FE-4` (тот же профиль, последовательные units одного deliverable). `DATA-1` независим по коду и может идти параллельно с любым `FE-*`, но должен завершиться до `QG-LIVE` и до финальной manual-проверки `FE-4`/`FE-4B`.

## Test matrix

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где проверяется |
|---|---|---|---|---|---|
| `UT-SC-01` | unit | happy path | `NewsCard` с `variant="compact"` рендерит изображение и текст горизонтально | DOM-структура горизонтальная | component tests |
| `UT-SC-02` | unit | happy path | `TariffCard` оборачивает изображение в `Link` на `href` detail-страницы | `<a>`/`<Link>` вокруг image с корректным `href` | component tests |
| `UT-SC-03` | unit | responsive/edge | `TariffCard` на mobile-breakpoint использует уменьшенное соотношение изображения | class/style отличается от desktop `4:5` | component/CSS test |
| `UT-SC-04` | unit | happy path | `createPriceGroupLoaders` без `allowedSlugs` возвращает все items ответа группы | список равен ответу API один-в-один | loader unit test с моком API |
| `UT-SC-05` | unit | happy path | Переключатель «Занятия» выполняет **два отдельных запроса** `groups=Разовые`/`groups=Абонементы` вместо `LESSON_CATEGORY`-словаря | assert на двух раздельных URL/вызовах API-мока, без repeatable `groups=` | loader/hook unit test |
| `UT-SC-06` | unit | happy path | `boardingLoaders` использует `groups=Постой частных лошадей` вместо `name=` | assert на параметрах вызова | loader unit test |
| `UT-SC-07` | unit | edge/empty | Пустой ответ группы рендерит «Стоимость уточняется» с сохранённым CTA | fallback-текст + CTA видимы | component test |
| `UT-SC-08` | unit | внешняя ошибка | Сетевая ошибка/5xx на loader рендерит error state с retry | error UI + retry control | component test |
| `UT-SC-09` | unit | регрессия (п.7) | `PricesSection`/`LessonsPrices`/`RidesPrices` никогда не рендерят `InlineNotice` | отсутствие notice-текста в DOM независимо от пропа | component test |
| `UT-SC-10` | unit | регрессия (п.8) | `HorsesGrid` не рендерит `<h2>Лошади клуба</h2>` | заголовок отсутствует в DOM | component test |
| `UT-SC-11` | unit | регрессия (п.10) | `/loshadi` (`HorsesContent`) не рендерит `HorsesCta`/«Записаться…» | компонент отсутствует в дереве | component test |
| `UT-SC-12` | unit | регрессия (п.11) | `EditorialSplitSection` без `image` занимает полную ширину | class/computed style без узкой 4fr-колонки | component/CSS test |
| `UT-SC-13` | unit | регрессия (п.1) | Смежные `<Section>` получают seam-класс/CSS-переменную вместо раздельных паддингов | CSS custom property/class присутствует на втором элементе | component/snapshot test |
| `UT-SC-14` | manual | регрессия (п.9, маркер) | Маркер активного пункта dropdown визуально совпадает по вертикали с текстом | нет автотеста — см. Manual QA | Manual QA |
| `UT-SC-15` | unit | happy path | `GroupedNavigation` «Услуги» рендерит визуальный group-контейнер в mobile/footer меню | наличие нового group-класса в DOM | component test |
| `UT-SC-16` | unit | happy path | `ridesLoaders` использует `groups=Прогулки` вместо `name=Конные+прогулки&name=Конная+прогулка` | assert на параметрах вызова, отсутствие `name=` | loader unit test |
| `UT-SC-17` | unit | регрессия/security | Detail-route guard (`zanyatiya`/`progulki`/`postoy`) проверяет `detail.groups` вместо статического массива slug; тариф чужой страницы (валидная группа, но не из допустимого множества этой страницы) даёт `not-found` | `loadDetail` возвращает `{status:'not-found'}` для тарифа вне допустимых групп страницы | loader unit test |
| `SM-SC-01` | smoke | happy path / access | anonymous `GET /api/prices?groups=Разовые` с валидным selector | `200`, items = `individual-lesson-official`, `group-lesson-official`, `riding-training-yandex` | `.claude/skills/api-smoke-test` |
| `SM-SC-02` | smoke | happy path / access | anonymous `GET /api/prices?groups=Абонементы` с валидным selector | `200`, items = 5 тарифов из таблицы Context | `.claude/skills/api-smoke-test` |
| `SM-SC-03` | smoke | happy path / access | anonymous `GET /api/prices?groups=Прогулки` с валидным selector | `200`, items = `horse-rides-official`, `horse-ride-yandex` | `.claude/skills/api-smoke-test` |
| `SM-SC-04` | smoke | happy path / access | anonymous `GET /api/prices?groups=Постой частных лошадей` с валидным selector | `200`, единственный item `horse-boarding-yandex` | `.claude/skills/api-smoke-test` |
| `SM-SC-05` | smoke | access matrix | Любой из запросов `SM-SC-01..04` без/с неверным selector | `401` | `.claude/skills/api-smoke-test` |
| `SM-SC-06` | smoke | access matrix (регрессия) | `POST /api/prices/groups` без auth (регрессионная проверка — `DATA-1` этот endpoint не вызывает) | `401` | `.claude/skills/api-smoke-test` |

Трассировка: `UT-SC-09` → `inlove-services-pages` (notice removal), `UT-SC-10`/`UT-SC-11` → `inlove-horses-pages`, `UT-SC-12` → `inlove-content-pages` (about full-width), `UT-SC-13` → `inlove-ui-components` (seam), `UT-SC-05/06/16/17` → `inlove-services-pages` (группо-ориентированная фильтрация всех трёх страниц), `SM-SC-01..06` → access matrix выше и `inlove-price-group-curation`.

## PostgreSQL для smoke-тестов

Обнаружен через `docker ps --filter label=com.docker.compose.service=db` + `docker inspect` (переподтверждено на момент этой ревизии):

- Контейнер: `eqsitecms-db`
- `Config.Image`: `postgres:16`
- Compose labels: `com.docker.compose.project=eqsitecms-core`, `com.docker.compose.service=db`
- Env: `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`
- Host port для `5432/tcp`: `5433`
- Tenant `inlove`: `equestrian_id = 685c6079-3922-4dbb-95b6-533bc9060547`, `service_key = inlove`

`DATA-1` и `QG-LIVE` обязаны заново выполнить `docker inspect eqsitecms-db` перед записью/проверкой, а не полагаться на значения выше как постоянные.

## Manual QA steps (UI тестирование)

Предусловия: `services/site-ksk-inlove` запущен локально, `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` настроен на валидный tenant `inlove`, `DATA-1` выполнен (4 группы существуют и заполнены).

1. **Главная (`/`)** — viewport 375/768/1440px: разрыв «карточки услуг → Новости» и «Контакты → Footer» визуально ~в 4 раза меньше прежнего; новость — горизонтальная компактная карточка на всю ширину.
2. **Услуги (`/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy`)** — desktop 1440px: сетка тарифов 3 в ряд; название тарифа полужирное; клик по изображению → detail; mobile: изображение заметно меньше, клик по изображению не переходит. Notice-блок отсутствует на всех трёх страницах.
3. **Занятия — переключатель** — переключить «Разовые»/«Абонементы»: devtools network показывает **два отдельных** запроса `?groups=Разовые` и `?groups=Абонементы` (не один repeatable), набор карточек соответствует таблице в Context.
4. **Прогулки** — network tab показывает `?groups=Прогулки`, а не `?name=`; отображаются оба тарифа (`horse-rides-official`, `horse-ride-yandex`) раздельно.
5. **Постой** — network tab показывает `?groups=Постой частных лошадей`, а не `?name=`; разрыв между «Постой»/«Инфраструктура»/«Что входит»/«Стоимость» сокращён аналогично главной.
6. **Наши лошади (`/loshadi`)** — заголовок «Лошади клуба» отсутствует; разрыв заголовок→сетка сокращён ~в 4 раза; кнопка «Записаться…» отсутствует на списочной странице. Открыть `/loshadi/[slug]` и подтвердить, что там по-прежнему нет никакого CTA (ожидаемо — подтверждено чтением кода, см. `design.md` Open Questions).
7. **Header/Footer** — логотип без белого прямоугольника (новый `inlove-logo-transparent.png`), в т.ч. на тёмном `tone`; «Услуги» в мобильном и footer-меню визуально читается как группа; desktop dropdown маркер активного пункта на одном уровне с текстом.
8. **О клубе (`/about`)** — разрыв «шапка → первый заголовок» сокращён ~в 4 раза; второй блок (если оба `about_2_*` заполнены) занимает всю ширину.
9. **Reduced motion / keyboard / focus** — повторить пункты 1–8 с `prefers-reduced-motion: reduce` и клавиатурной навигацией там, где менялась интерактивность.
10. **Итоговый отчёт QA:** passed/failed по каждому пункту, скриншоты до/после для главной/услуг/лошадей/header на 375 и 1440px, network-body для `SM-SC-01..04` подтверждающий групповую фильтрацию всех трёх страниц.
