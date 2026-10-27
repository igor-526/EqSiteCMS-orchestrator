# metrica-search-query-stats-query Specification

## Purpose
Пакетное чтение агрегатов сохранённой статистики поисковых запросов и числового ранжирования для SEO. Календарь и поиск остаются у SEO; статистика читается без повторного слияния данных парсинга.

## Requirements

### Requirement: Peer API запросов и доступ
Новые `GET /api/metrica/search-query-stats/table` (M5) и `/api/metrica/search-query-stats/ranking` (M6) SHALL соблюдать матрицу ниже. Credentials не требуются и не дают прав. Причина исключения Public Read — приватная аналитика для доверенного SEO; до production MUST быть подтверждена внешняя недоступность peers и БД.

#### Scenario: Anonymous и authenticated peers
- **WHEN** M5 и M6 вызываются с валидными параметрами без credentials, затем с cookie и Bearer
- **THEN** ответы `200` и тела идентичны; пользовательская сессия не меняет tenant

#### Scenario: Ошибка обработки
- **WHEN** при вызове M5 или M6 возникает ошибка БД
- **THEN** ответ `400` с безопасным detail без SQL, traceback, credentials и входных значений

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/metrica/search-query-stats/table` | Private Peer Read exception | доверенный seo-service | `200`; отсутствующий/невалидный equestrian_id, metric, bucket, search_query_ids — `400`; ошибка БД/обработки — безопасный `400` | то же; cookie/Authorization игнорируются |
| GET | `/api/metrica/search-query-stats/ranking` | Private Peer Read exception | доверенный seo-service | `200`; отсутствующий/невалидный equestrian_id, metric, date_from/date_to, direction — `400`; ошибка БД/обработки — безопасный `400` | то же; cookie/Authorization игнорируются |

`equestrian_id` здесь — query resource UUID по peer-политике 102, не selector SEO `X-Equestrian-Id` и не auth. Поэтому missing/invalid здесь `400`, а на SEO selector `401`.

### Requirement: Вход таблицы
M5 SHALL принимать UUID `equestrian_id`, один из восьми показателей `metrics-table-contract`, 1..31 повторяемых `bucket=YYYY-MM-DD..YYYY-MM-DD` и 1..100 различных UUID в повторяемом `search_query_ids`. Дубликаты UUID схлопываются. Buckets MUST быть упорядочены без пересечений, начало не позже конца. Невалидный ввод MUST давать `400` до чтения статистики.

#### Scenario: Проверка границ
- **WHEN** переданы 32 buckets, пересечение, обратные даты, неизвестный показатель, отсутствие UUID или 101 различный UUID
- **THEN** ответ `400`, статистика не читается

#### Scenario: Дубликаты UUID
- **WHEN** один search_query_id передан дважды
- **THEN** он учитывается один раз без удвоения агрегата

### Requirement: Вход ранжирования
M6 SHALL принимать обязательные `equestrian_id`, `metric`, `date_from/date_to` в ISO-формате, `direction=asc|desc`. Включительный диапазон MUST быть 1..366 дней. Нарушение MUST давать `400` без чтения статистики. Сервис MUST NOT вычислять defaults, календарные границы, лимиты SEO или текстовый поиск.

#### Scenario: Готовые границы
- **WHEN** переданы `2026-10-08..2026-10-09`
- **THEN** используются ровно эти два дня, без расширения до недели

#### Scenario: Невалидное ранжирование
- **WHEN** direction отсутствует, диапазон обратный либо длиннее 366 дней
- **THEN** ответ `400`

### Requirement: Источник и гранулярность
M5/M6 SHALL читать исключительно `metrica_search_query_stats`, фильтруя `equestrian_id` и даты. Сущность — `search_query_id`; уникальный день — `(equestrian_id, stat_date, search_query_id)`. Соединения со страницами, счётчиками и parse tasks MUST NOT размножать строки. Служебный `parse_task_id` MUST NOT становиться измерением.

#### Scenario: Отсутствие утечки и повторного слияния
- **WHEN** есть данные другой конюшни и уже слитые дневные данные нескольких источников
- **THEN** результат содержит только сохранённые дневные строки нужной конюшни, каждая учитывается один раз

### Requirement: Формулы агрегатов
M5/M6 SHALL агрегировать в SQL: суммы visits/users/pageviews/bounces/visit_duration_seconds; bounce_rate = SUM(bounces)*100/SUM(visits), page_depth = SUM(pageviews)/SUM(visits), avg_visit_duration_seconds = SUM(visit_duration_seconds)/SUM(visits). Производные округляются до 8 знаков, при нулевых визитах равны 0. Среднее дневных средних MUST NOT использоваться; users — сумма дневных счётчиков, не уникальные за период.

#### Scenario: Неравные объёмы
- **WHEN** за два дня visits равны 99 и 1, bounces — 0 и 1, pageviews — 198 и 10, duration — 990 и 100
- **THEN** bounce_rate=1, page_depth=2.08, avg_visit_duration_seconds=10.9, а суммы visits=100 и pageviews=208

#### Scenario: Ноль и отсутствие данных
- **WHEN** у Q1 есть строка с нулевыми визитами, а у Q2 строк нет
- **THEN** Q1 имеет нулевой агрегат, Q2 не имеет пары запрос–bucket в ответе

### Requirement: Ответ таблицы и SQL boundedness
M5 SHALL возвращать `{"metric", "values":[{"search_query_id", "bucket", "value"}]}`; bucket — дата начала переданного bucket. Только запрошенные UUID и buckets, не более одной записи на пару. Аддитивные значения — целые, производные — JSON-числа до 8 знаков. Один вызов MUST выполнять один SQL независимо от числа UUID и buckets.

#### Scenario: Пакет 100 на 31
- **WHEN** при SQL-логировании запрошены 100 UUID и 31 bucket
- **THEN** выполнен один SQL, отсутствующие пары опущены, реальные нули включены

### Requirement: Ответ ранжирования
M6 SHALL возвращать `{"metric", "direction", "search_query_ids"}`: все UUID конюшни с данными диапазона, отсортированные в SQL по числовому агрегату в direction и UUID asc при равенстве. UUID без данных не включаются; один вызов MUST выполнять один SQL. Поиск, список сущностей и пагинацию сервис MUST NOT выполнять.

#### Scenario: Равенство и оба направления
- **WHEN** у Q1 и Q2 равные значения, Q1<Q2 по UUID, у Q3 данных нет
- **THEN** в asc и desc Q1 раньше Q2, Q3 отсутствует; лог содержит один SQL
