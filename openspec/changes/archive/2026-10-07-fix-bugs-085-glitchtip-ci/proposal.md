## Why

В production возникли критические ошибки PostgreSQL connection pool exhaustion в main backend (9 events: 5× `TooManyConnectionsError`, 4× `TimeoutError`), NATS connection refused в VK service (1 event), а также инфраструктурные проблемы в GitHub Actions CI (uv cache permission denied в backend, MSW/act warnings в frontend). Без исправления backend продолжит падать под нагрузкой, VK service теряет связь с NATS, а CI блокирует релизы.

## What Changes

- Исправить PostgreSQL connection pool exhaustion в main backend: увеличить `pool_size`, добавить `max_overflow`, настроить `pool_timeout`
- Исправить VK service NATS reconnection: добавить retry logic, graceful degradation
- Исправить GitHub Actions backend workflow: изменить uv cache path на `~/.cache/uv` вместо project-local `.cache/uv`

## Capabilities

### New Capabilities
<!-- Новые capability не требуются: исправление существующих настроек и тестов -->

### Modified Capabilities
- `database-connection-pooling`: изменяются требования к pool configuration main backend — добавляется max_overflow, pool_timeout
- `nats-resilience`: изменяются требования к NATS client в VK service — добавляется retry policy
- `ci-workflows`: изменяются требования к GitHub Actions — uv cache path

## Impact

**Затронутые сервисы:**
- `services/backend/` — SQLAlchemy AsyncEngine pool config
- `services/vk-service/` — NATS client initialization, retry logic
- `.github/workflows/backend-test-build-push.yaml` — uv cache path

**Зависимости:**
- Без изменений в production PostgreSQL (K8s configmap для новых env vars возможно)
- Без изменений в NATS deployment

**Риски:**
- Увеличение `pool_size`/`max_overflow` может увеличить нагрузку на PostgreSQL; требуется мониторинг
- NATS retry может увеличить latency VK service startup; требуется graceful degradation
