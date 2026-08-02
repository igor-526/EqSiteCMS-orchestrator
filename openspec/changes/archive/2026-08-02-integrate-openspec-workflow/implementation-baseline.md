# Baseline и path manifest задачи 023

Дата фиксации: 2026-08-02.

## Baseline рабочего дерева

Перед apply выполнен `git status --short`. В дереве уже находились изменения задачи 022: нумерация и переименование файлов в `docs/tasks`, `docs/plans`, `docs/reports`, изменения `.gitignore`, а также связанные пользовательские правки. Они не входят в scope задачи 023, не откатываются и не считаются evidence её выполнения.

## Path manifest задачи 023

Задача 023 может изменять только следующие пути:

- `AGENTS.md`, `CLAUDE.md`, `agents/*.md`;
- `openspec/config.yaml`;
- `openspec/changes/integrate-openspec-workflow/**`;
- отдельные backfill changes и `openspec/specs/**`, создаваемые tasks 4–9;
- traceability manifest, выбранный tasks 4.1–4.3;
- `docs/reports/023_openspec_integration-review.md`.

Runtime-пути `services/backend/**`, `services/frontend/**`, `services/site-ad/**` исключены. Переименования и содержательные изменения задачи 022 в `docs/tasks/**`, `docs/plans/**`, `docs/reports/**` также исключены, кроме явно названного итогового отчёта 023.

Проверки task 023 выполняются path-scoped по этому manifest; общий `git status` используется только для обнаружения пересечений с пользовательскими изменениями.
