## Purpose

Определяет требования для capability seo-service-foundation в рамках инфраструктуры SEO-модуля EqSiteCMS.

## Requirements

### Requirement: Создание сервиса из fastapi-template
Система SHALL создать новый микросервис `seo-service` на основе существующего `fastapi-template` с сохранением Clean Architecture и базовой структуры.

#### Scenario: Копирование шаблона
- **WHEN** выполняется создание сервиса
- **THEN** директория `services/seo-service/` создаётся с полной структурой из `fastapi-template`
- **THEN** сохраняются папки `app/`, `tests/`, `alembic/`, `Dockerfile`, `requirements.txt`

#### Scenario: Адаптация конфигурации
- **WHEN** шаблон скопирован
- **THEN** настройки БД указывают на `seo_service` database
- **THEN** `pyproject.toml` содержит имя проекта `seo-service`
- **THEN** `README.md` описывает назначение SEO-сервиса

### Requirement: Конфигурация PostgreSQL для seo-service
Система SHALL создать выделенную БД `seo_service` в существующем PostgreSQL-контейнере.

#### Scenario: Создание БД через миграции
- **WHEN** применяются миграции Alembic
- **THEN** создаётся БД `seo_service`
- **THEN** применяется initial migration с базовой структурой

#### Scenario: Connection string
- **WHEN** сервис подключается к БД
- **THEN** используется connection string вида `postgresql://user:password@postgres:5432/seo_service`

### Requirement: Docker-контейнер для seo-service
Система SHALL добавить `seo-service` в `docker-compose.yml` с зависимостями от PostgreSQL, NATS и Redis.

#### Scenario: Добавление сервиса в docker-compose
- **WHEN** выполняется `docker-compose up`
- **THEN** поднимается контейнер `seo-service`
- **THEN** контейнер зависит от `postgres`, `nats`, `redis`
- **THEN** сервис доступен на порту (например, 8003)

#### Scenario: Health check
- **WHEN** контейнер запущен
- **THEN** endpoint `GET /health` возвращает `200 OK` с информацией о статусе сервиса

### Requirement: Базовые модели данных
Система SHALL создать базовую SQLAlchemy модель для расписания парсингов.

#### Scenario: Модель ParsingSchedule
- **WHEN** создаётся модель `ParsingSchedule`
- **THEN** модель содержит поля `id`, `site_id`, `parser_type`, `cron_expression`, `is_active`, `created_at`, `updated_at`
- **THEN** модель связана с таблицей `parsing_schedules`
- **THEN** модель поддерживает валидацию `cron_expression`

#### Scenario: Общие сущности откладываются
- **WHEN** рассматриваются модели `SearchQuery` и `SitePath`
- **THEN** они НЕ создаются на этом этапе
- **THEN** их схема будет спроектирована в отдельной задаче

### Requirement: Alembic миграции
Система SHALL создать initial migration для базовой схемы БД.

#### Scenario: Initial migration
- **WHEN** выполняется `alembic upgrade head`
- **THEN** создаётся таблица `parsing_schedules`
- **THEN** применяются indexes и constraints для `parsing_schedules`

#### Scenario: Rollback capability
- **WHEN** выполняется `alembic downgrade -1`
- **THEN** миграция корректно откатывается
- **THEN** таблица `parsing_schedules` удаляется

### Requirement: Базовая структура API
Система SHALL предоставить базовую структуру FastAPI с health endpoint.

#### Scenario: Health endpoint
- **WHEN** выполняется запрос `GET /health`
- **THEN** возвращается статус `200 OK`
- **THEN** response содержит `{"status": "healthy", "service": "seo-service"}`

#### Scenario: API documentation
- **WHEN** сервис запущен
- **THEN** доступна автогенерированная документация на `/docs`
- **THEN** доступна ReDoc на `/redoc`
