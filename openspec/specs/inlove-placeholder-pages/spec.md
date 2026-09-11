# Purpose

Зафиксировать публичную карту маршрутов INLOVE, четыре сохраняемые заглушки и серверные metadata.

## Requirements

### Requirement: Карта сайта обслуживает семь публичных маршрутов
Сайт SHALL обслуживать `/`, `/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy`, `/loshadi`, `/novosti` и `/about` внутри общей оболочки с одним route-specific h1. `/`, `/novosti`, `/about` MUST содержать полноценные SSR-композиции по capabilities `inlove-content-pages` и `inlove-news-pages`; четыре остальных маршрута MUST сохранять сообщение о разработке. Дополнительно MUST обслуживаться только утверждённый detail route `/novosti/[slug]` с опубликованными новостями.

#### Scenario: Контентные страницы заменяют три заглушки
- **WHEN** anonymous visitor открывает `/`, `/novosti` или `/about`
- **THEN** HTML содержит header/footer, уникальный h1 и контент страницы без сообщения о разработке

#### Scenario: Остальные заглушки сохраняются
- **WHEN** anonymous visitor открывает один из трёх service routes или `/loshadi`
- **THEN** успешный HTML сохраняет header/footer, route-specific h1 и сообщение о разработке

#### Scenario: Неутверждённый маршрут остаётся 404
- **WHEN** anonymous visitor открывает путь вне семи основных маршрутов и опубликованных `/novosti/[slug]`
- **THEN** Next.js возвращает 404 без создания других detail routes или CMS-only flow

### Requirement: Placeholder pages имеют route-specific metadata
Каждый утверждённый основной маршрут SHALL иметь title и description по карте `scheme.md`; SEO settings SHALL использоваться с документированным fallback, canonical MUST соответствовать маршруту и странице пагинации. Metadata MUST формироваться сервером. News detail SHALL использовать metadata capability `inlove-news-pages`.

#### Scenario: Metadata доступна без hydration
- **WHEN** crawler получает HTML утверждённой страницы без выполнения клиентского JavaScript
- **THEN** HTML содержит route-specific title, description и canonical без зависимости от browser fetch
