# notification-settings-ui Specification

## Purpose
Защищённый CMS-интерфейс управления email и доступными пользователю настройками уведомлений через основной backend.

## Requirements

### Requirement: Protected раздел «Уведомления»
CMS MUST добавить `/notifications` и пункт sidebar с подходящей notification-иконкой для каждого authenticated пользователя независимо от scopes; anonymous пользователь MUST быть заблокирован существующим auth guard.

#### Scenario: Authenticated navigation
- **WHEN** authenticated пользователь с любым набором scopes открывает CMS
- **THEN** он MUST видеть пункт «Уведомления» и иметь доступ к `/notifications`

#### Scenario: Anonymous navigation
- **WHEN** anonymous пользователь открывает `/notifications`
- **THEN** CMS MUST перенаправить/заблокировать его по существующему protected-route contract

### Requirement: Вкладки уведомлений
Страница MUST содержать вкладки «История» и «Настройки» по существующим CMS UX patterns.

#### Scenario: History placeholder
- **WHEN** пользователь выбирает «История»
- **THEN** UI MUST показать сообщение, что функциональность скоро будет доступна, без API вызова истории

#### Scenario: Settings content
- **WHEN** пользователь выбирает «Настройки»
- **THEN** UI MUST показать email block и доступные пользователю notification events

### Requirement: Email lifecycle UI
Email block MUST показывать состояния отсутствующего, неподтверждённого и подтверждённого адреса и управлять адресом только через основной backend.

#### Scenario: Email отсутствует
- **WHEN** owner email не найден
- **THEN** UI MUST объяснить необходимость привязки и предложить создание, не показывая change/delete

#### Scenario: Email не подтверждён
- **WHEN** email существует с `approved=false`
- **THEN** UI MUST показать адрес красным и объяснить необходимость подтверждения

#### Scenario: Email подтверждён
- **WHEN** email существует с `approved=true`
- **THEN** UI MUST показать адрес обычным основным цветом

#### Scenario: Change modal
- **WHEN** пользователь с существующим email нажимает «Изменить»
- **THEN** modal MUST запросить валидный новый email и предупредить о необходимости повторного подтверждения

#### Scenario: Delete modal
- **WHEN** пользователь нажимает «Удалить»
- **THEN** modal MUST запросить подтверждение; для подтверждённого email текст MUST сообщить, что при повторной привязке потребуется новое подтверждение

### Requirement: Role-dependent event checkbox
Settings UI MUST рендерить только события, возвращённые backend; для `callback/email` MUST показывать checkbox и краткое описание справа.

#### Scenario: Eligible event
- **WHEN** backend возвращает `callback/email`
- **THEN** UI MUST показать checkbox с server state и описанием обратного звонка

#### Scenario: Ineligible event
- **WHEN** backend возвращает пустой список из-за scopes
- **THEN** UI MUST не показывать недоступный checkbox и MUST показать корректное empty-state сообщение

### Requirement: No optimistic mutation
Checkbox MUST менять визуальный checked state только после успешного backend response; pending state MUST блокировать повторную отправку.

#### Scenario: Successful toggle
- **WHEN** backend успешно подтверждает новое значение
- **THEN** UI MUST обновить checkbox и синхронизировать query/cache

#### Scenario: Failed toggle
- **WHEN** backend возвращает validation/generic/`401`/`403` error
- **THEN** UI MUST сохранить прежний checked state, снять pending и показать понятную ошибку

### Requirement: Frontend architecture and tests
Frontend MUST соблюдать `page → feature UI → hook → service → src/api`, не вызывать private services и не импортировать `site-*`; unit/component/API-boundary tests MUST использовать mocks/MSW без live backend.

#### Scenario: Automated coverage
- **WHEN** feature готова к Quality Gate
- **THEN** tests MUST покрывать anonymous/authenticated route, все email states, modal validation/errors/success refresh, eligible/ineligible scopes, success/error toggle, `401`/`403` и double-submit guard

#### Scenario: No consumer mixing
- **WHEN** выполняются architecture checks
- **THEN** CMS source MUST не содержать imports/URL private services или `site-*` consumer code

### Requirement: Manual QA steps (UI тестирование)
Исполнитель MUST проверить feature в реальном браузере на desktop/tablet/mobile и сохранить итоговый passed/failed report.

#### Scenario: Responsive and error QA
- **WHEN** QA проходит email states, modals, checkbox, permission и backend error cases
- **THEN** layout MUST не иметь overlap/обрезки, modal state MUST сохраняться после ошибки, а failed cases MUST содержать screenshots и network status/body
