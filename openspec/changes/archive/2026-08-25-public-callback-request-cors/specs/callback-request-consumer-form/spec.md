## MODIFIED Requirements

### Requirement: Публичная форма отправляет совместимый request
`site-ad` callback form SHALL отправлять прямой cross-origin anonymous `POST /callback_requests` на абсолютный Public API base URL с selector-механизмом API client и полями `name`, `phone`, `comment`; она MUST NOT использовать CMS credentials, CMS-only endpoint или обязательный same-origin proxy. Browser preflight SHALL проходить по публичному credentialless CORS-контракту backend.

#### Scenario: Успешная прямая отправка
- **WHEN** посетитель вводит валидные данные, принимает policy и отправляет форму с origin `site-ad`
- **THEN** preflight разрешает `POST`, `Content-Type` и selector header, выполняется ровно один прямой POST к backend, форма закрывается, очищается и показывается success modal

#### Scenario: Ошибка прямой отправки
- **WHEN** backend возвращает validation `422`, `401` selector error либо generic error с CORS header
- **THEN** browser предоставляет response приложению, а форма остаётся открытой с сохранёнными данными и понятной ошибкой

#### Scenario: Proxy не требуется
- **WHEN** `site-ad` собирается и запускается без `SITE_API_PROXY_TARGET`, а `NEXT_PUBLIC_API_BASE_URL` указывает на абсолютный backend API
- **THEN** callback form и существующие Public GET используют прямой API, а Next.js не создаёт callback rewrite

#### Scenario: CMS credentials отсутствуют
- **WHEN** API-boundary test инспектирует прямой callback request
- **THEN** request содержит только публичные headers, не включает cookie/Authorization и не обращается к CMS-only endpoint
