# Parsing from old Joomla site: step 1

Дата: 2026-05-26  
Сервис: подготовка данных / импорт из старого Joomla-сайта  
Источник: `http://localhost:8080/`, проект `/home/igor/projects/ad_joomla`

## Цель

Найти страницы старого Joomla-сайта, которые являются страницами конкретной лошади или пони, а не списками/посадочными страницами. Этот файл является входом для этапа 2 парсинга.

Итоговый набор: 136 страниц, из них 59 horse и 77 pony.

## Методика

Использованы три источника и объединение по `K2 item id`:

1. Стартовые страницы:
  - `/index.php/ferma/horses`
  - `/index.php/ferma/pony`
2. База Joomla в контейнере `ad_joomla-db-1`, таблицы:
  - `aj4tr_k2_items`
  - `aj4tr_k2_categories`
  - `aj4tr_menu`
3. Опубликованные leaf menu items под:
  - `ferma/horses/*/*`
  - `ferma/pony/*/*`
  - `ferma/sluchka/sokol`

Критерии включения:

- `aj4tr_k2_items.published = 1`
- `aj4tr_k2_items.trash = 0`
- страница описывает конкретную единицу, а не список/породу/посадочную страницу
- URL отдаёт HTTP 200 на локальном сайте

Критерии исключения:

- списки и посадочные страницы: `/index.php/ferma/horses`, `/index.php/ferma/pony`, `Коне-ферма "Александрова Дача"`, `Пони-ферма "Александрова Дача"`, `Шетлендские пони`, `Уэльские пони`
- страницы не про лошадь/пони: две страницы `Ослик`

Приоритет выбора URL:

1. человекочитаемый SEF путь из `aj4tr_menu`
2. URL, найденный на стартовой странице
3. fallback K2 URL вида `/index.php/ferma/{horses|pony}/item/<id>-<alias>`

## Access policy

Этап 1 не меняет API. Public Read / Protected Write не затрагивается. Для будущего импорта вероятно потребуется read-модель для публичного сайта, но endpoint'ы и access matrix должны фиксироваться отдельным планом этапа 2/3.

## Pages to parse


| #   | Type  | Title                                      | Category                          | Path                                            | K2 item id |
| --- | ----- | ------------------------------------------ | --------------------------------- | ----------------------------------------------- | ---------- |
| 1   | horse | Госпожа                                    | Башкирская порода                 | `/index.php/ferma/horses/item/202-gospoja`      | 202        |
| 2   | horse | Сивилла                                    | Башкирская порода                 | `/index.php/ferma/horses/item/200-sivilla`      | 200        |
| 3   | horse | Фатима                                     | Башкирская порода                 | `/index.php/ferma/horses/item/201-fatima`       | 201        |
| 4   | horse | 1046 Рэзак 37                              | Буденновская порода               | `/index.php/ferma/horses/buden/rezak`           | 107        |
| 5   | horse | 6902 Зерновка 26                           | Буденновская порода               | `/index.php/ferma/horses/buden/zernovka`        | 110        |
| 6   | horse | Милиса                                     | Забайкальская порода              | `/index.php/ferma/horses/zabaikal/milisa`       | 197        |
| 7   | horse | Солнышко                                   | Забайкальская порода              | `/index.php/ferma/horses/zabaikal/solnishko`    | 196        |
| 8   | horse | Флэк                                       | Забайкальская порода              | `/index.php/ferma/horses/zabaikal/flek`         | 193        |
| 9   | horse | 1742 Плавная                               | Лошади                            | `/index.php/ferma/horses/arab/plavnaya`         | 117        |
| 10  | horse | 469 Гнев                                   | Лошади                            | `/index.php/ferma/horses/arab/gnev`             | 116        |
| 11  | horse | 485 Пасифея 1,93                           | Лошади                            | `/index.php/ferma/horses/gan-trk/pasifea`       | 133        |
| 12  | horse | 98 Философ                                 | Лошади                            | `/index.php/ferma/horses/gan-trk/filosof`       | 121        |
| 13  | horse | No Name                                    | Лошади                            | `/index.php/ferma/horses/item/390-ivolga-2019`  | 390        |
| 14  | horse | Антей                                      | Лошади                            | `/index.php/ferma/horses/gan-trk/antei`         | 137        |
| 15  | horse | Беспредельный                              | Лошади                            | `/index.php/ferma/horses/item/490-bespredelniy` | 490        |
| 16  | horse | Грация                                     | Лошади                            | `/index.php/ferma/horses/item/326-gracia`       | 326        |
| 17  | horse | Гринфильд                                  | Лошади                            | `/index.php/ferma/horses/gan-trk/grinfild`      | 136        |
| 18  | horse | Зевс                                       | Лошади                            | `/index.php/ferma/horses/item/411-zevs`         | 411        |
| 19  | horse | Игарка                                     | Лошади                            | `/index.php/ferma/horses/item/316-igarka`       | 316        |
| 20  | horse | Кросс 14                                   | Лошади                            | `/index.php/ferma/horses/item/111-kross`        | 111        |
| 21  | horse | Лакоста                                    | Лошади                            | `/index.php/ferma/horses/item/306-lakosta`      | 306        |
| 22  | horse | Мальвина                                   | Лошади                            | `/index.php/ferma/horses/gan-trk/malvina`       | 138        |
| 23  | horse | Мафия                                      | Лошади                            | `/index.php/ferma/horses/gan-trk/mafia`         | 140        |
| 24  | horse | Маэстро                                    | Лошади                            | `/index.php/ferma/horses/item/489-maestro`      | 489        |
| 25  | horse | Оригинал 12                                | Лошади                            | `/index.php/ferma/horses/item/144-original`     | 144        |
| 26  | horse | Пастель                                    | Лошади                            | `/index.php/ferma/horses/item/488-pastel`       | 488        |
| 27  | horse | Пилада 15                                  | Лошади                            | `/index.php/ferma/horses/item/318-pilada`       | 318        |
| 28  | horse | Преамбула                                  | Лошади                            | `/index.php/ferma/horses/item/384-preambula`    | 384        |
| 29  | horse | Резол 110                                  | Лошади                            | `/index.php/ferma/horses/item/104-rezol`        | 104        |
| 30  | horse | Реприза                                    | Лошади                            | `/index.php/ferma/horses/item/113-repriza`      | 113        |
| 31  | horse | Ретро 32                                   | Лошади                            | `/index.php/ferma/horses/item/109-retro`        | 109        |
| 32  | horse | Триумф                                     | Лошади                            | `/index.php/ferma/horses/item/142-triumf`       | 142        |
| 33  | horse | Феспия                                     | Лошади                            | `/index.php/ferma/horses/item/339-fespia`       | 339        |
| 34  | horse | Фишка                                      | Лошади                            | `/index.php/ferma/horses/gan-trk/fishka`        | 337        |
| 35  | horse | Формула                                    | Лошади                            | `/index.php/ferma/horses/item/143-formula`      | 143        |
| 36  | horse | Чародей                                    | Лошади                            | `/index.php/ferma/horses/item/371-charodey`     | 371        |
| 37  | horse | Челентано                                  | Лошади                            | `/index.php/ferma/horses/item/199-chelentano`   | 199        |
| 38  | horse | Чигла                                      | Лошади                            | `/index.php/ferma/horses/item/325-chigla`       | 325        |
| 39  | horse | Шевалье                                    | Лошади                            | `/index.php/ferma/horses/item/304-shevalie`     | 304        |
| 40  | horse | Киприда                                    | Першероны                         | `/index.php/ferma/horses/item/103-kiprida`      | 103        |
| 41  | horse | Сокол                                      | Першероны                         | `/index.php/ferma/sluchka/sokol`                | 412        |
| 42  | horse | Бип-Бип Приятная                           | Полукровная спортивная            | `/index.php/ferma/horses/item/314-bip-bip`      | 314        |
| 43  | horse | Гладыш приятный                            | Полукровная спортивная            | `/index.php/ferma/horses/sport/gladysh`         | 313        |
| 44  | horse | Иволга                                     | Полукровная спортивная            | `/index.php/ferma/horses/sport/ivolga`          | 324        |
| 45  | horse | Играйка                                    | Полукровная спортивная            | `/index.php/ferma/horses/item/315-igrayka`      | 315        |
| 46  | horse | Райхан 303                                 | Советский тяжеловоз               | `/index.php/ferma/horses/item/100-raihan`       | 100        |
| 47  | horse | Роксолина 806                              | Советский тяжеловоз               | `/index.php/ferma/horses/item/101-roksolina`    | 101        |
| 48  | horse | 19 Архона                                  | Тракененская, ганноверская порода | `/index.php/ferma/horses/gan-trk/arhona`        | 127        |
| 49  | horse | 2845 Порфея                                | Тракененская, ганноверская порода | `/index.php/ferma/horses/gan-trk/porfea`        | 119        |
| 50  | horse | 2961 Фихта 3                               | Тракененская, ганноверская порода | `/index.php/ferma/horses/gan-trk/fihta`         | 132        |
| 51  | horse | 489 Вальтер 47                             | Тракененская, ганноверская порода | `/index.php/ferma/horses/gan-trk/valter`        | 131        |
| 52  | horse | 522 Хвыля                                  | Тракененская, ганноверская порода | `/index.php/ferma/horses/gan-trk/hvylya`        | 122        |
| 53  | horse | Аппликация                                 | Тракененская, ганноверская порода | `/index.php/ferma/horses/gan-trk/applikacia`    | 135        |
| 54  | horse | Аресибо                                    | Тракененская, ганноверская порода | `/index.php/ferma/horses/gan-trk/aresibo`       | 386        |
| 55  | horse | Фальконе                                   | Тракененская, ганноверская порода | `/index.php/ferma/horses/gan-trk/falkone`       | 126        |
| 56  | horse | Фальконет                                  | Тракененская, ганноверская порода | `/index.php/ferma/horses/item/128-falkonet`     | 128        |
| 57  | horse | Фейхоа                                     | Тракененская, ганноверская порода | `/index.php/ferma/horses/item/129-feihoa`       | 129        |
| 58  | horse | Хогвард                                    | Тракененская, ганноверская порода | `/index.php/ferma/horses/gan-trk/hogvard`       | 389        |
| 59  | horse | Велла (Wella)                              | Фризская порода                   | `/index.php/ferma/horses/item/99-wella`         | 99         |
| 60  | pony  | 0272 Флориан (Florian van de Kruisstraat)  | Аппалуза пони                     | `/index.php/ferma/pony/appaluza-pony/florian`   | 52         |
| 61  | pony  | Акапелла                                   | Аппалуза пони                     | `/index.php/ferma/pony/appaluza-pony/akapella`  | 69         |
| 62  | pony  | Аннемун (Annemoon)                         | Аппалуза пони                     | `/index.php/ferma/pony/appaluza-pony/annemun`   | 53         |
| 63  | pony  | 0432 Кнопка                                | Пони                              | `/index.php/ferma/pony/shetlend/knopka`         | 55         |
| 64  | pony  | 197 Аэлита                                 | Пони                              | `/index.php/ferma/pony/shetlend/aelita`         | 41         |
| 65  | pony  | 237 Тамерлан                               | Пони                              | `/index.php/ferma/pony/shetlend/tamerlan`       | 40         |
| 66  | pony  | 242 Рассвет                                | Пони                              | `/index.php/ferma/pony/shetlend/rassvet`        | 39         |
| 67  | pony  | 388 Мазурка                                | Пони                              | `/index.php/ferma/pony/shetlend/mazurka`        | 70         |
| 68  | pony  | 546 Сиеста                                 | Пони                              | `/index.php/ferma/pony/shetlend/siesta`         | 62         |
| 69  | pony  | 547 Елань                                  | Пони                              | `/index.php/ferma/pony/shetlend/elan`           | 46         |
| 70  | pony  | 556 Листва                                 | Пони                              | `/index.php/ferma/pony/shetlend/listva`         | 63         |
| 71  | pony  | 561 Метка                                  | Пони                              | `/index.php/ferma/pony/shetlend/metka`          | 60         |
| 72  | pony  | 562 Ланка                                  | Пони                              | `/index.php/ferma/pony/shetlend/lanka`          | 54         |
| 73  | pony  | 566 Мельба                                 | Пони                              | `/index.php/ferma/pony/shetlend/melba`          | 61         |
| 74  | pony  | 642 Пастила                                | Пони                              | `/index.php/ferma/pony/shetlend/pastila`        | 71         |
| 75  | pony  | Леди Линн (132012 Ysselvliedt's Lady Lynn) | Пони                              | `/index.php/ferma/pony/welsh/lady-lynn`         | 37         |
| 76  | pony  | Лейзи                                      | Пони                              | `/index.php/ferma/pony/shetlend/leyzi`          | 397        |
| 77  | pony  | Лизетта (Mini Hoeve's Lyzet)               | Пони                              | `/index.php/ferma/pony/welsh/lizet`             | 33         |
| 78  | pony  | Магистр                                    | Пони                              | `/index.php/ferma/pony/item/48-magistr`         | 48         |
| 79  | pony  | Маккартни (Sir Maccartney)                 | Пони                              | `/index.php/ferma/pony/welsh/maccartney`        | 30         |
| 80  | pony  | Меппи                                      | Пони                              | `/index.php/ferma/pony/item/443-meppi`          | 443        |
| 81  | pony  | Мерпл А23                                  | Пони                              | `/index.php/ferma/pony/item/467-merpl`          | 467        |
| 82  | pony  | Пежо                                       | Пони                              | `/index.php/ferma/pony/item/323-pego`           | 323        |
| 83  | pony  | Пенкейк                                    | Пони                              | `/index.php/ferma/pony/shetlend/penkeyk`        | 391        |
| 84  | pony  | Салют                                      | Пони                              | `/index.php/ferma/pony/shetlend/salut`          | 394        |
| 85  | pony  | Тилли (Till)                               | Пони                              | `/index.php/ferma/pony/welsh/till`              | 32         |
| 86  | pony  | 646 Ленточка                               | Потомство Пони                    | `/index.php/ferma/pony/shetlend/lentochka`      | 271        |
| 87  | pony  | 801 Мери Поппинс                           | Потомство Пони                    | `/index.php/ferma/pony/shetlend/meri-poppins`   | 154        |
| 88  | pony  | 0144 Мальвина II                           | Спортивные пони                   | `/index.php/ferma/pony/shetlend/malvina`        | 64         |
| 89  | pony  | Бабочка                                    | Спортивные пони                   | `/index.php/ferma/pony/sport-pony/babochka`     | 43         |
| 90  | pony  | Дезерт Бой (Anapon Desert Boy)             | Уэльские пони                     | `/index.php/ferma/pony/welsh/desert`            | 24         |
| 91  | pony  | Джастин (Justin)                           | Уэльские пони                     | `/index.php/ferma/pony/welsh/jastin`            | 444        |
| 92  | pony  | Каспаров (Ysselvliedt's Kasparov 79136)    | Уэльские пони                     | `/index.php/ferma/pony/welsh/kasparov`          | 28         |
| 93  | pony  | Леди Винтер                                | Уэльские пони                     | `/index.php/ferma/pony/welsh/lady-vinter`       | 317        |
| 94  | pony  | Майкл (Cuppers Maikel)                     | Уэльские пони                     | `/index.php/ferma/pony/welsh/majkl`             | 29         |
| 95  | pony  | Тинкербель                                 | Уэльские пони                     | `/index.php/ferma/pony/welsh/tinkerbel`         | 36         |
| 96  | pony  | 0306 Белоснежка (Сосенка)                  | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/belosnegka`     | 42         |
| 97  | pony  | 0354 Гита                                  | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/gita`           | 76         |
| 98  | pony  | 0355 Фея                                   | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/feya`           | 51         |
| 99  | pony  | 116 Пьер                                   | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/pier`           | 22         |
| 100 | pony  | 237 Евгеника                               | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/evgenika`       | 370        |
| 101 | pony  | 244 Ельжбетта                              | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/elzhbetta`      | 47         |
| 102 | pony  | 265 Серпантин                              | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/serpantin`      | 38         |
| 103 | pony  | 284 Кашкай                                 | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/kashkaj`        | 23         |
| 104 | pony  | 351 Мандаринка                             | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/mandarinka`     | 66         |
| 105 | pony  | 372 Мысль (Елотта)                         | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/mysl`           | 67         |
| 106 | pony  | 439 Кристина                               | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/krustina`       | 56         |
| 107 | pony  | 512 Азалия                                 | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/azalia`         | 44         |
| 108 | pony  | 544 Лозанна                                | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/lozanna`        | 58         |
| 109 | pony  | 563 Сказка                                 | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/skazka`         | 57         |
| 110 | pony  | 564 Астра                                  | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/astra`          | 45         |
| 111 | pony  | 635 Зося                                   | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/zosya`          | 414        |
| 112 | pony  | 697 Омега                                  | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/omega`          | 59         |
| 113 | pony  | 722 Миссисипи                              | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/missisipi`      | 287        |
| 114 | pony  | 769 Марселла                               | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/marsella`       | 68         |
| 115 | pony  | 850 Евстория                               | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/evstoria`       | 192        |
| 116 | pony  | 952 Маргаритка                             | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/margaritka`     | 442        |
| 117 | pony  | Агапа А16                                  | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/agapa`          | 162        |
| 118 | pony  | Аделия                                     | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/adelia`         | 448        |
| 119 | pony  | Асати А17                                  | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/asati`          | 336        |
| 120 | pony  | Астана А17                                 | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/astana`         | 211        |
| 121 | pony  | Афродита                                   | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/afrodita`       | 449        |
| 122 | pony  | Ева                                        | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/eva`            | 422        |
| 123 | pony  | Евлампия                                   | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/evlampia`       | 177        |
| 124 | pony  | Европейка                                  | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/evropeyka`      | 451        |
| 125 | pony  | Еллоу Ра                                   | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/ellou-ra`       | 49         |
| 126 | pony  | Еллоу Шайн                                 | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/ellou-shain`    | 50         |
| 127 | pony  | Есмиэла А18                                | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/esmiela`        | 450        |
| 128 | pony  | Есперанса                                  | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/esperansa`      | 413        |
| 129 | pony  | Забава                                     | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/zabava`         | 398        |
| 130 | pony  | Зевс                                       | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/zevs`           | 445        |
| 131 | pony  | Зупинка                                    | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/zupinka`        | 446        |
| 132 | pony  | Ленгер                                     | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/lenger`         | 20         |
| 133 | pony  | Манюня А17                                 | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/manuna`         | 345        |
| 134 | pony  | Оригами                                    | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/origamy`        | 257        |
| 135 | pony  | Сим-Сим                                    | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/sim-sim`        | 229        |
| 136 | pony  | Таги                                       | Шетлендские пони                  | `/index.php/ferma/pony/shetlend/tagi`           | 415        |


## Notes for step 2

- Парсеру лучше хранить `K2 item id` как legacy identifier, потому что часть URL использует SEF path, а часть fallback `/item/<id>-<alias>`.
- На этапе 2 нужно парсить не только видимый `articleBody`, но и изображения/галереи K2, если они есть у `K2 item`.
- Для URL из fallback-группы нужно не строить SEF путь из alias категории: некоторые реальные пути отличаются от `aj4tr_k2_categories.alias` и задаются меню (`appaluza-pony`, `welsh`, `shetlend`, `gan-trk`, `sport`).

