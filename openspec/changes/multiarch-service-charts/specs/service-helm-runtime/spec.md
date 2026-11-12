# Spec Delta

## Purpose

Контракт переносимого размещения приложений в смешанном Kubernetes-кластере и автономного описания внутренних SEO/Yandex/Metrica процессов без изменения инфраструктуры и HTTP-доступа.

## ADDED Requirements

### Requirement: Размещение на обеих архитектурах
Charts SHALL допускать запуск multiarch образа на amd64 и arm64. В существующих charts MUST убираться только реально мешающие архитектурные ограничения; новые nodeSelector/affinity/tolerations API, identity/lifecycle/hygiene переработки не требуются. Если исходный chart нейтрален, он SHALL сохраняться без этих доработок.

#### Scenario: HELM-01 — нейтральный render
- **WHEN** существующий либо новый chart рендерится с проверяемым imageTag
- **THEN** workloads ссылаются на свой образ и не блокируют одну из поддерживаемых архитектур
- **AND** исходные identity/commands/defaults существующего chart сохранены, кроме доказанно необходимого portability fix

#### Scenario: HELM-02 — только необходимое снятие ограничений
- **WHEN** в исходном chart есть реальный architecture/hostname/affinity pin, препятствующий одной платформе
- **THEN** минимальная корректировка устраняет препятствие
- **AND** при отсутствии такого ограничения не добавляются новые placement knobs; проверки не требуют их появления

### Requirement: Самостоятельные внутренние charts
SEO, Yandex и Metrica SHALL иметь независимые release/resource identity, ClusterIP API Service на 8000, secretRef/imagePullSecrets и настраиваемые resources/probes. Charts MUST NOT создавать credentials, БД, брокер, Ingress, NodePort, LoadBalancer или общие ClusterIssuer. HTTP/DB/NATS контракты не меняются.

#### Scenario: HELM-03 — безопасные identity и зависимости
- **WHEN** три новых chart рендерятся вместе с namespace `cms` и внешними secret names
- **THEN** resource names/selectors различны, Service выбирает только свой API Pod, внешние зависимости задаются env/secret ссылками без literal secrets
- **AND** общие infrastructure ресурсы и внешняя HTTP-публикация отсутствуют; ClusterIP не объявляется доказательством сетевой изоляции

### Requirement: Миграционный барьер
Новые charts SHALL описывать one-shot миграции из того же образа и tag с working directory `/app/src` по существующему Python-паттерну. Миграционный Job MUST завершаться до обновления API/фоновых процессов, сохранять существующий migration hook pattern и исключать запуск прикладного сервера вместо Alembic.

#### Scenario: HELM-04 — миграции без применения
- **WHEN** выполняется локальный render трёх charts по существующим Dockerfile/Compose командам, без зависимости от нового PACK/workflow
- **THEN** миграции имеют pre-install/pre-upgrade hook, restartPolicy Never и корректную команду миграции; новые deadline/retry overrides не обязательны
- **AND** команда uv run alembic -c alembic.ini upgrade head использует /app/src текущего image; API и фоновые команды соответствуют существующему Dockerfile/Compose, image rewrite/no-sync hardening не требуются
- **AND** тест только проверяет контракт, не запускает миграции на БД или image build; известные arm64/actionlint blockers не блокируют сам static render

### Requirement: Полный состав процессов с безопасным opt-in
SEO SHALL описывать API, один scheduler и отключённый maintenance; Yandex — API; Metrica — API, opt-in parse worker/beat и отдельные opt-in cleanup/merge workers. Singleton scheduler/beat/maintenance MUST сохранять существующую singleton семантику. Gate MUST NOT включать эти процессы в реальном окружении.

#### Scenario: HELM-05 — дефолты и включённый render
- **WHEN** charts рендерятся с defaults и затем с явным включением всех фоновых контуров
- **THEN** SEO scheduler имеет один экземпляр, maintenance по умолчанию отсутствует
- **AND** Metrica workers/beat по умолчанию отсутствуют; включённые worker queues — `ya_metrica`, `ya_metrica_cleanup`, `ya_metrica_merge`, beat один, команды совпадают с текущим runtime
- **AND** singleton процессы не масштабированы сверх существующего контракта; новый schema/placement API не требуется; opt-in flags не отменяют отдельные PG/NATS acceptance gates

### Requirement: Probes соответствуют упакованному runtime
API probes новых charts SHALL обращаться к существующему `/health` на 8000 без отсутствующих в образе утилит. Фоновые процессы MUST NOT получать фиктивный HTTP probe. Health MUST NOT интерпретироваться как подтверждение готовности broker/DB/vendor.

#### Scenario: HELM-06 — probe без curl зависимости
- **WHEN** chart использует slim Python image без curl
- **THEN** probe использует существующую в runtime команду либо httpGet /health, без требования менять probes остальных charts
- **AND** migration и non-HTTP процессы не получают API HTTP probe

### Requirement: Runtime secret injection по существующему паттерну
Новые charts SHALL использовать namespaced `envFrom.secretRef` и `imagePullSecrets` по существующим project/infra patterns во всех PodSpec. Secret names MUST быть overrideable без literal credentials. Создание/заполнение секретов остаётся отдельным действием оператора; chart и локальные тесты MUST NOT читать Secret data или предполагать cross-namespace доступ.

#### Scenario: HELM-07 — одинаковая инъекция во все процессы
- **WHEN** три chart рендерятся с default и synthetic override именами секретов, включая все opt-in процессы
- **THEN** API, migration, scheduler, maintenance и workers/beat получают свои envFrom/imagePullSecrets references в namespace workload
- **AND** defaults app secret names — eqsitecms-seo-service-secret, eqsitecms-yandex-service-secret, eqsitecms-ya-metrica-service-secret; default pull reference ghcr-secret, без data/stringData/Secret manifests
- **AND** проверка не обращается к GitHub secrets, Kubernetes Secret data или реальным env; наличие и валидность операторских secrets остаются unchecked

### Requirement: SEO maintenance использует существующий workers-list pattern
SEO chart SHALL описывать постоянный maintenance процесс одним элементом workers и локальным range-шаблоном, без отдельного maintenance template. Default worker.enabled MUST оставаться false, SEO_NORMALIZATION_ENABLED независимым. Команда, image/secret refs, readiness, один экземпляр, Recreate и grace 40s SHALL сохраняться; maintenance семантика и workers других сервисов не меняются; перенос scheduler регулирует HELM-09.

#### Scenario: HELM-08 — эквивалентность SEO maintenance после переноса в workers
- **WHEN** SEO chart рендерится с defaults и затем `workers[0].enabled=true`, с SHA и synthetic secret references
- **THEN** по умолчанию maintenance Deployment отсутствует, при opt-in существует ровно один `<release>-maintenance`, replicas=1, strategy=Recreate, terminationGracePeriodSeconds=40
- **AND** команда `uv run --no-sync python -m maintenance.main`, workingDir=/app и exec readiness `uv run --no-sync python -m maintenance.readiness` с исходными timing/threshold сохранены; image/tag/resources/envFrom/imagePullSecrets по прежним SEO global values
- **AND** singleton guard отклоняет enabled maintenance с replicas=2; rendered scheduler/API/migration/Service сохраняют прежнюю семантику
- **AND** template не задаёт SEO_NORMALIZATION_ENABLED и не включает runtime: отдельно нужен существующий внешний env flag и прежний PG/JetStream acceptance
- **AND** старый maintenance.enabled удалён как управляющий key без implicit alias; новые команды только в SEO разделе root документа, без runtime/build/deploy или общего framework

### Requirement: SEO scheduler использует тот же локальный workers pattern
SEO chart SHALL добавлять scheduler вторым worker с default enabled=true, сохраняя maintenance в workers[0] disabled. Отдельный scheduler template SHALL заменяться эквивалентным render через текущий workers template. Прежние scheduler resource/refs/команда/replicas1/Recreate MUST сохраняться; maintenance readiness/grace не наследуются scheduler. Existing workers overrides MUST оставаться совместимыми, без общего framework.

#### Scenario: HELM-09 — scheduler worker без изменения поведения
- **WHEN** выполняют SEO default/all-enabled/SHA/synthetic-reference render и сравнение с исходным отдельным scheduler
- **THEN** default имеет один scheduler, maintenance отсутствует; all-enabled имеет по одному scheduler и maintenance
- **AND** scheduler `<release>-scheduler`, container/labels/selectors/resources/image/secret refs/cwd=/app и команда `uv run --no-sync python -m scheduler.main` прежние, replicas=1/Recreate, без readinessProbe и без добавленного явного maintenance grace40s
- **AND** maintenance остаётся index0 с false default, прежними командой/readiness/timings/replicas1/Recreate/grace40s и независимым внешним SEO_NORMALIZATION_ENABLED; его singleton guard сохраняется
- **AND** legacy `workers[0].enabled=true/false`, частичный override без name и `workers=[]` не теряют default-ON scheduler; явно заданные поля и false не перетираются defaults, новый scheduler добавляется после maintenance без перестановки index0
- **AND** replicas=2 у enabled maintenance или scheduler отклоняются; API/Service/migration/прочие сервисы не меняются, root doc обновляется только в SEO section, без build/runtime/deploy
