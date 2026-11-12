# Review: fix-email-uv-cache

**Профиль:** QG-LITE · **Вердикт: APPROVED**
**Дата:** 2026-11-11 · **Unit:** QG-1

## Контекст и границы

Прямой небольшой bugfix, scope подтверждён пользователем в задании; OpenSpec, specs, tasks и проектная test matrix неприменимы. Из `services/email-service/pyproject.toml` удалена только секция `[tool.uv]` с абсолютным `cache-dir = "/srv/eqSiteCMS/.cache/uv"`. Выбор кэша возвращён стандартному механизму uv, включая XDG и переменные окружения CI.

Исходная ошибка `uv sync --locked → /srv/eqSiteCMS/.cache/uv Permission denied` подтверждена переданным handoff BE-1 и ссылкой на [CI run](https://github.com/igor-526/EqSiteCMS-email-service/actions/runs/43033860333). QG самостоятельно проверил актуальное рабочее дерево, не опираясь на PASS исполнителя.

## Файлы

| Путь | Изменение |
|---|---|
| `services/email-service/pyproject.toml` | Продуктовый diff BE-1: удалены две строки настройки кэша |
| `docs/reports/fix-email-uv-cache.md` | Единственный отчёт, создан QG |

`services/email-service/uv.lock` и `.github/workflows/check_and_deploy.yml` побайтово совпадают с HEAD сервиса. QG продуктовые файлы не менял. Чужие root diff, changes и reports не проверялись.

## Lanes

| Lane | Статус |
|---|---|
| QG-ENV | неприменимо — runtime/инфраструктура не затронуты |
| QG-BE | неприменимо — Python-код, архитектура и runtime не изменены |
| QG-FE-AUTO / QG-FE-MANUAL | неприменимо — нет frontend/UI diff |
| QG-CONTRACTS | пройден — diff соответствует scope, зависимости и workflow неизменны |
| QG-LIVE | неприменимо — нет runtime API diff |
| QG-FORMAT | пройден — scoped TOML/static checks и независимый locked sync |
| QG-SYNTH | пройден — blocking/minor findings нет |

## Независимая verification и покрытие рисков

Запуск: `python3 .qa/fix-email-uv-cache/QG-LITE/verify.py` → **exit 0**.

| Сценарий | Результат |
|---|---|
| TOML и семантический diff | PASS: после удаления старой настройки структуры TOML полностью равны; lock TOML корректен |
| Неизменность зависимостей и CI-контракта | PASS: lock и workflow равны HEAD; CI по-прежнему вызывает `uv sync --locked` |
| `git diff --check HEAD -- pyproject.toml uv.lock .github/workflows/check_and_deploy.yml` в сервисе | PASS |
| `uv cache dir` без `UV_CACHE_DIR` | PASS: выбран `.qa/fix-email-uv-cache/QG-LITE/xdg-cache/uv`, не старый абсолютный путь |
| `uv sync --locked` | PASS, exit 0: чистые отдельные cache/virtualenv/HOME внутри evidence-каталога, текущий checkout |
| Неизменность проверенных файлов после sync | PASS: SHA-256 до/после совпадают |

Evidence owner: `QG-LITE`; конечный сценарий реестра: `UV-CACHE-PORTABILITY`, статус `passed`.
Revision сервиса: `833e5f050706863f94105bf6f5498c77480d556b` + scoped dirty diff.
Среда: uv `0.13.5`, системный Python `3.14.4`; скачивание Python запрещено, timeout sync 120 секунд. Наследуемые UV-настройки и секреты в subprocess не передавались. Сервисное окружение не изменялось; копии репозитория/worktree не создавались. Repair attempts: 0, повторов/aliases нет.

Evidence: `.qa/fix-email-uv-cache/QG-LITE/` — `verify.py`, `static.json`, `scoped.diff`, `sync.log`, `ledger.json` (fingerprints, options, timestamps и результат).

## Unit / Integration, SMOKE и access verification

Полные `make lint` / `make test` не запускались: изменён только путь кэша установщика, исполняемый код и зависимости неизменны, blast radius ограничен выбором кэша и locked sync. Использованы прямые scoped проверки конфигурации, без расширения до runtime suites. API/доступ anonymous/authenticated и SMOKE неприменимы — endpoints не затронуты.

## Ограничения

Remote CI, push и deploy не запускались по заданию. Точный исходный `Permission denied` локально не воспроизведён: независимый FAIL→PASS в GitHub runner не заявляется, исходный CI-инцидент остаётся локально `unreproduced`. Вердикт относится к проверенному scope переносимости конфигурации и успешной locked-установке, а не к подтверждению успешного remote pipeline. Искусственно ломать права ради получения FAIL не предпринималось.

Pre-existing findings и waivers отсутствуют. Tasks неприменимы.
