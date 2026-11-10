## MODIFIED Requirements

### Requirement: Защищённый CMS-контур управления лошадьми
CMS SHALL предоставлять защищённое управление лошадьми с корректными сессией, scopes и nullable pedigree_name без consumer mixing по сценарию «Полный контракт защищённого horse UI».

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

#### Scenario: Полный контракт защищённого horse UI
- **WHEN** проверяется доступ к horse UI, его данные и граница CMS-клиента
- **THEN** CMS SHALL предоставлять маршрут `/horses` только в authenticated admin-контексте, SHALL получать пользователя и scopes через `UserContext` и SHALL перенаправлять на `/login`, если загрузка пользовательской сессии завершилась ошибкой. Вкладка «Лошади» SHALL отображать raw nullable `pedigree_name` отдельной колонкой «Кличка в родословной», причём `null` MUST отображаться как явное пустое состояние без fallback к `name`. Create/edit modal SHALL предоставлять одноимённое строковое поле длиной не более 63 символов, сохраняющее допустимые значения и позволяющее очистить существующее значение. Типы, validators, hooks и документация MUST удалить horse `code`. CMS client MUST NOT добавлять consumer service key и MUST NOT импортировать или смешивать runtime `site-*`.

### Requirement: Scope-aware UX для действий с лошадьми и родословной
CMS SHALL обеспечивать scope-aware действия лошадей, родословной и связанных услуг, независимые handlers и DTO-backed селекторы по сценарию «Полный контракт действий и селекторов».

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

#### Scenario: Полный контракт действий и селекторов
- **WHEN** пользователь работает с действиями лошади, родословной, услугами или create/edit modal
- **THEN** CMS SHALL связывать действия создания, изменения, удаления лошади и изменения родословной с явным registry `FeatureAction -> scopes`. В колонке «Действия» кнопки фотографий, родословной и услуг SHALL использовать единый компактный серый count badge по стилю существующего service indicator; каждая кнопка SHALL вызывать только собственный handler. Drawer с таблицей связанных услуг SHALL открываться при нажатии на кнопку. Модальное окно добавления/редактирования связи SHALL открываться при нажатии на кнопку «Добавить» или строку таблицы. Mutation UI MUST быть скрыт или disabled без требуемого scope, а pedigree и relation hooks MUST повторно проверять permission перед submit; UI-проверка MUST NOT считаться заменой backend-авторизации.

- **AND** Create/edit modal SHALL гарантировать отображение имени выбранной масти, породы и владельца в селекторах, используя данные из DTO лошади (`selectedHorse.coat_color`, `selectedHorse.breed`, `selectedHorse.horse_owner`) для формирования options, даже если эти сущности не загружены на текущей странице соответствующих вкладок.

### Requirement: Поле slug в CMS-форме лошади
CMS SHALL поддерживать редактируемый slug в create/edit modal с backend-автогенерацией, приоритетом ручного изменения в текущей сессии и сохранением guards и ошибок по сценарию «Полные правила поля slug».

#### Scenario: Создание с ручным slug
- **WHEN** authenticated пользователь со scope вводит кличку и ручной slug и нажимает «Добавить»
- **THEN** CMS отправляет typed create payload с `slug` один раз и после успеха обновляет таблицу

#### Scenario: Создание с автогенерацией
- **WHEN** пользователь оставляет поле slug пустым
- **THEN** CMS отправляет пустое/null значение согласно DTO-контракту, а отображаемый после refresh slug берётся из backend response

#### Scenario: Edit prefill без изменения клички
- **WHEN** пользователь открывает существующую лошадь и не меняет её кличку или slug
- **THEN** поле содержит текущий slug, а сохранение не запрашивает его непреднамеренную регенерацию

#### Scenario: Изменение клички обновляет автоматический slug
- **WHEN** пользователь меняет кличку существующей лошади до любого ручного изменения slug в текущей сессии modal
- **THEN** CMS очищает slug field и отправляет `slug=""`, backend регенерирует slug из итоговой клички, а после success refresh UI показывает сохранённое значение

#### Scenario: Ручной slug после изменения клички
- **WHEN** пользователь сначала меняет кличку, а затем вводит непустой slug
- **THEN** CMS отправляет введённый ручной slug и не заменяет его автоматическим значением

#### Scenario: Ручной slug до изменения клички
- **WHEN** пользователь вручную меняет slug, а затем меняет кличку в той же сессии modal
- **THEN** CMS сохраняет ручной slug без очистки и отправляет его вместе с итоговым `name`

#### Scenario: Явная очистка slug имеет ручной приоритет
- **WHEN** пользователь вручную очищает slug и затем меняет кличку
- **THEN** CMS оставляет slug пустым и PATCH запрашивает backend-регенерацию из итогового имени

#### Scenario: Повторное открытие сбрасывает session state
- **WHEN** modal закрывают и открывают для той же или другой лошади
- **THEN** CMS заново заполняет поля данными выбранной записи и сбрасывает признак ручного изменения slug

#### Scenario: Backend field error
- **WHEN** backend отклоняет занятый или невалидный ручной slug
- **THEN** modal остаётся открытой, остальные значения сохраняются и ошибка показывается рядом с полем slug

#### Scenario: Scope missing
- **WHEN** authenticated пользователь не имеет требуемого horse write scope
- **THEN** create/update action скрыта или disabled, modal/mutation guard не позволяет отправить slug mutation, а backend `403` отображается существующим error flow

#### Scenario: Double submit
- **WHEN** пользователь повторно нажимает submit во время pending slug mutation
- **THEN** CMS отправляет ровно один запрос и сохраняет disabled/loading state до завершения

#### Scenario: Anonymous route
- **WHEN** anonymous пользователь открывает CMS route `/horses`
- **THEN** CMS блокирует доступ или перенаправляет на `/login`, не показывая mutation modal

#### Scenario: Responsive modal
- **WHEN** modal со slug field открыта на desktop, tablet и mobile viewport
- **THEN** label, input, field error и footer не перекрываются, а содержимое остаётся прокручиваемым и доступным

#### Scenario: Без смешения с site consumer
- **WHEN** реализована синхронизация клички и slug в CMS
- **THEN** frontend не импортирует `site-*`/Public Read consumer code и не выполняет live backend calls в unit/component tests

#### Scenario: Полные правила поля slug
- **WHEN** пользователь создаёт или редактирует лошадь и её slug
- **THEN** CMS SHALL показывать редактируемое поле «Путь URL (генерируется автоматически)» в create/edit modal лошади, заполнять его текущим значением при редактировании и передавать `slug` через типизированные `HorseCreateInDto`/`HorseUpdateInDto`. Пустое поле SHALL запрашивать backend-автогенерацию. При изменении клички в edit modal CMS MUST очистить не изменённый вручную в текущей сессии slug, чтобы PATCH запросил backend-регенерацию из итогового `name`. Любое ручное изменение slug в текущей сессии, включая явную очистку, MUST иметь приоритет над последующими изменениями клички. UI MUST сохранять текущие scope/mutation guards, показывать `validationErrors.slug` у поля и сохранять состояние modal при ошибке.
