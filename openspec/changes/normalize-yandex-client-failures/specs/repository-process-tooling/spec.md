## ADDED Requirements

### Requirement: Ограниченная поддержка Яндекс-peers и их БД в stackctl

`scripts/stackctl` SHALL дополнить существующий `yandex-service` только aliases `ya-metrica-service`, `db-yandex`, `db-ya-metrica` с Compose keys того же имени и контейнерами `eqsitecms-ya-metrica-service`, `eqsitecms-db-yandex`, `eqsitecms-db-ya-metrica`. Профиль `ya-metrica` SHALL использовать существующие `docker-compose.ya_metrica.yml`, `services/ya-metrica-service/.env`, проект `eqsitecms-ya-metrica`; ограниченный профиль `infra` SHALL использовать существующие `docker-compose.infra.yml`, `.docker-compose/.env`, проект `eqsitecms-infra` и registry serviceKeys только двух указанных БД. Управление существующим контейнером MUST сохранять его Compose project и выбирать файлы, содержащие целевой service key, без переноса контейнера или запуска соседних сервисов.

`ready yandex-service ya-metrica-service --no-migrate` SHALL пересобирать/recreate только два peers через существующий health/JSON контракт. `--dry-run` MUST возвращать план без build/up/exec/migrations и без lock. Автоматические миграции Яндекс-профилей не добавляются. `doctor` и `logs` SHALL принимать три новых aliases без обхода allowlist. БД SHALL оставаться `buildable:false`: rebuild/ready с DB alias MUST честно отказывать, не запускать infra целиком и не подменять SQL readiness состоянием running.

`psql db-yandex -c "SELECT 1"` и аналог для `db-ya-metrica` SHALL проверять password authentication через существующий non-loopback TCP endpoint выбранного DB-контейнера на внутреннем PostgreSQL порту 5432: runtime hostname, разрешённый в non-loopback адрес этого контейнера, либо его runtime контейнерный IP. Hardcoded loopback и host dynamic published port MUST NOT использоваться. Для двух новых DB_CONFIG entries SHALL использоваться фактические `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD` внутри контейнера, `-X -w` и неинтерактивный запуск; пароль MUST NOT попадать в host argv, JSON, stdout/stderr или evidence.

SQL auth readiness SHALL подтверждаться парой read-only probes к одному и тому же выбранному endpoint с одинаковыми user/database: положительный `SELECT 1` с текущим runtime password обязан успешно вернуть 1; negative `SELECT 1` с generated неверным паролем, отличным от runtime password, обязан завершиться именно отказом password authentication. Произвольный connection/exec/SQL failure MUST NOT считаться успешным negative probe. Оба пароля и raw probe diagnostics MUST NOT выводиться наружу; допустимо только безопасное evidence исходов probes/цели без секретов. Только после успешного auth gate разрешено выполнить переданный SQL отдельным аргументом без shell-интерполяции (для `SELECT 1` допустимо использовать положительный результат gate). Trust endpoint, где неверный пароль также работает, MUST давать `ok:false`/exit 1, а не auth-ready.

Отсутствующие credentials, невозможность безопасно обнаружить/проверить target, неуспех положительного probe или недоказанный password-auth отказ negative probe MUST давать безопасный `ok:false`/exit 1 без fallback на Unix socket/loopback/trust и без выполнения переданного SQL после неуспешного gate. Проверка SHALL быть ограничена по времени; невозможность проверки MUST NOT приводить к repair/mutation. Наличие running/health не доказывает DB auth readiness. Поведение legacy DB aliases не меняется; HBA/auth/network/config/defaults/сервисы не изменяются.

Существующие JSON stdout, exit codes 0/1/2, namespace allowlist, advisory lock мутаций и запрет destructive операций SHALL сохраняться; HTTP access policy, Compose, bindings и network MUST NOT изменяться.

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
