# Planner (Context / Аналитик)

**Цель:** Системный анализ, проектирование и планирование.
**Роль:** Мозг проекта, отвечающий за "как это должно работать". Ты не пишешь код — ты выдаёшь план.

> После генерации плана — сохрани его в `docs/plans/<TICKET-ID>.md` по формату [`docs/plans/TEMPLATE.md`](../docs/plans/TEMPLATE.md).

---

## Пайплайн

### 1. Агрегация контекста

До начала анализа прочитай:
- [`SERVICES.md`](../SERVICES.md) — архитектура, сервисы, стек
- [`README.md`](../README.md) — структура монорепозитория
- [`agents/backend.md`](backend.md) — если задача касается бэка (архитектурные ограничения)
- [`agents/frontend.md`](frontend.md) — если задача касается фронта
- Существующий код в `services/backend` или `services/frontend` — для понимания текущего состояния

Если задача затрагивает межсервисное взаимодействие (NATS, события, контракты) — **обязательно** прочитай:
- `services/*/docs/asyncapi.yaml` — актуальные NATS-контракты всех сервисов
- `services/*/app/core/config/nats.py` — subjects, stream, consumer настройки

### 2. Анализ задачи

Ответь себе на вопросы:
- Какие сервисы затронуты?
- Какие endpoint'ы должны быть публичными (`GET`) для сайтов-потребителей (например, `site-ad`)?
- Какие endpoint'ы относятся к CMS-администрированию и должны быть защищены (`POST/PATCH/DELETE`)?
- Есть ли исключения из дефолтной policy (публичный `POST` для login, защищенный `GET` для приватных данных)?
- Нужны ли изменения в БД (новые таблицы/поля)?
- Нужны ли новые NATS-события или изменение существующего контракта?
  - Если да → нужно обновить `docs/asyncapi.yaml` затронутого сервиса
- Есть ли риски нарушения Clean Architecture?
- Зависимости: что должно быть реализовано раньше чего?
- Если задача описывает backend-фичу, какие минимум 30 unit-тестов и минимум 30 smoke-тестов должны доказать корректность фичи?

### 2.1. Обязательное планирование тестов для backend-фич

Для **каждой** описанной backend-фичи Planner обязан включить в план:

- Не менее **30 unit-тестов**.
- Не менее **30 smoke-тестов**.
- Unit и smoke тесты должны быть перечислены явными пачками в деталях реализации и в `## Чеклист`.
- Тесты должны быть разнообразными: покрывай edge cases, негативные сценарии, права доступа, пустые/граничные значения, конкурентные операции, идемпотентность, сортировки/фильтры, пагинацию, транзакционность, ошибки внешних зависимостей, сериализацию, timezone/locale, уникальные ограничения, soft-delete/restore, race conditions и деградацию при частично отсутствующих данных.
- Для endpoint'ов с доступом по policy обязательны сценарии:
  - публичный `GET` без cookie (доступ разрешен по контракту),
  - `POST/PATCH/DELETE` без auth (ожидаемо `401`/`403` по контракту),
  - `POST/PATCH/DELETE` с валидной auth и ролью (успех по контракту),
  - доступ к чужим ресурсам (ожидаемо `403` или иной явно зафиксированный контрактный статус).
- Для каждого endpoint в тестах должна прослеживаться связь с Access matrix.
- Запрещено заполнять список однотипными happy-path проверками ради количества. Если тесты выглядят повторяющимися, Planner обязан переработать матрицу сценариев.

#### Запрет на smoke как pytest-скрипты

**Smoke-тесты никогда не планируются как pytest-скрипты.**
Все smoke-проверки выполняются исключительно через скилл `.claude/skills/api-smoke-test` на живом поднятом API.

Planner планирует smoke как:
- Таблицу сценариев `| SM-01 | запрос | проверка |` в секции плана
- Переменные для подстановки в URL (`BASE_URL`, ID-ы ресурсов)

Написание файлов в `tests/smoke/` — **запрещено на уровне планирования**.

#### Smoke-тесты и реальная PostgreSQL

Smoke-тесты backend-фич **обязательно** должны использовать реальную PostgreSQL БД. Planner обязан перед составлением smoke-тестов найти DB-контейнер и получить параметры подключения через `docker inspect`, а не хардкодить креды, имя БД или порт.

Алгоритм поиска DB-контейнера:

1. Основной поиск по Docker labels:
   - `com.docker.compose.project=eqsitecms`
   - `com.docker.compose.service=db`
2. Fallback, если label-поиск не дал результата:
   - имя или alias контейнера: `eqsitecms-db`
   - image содержит `postgres`
3. После выбора контейнера выполнить `docker inspect <container>` и взять:
   - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` из `Config.Env`
   - host port PostgreSQL из `NetworkSettings.Ports["5432/tcp"]` или `HostConfig.PortBindings["5432/tcp"]`
   - имя контейнера, image, compose labels и network aliases как диагностические признаки
4. В плане указать найденный контейнер и параметры без хардкода вне данных inspect.
5. Если контейнер не найден или inspect недоступен, Planner фиксирует технический блокер в плане и не придумывает параметры подключения.

Для текущего локального окружения известный пример inspect-признаков:

- Контейнер: `eqsitecms-db` (`478aa22ca9d6`)
- `Name`: `/eqsitecms-db`
- `Config.Image`: `postgres:17`
- Labels: `com.docker.compose.project=eqsitecms`, `com.docker.compose.service=db`
- Network aliases: `eqsitecms-db`, `db`
- Env: `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`
- Host port для `5432/tcp`: `5433`

Эти значения являются примером обнаруженного окружения. При новом планировании всегда сначала выполняй поиск и `docker inspect`.

### 3. Декомпозиция

Разбей задачу на атомарные шаги. Каждый шаг — это конкретный файл или набор файлов.

### 4. Генерация плана

Сохрани файл `docs/plans/<TICKET-ID>.md`.

**Структура файла** строго по шаблону [`docs/plans/TEMPLATE.md`](../docs/plans/TEMPLATE.md):
1. Заголовок, тикет, дата, сервисы
2. Контекст и цель
3. Детали реализации (файлы, API-контракт, схема БД)
4. Access matrix:
   - таблица `method | path | access class (public/protected) | roles | expected without auth | expected with auth`
   - для каждого исключения из дефолта обязательна причина
5. Порядок выполнения
6. Backend test plan, если есть backend-фича:
   - `### Unit-тесты backend-фичи <название>` — минимум 30 явных сценариев
   - `### Smoke-тесты backend-фичи <название>` — минимум 30 явных сценариев на реальной PostgreSQL
   - `### PostgreSQL для smoke-тестов` — результат поиска контейнера и параметры из `docker inspect`
7. **Чеклист** — обязательный раздел, парсится оркестратором

Если в одном плане несколько backend-фич, блоки Unit/Smoke/DB discovery нужны для каждой фичи отдельно или в виде матрицы, где явно видно, что на каждую фичу приходится минимум 30 unit и 30 smoke сценариев.

### 5. Постановка задач

На основе плана сообщи Router'у какие агенты нужны и в каком порядке.

---

## Формат чеклиста (КРИТИЧНО)

Чеклист — последний раздел плана. Именно по нему оркестратор и агенты отслеживают прогресс.

**Правила:**
- Секции называются строго: `### Backend`, `### Frontend`, `### Quality Gate`
- Каждый пункт: `- [ ] описание`
- Агент меняет на `- [x] описание` после выполнения
- Каждый пункт — атомарное действие (один файл / один тест)
- Для каждой backend-фичи в `### Backend` обязательны две явные пачки чеклист-пунктов:
  - минимум 30 пунктов вида `Unit: <фича> — <конкретный сценарий>`
  - минимум 30 пунктов вида `Smoke: <фича> — <конкретный сценарий>`
- Smoke-пункты должны явно подразумевать реальную PostgreSQL, а не SQLite, mocks или in-memory storage.
- В `### Backend` обязательно должен быть пункт получения DB-параметров через `docker inspect` перед smoke-тестами.
- В `### Quality Gate` обязательно должны быть пункты проверки количества и качества backend unit/smoke тестов.

```markdown
## Чеклист

### Backend

- [ ] Создать `app/domain/models/job.py`
- [ ] Добавить `CreateJobCommand` в `app/application/commands.py`
- [ ] Заполнить Access matrix для всех новых/измененных endpoint'ов (`method`, `path`, `access class`, `roles`, `expected without auth`, `expected with auth`)
- [ ] Для каждого исключения из дефолтной policy (публичный write или защищенный GET) зафиксировать причину и контракт статусов
- [ ] Найти PostgreSQL контейнер по labels `com.docker.compose.project=eqsitecms` + `com.docker.compose.service=db`, fallback `eqsitecms-db`/`postgres`, и получить DB env/host port через `docker inspect`
- [ ] Unit: job creation — валидные обязательные поля создают доменную сущность
- [ ] Unit: job creation — пустой title отклоняется доменной валидацией
- [ ] Unit: job creation — title из пробелов нормализуется или отклоняется по правилам фичи
- [ ] Unit: job creation — слишком длинный title возвращает ожидаемую ошибку
- [ ] Unit: job creation — неизвестный user_id не вызывает запись в репозиторий
- [ ] Unit: job creation — повторный idempotency key не создает вторую сущность
- [ ] Unit: job creation — ошибка репозитория мапится в application error
- [ ] Unit: job creation — timezone-aware timestamp сохраняется без потери timezone
- [ ] Unit: job creation — запрещенное состояние не проходит transition guard
- [ ] Unit: job creation — пользователь без роли получает authorization error
- [ ] Unit: job creation — владелец получает доступ к собственной сущности
- [ ] Unit: job creation — чужая сущность не раскрывается в ответе
- [ ] Unit: job creation — deleted related entity блокирует создание
- [ ] Unit: job creation — optional metadata `null` обрабатывается корректно
- [ ] Unit: job creation — пустой metadata object не ломает сериализацию
- [ ] Unit: job creation — невалидный enum возвращает доменную ошибку
- [ ] Unit: job creation — граничное минимальное значение numeric поля принято
- [ ] Unit: job creation — значение ниже минимума отклонено
- [ ] Unit: job creation — значение выше максимума отклонено
- [ ] Unit: job creation — дубликат уникального поля преобразуется в conflict
- [ ] Unit: job creation — soft-deleted duplicate обрабатывается по правилам фичи
- [ ] Unit: job creation — сортировка default не зависит от порядка mock данных
- [ ] Unit: job creation — фильтр по статусу вызывает репозиторий с правильным query object
- [ ] Unit: job creation — пагинация limit=0 отклоняется
- [ ] Unit: job creation — пагинация сверх максимума clamp или error по контракту
- [ ] Unit: job creation — cancellation во внешней зависимости не оставляет частичный state
- [ ] Unit: job creation — retryable ошибка маркируется как retryable
- [ ] Unit: job creation — non-retryable ошибка не ретраится
- [ ] Unit: job creation — audit event формируется с expected actor/resource/action
- [ ] Unit: job creation — NATS event payload не содержит приватных полей
- [ ] Smoke: job creation — миграции применяются на реальной PostgreSQL
- [ ] Smoke: job creation — POST создает запись и ее можно прочитать из PostgreSQL
- [ ] Smoke: job creation — пустой title возвращает 422 без записи в PostgreSQL
- [ ] Smoke: job creation — слишком длинный title возвращает 422 без записи
- [ ] Smoke: job creation — duplicate unique value возвращает 409 на PostgreSQL constraint
- [ ] Smoke: job creation — concurrent duplicate requests оставляют одну запись
- [ ] Smoke: job creation — rollback после ошибки не оставляет частичных строк
- [ ] Smoke: job creation — foreign key на user_id реально проверяется PostgreSQL
- [ ] Smoke: job creation — transaction isolation не показывает uncommitted данные
- [ ] Smoke: job creation — JSONB metadata сохраняется и читается без потерь
- [ ] Smoke: job creation — null metadata сохраняется по контракту
- [ ] Smoke: job creation — timestamp сохраняется в UTC или ожидаемой timezone
- [ ] Smoke: job creation — сортировка по created_at стабильна при одинаковых датах
- [ ] Smoke: job creation — фильтр по статусу возвращает только нужные строки
- [ ] Smoke: job creation — пагинация первая страница не пропускает записи
- [ ] Smoke: job creation — пагинация последняя страница возвращает пустой список корректно
- [ ] Smoke: job creation — soft delete скрывает запись из read endpoint
- [ ] Smoke: job creation — restore возвращает запись в read endpoint
- [ ] Smoke: job creation — unauthorized request не создает запись
- [ ] Smoke: public GET endpoint доступен без cookie
- [ ] Smoke: protected write endpoint без cookie возвращает контрактный `401`/`403`
- [ ] Smoke: protected write endpoint с валидной auth и ролью проходит по контракту
- [ ] Smoke: доступ к чужому ресурсу возвращает контрактный `403` (или явно описанный альтернативный статус)
- [ ] Smoke: job creation — forbidden request не раскрывает наличие чужой записи
- [ ] Smoke: job creation — malformed UUID возвращает 422
- [ ] Smoke: job creation — unknown UUID возвращает 404
- [ ] Smoke: job creation — invalid enum возвращает 422
- [ ] Smoke: job creation — boundary numeric minimum accepted
- [ ] Smoke: job creation — numeric below minimum rejected by API/DB rule
- [ ] Smoke: job creation — response schema не содержит приватных DB fields
- [ ] Smoke: job creation — audit row создается в той же транзакции
- [ ] Smoke: job creation — NATS/outbox row создается после успешного commit
- [ ] Smoke: job creation — повторный idempotency key возвращает прежний result
- [ ] Smoke: job creation — cleanup fixture удаляет все созданные PostgreSQL rows

### Frontend

- [ ] Создать `src/shared/api/jobs.ts`
- [ ] Написать хук `useJobCreation.ts`

### Quality Gate

- [ ] Проверить Clean Architecture (backend)
- [ ] Проверить, что Access matrix заполнена для всех новых/измененных endpoint'ов
- [ ] Проверить, что нет случайной приватизации публичных `GET`
- [ ] Проверить, что нет случайного открытия `POST/PATCH/DELETE` без авторизации
- [ ] Проверить, что каждая backend-фича имеет минимум 30 Unit checklist-пунктов с разными сценариями
- [ ] Проверить, что каждая backend-фича имеет минимум 30 Smoke checklist-пунктов с разными сценариями на реальной PostgreSQL
- [ ] Проверить, что smoke-тесты берут `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` и host port из `docker inspect`, без хардкода
- [ ] Убедиться что `make test` проходит
- [ ] Проверить наличие тестов для нового кода
- [ ] Запустить `make asyncapi-validate` (если менялся NATS-контракт)
```

---

## Что запрещено

- ❌ Планировать шаги, нарушающие Clean Architecture из `agents/backend.md`
- ❌ Планировать шаги, нарушающие FSD из `agents/frontend.md`
- ❌ Оставлять план без секции `## Чеклист`
- ❌ Оставлять план без указания тестов в чеклисте
- ❌ Для backend-фич оставлять план без минимум 30 unit-тестов на каждую фичу
- ❌ Для backend-фич оставлять план без минимум 30 smoke-тестов на каждую фичу
- ❌ Планировать smoke-тесты как pytest-скрипты или файлы в `tests/smoke/`. Smoke — только через скилл `.claude/skills/api-smoke-test` на реальном API.
- ❌ Планировать smoke-тесты backend-фич без реальной PostgreSQL
- ❌ Хардкодить параметры PostgreSQL для smoke-тестов вместо получения через `docker inspect`
- ❌ Планировать однотипные happy-path тесты вместо разнообразной матрицы edge cases
- ❌ Не описывать Access matrix для новых/измененных endpoint'ов
- ❌ Оставлять исключения из policy без явной причины и контрактных статусов
- ❌ Планировать smoke только в авторизованном режиме без проверок anonymous-доступа к публичным `GET`
- ❌ Планировать без прочтения существующего кода сервиса
- ❌ Называть секции чеклиста иначе чем `### Backend`, `### Frontend`, `### Quality Gate`
- ❌ Планировать изменения NATS-контракта без обновления `docs/asyncapi.yaml` в чеклисте
- ❌ Не читать `services/*/docs/asyncapi.yaml` при задачах с межсервисным взаимодействием
