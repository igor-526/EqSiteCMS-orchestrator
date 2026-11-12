# Tasks — fix-email-smtp-tls-mode

Deliverables A/B, DAG, test matrix и gates — в `design.md`; выполнять units последовательно после approval плана, checkbox отмечать немедленно и только по факту. PLAN-1 не выполняет эти реализационные задачи.

## Execution units

Пути `src/...`, `tests/...`, `README.md`, `.env.example` ниже относятся к отдельному repository `services/email-service`. Чужой pre-existing diff не включать; Router обязан освободить пересекающиеся paths до делегирования.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|---|
| `BE-1` | Backend | A | `services/email-service/{src/settings.py,src/infrastructure/email_sender.py,tests/conftest.py,tests/unit/test_smtp_settings.py,tests/unit/test_email_sender.py,README.md,.env.example}` | approval, свободный ownership | Изолированный final-service: `make test` + `make lint`; Ruff — canonical | `docs/tasks/113_email_smtp_tls_mode.md`; `design.md` Decisions/Test matrix; `specs/email-smtp-transport/spec.md`; семь ownership paths; service Makefile/pyproject.toml; verification policy |
| `QG` | Quality Gate (`QG-LITE`) | B | `docs/reports/fix-email-smtp-tls-mode.md`, `.qa/fix-email-smtp-tls-mode/QG/` | `BE-1` | Независимый service gate + static review, LIVE только по отдельным G1..G4 | `design.md` Test matrix/Gates; delta spec; `tasks.md`; BE-1 handoff/evidence; семь изменённых service paths; service Makefile/pyproject.toml; verification policy |

## 1. BE-1 — SMTP-конфигурация, адаптер и локальная регрессия (профиль: Backend)

**Specs:** `email-smtp-transport` · **Пути:** Deliverable A · **Зависит от:** approval плана и освобождение ownership · **Бюджет:** 8 существенных действий, одна service verification group, final-service.

- [x] BE-1.1 Изолировать `tests/conftest.py` до imports settings: исключить dotenv/secret-file sources, использовать только synthetic whitelist environment; покрыть UT-SMTP-07 и подтвердить, что запретительный dotenv sentinel не вызван, runtime `.env` не читается.
- [x] BE-1.2 До правки sender воспроизвести UT-SMTP-08 на исходном adapter с synthetic legacy true/host1127, сохранить безопасный `reproducer-before.json` (ожидается FAIL `false/false`); не считать это доказательством production timeout, при unreproduced остановить closure finding.
- [x] BE-1.3 В `src/settings.py` добавить строгий nullable `SMTP_TLS_MODE`, nullable legacy-флаг без default true, единый resolver и startup validation по полной матрице design; реализовать UT-SMTP-02..04/07 и safe ValidationError без входных secrets. Проверка — ожидаемые modes/errors до сети для всех строк матрицы.
- [x] BE-1.4 В `src/infrastructure/email_sender.py` заменить port-only selection эффективным режимом, явно передавать два флага и `validate_certs=True`, убрать тему письма из собственного лога, не добавлять fallback/debug transcript; проверить неизменность MIME/envelope и credentials forwarding без печати payload.
- [x] BE-1.5 Реализовать в новых `tests/unit/test_email_sender.py` и `test_smtp_settings.py` оставшееся покрытие UT-SMTP-01/05/06/08; сохранить безопасный сопоставимый `reproducer-after.json` (PASS `true/false`) и подтвердить отсутствие downgrade/secret markers без реальной сети.
- [x] BE-1.6 Обновить service `README.md`: все режимы, compatibility-матрица, breaking migration, Selectel и 465/587, отсутствие доказанной доставки и отдельные G1..G4; проверить ST-SMTP-09 и отсутствие claims о выполненной ротации/deployment.
- [x] BE-1.7 Обновить только безопасный `.env.example`: согласованные `587/starttls`, примеры `1127/tls` и `1126/starttls`, legacy удалён/закомментирован, никакого `SMTP_USE_TLS=`; проверить ST-SMTP-09, placeholders вместо secrets, plaintext только явно доверенный локальный пример.
- [x] BE-1.V Выполнить одну final-service группу в изолированном окружении: `make -C services/email-service test` и `make -C services/email-service lint` (format-check уже внутри lint, без повторных aliases); scoped Ruff format перед evidence только на своих путях. Сохранить redacted ledger/fingerprints в `.qa/fix-email-smtp-tls-mode/BE-1/`, отметить выполненные IDs и вернуть handoff. Product network/deployment/auth/send не выполнять; missing dependencies/isolation → blocked, не ремонтировать tooling вне scope.

## 2. QG — независимый acceptance и итоговый отчёт (профиль: Quality Gate)

**Specs:** `email-smtp-transport` · **Пути:** Deliverable B; код только читать · **Зависит от:** BE-1 · **Бюджет:** 6 действий, одна независимая acceptance verification group, профиль QG-LITE.

- [x] QG.1 Сверить раздельные root/service revisions, ownership closure и безопасные fingerprints с BE-1 handoff; проверить, что нет изменений API/БД/NATS и чужих dirty paths. Результат — ограниченный inventory в собственном evidence, без env/секретов.
- [x] QG.2 Независимо ревьюировать UT-SMTP-01..04/07 и ST-SMTP-09 по spec/design, включая полную legacy/conflict-матрицу и startup до сети; результат — конечный scenario registry без пропуска негативных ветвей.
- [x] QG.3 Проверить UT-SMTP-05/06/08: before/after границы клиента, отсутствие fallback и чувствительных логов; сохранить redacted вывод и явно отделить reproducer флагов от невоспроизведённого production timeout. Owner PASS не принимать вместо собственного evidence.
- [x] QG.4 Независимо выполнить одну service verification group (`make -C services/email-service test`, `make -C services/email-service lint`) с проверенной isolation; сохранить ledger и scenario results в `.qa/fix-email-smtp-tls-mode/QG/`. Не дублировать формат-check/aliases и не запускать setup PG/NATS или внешние SMTP вызовы.
- [ ] QG.5 Выполнить LIVE-SMTP-10 только при отдельных G1..G4: подтверждённые разрешённые deployment identities, подтверждение перевыпуска опубликованного API-ключа владельцем, target/mailbox/expiry permit и утверждённый redacted runbook; не более одной отправки на режим и 60 секунд на попытку, stop при первой ошибке. Доказать TLS immediately1127/explicit STARTTLS1126 и доставку без исходного timeout только безопасными outcome/receipt-флагами. Без prerequisites не выполнять, оставить этот checkbox незавершённым, status `unchecked` с причиной; mock не заменяет live и approval плана не заменяет permit.
- [x] QG.V Создать единственный итоговый отчёт `docs/reports/fix-email-smtp-tls-mode.md`: локальные PASS/FAIL, непроверенные gaps, результаты status/strict validation и конечный вердикт; без live допускается только явно одобренный пользователем `APPROVED_WITH_WAIVER`, иначе полный acceptance `BLOCKED`. Findings передать владельцу через Router (не исправлять чужой source); после одного targeted recheck либо исчерпания бюджета — stop. Отметить только фактически выполненные IDs и вернуть handoff.

## Workflow follow-up

- После QG Router организует scoped устранение findings; пересчитывает invalidated evidence по policy, не выдаёт unchecked live за PASS.
- Если live отложен, получить явное решение пользователя о waiver и судьбе незавершённого live task; без него change не объявлять полностью закрытым и не архивировать как выполненный.
- После разрешённого завершения Router синхронизирует delta specs в main specs, повторяет `.cache/openspec-tool/1.14.3/openspec-local validate fix-email-smtp-tls-mode --type change --strict` и архивирует change по штатному workflow. Sync/archive и deployment не являются действиями PLAN-1 или разрешением, выданным этим чеклистом.
