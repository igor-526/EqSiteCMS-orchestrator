## Why

После удаления отдельных SEO/Yandex сервисов остаются CMS UI и неподключённые backend исходники/тесты, вызывающие несуществующую интеграцию. Запрос [093](../../../docs/tasks/093_retire_seo_yandex_consumers.md) требует отдельного согласуемого diff оставшихся потребителей, без удаления обычного SEO сайтов.

## What Changes

- **BREAKING**: закрепить отсутствие `GET /api/yandex/auth-link`, `GET /api/yandex/account`, `GET /api/yandex/account/{account_id}`, `POST /api/yandex/account`, `DELETE /api/yandex/account/{account_id}`. Каждый возвращает `404` anonymous/authenticated без auth/upstream вызовов; access matrix находится в delta spec.
- **BREAKING**: удалить CMS `/seo`, настройки/модальное окно Yandex аккаунтов, popup и `/callbacks/oauth/yandex`; старые UI URL возвращают `404`, не пересылают OAuth query/code/state в dashboard/login.
- Удалить исключительно интеграционные consumers и заменить устаревшие позитивные тесты no-route/no-menu регрессиями. Текущий backend уже не регистрирует маршруты; не восстанавливать отсутствующие файлы для повторного удаления.
- Сохранить login/refresh/logout, access/refresh cookie, общие scope guards, site settings, другие CMS функции, публичные metadata/sitemap/robots/canonical, карты и используемую site-ad Метрику.
- По умолчанию НЕ включать destructive data migration. Опциональная новая forward migration удаления persisted `SEO` и grants имеет отдельный approval gate; подготовка файла не разрешает выполнение на БД.

## Capabilities

### New Capabilities

- `seo-yandex-consumer-retirement`: отсутствие пяти gateway маршрутов и CMS consumers, ограниченный cleanup, сохранение независимого SEO/auth и явная граница optional role retirement.

### Modified Capabilities

Нет. `backend-access-platform` используется как действующий контракт inventory и сохранения auth, `site-consumer-contracts` и site-specific metadata specs — как guardrails. Их общие требования не меняются. Удалённые старые specs не копируются и не применяются.

## Impact

Backend и CMS frontend; ownership и точный текущий список файлов заморожены в design. Frontend: 29 существующих UNTRACKED delete targets + 3 общих правки и условная правка user enum. Backend: точечные no-route/auth/inventory регрессии; все 8 интеграционных исходников и 4 obsolete файла уже отсутствуют после наблюдавшегося параллельного cleanup. Ранее untracked route test тоже исчез; новый no-route regression test создаётся только после approval. Router/auth/CORS/settings/inventory cleanup уже наблюдается в current baseline. Новые dependencies, package/lockfile, NATS/events, публичные API и schema changes не требуются.

Оба worktree и корень содержат независимые/предыдущие изменения; они сохраняются. Apply-ready означает полноту плана, НЕ пользовательское согласие. Router получает approval базового scope с явным разрешением удаления untracked файлов; optional роль согласуется отдельно. Live rollout и data deletion сейчас запрещены.
