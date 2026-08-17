-- Одноразовое обновление кличек лошадей по данным to_change.json.
-- Сгенерировано для 150 записей. Скрипт атомарен: любая ошибка откатывает все изменения.

BEGIN;

CREATE TEMP TABLE tmp_horse_rename (
    id uuid PRIMARY KEY,
    name varchar(63) NOT NULL,
    pedigree_name varchar(63) NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_horse_rename (id, name, pedigree_name)
VALUES
    ('e86f50a5-0abf-5042-87b2-c944a3b39860'::uuid, 'Colne Hyperion', 'Colne Hyperion (GB)'),
    ('27dc19d5-1adc-5697-b411-986492de99f5'::uuid, 'Colne Helena', 'Colne Helena (GB)'),
    ('8152d92c-c1a1-5b4c-b583-67d9f866a992'::uuid, 'Weston Best Man', 'Weston Best Man (GB)'),
    ('e8907fc5-3b17-5d0e-bcb6-10e6cce2a255'::uuid, 'Ysselvliedt''s High Guy', 'Ysselvliedt''s High Guy (NDR)'),
    ('a1936b21-9975-4686-9f70-13f5cc36bbff'::uuid, 'Темза', 'Темза А21'),
    ('f1d8149b-bed3-5bed-9b19-0691c07578fe'::uuid, 'Ysselvliedt''s No Limit', 'Ysselvliedt''s No Limit (NDR)'),
    ('fc41d9fa-a4d8-5264-bdf0-c770f1550b0b'::uuid, 'Ysselvliedt''s Nanna Ni', 'Ysselvliedt''s Nanna Ni (NDR)'),
    ('093d05f1-5398-507e-bf47-32896e78745a'::uuid, 'Алиса', '1 Алиса'),
    ('5fd5ba65-0210-54b7-848c-39efbdfa6239'::uuid, 'Аделина', '633 Аделина'),
    ('a49e32e3-9b12-50d7-9c95-05da30b24793'::uuid, 'Аделия', 'Аделия ПКЗ'),
    ('7bf0ea8c-f5ec-4b54-b72a-1f8b5e2db97a'::uuid, 'Сюси', 'Сюси А386 Н (GER)'),
    ('b49f437b-06d1-4398-ae0f-d40441833e22'::uuid, 'Еланга', '717 Еланга'),
    ('35cc1656-372a-4aa7-96b5-08e7844cd869'::uuid, 'Цита', '172 Цита'),
    ('bc4dc176-2a47-47ed-a6e5-35b16f2ecb65'::uuid, 'Pfiff', 'Pfiff II'),
    ('a2ac61c9-a372-41de-86a2-9ef082a91c84'::uuid, 'Пиколо', 'Пиколо (GER)'),
    ('731b9398-7e4e-49d6-b764-884831db9d12'::uuid, 'Елк', '229 Елк'),
    ('20dd8fe5-48ca-5610-9c71-e1b1b8bdf600'::uuid, 'Кашкай', '284 Кашкай'),
    ('56acd058-42df-41be-8230-3a2c1f6d4590'::uuid, 'Золотинка', '400 Золотинка'),
    ('48d4f120-8475-5e21-b414-badd00273dec'::uuid, 'Бабочка', 'Бабочка iiiв'),
    ('3b8541d3-855d-53a6-bdcf-a6608d726213'::uuid, 'Баркас', 'Баркас с'),
    ('4d9cb7d6-472d-5669-96dc-c8ca74becbce'::uuid, 'Былина', 'Былина iс'),
    ('454e2d42-c502-4dc7-9439-9485bd4181e3'::uuid, 'Revel Jeeves', 'Revel Jeeves (GB)'),
    ('f432ba16-be36-5c27-aa50-a950ad997e4e'::uuid, 'Вайс', '6 Вайс'),
    ('f039f131-6bc4-4e0e-b0d0-3c17305d0e0a'::uuid, 'Пуппе', 'Пуппе А 278 Н (GER)'),
    ('46cb4b1a-54f4-5199-9f7f-8f0584e7713b'::uuid, 'Голубка', 'Голубка iв'),
    ('c8eed635-2b18-4d36-9651-68fd37f0a5bc'::uuid, 'Декадент', '10 Декадент'),
    ('de6fffcb-2587-5add-98b1-cc9501a6d7e5'::uuid, 'Есперанса', 'Есперанса А15'),
    ('162270d1-3b31-4b51-83e1-2e55f355f83e'::uuid, 'Kassandra', '742 Kassandra (GER)'),
    ('c23bf373-e0bc-5bd4-9411-ea88cf842a98'::uuid, 'Гривна', 'Гривна в'),
    ('39eb75ce-055f-5f2a-bd22-7c1551867939'::uuid, 'Гуля', 'Гуля iii в'),
    ('eaf4ab61-3360-52d0-8be9-ba6962deaf27'::uuid, 'Дивный', '154 Дивный'),
    ('002da03e-7d38-5ffb-bf0d-d8eab345f147'::uuid, 'Доктрина', '219 Доктрина'),
    ('55e6fe16-7424-58b1-8fb8-0300f4c8d4ea'::uuid, 'Европа', '238 Европа'),
    ('c93b0166-4a20-5a72-8342-0d698523247e'::uuid, 'Доступная', '224 Доступная'),
    ('fd7f3978-9b42-4872-906c-c32f488af0f7'::uuid, 'Пит', 'Пит А110 (GER)'),
    ('a5865be5-7b81-54a3-8318-736f90a833f4'::uuid, 'Егоза', '239 Егоза'),
    ('0dd713e4-216b-4439-bdfa-2ac0c5ef2f6c'::uuid, 'Дородный', '16 Дородный'),
    ('9b167f85-9342-402a-a5b1-85914b46d759'::uuid, 'Karon', 'Karon I'),
    ('fbab59b1-f8bf-50ec-aeca-0d50e998e6c4'::uuid, 'Есения', '74 Есения'),
    ('e74a4d10-0b7a-412d-901a-bbb23507a9b2'::uuid, 'Дерновая', '30 Дерновая'),
    ('3f72431d-15f8-5c51-a20f-aa0b4f05cfc3'::uuid, 'Ельса', 'Ельса А19'),
    ('befcb051-7fd9-5755-aefb-2f084d299243'::uuid, 'Заря', '403 Заря'),
    ('04c181be-415e-5cf1-8fc6-5b92b43c97aa'::uuid, 'Змейка', '76 Змейка'),
    ('49d0b8c7-75e0-5477-a033-889d880a3fc6'::uuid, 'Златица', '581 Златица'),
    ('fe43b914-c8ce-5386-b01f-6446a5cf8f4c'::uuid, 'Зимушка', '252 Зимушка'),
    ('7ea40fc6-79be-576d-a3ef-ec6465a8cf1b'::uuid, 'Еремей', '164 Еремей'),
    ('31edfbf8-f076-5b97-ad23-486beac420a1'::uuid, 'Кай', '21 Кай'),
    ('7d11c6b9-b923-4768-9e43-80fbec3b266b'::uuid, 'Анка', 'Анка А519 Н (GER)'),
    ('32b4c80a-2cb9-5721-8b5a-f311cca5152c'::uuid, 'Катя', 'Катя A469 H'),
    ('48de1205-6d11-59e1-a2af-4e5531d462ca'::uuid, 'Евгеника', '237 Евгеника'),
    ('783abe00-09cb-5148-a446-1c2cab56f03b'::uuid, 'Кондор', '78 Кондор'),
    ('9fcb1799-1885-5a80-beff-fb310de0bc13'::uuid, 'Камея', '255 Камея'),
    ('14db9a5a-fd6d-5f92-84b1-e6bc1ef2fc3d'::uuid, 'Керри', '81 Керри (GER)'),
    ('25ba7f96-ff1c-4968-8b82-fb0fa983ef77'::uuid, 'Рони', 'Рони А176 Н (GER)'),
    ('12945236-e19d-4f40-be45-d989ddb9d619'::uuid, 'Нурми', 'Нурми А83 (GER)'),
    ('d90d1c1a-c9b6-4a66-bbcd-8d89e925c5bb'::uuid, 'Kai', 'Kai A243'),
    ('ead1ab28-2264-4102-b1e4-8cc7bd6c52cb'::uuid, 'Carnalw Hyderus', 'Carnalw Hyderus (GB)'),
    ('cb0ce3c4-9d48-5824-9654-ddc0a6d4a9ff'::uuid, 'Пьер', '116 Пьер'),
    ('9b900c7f-5c6d-5bd2-8c5d-b1e99e96c3d8'::uuid, 'Мармелад', '91 Мармелад I'),
    ('31d780d1-af2a-42fc-8c11-cb2edc08a982'::uuid, 'Revel Confetti', 'Revel Confetti (GB)'),
    ('982e85de-dea6-5b20-ab36-18e2b12ee793'::uuid, 'Маг', '82 Маг'),
    ('629e701f-0db8-4cf6-b54c-4838de49f371'::uuid, 'Морвик', 'Морвик А171 (GER)'),
    ('2d88947e-417d-57a6-ab97-9435f895a709'::uuid, 'Магнат', '83 Магнат I'),
    ('0ebbeeee-f182-550a-baa7-07737ace8153'::uuid, 'Магнолия', '502 Магнолия'),
    ('9103f4e3-9719-4486-84a2-5088c05f27d0'::uuid, 'Моника', 'Моника А113 Н (GER)'),
    ('d9dcd9cb-4b2b-4590-890d-b58212cf63ed'::uuid, 'Mondy', 'Mondy A771 H'),
    ('9aea599d-038e-4ad3-bfe4-5d1dcec1cb4b'::uuid, 'Coed Coch Barrog', 'Coed Coch Barrog (NDR)'),
    ('18f27b20-3b80-4ef1-ba1e-593ec3c20ce3'::uuid, 'Пилти', '305 Пилти'),
    ('083078ee-b917-5ba7-81c1-4e9794276f9e'::uuid, 'Моппел', '26 Моппел А103 (GER)'),
    ('212e59bd-f603-5ace-a5c0-53e769132c03'::uuid, 'Могучий', 'Могучий с'),
    ('a0f096ae-112e-5696-9720-20f0ad531e9a'::uuid, 'Москито', 'Москито А106'),
    ('eec237ce-49d7-4f37-b946-86d88248bebb'::uuid, 'Петра', 'Петра А72 Н (GER)'),
    ('0eaad7e3-e2b9-5c60-b7e3-472d532bafd7'::uuid, 'Норманн', 'Норманн А68 (GER)'),
    ('05c89b7e-2518-56ac-a669-412bdcb467e8'::uuid, 'Натя', 'Натя А216 Н (GER)'),
    ('cd3a10c4-52f5-4b1a-a268-5b78a479c513'::uuid, 'Кемпфер', 'Кемпфер А67 (GER)'),
    ('ce1ac1d7-f011-5728-b4df-7bc96e266b1f'::uuid, 'Мим', '97 Мим II'),
    ('42e965c6-c872-418c-af17-cbc89115eb86'::uuid, 'Moppel', 'Moppel II A111'),
    ('7a909c73-6a6f-4375-b8ad-693e5510b8db'::uuid, 'Pinguin', 'Pinguin А92 (GER)'),
    ('b44407a1-22fe-5f79-8e52-849d261272dd'::uuid, 'Паула', '125 Паула (GER)'),
    ('50bec9ea-57cb-40e3-afb0-a4c720cb82db'::uuid, 'Ранет', '35 Ранет'),
    ('893f8972-77de-429e-a073-8721cd5df939'::uuid, 'Нелли', 'Нелли А111 Н'),
    ('35650056-bcc5-59e1-a7a7-45df5b593cca'::uuid, 'Олеандр', '109 Олеандр'),
    ('732e7ca7-a61e-5d81-b942-bf87adaded1f'::uuid, 'Одышка', '290 Одышка'),
    ('a14369f0-0481-48a8-aff4-479b3991e724'::uuid, 'Pergola', 'Pergola II 6/86'),
    ('cdfc05b0-d12c-5ce1-96ce-6746508b87bf'::uuid, 'Похвал', 'Похвал ii'),
    ('95e98ad1-a54e-56b0-81df-1c2ffd4d1188'::uuid, 'Похвал', 'Похвал iiс'),
    ('5811229c-620b-5ede-94a4-e236901b35d6'::uuid, 'Приятель', 'Приятель iiс'),
    ('7c17239a-7be3-5f77-8092-d1e6c7732414'::uuid, 'Пэри', '138 Пэри'),
    ('97f678bf-8306-54f5-b32b-474bf6a6fcc5'::uuid, 'Пчелка', 'Пчелка с'),
    ('478fdf55-76c6-5551-a177-329fafe2d90a'::uuid, 'Перчик', '322 Перчик ПКЗ'),
    ('54d9cc9e-e358-5c55-b411-606dd2d8ae01'::uuid, 'Пылинка', '408 Пылинка'),
    ('5d7c57c3-4366-4b8a-b02f-b796fe068f85'::uuid, 'Эллен', 'Эллен А58 Н (GER)'),
    ('3edf07a9-c792-525e-8049-247c7dc878d2'::uuid, 'Пюппи', '140 Пюппи (GER)'),
    ('5fdec16d-0e5c-5f09-9b22-a8c697bb77d3'::uuid, 'Пионер', '33 Пионер А194 (GER)'),
    ('a67d5944-4c88-5918-a92c-5cfb32fd2cf1'::uuid, 'Раут', '118 Раут'),
    ('ef514972-d3cb-4ecb-861b-8449c2013cd8'::uuid, 'Юнэкс', '180 Юнэкс V93486 (NDR)'),
    ('285252a8-9a61-4c13-8655-f7cc19ee0e14'::uuid, 'Дебют', '52 Дебют II'),
    ('ae43afc7-81ce-58fd-a107-8844cfc1d493'::uuid, 'Пенелопа', '596 Пенелопа'),
    ('d964bdf8-50a2-41fd-8c8a-b743f6067139'::uuid, 'Тематика', 'Тематика А18'),
    ('88e2d87b-6e09-5e1a-91d2-17c92fde5207'::uuid, 'Садко', '134 Садко'),
    ('2053f12e-39aa-4ec8-8dea-75905abdeae0'::uuid, 'Мопс', 'Мопс А27 (GER)'),
    ('a6d028c9-c740-41d6-9588-5ee8a328fe37'::uuid, 'Ян', 'Ян S650 (NDR)'),
    ('430f67a9-e3b1-5f07-971c-81f5501cfb69'::uuid, 'Роза', '142 Роза А970 Н (GER)'),
    ('fbf143c0-de52-481c-837d-14af0f7d9716'::uuid, 'Кура', '259 Кура'),
    ('bd43e477-1a8c-481b-bf91-c4051f5e9f54'::uuid, 'Mocca', 'Mocca A 451'),
    ('9f79add2-4919-45d8-879b-e7e92f825256'::uuid, 'Boreas Ubbo', 'Boreas Ubbo (NDR)'),
    ('288010e0-81d8-5e42-ba0b-4aec068e77a2'::uuid, 'Смит', '123 Смит'),
    ('3973028a-88c2-5c32-a2e1-7af5c4721db3'::uuid, 'Слава', '149 Слава'),
    ('86b27879-7089-5ca9-bbcf-7f629cc9c919'::uuid, 'Стелс', '38 Стелс'),
    ('ee5643c8-f090-458b-8f77-30dc34be3686'::uuid, 'Мотт', 'Мотт А5 H (GER)'),
    ('f1df55d3-639a-5127-96e3-b8cb67836d8d'::uuid, 'Сюзана', '153 Сюзана (GER)'),
    ('b1e917c4-2e56-503b-a9a3-a59f68bc197b'::uuid, 'Сюси', '156 Сюси (GER)'),
    ('ada4a185-3f63-4f7e-a925-40481d651ee0'::uuid, 'Гея', 'Гея S21419 (NDR)'),
    ('f9774cce-0eff-4c96-a089-bf1aa19b9c7e'::uuid, 'Умка', '40 Умка (GB)'),
    ('e075dec1-47f3-4248-a9ce-5e1d3b21e4d4'::uuid, 'Perry', 'Perry 138/77'),
    ('3a397df6-397a-493f-895a-13c72f6574dc'::uuid, 'Colne Heartsease', 'Colne Heartsease (NDR)'),
    ('f43c2512-a85e-4185-b7d5-801e9d8fe00a'::uuid, 'Рози', 'Рози A304 H (GER)'),
    ('ffa3d17e-1d23-4419-86aa-22882d8a65c4'::uuid, 'Винди', 'Винди А128 (GER)'),
    ('f0ff7042-996c-49c8-8508-634fbbbe6377'::uuid, 'Шоколадка', '177 Шоколадка'),
    ('0731cafc-7587-4b5a-999f-69220790331e'::uuid, 'Moslem', 'Moslem A383'),
    ('ac07b0a2-2865-50f1-bc2d-c4da9d032d25'::uuid, 'Фраза', 'Фраза i'),
    ('f7e3fe4e-96e3-41a5-9486-d6183e8573cb'::uuid, 'Springbourne Heyday', 'Springbourne Heyday (NDR)'),
    ('00698665-7061-59d0-a435-978ab605ab98'::uuid, 'Шутка', '337 Шутка'),
    ('ae5315d3-e849-5e86-80c3-c65c8bbf2663'::uuid, 'Чайка', 'Чайка iв'),
    ('9f20840f-17d9-4386-b849-4cc28ab85e15'::uuid, 'Функ', 'Функ А118 (GER)'),
    ('f17b73aa-10f5-4171-911d-920feb76e1ab'::uuid, 'Юлика', 'Юлика А148 Н (GER)'),
    ('d9a50851-baa6-53a4-9eac-209dc23fed89'::uuid, 'Шайн', '283 Шайн'),
    ('cb44b58c-587b-5092-9d3d-f14487e692c4'::uuid, 'Шулико', '657 Шулико'),
    ('6f6aed30-fcfa-4ab1-b5a3-fecddd4a9cb7'::uuid, 'Вымпел', 'Вымпел А135 (GER)'),
    ('2ded3cb8-bf07-4c07-959f-f9a6a25b33f2'::uuid, 'Picette', 'Picette AH 233'),
    ('23debf7e-438e-517d-ba17-e1b5407cbadf'::uuid, 'Евлампия', '939 Евлампия'),
    ('fcce4887-ad8f-5037-9faf-ca1ca527de02'::uuid, 'Есмира', 'Есмира А21'),
    ('2eeeb016-e657-5041-be40-d563ac98f6a1'::uuid, 'Ласточка', 'Ласточка iii'),
    ('65a26d0f-0665-5ddd-ad9d-0d80de96827d'::uuid, 'Лозанна', '544 Лозанна'),
    ('03774d99-9fa0-57cf-9c65-72741b0005a8'::uuid, 'Есмиэла', 'Есмиэла А18'),
    ('8b2a8bcf-0f4e-5ab6-924b-795ce7260aa0'::uuid, 'Забава', '954 Забава II ПКЗ'),
    ('82969eb6-68c9-59e4-9d92-f5f276107c09'::uuid, 'Астана', 'Астана А17'),
    ('2a9e35aa-44ca-5f63-84cb-2a3f4f2ff4bc'::uuid, 'Ельжбетта', '244 Ельжбетта'),
    ('c0f2f8b3-ebe6-5412-a043-55c67217b56e'::uuid, 'Евстория', '850 Евстория'),
    ('46011bd9-8cea-507b-913e-550f330e68c1'::uuid, 'Азалия', '512 Азалия'),
    ('f0aef203-ff0c-5af1-a1dd-07433972a1ce'::uuid, 'Асати', 'Асати А17'),
    ('0473ac5a-c2f7-5cc3-b0f7-2f911d2a9e51'::uuid, 'Еллоу Шайн', '938 Еллоу Шайн А14'),
    ('f5a6c8c4-5ca6-5609-847f-328370e6227f'::uuid, 'Агапа', 'Агапа А16'),
    ('9909204f-adb4-5e38-a86c-47f5706e7e6f'::uuid, 'Астра', '564 Астра'),
    ('e79c9d6c-8dcd-5c24-ae71-607481c0ec0b'::uuid, 'Зося', '635 Зося'),
    ('9d456237-f38c-50cb-b7b6-673a716b7aa0'::uuid, 'Серпантин', '265 Серпантин'),
    ('95042603-a908-53e9-95cd-5fa777243db9'::uuid, 'Пенкейк', 'Пенкейк ПКЗ'),
    ('d48cd34d-9fbc-4388-8aee-7cc2e1f2a408'::uuid, 'A', 'A V33/71R'),
    ('798a20be-81eb-4a2f-acd9-e61580fd2cdb'::uuid, 'Даль', '8 Даль 24'),
    ('6e02f759-471c-55f4-ad8f-a1952c429809'::uuid, 'Тилли', 'Тилли (Till, NDR)');

DO $$
DECLARE
    source_count integer;
    missing_count integer;
    conflict_count integer;
BEGIN
    SELECT count(*) INTO source_count FROM tmp_horse_rename;
    IF source_count <> 150 THEN
        RAISE EXCEPTION 'Expected 150 source rows, got %', source_count;
    END IF;

    SELECT count(*)
      INTO missing_count
      FROM tmp_horse_rename AS source
      LEFT JOIN horse AS target ON target.id = source.id
     WHERE target.id IS NULL;

    IF missing_count <> 0 THEN
        RAISE EXCEPTION '% horse UUID(s) do not exist; no rows were updated', missing_count;
    END IF;

    SELECT count(*)
      INTO conflict_count
      FROM tmp_horse_rename AS source
      JOIN horse AS target ON target.id = source.id
     WHERE target.name IS DISTINCT FROM source.pedigree_name
        OR target.pedigree_name IS NOT NULL;

    IF conflict_count <> 0 THEN
        RAISE EXCEPTION '% horse row(s) differ from the expected source state; no rows were updated', conflict_count;
    END IF;
END
$$;

UPDATE horse AS target
   SET name = source.name,
       pedigree_name = source.pedigree_name
  FROM tmp_horse_rename AS source
 WHERE target.id = source.id;

DO $$
DECLARE
    invalid_count integer;
BEGIN
    SELECT count(*)
      INTO invalid_count
      FROM tmp_horse_rename AS source
      JOIN horse AS target ON target.id = source.id
     WHERE target.name IS DISTINCT FROM source.name
        OR target.pedigree_name IS DISTINCT FROM source.pedigree_name;

    IF invalid_count <> 0 THEN
        RAISE EXCEPTION '% horse row(s) failed post-update verification', invalid_count;
    END IF;
END
$$;

COMMIT;
