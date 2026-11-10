# Delta — идентичность тестовых модулей Метрики

## Purpose

Обеспечивать воспроизводимую полную и целевую collection тестов Метрики при совпадающих basename unit/integration модулей, сохраняя все проверки и отделение инфраструктурных операций.

## ADDED Requirements

### Requirement: Однозначная collection без исключений
Pytest suite Метрики SHALL собирать оба `test_maintenance_topology.py` как разные модули в полном и целевом запуске. Устранение collision MUST NOT удалять тесты, скрывать integration directory, менять markers, ослаблять assertions либо автоматически подключаться к PG/NATS.

#### Scenario: COL-01 Исходная ошибка
- **WHEN** запускается collection полного suite с текущими unit/integration basename
- **THEN** before фиксирует исходный import-file mismatch либо явно unreproduced; after собирает оба набора с сохранёнными node IDs и количеством функций

#### Scenario: COL-02 Default suite
- **WHEN** запускается `make test` с фильтром `not infrastructure`
- **THEN** collection не падает на basename и infrastructure cases не исполняются; прочие реальные failures не скрываются и не переименовываются в PASS

#### Scenario: COL-03 Целевые узлы и независимые fixtures
- **WHEN** отдельно собираются оба topology модуля и четыре прежних PG task-list node IDs
- **THEN** test identity и conftest поведение сохранены, collection не является runtime acceptance и не требует permit на реальные подключения
