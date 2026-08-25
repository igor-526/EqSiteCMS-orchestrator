## ADDED Requirements

### Requirement: Поле slug в CMS-форме лошади

CMS SHALL показывать редактируемое поле «Путь URL (генерируется автоматически)» в create/edit modal лошади, заполнять его текущим значением при редактировании и передавать `slug` через типизированные `HorseCreateInDto`/`HorseUpdateInDto`. Пустое поле SHALL запрашивать backend-автогенерацию. UI MUST сохранять текущие scope/mutation guards, показывать `validationErrors.slug` у поля и сохранять состояние modal при ошибке.

#### Scenario: Создание с ручным slug
- **WHEN** authenticated пользователь со scope вводит кличку и ручной slug и нажимает «Добавить»
- **THEN** CMS отправляет typed create payload с `slug` один раз и после успеха обновляет таблицу

#### Scenario: Создание с автогенерацией
- **WHEN** пользователь оставляет поле slug пустым
- **THEN** CMS отправляет пустое/null значение согласно DTO-контракту, а отображаемый после refresh slug берётся из backend response

#### Scenario: Edit prefill и изменение
- **WHEN** пользователь открывает существующую лошадь
- **THEN** поле содержит её текущий slug, а сохранение изменённого значения включает новый slug в update payload

#### Scenario: Backend field error
- **WHEN** backend отклоняет занятый или невалидный slug
- **THEN** modal остаётся открытой, остальные значения сохраняются и ошибка показывается рядом с полем slug

#### Scenario: Scope missing
- **WHEN** authenticated пользователь не имеет требуемого horse write scope
- **THEN** create/update action скрыта или disabled, modal/mutation guard не позволяет отправить slug mutation, а backend `403` отображается существующим error flow

#### Scenario: Double submit
- **WHEN** пользователь повторно нажимает submit во время pending slug mutation
- **THEN** CMS отправляет ровно один запрос и сохраняет disabled/loading state до завершения

#### Scenario: Anonymous route
- **WHEN** anonymous пользователь открывает CMS route `/horses`
- **THEN** CMS блокирует доступ или перенаправляет на `/login`, не показывая mutation modal

#### Scenario: Responsive modal
- **WHEN** modal со slug field открыта на desktop, tablet и mobile viewport
- **THEN** label, input, field error и footer не перекрываются, а содержимое остаётся прокручиваемым и доступным

#### Scenario: Без смешения с site consumer
- **WHEN** реализовано поле slug в CMS
- **THEN** frontend не импортирует `site-*`/Public Read consumer code и не выполняет live backend calls в unit/component tests
