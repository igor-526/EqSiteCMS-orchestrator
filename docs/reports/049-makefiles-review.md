# Review: 049 Makefiles

**Статус: ✅ APPROVED**  
**Дата:** 2026-08-18  
**OpenSpec approval:** пользователь подтвердил `Apply` для `standardize-core-ci-makefiles`.

## Контекст и scope

- Исходная задача: [`docs/tasks/049_Makefiles.md`](../tasks/049_Makefiles.md).
- OpenSpec: [`proposal`](../../openspec/changes/standardize-core-ci-makefiles/proposal.md), [`design`](../../openspec/changes/standardize-core-ci-makefiles/design.md), [`delta spec`](../../openspec/changes/standardize-core-ci-makefiles/specs/repository-process-tooling/spec.md), [`tasks`](../../openspec/changes/standardize-core-ci-makefiles/tasks.md).
- Проверенный change-scope: корневой `Makefile`; Makefile сервисов `backend`, `notification-service`, `email-service`, `frontend`; `agents/backend.md`, `agents/frontend.md`, `agents/quality_gate.md`.
- Runtime/API/DB/NATS/AsyncAPI и `services/site-*` change-ом не затронуты.
- Рекомендуемая ветка: `feature/049-makefiles`.

## Path accounting

До Quality Gate отдельно зафиксированы `git status --short`, diffstat и SHA-256 для root и четырёх вложенных service repositories. Не относятся к change и не атрибутировались ему:

- root: пять untracked-файлов `docs/tasks/047_renaming_horses_script/*`;
- notification-service: pre-existing untracked `.github/` и `.helm/*`;
- email-service: pre-existing untracked `.github/` и `.helm/`.

До запуска formatter change-paths имели ожидаемое состояние: root `Makefile` и три `agents/*.md` modified; backend/frontend Makefile untracked; notification/email Makefile modified. Runtime source был clean во всех четырёх service repositories.

## Статический контракт и dry-run

| Команда | Exit | Результат |
|---|---:|---|
| `make -n test` | 0 | Четыре явных вызова backend → notification → email → frontend; без цикла, install, Docker или live infrastructure |
| `make -n lint` | 0 | Четыре явных одноимённых сервисных вызова в требуемом порядке |
| `make -n format` | 0 | Четыре явных одноимённых сервисных вызова в требуемом порядке |
| `openspec validate standardize-core-ci-makefiles --strict` | 0 | Change valid |

Все сервисные Makefile объявляют `.PHONY` цели `test`, `lint`, `format`. Consumer `site-*` в агрегирующих рецептах отсутствует.

## Первый цикл: format gate

`make format`: exit 0.

- backend: Ruff, 241 files unchanged;
- notification-service: Ruff, 89 files unchanged, exclude-check passed;
- email-service: Ruff, 80 files unchanged, exclude-check passed;
- frontend: ESLint `--fix`, 0 errors / 409 warnings, но изменён tracked runtime-файл `src/ui/filters/StringFilter.tsx` (`onChange(undefined)` → `onChange()`).

Сравнение SHA-256 всего заявленного source/test scope до и после команды выявило ровно один изменённый файл: `services/frontend/src/ui/filters/StringFilter.tsx`. Поэтому требование clean/path-accounted diff после format не выполнено.

## Первый цикл: test gate

`make test`: exit 2.

| Сервис | Результат |
|---|---|
| backend | 1003 passed, 5 skipped; exit 0 |
| notification-service | 23 passed, 2 deselected; exit 0 |
| email-service | 39 passed, 4 deselected; exit 0 |
| frontend | 431 passed, 1 failed; exit 1 |

Frontend failure: `src/ui/filters/filters.test.tsx:77`, сценарий `StringFilter > clears to undefined`; после ESLint auto-fix callback вызван без аргумента вместо явного `undefined`.

## Первый цикл: lint gate

`make lint`: exit 2; root остановился на notification-service. Проверки оставшихся сервисов повторены отдельно.

| Сервис | Результат |
|---|---|
| backend | mypy 241 files, Ruff check/format-check и flake8 passed; exit 0 |
| notification-service | mypy failed: 3 errors in 2 files; exit 2 |
| email-service | mypy 79 files, basedpyright 0/0/0, Ruff check/format-check и flake8 passed; exit 0 |
| frontend | ESLint 0 errors / 409 warnings; typecheck failed `TS2554` в `StringFilter.tsx:27`; exit 2 |

Notification mypy errors:

1. `tests/unit/clients/test_email_service_client.py:13`: unexpected `email_service_url` for `EmailServiceSettings`.
2. `tests/integration/test_real_jetstream.py:6`: `asyncpg` lacks stubs/`py.typed`.
3. `tests/integration/test_real_jetstream.py:89`: unexpected `nats_servers_raw` for `NatsSettings`.

Сравнение tracked status/diff до и после lint не выявило новых tracked mutations; изменился только ignored mypy cache. Frontend typecheck также не оставил tracked config/generated diff. Non-mutating свойство lint подтверждено, но exit 0 не достигнут.

## Первый цикл: existing aggregate check

`make check`: exit 2.

- backend check passed: 1003 passed, 5 skipped;
- email check passed: 39 passed, 4 deselected;
- notification check passed, поскольку legacy root target проверяет mypy только по `src`, а не новому полному `src tests` scope: 23 passed, 2 deselected;
- frontend check остановился на том же unit failure: 431 passed, 1 failed;
- следующие `compose-check`, AsyncAPI validation и secret scan не запускались из-за fail-fast. Это не environment-only оправдание обязательных gates: `make test` и `make lint` уже выполнены отдельно и имеют реальные blocking failures.

## Первый цикл: frontend test gate

Diff change-а изначально tooling-only и не менял frontend runtime behavior. Однако обязательный `make format` создал незапланированный behavior/type diff в `StringFilter.tsx`, после чего:

- `npm test`: 431 passed, 1 failed;
- `npm run lint`: 0 errors, 409 warnings;
- `npm run typecheck`: failed, `TS2554`;
- `npm run build`: не достигнут из-за fail-fast в `make check`.

Frontend self-checks и behavior/access test-quality review неприменимы к утверждённому tooling-only scope; появившийся runtime diff является finding и не принимается как часть change.

## Access verification results

| method | path | access class | roles | without auth | with auth |
|---|---|---|---|---|---|
| N/A | N/A | N/A | N/A | N/A | N/A |

Endpoint/runtime API diff отсутствует. Anonymous/public и authenticated/protected проверки: **N/A**. Исключения access policy: **N/A**. Live API SMOKE и endpoint timings: **N/A**. AsyncAPI/NATS checks: **N/A**.

## Повторный Quality Gate после remediation

После первого verdict владельцы устранили оба blocking finding:

- frontend `format` ограничен `npx eslint src --fix --fix-type layout`; QG-induced runtime diff отсутствует;
- notification tests используют Pydantic aliases `EMAIL_SERVICE_URL` / `NATS_SERVERS`, а untyped `asyncpg` ограничен точечным `# type: ignore[import-untyped]`.

Полный Quality Gate 3.1–3.8 повторён с новым path accounting root и всех четырёх service repositories.

| Команда | Exit | Повторный результат |
|---|---:|---|
| `make -n test` | 0 | Четыре явных вызова backend → notification → email → frontend; infrastructure/install отсутствуют |
| `make -n lint` | 0 | Четыре явных вызова, без shell-цикла и `site-*` |
| `make -n format` | 0 | Четыре явных вызова, без shell-цикла и `site-*` |
| `make format` | 0 | backend 241, notification 89, email 80 files unchanged; frontend 0 errors; SHA-256 source/test до/после полностью совпали |
| `make test` | 0 | backend 1003 passed/5 skipped; notification 23 passed/2 deselected; email 39 passed/4 deselected; frontend 432 passed |
| `make lint` | 0 | Все Python mypy/basedpyright/Ruff/flake8 gates passed; frontend ESLint 0 errors и typecheck passed; tracked hashes до/после совпали |
| `make check` | 0 | Все service checks, frontend build, compose config, три AsyncAPI validations и secret scan passed |
| `openspec validate standardize-core-ci-makefiles --strict` | 0 | Change valid |

`make check` дополнительно подтвердил frontend `npm run build`: Next.js production build completed, 15 static pages generated. AsyncAPI CLI вывел только existing governance warnings, 0 errors; документы признаны valid. Compose config и secret scan завершились успешно. Frontend ESLint сохранил existing warning baseline (410 warnings, 0 errors), включая non-fixable при `--fix-type layout` semantic warning; это не влияет на exit 0 и formatter больше не меняет behavior.

Финальное состояние соответствует path accounting: remediation затрагивает только `services/frontend/Makefile`, `services/notification-service/Makefile` и два notification test-файла в дополнение к исходному утверждённому tooling/governance scope. Runtime API/DB/NATS contracts и `site-*` не изменены. Unrelated root task 047 и pre-existing service `.github`/`.helm` файлы не атрибутированы change-у.

## Findings первого цикла (устранены)

1. **[RESOLVED][FORMAT/FRONTEND]** `services/frontend/Makefile:11` — layout-only fix исключил semantic mutation; clean-format и 432/432 tests подтверждены.
2. **[RESOLVED][LINT/NOTIFICATION]** `services/notification-service/Makefile:9` — точечные compatibility fixes устранили 3 mypy errors; полный lint gate passed.

## Verdict

**APPROVED.** Blocking findings устранены, полный Quality Gate повторён, обязательные и расширенный gates завершаются с кодом 0, format/lint не создают незапланированный tracked diff. Access matrix, anonymous/authenticated API checks и live API SMOKE остаются **N/A**, поскольку endpoint/runtime API diff отсутствует. Change готов к task 3.10; sync/archive Quality Gate не выполнял.
