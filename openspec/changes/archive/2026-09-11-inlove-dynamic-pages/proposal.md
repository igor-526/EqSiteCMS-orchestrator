## Why

Задача `docs/tasks/072_inlove_dynamic_pages.md` требует заменить четыре сохраняющиеся заглушки INLOVE (`/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy`, `/loshadi`) полноценным серверным контентом и добавить для каждой страницы генерацию detail route отдельной сущности по slug. Backend уже умеет отдавать `GET /api/prices/{slug_or_id}` и `GET /api/horses/{slug_or_id}` (tenant-scoped, публично), поэтому новый функционал реализуется полностью в `services/site-ksk-inlove` без runtime-изменений backend.

`scheme.md` фиксирован как утверждённая карта сайта, но для «Наши лошади» прямо запрещает отдельный detail route («Отдельные публичные detail routes не создаются»), а для трёх страниц услуг detail routes по тарифам вообще не описаны. Пользователь явно подтвердил: задача 072 приоритетнее прежнего пункта — scheme.md обновляется в рамках этого change, слуг-роуты добавляются на всех четырёх страницах.

## What Changes

- Реализовать `/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy` по существующему описанию scheme.md (вводный экран/hero, карточки тарифов из `GET /api/prices` с уже описанными group/name/slug фильтрами, преимущества, notice, CTA), убрать `UnderConstructionPage`.
- Реализовать `/loshadi` по существующему описанию scheme.md (`GET /api/horses?this_stable=true&sort=name`, сетка карточек, раскрываемые подробности), убрать `UnderConstructionPage`.
- Добавить новые detail routes, генерируемые по slug сущности, используя уже существующие backend endpoints:
  - `/uslugi/zanyatiya/[slug]`, `/uslugi/progulki/[slug]`, `/uslugi/postoy/[slug]` — `GET /api/prices/{slug_or_id}`; доступен только slug тарифа, принадлежащего соответствующей группе/набору slug этой страницы (см. текущие фильтры каждой services-страницы в scheme.md); прочие валидные-в-БД slug тарифов на этих route дают 404.
  - `/loshadi/[slug]` — `GET /api/horses/{slug_or_id}`; доступна только лошадь с `this_stable=true` (совпадает с публичным списком); лошадь без `this_stable=true` (приватный постой) на `/loshadi/[slug]` MUST давать 404, несмотря на то что backend endpoint технически отдаёт запись любого tenant-совпадающего slug — приватность посто́йных лошадей не должна регрессировать через прямой URL.
- Обновить `scheme.md`: добавить подраздел «Детали сущности» в четыре секции (Услуги/Занятия и абонементы, Услуги/Прогулки, Услуги/Постой, Наши лошади) с новым маршрутом, источником данных, SEO/canonical и fallback/404 поведением; заменить фразу «Отдельные публичные detail routes не создаются» для лошадей; дополнить общую матрицу доступа строками `GET /api/prices/{slug_or_id}` и `GET /api/horses/{slug_or_id}`.
- Обновить `inlove-placeholder-pages`: четыре маршрута перестают быть заглушками, карта сайта расширяется восемью новыми detail route family (сохраняя единственный 404 fallback вне утверждённых путей).

## Capabilities

### New Capabilities

- `inlove-services-pages`: SSR-композиция трёх страниц услуг (`/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy`) и их detail routes по slug тарифа, включая scoping тарифов к странице, fallback цен, SEO/canonical, responsive-таблицы и 404 для чужих/несуществующих slug.
- `inlove-horses-pages`: SSR-композиция «Наши лошади» (`/loshadi`) и её detail route по slug лошади, включая ограничение видимости detail до `this_stable=true`, SEO/canonical, responsive-сетку и 404-поведение.

### Modified Capabilities

- `inlove-placeholder-pages`: карта маршрутов расширяется — четыре ранее сохраняемые заглушки становятся полноценным контентом (`inlove-services-pages`, `inlove-horses-pages`); список утверждённых detail route family пополняется восемью новыми путями наряду с `/novosti/[slug]`.

## Impact

Site: 3 существующих page.tsx услуг + `loshadi/page.tsx` переписываются на реальный контент; 4 новых `[slug]/page.tsx`; новые features/loaders по аналогии с `contentPages/services/loaders.ts`; переиспользование существующих `api/price.ts` (`priceDetail`), `api/horse.ts` (`horseDetail`), `ui/*` компонентов; `placeholderPages` feature теряет 4 использования, но остаётся для будущих заглушек. Backend не меняется: оба endpoint уже публичные, tenant-scoped, по slug или UUID. Документы: `scheme.md` (4 секции + матрица доступа), `inlove-placeholder-pages` spec (delta MODIFIED), два новых main capability. NATS, CMS UI, seed и остальные сервисы не затрагиваются.

Открытый вопрос для Quality Gate: подтвердить фактическое поведение backend для чужого tenant/несуществующего slug на обоих endpoint (ожидается `404`, тест на `QG-LIVE`/`QG-CONTRACTS`), т.к. код прочитан частично (tenant-scoped repository query), но полный путь ошибок не воспроизведён живым запросом.
