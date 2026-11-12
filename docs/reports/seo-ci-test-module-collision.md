# Quality Gate: seo-ci-test-module-collision

**Профиль:** QG-LITE · **Вердикт:** APPROVED · **Дата:** 2026-11-11

## Ссылки и контекст

- Пользователь подтвердил точечный CI bugfix; активных OpenSpec change/tasks нет, новые specs не создавались. OpenSpec validation неприменима.
- Исходный CI: https://github.com/igor-526/EqSiteCMS-seo-service/actions/runs/43050031013
- Проверена revision SEO `4a41d995d2e9690a6041ce53daec0a990d582716` с незакоммиченным rename; текущая ветка `main`, рекомендуемая ветка не задана.
- Причина сбоя: pytest в режиме prepend импортировал integration и unit под одинаковым именем `test_maintenance_topology`. Переименование только integration-модуля устраняет коллизию, не меняя pytest config, assertions или markers.

## Точные пути для финализации

| Путь от корня | Изменение |
|---|---|
| `services/seo-service/tests/integration/test_maintenance_topology.py` | Старый путь удалён при переименовании |
| `services/seo-service/tests/integration/test_maintenance_topology_infrastructure.py` | Новый путь, содержимое идентично старому побайтно |
| `docs/reports/seo-ci-test-module-collision.md` | Единственный собственный diff QG — этот отчёт |

Связанный `services/seo-service/tests/unit/test_maintenance_topology.py` не изменён относительно HEAD. SHA256 integration до/после: `21a9acece707a19fad4c6c9bd0128609342177fab86217cb17d3be997618d330`.
Продуктовый код, зависимости, Makefile и runtime/API/UI не изменены. Чужие dirty-файлы исключены из scope и сохранены.

## Lanes

| Lane | Результат |
|---|---|
| QG-ENV | Неприменимо — runtime/обязательная test infrastructure не затронуты; использовано существующее окружение |
| QG-BE | Пройден — rename-only, тесты и scoped проверки зелёные |
| QG-CONTRACTS | Пройден — минимальность и ссылки проверены; API/NATS/Makefile-контракты не изменены |
| QG-FORMAT | Пройден — Ruff canonical format-check и lint, flake8, mypy, scoped diff check |
| QG-FE-AUTO / QG-FE-MANUAL | Неприменимо — нет frontend/UI diff |
| QG-LIVE | Неприменимо — нет runtime API diff |
| QG-SYNTH | APPROVED — блокирующих findings нет |

Инфраструктура не поднималась, setup/teardown PG/NATS не выполнялись; infrastructure repair attempts: 0.

## Независимая verification и покрытие рисков

Все команды ниже выполнены QG в текущем дереве SEO; suite запущен один раз.

| Scenario ID | Команда / проверка | Результат |
|---|---|---|
| RENAME-01 | Побайтное сравнение нового integration с `git show HEAD:<старый путь>`; unit diff | PASS, идентичны; unit не изменён |
| REFERENCES-01 | `git grep` по SEO и старому пути в корневом репозитории | PASS, зависимых ссылок SEO нет |
| CI-COLLECTION-01 | `make test` → `uv run pytest -m "not infrastructure"` | PASS: 1440 passed, 1 skipped, 137 deselected, 23.14s; import mismatch отсутствует |
| STATIC-RUFF-01 | `uv run ruff check <integration-new> <unit>` | PASS |
| STATIC-FORMAT-01 | `uv run ruff format --check <integration-new> <unit>` | PASS, 2 файла |
| STATIC-FLAKE8-01 | `uv run flake8 <integration-new> <unit>` | PASS |
| STATIC-MYPY-01 | `MYPYPATH=src uv run mypy <integration-new> <unit>` | PASS, 2 файла |
| STATIC-DIFF-01 | `git diff --check -- <integration-old> <integration-new> <unit>` | PASS |

`<integration-new>` и `<unit>` означают соответствующие пути относительно SEO из таблицы выше. Scoped проверки выбраны вместо полного `make lint` по границам bugfix; canonical formatter — Ruff, mutating format не запускался. Basedpyright по конфигурации проверяет только неизменённый `src`, поэтому неприменим к rename теста.

Первый scoped mypy без `src` в import roots выдал четыре `import-not-found`; это ошибка вызова, а не кода. Единственный targeted recheck с `MYPYPATH=src` успешен. Оба запуска и причина повтора сохранены в ledger. Недоступный `rg` заменён штатным `git grep`, без изменения инструментов.

Единственное совпадение старого относительного пути в корневом репозитории находится в `scripts/tests/test_metrica_collection.py`: его `SERVICE` явно указывает на `services/ya-metrica-service`, поэтому ссылка корректна и к SEO не относится.

Исходный FAIL подтверждён просмотром evidence BE-FIX-1: `reproducer-before.json` и `.log` фиксируют именно `make test`, exit 2 и import file mismatch двух исходных модулей. Независимый QG повторил исходную команду после rename, не откатывая рабочее дерево. Full suite одновременно закрывает impacted unit regression; повторный targeted suite не запускался. Infrastructure tests не исполнялись намеренно: их содержимое и marker сохранены, runtime topology не менялась. Пропуск одного теста вне изменённых модулей не скрывает критическую проверку collection. Непокрытых применимых сценариев нет.

## Access verification results

Anonymous/public и authenticated/protected проверки неприменимы: endpoints, права, auth и access exceptions не изменены. Новая access matrix не требуется.

## Evidence и registry

Все собственные артефакты: `.qa/seo-ci-test-module-collision/QG-LITE/`.

- `registry.json`: конечные scenario/risk IDs, единственный evidence owner `QG-LITE`, prerequisites/isolation/permission/budget/stop condition и результаты.
- `ledger.json`: команды, aliases, revision, code/environment fingerprints, options, timestamps, статусы и `previousRunId` для единственного mypy recheck.
- `rename-proof.json`, `references.json`: минимальность и проверка ссылок.
- `ci-collection-01.log`, `static-*.log`: фактические результаты.
- `root-status-before.txt`, `service-status-before.txt`, `scoped-before.diff`, соответствующие `*-after` snapshots: сохранность чужого diff.
- Исходный FAIL владельца: `.qa/seo-ci-test-module-collision/BE-FIX-1/reproducer-before.json` и `reproducer-before.log`.

## Замечания и остаток

Blocking/minor findings и waivers отсутствуют. Чужой dirty diff не является finding и в финализацию bugfix не включается. Новые задачи не создавались. Push/merge и продуктовые правки QG не выполнял.
