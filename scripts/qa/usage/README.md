# Offline usage / execution ledger (stdlib, Python 3)

Инструменты не читают DSH, home, env, credentials или сеть. Только явно переданные
файлы; нет поиска сессий, распаковки ZIP, runtime/service изменений или оценки денег.
Все fixtures здесь **синтетические**, не нормализованные реальные архивы.

## Проверенные команды из корня репозитория

```bash
mkdir -p .qa/harden-agent-verification-pipeline/USAGE-1
python3 scripts/qa/usage/ledger.py append \
  --ledger .qa/harden-agent-verification-pipeline/USAGE-1/example-ledger.jsonl \
  --event scripts/qa/usage/fixtures/session-start.json
python3 scripts/qa/usage/ledger.py append \
  --ledger .qa/harden-agent-verification-pipeline/USAGE-1/example-ledger.jsonl \
  --event scripts/qa/usage/fixtures/resume.json
python3 scripts/qa/usage/collect.py \
  --input scripts/qa/usage/fixtures/usage.jsonl \
  --ledger .qa/harden-agent-verification-pipeline/USAGE-1/example-ledger.jsonl \
  --output .qa/harden-agent-verification-pipeline/USAGE-1/example-summary.json
python3 scripts/qa/usage/collect.py \
  --input scripts/qa/usage/fixtures/usage.jsonl \
  --ledger scripts/qa/usage/fixtures/ledger.jsonl \
  --output .qa/harden-agent-verification-pipeline/USAGE-1/summary.json
python3 -m unittest discover -s scripts/tests -p test_pipeline_usage.py -v
```

Синтетический ZIP и повторный export (результат usage тот же):

```bash
python3 - <<'PY'
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
base = Path('.qa/harden-agent-verification-pipeline/USAGE-1')
with ZipFile(base / 'synthetic.zip', 'w', compression=ZIP_DEFLATED) as z:
    z.write('scripts/qa/usage/fixtures/usage.jsonl', 'session/usage.jsonl')
PY
python3 scripts/qa/usage/collect.py \
  --input .qa/harden-agent-verification-pipeline/USAGE-1/synthetic.zip \
  --input scripts/qa/usage/fixtures/usage.jsonl \
  --ledger scripts/qa/usage/fixtures/ledger.jsonl \
  --output .qa/harden-agent-verification-pipeline/USAGE-1/zip-summary.json
```

`--input` и `--ledger` повторяемые; `--output` обязателен, расширение `.json`;
рядом пишется `.md` с теми же метриками/знаменателями. Родитель output/ledger должен
существовать. Exit 0 — успешная обработка, **не PASS продукта**; exit 2 — безопасная
ошибка без payload/имени входа. Не запускать с raw секретами в аргументах CLI.

## Usage contract

[usage-event.schema.json](usage-event.schema.json) описывает распознаваемый terminal
`type=assistant/message`, `data.usage`; raw содержимое остаётся только во входе.
Завершённый message — атомарная запись этого типа: `terminal=false` и
`status=streaming|in-progress` исключаются. Chunks, tool/call, tool/result,
step/start, step/end, end, session/start, session/end, session/meta, user/message
игнорируются, их usage не суммируется. Неизвестный event/schema — error, не тихий PASS.
Неподдерживаемый непустой набор counters — error; неизвестные дополнительные поля
при известных counters отбрасываются. Отсутствующий/null usage даёт unknown counters.

Ключ: `sessionId + messageId` и/или `sessionId + eventId`; оба aliases регистрируются,
конфликт role/counters или мост между двумя уже разными identities — error.
`sessionId/messageId` допускаются также в data; eventId — верхний уровень.
Legacy без stable session+message/event использует digest файла + line, что **не**
дедуплицирует повторный export с другими bytes: `legacyRecords`/gap показывают это.
SHA-256 содержимого каждого JSONL (в том числе ZIP member) исключает повтор файла
независимо от имени/сжатия/архива. Перед разбором digest считается bounded streaming
проходом; второй проход — построчный JSON. Полные архивы/файлы в память не читаются.
Stable IDs не экспортируются в usage summary.

Роли: Router/Planner/Backend/Frontend/Site Consumer/Quality Gate/unknown. Берутся из
terminal event.role/data.role либо из явно переданного ledger по sessionId.
Неизвестные vendor роли (например assistant) остаются unknown; противоречащие известные
роли — error. Legacy без sessionId не связывается с ролью по имени файла/пути.

Counters независимы: `totalTokens/inputTokens/outputTokens/cacheReadTokens/cacheWriteTokens`
и snake_case aliases. Различающиеся aliases — error. Неотрицательные integer ≤10^15,
не bool. Каждый агрегат содержит сумму **известных** значений (`value`), known/unknown
и complete; если ничего не известно — null, не 0. Input/output/cache не выводятся
из total. Total включает повторные cache read и не означает уникальный контекст.

`initialContext.input` — input первого **наблюдаемого terminal запроса** на session,
в порядке явно переданных файлов и строк; отдельно от накопленного session usage.
Это не универсальный bootstrap и не доказательство, что более ранних запросов не было.
Отсутствующая session identity/ранняя история/поле input остаются unknown.

Лимиты: 256 KiB запись, 32 MiB JSONL/member, 128 MiB ZIP (сжатый и суммарный
распакованный размер), 256 members, 100000 records на файл и в usage/ledger суммарно.
ZIP принимает только `.jsonl` и директории; absolute/parent/backslash/drive/symlink
members отклоняются. Ничего не извлекается; zip bombs, CRC/JSON errors — fail closed.

## Ledger integration contract (для Router, PROTOCOL и QG)

[ledger.schema.json](ledger.schema.json) — schemaVersion=1; `ledger.py` дополнительно
проверяет timestamps, порядок интервалов, связи и конфликты identities. В `--event`
передаётся **одна JSONL object запись**, а не raw handoff и не многострочный pretty JSON.
Append берёт advisory exclusive lock, перечитывает bounded ledger, проверяет всю
последовательность и только затем дописывает. Повтор точной eventId идемпотентен;
изменение того же eventId или повтор runId под другим eventId — error. Все writers
общего ledger должны использовать этот append CLI. При interrupted write последняя
битая запись требует ручного восстановления владельцем; collector не скрывает её.

Обязательные common поля каждой записи:
`schemaVersion,eventId,changeId,unitId,role,sessionId,invocationId,eventType,timestamp`.
Session/invocation допускают null, если реального runtime ID нет; не угадывать ID.
Timestamp — timezone-aware ISO8601. IDs и поля-labels — **заранее обезличенные**
короткие non-secret идентификаторы. Не передавать raw handoff, prompts, command args,
URLs, DSN, tool results, env или произвольные metadata. Даже синтаксически корректный
секрет в ID запрещён организационно: валидатор не может распознать любой secret.
Строковые labels: alphanumeric, `_ . / -`, без `..`, `:` или пробелов; ≤128 знаков.

События:

| eventType | Дополнительные поля / смысл |
|---|---|
| session-start | Одна новая session, не один unit; identity session берётся явно |
| resume | Отдельная invocation продолжения; новая eventId, та же sessionId |
| handoff | status done/partial либо QG passed/failed/blocked/unchecked; partialReason scope/ownership/infrastructure/other/unknown; parentUnit, splitFrom — связи между units |
| finding | findingId, class product-blocking/nonblocking/infrastructure/unknown, reopened bool; exactBefore/exactAfter runId (null при gap), qgRound |
| verification | Полный набор evidence полей ниже |
| wait | category model/tool/user/external-blocker, start/end ISO8601 либо null |

Существование unit учитывается по unitId в любом событии; split — новая handoff с
новым unitId и splitFrom исходного unit, не новый session-start. partial — status
handoff, не новая сессия. First QG census закрывается одной change-level handoff
`stage=QG,qgRound=1,status=passed|failed|blocked|unchecked`; до неё записываются
findings с qgRound=1. Это утверждение владельца о полноте первого QG, не вывод по
токенам. Не записывать противоречащие lane-level handoffs как итоговый census.

Verification **обязательные** поля помимо common:
`runId,stage,scenarioId,evidenceOwner,command,aliases,revision,codeFingerprint,environmentFingerprint,options,startedAt,finishedAt,status,evidencePath,reason,previousRunId,commandClass`.
`service` обязателен для commandClass=full-suite. Policy `unit` отображается в `unitId`.
`command` — безопасный ID документированной команды, не shell string; aliases/options —
списки безопасных IDs, не raw аргументы. EvidencePath — относительный безопасный label
артефакта, его содержимое collector **не читает**. Неизвестные fingerprint/revision/time/path —
null, aliases/options — [] (означает явно пустой набор, не неизвестный).

Stages: unit/final-service/owner-self-check/fix/QG/docs-only.
Statuses: planned/passed/failed/blocked/not-applicable/unchecked.
Command classes: targeted/full-suite/exact/static/alias.
Reasons: initial, independent-qg, code-changed, fixture-changed, environment-changed,
tool-changed, options-changed, common-code, unknown-blast-radius, broken-gate,
scoped-command-unavailable, exact-reproducer, impacted-regression, alias,
missing-evidence, not-applicable, scope, ownership, infrastructure, other, unknown.
Первый run: previousRunId=null; повтор: существующий runId того же change/scenario,
reason обязателен и не initial. Aliases записывать в aliases **одного** run, не
повторять реальную проверку. Blocked/unchecked/not-applicable требуют reason.
Новая revision/fingerprint — новый runId/eventId, не редактирование старого PASS.

Для exact reproducer — два verification commandClass=exact: before failed, after
passed; after.previousRunId=before.runId; finding.exactBefore/After связывают пару.
Совпадают change/scenario/environment/options/command, а revision/codeFingerprint
могут измениться. Input/keys/DOM/route equivalence кодировать согласованными safe
scenario/options IDs; сырые reproducer payload сюда **не копировать**. Реальный
reproducer/evidence хранится отдельно по policy; сам ledger не доказывает честность
заявленных результатов. Уже зелёный before не превращается в FAIL и не закрывает fix.

## Метрики, coverage и неизвестное

- sessions, resumes, units, split — отдельные счётчики, не подмена друг друга;
- partial causes / все handoffs; unitsWithHandoff/units показывает отсутствующий handoff;
- first-pass: changes без product-blocking findings / завершённые первые QG;
  blocked отдельно, missing/unknown classification и contradictory QG — unknown.
  Failed QG без findings — unknown, только infra findings — blocked;
- exact FAIL→PASS / сопоставимые полные пары; coverage полных пар / всех уникальных
  product-blocking finding identities (последнее состояние finding, включая reopen).
  Без пары/с другой средой — coverage gap, не доказанный fix;
- reopen: уникальные reopened finding identities / все finding identities;
- full-suite: выполненные passed/failed runs по service/revision/reason; повторные
  previousRunId / выполненные runs. Planned/blocked/unchecked не превращаются в execution;
- measured intervals: суммы, union и overlap отдельно, в категориях и между ними;
  отсутствующие границы — unknownIntervals. Незаписанные интервалы всегда неизвестны,
  нулевая измеренная сумма **не** означает нулевое реальное время. Verification spans
  относятся к tool; не дублировать их отдельными wait tool без необходимости — дубли
  сохранятся как overlap, не будут скрыто вычтены;
- cost/quota: `not-calculated`. Нет тарифной/quota модели и нет процентов экономии.

Сравнивать будущие changes можно только с описанными scope (services/files/risks),
профилем/моделью, verification matrix, средой, workflow и полнотой ledger/usage.
Сохранять сырые метрики, размер выборки и gaps; docs-only, synthetic и PG/NATS/live
изменения — разные классы. Один synthetic пилот или восемь несопоставимых исторических
архивов не доказывают экономию. Этот CLI намеренно не выводит сравнительных процентов.

Unknown остаются: отсутствующие handoffs/findings/classification, нет runtime IDs,
legacy re-export identity, missing usage/cache fields, неполная история первого запроса,
измеренные не полностью интервалы, внешний evidence/непроверенная честность ledger,
непредоставленные changes. API access policy не меняется.
