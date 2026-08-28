# platform-observability Specification

## Purpose

Зафиксировать единый контракт конфигурации, жизненного цикла, защиты данных, сборки, тестирования и эксплуатации Sentry и Prometheus для backend-сервисов, CMS frontend и публичного `site-ad` без изменения business API, NATS и БД.

## Requirements

### Requirement: Единая backend-конфигурация Sentry
Backend Core, Email Service и Notification Service SHALL использовать одинаковые env-имена `SENTRY_ENABLED`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_RELEASE`; SDK MUST инициализироваться только при явном enablement и MUST отклонять enabled-конфигурацию без DSN.

#### Scenario: Наблюдаемость выключена
- **WHEN** FastAPI-сервис запускается с `SENTRY_ENABLED=false`
- **THEN** Sentry SDK не инициализируется и сервис сохраняет штатный startup

#### Scenario: Валидная включённая конфигурация
- **WHEN** сервис запускается с `SENTRY_ENABLED=true`, непустым DSN и rate в диапазоне 0..1
- **THEN** SDK получает environment, release и traces sample rate из единой матрицы env

#### Scenario: DSN отсутствует
- **WHEN** `SENTRY_ENABLED=true`, а `SENTRY_DSN` пуст
- **THEN** конфигурация завершается явной ошибкой до обработки запросов

### Requirement: Единый lifecycle Prometheus
Три FastAPI-сервиса SHALL регистрировать HTTP instrumentation в одном фактически scrape-able registry и SHALL запускать отдельный Prometheus listener на `0.0.0.0:9000` только в production. Listener MUST запускаться один раз, завершаться вместе с приложением и оставаться доступным только во внутреннем инфраструктурном контуре.

#### Scenario: Production scrape
- **WHEN** production-контейнер обработал HTTP-запрос и внутренний scraper обращается к `:9000/metrics`
- **THEN** scraper получает `200`, Prometheus content type и инструментированные HTTP series этого сервиса

#### Scenario: Development startup
- **WHEN** сервис запускается не в production
- **THEN** отдельный metrics listener не открывается, а бизнес-приложение запускается штатно

#### Scenario: Graceful shutdown
- **WHEN** приложение получает штатное завершение
- **THEN** metrics server и thread освобождаются без зависания и port leak

### Requirement: Sentry в обоих Next.js-приложениях
CMS frontend и `site-ad` SHALL использовать официальный Next.js Sentry SDK и SHALL захватывать необработанные ошибки client, server и edge runtime при enablement. При disabled-конфигурации приложение MUST работать без отправки envelopes; одна ошибка MUST NOT порождать дублирующиеся события из нескольких boundaries.

#### Scenario: Client error в CMS
- **WHEN** QA build CMS с включённым Sentry получает контролируемую client-side ошибку
- **THEN** отображается устойчивый global error fallback и отправляется одно sanitized событие

#### Scenario: Server или edge error в site-ad
- **WHEN** QA build публичного сайта получает контролируемую server/edge ошибку
- **THEN** Sentry получает событие соответствующего runtime без нарушения Public Read SSR shell

#### Scenario: Disabled frontend monitoring
- **WHEN** любое Next.js-приложение собрано с `SENTRY_ENABLED=false`
- **THEN** приложение не инициализирует transport и не выполняет envelope-запросы

### Requirement: Согласованный frontend env и container build
Оба frontend-проекта SHALL принимать `SENTRY_ENABLED`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_RELEASE` через `.env`/`.env.example`. Browser-значения MUST быть доступны во время `next build`, server-значения MUST быть доступны runtime, а изменение browser-конфигурации MUST требовать rebuild. Dockerfile, применимый compose и Make/build workflow SHALL передавать матрицу без вывода значений в logs.

#### Scenario: Production container build
- **WHEN** image собирается с placeholder QA-конфигурацией Sentry
- **THEN** client bundle и server runtime получают согласованные environment/release/rate и приложение успешно стартует

#### Scenario: Переменные не заданы
- **WHEN** Sentry variables отсутствуют либо enablement имеет false default
- **THEN** production build завершается успешно и monitoring остаётся выключенным

#### Scenario: Изменение browser DSN
- **WHEN** оператор изменяет DSN после создания image
- **THEN** runbook требует пересборку image до применения значения в browser bundle

### Requirement: Защита чувствительных данных
Все observability adapters MUST исключать auth cookies, authorization headers, tenant/service secrets, DB/SMTP credentials и request bodies из telemetry по умолчанию. Intended public browser DSN SHALL считаться endpoint identifier, а не секретом, и MAY присутствовать в client bundle как необходимая browser-конфигурация. `SENTRY_AUTH_TOKEN`, credential-bearing/private DSN и иные секреты MUST NOT попадать в frontend `.env`, browser bundle, Docker runtime image, tracked artifacts или документацию; полное значение public browser DSN MUST NOT выводиться в logs/evidence сверх минимально необходимой диагностики.

#### Scenario: Ошибка авторизованного CMS-запроса
- **WHEN** Sentry фиксирует ошибку запроса с auth cookie или authorization header
- **THEN** событие не содержит значение credential и не раскрывает request body

#### Scenario: Проверка собранного frontend bundle
- **WHEN** Quality Gate сканирует bundle и image metadata
- **THEN** intended public browser DSN допускается как endpoint identifier, а auth token, credential-bearing/private DSN и иные секретные значения отсутствуют

#### Scenario: Sanitized logs и evidence
- **WHEN** build, runtime или QA формируют logs и evidence с диагностикой Sentry
- **THEN** полное значение public browser DSN, auth token и иные секреты не выводятся сверх минимально необходимой sanitized информации

### Requirement: Проверяемая эксплуатационная документация
Проект SHALL иметь единый runbook, описывающий назначение Sentry и Prometheus, матрицу переменных, различие build/runtime, внутренние ports, startup/shutdown, локальную проверку, production rollout, sanitization, troubleshooting и rollback. Документ MUST соответствовать фактическому коду и командам.

#### Scenario: Новый оператор подключает monitoring
- **WHEN** оператор следует runbook в чистом окружении с placeholder/test credentials
- **THEN** он может собрать приложения, проверить disabled/enabled Sentry и получить Prometheus scrape без обращения к неописанным знаниям

#### Scenario: Документация сверяется с кодом
- **WHEN** Quality Gate сопоставляет env names, ports и команды runbook с реализацией
- **THEN** противоречия блокируют завершение change

### Requirement: API и межсервисные контракты сохраняются
Observability change MUST NOT добавлять или изменять business HTTP endpoint, access class, NATS subject, AsyncAPI contract, схему БД или tenant selection behavior. Prometheus `:9000` SHALL считаться внутренним инфраструктурным listener, а не Public Read API.

#### Scenario: Regression проверки контрактов
- **WHEN** после observability rollout выполняются существующие API/NATS проверки
- **THEN** маршруты, anonymous/authenticated outcomes, subjects и DB schema совпадают с состоянием до change

#### Scenario: Effective compose config
- **WHEN** Quality Gate анализирует опубликованные ports
- **THEN** metrics listener не опубликован во внешний host/public contour без отдельного утверждённого исключения

### Requirement: Шумоподавление транзиентной инфраструктурной телеметрии

Backend Core, Email Service, Notification Service и VK Service SHALL исключать логгер `nats.aio.client` из Sentry LoggingIntegration через `ignore_logger`, чтобы собственное логирование клиентской библиотеки не порождало события мониторинга в обход политики эскалации сервиса. Единственным источником error-событий, связанных с доступностью брокера, MUST оставаться сервисный `error_cb` с порогом эскалации. Существующие `before_send` и sanitization MUST сохраняться без изменений, а шумоподавление MUST NOT распространяться на прикладные ошибки обработки сообщений.

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
