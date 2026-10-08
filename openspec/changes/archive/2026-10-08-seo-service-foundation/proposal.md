## Why

EqSiteCMS расширяется инфраструктурой для SEO-анализа и мониторинга метрик сайтов. Требуется центральный сервис-оркестратор, который будет ставить задачи парсерам метрик (Яндекс.Метрика, Google Analytics) и хранить расписание парсингов. Общие сущности (поисковые запросы, пути страниц) будут храниться в seo-service, но их детальная схема и архитектура получения результатов парсинга будут проработаны в отдельной задаче.

## What Changes

- Новый микросервис **seo-service** на базе `fastapi-template`
- Интеграция с NATS JetStream для постановки задач парсерам (только stream `SEO_TASKS`)
- Интеграция с Celery для планирования задач парсинга (только задача `schedule_parsing`)
- Расширение `docker-compose.yml` для поддержки новых зависимостей (PostgreSQL для seo-service, NATS stream `SEO_TASKS`)
- Расширение корневого `Makefile` командами управления seo-service
- Инициализация Git-репозитория `git@github.com:igor-526/EqSiteCMS-seo-service.git` с initial commit в `main` и `release`
- Документация архитектуры SEO-модуля в `docs/seo/`
- Расширение агентной архитектуры (`AGENTS.md`, `agents/`) для работы с SEO-сервисом

## Capabilities

### New Capabilities

- `seo-service-foundation`: Базовая инфраструктура SEO-сервиса — создание сервиса из шаблона, Docker-окружение, Git-репозиторий, документация
- `seo-nats-integration`: Интеграция с NATS JetStream для постановки задач парсерам (stream `SEO_TASKS`)
- `seo-celery-integration`: Интеграция с Celery для планирования задач парсинга (задача `schedule_parsing`)
- `seo-documentation`: Документация архитектуры SEO-модуля и агентные правила работы с ним

### Modified Capabilities

- `build-system`: Расширение корневого `Makefile` и `services.manifest` для поддержки seo-service

## Impact

- **Новый сервис**: `services/seo-service/` с собственной БД PostgreSQL
- **Docker-инфраструктура**: `docker-compose.yml` получает дополнительные контейнеры и зависимости
- **Build-система**: корневой `Makefile` расширяется командами для seo-service
- **Агентная архитектура**: `AGENTS.md` и профильные агенты получают правила работы с SEO-сервисом
- **Документация**: новый раздел `docs/seo/` для архитектурной документации SEO-модуля
- **Внешний репозиторий**: создаётся новый GitHub-репозиторий `EqSiteCMS-seo-service`
