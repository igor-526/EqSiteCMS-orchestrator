# План: backend-only parent index для рефакторинга и unit-тестов EqSiteCMS

**Тикет:** REFACTORING-TESTING-AUDIT
**Дата:** 2026-05-06
**Затронутые сервисы:** services/backend
**Ветка:** feature/refactoring-testing-audit
**Статус:** draft, требуется согласование пользователя до передачи Backend/Quality Gate

---

## Контекст

Исходный большой backend-only аудит разделен на модульные планы по сервисному слою `services/backend/src/core/services/*`.

Этот parent plan остается индексом, общим архитектурным контрактом и каталогом UC01-UC30. Реализацию начинать нельзя до согласования пользователя. После согласования Router передает Backend один или несколько модульных планов, затем Quality Gate проверяет готовый diff.

## Модульные планы

| Модуль | План | Основной сервис |
|---|---|---|
| auth | [refactoring_auth.md](refactoring_auth.md) | `AuthService` |
| breeds | [refactoring_breeds.md](refactoring_breeds.md) | `BreedService` |
| coat_color | [refactoring_coat_color.md](refactoring_coat_color.md) | `CoatColorService` |
| horse | [refactoring_horse.md](refactoring_horse.md) | `HorseService` |
| horse_owner | [refactoring_horse_owner.md](refactoring_horse_owner.md) | `HorseOwnerService` |
| horse_service | [refactoring_horse_service.md](refactoring_horse_service.md) | `HorseServiceService` |
| photos | [refactoring_photos.md](refactoring_photos.md) | `PhotoService` |
| prices | [refactoring_prices.md](refactoring_prices.md) | `PriceGroupService`, `PriceService` |
| site_settings | [refactoring_site_settings.md](refactoring_site_settings.md) | `SiteSettingsService` |
| users | [refactoring_users.md](refactoring_users.md) | `UserService` |

## Общие backend-правила

- Scope только `services/backend`.
- `api -> depends -> core.services -> core.entities / core.schemas / core.protocols`.
- API-роутеры не содержат бизнес-логику, SQL, ручные транзакции, сложную сборку DTO или прямое получение репозиториев для use case.
- Сервисы зависят от Protocol из `core/protocols`, а не от concrete repositories/adapters.
- `core/entities` не импортируют API, repositories, models, settings или database utilities.
- `core/schemas` отвечают за структуру DTO; ожидаемая пользовательская и бизнес-валидация живет в service/entity.
- Expected validation должна выходить через `ClientError`/специализированные клиентские ошибки с HTTP 400.
- Структурный FastAPI/Pydantic 422 допустим только для формы запроса.
- `fastapi_template` не использовать как эталон.
- Unit-тесты писать через Protocol-compatible fakes/stubs, без реальной БД и внешней инфраструктуры.

## Общий каталог UC01-UC30

Каждая service function, перечисленная в модульных планах, должна получить отдельные unit-сценарии UC01-UC30. Допустимы parametrized helpers, но имена тестов и отчетность должны оставаться привязанными к конкретной функции.

1. UC01 happy path: валидные входные данные дают ожидаемый результат функции.
2. UC02 minimal input: минимально допустимый набор полей/аргументов принят.
3. UC03 full input: полный набор опциональных аргументов обработан без потери данных.
4. UC04 omitted optional: отсутствующие опциональные значения сохраняют существующее состояние или default по контракту.
5. UC05 empty value: пустая строка/list/object отклоняется или нормализуется по бизнес-правилу.
6. UC06 whitespace value: значения из пробелов не проходят как валидные бизнес-значения.
7. UC07 unicode/case: Unicode, регистр и локализация не ломают сравнение/нормализацию.
8. UC08 boundary min: минимальное граничное значение принято.
9. UC09 below min: значение ниже минимума дает `ClientError`.
10. UC10 boundary max: максимальное граничное значение принято.
11. UC11 above max: значение выше максимума дает `ClientError`.
12. UC12 malformed id/slug/token: неверный формат идентификатора или токена обрабатывается детерминированно.
13. UC13 not found: отсутствующая зависимая или целевая сущность дает ожидаемую клиентскую ошибку.
14. UC14 duplicate/conflict: дубликат уникального бизнес-значения мапится в `ClientError`/HTTP 400.
15. UC15 self-exclusion: update не конфликтует с текущей сущностью при неизмененных уникальных полях.
16. UC16 reference validation: все reference ids проверяются до persistence/use-case side effects.
17. UC17 permission allowed: разрешенный пользователь/роль проходит проверку.
18. UC18 permission denied: пользователь без прав получает клиентскую ошибку без раскрытия лишних данных.
19. UC19 partial update: меняются только явно переданные поля.
20. UC20 empty update: пустой payload отклоняется или является no-op только по явному контракту.
21. UC21 repository failure: ожидаемая ошибка Protocol dependency превращается в клиентскую/domain error.
22. UC22 dependency order: вызовы Protocol fakes выполняются в безопасном порядке без преждевременных side effects.
23. UC23 rollback intent: при ошибке после промежуточного шага функция не оставляет подтвержденный частичный state в fake dependencies.
24. UC24 idempotency/retry: повторный вызов или retry не создает неконтролируемых дублей.
25. UC25 sorting stability: сортировка стабильна при одинаковых значениях ключей.
26. UC26 filtering semantics: несколько фильтров применяются как пересечение, если контракт не говорит иначе.
27. UC27 pagination semantics: limit/offset/page boundaries обрабатываются явно.
28. UC28 serialization/mapping: Entity/DTO/result не теряет поля и не раскрывает приватные данные.
29. UC29 structural vs business validation: структурные ошибки могут оставаться 422, expected бизнес-валидация идет через service/entity `ClientError`/HTTP 400.
30. UC30 architecture boundary: функция не зависит от FastAPI, concrete repositories, SQLAlchemy models, runtime settings или filesystem вне Protocol/DI границы.

## Порядок передачи Backend

1. `prices` - самый крупный слой нарушения API/service boundary.
2. `photos` - отделение FastAPI/filesystem/settings от сервиса и схем.
3. `horse` - самый широкий use-case слой, права, pedigree, фильтры, DTO mapping.
4. `breeds`, `coat_color`, `horse_service` - однотипный slug/name CRUD.
5. `horse_owner`, `site_settings` - валидация DTO/entity и not-found contract.
6. `auth`, `users` - безопасность, DTO mapping, минимальные сервисы.
7. Quality Gate после каждого крупного блока или после согласованной пачки.

## Чеклист

> Этот раздел используется агентами для отслеживания прогресса.
> Реализацию не начинать до согласования пользователем.

### Planning

- [x] Разделить большой plan на модульные backend-only планы
- [x] Оставить parent plan как индекс и общий контракт
- [x] Зафиксировать UC01-UC30 как общее требование для каждой service function
- [ ] Получить пользовательское согласование перед передачей Backend

