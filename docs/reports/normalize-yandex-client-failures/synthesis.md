# QG-SYNTH — normalize-yandex-client-failures

## Актуальный повтор SYNTH-R1 — REWORK

**QG-SYNTH-ACK:** на email finding пользователь ответил «Игнорируем это». Зафиксировано решение **не исправлять email в рамках YA/M**; предложение расширения scope ниже не запускается. Это не waiver обязательного failed gate: фактический `make test` exit 2 и FORMAT FAILED сохраняются, workflow не предусматривает их превращение в PASS таким ответом. Общий вердикт остаётся **REWORK**, не APPROVED; sync/archive не запускаются. Новых проверок, исследований, планов, source/commit/tasks изменений нет — только эта запись решения.

**Единый текущий вердикт: REWORK.** Предыдущий dependency BLOCKED ниже — история, superseded: CORE/PEERS/FE installs/readiness и CLEAN-VERIFY теперь PASS. Однако обязательный root test реально упал, поэтому APPROVED невозможно. Основание — [FORMAT-R1](<format.md#L1-L59>) и [handoff](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format/handoff.md>); повторных исследований и запусков в SYNTH нет.

| Проверка FORMAT-R1 | Exit | Время | Итог |
|---|---:|---:|---|
| `make format` | 0 | 4.939 s | Diff отсутствует |
| `make lint` | 0 | 72.038 s | Не warning-free: 434 frontend warnings, 0 errors; uv requested Python 3.14.6 / ready 3.14.7 warnings |
| `make test` | 2 | 7.444 s | Backend: 1482 passed, 1 failed, 5 skipped; остальные 7 aggregate suites не достигнуты |

**FORMAT-R1-TEST — blocking.** Тест `tests/unit/api/test_email_client_boundary.py:66::test_peer_compose_services_have_no_host_port_and_share_private_network` требует отсутствия host ports, но pinned root email compose содержит `EXPOSE_EMAIL_SERVICE_PORT:8000`. Это source/baseline cross-repo contract mismatch, не прежняя dependency/network проблема; регрессия YA/M не доказана. [Точное evidence](<format.md#L33-L44>). Предлагаемый владелец — Backend тестового контракта совместно с root-orchestration owner, через Router в отдельном bounded unit **после согласования расширения исходного approved YA/M scope**. Самовольный email fix не выполнялся и не разрешается этим отчётом.

**FORMAT-R1-WARN:** frontend warnings — owner Frontend; несовпадение requested/ready Python — owner setup/tooling. Lint exit 0 сохранён честно, критерий «без warnings» не выполнен; attribution к change не проверялась. Это не автоматическое поручение ремонтировать baseline.

Остальные lane результаты неизменны и приняты из предыдущего handoff: ENV/BE-R1/CONTRACTS-R1/LIVE-R1 passed, BE-01 закрыт, TOOL 115 passed, FE-AUTO/FE-MANUAL неприменимы. [FORMAT-R1 safety](<format.md#L48-L54>): isolated root/all10 pinned/clean после каждой команды и bookkeeping; original foreign 98 status / 1155 hashes / 1061 index entries, original service HEAD/status/index и root index unchanged. Root PRE/YA/M SHAs ниже сохранены; docs SHA не выдаётся за tested.

**Остаток:** Router получает finding и согласует bounded решение baseline mismatch/warnings; затем только применимые checkpoint/setup/FORMAT recheck и SYNTH. Новые планы, установки, make, commits, sync/archive не запускались. DOCS-CP-FORMAT не может превратить FAILED в PASS. До APPROVED sync/archive/finalize не разрешены. Production isolation по-прежнему отдельное непроверенное release condition, не новое требование расширить этот scope.

Unit повторного synthesis завершён; изменён только этот файл. Собственные QG-SYNTH checkbox уже done и не переотмечались, весь change complete не объявлен. Handoff Router — остановка.

---

## История SYNTH — прежний BLOCKED (superseded результатом R1 выше)

**Единый вердикт: BLOCKED. Unit QG-SYNTH завершён как evidence synthesis, не как успешное завершение change.**

Реализация доставлена локальными commits; функциональные findings закрыты. Полное APPROVED невозможно: locked dependencies изолированного окружения не готовы, CLEAN-VERIFY/FORMAT не пройдены, DOCS-CP-FORMAT pending. Новых кодовых findings и требований ремонтировать посторонние сервисы нет.

## Основание и границы

Сведены только актуальные результаты назначенных lanes и переданные Router handoffs. Утверждённая база/rework/tooling и approval «Начинай»/«Доделывай» приняты из задания и [CONTRACTS-R1](<../../../docs/reports/normalize-yandex-client-failures/contracts.md#L83-L105>). [Задачи SYNTH](<../../../openspec/changes/normalize-yandex-client-failures/tasks.md#L277-L283>) отмечены только за фактическое сведение, вердикт и передачу остатка. Исходники, полный change, reproducer и foreign contents не перечитывались. Новые tests/install/runtime/validation/commit/repair не запускались; использована ранее успешная strict validation CONTRACTS-R1, не заявляется свежая validation после bookkeeping.

## Сводка lanes

| Lane | Актуальный результат и evidence |
|---|---|
| QG-ENV | **Пройден**, только [последний refresh](<../../../docs/reports/normalize-yandex-client-failures/environment.md#L133-L180>): оба peers rebuilt/running/healthy; YA `:8007`, M `:32770`. Обе реальные SQL positive → 1, negative → `password_auth_rejected`; DB не перезапускались. Миграций и repair attempts — 0. Dev exposure не доказывает production isolation. |
| QG-BE | **Пройден**, [BE-R1](<../../../docs/reports/normalize-yandex-client-failures/backend.md#L112-L162>): BE-01 закрыт в обоих peers, реальный Uvicorn regression и контроль чувствительности passed. YA: 662 passed, 7 deselected, 2 xfailed; M: 262 passed. mypy 104/54 files clean, flake8 clean, exits 0. Исторический finding не остаётся текущим blocker. |
| QG-CONTRACTS | **Пройден**, [R1](<../../../docs/reports/normalize-yandex-client-failures/contracts.md#L83-L105>): safe400/unwind/logging/negative guarantees и access/noChecksChange сохранены, findings нет; strict OpenSpec validation valid, exit 0. TOOL: 115 passed по переданному Router handoff, здесь не переисполнялись. |
| QG-LIVE | **Пройден**, [R1 и cleanup](<../../../docs/reports/normalize-yandex-client-failures/live.md#L166-L203>): сохранённые 84/84 + 11/11, SM-01..04 закрыты. SM-03 выполнен на existing dev account с явным разрешением пользователя. Создан и удалён только свой counter; finally accounts=1/counters=0, account identity/cardinality сохранены, account writes отсутствуют. Это не byte-for-byte проверка секретных полей. |
| QG-FE-AUTO | **Неприменимо**: frontend diff отсутствует. Это не отменяет frontend baseline dependencies для корневых checks. |
| QG-FE-MANUAL | **Неприменимо**: UI diff отсутствует; browser QA не заменяет root frontend baseline install. |
| QG-FORMAT | **BLOCKED**, [prereq assessment и SHA-таблица](<../../../docs/reports/normalize-yandex-client-failures/format.md#L5-L61>). Isolated root/all 10 repos pinned, detached, clean, read-only группа exit 0. Dependency readiness не пройдена. `make format`, `make lint`, `make test` **не запускались**, exit codes отсутствуют; это не tests failed. |
| DOCS-CP-FORMAT | **Pending**: successful approval блокируется; pending не мешает оформить настоящий BLOCKED synthesis. |

Покрытие и access приняты из passed BE/CONTRACTS/LIVE handoffs, не перепроверялись заново. SM-01/02/04 — сохранённый live evidence, SM-03 — завершённый R1. [Endpoint timings SM-03](<../../../docs/reports/normalize-yandex-client-failures/live.md#L172-L184>): 23.96–34.06 ms; остальные timings сохранены в lane report. Credential-less private-peer exceptions не являются валидной CMS session; synthetic header/cookie не доказывают user ownership. Новых auth/network changes нет.

## Единственный сводный blocker: isolated dependency readiness

- CORE: CPython download не завершился за 704.7 s до handoff; job остановлен SIGTERM по ограничению Router. Это **не доказанный uv timeout**, exit code null; notification/email sync и tools readiness не выполнены.
- PEERS: frozen vk sync, загрузка `amqp==5.3.1`, PyPI timeout после 3 retries; 262.248 s, exit 1. Готовность peer venv не подтверждена.
- FE: [итог установки](<../../../.cache/qg-normalize-yandex-client-failures/evidence/fe/blocked-result.json#L22-L48>): npm ci не завершился за 649.477 s до Router stop/SIGTERM, exit code null. Был HTTP 200 progress; npm outage **не доказан**, partial node_modules не готовы для verification.

Это незавершённое provisioning, не доказанная source regression и не основание объявить «все network недоступны». Root baseline core checks не имеют успешного evidence. Полного FORMAT before/after и свежего original foreign comparison нет; исторический setup snapshot не выдаётся за новую проверку.

## Зафиксированная локальная доставка

По [проверенной FORMAT SHA-таблице](<../../../docs/reports/normalize-yandex-client-failures/format.md#L29-L43>):

| Репозиторий | SHA |
|---|---|
| YA | `d3cf1dc5879d5ebc2f75bbdb437ca657cf1a4de4` |
| M | `0bd7434cc97ac41f0a0aef1088e99b77ead48e1b` |
| root PRE | `27d30b8f5a74e1db8d885f967186801fb450d79f` |

Pinned/clean status не равен успешным корневым tests. Новый docs SHA не создавался и не выдаётся за tested.

## Handoff / остаток

Владение остатком остаётся у существующих dependency/readiness и QG units; DOCS-CP-FORMAT — Planner, итоговый SYNTH — Quality Gate. Минимум для возобновления: готовые locked deps → CLEAN-VERIFY/SETUP readiness → FORMAT → DOCS-CP-FORMAT → обновление SYNTH. Это описание незакрытых зависимостей, **не запуск retries и не план новых units**. CLEAN-VERIFY, FORMAT.1/.2, DOCS-CP-FORMAT и SPEC-FINAL остаются pending; прочие checkbox не закрываются этим отчётом.

**Sync/archive/finalize не разрешены до APPROVED.** Отдельно: production deployment/release требует технического evidence защиты чувствительных API от внешних anonymous callers; isolation не проверена. Это отдельное release condition Q2, а не требование расширить данный change security-ремонтом до dev verification.

Изменены только этот synthesis и собственные QG-SYNTH.1/.2/.V checkbox. Новых проверок/ремонтов нет. Handoff Router — остановка unit.
