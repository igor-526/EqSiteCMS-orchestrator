## MODIFIED Requirements

### Requirement: Защита чувствительных данных
Все observability adapters MUST соблюдать описанный в сценариях контракт исключения чувствительных данных, допустимости public browser DSN и запрета публикации секретов. Логи и evidence MUST ограничиваться минимально необходимой диагностикой.

#### Scenario: Ошибка авторизованного CMS-запроса
- **WHEN** Sentry фиксирует ошибку запроса с auth cookie или authorization header
- **THEN** событие не содержит значение credential и не раскрывает request body

#### Scenario: Проверка собранного frontend bundle
- **WHEN** Quality Gate сканирует bundle и image metadata
- **THEN** intended public browser DSN допускается как endpoint identifier, а auth token, credential-bearing/private DSN и иные секретные значения отсутствуют

#### Scenario: Sanitized logs и evidence
- **WHEN** build, runtime или QA формируют logs и evidence с диагностикой Sentry
- **THEN** полное значение public browser DSN, auth token и иные секреты не выводятся сверх минимально необходимой sanitized информации

#### Scenario: Полный контракт исключения данных и допустимости DSN
- **WHEN** reviewer проверяет observability adapters, frontend-конфигурацию, артефакты и диагностические данные
- **THEN** Все observability adapters MUST исключать auth cookies, authorization headers, tenant/service secrets, DB/SMTP credentials и request bodies из telemetry по умолчанию.
- **AND** Intended public browser DSN SHALL считаться endpoint identifier, а не секретом, и MAY присутствовать в client bundle как необходимая browser-конфигурация.
- **AND** `SENTRY_AUTH_TOKEN`, credential-bearing/private DSN и иные секреты MUST NOT попадать в frontend `.env`, browser bundle, Docker runtime image, tracked artifacts или документацию; полное значение public browser DSN MUST NOT выводиться в logs/evidence сверх минимально необходимой диагностики.

### Requirement: Шумоподавление транзиентной инфраструктурной телеметрии
Backend Core, Email Service, Notification Service и VK Service SHALL подавлять библиотечную NATS-телеметрию в Sentry по контракту сценариев. Сервисный `error_cb` MUST сохранять пороговую эскалацию, а `before_send`, sanitization и видимость прикладных ошибок MUST сохраняться.

#### Scenario: Перезапуск брокера не создаёт события
- **WHEN** NATS перезапускается, а сервисы штатно переподключаются в пределах порога эскалации
- **THEN** в GlitchTip не появляется событий `ConnectionRefusedError` или `UnexpectedEOF` ни от одного из сервисов
- **AND** факт переподключения остаётся видимым в логах пода

#### Scenario: Прикладная ошибка обработки сообщения по-прежнему видна
- **WHEN** обработчик сообщения падает с прикладной ошибкой
- **THEN** событие доставляется в Sentry как раньше
- **AND** шумоподавление логгера `nats.aio.client` его не скрывает

#### Scenario: Наблюдаемость выключена
- **WHEN** сервис запускается с `SENTRY_ENABLED=false`
- **THEN** SDK не инициализируется и регистрация `ignore_logger` не приводит к ошибке startup

#### Scenario: Полный контракт фильтрации NATS и сервисной эскалации
- **WHEN** reviewer проверяет конфигурацию Sentry и обработку NATS-ошибок в Backend Core, Email Service, Notification Service и VK Service
- **THEN** Backend Core, Email Service, Notification Service и VK Service SHALL исключать логгер `nats.aio.client` из Sentry LoggingIntegration через `ignore_logger`, чтобы собственное логирование клиентской библиотеки не порождало события мониторинга в обход политики эскалации сервиса.
- **AND** Единственным источником error-событий, связанных с доступностью брокера, MUST оставаться сервисный `error_cb` с порогом эскалации.
- **AND** Существующие `before_send` и sanitization MUST сохраняться без изменений, а шумоподавление MUST NOT распространяться на прикладные ошибки обработки сообщений.
