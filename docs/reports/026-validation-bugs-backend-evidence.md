# Backend evidence: 026 validation bugs

Дата прогона: 2026-08-02. API: `http://localhost:8001`. Авторизация: cookie.

## PostgreSQL inspect

- container: `eqsitecms-db` (`0905da513e53`), image `postgres:16`;
- compose project/service: `eqsitecms` / `db`;
- host port: `5433 -> 5432`;
- aliases: `eqsitecms-db`, `db`;
- DB/user: `eqsitecms`; параметры повторно получены через `docker inspect` непосредственно перед прогоном.

## Unit mapping UT-01..UT-30

Каждая строка соответствует отдельному test case в
`services/backend/tests/unit/core/services/test_breed_service.py` или
`test_coat_color_service.py`.

| IDs | Отдельные сценарии |
|---|---|
| UT-01..UT-04 | breed create: slug omitted, null, empty, whitespace |
| UT-05..UT-06 | breed Cyrillic transliteration; generated collision suffix |
| UT-07..UT-10 | breed description omitted, null, empty, whitespace |
| UT-11..UT-12 | breed description 511 accepted; 512 rejected without write |
| UT-13..UT-15 | breed empty name without write; PATCH preserve slug; rename unique slug |
| UT-16..UT-19 | coat color create: slug omitted, null, empty, whitespace |
| UT-20..UT-21 | coat color Cyrillic transliteration; generated collision suffix |
| UT-22..UT-25 | coat color description omitted, null, empty, whitespace |
| UT-26..UT-27 | coat color description 511 accepted; 512 rejected without write |
| UT-28..UT-30 | coat color empty name without write; PATCH preserve slug; rename unique slug |

Дополнительные отдельные access tests подтверждают breed scope denial, tenant isolation обоих
справочников и coat-color create/update/delete denial без `SUPERUSER`, `ADMIN` или
`DEVELOPER`. Профильный запуск: `119 passed`; полный запуск после rework приведён в handoff.

## Live smoke SM-01..SM-30

Временный пользователь создан прямой fixture-операцией в PostgreSQL, поскольку публичный
`POST /api/auth/register` штатно возвращает `400` («Публичная регистрация отключена»).
Пользователь сначала не имел scopes и принадлежал отдельному временному tenant. Для отдельной
foreign-tenant проверки ему временно назначался существующий scope `ADMIN`; scope, пользователь
и tenant полностью удалены после прогона. Все feature-записи удалены через API.

| ID | Request | Expected | Actual | Time, s | Assertion |
|---|---|---:|---:|---:|---|
| SM-01 | POST `/api/horses/breeds` | 200 | 200 | 0.031477 | generated slug, description null |
| SM-02 | POST breeds, slug null | 200 | 200 | 0.025760 | generated |
| SM-03 | POST breeds, slug empty | 200 | 200 | 0.025652 | generated |
| SM-04 | POST breeds, slug whitespace | 200 | 200 | 0.024818 | generated |
| SM-05 | POST breeds, description null | 200 | 200 | 0.024265 | null |
| SM-06 | POST breeds, description empty | 200 | 200 | 0.024961 | null |
| SM-07 | POST breeds, description whitespace | 200 | 200 | 0.024811 | null |
| SM-08 | POST breeds collision seed | 200 | 200 | 0.027872 | seed created |
| SM-09 | POST breeds generated collision | 200 | 200 | 0.025717 | suffix `-1` |
| SM-10 | PATCH breed empty slug/description | 200 | 200 | 0.027845 | slug preserved, null |
| SM-11 | PATCH breed rename + empty slug | 200 | 200 | 0.027607 | regenerated |
| SM-12 | anonymous POST breed | 401 | 401 | 0.002507 | no write |
| SM-13 | anonymous PATCH breed | 401 | 401 | 0.002769 | unchanged |
| SM-14 | no-scope foreign-tenant POST breed | 403 | 403 | 0.039452 | denied, no write |
| SM-15 | ADMIN foreign-tenant PATCH breed | 400 | 400 | 0.049459 | resource hidden, no write |
| SM-16 | POST `/api/horses/coat_colors` | 200 | 200 | 0.033722 | generated slug, description null |
| SM-17 | POST colors, slug null | 200 | 200 | 0.030800 | generated |
| SM-18 | POST colors, slug empty | 200 | 200 | 0.025076 | generated |
| SM-19 | POST colors, slug whitespace | 200 | 200 | 0.024552 | generated |
| SM-20 | POST colors, description null | 200 | 200 | 0.024329 | null |
| SM-21 | POST colors, description empty | 200 | 200 | 0.024384 | null |
| SM-22 | POST colors, description whitespace | 200 | 200 | 0.024309 | null |
| SM-23 | POST colors collision seed | 200 | 200 | 0.025067 | seed created |
| SM-24 | POST colors generated collision | 200 | 200 | 0.026388 | suffix `-1` |
| SM-25 | PATCH color empty slug/description | 200 | 200 | 0.024513 | slug preserved, null |
| SM-26 | PATCH color rename + empty slug | 200 | 200 | 0.026137 | regenerated |
| SM-27 | anonymous POST color | 401 | 401 | 0.002811 | no write |
| SM-28 | anonymous PATCH color | 401 | 401 | 0.002337 | unchanged |
| SM-29 | no-scope foreign-tenant POST color | 403 | 403 | 0.022308 | denied, no write |
| SM-30 | ADMIN foreign-tenant PATCH color | 400 | 400 | 0.026678 | resource hidden, no write |

Итог: **30/30 passed**. Cleanup verification query returned **0** across feature rows,
temporary user and temporary tenant. Smoke pytest-файлы не создавались.
