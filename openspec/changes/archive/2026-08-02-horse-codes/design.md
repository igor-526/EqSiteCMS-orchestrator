## Context

Текущая `horse`-модель хранится в PostgreSQL через SQLAlchemy Core, преобразуется в Pydantic entity и `HorseOutDto`, а расширенные pedigree DTO наследуют/включают базовую horse-схему. Create/update выполняются через `HorseCreateInDto`/`HorseUpdateInDto`. CMS использует типы `src/types/api/horses.ts`, Zod-валидаторы, `useHorses`, таблицу и общий create/update modal. Поля `code` сейчас нет ни на одном слое.

Затронуты `services/backend` и `services/frontend`. `services/site-ad`, NATS/AsyncAPI и endpoint paths не меняются. План основан на `docs/tasks/025_horse_codes.md`; `docs/plans` использован только как read-only контекст.

## Goals / Non-Goals

**Goals:**

- хранить у лошади nullable `code` как произвольную строку длиной `0..31` символов;
- принимать поле в create и partial update и возвращать во всех схемах, представляющих лошадь;
- показать код отдельной колонкой CMS и редактировать одним строковым полем в create/edit modal;
- сохранить tenant isolation, Public Read/Protected Write и существующие permission scopes;
- дать проверяемое покрытие backend (30+ unit, 30+ live smoke) и frontend behavior diff.

**Non-Goals:**

- уникальность, поиск, фильтрация или сортировка по `code`;
- нормализация, trim, изменение регистра либо семантическая проверка формата кода;
- обязательность или backfill существующих записей;
- отображение кода в `services/site-ad`;
- изменение delete, photos/pedigree mutation payload, auth, NATS или AsyncAPI.

## Decisions

### 1. Nullable `VARCHAR(31)` без server default

Миграция добавляет `horse.code VARCHAR(31) NULL`. Существующие строки получают `NULL`, поэтому миграция не требует backfill и безопасна для rolling deployment. Пустая строка сохраняется как значение, потому что исходный контракт разрешает «любую строку»; frontend/backend не выполняют trim. Уникальный индекс не создаётся: идентификатор может происходить из внешних систем, а требование уникальности отсутствует.

Альтернатива `NOT NULL DEFAULT ''` отклонена: она смешивает «код неизвестен» и «явно пустой код» и создаёт лишний default. Альтернатива `TEXT + CHECK` отклонена в пользу согласованного ограничения `String(31)` и Pydantic `max_length=31`.

### 2. Один сквозной контракт поля

`code: str | None = Field(default=None, max_length=31)` добавляется в `Horse`, `HorseCreateInDto`, `HorseUpdateInDto` и `HorseOutDto`; update использует `model_fields_set`, поэтому явный `null` очищает код, а отсутствие поля сохраняет прежнее значение. Репозиторные full-info выборки и service DTO mapping обязаны не терять поле. Благодаря наследованию/композиции код появляется в list/detail, pedigree ancestors/foals/candidates и mutation responses, где уже возвращается horse DTO.

Альтернатива отдельной response-модели только для CRUD отклонена: она нарушила бы требование «все схемы, возвращающие horse» и создала расхождения вложенных DTO.

### 3. API-доступ не меняется

Все GET остаются Public Read в tenant context: anonymous consumer получает `200` при валидном `X-Equestrian-Service-Key`, `400` без tenant selector и `404` при неизвестном key. CMS cookie также даёт `200` в tenant пользователя. `POST/PATCH` остаются Protected Write: без валидной auth — `401`, с ролью `SUPERUSER|ADMIN|DEVELOPER` — `200`, без нужного scope — `403`; чужой tenant resource для PATCH маскируется текущим контрактом как `400` «не найден».

Структурная Pydantic/FastAPI-валидация также следует существующему глобальному `RequestValidationError` handler backend и возвращает `400`, поэтому code длиной 32 символа для POST/PATCH ожидаемо получает `400`, а не стандартный FastAPI `422`. Это фиксация действующего контракта, а не новый exception к access policy и не основание менять runtime handler.

Исключений из дефолтной policy нет. Добавление поля не расширяет доступ и не раскрывает межtenant данные.

### 4. CMS UI остаётся тонкой границей

Frontend DTO принимают `code: string | null`, create/update payload — optional nullable field. Zod ограничивает значение 31 символом без trim. Modal использует обычный `Input` с `maxLength={31}`, label «Код», заполняет исходное `null`/значение при edit и передаёт `null` для очистки по принятому form-паттерну. Таблица получает колонку «Код» и отображает пустое значение устойчиво (`—` либо существующий table empty renderer); server-side filter/sort не добавляются.

Доступ к странице остаётся через protected layout. Create/edit actions доступны только при существующих scopes; UI guard не заменяет backend denial. Компонентные/API-boundary тесты используют MSW/mocks без live backend calls.

### 5. Ownership и порядок

1. **Backend owner**: только `services/backend/**`; модель, migration, entity/DTO/mapping/repository и backend unit tests; затем 30+ smoke через skill на живом API и реальной PostgreSQL. Smoke не создаются как pytest-файлы.
2. **Frontend owner**: только `services/frontend/**`, после стабилизации backend-контракта; типы/validator/table/modal и frontend tests. `site-*` не трогать.
3. **Quality Gate owner**: read-only review совокупного diff и проверки; evidence — в `docs/reports/**`. Findings возвращаются владельцам, после исправлений выполняется повторный единый gate.
4. После успешного gate Router синхронизирует delta specs, валидирует main specs и архивирует change.

## Access matrix

| method | path | access class | roles | expected without auth | expected with auth | связанные проверки |
|---|---|---|---|---|---|---|
| `GET` | `/api/horses` | Public Read | anonymous с tenant key; либо CMS user | `200` с валидным key; `400` без key; `404` с неизвестным key | `200` в tenant пользователя | U-13..U-18, SM-01..SM-08 |
| `GET` | `/api/horses/{slug_or_id}` | Public Read | anonymous с tenant key; либо CMS user | `200` с валидным key; `400` без key; `404` с неизвестным key/resource | `200` в tenant пользователя | U-19..U-23, SM-09..SM-14 |
| `GET` | `/api/horses/{id}/pedigree/{mode}` и horse responses с pedigree | Public Read | anonymous с tenant key; либо CMS user | `200` с валидным key; tenant errors как выше | `200` в tenant пользователя | U-24..U-27, SM-15..SM-18 |
| `POST` | `/api/horses` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `200`; без scope `403`; invalid length `400` через глобальный validation handler | U-01..U-06, U-28, SM-19..SM-24 |
| `PATCH` | `/api/horses/{horse_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `200`; без scope `403`; чужой tenant `400`; invalid length `400` через глобальный validation handler | U-07..U-12, U-29..U-30, SM-25..SM-32 |

Исключений нет: матрица следует дефолту Public Read/Protected Write. Photos/pedigree write endpoints не принимают `code` и не изменяются; их horse response при наличии обязан сериализовать новое поле.

## Backend test plan

### Unit-тесты backend-фичи horse code

| ID | Сценарий |
|---|---|
| U-01 | Entity принимает `code=None`. |
| U-02 | Entity принимает пустую строку. |
| U-03 | Entity сохраняет пробелы без trim. |
| U-04 | Entity принимает Unicode/кириллицу и спецсимволы. |
| U-05 | Entity принимает ровно 31 символ. |
| U-06 | Entity отклоняет 32 символа. |
| U-07 | Create DTO без поля даёт `None`. |
| U-08 | Create DTO принимает пустую строку. |
| U-09 | Create DTO принимает 31 символ. |
| U-10 | Create DTO отклоняет 32 символа с validation error. |
| U-11 | Update DTO различает отсутствующее поле и `code=None`. |
| U-12 | Update DTO отклоняет 32 символа до repository mutation. |
| U-13 | Service create передаёт code в entity/repository. |
| U-14 | Service create без code сохраняет NULL. |
| U-15 | Service create сохраняет пустую строку. |
| U-16 | Service create не пишет при невалидном code. |
| U-17 | Service update меняет только code, сохраняя прочие поля. |
| U-18 | Service update с `code=None` очищает code. |
| U-19 | Service update без code не очищает существующее значение. |
| U-20 | Repository insert statement содержит code. |
| U-21 | Repository update statement содержит code только при явной передаче. |
| U-22 | Full-info list row мапится в HorseOutDto с code. |
| U-23 | Detail по UUID возвращает code. |
| U-24 | Detail по slug возвращает code. |
| U-25 | HorseWithPedigreeOutDto сериализует code корневой лошади. |
| U-26 | Pedigree sire/dam сериализуют собственные code/NULL. |
| U-27 | Foal DTO и parent refs не теряют code там, где схема представляет полную horse. |
| U-28 | Anonymous create отклонён `401`, repository не вызван. |
| U-29 | Authenticated user без scope получает `403`, repository не вызван. |
| U-30 | PATCH чужого tenant ID возвращает `400` и не меняет запись. |
| U-31 | List pagination `limit/offset` сохраняется после расширения row mapping. |
| U-32 | Nullable code корректно сериализуется в JSON как `null`. |

### Smoke-тесты backend-фичи horse code

Все сценарии выполняются skill `.claude/skills/api-smoke-test` на живом API, не pytest, с переменными `BASE_URL`, `SERVICE_KEY`, auth cookie, `HORSE_ID`, `HORSE_SLUG`, `OTHER_TENANT_HORSE_ID`. Созданные данные очищаются защищёнными API-вызовами.

| ID | Запрос и проверка |
|---|---|
| SM-01 | Anonymous `GET /horses` с валидным key → `200`, каждый item содержит `code`. |
| SM-02 | То же с записью `code=null` → JSON `null`. |
| SM-03 | То же с пустым code → `""`. |
| SM-04 | То же с Unicode code → точное значение. |
| SM-05 | List с `limit=1&offset=0` → code первой записи и корректная pagination. |
| SM-06 | List с `offset=1` → code не теряется. |
| SM-07 | Anonymous list без key/cookie → `400`. |
| SM-08 | Anonymous list с неизвестным key → `404`. |
| SM-09 | Anonymous detail по UUID с key → `200` и code. |
| SM-10 | Anonymous detail по slug с key → `200` и code. |
| SM-11 | Detail code `null` → JSON `null`. |
| SM-12 | Detail по чужому tenant/key не раскрывает запись (`400/404` по фактическому contract). |
| SM-13 | Detail без tenant selector → `400`. |
| SM-14 | Authenticated detail → `200` и code tenant пользователя. |
| SM-15 | `GET /horses/{id}?pedigree=1` → root code присутствует. |
| SM-16 | Pedigree sire/dam содержат собственные code. |
| SM-17 | Pedigree foal full DTO содержит code. |
| SM-18 | Pedigree candidate GET возвращает items с code. |
| SM-19 | Authenticated POST без code → `200`, code `null`, DB реально содержит NULL. |
| SM-20 | POST с пустым code → `200`, пустая строка сохраняется. |
| SM-21 | POST с ASCII code → `200`, round-trip exact. |
| SM-22 | POST с Unicode/спецсимволами → `200`, round-trip exact. |
| SM-23 | POST с ровно 31 символом → `200`. |
| SM-24 | POST с 32 символами → `400` от глобального validation handler, запись не создана. |
| SM-25 | Anonymous POST с code → `401`. |
| SM-26 | Authenticated без scope POST → `403`. |
| SM-27 | PATCH только code → `200`, прочие поля неизменны. |
| SM-28 | PATCH code на пустую строку → `200`. |
| SM-29 | PATCH code на `null` → `200`, DB NULL. |
| SM-30 | PATCH без code сохраняет прежний code. |
| SM-31 | PATCH ровно 31 символ → `200`. |
| SM-32 | PATCH 32 символа → `400` от глобального validation handler, прежний code сохранён. |
| SM-33 | Anonymous PATCH → `401`. |
| SM-34 | Authenticated без scope PATCH → `403`. |
| SM-35 | PATCH чужого tenant ID → `400`, чужая запись не изменена. |
| SM-36 | Create response и последующие list/detail возвращают одинаковый code. |
| SM-37 | Update response и последующие list/detail возвращают одинаковый code. |
| SM-38 | Photos update response, возвращающий HorseOutDto, сохраняет code. |
| SM-39 | Перезапуск API не меняет сохранённый code в PostgreSQL. |
| SM-40 | Cleanup созданных записей защищённым DELETE → `204`, исходные данные не затронуты. |

### PostgreSQL для smoke-тестов

02.08.2026 контейнер найден основным label-поиском и проверен `docker inspect`:

- container: `eqsitecms-db`, ID `0905da513e53e06853c5fa8e76cec0e7f3a5f65af51aa6265a98a2072377caeb`;
- image: `postgres:16`;
- labels: project `eqsitecms`, service `db`;
- aliases: `eqsitecms-db`, `db` в `eqsitecms_network`;
- inspect env: `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`;
- inspect host binding: `5432/tcp -> 5433`.

Исполнитель MUST повторить label discovery и `docker inspect` непосредственно перед smoke; эти значения — evidence планирования, не хардкод тестового runner. Проверка SQL состояния выполняется только против этой реальной PostgreSQL, не SQLite/mock/in-memory.

## Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| `types/api/horses.ts`, validator, service/API boundary | code проходит в response/create/update, 31 допустимо, 32 отклоняется | unit + MSW body/response success, null, validation, generic error, `401`, `403`; запрет live calls | anonymous CMS blocked layout; authenticated API; denial surfaced | `npm test`; `npx tsc --noEmit` |
| `HorsesTable` | колонка «Код» показывает string/null при data/loading/empty/error и не ломает interactions | минимум component: data, null, loading, empty, error, action permission | scope present/missing; action hidden/disabled | `npm test -- HorsesTable`; `npm run lint` |
| `HorseCreateUpdateModal` | поле code create/edit, max 31, clear/null, сохраняет state при error | open/close, initial edit value, valid submit, 31, 32 validation, clear, backend validation/generic/401/403, success invalidation, double-submit | scope present/missing; guarded mutation | `npm test -- HorseCreateUpdateModal`; `npm run build` |
| `/horses`, `useHorses` | code survives list/load/create/update refresh; pagination unchanged | authenticated render, mocked success/empty/errors; initial `limit/offset`, page change, page size, filter/sort reset offset | anonymous redirect; authenticated render; scopes | `npm test`; `npx tsc --noEmit` |
| boundary audit | no consumer imports/direct fetch and no new page params | `rg` checks + review | CMS vs Public Read separation | обязательные `rg` ниже |

## Manual QA steps (UI тестирование)

Предусловия: backend/frontend и PostgreSQL подняты; миграция применена; есть пользователи (а) `SUPERUSER|ADMIN|DEVELOPER`, (б) authenticated без horse write scope; известен `/horses`; DevTools Network открыт. Для проверки denial можно использовать controlled proxy/MSW/dev environment, возвращающий `401/403` на mutation.

1. В anonymous browser session открыть `/horses`: ожидать redirect/block на login, таблица и значения code не раскрываются.
2. Войти разрешённым пользователем, открыть `/horses`, вкладку «Лошади»: ожидать таблицу с колонкой «Код», loading без layout shift, затем данные; `null` отображается нейтрально, длинное до 31 символа не перекрывает соседние колонки/actions.
3. Проверить desktop ≥1440 px, tablet 768–1024 px, mobile 360–430 px: horizontal scroll работает, fixed/actions доступны, header/table/modal text, buttons и поля не overlap/clip.
4. Нажать «Создать»: modal открывается с пустым «Код». Ввести ASCII, Unicode, пробелы/спецсимволы и сохранить допустимое значение; ожидать один POST, disabled/loading submit во время запроса, закрытие modal и refresh/invalidation таблицы с точным code.
5. Повторить create с ровно 31 символом: успешно. Ввести 32 символа (включая paste): Input ограничивает либо validator показывает понятную ошибку; POST не отправляется.
6. Открыть edit для строки с code: поле предзаполнено точным значением. Изменить только code; ожидать один PATCH, остальные данные не меняются, таблица обновляется.
7. Очистить code в edit и сохранить: ожидать PATCH с согласованным `null`, после refresh таблица показывает пустое значение; повторное открытие modal не восстанавливает старый code.
8. Имитировать backend validation `400` для code: modal остаётся открыт, введённое значение сохраняется, ошибка видима; таблица не показывает ложный успех.
9. Имитировать generic/network error: modal/form state сохраняется, доступен retry; успешный retry отправляется один раз и refresh выполняется один раз.
10. Имитировать `401`: mutation не считается успешной, denial/auth flow отображается согласно общему клиенту. Имитировать `403`: видна ошибка недостаточных прав, modal state сохраняется.
11. Войти пользователем без horse write scope: страница/таблица доступны в authenticated CMS, create/edit controls скрыты/disabled; попытка вызвать handler/двойной submit не отправляет mutation.
12. Проверить scope present для каждой роли `SUPERUSER`, `ADMIN`, `DEVELOPER`: create/edit доступны и backend разрешает операцию. UI guard и backend statuses сверить в Network.
13. Проверить list pagination: initial request содержит текущие `limit/offset`; переход страницы меняет offset, page size сбрасывает offset; существующий filter/search/sort сбрасывает offset в `0`; code остаётся в строках после каждого reload.
14. Проверить loading, empty и forced list error: новая колонка не ломает состояния и action callbacks; после retry данные и code появляются.
15. Проверить create/edit modal на трёх viewport: label/input/error/helper не overlap, footer buttons видимы, keyboard Tab/focus и Esc/close соответствуют текущему modal behavior.
16. Регрессия: открыть pedigree/photos для лошади с code и выполнить поддерживаемое действие; code после response/invalidation не исчезает. В `site-ad` выполнить текущие horse flows: визуальных изменений не ожидается, consumer не импортирует CMS code UI.
17. QA report фиксирует passed/failed для каждого шага; для failed responsive/error/permission cases прикладывает screenshots, для API failures — method/path/status/body из Network без секретов.

## Risks / Trade-offs

- [Не все вложенные horse DTO обновятся автоматически] → проверить наследование и repository row mapping для root/pedigree/foal/candidate/photos response unit и smoke сценариями.
- [PATCH не различит omitted и explicit null] → использовать существующий `model_fields_set`/exclude-unset pattern и отдельные тесты.
- [Frontend `maxLength` скроет backend validation] → сохранить Zod max-31 и API-boundary validation-`400` test, проверить paste и программную mutation guard.
- [Расширение публичного DTO раскрывает внешний идентификатор] → это явное требование «весь GET/LIST»; tenant isolation остаётся прежней, межtenant smoke обязателен.
- [Rolling deploy: новый backend до migration] → порядок deployment: migration перед новым backend; rollback приложения совместим с лишней nullable колонкой.

## Migration Plan

1. Повторить DB discovery/inspect и снять состояние текущей migration head.
2. Добавить/проверить Alembic revision `ADD COLUMN code VARCHAR(31) NULL`; upgrade до новой версии.
3. Развернуть backend, выполнить unit и live smoke на реальной PostgreSQL.
4. Развернуть frontend после доступности backend response/payload contract; выполнить automated и Manual QA.
5. Rollback: сначала вернуть frontend/backend к версии, игнорирующей поле, затем downgrade migration с удалением `code`. Значения code при downgrade теряются, поэтому production downgrade требует backup/export.

## Open Questions

Открытых продуктовых вопросов нет. Принятые уточнения: `code` nullable, пустая строка допустима, не unique, без trim/search/sort; consumer UI не меняется. Перед apply требуется явное пользовательское подтверждение этих артефактов.
