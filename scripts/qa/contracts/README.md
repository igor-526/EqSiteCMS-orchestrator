# Paired wire harness (test-only)

```sh
node scripts/qa/contracts/run.mjs --manifest .qa/<change>/<unit>/wire.json --scenario-ids HTTP-present,HTTP-absent --output-dir .qa/<change>/<unit>/http
node --test scripts/tests/qa-contracts.test.mjs
```

Никаких shell commands из manifest, установки dependencies, broker/DB setup или runtime HTTP-запросов. Access policy не меняется. Существующий `make contracts-check` не изменён. Node + Python stdlib достаточны для synthetic suite. Для production нужны **заранее установленные отдельные uv.lock environments** каждого checkout; harness проверяет checkout/src, uv.lock и `.venv/bin/python`, но не устанавливает их и не утверждает соответствие installed packages lockfile без внешнего preflight QG.

## Manifest v1

Исполняемая строгая схема — `schema.mjs` (`validateManifest` и `validateResponse`); unknown fields запрещены на всех уровнях. Пример production manifest (seeds реализует SEO-1):

```json
{
  "schemaVersion": 1,
  "mode": "acceptance",
  "adapterId": "yandex-seo-http",
  "producer": {"repo": "services/yandex-service", "python": "services/yandex-service/.venv/bin/python"},
  "consumer": {"repo": "services/seo-service", "python": "services/seo-service/.venv/bin/python"},
  "timeoutMs": 15000,
  "maxBytes": 262144,
  "suiteTimeoutMs": 900000,
  "scenarios": [
    {"id": "HTTP-present", "case": "present", "expected": {"accepted": true, "storageEffects": 0, "disposition": "accepted"}},
    {"id": "HTTP-absent", "case": "absent", "expected": {"accepted": true, "storageEffects": 0, "disposition": "accepted"}}
  ]
}
```

ID/case: `[a-zA-Z0-9][a-zA-Z0-9_.-]{0,79}`. Selection обязателен, непуст, уникален, является явным subset manifest scenarios. Manifest ≤128KiB, ≤100 scenarios. Timeout per process default 15s/max 120s, suite default/max 15min, aggregate stdout+stderr bytes per process default 256KiB/max 1MiB; input bounded тем же пределом. Output dir только внутри root `.qa/`. Unknown adapter, repo, interpreter, extra shell/module/callable keys запрещены до spawn. Repo paths фиксированы от monorepo root; symlink checkout запрещён. Исполнение argv с `shell:false`, Python `-I`; service venv interpreter symlinks допустимы (их использует venv).

Allowlist (`registry.mjs`, меняется только как код):

| ID | kind/protocol | Producer repo | Consumer repo | Module/callable |
|---|---|---|---|---|
| yandex-seo-http | production/http | services/yandex-service | services/seo-service | services/seo-service/tests/clients/test_yandex_lifecycle_contract.py:wire_http_adapter |
| metrica-seo-nats | production/nats | services/ya-metrica-service | services/seo-service | тот же файл:wire_nats_adapter |
| synthetic-http | synthetic/http | . | . | fixtures/patterns.py:http_adapter |
| synthetic-nats | synthetic/nats | . | . | fixtures/patterns.py:nats_adapter |

Synthetic manifest: `mode:synthetic`, оба repo `.` и python `python3`. Synthetic **невозможен** в `mode:acceptance`; report всегда `synthetic-harness-only`, не production доказательство. Production report `production-paired-wire` требует review реальных imports/serializer/handler в SEO-1/QG; регистрация имени сама по себе не доказывает корректность adapters.

## API для SEO-1 / QG

Обе callable — синхронные `def wire_http_adapter(request: dict) -> dict` / `wire_nats_adapter(request: dict) -> dict`. Для async handlers использовать локальный `asyncio.run`. Producer и consumer — **два свежих процесса**, каждый со своим `.venv/bin/python`, cwd и `sys.path=[<repo>/src,<repo>,…]`; никаких shared `core/settings` modules. Env `EQCMS_MONOREPO=1` и `EQCMS_WIRE_PHASE=producer|consumer` выставляет bridge. Файл adapter **обязан импортироваться в обоих environments**: SEO-1 должен сделать top-level imports фазово-безопасными (producer не импортирует SEO clients/fixtures; consumer не импортирует producer schemas). Не возвращать pytest.skip; skip/SystemExit/import errors дают FAIL. Нет transport connection/PG/NATS mutation.

Request producer:

```json
{"schemaVersion":1,"phase":"producer","scenarioId":"HTTP-present","case":"present","protocol":"http"}
```

Request consumer — те же поля, `phase:consumer` плюс **неизменённый** `wire` из producer response. Expected observation не передаётся adapter: его нужно получить реальным исполнением, а не скопировать из ожидания.

Producer response HTTP:

```json
{"schemaVersion":1,"scenarioId":"HTTP-present","status":"passed","wire":{"protocol":"http","body":"{\"counter\":null}"}}
```

`body` — JSON **строка** от production serializer (`model_dump_json`), consumer выполняет production JSON parse/client parse. Negative variants модифицируют уже сериализованную синтетическую границу явно выбранным case; не заменяют production DTO копией.

Producer response NATS:

```json
{"schemaVersion":1,"scenarioId":"NATS-valid","status":"passed","wire":{"protocol":"nats","dataBase64":"e30=","headers":{"Nats-Msg-Id":"synthetic-id"}}}
```

`dataBase64` — canonical base64 production serialized bytes, `headers` — string→string map. Consumer декодирует bytes и передаёт headers реальному handler через transport spy; storage spy считает фактические вызовы. Missing/wrong header name/value допускаются transport schema для проверки handler; нестроковые header values — schema FAIL. Spy ACK/NAK/TERM capture допустим только здесь: он не доказывает broker topology/replay.

Consumer response (обязательно ровно эти поля):

```json
{"schemaVersion":1,"scenarioId":"NATS-valid","status":"passed","observed":{"accepted":true,"storageEffects":1,"disposition":"ack"}}
```

`accepted`: bool, `storageEffects`: nonnegative integer **реальных captured storage calls**, `disposition`: `accepted|rejected|ack|nak|term|none`. HTTP обычно storageEffects=0. NATS invalid MUST иметь storageEffects=0; конкретный disposition брать из действующего handler contract, не из synthetic fixtures. `status:passed` означает успешное исполнение adapter, а не принятие входа: отрицательный валидно проверенный сценарий возвращает `accepted:false`. Runner сравнивает все три observation fields с manifest expected; unexpected exception/skip/missing scenario не PASS. При case неизвестном adapter должен бросить exception, а не возвращать default success.

## Strictness, patterns и privacy

Acceptance всегда strict, независимо от внешнего EQCMS_MONOREPO: missing checkout/venv/lock/dependency/callable/scenario — FAIL. Standalone pytest skip вне harness может существовать, но его нельзя считать acceptance. Completeness summary перечисляет каждый **selected expected ID**, в том числе failed/timeouts, с expected/completed/passed/failed; нет collection-only PASS. Невыбранные scenarios не являются покрытыми.

Synthetic reusable cases: HTTP `valid`, `date-timestamp`, `date-invalid`, `detail-null`, `detail-false`, `detail-zero`, `import-collision`; NATS `valid`, `missing-header`, `wrong-header`, `identity-mismatch`, `timestamp-invalid`, `timestamp-naive`. False/null/0 detail используют fallback `unavailable`; datetime не считается strict date. Эти patterns не требуют продуктовых изменений. Fault cases `timeout`, `oversize`, `invalid-output`, `crash`, `missing-dependency`, `privacy`, HTTP `skip`, `missing-scenario` — только helper tests. Synthetic disposition (`term`) не предписывает production contract.

Bridge suppresses Python import/adapter stdout/stderr, subprocess stderr никогда не сохраняется и не выводится; aggregate bytes всё равно bounded для низкоуровневого output. Raw wire, headers, env, input, exception text, auth/DSN не входят в summary или logs. Сохраняются только version/status/evidenceClass, counts, безопасные scenario IDs и фиксированные reason codes. Не давать секреты в scenario IDs. Не писать сырые bridge ответы в evidence. Privacy tests используют только синтетический sentinel в stdout/stderr/exceptions. Отдельный process group убивается на timeout/overflow и после завершения, без оставления children.

Exit: 0 — все выбранные scenarios passed; 1 — хотя бы один scenario failed; 2 — manifest/CLI/setup error. CLI stdout — только один безопасный JSON, stderr пуст. `summary.json` создаётся для валидного manifest run (включая failed prerequisites); CLI/schema error не создаёт acceptance summary. Перезапуск в тот же output dir перезаписывает summary, поэтому evidence owner должен выбирать уникальный run dir и вести ledger по verification policy.

## Lane-local evidence четырёх root suites

Для независимого QG или fix **обязателен** `QA_EVIDENCE_ROOT`: абсолютный либо repo-relative путь к собственному уникальному run-каталогу строго внутри `.qa/harden-agent-verification-pipeline/`. Это контракт test entrypoints, не новый CLI flag helpers. Значение не должно содержать секреты. Каждый suite эксклюзивно создаёт свой childdir:

| Entry point | Childdir override | Default без переменной (совместимость) |
|---|---|---|
| `scripts/tests/qa-browser.test.mjs` | `qa-browser` | `BROWSER-1` |
| `scripts/tests/qa-contracts.test.mjs` | `qa-contracts` | `WIRE-1/tests` |
| `scripts/tests/stackctl.test.mjs` | `stackctl` | `STACK-1/fixtures` |
| `scripts/tests/test_pipeline_usage.py` | `pipeline-usage` | `USAGE-1` |

Defaults указаны относительно `.qa/harden-agent-verification-pipeline/` и намеренно сохраняют прежнее поведение владельцев. Для QG не использовать defaults или owner root. Один override можно передать всем четырём suites: childdirs различны. Непустой parent run dir допустим; **существующий childdir этого suite — ошибка до тестов**, без overwrite/cleanup/skip PASS. Повтор требует нового run root. Оставшийся после аварии childdir тоже считается коллизией.

Пустое значение (не равно отсутствующей переменной), выход за change root, сам change root, сегменты `.`/`..`, backslash, нестандартные символы пути, symlink на любом участке от repo root и file вместо directory отклоняются. Сегменты допускают только ASCII letters/digits/`_.-`. Путь и предки проверяются до создания suite childdir, existing directories не удаляются. Это защита от неверного output и случайной коллизии, не sandbox от конкурентного злонамеренного изменения filesystem. Логи самой команды также перенаправлять только в lane scope.

Пример первых независимых прогонов QG (новый `run-01`, не запускать повторно с тем же root):

```bash
export QA_EVIDENCE_ROOT="$PWD/.qa/harden-agent-verification-pipeline/QG-CONTRACTS/run-01"
node --test scripts/tests/qa-contracts.test.mjs
node --test scripts/tests/stackctl.test.mjs
python3 -B -m unittest discover -s scripts/tests -p test_pipeline_usage.py
# С заранее подготовленными Playwright/Chromium dependencies:
node --test scripts/tests/qa-browser.test.mjs
```

Browser требует штатные `PLAYWRIGHT_BROWSERS_PATH`/`LD_LIBRARY_PATH` из подготовленного окружения; этот override не устанавливает browser/dependencies. Production paired manifests сохраняют отдельный явный `--output-dir` в том же lane scope; переменная не меняет helper CLI и не подменяет разрешение на PG/NATS/runtime операции.
