## MODIFIED Requirements

### Requirement: Три страницы услуг рендерят SSR-контент из профильного API
`/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy` SHALL быть SSR-композициями, в которых соответствующая группа находится по точному неизменяемому имени из consumer config (`Занятия`, `Прогулки`, `Постой` соответственно), а описание, фотографии, карточки и цены поступают из существующих профильных Public Read API. Site settings `services.*`, `services.notice`, `home.program_benefits`, `about.setting`, `about.features` и service-specific `seo.*` MUST NOT управлять страницами. Дополнительные presentation-блоки MAY быть статическими в consumer-коде и MUST NOT возвращаться в CMS catalog.

#### Scenario: Страница услуг использует точное имя группы
- **WHEN** anonymous visitor открывает одну из трёх страниц и API содержит группу с настроенным точным именем
- **THEN** SSR HTML содержит данные только этой группы и её сущностей, без чтения service site settings

#### Scenario: Группа отсутствует или переименована
- **WHEN** API не возвращает exact-match группу для страницы
- **THEN** страница показывает локальный error/empty state и CTA, не использует fuzzy matching и не подмешивает другую группу

#### Scenario: Ошибка API не блокирует оболочку
- **WHEN** профильный API завершается сетевой ошибкой или 5xx
- **THEN** header/footer и статическая часть страницы остаются доступными, а динамический блок показывает error state

### Requirement: SEO и доступ по карте услуг
Три list-страницы SHALL иметь серверные title/description из consumer config и/или описания exact-match группы API, canonical на собственный путь. Detail routes SHALL формировать title/description из полей сущности API. Удалённые `seo.lessons.*`, `seo.rides.*`, `seo.boarding.*` и `site.short_name` MUST NOT влиять на metadata. Используемые GET SHALL оставаться Public Read с tenant selector.

| Method | Path | Access class | Роли | Без/с неверным selector | С корректным selector |
|---|---|---|---|---|---|
| `GET` | используемые `/api/horse_services*` | Public Read | нет | `401` | `200/404` tenant-scoped |
| `GET` | `/api/prices`, `/api/prices/{slug_or_id}` | Public Read | нет | `401` | `200` своего tenant; `404` чужого tenant/несуществующий |

#### Scenario: Metadata доступна без hydration
- **WHEN** crawler получает HTML list либо detail страницы без клиентского JavaScript
- **THEN** HTML содержит route-specific title, description и canonical без зависимости от удалённых SEO settings

#### Scenario: Анонимный доступ без tenant selector
- **WHEN** запрос к используемому GET выполнен без selector или с неверным значением
- **THEN** API возвращает `401`
