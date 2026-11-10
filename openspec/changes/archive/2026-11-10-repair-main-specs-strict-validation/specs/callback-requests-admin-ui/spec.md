## MODIFIED Requirements

### Requirement: Filters, sorting и pagination
UI SHALL передавать прежние параметры фильтрации, сортировки и пагинации, размещать фильтры в заголовках колонок и сохранять правила labels, phone input, offset и единственной верхней пагинации согласно сценариям ниже.

#### Scenario: Полный контракт фильтров и размещения пагинации
- **WHEN** пользователь работает с фильтрами, сортировкой, вкладками или пагинацией callback-заявок
- **THEN** UI SHALL отправлять backend-параметры для date range, multi-status, multi-spam, name/phone/comment regex, sort и `{limit, offset}`; phone input MUST запрещать буквы, кроме синтаксиса regex. Каждый фильтр, имеющий собственную колонку, MUST находиться в `filterDropdown` заголовка этой колонки по общему CMS table-паттерну: date range — «Дата и время», multi-status — «Статус», multi-spam — «Спам», name — «Имя», phone — «Телефон», comment — «Комментарий». Активный фильтр SHALL визуально выделять `filterIcon`. Видимые placeholder и accessibility labels поисковых полей MUST называться «Имя», «Телефон» и «Комментарий» без технической подписи `(regex)`; это требование не меняет regex-семантику и имена backend query parameters. На вкладке «Заявки» UI MUST показывать ровно одну пагинацию в верхней управляющей строке справа от вкладок по общему CMS-паттерну разделов «Новости» и «Лошади»; нижняя и встроенная table pagination MUST отсутствовать. На вкладке «Инструкция» пагинация MUST быть скрыта. На desktop вкладки и пагинация SHALL находиться в одной строке, а на tablet/mobile контролы MAY переноситься без overlap и потери доступности. Любое изменение filter/search/sort/page-size SHALL reset-ить offset согласно UX (page change меняет только offset).

#### Scenario: Фильтрация и сортировка
- **WHEN** пользователь применяет или очищает filters/sort
- **THEN** query нормализуется, offset сбрасывается в `0`, а таблица обновляется

#### Scenario: Фильтры находятся в соответствующих колонках
- **WHEN** пользователь открывает фильтры таблицы callback-заявок
- **THEN** период, статусы, спам, имя, телефон и комментарий доступны из заголовков соответствующих колонок, а активные фильтры отмечены цветом иконки

#### Scenario: Поисковые поля не раскрывают техническую реализацию
- **WHEN** пользователь открывает фильтры колонок «Имя», «Телефон» или «Комментарий»
- **THEN** placeholder и accessibility label не содержат `(regex)`, но введённое значение отправляется в прежний regex query parameter с прежним debounce и validation behavior

#### Scenario: Верхняя пагинация на вкладке заявок
- **WHEN** пользователь открывает вкладку «Заявки» на desktop
- **THEN** вкладки находятся слева, единственная пагинация находится справа в той же верхней строке до таблицы, а под таблицей и внутри неё пагинации нет

#### Scenario: Пагинация скрыта в инструкции
- **WHEN** пользователь открывает вкладку «Инструкция»
- **THEN** пагинация заявок не отображается, а при возврате на «Заявки» появляется ровно один верхний control

#### Scenario: Адаптивная верхняя строка
- **WHEN** страница отображается на tablet или mobile viewport
- **THEN** вкладки и пагинация остаются доступными, не перекрываются и при необходимости переносятся на отдельные строки

#### Scenario: Пагинация
- **WHEN** пользователь меняет страницу или page size
- **THEN** запрос использует правильные limit/offset, а page-size change сбрасывает offset

### Requirement: Frontend test matrix и Manual QA
Реализация MUST пройти component/API-boundary tests на MSW без live backend calls и browser Manual QA по матрице и сценариям ниже.

#### Scenario: Полная матрица frontend-проверок
- **WHEN** выполняются frontend-проверки раздела callback-заявок
- **THEN** Реализация MUST пройти component/API-boundary tests на MSW без live backend calls и browser Manual QA.

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| route/sidebar | новый защищённый последний menu item | unit/component | anonymous, ADMIN, SUPERUSER, forbidden | `npm test` |
| API/types/hooks | list/detail/statuses/mutations, query mapping | unit/API-boundary MSW | success/empty/422/500/401/403 | `npm test`, `npx tsc --noEmit` |
| filters/table/pagination | column-header filters без `(regex)` в labels, sort/limit/offset/modal | component | authenticated, scopes present/missing | `npm test`, `npm run lint` |
| mutation dropdowns | status/spam guards и invalidation | component/API-boundary | scopes, double-submit, 401/403 | `npm test` |
| page flow | tabs «Заявки»/«Инструкция» | smoke/e2e + manual | allowed/denied roles | `npm run build`, browser QA |

#### Scenario: Automated frontend gate
- **WHEN** CMS tests запускаются
- **THEN** MSW покрывает success, empty, validation, generic, 401 и 403 без live backend calls, включая pagination и permissions

#### Scenario: Responsive manual gate
- **WHEN** flow проверяется на desktop, tablet и mobile
- **THEN** таблица, filters, dropdowns и modal не перекрываются, а результаты QA и failed-case screenshots/network evidence сохраняются в общем отчёте
