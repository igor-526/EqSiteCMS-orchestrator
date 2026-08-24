# 054 Observability — implementation evidence

Дата: 2026-08-24  
Change: `observability-054`  
Scope этого отчёта: documentation deliverable и browser Manual QA. Значения
DSN, cookies, credentials и тела запросов намеренно не записаны.

## Документация

- Создан `docs/operations/observability.md`: архитектура пяти приложений, env
  matrix, Next.js build/runtime boundary, sanitization, internal Prometheus
  listener, проверки, rollout, troubleshooting и rollback.
- README backend, email-service, notification-service, frontend и site-ad
  приведены к фактической реализации и ссылаются на единый runbook.
- Исправлено прямое противоречие backend README: Prometheus реализован и
  доступен в production внутри контейнера на `:9000/metrics`, а не отсутствует.

## Методика browser QA

Проверки выполнены через browser skill в реальном браузере, не через curl или
Playwright CLI. Актуальные исходники CMS и `site-ad` запускались на отдельных
локальных портах, чтобы не перезапускать core stack:

- disabled: `SENTRY_ENABLED=false`, CMS `http://localhost:3010`, site-ad
  `http://localhost:3011`;
- enabled startup: тот же UI с DSN локального loopback sink, environment/release
  `qa-local` и traces rate `0`; внешняя telemetry не передавалась.

После проверки процессы остановлены. Временная правка `tsconfig.json`, которую
Next.js dev server добавил для отдельного dist directory, отменена и не входит в
deliverable.

## CMS frontend

| Проверка | Результат | Sanitized evidence |
|---|---|---|
| Актуальный disabled build открывается | PASS | `/dashboard` без session перенаправил на `/login`; форма «Логин», «Пароль», «Войти» отображается без console errors |
| Disabled Sentry не отправляет events | PASS | После reload наблюдалось 15 локальных requests; Sentry envelope/ingest requests — 0 |
| Anonymous guard | PASS | На актуальных исходниках anonymous navigation завершилась URL `/login` |
| Authenticated render | PARTIAL | Существующая browser session на core CMS `:3001` показала `/dashboard` и «Добро пожаловать», но контейнер был собран до текущего frontend diff; credentials не запрашивались и session не копировалась в QA app |
| `401/403` UI regression | BLOCKED | Без безопасного test account/fixture нельзя достоверно вызвать оба backend denial состояния через UI; сетевые статусы не выдумывались |
| Desktop 1440×900 | PASS | Anonymous login: `scrollWidth=clientWidth=1440`, поля и кнопка внутри viewport |
| Tablet 768×1024 | PASS | Anonymous login: `scrollWidth=clientWidth=768`, overlap не обнаружен |
| Mobile 390×844 | PASS | Anonymous login: `scrollWidth=clientWidth=390`, поля и кнопка внутри viewport |
| Enabled startup | PASS | QA app с loopback sink загрузил `/login`, форма гидратировалась, console errors — 0 |
| Client/server error + global fallback + одно sanitized event | BLOCKED | В приложении нет безопасного QA error trigger; добавление публичного debug route запрещено scope. Реализация покрыта mocked component/runtime tests, но browser pass не заявляется |

Screenshots не создавались: проверенные responsive cases не завершились failed
layout state. Для blocked error case отсутствовал воспроизводимый browser state,
поэтому screenshot не мог служить evidence.

## Public consumer `site-ad`

| Проверка | Результат | Sanitized evidence |
|---|---|---|
| Anonymous Public Read/SSR shell | PASS | `/` вернул title «Главная — Александрова Дача», один H1 «Александрова Дача» и полный server-rendered public content без CMS login |
| Disabled Sentry не отправляет events | PASS | После reload наблюдалось 42 локальных requests; загружались локальные SDK chunks, но envelope/ingest requests — 0 |
| Desktop 1440×900 | PASS | `innerWidth=1440`, `scrollWidth=clientWidth=1425`; горизонтального overflow нет |
| Tablet 768×1024 | PASS | `innerWidth=768`, `scrollWidth=clientWidth=753`; горизонтального overflow нет |
| Mobile 390×844 | PASS | `innerWidth=390`, `scrollWidth=clientWidth=375`; mobile menu control доступен, горизонтального overflow нет |
| Enabled startup | PASS | QA app с loopback sink загрузил public `/`, сохранил title/H1, console errors — 0 |
| Client/server error + global fallback + одно sanitized event | BLOCKED | Без QA error trigger нельзя безопасно получить error boundary в browser; реальные события во внешний Sentry не отправлялись |

Responsive DOM содержал off-canvas mobile navigation вне viewport в закрытом
состоянии; document horizontal overflow при этом отсутствовал. Это ожидаемый
layout, не failed overlap.

## Access и security regression

- Endpoint changes в diff отсутствуют; access matrix неприменима.
- CMS anonymous guard подтверждён на актуальном frontend; authenticated dashboard
  подтверждён только на ранее собранном core image.
- Полные browser outcomes для backend `401/403` не подтверждены из-за отсутствия
  безопасной auth/permission fixture.
- `site-ad` сохранил anonymous Public Read SSR/SEO shell и не показал CMS auth UI.
- Ни один browser step не вводил credentials и не отправлял telemetry третьей
  стороне. Network evidence содержит только counts и классификацию, без URL с
  query, headers, cookies или bodies.

## Итог

- Documentation tasks 4.1, 4.2 и evidence task 4.5 завершены.
- Manual QA tasks 4.3 и 4.4 остаются незавершёнными: основная disabled/enabled
  startup и responsive поверхность проверена, но обязательные real browser error
  flows, полный authenticated current-build CMS и `401/403` не имеют безопасной
  воспроизводимой fixture.
- Общий Quality Gate можно начинать для кода и документации, но финальное закрытие
  change должно либо предоставить QA-only error/auth fixtures и повторить browser
  checks, либо явно согласовать эти зарегистрированные gaps.

