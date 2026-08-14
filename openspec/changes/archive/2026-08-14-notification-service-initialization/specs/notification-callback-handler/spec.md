# notification-callback-handler

## Overview

Обработчик callback_request для notification-service. Интеграция с NotificationOrchestratorService для полноценного пайплайна обработки.

## ADDED Requirements

### Requirement: CallbackEventHandler
The system MUST provide a handler for formatting callback_request notifications.

#### Scenario: Format email notification
- GIVEN callback_request payload and channel_code="email"
- WHEN calling format_notification
- THEN NotificationCommandSendEmailData with subject and HTML body is returned

#### Scenario: Unsupported channel
- GIVEN callback_request payload and channel_code="sms"
- WHEN calling format_notification
- THEN None is returned

### Requirement: CallbackRequestHandler Integration
The CallbackRequestHandler MUST use NotificationOrchestratorService.

#### Scenario: Process callback via orchestrator
- GIVEN a CallbackRequestedData payload with phone and equestrian_id
- WHEN calling handle
- THEN the orchestrator.process_event is called with event_code="callback"

### Requirement: DI Container Update
The application container MUST register orchestrator dependencies.

#### Scenario: Container provides orchestrator
- GIVEN the ApplicationContainer
- WHEN resolving CallbackRequestHandler
- THEN it receives NotificationOrchestratorService dependency

#### Scenario: Container provides repositories
- GIVEN the ApplicationContainer
- WHEN resolving NotificationOrchestratorService
- THEN it receives EventRepository, ChannelRepository, UserNotificationSettingRepository
