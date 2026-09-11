## MODIFIED Requirements

### Requirement: Серверная главная страница
Маршрут `/` SHALL выводить в порядке scheme.md hero с CTA и доступной локальной фотографией, четыре карточки услуг, преимущества, последнюю опубликованную новость и контакты. Hero, подписи, CTA, порядок и SEO SHALL задаваться consumer config либо профильными API и MUST NOT зависеть от удалённых action 1 site settings. Управляемыми site settings на странице остаются только actions 2/4/6. Бизнес-сущности MUST поступать из профильных Public Read API. Все индексируемые блоки MUST содержаться в завершённом серверном HTML без browser fetch.

#### Scenario: Полная главная без JavaScript
- **WHEN** crawler запрашивает `/` при доступных API и разрешённых settings
- **THEN** серверный HTML содержит все перечисленные блоки, одну новость, четыре service cards, фотографию hero, ровно один h1 и SEO metadata

#### Scenario: Удалённые настройки не возвращают управление
- **WHEN** API отсутствует либо неожиданно отдаёт прежние `seo.*`, `home.*` action 1 или `header.*` ключи
- **THEN** страница использует утверждённый consumer config и игнорирует запрещённые ключи

### Requirement: Серверная страница О клубе
`/about` SHALL выводить не более двух последовательных текстовых блоков из строк `about_1_title/about_1_text` и `about_2_title/about_2_text`, после них — переиспользуемые с главной контакты и CTA. Первый блок SHALL отображаться только при непустых title и text; второй блок SHALL отображаться только при непустых title и text второй пары. Старые `about.*`, gallery, `team.people`, `reviews.summary`, блоки оплаты и обработки персональных данных MUST NOT использоваться или отображаться.

#### Scenario: Отображаются два полных блока
- **WHEN** обе пары about title/text заполнены
- **THEN** SSR HTML содержит два блока в порядке 1 → 2, ровно один h1 и общие контакты

#### Scenario: Неполный второй блок скрывается
- **WHEN** заполнено только одно из значений `about_2_title/about_2_text`
- **THEN** второй блок целиком отсутствует, а первый блок и контакты сохраняются

#### Scenario: Legacy about игнорируется
- **WHEN** API неожиданно возвращает `about.intro`, `about.setting`, `about.features`, `about.gallery_photo_ids`, `team.people` или `reviews.summary`
- **THEN** эти значения не появляются на странице и не инициируют загрузку галереи

### Requirement: Общий блок контактов
Главная и `/about` MUST переиспользовать один ContactSection на основе отдельных `contacts.address`, `contacts.coordinates`, `contacts.maps_url`, `contacts.nearest_stop`, `contacts.working_hours`, `contacts.primary_phone` и доступных social keys. `contacts.address_alternative` MUST игнорироваться как удалённый дубликат без alias/fallback. Все ссылки MUST иметь `target="_blank"` и `rel="noopener noreferrer"`. Карта MUST формировать iframe widget URL из coordinates; maps URL остаётся отдельной ссылкой. Отсутствующие поля MUST скрываться независимо и не выдумываться.

#### Scenario: Контакты и карта на обеих страницах
- **WHEN** разрешённые contact keys и coordinates заполнены
- **THEN** обе страницы содержат одинаковый primary phone и доступные адресные/social строки, рабочий iframe widget и безопасные ссылки

#### Scenario: Отдельное поле отсутствует
- **WHEN** отсутствует nearest stop либо working hours или API неожиданно возвращает legacy `contacts.address_alternative`
- **THEN** скрывается только соответствующий элемент без пустого placeholder и без влияния на остальные контакты
