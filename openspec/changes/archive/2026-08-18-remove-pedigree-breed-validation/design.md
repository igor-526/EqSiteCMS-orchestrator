## Context

Текущая реализация pedigree имеет два слоя breed-based логики. `services/backend/src/repositories/horse_repository.py` перед поиском sire/dam/children загружает `breed.kind` целевой лошади и добавляет `kind` либо `breed_id_is_null` в query filters. `services/backend/src/core/services/horse.py` для POST пакетно загружает породы всех участников и отклоняет parent/child при несовпадении `breed.kind`. Это поведение появилось после задачи `014`, но не входит в исходные логические pedigree-инварианты задачи `011` и теперь явно отменено пользователем.

Изменение ограничено backend. GET остаётся Public Read через tenant selector, POST остаётся Protected Write для scopes `SUPERUSER`, `ADMIN`, `DEVELOPER`. Schema/DTO, БД, NATS и frontend не меняются.

## Goals / Non-Goals

**Goals:**

- Разрешить GET-кандидатов и POST-связи независимо от `breed_id`, конкретной породы и `breed.kind`.
- Удалить лишние breed lookup/query branches именно из pedigree flow.
- Сохранить все не связанные с породой инварианты и симметрию GET/POST.
- Закрепить поведение unit, repository/API regression и live smoke сценариями.

**Non-Goals:**

- Не менять глобальные horse list filters/sort по `kind` и не удалять `Breed.kind`.
- Не менять отображение породы в DTO и UI.
- Не добавлять транзитивное обнаружение циклов, новые ограничения БД или атомарность clear/set.
- Не менять auth/tenant contract, pagination, search, sort и public name projection.

## Decisions

1. **Удалить pedigree-зависимость от breed на уровне repository GET.** Методы `get_available_sires`, `get_available_dams`, `get_available_children` больше не вызывают `_get_breed_kind_for_horse` и не передают `kind`/`breed_id_is_null`. Остальные filters сохраняются. Альтернатива — расширить допустимые пары kind — отклонена, потому что пользователь требует убрать валидацию по породе полностью.

2. **Удалить breed lookup и параметры kind из POST validators.** `set_horse_pedigree` не вызывает `_get_breed_kinds_for_horses`; `_validate_parent_candidate` и `_validate_child_candidate` не принимают и не сравнивают kind. Helpers удаления допустимы только если после проверки usages они не нужны другим horse flows. Альтернатива — передавать kind, но игнорировать — оставляет ложную связанность и лишние запросы.

3. **Не менять schema и API форму.** Порода не является входным полем `HorseSetPedigreeInDto`, а response DTO продолжает содержать обычную информацию о породе. Поэтому migrations и API versioning не требуются.

4. **Сохранить симметричные не-breed правила.** GET продолжает исключать self/current immediate relations и применять sex/date/death/occupied-parent-slot filters; POST продолжает tenant lookup, duplicate/self/immediate conflict, sex/date/death checks и partial-update semantics.

5. **Разделить ownership последовательно.** Один Backend-исполнитель владеет tightly-coupled production code и unit/repository/API tests, отмечает только фактически выполненные tasks. После него один Quality Gate проверяет общий diff, запускает tests и live smoke на PostgreSQL. Findings возвращаются Backend-владельцу; затем повторяется общий review. После approval Quality Gate Router синхронизирует delta spec, strict-validates и архивирует change.

### Access matrix

| method | path | access class | roles | expected without auth | expected with auth | tests |
|---|---|---|---|---|---|---|
| `GET` | `/api/horses/{horse_id}/pedigree/{mode}` | Public Read | anonymous с валидным tenant selector; CMS user | `200` с валидным selector; `401` при missing/invalid selector | `200`; candidates не зависят от breed | U-01..U-15, SM-01..SM-18 |
| `POST` | `/api/horses/{horse_id}/pedigree` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401`, без mutation | `204` с разрешённым scope; `403` без scope; foreign/missing horse по действующему error mapping | U-16..U-30, SM-19..SM-30 |

Исключений из default policy нет. Tenant selector — non-secret identity hint; missing/invalid selector для Public Read даёт `401`.

### Unit-тесты backend-фичи «pedigree без breed-валидации»

| ID | Сценарий |
|---|---|
| U-01 | GET sire не передаёт `kind` при совпадающих kind |
| U-02 | GET sire допускает кандидата другого `breed.kind` |
| U-03 | GET sire допускает target без породы и candidate с породой |
| U-04 | GET sire допускает target с породой и candidate без породы |
| U-05 | GET dam допускает другой `breed.kind` |
| U-06 | GET dam допускает разные конкретные породы одинакового kind |
| U-07 | GET children допускает другой `breed.kind` |
| U-08 | GET children допускает смешанные nullable/non-null breed |
| U-09 | GET sire сохраняет male filter |
| U-10 | GET dam сохраняет female filter и date/death filters |
| U-11 | GET children сохраняет birth/death filters |
| U-12 | GET children сохраняет occupied-parent-slot exclusion |
| U-13 | GET сохраняет self/current relations exclusions |
| U-14 | GET сохраняет search, sort, limit/offset |
| U-15 | GET repository не выполняет отдельный breed-kind query |
| U-16 | POST sire другого kind принимается |
| U-17 | POST dam другого kind принимается |
| U-18 | POST child другого kind принимается |
| U-19 | POST target без breed и parent с breed принимается |
| U-20 | POST target с breed и child без breed принимается |
| U-21 | POST не обращается к breed repository |
| U-22 | POST father wrong sex отклоняется |
| U-23 | POST mother wrong sex отклоняется |
| U-24 | POST parent с невалидной датой отклоняется |
| U-25 | POST child с невалидной датой отклоняется |
| U-26 | POST maternal death constraint сохраняется |
| U-27 | POST self-link отклоняется |
| U-28 | POST parent/foal immediate conflict отклоняется |
| U-29 | POST duplicate foals отклоняются и partial clear semantics сохраняется |
| U-30 | POST anonymous/без scope отклоняется до записи; валидный scope получает success |

### Smoke-тесты backend-фичи «pedigree без breed-валидации»

Smoke выполняется только skill `smoke` на живом API и реальной PostgreSQL, не pytest-файлами. Переменные: `BASE_URL`, `TENANT_SELECTOR`, `AUTH_COOKIE`, `TARGET_ID`, `SIRE_ID`, `DAM_ID`, `CHILD_ID`, IDs разных kind/nullable breed и foreign tenant.

| ID | Запрос и проверка |
|---|---|
| SM-01 | anonymous GET sire с валидным selector → 200 |
| SM-02 | anonymous GET dam с валидным selector → 200 |
| SM-03 | anonymous GET children с валидным selector → 200 |
| SM-04 | GET без selector → 401 |
| SM-05 | GET с invalid selector → 401 |
| SM-06 | authenticated GET → 200 |
| SM-07 | GET sire содержит male другого kind |
| SM-08 | GET sire содержит male другой конкретной породы |
| SM-09 | GET sire содержит подходящего male без breed |
| SM-10 | GET dam содержит female другого kind |
| SM-11 | GET dam содержит подходящую female без breed |
| SM-12 | GET children содержит horse другого kind |
| SM-13 | GET children содержит horse без breed |
| SM-14 | GET не содержит target/self |
| SM-15 | GET не содержит текущих immediate relations |
| SM-16 | GET сохраняет sex/date/death restrictions |
| SM-17 | GET search находит cross-breed candidate |
| SM-18 | GET limit/offset и total стабильны с cross-breed rows |
| SM-19 | anonymous POST → 401 и строки связей не изменились |
| SM-20 | authenticated без scope POST → 403 и строки не изменились |
| SM-21 | POST sire другого kind → 204 и связь читается из PostgreSQL |
| SM-22 | POST dam другого kind → 204 и связь читается |
| SM-23 | POST child другого kind → 204 и связь читается |
| SM-24 | POST parent с/без breed при противоположном target state → 204 |
| SM-25 | POST child с/без breed при противоположном target state → 204 |
| SM-26 | POST wrong-sex parent отклонён без частичной записи |
| SM-27 | POST invalid parent/child date отклонён без частичной записи |
| SM-28 | POST self/immediate relation conflict отклонён |
| SM-29 | POST clear через null/empty list → 204 и связи удалены |
| SM-30 | foreign tenant IDs не связываются и не раскрываются; после cleanup нет тестовых rows |

### PostgreSQL для smoke-тестов

Поиск по labels `com.docker.compose.project=eqsitecms` + `service=db` не нашёл контейнер из-за фактического project label `eqsitecms-core`; fallback по имени нашёл `eqsitecms-db` (`postgres:16`). `docker inspect eqsitecms-db` подтвердил: compose service `db`, network aliases `eqsitecms-db`/`db`, `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`, host port `5433`. Перед фактическим smoke Quality Gate MUST повторить discovery/inspect и использовать актуальные значения, не хардкодить приведённый snapshot.

## Risks / Trade-offs

- [Риск] Удаление общего helper может затронуть глобальный horse kind filter → ограничить удаление helpers проверкой usages; list filter/sort по kind оставить.
- [Риск] GET и POST могут разойтись по оставшимся правилам → парные regression scenarios для каждого mode и non-breed инварианта.
- [Риск] Расширенная выдача изменит `total` и страницы → явно проверить pagination/total без frontend post-filtering.
- [Trade-off] Родословная сможет связывать horse/pony и записи без породы → это требуемое доменное поведение, а не ошибка данных.

## Migration Plan

1. Backend обновляет repository и service validators, затем tests.
2. Quality Gate запускает targeted/full tests и live smoke на обнаруженной PostgreSQL.
3. Rollback выполняется возвратом breed filters/comparisons и соответствующих тестовых ожиданий; data migration не нужна.
4. После успешного gate Router синхронизирует delta spec, strict-validates и архивирует change.

## Open Questions

Нет блокирующих вопросов. Формулировка «вообще валидацию по породе убрать» трактуется в подтверждённом контексте как удаление breed-based логики только из pedigree GET/POST; глобальная фильтрация лошадей и доменная модель пород остаются.
