## MODIFIED Requirements

### Requirement: Developer-документация access contract
Developer-вкладка MUST описывать фактический access contract групп пород без изменения backend по матрице и условиям сценария «Полный документируемый access contract».

#### Scenario: Public Read описан с selector
- **WHEN** разработчик читает GET contract
- **THEN** документация различает отсутствие CMS-auth и обязательный tenant selector и фиксирует `401` для missing/invalid selector

#### Scenario: Protected Write описан с denial outcomes
- **WHEN** разработчик читает mutation contract
- **THEN** документация фиксирует CMS authentication, разрешённые роли, anonymous `401` и insufficient-permission `403`

#### Scenario: Полный документируемый access contract
- **WHEN** разработчик сверяет документируемые условия доступа к группам пород
- **THEN** Developer-вкладка MUST описывать фактический access contract групп пород без изменения backend: GET является Public Read при валидном `X-Equestrian-Service-Key`; missing/invalid selector возвращает `401`; POST/PATCH/DELETE требуют CMS authentication и разрешённую роль, anonymous возвращает `401`, insufficient permission возвращает `403`.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/horses/breed-groups` | Public Read + tenant selector | anonymous/authenticated | `200` с валидным selector; `401` без/с invalid selector | `200` с валидным selector |
| GET | `/api/horses/breed-groups/{slug_or_id}` | Public Read + tenant selector | anonymous/authenticated | `200` с валидным selector; `401` без/с invalid selector | `200` с валидным selector |
| POST | `/api/horses/breed-groups` | Protected Write | SUPERUSER, ADMIN, DEVELOPER | `401` | success для разрешённой роли; `403` без разрешения |
| PATCH | `/api/horses/breed-groups/{slug_or_id}` | Protected Write | SUPERUSER, ADMIN, DEVELOPER | `401` | success для разрешённой роли; `403` без разрешения |
| DELETE | `/api/horses/breed-groups/{slug_or_id}` | Protected Write | SUPERUSER, ADMIN, DEVELOPER | `401` | success для разрешённой роли; `403` без разрешения |

### Requirement: Regression coverage документационных вкладок
Frontend deliverable MUST сохранять component coverage документационных вкладок и условия Quality Gate, включая ограничения browser waiver, по сценарию «Полные условия документационного gate».

#### Scenario: Component tests фиксируют пользовательский смысл
- **WHEN** выполняются тесты `HorsesUserDocumentationView`
- **THEN** они подтверждают заголовок групп пород, CRUD/Page Editor, назначение/очистку, filter/sort и сохранение пород после удаления группы

#### Scenario: Component tests фиксируют API contract
- **WHEN** выполняются тесты `HorsesDeveloperDocumentationView`
- **THEN** они подтверждают paths, methods, query/body/response tokens, `page_data`, `breed_group_ids`, `group_name`, `breed_group_id`, nested `group`, selector и `401/403`

#### Scenario: Browser QA подтверждает доступность и адаптивность
- **WHEN** Quality Gate открывает обе вкладки под разрешёнными ролями на 1440×900, 768×1024 и 390×844
- **THEN** контент читаем, порядок разделов корректен, tabs/tables/code blocks не перекрываются и чтение документации не создаёт новых API-запросов

#### Scenario: Browser runtime недоступен на платформе
- **WHEN** browser runtime сообщает явную недоступность, список browser instances пуст, troubleshooting задокументирован и пользователь явно принимает остаточный риск выпуска без browser QA
- **THEN** Quality Gate оставляет browser scenarios невыполненными, перечисляет deferred auth/scope, Network, responsive/readability и regression проверки, рекомендует повторить их при появлении runtime и MAY завершить change как `APPROVED WITH ACCEPTED RISK`, если все остальные обязательные проверки успешны и blocking findings отсутствуют

#### Scenario: Waiver не маскирует browser failure
- **WHEN** browser runtime доступен либо browser-проверка обнаружила дефект
- **THEN** platform-unavailable waiver неприменим, а failed scenario остаётся блокирующим до исправления и повторной проверки

#### Scenario: Полные условия документационного gate
- **WHEN** Quality Gate проверяет документационные вкладки и допустимость browser waiver
- **THEN** Frontend deliverable MUST добавить component tests ключевого пользовательского и developer-контента без live backend calls. Quality Gate MUST также выполнить browser Manual QA на desktop, tablet и mobile и проверить protected route, существующие documentation scopes, отсутствие `site-*` mixing и отсутствие новых runtime API calls при чтении вкладок. Если browser runtime недоступен на текущей платформе, Quality Gate MAY завершить gate со статусом `APPROVED WITH ACCEPTED RISK` только при явном пользовательском waiver, успешности всех автоматизированных/content/access/architecture/validation проверок и полном документировании environment evidence, deferred checks, остаточного риска и follow-up рекомендации. Browser scenarios при waiver MUST оставаться отмеченными как невыполненные и MUST NOT называться passed.
