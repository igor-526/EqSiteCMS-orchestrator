# Spec Delta

## Purpose

Единая история сохранённых фоновых операций Яндекс.Метрики для операторов текущей конюшни: агрегированный парсинг, слияние метрик страниц и удаление статистики.

## ADDED Requirements

### Requirement: История операций конюшни
`GET /api/metrica/tasks` SHALL возвращать `{items,total}` для конюшни из `X-Equestrian-Id`. Элемент MUST содержать только `id` (строка), `type` (`parsing|merge|delete`), `status` (`queued|running|succeeded|failed|cancelled`), `is_active` (boolean), `created_at` (RFC3339). История SHALL включать сохранённые операции прежних привязок этой конюшни без фильтра по текущему счётчику.

#### Scenario: MT-01 Типы и безопасная схема
- **WHEN** у A есть парсинг, merge и cleanup, а у B другие операции
- **THEN** ответ A содержит только A, cleanup представлен как `delete`, отсутствуют токены, аккаунты, counter_id, error payload, checkpoints, chunks и технические подзадачи

#### Scenario: MT-02 История удаления
- **WHEN** удалены аккаунт/привязка и статистика A, затем появился новый счётчик
- **THEN** сохранённые операции A остаются в выдаче; API не требует действующей привязки, не утверждает принадлежность старых операций новому счётчику

### Requirement: Одна запись на логический парсинг
Список SHALL объединять intent и связанный run в одну запись с неизменными `id=parsing:<job_id>` и временем создания intent; run без intent SHALL использовать `job_id`, а при NULL — `id=parsing-run:<run_id>` и время run. Несвязанные pending/terminal intents MUST быть видны. Для maintenance SHALL использоваться `id=<type>:<operation_id>`; повторная доставка не создаёт вторую строку.

#### Scenario: MT-03 Декомпозиция и admission
- **WHEN** intent ждёт обслуживания, затем превращается в run из 8 заданий двух видов
- **THEN** до и после admission видна одна строка с тем же id и created_at; технические задания не увеличивают total

#### Scenario: MT-04 Legacy и отмена intent
- **WHEN** есть run с NULL job_id, run без intent и intents cancelled/missing_binding
- **THEN** каждый run виден один раз; cancelled intent даёт cancelled, missing_binding даёт failed, никакие отсутствующие исторические данные не выдумываются

### Requirement: Агрегированный статус парсинга
Парсинг SHALL оставаться активным, пока хотя бы одно задание queued/running; при running статус SHALL быть running, иначе queued. После завершения всех заданий приоритет SHALL быть failed, затем cancelled, затем succeeded. Pending intent SHALL быть queued. Admitted run без заданий SHALL возвращать failed как некорректную сохранённую работу, не ложный успех. `is_active` SHALL быть true только для queued/running.

#### Scenario: MT-05 Смешанные исходы и ретраи
- **WHEN** часть заданий failed, но остальные queued либо running
- **THEN** строка активна со статусом queued либо running; после терминализации остальных итог failed; retry queued остаётся активным

#### Scenario: MT-06 Завершение и отмена
- **WHEN** все задания succeeded либо есть cancelled без failed и без активных
- **THEN** итог соответственно succeeded либо cancelled; is_active=false

### Requirement: Статусы обслуживания
Merge SHALL отображать collecting/waiting как queued, running/awaiting_seo как running, completed как succeeded, superseded_by_delete как cancelled, failed_blocked как failed. Cleanup SHALL отображать pending как queued, draining/deleting как running, completed как succeeded, failed_blocked как failed. `is_active` SHALL быть true только для queued/running; статус failed не означает снятия внутреннего барьера обслуживания.

#### Scenario: MT-07 Барьер и финализация
- **WHEN** merge ждёт SEO-финализации, cleanup дренирует parse либо операция находится в failed_blocked
- **THEN** первые две строки активны как running, последняя failed и неактивна; UI не обещает возможность нового исполнения

### Requirement: Общая серверная пагинация
API SHALL применять один общий порядок `is_active DESC, created_at DESC, id DESC` до `limit/offset` по всем типам. `limit` SHALL быть целым 1..100 (default 20), `offset` — целым ≥0 (default 0); неверный ввод SHALL давать 400. `total` SHALL считать логические строки до пагинации в согласованном снимке. Пустая выборка SHALL возвращать items=[], total=0; offset за концом — items=[] с реальным total.

#### Scenario: MT-08 Порядок и границы
- **WHEN** старые active и новые terminal операции разных типов имеют также одинаковые created_at
- **THEN** active выше terminal на всех страницах, время убывает внутри группы, id разрешает равенство; соседние страницы неизменного набора не пересекаются

#### Scenario: MT-09 Валидация и пустой результат
- **WHEN** limit равен 0/101/строке, offset отрицателен/дробный либо выбран offset за концом корректного набора
- **THEN** невалидный ввод даёт 400 до чтения операций, корректный offset за концом — 200 с пустыми items и реальным total

### Requirement: Access matrix внутреннего чтения
Маршрут SHALL быть Internal Trusted Network Read — явное исключение Public Read: это приватная операционная история, не API сайтов. UUID selector MUST проверяться до query; missing/invalid SHALL давать 401. Cookie/Bearer SHALL игнорироваться, не заменяя selector. Production SHALL требовать подтверждения внешней недоступности peer и БД; наличие Compose network само по себе недостаточно.

#### Scenario: MT-10 Anonymous peer
- **WHEN** запрос без credentials содержит валидный UUID selector либо selector отсутствует/невалиден
- **THEN** соответственно 200 либо 401; при missing selector и одновременно invalid query приоритет 401

#### Scenario: MT-11 Authenticated peer
- **WHEN** те же запросы повторены с Cookie/Bearer любой роли
- **THEN** статусы идентичны anonymous; credentials не меняют tenant и не обходят selector

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/metrica/tasks`, валидный selector | Internal Trusted Network Read exception | роли не применяются; доверенная сеть | 200; invalid query 400 | 200/400, credentials игнорируются |
| GET | `/api/metrica/tasks`, missing/invalid selector | Internal Trusted Network Read exception | роли не применяются | 401 до query/storage | 401, credentials не заменяют selector |
