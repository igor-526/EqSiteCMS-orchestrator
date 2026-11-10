## MODIFIED Requirements

### Requirement: Стабильный сохраняемый slug новости
Backend MUST сохранять стабильный slug новости с генерацией, уникальностью, совместимостью DTO и backfill согласно сценарию «Полный контракт сохраняемого slug».

#### Scenario: Создание и переименование
- **WHEN** CMS создаёт две новости с одинаковым русским названием и затем переименовывает одну
- **THEN** обе получают разные сохраняемые slug, переименование не меняет ранее выданный URL, старый create payload остаётся допустимым

#### Scenario: Backfill и изоляция
- **WHEN** миграция применяется к заполненной базе с одинаковыми названиями разных tenant
- **THEN** все записи получают slug, данные и UUID сохраняются, unique constraint защищает запись в каждом tenant

#### Scenario: Полный контракт сохраняемого slug
- **WHEN** проверяется сохранение существующего контракта capability
- **THEN** MUST соблюдаться все следующие исходные условия без изменения поведения:

Backend MUST сохранять обязательный slug длиной не более 160 ASCII-символов с уникальным ограничением `(equestrian_id, slug)`, включая удалённые записи. Slug MUST автоматически создаваться из нормализованного названия и полного UUID записи без дефисов как суффикса; пустая нормализованная основа MUST заменяться `news`. Переименование, обновление content и soft delete MUST сохранять slug. Входные create/update DTO MUST оставаться совместимыми и не требовать slug. Миграция MUST заполнить slug существующих записей, включая будущие и удалённые, до установки NOT NULL.

### Requirement: Access matrix news
News API MUST сохранять матрицу доступа, selector, роли, статусы и границы публичной проекции согласно сценарию «Полный контракт матрицы news».

#### Scenario: Selector и авторизация независимы
- **WHEN** запрос A1–A3 содержит CMS credentials, но не содержит валидный selector
- **THEN** ответ `401`, tenant пользователя не подменяет выбранный публичный tenant

#### Scenario: Сохранение защищённого администрирования
- **WHEN** A6–A9 вызываются anonymous, пользователем без admin scope и администратором своего tenant
- **THEN** ответы соответствуют матрице; запись чужого tenant не изменяется и не раскрывается

#### Scenario: Полный контракт матрицы news
- **WHEN** проверяется сохранение существующего контракта capability
- **THEN** MUST соблюдаться все следующие исходные условия без изменения поведения:

Реализация MUST соблюдать таблицу. `selector` — non-secret `X-Equestrian-Service-Key`; Public Read не требует CMS credentials. Административные роли ниже означают существующие scopes `SUPERUSER`, `ADMIN`, `DEVELOPER` внутри защищённого tenant context. Protected GET является исключением для списка с будущими/удалёнными записями и служебными полями. Тесты MUST покрывать anonymous/authenticated и чужой ресурс отдельно; ID трассируются в `design.md#test-matrix`.

| ID | method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|---|
| A1 | GET | `/api/news` | Public Read | любые | valid selector: 200 | valid selector: 200, тот же public DTO |
| A2 | GET | `/api/news/by-slug/{slug}` | Public Read | любые | valid selector: 200 либо 404 | valid selector: 200 либо 404, без privileged bypass |
| A3 | GET | `/api/news/{news_id}` | Public Read | любые | valid selector: 200 либо 404 | valid selector: 200 либо 404, без privileged bypass |
| A4 | GET | все A1–A3, selector отсутствует | Public Read | любые | 401 | 401 |
| A5 | GET | все A1–A3, selector невалиден | Public Read | любые | 401 | 401 |
| A6 | GET | `/api/news-cms` | Protected Read, исключение | admin scopes | 401 | 200 свой tenant; 403 без scope |
| A7 | POST | `/api/news` | Protected Write | admin scopes | 401 | 201 свой tenant; 403 без scope; 400 бизнес-валидация |
| A8 | PATCH | `/api/news/{news_id}` | Protected Write | admin scopes | 401 | 200 свой ресурс; 403 без scope; 400 отсутствующий/чужой ресурс согласно текущему контракту |
| A9 | DELETE | `/api/news/{news_id}` | Protected Write | admin scopes | 401 | 204 свой ресурс; 403 без scope; 400 отсутствующий/чужой ресурс согласно текущему контракту |

Для A6–A9 отсутствие или невалидность обязательного protected tenant context MUST давать `401`; структурные ошибки DTO сохраняют текущий `422`. A9 — regression guard неизменяемой операции. News photos endpoint не меняется.
