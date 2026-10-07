# 080 — очистка следов оркестратора и установка DSH

Дата аудита: 2026-10-06.

## Результат

- DeepSeek Harness установлен локально в `dsh/`, версия `0.2.0-rc.2`.
- Runtime воспроизводится командой `npm ci --ignore-scripts`.
- `DSH_HOME` направлен в `dsh/home`; профиль `web` и список его плагинов можно
  переносить вместе с репозиторием.
- Секреты, сессии, логи, вложения, кэш, локальные БД и `node_modules` исключены
  из Git.
- Код сервисов и OpenSpec не изменялись.

Официальные источники: [сайт DeepSeek Harness](https://deepseek.com/harness/en/),
[репозиторий](https://github.com/deepseek-ai/deepseek-harness).

## Файлы к удалению

Высокая уверенность — артефакты разработки удалённого автоматического агентного
оркестратора:

1. `docs/tasks/agent_orchestration/AO-001-agent_orchestration_architecture.md`
2. `docs/tasks/agent_orchestration/AO-002-implementation_plan.md`
3. `docs/tasks/agent_orchestration/AO-003-phase0-tz-infra-skeleton.md`
4. `docs/tasks/agent_orchestration/AO-004-phase1-tz-task-management.md`
5. `docs/tasks/agent_orchestration/AO-005-phase2-tz-headless-spike.md`
6. `docs/tasks/agent_orchestration/AO-006-phase3-tz-full-pipeline.md`
7. `docs/tasks/agent_orchestration/AO-007-phase4-tz-quota-handling.md`
8. `docs/tasks/agent_orchestration/AO-008-phase5-tz-completion-stub.md`
9. `docs/reports/phase3-full-pipeline-quality-gate.md`
10. `docs/reports/phase4-quota-handling-quality-gate.md`
11. `docs/reports/phase5-completion-stub-quality-gate.md`
12. `docs/tasks/qg_smoke_git_loop_20260922T100236Z.md`
13. `docs/tasks/qg_smoke_usg_20260922T182057Z.md`
14. `docs/tasks/qg_smoke_usg_waitinput_20260922T182235Z.md`

Первые восемь task-файлов и три временных smoke task-файла уже отсутствовали в
рабочем дереве как пользовательские удаления; они не восстанавливались. Три
Quality Gate отчёта удалены 2026-10-06 после явного подтверждения владельца.

## Выполненная текстовая чистка

- В `docs/reports/062_pipeline_optimizing_report.md` удалена ссылка на
  отсутствующий `orchestrator/AGENTS.md` и его `plan_parser`.
- В `WORKFLOW.md` удалены обещание будущего оркестратора, несуществующая
  команда автоматического создания ветки и attribution итогового отчёта.
- В `SERVICES.md` автоматический branch/merge workflow заменён ручными
  безопасными правилами для сервисных репозиториев.
- В `Makefile`, `scripts/sync.sh` и `services.manifest` терминология корня
  приведена к «монорепозиторию»; специальная обработка удалённой записи
  `orchestration` убрана из sync-скрипта.

## Исключено из удаления

Не относятся к удалённому агентному оркестратору и должны сохраниться:

- `openspec/specs/notification-orchestrator/spec.md` и архивные версии —
  доменная маршрутизация уведомлений;
- `openspec/specs/vk-service-orchestration/spec.md` и архивные версии —
  доменная интеграция VK;
- упоминания handler/orchestrator в notification-service и smoke harness.

## Ограничения и вопросы владельцу

- Подтвердить политику обновления DSH: фиксированная версия или регулярный
  переход на новые preview-релизы.
