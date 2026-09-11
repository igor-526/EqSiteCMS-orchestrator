# Каталог компонентов публичного сайта «ИНЛав»

Документ является прикладным каталогом для реализации утверждённой карты страниц из [scheme.md](scheme.md). Визуальные значения берутся из [design_system_specification.md](design_system_specification.md), а не копируются в компоненты. Все запросы передают `X-Equestrian-Service-Key: inlove`. Публичные `GET` не требуют авторизации; `POST /api/callback_requests` — явное публичное исключение. Ответ `401` означает ошибку tenant selector, а не предложение войти.

## Общие контракты

- Вариативные тексты, порядок меню, CTA и SEO берутся из `site_settings`. Компонент содержит только безопасный fallback, указанный в `scheme.md`.
- Используемые ключи этого каталога присутствуют в текущем `seed.sql`; отсутствующее или некорректное значение использует fallback конкретного потребителя.
- `Setting<T> = { key: string; value: T; type: "string" | "object" }`; неверный `type` или JSON изолированно переводит потребителя ключа на fallback.
- Профильные данные не дублируются в settings: `Price`, `Horse`, `News`, `Photo` приходят из соответствующих public read API.
- Для каждого асинхронного блока действуют четыре состояния: loading сохраняет геометрию, empty использует документированный fallback или скрывает необязательный блок, error локален и допускает retry, disabled применяется только к недоступному действию.
- Интерактивные элементы имеют видимый `focus-visible`, touch target не меньше `44 × 44px`, доступное имя и не полагаются только на цвет/hover. При `prefers-reduced-motion` отключаются parallax, scale, stagger и animated scroll.
- Desktop использует 12 колонок, tablet — 8, mobile — 4. Text/media split на mobile становится вертикальным; основной CTA может быть full-width.

## Foundations

### `ThemeTokens`

- **Назначение:** единый слой CSS custom properties: semantic colors, типографика, spacing, радиусы, border, shadow, motion и breakpoints.
- **Variants / contract:** `theme="inlove"`; значения строго из разделов 2–14, 47–54 дизайн-спецификации.
- **Источник:** локальная дизайн-система; API и `site_settings` не используются.
- **Fallback:** системный serif/sans font stack при ошибке загрузки шрифта; семантические цвета не заменяются runtime-значениями.
- **Responsive / states / a11y:** responsive typography по спецификации; reduced-motion вариант обязателен; focus и contrast tokens должны обеспечивать WCAG AA.

### `PageContainer` и `Section`

- **Назначение:** сетка, вертикальный ритм, фон и ограничение ширины.
- **Variants / contract:** `PageContainer { size: "default" | "wide" }`; `Section { tone: "ivory" | "surface" | "sage" | "sand" | "forest"; spacing: "compact" | "default" | "editorial"; label?; headingId? }`.
- **Источник / settings:** контент передаётся родителем; вариативный порядок секций задаётся страницей по схеме, не произвольным CMS layout JSON.
- **Fallback:** ivory/default; пустая секция не рендерится.
- **Responsive / states / a11y:** container padding `40/32/20px`, section spacing из спецификации; `section` связывается с заголовком через `aria-labelledby`.

### `Typography`

- **Назначение:** заголовки, body, label, meta, editorial quote и цена.
- **Variants / contract:** `Text { as; variant: "display-xl" | "display-l" | "h1"…"meta" | "price"; tone }`.
- **Источник:** текст из CMS/API; цена всегда sans-serif и форматируется как `2 500 ₽`.
- **Fallback:** пустой обязательный заголовок заменяется page fallback; пустой optional text не создаёт пустой DOM.
- **Responsive / states / a11y:** семантический `as` не определяется визуальным variant; на странице один `h1`, уровни не пропускаются.

## Atoms

### `Logo`

- **Назначение:** ссылка на `/` и идентификация клуба.
- **Contract:** `{ variant: "light" | "dark"; shortName: string; asset?: ImageSource }`.
- **Источник:** статический consumer config; ассет статический.
- **Fallback:** при ошибке/отсутствии ассета выводится «ИНЛав».
- **Responsive / states / a11y:** desktop ширина `132–150px`; достаточный clear space; доступное имя ссылки, без tooltip.

### `Icon`

- **Назначение:** визуальная поддержка действия.
- **Contract:** `{ name; size: 16 | 20 | 24 | 28 | 32; decorative?: boolean }`; outline stroke `1.5px`.
- **Источник:** локальный icon set, без Tilda service icons.
- **Fallback:** значимая иконка сопровождается текстом; декоративная имеет `aria-hidden="true"`.
- **Responsive / states / a11y:** не содержит hover-only смысла; не заменяет accessible label.

### `Badge`

- **Назначение:** короткая категория или характеристика.
- **Contract:** `{ tone: "neutral" | "nature" | "dark"; children: string }`.
- **Источник:** horse fields, group/category либо редакционный текст; settings не обязателен.
- **Fallback:** пустой badge скрывается.
- **Responsive / states / a11y:** не переносит критичный смысл только цветом; высота `28–32px`, текст остаётся читаемым при zoom.

### `ResponsiveImage`

- **Назначение:** единая загрузка hero, card, editorial и gallery media.
- **Contract:** `{ src; alt; ratio: "hero" | "4:5" | "3:4" | "16:10" | "3:2"; focalPoint?; priority? }`.
- **Источник:** `photos[].url/is_main`, `Photo.url`, статический клубный placeholder; `media.base_path` задаёт базовый путь импорта, но не подменяет URL DTO.
- **Fallback:** нейтральная клубная фотография; если изображение не несёт смысла — декоративная подложка без ложного alt.
- **Responsive / states / a11y:** responsive `srcset`, предсказуемый aspect-ratio; hero/первый экран priority, остальные lazy; alt описывает содержание, не имя файла.

### `SectionLabel`, `Divider`, `PriceValue`

- **Назначение:** малый uppercase label, декоративное разделение и форматированная цена.
- **Contract:** `SectionLabel { text }`; `Divider { tone }`; `PriceValue { value: string | number; duration? }`.
- **Источник:** label от композиции; price из `price_tables`.
- **Fallback:** пустой label скрывается; неизвестная цена — текст «Стоимость уточняется», никогда `0 ₽`.
- **Responsive / states / a11y:** divider декоративен; цена имеет понятный текст для screen reader.

## Controls

### `Button` и `TextLink`

- **Назначение:** CTA, submit, retry и навигационное действие.
- **Contract:** `Button { variant: "primary" | "secondary" | "ghost"; size: "small" | "medium" | "large"; href?; type?; loading?; disabled? }`.
- **Источник / settings:** подписи из seeded `header.cta_label`, `home.hero_cta_label`, `callback.submit_label` и page `*.cta_label`; fallback задаёт композиция.
- **Fallback:** пустая CMS-подпись заменяется конкретной fallback-подписью, не пустой кнопкой.
- **Responsive / states / a11y:** mobile primary часто full-width; hover/pressed/focus/loading/disabled различимы; loading блокирует повторное действие, но сохраняет accessible name.

### `Field`, `TextArea`, `NativeSelect`

- **Назначение:** ввод `name`, `phone`, `comment` и при необходимости выбора формата.
- **Contract:** общие `{ id; label; value; required?; error?; disabled? }`; `phone` 1–63 символа, `name` ≤127, `comment` ≤2000.
- **Источник:** локальное form state; выбранная услуга/route добавляются в `comment`, не отправляются неизвестными API-полями.
- **Fallback:** label всегда видим; placeholder не заменяет label.
- **Responsive / states / a11y:** desktop name/phone могут быть в двух колонках, mobile — одна; `aria-invalid`, `aria-describedby`, inline error и focus первого ошибочного поля.

### `Accordion`

- **Назначение:** раскрываемые детали лошади и длинные условия без нового route.
- **Contract:** `{ items: { id; title; content }[]; allowMultiple?: boolean }`.
- **Источник:** Horse DTO или переданный редакционный контент; специальных settings нет.
- **Fallback:** пустой список скрывается; ошибку данных показывает владеющая секция.
- **Responsive / states / a11y:** нативная кнопка, `aria-expanded/controls`; управление клавиатурой; motion отключается по reduced-motion.

### `NewsPagination`

- **Назначение:** серверная ссылочная пагинация архива без JavaScript.
- **Contract:** `{ page; total; limit: 12 }`; ссылки на `/novosti` и `/novosti?page=N`.
- **Источник / settings:** `GET /api/news?page=N&limit=12`; `news.load_more_label` допустим для следующей ссылки.
- **Состояния / a11y:** текущая страница `aria-current="page"`; при total=0 навигация скрыта; неверный page redirect, страница N>1 за total — 404. Client load-more state не используется.

## Navigation

### `SiteHeader`

- **Назначение:** общая SSR-навигация, телефон и открытие callback modal.
- **Contract:** `{ shortName; menu: NavItem[]; phone?; ctaLabel; transparentOnHero?: boolean }`, где `NavItem={label,href}`.
- **Источник:** brand/menu/CTA из consumer config; optional phone только из `contacts.primary_phone`.
- **Fallback:** семь разрешённых routes из схемы; неизвестные CMS href фильтруются. Пустой телефон скрывает только ссылку.
- **Responsive / states / a11y:** desktop sticky transparent→blurred; mobile оставляет logo/call/menu. Активная ссылка имеет `aria-current="page"`; settings error не скрывает навигацию.

### `MobileMenu`

- **Назначение:** полноэкранная mobile-навигация с CTA, контактами и соцсетями.
- **Contract:** `{ open; menu; phone?; socialLinks; ctaLabel; onClose }`.
- **Источник:** те же shared settings, что у header/footer.
- **Fallback:** валидированное меню карты; пустые phone/social links не выводятся.
- **Responsive / states / a11y:** только mobile; focus trap, `Escape`, возврат фокуса инициатору, блокировка фонового scroll, доступная close button.

### `SiteFooter`

- **Назначение:** повторная навигация, контакты, соцсети и copyright.
- **Contract:** `{ shortName; description?; menu; address?; phone?; workingHours?; mapsUrl?; socialLinks; copyrightName }`.
- **Источник / settings:** `footer.description`, `footer.copyright_name`, атомарные contacts и social keys; brand/menu из consumer config.
- **Fallback:** текущий год вычисляется; пустая соцсеть/часы скрываются; расписание не выдумывается.
- **Responsive / states / a11y:** desktop три колонки, mobile последовательные блоки; внешние ссылки имеют понятные имена.

### `StickyMobileCta`

- **Назначение:** быстрый вызов формы после прохождения 30–40% первого экрана.
- **Contract:** `{ label; visible; onActivate }`.
- **Источник:** типизированный consumer config.
- **Fallback:** «Записаться»; не показывается при открытой/видимой форме.
- **Responsive / states / a11y:** только mobile, full-width с отступами; не перекрывает контент/системную safe area.

## Overlays и feedback

### `CallbackModal`

- **Назначение:** единая заявка из любого CTA.
- **Contract:** `{ open; context: { route; serviceName?; serviceSlug?; horseName? }; onClose }`; поля `phone` 1–63 символа, `name` ≤127, `comment` ≤2000; API payload строго `{ name?, phone, comment? }`. Обязательный непредвыбранный consent checkbox является локальным UI/legal-состоянием и в payload не входит.
- **Источник / settings:** `callback.title`, `callback.description`, `callback.submit_label`, `callback.success_message`, `callback.consent_text`, необязательный `callback.policy_url`; `POST /api/callback_requests` с tenant selector.
- **Fallback:** встроенные тексты из схемы; для consent — «Я соглашаюсь с политикой обработки персональных данных». Отсутствующий/невалидный policy URL и удалённый `/about#privacy` нормализуются к доступному статическому маршруту `/privacy`, и ссылка рендерится; безопасный настроенный внутренний или `http(s)` URL сохраняется. `201` — success; `4xx` сохраняет поля и consent; network/`5xx` даёт retry; `401` сообщает о конфигурационной ошибке без login UI.
- **Responsive / states / a11y:** desktop max-width `560px`, mobile padding `24px`; submit disabled до consent и во время pending; success заменяет форму сообщением. Consent остаётся обязательным независимо от policy link; ссылка доступна с клавиатуры независимо от checkbox. Ошибка отсутствующего согласия показывается inline, связана с checkbox через `aria-describedby` и `aria-invalid`, фокус переводится к checkbox. `role="dialog"`, `aria-modal`, focus trap, `Escape`, возврат фокуса.

### `Toast`, `InlineNotice`, `Skeleton`, `ErrorBlock`, `EmptyState`

- **Назначение:** неблокирующая обратная связь и устойчивые async-состояния.
- **Contract:** `{ tone; title?; message; action? }`; skeleton получает variant и count.
- **Источник:** тексты определяет владеющая секция либо consumer config.
- **Fallback:** error не удаляет уже загруженные данные; skeleton соответствует итоговой геометрии; optional empty section может скрыться.
- **Responsive / states / a11y:** toast справа снизу desktop и по центру снизу mobile; `role=status` для success, `role=alert` для ошибки; shimmer отключается при reduced-motion.

## Media

### `HeroMedia`

- **Назначение:** эмоциональный full-bleed первый экран с overlay.
- **Contract:** `{ image; title; subtitle?; primaryAction?; secondaryAction?; minHeightVariant? }`.
- **Источник / settings:** главная — `home.hero_title`, `home.hero_subtitle`, `home.hero_cta_label` и локальный ассет `/images/070-home-hero.jpg`; service/page copy — соответствующие seeded intro/CTA settings; изображение других страниц — из профильного DTO либо редакционного media.
- **Fallback:** SSR-текст страницы и локальное клубное изображение; ошибка медиа не скрывает CTA.
- **Responsive / states / a11y:** desktop `92vh`, mobile `88svh`; content bottom-left; overlay обеспечивает AA; meaningful image имеет alt, декоративный background — пустой alt.

### `Gallery` и `Carousel`

- **Назначение:** компактная редакционная галерея, horses/media swipe и раскрытие фото.
- **Contract:** `{ items: ImageSource[]; layout: "editorial" | "carousel"; initialIndex? }`.
- **Источник:** `photos` профильных сущностей. `/about` общую gallery не выводит.
- **Fallback:** пустая gallery скрывается; error не скрывает соседний текст; карточка без фото использует placeholder.
- **Responsive / states / a11y:** desktop 1 large + 2 small + 1 medium либо 2.5–3.5 cards; mobile native swipe/scroll snap, карточка 86–90vw. Стрелки `44px`, понятные labels; порядок фокуса следует DOM.

### `MapEmbed`

- **Назначение:** Яндекс-карта и переход к внешнему маршруту.
- **Contract:** `{ coordinates?; address; mapsUrl? }`.
- **Источник / settings:** `contacts.coordinates` формирует `https://yandex.ru/map-widget/v1/` для iframe; `contacts.address` подписывает карту; `contacts.maps_url` используется только отдельной ссылкой маршрута.
- **Fallback:** без валидных координат iframe показывает «Карта недоступна»; адрес и валидная внешняя ссылка маршрута сохраняются.
- **Responsive / states / a11y:** radius `16px`, фиксированная резервируемая высота; iframe имеет title, keyboard trap не создаётся; ссылка маршрута открывается в новой вкладке с `noopener noreferrer`.

## Content cards

### `ServiceCard` и `PriceRow`

- **Назначение:** направление услуги и конкретное ценовое предложение.
- **Contract:** `ServiceCard { price: PriceSummary; href?; onRequest }`; `PriceRow { name; description?; priceTables; onRequest }`.
- **Источник:** `GET /api/prices`; поля `id,name,slug,description,photos,groups,price_tables`. Intro/notice/CTA задаются consumer config.
- **Fallback:** нет фото — клубный placeholder; нет таблицы — описание; нет цены — «Стоимость уточняется». Конфликтующие предложения не объединяются.
- **Responsive / states / a11y:** desktop grid/list rows, mobile одна колонка; таблица становится label/value либо имеет управляемый horizontal scroll. CTA передаёт `name/slug`; hover image не содержит скрытой информации.

### `HorseCard`

- **Назначение:** знакомство с лошадью как с героем, без товарной стилистики и detail route.
- **Contract:** `{ horse: HorseSummary; expanded?; onToggle; onRequest }`; использует только непустые `name,pedigree_name,description,breed,coat_color,height,sex,bdate_formatted,age,photos,services`.
- **Источник:** `GET /api/horses?this_stable=true&sort=name`; `horses.review_mentions` не является Horse DTO и карточки не создаёт.
- **Fallback:** placeholder media; отсутствующие характеристики скрываются.
- **Responsive / states / a11y:** desktop 3–4, tablet 2, mobile 1; detail раскрывается inline через доступный accordion; CTA передаёт имя.

### `NewsCard`

- **Назначение:** preview со ссылкой на `/novosti/{slug}`.
- **Contract:** `{ news: { id; slug; name; snippet?; published_at?; photos? }; featured?: boolean }`.
- **Источник:** `GET /api/news?page=<n>&limit=12`, деталь `GET /api/news/by-slug/{slug}` возвращает полный `content`.
- **Fallback:** placeholder без фото; пустые snippet/date не заменяются выдуманным текстом.
- **Responsive / states / a11y:** featured-card крупнее на desktop, mobile одна колонка; ссылка доступна с клавиатуры и работает без JavaScript.

### `PersonCard`, `FeatureItem`, `ReviewSummary`

- **Назначение:** команда, свойства инфраструктуры и агрегированное социальное доказательство.
- **Contract:** `PersonCard { name; roles[]; phone?; status? }`; `FeatureItem { id; label; value; note? }`; `ReviewSummary { rating; rating_count; review_count; strengths[]; collected_at }`.
- **Источник:** компонент не используется в текущей `/about`; legacy settings удалены из consumer contract.
- **Fallback:** пустые блоки скрываются, фиктивные люди/отзывы не создаются; команда выводится только после редакционного одобрения; спорный feature не заявляется без проверки.
- **Responsive / states / a11y:** desktop grid/editorial quote, mobile stack; рейтинг получает текстовое представление, иконки не заменяют подписи.

## Reusable sections

### `IntroSection` и `EditorialSplitSection`

- **Назначение:** вводный текст страницы и чередование «текст / медиа».
- **Contract:** `{ eyebrow?; title; body?; image?; imageSide?: "left" | "right"; actions? }`.
- **Источник:** consumer config либо описание профильной сущности Public Read API; для `/about` — парные `about_1_*`/`about_2_*` строки.
- **Fallback:** page title и copy из схемы; optional image/block скрывается.
- **Responsive / states / a11y:** desktop 7/1/4 и зеркальный layout; mobile текст перед соответствующим фото; длина строки ограничена.

### `BenefitsSection`

- **Назначение:** преимущества программ, клуба или инфраструктуры.
- **Contract:** `{ title?; items: { title; text? }[]; tone? }`.
- **Источник:** статическая consumer-композиция либо профильный API; legacy benefits и `about.features` не читаются.
- **Fallback:** пустой массив скрывает секцию; invalid item пропускается независимо.
- **Responsive / states / a11y:** desktop editorial grid без SaaS-card избыточности; mobile stack; смысл не кодируется одной иконкой.

### `PricesSection`

- **Назначение:** список тарифов, локальный фильтр и CTA.
- **Contract:** `{ items: PriceSummary[]; mode: "featured" | "lessons" | "rides" | "boarding"; notice?; filter? }`.
- **Источник:** `/api/prices` с query из scheme; presentation-copy и CTA — consumer config.
- **Fallback:** empty сообщает «Стоимость уточняется» и оставляет callback; error содержит retry; loading — price-row skeleton.
- **Responsive / states / a11y:** desktop large rows/two-column composition, mobile stacked label/value. Локальный «Разовые / Абонементы» — tablist только если реализована настоящая tab-семантика, иначе группа кнопок.

### `HorsesSection`

- **Назначение:** каталог/preview лошадей и CTA.
- **Contract:** `{ horses; mode: "grid" | "carousel"; intro?; emptyText; ctaLabel }`.
- **Источник / settings:** `/api/horses`; seeded `horses.intro`, `horses.empty_text`, `horses.cta_label`.
- **Fallback:** «Скоро познакомим вас с лошадьми клуба» и CTA; loading skeleton, error retry.
- **Responsive / states / a11y:** grid 3–4/2/1 либо accessible carousel; no detail route.

### `NewsSection`

- **Назначение:** latest preview на главной либо архив с SSR пагинацией.
- **Contract:** `{ items; total; mode: "latest" | "archive"; pagination? }`.
- **Источник / settings:** `/api/news`; seeded `news.intro`, `news.empty_text`, `news.load_more_label`; дата в `site.timezone`.
- **Fallback:** latest empty скрывает карточку, но оставляет `/novosti`; archive — «Новостей пока нет»; частичная ошибка локальна.
- **Responsive / states / a11y:** desktop archive 3 колонки, tablet 2, mobile 1; ссылочная навигация доступна без JavaScript, дата рендерится `<time>`.

### `ContactSection`

- **Назначение:** адрес, часы, три строки каналов «телефон / VK / Instagram», карта и callback CTA.
- **Contract:** `{ address; coordinates?; mapsUrl?; nearestStop?; phone?; workingHours?; socialLinks; ctaLabel; context }`.
- **Источник / settings:** атомарные `contacts.address/coordinates/maps_url/nearest_stop/primary_phone/working_hours` и `social.*`; CTA — consumer config. Alternative address и legacy phone keys не читаются.
- **Fallback:** SSR-контакты; отсутствующий канал или часы скрываются и не заменяются выдуманными данными; без карты сохраняются адрес, доступные каналы и CTA «Обратный звонок».
- **Responsive / states / a11y:** desktop контакты рядом с map, mobile последовательно; каждый канал имеет локальную статическую иконку и текст, `tel:` использует raw phone, display форматирует российский номер. Телефон, VK и Instagram открываются в новой вкладке с `noopener noreferrer`; callback получает контекст текущей страницы.

### `PreparationSafetySection` и `ConditionsSection`

- **Назначение:** подготовка/безопасность прогулок, состав постоя и требования.
- **Contract:** `{ blocks: { title; body | items[] }[]; verifiedOnly?: boolean }`.
- **Источник:** статическая consumer-композиция; удалённые `services.*` settings не читаются.
- **Fallback:** блок без setting скрывается; неподтверждённые возрастные, весовые и погодные ограничения не генерируются.
- **Responsive / states / a11y:** desktop split/cards, mobile порядок из схемы; списки семантические.

## Page compositions

Композиции оркестрируют запросы и секции, но не дублируют внутреннюю разметку компонентов. Shared settings запрашиваются layout один раз; page settings — только своей страницей. Независимые API-запросы выполняются параллельно, а ошибка деградирует только зависимую секцию.

### `HomePage`

- **Состав:** `HeroMedia` с локальным фото → четыре квадратные service-route cards с локальными иконками → `BenefitsSection(program)` → `BenefitsSection(club)` → `NewsSection(latest)` → `ContactSection`. Блока стоимости нет.
- **Данные:** `home.hero_title/home.hero_subtitle`, shared contacts и `GET /api/news?page=1&limit=1`; prices не запрашиваются; SEO из consumer config.
- **Responsive / states:** всё содержимое SSR; desktop допускает асимметрию, mobile строго последователен; ошибка news не блокирует остальные секции.

### `LessonsPage`

- **Состав:** intro → local filter → `PricesSection(lessons)` → benefits → notice → CTA.
- **Данные:** exact-match `GET /api/horse_services?name=Занятия` и профильные prices; settings не запрашиваются.
- **Responsive / states:** desktop две колонки/таблицы, mobile cards; empty/error всегда сохраняют callback.

### `RidesPage`

- **Состав:** hero → «Как проходит» → `PricesSection(rides)` → setting → `PreparationSafetySection` → notice → CTA.
- **Данные:** exact-match `GET /api/horse_services?name=Прогулки` и профильные prices; settings не запрашиваются.
- **Responsive / states:** конфликтующие позиции раздельны; mobile `описание → цена → условия → CTA`; empty price не означает free.

### `BoardingPage`

- **Состав:** hero → инфраструктура → included → `PricesSection(boarding)` → requirements → notice → CTA.
- **Данные:** exact-match `GET /api/horse_services?name=Постой` и профильные prices; settings не запрашиваются.
- **Responsive / states:** desktop условия/цена + gallery, mobile stack без sticky sidebar; пустой included скрывается.

### `HorsesPage`

- **Состав:** intro → `HorsesSection(grid)` с inline details → CTA.
- **Данные:** `/api/horses?this_stable=true&sort=name`; `horses.*` и `seo.horses.*` seeded; `horses.review_mentions` только редакционный материал.
- **Responsive / states:** 3–4/2/1 columns; empty text + CTA; никакого detail route.

### `NewsPage`

- **Состав:** intro → featured first item без дублирования → `NewsSection(archive)` → `NewsPagination` → вторичный callback CTA.
- **Данные:** серверный `GET /api/news?page=N&limit=12`; `news.*`, `seo.news.*`; timezone из `site.timezone`.
- **Responsive / states:** 3/2/1 columns; весь контент SSR, обычные ссылки pagination; empty 200, invalid page redirect, overflow N>1 404, API error с retry-ссылкой и noindex. Canonical первой страницы `/novosti`, остальных `/novosti?page=N`.

### `NewsDetailPage`

- **Маршрут / данные:** `/novosti/[slug]`, серверный `GET /api/news/by-slug/{slug}` с tenant selector без CMS credentials, request-time SSR/no-store.
- **Состав:** один h1, дата, фотографии, полный безопасно санитизированный content, ссылка на архив.
- **SEO / states:** согласованные metadata/page данные; title новости, description из snippet/plain text, canonical точного slug. Missing/deleted/future/foreign — настоящий 404; 401/5xx/timeout — SSR error/retry/noindex. Без JavaScript доступен весь текст.

### `AboutPage`

- **Состав:** до двух последовательных текстовых блоков → переиспользуемый `ContactSection` и CTA. Gallery, team, reviews, payment/privacy отсутствуют.
- **Данные:** только четыре строки `about_1_title/about_1_text/about_2_title/about_2_text`; контакты используют те же shared settings, что главная.
- **Responsive / states:** desktop чередует text/media и grids, mobile сохраняет порядок; каждый optional block скрывается независимо, invalid JSON не роняет страницу.

## Матрица покрытия маршрутов

| Route | Ключевые композиции | API кроме settings |
|---|---|---|
| `/` | local-photo Hero, 4 square service cards, benefits, latest news, contacts | news |
| `/uslugi/zanyatiya` | intro, filter, prices, benefits, notice, CTA | prices |
| `/uslugi/progulki` | hero, prices, setting, preparation/safety, notice | prices |
| `/uslugi/postoy` | hero, infrastructure, included, price, requirements | prices |
| `/loshadi` | intro, horse grid/details, CTA | horses |
| `/novosti` | intro, featured/archive, SSR pagination | news list |
| `/novosti/[slug]` | title, date, photos, full sanitized content, archive link | news by-slug detail |
| `/about` | intro, settings text, gallery, team, reviews, shared contacts | photos |

В change `inlove-static-pages` реализуются `/`, `/novosti`, `/about` и `/novosti/[slug]`. Три service routes и `/loshadi` сохраняют оболочку, route-specific metadata/h1 и сообщение о разработке; их композиции в таблице описывают будущую реализацию. Другие detail routes не добавляются.
