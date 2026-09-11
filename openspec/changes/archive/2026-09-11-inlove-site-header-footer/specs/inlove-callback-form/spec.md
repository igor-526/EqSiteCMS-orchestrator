## ADDED Requirements

### Requirement: Любой CTA открывает одну универсальную callback form
Сайт SHALL использовать единый `CallbackModal` для header и прочих CTA. Текущий route/page MAY использоваться controller для локальной маршрутизации, но MUST NOT показываться посетителю в форме и MUST NOT добавляться в `comment`. Optional service/tariff/horse context MAY оставаться видимым и добавляться в `comment`, не создавая полей вне `CallbackRequestCreateDto`.

#### Scenario: Предметный контекст CTA попадает в поддерживаемый payload без страницы
- **WHEN** посетитель открывает modal из contextual CTA и отправляет форму
- **THEN** optional entity видима пользователю и добавлена к `comment`, если она передана
- **AND** route/page не виден в modal и строка `Страница:` отсутствует в `comment`
- **AND** payload ограничен `name?`, `phone` и `comment?`

### Requirement: Zod валидирует поля и обязательное согласие
Callback form MUST использовать Zod-схему: `phone` обязателен и имеет длину 1–63, `name` необязателен и не длиннее 127, `comment` необязателен и не длиннее 2000 символов. Непредвыбранный consent checkbox SHALL быть обязательным локальным legal-состоянием и MUST NOT входить в API payload.

#### Scenario: Невалидные значения не отправляются
- **WHEN** посетитель отправляет пустой/слишком длинный phone, слишком длинные name/comment либо не даёт consent
- **THEN** сетевой вызов не выполняется, inline errors связаны с полями, а focus переходит к первому ошибочному control

#### Scenario: Политика доступна независимо от consent
- **WHEN** посетитель перемещается клавиатурой к ссылке политики
- **THEN** ссылка доступна независимо от checkbox и ведёт на валидный setting URL либо fallback `/about#privacy`

### Requirement: Отправка использует существующее публичное POST-исключение
Форма SHALL отправлять anonymous `POST /api/callback_requests` с `Content-Type: application/json` и tenant selector, без cookie, `Authorization` или CMS credentials. Это публичное исключение существует для связи anonymous visitor с клубом; новых backend endpoint и API-схем этот change MUST NOT создавать.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `POST` | `/api/callback_requests` | Public POST exception + tenant selector | нет | `201` с валидными payload/selector; `400/422` invalid payload; `401` missing/invalid selector | CMS auth не требуется, не отправляется и не меняет outcomes |

#### Scenario: Anonymous valid submit успешен
- **WHEN** anonymous visitor отправляет валидные поля и consent при корректном tenant selector
- **THEN** API получает только контрактный JSON и отвечает `201`, а форма показывает постоянное success-сообщение

#### Scenario: Ошибки сохраняют пользовательский ввод
- **WHEN** API отвечает `4xx`, `5xx` либо запрос завершается network error
- **THEN** значения и consent сохраняются; validation error показывается рядом с полем, network/`5xx` допускает retry, а `401` объясняется как ошибка конфигурации без login UI

#### Scenario: CMS authentication не участвует в форме
- **WHEN** form boundary проверяется anonymous и с искусственно заданными CMS credentials
- **THEN** запрос не отправляет CMS credentials, а наличие auth не обходит selector или validation

### Requirement: Modal управляет pending, focus и mobile viewport
Modal MUST иметь доступные name/description, focus trap, закрытие по `Escape`, возврат focus инициатору и scrollable mobile layout с safe area. Во время pending значения и геометрия SHALL сохраняться, submit MUST быть заблокирован от повтора и обозначен `aria-busy`; sticky CTA MUST быть скрыт.

#### Scenario: Double submit предотвращён
- **WHEN** валидная отправка находится в pending
- **THEN** повторное действие не создаёт второй POST, controls сохраняют значения, а состояние сообщается assistive technology

#### Scenario: Закрытие возвращает focus
- **WHEN** modal закрывается через close control или `Escape`
- **THEN** focus возвращается CTA-инициатору и фоновая страница снова доступна
