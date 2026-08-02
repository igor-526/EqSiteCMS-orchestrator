## Context

Задача `docs/tasks/024_short_names.md` требует управлять `breeds.short_name` и `coat_color.short_name` в защищённом CMS. Backend DTO create/update/out уже содержат поле и автоматически выводят его из `name` при пустом значении, но list API не принимает `short_name` как фильтр/sort. Frontend-типы, таблицы и модалки поле пока теряют. Изменение пересекает `services/backend` и `services/frontend`, но не меняет БД, NATS или `services/site-ad`.

## Goals / Non-Goals

**Goals:**

- обеспечить end-to-end передачу, отображение, создание и изменение `short_name` для пород и мастей;
- обеспечить серверный поиск и сортировку по полю с reset `offset=0`;
- сохранить Public Read/Protected Write contract и tenant isolation;
- покрыть behavior diff backend и frontend тестами, включая anonymous/authenticated и `401/403`.

**Non-Goals:**

- изменение модели БД, автогенерации `short_name`, URL или NATS;
- изменение публичного сайта `site-ad`;
- общий рефакторинг horse feature, `MainTable` или scope model;
- изменение access classes существующих endpoint'ов.

## Decisions

### 1. Расширить существующий query contract

`short_name` добавляется в параметры list route/service/repository и allowlist сортировки пород и мастей. Поиск остаётся case-insensitive substring и участвует в текущей OR-группе текстовых фильтров. Альтернатива — локальный frontend filter — отвергнута: она неверна при server pagination и не может сортировать полный набор.

### 2. Передавать поле через существующую frontend-цепочку

DTO в `src/types/api`, существующие API functions/services/hooks и feature UI остаются границами. Таблицы получают колонку «Кор. наим.» с `StringFilter`, а create/update modal — контролируемое поле с backend validation output. При каждом filter/sort изменении устанавливается `offset: 0`. Новый слой или consumer code не создаётся.

### 3. Сохранить backend semantics пустого значения

Frontend отправляет введённую строку; пустая строка сохраняет действующий backend-контракт автогенерации из актуального `name`. Максимум — 63 символа по backend schema/model. Валидация формы должна быть оформлена через существующий Zod boundary фичи, а backend field error `short_name` показан рядом с полем.

### 4. Access matrix

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/horses/breeds?short_name=&sort=` | Public Read | tenant key для tenant context | `200` с валидным tenant key, без CMS cookie; `400` без tenant context | `200` |
| GET | `/api/horses/coat_colors?short_name=&sort=` | Public Read | tenant key для tenant context | `200` с валидным tenant key, без CMS cookie; `400` без tenant context | `200` |
| POST | `/api/horses/breeds`, `/api/horses/coat_colors` | Protected Write | authenticated tenant user; breed дополнительно требует действующий horse/breed scope | `401` | success по контракту; breed `403` без scope |
| PATCH | `/api/horses/breeds/{id}`, `/api/horses/coat_colors/{id}` | Protected Write | authenticated tenant user; breed дополнительно требует действующий horse/breed scope | `401` | `200`; breed `403` без scope; foreign tenant не изменяется |

Исключений из дефолтной policy нет. DELETE не меняется и в behavior diff не входит.

### 5. Ownership и порядок

1. Backend Agent владеет только list query contract и backend tests в `services/backend`.
2. Frontend Agent после backend contract владеет `services/frontend` DTO/UI/validators/tests.
3. Один Quality Gate проверяет совокупный diff, access matrix и evidence; findings возвращаются владельцам.
4. После успешного QG Router синхронизирует обе delta specs, повторно валидирует и архивирует change.

## Risks / Trade-offs

- [OR-семантика текстовых filters может удивлять при одновременных полях] → сохранить текущую семантику и явно зафиксировать тестом комбинации.
- [Пустая строка в modal запускает backend auto-generation] → проверить create/update API-boundary body и пользовательский текст/валидацию.
- [Сортировка может потерять стабильность при одинаковых значениях] → repository tests проверяют направление и пагинационные границы; не вводить новый tie-breaker без отдельного контракта.
- [Frontend actions имеют неодинаковый scope gate для breeds/coat colors] → не расширять access policy, отдельно проверить существующие `401/403` и скрытие/guard там, где оно уже требуется.

## Migration Plan

Сначала развернуть backward-compatible backend query extension, затем frontend. Rollback frontend возвращает старое UI без потери данных; rollback backend удаляет только необязательные query параметры. Миграция БД не требуется.

### PostgreSQL для smoke-тестов

На 2026-08-02 контейнер найден по labels: `eqsitecms-db` (`0905da513e53`), image `postgres:16`, aliases `eqsitecms-db`, `db`; `docker inspect` вернул `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`, host port `5433`. Перед фактическим SMOKE исполнитель обязан повторить discovery/inspect и использовать актуальные значения, а не этот snapshot как hardcode.

## Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| breed/coat DTO + API boundary | `short_name`, query и body serialization | MSW success, empty, validation, generic error, `401`, `403` | Public Read GET; Protected Write mutation | `npm test` |
| breed/coat tables | column, search, sort, reset `offset` | component data/loading/empty/error, apply/clear, sort/clear, pagination reset | authenticated render; no live calls | `npm test` |
| breed/coat modals | create/update short name, field error, refresh | open/close, valid submit, client/backend validation, generic error, success refresh | scope present/missing; `401/403`; mutation guard | `npm test` |
| `/horses` flow | protected admin route | route/guard evidence + manual smoke | anonymous redirect; authenticated render | `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` |

## Manual QA steps (UI тестирование)

Предусловия: backend и frontend подняты, есть tenant с несколькими породами/мастями и CMS-пользователи с разрешёнными и ограниченными scopes.

1. Без сессии открыть `http://localhost:3000/horses`: ожидать redirect/block на `/login`; после входа разрешённым пользователем — страницу и вкладки «Породы»/«Масти».
2. На вкладке «Породы» проверить столбец «Кор. наим.», поиск по подстроке, очистку поиска, ascending/descending/clear sort; в Network проверить `short_name`, `sort`, `limit`, `offset=0` после search/sort.
3. Повторить шаг 2 для «Масти»; сменить страницу и page size, затем применить поиск/sort и убедиться в reset `offset=0`.
4. Создать и изменить породу с `short_name`, проверить обновление строки без stale значения; повторить для масти. Проверить пустое значение (автогенерация), 64 символа, backend validation и generic error с сохранением modal state.
5. Пользователем без требуемого breed scope убедиться, что mutation action скрыт/disabled/guarded; прямой submit не уходит, а смоделированные backend `401/403` показаны. Проверить double-submit guard.
6. На desktop 1440×900, tablet 768×1024 и mobile 390×844 проверить обе таблицы/модалки: нет overlap текста, кнопок, колонок, filter dropdown и modal controls; horizontal scroll остаётся управляемым.
7. Убедиться, что другие horse tabs не регрессировали и `site-ad` не изменён/не используется CMS runtime.
8. В QA-отчёте отметить passed/failed; для failed responsive/error/permission cases приложить screenshots, для API failures — status и body из Network.

## Open Questions

Нет блокирующих вопросов. Предлагаемое понимание «поиск» — server-side case-insensitive substring по отдельному `short_name`, согласованное с текущими текстовыми фильтрами.
