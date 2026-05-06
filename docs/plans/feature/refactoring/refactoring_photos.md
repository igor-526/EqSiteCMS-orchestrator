# План: refactoring photos module

**Тикет:** REFACTORING-PHOTOS
**Дата:** 2026-05-06
**Затронутые сервисы:** services/backend
**Ветка:** feature/refactoring-testing-audit
**Статус:** draft, требуется согласование пользователя до передачи Backend

---

## Контекст

Модуль `photos` смешивает service layer с FastAPI upload type, filesystem, runtime settings, URL building и DTO `PhotoOutDto.url`, который читает settings. Это нужно разнести по Protocol/DI границе, чтобы сервис тестировался unit-фейками.

## Цель

Отделить `PhotoService` от FastAPI/filesystem/settings, оставить бизнес-валидацию и orchestration в сервисе, покрыть каждую функцию UC01-UC30.

## Файлы

| Слой | Файлы |
|---|---|
| API | `services/backend/src/api/photos.py` |
| DI | `services/backend/src/depends/services.py`, `services/backend/src/depends/repositories.py`, `services/backend/src/depends/utils.py` |
| Service | `services/backend/src/core/services/photos.py` |
| Schemas | `services/backend/src/core/schemas/photos.py` |
| Entities | `services/backend/src/core/entities/photos.py` |
| Protocols | `services/backend/src/core/protocols/repositories/photo_repository.py`, новый storage/url protocol при реализации |
| Repository | `services/backend/src/repositories/photo_repository.py` |
| Runtime storage | `services/backend/src/media` |
| Tests | `services/backend/tests/unit/core/services/test_photo_service.py` |

## Что рефакторить

- Убрать `from fastapi import UploadFile` из `PhotoService`; API читает bytes/filename/content_type и передает DTO/command.
- Убрать прямые `Path.write_bytes`, `Path.unlink`, `settings` и media dir creation из сервиса; выделить `MediaStorageProtocol` и `PhotoUrlBuilderProtocol` или аналогичные узкие protocols.
- Убрать settings dependency из `core/schemas/photos.py`; URL должен собираться на service/presenter/adapter границе.
- Вынести file type policy в service/entity или injected validator без FastAPI dependency.
- Определить atomic order для create/update/delete: validate -> storage write/delete -> repository mutation, с rollback intent в unit-тестах.
- Проверить баг в `update`: при `data.description is not None` сейчас записывается пустая строка вместо переданного значения.
- В `batch_delete` определить поведение missing ids и порядок storage delete vs repository batch delete.
- Убрать runtime-generated media из source tree в отдельную storage path/volume при реализации.

## Unit-тесты service functions

| Класс | Функция | Тип | Обязательные сценарии |
|---|---|---|---|
| `PhotoService` | `_generate_unique_name` | helper function | UC01-UC30 |
| `PhotoService` | `_get_file_extension` | helper function | UC01-UC30 |
| `PhotoService` | `_generate_filename` | helper function | UC01-UC30 |
| `PhotoService` | `_get_file_path` | helper function, до удаления/переноса | UC01-UC30 |
| `PhotoService` | `_get_url` | helper function, до удаления/переноса | UC01-UC30 |
| `PhotoService` | `_save_file` | helper function, до замены storage protocol | UC01-UC30 |
| `PhotoService` | `_delete_file` | helper function, до замены storage protocol | UC01-UC30 |
| `PhotoService` | `_get_name_from_filename` | helper function | UC01-UC30 |
| `PhotoService` | `_validate_file_type` | helper function | UC01-UC30 |
| `PhotoService` | `create_from_upload` | public service function, до удаления FastAPI coupling | UC01-UC30 |
| `PhotoService` | `create` | public service function | UC01-UC30 |
| `PhotoService` | `update_from_upload` | public service function, до удаления FastAPI coupling | UC01-UC30 |
| `PhotoService` | `update` | public service function | UC01-UC30 |
| `PhotoService` | `get_by_id` | public service function | UC01-UC30 |
| `PhotoService` | `delete` | public service function | UC01-UC30 |
| `PhotoService` | `get_filtered` | public service function | UC01-UC30 |
| `PhotoService` | `batch_delete` | public service function | UC01-UC30 |

### 30 UserCases/EdgeCases на каждую функцию

Каждая функция из таблицы выше получает все сценарии: UC01 happy path; UC02 minimal input; UC03 full input; UC04 omitted optional; UC05 empty value; UC06 whitespace value; UC07 unicode/case; UC08 boundary min; UC09 below min; UC10 boundary max; UC11 above max; UC12 malformed id/slug/token; UC13 not found; UC14 duplicate/conflict; UC15 self-exclusion; UC16 reference validation; UC17 permission allowed; UC18 permission denied; UC19 partial update; UC20 empty update; UC21 repository failure; UC22 dependency order; UC23 rollback intent; UC24 idempotency/retry; UC25 sorting stability; UC26 filtering semantics; UC27 pagination semantics; UC28 serialization/mapping; UC29 structural vs business validation; UC30 architecture boundary.

Для каждой функции раскрыть UC01-UC30 из `refactoring_and_testing_audit.md` отдельными unit-сценариями через fake `PhotoRepositoryProtocol`, fake storage и fake URL builder.

### SMOKE-тесты на реальном API

Smoke выполняется по `.claude/skills/api-smoke-test/SKILL.md` против реального backend API с cookie-auth. Сценарии, создающие файлы и записи, используют уникальный suffix и выполняют cleanup.

Переменные:

```bash
BASE_URL="из .claude/skills/api-smoke-test/credentials.json"
COOKIE_JAR="из .claude/skills/api-smoke-test/credentials.json"
SMOKE_SUFFIX="$(date +%Y%m%d%H%M%S)"
SMOKE_PHOTO_NAME="Smoke Photo ${SMOKE_SUFFIX}"
SMOKE_PHOTO_UPDATED_NAME="Smoke Photo Updated ${SMOKE_SUFFIX}"
SMOKE_PHOTO_DESCRIPTION="smoke description ${SMOKE_SUFFIX}"
SMOKE_PHOTO_UPDATED_DESCRIPTION="smoke updated ${SMOKE_SUFFIX}"
SMOKE_FILE="/tmp/eqsitecms-smoke-photo-${SMOKE_SUFFIX}.jpg"
SMOKE_FILE_2="/tmp/eqsitecms-smoke-photo-updated-${SMOKE_SUFFIX}.jpg"
```

Перед `SM-PH-02` создать минимальные валидные JPEG-файлы в `/tmp` или использовать fixture-файлы из репозитория, если они уже есть. После `SM-PH-13` удалить временные файлы.

| ID | Method | Endpoint | Body | Ожидание | Проверка |
|---|---|---|---|---|---|
| SM-PH-01 | POST | `/api/auth/login` | credentials superuser из skill | `200` | cookie сохранены |
| SM-PH-02 | POST multipart | `/api/photos` | `file=@SMOKE_FILE`, `name`, `description` | `200` | сохранить `SMOKE_PHOTO_ID`; есть `url`, `name`, `description` |
| SM-PH-03 | GET | `/api/photos/{SMOKE_PHOTO_ID}` | - | `200` | поля совпадают с созданными; `url` непустой |
| SM-PH-04 | GET | `/api/photos?name={SMOKE_PHOTO_NAME}&limit=10&offset=0` | - | `200` | `items` содержит `SMOKE_PHOTO_ID` |
| SM-PH-05 | PATCH multipart | `/api/photos/{SMOKE_PHOTO_ID}` | `name`, `description` без файла | `200` | metadata обновлена, файл не обязателен |
| SM-PH-06 | PATCH multipart | `/api/photos/{SMOKE_PHOTO_ID}` | `file=@SMOKE_FILE_2` | `200` | `url` или `path` обновлен либо файл-update подтвержден ответом |
| SM-PH-07 | GET | `/api/photos?description={SMOKE_PHOTO_UPDATED_DESCRIPTION}&limit=10&offset=0` | - | `200` | фильтр по description находит запись |
| SM-PH-08 | GET | `/api/photos?limit=1&offset=0&sort=-created_at` | - | `200` | ответ имеет `items` и `total` |
| SM-PH-09 | POST multipart | `/api/photos` | invalid `.txt` file | `400` | тип файла отклонен клиентской ошибкой |
| SM-PH-10 | GET | `/api/photos/not-a-uuid` | - | `400` или `422` | structural validation не дает `500` |
| SM-PH-11 | DELETE | `/api/photos/{SMOKE_PHOTO_ID}` | - | `204` | cleanup выполнен |
| SM-PH-12 | GET | `/api/photos/{SMOKE_PHOTO_ID}` | - | `404` или согласованный `400` | запись недоступна после удаления |
| SM-PH-13 | POST | `/api/photos/batch-delete` | `{"ids": ["{SMOKE_PHOTO_ID}"]}` | `204` или `400` not-found | повторная cleanup-операция идемпотентна по согласованному контракту |

## Чеклист

- [ ] Убрать FastAPI `UploadFile` из service layer
- [ ] Ввести storage/url protocols и DI-сборку
- [ ] Убрать settings из `core/schemas/photos.py`
- [ ] Исправить `description` update behavior
- [ ] Зафиксировать order/rollback intent для file + repository operations
- [ ] Покрыть все функции из таблицы UC01-UC30
