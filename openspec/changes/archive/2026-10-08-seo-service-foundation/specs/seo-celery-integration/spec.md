## ADDED Requirements

### Requirement: Конфигурация Celery с Redis backend
Система SHALL интегрировать Celery для планирования и выполнения распределённых задач с Redis как broker и result backend.

#### Scenario: Инициализация Celery app
- **WHEN** seo-service стартует
- **THEN** создаётся Celery app с connection string `redis://redis:6379/0`
- **THEN** Celery использует Redis для broker и result backend
- **THEN** worker регистрируется и готов принимать задачи

#### Scenario: Celery worker в docker-compose
- **WHEN** выполняется `docker-compose up`
- **THEN** поднимается отдельный контейнер `seo-celery-worker`
- **THEN** worker использует тот же код seo-service
- **THEN** worker зависит от `redis` и `seo-service`

### Requirement: Периодическая задача schedule_parsing
Система SHALL запускать периодическую задачу `schedule_parsing` для проверки расписания парсингов.

#### Scenario: Cron-like scheduling
- **WHEN** настроен Celery Beat
- **THEN** задача `schedule_parsing` выполняется каждые N минут (например, каждые 5 минут)
- **THEN** задача читает `parsing_schedules` из БД
- **THEN** для активных расписаний ставятся задачи парсерам в NATS

#### Scenario: Публикация задачи в NATS из Celery
- **WHEN** `schedule_parsing` находит активное расписание
- **THEN** создаётся NATS message с параметрами парсинга
- **THEN** message публикуется в `seo.tasks.<parser_type>` (например, `seo.tasks.yandex_metrics`)
- **THEN** задача публикуется без ожидания результата (fire-and-forget в рамках NATS)

### Requirement: Обработка результатов откладывается
Система SHALL НЕ реализовывать обработку результатов парсинга на данном этапе.

#### Scenario: Задача aggregate_metrics не создаётся
- **WHEN** рассматривается архитектура обработки результатов
- **THEN** задача `aggregate_metrics` НЕ создаётся на данном этапе
- **THEN** результаты парсинга остаются в сервисах-парсерах
- **THEN** архитектура получения и обработки результатов будет проработана в отдельной задаче

### Requirement: Celery Beat для периодических задач
Система SHALL запускать Celery Beat для управления cron-like задачами.

#### Scenario: Celery Beat контейнер
- **WHEN** выполняется `docker-compose up`
- **THEN** поднимается контейнер `seo-celery-beat`
- **THEN** Beat использует Redis для хранения расписания
- **THEN** Beat запускает задачи согласно настроенному расписанию

#### Scenario: Конфигурация расписания
- **WHEN** настраивается Celery Beat schedule
- **THEN** расписание определено в `app/celery_config.py`
- **THEN** можно изменить частоту задач через переменные окружения

### Requirement: Retry и error handling в Celery задачах
Система SHALL обеспечить retry логику и обработку ошибок в Celery задачах.

#### Scenario: Retry при временной ошибке
- **WHEN** Celery задача падает с временной ошибкой (например, timeout NATS)
- **THEN** задача автоматически повторяется до 3 раз с exponential backoff
- **THEN** после 3 неудачных попыток задача помечается как failed

#### Scenario: Логирование ошибок
- **WHEN** Celery задача падает
- **THEN** логируется событие с `task_id`, `error`, `traceback`
- **THEN** log level `ERROR`

### Requirement: Мониторинг Celery задач
Система SHALL поддерживать мониторинг состояния Celery задач.

#### Scenario: Flower для мониторинга
- **WHEN** требуется мониторинг Celery
- **THEN** можно поднять Flower через `docker-compose` (опционально)
- **THEN** Flower доступен на порту 5555
- **THEN** показывает активные задачи, workers, статистику

#### Scenario: Health check для Celery worker
- **WHEN** выполняется проверка здоровья worker
- **THEN** можно выполнить `celery inspect ping` для проверки доступности
- **THEN** worker отвечает `pong`
