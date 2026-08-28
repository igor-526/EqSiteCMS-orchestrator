## ADDED Requirements

### Requirement: Liveness probe указывает на обслуживаемый health-путь

Каждый Helm-чарт сервиса SHALL задавать `livenessProbe` на путь, который приложение фактически обслуживает. Путь probe MUST совпадать с зарегистрированным health-маршрутом FastAPI-приложения соответствующего сервиса; расхождение MUST считаться дефектом production-конфигурации, а не косметикой, поскольку при `failureThreshold: 1` оно приводит к постоянным перезапускам пода.

#### Scenario: Probe попадает в обслуживаемый маршрут
- **WHEN** рендерится Helm-чарт `notification-service`, `email-service` или `vk-service`
- **THEN** `livenessProbe` обращается к `http://localhost:8000/health`
- **AND** этот путь зарегистрирован в `src/main.py` соответствующего сервиса и возвращает `200`

#### Scenario: Расхождение probe и маршрута выявляется до деплоя
- **WHEN** Quality Gate сверяет отрендеренный probe-путь со списком health-маршрутов приложения
- **THEN** несовпадение возвращается владельцу как finding
- **AND** деплой с таким расхождением не считается прошедшим gate
