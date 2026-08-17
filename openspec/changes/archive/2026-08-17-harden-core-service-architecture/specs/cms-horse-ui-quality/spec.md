## ADDED Requirements

### Requirement: Детерминированный CMS typecheck
CMS frontend SHALL генерировать Next types и выполнять typecheck/build без гонки за общей изменяемой `.next`; standalone typecheck MUST быть воспроизводим на clean checkout и параллельный release orchestration не должен удалять его inputs.

#### Scenario: Clean typecheck
- **WHEN** запускается документированная CMS typecheck command на clean workspace
- **THEN** required generated types создаются детерминированно и TypeScript завершается без missing `.next/types` errors

### Requirement: Blocking ESLint rollout
CMS SHALL перейти от 401 warning к blocking lint через pilot scope, затем отдельный rollout `prices`, `gallery`, `news`, `siteSettings`. Затронутые API status branches MUST использовать `src/lib/apiStatus.ts` (`API_STATUS`, `isApiSuccess`, `isApiError`); blanket suppressions MUST NOT заменять исправления.

#### Scenario: Pilot завершён
- **WHEN** pilot auth/API и horses files проверяются
- **THEN** semantic warnings исправлены, behavior tests зелёные и rules повышены до error в pilot

#### Scenario: Feature rollout завершён
- **WHEN** очередная feature из prices/gallery/news/siteSettings мигрирована
- **THEN** её lint/tests/typecheck проходят до начала следующей feature, а финальный `npm run lint` имеет 0 errors/согласованный 0-warning scope

### Requirement: Behavior-oriented decomposition CMS hotspots
Hotspots `HorsesDeveloperDocumentationView`, `PriceEditModal`, `PricesDeveloperDocumentationView` и `useHorsesPage` SHALL декомпозироваться по responsibilities только вместе с regression tests behavior diff; механическое перемещение строк MUST NOT считаться завершением.

#### Scenario: Horse/price behavior сохранён
- **WHEN** hotspot разбит на hooks/components/helpers
- **THEN** tests покрывают loading/data/empty/error, interactions, validation, success invalidation, pagination `limit/offset`, scopes и `401/403`
