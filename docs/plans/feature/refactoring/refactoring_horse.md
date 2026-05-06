# План: refactoring horse module

**Тикет:** REFACTORING-HORSE
**Дата:** 2026-05-06
**Затронутые сервисы:** services/backend
**Ветка:** feature/refactoring-testing-audit
**Статус:** in progress (rework после Quality Gate)

---

## Контекст

Модуль `horse` содержит самый широкий service layer: admin checks, DTO mapping, references на breed/coat_color/owner, full-info lookup, pedigree use cases, фильтрацию и заглушки для услуг лошади. В коде есть риск дефекта в `update_horse`: после проверки непустого payload `update_data` сбрасывается в `{}`, поэтому изменения не применяются.

## Цель

Зафиксировать чистую service boundary для horse use cases, исправить планово выявленные дефекты поведения и покрыть каждую функцию UC01-UC30.

## Файлы

| Слой | Файлы |
|---|---|
| API | `services/backend/src/api/horses.py` |
| DI | `services/backend/src/depends/services.py`, `services/backend/src/depends/repositories.py` |
| Service | `services/backend/src/core/services/horse.py` |
| Schemas | `services/backend/src/core/schemas/horses.py`, `services/backend/src/core/schemas/users.py` |
| Entities | `services/backend/src/core/entities/horse.py`, `services/backend/src/core/entities/breeds.py`, `services/backend/src/core/entities/coat_color.py`, `services/backend/src/core/entities/horse_owner.py`, `services/backend/src/core/entities/photos.py`, `services/backend/src/core/entities/horse_service.py` |
| Protocols | `services/backend/src/core/protocols/repositories/horse_repository.py`, `breed_repository.py`, `coat_color_repository.py`, `horse_owner_repository.py` |
| Repository | `services/backend/src/repositories/horse_repository.py` |
| Tests | `services/backend/tests/unit/core/services/test_horse_service.py` |

## Что рефакторить

- Исправить `update_horse`: не сбрасывать `update_data` после empty payload check; применять только явно переданные поля.
- Уточнить `_check_admin_permission`: удалить unreachable code после `return True`, определить реальную проверку scopes/roles или явно зафиксировать текущий admin contract.
- Проверить, что все permission denied идут через `ClientError`, без API business checks.
- Проверить `_get_horse_dto` на отсутствие потери полей и приватных данных.
- В `create_horse` проверять reference ids до persistence и мапить `ValidationError` entity в `ClientError`.
- В `update_horse` проверять reference ids до repository update и покрыть partial update.
- В `get_horse_by_slug_or_id` зафиксировать deterministic parsing UUID vs slug.
- В `get_available_pedigree` вынести/покрыть normalization limit/offset и invalid mode contract.
- В `set_horse_pedigree` проверить duplicate IDs, self-cycle, missing horses, clear/set order и rollback intent через fake `HorseChildrenRepositoryProtocol`.
- Для `add_horse_service`, `remove_horse_service`, `update_horse_service` решить: реализовать use case по плану отдельного модуля или явно удалить/исключить как неиспользуемые; пока покрыть как service functions из текущего слоя.

## Unit-тесты service functions (фактическое покрытие rework-итерации)

| Класс | Функция | Тип | Покрытые сценарии в этой итерации |
|---|---|---|---|
| `HorseService` | `_check_admin_permission` | helper function | UC17, UC18 |
| `HorseService` | `create_horse` | public service function | UC16, UC21 |
| `HorseService` | `update_horse` | public service function | UC18, UC19, UC20 |
| `HorseService` | `get_horse_by_slug_or_id` | public service function | UC12 |
| `HorseService` | `get_available_pedigree` | public service function | UC27 |
| `HorseService` | `set_horse_pedigree` | public service function | UC14, UC22, UC23 |
| `HorseService` | `add_horse_service` | public service function placeholder | UC30 |
| `HorseService` | `remove_horse_service` | public service function placeholder | UC30 |
| `HorseService` | `update_horse_service` | public service function placeholder | UC30 |

### Принятая стратегия покрытия на текущем этапе

Полная матрица UC01-UC30 для каждой функции признана нереалистичной в рамках одного rework-прохода. Для pass по текущему QG-кругу фиксируется обязательный минимум:
- permission contract (UC17/UC18);
- reference validation и empty/partial update (UC16/UC19/UC20);
- deterministic slug/id parsing и pagination normalization (UC12/UC27);
- pedigree duplicate/order/rollback intent (UC14/UC22/UC23);
- architecture boundary для placeholder-функций (UC30).

Оставшиеся UC покрываются отдельными итерациями по приоритету бизнес-риска.

## Чеклист

- [x] Исправить `update_horse` payload handling
- [x] Зафиксировать permission contract (admin scopes: SUPERUSER/ADMIN/DEVELOPER)
- [ ] Покрыть DTO mapping без потери полей
- [ ] Покрыть reference validation до persistence
- [x] Покрыть pedigree clear/set order и rollback intent
- [ ] Принять решение по placeholder service functions
- [ ] Довести расширенное покрытие оставшихся UC в отдельных итерациях
