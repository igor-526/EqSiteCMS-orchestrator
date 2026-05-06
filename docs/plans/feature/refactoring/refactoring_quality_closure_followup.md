# План: refactoring quality closure follow-up

**Тикет:** REFACTORING-QUALITY-CLOSURE
**Дата:** 2026-05-06
**Затронутые сервисы:** services/backend, docs/plans/feature/refactoring, docs/reports
**Ветка:** feature/refactoring-testing-audit
**Статус:** draft, исправительный follow-up после аудита рефакторинга

---

## Контекст

`docs/plans/feature/refactoring/refactoring_and_testing_audit.md` не является отдельным планом реализации. Это parent index до декомпозиции: общий архитектурный контракт, каталог UC01-UC30 и список модульных планов. Для проверки покрытия рефакторинга его нельзя считать незакрытым планом без отдельного отчета.

По итогам аудита остаются документальные и quality-gap проблемы:

- `refactoring_horse_service.md` должен быть переиндексирован после добавления финального report в `docs/reports`; текущий `docs/reports/REFACTORING-SUMMARY-FINAL-2026-05-06.md` все еще помечает его как требующий верификации.
- В общем parent plan нет smoke-матриц для `users` и `photos`; он требует UC01-UC30 для unit-слоя, но не задает `SM-*` сценарии.
- `docs/reports/REFACTORING-USERS-review.md` фиксирует `SMOKE: not run` и mypy errors в `tests/unit/core/services/test_user_service.py`.
- `docs/reports/REFACTORING-PHOTOS-review.md` содержит противоречие: профильный smoke `6/6 passed`, но workflow `/api-smoke-test` не может посчитать `N/M` из плана из-за отсутствия формализованной `SMOKE`-секции.
- `uv run pytest -q` из `services/backend` проходит, но с warning-ами: `354 passed, 5 skipped, 9 warnings`.
- `uv run mypy src tests/unit/core/services/test_user_service.py` сейчас не зеленый: 7 errors в `src/core/services/site_settings.py` и 5 errors в `tests/unit/core/services/test_user_service.py`.

## Цель

Закрыть остаточные несоответствия так, чтобы итоговая refactoring-волна могла быть подтверждена без оговорок:

- каждый декомпозированный план имеет индексированный финальный report;
- `users` и `photos` имеют воспроизводимые smoke-секции в планах;
- `uv run pytest -q` проходит без warnings;
- `uv run mypy src tests/unit` проходит без ошибок;
- финальный summary-report отражает актуальный статус `horse_service`, `users`, `photos` и общих проверок.

---

## Детали реализации

### Документы и индексация reports

| Что | Путь | Действие |
|---|---|---|
| Parent index | `docs/plans/feature/refactoring/refactoring_and_testing_audit.md` | Не требовать отдельный report; оставить как индекс декомпозиции |
| Horse service plan | `docs/plans/feature/refactoring/refactoring_horse_service.md` | Сверить статус с новым финальным report |
| Horse service report | `docs/reports/<REFACTORING-HORSE-SERVICE-*.md>` | Найти добавленный report, проверить verdict, unit, smoke, mypy |
| Summary report | `docs/reports/REFACTORING-SUMMARY-FINAL-2026-05-06.md` или новый dated summary | Перенести `refactoring_horse_service.md` из незакрытых в закрытые при наличии `APPROVED/PASS` |
| Users plan | `docs/plans/feature/refactoring/refactoring_users.md` | Добавить формализованную smoke-секцию |
| Photos plan | `docs/plans/feature/refactoring/refactoring_photos.md` | Добавить формализованную smoke-секцию |

Если финальный report по `horse_service` отсутствует в `docs/reports` на момент реализации, Backend/Quality Gate не должны придумывать результат. Нужно либо найти файл под нестандартным именем через поиск по `REFACTORING-HORSE-SERVICE`, `horse_service`, `HorseServiceService`, либо зафиксировать отсутствие как блокер выполнения пункта индексации.

### Вывод по smoke из общего плана

В `refactoring_and_testing_audit.md` есть только общий UC01-UC30 каталог для unit-тестов service functions. Явных `SMOKE`, `SM-*`, real API сценариев для `users` и `photos` там нет.

Следовательно:

- для `users` нужно добавить smoke-секцию сейчас;
- для `photos` нужно добавить smoke-секцию сейчас и привести report к одному источнику истины: smoke считается по таблице `SM-PH-*`;
- smoke должен запускаться по `.claude/skills/api-smoke-test/SKILL.md` против реального backend API с cookie-auth;
- где сценарий создает данные, он обязан иметь cleanup или использовать уникальный suffix.

### SMOKE-тесты на реальном API: users

`UserService.get_users` не имеет отдельного публичного `/api/users` router в текущем `services/backend/src/api`. Создавать новый endpoint только ради smoke нельзя в рамках этого follow-up. Корректный smoke для user DTO boundary должен проверять публичные auth endpoints, которые возвращают `UserOutDto` или текущего пользователя.

Переменные:

```bash
BASE_URL="из .claude/skills/api-smoke-test/credentials.json"
COOKIE_JAR="из .claude/skills/api-smoke-test/credentials.json"
SMOKE_SUFFIX="$(date +%Y%m%d%H%M%S)"
SMOKE_USERNAME="smoke_user_${SMOKE_SUFFIX}"
SMOKE_PASSWORD="SmokePassword123!"
```

| ID | Method | Endpoint | Body | Ожидание | Проверка |
|---|---|---|---|---|---|
| SM-US-01 | POST | `/api/auth/login` | credentials superuser из skill | `200` | cookie сохранены |
| SM-US-02 | GET | `/api/auth/me` | - | `200` | есть `id`, `username`, `created_at`; нет `password` |
| SM-US-03 | GET | `/api/auth/me` без cookie | - | `401` | нет `500`, нет приватных полей |
| SM-US-04 | POST | `/api/auth/register` | уникальный `SMOKE_USERNAME` | `200` | ответ соответствует `UserOutDto`, нет `password` |
| SM-US-05 | POST | `/api/auth/register` | тот же username | `400` | duplicate user дает клиентскую ошибку |
| SM-US-06 | POST | `/api/auth/login` | новый пользователь | `200` | cookie нового пользователя сохранены |
| SM-US-07 | GET | `/api/auth/me` | cookie нового пользователя | `200` | `username == SMOKE_USERNAME`, нет `password` |
| SM-US-08 | POST | `/api/auth/logout` | - | `204` | cookie очищены |
| SM-US-09 | GET | `/api/auth/me` после logout | - | `401` | нет доступа после logout |

Примечание: `SM-US-04` создает пользователя в реальной PostgreSQL. Если в проекте нет безопасного delete-user API, cleanup не выполняется через HTTP. Чтобы smoke оставался идемпотентным, username обязан быть уникальным по `SMOKE_SUFFIX`. Quality Gate должен отдельно отметить, что сценарий не чистит созданную строку из-за отсутствия публичного удаления пользователей.

### SMOKE-тесты на реальном API: photos

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
| SM-PH-06 | PATCH multipart | `/api/photos/{SMOKE_PHOTO_ID}` | `file=@SMOKE_FILE_2` | `200` | `url/path` изменился или обновление файла подтверждено контрактом |
| SM-PH-07 | GET | `/api/photos?description={SMOKE_PHOTO_UPDATED_DESCRIPTION}&limit=10&offset=0` | - | `200` | фильтр по description находит запись |
| SM-PH-08 | GET | `/api/photos?limit=1&offset=0&sort=-created_at` | - | `200` | ответ имеет `items` и `total` |
| SM-PH-09 | POST multipart | `/api/photos` | invalid `.txt` file | `400` | тип файла отклонен клиентской ошибкой |
| SM-PH-10 | GET | `/api/photos/not-a-uuid` | - | `400` | structural validation не дает `500` |
| SM-PH-11 | DELETE | `/api/photos/{SMOKE_PHOTO_ID}` | - | `204` | cleanup выполнен |
| SM-PH-12 | GET | `/api/photos/{SMOKE_PHOTO_ID}` | - | `404` или согласованный `400` | запись недоступна после удаления |
| SM-PH-13 | POST | `/api/photos/batch-delete` | `{"ids": ["{SMOKE_PHOTO_ID}"]}` | `204` или `400` not-found | повторная cleanup-операция идемпотентна по согласованному контракту |

### PostgreSQL для smoke-тестов

Перед smoke-прогонами исполнитель обязан повторить discovery, а не использовать значения ниже как хардкод.

Текущий discovery на 2026-05-06:

- Поиск: `docker ps --filter label=com.docker.compose.project=eqsitecms --filter label=com.docker.compose.service=db`
- Контейнер: `eqsitecms-db` (`478aa22ca9d6`)
- Image: `postgres:17`
- Labels: `com.docker.compose.project=eqsitecms`, `com.docker.compose.service=db`
- Network aliases: `eqsitecms-db`, `db`
- Env из `docker inspect`: `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`
- Host port для `5432/tcp`: `5433`

### Устранение pytest warnings

Текущий `uv run pytest -q` из `services/backend`:

- `354 passed, 5 skipped, 9 warnings`.

Источники warning-ов:

| Источник | Причина | План исправления |
|---|---|---|
| `services/backend/src/core/schemas/photos.py` | class-based `Config` deprecated в Pydantic v2 | заменить на `model_config = ConfigDict(...)` |
| `services/backend/src/core/schemas/prices.py` | class-based `Config` deprecated в Pydantic v2 | заменить на `model_config = ConfigDict(...)` |
| `services/backend/src/core/schemas/site_settings.py` | class-based `Config` deprecated в Pydantic v2 | заменить на `model_config = ConfigDict(...)` |
| `services/backend/tests/unit/core/services/test_user_service.py` | `model_construct` с invalid UUID вызывает serializer warning при `model_dump()` | переписать негативные сценарии так, чтобы warning не возникал: использовать fake object с `model_dump()` или проверять ошибку DTO mapping напрямую без Pydantic serializer warning |

После исправления обязательно запустить:

```bash
cd services/backend
uv run pytest -q -W error
uv run pytest -q
```

### Устранение mypy errors

Текущий `uv run mypy src tests/unit/core/services/test_user_service.py`:

- 7 errors в `src/core/services/site_settings.py`;
- 5 errors в `tests/unit/core/services/test_user_service.py`.

План исправления:

| Файл | Проблема | Действие |
|---|---|---|
| `src/core/services/site_settings.py` | mypy сужает переменную `parsed` по первому присваиванию `Decimal`, затем видит несовместимые `date/datetime/bool` | разнести локальные переменные по типам (`parsed_decimal`, `parsed_json`, `parsed_date`, `parsed_time`, `parsed_datetime`, `normalized_bool`) |
| `tests/unit/core/services/test_user_service.py` | `make_user(**overrides: Any)` собирает `dict[str, object]`, который mypy не может сопоставить с `User` kwargs | типизировать фабрику через явные параметры или `TypedDict`/`Unpack`; не передавать невыведенный `dict[str, object]` в `User(**data)` |
| `tests/unit/core/services/test_user_service.py` | негативные invalid-UUID кейсы конфликтуют с типами `User` | использовать отдельный fake row/object с `model_dump()` для broken mapping, либо `User.model_construct` изолировать так, чтобы mypy не видел неверный kwargs-вызов |

После исправления обязательно запустить:

```bash
cd services/backend
uv run mypy src tests/unit
uv run mypy src
```

---

## Порядок выполнения

1. Backend: устранить mypy errors в `site_settings.py` и `test_user_service.py`.
2. Backend: убрать Pydantic deprecation warnings в схемах `photos`, `prices`, `site_settings`.
3. Backend: переписать warning-producing негативные тесты `test_user_service.py`.
4. Backend: добавить smoke-секции `SM-US-*` и `SM-PH-*` в соответствующие модульные планы.
5. Quality Gate: найти и проиндексировать финальный report по `refactoring_horse_service`.
6. Quality Gate: выполнить `uv run pytest -q -W error`, `uv run pytest -q`, `uv run mypy src tests/unit`.
7. Quality Gate: выполнить smoke по `users` и `photos` строго по новым таблицам из планов.
8. Quality Gate: выпустить обновленный summary-report по всей refactoring-волне.

---

## Чеклист

### Backend

- [ ] В `services/backend/src/core/services/site_settings.py` разнести `parsed`/`normalized` переменные по типам и устранить 7 mypy errors.
- [ ] В `services/backend/tests/unit/core/services/test_user_service.py` типизировать `make_user` без `dict[str, object]` kwargs в `User`.
- [ ] В `services/backend/tests/unit/core/services/test_user_service.py` переписать invalid UUID негативные кейсы без Pydantic serializer warnings.
- [ ] В `services/backend/src/core/schemas/photos.py` заменить class-based `Config` на `model_config = ConfigDict(...)`.
- [ ] В `services/backend/src/core/schemas/prices.py` заменить class-based `Config` на `model_config = ConfigDict(...)`.
- [ ] В `services/backend/src/core/schemas/site_settings.py` заменить class-based `Config` на `model_config = ConfigDict(...)`.
- [ ] Добавить в `docs/plans/feature/refactoring/refactoring_users.md` секцию `### SMOKE-тесты на реальном API` с кейсами `SM-US-01` - `SM-US-09`.
- [ ] Добавить в `docs/plans/feature/refactoring/refactoring_photos.md` секцию `### SMOKE-тесты на реальном API` с кейсами `SM-PH-01` - `SM-PH-13`.
- [ ] Перед smoke-прогонами найти PostgreSQL контейнер по labels `com.docker.compose.project=eqsitecms` + `com.docker.compose.service=db`, fallback `eqsitecms-db`/`postgres`, и получить DB env/host port через `docker inspect`.
- [ ] Запустить `uv run pytest -q -W error` из `services/backend`; результат должен быть без warnings.
- [ ] Запустить `uv run pytest -q` из `services/backend`; результат должен быть без warnings.
- [ ] Запустить `uv run mypy src tests/unit` из `services/backend`; ошибок быть не должно.
- [ ] Запустить `uv run mypy src` из `services/backend`; ошибок быть не должно.

### Frontend

- [ ] Frontend не затрагивается; проверить отсутствие изменений в `services/frontend`.

### Quality Gate

- [ ] Подтвердить, что `refactoring_and_testing_audit.md` учтен только как parent index, а не как отдельный план без report.
- [ ] Найти финальный report по `refactoring_horse_service.md` в `docs/reports` и проверить наличие `APPROVED/PASS`.
- [ ] Проверить, что report по `horse_service` содержит unit/test результат.
- [ ] Проверить, что report по `horse_service` содержит smoke-результат в формате `N/M` и endpoint timings либо явно согласованное обоснование отсутствия timings.
- [ ] Обновить summary-report так, чтобы `refactoring_horse_service.md` был корректно индексирован в закрытых или явно оставлен в блокерах, если report не найден.
- [ ] Проверить, что в `refactoring_users.md` появилась smoke-секция `SM-US-*` и она не требует нового `/api/users` endpoint.
- [ ] Проверить, что в `refactoring_photos.md` появилась smoke-секция `SM-PH-*` с create/read/list/update/delete/cleanup сценариями.
- [ ] Прочитать `.claude/skills/api-smoke-test/SKILL.md` и выполнить smoke для `refactoring_users.md`.
- [ ] Зафиксировать результат users smoke в report: `N/M passed`, статусы, timings, созданный `SMOKE_USERNAME`.
- [ ] Прочитать `.claude/skills/api-smoke-test/SKILL.md` и выполнить smoke для `refactoring_photos.md`.
- [ ] Зафиксировать результат photos smoke в report: `N/M passed`, статусы, timings, cleanup.
- [ ] Проверить, что `REFACTORING-PHOTOS-review.md` или новый replacement-report больше не содержит противоречия между `6/6` и невозможностью посчитать `N/M`.
- [ ] Проверить, что `REFACTORING-USERS-review.md` или новый replacement-report больше не содержит `SMOKE: not run`.
- [ ] Проверить, что `uv run pytest -q -W error` проходит без warnings.
- [ ] Проверить, что `uv run mypy src tests/unit` проходит без ошибок.
- [ ] Проверить итоговый summary-report: все декомпозированные планы имеют report, smoke, тесты и финальный verdict.
