## Why

Пайплайн Router-first сейчас заканчивается на `QG-SYNTH = APPROVED` и sync/archive простым отчётом «всё готово»: контейнеры могут не содержать правок, сделанных после `QG-ENV` (например, по `REWORK`), а слияние в `main`, push и релиз в `release` выполняются вручную и непоследовательно (legacy-ветки `agent/<uuid>`, коммиты «Automated commit…», устаревший `WORKFLOW.md` с `docs/plans` и `gh pr create`). Задача `docs/tasks/083_task_finalization_merge_release.md` требует довести пайплайн до конца: стек готов к ручной проверке → вопрос «Сливать в main?» → ветки/коммиты/merge/push по всем изменённым репозиториям → вопрос «Релизить?» → `main → release`, push и контроль CI через `gh` без автоисправлений. Основная среда Router — DeepSeek Harness (DSH), поэтому процедура строится DSH-first: skill, `ask_user_question`, фоновые задачи.

## What Changes

- Новые финальные стадии Router-пайплайна: `READY-FOR-MANUAL` (финальный rebuild/restart изменённых runtime-сервисов из итогового кода, миграции, health, отчёт с URL) до sync/archive, approval gate «Сливать в main?», фаза `MERGE`, approval gate «Релизить?», фаза `RELEASE` с контролем CI и итоговым отчётом.
- Новый детерминированный engine `scripts/shipctl` (Node, в стиле `scripts/stackctl`): подкоманды `status`, `plan`, `merge` (+ `--resume`), `release`, `ci` (+ `--wait`); JSON в stdout, `flock`, фиксированные exit-коды, `--dry-run`, state-файлы в `.qa/ship/<change>/`. Работает и вне DSH.
- Пофайловый план слияния: «изменённый репозиторий» = корень или клон из `services.manifest` с dirty-файлами, отнесёнными к change; посторонние dirty-файлы (их пользователь чистит сам) страхуются: не коммитятся, не stash'атся и не теряются.
- Конвенции: ветки `feature/<change>` / `bug/<change>` с автосуффиксом `-2`, `-3`, … если имя занято локально или на `origin`; feature-ветки **всегда пушатся** в каждом изменённом репозитории, включая корень; коммиты `feat(<change>): …` / `fix(<change>): …`; `--no-ff` merge в `main`.
- Конфликт merge в `main` не откатывается: остаётся в рабочем дереве для ручного разбора, `shipctl merge --resume` продолжает после коммита разрешения (push и оставшиеся репозитории).
- RELEASE — только fast-forward: `release` указывает на тот же коммит, что `main` (`git push origin <sha>:refs/heads/release` после `merge-base --is-ancestor`, без worktree); расхождение `release` → остановка и отчёт. Корень в RELEASE — `not-applicable`.
- CI: `shipctl ci --wait` (30 мин общий, 3 мин на появление run) запускается Router как фоновая задача; Router получает уведомление о завершении, не опрашивая в цикле.
- `scripts/sync.sh` получает строгий режим (`--strict`, `--include-root`, `--report <file>`, `pull --ff-only`, ненулевой exit при сбое); `make sync` принимает `SYNC_FLAGS`, ручной режим не меняется.
- `scripts/stackctl` получает aliases `site-ad`, `site-ksk-inlove` и команду `ready <alias...>` (rebuild + migrate + health + URL).
- Новый самодостаточный skill `.agents/skills/task-finalize/SKILL.md` (< 8192 символов, frontmatter `name/description/whenToUse`, подхватывается DSH из `.agents/skills`) — процедура финализации для Router; approval gates через `ask_user_question` с фиксированными вариантами («Слить в main» / «Не сливать», «Релизить» / «Не релизить») и планом в тексте вопроса; fallback — обычный текстовый вопрос вне DSH.
- Governance: `AGENTS.md` получает только короткий шаг-указатель на skill, формат handoff с путями от корня монорепы и `QG-ENV` для сайтов; `agents/quality_gate.md`, переписанный `WORKFLOW.md`, README.
- **Без автоисправлений:** конфликт, сбой sync/pull/push, расхождение `release`, detached HEAD, ветка не `main`, падение/отмена/таймаут CI → немедленная остановка и отчёт; никаких rerun/revert/abort/resolve.

## Non-goals

- Перенос ролей Router/Planner/исполнителей/Quality Gate в DSH presets — отдельный change 084 (готовится параллельно).
- Pull requests, branch protection, rerun/revert CI, rollback деплоя, создание `release`/CI в корневом репозитории, hunk-level выбор изменений, автоматическая очистка посторонних dirty-файлов и legacy-веток `agent/<uuid>`.

## Capabilities

### New Capabilities

- `task-shipping-tooling`: контракт `scripts/shipctl` (plan/merge/resume/release/ci), определение изменённого репозитория и пофайловый план, защита посторонних dirty-файлов, именование веток с автосуффиксом и commit convention, порядок MERGE с ручным разрешением конфликта, ff-only RELEASE, строгий `make sync`, контроль CI через `gh`, тестирование на временных git-репозиториях с bare remote.

### Modified Capabilities

- `openspec-workflow`: lifecycle после `QG-SYNTH = APPROVED` расширяется стадиями `READY-FOR-MANUAL`, двумя approval gates (`ask_user_question` с fallback), `MERGE` и `RELEASE`; операционные git/release шаги Router выполняет только по skill `task-finalize` через детерминированные инструменты, не меняя файлы; ожидание CI — фоновая задача.
- `repository-process-tooling`: `stackctl` управляет также `site-*` и предоставляет `ready`; `WORKFLOW.md` и README описывают актуальный OpenSpec-пайплайн вместо `docs/plans` и `gh pr create`.

## Impact

- Затрагиваемые пути (только процесс/инструменты корня): `scripts/shipctl`, `scripts/ship/**`, `scripts/tests/**`, `scripts/sync.sh`, `scripts/stackctl`, `Makefile`, `.agents/skills/task-finalize/**`, `.agents/skills/stack-control/SKILL.md`, `AGENTS.md`, `agents/quality_gate.md`, `WORKFLOW.md`, `README.md`.
- Runtime-код сервисов (`services/**`) не меняется; NATS/AsyncAPI-контракты и схемы БД не затрагиваются.
- **Access policy: неприменимо** — новых или изменённых HTTP endpoint нет, access matrix и anonymous/authenticated HTTP-проверки отмечаются `N/A`.
- Внешние зависимости: `git`, `gh` (установлен и авторизован, scope `repo`), `flock`, Node (как у `stackctl`); DSH-инструменты `ask_user_question` и фоновый Bash (с fallback вне DSH). Push в `release` запускает `.github/workflows/check_and_deploy.yml` сервисных репозиториев (lint/test → GHCR → helm deploy), поэтому релиз выполняется только после явного «Релизить».
- Исторический requirement `vk-service-orchestration` о неизменности `scripts/sync.sh` был ограничен своим change и не блокирует эту правку.
