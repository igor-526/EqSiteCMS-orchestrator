## Context

`docs/tasks/048_breeds_group.md` требует верхнеуровневые группы пород в backend и CMS. В текущем коде `services/backend/src/{models,core,api,repositories}/breeds.py` реализует tenant-scoped породы, Public Read через `get_read_equestrian_context`, Protected Write через current user/protected context и безопасный `page_data`. `services/frontend/src/features/horses` уже содержит таблицу, hook, modal и Page Editor для пород. Это evidence текущего состояния; `docs/plans` не является изменяемым источником.

Изменение не требует NATS, AsyncAPI, фотографий или `site-ad` runtime-правок. Оно требует PostgreSQL migration, нового backend vertical slice и расширения CMS protected route.

## Goals / Non-Goals

**Goals:**

- tenant-scoped CRUD групп пород с Public Read GET и Protected Write mutations;
- nullable связь породы с группой, безопасная очистка и `ON DELETE SET NULL`;
- стабильные фильтры/сортировка/пагинация и компактная группа в DTO породы;
- полноценная CMS-вкладка групп и расширение таблицы/form пород;
- доказательство контракта минимум 30 backend unit и 30 live smoke сценариями на реальной PostgreSQL плюс frontend matrix/manual QA.

**Non-Goals:**

- фотографии групп, NATS-события, изменения public site, массовое назначение групп или древовидная иерархия;
- soft-delete/restore групп (текущие справочники используют hard delete);
- новый permission vocabulary: используются существующие dictionary scopes;
- рефакторинг остальных horse dictionaries.

## Decisions

### 1. Отдельный backend vertical slice

Создать `BreedGroup` entity/schema/protocol/service/table/repository/API/DI по паттернам breeds/coat colors. Таблица `breed_groups` имеет tenant-unique `(equestrian_id,name)` и `(equestrian_id,slug)`; `breeds.breed_group_id` nullable FK с `ondelete="SET NULL"` и индексом. Альтернатива JSON/строковой группе отвергнута: она не даёт referential integrity, CRUD и человекочитаемый join.

Repository пород выполняет `LEFT OUTER JOIN breed_groups`, формирует компактный nested group и применяет tenant predicate также к lookup группы. Фильтр — `breed_group_ids IN (...)`; `group_name` сортируется по joined `name`, NULL-позиция фиксируется одинаково для asc/desc, затем добавляется `breeds.id` tie-breaker. Без sort группы и породы используют `created_at DESC, id DESC`.

### 2. Nullable semantics в PATCH

`BreedUpdateDto.model_fields_set` отличает отсутствующее поле от явного `breed_group_id: null`; явный null отвязывает. До записи service получает группу через `BreedGroupRepositoryProtocol` в том же tenant и одной `AsyncSession`. Чужой/неизвестный UUID мапится в `ClientError`/`400`, не раскрывая чужой tenant. Альтернатива отдельного attach endpoint отклонена как лишняя поверхность API.

### 3. API и access

Канонический path — `/horses/breed-groups`; detail принимает slug или UUID и `page_data=true` по существующему паттерну. Все GET остаются Public Read, но требуют non-secret Equestrian Key (missing/invalid `401`). POST/PATCH/DELETE используют current user, protected equestrian context и существующие `SUPERUSER|ADMIN|DEVELOPER`; anonymous `401`, insufficient scope `403`. Исключений из policy нет. Not-found текущих dictionary services сохраняет `ClientError`/`400` для совместимости.

### 4. CMS feature ownership

Новый `horseBreedGroups` boundary получает собственные types/API/service/validator/hook/UI/tests; orchestration интегрируется в `useHorsesPage`, `/horses/page.tsx`, tabs/header и Page Editor service. Расширение существующей horseBreeds feature выполняется вторым последовательным frontend deliverable, поскольку оба deliverable пересекаются в orchestration files; Router не должен запускать их параллельно.

Selector групп загружает tenant list с `limit=100`, `offset=0`, `sort=["name"]`; при необходимости дальнейшего масштаба remote search уже поддерживается API. Tests используют MSW и `apiFetch`, без live backend calls. Existing dictionary scopes управляют видимостью и handler guards.

### 5. Ownership и порядок

1. **Backend agent — DB/domain/API/tests:** единственный владелец всех `services/backend` путей change; создаёт migration и vertical slice, расширяет breeds, выполняет unit tests. Такой единый ownership выбран из-за tightly-coupled migration/join/DTO/service контракта.
2. **Frontend agent — groups feature:** после backend контракта создаёт новые group files и интегрирует вкладку/orchestration/Page Editor.
3. **Frontend agent — breed integration:** последовательно тем же или новым владельцем расширяет существующие breed types/hook/table/modal/tests; orchestration ownership передаётся только после завершения шага 2.
4. **Quality Gate agent:** после всех deliverables проверяет общий diff, 30+30 backend matrix, live smoke skill, frontend commands/manual evidence и пишет evidence в `docs/reports`.
5. Findings возвращаются владельцу соответствующей зоны, затем общий Quality Gate повторяется. После успеха Router синхронизирует delta specs, strict-validates и архивирует change.

## Backend test plan

### Unit-тесты backend-фичи «Группы пород и связь с породами»

Минимум 30 разных сценариев закреплены как `UT-01..UT-36` в `tasks.md`: entity defaults/timestamps; create normalization/default slug/default page data; tenant uniqueness name/slug; unsafe page data; permissions; public reads; tenant isolation; list filter/sort/default order/pagination; update partial/empty/rename/slug; delete; DTO page-data omission/inclusion; assign/clear/foreign group; nested DTO; group filters/sorts; repository join/NULL handling; DB error mapping. Unit tests используют mocks/fakes репозиториев и не подменяют live smoke.

### Smoke-тесты backend-фичи «Группы пород и связь с породами»

Минимум 30 live-сценариев `SM-01..SM-38` перечислены в `tasks.md` и выполняются только skill `smoke` против поднятого API: migration/schema/FK; Public Read anonymous; selector `401`; write `401/403/success`; validation/uniqueness/page_data security; list text/filter/sort/paging/default order; detail page_data; update/delete; tenant isolation; assign/clear/foreign group; multi-group filter/group sort; `SET NULL`; concurrency/rollback; response privacy. Smoke-файлы pytest не создаются.

### PostgreSQL для smoke-тестов

Поиск по обязательным labels `com.docker.compose.project=eqsitecms` + `service=db` не дал результата, поэтому применён fallback по имени `eqsitecms-db`/image postgres. `docker inspect 7c720ddc783d` обнаружил:

- контейнер `eqsitecms-db` (`7c720ddc783d`), image `postgres:16`;
- labels: project `eqsitecms-core`, service `db`;
- aliases: `eqsitecms-db`, `db` в `eqsitecms_network`;
- inspect env: `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`;
- inspect port: container `5432/tcp` → host `5433` (IPv4/IPv6).

Перед фактическим smoke исполнитель MUST повторить discovery и получить актуальные значения через `docker inspect`, а не копировать эти значения как постоянный hardcode.

## Frontend test plan

Нормативная matrix находится в `specs/cms-breed-group-management/spec.md`. Минимумы: hook/service — success, empty, error и 401/403; filters/sort — apply, clear/normalize, no-debounce expectation, reset offset; pagination — initial, page, page-size, filter/sort reset; permissioned actions — scope present/missing, hidden/disabled, handler guard, 401/403; каждая table — data/loading/empty/error/interaction/permission; каждый modal — open/close, valid submit, client validation, backend validation, generic/401/403, double-submit, success invalidation. Breed column order/group and explicit null clearing получают regression tests.

## Manual QA steps (UI тестирование)

Предусловия: backend/frontend запущены, migration применена; есть пользователь ADMIN и пользователь без dictionary scopes; известен валидный Equestrian Key; DevTools Network открыт.

1. Anonymous: открыть `/horses`; ожидать redirect/block до отображения horse data.
2. ADMIN: войти, открыть `/horses`; проверить, что «Группы пород» находится непосредственно перед «Породы», остальные tabs не регрессировали.
3. Открыть группы: проверить loading, затем data/empty state, `limit=25`, `offset=0`, `created_at desc`; создать достаточно данных для второй страницы.
4. Проверить фильтр name/slug, sort asc/desc, переход страницы и смену page size; каждый filter/sort/page-size должен сбрасывать `offset=0`, запрос и `total` видны в Network.
5. Открыть create modal, проверить required name, slug generation, validation и сохранение введённых данных после backend `400`/generic failure; двойной клик отправляет один POST.
6. Создать группу, убедиться в success feedback и обновлении таблицы; изменить name/slug, затем page_data через Page Editor, проверить refresh и отсутствие фото controls.
7. Подменить/воспроизвести `401` и `403`: modal остаётся с данными, ошибка понятна, ложного success нет. У пользователя без scopes create/edit/delete скрыты/disabled и handler не отправляет mutation.
8. Удалить несвязанную группу с confirm; затем связать породу, удалить группу и проверить, что порода осталась, а «Группа» стала «—».
9. На вкладке пород проверить точный порядок колонок: Тип, Группа, Наименование, Кор. наим., Описание, Путь URL, Действия; имя группы и «—» отображаются корректно.
10. Проверить multi-select filter по двум группам и group sort asc/desc; clear filter/sort сбрасывает параметры/offset.
11. В create/edit породы выбрать группу, сохранить и увидеть обновлённую строку; очистить selector, сохранить, проверить payload `breed_group_id:null` и «—». Ошибка options не должна ломать форму.
12. Responsive: повторить ключевые таблица/modal/selector/Page Editor flows на desktop 1440×900, tablet 768×1024 и mobile 390×844; проверить отсутствие overlap/обрезания tabs, текста, кнопок, filters, pagination, modal/picker и горизонтальный scroll таблицы.
13. Regression/no mixing: проверить horse/coat/service tabs и отсутствие запросов/импортов из `site-*`; GET работает без cookie при валидном selector, CMS writes несут auth.
14. QA-отчёт: записать passed/failed шаги; для failed responsive/error/permission cases приложить screenshots, для API failures — method/path/status/body из Network.

## Risks / Trade-offs

- [Join может изменить сериализацию/производительность списка пород] → один outer join, индексы FK/tenant/name, deterministic paging и repository unit/live smoke.
- [Явный null потеряется из-за `exclude_none`] → ориентироваться на `model_fields_set` и отдельный regression test unlink.
- [Удаление группы оставит stale UI] → DB `SET NULL`, refresh/invalidation group и breed queries после mutation.
- [Selector ограничен 100 options] → сортированный initial load плюс API filter; при фактическом превышении использовать remote search без изменения backend контракта.
- [Migration/rollback] → downgrade сначала удаляет FK/index/column, затем table; rollback приложения до migration несовместим с новым DTO, поэтому deploy migration перед новым backend, frontend после backend readiness.

## Migration Plan

1. Создать Alembic revision от фактического текущего head: `breed_groups`, constraints/indexes, nullable FK/index в `breeds` с `ON DELETE SET NULL`; существующие породы остаются `NULL`.
2. Применить migration на реальной PostgreSQL, проверить upgrade и downgrade/upgrade в disposable среде.
3. Развернуть backend и проверить readiness/Public Read/Protected Write.
4. Развернуть CMS frontend после доступности backend contract.
5. Rollback: frontend → прежняя версия, backend → прежняя версия, затем downgrade migration; перед downgrade экспортировать группы/связи, если данные требуется сохранить.

## Open Questions

Нет блокирующих вопросов. План фиксирует path `/horses/breed-groups`, DTO field `group`, input `breed_group_id`, query `breed_group_ids` и сортировку `group_name`; это следует подтвердить вместе с остальными apply-ready артефактами до apply.
