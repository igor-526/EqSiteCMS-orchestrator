# План: корневая сущность Equestrian и tenant-фильтрация данных

**Тикет:** FEATURE-equestrian-entity
**Дата:** 2026-05-07
**Затронутые сервисы:** `services/backend`, `services/frontend`, `services/site-ad`
**Ветка:** `feature/equestrian-entity`

---

## Контекст

Сейчас `services/backend` обслуживает данные как один общий контур одной конюшни. Таблицы `breeds`, `coat_color`, `horse_owner`, `horse_service`, `horse`, `photos`, `prices`, `price_groups`, `site_settings` и `users` не имеют связи с конюшней. Из-за этого один экземпляр CMS/backend нельзя безопасно использовать для нескольких конюшен: публичные `GET` смешивают контент, CMS write-операции не получают tenant-контекст из пользователя, а `site-ad` не передает признак нужной конюшни.

Текущий Alembic head: `47d6367ed482`. Новая миграция должна идти от него, создать базовую конюшню, добавить связи и привязать все существующие строки к базовой конюшне без падения на непустой базе.

По текущему коду также есть access-долг: часть `POST/PATCH/DELETE` endpoint'ов не использует обязательную auth dependency, а `GET /api/horses` и связанные horse GET уже требуют `get_current_user`, что противоречит default policy `GET = Public Read`. Фича должна исправить это в рамках единого tenant-контракта.

## Цель

После реализации один backend/frontend CMS технически поддерживает несколько конюшен через корневую сущность `Equestrian`, но MVP не включает управление конюшнями из CMS.

Критерии приемки:

- Все tenant-scoped сущности связаны с `equestrian_id`.
- Существующие данные после миграции привязаны к базовой конюшне.
- Пользователь привязан ровно к одной конюшне через `users.equestrian_id`.
- CMS-запросы определяют конюшню только по аутентифицированному `user.equestrian_id`.
- В CMS нет выбора, переключения или администрирования других конюшен.
- Управление самими конюшнями на первом этапе выполняется только прямыми операциями в БД.
- Public/site-запросы `GET` без авторизации определяют конюшню по header `X-Equestrian-Service-Key`.
- Public `GET` не возвращает данные другой конюшни после симуляции второй конюшни.
- `POST/PATCH/DELETE` требуют авторизацию и работают только в рамках `equestrian_id` пользователя.
- `site-ad` передает service key во все public read API-запросы и остается SSR-first для индексируемого контента.

### Scope MVP

В MVP `Equestrian` создается только как модель БД, миграционный root tenant и фильтр данных. Пользователь имеет одну обязательную привязку к одной конюшне через `users.equestrian_id`.

Не входят в MVP:

- CMS UI для списка, создания, редактирования или удаления конюшен.
- Backend API `/api/equestrians*` для управления конюшнями.
- Переключатель конюшни в CMS.
- Администрирование пользователем других конюшен, даже при роли admin.
- Передача `equestrian_id` из CMS forms/body/query как способ выбора tenant.

До отдельного согласованного плана конюшни, service keys и привязки пользователей к конюшням управляются только прямыми операциями в PostgreSQL.

---

## Детали реализации

### Backend

#### Новые сущности и файлы

| Что | Путь | Описание |
|---|---|---|
| SQLAlchemy table | `services/backend/src/models/equestrian.py` | Таблица `equestrians`: `id`, timestamps, `name VARCHAR(127) NOT NULL`, `service_key VARCHAR(127) NOT NULL UNIQUE` |
| Entity | `services/backend/src/core/entities/equestrian.py` | `Equestrian` с `name`, `service_key`, timestamp mixin |
| DTO | `services/backend/src/core/schemas/equestrian.py` | Только внутренний/read DTO при необходимости для tenant resolution; `Create/Update` DTO для API в MVP не создавать |
| Protocol | `services/backend/src/core/protocols/repositories/equestrian_repository.py` | `get_by_service_key`, `get_by_id`; без CRUD API-контракта управления конюшнями |
| Repository | `services/backend/src/repositories/equestrian_repository.py` | Реализация поиска tenant по service key |
| Tenant context | `services/backend/src/core/entities/equestrian_context.py` или `services/backend/src/core/schemas/equestrian_context.py` | Узкая модель `EquestrianContext(id, source)` для передачи в сервисы |
| DI repositories | `services/backend/src/depends/repositories.py` | `get_equestrian_repository` |
| DI services/context | `services/backend/src/depends/services.py` или новый `services/backend/src/depends/equestrian.py` | `get_optional_current_user`, `get_public_equestrian_context`, `get_protected_equestrian_context`, `get_read_equestrian_context` |
| Migration | `services/backend/src/migration/versions/<new_revision>_add_equestrian_entity.py` | Down revision строго `47d6367ed482` |
| Tests | `services/backend/tests/unit/...`, `services/backend/tests/smoke/...` | Unit и smoke по спискам ниже |

В MVP запрещено добавлять `services/backend/src/api/equestrian.py` и любые endpoint'ы `/api/equestrians*`. Создание второй конюшни для smoke выполняется test setup прямыми SQL/DB операциями на реальной PostgreSQL.

#### Схема БД и миграция

Новая таблица:

```sql
CREATE TABLE equestrians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NULL,
    name VARCHAR(127) NOT NULL,
    service_key VARCHAR(127) NOT NULL UNIQUE
);
```

Tenant columns:

| Таблица | Изменение | Ограничения |
|---|---|---|
| `users` | добавить `equestrian_id UUID` | FK `equestrians.id`, сначала nullable, backfill, затем `NOT NULL`; `username` оставить globally unique для текущего login-by-username |
| `breeds` | добавить `equestrian_id UUID NOT NULL` | FK; заменить `UNIQUE(name)` на composite unique `(equestrian_id, name)`; добавить unique/index `(equestrian_id, slug)` |
| `coat_color` | добавить `equestrian_id UUID NOT NULL` | FK; заменить `UNIQUE(name)` на `(equestrian_id, name)`; добавить unique/index `(equestrian_id, slug)` |
| `horse_owner` | добавить `equestrian_id UUID NOT NULL` | FK; индексы на `(equestrian_id, name)`, `(equestrian_id, type)` |
| `horse_service` | добавить `equestrian_id UUID NOT NULL` | FK; заменить `UNIQUE(name)` на `(equestrian_id, name)`; добавить unique/index `(equestrian_id, slug)` |
| `horse` | добавить `equestrian_id UUID NOT NULL` | FK; добавить unique/index `(equestrian_id, slug)`, индексы для фильтров; validate FK-ссылки на same equestrian в service layer |
| `photos` | добавить `equestrian_id UUID NOT NULL` | FK; индекс `(equestrian_id, name)` |
| `prices` | добавить `equestrian_id UUID NOT NULL` | FK; добавить unique/index `(equestrian_id, slug)`, индекс `(equestrian_id, name)` |
| `price_groups` | добавить `equestrian_id UUID NOT NULL` | FK; индекс `(equestrian_id, name)` |
| `site_settings` | добавить `equestrian_id UUID NOT NULL` | FK; заменить unique `key` и `name` на `(equestrian_id, key)` и `(equestrian_id, name)` |

Связующие таблицы `horse_children`, `horse_photos`, `horse_service_relations`, `price_groups_relations`, `price_photos`, `user_scopes_relations` не получают собственный `equestrian_id`, но сервисы и репозитории обязаны проверять, что обе стороны связи относятся к той же конюшне. Для smoke-тестов добавить сценарии, где попытка связать сущности из разных конюшен возвращает `403` или `400` по выбранному контракту; предпочтительно `403` для чужого tenant resource и `400` для неконсистентного payload внутри tenant.

Порядок миграции:

1. Создать `equestrians`.
2. Вставить базовую конюшню с детерминированным `service_key`, например `default-equestrian`, только если ее нет. Значение должно быть явно описано в migration notes и пригодно для локального smoke; это не секрет.
3. Добавить `equestrian_id` nullable во все tenant-scoped таблицы.
4. Backfill всех существующих строк на id базовой конюшни.
5. Удалить старые single-column unique constraints, которые конфликтуют с multi-tenant моделью.
6. Добавить composite unique/index constraints.
7. Сделать `equestrian_id` `NOT NULL`.
8. Добавить downgrade, который удаляет composite constraints/columns/table только после отката зависимых constraints; downgrade может быть destructive для multi-tenant данных, это нужно явно отметить в migration docstring.

#### Tenant resolution

Header public read:

```http
X-Equestrian-Service-Key: <non-secret-service-key>
```

Правила:

- Для public `GET`: если нет auth cookie, требуется валидный `X-Equestrian-Service-Key`; без header вернуть `400`, с неизвестным key вернуть `404` или `400` по единому контракту. Предпочтительно `404`, чтобы не раскрывать наличие tenant по другим ресурсам.
- Для CMS authenticated `GET/POST/PATCH/DELETE`: tenant берется только из `current_user.equestrian_id`; header игнорируется, чтобы пользователь не мог переключиться в чужую конюшню.
- Пользователь имеет ровно одну активную привязку к одной конюшне. Модель many-to-many users/equestrians, переключатель tenant и администрирование других конюшен не входят в MVP.
- Для `POST/PATCH/DELETE`: обязательна auth dependency, сервисы не принимают `equestrian_id` из body.
- Для auth endpoints: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` остаются исключениями из default write policy. `POST /auth/register` в MVP не должен становиться способом управления конюшнями: если endpoint сохраняется публичным, новый пользователь привязывается к базовой конюшне или регистрация отключается/ограничивается отдельным решением Backend-агента с явным тестом; создание пользователей для других конюшен на первом этапе выполняется прямыми DB operations.
- `GET /auth/me` остается защищенным GET-исключением, так как возвращает профиль пользователя и его scopes.

#### Изменения сервисов и репозиториев

| Модуль | Изменение |
|---|---|
| `core.schemas.users.UserOutDto` и `core.entities.user.User` | Добавить `equestrian_id`; frontend types тоже обновить |
| `core.services.auth.AuthService` | Возвращать пользователя с `equestrian_id`; login остается по globally unique `username` |
| Все tenant-scoped services | Добавить обязательный `equestrian_context`/`equestrian_id` аргумент во все read/write use cases |
| Все tenant-scoped repositories | Добавить фильтрацию `WHERE table.equestrian_id = :equestrian_id`; `get_by_id`, `get_by_slug`, `find_by_name` для tenant-scoped таблиц не использовать без tenant |
| `HorseRepository` | Все joins на breed/coat_color/owner/photos/services фильтровать по tenant; pedigree/children не должен пересекать tenant |
| `PriceRepository` | Фильтровать `prices`, `price_groups`, `price_photos`; запретить привязку photos из чужой конюшни |
| `PhotoService` | Создавать media row в tenant пользователя; файл физически может оставаться в общем storage, но DB row tenant-scoped |
| `SiteSettingsService` | Все key/name уникальны внутри tenant; public site получает только настройки по service key |
| `api/*.py` | `GET` routes используют read tenant dependency; `POST/PATCH/DELETE` используют protected tenant dependency и current user |
| `main.py` | Проверить exception handlers: отсутствие auth = `401`, отсутствие public service key = `400`, unknown tenant key = `404`/`400`, чужой tenant = `403` |

#### API контракт

Новые endpoint'ы управления конюшнями в MVP не создаются. `Equestrian` используется только как DB model, tenant root и источник фильтрации:

- public read получает tenant через `X-Equestrian-Service-Key`;
- CMS read/write получает tenant через authenticated `user.equestrian_id`;
- создание/изменение `equestrians`, service keys и привязок пользователей к конюшням выполняется прямыми DB operations до отдельного согласованного плана управления конюшнями.

Existing public read example:

```http
GET /api/horses?limit=10
X-Equestrian-Service-Key: default-equestrian
Response 200: {"items": [...only this equestrian...], "total": 10}
```

Existing protected write example:

```http
POST /api/horses
Cookie: access_token=...
Body: {"name": "..."}
Response: created horse with implicit equestrian_id from user
```

#### Access matrix

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/health` | public | any | `200` без header/auth | `200` |
| POST | `/api/auth/login` | public exception | any | `200` valid credentials, `400/401` invalid | same |
| POST | `/api/auth/refresh` | public exception via refresh cookie | any | `401` without refresh cookie | `200` with valid refresh cookie |
| POST | `/api/auth/logout` | public exception | any | `204`, clears absent cookies idempotently | `204` |
| POST | `/api/auth/register` | public exception or deferred/disabled registration | any | if enabled: `200/400` and binds to base equestrian; if disabled: documented status | same |
| GET | `/api/auth/me` | protected GET exception | authenticated user | `401` | `200`, returns user with `equestrian_id` |
| GET | `/api/horses/breeds` | public read with service key | any | `200` with valid `X-Equestrian-Service-Key`; `400/404` without/invalid key | `200` tenant from user, header ignored |
| GET | `/api/horses/breeds/{slug_or_id}` | public read with service key | any | `200/404` with valid key | `200/404` tenant from user |
| POST | `/api/horses/breeds` | protected write | authenticated CMS user | `401` | `200`, creates in user tenant |
| PATCH | `/api/horses/breeds/{slug_or_id}` | protected write | authenticated CMS user | `401` | `200`, `403/404` for foreign tenant |
| DELETE | `/api/horses/breeds/{slug_or_id}` | protected write | authenticated CMS user | `401` | `204`, `403/404` for foreign tenant |
| GET | `/api/horses/coat_colors` | public read with service key | any | `200` with valid key; `400/404` without/invalid key | `200` tenant from user |
| GET | `/api/horses/coat_colors/{slug_or_id}` | public read with service key | any | `200/404` with valid key | `200/404` tenant from user |
| POST/PATCH/DELETE | `/api/horses/coat_colors...` | protected write | authenticated CMS user | `401` | success in user tenant, foreign tenant blocked |
| GET | `/api/horses/owners` | public read with service key | any | `200` with valid key; `400/404` without/invalid key | `200` tenant from user |
| GET | `/api/horses/owners/{id}` | public read with service key | any | `200/404` with valid key | `200/404` tenant from user |
| POST/PATCH/DELETE | `/api/horses/owners...` | protected write | authenticated CMS user | `401` | success in user tenant, foreign tenant blocked |
| GET | `/api/horses/services` | public read with service key | any | `200` with valid key; `400/404` without/invalid key | `200` tenant from user |
| GET | `/api/horses/services/{slug_or_id}` | public read with service key | any | `200/404` with valid key | `200/404` tenant from user |
| POST/PATCH/DELETE | `/api/horses/services...` | protected write | authenticated CMS user | `401` | success in user tenant, foreign tenant blocked |
| GET | `/api/horses` | public read with service key | any | `200` with valid key; `400/404` without/invalid key | `200` tenant from user |
| GET | `/api/horses/{slug_or_id}` | public read with service key | any | `200/404` with valid key | `200/404` tenant from user |
| GET | `/api/horses/{horse_id}/pedigree/{mode}` | public read with service key | any | `200/404` with valid key | `200/404` tenant from user |
| POST | `/api/horses` | protected write | authenticated CMS user | `401` | `200`, validates related ids in same tenant |
| PATCH | `/api/horses/{horse_id}` | protected write | authenticated CMS user | `401` | `200`, foreign tenant blocked |
| DELETE | `/api/horses/{horse_id}` | protected write | authenticated CMS user | `401` | `204`, foreign tenant blocked |
| POST | `/api/horses/{horse_id}/pedigree` | protected write | authenticated CMS user | `401` | `204`, cross-tenant pedigree blocked |
| GET | `/api/photos` | public read with service key | any | `200` with valid key; `400/404` without/invalid key | `200` tenant from user |
| GET | `/api/photos/{id}` | public read with service key | any | `200/404` with valid key | `200/404` tenant from user |
| POST/PATCH/DELETE | `/api/photos...` | protected write | authenticated CMS user | `401` | success in user tenant, foreign tenant blocked |
| POST | `/api/photos/batch-delete` | protected write | authenticated CMS user | `401` | `204`, only user tenant ids deleted |
| GET | `/api/prices/groups` | public read with service key | any | `200` with valid key; `400/404` without/invalid key | `200` tenant from user |
| GET | `/api/prices/groups/{id}` | public read with service key | any | `200/404` with valid key | `200/404` tenant from user |
| POST/PATCH/DELETE | `/api/prices/groups...` | protected write | authenticated CMS user | `401` | success in user tenant, foreign tenant blocked |
| GET | `/api/prices` | public read with service key | any | `200` with valid key; `400/404` without/invalid key | `200` tenant from user |
| GET | `/api/prices/{slug_or_id}` | public read with service key | any | `200/404` with valid key | `200/404` tenant from user |
| POST/PATCH/DELETE | `/api/prices...` | protected write | authenticated CMS user | `401` | success in user tenant, foreign tenant blocked |
| POST | `/api/prices/{slug_or_id}/photos` | protected write | authenticated CMS user | `401` | `204`, cross-tenant photos blocked |
| GET | `/api/site_settings` | public read with service key; `full=true` may be protected if considered CMS-only | any | `200` simple public settings with valid key; if `full=true` protected then `401` | `200` tenant from user |
| GET | `/api/site_settings/{id}` | public read with service key or protected if full metadata is sensitive | any | `200/404` with valid key if public; otherwise `401` | `200/404` tenant from user |
| POST/PATCH/DELETE | `/api/site_settings...` | protected write | authenticated CMS user | `401` | success in user tenant, foreign tenant blocked |

Исключения из default policy:

- Auth write endpoints публичны, потому что они обслуживают вход/обновление/выход.
- `GET /api/auth/me` защищен, потому что возвращает приватный профиль пользователя.
- Endpoint'ов `/api/equestrians*` в MVP нет; управление tenant'ами отложено и выполняется напрямую в БД.
- Возможное исключение `GET /api/site_settings?full=true` как protected GET нужно подтвердить Backend-агенту: full-ответ содержит developer/admin descriptions; если оставлять public, smoke обязан доказать отсутствие чувствительных данных.

### Frontend CMS

| Что | Путь | Описание |
|---|---|---|
| User type | `services/frontend/src/types/api/user.ts` | Добавить `equestrian_id` в `User` |
| User context | `services/frontend/src/contexts/UserContext.tsx` | Хранить пользователя с `equestrian_id`; не добавлять selector/switcher конюшни |
| Existing API calls | `services/frontend/src/api/*` | Не передавать service key из CMS; rely on auth cookies |

Frontend flow: CMS использует только protected контур для writes. `GET` из CMS идет с cookies и получает tenant из пользователя; header service key не нужен и не должен использоваться как selector в CMS. Экраны, API-клиент и типы для CRUD конюшен не создаются в MVP.

### Site Consumer: `services/site-ad`

| Что | Путь | Описание |
|---|---|---|
| Config | `services/site-ad/.env.example`, deployment env | Добавить `EQUESTRIAN_SERVICE_KEY` и при необходимости `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY`; ключ не секретный, но серверный env предпочтителен для SSR |
| API client | `services/site-ad/src/api/client.ts` | Добавлять `X-Equestrian-Service-Key` ко всем backend `GET`; не затирать caller headers |
| API calls | `services/site-ad/src/api/horse.ts`, `price.ts`, `priceGroups.ts`, `siteSettings.ts`, `horseBreeds.ts`, `horseCoatColor.ts`, `horseOwners.ts`, `horseServices.ts` | Проверить, что public read requests идут через общий client и получают header |
| Sitemap | `services/site-ad/src/app/sitemap.ts` | Убедиться, что server-side `priceList` получает header через client |
| Site settings provider | `services/site-ad/src/features/siteSettings/...` | SSR/initial fetch должен получать settings только нужной конюшни |
| Tests/checks | targeted tests или code review | Проверить, что ключевой контент остается SSR/metadata-compatible |

`site-ad` не должен использовать protected CMS-only endpoints. Public write `callBackRequest`, если будет подключен к backend позже, должен оформляться отдельным исключением; в этом плане callback endpoint не входит в backend scope.

---

## Порядок выполнения

1. Backend: добавить `Equestrian` table/entity/schema/protocol/repository/DI.
2. Backend: создать Alembic migration от `47d6367ed482`: базовая конюшня, nullable columns, backfill, constraints, `NOT NULL`.
3. Backend: расширить `User` entity/schema/repository/auth output `equestrian_id`.
4. Backend: ввести tenant dependencies для public read и protected CMS.
5. Backend: перевести все tenant-scoped repositories на обязательную фильтрацию по `equestrian_id`.
6. Backend: перевести services на явный tenant context и cross-tenant guards.
7. Backend: нормализовать API access dependencies: `GET` read context, `POST/PATCH/DELETE` protected context.
8. Backend: подготовить DB/test fixture для создания второй конюшни напрямую в PostgreSQL без `/api/equestrians*`.
9. Backend: написать unit-тесты tenant resolution, миграционной логики на уровне функций, сервисов и репозиториев.
10. Backend: получить PostgreSQL параметры через `docker inspect`, прогнать миграции и smoke на реальной PostgreSQL.
11. Frontend CMS: обновить user type/session handling; не добавлять API/UI управления или переключения конюшен.
12. Site Consumer: добавить service key header в общий `apiFetch`, обновить env docs, проверить SSR data fetch.
13. Quality Gate: проверить access matrix, отсутствие cross-tenant leakage, unit/smoke количество и качество, frontend/site-ad checks.

---

## Backend test plan

### PostgreSQL для smoke-тестов

Контейнер найден через основной поиск по Docker labels:

- Container ID: `478aa22ca9d6e39de1988746a074d6bed0b8406c01d0df10b43aeb13a9ef84ec`
- Name: `/eqsitecms-db`
- Image: `postgres:17`
- Labels: `com.docker.compose.project=eqsitecms`, `com.docker.compose.service=db`
- Network: `eqsitecms_network`
- Aliases/DNS: `eqsitecms-db`, `db`, `478aa22ca9d6`
- Env из `Config.Env`: `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`
- Host port из `NetworkSettings.Ports["5432/tcp"]` и `HostConfig.PortBindings["5432/tcp"]`: `5433`

Smoke-тесты обязаны получать эти значения через `docker inspect` в test setup/maintain script, а не хардкодить их в тестах.

### Unit-тесты backend-фичи Equestrian tenant scope

1. Tenant resolution: public GET с валидным `X-Equestrian-Service-Key` возвращает `EquestrianContext` без user.
2. Tenant resolution: public GET без service key возвращает ожидаемую client error.
3. Tenant resolution: public GET с неизвестным service key возвращает `404`/контрактную ошибку.
4. Tenant resolution: authenticated request использует `user.equestrian_id`, даже если header указывает другую конюшню.
5. Auth service: `UserOutDto` содержит `equestrian_id` после decode access token.
6. Auth service: пользователь без `equestrian_id` после миграции невозможен и мапится в client/auth error при legacy data corruption.
7. Equestrian entity: пустое `name` отклоняется.
8. Equestrian entity: `name` длиной 127 символов принимается.
9. Equestrian entity: `name` длиннее 127 символов отклоняется.
10. Equestrian entity: пустой `service_key` отклоняется.
11. Equestrian repository: `get_by_service_key` возвращает только точное совпадение.
12. Migration helper: backfill выбирает одну базовую конюшню идемпотентно.
13. Breed service: `create` присваивает `equestrian_id` из context, а не из payload.
14. Breed service: duplicate `name` в той же конюшне возвращает conflict/client error.
15. Breed service: тот же `name` в другой конюшне разрешен.
16. Coat color service: duplicate `slug` в той же конюшне блокируется.
17. Horse owner service: list фильтруется по tenant context.
18. Horse service service: `get_by_slug_or_id` не возвращает slug из другой конюшни.
19. Horse service service: price validation не меняет tenant context.
20. Horse service: create horse отклоняет `breed_id` из другой конюшни.
21. Horse service: create horse отклоняет `coat_color_id` из другой конюшни.
22. Horse service: create horse отклоняет `horse_owner_id` из другой конюшни.
23. Horse service: list with `include_ids` не раскрывает ids из чужой конюшни.
24. Horse service: pedigree set отклоняет sire/dam/children из другой конюшни.
25. Horse repository: joined breed/coat/owner/photos/services фильтруются по tenant.
26. Photo service: upload создает photo row с tenant из user context.
27. Photo service: update чужого tenant photo возвращает forbidden/not found по контракту.
28. Price group service: одинаковое имя группы разрешено в разных tenant.
29. Price service: привязка group из другого tenant отклоняется.
30. Price service: привязка photo из другого tenant отклоняется.
31. Site settings service: одинаковый `key` разрешен в разных tenant.
32. Site settings service: public simple output не содержит admin-only/private fields сверх контракта.
33. Batch delete photos: удаляет только ids текущего tenant, чужие ids блокируются.
34. Access guard: `POST/PATCH/DELETE` без current user возвращает `401`.
35. Scope guard: routes `/api/equestrians*` не зарегистрированы в FastAPI в MVP.
36. Serialization: public DTO не включает `equestrian_id`, если контракт не требует раскрытия tenant id.

### Smoke-тесты backend-фичи Equestrian tenant scope

Перед smoke создать через прямые PostgreSQL/DB fixture операции две конюшни:

- `stable-a` с базовыми/мигрированными данными.
- `stable-b` с отдельными breeds, coat colors, owners, services, horses, photos, price groups, prices, site settings и пользователем `user-b`.

Создание второй конюшни через API запрещено в рамках MVP, потому что endpoint'ов управления `Equestrian` нет.

Каждый public GET ниже выполнять без auth cookie, но с `X-Equestrian-Service-Key`; отдельно проверить missing/invalid key.

1. PostgreSQL: `alembic upgrade head` применяет миграцию от `47d6367ed482` на реальной БД.
2. PostgreSQL: после миграции таблица `equestrians` содержит базовую конюшню.
3. PostgreSQL: все существующие `users` имеют `equestrian_id`.
4. PostgreSQL: все существующие tenant-scoped таблицы имеют `equestrian_id NOT NULL`.
5. PostgreSQL: composite unique `(equestrian_id, name/key/slug)` разрешает одинаковые значения в разных конюшнях.
6. Public GET `/api/horses/breeds` без auth с key `stable-a` возвращает только breeds `stable-a`.
7. Public GET `/api/horses/breeds` без auth с key `stable-b` возвращает только breeds `stable-b`.
8. Public GET `/api/horses/breeds/{slug}` не находит slug из другой конюшни.
9. Public GET `/api/horses/coat_colors` без auth изолирует данные второй конюшни.
10. Public GET `/api/horses/owners` без auth изолирует owners второй конюшни.
11. Public GET `/api/horses/services` без auth изолирует services второй конюшни.
12. Public GET `/api/horses/services/{slug}` с `page_data=true` не раскрывает чужой service.
13. Public GET `/api/horses` без auth изолирует horse list второй конюшни.
14. Public GET `/api/horses/{slug}` без auth не возвращает horse из чужой конюшни.
15. Public GET `/api/horses/{horse_id}/pedigree/{mode}` без auth не пересекает tenant.
16. Public GET `/api/photos` без auth изолирует photos второй конюшни.
17. Public GET `/api/photos/{id}` без auth не возвращает photo из чужой конюшни.
18. Public GET `/api/prices/groups` без auth изолирует groups второй конюшни.
19. Public GET `/api/prices/groups/{id}` без auth не возвращает group из чужой конюшни.
20. Public GET `/api/prices` без auth изолирует prices второй конюшни.
21. Public GET `/api/prices/{slug}` без auth не возвращает price из чужой конюшни.
22. Public GET `/api/site_settings` без auth возвращает settings только key `stable-a`.
23. Public GET `/api/site_settings` без auth возвращает settings только key `stable-b`.
24. Public GET любого tenant endpoint без service key возвращает контрактный `400`.
25. Public GET любого tenant endpoint с unknown service key возвращает контрактный `404`/описанный статус.
26. Authenticated GET `/api/horses` с user `stable-a` и header `stable-b` возвращает `stable-a`, header ignored.
27. Protected POST `/api/horses/breeds` без auth возвращает `401`.
28. Protected PATCH `/api/horses/breeds/{slug}` без auth возвращает `401`.
29. Protected DELETE `/api/horses/breeds/{slug}` без auth возвращает `401`.
30. Protected POST `/api/horses` с user `stable-a` и `breed_id` из `stable-b` возвращает `403`/`400`.
31. Protected PATCH `/api/horses/{id}` user `stable-a` на horse `stable-b` возвращает `403`/`404`.
32. Protected DELETE `/api/photos/{id}` user `stable-a` на photo `stable-b` не удаляет чужую запись.
33. Protected POST `/api/prices/{slug}/photos` с cross-tenant photo возвращает `403`/`400`.
34. Protected POST `/api/photos/batch-delete` со смешанными ids не удаляет чужие ids и возвращает контрактный статус.
35. Protected POST `/api/site_settings` одинаковый key в разных tenant проходит, в одном tenant конфликтует.
36. Scope smoke: `POST /api/equestrians` не существует и возвращает `404`.
37. Scope smoke: `GET /api/equestrians` не существует и возвращает `404`.
38. Protected GET `/api/auth/me` без auth возвращает `401`.
39. Public exception POST `/api/auth/login` работает для пользователя `stable-a` и `stable-b`.
40. Full smoke по каждому endpoint из Access matrix без auth: `GET` с service key получает `200/404` по tenant, `POST/PATCH/DELETE` получает `401`.
41. Response schema smoke: public responses не содержат строки из второй конюшни ни в nested relations, ни в `total`.
42. Transaction smoke: ошибка cross-tenant relation не оставляет частично созданных rows.

---

## Чеклист

### Backend

- [x] Создать `services/backend/src/models/equestrian.py`
- [x] Импортировать `equestrian` model в `services/backend/src/models/__init__.py`
- [x] Создать `services/backend/src/core/entities/equestrian.py`
- [x] Создать tenant context model `services/backend/src/core/entities/equestrian_context.py` или schema equivalent
- [x] Создать `services/backend/src/core/schemas/equestrian.py` только для внутреннего/read DTO, без Create/Update API DTO
- [x] Создать `services/backend/src/core/protocols/repositories/equestrian_repository.py`
- [x] Создать `services/backend/src/repositories/equestrian_repository.py`
- [x] Зарегистрировать `get_equestrian_repository` в `services/backend/src/depends/repositories.py`
- [x] Добавить tenant dependencies для public/protected/read context в `services/backend/src/depends/services.py` или новом `depends/equestrian.py`
- [x] Добавить `equestrian_id` в `services/backend/src/models/users.py`, `core/entities/user.py`, `core/schemas/users.py`
- [x] Обновить `AuthService` и `UserRepository`, чтобы `UserOutDto` всегда содержал `equestrian_id`
- [x] Создать Alembic migration от `47d6367ed482` для `equestrians`, backfill и tenant columns
- [x] В миграции создать базовую конюшню и привязать к ней все существующие rows
- [x] В миграции заменить single-column unique constraints на tenant composite constraints
- [x] Обновить models `breeds`, `coat_color`, `horse_owner`, `horse_service`, `horse`, `photos`, `prices`, `site_settings` колонкой `equestrian_id`
- [x] Обновить entities/schemas tenant-scoped сущностей с учетом `equestrian_id` во внутреннем слое
- [x] Перевести repositories breeds/coat_color/horse_owner/horse_service/photos/prices/site_settings на tenant-filtered методы
- [x] Перевести `HorseRepository` joins, pedigree и relation queries на tenant-safe фильтрацию
- [x] Перевести services breeds/coat_color/horse_owner/horse_service/photos/prices/site_settings на обязательный tenant context
- [x] Перевести `HorseService` на tenant context и cross-tenant guards для related ids
- [x] Нормализовать все `GET` routes на read tenant dependency
- [x] Нормализовать все `POST/PATCH/DELETE` routes на protected auth/tenant dependency
- [x] Не создавать `services/backend/src/api/equestrian.py` и не регистрировать `/api/equestrians*` в MVP
- [ ] Подготовить test DB fixture/utility для создания второй конюшни напрямую в PostgreSQL без API
- [ ] Заполнить/сверить Access matrix для всех новых и измененных endpoint'ов
- [ ] Для исключений auth, `/auth/me`, возможно `site_settings?full=true` зафиксировать причину, статусы и тесты
- [ ] Найти PostgreSQL контейнер по labels `com.docker.compose.project=eqsitecms` + `com.docker.compose.service=db`, fallback `eqsitecms-db`/`postgres`, и получить DB env/host port через `docker inspect`
- [ ] Unit: Equestrian tenant scope — public GET с валидным service key возвращает context
- [ ] Unit: Equestrian tenant scope — public GET без service key возвращает client error
- [ ] Unit: Equestrian tenant scope — public GET с неизвестным service key возвращает tenant-not-found error
- [ ] Unit: Equestrian tenant scope — authenticated request игнорирует чужой service key header
- [ ] Unit: Equestrian tenant scope — `UserOutDto` содержит `equestrian_id` после auth
- [ ] Unit: Equestrian tenant scope — legacy user без `equestrian_id` мапится в ошибку
- [ ] Unit: Equestrian tenant scope — пустое `name` конюшни отклоняется
- [ ] Unit: Equestrian tenant scope — `name` длиной 127 символов принимается
- [ ] Unit: Equestrian tenant scope — `name` длиннее 127 символов отклоняется
- [ ] Unit: Equestrian tenant scope — пустой `service_key` отклоняется
- [ ] Unit: Equestrian tenant scope — repository `get_by_service_key` ищет точное совпадение
- [ ] Unit: Equestrian tenant scope — migration helper backfill идемпотентен
- [ ] Unit: Equestrian tenant scope — breed create присваивает tenant из context
- [ ] Unit: Equestrian tenant scope — duplicate breed name в одном tenant блокируется
- [ ] Unit: Equestrian tenant scope — duplicate breed name в разных tenant разрешен
- [ ] Unit: Equestrian tenant scope — duplicate coat color slug в одном tenant блокируется
- [ ] Unit: Equestrian tenant scope — horse owner list фильтруется по tenant
- [ ] Unit: Equestrian tenant scope — horse service detail не возвращает slug чужого tenant
- [ ] Unit: Equestrian tenant scope — horse service validation не меняет tenant context
- [ ] Unit: Equestrian tenant scope — horse create отклоняет breed из другого tenant
- [ ] Unit: Equestrian tenant scope — horse create отклоняет coat color из другого tenant
- [ ] Unit: Equestrian tenant scope — horse create отклоняет owner из другого tenant
- [ ] Unit: Equestrian tenant scope — horse list `include_ids` не раскрывает чужие ids
- [ ] Unit: Equestrian tenant scope — pedigree set отклоняет related horse из другого tenant
- [ ] Unit: Equestrian tenant scope — horse joined DTO фильтрует nested relations по tenant
- [ ] Unit: Equestrian tenant scope — photo upload создает row в tenant пользователя
- [ ] Unit: Equestrian tenant scope — photo update чужого tenant блокируется
- [ ] Unit: Equestrian tenant scope — price group duplicate name разрешен в разных tenant
- [ ] Unit: Equestrian tenant scope — price relation с group другого tenant блокируется
- [ ] Unit: Equestrian tenant scope — price relation с photo другого tenant блокируется
- [ ] Unit: Equestrian tenant scope — site setting duplicate key разрешен в разных tenant
- [ ] Unit: Equestrian tenant scope — public site settings DTO не содержит admin-only fields по контракту
- [ ] Unit: Equestrian tenant scope — batch delete photos не удаляет чужие ids
- [ ] Unit: Equestrian tenant scope — write без current user возвращает `401`
- [ ] Unit: Equestrian tenant scope — routes `/api/equestrians*` не зарегистрированы в MVP
- [ ] Unit: Equestrian tenant scope — public DTO не раскрывает `equestrian_id`, если не требуется контрактом
- [ ] Smoke: Equestrian tenant scope — миграции применяются на реальной PostgreSQL
- [ ] Smoke: Equestrian tenant scope — базовая конюшня создана на реальной PostgreSQL
- [ ] Smoke: Equestrian tenant scope — users backfilled with `equestrian_id` на реальной PostgreSQL
- [ ] Smoke: Equestrian tenant scope — tenant-scoped tables имеют `equestrian_id NOT NULL`
- [ ] Smoke: Equestrian tenant scope — composite unique работает для одинаковых значений в разных tenant
- [ ] Smoke: Equestrian tenant scope — `/api/horses/breeds` без auth с key stable-a изолирует данные
- [ ] Smoke: Equestrian tenant scope — `/api/horses/breeds` без auth с key stable-b изолирует данные
- [ ] Smoke: Equestrian tenant scope — `/api/horses/breeds/{slug}` не находит slug чужого tenant
- [ ] Smoke: Equestrian tenant scope — `/api/horses/coat_colors` без auth изолирует данные второй конюшни
- [ ] Smoke: Equestrian tenant scope — `/api/horses/owners` без auth изолирует данные второй конюшни
- [ ] Smoke: Equestrian tenant scope — `/api/horses/services` без auth изолирует данные второй конюшни
- [ ] Smoke: Equestrian tenant scope — `/api/horses/services/{slug}` с page_data не раскрывает чужой service
- [ ] Smoke: Equestrian tenant scope — `/api/horses` без auth изолирует horse list второй конюшни
- [ ] Smoke: Equestrian tenant scope — `/api/horses/{slug}` без auth не возвращает horse чужого tenant
- [ ] Smoke: Equestrian tenant scope — `/api/horses/{horse_id}/pedigree/{mode}` без auth не пересекает tenant
- [ ] Smoke: Equestrian tenant scope — `/api/photos` без auth изолирует photos второй конюшни
- [ ] Smoke: Equestrian tenant scope — `/api/photos/{id}` без auth не возвращает photo чужого tenant
- [ ] Smoke: Equestrian tenant scope — `/api/prices/groups` без auth изолирует groups второй конюшни
- [ ] Smoke: Equestrian tenant scope — `/api/prices/groups/{id}` без auth не возвращает group чужого tenant
- [ ] Smoke: Equestrian tenant scope — `/api/prices` без auth изолирует prices второй конюшни
- [ ] Smoke: Equestrian tenant scope — `/api/prices/{slug}` без auth не возвращает price чужого tenant
- [ ] Smoke: Equestrian tenant scope — `/api/site_settings` без auth возвращает settings только stable-a
- [ ] Smoke: Equestrian tenant scope — `/api/site_settings` без auth возвращает settings только stable-b
- [ ] Smoke: Equestrian tenant scope — tenant endpoint без service key возвращает `400`
- [ ] Smoke: Equestrian tenant scope — tenant endpoint с unknown service key возвращает контрактный статус
- [ ] Smoke: Equestrian tenant scope — authenticated GET с чужим header игнорирует header
- [ ] Smoke: Equestrian tenant scope — protected POST breed без auth возвращает `401`
- [ ] Smoke: Equestrian tenant scope — protected PATCH breed без auth возвращает `401`
- [ ] Smoke: Equestrian tenant scope — protected DELETE breed без auth возвращает `401`
- [ ] Smoke: Equestrian tenant scope — create horse с breed другого tenant блокируется
- [ ] Smoke: Equestrian tenant scope — patch horse чужого tenant блокируется
- [ ] Smoke: Equestrian tenant scope — delete photo чужого tenant не удаляет запись
- [ ] Smoke: Equestrian tenant scope — price photo relation с чужой photo блокируется
- [ ] Smoke: Equestrian tenant scope — batch delete со смешанными ids не удаляет чужие ids
- [ ] Smoke: Equestrian tenant scope — duplicate site setting key разрешен между tenant и конфликтует внутри tenant
- [ ] Smoke: Equestrian tenant scope — POST `/api/equestrians` не существует и возвращает `404`
- [ ] Smoke: Equestrian tenant scope — GET `/api/equestrians` не существует и возвращает `404`
- [ ] Smoke: Equestrian tenant scope — GET `/api/auth/me` без auth возвращает `401`
- [ ] Smoke: Equestrian tenant scope — POST `/api/auth/login` работает для users разных tenant
- [ ] Smoke: Equestrian tenant scope — каждый endpoint из Access matrix проверен без auth по контракту
- [ ] Smoke: Equestrian tenant scope — public responses не содержат nested данных второй конюшни
- [ ] Smoke: Equestrian tenant scope — cross-tenant ошибка не оставляет частичных rows

### Frontend

- [ ] Обновить `services/frontend/src/types/api/user.ts` полем `equestrian_id`
- [ ] Проверить `services/frontend/src/contexts/UserContext.tsx` на корректную работу с user DTO после добавления tenant
- [ ] Не создавать `services/frontend/src/types/api/equestrian.ts` для CRUD конюшен в MVP
- [ ] Не создавать `services/frontend/src/api/equestrian.ts` для protected CRUD конюшен в MVP
- [ ] Не добавлять service key header в CMS api client
- [ ] Не создавать `services/frontend/src/features/equestrians/` и protected page для управления конюшнями
- [ ] Не добавлять selector/switcher конюшни в CMS
- [ ] Проверить, что CMS write flows используют только auth cookies и не принимают tenant из формы
- [ ] Обновить frontend tests/types checks для измененного `User`

### Quality Gate

- [ ] Проверить соответствие Clean Architecture в backend: API не содержит business tenant logic
- [ ] Проверить соответствие frontend структуре без устаревших `shared/widgets/entities`
- [ ] Проверить соответствие Site Consumer SSR-first: `site-ad` не уводит SEO-контент в client-only fetch
- [ ] Проверить, что Access matrix покрывает все новые/измененные endpoint'ы
- [ ] Проверить, что нет случайной приватизации public `GET`
- [ ] Проверить, что все `POST/PATCH/DELETE` protected и без auth возвращают `401`
- [ ] Проверить, что исключения из default policy имеют причины, статусы и тесты
- [ ] Проверить, что `/api/equestrians*` endpoint'ы отсутствуют в MVP
- [ ] Проверить, что CMS не содержит UI/API/selector для управления или переключения конюшен
- [ ] Проверить, что каждая backend-фича имеет минимум 30 Unit checklist-пунктов с разными сценариями
- [ ] Проверить, что каждая backend-фича имеет минимум 30 Smoke checklist-пунктов с разными сценариями на реальной PostgreSQL
- [ ] Проверить, что smoke-тесты берут `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` и host port из `docker inspect`, без хардкода
- [ ] Проверить миграцию от DB head `47d6367ed482`
- [ ] Проверить, что миграция backfill не падает на непустой базе
- [ ] Проверить, что после симуляции второй конюшни public GET не раскрывают чужие данные
- [ ] Проверить SMOKE каждого endpoint без авторизации по Access matrix
- [ ] Проверить, что `site-ad` отправляет `X-Equestrian-Service-Key` во все backend public read requests
- [ ] Проверить, что `site-ad` не использует CMS-only protected endpoints
- [ ] Запустить backend unit tests
- [ ] Запустить backend smoke tests на реальной PostgreSQL
- [ ] Запустить frontend lint/typecheck/tests, если настроены
- [ ] Запустить site-ad lint/typecheck/tests, если настроены
- [ ] Проверить отсутствие секретов: service key можно хранить в БД, но не называть secret и не использовать как auth
