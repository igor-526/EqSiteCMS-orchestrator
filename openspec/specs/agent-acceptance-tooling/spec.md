# agent-acceptance-tooling Specification

## Purpose
Предоставлять переиспользуемые test-only средства для доказательства браузерных механизмов, совместимости producer→consumer и поведения реальных изолированных PostgreSQL/NATS без изменения продуктовых контрактов.

## Requirements

### Requirement: Scoped browser self-check
Browser tooling SHALL исполнять конечный набор выбранных по diff сценариев с assertions focus, keyboard, geometry и computed contrast, scoped axe и machine-readable evidence. CMS SHALL проверяться только в Chromium 1366×768. Отсутствующее assertion или окружение MUST NOT засчитываться как PASS.

#### Scenario: Проверяется вложенная модалка
- **WHEN** выбран сценарий открытия confirmation клавишей Space внутри wizard и затем Escape
- **THEN** runner проверяет состояние обеих модалок и возврат фокуса; pending и nonpending проверяются отдельно по ожиданиям сценария

#### Scenario: Проверяются таблица и состояния контрола
- **WHEN** diff затрагивает таблицу, keyboard flow или цвет контрола
- **THEN** сценарии проверяют Tab/Shift+Tab/Enter/Space/Escape, скрытые sizing-копии, remount/sort, scroll/clipping и применимые normal/hover/focus/error contrast, а не только DOM existence

#### Scenario: Неверное ожидание и неизвестный шаг
- **WHEN** assertion не выполняется, selector отсутствует либо тип шага неизвестен
- **THEN** runner возвращает ненулевой exit, scenario/step ID и безопасную причину; отсутствие проверки не становится успехом

### Requirement: Парная wire compatibility
Контрактный runner SHALL передавать сериализованный production producer output существующему production consumer parser/handler, изолируя несовместимые import environments. HTTP и NATS SHALL иметь положительные и отрицательные случаи; самостоятельно согласованные mocks MUST NOT заменять парное доказательство.

#### Scenario: Producer расширил HTTP DTO
- **WHEN** producer сериализует синтетический ответ с lifecycle полями
- **THEN** реальный consumer принимает валидный ответ, отклоняет невалидные типы и runner обнаруживает несовместимость схем, не переписывая consumer contract

#### Scenario: Невалидный NATS envelope
- **WHEN** отсутствует или несогласован Nats-Msg-Id, identity либо timestamp
- **THEN** реальный handler отклоняет сообщение до storage effect; runner фиксирует disposition по действующему контракту

#### Scenario: Нет соседнего checkout
- **WHEN** обязательный парный сценарий исполняется в монорепозиторном acceptance режиме без producer или consumer
- **THEN** runner возвращает ошибку с безопасным отсутствующим путём; отдельный сервисный CI может дать явный skip, но не monorepo PASS

### Requirement: Изолированные PG и NATS fixtures
Test-only fixtures SHALL до подключения проверять отдельное разрешение на setup/teardown, выделенную тестовую цель и уникальные имена ресурсов. Cleanup SHALL затрагивать только созданные этим запуском ресурсы. Fallback на production/app settings, public schema или канонические streams MUST NOT выполняться.

#### Scenario: Нет разрешения или цель не тестовая
- **WHEN** разрешение отсутствует, scope цели не совпадает либо DB не выделена для тестов
- **THEN** runner отказывает до CREATE/DROP/publish/delete и не выводит URL с credentials

#### Scenario: Ошибка внутри setup или teardown
- **WHEN** создание ресурса завершилось частично или cleanup не прошёл
- **THEN** runner ограниченно по времени удаляет только подтверждённые owned ресурсы либо фиксирует безопасный residual manifest и ненулевой результат; общий cleanup не запускается

#### Scenario: Одноимённая таблица public
- **WHEN** в тестовой схеме таблица отсутствует, а в public есть одноимённая
- **THEN** тест получает ожидаемую SQL ошибку и не читает public через search_path

### Requirement: Реальная acceptance семантика
Обязательные PG/NATS acceptance сценарии SHALL выполняться на реальных зависимостях, иметь timeout и запрет skip. Collection, mock и отсутствие prerequisites MUST NOT объявляться доказательством rollback, concurrency или topology.

#### Scenario: Recovery после rollback
- **WHEN** production recovery path получает исключение внутри транзакции
- **THEN** новая DB session после rollback видит durable attempts/error_code, а lease/concurrency сценарий подтверждает существующий fencing contract

#### Scenario: Существующая несовместимая topology
- **WHEN** test-owned existing stream имеет несовместимые TTL/discard/durable/filter
- **THEN** startup validation отказывает по действующему контракту, не выполняя silent repair; совместимая topology принимается

### Requirement: Безопасное evidence helpers
Helpers SHALL сохранять только allowlisted результаты и синтетические данные. Auth state SHALL оставаться отдельным ignored input; raw credentials, headers, OAuth payload, env, prompts и непроверенные raw traces MUST NOT экспортироваться как evidence.

#### Scenario: Браузер работает с авторизацией
- **WHEN** сценарий исполняется с runtime auth state
- **THEN** report содержит только безопасные route/status/scenario outcomes; чувствительные screenshots/traces отключены или очищены до сохранения, а секреты не попадают в stdout и tracked файлы
