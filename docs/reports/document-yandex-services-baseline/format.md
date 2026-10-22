# QG-FORMAT — document-yandex-services-baseline

**Unit: partial (PREP). Lane: BLOCKED / не завершён. Не общий verdict.**

Назначены только [QG-FORMAT.1–.7/.V](<../../../openspec/changes/document-yandex-services-baseline/tasks.md#L45-L56>). Выполнен bounded подготовительный срез; команды FORMAT не заменены документационным PASS. SYNTH, sync/archive, source/security/runtime fixes и commit/release не выполнялись.

## Результат и circuit breaker

Исходная готовая FORMAT-изоляция и активный FORMAT-процесс в текущем workspace не обнаружены. Старые `/home/igor/...` worktree registrations помечены Git как prunable; они не использованы. Старые test failures не присваиваются текущей проверке.

Подготовлены файловые экспорты root и **восьми** вложенных repositories, девять readonly `0444` HEAD-архивов плюс отдельный approved-docs archive. Проверены hashes всех экспортированных файлов и пяти delta относительно принятого CONTRACTS manifest. **Это ещё не clean Git worktree:** у экспортов нет `.git`, Git/index baseline и новые зависимости не подготовлены. Поэтому QG-FORMAT.2 остаётся открытым. Предусмотренный пользователем circuit breaker применён после девяти repository exports и safe-export preparation; установка восьми окружений и Git-baseline потребовала бы следующего bounded PREP, а не продолжения всего deliverable в одном unit.

| Обязательная root-команда | Состояние | Exit |
|---|---|---|
| `make format` | NOT RUN — Git-aware baseline/deps не готовы | отсутствует, не 0 |
| `make lint` | NOT RUN — та же причина | отсутствует, не 0 |
| `make test` | NOT RUN — та же причина | отсутствует, не 0 |

Файлы stdout/stderr этих трёх команд отсутствуют: команды не запускались. Это не результаты запуска, не failure исходного кода и не waiver docs-only. Текущих test/formatter findings нет, поскольку RUN ещё не состоялся.

## QG-FORMAT.1 — граница исходного overlay

[Fresh original metadata](<format-original-before.json>) фиксирует root HEAD `457be4391fa800214ce6939030d3e125962b89be`, исходные porcelain/raw tracked/index status и clean status восьми сервисов. Проверены actual cwd `/srv/eqSiteCMS`, worktree registrations и процессы. Root dirty, индекс без staged diff. Исходный overlay не копировался целиком, не форматировался, не сбрасывался и не коммитился.

Разрешённый copy manifest: ровно **18 файлов** — metadata/proposal/design/tasks change, пять delta, две accepted main overlay specs (`yandex-peer-http-contract` и `yandex-client-failures`), семь уже принятых DOC-1/CONTRACTS report/evidence/checker файлов. Содержимое пяти delta использовано только для hashes/copy, не нового review. Полный список путей и SHA-256 — [snapshot manifest](<format-snapshot.json>). Чужие dirty Make/scripts/configs/README/прочие changes не переносились. Из root взят tracked HEAD, а не текущие dirty версии.

Snapshot сохраняет checklist до собственных новых отметок: 16/40. Это intentional frozen input, не требование копировать позднейшие checkbox/report обратно внутрь baseline.

## Provenance и изоляция

Файловый snapshot: [repo](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/>). Readonly архивы: [sealed](<../../../.qa/qg-format-document-yandex-services-baseline-v1/sealed/>). Исходные реальные env, `.venv`, `node_modules`, credentials не читались и не копировались; symlink/bind не создавались. Full clone/object transfer не использовались.

| Repository | Exported HEAD |
|---|---|
| Root | `457be4391fa800214ce6939030d3e125962b89be` |
| backend | `68bbbbd979e07f745cafabf886c54fe515d87861` |
| frontend | `ba2c3ed98203ac340548c4f1ce1f2602f9eb858e` |
| notification-service | `5c15cbf7ca4acef61fbac6f69642f43f5ac3bbb4` |
| email-service | `c298998ce6f3b3baff0f019e1a99029db1814b24` |
| vk-service | `fe02a63af148b9858c09afb9d36b768590e0fb88` |
| seo-service | `5c202c3691513b09cb9b6b74558f2dae4d3af811` |
| yandex-service | `d3cf1dc5879d5ebc2f75bbdb437ca657cf1a4de4` |
| ya-metrica-service | `0bd7434cc97ac41f0a0aef1088e99b77ead48e1b` |

Root HEAD metadata содержит два credential-named tracked path и один unrelated DSH gitlink, не symlink. Первая попытка безопасно остановилась по credential-name guard **до archive**, вторая — по non-regular-entry guard **до archive**; обе exit 1. Две ограниченные корректировки касались только собственного exporter: explicit positive safe-path manifest, затем исключение gitlink. Третья попытка exit 0. Исключённые пути перечислены в manifest только как metadata; содержимое credentials/gitlink target не читалось. Это safety-подготовка, **не новый security audit, finding о содержимом credentials или source/security approval**.

Экспортёр [format-prep.py](<format-prep.py>) защищён от повторного исполнения поверх созданного snapshot. Не повторять готовый экспорт и не удалять изоляцию. [Preparation evidence](<format-prep-evidence.json>) содержит chronology/exits, dependency-input SHA-256 и metadata ограничений; первые stderr представлены диагностическими excerpts, не выдаются за несуществующие сохранённые полные логи root-команд.

## Инструменты и следующие actual commands

Проверены известные host tools в sanitized environment, без установки: `uv 0.13.5`, `node v24.22.1`, `npm 11.19.1`, `GNU Make 4.4.1`, version group exit 0. Host binaries readonly допустимы. [format-env.sh](<format-env.sh>) задаёт explicit PATH с фактическими uv/node/npm/make; HOME/npm/uv/browser/XDG caches принадлежат данной изоляции. `TMPDIR` — отдельный sibling вне exported repo, чтобы standalone workspace-discovery tests не находили родительский монорепозиторий. `UV_PROJECT_ENVIRONMENT` unset; implicit uv sync и npx downloads отключены. Сервисные env не импортируются. Возможные стандартные compile/cache effects version calls не превращены в глобальный cache audit; сохраняется принятый Router residual NOTE.

У root Make фактически **восемь** вызовов каждого target: backend → frontend → notification → email → VK → SEO → Yandex → adapter. Ни список, ни порядок не менялись под другой исторический четырёхсервисный контракт. Make каждого сервиса прочитан только для запуска/safety. Нужны семь отдельных Python env из существующих `uv.lock` и frontend из существующего `package-lock.json`; hashes входов сохранены. Никакие deps не устанавливались, tracked locks/configs не менялись.

До RUN заранее allowlisted generated outputs в manifest: service-local `.ruff_cache`, `.mypy_cache`, `.pytest_cache`, `.venv`, `__pycache__`, pyc/egg-info, frontend `node_modules`, `.next`, `next-env.d.ts`, `tsconfig.tsbuildinfo`. Generated declarations не считать source autofix автоматически, но обязательно сохранить их diff/происхождение. Всё вне allowlist требует отдельного findings accounting.

## Bounded handoff: PREP → PREP-ENV → RUN

1. **QG-FORMAT-PREP-ENV**, тот же профиль/ownership, завершает только QG-FORMAT.2. Использовать готовые readonly архивы/manifest, не экспортировать заново dirty original. Подготовить безопасный Git-aware/path-accounted baseline root+8 nested без original Git/object changes и без переноса исключённых secret blobs, затем семь locked Python env и один locked Node env. Только locked installs с уже принятыми pinned tools, без lock/config updates; при превышении 8–12 действий разделить PREP по dependency slice. Не использовать исходные env/deps. Сохранить точные install commands/exits и generated baselines. Это оставшаяся подготовка, не code repair; конкретной third-party outage/нехватки secret пока не установлено.
2. **QG-FORMAT-RUN**, зависит от завершённого PREP-ENV: QG-FORMAT.3/.4/.5/.6/.7/.V, одна root verification group. В sanitized owned env последовательно `make format`, `make lint`, `make test` из корня snapshot. Между командами полные root+nested tracked/index diffs, статусы и generated accounting. Безопасный nonzero не отменяет оставшиеся команды. Не трансферить formatter diff в original; regression/startup failure — immediate bounded finding владельцу, без source fixes. PASS только при трёх успешных командах и unchanged approved source.
3. Затем отдельный SYNTH; сейчас никакого общего APPROVED или разрешения archive-readiness нет. Concurrent root change и его исторический 77/78 blocker не исправлялись и не подтверждались заново.

## Итог checkbox и ограничения сохранности

Отмечен **только QG-FORMAT.1**; итог **17/40**. QG-FORMAT.2–.7/.V открыты. QG-FORMAT.7 не закрыт лишь описанием PREP split вместо анализа фактических root failures. Финальная сохранность original metadata и approved docs — [format-final-evidence.json](<format-final-evidence.json>).

Preservation check ограничен root/nested HEAD/status/raw/index metadata и SHA-256 разрешённых docs/dependency inputs, не побайтовым аудитом всего чужого dirty overlay или внешних generated caches. Нельзя заявлять полную историческую идентичность всех unrelated dirty bytes. Source/runtime/live auth/real PostgreSQL/security readiness остаются NOT RUN/unknown; production gate сохранён. Изоляция оставлена для следующего bounded unit, ожидания дополнительных инструкций внутри завершённого PREP нет.

## QG-FORMAT-PREP-ENV — завершён, handoff Router → RUN

Этот append заменяет **только актуальную готовность PREP**: QG-FORMAT.2 выполнен, общий прогресс **18/40**. Исторический PREP выше и frozen snapshot не переписаны. Lane FORMAT ещё не завершён; `make format`, `make lint`, `make test` по-прежнему **NOT RUN**, exits отсутствуют. Это не общий APPROVED.

### Git-aware baseline и immutable inputs

[Owned repo](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/>) получил девять независимых throwaway Git repositories. Только positive manifests safe exports + прежние 18 approved files добавлены в локальные index; original objects/branches не импортированы. Synthetic commits — только измерительная база, не release/product commits. Root исключает восемь nested directories через локальный info/exclude; каждый nested проверен независимо, поэтому root clean не скрывает source diff. Полные tree/index digests, exported HEAD mapping, команды и stdout/stderr — [checkpoint/command ledger](<format-prep-env-state.json>) и [final evidence](<format-prep-env-final.json>).

| Repository | Local synthetic baseline |
|---|---|
| root | `1df545fc65fd1baa9788a45a91649764ecc1890d` |
| backend | `b5b1b0787582aa6244bdd56fd9b8e44973d86bf9` |
| frontend | `dffcf6a431b4484f25273dca1d16a389430123e1` |
| notification-service | `964816c31aea91ee5ada7e5ca0540046475d156f` |
| email-service | `3abb1d32dc139b9733f493fc8e239938bbad051f` |
| vk-service | `697b410e13d19638970bd8d78d3950e0adcba28b` |
| seo-service | `68e5edce814f1ec50b3952ae2fbda706c0775d76` |
| yandex-service | `2ef1daa0b886a2e3224667317665587001211795` |
| ya-metrica-service | `368344647965d70a332ea65b2ce012c4bd59433e` |

Начальный status/tracked/index diff до generated outputs пуст во всех девяти repositories. После provisioning tracked/index diff также пуст, index manifests и HEAD неизменны; все approved exported bytes проверены по hashes. Десять [sealed archives](<../../../.qa/qg-format-document-yandex-services-baseline-v1/sealed/>) остаются `0444`, их SHA-256 и [frozen manifest](<format-snapshot.json>) неизменны. Excluded credential-named paths/gitlink остаются исключёнными; contents не читались. Controlled process amendment исходных design/tasks после freeze сохранён отдельно в evidence: snapshot намеренно остаётся прежним 16/40, текущие split/checklist edits туда не копировались; пять content deltas неизменны.

### Locked provisioning: все восемь групп готовы

Команды выполнялись из соответствующих `repo/services/<group>` внутри owned isolation, в sanitized окружении. Полные абсолютные cwd, argv, override variables, exits, длительность и отдельные stdout/stderr каждого запуска — [command ledger](<format-prep-env-state.json>). Все восемь основных install exits **0**.

| Group | Точная install-команда | Exit |
|---|---|---|
| backend | `uv sync --frozen --all-groups --python 3.13.5 --no-build-isolation` | 0 |
| notification-service | `uv sync --frozen --all-groups --python 3.14.6 --no-build-isolation` | 0 |
| email-service | `uv sync --frozen --all-groups --python 3.14.6 --no-build-isolation` | 0 |
| vk-service | `uv sync --frozen --all-groups --python 3.14.6 --no-build-isolation` | 0 |
| seo-service | `uv sync --frozen --all-groups --python 3.14.6 --no-build-isolation` | 0 |
| yandex-service | `uv sync --frozen --all-groups --python 3.14.6 --no-build-isolation` | 0 |
| ya-metrica-service | `uv sync --frozen --all-groups --python 3.14.6 --no-build-isolation --inexact` | 0 |
| frontend | `npm ci --include=dev --ignore-scripts --no-audit --no-fund --offline=false` | 0 |

На время явных Python installs только `UV_NO_SYNC=false`; frozen сохранялся. Сеть Node разрешалась только install override `npm_config_offline=false`. Pinned Python provisioned явно: `uv python install 3.13.5 3.14.6 --no-bin` из owned base, exit 0, только здесь `UV_PYTHON_DOWNLOADS=automatic`; install/bin directories принадлежат isolation. Никакие original env/deps/node_modules не использованы.

Adapter перед sync: `uv venv --python 3.14.6 .venv` → 0; `uv pip install --python /srv/eqSiteCMS/.qa/qg-format-document-yandex-services-baseline-v1/repo/services/ya-metrica-service/.venv/bin/python --only-binary :all: setuptools==80.9.0` → 0. Это единственный evidence-local build backend, closure ровно один package. Frozen `fernet==1.0.1`/`pyaes==1.6.1` успешно собраны без build isolation/latest tools. `--inexact` сохраняет этот build backend, не меняя source locks. Версии distributions, interpreter/tool artifact SHA-256 и setuptools dist-info hashes — [environment evidence](<format-prep-env-evidence.json>).

Node lifecycle scripts намеренно выключены, браузеры/Sentry CLI downloads не запускались. Проверены locked версии всех реально установленных packages, наличие обязательных nonoptional packages, resolution eslint/typescript/vitest/next и native loads oxide/sharp; root format/lint/test не требуют Sentry CLI/browser postinstall. Python packages сверены с locked versions, необходимые root Make tools присутствуют. Установки не равны test/runtime PASS.

### Одна environment verification group и ограничения

[Первая сверка](<format-prep-env-evidence.json>) завершилась exit **1** на консервативном guard byte-hash original VK index; все восемь environment groups, immutable hashes, isolated tracked/index, generated accounting прошли. [Финализация той же группы](<format-prep-env-final.json>) → exit **0**, `environment_ready=true`, с явно сохранённым NOTE, не удаляя исходный nonzero evidence.

**NOTE original VK index:** physical SHA-256 между ограниченными metadata snapshots изменился. HEAD/status/tracked/staged raw прежние; до/после staged diff пуст относительно одного HEAD, дополнительный `git diff --cached --quiet` → 0. Логическое staged content не изменилось; причина physical drift **unknown**, побайтовая сохранность этого index **не установлена**. Собственные original Git команды — только metadata reads с `GIT_OPTIONAL_LOCKS=0`; original add/commit/write-tree/reset/clean/update-ref не выполнялись. Это не утверждение `unknown preservation=true`, не аудит unrelated dirty bytes/caches и не основание ремонтировать original. Original source/locks/configs не менялись; собственные разрешённые writes — новые FORMAT PREP evidence/scripts, этот append и checkbox QG-FORMAT.2.

Repair budget исчерпан: **2/2**, оба только собственные helpers, не продуктовый код: (1) `git init --template=` не создаёт info directory — initial setup exit 1, добавлен mkdir внутри owned `.git`, resume → 0; (2) finalizer сначала сравнил root untracked status без учёта собственных новых reports — exit 1 до writes, comparison сужен до nested status + root tracked/index, finalization → 0. Дополнительных installs/repairs/расследований не требуется и в этом unit не выполняется.

[Generated ledger](<format-prep-env-generated.json>): **215150** generated files/links, неожиданных путей **0**. Прежний allowlist сохранён; dependency symlinks разрешаются только внутри owned isolation/pinned interpreter tree. Ни один tracked/generated diff не скрыт reset/clean/новым baseline commit после installs. Helper implementations: [provisioning](<format-prep-env.py>), [verification](<format-prep-env-verify.py>), [finalization](<format-prep-env-finalize.py>); replay initialization/install не нужен.

### Точный handoff для новой сессии QG-FORMAT-RUN

[RUN launcher](<format-prep-env-run.sh>) создаёт `env -i`, задаёт все pinned PATH/HOME/XDG/cache/browser/Python paths; original environment не наследуется. `UV_FROZEN=true`, `UV_NO_SYNC=true`, `UV_PYTHON_DOWNLOADS=never`, npm offline и no-yes, service-specific `UV_PROJECT_ENVIRONMENT` явно unset. Host tools: uv `0.13.5`, node `24.22.1`, npm `11.19.1`, make `4.4.1`; Python backend `3.13.5`, peers `3.14.6`. Полный env — [final evidence](<format-prep-env-final.json>).

Свежий пустой TMPDIR — sibling exported repo: `/srv/eqSiteCMS/.qa/qg-format-document-yandex-services-baseline-v1/tmp-format-run`; install TMPDIR отдельный, не использовать его для standalone tests. Никаких root-команд в этой сессии. После Router handoff следующая свежая сессия RUN вызывает последовательно:

```sh
sh /srv/eqSiteCMS/docs/reports/document-yandex-services-baseline/format-prep-env-run.sh make format
sh /srv/eqSiteCMS/docs/reports/document-yandex-services-baseline/format-prep-env-run.sh make lint
sh /srv/eqSiteCMS/docs/reports/document-yandex-services-baseline/format-prep-env-run.sh make test
```

Launcher меняет cwd только на owned repo. RUN обязан отдельно сохранить root+nested status/index/tracked diffs и generated ledger до/между/после каждой команды, stdout/stderr/exits; safe nonzero не отменяет остальные команды. Не повторять exports/provisioning, не переносить formatter diff в original. Никаких source/lock/config/spec fixes, runtime/Docker/sync/archive/release. Отмечен только QG-FORMAT.2; .3–.7/.V остаются открыты. Остаток текущего PREP-ENV: **нет**; далее только назначенный Router отдельный RUN.

## QG-FORMAT-RUN — завершён с blockers; далее QG-SYNTH

**Терминальный результат lane: BLOCKED, не PASS и не общий APPROVED.** Шесть действий RUN выполнены, QG-FORMAT.3/.4/.5/.6/.7/.V отмечены по факту, общий прогресс **24/40**. Отметки означают выполнение проверки, а не её успешность. Product/source remediation и environment repair в RUN не выполнялись; PREP budget остаётся 2/2.

### Provenance и actual root-команды

[Preflight](<format-run-ready.json>) подтвердил hashes всех переданных PREP artifacts, frozen manifest, launcher, прежних разрешённых writes и готовность восьми installs. HEAD/index mapping — прежние девять baselines из таблицы выше. До root-команд все approved snapshot bytes и dependency inputs неизменны, tracked/index diff пуст. TMPDIR пуст и находится вне exported repo, но внутри ancestor original monorepo. Использован **тот же готовый launcher без edits/overrides**: env -i, pinned PATH, owned HOME/XDG/caches/TMP, UV_PROJECT_ENVIRONMENT отсутствует, UV_NO_SYNC=true, frozen/no-download и npm offline/no-yes сохранены. uv/node/make версии и executable hashes подтверждены. npm executable сохранён, но **npm --version через launcher вернул 1**: userconfig/globalconfig одновременно /dev/null. Поэтому PREP ready не означает фактическую готовность npm в RUN; failure evidence сохранён, обход не применялся.

Все команды реально вызваны последовательно из [owned root](<../../../.qa/qg-format-document-yandex-services-baseline-v1/repo/>), без -k/альтернативного Makefile и без сервиса-заменителя:

| Команда через launcher | Exit | Время процесса | Фактический результат / receipts |
|---|---:|---:|---|
| `make format` | **2** | 0.195 s | backend ruff check/format → 0, 306 unchanged; frontend npx → 1. [Receipt](<format-run-format-receipt.json>), [stdout](<format-run-format.stdout>), [stderr](<format-run-format.stderr>) |
| `make lint` | **2** | 20.027 s | backend mypy/ruff/format-check/flake8 → 0, mypy 306 files; frontend npm run lint → 1. [Receipt](<format-run-lint-receipt.json>), [stdout](<format-run-lint.stdout>), [stderr](<format-run-lint.stderr>) |
| `make test` | **2** | 9.522 s | backend pytest: **1481 passed, 2 failed, 5 skipped**, 6.65 s pytest. [Receipt](<format-run-test-receipt.json>), [stdout](<format-run-test.stdout>), [stderr](<format-run-test.stderr>) |

Root fail-fast сохранён: format/lint не дошли до notification/email/VK/SEO/Yandex/adapter; frontend typecheck после npm lint не достигнут. Test остановился на backend, frontend и шесть остальных сервисов **NOT RUN**. Это не утверждение проверки всех восьми сервисов. Безопасные nonzero не отменили оставшиеся root-команды.

### Root + восемь nested: полный Git/generated accounting

Полные отдельные status/raw tracked/index/patch/staged-patch/index-manifest logs для **каждого из девяти** репозиториев сохранены в четырёх checkpoints: [before](<format-run-before.json>), [after-format](<format-run-after-format.json>), [after-lint](<format-run-after-lint.json>), [after-test](<format-run-after-test.json>). Каждый checkpoint ссылается на полные logs и generated ledger. Во всех фазах tracked/staged patches пусты, HEAD и logical index manifests совпадают с PREP; approved source/18 overlay files, locks/configs неизменны. Root clean не скрывает nested: все восемь проверены независимо. Никаких formatter source changes и source findings нет; это **не** отменяет failures команд.

| Фаза | Generated files/links в repo | Новые к предыдущей фазе | Неожиданные / внешние symlinks |
|---|---:|---:|---:|
| PREP final | 215150 | — | 0 / 0 |
| RUN before | 215151 | 1 | 0 / 0 |
| После format | 215167 | 16 | 0 / 0 |
| После lint | 218425 | 3258 | 0 / 0 |
| После test | 219902 | 1477 | 0 / 0 |

Один новый pre-RUN путь — обычный allowlisted backend venv bytecode, не source: import cache _distutils_hack. Приращения root-команд — allowlisted service-local caches/bytecode; удалений и изменений ранее учтённых metadata records между RUN checkpoints нет. Прежний accepted cache NOTE не превращён в новый blocker. [Итоговый accounting](<format-run-accounting.json>) содержит path-level generated deltas, финальный owned TMP inventory, original metadata comparison и проверки append-only/ровно шести checkbox. Generated files не переносились в original и не выдавались за source autofix. Sealed archives/manifest проверялись до/после, никаких новых baselines/reset/cleanup.

Original source/Make/locks/deps/.git не изменялись агентом: разрешённые writes — только новые FORMAT-RUN evidence, этот append и шесть checkbox. Original проверен ограниченно: HEAD/status/raw tracked/staged/index metadata и 18 approved hashes; исходный unrelated overlay не прочитан/не форматировался/не включался. **Original VK physical index preservation остаётся not-established, причина unknown**: финальная сверка RUN также обнаружила byte-hash drift этого index относительно RUN-before, при неизменных HEAD/status/raw tracked/staged. Для остальных восьми index byte hashes в RUN совпали. Logical staged/HEAD evidence сохранён; original Git write-команды не выполнялись, история не исследовалась. Это не глобальная гарантия побайтовой сохранности unrelated original caches/files.

### Реестр blockers и bounded follow-up

Полный [реестр findings](<format-run-findings.json>):

1. **FORMAT-RUN-INFRA-01 — environment owner / Quality Gate.** npm/npx прекращают resolving config: `double-loading config "/dev/null" as "global", previously loaded as "user"`. Непосредственно блокирует frontend format/lint, root exits 2. Router: отдельный bounded FORMAT-ENV-FIX-NPM только для owned launcher/config paths; без dependencies/source/lock updates. Verification: npm probe через launcher → 0, затем новая root FORMAT group с полным accounting. В этом RUN ничего не ремонтировалось.
2. **FORMAT-RUN-TEST-02 — Backend test owner + согласование среды с Quality Gate.** [Первый failure](<format-run-test.stdout#L118-L131>): standalone checkout discovery ожидал None, получил ancestor /srv/eqSiteCMS. [Второй failure](<format-run-test.stdout#L132-L164>) — то же в standalone/nested root discovery. Это baseline test/path-sensitivity finding, **не доказанная product regression и не документационный дефект**. Router: отдельный bounded BE-VERIFY-DISCOVERY ровно по двум node IDs из реестра; выбрать обоснованную owned вне-monorepo TMP среду либо отдельно утверждаемый test fix. После targeted verification требуется отдельный повтор root checks; не расширять approved documentation baseline кодом.

**DOC-FORMAT: BLOCKED.** Условия PASS не выполнены: exits **2/2/2**, часть агрегации не достигнута, blockers открыты, хотя source integrity и Git/generated accounting сохранены. Не выводить live auth, GoLive/production readiness, PostgreSQL/NATS/provider HTTP или сервисные runtime scenarios из backend unit pytest; они остаются NOT RUN в этом lane.

**Handoff:** QG-FORMAT-RUN → Router → отдельный **QG-SYNTH**, включая отрицательный результат. [Машинный handoff](<format-run-handoff.json>) содержит exact receipts/accounting/IDs и ownership follow-up. Остаток внутри RUN: нет; blockers передаются владельцам новыми units, не чинятся здесь. SYNTH/другие lanes/sync/archive/task-finalize/commits/releases не запускались.
