# Design — fix-071-inlove-site-bugs

Тикет: `docs/tasks/071_bugs.md` · Дата: 2026-09-11 · Сервисы: `services/site-ksk-inlove`; backend — read-only contract reference.

## Context

Текущий site diff после `068–070` уже содержит общий API client, Zod `4.x`, desktop dropdown, mobile overlay и SSR-блок четырёх service cards. Поэтому задача является regression change, а не повторной реализацией этих возможностей. `inlove-site-header-footer` остаётся отдельным активным change: его runtime diff используется как вход, но его specs/tasks не редактируются.

Production workflow передаёт GitHub secret `EQUESTRIAN_SERVICE_KEY` как Docker build arg `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY`; Dockerfile объявляет arg на builder и runner stages. Helm Deployment не передаёт API env runtime. Для `NEXT_PUBLIC_*` это допустимо только при гарантированном build-time embedding: поздняя подстановка Kubernetes env не исправляет browser bundle. Сейчас отсутствуют fail-fast validation и тест собранного production artifact, а `resolveEquestrianServiceKey()` ещё допускает fallback `default`. Это наиболее вероятная причина production-only расхождения: release может успешно собрать и развернуть image с пустым build arg, после чего ошибка маскируется fallback-значением.

Backend `CallbackRequestCreateDto` остаётся неизменным: `phone` 1–63, optional `name` ≤127, optional `comment` ≤2000. Текущая Zod-схема уже повторяет числовые limits, но plan закрепляет trim/empty optional semantics и проверяет длину итогового comment после добавления контекста.

## Goals / Non-Goals

**Goals:**

- гарантировать selector header в dev и production image, с явным отказом при плохой конфигурации;
- исправить четыре заявленные UI/validation регрессии без изменения page map и design system;
- сохранить SSR-first home content, public access policy и отсутствие CMS credentials;
- дать автоматизированное и browser/live evidence на 320/768/1024/1440 px.

**Non-Goals:**

- изменения backend schemas/endpoints, БД, NATS или auth;
- перенос selector в серверный secret: согласно policy это non-secret tenant identity hint;
- изменение меню, маршрутов, контента услуг или дизайн-документов;
- рефакторинг Docker image/nginx/supervisor вне config wiring;
- включение `071` в change `069`.

## Decisions

### 1. Build-time public config с fail-fast, а не runtime-подстановка browser env

`NEXT_PUBLIC_API_BASE_URL` и `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` остаются build args, потому что callback выполняется в browser и selector не является секретом. Workflow добавляет validation до `docker/build-push-action`; Docker build также выполняет собственную проверку, чтобы локальный/иной CI не мог создать некорректный image. Production artifact test запускает собранный image или инспектирует поведение его runtime через controlled mock API и подтверждает header.

Альтернатива — Kubernetes runtime env — отклонена как единственный механизм: Next.js фиксирует `NEXT_PUBLIC_*` в browser bundle во время build. Альтернатива — same-origin proxy/server-only selector — выходит за scope, добавляет новый endpoint и усложняет public boundary.

В tracked env не помещается реальное значение. GitHub value может храниться в Secrets или Variables; workflow нормализует источник в build arg и не печатает значение. Helm не дублирует env, если runtime действительно использует embedded config; templates меняются только если production verification покажет server-runtime зависимость, и остаются в том же deployment deliverable.

### 2. API client не маскирует missing selector

Fallback `default` удаляется. Resolver валидирует trim/non-empty, `apiFetch` прекращает запрос до `fetch`, а UI получает configuration error. `buildHeaders` сначала удаляет caller `Authorization`, `Cookie` и selector, затем добавляет только configured selector. Один boundary обслуживает GET и единственный разрешённый callback POST.

### 3. Pointer-safe dropdown решается геометрией wrapper

Dropdown привязывается без физического зазора к hover/focus wrapper; визуальный отступ создаётся padding/псевдоэлементом внутри непрерывной hit area. Surface использует существующий opaque token, border/shadow и z-index. JS delay не применяется: он скрывает геометрический дефект, усложняет keyboard behavior и делает тесты timing-dependent.

### 4. Mobile overlay выводится из sticky header stacking context

Mobile menu рендерится через React portal в `document.body` (или эквивалентный viewport-level root), получает `fixed; inset: 0; min-height: 100dvh`, safe-area padding и внутренний overflow. Это устраняет зависимость от containing block sticky header/backdrop-filter. Focus trap, Escape, scroll lock и focus return сохраняются.

### 5. Home services получает section heading и content-driven height

Heading «Услуги» рендерится серверным `HomeContent` как `h2` перед nav. Карточки перестают принудительно быть квадратными там, где это создаёт пустоту: используются responsive min-height/padding и существующие grid/tokens. Состав четырёх ссылок и SSR data flow не меняются.

### 6. Zod валидирует нормализованный payload, а не только controls

Схема сохраняется в feature boundary и получает нормализацию optional whitespace в `undefined`. Phone trim-ится и остаётся обязательным. Итоговый comment с entity context валидируется/ограничивается до transport, чтобы пользовательский ввод и дописанный контекст вместе не превысили 2000. Consent остаётся UI-only. Новая зависимость не добавляется.

## Access matrix

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `GET` | `/api/site_settings` | Public Read + selector | нет | `200` valid; `401` missing/invalid selector | auth не отправляется; тот же outcome |
| `GET` | `/api/news` и остальные используемые consumer GET | Public Read + selector | нет | `200` valid; `401` missing/invalid selector | auth не отправляется; тот же outcome |
| `POST` | `/api/callback_requests` | Public POST exception + selector | нет | `201` valid; `400/422` invalid; `401` missing/invalid selector | auth не требуется/не отправляется; тот же outcome |

Публичный POST — единственное исключение: anonymous посетитель отправляет заявку клубу. Selector обязателен, но не является auth secret. Cookies/Authorization запрещены во всех строках.

## Deliverables и ownership

| Deliverable | Профиль-владелец | Ownership |
|---|---|---|
| A — production API boundary | Site Consumer | `src/api/client*`, production-config tests |
| B — deployment wiring | Site Consumer | `.github/workflows/check_and_deploy.yml`, `Dockerfile`, `.dockerignore`, `package.json`, `scripts/validate-production-config.mjs`, `scripts/verify-production-deployment.mjs`, точечно `.helm/**`, `.env.example`, `README.md` |
| C — navigation regressions | Site Consumer | `src/ui/navigation/**` и tests |
| D — home services density | Site Consumer | `src/features/contentPages/home/**` и tests |
| E — callback validation | Site Consumer | `src/features/callBackRequest/**`, callback service boundary/tests |
| F — integrated verification | Site Consumer / Quality Gate | verification-only, `docs/reports/**` только synthesis |

Один runtime/test файл имеет одного владельца. Units с различным ownership могут выполняться параллельно после завершения `069`; `071` не меняет design source docs.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| `IL71-API-SC-1` | Site Consumer | A | `src/api/client.ts`, `src/api/client.test.ts`, public wrapper tests | доступный site diff `069` | `UT-API-01..04` + typecheck |
| `IL71-DEPLOY-SC-1` | Site Consumer | B | `.github/workflows/check_and_deploy.yml`, `Dockerfile`, `.dockerignore`, `package.json`, `scripts/validate-production-config.mjs`, `scripts/verify-production-deployment.mjs`, `.env.example`, `README.md`; `.helm/**` только при evidence | `IL71-API-SC-1` | production image/config tests `UT-DEP-01..03` |
| `IL71-NAV-SC-1` | Site Consumer | C | `src/ui/navigation/**` | доступный site diff `069` | `UT-NAV-01..04` + typecheck |
| `IL71-HOME-SC-1` | Site Consumer | D | home feature files/tests | доступный site diff `070` | `UT-HOME-01..03` + typecheck |
| `IL71-CB-SC-1` | Site Consumer | E | callback feature/service tests | `IL71-API-SC-1` | `UT-CB71-01..06` + typecheck |
| `IL71-VERIFY-SC-1` | Site Consumer | F | verification-only; test/config fixes only in owning paths | all implementation units | full tests/lint/typecheck/build + static scans |
| `IL71-BQA-SC-1` | Site Consumer | F | verification-only | `IL71-VERIFY-SC-1` | `BQA-71-01..08` |
| `QG-FE` | Quality Gate | F | read-only site/deployment diff | `IL71-BQA-SC-1` | full frontend commands + browser evidence review |
| `QG-CONTRACTS` | Quality Gate | F | read-only OpenSpec/access/ownership/diff | `IL71-BQA-SC-1` | strict validation + conformance |
| `QG-LIVE` | Quality Gate | F | live verification only | `QG-FE`, `QG-CONTRACTS` | `LIVE-API-01..06` against built production image/local API |
| `QG-SYNTH` | Quality Gate | F | `docs/reports/071_bugs.md` | all applicable lanes | one `APPROVED`/`REWORK` verdict |
| `OPS-SYNC` | Router/OpenSpec | F | `openspec/specs/**` | `QG-SYNTH=APPROVED` | sync + strict validation |
| `OPS-ARCHIVE` | Router/OpenSpec | F | OpenSpec archive | `OPS-SYNC` | archive + final validation |

### DAG зависимостей

```text
069 site diff available ─┬→ IL71-API-SC-1 → IL71-DEPLOY-SC-1 ─┐
                         │        └──────→ IL71-CB-SC-1 ───────┤
                         ├→ IL71-NAV-SC-1 ──────────────────────┤
070 site diff available ─└→ IL71-HOME-SC-1 ─────────────────────┤
                                                               ↓
 IL71-VERIFY-SC-1 → IL71-BQA-SC-1 → (QG-FE ∥ QG-CONTRACTS)
                                      ↓
                                   QG-LIVE → QG-SYNTH → OPS-SYNC → OPS-ARCHIVE
```

`QG-BE` неприменим: backend runtime/schema не меняются. `QG-FE` и `QG-CONTRACTS` независимы; `QG-LIVE` следует после них, поскольку проверяет собранный production image и реальный API.

## Test matrix

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где проверяется |
|---|---|---|---|---|---|
| `UT-API-01` | unit | config | valid URL/selector trim | стабильный base URL и selector | `src/api/client.test.ts` |
| `UT-API-02` | API-boundary | access | GET и callback POST | selector есть; credentials omit; no Cookie/Auth | client/wrapper tests |
| `UT-API-03` | unit | invalid config | missing/blank selector, bad URL | no fetch, configuration error, no `default` | client tests |
| `UT-API-04` | API-boundary | access denial | backend `401` | status сохранён, нет login UX/auth retry | client/callback tests |
| `UT-DEP-01` | static/integration | CI input | release inputs valid/blank | valid проходит; blank fails before push | workflow test/script |
| `UT-DEP-02` | integration | production artifact | image built with controlled selector | outgoing request содержит exact header | production image harness |
| `UT-DEP-03` | static | secret hygiene | workflow/Docker/Helm/log scan | values не tracked/не печатаются; selector classified non-secret | scans |
| `UT-NAV-01` | component/CSS | pointer regression | trigger→dropdown across boundary | menu stays open; opaque surface | navigation tests |
| `UT-NAV-02` | component | keyboard | open/navigate/Escape/blur | focus and active semantics preserved | navigation tests |
| `UT-NAV-03` | component/CSS | mobile geometry | open at 320/768 | viewport-level overlay, scroll lock | navigation tests |
| `UT-NAV-04` | component | short height/a11y | Tab cycle, internal scroll, close | all controls reachable, focus returns | navigation tests |
| `UT-HOME-01` | render | SSR | render home | `h2` «Услуги» + four links in HTML | HomeContent tests |
| `UT-HOME-02` | static/component | responsive density | 320/768/1024/1440 rules | no forced empty square/overflow | home CSS/render tests |
| `UT-HOME-03` | regression | href/content | labels/icons/routes | four existing links unchanged | HomeContent tests |
| `UT-CB71-01` | unit | exact boundaries | 63/127/2000 | accepted after trim | schema tests |
| `UT-CB71-02` | unit | beyond boundaries | 64/128/2001, blank phone | rejected, no fetch | schema/modal tests |
| `UT-CB71-03` | unit | optional semantics | blank name/comment | normalized compatible payload | schema/service tests |
| `UT-CB71-04` | unit | composed comment | user + entity context | final value ≤2000, stable context | schema tests |
| `UT-CB71-05` | component | legal/pending | missing consent/double submit | inline error/no POST; max one pending POST | modal tests |
| `UT-CB71-06` | API-boundary | public exception | valid/401/422/5xx | exact payload/header, preserved values/error state | modal/service tests |
| `BQA-71-01` | browser | desktop dropdown | slow pointer at 1440/1024 | opaque and does not close | browser QA |
| `BQA-71-02` | browser | mobile overlay | 320/768 normal+short height | full visual viewport, internal scroll | browser QA |
| `BQA-71-03` | browser | keyboard/a11y | dropdown/menu focus/Escape/200% | focus visible/returns, no loss/overlap | browser QA |
| `BQA-71-04` | browser | home density | 320/768/1024/1440 | heading visible, balanced spacing/no overflow | browser QA |
| `BQA-71-05` | browser | validation | boundary/whitespace/consent | invalid no network, inline errors | browser QA |
| `BQA-71-06` | browser | callback success/error | `201`, `401`, `422`, offline | correct states, values/retry preserved | browser QA |
| `BQA-71-07` | browser/network | public boundary | load home and submit | selector on requests; no Cookie/Auth/CMS endpoints | browser QA |
| `BQA-71-08` | browser/source | SSR | view-source home | services heading/cards server-rendered | browser QA |
| `LIVE-API-01` | live | Public Read happy | production image → site settings | `200`, exact selector, no auth/cookie | QG-LIVE |
| `LIVE-API-02` | live | selector missing | image/config harness without selector | build/start fails or no request; never fallback tenant | QG-LIVE |
| `LIVE-API-03` | live | selector invalid | GET invalid selector | `401`, no auth retry | QG-LIVE |
| `LIVE-API-04` | live | callback happy | valid anonymous payload | one `201`, exact fields/header | QG-LIVE |
| `LIVE-API-05` | live | callback validation | invalid phone/oversize | client blocks or backend `400/422`; no persistence | QG-LIVE |
| `LIVE-API-06` | live | callback selector | missing/invalid selector | `401`, configuration UI, no login | QG-LIVE |

Неприменимые backend-оси: новая транзакционность/конкурентность, DB schema/migration и внешняя NATS-деградация отсутствуют. Реальная PostgreSQL не требуется отдельным планированием: change не меняет backend persistence; `QG-LIVE` использует существующий локальный API только для контрактных GET/POST outcomes и не создаёт pytest smoke files.

## Browser QA steps (UI тестирование)

Предусловия: production-like build сайта с controlled API URL/selector, локальный backend `http://localhost:8001/api`, anonymous browser profile без CMS cookie, DevTools Network Preserve log. Проверить 320, 768, 1024 и 1440 px; дополнительно короткий mobile viewport и zoom 200%.

1. На `/` открыть «Услуги» pointer и медленно провести по нижней границе к каждому пункту: dropdown непрозрачен и не закрывается; затем повторить Tab/Enter/ArrowDown/Escape с возвратом focus.
2. На 320/768 открыть burger: overlay покрывает visual viewport, page/header недоступны, body не scroll; при короткой высоте доступны внутренний scroll, contacts и CTA; закрытие кнопкой/Escape возвращает focus.
3. На `/` проверить heading «Услуги», четыре cards и расстояния сверху/снизу на всех viewports: нет лишней пустоты, overlap, horizontal scroll или обрезанного focus ring.
4. В callback проверить blank phone, 64-char phone, 128-char name, oversize итоговый comment и consent: запросов нет, фокус/inline errors корректны. Проверить точные допустимые границы и whitespace optional fields.
5. Отправить валидную заявку: один `201`, header selector присутствует, payload только `name?`, `phone`, `comment?`, Cookie/Authorization/consent отсутствуют.
6. Воспроизвести `401`, `422` и offline/`5xx`: значения и consent сохраняются; `401` обозначен configuration error, retry доступен только там, где уместен.
7. Проверить Network главной и формы: только consumer endpoints, selector на каждом запросе, никаких CMS-only endpoints/credentials. View source содержит heading/cards услуг.
8. Составить handoff с passed/failed IDs, screenshots для UI/responsive failures и sanitized request headers/status/body; selector value замаскировать в evidence.

## Migration Plan

1. Дождаться стабильного handoff текущего `069` site/QG либо принять его фактический site diff как baseline; не редактировать его OpenSpec.
2. Реализовать независимые runtime units, затем deployment wiring после API boundary.
3. Собрать production image с controlled non-production selector и прогнать integrated/browser checks.
4. Выполнить QG lanes; deploy release только при `APPROVED` и valid configured inputs.
5. Rollback: вернуть предыдущий image tag через Helm. Backend/data migration отсутствует. Если release validation блокирует deploy из-за отсутствующего value, восстановить GitHub configuration и пересобрать image, не отключая fail-fast.

## Risks / Trade-offs

- [GitHub secret корректен, но иной production path не использует этот workflow] → `UT-DEP-02` проверяет именно artifact; handoff фиксирует image digest и путь сборки.
- [Selector виден в bundle] → это ожидаемо для non-secret tenant hint; auth и CMS credentials остаются запрещены.
- [Portal влияет на SSR/hydration] → overlay создаётся только после client interaction, portal root выбирается детерминированно и покрывается render/hydration tests.
- [UI units конфликтуют с незавершённым `069`] → начать после handoff/доступности baseline, ownership пересечения выполнять последовательно.
- [CSS snapshot подтверждает текст, но не реальную геометрию] → обязательны `BQA-71-01..04` на четырёх контрольных ширинах.

## Open Questions

Блокирующих вопросов нет. Реальное имя GitHub configuration остаётся `EQUESTRIAN_SERVICE_KEY` и маппится в публичный build arg; если repository использует Environment-scoped values, исполнитель deployment unit должен сохранить этот scope, не раскрывая значение. Helm меняется только при доказанной необходимости runtime env после production artifact test.
