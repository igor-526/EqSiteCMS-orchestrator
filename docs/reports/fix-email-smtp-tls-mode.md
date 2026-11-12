# Quality Gate: fix-email-smtp-tls-mode

**Профиль:** QG-LITE · **Вердикт:** BLOCKED · **Дата:** 2026-11-11

## Итог

Локальная реализация соответствует SMTP transport spec; дефектов в scope не обнаружено.
Независимые test/lint и strict validation прошли. Полный acceptance заблокирован:
`LIVE-SMTP-10` не выполнен, разрешений G1..G4 и явного waiver пользователя нет.
Локальный PASS не доказывает устранение production timeout, авторизацию или доставку.

## Ссылки и контекст

- [Change / proposal](../../openspec/changes/fix-email-smtp-tls-mode/proposal.md), [design](../../openspec/changes/fix-email-smtp-tls-mode/design.md), [spec](../../openspec/changes/fix-email-smtp-tls-mode/specs/email-smtp-transport/spec.md), [tasks](../../openspec/changes/fix-email-smtp-tls-mode/tasks.md).
- [Исходная задача](../tasks/113_email_smtp_tls_mode.md). Approval реализации передан Router; live approval и waiver не предоставлены.
- Изменение добавляет строгий режим `tls|starttls|none`, fail-closed legacy compatibility и явные флаги SMTP-клиента; удаляет чувствительные поля из логов адаптера.
- Root HEAD: `b051a04732d18511bc0e6c8ea52b9019a3331b26`; отдельный email-service HEAD: `fbbf9cdcdeae24aacc5fdbb6a1f9f20356e2790a`.
- Проверено текущее рабочее дерево, без checkout/worktree/коммитов. Чужие dirty paths исключены; семь сервисных fingerprints совпали с BE-1.

## Lanes

| Lane | Результат |
|---|---|
| QG-ENV | Локальные prerequisites проверены; deployment/status/health/rebuild/migrations неприменимы: не разрешены и не нужны локальному gate. Repair attempts: 0 |
| QG-BE | Пройден — settings, adapter, isolation, privacy, regression |
| QG-CONTRACTS | Пройден — scoped diff соответствует spec; API/envelope/access policy не меняются |
| QG-FORMAT | Пройден — один независимый service test/lint, canonical Ruff check внутри lint |
| QG-FE-AUTO / QG-FE-MANUAL | Неприменимо — UI diff отсутствует |
| QG-LIVE | API smoke неприменим — endpoint diff отсутствует; отдельный SMTP live acceptance unchecked без G1..G4 |
| QG-SYNTH | BLOCKED — отсутствуют live evidence и waiver |

## Изменённые пути change

Сервисный diff (только review, QG source не менял):

- `services/email-service/src/settings.py`
- `services/email-service/src/infrastructure/email_sender.py`
- `services/email-service/tests/conftest.py`
- `services/email-service/tests/unit/test_smtp_settings.py` — новый, untracked
- `services/email-service/tests/unit/test_email_sender.py` — новый, untracked
- `services/email-service/README.md`
- `services/email-service/.env.example`

QG изменил только `openspec/changes/fix-email-smtp-tls-mode/tasks.md`, этот отчёт
и игнорируемое evidence `.qa/fix-email-smtp-tls-mode/QG/`.
Рекомендуемая ветка design не задана.

## Независимая verification

| Проверка | Результат |
|---|---|
| `make -C services/email-service test` | PASS: 284 passed, 4 infrastructure deselected |
| `make -C services/email-service lint` | PASS: mypy, basedpyright (0 warnings), Ruff check/format-check, Flake8 |
| `openspec-local validate fix-email-smtp-tls-mode --type change --strict` | PASS |
| `openspec-local status --change fix-email-smtp-tls-mode` | PASS: 4/4 planning artifacts; это не завершённый acceptance |
| Scoped `git diff --check` | PASS |
| Независимый replay исходного adapter → текущий | Ожидаемый FAIL `false/false` → PASS `true/false` |

Команды OpenSpec используют `.cache/openspec-tool/1.14.3/openspec-local`.
Одна full-service группа, без повторных aliases и mutating formatter.
Whitelist environment, offline/no-sync; dotenv eager read подавлен до application imports,
dotenv/secret source calls запрещены sentinels, сетевой connect запрещён в основном test-процессе.
UT-07 проверяет четыре свежих subprocess со своей изоляцией до singleton imports.
Runtime `.env`, реальные credentials и письма не читались и не сохранялись.

## Покрытие Test matrix

| ID | Фактический тест / evidence | Статус |
|---|---|---|
| UT-SMTP-01 | `test_explicit_transport_flags`, `test_default_envelope_and_empty_credentials` — 16 cases | passed |
| UT-SMTP-02 | `test_legacy_matrix`, `test_default_transport` — 31 case | passed |
| UT-SMTP-03 | `test_explicit_legacy_matrix` — 90 cases | passed |
| UT-SMTP-04 | `test_invalid_transport_inputs`, true/false parsing — 38 cases | passed |
| UT-SMTP-05 | `test_transport_errors_do_not_downgrade` — 10 cases | passed |
| UT-SMTP-06 | safe logging/configuration error — 6 cases | passed |
| UT-SMTP-07 | `test_isolated_settings_sources`, field-name aliases — 5 cases | passed |
| UT-SMTP-08 | `test_selectel_1127_legacy_regression`; собственный before/after replay | passed |
| ST-SMTP-09 | README/example compatibility matrix, safe placeholders, migration, rollback, G1..G4 | passed |
| LIVE-SMTP-10 | Отправка и handshake не запускались | unchecked — нет разрешений |

Test paths: `services/email-service/tests/unit/test_{smtp_settings,email_sender}.py`.
Все негативные комбинации legacy/conflict, strict input и cross-port flags включены.
MIME/envelope/credentials forwarding проверены без вывода значений; `validate_certs=True`,
отсутствие fallback и чувствительных own logs подтверждены. Real handshake не эмулируется как PASS.
Before replay использует неизменённый git blob старого sender, текущие synthetic settings/bootstrap;
это не полный старый checkout и не reproducer production timeout. Ранний неизолированный BE run не принят.

## Evidence и воспроизводимость

Каталог: `.qa/fix-email-smtp-tls-mode/QG/`.
- `inventory.json`, `fingerprints.json`: ownership/revisions, SHA256 семи файлов и environment identity.
- Code fingerprint: `a294919ccad5df2f73df1a86a73965ff56ac3a5f3099545b164c39431be6e79a`.
- Environment fingerprint: `2725241155c82a7bf756f6ba3468571af91f6b7251a064c21613ba505adfd9a2`.
- `ledger.json`: commands/options/times/status; первые независимые runs, previousRunId=null, aliases отсутствуют.
- `scenario-registry.json`: конечный registry, единственный evidenceOwner=QG, prerequisites/isolation/permission/budget/stopCondition и причины gaps.
- `test.log`, `pytest.xml`, `lint.log`, `validate.log`, `status.log`, `diff-check.log`.
- `reproducer-before.json`, `reproducer-after.json`, `reproducer.log`; `static-review.md`.
- `run_gate.py`, `reproduce.py`, `guard/sitecustomize.py`: собственные исполнимые сценарии/защита.

## Access verification results

Новые/изменённые endpoints отсутствуют: новая anonymous/authenticated access matrix неприменима.
Существующие API regression tests прошли в service suite; внешний auth не запускался.
Новых исключений из Public Read / Protected Write нет. БД/NATS/UI не затронуты.

## Findings, blockers и дальнейшие действия

Scope findings blocking/minor: нет. Pre-existing defects не обнаружены; чужой root diff не оценивался.
Waivers: отсутствуют.

**Блокер B-LIVE (acceptance/prerequisites, не дефект кода):** отсутствуют G1 — deployment permit
с revision/environment/resource/expiry и подтверждёнными identities; G2 — подтверждение владельцем
перевыпуска опубликованного ключа; G3 — target/mode/mailbox/expiry send permit; G4 — утверждённый
redacted runbook/evidence protocol. Deployment/restart, внешний SMTP, auth и send не выполнялись.

Router должен организовать разрешённую LIVE-SMTP-10 либо получить явный waiver пользователя
на непроверенные handshake/auth/delivery/production timeout. Пока ни один путь не выполнен,
не объявлять полный acceptance, не архивировать change как завершённый. QG.5 остаётся unchecked.
QG.1..4 и QG.V выполнены; source repairs не требуются.
