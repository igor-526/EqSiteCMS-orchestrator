## ADDED Requirements

### Requirement: Необязательное описание цены при создании и изменении
Backend SHALL принимать пустое описание цены через `POST /api/prices` и `PATCH /api/prices/{slug_or_id}`, сохранять результат обрезки пробельных символов по краям, включая `""`, и возвращать его в ответе. Отсутствующее описание и `null` MUST сохранять существующую семантику. Ограничение непустого описания в 511 символов и правила других полей MUST оставаться неизменными.

#### Scenario: Создание цены с пустым описанием
- **WHEN** authenticated tenant user создаёт цену с валидным именем и `description=""` либо строкой только из пробельных символов
- **THEN** backend возвращает `200`, сохраняет и возвращает `description=""`

#### Scenario: Очистка описания цены пустой строкой
- **WHEN** authenticated tenant user изменяет собственную цену с непустым описанием, передавая `description=""` либо строку только из пробельных символов
- **THEN** backend возвращает `200`, сохраняет и возвращает `description=""`, не изменяя другие поля, не переданные в PATCH

#### Scenario: PATCH без описания сохраняет значение
- **WHEN** authenticated tenant user изменяет другое допустимое поле собственной цены и не передаёт description
- **THEN** backend возвращает `200` и оставляет описание без изменений

#### Scenario: Null сохраняет действующий контракт
- **WHEN** authenticated tenant user создаёт цену без description или с `description=null`, либо PATCH-ит существующую цену с `description=null`
- **THEN** создание возвращает `200` с `description=null`; при PATCH поле null игнорируется и не очищает описание; при наличии другого допустимого изменения ответ `200`, а тело только `{"description":null}` возвращает существующий `400` «Нет данных для обновления» без записи

#### Scenario: Нормализация и границы непустого описания
- **WHEN** authenticated tenant user передаёт непустое description при create или PATCH
- **THEN** backend обрезает пробельные символы по краям, принимает длину до 511 включительно, а длину 512 после обрезки отклоняет с `400` до записи

#### Scenario: Валидация других полей не ослаблена
- **WHEN** authenticated tenant user передаёт пустое name, явно пустой slug, явно пустой page_data или опасный JavaScript в page_data
- **THEN** backend сохраняет существующий отказ `400` без записи; разрешение пустой строки относится только к описанию цены, не к описаниям групп

### Requirement: Доступ к операциям цены с необязательным описанием
Backend MUST сохранять Protected Write для create/update цены, tenant isolation и Public Read без новых исключений. Роли и HTTP outcomes SHALL соответствовать матрице ниже; tenant selector является identity hint, не аутентификацией.

#### Scenario: Матрица доступа цены
- **WHEN** клиент создаёт, изменяет или читает цену
- **THEN** backend применяет следующую матрицу без изменения прав

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| POST | `/api/prices` | Protected Write | любой authenticated tenant user; отдельного scope gate нет | `401`, в том числе с одним tenant selector | `200` при валидных данных, включая пустое описание; `400` при бизнес-ошибке |
| PATCH | `/api/prices/{slug_or_id}` | Protected Write | любой authenticated tenant user для цены своего tenant; отдельного scope gate нет | `401`, в том числе с одним tenant selector | `200` при валидном изменении; `400` для чужой/отсутствующей цены, null-only и бизнес-ошибки, без записи |
| GET | `/api/prices`, `/api/prices/{slug_or_id}` | Public Read | anonymous с валидным selector; authenticated tenant user | `200` с валидным selector; missing/invalid selector `401`; отсутствующий detail `404` | `200` в tenant пользователя; отсутствующий detail `404` |

Исключений из Public Read / Protected Write нет. Связанные проверки: `UT-PD-05..UT-PD-07`, `SM-PD-01..SM-PD-04` в test matrix design.

#### Scenario: Anonymous запись запрещена
- **WHEN** anonymous клиент отправляет POST или PATCH с пустым description, без selector либо с валидным selector
- **THEN** backend возвращает `401` и не записывает изменения

#### Scenario: Authenticated запись без дополнительных scopes
- **WHEN** authenticated tenant user без специальных price scopes создаёт или изменяет собственную цену с пустым description
- **THEN** backend возвращает `200`; исправление не добавляет новый scope gate

#### Scenario: Чужая цена не изменяется
- **WHEN** authenticated tenant user отправляет PATCH с пустым description для UUID или slug цены, отсутствующей в его tenant
- **THEN** backend возвращает существующий `400` «Цена не найдена» и не изменяет чужую запись

#### Scenario: Public Read пустого описания
- **WHEN** anonymous consumer с валидным tenant selector либо authenticated tenant user читает цену после очистки описания
- **THEN** backend возвращает `200` с `description=""` без требования CMS cookie для anonymous; missing/invalid selector у anonymous возвращает `401`
