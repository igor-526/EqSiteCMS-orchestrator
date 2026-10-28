# Proposal — 105-seo-role

## Why

Задача `docs/tasks/105_seo_role.md` отделяет SEO-специалиста от администратора CMS. Сейчас основной backend и весь раздел SEO проверяют `ADMIN`, поэтому отдельный специалист не может работать без административной роли.

## What Changes

- Добавить scope `SEO` в существующий seed основного backend; UUID сгенерировать `uuid.uuid4()` один раз при реализации и сохранить в seed. Схема БД не меняется.
- **BREAKING:** заменить `ADMIN` на строгое наличие `SEO`, без наследования `SUPERUSER`/`DEVELOPER`, для всех 11 операций `/api/seo/**` и 8 операций `/api/yandex/**`, обслуживающих SEO-раздел. `ADMIN` без SEO получает `403`; SEO без ADMIN получает доступ; SEO+ADMIN также разрешён.
- Защитить меню, прямой `/seo`, чтение, мутации и OAuth callback актуальным SEO. Публичной становится не callback-операция: `POST /api/yandex/auth/code` остаётся защищённым.
- Безопасно и повторяемо подготовить локального тестового пользователя `seo` с единственной ролью SEO и существующей тестовой конюшней; пароль получить из локального источника smoke credentials без включения значения в артефакты/логи. Добавить роль выбора пользователя в обе копии SMOKE skill, сохраняя их независимые настройки.
- Полные access matrix и anonymous/authenticated сценарии включены в delta specs и design. Изменяются GET списков/настроек и POST/PATCH/DELETE нормализации `/api/seo/**`, POST `/api/seo/parse-jobs`, GET auth/link, accounts, metrica/counters, metrica/connection и POST auth/code, metrica/connection, DELETE accounts/{account_id}, metrica/connection под `/api/yandex`.

## Capabilities

### New Capabilities

- `seo-role-provisioning`: сидирование SEO и безопасная локальная тестовая учётная запись со SMOKE-профилем.

### Modified Capabilities

- `seo-backend-proxy`: SEO вместо ADMIN для всех gateway операций, включая route inventory и tenant isolation.
- `yandex-backend-proxy`: SEO для восьми операций интеграции, используемых SEO-разделом.
- `seo-peer-http-contract`: актуализировать название роли на внешнем gateway, не меняя внутреннюю policy и selector.
- `cms-seo-data-ui`: SEO guards чтения и мутаций, без изменения таблиц/периодов/пагинации.
- `cms-seo-yandex-ui`: SEO-only навигация, страница и действия Яндекса.
- `yandex-oauth-cms-callback`: SEO guard перед обменом кода, безопасные отказы.
- `seo-parse-trigger-api`: SEO-only ручной запуск через gateway (capability приходит из change 104).
- `cms-seo-parse-refresh-ui`: SEO-only кнопка обновления (capability приходит из change 104).

## Impact

Основной backend (`services/backend`), CMS (`services/frontend`) и две копии `.agents/skills/api-smoke-test`, `.claude/skills/api-smoke-test`; документация `SERVICES.md` и backend route inventory. Код SEO backend (`services/seo-service`) **не меняется**: авторизация пользователей проверяется основным gateway. Internal Trusted Network API SEO/Яндекса/Метрики, scheduler, NATS, resolve/агрегации и health сохраняют контракты; сайты-потребители `site-*` и их Public Read API не затрагиваются. Превращение peer API в SEO-only потребовало бы отдельной сервисной аутентификации и нарушило бы текущих парсеров; это не скрытое расширение данной задачи.

Предусловие реализации: Router завершает согласованную финализацию и sync `104-metrica-scheduling` (сейчас 129/135 tasks; код ручного запуска уже существует, две новые capability ещё отсутствуют в main specs). 105 не меняет артефакты 104 и не присваивает его оставшиеся задачи.

До approval требуется подтвердить три явно предложенных решения: ADMIN без SEO запрещён; `/api/yandex/**` включён; внутренние peer endpoints исключены из пользовательской ролевой политики. Реализация, создание пользователя, генерация UUID и изменение runtime на этапе PLAN-105 запрещены.
