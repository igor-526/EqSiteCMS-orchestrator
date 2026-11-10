# Spec Delta

## ADDED Requirements

### Requirement: Регистрация acceptance истории Метрики
Infra runner SHALL допускать change `seo-metrica-task-monitor` только для PostgreSQL ya-metrica-service и тестов `tests/integration/test_metrica_task_list_postgres.py`, сохраняя прежние регистрации. Evidence SHALL сохраняться в `.qa/<проверенный change>/INFRA-1/<runId>/`. Произвольные change, service, kind или test path MUST отклоняться до подключения; действующие permit/изоляция/expiry/cleanup guards MUST сохраняться.

#### Scenario: TOOL-01 Допустимая регистрация
- **WHEN** выполнен offline preflight зарегистрированного PG сценария нового change с согласованным permit и endpoint metadata
- **THEN** результат означает только offline-preflight-only; путь evidence принадлежит новому change, старые регистрации продолжают работать

#### Scenario: TOOL-02 Fail closed
- **WHEN** подменены change, path, kind=nats, service, scope/expiry permit либо endpoint
- **THEN** guard отказывает до подключения; обход через arbitrary argv/path или запись за пределы .qa зарегистрированного change невозможны
