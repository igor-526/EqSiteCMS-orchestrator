## Why

После production-деплоя публичный сайт «ИНЛав» теряет обязательный tenant selector, хотя GitHub secret передаётся в Docker build, из-за чего anonymous Public Read и callback-запросы получают `401`. Одновременно при проверке текущих версий `068–070` обнаружены регрессии desktop/mobile навигации, избыточные пустоты в блоке услуг главной и необходимость закрепить клиентскую Zod-валидацию точно по backend `CallbackRequestCreateDto`.

## What Changes

- Исправить production-конфигурацию API client: обязательные API URL и non-secret tenant selector должны одинаково работать в `next dev`, production image и Kubernetes deployment, без fallback `default`, cookie или `Authorization`.
- Добавить fail-fast проверку build/deploy inputs и production regression test, подтверждающий наличие `X-Equestrian-Service-Key` в исходящих server/client запросах.
- Сделать desktop dropdown «Услуги» непрозрачным и непрерывным для медленного перевода курсора, сохранив keyboard/focus/Escape semantics.
- Сделать mobile menu настоящим viewport overlay вне геометрии sticky header, со scroll lock, safe area и focus trap.
- Уплотнить service cards на главной и добавить над ними SSR-заголовок «Услуги» по визуальному ритму секции новостей на desktop и mobile.
- Сверить существующую Zod-схему callback form с backend-ограничениями: `phone` 1–63, optional `name` ≤127, optional `comment` ≤2000; закрепить whitespace/optional semantics и regression coverage без изменения backend API.
- Зафиксировать access matrix и anonymous production/live проверки для Public Read `GET` и публичного исключения `POST /api/callback_requests`.

## Capabilities

### New Capabilities

- `inlove-production-api-config`: надёжная доставка API base URL и tenant selector в production image/runtime и обязательный selector header без CMS credentials.
- `inlove-navigation-regressions`: исправленное pointer/keyboard поведение desktop dropdown и полноэкранное mobile menu.
- `inlove-home-services-regression`: компактная SSR-секция услуг главной с заголовком и адаптивной сеткой без избыточного пустого пространства.
- `inlove-callback-validation-regression`: точное соответствие клиентской Zod-валидации действующему backend DTO и сохранение публичного callback-контракта.

### Modified Capabilities

Нет: затронутые INLOVE capability ещё находятся в отдельном активном change `inlove-site-header-footer` и не синхронизированы в main specs; этот change добавляет самостоятельные regression capability и не изменяет артефакты `069`.

## Impact

- Runtime/UI: `services/site-ksk-inlove/src/api/**`, `src/ui/navigation/**`, `src/features/contentPages/home/**`, `src/features/callBackRequest/**` и их тесты.
- Deployment ownership: `services/site-ksk-inlove/Dockerfile`, `.github/workflows/check_and_deploy.yml`, `.helm/**` и при необходимости env documentation; selector классифицируется как non-secret identity hint, но значение поставляется через GitHub configuration.
- API: новых endpoint и backend-изменений нет; используются существующие anonymous Public Read `GET` и `POST /api/callback_requests` как явное публичное исключение, всегда с tenant selector.
- Зависимости: новая runtime-библиотека не требуется; Zod уже подключён change `069` и должен быть уточнён, а не добавлен повторно.
- Процесс: `069` остаётся отдельным change; реализация `071` должна стартовать после доступности его текущего site diff и пройти собственный lane-based Quality Gate.
