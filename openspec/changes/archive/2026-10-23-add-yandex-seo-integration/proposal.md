# Proposal — add-yandex-seo-integration

Источник запроса: [`docs/tasks/098_yandex_frontend.md`](../../../docs/tasks/098_yandex_frontend.md). Файл задачи частично повреждён (вставки `#`, обрывки слов); восстановленный смысл зафиксирован ниже, ответы пользователя зафиксированы в `design.md` → «Согласованные уточнения».

## Why

Сервисы `yandex-service` (OAuth Яндекса, аккаунты, привязка счётчика Метрики) и `ya-metrica-service` уже реализованы, но недоступны пользователю CMS: CMS frontend может обращаться только к основному backend, а у backend нет клиента к `yandex-service`. Нужно дать администратору конюшни управлять аккаунтами Яндекса и привязкой счётчика Яндекс.Метрики прямо из CMS.

## What Changes

- **Backend (`services/backend`)**: новый прокси-клиент к приватному `yandex-service` (ENV `YANDEX_SERVICE_URL`) и восемь browser-facing endpoint'ов под `/api/yandex/**`: ссылка OAuth, обмен кода, список/отвязка аккаунтов, список счётчиков аккаунта, чтение/установка/удаление привязки счётчика. Конюшня (tenant) всегда выводится из сессии; принадлежность `account_id` конюшне проверяется backend до любого downstream-вызова, потому что peer такой проверки не делает. К `ya-metrica-service` backend не обращается.
- **Access policy**: все новые `GET` — **Protected Sensitive Read** (исключение из Public Read: PII аккаунтов Яндекса, OAuth-ссылка конюшни и данные, полученные по OAuth-токену, не нужны consumer-сайтам). Все `POST/DELETE` — Protected Write. `POST /api/yandex/auth/code` — **не** публичное исключение: callback-страница открывается на origin CMS и несёт cookie сессии. Доступ только для существующей роли `ADMIN`; `SUPERUSER`, `DEVELOPER` и остальные роли не допускаются. Отдельные роль SEO и серверный scope не вводятся. Полная access matrix — в `specs/yandex-backend-proxy/spec.md` и `design.md`.
- **CMS frontend (`services/frontend`)**: раздел «SEO» в боковом меню (иконка `RiseOutlined` из уже используемой `@ant-design/icons`), страница `/seo` с вкладками «Яндекс.Метрика» и «Яндекс.Вебмастер» (заглушка «в разработке»).
- Вкладка «Яндекс.Метрика»: блок статуса привязки (не привязано → кнопка запуска визарда; привязано → данные счётчика и аккаунта из БД + отвязка через модалку подтверждения).
- Универсальный визард-модал из двух шагов: шаг 1 — выбор аккаунта Яндекса (с отвязкой аккаунта через подтверждение и последним пунктом «Добавить аккаунт»), шаг 2 — расширяемый слот цели (сейчас — выбор счётчика Метрики; позже — выбор хоста Вебмастера).
- OAuth в мини-окне (popup) и служебная страница `/callbacks/oauth/yandex`, которая читает `code`/`state` из URL, выполняет POST обмена кода, сообщает результат окну-родителю и закрывается; список аккаунтов в визарде обновляется.
- Тестовые данные только для удобства проверки: дубль записи аккаунта Яндекса с выдуманными данными в БД `yandex-service`; существующая запись не изменяется и не удаляется.
- Consumer sites (`site-*`), `yandex-service`, `ya-metrica-service` — без изменений.

## Capabilities

### New Capabilities

- `yandex-backend-proxy`: browser-facing прокси основного backend к приватному `yandex-service` — ENV/клиент, tenant из сессии, проверка владения аккаунтом, маппинг ошибок peer, access matrix и тестовое покрытие.
- `cms-seo-yandex-ui`: раздел SEO в CMS — навигация и видимость только для ADMIN, вкладки, блок привязки счётчика Метрики, универсальный двухшаговый визард с расширяемым вторым шагом, отвязка аккаунта/счётчика через подтверждение.
- `yandex-oauth-cms-callback`: OAuth-поток Яндекса в CMS — открытие ссылки в popup, служебная callback-страница `/callbacks/oauth/yandex`, обмен кода, уведомление окна-родителя и обновление списка аккаунтов.

### Modified Capabilities

(нет — контракты peer `yandex-peer-http-contract`, `yandex-oauth-accounts`, `yandex-metrica-gateway` используются как есть и не меняются)

## Impact

- **Endpoints (новые, backend)** — access matrix обязательна и приведена в `specs/yandex-backend-proxy/spec.md`:
  - `GET /api/yandex/auth/link`
  - `POST /api/yandex/auth/code`
  - `GET /api/yandex/accounts`
  - `DELETE /api/yandex/accounts/{account_id}`
  - `GET /api/yandex/metrica/counters`
  - `GET /api/yandex/metrica/connection`
  - `POST /api/yandex/metrica/connection`
  - `DELETE /api/yandex/metrica/connection`
- **Код**: `services/backend/src/{clients/yandex_service,core/protocols,core/services,api,depends,settings.py,main.py}`, `services/backend/maintain/route_inventory.py`, `services/backend/docs/backend-route-inventory.md`, `services/backend/.env.example`, `services/backend/README.md`, `services/backend/tests/unit/api/**`; `services/frontend/src/{api,types/api,features/seo,app/(protected)/seo,app/(open)/callbacks/oauth/yandex,ui/NavigationMenu,app/(protected)/layout.tsx}`.
- **Данные**: только тестовая вставка одной строки в `yandex_user` БД `yandex-service` (dev); миграций нет.
- **NATS/AsyncAPI**: не затрагиваются.
- **Зависимости**: новые библиотеки не добавляются (`httpx` уже есть в backend; `antd`, `@ant-design/icons` — в frontend).
- **Безопасность**: `yandex-service` не проверяет принадлежность ресурсов конюшне и не имеет auth; backend становится единственной точкой авторизации. Ограничения peer (dev-допущение о сетевой изоляции, единый статус `400`) наследуются — см. `design.md` → «Риски».
