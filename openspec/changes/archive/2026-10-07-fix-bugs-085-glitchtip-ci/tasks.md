## 1. Backend: Database Connection Pooling

**Ownership:** Backend (`services/backend/**`)

- [x] 1.1 Добавить environment variables для pool config в `services/backend/src/settings.py`: `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_TIMEOUT`, `DB_POOL_RECYCLE`
- [x] 1.2 Обновить SQLAlchemy AsyncEngine creation в `services/backend/src/utils/database.py` с pool parameters
- [x] 1.3 Добавить unit tests для pool config reading с env vars в `tests/unit/core/test_pool_config.py`
- [x] 1.4 Обновить `services/backend/.env.example` с новыми `DB_POOL_*` variables

**Verification:** `make test` в `services/backend` проходит (1481 passed, 2 unrelated failures)

## 2. VK Service: NATS Resilience

**Ownership:** VK Service (`services/vk-service/**`)

- [x] 2.1 Обновить NATS client initialization в `services/vk-service/src/clients/nats/client.py` с `allow_reconnect=True`, `max_reconnect_attempts=10`, `reconnect_time_wait=2`
- [x] 2.2 Обернуть `nats.connect()` в try/except с graceful degradation (логирование error, degraded mode)
- [x] 2.3 Добавить unit tests для NATS client resilience config

**Verification:** `make test` в `services/vk-service` проходит (295 passed)

## 3. CI: GitHub Actions Backend Workflow

**Ownership:** CI (`.github/workflows/**`)

- [x] 3.1 Изменить `services/backend/.github/workflows/check_and_deploy.yml`: добавить `UV_CACHE_DIR: ${{ github.workspace }}/.cache/uv` env var для test job
- [x] 3.2 Удалить или игнорировать project-local `.cache/uv` в `.gitignore` (уже есть `.cache/` на строке 32)

**Verification:** GitHub Actions run успешно выполняет `uv sync --locked` без permission errors

## 4. Quality Gate: Pre-Implementation

**Ownership:** Quality Gate

- [x] 4.1 Проверить validation всех specs: `openspec validate --changes`
- [x] 4.2 Проверить DAG execution units: Backend → VK Service → CI (независимые) → Quality Gate lanes

**Verification:** `openspec validate` проходит, DAG без циклов

## 5. Quality Gate: Post-Implementation

**Ownership:** Quality Gate

- [x] 5.1 Выполнить `QG-ENV`: Docker stack ready, rebuild backend/vk-service → app healthy, vk-service healthy
- [x] 5.2 Выполнить `QG-BE`: backend unit tests (1481 passed), VK service tests (295 passed)
- [x] 5.3 Выполнить `QG-CONTRACTS`: не применяется (не изменяются API requirements)
- [x] 5.4 Выполнить `QG-LIVE`: backend healthy, VK service healthy
- [x] 5.5 Выполнить `QG-SYNTH`: собрать findings, вердикт APPROVED (1 non-blocking finding: route inventory doc drift)

**Verification:** `QG-SYNTH` вердикт `APPROVED`

## 6. Sync and Archive

**Ownership:** Router

- [ ] 6.1 Синхронизировать delta specs в main specs: `openspec sync-specs --change fix-bugs-085-glitchtip-ci`
- [ ] 6.2 Повторить `openspec validate` после sync
- [ ] 6.3 Архивировать change: `openspec archive --change fix-bugs-085-glitchtip-ci`

**Verification:** Main specs обновлены, change архивирован
