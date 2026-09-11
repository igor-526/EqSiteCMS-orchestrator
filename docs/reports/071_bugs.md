# Development Report: 071 — исправления сайта INLOVE

**Статус:** `APPROVED`  
**Дата:** `2026-09-11`  
**OpenSpec change:** `fix-071-inlove-site-bugs`

## Итоговый вердикт

`APPROVED`. Все применимые Quality Gate lanes завершены без остаточных findings. Ранее выявленные проблемы ownership, composed-comment limit, desktop dropdown и browser lifecycle callback устранены; затронутые `QG-FE` и `QG-CONTRACTS` повторно пройдены. Test matrix, access matrix, OpenSpec tasks и атрибутированный diff согласованы.

Вердикт относится только к change 071. Архивированный change 069, параллельные изменения корневой документации и прочие несвязанные изменения worktree не проверялись и в verdict не включены.

## Сводка lanes

| Lane | Статус | Evidence |
|---|---|---|
| `QG-BE` | неприменимо | В change 071 отсутствует атрибутируемый backend/runtime/schema diff; backend worktree чистый |
| `QG-FE` | пройден после rework | 232 tests PASS; `npm run lint`, `npx tsc --noEmit`, `npm run build` и production deployment harness PASS; `BQA-71-01..08` PASS; findings отсутствуют |
| `QG-CONTRACTS` | пройден после rework | Ownership, bounded units, checkbox/handoff evidence и access matrix согласованы; `openspec validate fix-071-inlove-site-bugs --strict` PASS; findings отсутствуют |
| `QG-LIVE` | пройден | `LIVE-API-01..06` PASS на production image с digest prefix `759…`; sanitized access evidence сохранена, временные данные/окружение очищены |

## Трассировка test matrix

| IDs | Фактическое покрытие | Результат |
|---|---|---|
| `UT-API-01..04` | API client/config tests: trim, exact selector, credentials omit, invalid config без fetch/default fallback, сохранение `401` | PASS |
| `UT-DEP-01..03` | release-input harness, production artifact и secret/config scans | PASS |
| `UT-NAV-01..04` | pointer boundary, opaque dropdown, keyboard/Escape/focus и mobile/short-height geometry | PASS |
| `UT-HOME-01..03` | SSR heading/four links, responsive density и неизменные href/content | PASS |
| `UT-CB71-01..06` | exact/composed limits, optional normalization, consent/pending guard и `201/401/422/5xx` mapping | PASS |
| `BQA-71-01..08` | 320/768/1024/1440, short viewport, keyboard/zoom/reduced motion, home SSR, public boundary и callback lifecycle | PASS, 8/8 |
| `LIVE-API-01..06` | production image: valid/missing/invalid selector и callback valid/invalid/selector outcomes | PASS, 6/6 |

Непокрытые применимые IDs: нет. Backend-транзакционность/конкурентность, DB schema/migration и NATS degradation неприменимы, поскольку change не меняет backend persistence или messaging.

## Live/API и access policy

| ID | Проверка | Ожидаемый и фактический outcome |
|---|---|---|
| `LIVE-API-01` | Public Read с controlled selector | `GET /api/site_settings` → 200; exact selector; без Cookie/Authorization |
| `LIVE-API-02` | selector отсутствует | build/start guard либо отсутствие запроса; fallback tenant отсутствует |
| `LIVE-API-03` | selector невалиден | GET → 401; auth retry отсутствует |
| `LIVE-API-04` | public callback exception | один POST, exact payload/header → 201 |
| `LIVE-API-05` | invalid callback | client block либо backend 400/422; persistence отсутствует |
| `LIVE-API-06` | callback без/с invalid selector | 401; configuration UX без login |

Измерения endpoint latency сохранены в sanitized handoff `QG-LIVE`; synthesis не повторял live-прогон и не заменяет исходные timings приблизительными значениями. Production image идентифицирован digest prefix `759…`; cleanup подтверждён завершённым.

## Закрытые findings

| Первичное finding | Владелец | Повторная проверка | Состояние |
|---|---|---|---|
| Нарушение ownership | Planner/Site Consumer в назначенных bounded units | `QG-CONTRACTS` rerun | закрыто |
| Composed comment мог нарушить limit | Site Consumer callback unit | `QG-FE` + `QG-CONTRACTS` rerun | закрыто |
| Desktop dropdown pointer lifecycle | Site Consumer navigation unit | automated tests + `BQA-71-01/03`, `QG-FE` rerun | закрыто |
| Callback browser lifecycle | Site Consumer callback/BQA units | `BQA-71-05..07`, `QG-FE` rerun | закрыто |

После дедупликации активных blocking, major или minor findings нет. Новые rework execution units и повторные lanes не требуются.

## Границы атрибуции и следующий шаг

- Архивированный change 069 не изменялся в ownership 071 и исключён из verdict.
- Concurrent root `docs/**` и прочий несвязанный dirty worktree не объявляются проверенными или неизменными.
- QG-SYNTH не выполняет runtime/spec fixes, sync или archive.
- Router может выполнить `OPS-SYNC`, повторную strict validation и затем `OPS-ARCHIVE`.
