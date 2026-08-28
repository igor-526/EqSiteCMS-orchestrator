BEGIN;

DO $sql$
DECLARE
    v_equestrian_id uuid;
    v_group_id uuid;
    v_price_id uuid;
    v_display_order integer;
BEGIN
    SELECT id
      INTO STRICT v_equestrian_id
      FROM equestrians
     WHERE name = 'ЦКСК "Александрова дача"';

    SELECT id
      INTO STRICT v_group_id
      FROM price_groups
     WHERE equestrian_id = v_equestrian_id
       AND name = 'Конные прогулки и катания'
     FOR UPDATE;

    INSERT INTO prices (
        id,
        created_at,
        updated_at,
        name,
        description,
        page_data,
        slug,
        price_tables,
        equestrian_id
    )
    VALUES (
        gen_random_uuid(),
        now(),
        NULL,
        'Конные прогулки',
        'Конные прогулки на лошадях и пони по паркам Пушкина и Павловска: Александрова Дача, Мариенталь и Нижний парк, а также активные маршруты в полях. Для начинающих, детей и опытных всадников. Бронирование по телефону с 10:30 до 19:30.',
        $page$
<article>
  <header>
    <h1>Конные прогулки в Пушкине и Павловске</h1>
    <p>Приглашаем взрослых и детей на прогулки верхом на лошадях и пони по живописным паркам Царского Села и Павловска. Выберите спокойный маршрут для первого знакомства с верховой ездой или активный выезд для опытных всадников.</p>
    <p><strong>Бронирование по телефону с 10:30 до 19:30.</strong> Количество мест на выходные ограничено, поэтому рекомендуем записываться заранее.</p>
  </header>

  <section>
    <h2>Маршрут 1. Парк Александрова Дача</h2>
    <p><strong>Продолжительность: 30 минут.</strong></p>
    <p>Неспешная шаговая прогулка по историческому парку с возможностью увидеть обитателей нашей фермы. Маршрут подходит детям и взрослым без опыта верховой езды.</p>
    <p>Инструктор ведёт лошадь в поводу, находится рядом на протяжении всей прогулки и поможет сделать фотографии на память.</p>
    <h3>Стоимость</h3>
    <ul>
      <li>Будни по записи — 1 500 р.; без записи — 2 000 р.</li>
      <li>Выходные и праздники по записи — 1 800 р.; без записи — 2 300 р.</li>
    </ul>
  </section>

  <section>
    <h2>Маршрут 2. Парк Мариенталь и замок БИП</h2>
    <p><strong>Продолжительность: 1 час 15 минут.</strong></p>
    <p>Спокойная прогулка по красивым аллеям вдоль реки Славянки с фотографиями на фоне замка БИП в Павловске. Маршрут проходит строго шагом, поэтому с ним справятся даже начинающие.</p>
    <ul>
      <li>Для взрослых предоставляются лошади, для детей — пони.</li>
      <li>При отсутствии опыта каждого всадника сопровождает инструктор.</li>
      <li>Инструктор едет верхом рядом и помогает сделать памятные кадры.</li>
    </ul>
    <p>Позвольте себе небольшое аристократическое приключение в одном из самых красивых мест Павловска.</p>
    <h3>Стоимость</h3>
    <ul>
      <li>Будни — 4 000 р. с человека для группы от двух человек.</li>
      <li>Выходные и праздники — 4 500 р. с человека для группы от двух человек.</li>
      <li>Индивидуальная прогулка — 5 000 р.</li>
    </ul>
  </section>

  <section>
    <h2>Маршрут 3. Активная прогулка в полях Павловска</h2>
    <p><strong>Продолжительность: 1 или 2 часа.</strong></p>
    <p>Активный маршрут для опытных всадников проходит по полям в окрестностях Павловска и включает все аллюры лошади.</p>
    <p><strong>Важно:</strong> инструктор оценивает уровень подготовки перед выездом. Если опыта недостаточно для безопасного прохождения маршрута, прогулка будет заменена занятием с катанием по парку или маршрутом, соответствующим уровню всадника.</p>
    <h3>Стоимость</h3>
    <ul>
      <li>1 час — 3 000 р. в будни; 3 500 р. в выходные и праздники.</li>
      <li>2 часа — 5 000 р. в будни; 5 500 р. в выходные и праздники.</li>
    </ul>
  </section>

  <section>
    <h2>Маршрут 4. Нижний парк Пушкина</h2>
    <p>Прогулки верхом и в карете, а также фотопрогулки по тихому лесопарку со старыми дубовыми аллеями, открытыми полянами и видами на Колонистский пруд.</p>
    <p>Начинающим всадникам и детям доступны спокойные прогулки продолжительностью 30 минут или 1 час. Опытные всадники могут выбрать часовую активную прогулку на всех аллюрах.</p>
    <p>Карету можно заказать для компании любого размера. Минимальный заказ выезда — 1 час; стоимость получасового формата указана для расчёта продолжительности прогулки.</p>
    <p>По желанию прогулку сопровождает профессиональный фотограф или видеооператор.</p>
    <h3>Стоимость прогулок верхом</h3>
    <ul>
      <li>Для начинающих и детей: 30 минут — 5 000 р.; 1 час — 7 000 р.</li>
      <li>Для опытных всадников, 1 час: 7 000 р. в будни; 8 000 р. в выходные.</li>
    </ul>
    <h3>Стоимость прогулок в карете</h3>
    <ul>
      <li>30 минут — 8 000 р.</li>
      <li>1 час — 15 000 р.</li>
      <li>Сопровождение фотографа или видеооператора — 5 000 р. в час.</li>
    </ul>
  </section>
</article>
        $page$,
        'konnye-progulki',
        $json$
[
  {
    "columns": [
      {"key": "route", "title": "Маршрут", "annotation": "", "cell_formatter": []},
      {"key": "duration", "title": "Продолжительность", "annotation": "", "cell_formatter": []},
      {"key": "price", "title": "Цена", "annotation": "", "cell_formatter": ["text_bold"]}
    ],
    "rows": [
      {"cells": {
        "route": {"value": "Парк Александрова Дача", "annotation": "", "cell_formatter": []},
        "duration": {"value": "30 мин.", "annotation": "", "cell_formatter": []},
        "price": {"value": "от 1 500 р.", "annotation": "Цена зависит от дня и предварительной записи", "cell_formatter": []}
      }},
      {"cells": {
        "route": {"value": "Парк Мариенталь и замок БИП", "annotation": "", "cell_formatter": []},
        "duration": {"value": "1 ч. 15 мин.", "annotation": "", "cell_formatter": []},
        "price": {"value": "от 4 000 р. с человека", "annotation": "Цена для группы от двух человек", "cell_formatter": []}
      }},
      {"cells": {
        "route": {"value": "Поля Павловска", "annotation": "Для опытных всадников", "cell_formatter": []},
        "duration": {"value": "1–2 часа", "annotation": "", "cell_formatter": []},
        "price": {"value": "от 3 000 р.", "annotation": "Цена зависит от продолжительности и дня недели", "cell_formatter": []}
      }},
      {"cells": {
        "route": {"value": "Нижний парк Пушкина — верхом", "annotation": "", "cell_formatter": []},
        "duration": {"value": "30 мин. – 1 час", "annotation": "", "cell_formatter": []},
        "price": {"value": "от 5 000 р.", "annotation": "Цена зависит от продолжительности и уровня всадника", "cell_formatter": []}
      }},
      {"cells": {
        "route": {"value": "Нижний парк Пушкина — в карете", "annotation": "Количество пассажиров не ограничено", "cell_formatter": []},
        "duration": {"value": "30 мин. – 1 час", "annotation": "Выезд от одного часа", "cell_formatter": []},
        "price": {"value": "от 8 000 р.", "annotation": "Цена зависит от продолжительности", "cell_formatter": []}
      }},
      {"cells": {
        "route": {"value": "Фотограф или видеооператор", "annotation": "Сопровождение прогулки", "cell_formatter": []},
        "duration": {"value": "1 час", "annotation": "", "cell_formatter": []},
        "price": {"value": "5 000 р.", "annotation": "Фиксированная цена за час", "cell_formatter": []}
      }}
    ]
  }
]
        $json$::jsonb,
        v_equestrian_id
    )
    ON CONFLICT (equestrian_id, slug) DO UPDATE
       SET name = EXCLUDED.name,
           description = EXCLUDED.description,
           page_data = EXCLUDED.page_data,
           price_tables = EXCLUDED.price_tables,
           updated_at = now()
    RETURNING id INTO v_price_id;

    IF NOT EXISTS (
        SELECT 1
          FROM price_groups_relations
         WHERE price_id = v_price_id
           AND group_id = v_group_id
    ) THEN
        SELECT COALESCE(MAX(display_order), 0) + 1
          INTO v_display_order
          FROM price_groups_relations
         WHERE group_id = v_group_id;

        INSERT INTO price_groups_relations (
            id,
            price_id,
            group_id,
            display_order
        )
        VALUES (
            gen_random_uuid(),
            v_price_id,
            v_group_id,
            v_display_order
        );
    END IF;
END
$sql$;

COMMIT;
