## MODIFIED Requirements

### Requirement: Вкладки уведомлений

Страница MUST содержать вкладки «История» и «Настройки» по существующим CMS UX patterns.

#### Scenario: History placeholder

- **WHEN** пользователь выбирает «История»
- **THEN** UI MUST показать сообщение, что функциональность скоро будет доступна, без API вызова истории

#### Scenario: Settings content

- **WHEN** пользователь выбирает «Настройки»
- **THEN** UI MUST показать email block, VK block и доступные пользователю notification events

### Requirement: Role-dependent event checkbox

Settings UI MUST рендерить только события, возвращённые backend, группируя строки каталога по `event_code`. Внутри строки события UI MUST рендерить отдельный переключатель на каждый возвращённый `channel_code` с подписью канала; для события `callback` MUST показываться краткое описание справа от названия события.

#### Scenario: Eligible event с двумя каналами

- **WHEN** backend возвращает `callback/email` и `callback/vk`
- **THEN** UI MUST показать одну строку события «Обратный звонок» с двумя независимыми переключателями, подписанными названиями каналов, и описанием обратного звонка

#### Scenario: Eligible event с одним каналом

- **WHEN** backend возвращает только `callback/email`
- **THEN** UI MUST показать строку события с единственным переключателем канала email

#### Scenario: Ineligible event

- **WHEN** backend возвращает пустой список из-за scopes
- **THEN** UI MUST не показывать недоступные переключатели и MUST показать корректное empty-state сообщение

#### Scenario: Доступные ярлыки переключателей

- **WHEN** отрисованы переключатели события
- **THEN** каждый MUST иметь уникальный accessible label формата `<название события>: <название канала>`

#### Scenario: Предупреждение о неготовой VK-доставке

- **WHEN** отрисован переключатель канала `vk`, а привязка VK владельца отсутствует либо находится в состоянии `BLOCKED`
- **THEN** UI MUST показать рядом предупреждение о том, что уведомления в VK не будут доставлены до привязки или разблокировки бота, и MUST NOT блокировать сам переключатель

### Requirement: No optimistic mutation

Переключатель канала MUST менять визуальный checked state только после успешного backend response; pending state MUST блокировать повторную отправку по ключу `event_code/channel_code`.

#### Scenario: Successful toggle

- **WHEN** backend успешно подтверждает новое значение для конкретной комбинации события и канала
- **THEN** UI MUST обновить только этот переключатель и синхронизировать query/cache

#### Scenario: Failed toggle

- **WHEN** backend возвращает validation/generic/`401`/`403` error
- **THEN** UI MUST сохранить прежний checked state этого переключателя, снять pending и показать понятную ошибку

#### Scenario: Изоляция каналов при ошибке

- **WHEN** переключение канала `vk` завершается ошибкой
- **THEN** состояние переключателя `email` того же события MUST остаться неизменным

#### Scenario: Двойное нажатие одного переключателя

- **WHEN** пользователь дважды быстро нажимает один переключатель
- **THEN** MUST быть отправлен ровно один запрос

### Requirement: Frontend architecture and tests

Frontend MUST соблюдать `page → feature UI → hook → service → src/api`, не вызывать private services и не импортировать `site-*`; unit/component/API-boundary tests MUST использовать mocks/MSW без live backend.

#### Scenario: Automated coverage

- **WHEN** feature готова к Quality Gate
- **THEN** tests MUST покрывать anonymous/authenticated route, все email states, все состояния VK-привязки, modal validation/errors/success refresh, eligible/ineligible scopes, success/error toggle для обоих каналов, изоляцию каналов, `401`/`403` и double-submit guard

#### Scenario: No consumer mixing

- **WHEN** выполняются architecture checks
- **THEN** CMS source MUST не содержать imports/URL private services или `site-*` consumer code

### Requirement: Manual QA steps (UI тестирование)

Исполнитель MUST проверить feature в реальном браузере на desktop/tablet/mobile и сохранить итоговый passed/failed report.

#### Scenario: Responsive and error QA

- **WHEN** QA проходит email states, VK states, modals, переключатели каналов, permission и backend error cases
- **THEN** layout MUST не иметь overlap/обрезки, modal state MUST сохраняться после ошибки, а failed cases MUST содержать screenshots и network status/body

#### Scenario: QA строки события с двумя каналами

- **WHEN** QA открывает карточку событий на mobile-ширине с двумя переключателями канала
- **THEN** переключатели и их подписи MUST оставаться читаемыми и не перекрывать описание события
