# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Backend-маршрут только для ADMIN`
- TO: `### Requirement: Backend-маршрут только для SEO`

## MODIFIED Requirements

### Requirement: Backend-маршрут только для SEO
Backend SHALL предоставлять `POST /api/seo/parse-jobs` с телом `{"provider": "<код по маске ^[a-z][a-z0-9_]{1,31}$>"}`: без сессии `401`; без роли `SEO` (включая SUPERUSER/DEVELOPER) `403` до обращения к seo-service. Конюшня — из сессии; тело, query и заголовки клиента не влияют на конюшню; cookie в seo-service не пересылаются.

#### Scenario: Anonymous
- **WHEN** запрос приходит без cookie `access_token`
- **THEN** ответ `401`, seo-service не вызывается

#### Scenario: SUPERUSER и DEVELOPER без ADMIN
- **WHEN** пользователь без `SEO` вызывает маршрут
- **THEN** ответ `403`, seo-service не вызывается

#### Scenario: ADMIN конюшни A передаёт чужую конюшню
- **WHEN** SEO конюшни A отправляет `X-Equestrian-Id` или `equestrian_id` конюшни B
- **THEN** при лишнем поле в теле ответ `400`, заголовок игнорируется, seo-service получает конюшню A

### Requirement: Трансляция результата backend
Backend SHALL возвращать `202` с телом seo-service; `400` seo-service — `400` с безопасным `detail` (≤300 символов), недоступность или невалидный ответ seo-service — `502`, `503` seo-service — `503` с константным `detail`. Backend MUST NOT обращаться к ya-metrica-service и NATS для этой операции.

#### Scenario: Успех
- **WHEN** SEO вызывает маршрут, seo-service отвечает `202`
- **THEN** backend отвечает `202` с `job_id`, `provider`, `status`

#### Scenario: Невалидный ответ peer
- **WHEN** seo-service отвечает `202` с телом неверной схемы
- **THEN** backend отвечает `502`

#### Scenario: Очередь недоступна
- **WHEN** seo-service отвечает `503`
- **THEN** backend отвечает `503` без тела ответа peer

### Requirement: Access matrix ручного запуска
Новые маршруты SHALL соответствовать матрице. `POST /api/parse-jobs` — Internal Trusted Network Write: явное исключение из Protected Write, поскольку seo-service — внутренний peer без credentials, ролевая проверка выполняется backend (как у остальных `/api/**` seo-service); selector — non-secret identity hint. `POST /api/seo/parse-jobs` — Protected Write, только `SEO`.

#### Scenario: Строки матрицы проверяются anonymous и authenticated
- **WHEN** тесты вызывают каждую строку без credentials и с cookie/Authorization либо ролями
- **THEN** фактические статусы совпадают с матрицей

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| POST | backend `/api/seo/parse-jobs` | Protected Write | только SEO | `401` | `202`; без SEO `403` до downstream; невалидное тело/провайдер `400`; нет интеграции `400`; seo/yandex недоступны `502`; очередь недоступна `503` |
| POST | seo-service `/api/parse-jobs` | Internal Trusted Network Write (исключение) | доверенный внутренний caller (backend); роли CMS не проверяются | без/невалидный `X-Equestrian-Id` `401` до разбора тела; с selector без credentials `202`; невалидное тело/провайдер/нет интеграции `400`; yandex-service недоступен `502`; брокер недоступен `503` | то же; cookie/Authorization игнорируются |

#### Scenario: Selector не заменяется credentials
- **WHEN** запрос к seo-service содержит cookie и `Authorization`, но без `X-Equestrian-Id`
- **THEN** ответ `401`, тело не разбирается, ничего не опубликовано
