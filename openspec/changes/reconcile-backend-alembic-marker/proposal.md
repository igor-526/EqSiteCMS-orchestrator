## Why

Пользователь вручную удалил последний migration-файл; локальная development БД содержит неизвестный текущему дереву Alembic marker `d1e2f3a4b5c6`. Это блокирует runtime backend; требуется отдельно согласованное восстановление metadata, а не изменение schema.

Исходный запрос: [task 094](../../../docs/tasks/094_reconcile_backend_alembic_marker.md).

## What Changes

- После отдельного approval изменить только единственный marker `d1e2f3a4b5c6` → `c8fda9794a60`, точный проверенный head текущего дерева из 21 ревизии.
- Сохранить snapshot старого marker и идентичности development DB без секретов; выполнить транзакционный compare-and-swap с rowcount=1, полным rollback при несоответствии.
- Повторно проверить граф и DB identity непосредственно перед операцией; после неё проверить SELECT, Alembic current/heads; runtime health вынести в отдельный QG-ENV.
- Запретить schema repair, stamp/upgrade/downgrade, создание/удаление миграций, автоматические рестарты/пересборки и любые сторонние изменения в metadata unit.
- Обязать approval явно признать: **смена marker не откатывает schema удалённой миграции и не доказывает schema equivalence**. Для schema repair потребуется другой change/approval.

## Capabilities

### New Capabilities

- `backend-alembic-marker-reconciliation`: ограниченная согласованная коррекция неизвестного marker development БД с проверками графа, транзакционностью и доказательствами результата.

### Modified Capabilities

Нет изменений требований существующих capability.

## Impact

Только `alembic_version.version_num` локальной development БД backend через alias `db` и evidence этого change. Код, migration-файлы, схема прикладных таблиц, API, NATS, frontend и зависимости не меняются. Endpoint changes/access matrix и anonymous/authenticated endpoint tests — N/A (нет HTTP behavior diff). Чужой dirty diff root и два Docker-файла backend не трогать.

Approval пока отсутствует; apply-ready означает готовность артефактов, но не разрешение на запись. Предыдущее Docker approval не распространяется на БД.
