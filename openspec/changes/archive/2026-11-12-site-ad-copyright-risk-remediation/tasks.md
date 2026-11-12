# Tasks — site-ad-copyright-risk-remediation

PLAN-2 полностью заменяет неутверждённый широкий checklist PLAN-1. Реализация не начата; выполнять только после **нового approval**. Ownership — deliverable A (Site Consumer), независимые evidence/report — B (Quality Gate); DAG, test matrix и prerequisites — [design.md](design.md#test-matrix). Отмечать только фактически выполненные IDs, планирование не закрывает runtime tasks.

## Execution units

`C/` — текущий change, `S/` — services/site-ad. Точная closure [design.md](design.md#deliverables-и-ownership). API/package/lock и чужой diff read-only. Каждый исполнитель читает только свой context pack и назначенные исходники.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|---|
| SC-1 | Site Consumer | A | home data; Icon; ContactsBlock/Footer/MobileMenu; colocated tests + QuickServices test; четыре public ICO, только доказанные кандидаты реестра; public notice; cleanup checker/tests; C/material-register.md | новое approval | PR-01..05, final-service + owner browser | `C/design.md`, `C/specs/site-ad-content-provenance/spec.md`, `C/material-register.md#plan-2`, `S/src/features/home/services/homePageDataService.tsx`, `S/src/ui/atoms/Icon.tsx`, `S/src/ui/sections/ContactsBlock.tsx`, `S/src/ui/navigation/{Footer,MobileMenu}.tsx`, `S/package.json`, выбранные lock records |
| QG-FE-MANUAL | Quality Gate | B | `.qa/site-ad-copyright-risk-remediation/QG-FE-MANUAL/**` | SC-1 | PR-06 scripted/visual | `C/design.md#test-matrix`, delta spec PR-06, handoff SC-1 |
| QG | Quality Gate | B | `.qa/site-ad-copyright-risk-remediation/QG/**`, единственный `docs/reports/site-ad-copyright-risk-remediation.md` | QG-FE-MANUAL | PR-01..05,07 независимо, QG-LITE | `C/design.md#test-matrix`, `C/material-register.md#plan-2`, delta spec, handoffs SC-1/QG-FE-MANUAL |

## 1. SC-1 — точечная очистка графики и регрессия (профиль: Site Consumer)

**Specs:** `site-ad-content-provenance` · **Пути:** closure A design · **Зависит от:** новое approval. Один final-service unit, ~9 действий, не полный copyright redesign.

- [x] SC-1.1 Повторить usage scan кандидатов реестра: прямые/CSS/динамические пути, loader, metadata/favicon/file conventions, fallback, архивы, stories/tests/config/docs; сохранить SHA/refs и результаты CMS/внешней сверки или явный uncertain в реестре (PR-04,07). Зафиксировать before DOM/network на разрешённом target либо blocked reason.
- [x] SC-1.2 Отключить четыре icon-обращения только homePageDataService, оставив четыре коротких комментария по design; удалить неиспользуемый import. PR-01 тестирует исходные тексты/порядок/href, отсутствие icon wrapper и сохранение rides ICO.
- [x] SC-1.3 Заменить только vk/mail ветви Icon точечными установленными LinkOutlined/MailOutlined, без новых packages; сохранить props/aria, удалить исходные paths, оставить два коротких комментария. PR-02/03 проверяют модули/версии/лицензию и fallback text/CSS при их недоступности.
- [x] SC-1.4 Минимально адаптировать ContactsBlock/Footer/MobileMenu к небрендовому VK с видимой подписью и Email-конверту, не меняя href/phone/остальные socials/условия. Colocated PR-02 tests покрывают обе social types, focus/names/размеры и no-settings baseline.
- [x] SC-1.5 Добавить public/third-party-notices.txt с полным MIT двух пакетов, точными версиями/источниками и ссылку Footer; PR-03 проверяет совпадение полного notice с подтверждённым LICENSE, без придуманной brand-атрибуции.
- [x] SC-1.6 После проверки resolved absolute paths удалить четыре целевых home ICO; из 48 дополнительных кандидатов удалить только имеющие доказанное delete-решение. Standalone vk/mail и прочие public SVG оценить отдельно от inline; сохранить неизвестные. PR-04/реестр фиксируют финальные пути/SHA/основания/остаток; никаких массовых glob-delete или удаления используемых rides/фото/favicon.
- [x] SC-1.7 Создать не удаляющий файлы scripts/verify-image-cleanup.mjs + node tests: deletion manifest, активные ссылки и negative CSS/dynamic/favicon/fallback/archive/CMS-unknown fixtures, только четыре точечных comment exceptions. Выполнить PR-04 node test/checker без runtime-политики допуска всего контента.
- [ ] SC-1.8 Выполнить owner scoped browser PR-06 на согласованном target: главная/контакты/контактные места/rides, desktop/mobile DOM/network/screenshots; нет target — явно blocked, не отправлять callback/CMS writes.
  - SC-1: **blocked** — разрешённый dev URL/target и runtime fixtures не предоставлены; before/after browser не выполнялся. Evidence: `.qa/site-ad-copyright-risk-remediation/SC-1/browser-status.json`.
- [x] SC-1.V Выполнить одну final-service группу PR-01..05: npm test, npm run build, scoped native ESLint + node checker/test по design без alias-дублей; formatter N/A при отсутствии canonical config. Baseline blockers не чинить скрыто. Обновить фактические решения реестра, сохранить evidence/ledger, отметить выполненные IDs и вернуть Router handoff; превышение бюджета → atomic partial и bounded split.

## 2. QG-FE-MANUAL — независимая браузерная приёмка (профиль: Quality Gate)

**Specs:** `site-ad-content-provenance` · **Пути:** только evidence QG-FE-MANUAL · **Зависит от:** SC-1.

- [x] QG-FE-MANUAL.1 Загрузить ui-qa/browser protocol, проверить разрешённый URL/fixtures/Chromium; записать target identity, revision и конечные PR-06 scenarios, без CMS auth/submit.
- [x] QG-FE-MANUAL.2 Создать и выполнить scripted PR-06 на desktop 1366×768 и mobile 390×844 для `/`, `/contacts`, Footer/MobileMenu, `/services/rides`; DOM/network доказывают сохранение href/labels, отсутствие четырёх ICO и сломанных media requests.
- [x] QG-FE-MANUAL.3 Просмотреть screenshots текстовых карточек, VK-подписи/Email, focus/геометрию/читаемость; findings привязать к route/scenario, продукт не менять.
- [x] QG-FE-MANUAL.4 Сверить сохранение прочих иконок/фото/фона/favicon и rides, зафиксировать blocked при недоступности route/target; не объявлять static/unit evidence реальным browser PASS.
- [x] QG-FE-MANUAL.V Передать Router и будущему QG ledger/screenshots/findings; максимум один targeted recheck, без отдельного отчёта docs/reports и без продуктовых исправлений.

## 3. QG — единая независимая приёмка (профиль: Quality Gate)

**Specs:** `site-ad-content-provenance` · **Пути:** evidence QG и один итоговый отчёт · **Зависит от:** QG-FE-MANUAL.

- [x] QG.1 Независимо сверить PR-01..04,07: границы scope/ownership, короткие комментарии, точные модули/версии/полный MIT notice, отдельные inline/standalone решения; API/package/lock и остальной контент без изменений.
- [x] QG.2 Проверить deletion manifest/SHA/evidence каждого дополнительного удаления, CMS/внешнюю полноту только на разрешённом read-only снимке; неизвестное должно сохраняться. Отсутствие снимка означает unchecked coverage, а не разрешение массового удаления и не заявление полной очистки.
- [x] QG.3 Независимо выполнить PR-05 full-service группу и PR-04 checker по design один раз на актуальной revision; записать реальные blockers/invalidation, не повторять aliases и не менять toolchain.
- [x] QG.4 Синтезировать browser handoff и статические результаты в единственном docs/reports/site-ad-copyright-risk-remediation.md; findings вернуть Site Consumer, ограничения/waiver явные, юридическую гарантию не заявлять.
- [x] QG.V Выполнить точные node CLI status/strict validate из design, проверить ссылки/посторонний diff, отметить фактически выполненные IDs и вернуть итоговый handoff. Без apply/archive/deploy.

## Workflow follow-up

- После общего QG Router синхронизирует только capability site-ad-content-provenance, повторяет strict validate, согласует archive по штатному workflow; не отдельная checkpoint-сессия.
- Деплой, CDN purge, CMS mutations и юридическое урегулирование не разрешены scope approval. Неиспользованные широкие рекомендации audit.md требуют отдельного согласования.
