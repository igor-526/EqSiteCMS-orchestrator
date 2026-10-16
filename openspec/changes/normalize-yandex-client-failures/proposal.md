## Why

Клиенты Яндекс выпускают наружу timeout, transport, JSON и DTO-ошибки вместо единственного предусмотренного `YandexClientException`; слой сервисов не везде преобразует его в `ClientError`. В результате одинаковая неудача интеграции даёт непредсказуемый HTTP-ответ, хотя пользователь требует для двух микросервисов только `200`, `204`, `400`.

Источник: [запрос 096](../../../docs/tasks/096_yandex_client_exceptions.md). Исторически PLAN-1/PLAN-2 подготовили предложение без разрешения на apply. После показа артефактов пользователь явно ответил «Начинай»: финальный apply approval получен; пять BE units завершены. Обязательные QG-проверки и clean-worktree checkpoints не требуют повторного approval и не расширяют scope.

## What Changes

- Единый контракт отказа для `YandexOAuthClient`, `YandexMetricaClient` и связанного `YaMetricaServiceClient`: локальный `YandexClientException` при timeout, transport, upstream non-2xx, невалидном целиком JSON или непригодной top-level структуре/DTO. Некорректный отдельный счётчик не является отказом всего вызова: сохранить существующий пропуск элемента и частичный `200` для корректных элементов, без новых правил для пустого результата и `total/items` (ответ Q3).
- Сервис ловит только интеграционное исключение на границе вызова клиента и выдаёт безопасный `ClientError`; HTTP-слой централизованно возвращает `400`.
- **BREAKING** По ответу Q1 «Все ответы двух сервисов» множество `200/204/400` распространяется на все HTTP-ответы, создаваемые приложениями этих двух peers: нормализовать `AppError`, конфликты, необработанные ошибки, routing/validation и отключить slash redirects. `health` и документация остаются успешными `200`; `204` без тела.
- Зафиксировать существующие access exceptions для peer endpoints без нового ослабления прав. Матрица всех путей, anonymous/authenticated проверки и причины исключений находятся в delta spec `yandex-peer-http-contract`.
- Не изменять `401/403` main backend, tenant selector, HTTP-статусы других сервисов, БД и транспортные библиотеки.

## Capabilities

### New Capabilities

- `yandex-client-failures`: единая типизация ошибок трёх клиентов, границы преобразования в сервисах, безопасная диагностика.
- `yandex-peer-http-contract`: локальный набор HTTP-статусов двух сервисов, access matrix, ошибки framework и сохранение границ доступа.

### Modified Capabilities

- `repository-process-tooling`: точечное дополнение контракта stackctl для двух Яндекс-peers и их PostgreSQL; только ADDED requirement, существующий контракт сайтов не переписывается.

Main specs `service-endpoint-auth`, `api-access-governance`, `service-env-and-clients` не меняются: требования backend `401/403/500` не переопределяются локальным контрактом peers; `httpx` внешних Яндекс-клиентов сохраняется, миграция на `aiohttp` вне задачи.

## Impact

- PLAN-5 / ENV-01: новый bounded deliverable E, unit `TOOL-1`, только `scripts/stackctl` и новый `scripts/tests/stackctl.test.mjs`. Добавить `ya-metrica-service`, `db-yandex`, `db-ya-metrica`, соответствующие минимальные profiles/DB_CONFIG; обеспечить ready/rebuild двух peers, doctor/logs трёх новых aliases и TCP password-auth readiness обеих БД через `psql … -c "SELECT 1"`. Не добавлять остальные сервисы, миграции, network/auth/compose изменения. HTTP endpoints и access matrix не меняются.
- Ответ «Доработай» разрешает подготовку устранения блокера; расширенный tooling scope показать Router/пользователю и подтвердить до apply TOOL-1. Базовое «Начинай» и completed BE tasks сохраняются. После TOOL-1 повторить ENV → BE/CONTRACTS → LIVE → существующие checkpoints → FORMAT → SYNTH. Root tooling paths включаются commit-only в DOCS-CP-PRE, иначе clean-root prerequisite недостижим; TOOL-1/PLAN-5 commits не выполняют.

- `services/yandex-service`: два клиента, локальное исключение/Protocol-контракты, OAuth и Metrica service, HTTP handlers и относящиеся тесты.
- `services/ya-metrica-service`: клиент, локальное исключение/Protocol, Metrica service, проверка структуры upstream, HTTP handlers и относящиеся тесты.
- Клиенты API должны перестать ожидать `409/500/404/405/307` от этих peers в согласованном полном HTTP-охвате; никакой межсервисный Python import не допускается.
- Q1..Q3 закрыты ответами пользователя: все ответы двух сервисов; «Это dev окружение. На production такого не будет»; «Нет, сохранить частичный список». Сами ответы Q1..Q3 не являлись финальным approval реализации; позднее отдельное явное «Начинай» после показа артефактов разрешило apply. Отдельный security change не является prerequisite для apply/dev verification этой задачи; auth/network changes вне ownership. Production isolation технически не подтверждена: отсутствие внешней anonymous-доступности чувствительных APIs остаётся явным deployment/release условием, не разрешением публичной выдачи токенов.
