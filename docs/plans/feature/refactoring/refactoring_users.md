# План: refactoring users module

**Тикет:** REFACTORING-USERS
**Дата:** 2026-05-06
**Затронутые сервисы:** services/backend
**Ветка:** feature/refactoring-testing-audit
**Статус:** draft, требуется согласование пользователя до передачи Backend

---

## Контекст

Модуль `users` сейчас минимален: `UserService.get_users` возвращает все сущности `User` через `UserRepositoryProtocol.get_all`. Нужно зафиксировать, не раскрывает ли публичный слой приватные поля, и покрыть service boundary unit-тестами.

## Цель

Сделать контракт списка пользователей явным и покрыть `UserService.get_users` UC01-UC30.

## Файлы

| Слой | Файлы |
|---|---|
| API | текущий users endpoint, если есть в `services/backend/src/api` или будущий router |
| DI | `services/backend/src/depends/services.py`, `services/backend/src/depends/repositories.py` |
| Service | `services/backend/src/core/services/users.py` |
| Schemas | `services/backend/src/core/schemas/users.py` |
| Entities | `services/backend/src/core/entities/user.py` |
| Protocols | `services/backend/src/core/protocols/repositories/user_repository.py` |
| Repository | `services/backend/src/repositories/user_repository.py` |
| Tests | `services/backend/tests/unit/core/services/test_user_service.py` |

## Что рефакторить

- Проверить, должен ли service возвращать `User` entity или public `UserOutDto`; не раскрывать `password`/private fields наружу.
- Если API отсутствует или не подключен, не создавать новый публичный endpoint без отдельного согласования; план только про service boundary.
- Зафиксировать filter/pagination strategy, если `get_users` остается публичным list use case.
- Проверить repository failure contract и mapping expected domain errors.
- Проверить architecture boundary: service зависит только от `UserRepositoryProtocol`.
- Добавить fake repository tests для empty list, multiple users, private field safety и call order.

## Unit-тесты service functions

| Класс | Функция | Тип | Обязательные сценарии |
|---|---|---|---|
| `UserService` | `get_users` | public service function | UC01-UC30 |

### 30 UserCases/EdgeCases на каждую функцию

Каждая функция из таблицы выше получает все сценарии: UC01 happy path; UC02 minimal input; UC03 full input; UC04 omitted optional; UC05 empty value; UC06 whitespace value; UC07 unicode/case; UC08 boundary min; UC09 below min; UC10 boundary max; UC11 above max; UC12 malformed id/slug/token; UC13 not found; UC14 duplicate/conflict; UC15 self-exclusion; UC16 reference validation; UC17 permission allowed; UC18 permission denied; UC19 partial update; UC20 empty update; UC21 repository failure; UC22 dependency order; UC23 rollback intent; UC24 idempotency/retry; UC25 sorting stability; UC26 filtering semantics; UC27 pagination semantics; UC28 serialization/mapping; UC29 structural vs business validation; UC30 architecture boundary.

Для функции раскрыть UC01-UC30 из `refactoring_and_testing_audit.md` отдельными unit-сценариями через fake `UserRepositoryProtocol`.

### SMOKE-тесты на реальном API

Публичного `/api/users` router в текущем `services/backend/src/api` нет. Smoke для user DTO boundary выполняется через существующие auth endpoints, которые возвращают `UserOutDto` или текущего пользователя. Новый endpoint только ради smoke в рамках этого плана не создается.

Переменные:

```bash
BASE_URL="из .claude/skills/api-smoke-test/credentials.json"
COOKIE_JAR="из .claude/skills/api-smoke-test/credentials.json"
SMOKE_SUFFIX="$(date +%Y%m%d%H%M%S)"
SMOKE_USERNAME="smoke_user_${SMOKE_SUFFIX}"
SMOKE_PASSWORD="SmokePassword123!"
```

| ID | Method | Endpoint | Body | Ожидание | Проверка |
|---|---|---|---|---|---|
| SM-US-01 | POST | `/api/auth/login` | credentials superuser из skill | `200` | cookie сохранены |
| SM-US-02 | GET | `/api/auth/me` | - | `200` | есть `id`, `username`, `created_at`; нет `password` |
| SM-US-03 | GET | `/api/auth/me` без cookie | - | `401` | нет `500`, нет приватных полей |
| SM-US-04 | POST | `/api/auth/register` | уникальный `SMOKE_USERNAME`, `SMOKE_PASSWORD`, profile fields | `200` | ответ соответствует `UserOutDto`, нет `password` |
| SM-US-05 | POST | `/api/auth/register` | тот же username | `400` | duplicate user дает клиентскую ошибку |
| SM-US-06 | POST | `/api/auth/login` | новый пользователь | `200` | cookie нового пользователя сохранены |
| SM-US-07 | GET | `/api/auth/me` | cookie нового пользователя | `200` | `username == SMOKE_USERNAME`, нет `password` |
| SM-US-08 | POST | `/api/auth/logout` | - | `204` | cookie очищены |
| SM-US-09 | GET | `/api/auth/me` после logout | - | `401` | нет доступа после logout |

Примечание: `SM-US-04` создает пользователя в реальной PostgreSQL. Так как публичного delete-user API нет, cleanup через HTTP не выполняется; username обязан быть уникальным через `SMOKE_SUFFIX`.

## Чеклист

- [ ] Зафиксировать public return DTO/entity contract
- [ ] Проверить отсутствие private field leakage
- [ ] Покрыть `get_users` UC01-UC30
