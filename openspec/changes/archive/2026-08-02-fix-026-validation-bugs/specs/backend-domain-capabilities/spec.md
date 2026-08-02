## ADDED Requirements

### Requirement: Нормализация необязательных полей пород и мастей
Backend SHALL принимать в create/update пород и мастей отсутствующие, `null`, пустые и состоящие только из пробелов значения `slug` и `description`. Пустой `slug` MUST интерпретироваться как отсутствие пользовательского slug, а пустое описание MUST сохраняться как `null`. При create без slug backend SHALL сгенерировать уникальный slug из нормализованного имени; при update с пустым slug backend SHALL не отклонять запрос и SHALL сохранить текущий slug, если имя не изменилось, либо применить действующую генерацию из нового имени, если имя изменилось.

#### Scenario: Создание породы без slug и описания
- **WHEN** разрешённый пользователь отправляет `POST /horses/breeds` с валидным именем и пустыми либо отсутствующими `slug` и `description`
- **THEN** backend создаёт породу, генерирует уникальный slug из имени и возвращает `description: null`

#### Scenario: Изменение породы с пустыми необязательными полями
- **WHEN** разрешённый пользователь отправляет `PATCH /horses/breeds/{slug_or_id}` с пустыми `slug` и `description`
- **THEN** backend не возвращает ошибку пустого поля, сохраняет согласованный slug и устанавливает описание в `null`

#### Scenario: Создание масти без slug и описания
- **WHEN** разрешённый пользователь отправляет `POST /horses/coat_colors` с валидным именем и пустыми либо отсутствующими `slug` и `description`
- **THEN** backend создаёт масть, генерирует уникальный slug из имени и возвращает `description: null`

#### Scenario: Изменение масти с пустыми необязательными полями
- **WHEN** разрешённый пользователь отправляет `PATCH /horses/coat_colors/{slug_or_id}` с пустыми `slug` и `description`
- **THEN** backend не возвращает ошибку пустого поля, сохраняет согласованный slug и устанавливает описание в `null`

#### Scenario: Access matrix существующих endpoint
- **WHEN** change проверяется относительно API access policy
- **THEN** применяется следующая матрица без исключений

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| POST | `/horses/breeds` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401`/`403` по auth middleware | `200`/`201` при валидных данных и scope; `403` без scope |
| PATCH | `/horses/breeds/{slug_or_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401`/`403` по auth middleware | `200` при валидных данных и scope; `403` для чужого tenant/без scope |
| POST | `/horses/coat_colors` | Protected Write | существующие admin scopes endpoint | `401`/`403` по auth middleware | успех при валидной auth и scope; `403` без права/для чужого tenant |
| PATCH | `/horses/coat_colors/{slug_or_id}` | Protected Write | существующие admin scopes endpoint | `401`/`403` по auth middleware | `200` при валидной auth и scope; `403` без права/для чужого tenant |

#### Scenario: Анонимный Protected Write
- **WHEN** клиент без cookie вызывает любой изменяемый endpoint из access matrix
- **THEN** backend возвращает контрактный `401` или `403` и не изменяет PostgreSQL

#### Scenario: Изоляция tenant
- **WHEN** authenticated пользователь пытается изменить породу или масть чужого equestrian tenant
- **THEN** backend возвращает контрактный отказ или отсутствие ресурса и не изменяет чужую запись

