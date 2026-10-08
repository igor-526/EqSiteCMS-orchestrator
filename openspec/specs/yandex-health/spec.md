# yandex-health Specification

## Purpose
TBD - created by archiving change yandex-service-foundation. Update Purpose after archive.
## Requirements
### Requirement: Health check endpoint

Система MUST предоставить публичный health check endpoint для проверки работоспособности сервиса.

#### Scenario: Проверка здоровья сервиса

- **WHEN** любой клиент (anonymous или authenticated) делает `GET /health`
- **THEN** система проверяет доступность базовых компонентов (БД connection pool)
- **AND** система возвращает `200 OK` с JSON: `{"status": "healthy", "timestamp": "2025-01-15T12:00:00Z"}`

#### Scenario: Сервис недоступен

- **WHEN** клиент делает `GET /health` и БД недоступна
- **THEN** система возвращает `503 Service Unavailable` с JSON: `{"status": "unhealthy", "error": "database connection failed", "timestamp": "2025-01-15T12:00:00Z"}`

