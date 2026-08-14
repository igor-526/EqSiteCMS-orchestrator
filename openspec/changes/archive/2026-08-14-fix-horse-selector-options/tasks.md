## 1. Анализ текущей реализации

- [x] 1.1 Проверить, что селекторы масти, породы и владельца в `HorseCreateUpdateModal` используют options из вкладок (coatColorOptions, breedOptions, ownerOptions)
- [x] 1.2 Проверить, что `HorseOutDto` содержит `coat_color`, `breed`, `horse_owner` с полями `id` и `name`
- [x] 1.3 Проверить, что `optionFilterProp="label"` используется в селекторах масти, породы и владельца (клиентский поиск)
- [x] 1.4 Проверить, есть ли в CMS другие селекторы с пагинацией и клиентским поиском

## 2. Реализация мержа options из DTO

- [x] 2.1 В `page.tsx` добавить `useMemo` для мержа `coatColorOptions` с `selectedHorse.coat_color`
- [x] 2.2 В `page.tsx` добавить `useMemo` для мержа `breedOptions` с `selectedHorse.breed`
- [x] 2.3 В `page.tsx` добавить `useMemo` для мержа `ownerOptions` с `selectedHorse.horse_owner`
- [x] 2.4 Передать замерженные options в `HorseCreateUpdateModal`

## 3. Реализация серверного поиска

- [x] 3.1 Добавить состояние для поиска (`coatColorSearch`, `breedSearch`, `ownerSearch`) в `page.tsx`
- [x] 3.2 Реализовать debounce (300ms) для поисковых запросов
- [x] 3.3 Добавить `onSearch` в селектор масти с вызовом API для фильтрации
- [x] 3.4 Добавить `onSearch` в селектор породы с вызовом API для фильтрации
- [x] 3.5 Добавить `onSearch` в селектор владельца с вызовом API для фильтрации
- [x] 3.6 Убрать `optionFilterProp="label"` из селекторов масти, породы и владельца
- [x] 3.7 Добавить `filterOption={false}` для отключения клиентской фильтрации

## 4. Проверка других селекторов CMS

- [x] 4.1 Найти все селекторы с пагинацией в CMS (поиск по `showSearch` и `optionFilterProp`) — найден селектор услуг в HorsesHeader.tsx
- [x] 4.2 Проверить, используют ли они серверный поиск или клиентский — селектор услуг использовал клиентский (`filterOption={true}`, `optionFilterProp="label"`)
- [x] 4.3 При необходимости добавить серверный поиск в найденные селекторы — добавлен серверный поиск для селектора услуг в HorsesHeader.tsx: `serviceFilterSearch` state + debounce + `setHorseServicesFilters({name})` + `filterOption={false}` + `onSearch`

## 5. Проверка и тестирование

- [x] 5.1 Проверить отображение масти из DTO при редактировании лошади — `coatColorModalOptions` мержит `selectedHorse.coat_color` с `horseCoatColors`, `exists` check предотвращает дубли
- [x] 5.2 Проверить отображение породы из DTO при редактировании лошади — `breedModalOptions` мержит `selectedHorse.breed` с `horseBreedSelectorOptions`, `exists` check предотвращает дубли
- [x] 5.3 Проверить отображение владельца из DTO при редактировании лошади — `ownerModalOptions` мержит `selectedHorse.horse_owner` с `horseOwners`, `exists` check предотвращает дубли
- [x] 5.4 Проверить, что при создании новой лошади селекторы работают корректно (без DTO) — `selectedHorse` = null, `useMemo` возвращает только `base` options
- [x] 5.5 Проверить серверный поиск: ввод текста → debounce (300ms) → `setHorseCoatColorsFilters({name})` / `loadHorseBreedSelectorOptions` / `setHorseOwnersFilters({name})` / `setHorseServicesFilters({name})` → API → options обновляются
- [x] 5.6 Проверить debounce: `useDebounce` с 300ms задержкой, быстрый ввод не генерирует лишних запросов
- [x] 5.7 Проверить, что нет дублирования options — `exists = base.some(opt => opt.value === ...)` перед unshift, если элемент уже в списке — не добавляется
- [x] 5.8 Проверить работу серверного поиска в других найденных селекторах — селектор услуг в HorsesHeader.tsx переведён на серверный поиск (`filterOption={false}` + `onSearch={onServiceFilterSearch}` + `debouncedServiceFilterSearch` → `setHorseServicesFilters({name})`)
