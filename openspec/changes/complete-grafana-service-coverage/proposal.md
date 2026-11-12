# Proposal

## Why

По `docs/tasks/115_grafana_service_coverage.md` пользователь хочет метрики и логи всех сервисов EqSiteCMS, кроме inlove. Контейнерная память не доказывает прикладной scrape: Router обнаружил только один прикладной target backend; полнота доставки логов всех runtime не подтверждена.

## What Changes

- Закрыть прикладную наблюдаемость backend, notification-service, email-service, vk-service, seo-service, yandex-service, ya-metrica-service, frontend, site-ad, включая workers/beat/bot/scheduler/maintenance и встроенные consumers.
- Сохранить Sentry из задачи 054. Добавить HTTP rate/errors/latency, process/runtime и применимые job/queue/heartbeat метрики; безопасные структурированные stdout/stderr logs и доставку в Loki с низкой кардинальностью.
- Использовать отдельный внутренний `GET :9000/metrics`, без публикации business ingress; полная access matrix и anonymous/authenticated tests — `specs/platform-observability/spec.md`. CMS role не даёт доступа к metrics.
- Исправить service Helm wiring; отдельно подключить Redis/NATS exporters, проверить существующий PostgreSQL exporter без дублирования/смены grants. Не менять очереди, retries и persistence-семантику.
- Интегрировать настройки непосредственно в найденный source of truth `/srv/EqCMS_Infra`: `charts/monitoring/{alloy,loki,kube-prometheus-stack,postgres-exporter}`, `charts/{redis-helm,nats-helm}`. Root CMS хранит inventory/policy/runbook и tests, но не дублирует внешние values/dashboard JSON.
- Создать проектные coverage/HTTP/jobs/infrastructure/logs dashboards через существующие ConfigMap templates и Grafana sidecar. Сохранить обязательный `grafana-postgresql.values.yaml`, secret references, UID текущих объектов, retention/storage/placement. Не сбрасывать Grafana к временной SQLite.
- Включить в Redis slice удаление обнаруженного plaintext credential из chart в пользу secret references и безопасной probe. Значение не воспроизводить. Provisioning/ротация — отдельные действия владельца, никогда не следствие approval proposal.

## Capabilities

### New Capabilities

- `grafana-runtime-coverage`: проверяемое покрытие runtime метриками и логами, source ownership/discovery, инфраструктура, dashboards и release gate.

### Modified Capabilities

- `platform-observability`: прикладные метрики и безопасные логи девяти сервисов и фоновых процессов, внутренний access-контракт. Существующий Sentry контракт сохраняется.

## Impact

EqSiteCMS: service instrumentation/settings/dependencies/tests, `.helm`, Next.js production-server packaging; `deploy/observability/{runtime-inventory.yaml,telemetry-policy.yaml,README.md}`, `tests/observability/`, `docs/operations/observability.md`. EqCMS_Infra: назначенные chart/values/templates/dashboard/tests/docs paths из design/tasks; исполнитель — владелец DevOps этого отдельного контура, не CMS агент без передачи ownership. Каталог EqCMS_Infra не находится под Git: identity задаётся allowlisted file digests и версиями локальных charts; init/commit/upload не входят в задачу.

Новые business HTTP endpoints, БД/таблицы, NATS subjects/envelopes и CMS UI не нужны. Защита metrics является явным исключением Public Read, а не сменой business auth. Бизнес-метрики Яндекс.Метрики не заменяют метрики её сервиса.

Вне scope: site-ksk-inlove, moneyhelper/mcp, browser RUM/новый Sentry, создание monitoring стека, secret material, автоматическая ротация/DB grants, изменение хранения/retention, production fault injection и несвязанные delivery corrections. Shared monitoring продолжает обслуживать существующих клиентов; новые project filters не расширяют collection чужих workloads и не удаляют чужие dashboards/targets. Активные multiarch/task-monitor/SMTP changes требуют последовательного handoff по пересекающимся service paths.

**Approval gate:** PLAN-2 снял blocker неизвестного monitoring source; bounded EXT units и точные paths готовы к review и последующей реализации. Это не approval реализации и не право писать в EqCMS_Infra в текущей сессии. Deploy/apply/push, cluster mutations, secret provisioning/rotation и PG/NATS setup/teardown требуют отдельных разрешений. Live verdict возможен только после operator rollout с указанными prerequisites; наличие kubeconfig не означает permission.
