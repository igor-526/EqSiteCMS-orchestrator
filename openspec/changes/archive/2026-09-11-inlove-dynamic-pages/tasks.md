## 1. Shared services-инфраструктура + Услуги / Занятия и абонементы (SC-1)

- [x] 1.1 Добавить loader для тарифов в `features/contentPages/services/` (cache()-обёрнутый, Zod-схема `PriceOutWithTablesDto`: name/slug/description/photos/price_tables/groups, `no-store`, `DataState` с вариантом `not-found` для detail) по образцу `loaders.ts`
- [x] 1.2 Вынести общий allow-list slug тарифов на страницу-группу (zanyatiya: 8 slug из `scheme.md`; используется и списком, и detail-guard, один источник, не дублировать литералы)
- [x] 1.3 Реализовать `features/contentPages/lessons/LessonsContent.tsx` (+ module.css): вводный экран, переключатель «Разовые/Абонементы», карточки тарифов, преимущества (`home.program_benefits`), `services.notice`, CTA
- [x] 1.4 Переписать `app/uslugi/zanyatiya/page.tsx` на `LessonsContent`, убрать `UnderConstructionPage`, `generateMetadata` по `seo.lessons.title/description` с fallback
- [x] 1.5 Реализовать `features/contentPages/lessons/LessonsDetail.tsx` (+ module.css): name/description/photos/price_tables тарифа, responsive-таблица
- [x] 1.6 Добавить `app/uslugi/zanyatiya/[slug]/page.tsx`: `priceDetail` + allow-list guard из 1.2, `notFound()` при отсутствии в allow-list или 404 backend, `generateMetadata` из данных тарифа
- [x] 1.7 Тесты: список (fallback пустых цен «Стоимость уточняется», error+retry, переключатель), деталь (валидный slug рендерится, slug вне allow-list → notFound, мобильная раскладка таблицы)
- Verification: `npm test` (site-ksk-inlove) — новые и относящиеся тесты зелёные

## 2. Услуги / Прогулки (SC-2)

- [x] 2.1 Allow-list slug для progulki (`horse-rides-official`, `horse-ride-yandex`) по паттерну 1.2
- [x] 2.2 `features/contentPages/rides/RidesContent.tsx` (+ module.css): hero, «Как проходит прогулка», варианты и цены (раздельно для двух конфликтующих slug), `about.setting`, подготовка/безопасность, notice, CTA
- [x] 2.3 `app/uslugi/progulki/page.tsx` на `RidesContent`, `generateMetadata` по `seo.rides.*`
- [x] 2.4 `features/contentPages/rides/RidesDetail.tsx` + `app/uslugi/progulki/[slug]/page.tsx` с allow-list guard и `notFound()`
- [x] 2.5 Тесты: список (две конфликтующие позиции раздельно, fallback цены), деталь (valid/invalid slug)
- Verification: `npm test` — новые и относящиеся тесты зелёные

## 3. Услуги / Постой (SC-3)

- [x] 3.1 Allow-list slug для postoy (`horse-boarding-yandex`) по паттерну 1.2
- [x] 3.2 `features/contentPages/boarding/BoardingContent.tsx` (+ module.css): hero, инфраструктура, «Что входит» (скрывается при пустом), стоимость, требования и знакомство с клубом (`about.features`), notice, CTA
- [x] 3.3 `app/uslugi/postoy/page.tsx` на `BoardingContent`, `generateMetadata` по `seo.boarding.*`
- [x] 3.4 `features/contentPages/boarding/BoardingDetail.tsx` + `app/uslugi/postoy/[slug]/page.tsx` с allow-list guard и `notFound()`
- [x] 3.5 Тесты: список («уточняется», не бесплатно; included скрывается при пустом), деталь (valid/invalid slug)
- Verification: `npm test` — новые и относящиеся тесты зелёные

## 4. Наши лошади (SC-4)

- [x] 4.1 Добавить loader в `features/contentPages/horses/loaders.ts` (cache(), Zod-схема `HorseOutDto` включая `slug`/`this_stable`, `no-store`, `DataState` с `not-found` для detail)
- [x] 4.2 `features/contentPages/horses/HorsesContent.tsx` (+ module.css): введение, сетка карточек (3–4/2/1 по breakpoint), раскрываемые подробности внутри страницы, CTA
- [x] 4.3 `app/loshadi/page.tsx` на `HorsesContent`, убрать `UnderConstructionPage`, `generateMetadata` по `seo.horses.*`, fallback `horses.empty_text`
- [x] 4.4 `features/contentPages/horses/HorseDetail.tsx` (полные характеристики, photos, services) + `app/loshadi/[slug]/page.tsx`: `horseDetail`, проверка `this_stable === true` → иначе `notFound()`, `notFound()` при 404 backend
- [x] 4.5 Тесты: список (empty_text fallback), деталь (`this_stable: true` рендерится, `this_stable: false`/`null` → notFound, несуществующий/чужой slug → notFound)
- Verification: `npm test` — новые и относящиеся тесты зелёные

## 5. Карта маршрутов и документация (SC-5)

- [x] 5.1 Обновить `placeholderPages/routeTree.test.ts` и связанные regression-тесты карты сайта под новую карту: 5 detail route family (`/novosti/[slug]` уже был + 4 новых) и 404 вне утверждённых путей
- [x] 5.2 Убрать использование `UnderConstructionPage`/`PLACEHOLDER_ROUTES` для четырёх заменённых маршрутов из `metadata.ts` (не удаляя саму feature — она остаётся для будущих заглушек)
- [x] 5.3 Обновить `docs/sites/inlove/scheme.md`: добавить подраздел «Детали сущности» в секции «Услуги / Занятия и абонементы», «Услуги / Прогулки», «Услуги / Постой», «Наши лошади» (маршрут, источник данных, SEO/canonical, fallback/404); заменить фразу «Отдельные публичные detail routes не создаются» для лошадей; добавить в «Матрицу доступа используемых API» строки `GET /api/prices/{slug_or_id}` и `GET /api/horses/{slug_or_id}`
- Verification: `npm test` (обновлённые route-тесты зелёные), ручная сверка текста `scheme.md` с реализацией

## 6. Quality Gate

- [x] 6.1 `QG-FE`: `npm test`, `npm run lint`, `npm run build` в `services/site-ksk-inlove`; browser QA (`claude-in-chrome`) минимум по одному списку и одной detail-странице каждой из 4 групп на desktop и mobile viewport — **PASS** (non-blocking findings: дублирование `*Detail`/`*Cta` компонентов, отсутствующий `pricesLoaders.test.ts`/`boardingLoaders.test.ts`, mobile-скриншот не удался технически — code-verified вместо визуального)
- [x] 6.2 `QG-CONTRACTS`: сверить access matrix specs/`scheme.md`/реализация, ownership (только `services/site-ksk-inlove` + `docs/`, backend не тронут), соответствие diff утверждённым specs/tasks — **ISSUES FOUND**: обнаружено расхождение `PriceService.get_by_slug_or_id` (400 вместо 404 по коду), эскалировано в `QG-LIVE`
- [x] 6.3 `QG-LIVE`: через прямые curl-запросы к backend подтверждены фактические статусы `GET /api/prices/{slug_or_id}` и `GET /api/horses/{slug_or_id}` — **ISSUES FOUND**: horses — 200/401/404 как ожидалось; prices — несуществующий и чужой-tenant slug дают `400` (`ClientError`) вместо ожидаемого specs/`scheme.md` `404`. Пользователь подтвердил исправление в рамках этого change → см. раздел 8 (`BE-FIX-1`)
- [x] 6.4 `QG-SYNTH`: единый отчёт в `docs/reports/`, вердикт `APPROVED`/`REWORK` — выполняется ПОСЛЕ раздела 8 (remediation) и повторной проверки `QG-CONTRACTS`/`QG-LIVE` на затронутый endpoint

## 8. Remediation: BE-FIX-1 (finding QG-LIVE) + повтор затронутых lanes

- [x] 8.1 `BE-FIX-1` (Backend): в `services/backend/src/core/services/prices.py`, метод `get_by_slug_or_id` — заменить `raise ClientError("Цена не найдена")` на `raise NotFoundError("Цена не найдена")` (по аналогии с `HorseService._get_horse_by_slug` в `services/backend/src/core/services/horse.py`), только для ветки «запись не найдена» (не менять остальные `ClientError` в этом файле без явной необходимости)
- [x] 8.2 `BE-FIX-1`: regression-тест на `404` для несуществующего/чужого-tenant slug/id в `services/backend/tests/unit/core/services/test_price_service.py` (или соответствующем API-тесте), запустить относящийся набор backend unit-тестов
- [x] 8.3 Повторный точечный `QG-LIVE`-прогон: `GET /api/prices/{несуществующий-slug}` и `GET /api/prices/{чужой-tenant-slug}` с selector `inlove` → подтвердить `404`
- [x] 8.4 Повторный точечный `QG-CONTRACTS`-прогон: подтвердить, что `PriceService.get_by_slug_or_id` теперь единообразен с `HorseService` и соответствует access matrix specs/`scheme.md`; ownership diff по-прежнему ограничен одним файлом backend + тест
- Verification: backend unit-тесты для `PriceService`/`test_price_service.py` зелёные; `QG-LIVE`/`QG-CONTRACTS` повторные прогоны — `PASS`

## 7. Sync и archive

- [x] 7.1 Синхронизировать delta specs (`inlove-services-pages`, `inlove-horses-pages`, `inlove-placeholder-pages`) в `openspec/specs/`
- [x] 7.2 Повторная `openspec validate --strict` — 71/71 specs passed, включая change `inlove-dynamic-pages`
- [x] 7.3 Архивировать change после `APPROVED` и успешной sync/validation
