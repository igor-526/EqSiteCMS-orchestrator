# Quality Gate: remove-backend-skill-test

**Профиль:** QG-LITE · **Unit:** QG-1 · **Вердикт:** APPROVED  
**Дата:** 2026-11-11

## Основание и scope

Точечное удаление теста явно одобрено пользователем в задании Router; OpenSpec, tasks и test matrix неприменимы. Проверен только `services/backend/tests/unit/maintain/test_provision_seo_smoke_user.py`. Полный suite сервиса намеренно не запускался: назначена независимая scoped verification удаления одного теста, runtime-код не меняется.

## Фактический diff

Удалены только `test_both_skill_copies_use_local_ref_and_separate_cookie_jars` и неиспользуемый импорт `pathlib.Path`. Проверены unstaged/staged изменения: других изменённых файлов в backend нет. Сравнение AST с HEAD после исключения этих двух узлов подтверждает неизменность остального модуля.

Оставшиеся тесты не читают `.agents`/`.claude` или локальные credentials: данные синтетические, SQLite работает в памяти; файловый сценарий использует `tmp_path`; CLI-вызовы замоканы либо проверяют отказ до создания engine. PostgreSQL lock эмулируется явно; этот прогон не заявляется проверкой реального PostgreSQL. Удаляемый тест не является fixture и не задаёт состояние для других тестов.

## Lanes

| Lane | Результат |
|---|---|
| QG-BE | пройден — diff, герметичность затронутого модуля, 22 теста |
| QG-CONTRACTS | пройден — соответствует явному заданию; API/Makefile/messaging-контракты не менялись |
| QG-FORMAT | пройден — scoped Ruff check/format-check, flake8, diff-check |
| QG-SYNTH | пройден — APPROVED |
| QG-ENV | неприменимо — runtime и внешняя инфраструктура не требуются |
| QG-LIVE | неприменимо — API/runtime diff отсутствует |
| QG-FE-AUTO / QG-FE-MANUAL | неприменимо — frontend/UI diff отсутствует |

## Независимая verification

Команды выполнены из `services/backend`; `T=tests/unit/maintain/test_provision_seo_smoke_user.py`.

| Команда | Результат |
|---|---|
| `PYTHONPATH=src .venv/bin/python -m pytest $T --basetemp=/srv/eqSiteCMS/.qa/remove-backend-skill-test/QG-BE/pytest-temp` | 22 passed, 0.57 s |
| `.venv/bin/ruff check $T` | PASS |
| `.venv/bin/ruff format --check $T` | PASS, без изменений |
| `.venv/bin/flake8 $T` | PASS |
| `git diff --check HEAD -- $T` | PASS |
| Сравнение AST с HEAD за исключением согласованных удалений | PASS |

Evidence: `.qa/remove-backend-skill-test/QG-BE/`: `baseline.txt`, `diff.patch`, `ast-check.txt`, логи команд и `ledger.json`. Ledger фиксирует scenario IDs, единственного evidence owner QG-BE, revision, SHA-256 файла/config/lock/fixture, Python, команды, времена и результаты. Все пять исполняемых сценариев passed; повторов нет. Соседние lanes используют эти результаты без дублирующего запуска.

## Access verification results

Неприменимо: endpoints, access matrix и авторизация не изменяются; anonymous/authenticated API-проверки не запускались.

## Замечания и границы

Findings нет. Посторонние изменения корневого репозитория (`README.md`, `docs/operations/multiarch-delivery.md`, `docs/tasks/111_charts.md`, `openspec/changes/multiarch-service-charts/`) зафиксированы в baseline и исключены из review; не изменялись агентом. Удаление проверки содержимого двух skill-копий — требуемый результат, а не случайная потеря покрытия runtime.

## Файлы change

- `services/backend/tests/unit/maintain/test_provision_seo_smoke_user.py` — проверено, агентом QG не изменялся.
- `docs/reports/remove-backend-skill-test.md` — единственный отчёт QG.

Код не изменён; коммиты и push не выполнялись. Доработки не требуются.
