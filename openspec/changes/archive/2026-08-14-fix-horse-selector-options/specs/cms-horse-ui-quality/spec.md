## MODIFIED Requirements

### Requirement: Scope-aware UX для действий с лошадьми и родословной
CMS SHALL связывать действия создания, изменения, удаления лошади и изменения родословной с явным registry `FeatureAction -> scopes`. В колонке «Действия» кнопки фотографий, родословной и услуг SHALL использовать единый компактный серый count badge по стилю существующего service indicator; каждая кнопка SHALL вызывать только собственный handler. Drawer с таблицей связанных услуг SHALL открываться при нажатии на кнопку. Модальное окно добавления/редактирования связи SHALL открываться при нажатии на кнопку «Добавить» или строку таблицы. Create/edit modal SHALL гарантировать отображение имени выбранной масти, породы и владельца в селекторах, используя данные из DTO лошади (`selectedHorse.coat_color`, `selectedHorse.breed`, `selectedHorse.horse_owner`) для формирования options, даже если эти сущности не загружены на текущей странице соответствующих вкладок. Mutation UI MUST быть скрыт или disabled без требуемого scope, а pedigree и relation hooks MUST повторно проверять permission перед submit; UI-проверка MUST NOT считаться заменой backend-авторизации.

#### Scenario: Пользователь без scope видит read-only pedigree
- **WHEN** scopes пользователя не разрешают `UPDATE_HORSE_PEDIGREE`
- **THEN** pedigree mutation controls disabled, hook не отправляет mutation и показывает сообщение о недостатке прав

#### Scenario: Разрешённое изменение родословной
- **WHEN** пользователь имеет `SUPERUSER`, `ADMIN` или `DEVELOPER` scope и отправляет изменение родословной
- **THEN** hook выполняет Protected Write, после успеха обновляет открытую родословную и инвалидирует список лошадей

#### Scenario: Backend отклоняет mutation
- **WHEN** существующий backend возвращает `401` или `403` на horse, breed или pedigree mutation
- **THEN** CMS client/hook сохраняет отказ как ошибку сценария и не трактует скрытие кнопки как успешную авторизацию

#### Scenario: Кнопка управления услугами в таблице лошадей
- **WHEN** authenticated CMS-пользователь открывает вкладку «Лошади»
- **THEN** в колонке «Действия» отображается третья кнопка (иконка финансов) с badge количества привязанных услуг

#### Scenario: Единые indicators
- **WHEN** authenticated пользователь видит строку лошади
- **THEN** photo, pedigree и service actions показывают визуально одинаковые серые count badges без overlap

#### Scenario: Независимые actions
- **WHEN** пользователь нажимает любой из трёх action controls
- **THEN** выполняется только соответствующий handler и row click не срабатывает

#### Scenario: Drawer с таблицей связанных услуг
- **WHEN** пользователь нажимает на кнопку «Услуги» лошади
- **THEN** открывается Drawer справа на полэкрана с таблицей (колонки: «Наименование», «Цена») или NoData-заглушкой

#### Scenario: Модальное окно добавления связи
- **WHEN** пользователь нажимает «Добавить» в Drawer
- **THEN** открывается модальное окно с Select (доступные услуги), полями override (description, price, price_formatter) и кнопками «Добавить»/«Закрыть»

#### Scenario: Модальное окно редактирования связи
- **WHEN** пользователь нажимает на строку таблицы связанных услуг
- **THEN** открывается модальное окно с readonly Select (выбранная услуга), заполненными override-полями и кнопками «Изменить»/«Удалить»/«Закрыть»

#### Scenario: Управление услугами без horse write scope
- **WHEN** authenticated пользователь без horse write scope открывает Drawer
- **THEN** кнопка «Добавить» скрыта или disabled, строки таблицы не открывают модальное окно редактирования

#### Scenario: Управление услугами с horse write scope
- **WHEN** authenticated пользователь с horse write scope открывает Drawer
- **THEN** кнопка «Добавить» активна, клик по строке открывает модальное окно редактирования

#### Scenario: Изоляция consumer-контура для услуг лошади
- **WHEN** reviewer проверяет frontend diff для horse service relations UI
- **THEN** изменения ограничены `services/frontend`, отсутствуют импорты `site-*`/Public Read consumer modules и `services/site-ad` не изменён

#### Scenario: Отображение масти из DTO при редактировании
- **WHEN** пользователь открывает модальное окно редактирования лошади, у которой `coat_color` существует, но не загружен на текущей странице вкладки «Масти»
- **THEN** селектор масти SHALL отображать имя масти из `selectedHorse.coat_color.name`, а не UUID

#### Scenario: Отображение породы из DTO при редактировании
- **WHEN** пользователь открывает модальное окно редактирования лошади, у которой `breed` существует, но не загружен на текущей странице вкладки «Породы»
- **THEN** селектор породы SHALL отображать имя породы из `selectedHorse.breed.name`, а не UUID

#### Scenario: Отображение владельца из DTO при редактировании
- **WHEN** пользователь открывает модальное окно редактирования лошади, у которой `horse_owner` существует, но не загружен на текущей странице вкладки «Владельцы»
- **THEN** селектор владельца SHALL отображать имя владельца из `selectedHorse.horse_owner.name`, а не UUID
