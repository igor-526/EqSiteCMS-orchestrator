# QG-FORMAT — актуальный recheck R2

**Unit QG-FORMAT-R2: проверка выполнена; все команды exit 0, но НЕ warning-free PASS.** Историческое падение R1 больше не воспроизводится полной root-группой. Сохраняется **FORMAT-R2-WARN / WARN-POLICY**: критерий lint «без warnings» не выполнен; собственного waiver нет. Итоговый APPROVED/REWORK принадлежит только QG-SYNTH.

## Проверенная привязка и одна группа R2

Cwd: `/home/igor/projects/eqSiteCMS/.cache/qg-normalize-yandex-client-failures/root`. Tested root: `407121d8bac20cf60f4a48d9533d1b299f732964`; PRE R1 `27d30b8f5a74e1db8d885f967186801fb450d79f` сохранён как история. Все 10 service SHA из [manifest](<../../../.cache/qg-normalize-yandex-client-failures/manifest.json>) заново сверены; точные SHA совпадают с таблицей R1 ниже. Все 11 repos detached/pinned/clean до группы, немедленно после format, после lint/test и final; индексы неизменны. Оба site-сервиса проверены на чистоту, но не входят в make-агрегацию.

Интервал группы: `2026-10-19T09:11:54.524997+00:00` — `2026-10-19T09:13:18.539752+00:00`.

| Команда | Exit | Длительность | Фактический результат |
|---|---:|---:|---|
| `make format` | 0 | 5.512 s | без diff; [полный лог](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format-r2/format.log>) |
| `make lint` | 0 | 24.424 s | все 8 сервисов; 434 FE warnings и uv patch warnings; [полный лог](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format-r2/lint.log>) |
| `make test` | 0 | 52.927 s | достигнуты все 8 suites, 0 failed; [полный лог](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format-r2/test.log>) |

По одному запуску, строго format → немедленная clean-проверка root/all10 → lint → test. Между make не было report/checklist writes. [Machine result](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format-r2/result.json>) со статусом `passed` означает успешные exit codes/clean/invariants, **не** принятие warnings и не итоговый QG verdict. Runner exit 0. [Runner](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format-r2/run.py>).

| Достигнутая suite | Passed | Остальные результаты | Время suite |
|---|---:|---|---:|
| backend | 1483 | 5 skipped | 5.58 s |
| frontend | 629 (73 files) | stderr сохранён | 24.23 s |
| notification-service | 132 | 2 deselected | 2.12 s |
| email-service | 87 | 4 deselected | 2.22 s |
| vk-service | 295 | 21 deselected | 3.30 s |
| seo-service | 3 | — | 1.19 s |
| yandex-service | 662 | 7 deselected, 2 xfailed | 3.97 s |
| ya-metrica-service | 262 | — | 2.15 s |

Итого 3553 passed, 0 failed, 5 skipped, 34 deselected, 2 xfailed. Это штатные исходы неизменённых recipes: backend unit scope, peers `-m "not infrastructure"`, FE Vitest. Дополнительных skip/xfail/selection flags агент не задавал; инфраструктурные suites не объявляются проверенными. R1 email boundary теперь проходит в составе всей backend suite ([test log:17](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format-r2/test.log#L17>)), не только targeted assertion; остальные семь suites действительно выполнены.

## Неустранённые предупреждения R2

- **FORMAT-R2-WARN / WARN-POLICY:** [lint:662](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format-r2/lint.log#L662>) — `434 problems (0 errors, 434 warnings)`, тот же известный FE baseline R1; owner frontend. Не исправлялись, не подавлялись, regression attribution не проводилась.
- [lint:682–753](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format-r2/lint.log#L682-L753>) и test/format logs: uv `--no-sync` warning о requested Python 3.14.6 при готовом 3.14.7; owner setup/tooling. Backend реально Python 3.13.5, остальные Python suites 3.14.7. Окружение не ремонтировалось. Mypy informational note `annotation-unchecked` также сохранён.
- FE test stderr содержит React `act(...)`, nested `<button>` hydration diagnostic, AntD deprecations; MSW unhandled-request diagnostic выведен именованным negative-test API boundary. Vitest завершился 73/73 files и 629/629 tests, но лог не выдаётся за warning/error-output-free. Owner frontend; новый source review/исправления вне unit не выполнялись.
- FE typecheck сообщил генерацию route types и временную reconfiguration; непосредственный post-lint и final status/index clean подтверждены, постоянного tracked изменения нет. Source/config вручную не менялись.

По [QG протоколу:447–451](<../../../agents/quality_gate.md#L447-L451>) warning-free условие не выполнено. SYNTH должен явно применить действующую warning policy, при необходимости адресовать WARN-POLICY Router; это не разрешение игнорировать warnings и не новый repair scope.

## Safety / before-after R2

Актуальный [root-refresh control](<../../../.cache/qg-normalize-yandex-client-failures/evidence/root-refresh-post-bookkeeping.json>) точно совпал с [original before](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format-r2/original-before.json>). [Original after verification](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format-r2/original-after-verification.json>) полностью идентичен: branch `feature/normalize-yandex-client-failures-root-cp`, HEAD `407121d8bac20cf60f4a48d9533d1b299f732964`, **211 foreign status / 1278 opaque hashes / 1071 foreign index entries**, все original 10 service HEAD/status/index и полный original root index сохранены, staged пуст. Foreign content/diff не просматривались, только opaque hashing/metadata. Исторические 98-record baseline не требовались.

Isolated snapshots: [before](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format-r2/isolated-before.json>), [сразу после format](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format-r2/isolated-after-format.json>), [после lint](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format-r2/isolated-after-lint.json>), [после test](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format-r2/isolated-after-test.json>), [final](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format-r2/isolated-final.json>). Root Makefile неизменён. Notification fixture до/после SHA256 `33d988ed956f18a5a29bfd49e250576c0f3b09fe7d34d2c941dcc5a35d6d58f6`, совпадает с feasibility и R1; прежний evidence не перезаписывался, manual cleanup/delete не было.

Окружение handoff: `UV_NO_SYNC=1 UV_OFFLINE=1 UV_PYTHON_DOWNLOADS=never UV_LINK_MODE=copy UV_NO_ENV_FILE=1`, `UV_CACHE_DIR=.../uv-cache/core`, `PYTHONNOUSERSITE=1 PYTHONDONTWRITEBYTECODE=1`, `npm_config_cache=.../npm-cache/fe npm_config_offline=true`. Unset `UV_PROJECT_ENVIRONMENT/UV_PYTHON/PYTHON_VERSION/VIRTUAL_ENV/PYTHONPATH`. Собственные service venv, без original env/секретов, installs, dependency/network repairs, config/source fixes, test weakening, runtime/compose/rebuild, commit/stage/reset/restore/stash.

После группы разрешённый bookkeeping — только этот original report и QG-FORMAT-R2.1/.V в [tasks:326–327](<../../../openspec/changes/normalize-yandex-client-failures/tasks.md#L326-L327>); isolated checklist не меняется. [Post-bookkeeping control](<../../../.cache/qg-normalize-yandex-client-failures/evidence/format-r2/post-bookkeeping.json>) фиксирует own двухфайловый diff и сохранение invariants; новые docs SHA не считаются tested. Actual runtime email/notification bindings остаются прежними до отдельного разрешённого targeted recreate; source/test PASS не доказывает runtime port closure.

## Handoff R2

Unit: QG-FORMAT-R2 | Профиль: Quality Gate | Статус: done (проверка), warning-policy unresolved. Отмечены только QG-FORMAT-R2.1/.V как выполненная проверка и честная передача evidence, не waiver/PASS всего gate. Далее DOCS-CP-FORMAT по прежней двухфайловой allowlist; SYNTH принимает единый verdict. Исправлений findings/повторной группы не было. Остановка.

---

# История — QG-FORMAT recheck R1 (superseded R2 выше)

**Актуальный статус lane: FAILED.** Unit QG-FORMAT-R1 завершил одну реальную обязательную root verification-группу; исправлений и повторных make-прогонов нет. Исторический dependency BLOCKED ниже superseded успешным QG-CLEAN-VERIFY и настоящим запуском, но **не** заменён на PASS. APPROVED может выдать только QG-SYNTH.

## Проверенная привязка R1

Cwd всех трёх команд: `/home/igor/projects/eqSiteCMS/.cache/qg-normalize-yandex-client-failures/root`.
PRE/root: `27d30b8f5a74e1db8d885f967186801fb450d79f`. Все 10 SHA в исторической таблице ниже **заново сверены в R1** и совпадают с [manifest](../../../.cache/qg-normalize-yandex-client-failures/manifest.json):

- backend `b383de9e1a67c32e5490ec568af6f1081fbb53a2`;
- notification-service `962c9aa7d4ddf2130f74652213507757e6353018`;
- email-service `a02f7f1174a52076cdaecf4539e7520028c66cc0`;
- frontend `ba2c3ed98203ac340548c4f1ce1f2602f9eb858e`;
- vk-service `7082663ee0062d75af4e978e1c4ac28537152d2a`;
- site-ad `78212f9854803099f26c1ce793b8090c469fa652`;
- site-ksk-inlove `d31c6239ec2e527aa2c9282df5e2059b42ad3996`;
- seo-service `5c202c3691513b09cb9b6b74558f2dae4d3af811`;
- yandex-service `d3cf1dc5879d5ebc2f75bbdb437ca657cf1a4de4`;
- ya-metrica-service `0bd7434cc97ac41f0a0aef1088e99b77ead48e1b`.

[Readiness PASS](../../../.cache/qg-normalize-yandex-client-failures/evidence/verify-readiness-result.json), [актуальный control](../../../.cache/qg-normalize-yandex-client-failures/evidence/verify-post-bookkeeping-snapshot.json), [bookkeeping PASS предшественника](../../../.cache/qg-normalize-yandex-client-failures/evidence/verify-bookkeeping-result.json) приняты и сверены. Root/all10 detached/pinned/clean до группы, сразу после format, после lint/test и перед bookkeeping: [before](../../../.cache/qg-normalize-yandex-client-failures/evidence/format/isolated-before.json), [after-format](../../../.cache/qg-normalize-yandex-client-failures/evidence/format/isolated-after-format.json), [final](../../../.cache/qg-normalize-yandex-client-failures/evidence/format/isolated-final.json). Format diff отсутствует.

## Фактические команды R1

| Команда | Exit | Длительность | Результат / полный лог |
|---|---:|---:|---|
| `make format` | 0 | 4.939 s | clean; [format log](../../../.cache/qg-normalize-yandex-client-failures/evidence/format/format.log) |
| `make lint` | 0 | 72.038 s | не warning-free; [lint log](../../../.cache/qg-normalize-yandex-client-failures/evidence/format/lint.log) |
| `make test` | 2 | 7.444 s | backend: 1482 passed, 1 failed, 5 skipped; [test log](../../../.cache/qg-normalize-yandex-client-failures/evidence/format/test.log#L118-L148) |

[Machine result](../../../.cache/qg-normalize-yandex-client-failures/evidence/format/result.json) содержит timestamps, команды, окружение, manifest, clean и comparison. Runner exit 1 означает failed lane; это не exit make (они указаны отдельно). Всего по одному запуску каждой make-цели. Skip-флаги/модификации тестов не применялись: пять skipped — штатный результат backend suite. Root make штатно остановился на backend; frontend/notification/email/vk/seo/yandex/ya-metrica tests в этой группе **не запускались**. Lint/format прошли восемь агрегируемых сервисов; site-* не агрегируются.

### Findings и классификация

1. **FORMAT-R1-TEST / blocking:** [backend test log:119–148](../../../.cache/qg-normalize-yandex-client-failures/evidence/format/test.log#L119-L148): `tests/unit/api/test_email_client_boundary.py:66::test_peer_compose_services_have_no_host_port_and_share_private_network` требует отсутствия `ports:`, но pinned root `.docker-compose/docker-compose.email.yml` содержит `EXPOSE_EMAIL_SERVICE_PORT:8000`. Классификация: **source/baseline cross-repo contract mismatch**, не infrastructure/dependency/network failure. Речь о фактическом падении обязательного root test, а не о новом FORMAT-требовании production isolation. Регрессия YA/M этим не доказана; отдельного baseline bisect/review не проводилось. Owner: Backend тестового контракта совместно с owner root orchestration (Router назначает отдельный tightly-scoped unit); QG ничего не исправляет.

Короткий tail:

```text
FAILED tests/unit/api/test_email_client_boundary.py::test_peer_compose_services_have_no_host_port_and_share_private_network
1 failed, 1482 passed, 5 skipped in 5.39s
make[2]: *** [Makefile:4: test] Ошибка 1
make[1]: *** [Makefile:240: test] Ошибка 2
```

2. **FORMAT-R1-WARN:** [lint:662](../../../.cache/qg-normalize-yandex-client-failures/evidence/format/lint.log#L662) — frontend ESLint: `434 problems (0 errors, 434 warnings)`; uv также предупреждает о requested Python 3.14.6 при подготовленном 3.14.7 и no-sync ([lint:682–753](../../../.cache/qg-normalize-yandex-client-failures/evidence/format/lint.log#L682-L753)). Exit 0 честно сохранён, но критерий QG «без warnings» не выполнен. Source-style baseline warnings → owner frontend; Python request/ready-version warning → owner setup/tooling. Предоставленное ready-окружение не менялось; предупреждения не названы падением deps и не ремонтировались. Change-regression attribution отдельно не проверялась.

## Safety и original preservation R1

Окружение точно из handoff: UV cache `.../uv-cache/core`, `UV_LINK_MODE=copy`, `UV_NO_ENV_FILE=1`, `UV_NO_SYNC=1`, `UV_OFFLINE=1`, `UV_PYTHON_DOWNLOADS=never`, `PYTHONNOUSERSITE=1`, `PYTHONDONTWRITEBYTECODE=1`; npm cache `.../npm-cache/fe`, offline true. Unset: UV_PROJECT_ENVIRONMENT, UV_PYTHON, PYTHON_VERSION, VIRTUAL_ENV, PYTHONPATH. Каждый дочерний make использовал собственный cwd/venv; никаких installs, dependencies changes, compose, rebuild, commits, original venv sharing или source/env/credentials transfers.

Notification fixture **byte-identical** известному stock значению и принятому SHA256 `33d988ed956f18a5a29bfd49e250576c0f3b09fe7d34d2c941dcc5a35d6d58f6`; повторная stock запись идемпотентна. Peer cleanup targets заранее отсутствовали. Запущены только штатные recipes; manual cleanup/delete/move/restore/reset/stash не было, valuable parents вручную не удалялись. Hash proof — в [result](../../../.cache/qg-normalize-yandex-client-failures/evidence/format/result.json). Предварительная ошибка runner assessment (избыточное требование равенства всех shell scripts) сохранена в [assessment-only](../../../.cache/qg-normalize-yandex-client-failures/evidence/format/assessment-only.json): команды make там отсутствуют. Условие уточнено до notification **fixture** proof; это не исходный source/deps blocker и не дополнительная verification-группа.

Original opaque control до/после всей группы: **98 status / 1155 hashes / 1061 foreign index entries совпадают**, все original service HEAD/status/index и полный root index неизменны. Own hashes также неизменны до bookkeeping. Никакие foreign contents/diffs не выводились и не анализировались; сравнение metadata/hash-only: [before](../../../.cache/qg-normalize-yandex-client-failures/evidence/format/original-before.json), [after verification](../../../.cache/qg-normalize-yandex-client-failures/evidence/format/original-after-verification.json), [result](../../../.cache/qg-normalize-yandex-client-failures/evidence/format/result.json). После verification разрешены только этот original report и собственные FORMAT-checkbox; isolated tasks не редактируются. Новые docs SHA не объявляются протестированными.

## Handoff R1

Unit: QG-FORMAT-R1 | Профиль: Quality Gate | Статус: partial / lane failed.
Tasks QG-FORMAT.1/.2/.V отмечаются как фактически выполненная проверка и передача **failed** evidence, не как зелёный gate. Остаток: owner units для findings, затем требуемый checkpoint/setup и повторная FORMAT verification; DOCS-CP-FORMAT может сохранять только честный failed verdict. QG-SYNTH не получает основания для APPROVED. Остановка после handoff.

---

# История — QG-FORMAT prereq assessment (предыдущий BLOCKED; superseded R1 выше)

**Статус lane: BLOCKED.** Завершена только ограниченная оценка prerequisites и передача safe evidence. Полная verification FORMAT не выполнена; это не финальный вердикт change. Финальный вердикт остаётся за QG-SYNTH. Никаких новых remediation-попыток, финализации или архивирования в этом unit.

## Dependency gate

QG-CLEAN-VERIFY не пройден: frozen Python dependencies/venv ещё не готовы. В исходном [readiness](../../../.cache/qg-normalize-yandex-client-failures/readiness.json) сохранены `status: partial`, `format_ready: false`, `checks_executed: false`; это setup snapshot, не свежая инвентаризация зависимостей. Актуальные ограничивающие handoffs:

- [PEERS result](../../../.cache/qg-normalize-yandex-client-failures/evidence/peers/result.json): `blocked`; frozen sync в isolated vk-service завершился с exit 1 через **262.248 s**. Загрузка `amqp==5.3.1` с files.pythonhosted.org: operation timed out, **3 retries** (126.4 s внутри сообщения download). Готовность четырёх peer venv не подтверждена.
- [CORE handoff](../../../.cache/qg-normalize-yandex-client-failures/evidence/core/handoff.json): `partial`; download CPython 3.13.14 не завершился к остановке, **704.7 s до handoff**. Job остановлен через supported job_kill/SIGTERM, killed state собран; `exit_code: null`, uv timeout/error **не выдавал**. Notification/email sync и tools readiness не выполнялись.
- Результат FE не запрашивался: он не устраняет установленный Python blocker и не нужен для этого prereq assessment. Никакой вывод о готовности FE здесь не делается.

Классификация: внешняя сетевая доступность и неполный cache/незавершённое provisioning; воспроизводимый source finding этим evidence **не установлен**. Это не падение core tests и не одобрение clean gate.

## Одна read-only status-группа

Проверяемый cwd: `/home/igor/projects/eqSiteCMS/.cache/qg-normalize-yandex-client-failures/root`.

По [manifest](../../../.cache/qg-normalize-yandex-client-failures/manifest.json) одной группой выполнены для isolated root и всех 10 service repos:

```text
git --no-optional-locks -C <isolated-repo> rev-parse HEAD
git --no-optional-locks -C <isolated-repo> status --porcelain=v1 --untracked-files=all
git --no-optional-locks -C <isolated-repo> rev-parse --abbrev-ref HEAD
```

Все команды и группа завершились с **exit 0**: SHA совпадают с manifest, все HEAD detached, все porcelain statuses пусты. Срез включает восемь discovery/aggregate-сервисов и два неагрегируемых site-сервиса.

| Репозиторий | Проверенный SHA |
|---|---|
| root / PRE | `27d30b8f5a74e1db8d885f967186801fb450d79f` |
| backend | `b383de9e1a67c32e5490ec568af6f1081fbb53a2` |
| notification-service | `962c9aa7d4ddf2130f74652213507757e6353018` |
| email-service | `a02f7f1174a52076cdaecf4539e7520028c66cc0` |
| frontend | `ba2c3ed98203ac340548c4f1ce1f2602f9eb858e` |
| vk-service | `7082663ee0062d75af4e978e1c4ac28537152d2a` |
| site-ad | `78212f9854803099f26c1ce793b8090c469fa652` |
| site-ksk-inlove | `d31c6239ec2e527aa2c9282df5e2059b42ad3996` |
| seo-service | `5c202c3691513b09cb9b6b74558f2dae4d3af811` |
| yandex-service | `d3cf1dc5879d5ebc2f75bbdb437ca657cf1a4de4` |
| ya-metrica-service | `0bd7434cc97ac41f0a0aef1088e99b77ead48e1b` |

Это только prereq/status snapshot, не полный before/after FORMAT verification. После группы записи выполняются только в назначенные report/checklist original root; isolated checkout не изменяется.

## Не выполнено

| Команда из isolated root | Результат |
|---|---|
| `make format` | НЕ ЗАПУСКАЛАСЬ: dependency readiness gate не пройден; exit code отсутствует |
| `make lint` | НЕ ЗАПУСКАЛАСЬ: тот же blocker; exit code отсутствует |
| `make test` | НЕ ЗАПУСКАЛАСЬ: тот же blocker; exit code отсутствует |

В original root эти команды также не запускались. Source/config/env/runtime/commits не менялись, npm/uv installs не запускались.

Original foreign не читались и не изменялись этим unit. Принят исторический setup evidence `original_foreign_unchanged: true` (98 status / 1155 hash records) из [readiness](../../../.cache/qg-normalize-yandex-client-failures/readiness.json#L180-L183); повторного foreign hash/status/index comparison сейчас **не было**. Новую гарантию полного original foreign comparison или FORMAT post-check clean этот отчёт не выдаёт.

## Handoff / tasks

Safe BLOCKED evidence передаётся Router/DOCS-CP-FORMAT; [checklist](../../../openspec/changes/normalize-yandex-client-failures/tasks.md#L261-L267): QG-FORMAT.V отмечается только как фактическая передача этого ограниченного evidence. QG-FORMAT.1/.2 остаются открыты: полная verification не выполнена. DEPС/VERIFY/SETUP tasks этим unit не закрываются.

Точный remaining dependency gate: успешные CORE, PEERS и FE `.1/.V`, затем QG-CLEAN-VERIFY `.1/.V` с tools/import-path safety, pinned/clean status всех repos и original foreign comparison; только после этого допустимы SETUP.2/.V и запуск корневой FORMAT-группы. Это описание незакрытой зависимости, не разрешение на новый remediation-цикл. Успешные evidence других lanes этот gate не заменяют. Unit останавливается с lane BLOCKED.
