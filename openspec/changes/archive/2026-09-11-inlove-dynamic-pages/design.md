## Context

`services/site-ksk-inlove` — Next.js SSR-сайт клуба ИНЛав. Пять из семи утверждённых маршрутов уже несут реальный SSR-контент (`/`, `/about`, `/novosti`, `/novosti/[slug]` — из change `inlove-static-pages`). Оставшиеся четыре (`/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy`, `/loshadi`) рендерят `UnderConstructionPage` из `features/placeholderPages`.

Backend уже реализует tenant-scoped публичные endpoint'ы `GET /api/prices/{slug_or_id}` (`services/backend/src/api/prices.py:210`) и `GET /api/horses/{slug_or_id}` (`services/backend/src/api/horses.py:132`), оба принимают slug или UUID и используют `get_read_equestrian_context` (тот же публичный tenant-scoped паттерн, что и остальные Public Read GET). Фронтенд-обёртки `priceDetail`/`horseDetail` в `src/api/price.ts` и `src/api/horse.ts` уже существуют (использовались CMS UI). Это значит весь объём задачи 072 реализуется внутри `services/site-ksk-inlove` без каких-либо изменений в `services/backend` — единственный владелец этого change — **Site Consumer**.

Прецедент из архивного change `2026-09-10-inlove-static-pages`: паттерн `features/contentPages/<page>/*` + `features/contentPages/services/loaders.ts` (React `cache()`-обёрнутые загрузчики, `DataState<T>` union `success|empty|error|not-found`, Zod-валидация ответа, `no-store` fetch) и паттерн detail route `novosti/[slug]/page.tsx` с `notFound()` на 404/невалидный slug. Этот change переиспользует оба паттерна для тарифов и лошадей вместо изобретения нового.

`scheme.md` для «Наши лошади» прямо утверждает «Отдельные публичные detail routes не создаются» — это единственное место, прямо противоречащее задаче 072. Пользователь подтвердил приоритет задачи 072: scheme.md обновляется в рамках этого change (см. proposal, раздел «What Changes»).

## Goals / Non-Goals

**Goals:**
- Заменить 4 заглушки полноценным SSR-контентом по существующему описанию scheme.md.
- Добавить 4 новых detail route family (`/uslugi/zanyatiya/[slug]`, `/uslugi/progulki/[slug]`, `/uslugi/postoy/[slug]`, `/loshadi/[slug]`), используя уже существующие backend endpoints.
- Обновить `scheme.md` и `inlove-placeholder-pages`, чтобы карта сайта отражала фактическое поведение.
- Сохранить существующие SSR/SEO/responsive/access инварианты проекта (server-rendered контент, canonical, 404 vs error state, tenant selector).

**Non-Goals:**
- Изменения backend endpoints/схемы/DTO/миграций (endpoints уже публичны и tenant-scoped). **Уточнение после QG-LIVE:** единственное допущенное исключение — `BE-FIX-1`, точечное исправление статус-кода ошибки в уже существующем `PriceService.get_by_slug_or_id` (см. «Risks/Trade-offs» и tasks.md раздел 8), не новый endpoint и не изменение контракта/DTO.
- CMS UI изменения.
- Редизайн уже реализованных пяти маршрутов (`/`, `/about`, `/novosti`, `/novosti/[slug]`, header/footer/callback modal) — переиспользуются как есть.
- Оплата, обработка персональных данных — по-прежнему вне scheme.md.

## Decisions

### D1. Один owner (Site Consumer), backend не меняется
`GET /api/prices/{slug_or_id}` и `GET /api/horses/{slug_or_id}` уже существуют, публичны, tenant-scoped, принимают slug. Дополнительного backend execution unit не создаётся. Alternative (создать отдельный `by-slug` endpoint по аналогии с news) отклонена — избыточна, т.к. `{slug_or_id}` уже разрешает оба случая и используется CMS UI.

### D2. Детали услуг: серверный allow-list slug на странице, а не «любой существующий price slug»
Каждая из трёх services-страниц уже имеет собственный закрытый список ожидаемых slug тарифов (scheme.md, «Интеграция с CMS»: zanyatiya — 8 slug из группы «Основные услуги»; progulki — `horse-rides-official`/`horse-ride-yandex`; postoy — `horse-boarding-yandex`). Detail route `/uslugi/<segment>/[slug]` MUST принимать только slug, присутствующий в списке тарифов, загруженном для родительской страницы (тот же fetch/allow-list, не отдельный «любой price этого tenant»). Slug тарифа другой группы (например, тариф прогулок на `/uslugi/zanyatiya/[slug]`) → `notFound()`, даже если backend вернул бы 200.
Alternative («любой валидный slug_or_id этого tenant рендерится на любой из трёх services-страниц») отклонена: это ломает связку «страница = группа услуги», разрешает случайные кросс-ссылки (тариф прогулок открывается под `/uslugi/zanyatiya/...`) и создаёт дублирующийся canonical URL для одной сущности.

### D3. Детали лошади: видимость ограничена `this_stable=true`
Публичный список `/loshadi` использует `this_stable=true`; сам backend `GET /api/horses/{slug_or_id}` этот фильтр не применяет (только tenant scope) — см. `services/backend/src/repositories/horse_repository.py:228`. Без дополнительной проверки на сайте приватная посто́йная лошадь (`this_stable=false`) была бы доступна по прямому URL, даже не будучи в публичном списке. `/loshadi/[slug]` MUST после получения DTO проверить `this_stable === true` и вызвать `notFound()` иначе. Это site-side privacy guard поверх backend-ответа, а не backend-изменение (Non-Goal).
Alternative (доверять backend и рендерить любую найденную лошадь) отклонена как приватностный риск, не покрытый существующим API-контрактом.

### D4. Переиспользование `contentPages/services/loaders.ts`-паттерна, отдельные loader-модули по page-group
Добавляются `features/contentPages/services/{lessonsLoaders,ridesLoaders,boardingLoaders}.ts` (или единый `pricesLoaders.ts` с параметризацией group/name/slug-list — решает исполнитель по месту) и `features/contentPages/horses/loaders.ts`, все — `cache()`-обёрнутые, Zod-валидированные, `no-store`, возвращающие `DataState<T>`-совместимый тип с добавленным `not-found` вариантом для detail. Верстка — новые `features/contentPages/{lessons,rides,boarding,horses}/*Content.tsx` + `*Detail.tsx`, переиспользующие `ui/cards`, `ui/sections`, `ui/media`, `ui/controls` (переключатель «Разовые/Абонементы» — новый control в `ui/controls`, если аналога нет).

### D5. `scheme.md` обновляется в рамках Site Consumer unit, не отдельным DOC-owner
В отличие от `inlove-static-pages` (где были параллельные ownership-конфликты с активным 069), здесь единственный owner — Site Consumer, поэтому обновление 4 секций `scheme.md` + матрицы доступа выполняется тем же исполнителем последним unit'ом, отдельный DOC-unit не нужен.

## Risks / Trade-offs

- [Риск] Backend-поведение 404/чужой-tenant для `{slug_or_id}` endpoints не воспроизведено live-запросом на этапе планирования (только чтение кода репозитория). → Митигация: `SMOKE-1`/`QG-LIVE` явно проверяет оба endpoint (валидный slug, чужой tenant, несуществующий slug) перед тем, как Site Consumer полагается на статус-коды для `notFound()`/error state. **Материализовался:** `QG-LIVE` подтвердил живым запросом, что `GET /api/prices/{slug_or_id}` возвращает `400` (`ClientError`), а не `404`, для несуществующего/чужого-tenant slug — расходится с access matrix specs/`scheme.md`. `GET /api/horses/{slug_or_id}` ведёт себя корректно (`404`). Исправлено единственным допущенным backend execution unit `BE-FIX-1` (см. tasks.md раздел 8): `PriceService.get_by_slug_or_id` переведён на `NotFoundError` по аналогии с уже корректным `HorseService._get_horse_by_slug`.
- [Риск] `this_stable`-guard (D3) — новая, ранее не тестированная проверка; ошибка в её реализации либо скрывает публичных лошадей, либо раскрывает приватных. → Митигация: unit-тест на оба случая (`this_stable: true` рендерится, `this_stable: false`/`null` → 404) обязателен в FE-unit тестов detail route.
- [Риск] Allow-list slug на services detail routes (D2) дублирует список slug из «Интеграция с CMS» в двух местах (карточки списка + guard детали), рассинхронизация приведёт к 404 на валидной карточке. → Митигация: список slug вынести в один shared константный источник на page-group (не дублировать литералы в list- и detail-loader).
- [Trade-off] Detail-страницы тарифов не имеют собственного уникального контента сверх того, что уже на странице-списке (price_tables/description/photos) — SEO-ценность канонической detail-страницы ниже, чем у новости. Осознанно принято, т.к. это явное требование задачи 072, не предмет данного design-решения.

## Migration Plan

Чисто аддитивная frontend-фича: новые route-файлы и новые loader/feature-модули, правка 3 существующих `page.tsx` (замена `UnderConstructionPage` на реальный компонент), no DB migration, no backend deploy. Rollback — revert PR/commit сайта; backend не участвует, откат не влияет на данные.

## Open Questions

- Подтверждение фактических HTTP-статусов `GET /api/prices/{slug_or_id}` и `GET /api/horses/{slug_or_id}` для чужого tenant и несуществующего slug — закрывается `SMOKE-1` до того, как на него полагается error-handling detail routes (см. proposal, «Открытый вопрос»).
- Финальная формулировка новых подразделов `scheme.md` («Детали сущности») — пишется исполнителем по месту в последнем unit; design фиксирует только требуемое содержание (маршрут/источник/SEO/fallback), не точный текст.
