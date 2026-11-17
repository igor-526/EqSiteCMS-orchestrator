# Приёмка: fix-price-optional-description

**Профиль:** QG-LITE · **Вердикт: APPROVED** · **Дата:** 2026-11-17

## Ссылки и контекст
- [Задача 116](../tasks/116_price_optional_description.md), [proposal](../../openspec/changes/fix-price-optional-description/proposal.md), [design](../../openspec/changes/fix-price-optional-description/design.md), [spec](../../openspec/changes/fix-price-optional-description/specs/backend-domain-capabilities/spec.md), [tasks](../../openspec/changes/fix-price-optional-description/tasks.md).
- Approval/permit: переданы Router; пользователь: «Эта машина - тестовое окружение. Можно делать что угодно прямо тут». Разрешён локальный target без `_test`; использованы только собственные временные tenants/users/prices, удалены после проверки.
- Пустота разрешена opt-in только для Price.description. Сохранены trim/511, exclude_none, остальные поля, PriceGroup, auth/tenant wiring. DTO, миграций, NATS и UI изменений нет.
- Работа выполнена в текущем дереве backend; HEAD `8eeb4526d43b6b8b9bd69295b03ab278f61b32b3` + scoped diff. Рекомендуемая ветка design не задана.

## Изменённые файлы change (для shipctl plan)
- `services/backend/src/core/services/prices.py`
- `services/backend/tests/unit/core/services/test_price_service.py`
- `services/backend/tests/unit/api/test_prices_description_contract.py`
- `openspec/changes/fix-price-optional-description/{proposal.md,design.md,tasks.md,specs/backend-domain-capabilities/spec.md}`
- `docs/tasks/116_price_optional_description.md`
- `docs/reports/fix-price-optional-description.md`

## Lanes
| Lane | Статус |
|---|---|
| ENV | пройден: `scripts/stackctl ready app --no-migrate`, running/healthy, SHA256 runtime = checkout; 0 repair attempts; миграции не нужны |
| BE | пройден: минимальный diff, Protocol/DI границы сохранены, полный unit suite |
| CONTRACTS | пройден: spec/access matrix, shape ответа и tenant isolation; Makefile/NATS изменения неприменимы |
| LIVE | пройден: SM-PD-01..04, 36 HTTP проверок, отдельное чтение PostgreSQL, cleanup PASS |
| FORMAT | пройден: canonical non-mutating lint |
| FE-AUTO / FE-MANUAL | неприменимо: нет UI/frontend diff |
| SYNTH | пройден: все критичные оси закрыты |

## Независимые проверки
| Команда | Результат |
|---|---|
| `make -C services/backend test` | 2812 passed, 5 unrelated skipped, 13.58s |
| `make -C services/backend lint` | PASS: mypy 336 files; Ruff check/format-check 336 files; flake8 |
| `git -C services/backend diff --check -- src/core/services/prices.py tests/unit/core/services/test_price_service.py` | PASS; новый HTTP test также проверен canonical lint |
| `openspec validate fix-price-optional-description --type change --strict` | CLI отсутствует в PATH; штатный cached CLI через `node /home/igor/.npm/_npx/8dd48c53c203f559/node_modules/@fission-ai/openspec/bin/openspec.js validate fix-price-optional-description --type change --strict` → valid |

5 skip находятся в неизменённом horse-owner suite, не в price/access сценариях. Предупреждение чужого VIRTUAL_ENV безопасно игнорируется uv, использовано backend `.venv`. Установок зависимостей и mutating formatter не было.

## Покрытие по test matrix
| ID | Реальная проверка |
|---|---|
| UT-PD-01 | `test_price_service.py`: create/update normalizes; UUID/slug, blank/whitespace |
| UT-PD-02 | тот же файл: create omitted/null; update omitted/null preserves; empty/null-only no write |
| UT-PD-03 | тот же файл: trim/511; 512 rejection до mutation/write |
| UT-PD-04 | тот же файл: name/slug/page_data/JS rejection; существующий group suite + независимый blank group probe |
| UT-PD-05 | `test_prices_description_contract.py`: anonymous_write_denied; authenticated_write_uses_real_service, scopes=[] |
| UT-PD-06 | тот же файл: foreign_price_is_not_mutated, UUID/slug |
| UT-PD-07 | тот же файл: public_and_authenticated_read, missing_invalid_selector, list/detail/404 |
| SM-PD-01 | собственная fixture: текст → PATCH пустой UUID/slug → 200, GET пустой; owner before/after 400→200 сопоставлены |
| SM-PD-02 | create empty/whitespace → 200, новые anonymous/authenticated GET → пустая строка |
| SM-PD-03 | absent/null + другое поле сохраняют текст; empty/null-only 400; независимые GET и PostgreSQL |
| SM-PD-04 | anonymous POST/PATCH 401 с selector/без; foreign UUID/slug 400; selector missing/invalid 401; list/detail/404 |

Непокрытых ID нет. Concurrency/retry/NATS/UI неприменимы: новой логики этих классов нет. Unit HTTP использует реальный router/service и auth/tenant dependencies с локальными fakes и восстановлением overrides; PostgreSQL не подменялся unit fake в smoke.

## Access verification results
- Protected Write: anonymous POST/PATCH → 401, tenant selector не даёт права записи; authenticated user без специальных scopes → 200.
- Tenant isolation: foreign PATCH по UUID и slug → 400; контрольный GET/PG сохраняет исходное описание.
- Public Read: anonymous с valid selector → 200 (list/detail); missing/invalid → 401; missing detail → 404. Authenticated читает свой tenant, чужой selector игнорируется.
- Исключений из Public Read / Protected Write не добавлено.

## SMOKE: HTTP и timings
Порт API 8001, PostgreSQL 16 / local 5433 / eqsitecms. До записи подтверждены target/permit и running/healthy. Две новые isolated tenant fixtures, реальные cookie-login, scopes=[]; секреты только в памяти. Ни чужие fixture UUID, ни пользовательские записи не изменялись.

| Сценарий | Метод / путь | Режим | HTTP | мс |
|---|---|---|---|---|
| SM-PD-01 | POST /api/prices | authenticated-no-scopes | 200 | 37.42 |
| SM-PD-01 | PATCH /api/prices/{owned-or-missing-uuid} | authenticated-no-scopes | 200 | 70.51 |
| SM-PD-01 | GET /api/prices/{owned-or-missing-uuid} | authenticated-no-scopes | 200 | 67.94 |
| SM-PD-01 | GET /api/prices/{owned-or-missing-uuid} | anonymous | 200 | 24.73 |
| SM-PD-02 | POST /api/prices | authenticated-no-scopes | 200 | 73.75 |
| SM-PD-02 | GET /api/prices/{owned-or-missing-uuid} | authenticated-no-scopes | 200 | 75.75 |
| SM-PD-02 | GET /api/prices/{owned-or-missing-uuid} | anonymous | 200 | 24.21 |
| SM-PD-02 | POST /api/prices | authenticated-no-scopes | 200 | 71.66 |
| SM-PD-02 | GET /api/prices/{owned-or-missing-uuid} | authenticated-no-scopes | 200 | 71.94 |
| SM-PD-02 | GET /api/prices/{owned-or-missing-uuid} | anonymous | 200 | 22.41 |
| SM-PD-01 | PATCH /api/prices/qg-pd-original | authenticated-no-scopes | 200 | 69.47 |
| SM-PD-01 | PATCH /api/prices/qg-pd-original | authenticated-no-scopes | 200 | 67.97 |
| SM-PD-03 | PATCH /api/prices/{owned-or-missing-uuid} | authenticated-no-scopes | 200 | 72.13 |
| SM-PD-03 | PATCH /api/prices/{owned-or-missing-uuid} | authenticated-no-scopes | 200 | 71.84 |
| SM-PD-03 | GET /api/prices/{owned-or-missing-uuid} | authenticated-no-scopes | 200 | 64.16 |
| SM-PD-03 | PATCH /api/prices/{owned-or-missing-uuid} | authenticated-no-scopes | 200 | 67.75 |
| SM-PD-03 | GET /api/prices/{owned-or-missing-uuid} | authenticated-no-scopes | 200 | 79.94 |
| SM-PD-03 | PATCH /api/prices/{owned-or-missing-uuid} | authenticated-no-scopes | 400 | 87.83 |
| SM-PD-03 | GET /api/prices/{owned-or-missing-uuid} | authenticated-no-scopes | 200 | 68.13 |
| SM-PD-03 | PATCH /api/prices/{owned-or-missing-uuid} | authenticated-no-scopes | 400 | 63.97 |
| SM-PD-03 | GET /api/prices/{owned-or-missing-uuid} | authenticated-no-scopes | 200 | 67.96 |
| SM-PD-04 | POST /api/prices | anonymous | 401 | 3.15 |
| SM-PD-04 | PATCH /api/prices/{owned-or-missing-uuid} | anonymous | 401 | 44.61 |
| SM-PD-04 | POST /api/prices | anonymous | 401 | 44.11 |
| SM-PD-04 | PATCH /api/prices/{owned-or-missing-uuid} | anonymous | 401 | 44.11 |
| SM-PD-04 | PATCH /api/prices/{owned-or-missing-uuid} | foreign | 400 | 23.41 |
| SM-PD-04 | PATCH /api/prices/qg-pd-original | foreign | 400 | 68.56 |
| SM-PD-04 | GET /api/prices/{owned-or-missing-uuid} | anonymous | 401 | 3.06 |
| SM-PD-04 | GET /api/prices | anonymous | 401 | 44.87 |
| SM-PD-04 | GET /api/prices/{owned-or-missing-uuid} | anonymous | 401 | 67.92 |
| SM-PD-04 | GET /api/prices | anonymous | 401 | 63.92 |
| SM-PD-04 | GET /api/prices | anonymous | 200 | 76.36 |
| SM-PD-04 | GET /api/prices/{owned-or-missing-uuid} | anonymous | 404 | 68.37 |
| SM-PD-04 | GET /api/prices | authenticated-no-scopes | 200 | 27.81 |
| SM-PD-04 | GET /api/prices/{owned-or-missing-uuid} | authenticated-no-scopes | 404 | 67.28 |
| SM-PD-04 | GET /api/prices/{owned-or-missing-uuid} | authenticated-no-scopes | 200 | 72.07 |

Итог: **36/36 HTTP PASS**, 3 committed строки проверены новой PostgreSQL connection; собственные fixtures удалены, отсутствие tenants подтверждено повторным SELECT.

## Evidence registry и воспроизводимость
Единственный независимый evidenceOwner — QG. [Registry](../../.qa/fix-price-optional-description/QG/registry.json), [ledger](../../.qa/fix-price-optional-description/QG/ledger.jsonl): revision/code/environment fingerprints, options, timestamps, status, evidencePath, reason/previousRunId. Первые прогоны, повторов gate нет.
- [Unit log](../../.qa/fix-price-optional-description/QG/test.log), [lint](../../.qa/fix-price-optional-description/QG/lint.log), [OpenSpec](../../.qa/fix-price-optional-description/QG/openspec-cached.log).
- [ENV ready](../../.qa/fix-price-optional-description/QG/ready.json), [status](../../.qa/fix-price-optional-description/QG/status-after.json), [runtime hash / group probe](../../.qa/fix-price-optional-description/QG/group-and-runtime.json).
- [Live checks / timings](../../.qa/fix-price-optional-description/QG/live.json), [сценарий](../../.qa/fix-price-optional-description/QG/live.py), [cleanup](../../.qa/fix-price-optional-description/QG/cleanup.json).
- Owner [before](../../.qa/fix-price-optional-description/BE-PD-1/reproducer-before.json) / [after](../../.qa/fix-price-optional-description/BE-PD-1/reproducer-after.json): одинаковые input/route/fixture/environment, 400 «Описание цены не может быть пустым» → 200; ожидаемая смена code fingerprint подтверждена scoped diff.
- [Независимый after](../../.qa/fix-price-optional-description/QG/reproducer-after.json): тот же минимальный PATCH и непустой исходный state на новой собственной fixture; runtime SHA256 совпадает с owner after.

## Findings / остаток
Blocking/minor findings, waivers и незакрытые acceptance gaps отсутствуют. CLI PATH limitation обойдён установленным cached OpenSpec без установки/починки tooling. Чужой change не включён в review. Финализация, sync/archive/shipping остаются Router после пользовательского approval.
