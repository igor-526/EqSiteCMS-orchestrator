## MODIFIED Requirements

### Requirement: Frontend scope restrictions для horse services
CMS Frontend SHALL реализовать ограничение прав для horse services аналогично паттерну `price_groups`. Пользователи с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) НЕ должны иметь возможности создавать и удалять услуги, а также изменять наименование услуги. Однако они МОГУТ изменять описание, URL и цену услуги. Пользователи с `DEVELOPER` или `SUPERUSER` scope получают полный доступ.

#### Scenario: Скрытие кнопки создания услуги для ADMIN
- **WHEN** пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) открывает страницу horse services
- **THEN** кнопка «Создать услугу» скрыта или disabled

#### Scenario: Скрытие кнопки удаления услуги для ADMIN
- **WHEN** пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) открывает страницу horse services
- **THEN** кнопки удаления услуг скрыты или disabled

#### Scenario: Блокировка изменения наименования услуги для ADMIN
- **WHEN** пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) открывает форму редактирования услуги
- **THEN** поле «Наименование» заблокировано для редактирования (readonly или disabled)

#### Scenario: Доступность кнопки создания услуги для DEVELOPER
- **WHEN** пользователь с `DEVELOPER` scope открывает страницу horse services
- **THEN** кнопка «Создать услугу» доступна для нажатия

#### Scenario: Доступность кнопки удаления услуги для DEVELOPER
- **WHEN** пользователь с `DEVELOPER` scope открывает страницу horse services
- **THEN** кнопки удаления услуг доступны для нажатия

#### Scenario: Доступность изменения наименования услуги для DEVELOPER
- **WHEN** пользователь с `DEVELOPER` scope открывает форму редактирования услуги
- **THEN** поле «Наименование» доступно для редактирования

#### Scenario: Доступность всех действий для SUPERUSER
- **WHEN** пользователь с `SUPERUSER` scope открывает страницу horse services
- **THEN** все кнопки и поля доступны для взаимодействия

### Requirement: Horse service scopes registry
CMS Frontend SHALL реализовать `horseServicePageScopesRegistry` аналогично `pricePageScopesRegistry`. Регистр SHALL определять доступные действия для каждого scope: `DEVELOPER` и `SUPERUSER` получают полный доступ, `ADMIN` — только чтение.

#### Scenario: Определение прав для CREATE_HORSE_SERVICE
- **WHEN** система проверяет доступность действия `CREATE_HORSE_SERVICE`
- **THEN** действие доступно только для `DEVELOPER` и `SUPERUSER`

#### Scenario: Определение прав для UPDATE_HORSE_SERVICE_NAME
- **WHEN** система проверяет доступность действия `UPDATE_HORSE_SERVICE_NAME`
- **THEN** действие доступно только для `DEVELOPER` и `SUPERUSER`

#### Scenario: Определение прав для DELETE_HORSE_SERVICE
- **WHEN** система проверяет доступность действия `DELETE_HORSE_SERVICE`
- **THEN** действие доступно только для `DEVELOPER` и `SUPERUSER`

#### Scenario: Определение прав для RETRIEVE_HORSE_SERVICE
- **WHEN** система проверяет доступность действия `RETRIEVE_HORSE_SERVICE`
- **THEN** действие доступно для `ADMIN`, `DEVELOPER` и `SUPERUSER`

## MODIFIED Requirements

### Requirement: Horse page scopes
CMS Frontend SHALL использовать `useHorsePageActionScopes` hook для проверки прав доступа на странице лошадей. Hook SHALL включать проверку прав для horse services: `CREATE_HORSE_SERVICE`, `UPDATE_HORSE_SERVICE`, `DELETE_HORSE_SERVICE`, `RETRIEVE_HORSE_SERVICE`.

#### Scenario: Проверка прав для создания услуги
- **WHEN** компонент вызывает `hasPermission(HORSES_PAGE_SCOPES_ACTIONS.CREATE_HORSE_SERVICE)`
- **THEN** возвращает `true` для `DEVELOPER` и `SUPERUSER`, `false` для `ADMIN`

#### Scenario: Проверка прав для обновления услуги
- **WHEN** компонент вызывает `hasPermission(HORSES_PAGE_SCOPES_ACTIONS.UPDATE_HORSE_SERVICE)`
- **THEN** возвращает `true` для `DEVELOPER` и `SUPERUSER`, `false` для `ADMIN`

#### Scenario: Проверка прав для удаления услуги
- **WHEN** компонент вызывает `hasPermission(HORSES_PAGE_SCOPES_ACTIONS.DELETE_HORSE_SERVICE)`
- **THEN** возвращает `true` для `DEVELOPER` и `SUPERUSER`, `false` для `ADMIN`

#### Scenario: Проверка прав для чтения услуги
- **WHEN** компонент вызывает `hasPermission(HORSES_PAGE_SCOPES_ACTIONS.RETRIEVE_HORSE_SERVICE)`
- **THEN** возвращает `true` для `ADMIN`, `DEVELOPER` и `SUPERUSER`

#### Scenario: Доступность изменения описания, URL и цены для ADMIN
- **WHEN** пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) открывает форму редактирования услуги
- **THEN** поля «Описание», «Путь в URL» и «Цена» доступны для редактирования, а кнопка «Изменить» доступна
