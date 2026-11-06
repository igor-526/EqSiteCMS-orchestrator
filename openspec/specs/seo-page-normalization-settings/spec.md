# seo-page-normalization-settings

## Purpose

Управление черными списками query-параметров и хешей, которые seo-service удаляет при нормализации страниц конкретной конюшни.

## Requirements

### Requirement: Два независимых черных списка конюшни
seo-service SHALL хранить черный список query-параметров и черный список хешей в двух отдельных таблицах. Каждый элемент MUST принадлежать одной конюшне; значение MUST быть уникальным в пределах конюшни и своего списка на уровне БД.

#### Scenario: Одинаковое значение в разных конюшнях
- **WHEN** конюшни A и B добавляют параметр `utm_source`
- **THEN** создаются два независимых элемента

#### Scenario: Одинаковое значение в разных списках
- **WHEN** конюшня добавляет `top` в черный список параметров и в черный список хешей
- **THEN** оба элемента создаются

### Requirement: Просмотр черного списка
`GET /api/page-normalization/blacklisted-query-params` и `GET /api/page-normalization/blacklisted-hashes` SHALL возвращать `200` с `{"items": [{"id", "value", "created_at"}], "total"}` только конюшни из `X-Equestrian-Id`, по возрастанию `value`, без пагинации.

#### Scenario: Список своей конюшни
- **WHEN** у конюшни A параметры `utm_medium`, `gclid`, у B — `yclid`, и запрашивается список A
- **THEN** ответ содержит `gclid`, `utm_medium` в этом порядке и `total` 2

### Requirement: Создание элемента
`POST` на путь списка SHALL принимать `{"value": string}` и возвращать `201` с созданным элементом. Значение MUST обрезаться по краям, для хеша дополнительно MUST удаляться ведущий `#`; результат MUST быть непустым, не длиннее 255 символов, без пробельных и управляющих символов и `#`; имя параметра также без `&`, `=`, `?`. Нарушение — `400`, дубль в конюшне — `409`.

#### Scenario: Создание параметра
- **WHEN** создаётся параметр `" utm_source "`
- **THEN** ответ `201`, `value` равен `"utm_source"`

#### Scenario: Хеш с решёткой
- **WHEN** создаётся хеш `"#top"`
- **THEN** ответ `201`, `value` равен `"top"`

#### Scenario: Дубль
- **WHEN** в конюшне уже есть параметр `utm_source` и создаётся `utm_source`
- **THEN** ответ `409`, второй элемент не создан

#### Scenario: Невалидное значение
- **WHEN** создаётся параметр `""`, `"a=b"`, `"a b"`, хеш `"#"` или значение длиной 256 символов
- **THEN** ответ `400`

#### Scenario: Хеш со служебными символами URL
- **WHEN** создаётся хеш `"!/catalog?x=1"`
- **THEN** ответ `201`, значение сохраняется как есть

### Requirement: Изменение элемента
`PATCH {path}/{item_id}` SHALL принимать `{"value": string}`, применять те же правила значения и возвращать `200` с обновлённым элементом. Элемент другой конюшни или отсутствующий MUST давать `404`, конфликт значения — `409`, не-UUID `item_id` — `400`.

#### Scenario: Изменение значения
- **WHEN** параметр `utm_sourse` своей конюшни меняется на `utm_source`
- **THEN** ответ `200`, `value` равен `"utm_source"`, `id` прежний

#### Scenario: Чужой элемент
- **WHEN** конюшня A меняет элемент, принадлежащий конюшне B
- **THEN** ответ `404`, элемент B не изменён

### Requirement: Удаление элемента
`DELETE {path}/{item_id}` SHALL удалять элемент своей конюшни и возвращать `204` без тела. Элемент другой конюшни или отсутствующий MUST давать `404`, не-UUID `item_id` — `400`.

#### Scenario: Удаление своего элемента
- **WHEN** конюшня удаляет свой хеш `top`
- **THEN** ответ `204`, хеш больше не возвращается списком и не влияет на последующую нормализацию

#### Scenario: Повторное удаление
- **WHEN** тот же элемент удаляется повторно
- **THEN** ответ `404`

### Requirement: Изменение настроек не трогает сохранённые страницы
PATCH и DELETE элементов SHALL сохранять прежнее отсутствие ретроактивного изменения страниц. Успешный POST нового элемента SHALL атомарно сохранять ревизию и намерение фонового scan/merge; ответ не ждёт сканирования всех страниц. Дубль, validation error или rollback MUST NOT создавать ревизию или команду. Удаление исходных страниц SHALL происходить только после безопасного результата Метрики.

#### Scenario: Удаление параметра из черного списка
- **WHEN** удаляется параметр `utm_source`, а ранее сохранена страница `"/a"`
- **THEN** страница `"/a"` и её UUID не меняются

#### Scenario: NS-01 Успешный POST и ошибка
- **WHEN** добавляется новое правило либо запрос отклонён как duplicate/invalid
- **THEN** успешный 201 сохраняет правило вместе с durable намерением; 409/400 не оставляет задания, брокерный outage после commit не теряет намерение

### Requirement: Доступ к запуску ретроактивной нормализации
POST правил SHALL сохранять matrix ниже. Чувствительные административные данные CMS не являются Public Read. Peer write — явное исключение для gateway внутри доверенной сети; `X-Equestrian-Id` не доказывает права, production isolation требуется отдельно.

#### Scenario: NS-02 Anonymous и authenticated POST
- **WHEN** каждая строка вызывается anonymous, с SEO-only, SEO+ADMIN, ADMIN-only и без SEO, а peer также без/с Cookie/Bearer
- **THEN** outcomes совпадают с matrix, gateway получает tenant из actor и не принимает подмену клиентским selector; задание всегда относится к tenant правила

#### Scenario: NS-03 Регрессия PATCH и DELETE
- **WHEN** SEO меняет либо удаляет собственный/чужой item через существующий gateway
- **THEN** действующие 200/204, foreign 404, validation 400, duplicate 409 и anonymous 401/без SEO 403 сохраняются; ретроактивное разъединение или новый merge не запускаются

##### Access matrix

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| POST | backend `/api/seo/page-normalization/blacklisted-query-params` | Protected Write | строго SEO, свой tenant | 401 | SEO 201; без SEO 403; invalid 400; duplicate 409 |
| POST | backend `/api/seo/page-normalization/blacklisted-hashes` | Protected Write | строго SEO, свой tenant | 401 | SEO 201; без SEO 403; invalid 400; duplicate 409 |
| POST | seo `/api/page-normalization/blacklisted-query-params` | Internal Trusted Network Write, exception | доверенный peer | 201; selector missing/invalid 401; invalid 400; duplicate 409 | то же, Cookie/Bearer игнорируются |
| POST | seo `/api/page-normalization/blacklisted-hashes` | Internal Trusted Network Write, exception | доверенный peer | 201; selector missing/invalid 401; invalid 400; duplicate 409 | то же, Cookie/Bearer игнорируются |
