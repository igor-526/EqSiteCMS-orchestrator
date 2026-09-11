## ADDED Requirements

### Requirement: Страница «Наши лошади» рендерит SSR-контент по scheme.md
`/loshadi` SHALL быть SSR-композицией по описанию `scheme.md`: введение, сетка карточек лошадей из `GET /api/horses?this_stable=true&sort=name` (главное фото, кличка, описание, непустые характеристики), CTA. Desktop показывает 3–4 карточки в ряд, tablet — 2, mobile — 1.

#### Scenario: Страница лошадей заменяет заглушку
- **WHEN** anonymous visitor открывает `/loshadi`
- **THEN** HTML содержит header/footer, уникальный h1, серверно отрендеренную сетку карточек лошадей и CTA, без сообщения о разработке

#### Scenario: Пустой каталог показывает fallback
- **WHEN** `GET /api/horses?this_stable=true&sort=name` возвращает пустой список
- **THEN** страница показывает `horses.empty_text` с fallback «Скоро познакомим вас с лошадьми клуба» и сохраняет CTA

### Requirement: Detail route лошади по slug, ограниченный this_stable
`/loshadi` SHALL обслуживать `/loshadi/[slug]`, используя `GET /api/horses/{slug_or_id}`. Detail route MUST после получения DTO проверить `this_stable === true` и вызывать `notFound()`, если поле отсутствует или равно `false`, независимо от того, что сам backend endpoint не применяет фильтр `this_stable` и вернул бы `200` для такой лошади.

#### Scenario: Валидная публичная лошадь рендерится
- **WHEN** anonymous visitor открывает `/loshadi/<slug-лошади-с-this_stable-true>`
- **THEN** HTML содержит серверно отрендеренные name, pedigree_name, description, breed, coat_color, height, sex, bdate_formatted, age, photos, services

#### Scenario: Приватная посто́йная лошадь недоступна по прямому URL
- **WHEN** anonymous visitor открывает `/loshadi/<slug-лошади-с-this_stable-false-или-null>`
- **THEN** Next.js возвращает `404`, даже если `GET /api/horses/{slug_or_id}` для этого slug у backend вернул бы `200`

#### Scenario: Несуществующий или чужой tenant slug
- **WHEN** `GET /api/horses/{slug_or_id}` возвращает `404` для несуществующего или принадлежащего другому tenant slug
- **THEN** Next.js возвращает `404`

### Requirement: SEO и доступ страницы лошадей
`/loshadi` SHALL иметь serverside title/description по `seo.horses.title`/`seo.horses.description` с fallback на заголовок страницы и default description, canonical `/loshadi`. Detail route SHALL формировать title/description из полей лошади (`name`, `pedigree_name`, `description`) и canonical на собственный slug-путь. `GET /api/horses` и `GET /api/horses/{slug_or_id}` SHALL оставаться Public Read.

| Method | Path | Access class | Роли | Без/с неверным selector | С корректным selector |
|---|---|---|---|---|---|
| `GET` | `/api/horses` | Public Read | нет | `401` | `200` |
| `GET` | `/api/horses/{slug_or_id}` | Public Read | нет | `401` | `200` своего tenant (при `this_stable=true`, применяется на стороне сайта); `404` чужого tenant/несуществующий |

#### Scenario: Metadata доступна без hydration
- **WHEN** crawler получает HTML `/loshadi` или `/loshadi/[slug]` без выполнения клиентского JavaScript
- **THEN** HTML содержит route-specific title, description и canonical

#### Scenario: Анонимный доступ без tenant selector
- **WHEN** запрос к `GET /api/horses` или `GET /api/horses/{slug_or_id}` выполнен без `X-Equestrian-Service-Key` или с неверным значением
- **THEN** API возвращает `401`

### Requirement: Адаптивная вёрстка страницы лошадей
Сетка карточек и detail route SHALL быть адаптивными: desktop 3–4 карточки в ряд, tablet — 2, mobile — 1 карточка. Detail route на mobile сохраняет последовательный порядок фото → характеристики → описание → CTA.

#### Scenario: Мобильная раскладка сетки
- **WHEN** `/loshadi` открыта на viewport мобильной ширины
- **THEN** карточки лошадей отображаются в одну колонку без горизонтального скролла страницы
