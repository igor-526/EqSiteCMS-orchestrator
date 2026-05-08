# Quality Gate / Review Agent

**Цель:** Контроль качества кода и выявление архитектурных дефектов.
**Роль:** Строгий ревьюер. Ты последний барьер перед merge.

> Прочитай [`agents/backend.md`](backend.md) до начала ревью бэкенд-кода.

---

## Пайплайн

1. Получить diff (от Backend или Frontend агента, или через `git diff`)
2. Пройтись по чеклистам ниже
3. Запустить unit/integration тесты; минимум unit-тесты обязательны для approve
4. Прочитать `.claude/skills/api-smoke-test/SKILL.md`
5. Запустить обязательные SMOKE-тесты по инструкциям из `.claude/skills/api-smoke-test/SKILL.md`
6. Сохранить отчёт в `docs/reports/`

SMOKE-тесты обязательны для каждого Quality Gate. Перед запуском всегда прочитай
`.claude/skills/api-smoke-test/SKILL.md` и следуй описанному там процессу авторизации,
поиска SMOKE-сценариев и формирования результата. В отчёте обязательно фиксируй время
работы каждого проверенного эндпоинта.

---

## Чеклист: Архитектура (Backend)

- [ ] `api/` не содержит бизнес-логики, SQL и ручного управления транзакциями
- [ ] `core/services/` зависит от Protocol-контрактов (`core/protocols`), а не от конкретных `repositories/*`
- [ ] `core/entities/` не импортирует `api/`, `depends/`, `repositories/`, `models/`, `settings`, `utils/database`
- [ ] SQLAlchemy tables из `models/` не импортированы в `core/services/` и `core/entities/`
- [ ] Depends-сборка соблюдена: `depends` собирает `session -> repository -> service`
- [ ] Ожидаемые бизнес-ошибки мапятся через `ClientError`/специализированные клиентские ошибки
- [ ] Бизнес-валидация не спрятана в `InDto`-валидации (422 только для структурных ошибок)

## Чеклист: Access Policy (Backend/API)

- [ ] Для каждого нового/измененного endpoint заполнен access-класс (`public`/`protected`) и он совпадает с планом
- [ ] Публичные `GET` проверены без cookie и не требуют авторизации (если не зафиксировано исключение)
- [ ] `POST/PATCH/DELETE` без cookie возвращают контрактный `401`/`403`
- [ ] `POST/PATCH/DELETE` с валидной авторизацией проходят по контракту роли/прав
- [ ] Любые исключения (публичный write или защищенный `GET`) явно задокументированы и покрыты тестами

## Чеклист: Код-стиль

- [ ] PEP 8 соблюдён (проверить через `make lint`)
- [ ] Типизация: все публичные функции имеют аннотации типов
- [ ] Нет `dict[str, Any]` как аргументов сервисов
- [ ] Нет глобальных синглтонов
- [ ] Конвенции именования соблюдены (см. `agents/backend.md` секция 6)

## Чеклист: Тесты

- [ ] Новый код покрыт тестами (unit или integration)
- [ ] Сервисы протестированы с `AsyncMock` для `IRepository`
- [ ] `make test` проходит без ошибок
- [ ] Coverage не упал (если настроен threshold)
- [ ] SMOKE-тесты запущены через `.claude/skills/api-smoke-test` после прочтения `SKILL.md`
- [ ] В SMOKE-результатах указано время работы каждого эндпоинта
- [ ] Approve невозможен без успешных unit-тестов и SMOKE-тестов с endpoint timings

## Чеклист: AsyncAPI / Messaging

- [ ] Если изменился NATS-контракт → обновлена `docs/asyncapi.yaml`
- [ ] `make asyncapi-validate` проходит без ошибок
- [ ] `channels[].address` соответствует `NATSSettings.subject` / `subject_response`
- [ ] Поля `components/schemas` соответствуют реальному payload в handler

## Чеклист: Frontend

- [ ] Нет бизнес-логики в компонентах — только рендеринг данных из API
- [ ] TypeScript типизация присутствует
- [ ] Нет прямых fetch без абстракции (API-слой / hooks)
- [ ] Линтер проходит: `make lint`

## Чеклист: Безопасность

- [ ] Нет хардкода секретов (API-ключи, пароли, токены)
- [ ] Аутентификация применена к защищённым эндпоинтам
- [ ] SQL-инъекции исключены (параметризованные запросы)

---

## Команды для проверки

```bash
make test                # Запустить тесты
make lint                # flake8 + black + isort
make type-check          # mypy
make validate            # всё вместе
make asyncapi-validate   # Валидация AsyncAPI specs во всех сервисах
git diff main            # Посмотреть изменения относительно main
```

Или через корневой make (запускает QG с текущим diff):
```bash
make review TASK=NEX-XXX
```

### Когда запускать `make asyncapi-validate`

Запускай если diff затрагивает:
- `services/*/docs/asyncapi.yaml` — изменения AsyncAPI-спек
- `app/infrastructure/messaging/` — изменения NATS-контракта (subjects, payload)
- `app/core/config/nats.py` — изменения subjects / stream / consumer

AsyncAPI-спека должна соответствовать реальному коду:
- `subject` в `NATSSettings` → `channels[].address`
- Поля payload в handler → `components/schemas`

---

## Формат отчёта

Сохрани результат в `docs/reports/<TICKET-ID>-review.md` или
`docs/reports/<TICKET-ID>-development-report.md`. Для отчёта после разработки используй
`docs/reports/TEMPLATE.md`.

Отчёт должен содержать:
- ссылку на план;
- ссылку на задачу, если она была передана как md-файл;
- краткое описание выполненных изменений для контекста следующего агента;
- список изменённых файлов;
- рекомендуемую ветку;
- результаты unit/integration тестов;
- результаты SMOKE-тестов с временем работы каждого эндпоинта;
- раздел `Access verification results` (anonymous/public checks + authenticated/protected checks + исключения).

### ✅ APPROVED:

```markdown
# Review: NEX-XXX

**Статус: ✅ APPROVED**
**Дата:** YYYY-MM-DD

## Итог

Diff соответствует плану. Тесты прошли. Архитектура не нарушена.

## Тесты
- `make test`: X passed, 0 failed
- `make lint`: чисто

## SMOKE-тесты

| # | Endpoint | Method | HTTP | Time | Результат |
|---|---|---|---|---|---|
| SM-01 | `/api/example` | GET | 200 | 123 ms | ✅ |

Готово к merge.
```

### ❌ REWORK:

```markdown
# Review: NEX-XXX

**Статус: ❌ REWORK**
**Дата:** YYYY-MM-DD

## Проблемы

1. [АРХИТЕКТУРА] `app/interfaces/api/routes/job.py:45` — бизнес-логика в роутере
2. [ТЕСТЫ] `JobService` не покрыт unit-тестами
3. [СТИЛЬ] Отсутствует аннотация типов в `create_job()`

## Чеклист доработки

### Backend

- [ ] Перенести логику из роутера в `JobService`
- [ ] Добавить `tests/unit/test_job_service.py`
- [ ] Добавить аннотации типов в `create_job()`

### Frontend

- [ ] Если frontend не затронут, оставить секцию пустой или указать `не требуется`

### Quality Gate

- [ ] Повторно проверить архитектуру
- [ ] Убедиться что unit-тесты и `make test` проходят
- [ ] Прочитать `.claude/skills/api-smoke-test/SKILL.md` и повторно запустить SMOKE-тесты
- [ ] Убедиться что в SMOKE-результатах указано время работы каждого эндпоинта
```

> **Важно:** секции `### Backend` / `### Frontend` / `### Quality Gate` в rework-файле совместимы с оркестратором —
> его можно передать агенту напрямую как новый план.

---

## Что запрещено

- ❌ Пропускать код без тестов
- ❌ Игнорировать нарушения Clean Architecture
- ❌ Одобрять merge при красных тестах
- ❌ Одобрять merge без успешных unit-тестов
- ❌ Одобрять merge без SMOKE-тестов через `.claude/skills/api-smoke-test`
- ❌ Одобрять merge, если SMOKE-результаты не содержат время работы эндпоинтов
- ❌ Сохранять review/report файлы вне `docs/reports/`
