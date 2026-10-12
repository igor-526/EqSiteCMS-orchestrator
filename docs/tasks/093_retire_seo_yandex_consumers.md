# 093 — Удаление потребителей маршрутов SEO/Yandex

## Исходный запрос пользователя

> «Теперь подготовь diff на избавление других сервисов от этих маршрутов. Посмотри ещё frontend».

Контекст: после предыдущего cleanup сервисов SEO/Yandex нужно подготовить отдельный контракт удаления оставшихся backend/CMS frontend потребителей пяти `/api/yandex/*` маршрутов. Обычные SEO metadata сайтов, sitemap, robots, canonical, карты и используемая site-ad Яндекс Метрика не удаляются.

## Планирование и согласование

Единственный план реализации: [retire-seo-yandex-consumers](../../openspec/changes/retire-seo-yandex-consumers/proposal.md), [design](../../openspec/changes/retire-seo-yandex-consumers/design.md), [tasks](../../openspec/changes/retire-seo-yandex-consumers/tasks.md).

Unit PLAN-RETIRE-1 создаёт только новую документацию. Код, runtime, браузер, сборки, миграции и данные в этом unit не меняются. Конкретный новый scope ещё НЕ подтверждён пользователем; готовность артефактов не является разрешением apply.

Router должен получить отдельное подтверждение:
1. Базовый diff удаления остаточных backend потребителей и CMS UI, включая перечисленные в design существующие UNTRACKED пользовательские исходники (29 frontend файлов; backend obsolete файлы и route test уже исчезли в параллельном cleanup, поэтому их удаление условное, без восстановления, а no-route regression создаётся заново после approval).
2. Включать ли в diff новую forward data migration удаления ровно persisted scope `SEO` и его grants, либо отложить role retirement в отдельную задачу? Рекомендуется базовый diff без этой миграции. Подготовка миграции и её выполнение на живой БД — разные approvals.

При отложенной миграции старый scope может продолжать возвращаться динамическим roles endpoint и показываться в управлении пользователями; удаление frontend enum это не исправляет. Общую auth/roles логику нельзя переписать для маскировки роли.
