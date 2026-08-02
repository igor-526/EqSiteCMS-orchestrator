## 1. Защита исходного состояния

- [x] 1.1 Зафиксировать `git status --short` и path manifest задачи 023, исключив изменения задачи 022 и прочие пользовательские изменения
- [x] 1.2 Проверить наличие OpenSpec 1.5.0, healthy `openspec doctor` и apply-ready статус `integrate-openspec-workflow`

## 2. Общие правила workflow — Backend/tooling субагент

- [x] 2.1 Обновить `AGENTS.md`: заменить legacy planning flow на `docs/tasks → propose → user approval → apply → общий Quality Gate → sync → archive`
- [x] 2.2 Обновить `AGENTS.md`: закрепить Router-only роль, обязательных профильных субагентов, ограниченный размер заданий, ownership файлов и anti-awaiting follow-up
- [x] 2.3 Обновить `AGENTS.md`: сохранить API Access Policy и обязательную access matrix для endpoint changes на всех стадиях
- [x] 2.4 Создать корневой `CLAUDE.md` как короткий указатель на обязательное чтение `AGENTS.md` без дублирования правил
- [x] 2.5 Обновить `agents/planner.md`: создавать русскоязычные apply-required OpenSpec-артефакты вместо новых `docs/plans`, запускать status/validate и останавливаться на approval gate
- [x] 2.6 Обновить `agents/backend.md`: принимать только подтверждённые OpenSpec tasks, соблюдать ownership/check-off и возвращать завершённый deliverable Router
- [x] 2.7 Обновить `agents/quality_gate.md`: выполнять один общий review после всех исполнителей, проверять OpenSpec/API policy, сохранять report и требовать повторную проверку findings
- [x] 2.8 Обновить `openspec/config.yaml`: закрепить русский язык артефактов и обязательные правила workflow, access matrix, evidence и декомпозиции

## 3. Профильные правила — независимые субагенты

- [x] 3.1 Frontend субагент: обновить `agents/frontend.md` для подтверждённых OpenSpec tasks, frontend test matrix, ownership и передачи результата общему Quality Gate
- [x] 3.2 Site Consumer субагент: обновить `agents/site_consumer.md` для подтверждённых OpenSpec tasks, Public Read/SSR/SEO границ и передачи результата общему Quality Gate
- [x] 3.3 Backend/tooling субагент: сверить перекрёстные ссылки `AGENTS.md`, `CLAUDE.md`, `agents/*.md` и удалить активные указания создавать новые планы в `docs/plans`
- [x] 3.4 Backend/tooling субагент: выполнить документационные self-checks и `openspec validate integrate-openspec-workflow --type change --strict` без создания формального промежуточного QG report

## 4. Manifest исторических задач — отдельные ограниченные пакеты

- [x] 4.1 Backend/tooling субагент: создать единый traceability manifest для `docs/tasks/001_*.md`–`008_*.md` со связанными plans/reports, сервисом, capability, evidence и статусом
- [x] 4.2 Backend/tooling субагент: дополнить manifest задачами `009_*.md`–`016_*.md` без изменения строк 001–008
- [x] 4.3 Backend/tooling субагент: дополнить manifest задачами `017_*.md`–`023_*.md` без изменения строк 001–016
- [x] 4.4 Quality reviewer субагент: проверить ровно 23 уникальные строки, непрерывность 001–023, ссылки, статусы `implemented|partial|superseded|unknown` и отсутствие утверждений без evidence
- [x] 4.5 Planner субагент: на основе проверенного manifest определить capability-пакеты, владельца каждого spec и зарегистрировать gaps для `partial|superseded|unknown`

## 5. Backfill backend capabilities

- [x] 5.1 Backend субагент: создать русскоязычные delta specs первого backend-пакета по назначенным capabilities и evidence из кода/tests/reports
- [x] 5.2 Backend субагент: создать русскоязычные delta specs второго backend-пакета по непересекающимся capabilities и evidence
- [x] 5.3 Backend reviewer субагент: проверить backend specs на фактическое поведение, Clean Architecture, БД/события и отсутствие дублированных требований
- [x] 5.4 Backend reviewer субагент: проверить access matrix каждого endpoint capability, anonymous/authenticated сценарии и причины всех исключений
- [x] 5.5 Backend/tooling субагент: валидировать, синхронизировать и архивировать проверенные backend backfill changes пакетами

## 6. Backfill CMS frontend capabilities

- [x] 6.1 Frontend субагент: создать русскоязычные delta specs первого CMS frontend-пакета по назначенным capabilities и evidence из кода/tests/reports
- [x] 6.2 Frontend субагент: создать русскоязычные delta specs второго CMS frontend-пакета по непересекающимся capabilities и evidence
- [x] 6.3 Frontend reviewer субагент: проверить specs на admin auth/scopes, Protected Write UX, pagination, MSW/no-live-backend и отсутствие `site-*` mixing
- [x] 6.4 Frontend/tooling субагент: валидировать, синхронизировать и архивировать проверенные frontend backfill changes пакетами

## 7. Backfill site-consumer и process capabilities

- [x] 7.1 Site Consumer субагент: создать русскоязычные delta specs consumer capabilities по Public Read, SSR/SSG/ISR и SEO evidence
- [x] 7.2 Site Consumer reviewer субагент: проверить отсутствие CMS-only endpoint, корректность anonymous GET и фактическое соответствие site-ad
- [x] 7.3 Backend/tooling субагент: создать русскоязычные delta specs process/tooling capabilities по агентным и инфраструктурным историческим задачам
- [x] 7.4 Process reviewer субагент: проверить process specs, зарегистрированные gaps и отсутствие runtime-контрактов без evidence
- [x] 7.5 Backend/tooling субагент: валидировать, синхронизировать и архивировать проверенные consumer/process backfill changes пакетами

## 8. Сверка main specs и трассировки

- [x] 8.1 Quality reviewer субагент: сопоставить main specs с manifest и подтвердить покрытие 23/23 либо явный gap для каждой задачи
- [x] 8.2 Quality reviewer субагент: найти и устранить через профильных владельцев дубли, противоречия и расхождения access contract между capabilities
- [x] 8.3 Backend/tooling субагент: проверить идемпотентность повторной sync и выполнить полную OpenSpec validation main specs и активных changes; воспроизводимые команды, SHA-256 и нулевой diff зафиксированы в [sync-idempotence-evidence.md](sync-idempotence-evidence.md)

## 9. Единый Quality Gate и завершение

- [x] 9.1 Quality Gate: проверить совокупный path-scoped diff задачи 023 и подтвердить отсутствие runtime-изменений в `services/backend`, `services/frontend`, `services/site-ad`
- [x] 9.2 Quality Gate: проверить единообразие workflow в `AGENTS.md`, `CLAUDE.md`, `agents/*.md`, русский язык артефактов и запрет новых реализационных `docs/plans`
- [x] 9.3 Quality Gate: проверить Router/profile/subagent ownership, approval gate, anti-awaiting и единый QG lifecycle по OpenSpec specs
- [x] 9.4 Quality Gate: проверить access governance, 23/23 traceability, evidence, gaps, validation и идемпотентную sync
- [x] 9.5 Quality Gate: сохранить единый отчёт `docs/reports/023_openspec_integration-review.md` с findings и вердиктом
- [x] 9.6 Router: вернуть findings соответствующим профильным субагентам, дождаться доработок и запустить повторный Quality Gate
- [x] 9.7 Quality Gate: обновить единый отчёт итоговым успешным вердиктом после устранения всех blocking findings
- [x] 9.8 Backend/tooling субагент: синхронизировать delta specs `integrate-openspec-workflow` в main specs и подтвердить повторную validation
- [x] 9.9 Router: архивировать `integrate-openspec-workflow` только после выполненных tasks, успешного Quality Gate и синхронизации specs
