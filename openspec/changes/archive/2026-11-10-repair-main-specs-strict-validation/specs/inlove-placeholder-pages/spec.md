# Изменения спецификации

## MODIFIED Requirements

### Requirement: Карта сайта обслуживает семь публичных маршрутов
Сайт SHALL обслуживать семь основных публичных маршрутов полноценными SSR-композициями в общей оболочке с одним route-specific h1, без плейсхолдеров. Точный перечень основных и утверждённых detail routes и их capabilities MUST соответствовать сценарию «Полная карта SSR-маршрутов и их capabilities».

#### Scenario: Все семь основных маршрутов содержат контент
- **WHEN** anonymous visitor открывает `/`, `/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy`, `/loshadi`, `/novosti` или `/about`
- **THEN** HTML содержит header/footer, уникальный h1 и серверно отрендеренный контент страницы без сообщения о разработке

#### Scenario: Неутверждённый маршрут остаётся 404
- **WHEN** anonymous visitor открывает путь вне семи основных маршрутов и вне утверждённых detail routes (`/novosti/[slug]`, `/uslugi/zanyatiya/[slug]`, `/uslugi/progulki/[slug]`, `/uslugi/postoy/[slug]`, `/loshadi/[slug]`)
- **THEN** Next.js возвращает 404 без создания других detail routes или CMS-only flow

#### Scenario: Полная карта SSR-маршрутов и их capabilities
- **WHEN** сайт разрешает основной публичный маршрут или утверждённый detail route
- **THEN** Сайт SHALL обслуживать `/`, `/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy`, `/loshadi`, `/novosti` и `/about` внутри общей оболочки с одним route-specific h1. Все семь маршрутов MUST содержать полноценные SSR-композиции: `/`, `/novosti`, `/about` — по capabilities `inlove-content-pages` и `inlove-news-pages`; `/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy` — по capability `inlove-services-pages`; `/loshadi` — по capability `inlove-horses-pages`. Плейсхолдеров (`UnderConstructionPage`) среди семи основных маршрутов больше нет. Дополнительно MUST обслуживаться утверждённые detail routes: `/novosti/[slug]` с опубликованными новостями, `/uslugi/zanyatiya/[slug]`, `/uslugi/progulki/[slug]`, `/uslugi/postoy/[slug]` с тарифами по правилам `inlove-services-pages`, `/loshadi/[slug]` с лошадьми по правилам `inlove-horses-pages`.
