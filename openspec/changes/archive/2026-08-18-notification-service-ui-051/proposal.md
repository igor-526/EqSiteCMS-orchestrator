## Why

Исполнительный контур callback-уведомлений и email-подтверждения уже существует, но пользователь CMS не может увидеть свой email, управлять им и включать доступные ему события. Нужен единый защищённый UI и API-шлюз основного backend, чтобы приватные микросервисы не становились доступны браузеру или интернету.

## What Changes

- Добавить в CMS доступный каждому аутентифицированному пользователю раздел «Уведомления» с вкладками «История» (заглушка) и «Настройки».
- Добавить email-блок с состояниями «не привязан», «не подтверждён», «подтверждён», созданием/изменением/удалением адреса и повторной отправкой подтверждения через основной backend.
- Добавить role/scope-зависимый список событий и серверно-подтверждаемое переключение email-уведомления «Обратный звонок» без optimistic update.
- Расширить основной backend защищённым чтением собственного email и owner-only API пользовательских настроек, проксирующим запросы только во внутренние email/notification services.
- Расширить notification-service внутренним API настроек и применить сохранённые настройки при выборе получателей callback; отсутствие явной настройки трактовать как выключенное уведомление.
- Сохранить существующие публичные confirmation-flow исключения `POST /api/emails/send-confirmation` и `PATCH /api/emails/confirm`; consumer frontend `site-*` не менять.
- Добавить автоматизированные frontend/backend проверки, live smoke через skill на реальной PostgreSQL и сквозные проверки callback → NATS → notification-service → email-service acceptance без проверки фактического почтового ящика. Для email confirmation тест сохраняет строку/токен подтверждения из разрешённого тестового источника и сразу выполняет confirm-запрос; после изменения `.env` email-service контейнер должен быть пересоздан/перезапущен перед live E2E.

## Capabilities

### New Capabilities

- `notification-settings-api`: owner-scoped API основного backend и внутренний notification-service API для чтения доступных событий и управления подписками, включая role eligibility и access matrix.
- `notification-settings-ui`: защищённый CMS-раздел уведомлений, email lifecycle UX, серверно-подтверждаемое переключение событий и обязательная frontend test/manual QA matrix.

### Modified Capabilities

- `email-backend-proxy`: добавить защищённое owner-only чтение собственного email для CMS, не меняя публичные confirmation-flow исключения.
- `notification-orchestrator`: выбирать получателей callback только среди eligible пользователей с включённой email-настройкой и подтверждённым адресом.

## Impact

- `services/frontend`: новый protected route/feature, sidebar, API boundary, DTO, hooks, компоненты и тесты.
- `services/backend`: email client/proxy/router, новый notification-service client/proxy/router, schemas/DI/settings/access inventory и unit tests.
- `services/notification-service`: внутренний REST API/сервис/репозиторий настроек и корректировка recipient selection; существующая таблица `user_notification_settings` используется без новой миграции, если implementation discovery не выявит несовместимость.
- `services/email-service`: runtime-код не планируется; сервис участвует в live smoke/E2E и требует restart/recreate после изменения `.env`.
- NATS subjects и payload не меняются; существующие AsyncAPI-контракты читаются и проверяются на регрессию.
- Добавление service token или mTLS между private services не требуется и находится вне scope; сохраняется существующая network-isolation модель.
- `services/site-*` не затрагиваются.
