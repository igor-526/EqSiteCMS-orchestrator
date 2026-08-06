## Context

Задача `030_horse_services_permissions` требует настройки прав доступа для horse services аналогично паттерну `price_groups`. Текущая реализация horse services не разграничивает права: все пользователи с admin scope могут создавать, изменять и удалять услуги. Site Consumer хранит наименования услуг (не UUID) для фильтрации лошадей, поэтому управление услугами должно быть доступно только разработчикам (dev/su).

Существующий паттерн в `price_groups` реализован через:
- Backend: `_ADMIN_SCOPE_NAMES` в `PriceGroupService`, метод `_check_admin_permission`
- Frontend: `usePriceScopes.ts` с `pricePageScopesRegistry` где ADMIN имеет ограниченные права

Текущая архитектура horse services:
- Backend service: `services/backend/src/core/services/horse_service.py` (нет permission checks)
- Backend API: `services/backend/src/api/horse_service.py` (依赖 get_current_user)
- Frontend scopes: `services/frontend/src/features/horses/hooks/useHorseScopes.ts` (нет restrictions для services)

## Goals / Non-Goals

**Goals:**

- Реализовать разграничение прав доступа для horse services: dev/su — полный CRUD, admin — только чтение (GET)
- Добавить backend permission checks аналогично `_check_admin_permission` в `PriceGroupService`
- Реализовать фильтр лошадей по наименованиям услуг для site consumer (не UUID)
- На CMS Frontend реализовать ограничение прав аналогично `price_groups`: admin не может создавать, удалять или изменять наименование услуг
- Сохранить существующую access policy: GET остаются Public Read, POST/PATCH/DELETE — Protected Write
- Добавить исключение для horse services endpoints с ограниченным набором ролей (dev/su для CRUD, admin для GET)

**Non-Goals:**

- Изменение существующей архитектуры horse services (модели, миграции, NATS)
- Изменение site-ad consumer или межсервисных контрактов
- Рефакторинг всей horse page architecture
- Изменение других horse-related endpoints (breeds, coat colors, owners)

## Decisions

1. **Backend permission pattern**: Использовать тот же паттерн, что и в `PriceGroupService`: добавить `_ADMIN_SCOPE_NAMES` и `_check_admin_permission` метод в `HorseServiceService`. Для horse services `_ADMIN_SCOPE_NAMES` будет включать только `SUPERUSER` и `DEVELOPER` (не `ADMIN`), так как admin не может создавать и удалять услуги. Однако admin может обновлять услуги (кроме наименования). Альтернатива — использовать отдельный middleware — отвергнута, потому что это увеличило бы сложность и не соответствует существующему паттерну.

2. **Frontend scope pattern**: Использовать тот же паттерн, что и в `usePriceScopes.ts`: добавить `HORSE_SERVICE_SCOPES_ACTIONS` enum и `horseServicePageScopesRegistry` с ограниченными правами для ADMIN. ADMIN может обновлять услуги (описание, URL, цену), но не может создавать, удалять или изменять наименование. Альтернатива — использовать существующий `useHorsePageActionScopes` — отвергнута, потому что это нарушило бы принцип разделения ответственности.

3. **Фильтр лошадей по наименованиям услуг**: Добавить новый query parameter `service_names` (list[str]) на эндпоинт `GET /horses` для site consumer. Фильтрация будет выполняться по наименованиям услуг (не UUID), как требуется в задаче. Альтернатива — использовать существующий фильтр по UUID — отвергнута, потому что site consumer хранит наименования, а не UUID.

4. **Валидация фильтра по наименованиям**: Фильтр по наименованиям услуг будет **регистронезависимым**, но будет требовать **полного совпадения наименования** (не подстрока). Например, запрос `service_names=продажа` будет включать только услугу «продажа», но не «продажа и аренда». Это обеспечивает точность фильтрации для site consumer.

5. **Индекс для фильтрации**: Добавление индекса на поле `name` в таблице `horse_services` **не требуется**, так как услуг будет не много и производительность не будет проблемой.

6. **Кэширование списка услуг**: Кэширование списка услуг для site consumer **не требуется** на данном этапе.

7. **Access matrix**: Добавить явное исключение из дефолтной политики для horse services endpoints:
   - `GET /horses/services` — Public Read (без изменений)
   - `GET /horses/services/{slug_or_id}` — Public Read (без изменений)
   - `POST /horses/services` — Protected Write (только dev/su)
   - `PATCH /horses/services/{slug_or_id}` — Protected Write (только dev/su)
   - `DELETE /horses/services/{slug_or_id}` — Protected Write (только dev/su)
   - `GET /horses` с `service_names` — Public Read (без изменений)

8. **Ownership**: Backend Agent владеет backend services/tests; Frontend Agent после backend-контракта владеет frontend scopes и tests. Затем один Quality Gate проверяет совокупный diff.

## Risks / Trade-offs

- [Admin теряет возможность управлять услугами] → Это намеренное ограничение: услуги являются словарём разработчика, admin должен использовать существующие услуги, а не создавать новые.
- [Breaking change для admin пользователей] → Документировать изменение в release notes; admin пользователи должны обратиться к разработчикам для добавления новых услуг.
- [Разные auth checks у horse services и других horse endpoints] → Quality Gate сверяет фактическую access matrix и фиксирует несоответствие как finding.

## Migration Plan

1. После approval последовательно выполнить backend, затем frontend deliverable.
2. Запустить unit/frontend checks и live smoke с повторным `docker inspect`.
3. Провести единый Quality Gate, устранить findings и повторить review.
4. Синхронизировать delta specs, повторить strict validation и архивировать change.
5. Rollback — откат path-scoped runtime diff; миграций данных нет.
