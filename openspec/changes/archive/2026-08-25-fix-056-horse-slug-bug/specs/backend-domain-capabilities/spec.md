## ADDED Requirements

### Requirement: Управляемый slug лошади

Backend SHALL принимать необязательный `slug` в `POST /api/horses` и `PATCH /api/horses/{horse_id}`, нормализовать его доменным slug-алгоритмом и обеспечивать уникальность внутри текущего tenant. При create отсутствующий, `null` или пустой slug MUST генерироваться из `name`; при PATCH отсутствующее поле MUST сохранять текущий slug, а `null` или пустая строка MUST регенерировать его из итогового имени. Явная tenant-scoped коллизия или значение, нормализуемое в пустую строку, MUST возвращать управляемый `400`, а не `500`.

#### Scenario: Создание с ручным slug
- **WHEN** разрешённый пользователь создаёт лошадь с `slug=" My Horse URL "`
- **THEN** backend сохраняет нормализованный `my-horse-url` и возвращает его в `HorseOutDto`

#### Scenario: Автогенерация при пустом create slug
- **WHEN** разрешённый пользователь создаёт лошадь без `slug`, с `slug=null` или `slug=""`
- **THEN** backend генерирует slug из `name` и при tenant-scoped коллизии выбирает минимальный свободный суффикс `-N`

#### Scenario: Partial PATCH сохраняет slug
- **WHEN** разрешённый пользователь обновляет другие поля лошади без поля `slug`
- **THEN** backend сохраняет текущий slug без изменений

#### Scenario: PATCH меняет slug
- **WHEN** разрешённый пользователь отправляет непустой свободный `slug` для собственной tenant-записи
- **THEN** backend нормализует и сохраняет новый slug, новый Public Read lookup находит лошадь, а старый slug её больше не находит

#### Scenario: PATCH регенерирует slug
- **WHEN** разрешённый пользователь передаёт `slug=null` или `slug=""` вместе с текущим либо новым `name`
- **THEN** backend генерирует slug из итогового имени и обеспечивает tenant-scoped уникальность

#### Scenario: Self-conflict отсутствует
- **WHEN** разрешённый пользователь PATCH-ит лошадь её текущим slug после нормализации
- **THEN** backend возвращает успех и не считает саму запись конфликтом

#### Scenario: Ручной slug занят
- **WHEN** разрешённый пользователь задаёт slug, уже принадлежащий другой лошади того же tenant
- **THEN** backend возвращает управляемый `400`, не изменяет запись и не маскирует конфликт автоматическим suffix

#### Scenario: Одинаковый slug в разных tenant
- **WHEN** два разрешённых пользователя разных tenant задают одинаковый нормализованный slug
- **THEN** обе записи сохраняются независимо и Public Read lookup соблюдает tenant isolation

#### Scenario: Нормализация даёт пустой slug
- **WHEN** ручное значение после доменной нормализации не содержит допустимых символов и имя не используется для явного значения
- **THEN** backend возвращает `400` и не пишет частичное состояние

#### Scenario: Race condition ограничена constraint mapping
- **WHEN** конкурентные операции проходят предварительную проверку одного slug в одном tenant
- **THEN** unique constraint оставляет не более одной конфликтующей записи, а проигравший запрос получает управляемую клиентскую ошибку без `500`

### Requirement: Access contract управления slug лошади

Изменение slug SHALL сохранять стандартный Protected Write контракт, а чтение лошади по новому slug SHALL сохранять Public Read контракт с tenant selector. Исключений из дефолтной access policy нет.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `POST` | `/api/horses` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401`; no write; missing/invalid selector `401` | `200` со scope; `403` без scope; `400` invalid/conflict slug |
| `PATCH` | `/api/horses/{horse_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401`; no mutation | `200` для своего tenant и scope; `403` без scope/foreign tenant; `400` invalid/conflict slug |
| `GET` | `/api/horses` | Public Read с tenant selector | anonymous consumer; CMS user | `200` valid selector; `401` missing/invalid | `200` |
| `GET` | `/api/horses/{slug_or_id}` | Public Read с tenant selector | anonymous consumer; CMS user | `200` valid selector; `401` missing/invalid; `404` missing | `200` |

#### Scenario: Anonymous write запрещён
- **WHEN** anonymous client вызывает POST или PATCH с полем `slug`
- **THEN** backend возвращает `401` и PostgreSQL запись не создаётся и не меняется

#### Scenario: Authenticated write разрешён по scope
- **WHEN** authenticated пользователь с разрешённым scope и валидным tenant selector создаёт или меняет slug своей лошади
- **THEN** backend применяет mutation и возвращает `200`

#### Scenario: Недостаточный scope или чужой tenant
- **WHEN** authenticated пользователь без horse write scope либо из другого tenant пытается изменить slug
- **THEN** backend возвращает `403` по контракту и не раскрывает/не меняет чужую запись

#### Scenario: Anonymous Public Read нового slug
- **WHEN** anonymous consumer с валидным tenant selector читает `/api/horses/{new_slug}` без CMS cookie
- **THEN** backend возвращает `200` и лошадь своего tenant

#### Scenario: Missing или invalid tenant selector
- **WHEN** anonymous consumer читает horse GET без selector либо с invalid selector
- **THEN** backend возвращает `401`
