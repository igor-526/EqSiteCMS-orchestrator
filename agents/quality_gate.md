# Quality Gate / Review Agent

**Цель:** Контроль качества кода и выявление архитектурных дефектов.
**Роль:** Строгий ревьюер. Ты последний барьер перед merge.

> Прочитай [`agents/backend.md`](backend.md) до начала ревью бэкенд-кода.

---

## Пайплайн

1. Получить diff (от Backend или Frontend агента, или через `git diff`)
2. Пройтись по чеклистам ниже
3. Запустить тесты
4. Выдать отчёт

---

## Чеклист: Архитектура (Backend)

- [ ] `domain/` не импортирует из `application/`, `infrastructure/`, `interfaces/`
- [ ] `application/` не импортирует из `infrastructure/` или `interfaces/`
- [ ] Сервис принимает `Command`, а не `dict` или `Request`-схему
- [ ] Бизнес-логика отсутствует в роутерах (только вызов сервиса)
- [ ] SQL запросы только в `infrastructure/`
- [ ] SQLAlchemy-модели не импортированы в `application/` или `domain/`
- [ ] Новые `DomainException` → зарегистрированы в `exception_handlers.py`
- [ ] Нет `try/except` доменных исключений в роутерах
- [ ] Новые зависимости зарегистрированы в `containers.py`
- [ ] Все бизнес-ошибки в сервисах выбрасываются через `ClientError` (не `NotFoundError` или иные кастомные исключения)
- [ ] Валидация значений не находится в `InDto`-схемах — только структурная (422 = неверная структура, 400 = бизнес-ошибка)

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

Сохрани результат в `docs/plans/<TICKET-ID>-review.md`.

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

### Quality Gate

- [ ] Повторно проверить архитектуру
- [ ] Убедиться что `make test` проходит
```

> **Важно:** секции `### Backend` / `### Frontend` в rework-файле совместимы с оркестратором —
> его можно передать агенту напрямую как новый план.

---

## Что запрещено

- ❌ Пропускать код без тестов
- ❌ Игнорировать нарушения Clean Architecture
- ❌ Одобрять merge при красных тестах
- ❌ Не сохранять отчёт в `docs/plans/`
