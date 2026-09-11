# Purpose

Зафиксировать серверную общую оболочку INLOVE, разрешённую навигацию и устойчивые header/footer.

## Requirements

### Requirement: Shared layout получает настройки один раз и предоставляет fallback
Общий layout SHALL на сервере получать одним запросом настройки header, footer, контактов, соцсетей, callback и SEO defaults через существующий anonymous Public Read `GET /api/site_settings` с tenant selector. Ошибка или некорректное значение отдельного ключа MUST использовать безопасный fallback и MUST NOT скрывать навигацию либо остальную страницу.

#### Scenario: Shared settings доступны при SSR
- **WHEN** валидный tenant selector и API возвращают shared settings
- **THEN** header, footer и callback получают разобранные значения без client-only fetch и без CMS credentials

#### Scenario: Ошибка settings деградирует локально
- **WHEN** API недоступен либо отдельный setting отсутствует или имеет неверный тип
- **THEN** layout рендерит разрешённое fallback-меню и обязательные подписи, а пустые optional phone/social/hours блоки скрываются

### Requirement: Header предоставляет разрешённую desktop и mobile навигацию
`SiteHeader` SHALL выводить статический клубный logo, меню, телефон и один callback CTA на desktop, а на mobile — logo, call action и menu trigger. Статический asset SHALL быть перенесён из подтверждённого `docs/parsings/ksk.inlove/media/yandex/logo.jpg` в `public/`; текст `site.short_name` SHALL использоваться как доступное имя и только как fallback ошибки asset. CMS SHALL управлять подписями и порядком только семи разрешённых route; неизвестные href MUST фильтроваться. Три service routes MUST быть сгруппированы под trigger «Услуги» с пунктами «Занятия», «Прогулки», «Постой». Активный дочерний маршрут MUST иметь `aria-current="page"`, а группа MUST иметь доступный active state, не обозначенный одним цветом.

#### Scenario: Desktop header использует валидированное меню
- **WHEN** посетитель открывает любой утверждённый маршрут на ширине от 1024 px
- **THEN** header показывает logo, разрешённые ссылки, optional phone и один CTA, а текущая ссылка отмечена доступным способом

#### Scenario: Mobile menu управляет фокусом
- **WHEN** посетитель открывает и закрывает mobile menu кнопкой либо `Escape`
- **THEN** фон не прокручивается, focus удерживается в overlay и после закрытия возвращается инициатору

#### Scenario: Dropdown «Услуги» доступен с клавиатуры
- **WHEN** посетитель фокусирует trigger «Услуги», открывает его клавиатурой и выбирает либо покидает меню
- **THEN** доступны ровно «Занятия», «Прогулки», «Постой», `Escape` закрывает dropdown с возвратом focus, а активный дочерний route отмечает и ссылку, и группу

#### Scenario: Logo asset недоступен
- **WHEN** статическое изображение logo не загружается
- **THEN** header и footer сохраняют ссылку на `/` с доступным именем и показывают текст `site.short_name`, затем fallback «ИНЛав»

### Requirement: Footer предоставляет повторную навигацию и контакты
`SiteFooter` SHALL выводить тот же статический logo, brand/description, навигацию по той же структуре route, доступные контакты/social links и legal-строку с текущим годом. Группа «Услуги» SHALL содержать «Занятия», «Прогулки», «Постой»; вертикальные интервалы меню SHALL быть компактнее исходной реализации без уменьшения touch target ниже `44 × 44px`. Desktop SHALL использовать до трёх колонок, mobile — порядок brand → navigation → contacts/social → legal; пустые optional-значения MUST схлопываться.

Кликабельные footer contacts SHALL включать общий glyph для phone, VK и Instagram, переиспользованный из `ContactSection` главной страницы. Label «ВКонтакте» SHALL нормализоваться к `VK`. Каждая ссылка address/maps, phone, VK и Instagram MUST открываться в новой вкладке с `target="_blank"` и `rel="noopener noreferrer"`; некликабельные hours остаются текстом.

#### Scenario: Footer устойчив к неполным данным
- **WHEN** phone, social link или working hours отсутствует
- **THEN** соответствующий элемент не выводится, расписание не выдумывается, а оставшиеся блоки перераспределяются без пустой колонки

#### Scenario: Footer синхронизирован с header
- **WHEN** настройки содержат разрешённые route и три contact channels
- **THEN** footer повторяет порядок и service grouping header, показывает icons phone/VK/Instagram и label `VK`, а все contact links имеют безопасное открытие в новой вкладке
