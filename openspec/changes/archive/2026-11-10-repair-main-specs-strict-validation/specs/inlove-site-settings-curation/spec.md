## MODIFIED Requirements

### Requirement: About хранится четырьмя строковыми настройками
Tenant `inlove` SHALL хранить четыре отдельные строковые about-настройки с обязательной первой и необязательной второй парой title/text; начальная локальная коррекция SHALL записать утверждённые заглушки согласно сценарию полного контракта.

#### Scenario: Полный контракт: About хранится четырьмя строковыми настройками
- **WHEN** применяется контракт требования «About хранится четырьмя строковыми настройками»
- **THEN** SHALL сохраняться весь следующий исходный контракт и его ограничения:

Tenant `inlove` SHALL хранить `about_1_title`, `about_1_text`, `about_2_title`, `about_2_text` как отдельные значения типа `string`. Первый блок MUST иметь заполненные title и text; второй title и text MAY быть пустыми, но MUST сохраняться как отдельные ключи.

Начальная локальная коррекция SHALL записать утверждённые заглушки: `О конном клубе «ИНЛав»`, `Здесь будет основной текст о клубе. Замените эту заглушку в настройках сайта.`, `Наша атмосфера`, `Здесь будет дополнительный текст о клубе. Замените эту заглушку в настройках сайта.` соответственно.

#### Scenario: Первый и необязательный второй блок
- **WHEN** читаются четыре about-настройки после коррекции
- **THEN** все четыре ключа существуют и имеют тип `string`, первая пара заполнена, а вторая пара либо обе заполнена, либо обе пуста

### Requirement: Существующая матрица доступа сохраняется
Change MUST NOT изменять маршруты и существующую access policy site settings и профильных API; GET SHALL оставаться Public Read с tenant selector, а запись site settings — Protected Write с исходными ролями и outcomes согласно сценарию полного контракта.

#### Scenario: Полный контракт: Существующая матрица доступа сохраняется
- **WHEN** применяется контракт требования «Существующая матрица доступа сохраняется»
- **THEN** SHALL сохраняться весь следующий исходный контракт и его ограничения:

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
