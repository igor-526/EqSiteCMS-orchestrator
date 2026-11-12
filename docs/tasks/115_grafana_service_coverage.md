# Метрики и логи сервисов EqSiteCMS в Grafana

## Исходный запрос

«Сайт inlove и не нужен. Я хочу, чтобы у меня были метрики со всех сервисов. И логи».

## Уточнённые границы Router

Только proposal до отдельного approval. Охват: backend, notification-service, email-service, vk-service, seo-service, yandex-service, ya-metrica-service, frontend, site-ad; их workers/beat, VK bot, SEO scheduler/maintenance и прочие фактические runtime-процессы. Redis/NATS/PostgreSQL рассматриваются как инфраструктурный слой. site-ksk-inlove, moneyhelper/mcp исключены.

Учесть `docs/tasks/054_observability.md` и действующие observability specs, не переписывая их. Нужны инвентаризация, низкокардинальные labels, безопасные логи, HTTP/error/latency и job/queue metrics, dashboards, live coverage с различением контейнерных и прикладных метрик. Metrics endpoints только внутренние. Не предполагать kubeconfig и право записи; не применять настройки и не деплоить.

## Диагностика, переданная Router (не повторно подтверждённая Planner)

Prometheus datasource `prometheus` (default): среди прикладных targets сейчас и за 24 часа только `eqcms-backend-service`, up=1, 552 ряда включая HTTP/python/process. Контейнерная память видна у всех перечисленных runtime; это не доказательство прикладного scrape. PostgreSQL exporter и Kubernetes monitoring уже собираются, targets Redis/NATS отсутствуют. Loki UID `P8E80F9AEF21F6940`: labels `cluster, component, container, instance, job, namespace, pod, service_name`; фактическое покрытие логов ещё не подтверждено. Есть dashboards FastAPI Observability, Kubernetes, PostgreSQL, Logs.

## Результат планирования

OpenSpec change `complete-grafana-service-coverage`. Evidence только `.qa/complete-grafana-service-coverage/`; будущий единственный отчёт QG — `docs/reports/complete-grafana-service-coverage.md`.

## Уточнение PLAN-2

Пользователь указал, что monitoring source находится в соседней папке `/srv`. Router подтвердил `/srv/EqCMS_Infra`: его правила/документация/charts исследованы точечно read-only; `secrets/`, env и kubeconfig не читаются. Monitoring source — `charts/monitoring/{alloy,loki,kube-prometheus-stack,postgres-exporter}`, Redis/NATS — `charts/{redis-helm,nats-helm}`. Это уточнение прежнего blocker, не approval реализации.

В существующем change уточнены единые source ownership, DevOps EXT units и обязательное сохранение Grafana PostgreSQL overlay. Infra directory без Git metadata: никаких init/commit; reproducible identity — allowlisted source digests/chart versions. Root CMS не создаёт дубликатов infra values/dashboard JSON.

В Redis chart обнаружен plaintext credential; значение в план/документацию/evidence не переносится. EXT-REDIS предусматривает Secret references вместо literals; решение об отзыве/ротации/provisioning — отдельное действие владельца, без автоматического применения. Это отдельный runtime prerequisite, а не разрешение работать с секретами.

Предложение готово к approval для всего scope. Реализация, config changes и deploy/apply не начаты. Future live coverage остаётся planned/blocked до operator rollout, безопасных test origins и необходимых разрешений.
