# Spec Delta

## ADDED Requirements

### Requirement: Переносимые образы сервисов
Образы backend, email-service, notification-service, frontend, vk-service, site-ad, site-ksk-inlove, seo-service, yandex-service и ya-metrica-service SHALL собираться для `linux/amd64` и `linux/arm64` из одного commit с одинаковыми публичными build inputs. Каждая платформа MUST содержать собственные совместимые runtime и native-зависимости, без копирования host virtualenv/node_modules.

#### Scenario: CI-01 — две платформы одного исходника
- **WHEN** локальная проверочная сборка выполняется для любого из десяти сервисов
- **THEN** OCI index содержит runnable manifests обеих платформ, каждый связан с одним SHA
- **AND** attestation manifests не засчитываются как runnable platform; singlearch не проходит gate
- **AND** статический release-контракт использует те же Dockerfile/context/platforms/build-arg mappings, но публикует multiarch index с SHA/latest tags после quality gate; release не исполняется агентами

#### Scenario: CI-02 — запуск платформенных артефактов
- **WHEN** каждый платформенный образ запускают нативно либо под явно указанной эмуляцией в изолированной локальной среде
- **THEN** runtime и production-зависимости исполняются без `exec format error` и несовместимых ELF/ABI; no-sync/offline переработка не является отдельным acceptance
- **AND** проверены модули дополнительных процессов и файлы миграций; это не утверждение готовности production DB/NATS

### Requirement: Сохранение исходных workflow событий и release
Workflows SHALL сохранять исходные triggers/branch filters и quality → multiarch build/push → deploy. Новые Python workflows SHALL следовать исходному push-release паттерну email/notification/VK. Change MUST NOT добавлять PR/manual события либо отдельные jobs/permissions под них. Исходно существовавшие события MUST NOT удаляться. Запрет release агентами не отключает release-конфигурацию.

#### Scenario: CI-03 — исходный event contract
- **WHEN** workflow статически сверяют с immutable baseline соответствующего сервиса
- **THEN** backend/frontend/email/notification/VK сохраняют только push release; site-ad/Inlove — push main/release с прежним release-only deploy условием; PR/manual в этих baseline отсутствуют
- **AND** три новых Python workflow используют только push release, без придуманных pull_request/workflow_dispatch/main triggers
- **AND** quality gate, обе platforms единого SHA/latest index, image/release/namespace/secret mappings и передача SHA в Helm сохранены; существовавшие до change события не удаляются
- **AND** добавленные backend/frontend PR/manual/check_image ветви подлежат correction; локальная OCI/Helm/actionlint acceptance не требует новых CI событий

#### Scenario: CI-04 — ошибка архитектурной сборки
- **WHEN** хотя бы одна платформа, базовый образ или locked native-зависимость недоступны
- **THEN** сборка завершается ошибкой без fallback на singlearch, unlocked install или смены Python major
- **AND** release-конфигурация не допускает deploy после failed quality/build; локальная проверка ничего не публикует даже при ошибке

### Requirement: Независимая локальная проверка delivery
Штатные локальные проверки SHALL проверять workflows, Helm render и OCI platform metadata без публикации образов, релизов и доступа к кластеру. Результат MUST различать PASS, FAIL и blocked prerequisites; неисполненный запуск платформенного образа нельзя заменять успешным YAML lint.

#### Scenario: CI-05 — предметная статическая проверка конфигурации
- **WHEN** actionlint и review проверяют workflows, а helm lint/template — chart каждого затронутого сервиса
- **THEN** проверяются обе platforms, quality dependency, release guard, image/tag/selector, отсутствие default architecture pin и secret leakage
- **AND** валидный release-only build/push/deploy сохраняется; исчезновение исходного события/release, добавленное событие/check_image либо расширенное условие deploy являются finding, без исполнения workflow
- **AND** разработка универсального validator/runtime engine/ledger и malformed fixture suite не требуются

#### Scenario: CI-06 — неполная среда
- **WHEN** Buildx, Helm, actionlint, target runtime/эмуляция или сеть к base/package registry отсутствуют
- **THEN** evidence перечисляет непроверенные платформы и blocked причину; итог не помечается как полная multiarch/chart готовность; новый framework вместо недостающего инструмента не разрабатывается

### Requirement: Секреты CI через существующие ссылки
Workflows SHALL использовать GitHub Actions references без literal credentials. Backend/frontend/site-ad SHALL получать GHCR password через встроенный secrets.GITHUB_TOKEN, без ручного GH_TOKEN. Прочие token mappings, KUBE_CONFIG и imagePullSecrets MUST сохраняться. Новые Python workflows SHALL использовать существующий GITHUB_TOKEN/KUBE_CONFIG pattern. Проверки MUST NOT читать значения либо выполнять registry login/deploy.

#### Scenario: CI-07 — статический контракт secret injection
- **WHEN** анализируют конфигурацию registry login, kubeconfig и build inputs десяти workflows без запуска
- **THEN** GHCR получает secrets.GITHUB_TOKEN для backend/frontend/site-ad без изменения существующих username github.actor и permissions contents:read/packages:write; остальные mappings сохранены; kubeconfig setup сохраняет baseline `mkdir -p ~/.kube` и `echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > ~/.kube/config`, затем исходные setup-helm/Deploy; никаких новых kubeconfig env/mktemp/KUBECONFIG/GITHUB_ENV/cleanup steps
- **AND** runtime passwords/encryption keys не передаются как Docker build args, tracked env или artifacts; публичные NEXT_PUBLIC и Sentry mappings сохраняются, локальные проверки используют synthetic inputs
- **AND** наличие/валидность реальных GitHub secrets не объявляются проверенными, отсутствие доступа к ним не блокирует локальную acceptance

### Requirement: Минимальный multiarch diff
Существовавшие до этого change delivery-конфигурации SHALL меняться только ради amd64/arm64 build/pull и устранения реальных ограничений размещения. Необходимые target/native dependency fixes допустимы; security/runtime/hygiene/identity переработки MUST NOT становиться самостоятельной целью. Уже внесённые лишние hunks SHALL сниматься bounded correction без blanket revert чужих файлов.

#### Scenario: CI-08 — граница scope
- **WHEN** оценивается diff существующего сервиса или correction unit
- **THEN** каждое оставляемое packaging изменение связано с обеими архитектурами либо необходимой совместимостью исправленного image; отдельно разрешена только явно согласованная локальная форма SEO maintenance/scheduler workers по HELM-08/09 без изменения семантики и CI-BUILTIN-TOKEN по CI-10, без иных CI изменений
- **AND** исходные triggers/secrets/kubeconfig/runtime contracts сохраняются; новые knobs, CI события, общий validator и соседний hardening не требуются
- **AND** Dockerfile изменения не отвергаются автоматически: реальный native portability fix сохраняется с соответствующим build/run evidence

### Requirement: Единая root delivery документация
Delivery-инструкции change SHALL находиться только в `docs/operations/multiarch-delivery.md` корневого репозитория. Пять прежних service docs SHALL удаляться после консолидации; новые сервисы MUST NOT получать docs/delivery.md. Документ MUST сохранять known blocked статусы, не дублировать общие заметки и не объявлять static render доказательством runtime readiness.

#### Scenario: CI-09 — перенос и последующее сопровождение
- **WHEN** DOC-MOVE завершён и новые charts последовательно добавляются
- **THEN** пять service delivery.md отсутствуют, root README ссылается на один root документ, ссылки/команды корректны из корня
- **AND** SEO/Yandex/Metrica обновляют только свои разделы в этом документе после static chart проверки; service delivery docs и копии общих инструкций не создаются
- **AND** arm64 exec format error/actionlint absent сохраняются blocked без retries/setup и без ложного PASS

### Requirement: Встроенный GHCR token без ручного GH_TOKEN
Backend/frontend/site-ad workflows SHALL заменить только login-action password secrets.GH_TOKEN на secrets.GITHUB_TOKEN. GitHub автоматически выдаёт этот repo/job token; ручной secret создавать не требуется. Остальные workflow поля MUST сохраняться. Доступ Actions repo к существующему GHCR package SHALL считаться внешним prerequisite, не доказанным статической заменой.

#### Scenario: CI-10 — точечная замена и граница package access
- **WHEN** три workflow и релевантные root-doc token notes проверяют статически после CI-BUILTIN-TOKEN
- **THEN** diff каждого workflow относительно pre-unit working copy содержит только одну замену password reference; username github.actor, contents:read/packages:write, triggers/guards/build/deploy/public mappings/kubeconfig и Kubernetes imagePullSecrets прежние
- **AND** root doc больше не требует ручного GH_TOKEN для этих трёх login и объясняет автоматический GITHUB_TOKEN; другие secret values не читаются, GitHub settings/registry не изменяются
- **AND** ранее опубликованный через PAT package без repo linkage/Actions write access может вернуть denied; оператор настраивает этот доступ отдельно, без unconditional runtime/push PASS от статической проверки
- **AND** acceptance не запускает registry login/push/workflow/deploy, не создаёт ручной GITHUB_TOKEN secret и не восстанавливает удалённый scripts/qa/delivery framework
