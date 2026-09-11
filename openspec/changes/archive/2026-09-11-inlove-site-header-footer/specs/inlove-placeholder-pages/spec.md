## ADDED Requirements

### Requirement: Карта сайта обслуживает семь публичных маршрутов
Сайт SHALL обслуживать `/`, `/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy`, `/loshadi`, `/novosti` и `/about`. Каждый маршрут MUST рендериться сервером внутри общей оболочки и содержать ровно один уникальный `h1` и понятную заглушку о том, что раздел находится в разработке.

#### Scenario: Каждый маршрут возвращает placeholder page
- **WHEN** anonymous visitor открывает любой маршрут утверждённой карты
- **THEN** ответ успешен и исходный HTML содержит header, footer, route-specific `h1` и сообщение о разработке раздела

#### Scenario: Неутверждённый маршрут остаётся 404
- **WHEN** anonymous visitor открывает путь вне утверждённой карты
- **THEN** Next.js возвращает `404`, не создавая detail route или CMS-only flow

### Requirement: Placeholder pages имеют route-specific metadata
Каждый утверждённый маршрут SHALL иметь title и description по карте `scheme.md`; доступные SEO settings SHALL использоваться с документированным fallback, а canonical MUST соответствовать маршруту. Metadata MUST формироваться сервером.

#### Scenario: Metadata доступна без hydration
- **WHEN** crawler получает HTML утверждённой страницы без выполнения клиентского JavaScript
- **THEN** HTML содержит route-specific title, description и canonical без зависимости от browser fetch
