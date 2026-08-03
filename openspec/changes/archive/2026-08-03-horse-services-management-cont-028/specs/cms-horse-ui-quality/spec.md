## MODIFIED Requirements

### Requirement: Scope-aware UX для действий с лошадьми и родословной
CMS SHALL связывать horse mutation actions с registry `FeatureAction -> scopes`. В колонке «Действия» кнопки фотографий, родословной и услуг SHALL использовать единый компактный серый count badge по стилю существующего service indicator; каждая кнопка SHALL вызывать только собственный handler. Relation mutations MUST быть hidden/disabled и guarded без horse write scope, а backend authorization MUST оставаться источником истины.

#### Scenario: Пользователь без scope видит read-only pedigree
- **WHEN** scopes пользователя не разрешают `UPDATE_HORSE_PEDIGREE`
- **THEN** pedigree mutation controls disabled, hook не отправляет mutation и показывает сообщение о недостатке прав

#### Scenario: Разрешённое изменение родословной
- **WHEN** пользователь имеет `SUPERUSER`, `ADMIN` или `DEVELOPER` scope и отправляет изменение родословной
- **THEN** hook выполняет Protected Write, после успеха обновляет открытую родословную и инвалидирует список лошадей

#### Scenario: Единые indicators
- **WHEN** authenticated пользователь видит строку лошади
- **THEN** photo, pedigree и service actions показывают визуально одинаковые серые count badges без overlap

#### Scenario: Независимые actions
- **WHEN** пользователь нажимает любой из трёх action controls
- **THEN** выполняется только соответствующий handler и row click не срабатывает

#### Scenario: Пользователь без scope
- **WHEN** authenticated user не имеет horse write scope
- **THEN** relation mutation controls hidden/disabled, guard не отправляет write, но read/filter UI доступен

#### Scenario: Backend отклоняет mutation
- **WHEN** backend возвращает `401` или `403`
- **THEN** CMS показывает ошибку и не считает UI guard заменой backend authorization

#### Scenario: Drawer с таблицей связанных услуг
- **WHEN** пользователь нажимает service action лошади
- **THEN** открывается Drawer справа с таблицей «Наименование»/«Цена» или NoData state

#### Scenario: Модальное окно добавления связи
- **WHEN** разрешённый пользователь нажимает «Добавить» в Drawer
- **THEN** открывается create-modal с Select и override-полями

#### Scenario: Модальное окно редактирования связи
- **WHEN** разрешённый пользователь нажимает строку relation table
- **THEN** открывается edit-modal с readonly service и действиями изменить/удалить/закрыть

#### Scenario: Изоляция consumer-контура
- **WHEN** reviewer проверяет diff
- **THEN** `services/site-ad` и Public Read consumer modules не изменены и не импортированы CMS feature

### Requirement: Непротиворечивые фильтры и offset pagination
Horse UI SHALL сериализовать pagination через `limit`/`offset`, SHALL сбрасывать `offset=0` при изменении/очистке filters, search, sort или page size и SHALL использовать service multi-select с повторяемым query key `services`. Несколько услуг SHALL отображать OR-результат backend без frontend post-filtering.

#### Scenario: Пользователь меняет существующий фильтр списка
- **WHEN** пользователь изменяет filter, включая breed IDs или horse kind
- **THEN** hook сбрасывает offset в 0, а выбор breed IDs очищает kind

#### Scenario: Breed filter блокирует kind filter
- **WHEN** выбран хотя бы один breed ID
- **THEN** control kind становится disabled и query не содержит конфликтующий kind

#### Scenario: Пользователь листает pedigree candidates
- **WHEN** пользователь меняет страницу или search кандидатов
- **THEN** API получает limit/offset, search сбрасывает offset в 0, а page-based параметры отсутствуют

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

### Requirement: Изолированная frontend test boundary
Frontend API и horse UI tests SHALL выполняться в jsdom с MSW, MUST считать необработанный network request ошибкой и SHALL покрывать repeated query serialization, filters, badges, modal inheritance, scopes, `401/403`, loading/empty/error и double submit без live backend.

#### Scenario: Обработанный API flow
- **WHEN** test вызывает horse/filter/relation API с зарегистрированным MSW handler
- **THEN** handler формирует ответ и test проверяет URL/body/status behavior

#### Scenario: Необработанная сеть
- **WHEN** test пытается обратиться к live backend
- **THEN** `onUnhandledRequest: "error"` завершает test ошибкой
