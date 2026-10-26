# Proposal: парсинг и хранение статистики Яндекс.Метрики (metrica-stats-parsing)

Входной запрос: [`docs/tasks/101_metrica_client.md`](../../../docs/tasks/101_metrica_client.md).

## Why

`ya-metrica-service` сейчас умеет только отдавать список счётчиков; сырой статистики по страницам входа и поисковым фразам нет, а черновой парсер (`src/clients/yandex_metrica_parser.py`, untracked) дублирует HTTP-клиент и содержит захардкоженный живой OAuth-токен. SEO-контуру нужны чистые дневные метрики по конюшне, которые потом можно корректно агрегировать по любым диапазонам, а парсинг должен идти очередью без параллельных запросов с одного аккаунта Яндекса.

## What Changes

- **ya-metrica-service — базовый клиент.** Общий `make_request` выносится в базовый API-клиент; клиент счётчиков, новый клиент статистики (`stat/v1/data`) и peer-клиенты (yandex-service, seo-service) наследуются от него. Черновой парсер с токеном удаляется.
- **ya-metrica-service — хранение.** Таблицы `metrica_page_stats` (страницы входа `ym:s:startURL`) и `metrica_search_query_stats` (поисковые фразы `ym:s:lastSearchPhrase`) с дневной гранулярностью, `equestrian_id` в каждой строке и уникальностью `(конюшня, дата, сущность)`; сущность — стабильный UUID из seo-service. Метрики хранятся аддитивными колонками (`visits`, `users`, `pageviews`, `bounces`, `visit_duration_seconds`), а доля отказов, глубина и среднее время — вычисляемыми колонками. Повторный парсинг того же дня заменяет запись.
- **Агрегация после нормализации.** Если разные URL/фразы из Метрики резолвятся seo-service в один UUID, их статистика суммируется (визиты, просмотры, отказы, длительность), а проценты и время становятся средними, взвешенными по визитам.
- **ya-metrica-service — задания и исполнение.** Запуск декомпозируется на задания по ≤5 дней × {страницы, запросы} со статусами `queued/running/succeeded/failed`, ретраями временных ошибок, без ретраев для неактуальных кредов. Источник истины по статусам, checkpoint и эксклюзивности «один running на аккаунт Яндекса» — PostgreSQL; исполнение — Celery worker (Redis broker, очередь `ya_metrica`) и Celery beat как периодический диспетчер, concurrency по умолчанию 1 с возможностью масштабирования.
- **ya-metrica-service — ELT-парсинг.** Каждая страница ответа API (до 100000 строк) сразу фиксируется в БД вместе с checkpoint смещения; страницы и фразы резолвятся в UUID через существующие `POST /api/pages/resolve` и `POST /api/search-queries/resolve` seo-service. Логируются старт, завершение, количество insert/update и все ошибки.
- **ya-metrica-service — сервисный endpoint запуска** `POST /api/metrica/stats/parse` (UUID конюшни + необязательный диапазон дат). Явный диапазон обрезается до `[сегодня − 2 года; сегодня]`, `400` — только если после обрезки ничего не осталось; без дат диапазон резолвится от последней записанной даты включительно, но не глубже 2 лет. «Сегодня» — по целочисленному смещению от UTC из `.env` (по умолчанию `+3`).
- **yandex-service — BREAKING для peer-контракта:** `GET /api/servicing/access-token/{account_id}` возвращает `{"enc_access_token": "<ciphertext>"}` вместо расшифрованного `{"access_token": ...}`; расшифровку выполняет ya-metrica-service тем же общим ключом, как уже сделано для счётчиков. Потребителей старого поля в репозитории нет.
- **seo-service — без изменений кода:** используются существующие resolve-endpoint'ы.
- **Вне scope (подтверждено пользователем):** endpoint статусов заданий, NATS-триггер от SEO, ротация OAuth-токена.

Access matrix для нового `POST /api/metrica/stats/parse` (M2) и изменённого `GET /api/servicing/access-token/{account_id}` (Y5) зафиксирована в delta `yandex-peer-http-contract` и в `specs/metrica-parse-trigger/spec.md`, причины исключений и anonymous/authenticated тесты — там же и в `design.md`.

## Capabilities

### New Capabilities

- `metrica-stats-storage`: хранение неагрегированной дневной статистики Метрики по страницам и поисковым фразам конюшни, аддитивные и производные колонки, уникальность, замена при повторном парсинге, агрегация коллизий нормализации и фильтрация по конюшне.
- `metrica-parse-queue`: задания парсинга — декомпозиция по 5 дней и виду данных, статусы, эксклюзивность по аккаунту Яндекса, доставка исполнителю, ретраи, lease и восстановление.
- `metrica-stats-ingestion`: выполнение задания — получение кредов, постраничная выгрузка `stat/v1/data`, ELT-фиксация с checkpoint, резолв сущностей через seo-service, логирование.
- `metrica-parse-trigger`: сервисный endpoint запуска парсинга, резолв и обрезка диапазона дат, смещение от UTC, access-контракт.

### Modified Capabilities

- `yandex-peer-http-contract`: строка Y5 access matrix меняет payload на ciphertext, добавляется строка M2; добавляется требование выдачи зашифрованного токена сервисам.

## Impact

- Код: `services/ya-metrica-service/**` (settings, models, миграция, clients, repositories, services, Celery app/tasks, API, tests, README), `services/yandex-service` (servicing route/service/DTO/tests/README), `.docker-compose/docker-compose.ya_metrica.yml` (Celery worker и beat), `SERVICES.md` (секция 8/9), `agents/redis-databases.yaml` (Redis DB 5/6) и `agents/howto/celery-protocols.md` (очередь `ya_metrica`).
- БД: новая миграция `ya-metrica` (4 таблицы). Новые env ya-metrica: `YANDEX_SERVICE_URL`, `SEO_SERVICE_URL`, `YA_METRICA_UTC_OFFSET_HOURS`, `CELERY_APP_*`, параметры исполнения/ретраев.
- Зависимости: `celery[redis]`; инфраструктура — общий Redis (`eqsitecms-redis`).
- Внешние сервисы: Yandex Metrica Reporting API (`stat/v1/data`), seo-service resolve (побочный эффект: find-or-create страниц/фраз в seo-service), yandex-service (Y5, Y7).
- NATS/AsyncAPI: не меняются.
- Безопасность: в рабочем дереве ya-metrica найден живой OAuth-токен в untracked файле — файл удаляется в MS-BE-2.
