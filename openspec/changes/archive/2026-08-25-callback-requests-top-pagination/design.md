## Context

Текущая `CallbackRequestsPage` рендерит `Tabs`, затем содержимое таба и отдельный Ant Design `Pagination` после `CallbackRequestsTable`. Это создаёт нижнюю пагинацию, хотя соседние CMS-разделы используют верхнюю управляющую строку.

Фактические референсы:

- «Новости»: `src/app/(protected)/news/page.tsx` создаёт `filtersElements` как два sibling-элемента — `NewsTabs` и правый `div.flex.items-center.gap-2` с `Pagination` и actions; `NewsTable` передаёт их в `MainTable`, чей header использует `flex ... justify-between flex-wrap`.
- «Лошади»: `src/features/horses/ui/HorsesHeader.tsx` выдаёт `HorsesTabs` и правый `div.flex.items-center.gap-2.flex-wrap`, содержащий общий `TablePaginator`; родительский `MainTable` также выравнивает их через `justify-between flex-wrap`.
- Callback feature уже имеет правильный hook-контракт: `query.limit`, `query.offset`, `setQuery(patch, resetOffset)`; таблица отключает встроенную AntD pagination через `pagination={false}`.

Изменение ограничено `services/frontend`. Доступ остаётся Protected Admin UI: route/session guard и роли `ADMIN`/`SUPERUSER` не меняются; endpoint и access matrix не меняются.

## Goals / Non-Goals

**Goals:**

- Создать одну верхнюю строку: tabs слева, paginator справа, только для таба «Заявки».
- Удалить нижний paginator и не включать встроенную table pagination.
- Сохранить точное преобразование UI page/page-size в `{ limit, offset }`.
- На узких viewport разрешить безопасный перенос элементов без overlap и потери доступности.
- Закрепить положение и семантику component/regression tests и Manual QA.

**Non-Goals:**

- Не менять backend API, DTO, auth/scopes, данные, фильтры, сортировку или mutations.
- Не рефакторить «Новости», «Лошадей», `MainTable` либо общий layout всех страниц.
- Не менять `services/site-*` и не импортировать consumer code.
- Не редактировать архив `openspec/changes/archive/2026-08-25-callback-requests-management-055`.

## Decisions

### 1. Header-композиция живёт в callback feature page

`CallbackRequestsPage.tsx` сформирует feature-aware header-контейнер с `display:flex`, `justify-content:space-between`, `align-items:center`, gap и wrap. `Tabs` остаются слева, paginator находится в правой группе. Это повторяет композиционный паттерн «Новостей»/«Лошадей», не заставляя callback page переходить на `MainTable` ради одной строки.

Альтернатива — мигрировать `CallbackRequestsTable` на `MainTable`. Она отклонена: расширяет scope, затрагивает table sizing/sort adapter и исторический prop `сolumns`, хотя пользователь просит только layout pagination.

### 2. Переиспользовать `TablePaginator`

Предпочтительный control — `src/ui/TablePaginator.tsx`: он уже является общим CMS primitive и используется «Лошадьми». Callback query совместим с `FiltersBaseType`; adapter/setter должен вызывать `state.setQuery(resolvedPatch, false)`, чтобы page change не был перезаписан автоматическим reset offset. Если типовой контракт потребует слишком широкого cast, допустимо оставить AntD `Pagination`, но визуальная позиция, `PAGE_SIZES` и mapping обязаны совпасть с common pattern; решение фиксируется implementation diff и тестами.

Размер страницы должен сбрасывать `offset` в `0` согласно callback contract, даже если generic primitive исторически сохраняет номер текущей страницы при `onShowSizeChange`. Поэтому feature adapter обязан различать изменение `limit` и обычный page change либо компонент должен использовать явный handler с этим поведением.

### 3. Один paginator только на data tab

Paginator рендерится справа от tabs лишь при `tab === "requests"`. Нижний control удаляется, `CallbackRequestsTable pagination={false}` сохраняется. На «Инструкции» остаются tabs и контент без paginator.

### 4. Responsive layout

На desktop tabs и paginator находятся в одной строке на противоположных сторонах. На tablet/mobile контейнер использует wrap и интервалы; paginator может перейти на следующую строку, но остаётся визуально правой/управляющей группой и доступен горизонтально без наложения на tabs. Не вводится глобальный CSS; используются локальные classes/style в feature-компоненте.

### 5. Test strategy

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| `CallbackRequestsPage` header | tabs слева, paginator справа, единая верхняя строка | component/regression: порядок DOM/landmarks, paginator перед table, отсутствие после table | authenticated ADMIN/SUPERUSER | `npm test` |
| callback pagination adapter | page/page-size → `{limit, offset}` | initial `25/0`, page change, size change → offset 0, filter/search/sort reset остаётся 0 | authenticated allowed role | `npm test`, `npx tsc --noEmit` |
| tabs | paginator только на «Заявки» | component: скрыт на «Инструкция», возвращается без дубликата | authenticated; существующий forbidden guard без регрессии | `npm test` |
| callback API boundary | сетевой контракт не меняется | существующие MSW success/empty/422/500/401/403 без live calls; regression query assertion | anonymous blocked, authenticated, 401/403 | `npm test` |
| scope/mutations | behavior не меняется | существующие scope present/missing, hidden/disabled, double-submit, 401/403 остаются зелёными | ADMIN/SUPERUSER/forbidden | `npm test` |
| architecture | frontend-only, no consumer mixing | `rg`/directory checks | Protected Admin UI only | `rg`, `find` |

### Manual QA steps (UI тестирование)

Предусловия: локальный CMS и API запущены; есть ADMIN или SUPERUSER; список содержит больше одного page size записей либо тестовый total позволяет увидеть несколько страниц.

1. Открыть `/callback-requests` как anonymous: ожидать redirect/block на login; callback content и paginator не видны.
2. Войти как ADMIN/SUPERUSER и открыть `/callback-requests`: ожидать табы слева и единственный paginator справа от них в верхней управляющей строке; под таблицей paginator отсутствует.
3. Проверить DOM/визуально: paginator расположен до таблицы; встроенной table pagination нет.
4. Перейти на страницу 2: network query содержит прежний `limit` и `offset=(2-1)*limit`; строки обновляются, filters/sort сохраняются.
5. Сменить page size: network query содержит новый `limit` и `offset=0`, UI показывает первую страницу.
6. На ненулевой странице применить/очистить фильтр каждой колонки и sort: каждый раз ожидать `offset=0`; остальные параметры нормализованы по существующему контракту.
7. Открыть таб «Инструкция»: paginator исчезает; вернуться в «Заявки»: появляется ровно один paginator с сохранённым применимым state.
8. Повторить визуальную проверку на desktop (1440×900), tablet (768×1024), mobile (390×844): элементы не overlap, tabs остаются кликабельными, paginator доступен; wrap на следующую строку допустим на tablet/mobile.
9. Проверить пользователя без callback scope: прежний forbidden state сохраняется, paginator не раскрывает данные. Проверить разрешённого пользователя со scope mutations и без него: status/spam UX, mutation guard и `401/403` handling не изменились.
10. Через request interception проверить list `401`, `403`, `422`, `500`: сообщение об ошибке различимо, header не ломается, filter/page state сохраняется применимо; unit/component/API-boundary tests не вызывают live backend.
11. В QA report записать passed/failed по шагам; для failed responsive/error/permission случаев приложить screenshot, для API failure — status и response body.

## Risks / Trade-offs

- [AntD pagination callbacks могут вызвать оба handler при смене size] → один feature adapter и тест точного `offset=0`, без двойного неоднозначного обновления.
- [Длинная pagination на mobile шире viewport] → wrapping container и browser QA на 390 px; не скрывать control и не допускать overlap.
- [Layout assertion окажется хрупким по CSS class names] → проверять семантический/DOM порядок и отсутствие дубликата, а визуальную геометрию — Manual QA.
- [Использование generic `TablePaginator` может расходиться с callback size-reset contract] → адаптер различает page и size; при невозможности сохранить контракт используется локальная AntD-композиция с общими `PAGE_SIZES`.

## Migration Plan

1. Frontend Agent изменяет только callback page/tests (и только при доказанной необходимости локальный generic paginator test), запускает frontend gates и отмечает свои tasks.
2. Один общий Quality Gate проверяет diff, автоматизированные тесты и Manual QA.
3. После approval Quality Gate Router синхронизирует delta spec в main specs, выполняет strict validation и архивирует change.
4. Rollback: вернуть прежнюю header-композицию и нижний paginator одним frontend revert; API/data migration не требуется.

## Open Questions

Нет. Поведение однозначно задано пользовательским референсом: tabs слева, единственная пагинация справа вверху; адаптивный перенос разрешён только без overlap.
