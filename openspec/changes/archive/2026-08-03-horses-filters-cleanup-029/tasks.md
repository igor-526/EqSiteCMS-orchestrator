## 1. Удаление дублирующих фильтров из блока пагинации

- [x] 1.1 Удалить Select «Породы» (`breed_ids`) из `HorsesHeader.tsx` (строки 256-276)
- [x] 1.2 Удалить Select «Масти» (`coat_color_ids`) из `HorsesHeader.tsx` (строки 278-301)
- [x] 1.3 Удалить Select «Пол» (`sex`) из `HorsesHeader.tsx` (строки 345-359)

## 2. Перенос фильтров в шапку колонок таблицы

- [x] 2.1 Добавить `filterDropdown` с `ListFilter` в колонку «База» (`this_stable`) в `HorsesTable.tsx` (строка 202) с опциями `THIS_STABLE_OPTIONS`
- [x] 2.2 Добавить `filterDropdown` с multi-`ListFilter` в колонку «Владелец» (`horse_owner`) в `HorsesTable.tsx` (строка 377) с опциями `ownerFilterOptions`
- [x] 2.3 Удалить Select «База» из `HorsesHeader.tsx` (строки 236-254)
- [x] 2.4 Удалить Select «Владельцы» из `HorsesHeader.tsx` (строки 303-326)

## 3. Перенос фильтра «Услуги» в блок пагинации

- [x] 3.1 Удалить колонку «Услуги» из таблицы в `HorsesTable.tsx` (строки 182-201)
- [x] 3.2 Добавить Select для фильтрации по услугам (`services`) в блок с пагинацией в `HorsesHeader.tsx` с опциями из `availableServices`

## 4. Обновление документации

- [x] 4.1 Добавить правило размещения фильтров в `agents/frontend.md` (секция 6 «Фильтры»): фильтры в шапке колонок, если колонка есть; если нет — Select в блоке пагинации; дублирование запрещено

## 5. Тестирование

- [x] 5.1 Обновить/добавить unit тесты для фильтров таблицы лошадей: проверить что дублирующие Select удалены, filterDropdown добавлены в колонки «База» и «Владелец», Select «Услуги» добавлен в блок пагинации
- [x] 5.2 Проверить сброс `offset` при изменении любого фильтра
- [x] 5.3 Проверить loading/empty/error состояния при фильтрации
- [x] 5.4 Запустить `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` из `services/frontend`

## 6. Quality Gate

- [x] 6.1 Провести единый Quality Gate: проверить diff, архитектуру, тесты, access/scopes
- [x] 6.2 Sync delta specs в main specs
- [x] 6.3 Архивировать change
