# Multiarch delivery: образы и Helm charts

Единый источник delivery-инструкций change `multiarch-service-charts`.
Все команды ниже — **из корня монорепозитория**, пути ссылок — относительно этого документа.
API, права доступа и продуктовый runtime этим этапом не меняются.

## Текущий статус и границы

У пяти сервисов ниже Dockerfile, `.dockerignore` и `.helm` восстановлены к указанным baseline.
Charts уже архитектурно нейтральны; новые placement knobs не нужны.
В workflows сохранены Buildx/QEMU и `linux/amd64,linux/arm64`, quality → build/push SHA/latest → Helm deploy,
исходное событие только push в `release` и прежний kubeconfig через `secrets.KUBE_CONFIG` → `~/.kube/config`.
Это описание конфигурации, а не разрешение её исполнения.

По принятым MIN handoffs: native amd64 build/load, изолированные native imports/CLI/file inventory
и Helm lint/default/SHA render — PASS. Здесь они не перезапускались.
**Полная multiarch готовность не подтверждена:** arm64 `/bin/sh: exec format error`,
multiarch OCI/arm64 runtime и отсутствующий actionlint остаются **blocked** без retries/setup.
У email также известен remote base manifest connection reset; cached amd64 build не доказывает remote arm64 availability.
Старое evidence изменённых image/probes/placement не подтверждает восстановленную конфигурацию.

| Сервис (context/chart/workflow внутри каталога) | Baseline Dockerfile/dockerignore/chart | Runtime и важные сохранённые особенности | MIN evidence в `.qa/multiarch-service-charts/` |
|---|---|---|---|
| [backend](../../services/backend/) | `941e2b39f07d3cf850e52788c1f30d27f1879088` | Python 3.13 / uv 0.8.15, runtime 3.13.5; `uv sync --locked`; `/eqsitecms`, `uv run src/main.py`; curl установлен, body-size `20m`; migration Job/worker в chart отсутствуют | `BE-CORE-MIN/` |
| [frontend](../../services/frontend/) | `f4929ec6d48d9e6baa674a273fc68b818511e686` | Node 22 Alpine/musl; target builder/runtime ABI, npm ci/build/prune, `npm start`, порт 5100; SWC/sharp x64/arm64 lock references — не runtime proof | `FE-CMS-MIN/` |
| [notification-service](../../services/notification-service/) | `5c15cbf7ca4acef61fbac6f69642f43f5ac3bbb4` | Python 3.14.6-slim / uv 0.8.15, locked production install; API uvicorn, Alembic | `BE-NOTIFY-MIN/` |
| [email-service](../../services/email-service/) | `c298998ce6f3b3baff0f019e1a99029db1814b24` | Тот же Python/uv; `uv sync --locked --no-dev`; API, Alembic и Celery очередь `email` | `BE-EMAIL-MIN/` |
| [vk-service](../../services/vk-service/) | `fe02a63af148b9858c09afb9d36b768590e0fb88` | Тот же Python/uv/install; API, Alembic, Celery очередь `vk` и bot; исходные singleton/default/lifecycle настройки сохранены | `BE-VK-MIN/` |

Для этой пятёрки image prefix — `ghcr.io/igor-526/eqsitecms-`, release prefix — `eqcms-`,
далее точное имя сервиса из таблицы; namespace `cms`. Chart — `.helm`, workflow — `.github/workflows/check_and_deploy.yml`.
Все пять используют встроенный `GITHUB_TOKEN`, автоматически выдаваемый GitHub Actions; ручной `GH_TOKEN` для backend/frontend не требуется.
Для backend/frontend/site-ad внешний prerequisite — привязка существующего GHCR package к repo и write access для Actions этого repo.
Ранее опубликованный через PAT package без такого доступа может вернуть `denied`; оператор настраивает доступ отдельно, успешная публикация статической проверкой не гарантируется.
Это не замена Kubernetes imagePullSecrets/registry pull auth; их настройка остаётся прежней.
Frontend сохраняет public `NEXT_PUBLIC_BACKEND_URL`/`SENTRY_*` build mappings.
Runtime references — существующие `secretName`/`imagePullSecertName` (написание ключа baseline сохранено),
pull reference `ghcr-secret`; email/VK app references — `eqsitecms-email-service-secret`/`eqsitecms-vk-service-secret`.
Secret и imagePullSecret должны существовать в namespace workload; их наличие/валидность не проверялись.

У slim Python baseline остаются curl exec probes при отсутствии curl; исправность probes не доказана.
Email/VK сохраняют исторические Chart.name/filenames, VK — прежние bot lifecycle ограничения.
Для notification/email/VK migration остаётся `uv run alembic -c alembic.ini upgrade head` из `/app/src`,
со своим исходным sync-поведением. API — `uv run --no-sync uvicorn main:app --app-dir src --host 0.0.0.0 --port 8000`;
email worker — `uv run --no-sync celery -A workers.celery_app worker -Q email -l info` из `/app/src`.
Это baseline, не новые требования no-sync/offline/hardening и не утверждение успеха миграций.

## Базовые локальные команды

Нужны уже доступные Docker/Buildx, registry/package network, диск и для render — Helm.
Объявленная Buildx platform не доказывает работоспособную native/emulated execution среду.
Команды build/actionlint ниже — для будущего этапа **после отдельного восстановления prerequisites оператором**;
при известных blockers их не повторять. DOC-MOVE выполняет только static docs checks, не эти команды.

Пример для backend; для другого существующего сервиса заменить `S` точным именем из таблицы.
Для frontend дополнительно нужны только синтетические публичные build args, показанные ниже.

```bash
S=backend
E=".qa/multiarch-service-charts/local-${S:?}"
mkdir -p "$E"
# Только при доступном target execution обеих платформ:
timeout 900 docker buildx build --platform linux/amd64,linux/arm64 \
  --output "type=oci,dest=${E:?}/image.oci.tar" \
  --metadata-file "${E:?}/build.json" --progress plain "services/${S:?}"
# Отдельно для каждой реально исполняемой arch; пример amd64:
timeout 900 docker buildx build --platform linux/amd64 --load \
  -t "eqsitecms-${S:?}:local-amd64" --progress plain "services/${S:?}"
docker image inspect "eqsitecms-${S:?}:local-amd64" \
  --format '{{.Os}}/{{.Architecture}} {{json .Config.Cmd}} {{.Config.WorkingDir}}'
# Статические проверки, без kubeconfig/кластера:
helm lint "services/${S:?}/.helm"
helm template "eqcms-${S:?}" "services/${S:?}/.helm" --namespace cms \
  > "${E:?}/default.yaml"
helm template "eqcms-${S:?}" "services/${S:?}/.helm" --namespace cms \
  --set-string imageTag=0123456789abcdef > "${E:?}/sha.yaml"
# Только если инструмент уже доступен; workflow не исполняется:
actionlint "services/${S:?}/.github/workflows/check_and_deploy.yml"
```

Frontend: к каждому `docker buildx build` добавить:

```bash
--build-arg NEXT_PUBLIC_BACKEND_URL=https://backend.invalid \
--build-arg SENTRY_ENABLED=false \
--build-arg SENTRY_ENVIRONMENT=packaging \
--build-arg SENTRY_RELEASE=local-qa
```

В OCI index/config проверить обе runnable архитектуры; `unknown/unknown` attestations платформами не считать.
Singlearch build не заменяет двухплатформенную acceptance. Per-platform packaging smoke — отдельная проверка
с лимитом 120 секунд, `--network none`, без host ports/mounts, app env и credentials:
backend — native asyncpg/bcrypt/pandas/psycopg2/numpy, curl/CLI/migration inventory;
остальные Python — asyncpg/uvloop/httptools/pydantic_core и свои native imports, CLI и entrypoint files;
VK дополнительно bot/worker inventory без их запуска.
Frontend — SWC/sharp, `.next` inventory, bounded npm start/TCP 5100 без продуктовых HTTP вызовов.
Конкретные smoke scripts/логи остаются только в ignored MIN evidence, не в tracked инструкции.

## Следующие сервисы: подготовка, а не готовые charts

Порядок: SEO-CHART → YANDEX-CHART → METRICA-CHART, затем отдельные PACK units.
PACK не prerequisite для static charts; image/workflow здесь не реализуются.
Ниже — принятый source inventory, без повторной runtime проверки.
У всех трёх уже есть Dockerfile с Python 3.14.6-slim/uv и src;
API CMD — `uv run --no-sync uvicorn main:app --app-dir src --host 0.0.0.0 --port 8000` из `/app`,
Alembic — `uv run alembic -c alembic.ini upgrade head` из `/app/src`.
Наличие lock wheel references не доказывает Python ABI/shared libraries/remote availability.
Charts и release workflows этих трёх **пока не созданы и не проверены** в данном этапе.

### seo-service

[Каталог сервиса](../../services/seo-service/), [chart](../../services/seo-service/.helm/Chart.yaml):
`eqcms-seo-service`, namespace `cms`; образ `ghcr.io/igor-526/eqsitecms-seo-service` с общим `imageTag`.
В отличие от подготовительного статуса выше, SEO chart уже создан и проверен **только локальным render**;
workflow/image/arm64 readiness этим не подтверждены, PACK остаётся отдельным этапом.
ClusterIP `eqsitecms-seo-service:8000` выбирает только API; probes — существующий `/health`.
API использует CMD Dockerfile; migration hook `pre-install/pre-upgrade` выполняет
`uv run alembic -c alembic.ini upgrade head` из `/app/src` до обновления workloads.
Scheduler описан в `workers[1]` (`name=scheduler`, `enabled=true`) через тот же локальный
`templates/seo-service-workers.yaml`: один экземпляр, `Recreate`,
`uv run --no-sync python -m scheduler.main` из `/app`, без maintenance readiness и явного grace period.
Maintenance описан в `workers[0]` (`name=maintenance`, `enabled=false`) через локальный
`templates/seo-service-workers.yaml`; по умолчанию Deployment отсутствует. Opt-in — один экземпляр,
`Recreate`, `uv run --no-sync python -m maintenance.main`, grace period 40s и exec readiness
`uv run --no-sync python -m maintenance.readiness` (не HTTP), cwd `/app`.
Включённые maintenance и scheduler с `replicas!=1` отклоняются Helm guard.
Default — только scheduler; при включении maintenance — по одному обоих.
Частичные legacy overrides `workers[0]` без name и пустой `workers=[]` сохраняют scheduler ON
(пустой список оставляет maintenance OFF). Явный `workers[1].enabled=false` выключает scheduler;
явно заданные поля workers сохраняются, maintenance остаётся index0.

Во всех процессах внешние references: `secretName=eqsitecms-seo-service-secret`,
`imagePullSecrets=[{name: ghcr-secret}]`; оба Secret нужны в namespace workloads.
Env-ключи из `.env.example`: `POSTGRES_*`, `NATS_*`, `PARSE_SCHEDULE_ENABLED`,
`PARSE_*`, `YANDEX_SERVICE_URL`, `YA_METRICA_SERVICE_URL`, `SEO_NORMALIZATION_*`.
Chart не включает нормализацию через env: независимо от opt-in требуется
`SEO_NORMALIZATION_ENABLED=true` во внешнем Secret и отдельный реальный PG/JetStream acceptance.
Native asyncpg/uvloop/httptools; `pg_trgm` — prerequisite оператора, не установка расширения этим change.
Health/readiness и ClusterIP не доказывают готовность зависимостей или сетевую изоляцию.

Команды из корня, без установки chart; synthetic values содержат только имена ссылок:

```bash
helm lint services/seo-service/.helm
helm template eqcms-seo-service services/seo-service/.helm --namespace cms
helm template eqcms-seo-service services/seo-service/.helm --namespace cms --set-string imageTag=0123456789abcdef0123456789abcdef01234567
helm template eqcms-seo-service services/seo-service/.helm --namespace cms --set 'workers[0].enabled=true'
helm template eqcms-seo-service services/seo-service/.helm --namespace cms --set 'workers[0].enabled=false'
helm template eqcms-seo-service services/seo-service/.helm --namespace cms --set-json 'workers=[]'
helm template eqcms-seo-service services/seo-service/.helm --namespace cms --set 'workers[1].enabled=false'
helm template eqcms-seo-service services/seo-service/.helm --namespace synthetic-seo --set 'workers[0].enabled=true' --set secretName=synthetic-seo-env --set 'imagePullSecrets[0].name=synthetic-seo-pull'
```

Исходный SEO-CHART render PASS сохранён в `.qa/multiarch-service-charts/SEO-CHART/`.
Предыдущий maintenance workers layout: `helm lint`, default/worker-enabled/SHA/synthetic references render,
пустой/OFF workers, singleton negative и before/after resource/source equivalence — PASS;
evidence: `.qa/multiarch-service-charts/SEO-WORKER-PATTERN/`.
Текущий общий scheduler/maintenance workers layout: `helm lint`, default/all-enabled/SHA/synthetic
references, legacy partial/empty overrides, explicit false, singleton negatives и полная
before/after эквивалентность ресурсов — PASS;
evidence: `.qa/multiarch-service-charts/SEO-SCHEDULER-WORKER/`. Архитектурных pins нет.
Известные arm64 exec format error/actionlint absent остаются blocked без повторного запуска;
миграции, scheduler и maintenance не запускались.

### yandex-service

[Каталог сервиса](../../services/yandex-service/), [chart](../../services/yandex-service/.helm/Chart.yaml):
`eqcms-yandex-service`, namespace `cms`; образ `ghcr.io/igor-526/eqsitecms-yandex-service`, общий `imageTag`.
В отличие от подготовительной пометки выше, Yandex chart создан и проверен **только локальным render**;
workflow/image/arm64/actionlint readiness не подтверждены, PACK остаётся отдельным этапом.
ClusterIP `eqsitecms-yandex-service:8000` выбирает только API; probes — `/health` на 8000.
API/lifecycle использует production CMD Dockerfile из `/app`:
`uv run --no-sync uvicorn main:app --app-dir src --host 0.0.0.0 --port 8000`, без dev `--reload` и без отдельных workers.
Migration hook `pre-install/pre-upgrade` из того же image/tag выполняет
`uv run alembic -c alembic.ini upgrade head` в `/app/src` до обновления API.

`envFrom.secretRef` API и migration — `secretName=eqsitecms-yandex-service-secret`;
`imagePullSecrets[0].name=ghcr-secret`, обе ссылки overrideable и namespaced.
Оператор отдельно обеспечивает app/pull Secrets в namespace workload, POSTGRES_USER/POSTGRES_PASSWORD/
POSTGRES_HOST/POSTGRES_PORT/POSTGRES_DB, NATS_SERVERS, ENCRYPTION_SERVICE_KEY,
YANDEX_APP_CLIENT_ID/YANDEX_APP_CLIENT_SECRET/YANDEX_APP_REDIRECT_URI и остальные runtime settings
из `.env.example` (только имена ключей, значения здесь не задаются).
Доступность PostgreSQL/NATS/OAuth и валидность ключа шифрования остаются unchecked.
Private credential-less peer не публикуется через Ingress/NodePort/LoadBalancer;
ClusterIP сам по себе не гарантирует сетевую изоляцию — это отдельный операторский prerequisite.

Проверки из корня, без kubeconfig и без исполнения миграций:

```bash
helm lint services/yandex-service/.helm
helm template eqcms-yandex-service services/yandex-service/.helm --namespace cms
helm template eqcms-yandex-service services/yandex-service/.helm --namespace cms --set-string imageTag=0123456789abcdef0123456789abcdef01234567
helm template synthetic-yandex services/yandex-service/.helm --namespace synthetic-cms --set-string secretName=synthetic-yandex-env --set-string 'imagePullSecrets[0].name=synthetic-yandex-pull'
```

All-enabled неприменим: дополнительных opt-in процессов нет. Lint, три render и static проверки пройдены;
evidence — `.qa/multiarch-service-charts/YANDEX-CHART/`. Image builds, product suites, API lifespan и миграции не запускались.

### ya-metrica-service

[Chart](../../services/ya-metrica-service/.helm/Chart.yaml) `eqcms-ya-metrica-service`,
release `eqcms-ya-metrica-service`, namespace `cms`.
API-only ClusterIP `eqsitecms-ya-metrica-service:8000` выбирает только API Pod;
HTTP probes используют существующий `/health`. ClusterIP не доказывает сетевую изоляцию.
Image `ghcr.io/igor-526/eqsitecms-ya-metrica-service`, tag задаётся `imageTag`.
API наследует Dockerfile CMD из `/app`:
`uv run --no-sync uvicorn main:app --app-dir src --host 0.0.0.0 --port 8000`.
Migration hook `pre-install,pre-upgrade` использует тот же image/tag:
`uv run alembic -c alembic.ini upgrade head`, workingDir `/app/src`.

`runtime.enabled=false` по умолчанию исключает parse worker и beat;
`cleanup.enabled=false` и `merge.enabled=false` независимо исключают maintenance workers.
Все Celery команды выполняются из `/app/src` через
`uv run --no-sync celery -A workers.celery_app`:

- parse: `worker -Q ya_metrica -l info --concurrency=1 --hostname ya-metrica-worker@%h`;
- cleanup: `worker -Q ya_metrica_cleanup -l info --concurrency=1 --hostname ya-metrica-cleanup-worker@%h`;
- merge: `worker -Q ya_metrica_merge -l info --concurrency=1 --hostname ya-metrica-merge-worker@%h`;
- один beat: `beat -l info --schedule /app/celerybeat-schedule`.

Worker hostname соответствует имени перед `@`; graceful stop — 300 секунд.
Workers/beat имеют один экземпляр и `Recreate`, чтобы исключить overlap при обновлении.
Beat schedule использует writable container layer `/app` текущего Dockerfile (без USER/read-only rootfs);
это непостоянный файл, не PVC и не подтверждение runtime readiness.
Cleanup/merge дополнительно проверяют `MAINTENANCE_RUNTIME_ENABLED=true` из внешнего Secret
через `sh -c 'test … && exec …'`: chart enable не устанавливает этот флаг.

Все PodSpec используют внешние namespaced ссылки
`secretName=eqsitecms-ya-metrica-service-secret` и `imagePullSecrets=[{name: ghcr-secret}]`.
Оператор отдельно обеспечивает их наличие в namespace workload; chart не создаёт Secret.
Имена ключей из `.env.example`: `POSTGRES_USER/PASSWORD/HOST/PORT/DB`,
`ENCRYPTION_SERVICE_KEY`, `YANDEX_SERVICE_URL`, `SEO_SERVICE_URL`,
`CELERY_APP_MAIN`, `CELERY_APP_BROKER`, `CELERY_APP_BACKEND`, `REDIS_PASSWORD`,
`NATS_SERVERS`, `NATS_STREAM_*`, `NATS_SUBJECT_*`, `NATS_CONSUMER_*`,
`MAINTENANCE_RUNTIME_ENABLED` и остальные runtime settings, без значений.
До включения любого фонового процесса нужны отдельные PG/NATS readiness/acceptance gates,
Redis broker/backend (исходный контракт DB 5/6), peer services и согласованные credentials.
Ничего из этого не проверялось и не запускалось данным chart unit.

Статические команды из корня, без kubeconfig и исполнения consumers/миграций:

```bash
helm lint services/ya-metrica-service/.helm
helm template eqcms-ya-metrica-service services/ya-metrica-service/.helm --namespace cms
helm template eqcms-ya-metrica-service services/ya-metrica-service/.helm --namespace cms --set imageTag=0123456789abcdef0123456789abcdef01234567
helm template eqcms-ya-metrica-service services/ya-metrica-service/.helm --namespace cms --set runtime.enabled=true,cleanup.enabled=true,merge.enabled=true
helm template eqcms-ya-metrica-service services/ya-metrica-service/.helm --namespace synthetic-metrica --set runtime.enabled=true,cleanup.enabled=true,merge.enabled=true --set secretName=synthetic-metrica-env --set 'imagePullSecrets[0].name=synthetic-metrica-pull'
```

Lint и четыре render прошли; evidence: `.qa/multiarch-service-charts/METRICA-CHART/`.
Проверен только Helm/source контракт. Image build/runtime и workflow — последующий METRICA-PACK;
известные arm64 `exec format error` и отсутствие actionlint остаются blocked без rerun/setup.
Не заявляется готовность images, runtime, arm64 или кластера.

## site-ad (aleksandrova-dacha)

Baseline: `78212f9854803099f26c1ce793b8090c469fa652`. Workflow сохраняет push `main`/`release`,
quality job и release-only build/deploy; добавлены только QEMU/Buildx и `linux/amd64,linux/arm64`.
Image `ghcr.io/igor-526/aleksandrova-dacha-site` (SHA/latest), release `site-ad`, namespace `consumer`,
GHCR login использует автоматически выдаваемый `GITHUB_TOKEN` без ручного `GH_TOKEN` (внешний package access prerequisite описан выше);
`KUBE_CONFIG` и все public/Sentry build-arg mappings сохранены.
Dockerfile (`node:20-alpine`, nginx 3000 / Next 3001), manifests/lock и архитектурно нейтральный chart
не изменены. Pull reference — исходный `imagePullSecertName=ghcr-secret-ad`.

Проверки из корня: `helm lint services/site-ad/.helm`,
`helm template site-ad services/site-ad/.helm --namespace consumer` и тот же render с
`--set-string imageTag=78212f9854803099f26c1ce793b8090c469fa652`.
Локальная сборка использует чистый tracked context baseline без `.env*`/host dependencies
и synthetic public inputs; отсутствие `.dockerignore` не означает безопасность dirty host context.
Native amd64 build/load, SWC/sharp и startup nginx → Next (HTTP 200, `--network none`) — PASS;
Helm lint/default/SHA render — PASS. Команды и результаты — `.qa/multiarch-service-charts/SC-AD/handoff`.
Arm64 execution и actionlint остаются blocked без retry/setup; полная multiarch/cluster readiness не заявляется.

## Операторские gates и безопасность

Static render и локальная упаковка не доказывают production readiness, rollout, сетевую изоляцию,
Ingress admission, успех миграций или доступность PG/NATS/Redis/SMTP/peers/VK/OAuth.
Реальные env, kubeconfig и Secret data не читать/выводить; документируются только существующие references.
Токены/пароли не передавать в build args. Настройка namespaced secrets и production inputs — отдельная задача оператора.
Агентам запрещены push/publish/release/deploy/apply, Helm install/upgrade, cluster mutations,
инфраструктурный setup и privileged/binfmt установка. Реальный bot/worker/consumer/lifespan/миграции не запускать.
Новый framework/runner/ledger не требуется; временные scripts/logs/values — только `.qa/multiarch-service-charts/<unit>/`.
Общие инструкции и будущие сведения SEO/Yandex/Metrica поддерживаются только здесь, без service delivery копий.
