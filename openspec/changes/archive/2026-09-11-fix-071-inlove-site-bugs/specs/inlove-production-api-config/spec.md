## ADDED Requirements

### Requirement: Production build получает обязательную публичную API-конфигурацию
Production image сайта SHALL получать абсолютный `NEXT_PUBLIC_API_BASE_URL` и непустой `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` на build stage из GitHub Actions. Pipeline MUST завершаться ошибкой до push/deploy, если любое значение отсутствует, пусто или URL не является абсолютным HTTP(S) URL. Tenant selector является non-secret identity hint и MAY быть встроен в browser bundle; он MUST NOT трактоваться как CMS credential.

#### Scenario: Release build получает валидные inputs
- **WHEN** workflow release-ветки запускает Docker build с настроенными GitHub values
- **THEN** image содержит API URL и tenant selector, а production server/client используют их после запуска

#### Scenario: Release input отсутствует
- **WHEN** API URL либо tenant selector отсутствует или пуст
- **THEN** pipeline завершается до push image и Helm deploy с понятной ошибкой без вывода значения selector

### Requirement: Все разрешённые запросы отправляют tenant selector без CMS credentials
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

