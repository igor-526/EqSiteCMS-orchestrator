# notification-callback-handler

## Overview

Обновление обработчика callback_request для работы с БД вместо хардкода. Интеграция с NotificationOrchestratorService для полноценного пайплайна обработки.

## MODIFIED Requirements

### Requirement: CallbackRequestService Integration
The CallbackRequestService MUST use NotificationOrchestratorService instead of direct email publisher.

#### Scenario: Process callback via orchestrator
- GIVEN a CallbackRequestedData payload with phone and equestrian_id
- WHEN calling process
- THEN the orchestrator.process_event is called with event_code="callback_request"

#### Scenario: Remove hardcoded email
- GIVEN the updated CallbackRequestService
- WHEN processing a callback request
- THEN RECIPIENT_EMAIL constant is not used directly

### Requirement: DI Container Update
The application container MUST register orchestrator dependencies.

#### Scenario: Container provides orchestrator
- GIVEN the ApplicationContainer
- WHEN resolving CallbackRequestService
- THEN it receives NotificationOrchestratorService dependency

#### Scenario: Container provides repositories
- GIVEN the ApplicationContainer
- WHEN resolving NotificationOrchestratorService
- THEN it receives EventRepository, ChannelRepository, UserNotificationSettingRepository
