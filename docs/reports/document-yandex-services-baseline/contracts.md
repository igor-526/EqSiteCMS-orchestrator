# QG-CONTRACTS — document-yandex-services-baseline

**Unit: done. Lane: passed в пределах статического docs-only review. Общий verdict не выдан.**

Это назначенный контрактный deliverable, не отчёт QG-SYNTH, не APPROVED и не подтверждение production readiness. Content as-is: fixes, sync/archive/commit и публикация не выполнялись. Основание — прямое поручение пользователя продолжить только QG-CONTRACTS и [его восемь tasks](<../../../openspec/changes/document-yandex-services-baseline/tasks.md#L32-L43>); scope/approval и предыдущая приёмка — [backfill](<backfill.md#L52-L98>).

## Evidence и граница проверки

- Одна contract group: DOC-ACCESS / DOC-SECURITY / DOC-LINKS + два CLI вызова из [test matrix](<../../../openspec/changes/document-yandex-services-baseline/design.md#L128-L130>).
- Воспроизводимая проверка: [contracts-check.py](<contracts-check.py>); полный manifest hashes/scenario titles/access rows/link results/CLI stdout, stderr и exits — [contracts-evidence.json](<contracts-evidence.json>).
- Статическая документационная сверка не переисследует implementation. Source targets открывались скриптом только для stat/подсчёта строк указанного link target, не анализа кода или повторного source audit. Приложения не импортировались. Реальные env, credentials, secrets, сессии не читались и не создавались.
- Provenance унаследован из [принятого backfill](<backfill.md#L19-L25>): root `457be4391fa800214ce6939030d3e125962b89be` + чужой dirty overlay; Yandex `d3cf1dc5879d5ebc2f75bbdb437ca657cf1a4de4`, adapter `0bd7434cc97ac41f0a0aef1088e99b77ead48e1b`. Новый Git/source provenance audit не заявляется. SHA-256 пяти delta совпали с DOC-1-ACCEPT, не только их counts.
- Исходники, пять delta, proposal/design, обе main specs и предыдущие reports не изменялись. Из общего checklist изменены только QG-CONTRACTS.1–.7/.V. Итоговая целостность/точность checkbox фиксируется в [final evidence](<contracts-final-evidence.json>).

## QG-CONTRACTS.1 — backfill и capability manifest

[DOC-1-ACCEPT](<backfill.md#L86-L98>) завершён: 8/40, runtime NOT RUN; исторический PREP выше не трактуется как актуальный итог. [New Capabilities proposal](<../../../openspec/changes/document-yandex-services-baseline/proposal.md#L14-L26>) содержит ровно пять delta; Modified Capabilities отсутствуют. Путь каждой delta совпадает с manifest. Сверены boundaries, requirement/scenario titles, coverage/evidence anchors, не вся реализация четырёх доменных slices.

| Capability / delta | Сценарии | Документационная трассировка |
|---|---:|---|
| [yandex-oauth-accounts](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-oauth-accounts/spec.md>) | 21 | Y1-01..21; proposal E1..E10; access/gaps не заменены гарантиями |
| [yandex-metrica-gateway](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-metrica-gateway/spec.md>) | 22 | Y2-01..22; E1..E12, G-Y2-01..05; ciphertext/xfail и DB/concurrency остаются gaps |
| [ya-metrica-adapter](<../../../openspec/changes/document-yandex-services-baseline/specs/ya-metrica-adapter/spec.md>) | 17 | 8 requirements; исходные titles без новых вымышленных IDs; DB persistence операции не приписана |
| [yandex-service-runtime](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-service-runtime/spec.md>) | 20 | Y3-01..20; source→scenario coverage, readiness/shutdown/pooling/telemetry limits сохранены |
| [yandex-services-access-evidence](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-services-access-evidence/spec.md>) | 20 | S1-01..20; matrix/anchors/gaps/FT-01..08 |

**Итого: 5 capabilities / 100 acceptance scenarios (21+22+17+20+20)**. Не 100 выполненных tests, не implementation task completion. Title/line/hash manifest сохранён в машинном evidence.

## QG-CONTRACTS.2/.3 — DOC-ACCESS и неизменность governance

Сверены все семь полей каждой из 21 строк [S1 matrix](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-services-access-evidence/spec.md#L20-L50>): method/path/access class/roles/without-auth/with-auth и ID/service; пустых полей нет. Сопоставление выполнено с [действующей main matrix и governance](<../../../openspec/specs/yandex-peer-http-contract/spec.md#L35-L79>), не с предположением, что отсутствие auth dependency разрешает публичную запись.

| Строки | Результат сверки с main; предел |
|---|---|
| Y1 | GET auth initiation, 200 / invalid selector 400, caller peer; не добавлен callback GET |
| Y2 | POST code, существующее Public Auth POST exception до user session; 200 / invalid body/code/upstream 400; code в body |
| Y3 | Private Peer Read, профиль/PII; 200 / selector/params 400; не consumer Public Read |
| Y4 | Существующее dev Private Peer Write exception DELETE; 204 absent/repeat, malformed 400; не новое снятие Protected Write |
| Y5 | Sensitive Private Peer Read; plaintext token response 200, missing/invalid/decrypt 400; ID не credential |
| Y6 | Sensitive Private Peer Read; 200 / input/absent/peer failure 400; forwarding не live compatibility PASS |
| Y7 | Private Peer Read с вложенным profile; 200 включая counter=null / malformed 400; absent referenced account 400 — service inference, не отдельный API PASS |
| Y8 | Существующее dev Private Peer Write exception POST; 200 create/update/no-op / invalid/absent/conflict 400; foreign fixture не owner grant |
| Y9 | Существующее dev Private Peer Write exception DELETE; 204 absent/repeat / malformed 400; counter_id — UUID binding |
| M1 | Sensitive Private Peer Read; ciphertext query и provider input не CMS identity; 200 / token/params/upstream 400 |
| H1-Y, H1-M | GET Public Read, 200 static liveness; без readiness claim; main internal-error 400 не отменён |
| D1-Y1..4, D1-M1..4 | Все четыре docs paths у каждого app; GET assertions 200, Public Read; восемь HEAD — отдельно static inference, NOT RUN; Swagger helper не business callback |
| R1 | Unknown path/unsupported method/slash mismatch: 400 без business operation/redirect; не endpoint, не auth denial |

Развёртка по приложениям: **Y — 14 paths/18 method-path; M — 6 paths/10 method-path**. В сумме **20 app-qualified paths / 28 method-path**: 10 business operations, 2 health, 8 docs GET + 8 docs HEAD; **16 GET, 2 POST, 2 DELETE, 8 HEAD**. R1 отдельно, counts не увеличивает. Общий counters path у двух приложений не схлопнут. Business/health HEAD не выдуманы. HEAD выведен только из локальных framework anchors E-F, не из переносимого tracked runtime evidence.

**Explicit unchanged governance:** причины исключений совпали с main: OAuth до session; PII/private counters/token для чувствительного чтения; Y4/Y8/Y9 credential-less writes только как уже существующее dev-допущение. Trust — требуемая внешняя граница, не найденная локальная проверка роли. Заявление Q2, network/expose/CORS не доказывают isolation. Новых anonymous permissions, peer credential, CMS roles, denial outcomes или user rights этот review не утверждает. Production deployment/release blocked без подтверждённой защиты sensitive peer APIs. Общая GET/Protected Write policy, missing/invalid tenant selector и **backend 401/403 сохранены**; локальный peer 400 их не заменяет. Email owner-only и role override правила на peers не переносятся.

## QG-CONTRACTS.4 — anonymous / synthetic / valid-auth / foreign

[Уровни evidence S1](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-services-access-evidence/spec.md#L52-L86>) сверены раздельно: нормативные main outcomes; прочитанные assertions anonymous; прочитанные assertions с fake cookie/Bearer; static source/framework inference; реально выполненный runtime. Последний уровень здесь отсутствует. Во всех строках valid session/roles **unknown**, даже когда колонка with-auth описывает те же assertions. Ни synthetic headers, ни tenant/account UUID, ни пригодный encrypted token не доказывают caller identity.

| Future case | Трассировка и сохранённое ограничение |
|---|---|
| FT-01 | Y1..Y9/M1/H1/D1, E-YA..E-D/E-T → anonymous assertions только source; runtime NOT RUN |
| FT-02 | E-T → fake credentials не valid session; valid/invalid/expired identity и выбранный trusted boundary предстоит проверить; user cookie не даёт новых peer прав |
| FT-03 | Y3..Y9, E-YB/E-YC/E-YD/E-YE → foreign fixtures не authenticated foreign/owner/privileged denial; новые 401/403 и foreign-before-lookup outcomes не придуманы |
| FT-07 | H1/D1/R1, E-HY/E-HM/E-D/E-F → GET source assertions отдельно от HEAD inference; actual anonymous/valid caller runtime NOT RUN; health не readiness |

Main foreign governance остаётся явным: trusted caller с чужим валидным ID имеет существующий локальный контракт; неизвестный ресурс следует main matrix. Это не доступ CMS-пользователю и не доказанный владелец; gap OWNER не закрыт. [FT backlog](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-services-access-evidence/spec.md#L88-L101>) не превращён в новые выполненные tasks.

## QG-CONTRACTS.5 — DOC-SECURITY

Сверены S1-09..16, G-S1-TOKEN/STATE/LIFECYCLE/LOG/EXPOSURE с [safe diagnostics/service mapping](<../../../openspec/specs/yandex-client-failures/spec.md#L31-L53>) и связанными owner gaps. Приоритет main не понижен.

| Future case | Что сохранено как gap / NOT RUN |
|---|---|
| FT-04 | Y5 deliberate plaintext private response отделён от forbidden diagnostics; account_id path не secret credential. Gateway ciphertext query, adapter decrypt и provider Authorization различены; strict xfail plaintext expectation и live Y→M mismatch не разрешены. Synthetic markers для path/query/error/log/telemetry и unexpected decrypt error ещё не выполнены |
| FT-05 | State — tenant UUID; callback содержит code+tenant, не state; nonce/binding/TTL/one-time/replay/CSRF защита и соответствующие outcomes не доказаны |
| FT-06 | Compose host templates/0.0.0.0 не actual bindings/firewall/proxy/auth; production isolation неизвестна; external anonymous rejection не проверен, production gate остаётся |
| FT-08 | Хранение expiry/refresh не refresh-on-read; revocation, mismatch/rotated key, versioning и переходный формат неизвестны. Шифрование не authentication; реальные ключи не читались |

Known raw decrypt exception в logger/ClientError **остаётся конфликтом с main safe-diagnostics**, а не новым разрешённым поведением. Никакого исправления или нового расследования кода не выполнялось. HTTP sanitization и marker assertions не доказывают безопасность всех decrypt branches, loc reflection, path/query/proxy logs, Sentry/telemetry. Все восемь G-S1-* и FT-01..08 сохранены; это открытые вопросы отдельного security decision, не скрытые blockers документационного backfill и не снятие production gate.

## QG-CONTRACTS.6 — DOC-LINKS и proposal E1..E10

Targeted checker проверил **все восемь planning artifacts**, не выборку: stat каждого локального link target, диапазоны `#Lx-Ly` по фактической длине конкретного файла, Markdown heading fragments (включая Unicode). Полный результат на каждый link есть в evidence. Внешних переходов/HTTP запросов не выполнялось; source contents не анализировались. Framework paths из локальных venv проверены только как конкретные E-F targets, без cache/dependency audit.

| Артефакт | Локальных ссылок | Ошибки |
|---|---:|---:|
| [Proposal](<../../../openspec/changes/document-yandex-services-baseline/proposal.md>) | 47 | 0 |
| [Design](<../../../openspec/changes/document-yandex-services-baseline/design.md>) | 34 | 0 |
| [Tasks](<../../../openspec/changes/document-yandex-services-baseline/tasks.md>) | 18 | 0 |
| [OAuth/accounts delta](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-oauth-accounts/spec.md>) | 1 | 0 |
| [Gateway delta](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-metrica-gateway/spec.md>) | 34 | 0 |
| [Adapter delta](<../../../openspec/changes/document-yandex-services-baseline/specs/ya-metrica-adapter/spec.md>) | 45 | 0 |
| [Runtime delta](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-service-runtime/spec.md>) | 65 | 0 |
| [Access delta](<../../../openspec/changes/document-yandex-services-baseline/specs/yandex-services-access-evidence/spec.md>) | 73 | 0 |
| **Всего** | **317** | **0** |

Семантическая сверка [proposal E1..E10](<../../../openspec/changes/document-yandex-services-baseline/proposal.md#L57-L83>) выполнена по принятой OAuth трассировке и owner boundaries, не подменена успешным stat и не является новым source audit:

- E1 — auth routes/OAuth client/API link/code; E2 — orchestration/create-update-expiry/error-before-write; E3 — account/auth DTO и response/validation boundaries.
- E4 — accounts list/delete service/API; E5 — repository predicates/order/delete/flush, SQL/Pg источники без DB PASS; E6 — entity/model/migration и nullable/constraints caveats.
- E7 — encryption/roundtrip/corrupt input без rotation guarantee; E8 — route transaction/prefix/error boundary, fake-session commit/rollback, не real durability.
- E9 — token retrieval/decrypt и missing/corrupt token, не refresh/owner guarantee; E10 — anonymous/header pairs с fake credentials, **не valid session/roles**.

Все десять E definitions находятся на прежних строках 63–72; сохраняется `#source-anchors`, входящие диапазоны из S1 и Y1 gaps 77–83 указывают на соответствующие факты. Остальные evidence namespaces E1..E12 gateway и E-* S1 не смешаны с proposal E1..E10. Исторические WIP/handoff тексты owner slices остаются историческим контекстом, не новым общим статусом.

## QG-CONTRACTS.7 — CLI: фактические exits

CLI использован только по разрешённому explicit path, без bare openspec/установки:

```text
/srv/eqSiteCMS/.cache/openspec-tool/1.14.3/openspec-local status --change document-yandex-services-baseline --json
exit 0; stderr пуст
/srv/eqSiteCMS/.cache/openspec-tool/1.14.3/openspec-local validate document-yandex-services-baseline --type change --strict
exit 0; stdout: Change 'document-yandex-services-baseline' is valid
```

Status: proposal/specs/design/tasks `done`, `isPlanningComplete=true`, `isComplete=true`; nextSteps предлагает inspect implementation progress. **Это статус planning artifacts, не 40/40 implementation tasks и не QG approval.** Strict stderr содержит 8 строк INFO о context headers, игнорируемых как Requirements; warnings/errors нет, это не недостающие requirements. Полные неусечённые stdout/stderr обоих вызовов сохранены в evidence.

Проверка `python3 docs/reports/document-yandex-services-baseline/contracts-check.py`: итог **exit 0**, 317/317 links, 5/100 coverage, 28/20 access, CLI 0/0. Первая попытка собственного checker вернула exit 1 до CLI из-за неверного ожидаемого разбиения GET=15/DELETE=3; фактически GET=16/DELETE=2. Исправлена только арифметика checker, не документы/контракты. Повторная проверка успешна; первоначальный сбой не скрыт и не является продуктовым finding.

## QG-CONTRACTS.V — findings, applicability и handoff

**DOC-ACCESS: passed static; DOC-SECURITY: passed static; DOC-LINKS: passed; CLI: passed. Lane passed, общий QG ещё не завершён.** Новых substantive documentation/contract findings и конкретных blockers данного unit не выявлено. Существующие AUTH/OWNER/TOKEN/STATE/LIFECYCLE/LOG/EXPOSURE/TEST gaps остаются открытыми и явно отражены, не исправлены. Bounded owner rework сейчас не назначается; любое последующее изменение content/governance — решение Router с отдельным owner unit, не автоматическая правка при as-is approval.

Runtime/tests/anonymous-valid-auth-foreign/real PostgreSQL/concurrency/live integration/network/HEAD/prod checks: **NOT RUN**. Make/Docker/npm/uv, новые installs, source/runtime/security/README fixes, cache audit, sync/archive/commit: не выполнялись.

В owned diff только docs report/evidence/checker и восемь checkbox: ENV, BE, FE-AUTO, FE-MANUAL, LIVE **N/A** по отсутствию runtime/code/UI/deployment изменений в этом unit. Это не утверждение о постороннем root overlay. Makefile/NATS/runtime release audit неприменим к owned docs-only diff; он здесь не запускался. **QG-FORMAT обязателен следующим отдельным unit после review lanes**, затем QG-SYNTH — единственный общий verdict. Исходный dirty overlay не форматировать. Только после соответствующих gates возможен publishing unit; sync/archive/release сейчас не разрешены результатом lane.

Отмечены только QG-CONTRACTS.1/.2/.3/.4/.5/.6/.7/.V. DOC-1 остаётся 8/8; суммарно **16/40**, остальные 24 tasks открыты. Передача Router: этот report + два evidence manifest + checker; следующий шаг — QG-FORMAT, не production rollout.
