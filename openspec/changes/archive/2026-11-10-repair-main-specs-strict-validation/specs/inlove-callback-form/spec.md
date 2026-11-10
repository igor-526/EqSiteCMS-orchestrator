# Изменения спецификации

## MODIFIED Requirements

### Requirement: Отправка использует существующее публичное POST-исключение
Форма SHALL использовать существующее публичное POST-исключение `/api/callback_requests` с tenant selector без CMS credentials. Формат запроса, запрет новых backend endpoint и API-схем и неизменная access matrix MUST соответствовать сценарию «Транспорт и матрица публичной отправки callback».

#### Scenario: Anonymous valid submit успешен
- **WHEN** anonymous visitor отправляет валидные поля и consent при корректном tenant selector
- **THEN** API получает только контрактный JSON и отвечает `201`, а форма показывает постоянное success-сообщение

#### Scenario: Ошибки сохраняют пользовательский ввод
- **WHEN** API отвечает `4xx`, `5xx` либо запрос завершается network error
- **THEN** значения и consent сохраняются; validation error показывается рядом с полем, network/`5xx` допускает retry, а `401` объясняется как ошибка конфигурации без login UI

#### Scenario: CMS authentication не участвует в форме
- **WHEN** form boundary проверяется anonymous и с искусственно заданными CMS credentials
- **THEN** запрос не отправляет CMS credentials, а наличие auth не обходит selector или validation

#### Scenario: Транспорт и матрица публичной отправки callback
- **WHEN** посетитель отправляет callback form через существующий публичный API
- **THEN** Форма SHALL отправлять anonymous `POST /api/callback_requests` с `Content-Type: application/json` и tenant selector, без cookie, `Authorization` или CMS credentials. Это публичное исключение существует для связи anonymous visitor с клубом; новых backend endpoint и API-схем этот change MUST NOT создавать.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `POST` | `/api/callback_requests` | Public POST exception + tenant selector | нет | `201` с валидными payload/selector; `400/422` invalid payload; `401` missing/invalid selector | CMS auth не требуется, не отправляется и не меняет outcomes |
