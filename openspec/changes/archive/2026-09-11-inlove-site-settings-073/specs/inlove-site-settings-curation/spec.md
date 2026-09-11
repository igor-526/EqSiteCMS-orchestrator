## ADDED Requirements

### Requirement: Локальный каталог настроек INLOVE ограничен allowlist
Локальная таблица `site_settings` для tenant selector `inlove` SHALL после коррекции содержать только ключи actions 2, 3, 4 и 6, перечисленные в утверждённом design. Операция MUST быть tenant-scoped, идемпотентной и MUST NOT изменять строки других tenants. Все action 1, action 5 и legacy/duplicate `contacts.address_alternative`, `contacts.phones`, `header.contact_phone`, `about.intro`, `about.setting`, `about.features` MUST отсутствовать.

#### Scenario: Повторная локальная коррекция
- **WHEN** data operation дважды применяется к одной и той же локальной БД
- **THEN** второй запуск не создаёт дубликаты, итоговый key/type/value inventory совпадает, а данные других tenants остаются неизменными

#### Scenario: Удалены только запрещённые ключи
- **WHEN** после транзакции запрашиваются все настройки tenant `inlove`
- **THEN** результат равен утверждённому allowlist и не содержит ни одного action 1/action 5/legacy ключа

### Requirement: About хранится четырьмя строковыми настройками
Tenant `inlove` SHALL хранить `about_1_title`, `about_1_text`, `about_2_title`, `about_2_text` как отдельные значения типа `string`. Первый блок MUST иметь заполненные title и text; второй title и text MAY быть пустыми, но MUST сохраняться как отдельные ключи.

Начальная локальная коррекция SHALL записать утверждённые заглушки: `О конном клубе «ИНЛав»`, `Здесь будет основной текст о клубе. Замените эту заглушку в настройках сайта.`, `Наша атмосфера`, `Здесь будет дополнительный текст о клубе. Замените эту заглушку в настройках сайта.` соответственно.

#### Scenario: Первый и необязательный второй блок
- **WHEN** читаются четыре about-настройки после коррекции
- **THEN** все четыре ключа существуют и имеют тип `string`, первая пара заполнена, а вторая пара либо обе заполнена, либо обе пуста

### Requirement: Отсутствующие группы услуг создаются локально
Read-only inventory подтвердил отсутствие строк `horse_service` tenant `inlove`. До переключения consumer локальная data operation SHALL идемпотентно создать ровно три отсутствующие группы с exact names `Занятия`, `Прогулки`, `Постой`, не меняя существующую строку при exact-match и не создавая дубликат. Runtime API и schema MUST NOT изменяться.

#### Scenario: Все три группы отсутствуют
- **WHEN** operation применяется к локальному tenant `inlove` без строк `horse_service`
- **THEN** Public Read API возвращает exact names `Занятия`, `Прогулки`, `Постой`, по одной строке каждого имени

#### Scenario: Повторный запуск не создаёт дубликаты
- **WHEN** operation повторяется после успешного создания
- **THEN** количество exact-match строк остаётся равным трём, а данные других tenants не меняются

### Requirement: Коррекция обратима и не является переносом
Перед изменением исполнитель MUST сохранить локальный snapshot точных строк tenant `inlove` и проверить возможность tenant-scoped rollback. Change MUST NOT экспортировать, копировать или применять таблицу к stand, production либо другой БД.

#### Scenario: Evidence до и после
- **WHEN** локальная коррекция завершена
- **THEN** evidence содержит tenant identity, before/after keys/types/counts, hash snapshot и rollback-инструкцию без секретов и полных чувствительных значений

#### Scenario: Внешняя БД остаётся вне scope
- **WHEN** выполняются tasks этого change
- **THEN** ни одна команда не подключается к stand/production и перенос таблицы не выполняется

### Requirement: Существующая матрица доступа сохраняется
Change MUST NOT изменять маршруты или access policy site settings и профильных API: GET SHALL оставаться Public Read с tenant selector, а POST/PATCH/DELETE site settings SHALL оставаться Protected Write для `SUPERUSER`, `ADMIN`, `DEVELOPER`.

| Method | Path | Access class | Roles | Expected without auth/selector | Expected with auth/valid selector |
|---|---|---|---|---|---|
| `GET` | `/api/site_settings`, `/api/site_settings/{id}` | Public Read + tenant selector | нет | `401` missing/invalid selector | `2xx/404`, tenant-scoped |
| `GET` | используемые `/api/horse_services*`, `/api/prices*` | Public Read + tenant selector | нет | `401` missing/invalid selector | `2xx/404`, tenant-scoped |
| `POST` | `/api/site_settings` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | allowed `2xx`; disallowed `403` |
| `PATCH`, `DELETE` | `/api/site_settings/{id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | allowed `2xx/204`; disallowed `403`; foreign tenant denied/not found |

#### Scenario: Anonymous consumer читает итоговый каталог
- **WHEN** anonymous consumer вызывает `GET /api/site_settings` с валидным selector `inlove`
- **THEN** API возвращает `200` и только итоговый tenant-scoped каталог без CMS credentials

#### Scenario: Запись без авторизации запрещена
- **WHEN** anonymous caller вызывает любой `POST/PATCH/DELETE /api/site_settings*`
- **THEN** API возвращает `401`, а локальные данные не изменяются
