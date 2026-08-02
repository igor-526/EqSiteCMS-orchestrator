## MODIFIED Requirements

### Requirement: Защищённый CMS-контур управления лошадьми
CMS SHALL размещать horse management только под protected layout, SHALL блокировать/перенаправлять anonymous пользователя и SHALL показывать данные разрешённому authenticated пользователю. Вкладка «Лошади» SHALL отображать nullable `code` отдельной колонкой «Код», а create/edit modal SHALL предоставлять строковое поле «Код» длиной не более 31 символа, сохраняющее допустимые значения без trim и позволяющее очистить существующий code. `services/frontend` MUST NOT импортировать или смешивать `site-*` consumer code.

#### Scenario: Авторизованный просмотр таблицы
- **WHEN** authenticated CMS пользователь открывает `/horses` и вкладку «Лошади»
- **THEN** таблица отображает колонку «Код» со строкой либо устойчивым пустым представлением для `null`, не нарушая loading/empty/error/pagination состояния

#### Scenario: Anonymous доступ к CMS
- **WHEN** anonymous пользователь открывает `/horses`
- **THEN** protected layout блокирует либо перенаправляет его до рендера horse table и code

#### Scenario: Создание и изменение кода
- **WHEN** пользователь с horse write scope открывает create/edit modal, вводит до 31 символа и сохраняет
- **THEN** CMS передаёт code в соответствующем POST/PATCH, защищает от double submit и после успеха обновляет таблицу точным значением

#### Scenario: Очистка кода
- **WHEN** пользователь очищает существующий code в edit modal и сохраняет
- **THEN** CMS передаёт согласованный `null`, а после invalidation таблица показывает пустое значение

#### Scenario: Ошибка длины и backend denial
- **WHEN** введено более 31 символа либо backend отвечает validation/generic/`401`/`403`
- **THEN** CMS не показывает ложный успех, сохраняет modal/form state для исправления или retry и отображает понятное error состояние

#### Scenario: Недостаточный scope
- **WHEN** authenticated пользователь без horse write scope просматривает таблицу
- **THEN** create/edit action скрыт или disabled, mutation guard не отправляет запрос, а backend authorization остаётся обязательной независимой границей

#### Scenario: Изоляция consumer-контура
- **WHEN** reviewer проверяет frontend diff для horse code
- **THEN** изменения ограничены `services/frontend`, отсутствуют импорты `site-*`/Public Read consumer modules и `services/site-ad` не изменён
