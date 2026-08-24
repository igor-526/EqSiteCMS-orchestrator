## ADDED Requirements

### Requirement: Защищённый CMS-раздел callback-заявок
CMS SHALL показывать последним пунктом sidebar раздел «Заявки на обратный звонок» с подходящей phone/contact icon только пользователям со scope `ADMIN` или `SUPERUSER`; route SHALL повторно guard-ить доступ и не импортировать code из `site-*`.

#### Scenario: Разрешённая роль
- **WHEN** authenticated ADMIN или SUPERUSER открывает CMS
- **THEN** menu item виден последним и route рендерится

#### Scenario: Anonymous или запрещённая роль
- **WHEN** anonymous либо пользователь без нужного scope пытается открыть route
- **THEN** anonymous перенаправляется на login, forbidden user не видит menu item и получает guarded/forbidden state

### Requirement: Вкладки заявок и инструкции
Page SHALL содержать вкладки «Заявки» и «Инструкция»; инструкция MUST объяснять просмотр, фильтры, сортировку, пагинацию, detail modal, смену статуса и spam-поведение.

#### Scenario: Открытие инструкции
- **WHEN** пользователь выбирает вкладку «Инструкция»
- **THEN** он видит структурированное актуальное руководство без developer/service API деталей

### Requirement: Таблица и detail modal
Таблица SHALL показывать дату/время, status tag, spam, name, `tel:` phone link и обрезанный comment; row click SHALL открывать modal со всеми доступными данными заявки. Loading, empty, validation, generic, `401` и `403` states MUST отображаться явно.

#### Scenario: Рендер страницы данных
- **WHEN** API возвращает страницу заявок и актуальный справочник статусов
- **THEN** колонки и tags отображаются корректно, comment сокращён, phone кликабелен, modal показывает полные данные

#### Scenario: Ошибка API
- **WHEN** API возвращает validation, generic, `401` либо `403`
- **THEN** UI показывает различимое сообщение и сохраняет применимое состояние filters/page/modal

### Requirement: Filters, sorting и pagination
UI SHALL отправлять backend-параметры для date range, multi-status, multi-spam, name/phone/comment regex, sort и `{limit, offset}`; phone input MUST запрещать буквы, кроме синтаксиса regex. Любое изменение filter/search/sort/page-size SHALL reset-ить offset согласно UX (page change меняет только offset).

#### Scenario: Фильтрация и сортировка
- **WHEN** пользователь применяет или очищает filters/sort
- **THEN** query нормализуется, offset сбрасывается в `0`, а таблица обновляется

#### Scenario: Пагинация
- **WHEN** пользователь меняет страницу или page size
- **THEN** запрос использует правильные limit/offset, а page-size change сбрасывает offset

### Requirement: Status и spam mutations
Status tag и spam value SHALL открывать dropdown только при разрешённом scope; mutation MUST иметь UI/service guard, double-submit guard, показывать backend `401/403` и после успеха invalidation/refresh. Row modal MUST NOT открываться из-за click внутри dropdown.

#### Scenario: Успешная смена статуса
- **WHEN** разрешённый пользователь выбирает новый seeded status
- **THEN** отправляется только status mutation и строка обновляется после подтверждения backend

#### Scenario: Успешная установка spam
- **WHEN** разрешённый пользователь выбирает spam=true
- **THEN** строка после refresh показывает spam и status «Закрыто»

#### Scenario: Scope отсутствует или backend запрещает
- **WHEN** scope отсутствует либо backend отвечает `401/403`
- **THEN** action скрыт/disabled/guarded, mutation не выполняется либо denial показан без optimistic corruption

### Requirement: Frontend test matrix и Manual QA
Реализация MUST пройти component/API-boundary tests на MSW без live backend calls и browser Manual QA.

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| route/sidebar | новый защищённый последний menu item | unit/component | anonymous, ADMIN, SUPERUSER, forbidden | `npm test` |
| API/types/hooks | list/detail/statuses/mutations, query mapping | unit/API-boundary MSW | success/empty/422/500/401/403 | `npm test`, `npx tsc --noEmit` |
| filters/table/pagination | filters/sort/limit/offset/modal | component | authenticated, scopes present/missing | `npm test`, `npm run lint` |
| mutation dropdowns | status/spam guards и invalidation | component/API-boundary | scopes, double-submit, 401/403 | `npm test` |
| page flow | tabs «Заявки»/«Инструкция» | smoke/e2e + manual | allowed/denied roles | `npm run build`, browser QA |

#### Scenario: Automated frontend gate
- **WHEN** CMS tests запускаются
- **THEN** MSW покрывает success, empty, validation, generic, 401 и 403 без live backend calls, включая pagination и permissions

#### Scenario: Responsive manual gate
- **WHEN** flow проверяется на desktop, tablet и mobile
- **THEN** таблица, filters, dropdowns и modal не перекрываются, а результаты QA и failed-case screenshots/network evidence сохраняются в общем отчёте

