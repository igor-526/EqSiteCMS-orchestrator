# Что это

Этот документ описывает утверждённую карту публичного сайта конного клуба «ИНЛав», состав страниц, адаптивное поведение и интеграцию с CMS.

Все запросы отправляются с tenant selector `X-Equestrian-Service-Key: inlove`. Отсутствующий или неверный selector возвращает `401`; сайт не должен подменять данные другого клуба. Перечисленные `GET` доступны анонимно. Единственная используемая запись — публичное исключение `POST /api/callback_requests`.

## Общие правила CMS

- Вариативные заголовки, пояснения, CTA, порядок блоков и SEO хранятся в `site_settings`, а не в компонентах.
- Профильные сущности не дублируются: тарифы читаются из `prices`, лошади — из `horses`, новости — из `news`, связанные изображения — из их поля `photos`.
- `GET /api/site_settings?key=<key>&key=<key>` возвращает массив `{ key, value, type }`. Значение разбирается согласно `type`; без `full=true` пагинации нет.
- Shared layout одним запросом получает header, footer, контакты, соцсети, форму и SEO defaults. Страница запрашивает только собственные ключи.
- Все используемые ниже ключи создаются текущим `seed.sql`. Для отсутствующего или некорректного значения всегда действует описанный fallback.
- `GET /api/photos` используется лишь для общей галереи, которую нельзя связать с профильной сущностью.

## Матрица доступа используемых API

| Method | Path | Access class | Роли | Без/с неверным selector | С корректным selector |
|---|---|---|---|---|---|
| `GET` | `/api/site_settings` | Public Read | нет | `401` | `200` |
| `GET` | `/api/prices` | Public Read | нет | `401` | `200` |
| `GET` | `/api/horses` | Public Read | нет | `401` | `200` |
| `GET` | `/api/news` | Public Read | нет | `401` | `200` |
| `GET` | `/api/news/by-slug/{slug}` | Public Read | нет | `401` | `200` опубликованная своего tenant; `404` иначе |
| `GET` | `/api/photos` | Public Read | нет | `401` | `200` |
| `POST` | `/api/callback_requests` | Public POST exception | нет | `401` | `201` |

## Общий header

Shared layout запрашивает `site.short_name`, `header.menu`, `header.contact_phone`, `header.cta_label`, `contacts.primary_phone`. Логотип — ссылка на `/` с доступным текстом из `site.short_name`; при ошибке ассета показывается текст. `header.contact_phone` приоритетнее `contacts.primary_phone`.

`header.menu` управляет подписями и порядком, но ссылки обязаны принадлежать существующей карте: `/`, `/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy`, `/loshadi`, `/novosti`, `/about`. Неизвестные пути из настройки не выводятся. Fallback — меню из этих семи маршрутов.

На desktop слева расположен логотип, по центру меню, справа телефон и CTA формы. Три страницы услуг допускается объединить в раскрываемый пункт «Услуги». Текущий пункт получает `aria-current="page"`. На mobile остаются логотип, звонок и кнопка меню; CTA и соцсети находятся в панели. Фокус удерживается внутри панели, `Escape` закрывает её и возвращает фокус.

Header рендерится SSR с fallback. Ошибка settings не скрывает навигацию; пустой телефон убирает лишь телефонную ссылку.

## Общий footer

Shared layout использует `footer.description`, `footer.copyright_name`, `contacts.address`, `contacts.primary_phone`, `contacts.working_hours`, `contacts.maps_url`, `social.vk_url`, `social.instagram_url`, `site.short_name`. Footer содержит логотип, описание, навигацию по семи маршрутам, контакты, соцсети и copyright с текущим годом.

На desktop это колонки «Клуб», «Разделы», «Контакты»; на mobile — последовательные блоки с удобными touch targets. Пустая соцсеть не выводится. Пустые часы не заменяются выдуманным расписанием.

## Универсальная форма обратной связи

Modal вызывается из header и любого CTA. Тексты: `callback.title`, `callback.description`, `callback.submit_label`, `callback.success_message`, обязательное согласие — из `callback.consent_text`, необязательная ссылка на политику — из `callback.policy_url`. Поля соответствуют `CallbackRequestCreateDto`:

- обязательный `phone`, 1–63 символа;
- необязательный `name`, до 127 символов;
- необязательный `comment`, до 2000 символов;
- route и выбранная услуга добавляются в `comment` как контекст CTA.

Перед submit пользователь обязан явно установить непредвыбранный checkbox согласия. Рядом показывается текст `callback.consent_text` (fallback: «Я соглашаюсь с политикой обработки персональных данных»). Ссылка выводится только для безопасного настроенного `callback.policy_url`: допустим внутренний путь либо `http(s)` URL; отсутствующее, невалидное значение и удалённый fragment `/about#privacy` не получают ссылочный fallback. Настроенная валидная ссылка доступна с клавиатуры независимо от checkbox. Consent сохраняется без ссылки, является локальным UI/legal-состоянием и не добавляется в API payload. Пока согласие не дано, submit disabled. Попытка отправки без согласия показывает inline error, связывает его с checkbox через `aria-describedby`, устанавливает `aria-invalid="true"` и переводит фокус к checkbox.

Отправка: `POST /api/callback_requests`, JSON `{ name, phone, comment }`, `Content-Type: application/json`, tenant selector. Успех — `201`. Во время отправки кнопка disabled; повторный submit запрещён. При успехе показывается `callback.success_message`; при `4xx` значения и consent сохраняются, при сети/`5xx` доступен retry. `401` — ошибка конфигурации сайта, не приглашение войти. Modal удерживает фокус, закрывается по `Escape` и возвращает фокус инициатору.

# Разделы

## Главная

### Метаинформация

**Заголовок:** «Инлав»  
**Путь:** `/`

SEO: seeded `seo.home.title`, `seo.home.description`; fallback — `seo.default_title`, `seo.default_description`. Canonical — `/`.

### Цель страницы

Эмоциональная точка входа, а не прайс-каталог. Пользователь быстро понимает формат клуба, видит доверительные факторы и может связаться.

### Интеграция с CMS

- `GET /api/site_settings?key=home.hero_title&key=home.hero_subtitle&key=home.hero_cta_label&key=home.program_benefits&key=home.club_benefits`.
- `GET /api/news?page=1&limit=1`: `items[].id/slug/name/snippet/published_at/photos`, `total`.
- Контакты и карта берутся из shared settings: `contacts.address`, `contacts.address_alternative`, `contacts.coordinates`, `contacts.maps_url`, `contacts.primary_phone`, `contacts.working_hours`, `social.vk_url`, `social.instagram_url`.

### Секции и вёрстка

1. Hero с локальной фотографией клуба, заголовком, подзаголовком и CTA.
2. Четыре квадратные карточки «Занятия», «Прогулки», «Абонементы», «Постой» с локальными статическими иконками; абонементы ведут на `/uslugi/zanyatiya`.
3. Преимущества программ.
4. Преимущества клуба.
5. Последняя новость и ссылка `/novosti`.
6. Общие контакты: адрес и часы, три строки каналов «телефон / VK / Instagram» с локальными иконками, CTA «Обратный звонок» и Яндекс-карта по координатам из settings. Телефон и внешние ссылки открываются в новой вкладке с `noopener noreferrer`; отсутствующий канал не выдумывается.

На mobile секции последовательны. На desktop hero и контакты занимают контейнер, услуги и новость допускают асимметричную сетку.

### Состояния, fallback и CTA

Hero, четыре service cards, преимущества, новость и контакты полностью рендерятся сервером; skeleton допустим только как временный streaming fallback. Главная не запрашивает prices и не содержит блока стоимости. Пустая новость скрывает карточку, сохраняя ссылку на архив; её ошибка не блокирует страницу. Основной CTA открывает modal с контекстом «Главная»; вторичные ведут на услуги, новости, телефон и карту.

---

## Услуги / Занятия и абонементы

### Метаинформация

**Заголовок:** «Инлав | Занятия и абонементы»  
**Путь:** `/uslugi/zanyatiya`

SEO: seeded `seo.lessons.title`, `seo.lessons.description`; fallback — `site.short_name` и заголовок.

### Цель страницы

Сопоставить разовые, групповые и индивидуальные занятия с абонементами, объяснить условия и привести к заявке.

### Интеграция с CMS

- `GET /api/prices?groups=Основные услуги`, затем отбор slug: `individual-lesson-official`, `group-lesson-official`, `training-package-8-official`, `individual-membership-official`, `subscription-4-yandex`, `riding-training-yandex`, `subscription-8-yandex`, `individual-subscription-8-yandex`.
- Поля: `name`, `slug`, `description`, `photos[].url/is_main`, `price_tables[].columns/rows`, `groups`.
- Seeded settings: `services.notice`, `home.program_benefits`, `services.lessons.intro`, `services.lessons.cta_label`.

### Секции и вёрстка

Вводный экран; локальный переключатель «Разовые / Абонементы»; карточки тарифов; преимущества; notice; финальный CTA. Desktop — две колонки и полноценные таблицы. Mobile — одна колонка; таблица преобразуется в пары «параметр — значение» либо получает контролируемый горизонтальный скролл.

### Состояния, fallback и CTA

До загрузки — skeleton. Пустой ответ сообщает «Стоимость уточняется» и оставляет CTA, но не показывает нулевую цену. Ошибка имеет retry. Нет фото — нейтральное клубное изображение; нет таблицы — описание сохраняется. CTA тарифа передаёт его `name` и `slug` в форму.

---

## Услуги / Прогулки

### Метаинформация

**Заголовок:** «Инлав | Прогулки»  
**Путь:** `/uslugi/progulki`

SEO: seeded `seo.rides.title`, `seo.rides.description`; fallback — заголовок и default description.

### Цель страницы

Объяснить формат прогулки, подготовку и безопасность, показать стоимость и привести к записи.

### Интеграция с CMS

- `GET /api/prices?name=Конные прогулки&name=Конная прогулка`; API принимает повторяемый `name`. Проверяются slug `horse-rides-official`, `horse-ride-yandex`, чтобы сохранить конфликтующие предложения.
- Поля: `id`, `name`, `slug`, `description`, `photos`, `price_tables`, `groups`.
- Seeded settings: `services.notice`, `about.setting`, `services.rides.intro`, `services.rides.preparation`, `services.rides.safety`, `services.rides.cta_label`.

### Секции и вёрстка

Hero; «Как проходит прогулка»; варианты и цены; окружение из `about.setting`; подготовка и безопасность; notice; CTA. Неподтверждённые возрастные, весовые и погодные ограничения не публикуются как факт. Desktop чередует текст и медиа; mobile сохраняет порядок «описание → цена → условия → CTA».

### Состояния, fallback и CTA

Skeleton сохраняет размеры блоков. При пустых ценах — «Стоимость уточняется» и форма. Две конфликтующие позиции показываются раздельно с CMS-названиями. Основной CTA передаёт контекст «Прогулки» и тариф; вторичные ведут к звонку и занятиям.

---

## Услуги / Постой

### Метаинформация

**Заголовок:** «Инлав | Постой»  
**Путь:** `/uslugi/postoy`

SEO: seeded `seo.boarding.title`, `seo.boarding.description`; fallback — заголовок и default description.

### Цель страницы

Показать владельцу инфраструктуру и предложение по постою без обещания неподтверждённых условий, собрать предметную заявку.

### Интеграция с CMS

- `GET /api/prices?name=Постой частных лошадей`, проверка slug `horse-boarding-yandex`; поля `name`, `slug`, `description`, `photos`, `price_tables`.
- Seeded settings: `about.setting`, `about.features`, `services.notice`, `services.boarding.intro`, `services.boarding.included`, `services.boarding.requirements`, `services.boarding.cta_label`.

### Секции и вёрстка

Hero; инфраструктура; «Что входит»; стоимость; требования и знакомство с клубом; notice; CTA. Desktop — две колонки «условия / стоимость» и галерея. Mobile — последовательные карточки без липкой боковой панели.

### Состояния, fallback и CTA

Пустой тариф означает «Стоимость и наличие мест уточняются», не бесплатную услугу. Пустой included скрывается. Ошибка CMS оставляет телефон и callback. Спорные `about.features` публикуются только после редакционной проверки. Modal получает контекст «Постой» и вопрос о местах.

---

## Наши лошади

### Метаинформация

**Заголовок:** «Инлав | Лошади»  
**Путь:** `/loshadi`

SEO: seeded `seo.horses.title`, `seo.horses.description`; fallback — заголовок и default description.

### Цель страницы

Познакомить с лошадьми клуба и укрепить доверие. Отдельные публичные detail routes не создаются.

### Интеграция с CMS

- `GET /api/horses?this_stable=true&sort=name`: `id`, `slug`, `name`, `pedigree_name`, `description`, `breed`, `coat_color`, `height`, `sex`, `bdate_formatted`, `age`, `photos`, `services`, `this_stable`.
- Seeded settings: `horses.review_mentions`, `horses.intro`, `horses.empty_text`, `horses.cta_label`.
- `horses.review_mentions` не смешивается с entities: это неподтверждённые упоминания и отдельный редакционный материал.

### Секции и вёрстка

Введение; сетка карточек с главным фото, кличкой, описанием и непустыми характеристиками; раскрываемые подробности внутри текущей страницы; CTA. Desktop — 3–4 карточки, tablet — 2, mobile — 1. Несуществующий detail route не используется.

### Состояния, fallback и CTA

Во время загрузки — skeleton. При пустом каталоге — `horses.empty_text`, fallback «Скоро познакомим вас с лошадьми клуба», и CTA. Упоминания из отзывов автоматически карточками не становятся. CTA выбранной карточки передаёт имя лошади.

---

## Новости

### Метаинформация

**Заголовок:** «Инлав | Новости»  
**Путь:** `/novosti`

SEO: seeded `seo.news.title`, `seo.news.description`; fallback — заголовок и default description.

### Цель страницы

Показывать жизнь клуба и опубликованные анонсы. Карточки ведут на отдельный утверждённый маршрут `/novosti/[slug]`; slug берётся из API, сохраняется сервером один раз и не меняется при переименовании.

### Интеграция с CMS

- `GET /api/news?page=<n>&limit=12`: опубликованные записи; `items[].id/slug/name/snippet/published_at/photos[].url/is_main`, `total`.
- `GET /api/news/by-slug/{slug}`: опубликованная новость своего tenant с полным `content`; CMS credentials не передаются.
- Seeded settings: `news.intro`, `news.empty_text`, `news.load_more_label` (допустима подпись следующей ссылки).

### Секции и вёрстка

Архив: заголовок и intro; выделенная первая карточка без повторения в сетке; хронологическая сетка; обычные ссылки `/novosti?page=N` при limit=12. Desktop — 3 колонки, tablet — 2, mobile — 1. Дата форматируется в `site.timezone`. Первая страница canonical `/novosti`, последующие `/novosti?page=N`; пагинация работает без JavaScript, без накопления карточек в client state.

Деталь `/novosti/[slug]`: один h1 с названием, дата, фотографии, полный санитизированный content и ссылка на архив. Metadata формируется сервером из тех же данных: title новости, description из snippet/безопасного текста, canonical с точным slug. HTML допускает p/br/strong/em/ul/ol/li/blockquote/h2/h3/a и безопасные ссылки; script/style/iframe, on*, javascript/data URLs удаляются, фотографии выводятся из DTO.

### Состояния, fallback и CTA

Весь контент архива и детали доступен в серверном HTML. Пустая первая страница — 200 с `news.empty_text`, fallback «Новостей пока нет». Невалидный page перенаправляется на `/novosti`; N>1 за последней страницей — настоящий 404. Missing/deleted/future/foreign slug — 404. Ошибка selector, timeout или 5xx — отдельное SSR error state с ссылкой повторить запрос и noindex, не пустой список и не ложный 404. Карточка без фото получает placeholder. CTA формы — вторичное «Задать вопрос».

---

## О клубе

### Метаинформация

**Заголовок:** «Инлав | О клубе»  
**Путь:** `/about`

SEO: seeded `seo.about.title`, `seo.about.description`; fallback — заголовок и default description.

### Цель страницы

Собрать историю, атмосферу, инфраструктуру, команду и практические контакты в доверительную страницу.

### Интеграция с CMS

- Seeded settings: `about.intro`, `about.setting`, `about.features`, `team.people`, `reviews.summary`, `about.gallery_photo_ids`, `about.cta_label`.
- `GET /api/photos?limit=24&sort=created_at` — временный fallback общей галереи. Текущий API не имеет `include_ids`; предпочтительный вариант — редакционный выбор после появления соответствующего фильтра.
- Поля фото: `id`, `name`, `description`, `path`, `url`. Контакты и соцсети — shared settings.

### Секции и вёрстка

Вступление и текст об окружении из `about.*`; инфраструктура; галерея; команда; сводка отзывов без копирования текстов отзывов; переиспользуемые с главной контакты и CTA. Блоков способов оплаты и обработки персональных данных нет. Публично выводятся только одобренные редактором записи команды. Desktop чередует текст и медиа, использует сетку команды и карту рядом с контактами. Mobile сохраняет порядок, галерея становится доступной каруселью или лентой.

### Состояния, fallback и CTA

Необязательный пустой блок скрывается независимо. Ошибка photos не скрывает текст из settings. При отсутствии team/reviews фиктивные карточки не создаются. Некорректный JSON setting ведёт к fallback конкретного блока, не падению страницы. CTA «Обратный звонок» передаёт контекст «О клубе»; также доступны те же телефон, VK, Instagram и карта, что на главной. `/about#privacy` не является fallback-целью.

## SSR, загрузка и ошибки

- SEO, header/footer и весь контент `/`, `/about`, `/novosti`, `/novosti/[slug]` загружаются на сервере; callback/modal и gallery могут оставаться островами интерактивности. News использует request-time SSR и no-store, metadata/detail согласованы в рамках запроса. Settings можно кэшировать дольше news; TTL определяет реализация.
- Ошибка selector не маскируется stale-данными другого tenant.
- Независимые запросы выполняются параллельно; частичная ошибка деградирует только свой блок.
- Вариативный текст безопасно рендерится. HTML в разрешённых профильных полях санитизируется.
- Все страницы доступны с клавиатуры, имеют логичную иерархию заголовков и не используют только цвет для передачи состояния.
