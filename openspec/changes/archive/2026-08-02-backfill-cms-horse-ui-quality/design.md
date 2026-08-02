## Контекст

Пакет FE-2 восстанавливает только frontend-контракт задач `003`, `008`, `010`, `011`, `014`, `015` и `016`. Evidence ограничено кодом и тестами `services/frontend` и итоговыми Quality Gate reports; формулировки `docs/tasks` и legacy `docs/plans` описывают намерение и не доказывают реализацию. Change документационный: runtime и main specs остаются неизменными до профильного review и пакетной sync.

## Цели / Не-цели

**Цели:**

- Зафиксировать подтверждённое поведение CMS horse UI, pedigree/breed сценариев, фильтров и пагинации.
- Отразить Protected Admin boundary, scope-aware UX, обработку `401/403` и то, что backend остаётся источником авторизации.
- Зафиксировать MSW/no-live-backend test boundary и реально подтверждённые quality checks.
- Сохранить `G-015` и `G-016` как явные gaps.

**Не-цели:**

- Изменять frontend/backend/site-ad runtime, API, DTO, БД или зависимости.
- Переопределять backend Public Read / Protected Write контракт или создавать endpoint access matrix для неизменяемых endpoint.
- Объявлять полный strict rollout, manual QA или полную regression matrix завершёнными без evidence.
- Изменять FE-1 capability `cms-content-commerce-ui` или main specs.

## Решения

### 1. Один capability-файл для tightly-coupled horse UI

Horse CRUD UI, breed kind classification, pedigree picker, scopes, filters и quality evidence описываются в одном `cms-horse-ui-quality` spec: они используют одну feature-зону `src/features/horses`. Разделение по историческим номерам создало бы дубли требований.

### 2. UI access contract не заменяет backend policy

Spec фиксирует `/horses` как CMS route, redirect на `/login` при неуспешной загрузке пользователя, action registry и повторный guard pedigree mutation. Ответы `401/403`, Public Read GET и Protected Write относятся к существующей внешней API-границе; UI MUST отображать отказ, но не считается источником авторизации.

### 3. Пагинация и фильтры описываются по фактическим query semantics

Контракт использует `limit`/`offset`, сбрасывает offset при смене фильтра или поиска и не вводит page-based API параметры. Для horse kind и breed IDs фиксируется взаимное исключение, подтверждённое hook/component tests.

### 4. Test isolation — отдельное нормативное свойство

Vitest setup запускает MSW с `onUnhandledRequest: "error"`; API/hook tests используют handlers и не должны обращаться к live backend. Это позволяет воспроизводимо проверять сериализацию, `401/403` и состояния UI.

### 5. Неподтверждённое остаётся gap

`G-015` сохраняет отсутствие evidence полного strict rollout, manual QA, full-scope self-check и итогового QG. `G-016` сохраняет отсутствие отдельной полной regression matrix четырёх исходных пунктов и доказательства отсутствия дублей. Backfill не закрывает эти gaps.

## Риски / Компромиссы

- [Часть route protection реализована клиентским redirect] → Spec утверждает только наблюдаемое поведение `UserProvider`, не серверную блокировку.
- [Reports содержат исторические результаты тестов] → Новые числа не выводятся; используются только явно зафиксированные результаты и текущие точечные tests.
- [Scope coverage для справочников неоднороден] → Нормативные scope claims ограничены horse/pedigree actions, подтверждёнными registry и tests.
- [Backfill может быть принят за runtime change] → Proposal, tasks и impact явно запрещают runtime/main-spec edits.

## План миграции

1. Создать proposal, design, delta spec и tasks этого change.
2. Выполнить strict validation и передать пакет task `6.3` frontend reviewer.
3. После успешного review пакетная task `6.4` синхронизирует spec и архивирует change.

Rollback до sync — удаление только change `backfill-cms-horse-ui-quality`; после sync любые исправления выполняются отдельным OpenSpec change.

## Открытые вопросы

Блокирующих вопросов нет. Gaps `G-015` и `G-016` намеренно остаются открытыми до отдельного evidence-producing change.
