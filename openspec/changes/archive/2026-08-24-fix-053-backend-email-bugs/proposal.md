## Why

Sentry-отчёты задачи `053_bugs` фиксируют две эксплуатационные регрессии: создание лошади с уже занятым tenant-scoped slug завершается необработанным PostgreSQL `UniqueViolation`/HTTP 500, а штатное отсутствие сообщений в pull-consumer email-service периодически регистрируется как ошибка `Failed to fetch NATS messages`. Обе ситуации создают ложные аварийные сигналы и нарушают ожидаемое клиентское поведение, поэтому их нужно устранить с регрессионными проверками на реальной инфраструктуре.

## What Changes

- Для `POST /api/horses` закрепляется детерминированное получение свободного tenant-scoped slug с суффиксом при коллизии, включая ограничение длины и защиту от конкурентной коллизии; ожидаемая бизнес-коллизия не должна уходить наружу как HTTP 500.
- Для pull-consumer `commands.notification.email.send` штатный fetch-timeout закрепляется как idle-состояние без error-log/Sentry event; отмена, реальные ошибки broker и обработка сообщений сохраняют разные ветви поведения.
- Добавляются unit-регрессии и живые smoke-сценарии для обеих зон; smoke выполняется через smoke skill на реальных PostgreSQL и NATS JetStream, без pytest-файлов в `tests/smoke/`.
- API path/method и access class не меняются: затронут только существующий Protected Write `POST /api/horses`; полная access matrix фиксируется в delta spec.
- Изменение AsyncAPI topology, subject, stream, durable или payload не планируется. Если реализация обнаружит такую необходимость, требуется остановка и повторное согласование change.

## Capabilities

### New Capabilities

Новые capability не вводятся.

### Modified Capabilities

- `backend-domain-capabilities`: уточнить контракт уникального tenant-scoped slug и клиентского результата при создании лошади.
- `nats-jetstream-protocols`: уточнить контракт штатного pull-fetch timeout и observability поведения email consumer без изменения topology.

## Impact

- Сервисы: `services/backend`, `services/email-service`.
- Backend ownership: horse service/repository protocol и реализация, точечные unit/integration tests существующего `POST /api/horses`.
- Email ownership: NATS email consumer и его unit tests; `docs/asyncapi.yaml` используется как проверяемый contextFile, но меняется только при отдельно согласованном contract drift.
- Инфраструктура проверки: основной PostgreSQL (`eqsitecms-db`), PostgreSQL email-service (`eqsitecms-db-email`) и реальный NATS JetStream текущего compose-контура.
- Публичные GET, схема БД, frontend и site-consumer не изменяются.
