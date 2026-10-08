# Yandex Service Health Check

Health check endpoint для мониторинга работоспособности yandex-service.

## ADDED Requirements

### Requirement: Health check endpoint

Система MUST предоставить публичный health check endpoint для проверки работоспособности сервиса.

#### Scenario: Проверка здоровья сервиса

- **WHEN** любой клиент (anonymous или authenticated) делает `GET /health`
- **THEN** система проверяет доступность базовых компонентов (БД connection pool)
- **AND** система возвращает `200 OK` с JSON: `{"status": "healthy", "timestamp": "2025-01-15T12:00:00Z"}`

#### Scenario: Сервис недоступен

- **WHEN** клиент делает `GET /health` и БД недоступна
- **THEN** система возвращает `503 Service Unavailable` с JSON: `{"status": "unhealthy", "error": "database connection failed", "timestamp": "2025-01-15T12:00:00Z"}`

## API Endpoints

### GET /health

**Access:** Public Read (доступен без авторизации)

**Request:** None

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T12:00:00Z"
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "error": "database connection failed",
  "timestamp": "2025-01-15T12:00:00Z"
}
```

## Access Control Matrix

| Method | Path     | Access Class | Roles | Expected without auth | Expected with auth |
|--------|----------|--------------|-------|----------------------|-------------------|
| GET    | /health  | Public Read  | -     | 200 OK / 503         | 200 OK / 503      |

**Rationale:** Health check endpoint должен быть доступен без авторизации для мониторинга инфраструктуры (Kubernetes liveness/readiness probes, external monitoring).

## Tests

### Anonymous Access Tests

- **Test:** Anonymous GET /health → 200 OK (если сервис здоров)
- **Test:** Anonymous GET /health → 503 (если БД недоступна)

### Authenticated Access Tests

- **Test:** Authenticated GET /health → 200 OK (если сервис здоров)
- **Test:** Authenticated GET /health → 503 (если БД недоступна)
