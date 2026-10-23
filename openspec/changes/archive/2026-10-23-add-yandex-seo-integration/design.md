# Design — add-yandex-seo-integration

- **Тикет:** [`docs/tasks/098_yandex_frontend.md`](../../../docs/tasks/098_yandex_frontend.md)
- **Дата:** 2026-10-23
- **Сервисы с изменением кода:** `services/backend`, `services/frontend`
- **Источники контрактов (только чтение):** `services/yandex-service` (API `src/api/*.py`, DTO `src/core/schemas/api/*.py`, модели `src/models/*.py`, `.env` → `YANDEX_APP_REDIRECT_URI=http://localhost:3001/callbacks/oauth/yandex`), `services/ya-metrica-service`, main specs `yandex-peer-http-contract`, `yandex-oauth-accounts`, `yandex-metrica-gateway`, `vk-backend-proxy` (образец прокси).
- **Без изменений:** `yandex-service`, `ya-metrica-service`, `site-*`, NATS/AsyncAPI.

## Context

Мотивация — см. `proposal.md` → Why. Ключевые факты текущего состояния:

- `yandex-service` (`http://eqsitecms-yandex-service:8000`, сеть `eqsitecms_network`) не имеет auth и **не проверяет принадлежность ресурсов конюшне**: `GET /api/metrica/counters?account_id`, `DELETE /api/accounts/{id}`, `POST /api/connections/metrica` и `DELETE /api/connections/metrica/{counter_id}` работают по голому UUID. Peer отдаёт только `200/204/400` (main spec `yandex-peer-http-contract`), ошибки упакованы в безопасный `detail`.
- Peer-эндпоинты, которые использует прокси: `GET /api/auth/link?equestrian_id`, `POST /api/auth/code {code, equestrian_id}`, `GET /api/accounts/?equestrian_id&search&limit&offset`, `DELETE /api/accounts/{account_id}`, `GET /api/metrica/counters?account_id&search&limit&offset`, `GET /api/connections/metrica/{equestrian_id}`, `POST /api/connections/metrica {equestrian_id, yandex_account_id, counter_id}`, `DELETE /api/connections/metrica/{counter_record_id}`. `GET /api/servicing/access-token/*` прокси **не** использует.
- Привязка счётчика хранит только `counter_id` и FK на аккаунт (`yandex_metrica_counters`, unique `equestrian_id`, `ON DELETE CASCADE` от аккаунта). Названия сайта счётчика в БД нет — блок «привязано» показывает номер счётчика и данные аккаунта.
- `state` ссылки OAuth = `equestrian_id` конюшни (пример из задачи: `state=5f6496aa-…` совпадает с UUID конюшни «Александрова дача»). Параметр `cid` Яндекса не нужен.
- Backend: tenant берётся из `UserOutDto.equestrian_id` (`get_protected_equestrian_context`), доступ к новым маршрутам — только по существующей роли `ADMIN`, локальный permission guard без нового серверного scope; широкий `require_site_settings_write_scope` не переиспользуется. Глобальный `RequestValidationError` даёт `422` для ошибок path и `extra_forbidden` — поэтому path UUID парсится вручную (как `DELETE /api/vks/{user_id}`), а request-схемы не используют `extra="forbid"`.
- Frontend: Next.js App Router, AntD 6, `@ant-design/icons`; меню — `src/ui/NavigationMenu/NavigationMenu.tsx`, заголовки — `pageTitles` в `src/app/(protected)/layout.tsx`, open-маршруты без layout — `src/app/(open)/**` (образец `callback/email/page.tsx`). `apiFetch` не отдаёт HTTP-статус, только `detail`. Frontend на `localhost:3001`, backend на `localhost:8001/api` — cookie сессии доступна popup-окну того же origin. В `src/features/yandex/{hooks,services}` лежат пустые неотслеживаемые каталоги — не используются.

## Goals / Non-Goals

**Goals:**
- Backend остаётся единственной точкой авторизации: tenant из сессии, только роль ADMIN, проверка владения `account_id`, сравнение OAuth `state` с конюшней.
- Универсальный визард, где шаг 2 — подключаемая «цель» без правок шага 1.
- OAuth без ухода со страницы CMS: popup → callback → postMessage → обновление списка.

**Non-Goals:**
- Изменения `yandex-service`/`ya-metrica-service` (auth, refresh токенов, хранение названия сайта счётчика, проверка доступности счётчика аккаунту).
- Функционал Вебмастера (только заглушка), отчёты/статистика Метрики, публичное чтение для `site-*`.
- Подтверждение production-изоляции peer (наследуется из `yandex-peer-http-contract`).

## Decisions

### D1. Префикс `/api/yandex/**` и форма маршрутов
Маршруты повторяют ресурсы peer, но без tenant-параметров: конюшня — из сессии. Привязка адресуется как одиночный ресурс конюшни `/api/yandex/metrica/connection` (GET/POST/DELETE) вместо `/{counter_id}`: это исключает удаление чужой привязки по UUID и не требует ownership-проверки. *Альтернатива:* зеркалить peer (`DELETE /connections/metrica/{id}`) — отклонено, потребовало бы lookup и даёт поверхность IDOR.

### D2. Все GET — Protected Sensitive Read
Исключение из дефолтного Public Read с причинами в access matrix (PII, OAuth state, данные по токену). Consumer-сайтам не нужны. *Альтернатива:* public GET connection для будущего встраивания счётчика на сайты — не требуется по согласованному ответу Q5, потребовало бы отдельного DTO без PII.

### D3. Только существующая роль `ADMIN`, без отдельного SEO-scope
Все восемь маршрутов и UI доступны только `ADMIN`. `SUPERUSER`, `DEVELOPER`, `USER_MANAGER`, остальные роли и отсутствие `ADMIN` дают отказ без наследования привилегий. Отдельная роль SEO, новый серверный scope и изменения глобального реестра прав не вводятся. В backend допустим локальный guard `require_yandex_admin` внутри `src/api/yandex.py`, проверяющий ровно существующую роль `ADMIN`. Во frontend `useSeoScopes.ts` остаётся именем локального permission adapter для `SEO_ACTIONS → ADMIN`, а не новым серверным scope. Q1 согласован; расширение SEO-прав отложено.

### D4. Проверка владения `account_id` через tenant-scoped список peer
Peer не имеет «get account by id + tenant». Backend постранично (limit=100) читает `GET /api/accounts/?equestrian_id=<сессия>` до нахождения `id` или исчерпания `total`. Чужой и отсутствующий аккаунт неразличимы → `404` (не `403`, т.к. ID ресурса, а не владельца, и раскрывать существование нельзя). Стоимость: +1 запрос (у конюшни единицы аккаунтов). *Альтернатива:* доработать peer — вне scope (Non-Goal).

### D5. `POST /api/yandex/auth/code` — Protected Write, `state` обязателен и сверяется
Callback открывается в popup на origin CMS, cookie сессии есть → публичное исключение не нужно. `state != str(actor.equestrian_id)` → `403` до peer (защита от привязки кода к чужой конюшне/подставного callback). Тело `{code, state}`, `equestrian_id` в теле игнорируется. Статус `200` (peer делает upsert, ответ — аккаунт).

### D6. Маппинг ошибок
Peer `400` → backend `400` с peer `detail` (строка ≤ 300 символов; иначе «Запрос к сервису Яндекс отклонён»). `httpx.RequestError`, timeout 10 с, любой иной статус, невалидный JSON/схема → `502 "Yandex service unavailable"`. Нюанс: peer упаковывает и внутренние ошибки в `400` — backend не может их отличить; это наследуемое ограничение (Risks).

### D7. Клиент — по образцу `clients/vk_service`
`src/clients/yandex_service/{client.py,schemas.py}`, протокол `src/core/protocols/yandex_service.py`, use-case `src/core/services/yandex_proxy.py` (tenant, ownership, state-check, idempotent delete connection), роутер `src/api/yandex.py`, DI в `src/depends/services.py`, ENV в `settings.py`. Response-схемы whitelist (pydantic игнорирует лишние поля, токены не объявлены). Без peer credential.

### D8. Frontend: одна фича `seo`
Маршрут `/seo` → `src/features/seo/**` (правило page→feature). Callback-маршрут `src/app/(open)/callbacks/oauth/yandex/page.tsx` — тонкая обёртка над `src/features/seo/ui/YandexOAuthCallback.tsx`; это явно согласованное исключение naming-правила (логика OAuth принадлежит SEO-фиче). Структура:
- `src/types/api/yandex.ts` — `YandexAccountOutDto`, `YandexAccountsQueryInDto`, `YandexMetricaCounterOutDto`, `YandexMetricaCountersQueryInDto`, `YandexMetricaConnectionOutDto`, `YandexMetricaSetConnectionInDto`, `YandexAuthCodeInDto`, `YandexAuthLinkOutDto`.
- `src/api/yandex.ts` — 8 функций через `apiFetch`.
- `src/features/seo/services/seoService.ts`, `hooks/{useSeoScopes,useMetricaConnection,useYandexAccounts,useMetricaCounters,useYandexOAuthPopup,useYandexOAuthCallback}.ts`.
- `src/features/seo/ui/{SeoPage,WebmasterStub,MetricaConnectionCard,ConfirmActionModal,ConnectionWizardModal,YandexAccountStep,MetricaCounterStep,YandexOAuthCallback}.tsx`.

### D9. Расширяемый визард
`ConnectionWizardModal` принимает `target: WizardTarget` = `{ key, title, stepTitle, renderStep(props: { account, onDone, onBack }) }`. Шаг 1 (`YandexAccountStep`) — общий. Конфигурация `METRICA_WIZARD_TARGET` рендерит `MetricaCounterStep`; будущий Вебмастер добавит `WEBMASTER_WIZARD_TARGET` с выбором хоста без изменений шага 1. Модалка подтверждения — один переиспользуемый `ConfirmActionModal` (title, текст, pending, error) для отвязки счётчика и аккаунта.

### D10. OAuth popup и callback
- `useYandexOAuthPopup`: `GET link` → `window.open(link, "eqsite-yandex-oauth", "popup,width=600,height=700")` (без `noopener`, opener нужен). Повторный запуск при открытом окне → `focus()`. `null` от `window.open` → состояние «popup заблокирован». Слушатель `message`: принимает только `event.origin === window.location.origin && data?.type === "eqsite:yandex-oauth"`; `success` → refresh аккаунтов с `offset=0`. Поллинг `popup.closed` (500 мс) → снять ожидание и обновить список. Слушатель/таймер очищаются при unmount/закрытии визарда.
- `YandexOAuthCallback`: читает `code`, `state`, `error`; `useRef`-guard гарантирует один POST (StrictMode); `postMessage({type, status, login?}, window.location.origin)`; при `success` и наличии opener — `window.close()`; без opener — результат + ссылка на `/seo`. `code` не показывается и не логируется.
- Истёкшая сессия: стандартный `apiFetch` при неудачном refresh переводит popup на `/login`; родитель по `popup.closed` снимает ожидание. Принято как допустимая деградация.

### D11. Иконка SEO
`RiseOutlined` из `@ant-design/icons` (рост/продвижение; библиотека уже используется в меню — `BellOutlined`, `PhoneOutlined`). Выбор согласован пользователем (Q7).

### D12. Тестовые данные
Дубли нужны только для удобства проверки; получать реальные счётчики через них не требуется (Q3). В БД `yandex-service` (`yandex_user`) вставляются дубли с выдуманными данными для той же конюшни, что и существующая запись: `yandex_id` с префиксом `eqsite-test-dup-`, логин `eqsite-test-dup-N`, имя «Тестовый аккаунт N», email `eqsite-test-dup-N@example.invalid`, телефон `+70000000000`, `enc_access_token/enc_refresh_token = 'invalid-test-ciphertext'`, `token_expires_at = now() + 1 year`. Существующая запись не изменяется; токены не копируются (секреты не дублируются). Следствие: счётчики для дубля возвращают `400` (удобно для проверки error-состояния), happy path счётчиков — на реальном аккаунте. Дубль №1 сохраняется для frontend QA, дубль №2 удаляется в smoke через API.

## Access matrix

Нормативная копия — `specs/yandex-backend-proxy/spec.md` → «Access matrix Yandex proxy». Единственная разрешённая роль — `ADMIN`; нового серверного scope нет. Любая другая роль, включая `SUPERUSER` и `DEVELOPER`, получает `403` до peer.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/yandex/auth/link` | Protected Sensitive Read (исключение) | ADMIN | `401` | `200`; без роли ADMIN `403`; peer `400`/`502` |
| POST | `/api/yandex/auth/code` | Protected Write | ADMIN | `401` | `200`; без роли ADMIN `403`; state ≠ конюшня `403`; тело `400`; peer `400`/`502` |
| GET | `/api/yandex/accounts` | Protected Sensitive Read (исключение) | ADMIN | `401` | `200`; без роли ADMIN `403`; `limit/offset` `400` |
| DELETE | `/api/yandex/accounts/{account_id}` | Protected Write | ADMIN | `401` | `204`; без роли ADMIN `403`; чужой/нет `404`; malformed `400` |
| GET | `/api/yandex/metrica/counters` | Protected Sensitive Read (исключение) | ADMIN | `401` | `200`; без роли ADMIN `403`; чужой/нет `404`; `account_id` `400`; peer `400`/`502` |
| GET | `/api/yandex/metrica/connection` | Protected Sensitive Read (исключение) | ADMIN | `401` | `200` (`counter`/`null`); без роли ADMIN `403` |
| POST | `/api/yandex/metrica/connection` | Protected Write | ADMIN | `401` | `200`; без роли ADMIN `403`; чужой/нет аккаунт `404`; тело `400` |
| DELETE | `/api/yandex/metrica/connection` | Protected Write | ADMIN | `401` | `204` идемпотентно; без роли ADMIN `403` |

Причины исключений: PII аккаунтов (email/телефон), OAuth state/client ID конюшни, данные, полученные по OAuth-токену. Публичных write-исключений нет: `POST auth/code` Protected (D5). Tenant selector (`X-Equestrian-Service-Key`) не используется; email owner-only policy неприменима. Чужой ресурс: `account_id` другой конюшни → `404` (для допущенного `ADMIN`; `SUPERUSER` без ADMIN получает `403` до ownership), привязка адресуется только через сессию.

Frontend: `/seo` — Protected Admin UI (anonymous → `/login`, без роли ADMIN → forbidden-состояние, пункт меню скрыт); `/callbacks/oauth/yandex` — open-маршрут без layout, но его единственный вызов — Protected Write (`401` → стандартный refresh/redirect).

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| `YX-BE-1` | Backend | A — backend proxy | `services/backend/src/{settings.py,clients/yandex_service/**,core/protocols/yandex_service.py,core/services/yandex_proxy.py,depends/services.py}`, `services/backend/.env.example`, `services/backend/README.md`, `services/backend/tests/unit/api/test_yandex_client_boundary.py`, `services/backend/tests/unit/core/services/test_yandex_proxy_service.py` | — | `UT-YX-01..10`, `make test` / `pytest tests/unit`, `mypy` |
| `YX-BE-2` | Backend | A — backend proxy | `services/backend/src/{api/yandex.py,api/__init__.py,main.py}`, `services/backend/maintain/route_inventory.py`, `services/backend/docs/backend-route-inventory.md`, `services/backend/tests/unit/api/{test_yandex_proxy_api.py,test_route_access_inventory.py}` | `YX-BE-1` | `UT-YX-11..23`, `pytest tests/unit`, `mypy` |
| `YX-SMOKE-1` | Backend | B — данные и live | БД `yandex-service` (только вставка дублей); без правок кода | `YX-BE-2` | `SM-YX-01..10` через `.agents/skills/api-smoke-test` на реальной PostgreSQL |
| `YX-FE-1` | Frontend | C — CMS UI | `services/frontend/src/{types/api/yandex.ts,api/yandex.ts,features/seo/services/**,features/seo/hooks/useSeoScopes.ts,features/seo/ui/{SeoPage,WebmasterStub}.tsx,app/(protected)/seo/**,ui/NavigationMenu/**,app/(protected)/layout.tsx}` + тесты рядом | — (контракт из spec) | `FT-YX-01..04`, `npm test`, `npm run lint`, `npx tsc --noEmit` |
| `YX-FE-2` | Frontend | C — CMS UI | `services/frontend/src/features/seo/{hooks/useMetricaConnection.ts,ui/{MetricaConnectionCard,ConfirmActionModal,ConnectionWizardModal}.tsx}` + тесты; правка `SeoPage.tsx` | `YX-FE-1` | `FT-YX-05..08` |
| `YX-FE-3` | Frontend | C — CMS UI | `services/frontend/src/features/seo/{hooks/{useYandexAccounts,useMetricaCounters}.ts,ui/{YandexAccountStep,MetricaCounterStep}.tsx,wizardTargets.ts}` + тесты | `YX-FE-2` | `FT-YX-09..11` |
| `YX-FE-4` | Frontend | C — CMS UI | `services/frontend/src/features/seo/{hooks/{useYandexOAuthPopup,useYandexOAuthCallback}.ts,ui/YandexOAuthCallback.tsx}`, `services/frontend/src/app/(open)/callbacks/oauth/yandex/page.tsx` + тесты; правка `YandexAccountStep.tsx` (подключение «Добавить аккаунт») | `YX-FE-3` | `FT-YX-12..14`, `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` |
| `QG-*` | Quality Gate | — | отчёт `docs/reports/` | `YX-SMOKE-1`, `YX-FE-4` | профиль `QG-FULL` (UI behavior diff) |

### DAG

```text
YX-BE-1 → YX-BE-2 → YX-SMOKE-1 ─────────────────────┐
                                                    ├→ QG-ENV → (QG-BE ∥ QG-FE-AUTO ∥ QG-CONTRACTS) → (QG-LIVE ∥ QG-FE-MANUAL) → QG-FORMAT → QG-SYNTH
YX-FE-1 → YX-FE-2 → YX-FE-3 → YX-FE-4 ──────────────┘
```

Ветки Backend и Frontend независимы (разное ownership, frontend работает на MSW по контракту spec) и могут идти параллельно. `QG-FE-MANUAL` требует данных `YX-SMOKE-1` (дубль аккаунта) и поднятых backend/frontend/`yandex-service`/`ya-metrica-service`.

## Test matrix

### Backend (`UT-YX-*` — unit, `SM-YX-*` — smoke)

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где проверяется |
|---|---|---|---|---|---|
| `UT-YX-01` | unit | контракт клиента | каждый метод клиента формирует ожидаемые URL/method/query/body peer (8 методов, `equestrian_id` из аргумента) | точные URL и параметры | `tests/unit/api/test_yandex_client_boundary.py` |
| `UT-YX-02` | unit | безопасность | запросы клиента без `X-Service-Key`, `Authorization`, cookie | заголовков нет | там же |
| `UT-YX-03` | unit | контракт ответа | peer возвращает лишние поля (`enc_access_token`, `token_expires_at`, `equestrian_id`) | схемы отбрасывают их | там же |
| `UT-YX-04` | unit | внешние ошибки | peer `400` со строковым detail / длинным / не-строкой | `ClientError` с detail / общим сообщением | там же |
| `UT-YX-05` | unit | внешние ошибки | `ConnectError`, timeout, `500`, `404`, невалидный JSON | ошибка категории «unavailable», timeout = 10 с | там же |
| `UT-YX-06` | unit | access/чужой ресурс | ownership: аккаунт в списке конюшни / чужой | ok / `NotFoundError` без целевого вызова | `tests/unit/core/services/test_yandex_proxy_service.py` |
| `UT-YX-07` | unit | граница | ownership при `total > 100` (аккаунт на 2-й странице) и пустом списке | найден / `NotFoundError`, страницы не запрашиваются сверх `total` | там же |
| `UT-YX-08` | unit | access | `state` = чужая конюшня / не UUID / своя | `ForbiddenError` до peer / успех | там же |
| `UT-YX-09` | unit | идемпотентность | delete connection при `counter=null` / при наличии | delete peer не вызван / вызван с `counter.id` | там же |
| `UT-YX-10` | unit | tenant | все use-cases передают peer `actor.equestrian_id`, игнорируя входной | только сессионный tenant | там же |
| `UT-YX-11` | unit | access matrix | anonymous × 8 маршрутов | `401`, клиент не вызван | `tests/unit/api/test_yandex_proxy_api.py` |
| `UT-YX-12` | unit | access matrix | не ADMIN (`SUPERUSER`, `DEVELOPER`, `USER_MANAGER`, остальные роли и отсутствие ролей) × 8 | `403`, клиент не вызван | там же |
| `UT-YX-13` | unit | happy path | только `ADMIN` × 8 маршрутов | статусы/payload по матрице | там же |
| `UT-YX-14` | unit | валидация | `auth/code`: нет/пустой `code`/`state`, не-JSON | `400` (не `422`), без peer | там же |
| `UT-YX-15` | unit | access | `auth/code` со state другой конюшни, лишнее `equestrian_id` в теле | `403`; лишнее поле игнорируется | там же |
| `UT-YX-16` | unit | валидация/граница | `accounts`/`counters`: `limit=abc`, `offset=-1`, `limit=1000` | `400` / нормализация передана peer | там же |
| `UT-YX-17` | unit | чужой ресурс | `DELETE accounts`: malformed / чужой (запрос от `ADMIN`) / свой | `400` / `404` без delete / `204` | там же |
| `UT-YX-18` | unit | чужой ресурс | `counters`: нет/malformed `account_id` / чужой | `400` / `404` без counters-вызова | там же |
| `UT-YX-19` | unit | валидация | `POST connection`: `counter_id` пустой/`12a`/32 цифры/число; чужой аккаунт; `equestrian_id` в теле | `400` / приведение к строке / `404` / игнор | там же |
| `UT-YX-20` | unit | идемпотентность | `DELETE connection` дважды | `204`, `204` | там же |
| `UT-YX-21` | unit | контракт ответа | ответы всех GET/POST не содержат token/expiry/avatar/`equestrian_id` | whitelist | там же |
| `UT-YX-22` | unit | внешние ошибки | peer `400` → `400` detail; peer down → `502` без hostname | статусы, тело без URL | там же |
| `UT-YX-23` | unit | регрессия инвентаря | новые 8 маршрутов классифицированы, счётчик обновлён (112 → 120), артефакт актуален | тест инвентаря зелёный | `tests/unit/api/test_route_access_inventory.py` |
| `SM-YX-01` | smoke | access, реальный стек | anonymous × 8 маршрутов | `401` | `.agents/skills/api-smoke-test` |
| `SM-YX-02` | smoke | happy path | login `ADMIN` конюшни теста → `GET connection` | `200`, `counter` = null или объект | там же |
| `SM-YX-03` | smoke | PostgreSQL/контракт | `GET accounts` | реальный аккаунт + дубли, без token-полей | там же + SQL `yandex_user` |
| `SM-YX-04` | smoke | happy path | `GET auth/link` | `200`, `state` = `equestrian_id`, нет client secret | там же |
| `SM-YX-05` | smoke | внешние ошибки/access | `POST auth/code` с выдуманным code + своим state; с чужим state | `400` безопасный detail; `403` | там же |
| `SM-YX-06` | smoke | внешние ошибки | `GET counters` реального аккаунта; дубля (невалидный ciphertext) | `200` (или `400` при истёкшем токене — зафиксировать); `400` | там же |
| `SM-YX-07` | smoke | PostgreSQL/транзакционность | `POST connection` (дубль №1 + выдуманный `counter_id`), повтор с другим `counter_id` | `200`; в `yandex_metrica_counters` одна строка конюшни с новым `counter_id` | там же + SQL |
| `SM-YX-08` | smoke | идемпотентность/PostgreSQL | `DELETE connection` дважды | `204`, `204`; строки нет | там же + SQL |
| `SM-YX-09` | smoke | чужой ресурс/валидация | `DELETE accounts/{random uuid}`, `/not-a-uuid`; `DELETE` дубля №2 дважды | `404`, `400`; `204`, затем `404`; строка дубля №2 удалена, реальная запись цела | там же + SQL |
| `SM-YX-10` | smoke | access | пользователь без роли ADMIN (если есть в БД) × 8 | `403`; если такого пользователя нет — `не выполнено` с причиной, покрытие `UT-YX-12` | там же |

Оси: happy path (`UT-YX-13`, `SM-YX-02..04`); валидация (`UT-YX-14,16,19`); внешние ошибки (`UT-YX-04,05,22`, `SM-YX-05,06`); идемпотентность/транзакционность (`UT-YX-09,20`, `SM-YX-07,08`); access matrix (`UT-YX-06,08,11,12,15,17,18`, `SM-YX-01,05,09,10`); реальная PostgreSQL (`SM-YX-03,07,08,09`); контракт ответа (`UT-YX-03,21`, `SM-YX-03`); регрессия (`UT-YX-23`). Конкурентность — неприменимо: backend не пишет в собственную БД, upsert выполняет peer (его ограничение зафиксировано в `yandex-oauth-accounts`).

Трассировка: `UT-YX-01..03` → «Ответы прокси не содержат секретов», «Отсутствие peer-service credential»; `UT-YX-04,05,22` → «Маппинг ошибок»; `UT-YX-06,07,17,18` → «Проверка принадлежности аккаунта»; `UT-YX-08,15` → «Проверка state OAuth»; `UT-YX-09,20` → «Удаление привязки счётчика»; `UT-YX-10` → «Конюшня выводится из сессии»; `UT-YX-11..13` → строки access matrix; `UT-YX-14` → «Обмен кода»; `UT-YX-16` → «Список аккаунтов», «Список счётчиков»; `UT-YX-19` → «Установка привязки»; `UT-YX-23` → «Классификация в route inventory».

### Frontend (`FT-YX-*`)

| ID | Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|---|
| `FT-YX-01` | `src/api/yandex.ts` | 8 API-функций, query `limit/offset/search` | API-boundary (MSW): URL/method/body, success, error detail, `401`, `403` | `401/403` surfaced | `npm test` |
| `FT-YX-02` | `features/seo/services/seoService.ts` | оркестрация и mapping | 3+ unit: success, empty (`counter:null`, `items:[]`), error | — | `npm test` |
| `FT-YX-03` | `ui/NavigationMenu`, `layout.tsx` | пункт «SEO» + `RiseOutlined`, active key, заголовок | component: виден только для ADMIN; скрыт для SUPERUSER, DEVELOPER, USER_MANAGER, остальных и без ролей, active на `/seo` | ADMIN / не ADMIN | `npm test` |
| `FT-YX-04` | `SeoPage`, `WebmasterStub`, `app/(protected)/seo` | вкладки, заглушка, forbidden | component: default tab, переключение, заглушка без сетевых вызовов (MSW unhandled = fail), forbidden без роли ADMIN без запросов; anonymous redirect — существующий guard | anonymous/authenticated/не ADMIN | `npm test` |
| `FT-YX-05` | `useMetricaConnection` | load/refresh/unlink | hook: success linked/null, error, refresh после unlink, локальной проверкой ADMIN перед DELETE | не ADMIN → мутация не вызвана | `npm test` |
| `FT-YX-06` | `MetricaConnectionCard` | 4 состояния блока | component: loading, not linked (+кнопка), linked (поля счётчика/аккаунта), error+retry, кнопки disabled без роли ADMIN | ADMIN / не ADMIN | `npm test` |
| `FT-YX-07` | `ConfirmActionModal` (отвязка счётчика) | подтверждение мутации | modal: open/close, confirm success → refresh, backend error держит модалку, double-submit → 1 запрос, `403` сообщение | Protected Write UX, `401/403` | `npm test` |
| `FT-YX-08` | `ConnectionWizardModal` | 2 шага, слот цели | component: «Далее» disabled без аккаунта, переход, «Назад» сохраняет выбор, рендер кастомной цели, сброс при закрытии | — | `npm test` |
| `FT-YX-09` | `YandexAccountStep`, `useYandexAccounts` | список, догрузка, «Добавить аккаунт» | list: data, loading, empty, error, выбор; pagination: initial `{limit:20, offset:0}`, «Показать ещё» `offset=loaded`, refresh сбрасывает `offset=0`; пункт «Добавить аккаунт» последний | не ADMIN → «Добавить»/отвязка скрыты | `npm test` |
| `FT-YX-10` | отвязка аккаунта | confirm с предупреждением о каскаде | modal: confirm → DELETE + refresh списка и блока, cancel, `404` → сообщение + refresh, error, сброс выбора | Protected Write UX, `403` | `npm test` |
| `FT-YX-11` | `MetricaCounterStep`, `useMetricaCounters` | поиск, пагинация, привязка | pagination: initial `limit/offset`, page change, page size change, search сбрасывает `offset`; debounce 300 мс; bind success закрывает визард и обновляет блок; error сохраняет выбор; double-submit | Protected Write UX, `403` | `npm test` |
| `FT-YX-12` | `useYandexOAuthPopup` | popup, сообщения | hook: open с link, focus существующего, blocked (`window.open` → null), link error, message success → refresh, чужой origin/тип игнор, `popup.closed` → refresh, cleanup | — | `npm test` |
| `FT-YX-13` | `YandexOAuthCallback`, `app/(open)/callbacks/oauth/yandex` | обмен кода | component: один POST в StrictMode, нет `code`/`state` → без POST, `error=access_denied` → cancelled, backend error без показа `code`, `postMessage` в `window.location.origin`, `close()` при opener, без opener — ссылка `/seo` | ADMIN → success; SUPERUSER/DEVELOPER и остальные без ADMIN → `403`; `401` → стандартный client flow | `npm test` |
| `FT-YX-14` | self-checks | архитектура | `rg` checks из `agents/planner.md` §2.2: нет raw fetch вне `src/api/client.ts`, нет `@/api` в app/features (кроме services), нет `page/pageSize` в API/types, нет `site-*`, нет `shared/widgets/entities` | no `site-*` mixing | `rg …`, `npm run lint`, `npx tsc --noEmit`, `npm run build` |

Unit/component/API-boundary тесты используют только MSW/mocks, live backend запрещён.

## PostgreSQL для smoke-тестов

Discovery на момент планирования (исполнитель `YX-SMOKE-1` обязан повторить `docker ps` + `docker inspect` и брать параметры из `Config.Env`/`NetworkSettings.Ports`, пароли в отчёт не выводить):

| Назначение | Контейнер | Labels | DB / user (`Config.Env`) | Host port `5432/tcp` |
|---|---|---|---|---|
| Основная БД backend | `eqsitecms-db` | `com.docker.compose.project=eqsitecms`, `service=db` | `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms` | `5433` |
| БД `yandex-service` | `eqsitecms-db-yandex` | `com.docker.compose.project=eqsitecms-infra`, `service=db-yandex` | `POSTGRES_DB=eqsitecmsyandex`, `POSTGRES_USER=eqsitecmsyandex` | `5438` |

Состояние на момент планирования: в `yandex_user` одна запись (конюшня `5f6496aa-4fe9-42da-a763-29f9bab22d73` «Александрова дача»), `yandex_metrica_counters` пуста. Запущены `eqsitecms-yandex-service`, `eqsitecms-db*`; backend, frontend и `ya-metrica-service` не запущены — их поднимает исполнитель smoke / `QG-ENV` через `scripts/stackctl` (skill `stack-control`). Если контейнер не найден — технический блокер, параметры не придумываются.

## Manual QA steps (UI тестирование)

Выполняются в lane `QG-FE-MANUAL` (`.agents/skills/ui-qa`, scripted Playwright + evidence). Предусловия: стек поднят (backend, frontend `http://localhost:3001`, `yandex-service`, `ya-metrica-service`), выполнен `YX-SMOKE-1` (дубль №1 существует), есть пользователь `ADMIN` конюшни `5f6496aa-…` и, если есть, пользователь без роли ADMIN. Viewports: desktop 1440×900, tablet 768×1024, mobile 390×844.

| Шаг | Предусловие / URL | Действие | Ожидаемый результат |
|---|---|---|---|
| M-01 | anonymous, `/seo` | открыть URL | редирект на `/login` |
| M-02 | anonymous, `/callbacks/oauth/yandex?state=<uuid>&code=x` | открыть URL | POST `401` → стандартный refresh-flow → `/login`; `code` нигде не отображается |
| M-03 | login без роли ADMIN (если есть) | осмотреть меню, открыть `/seo` по URL | пункта «SEO» нет; страница показывает forbidden, в network нет `/api/yandex/**` |
| M-04 | login `ADMIN` | осмотреть меню | пункт «SEO» с иконкой `RiseOutlined`; клик → `/seo`, пункт активен, заголовок «SEO» |
| M-05 | `/seo` | осмотреть вкладки | «Яндекс.Метрика» активна, «Яндекс.Вебмастер» есть |
| M-06 | `/seo` | вкладка «Яндекс.Вебмастер» | заглушка «Функционал в разработке», сетевых запросов нет |
| M-07 | привязки нет | вкладка «Яндекс.Метрика» | блок «Яндекс.Метрика не привязана» + кнопка «Привязать» |
| M-08 | M-07 | «Привязать» | визард, шаг 1: реальный аккаунт, дубль №1, последним — «Добавить аккаунт»; «Далее» disabled |
| M-09 | шаг 1 | выбрать дубль №1 → «Далее» | шаг 2: загрузка счётчиков → ошибка (невалидный токен дубля) с понятным текстом; визард открыт; «Назад» возвращает с сохранённым выбором |
| M-10 | шаг 1 | выбрать реальный аккаунт → «Далее» | список счётчиков (или ошибка истёкшего токена — зафиксировать); поиск: ввод строки → через ~300 мс запрос с `offset=0&search=…`; смена страницы/размера → корректные `limit/offset` |
| M-11 | M-10 со счётчиками | выбрать счётчик → «Привязать», быстро дважды | ровно один POST `200`; визард закрыт; блок показывает номер счётчика и данные аккаунта; уведомление об успехе |
| M-12 | привязано | «Отвязать» → «Отмена» | запроса нет, привязка на месте |
| M-13 | привязано | «Отвязать» → подтвердить | DELETE `204`, блок «не привязано» |
| M-14 | шаг 1 визарда | «Добавить аккаунт» | открывается мини-окно Яндекса ~600×700; визард в ожидании; повторный клик фокусирует то же окно |
| M-15 | M-14 | закрыть мини-окно вручную | ожидание снято, список перезагружен, ошибок нет |
| M-16 | popup заблокирован (настройка браузера/скрипт) | «Добавить аккаунт» | сообщение о блокировке всплывающих окон, кнопка повтора |
| M-17 | вне popup | открыть `/callbacks/oauth/yandex?state=<своя конюшня>&code=dgbfqqwhtcztkwun&cid=…` | один POST; ответ `400` (код недействителен) → безопасная ошибка, ссылка «Перейти в раздел SEO», окно не закрывается |
| M-18 | вне popup | открыть callback с `state` другой конюшни | `403` → сообщение об ошибке; без `code` в тексте |
| M-19 | вне popup | открыть callback без `code` и с `?error=access_denied` | без POST: «Некорректная ссылка» / «Авторизация отменена» |
| M-20 | реальная авторизация (по возможности, требует учётки Яндекса) | «Добавить аккаунт» → войти в Яндекс | popup закрывается сам, список обновлён, аккаунт в списке; если учётка недоступна — `не выполнено` с причиной, покрытие `FT-YX-12/13` |
| M-21 | шаг 1, дубль №1 | отвязка → модалка с предупреждением о каскаде → «Отмена», затем подтвердить | отмена — без запроса; подтверждение — DELETE `204`, дубль исчез; если дубль был выбран — выбор сброшен. После шага пересоздать дубль №1 SQL-скриптом из `YX-SMOKE-1`, если нужен для повторов |
| M-22 | ошибки backend | остановить `yandex-service` и открыть `/seo` | блок показывает ошибку (`502`) и «Повторить»; после запуска сервиса повтор успешен |
| M-23 | `403` на мутации | (через route mock Playwright) ответить `403` на DELETE connection | модалка показывает отказ, состояние не меняется |
| M-24 | responsive | M-07, M-08, M-11 на трёх viewports | нет overlap текста/кнопок, модалка визарда и списки помещаются, кнопки шагов доступны, горизонтального скролла страницы нет |
| M-25 | регрессия | открыть `/notifications`, `/site-settings` | меню и страницы работают как раньше; `site-*` не затронуты |

Итоговый отчёт: passed/failed по шагам, screenshots для failed responsive/error/permission, network status/body для failed API.

## Quality Gate

Профиль `QG-FULL` (UI behavior diff, 2 сервиса с кодом). Lanes: `QG-ENV` → (`QG-BE` ∥ `QG-FE-AUTO` ∥ `QG-CONTRACTS`) → (`QG-LIVE` ∥ `QG-FE-MANUAL`) → `QG-FORMAT` (scoped: `services/backend`, `services/frontend`) → `QG-SYNTH`. `QG-CONTRACTS`: access matrix/route inventory; AsyncAPI — неприменимо (NATS не затронут). `QG-LIVE` переиспользует `SM-YX-*`. После `APPROVED`: sync specs → validate → archive (Router).

## Risks / Trade-offs

- [Peer без auth и с открытым host-портом `EXPOSE_YANDEX_SERVICE_PORT`] → прокси не добавляет защиты на уровне сети; ограничение `yandex-peer-http-contract` (production release блокируется без подтверждения изоляции) сохраняется и выносится в отчёт QG.
- [Peer упаковывает внутренние ошибки в `400`] → backend транслирует их как `400` с безопасным detail; различить невозможно без изменения peer.
- [Ownership-проверка — лишний запрос и гонка «проверил → удалил»] → окно гонки только внутри одной конюшни; приемлемо.
- [Токен Яндекса истёк, refresh в peer отсутствует] → счётчики вернут `400`; UI показывает ошибку, пользователь переавторизует аккаунт через «Добавить аккаунт» (peer обновит токены той же записи).
- [Peer не проверяет, что счётчик доступен аккаунту] → UI предлагает только счётчики из списка; прямой POST с произвольным `counter_id` сохранит его (согласовано в Q4; backend не делает дополнительный запрос проверки).
- [Удаление аккаунта каскадно удаляет привязку] → предупреждение в модалке подтверждения, блок перезагружается.
- [Истёкшая сессия в popup ведёт на `/login` внутри popup] → допустимая деградация (D10).
- [Код OAuth одноразовый, StrictMode дублирует эффекты] → `useRef`-guard + тест `FT-YX-13`.

## Migration Plan

Миграций БД нет. Деплой: добавить `YANDEX_SERVICE_URL` в `.env` backend, перезапустить backend и frontend. Откат — удаление роутера/пункта меню; данные peer не меняются (кроме тестовых дублей в dev). В `services/yandex-service/.env` redirect URI уже указывает на `http://localhost:3001/callbacks/oauth/yandex`; для других окружений redirect URI приложения Яндекса должен совпадать с URL CMS.

## Согласованные уточнения

Approval на реализацию уже получен; Q1–Q8 закрыты, новый approval gate не требуется.

- **Q1.** Только существующая роль `ADMIN`, без доступа для `SUPERUSER`/`DEVELOPER`, без отдельной роли SEO или нового серверного scope. Локальный permission guard допустим; расширение SEO-прав отложено.
- **Q2.** Каскадное удаление привязки при отвязке аккаунта принимается; UI предупреждает и обновляет блок.
- **Q3.** Тестовые дубли — только для удобства проверки; реальные счётчики для них необязательны. Реальные токены не копируются, happy path счётчиков — на настоящем аккаунте.
- **Q4.** Backend не проверяет доступность `counter_id` аккаунту; синтаксическая валидация и ownership аккаунта сохраняются.
- **Q5.** Consumer read не нужен; GET защищены.
- **Q6.** Номера счётчика достаточно; название сайта не храним и дополнительно не подгружаем.
- **Q7.** `RiseOutlined` принят.
- **Q8.** Повреждения файла задачи — шум, дополнительных требований не вводим.
