## ADDED Requirements

### Requirement: Безопасная валидация modal пород и мастей
CMS horse UI SHALL отображать ошибки каждого поля пород и мастей только из массива соответствующего ключа, MUST NOT обращаться к `.join()` отсутствующего значения и SHALL сохранять введённое состояние после backend validation, generic, `401` или `403` error. Пустые `slug` и `description` SHALL передаваться в согласованной nullable/empty форме, которую backend нормализует, без клиентского требования заполнить эти поля.

#### Scenario: Пустая форма породы
- **WHEN** backend возвращает ошибку `name` после отправки пустой формы породы без ошибки `description`
- **THEN** modal отображает ошибку имени, не падает и продолжает показывать счётчик описания

#### Scenario: Пустая форма масти
- **WHEN** backend возвращает ошибку `name` после отправки пустой формы масти без ошибки `description`
- **THEN** modal отображает ошибку имени, не падает и продолжает показывать счётчик описания

#### Scenario: Ошибка описания
- **WHEN** backend возвращает массив ошибок `description` для породы или масти
- **THEN** modal объединяет и отображает только этот массив у поля описания

#### Scenario: Пустые slug и description
- **WHEN** разрешённый authenticated пользователь создаёт или изменяет породу либо масть, оставив slug и описание пустыми
- **THEN** CMS отправляет Protected Write один раз, не показывает клиентскую ошибку обязательности этих полей и после успеха обновляет список с backend-generated slug и nullable description

#### Scenario: Backend denial и состояние формы
- **WHEN** Protected Write возвращает validation error, generic error, `401` или `403`
- **THEN** modal не показывает ложный успех, сохраняет значения полей и отображает доступную ошибку для исправления либо повторной попытки

#### Scenario: Permission и double submit
- **WHEN** пользователь без требуемого scope пытается открыть/отправить mutation либо разрешённый пользователь дважды нажимает submit
- **THEN** action скрыт, disabled или guarded без scope, а при разрешённом действии отправляется не более одного запроса

#### Scenario: Изолированные frontend tests
- **WHEN** component/API-boundary tests проверяют modal и запросы пород и мастей
- **THEN** они используют jsdom и MSW/mocks для success, empty, validation, generic, `401` и `403`, а необработанный live network request завершает тест ошибкой

#### Scenario: Protected Admin route
- **WHEN** anonymous или authenticated пользователь открывает `/horses`
- **THEN** anonymous перенаправлен/заблокирован, а authenticated пользователь видит разрешённые tabs/actions согласно scopes

#### Scenario: Изоляция consumer-контура
- **WHEN** reviewer проверяет frontend diff
- **THEN** `services/site-ad` не изменён, CMS не импортирует `site-*`/Public Read consumer runtime и существующая `limit/offset` pagination не регрессирует

