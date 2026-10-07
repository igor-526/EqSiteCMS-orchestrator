## Context

**Текущее состояние:**
- Main backend использует SQLAlchemy AsyncEngine с дефолтным `pool_size=5`, без `max_overflow` и `pool_timeout`
- VK service подключается к NATS без retry logic при `ConnectionRefusedError`
- GitHub Actions backend workflow использует project-local uv cache `.cache/uv`, к которому нет write permissions в CI
- Frontend tests генерируют MSW warnings для unhandled requests и React act() warnings в PhotoSelectorModal

**Glitchtip evidence:**
- Main backend: 9 events (5× `TooManyConnectionsError: sorry, too many clients already` / `remaining connection slots reserved for SUPERUSER`, 4× `TimeoutError` в `_connection_for_bind`)
- VK service: 1 event `ConnectionRefusedError: [Errno 111] Connection refused` при `nats.aio.client._select_next_server`

**Constraints:**
- Не можем изменять PostgreSQL `max_connections` на production без ops approval
- NATS deployment стабильный; проблема в client resilience
- GitHub Actions не имеет permissions писать в `/home/igor/projects/eqSiteCMS/.cache/uv`

**Ownership:**
- **Backend ownership:** `services/backend/**` — pool config, health endpoint
- **VK Service ownership:** `services/vk-service/**` — NATS client
- **Frontend ownership:** `services/frontend/**` — MSW setup, tests
- **CI ownership:** `.github/workflows/**` — backend/frontend workflows

## Goals / Non-Goals

**Goals:**
- Устранить PostgreSQL connection pool exhaustion в main backend через правильную pool configuration
- Добавить NATS client resilience в VK service
- Исправить GitHub Actions backend workflow для успешных test builds

**Non-Goals:**
- Масштабирование PostgreSQL infrastructure (остается ops responsibility)
- Оптимизация NATS throughput (не является причиной connection refused)
- Добавление monitoring endpoints и алертов (ограничиваемся существующими warnings)
- Исправление frontend test warnings (не критично для production)

## Decisions

### D1: PostgreSQL Pool Configuration Strategy

**Решение:** Увеличить `pool_size=20`, добавить `max_overflow=10`, `pool_timeout=30`, `pool_pre_ping=True`, `pool_recycle=3600`.

**Альтернативы:**
- A1: Оставить `pool_size=5`, добавить только `max_overflow` → не решает baseline exhaustion с 5 TooManyConnectionsError
- A2: Перейти на connection pooler (PgBouncer) → overkill для текущей нагрузки, добавляет operational complexity

**Rationale:**
- `pool_size=20` baseline покрывает concurrent FastAPI workers (предположительно 4 workers × 5 concurrent requests)
- `max_overflow=10` дает burst capacity
- `pool_timeout=30` позволяет ждать connection до 30s вместо immediate fail
- `pool_pre_ping=True` предотвращает stale connections
- `pool_recycle=3600` force-closes connections старше 1h

### D2: VK Service NATS Resilience

**Решение:** Добавить `max_reconnect_attempts=10`, `reconnect_time_wait=2`, `allow_reconnect=True` в nats.connect, обернуть в try/except с graceful degradation.

**Альтернативы:**
- A1: Infinite retry without degradation → service hang при NATS downtime
- A2: Fail-fast without retry → каждый transient network blip вызывает pod restart

**Rationale:**
- 10 attempts × 2s = 20s retry window покрывает transient issues
- Graceful degradation позволяет VK service стартовать вместо crash loop

### D3: GitHub Actions uv Cache Path

**Решение:** Изменить `UV_CACHE_DIR` на `$HOME/.cache/uv` вместо project-local `.cache/uv`.

**Альтернативы:**
- A1: `chmod` на `.cache/uv` → не работает, потому что `.cache/uv` монтируется с host /home/igor
- A2: `actions/cache@v4` с custom path → дополнительная сложность, не решает permission issue

**Rationale:**
- `$HOME/.cache/uv` в GitHub Actions resolve до `/home/runner/.cache/uv`, где есть write permissions
- Консистентно с npm cache стратегией

## Risks / Trade-offs

### R1: Увеличение Pool Size

**Риск:** `pool_size=20` + `max_overflow=10` = 30 max connections per backend pod может превысить PostgreSQL `max_connections` при горизонтальном масштабировании.

**Mitigation:**
- Мониторить `/health/db-pool` metrics
- Если `max_connections` exhaustion возникнет снова — координировать с ops для увеличения `max_connections` или добавления PgBouncer

### R2: NATS Retry Latency

**Риск:** 20s retry window увеличивает VK service startup latency.

**Mitigation:**
- Kubernetes liveness probe delay позволяет 30s startup
- Graceful degradation позволяет service работать при NATS downtime

### R3: CI Cache Invalidation

**Риск:** Изменение `UV_CACHE_DIR` сбросит существующий GitHub Actions cache.

**Mitigation:**
- Первый run после изменения будет медленнее; следующие runs используют новый cache path

## Migration Plan

**Deployment порядок:**
1. Backend pool config (env vars через ConfigMap)
2. VK service NATS retry (code deploy)
3. GitHub Actions workflows (immediate effect)

**Rollback:**
- Backend: revert env vars до дефолтных значений
- VK service: revert NATS client code
- GitHub Actions: revert `UV_CACHE_DIR`

**Quality Gate lanes:**
- `QG-ENV`: Docker stack ready, rebuild backend/vk-service
- `QG-BE`: backend unit tests, VK service tests, pool config validation
- `QG-CONTRACTS`: не применяется (не изменяются API requirements)
- `QG-LIVE`: smoke test backend/vk-service health
- `QG-SYNTH`: final verdict

## Open Questions

Нет открытых вопросов.
