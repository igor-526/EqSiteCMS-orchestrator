# Review: CORS Settings (SplitCORSMiddleware)

**Статус: ⚠️ APPROVED WITH NOTES**
**Дата:** 2026-05-22

**Plan:** `docs/plans/feature/cors_settings.md`
**Task:** `docs/tasks/cors_settings.md`
**Branch:** `feature/cors-strategy`

---

## Итог

Реализация соответствует плану. `SplitCORSMiddleware` корректно разделяет PUBLIC и PROTECTED режимы по методу и пути. Все unit-тесты зелёные, линтер чистый. SMOKE-тесты подтвердили корректное CORS-поведение на реальном API.

**Единственный блокирующий недостаток:** Код сдан без прогона `make format` — `isort` и `black` изменили два файла (`src/main.py` и `src/settings.py`). Это нарушает требование `make format` без изменений. Форматирование применено в ходе ревью, повторный прогон тестов подтвердил их корректность (633 passed, 5 skipped).

---

## Изменённые файлы

| Действие | Файл |
|---|---|
| Изменён | `services/backend/src/main.py` |
| Изменён | `services/backend/src/settings.py` |
| Создан | `services/backend/src/core/middleware/__init__.py` |
| Создан | `services/backend/src/core/middleware/cors.py` |
| Создан | `services/backend/tests/unit/api/test_cors_middleware.py` |
| Изменён | `services/backend/.env` |
| Изменён | `services/backend/.env.example` |
| Изменён | `.kube/secrets/local/backend-secret.yml` |
| Изменён | `.kube/secrets/production/backend-secret.yml` |

---

## Чеклисты

### Архитектура (Backend)

- [x] `api/` не содержит бизнес-логики — CORS-логика вынесена в `core/middleware/cors.py`
- [x] `core/middleware/cors.py` не зависит от `repositories/`, `models/` или `settings` — принимает `cms_origins: list[str]` снаружи
- [x] Depends-сборка не нарушена — middleware инициализируется в `main.py` с `settings.cms_cors_origins`
- [x] `CORSMiddleware` из FastAPI полностью удалён
- [x] `SplitCORSMiddleware` — единственный CORS-middleware в приложении

### Access Policy

- [x] `GET /health`, `GET /api/news`, `GET /api/horses` и все прочие публичные GET → `ACAO: *`, без `credentials`
- [x] `GET /api/auth/me` → строгий CORS только для `cms_cors_origins`, с `credentials`
- [x] `GET /api/news-cms` → строгий CORS только для `cms_cors_origins`, с `credentials`
- [x] `POST/PATCH/DELETE` с разрешённым origin → строгий CORS с `credentials`
- [x] `POST/PATCH/DELETE` с запрещённым origin → нет CORS-заголовков (браузер блокирует)
- [x] Preflight POST с недопустимым origin → `400 Disallowed CORS origin`
- [x] Запросы без `Origin` → CORS-заголовки не добавляются
- [x] `CMS_CORS_ORIGINS` во всех envs содержит только домены CMS-панели, не consumer-сайтов

### `_PROTECTED_GET_PATH_PREFIXES` — верификация покрытия

Проверены все GET-эндпоинты с `get_current_user` или `get_protected_equestrian_context`:

| Эндпоинт | Зависимость | Тип | Правильно в списке? |
|---|---|---|---|
| `GET /api/auth/me` | `get_current_user` | CMS-only | ✅ Присутствует |
| `GET /api/news-cms` | `get_current_user` + `get_protected_equestrian_context` | CMS-only | ✅ Присутствует |
| `GET /api/horses` | `get_read_equestrian_context` (гибридный) | Публичный (service key) | ✅ Не в списке |
| `GET /api/horses/{id}` | `get_read_equestrian_context` | Публичный | ✅ Не в списке |
| `GET /api/news` | `get_public_equestrian_context` | Публичный | ✅ Не в списке |
| `GET /api/news/{id}` | `get_public_equestrian_context` | Публичный | ✅ Не в списке |
| `GET /api/horses/breeds/*` | `get_read_equestrian_context` | Публичный | ✅ Не в списке |
| `GET /api/prices/*` | `get_read_equestrian_context` | Публичный | ✅ Не в списке |
| `GET /api/site_settings/*` | `get_read_equestrian_context` | Публичный | ✅ Не в списке |
| `GET /api/photos/*` | `get_read_equestrian_context` | Публичный | ✅ Не в списке |

Вывод: `_PROTECTED_GET_PATH_PREFIXES` корректно покрывает ровно те GET-эндпоинты, которые требуют исключительно cookie-авторизации. Гибридные эндпоинты (`get_read_equestrian_context`) обслуживаются через `X-Equestrian-Service-Key` и получают `ACAO: *` — что правильно по контракту Access Policy.

### Код-стиль

- [x] mypy: `Success: no issues found in 138 source files`
- [x] flake8: чисто
- [x] ruff: `All checks passed!`
- [⚠️] `make format`: **применил изменения** — `isort` переместил `SplitCORSMiddleware` import в `main.py`, `black` отформатировал list comprehension в `settings.py`. Код исправлен в ходе ревью.

### Тесты

- [x] `make test`: **633 passed, 5 skipped**, 0 failed
- [x] `tests/unit/api/test_cors_middleware.py`: 14 тестов, все зелёные
- [x] Тесты покрывают: public GET → wildcard, protected POST → strict CORS, protected GET CMS-only, preflight, no-origin

---

## Тесты

```
make test: 633 passed, 5 skipped, 0 failed
make lint: чисто (mypy + flake8 + ruff)
make format: применил изменения (isort + black) — исправлено в ходе ревью
```

---

## SMOKE-тесты

Авторизация: `POST /api/auth/login` → 200, cookie сохранены.

| # | Endpoint | Method | Origin | HTTP | Time | Результат |
|---|---|---|---|---|---|---|
| SM-01 | `GET /health` | anonymous | `https://stable-site.example.com` | 200 | 2 ms | ✅ ACAO: * |
| SM-02 | `GET /api/news` | anonymous | `https://stable-site.example.com` | 200 | 11 ms | ✅ ACAO: *, no credentials |
| SM-03 | `GET /api/auth/me` | authenticated | `http://localhost:3001` (CMS) | 200 | 28 ms | ✅ ACAO: origin, credentials: true |
| SM-04 | `GET /api/auth/me` | authenticated | `https://evil.com` | 401 | 34 ms | ✅ нет CORS-заголовков |
| SM-05 | `GET /api/news-cms` | authenticated | `http://localhost:3001` (CMS) | 200 | 43 ms | ✅ ACAO: origin, credentials: true |
| SM-06 | `GET /api/news-cms` | authenticated | `https://stable-site.example.com` | 200 | 38 ms | ✅ нет ACAO (consumer origin) |
| SM-07 | `OPTIONS /api/auth/login` preflight POST | — | `http://localhost:3001` (CMS) | 200 | 2 ms | ✅ ACAO: origin, credentials: true |
| SM-08 | `OPTIONS /api/auth/login` preflight POST | — | `https://evil.com` | 400 | 2 ms | ✅ Disallowed CORS origin, нет ACAO |
| SM-09 | `OPTIONS /api/news` preflight GET | — | `https://stable-site.example.com` | 200 | 1 ms | ✅ ACAO: *, нет credentials |
| SM-10 | `GET /health` без Origin | — | — | 200 | 2 ms | ✅ нет CORS-заголовков |
| SM-11 | `POST /api/auth/login` | — | `http://localhost:3001` (CMS) | 200 | 40 ms | ✅ ACAO: origin, credentials: true |
| SM-12 | `POST /api/auth/login` | — | `https://evil.com` | 200 | 58 ms | ✅ нет ACAO (запрос прошёл, CORS заблокирует браузер) |

**12/12 тестов прошли.**

---

## Access Verification Results

### Anonymous / Public

- `GET /api/news`, `GET /api/horses`, `GET /health` → `ACAO: *`, без credentials ✅
- Consumer-домен получает wildcard без каких-либо ограничений ✅
- `GET /api/news-cms` с consumer-доменом → нет CORS-заголовков (браузер заблокирует) ✅

### Authenticated / Protected

- `GET /api/auth/me` с CMS-origin → строгий CORS с credentials ✅
- `GET /api/auth/me` с посторонним origin → нет CORS-заголовков ✅
- `GET /api/news-cms` с CMS-origin → строгий CORS с credentials ✅
- `POST` с CMS-origin → строгий CORS с credentials ✅
- `POST` с посторонним origin → нет CORS-заголовков ✅

### Preflight

- POST preflight с допустимым origin → `200`, строгие заголовки, `Vary: Origin` ✅
- POST preflight с недопустимым origin → `400 Disallowed CORS origin` ✅
- GET preflight с любым origin → `200`, wildcard ✅

### Исключения

- `POST /api/auth/login` — публичный write, разрешён, явно задокументирован в плане ✅
- `GET /api/auth/me`, `GET /api/news-cms` — защищённые GET, явно в `_PROTECTED_GET_PATH_PREFIXES` ✅

---

## Замечания для Backend агента

1. **[BLOCKER-RESOLVED]** Код не был отформатирован перед сдачей (`make format` изменил `src/main.py` и `src/settings.py`). Исправлено в ходе ревью. В следующих задачах прогонять `make format` до сдачи.

2. **[INFO]** `_PROTECTED_GET_PATH_PREFIXES` требует ручного обновления при добавлении новых CMS-only GET эндпоинтов. Это ожидаемо и задокументировано в плане — правило следует соблюдать.

3. **[INFO]** `POST /api/auth/register` принимает запросы с любого origin — это ожидаемо для открытой регистрации, но стоит иметь в виду при наращивании функциональности.

---

## Готовность к merge

Реализация функционально корректна. Форматирование исправлено в ходе ревью. Merge допустим после применения форматирования (`make format` уже выполнен, изменения вступили в силу).
