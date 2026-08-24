## ADDED Requirements

### Requirement: CMS безопасно удаляет временные элементы загрузки фотографий
Gallery upload-flow SHALL различать локальный temporary/failed item и успешно созданный серверный photo resource. Remove для item без подтверждённого server UUID MUST удалить item только из локального списка и MUST NOT вызывать photo DELETE API. Remove для successfully uploaded item SHALL вызвать `DELETE /api/photos/{uuid}` и удалить item из UI только после успешного ответа.

#### Scenario: Failed upload удаляется локально
- **WHEN** `POST /api/photos` завершился validation, authorization, server или network error и пользователь удаляет failed item
- **THEN** item исчезает из upload list без HTTP DELETE и без запроса с `temp-*`

#### Scenario: Uploading item не считается серверным ресурсом
- **WHEN** пользователь удаляет item до получения успешного create response
- **THEN** CMS не отправляет DELETE с локальным uid и сохраняет консистентное локальное состояние

#### Scenario: Успешный upload удаляется через Protected Write
- **WHEN** item имеет status done и валидный server UUID, а permitted authenticated user нажимает remove
- **THEN** CMS вызывает ровно один `DELETE /api/photos/{uuid}` и после success удаляет item и обновляет gallery

#### Scenario: Backend denial сохраняет серверный item
- **WHEN** DELETE серверной фотографии возвращает `401`, `403` или generic error
- **THEN** CMS показывает понятную ошибку, не удаляет item локально как успешный и допускает повтор после восстановления доступа

### Requirement: Gallery upload regression покрывается изолированными frontend tests
Frontend tests SHALL использовать MSW/mocks без live backend calls и MUST покрывать success, temporary/failed cleanup, validation error, generic error, `401`, `403`, permission guard и отсутствие `site-*` mixing.

#### Scenario: API spy не видит temporary DELETE
- **WHEN** hook/component test удаляет item с local uid после upload error
- **THEN** MSW/API spy фиксирует ноль DELETE requests

#### Scenario: Protected route и permission states проверены
- **WHEN** тестируется anonymous, authenticated with scope и authenticated without scope состояние gallery
- **THEN** anonymous blocked/redirected, permitted user видит flow, а mutation без scope hidden/disabled/guarded

#### Scenario: Browser QA waived в Arch environment
- **WHEN** Quality Gate выполняется в текущем Arch environment без доступного Browser Plugin
- **THEN** manual responsive/network/screenshots checks помечаются N/A по явному waiver пользователя и не блокируют acceptance; их заменяют jsdom/component/hook/API-boundary tests
