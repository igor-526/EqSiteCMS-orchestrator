# Review: horse-management-pedigree-enrich

**Статус: APPROVED**
**Дата:** 2026-05-23
**Ветка:** `feature/horse-management-pedigree-enrich`

## Ссылки

- **Задача:** `docs/tasks/horse_management_pedigree_enrich.md`
- **План:** `docs/plans/feature/horse_management_pedigree_enrich.md`

## Итог

Diff полностью соответствует плану. Реализованы новые DTO (`FoalParentRefDto`, `FoalParentsDto`, `HorseFoalOutDto`), обновлён репозиторий с дополнительным SQL-запросом за производителями жеребят, обновлены тесты и TypeScript-типы `site-ad`. Архитектура не нарушена, тесты зелёные, SMOKE-тесты прошли, access policy сохранена.

## Изменённые файлы

| Сервис | Файл | Изменений |
|---|---|---|
| `services/backend` | `src/core/schemas/horses.py` | +29 строк — новые DTO |
| `services/backend` | `src/core/schemas/__init__.py` | +9 строк — экспорт DTO |
| `services/backend` | `src/repositories/horse_repository.py` | +62 строки — SQL-запрос + сборка parents |
| `services/backend` | `tests/unit/core/services/test_horse_service.py` | +16 строк — обновление тестов |
| `services/site-ad` | `src/types/horse.ts` | +15 строк — новые TS-типы |

---

## Чеклист: Архитектура (Backend)

- [x] `api/` не изменялся — бизнес-логика и SQL только в репозитории
- [x] `core/services/` не изменялся — зависит от Protocol-контрактов
- [x] `core/entities/` не изменялся — нет запрещённых импортов
- [x] SQLAlchemy tables из `models/` не импортированы в `core/schemas/` или `core/entities/`
- [x] Depends-сборка не изменялась
- [x] Нет новых глобальных синглтонов
- [x] Нет `dict[str, Any]` как аргументов сервисов

**Детали:**

- Новые DTO (`FoalParentRefDto`, `FoalParentsDto`, `HorseFoalOutDto`) размещены в `core/schemas/horses.py` — корректно по архитектуре.
- SQL-запрос за производителями жеребят расположен в `repositories/horse_repository.py` — корректно.
- Дополнительный запрос выполняется только при непустом `all_foal_ids` (guard `if all_foal_ids:`) — нет лишних запросов при отсутствии жеребят.
- `HorseFoalOutDto` наследует `HorseOutDto` и добавляет `parents: FoalParentsDto` — нет рекурсии, нет ссылок на `HorsePedigree`.
- Построение `HorseFoalOutDto` через `**all_dtos[f].model_dump()` корректно: данные берутся из уже загруженных DTO, дополнительного запроса нет.
- Fallback-ветка `elif built is not None` обновлена аналогично основной — оба пути кодпути охвачены.

---

## Чеклист: Access Policy

- [x] GET-эндпоинты `/api/horses` и `/api/horses/{slug}` остаются Public Read
- [x] POST/PATCH/DELETE не затронуты
- [x] Миграций не создано
- [x] Anonymous GET с `pedigree=1` возвращает 200 без cookie (подтверждено SMOKE)

---

## Чеклист: Код-стиль

- [x] PEP 8 соблюдён — `make format` без изменений
- [x] Типизация полная: `FoalParentRefDto`, `FoalParentsDto`, `HorseFoalOutDto` — все поля аннотированы
- [x] `make lint` (mypy + flake8 + ruff) — чисто
- [x] Конвенции именования: `FoalParentRefDto`, `FoalParentsDto`, `HorseFoalOutDto` — соответствуют шаблону `<Entity><Suffix>Dto`
- [x] Вспомогательная функция `make_foal_parent_ref` объявлена как локальная (не глобальный синглтон)

---

## Чеклист: Тесты

- [x] `make format` — без изменений
- [x] `make test` — 671 passed, 5 skipped, 0 failed
- [x] `make lint` — чисто, без ошибок
- [x] `FakeHorseRepository` обновлён: foals теперь `list[HorseFoalOutDto]` с `parents=FoalParentsDto()`
- [x] Тест `test_horse_kind_to_breed_pedigree_nested_dtos_do_not_expose_kind` обновлён корректно
- [x] Добавлена проверка `assert "parents" in dumped["pedigree"]["foals"][0]`
- [x] SMOKE-тесты запущены и прошли успешно

---

## Результаты команд

### make format

```
cd services/backend && uv run isort src && uv run black src && uv run isort tests && uv run black tests
All done! ✨ 🍰 ✨
139 files left unchanged.
All done! ✨ 🍰 ✨
25 files left unchanged.
```

Статус: **чисто, без изменений**

### make test

```
============================= test session starts ==============================
platform linux -- Python 3.13.5, pytest-8.4.2, pluggy-1.6.0
...
======================== 671 passed, 5 skipped in 2.05s ========================
```

Статус: **671 passed, 5 skipped, 0 failed**

### make lint

```
cd services/backend && uv run mypy src && uv run flake8 && uv run ruff check --fix src
Success: no issues found in 139 source files
All checks passed!
```

Статус: **чисто**

---

## SMOKE-тесты

Авторизация: login=`admin`, cookie jar `/tmp/eqsitecms-smoke-cookies.txt`. Статус логина: **200 OK**.

| # | Endpoint | Method | access class | Режим | HTTP | Time | Результат |
|---|---|---|---|---|---|---|---|
| SM-01 | `GET /api/horses?pedigree=1&limit=50` | GET | public | anonymous | 200 | 160 ms | parents заполнены у 30 жеребят |
| SM-02 | `GET /api/horses?pedigree=1&limit=1` | GET | public | anonymous | 200 | 108 ms | Публичный доступ без cookie |
| SM-03 | `GET /api/horses/qg-dam-qg-recheck-20260516221641?pedigree=1` | GET | public | anonymous | 200 | 120 ms | foals[0].parents.sire и dam заполнены |
| SM-04 | `GET /api/horses/qg-dam-qg-recheck-20260516221641?pedigree=1` | GET | public | anonymous | 200 | 117 ms | Публичный доступ без cookie |
| SM-05 | `GET /api/horses/qg-current-qg-recheck-20260516221641?pedigree=1` | GET | public | anonymous | 200 | 141 ms | foals[0].parents.dam=null (known parent absent) |
| SM-06 | `GET /api/horses?pedigree=0&limit=5` | GET | public | anonymous | 200 | 117 ms | pedigree=None (нет поля при pedigree=0) |
| SM-07 | `GET /api/horses?pedigree=1&limit=100` | GET | public | anonymous | 200 | 221 ms | 30 жеребят — у всех есть поле `parents` |
| SM-08 | `GET /api/horses/grakir?pedigree=1` | GET | public | anonymous | 200 | — | Полная структура с реальными данными |

**Итог SMOKE: 8/8 тестов прошли**

---

## Access verification results

### Anonymous / Public Read

- `GET /api/horses?pedigree=1` без cookie → **200** (SM-01, SM-02)
- `GET /api/horses/{slug}?pedigree=1` без cookie → **200** (SM-03, SM-04)
- Access policy не изменилась — GET остаётся Public Read

### Protected Write (не затронуты)

- POST/PATCH/DELETE-эндпоинты лошадей не изменялись в этом diff.
- Изменения касаются исключительно выходного DTO (добавление поля `parents` в `foals`).

### Исключения

Нет. Все изменения строго в рамках Public Read GET-эндпоинтов согласно плану.

---

## Примеры реального ответа API

### GET /api/horses/grakir?pedigree=1 — foal с обоими родителями

```json
{
  "id": "9e19a0dc-6689-4082-800c-acf978c584e5",
  "name": "Гракир",
  "slug": "grakir",
  "pedigree": {
    "sire": {
      "id": "9714192e-2bf9-4395-aa2b-ac9b8b257867",
      "name": "Векан"
    },
    "dam": null,
    "foals": [
      {
        "id": "1d07ab53-84c3-4c73-ac2d-d1ce3072b48a",
        "name": "Гразир",
        "parents": {
          "sire": {
            "id": "7c503590-6c92-42df-8ee6-c48985cd0fe6",
            "name": "Самон"
          },
          "dam": {
            "id": "9e19a0dc-6689-4082-800c-acf978c584e5",
            "name": "Гракир"
          }
        }
      }
    ]
  }
}
```

### GET /api/horses/qg-current-qg-recheck-20260516221641?pedigree=1 — foal с null dam

```json
{
  "id": "24a1531b-7791-4a5c-815b-a0fd96e661a0",
  "name": "QG Foal qg-recheck-20260516221641",
  "parents": {
    "sire": {
      "id": "f413dede-b695-497e-ad64-73a51c126713",
      "name": "QG Current qg-recheck-20260516221641"
    },
    "dam": null
  }
}
```

---

## Frontend test gate

`services/frontend` (CMS) не затронут данным diff. Изменений CMS UI нет.
`services/site-ad` — изменение только TypeScript-типов (`src/types/horse.ts`), runtime behavior не изменился.

Frontend Mandatory Testing Gate: **не применим** (behavior diff отсутствует).

---

## AsyncAPI / Messaging

NATS-контракт не затронут. `make asyncapi-validate` не запускался — diff не включает `asyncapi.yaml` или `app/infrastructure/messaging/`.

---

## Безопасность

- [x] Нет хардкода секретов
- [x] SQL-запрос параметризован (`.in_(all_foal_ids)`, `== equestrian_id`) — SQL-инъекции исключены
- [x] Аутентификация на защищённых эндпоинтах не изменялась

---

Готово к merge.
