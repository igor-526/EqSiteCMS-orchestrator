## Purpose
Зафиксировать подтверждённые требования к защищённому CMS-интерфейсу управления лошадьми и его quality boundaries.
## Requirements
### Requirement: Детерминированный CMS typecheck
CMS frontend SHALL генерировать Next types и выполнять typecheck/build без гонки за общей изменяемой `.next`; standalone typecheck MUST быть воспроизводим на clean checkout и параллельный release orchestration не должен удалять его inputs.

#### Scenario: Clean typecheck
- **WHEN** запускается документированная CMS typecheck command на clean workspace
- **THEN** required generated types создаются детерминированно и TypeScript завершается без missing `.next/types` errors

### Requirement: Blocking ESLint rollout
CMS SHALL перейти от 401 warning к blocking lint через pilot scope, затем отдельный rollout `prices`, `gallery`, `news`, `siteSettings`. Затронутые API status branches MUST использовать `src/lib/apiStatus.ts` (`API_STATUS`, `isApiSuccess`, `isApiError`); blanket suppressions MUST NOT заменять исправления.

#### Scenario: Pilot завершён
- **WHEN** pilot auth/API и horses files проверяются
- **THEN** semantic warnings исправлены, behavior tests зелёные и rules повышены до error в pilot

#### Scenario: Feature rollout завершён
- **WHEN** очередная feature из prices/gallery/news/siteSettings мигрирована
- **THEN** её lint/tests/typecheck проходят до начала следующей feature, а финальный `npm run lint` имеет 0 errors/согласованный 0-warning scope

### Requirement: Behavior-oriented decomposition CMS hotspots
Hotspots `HorsesDeveloperDocumentationView`, `PriceEditModal`, `PricesDeveloperDocumentationView` и `useHorsesPage` SHALL декомпозироваться по responsibilities только вместе с regression tests behavior diff; механическое перемещение строк MUST NOT считаться завершением.

#### Scenario: Horse/price behavior сохранён
- **WHEN** hotspot разбит на hooks/components/helpers
- **THEN** tests покрывают loading/data/empty/error, interactions, validation, success invalidation, pagination `limit/offset`, scopes и `401/403`

### Requirement: Защищённый CMS-контур управления лошадьми
CMS SHALL предоставлять маршрут `/horses` только в authenticated admin-контексте, SHALL получать пользователя и scopes через `UserContext` и SHALL перенаправлять на `/login`, если загрузка пользовательской сессии завершилась ошибкой. Вкладка «Лошади» SHALL отображать raw nullable `pedigree_name` отдельной колонкой «Кличка в родословной», причём `null` MUST отображаться как явное пустое состояние без fallback к `name`. Create/edit modal SHALL предоставлять одноимённое строковое поле длиной не более 63 символов, сохраняющее допустимые значения и позволяющее очистить существующее значение. Типы, validators, hooks и документация MUST удалить horse `code`. CMS client MUST NOT добавлять consumer service key и MUST NOT импортировать или смешивать runtime `site-*`.

#### Scenario: Неавторизованный пользователь открывает CMS
- **WHEN** загрузка текущего пользователя для защищённого CMS-маршрута не возвращает успешную сессию
- **THEN** `UserProvider` очищает пользователя и scopes и направляет браузер на `/login`

#### Scenario: Авторизованный пользователь открывает лошадей
- **WHEN** authenticated CMS-пользователь открывает `/horses`
- **THEN** интерфейс получает scopes из `UserContext`, использует cookie projection и не добавляет consumer service key

#### Scenario: Таблица отображает кличку родословной
- **WHEN** horse list возвращает строку либо `null` в `pedigree_name`
- **THEN** колонка «Кличка в родословной» показывает точное значение либо устойчивое пустое представление во всех loading/data/empty/error/pagination состояниях

#### Scenario: Создание и изменение
- **WHEN** пользователь с horse write scope сохраняет до 63 символов в create/edit modal
- **THEN** CMS отправляет `pedigree_name` в POST/PATCH, блокирует double submit и после успеха invalidates список

#### Scenario: Очистка и omitted semantics
- **WHEN** пользователь очищает поле либо изменяет только другое поле
- **THEN** CMS отправляет соответственно `pedigree_name: null` либо не включает поле, а refresh показывает подтверждённое backend-состояние

#### Scenario: Validation и backend errors
- **WHEN** введено 64 символа либо backend отвечает validation/generic/`401`/`403`
- **THEN** CMS не показывает ложный успех, сохраняет форму для исправления/retry и показывает понятную ошибку

#### Scenario: Недостаточный scope
- **WHEN** authenticated пользователь без horse write scope просматривает horse UI
- **THEN** create/edit скрыт или disabled, mutation guard не отправляет запрос, а backend denial остаётся независимой границей

#### Scenario: Consumer isolation
- **WHEN** reviewer проверяет change
- **THEN** изменения horse UI ограничены `services/frontend`, отсутствуют `site-*` imports/service key и `services/site-ad` не изменён
### Requirement: Scope-aware UX для действий с лошадьми и родословной
CMS SHALL связывать действия создания, изменения, удаления лошади и изменения родословной с явным registry `FeatureAction -> scopes`. В колонке «Действия» кнопки фотографий, родословной и услуг SHALL использовать единый компактный серый count badge по стилю существующего service indicator; каждая кнопка SHALL вызывать только собственный handler. Drawer с таблицей связанных услуг SHALL открываться при нажатии на кнопку. Модальное окно добавления/редактирования связи SHALL открываться при нажатии на кнопку «Добавить» или строку таблицы. Mutation UI MUST быть скрыт или disabled без требуемого scope, а pedigree и relation hooks MUST повторно проверять permission перед submit; UI-проверка MUST NOT считаться заменой backend-авторизации.

Create/edit modal SHALL гарантировать отображение имени выбранной масти, породы и владельца в селекторах, используя данные из DTO лошади (`selectedHorse.coat_color`, `selectedHorse.breed`, `selectedHorse.horse_owner`) для формирования options, даже если эти сущности не загружены на текущей странице соответствующих вкладок.
#### Scenario: Пользователь без scope видит read-only pedigree
- **WHEN** scopes пользователя не разрешают `UPDATE_HORSE_PEDIGREE`
- **THEN** pedigree mutation controls disabled, hook не отправляет mutation и показывает сообщение о недостатке прав

#### Scenario: Разрешённое изменение родословной
- **WHEN** пользователь имеет `SUPERUSER`, `ADMIN` или `DEVELOPER` scope и отправляет изменение родословной
- **THEN** hook выполняет Protected Write, после успеха обновляет открытую родословную и инвалидирует список лошадей

#### Scenario: Backend отклоняет mutation
- **WHEN** существующий backend возвращает `401` или `403` на horse, breed или pedigree mutation
- **THEN** CMS client/hook сохраняет отказ как ошибку сценария и не трактует скрытие кнопки как успешную авторизацию

#### Scenario: Кнопка управления услугами в таблице лошадей
- **WHEN** authenticated CMS-пользователь открывает вкладку «Лошади»
- **THEN** в колонке «Действия» отображается третья кнопка (иконка финансов) с badge количества привязанных услуг

#### Scenario: Единые indicators
- **WHEN** authenticated пользователь видит строку лошади
- **THEN** photo, pedigree и service actions показывают визуально одинаковые серые count badges без overlap

#### Scenario: Независимые actions
- **WHEN** пользователь нажимает любой из трёх action controls
- **THEN** выполняется только соответствующий handler и row click не срабатывает

#### Scenario: Drawer с таблицей связанных услуг
- **WHEN** пользователь нажимает на кнопку «Услуги» лошади
- **THEN** открывается Drawer справа на полэкрана с таблицей (колонки: «Наименование», «Цена») или NoData-заглушкой

#### Scenario: Модальное окно добавления связи
- **WHEN** пользователь нажимает «Добавить» в Drawer
- **THEN** открывается модальное окно с Select (доступные услуги), полями override (description, price, price_formatter) и кнопками «Добавить»/«Закрыть»

#### Scenario: Модальное окно редактирования связи
- **WHEN** пользователь нажимает на строку таблицы связанных услуг
- **THEN** открывается модальное окно с readonly Select (выбранная услуга), заполненными override-полями и кнопками «Изменить»/«Удалить»/«Закрыть»

#### Scenario: Управление услугами без horse write scope
- **WHEN** authenticated пользователь без horse write scope открывает Drawer
- **THEN** кнопка «Добавить» скрыта или disabled, строки таблицы не открывают модальное окно редактирования

#### Scenario: Управление услугами с horse write scope
- **WHEN** authenticated пользователь с horse write scope открывает Drawer
- **THEN** кнопка «Добавить» активна, клик по строке открывает модальное окно редактирования

#### Scenario: Изоляция consumer-контура для услуг лошади
- **WHEN** reviewer проверяет frontend diff для horse service relations UI
- **THEN** изменения ограничены `services/frontend`, отсутствуют импорты `site-*`/Public Read consumer modules и `services/site-ad` не изменён
#### Scenario: Отображение масти из DTO при редактировании
- **WHEN** пользователь открывает модальное окно редактирования лошади, у которой `coat_color` существует, но не загружен на текущей странице вкладки «Масти»
- **THEN** селектор масти SHALL отображать имя масти из `selectedHorse.coat_color.name`, а не UUID

#### Scenario: Отображение породы из DTO при редактировании
- **WHEN** пользователь открывает модальное окно редактирования лошади, у которой `breed` существует, но не загружен на текущей странице вкладки «Породы»
- **THEN** селектор породы SHALL отображать имя породы из `selectedHorse.breed.name`, а не UUID

#### Scenario: Отображение владельца из DTO при редактировании
- **WHEN** пользователь открывает модальное окно редактирования лошади, у которой `horse_owner` существует, но не загружен на текущей странице вкладки «Владельцы»
- **THEN** селектор владельца SHALL отображать имя владельца из `selectedHorse.horse_owner.name`, а не UUID
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
Horse UI SHALL сериализовать списки и pedigree candidates через `limit` и `offset`, MUST NOT отправлять page-based параметры, SHALL сбрасывать offset в `0` при изменении/очистке filter, search, sort, размера страницы или candidate search, SHALL исключать одновременное применение `breed_ids` и `kind` и SHALL использовать service multi-select с повторяемым query key `services`. Несколько услуг SHALL отображать OR-результат backend без frontend post-filtering.

#### Scenario: Пользователь меняет фильтр списка
- **WHEN** пользователь изменяет фильтр, включая breed IDs или horse kind
- **THEN** hook сбрасывает offset в `0`, а выбор breed IDs очищает kind

#### Scenario: Breed filter блокирует kind filter
- **WHEN** выбран хотя бы один breed ID
- **THEN** control фильтра kind становится disabled и запрос не содержит конфликтующий kind

#### Scenario: Пользователь листает pedigree candidates
- **WHEN** пользователь меняет страницу или поиск кандидатов родословной
- **THEN** API получает `limit` и вычисленный `offset`, поиск сбрасывает offset в `0`, а `page`, `pageSize` и `page_size` отсутствуют

#### Scenario: Выбор одной услуги
- **WHEN** пользователь выбирает одну услугу в фильтре таблицы
- **THEN** `HorseListQueryParams.services` содержит её UUID, API сериализует один key и offset равен 0

#### Scenario: Выбор нескольких услуг
- **WHEN** пользователь выбирает две услуги
- **THEN** API отправляет два `services` key, а UI показывает уникальный OR-result backend

#### Scenario: Очистка service filter
- **WHEN** пользователь очищает selector
- **THEN** `services` отсутствует в query и offset сбрасывается в 0

#### Scenario: Pagination с фильтром
- **WHEN** пользователь меняет страницу или page size при активном service filter
- **THEN** query сохраняет services, использует вычисленный limit/offset, а page size change сбрасывает offset

#### Scenario: Loading empty error
- **WHEN** filtered request pending, возвращает пусто либо ошибку
- **THEN** UI показывает соответствующее состояние и сохраняет выбранный filter для retry

#### Scenario: API denial в CMS
- **WHEN** CMS read получает `401` или `403`
- **THEN** auth/error flow обрабатывает отказ без live backend calls в unit/component tests

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
Frontend API и horse UI tests SHALL выполняться в jsdom с MSW server, SHALL считать любой необработанный сетевой запрос ошибкой и SHALL проверять repeated query serialization, filters, badges, modal inheritance, scopes, `401/403`, loading/empty/error и double submit без live backend.

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

### Requirement: Безопасная валидация modal пород и мастей
CMS horse UI SHALL отображать ошибки каждого поля пород и мастей только из массива соответствующего ключа, MUST NOT обращаться к `.join()` отсутствующего значения и SHALL сохранять введённое состояние после backend validation, generic, `401` или `403` error. Пустые `slug` и `description` SHALL передаваться в согласованной nullable/empty форме, которую backend нормализует, без клиентского требования заполнить эти поля.

#### Scenario: Пустая форма породы
- **WHEN** backend возвращает ошибку `name` после отправки пустой формы породы без ошибки `description`
- **THEN** modal отображает ошибку имени, не падает и продолжает показывать счётчик описания

#### Scenario: Пустая форма масти
- **WHEN** backend возвращает ошибку `name` после отправки пустой формы масти без ошибки `description`
- **THEN** modal отображает ошибку имени, не падает и продолжает показывать счётчик описания

#### Scenario: Ошибка описания
- **WHEN** backend возвращает массив ошибок `description` для породы или масти
- **THEN** modal объединяет и отображает только этот массив у поля описания

#### Scenario: Пустые slug и description
- **WHEN** разрешённый authenticated пользователь создаёт или изменяет породу либо масть, оставив slug и описание пустыми
- **THEN** CMS отправляет Protected Write один раз, не показывает клиентскую ошибку обязательности этих полей и после успеха обновляет список с backend-generated slug и nullable description

#### Scenario: Backend denial и состояние формы
- **WHEN** Protected Write возвращает validation error, generic error, `401` или `403`
- **THEN** modal не показывает ложный успех, сохраняет значения полей и отображает доступную ошибку для исправления либо повторной попытки

#### Scenario: Permission и double submit
- **WHEN** пользователь без требуемого scope пытается открыть/отправить mutation либо разрешённый пользователь дважды нажимает submit
- **THEN** action скрыт, disabled или guarded без scope, а при разрешённом действии отправляется не более одного запроса

#### Scenario: Изолированные frontend tests
- **WHEN** component/API-boundary tests проверяют modal и запросы пород и мастей
- **THEN** они используют jsdom и MSW/mocks для success, empty, validation, generic, `401` и `403`, а необработанный live network request завершает тест ошибкой

#### Scenario: Protected Admin route
- **WHEN** anonymous или authenticated пользователь открывает `/horses`
- **THEN** anonymous перенаправлен/заблокирован, а authenticated пользователь видит разрешённые tabs/actions согласно scopes

#### Scenario: Изоляция consumer-контура
- **WHEN** reviewer проверяет frontend diff
- **THEN** `services/site-ad` не изменён, CMS не импортирует `site-*`/Public Read consumer runtime и существующая `limit/offset` pagination не регрессирует

### Requirement: Единое расположение фильтров таблицы лошадей

CMS horse UI SHALL размещать фильтры в `filterDropdown` колонки таблицы, если для фильтра существует соответствующая колонка. Если подходящей колонки нет, фильтр SHALL размещаться как отдельный Select в блоке с пагинацией. Дублирование фильтра одновременно в блоке пагинации и в шапке колонки MUST NOT допускаться.

#### Scenario: Фильтр с колонкой размещён в шапке колонки
- **WHEN** для фильтра существует колонка в таблице (База, Порода, Масть, Пол, Владелец)
- **THEN** фильтр доступен только через `filterDropdown` в шапке этой колонки, а отдельный Select в блоке пагинации отсутствует

#### Scenario: Фильтр без колонки размещён в блоке пагинации
- **WHEN** для фильтра нет подходящей колонки в таблице (Услуги)
- **THEN** фильтр доступен как отдельный Select в блоке с пагинацией, а колонка в таблице отсутствует

#### Scenario: Дублирование фильтра запрещено
- **WHEN** reviewer проверяет frontend diff для horse filters
- **THEN** ни один фильтр не продублирован одновременно в блоке пагинации и в шапке колонки

#### Scenario: Фильтр «База» в шапке колонки
- **WHEN** authenticated CMS-пользователь открывает вкладку «Лошади»
- **THEN** колонка «База» содержит `filterDropdown` с ListFilter (опции: Все/Наши/Чужие), а отдельный Select «База» в блоке пагинации отсутствует

#### Scenario: Фильтр «Владельцы» в шапке колонки
- **WHEN** authenticated CMS-пользователь открывает вкладку «Лошади»
- **THEN** колонка «Владелец» содержит `filterDropdown` с multi-ListFilter (опции из `ownerFilterOptions`), а отдельный Select «Владельцы» в блоке пагинации отсутствует

#### Scenario: Фильтр «Услуги» в блоке пагинации
- **WHEN** authenticated CMS-пользователь открывает вкладку «Лошади»
- **THEN** в блоке с пагинацией присутствует Select для фильтрации по услугам, а колонка «Услуги» в таблице отсутствует

#### Scenario: Дубли «Породы», «Масти», «Пол» удалены
- **WHEN** authenticated CMS-пользователь открывает вкладку «Лошади»
- **THEN** отдельные Select для «Породы», «Масти» и «Пол» в блоке пагинации отсутствуют; фильтры доступны только через `filterDropdown` соответствующих колонок

#### Scenario: Сброс offset при изменении фильтра
- **WHEN** пользователь изменяет любой фильтр (в колонке или в блоке пагинации)
- **THEN** `offset` сбрасывается в `0`, а query serialization сохраняет выбранные значения

#### Scenario: Loading/empty/error для фильтрованных данных
- **WHEN** filtered request pending, возвращает пусто либо ошибку
- **THEN** UI показывает соответствующее состояние и сохраняет выбранные фильтры для retry

#### Scenario: Изоляция consumer-контура
- **WHEN** reviewer проверяет frontend diff для horse filters
- **THEN** изменения ограничены `services/frontend`, `services/site-ad` не изменён и CMS runtime не импортирует `site-*` Public Read consumer code

### Requirement: Frontend scope restrictions для horse services
CMS Frontend SHALL реализовать ограничение прав для horse services аналогично паттерну `price_groups`. Пользователи с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) НЕ должны иметь возможности создавать и удалять услуги, а также изменять наименование услуги. Однако они МОГУТ изменять описание, URL и цену услуги. Пользователи с `DEVELOPER` или `SUPERUSER` scope получают полный доступ.

#### Scenario: Скрытие кнопки создания услуги для ADMIN
- **WHEN** пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) открывает страницу horse services
- **THEN** кнопка «Создать услугу» скрыта или disabled

#### Scenario: Скрытие кнопки удаления услуги для ADMIN
- **WHEN** пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) открывает страницу horse services
- **THEN** кнопки удаления услуг скрыты или disabled

#### Scenario: Блокировка изменения наименования услуги для ADMIN
- **WHEN** пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) открывает форму редактирования услуги
- **THEN** поле «Наименование» заблокировано для редактирования (readonly или disabled)

#### Scenario: Доступность кнопки создания услуги для DEVELOPER
- **WHEN** пользователь с `DEVELOPER` scope открывает страницу horse services
- **THEN** кнопка «Создать услугу» доступна для нажатия

#### Scenario: Доступность кнопки удаления услуги для DEVELOPER
- **WHEN** пользователь с `DEVELOPER` scope открывает страницу horse services
- **THEN** кнопки удаления услуг доступны для нажатия

#### Scenario: Доступность изменения наименования услуги для DEVELOPER
- **WHEN** пользователь с `DEVELOPER` scope открывает форму редактирования услуги
- **THEN** поле «Наименование» доступно для редактирования

#### Scenario: Доступность всех действий для SUPERUSER
- **WHEN** пользователь с `SUPERUSER` scope открывает страницу horse services
- **THEN** все кнопки и поля доступны для взаимодействия

### Requirement: Horse service scopes registry
CMS Frontend SHALL реализовать `horseServicePageScopesRegistry` аналогично `pricePageScopesRegistry`. Регистр SHALL определять доступные действия для каждого scope: `DEVELOPER` и `SUPERUSER` получают полный доступ, `ADMIN` — только чтение.

#### Scenario: Определение прав для CREATE_HORSE_SERVICE
- **WHEN** система проверяет доступность действия `CREATE_HORSE_SERVICE`
- **THEN** действие доступно только для `DEVELOPER` и `SUPERUSER`

#### Scenario: Определение прав для UPDATE_HORSE_SERVICE_NAME
- **WHEN** система проверяет доступность действия `UPDATE_HORSE_SERVICE_NAME`
- **THEN** действие доступно только для `DEVELOPER` и `SUPERUSER`

#### Scenario: Определение прав для DELETE_HORSE_SERVICE
- **WHEN** система проверяет доступность действия `DELETE_HORSE_SERVICE`
- **THEN** действие доступно только для `DEVELOPER` и `SUPERUSER`

#### Scenario: Определение прав для RETRIEVE_HORSE_SERVICE
- **WHEN** система проверяет доступность действия `RETRIEVE_HORSE_SERVICE`
- **THEN** действие доступно для `ADMIN`, `DEVELOPER` и `SUPERUSER`

### Requirement: Horse page scopes
CMS Frontend SHALL использовать `useHorsePageActionScopes` hook для проверки прав доступа на странице лошадей. Hook SHALL включать проверку прав для horse services: `CREATE_HORSE_SERVICE`, `UPDATE_HORSE_SERVICE`, `DELETE_HORSE_SERVICE`, `RETRIEVE_HORSE_SERVICE`.

#### Scenario: Проверка прав для создания услуги
- **WHEN** компонент вызывает `hasPermission(HORSES_PAGE_SCOPES_ACTIONS.CREATE_HORSE_SERVICE)`
- **THEN** возвращает `true` для `DEVELOPER` и `SUPERUSER`, `false` для `ADMIN`

#### Scenario: Проверка прав для обновления услуги
- **WHEN** компонент вызывает `hasPermission(HORSES_PAGE_SCOPES_ACTIONS.UPDATE_HORSE_SERVICE)`
- **THEN** возвращает `true` для `DEVELOPER` и `SUPERUSER`, `false` для `ADMIN`

#### Scenario: Проверка прав для удаления услуги
- **WHEN** компонент вызывает `hasPermission(HORSES_PAGE_SCOPES_ACTIONS.DELETE_HORSE_SERVICE)`
- **THEN** возвращает `true` для `DEVELOPER` и `SUPERUSER`, `false` для `ADMIN`

#### Scenario: Проверка прав для чтения услуги
- **WHEN** компонент вызывает `hasPermission(HORSES_PAGE_SCOPES_ACTIONS.RETRIEVE_HORSE_SERVICE)`
- **THEN** возвращает `true` для `ADMIN`, `DEVELOPER` и `SUPERUSER`

#### Scenario: Доступность изменения описания, URL и цены для ADMIN
- **WHEN** пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) открывает форму редактирования услуги
- **THEN** поля «Описание», «Путь в URL» и «Цена» доступны для редактирования, а кнопка «Изменить» доступна
