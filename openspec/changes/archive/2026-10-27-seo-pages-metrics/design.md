# Design — seo-pages-metrics

**Тикет:** [`docs/tasks/102_metrics_pages.md`](../../../docs/tasks/102_metrics_pages.md)

**Дата:** 2026-10-26 (ревизия 2 — по решениям пользователя)

**Сервисы:** `services/seo-service`, `services/ya-metrica-service`, `services/backend`, `services/frontend` (CMS)

**Предшественники:**

*   099/100 — seo-service и CMS SEO UI;
*   101 `metrica-stats-parsing` — архив `openspec/changes/archive/2026-10-26-metrica-stats-parsing/`, specs `metrica-stats-*` уже в `openspec/specs/`, код в `main` ya-metrica-service.

**Git:** работа в текущей ветке `main` каждого сервиса, без создания веток и коммитов. Git выполняет пользователь.

**Quality Gate:** `QG-FULL` (код в 4 сервисах). Порядок lanes: `QG-ENV` → (`QG-BE` ∥ `QG-FE-AUTO` ∥ `QG-CONTRACTS`) → (`QG-LIVE` ∥ `QG-FE-MANUAL`) → `QG-SYNTH`.

## Context

*   **ya-metrica-service.**
    *   Хранит дневные строки `metrica_page_stats`: `equestrian_id`, `stat_date`, `page_id`, аддитивные `visits/users/pageviews/bounces/visit_duration_seconds` и generated `bounce_rate/page_depth/avg_visit_duration_seconds`.
    *   Уникальный ключ `(equestrian_id, stat_date, page_id)` даёт индекс с ведущими `(equestrian_id, stat_date)`, поэтому миграции не нужны.
    *   Peer-контракт: только `200/204/400`, без credentials.
    *   Настройка `YA_METRICA_UTC_OFFSET_HOURS` используется парсингом. Этот change её не использует.
*   **seo-service.**
    *   Отдаёт `GET /api/pages`: `items/total`, поиск ILIKE, сортировка `page/-page`, по умолчанию `created_at desc, id desc`. Реализация — через `ResolvableRepository.get_filtered/count_filtered`.
    *   HTTP-клиентов к другим сервисам нет; статусы `200/201/204/400/401/404/409/500`.
    *   Настроек часового пояса нет.
*   **backend.**
    *   Проксирует `GET /api/seo/pages`: только `ADMIN`, конюшня из сессии.
    *   5xx, транспортная ошибка или невалидный payload → `502`.
    *   Клиент `src/clients/seo_service/client.py`, таймаут 10 с.
*   **CMS.**
    *   `SeoPage.tsx` рендерит antd `Tabs` с `renderTabBar`; кнопка «Нормализация» — справа.
    *   `SeoDataTable` общий для страниц и запросов: пагинация над таблицей, a11y-логика фильтра в заголовке.
    *   Hook `useSeoDataTable` общий для обеих таблиц.
    *   Эталон — «Услуги и цены»:
        *   `PricesHeader`: вкладки слева; справа `TablePaginator`, «Сбросить» (`FilterOutlined`, `color="danger" variant="outlined"`) и действия;
        *   `MainTable` принимает `filtersElements` и сам считает высоту, поэтому прокручивается только тело таблицы.
*   **Live-данные:** конюшня `5f6496aa-4fe9-42da-a763-29f9bab22d73`, 146 страниц в seo, 2013 строк `metrica_page_stats` за `2026-01-01…2026-10-26`.

## Goals / Non-Goals

**Goals:**

Показывать выбранный показатель по страницам за период в режимах день, неделя, месяц, год: агрегация в SQL ya-metrica, серверная сортировка по любой колонке периода.

Разрешать период целиком в seo-service:

*   значения по умолчанию;
*   выравнивание по границам режима;
*   без будущих дат;
*   лимит режима;
*   колонки.

Дать универсальный расширяемый DTO `metrics_table`: его формирует сервер, CMS рендерит без бизнес-логики форматирования.

Подтвердить отсутствие N+1 тестами со счётчиком и логированием SQL и live-прогоном с `log_statement=all`.

Сделать раскладку вкладки «Страницы» по образцу «Услуги и цены» на 1366×768.

**Non-Goals:**

*   Вкладка «Запросы»: её поведение, раскладка, hook и формат «Создано» не меняются.
*   Изменение парсинга, схемы БД ya-metrica и `YA_METRICA_UTC_OFFSET_HOURS`.
*   Кэширование агрегатов, материализованные представления, репликация страниц в ya-metrica.
*   Сетевая изоляция peers и production-готовность (наследуемый gap R-G4).
*   Tablet и mobile.
*   Git-операции: ветки, коммиты, merge.

## Decisions

### D1. Распределение ответственности

| Слой | Отвечает за | Не делает |
| --- | --- | --- |
| seo-service | Разрешение периода (D2) и колонок. Фильтр `search`, сортировка (в том числе по рангу метрики) и пагинация страниц — SQL своей БД. Преобразование значений ya-metrica в `metrics_table`: заголовки, форматирование | Не агрегирует и не сортирует в памяти |
| ya-metrica-service | Агрегация показателя по переданным колонкам и ранжирование в переданном диапазоне — SQL | Не знает календарь, умолчания, лимиты, «сегодня», текст страниц, поиск и пагинацию |
| backend | ADMIN-доступ, конюшня из сессии, синтаксическая валидация query, проверка схемы `metrics_table`, трансляция ошибок | Не применяет правила периода, не форматирует, не вызывает ya-metrica |
| CMS | Состояние фильтров, сортировки и пагинации; запрет будущих дат в пикере; подстановка итогового периода; уведомление об обрезке; универсальный рендер `metrics_table` | Не вычисляет умолчания, не форматирует значения |

Цепочка вызовов:

1.  CMS → backend `GET /api/seo/pages`.
2.  backend → seo-service `GET /api/pages`, где разрешается период.
3.  seo-service → ya-metrica M4 — только при сортировке по колонке, которая есть в периоде.
4.  SQL seo-service.
5.  seo-service → ya-metrica M3 — только при непустой выборке.

### D2. Период разрешает seo-service

Владелец — seo-service. Новая настройка `SEO_UTC_OFFSET_HOURS`: `int`, −12..14, по умолчанию `3`; вне диапазона сервис не запускается. Чистый класс `MetricsPeriodResolver` с инъекцией часов, `src/core/services/metrics_period/`.

```
today = (now_utc + SEO_UTC_OFFSET_HOURS).date()
start_of(u, d): day→d; week→d − d.weekday(); month→d.replace(day=1); year→d.replace(month=1, day=1)
add(u, d, n):   day→d+n; week→d+7n; month/year — календарно
end_of(u, d) = add(u, start_of(u, d), 1) − 1 день
LIMIT  = {day: 31, week: 16, month: 12, year: 5}
DEFLEN = {day: 7,  week: 4,  month: 6,  year: 2}

без дат: from = add(u, start_of(u, today), −(DEFLEN−1)); to = today; defaulted = true
с датами (обе, from ≤ to, иначе 400):
  1. from' = min(from, today)                                  # будущее начало → сегодня
  2. from'' = start_of(u, from'); to' = end_of(u, to)          # выравнивание по границам режима
  3. max_to = end_of(u, add(u, from'', LIMIT−1)); если to' > max_to → to' = max_to, clamped = true
  4. to'' = min(to', today)                                    # без будущих дат
  adjusted = (from'', to'') != (from, to) и не только из-за clamped
колонки: от from'' шагом u; date_to колонки = min(конец единицы, to''); ≤ 31 колонки
```

Порядок шагов «выравнивание → лимит → сегодня» гарантирует, что все колонки полные, кроме последней, если её обрезал сегодняшний день. `defaulted`, `adjusted`, `clamped` и `requested_*` возвращаются в `metrics_table.period`.

Почему в seo-service: так решил пользователь. Период нужен seo-service и для заголовков колонок, и для проверки, есть ли колонка сортировки в периоде, ещё до вызовов ya-metrica. Ранжирование и значения получают одни и те же границы, и разрешение периода больше не дублируется между M3 и M4. Цена решения — второй setting часового пояса, его нужно держать согласованным с `YA_METRICA_UTC_OFFSET_HOURS` (см. «Risks»).

### D3. Агрегация и ранжирование одним SQL (ya-metrica)

Выражение показателя выбирается из whitelist-отображения enum → SQLAlchemy expression; ввод в SQL не интерполируется.

```
visits/users/pageviews/bounces/visit_duration_seconds → SUM(col)
bounce_rate                → CASE WHEN SUM(visits)>0 THEN ROUND(SUM(bounces)*100.0/SUM(visits), 8) ELSE 0 END
page_depth                 → CASE WHEN SUM(visits)>0 THEN ROUND(SUM(pageviews)::numeric/SUM(visits), 8) ELSE 0 END
avg_visit_duration_seconds → CASE WHEN SUM(visits)>0 THEN ROUND(SUM(visit_duration_seconds)::numeric/SUM(visits), 8) ELSE 0 END
```

Таблица (M3): колонки передаются массивами начал и концов.

```
WITH b(bucket_from, bucket_to) AS (
  SELECT * FROM unnest(CAST(:froms AS date[]), CAST(:tos AS date[]))
)
SELECT s.page_id, b.bucket_from AS bucket, <metric_expr> AS value
FROM metrica_page_stats s
JOIN b ON s.stat_date BETWEEN b.bucket_from AND b.bucket_to
WHERE s.equestrian_id = :eq AND s.page_id = ANY(:page_ids)
  AND s.stat_date BETWEEN :min_from AND :max_to
GROUP BY s.page_id, b.bucket_from
```

Ранжирование (M4):

```
SELECT page_id FROM metrica_page_stats
WHERE equestrian_id = :eq AND stat_date BETWEEN :date_from AND :date_to
GROUP BY page_id
ORDER BY <metric_expr> {ASC|DESC}, page_id ASC
```

Код:

*   новый репозиторий `PageStatsQueryRepository` — отдельно от репозитория парсинга;
*   сессия на запрос, как в `api/parse.py` (`worker_session`), только чтение;
*   валидация колонок (1..31, `from ≤ to`, по возрастанию без пересечений) и `page_ids` (1..100) — в API-схемах ya-metrica.

### D4. Поток `GET /api/pages` в seo-service

Валидировать query: `mode`, `metric`, даты, `ordering`, `limit`, `offset`. При ошибке → `400`.

Разрешить период (D2).

Если `ordering=[-]metric:<date>`:

*   колонки с ключом `<date>` в периоде нет → сортировка по умолчанию, `metrics_table.ordering=null`, M4 не вызывается;
*   колонка есть → M4 (`date_from/date_to` колонки, `direction`) → список UUID.

Один SQL выборки и прежний `count_filtered`.

Если выборка непустая → M3 (все колонки периода, UUID выборки).

`MetricsTableBuilder` → ответ.

Страницы без данных в колонке идут после ранжированных в обоих направлениях (`NULLS LAST`).

Сортировка `created_at/-created_at` (только для страниц): `ORDER BY created_at {dir}, id {dir}`. «Создано» показывается датой, а сортируется по полному timestamp.

Отклонённые альтернативы:

*   слияние списков в памяти seo — нарушает требование «только SQL»;
*   передача в ya-metrica всех отфильтрованных UUID — поиск живёт в seo, объём не меньше;
*   репликация страниц в ya-metrica — вне scope.

### D5. Универсальный DTO `metrics_table`

Фрагмент ответа `GET /api/seo/pages?mode=week&metric=bounce_rate&ordering=-metric:2026-10-19`, сегодня `2026-10-26`:

```
{
  "items": [{"id": "8a1…", "page": "/services/rides", "created_at": "2026-10-23T14:05:00Z"}],
  "total": 146,
  "metrics_table": {
    "version": 1,
    "row_key": "id",
    "period": {"mode": "week", "date_from": "2026-10-05", "date_to": "2026-10-26",
               "requested_date_from": null, "requested_date_to": null,
               "defaulted": true, "adjusted": false, "clamped": false, "today": "2026-10-26"},
    "metric": {"key": "bounce_rate", "title": "Доля отказов", "value_type": "percent"},
    "ordering": "-metric:2026-10-19",
    "columns": [
      {"key": "metric:2026-10-19", "title": "19–25 окт", "hint": "19.10.2026 – 25.10.2026",
       "sortable": true, "value_type": "percent", "align": "right", "empty_text": "—",
       "values": {"8a1…": {"text": "16,67%", "value": 16.66666667}}},
      {"key": "metric:2026-10-26", "title": "26 окт – 1 ноя", "hint": "26.10.2026",
       "sortable": true, "value_type": "percent", "align": "right", "empty_text": "—", "values": {}}
    ]
  }
}
```

Отличия от примера задачи:

*   `columns` — массив, порядок гарантирован;
*   `key` отделён от `title`;
*   добавлены `value`, `value_type`, `align`, `empty_text`, `version`, `row_key`, `period`, `ordering`.

Значения разрежены: нет данных — нет ключа. DTO расширяется только необязательными полями, неизвестное потребители игнорируют (pydantic `extra="allow"` в backend; CMS читает только известные поля).

Где лежат схемы:

| Сервис | Путь | Роль |
| --- | --- | --- |
| seo-service | `src/core/schemas/api/metrics_table.py` | производитель |
| backend | `src/core/schemas/metrics_table.py` | переиспользуемая валидация |
| CMS | `src/types/api/metricsTable.ts` + рендер `src/ui/metricsTable/` | рендер |

### D6. Форматирование и заголовки — в seo-service

Все компоненты — чистые классы в `src/core/services/metrics_table/`:

*   `MetricRegistry`: ключ → название, `value_type`;
*   `MetricValueFormatter`: `Decimal` + `ROUND_HALF_UP`, запятая, `\u00a0` для тысяч, длительности `ч/мин/с`;
*   `PeriodHeaderFormatter`: `title` — календарная единица целиком (неделя `26 окт – 1 ноя`, месяц `окт`, год `2026`), даже если её обрезал сегодняшний день; `hint` — фактические границы колонки; текущий год берётся из `period.today`;
*   `MetricsTableBuilder`: собирает DTO из периода, ответа M3 и UUID строк.

### D7. Ошибки, таймауты, статусы

*   **seo → ya-metrica:** `YA_METRICA_SERVICE_URL` (по умолчанию `http://eqsitecms-ya-metrica-service:8000`), `YA_METRICA_TIMEOUT_SECONDS` (по умолчанию `4`). Два последовательных вызова занимают ≤ 8 с, это меньше таймаута backend 10 с. Клиент работает с `trust_env=False`, без cookie и Authorization.
*   **Сбой ya-metrica:** любой не-`200`, таймаут, транспортная ошибка или невалидная схема ответа → `MetricaUnavailableError` → seo отвечает `502 {"detail": "Сервис статистики недоступен"}`. Тело и URL peer не логируются и не возвращаются.
*   **Валидация в seo:** seo сам проверяет ввод и сам строит колонки, поэтому `400` от ya-metrica означает нарушение контракта → `502`.
*   **backend:** правило 5xx → `502` не меняется. Синтаксическая валидация `mode/metric/date_*` (enum, формат, обе даты или ни одной, `from ≤ to`) → `400` без вызова seo. Правила «сегодня» и лимиты backend не применяет.

### D8. Отсутствие N+1

**Автоматически:**

*   в integration-тестах ya-metrica и seo — фикстура на `before_cursor_execute` синхронного engine: логирует SQL (`logging` → `caplog`) и считает операторы;
*   ассерты: M3 — 1 оператор на 100 UUID × 31 колонку; M4 — 1; список seo — 2 оператора при `limit=5` и `limit=50`, с ранжированием и без;
*   unit-тесты seo: ≤2 вызова клиента ya-metrica на запрос и 0 при пустой выборке без сортировки по метрике;
*   unit-тесты backend: 1 вызов seo.

**Live (SMOKE-1, QG-LIVE):**

1.  На `eqsitecms-db-seo` и `eqsitecms-db-ya-metrica` временно включить логирование: `ALTER SYSTEM SET log_statement='all'; SELECT pg_reload_conf();`.
2.  Выполнить один запрос backend: `limit=100&mode=day`, 31 день, `ordering=-metric:<date>`.
3.  Посчитать операторы в `docker logs`. Ожидание: seo — 2 SELECT по `pages`, ya-metrica — по 1 SELECT на вызов.
4.  Вернуть настройку: `ALTER SYSTEM RESET log_statement; SELECT pg_reload_conf();`.

### D9. CMS: раскладка и состояние (только «Страницы»)

**Строка вкладок** `**SeoPage**`**:**

*   в `renderTabBar` слева `DefaultTabBar`;
*   справа — только на вкладке «Страницы»: `TablePaginator` страниц, «Сбросить» (как в `PricesHeader`), «Нормализация» (при `LIST_NORMALIZATION`);
*   «Запросы» без изменений, пагинация остаётся над их таблицей.

**Панель «Страницы»:**

*   `MainTable` с `filtersElements` = строка фильтров: `Select` «Режим», `Select` «Показатель», `DatePicker.RangePicker` с `picker` = `date|week|month|year` и `allowClear=false`;
*   высоту вычисляет `MainTable`, прокручивается только тело (`scroll={{x: "max-content", y}}`);
*   колонки «Страница» и «Создано» закреплены (`fixed: "left"`).

**Пикер:**

*   `disabledDate` блокирует всё после «сегодня» — `metrics_table.period.today` последнего ответа, до первого ответа — `dayjs()`;
*   выбор переводится в даты: неделя — пн..вс, месяц — 1-е..последнее число, год — 1.01..31.12;
*   конец в будущем заменяется на «сегодня»;
*   отображение: `DD.MM.YYYY` (для недели — диапазон её дат), `MMM YYYY`, `YYYY`.

**Hook** `**useSeoPagesTable**` **(новый):**

*   `useSeoDataTable` не меняется, «Запросы» продолжают его использовать; ветка `pages` в нём просто перестаёт вызываться;
*   состояние: `{limit, offset, search, mode, metric, dateFrom?, dateTo?}` + `sort` (одно значение);
*   первое открытие и смена режима — запрос без дат;
*   после каждого ответа даты фильтра заменяются `period.date_from/date_to` без повторного запроса;
*   при `clamped` — `message.warning("Диапазон сокращён до лимита «<31 день|16 недель|12 месяцев|5 лет>»: <from> – <to>")`; при `adjusted` уведомления нет;
*   индикатор сортировки синхронизирован с `metrics_table.ordering`;
*   защита от устаревших ответов (generation) и scope guard — как в существующем hook.

**«Сбросить»:**

*   снимает сортировку, применённый поиск и черновик поиска, ставит `offset=0`;
*   режим, показатель, даты и `limit` не трогает;
*   отправляет один запрос.

**Универсальный рендер** `**buildMetricsTableColumns(table, {sort})**` **в** `**src/ui/metricsTable/**`**.** Для каждой колонки строится колонка antd:

*   `key`;
*   заголовок `Tooltip(hint, title)`;
*   `align`;
*   `sorter` при `sortable`;
*   `render` → `values[row[row_key]]?.text ?? empty_text`.

`**SeoDataTable**`**:**

*   получает необязательные пропсы: дополнительные колонки, «Создано» с датой `DD.MM.YYYY` и сортировкой, `filtersElements`, закрепление колонок;
*   без пропсов (у «Запросов») рендер идентичен текущему; это проверяется существующими тестами;
*   логика фильтра заголовка не копируется.

### D10. Git

Работа ведётся в текущей ветке каждого сервиса. Сейчас это `main` во всех четырёх, код задачи 101 в `main` ya-metrica присутствует. Ветки не переключаются и не создаются, коммиты не делаются. Units возвращают список изменённых файлов в handoff, git выполняет пользователь.

### D11. Документация

Обновить:

*   README ya-metrica — M3/M4, формат колонок, агрегация, access class;
*   README seo — параметры `GET /api/pages`, алгоритм периода, `SEO_UTC_OFFSET_HOURS`, `metrics_table`, зависимость от ya-metrica, `502`, env;
*   `SERVICES.md` §8/9 и §10;
*   `services/backend/docs/backend-route-inventory.md` — строка `/api/seo/pages`.

Sync specs и archive — после `QG-SYNTH = APPROVED`.

## API contract

### ya-metrica M3 `GET /api/metrica/page-stats/table`

Query: `equestrian_id`, `metric`, повторяемый `bucket=YYYY-MM-DD..YYYY-MM-DD` (1..31), повторяемый `page_ids` (1..100).

Пример: `?equestrian_id=…&metric=visits&bucket=2026-10-19..2026-10-25&bucket=2026-10-26..2026-10-26&page_ids=…&page_ids=…`.

Ответ `200`:

```
{"metric": "visits", "values": [{"page_id": "8a1…", "bucket": "2026-10-19", "value": 12}]}
```

### ya-metrica M4 `GET /api/metrica/page-stats/ranking`

Query: `equestrian_id`, `metric`, `date_from`, `date_to` (≤ 366 дней), `direction`.

Ответ `200`:

```
{"metric": "visits", "direction": "desc", "page_ids": ["…"]}
```

### seo-service `GET /api/pages`

Query:

*   новые: `mode`, `metric`, `date_from`, `date_to`;
*   `ordering` ∈ `page|-page|created_at|-created_at|metric:YYYY-MM-DD|-metric:YYYY-MM-DD`.

Ответ — `items/total/metrics_table` (D5).

### backend `GET /api/seo/pages`

Те же query: `mode` и `metric` — enum, даты — `date`. Ответ такой же, как у seo. `GET /api/seo/search-queries` не меняется.

## Access matrix

| method | path | access class | roles | expected without auth | expected with auth |
| --- | --- | --- | --- | --- | --- |
| GET | ya-metrica `/api/metrica/page-stats/table` (M3, новый) | Private Peer Read exception | доверенный сервис (seo-service) | `200`; ошибка валидации или обработки — `400` | то же (credentials игнорируются) |
| GET | ya-metrica `/api/metrica/page-stats/ranking` (M4, новый) | Private Peer Read exception | доверенный сервис (seo-service) | `200`; ошибка валидации или обработки — `400` | то же |
| GET | seo `/api/pages` (изменён) | Internal Trusted Network Read exception | доверенный caller (backend) | `200`; нет или невалиден selector — `401`; невалидный query — `400`; сбой ya-metrica — `502` | то же |
| GET | backend `/api/seo/pages` (изменён) | Protected GET exception | только `ADMIN` | `401` | `200`; без ADMIN `403`; невалидный query `400`; сбой downstream `502` |

Причины исключений:

*   M3/M4 — приватная аналитика, только service-to-service внутри доверенной сети, как M1/M2;
*   seo `/api/pages` и backend `/api/seo/pages` — существующие исключения: внутренние SEO-данные администрирования, не нужны `site-*`.

Anonymous/authenticated тесты: `AT-MP-01..02`, `AT-SP-01..02`, `UT-BP-01..03`, `FT-PM-03`, `SM-PM-01`, `SM-PM-05`, `SM-PM-09`.

Production: подтверждение внешней недоступности peers остаётся блокером выпуска (R-G4); этот change его не закрывает.

## Execution units

Пути — относительно корня сервиса, если не указано иное.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
| --- | --- | --- | --- | --- | --- |
| `MP-BE-1` | Backend | A ya-metrica | `src/core/entities/metrica_stats_query.py`, `src/core/protocols/repositories/page_stats_query.py`, `src/repositories/page_stats_query_repository.py` (+ экспорты `__init__.py`), `tests/integration/test_page_stats_query_postgres.py`, `tests/integration/conftest.py` | — | `IT-MP-01..06` (реальная PostgreSQL, `TEST_DATABASE_URL`) |
| `MP-BE-2` | Backend | A ya-metrica | `src/core/services/page_stats_query_service.py`, `src/core/schemas/api/page_stats.py`, `src/api/page_stats.py`, `src/api/__init__.py`, `src/main.py`, `src/containers/**`, `tests/unit/test_page_stats_query_service.py`, `tests/unit/test_page_stats_schemas.py`, `tests/unit/test_containers.py`, `tests/api/test_page_stats_api.py`, `README.md` | `MP-BE-1` | `UT-MP-01..02`, `AT-MP-01..04`, `make test-cov`, `make lint` |
| `SEO-BE-1` | Backend | B seo | `src/settings.py` (`SEO_UTC_OFFSET_HOURS`), `.env.example`, `src/core/services/metrics_period/**`, `src/core/services/metrics_table/registry.py`, `src/core/services/metrics_table/value_formatter.py`, `src/core/services/metrics_table/header_formatter.py`, `src/core/schemas/api/metrics_table.py`, `tests/unit/test_metrics_period.py`, `tests/unit/test_metrics_table_formatters.py`, `tests/unit/test_settings.py` | — | `UT-SP-01..08`, targeted pytest, `make lint` |
| `SEO-BE-2` | Backend | B seo | `src/settings.py` (`YA_METRICA_*`), `.env.example`, `src/clients/**`, `src/core/protocols/clients/**`, `src/core/schemas/clients/**`, `src/core/exceptions/**`, `src/core/services/metrics_table/builder.py`, `src/containers/**`, `tests/clients/**`, `tests/unit/test_metrics_table_builder.py`, `tests/unit/test_containers.py` | `SEO-BE-1` | `UT-SP-09..10`, targeted pytest, `make lint` |
| `SEO-BE-3` | Backend | B seo | `src/repositories/abstract_repository.py`, `src/repositories/page_repository.py`, `src/core/protocols/repositories/page_repository.py`, `src/core/services/page_service.py`, `src/core/schemas/api/pages.py`, `src/api/pages.py`, `src/api/route.py`, `src/main.py`, `tests/integration/test_entity_repository_postgres.py`, `tests/integration/conftest.py`, `tests/unit/test_page_service.py`, `tests/unit/test_listing_services.py`, `tests/api/test_listing_api.py`, `tests/api/test_access.py`, `tests/api/test_errors.py`, `README.md`, корневой `SERVICES.md` (§8/9, §10) | `SEO-BE-2` | `UT-SP-11..13`, `IT-SP-01..04`, `AT-SP-01..05`, `make test`, `make lint` |
| `BE-1` | Backend | C backend | `src/core/schemas/metrics_table.py`, `src/clients/seo_service/**`, `src/core/protocols/seo_service.py`, `src/core/services/seo_proxy.py`, `src/api/seo.py`, `tests/unit/api/test_seo_proxy_api.py`, `tests/unit/api/test_seo_client_boundary.py`, `tests/unit/core/services/test_seo_proxy_service.py`, `tests/unit/api/test_route_access_inventory.py`, `docs/backend-route-inventory.md` | — (контракт D5/API) | `UT-BP-01..08`, `make test`, `make lint` |
| `FE-1` | Frontend | D CMS | `src/types/api/metricsTable.ts`, `src/types/api/seo.ts`, `src/api/seo.ts`, `src/api/seo.test.ts`, `src/features/seo/services/seoDataService.ts` (+test), `src/features/seo/services/pageMetricsOptions.ts` (+test), `src/features/seo/hooks/useSeoPagesTable.ts` (+test) | — (контракт D5/API) | `FT-PM-01..10`, `npm test -- seo`, `npx tsc --noEmit` |
| `FE-2` | Frontend | D CMS | `src/ui/metricsTable/**`, `src/features/seo/ui/SeoPage.tsx` (+test), `SeoPagesPanel.tsx`, `SeoPagesFilters.tsx` (+test), `SeoDataTable.tsx` (+test), `seoStyles.ts` | `FE-1` | `FT-PM-11..16`, `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` |
| `SMOKE-1` | Backend | E verification | — (evidence `.qa/seo-pages-metrics/smoke/`) | `MP-BE-2`, `SEO-BE-3`, `BE-1` | `SM-PM-01..12` на живом стеке и реальной PostgreSQL |
| `QG-ENV` | Quality Gate | — | `.qa/seo-pages-metrics/qg-env/` | `SMOKE-1`, `FE-2` | пересборка 4 сервисов, health |
| `QG-BE` | Quality Gate | — | `.qa/seo-pages-metrics/qg-be/` | `QG-ENV` | scoped format/lint/test ya-metrica, seo, backend; покрытие test matrix |
| `QG-FE-AUTO` | Quality Gate | — | `.qa/seo-pages-metrics/qg-fe-auto/` | `QG-ENV` | `npm test/lint/tsc/build`, self-checks |
| `QG-CONTRACTS` | Quality Gate | — | `.qa/seo-pages-metrics/qg-contracts/` | `QG-ENV` | access matrix, контракт `metrics_table`, контракт колонок M3/M4, статусы peers |
| `QG-LIVE` | Quality Gate | — | `.qa/seo-pages-metrics/qg-live/` | `QG-BE`, `QG-CONTRACTS` | независимый прогон ключевых `SM-PM-*`, live N+1 |
| `QG-FE-MANUAL` | Quality Gate | — | `.qa/seo-pages-metrics/qg-fe-manual/` | `QG-FE-AUTO` | `M-PM-01..17` на 1366×768 |
| `QG-SYNTH` | Quality Gate | — | `docs/reports/seo-pages-metrics.md` | `QG-LIVE`, `QG-FE-MANUAL` | итоговый вердикт |

### DAG

```
MP-BE-1 → MP-BE-2 ────────────────────┐
SEO-BE-1 → SEO-BE-2 → SEO-BE-3 ───────┼→ SMOKE-1 ─┐
BE-1 ─────────────────────────────────┘           ├→ QG-ENV → (QG-BE ∥ QG-FE-AUTO ∥ QG-CONTRACTS) → (QG-LIVE ∥ QG-FE-MANUAL) → QG-SYNTH
FE-1 → FE-2 ──────────────────────────────────────┘
```

Цепочки `MP-BE-*`, `SEO-BE-*`, `BE-1` и `FE-*` можно запускать параллельно: репозитории разные, контракт зафиксирован здесь. Внутри seo-service units выполняются строго последовательно: `src/settings.py`, `.env.example` и `src/containers/**` трогают `SEO-BE-1` и `SEO-BE-2`, но в разных units одной цепочки. `SERVICES.md` принадлежит только `SEO-BE-3`.

## Test matrix

### Backend: ya-metrica-service (`MP`)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где проверяется |
| --- | --- | --- | --- | --- | --- |
| `UT-MP-01` | unit | валидация | колонки: 0/32 штук, `from > to`, пересечение, обратный порядок, некорректный формат; `page_ids` 0/101, дубликаты; неизвестный `metric`; M4: `from > to`, > 366 дней, нет `direction` | ошибка ввода / схлопывание | `tests/unit/test_page_stats_schemas.py` |
| `UT-MP-02` | unit | контракт | сервис передаёт границы без изменений; ровно 1 вызов репозитория для M3 и M4 | границы = вход | `tests/unit/test_page_stats_query_service.py` |
| `IT-MP-01` | integration PG | агрегация | суммы `visits/users/pageviews/bounces/visit_duration_seconds` по недельным, месячным и годовым колонкам | равны сумме строк | `tests/integration/test_page_stats_query_postgres.py` |
| `IT-MP-02` | integration PG | агрегация | средневзвешенные `bounce_rate` (1, а не 50), `page_depth`, `avg_visit_duration_seconds`; нулевые визиты | по правилам парсинга; `0` | там же |
| `IT-MP-03` | integration PG | регрессия семантики | однодневные колонки = generated-колонки строки | равенство | там же |
| `IT-MP-04` | integration PG | изоляция | чужая конюшня, фильтр `page_ids`, разреженность, строки между колонками и после последней | только своя конюшня, только пары с данными | там же |
| `IT-MP-05` | integration PG | сортировка | ранжирование asc/desc, равенство значений → по `page_id`, только строки в границах | порядок по контракту | там же |
| `IT-MP-06` | integration PG | N+1 | SQL-лог: M3 на 100 UUID × 31 колонку, M4 | ровно 1 оператор на каждый вызов | там же |
| `AT-MP-01` | API | access | M3 без cookie и с cookie/Bearer | `200`, тела идентичны | `tests/api/test_page_stats_api.py` |
| `AT-MP-02` | API | access | M4 без cookie и с cookie/Bearer | `200`, тела идентичны | там же |
| `AT-MP-03` | API | валидация, контракт | все ошибки ввода M3/M4, формат повторяемых `bucket`/`page_ids` | `400`, `detail` без входных значений | там же |
| `AT-MP-04` | API | внешние ошибки | ошибка БД; неверный метод или slash | безопасный `400` | там же |

Транзакционность и идемпотентность: неприменимо — только чтение. Персистентность: `IT-MP-*` на реальной PostgreSQL.

### Backend: seo-service (`SP`)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где проверяется |
| --- | --- | --- | --- | --- | --- |
| `UT-SP-01` | unit | умолчания, часовой пояс | умолчания 4 режимов; `22:30Z` со смещением `+3` и `−12` | периоды и колонки по `seo-metrics-period` | `tests/unit/test_metrics_period.py` |
| `UT-SP-02` | unit | выравнивание | неделя чт..вт → пн..вс; месяц/год до границ; `adjusted` | границы единиц | там же |
| `UT-SP-03` | unit | сегодня | конец в будущем → сегодня; начало в будущем → сегодня; текущая единица обрезана; `adjusted` без `clamped` | без будущих дат | там же |
| `UT-SP-04` | unit | лимит | ровно лимит / лимит + 1 для 4 режимов, 29 февраля, взаимодействие с «сегодня» | `clamped`, `requested_*` | там же |
| `UT-SP-05` | unit | валидация, колонки | одна дата, обратный диапазон, неизвестные `mode/metric`; колонки: ключи, отсутствие пропусков, ≤ 31 | `400` / корректные колонки | там же |
| `UT-SP-06` | unit | форматирование | integer/decimal/percent/duration, half-up, `0`, `12345`, `2.0` | строки `metrics-table-contract` | `tests/unit/test_metrics_table_formatters.py` |
| `UT-SP-07` | unit | заголовки | день; неделя в одном месяце, через месяцы, через годы; текущая обрезанная неделя/месяц (`title` единицы, `hint` фактический); месяц/год прошлого года | точные строки | там же |
| `UT-SP-08` | unit | конфигурация | `SEO_UTC_OFFSET_HOURS`: по умолчанию 3, границы −12/14, 15 и нецелое → ошибка | по `seo-metrics-period` | `tests/unit/test_settings.py` |
| `UT-SP-09` | unit | внешние ошибки, секреты | клиент: параметры (`equestrian_id`, повторяемые `bucket` и `page_ids`), нет cookie/Authorization, таймаут; `400`/`5xx`/транспорт/невалидная схема → ошибка без тела; `YA_METRICA_*` по умолчанию | по D7 | `tests/clients/test_ya_metrica_client.py` |
| `UT-SP-10` | unit | контракт DTO | builder: порядок колонок, ключи `metric:`, разреженные `values`, `empty_text`, `metric`, `period`, `ordering` | схема `metrics_table` | `tests/unit/test_metrics_table_builder.py` |
| `UT-SP-11` | unit | happy path, N+1 | без сортировки по метрике: 1 вызов `table` со всеми колонками и UUID выборки; пустая выборка → 0 вызовов | число вызовов | `tests/unit/test_page_service.py` |
| `UT-SP-12` | unit | сортировка | `metric:` в периоде → `ranking` с границами колонки → репозиторий с рангом → `table`; вне периода → без `ranking`, `ordering=null` | порядок вызовов | там же |
| `UT-SP-13` | unit | валидация | `ordering` (`created_at`, `metric:` с невалидной датой), `mode`, `metric`, даты → ошибка до вызова клиента | клиент не вызван | `tests/unit/test_listing_services.py` |
| `IT-SP-01` | integration PG | сортировка | `created_at` asc/desc, при равенстве — по `id` | детерминированный порядок | `tests/integration/test_entity_repository_postgres.py` |
| `IT-SP-02` | integration PG | сортировка, пагинация | ранжированные первыми по ordinal, остальные — по умолчанию; `search`; `offset`; `total` не зависит от ранга | по D4 | там же |
| `IT-SP-03` | integration PG | N+1 | SQL-лог: список при `limit=5` и `50`, с рангом и без | ровно 2 оператора | там же |
| `IT-SP-04` | integration PG | объём | ранжирование 5000 UUID | один оператор, порядок верный | там же |
| `AT-SP-01` | API | access | `GET /api/pages` без credentials и с cookie/Authorization (клиент замокан) | `200`, тела с `metrics_table` идентичны | `tests/api/test_access.py` |
| `AT-SP-02` | API | access, tenant | нет или невалиден `X-Equestrian-Id` | `401`; БД и клиент не вызваны | там же |
| `AT-SP-03` | API | валидация | `mode=quarter`, одна дата, обратный диапазон, `ordering=metric:2026-13-40` | `400`, клиент не вызван | `tests/api/test_listing_api.py` |
| `AT-SP-04` | API | внешние ошибки | клиент бросает ошибку ya-metrica | `502`, безопасный `detail` | `tests/api/test_errors.py` |
| `AT-SP-05` | API | контракт, регрессия | схема ответа страниц; `search-queries` по-прежнему отвергает `ordering=created_at` | у запросов без изменений | `tests/api/test_listing_api.py` |

### Backend: backend (`BP`)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где проверяется |
| --- | --- | --- | --- | --- | --- |
| `UT-BP-01` | unit API | access | anonymous `GET /api/seo/pages?mode=month` | `401`, seo не вызван | `tests/unit/api/test_seo_proxy_api.py` |
| `UT-BP-02` | unit API | access | SUPERUSER/DEVELOPER без ADMIN | `403`, seo не вызван | там же |
| `UT-BP-03` | unit API | access, tenant | ADMIN: все новые параметры и `X-Equestrian-Id` сессии переданы, cookie не пересылаются | `200` с `metrics_table` | там же + `test_seo_client_boundary.py` |
| `UT-BP-04` | unit API | валидация | `mode=quarter`, `metric=x`, одна дата, обратный диапазон, `date_from=abc` | `400`, seo не вызван | `test_seo_proxy_api.py` |
| `UT-BP-05` | unit client | внешние ошибки | seo `400` → `400`; `502`/`500`/транспорт → `502`; нет `metrics_table` или колонка без `key` → `502` | по матрице | `test_seo_client_boundary.py` |
| `UT-BP-06` | unit | контракт расширения | лишние поля в таблице, колонке, ячейке | переданы без изменений | `test_seo_client_boundary.py` |
| `UT-BP-07` | unit | inventory | route inventory актуален | тест проходит | `test_route_access_inventory.py` |
| `UT-BP-08` | unit | регрессия | `search-queries` без новых параметров | прежний контракт | `test_seo_proxy_service.py` |

### Frontend (CMS)

| ID | Area | Behavior diff | Required tests | Access scenario | Commands |
| --- | --- | --- | --- | --- | --- |
| `FT-PM-01` | `src/api/seo.ts` | `getSeoPages` передаёт `mode/metric/date_from/date_to/ordering`, `undefined` опускается | API-boundary (MSW) | authenticated | `npm test -- api/seo` |
| `FT-PM-02` | `seoDataService`, `pageMetricsOptions` | whitelist `ordering` (`page`, `created_at`, `metric:YYYY-MM-DD`, каждый с `-` и без); перевод выбора пикера в даты по режиму с ограничением «сегодня» | unit | — | `npm test -- seoDataService pageMetricsOptions` |
| `FT-PM-03` | API boundary | для страниц: success, empty, `400`, `401`, `403`, `502` | API-boundary (MSW) | anonymous `401`, без ADMIN `403` | `npm test -- api/seo` |
| `FT-PM-04` | `useSeoPagesTable` | первый запрос `limit=25, offset=0, mode=day, metric=visits` без дат; период из ответа попадает в фильтр без повторного запроса | hook | ADMIN | `npm test -- useSeoPagesTable` |
| `FT-PM-05` | `useSeoPagesTable` | смена режима — без дат и без сортировки `metric:`; смена показателя сохраняет сортировку; смена дат её снимает; `offset=0` | hook (filter: apply, no-debounce, reset offset) | — | там же |
| `FT-PM-06` | `useSeoPagesTable` | `clamped` → даты заменены, уведомление; `adjusted` → даты заменены без уведомления; ровно один запрос | hook | — | там же |
| `FT-PM-07` | `useSeoPagesTable` | пагинация: начальные `{limit, offset}`, смена страницы, смена размера, сброс `offset` на filter/search/sort | hook | — | там же |
| `FT-PM-08` | `useSeoPagesTable` | одна сортировка (mapping, clear); синхронизация с `metrics_table.ordering=null` без повторного запроса | hook | — | там же |
| `FT-PM-09` | `useSeoPagesTable` | «Сбросить»: один запрос без `search` и `ordering`, `offset=0`; режим, показатель, даты, `limit` сохранены; черновик поиска очищен | hook | — | там же |
| `FT-PM-10` | `useSeoPagesTable` | устаревший ответ игнорируется; без scope запросов нет | hook | scope missing | там же |
| `FT-PM-11` | `src/ui/metricsTable` | рендер `title`/`hint`, `text`, `empty_text`, `align`, `sorter` при `sortable`; неизвестные поля и `value_type` игнорируются | unit/component | — | `npm test -- metricsTable` |
| `FT-PM-12` | `SeoPage` | «Страницы»: вкладки слева, справа пагинация + «Сбросить» + «Нормализация»; на других вкладках их нет; без `LIST_NORMALIZATION` кнопки нет; без ADMIN — Result `403` | component | scope present/missing, без ADMIN | `npm test -- SeoPage` |
| `FT-PM-13` | `SeoDataTable` (страницы) | data, loading, empty, error + retry, interaction; «Создано» `DD.MM.YYYY` с сортировкой; колонки метрик; фильтр поиска без регрессии | component (table) | — | `npm test -- SeoDataTable` |
| `FT-PM-14` | `SeoPagesFilters` | селекты режима и показателя; `RangePicker` с гранулярностью режима; будущие даты заблокированы (по `period.today`); пустое значение невозможно; доступные имена | component | — | `npm test -- SeoPagesFilters` |
| `FT-PM-15` | регрессия | «Запросы» (`useSeoDataTable` и рендер без изменений), нормализация, a11y фильтра заголовка | существующие тесты | — | `npm test` |
| `FT-PM-16` | self-checks | нет `fetch/axios` в features, нет `page/pageSize`, нет смешения с `site-*`, нет `shared/widgets/entities` | `rg`/`find` из `agents/planner.md` §2.2 | — | `rg …` |

Минимумы покрыты:

*   hook ≥ 3: `FT-PM-04..10`;
*   filter/sort ≥ 4: `FT-PM-05`, `FT-PM-08`;
*   pagination 4: `FT-PM-07`;
*   table 5: `FT-PM-13`;
*   permissioned action 4: `FT-PM-12`, `FT-PM-03`, `FT-PM-10`.

Live backend в unit- и component-тестах запрещён, только MSW и mocks.

### Smoke (`SMOKE-1`, скилл `.claude/skills/api-smoke-test`, реальная PostgreSQL)

Переменные:

| Переменная | Значение |
| --- | --- |
| `BACKEND_URL` | host-порт `eqsitecms-app` |
| `SEO_URL` | `docker port eqsitecms-seo-service 8000` |
| `YAM_URL` | `docker port eqsitecms-ya-metrica-service 8000` |
| `EQ` | `5f6496aa-4fe9-42da-a763-29f9bab22d73` |
| cookie ADMIN | получить логином тестового ADMIN, не печатать |
| `TODAY` | сегодня по `SEO_UTC_OFFSET_HOURS` |

| ID | Запрос | Проверка |
| --- | --- | --- |
| `SM-PM-01` | M3 с 7 однодневными колонками и 3 UUID — без и с cookie/Bearer | `200`, ответы идентичны |
| `SM-PM-02` | M3 с недельными и месячными колонками, `metric=visits` и `bounce_rate` | совпадает с `SUM` и средневзвешенным SQL в `eqsitecms-db-ya-metrica` |
| `SM-PM-03` | M4 `date_from..date_to` одной недели, `direction=desc` | порядок совпадает с SQL-ранжированием |
| `SM-PM-04` | M3/M4: 32 колонки, пересечение, `from > to`, 101 `page_ids`, нет `direction` | безопасный `400` |
| `SM-PM-05` | `GET $SEO_URL/api/pages` без `X-Equestrian-Id`; с ним — без и с `Authorization` | `401`; `200`, ответы идентичны, 7 колонок дней по `TODAY` |
| `SM-PM-06` | seo: умолчания `week/month/year`; `mode=week&date_from=2026-10-08&date_to=2026-10-20`; `mode=day&date_from=2026-09-01&date_to=$TODAY`; `date_to` в будущем | 4/6/2 колонки; выравнивание до пн..вс, `adjusted`; обрезка до 31 дня, `clamped`; конец = `TODAY` |
| `SM-PM-07` | seo: `ordering=-metric:<ключ>`; `search=…&ordering=metric:<ключ>&limit=10&offset=10`; колонка вне периода | порядок совпадает с M4, страницы без данных в конце, `total` верный; вне периода — `ordering=null` |
| `SM-PM-08` | seo: `ordering=created_at`; `ordering=metric:2026-13-40`; `/api/search-queries?ordering=created_at` | порядок по дате; `400`; `400` |
| `SM-PM-09` | backend `/api/seo/pages`: anonymous; пользователь без ADMIN (если есть тестовый); ADMIN с `mode=week&metric=page_depth` | `401`; `403`; `200` с `metrics_table` |
| `SM-PM-10` | backend: `mode=quarter`; `date_from=2026-10-01` | `400`; в логах seo нет запроса |
| `SM-PM-11` | `docker stop eqsitecms-ya-metrica-service` → список страниц в backend и seo → `docker start` | backend `502`, seo `502` без тела peer; после старта `200` |
| `SM-PM-12` | live N+1 по D8 | seo: 2 SELECT по `pages`; ya-metrica: 1 SELECT на M4 и 1 на M3 |

## PostgreSQL для smoke-тестов

Обнаружено через `docker inspect` 2026-10-26. При выполнении SMOKE-1 discovery повторить. Пароли брать из `Config.Env` и не записывать ни в tracked-файлы, ни в evidence.

| Контейнер | Compose service | Image | `POSTGRES_DB` / `POSTGRES_USER` | Host port `5432/tcp` |
| --- | --- | --- | --- | --- |
| `eqsitecms-db-ya-metrica` | `db-ya-metrica` | `postgres:16` | `eqsitecmsyametrica` / `eqsitecmsyametrica` | `5439` |
| `eqsitecms-db-seo` | `db-seo` | `postgres:16` | `eqsitecmsseo` / `eqsitecmsseo` | `5437` |
| `eqsitecms-db` | `db` | `postgres:16` | `eqsitecms` / `eqsitecms` | `5433` |

*   `IT-*` выполняются на отдельной тестовой БД через `TEST_DATABASE_URL` (как в существующих integration conftest), не на live-БД.
*   Live-сверки `SM-PM-02/03/12` — только чтение и временный `log_statement` с обязательным reset.
*   Для live seo нужен `SEO_UTC_OFFSET_HOURS` в `services/seo-service/.env`; при отсутствии действует значение по умолчанию `3`. Значение сверить с `YA_METRICA_UTC_OFFSET_HOURS`.

## Manual QA steps (UI тестирование)

Предусловия:

*   стек пересобран: ya-metrica, seo, backend, frontend;
*   есть ADMIN конюшни `5f6496aa-…` и пользователь без ADMIN;
*   viewport **1366×768**;
*   evidence — `.qa/seo-pages-metrics/qg-fe-manual/`: скриншоты failed-случаев layout, ошибок и прав; network status/body для failed API.

| Шаг | Действия | Ожидаемый результат |
| --- | --- | --- |
| `M-PM-01` | Anonymous открывает `/seo` | редирект или блок protected layout, запросов `/api/seo/pages` нет |
| `M-PM-02` | Пользователь без ADMIN открывает `/seo` | Result `403`, запросов страниц нет |
| `M-PM-03` | ADMIN: `/seo` → «Страницы» | слева вкладки; справа пагинация, «Сбросить», «Нормализация»; ниже фильтры: «Режим=по дням», «Показатель=Визиты», диапазон 7 дней по сегодня; 7 колонок дней; ничего не перекрывается |
| `M-PM-04` | Навести на заголовок колонки дня и на длинный путь страницы | подсказка `DD.MM.YYYY`; полный путь в подсказке, колонки не перекрываются |
| `M-PM-05` | Прокрутить таблицу вниз и вправо при limit 100 | вкладки, пагинация, кнопки и фильтры на месте; страница целиком не скроллится; «Страница» и «Создано» закреплены |
| `M-PM-06` | Режим «по неделям», затем «по месяцам», «по годам» | диапазон заменяется умолчанием (4 недели / 6 мес / 2 года); заголовки вида `19–25 окт`, `окт`, `2026`; текущая единица — с подсказкой по сегодня; `offset=0`; пикер с нужной гранулярностью |
| `M-PM-07` | Показатели «Доля отказов», «Глубина просмотра», «Время на сайте» | ячейки вида `16,67%`, `1,75`, `1 мин 55 с`; пустые — `—` |
| `M-PM-08` | В пикере каждого режима попробовать выбрать дату или единицу после сегодня | недоступно |
| `M-PM-09` | Режим «по дням», выбрать `01.09.2026 – <сегодня>` | диапазон в фильтре становится `01.09.2026 – 01.10.2026`, предупреждение о лимите 31 день, один запрос в Network |
| `M-PM-10` | Режим «по неделям», выбрать недели с середины месяца по текущую | в фильтре понедельник первой недели … сегодня, без предупреждения |
| `M-PM-11` | Сортировка по колонке дня: asc, desc, затем по «Создано» | порядок меняется по значениям; индикатор только на одной колонке; запросы `ordering=metric:…`, `-metric:…`, `created_at`, `offset=0` |
| `M-PM-12` | Колонка «Создано» | только дата `DD.MM.YYYY`, фильтра нет, сортировка работает |
| `M-PM-13` | Поиск в заголовке «Страница» при активной сортировке по метрике; затем смена диапазона | поиск применяется после debounce, сортировка сохраняется, `offset=0`; после смены диапазона сортировка по колонке снята |
| `M-PM-14` | Настроить режим, показатель, даты, поиск, сортировку, страницу 2 → «Сбросить» | один запрос: поиск и сортировка сняты, `offset=0`; режим, показатель, даты и размер страницы остались |
| `M-PM-15` | «Нормализация» → добавить и удалить правило | модалка работает как раньше (регрессия) |
| `M-PM-16` | Вкладки «Запросы» и «Яндекс.Метрика» | пагинации страниц, «Сбросить» и «Нормализации» нет; «Запросы» без изменений, «Создано» у них с временем, как раньше |
| `M-PM-17` | Остановить ya-metrica, обновить «Страницы»; запустить, нажать «Повторить»; затем пройти фильтры и сортировку клавиатурой | ошибка с «Повторить» (502 не выдаётся за пустой список); после старта данные на месте; фокус виден, селекты и пикер доступны с клавиатуры, axe без новых serious/critical |

Итоговый отчёт QA (passed/failed по шагам) — в `docs/reports/seo-pages-metrics.md`, раздел lane `QG-FE-MANUAL`.

## Risks / Trade-offs

*   **Два setting часового пояса.** `SEO_UTC_OFFSET_HOURS` и `YA_METRICA_UTC_OFFSET_HOURS` должны совпадать. Иначе «сегодня» таблицы и окно парсинга разойдутся на день, и последняя колонка может быть пустой. Митигация: одинаковые значения по умолчанию (`3`), предупреждение в README обоих сервисов, сверка в `QG-ENV`.
*   **Объём ранжирования.** M4 возвращает все страницы с данными в колонке: сейчас ≤ 146, в будущем — тысячи UUID по ≈ 40 байт. Принято: один массив-параметр SQL, `IT-SP-04` проверяет 5000.
*   **Жёсткая зависимость списка от ya-metrica.** Без ya-metrica вкладка «Страницы» отдаёт `502`. Нормализация остаётся доступной.
*   **HTTP внутри транзакции seo.** `TenantTransactionalRoute` держит транзакцию на запрос. Вызовы ya-metrica короткие (таймаут 4 с) и только на чтение — принято.
*   **Часы браузера и сервера.** Пикер блокирует будущее по `period.today` последнего ответа. Расхождение до первого ответа сервер гасит: будущие даты ограничиваются сегодняшним днём, а не отклоняются.
*   **Production isolation peers** — наследуемый gap R-G4: выпуск блокируется до подтверждения.

## Решения пользователя и допущения

Решения пользователя (ревизия 2):

| # | Тема | Решение |
| --- | --- | --- |
| 1 | Фильтры | обязательны, со значениями по умолчанию |
| 2 | Период | считает seo-service со своим `SEO_UTC_OFFSET_HOURS`; ya-metrica агрегирует по готовым колонкам |
| 3 | Заголовки | день — `25 окт`, год — `2026` |
| 4 | Нет данных | `—`, такие страницы в конце сортировки |
| 5 | Выравнивание | календарные единицы, выбор расширяется до границ недели, месяца, года |
| 6 | Будущие даты | не допускаются: сервер ограничивает сегодняшним днём, пикер блокирует |
| 7 | Сбой ya-metrica | `502` |
| 8 | Форматирование | запятая, неразрывный пробел, `1 мин 55 с` |
| 9 | Показатели | все 8 |
| 10 | «Запросы» | не трогаем |
| 11 | «Сбросить» | только сортировка и поиск по странице |
| 12 | Git | текущая ветка `main`, без коммитов |

Допущения Planner, не блокируют apply:

*   A1. `date_from` позже сегодняшнего дня заменяется сегодняшней датой и не даёт `400` — для устойчивости к расхождению часов.
*   A2. Флаг `adjusted` (выравнивание или «сегодня») отделён от `clamped` (лимит); уведомление показывается только при `clamped`.
*   A3. `title` обрезанной текущей единицы описывает единицу целиком, `hint` — фактические даты.

```
SELECT p.* FROM pages p
LEFT JOIN unnest(CAST(:ranked AS uuid[])) WITH ORDINALITY AS r(id, ord) ON r.id = p.id
WHERE p.equestrian_id = :eq [AND p.page ILIKE :search ESCAPE '\']
ORDER BY r.ord ASC NULLS LAST, p.created_at DESC, p.id DESC
LIMIT :limit OFFSET :offset
```