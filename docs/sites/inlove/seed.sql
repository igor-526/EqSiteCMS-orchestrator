-- Seed for KSK Inlove CMS tenant.
-- Sources: docs/parsings/ksk.inlove, collected 2026-09-08.
-- The source set contains unverified and conflicting data by request. Provenance and
-- verification status are retained in descriptions or JSON values for later editing.
-- This script is repeatable: tenant-scoped natural keys are upserted, relations are
-- inserted only when absent. It intentionally does not create CMS users or callbacks.
-- Requires PostgreSQL's gen_random_uuid(), already used by project migrations/seeds.

BEGIN;

INSERT INTO equestrians (id, created_at, updated_at, name, service_key)
VALUES (gen_random_uuid(), now(), NULL, 'Конный клуб «ИНЛав»', 'inlove')
ON CONFLICT (service_key) DO UPDATE
SET name = EXCLUDED.name,
    updated_at = now();

DO $seed$
DECLARE
    v_equestrian_id uuid;
    v_main_group_id uuid;
    v_extra_group_id uuid;
BEGIN
    SELECT id INTO STRICT v_equestrian_id
      FROM equestrians
     WHERE service_key = 'inlove';

    -- Presentation and other mutable site content belongs in site_settings. Structured
    -- catalogs (prices and media) are seeded below into their dedicated CMS entities.
    CREATE TEMP TABLE inlove_settings_seed (
        key text PRIMARY KEY,
        value text NOT NULL,
        name text NOT NULL UNIQUE,
        description text,
        type text NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO inlove_settings_seed (key, value, name, description, type) VALUES
      ('site.name', 'Конный клуб «ИНЛав»', 'Название сайта', 'business.json; подтверждено несколькими источниками', 'string'),
      ('site.short_name', 'ИНЛав', 'Короткое название сайта', 'business.json alternate_names', 'string'),
      ('site.tagline', 'Место для обучения верховой езде и конных прогулок с акцентом на безопасность и заботу', 'Позиционирование клуба', 'content.json; требует редакторского подтверждения', 'string'),
      ('site.official_url', 'https://inlovehorseclub.ru/', 'Официальный адрес сайта', 'business.json', 'string'),
      ('site.timezone', 'Europe/Moscow', 'Часовой пояс сайта', 'business.json / Yandex Maps', 'string'),
      ('seo.default_title', 'Конный клуб «ИНЛав»', 'SEO заголовок по умолчанию', 'Составлено из названия клуба; требует проверки', 'string'),
      ('seo.default_description', 'Обучение верховой езде, конные прогулки и постой лошадей в деревне Иннолово Ленинградской области.', 'SEO описание по умолчанию', 'Составлено по business.json и services.json; требует проверки', 'string'),
      ('seo.home.title', 'Конный клуб «ИНЛав» — занятия и конные прогулки', 'SEO: главная — заголовок', 'Редакционный fallback по scheme.md; требует проверки перед публикацией', 'string'),
      ('seo.home.description', 'Обучение верховой езде, конные прогулки и постой лошадей в клубе «ИНЛав» в деревне Иннолово.', 'SEO: главная — описание', 'Составлено по business.json и services.json; неподтверждено', 'string'),
      ('seo.lessons.title', 'Занятия верховой ездой и абонементы — «ИНЛав»', 'SEO: занятия — заголовок', 'Редакционный fallback по scheme.md; требует проверки перед публикацией', 'string'),
      ('seo.lessons.description', 'Индивидуальные и групповые занятия верховой ездой, тренировки и абонементы конного клуба «ИНЛав».', 'SEO: занятия — описание', 'Составлено по services.json; цены и условия требуют подтверждения', 'string'),
      ('seo.rides.title', 'Конные прогулки в Иннолово — клуб «ИНЛав»', 'SEO: прогулки — заголовок', 'Редакционный fallback по scheme.md; требует проверки перед публикацией', 'string'),
      ('seo.rides.description', 'Конные прогулки по живописным маршрутам в сопровождении инструктора в конном клубе «ИНЛав».', 'SEO: прогулки — описание', 'Составлено по services.json и content.json; неподтверждено', 'string'),
      ('seo.boarding.title', 'Постой частных лошадей — клуб «ИНЛав»', 'SEO: постой — заголовок', 'Редакционный fallback по scheme.md; требует проверки перед публикацией', 'string'),
      ('seo.boarding.description', 'Постой частных лошадей и аренда денников в конном клубе «ИНЛав» в Ленинградской области.', 'SEO: постой — описание', 'Составлено по services.json и Yandex Maps features; неподтверждено', 'string'),
      ('seo.horses.title', 'Наши лошади — конный клуб «ИНЛав»', 'SEO: лошади — заголовок', 'Редакционный fallback по scheme.md; требует проверки перед публикацией', 'string'),
      ('seo.horses.description', 'Познакомьтесь с лошадьми конного клуба «ИНЛав» и выберите подходящий формат занятия или прогулки.', 'SEO: лошади — описание', 'Редакционный текст; карточки публикуются только из Horse API', 'string'),
      ('seo.news.title', 'Новости конного клуба «ИНЛав»', 'SEO: новости — заголовок', 'Редакционный fallback по scheme.md; требует проверки перед публикацией', 'string'),
      ('seo.news.description', 'Новости, события и анонсы конного клуба «ИНЛав».', 'SEO: новости — описание', 'Редакционный текст; фактические публикации поступают из News API', 'string'),
      ('seo.about.title', 'О конном клубе «ИНЛав»', 'SEO: о клубе — заголовок', 'Редакционный fallback по scheme.md; требует проверки перед публикацией', 'string'),
      ('seo.about.description', 'Атмосфера, инфраструктура, команда и контакты конного клуба «ИНЛав» в деревне Иннолово.', 'SEO: о клубе — описание', 'Составлено по business.json и content.json; неподтверждено', 'string'),
      ('header.menu', $json$[{"label":"Главная","href":"/"},{"label":"Занятия","href":"/uslugi/zanyatiya"},{"label":"Прогулки","href":"/uslugi/progulki"},{"label":"Постой","href":"/uslugi/postoy"},{"label":"Лошади","href":"/loshadi"},{"label":"Новости","href":"/novosti"},{"label":"О клубе","href":"/about"}]$json$, 'Основное меню', 'Семь прямых ссылок из утверждённой карты сайта; услуги сгруппированы соседними пунктами без несуществующего общего маршрута', 'object'),
      ('header.contact_phone', '+79219880772', 'Телефон в шапке', 'business.json; Анастасия, директор; также Yandex Maps', 'string'),
      ('header.cta_label', 'Записаться', 'Кнопка в шапке', 'Редакционное значение', 'string'),
      ('footer.description', 'Конный клуб «ИНЛав» — обучение верховой езде, прогулки и забота о лошадях.', 'Описание в подвале', 'Составлено по parsing; требует проверки', 'string'),
      ('footer.copyright_name', 'Конный клуб «ИНЛав»', 'Правообладатель в подвале', 'Юридическое имя не найдено; неподтверждено', 'string'),
      ('contacts.phones', $json$[{"value":"+79219880772","formatted":"+7 (921) 988-07-72","sources":["official_site","yandex_maps","vk"],"status":"reported"},{"value":"+79818384831","formatted":"+7 (981) 838-48-31","sources":["official_site","yandex_maps","vk"],"status":"reported"},{"value":"+79675952154","formatted":"+7 (967) 595-21-54","sources":["yandex_maps"],"status":"unverified_conflict"},{"value":"+79522294743","formatted":"+7 (952) 229-47-43","sources":["official_site"],"status":"unverified_conflict"}]$json$, 'Все контактные телефоны', 'Содержит конфликт official_site и Yandex Maps; сохранить до ручной сверки', 'object'),
      ('contacts.primary_phone', '+79219880772', 'Основной телефон', 'business.json; наиболее полно связан с директором', 'string'),
      ('contacts.address', 'Ломоносовский район, д. Иннолово, Заречная ул., с. 3', 'Адрес клуба', 'official_site; требует почтовой проверки', 'string'),
      ('contacts.address_alternative', 'Ленинградская область, Ломоносовский район, Аннинское городское поселение', 'Альтернативный адрес', 'Yandex Maps; менее точный вариант', 'string'),
      ('contacts.coordinates', '{"latitude":59.773315,"longitude":29.973801}', 'Координаты клуба', 'Yandex Maps', 'object'),
      ('contacts.maps_url', 'https://yandex.ru/maps/org/inlav/65789410136/', 'Ссылка на карту', 'Yandex Maps', 'string'),
      ('contacts.nearest_stop', $json${"name":"Иннолово – Весовая площадь","distance_m":1007.74,"coordinates":{"latitude":59.781367395,"longitude":29.975699127},"source":"yandex_maps"}$json$, 'Ближайшая остановка', 'business.json / Yandex Maps', 'object'),
      ('contacts.working_hours', $json${"timezone":"Europe/Moscow","days":[{"day_from":"monday","day_to":"sunday","opens":"10:00","closes":"21:00"}],"source":"yandex_maps","status":"unverified"}$json$, 'Режим работы', 'Yandex Maps; требует подтверждения владельцем', 'object'),
      ('social.vk_url', 'https://vk.ru/inlovehorse', 'Ссылка ВКонтакте', 'business.json', 'string'),
      ('social.instagram_url', 'https://www.instagram.com/ksk.inlove/', 'Ссылка Instagram', 'business.json; доступность зависит от региона', 'string'),
      ('home.hero_title', 'Откройте для себя мир верховой езды', 'Заголовок главного экрана', 'content.json / official_site; требует редакторской проверки', 'string'),
      ('home.hero_subtitle', 'Погрузитесь в атмосферу конных прогулок и обучения верховой езде', 'Подзаголовок главного экрана', 'content.json / official_site; требует редакторской проверки', 'string'),
      ('home.hero_cta_label', 'Записаться на занятие', 'CTA главного экрана', 'Редакционное значение', 'string'),
      ('home.program_benefits', $json$[{"title":"Индивидуальный подход","text":"Разрабатываем программы обучения, учитывая уровень подготовки и цели каждого всадника."},{"title":"Занятия для всех уровней","text":"От начинающих до продвинутых наездников — каждому найдётся программа по душе."},{"title":"Забота о безопасности","text":"Обеспечиваем безопасность и комфорт во время занятий, следуя высоким стандартам."},{"title":"Помощь в достижении целей","text":"Поддерживаем и помогаем достичь поставленных целей в верховой езде."}]$json$, 'Преимущества программ', 'content.json / official_site; тексты неподтверждены', 'object'),
      ('home.club_benefits', $json$[{"title":"Хорошо обученные лошади","text":"Наши лошади прошли специальную подготовку и готовы обеспечить комфортное и безопасное катание."},{"title":"Незабываемые впечатления","text":"Верховая езда с нами подарит яркие эмоции и незабываемые моменты."},{"title":"Разнообразие предложений","text":"Различные программы верховой езды подходят для любого уровня подготовки."}]$json$, 'Преимущества клуба', 'content.json / official_site; тексты неподтверждены', 'object'),
      ('about.intro', 'Конный клуб «ИНЛав» только начинает свою жизнь. В планах — создание уютного клуба, в котором царит добрая атмосфера.', 'Вводный текст о клубе', 'business.json / VK; неподтверждено владельцем', 'string'),
      ('about.setting', $json$["живописное озеро","зелёные пастбища","лесная трасса","крытый манеж"]$json$, 'Окружение и инфраструктура', 'Темы из отзывов; все пункты требуют проверки', 'object'),
      ('about.features', $json$[{"id":"pony","label":"Пони","value":true},{"id":"individual_training","label":"Индивидуальное обучение","value":true},{"id":"hippotherapy","label":"Иппотерапия","value":true},{"id":"excursions","label":"Экскурсии","value":true},{"id":"toilet","label":"Туалет","value":true},{"id":"horse_rental","label":"Прокат лошадей","value":true},{"id":"petfriendly","label":"Можно с животными","value":true},{"id":"preliminary_registration","label":"Предварительная запись","value":true},{"id":"forest_trail","label":"Лесная трасса","value":true},{"id":"dressage_field","label":"Выездковое поле","value":true},{"id":"horse_jumping","label":"Конкур","value":true},{"id":"dressage_lessons","label":"Выездка","value":true},{"id":"wheelchair_access","label":"Доступность для посетителей на коляске","value":true,"note":"Источники одновременно сообщают полную и частичную доступность"},{"id":"rental_stalls","label":"Аренда денников","value":true},{"id":"veterinarian","label":"Ветеринарный врач","value":true},{"id":"parking_disabled","label":"Парковка для людей с инвалидностью","value":true},{"id":"gift_certificate","label":"Подарочные сертификаты","value":true},{"id":"horses_sale","label":"Продажа лошадей","value":true},{"id":"wifi","label":"Wi-Fi","value":true},{"id":"ramp","label":"Пандус","value":true}]$json$, 'Особенности клуба', 'Yandex Maps features; неподтверждено владельцем', 'object'),
      ('about.payment_methods', '["онлайн","СБП","наличные"]', 'Способы оплаты', 'Yandex Maps features; неподтверждено', 'object'),
      ('team.people', $json$[{"name":"Анастасия","roles":["Директор"],"phone":"+79219880772","sources":["vk"],"status":"reported"},{"name":"Виктория","roles":["Тренер начальной подготовки","Инструктор","Управляющий конюшней"],"phone":"+79818384831","sources":["vk","official_site"],"status":"role_conflict_preserved"},{"name":"Таисия","roles":["Тренер"],"sources":["yandex_reviews"],"status":"repeated_customer_reports"},{"name":"Полина","roles":["Инструктор","Сопровождающий прогулок"],"sources":["yandex_reviews"],"status":"customer_report"}]$json$, 'Команда клуба', 'В backend нет отдельной CMS-сущности персонала; неподтвержденные упоминания сохранены здесь', 'object'),
      ('horses.review_mentions', $json$[{"name":"Драккар","nickname":"Тортик"},{"name":"Будапешт"},{"name":"Персик"}]$json$, 'Лошади из отзывов', 'Не создаются в horse: неизвестны обязательные sex/slug и идентичность; Yandex reviews', 'object'),
      ('reviews.summary', $json${"rating":4.900000095367432,"rating_count":38,"review_count":31,"strengths":["ухоженные лошади","дружелюбная атмосфера","индивидуальный подход тренеров","занятия для детей и взрослых","безопасность и поддержка"],"source":"yandex_maps","collected_at":"2026-09-08"}$json$, 'Сводка отзывов', 'Динамические значения; обновить перед публикацией', 'object'),
      ('callback.title', 'Записаться или задать вопрос', 'Заголовок формы заявки', 'Редакционное значение', 'string'),
      ('callback.description', 'Оставьте имя и телефон — мы свяжемся с вами и поможем выбрать подходящий формат.', 'Описание формы заявки', 'Редакционное значение', 'string'),
      ('callback.submit_label', 'Отправить заявку', 'Кнопка формы заявки', 'Редакционное значение', 'string'),
      ('callback.success_message', 'Спасибо! Мы получили вашу заявку и скоро свяжемся с вами.', 'Сообщение об успешной заявке', 'Редакционное значение', 'string'),
      ('callback.consent_text', 'Я соглашаюсь с политикой обработки персональных данных', 'Текст согласия формы заявки', 'Безопасный fallback по scheme.md; согласие остаётся локальным UI/legal-состоянием', 'string'),
      ('callback.policy_url', '/about#privacy', 'Ссылка на политику обработки данных', 'Безопасный внутренний fallback по scheme.md', 'string'),
      ('legal.privacy_policy_text', 'Оставляя заявку, вы соглашаетесь на обработку имени, номера телефона и комментария исключительно для связи по вашему обращению. Чтобы отозвать согласие или уточнить сведения об обработке данных, свяжитесь с клубом по контактам, указанным на этой странице.', 'Текст политики обработки персональных данных', 'Юридический текст секции политики на странице «О клубе»', 'string'),
      ('services.notice', 'Цены и условия собраны из нескольких источников и могут измениться. Уточняйте актуальную стоимость при записи.', 'Предупреждение об актуальности цен', 'services.json warning', 'string'),
      ('services.lessons.intro', 'Занятия подбираются под уровень подготовки и цели всадника: доступны индивидуальные и групповые тренировки, а также абонементы.', 'Введение страницы занятий', 'Составлено по content.json и services.json; неподтверждено', 'string'),
      ('services.lessons.cta_label', 'Подобрать занятие', 'CTA страницы занятий', 'Редакционное значение по scheme.md', 'string'),
      ('services.rides.intro', 'Конная прогулка — возможность провести время с лошадьми и увидеть живописные маршруты рядом с клубом.', 'Введение страницы прогулок', 'Составлено по content.json и services.json; неподтверждено', 'string'),
      ('services.rides.preparation', $json$["Выберите удобную одежду по погоде","Наденьте закрытую обувь с небольшим каблуком","Перед прогулкой инструктор проведёт знакомство с лошадью и вводный инструктаж"]$json$, 'Подготовка к конной прогулке', 'Редакционный fallback; конкретные ограничения не найдены и не заявляются', 'object'),
      ('services.rides.safety', $json$["Следуйте указаниям сопровождающего инструктора","Сообщите инструктору об опыте верховой езды до начала прогулки","Уточните индивидуальные ограничения и условия при записи"]$json$, 'Безопасность на конной прогулке', 'Редакционный fallback; требует подтверждения владельцем', 'object'),
      ('services.rides.cta_label', 'Записаться на прогулку', 'CTA страницы прогулок', 'Редакционное значение по scheme.md', 'string'),
      ('services.boarding.intro', 'Постой частных лошадей в клубе «ИНЛав». Наличие мест, состав ухода и индивидуальные условия уточняются при обращении.', 'Введение страницы постоя', 'services.json и Yandex Maps; условия неподтверждены', 'string'),
      ('services.boarding.included', $json$["Размещение в деннике","Доступ к инфраструктуре клуба","Условия кормления и ухода согласовываются индивидуально"]$json$, 'Что входит в постой', 'Редакционный fallback по данным services.json; состав требует подтверждения владельцем', 'object'),
      ('services.boarding.requirements', $json$["Предварительно уточните наличие свободных мест","Расскажите о режиме содержания, кормления и особенностях здоровья лошади","Итоговые условия фиксируются после знакомства с лошадью"]$json$, 'Условия приёма на постой', 'Редакционный fallback; требует подтверждения владельцем', 'object'),
      ('services.boarding.cta_label', 'Уточнить наличие мест', 'CTA страницы постоя', 'Редакционное значение по scheme.md', 'string'),
      ('horses.intro', 'Познакомьтесь с лошадьми клуба. В каталоге публикуются только подтверждённые карточки из CMS.', 'Введение страницы лошадей', 'Редакционный текст по scheme.md; не создаёт Horse entities', 'string'),
      ('horses.empty_text', 'Скоро познакомим вас с лошадьми клуба', 'Пустое состояние каталога лошадей', 'Fallback из scheme.md', 'string'),
      ('horses.cta_label', 'Записаться на знакомство', 'CTA страницы лошадей', 'Редакционное значение по scheme.md', 'string'),
      ('news.intro', 'Новости, события и анонсы из жизни конного клуба «ИНЛав».', 'Введение страницы новостей', 'Редакционный текст по scheme.md', 'string'),
      ('news.empty_text', 'Новостей пока нет', 'Пустое состояние новостей', 'Fallback из scheme.md', 'string'),
      ('news.load_more_label', 'Показать ещё', 'Кнопка догрузки новостей', 'Fallback из scheme.md', 'string'),
      ('about.gallery_photo_ids', '[]', 'Фото галереи «О клубе»', 'Редакционный порядок UUID фотографий; пусто до появления include_ids в Photos API', 'object'),
      ('about.cta_label', 'Связаться с клубом', 'CTA страницы «О клубе»', 'Редакционное значение по scheme.md', 'string'),
      ('services.additional_offerings', $json$["иппотерапия","экскурсии","прокат лошадей","аренда денников","продажа лошадей","подарочные сертификаты","фотосессии с лошадьми","постой частных лошадей"]$json$, 'Дополнительные услуги', 'Yandex Maps features; цены не указаны, сохранены также в каталоге услуг', 'object'),
      ('media.base_path', '/media/ksk.inlove/', 'Базовый путь медиа', 'Логический публичный префикс; проверить при интеграции хранилища', 'string');

    INSERT INTO site_settings (
        id, created_at, updated_at, equestrian_id, key, value, name, description, type
    )
    SELECT gen_random_uuid(), now(), NULL, v_equestrian_id,
           source.key, source.value, source.name, source.description, source.type
      FROM inlove_settings_seed AS source
    ON CONFLICT (equestrian_id, key) DO UPDATE
       SET value = EXCLUDED.value,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           type = EXCLUDED.type,
           updated_at = now();

    -- Prices remain dedicated CMS entities. Duplicate-looking rows deliberately retain
    -- disagreements between official_site and Yandex owner's catalog.
    CREATE TEMP TABLE inlove_prices_seed (
        sort_order integer PRIMARY KEY,
        group_kind text NOT NULL,
        name text NOT NULL,
        slug text NOT NULL UNIQUE,
        description text,
        source text NOT NULL,
        price_rub integer
    ) ON COMMIT DROP;

    INSERT INTO inlove_prices_seed VALUES
      (1, 'main', 'Конные прогулки', 'horse-rides-official', 'Прогулки на лошадях по живописным маршрутам; сопровождение инструктора и безопасность.', 'official_site; collected 2026-09-08; unverified', 2500),
      (2, 'main', 'Индивидуальное занятие', 'individual-lesson-official', 'Индивидуальная тренировка, консультация по технике верховой езды и сопровождение инструктора.', 'official_site; collected 2026-09-08; unverified', 5000),
      (3, 'main', 'Групповое занятие', 'group-lesson-official', 'Обучение верховой езде в группе до 5 человек.', 'official_site; collected 2026-09-08; unverified', 4000),
      (4, 'main', 'Пакет обучения — 8 занятий', 'training-package-8-official', 'Комплексное обучение: 8 групповых тренировок, консультации и подготовка к соревнованиям.', 'official_site; collected 2026-09-08; unverified', 16000),
      (5, 'main', 'Абонемент на индивидуальные занятия', 'individual-membership-official', 'Индивидуальная программа, участие в мероприятиях клуба и консультации по уходу за лошадьми.', 'official_site; collected 2026-09-08; unverified', 24000),
      (6, 'main', 'Конная прогулка', 'horse-ride-yandex', 'Позиция каталога владельца организации.', 'yandex_maps_owner_catalog; collected 2026-09-08; unverified', 2500),
      (7, 'main', 'Абонемент на 4 занятия', 'subscription-4-yandex', 'Позиция каталога владельца организации.', 'yandex_maps_owner_catalog; collected 2026-09-08; unverified', 12000),
      (8, 'main', 'Тренировка по верховой езде', 'riding-training-yandex', 'Позиция каталога владельца организации.', 'yandex_maps_owner_catalog; collected 2026-09-08; unverified', 4000),
      (9, 'main', 'Абонемент на 8 занятий', 'subscription-8-yandex', 'Позиция каталога владельца организации.', 'yandex_maps_owner_catalog; collected 2026-09-08; unverified', 16000),
      (10, 'main', 'Постой частных лошадей', 'horse-boarding-yandex', 'Позиция каталога владельца организации.', 'yandex_maps_owner_catalog; collected 2026-09-08; unverified', 35000),
      (11, 'main', 'Абонемент на 8 индивидуальных тренировок', 'individual-subscription-8-yandex', 'Позиция каталога владельца организации.', 'yandex_maps_owner_catalog; collected 2026-09-08; unverified', 24000),
      (12, 'extra', 'Иппотерапия', 'hippotherapy', 'Услуга упомянута в характеристиках организации; стоимость не найдена.', 'yandex_maps_features; unverified', NULL),
      (13, 'extra', 'Экскурсии', 'excursions', 'Услуга упомянута в характеристиках организации; стоимость не найдена.', 'yandex_maps_features; unverified', NULL),
      (14, 'extra', 'Прокат лошадей', 'horse-rental', 'Услуга упомянута в характеристиках организации; стоимость не найдена.', 'yandex_maps_features; unverified', NULL),
      (15, 'extra', 'Аренда денников', 'stall-rental', 'Услуга упомянута в характеристиках организации; стоимость не найдена.', 'yandex_maps_features; unverified', NULL),
      (16, 'extra', 'Продажа лошадей', 'horse-sales', 'Услуга упомянута в характеристиках организации; стоимость не найдена.', 'yandex_maps_features; unverified', NULL),
      (17, 'extra', 'Подарочные сертификаты', 'gift-certificates', 'Услуга упомянута в характеристиках организации; стоимость не найдена.', 'yandex_maps_features; unverified', NULL),
      (18, 'extra', 'Фотосессии с лошадьми', 'horse-photo-sessions', 'Услуга упомянута в характеристиках организации; стоимость не найдена.', 'yandex_maps_features; unverified', NULL);

    INSERT INTO prices (
        id, created_at, updated_at, equestrian_id, name, description,
        page_data, slug, price_tables
    )
    SELECT gen_random_uuid(), now(), NULL, v_equestrian_id,
           source.name,
           left(source.description || ' Источник: ' || source.source || '.', 511),
           '<p>' || source.description || '</p>',
           source.slug,
           CASE WHEN source.price_rub IS NULL THEN '[]'::jsonb ELSE
             jsonb_build_array(jsonb_build_object(
               'columns', jsonb_build_array(
                 jsonb_build_object('key','format','title','Услуга','annotation','','cell_formatter',jsonb_build_array()),
                 jsonb_build_object('key','price','title','Цена','annotation','','cell_formatter',jsonb_build_array('text_bold'))
               ),
               'rows', jsonb_build_array(jsonb_build_object('cells', jsonb_build_object(
                 'format', jsonb_build_object('value',source.name,'annotation','','cell_formatter',jsonb_build_array()),
                 'price', jsonb_build_object('value',to_char(source.price_rub, 'FM999G999G999') || ' ₽','annotation','','cell_formatter',jsonb_build_array())
               )))
             )) END
      FROM inlove_prices_seed AS source
    ON CONFLICT (equestrian_id, slug) DO UPDATE
       SET name = EXCLUDED.name,
           description = EXCLUDED.description,
           page_data = EXCLUDED.page_data,
           price_tables = EXCLUDED.price_tables,
           updated_at = now();

    SELECT id INTO v_main_group_id
      FROM price_groups
     WHERE equestrian_id = v_equestrian_id AND name = 'Основные услуги'
     ORDER BY created_at NULLS LAST, id
     LIMIT 1;
    IF v_main_group_id IS NULL THEN
      v_main_group_id := gen_random_uuid();
      INSERT INTO price_groups (id, created_at, updated_at, equestrian_id, name, description)
      VALUES (v_main_group_id, now(), NULL, v_equestrian_id, 'Основные услуги', 'Тарифы из official_site и каталога владельца в Yandex Maps; данные не подтверждены.');
    END IF;

    SELECT id INTO v_extra_group_id
      FROM price_groups
     WHERE equestrian_id = v_equestrian_id AND name = 'Дополнительные услуги'
     ORDER BY created_at NULLS LAST, id
     LIMIT 1;
    IF v_extra_group_id IS NULL THEN
      v_extra_group_id := gen_random_uuid();
      INSERT INTO price_groups (id, created_at, updated_at, equestrian_id, name, description)
      VALUES (v_extra_group_id, now(), NULL, v_equestrian_id, 'Дополнительные услуги', 'Предложения из Yandex Maps без найденной стоимости; данные не подтверждены.');
    END IF;

    -- Rebuild only relations owned by this seed. This also makes recovery after a
    -- partially completed earlier run deterministic and avoids display_order clashes.
    DELETE FROM price_groups_relations AS relation
     USING prices AS p, inlove_prices_seed AS source
     WHERE relation.price_id = p.id
       AND p.equestrian_id = v_equestrian_id
       AND p.slug = source.slug
       AND relation.group_id IN (v_main_group_id, v_extra_group_id);

    INSERT INTO price_groups_relations (id, price_id, group_id, display_order)
    SELECT gen_random_uuid(), p.id,
           CASE WHEN source.group_kind = 'main' THEN v_main_group_id ELSE v_extra_group_id END,
           row_number() OVER (PARTITION BY source.group_kind ORDER BY source.sort_order)
      FROM inlove_prices_seed AS source
      JOIN prices AS p
        ON p.equestrian_id = v_equestrian_id AND p.slug = source.slug;

END
$seed$;

COMMIT;
