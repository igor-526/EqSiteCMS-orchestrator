## Контекст

Пакет FE-1 восстанавливает текущий frontend-контракт задач 004, 006, 007, 013 и 020. Evidence ограничено кодом и тестами `services/frontend` и утверждёнными отчётами; тексты исторических task/plan не считаются доказательством. Capability относится только к защищённому CMS-контуру и не определяет backend-авторизацию или поведение `site-*`.

Фактический код неоднороден: цены и photo selector используют `limit/offset`, тогда как CMS-список новостей сохраняет legacy `page/limit`; у цен есть подробный action-to-scope registry, а у новостей scope registry покрывает только документационные вкладки. Эти различия должны остаться явными gaps, а не маскироваться желаемым контрактом.

## Цели / Не-цели

**Цели:**

- Зафиксировать подтверждённые сценарии CMS для цен, page data, новостей и фотографий.
- Отразить admin auth boundary, фактические scope guards и обработку отказов API.
- Зафиксировать подтверждённые pagination и test boundaries без утверждений сверх evidence.
- Сохранить трассировку к задачам 004, 006, 007, 013 и 020.

**Не-цели:**

- Изменять runtime frontend/backend, API, DTO, зависимости или main specs.
- Исправлять legacy `page/limit` новостей либо добавлять недостающие mutation scope guards.
- Определять публичный consumer UI или повторять backend capability.
- Считать UI hiding механизмом серверной авторизации.

## Решения

### 1. Один capability для связанной CMS content/commerce зоны

Цены, page editor, новости и photo selector объединяются в `cms-content-commerce-ui`, поскольку они образуют подтверждённую CMS-поверхность редактирования контента и используют общие auth/API-boundary подходы. Альтернатива «spec на каждую историческую задачу» отклонена как механическая и дублирующая общие требования.

### 2. Backend access указывается только как внешняя граница

Spec фиксирует, что CMS работает в authenticated admin layout, mutation UI соответствует Protected Write и ошибки `401/403` не превращаются в успех. HTTP-статусы из утверждённых reports приводятся как evidence, но capability не переопределяет backend policy. Public Read GET упоминается только для согласования внешней границы; consumer-код не входит в ownership.

### 3. Фактические несоответствия оформляются gaps

- `G-FE1-NEWS-PAGINATION`: CMS news query использует legacy `page/limit`, а не единый `limit/offset`; backfill не объявляет миграцию завершённой.
- `G-FE1-NEWS-MUTATION-SCOPES`: registry новостей подтверждает scopes документационных вкладок, но отдельные action guards create/update/delete/photos фактическим registry не подтверждены.

Альтернатива — нормативно описать целевое поведение из современных агентных правил — отклонена, поскольку это не evidence текущей реализации.

### 4. Проверяемость опирается на существующие уровни evidence

Компонентные тесты подтверждают ключевые режимы редактора цен, duplicate flow, loading/empty и scope present/missing. `src/api/api-boundary.test.ts` использует MSW, проверяет `limit/offset`, `401/403` и блокирует необработанную реальную сеть. Утверждённые reports дополняют это историческими typecheck/build/smoke результатами. Новые runtime-тесты не создаются, потому что change документационный.

## Риски / Компромиссы

- [Исторические reports и текущий код могут относиться к разным моментам] → Формулировать только поведение, одновременно видимое в текущем коде либо явно зафиксированное утверждённым report.
- [Frontend spec может дублировать backend access] → Описывать только UI reaction/guard и ссылаться на endpoint class как внешнюю границу.
- [Legacy gaps потеряются при sync] → Сохранить стабильные gap IDs в design и нормативных сценариях spec до отдельного change с runtime evidence.
- [Большие компоненты цен имеют известный technical debt] → Не превращать quality notes отчёта 020 в функциональные требования этого backfill.

## План миграции

1. Создать и строго валидировать delta-spec change без runtime-изменений.
2. Передать пакет task 6.3 на профильный frontend review.
3. После успешного review task 6.4 отдельно синхронизирует capability в main specs и архивирует пакет.
4. При отклонении удалить только артефакты этого backfill change; runtime и main specs остаются неизменными.

## Открытые вопросы

Блокирующих вопросов для backfill нет. Gaps `G-FE1-NEWS-PAGINATION` и `G-FE1-NEWS-MUTATION-SCOPES` требуют отдельных будущих runtime changes и не закрываются этой документационной задачей.
