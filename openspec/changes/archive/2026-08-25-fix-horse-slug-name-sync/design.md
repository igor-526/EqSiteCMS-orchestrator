## Context

Архивированный change `2026-08-25-fix-056-horse-slug-bug` добавил editable slug и backend-семантику: отсутствующий slug в PATCH сохраняется, `slug=""`/`null` регенерируется из итогового `name`, непустой slug считается ручным. Текущий `HorseCreateUpdateModal` при edit всегда инициализирует `slug` сохранённым значением и при каждом submit отправляет его непустым. Обработчик клички меняет только `name`, поэтому backend закономерно сохраняет старый slug.

Источник нового defect report — уточнение пользователя после завершения 056. В `docs/tasks/056_horse_slug_bug.md`, архиве 056 и аналогичных CMS-модалках нет более точного правила приоритета name/ручного slug. Backend не хранит признак, был ли сохранённый slug когда-либо введён вручную.

Change затрагивает только Protected Admin UI `services/frontend`; существующий backend contract достаточен. Endpoint paths/access, DTO, PostgreSQL, NATS и `site-ad` не меняются.

## Goals / Non-Goals

**Goals:**

- при изменении клички в edit modal запрашивать регенерацию slug из итогового имени;
- не перезаписывать slug, который пользователь явно отредактировал в текущей сессии modal;
- сделать precedence детерминированным независимо от порядка изменения полей;
- сохранить validation, permissions, double-submit и error-state поведение;
- закрепить defect регрессионными component tests и browser QA.

**Non-Goals:**

- клиентская транслитерация или дублирование backend slug-алгоритма;
- хранение provenance `manual/auto` в backend/БД;
- изменение PATCH DTO/service, uniqueness, redirect/history старого URL;
- изменение других slug-форм, `site-ad`, public read, scopes или маршрутов.

## Decisions

### 1. UI запрашивает backend-регенерацию пустым slug

При первом изменении `name` в открытой edit modal UI устанавливает `slug=""`, если slug ещё не редактировался пользователем в этой сессии. Submit передаёт существующий typed payload, и backend генерирует значение из итогового имени с tenant-scoped suffix policy. Поле визуально становится пустым и сохраняет подсказку об автогенерации; фактический slug появляется после успешного refresh из backend response.

Альтернатива — транслитерировать в браузере — отклонена: это создаёт второй алгоритм нормализации и не может надёжно учитывать tenant-scoped коллизии.

### 2. Ручной ввод в текущей сессии имеет приоритет

Modal хранит отдельный session-local признак `slugEditedManually`, который сбрасывается при каждом открытии/смене `selectedHorse`. Любое пользовательское изменение slug, включая явную очистку, устанавливает признак. После этого изменения `name` не меняют slug; непустое значение отправляется как ручное, пустое продолжает означать сознательную backend-регенерацию.

Это правило одинаково работает для последовательностей `name → slug` и `slug → name`. Альтернатива — всегда очищать slug при любом изменении клички — отклонена, потому что молча уничтожает явный ввод пользователя в том же payload.

### 3. Сохранённый slug считается auto-linked до первого ручного действия

Backend не хранит provenance slug, поэтому при открытии edit modal невозможно отличить прежний ручной URL от автоматически созданного. Для выполнения заявленного UX сохранённое значение показывается как prefill, но до первого изменения slug считается связанным с кличкой: изменение `name` очистит его. Пользователь, которому нужен прежний/новый ручной URL, может явно отредактировать поле в текущей сессии, после чего manual precedence фиксируется.

Альтернатива — считать каждый prefilled slug ручным — является текущим дефектным поведением и не позволяет автоматически обновить URL при переименовании.

### 4. Граница ownership

Один Frontend agent владеет `HorseCreateUpdateModal.tsx`, его соседним test-файлом и, только если потребуется для снижения сложности, локальным helper/hook внутри `src/features/horses`. Backend/spec runtime files и другие horse modals не меняются. После deliverable Router запускает один общий Quality Gate; findings возвращаются Frontend owner, затем выполняется повторный gate. После APPROVED Router синхронизирует delta spec в main specs, запускает strict validation и архивирует change.

### 5. Access matrix (контракт не изменяется)

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `PATCH` | `/api/horses/{horse_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401`, mutation отсутствует | `200` для своей tenant-записи со scope; `403` без scope/для чужого tenant; `400` для invalid/conflict slug |
| `GET` | `/api/horses` | Public Read с tenant selector | anonymous consumer; CMS user | `200` с valid selector; `401` missing/invalid | `200` |
| `GET` | `/api/horses/{slug_or_id}` | Public Read с tenant selector | anonymous consumer; CMS user | `200` с valid selector; `401` missing/invalid; `404` missing | `200` |

Исключений из default policy нет. Таблица фиксирует регрессионную границу: UI меняет только payload существующего Protected Write, а Public Read остаётся доступным по сгенерированному slug.

## Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| `HorseCreateUpdateModal` name/slug state | изменение name очищает untouched prefilled slug | component regression: edit prefill, name change, submit `slug=""` | authenticated + horse write scope | `npm test -- HorseCreateUpdateModal` |
| `HorseCreateUpdateModal` precedence | ручной slug переживает последующее name change; ручной ввод после name change побеждает auto | component tests для обоих порядков и explicit clear | Protected Write mutation guard | `npm test -- HorseCreateUpdateModal` |
| Existing modal states | reopen/reset, validation error, double submit, success refresh callback contract | component regression, без live backend | scope present/missing; backend `400/401/403` surfaced существующим flow | `npm test`, `npm run lint` |
| CMS/public boundaries | никаких API/import/route изменений | static `rg`, existing auth/API tests | anonymous CMS block; Public Read не приватизируется; no `site-*` mixing | `npx tsc --noEmit`, `npm run build` |

## Manual QA steps (UI тестирование)

Предусловия: frontend/backend запущены; реальная PostgreSQL доступна; есть пользователь с horse write scope, пользователь без scope и возможность anonymous-проверки; известен валидный tenant selector. Создать отдельную QA-лошадь и записать исходные `name`/`slug`.

1. Anonymous: открыть `/horses`; ожидать redirect/block на `/login`, modal и mutation недоступны.
2. Войти пользователем со scope, открыть QA-лошадь на desktop 1440×900; ожидать prefill текущих name и slug.
3. Изменить только кличку; ожидать, что поле slug очистилось и явно остаётся в режиме «генерируется автоматически». Нажать «Изменить» один раз; ожидать один PATCH с новым `name` и `slug=""`, success, закрытие/refresh и новый backend-generated slug в таблице.
4. Открыть запись снова, сначала ввести ручной свободный slug, затем изменить кличку; ожидать, что ручной slug не изменился. Сохранить; PATCH содержит ручное значение, таблица показывает его.
5. Открыть запись снова, сначала изменить кличку (slug очистится), затем ввести ручной slug; ожидать manual precedence и сохранение именно ручного значения.
6. Открыть запись, вручную очистить slug, затем изменить кличку; ожидать пустое поле и backend-регенерацию из итоговой клички после submit.
7. Ввести занятый ручной slug и изменить кличку; ожидать `400`, field error у slug, modal остаётся открытой, name/slug сохраняются.
8. Инициировать generic error и применимые `401`/`403`: ожидать существующий error/auth flow без потери формы; при pending быстро нажать submit дважды и подтвердить один PATCH.
9. Войти пользователем без scope: edit action скрыта/disabled, modal/mutation guard не позволяет PATCH; backend denial при принудительном запросе остаётся `403`.
10. Повторить ключевые шаги 2–5 на tablet 768×1024 и mobile 390×844: name/slug label, input, error и footer не перекрываются, modal прокручивается.
11. Проверить, что list/filter/sort/pagination не изменились и refresh после success показывает актуальные name/slug; Public Read detail с valid selector доступен по новому slug без CMS cookie, старый slug не находит QA-лошадь.
12. Удалить QA-данные. В отчёте зафиксировать passed/failed; для failed responsive/error/permission приложить screenshot, для API failure — method/path/status/body.

## Risks / Trade-offs

- [Ранее ручной persisted slug нельзя распознать] → считать его auto-linked до ручного действия в текущей modal и явно закрепить это UX-правило; provenance требует отдельной backend/DB feature.
- [Пустое поле после изменения клички может выглядеть как потеря данных] → сохранить label/placeholder об автогенерации и проверить browser QA; фактическое значение приходит после refresh.
- [State-флаг не сбросится между записями] → сбрасывать его в том же lifecycle, где инициализируются `name`/`slug`, и покрыть reopen/selectedHorse regression.
- [Ручное значение может быть затёрто из-за порядка событий] → тестировать обе последовательности редактирования и explicit clear.

## Migration Plan

1. Frontend owner реализует session-local precedence и component tests без изменения API/backend.
2. Выполняются frontend gates и единый Quality Gate с browser walkthrough.
3. После APPROVED delta spec синхронизируется и change архивируется.
4. Rollback — откатить frontend state/test diff; данные и API остаются совместимыми. Уже сохранённый новый slug автоматически не восстанавливается.

## Open Questions

Блокирующих вопросов нет. Принято минимальное правило, соответствующее defect report и существующему backend contract: persisted slug auto-linked при открытии, но любой ручной ввод slug в текущей сессии имеет приоритет над изменением клички.
