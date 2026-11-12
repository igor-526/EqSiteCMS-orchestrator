# Design — SMTP TLS без привязки к порту

Тикет: `docs/tasks/113_email_smtp_tls_mode.md` · Дата: 2026-11-11 · Сервис: `services/email-service`.

## Context

Мотивация — `proposal.md#why`. Подтверждено чтением исходников: `SMTPSettings.smtp_use_tls` имеет default `true`, но `SMTPEmailSender.send` игнорирует поле и передаёт `use_tls=(port == 465)`, `start_tls=(port == 587)`. На 1127 получаются `false/false`. `SMTPSettings` читает `.env`; тесты сейчас не изолируют этот источник. В SMTP-адаптере логируется тема письма — её необходимо убрать в изменяемой зоне.

Проверка пользователем TLS:1127/STARTTLS:1126 и сертификатов — внешний исходный факт, не проведённая агентом проверка. Авторизация, отправка и доставка не подтверждены. Сервис — самостоятельный git repository; root ownership и сервисный diff должны учитываться раздельно. Root store list пуст; штатный `.cache/openspec-tool/1.14.3/openspec-local` разрешил planning home `/srv/eqSiteCMS`, change root `/srv/eqSiteCMS/openspec/changes/fix-email-smtp-tls-mode`. Tooling не изменяется.

## Goals / Non-Goals

**Цель:** однозначная конфигурация на границе settings → SMTP adapter, без изменения core Protocol и внешних API. Нормативный контракт — `specs/email-smtp-transport/spec.md`.

**Не входит:** новая логика подтверждения при привязке, HTTP/tenant/owner policy, NATS envelope и topology, Celery retry policy, БД/миграции, таймауты как способ маскировки ошибочного протокола, новые зависимости, CI/Helm, runtime secrets и rollout. Не читать credential-bearing `.env`, содержимое реальных писем и полные SMTP transcripts. Соседний `send-email-confirmation-on-bind` и перечисленные Router dirty paths не менять.

## Decisions

### 1. Явный режим и fail-closed legacy-матрица

Новое поле `smtp_tls_mode` с alias `SMTP_TLS_MODE`: nullable enum/Literal `tls|starttls|none`, default `None`. Legacy `smtp_use_tls` становится nullable boolean, default `None`. `None` означает отсутствие значения в эффективных settings sources, а не пустую строку. Строки режима строго регистрозависимы, без trim/auto; пустое значение — ошибка. Для legacy сохраняются стандартные boolean-формы Pydantic (`true/false`, `1/0` и другие поддерживаемые библиотекой), пустые и нераспознаваемые значения — ошибка.

| SMTP_TLS_MODE | SMTP_USE_TLS | Порт | Результат |
|---|---|---|---|
| `tls` | отсутствует / `true` | любой | `tls` |
| `tls` | `false` | любой | ошибка конфликта |
| `starttls` | отсутствует / `true` | любой | `starttls` |
| `starttls` | `false` | любой | ошибка конфликта |
| `none` | отсутствует / `false` | любой | `none` |
| `none` | `true` | любой | ошибка конфликта |
| отсутствует | отсутствует / `true` | 465 | `tls` |
| отсутствует | отсутствует / `true` | 587 | `starttls` |
| отсутствует | `true` | остальные, включая 1127 и 1126 | `tls` |
| отсутствует | отсутствует | остальные | ошибка: нужен явный режим |
| отсутствует | `false` | любой | ошибка: plaintext требует явного `none` |
| невалидный/пустой | любой | любой | ошибка валидации |
| любой/отсутствует | невалидный/пустой | любой | ошибка валидации |

Legacy `true` означает требование шифрования: исключение 587 сохраняет прежний STARTTLS, на прочих портах используется implicit TLS. Оно не является универсальной автонастройкой провайдера: `true + 1126` не включает STARTTLS. Для 1126 оператор обязан задать `SMTP_TLS_MODE=starttls`. Значение `false` само по себе больше не разрешает plaintext. Это намеренная breaking-защита, а не молчаливое игнорирование значения.

Сохраняются стандартный default 587 → STARTTLS и legacy 465/587 с `true`; исправляется 1127 с `true`. Не выбран вариант «новое поле всегда побеждает»: конфликт должен останавливать запуск. Не выбран port-only/auto-режим: он снова создаёт ambiguity/downgrade. Не выбран безусловный `true → tls` на 587: это ломает распространённую старую конфигурацию без необходимости.

Один resolver на `SMTPSettings` возвращает эффективный режим; after-validator вызывает тот же resolver при создании модели. Sender читает эффективный режим, не вычисляет его самостоятельно. Ошибки конфигурации возникают при startup API/worker до сети. Диагностика содержит только имена конфликтующих переменных и безопасные метки; не сериализовать всю settings-модель. В SMTPSettings включить сокрытие входных значений в отображении ValidationError (`hide_input_in_errors`); raw `errors()` с input/context в evidence запрещён.

### 2. Граница SMTP-клиента

| Эффективный режим | `use_tls` | `start_tls` |
|---|---|---|
| `tls` | `True` | `False` |
| `starttls` | `False` | `True` |
| `none` | `False` | `False` |

`aiosmtplib.send` получает оба флага явно; `start_tls=None` запрещён, чтобы opportunistic STARTTLS не менял контракт. Передавать `validate_certs=True` явно, не добавлять insecure TLS context. Нельзя одновременно включать оба флага. Параметры host/port/user/password, MIME и envelope остаются прежними. При сертификатной ошибке, отсутствии STARTTLS или timeout исключение выходит по текущему пути, без fallback и без нового retry-механизма. Повтор существующим worker сохраняет конфигурацию. Тему убрать из собственного log message, не добавлять body/credentials/transcript; не менять несвязанные worker/core логи без нового ownership Router.

### 3. Тестовая изоляция без чтения runtime env

Новые тесты используют synthetic inputs, `AsyncMock` для `aiosmtplib.send`, caplog с искусственными маркерами и table-driven settings. Перед импортом `settings` тестовый bootstrap в `tests/conftest.py` исключает dotenv и secret-file sources для BaseSettings в тестовом процессе; использовать штатный `settings_customise_sources` (init + изолированный environment), восстановление после сессии. Не менять production sources ради тестов. Для отдельных моделей дополнительно `_env_file=None`; это само по себе не предотвращает чтение `.env` модульными singleton при импорте, поэтому bootstrap обязателен. Команды тестов запускаются с whitelist environment и синтетическими значениями, не копируют родительские credentials. Подтвердить изоляцию отдельным subprocess-тестом до импортов: источник dotenv, заменённый запретительным sentinel, не вызывается, а конфликт/absence определяется только synthetic inputs.

Не нужен настоящий SMTP server для проверки constructor kwargs. Это проверяет границу клиента, но НЕ является доказательством handshake или production timeout. Тесты не печатают вызовы mock с MIME/password, исключения с payload или реальные письма. Evidence содержит только scenario ID, режим, булевые флаги, результат и безопасные fingerprints.

## Access matrix

Новые/изменённые endpoints отсутствуют. Матрица `method | path | access class | roles | expected without auth | expected with auth` неприменима: HTTP-контракт и access policy не меняются. Public Read / Protected Write и прежние public POST exceptions сохранены. Существующие anonymous/authenticated API tests входят в регрессионный service suite, но новые access scenarios для SMTP не выдумываются.

## Deliverables и ownership

| Deliverable | Владелец | Пути и closure |
|---|---|---|
| A — SMTP-конфигурация и адаптер | Backend | В отдельном repo: `services/email-service/src/settings.py`, `src/infrastructure/email_sender.py`, `tests/conftest.py`, новые `tests/unit/test_smtp_settings.py`, `tests/unit/test_email_sender.py`, `README.md`, `.env.example` (все сокращённые пути этой строки относительно service root) |
| B — независимый gate и итоговый отчёт | Quality Gate | Только `docs/reports/fix-email-smtp-tls-mode.md` и `.qa/fix-email-smtp-tls-mode/QG/`; source/tests читаются, не исправляются |
| P — план и исходный запрос | Planner | `docs/tasks/113_email_smtp_tls_mode.md`, этот change; runtime не менять |

Каждый исполнитель отмечает только свои task IDs в общем `tasks.md` последовательно. Backend имеет право только на семь перечисленных service-файлов; необходимая правка другого пути сначала согласуется с Router. Specs остаются ownership Planner до финального sync Router. QG не создаёт иной report или каталог в `docs/reports`. Полный service-suite и QG ждут освобождения пересекающегося ownership соседними работами; чужой diff не присваивается этому change.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| `BE-1` | Backend | A | Семь service-файлов выше; closure fixtures включён | approval плана; свободный ownership | Одна группа: изолированный service gate `make test` + `make lint`, без повторных aliases; это final-service |
| `QG` | Quality Gate (`QG-LITE`) | B | Итоговый report и собственное evidence | `BE-1` | Одна группа независимого acceptance: полный service gate, static contracts и условный live acceptance только при отдельном permit |

Бюджеты: BE-1 — 8 действий (bootstrap/isolation, settings, resolver tests, adapter, adapter tests, README, example, gate/handoff). QG — 6 действий (ownership/fingerprints, config regression, adapter/privacy regression, независимый suite, условный live gate, итоговый отчёт/handoff). Это не checkpoint units. Если будущий permit требует отдельной крупной инфраструктурной работы, Router выносит её в новый bounded unit/change; текущий unit не разворачивает инфраструктуру.

DAG: `approval → BE-1 → QG → решение пользователя о непроверенном live → Router sync/validate/archive`.
Параллельных units здесь нет. Если live permit уже выдан, QG исполняет live в пределах своего acceptance; если не выдан — только фиксирует gap, без попыток авторизации/отправки.

`contextFiles` BE-1: исходный task; `design.md` (Decisions, Test matrix); delta spec; семь service ownership paths (новые tests — создать); `services/email-service/Makefile`, `pyproject.toml`; `agents/howto/verification-policy.md`.
`contextFiles` QG: `design.md` (Test matrix, Gates); delta spec; `tasks.md`; BE-1 handoff и redacted evidence; семь изменённых service paths; Makefile/pyproject; verification policy. Остальные specs и смежный change не требуются.

## Test matrix

Все node IDs ниже планируемые; evidence сейчас не получено. `tests/unit/` — относительно `services/email-service`. Параметризованные варианты одной оси не превращаются в отдельные checklist tasks.

| ID | Уровень | riskId | scenarioId delta spec | Сценарий и ожидание | testPath/command |
|---|---|---|---|---|---|
| UT-SMTP-01 | unit | R-CONFIG | S-TLS, S-STARTTLS, S-PLAIN, S-PORT | Три режима, явная независимость от порта, точные kwargs `use_tls/start_tls/validate_certs` на 1127/1126/465/587 и cross-port | `tests/unit/test_email_sender.py::test_explicit_transport_flags` |
| UT-SMTP-02 | unit | R-LEGACY | S-LEGACY | Все комбинации 5 портов × 3 legacy-состояния без нового режима, default 587 | `tests/unit/test_smtp_settings.py::test_legacy_matrix` |
| UT-SMTP-03 | unit | R-CONFLICT | S-CONFLICT | Все 3×3 сочетания явного режима и legacy, ошибка до SMTP | `tests/unit/test_smtp_settings.py::test_explicit_legacy_matrix` |
| UT-SMTP-04 | unit | R-INPUT | S-INVALID | Пустые/неизвестные значения, case, отсутствие против пустоты, boolean parsing | `tests/unit/test_smtp_settings.py::test_invalid_transport_inputs` |
| UT-SMTP-05 | unit | R-DOWNGRADE | S-NODOWNGRADE | Синтетические certificate/handshake/STARTTLS-unavailable/timeout ошибки: исключение и один вызов, последующий вызов с тем же режимом | `tests/unit/test_email_sender.py::test_transport_errors_do_not_downgrade` |
| UT-SMTP-06 | unit | R-PRIVACY | S-PRIVATE | Нет subject/body/password/key маркеров в собственных логах и безопасном str ошибки конфигурации | `tests/unit/test_email_sender.py::test_safe_transport_logging`; `tests/unit/test_smtp_settings.py::test_safe_configuration_error` |
| UT-SMTP-07 | unit | R-ISOLATION | S-INVALID, S-CONFLICT | Env aliases и constructor values дают одинаковую матрицу; до module singleton imports dotenv/secret-file отключены; subprocess без runtime credentials | `tests/unit/test_smtp_settings.py::test_isolated_settings_sources` |
| UT-SMTP-08 | unit | R-REGRESSION | S-TLS | Исходные synthetic host1127 + legacy true: before `false/false` FAIL → after `true/false` PASS | `tests/unit/test_email_sender.py::test_selectel_1127_legacy_regression` |
| ST-SMTP-09 | static | R-DOCS | S-DOCS | README/example содержат режимы, полную compatibility-матрицу, миграцию пустых значений и no-live gate | Ревью service README/.env.example и `git diff --check` |
| LIVE-SMTP-10 | live, условный | R-DELIVERY | S-LIVE, S-TLS, S-STARTTLS | Только после permit: 1127 TLS immediately, 1126 explicit STARTTLS, авторизация и подтверждённая доставка без исходного timeout | Согласованный runbook оператора внутри QG; команды фиксируются до запуска и не содержат credentials/body |

### Реестр acceptance prerequisites и evidence

Во всех локальных строках `unit=BE-1 → QG`, `evidenceOwner=QG` — один независимый владелец на свойство; BE-1 self-check хранится отдельно и не заменяет QG. Общая команда локальной группы: `make -C services/email-service test` и `make -C services/email-service lint` с whitelist env и включённой test isolation. Scoped reproducer до изменения не является повторным full suite. Canonical formatter — Ruff; mutating format только Backend на своих путях до evidence, non-mutating `ruff format --check` уже включён в `make lint`, второй formatter/alias не нужен.

| riskId / scenarioId | unit | testPath/command | evidenceOwner | prerequisites | isolation | permission | budget | stopCondition | status |
|---|---|---|---|---|---|---|---|---|---|
| R-CONFIG, R-LEGACY, R-CONFLICT, R-INPUT / UT-SMTP-01..04 | BE-1 → QG | Пути строк 01..04 выше | QG | lockfile deps, pytest, изоляция до импортов | synthetic settings, no network | approval apply только для BE-1, QG read/test scope | один full suite на final-service и один независимый в QG, до 5 минут каждый | credentials source вызван / сеть / unexpected input → stop | planned |
| R-DOWNGRADE, R-PRIVACY / UT-SMTP-05..06 | BE-1 → QG | Пути строк 05..06 выше | QG | mock send, caplog, safe errors | no external SMTP, synthetic markers | локальные проверки после apply | та же группа, не второй suite | secret marker утёк / fallback → finding, не raw dump | planned |
| R-ISOLATION / UT-SMTP-07 | BE-1 → QG | Путь строки 07 выше | QG | controlled subprocess environment | без dotenv/secret sources до imports | локальные проверки после apply | та же группа | невозможно изолировать → blocked до service suite | planned |
| R-REGRESSION / UT-SMTP-08 | BE-1 → QG | Путь строки 08 выше | QG | synthetic legacy true1127, актуальная revision | adapter mock; реальная внешняя среда не эмулируется как PASS | только local reproducer | один before/after и один QG recheck | before не FAIL → unreproduced; не ломать код искусственно | planned |
| R-DOCS / ST-SMTP-09 | BE-1 → QG | README/.env.example, static diff-check | QG | актуальный diff | без env credentials | docs review | один static pass | example конфликтует с матрицей → finding | planned |
| R-DELIVERY / LIVE-SMTP-10 | QG | Отдельно утверждённый redacted runbook | QG | G1..G4 ниже, выкатка владельцем, свежий ключ | согласованный test mailbox и deployment identity | отдельный target/resource/expiry permit на каждый mode/deployment | максимум одна отправка на каждый из двух режимов, ≤60 секунд на попытку, без автоматических повторов | missing permit/key rotation/infra → не выполнять; timeout/cert/auth failure → stop | unchecked — нет deployment/live-send permit и подтверждения ротации |

Неприменимы: БД/транзакционность/идемпотентность/конкурентность (storage и обработчик не меняются), новая API access matrix/DTO (endpoint/envelope неизменны), UI/browser QA (UI нет), topology acceptance (NATS не меняется). Существующие service regression tests остаются применимыми. PostgreSQL smoke не планируется; контейнеры/credentials не обнаруживать, provisioning PG/NATS не разрешён.

### Exact reproducer и предел доказательств

До fix BE-1 запускает UT-SMTP-08 на старом sender после безопасной установки тестового bootstrap: исходные synthetic host1127/legacy true, без внешнего сервера; фиксирует `reproducer-before.json` со значениями флагов `false/false` и FAIL. После — тот же сценарий/keys с `true/false` и PASS в `reproducer-after.json`. Формат и fingerprints — verification policy. Это точный reproducer ошибки выбора flags, но не exact reproducer production timeout. Production incident остаётся unreproduced/unchecked до LIVE-SMTP-10; нельзя утверждать, что mock доказал отсутствие timeout или доставку. Evidence пути `.qa/fix-email-smtp-tls-mode/BE-1/` и `/QG/`, без MIME/адресов реальных получателей/секретов.

## Gates и Migration Plan

- **G0 — approval плана:** сейчас остановка до apply. Никакой runtime-реализации PLAN-1 не выполняет.
- **G1 — deployment:** отдельное разрешение владельца на конкретную revision, окружение, ресурс и срок. Выполняет Router/оператор, не автоматический шаг BE-1/QG. Runtime secrets, рестарты и ротация не разрешены approval change.
- **G2 — ключ:** владелец отдельно перевыпускает ранее опубликованный API-ключ и подтверждает готовность без значения ключа. До этого внешняя авторизация запрещена. Ротация сейчас не подтверждена; агент её не делает.
- **G3 — live-send:** отдельный permit на SMTP target/mode, test mailbox, число отправок (не более одной на режим), срок и безопасное подтверждение доставки оператором. До запуска согласовать runbook без аргументов/вывода secrets или письма. Для двух режимов нужны подтверждённые deployment identities, а не самовольное переключение настроек.
- **G4 — evidence privacy:** никаких SMTP debug transcripts, raw settings/env dumps, паролей, API-ключей, subject/body и скриншотов писем. Только безопасный receipt-флаг оператора, duration/outcome, режим, redacted correlation identifier и deployment fingerprint.

Будущая миграция после отдельных разрешений: проверить конфигурацию владельцем без передачи env агенту; убрать пустые legacy values; для Selectel использовать `SMTP_TLS_MODE=tls`/1127 либо `SMTP_TLS_MODE=starttls`/1126, legacy удалить (или оставить `true` для encrypted mode). Для 465/587 примеры также явные; default в example — согласованные 587/`starttls`, legacy строка отсутствует/закомментирована, а не пустая. `none` — только явно доверенная локальная среда; документация запрещает использовать его как workaround TLS failure. Все secrets — только placeholders.

Rollback: остановить неуспешную выкатку владельцем по отдельному permit; вернуть совместимую конфигурацию и revision вместе. Старый sender не поддерживает новую настройку: откат к нему на 1127 НЕ является безопасным рабочим rollback; до решения владельца остановить отправку, а не перейти к plaintext. Автоматический rollback/downgrade не добавляется.

QG-LITE включает BE/contracts/static и независимый полный suite; UI/PG/NATS/live API lanes неприменимы. Условный SMTP live acceptance при отсутствии разрешений остаётся unchecked в единственном отчёте. Закрытие локальной реализации возможно только с явно согласованным пользователем waiver внешней доставки (`APPROVED_WITH_WAIVER`); без waiver/permit итог по полному acceptance — `BLOCKED`, не безусловный APPROVED. Кодовый PASS не закрывает production incident. После QG и решения о live/waiver Router отдельно выполняет sync delta specs, повторную strict validation и archive по workflow; это не действия PLAN-1 и не дополнительный checkpoint unit.

## Risks / Trade-offs

- [Старые пустые env/false перестают запускаться] → явная миграционная таблица, валидация до соединения, никакого чтения реальных secrets агентом.
- [Legacy true1126 означает tls, не starttls] → обязательный явный `starttls` в Selectel-примере; никаких provider-specific догадок.
- [Mock не доказывает поведение внешнего TLS и доставку] → LIVE-SMTP-10 и отдельные gates; не обещать исправленный production timeout по локальному PASS.
- [Pre-existing/параллельные изменения settings, README, conftest] → Router сериализует ownership до BE-1; конфликт не исправлять захватом чужого diff.
- [Service suites/типизация могут иметь существующие падения] → evidence baseline безопасной командой, blocker либо scoped finding; не ремонтировать tooling вне scope. Один targeted QG recheck, максимум две infra repair attempts в разрешённом scope, затем stop.

## Open Questions

Ключевые настройки и compatibility решены. До live остаются только операционные вопросы: кто подтверждает ротацию, какая revision/среда и test mailbox разрешены, сроки permit и принимает ли пользователь временный waiver доставки. Эти вопросы не блокируют apply-ready проектирование, но блокируют внешнюю авторизацию/отправку и безусловное закрытие acceptance.
