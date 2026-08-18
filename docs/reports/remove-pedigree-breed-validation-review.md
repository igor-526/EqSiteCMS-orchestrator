# Review: remove-pedigree-breed-validation

**Статус: ✅ APPROVED**  
**Дата:** 2026-08-18  
**Approval:** пользователь подтвердил `Apply` после просмотра apply-ready proposal.

## Контекст

- OpenSpec change: `openspec/changes/remove-pedigree-breed-validation/`
- Proposal: `proposal.md`; design: `design.md`; delta spec: `specs/backend-domain-capabilities/spec.md`; checklist: `tasks.md`.
- Исходный контекст: `docs/tasks/011_horse_pedigree_management.md`.
- Scope: удалить проверку/фильтрацию породы и `breed.kind` только из pedigree GET/POST, сохранив остальные инварианты и access contract.
- Рекомендуемая ветка: `change/remove-pedigree-breed-validation`.

## Итог review

Блокирующих findings нет. Production diff ограничен `services/backend`:

- `src/repositories/horse_repository.py`: pedigree candidate queries больше не выполняют breed-kind lookup и не передают `kind`/`breed_id_is_null`.
- `src/core/services/horse.py`: pedigree POST больше не загружает и не сравнивает breed kinds.
- `tests/unit/repositories/test_horse_repository.py`, `tests/unit/core/services/test_horse_service.py`, `tests/unit/api/test_horse_pedigree_access.py`: regression/access coverage.

Schema, migrations, DTO, frontend, site consumers и NATS не менялись. Глобальные horse list filters/sort по `breed_ids`, `breed_id_is_null`, `kind`, `breed_name` сохранены. Self-link, immediate-relation conflict, sex, birth/death chronology, occupied parent slot, tenant isolation, search/sort/pagination и partial clear semantics сохранены.

Clean Architecture соблюдена: SQL остаётся в repository, бизнес-валидация — в service, API только связывает dependencies. Сервис продолжает зависеть от Protocol-контрактов.

## Unit и статические проверки

- Targeted: `uv run pytest tests/unit/repositories/test_horse_repository.py tests/unit/core/services/test_horse_service.py tests/unit/api/test_horse_pedigree_access.py -q` → **109 passed**.
- Backend full: `make -C services/backend test` → **1022 passed, 5 skipped, 0 failed**.
- Backend lint: mypy success (242 files), ruff check passed, ruff format check (242 formatted), flake8 passed.
- Root `make test` → backend 1022 passed/5 skipped; notification 23 passed/2 deselected; email 39 passed/4 deselected; frontend 432 passed.
- Root `make lint` → все сервисные targets завершились с exit 0; frontend имеет 410 существующих warnings, 0 errors.
- `git -C services/backend diff --check` → clean.
- `openspec validate remove-pedigree-breed-validation --strict` → valid.
- Мутирующий root `make format` не запускался из-за общего dirty/path-unaccounted worktree; эквивалентная применимая non-mutating проверка `ruff format --check` прошла. Root Makefile contract содержит четыре явных вызова backend → notification-service → email-service → frontend для `test`, `lint`, `format`.

Набор покрывает U-01..U-30: отсутствие pedigree breed lookup/filter/validation; cross-kind и nullable breed; сохранность sex/date/death/self/immediate/duplicate/partial-clear правил; Public Read/Protected Write access.

## Runtime discovery

Повторный поиск выполнен по Docker labels с fallback по compose service/name:

- фактический project label: `eqsitecms-core`, service: `db`, container: `eqsitecms-db`, image: `postgres:16`;
- `docker inspect`: DB `eqsitecms`, user `eqsitecms`, container port `5432`, обнаруженный host port `5433`;
- live backend: `eqsitecms-app`, bind mount `services/backend/src -> /eqsitecms/src`, host port `8001`, health `healthy`;
- API base/auth взяты из `.claude/skills/api-smoke-test/credentials.json`; cookie login `su` и `um` вернул 200.

Контейнер backend был перезапущен перед smoke, чтобы процесс гарантированно загрузил проверяемый mounted source.

## SMOKE-тесты

Реальные HTTP-вызовы выполнены через `curl` к `http://localhost:8001`, данные — в живой PostgreSQL. Public selector: `X-Equestrian-Service-Key: aleksandrova-dacha`; write auth: cookie `su`; no-scope: cookie `um` (`USER_MANAGER`).

| ID | Проверка | HTTP | Время, с | Evidence |
|---|---|---:|---:|---|
| SM-01 | anonymous GET sire + selector | 200 | 0.035950 | список получен |
| SM-02 | anonymous GET dam + selector | 200 | 0.038513 | список получен |
| SM-03 | anonymous GET children + selector | 200 | 0.058825 | список получен |
| SM-04 | GET без selector | 401 | 0.006182 | отклонён |
| SM-05 | GET invalid selector | 401 | 0.020982 | отклонён |
| SM-06 | authenticated GET | 200 | 0.036311 | список получен |
| SM-07 | cross-kind sire | 200 | 0.032889 | ID `...0102`, pony для horse target |
| SM-08 | другая конкретная порода того же kind | 200 | 0.036985 | ID `...0103`, отдельный breed |
| SM-09 | sire без breed | 200 | 0.066127 | ID `...0104` |
| SM-10 | cross-kind dam | 200 | 0.054869 | ID `...0105` |
| SM-11 | dam без breed | 200 | 0.038578 | ID `...0106` |
| SM-12 | cross-kind child | 200 | 0.053378 | ID `...0107` |
| SM-13 | child без breed | 200 | 0.046291 | ID `...0108` |
| SM-14 | self исключён | 200 | 0.048681 | `total=0` по exact search |
| SM-15 | current immediate relation исключена | 200 | 0.030899 | после persisted sire exact search: `total=0` |
| SM-16 | sex/date/death restrictions | 200 | 0.034106 | wrong-sex, young sire и dead-before-birth dam отсутствуют |
| SM-17 | search находит cross-breed | 200 | 0.033200 | exact candidate `...0102` |
| SM-18 | limit/offset/total | 200/200 | 0.038004/0.043867 | разные страницы, одинаковый `total=4` |
| SM-19 | anonymous POST | 401 | 0.002431 | DB relation rows для target: 0 |
| SM-20 | no-scope POST | 403 | 0.041458 | DB relation rows для target: 0 |
| SM-21 | POST cross-kind sire | 204 | 0.045974 | DB `...0102 -> ...0101` |
| SM-22 | POST cross-kind dam | 204 | 0.039690 | DB `...0105 -> ...0101` |
| SM-23 | POST cross-kind child | 204 | 0.036707 | DB `...0101 -> ...0107` |
| SM-24 | bred parent для unbred target | 204 | 0.059404 | DB `...0103 -> ...0201` |
| SM-25 | unbred child для bred target | 204 | 0.039275 | DB `...0101 -> ...0108` |
| SM-26 | wrong-sex parent | 400 | 0.046032 | `Отец должен быть мужского пола`; DB snapshot unchanged |
| SM-27 | invalid parent date | 400 | 0.071741 | chronology error; DB snapshot unchanged |
| SM-28 | self/immediate conflict | 400 | 0.039353 | self-link error; DB snapshot unchanged |
| SM-29 | null/empty clear | 204 | 0.043311 | DB relations для target: 0 |
| SM-30 | foreign tenant | 400/200 | 0.030993/0.038338 | POST `Некоторые лошади не найдены`; GET `items=[]`; no mutation |

Итог: **30/30 smoke scenarios passed**. Для успешных writes связь подтверждена SQL-запросом непосредственно в PostgreSQL; before/after failed-write snapshots совпали.

## Access verification results

- Public Read GET: anonymous + valid selector → 200; missing/invalid selector → 401; authenticated → 200.
- Protected Write POST: anonymous → 401; `USER_MANAGER` без pedigree scope → 403; `SUPERUSER` → 204.
- Unit API coverage дополнительно подтверждает `SUPERUSER`, `ADMIN`, `DEVELOPER` → 204.
- Foreign tenant ID не раскрывается в GET и не связывается POST.
- Исключений из default access policy нет.

## Cleanup

Smoke использовал отдельный UUID prefix `90000000-...`. Cleanup удалил только эти test relations/horses/breeds. Финальная DB-проверка: `horse_rows=0`, `breed_rows=0`, `relation_rows=0`.

## Findings и готовность

Blocking/high/medium/low findings: **нет**. Итерация rework не потребовалась. Change готов к Router workflow: sync delta spec → strict validation → archive. Task 3.12 Quality Gate не выполнял.
