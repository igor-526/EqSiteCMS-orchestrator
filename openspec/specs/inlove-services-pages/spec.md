# Purpose

Зафиксировать SSR-композицию трёх публичных страниц услуг INLOVE (`/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy`) и их detail routes по slug тарифа, включая scoping тарифов к своей странице (allow-list), fallback цен, SEO/canonical, responsive-таблицы и 404-поведение для чужих/несуществующих slug.

## Requirements

### Requirement: Три страницы услуг рендерят SSR-контент по scheme.md
`/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy` SHALL быть SSR-композициями по описанию `scheme.md` («Секции и вёрстка» соответствующей страницы): вводный экран/hero, карточки тарифов, специфичные для страницы блоки (переключатель «Разовые/Абонционные» на zanyatiya; окружение и подготовка/безопасность на progulki; инфраструктура и требования на postoy), преимущества/notice, финальный CTA. Каждая страница SHALL загружать только тарифы, относящиеся к ней по фильтрам, описанным в `scheme.md` (group/name/slug-набор), и не показывать тарифы других страниц.

#### Scenario: Страница услуг заменяет заглушку
- **WHEN** anonymous visitor открывает `/uslugi/zanyatiya`, `/uslugi/progulki` или `/uslugi/postoy`
- **THEN** HTML содержит header/footer, уникальный h1, серверно отрендеренные карточки тарифов страницы и CTA, без сообщения о разработке

#### Scenario: Пустой ответ по тарифам не скрывает CTA
- **WHEN** `GET /api/prices` для тарифов страницы возвращает пустой список
- **THEN** страница показывает «Стоимость уточняется» вместо нулевой цены и сохраняет CTA формы обратной связи

#### Scenario: Ошибка тарифов не блокирует страницу
- **WHEN** запрос тарифов завершается сетевой ошибкой или 5xx
- **THEN** страница показывает error state с retry для блока тарифов, остальной серверный контент страницы остаётся доступным

### Requirement: Detail route тарифа по slug, ограниченный своей страницей
Каждая из трёх страниц услуг SHALL обслуживать `/uslugi/zanyatiya/[slug]`, `/uslugi/progulki/[slug]`, `/uslugi/postoy/[slug]` соответственно, используя `GET /api/prices/{slug_or_id}`. Detail route MUST принимать только slug тарифа, принадлежащего набору тарифов родительской страницы (тот же allow-list, что определяет список карточек). Slug, не входящий в allow-list своей страницы (включая валидный slug тарифа другой группы/страницы того же tenant), MUST возвращать `404` через `notFound()`.

#### Scenario: Валидный slug своей страницы рендерится
- **WHEN** anonymous visitor открывает `/uslugi/progulki/horse-rides-official`
- **THEN** HTML содержит серверно отрендеренные name, description, photos и price_tables тарифа

#### Scenario: Slug чужой страницы недоступен
- **WHEN** anonymous visitor открывает `/uslugi/zanyatiya/<slug-тарифа-постоя>`
- **THEN** Next.js возвращает `404`, даже если `GET /api/prices/{slug_or_id}` для этого slug у backend вернул бы `200`

#### Scenario: Несуществующий или чужой tenant slug
- **WHEN** `GET /api/prices/{slug_or_id}` возвращает `404` для несуществующего или принадлежащего другому tenant slug
- **THEN** Next.js возвращает `404`

### Requirement: SEO и доступ по carte услуг
`/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy` SHALL иметь serverside title/description по `seo.lessons.*`, `seo.rides.*`, `seo.boarding.*` с fallback на `site.short_name` и заголовок страницы, canonical на собственный путь. Detail routes SHALL формировать title/description из полей тарифа (`name`, `description`) и canonical на собственный slug-путь. `GET /api/prices` и `GET /api/prices/{slug_or_id}` SHALL оставаться Public Read: анонимный запрос без/с неверным tenant selector получает `401`, с корректным selector — `200` или `404` по описанным сценариям.

| Method | Path | Access class | Роли | Без/с неверным selector | С корректным selector |
|---|---|---|---|---|---|
| `GET` | `/api/prices` | Public Read | нет | `401` | `200` |
| `GET` | `/api/prices/{slug_or_id}` | Public Read | нет | `401` | `200` своего tenant; `404` чужого tenant/несуществующий |

#### Scenario: Metadata доступна без hydration
- **WHEN** crawler получает HTML любой из шести страниц (3 списка + 3 detail) без выполнения клиентского JavaScript
- **THEN** HTML содержит route-specific title, description и canonical

#### Scenario: Анонимный доступ без tenant selector
- **WHEN** запрос к `GET /api/prices` или `GET /api/prices/{slug_or_id}` выполнен без `X-Equestrian-Service-Key` или с неверным значением
- **THEN** API возвращает `401`

### Requirement: Адаптивная вёрстка страниц услуг
Список и detail каждой из трёх страниц SHALL быть адаптивными: desktop — две колонки и полноценные таблицы price_tables; mobile — одна колонка, таблица преобразуется в пары «параметр — значение» либо получает управляемый горизонтальный скролл. Detail route наследует тот же адаптивный паттерн таблиц, что и список.

#### Scenario: Мобильная раскладка таблицы тарифа
- **WHEN** страница услуги или её detail route открыта на viewport мобильной ширины
- **THEN** `price_tables` отображается как пары «параметр — значение» либо в контейнере с управляемым горизонтальным скроллом, без горизонтального скролла всей страницы
