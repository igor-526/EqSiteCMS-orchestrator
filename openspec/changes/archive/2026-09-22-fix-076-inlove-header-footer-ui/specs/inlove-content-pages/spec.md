## MODIFIED Requirements

### Requirement: Общий блок контактов
Главная и `/about` MUST переиспользовать один ContactSection на основе отдельных `contacts.address`, `contacts.coordinates`, `contacts.maps_url`, `contacts.nearest_stop`, `contacts.working_hours`, `contacts.primary_phone` и доступных social keys. `contacts.address_alternative` MUST игнорироваться как удалённый дубликат без alias/fallback. Все ссылки MUST иметь `target="_blank"` и `rel="noopener noreferrer"`. Карта MUST формировать iframe widget URL из coordinates; maps URL остаётся отдельной ссылкой. Карта MUST иметь заметный отступ сверху от предшествующего контента блока контактов (адрес/телефон/социальные ссылки), чтобы не примыкать к нему вплотную. Отсутствующие поля MUST скрываться независимо и не выдумываться.

#### Scenario: Контакты и карта на обеих страницах
- **WHEN** разрешённые contact keys и coordinates заполнены
- **THEN** обе страницы содержат одинаковый primary phone и доступные адресные/social строки, рабочий iframe widget и безопасные ссылки

#### Scenario: Отдельное поле отсутствует
- **WHEN** отсутствует nearest stop либо working hours или API неожиданно возвращает legacy `contacts.address_alternative`
- **THEN** скрывается только соответствующий элемент без пустого placeholder и без влияния на остальные контакты

#### Scenario: Карта не прилипает к блоку контактов
- **WHEN** блок контактов главной страницы отображается с заполненными coordinates
- **THEN** между текстовым контентом контактов и картой виден отступ, карта не примыкает вплотную к блоку над ней
