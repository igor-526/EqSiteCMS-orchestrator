# План: исправление загрузки медиа в S3 (Beget / MinIO)

**Тикет:** BUGFIX-S3-CHECKSUM  
**Дата:** 2026-05-21  
**Затронутые сервисы:** `services/backend`  
**Ветка:** `bugfix/s3-checksum-beget`  
**Статус:** ✅ Реализовано (2026-05-21), smoke на `eqsitecms-app` + Beget S3

---

## Контекст

После перехода на S3 (`docs/plans/feature/s3-storage.md`) загрузка через `POST /api/photos` падает на этапе `S3MediaStorage.save` → `put_object`:

```
botocore.exceptions.ClientError: An error occurred (XAmzContentSHA256Mismatch) when calling the PutObject operation
```

**Целевое хранилище для проверки фикса:** Beget S3 (креды из `.kube/secrets/production/backend-secret.yml` — только как **источник значений** для локального `.env`, без применения secret в кластер).

**Причина (техническая):** с `botocore` ≥ 1.36 / `aiobotocore` ≥ 2.18 AWS включил [default data integrity / checksum](https://docs.aws.amazon.com/sdkref/latest/guide/feature-dataintegrity.html) для S3. Beget и другие S3-compatible провайдеры часто не поддерживают новое поведение → `XAmzContentSHA256Mismatch`, `MissingContentLength` и т.п. ([boto3#4398](https://github.com/boto/boto3/issues/4398), [aiobotocore#1290](https://github.com/aio-libs/aiobotocore/issues/1290)).

**Дополнительно:** бакет `165bf68155be-eqcms` должен существовать в панели Beget — без него upload не заработает (часто `NoSuchBucket`).

**Вне scope этого тикета:**

- Любые действия в **Kubernetes** (`kubectl`, secrets, deploy, minikube, ingress prod).
- Настройка DNS/CDN для `cloud.eqcms.ru` (влияет на открытие `url` в браузере, не на `PutObject`).

---

## Цель

После реализации и локальной проверки:

1. `S3MediaStorage` использует `request_checksum_calculation=when_required` и `response_checksum_validation=when_required`.
2. `POST /api/photos` с Beget-кредами в `.env` контейнера `eqsitecms-app` → `201`, без `XAmzContentSHA256Mismatch`.
3. Unit-тесты подтверждают передачу `Config` в boto3-клиент.
4. SMOKE по скиллу `api-smoke-test` на API контейнера пройден.

**Критерий приёмки:** SM-S3FIX-03 (upload) ✅; SM-S3FIX-11 (`GET url` → `200`) ✅; URL без bucket в path при `S3_PUBLIC_INCLUDE_BUCKET=false`.

---

## Детали реализации

### 1. Backend: `botocore.config.Config` в `S3MediaStorage`

**Файл:** `services/backend/src/utils/media.py`

| Изменение | Описание |
|---|---|
| `_s3_client_config()` | `Config(request_checksum_calculation="when_required", response_checksum_validation="when_required")` |
| `save` / `load` / `delete` | `config=_s3_client_config()` в `session.client("s3", ...)` |

```python
from botocore.config import Config

def _s3_client_config() -> Config:
    return Config(
        request_checksum_calculation="when_required",
        response_checksum_validation="when_required",
    )
```

**Не менять:** `PhotoService`, `api/photos.py`, URL builder, access policy.

**Не добавлять** в код/env для этого тикета: `AWS_REQUEST_CHECKSUM_*` в k8s — проверка только через docker `.env` + пересоздание контейнера.

---

### 2. Plan B: pin зависимостей (только если Config не помог на Beget)

**Файл:** `services/backend/pyproject.toml`

```toml
"aioboto3==13.3.0",
"aiobotocore==2.17.0",
"botocore==1.35.99",
```

После pin: `uv lock`, **пересборка образа** backend и **пересоздание** `eqsitecms-app` (см. ниже).

---

### 3. Предусловие вне репозитория: бакет Beget

| Шаг | Действие |
|---|---|
| 1 | В панели Beget S3 создать бакет `165bf68155be-eqcms` (имя как `S3_BUCKET_NAME` в secret) |
| 2 | Убедиться, что access key из secret имеет `PutObject` / `GetObject` / `DeleteObject` |

---

## Локальная проверка на API-контейнере (после merge кода)

> **В Kubernetes ничего не делаем.** Проверка только через docker-compose и `.env`.

### Шаг A. Подставить S3-креды в `.env`

**Файл:** `services/backend/.env` (локальный, не коммитить prod-секреты в git).

Скопировать **только** переменные S3 из `.kube/secrets/production/backend-secret.yml` (`stringData`):

| Переменная | Источник в secret |
|---|---|
| `S3_ENDPOINT_URL` | `https://s3.ru1.storage.beget.cloud` |
| `S3_ACCESS_KEY` | значение из secret |
| `S3_SECRET_KEY` | значение из secret |
| `S3_BUCKET_NAME` | `165bf68155be-eqcms` |
| `S3_PUBLIC_ENDPOINT_URL` | `https://cloud.eqcms.ru` |

**Важно:** остальные переменные `.env` (PostgreSQL, `SECRET_KEY`, домены) **не перезаписывать** значениями из prod secret — оставить локальные настройки docker-compose, иначе backend потеряет связь с локальной БД.

Опционально (если Config в коде недостаточен при отладке):

```env
AWS_REQUEST_CHECKSUM_CALCULATION=when_required
AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
```

### Шаг B. Пересоздать контейнер backend

После изменения `.env` переменные не подхватываются без пересоздания контейнера.

```bash
# из корня монорепо, при необходимости уточнить compose-файл
docker compose -f .docker-compose/docker-compose.be.yml up -d --force-recreate app
# или явно по имени/ID:
docker rm -f eqsitecms-app
docker compose -f .docker-compose/docker-compose.be.yml up -d app
```

Текущий контейнер для ориентира: `eqsitecms-app` (`d6144bd0c567`).

Проверка, что env применился:

```bash
docker exec eqsitecms-app env | grep -E '^S3_|^AWS_REQUEST'
```

Health:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:<EXPOSE_APP_PORT>/health
```

`base_url` для smoke — из `.claude/skills/api-smoke-test/credentials.json` (сейчас `http://localhost:8001`; должен совпадать с проброшенным портом `EXPOSE_APP_PORT` в `.docker-compose/.env`).

### Шаг C. SMOKE через скилл `api-smoke-test`

Запуск **после** шагов A–B, план: `docs/plans/s3-fix.md`, роль по умолчанию `superuser`.

Скилл: логин → cookie → таблица ниже (public без cookie / protected с cookie).

---

## Access policy

| Method | Endpoint | Access class | Поведение |
|---|---|---|---|
| `POST` | `/api/photos` | Protected Write | С cookie → `201`; без cookie → `401`/`403` |
| `PATCH` | `/api/photos/{id}` | Protected Write | То же |
| `GET` | `/api/photos`, `/api/photos/{id}` | Public Read (CMS read context) | Без cookie → `200` (при валидном tenant context) |

---

## Тесты

### Unit

**Файл:** `services/backend/tests/unit/utils/test_media_storage.py`

| ID | Сценарий | Ожидание |
|---|---|---|
| UT-S3FIX-01 | `save`: mock `session.client` | `config` с `when_required` |
| UT-S3FIX-02 | `save`: mock `put_object` | bucket, key, body |
| UT-S3FIX-03 | `load` / `delete` | тот же `config` |
| UT-S3FIX-04 | `save`: `ClientError` | пробрасывается |
| UT-S3FIX-05 | `_s3_client_config()` | стабильный Config |

```bash
cd services/backend
uv run pytest tests/unit/utils/test_media_storage.py -q
uv run ruff check src/utils/media.py tests/unit/utils/test_media_storage.py
```

### SMOKE-тесты на реальном API

Выполняются скиллом **`api-smoke-test`** против контейнера `eqsitecms-app` после подстановки Beget S3 в `.env` и `--force-recreate`.

**Переменные:**

```
BASE_URL=http://localhost:8001
AUTH_ENDPOINT=/api/auth/login
COOKIE_JAR=/tmp/eqsitecms-smoke-cookies.txt
S3_PUBLIC_INCLUDE_BUCKET=false
SMOKE_IMAGE=services/backend/tests/fixtures/smoke-test.jpg
PHOTO_ID=<из ответа SM-S3FIX-03>
```

> `BASE_URL` и порт — как в `credentials.json` и `EXPOSE_APP_PORT`.  
> `SMOKE_IMAGE` — любой маленький JPEG в репозитории; если нет — создать `tests/fixtures/smoke-test.jpg` (1×1 px) в рамках реализации.

| # | Запрос | Access | Проверка |
|---|---|---|---|
| SM-S3FIX-01 | `GET {BASE_URL}/health` | public | HTTP `200` |
| SM-S3FIX-02 | `POST {BASE_URL}/api/photos` multipart, **без** cookie | protected | HTTP `401` или `403` |
| SM-S3FIX-03 | `POST {BASE_URL}/api/photos` `-F file=@{SMOKE_IMAGE}`, **с** cookie | protected | HTTP `201`, JSON: `id`, `path`, `url` |
| SM-S3FIX-04 | Тело SM-S3FIX-03: поле `url` | — | `https://cloud.eqcms.ru/{filename}` **без** bucket в path |
| SM-S3FIX-11 | `GET {url}` из SM-S3FIX-03 | public | HTTP `200`, image/* |
| SM-S3FIX-12 | `GET https://cloud.eqcms.ru/165bf68155be-eqcms/{path}` | public | HTTP `403` (устаревший формат) |
| SM-S3FIX-05 | `GET {BASE_URL}/api/photos/{PHOTO_ID}` **с** cookie | protected read | HTTP `200`, `id` совпадает |
| SM-S3FIX-06 | `GET {BASE_URL}/api/photos/{PHOTO_ID}` **без** cookie | public read | HTTP `200` (если tenant context доступен без auth) или контрактный `400`/`401` — зафиксировать фактический статус в отчёте |
| SM-S3FIX-07 | `DELETE {BASE_URL}/api/photos/{PHOTO_ID}` **с** cookie | protected | HTTP `200`/`204` |
| SM-S3FIX-08 | `GET {BASE_URL}/api/photos/{PHOTO_ID}` после DELETE | — | HTTP `404` |
| SM-S3FIX-09 | `POST` с невалидным расширением `.txt` **с** cookie | protected | HTTP `400`/`422`, не `500` |
| SM-S3FIX-10 | Логи контейнера после SM-S3FIX-03 | — | нет `XAmzContentSHA256Mismatch` |

**Пример multipart (для скилла / ручной проверки):**

```bash
curl -s -b /tmp/eqsitecms-smoke-cookies.txt \
  -X POST "http://localhost:8001/api/photos" \
  -F "file=@services/backend/tests/fixtures/smoke-test.jpg" \
  -F "name=smoke-s3-fix"
```

**Опционально (вне HTTP smoke):** прямой `put_object` внутри контейнера — только если SM-S3FIX-03 падает и нужна изоляция S3 vs API.

---

## Порядок выполнения

1. **Согласование плана** с владельцем (текущий шаг).
2. **Backend:** `media.py` + unit UT-S3FIX-*.
3. **Локально:** Beget bucket в панели (если ещё нет).
4. **Локально:** S3-переменные в `services/backend/.env` из production secret (только S3_*).
5. **Локально:** `docker compose ... up -d --force-recreate` для `eqsitecms-app`.
6. **SMOKE:** скилл `api-smoke-test` по таблице SM-S3FIX-*.
7. **Если SM-S3FIX-03 fail:** Plan B pin → rebuild image → снова шаги 4–6.
8. **Quality Gate:** ревью + `docs/reports/s3-fix-review.md`.

**Не выполнять до approve:** пункты 2–8.

---

## Риски

| Риск | Митигация |
|---|---|
| Config не помогает на Beget | Plan B pin + пересоздание контейнера |
| Бакет не создан на Beget | Создать в панели до smoke |
| Перезапись всего `.env` prod-значениями | Менять **только** `S3_*` |
| `cloud.eqcms.ru` недоступен | SM-S3FIX-04 может не открыться в браузере; upload всё равно валидируется по `201` и логам |
| Секреты в git | `.env` в `.gitignore`; secret-файл — только read-only reference |

---

## Чеклист

### Согласование

- [x] План утверждён — реализация выполнена

### Backend

- [x] `S3_PUBLIC_INCLUDE_BUCKET` + `S3PhotoUrlBuilder` без bucket для поддомена Beget
- [x] Production secret: `S3_PUBLIC_INCLUDE_BUCKET=false`
- [x] `_s3_client_config()` в `media.py`
- [x] Unit UT-S3FIX + регрессия `test_s3_media.py` (23 passed)
- [x] Fixture `tests/fixtures/smoke-test.jpg`

### Локальная проверка (без k8s)

- [x] Бакет `165bf68155be-eqcms` на Beget (upload успешен)
- [x] `S3_*` в `services/backend/.env` из production secret
- [x] Контейнер `eqsitecms-app` пересоздан после правки `.env`
- [x] `docker exec ... env | grep S3_` — значения Beget
- [x] SM-S3FIX-01 … SM-S3FIX-10 (SM-S3FIX-03 → `200`, без `XAmzContentSHA256Mismatch`)

### Fallback

- [x] Plan B pin не потребовался

### Quality Gate

- [x] Ревью diff
- [x] Отчёт `docs/reports/s3-fix-review.md` — **Approve**

---

## Связанные файлы

| Файл | Роль |
|---|---|
| `services/backend/src/utils/media.py` | Основной фикс |
| `services/backend/pyproject.toml` | Plan B |
| `services/backend/.env` | Локальные S3-креды (не коммитить) |
| `.kube/secrets/production/backend-secret.yml` | **Справочник** значений S3 (не apply в k8s) |
| `.claude/skills/api-smoke-test/credentials.json` | `base_url`, роли для smoke |
| `.docker-compose/docker-compose.be.yml` | Сервис `app` → `eqsitecms-app` |
| `docs/plans/feature/s3-storage.md` | Исходная S3-миграция |

---

## Manual QA (опционально после smoke)

1. CMS UI: загрузка фото в галерею (если frontend смотрит на тот же `BASE_URL`).
2. Проверить превью по `url` (зависит от `cloud.eqcms.ru` / public read).
