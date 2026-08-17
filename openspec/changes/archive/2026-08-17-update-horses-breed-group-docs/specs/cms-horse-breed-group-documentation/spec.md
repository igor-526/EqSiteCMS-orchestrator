## ADDED Requirements

### Requirement: Пользовательская инструкция по группам пород
CMS MUST обновить вкладку «Инструкция» раздела «Лошади», чтобы она описывала группы пород в обзоре и отдельном разделе перед породами. Инструкция MUST объяснять назначение справочника, колонки таблицы, поиск/сортировку/пагинацию, создание, изменение, удаление, Page Editor без управления фотографиями и существующее ограничение write-действий scopes пользователя.

#### Scenario: Администратор изучает workflow групп пород
- **WHEN** аутентифицированный пользователь с доступом к пользовательской документации открывает вкладку «Инструкция»
- **THEN** он видит последовательный workflow создания, изменения, удаления и редактирования страницы группы пород, а также ожидаемые состояния permissions и ошибок

#### Scenario: Удаление связанной группы объяснено безопасно
- **WHEN** пользователь читает описание удаления группы пород
- **THEN** инструкция сообщает, что породы не удаляются, их связь очищается и в таблице пород отображается «—»

### Requirement: Пользовательская инструкция по связи породы с группой
Раздел «Породы» во вкладке «Инструкция» MUST описывать поле и колонку «Группа», назначение и явную очистку группы, multi-select фильтр по группам и сортировку по имени группы.

#### Scenario: Пользователь находит все операции со связью
- **WHEN** администратор читает раздел «Породы»
- **THEN** документация объясняет отображение группы, выбор в create/update форме, очистку связи, фильтрацию по нескольким группам и сортировку

### Requirement: Developer-документация API групп пород
CMS MUST добавить во вкладку «Документация» отдельный раздел `/api/horses/breed-groups` перед разделом пород. Раздел MUST перечислять list/detail/create/update/delete endpoint-ы, slug-or-UUID lookup, `page_data=true`, query `limit`, `offset`, `name`, `slug`, `page_data`, повторяемый `sort`, поддерживаемые поля сортировки, create/update DTO, response DTO и curl-примеры.

#### Scenario: Разработчик сверяет list/detail contract
- **WHEN** разработчик открывает раздел групп пород
- **THEN** он видит точные GET paths, query-параметры, сортировки, pagination, detail lookup и optional `page_data`

#### Scenario: Разработчик сверяет mutation contract
- **WHEN** разработчик ищет создание, изменение или удаление группы
- **THEN** он видит точные POST/PATCH/DELETE paths, поля `name`, `slug`, `page_data`, auto-slug, partial PATCH и форму response

### Requirement: Developer-документация access contract
Developer-вкладка MUST описывать фактический access contract групп пород без изменения backend: GET является Public Read при валидном `X-Equestrian-Service-Key`; missing/invalid selector возвращает `401`; POST/PATCH/DELETE требуют CMS authentication и разрешённую роль, anonymous возвращает `401`, insufficient permission возвращает `403`.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/horses/breed-groups` | Public Read + tenant selector | anonymous/authenticated | `200` с валидным selector; `401` без/с invalid selector | `200` с валидным selector |
| GET | `/api/horses/breed-groups/{slug_or_id}` | Public Read + tenant selector | anonymous/authenticated | `200` с валидным selector; `401` без/с invalid selector | `200` с валидным selector |
| POST | `/api/horses/breed-groups` | Protected Write | SUPERUSER, ADMIN, DEVELOPER | `401` | success для разрешённой роли; `403` без разрешения |
| PATCH | `/api/horses/breed-groups/{slug_or_id}` | Protected Write | SUPERUSER, ADMIN, DEVELOPER | `401` | success для разрешённой роли; `403` без разрешения |
| DELETE | `/api/horses/breed-groups/{slug_or_id}` | Protected Write | SUPERUSER, ADMIN, DEVELOPER | `401` | success для разрешённой роли; `403` без разрешения |

#### Scenario: Public Read описан с selector
- **WHEN** разработчик читает GET contract
- **THEN** документация различает отсутствие CMS-auth и обязательный tenant selector и фиксирует `401` для missing/invalid selector

#### Scenario: Protected Write описан с denial outcomes
- **WHEN** разработчик читает mutation contract
- **THEN** документация фиксирует CMS authentication, разрешённые роли, anonymous `401` и insufficient-permission `403`

### Requirement: Developer-документация связи пород
Раздел `/api/horses/breeds` MUST документировать repeatable filter `breed_group_ids`, sorting `group_name`/`-group_name`, nullable input `breed_group_id` и nullable nested response `group` с `id`, `name`, `slug`. PATCH semantics MUST различать отсутствующее поле, сохраняющее связь, и явный `null`, очищающий её; удаление группы MUST быть описано как очистка FK через `SET NULL` без удаления породы.

#### Scenario: Разработчик интегрирует список пород
- **WHEN** клиенту нужны фильтрация, сортировка или отображение группы
- **THEN** документация показывает `breed_group_ids`, `group_name` и nested nullable `group`

#### Scenario: Разработчик изменяет связь породы
- **WHEN** клиент отправляет PATCH породы
- **THEN** документация различает omitted `breed_group_id`, UUID группы и явный `breed_group_id: null`

### Requirement: Regression coverage документационных вкладок
Frontend deliverable MUST добавить component tests ключевого пользовательского и developer-контента без live backend calls. Quality Gate MUST также выполнить browser Manual QA на desktop, tablet и mobile и проверить protected route, существующие documentation scopes, отсутствие `site-*` mixing и отсутствие новых runtime API calls при чтении вкладок. Если browser runtime недоступен на текущей платформе, Quality Gate MAY завершить gate со статусом `APPROVED WITH ACCEPTED RISK` только при явном пользовательском waiver, успешности всех автоматизированных/content/access/architecture/validation проверок и полном документировании environment evidence, deferred checks, остаточного риска и follow-up рекомендации. Browser scenarios при waiver MUST оставаться отмеченными как невыполненные и MUST NOT называться passed.

#### Scenario: Component tests фиксируют пользовательский смысл
- **WHEN** выполняются тесты `HorsesUserDocumentationView`
- **THEN** они подтверждают заголовок групп пород, CRUD/Page Editor, назначение/очистку, filter/sort и сохранение пород после удаления группы

#### Scenario: Component tests фиксируют API contract
- **WHEN** выполняются тесты `HorsesDeveloperDocumentationView`
- **THEN** они подтверждают paths, methods, query/body/response tokens, `page_data`, `breed_group_ids`, `group_name`, `breed_group_id`, nested `group`, selector и `401/403`

#### Scenario: Browser QA подтверждает доступность и адаптивность
- **WHEN** Quality Gate открывает обе вкладки под разрешёнными ролями на 1440×900, 768×1024 и 390×844
- **THEN** контент читаем, порядок разделов корректен, tabs/tables/code blocks не перекрываются и чтение документации не создаёт новых API-запросов

#### Scenario: Browser runtime недоступен на платформе
- **WHEN** browser runtime сообщает явную недоступность, список browser instances пуст, troubleshooting задокументирован и пользователь явно принимает остаточный риск выпуска без browser QA
- **THEN** Quality Gate оставляет browser scenarios невыполненными, перечисляет deferred auth/scope, Network, responsive/readability и regression проверки, рекомендует повторить их при появлении runtime и MAY завершить change как `APPROVED WITH ACCEPTED RISK`, если все остальные обязательные проверки успешны и blocking findings отсутствуют

#### Scenario: Waiver не маскирует browser failure
- **WHEN** browser runtime доступен либо browser-проверка обнаружила дефект
- **THEN** platform-unavailable waiver неприменим, а failed scenario остаётся блокирующим до исправления и повторной проверки
