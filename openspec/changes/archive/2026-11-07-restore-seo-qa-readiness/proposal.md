# Proposal — восстановление проверочной инфраструктуры SEO

## Why

После `docs/tasks/110_seo_tasks.md` продуктовые blocking/minor findings закрыты, но итоговый SEO QG остаётся BLOCKED: не предоставлена изолированная PG/API среда, не завершены инструментальные проверки, full suite Метрики останавливается на pre-existing collection collision. Новый запрос пользователя «Сделай» разрешает планирование отдельного scope, но не применение этого плана и не runtime mutations.

## What Changes

- Уточнить контракт root contrast helper: корректно вычислять поддерживаемые случаи, сохранять fail-closed границу сложного paint, выдавать безопасную причину unsupported без выдуманных ratios и снижения порогов.
- Диагностировать противоречивый POST matcher конечными synthetic cases в существующем browser tooling; исправлять только доказанный harness/locator дефект, не предполагаемый product-disabled defect. Явный retry проверять отдельно от enabled.
- Подготовить переиспользуемый offline readiness-профиль и операционный runbook для выделенной PG/API среды, actors A/B, persisted fixtures и разрешений. Использовать существующий guarded PG runner; не создавать второй smoke/lifecycle harness.
- Устранить collision `tests/{unit,integration}/test_maintenance_topology.py` через явный pytest import mode с регрессией collection, не исключая тесты.
- Зафиксировать smoke skill disk/runtime различие и процедуру передачи внешнему владельцу DSH. Изменения `dsh/**`, его catalog/preset и pre-existing diff не входят в этот change.
- Ограничить прежний card/forbidden contrast отдельным backlog решением без palette refactor. Не изменять ранее закрытые modal contrast cases.

## Capabilities

### New Capabilities

- `qa-readiness-profile`: безопасная offline подготовка и допуск выделенной PG/API acceptance-среды; разделение code approval, exact runtime permit и внешней доступности smoke skill.
- `python-test-collection`: однозначная идентичность unit/integration модулей Метрики при полном и целевом pytest запуске.

### Modified Capabilities

- `agent-acceptance-tooling`: уточнение computed contrast boundary и доказательной диагностики retry matcher на существующей synthetic инфраструктуре.

## Impact

Root: точечные `scripts/qa/browser/**`, `scripts/tests/qa-browser.test.mjs`, новые readiness-документы/validator/tests и повторно используемый fixture retry case. Метрика: `pyproject.toml` и ограниченная collection regression. Изменений product API, DTO, БД, миграций, workers, NATS/AsyncAPI или frontend UI нет; access policy сохраняется, контрольная матрица приведена в design и delta readiness.

Чужие изменения root infra/shipping/SERVICES и `dsh` не присваиваются. `seo-metrica-task-monitor`, его tasks/specs/report не редактируются, не sync/archive/finalize. Этот change не обещает SEO acceptance PASS: повторное назначение прежних lanes и их лимитов — отдельное решение Router после новых prerequisites. Evidence: `.qa/restore-seo-qa-readiness/<unit>/`; единственный будущий QG report — `docs/reports/restore-seo-qa-readiness.md`.

**Approval gate:** до явного approval новых apply-ready артефактов — только планирование. Даже после approval запрещены DB/role/volume/ACL creation/deletion, HTTP/POST, migrations, Docker setup/cleanup и queue/binding mutations без отдельного exact согласия на target/resources/actions/expiry/isolation. Реальные vendor accounts/парсинг не входят в scope.
