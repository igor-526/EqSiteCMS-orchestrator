## 1. Обновление протокола NATS JetStream

- [x] 1.1 Добавить в `agents/howto/nats-jetstream-protocols.md` новую секцию «Документирование в README.md» перед «Лучшие практики» с правилом: сервис, использующий NATS JetStream, обязан содержать в README.md секцию «NATS JetStream» с таблицей streams/subjects/consumers и описанием назначения.
- [x] 1.2 Указать формат таблицы: колонки Stream / Subject / Назначение / Роль (входящий/исходящий).

## 2. Создание README.md для backend

- [x] 2.1 Создать `services/backend/README.md` на основе шаблона FastAPI Template с секциями: Стек, Архитектура, Запуск в Docker, Локальная разработка, API, NATS JetStream.
- [x] 2.2 Заполнить секцию «NATS JetStream»: роль Publisher, stream SITE_EVENTS, subject events.site.callback.requested, назначение «Публикация события запроса обратного звонка».

## 3. Обновление README.md для notification-service

- [x] 3.1 Обновить `services/notification-service/README.md`: заменить шаблонный текст на описание сервиса notification-service.
- [x] 3.2 Добавить секцию «NATS JetStream»: роль Pub/Sub, таблица с stream SITE_EVENTS (subject events.site.callback.requested, входящий) и stream NOTIFICATION_COMMANDS (subject commands.notification.email.send, исходящий).

## 4. Обновление README.md для email-service

- [x] 4.1 Обновить `services/email-service/README.md`: заменить шаблонный текст на описание сервиса email-service.
- [x] 4.2 Добавить секцию «NATS JetStream»: роль Consumer, stream NOTIFICATION_COMMANDS, subject commands.notification.email.send, назначение «Приём команды на отправку email».
