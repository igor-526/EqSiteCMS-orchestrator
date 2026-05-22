# План: horse_kind_to_breed_migration

**Тикет:** horse_kind_to_breed_migration  
**Дата:** 2026-05-18  
**Затронутые сервисы:** `services/backend`, `services/frontend`  
**Ветка:** `feature/horse-kind-to-breed-migration`

---

## Контекст

Сейчас тип животного (`kind`: `horse`/`pony`) хранится в таблице и DTO лошади: `services/backend/src/models/horse.py`, `services/backend/src/core/entities/horse.py`, `services/backend/src/core/schemas/horses.py`. Это поле используется в выдаче лошадей, фильтре/сортировке `GET /api/horses`, в рекурсивной родословной и в правилах подбора родителей/потомков.

По бизнес-смыслу `kind` является атрибутом породы, а не конкретной лошади. Нужно перенести хранение на `breeds`, удалить `kind` из horse DB/write/read контрактов и адаптировать CMS под новый контракт. Совместимость старого read-контракта лошадей сохранять не нужно: `kind` больше не возвращается в list/detail/pedigree response лошадей и не поддерживается как derived/fallback поле.

`services/site-*` не меняются в рамках этой задачи.

## Цель

После реализации:

- `breeds.kind` хранится в БД как `NOT NULL` enum-like string `horse|pony`.
- `horse.kind` удален из БД, horse write DTO и horse read DTO.
- `HorseOutDto` и nested pedigree DTO больше не содержат `kind`; `kind` у лошади не возвращается как derived/fallback field.
- Фильтр и сортировка `GET /api/horses` по query `kind` остаются в API, но работают через join к `breeds.kind`; response items/detail/pedigree не содержат `kind`.
- API пород поддерживает `kind` в DTO, фильтрацию и сортировку по `kind`.
- CMS UI во вкладке «Лошади» убирает колонку «Тип» и селектор типа из create/update modal, но оставляет фильтр типа как фильтр по породам.
- CMS UI во вкладке «Породы» показывает колонку «Тип» с inline filter и позволяет задавать тип в create/update modal.
- Перед implementation задачей этот план должен быть явно согласован пользователем.

---

## Детали реализации

### Backend

#### Изменяемые сущности и файлы

| Что | Путь | Изменение |
|---|---|---|
| SQLAlchemy horse | `services/backend/src/models/horse.py` | Удалить `Column("kind", ...)` и индекс `ix_horse_equestrian_kind`. |
| SQLAlchemy breeds | `services/backend/src/models/breeds.py` | Добавить `Column("kind", String(7), nullable=False, server_default="horse")`; добавить индекс по `equestrian_id, kind`. |
| Alembic migration | `services/backend/src/migration/versions/<new>_horse_kind_to_breed.py` | `down_revision="c1e4d2a3b5f7"`; добавить `breeds.kind`, заполнить значением `horse`, случайно проставить половину пород `pony`, затем удалить `horse.kind`. |
| Breed entity | `services/backend/src/core/entities/breeds.py` | Добавить `kind: HorseKindEnum = HorseKindEnum.HORSE`; импортировать enum без обратных зависимостей. |
| Horse entity | `services/backend/src/core/entities/horse.py` | Удалить `kind` из модели лошади полностью; проверки совместимости родителей/потомков должны получать тип через породу, а не через поле лошади. |
| Breed schemas | `services/backend/src/core/schemas/breeds.py` | Добавить `kind` в `BreedOutDto`, `BreedOutWithPageDataDto`, `BreedCreateDto`, `BreedUpdateDto`; default для create = `horse`; update nullable только через `exclude_unset`, но фактически `kind=None` не должен затирать значение. |
| Horse schemas | `services/backend/src/core/schemas/horses.py` | Удалить `kind` из `HorseCreateInDto`, `HorseUpdateInDto`, `HorseOutDto` и всех nested pedigree DTO. |
| Breed protocol | `services/backend/src/core/protocols/repositories/breed_repository.py` | Добавить `kind` в фильтры и sort literals. |
| Horse protocol | `services/backend/src/core/protocols/repositories/horse_repository.py` | Сохранить параметр `kind` только в list filters; описать, что реализация фильтрует через `breeds.kind`. При необходимости добавить read-method для получения `breed.kind` по horse id для pedigree validation без добавления `kind` в horse DTO. |
| Breed repository | `services/backend/src/repositories/breed_repository.py` | Фильтр `kind IN (...)`, сортировка `kind`/`-kind`, entity mapping с новым полем. |
| Horse repository | `services/backend/src/repositories/horse_repository.py` | Убрать чтение/маппинг horse-level `kind`; фильтр `kind` применять к `breeds.c.kind`; sort `kind` маппить на `breeds.c.kind`; list/detail/pedigree DTO строить без поля `kind`. |
| Horse service | `services/backend/src/core/services/horse.py` | Убрать прием `create_data.kind`/`update_data.kind`; при создании/обновлении проверять существование породы как сейчас; pedigree validation сравнивает `breed.kind` target/parent/child через репозиторий/сервис пород, не через horse DTO. |
| Breed service | `services/backend/src/core/services/breeds.py` | Валидировать `kind` по `HorseKindEnum`; default `horse`; Protected Write должен требовать admin scopes `SUPERUSER/ADMIN/DEVELOPER`. |
| Horses API | `services/backend/src/api/horses.py` | Оставить query `kind`; OpenAPI description уточнить «фильтр по типу породы». Body create/update больше не принимает `kind`. |
| Breeds API | `services/backend/src/api/breeds.py` | Добавить query `kind`, sort literals `kind`/`-kind`, DTO responses with kind; write endpoints должны проверять auth+scope. |
| Unit tests | `services/backend/tests/unit/...` | Обновить/добавить тесты из блока ниже. |

#### Миграция БД

Миграция создается новым Alembic revision после текущего head:

```python
down_revision = "c1e4d2a3b5f7"
```

Порядок `upgrade()`:

1. Добавить `breeds.kind` как `String(7)`, временно с `server_default="horse"`, `nullable=False`.
2. Убедиться, что все существующие строки получили `horse`.
3. Отдельным SQL внутри миграции случайно выбрать примерно половину пород в каждом tenant-контуре и обновить их до `pony`.
4. Добавить индекс `ix_breeds_equestrian_kind`.
5. Удалить индекс `ix_horse_equestrian_kind`.
6. Удалить колонку `horse.kind`.
7. При необходимости убрать `server_default`, если приложение должно явно задавать default в сервисе; `nullable=False` остается.

Пример SQL для шага 3:

```sql
WITH ranked AS (
    SELECT
        id,
        row_number() OVER (PARTITION BY equestrian_id ORDER BY random()) AS rn,
        count(*) OVER (PARTITION BY equestrian_id) AS total
    FROM breeds
)
UPDATE breeds
SET kind = 'pony'
FROM ranked
WHERE breeds.id = ranked.id
  AND ranked.rn <= floor(ranked.total / 2.0);
```

Порядок `downgrade()`:

1. Вернуть `horse.kind` как `String(7) NOT NULL DEFAULT 'horse'`.
2. Заполнить `horse.kind` из `breeds.kind` через join, для лошадей без породы оставить `horse`.
3. Вернуть индекс `ix_horse_equestrian_kind`.
4. Удалить индекс `ix_breeds_equestrian_kind`.
5. Удалить `breeds.kind`.

#### API контракт

`GET /api/horses/breeds`

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Будённовская",
      "short_name": "буд.",
      "slug": "budyonnovskaya",
      "description": null,
      "kind": "horse"
    }
  ],
  "total": 1
}
```

Новые query params:

- `kind=horse|pony`, multi-value как у текущих list filters.
- `sort=kind` и `sort=-kind`.

`POST /api/horses/breeds`

```json
{
  "name": "Будённовская",
  "short_name": "буд.",
  "slug": "budyonnovskaya",
  "description": null,
  "page_data": "<div></div>",
  "kind": "horse"
}
```

Если `kind` не передан, backend создает породу с `kind="horse"`.

`POST /api/horses` и `PATCH /api/horses/{horse_id}` больше не принимают `kind` в body. Body-контракт с `kind` не поддерживается:

- frontend CMS не должен отправлять `kind` в create/update payload;
- backend schemas/services не должны читать `kind` из request body и не должны передавать его в write path;
- request body с extra field `kind` должен считаться неподдерживаемым контрактом; целевой HTTP-статус для явной проверки — `422 Unprocessable Entity`;
- OpenAPI/request schemas для create/update лошади не должны содержать `kind`.

Поле `kind` удаляется из `HorseOutDto`, ответов `GET /api/horses`, `GET /api/horses/{slug_or_id}`, `GET /api/horses/{horse_id}/pedigree/{mode}` и всех вложенных `pedigree` DTO:

- `kind` у лошади не возвращается как derived field из `breed.kind`;
- `kind` у лошади не возвращается как fallback `horse` для записей без породы;
- фильтр и сортировка `GET /api/horses` по query `kind` работают через `breeds.kind`; лошади без породы не попадают в `kind=horse`, потому что фильтр является фильтром по породе.

#### Access matrix

Исключения из дефолтной policy не планируются.

Для Public Read `GET` колонка "Without auth" означает запрос без auth cookie, но с корректным tenant context для public read (`X-Equestrian-Service-Key`) либо с существующим публичным read-контекстом проекта. Отсутствие tenant context остается клиентской ошибкой и не является auth denial.

| Method | Path | Access class | Roles | Expected without auth | Expected with auth |
|---|---|---|---|---|---|
| GET | `/api/horses/breeds` | Public Read | — | `200 OK` | `200 OK` |
| POST | `/api/horses/breeds` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401 Unauthorized` | `200 OK`; без роли `403 Forbidden` |
| GET | `/api/horses/breeds/{slug_or_id}` | Public Read | — | `200 OK` | `200 OK` |
| PATCH | `/api/horses/breeds/{slug_or_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401 Unauthorized` | `200 OK`; без роли `403 Forbidden` |
| GET | `/api/horses` | Public Read | — | `200 OK` | `200 OK` |
| POST | `/api/horses` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401 Unauthorized` | `200 OK`; без роли `403 Forbidden` |
| GET | `/api/horses/{slug_or_id}` | Public Read | — | `200 OK` | `200 OK` |
| PATCH | `/api/horses/{slug_or_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401 Unauthorized` | `200 OK`; без роли `403 Forbidden` |
| POST | `/api/horses/{horse_id}/pedigree` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401 Unauthorized` | `204 No Content`; без роли `403 Forbidden` |
| POST | `/api/horses/{horse_id}/photos` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401 Unauthorized` | `200 OK`; без роли `403 Forbidden` |
| GET | `/api/horses/{horse_id}/pedigree/{mode}` | Public Read | — | `200 OK` | `200 OK` |

Quality Gate должен отдельно проверить anonymous/public-read и authenticated/protected-write сценарии. Если текущая централизованная обработка ошибок возвращает `400` для missing scope, Backend Agent должен привести контракт к `403` через существующий `ForbiddenError`/handler либо вернуть задачу Planner на пересогласование, не маскируя отклонение в тестах.

### Frontend

#### Изменяемые файлы

| Что | Путь | Изменение |
|---|---|---|
| Horse DTO/API types | `services/frontend/src/types/api/horses.ts` | Удалить `kind` из `HorseCreateInDto`, `HorseUpdateInDto`, `HorseOutDto` и nested pedigree DTO; оставить `HorseListQueryParams.kind` и sort `kind/-kind`. |
| Horse breed DTO/API types | `services/frontend/src/types/api/horseBreeds.ts` | Добавить `HorseKind`; `kind` в out/create/update/list query; sort `kind/-kind`. |
| Horses API | `services/frontend/src/api/horses.ts` | Убедиться, что create/update payload без `kind`; list query сохраняет `kind`. |
| Horse breeds API | `services/frontend/src/api/horseBreeds.ts` | Поддержать `kind` query/sort/body через типы, без прямых `fetch` вне `src/api`. |
| Horses hook | `services/frontend/src/features/horses/hooks/useHorses.ts` | Default `kind` пустой; при установке `breed_ids` очистить `kind`; при active breed filter не отправлять `kind`. |
| Horse breeds hook | `services/frontend/src/features/horses/hooks/useHorseBreeds.ts` | Добавить `kind` в filters; offset reset на filter/sort/page-size; поддержать отдельную загрузку пород для horse breed selector по `kind`. |
| Horse validators | `services/frontend/src/features/horses/validators/horses.ts` | Удалить `kind` из create/update schema. |
| Horse breed validators | `services/frontend/src/features/horses/validators/horseBreeds.ts` | Добавить `kind: z.enum(["horse","pony"]).default("horse")` для create и optional для update. |
| Horses table | `services/frontend/src/features/horses/ui/Horses/HorsesTable.tsx` | Удалить колонку «Тип»; оставить filter control `kind`, disabled если активен любой `breed_ids`; filter changes reset `offset`. |
| Horse create/update modal | `services/frontend/src/features/horses/ui/Horses/HorseCreateUpdateModal.tsx` | Удалить state/selector/payload `kind`; layout перестроить без пустого места. |
| Horse breeds table | `services/frontend/src/features/horses/ui/HorseBreeds/HorseBreedsTable.tsx` | Добавить колонку «Тип» с label `Лошадь/Пони`, сортировкой `kind`, inline `ListFilter` по `kind`. |
| Horse breed create/update modal | `services/frontend/src/features/horses/ui/HorseBreeds/HorseBreedsCreateUpdateModal.tsx` | Добавить selector «Тип» с default `horse`; отправлять `kind` в create/update. |
| Horses page | `services/frontend/src/app/(protected)/horses/page.tsx` | Развести options: breed filter selector перезапрашивается с `kind`, modal selector использует актуальный список пород; при breed filter active очищать/disable type filter. |
| Tests | `services/frontend/src/features/horses/**/*.test.*`, `services/frontend/src/api/api-boundary.test.ts` | Обновить существующие тесты и добавить матрицу ниже. |

#### UI rules для фильтров

- Во вкладке «Лошади» колонка «Тип» удаляется.
- Фильтр `kind` остается доступным в filter UI.
- Default `kind` пустой: `undefined`/не отправляется.
- При выборе `kind` нужно перезапрашивать breed selector options через `GET /api/horses/breeds?kind=<selected>`.
- Если активен любой фильтр по породам (`breed_ids.length > 0`), type filter:
  - disabled;
  - очищен визуально;
  - `kind` удален из `horsesFilters`;
  - `kind` не отправляется в `GET /api/horses`.
- При очистке breed filter type filter снова enabled, но остается пустым.
- Все filter/search/sort changes сбрасывают `offset=0`.

#### Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| `src/types/api/horses.ts` | Horse write/read/pedigree DTO больше не содержат `kind`, query/sort сохраняют `kind` | static typecheck | — | `npx tsc --noEmit` |
| `src/types/api/horseBreeds.ts` | Breed DTO/query/sort содержит `kind` | static typecheck | — | `npx tsc --noEmit` |
| `src/api/horses.ts` | List сериализует `kind`, create/update не отправляют `kind` | API-boundary MSW: success, validation error, `401`, `403`, no live calls | Public Read list; Protected Write mutation denial | `npm test` |
| `src/api/horseBreeds.ts` | List сериализует `kind` и `sort=kind`; create/update body содержит `kind` | API-boundary MSW: success, empty, validation error, generic error, `401`, `403` | Public Read list/detail; Protected Write create/update | `npm test` |
| `useHorses` | Breed filter clears/disables kind and omits it from query; offset reset | hook unit: apply, clear, normalize, reset offset, pagination limit/offset | authenticated CMS context; no live backend | `npm test` |
| `useHorseBreeds` | kind filter/sort/pagination for breeds and selector reload by kind | hook unit: success, empty, error, filter, sort, pagination | authenticated CMS context; no live backend | `npm test` |
| `HorseCreateUpdateModal` | Type selector removed; submit payload has no `kind` | component: open/create/update, validation, backend error, scope present/missing | Protected Write UX, `401/403` surfaced by hook | `npm test` |
| `HorsesTable` | Type column removed, type filter behavior retained/disabled by breed filter | component: data/loading/empty/error, filter apply/clear, disabled state, sort unaffected | authenticated render; no mutation | `npm test` |
| `HorseBreedsTable` | New Type column with inline filter and sort | component: data/loading/empty/error, filter apply/clear, sort mapping | Public Read API in admin context | `npm test` |
| `HorseBreedsCreateUpdateModal` | Type selector default `horse`; update preserves selected kind | component: open/close, valid submit, validation error, backend error, success | Protected Write UX, scope present/missing if scopes are available | `npm test` |
| `src/app/(protected)/horses/page.tsx` | Integrated flow: kind filters breed options, no `site-*` mixing | route/manual QA; optional smoke/e2e if available | anonymous redirect/block; authenticated render | `npm run build` |
| `services/frontend/src` | No live backend calls in tests and no consumer mixing | `rg` self-checks | — | commands in Quality Gate |

## PostgreSQL для smoke-тестов

DB-контейнер найден по обязательному алгоритму Planner:

- Основной поиск: `docker ps --filter label=com.docker.compose.project=eqsitecms --filter label=com.docker.compose.service=db`
- Найден контейнер: `478aa22ca9d6 eqsitecms-db postgres:17`
- `docker inspect 478aa22ca9d6`:
  - `Name`: `/eqsitecms-db`
  - `Config.Image`: `postgres:17`
  - Labels: `com.docker.compose.project=eqsitecms`, `com.docker.compose.service=db`
  - Network aliases: `eqsitecms-db`, `db`
  - `POSTGRES_DB=eqsitecms`
  - `POSTGRES_USER=eqsitecms`
  - `POSTGRES_PASSWORD=eqsitecms`
  - Host port `5432/tcp`: `5433`

Smoke-тесты не создаются как pytest-файлы. Они выполняются только через `.claude/skills/api-smoke-test` на живом backend API и реальной PostgreSQL после того, как пользователь вручную применит миграцию и поднимет backend.

Переменные для smoke:

- `BASE_URL=http://localhost:8001/api`
- `SERVICE_KEY=<актуальный X-Equestrian-Service-Key из локального окружения>`
- `ADMIN_COOKIE=<валидные auth cookies для SUPERUSER/ADMIN/DEVELOPER>`
- `NO_SCOPE_COOKIE=<валидные auth cookies пользователя без write scope>`
- `BREED_HORSE_ID`, `BREED_PONY_ID`, `HORSE_WITH_HORSE_BREED_ID`, `HORSE_WITH_PONY_BREED_ID`, `HORSE_WITHOUT_BREED_ID`

## Unit-тесты backend-фичи horse_kind_to_breed_migration

Расположение: дополнить существующие `services/backend/tests/unit/core/services/test_horse_service.py`, `services/backend/tests/unit/core/services/test_breed_service.py`, `services/backend/tests/unit/repositories/test_horse_repository.py`; при необходимости добавить `test_breed_repository.py` и migration-focused unit без живой БД.

| # | Сценарий |
|---|---|
| U-01 | `Breed` entity принимает `kind=horse` и сериализуется с этим значением. |
| U-02 | `Breed` entity принимает `kind=pony` и сериализуется с этим значением. |
| U-03 | `BreedCreateDto` без `kind` дает default `horse`. |
| U-04 | `BreedCreateDto` с `kind=pony` проходит валидацию. |
| U-05 | `BreedCreateDto` с невалидным `kind` отклоняется Pydantic/FastAPI validation. |
| U-06 | `BreedUpdateDto` с `kind=pony` обновляет только kind и не требует name. |
| U-07 | `BreedUpdateDto` без `kind` не затирает существующий kind. |
| U-08 | `BreedService.create` передает `kind` в `BreedRepository.create`. |
| U-09 | `BreedService.create` без `kind` создает entity с `kind=horse`. |
| U-10 | `BreedService.update` меняет `kind` и сохраняет остальные поля. |
| U-11 | `BreedService.update` с `kind=None` не делает поле NULL и возвращает клиентскую ошибку или игнорирует unset по выбранному контракту. |
| U-12 | `BreedRepository.get_filtered(kind=[horse])` строит WHERE по `breeds.kind`. |
| U-13 | `BreedRepository.get_filtered(kind=[pony])` возвращает только pony breeds и корректный total. |
| U-14 | `BreedRepository.get_filtered(kind=[horse, pony])` возвращает обе группы без дублей. |
| U-15 | `BreedRepository.get_filtered(sort=["kind"])` сортирует по `breeds.kind ASC`. |
| U-16 | `BreedRepository.get_filtered(sort=["-kind"])` сортирует по `breeds.kind DESC`. |
| U-17 | `HorseCreateInDto` больше не содержит поля `kind` в schema/model fields. |
| U-18 | `HorseUpdateInDto` больше не содержит поля `kind` в schema/model fields. |
| U-19 | `HorseService.create_horse` не читает `create_data.kind` и не передает `kind` в insert `horse`. |
| U-20 | `HorseService.update_horse` не ожидает и не записывает horse-level kind при смене породы. |
| U-21 | `HorseOutDto` schema/model fields не содержит `kind`. |
| U-22 | Nested pedigree DTO schema/model fields для sire/dam/foals не содержат `kind`. |
| U-23 | `HorseRepository._build_horse_dto` не добавляет `kind` в list/detail DTO даже при joined `breed.kind`. |
| U-24 | `HorseRepository._build_horse_dto` для `breed=None` возвращает DTO без fallback `kind`. |
| U-25 | `HorseRepository.get_horse_list_full_info(kind=[horse])` фильтрует через `breeds.kind`, не через `horse.kind`, и items не содержат `kind`. |
| U-26 | `HorseRepository.get_horse_list_full_info(sort=["kind"])` сортирует через `breeds.kind ASC`, но items не содержат `kind`. |
| U-27 | `HorseRepository.get_horse_list_full_info(sort=["-kind"])` сортирует через `breeds.kind DESC`, но items не содержат `kind`. |
| U-28 | `HorseRepository.get_horse_full_info_by_id` возвращает detail DTO без `kind`. |
| U-29 | `HorseRepository.get_horse_full_info_by_slug` возвращает detail DTO без `kind`. |
| U-30 | `HorseRepository.get_horse_list_full_info(pedigree=1)` строит вложенных sire/dam/foals без `kind`. |
| U-31 | `HorseService.get_available_pedigree` подбирает sire по `breed.kind` target без зависимости от horse DTO `kind`. |
| U-32 | `HorseService.get_available_pedigree` подбирает dam по `breed.kind` target без зависимости от horse DTO `kind`. |
| U-33 | `HorseService.set_horse_pedigree` запрещает sire/dam/foal с `breed.kind`, отличным от target `breed.kind`. |
| U-34 | `HorseService.set_horse_pedigree` разрешает связь при совпадающем `breed.kind`; отсутствие `kind` в horse DTO не влияет на validation. |
| U-35 | `GET /api/horses` service path clamp `limit/offset` сохраняется при kind filter. |
| U-36 | Protected write для breeds без auth получает `401`, с auth без scope `403`, с admin scope success. |
| U-37 | Protected write для horses без auth получает `401`, с auth без scope `403`, с admin scope success. |
| U-38 | Horse create/update request validation не допускает body field `kind` по новому контракту (`422` для extra field). |

## Smoke-тесты backend-фичи horse_kind_to_breed_migration

Все smoke-сценарии выполняются через `.claude/skills/api-smoke-test` на живом API и реальной PostgreSQL. Перед smoke пользователь вручную применяет миграцию и поднимает backend.

| # | Запрос | Проверка |
|---|---|---|
| SM-01 | SQL через real PostgreSQL: проверить `breeds.kind` | Колонка существует, `NOT NULL`, значения только `horse/pony`. |
| SM-02 | SQL через real PostgreSQL: проверить `horse.kind` | Колонка отсутствует. |
| SM-03 | SQL через real PostgreSQL: `SELECT count(*) FROM breeds WHERE kind='pony'` | После миграции есть pony-породы, если общее число пород >= 2. |
| SM-04 | `GET /horses/breeds?limit=10` без auth cookie | `200 OK`, каждый item содержит `kind`. |
| SM-05 | `GET /horses/breeds?kind=horse&limit=50` | Все items имеют `kind=horse`. |
| SM-06 | `GET /horses/breeds?kind=pony&limit=50` | Все items имеют `kind=pony`. |
| SM-07 | `GET /horses/breeds?kind=horse&kind=pony&limit=50` | Возвращаются обе группы, total корректен. |
| SM-08 | `GET /horses/breeds?sort=kind&limit=50` | Сортировка по kind ASC. |
| SM-09 | `GET /horses/breeds?sort=-kind&limit=50` | Сортировка по kind DESC. |
| SM-10 | `GET /horses/breeds/{BREED_PONY_ID}` | Ответ содержит `kind=pony`. |
| SM-11 | `POST /horses/breeds` без auth cookie | `401 Unauthorized`. |
| SM-12 | `POST /horses/breeds` с `NO_SCOPE_COOKIE` | `403 Forbidden`. |
| SM-13 | `POST /horses/breeds` с admin cookie без `kind` | `200 OK`, response `kind=horse`. |
| SM-14 | `POST /horses/breeds` с admin cookie и `kind=pony` | `200 OK`, response `kind=pony`. |
| SM-15 | `PATCH /horses/breeds/{id}` с admin cookie `{"kind":"pony"}` | `200 OK`, subsequent GET показывает `pony`. |
| SM-16 | `PATCH /horses/breeds/{id}` без auth cookie | `401 Unauthorized`. |
| SM-17 | `PATCH /horses/breeds/{id}` с `NO_SCOPE_COOKIE` | `403 Forbidden`. |
| SM-18 | `GET /horses?kind=horse&limit=50` | `200 OK`; horse items не содержат horse-level `kind`; SQL по returned ids подтверждает `breed.kind=horse`. |
| SM-19 | `GET /horses?kind=pony&limit=50` | `200 OK`; horse items не содержат horse-level `kind`; SQL по returned ids подтверждает `breed.kind=pony`. |
| SM-20 | `GET /horses?sort=kind&limit=50` | Порядок соответствует `breeds.kind ASC`, без обращения к удаленной `horse.kind`; horse items не содержат horse-level `kind`. |
| SM-21 | `GET /horses?sort=-kind&limit=50` | Порядок соответствует `breeds.kind DESC`; horse items не содержат horse-level `kind`. |
| SM-22 | `GET /horses/{HORSE_WITH_PONY_BREED_ID}` | Detail response не содержит horse-level `kind`; `breed.kind` может присутствовать как часть Breed DTO. |
| SM-23 | `GET /horses/{HORSE_WITH_HORSE_BREED_ID}` | Detail response не содержит horse-level `kind`; `breed.kind` может присутствовать как часть Breed DTO. |
| SM-24 | `GET /horses/{HORSE_WITHOUT_BREED_ID}` | Response не падает, `breed=null`, horse-level fallback `kind=horse` отсутствует. |
| SM-25 | `POST /horses` с admin cookie и body без `kind` | `200 OK`; created/detail response не содержит horse-level `kind`. |
| SM-26 | `GET /openapi.json` | Request schema для `POST /horses` и `PATCH /horses/{slug_or_id}` не содержит `kind` в body DTO. |
| SM-27 | `PATCH /horses/{id}` с admin cookie меняет `breed_id` с horse-breed на pony-breed | `200 OK`; response не содержит horse-level `kind`; SQL подтверждает новую `breed.kind=pony`. |
| SM-28 | `PATCH /horses/{id}` без auth cookie | `401 Unauthorized`. |
| SM-29 | `PATCH /horses/{id}` с `NO_SCOPE_COOKIE` | `403 Forbidden`. |
| SM-30 | `GET /horses/{horse_id}/pedigree/sire?limit=20` для pony target | Candidate horse DTO не содержат horse-level `kind`; SQL по returned ids подтверждает `breed.kind=pony`. |
| SM-31 | `GET /horses/{horse_id}/pedigree/dam?limit=20` для horse target | Candidate horse DTO не содержат horse-level `kind`; SQL по returned ids подтверждает `breed.kind=horse`. |
| SM-32 | `POST /horses/{horse_id}/pedigree` с parent другой breed.kind | Protected request с admin cookie возвращает клиентскую ошибку, связь не создается. |
| SM-33 | `POST /horses/{horse_id}/pedigree` с parent той же breed.kind | `204 No Content`, subsequent detail/pedigree содержит связь без horse-level `kind` во вложенных DTO. |
| SM-34 | `GET /horses?breed_ids={BREED_PONY_ID}&kind=horse` | Возвращает пустой список или только данные, соответствующие обоим фильтрам; horse-level `kind` отсутствует в items. |
| SM-35 | `POST /horses/{horse_id}/photos` без auth cookie | `401 Unauthorized`; horse read DTO по-прежнему не содержит horse-level `kind`. |
| SM-36 | `POST /horses` с admin cookie и otherwise valid body, содержащим extra `kind` | `422 Unprocessable Entity`; horse body contract с `kind` не поддерживается. |
| SM-37 | `PATCH /horses/{id}` с admin cookie и otherwise valid body, содержащим extra `kind` | `422 Unprocessable Entity`; horse-level `kind` не принимается на update. |

## Manual QA steps (UI тестирование)

Предусловия:

- Backend миграция применена вручную пользователем.
- Backend запущен на `http://localhost:8001`.
- Frontend CMS запущен на `http://localhost:3000`.
- В БД есть породы обоих типов: `horse` и `pony`.
- Есть админский пользователь с write scopes и пользователь без write scopes.

Шаги:

1. Anonymous: открыть `http://localhost:3000/horses` без CMS-сессии. Ожидается redirect/block на login, protected admin UI не рендерит таблицы.
2. Authenticated admin: войти и открыть раздел «Лошади». Ожидается успешный render вкладок и таблицы.
3. Во вкладке «Лошади» проверить, что колонка «Тип» отсутствует.
4. Открыть фильтр типа в UI фильтров. Ожидается пустое значение по умолчанию, query `GET /horses` не содержит `kind`.
5. Выбрать тип «Пони». Ожидается `GET /horses?kind=pony...`, список пород для фильтра/selector перезапрошен через `GET /horses/breeds?kind=pony...`.
6. Выбрать породу в фильтре пород. Ожидается type filter disabled, визуально очищен, `GET /horses` не содержит `kind`, содержит `breed_ids`.
7. Очистить фильтр пород. Ожидается type filter enabled и остается пустым.
8. Проверить sort/filter/search pagination: применение type/breed/name/sort сбрасывает `offset=0`; смена страницы меняет только `offset`; смена page size меняет `limit` и сбрасывает `offset=0`.
9. Нажать «Добавить лошадь». В modal нет selector «Тип», layout без пустой колонки; в Network body `POST /horses` нет `kind`.
10. Создать лошадь с породой `pony`. После success таблица обновляется; строка не показывает колонку типа, detail/read response в Network не содержит horse-level `kind`.
11. Открыть созданную лошадь на редактирование. В modal нет selector «Тип»; `PATCH /horses/{id}` body не содержит `kind`.
12. Сменить породу лошади с pony на horse. После success read response не содержит horse-level `kind`, а выбранная порода обновлена.
13. Открыть «Родословная» для pony-лошади. Candidate picker для sire/dam/children фильтрует кандидатов по `breed.kind=pony`, но horse DTO кандидатов не содержит horse-level `kind`; попытка сохранить несовместимого кандидата через API дает ошибку и UI сохраняет состояние modal.
14. Перейти на вкладку «Породы». Ожидается колонка «Тип» с label `Лошадь/Пони`.
15. В колонке «Тип» применить inline filter `pony`. Ожидается `GET /horses/breeds?kind=pony...`, все строки pony, `offset=0`.
16. Кликнуть sort по колонке «Тип». Ожидается `sort=kind`, повторный клик `sort=-kind`, порядок меняется.
17. Нажать «Добавить породу». В modal есть selector «Тип», default `Лошадь`; body create содержит `kind=horse`.
18. Создать породу с `Тип=Пони`. После success таблица обновляется, новая порода показывает `Пони`.
19. Открыть породу на редактирование, сменить тип на `Лошадь`. После success строка показывает `Лошадь`, detail response содержит `kind=horse`.
20. Пользователь без write scopes: открыть horses page. Read таблицы доступны, create/update/delete actions hidden/disabled/guarded; попытка mutation через UI не отправляет запрос либо backend `403` показывается как error toast.
21. Protected write denial: вручную вызвать create/update при истекшей сессии. Ожидается `401` surfaced через auth/client flow, modal/list state не теряется.
22. Backend validation error: отправить breed create с невалидным/пустым name. Ожидается validation error в modal, modal не закрывается.
23. Generic error: временно смоделировать 500 на breed list/create в MSW/devtools. Ожидается error state/toast без live unit test calls.
24. Responsive desktop/tablet/mobile: проверить вкладки, таблицы, фильтры, селекторы и modals на отсутствие overlap текста, кнопок, dropdown, modal footer и pagination.
25. Проверить `site-*` regression: в `services/site-*` нет изменений, публичный consumer-контур не импортируется в CMS frontend.
26. Итоговый QA-отчет: отметить passed/failed steps, приложить screenshots для failed responsive/error/permission cases и Network status/body для failed API cases.

---

## Порядок выполнения

1. **Backend Agent**: выполнить миграцию, модели, схемы, repositories/services/API и backend tests строго по этому плану.
2. **Frontend Agent**: после готового backend контракта обновить CMS UI/API/types/tests; `services/site-*` не трогать.
3. **Quality Gate Agent**: проверить diff, access matrix, unit/smoke coverage, frontend matrix, no `site-*` mixing и команды качества.

Router при передаче должен явно написать каждому агенту: продолжать до завершенного deliverable и не ждать дополнительных инструкций без конкретного технического блокера.

## Чеклист

### Backend

- [x] Создать Alembic revision `horse_kind_to_breed` с `down_revision="c1e4d2a3b5f7"`.
- [x] В миграции добавить `breeds.kind NOT NULL` с заполнением `horse`.
- [x] В миграции отдельным SQL случайно обновить половину пород каждого tenant до `pony`.
- [x] В миграции добавить индекс `ix_breeds_equestrian_kind`.
- [x] В миграции удалить индекс `ix_horse_equestrian_kind` и колонку `horse.kind`.
- [x] В downgrade восстановить `horse.kind` из `breeds.kind` с fallback `horse`.
- [x] Обновить `services/backend/src/models/breeds.py`: добавить `kind`.
- [x] Обновить `services/backend/src/models/horse.py`: удалить `kind`.
- [x] Обновить `services/backend/src/core/entities/breeds.py`: добавить `kind`.
- [x] Обновить `services/backend/src/core/entities/horse.py`: удалить `kind` из entity.
- [x] Обновить `services/backend/src/core/schemas/breeds.py`: добавить `kind` в out/create/update DTO.
- [x] Обновить `services/backend/src/core/schemas/horses.py`: удалить `kind` из create/update DTO, `HorseOutDto` и nested pedigree DTO.
- [x] Обновить `services/backend/src/core/protocols/repositories/breed_repository.py`: kind filter/sort.
- [x] Обновить `services/backend/src/core/protocols/repositories/horse_repository.py`: kind filter через breed contract.
- [x] Обновить `services/backend/src/repositories/breed_repository.py`: kind filter/sort/total.
- [x] Обновить `services/backend/src/repositories/horse_repository.py`: detail/list/pedigree DTO не возвращают horse-level `kind`.
- [x] Обновить `services/backend/src/repositories/horse_repository.py`: horse `kind` filter использует `breeds.kind`.
- [x] Обновить `services/backend/src/repositories/horse_repository.py`: horse `kind` sort использует `breeds.kind`.
- [x] Обновить `services/backend/src/core/services/breeds.py`: default/validation kind и Protected Write scopes.
- [x] Обновить `services/backend/src/core/services/horse.py`: create/update не используют horse-level kind.
- [x] Обновить `services/backend/src/core/services/horse.py`: pedigree validation сравнивает `breed.kind` без зависимости от horse DTO `kind`.
- [x] Обновить `services/backend/src/api/breeds.py`: query `kind`, sort `kind/-kind`, response DTO.
- [x] Обновить `services/backend/src/api/horses.py`: сохранить query `kind`, уточнить description, убрать body kind.
- [x] Проверить Access matrix для всех endpoint'ов из плана и отсутствие незадокументированных исключений.
- [x] Привести Protected Write denial к `401` без auth и `403` без scope либо вернуть Planner на пересогласование.
- [x] Найти PostgreSQL контейнер по labels `com.docker.compose.project=eqsitecms` + `com.docker.compose.service=db`, fallback `eqsitecms-db`/`postgres`, и получить DB env/host port через `docker inspect` перед smoke.
- [x] Unit: horse_kind_to_breed_migration — `Breed` entity принимает `kind=horse` и сериализуется с этим значением.
- [x] Unit: horse_kind_to_breed_migration — `Breed` entity принимает `kind=pony` и сериализуется с этим значением.
- [x] Unit: horse_kind_to_breed_migration — `BreedCreateDto` без `kind` дает default `horse`.
- [x] Unit: horse_kind_to_breed_migration — `BreedCreateDto` с `kind=pony` проходит валидацию.
- [x] Unit: horse_kind_to_breed_migration — `BreedCreateDto` с невалидным `kind` отклоняется.
- [x] Unit: horse_kind_to_breed_migration — `BreedUpdateDto` с `kind=pony` обновляет только kind.
- [x] Unit: horse_kind_to_breed_migration — `BreedUpdateDto` без `kind` не затирает существующий kind.
- [x] Unit: horse_kind_to_breed_migration — `BreedService.create` передает `kind` в repository.
- [x] Unit: horse_kind_to_breed_migration — `BreedService.create` без `kind` создает `kind=horse`.
- [x] Unit: horse_kind_to_breed_migration — `BreedService.update` меняет `kind` и сохраняет остальные поля.
- [x] Unit: horse_kind_to_breed_migration — `BreedService.update` с `kind=None` не делает поле NULL.
- [x] Unit: horse_kind_to_breed_migration — `BreedRepository.get_filtered(kind=[horse])` строит WHERE по `breeds.kind`.
- [x] Unit: horse_kind_to_breed_migration — `BreedRepository.get_filtered(kind=[pony])` возвращает только pony и корректный total.
- [x] Unit: horse_kind_to_breed_migration — `BreedRepository.get_filtered(kind=[horse, pony])` возвращает обе группы без дублей.
- [x] Unit: horse_kind_to_breed_migration — `BreedRepository.get_filtered(sort=["kind"])` сортирует ASC.
- [x] Unit: horse_kind_to_breed_migration — `BreedRepository.get_filtered(sort=["-kind"])` сортирует DESC.
- [x] Unit: horse_kind_to_breed_migration — `HorseCreateInDto` больше не содержит `kind`.
- [x] Unit: horse_kind_to_breed_migration — `HorseUpdateInDto` больше не содержит `kind`.
- [x] Unit: horse_kind_to_breed_migration — `HorseService.create_horse` не читает `create_data.kind`.
- [x] Unit: horse_kind_to_breed_migration — `HorseService.update_horse` не ожидает и не записывает horse-level kind.
- [x] Unit: horse_kind_to_breed_migration — `HorseOutDto` schema/model fields не содержит `kind`.
- [x] Unit: horse_kind_to_breed_migration — nested pedigree DTO schema/model fields не содержат `kind`.
- [x] Unit: horse_kind_to_breed_migration — `_build_horse_dto` не добавляет `kind` в list/detail DTO.
- [x] Unit: horse_kind_to_breed_migration — `_build_horse_dto` для `breed=None` возвращает DTO без fallback `kind`.
- [x] Unit: horse_kind_to_breed_migration — horse list filter `kind=[horse]` использует `breeds.kind` и items без horse-level `kind`.
- [x] Unit: horse_kind_to_breed_migration — horse list sort `kind` использует `breeds.kind ASC`, items без horse-level `kind`.
- [x] Unit: horse_kind_to_breed_migration — horse list sort `-kind` использует `breeds.kind DESC`, items без horse-level `kind`.
- [x] Unit: horse_kind_to_breed_migration — horse detail by id не содержит horse-level `kind`.
- [x] Unit: horse_kind_to_breed_migration — horse detail by slug не содержит horse-level `kind`.
- [x] Unit: horse_kind_to_breed_migration — list with `pedigree=1` строит вложения без horse-level `kind`.
- [x] Unit: horse_kind_to_breed_migration — available sire подбирается по `breed.kind` target без horse DTO `kind`.
- [x] Unit: horse_kind_to_breed_migration — available dam подбирается по `breed.kind` target без horse DTO `kind`.
- [x] Unit: horse_kind_to_breed_migration — set pedigree запрещает parent/foal другого `breed.kind`.
- [x] Unit: horse_kind_to_breed_migration — set pedigree разрешает связь при совпадающем `breed.kind`.
- [x] Unit: horse_kind_to_breed_migration — `limit/offset` clamp сохраняется при kind filter.
- [x] Unit: horse_kind_to_breed_migration — protected breed writes: `401/403/success`.
- [x] Unit: horse_kind_to_breed_migration — protected horse writes: `401/403/success`.
- [x] Unit: horse_kind_to_breed_migration — horse create/update request validation возвращает `422` для body field `kind`.
- [x] Smoke: horse_kind_to_breed_migration — real PostgreSQL содержит `breeds.kind NOT NULL` со значениями `horse/pony`.
- [x] Smoke: horse_kind_to_breed_migration — real PostgreSQL не содержит `horse.kind`.
- [x] Smoke: horse_kind_to_breed_migration — после миграции есть pony-породы при количестве пород >= 2.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses/breeds?limit=10` без auth cookie возвращает `kind`.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses/breeds?kind=horse` возвращает только horse.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses/breeds?kind=pony` возвращает только pony.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses/breeds?kind=horse&kind=pony` возвращает обе группы.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses/breeds?sort=kind` сортирует ASC.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses/breeds?sort=-kind` сортирует DESC.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses/breeds/{BREED_PONY_ID}` возвращает `kind=pony`.
- [x] Smoke: horse_kind_to_breed_migration — `POST /horses/breeds` без auth cookie возвращает `401`.
- [x] Smoke: horse_kind_to_breed_migration — `POST /horses/breeds` с no-scope user возвращает `403`.
- [x] Smoke: horse_kind_to_breed_migration — `POST /horses/breeds` без `kind` создает `kind=horse`.
- [x] Smoke: horse_kind_to_breed_migration — `POST /horses/breeds` с `kind=pony` создает pony.
- [x] Smoke: horse_kind_to_breed_migration — `PATCH /horses/breeds/{id}` меняет kind.
- [x] Smoke: horse_kind_to_breed_migration — `PATCH /horses/breeds/{id}` без auth cookie возвращает `401`.
- [x] Smoke: horse_kind_to_breed_migration — `PATCH /horses/breeds/{id}` с no-scope user возвращает `403`.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses?kind=horse` фильтрует через `breeds.kind`, items без horse-level `kind`.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses?kind=pony` фильтрует через `breeds.kind`, items без horse-level `kind`.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses?sort=kind` сортирует по `breeds.kind ASC`, items без horse-level `kind`.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses?sort=-kind` сортирует по `breeds.kind DESC`, items без horse-level `kind`.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses/{HORSE_WITH_PONY_BREED_ID}` не возвращает horse-level `kind`.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses/{HORSE_WITH_HORSE_BREED_ID}` не возвращает horse-level `kind`.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses/{HORSE_WITHOUT_BREED_ID}` не возвращает fallback `kind=horse`.
- [x] Smoke: horse_kind_to_breed_migration — `POST /horses` без `kind` создает лошадь и response без horse-level `kind`.
- [x] Smoke: horse_kind_to_breed_migration — `GET /openapi.json` показывает, что horse create/update body DTO не содержит `kind`.
- [x] Smoke: horse_kind_to_breed_migration — `PATCH /horses/{id}` со сменой breed возвращает response без horse-level `kind`.
- [x] Smoke: horse_kind_to_breed_migration — `PATCH /horses/{id}` без auth cookie возвращает `401`.
- [x] Smoke: horse_kind_to_breed_migration — `PATCH /horses/{id}` с no-scope user возвращает `403`.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses/{horse_id}/pedigree/sire` для pony target фильтрует по `breed.kind=pony`, candidates без horse-level `kind`.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses/{horse_id}/pedigree/dam` для horse target фильтрует по `breed.kind=horse`, candidates без horse-level `kind`.
- [x] Smoke: horse_kind_to_breed_migration — `POST /horses/{horse_id}/pedigree` с несовпадающим `breed.kind` отклоняется.
- [x] Smoke: horse_kind_to_breed_migration — `POST /horses/{horse_id}/pedigree` с совпадающим `breed.kind` сохраняет связь, nested DTO без horse-level `kind`.
- [x] Smoke: horse_kind_to_breed_migration — `GET /horses?breed_ids={BREED_PONY_ID}&kind=horse` применяет оба фильтра строго, items без horse-level `kind`.
- [x] Smoke: horse_kind_to_breed_migration — `POST /horses/{horse_id}/photos` без auth cookie возвращает `401`, read DTO без horse-level `kind`.
- [x] Smoke: horse_kind_to_breed_migration — `POST /horses` с extra body field `kind` возвращает `422`.
- [x] Smoke: horse_kind_to_breed_migration — `PATCH /horses/{id}` с extra body field `kind` возвращает `422`.
- [x] Запустить backend unit tests: `cd services/backend && uv run pytest tests/unit`.
- [x] Запустить backend lint/type checks по принятому локальному набору: `cd services/backend && uv run ruff check src tests`.

### Frontend

- [x] Обновить `services/frontend/src/types/api/horses.ts`: убрать `kind` из create/update DTO, `HorseOutDto` и nested pedigree DTO.
- [x] Обновить `services/frontend/src/types/api/horseBreeds.ts`: добавить `kind` в DTO/query/sort.
- [x] Обновить `services/frontend/src/api/horses.ts`: проверить payload без `kind` и list query with `kind`.
- [x] Обновить `services/frontend/src/api/horseBreeds.ts`: поддержать `kind` query/body через типы.
- [x] Обновить `services/frontend/src/features/horses/validators/horses.ts`: удалить `kind`.
- [x] Обновить `services/frontend/src/features/horses/validators/horseBreeds.ts`: добавить `kind`.
- [x] Обновить `services/frontend/src/features/horses/hooks/useHorses.ts`: default `kind` пустой.
- [x] Обновить `useHorses`: active `breed_ids` очищает `kind`, disables type filter и не отправляет `kind` в horses query.
- [x] Обновить `useHorses`: filter/search/sort changes reset `offset=0`; page change меняет только offset; page size меняет `limit` и offset.
- [x] Обновить `services/frontend/src/features/horses/hooks/useHorseBreeds.ts`: kind filter/sort и pagination offset reset.
- [x] Реализовать перезапрос breed selector options по выбранному horse type filter.
- [x] Обновить `HorsesTable.tsx`: удалить колонку «Тип».
- [x] Обновить `HorsesTable.tsx`: оставить type filter control disabled/cleared при active breed filter.
- [x] Обновить `HorseCreateUpdateModal.tsx`: убрать selector/state/payload `kind`.
- [x] Обновить `HorseBreedsTable.tsx`: добавить колонку «Тип» с inline filter.
- [x] Обновить `HorseBreedsTable.tsx`: добавить sort mapping `kind/-kind`.
- [x] Обновить `HorseBreedsCreateUpdateModal.tsx`: добавить selector «Тип» default `horse`.
- [x] Обновить `services/frontend/src/app/(protected)/horses/page.tsx`: связать filters/options/modals без direct API calls.
- [x] API-boundary test: `horseList` сериализует `kind`, `limit`, `offset`, `sort`, без `page/pageSize`.
- [x] API-boundary test: `horseCreate` и `horseUpdate` не отправляют `kind`.
- [x] API-boundary/type test: horse list/detail/pedigree response mocks and types не ожидают horse-level `kind`.
- [x] API-boundary test: `horseBreedList` сериализует `kind` и `sort=kind`.
- [x] API-boundary test: `horseBreedCreate`/`horseBreedUpdate` отправляют `kind` и surface `401/403`.
- [x] Hook test: `useHorses` default `kind` пустой и не отправляется.
- [x] Hook test: выбор `kind` сбрасывает offset и перезапрашивает breeds selector.
- [x] Hook test: active `breed_ids` очищает `kind`, disabled state и query без `kind`.
- [x] Hook test: очистка `breed_ids` включает type filter, но не восстанавливает предыдущее значение `kind`.
- [x] Hook test: pagination initial `{ limit, offset }`.
- [x] Hook test: page change меняет offset.
- [x] Hook test: page size change resets offset.
- [x] Hook test: filter/search/sort resets offset.
- [x] Hook test: `useHorseBreeds` kind filter apply/clear.
- [x] Hook test: `useHorseBreeds` sort `kind/-kind`.
- [x] Component test: `HorsesTable` не рендерит колонку «Тип».
- [x] Component test: `HorsesTable` data/loading/empty/error states сохраняются.
- [x] Component test: `HorsesTable` type filter disabled при active breed filter.
- [x] Component test: `HorseCreateUpdateModal` не рендерит selector «Тип».
- [x] Component test: `HorseCreateUpdateModal` submit payload без `kind`.
- [ ] Component test: `HorseCreateUpdateModal` scope present/missing для protected write actions.
- [x] Component test: `HorseBreedsTable` рендерит колонку «Тип» и labels `Лошадь/Пони`.
- [x] Component test: `HorseBreedsTable` inline type filter apply/clear.
- [x] Component test: `HorseBreedsTable` sort calls `kind/-kind`.
- [x] Component test: `HorseBreedsCreateUpdateModal` default type `horse`.
- [x] Component test: `HorseBreedsCreateUpdateModal` submit create/update includes selected `kind`.
- [x] Component/API-boundary tests cover MSW success, empty, validation error, generic error, `401`, `403`.
- [x] Tests must block live backend calls; no unit/component/API-boundary test may call real backend.
- [ ] CMS route access test/manual check: anonymous redirect/block and authenticated render.
- [ ] Scopes/permissions test/manual check: scope present, scope missing, hidden/disabled/guarded action.
- [ ] Protected Write UX test/manual check: mutation guard, double-submit guard, backend `401/403` surfaced.
- [ ] No `site-*` mixing self-check: do not import consumer code into CMS frontend.
- [x] Run from `services/frontend`: `npm test`.
- [x] Run from `services/frontend`: `npm run lint`.
- [x] Run from `services/frontend`: `npx tsc --noEmit`.
- [x] Run from `services/frontend`: `npm run build`.
- [x] Run frontend rg check: `rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'`.
- [x] Run frontend rg check: `rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'`.
- [x] Run frontend rg check: `rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'`.
- [x] Run frontend rg check: `rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'`.
- [x] Run frontend structure check: `find services/frontend/src -maxdepth 2 -type d \\( -name shared -o -name widgets -o -name entities \\)`.
- [ ] Выполнить Manual QA steps и приложить QA-отчет с failed screenshots/network details при наличии failures.

### Quality Gate

- [x] Проверить, что diff не меняет `services/site-*`.
- [x] Проверить, что реализация соответствует порядку Backend -> Frontend -> Quality Gate.
- [x] Проверить миграцию: `down_revision="c1e4d2a3b5f7"`, `breeds.kind NOT NULL`, удаление `horse.kind`, downgrade.
- [x] Проверить, что migration SQL не переносит значения с лошадей, а заполняет породы как `horse` и случайно обновляет половину до `pony`.
- [x] Проверить Access matrix для всех endpoint'ов плана.
- [x] Проверить Public Read: `GET` без auth cookie работает по public read contract.
- [x] Проверить Protected Write: `POST/PATCH/DELETE` без auth -> `401`, без scope -> `403`, с admin scope -> success.
- [x] Проверить отсутствие незадокументированных access exceptions.
- [x] Проверить, что `HorseOutDto` и nested pedigree DTO не содержат horse-level `kind`.
- [x] Проверить, что horse filter/sort по query `kind` использует `breeds.kind`, а не удаленное `horse.kind`, и не добавляет `kind` в horse response.
- [x] Проверить, что breeds filter/sort по `kind` реализован и покрыт тестами.
- [x] Проверить, что horse create/update DTO и frontend payload больше не содержат `kind`.
- [x] Проверить, что horse create/update request body с extra `kind` не поддерживается и покрыт `422` тестами.
- [x] Проверить backend unit tests: минимум 30 сценариев из плана, не однотипные happy paths.
- [x] Проверить backend smoke plan/execution: минимум 30 сценариев через `.claude/skills/api-smoke-test`, не pytest-файлы.
- [x] Проверить, что smoke использует real PostgreSQL параметры через `docker inspect`, не hardcode.
- [x] Запустить `cd services/backend && uv run pytest tests/unit`.
- [x] Запустить `cd services/backend && uv run ruff check src tests`.
- [x] Проверить frontend test matrix относительно behavior diff.
- [x] Проверить MSW/no live backend calls в frontend unit/component/API-boundary tests.
- [x] Проверить frontend pagination coverage: initial `limit/offset`, page change, page size change, reset `offset` on filter/search/sort.
- [ ] Проверить frontend access/scopes scenarios: anonymous/authenticated, scope present/missing, Protected Write UX, `401/403`.
- [x] Запустить `cd services/frontend && npm test`.
- [x] Запустить `cd services/frontend && npm run lint`.
- [x] Запустить `cd services/frontend && npx tsc --noEmit`.
- [x] Запустить `cd services/frontend && npm run build`.
- [x] Запустить rg check `fetch\\(|axios` и убедиться, что raw calls остаются только в API boundary.
- [x] Запустить rg check импортов `@/api` и убедиться, что components/pages не вызывают API напрямую.
- [x] Запустить rg check `page/pageSize/page_size` и убедиться, что API boundary использует только `limit/offset`.
- [x] Запустить rg check `site-ad|site-*|Public Read|public read` в frontend и убедиться, что нет consumer mixing.
- [ ] Проверить responsive/manual QA отчет: desktop/tablet/mobile без overlap таблиц, фильтров и modal controls.
- [x] Проверить, что чеклист Backend и Frontend обновлен агентами по мере выполнения, без массовой отметки в конце.

Отчёт: `docs/reports/horse_kind_to_breed_migration-review.md`
