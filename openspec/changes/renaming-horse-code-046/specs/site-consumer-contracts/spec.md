## ADDED Requirements

### Requirement: Эффективная кличка родословной без изменения consumer
Public horse read contract SHALL возвращать для каждого horse node в поле `name` значение `pedigree_name`, если оно задано, иначе основную кличку. Nullable `pedigree_name` MUST оставаться отдельным raw-полем public JSON. `site-ad` MUST продолжить использовать существующие endpoints и поле `name` без runtime-изменений.

| method | path | access class | roles | expected without auth | expected with auth | связанные тесты |
|---|---|---|---|---|---|---|
| `GET` | `/api/horses`, `/api/horses/{slug}` | Public Read с tenant key | anonymous consumer | `200` с валидным key; `401` missing/invalid | CMS cookie возвращает raw admin projection | backend SM-01..SM-16; site regression |
| `GET` | `/api/horses/{id}/pedigree/{mode}` и `?pedigree=N` | Public Read с tenant key | anonymous consumer | `200` с валидным key; `401` missing/invalid | CMS cookie возвращает raw admin projection | backend SM-17..SM-22; site regression |

Исключений из дефолтной Public Read policy нет; service key остаётся обязательным tenant selector, не секретом пользователя.

#### Scenario: Consumer получает pedigree name
- **WHEN** `site-ad` читает horse list/detail с валидным service key и horse имеет `pedigree_name`
- **THEN** существующий consumer-код получает это значение в `name` без новой логики отображения

#### Scenario: Consumer получает fallback
- **WHEN** `pedigree_name` равен `NULL`
- **THEN** public DTO содержит основную кличку в `name`

#### Scenario: Вложенные nodes
- **WHEN** public response содержит sire, dam, foals, parents или candidates
- **THEN** effective name вычисляется независимо для каждого node

#### Scenario: Site consumer не изменяется
- **WHEN** reviewer проверяет diff и regression публичных horse pages
- **THEN** `services/site-ad` не содержит изменений для задачи 046, а страницы продолжают читать `name`
