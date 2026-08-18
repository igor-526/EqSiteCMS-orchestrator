## 1. Сервисные Makefile

### Backend

- [x] 1.1 Создать `services/backend/Makefile` с `.PHONY` целями `test`, `lint`, `format`: автономный `tests/unit`, полный non-mutating mypy/Ruff format-check/flake8 lint scope `src tests` и Ruff mutating format scope `src tests`.
- [x] 1.2 Нормализовать `services/notification-service/Makefile`: сохранить автономный `test -m "not infrastructure"`, включить mypy/basedpyright/Ruff lint+format-check/flake8 в `lint` и полный Ruff fix+format в `format`.
- [x] 1.3 Нормализовать `services/email-service/Makefile`: сохранить автономный `test -m "not infrastructure"`, включить mypy/basedpyright/Ruff lint+format-check/flake8 в `lint` и полный Ruff fix+format в `format`.
- [x] 1.4 Выполнить `make -n test`, `make -n lint`, `make -n format` в каждом из трёх Python-сервисов и подтвердить отсутствие команд запуска/установки PostgreSQL, NATS, Redis, Docker и внешних API в `test`.
- [x] 1.5 Запустить `make test` и `make lint` в каждом из трёх Python-сервисов без поднятой инфраструктуры; устранить только относящиеся к change дефекты и сохранить результаты для Quality Gate.

### Frontend

- [x] 1.6 Создать `services/frontend/Makefile` с `.PHONY` целями `test`, `lint`, `format`, делегирующими существующим Vitest, ESLint/typecheck и ESLint `--fix` командам без live backend.
- [x] 1.7 Выполнить `make -n test`, `make -n lint`, `make -n format` в `services/frontend` и подтвердить отсутствие live backend, Docker и установки зависимостей в рецептах.
- [x] 1.8 Запустить `make test` и `make lint` в `services/frontend` без поднятой инфраструктуры; устранить только относящиеся к change дефекты и сохранить результаты для Quality Gate.

## 2. Корневая агрегация и agent governance

### Backend

- [x] 2.1 Обновить корневой `Makefile`: добавить все новые цели в `.PHONY` и сделать `test` четырьмя явными вызовами `$(MAKE) -C` для backend, notification-service, email-service и frontend.
- [x] 2.2 Обновить корневой `Makefile`: сделать `lint` четырьмя явными вызовами одноимённых сервисных целей без расширенных compose/release проверок.
- [x] 2.3 Обновить корневой `Makefile`: сделать `format` четырьмя явными вызовами одноимённых сервисных целей вместо форматирования только backend.
- [x] 2.4 Статически проверить корневые рецепты `test`, `lint`, `format`: каждый core-сервис указан ровно один раз, shell-циклов нет, `services/site-ad` и другие `site-*` отсутствуют.
- [x] 2.5 Обновить `agents/backend.md`: закрепить обязательное наличие и выполнение `make test`, `make lint`, `make format` в назначенном Python core-сервисе и автономность CI `test`.
- [x] 2.6 Обновить `agents/frontend.md`: закрепить обязательное наличие и выполнение `make test`, `make lint`, `make format` в `services/frontend` и запрет live backend для CI `test`.
- [x] 2.7 Обновить `agents/quality_gate.md`: проверять сервисные Makefile-контракты, явную корневую агрегацию четырёх core-сервисов, исключение `site-*`, автономность `test` и clean diff после `format`.

### Frontend

- [x] 2.8 Проверить, что документационный deliverable 2.5–2.7 не меняет CMS runtime/FSD/access требования и не добавляет consumer-site scope.

## 3. Единый Quality Gate и завершение lifecycle

### Quality Gate

- [x] 3.1 Проверить совокупный path-scoped diff против proposal/design/spec и подтвердить ownership: сервисные Makefile, корневой Makefile и три agent policy файла; runtime/API/БД/NATS и `site-*` не затронуты.
- [x] 3.2 Выполнить `make -n test`, `make -n lint`, `make -n format` из корня и подтвердить четыре явных последовательных сервисных вызова для каждой цели без shell-цикла.
- [x] 3.3 На clean/path-accounted worktree выполнить корневой `make format` и подтвердить отсутствие незапланированного diff после форматирования.
- [x] 3.4 Выполнить корневой `make test` без поднятой инфраструктуры и зафиксировать результаты всех четырёх core-сервисов.
- [x] 3.5 Выполнить корневой `make lint` и зафиксировать результаты всех четырёх core-сервисов; команда не должна менять tracked files.
- [x] 3.6 Выполнить применимый существующий `make check` либо отдельно обосновать непроходимые environment-only стадии, не подменяя обязательные результаты `test`/`lint`.
- [x] 3.7 Зафиксировать Access matrix, anonymous/authenticated API checks и live API smoke как `N/A`: endpoint/runtime API diff отсутствует.
- [x] 3.8 Сохранить единый отчёт `docs/reports/049-makefiles-review.md` с командами, exit codes, результатами по сервисам, clean-diff evidence и итогом APPROVED/REWORK.
- [x] 3.9 При findings вернуть их профильным владельцам, дождаться исправлений и полностью повторить пункты 3.1–3.8 до APPROVED.
- [x] 3.10 После APPROVED синхронизировать delta spec `repository-process-tooling` в main specs, выполнить strict validation и архивировать change по Router/OpenSpec lifecycle.
