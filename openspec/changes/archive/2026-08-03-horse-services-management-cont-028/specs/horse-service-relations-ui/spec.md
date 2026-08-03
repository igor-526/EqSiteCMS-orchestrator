## MODIFIED Requirements

### Requirement: Модальное окно добавления связи
При нажатии «Добавить» CMS SHALL открыть modal с Select доступных услуг и controlled override-полями. При выборе услуги CMS SHALL скопировать её `description`, `price` и `price_formatter` в видимые значения формы и SHALL отправить их как реальные `description_override`, `price_override`, `price_formatter_override`, если пользователь не изменил или не очистил их.

#### Scenario: Открытие модального окна создания
- **WHEN** пользователь нажимает «Добавить» в Drawer
- **THEN** открывается modal с Select и пустыми override-полями до выбора услуги

#### Scenario: Выбор услуги заполняет форму
- **WHEN** пользователь выбирает услугу с description, price и formatter
- **THEN** все три controlled fields показывают её значения, а submit body содержит их как overrides

#### Scenario: Смена выбранной услуги
- **WHEN** пользователь после первой услуги выбирает другую
- **THEN** все inherited fields заменяются defaults второй услуги без смешения значений

#### Scenario: Пользователь изменяет inherited values
- **WHEN** пользователь редактирует автоматически заполненные поля и сохраняет
- **THEN** CMS отправляет изменённые overrides одним Protected Write и после успеха обновляет Drawer и badge

#### Scenario: Пользователь очищает nullable values
- **WHEN** пользователь явно очищает разрешённые override-поля
- **THEN** CMS сериализует согласованные `null`, сохраняет form state при ошибке и после успеха показывает fallback значения по backend contract

#### Scenario: Услуга не выбрана
- **WHEN** пользователь пытается создать связь без service ID
- **THEN** submit блокируется и отображается ошибка выбора услуги

#### Scenario: Backend denial
- **WHEN** Protected Write возвращает `401`, `403`, validation или generic error
- **THEN** modal остаётся открытым, хранит значения и не показывает ложный успех

#### Scenario: Double submit
- **WHEN** пользователь повторно нажимает submit во время pending mutation
- **THEN** CMS отправляет ровно один запрос
