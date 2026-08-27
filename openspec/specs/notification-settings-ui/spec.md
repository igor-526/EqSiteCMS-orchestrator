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
- **THEN** UI MUST показать в порядке сверху вниз: email block, VK block и таблицу доступных пользователю notification events

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

### Requirement: Таблица событий и каналов

Settings UI MUST рендерить каталог настроек таблицей: строки — события (каталог группируется по `event_code`), столбцы — «Событие» и по одному столбцу на канал. Столбец канала MUST отображаться только если backend вернул этот канал хотя бы для одного события; заголовки MUST быть «Электронная почта» для `email` и «VK» для `vk`. В столбце «Событие» MUST выводиться название события, а описание — как дополнительная строка под ним. На ячейке пересечения события и канала MUST находиться переключатель настройки. Отдельное предупреждение о неготовой доставке в VK рядом с переключателем MUST NOT показываться.

#### Scenario: Eligible event с двумя каналами

- **WHEN** backend возвращает `callback/email` и `callback/vk`
- **THEN** таблица MUST иметь столбцы «Событие», «Электронная почта», «VK» и одну строку «Обратный звонок» с двумя независимыми переключателями

#### Scenario: Eligible event с одним каналом

- **WHEN** backend возвращает только `callback/email`
- **THEN** таблица MUST иметь столбцы «Событие» и «Электронная почта», а столбец «VK» MUST отсутствовать

#### Scenario: Ineligible event

- **WHEN** backend возвращает пустой список из-за scopes
- **THEN** таблица MUST показать корректное empty-state сообщение и не содержать строк событий

#### Scenario: Доступные ярлыки переключателей

- **WHEN** отрисованы переключатели события
- **THEN** каждый MUST иметь уникальный accessible label формата `<название события>: <название канала>`

#### Scenario: Предупреждение о доставке отсутствует

- **WHEN** отрисован переключатель канала `vk` при отсутствующей либо заблокированной привязке владельца
- **THEN** UI MUST NOT показывать рядом предупреждение о недоставке и MUST NOT блокировать переключатель

#### Scenario: Таблица остаётся видимой при ошибке

- **WHEN** переключение настройки завершилось ошибкой и показан alert
- **THEN** таблица MUST остаться на экране, чтобы прежнее состояние переключателей было видно

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
- **THEN** tests MUST покрывать anonymous/authenticated route, все email states, все состояния VK-привязки, состав столбцов таблицы событий, modal validation/errors/success refresh, eligible/ineligible scopes, success/error toggle для обоих каналов, изоляцию каналов, `401`/`403` и double-submit guard

#### Scenario: No consumer mixing

- **WHEN** выполняются architecture checks
- **THEN** CMS source MUST не содержать imports/URL private services или `site-*` consumer code

### Requirement: Manual QA steps (UI тестирование)

Исполнитель MUST проверить feature в реальном браузере на desktop/tablet/mobile и сохранить итоговый passed/failed report.

#### Scenario: Responsive and error QA

- **WHEN** QA проходит email states, VK states, modals, переключатели каналов, permission и backend error cases
- **THEN** layout MUST не иметь overlap/обрезки, modal state MUST сохраняться после ошибки, а failed cases MUST содержать screenshots и network status/body

#### Scenario: QA таблицы событий на узкой ширине

- **WHEN** QA открывает таблицу событий на mobile-ширине с двумя столбцами каналов
- **THEN** названия событий MUST переноситься по словам, а не посимвольно; таблица MAY прокручиваться по горизонтали, если заголовки столбцов не помещаются в ширину экрана
