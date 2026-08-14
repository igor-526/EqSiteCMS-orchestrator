## Context

EqSiteCMS — микросервисная платформа с событийно-ориентированной архитектурой. Основной обмен сообщениями между сервисами реализован через NATS Jetstream (протокол зафиксирован в `agents/howto/nats-jetstream-protocols.md`).

**Текущее состояние:**
- `email-service` принимает команды по NATS (`commands.notification.email.send`) и напрямую обрабатывает их в `NotificationCommandSendEmailService.process()`.
- Создан черновой `workers/celery_app.py` с минимальной конфигурацией Celery (очередь `email`, broker/backend на Redis).
- В `settings.py` email-service уже есть `CeleryAppSettings` с полями `CELERY_APP_MAIN`, `CELERY_APP_BROKER`, `CELERY_APP_BACKEND`.
- В `.env` email-service прописаны настройки Celery, но они **не продублированы** в `.env.example`.
- Redis **не поднят** в инфраструктурном docker compose.
- Нет протокола использования Celery, нет документации, нет учёта БД Redis.

**Ограничения:**
- Clean Architecture: зависимость `api → core → infrastructure`, бизнес-логика не в API-слое.
- Celery используется для отложенных/очерёдных задач (email, фоновые операции) — это самостоятельная система, не связанная с NATS-pipeline.
- Redis используется как broker и backend Celery; каждому сервису выделяются 2 БД (очередь + результаты).
- Нумерация БД Redis начинается с 1; БД 0 зарезервирована под кэш backend (пока не используется).

## Goals / Non-Goals

**Goals:**
- Зафиксировать архитектурный протокол Celery для микросервисов EqSiteCMS (по аналогии с NATS-протоколом).
- Поднять Redis в инфраструктурном docker compose с паролевым доступом.
- Создать YAML-файл учёта БД Redis (`agents/redis-databases.yaml`).
- Интегрировать Celery в `email-service`: DI-контейнер, очереди, задачи отправки email.
- Перенести настройки Celery/Redis из `.env` в `.env.example`.
- Обновить README.md email-service с секцией Celery.
- Обновить Dockerfile и docker-compose для запуска celery-worker.

**Non-Goals:**
- Реализация Celery Beat (periodic tasks) — будет в отдельной задаче при необходимости.
- Использование Redis для кэширования backend (БД 0 зарезервирована, но не активируется).
- Изменение NATS-pipeline — NATS и Celery работают как параллельные независимые системы.
- Добавление Flower (мониторинг Celery) — отдельная задача.
- Изменение notification-service — он остаётся NATS-only.

## Decisions

### 1. Redis как единственный брокер Celery

**Решение:** Использовать Redis (не RabbitMQ, не Amazon SQS) как broker и backend.

**Обоснование:**
- Уже используется в `.env` email-service.
- Простота инфраструктуры: один контейнер Redis в docker compose.
- Для масштаба EqSiteCMS Redis достаточен; миграция на RabbitMQ возможна позже через изменение `CELERY_APP_BROKER`.
- Celery имеет нативную поддержку Redis из коробки.

**Альтернативы:**
- RabbitMQ: избыточна для текущего объёма, дополнительный контейнер, сложнее операционно.

### 2. Две БД Redis на сервис

**Решение:** Каждый сервис, использующий Celery, получает 2 БД Redis: одна для broker (очередь), другая для backend (результаты). Нумерация с 1; БД 0 зарезервирована.

**Обоснование:**
- Изоляция данных: результаты задач не смешиваются с очередями.
- Возможность независимой очистки (FLUSHDB на одной БД).
- Учёт в `agents/redis-databases.yaml` предотвращает конфликты нумерации.

**Распределение для email-service:**
- БД 1 — broker (очередь задач)
- БД 2 — backend (результаты задач)

### 3. Отдельный `CelerySettings` класс в settings.py

**Решение:** Вынести настройки Celery в отдельный Pydantic-класс `CelerySettings` (по аналогии с `NatsSettings`), а не добавлять поля в `Settings`.

**Обоснование:**
- Единообразие с NATS-протоколом.
- Изоляция конфигурации: Celery не зависит от PostgreSQL/Sentry.
- DI-контейнер может инжектить `CelerySettings` отдельно.

### 4. DI-интеграция через dependency-injector

**Решение:** Зарегистрировать `celery_app` как `providers.Singleton` в `ApplicationContainer`.

**Обоснование:**
- Единообразие с NATS-клиентом.
- Тестируемость: можно замockать Celery app в unit-тестах.
- Единая точка управления lifecycle.

### 5. Задачи Celery в `src/workers/tasks/`

**Решение:** Определить задачи Celery в `src/workers/tasks/` с отдельным файлом на домен (email, notification и т.д.).

**Структура:**
```
src/workers/
├── __init__.py
├── celery_app.py          # Celery app instance
└── tasks/
    ├── __init__.py
    └── email.py           # @shared_task для отправки email
```

**Обоснование:**
- SOLID: каждый модуль — одна ответственность.
- Расширяемость: новые задачи добавляются новыми файлами.
- Явная регистрация в `celery_app.autodiscover_tasks()`.

## Risks / Trade-offs

| Риск | Митигация |
|------|-----------|
| Redis — single point of failure для очереди | Для dev/staging достаточно; production — Redis Sentinel/Cluster (отдельная задача) |
| Сложность отладки двух систем (NATS + Celery) | Единый request-id/trace-id через метаданные задач; structured logging |
| БД 0 зарезервирована, но не используется | Задокументировано в redis-databases.yaml; активация при необходимости кэширования |

## Ownership и порядок реализации

| Этап | Владелец | Зона | Deliverable |
|------|----------|------|-------------|
| 1 | Backend Agent | `agents/howto/celery-protocols.md`, `agents/redis-databases.yaml` | Протокол и YAML-файл |
| 2 | Backend Agent | `.docker-compose/docker-compose.infra.yml`, `.docker-compose/.env` | Redis в инфраструктуре |
| 3 | Backend Agent | `services/email-service/settings.py`, `.env.example` | Настройки Celery |
| 4 | Backend Agent | `services/email-service/src/workers/` | Celery app + tasks |
| 5 | Backend Agent | `services/email-service/src/containers/application.py` | DI-интеграция |
| 6 | Backend Agent | `Dockerfile`, `docker-compose.email.yml` | Worker-контейнер |
| 7 | Backend Agent | `README.md` | Документация |
| 8 | Quality Gate Agent | Весь diff | Общая проверка |

## Open Questions

1. **Task naming convention**: Использовать `<service>.<domain>.<action>` (например, `email-service.email.send`) или `<domain>.<action>` (например, `email.send`)? Рекомендация: второй вариант, т.к. имя сервиса уже в `celery_app_main`.
2. **Expiration задач**: Нужен ли TTL на задачи в Redis? Рекомендация: `task_expires=3600` (1 час) по умолчанию.
