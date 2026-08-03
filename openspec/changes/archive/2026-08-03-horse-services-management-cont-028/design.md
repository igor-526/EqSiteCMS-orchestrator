## Context

Задача продолжает уже архивированную реализацию 027. Фактический код в `services/backend` и `services/frontend` находится на `main`; CI указал три `F401`. Таблица `horse_service_relations` содержит UUID и override-поля, но не использует `timestamp_columns()`, поэтому порядок связей не отражает время создания. Frontend уже сериализует массивы повторяемыми query keys через `addQueryParamsToUrl`, а FastAPI принимает существующие list-фильтры как `list[UUID]`.

Изменение затрагивает Backend Core и Frontend CMS. `site-ad` не меняется, но новый фильтр `GET /api/horses` остаётся частью Public Read API. Существующие relation mutations выполняются только через Protected Write и horse write scopes.

PostgreSQL для live smoke обнаружена 2026-08-03 через labels `com.docker.compose.project=eqsitecms` и `com.docker.compose.service=db`: контейнер `eqsitecms-db` (`0905da513e53`), image `postgres:16`, aliases `eqsitecms-db`/`db`, `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`, host port `5433`. Исполнитель MUST повторить discovery и `docker inspect` непосредственно перед smoke, потому что окружение может измениться.

## Goals / Non-Goals

**Goals:**

- обеспечить безопасную хронологию и стабильный default order связей;
- добавить OR-фильтр лошадей по UUID услуг без нарушения tenant isolation и pagination count;
- сделать create-modal предсказуемой: выбранная услуга заполняет реальные override-поля;
- унифицировать три индикатора действий и сделать badge серым;
- закрыть CI-дефекты и дать воспроизводимое automated/live/browser evidence;
- разделить реализацию на непересекающиеся deliverables и завершить общим Quality Gate, sync и archive.

**Non-Goals:**

- изменение `site-ad`, relation endpoint paths или permission model;
- AND-семантика service-фильтра;
- drag-and-drop/manual ordering связей;
- удаление существующих relation rows;
- новый page-based API contract или новая общая UI-библиотека badge.

## Decisions

### D1. Временная колонка и порядок

Модель связи получает `created_at` через совместимый с проектом timestamp column contract. Alembic upgrade сначала добавляет nullable колонку с PostgreSQL server default `now()`, заполняет существующие `NULL`, затем делает её `NOT NULL`; server default сохраняется, если это соответствует действующему `timestamp_columns()`, иначе модель и migration должны иметь единый источник значения. Данные не удаляются. Default query order: `created_at DESC, id DESC`, чтобы одинаковые timestamps давали стабильный результат. Downgrade удаляет только колонку.

Альтернатива drop всех связей отклонена: пользователь разрешил её только как запасной путь, а backfill безопаснее и обратимее.

### D2. Фильтр `services`

`GET /api/horses` принимает `services: list[UUID] | None`. Wire format повторяет существующий контракт массивов: `?services=<uuid-1>&services=<uuid-2>`. Пустой/отсутствующий список не фильтрует. Непустой список применяет OR через tenant-safe `EXISTS` по `horse_service_relations` и `horse_service`; лошадь возвращается один раз, если связана хотя бы с одной указанной услугой. Те же predicates влияют на data query и count query. UUID услуги другого tenant не раскрывает данные и даёт пустую выдачу.

Альтернатива JOIN в основном запросе отклонена из-за риска дублей, ошибочного count и нестабильной pagination.

### D3. Семантика автозаполнения override

При выборе доступной услуги create-modal копирует её `description`, `price` и `price_formatter` в controlled form state. Это реальные override values: submit отправляет их в `description_override`, `price_override`, `price_formatter_override`. Пользователь может изменить либо явно очистить значения; очистка сериализуется как `null` по DTO-контракту. При смене выбранной услуги значения полностью заменяются defaults новой услуги. Edit-mode сохраняет текущую relation semantics и readonly service.

Trade-off: последующие изменения справочника не обновят сохранённый override. Это осознанное следствие требования видеть и отправлять конкретные значения.

### D4. Индикаторы и frontend filter

Фото, родословная и услуги используют единый компактный badge style, извлечённый в локальный horse-feature primitive либо общий helper только если он остаётся generic. Цвет count badge — серый; семантические цветные pedigree dots заменяются count badge по тому же визуальному контракту. Services multi-select использует существующий `ListFilter`, options справочника услуг, `services` в `HorseListQueryParams`, повторяемую serialization и reset `offset=0` на apply/clear.

### D5. Access contract

Новый query-параметр не меняет class `GET /api/horses`: Public Read. Anonymous consumer с корректным tenant key и authenticated CMS user получают `200`; anonymous без tenant context получает действующий `400`; foreign-tenant service IDs не раскрывают данные. `POST/PATCH/DELETE` relation endpoints остаются Protected Write (`401` anonymous, `403` без scope), а `GET available-services` остаётся Protected Read — явное существующее исключение, потому что выдача предназначена для CMS selection workflow.

### D6. Ownership и порядок

1. **Backend A — relation chronology и CI hygiene:** model, одна migration, relation entity/schema/repository и dedicated tests; также только три известных unused imports. Не меняет horse list filtering files.
2. **Backend B — horse service filter:** после A, ownership horse API/service/protocol/repository query paths и dedicated tests. Не меняет migration/relation repository.
3. **Frontend — единый horses-feature owner:** после backend contract, ownership horse query/types/API/hooks/tables/relation modal/action indicator и tests. Один владелец нужен из-за тесной связности `HorsesTable`, horse filters и relation UI.
4. **Quality Gate:** один независимый reviewer проверяет совокупный diff. Findings возвращаются соответствующему владельцу; после fixes весь общий review повторяется.
5. После успешного Gate Router делегирует sync delta specs, повторный strict validate и archive.

## Backend test plan

Backend continuation считается одной связной feature и MUST иметь минимум 30 разнообразных unit и 30 live smoke scenarios. Полный перечень UT-01..UT-30 и SM-01..SM-30 находится в `tasks.md`; он покрывает migration/backfill/order/ties, OR/filter/count/pagination, malformed UUID, tenant isolation, anonymous/authenticated access, writes, override serialization, rollback и CI regressions. Smoke выполняется только skill `.codex/skills/api-smoke-test` на живом API и реальной PostgreSQL, не pytest-файлами.

## Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| horse API/types | repeated `services`, empty omission | API-boundary MSW success/empty/401/403 | anonymous redirect; authenticated request | `npm test`, `npx tsc --noEmit` |
| `useHorses` | service filter and offset reset | unit apply/clear/pagination/error | authenticated CMS; no live calls | `npm test` |
| `HorsesTable` | service `ListFilter`, unified gray badges | component data/loading/empty/error/interactions | scope present/missing for actions | `npm test`, `npm run lint` |
| relation modal | defaults become real overrides, change/clear | component create/change/clear/validation/backend error/double-submit | Protected Write `401/403` surfaced | `npm test` |
| `/horses` flow | integrated filter/actions/modal | one smoke/e2e or documented browser QA | anonymous block; authenticated render | `npm run build` |

MSW MUST use `onUnhandledRequest: "error"`; unit/component/API-boundary tests MUST NOT call live backend. No imports or changes from `site-*` are allowed.

## Manual QA steps (UI тестирование)

Предусловия: backend/frontend запущены; есть tenant с минимум двумя услугами и тремя лошадьми (без услуг, с одной, с несколькими); есть пользователь с horse write scope и пользователь без него.

1. Anonymous: открыть `/horses`; ожидать redirect/block на `/login`, без отображения admin data.
2. Authenticated desktop 1440×900: открыть `/horses`, вкладку «Лошади»; проверить три одинаковых серых count badge без overlap.
3. Tablet 768×1024 и mobile 390×844: повторить проверку actions/table horizontal scroll, Drawer и modal; текст, кнопки, Select, Radio и поля не перекрываются.
4. Открыть Drawer лошади с несколькими услугами; строки идут newest-first; обновление/повторное открытие сохраняет порядок.
5. Нажать «Добавить», выбрать услугу; description, price и formatter видимо заполняются значениями услуги. Сменить услугу — все defaults заменяются.
6. Изменить defaults и сохранить; проверить один POST, закрытие modal, refresh Drawer/table/badge и сохранённые overrides.
7. Повторить с явной очисткой nullable полей; проверить request body и согласованный fallback после refresh.
8. В services filter выбрать одну услугу: видны только связанные лошади, offset сброшен. Выбрать вторую: OR-выдача без дублей. Очистить: полный список и offset 0.
9. Проверить pagination после фильтра, смену page size и сочетание с name/breed/sort; count и страницы согласованы.
10. Пользователь без scope: read/filter доступны, mutation actions hidden/disabled, direct modal submit не отправляет write. Для разрешённого пользователя actions работают.
11. Подменить ответы на validation error, generic error, `401`, `403`: modal/filter state сохраняется, false success отсутствует; double click даёт один write.
12. Regression: photos/pedigree/services actions вызывают только свои handlers; `site-ad` не меняется.

QA report MUST содержать passed/failed по шагам, screenshots для failed responsive/error/permission cases и method/path/status/body для failed API cases.

## Risks / Trade-offs

- [Backfill присвоит близкие timestamps всем старым строкам] → стабильный tie-break `id DESC`; точная историческая хронология до миграции не заявляется.
- [EXISTS может замедлить большой список] → использовать индексы relation FKs, проверить `EXPLAIN` при подозрении и не плодить JOIN-дубли.
- [Реальные overrides перестают наследовать будущие изменения справочника] → явно показать значения и сохранить решение в spec/документации.
- [Три Backend изменения пересекаются в fixtures] → владельцы меняют только назначенные production paths; общие test helpers передаются последовательно.
- [Текущий active change 027-stale остаётся рядом] → этот change использует отдельный ID; старый каталог не изменяется.

## Migration Plan

1. Повторить Docker discovery/inspect; сделать backup/контроль count связей.
2. Применить migration nullable → backfill `now()` → `NOT NULL`/default; проверить upgrade на заполненной PostgreSQL.
3. Deploy backend chronology/filter и выполнить unit/type/lint plus live smoke.
4. Deploy frontend после backend compatibility; optional query делает rollout обратно совместимым.
5. При rollback сначала откатить frontend/backend использование `created_at`, затем downgrade колонки; relation rows сохраняются.
6. Общий Quality Gate → fixes/re-review → sync specs → strict validate → archive.

## Open Questions

Открытых блокирующих вопросов нет. На approval пользователь отдельно подтверждает assumptions: OR-семантика; repeated-key serialization; data-preserving backfill; реальные, а не reference-only overrides; унификация всех трёх indicators по серому service badge.
