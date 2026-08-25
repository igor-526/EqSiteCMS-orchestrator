# Quality Gate: callback requests reset button

**Статус: ✅ APPROVED**  
**Дата:** 2026-08-25

## Итог

Кнопка сброса находится в верхней action-строке сразу после пагинации и повторяет паттерн `PricesHeader`: `danger`, `outlined`, текст «Сбросить». Старой подписи «Сбросить фильтры» и дублирующей кнопки нет. На вкладке «Инструкция» пагинация и сброс скрыты. OpenSpec не изменялся.

## Review scope

- Runtime: `services/frontend/src/features/callbackRequests/ui/CallbackRequestsPage.tsx`
- Tests: `services/frontend/src/features/callbackRequests/ui/CallbackRequestsPage.test.tsx`
- Reference: `services/frontend/src/features/prices/ui/PricesHeader.tsx`
- Backend, notification-service, site consumer и API/access-контракты не менялись этой правкой; API smoke неприменим.

## Frontend test gate

- Focused Vitest: `8 passed`, `0 failed`.
- `npm test`: `61` files, `507 passed`, `0 failed`.
- `npm run lint`: `0 errors`; `432` существующих warnings.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- Production image `eqsitecms-core-frontend:latest` rebuilt; `eqsitecms-frontend` recreated and available on `localhost:3001`.
- Self-checks: callback feature keeps `limit/offset`; API access remains through feature service/API boundary; no `site-*` mixing or legacy FSD directories introduced.

## Chrome runtime evidence

- Desktop `1440×900`: tabs left, action group right; paginator precedes reset; no overlap or horizontal document overflow.
- Tablet `900×900`: same row and ordering; no overlap/overflow.
- Mobile `390×844`: action group wraps below tabs; paginator precedes reset; no overlap/overflow.
- Computed button color and border: `rgb(255, 77, 79)`; exact visible/accessible label: «Сбросить».
- Runtime has exactly one «Сбросить» and zero «Сбросить фильтры» buttons.
- Functional: page size changed to `10`, page 2 opened, name filter `Callback` applied and reset offset to page 1. One click on reset cleared the active filter, restored defaults (`25`, page 1), retained the paginator, and produced no duplicate reset control.
- «Инструкция»: reset count `0`, paginator count `0`.

## Findings

Blocking findings: none.
