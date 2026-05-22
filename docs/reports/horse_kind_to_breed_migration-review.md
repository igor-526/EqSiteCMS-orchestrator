# Quality Gate: horse_kind_to_breed_migration

**Дата:** 2026-05-18  
**План:** `docs/plans/feature/horse_kind_to_breed_migration.md`  
**ТЗ:** `docs/tasks/horse_kind_to_breed_migration.md`

## Итог

| Этап | Статус |
|------|--------|
| Backend (миграция, API, unit) | ✅ Готово |
| Frontend (CMS UI, types, tests) | ✅ Готово |
| Миграция БД (локально) | ✅ Применена (`7a9d3e2f1c4b`) |
| Backend unit tests | ✅ 614 passed, 5 skipped |
| Frontend tests / lint / tsc / build | ✅ 181 passed; lint warnings только вне horses |
| API smoke (живой backend) | ✅ 35/35 (SM-14 — flaky duplicate slug при повторном прогоне; с уникальным slug — 200) |
| Manual QA (CMS UI) | ⏳ Не выполнялся в этой сессии |
| Коммиты в submodule | ⏳ Изменения не закоммичены |

## Что сделано

### Backend (`services/backend`, uncommitted)

- Alembic `7a9d3e2f1c4b_horse_kind_to_breed.py`: `breeds.kind NOT NULL`, ~50% пород → `pony`, удалён `horse.kind`.
- Модели, entities, schemas, repositories, services, API — по плану.
- Unit-тесты в `tests/unit/repositories/`, обновлены service/api tests.
- `HorseCreateInDto` / `HorseUpdateInDto`: `extra="forbid"`, поле `kind` отсутствует → `422` на extra `kind`.

### Frontend (`services/frontend`, uncommitted)

- Убран horse-level `kind` из типов, validators, таблицы лошадей, create/update modal.
- Вкладка «Породы»: колонка «Тип», inline filter, sort `kind/-kind`, selector в modal (default `horse`).
- `useHorses`: фильтр типа по умолчанию пустой; при active `breed_ids` — type filter disabled/cleared, `kind` не уходит в query; перезапрос breed options по `kind`.
- Тесты: hooks, components, API-boundary — 181 passed.

### БД после миграции

- `breeds.kind`: NOT NULL, значения `horse` / `pony` (37 пород, 18 pony).
- `horse.kind`: колонка отсутствует.

## Smoke (2026-05-18)

- Backend: `http://localhost:8001`, header `X-Equestrian-Service-Key: default-equestrian`.
- Auth: `su/string` (admin), `smoke_noscope_news/string` (no scope).
- Прогон: **только через `.claude/skills/api-smoke-test`** (`curl` на живом API + SQL в PostgreSQL), без pytest-файлов и без отдельных smoke-скриптов в репозитории. SM-01..SM-37 пройдены; SM-32/33 выполнены отдельным прогоном по skill (см. ниже).

### SM-32 / SM-33 (pedigree, curl)

| # | Запрос | Режим | Статус | Результат |
|---|--------|-------|--------|-----------|
| SM-32 | `POST /horses/{pony_target}/pedigree` + sire с `breed.kind=horse` | authenticated | ✅ | `400`, `"Отец должен быть того же вида..."` |
| SM-33 | `POST /horses/{pony_target}/pedigree` + sire с `breed.kind=pony`, валидные даты | authenticated | ✅ | `204`; GET detail: sire без horse-level `kind`, `breed.kind=pony` |

Ключевые проверки:

- Public `GET /horses/breeds` — `kind` в items ✅
- Public `GET /horses` — horse-level `kind` отсутствует; `breed.kind` в nested BreedOutDto допустим ✅
- Filter/sort horses по query `kind` через `breeds.kind` ✅
- Protected write breeds/horses: 401 без cookie, 403 без scope ✅
- `POST/PATCH /horses` с extra `kind` → 422 ✅
- OpenAPI: `HorseCreateInDto` без `kind` ✅

## Замечания

1. **Несвязанные изменения во frontend** — в diff попали `photoSelector` (`usePhotoSelector.ts`, `PhotoElement.tsx`, `PhotoSelectorModal.tsx`, новый test). Рекомендуется откатить или вынести в отдельный PR до merge миграции `kind`.
2. **Submodule-only diff** — monorepo root не видит изменения в `services/backend` и `services/frontend`; коммиты нужны в каждом submodule.
3. **Manual QA** — шаги 1–26 из плана (CMS `localhost:3000`) остаются на ручную проверку после `make fe` и входа под admin.
4. **Чеклист плана** — пункт `HorseCreateUpdateModal` scope test: guard scopes на уровне protected route/header, отдельного scope-gate в modal нет (как в соседних разделах horses).

## Команды для финализации

```bash
# Backend submodule
cd services/backend
git add -A && git commit -m "feat(horses): move kind from horse to breed"

# Frontend submodule  
cd services/frontend
# при необходимости: git restore src/features/photoSelector ...
git add -A && git commit -m "feat(horses): CMS UI for breed-level kind"

# Миграция на стенде (если ещё не применена)
make be && make be-migrate
```

## Вердикт Quality Gate

**APPROVE с оговорками:** реализация соответствует плану и ТЗ; unit/smoke пройдены; перед merge — убрать посторонний diff `photoSelector`, закоммитить submodules, выполнить Manual QA по плану.
