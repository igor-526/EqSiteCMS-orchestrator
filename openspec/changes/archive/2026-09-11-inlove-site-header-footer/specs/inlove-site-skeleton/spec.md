## MODIFIED Requirements

### Requirement: Каркас сохраняет интеграционный слой CMS и получает первый презентационный слой
`site-ksk-inlove` SHALL сохранять Next.js/App Router toolchain на Next.js `15.5.25`, API client/wrappers, DTO, data services, site-settings provider/context/hook и observability plumbing. Он SHALL дополнительно содержать брендовый UI-каталог INLOVE, общую layout-оболочку, семь placeholder routes и универсальную callback form в границах соответствующих capabilities. Он MUST NOT содержать маршруты вне утверждённой карты, CMS admin UI, CMS-only endpoint usage или brand-bound data services, дублирующие профильные API.

#### Scenario: Retained API и hook доступны разработчику
- **WHEN** проект устанавливается и проходит typecheck
- **THEN** Public Read wrappers, типы и `useSiteSettings` с provider/service доступны компонентам без CMS credentials

#### Scenario: Утверждённые страницы заменяют технический baseline
- **WHEN** production server получает `GET` одного из семи утверждённых routes
- **THEN** он возвращает пользовательскую placeholder page с общей оболочкой и metadata
- **AND** неизвестный route по-прежнему возвращает `404`
