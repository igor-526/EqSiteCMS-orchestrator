# Handoff apply: `harden-core-service-architecture`

**Зафиксировано:** 2026-08-16T21:57:18+03:00  
**OpenSpec:** `openspec/changes/harden-core-service-architecture`  
**Состояние:** apply прерван на REWORK после двух полных Quality Gate verdict; sync/archive запрещены  
**Checklist:** 125/149 выполнено, 24 pending (`5.1–5.24`)  
**Scope:** root orchestration, backend, CMS frontend, email-service, notification-service, agent/howto policy. Consumer Frontend исключён: его код, команды и runtime не входят в продолжение.

## Source of truth и invariants

- Нормативные артефакты: `proposal.md`, `design.md`, девять delta specs и `tasks.md` текущего change.
- `openspec status --change harden-core-service-architecture --json`: `isComplete=true`, planning artifacts `done`.
- Последний `openspec instructions apply --change harden-core-service-architecture --json`: `total=149`, `complete=125`, `remaining=24`.
- Реализационные и live SMOKE tasks `1.1–4.18` завершены; все Quality Gate tasks `5.1–5.24` пока `[ ]`.
- Email/tenant/access/NATS/Celery contracts менять нельзя. При необходимости изменить outcome требуется отдельное перепланирование и approval.
- Не отмечать QG checkbox по отдельным старым PASS: пункты `5.1–5.21` требуют нового полного последовательного прогона после устранения обоих blockers.

## Завершённые packages и task IDs

| Package | Tasks | Состояние/evidence |
|---|---|---|
| P-A private network + P-B1 email boundary | `1.1–1.10` | owner-only access, DI/Protocol, public confirmation exceptions, peer credential removal, private compose contracts; targeted backend 37 tests и email full suite 35 на момент package handoff |
| Backend email unit matrix | `2.01–2.32` | 32 checklist scenarios закрыты; последующий QG насчитал 27 parametrized functions и более 30 фактических cases |
| P-B2 source typing | `1.11–1.13` | backend mypy source: 174 files, 0 errors; Ruff/format PASS; pytest 947 passed/5 skipped на package handoff |
| P-E/P-N declared typing | `1.19–1.20` | email/notification mypy+basedpyright 0; Ruff/format PASS; email 35, notification 19 tests на package handoff |
| P-B3 typed tests/style | `1.14–1.18` | mypy `src tests`: 225 files PASS; Ruff/flake8/format-check PASS; pytest 947 passed/5 skipped |
| P-M1 AsyncAPI/contracts | `1.21–1.24` | 3 AsyncAPI official CLI valid; aggregate schema/ref/adapter contracts PASS; backend 949/5 skip, notification 21, email 36; topology unchanged |
| P-M2 real messaging/Celery | `1.25–1.30` | real JetStream/cross-service E2E 2 passed; real PostgreSQL/Redis/Celery 3 passed; targeted ping pong; session lifecycle/race fixed |
| P-O orchestration/catalog/security implementation | `1.31–1.34` | validators/placeholders/secret scan/rotation docs; root non-mutating checks; four core builds/targets; SERVICES/README/manifest sync |
| P-D policy/howto + Backend handoffs | `1.35–1.40` | AGENTS/Planner/Backend/QG/Celery/NATS contracts updated; targeted evidence and exclusive ownership recorded |
| CMS frontend P-F1–P-F4 | `4.1–4.18` | 41 files/384 tests PASS; deterministic typecheck/tsc PASS; lint 0 errors, 398 classified legacy warnings and agreed strict rollout scope 0 warnings; build PASS without ignore flags; Chromium QA 1440/768/360 PASS |
| Live API SMOKE | `3.01–3.35` | final full run 34/34 PASS after REWORK; automatic cookie auth; DB inspect without hardcode; all email/tenant outcomes and timings; cleanup 0/0; no pytest smoke files |

Latest verification observed by the second QG/report:

- Root `make check`: PASS.
- Backend: mypy/Ruff/format-check/flake8 PASS; 954 passed, 5 skipped during second QG. После SMOKE-fix targeted 17 PASS и full pytest 950 passed/5 skipped были сообщены Router; при возобновлении не выбирать одно число как текущий baseline — запустить suite заново.
- Email: mypy/basedpyright/Ruff/format-check/flake8 PASS; 36 passed, 3 infrastructure deselected in default suite.
- Notification: static gates PASS; 21 passed, 2 infrastructure deselected in default suite.
- Infrastructure: JetStream 2 passed/21 deselected; Celery/DB 3 passed/36 deselected; infrastructure suites запускались отдельно и их отсутствие/skip не считались PASS.
- CMS: 41 files/384 tests; lint 0 errors/398 classified warnings; deterministic typecheck and production build PASS.
- AsyncAPI: 3 specs valid через pinned `@asyncapi/cli@6.0.2`; generated backend inventory 88/88 routes.
- Images второго QG: backend `9d6e1f...`, notification `eb3ede...`, email `006cb1...`, email-celery `9a78ed...`, CMS `052dab...`; эти IDs нельзя считать текущим runtime без повторного inspect.

## Два Quality Gate verdict и закрытые findings

### Verdict 1: REWORK

Первый полный QG обнаружил QG-01–QG-04. К началу второго прогона они были исправлены и независимо подтверждены:

1. Настоящий `make asyncapi-validate` появился и валидирует три specs pinned official CLI.
2. Неизвестный Make target больше не поглощается catch-all: `make definitely-unknown-qg-target` ожидаемо падает.
3. Generated backend route inventory покрывает 88/88 unique method/path, включая email owner rules, tenant selector и `site_settings` scopes.
4. CMS получил `scripts/live-qa.mjs` и `docs/live-qa-evidence.md` с 26-flow real-backend matrix. Checked-in claim не заменяет независимый повтор после fresh recreate.

### Verdict 2: REWORK

Второй полный прогон закрыл QG-01–QG-04, но оставил два blocking finding:

- **QG2-01 CRITICAL — orchestration recreate/project conflict.** `make recreate-core` не смог заменить `eqsitecms-app`: существующий container принадлежал Compose project `docker-compose`, а target запускал backend с `-p eqsitecms-be` при фиксированном `container_name`. Fresh candidate не был доказан единым runtime.
- **QG2-02 HIGH — CMS production dependency audit.** `npm audit --omit=dev --json` показал `high=4` (`next`, `nanoid`, `postcss`, `sharp`); Docker install дополнительно сообщал full-graph advisories. Требуется reviewed compatible upgrade/lockfile, не blind `npm audit fix`.

## Текущие blockers и прерванный REWORK

1. **Root/backend orchestration REWORK был активен и прерван.** До продолжения нельзя полагаться только на последний report: проверить возможные частичные изменения в `Makefile`, `scripts/recreate-core.sh`, compose files, images, networks и containers.
2. Текущий `docker ps -a` на момент handoff уже отличается от QG2 failure: `eqsitecms-app` существует и имеет `Up Less than a second (health: starting)`; DB/Redis/NATS/MinIO подняты около 31 секунды. Email/notification/Celery/CMS containers в выведенном списке отсутствуют. Это частичный/неподтверждённый runtime, не PASS recreate.
3. Исправить deterministic project/container ownership, затем подтвердить, что recreate заменяет именно fresh images всех четырёх core services, миграции и health/readiness относятся к одному release candidate.
4. CMS production audit всё ещё должен стать `high=0` для production graph после reviewed dependency update; повторить tests/typecheck/lint/build и image build.
5. После обоих исправлений требуется третий полный QG `5.1–5.21`. Частичный догон отдельных стадий недостаточен.

## Точная последовательность возобновления

1. **Inspect, ничего не предполагая:** перечитать OpenSpec/report; снять root/service diffs, container/project/image/network state, compose config и logs. Определить, какие изменения успел сделать прерванный Backend/orchestration owner.
2. **Завершить QG2-01:** исправить единый Compose project/container ownership без destructive broad cleanup; проверить root orchestration targeted tests/config; выполнить controlled recreate и доказать fresh image/runtime identity, migrations, health, logs, private network и targeted Celery ping.
3. **Завершить QG2-02:** Frontend owner обновляет только CMS production dependencies/lockfile после advisory review; добиться production audit 0 high, затем повторить frontend tests, strict lint scope, deterministic typecheck, build и image build.
4. **Полностью повторить Quality Gate `5.1–5.21`:** clean ownership/context; access inventory/unit/smoke evidence; Python/CMS gates; AsyncAPI/JetStream/Celery; network/readiness; root check; no-cache builds; recreate/migrations/logs; live API SMOKE; independent CMS e2e/live QA; config/secret/dependency security; policy review; единый report.
5. Если QG APPROVED, checklist owner отмечает только фактически подтверждённые `5.1–5.21`. Если есть finding — REWORK владельцу и снова полный `5.1–5.21`.
6. Router выполняет `5.23`: sync всех delta specs в main specs и strict validation.
7. Только после успешной sync validation выполнить `5.24`: archive change.

## Команды inspect/resume

```bash
openspec status --change harden-core-service-architecture --json
openspec instructions apply --change harden-core-service-architecture --json
openspec validate harden-core-service-architecture --type change --strict
sed -n '1,260p' openspec/changes/harden-core-service-architecture/tasks.md
sed -n '1,320p' docs/reports/045-core-service-architecture-review.md

git status --short
git diff -- Makefile .docker-compose scripts README.md SERVICES.md services.manifest agents
for d in services/backend services/email-service services/notification-service services/frontend; do git -C "$d" status --short; done
for d in services/backend services/email-service services/notification-service services/frontend; do git -C "$d" diff --stat; done

docker ps -a --format '{{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Image}}'
docker inspect eqsitecms-app --format '{{json .Config.Labels}} {{.Image}} {{json .State.Health}}'
docker image ls --digests
docker network ls
docker compose -f .docker-compose/docker-compose.infra.yml -f .docker-compose/docker-compose.be.yml -f .docker-compose/docker-compose.email.yml -f .docker-compose/docker-compose.notification.yml config

make compose-check
make check
make asyncapi-validate
cd services/frontend && npm audit --omit=dev --json
```

Перед любым recreate сначала прочитать актуальные `Makefile`/`scripts/recreate-core.sh`, разрешить project ownership и убедиться, что команда не удалит чужие/user containers. После targeted fixes использовать документированные root targets; не импровизировать broad `docker compose down`, `docker rm -f` или volume deletion.

## Worktree snapshot: не присваивать происхождение изменений

Ниже только snapshot `git status`; он не устанавливает автора или владельца. Существующие изменения могут принадлежать разным агентам или пользователю. Не откатывать и не переформатировать их без path ownership.

### Root modified/untracked

- Modified: `.docker-compose/docker-compose.email.yml`, `.docker-compose/docker-compose.infra.yml`, `.docker-compose/docker-compose.notification.yml`, `AGENTS.md`, `Makefile`, `README.md`, `SERVICES.md`, `agents/backend.md`, `agents/howto/celery-protocols.md`, `agents/howto/nats-jetstream-protocols.md`, `agents/planner.md`, `agents/quality_gate.md`, `services.manifest`.
- Untracked in-scope: `docs/operations/`, `docs/reports/045-core-service-architecture-review.md`, `docs/reports/045-project-architecture-audit-brief.md`, `openspec/changes/harden-core-service-architecture/`, `scripts/recreate-core.sh`, `scripts/secret-scan.sh`.
- Untracked/other task context: `docs/tasks/045_refactoring_codex.md`, `docs/tasks/046_renaming_horse_code.md`, `docs/tasks/047_renaming_horses_script.md`, `docs/tasks/047_renaming_horses_script/`, `docs/tasks/048_breeds_group.md`.
- Deleted unrelated task-039 files: `docs/tasks/039_horse_names/horse.json`, `horse_with_codes.json`, `rollback_horse_codes.sql`, `unchanged_horses.js`, `unchanged_horses.json`, `update_horse_codes.sql`.

### Service worktrees

- `services/backend`: modified runtime/config/tests/lock files listed by `git status`; new `.env.example`, `docs/`, route-inventory maintain modules, email Protocol/service, email/access/site-settings/messaging tests. Re-run status for exact list.
- `services/email-service`: modified env/config/API/NATS/container/service/repository/Celery/tests; new `docs/`, integration probe and client/integration tests.
- `services/notification-service`: modified env/config/NATS/repository/seeding; new AsyncAPI and integration/messaging tests.
- `services/frontend`: modified ESLint/Next/package/API-boundary and horses/prices/gallery/news/site-settings code/tests; new docs, live/manual QA/typecheck scripts/helpers and extracted components.

Package/lockfile state deserves special attention: frontend `package.json` modified, but the snapshot did not show a tracked lockfile change. Dependency-security owner must inspect actual lockfile/install strategy before editing.

## Resume success condition

Возобновление считается завершённым только когда оба QG2 blockers закрыты, третий полный QG имеет APPROVED с fresh-runtime evidence, tasks `5.1–5.21` отмечены по evidence, delta specs синхронизированы и строго валидны, затем change архивирован. До этого `harden-core-service-architecture` остаётся активным REWORK.
