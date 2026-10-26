# Quality Gate: seo-service-queries-pages

**Профиль:** QG-FULL · **Вердикт: APPROVED** · **Дата:** 2026-10-24

## Итог и границы решения

Качество change одобрено: активных blocking/minor findings и blocked-env нет. Исходные BE findings закрыты последними независимыми повторами, а не проигнорированы. Waiver не требуется и не предоставлялся. Это **не разрешение production release/deployment** и не подтверждение выполнения cleanup.

SYNTH выполнен по итоговым handoff четырёх lanes: тесты, smoke, полный diff и все specs повторно не запускались/не читались; продуктовый код, runtime и данные не менялись.

## Контекст и согласование

Реализованы tenant-scoped поисковые запросы/страницы, нормализация, batch find-or-create, списки, черные списки, PostgreSQL migration и 10 ADMIN-only backend-прокси операций. UI и messaging не затронуты.

- [Change / proposal](<../../openspec/changes/seo-service-queries-pages/proposal.md>), [design](<../../openspec/changes/seo-service-queries-pages/design.md>), [tasks](<../../openspec/changes/seo-service-queries-pages/tasks.md>), [исходная задача](<../tasks/099_seo_service.md>).
- Specs: [normalization](<../../openspec/changes/seo-service-queries-pages/specs/seo-normalization/spec.md>), [resolution](<../../openspec/changes/seo-service-queries-pages/specs/seo-entity-resolution/spec.md>), [listing](<../../openspec/changes/seo-service-queries-pages/specs/seo-entity-listing/spec.md>), [settings](<../../openspec/changes/seo-service-queries-pages/specs/seo-page-normalization-settings/spec.md>), [peer](<../../openspec/changes/seo-service-queries-pages/specs/seo-peer-http-contract/spec.md>), [proxy](<../../openspec/changes/seo-service-queries-pages/specs/seo-backend-proxy/spec.md>).
- [Approval Q1–Q7](<../../openspec/changes/seo-service-queries-pages/design.md#L386-L396>): credential-free доверенная сеть — согласованный контракт, не waiver.
- Текущая ветка корня: `main`. Отдельная branch convention в прочитанных разделах design не задана; ветку/план финализации определяет Router.

## Lanes

| Lane | Статус и итоговое evidence |
|---|---|
| QG-ENV | Пройден: [handoff](<../../.qa/seo-service-queries-pages/QG-ENV/handoff.md>) |
| QG-BE | Пройден; оба scoped findings закрыты: [последний итог](<../../.qa/seo-service-queries-pages/QG-BE/handoff.md#L1-L3>), [IT closure](<../../.qa/seo-service-queries-pages/QG-BE/handoff.md#L48-L52>), [format closure](<../../.qa/seo-service-queries-pages/QG-BE/handoff.md#L64-L70>) |
| QG-CONTRACTS | Пройден: [handoff](<../../.qa/seo-service-queries-pages/QG-CONTRACTS/handoff.md>) |
| QG-LIVE | Пройден, повтор/сверка 13/13: [handoff](<../../.qa/seo-service-queries-pages/QG-LIVE/handoff.md>) |
| QG-FE-AUTO | Неприменимо — frontend/UI diff отсутствует |
| QG-FE-MANUAL | Неприменимо — UI отсутствует, browser QA не требуется |
| QG-SYNTH | Пройден — настоящий единый отчёт, QG.5 завершена |

## Окружение

По ENV: `stackctl ready app`, SEO build → upgrade head → up успешны; backend/SEO health200, исходники/образы актуальны, PostgreSQL16.15, `pg_trgm`1.6, Alembic head `20261023_0002`. Fixtures подтверждены SELECT-only. Runtime repair attempts: **0**, повторных repair/rebuild циклов не было; ошибки проверочного harness устранены без ремонта сервисов ([ENV evidence](<../../.qa/seo-service-queries-pages/QG-ENV/handoff.md#L5-L29>)).

Последний runtime snapshot LIVE: оба сервиса healthy; SEO host port **32769**, backend **8001**. SEO port динамический, перед дальнейшим обращением нужен discovery; старые порты ENV/design не использовать как константу.

## Unit / integration / style

| Проверка (выполнена соответствующей lane) | Результат |
|---|---|
| Backend `make test` | 1924 passed, 5 skipped вне change |
| SEO `make test` | 342 passed, 4 skipped / 15 deselected PostgreSQL IT; не выданы за IT coverage |
| SEO независимый IT после SEO-IT-FIX-1 | **19 passed, 0 skipped, 7.07s**; migration/concurrency/rollback PASS |
| Scoped Ruff lint/format, mypy обоих сервисов | Чисто по итоговым BE проверкам; исходное whitespace minor закрыто |
| CONTRACTS targeted backend / SEO / selector | 224 / 266 / 19 passed |
| LIVE cookie boundary / migration roundtrip | 12 passed / 1 passed |

Источники команд и exit codes: [BE verification и matrix](<../../.qa/seo-service-queries-pages/QG-BE/handoff.md#L5-L44>), [CONTRACTS verification](<../../.qa/seo-service-queries-pages/QG-CONTRACTS/handoff.md#L12-L21>), [LIVE verification](<../../.qa/seo-service-queries-pages/QG-LIVE/handoff.md#L5-L12>). Первоначальный IT isolation defect исправлен **test-only**; независимый повтор создал/удалил все 19 собственных новых `test_seo_*` схем, fingerprints рабочих данных и smoke fixtures неизменны. LIVE migration создала/удалила ещё одну новую собственную схему, без downgrade public.

## Покрытие test matrix

| ID | Фактическое покрытие |
|---|---|
| UT-SEO-01..07 | Normalizer unit tests query/page |
| UT-SEO-08..13 | Domain services, schemas, listing/blacklist, DI unit tests |
| UT-SEO-14..20 | API access/health/resolve/listing/blacklist/errors tests |
| UT-SEOP-01..04 | Client boundary и proxy service unit tests |
| UT-SEOP-05..11 | Proxy API access/roles/errors и route inventory tests |
| IT-SEO-01..06 | Migration/model/entity/blacklist PostgreSQL tests; все 19 PASS после исправления |
| SM-SEO-01..13 | LIVE 13/13 PASS, с явной сверкой прежнего DELETE204 вместо повторного удаления |

Точные имена тестовых файлов по каждому ID: [BE matrix](<../../.qa/seo-service-queries-pages/QG-BE/handoff.md#L31-L44>); отдельные результаты всех SM ID: [LIVE matrix](<../../.qa/seo-service-queries-pages/QG-LIVE/handoff.md#L14-L34>). Непокрытых ID нет; ограничение свежести DELETE204 указано ниже.

## SMOKE-тесты

189 live HTTP запросов: 72×200, 46×401, 11×201, 24×400, 30×403, 2×409, 4×404. Общий диапазон **0.515–57.277 ms**, p95 **35.473 ms**. Время и статусы **каждого endpoint/method**: [endpoint timings](<../../.qa/seo-service-queries-pages/QG-LIVE/endpoint-timings.json>); каждый запрос: [HTTP evidence](<../../.qa/seo-service-queries-pages/QG-LIVE/http-evidence.json>).

**Свежих успешных DELETE204: 0.** Успешный собственный DELETE204/пустое тело сверен по прежнему smoke evidence, а не исполнен повторно в public: [сверка](<../../.qa/seo-service-queries-pages/QG-LIVE/delete204-review.json>). Безопасные foreign DELETE404/malformed DELETE400 повторены. Это соответствует предусмотренному QG.4 «сверка/повтор», не waiver и не сокрытый пропуск. Cookie boundary проверена 12 тестами по разрешённому fallback без записи cookie на wire.

## Access verification results

- Peer `/health` public200; все 12 API операций требуют UUID selector: missing/blank/invalid →401 до JSON/body/session. Без credentials и с посторонними Cookie/Authorization результат одинаков; credentials намеренно не проверяются.
- Backend: все 10 операций anonymous →401; authenticated без ADMIN (включая SUPERUSER/DEVELOPER/USER_MANAGER) →403 до peer; ADMIN →200/201/204 по matrix. Чужие blacklist IDs →404, tenant берётся из actor, клиентский selector не подменяет tenant.
- Backend→peer передаётся только tenant context, без browser cookie/Authorization; DTO не раскрывают tenant/hash. Проверены 400/404/409 и 502 mappings; inventory **130 операций, включая 10 SEO**, соответствует артефакту.
- Protected GET и credential-free internal read/write — явные согласованные исключения с причинами в [access matrix](<../../openspec/changes/seo-service-queries-pages/design.md#L191-L228>). Контрактные и live evidence: [CONTRACTS](<../../.qa/seo-service-queries-pages/QG-CONTRACTS/handoff.md#L23-L37>), [LIVE](<../../.qa/seo-service-queries-pages/QG-LIVE/handoff.md#L14-L34>).

## Findings, Pre-existing и Waivers

Активные **blocking: 0; minor: 0; blocked-env: 0**. IT isolation и whitespace findings закрыты; первоначальный blocked статус BE не является текущим результатом.

Pre-existing, не блокирующие change:
- `stackctl` не поддерживает SEO, host port динамический; штатный make/compose и discovery успешны. Предложение отдельной задачи в `docs/tasks`: зарегистрировать SEO в stackctl и описать port discovery.
- Пять старых E501 route inventory воспроизведены на HEAD; Black25 конфликтует с каноническим Ruff Makefile/CI. [Доказательства BE](<../../.qa/seo-service-queries-pages/QG-BE/handoff.md#L64-L74>). Предложение отдельной задачи в `docs/tasks`: согласовать formatter policy и устранить legacy E501; в этом unit задача не создавалась.

**Waivers: нет.** Согласие на новые временные тестовые схемы — ограниченное разрешение операций, не waiver качества и не согласие на smoke cleanup/production.

## Operational prerequisites и остатки — отдельно от качества change

1. **До production release/deployment обязательно отдельно подтвердить сетевую изоляцию peer/БД от внешних callers. Подтверждение отсутствует; production выпуск до него запрещён.** Локальный dev published port сам по себе не defect; dev readiness не является production security approval ([D8](<../../openspec/changes/seo-service-queries-pages/design.md#L138-L142>)). В этом unit production не выпускался и не развёртывался.
2. **SEO-SMOKE-1.5 остаётся unchecked.** SQL cleanup запрещён; smoke fixtures сохранены. Разрешение удаления новых `test_seo_*` схем не распространяется на старые/новые smoke строки и blacklist fixtures. Точные UUID/tenant/значения: [LIVE retained rows](<../../.qa/seo-service-queries-pages/QG-LIVE/retained-rows.json>), [LIVE fixtures](<../../.qa/seo-service-queries-pages/QG-LIVE/fixtures.json>), [прежние smoke остатки](<../../.qa/seo-service-queries-pages/SEO-SMOKE-1/retained-rows.json>). Cleanup возможен только после отдельного согласия пользователя; gate не объявляет его выполненным.
3. Router выполняет sync/archive/strict validate и task-finalize с их approval gates, не подменяя отдельное согласие на cleanup и подтверждение production isolation. QG.5 завершена, но это не объявляет все tasks change выполненными.

## Изменённые пути / shipctl plan

Полный scoped список **109 файлов от корня монорепозитория** сохранён в [change-paths.json](<../../.qa/seo-service-queries-pages/QG-SYNTH/change-paths.json>): корневые change artifacts/исходная задача/описание сервисов, 17 backend файлов и 79 SEO файлов, плюс этот отчёт. Это инвентарь кандидатов для Router/shipctl, не разрешение коммита посторонних изменений. Внешние данному change DSH-конфиг и frontend-задача исключены; локальные `.env`, credentials и `.qa` не включены.

В этом SYNTH unit изменены только настоящий [итоговый отчёт](<seo-service-queries-pages.md>) и checkbox QG.5 в [tasks](<../../openspec/changes/seo-service-queries-pages/tasks.md#L127>); вспомогательные evidence — только в `.qa/seo-service-queries-pages/QG-SYNTH/`.
