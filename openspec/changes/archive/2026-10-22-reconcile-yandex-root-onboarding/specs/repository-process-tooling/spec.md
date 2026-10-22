## ADDED Requirements

### Requirement: Проверяемый корневой onboarding сервисов Яндекса

[SERVICES.md](<../../../../../SERVICES.md>) SHALL описывать `yandex-service` и `ya-metrica-service` как самостоятельные сервисные репозитории в `services/`, зарегистрированные в [manifest](<../../../../../services.manifest>), с минимальными ролями интеграции с Яндексом и адаптера Яндекс Метрики соответственно. Каталог SHALL быть единственным местом бизнес-описаний и SHALL отсылать за полными lifecycle/storage/API/access-контрактами к отдельному service-backfill из [задания 097](<../../../../../docs/tasks/097_yandex_services_retrospective_specs.md>). [README.md](<../../../../../README.md>) SHALL ссылаться на каталог и документировать подтверждённые команды без объявления регистрации сервисов разрешением на core release, deployment, Helm или CI.

#### Scenario: Оператор ищет сервисы в каталоге

- **WHEN** оператор сопоставляет каталог с manifest
- **THEN** он находит оба сервиса, их пути `services/yandex-service` и `services/ya-metrica-service`, минимальные роли и ссылку на отдельный service-backfill; документы не называют их submodules и не заявляют включение в core release

### Requirement: Разделение документируемых команд и гарантий поддержки

Корневая документация SHALL отражать существующие индивидуальные цели [Make](<../../../../../Makefile#L209-L269>): `yandex`, `yandex-attach`, `yandex-build`, `yandex-build-nc`, `ya-metrica`, `ya-metrica-attach`, `ya-metrica-build`, `ya-metrica-build-nc`; root `test`, `lint`, `format` уже делегируют одноимённые цели обоим сервисам. Документация MUST указывать mutating характер `format`, MUST NOT называть `test`/`lint` алиасами `check` и MUST отличать расширенные наблюдаемые recipes от нормативного core gate четырёх сервисов. Aggregate `build`/`build-nc` SHALL описываться без включения сервисов Яндекса. Входящий в scope устаревший blanket-текст о четырёх сервисах для root `test/lint/format` SHALL быть исправлен точечно, без общего переписывания остальных сервисных разделов. Неподтверждённая готовность `check` SHALL оставаться явным deferred gap, а не обещанием PASS.

#### Scenario: Оператор выбирает команду

- **WHEN** оператор читает README и ограничения каталога
- **THEN** он различает индивидуальные up/build цели, агрегированные вызовы service quality targets и mutating `format`; не получает обещания, что root quality recipes являются core-only gate или что сервисные tests уже прошли

### Requirement: Безопасный инвентарь root env и ресурсов Яндекса

Каталог SHALL содержать root-only инвентарь переменных из двух service Compose и относящихся к ним DB в infra: `EXPOSE_YANDEX_SERVICE_PORT`, `EXPOSE_YA_METRICA_SERVICE_PORT`, `POSTGRES_YANDEX_USER`, `POSTGRES_YANDEX_PASSWORD`, `POSTGRES_YANDEX_NAME`, `POSTGRES_YA_METRICA_USER`, `POSTGRES_YA_METRICA_PASSWORD`, `POSTGRES_YA_METRICA_NAME`, `EXPOSE_YANDEX_DB_PORT`, `EXPOSE_YA_METRICA_DB_PORT`, `EQSITECMS_YANDEX_DB_VOLUME`, `EQSITECMS_YA_METRICA_DB_VOLUME`, а также поведение `DEV_MOUNT` и `SKIP_MIGRATIONS`. Инвентарь MUST использовать только очевидные placeholders и безопасные defaults имён volumes из tracked Compose, MUST NOT публиковать реальные secrets или придумывать port/DB/password defaults.

Документация SHALL различать обязательный service `.env`, используемый service Compose и Make `--env-file`, и отдельный infra `.docker-compose/.env`; MUST NOT распространять frontend `.env.local/.env.prod` priority на эти сервисы. Каталог SHALL фиксировать отдельные DB/volumes, app/migration containers, внутренние порты `8000`/`5432`, external network `eqsitecms_network` и отсутствие DB в индивидуальных service Compose. Полный app env inventory SHALL быть отложен в service-backfill; локальные секретные env для документационной сверки MUST NOT читаться.

#### Scenario: Оператор готовит локальные переменные

- **WHEN** оператор читает env/resource inventory без доступа к секретным файлам
- **THEN** он видит имена переменных, назначение, безопасные placeholders, отдельные service/infra env контуры и defaults volume names, но не реальные credentials, выдуманные host-порты или обещание полноты app settings

### Requirement: Документированные пределы registry и безопасная операционная граница

Документы SHALL различать подтверждённые источниками уровни поддержки: manifest discovery, Make recipes и явные registry. Наличие профиля `yandex` и alias `yandex-service` в [stackctl](<../../../../../scripts/stackctl#L68-L118>) SHALL быть отражено без обещания полной ready/migrate/DB цепочки. Отсутствие metrica и обеих DB в явных registry SHALL быть помечено deferred, а не исправляться в рамках документационного apply. Обнаружение обоих репозиториев через manifest в [shipctl plan](<../../../../../scripts/ship/plan.mjs#L462-L478>) MUST NOT трактоваться как подтверждение release/ci/deployment поддержки.

Документы MUST предупреждать, что текущие Compose публикуют app и DB host-порты без явного loopback bind, individual up не гарантирует готовность DB/миграций, а `make infra` не является изолированным запуском только двух DB. Документы MUST NOT вводить endpoint/access-контракты или узаконивать наблюдаемые auth/token gaps. Network/access remediation, расширение tooling, scope quality gate, deployment и полный service-backfill SHALL оставаться явно отложенными до отдельных решений; этот change MUST NOT менять runtime, Make, manifest, Compose, scripts, Helm, CI или активный `normalize-yandex-client-failures`.

#### Scenario: Registry найден, но lifecycle не доказан

- **WHEN** reviewer сверяет root-документы с registry stackctl и discovery shipctl plan
- **THEN** документы честно признают yandex registry и manifest discovery обоих сервисов, указывают metrica/DB gaps и не предлагают непроверенные ready/release/deployment рецепты

#### Scenario: Проверяется безопасность документального change

- **WHEN** reviewer оценивает scope и предупреждения root onboarding
- **THEN** diff реализации ограничен двумя root-документами с отдельным учётом tasks/evidence, host exposure явно обозначен, endpoint changes/access matrix и anonymous/authenticated HTTP tests отмечены неприменимыми, а исправления access/tooling/deployment вынесены за границу change
