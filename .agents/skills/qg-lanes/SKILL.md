---
name: qg-lanes
description: Запуск lanes Quality Gate профиля QG-FULL отдельными delegate_quality_gate агентами
whenToUse: Только для профиля QG-FULL (миграции, NATS/AsyncAPI или >2 сервисов с кодом). Для QG-DOCS и QG-LITE не используй — делегируй одного QG-агента через delegate_quality_gate
---

# Quality Gate Lanes (QG-FULL)

Lanes профиля `QG-FULL` запускаются отдельными агентами `delegate_quality_gate` (фон, continuable). Инструмент `workflow` в preset `eqsite-router` отключён: агенты workflow получают persona Router и отказываются выполнять review.

Профили, классификация findings и содержимое lanes — в `agents/quality_gate.md`.

Канон — [verification policy](../../../agents/howto/verification-policy.md).
Перед делегированием передай конечный registry, не поручение «проверить всё»:
`riskId, scenarioId, unit, testPath/command, evidenceOwner, prerequisites, isolation,
permission, budget, stopCondition, status`, revision/codeFingerprint/environmentFingerprint/options
и owner evidencePath. Независимый QG запускает owner tests, не доверяет owner PASS;
один evidence owner на пересечение, другие lanes ссылаются на доказательство.
Root helper suites принадлежат CONTRACTS, не root aggregate всех сервисов.

Для harden-agent-verification-pipeline:
`.qa/harden-agent-verification-pipeline/PROTOCOL-1/qg-registry.json` — executable groups,
finite IDs/nodeIds, source registry/prerequisites; owner matrix:
ENV: ENV-01; BE: INF-01/PG-01/PG-02/NATS-01;
CONTRACTS: POL-01/FIX-01/BR-01/BR-02/BR-03/WIRE-01/WIRE-02/STACK-01/USG-01/USG-02;
SYNTH: SYN-01. Один browser suite закрывает FIX/BR, один usage suite — USG-01/02,
WIRE harness tests один раз плюс два production manifests. BE не повторяет WIRE-02,
CONTRACTS не повторяет broker topology. Product FE-AUTO/FE-MANUAL/LIVE неприменимы:
нет product UI/API diff. Chromium synthetic helper — CONTRACTS.

Budget: конечные IDs, scenario ≤120s, suite ≤15min, два infrastructure repair attempts
суммарно, один targeted recheck тем же агентом. Key blocker/timeout/exhausted budget/
сохранившийся finding — stop; passed/failed/blocked/unchecked с причинами и Router decision.
Новый риск требует bounded registry amendment с evidence owner, не бесконечный harness.
Разрешение change не разрешает PG/NATS setup/teardown: ENV проверяет отдельный consent,
exact manifest/permit target/resource/expiry и изоляцию до mutation. Missing permit — blocked.
External OAuth secret/vendor outage — внешний unchecked gap, synthetic не vendor PASS.
Missing alias/assertion/dependency — tooling defect, не внешний OAuth gap; repair только
в ownership, вне scope blocked-env, не расширять change. Whitespace-only при зелёном
canonical formatter — minor без fix/recheck. Invalidation и aliases dedup — по policy.

## Применимые lanes

По path-scoped diff change:

- `QG-ENV` — есть runtime/API/UI diff либо обязательная real test infra;
- `QG-BE` — diff в Python-сервисах; включает scoped `format/lint/test` этих сервисов;
- `QG-FE-AUTO` — diff в `services/frontend` или `services/site-*`; включает scoped `format/lint/test` этих сервисов;
- `QG-CONTRACTS` — всегда;
- `QG-LIVE` — runtime API diff;
- `QG-FE-MANUAL` — UI/UX behavior diff; CMS проверяется в одном viewport 1366×768;
- `QG-SYNTH` — всегда; пишет единственный отчёт `docs/reports/<change>.md`.

Отдельного агента `QG-FORMAT` нет: его процедура выполняется внутри `QG-BE` и `QG-FE-AUTO`.

## Порядок

```text
QG-ENV (фон, дождаться)
  → QG-BE ∥ QG-FE-AUTO ∥ QG-CONTRACTS   (одним сообщением, фон)
  → QG-LIVE ∥ QG-FE-MANUAL             (одним сообщением, фон; только если на предыдущем уровне нет blocking)
  → QG-SYNTH                           (фон)
```

После запуска уровня Router завершает ответ коротким статусом. Уведомления о завершении будят Router; следующий уровень запускается, когда завершены все агенты текущего.

Если на уровне `BE/FE-AUTO/CONTRACTS` есть `blocking` — сначала fix units владельцам, повторная проверка теми же агентами, затем `LIVE/FE-MANUAL`. Browser QA по коду, который ещё изменится, не запускается.

## Prompt lane

```text
Ты Quality Gate, lane <LANE>, профиль QG-FULL. Change: <change-id>.
contextFiles: <секции design.md, specs/<capability>/spec.md>
Изменённые пути: <union «Изменённые файлы» из handoff'ов units>
Handoff'ы units: <коротко, только нужное lane>
Evidence: .qa/<change-id>/<lane>/ . Файлов в docs/reports не создавай.
Registry: <finite scenario IDs, single evidenceOwner, prerequisites/isolation/permission, budgets/stop>.
Ledger: <verification runId/fingerprints/reason/previousRunId; shared evidence references>.
Верни handoff финальным сообщением: статус, findings с классом (blocking/minor/pre-existing/blocked-env), команды и результаты, пути к evidence.
```

`QG-SYNTH` получает handoff'ы всех lanes в prompt, сам проверки не повторяет, пишет `docs/reports/<change-id>.md` и ставит вердикт.

## Повтор после fix

Тот же агент lane через `send_message`, только затронутые findings. Не более одного повторного раунда. Результат дописывается в тот же отчёт: Router передаёт его агенту `QG-SYNTH` через `send_message`.

Node browser/contracts CLI не поддерживают `--help`: безопасный invalid_cli/invalid-cli,
exit 1/2 соответственно. Их интерфейс проверяется README + pure schema validators,
не выдуманным validate-only flag. Python infra/ledger/collect имеют `--help`.

## Ledger: actual append CLI

[Usage README/schema](../../../scripts/qa/usage/README.md) задаёт allowlisted event.
Сохрани одну JSON object запись в `.qa/<change>/<lane>/event.json`, затем:

```bash
python3 scripts/qa/usage/ledger.py append --ledger .qa/<change>/<lane>/ledger.jsonl --event .qa/<change>/<lane>/event.json
python3 scripts/qa/usage/collect.py --input scripts/qa/usage/fixtures/usage.jsonl --ledger .qa/<change>/<lane>/ledger.jsonl --output .qa/<change>/<lane>/synthetic-summary.json
```

Append `--event` — путь к файлу, не inline JSON/raw handoff. Common поля:
`schemaVersion,eventId,changeId,unitId,role,sessionId,invocationId,eventType,timestamp`.
Verification: `runId,stage,scenarioId,evidenceOwner,command,aliases,revision,
codeFingerprint,environmentFingerprint,options,startedAt,finishedAt,status,evidencePath,
reason,previousRunId,commandClass`; service нужен при full-suite. Command — safe ID,
не shell string; paths относительные labels (ledger `qa/` соответствует physical `.qa/`).
Неизвестные IDs/fingerprints — null, не угадывать; aliases/options — safe lists.
Первый QG run reason=independent-qg, previousRunId=null; повтор имеет новый runId,
existing previousRunId и reason code-changed/fixture-changed/environment-changed и т.п.
Exact before failed / after passed, after.previousRunId=before.runId; finding связывает
exactBefore/exactAfter. Уже зелёный before — unreproduced, не closure.
Lane handoff не закрывает first-QG census: change-level QG qgRound=1 пишет только SYNTH.
Synthetic collect выше — демонстрация интерфейса, не фактический usage/экономия;
unknown/cache отдельно, cost/quota not-calculated. No raw text/env/URL/tool args/results.
