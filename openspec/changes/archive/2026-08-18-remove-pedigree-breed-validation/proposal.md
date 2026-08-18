## Why

Текущие операции управления родословной ошибочно считают `breed.kind` обязательным критерием биологической совместимости: GET скрывает кандидатов другого типа/без породы, а POST отклоняет такие связи. Родословная должна определяться собственными инвариантами связей, пола и дат, независимо от породы и её типа.

## What Changes

- Убрать из `GET /api/horses/{horse_id}/pedigree/{mode}` (`sire`, `dam`, `children`) все pedigree-фильтры по породе, отсутствию породы и `breed.kind`.
- Убрать из `POST /api/horses/{horse_id}/pedigree` загрузку пород и валидацию совместимости целевой лошади, родителей и потомков по `breed.kind`.
- Разрешить pedigree-связи между лошадьми любых пород, разных `breed.kind`, а также между лошадьми с заполненной и отсутствующей породой.
- Сохранить без изменений tenant isolation, запрет self-link и конфликтующих immediate relations, требования к полу родителей, правила дат рождения/смерти, занятость родительского слота ребёнка, пагинацию, поиск и сортировку.
- Обновить unit/API/repository tests и выполнить smoke-проверки на живом API с реальной PostgreSQL; схема БД и DTO не меняются.
- Зафиксировать неизменный access contract в delta spec: GET остаётся Public Read с tenant selector, POST — Protected Write для `ADMIN`.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `backend-domain-capabilities`: управление родословной больше не фильтрует и не валидирует кандидатов по породе или `breed.kind`, сохраняя остальные pedigree-инварианты и действующую модель доступа.

## Impact

- Backend service: `services/backend/src/core/services/horse.py`.
- SQLAlchemy repository: `services/backend/src/repositories/horse_repository.py`.
- Контрактные и регрессионные тесты pedigree в `services/backend/tests`.
- API payload, response DTO, database schema, migrations, frontend, site consumers и NATS-контракты не изменяются.
- Источники контекста: пользовательское уточнение и исходная задача `docs/tasks/011_horse_pedigree_management.md`; `docs/plans` остаётся read-only legacy-контекстом.
