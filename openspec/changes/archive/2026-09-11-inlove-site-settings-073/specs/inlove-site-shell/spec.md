## MODIFIED Requirements

### Requirement: Shared layout получает настройки один раз и предоставляет fallback
Общий layout SHALL на сервере получать одним запросом только разрешённые настройки footer, контактов и соцсетей через существующий anonymous Public Read `GET /api/site_settings` с tenant selector. Меню, brand, CTA и SEO defaults SHALL задаваться типизированным consumer config, а не строками site settings. `contacts.primary_phone` MUST быть единственным источником телефона для header, footer и контактов; `header.contact_phone` и `contacts.phones` MUST NOT читаться как alias/fallback. Ошибка или некорректное значение отдельного разрешённого ключа MUST использовать безопасный fallback и MUST NOT скрывать навигацию либо остальную страницу.

#### Scenario: Shared settings доступны при SSR
- **WHEN** валидный tenant selector и API возвращают разрешённые shared settings
- **THEN** header, footer и контакты получают одинаковый `contacts.primary_phone` без client-only fetch и без CMS credentials, а статические menu/brand/CTA не зависят от удалённых keys

#### Scenario: Ошибка settings деградирует локально
- **WHEN** API недоступен либо отдельный setting отсутствует или имеет неверный тип
- **THEN** layout рендерит статическое разрешённое меню и обязательные подписи, а пустые optional phone/social/hours блоки скрываются

#### Scenario: Legacy телефон не используется
- **WHEN** API неожиданно возвращает `header.contact_phone` или `contacts.phones`, но `contacts.primary_phone` отсутствует
- **THEN** телефон отсутствует одновременно в header, footer и контактах, а legacy значения игнорируются

### Requirement: Header предоставляет разрешённую desktop и mobile навигацию
`SiteHeader` SHALL выводить статический клубный logo, статическое меню, optional `contacts.primary_phone` и один статический callback CTA на desktop, а на mobile — logo, optional call action и menu trigger. Текстовое доступное имя и fallback «ИНЛав» SHALL задаваться consumer config. Семь разрешённых route, их подписи и порядок MUST NOT управляться через site settings. Три service routes MUST быть сгруппированы под trigger «Услуги» с пунктами «Занятия», «Прогулки», «Постой». Активный дочерний маршрут MUST иметь `aria-current="page"`, а группа MUST иметь доступный active state, не обозначенный одним цветом.

#### Scenario: Desktop header использует статическое меню
- **WHEN** посетитель открывает любой утверждённый маршрут на ширине от 1024 px
- **THEN** header показывает logo, ровно семь разрешённых ссылок, optional primary phone и один CTA, независимо от наличия `header.menu` и `header.cta_label` в API

#### Scenario: Mobile menu управляет фокусом
- **WHEN** посетитель открывает и закрывает mobile menu кнопкой либо `Escape`
- **THEN** фон не прокручивается, focus удерживается в overlay и после закрытия возвращается инициатору

#### Scenario: Dropdown «Услуги» доступен с клавиатуры
- **WHEN** посетитель фокусирует trigger «Услуги», открывает его клавиатурой и выбирает либо покидает меню
- **THEN** доступны ровно «Занятия», «Прогулки», «Постой», `Escape` закрывает dropdown с возвратом focus, а активный дочерний route отмечает и ссылку, и группу

#### Scenario: Logo asset недоступен
- **WHEN** статическое изображение logo не загружается
- **THEN** header и footer сохраняют ссылку на `/` с доступным именем и показывают статический fallback «ИНЛав»

### Requirement: Footer предоставляет повторную навигацию и контакты
`SiteFooter` SHALL выводить тот же статический logo, управляемые `footer.description` и `footer.copyright_name`, статическую навигацию, доступные атомарные контакты/social links и legal-строку с текущим годом. Телефон MUST поступать только из `contacts.primary_phone`. Группа «Услуги» SHALL содержать «Занятия», «Прогулки», «Постой»; desktop SHALL использовать до трёх колонок, mobile — порядок brand → navigation → contacts/social → legal; пустые optional-значения MUST схлопываться.

Кликабельные footer contacts SHALL включать общий glyph для phone, VK и Instagram, переиспользованный из `ContactSection`. Label «ВКонтакте» SHALL нормализоваться к `VK`. Каждая ссылка address/maps, phone, VK и Instagram MUST открываться в новой вкладке с `target="_blank"` и `rel="noopener noreferrer"`; некликабельные hours остаются текстом.

#### Scenario: Footer устойчив к неполным данным
- **WHEN** primary phone, social link или working hours отсутствует
- **THEN** соответствующий элемент не выводится, расписание не выдумывается, а оставшиеся блоки перераспределяются без пустой колонки

#### Scenario: Footer синхронизирован с header
- **WHEN** настройки содержат primary phone и доступные social/contact значения
- **THEN** footer повторяет статический порядок и service grouping header, использует тот же primary phone, показывает icons доступных channels и безопасно открывает contact links

