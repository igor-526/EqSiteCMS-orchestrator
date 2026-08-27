# vk-bot-longpolling Specification

## Purpose
Long-poll runtime бота VK: выбор и изоляция библиотеки, отдельный процесс, обработка `message_new` / `message_allow` / `message_deny`, устойчивость цикла, неразглашение группового токена и тесты без реального VK.

## Requirements

### Requirement: Библиотека работы с VK

`vk-service` MUST использовать асинхронную поддерживаемую библиотеку `vkbottle` (`>=4.11,<5`) вместе с транзитивным `vkbottle-types` для доступа к VK API и Bots Long Poll. `pyproject.toml` MUST поднять `aiohttp` до `>=3.14.3` и `pydantic` до `>=2.13.4` в соответствии с требованиями библиотеки, а `uv.lock` MUST быть пересобран. Синхронные библиотеки (`vk_api`) и неподдерживаемые асинхронные (`aiovk`, `vkwave`) MUST NOT использоваться.

#### Scenario: Зависимость объявлена

- **WHEN** reviewer читает `services/vk-service/pyproject.toml`
- **THEN** в `dependencies` MUST присутствовать `vkbottle` с ограничением версии, `aiohttp>=3.14.3` и `pydantic>=2.13.4`

#### Scenario: Совместимость с рантаймом сервиса

- **WHEN** выполняется `uv sync` и `make check-vk` на Python `3.14`
- **THEN** установка и все проверки MUST завершиться успешно

#### Scenario: Запрещённые библиотеки отсутствуют

- **WHEN** reviewer читает `pyproject.toml` и `uv.lock`
- **THEN** `vk_api`, `aiovk` и `vkwave` MUST отсутствовать

### Requirement: Изоляция библиотеки от домена

Импорты `vkbottle` MUST присутствовать только в `services/vk-service/src/clients/vk/**` и `services/vk-service/src/bot/**`. Модули `core/services/**`, `repositories/**`, `models/**` и `api/**` MUST NOT импортировать `vkbottle`. Домен MUST зависеть от протоколов в `src/core/protocols/vk/`, описывающих отправку сообщения и получение профиля пользователя.

#### Scenario: Границы импортов соблюдены

- **WHEN** выполняется поиск `vkbottle` по `services/vk-service/src`
- **THEN** совпадения MUST находиться только в `clients/vk/**` и `bot/**`

#### Scenario: Домен тестируется без VK

- **WHEN** запускаются unit-тесты `core/services` VK-домена
- **THEN** они MUST проходить с фейковой реализацией протокола без сетевых вызовов и без установленного группового токена

### Requirement: Отдельный long-poll runtime

`vk-service` MUST предоставлять самостоятельную точку входа bot runtime в `services/vk-service/src/bot/main.py`, запускаемую отдельным процессом. FastAPI-приложение (`src/main.py`) и Celery-воркер MUST NOT запускать long-poll цикл. Runtime MUST использовать только Bots Long Poll; Callback API (webhook) MUST NOT настраиваться.

#### Scenario: Long-poll не стартует в HTTP-приложении

- **WHEN** приложение `src/main.py` поднимается в тестовом окружении
- **THEN** ни одно соединение к VK API MUST NOT устанавливаться, а long-poll цикл MUST NOT запускаться

#### Scenario: Runtime запускается отдельно

- **WHEN** выполняется точка входа bot runtime с валидным `VK_GROUP_TOKEN`
- **THEN** runtime MUST получить long-poll сервер и начать опрос событий

#### Scenario: Единственный экземпляр

- **WHEN** reviewer читает compose-описание bot-контейнера
- **THEN** MUST быть зафиксирован единственный экземпляр процесса, поскольку Bots Long Poll допускает одного слушателя на группу

### Requirement: Fail-fast при непригодной конфигурации VK

Bot runtime MUST завершаться с ненулевым кодом и понятным сообщением, если `VK_GROUP_TOKEN` пуст или содержит placeholder-значение, либо если `VK_GROUP_ID` не задан положительным числом. Дополнительно перед стартом long-poll цикла runtime MUST однократно выполнять preflight-запрос `groups.getLongPollServer` и завершаться с понятным сообщением, если VK отклонил его по правам (`15`, `100`) либо из-за недействительного токена (`5`, `27`, `28`). Сообщение о нехватке прав MUST называть требуемые scopes (`messages` **и** `manage`) и необходимость включить Long Poll API с типами событий `message_new`, `message_allow`, `message_deny`. Временная сетевая ошибка preflight MUST NOT препятствовать старту: цикл переподключается самостоятельно. Сообщения MUST NOT содержать значение токена. Непригодная конфигурация MUST NOT влиять на работоспособность HTTP-контура `vk-service`.

Причина отдельного preflight: без него нехватка прав всплывает уже внутри цикла сырым `VKAPIError`, а `restart: always` превращает её в бесконечный поток трейсбеков без указания на причину.

#### Scenario: Пустой токен

- **WHEN** bot runtime стартует с пустым `VK_GROUP_TOKEN`
- **THEN** процесс MUST завершиться ненулевым кодом с сообщением о необходимости заполнить переменную

#### Scenario: Placeholder-токен

- **WHEN** `VK_GROUP_TOKEN` равен placeholder-значению из `.env.example`
- **THEN** процесс MUST завершиться ненулевым кодом и MUST NOT обращаться к VK API

#### Scenario: Не задан идентификатор сообщества

- **WHEN** `VK_GROUP_ID` равен `0` либо отрицателен
- **THEN** процесс MUST завершиться ненулевым кодом и MUST NOT обращаться к VK API

#### Scenario: Токену не хватает прав

- **WHEN** preflight-запрос `groups.getLongPollServer` отклонён VK с кодом `15` или `100`
- **THEN** процесс MUST завершиться ненулевым кодом
- **AND** сообщение MUST называть требуемые scopes `messages` и `manage`, а также необходимость включить Long Poll API с типами событий `message_new`, `message_allow`, `message_deny`

#### Scenario: Токен недействителен

- **WHEN** preflight-запрос отклонён VK с кодом `5`, `27` или `28`
- **THEN** процесс MUST завершиться ненулевым кодом с сообщением о необходимости перевыпустить токен

#### Scenario: Временная сетевая ошибка preflight не мешает старту

- **WHEN** preflight-запрос завершается сетевой ошибкой, а не отказом VK
- **THEN** runtime MUST продолжить старт и положиться на переподключение внутри цикла

#### Scenario: Сообщения preflight не раскрывают токен

- **WHEN** reviewer читает сообщения об ошибках конфигурации
- **THEN** значение `VK_GROUP_TOKEN` MUST отсутствовать в них

#### Scenario: HTTP-контур не деградирует

- **WHEN** bot-контейнер остановлен из-за отсутствия токена
- **THEN** `GET /health` и VK REST API `vk-service` MUST продолжать отвечать

### Requirement: Обработка события message_new

Bot runtime MUST обрабатывать событие `message_new`. Из сообщения MUST извлекаться `vk_peer_id` отправителя и текст. Текст MUST разбираться как команда формата `<VK_BOT_LINK_COMMAND> <code>` без учёта регистра команды и с любым количеством пробелов между частями. При успешном разборе runtime MUST вызвать доменную операцию подтверждения и ответить пользователю в диалоге. Сообщения из беседы (`peer_id` беседы) MUST игнорироваться: привязка возможна только из личного диалога.

#### Scenario: Успешная привязка

- **WHEN** пользователь отправляет боту `/link ABC23XYZ` с валидным неиспользованным кодом
- **THEN** привязка MUST перейти в `ACTIVE`, а бот MUST ответить сообщением об успешной привязке

#### Scenario: Регистр и пробелы

- **WHEN** пользователь отправляет `  /LINK   abc23xyz  `
- **THEN** команда и код MUST быть распознаны и обработаны как валидные

#### Scenario: Неизвестная команда

- **WHEN** пользователь отправляет текст, не начинающийся с команды привязки
- **THEN** бот MUST ответить короткой инструкцией с форматом команды, MUST NOT искать код и MUST записать в журнал `action="vk_message"`, `status="unknown_command"`

#### Scenario: Команда без кода

- **WHEN** пользователь отправляет только команду без кода
- **THEN** бот MUST ответить инструкцией и MUST NOT обращаться к `vk_confirmations`

#### Scenario: Недействительный код

- **WHEN** переданный код не найден, использован или истёк
- **THEN** бот MUST ответить сообщением с соответствующей причиной и предложением получить новый код в CMS, не раскрывая существование чужих кодов

#### Scenario: Код чужого VK-аккаунта

- **WHEN** валидный код отправлен с `vk_peer_id`, уже привязанного к другому пользователю
- **THEN** бот MUST ответить отказом, привязка MUST NOT измениться, а код MUST остаться неиспользованным

#### Scenario: Превышен лимит попыток

- **WHEN** `vk_peer_id` превысил лимит неуспешных попыток
- **THEN** бот MUST ответить сообщением о временной блокировке попыток и MUST NOT сверять код

#### Scenario: Сообщение из беседы игнорируется

- **WHEN** событие `message_new` получено из беседы, а не из личного диалога
- **THEN** runtime MUST не выполнять привязку и MUST записать в журнал `status="ignored_chat"`

#### Scenario: Повторная доставка события

- **WHEN** VK повторно доставляет то же сообщение после сбоя подтверждения `ts`
- **THEN** обработка MUST быть идемпотентной: вторая привязка MUST NOT создаваться, а бот MUST ответить «уже подтверждено»

### Requirement: Обработка событий message_deny и message_allow

Bot runtime MUST обрабатывать `message_deny`, переводя non-deleted привязку с соответствующим `vk_peer_id` в состояние `BLOCKED`, и `message_allow`, возвращая привязку в состояние `ACTIVE`. Оба события MUST журналироваться. Отсутствие привязки для `vk_peer_id` MUST обрабатываться без ошибки.

#### Scenario: Пользователь запретил сообщения

- **WHEN** получено `message_deny` для `vk_peer_id` с привязкой в состоянии `ACTIVE`
- **THEN** состояние MUST стать `BLOCKED`, а в `vk_logs` MUST появиться запись `action="vk_message_deny"`, `status="success"`

#### Scenario: Пользователь снова разрешил сообщения

- **WHEN** получено `message_allow` для `vk_peer_id` с привязкой в состоянии `BLOCKED`
- **THEN** состояние MUST стать `ACTIVE`, а в `vk_logs` MUST появиться запись `action="vk_message_allow"`, `status="success"`

#### Scenario: Событие без привязки

- **WHEN** получено `message_deny` или `message_allow` для `vk_peer_id` без non-deleted привязки
- **THEN** runtime MUST не поднимать исключение и MUST записать в журнал `status="no_binding"`

#### Scenario: Отправка заблокированному пользователю не выполняется

- **WHEN** домен пытается отправить сообщение привязке в состоянии `BLOCKED`
- **THEN** отправка MUST NOT выполняться, а результат MUST фиксироваться в журнале

### Requirement: Устойчивость long-poll цикла

Bot runtime MUST переживать сетевые ошибки и служебные ответы VK: коды `failed=1` MUST приводить к продолжению опроса с новым `ts` **без** переполучения long-poll сервера, `failed=2` и `failed=3` — к переполучению сервера. Сетевые ошибки и таймауты MUST приводить к повторной попытке с возрастающим и ограниченным сверху backoff, сохраняя текущие `server` и `ts`, чтобы не потерять накопленные события. Единичная ошибка MUST NOT завершать процесс. `VK_LONGPOLL_WAIT_SECONDS` (по умолчанию `25`) MUST параметризировать время ожидания.

Требование считается выполненным, если цикл реализован выбранной библиотекой: `vkbottle.polling.base.BasePolling.listen()` обрабатывает все перечисленные исходы. В этом случае тесты MUST подтверждать фактическое поведение цикла на stub-сервере, а не наличие собственной реализации.

#### Scenario: Устаревший ts

- **WHEN** VK возвращает `failed=1` с новым `ts`
- **THEN** runtime MUST продолжить опрос с полученным `ts` без переполучения сервера

#### Scenario: Истёкший ключ long-poll

- **WHEN** VK возвращает `failed=2` или `failed=3`
- **THEN** runtime MUST заново получить long-poll сервер и продолжить опрос

#### Scenario: Обрыв сети

- **WHEN** запрос к long-poll серверу завершается сетевой ошибкой или таймаутом
- **THEN** runtime MUST повторить попытку с возрастающим ограниченным backoff, MUST сохранить текущие `server` и `ts`, MUST записать предупреждение в лог и MUST NOT завершиться

#### Scenario: Ошибка обработчика не останавливает цикл

- **WHEN** обработка одного события поднимает исключение
- **THEN** исключение MUST быть залогировано, событие MUST быть зафиксировано в `vk_logs` со `status="error"`, а цикл MUST продолжить работу

#### Scenario: Корректное завершение

- **WHEN** процесс получает `SIGTERM`
- **THEN** runtime MUST закрыть VK-сессию и соединение с БД и завершиться нулевым кодом

### Requirement: Секреты и наблюдаемость bot runtime

`VK_GROUP_TOKEN` MUST NOT попадать в логи, журнал `vk_logs`, сообщения об ошибках и отчёты. Bot runtime MUST использовать общий для сервиса Sentry-конфигуратор и структурное логирование, при `ENVIRONMENT=production` MUST NOT публиковать собственный HTTP-порт.

#### Scenario: Токен не раскрывается

- **WHEN** reviewer просматривает вывод логов bot runtime при успешном старте и при ошибке авторизации VK
- **THEN** значение `VK_GROUP_TOKEN` MUST отсутствовать полностью и в маскированном виде MUST содержать не более 4 символов

#### Scenario: Ошибки уходят в Sentry

- **WHEN** `SENTRY_ENABLED=true` и обработчик события поднимает необработанное исключение
- **THEN** событие MUST быть отправлено в Sentry с тем же конфигуратором, что использует HTTP-контур

### Requirement: Тесты bot runtime без реального VK

Тесты bot runtime MUST выполняться против фейковой реализации VK API и long-poll (stub), без сетевых обращений к `api.vk.com` и без реального группового токена. Тесты, требующие реальной группы, MUST быть помечены маркером `infrastructure` и MUST NOT выполняться в `make check-vk`.

#### Scenario: Автотесты не требуют секретов

- **WHEN** выполняется `uv run pytest -m "not infrastructure"` в `services/vk-service`
- **THEN** все тесты MUST проходить без `VK_GROUP_TOKEN` и без доступа в интернет

#### Scenario: Покрытие сценариев привязки

- **WHEN** deliverable bot runtime передаётся в Quality Gate
- **THEN** тесты MUST покрывать успешную привязку, неизвестную команду, команду без кода, недействительный/использованный/истёкший код, конфликт `vk_peer_id`, rate limit, сообщение из беседы, повторную доставку, `message_deny`, `message_allow`, `failed=1/2/3` и сетевой обрыв
