# План: Новая CORS-стратегия для FastAPI бэкенда

**Дата:** 2026-05-22
**Затронутые сервисы:** `services/backend`
**Ветка:** `feature/cors-strategy`

---

## Контекст

Текущая настройка в `main.py` применяет единый `CORSMiddleware` ко всему приложению:
- `allow_origins` — жёстко прописанный список из `cms_panel_domain`, `cms_backend_domain`, `main_site_domain`.
- `allow_credentials=True` — требуется для cookie-авторизации CMS.
- `allow_methods=["*"]`, `allow_headers=["*"]`.

### Почему это не работает для multi-tenant

1. **Одно поле `main_site_domain`** покрывает лишь одну конюшню. Система поддерживает несколько конюшен, у каждой может быть свой домен consumer-сайта. Перечислить все домены в одной переменной окружения неудобно и плохо масштабируется.

2. **Несовместимость `allow_origins=["*"]` с `allow_credentials=True`**. Стандарт CORS запрещает одновременно отдавать `Access-Control-Allow-Origin: *` и `Access-Control-Allow-Credentials: true` — браузер блокирует такой ответ. Нельзя просто расширить список до `*`.

3. **Public GET-эндпоинты не нуждаются в ограничении по origin**. `site-ad` и аналогичные consumer-фронтенды выполняют только GET-запросы с `X-Equestrian-Service-Key`, cookies не используют. Им нужен `Access-Control-Allow-Origin: *`.

4. **Медиа-файлы ушли в S3** — необходимость разрешать CORS для статики через бэкенд отпала.

### Почему домены конюшен из БД не решают задачу

Идея хранить домены в модели конюшни и читать их в middleware кажется логичной для multi-tenant, но не работает в данном случае:

- **Для публичных GET** — `Access-Control-Allow-Origin: *` семантически корректен: CORS является браузерным механизмом на стороне клиента. Настоящая защита публичного GET — `X-Equestrian-Service-Key`, а не Origin. Ограничение по origin ничего не добавляет к безопасности.
- **Для защищённых эндпоинтов** — их вызывает только CMS-панель, у которой фиксированный домен. Домены конюшен здесь не при чём.
- **Технические проблемы**: middleware инициализируется раньше приложения, что требует DB-запроса или кеша на каждый запрос, а инвалидация кеша при добавлении новой конюшни — отдельный механизм. Middleware не должен зависеть от репозиториев — нарушение Clean Architecture.

### Целевое поведение

| Тип запроса | CORS-политика |
|---|---|
| `GET` (public read) | `Access-Control-Allow-Origin: *`, без `credentials` |
| `POST` / `PATCH` / `DELETE` | Строгий CORS только для `cms_cors_origins`, `allow_credentials=True` |
| `GET /api/auth/me`, `GET /api/news-cms` (CMS-only GET) | Строгий CORS только для `cms_cors_origins` |
| Запросы без заголовка `Origin` (server-to-server, curl) | CORS-заголовки не добавляются |

---

## Решение: `SplitCORSMiddleware`

Единый кастомный middleware определяет режим CORS по HTTP-методу и пути запроса:

- **Режим PUBLIC** (`GET` к публичным эндпоинтам) → `Access-Control-Allow-Origin: *`, без credentials.
- **Режим PROTECTED** (мутирующие методы и CMS-only GET) → строгий CORS, только `cms_cors_origins`, с credentials.

**Почему метод + путь, а не теги роутера или dependency-introspection:**
- Теги роутера — документационная конструкция, не семантическая. Изменение тега не должно ломать CORS.
- Dependency-introspection требует доступа к `app.routes`, недоступного на этапе инициализации middleware.
- Метод + путь — явный, предсказуемый, легко тестируемый.

Единственный нестандартный случай — `GET /api/news-cms` требует авторизации. Такие пути явно перечислены в константе `_PROTECTED_GET_PATH_PREFIXES`. При добавлении нового CMS-only GET нужно добавить его путь в этот список.

---

## Изменения в коде

### 1. `services/backend/src/settings.py`

Добавить поле `cms_cors_origins_raw` и property `cms_cors_origins`. Удалить `main_site_domain` из CORS-логики (поле само по себе можно оставить, если используется в других местах).

```python
# Новое поле. В env задаётся как comma-separated строка:
# CMS_CORS_ORIGINS=https://cms.equestrian.ru,http://localhost:3000
cms_cors_origins_raw: str = Field(default="", alias="CMS_CORS_ORIGINS")

@property
def cms_cors_origins(self) -> list[str]:
    if self.cms_cors_origins_raw.strip():
        return [o.strip() for o in self.cms_cors_origins_raw.split(",") if o.strip()]
    # Фоллбэк для локальной разработки: строим из cms_panel_domain
    return [
        "http://localhost:3000",
        f"http://{self.cms_panel_domain}",
        f"https://{self.cms_panel_domain}",
    ]
```

Пример `.env` для продакшена:
```env
CMS_CORS_ORIGINS=https://cms.myequestrian.ru,https://cms.anotherequestrian.ru
```

Для локальной разработки переменную можно не задавать — дефолт строится из `CMS_PANEL_DOMAIN=localhost:3000`.

### 2. `services/backend/src/core/middleware/cors.py` (новый файл)

```python
from __future__ import annotations

import functools
from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import PlainTextResponse, Response
from starlette.types import ASGIApp, Message, Receive, Scope, Send


_PROTECTED_GET_PATH_PREFIXES: tuple[str, ...] = (
    "/api/auth/me",
    "/api/news-cms",
)

_MUTATING_METHODS: frozenset[str] = frozenset({"POST", "PATCH", "DELETE", "PUT"})


def _is_protected_request(
    method: str,
    path: str,
    preflight_request_method: str | None = None,
) -> bool:
    effective_method = (preflight_request_method or method).upper()

    if effective_method in _MUTATING_METHODS:
        return True

    if effective_method == "GET":
        return any(path.startswith(prefix) for prefix in _PROTECTED_GET_PATH_PREFIXES)

    return False


class SplitCORSMiddleware:
    def __init__(self, app: ASGIApp, cms_origins: list[str]) -> None:
        self.app = app
        self.cms_origins: frozenset[str] = frozenset(cms_origins)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method: str = scope["method"]
        path: str = scope["path"]
        headers = Headers(scope=scope)
        origin: str | None = headers.get("origin")

        if origin is None:
            await self.app(scope, receive, send)
            return

        if method == "OPTIONS" and "access-control-request-method" in headers:
            preflight_method = headers.get("access-control-request-method", "")
            protected = _is_protected_request("OPTIONS", path, preflight_method)
            response = self._preflight_response(origin, headers, protected=protected)
            await response(scope, receive, send)
            return

        protected = _is_protected_request(method, path)
        await self.app(
            scope,
            receive,
            functools.partial(
                self._send_with_cors,
                send=send,
                origin=origin,
                protected=protected,
            ),
        )

    def _preflight_response(
        self,
        origin: str,
        request_headers: Headers,
        protected: bool,
    ) -> Response:
        if protected:
            if origin not in self.cms_origins:
                return PlainTextResponse("Disallowed CORS origin", status_code=400)
            resp_headers = {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, PUT, OPTIONS",
                "Access-Control-Allow-Headers": request_headers.get(
                    "access-control-request-headers", "*"
                ),
                "Access-Control-Max-Age": "600",
                "Vary": "Origin",
            }
        else:
            resp_headers = {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": request_headers.get(
                    "access-control-request-headers", "*"
                ),
                "Access-Control-Max-Age": "600",
            }
        return PlainTextResponse("OK", status_code=200, headers=resp_headers)

    async def _send_with_cors(
        self,
        message: Message,
        send: Send,
        origin: str,
        protected: bool,
    ) -> None:
        if message["type"] != "http.response.start":
            await send(message)
            return

        message.setdefault("headers", [])
        headers = MutableHeaders(scope=message)

        if protected:
            if origin in self.cms_origins:
                headers["Access-Control-Allow-Origin"] = origin
                headers["Access-Control-Allow-Credentials"] = "true"
                headers.add_vary_header("Origin")
        else:
            headers["Access-Control-Allow-Origin"] = "*"

        await send(message)
```

### 3. `services/backend/src/core/middleware/__init__.py` (новый файл)

Пустой файл для регистрации пакета.

### 4. `services/backend/src/main.py`

```python
# Удалить:
from fastapi.middleware.cors import CORSMiddleware

# Добавить:
from core.middleware.cors import SplitCORSMiddleware

# Заменить весь блок app.add_middleware(CORSMiddleware, ...) на:
app.add_middleware(
    SplitCORSMiddleware,
    cms_origins=settings.cms_cors_origins,
)
```

---

## Затронутые файлы

| Действие | Файл |
|---|---|
| Изменить | `services/backend/src/settings.py` |
| Изменить | `services/backend/src/main.py` |
| Создать | `services/backend/src/core/middleware/__init__.py` |
| Создать | `services/backend/src/core/middleware/cors.py` |
| Создать | `services/backend/tests/unit/api/test_cors_middleware.py` |

---

## Влияние на `site-ad`

`site-ad` делает только GET-запросы с `X-Equestrian-Service-Key`, cookies не использует.

После перехода на `Access-Control-Allow-Origin: *` для GET:
- Браузер перестаёт требовать совпадение origin — любой домен конюшни работает без дополнительной конфигурации.
- SSR-запросы (Next.js → backend, server-to-server) не ходят через CORS вообще.

**Изменений в `services/site-ad` не требуется.**

---

## Чеклист тестирования

### Unit-тесты (`tests/unit/api/test_cors_middleware.py`)

- [ ] `GET /api/horses` с произвольным `Origin` → `Access-Control-Allow-Origin: *`, нет `Access-Control-Allow-Credentials`.
- [ ] `POST /api/horses` с разрешённым `Origin` → `Access-Control-Allow-Origin: <origin>`, `Access-Control-Allow-Credentials: true`.
- [ ] `POST /api/horses` с `Origin: https://evil.com` (не в списке) → нет `Access-Control-Allow-Origin`.
- [ ] `OPTIONS /api/horses` с `Access-Control-Request-Method: POST`, разрешённый origin → preflight 200, строгие заголовки.
- [ ] `OPTIONS /api/horses` с `Access-Control-Request-Method: GET`, любой origin → preflight 200, `Access-Control-Allow-Origin: *`.
- [ ] `OPTIONS /api/auth/login` с `Access-Control-Request-Method: POST`, недопустимый origin → preflight 400.
- [ ] `GET /api/auth/me` с разрешённым CMS-origin → строгий CORS с credentials.
- [ ] `GET /api/auth/me` с произвольным origin → нет `Access-Control-Allow-Origin`.
- [ ] `GET /api/news-cms` с разрешённым CMS-origin → строгий CORS с credentials.
- [ ] `GET /api/news` с произвольным origin → `Access-Control-Allow-Origin: *`.
- [ ] Запрос без заголовка `Origin` → CORS-заголовки не добавляются.

### Ручная проверка

- [ ] Из `site-ad` — GET-запрос к API проходит без CORS-ошибки.
- [ ] Из `site-ad` — POST (имитация через fetch) блокируется браузером: preflight возвращает 400.
- [ ] Из CMS-панели (localhost:3000) — login, refresh, logout работают, cookies ставятся корректно.
- [ ] Из CMS-панели — `GET /api/news-cms` возвращает данные.
- [ ] Из стороннего origin — POST к `/api/auth/login` блокируется браузером.

### Регрессия

- [ ] Существующие тесты проходят без изменений.
- [ ] `make lint` чист.
- [ ] `make test` проходит полностью.

---

## Поддержка механизма после реализации

### Как устроен механизм

CORS-логика сосредоточена в двух местах:

- `src/core/middleware/cors.py` — сам middleware. Режим определяется по двум критериям:
  1. **HTTP-метод**: `POST`, `PATCH`, `DELETE`, `PUT` → всегда PROTECTED.
  2. **Путь**: GET-эндпоинты из `_PROTECTED_GET_PATH_PREFIXES` → PROTECTED. Все остальные GET → PUBLIC.

- `_PROTECTED_GET_PATH_PREFIXES` — единственное место, которое нужно менять при эволюции API. Содержит пути GET-эндпоинтов, требующих cookie-авторизации (CMS-only GET).

Все мутирующие методы обрабатываются автоматически через `_MUTATING_METHODS` — их список трогать не нужно.

---

### Правила для Backend агента

При разработке новых эндпоинтов соблюдать следующее:

**Если добавляется новый GET-эндпоинт с cookie-авторизацией (CMS-only):**
- Добавить его путь в `_PROTECTED_GET_PATH_PREFIXES` в `src/core/middleware/cors.py`.
- Добавить unit-тест в `tests/unit/api/test_cors_middleware.py`: GET с разрешённым CMS-origin → строгий CORS; GET с произвольным origin → нет CORS-заголовков.

**Если удаляется или переименовывается CMS-only GET-эндпоинт:**
- Убрать или обновить соответствующий путь в `_PROTECTED_GET_PATH_PREFIXES`.
- Обновить тест.

**Если добавляется новый публичный GET-эндпоинт:**
- Никаких изменений в `cors.py` не требуется — он автоматически получит `Access-Control-Allow-Origin: *`.

**Не делать:**
- Не возвращать `CORSMiddleware` из FastAPI в `main.py`.
- Не дублировать CORS-логику в отдельных роутерах или декораторах эндпоинтов.
- Не добавлять домены consumer-сайтов в `CMS_CORS_ORIGINS` — эта переменная только для CMS-панели.

---

### Правила для Quality Gate агента

При ревью любого diff, затрагивающего `services/backend`, проверять:

**Новые GET-эндпоинты с auth-dependency (`get_current_user`, `get_protected_equestrian_context` и аналоги):**
- Путь должен быть добавлен в `_PROTECTED_GET_PATH_PREFIXES`.
- Должен быть тест на CORS-поведение этого эндпоинта.
- Если путь отсутствует — блокировать merge, потому что браузер будет пропускать неавторизованные cross-origin запросы к защищённому эндпоинту.

**Переименование или удаление CMS-only GET-эндпоинтов:**
- Проверить, что старый путь убран из `_PROTECTED_GET_PATH_PREFIXES`.
- Устаревший путь в списке — не блокер безопасности, но мёртвый код.

**Изменения в `_PROTECTED_GET_PATH_PREFIXES`:**
- Убедиться, что изменение синхронизировано с реальным роутингом: путь существует в роутерах и действительно требует авторизации.

**Изменения в `main.py`:**
- `CORSMiddleware` из FastAPI не должен появляться.
- `SplitCORSMiddleware` должен быть единственным CORS-middleware.

**Изменения в `settings.py`:**
- `CMS_CORS_ORIGINS` должна содержать только домены CMS-панели, не consumer-сайтов.

---

## Порядок выполнения

1. Обновить `settings.py`: добавить `cms_cors_origins_raw` и property `cms_cors_origins`.
2. Создать `src/core/middleware/__init__.py` и `src/core/middleware/cors.py`.
3. Обновить `main.py`: убрать `CORSMiddleware`, добавить `SplitCORSMiddleware`.
4. Написать unit-тесты.
5. `make test` + `make lint`.
6. Ручная проверка через browser devtools или curl.
