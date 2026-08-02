## Почему

Исторические задачи `003`, `008`, `010`, `011`, `014`, `015` и `016` сформировали CMS-интерфейс управления лошадьми и его frontend quality boundaries, но подтверждённое поведение ещё не закреплено в OpenSpec. Нужен evidence-based backfill, который отделяет действующий UI-контракт от незакрытых проверочных gaps.

## Что изменяется

- Добавляется русскоязычная capability-спецификация tenant-aware CMS UI для лошадей, пород и родословной.
- Фиксируются подтверждённые route/auth и scope boundaries для Protected Admin UI и Protected Write действий без переопределения backend-авторизации.
- Фиксируются подтверждённые фильтры, `limit`/`offset` pagination, состояния pedigree UI и регрессионные проверки.
- Фиксируются frontend quality boundaries и тестовая изоляция через MSW без обращения к live backend.
- Незавершённый full strict rollout задачи `015` и неполная regression matrix задачи `016` сохраняются как gaps `G-015` и `G-016`, а не объявляются реализованными.
- Runtime-код, endpoint-контракты backend, main specs и consumer-контур `site-*` не изменяются.

## Возможности

### Новые возможности

- `cms-horse-ui-quality`: Подтверждённые контракты CMS-интерфейса управления лошадьми, породами и родословной, access/scopes UX, фильтрации, пагинации, frontend quality и test isolation.

### Изменяемые возможности

Отсутствуют.

## Влияние

Изменяются только артефакты change `openspec/changes/backfill-cms-horse-ui-quality/**`. Источниками evidence служат фактический код и тесты `services/frontend`, а также итоговые отчёты задач `003`, `008`, `010`, `011` и `014`; задачи и legacy-планы не используются как доказательство реализации. Новых или изменённых endpoint нет, поэтому backend access matrix не создаётся: spec фиксирует только frontend-сторону существующего контракта.
