# План: импорт JSON старого Joomla-сайта в БД

**Тикет:** parsing_from_old_site_step3  
**Дата:** 2026-05-27  
**Затронутые сервисы:** services/backend, data/import planning  
**Ветка:** не применимо для документа планирования  

---

## Контекст

Этап 2 сформировал валидный `docs/plans/parsing_from_old_site/base.json` со структурированными данными старого Joomla/K2-сайта. Этап 3 должен подготовить офлайн-импорт этих данных в существующую PostgreSQL-схему backend без изменения API, моделей, миграций и файлов БД.

На этом шаге SQL-файлы, перенос фотографий и изменение БД не выполняются. Этот документ фиксирует план реализации, который нужно согласовать перед запуском Backend-агента.

Источник фото старого сайта: `/home/igor/projects/ad_joomla/src`.  
Будущая целевая папка для файлов перед ручной загрузкой в S3: `/home/igor/projects/ad_joomla/all_photos_to_s3`.  
Будущая директория SQL-файлов: `docs/plans/parsing_from_old_site/scripts`.

## Цель

После согласования плана Backend-агент должен будет построить воспроизводимый импорт:

- отдельные `.sql` файлы для `breeds`, `coat_color`, `horse_owner`, `photos`, `horse`, `horse_photos`, `horse_children`;
- стабильные UUID для импортируемых сущностей;
- один UUID-плейсхолдер конюшни, который пользователь сможет заменить перед применением;
- перемещённые/скопированные задействованные фото в единую папку для последующей ручной загрузки в S3;
- SQL, который можно применить в правильном порядке без нарушения FK и unique constraints;
- отчёт с предупреждениями по потерям/нормализациям.

Услуги из поля `services` на этом этапе не импортируются.

---

## Анализ `base.json`

Файл: `docs/plans/parsing_from_old_site/base.json`.

### Верхнеуровневые карточки

| Метрика | Значение |
|---|---:|
| Всего верхнеуровневых объектов | 344 |
| `kind = horse` | 70 |
| `kind = pony` | 274 |
| `sex = male` | 158 |
| `sex = female` | 186 |
| Уникальные `path` | 344 |
| Уникальные `legacy.k2_item_id` | 344 |
| Объекты без `breed` | 0 |
| Объекты без `coat_color` | 7 |
| Объекты без `bdate` | 4 |
| Объекты без `height` | 273 |
| Объекты без `description` | 256 |
| Объекты с непустым `services` | 141 |
| Объекты без фото | 54 |
| Фото-ссылок верхнего уровня | 1545 |
| Уникальных фото верхнего уровня | 1531 |

### Вложенные ноды родословной и потомства

`base.json` содержит не только 344 карточки, но и вложенные pedigree/children-ноды.

| Метрика | Значение |
|---|---:|
| Все ноды с `name` при рекурсивном обходе | 2700 |
| Top-level ноды | 344 |
| `pedigree.sire` ноды | 949 |
| `pedigree.dam` ноды | 955 |
| `pedigree.children` ноды | 452 |
| Уникальные имена по всем нодам | 762 |
| Уникальные identity-кандидаты по `path`/атрибутам | 1032 |
| Из них top-level identity | 344 |
| Дополнительные relation-only identity | 688 |
| Relation-only identity с `path` | 412 |
| Relation-only identity без `path` | 276 |
| Ноды с `owner` | 332 |
| Уникальные значения `owner` | 76 |
| Все фото-ссылки при рекурсивном обходе | 2973 |
| Уникальные фото при рекурсивном обходе | 1900 |

Вывод: если импортировать только 344 верхнеуровневые карточки, часть родословных и потомства нельзя будет записать в `horse_children`, потому что FK требует существующие строки в `horse`. Поэтому план импорта должен материализовать не только top-level карточки, но и relation-only лошадей/пони из pedigree/children, если они участвуют в связях.

### Прямые связи из top-level карточек

| Тип связи | Всего уникальных связей |
|---|---:|
| `sire -> horse` | 328 |
| `dam -> horse` | 331 |
| `horse -> listed_child` | 452 |
| Итого direct edges | 1111 |

Из direct edges сейчас по `path` разрешаются в top-level карточки:

| Тип связи | Разрешено в top-level |
|---|---:|
| `sire` | 220 |
| `dam` | 202 |
| `child` | 251 |

Остальные связи требуют relation-only horse rows или ручного исключения.

### Уникальные справочники верхнего уровня

`breeds`: 29 исходных значений. Есть регистровые дубли, которые нужно схлопнуть до канонического написания:

- `Спортивный пони` / `спортивный пони`;
- `Уэльский пони (сектор В)` / `уэльский пони (сектор В)`.

`coat_color`: 45 исходных значений. Регистровых дублей по текущему анализу нет, но есть вероятные орфографические варианты, которые нельзя автоматически схлопывать без ручного словаря:

- `изабелловая`, `изабеловая`;
- `изабеллово-пегая`, `изабелово-пегий`;
- `вороной`, `вороная`;
- сложные варианты с примечаниями в скобках.

`horse_owner`: 76 исходных значений из вложенных `owner`. Данные шумные: часть значений выглядит как порода, племенная книга, регистрационный номер или смешанный комментарий, например `WELSH MOUNTAIN PONY`, `WSB 39407 (B)`, `Прилепский к/з, 1,51`. Автоматически импортировать их как владельцев можно только с пометкой manual review.

### Ограничения моделей

По моделям backend:

- `breeds.name`, `breeds.short_name`, `breeds.slug` ограничены `String(63)`;
- `coat_color.name`, `coat_color.short_name`, `coat_color.slug` ограничены `String(63)`;
- `horse_owner.name` ограничен `String(63)`;
- `horse.name` ограничен `String(63)`;
- `horse.description` ограничен `String(511)`;
- `horse.height` должен быть `Integer`;
- `horse.sex` nullable=False и допускает `male`, `female`, `geld`;
- `horse.bdate` имеет тип `Date`, поэтому одиночный год из JSON нельзя вставлять как есть;
- `horse.bdate_mode` хранит точность даты: `y`, `ym`, `ymd`, `hide`;
- `kind` хранится в `breeds.kind`, а не в `horse`;
- родословная и потомство хранятся в `horse_children` как пары `horse_id` родителя и `child_id` потомка;
- фотографии хранятся в `photos`, связь с лошадью в `horse_photos`.

Найденные edge cases:

- 4 top-level `description` длиннее 511 символов: `Резол`, `Реприза`, `Флэк`, `Челентано`;
- 53 top-level `bdate` заданы только годом;
- 71 top-level `height` заполнен, но часть значений строковая: `170 см`, `до 105 см`, `до 110`, и т.п.;
- top-level duplicate names: `No name`, `Зевс`, `Мальвина`; slug должен быть уникален в рамках `equestrian_id`;
- 1900 уникальных фото при рекурсивном обходе, из них 1894 найдены в `/home/igor/projects/ad_joomla/src`, 6 сейчас отсутствуют;
- есть 19 коллизий по basename фото, поэтому нельзя складывать файлы в одну папку под исходными именами без переименования.

---

## Детали реализации

### Файлы будущей реализации

| Что | Путь | Назначение |
|---|---|---|
| Скрипт генерации импорта | `docs/plans/parsing_from_old_site/build_step3_import.py` | Читает `base.json`, генерирует UUID, копирует фото, пишет SQL и отчёт |
| Справочник пород | `docs/plans/parsing_from_old_site/scripts/01_breeds.sql` | `INSERT` в `breeds` |
| Справочник мастей | `docs/plans/parsing_from_old_site/scripts/02_coat_color.sql` | `INSERT` в `coat_color` |
| Владельцы | `docs/plans/parsing_from_old_site/scripts/03_horse_owner.sql` | `INSERT` в `horse_owner` |
| Фото | `docs/plans/parsing_from_old_site/scripts/04_photos.sql` | `INSERT` в `photos` |
| Лошади/пони | `docs/plans/parsing_from_old_site/scripts/05_horse.sql` | `INSERT` в `horse` |
| Связи лошадь-фото | `docs/plans/parsing_from_old_site/scripts/06_horse_photos.sql` | `INSERT` в `horse_photos` |
| Связи родитель-потомок | `docs/plans/parsing_from_old_site/scripts/07_horse_children.sql` | `INSERT` в `horse_children` |
| Отчёт | `docs/plans/parsing_from_old_site/scripts/import_report.json` | Счётчики, warnings, пропущенные фото, коллизии, manual review |

SQL-файлы на этапе планирования не создавать.

### Equestrian ID

Использовать один плейсхолдер UUID для всех строк:

```text
a8072191-73a0-48d6-8adc-7bdbf9d171d4
```

Этот UUID должен быть вынесен в начало скрипта генерации как константа `EQUESTRIAN_ID_PLACEHOLDER`. В SQL-файлах значение должно встречаться явно и быть легко заменяемым пользователем. Перед применением SQL пользователь заменит его на реальный `equestrians.id`.

### Identity и UUID strategy

Сгенерировать UUID детерминированно в рамках одного запуска и сохранить mapping в отчёте:

- `breed_id`: по каноническому `breed.name + kind`;
- `coat_color_id`: по каноническому `coat_color.name`;
- `horse_owner_id`: по каноническому `owner.name`;
- `horse_id`: по identity key;
- `photo_id`: по итоговому S3/path имени файла;
- relation IDs в `horse_photos` и `horse_children`: отдельные UUID на каждую уникальную связь.

Identity key для horse rows:

1. Если нода имеет `path`, использовать `path`.
2. Если `path` отсутствует, использовать tuple:
   `name`, `bdate`, `owner`, `breed`, `coat_color`/`coat_color_short`, роль в родословной.
3. Если relation-only нода совпадает с top-level по `path`, top-level данные имеют приоритет и дополняются фото/owner из вложенных нод только если поле пустое.
4. Если несколько relation-only нод имеют одинаковый `path`, объединять их в одну horse row.
5. Если несколько нод без `path` имеют одинаковый tuple, объединять их в одну horse row.

Причина: в БД `horse_children` требует FK на существующие `horse.id`, а в `base.json` значительная часть родителей/потомков есть только во вложенных нодах.

### Slug strategy

Для `breeds`, `coat_color`, `horse` использовать тот же алгоритм транслитерации, что `SlugMixin` в `services/backend/src/core/entities/base.py`, либо локально повторить его в генераторе.

Требования:

- slug должен быть lowercase;
- slug уникален в рамках `equestrian_id`;
- при коллизии добавлять стабильный suffix: `-2`, `-3`, либо короткий фрагмент UUID;
- для duplicate top-level names `No name`, `Зевс`, `Мальвина` slug-коллизии обязательны к проверке;
- не полагаться на SQLAlchemy/Pydantic auto-generation, потому что импорт идёт чистым SQL.

### Нормализация справочников

`breeds`:

- строить по top-level `breed`;
- схлопнуть регистровые дубли по `lower().replace("ё", "е")`;
- каноническое имя выбирать по самому частому исходному написанию;
- если у одной канонической породы встречаются разные `kind`, создать отдельные строки на пару `(name, kind)`, потому что `breeds.kind` определяет фильтрацию horse/pony;
- `short_name = name`;
- `description = null`;
- `page_data = '<div></div>'`.

`coat_color`:

- строить по top-level `coat_color`, кроме `null`;
- не схлопывать орфографические варианты без ручного словаря;
- `short_name = name`;
- `description = null`;
- `page_data = '<div></div>'`.

`horse_owner`:

- строить по рекурсивным `owner`, кроме пустых значений;
- `type = 'company'` только если значение явно похоже на организацию: содержит `к/з`, `конный завод`, `ООО`, `ЗАО`, `ГУ`, `к.з.`;
- иначе `type = 'person'`;
- `description = null`;
- `address = null`;
- `phone_numbers = '[]'::jsonb`;
- все owners добавить в `manual_review` отчёта, потому что часть значений не является владельцем в строгом смысле.

### Маппинг JSON в `horse`

| JSON | DB column | Правило |
|---|---|---|
| identity UUID | `id` | По strategy выше |
| плейсхолдер | `equestrian_id` | `a8072191-73a0-48d6-8adc-7bdbf9d171d4` |
| `name` | `name` | Уже нормализовано, проверить `2 <= len <= 63` |
| generated | `slug` | Уникальный slug |
| `description` | `description` | Если >511, обрезать до 511 и добавить warning либо вынести решение на ручное согласование |
| `breed` | `breed_id` | FK на `breeds`; для relation-only без breed оставить `null` |
| `coat_color` | `coat_color_id` | FK на `coat_color`; для `coat_color_short` не создавать масть автоматически |
| `height` | `height` | Извлечь integer; `до 105 см` -> `105` с warning `height_is_upper_bound`; иначе `null` |
| `sex` | `sex` | Top/children из JSON; для `sire` без пола -> `male`; для `dam` без пола -> `female`; иначе `male` с warning, потому что column nullable=False |
| `bdate` | `bdate` | `YYYY-MM-DD` как date; `YYYY` -> `YYYY-01-01` |
| `bdate` precision | `bdate_mode` | `YYYY-MM-DD` -> `ymd`; `YYYY` -> `y`; null -> `hide` |
| not provided | `ddate` | `null` |
| not provided | `ddate_mode` | `hide` |
| `owner` | `horse_owner_id` | Только если owner присутствует у выбранной identity |
| source | `this_stable` | `true` для top-level карточек, `false` для relation-only нод |

Открытое решение перед реализацией: для 4 длинных `description` предпочтительно либо обрезать до 511 символов с отчётом, либо не импортировать description для этих строк. План рекомендует обрезку, потому что модель не имеет поля для полного HTML/текста.

### Маппинг фото

Использовать все фото, которые реально связаны с импортируемыми horse identity:

- top-level photos;
- photos из relation-only pedigree/children, если соответствующая нода материализуется в `horse`.

Файлы искать относительно `/home/igor/projects/ad_joomla/src`.

Правила копирования:

1. Не перемещать с удалением исходника; использовать копирование в `/home/igor/projects/ad_joomla/all_photos_to_s3`, чтобы не ломать старый сайт.
2. Перед копированием очистить только файлы, созданные прошлым запуском этого импортера, если будет manifest; не удалять чужие файлы в целевой директории.
3. Из-за basename-коллизий формировать новое имя:
   `<horse-slug>__<photo-index>__<short-hash><ext>`.
4. Сохранить manifest `source_path -> target_filename -> photo_id`.
5. В `photos.path` писать будущий S3-совместимый путь. Рекомендуемый формат:
   `/horses/import/<target_filename>`.
6. `photos.name` ограничить 63 символами, например `Фото <horse-name> <index>`.
7. В `horse_photos.is_main = true` только для первого фото каждой лошади, остальные `false`.
8. Отсутствующие исходные файлы не вставлять в `photos`, не создавать `horse_photos`, добавить warning.

Текущий анализ: 1900 уникальных фото при рекурсивном обходе, 1894 найдены в `/home/igor/projects/ad_joomla/src`, 6 отсутствуют.

### Родословная и потомство

Записывать связи в `horse_children`:

- `pedigree.sire` означает row `(horse_id = sire.id, child_id = current.id)`;
- `pedigree.dam` означает row `(horse_id = dam.id, child_id = current.id)`;
- `pedigree.children[]` означает row `(horse_id = current.id, child_id = child.id)`;
- дедуплицировать пары `(horse_id, child_id)`;
- если одна и та же пара возникает из sire/dam/children одновременно, оставить одну строку и добавить info в отчёт;
- не записывать self-relation;
- перед генерацией проверить циклы хотя бы на глубину рекурсивных данных и вынести найденное в warnings.

### SQL strategy

Каждый SQL-файл должен быть самостоятельным и читаемым:

- `BEGIN; ... COMMIT;`;
- `INSERT INTO ... (id, created_at, updated_at, ...) VALUES ...`;
- использовать `now()` для `created_at`;
- `updated_at = null`;
- использовать `ON CONFLICT DO NOTHING` только если есть подходящий unique/index контракт;
- для таблиц без unique constraints на импортируемые поля лучше не делать `ON CONFLICT`, чтобы ошибка показала проблему;
- экранировать строки через параметризованную генерацию или `psycopg/sql`-совместимый quoting, не ручную конкатенацию;
- не создавать/изменять таблицы и индексы;
- не вставлять услуги.

Порядок применения:

1. `01_breeds.sql`
2. `02_coat_color.sql`
3. `03_horse_owner.sql`
4. `04_photos.sql`
5. `05_horse.sql`
6. `06_horse_photos.sql`
7. `07_horse_children.sql`

Причина порядка: `horse` зависит от справочников и владельцев, `horse_photos` зависит от `horse` и `photos`, `horse_children` зависит от `horse`.

---

## API контракт

API не меняется. Новые endpoint'ы не добавляются, существующие public/protected правила не меняются.

## Access matrix

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| N/A | offline SQL import | N/A | N/A | N/A | N/A |

Исключений из дефолтной API policy нет.

## Схема БД

Миграции и изменения схемы не планируются. Импорт использует существующие таблицы:

- `breeds`;
- `coat_color`;
- `horse_owner`;
- `photos`;
- `horse`;
- `horse_photos`;
- `horse_children`.

---

## Порядок выполнения

1. Backend: перечитать этот план и подтвердить, что SQL/фото можно реализовывать.
2. Backend: создать генератор `build_step3_import.py`.
3. Backend: реализовать чтение `base.json`, рекурсивный обход нод, identity mapping и UUID mapping.
4. Backend: реализовать нормализацию пород, мастей, владельцев, height, bdate/date modes, slug.
5. Backend: реализовать manifest фото и копирование файлов в `/home/igor/projects/ad_joomla/all_photos_to_s3`.
6. Backend: сгенерировать SQL-файлы в `docs/plans/parsing_from_old_site/scripts`.
7. Backend: сгенерировать `import_report.json` со счётчиками, warnings и manual review.
8. Quality Gate: проверить JSON/SQL/manifest без применения к production БД.
9. После отдельного согласования пользователя: применить SQL к выбранной БД вручную или отдельной задачей.

---

## План проверок

Так как это offline data import без изменения backend-фичи и API, обязательный блок `30 unit + 30 smoke` для backend endpoint-фич не применяется. Вместо этого нужны проверки генератора и данных.

### Автоматические проверки генератора

- `python3 -m py_compile docs/plans/parsing_from_old_site/build_step3_import.py`;
- генератор повторно запускается и даёт одинаковые UUID/имена файлов при неизменном `base.json`;
- `import_report.json` валиден JSON;
- все SQL-файлы существуют после генерации;
- все SQL-файлы не пустые;
- количество `INSERT` rows соответствует отчёту;
- все FK из `horse.breed_id` есть в generated breeds;
- все FK из `horse.coat_color_id` есть в generated coat_color;
- все FK из `horse.horse_owner_id` есть в generated horse_owner;
- все FK из `horse_photos.horse_id` есть в generated horse;
- все FK из `horse_photos.photo_id` есть в generated photos;
- все FK из `horse_children.horse_id` и `child_id` есть в generated horse;
- нет `horse_children` self-relation;
- нет дублей `(horse_id, child_id)`;
- нет дублей `(horse_id, photo_id)`;
- ровно одно `is_main = true` для лошади с фото;
- нет `name` длиннее 63 для ограниченных колонок;
- нет `description` длиннее 511 после выбранной стратегии;
- `sex` не null для всех horse rows;
- `bdate_mode` согласован с исходной точностью даты;
- `height` integer или null;
- slug не пустой;
- slug уникален в рамках `equestrian_id` для `breeds`, `coat_color`, `horse`;
- все отсутствующие фото перечислены в warnings;
- basename-коллизии фото не приводят к перезаписи target files.

### SQL dry-run checks

В отдельной временной PostgreSQL БД или транзакции с rollback:

1. Проверить, что все SQL-файлы применяются в указанном порядке.
2. Проверить отсутствие FK violations.
3. Проверить отсутствие unique violations.
4. Проверить row counts по всем целевым таблицам.
5. Проверить выборочно 10 top-level карточек: имя, порода, масть, дата, фото.
6. Проверить выборочно 10 relation-only родителей: созданы как `this_stable=false`.
7. Проверить выборочно 10 `horse_children`: связь родитель -> потомок совпадает с JSON.
8. Проверить, что услуги не попали в `horse_service` и relation-таблицы услуг.

---

## Риски и открытые вопросы

1. Нужно согласовать стратегию для 4 описаний длиннее 511 символов: обрезка с warning или `null`.
2. Нужно согласовать импорт noisy `owner` значений: импортировать все 76 как есть или только явно похожие на владельцев/организации.
3. Нужно согласовать материализацию 688 relation-only horse identity. План рекомендует импортировать их, иначе родословные будут неполными.
4. Для relation-only нод без `breed` `breed_id` будет `null`, а kind не будет фильтроваться через `breeds.kind`.
5. Для relation-only `sire`/`dam` без `sex` пол выводится из роли; для неопределимых случаев нужен fallback, потому что `horse.sex` nullable=False.
6. 6 фото сейчас отсутствуют в файловой системе. Их нужно либо найти вручную, либо пропустить с warning.
7. Копирование фото должно быть именно copy, а не destructive move, несмотря на формулировку задачи "перемести", чтобы не повредить старый Joomla-проект.
8. Перед применением SQL пользователь должен заменить `a8072191-73a0-48d6-8adc-7bdbf9d171d4` на реальный `equestrians.id`.

---

## Чеклист

> Этот раздел используется агентами для отслеживания прогресса. Агент обязан менять `[ ]` на `[x]` после выполнения каждого пункта.

### Planner

- [x] Прочитать `agents/planner.md`
- [x] Прочитать `SERVICES.md`
- [x] Прочитать `agents/backend.md`
- [x] Прочитать `docs/tasks/parsing_from_old_site.md`
- [x] Проанализировать `docs/plans/parsing_from_old_site/base.json`
- [x] Сверить данные с моделями `breeds`, `coat_color`, `horse_owner`, `horse`, `photos`
- [x] Зафиксировать Access matrix без API изменений
- [x] Зафиксировать порядок будущих SQL-файлов
- [x] Зафиксировать риски и открытые вопросы

### Backend

- [ ] Дождаться явного согласования этого плана пользователем
- [ ] Создать `docs/plans/parsing_from_old_site/build_step3_import.py`
- [ ] Реализовать deterministic identity mapping для top-level и relation-only нод
- [ ] Реализовать UUID mapping для всех целевых таблиц
- [ ] Реализовать нормализацию breed/coat_color/owner/height/bdate/slug
- [ ] Реализовать manifest и копирование фото в `/home/igor/projects/ad_joomla/all_photos_to_s3`
- [ ] Сгенерировать `01_breeds.sql`
- [ ] Сгенерировать `02_coat_color.sql`
- [ ] Сгенерировать `03_horse_owner.sql`
- [ ] Сгенерировать `04_photos.sql`
- [ ] Сгенерировать `05_horse.sql`
- [ ] Сгенерировать `06_horse_photos.sql`
- [ ] Сгенерировать `07_horse_children.sql`
- [ ] Сгенерировать `import_report.json`
- [ ] Проверить, что услуги не импортируются
- [ ] Проверить, что SQL не меняет схему БД

### Quality Gate

- [ ] Проверить, что план был явно согласован до реализации
- [ ] Проверить валидность `base.json`
- [ ] Проверить компиляцию генератора
- [ ] Проверить воспроизводимость генерации
- [ ] Проверить SQL-файлы на синтаксис и порядок применения
- [ ] Проверить FK completeness по generated mappings
- [ ] Проверить unique constraints для slug/name справочников
- [ ] Проверить row counts против `import_report.json`
- [ ] Проверить warnings по длинным description, owner manual review, отсутствующим фото
- [ ] Проверить отсутствие изменений API, моделей, миграций и frontend
- [ ] Проверить, что placeholder `equestrian_id` легко заменяется
