# Design — site-ad-copyright-risk-remediation

Задача: `docs/tasks/114_site_ad_copyright_risks.md` · 2026-11-12 · `services/site-ad` · PLAN-2.

## Context

Мотивация — [proposal.md](proposal.md). [audit.md](audit.md) остаётся неизменённым широким аудитом PLAN-1, а не заданием реализации; рекомендации о восьми ICO, фильтрации CMS, снятии фото/текстов/бренда и карт не одобрены. [material-register.md](material-register.md) сохраняет исходные SHA и usage и вводит отдельное решение текущего scope. Отсутствие документов не доказывает нарушение.

Уточнение пользователя: «Убираем следующие иконки: - 4-х групп услуг с главной страницы - Из блока контактов VK и Email. Из групп услуг давай просто уберём и оставим текст. По контактам давай заменим на что-то, что можно использовать. В первую очередь смотри подключенные библиотеки. Из public иконки удаляем, в коде комментируем. Также прошу удалить все изображения, которые не используются».

## Goals / Non-Goals

**Цели:** точечное изменение без потери ссылок/контактов, лицензированная небрендовая замена VK/Email, безопасная очистка доказанно неиспользуемых локальных изображений.

**Не цели:** прежняя provenance policy/машинный реестр допуска, CMS-фильтры/HTML sanitizer, редактура текстов, удаление используемых фото/логотипа/favicon/phone/других SVG или четырёх rides ICO, изменение API/карты/Metrika/маршрутизации/toolchain, покупка и генерация иллюстраций, новые зависимости, деплой/CDN purge. Не подтверждать права на остальной контент автоматически.

## Decisions

### 1. Четыре карточки без рисунков и минимальные комментарии

В `src/features/home/services/homePageDataService.tsx` выключить только `icon` четырёх items; удалить `public/icons/{ridding,farm,rent,sale}.ico`. Сохранить id/title/description/href и порядок. `QuickServices` уже имеет optional icon и условную обёртку: не удалять возможность иконок из общего компонента, поскольку rides её использует.

Каждое прежнее обращение свести к одной строке-комментарию вида `// icon: <ImageBlock pathImage="/icons/ridding.ico" ... /> — отключено: задача 114.` с полным прежним alt вместо многоточия в реальном коде. Эти четыре комментария — документированные неисполняемые исключения из проверки references; не оставлять многострочные JSX/большие мёртвые ветви. Удалить ставший неиспользуемым import ImageBlock. Сами файлы удалить после проверки абсолютных путей, не переносить в другой public-каталог и не переименовывать.

### 2. Контактные иконки: конкретная библиотека и лицензия

Lock и установленное дерево: `antd@5.27.3` требует `@ant-design/icons`, разрешённая версия **5.6.1**, та использует `@ant-design/icons-svg` **4.4.2**. Доступны точечные модули `@ant-design/icons/LinkOutlined` и `@ant-design/icons/MailOutlined`; JS/типизация локально проверены. VK-логотипа не требуется: для VK использовать нейтральную цепочку LinkOutlined и видимую краткую подпись «VK», для Email — MailOutlined. Это не выдаёт лицензию пакета за разрешение на товарный знак. Storybook icons — dev-пакет, не использовать; новую библиотеку не добавлять.

Оба пакета — **MIT**. Полный текст `@ant-design/icons/LICENSE` прочитан локально: `Copyright (c) 2018-present Ant UED, https://xtech.antfin.com/`. В npm-упаковке icons-svg LICENSE отсутствует, но MIT указан в package.json/lock; точная публикация npm 4.4.2 указывает gitHead `038764e4e46499212751a452704f64231fa756ba`, его корневой LICENSE получен и совпадает с локальным icons LICENSE. Источники и копии — реестр, `.qa/.../plan2-icons-svg-{npm.json,LICENSE.txt}`. Две попытки URL по предполагаемым тегам вернули 404; успешное подтверждение — по gitHead, не по тегу.

В `public/third-party-notices.txt` включить названия/версии обоих пакетов, источники и полный MIT copyright/permission/disclaimer без сокращения (один общий идентичный текст с перечислением двух пакетов допустим). Ссылка Footer «Лицензии иконок» делает notice доступным с поставленным сайтом; сохранить notices уже поставляемых зависимостей, не предпринимать полный SBOM-аудит. Изменение статического txt не является API endpoint change.

В `src/ui/atoms/Icon.tsx` заменить **только** ветви vk/mail библиотечными компонентами, сохранив типы/размеры/className/currentColor/aria. Это также охватывает Footer и MobileMenu, чтобы исходная inline-копия не осталась в другом контактном месте. Не вызывать React-компоненты как обычные функции; адаптер возвращает JSX. Общий SVGProps контракт не расширять на все иконки. Старые paths удалить, оставить по одному короткому комментарию у заменённых ветвей (`// vk: прежний inline SVG отключён, задача 114.` и аналогично mail), без закомментированных координат. Phone/telegram/whatsapp и остальные ветви не менять.

Контакты: сохранить href/target/rel, labels, keyboard focus, условное отображение и mailto/tel. Видимую подпись VK добавить только соответствующим контактным ссылкам в ContactsBlock/Footer/MobileMenu; Email остаётся распознаваемым конвертом с доступным именем. Проверить отсутствующие settings и socials без type. Существующее условие ContactsBlock, прячущее socials без phones, не исправлять в рамках задачи; fixtures для приёмки содержат phone, отдельный no-settings тест фиксирует baseline.

Manifest/lock остаются неизменными: импортируется уже установленная транзитивная зависимость antd, риск прямого импорта зафиксирован. Если при apply exact module/license недоступны, не устанавливать пакет: заменить vk/mail текстом «VK»/«Email» с существующим доступным link (при необходимости простая CSS-рамка), записать обоснование в реестр/notices. Небрендовый CSS/текст — безопасная альтернатива, а не повод расширить dependency scope.

### 3. Очистка изображений — только по доказательствам

Исходный AST inventory содержит 110 файлов public, из них 49 без `/images|icons` AST references. Он пропускает metadata `/favicon.png`: после поправки **48 кандидатов** (38 JPG, 10 SVG), не 49 разрешённых удалений. Полный список — раздел PLAN-2 реестра. Четыре явных ICO — отдельный утверждаемый набор, не «неиспользуемые до изменения». `stallion.jpg`/`stallions.jpg` с непотреблёнными полями остаются неопределёнными, не добавляются в deletion list автоматически.

Для каждого кандидата исполнитель записывает в реестр путь/SHA, прямые импорты/URL (включая basename и encoded variants), CSS/Tailwind/style, динамические шаблоны/каталоговые загрузчики, metadata/file conventions, fallback, stories/tests, архивные маршруты, CMS/внешние потребители, evidence и `delete/retain/uncertain`. Отсутствие лицензии — отдельная колонка, не критерий удаления. Комментарии не считаются исполнением, но сохраняются как исторические ссылки. Нулевой reference count не равен доказанному неиспользованию.

Проверено PLAN-2: CSS/Tailwind фон `home-img.jpg` есть в `(archive)/page.tsx` и stories, rental/breeding style backgrounds используются; всё сохраняется. `src/app/favicon.ico` — file convention; public/favicon.png явно задан в layout, оба сохраняются. Horse1/2/3 — fallback, сохраняются. `getImagesFromFolder` в `src/api/imagesFromFolder.ts` строит пути через readdirSync, но вызовов/импортов в src не найдено; при apply проверить повторно, включая конфиги/.storybook/docs и не-TS файлы. Не считать архивные route groups непубличными по имени. Одинаковые SHA двух sport JPG не означают неиспользуемость: оба имеют refs.

Live URL, полный CMS export и внешние ссылки на локальный public не предоставлены. CMS `page_data`/photos/прочие текстовые поля могут ссылаться на любой путь, поэтому сейчас **ни один из 48 дополнительных кандидатов не доказан для удаления end-to-end**. При apply использовать только предоставленный разрешённый read-only target/export (включая pagination, вложенные URL/HTML/CSS, URL-encoded пути и origin), либо подтверждённый владельцем полный перечень потребителей. Не читать secrets/.env, не отправлять формы, не редактировать CMS. Если полноту/внешнее использование установить нельзя — сохранить файл как uncertain с конкретным ограничением; не делать отдельную юридическую блокировку сайта и не требовать документов о правах для используемых фото.

Standalone `icons/vk.svg`/`mail.svg` — две строки среди 48; смена inline не удаляет их и наоборот. Standalone phone/telegram/whatsapp также кандидаты только как отдельные файлы: inline-функциональность сохраняется. Новый найденный потребитель исключает файл из удаления. Новый кандидат вне перечисленных 48 требует обновления evidence/реестра и ownership через Router до удаления.

## Access matrix

Новых/изменённых API endpoints нет, access exceptions не вводятся. Матрица изменений пуста; существующие GET/tenant selector и callback POST вне diff. Anonymous/authenticated API smoke неприменим: никаких HTTP-access изменений не планируется; регрессию подтверждают неизменные `src/api/**`, settings wrappers и существующие тесты в полном npm test. Не отправлять live POST.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| — | — | API без изменений | прежние | прежние outcomes без изменений | прежние outcomes без изменений |

## Deliverables и ownership

| Deliverable | Владелец | Непересекающиеся пути и closure |
|---|---|---|
| A — точечная очистка графики сайта | Site Consumer | homePageDataService.tsx; `src/ui/atoms/Icon.tsx`; `src/ui/{sections/ContactsBlock,navigation/Footer,navigation/MobileMenu}.tsx`; их новые colocated tests; `src/features/home/services/homePageDataService.test.tsx`; `src/ui/quick-services/QuickServices.test.tsx`; четыре целевых public ICO; только доказанные кандидаты public из реестра; `public/third-party-notices.txt`; `scripts/verify-image-cleanup.mjs` + `scripts/verify-image-cleanup.test.mjs`; `C/material-register.md` фактические решения/SHA/refs. Существующие tests/stories в этих же зонах — только необходимая closure. Package/lock, остальные src и API read-only |
| B — независимая приёмка | Quality Gate | `.qa/site-ad-copyright-risk-remediation/QG*/**`, единственный будущий `docs/reports/site-ad-copyright-risk-remediation.md`; продукт и реестр read-only |
| C — lifecycle | Router после QG | sync только `openspec/specs/site-ad-content-provenance/spec.md`, archive только данного change; не отдельный checkpoint unit |

PLAN-2 меняет только собственные артефакты change и evidence. `C/` далее — каталог change, `S/` — services/site-ad. tasks checkbox — служебные, каждый исполнитель отмечает только свои IDs. Чужой diff не включать. Если потребуется неназначенный путь — остановиться и согласовать ownership, не расширять его автоматически.

## Execution units

Один компактный runtime unit: ~9 существенных связанных действий, один сервис и единый slice удаления графики с регрессией. Не восемь широких units и не отдельная сессия на каждую иконку. При реальном превышении бюджета — atomic partial + bounded split, не героическое расширение.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|---|
| SC-1 | Site Consumer | A | вся точечная closure A | новое approval | PR-01..05; final-service группа; owner browser selection | `C/design.md`, `C/specs/site-ad-content-provenance/spec.md`, `C/material-register.md#plan-2`, `S/src/features/home/services/homePageDataService.tsx`, `S/src/ui/atoms/Icon.tsx`, `S/src/ui/sections/ContactsBlock.tsx`, `S/src/ui/navigation/{Footer,MobileMenu}.tsx`, `S/package.json`, `S/package-lock.json` только выбранные модули |
| QG-FE-MANUAL | Quality Gate | B | evidence QG-FE-MANUAL | SC-1 | PR-06 scripted/visual | `C/design.md#test-matrix`, delta spec PR-06, handoff SC-1 |
| QG | Quality Gate | B | evidence QG + итоговый отчёт | QG-FE-MANUAL | PR-01..05,07 независимо; QG-LITE | `C/design.md#test-matrix`, `C/material-register.md#plan-2`, delta spec, handoffs SC-1/QG-FE-MANUAL |

DAG: `новое approval → SC-1 → QG-FE-MANUAL → QG → Router sync/validate/archive`. Параллельных runtime units нет. QG-LITE плюс browser unit: один сайт без backend/DB/NATS; остальные QG-FULL lanes неприменимы.

## Test matrix

План, не runtime evidence. Независимый evidence owner каждого свойства один; owner self-check не заменяет QG. Ledger с revision/fingerprint, prerequisites и invalidation — по `agents/howto/verification-policy.md`, только `.qa/site-ad-copyright-risk-remediation/<unit>/`.

| riskId | scenarioId | unit | testPath/command | evidenceOwner | prerequisites | isolation | permission | budget | stopCondition | status |
|---|---|---|---|---|---|---|---|---|---|---|
| R-HOME | PR-01 | SC-1 | home data + QuickServices tests: ровно 4 text cards, исходные href, нет icon wrapper/ICO; rides ссылки/иконки не изменены | QG | unit deps, mocked settings | локальный DOM | approval apply | 120 s | потеря текста/ссылки или rides diff → failed | planned |
| R-CONTACT | PR-02 | SC-1 | Icon/ContactsBlock/Footer/MobileMenu tests: оба settings social types, aria/size/focus, отсутствие прежних vk/mail paths; phone и no-settings baseline сохранены | QG | installed modules + fixtures | без реального CMS/почты | approval apply | 120 s | старый контур/потерянный href → failed | planned |
| R-LICENSE | PR-03 | SC-1 | module/version/license + полный notice и Footer link, fallback при недоступности модуля (fixture) | QG | lock/local LICENSE и npm/gitHead evidence | read-only packages | no install | 120 s | нет подтверждения → текст/CSS; не придумывать copyright | planned |
| R-DELETE | PR-04 | SC-1 | `node --test scripts/verify-image-cleanup.test.mjs`; `node scripts/verify-image-cleanup.mjs`; SHA/refs реестра; negative fixtures CSS/dynamic/favicon/fallback/archive/unknown CMS сохраняют файл | QG | конечный deletion manifest, CMS/export либо uncertainty | fixtures в .qa, без DB | только подтверждённые пути после realpath review | 180 s | неизвестный потребитель → retain/uncertain, не delete | planned |
| R-REGRESSION | PR-05 | SC-1 | npm test, npm run build, scoped ESLint изменённых TS/TSX/MJS; diff API/контента/ride/assets | QG | существующий toolchain | локально без infra setup | approval apply | 10 min | baseline blocker → blocked, без скрытого fix | planned |
| R-UI | PR-06 | SC-1 self-check; QG-FE-MANUAL | scripted Playwright `/`, `/contacts`, MobileMenu/Footer, `/services/rides`; DOM/network/screenshots на 1366×768 и 390×844 | QG-FE-MANUAL | разрешённый dev URL, Chromium, fixture settings с VK/email/phone | анонимный browser, без submit | явный target, no CMS mutations | 10 min | нет target/route conflict → blocked; 1 targeted recheck | planned |
| R-COVERAGE | PR-07 | QG | static deletion manifest против предоставленного read-only CMS/export и внешнего перечня; отчёт об unchecked | QG | конечный разрешённый снимок или сохранённые uncertain | только GET/обезличенный export | отдельный target permit, без secrets | 15 min, max 2 infra attempts | нет полноты → uncertain retain, не глобальный PASS | unchecked — live/export не предоставлены |

PR-04 checker не превращать в runtime policy. Минимальная контрактная проверка: explicit deletion manifest и отсутствие активных refs; комментарии четырёх отключённых icon разрешены явно, не blanket-ignore. Negative fixture «нет буквального URL, но есть генератор пути» и «CMS неизвестна» обязаны запрещать автоматическое признание неиспользуемым. Результат по кандидатам хранить в реестре, а исполняемые fixtures/manifest evidence — в .qa; скрипт принимает переданный manifest, не читает приватные данные и не выполняет delete.

### Verification-команды

SC-1 — одновременно final-service граница: scoped component tests при разработке; один окончательный `npm test`, `npm run build`, `npx --no-install eslint <изменённые поддерживаемые пути>` из S, плюс два node checker commands PR-04. QG независимо запускает ту же эффективную группу на актуальной revision. `npm test` уже alias vitest unit, не повторять его другим alias. `npm run lint` сейчас `next lint` при Next 15/ESLint 9; scoped нативный ESLint вместо обещания работоспособности alias. Makefile/canonical formatter не найден: formatter check not-applicable с причиной, новый formatter не вводить. Возможный archive route collision — baseline blocker, не чинить в change. Полные runtime suites в PLAN-2 не запускались.

Owner до удаления фиксирует текущие SHA/refs и при доступном dev target before DOM/network для PR-01/02; после — сопоставимые сценарии. Нет документа претензии — нельзя заявить правовой FAIL→PASS; не создавать искусственное нарушение. Evidence invalidates при изменении затронутого кода/fixtures/lock/target.

Точный доступный OpenSpec CLI из корня (shell не находит openspec в PATH):
```bash
node /srv/eqSiteCMS/.cache/openspec-tool/1.14.3/node_modules/@fission-ai/openspec/bin/openspec.js status --change site-ad-copyright-risk-remediation --json
node /srv/eqSiteCMS/.cache/openspec-tool/1.14.3/node_modules/@fission-ai/openspec/bin/openspec.js validate site-ad-copyright-risk-remediation --type change --strict
```

### PostgreSQL для smoke-тестов

Неприменимо: DB/API/NATS не меняются, инфраструктуру не искать/не поднимать. Approval не разрешает setup/teardown и CMS-запись.

### UI-приёмка публичного сайта

На desktop и mobile: четыре текстовые карточки без пустых кругов; все прежние href и порядок; VK-подпись/небрендовая иконка, Email-конверт, keyboard names/focus и кликабельность; Header/MobileMenu/Footer без старого vk/mail path; phone и прочие иконки прежние. `/services/rides` сохраняет tour/individual/group/sport.ico. Сеть без четырёх главных ICO и действительно удалённых кандидатов; отсутствие 404 по оставшимся фото/fallback/favicon. Независимый scripted/visual evidence — QG-FE-MANUAL, product fixes только Site Consumer.

## Risks / Trade-offs

- [Неполный CMS/внешний перечень] → 48 кандидатов могут остаться; это корректное ограничение, а не разрешение массового удаления или утверждение «всё очищено».
- [Транзитивный импорт] → exact module/version проверить по lock; при недоступности текст/CSS без install. Прямую dependency promotion согласовывать отдельно.
- [Неузнаваемая цепочка для VK] → видимая подпись VK и сохранённое accessible имя, не копировать брендовый SVG.
- [Остальные неподтверждённые материалы остаются] → широкий аудит доступен владельцу, но его рекомендации не исполняются без отдельного scope approval.
- [Старые копии/кеши] → пользователь отдельно управляет release/purge; локальный delete не доказывает удаление из production.

## Migration Plan

Новое approval → SC-1 → browser → единый QG/отчёт → lifecycle Router по штатному approval workflow. Нет миграций БД. Не восстанавливать четыре спорных ICO автоматическим rollback: безопасный вариант — текст. Другие ошибочно удалённые доказанные assets восстанавливать предметно с review, не массовым reset чужого diff. Deployment/purge сейчас не выполнять.

## Open Questions

- Есть ли разрешённый read-only live URL/полный обезличенный CMS export и перечень внешних consumers локальных assets? Без них кандидаты uncertain сохраняются; архитектура и unit не меняются.
- Какой конкретный материал/документ исходной претензии? Не блокирует выбранную очистку, но юридическое урегулирование остаётся вне результата.

**Стоп на approval gate:** apply-ready статус означает полноту плана, не разрешение реализации. PLAN-2 продуктовый код/изображения не меняет.
