## Почему

Исторические задачи `003`, `017` и `019` сформировали фактические контракты публичного сайта `site-ad`: выбор runtime API, tenant-aware Public Read, серверный вывод карточки лошади и её родословной, а также базовые SEO-механизмы. Эти контракты ещё не закреплены capability-oriented OpenSpec-спецификацией, а неподтверждённая post-deploy часть задачи `017` должна остаться явным gap.

## Что изменяется

- Добавляется русскоязычная delta spec `site-consumer-contracts` только по evidence из `services/site-ad`, тестов и итоговых отчётов.
- Фиксируется серверная runtime-конфигурация API и добавление `X-Equestrian-Service-Key` только к Public Read GET без CMS cookie или credentials.
- Фиксируется SSR динамической страницы лошади, серверная генерация metadata, индексируемый horse/pedigree-контент, sitemap и robots.
- Фиксируется подтверждённая DTO-форма родителей жеребёнка без рекурсивного расширения родословной.
- Gap `G-017` сохраняет отсутствие post-deploy HTTP evidence и не объявляет ISR/revalidation либо production network behavior подтверждёнными.
- Runtime-код, API, main specs и тесты не изменяются.

## Возможности

### Новые возможности

- `site-consumer-contracts`: Подтверждённые контракты публичного `site-ad` для server-side Public Read, SSR/SEO и отображения horse/pedigree данных.

### Изменяемые возможности

Отсутствуют: соответствующей main spec ещё нет.

## Влияние

Изменяются только артефакты `openspec/changes/backfill-site-consumer-contracts/**`. Evidence читается из `services/site-ad/src/api`, server pages, metadata/sitemap/robots, типов horse DTO, deployment-конфигурации и отчётов задач `003`/`019`. Backend, CMS frontend, runtime `site-ad`, инфраструктура и `openspec/specs/**` остаются вне scope task `7.1`.
