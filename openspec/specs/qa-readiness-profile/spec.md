# qa-readiness-profile Specification

## Purpose
Определять проверяемый безопасный контракт подготовки выделенной PG/API среды и внешних инструментальных prerequisites без подмены разрешений, продуктовой acceptance и реального vendor evidence.

## Requirements

### Requirement: Offline readiness профиль
Readiness validator SHALL без сетевых подключений проверять безопасные target identities, resource ownership, actor/fixture refs, current-source attestation и раздельные permissions. Неполные inputs SHALL давать blocked с точными missing fields. Успех offline проверки MUST NOT означать доступность среды или разрешение операций.

#### Scenario: ENV-01 Отсутствует target или isolation
- **WHEN** профиль не содержит выделенных PG/API целей, изоляции, срока либо actor refs
- **THEN** validator выдаёт конечный список missing/invalid fields без чтения app settings, env/credentials и без network/setup

#### Scenario: ENV-02 Полный synthetic профиль
- **WHEN** все поля заполнены синтетическими non-secret references и согласованы identities/resources/actions/expiry
- **THEN** валидатор сообщает только offline-profile-valid; это не runtime permit и не PG/API PASS

### Requirement: Отдельный операционный допуск
Setup/test/cleanup SHALL выполняться оператором только после отдельного согласия на точные target/resources/actions/expiry/isolation. Существующий guarded PG runner SHALL сохранять свой exact-node registry и dedicated `_test` DB/role/schema guards. Approval плана, наличие profile/consentRef и здоровый app stack MUST NOT заменять реальное разрешение или допускать app DB fallback.

#### Scenario: ENV-03 Scope не разрешён
- **WHEN** отдельный permit отсутствует, истёк либо не покрывает DB/role/volume/fixture/queue действие
- **THEN** действие не выполняется; residual сохраняется безопасно, автоматического teardown/repair и выдачи собственных permits нет

#### Scenario: ENV-04 Выделенная PG/API среда предоставлена
- **WHEN** оператор предоставил exact permits и изолированные ресурсы с проверенной current-source revision
- **THEN** guarded PG cases и реальные anonymous/authenticated API cases допускаются только в своём scope; actors A/B и fixtures имеют журнал ownership, cleanup не затрагивает чужие записи

### Requirement: Раздельные smoke и vendor prerequisites
Readiness SHALL различать наличие smoke skill на диске и успешную штатную загрузку в runtime. Отсутствие catalog entry SHALL передаваться владельцу runtime без альтернативного smoke harness. Synthetic binding/queue/worker SHALL допускаться отдельно и MUST NOT давать vendor PASS.

#### Scenario: SK-01 Файл есть, runtime entry нет
- **WHEN** существует `.agents/skills/api-smoke-test/SKILL.md`, но штатный loader не предоставляет `api-smoke-test`
- **THEN** фиксируется blocked-tool с внешним владельцем DSH; credentials не читаются, `dsh/**` молча не изменяется

#### Scenario: SK-02 Runtime восстановлен внешним владельцем
- **WHEN** в новой сессии штатная загрузка skill проходит
- **THEN** доступность записывается отдельно от реальной API acceptance, которая требует своих targets/permits; synthetic результаты не закрывают vendor gap

#### Scenario: ENV-05 Synthetic parse отдельно от vendor
- **WHEN** разрешён только isolated synthetic POST с заранее предоставленными binding и наблюдаемой delivery целью
- **THEN** 202, delivery и явный GET фиксируются отдельно; реальный vendor call запрещён и остаётся unchecked

### Requirement: Сохранение прежней access policy
Readiness и fixtures SHALL сохранять SEO-only gateway и trusted peer exceptions без ADMIN override. Создание fixture actors MUST NOT расширять production scopes, делать peer публичным или менять маршруты. Контрольные outcomes ниже SHALL проверяться раздельно anonymous/authenticated только после runtime допуска.

#### Scenario: AC-01 Gateway и parse защищены
- **WHEN** проверяются gateway GET и parse POST с anonymous, non-SEO, ADMIN-only, SEO-only и SEO+ADMIN actors
- **THEN** anonymous получает 401, actors без SEO — 403 до peer, SEO допускается по прежнему контракту; чужой selector не меняет tenant

#### Scenario: AC-02 Selector peer не является credentials
- **WHEN** peer GET вызывается с Cookie/Bearer и без них, с валидным, missing или invalid tenant selector
- **THEN** missing/invalid selector даёт 401, валидный — 200 либо 400 для invalid query; credentials не меняют outcomes

#### Scenario: AC-03 Контрольная access matrix среды
- **WHEN** готовится выделенная проверочная среда без изменения endpoint contracts
- **THEN** сохраняются следующие контрольные outcomes; exceptions нужны из-за служебной истории и доверенного межсервисного контура

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/seo/metrica/tasks` | Protected Read exception | SEO-only / SEO+ADMIN | 401 | 200; invalid query 400; без SEO 403; peer error 502 |
| GET | `/api/metrica/tasks` + valid selector | Internal Trusted Network Read exception | trusted peer, роли не применимы | 200; invalid query 400 | те же 200/400, Cookie/Bearer игнорируются |
| GET | `/api/metrica/tasks` + missing/invalid selector | Internal Trusted Network Read exception | trusted peer | 401 до query/storage | 401, credentials selector не заменяют |
| POST | `/api/seo/parse-jobs` | Protected Write | SEO-only / SEO+ADMIN | 401 | 202; без SEO 403; прежние 400/502/503 сохранены |

Fixture consent не разрешает вызовы указанных маршрутов; runtime read/POST scope согласуется отдельно. Production peer/DB external-isolation gate не снимается.
