## ADDED Requirements

### Requirement: Acceptance prerequisites до выполнения
Planner SHALL фиксировать риск → scenario → unit → evidence owner → prerequisites → stop condition. Отсутствие внешнего OAuth/ролей, инструментов, изолированных PG/NATS и разрешения на test cleanup SHALL различаться. Необеспеченная ключевая проверка SHALL приводить к решению о подготовке, переносе или явном gap до дорогого выполнения.

#### Scenario: Внешний vendor OAuth недоступен
- **WHEN** acceptance требует vendor credentials, которых нет
- **THEN** внешний gap остаётся явно непроверенным; синтетический контракт не объявляется real OAuth coverage, пользователь решает о риске

#### Scenario: Исправимый tooling blocker
- **WHEN** необходимые aliases или assertions runner отсутствуют
- **THEN** planner назначает конкретный tooling deliverable с тестами и зависимостями либо фиксирует отдельный scope decision; blocker не маскируется под внешнюю зависимость

### Requirement: Ownership closure завершённого slice
Ownership unit SHALL включать непосредственно зависимые tests, fixtures, wiring и генерируемые inventories. Бюджет ~5–12 существенных действий SHALL оставаться эвристикой контекста, не счётчиком файлов; split SHALL основываться на реальном превышении или blocker, не на двух связанных fixtures. Несвязанные pre-existing изменения MUST NOT включаться автоматически.

#### Scenario: Контракт меняет тестовую fixture
- **WHEN** реализация требует обновить зависимый DTO test или migration fixture
- **THEN** зависимый путь уже принадлежит тому же владельцу либо предварительно передаётся ему без параллельной записи; отдельный checkpoint-unit не создаётся

#### Scenario: Обоснованный circuit breaker
- **WHEN** исполнитель обнаружил превышение бюджета контекста или нового архитектурного slice
- **THEN** он сдаёт безопасную атомарную часть с partial причиной и bounded split; требования продолжать героически нет

### Requirement: Exact reproducer для fix
Fix unit SHALL до исправления выполнить точный исходный reproducer и сохранить FAIL, после — PASS в эквивалентной среде и targeted regression. Scenario/input/keys/DOM path/status и revision SHALL быть трассируемыми. Замена реального browser/PG/NATS на mock MUST NOT закрывать исходный finding.

#### Scenario: Space и Escape не эквивалентны абстрактному Escape
- **WHEN** finding описывает Space → Escape внутри вложенного wizard
- **THEN** проверяется эта последовательность и состояние обоих слоёв; общий component test не является evidence закрытия

#### Scenario: Исходный FAIL не воспроизводится
- **WHEN** окружение отсутствует либо точный reproducer уже проходит до fix
- **THEN** исполнитель сообщает blocked/unreproduced с причиной и наблюдением; не выдаёт искусственно сломанный тест за исходный FAIL и не заявляет проверенное закрытие

### Requirement: Scoped self-check до QG
Frontend SHALL выполнять краткий browser self-check изменённых механизмов до первого QG; Backend SHALL предоставлять применимые paired wire и real transaction/topology acceptance. Owner tests SHALL оставаться запускаемыми в проекте. Self-check MUST NOT заменять независимый QG или дублировать весь browser gate.

#### Scenario: Передача UI изменений
- **WHEN** diff меняет controls, modals или tables CMS
- **THEN** исполнитель сообщает выбранные Chromium 1366×768 scenario IDs и evidence contrast/keyboard/focus/scroll по рискам; неприменимые механизмы объяснены

#### Scenario: Передача wire или recovery изменений
- **WHEN** diff затрагивает DTO/envelope, recovery transaction либо startup topology
- **THEN** owner передаёт production producer→consumer checks, real-PG rollback/recovery или existing-topology негативные проверки соответственно; mock-only coverage не заменяет их

### Requirement: Конечный и недублирующий QG
Перед запуском QG SHALL иметь реестр scenario IDs с одним владельцем evidence, prerequisites, бюджетом и stop condition. Соседние lanes SHALL ссылаться на общее доказательство и проверять свою границу, не воспроизводить одно finding независимо без причины. QG SHALL независимо исполнять owner tests и дополнять их по риску, не принимать owner PASS на веру.

#### Scenario: Один identity finding в двух lanes
- **WHEN** BE и CONTRACTS проверяют пересекающееся NATS свойство
- **THEN** один назначенный lane воспроизводит его, второй проверяет достаточность evidence и свою часть контракта; дублирующий harness не строится

#### Scenario: Исчерпан бюджет или повторный раунд
- **WHEN** конечный набор выполнен, возник ключевой blocker, исчерпан бюджет либо после единственного recheck finding остаётся открытым
- **THEN** lane останавливается с passed/failed/unchecked и причинами; SYNTH не скрывает gap, Router передаёт решение пользователю, а не расширяет сценарии бесконечно
