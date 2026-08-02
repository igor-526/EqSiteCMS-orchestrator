## Почему

Исторические задачи `003`, `012` и `018` сформировали общий backend-контракт выбора tenant, refresh-aware чтения и CORS, но он ещё не закреплён capability-oriented OpenSpec-спецификацией. Backfill нужен, чтобы синхронизировать только подтверждённое кодом, тестами и итоговыми отчётами поведение и передать его на отдельный backend/access review.

## Что изменяется

- Добавляется русскоязычная delta spec `backend-access-platform` для tenant context по cookie или `X-Equestrian-Service-Key`.
- Фиксируется различение полностью анонимного Public Read и CMS-запроса только с refresh cookie.
- Фиксируется split CORS для Public Read, Protected Write и чувствительных GET.
- Добавляется полная access matrix классов endpoint, включая обоснованные исключения `GET /api/auth/me` и публичные auth POST.
- Runtime-код, API, БД и тесты не изменяются; legacy tasks/plans используются только как контекст, а нормативные утверждения опираются на code/tests/reports evidence.

## Возможности

### Новые возможности

- `backend-access-platform`: Подтверждённые платформенные контракты tenant isolation, refresh-aware доступа, auth-исключений и split CORS backend-сервиса.

### Изменяемые возможности

Отсутствуют: соответствующей main spec ещё нет.

## Влияние

Изменяются только артефакты `openspec/changes/backfill-backend-access-platform/**`. Источники evidence: `services/backend/src/depends/services.py`, `services/backend/src/api/auth.py`, `services/backend/src/core/middleware/cors.py`, связанные unit-тесты и отчёты задач `003` и `018`. Доменные CRUD/DTO, frontend и site-consumer rendering остаются вне ownership пакета BE-1.
