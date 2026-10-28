# Spec Delta

## MODIFIED Requirements

### Requirement: Callback-страница OAuth Яндекса

CMS MUST иметь страницу `/callbacks/oauth/yandex` вне бокового layout, доступную для обмена кода только с актуальной ролью SEO, которая читает `code` и `state` из URL (прочие параметры, например `cid`, игнорируются) и выполняет ровно один `POST /api/yandex/auth/code` с `{code, state}`, показывая состояния обработки, успеха и ошибки.

#### Scenario: Успешный callback
- **WHEN** Яндекс перенаправляет на `/callbacks/oauth/yandex?state=<uuid>&code=<code>&cid=<cid>` в окне с активной сессией CMS пользователя SEO
- **THEN** страница отправляет POST с `code` и `state`, показывает успех с логином добавленного аккаунта

#### Scenario: Callback без ADMIN
- **WHEN** callback с валидными параметрами открывает authenticated пользователь без SEO, включая SUPERUSER/DEVELOPER
- **THEN** локальный guard не отправляет POST, страница показывает отказ без `code` и не сообщает `success`; при серверном отказе `403` peer не вызывается

#### Scenario: Однократная отправка
- **WHEN** эффект страницы выполняется повторно (React StrictMode, повторный рендер)
- **THEN** POST с этим кодом отправляется ровно один раз

#### Scenario: Нет параметров
- **WHEN** в URL отсутствует `code` или `state`
- **THEN** POST не отправляется, страница показывает ошибку некорректной ссылки

#### Scenario: Отказ пользователя в Яндексе
- **WHEN** URL содержит `error` (например, `access_denied`) вместо `code`
- **THEN** POST не отправляется, страница показывает, что авторизация отменена

#### Scenario: Ошибка backend
- **WHEN** POST возвращает ошибку (`400`, `403` отсутствие SEO или несовпадение конюшни, `502`)
- **THEN** страница показывает безопасное сообщение ошибки и не показывает `code`
