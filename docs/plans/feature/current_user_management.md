# План: Управление текущим пользователем в CMS

**Тикет:** USER-001  
**Дата:** 2026-05-22  
**Затронутые сервисы:** `services/backend`, `services/frontend`  
**Ветка:** `feature/current-user-management`

---

## Контекст

В сайдбаре CMS нет блока управления авторизованным пользователем. Пользователь не видит своего профиля, не может поменять ФИО или пароль.

Уже существует:
- `GET /api/auth/me` — возвращает `UserOutDto` (id, username, first/last/middle_name, equestrian_id, scopes, timestamps). Вызывается часто: `UserContext` на фронте использует его для технической проверки авторизации при каждом монтировании.
- `UserService` в `src/core/services/users.py` — тонкий сервис, только `get_users()`
- `UserRepository` с методами `get_by_username`, `get_user_scopes`; `get_by_id()` и `update()` унаследованы от `AbstractRepository`
- Сущность `Equestrian` с полем `name` связана с пользователем через `users.equestrian_id`

Чего не хватает:
- Отдельного namespace `/users/*` для работы с данными пользователей (сейчас нет `users_router`)
- Endpoint'а `GET /users/me` с полным профилем включая название конюшни (отдельно от `/auth/me`)
- Endpoint'ов обновления профиля и смены пароля
- UI: ни блока профиля в сайдбаре, ни страницы профиля

## Цель

1. `GET /api/auth/me` **не изменяется** — продолжает быть лёгким техническим endpoint'ом для проверки авторизации на фронте.
2. Новый `GET /api/users/me` — полный профиль пользователя, включая `equestrian_name`.
3. Новый `PATCH /api/users/me` — обновление `first_name`, `last_name`, `middle_name`.
4. Новый `PATCH /api/users/me/password` — смена пароля с проверкой текущего.
5. Сайдбар CMS: блок профиля (аватар-буква, ФИО/никнейм) + «Выйти» отделены линией.
6. Страница `/profile` с тремя блоками: шапка, форма личных данных, форма смены пароля.

Разделение `/auth/*` и `/users/*` готовит почву для будущей системы управления всеми пользователями (`GET /users/{uuid}`, `PATCH /users/{uuid}`, и т.д.) без переименования endpoint'ов.

---

## Детали реализации

### Backend

#### `GET /api/auth/me` — без изменений

Endpoint и `UserOutDto` не трогаем. `AuthService` не меняется.

#### Новые схемы

| Что | Файл | Описание |
|-----|------|----------|
| `UserProfileDto` | `src/core/schemas/users.py` | Как `UserOutDto` + `equestrian_name: str \| None = None` |
| `UpdateProfileIn` | `src/core/schemas/users.py` | `first_name: str \| None`, `last_name: str \| None`, `middle_name: str \| None` — все optional |
| `ChangePasswordIn` | `src/core/schemas/users.py` | `current_password: str`, `new_password: str` (min 8 chars), `confirm_new_password: str` + validator совпадения |

#### Расширение `UserService`

Файл: `src/core/services/users.py`

`__init__` расширяется двумя зависимостями:
- `equestrian_repository: EquestrianRepositoryProtocol` — для обогащения `equestrian_name`
- `security: SecurityProtocol` — для верификации и хеширования пароля

Новые методы:

| Метод | Логика |
|-------|--------|
| `get_my_profile(current_user)` | `equestrian_repo.get_by_id(current_user.equestrian_id)` → собрать `UserProfileDto` |
| `update_my_profile(current_user, data)` | `user_repo.get_by_id` → применить поля → `user_repo.update` → `get_my_profile` → `UserProfileDto` |
| `change_my_password(current_user, data)` | `user_repo.get_by_id` → `security.verify_password` → если нет: `InvalidCredentials` → `security.hash_password` → `user_repo.update` → `None` |

> Новых методов репозитория не требуется — `get_by_id()` и `update()` из `AbstractRepository` достаточно.

#### Обновление `get_user_service`

Файл: `src/depends/services.py`

`get_user_service` инжектирует `equestrian_repository` и `security` в `UserService`.

#### Новый роутер `users`

Новый файл: `src/api/users.py`

| Handler | Метод | Путь |
|---------|-------|------|
| `get_my_profile` | GET | `/me` |
| `update_my_profile` | PATCH | `/me` |
| `change_my_password` | PATCH | `/me/password` |

Все три handler'а принимают `current_user: UserOutDto = Depends(get_current_user)`.

Регистрация:
- Экспорт `users_router` из `src/api/__init__.py`
- Подключение в `src/main.py`: `router.include_router(users_router, prefix="/users", tags=["Users"])`

#### API контракт

```
# НЕ ИЗМЕНЯЕТСЯ
GET /api/auth/me
Cookie: access_token=<token>
Response 200: UserOutDto (без equestrian_name)
Response 401: нет/истёк cookie

---

GET /api/users/me
Cookie: access_token=<token>
Response 200:
{
  "id": "uuid",
  "username": "string",
  "first_name": "string | null",
  "last_name": "string | null",
  "middle_name": "string | null",
  "equestrian_id": "uuid",
  "equestrian_name": "string | null",   ← полное название конюшни
  "created_at": "datetime",
  "updated_at": "datetime | null",
  "scopes": [{"id": "uuid", "scope_name": "string", "scope_description": "string | null", ...}]
}
Response 401: нет/истёк cookie

---

PATCH /api/users/me
Cookie: access_token=<token>
Body: {
  "first_name": "string | null",
  "last_name": "string | null",
  "middle_name": "string | null"
}
Response 200: UserProfileDto (обновлённый)
Response 401: нет cookie
Response 422: невалидные данные (поля длиннее 63 символов)

---

PATCH /api/users/me/password
Cookie: access_token=<token>
Body: {
  "current_password": "string",
  "new_password": "string",          // min 8 символов
  "confirm_new_password": "string"   // должен совпадать с new_password
}
Response 204: успех (без тела)
Response 400: неверный текущий пароль
Response 401: нет cookie
Response 422: невалидные данные (слабый пароль, несовпадение confirm)
```

#### Схема БД

Изменений в схеме БД не требуется. Миграции не нужны.

---

### Frontend

#### Разделение типов пользователя

| Тип | Файл | Описание |
|-----|------|----------|
| `User` (без изменений) | `src/types/api/user.ts` | Используется в `UserContext` (из `GET /auth/me`) |
| `UserProfile` (новый) | `src/types/api/user.ts` | Расширяет `User` + `equestrian_name: string \| null` (из `GET /users/me`) |
| `UpdateProfileIn` (новый) | `src/types/api/user.ts` | `{ first_name: string \| null; last_name: string \| null; middle_name: string \| null }` |
| `ChangePasswordIn` (новый) | `src/types/api/user.ts` | `{ current_password: string; new_password: string; confirm_new_password: string }` |

#### API слой

| Что | Файл | Описание |
|-----|------|----------|
| `getUserInfo()` (без изменений) | `src/api/user.ts` | `GET /auth/me` → `ApiResult<User>` (для UserContext) |
| `getMyProfile()` (новый) | `src/api/user.ts` | `GET /users/me` → `ApiResult<UserProfile>` (для страницы профиля) |
| `updateProfile(data)` (новый) | `src/api/user.ts` | `PATCH /users/me` → `ApiResult<UserProfile>` |
| `changePassword(data)` (новый) | `src/api/user.ts` | `PATCH /users/me/password` → `ApiResult<null>` |

> `UserContext` продолжает использовать `getUserInfo()` и тип `User`. На странице профиля используется `getMyProfile()` и тип `UserProfile`.

#### Feature: `src/features/profile/`

| Что | Путь | Описание |
|-----|------|----------|
| Service | `src/features/profile/services/profileService.ts` | Оборачивает `getMyProfile`, `updateProfile`, `changePassword` |
| Hook — личные данные | `src/features/profile/hooks/useProfileForm.ts` | Загрузка `UserProfile`, состояние формы, dirty-флаг, save, reset |
| Hook — смена пароля | `src/features/profile/hooks/usePasswordForm.ts` | Состояние полей пароля, индикатор силы, save, clear |
| Validators | `src/features/profile/validators/profile.ts` | Zod-схемы для `UpdateProfileIn` и `ChangePasswordIn` |
| UI — шапка | `src/features/profile/ui/ProfileHeader.tsx` | Блок 1: аватар-буква, ФИО, мета-строка (конюшня · @username · дата), теги ролей |
| UI — форма данных | `src/features/profile/ui/PersonalDataForm.tsx` | Блок 2: три поля, счётчик символов, кнопки сброс/сохранить |
| UI — смена пароля | `src/features/profile/ui/ChangePasswordForm.tsx` | Блок 3: 3 поля + глаз, индикатор силы пароля, кнопки |
| Index | `src/features/profile/index.ts` | Публичный экспорт |

#### Страница

| Что | Путь |
|-----|------|
| Страница профиля | `src/app/(protected)/profile/page.tsx` |

#### Изменения в layout

Файл: `src/app/(protected)/layout.tsx`

- Добавить `/profile` в `pageTitles` и `getActiveKey`
- Убрать пункт `logout` из массива `items`
- Создать нижнюю секцию сайдбара: тонкая линия + аватар-пункт «Профиль» + «Выйти»
- В свёрнутом состоянии: синий квадрат со скруглением и первой буквой `username`
- В развёрнутом состоянии: квадрат + «Фамилия И. О.» + `@username` под ним
- Данные для сайдбара берутся из `useUserContext()` (уже есть `user.first_name`, `user.username`)

---

## Access matrix

| Method | Path | Access class | Roles | Без auth | С валидной auth |
|--------|------|-------------|-------|----------|-----------------|
| GET | `/api/auth/me` | Protected (sensitive GET) | Любой авторизованный | 401 | 200 `UserOutDto` — **не изменяется** |
| GET | `/api/users/me` | Protected (sensitive GET) | Любой авторизованный | 401 | 200 `UserProfileDto` |
| PATCH | `/api/users/me` | Protected Write | Любой авторизованный | 401 | 200 `UserProfileDto` |
| PATCH | `/api/users/me/password` | Protected Write | Любой авторизованный | 401 | 204 |

**Исключения из дефолта:**

`GET /api/auth/me` (существующий) — защищённый GET. Причина: приватные данные авторизации; уже задокументировано.

`GET /api/users/me` (новый) — защищённый GET. Причина: персональные данные пользователя (ФИО, права доступа, название конюшни) недопустимы без авторизации. Статус без auth: `401`.

---

## Порядок выполнения

1. **Backend**: новые схемы → расширить `UserService` → обновить `get_user_service` → создать `src/api/users.py` → зарегистрировать роутер → unit-тесты → smoke-тесты
2. **Frontend**: типы → API-слой → validators → services → hooks → UI-компоненты → страница → обновить layout → тесты

---

## Backend test plan

### Unit-тесты: User Profile Management

> Файл: `tests/unit/core/services/test_user_profile_service.py`

| # | ID | Сценарий |
|---|----|---------|
| 1 | UT-01 | `get_my_profile` — equestrian exists → `UserProfileDto.equestrian_name` совпадает с `equestrian.name` |
| 2 | UT-02 | `get_my_profile` — equestrian не найден по `equestrian_id` → `equestrian_name = None` (graceful degradation) |
| 3 | UT-03 | `get_my_profile` — `equestrian_repository.get_by_id` вызван с `current_user.equestrian_id` |
| 4 | UT-04 | `get_my_profile` — scopes из `current_user` присутствуют в `UserProfileDto` |
| 5 | UT-05 | `get_my_profile` — equestrian_repository выбрасывает исключение → `equestrian_name = None` (сервис не падает) |
| 6 | UT-06 | `get_my_profile` — пользователь без scopes (`scopes=[]`) → пустой список в ответе |
| 7 | UT-07 | `get_my_profile` — все поля `UserProfileDto` корректно mapped из `current_user` |
| 8 | UT-08 | `get_my_profile` — `id`, `username`, `equestrian_id`, `created_at` совпадают с входным `current_user` |
| 9 | UT-09 | `update_my_profile` — valid data → `user_repo.get_by_id(current_user.id)` вызван |
| 10 | UT-10 | `update_my_profile` — valid data → `user_repo.update()` вызван с обновлённой сущностью |
| 11 | UT-11 | `update_my_profile` — only first_name → entity.first_name обновлена, остальные поля без изменений |
| 12 | UT-12 | `update_my_profile` — все поля None → допустимо, entity обновляется |
| 13 | UT-13 | `update_my_profile` — возвращает `UserProfileDto` с новыми значениями first/last/middle_name |
| 14 | UT-14 | `update_my_profile` — `equestrian_name` присутствует в возвращённом `UserProfileDto` |
| 15 | UT-15 | `update_my_profile` — поле `password` не изменяется |
| 16 | UT-16 | `update_my_profile` — поле `username` не изменяется |
| 17 | UT-17 | `update_my_profile` — `equestrian_id` не изменяется |
| 18 | UT-18 | `update_my_profile` — `user_repo.update()` вызван ровно один раз |
| 19 | UT-19 | `update_my_profile` — user не найден в БД (get_by_id → None) → ошибка, update не вызывается |
| 20 | UT-20 | `change_my_password` — valid flow: `verify_password` → `hash_password` → `update` вызваны в правильном порядке |
| 21 | UT-21 | `change_my_password` — неверный current_password → `verify_password` возвращает False → `InvalidCredentials` |
| 22 | UT-22 | `change_my_password` — `verify_password` выбрасывает → ошибка propagated |
| 23 | UT-23 | `change_my_password` — в `user_repo.update()` entity.password == `hash(new_password)`, не plaintext |
| 24 | UT-24 | `change_my_password` — `user_repo.update()` вызван ровно один раз при успехе |
| 25 | UT-25 | `change_my_password` — user не найден (get_by_id → None) → ошибка, update не вызывается |
| 26 | UT-26 | `change_my_password` — `security.hash_password` вызван с `new_password` |
| 27 | UT-27 | `change_my_password` — новый пароль == текущему → операция проходит (нет бизнес-запрета) |
| 28 | UT-28 | `change_my_password` — при успехе метод возвращает None (не UserProfile) |
| 29 | UT-29 | `UserProfileDto` — `equestrian_name = "Конюшня"` → поле присутствует в сериализованном JSON |
| 30 | UT-30 | `UserProfileDto` — `equestrian_name = None` → поле присутствует как null в JSON |
| 31 | UT-31 | `UpdateProfileIn` — first_name длиннее 63 символов → Pydantic `ValidationError` |
| 32 | UT-32 | `UpdateProfileIn` — all None → schema валидна (все поля optional) |
| 33 | UT-33 | `ChangePasswordIn` — `new_password` короче 8 символов → Pydantic `ValidationError` |
| 34 | UT-34 | `ChangePasswordIn` — `confirm_new_password != new_password` → Pydantic `ValidationError` (validator) |
| 35 | UT-35 | `ChangePasswordIn` — пустой `current_password` → Pydantic `ValidationError` |

### Smoke-тесты: User Profile Management

> Выполняются через скилл `.claude/skills/api-smoke-test` на живом API + реальной PostgreSQL.

| # | ID | Запрос | Ожидаемый результат |
|---|-----|--------|---------------------|
| 1 | SM-01 | `GET /api/auth/me` с валидным cookie | 200, контракт не изменился — нет `equestrian_name` |
| 2 | SM-02 | `GET /api/auth/me` без cookie | 401 (без изменений) |
| 3 | SM-03 | `GET /api/users/me` с валидным cookie | 200, `equestrian_name` совпадает с `equestrians.name` в PostgreSQL |
| 4 | SM-04 | `GET /api/users/me` без cookie | 401 |
| 5 | SM-05 | `GET /api/users/me` с истёкшим access_token | 401 |
| 6 | SM-06 | `GET /api/users/me` — поле `password` отсутствует в ответе | pass |
| 7 | SM-07 | `GET /api/users/me` — `scopes` соответствуют `user_scopes_relations` в PostgreSQL | pass |
| 8 | SM-08 | `GET /api/users/me` — `equestrian_id` совпадает с `users.equestrian_id` в PostgreSQL | pass |
| 9 | SM-09 | `GET /api/users/me` — `equestrian_name` совпадает с `equestrians.name` по `equestrian_id` | pass |
| 10 | SM-10 | `PATCH /api/users/me` без cookie | 401 |
| 11 | SM-11 | `PATCH /api/users/me` с `{"first_name":"Иван","last_name":"Иванов","middle_name":null}` | 200, `UserProfileDto` с новыми полями |
| 12 | SM-12 | Проверить PostgreSQL после SM-11: `users.first_name='Иван'`, `users.last_name='Иванов'`, `users.middle_name=null` | pass |
| 13 | SM-13 | `users.updated_at` изменился после PATCH | pass |
| 14 | SM-14 | `PATCH /api/users/me` — `username` не изменился | pass (via GET /users/me) |
| 15 | SM-15 | `PATCH /api/users/me` — `equestrian_id` не изменился | pass |
| 16 | SM-16 | `PATCH /api/users/me` с `{"first_name":null,"last_name":null,"middle_name":null}` | 200, все поля null |
| 17 | SM-17 | `PATCH /api/users/me` с `first_name` из 64 символов | 422, без записи в PostgreSQL |
| 18 | SM-18 | `PATCH /api/users/me` дважды с теми же данными (idempotent) | 200 оба раза, одинаковый результат |
| 19 | SM-19 | `PATCH /api/users/me` — response содержит `equestrian_name` | pass |
| 20 | SM-20 | `PATCH /api/users/me/password` без cookie | 401 |
| 21 | SM-21 | `PATCH /api/users/me/password` с неверным `current_password` | 400 |
| 22 | SM-22 | `PATCH /api/users/me/password` с верным `current_password` и новым валидным паролем | 204 |
| 23 | SM-23 | `POST /api/auth/login` с НОВЫМ паролем после SM-22 | 200 (OK) |
| 24 | SM-24 | `POST /api/auth/login` со СТАРЫМ паролем после SM-22 | 401 |
| 25 | SM-25 | `users.password` в PostgreSQL после SM-22 — не plaintext нового пароля | pass |
| 26 | SM-26 | `PATCH /api/users/me/password` с `new_password` < 8 символов | 422 |
| 27 | SM-27 | `PATCH /api/users/me/password` с `confirm_new_password != new_password` | 422 |
| 28 | SM-28 | `PATCH /api/users/me/password` с пустым телом | 422 |
| 29 | SM-29 | `PATCH /api/users/me/password` — response body не содержит поля `password` | pass |
| 30 | SM-30 | access_token остаётся валидным после смены пароля (`GET /users/me` → 200) | pass |
| 31 | SM-31 | `GET /api/users/me` — пользователь A видит только свои данные (не данные B) | pass |
| 32 | SM-32 | `PATCH /api/users/me` — пользователь A не изменяет данные пользователя B (endpoint обновляет только current_user) | pass |

### PostgreSQL для smoke-тестов

Контейнер найден через `docker inspect` по labels `com.docker.compose.project=eqsitecms` + `com.docker.compose.service=db`:

- Контейнер: `eqsitecms-db`
- `POSTGRES_DB`: `eqsitecms`
- `POSTGRES_USER`: `eqsitecms`
- `POSTGRES_PASSWORD`: `eqsitecms`
- Host port для `5432/tcp`: `5433`

> При прогоне smoke-тестов всегда сначала выполнять `docker inspect eqsitecms-db` для актуальных параметров.

---

## Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|------|---------------|----------------|-----------------|---------|
| `src/api/user.ts` | Добавлены `getMyProfile`, `updateProfile`, `changePassword` | 4 API-boundary: getMyProfile success (MSW), updateProfile success (MSW), changePassword success (MSW), 401 propagated | no live backend calls | `npm test` |
| `src/features/profile/services/profileService.ts` | Новый service-слой | 3 unit: getMyProfile success, updateProfile success, changePassword success | authenticated | `npm test` |
| `src/features/profile/hooks/useProfileForm.ts` | Загрузка `UserProfile` + форма личных данных | 3 unit: success load+save, reset to loaded values, backend error propagated | authenticated | `npm test` |
| `src/features/profile/hooks/usePasswordForm.ts` | Смена пароля | 3 unit: success change, wrong current_password (400), confirm mismatch validation error | authenticated | `npm test` |
| `src/features/profile/ui/ProfileHeader.tsx` | Шапка с `equestrian_name`, ФИО, тегами ролей | 3 component: full data render, no-ФИО fallback (username), correct role tag colors | authenticated | `npm test` |
| `src/features/profile/ui/PersonalDataForm.tsx` | Форма с dirty-state, счётчиком символов | 5 component: render data, dirty on change, reset clears dirty, save triggers callback, backend error shown | authenticated, 401 handled | `npm test` |
| `src/features/profile/ui/ChangePasswordForm.tsx` | Форма с индикатором силы пароля | 5 component: render empty, strength indicator updates, clear resets fields, save triggers callback, backend error shown | authenticated, 401 handled | `npm test` |
| `src/app/(protected)/profile/page.tsx` | Новая страница профиля | 1 API-boundary: authenticated render с MSW mock; anonymous → redirect to login | anonymous redirect, authenticated render | `npm test` |
| `src/app/(protected)/layout.tsx` | Сайдбар: нижний блок профиля, разделитель, активное состояние `/profile` | 3 component: profile item renders with user initial, active state on `/profile`, logout still works | authenticated | `npm test` |
| `src/types/api/user.ts` | Новый тип `UserProfile` с `equestrian_name` | TypeScript compile check | — | `npx tsc --noEmit` |

**MSW/mocks обязательны** для всех component/API-boundary тестов. Живые backend calls в unit/component тестах запрещены.

---

## Manual QA steps (UI тестирование)

### Предусловия

- Backend запущен
- Frontend запущен (`npm run dev` в `services/frontend`)
- Авторизованный пользователь с заполненными `first_name`, `last_name`, `middle_name` и привязанной конюшней
- Второй тест-пользователь без ФИО для edge-cases

---

### QA-1: Анонимный доступ к `/profile`

**URL:** `/profile`  
**Предусловие:** пользователь не авторизован (нет cookie)  
**Действие:** открыть `/profile`  
**Ожидаемый результат:** редирект на `/login`, страница профиля не отображается

---

### QA-2: Сайдбар — свёрнутое состояние

**URL:** `/dashboard` (авторизован)  
**Предусловие:** сайдбар свёрнут  
**Действие:** посмотреть нижнюю часть сайдбара  
**Ожидаемый результат:**
- Тонкая горизонтальная линия-разделитель над нижней секцией
- Синий квадрат со скруглением и белой буквой (первая буква username)
- Ниже — иконка «Выйти»
- Никакого overflow текста

---

### QA-3: Сайдбар — развёрнутое состояние

**URL:** `/dashboard` (авторизован)  
**Предусловие:** сайдбар развёрнут  
**Действие:** посмотреть нижнюю часть сайдбара  
**Ожидаемый результат:**
- Рядом с квадратом-аватаром: «Фамилия И. О.» (белый) + `@username` (серый, мелко) под ним
- Если ФИО не заполнено — только username
- Пункт «Профиль» подсвечивается активным, когда находимся на `/profile`

---

### QA-4: Навигация на страницу профиля

**URL:** `/dashboard`  
**Действие:** кликнуть на блок профиля в сайдбаре  
**Ожидаемый результат:**
- Переход на `/profile`
- Заголовок в хедере: «Профиль»
- Пункт «Профиль» в сайдбаре активен

---

### QA-5: Блок 1 — шапка профиля (с ФИО)

**URL:** `/profile` (пользователь с ФИО и конюшней)  
**Ожидаемый результат:**
- Большой квадрат с первой буквой username слева
- Справа: «Фамилия Имя Отчество» крупно
- Мета-строка: «[Название конюшни] · @username · Дата регистрации»
- Теги ролей: SUPERUSER — красный, ADMIN — фиолетовый, DEVELOPER — синий
- Разделительная линия под шапкой

---

### QA-6: Блок 1 — шапка без ФИО

**URL:** `/profile` (пользователь без ФИО)  
**Ожидаемый результат:** вместо «Фамилия Имя Отчество» — только username

---

### QA-7: Блок 2 — начальное состояние формы

**URL:** `/profile`  
**Ожидаемый результат:**
- Поля «Фамилия», «Имя», «Отчество» заполнены текущими значениями из `GET /users/me`
- Счётчик символов под каждым полем
- Кнопки «Сбросить» и «Сохранить изменения» неактивны (disabled)

---

### QA-8: Блок 2 — dirty state

**URL:** `/profile`  
**Действие:** изменить «Имя»  
**Ожидаемый результат:** кнопки «Сбросить» и «Сохранить изменения» стали активными

---

### QA-9: Блок 2 — сброс

**URL:** `/profile`  
**Действие:** изменить «Имя», нажать «Сбросить»  
**Ожидаемый результат:** поля вернулись к значениям из API, кнопки снова неактивны

---

### QA-10: Блок 2 — успешное сохранение

**URL:** `/profile`  
**Действие:** изменить «Фамилию» на «Тестов», нажать «Сохранить изменения»  
**Ожидаемый результат:**
- Зелёный тост «Изменения сохранены» в правом верхнем углу
- Кнопки снова неактивны
- Сайдбар обновился: отображает «Тестов» (если фронт вызывает `refreshUser()` или подтягивает из нового `UserProfile`)
- `GET /users/me` возвращает `last_name: "Тестов"`

---

### QA-11: Блок 2 — валидация длинного поля

**URL:** `/profile`  
**Действие:** ввести 64+ символов в «Фамилию», нажать «Сохранить»  
**Ожидаемый результат:**
- Счётчик символов красный, клиентская ошибка
- Запрос не отправляется или API возвращает 422
- Состояние формы сохранено после ошибки

---

### QA-12: Блок 3 — начальное состояние

**URL:** `/profile`  
**Ожидаемый результат:**
- Три поля пустые: «Текущий пароль», «Новый пароль», «Повторите новый пароль»
- Иконки глаза у каждого поля
- Индикатор силы пароля: четыре серые полоски, подпись нейтральная
- Кнопки «Очистить» и «Сменить пароль» доступны

---

### QA-13: Блок 3 — индикатор силы пароля

**URL:** `/profile`  
**Действие:** вводить разные пароли в «Новый пароль»  
**Ожидаемый результат:**
- 1–2 критерия: «Слабый» (красный)
- 3 критерия: «Средний» (жёлтый)
- 4 критерия: «Хороший» (зелёный)
- Все критерии: «Надёжный» (тёмно-зелёный)

---

### QA-14: Блок 3 — показ/скрытие пароля

**URL:** `/profile`  
**Действие:** ввести пароль, кликнуть иконку глаза  
**Ожидаемый результат:** тип поля переключается `password` ↔ `text`

---

### QA-15: Блок 3 — успешная смена пароля

**URL:** `/profile`  
**Действие:** верный текущий + валидный новый + подтверждение → «Сменить пароль»  
**Ожидаемый результат:**
- Зелёный тост «Пароль успешно изменён»
- Все три поля очищаются
- Вход с новым паролем через `/login` работает

---

### QA-16: Блок 3 — неверный текущий пароль

**URL:** `/profile`  
**Действие:** неверный текущий + валидный новый → «Сменить пароль»  
**Ожидаемый результат:**
- Ошибка «Неверный текущий пароль» в форме
- Поля сохраняют введённые значения (не очищаются)

---

### QA-17: Блок 3 — несовпадение confirm

**URL:** `/profile`  
**Действие:** new ≠ confirm → «Сменить пароль»  
**Ожидаемый результат:**
- Клиентская валидация блокирует отправку
- Поле «Повторите» показывает ошибку

---

### QA-18: Responsive — desktop (1440px)

**URL:** `/profile`  
**Ожидаемый результат:**
- Три поля ФИО в один ряд
- Кнопки выровнены вправо внутри карточки
- Нет overlap элементов

---

### QA-19: Responsive — tablet (768px)

**URL:** `/profile`  
**Ожидаемый результат:** нет overflow, поля и кнопки читаемы, сайдбар работает корректно

---

### QA-20: Responsive — mobile (375px)

**URL:** `/profile`  
**Ожидаемый результат:** нет горизонтального скролла, все кнопки доступны без overlap

---

### QA-21: Выход из системы

**URL:** любая protected страница  
**Действие:** нажать «Выйти» в нижней секции сайдбара  
**Ожидаемый результат:**
- Редирект на `/login`
- Повторное открытие `/profile` → редирект на `/login`

---

### Итоговый QA-отчёт

Выполнить QA-1 — QA-21. Зафиксировать:
- **passed/failed** для каждого шага
- Screenshot для failed responsive/error/permission cases
- Network status + response body для failed API cases

---

## Чеклист

> Агент меняет `[ ]` → `[x]` после выполнения каждого пункта.

### Backend

- [ ] Добавить `UserProfileDto` в `src/core/schemas/users.py` (`UserOutDto` + `equestrian_name: str | None = None`)
- [ ] Добавить `UpdateProfileIn` схему в `src/core/schemas/users.py`
- [ ] Добавить `ChangePasswordIn` схему в `src/core/schemas/users.py` (с validator совпадения confirm)
- [ ] Расширить `UserService.__init__` в `src/core/services/users.py`: добавить `equestrian_repository` и `security`
- [ ] Реализовать `UserService.get_my_profile(current_user)` → `UserProfileDto`
- [ ] Реализовать `UserService.update_my_profile(current_user, data)` → `UserProfileDto`
- [ ] Реализовать `UserService.change_my_password(current_user, data)` → `None`
- [ ] Обновить `get_user_service` в `src/depends/services.py`: инжектировать `equestrian_repository` и `security`
- [ ] Создать `src/api/users.py` с `users_router`: `GET /me`, `PATCH /me`, `PATCH /me/password`
- [ ] Экспортировать `users_router` из `src/api/__init__.py`
- [ ] Зарегистрировать `users_router` в `src/main.py` с prefix `/users`, tags `["Users"]`
- [ ] Заполнить Access matrix: `GET /users/me` — Protected sensitive GET, причина задокументирована
- [ ] Убедиться, что `GET /auth/me` и `UserOutDto` не изменились (нет `equestrian_name`)
- [ ] Найти PostgreSQL контейнер по labels `com.docker.compose.project=eqsitecms` + `com.docker.compose.service=db`, fallback `eqsitecms-db`, параметры через `docker inspect`
- [ ] Unit: UT-01 — `get_my_profile` equestrian exists → equestrian_name совпадает
- [ ] Unit: UT-02 — `get_my_profile` equestrian не найден → equestrian_name = None
- [ ] Unit: UT-03 — `equestrian_repository.get_by_id` вызван с `current_user.equestrian_id`
- [ ] Unit: UT-04 — scopes из current_user присутствуют в UserProfileDto
- [ ] Unit: UT-05 — equestrian_repository exception → equestrian_name = None (graceful)
- [ ] Unit: UT-06 — пользователь без scopes → пустой список
- [ ] Unit: UT-07 — все поля UserProfileDto корректно mapped
- [ ] Unit: UT-08 — id, username, equestrian_id, created_at совпадают с current_user
- [ ] Unit: UT-09 — `update_my_profile` valid → `get_by_id` вызван
- [ ] Unit: UT-10 — `update_my_profile` valid → `update()` вызван с обновлённой сущностью
- [ ] Unit: UT-11 — `update_my_profile` только first_name → остальные поля без изменений
- [ ] Unit: UT-12 — `update_my_profile` все поля None → допустимо
- [ ] Unit: UT-13 — `update_my_profile` возвращает UserProfileDto с новыми значениями
- [ ] Unit: UT-14 — `update_my_profile` UserProfileDto содержит equestrian_name
- [ ] Unit: UT-15 — `update_my_profile` не изменяет password
- [ ] Unit: UT-16 — `update_my_profile` не изменяет username
- [ ] Unit: UT-17 — `update_my_profile` не изменяет equestrian_id
- [ ] Unit: UT-18 — `update_my_profile` вызывает `update()` ровно один раз
- [ ] Unit: UT-19 — `update_my_profile` user не найден → ошибка, update не вызывается
- [ ] Unit: UT-20 — `change_my_password` valid flow: verify → hash → update в порядке
- [ ] Unit: UT-21 — `change_my_password` неверный current_password → InvalidCredentials
- [ ] Unit: UT-22 — `change_my_password` verify выбрасывает → ошибка propagated
- [ ] Unit: UT-23 — `change_my_password` entity.password == hash(new_password), не plaintext
- [ ] Unit: UT-24 — `change_my_password` `update()` вызван ровно один раз
- [ ] Unit: UT-25 — `change_my_password` user не найден → ошибка, update не вызывается
- [ ] Unit: UT-26 — `change_my_password` `hash_password` вызван с new_password
- [ ] Unit: UT-27 — `change_my_password` new == current → операция проходит
- [ ] Unit: UT-28 — `change_my_password` при успехе возвращает None
- [ ] Unit: UT-29 — `UserProfileDto` equestrian_name в сериализованном JSON
- [ ] Unit: UT-30 — `UserProfileDto` equestrian_name = None → null в JSON
- [ ] Unit: UT-31 — `UpdateProfileIn` first_name > 63 символов → ValidationError
- [ ] Unit: UT-32 — `UpdateProfileIn` all None → schema валидна
- [ ] Unit: UT-33 — `ChangePasswordIn` new_password < 8 символов → ValidationError
- [ ] Unit: UT-34 — `ChangePasswordIn` confirm != new → ValidationError
- [ ] Unit: UT-35 — `ChangePasswordIn` пустой current_password → ValidationError
- [ ] Smoke: SM-01 — GET /auth/me с валидным cookie → 200, нет поля equestrian_name (контракт не изменился)
- [ ] Smoke: SM-02 — GET /auth/me без cookie → 401
- [ ] Smoke: SM-03 — GET /users/me с валидным cookie → 200, equestrian_name совпадает с PostgreSQL
- [ ] Smoke: SM-04 — GET /users/me без cookie → 401
- [ ] Smoke: SM-05 — GET /users/me с истёкшим token → 401
- [ ] Smoke: SM-06 — GET /users/me — поле password отсутствует
- [ ] Smoke: SM-07 — GET /users/me — scopes соответствуют user_scopes_relations в PostgreSQL
- [ ] Smoke: SM-08 — GET /users/me — equestrian_id совпадает с PostgreSQL
- [ ] Smoke: SM-09 — GET /users/me — equestrian_name совпадает с equestrians.name
- [ ] Smoke: SM-10 — PATCH /users/me без cookie → 401
- [ ] Smoke: SM-11 — PATCH /users/me с валидными данными → 200 с обновлёнными полями
- [ ] Smoke: SM-12 — PostgreSQL после SM-11: first_name/last_name/middle_name обновлены
- [ ] Smoke: SM-13 — users.updated_at изменился после PATCH
- [ ] Smoke: SM-14 — username не изменился после PATCH профиля
- [ ] Smoke: SM-15 — equestrian_id не изменился после PATCH профиля
- [ ] Smoke: SM-16 — PATCH /users/me все поля null → 200, null в PostgreSQL
- [ ] Smoke: SM-17 — PATCH /users/me first_name 64 символа → 422, без записи в PostgreSQL
- [ ] Smoke: SM-18 — PATCH /users/me idempotent: два запроса → одинаковый результат
- [ ] Smoke: SM-19 — PATCH /users/me response содержит equestrian_name
- [ ] Smoke: SM-20 — PATCH /users/me/password без cookie → 401
- [ ] Smoke: SM-21 — PATCH /users/me/password неверный current_password → 400
- [ ] Smoke: SM-22 — PATCH /users/me/password верный пароль → 204
- [ ] Smoke: SM-23 — POST /auth/login с НОВЫМ паролем после SM-22 → 200
- [ ] Smoke: SM-24 — POST /auth/login со СТАРЫМ паролем после SM-22 → 401
- [ ] Smoke: SM-25 — users.password в PostgreSQL после SM-22 не plaintext
- [ ] Smoke: SM-26 — PATCH /users/me/password new_password < 8 символов → 422
- [ ] Smoke: SM-27 — PATCH /users/me/password confirm != new → 422
- [ ] Smoke: SM-28 — PATCH /users/me/password пустое тело → 422
- [ ] Smoke: SM-29 — PATCH /users/me/password response не содержит поля password
- [ ] Smoke: SM-30 — access_token остаётся валидным после смены пароля (GET /users/me → 200)
- [ ] Smoke: SM-31 — пользователь A видит только свои данные (GET /users/me)
- [ ] Smoke: SM-32 — пользователь A не изменяет данные B (PATCH /users/me обновляет только current_user)

### Frontend

- [ ] Добавить тип `UserProfile` (= `User` + `equestrian_name: string | null`) в `src/types/api/user.ts`
- [ ] Добавить `UpdateProfileIn` и `ChangePasswordIn` типы в `src/types/api/user.ts`
- [ ] Реализовать `getMyProfile()` → `GET /users/me` в `src/api/user.ts`
- [ ] Реализовать `updateProfile(data)` → `PATCH /users/me` в `src/api/user.ts`
- [ ] Реализовать `changePassword(data)` → `PATCH /users/me/password` в `src/api/user.ts`
- [ ] Убедиться, что `getUserInfo()` и тип `User` не изменились
- [ ] Создать `src/features/profile/services/profileService.ts`
- [ ] Создать Zod-валидаторы `src/features/profile/validators/profile.ts`
- [ ] Создать `useProfileForm` хук (`src/features/profile/hooks/useProfileForm.ts`)
- [ ] Создать `usePasswordForm` хук с индикатором силы пароля (`src/features/profile/hooks/usePasswordForm.ts`)
- [ ] Реализовать `ProfileHeader.tsx` (аватар-буква, ФИО/username, equestrian_name, теги ролей)
- [ ] Реализовать `PersonalDataForm.tsx` (3 поля, счётчик символов, dirty-state, кнопки)
- [ ] Реализовать `ChangePasswordForm.tsx` (3 поля + глаз, индикатор силы, кнопки)
- [ ] Создать страницу `/profile` (`src/app/(protected)/profile/page.tsx`)
- [ ] Обновить `pageTitles` и `getActiveKey` в layout для `/profile`
- [ ] Обновить сайдбар: разделитель + нижняя секция «Профиль» + «Выйти»
- [ ] Создать `src/features/profile/index.ts` (публичный экспорт)
- [ ] Реализовать дизайн согласно референсу (design file из задачи)
- [ ] Тест: `getMyProfile` API-boundary с MSW mock (success)
- [ ] Тест: `updateProfile` API-boundary с MSW mock (success)
- [ ] Тест: `changePassword` API-boundary с MSW mock (success)
- [ ] Тест: 401 propagated в API-boundary тестах
- [ ] Тест: `profileService` — getMyProfile success
- [ ] Тест: `profileService` — updateProfile success
- [ ] Тест: `profileService` — changePassword success
- [ ] Тест: `useProfileForm` — success load+save, dirty сбрасывается
- [ ] Тест: `useProfileForm` — reset возвращает к загруженным значениям
- [ ] Тест: `useProfileForm` — backend error propagated
- [ ] Тест: `usePasswordForm` — success change, поля очищаются
- [ ] Тест: `usePasswordForm` — wrong current_password (400) → error state
- [ ] Тест: `usePasswordForm` — confirm mismatch → validation error, запрос не отправляется
- [ ] Тест: `ProfileHeader` — render full data (ФИО, конюшня, теги)
- [ ] Тест: `ProfileHeader` — no-ФИО fallback (username)
- [ ] Тест: `ProfileHeader` — role tag colors (SUPERUSER красный, ADMIN фиолетовый, DEVELOPER синий)
- [ ] Тест: `PersonalDataForm` — render data
- [ ] Тест: `PersonalDataForm` — dirty state on change
- [ ] Тест: `PersonalDataForm` — reset clears dirty
- [ ] Тест: `PersonalDataForm` — save triggers callback
- [ ] Тест: `PersonalDataForm` — backend error shown, форма сохраняет состояние
- [ ] Тест: `ChangePasswordForm` — render empty
- [ ] Тест: `ChangePasswordForm` — strength indicator updates
- [ ] Тест: `ChangePasswordForm` — clear resets fields
- [ ] Тест: `ChangePasswordForm` — save triggers callback
- [ ] Тест: `ChangePasswordForm` — backend error shown
- [ ] Тест: `/profile` page — authenticated render с MSW mock
- [ ] Тест: `/profile` page — anonymous → redirect to login
- [ ] Тест: layout — profile item renders с user initial
- [ ] Тест: layout — active state на `/profile`
- [ ] Тест: layout — logout работает корректно
- [ ] no `site-*` mixing: `rg -n "site-ad|site-\*" services/frontend/src/features/profile -g '*.{ts,tsx}'` → 0
- [ ] TypeScript check: `npx tsc --noEmit` — 0 ошибок

### Quality Gate

- [ ] Проверить, что `GET /auth/me` и `UserOutDto` не изменились — нет `equestrian_name`
- [ ] Проверить Access matrix: `GET /users/me` — Protected sensitive GET с причиной
- [ ] Проверить, что нет случайного открытия `/users/me*` без авторизации
- [ ] Проверить Clean Architecture backend: бизнес-логика в `UserService`, не в роутере
- [ ] Проверить, что поле `password` отсутствует во всех response schema
- [ ] Проверить наличие минимум 35 Unit checklist-пунктов для backend (UT-01…UT-35)
- [ ] Проверить наличие минимум 32 Smoke checklist-пунктов (SM-01…SM-32)
- [ ] Проверить, что smoke-тесты берут параметры PostgreSQL из `docker inspect`, без хардкода
- [ ] `make test` проходит (backend unit-тесты)
- [ ] Frontend: `npm test` — 0 failed
- [ ] Frontend: `npm run lint` — 0 errors
- [ ] Frontend: `npx tsc --noEmit` — 0 ошибок
- [ ] Frontend: `npm run build` — успешная сборка
- [ ] MSW/no live backend calls: unit/component/API-boundary тесты не делают запросы к реальному backend
- [ ] no `site-*` mixing: `rg -n "site-ad|site-\*|Public Read|public read" services/frontend/src/features/profile -g '*.{ts,tsx}'` → 0
- [ ] Manual QA steps QA-1 — QA-21 пройдены, результат зафиксирован
- [ ] Responsive проверен на 1440px, 768px, 375px
