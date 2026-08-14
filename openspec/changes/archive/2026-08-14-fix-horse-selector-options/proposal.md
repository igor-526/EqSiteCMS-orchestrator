## Why

В модальном окне создания/редактирования лошади селекторы масти, породы и владельца используют options из состояния соответствующих вкладок (coatColorModalOptions, breedModalOptions, ownerModalOptions). Если выбранное значение не загружено на текущей странице вкладки (например, из-за пагинации), вместо имени отображается UUID. Это нарушает UX и затрудняет использование CMS.

## What Changes

- Селекторы масти, породы и владельца в `HorseCreateUpdateModal` должны использовать данные из DTO лошади (`selectedHorse.coat_color`, `selectedHorse.breed`, `selectedHorse.horse_owner`) для гарантированного отображения выбранного значения
- Если выбранное значение отсутствует в списке options из вкладки, оно должно быть добавлено из DTO лошади
- Селекторы должны использовать только серверный поиск (showSearch с серверной фильтрацией), а не клиентский поиск по пагинированным спискам

## Capabilities

### New Capabilities

- `horse-selector-dto-options`: Селекторы в модальном окне лошади должны гарантированно отображать выбранное значение из DTO, независимо от состояния вкладок

### Modified Capabilities

- `cms-horse-ui-quality`: Дополнение требования к корректному отображению связанных сущностей в селекторах

## Impact

- `services/frontend/src/features/horses/ui/Horses/HorseCreateUpdateModal.tsx` — модификация логики формирования options
- `services/frontend/src/app/(protected)/horses/page.tsx` — передача DTO лошади в modal
- Селекторы масти, породы и владельца — обеспечение использования серверного поиска
