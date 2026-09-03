## ADDED Requirements

### Requirement: Наблюдаемость устойчивого long-poll retry

Штатные сетевые ошибки и timeout Bots Long Poll, которые `vkbottle` обрабатывает повторной попыткой без остановки процесса, MUST классифицироваться как ожидаемая деградация и MUST NOT создавать error-event GlitchTip. Runtime MUST сохранять текущие `server` и `ts`, продолжать polling и оставлять локальную диагностику; неожиданные и необработанные ошибки MUST оставаться видимыми в мониторинге.

#### Scenario: Polling восстанавливается после временного сбоя
- **WHEN** один polling request завершается сетевой ошибкой или timeout, а следующая попытка получает событие
- **THEN** bot runtime доставляет событие handler без перезапуска процесса
- **AND** штатный retry не создаёт error-event GlitchTip

#### Scenario: Неожиданная ошибка не скрыта
- **WHEN** long-poll runtime получает ошибку, не классифицированную библиотекой как штатный retry
- **THEN** ошибка проходит через действующий error handler или Sentry и остаётся диагностируемой

