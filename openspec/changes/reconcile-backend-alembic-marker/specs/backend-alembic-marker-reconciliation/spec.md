## ADDED Requirements

### Requirement: Отдельное разрешение на marker-only repair

Исполнитель MUST получить новое явное approval для `d1e2f3a4b5c6` → `c8fda9794a60` в локальной development DB, включая признание, что операция не откатывает schema удалённой миграции и не доказывает schema equivalence. Старое Docker approval SHALL NOT считаться разрешением на запись БД.

#### Scenario: Нет разрешения
- **WHEN** отдельное approval этого change отсутствует
- **THEN** разрешены только read-only диагностика и планирование; любые записи DB и runtime repair запрещены

### Requirement: Проверенный точный граф ревизий

Исполнитель MUST определить head исключительно по текущим `revision`/`down_revision` в backend migration tree согласно `script_location`; проверить уникальность, полноту родителей, ацикличность и единственный head. Target MUST совпасть с согласованным `c8fda9794a60`.

#### Scenario: Единственная вершина
- **WHEN** metadata 21 ревизии образует полный ациклический граф с единственным head `c8fda9794a60`
- **THEN** именно этот exact идентификатор допустим как target, а имя файла/mtime не используются для выбора

#### Scenario: Неоднозначный граф
- **WHEN** обнаружен цикл, отсутствующий родитель, duplicate revision, несколько heads либо head отличается от согласованного
- **THEN** исполнитель останавливается без записи и передаёт Router блокер/вопрос, без угадывания и автоматической замены target

### Requirement: Подтверждение development DB и snapshot

Перед изменением исполнитель MUST проверить идентичность локальной DB backend через alias `db`, сохранить secret-free snapshot прежнего marker, числа строк и sanitized DB identity. Production/staging и неясная DB SHALL NOT изменяться.

#### Scenario: Подтверждённая БД
- **WHEN** development target однозначен и SELECT возвращает ровно одну строку `d1e2f3a4b5c6`
- **THEN** snapshot с identity, marker, cardinality, tree head, временем и ссылкой на approval сохраняется до write без credentials/DSN

#### Scenario: Несоответствие состояния
- **WHEN** DB identity неясна, строк ноль/больше одной либо marker отличается от `d1e2f3a4b5c6`, включая повторный запуск после успешного ремонта
- **THEN** операция останавливается без UPDATE/INSERT/DELETE и не считается успешным новым CAS

### Requirement: Атомарный ограниченный compare-and-swap

Операция MUST выполнять только UPDATE `alembic_version.version_num` внутри одной транзакции с блокировкой таблицы от конкурирующих writes, повторной проверкой count=1 и exact old marker, условием old marker, проверкой rowcount=1 и exact итоговой строки. Любое нарушение MUST приводить к ROLLBACK. Таймауты MUST ограничивать ожидание lock/SQL.

#### Scenario: Успешная коррекция
- **WHEN** approval, graph, identity, snapshot и транзакционные guards соблюдены
- **THEN** ровно одна строка меняется с `d1e2f3a4b5c6` на `c8fda9794a60`, подтверждается rowcount=1 и выполняется COMMIT без других DB изменений

#### Scenario: Сбой транзакции
- **WHEN** SQL/lock timeout, исключение, неожиданная cardinality, old marker или rowcount≠1 возникают до COMMIT
- **THEN** транзакция откатывается полностью и unit возвращает failure/blocked без частичного изменения и без автоматического повторного ремонта

### Requirement: Независимые postchecks и runtime gate

После COMMIT исполнитель MUST проверить SELECT/current/heads и передать отдельному QG-ENV read-only проверку runtime. Эти проверки SHALL NOT выполнять upgrade/downgrade/stamp/restart/rebuild/migrate. Gates MUST следовать порядку ENV → параллельные BE+CONTRACTS → LIVE → FORMAT → SYNTH. FORMAT MUST всегда выполнять `make format`, `make lint`, `make test` из корня чистого изолированного worktree; отсутствие code diff SHALL NOT отменять FORMAT, а strict validate SHALL NOT заменять make-команды. Подготовка изоляции MUST выполняться отдельным ограниченным unit по поручению Router, без воздействия на чужой dirty diff/рабочую DB; baseline failures MUST отделяться от change findings. Evidence MUST храниться в `docs/reports/reconcile-backend-alembic-marker/`, единственный overall verdict QG-SYNTH — в `docs/reports/reconcile-backend-alembic-marker-qg-review.md`. FE SHALL быть N/A ввиду отсутствия UI diff. LIVE SHALL проверять реальную SQL metadata и runtime read-only без API business smoke, так как HTTP поведение не меняется.

#### Scenario: Обязательный FORMAT после LIVE
- **WHEN** ENV, BE+CONTRACTS и LIVE завершены и Router подготовил чистую изоляцию
- **THEN** FORMAT выполняет все три root make-команды с отдельными exit codes, фиксирует baseline/change findings и дополнительную strict validation, после чего SYNTH выпускает единственный overall verdict; рабочий checkout не форматируется

#### Scenario: Проверка metadata
- **WHEN** операция завершилась и SELECT/Alembic current/heads доступны
- **THEN** SELECT содержит ровно одну строку target, current равен `c8fda9794a60`, heads содержит только `c8fda9794a60`; результаты и exit codes сохраняются без секретов

#### Scenario: Runtime не восстановлен
- **WHEN** после коррекции приложение остаётся unhealthy либо current/heads недоступны/ошибочны
- **THEN** отдельный runtime gate сообщает BLOCKED, сохраняет фактическое состояние marker и не выполняет auto repair без нового разрешения

### Requirement: Честные границы результата

Ремонт MUST ограничиваться marker и evidence. Исполнитель SHALL NOT менять schema, прикладные данные, migration-файлы, код/Docker/API/NATS рабочего checkout или утверждать эквивалентность schema по marker/health. Обязательный FORMAT SHALL работать только в изолированной проверочной копии; его изменения MUST оставаться проверочными findings без автоматического переноса в рабочий checkout. Возврат marker после COMMIT MUST требовать отдельного решения/approval с обратным guarded CAS; snapshot не является автоматическим разрешением.

#### Scenario: Ограниченный результат
- **WHEN** marker и runtime проверки успешны
- **THEN** результат описывается как согласование metadata; schema effects удалённой миграции не считаются отменёнными или проверенными, schema repair требует другого approval

Endpoint changes/access matrix и anonymous/authenticated tests: N/A — HTTP поведение не меняется, API policy не получает исключений.
