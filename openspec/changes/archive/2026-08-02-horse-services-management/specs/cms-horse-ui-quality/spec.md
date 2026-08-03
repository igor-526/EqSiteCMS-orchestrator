# cms-horse-ui-quality — Delta Spec

## MODIFIED Requirements

### Requirement: Scope-aware UX для действий с лошадьми и родословной
CMS SHALL связывать действия создания, изменения, удаления лошади и изменения родословной с явным registry `FeatureAction -> scopes`. CMS SHALL предоставлять кнопку управления услугами в колонке «Действия» таблицы лошадей с badge количества связанных услуг. Drawer с таблицей связанных услуг SHALL открываться при нажатии на кнопку. Модальное окно добавления/редактирования связи SHALL открываться при нажатии на кнопку «Добавить» или строку таблицы. Mutation UI MUST быть скрыт или disabled без требуемого scope, а pedigree hook MUST повторно проверять permission перед submit; UI-проверка MUST NOT считаться заменой backend-авторизации.

#### Scenario: Пользователь без scope видит read-only pedigree
- **WHEN** scopes пользователя не разрешают `UPDATE_HORSE_PEDIGREE`
- **THEN** pedigree mutation controls disabled, hook не отправляет mutation и показывает сообщение о недостатке прав

#### Scenario: Разрешённое изменение родословной
- **WHEN** scopes пользователя разрешают `UPDATE_HORSE_PEDIGREE`
- **THEN** pedigree mutation controls enabled, hook выполняет mutation

#### Scenario: Кнопка управления услугами в таблице лошадей
- **WHEN** authenticated CMS-пользователь открывает вкладку «Лошади»
- **THEN** в колонке «Действия» отображается третья кнопка (иконка финансов) с badge количества привязанных услуг

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
