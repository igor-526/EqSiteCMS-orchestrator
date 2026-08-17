## MODIFIED Requirements

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
