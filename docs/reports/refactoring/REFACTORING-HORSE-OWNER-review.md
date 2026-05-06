# Review: REFACTORING-HORSE-OWNER (повторная проверка после REWORK)

**Статус: ✅ APPROVED**
**Дата:** 2026-05-06
**Ветка:** main

---

## Краткий контекст

Рефакторинг модуля `horse_owner`:
- Валидация телефонов вынесена из `InDto` в сервис (`_validate_phone_numbers()`)
- Добавлен `get_by_id_or_raise()` — используется в `update()`, `delete()` и роутере
- `update()` проверяет пустой payload (`"Нет данных для обновления"`)
- `create()` оборачивает `ValidationError` в `ClientError`
- В `api/horse_owner.py` убран ручной `if horse_owner is None: raise HTTPException(404)`
- **Исправлен route conflict**: `horse_owner_router` зарегистрирован ПЕРЕД `horses_router` (строки 48-49 в `main.py`)
- **Рефакторинг `update()` и `delete()`**: теперь используют `get_by_id_or_raise()` вместо ручной проверки
- Созданы 85 unit-тестов (UC01-UC30) через `FakeHorseOwnerRepository`

---

## Изменённые файлы

| Файл | Что изменено |
|---|---|
| `src/core/schemas/horse_owner.py` | Удалены `@field_validator("phone_numbers")` и импорт `ClientError` из обоих InDto |
| `src/core/services/horse_owner.py` | Добавлены `_validate_phone_numbers()`, `get_by_id_or_raise()`; `update()` и `delete()` используют `get_by_id_or_raise()`; `create()` обёрнут в try/except ValidationError |
| `src/api/horse_owner.py` | Убран ручной `if horse_owner is None: raise HTTPException(404)`, используется `get_by_id_or_raise` |
| `src/main.py` | `horse_owner_router` перемещён ПЕРЕД `horses_router` — устранён route conflict |
| `tests/unit/core/services/test_horse_owner_service.py` | 85 unit-тестов UC01-UC30 для 5 методов сервиса через FakeHorseOwnerRepository |

---

## Чеклист Архитектура (Backend)

- [x] `domain/` не импортирует из `application/`, `infrastructure/`, `interfaces/`
- [x] Сервис принимает `*InDto`, а не `dict` или `Request`-схему
- [x] Бизнес-логика отсутствует в роутерах (только вызов сервиса)
- [x] SQLAlchemy-модели не импортированы в `application/` или `domain/`
- [x] Нет `try/except` доменных исключений в роутерах
- [x] Все бизнес-ошибки в сервисах выбрасываются через `ClientError`
- [x] Валидация значений (`phone_numbers`) перенесена из `InDto` в сервис — правильно
- [x] `ClientError` зарегистрирован в `main.py` как exception handler
- [x] Route conflict исправлен: `horse_owner_router` зарегистрирован ПЕРЕД `horses_router`
- [x] `update()` и `delete()` используют `get_by_id_or_raise()` — DRY соблюдён

---

## Чеклист Код-стиль

- [x] Типизация: все публичные функции имеют аннотации типов
- [x] Нет `dict[str, Any]` как аргументов сервисов
- [x] Нет глобальных синглтонов
- [x] Именование соответствует конвенциям

---

## Чеклист Безопасность

- [x] Нет хардкода секретов
- [x] SQL-инъекции исключены (протокол репозитория)

---

## Unit / Integration тесты

| Команда | Результат | Примечание |
|---|---|---|
| `PYTHONPATH=src uv run pytest tests/unit/core/services/test_horse_owner_service.py` | **80 passed, 5 skipped** | 5 skipped — обоснованные N/A (auth, sort/filter/pagination для update()) |
| `uv run mypy src/core/services/horse_owner.py src/core/schemas/horse_owner.py src/api/horse_owner.py src/main.py` | **Success: no issues found in 4 source files** | Типизация чистая |

---

## SMOKE-тесты

Авторизация: `POST /api/auth/login` (role: superuser) — HTTP 200. Пользователь: `su`.

| # | Endpoint | Method | HTTP | Time | Результат | Примечание |
|---|---|---|---|---|---|---|
| SM-01 | `/api/horses/owners` | GET | 200 | 28 ms | ✅ | total=31, items_count=31 — route conflict устранён |
| SM-02 | `/api/horses/owners?limit=5` | GET | 200 | 26 ms | ✅ | total=31, items_count=5 — пагинация работает |
| SM-03 | `/api/horses/owners?offset=0&limit=2` | GET | 200 | 24 ms | ✅ | total=31, items_count=2 — offset пагинация работает |
| SM-04 | `/api/horses/owners?sort=name` | GET | 200 | 23 ms | ✅ | Сортировка по возрастанию работает |
| SM-05 | `/api/horses/owners?sort=-name` | GET | 200 | 21 ms | ✅ | Сортировка по убыванию работает |
| SM-06 | `/api/horses/owners/{id}` | GET | 200 | 29 ms | ✅ | Получение существующего владельца по UUID |
| SM-07 | `/api/horses/owners/00000000-0000-0000-0000-000000000000` | GET | 400 | 34 ms | ✅ | Несуществующий UUID → ClientError 400 "Владелец не найден" |
| SM-08 | `/api/horses/owners` | POST | 200 | 27 ms | ✅ | Создание владельца с name+phone → id возвращён |
| SM-09 | `/api/horses/owners/{new_id}` | PATCH | 200 | 29 ms | ✅ | Обновление name+phone → обновлённые поля в ответе |
| SM-09b | `/api/horses/owners/{new_id}` | PATCH | 400 | 23 ms | ✅ | Невалидный phone "not-a-phone" → ClientError 400 |
| SM-10 | `/api/horses/owners/{new_id}` | DELETE | 204 | 26 ms | ✅ | Удаление существующего → 204 No Content |
| SM-10b | `/api/horses/owners/00000000-0000-0000-0000-111111111111` | DELETE | 400 | 26 ms | ✅ | Удаление несуществующего → ClientError 400 "Владелец не найден" |

**Итог SMOKE: 12/12 passed.**

---

## Итог

Все проблемы из предыдущего REWORK-отчёта устранены:

1. **Route conflict исправлен** — `GET /api/horses/owners` возвращает HTTP 200 (ранее было 400).
2. **DRY в сервисе** — `update()` и `delete()` используют `get_by_id_or_raise()`.
3. **Unit-тесты**: 80 passed, 5 skipped — соответствует ожиданию.
4. **Mypy**: чистый, 4 файла без ошибок.
5. **SMOKE**: все 12 сценариев прошли, включая ключевой `GET /api/horses/owners`.

Готово к merge.
