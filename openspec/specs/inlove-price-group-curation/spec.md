# Purpose

Зафиксировать безопасную локальную идемпотентную curation недостающих `price_groups` и их связей с существующими тарифами tenant `inlove` — прямой SQL-записью в локальную dev-БД, без вызова API — необходимую для перехода фильтрации всех трёх страниц услуг («Занятия», «Прогулки», «Постой») на backend group filter по принципу «одна страница = одна группа». По аналогии с прецедентом `inlove-site-settings-curation`, без изменения schema, backend-кода и access policy.

## Requirements

### Requirement: Недостающие price_groups создаются локально прямой SQL-записью
До переключения `site-ksk-inlove` на групповую фильтрацию для tenant `inlove` (`equestrian_id = 685c6079-3922-4dbb-95b6-533bc9060547`) SHALL существовать ровно четыре группы `price_groups` с точными именами «Разовые», «Абонементы», «Прогулки» и «Постой частных лошадей». Создание SHALL выполняться прямой SQL-записью (`INSERT`) в локальную dev-БД `eqsitecms-db`, а не через `POST /api/prices/groups` или любой другой HTTP endpoint. Поскольку `price_groups.name` не имеет `UNIQUE`-ограничения на уровне БД (уникальность в обычном API-пути обеспечивает сервисный слой, который этот путь обходит), исполнитель MUST перед каждой вставкой проверить `SELECT` на отсутствие строки с точным именем для этого `equestrian_id`, чтобы сохранить идемпотентность. Операция SHALL быть tenant-scoped и MUST NOT изменять строки других tenant.

#### Scenario: Первое применение создаёт четыре группы
- **WHEN** curation впервые применяется к tenant `inlove` без этих четырёх групп
- **THEN** Public Read `GET /api/prices/groups` возвращает четыре новые группы с точными именами, по одной каждого имени, в дополнение к существующим «Основные услуги» и «Дополнительные услуги»

#### Scenario: Повторный запуск не создаёт дубликаты
- **WHEN** curation повторяется после успешного первого применения
- **THEN** количество групп с этими четырьмя именами остаётся равным одному на каждое имя, а данные других tenant не меняются

### Requirement: Существующие тарифы назначаются в новые группы идемпотентно
Тарифы SHALL быть связаны со своими группами прямой SQL-записью в `price_groups_relations` следующим образом:

| Группа | Тарифы (slug) |
|---|---|
| «Разовые» | `individual-lesson-official`, `group-lesson-official`, `riding-training-yandex` |
| «Абонементы» | `training-package-8-official`, `individual-membership-official`, `subscription-4-yandex`, `subscription-8-yandex`, `individual-subscription-8-yandex` |
| «Прогулки» | `horse-rides-official`, `horse-ride-yandex` |
| «Постой частных лошадей» | `horse-boarding-yandex` |

Назначение SHALL быть идемпотентным (проверка `SELECT` на существование пары `(price_id, group_id)` перед `INSERT`). Новым связям SHALL присваиваться последовательный `display_order` `1..N` в пределах своей (пустой на момент вставки) группы, не нарушая `UNIQUE (group_id, display_order) WHERE display_order IS NOT NULL`. Существующие связи тарифов с группой «Основные услуги» MUST NOT изменяться или удаляться этой операцией.

#### Scenario: Группа «Абонементы» возвращает ожидаемые тарифы
- **WHEN** anonymous consumer с валидным tenant selector запрашивает `GET /api/prices?groups=Абонементы`
- **THEN** ответ содержит ровно пять назначенных тарифов-абонементов и не содержит тарифы из группы «Разовые»

#### Scenario: Группа «Прогулки» возвращает оба тарифа
- **WHEN** anonymous consumer с валидным tenant selector запрашивает `GET /api/prices?groups=Прогулки`
- **THEN** ответ содержит ровно `horse-rides-official` и `horse-ride-yandex`

#### Scenario: Группа «Постой частных лошадей» возвращает единственный тариф
- **WHEN** anonymous consumer с валидным tenant selector запрашивает `GET /api/prices?groups=Постой частных лошадей`
- **THEN** ответ содержит ровно тариф `horse-boarding-yandex`

#### Scenario: Повторное назначение не дублирует связь
- **WHEN** назначение тариф↔группа повторяется после успешного первого применения
- **THEN** количество связей для каждой пары тариф↔группа остаётся равным одной, а ответ API не содержит дублирующихся элементов

#### Scenario: Группа «Основные услуги» остаётся нетронутой
- **WHEN** curation завершена
- **THEN** состав связей группы «Основные услуги» идентичен состоянию до curation (11 тарифов), группа продолжает существовать как deprecated-in-place и не используется ни одной страницей сайта

### Requirement: Curation обратима и является строго локальной data-операцией
Перед изменением исполнитель MUST сохранить локальный snapshot точных строк `price_groups`/`price_groups_relations` tenant `inlove` (before) и подтвердить возможность tenant-scoped rollback прямым `DELETE`/`UPDATE` по сохранённым id. Curation MUST NOT применяться к stand/production и MUST NOT переносить/экспортировать данные в другую БД. Подключение к БД MUST выполняться только после переподтверждения параметров через `docker inspect` контейнера `eqsitecms-db` (не полагаться на ранее сохранённые значения как постоянные).

#### Scenario: Evidence до и после
- **WHEN** curation завершена
- **THEN** evidence содержит tenant identity, before/after counts новых групп и связей, и rollback-инструкцию без секретов

#### Scenario: Внешняя БД остаётся вне scope
- **WHEN** выполняются задачи этой curation
- **THEN** ни одна команда не подключается к stand/production, и перенос данных на другую БД не выполняется

### Requirement: Существующая матрица доступа сохраняется
Curation MUST NOT изменять маршруты или access policy `price_groups`/`prices`: `GET` SHALL оставаться Public Read с tenant selector, а `POST`/`PATCH`/`DELETE` — Protected Write для `SUPERUSER`, `ADMIN`, `DEVELOPER`, несмотря на то что curation эти write-endpoint'ы не вызывает (использует прямую SQL-запись).

| Method | Path | Access class | Роли | Expected without auth/selector | Expected with auth/valid selector |
|---|---|---|---|---|---|
| `GET` | `/api/prices?groups=<exact name>` | Public Read + tenant selector | нет | `401` missing/invalid selector | `200`, tenant-scoped |
| `POST` | `/api/prices/groups` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | не вызывается curation; регрессионно подтверждается, что политика не изменилась |

#### Scenario: Anonymous consumer читает итоговый каталог групп
- **WHEN** anonymous consumer вызывает `GET /api/prices/groups` с валидным selector tenant `inlove`
- **THEN** ответ включает четыре новые группы наравне с существующими «Основные услуги»/«Дополнительные услуги», без изменения статус-кода или формата ответа

#### Scenario: Запись без авторизации отклоняется (регрессия)
- **WHEN** `POST /api/prices/groups` вызывается без auth
- **THEN** API возвращает `401`, как и до curation — несмотря на то что curation использует прямую SQL-запись, а не этот endpoint
