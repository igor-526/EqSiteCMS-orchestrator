# nats-resilience Specification

## Purpose
TBD - created by archiving change fix-bugs-085-glitchtip-ci. Update Purpose after archive.
## Requirements
### Requirement: NATS client connection resilience

VK service SHALL подключаться к NATS со следующими resilience parameters:
- `allow_reconnect=True`
- `max_reconnect_attempts=10`
- `reconnect_time_wait=2` (seconds between attempts)

#### Scenario: Transient NATS connection failure автоматически retry

- **WHEN** NATS server временно недоступен (ConnectionRefusedError)
- **THEN** NATS client выполняет до 10 reconnect attempts с 2s интервалом

#### Scenario: NATS reconnect успешный после transient failure

- **WHEN** NATS server становится доступным после 3 failed attempts
- **THEN** NATS client успешно подключается на 4th attempt

#### Scenario: NATS exhausted retries → graceful degradation

- **WHEN** все 10 reconnect attempts исчерпаны без успеха
- **THEN** VK service стартует в degraded mode и логирует error (не crash loop)

### Requirement: NATS connection error handling не блокирует service startup

VK service SHALL стартовать даже если NATS connection не удалось установить.

#### Scenario: Service startup успешный при NATS downtime

- **WHEN** NATS server недоступен при VK service startup
- **THEN** VK service стартует в degraded mode, Kubernetes liveness probe проходит

#### Scenario: NATS reconnect в background не прерывает service

- **WHEN** NATS client выполняет reconnect attempts в background
- **THEN** VK service продолжает обслуживать HTTP requests (если они не зависят от NATS)

