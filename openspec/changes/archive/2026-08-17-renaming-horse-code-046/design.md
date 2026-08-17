## Context

Задача `docs/tasks/046_renaming_horse_code.md` исправляет модель, созданную задачей `025`: `horse.code` используется как фрагмент отображаемой родословной клички, хотя предметно требуется самостоятельная nullable-кличка `pedigree_name`. Backend уже различает источник tenant-контекста через `EquestrianContext.source` (`public` для `X-Equestrian-Service-Key`, `authenticated` для cookie), поэтому контекстное представление можно реализовать без новых endpoint-ов. Изменение затрагивает PostgreSQL, backend DTO/repository/service и CMS frontend; `site-ad` должен продолжить работать без правок.

## Goals / Non-Goals

**Goals:**

- Заменить `code` на nullable `pedigree_name` во всех слоях horse capability.
- Возвращать public consumer эффективную `name = pedigree_name ?? name`, включая вложенную родословную, но сохранять исходную `name` и raw nullable `pedigree_name` в cookie CMS; `NULL` остаётся JSON `null` без fallback.
- Сохранить существующую Public Read / Protected Write access policy.
- Дать CMS редактируемое поле «Кличка в родословной» и удалить весь runtime-контракт `code`.
- Подтвердить миграцию и API-поведение unit-тестами и smoke на реальной PostgreSQL.

**Non-Goals:**

- Перенос значений из `code`, изменение country/породных кодов или автоматический разбор кличек.
- Изменение `site-ad`, URL, методов endpoint-ов, pedigree relations или NATS-контрактов.
- Добавление новых auth-механизмов либо исключений из access policy.

## Decisions

### 1. Контекстное имя формируется на application boundary

`HorseService` получает существующий `EquestrianContext` и перед возвратом DTO применяет рекурсивное преобразование всех horse nodes: только при `source="public"` значение `name` заменяется на `pedigree_name`, если оно не `NULL`; при `source="authenticated"` DTO остаётся без подмены. Repository сохраняет канонические `name` и `pedigree_name` и не знает об auth-контексте.

Это сохраняет Clean Architecture и единообразно покрывает list/detail/pedigree/candidates/mutation responses. Альтернатива — SQL alias/CASE в repository — отклонена: она смешивает представление и persistence и усложняет рекурсивные DTO.

### 2. `pedigree_name` остаётся видимым nullable-полем полного DTO

Все полные horse DTO содержат `pedigree_name: str | None`; public consumer использует совместимое effective `name`, при этом `pedigree_name` остаётся в public JSON. CMS получает необработанное поле для редактирования: при отсутствии значения JSON содержит именно `pedigree_name: null`, и fallback к основной кличке к этому полю не применяется. `code` удаляется из entity, create/update/out DTO, SQL mapping и TypeScript types. Максимальная длина `pedigree_name` — 63 символа во всех слоях.

### 3. Миграция намеренно разрушает старые данные

Новая Alembic revision удаляет `horse.code` и добавляет nullable `horse.pedigree_name VARCHAR(63)` без backfill. Downgrade выполняет обратную структурную замену, но не восстанавливает потерянные значения `code`. Это прямо разрешено входным запросом.

### 4. Auth/access не меняется

GET остаются Public Read с обязательным tenant selector: валидный service key даёт public projection, cookie user — CMS projection, missing/invalid selector возвращает `401` по действующему контракту `get_read_equestrian_context`. POST/PATCH/DELETE остаются Protected Write; новых исключений нет.

### 5. Ownership и порядок

1. Backend agent владеет только `services/backend` и реализует migration/model/entity/schema/repository/service/API-context tests, затем отмечает свои tasks.
2. Frontend agent после стабилизации backend DTO владеет только `services/frontend`, заменяет type/validator/hook/table/modal/docs/tests; `services/site-ad` не меняется.
3. Один Quality Gate agent проверяет общий diff, access matrix, unit/smoke и frontend gates; findings возвращаются соответствующему владельцу до повторного общего review.
4. После успешного gate Router синхронизирует delta specs, повторяет strict validation и архивирует change.

## Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| horse types/validators/hooks | `code` удалён, `pedigree_name` передаётся/очищается | unit/API-boundary: value, null, omitted, 63/64 chars, success/400/401/403 | authenticated; mutation denial | `npm test`, `npx tsc --noEmit` |
| `/horses` table | колонка «Кличка в родословной», устойчивый null | component: data/loading/empty/error/pagination | anonymous redirect; authenticated render | `npm test`, browser QA |
| create/edit modal | новое nullable поле и invalidation | component: open/close, valid submit, validation, backend/generic error, double submit, success refresh | scope present/missing; 401/403 | `npm test`, browser QA |
| consumer isolation | нет service key и `site-*` imports/edits | `rg` и diff review | CMS cookie only | `rg`, `git diff -- services/site-ad` |

## Manual QA steps (UI тестирование)

1. Запустить backend/frontend с применённой миграцией; создать через authenticated CMS лошадей с `pedigree_name`, с `NULL` и с основной `name`, отличной от pedigree name.
2. Без сессии открыть `/horses`: ожидается redirect/block на `/login`, horse API mutation не отправляется.
3. В desktop 1440×900, tablet 768×1024 и mobile 390×844 открыть `/horses`: таблица/карточки, колонка и кнопки не перекрываются; длинная кличка не ломает layout.
4. Со scope horse write открыть create modal, ввести 63 символа, сохранить один раз и двойным кликом: один запрос, success, modal закрывается, список invalidated и показывает точное значение.
5. В edit modal очистить поле: PATCH отправляет `pedigree_name: null`, после refresh отображается пустое состояние; затем изменить только другое поле и проверить, что omitted `pedigree_name` сохранён.
6. Ввести 64 символа: клиентская validation блокирует submit и сохраняет форму. Повторить с mocked/live backend validation и generic error: ложного успеха нет, состояние формы сохранено.
7. Проверить ответы backend `401` и `403`: сообщение понятно, modal остаётся пригодным для retry, таблица не показывает неподтверждённое значение.
8. Без horse write scope проверить hidden/disabled create/edit и отсутствие mutation; прямой backend write всё равно отклоняется `403`.
9. Проверить initial `limit/offset`, смену страницы и page size, а также reset `offset=0` после search/filter/sort; новое поле не меняет параметры списка.
10. В Network убедиться: CMS GET с cookie показывает исходную `name` и именно `pedigree_name: null` без fallback для незаполненного значения; запрос с service key без cookie показывает эффективную `name` и сохраняет `pedigree_name` в public JSON; `site-ad` код и network contract не изменены.
11. QA-отчёт фиксирует passed/failed шаги; для failed responsive/error/permission cases прикладывает screenshots, для API failures — status/body.

## PostgreSQL для smoke-тестов

Поиск 2026-08-17: основной label `com.docker.compose.project=eqsitecms` не найден; fallback выбрал контейнер `eqsitecms-db` (`7c720ddc783d`), image `postgres:16`, labels `project=eqsitecms-core`, `service=db`, aliases `eqsitecms-db`, `db`. `docker inspect` вернул `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`, host port `5433`. Перед фактическим smoke исполнитель MUST повторить discovery/inspect и использовать актуальные значения, не хардкодить их в тестовых файлах. Smoke выполняются только skill `api-smoke-test` на живом API и реальной PostgreSQL, не pytest-файлами.

## Risks / Trade-offs

- [Breaking DTO удаляет `code`] → синхронно обновить backend и CMS, проверить `rg` по обоим сервисам; `site-ad` защищён эффективным `name`.
- [Рекурсивный public projection может пропустить вложенный node] → единый recursive mapper и unit/smoke для root/sire/dam/foals/parents/candidates.
- [Cookie и service key переданы одновременно] → сохранить существующий приоритет cookie (`authenticated`) и проверить, что spoofed header не меняет CMS projection.
- [Потеря старых code необратима] → это согласованное требование; downgrade возвращает только структуру и документирует потерю.
- [Основной Docker label отличается от инструкции] → зафиксирован fallback evidence; runtime smoke повторяет inspect.

## Migration Plan

1. Реализовать backend contract и тесты, создать Alembic revision `drop code/add pedigree_name`.
2. Применить migration в локальном окружении и проверить schema/data на реальной PostgreSQL.
3. Обновить CMS frontend после стабилизации DTO.
4. Выполнить общий Quality Gate, live smoke и manual QA.
5. Deploy backend migration и совместимый CMS release в одном окне. Rollback возвращает nullable `code`, но старые значения восстановить невозможно; при rollback frontend/backend откатываются вместе.

## Open Questions

- Открытых вопросов нет: `pedigree_name` имеет лимит 63 символа и остаётся в public JSON; fallback применяется только к public полю `name`, а cookie CMS всегда получает raw nullable `pedigree_name`, включая явный JSON `null`.
