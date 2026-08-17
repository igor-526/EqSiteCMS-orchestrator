## ADDED Requirements

### Requirement: Вкладка групп пород
CMS MUST добавить вкладку «Группы пород» непосредственно перед вкладкой «Породы» в защищённом route `/horses`. Вкладка MUST показывать таблицу групп с колонками «Наименование», «Путь URL», «Действия», серверной пагинацией, фильтрами, сортировкой и состояниями loading/empty/error.

#### Scenario: Разрешённый пользователь открывает вкладку
- **WHEN** аутентифицированный пользователь открывает `/horses` и выбирает «Группы пород»
- **THEN** CMS загружает первую страницу с `limit=25`, `offset=0`, отображает `total` и не вызывает live backend в unit/component tests

#### Scenario: Anonymous route
- **WHEN** anonymous пользователь открывает `/horses`
- **THEN** существующая protected-route boundary блокирует контент и перенаправляет к авторизации

#### Scenario: Пагинация и фильтры
- **WHEN** пользователь меняет страницу, размер страницы, фильтр или сортировку
- **THEN** CMS передаёт корректные `limit/offset/sort`, а изменение размера/фильтра/сортировки сбрасывает `offset` в `0`

### Requirement: Mutation и page_data групп пород
CMS MUST предоставить modal-flow создания, изменения и удаления группы и отдельное редактирование `page_data` по существующему Page Editor pattern, без фото. Protected Write controls MUST быть скрыты, disabled или guarded без dictionary scope; submit MUST иметь double-submit guard, а `401/403`, validation и generic errors MUST отображаться без потери введённого состояния.

#### Scenario: Scope present
- **WHEN** пользователь имеет применимый create/update/delete dictionary scope
- **THEN** разрешённые действия доступны, успешная mutation закрывает modal и инвалидирует/обновляет список

#### Scenario: Scope missing
- **WHEN** пользователь не имеет применимого scope
- **THEN** mutation action скрыта или disabled и handler не отправляет запрос

#### Scenario: Backend denial
- **WHEN** backend отвечает `401` или `403`
- **THEN** CMS показывает понятную ошибку, сохраняет modal/form state и не показывает ложный success

### Requirement: Группа в таблице и форме пород
CMS MUST вывести колонки пород в порядке «Тип», «Группа», «Наименование», «Кор. наим.», «Описание», «Путь URL», «Действия». Колонка «Группа» MUST показывать `group.name` или «—», иметь multi-select фильтр доступных групп и сортировку. Create/update modal породы MUST содержать single-select группы с возможностью очистки до явного `breed_group_id: null`.

#### Scenario: Отображение и фильтр группы
- **WHEN** таблица получает породы с группой и без неё
- **THEN** она отображает человекочитаемое имя либо «—», а выбранные UUID отправляет как `breed_group_ids`

#### Scenario: Очистка группы в форме
- **WHEN** пользователь очищает ранее выбранную группу и сохраняет породу
- **THEN** CMS отправляет `breed_group_id: null`, обновляет строку после успеха и показывает «—»

#### Scenario: Ошибка загрузки options
- **WHEN** загрузка доступных групп завершается ошибкой
- **THEN** selector/filter не падают, показывают error feedback и не отправляют невалидный UUID

### Requirement: Frontend test matrix
Frontend deliverable MUST иметь MSW/Vitest coverage без live backend calls и browser Manual QA для behavior diff.

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| protected `/horses` и tabs | новая вкладка перед породами | component + route/manual | anonymous redirect, authenticated render | `npm test`, browser |
| types/api/service/hook групп | CRUD/list/detail, normalization, errors | unit + MSW API-boundary | success/empty/400/401/403/generic | `npm test`, `npx tsc --noEmit` |
| таблица групп | data/loading/empty/error, filter/sort/paging/actions | component | scope present/missing | `npm test` |
| modal групп + Page Editor | create/update/delete/page_data, guard/invalidation | component + MSW | Protected Write, double-submit, 401/403 | `npm test`, browser |
| таблица пород | group render/filter/sort и порядок колонок | component regression | Public Read data in protected UI | `npm test` |
| modal пород | nullable selector assign/clear | component + MSW | scope guard, 401/403 | `npm test`, browser |
| architecture boundary | отсутствие `site-*` mixing/live calls | static review | CMS admin vs consumer | `rg`, lint/build |

#### Scenario: Полный frontend gate
- **WHEN** Quality Gate проверяет frontend deliverable
- **THEN** проходят `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, permission/access/MSW/pagination проверки и no-`site-*` mixing review
