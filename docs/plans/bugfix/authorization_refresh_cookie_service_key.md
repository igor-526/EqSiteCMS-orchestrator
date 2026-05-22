# План: исправление auth refresh flow при отсутствующем access token

**Тикет:** BUGFIX-AUTH-REFRESH-COOKIE-SERVICE-KEY
**Дата:** 2026-05-17
**Затронутые сервисы:** `services/backend`, `services/frontend`
**Ветка:** `bugfix/auth-refresh-cookie-service-key`

---

## Контекст

CMS frontend работает в Protected Admin UI и отправляет cookies через `credentials: "include"`.
Текущий `services/frontend/src/api/client.ts` запускает refresh/retry только если исходный CMS API-запрос получил `401`.

По `docs/tasks/authorization_bug.md` при истекшем или отсутствующем `access_token` браузер отправляет только `refresh_token`, а backend отвечает `400 {"detail":"Отсутствует X-Equestrian-Service-Key"}`. Вероятный источник найден в `services/backend/src/depends/services.py`:

- `get_read_equestrian_context` сначала пытается получить optional user через `access_token`;
- если `access_token` отсутствует, `get_optional_current_user` возвращает `None`;
- дальше read-context считает запрос public read и требует `X-Equestrian-Service-Key`;
- CMS frontend этот header не отправляет, поэтому возвращается `ClientError` -> `400`, а не `InvalidCredentials` -> `401`.

Для истекшего, но еще отправленного `access_token` `auth_service.get_current_user()` уже должен приводить к `InvalidCredentials` и `401`. Основной баг проявляется, когда браузер больше не отправляет `access_token` cookie по `Max-Age`, но `refresh_token` еще существует.

## Цель

Когда CMS-запрос приходит без валидного `access_token`, но с `refresh_token` cookie, backend должен вернуть `401`, чтобы frontend выполнил `POST /api/auth/refresh` и повторил исходный запрос. Если refresh успешен, пользователь остается в CMS; если refresh истек или отсутствует, frontend редиректит на `/login`.

Public read consumer flow с `X-Equestrian-Service-Key` не должен быть сломан. `site-*` зоны не менять.

---

## Детали реализации

### Backend

#### Изменяемые файлы

| Что | Путь | Описание |
|---|---|---|
| Auth/read dependency | `services/backend/src/depends/services.py` | Добавить различение CMS refresh-cookie сценария и public read без service key. |
| Unit tests | `services/backend/tests/unit/depends/test_auth_dependencies.py` | Расширить тесты для `get_optional_current_user`, `get_read_equestrian_context`, public service-key и refresh-cookie сценариев. |
| При необходимости | `services/backend/src/core/exceptions/auth.py` | Не менять без необходимости; `InvalidCredentials` уже маппится в `401` в `main.py`. |

#### Backend rework по Quality Gate

Quality Gate выявил, что dependency-level branch работает только при ручном `Cookie: refresh_token=...`, но браузер не отправляет cookie на `/api/horses/breeds`, потому что `refresh_token` был выставлен с `Path=/api/auth/refresh`.

Решение:

- `refresh_token` выставляется с `Path=/`, чтобы CMS read-запросы с refresh-only browser-like cookie jar попадали в `get_read_equestrian_context(... refresh_token=...)` и получали `401`.
- Login/refresh удаляют legacy cookie `Path=/api/auth/refresh`; logout удаляет refresh cookie на обоих paths.
- Добавлены route-level тесты cookie contract и browser-like сценария после login.

#### Предлагаемый backend contract

Изменить `get_read_equestrian_context` так, чтобы dependency принимала не только `access_token` через `get_optional_current_user`, но и `refresh_token` cookie напрямую или через узкую helper-dependency.

Рекомендуемая логика:

1. Если `access_token` валиден -> вернуть `EquestrianContext(source="authenticated")`.
2. Если `access_token` отсутствует, `refresh_token` присутствует, а `X-Equestrian-Service-Key` отсутствует -> поднять `InvalidCredentials("Отсутствуют учетные данные")`, итоговый HTTP `401`.
3. Если `access_token` отсутствует, `refresh_token` отсутствует, `X-Equestrian-Service-Key` присутствует -> public read context по service key.
4. Если `access_token` отсутствует, `refresh_token` отсутствует, `X-Equestrian-Service-Key` отсутствует -> сохранить текущий public-read контракт `400 {"detail":"Отсутствует X-Equestrian-Service-Key"}` для consumer-запроса без tenant key.
5. Если `access_token` невалиден или истек и отправлен браузером -> сохранить `401`, не fallback в public read.
6. Если `X-Equestrian-Service-Key` не найден в БД -> сохранить `404 TenantNotFound`.

Важно не превращать все anonymous `GET` без service key в `401`, иначе изменится public read API-контракт для сайтов-потребителей. `401` нужен именно для CMS-session признака: есть `refresh_token`, но нет валидного `access_token`.

#### API контракт

```http
GET /api/horses/breeds
Cookie: refresh_token=<valid-or-expired>

HTTP/1.1 401
{"detail":"Неверный логин или пароль"}
```

```http
POST /api/auth/refresh
Cookie: refresh_token=<valid>

HTTP/1.1 200
Set-Cookie: access_token=...
Set-Cookie: refresh_token=...
{"status":"ok"}
```

```http
GET /api/horses/breeds
Cookie: access_token=<new-valid>; refresh_token=<rotated-valid>

HTTP/1.1 200
```

```http
GET /api/horses/breeds

HTTP/1.1 400
{"detail":"Отсутствует X-Equestrian-Service-Key"}
```

```http
GET /api/horses/breeds
X-Equestrian-Service-Key: <valid-public-key>

HTTP/1.1 200
```

#### Схема БД

Миграции не нужны. Схема пользователей, token payload и tenant/equestrian tables не меняются.

### Frontend

#### Изменяемые файлы

| Что | Путь | Описание |
|---|---|---|
| API boundary tests | `services/frontend/src/api/api-boundary.test.ts` | Добавить регрессии, что `401` запускает один refresh, retry исходного запроса и redirect/failure при refresh `401`. |
| API client | `services/frontend/src/api/client.ts` | Код менять только если тест покажет gap в текущем behavior. Не добавлять обработку `400 "Отсутствует X-Equestrian-Service-Key"` как auth-сигнал без отдельного решения, чтобы не смешать public API и CMS auth. |
| User context tests, если есть локальный паттерн | `services/frontend/src/contexts/UserContext.*.test.tsx` | При наличии test setup добавить проверку redirect/block через `getUserInfo` -> `401` -> failed refresh. |

Текущее поведение `apiFetch` уже содержит `attemptRefresh()` для `401` и retry. План frontend-части нужен как регрессионная фиксация контракта backend/frontend, а не как основной источник исправления.

#### Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| `src/api/client.ts` / `apiFetch` | `401` от CMS read запускает refresh и retry | API-boundary unit with MSW: first GET 401, refresh 200, retry 200 | CMS session: refresh cookie valid, access missing/expired | `npm test` |
| `src/api/client.ts` / `apiFetch` | failed refresh возвращает auth failure и не делает бесконечный retry | API-boundary unit with MSW: GET 401, refresh 401, result error | CMS session: refresh expired | `npm test` |
| `src/api/client.ts` / `apiFetchFormData` | form-data protected write сохраняет тот же 401 refresh/retry contract | API-boundary unit with MSW: first POST 401, refresh 200, retry 200 | Protected Write, authenticated after refresh | `npm test` |
| `src/contexts/UserContext.tsx` | anonymous/protected route получает redirect на `/login` после failed refresh | Component/context test or documented manual QA if no existing router mock | anonymous/expired refresh | `npm test` |
| `src/api/*` | CMS API calls не добавляют `X-Equestrian-Service-Key` | static `rg` check | no `site-*` mixing, no public key workaround in CMS | `rg -n "X-Equestrian-Service-Key" services/frontend/src/api services/frontend/src/contexts services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'` |

---

## Access matrix

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `GET` | `/api/auth/me` | protected private GET exception | authenticated CMS user | `401`; frontend may refresh then retry | `200 UserOutDto` |
| `POST` | `/api/auth/login` | public auth POST exception | none | `200` with cookies for valid credentials, `401` for invalid credentials | same |
| `POST` | `/api/auth/refresh` | public auth POST exception | none | `401` if no/invalid/expired refresh cookie | `200` with rotated cookies when refresh cookie valid |
| `POST` | `/api/auth/logout` | public auth POST exception | none | `204`, deletes cookies if present | `204`, deletes cookies |
| `GET` | `/api/horses/breeds` and other `get_read_equestrian_context` CMS reads | dual-mode read: authenticated CMS or public with service key | CMS user or public service key tenant | no cookies + no service key: `400`; refresh cookie only + no service key: `401`; valid service key: `200` | valid access cookie: `200` |
| `GET` | `/api/news-cms` | protected private GET exception | authenticated CMS user | `401`; frontend may refresh then retry | `200` |
| `POST/PATCH/DELETE` | CMS mutations such as `/api/horses/breeds`, `/api/prices`, `/api/news` | protected write | authenticated CMS user plus service-level permissions where implemented | `401`; frontend may refresh then retry | success or `403` when authenticated but forbidden |

Исключения:

- `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout` публичны, потому что это auth lifecycle endpoints.
- `GET /api/auth/me` и `/api/news-cms` защищены, потому что возвращают приватный CMS/admin контекст.
- Dual-mode `GET` endpoints остаются public read для сайтов-потребителей через `X-Equestrian-Service-Key`, но CMS-session запрос с `refresh_token` без `access_token` должен получать `401`.

---

## Порядок выполнения

1. Backend: обновить dependency contract в `services/backend/src/depends/services.py`.
2. Backend: добавить unit-тесты dependency-level auth/read context.
3. Backend: прогнать targeted unit tests.
4. Frontend: добавить API-boundary регрессии refresh/retry и failed refresh.
5. Frontend: прогнать `npm test`, lint, typecheck, build.
6. Quality Gate: проверить diff на сохранение public read service-key flow, protected CMS `401/403`, отсутствие изменений в `site-*`.

---

## Backend test plan

### Unit-тесты backend-фичи auth refresh-cookie read context

1. `get_current_user` без `access_token` поднимает `InvalidCredentials`.
2. `get_current_user` с валидным `access_token` делегирует в `AuthService`.
3. `get_optional_current_user` без `access_token` возвращает `None`.
4. `get_optional_current_user` с валидным `access_token` возвращает user.
5. `get_optional_current_user` с истекшим `access_token` пробрасывает `InvalidCredentials`.
6. `get_optional_current_user` с malformed `access_token` пробрасывает `InvalidCredentials`.
7. `get_read_equestrian_context` с valid current user возвращает authenticated context.
8. `get_read_equestrian_context` с valid current user игнорирует `X-Equestrian-Service-Key`.
9. `get_read_equestrian_context` без access, без refresh, с valid service key возвращает public context.
10. `get_read_equestrian_context` без access, без refresh, с blank service key возвращает `ClientError`.
11. `get_read_equestrian_context` без access, без refresh, без service key возвращает `ClientError`.
12. `get_read_equestrian_context` без access, с refresh, без service key возвращает `InvalidCredentials`.
13. `get_read_equestrian_context` без access, с blank refresh, без service key не считает blank refresh CMS-session признаком и возвращает `ClientError`.
14. `get_read_equestrian_context` без access, с refresh, с valid service key фиксирует выбранный контракт; рекомендовано public context только если service key явно передан.
15. `get_read_equestrian_context` без access, с invalid service key возвращает `TenantNotFound`.
16. `get_public_equestrian_context` без service key сохраняет `ClientError`.
17. `get_public_equestrian_context` с valid service key возвращает public context.
18. `get_protected_equestrian_context` с user возвращает authenticated context.
19. `InvalidCredentials` handler в `main.py` возвращает HTTP `401`.
20. `ClientError` handler в `main.py` возвращает HTTP `400`.
21. `TenantNotFound` handler в `main.py` возвращает HTTP `404`.
22. `AuthService.refresh` с access token вместо refresh token поднимает `InvalidCredentials`.
23. `AuthService.refresh` с refresh token без `exp` поднимает `InvalidCredentials`.
24. `AuthService.refresh` с refresh token без `sub` поднимает `InvalidCredentials`.
25. `AuthService.refresh` с unknown user поднимает `InvalidCredentials`.
26. `AuthService.refresh` с repository exception поднимает `InvalidCredentials`.
27. `AuthService.get_current_user` с refresh token вместо access token поднимает `InvalidCredentials`.
28. `AuthService.get_current_user` с valid access token возвращает scopes.
29. Dependency test доказывает, что public read missing service-key не стал `InvalidCredentials` без refresh cookie.
30. Dependency test доказывает, что CMS refresh-cookie-only scenario не возвращает `ClientError`.
31. Route-level unit for representative dual-mode GET `/horses/breeds`: refresh cookie only -> `401`.
32. Route-level unit for representative dual-mode GET `/horses/breeds`: no cookies/no service key -> `400`.
33. Route-level unit for representative dual-mode GET `/horses/breeds`: valid service key -> `200`.
34. Route-level unit for protected GET `/auth/me`: no access -> `401`.
35. Route-level unit for protected write representative endpoint: no access -> `401`, not `400`.

### Smoke-тесты backend-фичи auth refresh-cookie read context

Smoke выполняются через `.claude/skills/api-smoke-test` на живом API и реальной PostgreSQL. Не создавать pytest smoke-файлы. Переменные: `BASE_URL`, `VALID_SERVICE_KEY`, `CMS_USERNAME`, `CMS_PASSWORD`, `ACCESS_COOKIE`, `REFRESH_COOKIE`, `EXPIRED_ACCESS_COOKIE`, `EXPIRED_REFRESH_COOKIE`, `BREED_ID_OR_SLUG`, `PRICE_ID_OR_SLUG`, `NEWS_ID`.

| ID | Запрос | Проверка |
|---|---|---|
| SM-01 | `POST $BASE_URL/api/auth/login` с валидными credentials | `200`, выставлены `access_token` и `refresh_token`. |
| SM-02 | `GET $BASE_URL/api/auth/me` с `access_token` | `200`, есть user/scopes. |
| SM-03 | `GET $BASE_URL/api/auth/me` без cookies | `401`. |
| SM-04 | `GET $BASE_URL/api/auth/me` только с `refresh_token` | `401`. |
| SM-05 | `POST $BASE_URL/api/auth/refresh` с valid `refresh_token` | `200`, новые cookies. |
| SM-06 | `POST $BASE_URL/api/auth/refresh` без refresh cookie | `401`. |
| SM-07 | `POST $BASE_URL/api/auth/refresh` с expired refresh | `401`. |
| SM-08 | `GET $BASE_URL/api/horses/breeds` только с valid `refresh_token` | `401`, не `400`. |
| SM-09 | `GET $BASE_URL/api/horses/breeds` без cookies и без service key | `400` с detail про `X-Equestrian-Service-Key`. |
| SM-10 | `GET $BASE_URL/api/horses/breeds` с valid service key | `200`. |
| SM-11 | `GET $BASE_URL/api/horses/breeds` с invalid service key | `404`. |
| SM-12 | `GET $BASE_URL/api/horses/breeds` с valid access cookie | `200`. |
| SM-13 | `GET $BASE_URL/api/horses/breeds/{BREED_ID_OR_SLUG}` только с refresh | `401`, не `400`. |
| SM-14 | `GET $BASE_URL/api/horses/breeds/{BREED_ID_OR_SLUG}` с valid service key | `200` или `404` по данным, но не auth/service-key `400`. |
| SM-15 | `GET $BASE_URL/api/horses/coat-colors` только с refresh | `401`, не `400`. |
| SM-16 | `GET $BASE_URL/api/horses/coat-colors` с valid service key | `200`. |
| SM-17 | `GET $BASE_URL/api/horses/services` только с refresh | `401`, не `400`. |
| SM-18 | `GET $BASE_URL/api/horses/services` с valid service key | `200`. |
| SM-19 | `GET $BASE_URL/api/horses/owners` только с refresh | `401`, не `400`. |
| SM-20 | `GET $BASE_URL/api/horses/owners` с valid service key | `200`. |
| SM-21 | `GET $BASE_URL/api/prices/groups` только с refresh | `401`, не `400`. |
| SM-22 | `GET $BASE_URL/api/prices/groups` с valid service key | `200`. |
| SM-23 | `GET $BASE_URL/api/prices` только с refresh | `401`, не `400`. |
| SM-24 | `GET $BASE_URL/api/prices` с valid service key | `200`. |
| SM-25 | `GET $BASE_URL/api/site_settings` только с refresh | `401`, не `400`. |
| SM-26 | `GET $BASE_URL/api/site_settings` с valid service key | `200`. |
| SM-27 | `GET $BASE_URL/api/photos` только с refresh | `401`, не `400`. |
| SM-28 | `GET $BASE_URL/api/photos` с valid service key | `200`. |
| SM-29 | `GET $BASE_URL/api/news-cms` только с refresh | `401`. |
| SM-30 | `GET $BASE_URL/api/news` без cookies but with valid service key | `200`. |
| SM-31 | Protected write representative `POST /api/horses/breeds` only refresh | `401`, не `400`. |
| SM-32 | Protected write representative `POST /api/horses/breeds` no cookies | `401`. |
| SM-33 | Full browser-like sequence: dual-mode GET with only refresh -> `401`; refresh -> `200`; retry GET with new access -> `200`. |
| SM-34 | Full expired sequence: dual-mode GET with expired refresh only -> `401`; refresh -> `401`; client should redirect in frontend manual QA. |

### PostgreSQL для smoke-тестов

DB-контейнер найден по Docker labels:

| Параметр | Значение из `docker inspect` |
|---|---|
| Container ID | `478aa22ca9d6e39de1988746a074d6bed0b8406c01d0df10b43aeb13a9ef84ec` |
| Name | `/eqsitecms-db` |
| Image | `postgres:17` |
| Labels | `com.docker.compose.project=eqsitecms`, `com.docker.compose.service=db` |
| Network aliases | `eqsitecms-db`, `db` |
| `POSTGRES_DB` | `eqsitecms` |
| `POSTGRES_USER` | `eqsitecms` |
| `POSTGRES_PASSWORD` | `eqsitecms` |
| Host port `5432/tcp` | `5433` |

---

## Manual QA steps (UI тестирование)

1. Предусловия: backend и frontend запущены, тестовый CMS-пользователь существует, во вкладке Network браузерных devtools включен Preserve log.
2. Войти на `http://localhost:3000/login`; ожидается: redirect/render защищенной CMS, cookies `access_token` и `refresh_token` установлены.
3. Удалить только cookie `access_token`, оставить `refresh_token`; открыть CMS-страницу, которая выполняет read-запрос, например `/horses` или `/prices`; ожидается: первый CMS API-запрос возвращает `401`, `POST /api/auth/refresh` возвращает `200`, исходный запрос повторяется, страница остается authenticated.
4. Удалить обе cookies; открыть защищенный CMS route; ожидается: redirect/block на `/login`, успешного рендера CMS-данных нет.
5. Оставить только истекший/невалидный `refresh_token`; открыть защищенный CMS route; ожидается: первый запрос `401`, refresh `401`, redirect на `/login`.
6. Проверить, что ни один CMS-запрос не содержит `X-Equestrian-Service-Key`; этот header остается только в developer documentation/public examples.
7. Responsive-проверка на desktop/tablet/mobile для затронутого защищенного route после успешного refresh: переходы auth state или loading state не привели к перекрытию текста/кнопок/таблиц/modal.
8. QA-отчет должен включать пройденные/непройденные шаги, а для failures - screenshot и Network status/body для initial request, refresh request и retry.

---

## Чеклист

> ⚠️ Этот раздел используется агентами для отслеживания прогресса.
> Агент обязан менять `[ ]` -> `[x]` после выполнения каждого пункта.
> Оркестратор парсит именно этот раздел.

### Backend

- [x] Обновить `services/backend/src/depends/services.py`: CMS request с `refresh_token` и без валидного `access_token` должен поднимать `InvalidCredentials` до public service-key fallback.
- [x] Сохранить public read behavior в `services/backend/src/depends/services.py`: no cookies + valid `X-Equestrian-Service-Key` возвращает public `EquestrianContext`.
- [x] Сохранить public read missing-key behavior в `services/backend/src/depends/services.py`: no cookies + no service key возвращает `ClientError`/HTTP `400`.
- [x] Добавить/расширить unit tests в `services/backend/tests/unit/depends/test_auth_dependencies.py` для `get_optional_current_user` с missing/valid/invalid access token.
- [x] Добавить/расширить unit tests в `services/backend/tests/unit/depends/test_auth_dependencies.py` для `get_read_equestrian_context` refresh-cookie-only -> `InvalidCredentials`.
- [x] Добавить/расширить unit tests в `services/backend/tests/unit/depends/test_auth_dependencies.py` для public service-key success, missing service-key `ClientError`, invalid service-key `TenantNotFound`.
- [x] Добавить репрезентативный route-level backend test для dual-mode `GET`: refresh-cookie-only -> HTTP `401`, не `400`.
- [x] Добавить репрезентативный route-level backend test для dual-mode `GET`: anonymous no service-key -> HTTP `400`.
- [x] Добавить репрезентативный route-level backend test для dual-mode `GET`: valid service-key -> HTTP `200`.
- [x] Запустить `PYTHONPATH=src uv run pytest -q tests/unit/depends/test_auth_dependencies.py` из `services/backend`.

### Frontend

- [x] Добавить API-boundary regression в `services/frontend/src/api/api-boundary.test.ts`: initial CMS GET `401`, refresh `200`, retry original request завершается успешно.
- [x] Добавить API-boundary regression в `services/frontend/src/api/api-boundary.test.ts`: initial CMS GET `401`, refresh `401`, результатом является auth failure/redirect behavior без infinite retry.
- [x] Добавить API-boundary regression в `services/frontend/src/api/api-boundary.test.ts` для `apiFetchFormData` protected write `401` refresh/retry.
- [x] Проверить, что `services/frontend/src/api/client.ts` не обрабатывает backend `400 "Отсутствует X-Equestrian-Service-Key"` как auth refresh trigger.
- [x] Проверить, что CMS API code не добавляет workaround с `X-Equestrian-Service-Key` в protected admin requests.
- [x] Запустить `rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'` и подтвердить, что raw network calls остаются только в approved API/auth boundaries или docs examples.
- [x] Запустить `rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'` и подтвердить, что новые app/page direct API imports не появились.
- [x] Запустить `rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'` и подтвердить отсутствие unrelated pagination contract changes.
- [x] Запустить `rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'` и подтвердить, что в CMS changes нет смешивания с `site-*`.
- [x] Запустить `find services/frontend/src -maxdepth 2 -type d \\( -name shared -o -name widgets -o -name entities \\)` и подтвердить, что deprecated FSD directories не добавлены.

### Quality Gate

- [x] Проверить backend diff на соответствие Clean Architecture: auth/tenant decision остается в `depends`, service layer остается framework-independent.
- [x] Проверить backend access behavior: `401` для missing/invalid CMS auth, `403` только для authenticated-but-forbidden, `400` только для missing public service key без CMS session.
- [x] Проверить anonymous и authenticated behavior по Access matrix для `/api/auth/me`, `/api/auth/refresh`, representative dual-mode GET и representative Protected Write.
- [x] Запустить backend targeted unit tests из `services/backend`: `PYTHONPATH=src uv run pytest -q tests/unit/depends/test_auth_dependencies.py`.
- [ ] Выполнить smoke scenarios SM-01..SM-34 через `.claude/skills/api-smoke-test` на live API и PostgreSQL container `eqsitecms-db`.
- [x] Запустить frontend из `services/frontend`: `npm test`.
- [x] Запустить frontend из `services/frontend`: `npm run lint`.
- [x] Запустить frontend из `services/frontend`: `npx tsc --noEmit`.
- [x] Запустить frontend из `services/frontend`: `npm run build`.
- [x] Проверить frontend tests на MSW/no live backend calls и явные `401/403` auth scenarios.
- [x] Проверить, что `site-*` files не изменены, а CMS frontend не import/use public consumer code.
- [ ] Проверить, что manual QA report включает initial request, refresh request и retry statuses для valid-refresh и expired-refresh cases.

### Quality Gate notes 2026-05-17

- Status: targeted recheck has no blocking findings.
- Rework blocker rechecked on live API: login sets `refresh_token` with `Path=/`; refresh-only browser-like cookie jar sends it to `/api/horses/breeds`; dual-mode read returns `401`, not `400`.
- Login/refresh clear legacy `Path=/api/auth/refresh`; logout clears both `Path=/` and legacy path.
- Access matrix spot-checks completed for `/api/auth/me`, `/api/auth/refresh`, representative dual-mode `GET /api/horses/breeds`, and representative protected write `POST /api/horses/breeds`.
- Full SM-01..SM-34 and browser manual QA report remain unchecked.
