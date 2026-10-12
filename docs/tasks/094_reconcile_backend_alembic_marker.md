# 094 — Согласование Alembic marker локальной development БД

## Исходный запрос

«Я удалил последнюю миграцию самостоятельно как файл. Зайди в БД и поставь последнюю по дереву миграцию».

## Границы согласования

Новый change: `reconcile-backend-alembic-marker`. Предыдущее согласование `fix-backend-build-context-bytecode` касалось только Docker-файлов и не разрешает записи БД. До отдельного approval допустимы только чтение metadata ревизий и SELECT marker через `scripts/stackctl psql db`.

PLAN-DB-1R: предыдущий запуск не оставил обнаруженных partial artifacts этого change/task. Read-only проверка текущего дерева: 21 ревизия, единственный head `c8fda9794a60`, циклов и отсутствующих родителей нет. `src/alembic.ini`: `script_location = %(here)s/migration`. SELECT в read-only транзакции: ровно одна строка `d1e2f3a4b5c6`; эта ревизия отсутствует в текущем дереве. Контейнер БД `eqsitecms-db`, Compose project `eqsitecms-infra`, alias `db`; приложение `eqsitecms-app`, project `eqsitecms-be`, running/unhealthy.

## Ожидаемый результат после approval

Только транзакционный compare-and-swap marker `d1e2f3a4b5c6` → `c8fda9794a60` с проверкой единственной строки, snapshot прежнего marker, rowcount=1 и rollback при любом несоответствии. Затем SELECT/current/heads; health проверяется отдельным runtime unit.

**Риск, требующий явного подтверждения пользователя:** смена marker НЕ отменяет изменения schema удалённой миграции и НЕ доказывает schema equivalence. Schema repair вне scope и требует другого approval. Если граф или DB identity стали неоднозначными — остановка, без угадывания.

Не создавать/удалять миграции, не выполнять stamp/upgrade/downgrade, не менять schema, Docker-файлы, другие сервисы или чужой dirty diff. Секреты/DSN не публиковать. Реализационный план и checklist находятся только в OpenSpec change.
