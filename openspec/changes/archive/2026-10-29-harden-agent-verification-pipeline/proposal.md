# Проверяемый агентный пайплайн

## Why
Анализ восьми архивов выявил повторяемые UI/wire/transaction findings, противоречивые verification-правила, остановки на зависимых fixtures и одноразовую тестовую инфраструктуру. Нужно перенести конкретные acceptance-проверки к исполнителям и сделать затраты измеримыми, сохранив независимый QG; экономия заранее не доказана.

Вход: [задача 109](../../../docs/tasks/109_agent_pipeline_hardening.md), [анализ](../../../.qa/pipeline-analysis/analysis.md), прочитан целиком.

## What Changes
- Ввести exact-reproducer-first, scoped FE self-check и prerequisites/risk/unit/evidence matrix.
- Согласовать одну verification policy, ownership зависимых tests/fixtures и соразмерное дробление; убрать whitespace-only циклы.
- Расширить существующий browser runner проверками реального focus/keyboard/contrast/geometry, добавить постоянные безопасные PG/NATS helpers и paired wire harness; переиспользовать уже существующие регрессии, не чинить продукт 106–107.
- Дополнить stackctl недостающими SEO aliases и безопасным discovery published URLs, сохранив поддержанные Яндекс/Метрика aliases и существующие гарантии.
- Дедуплицировать QG evidence, назначить конечные scenario IDs/stop conditions, отличать внешний OAuth gap от tooling defect.
- Добавить offline usage/ledger tooling: считать сессии отдельно от продолжений, cache отдельно от output/денег/квот, хранить только обезличенные allowlisted поля.

## Capabilities

### New Capabilities
- `agent-acceptance-tooling`: переиспользуемые browser, paired HTTP/NATS и isolated PG acceptance helpers; это test/tooling capability, не runtime API.
- `agent-pipeline-measurement`: безопасный offline сбор usage и процессных метрик с явной полнотой и отсутствующими данными.

### Modified Capabilities
- `repository-process-tooling`: единая staged verification policy вместо противоречивых полных прогонов; ограниченная поддержка SEO в stackctl.
- `openspec-workflow`: prerequisites, closure ownership, exact reproducer, scoped self-check, evidence ownership и конечность QG.

## Impact
Изменяются только агентные правила, применимые howto/skills, root QA/stack tooling и необходимые tests/tooling в `seo-service` и `ya-metrica-service`. Production source/схема/AsyncAPI/Compose не меняются; `yandex-service` читается как producer и не редактируется. Endpoint changes отсутствуют: access matrix и anonymous/authenticated HTTP acceptance этого change — `N/A`; действующая access policy не меняется.

Один change оправдан общим контрактом evidence и shared harness: deliverables независимо проверяемы, не требуют новых продуктовых решений. Внешний vendor OAuth и сбор нескольких будущих сопоставимых changes не являются условиями завершения реализации tooling: их отсутствие явно отражается как gap/недостаточная выборка, не как PASS продуктового покрытия. Тестовые destructive операции требуют отдельного разрешения и изоляции; approval этого proposal его не даёт.

Чужой dirty baseline исключён из ownership. Реализация, runtime suites, sync/archive и финализация на этапе планирования не выполняются. После strict validation — пользовательский approval gate.
