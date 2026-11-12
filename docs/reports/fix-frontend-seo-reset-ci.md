# Review: fix-frontend-seo-reset-ci

**Профиль:** QG-LITE · **Вердикт:** APPROVED  
**Дата:** 2026-11-11 · **Unit:** QG-FIX-1

## Контекст и границы

Независимый gate bounded CI bugfix после FE-FIX-1. OpenSpec change, specs и task IDs не назначены; контракт проверки — переданное задание Router. Новая функциональность отсутствует.

Изменён только `services/frontend/src/features/seo/ui/SeoPage.test.tsx`: тест получает локальный класс `styles.pagesReset` через `useSeoStyles`, проверяет его присутствие на кнопке и ограничивает поиск CSS правил удвоенным selector этого класса (`&&:not(:disabled)`). Общие классы AntD больше не выбирают чужое правило.

Production UI, стили, helpers/config, API и права не изменены. Чужие корневые изменения не читались и не изменялись. Коммиты/push не выполнялись. Текущая ветка frontend — `release`; требование создавать ветку не назначено.

## Lanes

| Lane | Статус |
|---|---|
| QG-ENV | Неприменимо — runtime и внешняя инфраструктура не нужны; repair attempts: 0 |
| QG-BE | Неприменимо — нет Python/backend diff |
| QG-FE-AUTO | Пройден — независимые exact reproducer и полный suite |
| QG-CONTRACTS | Пройден — test-only scope подтверждён; API/Makefile/межсервисные контракты не менялись |
| QG-FORMAT | Пройден — scoped canonical ESLint и diff check |
| QG-FE-MANUAL | Неприменимо — нет UI/UX behavior diff |
| QG-LIVE | Неприменимо — нет runtime API diff |
| QG-SYNTH | APPROVED — blocking/minor findings отсутствуют |

## Frontend test gate

| Проверка | Результат | Evidence |
|---|---|---|
| `npm test -- src/features/seo/ui/SeoPage.test.tsx` | Независимо: 29 passed | `.qa/fix-frontend-seo-reset-ci/QG-LITE/exact.log` |
| `make test` | Независимо: 107 файлов, 1627 passed; 55,67 с | `.qa/fix-frontend-seo-reset-ci/QG-LITE/full-suite.log` |
| `./node_modules/.bin/eslint src/features/seo/ui/SeoPage.test.tsx` | Независимо: PASS; canonical non-mutating scoped lint/layout check | `.qa/fix-frontend-seo-reset-ci/QG-LITE/scoped-lint.log` |
| `git diff --check -- src/features/seo/ui/SeoPage.test.tsx` | Независимо: PASS | `.qa/fix-frontend-seo-reset-ci/QG-LITE/diff-check.log` |
| `make lint` | Evidence владельца: PASS, включает ESLint и typecheck | `.qa/fix-frontend-seo-reset-ci/FE-FIX-1/lint.log` |
| `npm run build` | Evidence владельца: PASS | `.qa/fix-frontend-seo-reset-ci/FE-FIX-1/build.log` |
| `npm test -- src/features/seo/ui/SeoDataTable.test.tsx` | Evidence владельца: 25 passed; также входит в независимый полный suite | `.qa/fix-frontend-seo-reset-ci/FE-FIX-1/related.log` |

Aliases: `make test` → `npm test` → `vitest run`; отдельный эквивалентный полный npm-прогон не выполнялся. `make format` использует ESLint с layout fixes; QG запускал ESLint без mutation. Отдельный tsc и повторные lint/build не нужны для test-only fix: использованы проверенные evidence владельца на совпадающем fingerprint. Независимый full suite выполнен один раз по QG policy, последовательно без параллельного typecheck/build.

### Test quality / exact reproducer

- Исходный FAIL подтверждён логом владельца `FE-FIX-1/reproducer-before.log`: MANUAL-01 получал `rgb(9, 88, 217)` вместо `rgb(130, 0, 20)`; 1 failed, 28 passed. Производственный код для искусственного FAIL не менялся.
- Независимо повторена та же команда и сценарий `/seo → Страницы`, кнопка `Сбросить`; 29 passed. Результат: `.qa/fix-frontend-seo-reset-ci/QG-LITE/reproducer-after.json`.
- Selector соответствует `pagesReset` в `seoStyles.ts` и className кнопки в `SeoPage.tsx`. Дополнительная `toHaveClass` связывает извлечённые CSS правила с реальной кнопкой.
- Сохранены все assertions: normal color/background; наличие правил hover/focus-visible/active; точные цвета и белый фон состояний; отсутствие локального outline override. Ожидания не ослаблены, skip/mock утверждений не добавлены.
- Отсутствие outline override проверяет сохранение прежнего CSS контракта, а не заменяет браузерную проверку видимости фокуса. Browser/self-check здесь неприменимы: продуктовый UI не изменён.
- Аналогичный R1 в `SeoDataTable.test.tsx` уже ограничивает правила локальным классом панели и не требует изменения.

## Трассировка и fingerprints

Конечный registry: `.qa/fix-frontend-seo-reset-ci/QG-LITE/registry.json`; все четыре сценария passed, gaps отсутствуют. Единственный независимый evidence owner — QG-LITE.

| Scenario | Риск / покрытие |
|---|---|
| MANUAL-01 | Точный scoped Reset selector и сохранённые palette/focus assertions |
| REGRESSION-01 | Полный независимый frontend suite, включая связанные SEO тесты |
| STATIC-01 | Scoped canonical ESLint/layout |
| STATIC-02 | Whitespace diff |

Ledger с командами, aliases, временем, options и environment identity: `.qa/fix-frontend-seo-reset-ci/QG-LITE/ledger.jsonl`. Revision frontend: `833d732ee8cbb568986aebacdfe0896b66c512e1` + текущий незакоммиченный test diff.

- SHA256 `SeoPage.test.tsx`: `30625639b2a962fae8fef757fe81babe4269a8a07c5b162319bf8f1da3386849` — совпадает с post-fix evidence владельца и не изменился после QG.
- SHA256 lockfile: `da568ba6c456efacc359de21babfff3234a6cb2adace40497dfe2161af4e475b`; Node `v24.22.1`, npm `11.19.1`, Vitest/jsdom.
- Baseline status/diff сохранены в `.qa/fix-frontend-seo-reset-ci/QG-LITE/`. QG не менял файлы frontend.

## Access verification results / SMOKE

Неприменимо: endpoints, anonymous/authenticated поведение и права не менялись. Live/browser/E2E и endpoint timings не требуются.

## Замечания и риски

Новых findings нет. Первый полный прогон владельца был недействителен из-за временных копий typecheck; его последовательный повтор успешен, причина и previousRunId отражены в owner ledger. Независимый QG suite успешен с первой попытки. Исправления окружения, дополнительные задачи и waivers не требуются.
