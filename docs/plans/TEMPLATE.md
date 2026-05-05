# План: <название задачи>

**Тикет:** NEX-XXX
**Дата:** YYYY-MM-DD
**Затронутые сервисы:** services/be, services/fe, ...
**Ветка:** feature/NEX-XXX-slug

---

## Контекст

<Краткое описание текущего состояния и зачем нужны изменения.
Что сейчас не работает / чего не хватает?>

## Цель

<Что должно работать после реализации. Критерий приёмки.>

---

## Детали реализации

### Backend

#### Новые сущности и файлы

| Что | Путь | Описание |
|---|---|---|
| Доменная модель | `app/domain/models/job.py` | `class Job(BaseModel)` |
| Command | `app/application/commands.py` | `class CreateJobCommand` |
| Service | `app/application/services/job_service.py` | |
| Repository | `app/infrastructure/persistence/job_repository.py` | |
| API router | `app/interfaces/api/routes/job.py` | `POST /jobs` |

#### API контракт

```
POST /api/v1/jobs
Authorization: Bearer <token>
Body: {
  "title": "string",
  "user_id": "uuid"
}
Response 201: {
  "id": "uuid",
  "title": "string",
  "created_at": "datetime"
}
```

#### Схема БД (если нужна миграция)

```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Frontend

#### Новые компоненты и файлы

| Что | Путь | Описание |
|---|---|---|
| Фича | `src/features/job-creation/` | Форма создания |
| API | `src/shared/api/jobs.ts` | `createJob()` |
| Страница | `src/app/(dashboard)/jobs/page.tsx` | |

---

## Порядок выполнения

1. Backend: модель → репозиторий → сервис → роутер → тесты
2. Frontend: API-слой → хук → компонент → страница → тесты

---

## Чеклист

> ⚠️ Этот раздел используется агентами для отслеживания прогресса.
> Агент обязан менять `[ ]` → `[x]` после выполнения каждого пункта.
> Оркестратор парсит именно этот раздел.

### Backend

- [ ] Создать `app/domain/models/job.py` с доменной моделью `Job`
- [ ] Добавить `JobNotFoundError` в `app/domain/exceptions.py`
- [ ] Добавить `CreateJobCommand` в `app/application/commands.py`
- [ ] Создать `IJobService` в `app/application/interfaces/services.py`
- [ ] Создать `app/application/services/job_service.py`
- [ ] Создать SQLAlchemy-модель `app/infrastructure/persistence/models/job.py`
- [ ] Создать `app/infrastructure/persistence/job_repository.py`
- [ ] Зарегистрировать в `app/core/di/containers.py`
- [ ] Создать роутер `app/interfaces/api/routes/job.py`
- [ ] Подключить роутер в `app/interfaces/api/routes/router.py`
- [ ] Зарегистрировать `JobNotFoundError` в `app/core/exception_handlers.py`
- [ ] Создать миграцию: `make migrations-create MSG="add jobs table"`
- [ ] Написать unit-тест `tests/unit/test_job_service.py`
- [ ] Написать integration-тест `tests/integration/test_job_routes.py`

### Frontend

- [ ] Создать `src/shared/api/jobs.ts` с функцией `createJob()`
- [ ] Создать фичу `src/features/job-creation/` (ui + model)
- [ ] Написать хук `useJobCreation.ts`
- [ ] Создать страницу `src/app/(dashboard)/jobs/page.tsx`
- [ ] Написать тест `features/job-creation/model/useJobCreation.test.ts`

### Quality Gate

- [ ] Проверить соответствие архитектуре Clean Architecture (backend)
- [ ] Проверить соответствие FSD (frontend)
- [ ] Убедиться что `make test` проходит без ошибок
- [ ] Убедиться что `make lint` чист
- [ ] Проверить наличие тестов для нового кода
- [ ] Проверить отсутствие секретов в коде
- [ ] Проверить API контракт на соответствие плану
