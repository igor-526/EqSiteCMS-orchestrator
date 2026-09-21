# Proposal — fix-077-inlove-services-availability

Тикет: `docs/tasks/077_services_bug.md` · Дата: 2026-09-21 · Сервисы: `services/site-ksk-inlove`; backend — read-only contract reference.

## Why

На production сайта «ИНЛав» все три страницы услуг (`/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy`) показывают «Услуга ... временно недоступна», хотя backend-эндпоинт `GET /api/prices` реально отвечает `200` с валидными тарифами — это подтверждено production-логами backend и ручным запросом через Postman из отчёта бага. Локально те же страницы работают корректно.

Диагностика кода `services/site-ksk-inlove` (read-only, чтение из отдельного репозитория сервиса) показала точную причину: `LessonsContent.tsx`, `RidesContent.tsx` и `BoardingContent.tsx` рендерят карточки тарифов только когда `data.group.status === "success"`, а `data.group` — это **отдельный** дескриптор из каталога `horse_services` (точное совпадение имени «Занятия»/«Прогулки»/«Постой», см. `serviceGroups.ts`), не связанный с ценами. Цены и карточки тарифов приходят из **другого** источника — `price_groups`/`GET /api/prices` (см. `pricesLoaders.ts`, `lessonsLoaders.ts`, `ridesLoaders.ts`, `boardingLoaders.ts`), который в проде отвечает корректно. Как только `data.group` пуст (в проде каталог `horse_services`, судя по всему, не содержит записи с точным именем «Занятия»/«Прогулки»/«Постой», либо содержит дубликаты — `loadServiceGroup` трактует оба случая как `empty`), три компонента принудительно подменяют уже успешно загруженные `data.prices` на `{ status: "empty" }` и показывают жёсткое сообщение о недоступности — реальные, корректно загруженные тарифы отбрасываются и никогда не долетают до пользователя.

Компоненты `<LessonsPrices>`/`<RidesPrices>`/`<BoardingPrices>` уже умеют корректно отображать `success`/`empty`/`error` состояние цен (карточки, `EmptyState` с CTA, `ErrorBlock` с retry) — баг только в том, что вызывающий код передаёт им не настоящее состояние `data.prices`, а искусственно подменённое.

## What Changes

- В `LessonsContent.tsx`, `RidesContent.tsx`, `BoardingContent.tsx` передавать в `<XPrices>` состояние `data.prices` напрямую, без подмены на `{ status: "empty" }` при `data.group.status !== "success"`. Видимость и состояние карточек тарифов отныне полностью определяются собственным Public Read ответом ценовой группы страницы, а не отдельным дескриптором описания.
- Убрать дублирующее/вводящее в заблуждение сообщение `<p role="status">Услуга «X» временно недоступна.</p>`, завязанное на `data.group.status === "empty"`: оно скрывало реально доступные тарифы. Мягкая деградация описания (`data.group.status === "error"` → «Не удалось загрузить описание услуги.») сохраняется без изменений — это не блокирует и не подменяет цены.
- Добавить regression-тесты на ранее непокрытую комбинацию состояний (`group: empty/error`, `prices: success`) для всех трёх страниц: тарифы отображаются, ложное сообщение о недоступности не появляется.
- Уточнить delta spec `inlove-services-pages`: явно зафиксировать, что видимость карточек тарифов определяется исключительно собственным price-group ответом страницы и не зависит от отдельной группы-описания.

## Capabilities

### Modified Capabilities

- `inlove-services-pages`: уточнение требования — карточки тарифов не должны скрываться из-за состояния отдельной группы-описания (`horse_services`); затронуто только clarifying-требование и один новый сценарий, существующие SSR/detail-route/adaptive/notice/group-filtering сценарии не меняются.

### New Capabilities

Нет.

## Impact

- Runtime: `services/site-ksk-inlove/src/features/contentPages/lessons/LessonsContent.tsx`, `.../rides/RidesContent.tsx`, `.../boarding/BoardingContent.tsx` и их `*.test.tsx`.
- API/backend: изменений нет. Используются существующие Public Read `GET /api/prices` и `GET /api/horse_services` без изменения access class, ролей или контракта.
- Данные: причина пустого `data.group` в проде — вероятно, отсутствие (или дублирование) записей `horse_services` с точным именем «Занятия»/«Прогулки»/«Постой». Это контентный/CMS-вопрос, а не код, и остаётся вне scope этого change (затрагивает только клиентский сайт, как указано в задаче); фиксируется как открытый вопрос для владельца контента.
- Процесс: изменение самодостаточно, не зависит от других активных INLOVE changes и не меняет design source docs.
