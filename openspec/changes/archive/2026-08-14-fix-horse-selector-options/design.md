## Context

В CMS Frontend модальное окно `HorseCreateUpdateModal` получает options для селекторов масти, породы и владельца из состояния вкладок. Данные загружаются с пагинацией (limit: 25-100). Если выбранная лошадь имеет связанную сущность (масть, породу, владельца), которая не загружена на текущей странице вкладки, селектор отображает UUID вместо имени.

Текущая архитектура:
- `useHorseCoatColors` загружает список мастей с пагинацией
- `useHorseBreeds` загружает список пород с пагинацией + отдельный `loadHorseBreedSelectorOptions` (limit: 100)
- `useHorseOwners` загружает список владельцев с пагинацией
- `HorseOutDto` содержит полные DTO: `coat_color`, `breed`, `horse_owner`

## Goals / Non-Goals

**Goals:**
- Гарантировать отображение имени выбранной масти/породы/владельца в селекторе, даже если сущность не загружена на текущей странице вкладки
- Обеспечить использование серверного поиска в селекторах (без клиентского поиска по пагинированным спискам)
- Реализовать серверный поиск через `onSearch` с debounce для всех селекторов с пагинацией
- Сохранить работу селекторов при создании новой лошади (когда DTO не заполнен)

**Non-Goals:**
- Изменение API backend
- Изменение логики пагинации вкладок
- Добавление новых сущностей или полей

## Decisions

### 1. Формирование options из DTO + вкладка

**Решение:** При открытии модального окна в режиме редактирования, если `selectedHorse` содержит `coat_color`/`breed`/`horse_owner`, добавить эту сущность в список options, если она отсутствует.

**Реализация:**
```typescript
// В HorseCreateUpdateModal или page.tsx
const mergedCoatColorOptions = useMemo(() => {
    const base = coatColorOptions;
    if (selectedHorse?.coat_color) {
        const exists = base.some(opt => opt.value === selectedHorse.coat_color.id);
        if (!exists) {
            return [{ label: selectedHorse.coat_color.name, value: selectedHorse.coat_color.id }, ...base];
        }
    }
    return base;
}, [coatColorOptions, selectedHorse]);
```

**Альтернативы:**
- Загружать отдельно сущность по ID → избыточный запрос, т.к. данные уже есть в DTO
- Передавать options из DTO напрямую → потеря возможности выбора других значений из вкладки

### 2. Серверный поиск в селекторах

**Решение:** Реализовать серверный поиск через `onSearch` с debounce (300ms) для селекторов масти, породы и владельца. Убрать `optionFilterProp="label"`.

**Реализация:**
```typescript
// В page.tsx или в хуках
const [coatColorSearch, setCoatColorSearch] = useState<string>('');
const [breedSearch, setBreedSearch] = useState<string>('');
const [ownerSearch, setOwnerSearch] = useState<string>('');

// Debounce для поиска
const debouncedCoatColorSearch = useDebounce(coatColorSearch, 300);
const debouncedBreedSearch = useDebounce(breedSearch, 300);
const debouncedOwnerSearch = useDebounce(ownerSearch, 300);

// Эффекты для загрузки options при изменении поиска
useEffect(() => {
    loadCoatColorOptions(debouncedCoatColorSearch);
}, [debouncedCoatColorSearch]);

// В селекторах
<Select
    showSearch
    onSearch={setCoatColorSearch}
    filterOption={false} // Отключаем клиентскую фильтрацию
    options={mergedCoatColorOptions}
/>
```

**Причина:** Клиентский поиск по пагинированному списку не покрывает все значения. Пользователь может искать значение, которое есть в базе, но не загружено на текущей странице.

**Альтернативы:**
- Оставить клиентский поиск → не покрывает все значения из-за пагинации
- Использовать `filterOption` с кастомной логикой → всё равно ограничен текущей страницей

### 3. Место реализации логики

**Решение:** Логика мержа options реализуется в `page.tsx` (где формируются options) и передается в modal. Modal остается глупым компонентом. Поиск реализуется в хуках или в `page.tsx`.

**Альтернативы:**
- Реализация в самом modal → нарушение разделения ответственности, modal не должен знать об источнике данных
- Реализация в хуках → хуки отвечают за загрузку данных вкладок, не за формирование options для других компонентов

## Risks / Trade-offs

- **Дублирование данных**: Если сущность есть и в DTO, и в списке вкладки, она может появиться дважды → **Mitigation**: Проверка `exists` перед добавлением
- **Устаревшие данные**: DTO может содержать устаревшие данные (например, переименованную масть) → **Mitigation**: При обновлении лошади данные обновляются, это acceptable для CMS
- **Производительность**: useMemo для мержа options вызывается при каждом рендере → **Mitigation**: Зависимости точно определены, вычисления минимальны
- **Частые запросы при вводе**: Debounce 300ms минимизирует количество запросов → **Mitigation**: Можно увеличить debounce до 500ms при необходимости

## Migration Plan

1. Изменить `page.tsx` — добавить логику мержа options из DTO
2. Изменить `HorseCreateUpdateModal` — использовать замерженные options
3. Убрать `optionFilterProp="label"` из селекторов масти, породы, владельца
4. Добавить `onSearch` с debounce для серверной фильтрации
5. Проверить работу: создание новой лошади, редактирование существующей, выбор значения из списка, серверный поиск
6. Проверить серверный поиск в других селекторах CMS (если есть)
