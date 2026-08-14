## 1. Протоколы и документация (Backend Agent)

- [x] 1.1 Создать `agents/howto/celery-protocols.md` — полный протокол использования Celery в микросервисах EqSiteCMS (архитектура, конфигурация, DI, задачи, очереди, best practices, структура файлов)
- [x] 1.2 Создать `agents/redis-databases.yaml` — YAML-файл учёта БД Redis: БД 0 (reserved, кэш backend), БД 1 (email-service, broker), БД 2 (email-service, backend)
- [x] 1.3 Обновить `agents/backend.md` — добавить инструкцию: при добавлении сервиса с Celery/Redis обновлять `redis-databases.yaml`
- [x] 1.4 Обновить `agents/quality_gate.md` — добавить проверку соответствия номеров БД Redis в коде и `redis-databases.yaml`

## 2. Redis в инфраструктуре (Backend Agent)

- [x] 2.1 Обновить `.docker-compose/docker-compose.infra.yml` — добавить сервис `redis` (образ `redis:7-alpine`, `--requirepass`, volume `eqsitecms_redis_data`, сеть `eqsitecms_network`)
- [x] 2.2 Обновить `.docker-compose/.env` — добавить `REDIS_PASSWORD=<значение>` и `EXPOSE_REDIS_PORT=6379`

## 3. Настройки email-service (Backend Agent)

- [x] 3.1 Обновить `services/email-service/src/settings.py` — добавить класс `CelerySettings` с полями `celery_app_main`, `celery_app_broker`, `celery_app_backend`; создать глобальный `celery_settings`
- [x] 3.2 Обновить `services/email-service/.env.example` — добавить секцию `# CELERY SETTINGS` с переменными `CELERY_APP_MAIN`, `CELERY_APP_BROKER`, `CELERY_APP_BACKEND`, `REDIS_PASSWORD`
- [x] 3.3 Обновить `services/email-service/.env` — привести настройки Celery в соответствие с форматом `.env.example`

## 4. Celery app и задачи (Backend Agent)

- [x] 4.1 Переработать `services/email-service/src/workers/celery_app.py` — полноценная конфигурация: очереди (`email`), `task_default_queue`, `task_serializer=json`, `result_serializer=json`, `accept_content=["json"]`, `task_expires=3600`, `task_acks_late=True`, `worker_prefetch_multiplier=1`
- [x] 4.2 Создать `services/email-service/src/workers/tasks/__init__.py`
- [x] 4.3 Создать `services/email-service/src/workers/tasks/email.py` — задача `send_email_task` с `@shared_task`, `autoretry_for`, `max_retries=3`, `retry_backoff=True`
- [x] 4.4 Обновить `services/email-service/src/workers/celery_app.py` — добавить `autodiscover_tasks(["workers.tasks"])`

## 5. DI-интеграция (Backend Agent)

- [x] 5.1 Обновить `services/email-service/src/containers/application.py` — добавить `celery_settings` и `celery_app` как `providers.Singleton`

## 6. Docker и запуск (Backend Agent)

- [x] 6.1 Обновить `.docker-compose/docker-compose.email.yml` — добавить сервис `celery-worker` (та же сборка, команда `celery -A workers.celery_app worker -Q email -l info`, depends_on redis)
- [x] 6.2 Обновить `services/email-service/Dockerfile` — убедиться, что `workers/` включён в сборку (не требуется — `COPY src ./src` уже включает workers)
- [x] 6.3 Обновить `.docker-compose/docker-compose.infra.yml` — убедиться, что email-service зависит от redis (не требуется — celery-worker depends_on redis в docker-compose.email.yml)

## 7. Документация (Backend Agent)

- [x] 7.1 Обновить `services/email-service/README.md` — добавить секцию "Celery" с описанием очередей, командами запуска worker, переменными окружения
- [x] 7.2 Обновить `SERVICES.md` — добавить Redis в секцию инфраструктуры, отметить email-service как Celery-consumer

## 8. Quality Gate

- [x] 8.1 Проверить Clean Architecture — зависимости в правильном направлении, бизнес-логика не в API-слое
- [x] 8.2 Проверить, что `agents/redis-databases.yaml` соответствует номерам БД в коде
- [x] 8.3 Проверить, что `.env.example` содержит все переменные Celery/Redis
- [x] 8.4 Проверить, что протокол `celery-protocols.md` содержит все обязательные секции
- [x] 8.5 Проверить, что docker-compose.redis запускается с паролем и volume
- [x] 8.6 Проверить, что celery-worker контейнер корректно настроен в docker-compose
- [x] 8.7 Проверить, что README.md email-service содержит секцию Celery
- [x] 8.8 Запустить `make lint` и `make test` в email-service
