## Context

`breeds-group-048` уже добавил в `services/frontend` вкладку «Группы пород», CRUD/Page Editor, выбор группы в форме породы, колонку/фильтр/сортировку групп и API boundary `/horses/breed-groups`. Однако статические представления `HorsesUserDocumentationView.tsx` и `HorsesDeveloperDocumentationView.tsx` не обновлены.

Текущее состояние:

- вводный текст «Инструкции» перечисляет лошадей, породы, масти, владельцев и услуги, но не группы пород;
- после раздела о фильтрах лошадей «Инструкция» сразу переходит к породам; нет создания/изменения/удаления группы, Page Editor и объяснения `SET NULL`-результата удаления связанной группы;
- инструкция по породам не описывает поле «Группа», колонку, multi-select фильтр и сортировку;
- developer-вкладка перечисляет `horses`, `breeds`, `coat_colors`, `owners`, `services`, но не `breed_groups`;
- developer-раздел пород не содержит `breed_group_ids`, `group_name`, `breed_group_id` и nested `group`;
- отдельного раздела `/api/horses/breed-groups` нет;
- colocated component tests для двух documentation views отсутствуют; видимость самих tabs уже проверяется в `HorsesTabs.test.tsx`.

Задача является новым, ещё не одобренным content/UI behavior diff. Она оформляется отдельным change, а не модификацией почти завершённого `breeds-group-048`: так сохраняются ранее одобренные артефакты и независимый approval gate. Источниками истины для текста служат реализованные types/API/UI и delta specs `breeds-group-048`, а не предположения.

## Goals / Non-Goals

**Goals:**

- синхронизировать обе встроенные вкладки с фактическим UI и API групп пород;
- дать администратору завершённый рабочий сценарий «создать группу → назначить породе → фильтровать/сортировать → очистить или удалить»;
- дать разработчику точный контракт endpoint-ов, query/body/response, access и nullable-семантики;
- закрепить ключевой контент component regression-тестами и проверить визуальную читаемость в браузере.

**Non-Goals:**

- изменения backend, БД, API, access policy или scopes;
- изменение поведения CRUD, фильтров, сортировки, Page Editor или удаления групп;
- изменение структуры tabs или правил `SEE_USER_DOCS`/`SEE_DEVELOPER_DOCS`;
- изменения `site-*`, внешней документации или создание нового документационного движка;
- переписывание всей существующей справки или исправление несвязанных исторических неточностей.

## Decisions

### 1. Статический контент остаётся в feature UI

Обновить существующие `HorsesUserDocumentationView.tsx` и `HorsesDeveloperDocumentationView.tsx` без нового data-fetching слоя. Это соответствует архитектуре documentation views и исключает runtime API calls. Вынос контента в CMS/backend или MDX отклонён: он расширяет задачу, создаёт миграцию и не нужен для двух локальных представлений.

### 2. Пользовательский материал следует порядку UI

Во вводный перечень добавляется «группы пород». Между текущими разделами «Фильтры и поиск по лошадям» и «Породы» добавляется отдельный раздел «Группы пород»; последующие верхнеуровневые номера последовательно сдвигаются. Раздел описывает:

- назначение группы как справочника для объединения пород;
- таблицу «Наименование / Путь URL / Действия», поиск/сортировку/пагинацию;
- create/update/delete flow и редактирование страницы через Page Editor;
- отсутствие фото-controls у страницы группы;
- удаление группы не удаляет породы, а очищает их связь и показывает «—»;
- permission behavior: недоступные write-controls скрыты/disabled, ошибки не считаются успехом.

В разделе «Породы» добавляются поле «Группа», колонка, multi-select фильтр, сортировка по группе, назначение и явная очистка группы. Вариант ограничиться одной вводной фразой отклонён, потому что не объясняет новый пользовательский workflow.

### 3. Developer-раздел фиксирует канонический API без изменения контракта

После «Лошади» и перед «Породы» добавляется самостоятельный раздел «Группы пород — `/api/horses/breed-groups`»; последующая нумерация обновляется. Он документирует:

- list/detail/create/update/delete paths;
- list query: `limit`, `offset`, `name`, `slug`, `page_data`, repeatable `sort`; допустимые сортировки `name`, `slug`, `created_at`, `updated_at` с `-` для desc;
- detail `page_data=true`, slug-or-UUID lookup;
- create/update поля `name`, `slug`, `page_data`, auto-slug и partial PATCH;
- response `id`, `name`, `slug`, timestamps и optional `page_data`;
- curl-примеры Public Read и Protected Write;
- существующую access-семантику: GET без CMS-auth при валидном `X-Equestrian-Service-Key`, missing/invalid selector `401`; writes требуют CMS auth/role, anonymous `401`, insufficient permission `403`.

Раздел пород дополняется `breed_group_ids`, `group_name`, входным nullable `breed_group_id`, nested nullable `group: {id,name,slug}` и правилом PATCH: отсутствие поля сохраняет связь, явный `null` очищает. Удаление группы описывается как `ON DELETE SET NULL`. Никакие новые endpoint-ы или статусы этим change не вводятся.

### 4. Regression-тесты проверяют контрактные маркеры и пользовательский смысл

Создать по одному colocated test-файлу для каждого view. Тесты рендерят компонент с разрешённой ролью/контекстом по существующему test pattern и проверяют видимые заголовки и ключевые токены. Для developer-view дополнительно проверяются все методы/path, `breed_group_ids`, `group_name`, `breed_group_id`, nested `group`, `page_data`, `401/403` и selector header. Для user-view — workflow, Page Editor, назначение/очистка, filter/sort и сохранение пород после удаления группы. Полные snapshot-тесты отклонены: они шумны и хуже фиксируют смысловой контракт.

### 5. Ownership и порядок

1. **Frontend agent:** единственный владелец двух documentation views и их tests; правит только назначенные `services/frontend/src/features/horses/ui/Horses*DocumentationView*` пути, запускает scoped и полный frontend gate, отмечает только Frontend tasks.
2. **Quality Gate agent:** после frontend deliverable проверяет общий diff, тесты, access/content accuracy, отсутствие runtime calls и `site-*` mixing, выполняет browser Manual QA и записывает evidence в `docs/reports/update-horses-breed-group-docs-review.md`.
3. Если browser runtime недоступен по причинам платформы, Quality Gate фиксирует точное сообщение среды, список обнаруженных browser surfaces, предпринятые troubleshooting-попытки, невыполненные проверки и остаточный риск. Только явное решение пользователя принять этот риск разрешает оформить browser tasks как `deferred by user-approved platform waiver`; они остаются unchecked и не называются passed.
4. При таком waiver Quality Gate MAY выставить `APPROVED WITH ACCEPTED RISK`, если все автоматизированные, content/access, architecture и validation проверки зелёные, других blocking findings нет, а рекомендация повторить deferred browser QA при появлении runtime сохранена в отчёте. Waiver не применим к доступному, но падающему browser QA и не скрывает найденные UI-дефекты.
5. Findings возвращаются Frontend owner; после исправлений повторяется один общий Quality Gate. После clean gate либо документированного `APPROVED WITH ACCEPTED RISK` Router синхронизирует delta spec, strict-validates и архивирует change.

## Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| `HorsesUserDocumentationView` | группы пород и связь с породами описаны как admin workflow | component regression: overview, CRUD/Page Editor, assign/clear, filter/sort, delete semantics | authenticated + `SEE_USER_DOCS`; отсутствие scope вкладки покрыто существующим tabs test | `npm test -- HorsesUserDocumentationView`, browser |
| `HorsesDeveloperDocumentationView` | добавлен полный существующий API contract групп и расширен контракт пород | component regression по paths, query/body/response/access tokens | Public Read GET semantics; Protected Write `401/403`; сама CMS-вкладка требует developer docs scope | `npm test -- HorsesDeveloperDocumentationView`, browser |
| documentation boundary | статический UI не делает API calls и не смешивает consumer-контур | source/static review; MSW/live backend не требуются, поскольку calls отсутствуют | anonymous protected route и authenticated role behavior остаются неизменными | `rg`, lint/typecheck/build |
| responsive/readability | новый длинный текст, таблицы и code blocks читаемы | browser manual desktop/tablet/mobile | ADMIN видит инструкцию; DEVELOPER/SUPERUSER видит обе вкладки | browser screenshots/evidence |

## Manual QA steps (UI тестирование)

Предусловия: frontend change собран; доступна CMS; есть anonymous session, ADMIN с `SEE_USER_DOCS`, DEVELOPER или SUPERUSER с `SEE_USER_DOCS` и `SEE_DEVELOPER_DOCS`; открыть DevTools Network. Backend для чтения статического контента не требуется.

1. Anonymous открывает `/horses`: protected boundary перенаправляет/блокирует до отображения данных или документации.
2. ADMIN входит и открывает `/horses`: «Инструкция» доступна по текущему scope; «Документация» не появляется, если developer scope отсутствует.
3. На «Инструкции» проверить вводный перечень и новый раздел «Группы пород» перед «Породы»: отражены таблица, create/update/delete, Page Editor без фото, фильтр/сортировка/пагинация и permission/error behavior.
4. В разделе «Породы» проверить описание поля и колонки «Группа», multi-select фильтра, сортировки, назначения и явной очистки; удаление группы сохраняет породы и даёт «—».
5. Войти DEVELOPER/SUPERUSER и открыть «Документацию»: overview содержит `breed_groups`, а отдельный раздел расположен перед породами.
6. Сверить list/detail/POST/PATCH/DELETE paths, query/sort, request/response и curl-примеры с `src/api/horseBreedGroups.ts`, `src/types/api/horseBreedGroups.ts` и контрактом `breeds-group-048`.
7. Сверить расширение пород: `breed_group_ids`, `group_name`, `breed_group_id`, nested `group`, omitted-vs-null PATCH и `SET NULL` при удалении группы.
8. Проверить access-текст: GET Public Read требует selector и даёт `401` без/при invalid selector; writes требуют CMS auth, дают `401` anonymous и `403` без разрешения. Убедиться в Network, что переключение/чтение документационных вкладок само не создаёт новых API-запросов.
9. Повторить чтение обеих вкладок на desktop 1440×900, tablet 768×1024 и mobile 390×844: нет overlap/обрезания tabs, заголовков, списков, таблиц и code blocks; горизонтальный scroll не ломает страницу.
10. Проверить regression других horse tabs и отсутствие ссылок/импортов/runtime calls из `site-*`.
11. В QA-отчёте записать passed/failed для каждого шага; screenshots обязательны для failed responsive/access/content cases, Network method/path/status/body — только если обнаружены неожиданные запросы или access failures.

### Platform-unavailable waiver

Browser Manual QA остаётся предпочтительным и обязательным при доступном browser runtime. Исключение допускается только при одновременном выполнении всех условий:

- runtime возвращает явную ошибку недоступности browser surface, а список доступных browser instances пуст;
- выполнены и записаны доступные initialization/troubleshooting-попытки;
- пользователь явно разрешил закрыть change без browser QA и тем самым принял перечисленный остаточный риск;
- tasks browser QA остаются unchecked и помечаются как deferred, а не passed;
- в QG report перечислены непроверенные auth/scope, Network, responsive/readability и regression сценарии;
- все автоматизированные frontend, content/access, architecture и OpenSpec checks успешны, других blocking findings нет;
- отчёт содержит рекомендацию выполнить deferred QA при появлении Browser/Computer use.

Для текущего выпуска evidence: Browser runtime сообщил `No browser is available`, список browsers — `[]`; после объяснения ограничения Arch пользователь явно ответил: «Пока недоступно, закрывай так». Это разрешает повторный Quality Gate по waiver-path, но не ретроактивно превращает шаги Manual QA в выполненные.

## Risks / Trade-offs

- [Документация снова разойдётся с API] → контрактные tokens покрываются тестами, Quality Gate сверяет текст с types/API/spec.
- [Длинный статический JSX сложнее поддерживать] → изменение локализовано в двух существующих views; архитектурную миграцию docs не смешивать с content fix.
- [Нумерация разделов станет несогласованной] → Frontend owner обновляет все последующие верхнеуровневые номера, тест/QA проверяет порядок.
- [Таблицы и code blocks переполнят mobile] → обязательная проверка трёх viewport и overflow/readability; при текущем platform waiver риск остаётся принятым, а проверка откладывается до доступности Browser/Computer use.
- [Waiver скроет реальный UI-дефект] → browser tasks остаются unchecked, отчёт перечисляет каждый непроверенный сценарий, а waiver запрещён при фактическом failure доступного браузера.
- [Текст ошибочно обещает новый access behavior] → документируется только контракт `breeds-group-048`; backend diff запрещён scope-ом.

## Migration Plan

1. Развернуть статический frontend content и tests после доступности реализованного `breeds-group-048` contract.
2. Выполнить frontend gate и browser QA; если browser runtime недоступен, применить только документированный user-approved platform waiver по условиям выше. Миграции данных или backend deploy не нужны.
3. Rollback — вернуть только четыре documentation view/test files к предыдущей версии; API и данные не затрагиваются.

## Open Questions

Блокирующих вопросов нет. План предполагает, что пользовательское «под изменения» относится к уже реализованным группам пород из `breeds-group-048`; изменение оформлено отдельно из-за нового approval gate.
