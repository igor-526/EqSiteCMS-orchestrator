# Review: orchestrator/phase5-completion-stub

**Статус: ✅ APPROVED**
**Дата:** 2026-09-15

## Итог

Diff проекта `orchestrator` (физически отдельный репозиторий, отчёт размещён в `eqSiteCMS/docs/reports` по тому же соглашению, что Phase 3/4 — см. `AGENTS.md`, «`docs/reports` хранит evidence Quality Gate всей мультиагентной системы») реализует терминальную ручную стадию «Завершение»: каскад `qg`-успех → `completion` (`active`) / `decision`+`release` (`skipped`), endpoint `POST /tasks/{id}/complete`, аддитивное поле `RunOut.branch_name`, сводку завершения и раздел «Готово» на дашборде — в соответствии с `proposal.md`/`design.md` (Decisions 1–5) и delta specs `pipeline-stage-runs`/`task-registry`. Все четыре независимых lane (`QG-BE`, `QG-FE`, `QG-CONTRACTS`, `QG-LIVE`) прошли **с первой попытки**, без rework-циклов и без единой blocking-находки.

## OpenSpec

- Change: `orchestrator/openspec/changes/phase5-completion-stub/` → архивирован в `orchestrator/openspec/changes/archive/2026-09-15-phase5-completion-stub/`
- Артефакты: `proposal.md`, `design.md` (Decisions 1–5, Access matrix, Execution units/DAG, Test matrix, PostgreSQL для smoke-тестов, Manual QA steps, Open Questions), `specs/pipeline-stage-runs/spec.md` + `specs/task-registry/spec.md` (delta), `tasks.md`
- Входной запрос: `docs/tasks/agent_orchestration/AO-008-phase5-tz-completion-stub.md` (Definition of Done, 5 пунктов)

## Краткое summary скоупа фазы

Phase 5 закрывает открытое ограничение, явно задокументированное Phase 3 (`## Известные ограничения (Phase 3)`): стадии `completion`/`decision`/`release` создавались Phase 1 в `pending` и с тех пор не активировались ни одним обработчиком.

- **Каскад перехода** (`BE-1.1`/`BE-1.2`) — `_activate_completion_and_defer_release()` вызывается из существующей ветки успеха `_transition_qg_finished()` (тот же паттерн «расширение существующей ветки», что Phase 4 использовала для `blocked_quota`), идемпотентно по текущему статусу: `completion` `pending → active`, `decision`/`release` `pending → skipped`.
- **Ручное завершение** (`BE-1.4`/`BE-1.5`) — `POST /tasks/{id}/complete`: `404` неизвестная задача, `409` `stage(completion)` не найдена/не `active` (без побочных эффектов, включая повторный вызов после `done` — нет отката), иначе атомарно `stage(completion).status=done` + `task.status=done` в одной транзакции с локом стадии (`get_by_task_and_type_for_update`, тот же паттерн защиты от гонки, что `take_into_work`).
- **Контракт `RunOut.branch_name`** (`BE-1.3`) — аддитивное поле в существующем `GET /stages/{id}/runs`.
- **UI** (`FE-1`) — карточка сводки завершения (branch/worktree со стадии `openspec`, список артефактов или явное «пока не найдено», текст об ответственности пользователя за git/k8s, кнопка «Отметить завершённым»), инлайн-подписи причины пропуска у `decision`/`release`, раздел «Готово» на дашборде, отделённый от активных задач.

Вне скоупа фазы (Non-Goals, не пересматривались): любая git-операция или k8s-интеграция со стороны оркестратора, автоматическая очистка worktree/веток, откат `done → active`, активация `decision` как реального гейта (гейт остаётся на `openspec`/`waiting_decision`, архитектурное решение Phase 3).

## Lanes

| Lane | Статус | Rework-цикл |
|---|---|---|
| `QG-BE` | пройден (APPROVED, попытка 1) | нет — backend-дифф (`worker_loop.py`, `api/tasks.py`, `api/stages.py`) соответствует Decisions 1–4, 99/99 pytest, лично перепрогнан |
| `QG-FE` | пройден (APPROVED, попытка 1) | нет — frontend-дифф соответствует Decisions 3–5, `npm run build` чисто, лично перепрогнан; скриншоты `QA-1` независимо осмотрены и подтверждены |
| `QG-CONTRACTS` | пройден (APPROVED, попытка 1) | нет — ownership execution units совпадает буквально с реализацией, delta specs без расхождений с поведением, подтверждено отсутствие зависимости от stale-строки `task-registry`; подготовлен точный текст правки прозы «Известные ограничения (Phase 3)» для `QG-SYNTH` |
| `QG-LIVE` | пройден (APPROVED, попытка 1) | нет — независимый повтор `SM-COMPLETE-01..04` на свежей задаче, все 4 прошли, без расхождений с `SMOKE-1` |

### `QG-BE` — детали

**APPROVED с первой попытки.** Backend-дифф (`api/src/core/worker_loop.py`, `api/src/api/tasks.py`, `api/src/api/stages.py`) сверен с Decisions 1–4 `design.md` и Clean Architecture ownership — расхождений не найдено. 99/99 тестов (`pytest`, `orchestrator/api`), включая `UT-COMPLETE-01..09`, лично перепрогнаны.

### `QG-FE` — детали

**APPROVED с первой попытки.** Frontend-дифф (`tasks/[id]/page.tsx`, `lib/api.ts`, `page.tsx`) соответствует Decisions 3–5: сводка завершения, кнопка, инлайн-подписи `skipped`-стадий, раздел «Готово». `npm run build` — чисто, лично перепрогнан. Скриншоты и сетевые логи `QA-1` (шаги 2/3/7/8) независимо осмотрены и признаны соответствующими заявленным passed-результатам, расхождений не найдено.

### `QG-CONTRACTS` — детали

**APPROVED с первой попытки.** `POST /tasks/{id}/complete` и `GET /stages/{id}/runs` (`branch_name`) сверены с Access matrix `design.md`; ownership execution units совпадает с фактическими правками файлов; delta specs `pipeline-stage-runs`/`task-registry` совпадают с реализованным поведением без дрейфа. Отдельно подтверждено (`QG-CONTRACTS.2`): новый delta spec не ссылается на и не полагается на известную stale-строку `task-registry` («Взять в работу» SHALL НЕ вызывать backend endpoint — противоречит уже реализованному с Phase 3 поведению). Lane произвёл точный текст замены для прозаической секции `## Известные ограничения (Phase 3)` в `pipeline-stage-runs/spec.md` (применён `QG-SYNTH`, см. ниже).

### `QG-LIVE` — детали

**APPROVED с первой попытки.** Независимо (не пересказ `SMOKE-1`) повторил `SM-COMPLETE-01..04` против свежей задачи (`d9162d83-b12b-430b-b6a4-e2d50620b20c`):

| Сценарий | Результат |
|---|---|
| `SM-COMPLETE-01` — доведение задачи до `stage(qg).status=done` через реальный цикл | `stage(completion).status=active`, `stage(decision).status=skipped`, `stage(release).status=skipped` — подтверждено |
| `SM-COMPLETE-02` — `POST /tasks/{id}/complete` на активной `completion` | `200`, `task.status=done`, `stage(completion).status=done` — подтверждено |
| `SM-COMPLETE-03` — повторный `POST /tasks/{id}/complete` | `409`, `task.status` остаётся `done` — подтверждено |
| `SM-COMPLETE-04` — `GET /stages/{id}/runs` стадии `openspec` | ответ содержит непустой `branch_name`, совпадающий по всей run-chain задачи — подтверждено |

Все 4 сценария прошли, совпадают с результатами `SMOKE-1`, расхождений не найдено.

## `QG-SYNTH` — единый вердикт, аудит чекбоксов и синхронизация specs

### Аудит `tasks.md`

Финальный сквозной проход по `openspec/changes/phase5-completion-stub/tasks.md` (до архивации) обнаружил один пробел: `QG-CONTRACTS.2` был сознательно оставлен своим lane'ом неотмеченным до вердикта `QG-SYNTH`, при том что сама работа (проверка stale-строки + подготовка текста замены прозы) была фактически выполнена и подтверждена содержанием handoff'а `QG-CONTRACTS`. Отмечен выполненным этим `QG-SYNTH` после сверки. Все остальные execution units (`BE-1`, `FE-1`, `SMOKE-1`, `QA-1`, `QG-BE`, `QG-FE`, `QG-LIVE` и их `.V`-пункты) уже были корректно отмечены соответствующими lane'ами — расхождений, аналогичных прошлым фазам (Phase 4: `QG-BE.1/.V`, `QG-FE.1/.V` были не отмечены при фактически завершённой работе), в этой фазе не найдено. Итого 39/39 задач `tasks.md` отмечены выполненными на момент архивации.

### Синхронизация specs (пункт QG-SYNTH.2)

ADDED Requirements из delta specs синхронизированы в main specs через `openspec-sync-specs` (чисто аддитивный merge, конфликтов не было):

**`openspec/specs/pipeline-stage-runs/spec.md`** — добавлены перед прозаической секцией:
- «Успешный Quality Gate активирует «Завершение» и осмысленно пропускает «Решение»/«Релиз»» (4 сценария)
- «Ручное завершение задачи на стадии «Завершение»» (4 сценария)
- «Список runs стадии раскрывает branch_name» (1 сценарий)

**`openspec/specs/task-registry/spec.md`** — добавлены в конец `## Requirements`:
- «Экран задачи показывает ручное завершение на стадии «Завершение»» (3 сценария)
- «Дашборд визуально отделяет завершённые задачи» (2 сценария)

### Правка прозаической секции (пункт QG-SYNTH.3)

Секция `## Известные ограничения (Phase 3)` в `openspec/specs/pipeline-stage-runs/spec.md` содержала два независимых пункта. Первый («`decision`/`completion`/`release` никем не активируются») стал ложным после этой фазы; второй (ограниченность live-верификации retry-цикла QG стаб-CLI без переключателя на failure) остаётся верным и не связан со скоупом Phase 5.

**Решение (судебное, зафиксировано здесь):** секция расщеплена, а не отредактирована на месте — первый пункт вынесен в новую секцию `## Архитектурные примечания` (текст, подготовленный `QG-CONTRACTS`, с адаптированными названиями Requirements под фактически синхронизированные заголовки — совпали дословно, адаптация не потребовалась), второй пункт остался под исходным заголовком `## Известные ограничения (Phase 3)`. Обоснование: смешивание в одной секции «уже устранённого ограничения, ставшего архитектурным фактом» и «реального нерешённого ограничения» под одним заголовком «Известные ограничения» само по себе вводило бы в заблуждение читателя спеки после этой правки — расщепление честнее, чем переименование всей секции целиком (что стёрло бы явную маркировку второго пункта как всё ещё открытого).

### Валидация и архивация (пункт QG-SYNTH.4)

- `openspec validate --all --strict` **до** архивации: `8 passed, 0 failed` (включая `change/phase5-completion-stub`, `spec/pipeline-stage-runs`, `spec/task-registry`).
- Архивация: `openspec/changes/phase5-completion-stub/` → `openspec/changes/archive/2026-09-15-phase5-completion-stub/`.
- `openspec validate --all --strict` **после** архивации: `7 passed, 0 failed` — `change/phase5-completion-stub` больше не числится активным, все спеки по-прежнему валидны.

## Итоговый статус Definition of Done (AO-008)

| DoD | Формулировка | Финальный статус |
|---|---|---|
| 1 | Задача, реально прошедшая QG, показывает активную кнопку «Отметить завершённым» на стадии `completion` | **Закрыто.** `UT-COMPLETE-01`, `SM-COMPLETE-01`, Manual QA шаги 1–2, `QG-BE`/`QG-FE`/`QG-LIVE` подтвердили. |
| 2 | Клик переводит `completion` и `task` в `done`, без отката | **Закрыто.** `UT-COMPLETE-05..07`, `SM-COMPLETE-02..03`, Manual QA шаги 5–6, `QG-BE`/`QG-LIVE` подтвердили независимо. |
| 3 | Сводка содержит реальные branch/worktree path и список артефактов, не заглушку | **Закрыто.** `UT-COMPLETE-09`, `SM-COMPLETE-04`, Manual QA шаг 3, `QG-BE`/`QG-FE` подтвердили. |
| 4 | Явно показано, что git-мёрдж и k8s-релиз — ответственность пользователя | **Закрыто.** Manual QA шаг 4, `QG-FE` подтвердил текст в карточке сводки. |
| 5 | Дашборд визуально отделяет завершённые задачи от активных | **Закрыто.** Manual QA шаг 7, `QG-FE` подтвердил (раздел «Готово», активные задачи не теряются и не дублируются). |

Все 5 пунктов закрыты полностью, без частичных/отложенных оговорок (в отличие от Phase 4, где DoD-1 остался частичным).

## Открытые вопросы / технический долг, передаваемые дальше

Не блокируют текущий вердикт:

1. **[Carried forward, Phase 1/2, НЕ в скоупе этой фазы]** `openspec/specs/task-registry/spec.md`, Requirement «Детальный экран задачи со стадиями и стабом запуска» по-прежнему содержит устаревшее утверждение, что клик «Взять в работу» SHALL НЕ вызывать backend endpoint — противоречит реальному поведению с Phase 3 (`take_into_work` реально вызывает endpoint). `QG-CONTRACTS` этой фазы подтвердил, что новый delta spec не ссылается на эту строку и не полагается на неё — фаза её не усугубляет, но и не исправляет (не в скоупе). Остаётся открытым техдолгом для следующей фазы, которая либо коснётся этого Requirement напрямую, либо для отдельного housekeeping-прохода по specs.
2. **[Наследуется от Phase 4, не в скоупе этой фазы]** Текстовая/exit-code сигнатура исчерпания лимита (`ClaudeAdapter.is_quota_exceeded`) так и не была пронаблюдена вживую — детектор работает только на структурном канале `rate_limit_info.status`. Не связано с `completion`/`release`, упомянуто для полноты картины состояния проекта.
3. **[Наследуется от Phase 3/4]** Ротация/мониторинг `CLAUDE_CODE_OAUTH_TOKEN` — техдолг, к этой фазе не относится.
4. **[Новое, зафиксировано в design.md → Risks этой фазы]** Сводка завершения читает `branch_name`/`worktree_path` со стадии `openspec`, полагаясь на инвариант «идентичны на всём run-chain задачи» — теперь подтверждён явным `SM-COMPLETE-04`/`UT-COMPLETE-09` этой фазы (ранее подтверждался только косвенно, чтением кода). Если когда-либо появится код-путь, создающий новый worktree/ветку в середине run-chain одной задачи (сегодня такого нет), эта сводка потребует пересмотра.
5. **[Новое, зафиксировано в design.md → Risks этой фазы]** `POST /tasks/{id}/complete` не проверяет наличие хотя бы одного `artifact`/`run` у задачи — теоретически можно кликнуть «Отметить завершённым» на задаче, доведённой до `completion.status=active` нестандартным путём, без единого артефакта. Осознанно вне скоупа AO-008 (только UI-видимость, не серверная валидация «наличия результата работы»).

## Изменённые файлы (по deliverable)

Backend (`orchestrator/api/**`):

- `api/src/core/worker_loop.py` (`_activate_completion_and_defer_release`, вызов из `_transition_qg_finished`)
- `api/src/api/tasks.py` (`POST /tasks/{id}/complete`)
- `api/src/api/stages.py` (`RunOut.branch_name`)
- `api/tests/{test_qg_pipeline.py,test_tasks_api.py,test_stages_api.py}`

Frontend (`orchestrator/frontend/src/**`):

- `frontend/src/app/tasks/[id]/page.tsx` (фетч runs `openspec`/артефактов при `completion active`, карточка сводки завершения, кнопка, инлайн-подписи `skipped`-стадий)
- `frontend/src/lib/api.ts` (`Run.branch_name`, `completeTask()`)
- `frontend/src/app/page.tsx` (раздел «Готово»)

OpenSpec (`orchestrator/openspec/**`):

- `openspec/specs/pipeline-stage-runs/spec.md` — 3 новых Requirement + расщепление прозаической секции на `## Архитектурные примечания` / `## Известные ограничения (Phase 3)`
- `openspec/specs/task-registry/spec.md` — 2 новых Requirement
- `openspec/changes/phase5-completion-stub/` → архивирован в `openspec/changes/archive/2026-09-15-phase5-completion-stub/`

## Вердикт

Все четыре lane (`QG-BE`, `QG-FE`, `QG-CONTRACTS`, `QG-LIVE`) чисты, без blocking findings, с первой попытки. Все 5 пунктов Definition of Done (AO-008) закрыты полностью, без частичных оговорок. Access policy (no-auth проект) не нарушена. Test matrix покрыта полностью (`UT-COMPLETE-01..09`, `SM-COMPLETE-01..04`, весь frontend-план — все ID трассируются на реальные тесты/smoke-сценарии/manual QA шаги). Delta specs синхронизированы в main specs без конфликтов, прозаическая секция `pipeline-stage-runs/spec.md` актуализирована вручную. `openspec validate --all --strict` — чисто и до, и после архивации.

**APPROVED — единый вердикт по всем lane'ам, без открытого техдолга, введённого этой фазой.** Один пробел в чекбоксах (`QG-CONTRACTS.2`) обнаружен и исправлен этим `QG-SYNTH`. Два пункта техдолга, унаследованных от Phase 1/2 и Phase 3/4 соответственно (см. «Открытые вопросы» выше), явно перенесены как ещё не закрытые, не эта фаза их создала и не эта фаза обязана их закрывать.

Задачи `QG-SYNTH.1..4`, `QG-SYNTH.V` и ранее пропущенный `QG-CONTRACTS.2` отмечены в `tasks.md` до архивации. Все 39 задач change'а отмечены выполненными — расхождений в чекбоксах не осталось.
