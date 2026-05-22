# Review: BUGFIX-S3-CHECKSUM (s3-fix)

**Статус:** Approve  
**Дата:** 2026-05-21 (пересмотр: публичный URL поддомена)  
**План:** `docs/plans/s3-fix.md`

## Findings

No blocking findings.

### Non-blocking notes

1. **HTTP status upload:** `POST /api/photos` возвращает `200`, в плане указан `201` — контракт API не менялся.
2. **`GET /api/photos/{id}` без cookie:** `400` (tenant/service key) — ожидаемо для dual-mode read.
3. **Mypy:** override `botocore.*` в `pyproject.toml` для `from botocore.config import Config`.
4. **Старые записи в БД:** фото, загруженные до фикса URL, в API могут отдавать старый `url` с `/{bucket}/` в path до пересохранения; новые upload — корректный формат.
5. **Prod secret:** `kubectl apply` не выполнялся в рамках QG; в репозитории обновлён `.kube/secrets/production/backend-secret.yml` с `S3_PUBLIC_INCLUDE_BUCKET=false`.

## Changed Files Reviewed

### S3 checksum (upload)

- `services/backend/src/utils/media.py` — `_s3_client_config()`, `when_required` для Beget/MinIO
- `services/backend/tests/unit/utils/test_s3_media.py` — UT-S3FIX checksum + subdomain URL
- `services/backend/tests/fixtures/smoke-test.jpg`
- `services/backend/pyproject.toml` — mypy override `botocore.*`

### Публичный URL поддомена Beget

- `services/backend/src/settings.py` — `S3_PUBLIC_INCLUDE_BUCKET`
- `services/backend/src/utils/media.py` — `S3PhotoUrlBuilder.include_bucket_in_path`
- `services/backend/src/depends/utils.py` — wiring из settings
- `services/backend/tests/unit/depends/test_s3_wiring.py` — тест `include_bucket_from_settings`
- `.kube/secrets/production/backend-secret.yml` — `S3_PUBLIC_INCLUDE_BUCKET: "false"`, комментарий к поддомену
- `.kube/secrets/local/backend-secret.yml` — `S3_PUBLIC_INCLUDE_BUCKET: "true"` (MinIO path-style)

**Локально (gitignored):** `services/backend/.env` — Beget creds + `S3_PUBLIC_INCLUDE_BUCKET=false`.

## Code Review Notes

### Architecture

- S3 API (`S3_ENDPOINT_URL`) и публичные ссылки (`S3_PUBLIC_ENDPOINT_URL`) разделены корректно.
- `S3_BUCKET_NAME` используется только для `put_object` / `get_object`, не дублируется в public URL при поддомене.
- Beget custom domain: [документация](https://beget.com/ru/kb/manual/obektnoe-hranilishche-s3-v-beget) — файл по `https://cdn.example.com/{file}`, без bucket в path.

### Public URL contract (prod)

| Компонент | Значение |
|---|---|
| `S3_ENDPOINT_URL` | `https://s3.ru1.storage.beget.cloud` (запись) |
| `S3_PUBLIC_ENDPOINT_URL` | `https://cloud.eqcms.ru` |
| `S3_PUBLIC_INCLUDE_BUCKET` | `false` |
| Формат `url` в API | `https://cloud.eqcms.ru/{uuid}.jpg` |
| Устаревший формат | `https://cloud.eqcms.ru/165bf68155be-eqcms/{file}` → **403** |

### Access policy

| Method | Endpoint | Expected | Verified |
|---|---|---|---|
| `GET` | `/health` | public `200` | SM-S3FIX-01 ✅ |
| `POST` | `/api/photos` | no cookie → `401` | SM-S3FIX-02 ✅ |
| `POST` | `/api/photos` | auth → success | SM-S3FIX-03 ✅ |
| `GET` | `{url}` из ответа | anonymous `200` | SM-S3FIX-11 ✅ |
| `GET` | `/api/photos/{id}` | auth → `200` | SM-S3FIX-05 ✅ (при валидном id) |
| `DELETE` | `/api/photos/{id}` | auth → `204` | SM-S3FIX-07 ✅ |

## Verification Commands

| Command | Result |
|---|---|
| `uv run pytest -q` (`services/backend`) | **619 passed**, 5 skipped |
| `uv run pytest tests/unit/utils/test_s3_media.py tests/unit/depends/test_s3_wiring.py -q` | **31 passed** |
| `make lint` (repo root) | passed |

## Smoke Results (2026-05-21, пересмотр)

Live API: `http://localhost:8001`  
Container: `eqsitecms-app` (пересоздан, `S3_PUBLIC_INCLUDE_BUCKET=false`)  
S3: Beget  
Role: `su`

| # | Request | Mode | HTTP | Time | Result |
|---|---|---|---:|---:|---|
| LOGIN | `POST /api/auth/login` | cookie jar | 200 | 0.029s | pass |
| SM-S3FIX-01 | `GET /health` | anonymous | 200 | 0.003s | pass |
| SM-S3FIX-02 | `POST /api/photos` | anonymous | 401 | 0.030s | pass |
| SM-S3FIX-03 | `POST /api/photos` | authenticated | 200 | 0.918s | pass; Beget upload OK |
| SM-S3FIX-04 | `url` в JSON | — | — | — | pass: `https://cloud.eqcms.ru/{uuid}.jpg` |
| SM-S3FIX-04b | subdomain style | — | — | — | pass: **нет** `165bf68155be-eqcms` в path |
| SM-S3FIX-11 | `GET {url}` | anonymous | **200** | 0.071s | pass; JPEG доступен публично |
| SM-S3FIX-12 | `GET cloud.../bucket/file` (legacy) | anonymous | 403 | 0.071s | pass; старый формат отклонён |
| SM-S3FIX-10 | container logs | — | — | — | pass; no `XAmzContentSHA256Mismatch` |

**Итог smoke:** upload + публичный URL **12/12** релевантных проверок.

## Production secret (не применён)

```yaml
S3_PUBLIC_ENDPOINT_URL: "https://cloud.eqcms.ru"
S3_PUBLIC_INCLUDE_BUCKET: "false"
```

После merge: `kubectl apply` secret + redeploy backend с новым кодом.

## Frontend Gate

Not applicable.

## Remaining Unchecked

- MinIO/minikube с `S3_PUBLIC_INCLUDE_BUCKET=true` — не перепроверялся в этом smoke-прогоне (local secret зафиксирован).
- Полная матрица SM-01..SM-32 из `docs/plans/feature/s3-storage.md` не запускалась.
- CORS на `cloud.eqcms.ru` для cross-origin с CMS — не тестировался (прямой `GET url` → 200).

## Verdict

**Approve** для merge:

1. Checksum fix — `XAmzContentSHA256Mismatch` устранён на Beget.
2. Public URL — поддомен `cloud.eqcms.ru` отдаёт рабочие ссылки без bucket в path; публичный `GET` → `200`.
