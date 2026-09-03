## ADDED Requirements

### Requirement: Штатные retry-сигналы VK Bots Long Poll не являются инцидентами

VK Service SHALL исключать ожидаемый retry-логгер `vkbottle`, создающий сообщение `Unable to make request to BotPolling, retrying...`, из Sentry LoggingIntegration. Фильтрация MUST действовать только на библиотечную retry-телеметрию и MUST NOT подавлять необработанные исключения процесса, ошибки прикладных handlers, собственные error-сообщения preflight или delivery pipeline. Существующие sanitization и защита `VK_GROUP_TOKEN` MUST сохраняться.

#### Scenario: Временный сбой Bots Long Poll
- **WHEN** `vkbottle` не может выполнить polling request, логирует штатный retry и продолжает цикл
- **THEN** в Sentry/GlitchTip не создаётся error-event `Unable to make request to BotPolling, retrying...`
- **AND** retry остаётся доступен в локальном runtime log

#### Scenario: Необработанная ошибка bot runtime
- **WHEN** вне штатного retry возникает необработанное исключение процесса или прикладного handler
- **THEN** Sentry получает sanitized event с тем же конфигуратором, что и HTTP-контур

#### Scenario: Секреты остаются защищены
- **WHEN** формируется событие мониторинга VK Service
- **THEN** токен, credentials и request body фильтруются по действующему observability-контракту

