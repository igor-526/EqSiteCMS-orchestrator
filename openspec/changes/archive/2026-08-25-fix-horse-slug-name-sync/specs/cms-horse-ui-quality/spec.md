## MODIFIED Requirements

### Requirement: Поле slug в CMS-форме лошади

CMS SHALL показывать редактируемое поле «Путь URL (генерируется автоматически)» в create/edit modal лошади, заполнять его текущим значением при редактировании и передавать `slug` через типизированные `HorseCreateInDto`/`HorseUpdateInDto`. Пустое поле SHALL запрашивать backend-автогенерацию. При изменении клички в edit modal CMS MUST очистить не изменённый вручную в текущей сессии slug, чтобы PATCH запросил backend-регенерацию из итогового `name`. Любое ручное изменение slug в текущей сессии, включая явную очистку, MUST иметь приоритет над последующими изменениями клички. UI MUST сохранять текущие scope/mutation guards, показывать `validationErrors.slug` у поля и сохранять состояние modal при ошибке.

#### Scenario: Создание с ручным slug
- **WHEN** authenticated пользователь со scope вводит кличку и ручной slug и нажимает «Добавить»
- **THEN** CMS отправляет typed create payload с `slug` один раз и после успеха обновляет таблицу

#### Scenario: Создание с автогенерацией
- **WHEN** пользователь оставляет поле slug пустым
- **THEN** CMS отправляет пустое/null значение согласно DTO-контракту, а отображаемый после refresh slug берётся из backend response

#### Scenario: Edit prefill без изменения клички
- **WHEN** пользователь открывает существующую лошадь и не меняет её кличку или slug
- **THEN** поле содержит текущий slug, а сохранение не запрашивает его непреднамеренную регенерацию

#### Scenario: Изменение клички обновляет автоматический slug
- **WHEN** пользователь меняет кличку существующей лошади до любого ручного изменения slug в текущей сессии modal
- **THEN** CMS очищает slug field и отправляет `slug=""`, backend регенерирует slug из итоговой клички, а после success refresh UI показывает сохранённое значение

#### Scenario: Ручной slug после изменения клички
- **WHEN** пользователь сначала меняет кличку, а затем вводит непустой slug
- **THEN** CMS отправляет введённый ручной slug и не заменяет его автоматическим значением

#### Scenario: Ручной slug до изменения клички
- **WHEN** пользователь вручную меняет slug, а затем меняет кличку в той же сессии modal
- **THEN** CMS сохраняет ручной slug без очистки и отправляет его вместе с итоговым `name`

#### Scenario: Явная очистка slug имеет ручной приоритет
- **WHEN** пользователь вручную очищает slug и затем меняет кличку
- **THEN** CMS оставляет slug пустым и PATCH запрашивает backend-регенерацию из итогового имени

#### Scenario: Повторное открытие сбрасывает session state
- **WHEN** modal закрывают и открывают для той же или другой лошади
- **THEN** CMS заново заполняет поля данными выбранной записи и сбрасывает признак ручного изменения slug

#### Scenario: Backend field error
- **WHEN** backend отклоняет занятый или невалидный ручной slug
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
- **WHEN** реализована синхронизация клички и slug в CMS
- **THEN** frontend не импортирует `site-*`/Public Read consumer code и не выполняет live backend calls в unit/component tests
