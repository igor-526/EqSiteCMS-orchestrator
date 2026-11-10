## MODIFIED Requirements

### Requirement: Все разрешённые запросы отправляют tenant selector без CMS credentials
Общий API client SHALL отправлять проверенный tenant selector без CMS credentials во всех разрешённых Public Read GET и публичном callback POST, соблюдая исходные ограничения credentials, заголовков, fallback, блокировки network call и access matrix согласно сценарию полного контракта.

#### Scenario: Полный контракт: Все разрешённые запросы отправляют tenant selector без CMS credentials
- **WHEN** применяется контракт требования «Все разрешённые запросы отправляют tenant selector без CMS credentials»
- **THEN** SHALL сохраняться весь следующий исходный контракт и его ограничения:

Общий API client SHALL устанавливать `X-Equestrian-Service-Key` из проверенной production-конфигурации для каждого разрешённого Public Read `GET` и публичного callback `POST`. Client MUST использовать `credentials: "omit"`, удалять caller-provided `Cookie`/`Authorization`, MUST NOT использовать fallback `default` и MUST безопасно завершать запрос до network call при пустом selector.

| method | path | access class | roles | expected without auth | expected with auth | связанные тесты |
|---|---|---|---|---|---|---|
| `GET` | `/api/site_settings`, `/api/news` и остальные используемые consumer GET | Public Read + tenant selector | нет | `200` с валидным selector; `401` missing/invalid | CMS auth не отправляется и не меняет outcome | `UT-API-01..04`, `LIVE-API-01..03` |
| `POST` | `/api/callback_requests` | Public POST exception + tenant selector | нет | `201` valid; `400/422` invalid payload; `401` missing/invalid selector | CMS auth не требуется, не отправляется и не меняет outcome | `UT-API-02..04`, `LIVE-API-04..06` |

Исключение `POST /api/callback_requests` публично, потому что anonymous посетитель должен отправить заявку клубу. Других write-исключений change не создаёт.

#### Scenario: Anonymous Public Read из production image
- **WHEN** production instance выполняет GET с валидной конфигурацией
- **THEN** backend получает selector header, не получает Cookie/Authorization и возвращает `200`

#### Scenario: Anonymous callback из production image
- **WHEN** посетитель отправляет валидную callback form
- **THEN** выполняется один credentialless POST с selector и backend возвращает `201`

#### Scenario: Selector отсутствует или неверен
- **WHEN** конфигурация пуста либо backend отклоняет selector
- **THEN** пустая конфигурация блокируется client-side до network call, а backend `401` отображается как configuration error без login UI
