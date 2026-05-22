# План: Переход с локального хранилища на S3/Minio

**Дата:** 2026-05-15
**Затронутые сервисы:** services/backend, .docker-compose/
**Ветка:** feature/s3-storage

---

## Контекст

Галерея фотографий работает на примонтированном томе (`../services/backend/storage:/eqsitecms/storage`).
Фактические пути:
- В коде по умолчанию: `storage/media/` (относительно корня проекта backend)
- На сервере: `src/media/`
- В контейнере docker-compose: `/eqsitecms/storage`

Поле `path` в таблице `photos` хранит **только filename** (uuid+расширение, например `abc123.jpg`), без директорийного префикса.

URL строился через `SettingsPhotoUrlBuilder`: `http(s)://<cms_backend_domain>/media/<filename>`.
В debug-режиме `main.py` монтировал `/media` как StaticFiles из локальной директории.

Нужно перейти на S3-совместимое хранилище, используя Minio в dev-окружении.
Фронтенд изменений не получает — API-контракты (поле `url` в ответах) остаются теми же.

**Совместимость с local-хранилищем не сохраняется. Только S3.**

## Цель

После реализации:
- Загрузка и получение файлов галереи происходит через Minio/S3.
- В dev-окружении поднимается Minio-контейнер в compose-инфраструктуре.
- URL фотографий, возвращаемые API, ведут к Minio endpoint и остаются рабочими без изменений frontend.
- Существующие фотографии переносятся одноразовым скриптом в бакет `gallery`.
- Локальный том отключён, StaticFiles mount убран полностью.
- `LocalMediaStorage`, `SettingsPhotoUrlBuilder`, `resolve_media_base_dir` удалены из `utils/media.py`.
- Переключатель `MEDIA_STORAGE_BACKEND` не существует — система работает только с S3.

---

## Детали реализации

### 1. Infra: Minio в docker-compose

**Файл:** `.docker-compose/docker-compose.infra.yml`

Добавить сервис `minio` в существующий compose-файл инфраструктуры:

```yaml
minio:
  image: minio/minio:latest
  container_name: eqsitecms-minio
  restart: always
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
  expose:
    - 9000
  ports:
    - "${EXPOSE_MINIO_API_PORT:-9000}:9000"
    - "${EXPOSE_MINIO_CONSOLE_PORT:-9001}:9001"
  volumes:
    - eqsitecms_minio_data:/data
  networks:
    - eqsitecms_network
  healthcheck:
    test: ["CMD", "mc", "ready", "local"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 20s
```

Добавить volume:
```yaml
volumes:
  eqsitecms_db_data:
  eqsitecms_minio_data:
```

**Файл:** `.docker-compose/.env` (существующий файл с `DEV_MOUNT=rw`)

Добавить переменные Minio:
```
MINIO_ROOT_USER=eqsitecmsminio
MINIO_ROOT_PASSWORD=eqsitecmsminio
EXPOSE_MINIO_API_PORT=9000
EXPOSE_MINIO_CONSOLE_PORT=9001
```

> Примечание: `.docker-compose/.env` уже используется compose (содержит `DEV_MOUNT=rw`), поэтому Minio-переменные добавляются туда же. Секреты для prod выносятся в отдельный `.env.infra.prod` (вне git).

**Бакет `gallery`** создаётся автоматически при первом запуске скрипта миграции, либо через mc-команду в init-контейнере. Для dev достаточно создать через скрипт миграции.

---

### 2. Backend: настройки S3

**Файл:** `services/backend/src/settings.py`

Добавить в класс `Settings` (без переключателя `MEDIA_STORAGE_BACKEND`):

```python
# S3 / Minio
s3_endpoint_url: str = Field(default="http://minio:9000", alias="S3_ENDPOINT_URL")
s3_access_key: str = Field(default="eqsitecmsminio", alias="S3_ACCESS_KEY")
s3_secret_key: str = Field(default="eqsitecmsminio", alias="S3_SECRET_KEY")
s3_bucket_name: str = Field(default="gallery", alias="S3_BUCKET_NAME")
s3_public_endpoint_url: str = Field(
    default="http://localhost:9000", alias="S3_PUBLIC_ENDPOINT_URL"
)
```

Пояснение к `s3_public_endpoint_url`:
- `s3_endpoint_url` — адрес Minio изнутри контейнера backend (для операций save/load/delete).
- `s3_public_endpoint_url` — адрес, доступный браузеру/клиентам (для построения URL в API-ответах). В dev это `http://localhost:9000`, в prod — домен/CDN.

**Файл:** `services/backend/.env`

Добавить переменные (значения для dev):
```
S3_ENDPOINT_URL=http://minio:9000
S3_ACCESS_KEY=eqsitecmsminio
S3_SECRET_KEY=eqsitecmsminio
S3_BUCKET_NAME=gallery
S3_PUBLIC_ENDPOINT_URL=http://localhost:9000
```

> `MEDIA_STORAGE_BACKEND` не добавляется — переключатель упразднён.

---

### 3. Backend: зависимость aiobotocore / aioboto3

**Файл:** `services/backend/pyproject.toml`

Добавить зависимость:
```
aioboto3>=13.0.0
```

`aioboto3` — async-обёртка над `boto3`, стандартный инструмент для async S3 в Python.
Устанавливается через: `uv add aioboto3`.

---

### 4. Backend: реализации S3MediaStorage и S3PhotoUrlBuilder

**Файл:** `services/backend/src/utils/media.py`

Удалить: `LocalMediaStorage`, `SettingsPhotoUrlBuilder`, `resolve_media_base_dir`.

Оставить только два класса:

#### S3MediaStorage

```python
class S3MediaStorage:
    def __init__(
        self,
        endpoint_url: str,
        access_key: str,
        secret_key: str,
        bucket_name: str,
    ) -> None:
        self.endpoint_url = endpoint_url
        self.access_key = access_key
        self.secret_key = secret_key
        self.bucket_name = bucket_name

    async def save(self, file_content: bytes, filename: str) -> str:
        import aioboto3
        session = aioboto3.Session()
        async with session.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
        ) as s3:
            await s3.put_object(
                Bucket=self.bucket_name,
                Key=filename,
                Body=file_content,
            )
        return filename

    async def load(self, filename: str) -> bytes:
        import aioboto3
        session = aioboto3.Session()
        async with session.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
        ) as s3:
            response = await s3.get_object(
                Bucket=self.bucket_name, Key=filename
            )
            return await response["Body"].read()

    async def delete(self, filename: str) -> None:
        import aioboto3
        session = aioboto3.Session()
        async with session.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
        ) as s3:
            await s3.delete_object(Bucket=self.bucket_name, Key=filename)
```

> Создавать `aioboto3.Session()` при каждом вызове — безопасно (lightweight). Альтернатива — хранить session как атрибут. Обе схемы допустимы, выбрать по результату проверки рекомендаций aioboto3.

#### S3PhotoUrlBuilder

URL строится как публичный путь к объекту в Minio:
`<s3_public_endpoint_url>/<bucket_name>/<filename>`

Выбор подхода — **публичные URL** (не presigned):
- Presigned URL содержат временные подписи и меняются при каждом запросе. Это нарушило бы кэширование и усложнило бы frontend.
- Бакет `gallery` — публичный (только read). Для dev Minio bucket policy настраивается через скрипт миграции.
- В prod — аналогично (или через CDN-проксирование).

```python
class S3PhotoUrlBuilder:
    def __init__(self, public_endpoint_url: str, bucket_name: str) -> None:
        self.public_endpoint_url = public_endpoint_url.rstrip("/")
        self.bucket_name = bucket_name

    def build(self, filename: str) -> str:
        return f"{self.public_endpoint_url}/{self.bucket_name}/{filename}"
```

---

### 5. Wiring: depends/utils.py

**Файл:** `services/backend/src/depends/utils.py`

Упростить фабрики — убрать условную ветку local, возвращать только S3:

```python
async def get_media_storage() -> MediaStorageProtocol:
    return S3MediaStorage(
        endpoint_url=settings.s3_endpoint_url,
        access_key=settings.s3_access_key,
        secret_key=settings.s3_secret_key,
        bucket_name=settings.s3_bucket_name,
    )


async def get_photo_url_builder() -> PhotoUrlBuilderProtocol:
    return S3PhotoUrlBuilder(
        public_endpoint_url=settings.s3_public_endpoint_url,
        bucket_name=settings.s3_bucket_name,
    )
```

Удалить импорты: `LocalMediaStorage`, `SettingsPhotoUrlBuilder`, `resolve_media_base_dir`.
Добавить импорты: `S3MediaStorage`, `S3PhotoUrlBuilder`.

---

### 6. main.py: убрать StaticFiles полностью

**Файл:** `services/backend/src/main.py`

Удалить блок монтирования StaticFiles целиком:

```python
# УДАЛИТЬ:
if settings.debug and settings.media_storage_backend != "s3":
    media_dir = resolve_media_base_dir()
    media_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=str(media_dir)), name="media")
```

В S3-режиме (единственном) браузер получает файлы напрямую с Minio endpoint, StaticFiles не нужен.

---

### 7. docker-compose.be.yml: убрать медиа-том при S3-режиме

**Файл:** `.docker-compose/docker-compose.be.yml`

Том `../services/backend/storage:/eqsitecms/storage` становится избыточным.
Убрать его, оставив только logs-том.

Было:
```yaml
volumes:
  - ../services/backend/src:/eqsitecms/src:${DEV_MOUNT:-ro}
  - ../services/backend/scripts:/eqsitecms/scripts:ro
  - ../services/backend/storage:/eqsitecms/storage
  - ../services/backend/logs:/eqsitecms/logs
```

Станет:
```yaml
volumes:
  - ../services/backend/src:/eqsitecms/src:${DEV_MOUNT:-ro}
  - ../services/backend/scripts:/eqsitecms/scripts:ro
  - ../services/backend/logs:/eqsitecms/logs
```

---

### 8. Одноразовый скрипт миграции

**Файл:** `services/backend/scripts/migrate_media_to_s3.py`

Скрипт выполняет:
1. Создаёт бакет `gallery` в Minio (если не существует), устанавливает публичную bucket policy для read.
2. Загружает файлы из локальной директории в S3.
3. Проверяет, что `path` в БД хранит только filename (без директории) — и по необходимости исправляет.
4. Выводит отчёт об успехе/ошибках.

#### Логика поиска файлов

Скрипт проверяет оба известных пути:
- `services/backend/storage/media/` — путь по умолчанию в коде (dev/docker)
- `services/backend/src/media/` — путь на сервере (prod-сервер)

Определяет наличие файлов в каждом и использует непустой, либо оба.

#### Bucket policy (публичный read)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::gallery/*"]
    }
  ]
}
```

#### Структура скрипта

```python
#!/usr/bin/env python3
"""
Одноразовый скрипт: перенос медиафайлов из локального тома в Minio S3.

Использование (из директории services/backend):
  uv run scripts/migrate_media_to_s3.py

Переменные окружения (из .env или явно):
  S3_ENDPOINT_URL, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET_NAME
  POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_NAME
  MEDIA_SOURCE_DIR  # опционально: явно указать директорию с файлами
"""
import asyncio
import json
import os
from pathlib import Path

import aioboto3
import asyncpg


async def main() -> None:
    # --- S3 Config ---
    endpoint = os.environ["S3_ENDPOINT_URL"]
    access_key = os.environ["S3_ACCESS_KEY"]
    secret_key = os.environ["S3_SECRET_KEY"]
    bucket = os.environ.get("S3_BUCKET_NAME", "gallery")

    # --- Locate source dir ---
    source_dirs = []
    if explicit := os.environ.get("MEDIA_SOURCE_DIR"):
        source_dirs = [Path(explicit)]
    else:
        base = Path(__file__).resolve().parents[1]  # services/backend/
        candidates = [
            base / "storage" / "media",
            base / "src" / "media",
        ]
        source_dirs = [p for p in candidates if p.exists() and any(p.iterdir())]

    if not source_dirs:
        print("No media source directories found. Exiting.")
        return

    # --- S3: create bucket + set public read policy ---
    session = aioboto3.Session()
    async with session.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
    ) as s3:
        # Create bucket if not exists
        try:
            await s3.head_bucket(Bucket=bucket)
            print(f"Bucket '{bucket}' already exists.")
        except Exception:
            await s3.create_bucket(Bucket=bucket)
            print(f"Bucket '{bucket}' created.")

        # Set public read policy
        policy = {
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{bucket}/*"],
            }],
        }
        await s3.put_bucket_policy(
            Bucket=bucket,
            Policy=json.dumps(policy),
        )
        print("Bucket policy set to public read.")

        # --- Upload files ---
        total = 0
        errors = []
        for source_dir in source_dirs:
            print(f"Scanning: {source_dir}")
            for file_path in source_dir.iterdir():
                if not file_path.is_file():
                    continue
                filename = file_path.name
                try:
                    content = file_path.read_bytes()
                    await s3.put_object(Bucket=bucket, Key=filename, Body=content)
                    total += 1
                    print(f"  Uploaded: {filename}")
                except Exception as exc:
                    errors.append((filename, str(exc)))
                    print(f"  ERROR: {filename} — {exc}")

        print(f"\nUploaded: {total} files, Errors: {len(errors)}")
        if errors:
            print("Failed files:")
            for name, err in errors:
                print(f"  {name}: {err}")

    # --- DB: verify path column contains only filenames ---
    # path column stores only filename (no directory prefix).
    # If any row has a path with '/' or '\\', strip to basename.
    db_url = (
        f"postgresql://{os.environ['POSTGRES_USER']}:{os.environ['POSTGRES_PASSWORD']}"
        f"@{os.environ.get('POSTGRES_HOST', 'localhost')}:"
        f"{os.environ.get('POSTGRES_PORT', '5432')}/{os.environ['POSTGRES_NAME']}"
    )
    conn = await asyncpg.connect(db_url)
    try:
        rows = await conn.fetch("SELECT id, path FROM photos WHERE path LIKE '%/%' OR path LIKE '%\\\\%'")
        if rows:
            print(f"\nFound {len(rows)} DB rows with directory-prefixed paths. Fixing...")
            for row in rows:
                filename_only = Path(row["path"]).name
                await conn.execute(
                    "UPDATE photos SET path = $1 WHERE id = $2",
                    filename_only,
                    row["id"],
                )
                print(f"  Fixed: {row['path']} -> {filename_only}")
        else:
            print("\nDB paths are clean (filename-only). No updates needed.")
    finally:
        await conn.close()

    print("\nMigration complete.")


if __name__ == "__main__":
    asyncio.run(main())
```

#### Зависимости для скрипта

Помимо `aioboto3` (уже добавлен в prod-зависимости), скрипт использует `asyncpg` (уже есть).

#### Как запускать

```bash
# Внутри запущенного backend-контейнера:
docker exec -it eqsitecms-app bash -c "cd /eqsitecms && uv run scripts/migrate_media_to_s3.py"

# Или локально (переменные окружения задать вручную):
cd services/backend
S3_ENDPOINT_URL=http://localhost:9000 \
S3_ACCESS_KEY=eqsitecmsminio \
S3_SECRET_KEY=eqsitecmsminio \
POSTGRES_USER=eqsitecms \
POSTGRES_PASSWORD=eqsitecms \
POSTGRES_HOST=localhost \
POSTGRES_PORT=5433 \
POSTGRES_NAME=eqsitecms \
uv run scripts/migrate_media_to_s3.py
```

---

## Access Policy

Затронутые endpoint'ы не меняют свою access class:
- `GET /api/photos/*` — Public Read (без изменений)
- `POST/PATCH/DELETE /api/photos/*` — Protected Write (без изменений)

Minio бакет `gallery` — публичный read (bucket policy). Прямые операции write к Minio доступны только через backend (credentials в settings).

---

## Порядок выполнения

1. **Infra** (`.docker-compose/`): Добавить Minio в `docker-compose.infra.yml`, env в `.docker-compose/.env`.
2. **Зависимость**: добавить `aioboto3` в `pyproject.toml` (`uv add aioboto3`).
3. **Settings**: добавить S3-параметры в `settings.py` (без `MEDIA_STORAGE_BACKEND`), обновить `services/backend/.env`.
4. **utils/media.py**: удалить `LocalMediaStorage`, `SettingsPhotoUrlBuilder`, `resolve_media_base_dir`; оставить только `S3MediaStorage`, `S3PhotoUrlBuilder`.
5. **depends/utils.py**: упростить фабрики `get_media_storage`, `get_photo_url_builder` — только S3, убрать импорты local-классов.
6. **main.py**: удалить блок монтирования StaticFiles полностью.
7. **docker-compose.be.yml**: убрать медиа-том `storage`.
8. **Скрипт**: создать `scripts/migrate_media_to_s3.py`.
9. **Запустить** `docker compose ... up` для Minio, убедиться, что контейнер поднялся.
10. **Выполнить** скрипт миграции на dev-данных, проверить корректность загрузки.

---

## PostgreSQL для smoke-тестов

**Поиск контейнера:**

```bash
docker ps --filter "label=com.docker.compose.project=eqsitecms" --filter "label=com.docker.compose.service=db" --format "{{.Names}}"
# Результат: eqsitecms-db

docker inspect eqsitecms-db
```

**Результат docker inspect (актуальные параметры):**

| Параметр | Значение |
|---|---|
| Container name | `eqsitecms-db` |
| Container ID | `478aa22ca9d6` |
| Image | `postgres:17` |
| `POSTGRES_DB` | `eqsitecms` |
| `POSTGRES_USER` | `eqsitecms` |
| `POSTGRES_PASSWORD` | `eqsitecms` |
| Host port (`5432/tcp`) | `5433` |
| Network | `eqsitecms_network` |
| Network aliases | `eqsitecms-db`, `db` |
| Compose project label | `com.docker.compose.project=eqsitecms` |
| Compose service label | `com.docker.compose.service=db` |

**Строка подключения для smoke-тестов:**
```
postgresql://eqsitecms:eqsitecms@localhost:5433/eqsitecms
```

**Minio для smoke-тестов:**
- API endpoint: `http://localhost:9000`
- Console: `http://localhost:9001`
- Credentials: `eqsitecmsminio` / `eqsitecmsminio`
- Bucket: `gallery`

---

## Unit-тесты backend-фичи S3 Storage

Тестируемые классы: `S3MediaStorage`, `S3PhotoUrlBuilder`, `PhotoService` (с mock-хранилищем), wiring в `depends/utils.py`.

| # | Класс / функция | Сценарий |
|---|---|---|
| UT-01 | `S3MediaStorage.save` | Успешная загрузка файла: `put_object` вызван с правильным bucket, key, body |
| UT-02 | `S3MediaStorage.save` | Возвращает filename без изменений после успешной загрузки |
| UT-03 | `S3MediaStorage.save` | Пустой filename: `put_object` вызывается с пустым key (передаётся как есть, валидация — на уровне выше) |
| UT-04 | `S3MediaStorage.save` | S3 `ClientError` при `put_object` — исключение пробрасывается наверх без подавления |
| UT-05 | `S3MediaStorage.save` | S3 connection error (EndpointResolutionError) — исключение не подавляется |
| UT-06 | `S3MediaStorage.load` | Успешное чтение: `get_object` вызван с правильным bucket и key, возвращает байты |
| UT-07 | `S3MediaStorage.load` | S3 `NoSuchKey` (объект не существует) — пробрасывается `ClientError` |
| UT-08 | `S3MediaStorage.load` | S3 connection error при `get_object` — исключение не подавляется |
| UT-09 | `S3MediaStorage.load` | Пустой filename: `get_object` вызывается с пустым key |
| UT-10 | `S3MediaStorage.delete` | Успешное удаление: `delete_object` вызван с правильным bucket и key |
| UT-11 | `S3MediaStorage.delete` | S3 `ClientError` при `delete_object` — исключение пробрасывается |
| UT-12 | `S3MediaStorage.delete` | Удаление несуществующего объекта — S3 не возвращает ошибку (идемпотентно), метод завершается без исключения |
| UT-13 | `S3MediaStorage.delete` | S3 connection error при `delete_object` — исключение не подавляется |
| UT-14 | `S3MediaStorage` | Конфигурация: `endpoint_url`, `access_key`, `secret_key`, `bucket_name` передаются в boto3-клиент корректно |
| UT-15 | `S3MediaStorage` | Bucket name из конструктора используется во всех операциях — не захардкожен |
| UT-16 | `S3PhotoUrlBuilder.build` | Стандартный filename: URL имеет вид `<public_endpoint>/<bucket>/<filename>` |
| UT-17 | `S3PhotoUrlBuilder.build` | `public_endpoint_url` с trailing slash нормализуется (без двойного `/`) |
| UT-18 | `S3PhotoUrlBuilder.build` | Пустой filename: URL заканчивается на `/<bucket>/` (крайний случай, не крашится) |
| UT-19 | `S3PhotoUrlBuilder.build` | Filename с пробелами или спецсимволами: URL строится без url-кодирования (строка конкатенируется как есть) |
| UT-20 | `S3PhotoUrlBuilder.build` | Разные `bucket_name` в конструкторе дают разные URL |
| UT-21 | `get_media_storage` | Возвращает инстанс `S3MediaStorage` |
| UT-22 | `get_media_storage` | Возвращённый объект имеет `endpoint_url == settings.s3_endpoint_url` |
| UT-23 | `get_media_storage` | Возвращённый объект имеет `bucket_name == settings.s3_bucket_name` |
| UT-24 | `get_photo_url_builder` | Возвращает инстанс `S3PhotoUrlBuilder` |
| UT-25 | `get_photo_url_builder` | Возвращённый объект имеет `public_endpoint_url` из `settings.s3_public_endpoint_url` |
| UT-26 | `PhotoService.upload` | При S3 save-ошибке после успешного DB-insert: rollback вызывает `S3MediaStorage.delete` |
| UT-27 | `PhotoService.upload` | При DB-ошибке после успешного S3 save: `S3MediaStorage.delete` вызывается для отката |
| UT-28 | `PhotoService.upload` | Если `S3MediaStorage.delete` при rollback тоже выбрасывает исключение — логируется, основная ошибка не подавляется |
| UT-29 | `PhotoService.delete` | Удаление фото: сначала DB-запись удаляется, затем `S3MediaStorage.delete` вызывается |
| UT-30 | `PhotoService.batch_delete` | Частичный ответ S3 (часть объектов не удалена) — ошибки логируются, не крашат весь batch |

---

## Smoke-тесты backend-фичи S3 Storage

Smoke-тесты выполняются через скилл `api-smoke-test` на живом API с реальной PostgreSQL и реально поднятым Minio.

**Переменные подстановки:**
- `BASE_URL` = `http://localhost:8000`
- `MINIO_URL` = `http://localhost:9000`
- `BUCKET` = `gallery`
- `PHOTO_ID` — из ответа на `POST /api/photos`
- `PHOTO_ID_2` — второй созданный объект

| # | Запрос | Проверка |
|---|---|---|
| SM-01 | `GET /api/photos` (без авторизации) | HTTP 200, поле `items` — массив |
| SM-02 | `POST /api/photos` с валидным multipart файлом (без авторизации) | HTTP 401 или 403 — protected write |
| SM-03 | `POST /api/photos` с валидным multipart файлом (с авторизацией) | HTTP 201, ответ содержит поле `url` |
| SM-04 | Поле `url` из SM-03 | URL имеет вид `http://localhost:9000/gallery/<filename>` |
| SM-05 | `GET <url из SM-03>` напрямую к Minio | HTTP 200, Content-Type — image/* |
| SM-06 | Объект в Minio: `GET http://localhost:9000/gallery/<filename>` | HTTP 200 без авторизации (публичный bucket) |
| SM-07 | Запись в PostgreSQL после SM-03: `SELECT path FROM photos WHERE id = '<PHOTO_ID>'` | Поле `path` — только filename (без директории) |
| SM-08 | `GET /api/photos/<PHOTO_ID>` (без авторизации) | HTTP 200, `url` совпадает с результатом SM-03 |
| SM-09 | `PATCH /api/photos/<PHOTO_ID>` с новым файлом (без авторизации) | HTTP 401 или 403 |
| SM-10 | `PATCH /api/photos/<PHOTO_ID>` с новым файлом (с авторизацией) | HTTP 200, `url` обновился, старый объект в Minio удалён |
| SM-11 | Старый URL из SM-03 после PATCH | HTTP 404 от Minio (объект удалён) |
| SM-12 | `DELETE /api/photos/<PHOTO_ID>` (без авторизации) | HTTP 401 или 403 |
| SM-13 | `DELETE /api/photos/<PHOTO_ID>` (с авторизацией) | HTTP 204 или 200 |
| SM-14 | `GET /api/photos/<PHOTO_ID>` после DELETE | HTTP 404 |
| SM-15 | URL из SM-10 в Minio после DELETE | HTTP 404 (объект удалён из Minio) |
| SM-16 | `POST /api/photos` с незагруженным полем файла (с авторизацией) | HTTP 422 — validation error |
| SM-17 | `POST /api/photos` с файлом размером 0 байт (с авторизацией) | HTTP 422 или иная ошибка валидации (не 500) |
| SM-18 | Создать 3 фото, `DELETE /api/photos/batch` (batch delete, с авторизацией) | HTTP 200 или 204, все 3 объекта удалены из Minio |
| SM-19 | `GET /api/photos` после batch-delete | Удалённые записи отсутствуют в списке |
| SM-20 | `GET /api/photos` с фильтрацией по `gallery_id` (если поддерживается) | HTTP 200, только фото указанной галереи |
| SM-21 | `GET /api/photos?limit=2&offset=0` | HTTP 200, не более 2 записей |
| SM-22 | `GET /api/photos?limit=2&offset=2` | HTTP 200, вторая страница (отличается от первой) |
| SM-23 | Скрипт миграции: запустить `migrate_media_to_s3.py` с тестовым файлом | Файл появляется в Minio bucket `gallery` |
| SM-24 | PostgreSQL после SM-23: `SELECT path FROM photos` | Все `path` — только filename, без слешей |
| SM-25 | `GET /api/photos` сразу после запуска backend (холодный старт с пустым Minio) | HTTP 200, пустой `items` — не 500 |
| SM-26 | `POST /api/photos` при недоступном Minio (остановить контейнер minio) | HTTP 500 или 503, не 200; БД-запись не создана |
| SM-27 | Восстановить Minio после SM-26, повторить `POST /api/photos` | HTTP 201, всё работает |
| SM-28 | `GET /api/photos/<несуществующий UUID>` | HTTP 404 |
| SM-29 | `GET /api/photos/<невалидный UUID>` (например `abc`) | HTTP 422 |
| SM-30 | Объект в Minio: прямой `PUT` на `http://localhost:9000/gallery/test.txt` без auth | HTTP 403 (bucket публичный только на чтение, запись — нет) |
| SM-31 | `DELETE /api/photos/<PHOTO_ID>` дважды (с авторизацией) | Первый запрос — 204/200, второй — 404 |
| SM-32 | `POST /api/photos` с файлом — поле `url` в ответе соответствует реальному S3 URL | URL доступен через браузер без cookies |

---

## Чеклист

> Этот раздел используется агентами для отслеживания прогресса.
> Агент обязан менять `[ ]` -> `[x]` после выполнения каждого пункта.

### Backend

- [x] Добавить сервис `minio` в `.docker-compose/docker-compose.infra.yml`
- [x] Добавить volume `eqsitecms_minio_data` в `.docker-compose/docker-compose.infra.yml`
- [x] Добавить переменные `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `EXPOSE_MINIO_API_PORT`, `EXPOSE_MINIO_CONSOLE_PORT` в `.docker-compose/.env`
- [x] Добавить `aioboto3>=13.0.0` в `services/backend/pyproject.toml` (`uv add aioboto3`)
- [x] Добавить S3-параметры в `services/backend/src/settings.py` (без `MEDIA_STORAGE_BACKEND`)
- [x] Добавить S3-переменные в `services/backend/.env` (без `MEDIA_STORAGE_BACKEND`)
- [x] Удалить `LocalMediaStorage` из `services/backend/src/utils/media.py`
- [x] Удалить `SettingsPhotoUrlBuilder` из `services/backend/src/utils/media.py`
- [x] Удалить `resolve_media_base_dir` из `services/backend/src/utils/media.py`
- [x] Добавить класс `S3MediaStorage` в `services/backend/src/utils/media.py`
- [x] Добавить класс `S3PhotoUrlBuilder` в `services/backend/src/utils/media.py`
- [x] Упростить `get_media_storage()` в `services/backend/src/depends/utils.py` — только S3, без ветки local
- [x] Упростить `get_photo_url_builder()` в `services/backend/src/depends/utils.py` — только S3, без ветки local
- [x] Удалить импорты `LocalMediaStorage`, `SettingsPhotoUrlBuilder`, `resolve_media_base_dir` из `depends/utils.py`
- [x] Удалить блок монтирования `StaticFiles` из `services/backend/src/main.py` полностью
- [x] Убрать медиа-том `storage` из `.docker-compose/docker-compose.be.yml`
- [x] Создать скрипт миграции (в `maintain/migrate_media_to_s3.py` — `scripts/` имеет права root, недоступна для записи)
- [x] Скрипт создаёт бакет `gallery` и устанавливает публичную bucket policy
- [x] Скрипт загружает файлы из `storage/media/` и/или `src/media/`
- [x] Скрипт проверяет и при необходимости исправляет `path` в таблице `photos`
- [ ] Скрипт успешно выполнен на dev-данных (требует запущенный Minio — проверить отдельно)
- [x] Найти PostgreSQL контейнер по labels `com.docker.compose.project=eqsitecms` + `com.docker.compose.service=db`, fallback `eqsitecms-db`, и получить DB env/host port через `docker inspect`
- [x] Unit: S3 Storage — `S3MediaStorage.save` успешно передаёт файл в S3 (mock boto3)
- [x] Unit: S3 Storage — `S3MediaStorage.save` возвращает filename без изменений
- [x] Unit: S3 Storage — `S3MediaStorage.save` с пустым filename не крашится
- [x] Unit: S3 Storage — `S3MediaStorage.save` при `ClientError` пробрасывает исключение
- [x] Unit: S3 Storage — `S3MediaStorage.save` при connection error не подавляет исключение
- [x] Unit: S3 Storage — `S3MediaStorage.load` возвращает байты объекта из S3 (mock)
- [x] Unit: S3 Storage — `S3MediaStorage.load` при `NoSuchKey` пробрасывает `ClientError`
- [x] Unit: S3 Storage — `S3MediaStorage.load` при connection error не подавляет исключение
- [x] Unit: S3 Storage — `S3MediaStorage.load` с пустым filename вызывает `get_object` с пустым key
- [x] Unit: S3 Storage — `S3MediaStorage.delete` вызывает `delete_object` с правильными аргументами
- [x] Unit: S3 Storage — `S3MediaStorage.delete` при `ClientError` пробрасывает исключение
- [x] Unit: S3 Storage — `S3MediaStorage.delete` несуществующего объекта завершается без исключения (идемпотентно)
- [x] Unit: S3 Storage — `S3MediaStorage.delete` при connection error не подавляет исключение
- [x] Unit: S3 Storage — конфигурация S3MediaStorage: bucket_name из конструктора во всех операциях
- [x] Unit: S3 Storage — `S3PhotoUrlBuilder.build` строит URL вида `<endpoint>/<bucket>/<filename>`
- [x] Unit: S3 Storage — `S3PhotoUrlBuilder.build` нормализует trailing slash у `public_endpoint_url`
- [x] Unit: S3 Storage — `S3PhotoUrlBuilder.build` с пустым filename не крашится
- [x] Unit: S3 Storage — `S3PhotoUrlBuilder.build` с filename со спецсимволами конкатенирует без url-кодирования
- [x] Unit: S3 Storage — `S3PhotoUrlBuilder.build` разные `bucket_name` дают разные URL
- [x] Unit: S3 Storage — `get_media_storage` возвращает инстанс `S3MediaStorage`
- [x] Unit: S3 Storage — `get_media_storage` возвращённый объект имеет `endpoint_url` из settings
- [x] Unit: S3 Storage — `get_media_storage` возвращённый объект имеет `bucket_name` из settings
- [x] Unit: S3 Storage — `get_photo_url_builder` возвращает инстанс `S3PhotoUrlBuilder`
- [x] Unit: S3 Storage — `get_photo_url_builder` возвращённый объект имеет `public_endpoint_url` из settings
- [x] Unit: S3 Storage — `PhotoService.upload` при S3 save-ошибке вызывает `S3MediaStorage.delete` для отката
- [x] Unit: S3 Storage — `PhotoService.upload` при DB-ошибке после успешного S3 save вызывает `S3MediaStorage.delete`
- [x] Unit: S3 Storage — `PhotoService.upload` если `delete` при rollback тоже упал — основная ошибка не подавляется
- [x] Unit: S3 Storage — `PhotoService.delete` сначала удаляет DB-запись, затем вызывает S3 delete
- [x] Unit: S3 Storage — `PhotoService.batch_delete` частичный S3-ответ логирует ошибки, не крашит весь batch
- [ ] Smoke: S3 Storage — `GET /api/photos` без авторизации возвращает HTTP 200
- [ ] Smoke: S3 Storage — `POST /api/photos` без авторизации возвращает HTTP 401/403
- [ ] Smoke: S3 Storage — `POST /api/photos` с авторизацией и файлом возвращает HTTP 201 с полем `url`
- [ ] Smoke: S3 Storage — поле `url` из создания имеет вид `http://localhost:9000/gallery/<filename>`
- [ ] Smoke: S3 Storage — URL из ответа доступен через прямой `GET` к Minio (HTTP 200)
- [ ] Smoke: S3 Storage — `GET <minio_url>` без cookies возвращает файл (публичный bucket)
- [ ] Smoke: S3 Storage — PostgreSQL `path` содержит только filename без директорийного префикса
- [ ] Smoke: S3 Storage — `GET /api/photos/<PHOTO_ID>` без авторизации возвращает HTTP 200
- [ ] Smoke: S3 Storage — `PATCH /api/photos/<PHOTO_ID>` без авторизации возвращает HTTP 401/403
- [ ] Smoke: S3 Storage — `PATCH /api/photos/<PHOTO_ID>` с авторизацией обновляет `url`, старый объект удалён из Minio
- [ ] Smoke: S3 Storage — старый Minio URL после PATCH возвращает HTTP 404
- [ ] Smoke: S3 Storage — `DELETE /api/photos/<PHOTO_ID>` без авторизации возвращает HTTP 401/403
- [ ] Smoke: S3 Storage — `DELETE /api/photos/<PHOTO_ID>` с авторизацией возвращает HTTP 204/200
- [ ] Smoke: S3 Storage — `GET /api/photos/<PHOTO_ID>` после DELETE возвращает HTTP 404
- [ ] Smoke: S3 Storage — Minio объект после DELETE возвращает HTTP 404
- [ ] Smoke: S3 Storage — `POST /api/photos` без файла (с авторизацией) возвращает HTTP 422
- [ ] Smoke: S3 Storage — `POST /api/photos` с файлом 0 байт возвращает 422 или ошибку (не 500)
- [ ] Smoke: S3 Storage — batch delete 3 фото удаляет все объекты из Minio
- [ ] Smoke: S3 Storage — `GET /api/photos` после batch-delete не содержит удалённые записи
- [ ] Smoke: S3 Storage — `GET /api/photos?limit=2&offset=0` возвращает не более 2 записей
- [ ] Smoke: S3 Storage — `GET /api/photos?limit=2&offset=2` возвращает вторую страницу
- [ ] Smoke: S3 Storage — скрипт миграции загружает файл в Minio bucket `gallery`
- [ ] Smoke: S3 Storage — после скрипта миграции все `path` в PostgreSQL — только filename
- [ ] Smoke: S3 Storage — холодный старт с пустым Minio: `GET /api/photos` возвращает HTTP 200 с пустым списком
- [ ] Smoke: S3 Storage — при недоступном Minio `POST /api/photos` возвращает 500/503, не создаёт DB-запись
- [ ] Smoke: S3 Storage — после восстановления Minio `POST /api/photos` работает корректно
- [ ] Smoke: S3 Storage — `GET /api/photos/<несуществующий UUID>` возвращает HTTP 404
- [ ] Smoke: S3 Storage — `GET /api/photos/<невалидный UUID>` возвращает HTTP 422
- [ ] Smoke: S3 Storage — прямой `PUT` на Minio URL без auth возвращает HTTP 403 (read-only bucket)
- [ ] Smoke: S3 Storage — повторный DELETE того же фото возвращает HTTP 404
- [ ] Smoke: S3 Storage — `url` в ответе API соответствует реальному публичному S3 URL, доступному без cookies

### Quality Gate

- [ ] Проверить Clean Architecture: нет прямых обращений к aioboto3 вне `utils/media.py`
- [ ] Проверить, что Access matrix заполнена для всех затронутых endpoint'ов
- [ ] Проверить, что `LocalMediaStorage`, `SettingsPhotoUrlBuilder`, `resolve_media_base_dir` полностью удалены
- [ ] Проверить, что `MEDIA_STORAGE_BACKEND` не упоминается ни в settings.py, ни в .env, ни в depends/utils.py, ни в main.py
- [ ] Проверить, что `StaticFiles` mount полностью убран из main.py
- [ ] Проверить, что `get_media_storage()` и `get_photo_url_builder()` не содержат условных веток local
- [ ] Проверить, что каждая backend-фича имеет минимум 30 Unit checklist-пунктов с разными сценариями
- [ ] Проверить, что каждая backend-фича имеет минимум 30 Smoke checklist-пунктов с разными сценариями на реальной PostgreSQL
- [ ] Проверить, что smoke-тесты используют параметры из docker inspect (POSTGRES_DB=eqsitecms, USER=eqsitecms, PORT=5433)
- [ ] Убедиться, что `make test` проходит
- [ ] Проверить наличие unit-тестов для `S3MediaStorage` и `S3PhotoUrlBuilder`
- [ ] Проверить покрытие rollback-сценариев в тестах PhotoService
- [ ] Проверить, что smoke-тесты не являются pytest-файлами, а выполняются через скилл `api-smoke-test`
