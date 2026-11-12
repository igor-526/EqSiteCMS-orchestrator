# Приёмка: site-ad-copyright-risk-remediation

**Профиль:** QG-LITE · **Дата:** 2026-11-12  
**Статус автоматической/статической части:** PASS, продуктовых blocking findings нет.  
**Итоговый вердикт: APPROVED_WITH_WAIVER** — согласованный узкий diff принят последним агентом QG-FE-MANUAL. PR-06 выполнен независимо; прежний ENV-01 устранён Router. SC-1.8 (отдельная owner browser verification) — waived by user: пользователь ответил «да» на предложение синхронизировать спецификации и архивировать с этой оговоркой. Независимая браузерная приёмка пройдена, owner task остаётся открытой как фактически невыполненная. Это не одобрение остального контента/внешних сервисов.

## Контекст и ссылки

Проверен только согласованный узкий diff `services/site-ad`: четыре home ICO, замена inline VK/Email, контактные подписи, notices и не удаляющий файлы checker. Это не полная очистка авторских рисков и не юридическая гарантия.

- [Proposal](../../openspec/changes/archive/2026-11-12-site-ad-copyright-risk-remediation/proposal.md), [design / test matrix](../../openspec/changes/archive/2026-11-12-site-ad-copyright-risk-remediation/design.md#test-matrix), [tasks](../../openspec/changes/archive/2026-11-12-site-ad-copyright-risk-remediation/tasks.md).
- [Delta spec](../../openspec/changes/archive/2026-11-12-site-ad-copyright-risk-remediation/specs/site-ad-content-provenance/spec.md), [реестр PLAN-2 / SC-1](../../openspec/changes/archive/2026-11-12-site-ad-copyright-risk-remediation/material-register.md#plan-2), [задача 114](../tasks/114_site_ad_copyright_risks.md).
- Approval узкого scope подтверждён Router; waiver проверок отсутствует. Порядок этого gate: QG-LITE → отдельный QG-FE-MANUAL; старый обратный DAG не применяется.
- Текущая ветка сервиса `main`; специальная ветка design не задана. HEAD сервиса `7fee98c981a76304cce115c2236270b529a6cc72`, root HEAD `b051a04732d18511bc0e6c8ea52b9019a3331b26`; проверено dirty-состояние, не чистый HEAD.

## Lanes

| Lane | Результат |
|---|---|
| QG-ENV | пройден — Router `ready site-ad --no-migrate`: rebuilt/running/HTTP 200; агент независимо подтвердил identity и assets |
| QG-BE | неприменимо — Python/backend diff отсутствует |
| QG-FE-AUTO | пройден — полный unit suite, build с type validation, scoped ESLint |
| QG-CONTRACTS | пройден — scope/specs, notices, deletion/SHA, сохранение uncertain; полнота CMS/external явно unchecked |
| QG-LIVE / API SMOKE | неприменимо — endpoints/access не меняются |
| QG-FORMAT | scoped ESLint и diff-check пройдены; formatter неприменим: нет canonical config/Makefile, второй formatter не вводился |
| QG-FE-MANUAL | пройден — 8/8 scoped сценариев, desktop/mobile, 11 скриншотов просмотрены; внешние/baseline observations отдельно |
| QG-SYNTH | APPROVED — QG.4 закрыта последним агентом, waiver не требуется |

## Независимая verification

Все evidence находятся в `.qa/site-ad-copyright-risk-remediation/QG/` (далее `E/`). Owner evidence не заменяло независимые прогоны.

| Effective command | Результат / evidence |
|---|---|
| `npm test` | PASS: 13 файлов / 46 tests; `E/PR-05-tests.log` |
| `npm run build` | PASS: Next 15.5.9, type validation, генерация 17 страниц; `E/PR-05-build.log` |
| `./node_modules/.bin/eslint <изменённые TS/TSX/MJS>` | PASS, 0 warnings/errors; точные пути в ledger, `E/PR-05-lint.log` |
| `node --test scripts/verify-image-cleanup.test.mjs` | PASS: 20 tests; `E/PR-04-tests.log` |
| `node scripts/verify-image-cleanup.mjs --manifest ../../.qa/site-ad-copyright-risk-remediation/SC-1/deletion-manifest.json` | PASS: 110 записей, 0 ошибок; `E/PR-04-manifest.log` |
| OpenSpec CLI `status --change … --json` и `validate … --type change --strict` | PASS; точный CLI `/srv/eqSiteCMS/.cache/openspec-tool/1.14.3/node_modules/@fission-ai/openspec/bin/openspec.js`, `E/QG-V-{status,validate}.log` |
| Service scoped `git diff --check` | PASS; `E/QG-V-service-diff.log` |
| Независимая сверка public с git HEAD и manifest | PASS: 110 исходных файлов, 106 неизменных SHA, только 4 согласованных удаления; `E/assets-independent.json` |
| Лицензии и статическое ревью | PASS; `E/license-independent.json`, `E/static-review.json` |

`npm test` = `vitest run --project unit`, alias не повторялся. `npm run lint` (`next lint` с Next 15) заменён согласованным scoped native ESLint, без изменения toolchain. Отдельный tsc не запускался: type validation включена в build. Dedicated Playwright route suite в сервисе отсутствует; Storybook browser project не является PR-06 и не подменяет его.

Ledger: `E/verification-ledger.json`; конечный registry с одним evidenceOwner на свойство: `E/scenario-registry.json`. Fingerprint и options: `E/baseline.json`, SHA256 `69b2a8ce995ecf05c81644dcb139d41c834a0f2b857d93600d9513a7b694473d`; Node v24.22.1, npm 11.19.1, Linux WSL2. Команды выполнены один раз на этом diff. Изменение кода, fixtures, lock/config либо runtime identity инвалидирует соответствующее evidence; full suites без причины не повторять.

## Покрытие test matrix

| ID / owner | Подтверждение |
|---|---|
| PR-01 / QG | homePageDataService + QuickServices tests: прежние тексты/порядок/href, отсутствие icon и пустых обёрток, rides optional icons сохранены; rides source/assets неизменны |
| PR-02 / QG | Icon/ContactsBlock/Footer/MobileMenu tests: VK/Email, имена/href, размер/currentColor/aria, DOM focus, phone, no-settings и socials без type; браузерная геометрия/keyboard остаются PR-06 |
| PR-03 / QG | Точечные LinkOutlined/MailOutlined, icons 5.6.1 / icons-svg 4.4.2 MIT, полный notice и Footer link; fixture недоступных exports. npm metadata и LICENSE точного gitHead получены независимо, совпали с notice/локальным LICENSE |
| PR-04 / QG | 20 node tests включая CSS, encoded/import/concat/template, dynamic без URL, favicon, fallback/archive/story, unknown CMS/external; checker не удаляет файлы. Manifest SHA сверены с git HEAD, не только owner baseline |
| PR-05 / QG | Полный unit/build и scoped ESLint; четыре точных home-комментария и два коротких vk/mail, старые paths удалены; другие Icon branches и public props побайтно равны HEAD |
| PR-06 / QG-FE-MANUAL | PASS: `/`, `/contacts`, `/services/rides` × 2 viewport + 2 synthetic no-settings; Footer, открытый MobileMenu, DOM/network/focus/geometry/axe и визуальная инспекция; `B/report.json` |
| PR-07 / QG | Ограниченный retain-контракт PASS: все 48 uncertain сохранены, дополнительных удалений 0. Полнота CMS/export/external **unchecked** — разрешённого полного снимка нет |

Standalone `vk.svg`/`mail.svg` сохранены отдельно от замены inline; phone/telegram/whatsapp, фото, logo, оба favicon, fallback и rides ICO не изменены. API, settings wrappers, package/lock и остальной отслеживаемый контент вне назначенных пяти runtime-файлов не менялись. Fallback fixture проверяет недоступный export, не доказывает сборку при физическом отсутствии static module: в таком случае design требует текстовой замены владельцем без установки пакета.

## Access verification results

API matrix без изменений: только существующий Public Read consumer, новых endpoints/exceptions нет. Anonymous/authenticated API smoke неприменим; API/client/settings неизменны, существующие client/callback tests прошли в полном suite. Live POST, формы, CMS writes, auth, deploy/CDN purge и DB/NATS setup/teardown не выполнялись. PR-06 подтвердил anonymous HTTP 200 трёх страниц, обоих favicon и notice; notice побайтно совпал с локальным. Активация VK проверялась Enter с отменой внешнего перехода; внешние страницы/mail client не открывались.

## Независимый browser gate — QG-FE-MANUAL

`B/` = `.qa/site-ad-copyright-risk-remediation/QG-FE-MANUAL/`. Команда: `source scripts/qa/browser-env.sh && node .qa/site-ad-copyright-risk-remediation/QG-FE-MANUAL/browser.mjs`.

- **Runtime до сценариев:** `http://localhost:5100`, контейнер `ad-site`, project `eqsitecms-site-ad`, running, HTTP 200, без bind mounts. Immutable container ID `51087efc3d5efb1542110b2d7fe42044f1964e962e7f1294e159c9e8fa52f953`, image `sha256:557a9e2c7a4d0760390fa3de3f05cd58a6fe9636f4855e4e395a503df2589ae6`; `B/identity.json`. Связь с diff: Router rebuild evidence `.qa/site-ad-copyright-risk-remediation/runtime-ready.{json,log}`, прежний code fingerprint повторно совпал, все **107** runtime public-файлов (106 сохранённых + notice) совпали SHA с workspace, четыре ICO отсутствуют (`B/runtime-assets.json`). Код после статического QG не менялся; suites не повторялись.
- `stackctl status --json` не перечислил site-ad, поэтому применена read-only проверка `docker inspect` + HTTP + targeted public SHA; инструмент не исправлялся. Repair/rebuild агента: **0**, Router выполнил штатный ready без миграций. Старый handoff ENV-01 сохранён как история; `E/browser-handoff.json` обновлён текущим результатом.
- **Registry/evidence:** `B/scenarios.json`, `B/report.json`, `B/verification-ledger.json`, `B/visual-review.json`; единый owner PR-06 — QG-FE-MANUAL, ссылка добавлена в E/ledger и registry. Прогон 08:48:36–08:49:16 UTC, **8/8**, около 40 секунд. Custom scoped Playwright нужен для точного mobile **390×844** (canonical runner выбирает Pixel 5) и read-only response fixture; desktop **1366×768**. CMS не проверялся.
- **Настоящий runtime/backend:** шесть сценариев — `/`, `/contacts`, `/services/rides` в обоих размерах. Реальные SSR settings уже содержат phone/VK/email, positive social fixture не понадобился. Подтверждены исходные четыре названия/описания/порядок/href, отсутствие рисунков и пустых кругов; tour/individual/group/sport ICO и rides href сохранены. Footer проверен на всех трёх маршрутах, открытый MobileMenu — на mobile главной.
- **Синтетика отдельно:** два no-settings сценария используют исходные ContactsBlock/Footer/MobileMenu, собранные в `B/fixture.js` из `B/fixture.tsx`, выдаваемые scoped Playwright route response без CMS mutations. Проверено отсутствие phone/social ссылок, пустой baseline и notice. Это browser component fixture, **не** реальный пустой backend. Loading/error/permission transitions неприменимы к этому diff: SSR/settings/API не менялись, запись не проверяется.
- **Доступность/геометрия:** VK — LinkOutlined и видимая «VK», Email — MailOutlined; href/доступные имена/phone сохранены. Реальные Tab → Shift+Tab → Enter, focus-visible outline, размеры 40/48 px и containment SVG подтверждены. Внешняя активация перехвачена без перехода; submit/callback не выполнялись. Axe critical/serious на изменённых ссылках и no-settings fixture — **0**; это не full-site a11y PASS.
- **Медиа/сеть:** запросов четырёх удалённых ICO нет; HTTP 404/5xx и broken img на проверенных маршрутах — **0**. Lazy media прокручены, фото/фон/logo/favicon и оставшиеся иконки не повреждены; дополнительно runtime public SHA совпали. Нет page errors и JS-регрессий изменённых поверхностей. Console/requestfailed не пустые: все наблюдения оставлены в report и классифицированы ниже, «чистая консоль всего сайта» не заявляется.
- **Визуально просмотрено 11 безопасных fragment screenshots через read_image:** `B/PR-06-home-{desktop,mobile}-{cards,footer}.png`, `B/PR-06-contacts-{desktop,mobile}-contacts.png`, `B/PR-06-rides-{desktop,mobile}-cards.png`, `B/PR-06-mobile-menu-focus.png`, `B/PR-06-empty-{desktop,mobile}.png`. Карточки текстовые и читаемые, контактные glyphs/подписи/focus не обрезаны, наложений/горизонтального overflow нет. SHA и отдельный результат каждого изображения — `B/visual-review.json`. Снимки только проверенных public/synthetic fragments; fullPage/auth/private CMS/raw traces не записывались.
- **Один targeted recheck:** первый harness ошибочно считал декоративную полоску `.rounded-full` пустым icon circle; fixture Next требовал process shim; намеренно заблокированные внешние telemetry POST ошибочно считались product writes. Уточнены только ignored QA-сценарии, продукт не менялся. Начальные FAIL сохранены в `B/initial/`, причина/previousRunId — ledger. Это **не** продуктовый FAIL→PASS. Повторного full-service suite не было.
- **MCP:** exploratory navigation недоступна из-за отсутствующего `/opt/google/chrome/chrome`; scripted Chromium из browser-env работает, установка/починка не требовалась. Это не gap PR-06: обязательные сценарии и инспекция выполнены автоматически агентом.

## Изменённые пути change

Продуктовые пути перечислены для будущего shipctl plan, но этот gate их не редактировал:

- `services/site-ad/src/features/home/services/homePageDataService.tsx` и `homePageDataService.test.tsx` в том же каталоге.
- `services/site-ad/src/ui/atoms/Icon.tsx`, `Icon.test.tsx`.
- `services/site-ad/src/ui/navigation/Footer.tsx`, `Footer.test.tsx`, `MobileMenu.tsx`, `MobileMenu.test.tsx`.
- `services/site-ad/src/ui/sections/ContactsBlock.tsx`, `ContactsBlock.test.tsx`.
- `services/site-ad/src/ui/quick-services/QuickServices.test.tsx`.
- `services/site-ad/scripts/verify-image-cleanup.mjs`, `verify-image-cleanup.test.mjs`.
- `services/site-ad/public/third-party-notices.txt`; удаления `services/site-ad/public/icons/{ridding,farm,rent,sale}.ico`.
- Артефакты change: `openspec/changes/site-ad-copyright-risk-remediation/**` (реестр/specs/tasks); единственный отчёт `docs/reports/site-ad-copyright-risk-remediation.md`.

Агенты gate изменили только единый отчёт, фактические checkbox в tasks и ignored evidence в E/B; продукт не редактировали. Посторонний root diff зафиксирован в `E/root-status.txt` и исключён из gate/ship scope.

## Findings / ограничения

- **ENV-01 resolved:** Router штатно подготовил site-ad; последний агент подтвердил актуальность и закрыл PR-06. Не осталось blocking findings по diff.
- **unchecked COV-01:** нет полного разрешённого CMS/export/external inventory; все uncertain сохранены. Не blocker узкого согласованного удаления, не глобальный PASS прав/полноты.
- **Pre-existing, информационно:** зелёный `global-error.test.ts` выдаёт HTML nesting warning тестового `<html>` внутри RTL `<div>`. Тест/его импорты не затронуты change; не блокирует. При необходимости отдельная задача `docs/tasks`: test harness global-error, не править здесь. Общая runtime-проверка монорепозитория не проводилась.
- **Вне scope / environment:** Yandex map TLS `ERR_CERT_AUTHORITY_INVALID`, отмены tile-запросов и ошибки намеренно запрещённых внешних telemetry POST. `B/network-classification.json`; standalone iframe без изменённых компонентов воспроизводит внешние failures (`B/baseline-diagnostics.{mjs,json}`). Карта/аналитика исходно неизменны, их vendor availability не принимается этим change. Локальные requestfailed — Next prefetch `ERR_ABORTED`, не ошибки документов/медиа; проверено по типу запроса и безопасному prefetch-флагу. Не blocker узкого diff, не waiver и не скрытый PASS карты.
- **Pre-existing a11y / contacts:** у трёх элементов прежнего расписания axe `color-contrast: serious`. Независимо воспроизведено на исходных `git HEAD` ContactsBlock/Icon, собранных в памяти без изменения продукта (`B/baseline-diagnostics.json`); изменённые VK/Email links нарушений не имеют. Предложение отдельной задачи `docs/tasks`: контраст расписания ContactsBlock. Этот gate старую проблему не чинит и не блокирует.
- **Waivers:** нет.

## Итог и остаток

После отметок tasks выполнены OpenSpec status/strict validate — PASS (`B/final-{status,validate}.log`), scoped diff-check и сверка closure/fingerprint/screenshots — PASS (`B/closure.json`).

QG.1–4/V и QG-FE-MANUAL.1–4/V фактически выполнены; **APPROVED** относится только к согласованному точечному изменению. Owner SC-1.8 **остаётся неотмеченной**: его собственный browser self-check не состоялся; независимое покрытие последнего gate не записано задним числом как owner PASS. Все 48 uncertain сохранены; полнота CMS/внешних consumers и юридическое урегулирование не подтверждены. Production/deploy/CDN purge не выполнялись. Sync/strict validate/archive/release — дальнейший workflow Router по соответствующим approval gates.
