## Why

В задачах `027_horse_services_management` и `028_horse_services_management_cont` реализованы механики управления связями услуг и лошадей, включая фильтрацию лошадей по наличию определённой услуги. Site Consumer хранит не UUID услуг, а их наименования, поэтому управлять доступными услугами должен разработчик (dev/su), а не администратор CMS. Текущая реализация не разграничивает права доступа: все пользователи с admin scope могут создавать, изменять и удалять услуги, что противоречит архитектуре, где услуги являются словарём разработчика.

## What Changes

- **BREAKING**: Добавить разграничение прав доступа для horse services: пользователи с группой `dev` или `su` получают полный доступ (CRUD), пользователи с группой `admin` — только чтение (GET).
- Реализовать дополнительный фильтр на эндпоинте получения лошадей для site consumer: фильтрация по наименованиям услуг (не UUID) для публичного API.
- На CMS Frontend реализовать ограничение прав аналогично паттерну `price_groups`: admin не может создавать, удалять или изменять наименование услуг.
- Сохранить существующую access policy: GET остаются Public Read, POST/PATCH/DELETE — Protected Write; добавить исключение для horse services endpoints с ограниченным набором ролей.

## Capabilities

### New Capabilities

- `horse-services-permissions`: Новая capability для управления правами доступа к horse services с разграничением ролей dev/su (полный доступ) и admin (только чтение), включая backend permission checks и frontend scope restrictions.

### Modified Capabilities

- `backend-domain-capabilities`: Добавить требования к permission checks для horse services endpoints: dev/su получают полный CRUD доступ, admin — только чтение. Включить access matrix с явным указанием ролей и ожидаемых HTTP-статусов.
- `cms-horse-ui-quality`: Добавить frontend scope restrictions для horse services аналогично price_groups: admin не может создавать, удалять или изменять наименование услуг. Включить тест-матрицу для проверки прав доступа.

## Impact

- Backend: `services/backend/src/core/services/horse_service.py` (добавить permission checks), `services/backend/src/api/horse_service.py` (обновить зависимости), `services/backend/src/api/horses.py` (добавить фильтр по наименованиям услуг для site consumer).
- Frontend: `services/frontend/src/features/horses/hooks/useHorseScopes.ts` (добавить scope restrictions для horse services).
- API: Новый query parameter `service_names` на эндпоинте `GET /horses` для фильтрации по наименованиям услуг; обновлённые зависимости для horse services endpoints.
- Тесты: Backend unit tests для permission checks, frontend component tests для scope restrictions, smoke tests для проверки access matrix.
- NATS, migrations и site-ad не затрагиваются.
