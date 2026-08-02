## ADDED Requirements

### Requirement: Защищённый CMS-контур управления лошадьми
CMS SHALL предоставлять маршрут `/horses` только в authenticated admin-контексте, SHALL получать пользователя и scopes через `UserContext` и SHALL перенаправлять на `/login`, если загрузка пользовательской сессии завершилась ошибкой. CMS client MUST NOT добавлять consumer service key и MUST NOT импортировать или смешивать runtime `site-*`.

#### Scenario: Неавторизованный пользователь открывает CMS
- **WHEN** загрузка текущего пользователя для защищённого CMS-маршрута не возвращает успешную сессию
- **THEN** `UserProvider` очищает пользователя и scopes и направляет браузер на `/login`

#### Scenario: Авторизованный пользователь открывает лошадей
- **WHEN** authenticated CMS-пользователь открывает `/horses`
- **THEN** интерфейс получает его scopes из `UserContext` и отображает доступные horse UI-сценарии в tenant пользователя без consumer service key

### Requirement: Scope-aware UX для действий с лошадьми и родословной
CMS SHALL связывать действия создания, изменения, удаления лошади и изменения родословной с явным registry `FeatureAction -> scopes`. Mutation UI MUST быть скрыт или disabled без требуемого scope, а pedigree hook MUST повторно проверять permission перед submit; UI-проверка MUST NOT считаться заменой backend-авторизации.

#### Scenario: Пользователь без scope видит read-only pedigree
- **WHEN** scopes пользователя не разрешают `UPDATE_HORSE_PEDIGREE`
- **THEN** pedigree mutation controls disabled, hook не отправляет mutation и показывает сообщение о недостатке прав

#### Scenario: Разрешённое изменение родословной
- **WHEN** пользователь имеет `SUPERUSER`, `ADMIN` или `DEVELOPER` scope и отправляет изменение родословной
- **THEN** hook выполняет Protected Write, после успеха обновляет открытую родословную и инвалидирует список лошадей

#### Scenario: Backend отклоняет mutation
- **WHEN** существующий backend возвращает `401` или `403` на horse, breed или pedigree mutation
- **THEN** CMS client/hook сохраняет отказ как ошибку сценария и не трактует скрытие кнопки как успешную авторизацию

### Requirement: Tenant-aware horse и breed представление
CMS horse UI SHALL использовать существующий tenant context authenticated session, SHALL отображать horse CRUD и справочники из CMS API и SHALL представлять классификацию вида лошади через `breed.kind`, не отправляя устаревшее поле `kind` в create/update body лошади.

#### Scenario: Фильтрация лошадей по виду
- **WHEN** пользователь выбирает horse kind
- **THEN** список лошадей передаёт kind как query filter, а доступные породы загружаются с тем же kind

#### Scenario: Создание или изменение породы
- **WHEN** пользователь сохраняет породу с классификацией `horse` или `pony`
- **THEN** CMS API boundary передаёт `kind` в body породы и отображает backend `401/403` как ошибку при отказе

#### Scenario: Сохранение лошади после миграции kind
- **WHEN** пользователь создаёт или изменяет лошадь
- **THEN** request body содержит ссылку на породу и не содержит устаревшее поле `kind`

### Requirement: Непротиворечивые фильтры и offset pagination
Horse UI SHALL сериализовать списки и pedigree candidates через `limit` и `offset`, MUST NOT отправлять page-based параметры, SHALL сбрасывать offset в `0` при изменении фильтра, размера страницы или candidate search и SHALL исключать одновременное применение `breed_ids` и `kind`.

#### Scenario: Пользователь меняет фильтр списка
- **WHEN** пользователь изменяет фильтр, включая breed IDs или horse kind
- **THEN** hook сбрасывает offset в `0`, а выбор breed IDs очищает kind

#### Scenario: Breed filter блокирует kind filter
- **WHEN** выбран хотя бы один breed ID
- **THEN** control фильтра kind становится disabled и запрос не содержит конфликтующий kind

#### Scenario: Пользователь листает pedigree candidates
- **WHEN** пользователь меняет страницу или поиск кандидатов родословной
- **THEN** API получает `limit` и вычисленный `offset`, поиск сбрасывает offset в `0`, а `page`, `pageSize` и `page_size` отсутствуют

### Requirement: Управление родословной с явными состояниями
CMS SHALL поддерживать выбор, добавление, замену и удаление sire, dam и children, SHALL показывать loading, empty и error состояния списка кандидатов и SHALL требовать явного выбора кандидата перед сохранением.

#### Scenario: Кандидаты отсутствуют
- **WHEN** pedigree candidate query успешно возвращает пустой список
- **THEN** modal показывает нулевой count и empty state, а кнопка сохранения disabled

#### Scenario: Кандидат выбран
- **WHEN** пользователь выбирает строку кандидата
- **THEN** modal хранит ровно выбранный ID и включает сохранение

#### Scenario: Mutation успешна, но refresh detail завершился ошибкой
- **WHEN** Protected Write выполнен, но последующее чтение detail неуспешно
- **THEN** hook сохраняет picker открытым и показывает ошибку refresh вместо неподтверждённого обновления UI

### Requirement: Выбор фактической сущности вместо сырого идентификатора
Horse page actions SHALL разрешать выбранный ID через текущий список и SHALL передавать в modal фактический объект лошади; отсутствие объекта MUST обрабатываться как ошибка, а не отображением сырого UUID как пользовательского имени.

#### Scenario: Выбранная лошадь присутствует в списке
- **WHEN** action получает ID существующей строки
- **THEN** helper возвращает соответствующую horse entity для modal и pedigree navigation

#### Scenario: Выбранная лошадь отсутствует
- **WHEN** action получает ID, которого нет в текущем списке
- **THEN** UI сообщает, что лошадь не найдена, и не открывает сценарий с сырым UUID вместо сущности

### Requirement: Изолированная frontend test boundary
Frontend API и horse UI tests SHALL выполняться в jsdom с MSW server, SHALL считать любой необработанный сетевой запрос ошибкой и SHALL проверять API serialization, `401/403`, scopes и UI states без live backend.

#### Scenario: Тест вызывает описанный API flow
- **WHEN** тест обращается к CMS API boundary с зарегистрированным MSW handler
- **THEN** ответ формируется handler-ом и тест проверяет query/body/status behavior без внешней сети

#### Scenario: Тест пытается обратиться к live backend
- **WHEN** код теста выполняет запрос без MSW handler
- **THEN** `onUnhandledRequest: "error"` завершает тест ошибкой

### Requirement: Подтверждённые frontend quality boundaries и открытые gaps
Frontend SHALL сохранять действующие lint/test boundaries и выделенные horse feature hooks/components, но backfill MUST считать `G-015` и `G-016` открытыми до появления требуемого evidence. Полный strict rollout, manual QA, full-scope self-check, итоговый QG и полная regression matrix MUST NOT считаться подтверждёнными этим change.

#### Scenario: Проверяется текущий strict pilot
- **WHEN** запускается `lint:ai` или ESLint для файлов из действующего strict pilot
- **THEN** усиленные правила применяются к указанным файлам, не доказывая полный strict rollout на весь `src`

#### Scenario: Оценивается gap G-015
- **WHEN** reviewer проверяет завершённость frontend quality rollout
- **THEN** он сохраняет `G-015` открытым до evidence lint/test/typecheck/build, full-scope self-check, manual QA и итогового Quality Gate

#### Scenario: Оценивается gap G-016
- **WHEN** reviewer проверяет исправления horse UI regressions
- **THEN** он признаёт подтверждёнными нормализацию filters, conflict disable и entity selection helper, но сохраняет `G-016` до отдельной полной regression matrix и evidence отсутствия дублей
