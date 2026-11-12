# Proposal

## Why

Новый кластер содержит amd64 и arm64. По `docs/tasks/111_charts.md` требуется только возможность сборки/загрузки образов и размещения на нодах обеих архитектур, плюс charts/workflows трёх новых сервисов.

## What Changes

- Для семи сервисов с существующими charts/workflows добавить `linux/amd64,linux/arm64` к сборке образа; сохранить исходные triggers, quality/build/push/deploy, image/tag/release identity, secrets и способ kubeconfig `~/.kube/config`.
- В существующих charts убрать только реально мешающие архитектурные ограничения. Не добавлять новые nodeSelector/affinity/tolerations, если переносимость этого не требует.
- Для seo-service, yandex-service, ya-metrica-service создать минимальные charts/workflows по исходному Python-паттерну, с их фактическими API/миграциями/фоновой работой и существующими secret references.
- Допустимы необходимые native target dependency/base-image fixes, подтверждённые сборкой/исполнением обеих архитектур. No-sync/runtime/hygiene/security/identity refactoring не являются самостоятельными целями.
- Принятые .MIN/correction результаты пяти сервисов исторические и не повторяются: их config/source baseline уже восстановлен. Не откатывать чужую работу и не открывать эти charts/Dockerfiles снова. Новые CI события и универсальная tooling/verification инфраструктура исключены.

- Перенести пять service delivery.md в один компактный `docs/operations/multiarch-delivery.md` корня; новые сервисы документировать только там, обновить root README/ссылки, не создавать docs/reports.
- DOC-MOVE и три новых CHART units выполнены по текущему tasks. SEO-WORKER-PATTERN выполнен; новый согласуемый этап — только SEO-SCHEDULER-WORKER. Пять существующих charts/Dockerfiles не открываются заново; перенос scheduler теперь явно согласован отдельно, не является автоматическим расширением maintenance unit. Workflow/image units остаются отдельными, без примешивания к maintenance коррекции.

- Согласованная точечная корректировка уже созданного SEO chart: maintenance как один элемент `workers` и SEO-local шаблон `range .Values.workers` по существующему email pattern вместо отдельного maintenance template. OFF по умолчанию и независимый внешний SEO_NORMALIZATION_ENABLED сохраняются; в рамках прежнего maintenance unit scheduler/другие сервисы не менялись. Opt-in key меняется с `maintenance.enabled` на `workers[0].enabled`, без двух параллельных источников включения; обновляется только SEO раздел root документа.

- Отдельно согласован SEO scheduler как второй элемент текущего workers list/template: maintenance остаётся workers[0] OFF, scheduler добавляется workers[1] ON. Сохраняются прежний scheduler Deployment resource/команда и действующие workers overrides; scheduler не получает maintenance readiness/grace40s. Никакого общего framework, image/workflow/runtime изменений.

- Новый явно согласованный unit CI-BUILTIN-TOKEN: только три GHCR login `password` references backend/frontend/site-ad заменить `secrets.GH_TOKEN` → `secrets.GITHUB_TOKEN`; соответствующие token упоминания в root doc обновить. Встроенный token выдаётся GitHub автоматически, ручной secret GH_TOKEN больше не требуется для этих login. Другие secrets/permissions/triggers/guards/kubeconfig/imagePullSecrets не меняются; GHCR package Actions write access — внешний unchecked prerequisite, не обещание успешной публикации.

## Capabilities

### New Capabilities

- `service-helm-runtime`: минимальные переносимые charts новых трёх сервисов и отсутствие архитектурных блокеров размещения существующих.

### Modified Capabilities

- `ci-workflows`: сборка двух платформ с сохранением исходного delivery-контракта и baseline secret/kubeconfig injection и единой root документацией.

## Impact

DOC-MOVE/chart/SEO workers результаты сохраняются как выполненная история. Текущий scope — только CI-BUILTIN-TOKEN: три password references и релевантные token notes root документа. Scope новых сервисов — сначала минимальные charts на уже существующих Dockerfiles, затем отдельные workflows/images при доступных prerequisites. Не менять API, БД, NATS, UI или core release scope. Никаких иных повторных коррекций конфигурации существующих сервисов не разрешено. Выполненная история сохраняется; она не подтверждает новые scope/acceptance автоматически. `scripts/qa/delivery/**` удалены пользователем; не восстанавливать framework, его файлы или requirements.

Проверки только штатными Docker Buildx, Helm и actionlint локально, без production secrets и запуска Actions. Public Read / Protected Write не меняются, endpoint access matrix/tests неприменимы. Запрет агентам push/publish/release/deploy/apply сохраняется на всех этапах. Это план, не реализация; остановка на approval обновлённых артефактов.
