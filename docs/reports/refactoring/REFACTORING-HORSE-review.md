# Review: REFACTORING-HORSE (повторная проверка после REWORK)

**Статус: ✅ APPROVED**
**Дата:** 2026-05-06
**Ветка:** feature/refactoring-testing-audit

---

## Цель

Зафиксировать завершение цикла рефакторинга `horse` по плану `docs/plans/feature/refactoring/refactoring_horse.md` и подтвердить финальное качество после обязательного rework-шага.

---

## Что сделано

- Завершен целевой рефакторинг сервисного слоя `horse` в `services/backend`.
- Уточнен permission contract и поведение сервисных методов в рамках требований плана.
- Доработан rollback-intent контракт в pedigree-сценариях.
- Расширено unit-покрытие для `horse` use cases в `tests/unit/core/services/test_horse_service.py`.
- Актуализирован статус выполнения в `docs/plans/feature/refactoring/refactoring_horse.md`.

---

## Цикл проверок

1. **Backend:** внесены изменения по плану `refactoring_horse`.
2. **Quality Gate #1:** вердикт `REWORK`.
3. **Backend (rework):** закрыты замечания QG (усилен контракт и тестовое покрытие, подтвержден фактический diff).
4. **Quality Gate #2:** финальный вердикт `PASS`.

Итоговый маршрут полностью пройден: **Backend -> QualityGate -> rework -> QualityGate(pass)**.

---

## Результаты тестов

| Проверка | Команда/набор | Результат | Примечание |
|---|---|---|---|
| Unit (target) | `tests/unit/core/services/test_horse_service.py` | **14 passed** | Финальный прогон после rework, без падений |
| Данные для тестов | - | **Не требуются** | БД-сидинг не понадобился, проверка закрыта на unit-уровне через fake-репозитории |

### API smoke (реальный API)

Smoke-результаты ранее в этом отчете отсутствовали; прогон выполнен дополнительно на `http://localhost:8001` с cookie-auth (роль `su`) по скиллу `api-smoke-test`.

Использованы:
- credentials: `.claude/skills/api-smoke-test/credentials.json`
- cookie jar: `/tmp/eqsitecms-smoke-cookies.txt`
- auth endpoint: `/api/auth/login`

| # | Endpoint | Method | HTTP | Результат |
|---|---|---|---|---|
| SM-HR-00 | `/health` | GET | 200 | ✅ passed, API доступен |
| SM-HR-01 | `/api/auth/login` | POST | 200 | ✅ passed, cookie получены |
| SM-HR-02 | `/api/auth/me` (с cookie) | GET | 200 | ✅ passed, возвращается профиль `su` |
| SM-HR-03 | `/api/horses?limit=1&offset=0` | GET | 200 | ✅ passed, `total=1000`, `items_len=1` |
| SM-HR-04 | `/api/horses/{horse_id}` | GET | 200 | ✅ passed, чтение horse по `id` работает |
| SM-HR-05 | `/api/horses/{horse_id}/pedigree/sire?limit=2&offset=0` | GET | 200 | ✅ passed, endpoint корректно работает |
| SM-HR-06 | `/api/horses/{horse_id}/pedigree/invalid` | GET | 400 | ✅ passed, route найден и сработала валидация `mode` |
| SM-HR-07 | `/api/horses/{horse_id}` + `{}` | PATCH | 400 | ✅ passed, `detail=Нет данных для обновления` |

Итог smoke (повторный прогон после фикса): **8/8 passed**, **0 failed**.

Root cause был в маршруте и контракте mode:
- в `services/backend/src/api/horses.py` pedigree-роуты были объявлены без ведущего `/`, из-за чего путь регистрировался некорректно и отдавал `404`;
- в том же роуте mode был `dame` вместо контрактного `dam`, что ломало ожидаемую валидацию для клиентского контракта.

---

## Итоговый вердикт

**APPROVED (PASS).**  
Последний цикл рефакторинга `horse` завершен успешно: замечания первого QG закрыты, повторный QG подтверждает готовность результата в рамках заданного scope.

---

## Остаточные риски и следующие шаги

- В рамках текущего круга подтвержден целевой `horse` scope; перед merge рекомендуется общий sanity-прогон по связанным backend-модулям.
- Если требуется расширение beyond-target покрытия, можно запланировать отдельную итерацию на дополнительные UC-сценарии вне текущего обязательного минимума.
