# Review: REFACTORING-PRICES

**Статус: APPROVED**
**Дата:** 2026-05-06
**Рекомендуемая ветка:** `feature/refactoring-testing-audit`

## Ссылки

- План: [`docs/plans/feature/refactoring/refactoring_prices.md`](../plans/feature/refactoring/refactoring_prices.md)
- Задача: не передана отдельным md-файлом

## Итог

Повторный Quality Gate после Backend rework подтверждает, что price-scope blocker из предыдущего review устранен. `_ensure_unique_slug()` валидирует входной/generated slug и при конфликте строит suffix внутри `PRICE_SLUG_MAX_LENGTH = 63`; duplicate slug длиной 63 символа становится `<61 chars>-1` и не выходит за лимит колонки `prices.slug String(63)`.

Price-scope unit/type/style проверки и обязательный smoke pipeline пройдены. Repository-wide проверки остаются красными вне price scope; это зафиксировано ниже как pre-existing residual risk, не блокирующий повторный approve по задаче `_ensure_unique_slug()`.

## Измененные price-scope файлы

| Файл | Проверенный контекст |
| --- | --- |
| `services/backend/src/api/prices.py` | Router остается тонким: endpoints вызывают `PriceService` / `PriceGroupService`, без repository injection и URL-building. |
| `services/backend/src/core/services/prices.py` | Rework `_ensure_unique_slug()`, service-level validation, relation validation, DTO enrichment. |
| `services/backend/src/core/schemas/prices.py` | `slug` добавлен в create/update DTO как структурное поле. |
| `services/backend/src/depends/services.py` | `PhotoUrlBuilderProtocol` прокинут в `PriceService` через DI. |
| `services/backend/src/core/protocols/media.py` | Protocol boundary для media URL builder. |
| `services/backend/src/utils/media.py` | Infrastructure adapter для URL/media helpers. |
| `services/backend/tests/unit/core/services/test_price_group_service.py` | Unit coverage для `PriceGroupService`. |
| `services/backend/tests/unit/core/services/test_price_service.py` | Boundary tests для duplicate explicit/generated 63-char slug и generated transliteration over-limit. |

## Findings

Блокирующих замечаний по price-scope diff не найдено.

Предыдущий blocker закрыт:

- `services/backend/src/core/services/prices.py` - `_ensure_unique_slug()` сначала валидирует slug по `PRICE_SLUG_MAX_LENGTH`, затем для каждого suffix вычисляет `max_base_length = PRICE_SLUG_MAX_LENGTH - len(suffix)` и формирует `current_slug = f"{base_slug[:max_base_length]}{suffix}"`.
- `services/backend/tests/unit/core/services/test_price_service.py` - добавлены boundary-сценарии для `_ensure_unique_slug()`, `create()` и `update()` с duplicate explicit/generated slug длиной 63.
- Реальный smoke также подтвердил endpoint-сценарий: первый explicit 63-char slug создан длиной 63, duplicate получил ожидаемый `<61 chars>-1` длиной 63.

## Unit / Type / Style проверки

| Команда | Результат | Примечание |
| --- | --- | --- |
| `PYTHONPATH=src uv run pytest -q tests/unit/core/services/test_price_service.py` | passed | `30 passed`, 7 warnings |
| `PYTHONPATH=src uv run pytest -q tests/unit/core/services/test_price_group_service.py tests/unit/core/services/test_price_service.py` | passed | `45 passed`, 7 warnings |
| `uv run mypy src/core/services/prices.py` | passed | `Success: no issues found in 1 source file` |
| `uv run isort --check-only src/core/services/prices.py src/api/prices.py src/core/schemas/prices.py src/depends/services.py tests/unit/core/services/test_price_service.py tests/unit/core/services/test_price_group_service.py && uv run black --check ...` | passed | 6 checked price-scope files left unchanged |
| `git diff --check -- <price-scope files>` | passed | whitespace errors not found |

## Repository-wide residual risk

| Команда | Результат | Примечание |
| --- | --- | --- |
| `PYTHONPATH=src uv run pytest -q tests/unit` | failed outside price scope | `341 passed, 5 skipped, 11 failed`; failures only in `tests/unit/core/services/test_horse_service.py`, where test helper constructs `UserOutDto` without required `id` and `created_at`. |
| `uv run isort --check-only src tests` | failed outside price scope | import sorting failure in `tests/unit/core/services/test_horse_service.py`. |
| `uv run black --check src tests` | failed outside price scope | 7 non-price files would be reformatted, including `src/core/schemas/photos.py` and several non-price service tests. |
| `uv run mypy src` | failed outside price scope | 7 errors in `src/core/services/site_settings.py`. |

## SMOKE-тесты

Перед smoke повторно прочитан `.claude/skills/api-smoke-test/SKILL.md` и credentials. В плане `docs/plans/feature/refactoring/refactoring_prices.md` нет секции `SMOKE`/таблицы сценариев, поэтому выполнен минимальный smoke по измененным price endpoints на `http://localhost:8001` с cookie-авторизацией superuser и очисткой созданных записей.

| # | Endpoint | Method | HTTP | Time | Результат |
| --- | --- | --- | --- | --- | --- |
| AUTH | `/api/auth/login` | POST | 200 | 32 ms | passed, cookie login |
| SM-01 | `/api/prices/groups?limit=1` | GET | 200 | 25 ms | passed |
| SM-02 | `/api/prices/groups` | POST | 200 | 26 ms | passed, temporary group created |
| SM-03 | `/api/prices/groups/{id}` | GET | 200 | 21 ms | passed |
| SM-04 | `/api/prices` | POST | 200 | 27 ms | passed, temporary price with group relation created |
| SM-05 | `/api/prices?groups=<group_name>&limit=5` | GET | 200 | 23 ms | passed, `total=1`, `len(items)=1` |
| SM-06 | `/api/prices/{slug}?page_data=true` | GET | 200 | 26 ms | passed, groups/page_data/price_tables present |
| SM-07 | `/api/prices/{slug}` | PATCH | 200 | 53 ms | passed, description updated |
| SM-08 | `/api/prices/{slug}/photos` | POST | 400 | 22 ms | passed, empty update returns business error |
| SM-09 | `/api/prices` | POST | 200 | 28 ms | passed, explicit 63-char slug created with length 63 |
| SM-10 | `/api/prices` | POST | 200 | 26 ms | passed, duplicate 63-char slug returned `<61 chars>-1` with length 63 |
| SM-11 | `/api/prices/{duplicate-boundary-slug}` | DELETE | 204 | 26 ms | passed |
| SM-12 | `/api/prices/{boundary-slug}` | DELETE | 204 | 27 ms | passed |
| SM-13 | `/api/prices/{slug}` | DELETE | 204 | 26 ms | passed |
| SM-14 | `/api/prices/groups/{id}` | DELETE | 204 | 27 ms | passed |

Итог SMOKE: 14/14 endpoint tests passed, auth passed.

## Архитектурная оценка

- `api/prices.py` не содержит бизнес-валидацию, SQL, repository wiring или settings URL logic.
- `PriceService` зависит от protocol boundaries: repository protocols и `PhotoUrlBuilderProtocol`.
- Expected business errors в price service выбрасываются через `ClientError`.
- Relation existence validation выполняется до persistence/relation write side effects.
- SQL остается в repository layer.
- Новых AsyncAPI/NATS контрактов diff не затрагивает; `make asyncapi-validate` не запускался.

## Checklist

- [x] Повторно прочитан `agents/quality_gate.md`.
- [x] Повторно прочитан `agents/backend.md`.
- [x] Проверен текущий price-scope diff.
- [x] Проверен предыдущий отчет `docs/reports/REFACTORING-PRICES-review.md`.
- [x] Подтверждено исправление `_ensure_unique_slug()` post-suffix length validation.
- [x] Запущены price-scope unit tests.
- [x] Запущен `uv run mypy src/core/services/prices.py`.
- [x] Повторно прочитан `.claude/skills/api-smoke-test/SKILL.md`.
- [x] Запущен smoke pipeline с endpoint timings.
- [x] Report обновлен в `docs/reports/`.

Готово к merge в рамках price-scope rework. Repository-wide pre-existing failures вне price scope нужно закрыть отдельной задачей перед полным зеленым merge gate.
