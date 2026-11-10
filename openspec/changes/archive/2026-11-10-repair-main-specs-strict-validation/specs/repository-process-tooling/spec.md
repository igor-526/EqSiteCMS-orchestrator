# Изменения репозиторных процессов и инструментов

## MODIFIED Requirements

### Requirement: Полный non-mutating core release gate
Root tooling SHALL разделять mutating format/fix и non-mutating test/lint/check, предоставлять полный автономный release gate для четырёх core-сервисов и не включать site-* в core aggregate commands; scope, .PHONY цели и гарантии неизменности SHALL соответствовать сценарному контракту.

#### Scenario: Сервисный CI-контракт доступен
- **WHEN** GitHub Actions worker с установленными lockfile dependencies выполняет `make test` или `make lint` в любом core-сервисе без PostgreSQL, NATS, Redis и внешних сервисов
- **THEN** соответствующие автономные tests или полный non-mutating lint gate завершаются с кодом 0 при корректном коде

#### Scenario: Форматирование сервиса требуется
- **WHEN** инженер выполняет `make format` в core-сервисе
- **THEN** доступный нативный formatter/autofix обрабатывает весь поддерживаемый исходный и тестовый scope этого сервиса

#### Scenario: Корневые CI-команды агрегируют core scope
- **WHEN** инженер выполняет корневой `make test`, `make lint` или `make format`
- **THEN** Make явно вызывает одноимённую цель backend, notification-service, email-service и frontend по отдельности и не вызывает consumer site

#### Scenario: Aggregate checks успешны
- **WHEN** Quality Gate запускает root check targets на clean worktrees
- **THEN** все включённые сервисы проверены, commands завершаются 0 и итоговый diff остаётся чистым

#### Scenario: Formatting drift обнаружен non-mutating gate
- **WHEN** format-check обнаруживает drift во время `lint` или `check`
- **THEN** gate возвращает finding владельцу и не запускает auto-fix

#### Scenario: Полный контракт: Полный non-mutating core release gate
- **WHEN** проверяется соблюдение требования «Полный non-mutating core release gate»
- **THEN** Root tooling SHALL предоставлять отдельные mutating `format`/`fix` и non-mutating `test`/`lint`/`check` commands. Core-сервисы `backend`, `frontend`, `notification-service`, `email-service` SHALL иметь `.PHONY` цели `test`, `lint`, `format`; `test` MUST работать без поднятой инфраструктуры, `lint` MUST проверять весь поддерживаемый исходный и тестовый код без его изменения, а `format` SHALL форматировать весь поддерживаемый код сервиса. Корневые `test`, `lint` и `format` MUST отдельными явными рецептами, без цикла, вызывать соответствующую цель каждого из четырёх core-сервисов и MUST NOT включать `site-*`. Aggregate `check` MUST без изменения tracked files запускать format-check, lint, typecheck и tests для этих четырёх сервисов; aggregate build MUST включать только эти четыре сервиса.

### Requirement: Кросс-репозиторные контрактные проверки не теряются вне монорепы
Кросс-репозиторные AsyncAPI-тесты SHALL работать в монорепе и standalone CI: отсутствие соседнего документа MUST давать явный skip с путём, но при EQCMS_MONOREPO=1 MUST приводить к падению. Root contracts-check SHALL запускать эти тесты со строгим guard и входить в aggregate check.

#### Scenario: CI сервисного репозитория без соседей
- **WHEN** `make test` выполняется в чекауте одного сервисного репозитория, где соседнего сервиса нет на диске
- **THEN** кросс-репозиторные контрактные тесты помечаются `skipped` с причиной, содержащей недостающий путь
- **AND** прогон завершается кодом 0, а деплой не блокируется

#### Scenario: Монорепа исполняет контрактные проверки
- **WHEN** из корня монорепы выполняется `make contracts-check`
- **THEN** кросс-репозиторные контрактные тесты фактически исполняются и сравнивают схемы соседних сервисов
- **AND** ни один из них не имеет статус `skipped`

#### Scenario: Guard ловит молчаливую потерю покрытия
- **WHEN** при `EQCMS_MONOREPO=1` соседний AsyncAPI-документ недоступен по ожидаемому пути
- **THEN** тест падает с явным сообщением о недостающем документе
- **AND** расхождение возвращается владельцу как finding, а не остаётся незамеченным

#### Scenario: Полный контракт: Кросс-репозиторные контрактные проверки не теряются вне монорепы
- **WHEN** проверяется соблюдение требования «Кросс-репозиторные контрактные проверки не теряются вне монорепы»
- **THEN** Тесты, сверяющие контракт сервиса с AsyncAPI-документом соседнего сервиса, SHALL корректно работать в обоих контурах исполнения: в монорепе, где соседний репозиторий доступен, и в CI отдельного сервисного репозитория, где его нет. При отсутствии соседнего документа тест MUST завершаться явным `skip` с указанием недостающего пути, а не `FileNotFoundError`, чтобы `make test` сервисного репозитория не блокировал деплой. Молчаливая потеря покрытия MUST быть исключена: при переменной окружения `EQCMS_MONOREPO=1` отсутствие соседнего документа MUST приводить к падению теста, а не к `skip`. Root tooling SHALL предоставлять `.PHONY` цель `contracts-check`, запускающую эти тесты с выставленной переменной, и MUST включать её в aggregate `check`.

### Requirement: stackctl покрывает публичные сайты и готовность к ручной проверке
scripts/stackctl SHALL обеспечивать ограниченное allowlist-управление site-ad и site-ksk-inlove и готовность aliases через ready с существующим lock, health/HTTP и JSON-контрактом. Compose scope, dry-run, пустой список и ошибки окружения SHALL сохранять ограничения сценариев.

#### Scenario: Сайт пересобран для ручной проверки
- **WHEN** выполняется `scripts/stackctl ready site-ad`
- **THEN** контейнер пересобран из текущего кода, HTTP-проба успешна и JSON содержит URL `http://localhost:<опубликованный порт>`

#### Scenario: Dry-run готовности
- **WHEN** выполняется `scripts/stackctl ready --dry-run app frontend site-ad`
- **THEN** выводится план compose-операций и миграций без изменения контейнеров и без захвата lock

#### Scenario: Нет .env сайта
- **WHEN** у сайта отсутствует `services/<site>/.env`
- **THEN** `ready` возвращает `ok:false` с причиной `env_missing` для этого alias и exit `1`

#### Scenario: Полный контракт: stackctl покрывает публичные сайты и готовность к ручной проверке
- **WHEN** проверяется соблюдение требования «stackctl покрывает публичные сайты и готовность к ручной проверке»
- **THEN** `scripts/stackctl` SHALL поддерживать aliases `site-ad` и `site-ksk-inlove` через их собственные `services/<site>/docker-compose.yaml` и `services/<site>/.env` в выделенных Compose-проектах `eqsitecms-site-ad` и `eqsitecms-site-ksk-inlove`; существующие имена контейнеров (`ad-site`, `site-ksk-inlove`) SHALL добавляться в явный allowlist, не расширяя управление на произвольные контейнеры. `stackctl` SHALL предоставлять mutating-команду `ready <alias...> [--dry-run] [--no-migrate]` под тем же `flock`: rebuild и recreate каждого alias, миграции профилей с миграциями, ожидание health (для сайтов без healthcheck — HTTP-проба опубликованного порта с ответом `<500`) и JSON-итог `{ ok, services: [{ alias, rebuilt, migrated, status, health, urls }] }`. Пустой список aliases SHALL возвращать `ok:true` с пометкой об отсутствии runtime-изменений. Отсутствие `.env` сайта или занятый порт MUST давать `ok:false` с причиной без автоисправления.

### Requirement: Актуальная документация пайплайна
WORKFLOW.md и README SHALL документировать действующий Router-first OpenSpec-пайплайн, команды и approval gates от docs/tasks до релиза согласно сценариям; WORKFLOW.md MUST NOT предписывать новые планы в docs/plans или gh pr create.

#### Scenario: Reviewer сверяет документацию
- **WHEN** reviewer сопоставляет `WORKFLOW.md`, `AGENTS.md`, README и Makefile
- **THEN** стадии, команды и конвенции веток/коммитов согласованы, а упоминания `docs/plans` встречаются только как legacy/read-only контекст

#### Scenario: Полный контракт: Актуальная документация пайплайна
- **WHEN** проверяется соблюдение требования «Актуальная документация пайплайна»
- **THEN** `WORKFLOW.md` SHALL описывать действующий Router-first OpenSpec-пайплайн от `docs/tasks` до релиза (propose → approval → execution units → Quality Gate lanes → `READY-FOR-MANUAL` → sync/archive → «Сливать в main?» → `MERGE` → «Релизить?» → `RELEASE` + CI) со ссылками на `AGENTS.md` и skill `.agents/skills/task-finalize` и MUST NOT предписывать создание планов в `docs/plans` или `gh pr create`. README SHALL перечислять `make sync SYNC_FLAGS=…`, `make ship-test`, `scripts/shipctl` и `scripts/stackctl ready`.

### Requirement: Ограниченная поддержка Яндекс-peers и их БД в stackctl
scripts/stackctl SHALL ограниченно поддерживать Яндекс-peers и их БД с сохранением Compose scope, allowlist, JSON/exit/lock-контрактов. SQL readiness MUST доказывать TCP password authentication парой безопасных probes; ошибки MUST закрывать gate без SQL, fallback или mutation. Точные aliases, профили, credentials и ограничения SHALL сохраняться по сценариям.

#### Scenario: Два peers готовы без соседних сервисов
- **WHEN** выполняется `ready yandex-service ya-metrica-service --no-migrate` при доступных зависимостях
- **THEN** только оба peers проходят build/recreate и health; JSON содержит их результаты и актуальные опубликованные URL, включая динамический порт Метрики, exit 0

#### Scenario: Dry-run без lock и мутаций
- **WHEN** выполняется `ready yandex-service ya-metrica-service --dry-run --no-migrate`, в том числе при занятом mutation lock
- **THEN** возвращается `ok:true` и план двух peers без Unknown service, flock, build/up/exec/migrations и изменения runtime

#### Scenario: Диагностика точных aliases
- **WHEN** вызываются doctor/logs для `ya-metrica-service`, `db-yandex` или `db-ya-metrica`
- **THEN** команды обращаются только к соответствующему контейнеру; произвольный неизвестный alias по-прежнему возвращает exit 1

#### Scenario: TCP SQL readiness обеих БД
- **WHEN** для каждой из двух БД выполняется `psql <db-alias> -c "SELECT 1"` с валидными runtime credentials
- **THEN** runtime hostname/IP выбирает существующий non-loopback endpoint внутри выбранного DB-контейнера, не host published port; положительный SELECT 1 возвращает 1, generated неверный password на том же target получает password-auth отказ, итог exit 0 без секретов; это отдельное evidence от peer health

#### Scenario: Trust endpoint не является auth-ready
- **WHEN** выбранный endpoint принимает SELECT 1 как с текущим runtime password, так и с generated неверным password
- **THEN** возвращаются `ok:false` и exit 1 без секретов; переданный SQL после gate не выполняется, trust не считается password authentication и HBA/auth/network/config не меняются

#### Scenario: Недоказанный negative probe безопасно отклоняется
- **WHEN** negative probe вместо распознаваемого password-auth отказа получает timeout, connection/exec/SQL failure либо target отсутствует, loopback или не подтверждён как адрес выбранного контейнера
- **THEN** возвращаются `ok:false` и exit 1 в ограниченное время без raw diagnostics, секретов, fallback или mutation; произвольный сбой не засчитывается как доказательство password authentication

#### Scenario: Отказ SQL readiness и запрет DB rebuild
- **WHEN** credentials отсутствуют либо положительный TCP probe не проходит, или запрошен rebuild/ready DB alias без build definition
- **THEN** возвращаются `ok:false` и exit 1 без секретов, интерактива, Unix socket/loopback/trust fallback, пересборки БД или запуска соседних infra services; legacy DB aliases сохраняют прежнее поведение

#### Scenario: Полный контракт: Ограниченная поддержка Яндекс-peers и их БД в stackctl
- **WHEN** проверяется соблюдение требования «Ограниченная поддержка Яндекс-peers и их БД в stackctl»
- **THEN** `scripts/stackctl` SHALL дополнить существующий `yandex-service` только aliases `ya-metrica-service`, `db-yandex`, `db-ya-metrica` с Compose keys того же имени и контейнерами `eqsitecms-ya-metrica-service`, `eqsitecms-db-yandex`, `eqsitecms-db-ya-metrica`. Профиль `ya-metrica` SHALL использовать существующие `docker-compose.ya_metrica.yml`, `services/ya-metrica-service/.env`, проект `eqsitecms-ya-metrica`; ограниченный профиль `infra` SHALL использовать существующие `docker-compose.infra.yml`, `.docker-compose/.env`, проект `eqsitecms-infra` и registry serviceKeys только двух указанных БД. Управление существующим контейнером MUST сохранять его Compose project и выбирать файлы, содержащие целевой service key, без переноса контейнера или запуска соседних сервисов.
- **AND** `ready yandex-service ya-metrica-service --no-migrate` SHALL пересобирать/recreate только два peers через существующий health/JSON контракт. `--dry-run` MUST возвращать план без build/up/exec/migrations и без lock. Автоматические миграции Яндекс-профилей не добавляются. `doctor` и `logs` SHALL принимать три новых aliases без обхода allowlist. БД SHALL оставаться `buildable:false`: rebuild/ready с DB alias MUST честно отказывать, не запускать infra целиком и не подменять SQL readiness состоянием running.
- **AND** `psql db-yandex -c "SELECT 1"` и аналог для `db-ya-metrica` SHALL проверять password authentication через существующий non-loopback TCP endpoint выбранного DB-контейнера на внутреннем PostgreSQL порту 5432: runtime hostname, разрешённый в non-loopback адрес этого контейнера, либо его runtime контейнерный IP. Hardcoded loopback и host dynamic published port MUST NOT использоваться. Для двух новых DB_CONFIG entries SHALL использоваться фактические `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD` внутри контейнера, `-X -w` и неинтерактивный запуск; пароль MUST NOT попадать в host argv, JSON, stdout/stderr или evidence.
- **AND** SQL auth readiness SHALL подтверждаться парой read-only probes к одному и тому же выбранному endpoint с одинаковыми user/database: положительный `SELECT 1` с текущим runtime password обязан успешно вернуть 1; negative `SELECT 1` с generated неверным паролем, отличным от runtime password, обязан завершиться именно отказом password authentication. Произвольный connection/exec/SQL failure MUST NOT считаться успешным negative probe. Оба пароля и raw probe diagnostics MUST NOT выводиться наружу; допустимо только безопасное evidence исходов probes/цели без секретов. Только после успешного auth gate разрешено выполнить переданный SQL отдельным аргументом без shell-интерполяции (для `SELECT 1` допустимо использовать положительный результат gate). Trust endpoint, где неверный пароль также работает, MUST давать `ok:false`/exit 1, а не auth-ready.
- **AND** Отсутствующие credentials, невозможность безопасно обнаружить/проверить target, неуспех положительного probe или недоказанный password-auth отказ negative probe MUST давать безопасный `ok:false`/exit 1 без fallback на Unix socket/loopback/trust и без выполнения переданного SQL после неуспешного gate. Проверка SHALL быть ограничена по времени; невозможность проверки MUST NOT приводить к repair/mutation. Наличие running/health не доказывает DB auth readiness. Поведение legacy DB aliases не меняется; HBA/auth/network/config/defaults/сервисы не изменяются.
- **AND** Существующие JSON stdout, exit codes 0/1/2, namespace allowlist, advisory lock мутаций и запрет destructive операций SHALL сохраняться; HTTP access policy, Compose, bindings и network MUST NOT изменяться.
