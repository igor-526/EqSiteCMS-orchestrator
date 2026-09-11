# Development Report: inlove-dynamic-pages — Quality Gate

**Статус:** `APPROVED`
**Дата:** `2026-09-11`
**Рекомендуемая ветка:** `inlove-dynamic-pages`

## Ссылки

- OpenSpec change: [`openspec/changes/inlove-dynamic-pages/`](../../openspec/changes/inlove-dynamic-pages/) (`proposal.md`, `design.md`, `tasks.md`, `specs/inlove-services-pages`, `specs/inlove-horses-pages`, `specs/inlove-placeholder-pages`)
- Задача: [`docs/tasks/072_inlove_dynamic_pages.md`](../tasks/072_inlove_dynamic_pages.md)

## Краткий контекст

Change заменяет четыре сохранявшиеся заглушки INLOVE (`/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy`, `/loshadi`) на полноценный SSR-контент и добавляет для каждой из четырёх страниц detail route по slug сущности (`GET /api/prices/{slug_or_id}`, `GET /api/horses/{slug_or_id}` — оба backend endpoint уже существовали и публичны). Единственный владелец реализации — Site Consumer (`services/site-ksk-inlove`); backend не менялся по scope, за исключением одного точечного remediation (`BE-FIX-1`), согласованного с пользователем после находки `QG-LIVE`.

Все execution units (SC-1..SC-5, разделы 1–5 tasks.md) и Quality Gate lanes (раздел 6) выполнены; после `BE-FIX-1` (раздел 8) повторно прогнаны затронутые lanes `QG-CONTRACTS`/`QG-LIVE`. Этот отчёт — синтез `QG-SYNTH` (задача 6.4), выполняемый после раздела 8 и до раздела 7 (sync/archive, отдельный execution unit).

## Измененные файлы

| Группа | Файлы | Что изменено |
| --- | --- | --- |
| **SC-1: shared services-инфраструктура + Услуги/Занятия и абонементы** | `src/features/contentPages/services/{loaders.ts (изм.), pricesLoaders.ts}`; `src/features/contentPages/services/lessonsLoaders.{ts,test.ts}`; `src/features/contentPages/lessons/{LessonsContent,LessonsDetail,LessonsCta,LessonsPrices}.tsx` + `LessonsContent.test.tsx`, `LessonsDetail.test.tsx`, `lessons.module.css`, `detail.module.css`; `src/app/uslugi/zanyatiya/page.tsx` (изм.); `src/app/uslugi/zanyatiya/[slug]/page.tsx` (новый) | Параметризованный cache()-loader тарифов + allow-list slug для zanyatiya; список/переключатель «Разовые/Абонементы»/CTA; detail route с allow-list guard и `notFound()` |
| **SC-2: Услуги/Прогулки** | `src/features/contentPages/services/ridesLoaders.{ts,test.ts}`; `src/features/contentPages/rides/{RidesContent,RidesDetail,RidesCta,RidesPrices}.tsx` + `RidesContent.test.tsx`, `RidesDetail.test.tsx`, `rides.module.css`, `detail.module.css`; `src/app/uslugi/progulki/page.tsx` (изм.); `src/app/uslugi/progulki/[slug]/page.tsx` (новый) | Allow-list slug (`horse-rides-official`/`horse-ride-yandex`), список с раздельными вариантами, detail route с guard |
| **SC-3: Услуги/Постой** | `src/features/contentPages/services/boardingLoaders.ts`; `src/features/contentPages/boarding/{BoardingContent,BoardingDetail,BoardingCta,BoardingPrices}.tsx` + `BoardingContent.test.tsx`, `BoardingDetail.test.tsx`, `boarding.module.css`, `detail.module.css`; `src/app/uslugi/postoy/page.tsx` (изм.); `src/app/uslugi/postoy/[slug]/page.tsx` (новый) | Allow-list slug (`horse-boarding-yandex`), инфраструктура/«Что входит»/требования, detail route с guard |
| **SC-4: Наши лошади** | `src/features/contentPages/horses/{loaders.ts + loaders.test.ts, HorsesContent, HorsesGrid, HorsesCta, HorseDetail}.tsx` + `HorsesContent.test.tsx`, `HorseDetail.test.tsx`, `horses.module.css`, `detail.module.css`; `src/app/loshadi/page.tsx` (изм.); `src/app/loshadi/[slug]/page.tsx` (новый); `src/ui/cards/{index.tsx,cards.module.css}` (изм.), `src/ui/controls/{index.tsx,controls.module.css}` (изм.) | Сетка карточек лошадей, раскрываемые подробности, detail route с `this_stable === true`-guard (D3, приватность постойных лошадей); расширение переиспользуемых `ui/cards`/`ui/controls` |
| **SC-5: Карта маршрутов и документация** | `src/features/placeholderPages/{metadata.ts, routeTree.test.ts, placeholderPages.test.tsx, chromeCompatibility.test.tsx}` (все изм., feature не удалена); `docs/sites/inlove/scheme.md` (изм.) | Удалены 4 маршрута из `PLACEHOLDER_ROUTES`/route-тестов карты сайта; в `scheme.md` добавлен подраздел «Детали сущности» в 4 секции, заменена фраза про отсутствие detail route для лошадей, дополнена матрица доступа |
| **BE-FIX-1 (remediation, вне исходного scope proposal.md, согласовано с пользователем)** | `services/backend/src/core/services/prices.py` (+2/-2), `services/backend/tests/unit/core/services/test_price_service.py` (+2/-2) | `PriceService.get_by_slug_or_id`: `raise ClientError` → `raise NotFoundError` для отсутствующей записи (по аналогии с `HorseService._get_horse_by_slug`), 400 → 404; регрессионный тест на 404 |

Ownership подтверждён скриптом (`git status`/`git diff --stat` в обоих подрепозиториях): diff `services/site-ksk-inlove` строго ограничен путями выше плюс `docs/sites/inlove/scheme.md` и `openspec/changes/inlove-dynamic-pages/**`; diff `services/backend` строго ограничен двумя файлами BE-FIX-1 (4+4 строки) — никаких посторонних изменений backend в рамках этого change не затронуто (параллельные несвязанные правки backend, видимые в рабочем дереве по user-management, к этому change не относятся и не входят в diff).

## Unit / Integration тесты

| Команда | Результат | Примечание |
| --- | --- | --- |
| `npm test` (`services/site-ksk-inlove`) | `314 passed` | Все новые и относящиеся тесты (SC-1..SC-5) зелёные |
| `npm run lint` (`services/site-ksk-inlove`) | `0 errors` | — |
| `npm run build` (`services/site-ksk-inlove`) | `passed` | Чистая сборка |
| `test_price_service.py` (`services/backend`, unit) | `30 passed` | Включая регрессионный тест `BE-FIX-1` (404 вместо 400) |
| Соседние unit-тесты того же service-слоя backend | `72 passed` | Без регрессий от `BE-FIX-1` |

## SMOKE-тесты

Выполнены lane `QG-LIVE` через прямые curl-запросы к реальному backend (первый прогон — до `BE-FIX-1`, повторный — после, по разделу 8 tasks.md). `QG-SYNTH` тесты повторно не запускал.

| # | Endpoint | Method | HTTP | Результат | Примечание |
| --- | --- | --- | --- | --- | --- |
| `SM-01` | `/api/horses/{slug_or_id}` (валидный slug, свой tenant `inlove`) | `GET` | `200` | `passed` | Первый прогон |
| `SM-02` | `/api/horses/{slug_or_id}` (без tenant selector) | `GET` | `401` | `passed` | Non-secret identity hint отсутствует |
| `SM-03` | `/api/horses/{slug_or_id}` (неверный selector) | `GET` | `401` | `passed` | — |
| `SM-04` | `/api/horses/{slug_or_id}` (несуществующий slug) | `GET` | `404` | `passed` | — |
| `SM-05` | `/api/horses/{slug_or_id}` (slug чужого tenant) | `GET` | `404` | `passed` | — |
| `SM-06` | `/api/prices/{slug_or_id}` (валидный slug `individual-lesson-official`) | `GET` | `200` | `passed` | До и после `BE-FIX-1` |
| `SM-07` | `/api/prices/{slug_or_id}` (несуществующий slug `nonexistent-price-slug-xyz123`) | `GET` | `400` → `404` | `failed` → `passed` | **До `BE-FIX-1`: 400 (finding)**; повторный прогон после фикса: 404, регрессии нет |
| `SM-08` | `/api/prices/{slug_or_id}` (slug `vyezdka` чужого tenant `aleksandrova-dacha`) | `GET` | `400` → `404` | `failed` → `passed` | **До `BE-FIX-1`: 400 (finding)**; повторный прогон после фикса: 404, регрессии нет |
| `SM-09` | `/api/horses/{slug_or_id}` (supplementary, tenant `aleksandrova-dacha`, `this_stable=true` запись) | `GET` | `200` | `passed` | Подтверждает механизм D3: backend не фильтрует `this_stable` |
| `SM-10` | `/api/horses/{slug_or_id}` (supplementary, tenant `aleksandrova-dacha`, `this_stable=false` запись) | `GET` | `200` | `passed` (с оговоркой) | Backend отдаёт 200 несмотря на `this_stable=false` — обосновывает необходимость site-side guard (D3); проверено не на `inlove` из-за отсутствия seed-данных лошадей у этого tenant (см. «Замечания и риски») |

Точные значения времени (ms) по каждому запросу не были зафиксированы в handoff `QG-LIVE`, доступному `QG-SYNTH` для синтеза; агрегированный факт — оба прогона (до и после `BE-FIX-1`) выполнены через прямые curl-запросы к реальному backend без ошибок инфраструктуры/таймаутов. Это отмечено как процедурное несовершенство отчётности лейна, не как пропуск проверки — сами HTTP-статусы подтверждены дважды.

Итог SMOKE: `10/10 passed` (после `BE-FIX-1`; 2 из 10 изначально `failed` на первом прогоне и устранены remediation).

## Замечания и риски

Все пункты ниже — non-blocking findings и явно принятое ограничение окружения; blocking findings отсутствуют.

1. **[QG-FE, low]** `LessonsDetail`/`RidesDetail`/`BoardingDetail.tsx` почти дословно дублируются — напрашивается общий `TariffDetail`.
2. **[QG-FE, low]** `LessonsCta`/`RidesCta`/`BoardingCta`/`HorsesCta.tsx` дублируются — напрашивается общий `ServiceCta`.
3. **[QG-FE, low]** Нет `pricesLoaders.test.ts`/`boardingLoaders.test.ts`: allow-list/nameQuery для boarding покрыт только косвенно через component-тесты, не отдельным unit-тестом loader'а.
4. **[QG-FE, informational]** Сетка лошадей всегда «3 в ряд» вместо буквального «3–4» из spec — соответствует existing site-wide конвенции, не blocking.
5. **[QG-FE, informational]** `priceDetail`/`horseDetail` detail-запросы без `AbortSignal.timeout`, в отличие от list-запросов — defensive-programming наблюдение, не нарушение spec.
6. **[QG-LIVE, limitation, принято явно]** У tenant `inlove` в БД 0 записей `horse` (осознанное решение `seed.sql`), поэтому валидный сценарий `this_stable=true`/`this_stable=false` для лошадей конкретно `inlove` не проверен вживую на реальных данных этого tenant. Механизм D3 (backend не фильтрует `this_stable`, sitewide guard обязателен) подтверждён supplementary-запросом на другом tenant (`aleksandrova-dacha`, SM-09/SM-10), где сценарий воспроизведён 1:1. Это ограничение окружения (нет seed-данных), не дефект diff'а.

## Rework checklist

### Backend

нет — `BE-FIX-1` выполнен и подтверждён повторными lanes, дальнейший rework не требуется.

### Frontend

нет — все findings (см. «Замечания и риски») non-blocking, дальнейший rework не требуется для `APPROVED`.

### Quality Gate

Уже выполнено в рамках этого change (повторять не нужно):

- `QG-FE` — `npm test`/`npm run lint`/`npm run build`, browser QA (desktop live, mobile code-verified) — **PASS**.
- `QG-CONTRACTS` — ownership, access policy, specs↔реализация, `scheme.md` согласованность; изначальный finding (`PriceService.get_by_slug_or_id` 400 вместо 404) устранён `BE-FIX-1`, повторный точечный прогон (8.4) — **PASS**.
- `QG-LIVE` — SMOKE до и после `BE-FIX-1` (см. таблицу выше) — **PASS**.
- `BE-FIX-1` — remediation backend + regression-тест, backend unit-тесты зелёные (30 + 72 passed) — **выполнено**.

Единственный оставшийся шаг по этому change — раздел 7 tasks.md (sync delta specs в `openspec/specs/`, повторная `openspec validate --strict`, архивирование) — отдельный execution unit после `QG-SYNTH`, не часть этого отчёта.
