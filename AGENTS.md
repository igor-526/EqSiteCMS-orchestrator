# Архитектура Агентов (AGENTS.md)

Ты находишься в монорепозитории проекта **EqSiteCMS**.
Здесь применяется мультиагентная система разработки.

---

## Определение роли

**Если тебе назначена профильная роль** (persona DSH preset, задание Router, prompt lane Quality Gate):

- Работай по `agents/<role>.md` (Planner / Backend / Frontend / Site Consumer / Quality Gate).
- `agents/router.md` не читай: это Router-специфичное, а не часть профильных правил.

**Если роль не назначена и ты верхнеуровневый агент** — ты Router:

- **Прочитай `agents/router.md` целиком** до любого ответа.
- Если ты запущен в DSH-сессии с preset `eqsite-router`, `agents/router.md` уже в твоём system prompt — не перечитывай.

---

## Ownership и декомпозиция

- Один файл, spec или tightly-coupled зона получает одного владельца. Пересекающиеся задания выполняются последовательно.
- Ownership отвечает на вопрос «кто имеет право менять файлы». Он **не** задаёт объём одного запуска агента — для этого есть execution unit.
- Исполнитель читает `contextFiles` своего execution unit, меняет только назначенные пути, сразу отмечает только фактически выполненные OpenSpec tasks и возвращает Router handoff.

---

## Декомпозиция: Deliverable → Execution Unit

Иерархия обязательна и не сворачивается:

```text
OpenSpec Change → Deliverable (ownership) → Execution Unit (одна агентная сессия) → Agent invocation
```

- **Deliverable** отвечает на вопрос «кто владеет какими файлами и specs». Границы — ownership correctness.
- **Execution Unit** отвечает на вопрос «сколько работы один экземпляр агента выполняет прежде, чем вернуть управление Router». Границы — execution boundedness.
- Один deliverable может состоять из нескольких execution units **одного профиля**: `BE-1`, `BE-2`, `BE-3` — три последовательных запуска Backend-агента с общим ownership. Это не нарушает правило «одна tightly-coupled зона — один владелец»: меняется только lifetime execution context.
- Секция `### Backend`, `Deliverable A` или ownership вида `services/vk-service/**` — **не** единица делегирования. Router делегирует execution unit.

`services/vk-service/**` — хороший ownership boundary и плохой execution boundary. Владеть всем сервисом может один профиль, но реализовать весь сервис за один invocation он не должен.

### Бюджет execution unit (circuit breaker, а не точные числа)

Один execution unit — это:

- один сервис **или** один архитектурный slice (schema/storage, repository/domain, API/access control, интеграция, тесты, live verification);
- примерно **8–12 существенных действий** (новый/переписанный файл, миграция, endpoint, интеграция; правка импорта или переименование не считаются);
- **одна группа verification** (например `make test` в одном сервисе или один smoke-прогон);
- один результат, который проверяется и сдаётся независимо от остальных units.

Если хотя бы один критерий нарушен, unit делится **до** делегирования. Это эвристика-предохранитель, а не точная метрика.

---

## Checkpoint и handoff между execution units (обязательно)

Агент завершает execution unit так:

1. Выполняет только назначенные task IDs.
2. Запускает verification, относящуюся **к этому unit**, а не весь набор проверок change.
3. Отмечает в OpenSpec `tasks.md` только фактически выполненные checkbox.
4. Возвращает Router короткий handoff и **останавливается**.

Обязательный формат handoff — короткий, без пересказа плана и без дублирования diff:

```text
Unit: <ID> — <название> | Профиль: <Backend/Frontend/Site Consumer/Quality Gate> | Статус: done / partial / blocked
Изменённые файлы: <пути от корня монорепозитория>
Verification: <команда → результат>
Отмеченные tasks: <IDs>
Решения: <только влияющие на следующие units; 1–3 строки>
Остаток: <что не сделано и почему; предложение по split, если нужно>
```

Router не начинает следующий unit, не прочитав handoff предыдущего. Handoff — основной канал передачи контекста между units: следующий агент стартует со свежим контекстом и не восстанавливает состояние по diff и не перечитывает работу предыдущего.

---

## Circuit breaker исполнителя (обязательно)

Если агент после чтения задания видит, что unit не помещается в бюджет, он **не** доводит его героически до конца. Он:

1. Выполняет безопасную атомарную часть.
2. Отмечает только реально выполненные tasks.
3. Возвращает Router handoff со статусом `partial` и предложением split вида `BE-3 → BE-3a + BE-3b` с границами, ownership и зависимостями.

---

## API Access Policy (обязательно)

Это единый контракт для всех агентов и сервисов EqSiteCMS.

### Дефолтная матрица доступа

- `GET` — **Public Read** (доступно без авторизации), чтобы сайты-потребители (например, `site-ad`) могли читать данные.
- `POST` / `PATCH` / `DELETE` — **Protected Write** (требуют авторизацию и проверку прав) для администрирования в CMS.

### Исключения из дефолта

Исключения допускаются только при явной фиксации в OpenSpec access matrix и ревью:

- Auth endpoints (например, `POST /auth/login`) могут быть публичными.
- Чувствительные `GET` (профиль, приватные настройки, служебные данные) могут быть защищенными.
- Любое исключение должно иметь причину, ожидаемые HTTP-статусы без/с авторизацией и тесты.

Для каждого нового или изменённого endpoint proposal/specs обязаны содержать матрицу `method | path | access class | roles | expected without auth | expected with auth` и связанные anonymous/authenticated тесты. Planner задаёт контракт, профильный исполнитель реализует его, Quality Gate сверяет матрицу, права на чужие ресурсы и все исключения.

Tenant selector является non-secret identity hint: missing/invalid selector возвращает `401`. Для email create/update/delete действует owner-only без role override; send-confirmation/confirm остаются явными public POST exceptions. Эти outcomes раскрываются отдельными строками access matrix.

### Обязательная проверка во всех этапах

- Planner: формирует access matrix по endpoint'ам.
- Backend/Frontend: реализуют поведение строго по access-классу endpoint'а.
- Quality Gate: отдельно проверяет anonymous и authenticated поведение.

---

## Howto инструкции

В папке `agents/howto/` находятся детальные инструкции и протоколы по работе с конкретными технологиями. Эти инструкции загружаются агентами только при необходимости:

- `nats-jetstream-protocols.md` — протоколы работы с NATS Jetstream (используется Backend и Quality Gate)
- `site-ksk-inlove-design.md` — обязательный дизайн-протокол Site Consumer при работе с `services/site-ksk-inlove/**`; подключает точечное чтение схемы, каталога компонентов и визуальной спецификации INLOVE
- `context-economy-patterns.md` — **обязательные** паттерны экономии контекста для предотвращения превышения лимита 200K токенов; читается Router перед каждым делегированием (см. `agents/router.md`)
- `browser-qa-protocol.md` — автономный протокол `QG-FE-AUTO` и `QG-FE-MANUAL`; используется Quality Gate при наличии UI diff
- `.agents/skills/stack-control` — управление и диагностика Docker-стека через `scripts/stackctl`; обязателен для `QG-ENV`, `QG-LIVE` и browser QA
- `.agents/skills/ui-qa` — scripted Playwright, evidence и визуальная инспекция для `QG-FE-MANUAL`
- `.agents/skills/task-finalize` — фінализация задачи после `QG-SYNTH = APPROVED`: `stackctl ready`, `shipctl plan/merge/release/ci`, approval gates
- Playwright MCP предоставляет `mcp__pw__browser_*` для exploratory debugging и поиска селекторов; он дополняет, но не заменяет scripted evidence

Агенты загружают эти howto/skills только когда задача требует соответствующей технологии.

---

## SEO Services

Модуль SEO-аналитики строится на архитектуре с разделением ответственности между оркестратором и специализированными парсерами. Все сервисы взаимодействуют через NATS Jetstream и Celery.

### Правило для Backend-агента

При работе с `services/seo-service/**` Backend-агент обязан:

- Прочитать **[docs/seo/](docs/seo/)** для понимания архитектуры, ролей сервисов и протоколов взаимодействия.
- Следовать контрактам NATS stream `SEO_TASKS` и Celery задач, описанным в **[docs/seo/protocols.md](docs/seo/protocols.md)**.
- Соблюдать границы ответственности: `seo-service` отвечает **только** за постановку задач; результаты парсинга остаются в парсерах и не возвращаются обратно в оркестратор.
- Использовать **[agents/howto/nats-jetstream-protocols.md](agents/howto/nats-jetstream-protocols.md)** и **[agents/howto/celery-protocols.md](agents/howto/celery-protocols.md)** для правильной реализации интеграций.

### Правило для Quality Gate

При проверке изменений в SEO-сервисах Quality Gate обязан:

- Проверить соответствие NATS/Celery протоколам из **[agents/howto/nats-jetstream-protocols.md](agents/howto/nats-jetstream-protocols.md)** и **[agents/howto/celery-protocols.md](agents/howto/celery-protocols.md)**.
- Убедиться, что NATS messages соответствуют формату из **[docs/seo/protocols.md](docs/seo/protocols.md)** (обязательные поля: `task_id`, `site_id`, `params`, `trace_id`).
- Запустить smoke-тесты NATS и Celery интеграций для проверки корректности подключения и обработки сообщений.
- Проверить, что границы ответственности соблюдены: `seo-service` публикует задачи в NATS, но **не** получает результаты обратно.

### Архитектурные документы

- **[docs/seo/architecture.md](docs/seo/architecture.md)** — общая архитектура SEO-модуля, диаграммы взаимодействия
- **[docs/seo/services.md](docs/seo/services.md)** — описание seo-service как оркестратора и будущих парсеров
- **[docs/seo/protocols.md](docs/seo/protocols.md)** — контракты NATS и Celery, примеры JSON payloads

---

## Контекст проекта

Перед маршрутизацией убедись, что понимаешь задачу. Ключевые документы:

- **[SERVICES.md](SERVICES.md)** — архитектура сервисов, стек, инфраструктура
- **[README.md](README.md)** — быстрый старт, команды
- **[services.manifest](services.manifest)** — список микросервисов и их репозиториев

Описание сервисов, их ролей и границ контуров (`services/backend`, `services/frontend`, `services/site-ad`) веди централизованно в **[SERVICES.md](SERVICES.md)**.
В `AGENTS.md` не дублируй сервисный каталог и бизнес-описания сервисов.
