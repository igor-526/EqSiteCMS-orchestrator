## Контекст

Пакет SC-1 восстанавливает consumer-side контракты задач `003`, `017` и `019`. `site-ad` уже выбирает API URL из окружения, серверно читает публичные данные с tenant service key и строит динамическую страницу лошади в Next.js App Router. Этот change документирует фактическое состояние и не меняет runtime.

## Цели / Не-цели

**Цели:**

- Описать единый capability `site-consumer-contracts` по code/tests/reports evidence.
- Зафиксировать Public Read boundary без CMS credentials и CMS-only endpoint.
- Зафиксировать подтверждённый SSR/SEO путь horse detail и DTO родителей жеребёнка.
- Сохранить `G-017` для отсутствующего post-deploy production evidence задачи `017`, не отрицая anonymous HTTP evidence из reports `003` и `019`.
- Подготовить пакет к consumer review `7.2` и пакетной обработке `7.5` родительского change.

**Не-цели:**

- Менять `services/site-ad`, backend, CMS frontend, endpoint или deployment.
- Переопределять backend access policy или DTO-владение BE-1/BE-2.
- Объявлять SSG/ISR/revalidation, canonical, Open Graph или production network behavior подтверждёнными без evidence.
- Описывать callback POST: он не относится к evidence задач `003`, `017`, `019` и требует отдельного контракта публичного write-исключения.

## Решения

### 1. Capability ограничен публичной consumer-границей

Runtime API configuration, service-key GET и server-rendered horse/pedigree output описываются вместе, потому что образуют один путь `server page → public read client → tenant API`. Backend auth и CMS mutations остаются в пакетах BE/FE. Альтернатива — копировать backend access requirements — отклонена из-за двойного ownership.

### 2. Consumer access matrix описывает вызовы сайта, а не backend целиком

Матрица перечисляет только подтверждённые GET-классы, используемые `site-ad`. Роль consumer — anonymous с tenant service key; CMS cookie и credentials не являются частью запроса. Точные backend ответы без ключа и с неизвестным ключом трассируются к report `003`, но `G-017` запрещает выдавать их за отдельную post-deploy проверку задачи `017`.

### 3. Режим рендера фиксируется ровно по коду

Horse detail использует async server page и `dynamic = "force-dynamic"`, то есть подтверждён SSR на запрос. Данные передаются UI-компоненту до отдачи страницы, а metadata вычисляется серверно. Отсутствие `revalidate` не интерпретируется как ISR; статические страницы, canonical/Open Graph и production HTML не получают более сильных нормативных утверждений.

### 4. Gap остаётся частью трассировки

`G-017` фиксирует, что локальные unit/config evidence не заменяют post-deploy запросы `ad.eqcms.ru → api.eqcms.ru`. До отдельного deployment evidence spec требует только проверяемое локально поведение и явно не заявляет production success.

## Риски / Компромиссы

- [Client components внутри horse UI могут скрыть границу SSR при поверхностном review] → Reviewer проверяет серверную загрузку в route page и наличие данных до client-side fetch, не выводя режим только из директивы UI-компонента.
- [Service key ошибочно принимают за CMS credential] → Spec определяет его только как tenant selector для Public Read и запрещает CMS cookie/token в consumer contract.
- [Двойной вызов horse detail из page и `generateMetadata`] → Это фактическое поведение; оптимизация/deduplication не утверждается backfill-спекой.
- [SEO evidence неполон] → Фиксируются только metadata title/description, sitemap и robots; canonical/Open Graph/structured data остаются вне подтверждённого контракта.

## План миграции

1. Site Consumer reviewer сверяет требования, матрицу и `G-017` с `services/site-ad`, tests и reports в родительской task `7.2`.
2. После устранения findings Backend/tooling выполняет strict validation, sync и archive пакета в родительской task `7.5`.

Runtime rollback не требуется. До sync артефакты исправляются внутри этого change; после sync корректировка выполняется отдельным OpenSpec change.

## Открытые вопросы

Блокирующих вопросов для создания delta spec нет. Production network verification, фактический HTML smoke и выбор ISR/revalidation остаются gap/future change и не угадываются в backfill.
