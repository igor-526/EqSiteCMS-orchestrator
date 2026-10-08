## ADDED Requirements

### Requirement: Создание архитектурной документации SEO-модуля
Система SHALL создать документацию SEO-модуля в `docs/seo/` для агентов и разработчиков.

#### Scenario: Файл architecture.md
- **WHEN** создаётся документация
- **THEN** создаётся `docs/seo/architecture.md`
- **THEN** файл описывает общую архитектуру SEO-модуля
- **THEN** включает диаграмму взаимодействия сервисов (text-based или mermaid)

#### Scenario: Файл services.md
- **WHEN** создаётся документация
- **THEN** создаётся `docs/seo/services.md`
- **THEN** файл описывает `seo-service` и его роль как оркестратора
- **THEN** перечисляет будущие парсеры (`yandex-metrics-parser-service`, `yandex-auth-service`)

#### Scenario: Файл protocols.md
- **WHEN** создаётся документация
- **THEN** создаётся `docs/seo/protocols.md`
- **THEN** файл описывает контракт NATS stream `SEO_TASKS` (только постановка задач)
- **THEN** описывает Celery задачу `schedule_parsing`
- **THEN** включает примеры JSON payloads для NATS messages
- **THEN** явно указывает, что результаты парсинга остаются в парсерах

### Requirement: Расширение AGENTS.md для SEO-сервисов
Система SHALL обновить `AGENTS.md` с правилами работы агентов с SEO-инфраструктурой.

#### Scenario: Секция про SEO-сервисы
- **WHEN** обновляется `AGENTS.md`
- **THEN** добавляется секция "SEO Services"
- **THEN** Backend-агент получает правило читать `docs/seo/` при работе с `services/seo-service/**`
- **THEN** указывается обязательность проверки NATS/Celery протоколов

#### Scenario: Правило для Quality Gate
- **WHEN** обновляется секция Quality Gate
- **THEN** добавляется требование проверки соответствия `agents/howto/nats-jetstream-protocols.md`
- **THEN** добавляется требование smoke-тестов NATS и Celery интеграций

### Requirement: README.md для seo-service
Система SHALL создать `services/seo-service/README.md` с описанием сервиса.

#### Scenario: Содержимое README
- **WHEN** создаётся README
- **THEN** файл описывает назначение seo-service как оркестратора
- **THEN** перечисляет основные зависимости (NATS, Celery, PostgreSQL)
- **THEN** включает quick start для локальной разработки

#### Scenario: Ссылки на документацию
- **WHEN** создаётся README
- **THEN** включает ссылки на `docs/seo/architecture.md` и `docs/seo/protocols.md`
- **THEN** включает ссылку на `agents/howto/nats-jetstream-protocols.md`

### Requirement: Примеры NATS message payloads
Система SHALL документировать формат NATS messages для SEO-задач.

#### Scenario: Пример задачи парсинга
- **WHEN** документируется формат message
- **THEN** приводится JSON-пример для `seo.tasks.yandex_metrics`
- **THEN** пример включает обязательные поля: `task_id`, `site_id`, `params`, `trace_id`

#### Scenario: Формат результатов откладывается
- **WHEN** рассматриваются примеры результатов парсинга
- **THEN** они НЕ документируются на данном этапе
- **THEN** результаты остаются в парсерах, формат будет определён в отдельной задаче

### Requirement: Диаграмма взаимодействия сервисов
Система SHALL включить визуализацию архитектуры SEO-модуля.

#### Scenario: Text-based диаграмма
- **WHEN** создаётся `docs/seo/architecture.md`
- **THEN** включается ASCII или mermaid диаграмма взаимодействия
- **THEN** диаграмма показывает flow: Celery Beat → schedule_parsing → NATS → parser
- **THEN** диаграмма указывает, что результаты остаются в парсерах (без обратного flow в seo-service)

#### Scenario: Описание компонентов
- **WHEN** приводится диаграмма
- **THEN** каждый компонент (seo-service, NATS, Celery, парсеры) имеет краткое описание роли
- **THEN** указаны границы ответственности
