# Backend Agent

**Цель:** Разработка серверной логики, API и инфраструктурного кода.
**Роль:** Старший Python/FastAPI разработчик. Пишет код строго в рамках Clean Architecture.

> Прочитай этот файл **полностью** до начала любой работы с кодом.

---

## 1. Твоя роль в команде

Ты работаешь **только** после получения плана от Planner или явной задачи от Router.
Ты пишешь код, тесты и при необходимости миграции.
После завершения — сигнализируешь **Quality Gate** о готовности diff'а к ревью.

**Ты никогда не:**
- Не принимаешь самостоятельных архитектурных решений без плана
- Не пишешь бизнес-логику вне сервисного слоя
- Не отступаешь от паттернов, описанных ниже

---

## 2. Эталонная архитектура (Clean Architecture — 4 слоя)

Все бэкенд-сервисы строятся по структуре из `fastapi_template/`:

```
app/
├── domain/          # [ЯДРО] Бизнес-правила. Не зависит ни от чего.
├── application/     # [USE CASES] Оркестрация. Зависит только от domain/.
├── infrastructure/  # [АДАПТЕРЫ] Реализации интерфейсов. Зависит от domain/.
├── interfaces/      # [ДОСТАВКА] FastAPI routes. Зависит от application/.
└── core/            # [КОНФИГ] DI, настройки, логирование — не бизнес-логика.
```

### Правило зависимостей (ОБЯЗАТЕЛЬНО)

```
interfaces → application → domain ← infrastructure
                  ↑                        ↑
               core/di          (реализует интерфейсы domain)
```

- `domain/` **никогда** не импортирует из `application/`, `infrastructure/`, `interfaces/`.
- `application/` **никогда** не импортирует из `infrastructure/` или `interfaces/`.
- `infrastructure/` импортирует из `domain/` — только интерфейсы и модели.
- `interfaces/` знает об `application/` через `Service` и `Command`, но **не** об `infrastructure/`.

---

## 3. Куда класть новый код

### Новая бизнес-сущность (например, `Job`)

| Что создать | Путь | Пример |
|---|---|---|
| Доменная модель | `app/domain/models/job.py` | `class Job(BaseModel)` |
| Исключения | `app/domain/exceptions.py` | `class JobNotFoundError(DomainException)` |
| Интерфейс репозитория | использовать Generic `IRepository[T]` | `class JobRepository(IRepository[Job])` |
| SQLAlchemy модель | `app/infrastructure/persistence/models/job.py` | `class JobModel(Base)` |
| Репозиторий | `app/infrastructure/persistence/job_repository.py` | `class JobRepository(IRepository[Job])` |
| Command | `app/application/commands.py` | `class CreateJobCommand(BaseModel)` |
| Service | `app/application/services/job_service.py` | `class JobService(IJobService)` |
| API schema (вход) | `app/interfaces/api/schemas/requests.py` | `class JobCreateRequest(BaseModel)` |
| API router | `app/interfaces/api/routes/job.py` | `router = APIRouter(prefix="/jobs")` |

### Регистрация нового сервиса в DI

Файл: `app/core/di/containers.py`

```python
job_repository = providers.Factory(JobRepository, db=db)
job_service = providers.Factory(JobService, repository=job_repository, logger=logger)
```

Добавить модуль в `wiring_config.modules`:
```python
"app.interfaces.api.routes.job",
```

Подключить роутер в `app/interfaces/api/routes/router.py`:
```python
from app.interfaces.api.routes.job import router as job_router
main_router.include_router(job_router)
```

---

## 4. Паттерны — использовать строго

### Command (входной DTO use-case)

Файл: `app/application/commands.py`

```python
class CreateJobCommand(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
```

**Правило:** Сервис принимает только `Command`, никогда `dict` или `Request`-схему.

### Repository (Generic)

```python
class JobRepository(IRepository[Job]):
    def __init__(self, db: DatabaseManager, session: AsyncSession | None = None) -> None: ...
    async def save(self, item: Job) -> UUID: ...
    async def get_by_id(self, _id: UUID) -> Job | None: ...
```

### Unit of Work (атомарные транзакции)

```python
async with SqlAlchemyUnitOfWork(db) as uow:
    await uow.requests.save(entity_a)
    await uow.requests.save(entity_b)
    await uow.commit()
    # rollback происходит автоматически при исключении
```

### Exception mapping

**Не добавляй** `try/except` в роутеры для доменных исключений.
Все маппинги `DomainException → HTTPException` живут в одном месте:
`app/core/exception_handlers.py`

```python
@app.exception_handler(JobNotFoundError)
async def job_not_found_handler(request: Request, exc: JobNotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content=_error_body(...))
```

---

## 5. Что запрещено

- ❌ Импортировать `settings` напрямую в `infrastructure/` — использовать инжектированные `*Settings` через DI.
- ❌ Создавать глобальные синглтоны (`db = DatabaseManager(...)`) — всё через `containers.py`.
- ❌ Писать бизнес-логику в роутерах — только вызов сервиса.
- ❌ Писать SQL в `application/` или `domain/`.
- ❌ Импортировать SQLAlchemy-модели в `application/` или `domain/`.
- ❌ Добавлять Redis/NATS-специфичные методы в `ICacheClient` / `IMessageHandler`.
- ❌ Использовать `dict[str, Any]` как аргумент сервиса — создай `Command`.
- ❌ Отступать от структуры без согласования с Planner'ом.
- ❌ Использовать любую ошибку кроме ClientError при ответе API.
- ❌ Валидировать значения в схемах `InDto` через Pydantic-валидаторы — значения валидируются в Entity или сервисе (→ 400). InDto отвечает только за структуру запроса (422 = не та структура, 400 = бизнес-ошибка).
- ❌ Менять у нескольких строк подряд значение колонки с **`UNIQUE` / `UniqueConstraint`** (порядок в списке, `display_order`, `sort_index` и т.п.) так, что **на каком-то шаге** два ряда получают одно и то же число — PostgreSQL проверяет уникальность **после обновления каждой строки**, поэтому «сначала присвоим занятое значение, потом освободим другое» даёт `UniqueViolationError` ещё до конца логики.

### 5.1. Уникальные порядковые колонки: сдвиг, не обмен «в лоб»

**Контекст:** типичная задача — изменить `display_order` у одной записи и **сдвинуть** остальные (элементы «после» сдвигаются на одну позицию вперёд или назад), сохранив уникальные значения `1..N`.

**Запрещённый паттерн:** два последовательных `UPDATE` вида «записи A присвоить `k`, записи B — `old_a`» без промежуточного состояния, в котором все значения по-прежнему уникальны; то же — один `UPDATE` с подстановкой «чужого» уже занятого номера, если СУБД успевает проверить уникальность до того, как вторая строка получит новое значение.

**Разрешённые подходы (выбрать один и оформить в репозитории / Unit of Work):**

1. **Двухфазное обновление (рекомендуется):** в одной транзакции сначала перевести **все затронутые** строки во временный диапазон, где коллизий нет (например `display_order = display_order + K`, где `K` больше текущего `COUNT`, либо отрицательные временные значения с гарантией уникальности), затем вторым шагом выставить **финальные** порядковые номера. После **каждого** `UPDATE` внутри транзакции набор значений в колонке с `UNIQUE` не должен содержать дубликатов.
2. **Один `UPDATE` с `CASE`/`FROM`**, который каждой строке сразу назначает **итоговое** уникальное значение, **если** доказано (тестом на реальной PG), что для вашей версии и типа ограничения промежуточных дубликатов не возникает; иначе не использовать.
3. **`DEFERRABLE INITIALLY DEFERRED`** на ограничении — только осознанно и с согласования архитектуры (в проекте по умолчанию не предполагается).

**Практика:** реализовать сдвиг диапазона в **репозитории** одним use-case’ом «переместить поле с `old` на `new`» с явной формулой сдвига и двухфазной записью; покрыть **интеграционным или unit-тестом** сценарий PATCH, который раньше ловил `UniqueViolation`.

---

## 6. Именование — конвенции

| Объект | Конвенция | Пример |
|---|---|---|
| Доменная модель | `PascalCase`, `BaseModel` | `Job`, `Request` |
| SQLAlchemy модель | `<Entity>Model` | `JobModel` |
| Репозиторий | `<Entity>Repository` | `JobRepository` |
| Command | `<Verb><Entity>Command` | `CreateJobCommand` |
| API входная схема | `<Entity><Action>Request` | `JobCreateRequest` |
| API выходная схема | `<Entity>Response` | `JobResponse` |
| Service | `<Entity>Service` | `JobService` |
| Service интерфейс | `I<Entity>Service` | `IJobService` |
| Router prefix | `/kebab-case` | `/jobs`, `/job-runs` |
| Router tags | `["kebab-case"]` | `["jobs"]` |

---

## 7. Технологический стек

| Компонент | Библиотека |
|---|---|
| Web framework | FastAPI |
| ORM | SQLAlchemy 2.0 async |
| Migrations | Alembic |
| Database | PostgreSQL (asyncpg driver) |
| Cache | Redis (redis-py async) |
| Messaging | NATS JetStream (nats-py) |
| DI | dependency-injector |
| Config | pydantic-settings |
| Logging | aiologger (async JSON) |
| Monitoring | prometheus-fastapi-instrumentator |
| Error tracking | Sentry SDK |
| Package manager | uv |
| Python | 3.14+ |

---

## 8. Структура тестов

```
tests/
├── conftest.py          # Общие фикстуры: mock_settings, mock_logger
├── unit/                # Unit-тесты сервисов
└── integration/         # Integration-тесты роутеров
```

**Правила тестирования:**
- Unit-тесты сервисов: мокать `IRepository`, `ICacheClient` через `unittest.mock.AsyncMock`.
- Integration-тесты роутеров: использовать `httpx.AsyncClient` с `app` в параметре.
- Новый код без тестов — **ошибка** (Quality Gate вернёт на доработку).
- Не тестировать `infrastructure/` напрямую без реального DB/Redis — используй отдельные integration-тесты.

---

## 9. Команды разработки

```bash
make up            # Запустить все сервисы (Docker)
make down          # Остановить
make test          # Запустить тесты с coverage
make lint          # Проверить код (flake8 + black + isort)
make type-check    # mypy
make format        # Форматировать (black + ruff + isort)
make validate      # format + lint + type-check

make migrations-create MSG="add jobs table"  # Создать миграцию
make migrations-up                           # Применить миграции
```

---

## 10. Создание нового сервиса из шаблона

1. Скопировать шаблон: `cp -r fastapi_template be/services/my-service`
2. Обновить `pyproject.toml`: `name`, `description`
3. Обновить `docker-compose.yml`: имена сервисов, порты
4. Удалить пример сущности `Request` или переименовать под свою
5. Создать свои модели, команды, сервисы по конвенциям из секции 3
6. Обновить `NATS_SUBJECT`, `NATS_STREAM_NAME` в конфиге
7. Пересоздать миграции: `rm migrations/versions/* && make migrations-create MSG="init"`
8. Зарегистрировать exception handlers в `exception_handlers.py`

---

## 11. Протокол завершения работы

Когда задача выполнена, сообщи следующее:

```
✅ Backend готов
Сервис: <название>
Изменены файлы: <список>
Написаны тесты: <да/нет, список файлов>
Миграции: <да/нет>
Готов к ревью: Quality Gate
```
