## ADDED Requirements

### Requirement: Backend ingress поддерживает фотографии размером не менее 10 МБ
Backend Helm chart SHALL задавать `nginx.ingress.kubernetes.io/proxy-body-size` через явное values-поле с default `20m`, чтобы request с файлом 10 МБ и multipart overhead проходил ingress. Значение MUST быть overrideable без изменения template и MUST применяться только к backend ingress.

#### Scenario: Default chart render содержит лимит
- **WHEN** выполняется `helm template` backend chart с default values
- **THEN** ingress содержит annotation `nginx.ingress.kubernetes.io/proxy-body-size: "20m"`

#### Scenario: Значение можно переопределить
- **WHEN** chart рендерится с другим допустимым body-size value
- **THEN** annotation содержит override value без изменения остальных ingress routes/TLS

#### Scenario: Файл 10 МБ проходит ingress
- **WHEN** controlled runtime evidence отправляет валидный multipart request размером 10 МБ через backend ingress с annotation `20m`
- **THEN** nginx не возвращает `413`; production/deployed authentication и повторный production API test для acceptance не требуются

#### Scenario: Запрос сверх настроенного лимита ограничен ingress
- **WHEN** multipart request превышает настроенный body-size
- **THEN** ingress может вернуть `413`, не ослабляя лимиты других сервисов

#### Scenario: Production API исключён из acceptance
- **WHEN** Quality Gate оценивает ingress change
- **THEN** Helm lint/render и уже полученное controlled runtime ingress evidence являются достаточными, а deployed/production endpoint calls и production auth MUST NOT быть обязательными
