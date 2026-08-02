## ADDED Requirements

### Requirement: Управление короткими наименованиями пород и мастей
Защищённый CMS horse UI SHALL отображать `short_name` пород и мастей в столбце «Кор. наим.», SHALL поддерживать server-side поиск и сортировку по этому полю и SHALL сбрасывать `offset` в `0` при изменении поиска или сортировки. Create/update modal MUST позволять ввести до 63 символов, отправлять поле через существующий Protected Write flow и показывать field validation error.

#### Scenario: Таблица отображает и фильтрует короткое наименование
- **WHEN** authenticated CMS-пользователь открывает вкладку «Породы» или «Масти» и вводит значение в фильтре «Кор. наим.»
- **THEN** таблица отображает `short_name`, отправляет `short_name` с `limit/offset`, сбрасывает `offset` в `0` и не выполняет live запросы в unit/component tests

#### Scenario: Пользователь сортирует короткое наименование
- **WHEN** пользователь меняет сортировку столбца «Кор. наим.»
- **THEN** frontend маппит направление в `short_name` или `-short_name`, сбрасывает `offset` в `0` и поддерживает очистку sort

#### Scenario: Пользователь создаёт или изменяет справочник
- **WHEN** разрешённый authenticated пользователь сохраняет породу или масть с заполненным `short_name`
- **THEN** create/update body содержит `short_name`, успешный ответ обновляет список, а backend validation, `401` или `403` отображаются как ошибка без потери введённого состояния

#### Scenario: Пустое короткое наименование
- **WHEN** пользователь сохраняет пустое `short_name`
- **THEN** frontend передаёт согласованное пустое значение, backend применяет существующую автогенерацию из `name`, а обновлённое значение появляется после refresh

#### Scenario: Consumer-контур остаётся изолированным
- **WHEN** change проверяется перед merge
- **THEN** `services/site-ad` не изменён и CMS runtime не импортирует `site-*` Public Read consumer code

### Requirement: Frontend test matrix коротких наименований
Изменение SHALL иметь unit/component/API-boundary coverage через Vitest, React Testing Library и MSW без live backend calls, а Manual QA MUST покрывать desktop/tablet/mobile, auth, permissions, ошибки и успешное обновление.

#### Scenario: Автоматизированное frontend evidence
- **WHEN** исполнитель завершает frontend deliverable
- **THEN** тесты покрывают data/loading/empty/error, поиск apply/clear/reset offset, sort mapping/clear, modal create/update/validation/error/refresh, anonymous/authenticated и применимые scope/`401/403` cases

#### Scenario: Проверка protected route
- **WHEN** anonymous и authenticated пользователи открывают `/horses`
- **THEN** anonymous перенаправлен или заблокирован, а authenticated пользователь видит разрешённые вкладки и actions согласно scopes
