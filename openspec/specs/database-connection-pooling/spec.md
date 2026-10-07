# database-connection-pooling Specification

## Purpose
TBD - created by archiving change fix-bugs-085-glitchtip-ci. Update Purpose after archive.
## Requirements
### Requirement: PostgreSQL connection pool configuration

Backend main service (services/backend) SHALL настраивать SQLAlchemy AsyncEngine со следующими pool parameters:
- `pool_size=20` (baseline connections)
- `max_overflow=10` (burst capacity)
- `pool_timeout=30` (max wait seconds)
- `pool_pre_ping=True` (validate connection before checkout)
- `pool_recycle=3600` (force-close connections older than 1 hour)

#### Scenario: Concurrent requests не вызывают TooManyConnectionsError

- **WHEN** FastAPI workers обрабатывают до 30 concurrent requests
- **THEN** SQLAlchemy pool предоставляет connections без `TooManyConnectionsError` или `TimeoutError`

#### Scenario: Stale connections автоматически обнаруживаются

- **WHEN** PostgreSQL connection становится stale (network blip, server restart)
- **THEN** `pool_pre_ping=True` обнаруживает stale connection перед использованием и создает новое

#### Scenario: Long-lived connections recycle через 1 час

- **WHEN** connection существует больше 3600 секунд
- **THEN** pool force-close и создает новое connection при следующем checkout

### Requirement: Pool configuration через environment variables

Backend SHALL принимать pool configuration через environment variables:
- `DB_POOL_SIZE` (default: 20)
- `DB_MAX_OVERFLOW` (default: 10)
- `DB_POOL_TIMEOUT` (default: 30)
- `DB_POOL_RECYCLE` (default: 3600)

#### Scenario: Custom pool size через env var

- **WHEN** `DB_POOL_SIZE=50` установлено в environment
- **THEN** SQLAlchemy AsyncEngine использует `pool_size=50`

#### Scenario: Дефолтные значения без env vars

- **WHEN** ни один `DB_POOL_*` env var не установлен
- **THEN** pool использует дефолтные значения (20, 10, 30, 3600)

