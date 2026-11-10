# Proposal

## Why

По запросу `docs/tasks/110_seo_tasks.md` операторам SEO нужен единый видимый статус фоновых работ Метрики, а не технические подзадачи парсинга. Сейчас CMS умеет только запускать обновление из таблиц и не показывает историю исполнения.

## What Changes

- Объединить интеграции в одну вкладку «Интеграции», назвать карточку «Яндекс.Метрика», убрать заглушку Вебмастера.
- При действующей привязке добавить «Задачи»: модальное окно с типами `parsing`, `merge`, `delete`, серверной пагинацией и порядком active-first, затем `-created_at`.
- Добавить read API Метрики `GET /api/metrica/tasks` и CMS gateway `GET /api/seo/metrica/tasks`; браузер не обращается к peer напрямую. Матрицы доступа и anonymous/authenticated сценарии включены в delta specs.
- Парсинг показывать одной записью на intent/run, не на окно/вид данных. Использовать существующие PostgreSQL ledger, без нового журнала и миграции.
- Перенести «Обновить данные» с «Страниц»/«Запросов» в окно задач, сохранив подтверждение и `POST /api/seo/parse-jobs` через seo-service.
- История относится ко всей текущей конюшне, включая удалённые привязки, а не только к текущему номеру счётчика. Это явное ограничение существующей модели; после отвязки вход в окно исчезает, история остаётся доступной API и после новой привязки.

## Capabilities

### New Capabilities

- `metrica-task-list`: единая read-проекция сохранённых операций Метрики, агрегированные статусы и стабильная пагинация.

### Modified Capabilities

- `seo-backend-proxy`: приватный SEO-only gateway списка задач непосредственно в Метрику, расширение route inventory.
- `cms-seo-yandex-ui`: объединённая вкладка, карточка и модальное окно задач.
- `cms-seo-parse-refresh-ui`: новое место запуска и обновление списка задач после принятия команды.
- `cms-seo-data-ui`: согласование сценария раскладки с удалением старых вкладок.
- `agent-acceptance-tooling`: точечная регистрация change и PostgreSQL тестов в fail-closed runner (сейчас он жёстко привязан к другому change).

## Impact

Код меняется только в `services/ya-metrica-service`, `services/backend`, `services/frontend`; корень — `SERVICES.md`, точечное расширение `scripts/qa/infra` со своими offline tests и данный OpenSpec change. Backend получает отдельную зависимость `YA_METRICA_SERVICE_URL`; существующие seo/yandex peers, их схемы и AsyncAPI не меняются. Read endpoint Метрики — явное Internal Trusted Network Read исключение с обязательным UUID selector; CMS GET — чувствительное SEO-only исключение Public Read. Нужны независимые PostgreSQL, API/access и desktop browser проверки, общий `QG-FULL`.

Не входят: новый HTTP запуск Метрики, изменение scheduler/Celery/NATS, отдельные retry/cancel операции, backfill утраченной истории, counter-scoped аудит, production-сетевая перенастройка. Approval change не разрешает setup/teardown PG/NATS; до явного approval реализация запрещена.
