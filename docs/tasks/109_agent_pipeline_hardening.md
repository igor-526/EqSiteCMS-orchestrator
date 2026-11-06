# 109 — Проверяемый и измеримый агентный пайплайн

## Исходный запрос
После анализа восьми архивов агентных сессий пользователь поручил: «Давай дорабатывать всё описанное». Основной вход — [полный анализ](../../.qa/pipeline-analysis/analysis.md), 8 архивов / 162 журнала субагентов. Это запрос на все рекомендации, а не только на переписывание промптов. Анализ не требуется повторять; `data.json` читается только точечно при необходимости.

## Требуемый результат
Подготовить русскоязычный apply-ready OpenSpec change, затем остановиться для одобрения пользователя. OpenSpec — единственный изменяемый план; `docs/plans` не создавать. Реализация после отдельного approval должна дать:

1. Exact-reproducer-first: исходный FAIL → исправление → PASS тем же сценарием и в эквивалентной среде; явно показывать отсутствующее evidence.
2. Scoped Chromium self-check Frontend до QG: 1366×768, contrast/keyboard/focus/scroll/nested modal по изменённым механизмам, без второго полного browser gate.
3. Парные HTTP/NATS проверки production serializer → production consumer, invalid envelope до storage, real-PG rollback/recovery, совместимая и несовместимая existing topology.
4. Prerequisites и матрицу риск → unit → scenario → evidence; разделение внешнего OAuth gap и исправимого tooling blocker.
5. Единую verification policy unit / последний unit сервиса / QG / fix; связанные tests/fixtures/wiring/inventories в ownership; ограничение искусственного дробления, без отмены circuit breaker.
6. Отсутствие циклов rework только ради whitespace, согласованную formatter policy.
7. Постоянные browser/PG/NATS helpers и необходимые, ограниченные расширения stackctl, с тестами, а не одноразовые QG harness.
8. Дедупликацию QG с одним владельцем доказательства, конечные scenario IDs, prerequisites, бюджеты и stop conditions без ослабления независимого review.
9. Измерение запусков/продолжений/partial-причин/first-pass/fix FAIL→PASS/reopen/usage/time/full-suite repeats; кэш не приравнивать к цене или квоте, неизвестные данные не выдумывать. Проценты экономии — только после сопоставимых замеров.

## Границы и безопасность
Fine-tuning, исправление продуктовых функций 106–107, изменение endpoint/auth/ролей, production destructive, глобальная конфигурация и повторный анализ session logs не входят. Public Read/Protected Write и существующие исключения сохраняются. Метрики и evidence не должны сохранять секреты, raw prompts, credentials, env или OAuth payload. Destructive setup/teardown тестов допустим только на явно изолированных ресурсах после отдельного разрешения пользователя до фактического запуска; approval proposal не заменяет его.

Чужой baseline: две Compose-правки SEO/Метрики; восемь main specs из задания Router; untracked отчёт и архив 106–107 и `openspec/specs/metrica-maintenance-protocol/`. Не изменять, не stash/restore/commit. Планирование меняет только этот вход и новый change; заметки/логи — `.qa/<change>/`, итоговый QG позже — один `docs/reports/<change>.md`.

## Приёмка планирования
- Все рекомендации анализа трассируются на deliverables/tasks либо имеют обоснование неприменимости.
- Непересекающийся ownership, bounded execution units (~5–12 существенных действий), DAG, точечные contextFiles, одна verification group на unit; связанные tests/fixtures не вынесены в искусственные checkpoint-units.
- Конкретные исполняемые контракты CLI/helpers, негативные сценарии и безопасная изоляция; достаточное переиспользование фактических инструментов.
- Успешные `openspec status --change harden-agent-verification-pipeline --json` и `openspec validate harden-agent-verification-pipeline --type change --strict`; runtime/product suites на планировании не запускать.
- Реализация не начинается без одобрения артефактов пользователем.
