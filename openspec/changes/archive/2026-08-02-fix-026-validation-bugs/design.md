## Context

Задача `docs/tasks/026_validation_bugs.md` описывает один сквозной validation defect в двух справочниках CMS. В frontend оба modal проверяют наличие `name`, но затем читают `validationErrors.description`, поэтому ответ только с ошибкой имени вызывает runtime crash. Frontend передаёт пустые строки для `slug` и `description`; backend DTO допускают nullable значения, но сервисная `_validate_optional_text` отклоняет пустое описание, а slug проходит required-validator до ветки автогенерации.

Существующие маршруты и access policy сохраняются. БД, миграции, NATS и consumer `site-ad` не затрагиваются.

## Goals / Non-Goals

**Goals:**

- сделать field-error rendering безопасным и симметричным для пород и мастей;
- согласовать backend-нормализацию `""`/whitespace с nullable DTO-контрактом;
- сохранить уникальную автогенерацию slug и tenant isolation;
- доказать поведение frontend и backend автоматизированными и live-API проверками.

**Non-Goals:**

- изменение маршрутов, response schema, ролей, scopes или access classes;
- рефакторинг всей horse page/modal architecture;
- изменение short name, page data, таблиц, пагинации или `site-ad`;
- миграция существующих записей.

## Decisions

1. Backend владеет нормализацией необязательных полей. Пустой/whitespace slug удаляется из service input до генерации, пустое/whitespace description превращается в `None`. Альтернатива — нормализовать только frontend — отвергнута, потому что API должен быть устойчив ко всем клиентам.
2. Для update пустой slug означает «не задан»: при неизменном имени текущий slug сохраняется; при переданном новом имени действует существующая генерация нового уникального slug. Альтернатива — регенерировать slug всегда — создаёт неожиданные URL-изменения.
3. Frontend исправляется локально в двух modal и дополняется regression tests; широкая декомпозиция `page.tsx` вне scope.
4. Endpoint access matrix фиксирует действующую Protected Write policy. Исключений нет; anonymous/authenticated/foreign-tenant evidence обязательно.
5. Ownership непересекающийся: Backend Agent владеет только backend services/tests; Frontend Agent после backend-контракта владеет двумя modal и frontend tests. Затем один Quality Gate проверяет совокупный diff, findings возвращаются владельцам, после исправлений выполняется повторный общий review.

### Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| Breed modal | safe field errors, empty optional fields | component: name-only error, description error, submit, error-state retention, double submit | authenticated; scope; `401/403` surfaced | `npm test`, lint, typecheck, build |
| Coat-color modal | safe field errors, empty optional fields | component: name-only error, description error, submit, error-state retention, double submit | authenticated; scope; `401/403` surfaced | `npm test`, lint, typecheck, build |
| API boundary/hooks | payload and errors unchanged except optional normalization contract | MSW success/validation/generic/`401`/`403`; no live network | Protected Write | `npm test` |
| `/horses` regression | protected route and existing list behavior | anonymous block, authenticated render, scope present/missing, `limit/offset` unchanged | anonymous/authenticated/scopes | browser Manual QA + `rg` |

### Unit-тесты backend-фичи «нормализация пород и мастей»

UT-01..UT-15 покрывают breed create/update: отсутствующий, `null`, пустой и whitespace slug; генерацию из кириллического имени; collision suffix; пустое/whitespace/`null` description; лимит 511 и превышение; пустое имя; сохранение slug при update; регенерацию при rename; чужой tenant; отсутствие scope.

UT-16..UT-30 симметрично покрывают coat-color create/update: четыре формы slug, генерацию и collision; четыре формы description и границы длины; пустое имя; сохранение slug; rename; чужой tenant; отсутствие права. Каждый сценарий реализуется отдельным test case, без объединения ради количества.

### Smoke-тесты backend-фичи «нормализация пород и мастей»

SM-01..SM-15 выполняются через skill smoke на live API и реальной PostgreSQL для breed: create без/с `null`/пустым/whitespace slug, create с четырьмя формами description, collision, PATCH empty fields, PATCH rename, anonymous POST/PATCH, authenticated success, foreign tenant и cleanup.

SM-16..SM-30 выполняют симметричную матрицу для coat colors: варианты slug/description, collision, update/rename, anonymous denial, authenticated success, foreign tenant, чтение результата и cleanup. Smoke не создаются как pytest-файлы.

### PostgreSQL для smoke-тестов

Перед исполнением параметры MUST быть повторно получены через `docker inspect`. На этапе планирования обнаружен container `eqsitecms-db` (`0905da513e53`), image `postgres:16`, compose project/service `eqsitecms`/`db`, aliases `eqsitecms-db`,`db`, DB/user/password `eqsitecms`, host port `5433`. Эти значения являются evidence текущего inspect, а не хардкодом для будущего запуска.

## Manual QA steps (UI тестирование)

1. Предусловия: backend/frontend подняты, есть пользователь со scope изменения horse dictionaries и пользователь без scope; открыть `/horses` на desktop 1440×900.
2. Anonymous: очистить session, открыть `/horses`; ожидается redirect/block на `/login`.
3. Authenticated со scope: открыть вкладку «Породы», create modal, отправить полностью пустую форму; ожидается field error без crash, modal и значения сохраняются.
4. Ввести имя, оставить slug/description пустыми, дважды нажать submit; ожидается один запрос, успех, refresh строки, сгенерированный slug и пустое описание.
5. Повторить create/edit/error/success для вкладки «Масти», включая backend validation, generic error и принудительные `401`/`403`; modal сохраняет state.
6. Пользователь без scope: create/edit actions скрыты/disabled/guarded, mutation не уходит; отдельно подтвердить backend `403` при обходе UI.
7. Проверить desktop 1440×900, tablet 768×1024 и mobile 390×844: labels, inputs, counters, validation messages, footer buttons и modal не перекрываются и доступны прокруткой.
8. Проверить существующие search/sort/pagination пород и мастей: `limit/offset`, page/page-size change и reset offset после filter/search/sort не регрессировали.
9. Убедиться, что `site-ad` не изменился. В QA report записать passed/failed шаги; для failures приложить screenshots, а для API failures — network status/body.

## Risks / Trade-offs

- [Пустой PATCH станет фактически пустым после нормализации] → различать наличие ключей до нормализации и обеспечить явный test ожидаемого поведения.
- [Rename может неожиданно сменить slug] → сохранить уже действующую семантику и закрепить unit/smoke test.
- [Разные auth checks у breeds и coat colors] → не расширять scope, а Quality Gate сверяет фактическую access matrix и фиксирует несоответствие как finding.
- [Whitespace description теряет пробелы] → это намеренная nullable-нормализация необязательного текстового поля.

## Migration Plan

1. После approval последовательно выполнить backend, затем frontend deliverable.
2. Запустить unit/frontend checks и live smoke с повторным `docker inspect`.
3. Провести единый Quality Gate, устранить findings и повторить review.
4. Синхронизировать delta specs, повторить strict validation и архивировать change.
5. Rollback — откат path-scoped runtime diff; миграций данных нет.

## Open Questions

Открытых продуктовых вопросов нет. На apply требуется подтвердить фактические scopes/status codes coat-color endpoint по текущему auth middleware; это verification task и не меняет policy без отдельного согласования.
