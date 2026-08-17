# backend-access-platform Specification

## Purpose
Зафиксировать подтверждённые платформенные контракты backend: выбор tenant для публичного и CMS-чтения, различение anonymous и refresh-only запросов, правила CORS, аутентификации и разграничения доступа. Спецификация также определяет проверяемую access matrix и сохраняет явно зарегистрированные пробелы evidence без изменения runtime-поведения.
## Requirements
### Requirement: Tenant context для чтения и записи
Backend SHALL разрешать Public Read tenant context по непустому заголовку `X-Equestrian-Service-Key`, Protected Write context по аутентифицированному пользователю и dual-mode GET context по cookie пользователя либо selector. `X-Equestrian-Service-Key` MUST быть несекретным tenant selector, а не user auth. Данные другого tenant MUST NOT раскрываться.

#### Scenario: Публичное чтение с валидным selector
- **WHEN** анонимный клиент вызывает Public Read GET с известным `X-Equestrian-Service-Key`
- **THEN** backend выбирает связанный tenant и возвращает контрактный успешный ответ без user authentication

#### Scenario: Публичное чтение без selector
- **WHEN** полностью анонимный клиент вызывает tenant-aware Public Read GET без `X-Equestrian-Service-Key`
- **THEN** backend возвращает `401`

#### Scenario: Публичное чтение с неизвестным selector
- **WHEN** анонимный клиент вызывает tenant-aware Public Read GET с неизвестным `X-Equestrian-Service-Key`
- **THEN** backend возвращает `401` и не раскрывает существование tenant

#### Scenario: Аутентифицированный dual-mode GET
- **WHEN** пользователь с валидным access cookie вызывает dual-mode GET
- **THEN** backend использует `equestrian_id` пользователя и не требует selector

#### Scenario: Чужой tenant detail
- **WHEN** выбранный tenant запрашивает detail-ресурс другого tenant
- **THEN** backend не раскрывает ресурс и возвращает доменный контрактный denial/not-found status

### Requirement: Refresh-aware различение CMS и anonymous read
Dual-mode GET SHALL отличать Public Read с tenant selector от CMS-запроса с непустым refresh cookie без валидного access cookie. Refresh-only запрос MUST возвращать `401`; anonymous запрос без валидного selector MUST также возвращать `401`, но эти outcomes относятся к разным механизмам.

#### Scenario: Истёк access cookie при наличии refresh cookie
- **WHEN** dual-mode GET получает непустой refresh cookie без access cookie
- **THEN** backend возвращает `401`, позволяя CMS запустить refresh flow

#### Scenario: Полностью анонимный запрос без selector
- **WHEN** dual-mode GET не получает auth cookies или `X-Equestrian-Service-Key`
- **THEN** backend возвращает `401` отсутствующего tenant selector

#### Scenario: Refresh cookie вместе с валидным selector
- **WHEN** dual-mode GET получает refresh cookie без access cookie и валидный selector
- **THEN** backend обслуживает запрос как Public Read выбранного tenant

### Requirement: Cookie-контракт auth flow
Успешные login и refresh SHALL устанавливать HTTP-only `access_token` и `refresh_token` с path `/`; refresh SHALL ротировать пару токенов, а logout SHALL удалять cookie текущего path и legacy refresh path `/api/auth/refresh`.

#### Scenario: Успешный login
- **WHEN** клиент передаёт валидные credentials в `POST /api/auth/login`
- **THEN** backend возвращает `200` и устанавливает access/refresh cookie для path `/`

#### Scenario: Refresh без cookie
- **WHEN** клиент вызывает `POST /api/auth/refresh` без refresh cookie
- **THEN** backend возвращает `401`

#### Scenario: Успешный refresh
- **WHEN** клиент вызывает `POST /api/auth/refresh` с валидным refresh cookie
- **THEN** backend возвращает `200`, ротирует cookie на path `/` и удаляет cookie legacy path

#### Scenario: Logout без обязательной аутентификации
- **WHEN** клиент вызывает `POST /api/auth/logout` с cookie или без них
- **THEN** backend возвращает `204` и отправляет удаление access/refresh cookie, включая legacy refresh path

### Requirement: Split CORS по access class
Backend SHALL применять public CORS к обычным Public Read GET и strict credentialed CORS к мутирующим методам и cookie-only GET. Запрос без `Origin` MUST не получать CORS-заголовки, а CORS MUST NOT подменять серверную аутентификацию и авторизацию.

#### Scenario: Consumer origin читает публичный GET
- **WHEN** не-CMS origin вызывает обычный Public Read GET
- **THEN** ответ содержит `Access-Control-Allow-Origin: *` и не содержит `Access-Control-Allow-Credentials`

#### Scenario: CMS origin читает публичный GET
- **WHEN** разрешённый CMS origin вызывает Public Read GET с cookie support
- **THEN** ответ содержит конкретный origin и `Access-Control-Allow-Credentials: true`

#### Scenario: Разрешённый origin вызывает protected endpoint
- **WHEN** разрешённый CMS origin вызывает Protected Write или cookie-only GET
- **THEN** ответ содержит конкретный origin, credentials и `Vary: Origin`

#### Scenario: Чужой origin вызывает protected endpoint
- **WHEN** неразрешённый origin вызывает Protected Write или cookie-only GET
- **THEN** backend не добавляет разрешающие CORS-заголовки, сохраняя независимый HTTP auth outcome endpoint

#### Scenario: Недопустимый protected preflight
- **WHEN** неразрешённый origin отправляет preflight для мутирующего метода или cookie-only GET
- **THEN** backend возвращает `400` без `Access-Control-Allow-Origin`

#### Scenario: Public Read preflight
- **WHEN** consumer origin отправляет preflight для обычного Public Read GET
- **THEN** backend возвращает `200` с wildcard origin и без credentials

### Requirement: Access matrix backend access platform
Backend SHALL сохранять следующую evidence-based access matrix. `Успешный 2xx` для доменных классов означает точный success-код соответствующего endpoint; BE-1 не переопределяет доменный контракт BE-2.

| method | path | access class | roles | expected without auth | expected with auth | связанные evidence/tests |
|---|---|---|---|---|---|---|
| `GET` | tenant-aware public/dual-mode routes (`/api/horses*`, `/api/prices*`, `/api/site_settings*`, `/api/photos*`, public `/api/news*`) | Public Read с tenant key; dual-mode допускает CMS cookie | anonymous consumer с service key; authenticated tenant user | `200/2xx` с валидным key; `400` без key; `404` с неизвестным key; refresh-only без key — `401` | успешный `2xx` в tenant пользователя | report `003`; `test_auth_dependencies.py`; `test_auth_cookie_contract.py` |
| `POST/PATCH/DELETE` | доменные mutation routes | Protected Write | authenticated tenant user; дополнительные scopes только там, где их проверяет доменный service | `401` | успешный `2xx` после auth и применимых permission checks; часть legacy routes имеет только auth gate | report `003`; доменная детализация принадлежит BE-2 |
| `GET` | `/api/auth/me` | Protected Read, исключение из GET default | authenticated CMS user | `401` | `200` | report `003`; `get_current_user`; CORS tests |
| `GET` | `/api/news-cms` | Protected Read, исключение из GET default | authenticated CMS user с `SUPERUSER`, `ADMIN` или `DEVELOPER` scope | `401` | `200` с требуемым scope; `403` без scope | `_PROTECTED_GET_PATH_PREFIXES`; reports `007`, `018`; `NewsService._check_admin_permission` |
| `GET` | `/api/users*` | Protected Read, исключение из GET default для профиля пользователя | authenticated CMS user | `401` | `200` для `GET /api/users/me`; endpoint использует профиль текущего пользователя, отдельного role/scope gate нет | `_PROTECTED_GET_PATH_PREFIXES`; `api/users.py`; `get_current_user` |
| `POST` | `/api/auth/register` | Public Auth Write, исключение из write default | anonymous | `200` для валидного запроса | тот же контракт; cookie не требуется | `api/auth.py`; public registration подтверждён report `018` |
| `POST` | `/api/auth/login` | Public Auth Write, исключение из write default | anonymous | `200` при валидных credentials; клиентская auth-ошибка при невалидных | тот же контракт; существующая cookie не требуется | `api/auth.py`; `test_auth_cookie_contract.py`; report `018` |
| `POST` | `/api/auth/refresh` | Public Auth Write с обязательным refresh cookie | владелец валидного refresh token | `401` без refresh cookie | `200` с валидным refresh cookie | `api/auth.py`; `test_auth_cookie_contract.py` |
| `POST` | `/api/auth/logout` | Public Auth Write для идемпотентного удаления cookie | anonymous или authenticated browser | `204` | `204` | `api/auth.py`; `test_auth_cookie_contract.py`; CORS tests |

Публичность auth POST является исключением, потому что login/register создают аутентифицированное состояние, refresh восстанавливает его по refresh cookie, а logout должен безопасно очищать cookie даже при истёкшем access token. `GET /api/auth/me` и другие cookie-only GET являются исключением из Public Read, потому что возвращают пользовательские или CMS-only данные.

#### Scenario: Access reviewer проверяет anonymous и authenticated ветви
- **WHEN** пакет проходит review перед sync
- **THEN** reviewer сопоставляет каждую строку matrix с указанным code/test/report evidence и блокирует неподтверждённое изменение access class или статусов

#### Scenario: Доменный endpoint уточняет success-код
- **WHEN** BE-2 фиксирует конкретный доменный endpoint
- **THEN** его spec уточняет точный `2xx` и scope outcome, не меняя Public Read или Protected Write класс BE-1 без отдельного evidence-based change

### Requirement: Ограничение evidence backfill
Backfill SHALL трассироваться к задачам `003`, `012` и `018` и MUST NOT объявлять полное live smoke-покрытие mutation/photo/pedigree endpoint, поскольку report `003` оставляет это follow-up.

#### Scenario: Reviewer обнаруживает claim без evidence
- **WHEN** требование выходит за code/tests/reports evidence назначенных строк или присваивает BE-1 доменный CRUD/DTO
- **THEN** reviewer блокирует sync до удаления claim либо регистрации отдельного gap/change у соответствующего владельца

### Requirement: Полная inventory matrix backend routes
Backend SHALL генерировать и поддерживать reviewable inventory всех routes с колонками `method`, `path`, `access class`, `roles`, `tenant selector`, `owner rule`, `without auth`, `with auth`, `foreign resource`, `validation status`, `tests`. Inventory MUST включать email routes и все существующие public/protected/service исключения.

#### Scenario: Quality Gate проверяет route inventory
- **WHEN** выполняется единый Quality Gate
- **THEN** каждая зарегистрированная backend route сопоставлена ровно одной строке inventory и подтверждена anonymous/authenticated/foreign/selector tests по применимости
