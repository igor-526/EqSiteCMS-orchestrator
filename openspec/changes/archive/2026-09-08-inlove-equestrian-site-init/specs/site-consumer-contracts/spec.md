## ADDED Requirements

### Requirement: Public Read boundary для site-ksk-inlove
`site-ksk-inlove` SHALL использовать существующий Public Read API client с `NEXT_PUBLIC_API_BASE_URL`/`API_BASE_URL` и non-secret tenant selector `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY`. Consumer MUST NOT отправлять CMS cookie, access token или обращаться к CMS-only endpoint. Missing или invalid selector SHALL приводить к ожидаемому backend `401`, без клиентского fallback на tenant другого сайта.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `GET` | `/api/horses` | Public Read + tenant selector | anonymous consumer | `2xx` с валидным selector; `401` missing/invalid | CMS auth не нужен и не отправляется |
| `GET` | `/api/horses/{slug}` | Public Read + tenant selector | anonymous consumer | `2xx`/`404` ресурса с валидным selector; `401` missing/invalid | CMS auth не нужен и не отправляется |
| `GET` | `/api/horses/breeds` | Public Read + tenant selector | anonymous consumer | `2xx` с валидным selector; `401` missing/invalid | CMS auth не нужен и не отправляется |
| `GET` | `/api/horses/breeds/{id}` | Public Read + tenant selector | anonymous consumer | `2xx`/`404` с валидным selector; `401` missing/invalid | CMS auth не нужен и не отправляется |
| `GET` | `/api/horses/coat_colors` | Public Read + tenant selector | anonymous consumer | `2xx` с валидным selector; `401` missing/invalid | CMS auth не нужен и не отправляется |
| `GET` | `/api/horses/coat_colors/{id}` | Public Read + tenant selector | anonymous consumer | `2xx`/`404` с валидным selector; `401` missing/invalid | CMS auth не нужен и не отправляется |
| `GET` | `/api/horses/owners` | Public Read + tenant selector | anonymous consumer | `2xx` с валидным selector; `401` missing/invalid | CMS auth не нужен и не отправляется |
| `GET` | `/api/horses/owners/{id}` | Public Read + tenant selector | anonymous consumer | `2xx`/`404` с валидным selector; `401` missing/invalid | CMS auth не нужен и не отправляется |
| `GET` | `/api/horses/services` | Public Read + tenant selector | anonymous consumer | `2xx` с валидным selector; `401` missing/invalid | CMS auth не нужен и не отправляется |
| `GET` | `/api/horses/services/{id}` | Public Read + tenant selector | anonymous consumer | `2xx`/`404` с валидным selector; `401` missing/invalid | CMS auth не нужен и не отправляется |
| `GET` | `/api/prices` | Public Read + tenant selector | anonymous consumer | `2xx` с валидным selector; `401` missing/invalid | CMS auth не нужен и не отправляется |
| `GET` | `/api/prices/{slug}` | Public Read + tenant selector | anonymous consumer | `2xx`/`404` с валидным selector; `401` missing/invalid | CMS auth не нужен и не отправляется |
| `GET` | `/api/prices/groups` | Public Read + tenant selector | anonymous consumer | `2xx` с валидным selector; `401` missing/invalid | CMS auth не нужен и не отправляется |
| `GET` | `/api/prices/groups/{id}` | Public Read + tenant selector | anonymous consumer | `2xx`/`404` с валидным selector; `401` missing/invalid | CMS auth не нужен и не отправляется |
| `GET` | `/api/site_settings` | Public Read + tenant selector | anonymous consumer | `2xx` с валидным selector; `401` missing/invalid | CMS auth не нужен и не отправляется |
| `GET` | `/api/site_settings/{id}` | Public Read + tenant selector | anonymous consumer | `2xx`/`404` с валидным selector; `401` missing/invalid | CMS auth не нужен и не отправляется |
| `POST` | `/api/callback_requests` | Public anonymous write exception + tenant selector | anonymous consumer | `2xx` valid; `400` malformed/invalid; `401` missing/invalid selector | CMS auth не нужен и не обходит selector/validation |

Публичный `POST /api/callback_requests` является явным исключением, потому что предназначен для anonymous visitor; change сохраняет только wrapper/service без формы или автоматического вызова.

#### Scenario: Anonymous GET получает selector без CMS auth
- **WHEN** retained client формирует любой перечисленный `GET` с валидным tenant selector
- **THEN** он добавляет `X-Equestrian-Service-Key`
- **AND** не добавляет CMS cookie или `Authorization`

#### Scenario: Collection и detail wrappers имеют явное контрактное покрытие
- **WHEN** запускаются API-boundary tests всех retained GET wrappers из матрицы, включая detail routes для breeds, coat colors, owners, services, prices, price groups и site settings
- **THEN** каждый wrapper проверяется на точный path/query и успешный Public Read outcome с валидным selector
- **AND** для missing/invalid selector ожидается backend `401`, а для отсутствующего detail resource допускается `404`

#### Scenario: Missing selector не получает чужой fallback
- **WHEN** `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` отсутствует или состоит из пробелов
- **THEN** client не подставляет selector другого сайта
- **AND** backend может вернуть контрактный `401`

#### Scenario: Callback остаётся контролируемым public POST exception
- **WHEN** caller явно вызывает callback wrapper с валидными payload и selector
- **THEN** запрос идёт на `/api/callback_requests` без CMS auth
- **AND** никакой иной write endpoint не предоставляется retained consumer layer

#### Scenario: Anonymous и authenticated варианты покрыты тестами
- **WHEN** запускаются unit/API-boundary tests нового consumer
- **THEN** они проверяют anonymous GET, missing selector, public callback POST и отсутствие CMS credentials
- **AND** проверяют, что наличие произвольного `Authorization` не является требованием или способом обхода selector policy
