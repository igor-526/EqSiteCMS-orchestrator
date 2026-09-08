# Дизайн-протокол сайта INLOVE

Эта инструкция обязательна для execution unit, который меняет `services/site-ksk-inlove/**`. Она подключает проектные документы к профилю Site Consumer, не дублируя дизайн-систему в агентных инструкциях.

## Протокол чтения

До изменения кода прочитай только относящиеся к unit разделы следующих документов:

1. `docs/sites/inlove/scheme.md` — карта страниц, композиция, CMS-источники, `site_settings`, состояния и переходы.
2. `docs/sites/inlove/components.md` — переиспользуемые компоненты, их data contracts, variants, responsive-поведение и accessibility.
3. `docs/sites/inlove/design_system_specification.md` — визуальные tokens и правила; всегда прочитай раздел `0`, релевантные unit разделы и финальный master prompt.

Не перечитывай документы целиком без необходимости. Router передаёт конкретные разделы в `contextFiles`; если для затронутого компонента или страницы нужный раздел не указан, найди и прочитай именно его.

## Роли и приоритеты документов

- Подтверждённая задача unit задаёт scope и не разрешает менять карту страниц или дизайн-систему за его пределами.
- `scheme.md` является источником истины для route, page composition, CMS-интеграции, SEO и состояний страницы.
- `components.md` является источником истины для component API, переиспользования и поведения компонента.
- `design_system_specification.md` является источником истины для визуального языка, tokens, композиции и presentation rules.

При противоречии не придумывай локальное правило и не исправляй документы самовольно: останови конфликтующую часть, зафиксируй расхождение в handoff и запроси решение через Router. Изменение этих трёх документов требует отдельного ownership и явного задания.

## Правила реализации

- Применяй `site_settings` первым источником для вариативных текстов, SEO, CTA, меню, контактов, порядка разрешённых элементов и других настроек, перечисленных в `scheme.md`. Оставляй документированный безопасный fallback.
- Не переноси профильные сущности (`Price`, `Horse`, `News`, `Photo`) в settings: получай их из соответствующего public read API.
- Сохраняй SSR-first: индексируемый контент, metadata и structured data должны быть доступны без client-only fetch. Клиентский код используй только для необходимой интерактивности.
- Реализуй все предусмотренные loading, empty, error и disabled состояния. Проверяй desktop, tablet и mobile, длинный/пустой CMS-контент, keyboard navigation, focus management, WCAG AA и `prefers-reduced-motion`.
- Используй anonymous Public Read `GET` с tenant selector и без CMS credentials. `POST /api/callback_requests` допустим только как зафиксированное public POST exception с контрактным payload; `401` означает ошибку tenant selector, а не приглашение авторизоваться.
- Не вводи новые цвета, типографику, spacing, компоненты, маршруты или визуальные паттерны, пока задачу можно решить существующими контрактами. Не меняй дизайн-систему ради удобства локальной реализации.

## Verification и handoff

В пределах unit выполни применимые targeted tests, lint/typecheck/build и проверку server-rendered HTML. Для UI-изменений проверь релевантные breakpoint'ы и состояния, keyboard/focus, контраст и reduced motion; для data flow — anonymous GET, tenant selector, отсутствие CMS-only endpoint и корректный fallback `site_settings`.

В handoff перечисли прочитанные разделы трёх документов, выполненные команды, проверенные viewport/state сценарии и любые отклонения. Не отмечай визуальную проверку выполненной, если browser/manual QA фактически не проводилась.
