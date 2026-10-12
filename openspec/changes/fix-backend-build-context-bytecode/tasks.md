# Tasks — fix-backend-build-context-bytecode

Backend владеет двумя implementation-файлами (deliverable A); Quality Gate проверяет результат и готовит согласованное окружение (deliverable B), не меняя implementation. DAG и матрица T-01..T-04 находятся в [design](<design.md#execution-units>). Все дальнейшие tasks закрыты пользовательским approval gate; PLAN-1/PLAN-2 не выполняют apply и не отмечают implementation/QG tasks.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|---|
| BE-1 | Backend | A | `services/backend/.dockerignore`, `services/backend/Dockerfile` | PLAN-2 + approval | Статика, `git diff --check` | [design](<design.md>), [delta spec](<specs/backend-build-context-hygiene/spec.md>), [`.dockerignore`](<../../../services/backend/.dockerignore>), [Dockerfile](<../../../services/backend/Dockerfile>), [SERVICES](<../../../SERVICES.md#L22-L32>) |
| QG-ENV | Quality Gate | B | —, проверочное окружение | BE-1 | doctor/status, rebuild T-02, health/ready | [design](<design.md#граница-доступа-и-окружение-qg>), [Makefile:106–112](<../../../Makefile#L106-L112>), [compose](<../../../.docker-compose/docker-compose.be.yml>), handoff BE-1; skill `stack-control` |
| QG-BE | Quality Gate | B | —, verification only | QG-ENV PASS | T-01/T-03/T-04, evidence T-02 | [design](<design.md#test-matrix>), [delta spec](<specs/backend-build-context-hygiene/spec.md>), [`.dockerignore`](<../../../services/backend/.dockerignore>), [Dockerfile](<../../../services/backend/Dockerfile>), handoff BE-1/QG-ENV |
| QG-CONTRACTS | Quality Gate | B | —, verification only | QG-ENV PASS | Spec/tasks/ownership, access N/A | [design](<design.md>), [delta spec](<specs/backend-build-context-hygiene/spec.md>), [tasks](<tasks.md>), handoff BE-1/QG-ENV |
| QG-FORMAT | Quality Gate | B | —, проверка чистого дерева | QG-BE PASS + QG-CONTRACTS PASS | `make format`, `make lint`, `make test` | [design](<design.md#граница-доступа-и-окружение-qg>), [Makefile](<../../../Makefile>), handoff QG-BE/QG-CONTRACTS и описание изолированного дерева Router |
| QG-SYNTH | Quality Gate | B | —, итог | QG-FORMAT PASS | Все evidence, общий APPROVED/REWORK | [design](<design.md>), [delta spec](<specs/backend-build-context-hygiene/spec.md>), [tasks](<tasks.md>), handoff всех QG lanes |

Профильные инструкции и [AGENTS](<../../../AGENTS.md>) загружаются согласно роли. QG-CONTRACTS и QG-FORMAT обязательны даже без API diff; QG-ENV применим к Docker/runtime diff. FE lanes N/A без UI; LIVE N/A без API diff (health в ENV). Перед QG Router уведомляет о Full Access и согласованном проверочном окружении; без доступа — конкретный blocker, без обхода sandbox/sudo. Workspace caches fallback и защита чужого diff при обязательном FORMAT описаны в [design](<design.md#граница-доступа-и-окружение-qg>). До approval не запускать никаких QG-проверок.

При rework implementation возвращается владельцу BE-1 последовательно, затронутые lanes повторяются. Выполненные checkbox отмечает только исполнитель своего unit; общий APPROVED выдаёт исключительно QG-SYNTH. Запрещены chmod/chown, cleanup исходного cache и production restart.

## 1. BE-1 — исключение caches и профилактика bytecode (профиль: Backend)

**Specs:** `backend-build-context-hygiene` · **Пути:** [`.dockerignore`](<../../../services/backend/.dockerignore>), [Dockerfile](<../../../services/backend/Dockerfile>) · **Зависит от:** PLAN-2 и явный approval.

- [x] BE-1.1 Проверить approval, границы двух файлов и отсутствие конфликтов с чужими изменениями; подготовить feature-ветку по сервисному git-workflow без reset/stash чужой работы.
- [x] BE-1.2 Дополнить `.dockerignore` правилами `**/__pycache__/`, `*.py[co]`, `**/*.py[co]`, сохранив остальные строки и доступность исходников; не исключать `.pyd`.
- [x] BE-1.3 Добавить `ENV PYTHONDONTWRITEBYTECODE=1` сразу после `FROM` в Dockerfile, не меняя команды, пользователя и зависимости.
- [x] BE-1.V Проверить T-01 и `git diff --check -- .dockerignore Dockerfile` в backend; отметить выполненные tasks и вернуть Router handoff с diff только назначенных файлов. Сборку и runtime не запускать в этом unit.

## 2. QG-ENV — подготовка проверочного Docker окружения (профиль: Quality Gate)

**Specs:** `backend-build-context-hygiene` · **Пути:** — · **Зависит от:** BE-1 и уведомление Router о Full Access.

- [x] QG-ENV.1 Загрузить `stack-control`, сверить handoff BE-1 и согласованное Router окружение; проверить doctor/status, Docker доступ и возможность проверки без затрагивания production/unrelated сервисов. При необходимости настроить инструментальные workspace caches по design, не обходя sandbox denial.
- [ ] QG-ENV.2 Подготовить проверочный стек, выполнить backend rebuild и T-02 `make be-build-nc` без cleanup существующего недоступного pyc; проверить health/ready нового образа. Если stackctl rebuild не даёт no-cache, T-02 выполнить отдельно. Не считать успешный context этап успехом всей сборки.
- [x] QG-ENV.V Зафиксировать stdout/exit codes, image/health evidence и PASS/FAIL/BLOCKED окружения, отметить фактически выполненные tasks и вернуть Router handoff. BE/CONTRACTS разрешаются только после ENV PASS; общего APPROVED не выдавать.

## 3. QG-BE — проверка состава образа и bytecode (профиль: Quality Gate)

**Specs:** `backend-build-context-hygiene` · **Пути:** — · **Зависит от:** QG-ENV PASS.

- [ ] QG-BE.1 Сверить diff и evidence T-02 из ENV; выполнить T-01/T-03/T-04 одной группой проверок: inspect нового образа и Python import временного модуля в изолированном контейнере без сети/host mounts, без чтения API кода.
- [ ] QG-BE.V Зафиксировать результаты ID и stdout/exit codes, отметить выполненные tasks и вернуть Router lane PASS/FAIL/BLOCKED. Не выдавать общий APPROVED и не менять runtime/исходники.

## 4. QG-CONTRACTS — соответствие spec/tasks/ownership (профиль: Quality Gate)

**Specs:** `backend-build-context-hygiene` · **Пути:** — · **Зависит от:** QG-ENV PASS.

- [ ] QG-CONTRACTS.1 Проверить трассировку требований/scenarios на T-01..T-04, scope двух файлов, отсутствие ownership overlap, соответствие tasks/DAG и access N/A; отсутствие API diff не отменяет эту lane.
- [ ] QG-CONTRACTS.V Зафиксировать findings и lane PASS/FAIL/BLOCKED, отметить выполненные tasks и вернуть Router handoff без общего APPROVED.

## 5. QG-FORMAT — обязательный format/lint/test gate (профиль: Quality Gate)

**Specs:** `backend-build-context-hygiene` · **Пути:** —, чистое проверочное дерево · **Зависит от:** QG-BE PASS и QG-CONTRACTS PASS.

- [ ] QG-FORMAT.1 Проверить подготовленное Router изолированное дерево с только назначенным diff и инструментальными workspace caches fallback. Выполнить обязательные `make format`, `make lint`, `make test` по правилам проекта; чужое рабочее дерево не форматировать и не сбрасывать. При невозможности изоляции вернуть blocker, не пропускать gate.
- [ ] QG-FORMAT.V Сохранить stdout/exit codes и formatting diff; findings вернуть владельцу Backend, отделить baseline от change errors без скрытого PASS. Отметить выполненные tasks и вернуть lane PASS/FAIL/BLOCKED, без общего APPROVED; после rework перепроверить затронутые lanes.

## 6. QG-SYNTH — единственный общий итог Quality Gate (профиль: Quality Gate)

**Specs:** `backend-build-context-hygiene` · **Пути:** — · **Зависит от:** QG-FORMAT PASS.

- [ ] QG-SYNTH.1 Сверить evidence ENV/BE/CONTRACTS/FORMAT и T-01..T-04, проверить scope и отсутствие запрещённых действий, отсутствие незакрытых findings/blockers; только здесь выдать общий APPROVED либо REWORK/BLOCKED.
- [ ] QG-SYNTH.V Проверить `openspec validate fix-backend-build-context-bytecode --type change --strict`, отметить выполненные tasks и вернуть Router итоговый handoff. После APPROVED передать Router/оператору обязательную финализацию: sync delta spec, повторную validation и archive по отдельному разрешению; не выполнять финализацию из этого unit.
