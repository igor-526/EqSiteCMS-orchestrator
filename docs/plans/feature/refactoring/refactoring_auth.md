# План: refactoring auth module

**Тикет:** REFACTORING-AUTH
**Дата:** 2026-05-06
**Затронутые сервисы:** services/backend
**Ветка:** feature/refactoring-testing-audit
**Статус:** rework implementation, передан Backend 2026-05-06

---

## Контекст

Модуль `auth` отвечает за регистрацию, вход, refresh и получение текущего пользователя. Сервис уже зависит от `UserRepositoryProtocol` и `SecurityProtocol`, но нужно зафиксировать контракт ошибок, payload token validation, DTO mapping и границу cookie/settings logic в API.

## Цель

Привести auth use cases к явному service/entity error contract и покрыть каждую функцию `AuthService` unit-тестами по UC01-UC30 из parent plan.

## Файлы

| Слой | Файлы |
|---|---|
| API | `services/backend/src/api/auth.py` |
| DI | `services/backend/src/depends/services.py`, `services/backend/src/depends/utils.py` |
| Service | `services/backend/src/core/services/auth.py` |
| Schemas | `services/backend/src/core/schemas/auth.py`, `services/backend/src/core/schemas/users.py` |
| Entities | `services/backend/src/core/entities/user.py`, `services/backend/src/core/entities/tokens.py` |
| Protocols | `services/backend/src/core/protocols/repositories/user_repository.py`, `services/backend/src/core/protocols/security.py` |
| Exceptions | `services/backend/src/core/exceptions/auth.py`, `services/backend/src/core/exceptions/base.py` |
| Tests | `services/backend/tests/unit/core/services/test_auth_service.py` |

## Что рефакторить

- Проверить, что `AuthService` не зависит от FastAPI, settings, concrete repositories или response/cookie primitives.
- Оставить cookie setting/clearing в API или вынести в инфраструктурный helper через DI, не смешивая с auth business flow.
- В `get_current_user` явно обработать отсутствующий `sub`, пустой `sub`, payload без ожидаемых claims и ошибку repository lookup через `InvalidCredentials`.
- В `refresh` явно проверить payload refresh token так же строго, как access token.
- В `register` не мутировать входной DTO `RegisterData`; создавать отдельный command/entity payload с hashed password.
- Проверить, что duplicate username всегда выходит через `UserAlreadyExists` и централизованный handler.
- Проверить DTO mapping `User -> UserOutDto` с scopes без раскрытия `password`.
- Уточнить в тестах контракт `SecurityProtocol`: decode/hash/verify/create token calls и порядок вызовов.

## Unit-тесты service functions

| Класс | Функция | Тип | Обязательные сценарии |
|---|---|---|---|
| `AuthService` | `get_current_user` | public service function | auth-relevant UC01-UC30 matrix |
| `AuthService` | `register` | public service function | auth-relevant UC01-UC30 matrix |
| `AuthService` | `login` | public service function | auth-relevant UC01-UC30 matrix |
| `AuthService` | `refresh` | public service function | auth-relevant UC01-UC30 matrix |

### 30 UserCases/EdgeCases на каждую функцию

Каждая функция из таблицы выше получает все сценарии: UC01 happy path; UC02 minimal input; UC03 full input; UC04 omitted optional; UC05 empty value; UC06 whitespace value; UC07 unicode/case; UC08 boundary min; UC09 below min; UC10 boundary max; UC11 above max; UC12 malformed id/slug/token; UC13 not found; UC14 duplicate/conflict; UC15 self-exclusion; UC16 reference validation; UC17 permission allowed; UC18 permission denied; UC19 partial update; UC20 empty update; UC21 repository failure; UC22 dependency order; UC23 rollback intent; UC24 idempotency/retry; UC25 sorting stability; UC26 filtering semantics; UC27 pagination semantics; UC28 serialization/mapping; UC29 structural vs business validation; UC30 architecture boundary.

Auth не имеет CRUD-list поведения, сортировки, фильтрации, пагинации, partial update, self-exclusion или reference graph. Поэтому полный набор из 120 отдельных тестов дал бы дублирующие или искусственные проверки без дополнительного риска-coverage. Для auth фиксируем технически согласованный объем: все применимые UC покрываются отдельными или параметризованными unit-сценариями через fake `UserRepositoryProtocol` и fake `SecurityProtocol`; неприменимые UC документируются как N/A для этого bounded context.

| UC | Auth mapping |
|---|---|
| UC01 happy path | `get_current_user`, `register`, `login`, `refresh` successful flows |
| UC02 minimal input | `login` принимает минимальный DTO `username/password`; smoke alias `login/password` |
| UC03 full input | `register` принимает полный DTO с `middle_name` |
| UC04 omitted optional | `register` допускает `middle_name=None` |
| UC05 empty value | access/refresh payload rejects empty `sub`; login unknown user rejects |
| UC06 whitespace value | access payload rejects whitespace `sub` |
| UC07 unicode/case | не нормализуем username в сервисе; repository lookup получает значение как есть |
| UC08-UC11 min/max boundaries | N/A: auth service не владеет длинами строк; структурная валидация DTO/API |
| UC12 malformed token | access/refresh payload without required claims or with wrong `token_type` rejects |
| UC13 not found | token subject/login username absent in repository -> `InvalidCredentials` |
| UC14 duplicate/conflict | duplicate username in `register` -> `UserAlreadyExists` |
| UC15 self-exclusion | N/A: auth has no self-exclusion update/list use case |
| UC16 reference validation | token subject repository lookup validates user reference |
| UC17 permission allowed | valid access token returns current user with scopes |
| UC18 permission denied | invalid/expired/malformed tokens -> `InvalidCredentials` |
| UC19 partial update | N/A: auth has no update command |
| UC20 empty update | N/A: auth has no update command |
| UC21 repository failure | current-user repository failure maps to `InvalidCredentials` |
| UC22 dependency order | tests assert decode/hash/verify/token creation order |
| UC23 rollback intent | service does not commit; transaction boundary remains DI/session |
| UC24 idempotency/retry | repeated failed login/refresh does not create tokens or mutate DTO |
| UC25 sorting stability | N/A: auth has no sorting |
| UC26 filtering semantics | N/A: auth has no filtering |
| UC27 pagination semantics | N/A: auth has no pagination |
| UC28 serialization/mapping | `UserOutDto.model_dump()` excludes `password`, scopes included |
| UC29 structural vs business validation | structural DTO validation stays Pydantic/API; auth business errors use `ClientError` subclasses |
| UC30 architecture boundary | service depends only on Protocol/Entity/DTO, no FastAPI/settings/concrete repositories |

### SMOKE-тесты на реальном API

Переменные:

```text
BASE_URL=http://localhost:8001
COOKIE_JAR=/tmp/eqsitecms-smoke-cookies.txt
AUTH_ENDPOINT=/api/auth/login
ROLE=superuser
```

Авторизация выполняется cookie flow через `POST /api/auth/login` с телом `{"login":"<role.login>","password":"<role.password>"}` или `{"username":"<role.login>","password":"<role.password>"}`. Сервисный DTO поддерживает оба имени поля для совместимости с smoke skill; основной доменный атрибут остается `username`.

| # | Запрос | Проверка |
|---|---|---|
| SM-AUTH-00 | `GET /health` | `200`, API доступен |
| SM-AUTH-01 | `POST /api/auth/login` | `200`, установлены `access_token` и `refresh_token` cookie |
| SM-AUTH-02 | `GET /api/auth/me` с cookie | `200`, JSON содержит `username`, не содержит `password` |
| SM-AUTH-03 | `POST /api/auth/refresh` с cookie | `200`, обновлены `access_token` и `refresh_token` cookie |
| SM-AUTH-04 | `POST /api/auth/logout` с cookie | `204`, auth cookies удалены |
| SM-AUTH-05 | `GET /api/auth/me` без cookie | `401` через централизованный handler `InvalidCredentials`, без `ResponseValidationError` |
| SM-AUTH-06 | `POST /api/auth/login` с неверным паролем | `401` через централизованный handler `InvalidCredentials` |

## Чеклист

- [x] Убрать мутацию входного DTO в `register`
- [x] Зафиксировать token payload validation для access и refresh flows
- [x] Проверить mapping пользователя и scopes без приватных полей
- [x] Убрать `try/except InvalidCredentials` из `api/auth.py`
- [x] Привести smoke auth endpoint к `/api/auth/login`
- [x] Добавить SMOKE-секцию `SM-AUTH-*`
- [x] Покрыть `get_current_user` auth-relevant UC01-UC30
- [x] Покрыть `register` auth-relevant UC01-UC30
- [x] Покрыть `login` auth-relevant UC01-UC30
- [x] Покрыть `refresh` auth-relevant UC01-UC30
