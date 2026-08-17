## ADDED Requirements

### Requirement: Celery worker readiness
Email Celery worker SHALL зависеть от healthy Redis и иметь стабильный nodename. Единственным readiness probe MUST быть адресный `celery inspect ping` для этого worker с ограниченным timeout; Quality Gate SHALL сохранять command, address, elapsed time, timeout outcome и Redis/worker logs.

#### Scenario: Worker готов
- **WHEN** Redis healthy и адресный inspect ping получает pong до timeout
- **THEN** worker считается ready

#### Scenario: Ping timeout или Redis unhealthy
- **WHEN** Redis unhealthy либо адресный ping не отвечает вовремя
- **THEN** readiness FAIL независимо от queue registration или других сигналов

#### Scenario: Queue/canary не подменяет readiness
- **WHEN** queue зарегистрирована или canary task выполнена
- **THEN** это не является обязательным readiness criterion и не заменяет адресный ping

### Requirement: Real Celery integration gate
Отдельный blocking integration suite SHALL на реальном Redis/Celery проверять enqueue→worker execution→result, retry/backoff/acks-late после временной ошибки, duplicate-event idempotency, восстановление после worker restart и безопасный DB session lifecycle при конкурентной обработке. Эти tests MUST NOT запускаться как readiness canary.

#### Scenario: Delivery и retry
- **WHEN** task поставлена в очередь и первая попытка получает временную ошибку
- **THEN** evidence подтверждает retry/backoff, единственный итоговый side effect и корректное result state

#### Scenario: Worker restart
- **WHEN** worker перезапускается во время pending/in-flight work
- **THEN** задача восстанавливается по acks-late contract без двойной отправки

#### Scenario: Concurrent session lifecycle
- **WHEN** несколько email tasks обрабатываются одновременно
- **THEN** repositories/sessions не разделяют небезопасное mutable transaction state
