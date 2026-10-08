## 1. Создание базовой структуры seo-service

- [x] 1.1 Скопировать fastapi-template в services/seo-service/
- [x] 1.2 Адаптировать pyproject.toml (имя проекта, версия, зависимости)
- [x] 1.3 Создать README.md с описанием назначения seo-service
- [x] 1.4 Обновить .env.example с настройками для seo-service (DB, NATS, Redis)

## 2. Конфигурация PostgreSQL и миграции

- [x] 2.1 Создать модель ParsingSchedule в app/models/ (единственная модель на данном этапе)
- [x] 2.2 Сгенерировать initial migration через alembic для parsing_schedules
- [x] 2.3 Проверить миграцию (upgrade и downgrade)

## 3. Docker-инфраструктура

- [x] 3.1 Добавить seo-service в docker-compose.yml (основной контейнер)
- [x] 3.2 Добавить seo-celery-worker в docker-compose.yml
- [x] 3.3 Добавить seo-celery-beat в docker-compose.yml
- [x] 3.4 Настроить зависимости контейнеров (postgres, nats, redis)
- [x] 3.5 Настроить health checks для seo-service
- [x] 3.6 Настроить порты и networks

## 4. NATS JetStream интеграция

- [x] 4.1 Создать init-скрипт для создания NATS stream SEO_TASKS (только постановка задач)
- [x] 4.2 Добавить nats-init контейнер в docker-compose.yml
- [x] 4.3 Создать NATS client wrapper в app/infrastructure/nats/
- [x] 4.4 Реализовать publisher для задач парсинга (publish_task с subject seo.tasks.*)
- [x] 4.5 Добавить structured logging для NATS events с trace_id
- [x] 4.6 Реализовать graceful shutdown для NATS connection

## 5. Celery интеграция

- [x] 5.1 Создать app/celery_app.py с конфигурацией Celery
- [x] 5.2 Создать задачу schedule_parsing для периодической проверки расписания
- [x] 5.3 Настроить Celery Beat schedule в celery_config.py
- [x] 5.4 Добавить retry логику с exponential backoff в schedule_parsing
- [x] 5.5 Добавить structured logging для Celery tasks
- [x] 5.6 Настроить Docker entrypoints для worker и beat

## 6. Базовое API

- [x] 6.1 Создать health endpoint GET /health
- [x] 6.2 Настроить FastAPI app с автогенерацией документации (/docs, /redoc)
- [ ] 6.3 Добавить CORS middleware (если требуется)
- [x] 6.4 Настроить structured logging для HTTP requests

## 7. Build-система

- [x] 7.1 Добавить команды в корневой Makefile (build-seo-service, test-seo-service, migrate-seo-service)
- [x] 7.2 Обновить services.manifest с записью для seo-service
- [ ] 7.3 Интегрировать seo-service в команды build-all и test-all

## 8. Git-репозиторий

- [x] 8.1 Инициализировать Git в services/seo-service/
- [x] 8.2 Добавить .gitignore для Python проекта
- [x] 8.3 Создать initial commit с базовой структурой
- [x] 8.4 Добавить remote origin (git@github.com:igor-526/EqSiteCMS-seo-service.git)
- [x] 8.5 Создать и запушить ветку main
- [x] 8.6 Создать и запушить ветку release

## 9. Документация SEO-модуля

- [x] 9.1 Создать docs/seo/architecture.md с описанием архитектуры
- [x] 9.2 Создать docs/seo/services.md с описанием seo-service и будущих парсеров
- [x] 9.3 Создать docs/seo/protocols.md с контрактами NATS и Celery
- [x] 9.4 Добавить примеры NATS message payloads в protocols.md
- [x] 9.5 Добавить диаграмму взаимодействия сервисов в architecture.md

## 10. Расширение агентной архитектуры

- [x] 10.1 Добавить секцию "SEO Services" в AGENTS.md
- [x] 10.2 Обновить правила Backend-агента для работы с docs/seo/
- [x] 10.3 Обновить правила Quality Gate для проверки NATS/Celery протоколов

## 11. Тестирование инфраструктуры

- [x] 11.1 Создать smoke-тест публикации NATS message (только постановка задачи)
- [x] 11.2 Создать smoke-тест выполнения Celery задачи schedule_parsing
- [x] 11.3 Создать интеграционный тест для health endpoint
- [ ] 11.4 Запустить stackctl doctor для проверки health всех сервисов

## 12. Финальная верификация

- [ ] 12.1 Выполнить docker-compose up и проверить запуск всех контейнеров
- [ ] 12.2 Проверить применение миграций БД
- [ ] 12.3 Проверить создание NATS stream SEO_TASKS (nats stream list)
- [ ] 12.4 Проверить доступность health endpoint
- [ ] 12.5 Запустить make test-seo-service
- [ ] 12.6 Проверить logs сервиса на отсутствие критичных ошибок
