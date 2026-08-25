## Context

`POST /api/callback_requests` уже не имеет auth dependency и является задокументированным Public Write exception для anonymous формы `site-ad`. Фактический `SplitCORSMiddleware` в `services/backend/src/core/middleware/cors.py` классифицирует все `POST/PATCH/DELETE/PUT` как protected до исполнения route handler. Поэтому browser preflight `OPTIONS /api/callback_requests` с `Access-Control-Request-Method: POST` от origin `site-ad` получает `400 Disallowed CORS origin`; фактический cross-origin POST также не получает wildcard CORS header. В Quality Gate 055 это было обойдено opt-in rewrite `SITE_API_PROXY_TARGET` в `site-ad`, что скрывает рассинхронизацию, но создаёт лишнюю runtime-зависимость от Next.js proxy.

Middleware получает нормализованный ASGI `scope["path"]`, HTTP method и preflight target method; body для классификации не нужен и у preflight отсутствует. Selector передаётся заголовком `X-Equestrian-Service-Key`, остаётся non-secret tenant identity hint и валидируется прикладным слоем после CORS.

PostgreSQL discovery выполнен перед планированием smoke: основной label `com.docker.compose.project=eqsitecms` не нашёл контейнер из-за фактического project label `eqsitecms-core`; fallback выбрал `eqsitecms-db` (`7c720ddc783d`, image `postgres:16`). `docker inspect` показал `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`, host port `5433`, service label `db`, aliases `eqsitecms-db`, `db`. Исполнитель обязан повторить discovery/inspect перед live smoke и использовать актуальные значения, не хардкодить этот snapshot.

## Goals / Non-Goals

**Goals:**

- Согласовать CORS-классификацию с существующим Public Write access-контрактом только для точного `POST /api/callback_requests`.
- Разрешить credentialless browser preflight/POST от `site-ad` и иных consumer origins с `Content-Type` и selector header.
- Доказать регрессией, что остальные writes и protected GET остаются strict-CORS, а Public GET не меняется.
- Удалить необходимость в site-ad same-origin proxy и проверить прямую browser integration.

**Non-Goals:**

- Не отключать CORS глобально и не добавлять consumer origins в `CMS_CORS_ORIGINS`.
- Не менять auth, tenant selector, payload, status codes, storage, NATS или notification flow callback-заявки.
- Не открывать CMS list/detail, admin/service PATCH или иные writes.
- Не добавлять cookies/credentials в публичную consumer форму.

## Decisions

### 1. Явный реестр public CORS route, а не правило «любой POST публичный»

В middleware вводится immutable allowlist точных пар `(method, path)`, содержащий только `("POST", "/api/callback_requests")`. Классификатор сначала проверяет это исключение, затем применяет текущие protected rules. Для `OPTIONS` используется `Access-Control-Request-Method`, поэтому тот же классификатор работает без тела запроса. Path сравнивается точно после ASGI normalization: suffix, service path, похожий prefix и trailing slash не наследуют исключение.

Альтернатива — добавить origin `site-ad` в CMS allowlist — отклонена: она выдала бы credentialed доступ ко всем protected writes этому origin. Альтернатива — специальный middleware/route для callback — избыточна и дублирует CORS response construction.

### 2. Public write использует credentialless wildcard semantics

Обычный consumer origin получает `Access-Control-Allow-Origin: *`, без `Access-Control-Allow-Credentials`. Preflight разрешает `POST, OPTIONS` и запрошенные `Content-Type, X-Equestrian-Service-Key` (case-insensitive browser semantics), возвращает `200` и max-age. Фактические `201`, `401`, `422` ответы получают wildcard header, чтобы браузер мог прочитать и success, и application errors.

Для origin из `CMS_CORS_ORIGINS` сохраняется существующий приоритет strict mode (`Access-Control-Allow-Origin: <origin>`, credentials true, `Vary: Origin`) даже на публичном endpoint, чтобы не ломать CMS/browser convention. Это не добавляет auth endpoint'у: access остаётся public.

### 3. CORS не заменяет selector и не меняет create payload semantics

Preflight не обращается к БД и не валидирует selector. На actual POST handler продолжает проверять `X-Equestrian-Service-Key`: missing/invalid — `401`, valid request — `201`, schema-invalid body — `422`; каждый ответ доступен consumer JS через CORS. Существующий `CallbackRequestCreateDto` оставляет `name` optional, а унаследованный `BaseSchema` игнорирует неизвестные extra fields: отсутствие `name` и payload с extra field поэтому остаются валидными (`201`), extra field не сохраняется и не появляется в представлении заявки. Change не добавляет `extra="forbid"` и не меняет DTO. `Authorization`/cookie не требуются и не добавляются `site-ad`.

### 4. Удаление proxy после backend-first rollout

Сначала разворачивается backend CORS fix. Затем Site Consumer owner удаляет `rewrites()`/`SITE_API_PROXY_TARGET`, связанные tests/docs и настраивает `NEXT_PUBLIC_API_BASE_URL` на абсолютный backend `/api`. API client и форма сохраняют selector header и прямой `POST`. Backend-first исключает окно, когда browser form уже прямая, а preflight ещё отвергается.

### 5. Ownership и Quality Gate

Backend owner единолично меняет `services/backend/src/core/middleware/cors.py`, CORS tests и backend contract docs. После него Site Consumer owner меняет только `services/site-ad` config/tests/docs. Один Quality Gate проверяет общий diff, live API на реальной PostgreSQL и реальный browser flow; findings возвращаются соответствующему owner. После approval Router синхронизирует delta specs, повторяет strict validation и архивирует change.

## Risks / Trade-offs

- [Слишком широкое path matching откроет соседние writes] → точная пара method/path и negative tests для trailing slash, detail, service path и похожих prefixes.
- [Wildcard вместе с credentials запрещён браузерами] → public branch никогда не выставляет credentials; CMS-origin strict branch тестируется отдельно.
- [Отражение произвольных requested headers может расширить поверхность] → ограничить public callback preflight разрешённым набором `Content-Type` и `X-Equestrian-Service-Key`; неизвестный header отклонять `400` без ACAO.
- [Удаление proxy сломает окружение с неверным API URL] → backend-first deploy, обязательная абсолютная `NEXT_PUBLIC_API_BASE_URL`, config tests и rollback через возврат предыдущего site-ad revision.
- [CORS success скроет ошибку selector] → smoke/browser проверки отдельно доказывают `401` missing/invalid и `201` valid.
- [CORS regression tests случайно ужесточат payload contract] → зафиксировать pre-change semantics: optional `name` и ignored extra field дают `201`; отдельные проверки подтверждают, что extra field не персистится.

## Migration Plan

1. Backend owner реализует узкое исключение и regression tests; схема БД и миграции отсутствуют.
2. Развернуть backend и подтвердить preflight/actual POST live smoke на актуальной PostgreSQL.
3. Site Consumer owner удаляет proxy и переключает deployment на прямой абсолютный API URL.
4. Quality Gate выполняет полный backend/site-ad suite и Chrome QA с consumer origin.
5. Rollback: сначала вернуть site-ad proxy revision, затем backend middleware revision; данные не мигрируются.

## Open Questions

Открытых вопросов нет. Семантика `notifications_delivered` и прочий callback lifecycle не затрагиваются.
