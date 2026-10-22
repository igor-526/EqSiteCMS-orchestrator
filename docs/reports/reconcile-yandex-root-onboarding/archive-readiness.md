# ROOT-ARCH-EVIDENCE-1 — готовность к синхронизации и архивированию

**Результат: BLOCKED — sync/archive сейчас недопустимы.**

Это terminal metadata/evidence-availability review для Router, не QG-SYNTH и не общий вердикт APPROVED/REWORK. Пользователь разрешил архивирование as-is, но обязательные gates этим не отменены. Проверка закончена без runtime/source fixes, Make, установки зависимостей, sync, archive, commit или изменения истории/checkbox.

## Snapshot и границы

- Корень, подтверждённый `pwd`: `/srv/eqSiteCMS`.
- Текущий HEAD: `457be4391fa800214ce6939030d3e125962b89be`; исходный worktree dirty. Change находится в untracked-каталоге, main process spec изменена относительно HEAD.
- Проверены только metadata старого root-onboarding change, объявленные report paths и ограниченный срез main process spec. Новый service-backfill change и его delta не читались.
- Единственная запись этого unit — настоящий файл. Старые tasks/design/specs, root docs, source и чужие изменения не менялись.

## Текущие проверки

Использован explicit pinned CLI `/srv/eqSiteCMS/.cache/openspec-tool/1.14.3/openspec-local` (его wrapper очищает inherited env, задаёт explicit PATH/HOME и отключает telemetry).

| Проверка | Фактический результат |
|---|---|
| `openspec-local status --change reconcile-yandex-root-onboarding --json` | exit 0; nearest root `/srv/eqSiteCMS`; planning artifacts done, `isPlanningComplete=true`, `isComplete=true` — это не implementation/gate approval |
| Подсчёт checkbox старых tasks | 77 completed / 78 total; единственный open — FORMAT.5 |
| `openspec-local validate reconcile-yandex-root-onboarding --type change --strict` | exit 1 |
| Та же strict validation с `--json` | exit 1; `valid=false`, 4 WARNING, 0 passed / 1 failed item |

Причина текущего strict failure подтверждена JSON: requirement text >500 characters у всех четырёх ADDED requirements [delta spec](<../../../openspec/changes/reconcile-yandex-root-onboarding/specs/repository-process-tooling/spec.md#L3-L36>): «Проверяемый корневой onboarding сервисов Яндекса», «Разделение документируемых команд и гарантий поддержки», «Безопасный инвентарь root env и ресурсов Яндекса», «Документированные пределы registry и безопасная операционная граница». Других issues этот запуск не сообщил. Warning при strict не является PASS; текст не исправлялся.

## Доступность gate evidence

Объявленные пути взяты из [tasks: summary](<../../../openspec/changes/reconcile-yandex-root-onboarding/tasks.md#L3-L5>), [final SYNTH tasks](<../../../openspec/changes/reconcile-yandex-root-onboarding/tasks.md#L192-L198>) и [design: gates](<../../../openspec/changes/reconcile-yandex-root-onboarding/design.md#L242-L261>).

На момент проверки, **до создания настоящего отчёта**, каталог `docs/reports/reconcile-yandex-root-onboarding/` отсутствовал. В нём отсутствовали объявленные `synthesis.md`, `format.md`, `contracts.md` и `format-run-retry-1-handoff.md`; следовательно, не были доступны и receipts, объявленные рядом с ними. Сам факт отсутствия проверен path metadata. Ошибка glob `No such file or directory` подтверждена отдельной проверкой существования, а не принята за доказательство содержимого отчётов.

Ограниченный поиск имён файлов под `docs/reports` (`**/*reconcile*yandex*` и `**/{*reconcile*,format*,synthesis*,contracts*}`) не дал результатов. Прямо объявленный исторический isolation path `/srv/eqSiteCMS-qg-format-cxkmcu2n` также отсутствует. Дальнейший обход host, восстановление checkout, зависимостей или всех логов не выполнялись.

**QG-SYNTH APPROVED для точного текущего snapshot не найден и не подтверждён.** Completed SYNTH checkbox не доказывает APPROVED: [tasks](<../../../openspec/changes/reconcile-yandex-root-onboarding/tasks.md#L194-L198>) явно допускают завершённый отрицательный synthesis. [FORMAT.5](<../../../openspec/changes/reconcile-yandex-root-onboarding/tasks.md#L79>) остаётся открытой. Отсутствие receipts не доказывает, что исторические проверки никогда не выполнялись; оно не позволяет их переиспользовать здесь.

### Покрытие обязательных FORMAT receipts

| Необходимое свидетельство | Доступность / вывод |
|---|---|
| Три actual `make format` / `make lint` / `make test` exits 0, exact cwd/argv/env и полные логи | Нет доступных receipts; PASS не подтверждён |
| Clean immutable root + 8 nested revisions, соответствие approved docs patch | Нет доступных isolation/revision/patch receipts |
| Полный межкомандный root/nested tracked/index/untracked/ignored diff, новые файлы | Нет доступных receipts |
| uv provenance, clean PATH, cache/no-install safety, own-write boundary | Нет доступных receipts |
| Contracts PASS/C-01 closed, привязанный к exact docs patch | В summary заявлен completed recheck; самого подтверждающего report/patch нет |
| Latest FORMAT PASS и SYNTH APPROVED для проверяемого snapshot | Не подтверждены; FORMAT.5 open |

[Planning metadata](<../../../openspec/changes/reconcile-yandex-root-onboarding/tasks.md#L88>) указывает исторический root `4be101744e20299690773060a84c362184a2d5cc` и docs patch SHA-256 `9a306fe1afd588a68f8de7a58ffbef7726facb022fde1dde587f80c20934ddb6`. Текущий HEAD другой. Само различие HEAD не доказывает регрессию, но без receipts, nested revisions и доказанной эквивалентности scoped patch переиспользование gate невозможно.

Переданное из PUB-PLAN-0 историческое pre-migration сообщение «SYNTH BLOCKED, три baseline backend tests» не проверено по текущему receipt. **Этот unit не утверждает, что эти тесты всё ещё падают.** Тесты здесь не запускались; открытие новой runtime/code remediation цепочки не разрешено. Historical cache NOTE/false/unknown не переобъявлялись PASS или preservation=true.

## Main/delta overlap — без merge

- В [delta](<../../../openspec/changes/reconcile-yandex-root-onboarding/specs/repository-process-tooling/spec.md>) один заголовок `ADDED Requirements`, четыре requirement headers; точных одноимённых requirements среди проверенных main headers нет. MODIFIED/REMOVED/RENAMED sections в delta не обнаружены.
- Пересекается одна capability `repository-process-tooling`. [Main: архитектурная документация](<../../../openspec/specs/repository-process-tooling/spec.md#L111-L116>) семантически пересекается с добавляемыми требованиями root onboarding.
- [Main: ограниченная поддержка peers/БД](<../../../openspec/specs/repository-process-tooling/spec.md#L159-L179>) уже требует registry aliases и bounded readiness для metrica/БД, тогда как [старый delta](<../../../openspec/changes/reconcile-yandex-root-onboarding/specs/repository-process-tooling/spec.md#L32-L41>) требует документировать их отсутствие как deferred. Это потенциальное содержательное противоречие/устаревание формулировок при будущем sync; runtime факты здесь не перепроверялись.
- [Main core gate](<../../../openspec/specs/repository-process-tooling/spec.md#L81-L98>) и [delta о наблюдаемых расширенных recipes](<../../../openspec/changes/reconcile-yandex-root-onboarding/specs/repository-process-tooling/spec.md#L12-L19>) требуют сохранить различие нормы и наблюдения, а не менять core gate автоматически.

**Actual sync/merge не выполнялся; наличие реального merge conflict не установлено.** Main dirty сама по себе не является доказательством конфликта. Delta не изменялась для разрешения overlap. Архивный `normalize-yandex-client-failures` исключён из этого review; его статус не перенесён на root onboarding.

## Metadata fingerprints

SHA-256 до публикации:

| Артефакт | SHA-256 |
|---|---|
| [tasks](<../../../openspec/changes/reconcile-yandex-root-onboarding/tasks.md>) | `3c234cbea9a7c63ca3b6f934825966356031381544eb397f4580d2ed55bd5659` |
| [design](<../../../openspec/changes/reconcile-yandex-root-onboarding/design.md>) | `8ade5020bc00f16fae6aa82c540b499cb2164f940a08aed630a693a287d4a985` |
| [delta spec](<../../../openspec/changes/reconcile-yandex-root-onboarding/specs/repository-process-tooling/spec.md>) | `fef27055e48154d9e323b043858ea156d873f4d7ad24a4e1a7497ed8189d03f8` |
| [main spec](<../../../openspec/specs/repository-process-tooling/spec.md>) | `8ea48eb27d02f96a3bda6ae767f27a6765f854704ea068b2cf0a16b5a75a12ee` |

## Terminal handoff Router

1. **AR-B01:** отсутствует доступное подтверждение QG-SYNTH APPROVED и обязательных FORMAT receipts для exact snapshot; FORMAT.5 open. Сейчас sync/archive пропустить.
2. **AR-B02:** актуальная strict validation неуспешна (exit 1, четыре oversized-requirement warnings). Status/planning completeness этот блокер не снимает.
3. **AR-N01:** перед будущим sync нужен отдельный bounded contracts decision по main/delta overlap; это не установленный merge conflict и не разрешение редактировать delta.

Возможный следующий bounded lane при наличии конкретно предоставленного местоположения старых receipts — metadata-only provenance review exact snapshot/patch и latest verdict, без восстановления зависимостей или запуска tests. Без нового доступного evidence не повторять поиск бесконечно: оставить change активным, BLOCKED. Любое устранение strict findings или согласование устаревшей нормы требует отдельного ownership/unit; текущая as-is граница не разрешает эти правки. Новых checkbox не отмечено.
