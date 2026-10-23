# Tasks — add-yandex-seo-integration

Backend (deliverable A, B) и Frontend (deliverable C) — непересекающиеся ownership-ветки, которые можно выполнять параллельно; test matrix, access matrix, Manual QA и DAG находятся в `design.md` (`## Test matrix`, `## Access matrix`, `## Manual QA steps (UI тестирование)`, `## Execution units`) и здесь не дублируются.

`contextFiles` перечислены **по units**, а не общим списком на весь change. Каждый unit завершается пунктом `.V` — verification своего unit, отметка выполненных checkbox и handoff Router по формату `AGENTS.md`.

## Execution units

| Unit | Профиль | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| `YX-BE-1` | Backend | `services/backend/src/{settings.py,clients/yandex_service/**,core/protocols/yandex_service.py,core/services/yandex_proxy.py,depends/services.py}`, `.env.example`, `README.md`, `tests/unit/api/test_yandex_client_boundary.py`, `tests/unit/core/services/test_yandex_proxy_service.py` | — | `UT-YX-01..10`; `make test`; `uv run mypy src` | `design.md#decisions` (D1, D3–D7), `design.md#test-matrix`, `specs/yandex-backend-proxy/spec.md`, `services/backend/src/clients/vk_service/**`, `services/backend/src/core/services/vk_proxy.py`, `services/yandex-service/src/core/schemas/api/*.py` |
| `YX-BE-2` | Backend | `services/backend/src/{api/yandex.py,api/__init__.py,main.py}`, `maintain/route_inventory.py`, `docs/backend-route-inventory.md`, `tests/unit/api/{test_yandex_proxy_api.py,test_route_access_inventory.py}` | `YX-BE-1` | `UT-YX-11..23`; `make test`; `uv run mypy src` | handoff `YX-BE-1`, `design.md#access-matrix`, `design.md#test-matrix`, `specs/yandex-backend-proxy/spec.md`, `services/backend/src/api/vks.py`, `services/backend/src/api/site_settings.py` (только образец маршрутов; широкий scope не переиспользовать), `services/backend/tests/unit/api/test_vk_proxy_api.py` |
| `YX-SMOKE-1` | Backend | БД `yandex-service` (только INSERT/DELETE тестовых дублей), без правок кода | `YX-BE-2` | `SM-YX-01..10` через `.agents/skills/api-smoke-test` на реальной PostgreSQL | handoff `YX-BE-2`, `design.md#d12-тестовые-данные`, `design.md#postgresql-для-smoke-тестов`, `design.md#test-matrix` (SM), `.agents/skills/api-smoke-test`, `.agents/skills/stack-control` |
| `YX-FE-1` | Frontend | `services/frontend/src/{types/api/yandex.ts,api/yandex.ts,features/seo/services/**,features/seo/hooks/useSeoScopes.ts,features/seo/ui/{SeoPage,WebmasterStub}.tsx,app/(protected)/seo/**,ui/NavigationMenu/**,app/(protected)/layout.tsx}` + тесты рядом | — | `FT-YX-01..04`; `npm test`; `npm run lint`; `npx tsc --noEmit` | `design.md#d8-frontend-одна-фича-seo`, `design.md#d11-иконка-seo`, `design.md#test-matrix` (FT), `specs/yandex-backend-proxy/spec.md` (контракт API), `specs/cms-seo-yandex-ui/spec.md`, `services/frontend/src/api/vk.ts`, `services/frontend/src/features/notifications/**` (образец) |
| `YX-FE-2` | Frontend | `services/frontend/src/features/seo/{hooks/useMetricaConnection.ts,ui/{MetricaConnectionCard,ConfirmActionModal,ConnectionWizardModal}.tsx}` + тесты; правка `features/seo/ui/SeoPage.tsx` | `YX-FE-1` | `FT-YX-05..08`; `npm test`; `npm run lint`; `npx tsc --noEmit` | handoff `YX-FE-1`, `design.md#d9-расширяемый-визард`, `design.md#test-matrix` (FT), `specs/cms-seo-yandex-ui/spec.md` |
| `YX-FE-3` | Frontend | `services/frontend/src/features/seo/{hooks/{useYandexAccounts,useMetricaCounters}.ts,ui/{YandexAccountStep,MetricaCounterStep}.tsx,wizardTargets.ts}` + тесты | `YX-FE-2` | `FT-YX-09..11`; `npm test`; `npm run lint`; `npx tsc --noEmit` | handoff `YX-FE-2`, `design.md#d9-расширяемый-визард`, `design.md#test-matrix` (FT), `specs/cms-seo-yandex-ui/spec.md` |
| `YX-FE-4` | Frontend | `services/frontend/src/features/seo/{hooks/{useYandexOAuthPopup,useYandexOAuthCallback}.ts,ui/YandexOAuthCallback.tsx}`, `services/frontend/src/app/(open)/callbacks/oauth/yandex/page.tsx` + тесты; правка `features/seo/ui/YandexAccountStep.tsx` | `YX-FE-3` | `FT-YX-12..14`; `npm test`; `npm run lint`; `npx tsc --noEmit`; `npm run build` | handoff `YX-FE-3`, `design.md#d10-oauth-popup-и-callback`, `design.md#test-matrix` (FT), `specs/yandex-oauth-cms-callback/spec.md`, `services/frontend/src/app/(open)/callback/email/page.tsx` |
| `QG` | Quality Gate | `docs/reports/**` | `YX-SMOKE-1`, `YX-FE-4` | `QG-FULL` lanes по DAG | `design.md#quality-gate`, `design.md#access-matrix`, `design.md#test-matrix`, `design.md#manual-qa-steps-ui-тестирование`, все `specs/**` |

## 1. YX-BE-1 — клиент yandex-service и доменный прокси-сервис (профиль: Backend)

**Specs:** `yandex-backend-proxy` · **Пути:** см. таблицу · **Зависит от:** —

- [x] YX-BE-1.1 Добавить `yandex_service_url` (ENV `YANDEX_SERVICE_URL`, default `http://eqsitecms-yandex-service:8000`) в `src/settings.py`, строку в `.env.example` и описание в `README.md`; проверка — `grep YANDEX_SERVICE_URL` в трёх файлах.
- [x] YX-BE-1.2 Создать `src/clients/yandex_service/schemas.py`: whitelist-схемы аккаунта (6 полей), страницы аккаунтов, ссылки, счётчика (`counter_id: int`, `site`), страницы счётчиков, привязки и `{counter}`; request-схемы `{code, state}` и `{yandex_account_id, counter_id}` (counter_id: 1..31 цифр, число → строка) без `extra="forbid"`; проверка — `UT-YX-03`.
- [x] YX-BE-1.3 Создать `src/clients/yandex_service/client.py` (8 методов peer по `design.md` → Context, timeout 10 с, без peer credential, маппинг peer `400` → `ClientError(detail ≤ 300 | общий)`, иное/сеть/невалидный JSON → ошибка категории unavailable) и протокол `src/core/protocols/yandex_service.py`; проверка — `UT-YX-01,02,04,05`.
- [x] YX-BE-1.4 Создать `src/core/services/yandex_proxy.py`: tenant из `actor.equestrian_id`, проверка `state` (`ForbiddenError`), постраничная ownership-проверка аккаунта (`NotFoundError`), idempotent delete connection через чтение привязки, use-cases для 8 операций; проверка — `UT-YX-06..10`.
- [x] YX-BE-1.5 Зарегистрировать `get_yandex_service_client` и `get_yandex_proxy_service` в `src/depends/services.py` по образцу VK; проверка — импорт и `mypy`.
- [x] YX-BE-1.6 Реализовать и прогнать `UT-YX-01..05` в `tests/unit/api/test_yandex_client_boundary.py` (httpx mock transport, без живого peer).
- [x] YX-BE-1.7 Реализовать и прогнать `UT-YX-06..10` в `tests/unit/core/services/test_yandex_proxy_service.py` (fake client по протоколу).
- [x] YX-BE-1.V Прогнать из `services/backend` `make test`, `uv run mypy src`, `uv run isort src && uv run black src` (или `make format`, если это принятый форматтер); отметить выполненные task IDs и вернуть handoff (сигнатуры use-cases и класс ошибки «unavailable» — для `YX-BE-2`).

## 2. YX-BE-2 — API-роутер, access control и route inventory (профиль: Backend)

**Specs:** `yandex-backend-proxy` · **Пути:** см. таблицу · **Зависит от:** `YX-BE-1`

- [x] YX-BE-2.1 Создать `src/api/yandex.py` (router `prefix="/yandex"`) с локальным guard `require_yandex_admin` (только существующая роль `ADMIN`, без нового серверного scope; `SUPERUSER`, `DEVELOPER` и остальные → `ForbiddenError`) на всех 8 маршрутах и трансляцией ошибки «unavailable» в `HTTPException(502, "Yandex service unavailable")`; проверка — `UT-YX-11,12,22`.
- [x] YX-BE-2.2 Реализовать маршруты auth: `GET /auth/link`, `POST /auth/code` (тело `{code, state}`, malformed/пустые → `400`); проверка — `UT-YX-13..15`.
- [x] YX-BE-2.3 Реализовать маршруты аккаунтов: `GET /accounts` (`search`, `limit`, `offset`), `DELETE /accounts/{account_id}` с ручным парсингом UUID → `400` (не `422`); проверка — `UT-YX-16,17`.
- [x] YX-BE-2.4 Реализовать маршруты Метрики: `GET /metrica/counters`, `GET|POST|DELETE /metrica/connection`; проверка — `UT-YX-18..21`.
- [x] YX-BE-2.5 Подключить router в `src/api/__init__.py` и `src/main.py`; классифицировать 8 маршрутов в `maintain/route_inventory.py` (GET — `protected GET exception`, записи — protected write по существующей номенклатуре), перегенерировать `docs/backend-route-inventory.md`, обновить счётчик в `test_route_access_inventory.py` и добавить ассерты классов; проверка — `UT-YX-23`.
- [x] YX-BE-2.6 Реализовать и прогнать `UT-YX-11..16` в `tests/unit/api/test_yandex_proxy_api.py` (anonymous × 8, без роли ADMIN × 8, happy path только ADMIN; denied для SUPERUSER/DEVELOPER/остальных, валидация auth/code и пагинации).
- [x] YX-BE-2.7 Реализовать и прогнать `UT-YX-17..22` там же (чужой ресурс от `ADMIN`; `SUPERUSER` без ADMIN → `403` до ownership, counters/connection валидация, идемпотентность, отсутствие секретов в ответах, маппинг `400/502` без hostname).
- [x] YX-BE-2.V Прогнать из `services/backend` `make test`, `uv run mypy src`, форматирование; отметить task IDs и вернуть handoff (итоговые пути, имя локального ADMIN-guard, классы inventory).

## 3. YX-SMOKE-1 — тестовые данные и live smoke на реальной PostgreSQL (профиль: Backend)

**Specs:** `yandex-backend-proxy` · **Пути:** только данные БД `yandex-service` · **Зависит от:** `YX-BE-2`

- [x] YX-SMOKE-1.1 Выполнить discovery PostgreSQL: `docker ps` + `docker inspect` для `eqsitecms-db` и `eqsitecms-db-yandex` (labels, `POSTGRES_DB/USER/PASSWORD` из `Config.Env`, host port `5432/tcp`); параметры не хардкодить, пароли в handoff не выводить; при отсутствии контейнера — `blocked`.
- [x] YX-SMOKE-1.2 Поднять backend (с `YANDEX_SERVICE_URL`), `yandex-service`, `ya-metrica-service` через `scripts/stackctl` (skill `stack-control`); проверка — health `200`.
- [x] YX-SMOKE-1.3 Сделать SELECT существующей записи `yandex_user` (только `id, equestrian_id, yandex_login` — без токенов) и вставить дубли №1 и №2 по `design.md` → D12 (тот же `equestrian_id`, выдуманные данные, `invalid-test-ciphertext`); существующую запись не изменять; проверка — `count(*)` = исходное + 2, исходная строка неизменна. Сохранить SQL вставки в handoff для повторного использования в QA.
- [x] YX-SMOKE-1.4 Выполнить `SM-YX-01..05` через `.agents/skills/api-smoke-test` (anonymous, login `ADMIN`, connection, accounts, auth link, auth code с выдуманным кодом и чужим state).
- [x] YX-SMOKE-1.5 Выполнить `SM-YX-06..09` через `.agents/skills/api-smoke-test` с SQL-проверками в реальной БД `yandex-service` (counters, установка/замена/удаление привязки, удаление дубля №2 и чужого/malformed ID; дубль №1 и реальная запись остаются).
- [x] YX-SMOKE-1.6 Выполнить `SM-YX-10` (пользователь без роли ADMIN, если существует; иначе зафиксировать `не выполнено` с причиной).
- [x] YX-SMOKE-1.V Вернуть handoff: таблица `SM-YX-*` (status/краткое тело), состояние БД после smoke (дубль №1 есть, привязки нет), найденные контейнеры/порты без паролей.

## 4. YX-FE-1 — API boundary, меню SEO и страница с вкладками (профиль: Frontend)

**Specs:** `cms-seo-yandex-ui` · **Пути:** см. таблицу · **Зависит от:** — (контракт из `specs/yandex-backend-proxy/spec.md`)

- [x] YX-FE-1.1 Добавить DTO в `src/types/api/yandex.ts` (`*InDto`/`*OutDto` по `design.md` → D8); проверка — `npx tsc --noEmit`.
- [x] YX-FE-1.2 Добавить `src/api/yandex.ts` (8 функций через `apiFetch`, query только `limit/offset/search/account_id`); проверка — `FT-YX-01`.
- [x] YX-FE-1.3 Добавить `src/features/seo/services/seoService.ts` и registry `src/features/seo/hooks/useSeoScopes.ts` (`SEO_ACTIONS → ADMIN`, локальный `hasPermission` по существующей роли admin; имя файла не означает новый серверный scope); проверка — `FT-YX-02`.
- [x] YX-FE-1.4 Добавить пункт «SEO» (`RiseOutlined`, видимость по роли ADMIN, active key `/seo`) в `src/ui/NavigationMenu/NavigationMenu.tsx` и заголовок `"/seo": "SEO"` в `src/app/(protected)/layout.tsx`; проверка — `FT-YX-03`.
- [x] YX-FE-1.5 Добавить `src/app/(protected)/seo/page.tsx` (только рендер `SeoPage`), `SeoPage.tsx` (AntD `Tabs`: «Яндекс.Метрика» по умолчанию с placeholder-слотом для блока, «Яндекс.Вебмастер»; forbidden-состояние без роли ADMIN) и `WebmasterStub.tsx`; проверка — `FT-YX-04`.
- [x] YX-FE-1.6 Реализовать и прогнать `FT-YX-01..04` (MSW success/empty/error/`401`/`403`, ADMIN / не ADMIN, отсутствие сетевых вызовов на заглушке и forbidden).
- [x] YX-FE-1.V Прогнать из `services/frontend` `npm test`, `npm run lint`, `npx tsc --noEmit`; отметить task IDs и вернуть handoff (имена API-функций, сервиса и registry).

## 5. YX-FE-2 — блок привязки Метрики, модалка подтверждения и каркас визарда (профиль: Frontend)

**Specs:** `cms-seo-yandex-ui` · **Пути:** см. таблицу · **Зависит от:** `YX-FE-1`

- [x] YX-FE-2.1 Добавить `hooks/useMetricaConnection.ts` (load/refresh, `unlinkCounter` с повторной проверкой роли ADMIN и защитой от двойной отправки, состояния loading/error/pending); проверка — `FT-YX-05`.
- [x] YX-FE-2.2 Добавить `ui/ConfirmActionModal.tsx` (переиспользуемая модалка: title, текст/предупреждение, pending, error, confirm/cancel); проверка — `FT-YX-07`.
- [x] YX-FE-2.3 Добавить `ui/MetricaConnectionCard.tsx` (loading, «не привязано» + «Привязать», «привязано» с номером счётчика и аккаунтом + «Отвязать», error + «Повторить»; кнопки ADMIN-aware) и подключить его во вкладку «Яндекс.Метрика» `SeoPage.tsx`; проверка — `FT-YX-06`.
- [x] YX-FE-2.4 Добавить `ui/ConnectionWizardModal.tsx` (двухшаговый AntD `Modal` + `Steps`, тип `WizardTarget` в `src/types` или рядом как UI props, слот шага 1 через prop, «Далее» disabled без аккаунта, «Назад», сброс при закрытии) и открыть его из «Привязать» (шаг 1/2 — временные заглушки до `YX-FE-3`); проверка — `FT-YX-08`.
- [x] YX-FE-2.5 Реализовать и прогнать `FT-YX-05..08` (MSW; open/close, confirm success → refresh, backend error держит модалку, double-submit → 1 запрос, `403`, навигация шагов, кастомная цель).
- [x] YX-FE-2.V Прогнать `npm test`, `npm run lint`, `npx tsc --noEmit`; отметить task IDs и вернуть handoff (контракт `WizardTarget` и props шага 1).

## 6. YX-FE-3 — шаг аккаунтов и цель «счётчик Метрики» (профиль: Frontend)

**Specs:** `cms-seo-yandex-ui` · **Пути:** см. таблицу · **Зависит от:** `YX-FE-2`

- [x] YX-FE-3.1 Добавить `hooks/useYandexAccounts.ts` (initial `{limit:20, offset:0}`, «Показать ещё», `refresh()` с `offset=0`, `unlinkAccount` с локальной проверкой ADMIN и защитой от двойной отправки, `404` → сообщение + refresh); проверка — `FT-YX-09,10`.
- [x] YX-FE-3.2 Добавить `ui/YandexAccountStep.tsx` (список с именем/логином/email, выбор, loading/empty/error, отвязка через `ConfirmActionModal` с предупреждением о каскадном удалении привязки, последним пунктом «Добавить аккаунт» с колбэком `onAddAccount`); после отвязки — refresh списка и блока привязки, сброс выбора; проверка — `FT-YX-09,10`.
- [x] YX-FE-3.3 Добавить `hooks/useMetricaCounters.ts` (search с debounce 300 мс через `src/hooks/useDebounce.ts`, сброс `offset` на search/page size, page→`{limit, offset}` до API boundary, `bindCounter` с локальной проверкой ADMIN и защитой от двойной отправки); проверка — `FT-YX-11`.
- [x] YX-FE-3.4 Добавить `ui/MetricaCounterStep.tsx` (поиск, список `counter_id`/`site`, пагинация, выбор, «Привязать», ошибки без потери выбора) и `wizardTargets.ts` с `METRICA_WIZARD_TARGET`; подключить в визард вместо заглушек; успех закрывает визард и обновляет блок; проверка — `FT-YX-11`.
- [x] YX-FE-3.5 Реализовать и прогнать `FT-YX-09..11` (list data/loading/empty/error/interaction, pagination 4 сценария, debounce, bind success/error/double-submit, `403`, `404` при отвязке).
- [x] YX-FE-3.V Прогнать `npm test`, `npm run lint`, `npx tsc --noEmit`; отметить task IDs и вернуть handoff (точка подключения `onAddAccount`).

## 7. YX-FE-4 — OAuth popup и callback-страница (профиль: Frontend)

**Specs:** `yandex-oauth-cms-callback` · **Пути:** см. таблицу · **Зависит от:** `YX-FE-3`

- [x] YX-FE-4.1 Добавить `hooks/useYandexOAuthPopup.ts` (получение ссылки, `window.open` popup 600×700 без `noopener`, focus существующего окна, состояние «заблокировано», слушатель `message` с проверкой origin и типа `eqsite:yandex-oauth`, поллинг `popup.closed`, cleanup); проверка — `FT-YX-12`.
- [x] YX-FE-4.2 Подключить хук к «Добавить аккаунт» в `YandexAccountStep.tsx` (ожидание, ошибка ссылки/блокировки, refresh списка с `offset=0` на `success` и при закрытии окна); проверка — `FT-YX-12`.
- [x] YX-FE-4.3 Добавить `hooks/useYandexOAuthCallback.ts` (чтение `code`/`state`/`error`, `useRef`-guard одного POST, статусы processing/success/error/cancelled, `postMessage` в `window.location.origin`, `close()` при opener и успехе) и `ui/YandexOAuthCallback.tsx` (AntD `Result`/`Spin`, без показа `code`, ссылка «Перейти в раздел SEO» без opener); проверка — `FT-YX-13`.
- [x] YX-FE-4.4 Добавить `src/app/(open)/callbacks/oauth/yandex/page.tsx` (тонкая обёртка с `Suspense` по образцу `callback/email/page.tsx`); проверка — `npm run build` собирает маршрут.
- [x] YX-FE-4.5 Реализовать и прогнать `FT-YX-12..13` (open/focus/blocked/link error, success → refresh, чужой origin игнор, closed → refresh, один POST в StrictMode, без параметров, `error=access_denied`, backend error, targetOrigin, close/no-opener).
- [x] YX-FE-4.6 Выполнить `FT-YX-14`: `rg` self-checks из `agents/planner.md` §2.2 (raw fetch, `@/api` в app/features, `page/pageSize`, `site-*`, `shared/widgets/entities`) и зафиксировать результат в handoff.
- [x] YX-FE-4.V Прогнать из `services/frontend` `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`; отметить task IDs и вернуть handoff.

## 8. QG — Quality Gate `QG-FULL` (профиль: Quality Gate)

**Specs:** все specs change · **Пути:** `docs/reports/**` · **Зависит от:** `YX-SMOKE-1`, `YX-FE-4`

- [x] QG.1 `QG-ENV`: поднять backend, frontend, `yandex-service`, `ya-metrica-service`, БД через `scripts/stackctl`; проверить наличие дубля №1 (при отсутствии — пересоздать SQL из handoff `YX-SMOKE-1`).
- [x] QG.2 `QG-BE`: архитектура, код-стиль, unit-покрытие `UT-YX-01..23` против матрицы, отсутствие секретов в ответах/логах.
- [x] QG.3 `QG-FE-AUTO`: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`; ревью `FT-YX-01..14` (MSW/no live backend, ADMIN-only, Protected Write UX, `401/403`, pagination `limit/offset`, no `site-*` mixing).
- [x] QG.4 `QG-CONTRACTS`: access matrix (8 строк, anonymous/authenticated, исключения Protected Sensitive Read с причинами), route inventory; AsyncAPI — неприменимо (NATS не затронут); зафиксировать наследуемое ограничение production-изоляции peer.
- [x] QG.5 `QG-LIVE`: повторить/сверить `SM-YX-01..10` через `.agents/skills/api-smoke-test` на реальной PostgreSQL.
- [x] QG.6 `QG-FE-MANUAL`: Manual QA `M-01..M-25` из `design.md` через `.agents/skills/ui-qa` (три viewport, evidence).
- [x] QG.7 `QG-FORMAT` (scoped `services/backend`, `services/frontend`) и `QG-SYNTH`: единый отчёт в `docs/reports/` с вердиктом.

## 9. YX-BE-FIX-1 — исправления QG-BE/CONTRACTS (профиль: Backend)

- [x] YX-BE-FIX-1 Исправить BE-01: перенести проверки непустых `code/state` и `counter_id` (1..31 ASCII цифр) из DTO/API в `YandexProxyService`, сохранив структурный parsing/числовую нормализацию и HTTP `400/403`, ADMIN-only, tenant/ownership guards и отсутствие downstream при невалидном вводе. Добавить direct use-case invalid/empty/boundary и HTTP regression tests; уточнить outcomes всех 8 маршрутов inventory, перегенерировать артефакт и проверить route-specific tests. Verification: targeted 4 files — 227 passed; `make test` — 1706 passed, 5 skipped; `make format`, `make lint`, `uv run mypy src`, scoped inventory format/lint, `git diff --check` — успешно. QG/release не запускались.

## 10. YX-FE-FIX-1 — локальные исправления QG-FE-MANUAL (профиль: Frontend)

- [x] YX-FE-FIX-1 Исправить FE-MANUAL-01/02 (доступные две SEO-вкладки без невалидного overflow и клавиатурный фокус forbidden), FE-MANUAL-04/05 (mobile page-size и переносы заголовков/данных привязки), CONTRACTS minor (`display_name: string`, валидный MSW fixture). Добавить регрессионные component/API/style проверки; выполнить scoped formatting, `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Сохранить ADMIN-only, guards и double-submit; не менять global theme/layout, callback guard и peer/backend. Verification: SEO suite — 128 passed; итоговый `npm test` — 765 passed / 83 files (предыдущий прогон параллельно build: timeout 5s в неизменённом HorseCreateUpdateModal.test.tsx; повтор без build успешен); scoped ESLint layout-format — успешно; `npm run lint` — 0 errors / 434 existing warnings; `npx tsc --noEmit`, `npm run build`, whitespace-check — успешно. Для string DTO дополнительно исправлены только fixtures в ConnectionWizardModal.test.tsx и YandexOAuthCallback.test.tsx. Использован локальный `createStyles`: CSS module выявил несовместимый PostCSS config в Vitest, shared config не изменялся. Runtime frontend на :3001 не пересобирался/не перезапускался; targeted browser recheck выполняет прежний QG после runtime frontend rebuild/restart. OpenSpec CLI недоступен в PATH; checkbox обновлён непосредственно в этом файле.

## Workflow follow-up

- После `QG-SYNTH = APPROVED` (или `APPROVED_WITH_WAIVER`): sync delta specs в `openspec/specs/`, повторный `openspec validate --strict`, archive change (Router).
- Финализация задачи — skill `task-finalize`.
