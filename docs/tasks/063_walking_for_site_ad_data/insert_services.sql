BEGIN;

DO $sql$
DECLARE
    v_equestrian_id uuid;
    v_group_id uuid;
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

    -- Маршрут 3 уже присутствует в дампе. Переиспользуем запись, чтобы не
    -- создавать вторую услугу с теми же маршрутом и ценами.
    UPDATE prices
       SET name = 'Активная прогулка в полях Павловска',
           slug = 'aktivnaya-progulka-v-polyah-pavlovska',
           updated_at = now()
     WHERE equestrian_id = v_equestrian_id
       AND slug = 'konnaya-progulka-v-polyah'
       AND NOT EXISTS (
           SELECT 1
             FROM prices
            WHERE equestrian_id = v_equestrian_id
              AND slug = 'aktivnaya-progulka-v-polyah-pavlovska'
       );

    CREATE TEMP TABLE walking_services_063 (
        sort_order integer PRIMARY KEY,
        name varchar(63) NOT NULL,
        slug varchar(63) NOT NULL,
        description varchar(511),
        page_data text NOT NULL,
        price_tables jsonb NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO walking_services_063 VALUES
    (
        1,
        'Прогулка по парку Александрова Дача',
        'progulka-po-parku-aleksandrova-dacha',
        'Спокойная получасовая прогулка верхом по историческому парку Александрова Дача. Подходит детям и взрослым без опыта верховой езды. Инструктор ведёт лошадь в поводу и помогает сделать фотографии.',
        $page1$<article>
  <h1>Конная прогулка по парку Александрова Дача</h1>
  <p><strong>Продолжительность: 30 минут.</strong></p>
  <p>Приглашаем на неспешную шаговую прогулку верхом по историческому парку Александрова Дача с возможностью увидеть обитателей нашей фермы.</p>
  <p>Маршрут подходит детям и взрослым без опыта верховой езды. Инструктор ведёт лошадь в поводу, находится рядом на протяжении всей прогулки и помогает сделать фотографии на память.</p>
  <h2>Стоимость</h2>
  <ul>
    <li>Будни по записи — 1 500 р.; без записи — 2 000 р.</li>
    <li>Выходные и праздники по записи — 1 800 р.; без записи — 2 300 р.</li>
  </ul>
  <p><strong>Бронирование по телефону с 10:30 до 19:30.</strong></p>
</article>$page1$,
        $json1$[{
          "columns": [
            {"key":"format","title":"Формат","annotation":"","cell_formatter":[]},
            {"key":"weekday","title":"Будни","annotation":"","cell_formatter":[]},
            {"key":"weekend","title":"Выходные и праздники","annotation":"","cell_formatter":[]}
          ],
          "rows": [
            {"cells":{"format":{"value":"По предварительной записи","annotation":"","cell_formatter":[]},"weekday":{"value":"1 500 р.","annotation":"","cell_formatter":[]},"weekend":{"value":"1 800 р.","annotation":"","cell_formatter":[]}}},
            {"cells":{"format":{"value":"Без записи","annotation":"","cell_formatter":[]},"weekday":{"value":"2 000 р.","annotation":"","cell_formatter":[]},"weekend":{"value":"2 300 р.","annotation":"","cell_formatter":[]}}}
          ]
        }]$json1$::jsonb
    ),
    (
        2,
        'Прогулка по парку Мариенталь и к замку БИП',
        'progulka-po-parku-mariental-i-k-zamku-bip',
        'Спокойная прогулка верхом по парку Мариенталь вдоль реки Славянки и к замку БИП в Павловске. Маршрут проходит шагом и подходит начинающим, взрослым и детям. Для детей предоставляются пони.',
        $page2$<article>
  <h1>Конная прогулка по парку Мариенталь и к замку БИП</h1>
  <p><strong>Продолжительность: 1 час 15 минут.</strong></p>
  <p>Приглашаем на неспешную прогулку верхом по красивым аллеям парка Мариенталь вдоль реки Славянки и к замку БИП в Павловске.</p>
  <p>Маршрут проходит строго шагом, поэтому с ним справятся даже начинающие. Для взрослых предоставляются лошади, для детей — пони. При отсутствии опыта каждого всадника сопровождает инструктор.</p>
  <p>Инструктор едет верхом рядом и помогает сделать памятные фотографии на фоне замка БИП.</p>
  <h2>Стоимость</h2>
  <ul>
    <li>Будни — 4 000 р. с человека для группы от двух человек.</li>
    <li>Выходные — 4 500 р. с человека для группы от двух человек.</li>
    <li>Индивидуальная прогулка — 5 000 р.</li>
  </ul>
  <p>Количество мест на выходные ограничено. <strong>Бронирование по телефону с 10:30 до 19:30.</strong></p>
</article>$page2$,
        $json2$[{
          "columns": [
            {"key":"format","title":"Формат","annotation":"","cell_formatter":[]},
            {"key":"weekday","title":"Будни","annotation":"","cell_formatter":[]},
            {"key":"weekend","title":"Выходные","annotation":"","cell_formatter":[]}
          ],
          "rows": [
            {"cells":{"format":{"value":"От 2 человек, цена за человека","annotation":"","cell_formatter":[]},"weekday":{"value":"4 000 р.","annotation":"","cell_formatter":[]},"weekend":{"value":"4 500 р.","annotation":"","cell_formatter":[]}}},
            {"cells":{"format":{"value":"Индивидуально","annotation":"","cell_formatter":[]},"weekday":{"value":"5 000 р.","annotation":"","cell_formatter":[]},"weekend":{"value":"5 000 р.","annotation":"","cell_formatter":[]}}}
          ]
        }]$json2$::jsonb
    ),
    (
        3,
        'Активная прогулка в полях Павловска',
        'aktivnaya-progulka-v-polyah-pavlovska',
        'Активная конная прогулка в полях Павловска продолжительностью один или два часа. Маршрут проходит на всех аллюрах и предназначен только для опытных всадников. Итоговый маршрут определяет инструктор.',
        $page3$<article>
  <h1>Активная конная прогулка в полях Павловска</h1>
  <p><strong>Продолжительность: 1 или 2 часа.</strong></p>
  <p>Активный маршрут для опытных всадников проходит по полям в окрестностях Павловска и включает все аллюры лошади.</p>
  <p><strong>Важно:</strong> инструктор оценивает уровень подготовки всадника перед выездом. Если опыта недостаточно для безопасного прохождения маршрута, инструктор вправе заменить выезд занятием с катанием по парку или выбрать маршрут, соответствующий уровню всадника.</p>
  <h2>Стоимость</h2>
  <ul>
    <li>1 час — 3 000 р. в будни; 3 500 р. в выходные и праздники.</li>
    <li>2 часа — 5 000 р. в будни; 5 500 р. в выходные и праздники.</li>
  </ul>
  <p><strong>Бронирование по телефону с 10:30 до 19:30.</strong></p>
</article>$page3$,
        $json3$[{
          "columns": [
            {"key":"duration","title":"Продолжительность","annotation":"","cell_formatter":[]},
            {"key":"weekday","title":"Будни","annotation":"","cell_formatter":[]},
            {"key":"weekend","title":"Выходные и праздники","annotation":"","cell_formatter":[]}
          ],
          "rows": [
            {"cells":{"duration":{"value":"1 час","annotation":"","cell_formatter":[]},"weekday":{"value":"3 000 р.","annotation":"","cell_formatter":[]},"weekend":{"value":"3 500 р.","annotation":"","cell_formatter":[]}}},
            {"cells":{"duration":{"value":"2 часа","annotation":"","cell_formatter":[]},"weekday":{"value":"5 000 р.","annotation":"","cell_formatter":[]},"weekend":{"value":"5 500 р.","annotation":"","cell_formatter":[]}}}
          ]
        }]$json3$::jsonb
    ),
    (
        4,
        'Прогулки в Нижнем парке Пушкина',
        'progulki-v-nizhnem-parke-pushkina',
        'Конные прогулки верхом или в карете по Нижнему парку Пушкина. Спокойные маршруты для начинающих и детей на пони, активные прогулки для опытных всадников и фотосопровождение по желанию.',
        $page4$<article>
  <h1>Конные прогулки в Нижнем парке Пушкина</h1>
  <p>Приглашаем на прогулки верхом и в карете, а также фотопрогулки по тихому лесопарку с тенистыми и старыми дубовыми аллеями, открытыми полянами и видами на Колонистский пруд.</p>
  <p>Начинающим всадникам и детям доступны спокойные прогулки продолжительностью 30 минут или 1 час. Для детей предоставляются пони. Опытные всадники могут выбрать часовую активную прогулку на всех аллюрах.</p>
  <h2>Прогулки верхом</h2>
  <ul>
    <li>Для начинающих и детей: 30 минут — 5 000 р.; 1 час — 7 000 р.</li>
    <li>Для опытных всадников, 1 час: 7 000 р. в будни; 8 000 р. в выходные.</li>
  </ul>
  <h2>Прогулки в карете</h2>
  <p>Количество пассажиров не ограничено. Минимальный заказ выезда — 1 час.</p>
  <ul><li>30 минут — 8 000 р.</li><li>1 час — 15 000 р.</li></ul>
  <h2>Фото- и видеосопровождение</h2>
  <p>Сопровождение профессионального фотографа или видеооператора — 5 000 р. в час.</p>
  <p><strong>Бронирование по телефону с 10:30 до 19:30.</strong></p>
</article>$page4$,
        $json4$[{
          "columns": [
            {"key":"format","title":"Формат","annotation":"","cell_formatter":[]},
            {"key":"price","title":"Цена","annotation":"","cell_formatter":["text_bold"]}
          ],
          "rows": [
            {"cells":{"format":{"value":"Верхом, начинающие и дети — 30 мин.","annotation":"","cell_formatter":[]},"price":{"value":"5 000 р.","annotation":"","cell_formatter":[]}}},
            {"cells":{"format":{"value":"Верхом, начинающие и дети — 1 час","annotation":"","cell_formatter":[]},"price":{"value":"7 000 р.","annotation":"","cell_formatter":[]}}},
            {"cells":{"format":{"value":"Верхом, опытные всадники — 1 час, будни","annotation":"","cell_formatter":[]},"price":{"value":"7 000 р.","annotation":"","cell_formatter":[]}}},
            {"cells":{"format":{"value":"Верхом, опытные всадники — 1 час, выходные","annotation":"","cell_formatter":[]},"price":{"value":"8 000 р.","annotation":"","cell_formatter":[]}}},
            {"cells":{"format":{"value":"В карете — 30 мин., количество пассажиров не ограничено","annotation":"","cell_formatter":[]},"price":{"value":"8 000 р.","annotation":"","cell_formatter":[]}}},
            {"cells":{"format":{"value":"В карете — 1 час, количество пассажиров не ограничено","annotation":"","cell_formatter":[]},"price":{"value":"15 000 р.","annotation":"","cell_formatter":[]}}},
            {"cells":{"format":{"value":"Фотограф или видеооператор — 1 час","annotation":"","cell_formatter":[]},"price":{"value":"5 000 р.","annotation":"","cell_formatter":[]}}}
          ]
        }]$json4$::jsonb
    );

    INSERT INTO prices (
        id, created_at, updated_at, name, description,
        page_data, slug, price_tables, equestrian_id
    )
    SELECT
        gen_random_uuid(), now(), NULL, source.name, source.description,
        source.page_data, source.slug, source.price_tables, v_equestrian_id
      FROM walking_services_063 AS source
    ON CONFLICT (equestrian_id, slug) DO UPDATE
       SET name = EXCLUDED.name,
           description = EXCLUDED.description,
           page_data = EXCLUDED.page_data,
           price_tables = EXCLUDED.price_tables,
           updated_at = now();

    INSERT INTO price_groups_relations (id, price_id, group_id, display_order)
    SELECT
        gen_random_uuid(),
        p.id,
        v_group_id,
        existing.max_order + row_number() OVER (ORDER BY source.sort_order)
      FROM walking_services_063 AS source
      JOIN prices AS p
        ON p.equestrian_id = v_equestrian_id
       AND p.slug = source.slug
      CROSS JOIN LATERAL (
          SELECT COALESCE(MAX(display_order), 0) AS max_order
            FROM price_groups_relations
           WHERE group_id = v_group_id
      ) AS existing
     WHERE NOT EXISTS (
         SELECT 1
           FROM price_groups_relations AS relation
          WHERE relation.price_id = p.id
            AND relation.group_id = v_group_id
     );
END
$sql$;

COMMIT;
