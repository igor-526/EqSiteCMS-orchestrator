# agent-pipeline-measurement Specification

## Purpose
Давать воспроизводимую offline оценку расхода и повторов агентного пайплайна по разрешённым usage-событиям и обезличенному execution ledger, без вывода секретов и необоснованного приравнивания токенов к квотам или цене.

## Requirements

### Requirement: Однократный учёт usage
Offline collector SHALL учитывать usage завершённых assistant/message однократно, не суммируя повторно chunks, tool results и step/end. Результат SHALL разделять total/input/output/cache-read/cache-write по ролям и показывать отсутствующие поля как неизвестные, а не нули.

#### Scenario: Смешанный поток событий
- **WHEN** вход содержит завершённое сообщение, его повтор с тем же event/message identity, streaming chunks и step/end
- **THEN** usage сообщения учитывается один раз; конфликтующие значения одной identity дают ошибку, неподдерживаемая схема — явную диагностику без PASS

#### Scenario: У провайдера нет cache-write
- **WHEN** поле cache-write не передано
- **THEN** агрегат отмечает неполноту и unknown; totalTokens не используется для восстановления отсутствующего поля

### Requirement: Процессные метрики и их знаменатели
Ledger SHALL различать сессии, продолжения и execution units; partial причины scope/ownership/infrastructure/other; first-pass продуктовые blocking findings, exact FAIL→PASS fixes, reopen и full-suite повторения с причиной. Метрики SHALL содержать знаменатель и покрытие источников.

#### Scenario: Агент продолжает ту же сессию
- **WHEN** один unit выполняется одной сессией с двумя resume и затем split
- **THEN** считаются одна новая сессия, два продолжения и отдельная связь split; журнал субагента не приравнивается к числу units

#### Scenario: Нет handoff или классификации finding
- **WHEN** источник не позволяет доказать причину partial либо first-pass outcome
- **THEN** значение unknown и gap сохраняются; collector не выводит вывод о качестве по одному числу токенов

### Requirement: Время и стоимость не домысливаются
Отчёт SHALL разделять измеренное время модели, инструментов, ожидания пользователя и внешнего blocker, явно отмечая overlaps и неизвестные интервалы. Cache tokens MUST NOT трактоваться как уникальные токены, деньги или пользовательская квота без явной тарифной и quota модели.

#### Scenario: Тариф и quota rules неизвестны
- **WHEN** отчёт строится только по usage и ledger
- **THEN** поля цены/квоты не рассчитываются; вывод сообщает, что total включает повторный cache read

#### Scenario: Сравниваются изменения
- **WHEN** есть несколько сопоставимых changes с описанными масштабом, профилем и полнотой данных
- **THEN** отчёт показывает сырые метрики и выборку; процент экономии не обещается на основании несопоставимых задач или одного запуска

### Requirement: Allowlist и offline изоляция
Collector SHALL работать только с явно переданными файлами/архивами и сохранять allowlisted usage/identity/outcome поля. Raw prompts, сообщения, tool arguments/results, credentials/env и vendor payload MUST NOT копироваться в результат или diagnostics. Модификация DSH checkout и автоматический поиск всех сессий MUST NOT требоваться.

#### Scenario: Во входе есть секретоподобные данные
- **WHEN** синтетический журнал содержит token в сообщении, URL, tool result и лишнем metadata поле
- **THEN** summary и stdout/stderr не содержат token, raw контент и лишние поля; обработка malformed record сообщает только безопасную позицию
