# Review: REFACTORING-SITE-SETTINGS (финальная проверка)

**Статус: ✅ APPROVED**
**Дата:** 2026-05-06
**Ветка:** main

---

## Ссылки

- План: `docs/plans/feature/refactoring/refactoring_site_settings.md`

## Краткий контекст

По задаче `REFACTORING-SITE-SETTINGS` выполнен рефакторинг backend-модуля `site_settings` с фокусом на контракт typed-value валидации, поведении `update` (empty/type/value transitions), устранении ручной not-found обработки на API-уровне и покрытии сервисного слоя unit-сценариями UC01-UC30.

Финальный цикл quality gate подтверждает стабильность целевого набора тестов: таргетный unit-запуск по `site_settings service` завершён успешно (`37 passed`).

---

## Изменённые файлы

| Файл | Что изменено |
|---|---|
| `services/backend/src/api/site_settings.py` | API-поведение выровнено с сервисным контрактом ошибок (not-found через сервисный слой) |
| `services/backend/src/core/services/site_settings.py` | Уточнена бизнес-валидация typed string values, проверки duplicate key/name, сценарии update переходов типа/значения |
| `services/backend/tests/unit/core/services/test_site_settings_service.py` | Добавлены/актуализированы unit-тесты на ключевые edge cases и UC-покрытие для методов сервиса |

---

## Unit / Integration тесты

| Команда | Результат | Примечание |
|---|---|---|
| `uv run pytest tests/unit/core/services/test_site_settings_service.py -q` | **37 passed, 7 warnings** | Целевой тестовый прогон выполнен успешно, без падений |

---

## SMOKE-тесты

SMOKE выполнен по skill `.claude/skills/api-smoke-test/SKILL.md` с cookie-авторизацией (`/api/auth/login`, роль `su`) на реальном API `http://localhost:8001`.

⚠️ В плане `docs/plans/feature/refactoring/refactoring_site_settings.md` отсутствует секция `SMOKE-тесты на реальном API`, поэтому использован минимально корректный smoke-набор для `site_settings` CRUD/list на основе текущего API-контракта.

| # | Endpoint | Method | HTTP | Результат | Примечание |
|---|---|---|---|---|---|
| SM-01 | `/api/auth/login` | POST | 200 | ✅ pass | Cookie авторизация успешна (`access_token`/`refresh_token`) |
| SM-02 | `/api/auth/me` | GET | 200 | ✅ pass | Пользователь `su` подтверждён |
| SM-03 | `/api/site_settings` | GET | 200 | ✅ pass | Возвращается список simple DTO, `len=11` |
| SM-04 | `/api/site_settings?full=true&limit=5&offset=0` | GET | 200 | ✅ pass | Возвращается paginated ответ, `total=11`, `items=5` |
| SM-05 | `/api/site_settings` | POST | 200 | ✅ pass | Создана запись `smoke_site_settings_1778075721` |
| SM-06 | `/api/site_settings/{id}` | GET | 200 | ✅ pass | Созданная запись читается по id |
| SM-07 | `/api/site_settings/{id}` | PATCH | 200 | ✅ pass | `value` обновлён на `updated-by-smoke` |
| SM-08 | `/api/site_settings/{id}` | PATCH | 400 | ✅ pass | Негативный кейс: `type=number`, `value=not-a-number` даёт валидационную ошибку |
| SM-09 | `/api/site_settings/{id}` | DELETE | 204 | ✅ pass | Тестовая запись удалена |
| SM-10 | `/api/site_settings/{id}` | GET | 400 | ✅ pass | После удаления возвращается `detail: "Настройка не найдена"` |

**Итог SMOKE: 10/10 тестов прошли.**

---

## Замечания и риски

- Есть 7 предупреждений окружения (`PydanticDeprecatedSince20`) в тестовом выводе; это не блокирует текущий scope, но требует отдельной плановой миграции конфигов на `ConfigDict`.
- В плане отсутствует формализованная SMOKE-секция для `site_settings`; для следующих циклов стоит добавить явные сценарии и ожидаемые коды/поля прямо в `docs/plans/feature/refactoring/refactoring_site_settings.md`.

---

## Rework checklist

### Backend

- [x] Не требуется дополнительный rework по текущему scope (`site_settings`) после финального unit-прогона

### Frontend

- [x] Не требуется (scope задачи: `services/backend`)

### Quality Gate

- [x] Повторно запущен целевой unit-тест (`37 passed`)
- [x] Выполнен реальный API smoke-прогон по cookie-авторизации (`10/10 passed`)

