## MODIFIED Requirements

### Requirement: Access matrix backend access platform
Backend SHALL сохранять следующую evidence-based access matrix. `Успешный 2xx` для доменных классов означает точный success-код соответствующего endpoint; BE-1 не переопределяет доменный контракт BE-2.

#### Scenario: Access reviewer проверяет anonymous и authenticated ветви
- **WHEN** пакет проходит review перед sync
- **THEN** reviewer сопоставляет каждую строку matrix с указанным code/test/report evidence и блокирует неподтверждённое изменение access class или статусов

#### Scenario: Доменный endpoint уточняет success-код
- **WHEN** BE-2 фиксирует конкретный доменный endpoint
- **THEN** его spec уточняет точный `2xx` и scope outcome, не меняя Public Read или Protected Write класс BE-1 без отдельного evidence-based change

#### Scenario: Неизменная access matrix и основания её применения
- **WHEN** проверяется доступ по строкам следующей матрицы
- **THEN** действует следующий исходный контракт без изменения условий и outcomes:

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
