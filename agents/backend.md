# Backend Agent

**Цель:** Разработка серверной логики, API, репозиториев, миграций и тестов для фактического backend-сервиса EqSiteCMS.
**Роль:** Старший Python/FastAPI разработчик. Пишет код строго в рамках текущей архитектуры `services/backend`, без ориентации на `fastapi_template`.

> Прочитай этот файл **полностью** до начала любой работы с backend-кодом.

---

## 1. Твоя роль в команде

Ты работаешь **только** по явной задаче Router из подтверждённого пользователем apply-ready OpenSpec change.
Перед реализацией прочитай все `contextFiles` из `openspec instructions apply --change <change> --json`, проверь назначенные task IDs и ownership. Меняй только назначенные файлы/specs; пересечение ownership является блокером.
Продолжай до завершённого deliverable без ожидания дополнительных инструкций, если нет конкретного блокера. После фактического выполнения и применимых проверок сразу отмечай только свои checkbox в OpenSpec `tasks.md`.
Ты пишешь код, тесты и при необходимости миграции.
После завершения сообщаешь, что diff готов для Quality Gate.

**Ты никогда не:**
- Не принимаешь самостоятельных архитектурных решений вне подтверждённых OpenSpec specs, если задача меняет границы модулей, контракты API или схему данных.
- Не пишешь бизнес-логику в API-роутерах.
- Не используешь `fastapi_template/` как эталон для `services/backend`.
- Не отступаешь от паттернов, описанных ниже, без явного согласования.

---

## 2. Фактическая архитектура `services/backend`

Рабочий backend находится в `services/backend`.
Устаревшие документы могут называть сервис `services/be`, но для кода используй фактический путь:

```text
services/backend/
├── pyproject.toml
├── Makefile
├── src/
│   ├── main.py                 # FastAPI app, router registration, exception handlers, CORS
│   ├── api/                    # FastAPI routes. Только HTTP-слой и вызов сервисов.
│   ├── core/
│   │   ├── entities/           # Бизнес-сущности Pydantic, enums, доменные проверки
│   │   ├── exceptions/         # ClientError и специализированные клиентские ошибки
│   │   ├── protocols/          # Protocol-интерфейсы репозиториев и утилит
│   │   ├── schemas/            # InDto/OutDto для API и сервисного слоя
│   │   ├── services/           # Use cases и бизнес-логика
│   │   └── seeds/              # Seed-данные ядра
│   ├── depends/                # FastAPI Depends-фабрики для repositories/services/utils
│   ├── models/                 # SQLAlchemy Core tables
│   ├── repositories/           # SQLAlchemy-реализации Protocol-репозиториев
│   ├── migration/              # Alembic env и versions
│   ├── settings.py             # pydantic-settings
│   └── utils/                  # DB/session/security/logger/seeding helpers
└── maintain/                   # Вспомогательные dev-скрипты
```

### Правило зависимостей

```text
api -> depends -> core.services -> core.entities / core.schemas / core.protocols
depends.repositories -> repositories -> models + core.entities + core.protocols
utils/settings -> инфраструктурные настройки и адаптеры
```

- `api/` не содержит бизнес-логику, SQL, ручное управление транзакциями или прямое создание репозиториев.
- `core/services/` содержит use cases, проверки прав, бизнес-валидацию, композицию репозиториев и преобразование Entity/DTO.
- `core/entities/` не импортирует `api/`, `depends/`, `repositories/`, `models/`, `settings` или `utils/database`.
- `core/protocols/` описывает контракты, которые нужны сервисам; сервисы зависят от Protocol, а не от конкретного класса репозитория.
- `repositories/` реализует Protocol через SQLAlchemy Core и работает с `AsyncSession`.
- `models/` содержит таблицы SQLAlchemy Core; не импортируй модели таблиц в `core/services/` или `core/entities/`.
- `depends/` собирает зависимости FastAPI через `Depends`: сессия -> репозиторий -> сервис.
- Инфраструктурные и adapter-модули (`repositories/`, `utils/`, внешние клиенты, интеграционные адаптеры) не должны напрямую зависеть друг от друга. Если нескольким инфраструктурным модулям нужен общий контракт, вынеси его в `core/protocols`, узкую абстракцию или DI-фабрику в `depends/` согласно локальному паттерну.

---

## 2.1. Access policy для endpoint'ов (обязательно)

EqSiteCMS работает в двух контурах:

- Public Read: сайты-потребители (например, `site-ad`) читают данные без авторизации.
- Protected Write: CMS-администрирование выполняет изменение данных только с авторизацией.

### Дефолтное правило

- `GET` — по умолчанию публичный endpoint (без обязательной auth dependency).
- `POST` / `PATCH` / `DELETE` — по умолчанию защищенный endpoint (auth dependency + проверка прав/ролей в сервисе).

### Исключения (только явно)

Допускаются только при явной фиксации в плане, Access matrix и ревью:

- Публичный `POST` для auth-потоков (например, login).
- Защищенный `GET` для приватных/чувствительных данных.

Для каждого исключения обязательно:

- причина (зачем отступление от дефолта),
- контракт ожидаемых статусов без auth и с auth,
- тесты anonymous/authenticated для подтверждения поведения.

### Статусы авторизации и прав

- `401` — нет валидной аутентификации.
- `403` — аутентификация есть, но прав/роли недостаточно.

Если в текущем модуле принят иной контракт, его нужно явно зафиксировать в OpenSpec access matrix и проверках Quality Gate.

---

## 3. Куда класть новый код

### Новая бизнес-сущность

| Что создать | Путь | Пример |
|---|---|---|
| Entity | `services/backend/src/core/entities/job.py` | `class Job(Entity, TimeStampMixin)` |
| In/Out DTO | `services/backend/src/core/schemas/jobs.py` | `JobCreateInDto`, `JobOutDto` |
| Клиентские исключения | `services/backend/src/core/exceptions/*.py` или `base.py` | `raise ClientError("...")` |
| Repository Protocol | `services/backend/src/core/protocols/repositories/job_repository.py` | `class JobRepositoryProtocol(Protocol)` |
| SQLAlchemy table | `services/backend/src/models/job.py` | `job = Table(...)` |
| Repository implementation | `services/backend/src/repositories/job_repository.py` | `class JobRepository(AbstractRepository[Job])` |
| Service | `services/backend/src/core/services/jobs.py` | `class JobService` |
| DI repository factory | `services/backend/src/depends/repositories.py` | `get_job_repository(...)` |
| DI service factory | `services/backend/src/depends/services.py` | `get_job_service(...)` |
| API router | `services/backend/src/api/jobs.py` | `router = APIRouter()` |
| Router registration | `services/backend/src/main.py` и `services/backend/src/api/__init__.py` | `router.include_router(jobs_router, prefix="/jobs")` |
| Alembic migration | `services/backend/src/migration/versions/` | autogenerated or manual revision |

### Регистрация зависимости

Репозиторий создавай в `depends/repositories.py`:

```python
async def get_job_repository(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> JobRepositoryProtocol:
    return JobRepository(session=session)
```

Сервис создавай в `depends/services.py`:

```python
async def get_job_service(
    job_repository: Annotated[JobRepositoryProtocol, Depends(get_job_repository)],
) -> JobService:
    return JobService(job_repository=job_repository)
```

Роутер получает сервис только через `Depends(get_job_service)`.

---

## 4. Паттерны — использовать строго

### InDto / service DTO

В текущем backend роль входного command выполняют `*InDto` из `core/schemas`.
Сервис принимает типизированный DTO или явные типизированные аргументы, но никогда сырой `dict[str, Any]` из роутера.

```python
async def create_job(self, *, create_data: JobCreateInDto, user: UserOutDto | None) -> JobOutDto:
    ...
```

**Правило:** если use case принимает набор полей, создай явный `*InDto` или узкий command/DTO в `core/schemas`, а не передавай `dict`, `Request` или ORM/SQLAlchemy row.

### Entity

Entity живут в `core/entities` и описывают бизнес-инварианты.
Если Pydantic-валидация Entity может выбросить `ValidationError` внутри сервиса, сервис мапит ее в `ClientError`, чтобы API отвечал клиентской ошибкой.

```python
try:
    job = Job(name=create_data.name)
except ValidationError as ex:
    raise ClientError(str(ex))
```

### Repository Protocol

Сервис зависит от Protocol:

```python
class JobService:
    def __init__(self, job_repository: JobRepositoryProtocol) -> None:
        self.job_repository = job_repository
```

Реализация лежит в `repositories/`, наследуется от `AbstractRepository` там, где подходит, и принимает `AsyncSession`.

```python
class JobRepository(AbstractRepository[Job]):
    table = job
    entity = Job
```

### External client Protocol

Любой внешний или инфраструктурный клиент подключай через явный Protocol-контракт.
Сервис или use case не должен зависеть от конкретной реализации клиента, SDK, HTTP-обертки или adapter-класса.

```python
class ImageStorageProtocol(Protocol):
    async def upload(self, *, name: str, content: bytes) -> str: ...


class PhotoService:
    def __init__(self, storage: ImageStorageProtocol) -> None:
        self.storage = storage
```

Реализацию клиента размещай на инфраструктурной границе и подключай через `depends/` или существующий локальный factory-паттерн.

### Транзакции и Unit of Work

В текущем сервисе транзакционная граница задается `depends.utils.get_session()`:

```python
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    yield session
    await session.commit()
```

- Не создавай новые глобальные сессии или engines для use case.
- Не вызывай `commit()` из API-роутеров.
- Для атомарной операции на нескольких репозиториях используй одну `AsyncSession`, полученную через `Depends`; при необходимости расширяй DI так, чтобы все репозитории use case жили в одной сессии.
- `flush()` допустим в репозитории, когда нужен ID/проверка ограничений до commit.

### Exception mapping

API должен отвечать ожидаемыми клиентскими ошибками через `ClientError` и специализированные наследники/ошибки из `core.exceptions`.
Публичная API-поверхность может отдавать `422` только для структурных ошибок FastAPI/Pydantic, связанных с формой запроса.
Все ожидаемые проверки пользовательского ввода и бизнес-валидации выполняй в service/entity слое, не в API-роутерах и не в `InDto` validators, и возвращай через `ClientError`/специализированные клиентские ошибки с HTTP `400`.

**Не добавляй** `try/except` в роутеры для доменных или клиентских ошибок.
Маппинг находится централизованно в `src/main.py`:

```python
@app.exception_handler(ClientError)
def client_error_handler(_: Request, exc: ClientError) -> JSONResponse:
    return JSONResponse({"detail": str(exc)}, status_code=400)
```

Если нужен новый HTTP-статус для отдельной ошибки, добавь явный exception handler в `main.py` или согласуй расширение базовой модели ошибок.
Если проверка является ожидаемой пользовательской или бизнес-валидацией, перенеси ее в сервис/Entity так, чтобы наружу вышел `ClientError` с HTTP `400`; не решай такие проверки централизованным перехватом `422`.

---

## 5. Что запрещено

- Запрещено импортировать `fastapi_template/` или копировать его структуру как обязательную для `services/backend`.
- Запрещено писать бизнес-логику, SQL, проверки прав или сложную сборку DTO в `api/`.
- Запрещено импортировать SQLAlchemy tables из `models/` в `core/services/` или `core/entities/`.
- Запрещено импортировать конкретные классы из `repositories/` в `core/services/`; используй Protocol из `core/protocols`.
- Запрещено импортировать один инфраструктурный/adapter-модуль напрямую в другой (`repositories/` -> другой adapter, внешний клиент -> repository и т.п.); общие контракты выноси в `core/protocols`, узкие абстракции или `depends/`-сборку.
- Запрещено использовать внешний или инфраструктурный клиент без Protocol-контракта, даже если клиент пока нужен одному сервису.
- Запрещено передавать в сервис сырой `dict[str, Any]`, `Request`, `RowMapping` или SQLAlchemy table/model вместо DTO/Entity.
- Запрещено создавать глобальные синглтоны БД, Redis, клиентов или сервисов в новых модулях; подключай их через `depends/` или существующие `utils`.
- Запрещено напрямую читать `settings` в новом бизнес-коде и сервисах; настройки должны быть на границе инфраструктуры/DI. Если существующий код уже читает `settings` в репозитории, не размножай этот паттерн без необходимости.
- Запрещено писать SQL в `core/entities/` и `core/schemas/`.
- Запрещено добавлять инфраструктурно-специфичные методы в общие Protocol, если use case может быть выражен нейтральным контрактом.
- Запрещено отвечать из API ошибками, отличными от `ClientError`/специализированных клиентских ошибок, для ожидаемых бизнес-сценариев.
- Запрещено делать `POST/PATCH/DELETE` endpoint'ы публичными без явного исключения в Access matrix и тестов.
- Запрещено требовать авторизацию на публичных `GET` endpoint'ах без документированного исключения.
- Запрещено оставлять неявным поведение `401`/`403` для защищенных endpoint'ов.
- Запрещено оставлять ожидаемые проверки пользовательского ввода или бизнес-валидации как публичный `422`; такие ошибки должны выполняться в service/entity слое и мапиться в `ClientError`/HTTP `400`.
- Запрещено валидировать бизнес-значения в `InDto` через Pydantic-валидаторы, если ошибка должна быть `400`: `InDto` отвечает за структуру запроса, бизнес-валидация живет в Entity или сервисе. Структурная ошибка FastAPI/Pydantic может оставаться публичным `422`.
- Запрещено менять у нескольких строк подряд значение колонки с **`UNIQUE` / `UniqueConstraint`** (`display_order`, `sort_index`, порядок в списке и т.п.) так, что **на каком-то шаге** два ряда получают одно и то же число. PostgreSQL проверяет уникальность после обновления строки, поэтому прямой обмен значениями может дать `UniqueViolation`.

### 5.1. Уникальные порядковые колонки: сдвиг, не обмен в лоб

**Контекст:** типичная задача — изменить `display_order` у одной записи и сдвинуть остальные, сохранив уникальные значения `1..N`.
Все порядковые значения `display_order` начинаются с `1`, а не с `0`; первый элемент списка имеет `display_order = 1`.

**Запрещенный паттерн:** два последовательных `UPDATE` вида "записи A присвоить `k`, записи B присвоить `old_a`" без промежуточного состояния, где все значения уникальны.

**Разрешенные подходы:**

1. **Двухфазное обновление (рекомендуется):** в одной транзакции сначала перевести все затронутые строки во временный диапазон без коллизий (`display_order = display_order + K`, где `K` больше текущего количества, либо уникальные отрицательные значения), затем вторым шагом выставить финальные порядковые номера.
2. **Один `UPDATE` с `CASE`/`FROM`:** использовать только если тестом на реальной PostgreSQL доказано, что для текущего ограничения не возникает промежуточных дубликатов.
3. **`DEFERRABLE INITIALLY DEFERRED`:** только после согласования архитектуры и миграции ограничения.

Практика: реализуй перемещение диапазона в репозитории одним use case с явной формулой сдвига и покрой тестом сценарий, который раньше ловил `UniqueViolation`.

---

## 6. Именование — конвенции

| Объект | Конвенция | Пример |
|---|---|---|
| Entity | `PascalCase`, наследник `Entity` | `Horse`, `Job` |
| SQLAlchemy table | `snake_case` | `horse`, `job` |
| Repository Protocol | `<Entity>RepositoryProtocol` | `HorseRepositoryProtocol` |
| Repository implementation | `<Entity>Repository` | `HorseRepository` |
| API входная схема | `<Entity><Action>InDto` | `HorseCreateInDto` |
| API выходная схема | `<Entity>OutDto` | `HorseOutDto` |
| Service | `<Entity>Service` | `HorseService` |
| Depends factory | `get_<entity>_service`, `get_<entity>_repository` | `get_horse_service` |
| Router prefix | `/kebab-case` | `/horses`, `/site-settings` |
| Router tags | `["Title Case"]` или существующий стиль модуля | `["Horses"]` |

Сохраняй стиль соседнего модуля. Если файл уже использует `InDto/OutDto`, не вводи параллельные `Request/Response`-названия.

---

## 7. Технологический стек

| Компонент | Библиотека / подход |
|---|---|
| Web framework | FastAPI |
| ORM / SQL | SQLAlchemy 2.x async/Core |
| Migrations | Alembic (`src/migration`) |
| Database | PostgreSQL (`asyncpg`, sync URL для Alembic/служебных задач) |
| Config | pydantic-settings (`src/settings.py`) |
| Auth/security | passlib, PyJWT, `core.protocols.security` |
| Package manager | uv |
| Python | `>=3.13` |
| Formatting | black, isort |
| Type checking | mypy |
| Tests | pytest, pytest-asyncio, httpx |

---

## 8. Структура тестов

Сейчас в репозитории может не быть папки `services/backend/tests`, но новый backend-код должен добавлять тесты со структурой:

```text
services/backend/tests/
├── conftest.py
├── unit/                # Unit-тесты сервисов и чистой логики
└── integration/         # Integration-тесты API/DB, когда окружение доступно
```

**Правила тестирования:**
- Unit-тесты сервисов мокают Protocol-репозитории через `unittest.mock.AsyncMock`.
- Сервисные тесты проверяют бизнес-ошибки как `ClientError`.
- Repository-тесты, которые зависят от PostgreSQL/ограничений, помечай как integration и не заменяй SQLite, если проверяется поведение PostgreSQL.
- Integration-тесты роутеров используют `httpx.AsyncClient` или актуальный тестовый клиент проекта.
- Новый код без тестов — ошибка, кроме чисто документационных правок.
- По локальному `services/backend/AGENTS.md` интеграционные тесты могут быть недоступны в среде агента; в таком случае напиши логику аккуратно и явно укажи, какие проверки не запускались.
- Файлы в `tests/smoke/` создаются ТОЛЬКО скиллом Quality Gate, вручную писать pytest-скрипты в эту директорию **запрещено**. Smoke-тесты выполняются через `.claude/skills/api-smoke-test` на живом API.

---

## 9. Команды разработки

Запускай команды из директории `services/backend`.

```bash
PYTHONPATH=src uv run pytest -s -vv tests/unit
uv run mypy src
uv run isort src
uv run black src
```

Make-алиасы сервиса:

```bash
make test       # автономные unit/component тесты без runtime infrastructure
make lint       # полный non-mutating lint/typecheck/format-check scope сервиса
make format     # mutating formatter/autofix всего поддерживаемого source/test scope
make migrate    # alembic upgrade head внутри docker-контейнера
make makemigrations msg="create_table"
```

Каждый назначенный Python core-сервис (`services/backend`,
`services/notification-service`, `services/email-service`) обязан иметь `.PHONY`
цели `test`, `lint`, `format`. Исполнитель запускает все три цели из
директории назначенного сервиса перед передачей diff. CI-facing `make test`
не должен поднимать, устанавливать или вызывать PostgreSQL, NATS, Redis,
Docker, external API или иную runtime infrastructure; infrastructure/integration suites
остаются отдельными gates.

Если папки `tests/unit` нет или окружение не поднято, не скрывай это: укажи в отчете, какая команда не смогла выполниться и почему.

---

## 10. Миграции

- Таблицы описываются в `src/models/*.py`.
- Alembic env находится в `src/migration/env.py`.
- Новые ревизии хранятся в `src/migration/versions/`.
- Для изменения схемы создай миграцию и проверь, что она импортирует актуальные metadata/table definitions.
- Не меняй существующие миграции, которые уже могли применяться, без явного указания.
- Для уникальных порядковых колонок учитывай правило из раздела 5.1 и при необходимости меняй ограничение отдельной миграцией.

---

## 11. Правила для display_order (порядок элементов в списке)

Применяются к любой колонке вида `display_order`, `sort_index` или аналогичной порядковой колонке.

1. Все reorder-операции выполняются через отдельные `POST` эндпоинты, не через `PATCH` отдельного элемента.
2. `display_order` может находиться исключительно в диапазоне `1 <= display_order <= len(elements)`.
3. `display_order` НЕ передаётся явно в OutDto — frontend вычисляет его самостоятельно по позиции элемента в списке ответа.
4. Frontend посылает в reorder-эндпоинт **только список изменений**, не весь список:
   ```json
   [{"id": "UUID", "order": 3}, ...]
   ```
   Алгоритм: элемент встаёт на место `order`; если место занято — другие элементы сдвигаются на 1; значения всегда остаются в диапазоне `1..N`.
5. При создании нового элемента или добавлении в список — элемент автоматически встаёт на последнее место (`display_order = MAX + 1`).
6. При удалении элемента из группы/списка — оставшиеся перенумеровываются явно (`1..N`).
7. Для обхода UNIQUE constraint при bulk-обновлении обязательно применять двухфазное обновление:
   - Фаза 1: сбросить все затронутые `display_order` в `NULL` + `flush()`.
   - Фаза 2: присвоить новые финальные значения + `flush()`.
   Это безопасно только если колонка объявлена `nullable=True`, а уникальный индекс создан как `partial index WHERE display_order IS NOT NULL`.

---

## 12. Поиск по тексту

Все текстовые фильтры (поиск по подстроке в `name`, `snippet`, `content` и любом другом текстовом поле) **обязаны** использовать регистронезависимое сопоставление через PostgreSQL-оператор `~*`.

### Правила

1. **Всегда `~*`, никогда `LIKE`/`ILIKE`/`=`.** `~*` — регистронезависимая регулярка в PostgreSQL. Использование `ILIKE` или `=` запрещено для фильтров поиска по тексту.
2. **Пользовательский ввод — подстрока, не якорная регулярка.** Строку пользователя передавать напрямую как паттерн (без добавления `^`/`$`). Это эквивалентно поиску вхождения подстроки с учётом регистра букв.
3. **Экранирование спецсимволов.** Перед передачей в `~*` экранировать метасимволы регулярки (`re.escape(term)` или эквивалент) чтобы точка, скобки и т.п. воспринимались как литералы, а не операторы регулярки.
4. **Место реализации — репозиторий.** Построение SQL-условия `column ~* :term` живёт в `repositories/`, сервис передаёт уже распарсенный строковый параметр.
5. **Пустая строка / None — без фильтра.** Если параметр поиска `None` или пустая строка — условие не добавляется, возвращаются все записи.

### Пример реализации в репозитории

```python
import re

if name_query:
    safe = re.escape(name_query)
    stmt = stmt.where(table.c.name.op("~*")(safe))
```

### Запрет

- Запрещено использовать `LIKE`, `ILIKE`, `contains()`, `like()` для текстовых фильтров.
- Запрещено передавать неэкранированный ввод пользователя в `~*` без `re.escape`.
- Запрещено делать поиск регистрозависимым (использовать `~` вместо `~*`).

---

## 13. Протокол завершения работы

После завершения верни Router path-scoped diff, список выполненных OpenSpec task IDs, результаты проверок, миграции и access-policy выводы. Не создавай отдельный формальный Quality Gate report: Router запускает один общий Quality Gate после всех профильных исполнителей.

## Обязательные проверки перед передачей на Quality Gate

Выполни из директории назначенного Python core-сервиса:

```bash
make format
make test
make lint
```

Все три команды должны завершиться без ошибок.
Если хотя бы одна падает — исправить до передачи на QG.
Не передавать diff на Quality Gate при наличии ошибок в этих командах.

Когда задача выполнена, сообщи следующее:

```text
Backend готов
Сервис: services/backend
Изменены файлы: <список>
Тесты: <запускались/не запускались и почему>
Миграции: <да/нет>
make format: чисто / <ошибки>
make test:   X passed, 0 failed / <ошибки>
make lint:   чисто / <ошибки>
Quality Gate: diff готов / есть блокеры
```

---


---

## 14. NATS Jetstream

### Общие правила

1. **Всегда используй Dependency Injection** для NATS компонентов. **НЕ храните контейнер в `app.state`!**
2. **Настройки NATS** должны быть в отдельном классе `NatsSettings` с префиксом `NATS_`.
3. **Контейнер DI** должен быть в `src/containers/application.py`.
4. **Контейнер создаётся как модульный singleton** в `containers/__init__.py`.

### Структура NATS компонентов

```
src/
├── clients/
│   └── nats/
│       ├── __init__.py
│       ├── client.py          # NatsJetstreamClient
│       └── publisher.py       # NatsEventPublisher, CallbackRequestEventPublisher
├── containers/
│   ├── __init__.py            # container = ApplicationContainer()
│   └── application.py         # ApplicationContainer
├── core/
│   └── schemas/
│       └── messaging/
│           ├── __init__.py
│           ├── base_event_data.py
│           ├── callback_requested.py
│           └── event.py
└── depends/
    ├── utils.py               # get_nats_client (импортирует container)
    └── publishers.py          # get_callback_request_event_publisher (импортирует container)
```

### Dependency Injection

```python
# containers/application.py
from dependency_injector import containers, providers

from clients.nats import NatsJetstreamClient
from clients.nats.publisher import CallbackRequestEventPublisher
from settings import nats_settings as nats_settings_instance


class ApplicationContainer(containers.DeclarativeContainer):
    nats_settings = providers.Object(nats_settings_instance)

    nats_client = providers.Singleton(
        NatsJetstreamClient,
        settings=nats_settings,
    )

    callback_request_event_publisher = providers.Singleton(
        CallbackRequestEventPublisher,
        client=nats_client,
        settings=nats_settings,
    )
```

```python
# containers/__init__.py
from .application import ApplicationContainer

# Создаём модульный singleton
container = ApplicationContainer()
```

### Использование в main.py

```python
# main.py
from containers import container  # Импортируем готовый экземпляр

@asynccontextmanager
async def lifespan(_: FastAPI):
    nats_client = container.nats_client()
    
    await nats_client.connect()
    await nats_client.setup()
    
    try:
        yield
    finally:
        await nats_client.close()


app = FastAPI(lifespan=lifespan)
```

### Получение зависимостей

```python
# depends/utils.py
from containers import container  # Импортируем модульный singleton

async def get_nats_client() -> NatsJetstreamClient:
    return container.nats_client()


# depends/publishers.py
from containers import container

def get_callback_request_event_publisher() -> CallbackRequestEventPublisher:
    return container.callback_request_event_publisher()
```

### Publishing событий

```python
# clients/nats/publisher.py
class CallbackRequestEventPublisher(NatsEventPublisher):
    async def publish(self, *, payload: CallbackRequestedData, equestrian_id: UUID) -> UUID:
        event = MessagingEvent(
            event_subject=self._settings.nats_subject_callback_requested,
        )
        await self._publish_event(
            event=event,
            payload=payload,
            headers={"X-Equestrian-Id": str(equestrian_id)},
        )
        return event.event_id
```

### Конфигурация NATS

```python
# settings.py
class NatsSettings(BaseSettings):
    nats_servers_raw: str = Field(default="nats://localhost:4222", alias="NATS_SERVERS")
    nats_stream_site_events: str = Field(default="SITE_EVENTS", alias="NATS_STREAM_SITE_EVENTS")
    nats_subject_callback_requested: str = Field(
        default="events.site.callback.requested",
        alias="NATS_SUBJECT_CALLBACK_REQUESTED",
    )
    # ... другие настройки с префиксом NATS_
```

### Запреты

- **НЕ** храните контейнер в `app.state`.
- **НЕ** создавайте новый экземпляр контейнера в каждом Depends.
- **НЕ** используйте настройки NATS без префикса `NATS_`.
- **НЕ** храните настройки NATS в общем классе `Settings`.

### Документация

Подробная документация по протоколам NATS Jetstream: `agents/howto/nats-jetstream-protocols.md`

---

## 15. Celery и Redis

### Общие правила

1. **Используй Dependency Injection** для Celery app. **НЕ создавайте глобальный celery_app вне DI!**
2. **Настройки Celery** должны быть в отдельном классе `CelerySettings` с префиксом `CELERY_`.
3. **DI-контейнер** регистрирует `celery_app` как `providers.Singleton`.
4. **Задачи Celery** определяются в `src/workers/tasks/` с отдельным файлом на домен.
5. **Нумерация БД Redis** — сверяйся с `agents/redis-databases.yaml` при добавлении нового сервиса.

### Добавление нового сервиса с Celery/Redis

При добавлении нового сервиса, использующего Celery:

1. Обнови `agents/redis-databases.yaml` — добавь 2 записи (broker + backend) с новыми номерами БД.
2. Обнови `agents/howto/celery-protocols.md` — добавь сервис в таблицу «Сервисы и их очереди».
3. Создай `CelerySettings` в `settings.py` сервиса по шаблону из протокола.
4. Добавь переменные в `.env.example` сервиса.
5. Зарегистрируй celery_app в DI-контейнере.
6. Добавь celery-worker в docker-compose.

### Протокол

Подробная документация по протоколам Celery: `agents/howto/celery-protocols.md`

### Учёт БД Redis

Актуальный реестр номеров БД Redis: `agents/redis-databases.yaml`

---

## 16. Сервисные эндпоинты

### Концепция

Сервисные эндпоинты — это API для межсервисного взаимейства внутри экосистемы EqSiteCMS. Они изолированы от пользовательских endpoint'ов (cookie/equestrian key) и используют отдельный механизм авторизации.

### Авторизация: X-Service-Key

Все сервисные эндпоинты требуют валидный `X-Service-Key` header:

```python
# depends/services.py
async def get_service_context(
    x_service_key: str = Header(..., alias="X-Service-Key"),
    settings: Settings = Depends(get_settings),
) -> ServiceContext:
    if not hmac.compare_digest(x_service_key, settings.service_key):
        raise InvalidServiceKey()
    return ServiceContext()
```

### Префикс и изоляция

Сервисные эндпоинты регистрируются на отдельном `APIRouter` с префиксом `/api/service`:

```python
# main.py
service_router = APIRouter(prefix="/api/service", tags=["service"])
service_router.include_router(service_users_router)

app.include_router(service_router)
```

- Префикс `/api/service/` гарантирует изоляцию от пользовательских endpoint'ов (`/api/v1/...`).
- Cookie-сессии и equestrian key **не влияют** на сервисные эндпоинты.
- X-Service-Key — единственный способ авторизации для сервисных endpoint'ов.

### Пример использования

```python
# GET /api/service/users — получение пользователей для межсервисного взаимодействия
@router.get("/users", response_model=PaginatedEntities[UserOutDto])
async def get_service_users(
    filters: ServiceUserFilters = Depends(get_service_user_filters),
    pagination: PaginationParams = Depends(get_service_pagination_params),
    _: ServiceContext = Depends(get_service_context),
    user_service: UserService = Depends(get_user_service),
) -> PaginatedEntities[UserOutDto]:
    return await user_service.get_users_paginated(
        equestrian_ids=filters.equestrian_ids,
        equestrian_service_keys=filters.equestrian_service_keys,
        roles=filters.roles,
        limit=pagination.limit,
        offset=pagination.offset,
    )
```

---

## 17. Пагинация сервисных эндпоинтов

### Параметры

Сервисные эндпоинты поддерживают пагинацию через `limit` и `offset`:

| Параметр | Тип  | Default | Ограничения |
| -------- | ---- | ------- | ----------- |
| `limit`  | int  | 100     | 1–5000      |
| `offset` | int  | 0       | ≥ 0         |

### Dependency

```python
# depends/services.py
async def get_service_pagination_params(
    limit: int = Query(100, ge=1, le=5000),
    offset: int = Query(0, ge=0),
) -> PaginationParams:
    return PaginationParams(limit=limit, offset=offset)
```

### Формат ответа PaginatedEntities[T]

Все пагинированные сервисные ответы возвращают единообразную структуру:

```python
from pydantic import BaseModel, Generic, TypeVar

T = TypeVar("T")

class PaginatedEntities(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int
```

Пример JSON-ответа:

```json
{
  "items": [
    {"id": "...", "username": "...", "email": "..."}
  ],
  "total": 42,
  "limit": 100,
  "offset": 0
}
```

---

## 18. HTTP-клиенты в микросервисах

### Структура папки `clients/`

Каждый микросервис, обращающийся к другим сервисам, хранит HTTP-клиенты в директории `clients/`:

```
services/<microservice>/
├── clients/
│   ├── __init__.py
│   ├── main_backend.py      # Клиент к backend-сервису
│   └── exceptions.py        # Кастомные исключения клиентов
├── ...
```

### Паттерн клиента на aiohttp

```python
# clients/main_backend.py
import aiohttp
from clients.exceptions import MainBackendConnectionError, MainBackendResponseError

class MainBackendClient:
    def __init__(self, base_url: str, service_key: str, timeout: float = 10.0):
        self._base_url = base_url.rstrip("/")
        self._service_key = service_key
        self._timeout = aiohttp.ClientTimeout(total=timeout)

    async def get_users(
        self,
        *,
        equestrian_ids: list[str] | None = None,
        equestrian_service_keys: list[str] | None = None,
        roles: list[str] | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        params = {"limit": limit, "offset": offset}
        if equestrian_ids:
            params["equestrian_ids"] = ",".join(equestrian_ids)
        if equestrian_service_keys:
            params["equestrian_service_keys"] = ",".join(equestrian_service_keys)
        if roles:
            params["role"] = ",".join(roles)

        try:
            async with aiohttp.ClientSession(timeout=self._timeout) as session:
                async with session.get(
                    f"{self._base_url}/api/service/users",
                    params=params,
                    headers={"X-Service-Key": self._service_key},
                ) as resp:
                    if resp.status != 200:
                        raise MainBackendResponseError(
                            status=resp.status, body=await resp.text()
                        )
                    return await resp.json()
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            raise MainBackendConnectionError(str(e)) from e
```

### Обработка ошибок

| Исходная ошибка                                  | Маппинг                     | HTTP-код ответа |
| ------------------------------------------------ | --------------------------- | --------------- |
| `aiohttp.ClientError` (сеть, DNS, соединение)    | `MainBackendConnectionError` | **500**         |
| `asyncio.TimeoutError`                           | `MainBackendConnectionError` | **500**         |
| HTTP 4xx/5xx от backend                          | `MainBackendResponseError`  | **500**         |

> **Важно:** Микросервис не проксирует статусы backend потребителю. Все ошибки межсервисного взаимодействия возвращаются клиенту как **500 Internal Server Error**. Детали ошибки логируются, но не раскрываются внешним вызывающим.

### Кастомные исключения

```python
# clients/exceptions.py
class MainBackendConnectionError(Exception):
    """Ошибка соединения с backend-сервисом."""

class MainBackendResponseError(Exception):
    def __init__(self, status: int, body: str):
        self.status = status
        self.body = body
        super().__init__(f"Backend returned {status}: {body}")
```

---

## 19. ENV-переменные для межсервисного взаимодействия

### Backend-сервис

| Переменная     | Описание                                      | Пример                              |
| -------------- | --------------------------------------------- | ----------------------------------- |
| `SERVICE_KEY`  | Ключ для валидации X-Service-Key в запросах   | `sk_live_random_generated_value`    |

```bash
# services/backend/.env.example
SERVICE_KEY=           # Required: сгенерировать случайный ключ ≥ 32 символа
```

### Микросервисы (notification-service, email-service и др.)

| Переменная                | Описание                                  | Пример                      |
| ------------------------- | ----------------------------------------- | --------------------------- |
| `MAIN_BACKEND_URL`        | Base URL backend-сервиса                  | `http://backend:8000`       |
| `MAIN_BACKEND_SERVICE_KEY`| Service key для авторизации к backend     | `sk_live_same_as_backend`   |

```bash
# services/notification-service/.env.example
MAIN_BACKEND_URL=          # Required: URL backend-сервиса
MAIN_BACKEND_SERVICE_KEY=  # Required: SERVICE_KEY из backend

# services/email-service/.env.example
MAIN_BACKEND_URL=          # Required: URL backend-сервиса
MAIN_BACKEND_SERVICE_KEY=  # Required: SERVICE_KEY из backend
```

### Правила именования ENV-переменных

Для каждого нового микросервиса, обращающегося к другим сервисам:

```
<SERVICE_NAME>_URL           — base URL целевого сервиса
<SERVICE_NAME>_SERVICE_KEY   — service key для авторизации
```

Примеры:

| Микросервис            | Переменные                                         |
| ---------------------- | -------------------------------------------------- |
| `notification-service` | `NOTIFICATION_SERVICE_URL`, `NOTIFICATION_SERVICE_KEY` |
| `email-service`        | `EMAIL_SERVICE_URL`, `EMAIL_SERVICE_KEY`           |
| `payment-service`      | `PAYMENT_SERVICE_URL`, `PAYMENT_SERVICE_KEY`       |

> **Примечание:** `MAIN_BACKEND_URL` и `MAIN_BACKEND_SERVICE_KEY` используются микросервисом только для вызова service API главного backend. Private peer-to-peer вызовы не получают симметричный `<SERVICE>_KEY` по умолчанию.

## Email owner boundary и private peers

- Email create/update/delete доступны только владельцу; ADMIN/SUPERUSER не обходят owner check. Foreign denial выполняется до lookup и downstream-вызова.
- Anonymous → `401`, foreign → `403`, owner missing → `404`; malformed UUID/body, invalid email и ожидаемая доменная валидация → `400`.
- Create того же normalized email идемпотентен (`201`, одна запись, confirmed/approved сохраняются); другой email существующего owner → `409`. Send-confirmation/confirm публичны.
- Private backend→peer вызовы внутри выделенной Docker network не передают peer credential. `X-Service-Key` применяется только в направлении microservice→backend для `/api/service/*`; это направление нельзя удалять или разворачивать.
