## MODIFIED Requirements

### Requirement: Frontend test matrix
Frontend deliverable MUST обеспечивать изолированное автоматизированное покрытие и browser Manual QA behavior diff по матрице сценария «Матрица frontend-проверок».

#### Scenario: Полный frontend gate
- **WHEN** Quality Gate проверяет frontend deliverable
- **THEN** проходят `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, permission/access/MSW/pagination проверки и no-`site-*` mixing review

#### Scenario: Матрица frontend-проверок
- **WHEN** Quality Gate сверяет frontend deliverable
- **THEN** Frontend deliverable MUST иметь MSW/Vitest coverage без live backend calls и browser Manual QA для behavior diff.

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| protected `/horses` и tabs | новая вкладка перед породами | component + route/manual | anonymous redirect, authenticated render | `npm test`, browser |
| types/api/service/hook групп | CRUD/list/detail, normalization, errors | unit + MSW API-boundary | success/empty/400/401/403/generic | `npm test`, `npx tsc --noEmit` |
| таблица групп | data/loading/empty/error, filter/sort/paging/actions | component | scope present/missing | `npm test` |
| modal групп + Page Editor | create/update/delete/page_data, guard/invalidation | component + MSW | Protected Write, double-submit, 401/403 | `npm test`, browser |
| таблица пород | group render/filter/sort и порядок колонок | component regression | Public Read data in protected UI | `npm test` |
| modal пород | nullable selector assign/clear | component + MSW | scope guard, 401/403 | `npm test`, browser |
| architecture boundary | отсутствие `site-*` mixing/live calls | static review | CMS admin vs consumer | `rg`, lint/build |
