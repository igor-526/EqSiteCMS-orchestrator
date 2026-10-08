# Tasks: yandex-service-foundation

## Deliverables Decomposition

### Deliverable A: Infrastructure Setup (Backend)
**Owner:** Backend-агент  
**Files:** `docker-compose.infrastructure.yml`, `Makefile`, `services.manifest`

**Execution Units:**
- **BE-1:** Infrastructure setup (docker-compose, Makefile, manifest)

**Dependencies:** None (starting point)

### Deliverable B: Service Foundation (Backend)
**Owner:** Backend-агент  
**Files:** `services/yandex-service/**` (scaffold from fastapi-template)

**Execution Units:**
- **BE-2:** Service scaffold from fastapi-template
- **BE-3:** Git initialization and initial commit

**Dependencies:** BE-1 (infrastructure)

### Deliverable C: Database & Encryption Foundation (Backend)
**Owner:** Backend-агент  
**Files:** `services/yandex-service/migrations/**`, `services/yandex-service/app/core/encryption.py`

**Execution Units:**
- **BE-4:** Database schema migration (yandex_accounts table)
- **BE-5:** Encryption utilities (Fernet)

**Dependencies:** BE-2 (service scaffold)

### Deliverable D: Health Check Endpoint (Backend)
**Owner:** Backend-агент  
**Files:** `services/yandex-service/app/api/v1/health.py`

**Execution Units:**
- **BE-6:** Health check endpoint implementation

**Dependencies:** BE-4 (database schema)

### Deliverable E: Testing Foundation (Backend)
**Owner:** Backend-агент  
**Files:** `services/yandex-service/tests/**`

**Execution Units:**
- **BE-7:** Unit tests (encryption utilities)
- **BE-8:** Integration tests (health check endpoint)

**Dependencies:** BE-5 (encryption), BE-6 (health check)

### Deliverable F: Documentation Foundation (Backend)
**Owner:** Backend-агент  
**Files:** `services/yandex-service/README.md`, `docs/seo/services.md`

**Execution Units:**
- **BE-9:** Service documentation (README, SEO docs placeholder)

**Dependencies:** BE-6 (health check implemented)

### Deliverable G: Quality Gate (Quality Gate)
**Owner:** Quality Gate-агент  
**Files:** None (verification only)

**Execution Units:**
- **QG-1:** Foundation verification (infrastructure, encryption, health check, access control)

**Dependencies:** All BE units completed

---

## DAG Dependencies

```
BE-1 (Infrastructure)
  ↓
BE-2 (Scaffold)
  ↓
BE-3 (Git init)
  ↓
BE-4 (DB schema)
  ↓         ↓
BE-5 (Encryption)  →  BE-6 (Health check)
  ↓                      ↓
  └──────────────────────┴──────→ BE-7 (Unit tests)
                                      ↓
                                  BE-8 (Integration tests)
                                      ↓
                                  BE-9 (Documentation)
                                      ↓
                                  QG-1 (Quality Gate)
```

---

## 1. Infrastructure Setup

- [x] 1.1 Обновить `docker-compose.infrastructure.yml`: добавить PostgreSQL БД `yandex_service` с credentials
- [x] 1.2 Создать `.env.infrastructure` с креденшиалами БД (`YANDEX_DB_USER`, `YANDEX_DB_PASSWORD`, `YANDEX_DB_NAME`)
- [x] 1.3 Обновить корневой `Makefile`: добавить targets для yandex-service (`build`, `up`, `down`, `migrate`, `test`)
- [x] 1.4 Обновить `services.manifest`: добавить `yandex-service` с Git-репозиторием `git@github.com:igor-526/EqSiteCMS-yandex-service.git`
- [x] 1.5 Запустить инфраструктуру: `make infra-up` и проверить доступность БД (`psql -h localhost -U yandex_user -d yandex_service -c "SELECT 1"`)

## 2. Service Foundation

- [x] 2.1 Скопировать `fastapi-template` в `services/yandex-service`
- [x] 2.2 Создать `.env` для сервиса с креденшиалами БД (дублирование из infrastructure) и encryption key (`YANDEX_ENCRYPTION_KEY`)
- [x] 2.3 Обновить `pyproject.toml`: добавить зависимость `cryptography` для Fernet encryption
- [x] 2.4 Создать `docker-compose.yml` в `services/yandex-service` (приложение + миграции, без БД)
- [x] 2.5 Настроить settings.py: добавить `YandexSettings` с полями для encryption key

## 3. Git Initialization

- [x] 3.1 Инициализировать Git в `services/yandex-service`: `git init`
- [x] 3.2 Добавить `.gitignore` (исключить `.env`, `__pycache__`, `.pytest_cache`)
- [x] 3.3 Initial commit: `git add . && git commit -m "Initial commit: yandex-service foundation"`
- [x] 3.4 Добавить remote: `git remote add origin git@github.com:igor-526/EqSiteCMS-yandex-service.git`
- [x] 3.5 Push в `main`: `git push -u origin main`
- [x] 3.6 Создать и push `release` branch: `git checkout -b release && git push -u origin release`

## 4. Database Schema

- [x] 4.1 Создать Alembic миграцию для таблицы `yandex_accounts`
  - Поля: `id UUID PRIMARY KEY`, `user_id UUID NOT NULL`, `encrypted_access_token TEXT`, `encrypted_refresh_token TEXT`, `expires_at TIMESTAMP`, `requires_reauth BOOLEAN DEFAULT FALSE`, `deleted_at TIMESTAMP`, `created_at TIMESTAMP NOT NULL DEFAULT NOW()`
- [x] 4.2 Запустить миграции: `make migrate SERVICE=yandex-service`
- [x] 4.3 Проверить схему БД: `psql -h localhost -U yandex_user -d yandex_service -c "\d yandex_accounts"`

## 5. Encryption Utilities

- [x] 5.1 Реализовать `app/core/encryption.py` с классом `FernetEncryption`
  - Методы: `encrypt(plaintext: str) -> str`, `decrypt(ciphertext: str) -> str`
- [x] 5.2 Загружать encryption key из env `YANDEX_ENCRYPTION_KEY`
- [x] 5.3 Генерировать ключ при first setup: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
- [x] 5.4 Добавить в README инструкцию по генерации ключа

## 6. Health Check Endpoint

- [ ] 6.1 Реализовать `GET /health` endpoint в `app/api/v1/health.py`
- [ ] 6.2 Проверять доступность БД (connection pool check)
- [ ] 6.3 Возвращать `200 OK` с JSON `{"status": "healthy", "timestamp": "..."}` если БД доступна
- [ ] 6.4 Возвращать `503 Service Unavailable` с JSON `{"status": "unhealthy", "error": "...", "timestamp": "..."}` если БД недоступна
- [ ] 6.5 Добавить endpoint в router

## 7. Unit Tests

- [ ] 7.1 Создать `tests/unit/test_encryption.py`
- [ ] 7.2 Test: encrypt/decrypt roundtrip (проверить, что `decrypt(encrypt(text)) == text`)
- [ ] 7.3 Test: decrypt с неверным ключом выбрасывает исключение
- [ ] 7.4 Запустить unit tests: `make test SERVICE=yandex-service`

## 8. Integration Tests

- [ ] 8.1 Создать `tests/integration/test_health.py`
- [ ] 8.2 Test: Anonymous GET /health → 200 OK (если сервис здоров)
- [ ] 8.3 Test: Authenticated GET /health → 200 OK (если сервис здоров)
- [ ] 8.4 Test: GET /health → 503 (если БД недоступна, mock connection failure)
- [ ] 8.5 Запустить integration tests: `make test-integration SERVICE=yandex-service`

## 9. Documentation Foundation

- [ ] 9.1 Создать `services/yandex-service/README.md` с секциями:
  - Overview (назначение сервиса)
  - Setup (как запустить локально)
  - Encryption key generation
  - Environment variables
  - API endpoints (только /health на данном этапе)
  - Future work (OAuth, счётчики, хосты)
- [ ] 9.2 Обновить `docs/seo/services.md`: добавить placeholder для yandex-service (название, статус: "foundation only", future work)

## 10. Quality Gate

- [ ] 10.1 Проверить соответствие спецификациям (health check endpoint реализован согласно spec)
- [ ] 10.2 Проверить encryption foundation (utilities работают, ключ документирован)
- [ ] 10.3 Проверить access control для /health (anonymous и authenticated доступ работает)
- [ ] 10.4 Проверить database schema (таблица `yandex_accounts` создана с правильными полями)
- [ ] 10.5 Smoke test: запустить полный стек (infra + сервис), проверить `curl http://localhost:8000/health` → 200 OK
- [ ] 10.6 Проверить Git: initial commit в `main` и `release` branches
- [ ] 10.7 Проверить документацию (README полный, SEO docs обновлены)

## 11. Finalization

- [ ] 11.1 Запустить `openspec validate yandex-service-foundation --type change --strict`
- [ ] 11.2 Устранить все findings из Quality Gate
- [ ] 11.3 Sync specs (если требуется): `openspec sync-specs --change yandex-service-foundation`
- [ ] 11.4 Archive change: `openspec archive yandex-service-foundation`
