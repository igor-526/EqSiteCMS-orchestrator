## Why

Заявки на обратный звонок сейчас существуют только как одноразовое NATS-событие: backend не журналирует их, CMS не позволяет администраторам обрабатывать заявки, а публичная форма `site-ad` вызывает несовпадающий путь и фактически отключена. Уведомление дополнительно раскрывает внутренние UUID, которые не должны попадать в письмо.

## What Changes

- Добавить в `services/backend` постоянное хранение заявок и реестр числовых статусов с seed-данными, включая начальный статус `1` («Новая») и статус `2` («Обработана»), а также системный статус «Закрыто» для spam-flow.
- Сохранить публичное создание заявки через `POST /callback_requests` как явно документированное исключение из Protected Write, валидировать tenant selector, сначала атомарно записывать заявку, затем публиковать callback-событие.
- Добавить защищённые CMS API для списка/детали, справочника статусов и разрешённых изменений только `status`/`is_spam`, а также служебные команды для `status`, `is_spam` и `notifications_delivered`; удаления и редактирования контактных данных не предоставлять.
- Поддержать сортировку, фильтры и пагинацию таблицы; defaults: `status ASC, created_at DESC` и `is_spam=false`.
- **BREAKING**: удалить `X-Equestrian-Id`/UUID всадника из callback-события и всего callback-flow; сохранить внутренний `callback_request_id` только для корреляции служебного обновления доставки, но не показывать никакие UUID в email. Согласованно обновить producer/consumer AsyncAPI и обработчик уведомления.
- Добавить в CMS защищённый раздел «Заявки на обратный звонок» только для `ADMIN`/`SUPERUSER`: таблица, status/spam dropdown mutations, фильтры, сортировка, пагинация, модальное чтение полной заявки, вкладки «Заявки» и «Инструкция».
- Исправить и протестировать форму `services/site-ad`: правильный endpoint/поле `comment`, работающий submit, состояния success/validation/error и защита от повторной отправки.
- В developer-документации раскрывать только публичный endpoint создания; CMS и service endpoint'ы не включать в публичную consumer-документацию.

## Capabilities

### New Capabilities

- `callback-request-lifecycle`: хранение, статусная модель, API-контракты, доступы, фильтры/сортировка/пагинация и допустимые переходы заявки.
- `callback-requests-admin-ui`: CMS-раздел для просмотра и обработки callback-заявок администраторами и суперпользователями.
- `callback-request-consumer-form`: корректная интеграция публичной формы `site-ad` с endpoint создания заявки.

### Modified Capabilities

- `notification-callback-handler`: письмо по callback-заявке содержит только данные самой заявки и не содержит UUID.
- `nats-jetstream-protocols`: callback producer/consumer contract больше не переносит UUID заявки и всадника.

## Impact

- Backend Core: `services/backend` (domain/schema/service/repository/model/migration/seed/API/docs/tests и NATS publisher/AsyncAPI).
- Notification Service: `services/notification-service` (callback schema/handler/consumer tests и AsyncAPI).
- Frontend CMS: `services/frontend` (route, navigation, feature/API/types/tests и администраторская инструкция).
- Public Site: `services/site-ad` (callback API boundary, form UX и тесты).
- PostgreSQL получает две новые связанные таблицы; NATS callback headers меняются согласованно у producer и consumer.
