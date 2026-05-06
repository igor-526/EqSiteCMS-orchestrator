# Review: REFACTORING-AUTH-BREEDS smoke retest

**Статус: REWORK**
**Дата:** 2026-05-06

## Планы

- `docs/plans/feature/refactoring/refactoring_auth.md`
- `docs/plans/feature/refactoring/refactoring_breeds.md`
- предыдущий отчет: `docs/reports/REFACTORING-AUTH-BREEDS-repeat-review.md`

## Итог

Повторный SMOKE выполнен после заполнения БД пользователем. Блокеры по breeds сняты:
`SM-BR-04` и `SM-BR-05` успешно проверены на существующей породе
`smoke-test-breed`.

Approve невозможен по фактическому smoke retest: `GET /api/auth/me` без cookie
по-прежнему возвращает `500 Internal Server Error` вместо согласованного
клиентского контракта (`200 null` или `401` после отдельного изменения API
contract).

Итог SMOKE: `12/13 passed`, `1 failed`, `0 blocked`.

## Проверка

Перед запуском прочитаны:

- `agents/quality_gate.md`
- `agents/backend.md`
- `.claude/skills/api-smoke-test/SKILL.md`

Использованы credentials из `.claude/skills/api-smoke-test/credentials.json`:

- `base_url`: `http://localhost:8001`
- `auth_endpoint`: `/api/auth/login`
- `cookie_jar`: `/tmp/eqsitecms-smoke-cookies.txt`
- роль: `superuser` / `su`

Unit/integration тесты в рамках этого ретеста не запускались: задача была
ограничена повторным обязательным SMOKE после заполнения БД.

## SMOKE-тесты

| # | Endpoint | Method | HTTP | Time | Результат |
|---|---|---|---|---:|---|
| SM-AUTH-00 | `/health` | GET | 200 | 1.259 ms | passed |
| SM-AUTH-01 | `/api/auth/login` | POST | 200 | 46.806 ms | passed, установлены `access_token` и `refresh_token` cookie |
| SM-AUTH-02 | `/api/auth/me` с cookie | GET | 200 | 26.840 ms | passed, `username=su`, `password` отсутствует |
| SM-AUTH-03 | `/api/auth/refresh` с cookie | POST | 200 | 23.539 ms | passed, refresh cookies установлены |
| SM-AUTH-04 | `/api/auth/logout` с cookie | POST | 204 | 2.771 ms | passed, auth cookies удаляются через `Max-Age=0` |
| SM-AUTH-05 | `/api/auth/me` без cookie | GET | 500 | 5.172 ms | failed, `ResponseValidationError` на `None` response body |
| SM-AUTH-06 | `/api/auth/login` с неверным паролем | POST | 401 | 25.837 ms | passed, `detail=Неверный логин или пароль` |
| SM-BR-00 | `/health` | GET | 200 | 1.649 ms | passed |
| SM-BR-01 | `/api/horses/breeds?limit=1` | GET | 200 | 29.632 ms | passed, `total=31`, `items_len=1` |
| SM-BR-02 | `/api/horses/breeds?name=smoke&sort=name&limit=1&offset=0` | GET | 200 | 33.268 ms | passed, `total=1`, `items_len=1` |
| SM-BR-03 | `/api/horses/breeds/non-existent-smoke-breed` | GET | 400 | 26.543 ms | passed, `detail=Порода не найдена` |
| SM-BR-04 | `/api/horses/breeds/smoke-test-breed` | GET | 200 | 25.924 ms | passed, DTO без `page_data` |
| SM-BR-05 | `/api/horses/breeds/smoke-test-breed?page_data=true` | GET | 200 | 25.298 ms | passed, `page_data` присутствует |

## Диагностика failed SMOKE

`SM-AUTH-05` вернул `500 Internal Server Error` с traceback:

```text
fastapi.exceptions.ResponseValidationError: 1 validation errors:
  {'type': 'model_attributes_type', 'loc': ('response',), 'msg': 'Input should be a valid dictionary or object to extract fields from', 'input': None}
```

Причина соответствует предыдущему отчету: endpoint `GET /api/auth/me` объявлен с
`response_model=UserOutDto`, но при отсутствии cookie dependency возвращает `None`.
FastAPI не может сериализовать `None` как `UserOutDto` и отвечает runtime `500`.

## Чеклист доработки

### Backend

- [ ] Исправить контракт `GET /api/auth/me` без cookie: вернуть согласованный клиентский ответ (`200 null` с корректной response model или `401`) вместо `500`.
- [ ] Добавить regression test на `GET /api/auth/me` без cookie.

### Frontend

- [ ] Не требуется.

### Quality Gate

- [ ] Повторно прочитать `.claude/skills/api-smoke-test/SKILL.md`.
- [ ] Повторно запустить SMOKE с endpoint timings.
- [ ] Approve возможен только после `13/13 passed`, `0 failed`, `0 blocked`.
