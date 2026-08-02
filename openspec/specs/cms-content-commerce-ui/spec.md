# CMS Content and Commerce UI

## Purpose
Зафиксировать подтверждённые требования к защищённому CMS-интерфейсу управления контентом и коммерческими сущностями.

## Requirements

### Requirement: Защищённая граница CMS-интерфейса
CMS content/commerce UI SHALL работать внутри authenticated admin-контура и SHALL обращаться к API только через существующие frontend API и feature-service boundaries. UI MUST NOT импортировать или выполнять runtime-сценарии публичного `site-*` consumer-контура, а скрытие или отключение действия MUST рассматриваться только как UX и не как замена backend-авторизации.

#### Scenario: Анонимный пользователь открывает CMS-маршрут
- **WHEN** пользователь без действующей CMS-сессии открывает защищённый маршрут контента или услуг
- **THEN** layout auth guard блокирует экран или перенаправляет пользователя на `/login`

#### Scenario: Backend отклоняет CMS-запрос
- **WHEN** API boundary получает `401` или `403` при CMS read либо mutation
- **THEN** клиентский auth/error flow обрабатывает отказ и UI не сообщает об успешной операции

#### Scenario: Проверка отсутствия consumer mixing
- **WHEN** проверяется реализация capability в `services/frontend`
- **THEN** она не зависит от runtime-кода `site-*` и не использует CMS UI как источник публичного чтения

### Requirement: Управление ценами и группами цен
CMS SHALL показывать списки цен и групп цен с фильтрами `limit/offset`, SHALL позволять разрешённому пользователю создавать, изменять и удалять записи и SHALL поддерживать сохранение порядка услуг внутри группы отдельной Protected Write операцией. Доступность действий и полей SHALL вычисляться через `PRICE_PAGE_SCOPES_ACTIONS` и `pricePageScopesRegistry` для текущих scopes пользователя.

#### Scenario: Загрузка списка цен
- **WHEN** CMS загружает цены или группы цен
- **THEN** feature hook передаёт API boundary фильтр с `limit` и `offset`, отображает данные и total либо показывает состояние ошибки

#### Scenario: Сохранение порядка услуг
- **WHEN** пользователь со scope `PRICE_GROUP_REORDER` подтверждает новый порядок услуг группы
- **THEN** UI отправляет changes через endpoint `/prices/groups/{id}/reorder`, показывает результат и после успеха обновляет список цен

#### Scenario: Действие без scope
- **WHEN** у authenticated пользователя отсутствует требуемый price action scope
- **THEN** соответствующая кнопка скрыта либо поле/действие отключено, при этом backend остаётся источником авторизации Protected Write

### Requirement: Единый редактор цены и дублирование
CMS SHALL использовать единый `PriceEditModal` для режимов `create`, `update` и `duplicate`. Режим duplicate SHALL предзаполнять данные выбранной цены и SHALL создавать новую запись через create-flow, не изменяя исходную; доступность create/update/delete и редактируемых полей SHALL учитывать scopes.

#### Scenario: Дублирование цены
- **WHEN** пользователь выбирает действие дублирования в таблице
- **THEN** открывается режим `duplicate`, форма получает шаблон выбранной цены, а submit вызывает create callback вместо update callback

#### Scenario: Несохранённые изменения
- **WHEN** пользователь пытается закрыть изменённую форму цены
- **THEN** UI требует подтверждение закрытия без сохранения

#### Scenario: Валидация и защищённая запись
- **WHEN** пользователь отправляет create или update форму
- **THEN** UI блокирует невалидные данные, применяет соответствующий scope guard и показывает backend error вместо ложного успеха

### Requirement: Общий редактор HTML-контента
CMS SHALL предоставлять общий page editor для пород, мастей, услуг лошади и цен через feature hook и entity-specific service adapters. Контент SHALL загружаться только при открытом редакторе с выбранной сущностью, а UI SHALL явно отражать loading, saving и error состояния.

#### Scenario: Открытие редактора
- **WHEN** редактор открывается для поддерживаемой сущности
- **THEN** adapter запрашивает detail с `page_data=true`, а hook показывает loading и заполняет редактор полученным HTML либо пустой строкой

#### Scenario: Сохранение HTML
- **WHEN** пользователь сохраняет HTML для выбранной сущности
- **THEN** adapter выполняет соответствующий Protected Write update, UI показывает saving и закрывает либо обновляет сценарий только после успешного ответа

#### Scenario: Ошибка загрузки или сохранения
- **WHEN** adapter возвращает error либо выбрасывает исключение
- **THEN** редактор сохраняет явное error state и показывает пользователю уведомление об ошибке

### Requirement: Управление новостями в CMS
CMS SHALL получать полный административный список новостей через защищённую read-границу, SHALL отображать состояния загрузки, данных и ошибки и SHALL предоставлять create, update, soft-delete, photos и content-editor flows через feature service. Документационные вкладки SHALL быть видимы согласно `newsPageScopesRegistry`.

#### Scenario: Загрузка административного списка
- **WHEN** authenticated CMS user открывает раздел новостей
- **THEN** UI вызывает CMS list boundary, отображает items и total при успехе либо уведомление при ошибке

#### Scenario: Защищённый GET новостей
- **WHEN** `/api/news-cms` вызывается без auth, с разрешённым admin scope или с authenticated пользователем без требуемого scope
- **THEN** внешняя backend-граница возвращает соответственно `401`, `200` или `403`, а CMS UI не обходит этот контракт

#### Scenario: Редактирование контента новости
- **WHEN** page editor открывается для новости, уже загруженной CMS-списком
- **THEN** editor получает `content` выбранной `NewsOutDto` без публичного detail endpoint и сохраняет изменение через news update boundary

#### Scenario: Scope документационной вкладки
- **WHEN** пользователь открывает news tabs
- **THEN** admin и developer documentation tabs добавляются только при наличии scopes, указанных в `newsPageScopesRegistry`

#### Scenario: Gap пагинации новостей G-FE1-NEWS-PAGINATION
- **WHEN** проверяется текущий query contract CMS-списка новостей
- **THEN** backfill фиксирует фактический legacy `page/limit` и MUST NOT утверждать завершённую миграцию новостей на `limit/offset` без отдельного runtime change и тестов

#### Scenario: Gap mutation scopes новостей G-FE1-NEWS-MUTATION-SCOPES
- **WHEN** проверяется scope registry действий новостей
- **THEN** backfill MUST NOT утверждать отдельные UI guards для create/update/delete/photos, пока они не подтверждены action registry и тестами scope present/missing

### Requirement: Общий выбор фотографий
CMS SHALL предоставлять общий photo selector, который загружает доступные фотографии порциями `limit/offset`, исключает уже выбранные и дубликаты и синхронизирует список при добавлении или удалении выбранных фотографий. Сохранение фотографий сущности SHALL выполняться через её Protected Write feature flow.

#### Scenario: Первичная загрузка фотографий
- **WHEN** selector загружает доступные фотографии
- **THEN** он использует `limit=25` и `offset=0`, исключает уже выбранные ID и показывает loading либо API error

#### Scenario: Дозагрузка фотографий
- **WHEN** пользователь запрашивает следующую порцию и ещё есть доступные элементы
- **THEN** selector увеличивает `offset` на размер порции, не запускает параллельную загрузку и не добавляет дубликаты

#### Scenario: Изменение выбранных фотографий
- **WHEN** фотография добавляется в selection или удаляется из него
- **THEN** доступный список немедленно исключает выбранную фотографию либо возвращает снятую фотографию без дублирования

#### Scenario: Ограничение главной фотографии лошади
- **WHEN** selector используется для фотографий лошади
- **THEN** UI не предлагает неподдерживаемое действие назначения main photo, сохраняя только подтверждённый DTO-контракт

### Requirement: Evidence и изолированное frontend-тестирование
Контракт capability MUST трассироваться к задачам 004, 006, 007, 013 и 020 и SHALL проверяться существующими component/unit/API-boundary tests. API-boundary tests SHALL использовать MSW и MUST блокировать необработанные обращения к live backend.

#### Scenario: Проверка цен
- **WHEN** запускаются связанные тесты `PriceEditModal`, `PricesTable` и `usePricesPageActions`
- **THEN** они подтверждают режимы create/update/duplicate, dirty guard, loading/empty, callbacks и применимые scope present/missing cases

#### Scenario: Проверка API boundary
- **WHEN** frontend-тест имитирует success, `401` или `403`
- **THEN** MSW возвращает детерминированный ответ без live backend, а необработанный network request завершает тест ошибкой

#### Scenario: Трассировка исторических задач
- **WHEN** capability проходит review
- **THEN** reviewer сопоставляет price ordering с 004, page editor с 006, news с 007, photo selector с 013 и unified price editor с 020 по коду, тестам и утверждённым reports
